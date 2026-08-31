# app/core/config.py

from typing import Literal
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    JWT_ACCESS_SECRET: str
    JWT_REFRESH_SECRET: str
    OTP_SECRET: str

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    JWT_ALGORITHM: str = "HS256"
    JWT_ISSUER: str = "my-api"
    JWT_AUDIENCE: str = "my-react-app"

    MONGO_URI: str
    MONGO_DB_NAME: str
    # Cookie defaults are development-friendly. Deployments should set
    # COOKIE_SECURE=true when the API is served over HTTPS.
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: Literal["lax", "strict", "none"] = "lax"
    COOKIE_DOMAIN: str | None = None
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
