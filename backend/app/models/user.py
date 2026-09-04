# models/user.model.py

from datetime import datetime, timezone
from enum import Enum

from mongoengine import (
    BooleanField,
    DateField,
    DateTimeField,
    Document,
    EmailField,
    StringField,
)


class Gender(str, Enum):
    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"
    PREFER_NOT_TO_SAY = "Prefer not to say"


class Relationship(str, Enum):
    PARENT = "Parent"
    SPOUSE = "Spouse"
    SIBLING = "Sibling"
    CHILD = "Child"
    FRIEND = "Friend"
    GUARDIAN = "Guardian"


class User(Document):
    """
    Patient/User database model.

    Important:
    - Passwords are stored only as hashes.
    - Refresh tokens are stored only as hashes.
    - Aadhaar should ideally be encrypted/tokenized before storage.
    """

    # -----------------------------------------------------
    # Personal Information
    # -----------------------------------------------------

    full_name = StringField(
        required=True,
        min_length=2,
        max_length=100,
    )

    date_of_birth = DateField(
        required=True,
    )

    gender = StringField(
        required=True,
        choices=[gender.value for gender in Gender],
    )

    # -----------------------------------------------------
    # Identity Information
    # -----------------------------------------------------

    # Aadhaar is required during registration.
    #
    # IMPORTANT:
    # In production, don't store Aadhaar as plain text.
    # Encrypt/tokenize it or store only the minimum
    # identity representation necessary.
    aadhaar = StringField(
        required=True,
        unique=True,
        min_length=12,
        max_length=12,
    )

    # Optional ABHA ID / ABHA address
    abha_id = StringField(
        required=False,
        null=True,
        unique=True,
        sparse=True,
        max_length=100,
    )

    # -----------------------------------------------------
    # Contact Information
    # -----------------------------------------------------

    mobile = StringField(
        required=True,
        unique=True,
        min_length=10,
        max_length=15,
    )

    email = EmailField(
        required=False,
        null=True,
        unique=True,
        sparse=True,
    )

    # -----------------------------------------------------
    # Address
    # -----------------------------------------------------

    address = StringField(
        required=True,
        max_length=500,
    )

    state = StringField(
        required=True,
        max_length=100,
    )

    district = StringField(
        required=True,
        max_length=100,
    )

    # -----------------------------------------------------
    # Emergency Contact
    # -----------------------------------------------------

    emergency_contact = StringField(
        required=False,
        null=True,
        max_length=15,
    )

    relationship = StringField(
        required=False,
        null=True,
        choices=[
            relationship.value
            for relationship in Relationship
        ],
    )

    # -----------------------------------------------------
    # Authentication
    # -----------------------------------------------------

    # Never store plaintext password
    password_hash = StringField(
        required=True,
    )

    # Store HASH of refresh token, not token itself
    refresh_token_hash = StringField(
        required=False,
        null=True,
    )

    refresh_token_expires_at = DateTimeField(
        required=False,
        null=True,
    )

    # Allows forcing logout / revoking refresh token
    refresh_token_revoked = BooleanField(
        default=False,
    )

    # -----------------------------------------------------
    # Account State
    # -----------------------------------------------------

    is_active = BooleanField(
        default=True,
    )

    is_verified = BooleanField(
        default=False,
    )

    mobile_verified = BooleanField(
        default=False,
    )

    email_verified = BooleanField(
        default=False,
    )

    aadhaar_verified = BooleanField(
        default=False,
    )

    abha_verified = BooleanField(
        default=False,
    )

    # -----------------------------------------------------
    # Audit fields
    # -----------------------------------------------------

    created_at = DateTimeField(
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at = DateTimeField(
        default=lambda: datetime.now(timezone.utc),
    )

    last_login_at = DateTimeField(
        required=False,
        null=True,
    )

    meta = {
        "collection": "users",
        "indexes": [
            "mobile",
            "email",
            "aadhaar",
            "abha_id",
        ],
        "ordering": ["-created_at"],
    }

    def save(self, *args, **kwargs):
        self.updated_at = datetime.now(timezone.utc)
        return super().save(*args, **kwargs)

    def to_safe_dict(self) -> dict:
        """
        Return user information safe to send to frontend.

        Never expose:
        - password_hash
        - refresh_token_hash
        """
        return {
            "id": str(self.id),
            "full_name": self.full_name,
            "date_of_birth": (
                self.date_of_birth.isoformat()
                if self.date_of_birth
                else None
            ),
            "gender": self.gender,
            "abha_id": self.abha_id,
            "mobile": self.mobile,
            "email": self.email,
            "address": self.address,
            "state": self.state,
            "district": self.district,
            "emergency_contact": self.emergency_contact,
            "relationship": self.relationship,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "mobile_verified": self.mobile_verified,
            "email_verified": self.email_verified,
            "aadhaar_verified": self.aadhaar_verified,
            "abha_verified": self.abha_verified,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
        }