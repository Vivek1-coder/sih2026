"""Deterministic mock OCR used by the local demonstration."""

from datetime import date
from pathlib import Path
import re
import time

from app.models.document import ExtractedDocumentData, LabValue
from app.services.lab_reference_ranges import REFERENCE_RANGES


def _lab_value(name: str, value: float) -> LabValue:
    low, high, unit = REFERENCE_RANGES[name]
    flag = "low" if value < low else "high" if value > high else "normal"
    return LabValue(
        name=name,
        value=value,
        unit=unit,
        reference_low=low,
        reference_high=high,
        abnormal=flag != "normal",
        flag=flag,
    )


def infer_document_date(filename: str, fallback: date) -> date:
    normalized = filename.lower()
    iso = re.search(r"(20\d{2})[-_](0?[1-9]|1[0-2])[-_](0?[1-9]|[12]\d|3[01])", normalized)
    if iso:
        return date(int(iso.group(1)), int(iso.group(2)), int(iso.group(3)))

    month_names = {
        "jan": 1,
        "feb": 2,
        "mar": 3,
        "apr": 4,
        "may": 5,
        "jun": 6,
        "jul": 7,
        "aug": 8,
        "sep": 9,
        "oct": 10,
        "nov": 11,
        "dec": 12,
    }
    month_match = re.search(
        r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-_ ]?(20\d{2})",
        normalized,
    )
    if month_match:
        return date(int(month_match.group(2)), month_names[month_match.group(1)], 1)
    return fallback


def extract_mock_document(
    document_id: str,
    stored_path: str,
    original_filename: str,
    fallback_date: date,
    delay_seconds: float = 0.6,
) -> ExtractedDocumentData:
    # Simulates an asynchronous OCR job without sending the file off-device.
    time.sleep(delay_seconds)
    filename = Path(original_filename).stem.lower()
    document_date = infer_document_date(original_filename, fallback_date)

    if any(word in filename for word in ("blood", "lab", "test", "cbc")):
        labs = [
            _lab_value("Haemoglobin", 11.2),
            _lab_value("Fasting glucose", 108.0),
            _lab_value("Platelets", 286.0),
            _lab_value("Creatinine", 0.9),
        ]
        return ExtractedDocumentData(
            document_id=document_id,
            document_type="Laboratory report",
            document_date=document_date,
            facility="Demo Community Laboratory",
            diagnoses=["Possible mild anaemia — verify clinically"],
            medications=[],
            investigations=["Complete blood count", "Metabolic panel"],
            lab_values=labs,
            raw_summary="Mock OCR found a CBC and metabolic panel with low haemoglobin and raised fasting glucose.",
        )

    if any(word in filename for word in ("prescription", "rx", "medicine")):
        return ExtractedDocumentData(
            document_id=document_id,
            document_type="Prescription",
            document_date=document_date,
            facility="Demo OPD Clinic",
            diagnoses=["Symptomatic treatment noted"],
            medications=["Paracetamol 500 mg as directed", "Oral rehydration solution"],
            investigations=[],
            lab_values=[],
            raw_summary="Mock OCR identified two prescribed medicines; dose and duration require physician verification.",
        )

    return ExtractedDocumentData(
        document_id=document_id,
        document_type="Clinical document",
        document_date=document_date,
        facility="Demo Hospital",
        diagnoses=["Prior clinical encounter — details require review"],
        medications=[],
        investigations=["Uploaded record reviewed by mock OCR"],
        lab_values=[],
        raw_summary=(
            f"Mock OCR processed {Path(stored_path).suffix.upper().lstrip('.')} content. "
            "The extracted fields must be checked against the original document."
        ),
    )
