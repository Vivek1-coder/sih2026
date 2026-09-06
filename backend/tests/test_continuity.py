import base64
import io
import json
from datetime import date
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from PIL import Image
from app.main import app
from app.api.dependencies import get_current_patient_id
from app.api.routes.patient import (LocationRequest, start_session, resume_session,
                                    session_detail, session_status, resolve_medication_summary)
from app.models.continuity import AuditLogEntry, Doctor, DoctorQueueEntry, MedicationSummary, Medication
from app.models.interview import InterviewSession, utc_now
from app.models.summary import ClinicalHistorySummary
from app.services.continuity_service import capture_summary, medication_summary_data
from app.services.queue_service import PhysicianQueueService
from app.services.summary_service import SummaryService


def new_visit(patient=None):
    patient = patient or uuid4().hex
    data = start_session(LocationRequest(location="Test dispensary", location_type="on_site"), patient)
    return InterviewSession.objects.get(pk=data["id"])


def test_start_resume_abandon_and_ownership():
    session = new_visit()
    assert session_status(session.patient_id)["resumable"]
    session.step = "documents"
    session.status = "completed"
    session.save()
    resumed = resume_session(session.id, LocationRequest(location="Home", location_type="remote"), session.patient_id)
    assert resumed["id"] == session.id
    assert resumed["location"] == "Home"
    assert InterviewSession.objects.get(pk=session.id).step == "documents"
    with pytest.raises(HTTPException):
        session_detail(session.id, "someone-else")
    newer = new_visit(session.patient_id)
    assert session.reload().visit_status == "abandoned"
    assert session_status(session.patient_id)["session"]["id"] == newer.id
    with pytest.raises(HTTPException):
        resume_session(session.id, LocationRequest(location="Home", location_type="remote"), session.patient_id)
    assert AuditLogEntry.objects(session_id=session.id, event_type="session_started").count() == 1
    assert AuditLogEntry.objects(session_id=session.id, event_type="location_captured").count() == 2


def test_location_required_at_api_boundary():
    patient = uuid4().hex
    app.dependency_overrides[get_current_patient_id] = lambda: patient
    try:
        client = TestClient(app)
        assert client.post("/api/patient/sessions/start", json={}).status_code == 422
        assert client.post("/api/patient/sessions/start", json={"location": "  ", "location_type": "other"}).status_code == 422
        assert not InterviewSession.objects(patient_id=patient).count()
    finally:
        app.dependency_overrides.clear()


def test_summary_qr_persistence_and_queue_idempotency():
    session = new_visit()
    doctor = Doctor(id=uuid4().hex, full_name="Test physician").save()
    medicine = Medication(patient_id=session.patient_id, name="Recorded medicine", dosage="Recorded dose", frequency="Recorded frequency", start_date=date.today()).save()
    summary = ClinicalHistorySummary(patient_id=session.patient_id, interview_session_id=session.id,
                                     sections={"Chief Complaint": "Test complaint"}).save()
    capture_summary(summary)
    capture_summary(summary)
    record = MedicationSummary.objects.get(session_id=session.id)
    data = medication_summary_data(record)
    decoded = json.loads(data["qr_payload"])
    assert decoded["patientId"] == session.patient_id
    assert decoded["summaryRef"] == record.id
    assert "Recorded medicine" not in data["qr_payload"]
    image = Image.open(io.BytesIO(base64.b64decode(data["qr_image"].split(",")[1])))
    assert image.width > 100
    import cv2
    import numpy as np
    decoded_image, _, _ = cv2.QRCodeDetector().detectAndDecode(np.array(image.convert("RGB")))
    assert json.loads(decoded_image) == decoded
    assert resolve_medication_summary(decoded["token"], session.patient_id)["id"] == record.id
    with pytest.raises(HTTPException):
        resolve_medication_summary(decoded["token"], "other")
    medicine.name = "Changed later"
    medicine.save()
    assert record.reload().medications_snapshot[0]["name"] == "Recorded medicine"
    with pytest.raises(HTTPException):
        PhysicianQueueService().register(summary)
    summary.patient_acknowledged_at = utc_now()
    summary.save()
    capture_summary(summary)
    assert record.reload().confirmed is True
    queue = PhysicianQueueService()
    first = queue.register(summary)
    second = PhysicianQueueService().register(summary)
    assert first.id == second.id
    from app.services.prototype_staff import PHYSICIAN_ID
    assert first.doctor_id == PHYSICIAN_ID
    assert first.location == "Test dispensary"
    assert not session_status(session.patient_id)["resumable"]
    assert SummaryService().get_owned(summary.id, session.patient_id).id == summary.id
    for event in ["summary_generated", "summary_confirmed", "doctor_queue_assigned"]:
        assert AuditLogEntry.objects(session_id=session.id, event_type=event).count() == 1
    assert DoctorQueueEntry.objects(session_id=session.id).count() == 1
    doctor.delete()


