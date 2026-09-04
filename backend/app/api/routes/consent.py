from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from app.api.dependencies import (
    get_current_patient_id,
)

from app.models.consent import ConsentRecord

from app.schemas.consent import (
    ConsentChoices,
    ConsentRecordResponse,
    ConsentRevokeResponse,
    ConsentStatusResponse,
    ConsentUpsertRequest,
)

from app.services.consent_service import (
    consent_service,
)


router = APIRouter(
    prefix="/api/consent",
    tags=["consent"],
)


# ============================================================
# Convert MongoEngine document -> API response
# ============================================================


def consent_response(
    record: ConsentRecord,
) -> ConsentRecordResponse:

    choices = record.choices

    return ConsentRecordResponse(
        id=str(record.id),

        patient_id=record.patient_id,

        preferred_language=(
            record.preferred_language
        ),

        choices=ConsentChoices(
            medical_history=(
                choices.medical_history
            ),

            ai_assistance=(
                choices.ai_assistance
            ),

            document_processing=(
                choices.document_processing
            ),

            physician_sharing=(
                choices.physician_sharing
            ),

            abha_linking=(
                choices.abha_linking
            ),

            privacy_notice=(
                choices.privacy_notice
            ),
        ),

        status=record.status,

        version=record.version,

        required_granted=(
            consent_service.required_granted(
                record
            )
        ),

        granted_at=record.granted_at,

        updated_at=record.updated_at,

        revoked_at=record.revoked_at,
    )


# ============================================================
# CREATE / UPDATE CONSENT
#
# POST /api/consent
# ============================================================


@router.post(
    "",
    response_model=ConsentRecordResponse,
    status_code=status.HTTP_200_OK,
)
def save_consent(
    request: ConsentUpsertRequest,

    patient_id: str = Depends(
        get_current_patient_id
    ),
) -> ConsentRecordResponse:

    record = consent_service.save(
        patient_id=patient_id,

        preferred_language=(
            request.preferred_language
        ),

        choices=request.choices,
    )

    return consent_response(
        record
    )


# ============================================================
# GET CURRENT PATIENT CONSENT
#
# GET /api/consent
# ============================================================


@router.get(
    "",
    response_model=ConsentRecordResponse,
)
def get_consent(
    patient_id: str = Depends(
        get_current_patient_id
    ),
) -> ConsentRecordResponse:

    record = consent_service.get(
        patient_id
    )

    if record is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Consent record not found",
        )

    return consent_response(
        record
    )


# ============================================================
# CONSENT STATUS
#
# GET /api/consent/status
# ============================================================


@router.get(
    "/status",
    response_model=ConsentStatusResponse,
)
def get_consent_status(
    patient_id: str = Depends(
        get_current_patient_id
    ),
) -> ConsentStatusResponse:

    record = consent_service.get(
        patient_id
    )

    return ConsentStatusResponse(
        exists=record is not None,

        active=bool(
            record
            and record.status == "active"
        ),

        required_granted=(
            consent_service.required_granted(
                record
            )
        ),

        preferred_language=(
            record.preferred_language
            if record
            else "en-IN"
        ),
    )


# ============================================================
# REVOKE CONSENT
#
# POST /api/consent/revoke
# ============================================================


@router.post(
    "/revoke",
    response_model=ConsentRevokeResponse,
)
def revoke_consent(
    patient_id: str = Depends(
        get_current_patient_id
    ),
) -> ConsentRevokeResponse:

    record = consent_service.revoke(
        patient_id
    )

    if record is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Consent record not found",
        )

    return ConsentRevokeResponse(
        message="Consent revoked",

        record=consent_response(
            record
        ),
    )


# ============================================================
# DELETE / REVOKE CONSENT
#
# DELETE /api/consent
#
# We intentionally revoke instead of physically deleting
# the consent record.
# ============================================================


@router.delete(
    "",
    response_model=ConsentRevokeResponse,
)
def delete_consent(
    patient_id: str = Depends(
        get_current_patient_id
    ),
) -> ConsentRevokeResponse:

    record = consent_service.revoke(
        patient_id
    )

    if record is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Consent record not found",
        )

    return ConsentRevokeResponse(
        message="Consent revoked",

        record=consent_response(
            record
        ),
    )


# ============================================================
# GET SPECIFIC PATIENT CONSENT
#
# GET /api/consent/{patient_id}
# ============================================================


@router.get(
    "/{requested_patient_id}",
    response_model=ConsentRecordResponse,
)
def get_patient_consent(
    requested_patient_id: str,

    current_patient_id: str = Depends(
        get_current_patient_id
    ),
) -> ConsentRecordResponse:

    if (
        requested_patient_id
        != current_patient_id
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=(
                "Cannot access another patient's consent"
            ),
        )

    record = consent_service.get(
        current_patient_id
    )

    if record is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Consent record not found",
        )

    return consent_response(
        record
    )