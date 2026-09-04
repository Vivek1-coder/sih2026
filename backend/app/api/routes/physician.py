from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_current_patient_id
from app.api.routes.abdm import abdm_response
from app.api.routes.documents import document_response
from app.api.routes.interview import session_response
from app.api.routes.summary import summary_response
from app.schemas.physician import (
    PhysicianPatientSummaryResponse,
    PhysicianQueueEntryResponse,
    PhysicianQueueResponse,
)
from app.services.abdm_service import abdm_service
from app.services.document_service import document_service
from app.services.interview_service import interview_service
from app.services.queue_service import queue_service
from app.services.summary_service import summary_service

router = APIRouter(prefix="/api/physician", tags=["physician"])


@router.get("/queue", response_model=PhysicianQueueResponse)
def physician_queue() -> PhysicianQueueResponse:
    # The physician role is intentionally unauthenticated in this mock-only demo.
    # Production must enforce clinician identity and facility-scoped access here.
    return PhysicianQueueResponse(
        patients=[PhysicianQueueEntryResponse.model_validate(entry) for entry in queue_service.entries()]
    )


@router.get("/queue/me", response_model=PhysicianQueueEntryResponse)
def my_queue_status(
    patient_id: str = Depends(get_current_patient_id),
) -> PhysicianQueueEntryResponse:
    return PhysicianQueueEntryResponse.model_validate(queue_service.for_patient(patient_id))


@router.get(
    "/patient/{patient_id}/summary",
    response_model=PhysicianPatientSummaryResponse,
)
def physician_patient_summary(patient_id: str) -> PhysicianPatientSummaryResponse:
    entry = PhysicianQueueEntryResponse.model_validate(queue_service.for_patient(patient_id))
    summary = summary_service.current(patient_id)
    session = interview_service.current(patient_id)
    if not summary or not session:
        raise HTTPException(status_code=404, detail="Consultation data is incomplete")
    push = abdm_service.for_summary(summary.id)
    return PhysicianPatientSummaryResponse(
        queue=entry,
        summary=summary_response(summary),
        interview=session_response(session),
        documents=[
            document_response(document)
            for document in document_service.list_for_patient(patient_id)
        ],
        abdm=abdm_response(push) if push else None,
        metadata={
            "ai_generated": True,
            "requires_physician_confirmation": summary.status != "confirmed",
        },
    )

