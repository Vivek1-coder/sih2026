"""
Generate three mock medical documents as plain PDFs (no external deps).
Run:  python uploads/make_mock_docs.py
Outputs three files in uploads/ ready to drag into MediKiosk.
"""

import struct, zlib, os

OUT = os.path.dirname(os.path.abspath(__file__))


# ---------------------------------------------------------------------------
# Minimal PDF writer (pure stdlib — no reportlab / fpdf required)
# ---------------------------------------------------------------------------

def _pdf(lines: list[str], title: str) -> bytes:
    """
    Build a bare-minimum 1-page PDF containing `lines` of text.
    Font: Helvetica (built-in), 11pt, left-aligned, top-to-bottom.
    """
    # We'll build the PDF objects manually.
    objects: list[bytes] = []   # obj index 0 unused; real objs start at index 1

    def add(obj: bytes) -> int:
        objects.append(obj)
        return len(objects)          # 1-based object number

    # --- Content stream ---
    text_ops: list[str] = ["BT", "/F1 11 Tf", "50 780 Td", "14 TL"]
    for line in lines:
        # Escape special PDF characters
        safe = (line
                .replace("\\", "\\\\")
                .replace("(", "\\(")
                .replace(")", "\\)")
                .replace("\r", ""))
        text_ops.append(f"({safe}) Tj T*")
    text_ops.append("ET")
    stream_data = "\n".join(text_ops).encode("latin-1", errors="replace")

    stream_obj = (
        b"<< /Length " + str(len(stream_data)).encode() + b" >>\n"
        b"stream\n" + stream_data + b"\nendstream"
    )
    content_id = add(stream_obj)

    # --- Page ---
    page_obj = (
        b"<< /Type /Page\n"
        b"   /Parent 3 0 R\n"
        b"   /MediaBox [0 0 595 842]\n"
        b"   /Contents " + str(content_id).encode() + b" 0 R\n"
        b"   /Resources << /Font << /F1 2 0 R >> >>\n"
        b">>"
    )
    page_id = add(page_obj)

    # --- Font (Helvetica built-in) ---
    font_obj = (
        b"<< /Type /Font\n"
        b"   /Subtype /Type1\n"
        b"   /BaseFont /Helvetica\n"
        b">>"
    )
    font_id = add(font_obj)   # should be 2

    # --- Pages dict ---
    pages_obj = (
        b"<< /Type /Pages\n"
        b"   /Kids [" + str(page_id).encode() + b" 0 R]\n"
        b"   /Count 1\n"
        b">>"
    )
    pages_id = add(pages_obj)   # should be 3

    # --- Catalog ---
    catalog_obj = (
        b"<< /Type /Catalog\n"
        b"   /Pages " + str(pages_id).encode() + b" 0 R\n"
        b">>"
    )
    catalog_id = add(catalog_obj)

    # We need the objects in order 1..N but above we appended in insertion order.
    # Re-number them: assign stable IDs by re-ordering.
    # Simplest: just emit in the order we added them, using their actual indices.

    body = b"%PDF-1.4\n"
    offsets: list[int] = []
    for i, obj_bytes in enumerate(objects):
        offsets.append(len(body))
        obj_num = i + 1
        body += str(obj_num).encode() + b" 0 obj\n" + obj_bytes + b"\nendobj\n"

    xref_offset = len(body)
    n = len(objects) + 1
    body += b"xref\n"
    body += b"0 " + str(n).encode() + b"\n"
    body += b"0000000000 65535 f \n"
    for off in offsets:
        body += str(off).zfill(10).encode() + b" 00000 n \n"

    body += (
        b"trailer\n"
        b"<< /Size " + str(n).encode() + b"\n"
        b"   /Root " + str(catalog_id).encode() + b" 0 R\n"
        b">>\n"
        b"startxref\n" + str(xref_offset).encode() + b"\n%%EOF\n"
    )
    return body


# ---------------------------------------------------------------------------
# Document 1 — CBC + Metabolic lab report  (triggers "blood"/"lab" branch)
# ---------------------------------------------------------------------------

