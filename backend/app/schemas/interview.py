from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class QuestionOption(BaseModel):
    value: str
    label: str
    icon: str | None = None


class QuestionResponse(BaseModel):
    id: str
    text: str
    section: str
    input_type: Literal["single_choice", "free_text", "scale"]
    options: list[QuestionOption] = []
    required: bool = True
    source: Literal["ontology", "llm_fallback"] = "ontology"


class InterviewAnswerResponse(BaseModel):
    id: str
    question_id: str
    question_text: str
    section: str
    value: str
    input_mode: str = "touch"
    answered_at: datetime


class RedFlagAlertResponse(BaseModel):
    id: str
    rule_id: str
    reason: str
    priority: Literal["routine", "priority", "urgent"]
    evidence: list[str]
    created_at: datetime


class StartInterviewRequest(BaseModel):
    department: Literal["general_medicine", "ayurveda"] | None = None


class SubmitAnswerRequest(BaseModel):
    question_id: str = Field(min_length=1, max_length=100)
    answer: str = Field(min_length=1, max_length=2000)
    input_mode: Literal["voice", "touch", "text"] = "touch"


class InterviewSessionResponse(BaseModel):
    id: str
    patient_id: str
    preferred_language: str
    department: str | None
    status: Literal["active", "completed"]
    priority: Literal["routine", "priority", "urgent"]
    progress: int
    current_question: QuestionResponse | None
    answers: list[InterviewAnswerResponse]
    alerts: list[RedFlagAlertResponse]
    triage_required: bool
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None
