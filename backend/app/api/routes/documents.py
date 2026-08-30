from pathlib import Path

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Response,
    UploadFile,
    status,
)

from app.api.dependencies import get_current_patient_id
from app.models.document import UploadedDocument
from app.schemas.document import (
    DocumentListResponse,
    ExtractedDocumentResponse,
    LabValueResponse,
    UploadedDocumentResponse,
)
from app.services.consent_service import consent_service
from app.services.document_service import document_service

router = APIRouter(prefix="/api/documents", tags=["documents"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"application/pdf", "image/jpeg", "image/png"}
ALLOWED_SUFFIXES = {".pdf", ".jpg", ".jpeg", ".png"}


def valid_file_signature(suffix: str, content: bytes) -> bool:
    if suffix == ".pdf":
        return content.startswith(b"%PDF")
    if suffix in {".jpg", ".jpeg"}:
        return content.startswith(b"\xff\xd8\xff")
    if suffix == ".png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    return False


def document_response(document: UploadedDocument) -> UploadedDocumentResponse:
    extraction = document.extraction
    return UploadedDocumentResponse(
        id=document.id,
        original_filename=document.original_filename,
        content_type=document.content_type,
        size_bytes=document.size_bytes,
        status=document.status,
        document_date=document.inferred_document_date,
        extraction=(
            ExtractedDocumentResponse(
                document_type=extraction.document_type,
                document_date=extraction.document_date,
                facility=extraction.facility,
                diagnoses=extraction.diagnoses,
                medications=extraction.medications,
                investigations=extraction.investigations,
                lab_values=[
                    LabValueResponse(
                        name=lab.name,
                        value=lab.value,
                        unit=lab.unit,
                        reference_low=lab.reference_low,
                        reference_high=lab.reference_high,
                        abnormal=lab.abnormal,
                        flag=lab.flag,
                    )
                    for lab in extraction.lab_values
                ],
                raw_summary=extraction.raw_summary,
                extracted_at=extraction.extracted_at,
            )
            if extraction
            else None
        ),
        error=document.error,
        uploaded_at=document.uploaded_at,
        updated_at=document.updated_at,
    )


def require_document_consent(patient_id: str) -> None:
    consent = consent_service.get(patient_id)
    if not (
        consent
        and consent.status == "active"
        and consent.choices.get("document_processing", False)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Document-processing consent has not been granted",
        )


@router.post("/upload", response_model=UploadedDocumentResponse, status_code=202)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    patient_id: str = Depends(get_current_patient_id),
) -> UploadedDocumentResponse:
    require_document_consent(patient_id)
    filename = Path(file.filename or "upload").name
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_SUFFIXES or file.content_type not in (
        ALLOWED_CONTENT_TYPES | {"application/octet-stream"}
    ):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF, JPG, JPEG, and PNG files are supported",
        )
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    await file.close()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds the 10 MB limit")
    if not valid_file_signature(suffix, content):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File contents do not match the PDF/JPG/PNG extension",
        )

    document = document_service.create(
        patient_id,
        filename,
        file.content_type or "application/octet-stream",
        content,
    )
    background_tasks.add_task(document_service.process, document.id)
    return document_response(document)


@router.get("", response_model=DocumentListResponse)
def list_documents(
    patient_id: str = Depends(get_current_patient_id),
) -> DocumentListResponse:
    return DocumentListResponse(
        documents=[
            document_response(document)
            for document in document_service.list_for_patient(patient_id)
        ]
    )


@router.get("/patient/{requested_patient_id}", response_model=DocumentListResponse)
def list_patient_documents(
    requested_patient_id: str,
    patient_id: str = Depends(get_current_patient_id),
) -> DocumentListResponse:
    if requested_patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access another patient's documents",
        )
    return list_documents(patient_id)


@router.get("/{document_id}/status", response_model=UploadedDocumentResponse)
def document_status(
    document_id: str,
    patient_id: str = Depends(get_current_patient_id),
) -> UploadedDocumentResponse:
    return document_response(document_service.get_owned(document_id, patient_id))


@router.get("/{document_id}", response_model=UploadedDocumentResponse)
def get_document(
    document_id: str,
    patient_id: str = Depends(get_current_patient_id),
) -> UploadedDocumentResponse:
    return document_status(document_id, patient_id)


@router.delete("/{document_id}", status_code=204)
def delete_document(
    document_id: str,
    patient_id: str = Depends(get_current_patient_id),
) -> Response:
    document_service.delete(document_id, patient_id)
    return Response(status_code=204)
