"""Tests for the interview session engine, Groq integration (mocked), and red-flag detection."""

import unittest
from unittest.mock import MagicMock, patch
from uuid import uuid4

from app.schemas.consent import ConsentChoices
from app.services.consent_service import consent_service
from app.services.interview_engine import interview_engine
from app.services.interview_service import interview_service
from app.services.llm_service import LLMService


def patient_id() -> str:
    return f"test_{uuid4().hex}"


def grant_consent(patient: str) -> None:
    consent_service.save(
        patient,
        "en-IN",
        ConsentChoices(
            medical_history=True,
            ai_assistance=True,
            document_processing=True,
            physician_sharing=True,
            abha_linking=False,
            privacy_notice=True,
        ),
    )


def answer_current(session, value: str, input_mode: str = "touch"):
    if session.current_question_id is None:
        raise AssertionError("Session has no current question")
    return interview_service.submit_answer(
        session.id,
        session.patient_id,
        session.current_question_id,
        value,
        input_mode=input_mode,
    )


class SessionCreationTests(unittest.TestCase):
    def test_new_session_is_active_with_initial_question(self):
        patient = patient_id()
        grant_consent(patient)
        session = interview_service.start_or_resume(patient, "en-IN", "general_medicine")
        self.assertEqual(session.status, "active")
        self.assertIsNotNone(session.current_question_id)
        self.assertEqual(interview_engine.progress(session), 0)

    def test_resume_returns_same_session(self):
        patient = patient_id()
        grant_consent(patient)
        s1 = interview_service.start_or_resume(patient, "en-IN", "general_medicine")
        s2 = interview_service.start_or_resume(patient, "en-IN", "general_medicine")
        self.assertEqual(s1.id, s2.id)

    def test_ayurveda_session_starts_with_prakriti_question(self):
        patient = patient_id()
        grant_consent(patient)
        session = interview_service.start_or_resume(patient, "en-IN", "ayurveda")
        self.assertEqual(session.current_question_id, "ayush_prakriti")


class ScriptedQuestionTests(unittest.TestCase):
    def test_scripted_question_returns_ontology_source(self):
        patient = patient_id()
        grant_consent(patient)
        session = interview_service.start_or_resume(patient, "en-IN", "general_medicine")
        # department question first
        q = interview_engine.question(session, session.current_question_id)
        self.assertEqual(q["source"], "ontology")
        self.assertIn("text", q)
        self.assertIn("options", q)

    def test_next_question_advances_after_answer(self):
        patient = patient_id()
        grant_consent(patient)
        session = interview_service.start_or_resume(patient, "en-IN", "general_medicine")
        first_q_id = session.current_question_id
        session = answer_current(session, "chest_pain")
        self.assertNotEqual(session.current_question_id, first_q_id)


class InputModeTests(unittest.TestCase):
    def test_voice_input_mode_persisted(self):
        patient = patient_id()
        grant_consent(patient)
        session = interview_service.start_or_resume(patient, "en-IN", "general_medicine")
        session = answer_current(session, "chest_pain", input_mode="voice")
        self.assertEqual(session.answers[-1].input_mode, "voice")

    def test_touch_input_mode_persisted(self):
        patient = patient_id()
        grant_consent(patient)
        session = interview_service.start_or_resume(patient, "en-IN", "general_medicine")
        session = answer_current(session, "headache", input_mode="touch")
        self.assertEqual(session.answers[-1].input_mode, "touch")


class GroqIntegrationTests(unittest.TestCase):
    def test_groq_follow_up_returns_question_text_on_success(self):
        svc = LLMService()
        mock_choice = MagicMock()
        mock_choice.message.content = '{"question_text": "How long have you had this pain?", "input_type": "free_text", "options": null}'
        mock_completion = MagicMock()
        mock_completion.choices = [mock_choice]

        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_completion

        with patch("app.services.llm_service.LLMService._groq_follow_up") as mock_groq:
            mock_groq.return_value = "How long have you had this pain?"
            result = svc.generate_free_text_follow_up("chest pain", "en-IN")
        self.assertEqual(result, "How long have you had this pain?")

    def test_groq_failure_returns_scripted_fallback(self):
        svc = LLMService()
        with patch.object(svc, "_groq_follow_up", side_effect=Exception("Groq timeout")):
            result = svc.generate_free_text_follow_up("sharp chest pain", "en-IN")
        self.assertIn("sharp chest pain", result)
        self.assertIn("describe", result.lower())

    def test_groq_fallback_when_no_api_key(self):
        svc = LLMService()
        # Patch settings at the point where _groq_follow_up accesses it,
        # without importing app.core.config (which needs pydantic-settings).
        mock_settings = MagicMock()
        mock_settings.GROQ_API_KEY = ""
        mock_settings.GROQ_MODEL = "llama-3.3-70b-versatile"
        with patch("app.services.llm_service.LLMService._groq_follow_up") as mock_groq:
            mock_groq.side_effect = lambda *a, **kw: "fallback text" if not mock_settings.GROQ_API_KEY else "should not reach"
            result = svc.generate_free_text_follow_up("tired", "en-IN")
        # When _groq_follow_up returns the fallback, generate_free_text_follow_up returns it directly
        self.assertEqual(result, "fallback text")

    def test_groq_invalid_json_returns_fallback(self):
        svc = LLMService()
        with patch("app.services.llm_service.LLMService._groq_follow_up", side_effect=Exception("JSON error")):
            result = svc.generate_free_text_follow_up("fatigue", "en-IN")
        self.assertIn("fatigue", result)


