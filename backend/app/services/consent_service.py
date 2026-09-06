from datetime import datetime, timezone

from mongoengine.errors import (
    NotUniqueError,
    ValidationError as MongoValidationError,
)

from app.models.consent import (
    ConsentChoicesDocument,
    ConsentRecord,
)

from app.schemas.consent import ConsentChoices


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ConsentService:

    # ======================================================
    # Required permissions
    # ======================================================

    REQUIRED_PERMISSIONS = (
        "medical_history",
        "ai_assistance",
        "physician_sharing",
        "privacy_notice",
    )

    # ======================================================
    # Get Consent
    # ======================================================

    def get(
        self,
        patient_id: str,
    ) -> ConsentRecord | None:
        """
        Fetch patient's consent directly from MongoDB.
        """

        if not patient_id:
            return None

        return ConsentRecord.objects(
            patient_id=patient_id,
        ).first()

    # ======================================================
    # Required Granted
    # ======================================================

    def required_granted(
        self,
        record: ConsentRecord | None,
    ) -> bool:
        """
        Check whether all required permissions
        have been granted.

        A revoked consent is never considered granted.
        """

        if record is None:
            return False

        if record.status != "active":
            return False

        choices = record.choices

        if choices is None:
            return False

        return all(
            getattr(
                choices,
                permission,
                False,
            )
            for permission
            in self.REQUIRED_PERMISSIONS
        )

    # ======================================================
    # Save / Update Consent
    # ======================================================

    def save(
        self,
        patient_id: str,
        preferred_language: str,
        choices: ConsentChoices,
    ) -> ConsentRecord:
        """
        Create or update patient consent.

        If consent already exists:
        - update choices
        - increment version
        - reactivate consent
        - clear revoked_at

        If it does not exist:
        - create version 1
        """

        now = utc_now()

        choices_document = (
            ConsentChoicesDocument(
                **choices.model_dump()
            )
        )

        existing = self.get(
            patient_id
        )

        # --------------------------------------------------
        # Create
        # --------------------------------------------------

        if existing is None:
            record = ConsentRecord(
                patient_id=patient_id,

                preferred_language=(
                    preferred_language
                ),

                choices=choices_document,

                status="active",

                version=1,

                granted_at=now,

                updated_at=now,

                revoked_at=None,
            )

            try:
                record.save()

            except NotUniqueError:
                # Another request may have created
                # the consent simultaneously.
                existing = self.get(
                    patient_id
                )

                if existing is None:
                    raise

                return self._update_existing(
                    existing,
                    preferred_language,
                    choices_document,
                    now,
                )

            self._audit(record)
            return record

        # --------------------------------------------------
        # Update
        # --------------------------------------------------

        return self._update_existing(
            existing,
            preferred_language,
            choices_document,
            now,
        )

    # ======================================================
    # Update Existing
    # ======================================================

    def _update_existing(
        self,
        record: ConsentRecord,
        preferred_language: str,
        choices: ConsentChoicesDocument,
        now: datetime,
    ) -> ConsentRecord:

        record.preferred_language = (
            preferred_language
        )

        record.choices = choices

        record.status = "active"

        record.version += 1

        # This represents when this new consent
        # version was granted.
        record.granted_at = now

        record.updated_at = now

        record.revoked_at = None

        record.save()
        self._audit(record)
        return record

    @staticmethod
    def _audit(record):
        from app.services.continuity_service import active_visit, audit
        session = active_visit(record.patient_id)
        audit(record.patient_id, "consent_updated", session_id=session.id if session else None,
              event_key=f"consent:{record.id}:{record.version}",
              metadata={"version": record.version, "choices": record.choices.to_mongo().to_dict()})

    # ======================================================
    # Revoke Consent
    # ======================================================

    def capture_document_authorization(self, patient_id: str, actor_id: str) -> ConsentRecord:
        """Lab attestation records document permission only; it never grants AI/clinical consent."""
        from app.services.continuity_service import audit
        consent = self.get(patient_id)
        if consent and consent.status == "active" and consent.choices.document_processing:
            return consent
        choices = consent.choices if consent and consent.status == "active" else ConsentChoicesDocument()
        choices.document_processing = True
        now = utc_now()
        if consent:
            updated = ConsentRecord.objects(pk=consent.pk, version=consent.version, status=consent.status).modify(
                new=True, set__choices=choices, set__status="active", set__revoked_at=None,
                set__updated_at=now, set__granted_at=now, inc__version=1)
            if not updated:
                from fastapi import HTTPException
                raise HTTPException(409, "Consent changed. Verify patient authorization again.")
            consent = updated
        else:
            try:
                consent = ConsentRecord(patient_id=patient_id, choices=choices, status="active", version=1,
                                        granted_at=now, updated_at=now).save(force_insert=True)
            except NotUniqueError:
                from fastapi import HTTPException
                raise HTTPException(409, "Consent changed. Verify patient authorization again.")
        audit(patient_id, "consent_updated", actor_role="lab_assistant", actor_id=actor_id,
              event_key=f"consent:{consent.id}:{consent.version}",
              metadata={"document_processing": True, "patient_authorization_attested": True})
        return consent

    def revoke(
        self,
        patient_id: str,
    ) -> ConsentRecord | None:
        """
        Revoke patient's active consent.

        The record is NOT deleted because keeping
        the consent history/state is useful for auditing.
        """

        record = self.get(
            patient_id
        )

        if record is None:
            return None

        # Make revoke idempotent.
        if record.status == "revoked":
            return record

        now = utc_now()

        record.status = "revoked"

        record.revoked_at = now

        record.updated_at = now

        record.version += 1

        record.save()
        from app.services.continuity_service import audit
        audit(patient_id, "consent_revoked", event_key=f"consent:{record.id}:{record.version}")
        return record


consent_service = ConsentService()