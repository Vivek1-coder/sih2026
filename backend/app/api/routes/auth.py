"""Authentication routes for the Phase 1 demonstration.

ABHA and Aadhaar branches in this module are MOCKS. They do not call ABDM,
UIDAI, an OTP provider, or any identity-verification service, and they never
persist the supplied identifier.
"""

from hashlib import sha256
import hmac
from threading import Lock
import time
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.api.dependencies import (
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    get_current_token_payload,
)
from app.core.config import settings
from app.core.security import (
    TokenValidationError,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
)
from app.schemas.userSchema import (
    AuthUser,
    LoginRequest,
    LogoutResponse,
    RefreshRequest,
    SessionResponse,
    TokenResponse,
    VerifyOTPRequest,
    VerifyOTPResponse,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Phase 1 has no persistence layer. Revoked refresh-token JTIs are therefore
# process-local and reset when this mock API restarts. A database/Redis-backed
# token family should replace this store before production use.
_revoked_refresh_tokens: dict[str, int] = {}
_revocation_lock = Lock()


def _mock_user(login: LoginRequest) -> AuthUser:
    """Create an opaque demo identity without storing ABHA/Aadhaar data."""

    if login.auth_method == "guest":
        return AuthUser(
            id=f"guest_{uuid4().hex}",
            auth_method="guest",
            display_name=(login.full_name or "Guest patient").strip()
            or "Guest patient",
        )

    # This HMAC is only a stable demo pseudonym. It is not verification and the
    # original identifier is not placed in either token or server-side storage.
    mock_identifier = login.identifier or f"default-{login.auth_method}"
    digest = hmac.new(
        settings.OTP_SECRET.encode("utf-8"),
        mock_identifier.strip().lower().encode("utf-8"),
        sha256,
    ).hexdigest()[:20]
    label = (
        "ABHA demo patient"
        if login.auth_method == "abha_mock"
        else "Aadhaar demo patient"
    )
    return AuthUser(
        id=f"{login.auth_method}_{digest}",
        auth_method=login.auth_method,
        display_name=label,
    )


def _claims_for(user: AuthUser) -> dict[str, Any]:
    return {
        "auth_method": user.auth_method,
        "display_name": user.display_name,
        "is_mock": True,
    }


def _issue_token_response(user: AuthUser) -> TokenResponse:
    claims = _claims_for(user)
    return TokenResponse(
        access_token=create_access_token(user.id, claims),
        refresh_token=create_refresh_token(user.id, claims),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user,
    )


def _set_auth_cookies(response: Response, tokens: TokenResponse) -> None:
    shared = {
        "httponly": True,
        "secure": settings.COOKIE_SECURE,
        "samesite": settings.COOKIE_SAMESITE,
        "domain": settings.COOKIE_DOMAIN,
    }
    response.set_cookie(
        ACCESS_COOKIE_NAME,
        tokens.access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/api",
        **shared,
    )
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        tokens.refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/auth",
        **shared,
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(
        ACCESS_COOKIE_NAME,
        path="/api",
        domain=settings.COOKIE_DOMAIN,
        secure=settings.COOKIE_SECURE,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
    )
    response.delete_cookie(
        REFRESH_COOKIE_NAME,
        path="/api/auth",
        domain=settings.COOKIE_DOMAIN,
        secure=settings.COOKIE_SECURE,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
    )


def _user_from_claims(payload: dict[str, Any]) -> AuthUser:
    try:
        return AuthUser(
            id=payload["sub"],
            auth_method=payload["auth_method"],
            display_name=payload["display_name"],
            is_mock=payload.get("is_mock", True),
        )
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is missing user claims",
        ) from exc


def _revoke_once(payload: dict[str, Any]) -> None:
    now = int(time.time())
    jti = payload["jti"]
    with _revocation_lock:
        expired = [
            key
            for key, expiry in _revoked_refresh_tokens.items()
            if expiry <= now
        ]
        for key in expired:
            _revoked_refresh_tokens.pop(key, None)
        if jti in _revoked_refresh_tokens:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has already been used",
            )
        _revoked_refresh_tokens[jti] = int(payload["exp"])


def _read_refresh_token(request: Request, body: RefreshRequest | None) -> str:
    token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not token and body:
        token = body.refresh_token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required",
        )
    return token


@router.post("/login", response_model=TokenResponse)
def login(login_request: LoginRequest, response: Response) -> TokenResponse:
    """Issue a demo session for the selected MOCK identity path."""

    user = _mock_user(login_request)
    tokens = _issue_token_response(user)
    _set_auth_cookies(response, tokens)
    return tokens


@router.post("/refresh", response_model=TokenResponse)
def refresh_session(
    request: Request,
    response: Response,
    refresh_request: RefreshRequest | None = None,
) -> TokenResponse:
    token = _read_refresh_token(request, refresh_request)
    try:
        payload = verify_refresh_token(token)
    except TokenValidationError as exc:
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    # Rotation makes each refresh token single-use for this running mock API.
    _revoke_once(payload)
    tokens = _issue_token_response(_user_from_claims(payload))
    _set_auth_cookies(response, tokens)
    return tokens


@router.post("/logout", response_model=LogoutResponse)
def logout(
    request: Request,
    response: Response,
    refresh_request: RefreshRequest | None = None,
) -> LogoutResponse:
    token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not token and refresh_request:
        token = refresh_request.refresh_token
    if token:
        try:
            _revoke_once(verify_refresh_token(token))
        except (TokenValidationError, HTTPException):
            # Logout is idempotent: clear cookies for invalid/rotated tokens too.
            pass
    _clear_auth_cookies(response)
    return LogoutResponse(message="Logged out")


@router.get("/me", response_model=SessionResponse)
def current_session(
    payload: dict[str, Any] = Depends(get_current_token_payload),
) -> SessionResponse:
    return SessionResponse(user=_user_from_claims(payload))


@router.post("/otp/verify", response_model=VerifyOTPResponse)
def verify_mock_otp(request: VerifyOTPRequest) -> VerifyOTPResponse:
    # MOCK ONLY: 123456 is a fixed demonstration OTP. No SMS, UIDAI, or ABDM
    # verification occurs here.
    if request.otp != "123456":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid mock OTP",
        )
    return VerifyOTPResponse(verified=True)
