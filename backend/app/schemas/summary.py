from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class SummaryGenerateRequest(BaseModel):
    session_id: str | None = None


class SummaryPatchRequest(BaseModel):
    sections: dict[str, str] | None = None
    status: Literal["draft", "confirmed"] | None = None
    patient_acknowledged: bool | None = None


class ClinicalHistorySummaryResponse(BaseModel):
    id: str
    patient_id: str
    interview_session_id: str
    sections: dict[str, str]
    readbacks: dict[str, str]
    preferred_language: str
    source_document_ids: list[str]
    priority: Literal["routine", "priority", "urgent"]
    status: Literal["draft", "confirmed"]
    patient_acknowledged_at: datetime | None
    confirmed_at: datetime | None
    version: int
    disclaimer: str = Field(
        default=(
            "AI-drafted clinical history. It is not a diagnosis and must be "
            "reviewed and confirmed by a qualified physician."
        )
    )
    created_at: datetime
    updated_at: datetime
