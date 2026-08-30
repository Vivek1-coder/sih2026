from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.abdm import router as abdm_router
from app.api.routes.consent import router as consent_router
from app.api.routes.documents import router as documents_router
from app.api.routes.interview import router as interview_router
from app.api.routes.physician import router as physician_router
from app.api.routes.summary import router as summary_router
from app.core.config import settings

app = FastAPI(
    title="MediKiosk API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_ORIGIN,
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(consent_router)
app.include_router(interview_router)
app.include_router(documents_router)
app.include_router(summary_router)
app.include_router(abdm_router)
app.include_router(physician_router)


@app.get("/")
def root():
    return {
        "message": "FastAPI server is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
