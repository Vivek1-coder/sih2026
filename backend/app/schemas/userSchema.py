from typing import Literal

from pydantic import BaseModel, Field

AuthMethod = Literal["abha_mock", "aadhaar_mock", "guest"]


class LoginRequest(BaseModel):
    auth_method: AuthMethod
    identifier: str | None = Field(default=None, max_length=128)
    full_name: str | None = Field(default=None, max_length=100)


class RefreshRequest(BaseModel):
    # Browsers use the httpOnly cookie. This field keeps the mock endpoint
    # usable by command-line/API clients without affecting frontend storage.
    refresh_token: str | None = None


class AuthUser(BaseModel):
    id: str
    auth_method: AuthMethod
    display_name: str
    is_mock: bool = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: AuthUser


class SessionResponse(BaseModel):
    user: AuthUser


class LogoutResponse(BaseModel):
    message: str


class RequestOTPRequest(BaseModel):
    username: str


class RequestOTPResponse(BaseModel):
    message: str
    challenge_id: str


class VerifyOTPRequest(BaseModel):
    username: str
    challenge_id: str

    otp: str = Field(
        min_length=6,
        max_length=6
    )


class UserResponse(BaseModel):
    id: str
    username: str


class VerifyOTPResponse(BaseModel):
    verified: bool
    mock: bool = True
