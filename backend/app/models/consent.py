from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

ConsentStatus = Literal["active", "revoked"]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(slots=True)
class ConsentRecord:
    patient_id: str
    preferred_language: str
    choices: dict[str, bool]
    id: str = field(default_factory=lambda: str(uuid4()))
    status: ConsentStatus = "active"
    version: int = 1
    granted_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
    revoked_at: datetime | None = None
