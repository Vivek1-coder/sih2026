from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.consent import ConsentChoices
from app.services.abdm_service import abdm_service
from app.services.consent_service import consent_service
from app.services.interview_service import interview_service
from app.services.llm_service import llm_service
from app.services.queue_service import queue_service
from app.services.summary_service import summary_service


def new_patient() -> str:
    return f"pytest_{uuid4().hex}"


def completed_cough_interview(patient: str):
    consent_service.save(
        patient,
        "en-IN",
        ConsentChoices(
            medical_history=True,
            ai_assistance=True,
            physician_sharing=True,
            privacy_notice=True,
        ),
    )
    session = interview_service.start_or_resume(patient, "en-IN", "general_medicine")
    for value in (
        "cough_fever", "few_days", "no_breathlessness", "none", "none",
        "no_known_allergies", "none_known", "none", "neither",
    ):
        session = interview_service.submit_answer(
            session.id, patient, session.current_question_id, value
        )
    return session


def test_summary_prompt_merges_interview_and_documents(monkeypatch) -> None:
    patient = new_patient()
    completed_cough_interview(patient)
    captured: dict[str, str] = {}

    def fake_summary(prompt, answers, documents):
        captured["prompt"] = prompt
        captured["answers"] = str(answers)
        captured["documents"] = str(documents)
        return {"Chief Complaint": "Mocked cough summary"}

    monkeypatch.setattr(llm_service, "generate_clinical_summary", fake_summary)
    generated = summary_service.generate(patient)

    assert generated.status == "draft"
    assert "cough_fever" in captured["prompt"]
    assert "INTERVIEW ANSWERS" in captured["prompt"]
    assert "DOCUMENT EXTRACTIONS" in captured["prompt"]
    assert generated.sections["Chief Complaint"] == "Mocked cough summary"


def test_queue_registration_and_mock_abdm_push_are_idempotent() -> None:
    patient = new_patient()
    completed_cough_interview(patient)
    summary = summary_service.generate(patient)
    summary_service.update(summary.id, patient, None, None, True)
    registration = queue_service.register(summary)

    first = abdm_service.push(summary)
    second = abdm_service.push(summary)
    entry = queue_service.for_patient(patient)

    assert first.bundle_id.startswith("Bundle/mock-")
    assert first.bundle_id == second.bundle_id
    assert entry["token"] == registration.token
    assert entry["queue_position"] >= 1

    client = TestClient(app)
    queue_response = client.get("/api/physician/queue")
    aggregate_response = client.get(f"/api/physician/patient/{patient}/summary")
    assert queue_response.status_code == 200
    assert any(item["patient_id"] == patient for item in queue_response.json()["patients"])
    assert aggregate_response.status_code == 200
    assert aggregate_response.json()["abdm"]["bundle_id"] == first.bundle_id
