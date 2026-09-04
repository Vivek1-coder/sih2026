from threading import RLock

from app.models.abdm import ABDMPushRecord
from app.models.summary import ClinicalHistorySummary
from app.services.queue_service import queue_service


class ABDMService:
    """Demo-only ABDM adapter; it performs no network or identity verification."""

    def __init__(self) -> None:
        self._pushes: dict[str, ABDMPushRecord] = {}
        self._lock = RLock()

    def push(self, summary: ClinicalHistorySummary) -> ABDMPushRecord:
        queue_service.register(summary)
        with self._lock:
            existing = self._pushes.get(summary.id)
            if existing:
                return existing
            record = ABDMPushRecord(summary_id=summary.id, patient_id=summary.patient_id)
            self._pushes[summary.id] = record
            return record

    def for_summary(self, summary_id: str) -> ABDMPushRecord | None:
        with self._lock:
            return self._pushes.get(summary_id)


abdm_service = ABDMService()

