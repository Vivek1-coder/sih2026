import base64
import io
import json
from uuid import uuid4
from datetime import datetime, date, timezone

import qrcode
from mongoengine import NotUniqueError
from fastapi import HTTPException
from app.models.continuity import AuditLogEntry, Medication, MedicationSummary
from app.models.interview import InterviewSession, utc_now
from app.services.consent_service import consent_service


def serialize(record):
    data = record.to_mongo().to_dict()
    data["id"] = str(data.pop("_id"))
    def normalize(value):
        if isinstance(value, datetime):
            return value.replace(tzinfo=value.tzinfo or timezone.utc).isoformat()
        if isinstance(value, date):
            return value.isoformat()
        if isinstance(value, dict):
            return {key: normalize(item) for key, item in value.items()}
        if isinstance(value, list):
            return [normalize(item) for item in value]
        return value
    return normalize(data)


def audit(patient_id, event_type, *, session_id=None, actor_role="patient", actor_id=None,
          metadata=None, event_key=None):
    """Insert only. Unique event keys make repeat delivery safe without changing history."""
    try:
        AuditLogEntry(patient_id=patient_id, event_type=event_type, session_id=session_id,
                      actor_role=actor_role, actor_id=actor_id or (patient_id if actor_role == "patient" else None),
                      metadata=metadata or {}, event_key=event_key or str(uuid4())).save(force_insert=True)
    except NotUniqueError:
        pass


def active_visit(patient_id):
    return InterviewSession.objects(patient_id=patient_id, visit_status="in_progress").order_by("-created_at").first()


def require_visit(patient_id):
    session = active_visit(patient_id)
    if not session or not session.location:
        raise HTTPException(409, "Choose a session and capture your location first")
    return session


def resume_step(session):
    if not consent_service.required_granted(consent_service.get(session.patient_id)):
        return "consent"
    return session.step


def visit_data(session):
    data = serialize(session)
    data["interview_status"] = session.status
    data["status"] = session.visit_status
    data["next_path"] = "/patient/" + resume_step(session)
    return data


def capture_summary(summary):
    session = InterviewSession.objects.get(pk=summary.interview_session_id)
    snapshot = [serialize(m) for m in Medication.objects(patient_id=summary.patient_id)]
    # Store dates as ISO text in the immutable snapshot.
    snapshot = json.loads(json.dumps(snapshot, default=str))
    content = "\n".join(f"{m['name']} · {m['dosage']} · {m['frequency']} · {m['status']}" for m in snapshot)
    content = content or "No verified medications recorded."
    record = MedicationSummary.objects(session_id=session.id).modify(
        upsert=True, new=True, set_on_insert__id=str(uuid4()),
        set_on_insert__patient_id=summary.patient_id,
        set_on_insert__generated_at=utc_now(), set_on_insert__content=content,
        set_on_insert__confirmed=False,
        set_on_insert__medications_snapshot=snapshot,
        set_on_insert__qr_payload_token=__import__('secrets').token_urlsafe(24))
    audit(summary.patient_id, "summary_generated", session_id=session.id, actor_role="system",
          event_key=f"summary:{summary.id}", metadata={"summary_id": summary.id})
    if summary.patient_acknowledged_at:
        MedicationSummary.objects(pk=record.id, confirmed=False).update_one(
            set__confirmed=True, set__confirmed_at=summary.patient_acknowledged_at)
        audit(summary.patient_id, "summary_confirmed", session_id=session.id,
              event_key=f"ack:{summary.id}", metadata={"summary_id": summary.id, "kind": "patient_readback"})
        session.visit_status = "completed"
        session.step = "complete"
    elif session.visit_status == "in_progress":
        session.step = "summary"
    session.save()


def medication_summary_data(record):
    if not record:
        return None
    data = serialize(record)
    payload = json.dumps({"v": 1, "patientId": record.patient_id,
                          "summaryRef": record.id, "token": record.qr_payload_token}, separators=(",", ":"))
    buffer = io.BytesIO()
    qrcode.make(payload).save(buffer, format="PNG")
    data["qr_payload"] = payload
    data["qr_image"] = "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()
    return data
