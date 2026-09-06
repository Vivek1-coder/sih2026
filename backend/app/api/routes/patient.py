from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator
from mongoengine import ValidationError, NotUniqueError
from app.api.dependencies import get_current_patient_id
from app.models.continuity import PatientProfile, Medication, Prescription, AuditLogEntry, MedicationSummary
from app.models.document_record import DocumentRecord
from app.models.interview import InterviewSession, utc_now
from app.models.user import User
from app.core.config import settings
from app.services.continuity_service import (active_visit, audit, serialize, visit_data,
                                            medication_summary_data)
from app.services.interview_service import interview_service
from app.services.interview_engine import interview_engine

router = APIRouter(prefix="/api/patient", tags=["patient continuity"])


class LocationRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    location: str = Field(min_length=2, max_length=200)
    location_type: Literal["on_site", "remote", "other"]


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    full_name: str | None = Field(default=None, min_length=2, max_length=100)
    date_of_birth: date | None = None
    gender: Literal["Male", "Female", "Other", "Prefer not to say"] | None = None
    contact_number: str | None = Field(default=None, pattern=r"^\d{10,15}$")
    address: str | None = Field(default=None, min_length=1, max_length=500)
    emergency_contact: str | None = Field(default=None, pattern=r"^\d{0,15}$")
    blood_group: Literal["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] | None = None
    allergies: list[str] | None = Field(default=None, max_length=100)
    preferred_language: Literal["en-IN", "hi-IN", "ta-IN", "as-IN", "bn-IN", "mr-IN", "te-IN"] | None = None

    @model_validator(mode="after")
    def valid_values(self):
        if self.date_of_birth and self.date_of_birth > date.today():
            raise ValueError("Date of birth cannot be in the future")
        if self.allergies and any(not a.strip() or len(a) > 200 for a in self.allergies):
            raise ValueError("Allergies must contain 1–200 characters")
        if any(getattr(self, name) is None for name in self.model_fields_set):
            raise ValueError("Omit fields instead of setting them to null")
        return self


def profile_details(patient_id):
    try:
        user = User.objects(pk=patient_id, is_active=True).first()
    except ValidationError:
        user = None
    if not user:
        raise HTTPException(404, "Patient profile not found")
    extra = PatientProfile.objects(patient_id=patient_id).first()
    return {**user.to_safe_dict(), "contact_number": user.mobile,
            "blood_group": extra.blood_group if extra else "",
            "allergies": extra.allergies if extra else [],
            "preferred_language": extra.preferred_language if extra else "en-IN"}


@router.get("/locations")
def locations(patient_id: str = Depends(get_current_patient_id)):
    # No fictitious facilities: deployments supply the list; Other always works.
    return {"locations": settings.MEDIKIOSK_LOCATIONS}


@router.get("/session-status")
def session_status(patient_id: str = Depends(get_current_patient_id)):
    session = active_visit(patient_id)
    latest = interview_service.current(patient_id)
    return {"resumable": bool(session), "session": visit_data(session) if session else None,
            "latest_session": visit_data(latest) if latest else None}


@router.post("/sessions/start", status_code=201)
def start_session(body: LocationRequest, patient_id: str = Depends(get_current_patient_id)):
    for old in InterviewSession.objects(patient_id=patient_id, visit_status="in_progress"):
        old.visit_status = "abandoned"
        old.save()
        audit(patient_id, "session_abandoned", session_id=old.id, event_key=f"abandoned:{old.id}")
    session = InterviewSession(patient_id=patient_id, **body.model_dump(),
                               current_question_id=interview_engine.initial_question_id(None)).save()
    audit(patient_id, "session_started", session_id=session.id, event_key=f"start:{session.id}")
    audit(patient_id, "location_captured", session_id=session.id, metadata=body.model_dump())
    return visit_data(session)


@router.post("/sessions/{session_id}/resume")
def resume_session(session_id: str, body: LocationRequest, patient_id: str = Depends(get_current_patient_id)):
    session = interview_service.get_owned(session_id, patient_id)
    if session.visit_status != "in_progress":
        raise HTTPException(409, "Only an in-progress visit can be resumed")
    session.location = body.location
    session.location_type = body.location_type
    session.updated_at = utc_now()
    session.save()
    audit(patient_id, "session_resumed", session_id=session.id, metadata=body.model_dump())
    audit(patient_id, "location_captured", session_id=session.id, metadata=body.model_dump())
    return visit_data(session)


@router.get("/sessions")
def sessions(patient_id: str = Depends(get_current_patient_id)):
    return [visit_data(s) for s in InterviewSession.objects(patient_id=patient_id).order_by("-created_at")]


@router.get("/sessions/{session_id}")
def session_detail(session_id: str, patient_id: str = Depends(get_current_patient_id)):
    session = interview_service.get_owned(session_id, patient_id)
    return {**visit_data(session),
            "documents": [serialize(d) for d in DocumentRecord.objects(patient_id=patient_id, session_id=session_id).exclude("stored_path")],
            "prescriptions": [serialize(p) for p in Prescription.objects(patient_id=patient_id, session_id=session_id)]}


@router.post("/sessions/{session_id}/documents-complete")
def documents_complete(session_id: str, patient_id: str = Depends(get_current_patient_id)):
    session = interview_service.get_owned(session_id, patient_id)
    if session.status != "completed" or session.visit_status != "in_progress" or not session.location:
        raise HTTPException(409, "Complete the interview first")
    session.step = "summary"
    session.save()
    audit(patient_id, "step_completed", session_id=session.id, event_key=f"documents-complete:{session.id}", metadata={"step": "documents"})
    return visit_data(session)


@router.get("/medications")
def medications(patient_id: str = Depends(get_current_patient_id)):
    return [serialize(m) for m in Medication.objects(patient_id=patient_id).order_by("-start_date")]


@router.get("/audit-log")
def audit_log(patient_id: str = Depends(get_current_patient_id)):
    return [serialize(e) for e in AuditLogEntry.objects(patient_id=patient_id).order_by("timestamp", "id")]


@router.get("/medication-summary/latest")
def latest_medication_summary(patient_id: str = Depends(get_current_patient_id)):
    return medication_summary_data(MedicationSummary.objects(patient_id=patient_id).order_by("-generated_at").first())


@router.get("/medication-summary/resolve/{token}")
def resolve_medication_summary(token: str, patient_id: str = Depends(get_current_patient_id)):
    record = MedicationSummary.objects(patient_id=patient_id, qr_payload_token=token).first()
    if not record:
        raise HTTPException(404, "Medication summary not found")
    return medication_summary_data(record)


@router.get("/profile")
def profile(patient_id: str = Depends(get_current_patient_id)):
    details = profile_details(patient_id)
    audit(patient_id, "profile_viewed")
    return {"profile": details, "medications": medications(patient_id),
            "documents": [serialize(d) for d in DocumentRecord.objects(patient_id=patient_id).exclude("stored_path")],
            "sessions": sessions(patient_id), "medication_summary": latest_medication_summary(patient_id),
            "audit_log": audit_log(patient_id)}


@router.put("/profile")
def update_profile(body: ProfileUpdate, patient_id: str = Depends(get_current_patient_id)):
    profile_details(patient_id)
    user = User.objects.get(pk=patient_id)
    extra = PatientProfile.objects(patient_id=patient_id).first() or PatientProfile(patient_id=patient_id)
    values = body.model_dump(exclude_unset=True)
    for key, value in values.items():
        target = extra if key in {"blood_group", "allergies", "preferred_language"} else user
        setattr(target, "mobile" if key == "contact_number" else key, value)
    try:
        user.validate()
        extra.validate()
        user.save()
        extra.updated_at = utc_now()
        extra.save()
    except (ValidationError, NotUniqueError) as exc:
        raise HTTPException(422, "Invalid or already used profile details") from exc
    audit(patient_id, "profile_updated", metadata={"fields": list(values)})
    return profile_details(patient_id)
