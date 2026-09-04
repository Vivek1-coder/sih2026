from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import uuid4


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(slots=True)
class ABDMPushRecord:
    summary_id: str
    patient_id: str
    bundle_id: str = field(
        default_factory=lambda: f"Bundle/mock-{uuid4().hex}"
    )
    status: str = "accepted"
    pushed_at: datetime = field(default_factory=utc_now)

