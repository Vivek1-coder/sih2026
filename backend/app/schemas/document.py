from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel


class LabValueResponse(BaseModel):
    name: str
    value: float
    unit: str
    reference_low: float
    reference_high: float
    abnormal: bool
    flag: Literal["low", "normal", "high"]


class ExtractedDocumentResponse(BaseModel):
    document_type: str
    document_date: date
    facility: str
    diagnoses: list[str]
    medications: list[str]
    investigations: list[str]
    lab_values: list[LabValueResponse]
    raw_summary: str
    extracted_at: datetime


class UploadedDocumentResponse(BaseModel):
    id: str
    original_filename: str
    content_type: str
    size_bytes: int
    status: Literal["pending", "processing", "done", "failed"]
    document_date: date | None
    extraction: ExtractedDocumentResponse | None
    error: str | None
    uploaded_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    documents: list[UploadedDocumentResponse]
