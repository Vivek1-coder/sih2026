from pathlib import Path
from threading import RLock
from uuid import uuid4

from fastapi import HTTPException, status

from app.models.document import UploadedDocument, utc_now
from app.services.ocr_service import extract_mock_document

UPLOAD_ROOT = (Path(__file__).resolve().parent.parent.parent / "uploads").resolve()


class DocumentService:
    def __init__(self) -> None:
        self._documents: dict[str, UploadedDocument] = {}
        self._lock = RLock()
        UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

    def create(
        self,
        patient_id: str,
        original_filename: str,
        content_type: str,
        content: bytes,
    ) -> UploadedDocument:
        suffix = Path(original_filename).suffix.lower()
        stored_name = f"{uuid4().hex}{suffix}"
        stored_path = (UPLOAD_ROOT / stored_name).resolve()
        if stored_path.parent != UPLOAD_ROOT:
            raise HTTPException(status_code=400, detail="Invalid upload path")
        stored_path.write_bytes(content)
        document = UploadedDocument(
            patient_id=patient_id,
            original_filename=Path(original_filename).name,
            stored_path=str(stored_path),
            content_type=content_type,
            size_bytes=len(content),
        )
        with self._lock:
            self._documents[document.id] = document
        return document

    def process(self, document_id: str) -> None:
        with self._lock:
            document = self._documents.get(document_id)
            if not document:
                return
            document.status = "processing"
            document.updated_at = utc_now()
        try:
            extraction = extract_mock_document(
                document.id,
                document.stored_path,
                document.original_filename,
                document.uploaded_at.date(),
            )
            with self._lock:
                document.extraction = extraction
                document.inferred_document_date = extraction.document_date
                document.status = "done"
                document.updated_at = utc_now()
        except Exception as exc:  # pragma: no cover - defensive background guard
            with self._lock:
                document.status = "failed"
                document.error = str(exc)
                document.updated_at = utc_now()

    def get_owned(self, document_id: str, patient_id: str) -> UploadedDocument:
        document = self._documents.get(document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        if document.patient_id != patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot access another patient's document",
            )
        return document

    def list_for_patient(self, patient_id: str) -> list[UploadedDocument]:
        with self._lock:
            documents = [
                document
                for document in self._documents.values()
                if document.patient_id == patient_id
            ]
        return sorted(
            documents,
            key=lambda document: (
                document.inferred_document_date or document.uploaded_at.date(),
                document.uploaded_at,
            ),
            reverse=True,
        )

    def delete(self, document_id: str, patient_id: str) -> None:
        with self._lock:
            document = self.get_owned(document_id, patient_id)
            self._documents.pop(document_id, None)
        stored_path = Path(document.stored_path).resolve()
        if stored_path.parent == UPLOAD_ROOT and stored_path.exists():
            stored_path.unlink()


document_service = DocumentService()
