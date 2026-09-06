"""MongoDB-backed interview session models.

All three classes are stored in the ``interview_sessions`` collection:
- ``InterviewAnswer``  — EmbeddedDocument (subdoc inside session)
- ``RedFlagAlert``     — EmbeddedDocument (subdoc inside session)
- ``InterviewSession`` — Document (one per patient-visit, collection root)

The public attribute names match the old dataclass fields exactly so the
rest of the codebase (interview_service, interview_engine, red_flag_detector,
schemas) requires no changes.
"""

from datetime import datetime, timezone
from uuid import uuid4

from mongoengine import (
    DateTimeField,
    Document,
    EmbeddedDocument,
    EmbeddedDocumentListField,
    ListField,
    StringField,
)

InterviewStatus = str  # "active" | "completed"
PriorityLevel = str  # "routine" | "priority" | "urgent"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class InterviewAnswer(EmbeddedDocument):
    """One patient answer to one interview question."""

    # Kept for backward compatibility with serialisation code that reads .id
    id = StringField(default=lambda: str(uuid4()))
    session_id = StringField(required=True)
    question_id = StringField(required=True)
    question_text = StringField(required=True)
    section = StringField(required=True)
    value = StringField(required=True)
    input_mode = StringField(default="touch")
    answered_at = DateTimeField(default=utc_now)

    meta = {"allow_inheritance": False}


class RedFlagAlert(EmbeddedDocument):
    """A clinical red-flag fired by the deterministic detector."""

    id = StringField(default=lambda: str(uuid4()))
    session_id = StringField(required=True)
    rule_id = StringField(required=True)
    reason = StringField(required=True)
    priority = StringField(
        required=True,
        choices=["routine", "priority", "urgent"],
        default="routine",
    )
    evidence = ListField(StringField())
    created_at = DateTimeField(default=utc_now)

    meta = {"allow_inheritance": False}


class InterviewSession(Document):
    """One interview session for one patient visit.

    Collection: ``interview_sessions``
    Primary key: UUID string (stored as MongoDB ``_id``).
    """

    # Use a UUID string as the MongoDB _id so session.id == session.pk always.
    id = StringField(primary_key=True, default=lambda: str(uuid4()))

    patient_id = StringField(required=True)
    preferred_language = StringField(required=True, default="en-IN")
    department = StringField(null=True)
    location = StringField(default="")
    location_type = StringField(choices=["on_site", "remote", "other"], default="other")
    visit_status = StringField(choices=["in_progress", "completed", "abandoned"], default="in_progress")
    step = StringField(default="consent", choices=["consent", "interview", "triage-alert", "documents", "summary", "complete"])
    resumed_from_session_id = StringField(null=True)
    assigned_doctor_id = StringField(null=True)
    queue_entry_id = StringField(null=True)
    current_question_id = StringField(null=True)

    status = StringField(
        required=True,
        choices=["active", "completed"],
        default="active",
    )
    priority = StringField(
        required=True,
        choices=["routine", "priority", "urgent"],
        default="routine",
    )

    answers = EmbeddedDocumentListField(InterviewAnswer)
    alerts = EmbeddedDocumentListField(RedFlagAlert)

    created_at = DateTimeField(default=utc_now)
    updated_at = DateTimeField(default=utc_now)
    completed_at = DateTimeField(null=True)

    meta = {
        "collection": "interview_sessions",
        "indexes": [
            # Fast lookup: current active session per patient
            {"fields": ["patient_id", "status"]},
            # Most-recent-first ordering
            {"fields": ["-created_at"]},
            # Physician query: sessions by patient ordered by date
            {"fields": ["patient_id", "-created_at"]},
        ],
    }
