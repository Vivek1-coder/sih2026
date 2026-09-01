"""Authentication routes.

Supports:
- Patient registration
- Password login
- OTP login
- ABHA ID login
- Aadhaar login
- Email/mobile login
- Access-token cookies
- Refresh-token rotation
- Logout
- Current-session retrieval

IMPORTANT:
OTP delivery currently uses a fixed demonstration OTP (123456).
Replace `_send_otp()` with a real SMS/email/ABDM integration before
using this application in production.
"""

from __future__ import annotations

import hmac
import re
import secrets
import time

from datetime import datetime, timezone
from hashlib import sha256, scrypt
from threading import Lock
from typing import Any, Literal

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from mongoengine.errors import (
    NotUniqueError,
    ValidationError as MongoValidationError,
)
from pydantic import BaseModel, Field

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

# Change this import if your file is named differently.
from app.models.user import User

from app.schemas.userSchema import (
    AuthUser,
    LogoutResponse,
    PasswordLoginRequest,
    RefreshRequest,
    RegisterRequest,
    RequestOTPRequest,
    RequestOTPResponse,
    SessionResponse,
    TokenResponse,
    VerifyOTPRequest,
)


router = APIRouter(
    prefix="/api/auth",
    tags=["auth"],
)


# ============================================================
# Request schemas
# ============================================================


IdentifierType = Literal[
    "abha",
    "aadhaar",
    "email_or_phone",
]

class RegisterRequest(BaseModel):
    fullName: str = Field(
        min_length=2,
        max_length=100,
    )

    dateOfBirth: str

    gender: str

    aadhaar: str

    abhaId: str | None = None

    mobile: str

    email: str | None = None

    address: str = Field(
        min_length=3,
        max_length=500,
    )

    state: str = Field(
        min_length=2,
        max_length=100,
    )

    district: str = Field(
        min_length=2,
        max_length=100,
    )

    emergencyContact: str | None = None

    relationship: str | None = None

    password: str = Field(
        # min_length=8,
        # max_length=128,
    )


class PasswordLoginRequest(BaseModel):
    identifier_type: IdentifierType

    identifier: str = Field(
        min_length=1,
        max_length=150,
    )

    password: str = Field(
        # min_length=1,
        # max_length=128,
    )


class OTPRequest(BaseModel):
    identifier_type: IdentifierType

    identifier: str = Field(
        min_length=1,
        max_length=150,
    )

    purpose: Literal["login"] = "login"


class OTPLoginRequest(BaseModel):
    identifier_type: IdentifierType

    identifier: str = Field(
        min_length=1,
        max_length=150,
    )

    otp: str = Field(
        min_length=6,
        max_length=6,
    )


class OTPRequestResponse(BaseModel):
    message: str


# ============================================================
# Password configuration
# ============================================================

# hashlib.scrypt allows secure password hashing without another
# Python dependency.
#
# Argon2id can replace this later if preferred.

SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_DKLEN = 32


# ============================================================
# OTP configuration
# ============================================================

# DEMO ONLY.
#
# Replace this with random OTP generation and a real SMS/email
# provider before production.

DEMO_OTP = "123456"

OTP_EXPIRE_SECONDS = 5 * 60
OTP_MAX_ATTEMPTS = 5


# {
#     user_id: {
#         "hash": "...",
#         "expires_at": 123456,
#         "attempts": 0,
#     }
# }
#
# Process-local for the hackathon/demo.
# Redis should replace this for production.

_otp_store: dict[str, dict[str, Any]] = {}
_otp_lock = Lock()


# ============================================================
# General helpers
# ============================================================


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _hash_refresh_token(token: str) -> str:
    """Store only a SHA-256 fingerprint of the refresh token."""

    return sha256(
        token.encode("utf-8")
    ).hexdigest()


# ============================================================
# Password helpers
# ============================================================


def _validate_password_strength(
    password: str,
) -> None:
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must contain at least 8 characters",
        )

    # if not re.search(r"[A-Z]", password):
    #     raise HTTPException(
    #         status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
    #         detail="Password must contain at least one uppercase letter",
    #     )

    # if not re.search(r"[a-z]", password):
    #     raise HTTPException(
    #         status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
    #         detail="Password must contain at least one lowercase letter",
    #     )

    # if not re.search(r"\d", password):
    #     raise HTTPException(
    #         status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
    #         detail="Password must contain at least one number",
    #     )


