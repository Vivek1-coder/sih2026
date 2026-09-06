from datetime import date
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.models.continuity import Doctor, Prescription, Medication, DoctorQueueEntry, AuditLogEntry
from app.models.document_record import DocumentRecord
from app.models.summary import ClinicalHistorySummary
from app.services.continuity_service import serialize, audit
from app.services.queue_service import queue_service

router = APIRouter(prefix="/api/physician", tags=["prescriptions"])


def current_doctor():
    from app.services.prototype_staff import prototype_doctor
    return prototype_doctor()


class MedicationInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    name: str = Field(min_length=1, max_length=200)
    dosage: str = Field(min_length=1, max_length=200)
    frequency: str = Field(min_length=1, max_length=200)
    route: str = Field(default="", max_length=100)
    start_date: date
    end_date: date | None = None
    status: Literal["active", "completed"] = "active"
    notes: str = Field(default="", max_length=2000)

    @model_validator(mode="after")
    def dates(self):
        if self.end_date and self.end_date < self.start_date:
            raise ValueError("End date cannot precede start date")
        return self


class PrescriptionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    session_id: str
    medications: list[MedicationInput] = Field(min_length=1, max_length=50)
    notes: str = Field(default="", max_length=5000)
    source_document_id: str | None = None


@router.post("/prescriptions", status_code=201)
def issue_prescription(body: PrescriptionInput, doctor=Depends(current_doctor)):
    entry = DoctorQueueEntry.objects(session_id=body.session_id, doctor_id=doctor.id, status__ne="done").first()
    if not entry:
        raise HTTPException(403, "Visit is not assigned to this physician")
    if body.source_document_id:
        try:
            document = DocumentRecord.objects(pk=body.source_document_id, patient_id=entry.patient_id, session_id=body.session_id).first()
        except Exception:
            document = None
        if not document:
            raise HTTPException(422, "Source document must belong to this visit")
    prescription = Prescription(patient_id=entry.patient_id, session_id=body.session_id,
                                doctor_id=doctor.id, notes=body.notes, source_document_id=body.source_document_id)
    medicines = [Medication(patient_id=entry.patient_id, prescription_id=prescription.id,
                           prescribed_by=doctor.id, **m.model_dump()) for m in body.medications]
    prescription.medication_ids = [m.id for m in medicines]
    for medicine in medicines:
        medicine.save()
    prescription.save()
    audit(entry.patient_id, "prescription_issued", session_id=entry.session_id,
          actor_role="doctor", actor_id=doctor.id, event_key=f"prescription:{prescription.id}",
          metadata={"prescription_id": prescription.id, "doctor_name": doctor.full_name})
    return serialize(prescription)


class AssignmentInput(BaseModel):
    session_id: str


@router.post("/queue/assign")
def assign_queue(body: AssignmentInput, doctor=Depends(current_doctor)):
    summary = ClinicalHistorySummary.objects(interview_session_id=body.session_id).first()
    if not summary:
        raise HTTPException(404, "Summary not found")
    return serialize(queue_service.register(summary))


@router.get("/patient/{patient_id}/audit-log")
def physician_audit(patient_id: str, doctor=Depends(current_doctor)):
    if not DoctorQueueEntry.objects(patient_id=patient_id, doctor_id=doctor.id).first():
        raise HTTPException(403, "Patient is not assigned to this physician")
    return [serialize(e) for e in AuditLogEntry.objects(patient_id=patient_id).order_by("timestamp")]
