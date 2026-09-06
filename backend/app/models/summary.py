from mongoengine import Document, StringField, DictField, ListField, DateTimeField, IntField
from uuid import uuid4
from app.models.interview import utc_now

class ClinicalHistorySummary(Document):
    id = StringField(primary_key=True, default=lambda: str(uuid4()))
    patient_id = StringField(required=True)
    interview_session_id = StringField(required=True, unique=True)
    sections = DictField()
    readbacks = DictField()
    preferred_language = StringField(default="en-IN")
    source_document_ids = ListField(StringField())
    priority = StringField(default="routine")
    status = StringField(choices=["draft", "confirmed"], default="draft")
    patient_acknowledged_at = DateTimeField(null=True)
    confirmed_at = DateTimeField(null=True)
    version = IntField(default=1)
    created_at = DateTimeField(default=utc_now)
    updated_at = DateTimeField(default=utc_now)
    meta = {"collection": "clinical_summaries", "indexes": ["patient_id"]}