def _hash_password(
    password: str,
) -> str:
    """Hash a password using scrypt."""

    salt = secrets.token_bytes(16)

    derived_key = scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        dklen=SCRYPT_DKLEN,
    )

    return (
        f"scrypt$"
        f"{SCRYPT_N}$"
        f"{SCRYPT_R}$"
        f"{SCRYPT_P}$"
        f"{salt.hex()}$"
        f"{derived_key.hex()}"
    )


def _verify_password(
    password: str,
    stored_hash: str,
) -> bool:
    """Verify a supplied password against its stored scrypt hash."""

    try:
        (
            algorithm,
            n,
            r,
            p,
            salt_hex,
            digest_hex,
        ) = stored_hash.split("$")

        if algorithm != "scrypt":
            return False

        derived_key = scrypt(
            password.encode("utf-8"),
            salt=bytes.fromhex(salt_hex),
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=SCRYPT_DKLEN,
        )

        return hmac.compare_digest(
            derived_key.hex(),
            digest_hex,
        )

    except (
        ValueError,
        TypeError,
    ):
        return False


# ============================================================
# Identifier normalization
# ============================================================


def _normalize_aadhaar(
    aadhaar: str,
) -> str:
    value = re.sub(
        r"\D",
        "",
        aadhaar,
    )

    if len(value) != 12:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Aadhaar must contain exactly 12 digits",
        )

    return value


def _normalize_mobile(
    mobile: str,
) -> str:
    value = re.sub(
        r"\D",
        "",
        mobile,
    )

    # Allow +91XXXXXXXXXX
    if (
        len(value) == 12
        and value.startswith("91")
    ):
        value = value[2:]

    if len(value) != 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Mobile number must contain exactly 10 digits",
        )

    return value


def _normalize_abha(
    abha: str,
) -> str:
    value = abha.strip()

    # ABHA address
    if "@" in value:
        return value.lower()

    # ABHA number
    digits = re.sub(
        r"\D",
        "",
        value,
    )

    if len(digits) != 14:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "ABHA must be a 14-digit ABHA number "
                "or a valid ABHA address"
            ),
        )

    return digits


def _normalize_email(
    email: str,
) -> str:
    value = email.strip().lower()

    email_pattern = (
        r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    )

    if not re.match(
        email_pattern,
        value,
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid email address",
        )

    return value


# ============================================================
# User lookup
# ============================================================


def _find_user_by_identifier(
    identifier_type: IdentifierType,
    identifier: str,
) -> User | None:
    """Find a registered user through any supported identifier."""

    if identifier_type == "aadhaar":
        value = _normalize_aadhaar(
            identifier
        )

        return User.objects(
            aadhaar=value
        ).first()

    if identifier_type == "abha":
        value = _normalize_abha(
            identifier
        )

        return User.objects(
            abha_id=value
        ).first()

    if identifier_type == "email_or_phone":

        if "@" in identifier:
            value = _normalize_email(
                identifier
            )

            return User.objects(
                email=value
            ).first()

        value = _normalize_mobile(
            identifier
        )

        return User.objects(
            mobile=value
        ).first()

    return None


# ============================================================
# Auth user / JWT claims
# ============================================================


def _auth_user(
    user: User,
    auth_method: str,
) -> AuthUser:
    return AuthUser(
        id=str(user.id),
        auth_method=auth_method,
        display_name=user.full_name,
        is_mock=False,
    )


def _claims_for(
    user: User,
    auth_method: str,
) -> dict[str, Any]:
    return {
        "auth_method": auth_method,
        "display_name": user.full_name,
        "is_mock": False,
    }


# ============================================================
# Refresh token persistence
# ============================================================


def _store_refresh_token(
    user: User,
    refresh_token: str,
) -> None:
    """Store only a refresh-token hash in MongoDB."""

    try:
        payload = verify_refresh_token(
            refresh_token
        )

    except TokenValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to issue refresh token",
        ) from exc

    user.refresh_token_hash = (
        _hash_refresh_token(
            refresh_token
        )
    )

    user.refresh_token_expires_at = (
        datetime.fromtimestamp(
            int(payload["exp"]),
            tz=timezone.utc,
        )
    )

    user.refresh_token_revoked = False

    user.save()


def _invalidate_refresh_token(
    user: User,
) -> None:
    user.refresh_token_hash = None
    user.refresh_token_expires_at = None
    user.refresh_token_revoked = True

    user.save()


# ============================================================
# Token issuance
# ============================================================


