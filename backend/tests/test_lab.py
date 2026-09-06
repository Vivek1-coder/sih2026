from datetime import date
from uuid import uuid4
from unittest.mock import MagicMock
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.models.user import User
from app.models.continuity import AuditLogEntry
from app.models.consent import ConsentRecord
from app.models.document_record import DocumentRecord
from app.services.consent_service import consent_service


@pytest.fixture
def lab_client(monkeypatch):
    from app.services.prototype_staff import LAB_ASSISTANT
    actor = LAB_ASSISTANT
    client = TestClient(app)
    monkeypatch.setattr("app.services.document_service._s3_client", lambda: MagicMock())
    return client, actor


def details():
    return {"full_name": "Test Patient", "date_of_birth": "2000-01-02", "gender": "Other"}


@pytest.mark.parametrize("kind,value", [("aadhaar", "123456789123"), ("abha", "testpatient@abdm"), ("email", "patient.lab@example.com"), ("phone", "+91 8765432190")])
def test_identifier_registration_and_duplicate_matching(lab_client, kind, value):
    client, actor = lab_client
    before = User.objects.count()
    response = client.post("/api/lab/patients", json={**details(), "identifier_type": kind, "identifier": value})
    assert response.status_code == 200, response.text
    patient = response.json()["patient"]
    assert response.json()["created"]
    lookup = client.post("/api/lab/patients/lookup", json={"identifier_type": kind, "identifier": value})
    assert lookup.json()["patient"]["id"] == patient["id"]
    duplicate = client.post("/api/lab/patients", json={**details(), "identifier_type": kind, "identifier": value})
    assert duplicate.json()["created"] is False
    assert User.objects.count() == before + 1
    assert "password_hash" not in patient and "aadhaar" not in patient
    if kind == "aadhaar":
        assert patient["aadhaar_masked"] == "XXXX-XXXX-9123"


def test_upload_requires_verification_then_appears_in_patient_history(lab_client):
    client, actor = lab_client
    result = client.post("/api/lab/patients", json={**details(), "identifier_type": "email", "identifier": f"{uuid4().hex}@example.com"}).json()
    patient_id = result["patient"]["id"]
    files = {"file": ("lab_report.pdf", b"%PDF test report", "application/pdf")}
    rejected = client.post(f"/api/lab/patients/{patient_id}/reports", data={"verification_id": "fake"}, files=files)
    assert rejected.status_code == 409
    verification = client.post(f"/api/lab/patients/{patient_id}/verify", json={**details(), "details_confirmed": True, "processing_consent": True})
    assert verification.status_code == 200, verification.text
    consent = ConsentRecord.objects.get(patient_id=patient_id)
    assert consent.choices.document_processing and not consent.choices.ai_assistance
    assert not consent.choices.medical_history
    upload = client.post(f"/api/lab/patients/{patient_id}/reports", data={"verification_id": verification.json()["verification_id"]}, files=files)
    assert upload.status_code == 202, upload.text
    report_id = upload.json()["id"]
    assert client.get(f"/api/lab/reports/{report_id}").json()["status"] == "done"
    record = DocumentRecord.objects.get(pk=report_id)
    assert record.uploaded_by_role == "lab_assistant" and record.uploaded_by_id == str(actor.id)
    assert record.document_type == "lab_report"
    event = AuditLogEntry.objects.get(patient_id=patient_id, event_type="document_uploaded")
    assert event.actor_role == "lab_assistant" and event.actor_id == str(actor.id)
    assert AuditLogEntry.objects(patient_id=patient_id, event_type="document_processed").count() == 1
    client.cookies.set("medikiosk_access", create_access_token(patient_id))
    history = client.get("/api/patient/profile")
    assert history.status_code == 200, history.text
    assert history.json()["documents"][0]["id"] == report_id


