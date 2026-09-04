from datetime import datetime, timezone

from mongoengine import (
    BooleanField,
    DateTimeField,
    Document,
    EmbeddedDocument,
    EmbeddedDocumentField,
    IntField,
    StringField,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ConsentChoicesDocument(EmbeddedDocument):
    medical_history = BooleanField(
        required=True,
        default=False,
    )

    ai_assistance = BooleanField(
        required=True,
        default=False,
    )

    document_processing = BooleanField(
        required=True,
        default=False,
    )

    physician_sharing = BooleanField(
        required=True,
        default=False,
    )

    abha_linking = BooleanField(
        required=True,
        default=False,
    )

    privacy_notice = BooleanField(
        required=True,
        default=False,
    )


class ConsentRecord(Document):
    """
    Stores the latest consent state for one patient.

    One patient has one consent document.
    Every consent update increments `version`.
    """

    patient_id = StringField(
        required=True,
        unique=True,
    )

    preferred_language = StringField(
        required=True,
        default="en-IN",
        max_length=20,
    )

    choices = EmbeddedDocumentField(
        ConsentChoicesDocument,
        required=True,
    )

    status = StringField(
        required=True,
        choices=["active", "revoked"],
        default="active",
    )

    version = IntField(
        required=True,
        default=1,
        min_value=1,
    )

    granted_at = DateTimeField(
        required=True,
        default=utc_now,
    )

    updated_at = DateTimeField(
        required=True,
        default=utc_now,
    )

    revoked_at = DateTimeField(
        required=False,
        null=True,
    )

    meta = {
        "collection": "patient_consents",
        "indexes": [
            {
                "fields": ["patient_id"],
                "unique": True,
            },
            "status",
            "-updated_at",
        ],
    }