def _issue_token_response(
    user: User,
    auth_method: str,
) -> TokenResponse:
    claims = _claims_for(
        user,
        auth_method,
    )

    access_token = create_access_token(
        str(user.id),
        claims,
    )

    refresh_token = create_refresh_token(
        str(user.id),
        claims,
    )

    # Rotates the previous refresh token.
    _store_refresh_token(
        user,
        refresh_token,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=(
            settings.ACCESS_TOKEN_EXPIRE_MINUTES
            * 60
        ),
        user=_auth_user(
            user,
            auth_method,
        ),
    )


# ============================================================
# Cookie helpers
# ============================================================


def _set_auth_cookies(
    response: Response,
    tokens: TokenResponse,
) -> None:

    shared = {
        "httponly": True,
        "secure": settings.COOKIE_SECURE,
        "samesite": settings.COOKIE_SAMESITE,
        "domain": settings.COOKIE_DOMAIN,
    }

    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=tokens.access_token,
        max_age=(
            settings.ACCESS_TOKEN_EXPIRE_MINUTES
            * 60
        ),
        path="/api",
        **shared,
    )

    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=tokens.refresh_token,
        max_age=(
            settings.REFRESH_TOKEN_EXPIRE_DAYS
            * 24
            * 60
            * 60
        ),
        path="/api/auth",
        **shared,
    )


def _clear_auth_cookies(
    response: Response,
) -> None:

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


# ============================================================
# Refresh helpers
# ============================================================


def _read_refresh_token(
    request: Request,
    body: RefreshRequest | None,
) -> str:

    token = request.cookies.get(
        REFRESH_COOKIE_NAME
    )

    if (
        not token
        and body
        and body.refresh_token
    ):
        token = body.refresh_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required",
        )

    return token


def _get_user_from_refresh_payload(
    payload: dict[str, Any],
) -> User:

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    try:
        user = User.objects(
            id=user_id
        ).first()

    except MongoValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        ) from exc

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    return user


def _validate_stored_refresh_token(
    user: User,
    token: str,
) -> None:

    if user.refresh_token_revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked",
        )

    if not user.refresh_token_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No active refresh session",
        )

    incoming_hash = _hash_refresh_token(
        token
    )

    if not hmac.compare_digest(
        incoming_hash,
        user.refresh_token_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is no longer valid",
        )


# ============================================================
# OTP helpers
# ============================================================


def _otp_hash(
    user_id: str,
    otp: str,
) -> str:
    return hmac.new(
        settings.OTP_SECRET.encode(
            "utf-8"
        ),
        f"{user_id}:{otp}".encode(
            "utf-8"
        ),
        sha256,
    ).hexdigest()


def _send_otp(
    user: User,
    otp: str,
) -> None:
    """
    DEMO OTP provider.

    Replace this function with:
    - SMS provider
    - email provider
    - ABDM integration
    - UIDAI-approved flow

    Do NOT log OTP values in production.
    """

    # For the Phase 1 demo the OTP is:
    # 123456

    # Example future implementation:
    #
    # sms_service.send(
    #     mobile=user.mobile,
    #     message=f"Your OTP is {otp}",
    # )

    pass


def _create_otp(
    user: User,
) -> None:

    otp = DEMO_OTP

    user_id = str(
        user.id
    )

    now = int(
        time.time()
    )

    with _otp_lock:
        _otp_store[user_id] = {
            "hash": _otp_hash(
                user_id,
                otp,
            ),
            "expires_at": (
                now
                + OTP_EXPIRE_SECONDS
            ),
            "attempts": 0,
        }

    _send_otp(
        user,
        otp,
    )


def _verify_otp(
    user: User,
    otp: str,
) -> None:

    user_id = str(
        user.id
    )

    now = int(
        time.time()
    )

    with _otp_lock:

        stored = _otp_store.get(
            user_id
        )

        if not stored:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "OTP was not requested "
                    "or has expired"
                ),
            )

        if (
            stored["expires_at"]
            <= now
        ):
            _otp_store.pop(
                user_id,
                None,
            )

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP has expired",
            )

        if (
            stored["attempts"]
            >= OTP_MAX_ATTEMPTS
        ):
            _otp_store.pop(
                user_id,
                None,
            )

            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    "Too many invalid OTP attempts"
                ),
            )

        incoming_hash = _otp_hash(
            user_id,
            otp,
        )

        if not hmac.compare_digest(
            incoming_hash,
            stored["hash"],
        ):
            stored["attempts"] += 1

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP",
            )

        # OTPs must be single-use.
        _otp_store.pop(
            user_id,
            None,
        )