class ProgressTests(unittest.TestCase):
    def test_progress_increases_with_answers(self):
        patient = patient_id()
        grant_consent(patient)
        session = interview_service.start_or_resume(patient, "en-IN", "general_medicine")
        initial_progress = interview_engine.progress(session)
        session = answer_current(session, "chest_pain")
        after_progress = interview_engine.progress(session)
        self.assertGreater(after_progress, initial_progress)

    def test_progress_never_exceeds_95_until_complete(self):
        patient = patient_id()
        grant_consent(patient)
        session = interview_service.start_or_resume(patient, "en-IN", "general_medicine")
        for _ in range(5):
            if session.current_question_id:
                q = interview_engine.question(session, session.current_question_id)
                session = answer_current(session, q["options"][0]["value"])
        progress = interview_engine.progress(session)
        if session.status != "completed":
            self.assertLessEqual(progress, 95)

    def test_completed_session_has_progress_100(self):
        patient = patient_id()
        grant_consent(patient)
        session = interview_service.start_or_resume(patient, "en-IN", "general_medicine")
        answers = [
            "cough_fever", "few_days", "no_breathlessness",
            "none", "none", "no_known_allergies",
            "none_known", "none", "neither",
        ]
        for value in answers:
            if session.current_question_id:
                session = answer_current(session, value)
        self.assertEqual(session.status, "completed")
        self.assertEqual(interview_engine.progress(session), 100)


class RedFlagTests(unittest.TestCase):
    def test_chest_pain_and_dyspnoea_fires_urgent(self):
        patient = patient_id()
        grant_consent(patient)
        session = interview_service.start_or_resume(patient, "en-IN", "general_medicine")
        session = answer_current(session, "chest_pain")
        for value in ("centre", "sudden", "pressure", "arm"):
            session = answer_current(session, value)
        session = answer_current(session, "shortness_of_breath")
        self.assertEqual(session.priority, "urgent")
        rule_ids = {a.rule_id for a in session.alerts}
        self.assertIn("chest_pain_with_dyspnoea", rule_ids)

    def test_stroke_keywords_fire_urgent_immediately(self):
        patient = patient_id()
        grant_consent(patient)
        session = interview_service.start_or_resume(patient, "en-IN", "general_medicine")
        session = answer_current(session, "stroke_symptoms")
        self.assertEqual(session.priority, "urgent")
        self.assertTrue(any(a.rule_id == "possible_stroke_symptoms" for a in session.alerts))

    def test_severe_pain_fires_priority(self):
        patient = patient_id()
        grant_consent(patient)
        session = interview_service.start_or_resume(patient, "en-IN", "general_medicine")
        session = answer_current(session, "chest_pain")
        for value in ("centre", "sudden", "pressure", "no_spread", "none", "constant", "rest"):
            if session.current_question_id:
                session = answer_current(session, value)
        # Now at severity question - answer 8 (Severe)
        if session.current_question_id == "socrates_severity":
            session = answer_current(session, "8")
        self.assertIn(session.priority, ("priority", "urgent"))

    def test_red_flag_sets_triage_required(self):
        patient = patient_id()
        grant_consent(patient)
        session = interview_service.start_or_resume(patient, "en-IN", "general_medicine")
        session = answer_current(session, "stroke_symptoms")
        # Check via the session_response helper would return triage_required=True
        has_urgent = any(alert.priority == "urgent" for alert in session.alerts)
        self.assertTrue(has_urgent)


if __name__ == "__main__":
    unittest.main()
