import json
from pathlib import Path
from threading import RLock

from fastapi import HTTPException, status

from app.models.summary import ClinicalHistorySummary, utc_now
from app.services.document_service import document_service
from app.services.interview_service import interview_service
from app.services.llm_service import llm_service

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "clinical_summary_template.txt"
ALLOWED_SECTION_TITLES = {
    "Chief Complaint",
    "History of Present Illness",
    "Past Medical / Surgical History",
    "Drug & Allergy History",
    "Family History",
    "Personal History",
    "Review of Systems",
    "Prior Investigations",
    "AYUSH · Dashavidha Pariksha",
}


class SummaryService:
    def __init__(self) -> None:
        self._summaries: dict[str, ClinicalHistorySummary] = {}
        self._current_by_patient: dict[str, str] = {}
        self._lock = RLock()

    def generate(
        self,
        patient_id: str,
        requested_session_id: str | None = None,
    ) -> ClinicalHistorySummary:
        with self._lock:
            existing = self.current(patient_id)
            if existing:
                return existing

        session = (
            interview_service.get_owned(requested_session_id, patient_id)
            if requested_session_id
            else interview_service.current(patient_id)
        )
        if not session:
            raise HTTPException(status_code=409, detail="Interview session is required")
        if session.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Complete the interview before generating a summary",
            )

        documents = [
            document
            for document in document_service.list_for_patient(patient_id)
            if document.status == "done" and document.extraction
        ]
        answer_payload = [
            {
                "question_id": answer.question_id,
                "section": answer.section,
                "value": answer.value,
            }
            for answer in session.answers
        ]
        document_payload = [
            {
                "document_id": str(document.id),
                "document_date": document.extraction.document_date.isoformat(),
                "document_type": document.extraction.document_type,
                "raw_summary": document.extraction.raw_summary,
                "diagnoses": list(document.extraction.diagnoses),
                "medications": list(document.extraction.medications),
                "investigations": list(document.extraction.investigations),
            }
            for document in documents
            if document.extraction
        ]
        template = PROMPT_PATH.read_text(encoding="utf-8")
        prompt = template.replace(
            "{{INTERVIEW_ANSWERS}}",
            json.dumps(answer_payload, ensure_ascii=False, indent=2),
        ).replace(
            "{{DOCUMENT_EXTRACTIONS}}",
            json.dumps(document_payload, ensure_ascii=False, indent=2),
        )
        sections = llm_service.generate_clinical_summary(
            prompt,
            answer_payload,
            document_payload,
        )
        summary = ClinicalHistorySummary(
            patient_id=patient_id,
            interview_session_id=session.id,
            sections=sections,
            readbacks=llm_service.generate_readbacks(
                sections,
                session.preferred_language,
            ),
            preferred_language=session.preferred_language,
            source_document_ids=[str(document.id) for document in documents],
            priority=session.priority,
        )
        with self._lock:
            # React StrictMode can issue two development requests. Preserve
            # idempotency if another generator stored the current draft while
            # this request was assembling its prompt.
            existing = self.current(patient_id)
            if existing:
                return existing
            self._summaries[summary.id] = summary
            self._current_by_patient[patient_id] = summary.id
        return summary

    def current(self, patient_id: str) -> ClinicalHistorySummary | None:
        summary_id = self._current_by_patient.get(patient_id)
        return self._summaries.get(summary_id) if summary_id else None

    def list_all(self) -> list[ClinicalHistorySummary]:
        """Return a stable snapshot for the demo physician queue."""
        with self._lock:
            return list(self._summaries.values())

    def get_owned(self, summary_id: str, patient_id: str) -> ClinicalHistorySummary:
        summary = self._summaries.get(summary_id)
        if not summary:
            raise HTTPException(status_code=404, detail="Summary not found")
        if summary.patient_id != patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot access another patient's summary",
            )
        return summary

    def update(
        self,
        summary_id: str,
        patient_id: str,
        sections: dict[str, str] | None,
        requested_status: str | None,
        patient_acknowledged: bool | None,
    ) -> ClinicalHistorySummary:
        with self._lock:
            summary = self.get_owned(summary_id, patient_id)
            if sections is not None:
                unknown = set(sections) - ALLOWED_SECTION_TITLES
                if unknown:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Unknown summary sections: {', '.join(sorted(unknown))}",
                    )
                if any(not value.strip() or len(value) > 5000 for value in sections.values()):
                    raise HTTPException(
                        status_code=422,
                        detail="Summary section values must contain 1–5000 characters",
                    )
                summary.sections.update(
                    {title: value.strip() for title, value in sections.items()}
                )
                summary.readbacks = llm_service.generate_readbacks(
                    summary.sections,
                    summary.preferred_language,
                )
            if patient_acknowledged:
                summary.patient_acknowledged_at = utc_now()
            if requested_status == "confirmed":
                if not summary.patient_acknowledged_at:
                    raise HTTPException(
                        status_code=409,
                        detail="Patient read-back must be acknowledged before confirmation",
                    )
                summary.status = "confirmed"
                summary.confirmed_at = utc_now()
            summary.version += 1
            summary.updated_at = utc_now()
            return summary