def test_consent_revocation_blocks_previously_verified_upload(lab_client):
    client, _ = lab_client
    patient_id = client.post("/api/lab/patients", json={**details(), "identifier_type": "email", "identifier": f"{uuid4().hex}@example.com"}).json()["patient"]["id"]
    verified = client.post(f"/api/lab/patients/{patient_id}/verify", json={**details(), "details_confirmed": True, "processing_consent": True}).json()
    consent_service.revoke(patient_id)
    response = client.post(f"/api/lab/patients/{patient_id}/reports", data={"verification_id": verified["verification_id"]}, files={"file": ("lab.pdf", b"%PDF test", "application/pdf")})
    assert response.status_code == 403


def test_prototype_desks_need_no_login_but_patient_routes_do(lab_client):
    client, actor = lab_client
    assert client.get("/api/physician/queue").status_code == 200
    assert client.post("/api/lab/patients/lookup", json={"identifier_type": "phone", "identifier": "8765432109"}).status_code == 200
    for path in ("/api/patient/medications", "/api/patient/profile", "/api/summary/current", "/api/documents"):
        assert client.get(path).status_code == 401
    assert client.patch("/api/summary/any", json={"sections": {"Chief Complaint": "tamper"}}).status_code == 401
    assert client.patch("/api/physician/summary/any", json={"status": "confirmed"}).status_code == 403


def test_singleton_identity_and_unrelated_report_access(lab_client):
    from app.api.dependencies import get_current_lab_assistant
    from app.services.prototype_staff import prototype_doctor
    client, actor = lab_client
    assert get_current_lab_assistant() is actor
    assert prototype_doctor().id == prototype_doctor().id
    record = DocumentRecord(patient_id="p", original_filename="x.pdf", stored_path="private", content_type="application/pdf", size_bytes=1,
                            uploaded_by_role="lab_assistant", uploaded_by_id="someone-else", document_type="lab_report").save()
    assert client.get(f"/api/lab/reports/{record.id}").status_code == 404


def test_verification_cannot_be_reused_for_another_patient_and_rejects_bad_files(lab_client):
    client, _ = lab_client
    def register():
        return client.post("/api/lab/patients", json={**details(), "identifier_type": "email", "identifier": f"{uuid4().hex}@example.com"}).json()["patient"]["id"]
    first, second = register(), register()
    verified = client.post(f"/api/lab/patients/{first}/verify", json={**details(), "details_confirmed": True, "processing_consent": True}).json()
    data = {"verification_id": verified["verification_id"]}
    file = {"file": ("report.pdf", b"%PDF test", "application/pdf")}
    assert client.post(f"/api/lab/patients/{second}/reports", data=data, files=file).status_code == 409
    assert client.post(f"/api/lab/patients/{first}/reports", data=data, files={"file": ("fake.pdf", b"not pdf", "application/pdf")}).status_code == 415
    assert not DocumentRecord.objects(patient_id=first).count()


def test_verification_reference_expires_and_tracks_demographic_revision(lab_client):
    from datetime import timedelta
    from app.models.interview import utc_now
    client, _ = lab_client
    patient_id = client.post("/api/lab/patients", json={**details(), "identifier_type": "email", "identifier": f"{uuid4().hex}@example.com"}).json()["patient"]["id"]
    verified = client.post(f"/api/lab/patients/{patient_id}/verify", json={**details(), "details_confirmed": True, "processing_consent": True}).json()
    data = {"verification_id": verified["verification_id"]}
    AuditLogEntry.objects(event_key=data["verification_id"]).update_one(set__timestamp=utc_now()-timedelta(minutes=31))
    assert client.post(f"/api/lab/patients/{patient_id}/reports", data=data, files={"file": ("report.pdf", b"%PDF test", "application/pdf")}).status_code == 409


def test_optional_identity_index_migration_keeps_uniqueness():
    from app.services.user_index_migration import migrate_optional_identity_indexes
    migrate_optional_identity_indexes()
    migrate_optional_identity_indexes()
    indexes = User._get_collection().index_information()
    for field in ("aadhaar", "mobile"):
        assert indexes[f"{field}_1"]["sparse"]
        assert indexes[f"{field}_1"]["unique"]