def test_new_visit_does_not_reuse_previous_summary():
    session = new_visit()
    old = ClinicalHistorySummary(patient_id=session.patient_id, interview_session_id=session.id).save()
    new_visit(session.patient_id)
    assert SummaryService().current(session.patient_id) is None
    assert SummaryService().get_owned(old.id, session.patient_id).id == old.id


def test_prototype_physician_requires_no_account():
    from app.api.routes.prescriptions import current_doctor
    from app.services.prototype_staff import PHYSICIAN_ID
    assert current_doctor().id == PHYSICIAN_ID


def test_prescription_provenance_and_session_detail():
    from app.api.routes.prescriptions import issue_prescription, PrescriptionInput
    session = new_visit()
    doctor = Doctor(id=uuid4().hex, full_name="Prescribing doctor").save()
    DoctorQueueEntry(patient_id=session.patient_id, session_id=session.id, summary_id="test", doctor_id=doctor.id).save()
    result = issue_prescription(PrescriptionInput(session_id=session.id, medications=[{
        "name": "Recorded medication", "dosage": "Recorded dosage", "frequency": "Recorded frequency", "start_date": date.today(),
    }]), doctor)
    detail = session_detail(session.id, session.patient_id)
    assert detail["prescriptions"][0]["id"] == result["id"]
    medicine = Medication.objects.get(pk=result["medication_ids"][0])
    assert medicine.prescribed_by == doctor.id
    event = AuditLogEntry.objects.get(event_type="prescription_issued", session_id=session.id)
    assert event.actor_role == "doctor" and event.actor_id == doctor.id
    assert event.metadata["doctor_name"] == doctor.full_name
    other = Doctor(id=uuid4().hex, full_name="Other doctor").save()
    with pytest.raises(HTTPException):
        issue_prescription(PrescriptionInput(session_id=session.id, medications=[{
            "name": "Recorded medication", "dosage": "Recorded dosage", "frequency": "Recorded frequency", "start_date": date.today(),
        }]), other)
    doctor.delete()
    other.delete()


def test_upload_records_authenticated_patient_and_visit(monkeypatch):
    from app.services.document_service import document_service
    from unittest.mock import MagicMock
    session = new_visit()
    monkeypatch.setattr("app.services.document_service._s3_client", lambda: MagicMock())
    document = document_service.create(session.patient_id, "report.pdf", "application/pdf", b"%PDF test", document_type="lab_report")
    assert document.uploaded_by_role == "patient"
    assert document.uploaded_by_id == session.patient_id
    assert document.session_id == session.id
    event = AuditLogEntry.objects.get(event_type="document_uploaded", session_id=session.id)
    assert event.actor_id == session.patient_id
    assert event.metadata["document_type"] == "lab_report"
    assert session_detail(session.id, session.patient_id)["documents"][0]["id"] == str(document.id)


def test_legacy_backfill_is_idempotent_and_does_not_invent_location():
    from app.services.continuity_migration import backfill_legacy_visits
    session = InterviewSession(patient_id=uuid4().hex, status="completed").save()
    InterviewSession._get_collection().update_one({"_id": session.id}, {"$unset": {"visit_status": "", "step": ""}})
    backfill_legacy_visits()
    backfill_legacy_visits()
    session.reload()
    assert session.visit_status == "in_progress"
    assert session.step == "documents"
    assert session.location == ""


