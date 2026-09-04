from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

InterviewStatus = Literal["active", "completed"]
PriorityLevel = Literal["routine", "priority", "urgent"]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(slots=True)
class InterviewAnswer:
    session_id: str
    question_id: str
    question_text: str
    section: str
    value: str
    id: str = field(default_factory=lambda: str(uuid4()))
    answered_at: datetime = field(default_factory=utc_now)


@dataclass(slots=True)
class RedFlagAlert:
    session_id: str
    rule_id: str
    reason: str
    priority: PriorityLevel
    evidence: list[str]
    id: str = field(default_factory=lambda: str(uuid4()))
    created_at: datetime = field(default_factory=utc_now)


@dataclass(slots=True)
class InterviewSession:
    patient_id: str
    preferred_language: str
    current_question_id: str | None
    department: str | None = None
    id: str = field(default_factory=lambda: str(uuid4()))
    status: InterviewStatus = "active"
    priority: PriorityLevel = "routine"
    answers: list[InterviewAnswer] = field(default_factory=list)
    alerts: list[RedFlagAlert] = field(default_factory=list)
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
    completed_at: datetime | None = None
