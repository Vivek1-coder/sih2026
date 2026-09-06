import re
from fastapi import HTTPException, status
from app.models.user import User
from app.schemas.userSchema import IdentifierType

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


