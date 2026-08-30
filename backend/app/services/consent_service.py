"""Consent storage and policy checks for the local demonstration."""

from threading import RLock

from app.models.consent import ConsentRecord, utc_now
from app.schemas.consent import ConsentChoices

REQUIRED_CONSENTS = frozenset(
    {
        "medical_history",
        "ai_assistance",
        "physician_sharing",
        "privacy_notice",
    }
)


class ConsentService:
    def __init__(self) -> None:
        # This repository is process-local until the database phase is added.
        self._records: dict[str, ConsentRecord] = {}
        self._lock = RLock()

    def get(self, patient_id: str) -> ConsentRecord | None:
        with self._lock:
            return self._records.get(patient_id)

    def save(
        self,
        patient_id: str,
        preferred_language: str,
        choices: ConsentChoices,
    ) -> ConsentRecord:
        values = choices.model_dump()
        now = utc_now()
        with self._lock:
            existing = self._records.get(patient_id)
            if existing:
                existing.preferred_language = preferred_language
                existing.choices = values
                existing.status = "active"
                existing.version += 1
                existing.updated_at = now
                existing.granted_at = now
                existing.revoked_at = None
                return existing

            record = ConsentRecord(
                patient_id=patient_id,
                preferred_language=preferred_language,
                choices=values,
            )
            self._records[patient_id] = record
            return record

    def revoke(self, patient_id: str) -> ConsentRecord | None:
        with self._lock:
            record = self._records.get(patient_id)
            if not record:
                return None
            now = utc_now()
            record.status = "revoked"
            record.version += 1
            record.updated_at = now
            record.revoked_at = now
            return record

    @staticmethod
    def required_granted(record: ConsentRecord | None) -> bool:
        return bool(
            record
            and record.status == "active"
            and all(record.choices.get(key, False) for key in REQUIRED_CONSENTS)
        )


consent_service = ConsentService()