# ============================================================
# REGISTER
#
# POST /api/auth/register
# ============================================================


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    request: RegisterRequest,
    response: Response,
) -> TokenResponse:
    print("REGISTER ENDPOINT HIT", flush=True)
    print("REQUEST:", request, flush=True)

    aadhaar = _normalize_aadhaar(
        request.aadhaar
    )

    mobile = _normalize_mobile(
        request.mobile
    )

    email = (
        _normalize_email(
            request.email
        )
        if request.email
        else None
    )

    abha_id = (
        _normalize_abha(
            request.abhaId
        )
        if request.abhaId
        else None
    )

    # --------------------------------------------------------
    # Duplicate checks
    # --------------------------------------------------------

    # if User.objects(
    #     aadhaar=aadhaar
    # ).first():
    #     raise HTTPException(
    #         status_code=status.HTTP_409_CONFLICT,
    #         detail=(
    #             "A patient with this Aadhaar "
    #             "is already registered"
    #         ),
    #     )

    # if User.objects(
    #     mobile=mobile
    # ).first():
    #     raise HTTPException(
    #         status_code=status.HTTP_409_CONFLICT,
    #         detail=(
    #             "A patient with this mobile "
    #             "number is already registered"
    #         ),
    #     )

    # if (
    #     email
    #     and User.objects(
    #         email=email
    #     ).first()
    # ):
    #     raise HTTPException(
    #         status_code=status.HTTP_409_CONFLICT,
    #         detail=(
    #             "A patient with this email "
    #             "is already registered"
    #         ),
    #     )

    # if (
    #     abha_id
    #     and User.objects(
    #         abha_id=abha_id
    #     ).first()
    # ):
    #     raise HTTPException(
    #         status_code=status.HTTP_409_CONFLICT,
    #         detail=(
    #             "A patient with this ABHA "
    #             "is already registered"
    #         ),
    #     )

    # --------------------------------------------------------
    # DOB parsing
    # --------------------------------------------------------

    try:
        date_of_birth = (
            datetime.strptime(
                request.dateOfBirth,
                "%Y-%m-%d",
            ).date()
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Date of birth must be "
                "in YYYY-MM-DD format"
            ),
        ) from exc

    if (
        date_of_birth
        > _utc_now().date()
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Date of birth cannot "
                "be in the future"
            ),
        )

    # --------------------------------------------------------
    # Create user
    # --------------------------------------------------------

    user_data = {
        "full_name": request.fullName.strip(),
        "date_of_birth": date_of_birth,
        "gender": request.gender,
        "aadhaar": aadhaar,
        "mobile": mobile,
        "address": request.address.strip(),
        "state": request.state.strip(),
        "district": request.district.strip(),
        "password_hash": _hash_password(request.password),
        "is_active": True,
        "created_at": _utc_now(),
        "updated_at": _utc_now(),
    }

    if email:
        user_data["email"] = email

    if abha_id and abha_id is not None:
        user_data["abha_id"] = abha_id

    if request.emergencyContact:
        user_data["emergency_contact"] = _normalize_mobile(
            request.emergencyContact
        )

    if request.relationship:
        user_data["relationship"] = request.relationship

    user = User(**user_data)
    try:
        user.save()

    # except NotUniqueError as exc:
    #     raise HTTPException(
    #         status_code=status.HTTP_409_CONFLICT,
    #         detail=(
    #             "A user with one of these "
    #             "identifiers already exists"
    #         ),
    #     ) from exc

    except MongoValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    # Automatically authenticate after registration.
    tokens = _issue_token_response(
        user,
        "registration",
    )

    _set_auth_cookies(
        response,
        tokens,
    )

    return tokens


# ============================================================
# PASSWORD LOGIN
#
# POST /api/auth/login/password
# ============================================================


