from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile, Response
from app.api.dependencies import get_current_lab_assistant
from app.schemas.lab import IdentifierInput, LabRegistration, LabVerification
from app.services.lab_service import lab_service
from app.services.document_upload import read_document_upload
from app.services.document_service import document_service

def no_store(response: Response):
    response.headers["Cache-Control"] = "no-store"

router = APIRouter(prefix="/api/lab", tags=["lab"], dependencies=[Depends(no_store)])

@router.post("/patients/lookup")
def lookup(body: IdentifierInput, actor=Depends(get_current_lab_assistant)):
    return lab_service.lookup(body, actor)

@router.post("/patients")
def register(body: LabRegistration, actor=Depends(get_current_lab_assistant)):
    return lab_service.register(body, actor)

@router.post("/patients/{patient_id}/verify")
def verify(patient_id: str, body: LabVerification, actor=Depends(get_current_lab_assistant)):
    return lab_service.verify(patient_id, body, actor)

@router.post("/patients/{patient_id}/reports", status_code=202)
async def upload(patient_id: str, background: BackgroundTasks, file: UploadFile = File(...),
                 verification_id: str = Form(...), session_id: str | None = Form(None), actor=Depends(get_current_lab_assistant)):
    lab_service.require_verification(patient_id, verification_id, actor)
    filename, content_type, content = await read_document_upload(file)
    record = lab_service.upload(patient_id, verification_id, actor, filename, content_type, content, session_id)
    background.add_task(document_service.process, record.id)
    return lab_service.report(str(record.id), actor)

@router.get("/reports/{document_id}")
def report(document_id: str, actor=Depends(get_current_lab_assistant)):
    return lab_service.report(document_id, actor)
