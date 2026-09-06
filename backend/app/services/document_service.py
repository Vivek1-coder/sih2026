"""
DocumentService — MongoDB-backed document storage.

Each uploaded file is:
  1. Stored in Supabase S3 under key  {patient_id}/{uuid}{ext}
  2. Recorded in MongoDB collection   document_records  (DocumentRecord)

The in-memory dict is gone. All reads/writes go through MongoEngine,
so records survive server restarts and scale across multiple workers.
"""

from pathlib import Path
from uuid import uuid4

# Map file extensions to the correct MIME type for browser rendering.
# application/octet-stream triggers a download; these force inline display.
_MIME_BY_SUFFIX: dict[str, str] = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
}


def _canonical_mime(filename: str, declared: str) -> str:
    """Return the correct MIME type for a file.

    If the client sent application/octet-stream (common in Postman / mobile),
    fall back to the extension-derived type so the browser renders inline.
    """
    if declared not in ("application/octet-stream", ""):
        return declared
    return _MIME_BY_SUFFIX.get(Path(filename).suffix.lower(), declared)

import boto3
from botocore.client import Config
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.document_record import (
    DocumentRecord,
    ExtractionDocument,
    LabValueDocument,
)
from app.services.ocr_service import extract_mock_document


# ---------------------------------------------------------------------------
# S3 client factory
# ---------------------------------------------------------------------------

