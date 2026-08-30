# app/api/routes/profile.py

from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from mongoengine.errors import ValidationError as MongoValidationError

from app.api.dependencies import get_current_token_payload
from app.models.user import User
from app.schemas.userSchema import UserResponse


router = APIRouter(
    prefix="/api/profile",
    tags=["profile"],
)


@router.get(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
)
def fetch_profile(
    payload: dict[str, Any] = Depends(
        get_current_token_payload,
    ),
) -> UserResponse:
    """
    Fetch the complete profile of the currently
    authenticated patient.

    The user ID is taken from the access-token `sub` claim.
    The frontend does not send a user ID manually.
    """

    # ------------------------------------------------------
    # Get user ID from JWT
    # ------------------------------------------------------

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )

    # ------------------------------------------------------
    # Fetch user from MongoDB
    # ------------------------------------------------------

    try:
        user = User.objects(
            id=user_id,
        ).first()

    except MongoValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identifier",
        ) from exc

    if not user:
        print("patient profile not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found",
        )

    # ------------------------------------------------------
    # Check account status
    # ------------------------------------------------------

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient account is disabled",
        )

    # ------------------------------------------------------
    # Return profile
    # ------------------------------------------------------

    return UserResponse(
        id=str(user.id),
        full_name=user.full_name,
        date_of_birth=user.date_of_birth,
        gender=user.gender,
        # Don't expose full Aadhaar to frontend.
        aadhaar=_mask_aadhaar(
            user.aadhaar,
        ),
        abha_id=user.abha_id,
        mobile=user.mobile,
        email=user.email,
        address=user.address,
        state=user.state,
        district=user.district,
        emergency_contact=user.emergency_contact,
        emergency_contact_relationship=user.relationship,
        is_active=user.is_active,
        is_verified=user.is_verified,
        mobile_verified=user.mobile_verified,
        email_verified=user.email_verified,
        aadhaar_verified=user.aadhaar_verified,
        abha_verified=user.abha_verified,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_login_at=user.last_login_at,
    )


def _mask_aadhaar(
    aadhaar: str | None,
) -> str | None:
    """
    Never return the full Aadhaar number to the frontend.

    Example:
        123456789012
            ↓
        XXXX-XXXX-9012
    """

    if not aadhaar:
        return None

    digits = "".join(
        character
        for character in aadhaar
        if character.isdigit()
    )

    if len(digits) != 12:
        return "XXXX-XXXX-XXXX"

    return f"XXXX-XXXX-{digits[-4:]}"