def test_profile_uses_existing_identity_without_exposing_credentials():
    from app.models.user import User
    from app.api.routes.patient import profile, update_profile, ProfileUpdate
    suffix = str(uuid4().int)[:10]
    user = User(full_name="Profile Patient", date_of_birth=date(1990, 1, 1), gender="Other",
                aadhaar="12" + suffix, mobile=suffix, address="Test address", state="Test", district="Test",
                password_hash="not-a-real-password-hash").save()
    result = profile(str(user.id))
    assert result["profile"]["full_name"] == user.full_name
    assert "password_hash" not in result["profile"]
    assert "aadhaar" not in result["profile"]
    update_profile(ProfileUpdate(allergies=["Reported allergy"], blood_group="O+", address="Updated address"), str(user.id))
    result = profile(str(user.id))
    assert result["profile"]["allergies"] == ["Reported allergy"]
    assert user.reload().address == "Updated address"
    assert not InterviewSession.objects(patient_id=str(user.id)).count()


def test_patient_summary_confirmation_cannot_impersonate_doctor():
    from app.api.routes.summary import update_summary
    from app.schemas.summary import SummaryPatchRequest
    with pytest.raises(HTTPException) as error:
        update_summary("any-summary", SummaryPatchRequest(status="confirmed"), {"sub": uuid4().hex, "role": "patient"})
    assert error.value.status_code == 403


def test_cookie_authenticated_visit_through_queue(monkeypatch):
    from app.core.security import create_access_token
    from app.services.llm_service import llm_service
    monkeypatch.setattr(llm_service, "generate_clinical_summary", lambda *args: {"Chief Complaint": "Recorded cough"})
    patient = uuid4().hex
    client = TestClient(app)
    client.cookies.set("medikiosk_access", create_access_token(patient))
    visit = client.post("/api/patient/sessions/start", json={"location": "Test clinic", "location_type": "on_site"})
    assert visit.status_code == 201
    session_id = visit.json()["id"]
    consent = client.post("/api/consent", json={"preferred_language": "en-IN", "choices": {
        "medical_history": True, "ai_assistance": True, "physician_sharing": True, "privacy_notice": True,
    }})
    assert consent.status_code == 200
    response = client.post("/api/interview/session", json={})
    assert response.status_code == 200
    answers = ["general_medicine", "cough_fever", "few_days", "no_breathlessness", "none", "none", "no_known_allergies", "none_known", "none", "neither"]
    if response.json()["current_question"]["id"] != "department":
        answers.pop(0)
    for answer in answers:
        question_id = response.json()["current_question"]["id"]
        response = client.post(f"/api/interview/session/{session_id}/answer", json={"question_id": question_id, "answer": answer})
        assert response.status_code == 200, response.text
    assert response.json()["status"] == "completed"
    assert client.get("/api/patient/session-status").json()["session"]["next_path"] == "/patient/documents"
    assert client.post(f"/api/patient/sessions/{session_id}/documents-complete").status_code == 200
    summary = client.post(f"/api/summary/{session_id}/generate")
    assert summary.status_code == 200, summary.text
    summary_id = summary.json()["id"]
    response = client.patch(f"/api/summary/{summary_id}", json={"patient_acknowledged": True})
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "draft"
    assert client.get("/api/physician/queue/me").json()["session_id"] == session_id
    assert not client.get("/api/patient/session-status").json()["resumable"]
    assert client.post("/api/summary/generate").json()["id"] == summary_id

    # The prototype physician continues the visit with no login or cookies.
    client.cookies.clear()
    queue = client.get("/api/physician/queue")
    assert queue.status_code == 200
    assert client.get(f"/api/physician/patient/{patient}/summary").status_code == 200
    reviewed = client.patch(f"/api/physician/summary/{summary_id}", json={"status": "confirmed"})
    assert reviewed.status_code == 200, reviewed.text
    prescribed = client.post("/api/physician/prescriptions", json={"session_id": session_id, "medications": [{
        "name": "Prototype medicine", "dosage": "Test dosage", "frequency": "Test frequency", "start_date": date.today().isoformat(),
    }]})
    assert prescribed.status_code == 201, prescribed.text
    from app.services.prototype_staff import PHYSICIAN_ID
    assert prescribed.json()["doctor_id"] == PHYSICIAN_ID
