from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import get_current_patient_id, get_current_token_payload
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
    payload: dict = Depends(get_current_token_payload),
) -> ClinicalHistorySummaryResponse:
    from app.models.continuity import DoctorQueueEntry, Doctor
    from app.services.continuity_service import audit
    patient_id = str(payload["sub"])
    role = payload.get("role", "patient")
    if role == "lab_assistant":
        raise HTTPException(403, "Lab staff cannot access clinical summaries")
    if role == "doctor":
        entry = DoctorQueueEntry.objects(summary_id=summary_id, doctor_id=patient_id).first()
        if not entry or not Doctor.objects(pk=patient_id, on_duty=True).first():
            raise HTTPException(403, "Patient is not assigned to this physician")
        patient_id = entry.patient_id
    elif request.status == "confirmed":
        raise HTTPException(403, "Only the assigned physician can confirm a clinical summary")
    require_summary_consent(patient_id)
    summary = summary_service.update(
        summary_id,
        patient_id,
        request.sections,
        request.status,
        request.patient_acknowledged,
    )
    if request.sections is not None or request.status == "confirmed":
        audit(patient_id, "summary_confirmed" if request.status == "confirmed" else "summary_updated",
              session_id=summary.interview_session_id, actor_role=role, actor_id=str(payload["sub"]),
              event_key=f"summary-edit:{summary.id}:{summary.version}", metadata={"kind": "clinical_review"})
    if summary.patient_acknowledged_at:
        queue_service.register(summary)
    return summary_response(summary)


@router.post("/{session_id}/generate", response_model=ClinicalHistorySummaryResponse)
def generate_session_summary(session_id: str, patient_id: str = Depends(get_current_patient_id)):
    require_summary_consent(patient_id)
    return summary_response(summary_service.generate(patient_id, session_id))