summary_service = SummaryService()
import json
from pathlib import Path
from threading import RLock

from fastapi import HTTPException, status

from app.models.summary import ClinicalHistorySummary, utc_now
from app.services.document_service import document_service
from app.services.interview_service import interview_service
from app.services.llm_service import llm_service

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "clinical_summary_template.txt"
ALLOWED_SECTION_TITLES = {
    "Chief Complaint",
    "History of Present Illness",
    "Past Medical / Surgical History",
    "Drug & Allergy History",
    "Family History",
    "Personal History",
    "Review of Systems",
    "Prior Investigations",
    "AYUSH · Dashavidha Pariksha",
}


class SummaryService:
    def __init__(self) -> None:
        self._summaries: dict[str, ClinicalHistorySummary] = {}
        self._current_by_patient: dict[str, str] = {}
        self._lock = RLock()

    def generate(
        self,
        patient_id: str,
        requested_session_id: str | None = None,
    ) -> ClinicalHistorySummary:
        with self._lock:
            existing = self.current(patient_id)
            if existing:
                return existing

        session = (
            interview_service.get_owned(requested_session_id, patient_id)
            if requested_session_id
            else interview_service.current(patient_id)
        )
        if not session:
            raise HTTPException(status_code=409, detail="Interview session is required")
        if session.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Complete the interview before generating a summary",
            )

        documents = [
            document
            for document in document_service.list_for_patient(patient_id)
            if document.status == "done" and document.extraction
        ]
        answer_payload = [
            {
                "question_id": answer.question_id,
                "section": answer.section,
                "value": answer.value,
            }
            for answer in session.answers
        ]
        document_payload = [
            {
                "document_id": document.id,
                "document_date": document.extraction.document_date.isoformat(),
                "document_type": document.extraction.document_type,
                "raw_summary": document.extraction.raw_summary,
                "diagnoses": document.extraction.diagnoses,
                "medications": document.extraction.medications,
                "investigations": document.extraction.investigations,
            }
            for document in documents
            if document.extraction
        ]
        template = PROMPT_PATH.read_text(encoding="utf-8")
        prompt = template.replace(
            "{{INTERVIEW_ANSWERS}}",
            json.dumps(answer_payload, ensure_ascii=False, indent=2),
        ).replace(
            "{{DOCUMENT_EXTRACTIONS}}",
            json.dumps(document_payload, ensure_ascii=False, indent=2),
        )
        sections = llm_service.generate_clinical_summary(
            prompt,
            answer_payload,
            document_payload,
        )
        summary = ClinicalHistorySummary(
            patient_id=patient_id,
            interview_session_id=session.id,
            sections=sections,
            readbacks=llm_service.generate_readbacks(
                sections,
                session.preferred_language,
            ),
            preferred_language=session.preferred_language,
            source_document_ids=[document.id for document in documents],
            priority=session.priority,
        )
        with self._lock:
            # React StrictMode can issue two development requests. Preserve
            # idempotency if another generator stored the current draft while
            # this request was assembling its prompt.
            existing = self.current(patient_id)
            if existing:
                return existing
            self._summaries[summary.id] = summary
            self._current_by_patient[patient_id] = summary.id
        return summary

    def current(self, patient_id: str) -> ClinicalHistorySummary | None:
        summary_id = self._current_by_patient.get(patient_id)
        return self._summaries.get(summary_id) if summary_id else None

    def list_all(self) -> list[ClinicalHistorySummary]:
        """Return a stable snapshot for the demo physician queue."""
        with self._lock:
            return list(self._summaries.values())

    def get_owned(self, summary_id: str, patient_id: str) -> ClinicalHistorySummary:
        summary = self._summaries.get(summary_id)
        if not summary:
            raise HTTPException(status_code=404, detail="Summary not found")
        if summary.patient_id != patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot access another patient's summary",
            )
        return summary

    def update(
        self,
        summary_id: str,
        patient_id: str,
        sections: dict[str, str] | None,
        requested_status: str | None,
        patient_acknowledged: bool | None,
    ) -> ClinicalHistorySummary:
        with self._lock:
            summary = self.get_owned(summary_id, patient_id)
            if sections is not None:
                unknown = set(sections) - ALLOWED_SECTION_TITLES
                if unknown:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Unknown summary sections: {', '.join(sorted(unknown))}",
                    )
                if any(not value.strip() or len(value) > 5000 for value in sections.values()):
                    raise HTTPException(
                        status_code=422,
                        detail="Summary section values must contain 1–5000 characters",
                    )
                summary.sections.update(
                    {title: value.strip() for title, value in sections.items()}
                )
                summary.readbacks = llm_service.generate_readbacks(
                    summary.sections,
                    summary.preferred_language,
                )
            if patient_acknowledged:
                summary.patient_acknowledged_at = utc_now()
            if requested_status == "confirmed":
                if not summary.patient_acknowledged_at:
                    raise HTTPException(
                        status_code=409,
                        detail="Patient read-back must be acknowledged before confirmation",
                    )
                summary.status = "confirmed"
                summary.confirmed_at = utc_now()
            summary.version += 1
            summary.updated_at = utc_now()
            return summary


summary_service = SummaryService()
