from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from typing import Literal
from uuid import uuid4

DocumentStatus = Literal["pending", "processing", "done", "failed"]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(slots=True)
class LabValue:
    name: str
    value: float
    unit: str
    reference_low: float
    reference_high: float
    abnormal: bool
    flag: Literal["low", "normal", "high"]


@dataclass(slots=True)
class ExtractedDocumentData:
    document_id: str
    document_type: str
    document_date: date
    facility: str
    diagnoses: list[str]
    medications: list[str]
    investigations: list[str]
    lab_values: list[LabValue]
    raw_summary: str
    extracted_at: datetime = field(default_factory=utc_now)


@dataclass(slots=True)
class UploadedDocument:
    patient_id: str
    original_filename: str
    stored_path: str
    content_type: str
    size_bytes: int
    id: str = field(default_factory=lambda: str(uuid4()))
    status: DocumentStatus = "pending"
    inferred_document_date: date | None = None
    extraction: ExtractedDocumentData | None = None
    error: str | None = None
    uploaded_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
