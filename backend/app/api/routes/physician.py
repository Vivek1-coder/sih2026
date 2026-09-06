from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_current_patient_id
from app.api.routes.abdm import abdm_response
from app.api.routes.documents import document_response
from app.api.routes.interview import session_response
from app.api.routes.summary import summary_response, update_summary
from app.schemas.summary import SummaryPatchRequest
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

from app.api.routes.prescriptions import current_doctor

router = APIRouter(prefix="/api/physician", tags=["physician"])


@router.get("/queue", response_model=PhysicianQueueResponse)
def physician_queue(doctor=Depends(current_doctor)) -> PhysicianQueueResponse:
    return PhysicianQueueResponse(
        patients=[PhysicianQueueEntryResponse.model_validate(entry) for entry in queue_service.entries(doctor.id)]
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
def physician_patient_summary(patient_id: str, doctor=Depends(current_doctor)) -> PhysicianPatientSummaryResponse:
    entry = PhysicianQueueEntryResponse.model_validate(queue_service.for_patient(patient_id))
    if entry.doctor_id != doctor.id:
        raise HTTPException(403, "Patient is not assigned to this physician")
    summary = summary_service.get_owned(entry.summary_id, patient_id)
    session = interview_service.get_owned(entry.session_id, patient_id)
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



@router.patch("/summary/{summary_id}")
def physician_update_summary(summary_id: str, body: SummaryPatchRequest, doctor=Depends(current_doctor)):
    return update_summary(summary_id, body, {"sub": doctor.id, "role": "doctor"})
