from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

SummaryStatus = Literal["draft", "confirmed"]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(slots=True)
class ClinicalHistorySummary:
    patient_id: str
    interview_session_id: str
    sections: dict[str, str]
    readbacks: dict[str, str]
    preferred_language: str
    source_document_ids: list[str]
    priority: str
    id: str = field(default_factory=lambda: str(uuid4()))
    status: SummaryStatus = "draft"
    patient_acknowledged_at: datetime | None = None
    confirmed_at: datetime | None = None
    version: int = 1
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