@router.post(
    "/login/password",
    response_model=TokenResponse,
)
def login_with_password(
    request: PasswordLoginRequest,
    response: Response,
) -> TokenResponse:

    user = _find_user_by_identifier(
        request.identifier_type,
        request.identifier,
    )

    # Keep the error generic to reduce account enumeration.
    if (
        not user
        or not _verify_password(
            request.password,
            user.password_hash,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    user.last_login_at = _utc_now()
    user.save()

    tokens = _issue_token_response(
        user,
        request.identifier_type,
    )

    _set_auth_cookies(
        response,
        tokens,
    )

    return tokens


# ============================================================
# REQUEST OTP
#
# POST /api/auth/otp/request
# ============================================================


@router.post(
    "/otp/request",
    response_model=RequestOTPResponse,
)
def request_otp(
    request: RequestOTPRequest,
) -> OTPRequestResponse:

    user = _find_user_by_identifier(
        request.identifier_type,
        request.identifier,
    )

    # Return a generic response to reduce account enumeration.
    if not user:
        return OTPRequestResponse(
            message=(
                "If an account exists, "
                "an OTP has been sent."
            )
        )

    if not user.is_active:
        return OTPRequestResponse(
            message=(
                "If an account exists, "
                "an OTP has been sent."
            )
        )

    _create_otp(
        user
    )

    return OTPRequestResponse(
        message=(
            "OTP sent successfully. "
            "For the current demo use 123456."
        )
    )


# ============================================================
# OTP LOGIN
#
# POST /api/auth/login/otp
# ============================================================


@router.post(
    "/login/otp",
    response_model=TokenResponse,
)
def login_with_otp(
    request: VerifyOTPRequest,
    response: Response,
) -> TokenResponse:

    user = _find_user_by_identifier(
        request.identifier_type,
        request.identifier,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OTP or identifier",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    _verify_otp(
        user,
        request.otp,
    )

    user.last_login_at = _utc_now()

    # If OTP was received on the stored mobile,
    # it can be considered verified for this demo.
    user.mobile_verified = True

    user.save()

    tokens = _issue_token_response(
        user,
        request.identifier_type,
    )

    _set_auth_cookies(
        response,
        tokens,
    )

    return tokens


# ============================================================
# REFRESH SESSION
#
# POST /api/auth/refresh
# ============================================================


@router.post(
    "/refresh",
    response_model=TokenResponse,
)
def refresh_session(
    request: Request,
    response: Response,
    refresh_request: RefreshRequest | None = None,
) -> TokenResponse:

    token = _read_refresh_token(
        request,
        refresh_request,
    )

    try:
        payload = verify_refresh_token(
            token
        )

    except TokenValidationError as exc:

        _clear_auth_cookies(
            response
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    user = _get_user_from_refresh_payload(
        payload
    )

    try:
        _validate_stored_refresh_token(
            user,
            token,
        )

    except HTTPException:

        _clear_auth_cookies(
            response
        )

        raise

    auth_method = payload.get(
        "auth_method",
        "refresh",
    )

    # _issue_token_response() creates a brand new
    # refresh token and replaces the old hash.
    #
    # Therefore refresh-token rotation occurs here.
    tokens = _issue_token_response(
        user,
        auth_method,
    )

    _set_auth_cookies(
        response,
        tokens,
    )

    return tokens


# ============================================================
# LOGOUT
#
# POST /api/auth/logout
# ============================================================


@router.post(
    "/logout",
    response_model=LogoutResponse,
)
def logout(
    request: Request,
    response: Response,
    refresh_request: RefreshRequest | None = None,
) -> LogoutResponse:

    token = request.cookies.get(
        REFRESH_COOKIE_NAME
    )

    if (
        not token
        and refresh_request
        and refresh_request.refresh_token
    ):
        token = (
            refresh_request.refresh_token
        )

    if token:
        try:
            payload = verify_refresh_token(
                token
            )

            user = (
                _get_user_from_refresh_payload(
                    payload
                )
            )

            # Only revoke if the supplied refresh token
            # is actually the user's active refresh token.
            incoming_hash = (
                _hash_refresh_token(
                    token
                )
            )

            if (
                user.refresh_token_hash
                and hmac.compare_digest(
                    incoming_hash,
                    user.refresh_token_hash,
                )
            ):
                _invalidate_refresh_token(
                    user
                )

        except (
            TokenValidationError,
            HTTPException,
            MongoValidationError,
        ):
            # Logout remains idempotent.
            pass

    _clear_auth_cookies(
        response
    )

    return LogoutResponse(
        message="Logged out"
    )


# ============================================================
# CURRENT SESSION
#
# GET /api/auth/me
# ============================================================


@router.get(
    "/me",
    response_model=SessionResponse,
)
def current_session(
    payload: dict[str, Any] = Depends(
        get_current_token_payload
    ),
) -> SessionResponse:

    user_id = payload.get(
        "sub"
    )

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
        )

    try:
        user = User.objects(
            id=user_id
        ).first()

    except MongoValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
        ) from exc

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    auth_method = payload.get(
        "auth_method",
        "session",
    )

    return SessionResponse(
        user=_auth_user(
            user,
            auth_method,
        )
    )