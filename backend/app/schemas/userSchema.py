from datetime import date
from typing import Literal

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)


# ============================================================
# Shared Types
# ============================================================

IdentifierType = Literal[
    "abha",
    "aadhaar",
    "email_or_phone",
]

AuthMethod = Literal[
    "abha",
    "aadhaar",
    "email_or_phone",
    "registration",
    "refresh",
    "session",
]


# ============================================================
# Registration
# ============================================================


class RegisterRequest(BaseModel):
    full_name: str = Field(
        min_length=2,
        max_length=100,
    )

    date_of_birth: date

    gender: Literal[
        "Female",
        "Male",
        "Other",
        "Prefer not to say",
    ]

    # Required
    aadhaar: str = Field(
        min_length=12,
        max_length=20,
    )

    # Optional
    abha_id: str | None = Field(
        default=None,
        max_length=100,
    )

    mobile: str = Field(
        min_length=10,
        max_length=15,
    )

    email: EmailStr | None = None

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

    emergency_contact: str | None = Field(
        default=None,
        max_length=15,
    )

    emergency_contact_relationship: (
        Literal[
            "Parent",
            "Spouse",
            "Sibling",
            "Child",
            "Friend",
            "Guardian",
        ]
        | None
    ) = None

    password: str = Field(
        min_length=8,
        max_length=128,
    )

    @field_validator("aadhaar")
    @classmethod
    def validate_aadhaar(
        cls,
        value: str,
    ) -> str:
        cleaned = "".join(
            character
            for character in value
            if character.isdigit()
        )

        if len(cleaned) != 12:
            raise ValueError(
                "Aadhaar must contain exactly 12 digits"
            )

        return cleaned

    @field_validator("mobile")
    @classmethod
    def validate_mobile(
        cls,
        value: str,
    ) -> str:
        cleaned = "".join(
            character
            for character in value
            if character.isdigit()
        )

        if (
            len(cleaned) == 12
            and cleaned.startswith("91")
        ):
            cleaned = cleaned[2:]

        if len(cleaned) != 10:
            raise ValueError(
                "Mobile number must contain exactly 10 digits"
            )

        return cleaned

    @field_validator("emergency_contact")
    @classmethod
    def validate_emergency_contact(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        cleaned = "".join(
            character
            for character in value
            if character.isdigit()
        )

        if (
            len(cleaned) == 12
            and cleaned.startswith("91")
        ):
            cleaned = cleaned[2:]

        if len(cleaned) != 10:
            raise ValueError(
                "Emergency contact must contain exactly 10 digits"
            )

        return cleaned

    @field_validator("abha_id")
    @classmethod
    def validate_abha(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not value:
            return None

        # ABHA address such as name@abdm
        if "@" in value:
            parts = value.split("@")

            if (
                len(parts) != 2
                or not parts[0]
                or not parts[1]
            ):
                raise ValueError(
                    "Invalid ABHA address"
                )

            return value.lower()

        # ABHA number
        cleaned = "".join(
            character
            for character in value
            if character.isdigit()
        )

        if len(cleaned) != 14:
            raise ValueError(
                "ABHA must contain exactly 14 digits or be a valid ABHA address"
            )

        return cleaned

    @field_validator("password")
    @classmethod
    def validate_password(
        cls,
        value: str,
    ) -> str:
        if not any(
            character.isupper()
            for character in value
        ):
            raise ValueError(
                "Password must contain at least one uppercase letter"
            )

        if not any(
            character.islower()
            for character in value
        ):
            raise ValueError(
                "Password must contain at least one lowercase letter"
            )

        if not any(
            character.isdigit()
            for character in value
        ):
            raise ValueError(
                "Password must contain at least one number"
            )

        return value


# ============================================================
# Password Login
# ============================================================


class PasswordLoginRequest(BaseModel):
    identifier_type: IdentifierType

    identifier: str = Field(
        min_length=1,
        max_length=150,
    )

    password: str = Field(
        min_length=1,
        max_length=128,
    )


# ============================================================
# OTP Request
# ============================================================


class RequestOTPRequest(BaseModel):
    identifier_type: IdentifierType

    identifier: str = Field(
        min_length=1,
        max_length=150,
    )

    purpose: Literal["login"] = "login"


class RequestOTPResponse(BaseModel):
    message: str


# ============================================================
# OTP Login / Verification
# ============================================================


class VerifyOTPRequest(BaseModel):
    identifier_type: IdentifierType

    identifier: str = Field(
        min_length=1,
        max_length=150,
    )

    otp: str = Field(
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
    )


# ============================================================
# Refresh Token
# ============================================================


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


# ============================================================
# Authenticated User
# ============================================================


class AuthUser(BaseModel):
    id: str
    auth_method: AuthMethod
    display_name: str
    is_mock: bool = False


# ============================================================
# Authentication Response
# ============================================================


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: AuthUser


# ============================================================
# Session
# ============================================================


class SessionResponse(BaseModel):
    user: AuthUser


# ============================================================
# Logout
# ============================================================


class LogoutResponse(BaseModel):
    message: str


# ============================================================
# User Response
# ============================================================


class UserResponse(BaseModel):
    id: str

    full_name: str

    date_of_birth: date

    gender: str

    abha_id: str | None = None

    mobile: str

    email: EmailStr | None = None

    address: str

    state: str

    district: str

    emergency_contact: str | None = None

    emergency_contact_relationship: str | None = None

    is_active: bool = True

    is_verified: bool = False

    mobile_verified: bool = False

    email_verified: bool = False

    aadhaar_verified: bool = False

    abha_verified: bool = False