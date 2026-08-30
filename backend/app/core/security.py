"""JWT creation and verification helpers.

Access and refresh tokens deliberately use different secrets so a leaked
access-token key cannot be used to mint a long-lived refresh token.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Literal
from uuid import uuid4

import jwt
from jwt import ExpiredSignatureError, InvalidTokenError

from app.core.config import settings

TokenType = Literal["access", "refresh"]


class TokenValidationError(ValueError):
    """Raised when a JWT is expired, malformed, or has invalid claims."""


def _create_token(
    subject: str,
    token_type: TokenType,
    expires_delta: timedelta,
    additional_claims: dict[str, Any] | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = dict(additional_claims or {})
    payload.update(
        {
            "iss": settings.JWT_ISSUER,
            "aud": settings.JWT_AUDIENCE,
            "sub": subject,
            "type": token_type,
            "jti": str(uuid4()),
            "iat": now,
            "nbf": now,
            "exp": now + expires_delta,
        }
    )
    secret = (
        settings.JWT_ACCESS_SECRET
        if token_type == "access"
        else settings.JWT_REFRESH_SECRET
    )
    return jwt.encode(payload, secret, algorithm=settings.JWT_ALGORITHM)


def create_access_token(
    subject: str,
    additional_claims: dict[str, Any] | None = None,
) -> str:
    return _create_token(
        subject,
        "access",
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        additional_claims,
    )


def create_refresh_token(
    subject: str,
    additional_claims: dict[str, Any] | None = None,
) -> str:
    return _create_token(
        subject,
        "refresh",
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        additional_claims,
    )


def decode_token(token: str, expected_type: TokenType) -> dict[str, Any]:
    secret = (
        settings.JWT_ACCESS_SECRET
        if expected_type == "access"
        else settings.JWT_REFRESH_SECRET
    )
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=[settings.JWT_ALGORITHM],
            audience=settings.JWT_AUDIENCE,
            issuer=settings.JWT_ISSUER,
            options={
                "require": [
                    "iss",
                    "aud",
                    "sub",
                    "type",
                    "jti",
                    "iat",
                    "nbf",
                    "exp",
                ]
            },
        )
    except ExpiredSignatureError as exc:
        raise TokenValidationError("Token has expired") from exc
    except InvalidTokenError as exc:
        raise TokenValidationError("Token is invalid") from exc

    if payload.get("type") != expected_type:
        raise TokenValidationError(f"Expected a {expected_type} token")
    return payload


def verify_access_token(token: str) -> dict[str, Any]:
    return decode_token(token, "access")


def verify_refresh_token(token: str) -> dict[str, Any]:
    return decode_token(token, "refresh")
