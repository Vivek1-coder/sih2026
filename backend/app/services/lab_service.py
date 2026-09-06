from datetime import timedelta, timezone
from secrets import token_urlsafe
from uuid import uuid4

from fastapi import HTTPException
from mongoengine import NotUniqueError, ValidationError
from app.models.user import User
from app.models.continuity import AuditLogEntry, Doctor
from app.models.document_record import DocumentRecord
from app.models.interview import InterviewSession, utc_now
from app.services.identity_service import _normalize_aadhaar, _normalize_abha, _normalize_email, _normalize_mobile
from app.services.continuity_service import audit, serialize
from app.services.consent_service import consent_service
from app.services.document_service import document_service

NORMALIZERS = {"aadhaar": ("aadhaar", _normalize_aadhaar), "abha": ("abha_id", _normalize_abha),
               "email": ("email", _normalize_email), "phone": ("mobile", _normalize_mobile)}


def patient_details(user):
    # Deliberate allowlist: never return full Aadhaar, auth fields, or clinical history.
    consent = consent_service.get(str(user.id))
    return {"id": str(user.id), "full_name": user.full_name, "date_of_birth": user.date_of_birth.isoformat(),
            "gender": user.gender, "address": user.address, "mobile": user.mobile, "email": user.email,
            "aadhaar_masked": "XXXX-XXXX-" + user.aadhaar[-4:] if user.aadhaar else None,
            "abha_id": user.abha_id,
            "processing_consent": bool(consent and consent.status == "active" and consent.choices.document_processing)}


def get_patient(patient_id):
    try:
        user = User.objects(pk=patient_id, is_active=True, staff_role__ne="lab_assistant").first()
    except ValidationError:
        user = None
    if not user or Doctor.objects(pk=patient_id).first():
        raise HTTPException(404, "Patient not found")
    return user


class LabService:
    def lookup(self, body, actor):
        field, normalize = NORMALIZERS[body.identifier_type]
        user = User.objects(**{field: normalize(body.identifier)}).first()
        if not user:
            return {"patient": None, "matched": False}
        user = get_patient(str(user.id))
        audit(str(user.id), "lab_patient_matched", actor_role="lab_assistant", actor_id=str(actor.id),
              metadata={"identifier_type": body.identifier_type})
        return {"patient": patient_details(user), "matched": True}

    def register(self, body, actor):
        match = self.lookup(body, actor)
        if match["matched"]:
            return {**match, "created": False}
        field, normalize = NORMALIZERS[body.identifier_type]
        identity = {field: normalize(body.identifier)}
        for key, normalizer in (("mobile", _normalize_mobile), ("email", _normalize_email)):
            value = getattr(body, key)
            if value:
                normalized = normalizer(value)
                if key in identity and identity[key] != normalized:
                    raise HTTPException(422, "Contact details must match the selected identifier")
                identity[key] = normalized
        matches = {str(user.id): user for key, value in identity.items() for user in User.objects(**{key: value})}
        if len(matches) > 1:
            raise HTTPException(409, "Identifiers belong to different records. Review the patient details.")
        if matches:
            user = get_patient(next(iter(matches)))
            return {"matched": True, "created": False, "patient": patient_details(user)}
        # An unusable password prevents staff from establishing patient login credentials.
        user = User(full_name=body.full_name, date_of_birth=body.date_of_birth, gender=body.gender,
                    address=body.address, provisional=True, password_hash="!" + token_urlsafe(48), **identity)
        try:
            user.save()
        except NotUniqueError:
            raise HTTPException(409, "A matching record was just created. Search again.")
        except ValidationError:
            raise HTTPException(422, "Invalid patient details")
        audit(str(user.id), "lab_patient_registered", actor_role="lab_assistant", actor_id=str(actor.id),
              event_key=f"lab-register:{user.id}", metadata={"identifier_type": body.identifier_type})
        return {"matched": False, "created": True, "patient": patient_details(user)}

    def verify(self, patient_id, body, actor):
        user = get_patient(patient_id)
        for field in ("full_name", "date_of_birth", "gender", "address"):
            setattr(user, field, getattr(body, field))
        for field, normalizer in (("mobile", _normalize_mobile), ("email", _normalize_email)):
            value = getattr(body, field)
            if value and normalizer(value) != getattr(user, field):
                setattr(user, field, normalizer(value))
                setattr(user, field + "_verified", False)
        try:
            user.save()
        except NotUniqueError:
            raise HTTPException(409, "Contact details are already used by another patient")
        except ValidationError:
            raise HTTPException(422, "Invalid patient details")
        audit(patient_id, "profile_updated", actor_role="lab_assistant", actor_id=str(actor.id), metadata={"source": "lab_verification"})
        consent = consent_service.capture_document_authorization(patient_id, str(actor.id))
        verification_id = str(uuid4())
        revision = user.reload().updated_at.isoformat()
        audit(patient_id, "lab_patient_verified", actor_role="lab_assistant", actor_id=str(actor.id),
              event_key=verification_id, metadata={"revision": revision, "consent_version": consent.version,
                                                  "patient_authorization_attested": True})
        return {"patient": patient_details(user), "verification_id": verification_id}

    def require_verification(self, patient_id, verification_id, actor):
        user = get_patient(patient_id)
        entry = AuditLogEntry.objects(patient_id=patient_id, event_key=verification_id,
                                      event_type="lab_patient_verified", actor_id=str(actor.id), actor_role="lab_assistant").first()
        if not entry or entry.timestamp.replace(tzinfo=timezone.utc) < utc_now() - timedelta(minutes=30):
            raise HTTPException(409, "Verify this patient's details again before uploading")
        consent = consent_service.get(patient_id)
        if not consent or consent.status != "active" or not consent.choices.document_processing:
            raise HTTPException(403, "Patient document-processing consent required")
        if entry.metadata["revision"] != user.updated_at.isoformat() or entry.metadata["consent_version"] != consent.version:
            raise HTTPException(409, "Patient details or consent changed. Verify again.")

    def upload(self, patient_id, verification_id, actor, filename, content_type, content, session_id=None):
        self.require_verification(patient_id, verification_id, actor)
        if session_id and not InterviewSession.objects(pk=session_id, patient_id=patient_id).first():
            raise HTTPException(403, "Session does not belong to this patient")
        return document_service.create(patient_id, filename, content_type, content, document_type="lab_report",
                                       uploaded_by_role="lab_assistant", uploaded_by_id=str(actor.id), session_id=session_id)

    def report(self, document_id, actor):
        try:
            record = DocumentRecord.objects(pk=document_id, uploaded_by_role="lab_assistant", uploaded_by_id=str(actor.id), document_type="lab_report").first()
        except ValidationError:
            record = None
        if not record:
            raise HTTPException(404, "Report not found")
        # Lab staff can track their own report, never retrieve the patient's unrelated clinical records.
        return {"id": str(record.id), "patient_id": record.patient_id, "original_filename": record.original_filename,
                "status": record.status, "uploaded_at": serialize(record)["uploaded_at"], "error": record.error}


lab_service = LabService()
