from typing import Any

from fastapi import HTTPException, Request, status

from app.core.security import TokenValidationError, verify_access_token

ACCESS_COOKIE_NAME = "medikiosk_access"
REFRESH_COOKIE_NAME = "medikiosk_refresh"


def get_current_token_payload(request: Request) -> dict[str, Any]:
    """Read an access JWT from its httpOnly cookie or a Bearer header."""

    token = request.cookies.get(ACCESS_COOKIE_NAME)
    authorization = request.headers.get("Authorization", "")
    if not token and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        return verify_access_token(token)
    except TokenValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def get_current_patient_id(request: Request) -> str:
    """Return the authenticated patient subject from the access token."""

    payload = get_current_token_payload(request)
    if payload.get("role") == "lab_assistant":
        raise HTTPException(403, "Lab staff must use the lab workflow")
    return str(payload["sub"])


def get_current_lab_assistant():
    """Fixed desk identity for the account-free prototype."""
    from app.services.prototype_staff import LAB_ASSISTANT
    return LAB_ASSISTANT
