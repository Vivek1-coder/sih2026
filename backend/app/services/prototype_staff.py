"""Account-free singleton staff identities for the MediKiosk prototype."""
from dataclasses import dataclass

from app.models.continuity import Doctor, DoctorQueueEntry
from app.models.interview import InterviewSession


@dataclass(frozen=True)
class DeskIdentity:
    id: str
    full_name: str


LAB_ASSISTANT = DeskIdentity("prototype-lab-assistant", "Lab Assistant")
PHYSICIAN_ID = "prototype-physician"


def prototype_doctor():
    doctor = Doctor.objects(pk=PHYSICIAN_ID).modify(
        upsert=True, new=True, set__full_name="Prototype Physician",
        set__on_duty=True, set_on_insert__department="General Medicine",
    )
    # Carry existing waiting visits into the single prototype desk.
    for entry in DoctorQueueEntry.objects(status__ne="done", doctor_id__ne=doctor.id):
        entry.update(set__doctor_id=doctor.id)
        InterviewSession.objects(pk=entry.session_id).update_one(set__assigned_doctor_id=doctor.id)
    return doctor