def _s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.SUPABASE_S3_ENDPOINT,
        aws_access_key_id=settings.SUPABASE_S3_ACCESS_KEY_ID,
        aws_secret_access_key=settings.SUPABASE_S3_SECRET_ACCESS_KEY,
        region_name=settings.SUPABASE_S3_REGION,
        config=Config(signature_version="s3v4"),
    )


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class DocumentService:

    # ------------------------------------------------------------------
    # Create — upload to S3 + persist record to MongoDB
    # ------------------------------------------------------------------

    def create(
        self,
        patient_id: str,
        original_filename: str,
        content_type: str,
        content: bytes,
        document_type: str = "other",
        *, uploaded_by_role: str = "patient", uploaded_by_id: str | None = None,
        session_id: str | None = None,
    ) -> DocumentRecord:
        suffix = Path(original_filename).suffix.lower()
        stored_name = f"{patient_id}/{uuid4().hex}{suffix}"
        # Normalise the content type — Postman / some mobile browsers send
        # application/octet-stream even for PDFs and images.
        mime = _canonical_mime(original_filename, content_type)

        # 1. Push bytes to Supabase S3
        _s3_client().put_object(
            Bucket=settings.SUPABASE_S3_BUCKET,
            Key=stored_name,
            Body=content,
            ContentType=mime,
        )

        # 2. Persist metadata to MongoDB
        from app.services.continuity_service import active_visit, audit
        session = active_visit(patient_id)
        record = DocumentRecord(
            uploaded_by_role=uploaded_by_role, uploaded_by_id=uploaded_by_id or patient_id, document_type=document_type,
            session_id=session_id if uploaded_by_role != "patient" else (session.id if session else None),
            patient_id=patient_id,
            original_filename=Path(original_filename).name,
            stored_path=stored_name,
            content_type=mime,
            size_bytes=len(content),
            status="pending",
        )
        record.save()
        audit(patient_id, "document_uploaded", session_id=record.session_id,
              actor_role=record.uploaded_by_role, actor_id=record.uploaded_by_id,
              event_key=f"upload:{record.id}", metadata={"document_id": str(record.id), "document_type": record.document_type})
        return record

    # ------------------------------------------------------------------
    # Process (OCR) — runs as a FastAPI background task
    # ------------------------------------------------------------------

    def process(self, document_id: str) -> None:
        record = DocumentRecord.objects(id=document_id).first()
        if not record or record.status in {"processing", "done"}:
            return

        record.status = "processing"
        record.save()

        try:
            if record.uploaded_by_role == "lab_assistant":
                from app.services.consent_service import consent_service
                consent = consent_service.get(record.patient_id)
                if not consent or consent.status != "active" or not consent.choices.document_processing:
                    raise ValueError("Document-processing consent is no longer active")
            extraction = extract_mock_document(
                str(record.id),
                record.stored_path,
                record.original_filename,
                record.uploaded_at.date(),
            )

            # Map dataclass → embedded MongoEngine document
            embedded = ExtractionDocument(
                document_type=extraction.document_type,
                document_date=extraction.document_date,
                facility=extraction.facility,
                diagnoses=extraction.diagnoses,
                medications=extraction.medications,
                investigations=extraction.investigations,
                lab_values=[
                    LabValueDocument(
                        name=lab.name,
                        value=lab.value,
                        unit=lab.unit,
                        reference_low=lab.reference_low,
                        reference_high=lab.reference_high,
                        abnormal=lab.abnormal,
                        flag=lab.flag,
                    )
                    for lab in extraction.lab_values
                ],
                raw_summary=extraction.raw_summary,
                extracted_at=extraction.extracted_at,
            )

            record.extraction = embedded
            record.inferred_document_date = extraction.document_date
            record.status = "done"
            record.save()
            from app.services.continuity_service import audit
            audit(record.patient_id, "document_processed", session_id=record.session_id, actor_role="system",
                  event_key=f"processed:{record.id}", metadata={"document_id": str(record.id), "uploaded_by_id": record.uploaded_by_id})

        except Exception as exc:  # noqa: BLE001
            record.status = "failed"
            record.error = "Document processing failed. Please contact the care team."
            record.save()
            from app.services.continuity_service import audit
            audit(record.patient_id, "document_processing_failed", session_id=record.session_id, actor_role="system",
                  event_key=f"processing-failed:{record.id}", metadata={"document_id": str(record.id)})

    # ------------------------------------------------------------------
    # Ownership check — raises 404 / 403 on failure
    # ------------------------------------------------------------------

    def get_owned(self, document_id: str, patient_id: str) -> DocumentRecord:
        try:
            record = DocumentRecord.objects(id=document_id).first()
        except Exception:
            raise HTTPException(status_code=404, detail="Document not found")

        if not record:
            raise HTTPException(status_code=404, detail="Document not found")

        if record.patient_id != patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot access another patient's document",
            )
        return record

    # ------------------------------------------------------------------
    # List — all documents for one patient, newest first
    # ------------------------------------------------------------------

    def list_for_patient(self, patient_id: str) -> list[DocumentRecord]:
        records = DocumentRecord.objects(patient_id=patient_id).order_by("-uploaded_at")
        return list(records)

    # ------------------------------------------------------------------
    # Presigned URL — generates a temporary S3 GET URL
    # ------------------------------------------------------------------

    def presigned_url(
        self,
        document_id: str,
        patient_id: str,
        expires_in: int = 3600,
    ) -> str:
        record = self.get_owned(document_id, patient_id)
        # Always resolve to the correct MIME — old records may have octet-stream
        mime = _canonical_mime(record.original_filename, record.content_type)
        url: str = _s3_client().generate_presigned_url(
            "get_object",
            Params={
                "Bucket": settings.SUPABASE_S3_BUCKET,
                "Key": record.stored_path,
                "ResponseContentDisposition": (
                    f'inline; filename="{record.original_filename}"'
                ),
                "ResponseContentType": mime,
            },
            ExpiresIn=expires_in,
        )
        return url

    # ------------------------------------------------------------------
    # Download bytes — proxy route (S3 URL never leaves the server)
    # ------------------------------------------------------------------

    def download_bytes(
        self, document_id: str, patient_id: str
    ) -> tuple[bytes, str, str]:
        record = self.get_owned(document_id, patient_id)
        response = _s3_client().get_object(
            Bucket=settings.SUPABASE_S3_BUCKET,
            Key=record.stored_path,
        )
        content: bytes = response["Body"].read()
        return content, record.content_type, record.original_filename

    # ------------------------------------------------------------------
    # Delete — remove from MongoDB + S3
    # ------------------------------------------------------------------

    def delete(self, document_id: str, patient_id: str) -> None:
        record = self.get_owned(document_id, patient_id)
        stored_path = record.stored_path

        # Remove MongoDB record first; if S3 delete fails the record
        # is already gone so the user won't see a ghost entry.
        record.delete()
        from app.services.continuity_service import audit
        audit(patient_id, "document_deleted", session_id=record.session_id,
              event_key=f"delete:{record.id}", metadata={"document_id": str(record.id)})

        _s3_client().delete_object(
            Bucket=settings.SUPABASE_S3_BUCKET,
            Key=stored_path,
        )


document_service = DocumentService()
