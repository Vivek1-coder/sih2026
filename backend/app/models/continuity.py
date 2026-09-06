"""Persistent visit history. Identity remains exclusively in User."""
from secrets import token_urlsafe
from uuid import uuid4

from mongoengine import (Document, StringField, DateTimeField, DateField,
                         ListField, DictField, BooleanField)
from app.models.interview import utc_now


class PatientProfile(Document):
    patient_id = StringField(required=True, unique=True)
    blood_group = StringField(default="")
    allergies = ListField(StringField())
    preferred_language = StringField(default="en-IN")
    created_at = DateTimeField(default=utc_now)
    updated_at = DateTimeField(default=utc_now)
    meta = {"collection": "patient_profiles"}


class Medication(Document):
    id = StringField(primary_key=True, default=lambda: str(uuid4()))
    patient_id = StringField(required=True)
    prescription_id = StringField(null=True)
    name = StringField(required=True)
    dosage = StringField(default="")
    frequency = StringField(default="")
    route = StringField(default="")
    start_date = DateField(required=True)
    end_date = DateField(null=True)
    prescribed_by = StringField(null=True)
    status = StringField(choices=["active", "completed"], default="active")
    notes = StringField(default="")
    meta = {"collection": "medications", "indexes": ["patient_id"]}


class Prescription(Document):
    id = StringField(primary_key=True, default=lambda: str(uuid4()))
    session_id = StringField(required=True)
    patient_id = StringField(required=True)
    doctor_id = StringField(required=True)
    issued_at = DateTimeField(default=utc_now)
    medication_ids = ListField(StringField())
    notes = StringField(default="")
    source_document_id = StringField(null=True)
    meta = {"collection": "prescriptions", "indexes": ["patient_id", "session_id"]}


class AuditLogEntry(Document):
    id = StringField(primary_key=True, default=lambda: str(uuid4()))
    patient_id = StringField(required=True)
    event_type = StringField(required=True, choices=[
        "session_started", "session_resumed", "location_captured", "answer_submitted",
        "document_uploaded", "document_deleted", "prescription_issued", "summary_generated",
        "summary_confirmed", "summary_updated", "doctor_queue_assigned", "profile_viewed",
        "profile_updated", "patient_identified", "consent_updated", "consent_revoked",
        "session_abandoned", "step_completed", "medication_updated",
        "lab_patient_matched", "lab_patient_registered", "lab_patient_verified", "document_processed", "document_processing_failed"])
    actor_role = StringField(choices=["patient", "doctor", "lab_assistant", "system"], required=True)
    actor_id = StringField(null=True)
    session_id = StringField(null=True)
    timestamp = DateTimeField(default=utc_now)
    metadata = DictField()
    event_key = StringField(required=True, unique=True)
    meta = {"collection": "audit_log", "indexes": [("patient_id", "timestamp")]}


class MedicationSummary(Document):
    id = StringField(primary_key=True, default=lambda: str(uuid4()))
    patient_id = StringField(required=True)
    session_id = StringField(required=True, unique=True)
    generated_at = DateTimeField(default=utc_now)
    content = StringField(default="")
    medications_snapshot = ListField(DictField())
    qr_payload_token = StringField(default=lambda: token_urlsafe(24), unique=True)
    confirmed = BooleanField(default=False)
    confirmed_at = DateTimeField(null=True)
    meta = {"collection": "medication_summaries", "indexes": ["patient_id"]}


class Doctor(Document):
    """Provision doctors through administration; ids must match trusted JWT subjects."""
    id = StringField(primary_key=True)
    full_name = StringField(required=True)
    department = StringField(default="General Medicine")
    on_duty = BooleanField(default=True)
    meta = {"collection": "doctors"}


class DoctorQueueEntry(Document):
    id = StringField(primary_key=True, default=lambda: str(uuid4()))
    patient_id = StringField(required=True)
    summary_id = StringField(required=True)
    session_id = StringField(required=True, unique=True)
    doctor_id = StringField(null=True)
    token = StringField(default=lambda: "OPD-" + uuid4().hex[:8].upper())
    location = StringField(default="")
    priority = StringField(default="routine")
    added_at = DateTimeField(default=utc_now)
    status = StringField(choices=["waiting", "in_consultation", "done"], default="waiting")
    meta = {"collection": "physician_queue", "indexes": ["patient_id", "doctor_id"]}
