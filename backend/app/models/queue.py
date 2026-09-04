from dataclasses import dataclass, field
from datetime import datetime, timezone


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(slots=True)
class PhysicianQueueRegistration:
    patient_id: str
    summary_id: str
    token: str
    registered_at: datetime = field(default_factory=utc_now)

