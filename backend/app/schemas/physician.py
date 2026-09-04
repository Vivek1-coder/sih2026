from typing import Any, Literal

from pydantic import BaseModel

from app.schemas.abdm import ABDMPushResponse
from app.schemas.document import UploadedDocumentResponse
from app.schemas.interview import InterviewSessionResponse
from app.schemas.summary import ClinicalHistorySummaryResponse


class PhysicianQueueEntryResponse(BaseModel):
    patient_id: str
    summary_id: str
    token: str
    display_name: str
    complaint: str
    department: str
    priority: Literal["routine", "priority", "urgent"]
    red_flags: list[str]
    document_count: int
    summary_status: str
    queue_position: int
    estimated_wait_minutes: int


class PhysicianQueueResponse(BaseModel):
    patients: list[PhysicianQueueEntryResponse]


class PhysicianPatientSummaryResponse(BaseModel):
    queue: PhysicianQueueEntryResponse
    summary: ClinicalHistorySummaryResponse
    interview: InterviewSessionResponse
    documents: list[UploadedDocumentResponse]
    abdm: ABDMPushResponse | None = None
    metadata: dict[str, Any]

