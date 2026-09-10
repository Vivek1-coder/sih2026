"""
MongoEngine model for persisting uploaded document records.

Each document maps to one patient (via patient_id = User.id string).
The S3 object key is stored in stored_path; files are never deleted
from S3 unless explicitly requested.

Extraction data (OCR output) is stored as an embedded document so
the full record — including lab values — survives server restarts.
"""

from datetime import datetime, timezone

from mongoengine import (
    BooleanField,
    DateField,
    DateTimeField,
    Document,
    EmbeddedDocument,
    EmbeddedDocumentField,
    EmbeddedDocumentListField,
    FloatField,
    ListField,
    StringField,
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Embedded: single lab value
# ---------------------------------------------------------------------------

class LabValueDocument(EmbeddedDocument):
    name = StringField(required=True)
    value = FloatField(required=True)
    unit = StringField(required=True, default="")
    reference_low = FloatField(required=True)
    reference_high = FloatField(required=True)
    abnormal = BooleanField(required=True, default=False)
    flag = StringField(required=True, choices=["low", "normal", "high"], default="normal")


# ---------------------------------------------------------------------------
# Embedded: full OCR extraction result
# ---------------------------------------------------------------------------

class ExtractionDocument(EmbeddedDocument):
    document_type = StringField(required=True)
    document_date = DateField(required=True)
    facility = StringField(required=True, default="")
    diagnoses = ListField(StringField(), default=list)
    medications = ListField(StringField(), default=list)
    investigations = ListField(StringField(), default=list)
    lab_values = EmbeddedDocumentListField(LabValueDocument, default=list)
    raw_summary = StringField(required=True, default="")
    extracted_at = DateTimeField(required=True, default=_utc_now)


# ---------------------------------------------------------------------------
# Top-level document record
# ---------------------------------------------------------------------------

class DocumentRecord(Document):
    """
    One record per uploaded file, linked to a patient by patient_id.

    stored_path  — S3 object key: "{patient_id}/{uuid}{ext}"
    status       — lifecycle: pending → processing → done | failed
    extraction   — populated after OCR completes (may be null)
    """

    # Who owns this document
    patient_id = StringField(required=True)

    uploaded_by_role = StringField(choices=["patient", "lab_assistant", "doctor", "system"], default="system")
    uploaded_by_id = StringField(null=True)
    session_id = StringField(null=True)
    document_type = StringField(choices=["lab_report", "prescription", "other"], default="other")

    # Original filename as supplied by the browser
    original_filename = StringField(required=True, max_length=500)

    # S3 object key used to retrieve / delete the file
    stored_path = StringField(required=True)

    content_type = StringField(required=True)
    size_bytes = FloatField(required=True)  # FloatField handles large ints safely

    processing_stage = StringField(default="processing", choices=["processing", "extracting", "done", "failed"])
    status = StringField(
        required=True,
        choices=["pending", "processing", "done", "failed"],
        default="pending",
    )

    # Populated from the extraction result; also stored separately
    # so the list endpoint can sort without loading the full extraction.
    inferred_document_date = DateField(required=False, null=True)

    # Full OCR output — null until processing completes
    extraction = EmbeddedDocumentField(ExtractionDocument, required=False, null=True)

    error = StringField(required=False, null=True)

    uploaded_at = DateTimeField(required=True, default=_utc_now)
    updated_at = DateTimeField(required=True, default=_utc_now)

    meta = {
        "collection": "document_records",
        "indexes": [
            "patient_id",
            "-uploaded_at",
            ("patient_id", "-uploaded_at"),
        ],
        "ordering": ["-uploaded_at"],
    }

    def save(self, *args, **kwargs):
        self.updated_at = _utc_now()
        return super().save(*args, **kwargs)
