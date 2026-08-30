from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import get_current_patient_id
from app.models.interview import InterviewSession
from app.schemas.interview import (
    InterviewAnswerResponse,
    InterviewSessionResponse,
    QuestionResponse,
    RedFlagAlertResponse,
    StartInterviewRequest,
    SubmitAnswerRequest,
)
from app.services.consent_service import consent_service
from app.services.interview_engine import interview_engine
from app.services.interview_service import interview_service

router = APIRouter(prefix="/api/interview", tags=["interview"])


def session_response(session: InterviewSession) -> InterviewSessionResponse:
    question: dict[str, Any] | None = None
    if session.current_question_id:
        question = interview_engine.question(session, session.current_question_id)
    return InterviewSessionResponse(
        id=session.id,
        patient_id=session.patient_id,
        preferred_language=session.preferred_language,
        department=session.department,
        status=session.status,
        priority=session.priority,
        progress=interview_engine.progress(session),
        current_question=QuestionResponse.model_validate(question) if question else None,
        answers=[
            InterviewAnswerResponse(
                id=answer.id,
                question_id=answer.question_id,
                question_text=answer.question_text,
                section=answer.section,
                value=answer.value,
                answered_at=answer.answered_at,
            )
            for answer in session.answers
        ],
        alerts=[
            RedFlagAlertResponse(
                id=alert.id,
                rule_id=alert.rule_id,
                reason=alert.reason,
                priority=alert.priority,
                evidence=alert.evidence,
                created_at=alert.created_at,
            )
            for alert in session.alerts
        ],
        triage_required=any(alert.priority == "urgent" for alert in session.alerts),
        created_at=session.created_at,
        updated_at=session.updated_at,
        completed_at=session.completed_at,
    )


def require_consent(patient_id: str) -> None:
    if not consent_service.required_granted(consent_service.get(patient_id)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Required consent must be granted before starting the interview",
        )


@router.post("/session", response_model=InterviewSessionResponse)
def start_interview(
    request: StartInterviewRequest | None = None,
    patient_id: str = Depends(get_current_patient_id),
) -> InterviewSessionResponse:
    require_consent(patient_id)
    consent = consent_service.get(patient_id)
    if consent is None:  # Narrowing for type checkers; require_consent handled it.
        raise HTTPException(status_code=403, detail="Consent required")
    session = interview_service.start_or_resume(
        patient_id,
        consent.preferred_language,
        request.department if request else None,
    )
    return session_response(session)


@router.get("/session/current", response_model=InterviewSessionResponse)
def current_interview(
    patient_id: str = Depends(get_current_patient_id),
) -> InterviewSessionResponse:
    session = interview_service.current(patient_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found",
        )
    return session_response(session)


@router.get("/session/{session_id}", response_model=InterviewSessionResponse)
def get_interview(
    session_id: str,
    patient_id: str = Depends(get_current_patient_id),
) -> InterviewSessionResponse:
    return session_response(interview_service.get_owned(session_id, patient_id))


@router.post(
    "/session/{session_id}/answer",
    response_model=InterviewSessionResponse,
)
def answer_interview_question(
    session_id: str,
    request: SubmitAnswerRequest,
    patient_id: str = Depends(get_current_patient_id),
) -> InterviewSessionResponse:
    require_consent(patient_id)
    session = interview_service.submit_answer(
        session_id,
        patient_id,
        request.question_id,
        request.answer,
    )
    return session_response(session)


@router.post(
    "/session/{session_id}/complete",
    response_model=InterviewSessionResponse,
)
def complete_interview(
    session_id: str,
    patient_id: str = Depends(get_current_patient_id),
) -> InterviewSessionResponse:
    require_consent(patient_id)
    return session_response(interview_service.complete(session_id, patient_id))
