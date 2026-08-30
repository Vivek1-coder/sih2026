import unittest
from uuid import uuid4

from fastapi import HTTPException

from app.schemas.consent import ConsentChoices
from app.services.consent_service import consent_service
from app.services.document_service import document_service
from app.services.interview_engine import interview_engine
from app.services.interview_service import interview_service
from app.services.summary_service import summary_service


def patient_id() -> str:
    return f"test_{uuid4().hex}"


def grant_consent(patient: str, *, documents: bool = True) -> None:
    consent_service.save(
        patient,
        "en-IN",
        ConsentChoices(
            medical_history=True,
            ai_assistance=True,
            document_processing=documents,
            physician_sharing=True,
            abha_linking=False,
            privacy_notice=True,
        ),
    )


def answer_current(session, value: str):
    if session.current_question_id is None:
        raise AssertionError("Session has no current question")
    return interview_service.submit_answer(
        session.id,
        session.patient_id,
        session.current_question_id,
        value,
    )


class ConsentWorkflowTests(unittest.TestCase):
    def test_required_consent_and_revocation(self) -> None:
        patient = patient_id()
        incomplete = consent_service.save(patient, "hi-IN", ConsentChoices())
        self.assertFalse(consent_service.required_granted(incomplete))

        grant_consent(patient)
        record = consent_service.get(patient)
        self.assertTrue(consent_service.required_granted(record))
        self.assertEqual(record.preferred_language, "en-IN")

        revoked = consent_service.revoke(patient)
        self.assertIsNotNone(revoked)
        self.assertFalse(consent_service.required_granted(revoked))


class InterviewWorkflowTests(unittest.TestCase):
    def test_chest_pain_and_dyspnoea_raise_urgent_alert(self) -> None:
        patient = patient_id()
        grant_consent(patient)
        session = interview_service.start_or_resume(patient, "en-IN", "general_medicine")
        session = answer_current(session, "chest_pain")
        for value in ("centre", "sudden", "pressure", "arm"):
            session = answer_current(session, value)
        session = answer_current(session, "shortness_of_breath")

        self.assertEqual(session.priority, "urgent")
        self.assertTrue(
            any(alert.rule_id == "chest_pain_with_dyspnoea" for alert in session.alerts)
        )

    def test_stroke_keyword_raises_urgent_alert_immediately(self) -> None:
        patient = patient_id()
        grant_consent(patient)
        session = interview_service.start_or_resume(patient, "en-IN", "general_medicine")
        session = answer_current(session, "stroke_symptoms")
        self.assertEqual(session.priority, "urgent")
        self.assertEqual(session.alerts[0].rule_id, "possible_stroke_symptoms")

    def test_ayurveda_mode_collects_all_dashavidha_fields(self) -> None:
        patient = patient_id()
        grant_consent(patient)
        session = interview_service.start_or_resume(patient, "hi-IN", "ayurveda")
        while session.current_question_id and session.current_question_id.startswith("ayush_"):
            question = interview_engine.question(session, session.current_question_id)
            session = answer_current(session, question["options"][0]["value"])

        dashavidha = [answer for answer in session.answers if answer.section.startswith("Dashavidha")]
        self.assertEqual(len(dashavidha), 10)
        self.assertEqual(session.current_question_id, "chief_complaint")

    def test_unscripted_complaint_calls_llm_fallback_seam(self) -> None:
        patient = patient_id()
        grant_consent(patient)
        session = interview_service.start_or_resume(patient, "en-IN", "general_medicine")
        session = answer_current(session, "unusual tiredness after travel")
        question = interview_engine.question(session, session.current_question_id)
        self.assertEqual(question["source"], "llm_fallback")
        self.assertIn("Please describe", question["text"])


class DocumentAndSummaryTests(unittest.TestCase):
    def test_mock_ocr_flags_labs_and_sorts_by_document_date(self) -> None:
        patient = patient_id()
        first = document_service.create(
            patient,
            "blood_test_Mar2026.pdf",
            "application/pdf",
            b"demo pdf bytes",
        )
        second = document_service.create(
            patient,
            "prescription_2026-05-14.jpg",
            "image/jpeg",
            b"demo image bytes",
        )
        self.addCleanup(document_service.delete, first.id, patient)
        self.addCleanup(document_service.delete, second.id, patient)

        document_service.process(first.id)
        document_service.process(second.id)
        ordered = document_service.list_for_patient(patient)

        self.assertEqual(ordered[0].id, second.id)
        self.assertEqual(first.status, "done")
        self.assertTrue(any(lab.abnormal for lab in first.extraction.lab_values))

    def test_summary_generation_acknowledgement_edits_and_confirmation(self) -> None:
        patient = patient_id()
        grant_consent(patient)
        session = interview_service.start_or_resume(patient, "en-IN", "general_medicine")
        answers = [
            "cough_fever",
            "few_days",
            "no_breathlessness",
            "none",
            "none",
            "no_known_allergies",
            "none_known",
            "none",
            "neither",
        ]
        for value in answers:
            session = answer_current(session, value)
        self.assertEqual(session.status, "completed")

        document = document_service.create(
            patient,
            "blood_test_2026-04-02.pdf",
            "application/pdf",
            b"demo pdf bytes",
        )
        self.addCleanup(document_service.delete, document.id, patient)
        document_service.process(document.id)

        summary = summary_service.generate(patient)
        self.assertEqual(summary.status, "draft")
        self.assertIn("Chief Complaint", summary.sections)
        self.assertIn("Prior Investigations", summary.sections)
        self.assertIn("Mock OCR", summary.sections["Prior Investigations"])

        with self.assertRaises(HTTPException) as raised:
            summary_service.update(summary.id, patient, None, "confirmed", None)
        self.assertEqual(raised.exception.status_code, 409)

        summary_service.update(summary.id, patient, None, None, True)
        confirmed = summary_service.update(
            summary.id,
            patient,
            {"Chief Complaint": "Cough and fever for several days; physician verified."},
            "confirmed",
            None,
        )
        self.assertEqual(confirmed.status, "confirmed")
        self.assertIsNotNone(confirmed.confirmed_at)


if __name__ == "__main__":
    unittest.main()
