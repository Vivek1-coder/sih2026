from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import get_current_patient_id
from app.models.summary import ClinicalHistorySummary
from app.schemas.summary import (
    ClinicalHistorySummaryResponse,
    SummaryGenerateRequest,
    SummaryPatchRequest,
)
from app.services.consent_service import consent_service
from app.services.queue_service import queue_service
from app.services.summary_service import summary_service

router = APIRouter(prefix="/api/summary", tags=["summary"])


def summary_response(
    summary: ClinicalHistorySummary,
) -> ClinicalHistorySummaryResponse:
    return ClinicalHistorySummaryResponse(
        id=summary.id,
        patient_id=summary.patient_id,
        interview_session_id=summary.interview_session_id,
        sections=summary.sections,
        readbacks=summary.readbacks,
        preferred_language=summary.preferred_language,
        source_document_ids=summary.source_document_ids,
        priority=summary.priority,
        status=summary.status,
        patient_acknowledged_at=summary.patient_acknowledged_at,
        confirmed_at=summary.confirmed_at,
        version=summary.version,
        created_at=summary.created_at,
        updated_at=summary.updated_at,
    )


def require_summary_consent(patient_id: str) -> None:
    consent = consent_service.get(patient_id)
    if not consent_service.required_granted(consent):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Required consent has not been granted",
        )


@router.post("/generate", response_model=ClinicalHistorySummaryResponse)
def generate_summary(
    request: SummaryGenerateRequest | None = None,
    patient_id: str = Depends(get_current_patient_id),
) -> ClinicalHistorySummaryResponse:
    require_summary_consent(patient_id)
    return summary_response(
        summary_service.generate(
            patient_id,
            request.session_id if request else None,
        )
    )


@router.get("/current", response_model=ClinicalHistorySummaryResponse)
def current_summary(
    patient_id: str = Depends(get_current_patient_id),
) -> ClinicalHistorySummaryResponse:
    summary = summary_service.current(patient_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
    return summary_response(summary)


@router.get("/{summary_id}", response_model=ClinicalHistorySummaryResponse)
def get_summary(
    summary_id: str,
    patient_id: str = Depends(get_current_patient_id),
) -> ClinicalHistorySummaryResponse:
    return summary_response(summary_service.get_owned(summary_id, patient_id))


@router.patch("/{summary_id}", response_model=ClinicalHistorySummaryResponse)
def update_summary(
    summary_id: str,
    request: SummaryPatchRequest,
    patient_id: str = Depends(get_current_patient_id),
) -> ClinicalHistorySummaryResponse:
    summary = summary_service.update(
        summary_id,
        patient_id,
        request.sections,
        request.status,
        request.patient_acknowledged,
    )
    if summary.patient_acknowledged_at:
        queue_service.register(summary)
    return summary_response(summary)
