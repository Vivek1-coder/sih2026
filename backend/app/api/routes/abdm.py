from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_patient_id
from app.models.abdm import ABDMPushRecord
from app.schemas.abdm import ABDMPushResponse
from app.services.abdm_service import abdm_service
from app.services.summary_service import summary_service

router = APIRouter(prefix="/api/abdm", tags=["abdm"])


def abdm_response(record: ABDMPushRecord) -> ABDMPushResponse:
    return ABDMPushResponse(
        summary_id=record.summary_id,
        bundle_id=record.bundle_id,
        status=record.status,
        pushed_at=record.pushed_at,
        mock=True,
    )


@router.post("/push/{summary_id}", response_model=ABDMPushResponse)
def push_summary_to_abdm(
    summary_id: str,
    patient_id: str = Depends(get_current_patient_id),
) -> ABDMPushResponse:
    # MOCK: the demo never sends health data outside this process. A production
    # adapter must validate an ABDM consent artefact and submit a signed FHIR bundle.
    summary = summary_service.get_owned(summary_id, patient_id)
    return abdm_response(abdm_service.push(summary))