lab_lines = [
    "DEMO COMMUNITY LABORATORY",
    "Patient: Ramesh Kumar    Age: 45M    Date: 2025-03-15",
    "Ref. Dr: Dr. Meena Iyer   UHID: DEMO-2025-0031",
    "",
    "COMPLETE BLOOD COUNT (CBC)",
    "----------------------------------------",
    "Parameter          Result    Reference    Flag",
    "Haemoglobin        11.2 g/dL  13.0-17.0   LOW *",
    "Total WBC          7,400 /uL  4000-11000  Normal",
    "Platelets          286,000    150-400K    Normal",
    "MCV                72 fL      80-100      LOW *",
    "MCH                24 pg      27-33       LOW *",
    "",
    "METABOLIC PANEL",
    "----------------------------------------",
    "Fasting Glucose    108 mg/dL  70-100      HIGH *",
    "HbA1c              6.1 %      <5.7        Pre-diabetic *",
    "Creatinine         0.9 mg/dL  0.6-1.2     Normal",
    "Urea (BUN)         18 mg/dL   7-25        Normal",
    "Sodium             138 mEq/L  136-145     Normal",
    "Potassium          4.1 mEq/L  3.5-5.1     Normal",
    "",
    "LIPID PROFILE",
    "----------------------------------------",
    "Total Cholesterol  198 mg/dL  <200        Normal",
    "LDL                128 mg/dL  <100        HIGH *",
    "HDL                42 mg/dL   >40         Normal",
    "Triglycerides      165 mg/dL  <150        HIGH *",
    "",
    "* Abnormal values require clinical correlation.",
    "This is a MOCK document for demonstration purposes only.",
    "Not for clinical use.",
]

# ---------------------------------------------------------------------------
# Document 2 — Prescription  (triggers "prescription"/"rx" branch)
# ---------------------------------------------------------------------------

rx_lines = [
    "DR. ANITA SHARMA  MD (Medicine)",
    "OPD Clinic, Demo General Hospital",
    "Date: 2025-04-02   Token: OPD-087",
    "",
    "Patient: Sunita Devi    Age: 38F",
    "Diagnosis: Acute upper respiratory tract infection",
    "",
    "Rx",
    "----------------------------------------",
    "1. Tab. Paracetamol 500 mg",
    "   1 tablet TDS x 5 days (after food)",
    "",
    "2. Tab. Cetirizine 10 mg",
    "   1 tablet OD at night x 5 days",
    "",
    "3. Syp. Ambroxol 30 mg/5 mL",
    "   10 mL TDS x 5 days",
    "",
    "4. Tab. Pantoprazole 40 mg",
    "   1 tablet OD before breakfast x 5 days",
    "",
    "Advice:",
    "  - Warm fluids, steam inhalation",
    "  - Avoid cold food and drinks",
    "  - Return if fever persists > 3 days",
    "",
    "Known Allergies: Sulfonamides (rash)",
    "",
    "This is a MOCK document for demonstration purposes only.",
    "Not for clinical use.",
]

# ---------------------------------------------------------------------------
# Document 3 — Discharge summary  (triggers generic "clinical document" branch)
# ---------------------------------------------------------------------------

discharge_lines = [
    "DEMO DISTRICT HOSPITAL — DISCHARGE SUMMARY",
    "Ward: General Medicine   Bed: 14",
    "Date of Admission: 2024-11-10   Date of Discharge: 2024-11-14",
    "",
    "Patient: Mohammed Ishaq   Age: 62M   ABHA: DEMO-ABHA-4521",
    "",
    "DIAGNOSIS AT DISCHARGE",
    "  1. Community-acquired pneumonia (right lower lobe)",
    "  2. Type 2 Diabetes Mellitus — poorly controlled",
    "  3. Hypertension — on treatment",
    "",
    "HISTORY",
    "  Admitted with 5-day history of fever, productive cough,",
    "  and breathlessness. Known diabetic and hypertensive.",
    "",
    "INVESTIGATIONS",
    "  CXR: Right lower lobe consolidation",
    "  SpO2 on admission: 91% (room air)",
    "  Blood glucose on admission: 298 mg/dL",
    "  WBC: 14,200 /uL (raised)",
    "  CRP: 78 mg/L (raised)",
    "",
    "TREATMENT GIVEN",
    "  IV Ceftriaxone 1g BD x 4 days",
    "  IV Metronidazole 500mg TDS x 2 days",
    "  Insulin sliding scale",
    "  O2 supplementation (2L NC)",
    "",
    "DISCHARGE MEDICATIONS",
    "  Tab. Amoxicillin-Clavulanate 625 mg BD x 7 days",
    "  Tab. Metformin 500 mg BD (resume)",
    "  Tab. Amlodipine 5 mg OD (continue)",
    "  Tab. Losartan 50 mg OD (continue)",
    "",
    "FOLLOW-UP: Medicine OPD in 1 week",
    "",
    "This is a MOCK document for demonstration purposes only.",
    "Not for clinical use.",
]

# ---------------------------------------------------------------------------
# Write files
# ---------------------------------------------------------------------------

docs = [
    ("blood_lab_report_2025-03-15.pdf",  lab_lines),
    ("prescription_rx_2025-04-02.pdf",   rx_lines),
    ("discharge_summary_2024-11-14.pdf", discharge_lines),
]

for filename, lines in docs:
    path = os.path.join(OUT, filename)
    pdf_bytes = _pdf(lines, filename)
    with open(path, "wb") as f:
        f.write(pdf_bytes)
    print(f"Created: {path}  ({len(pdf_bytes):,} bytes)")

print("\nDone. Upload these three files in the MediKiosk Documents step.")
