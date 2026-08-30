from threading import RLock

from fastapi import HTTPException

from app.models.queue import PhysicianQueueRegistration
from app.models.summary import ClinicalHistorySummary
from app.services.document_service import document_service
from app.services.interview_service import interview_service
from app.services.summary_service import summary_service

PRIORITY_RANK = {"urgent": 0, "priority": 1, "routine": 2}


class PhysicianQueueService:
    """In-memory demo queue backed by submitted patient summaries."""

    def __init__(self) -> None:
        self._registrations: dict[str, PhysicianQueueRegistration] = {}
        self._counter = 100
        self._lock = RLock()

    def register(self, summary: ClinicalHistorySummary) -> PhysicianQueueRegistration:
        if not summary.patient_acknowledged_at:
            raise HTTPException(
                status_code=409,
                detail="Patient read-back must be submitted before queue registration",
            )
        with self._lock:
            existing = self._registrations.get(summary.patient_id)
            if existing:
                return existing
            self._counter += 1
            registration = PhysicianQueueRegistration(
                patient_id=summary.patient_id,
                summary_id=summary.id,
                token=f"OPD-{self._counter:03d}",
            )
            self._registrations[summary.patient_id] = registration
            return registration

    def entries(self) -> list[dict[str, object]]:
        summaries = {
            summary.patient_id: summary for summary in summary_service.list_all()
        }
        with self._lock:
            registrations = list(self._registrations.values())
        registrations.sort(
            key=lambda item: (
                PRIORITY_RANK.get(
                    summaries.get(item.patient_id).priority
                    if summaries.get(item.patient_id)
                    else "routine",
                    2,
                ),
                item.registered_at,
            )
        )
        return [
            self._entry(registration, index + 1, summaries[registration.patient_id])
            for index, registration in enumerate(registrations)
            if registration.patient_id in summaries
        ]

    def for_patient(self, patient_id: str) -> dict[str, object]:
        for entry in self.entries():
            if entry["patient_id"] == patient_id:
                return entry
        raise HTTPException(status_code=404, detail="Patient is not in the physician queue")

    @staticmethod
    def _entry(
        registration: PhysicianQueueRegistration,
        position: int,
        summary: ClinicalHistorySummary,
    ) -> dict[str, object]:
        session = interview_service.current(registration.patient_id)
        documents = document_service.list_for_patient(registration.patient_id)
        complaint = summary.sections.get("Chief Complaint", "Not recorded")
        return {
            "patient_id": registration.patient_id,
            "summary_id": summary.id,
            "token": registration.token,
            "display_name": f"Patient {registration.token}",
            "complaint": complaint,
            "department": session.department if session and session.department else "General Medicine",
            "priority": summary.priority,
            "red_flags": [alert.reason for alert in session.alerts] if session else [],
            "document_count": len(documents),
            "summary_status": summary.status,
            "queue_position": position,
            "estimated_wait_minutes": max(5, position * 8),
        }


queue_service = PhysicianQueueService()

