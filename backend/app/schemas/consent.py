from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ConsentChoices(BaseModel):
    medical_history: bool = False

    ai_assistance: bool = False

    document_processing: bool = False

    physician_sharing: bool = False

    abha_linking: bool = False

    privacy_notice: bool = False


class ConsentUpsertRequest(BaseModel):
    preferred_language: str = Field(
        default="en-IN",
        min_length=2,
        max_length=20,
    )

    choices: ConsentChoices


class ConsentRecordResponse(BaseModel):
    id: str

    patient_id: str

    preferred_language: str

    choices: ConsentChoices

    status: Literal[
        "active",
        "revoked",
    ]

    version: int

    required_granted: bool

    granted_at: datetime

    updated_at: datetime

    revoked_at: datetime | None


class ConsentStatusResponse(BaseModel):
    exists: bool

    active: bool

    required_granted: bool

    preferred_language: str


class ConsentRevokeResponse(BaseModel):
    message: str

    record: ConsentRecordResponse