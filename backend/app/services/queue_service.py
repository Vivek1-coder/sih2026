from threading import RLock
from uuid import uuid4
from app.models.interview import utc_now
from fastapi import HTTPException
from app.models.continuity import Doctor, DoctorQueueEntry
from app.models.summary import ClinicalHistorySummary
from app.models.interview import InterviewSession
from app.services.continuity_service import audit
from app.services.document_service import document_service

PRIORITY_RANK = {"urgent": 0, "priority": 1, "routine": 2}

class PhysicianQueueService:
    def __init__(self):
        self._lock = RLock()

    def register(self, summary):
        summary.reload()
        if not summary.patient_acknowledged_at:
            raise HTTPException(409, "Patient read-back must be submitted before queue registration")
        session = InterviewSession.objects.get(pk=summary.interview_session_id)
        with self._lock:
            from app.services.prototype_staff import prototype_doctor
            doctor = prototype_doctor()
            registration = DoctorQueueEntry.objects(session_id=session.id).modify(
                upsert=True, new=True, set_on_insert__id=str(uuid4()),
                set_on_insert__token="OPD-" + uuid4().hex[:8].upper(),
                set_on_insert__added_at=utc_now(), set_on_insert__status="waiting",
                set_on_insert__patient_id=summary.patient_id, set_on_insert__summary_id=summary.id,
                set_on_insert__location=session.location, set_on_insert__priority=session.priority,
                set_on_insert__doctor_id=doctor.id if doctor else None)
            # MongoEngine supplies defaults for upserts; retain a waiting entry if nobody is on duty.
            if not registration.doctor_id and doctor:
                registration = DoctorQueueEntry.objects(pk=registration.id, doctor_id=None).modify(new=True, set__doctor_id=doctor.id) or DoctorQueueEntry.objects.get(pk=registration.id)
            session.assigned_doctor_id = registration.doctor_id
            session.queue_entry_id = registration.id
            session.save()
            audit(summary.patient_id, "doctor_queue_assigned", session_id=session.id, actor_role="system",
                  event_key=f"queue:{session.id}:{registration.doctor_id or 'pending'}",
                  metadata={"doctor_id": registration.doctor_id, "doctor_name": Doctor.objects.get(pk=registration.doctor_id).full_name if registration.doctor_id else None,
                            "location": registration.location, "priority": registration.priority})
            return registration

    def entries(self, doctor_id=None):
        registrations = list(DoctorQueueEntry.objects(status__ne="done", **({"doctor_id": doctor_id} if doctor_id else {})))
        registrations.sort(key=lambda r: (PRIORITY_RANK.get(r.priority, 2), r.added_at))
        result = []
        for registration in registrations:
            summary = ClinicalHistorySummary.objects(pk=registration.summary_id).first()
            if summary:
                result.append(self._entry(registration, len(result) + 1, summary))
        return result

    def for_patient(self, patient_id):
        entries = [e for e in self.entries() if e["patient_id"] == patient_id]
        if not entries:
            raise HTTPException(404, "Patient is not in the physician queue")
        return max(entries, key=lambda e: e["added_at"])

    @staticmethod
    def _entry(registration, position, summary):
        session = InterviewSession.objects.get(pk=registration.session_id)
        doctor = Doctor.objects(pk=registration.doctor_id).first() if registration.doctor_id else None
        return {
            "patient_id": registration.patient_id, "summary_id": summary.id,
            "session_id": session.id, "doctor_id": registration.doctor_id,
            "doctor_name": doctor.full_name if doctor else None,
            "location": registration.location, "added_at": registration.added_at,
            "status": registration.status, "token": registration.token,
            "display_name": f"Patient {registration.token}",
            "complaint": summary.sections.get("Chief Complaint", "Not recorded"),
            "department": session.department or "General Medicine", "priority": session.priority,
            "red_flags": [a.reason for a in session.alerts],
            "document_count": len(document_service.list_for_patient(registration.patient_id)),
            "summary_status": summary.status, "queue_position": position,
            "estimated_wait_minutes": max(5, position * 8),
        }

queue_service = PhysicianQueueService()
