# Patient profile and visit continuity

The patient identifies, opens `/patient/home`, and chooses exactly one of three paths: new visit, resume, or profile. New/resumed visits capture a location before consent/interview. The five profile tabs and audit timeline require authentication, but do not require consent to start a new interview.

## Setup

Install `requirements.txt` in the backend environment. QR generation uses `qrcode[pil]`; clinical records, summaries, queue entries, medications, prescriptions and audit events use MongoDB. Cookies and CORS configuration are unchanged.

Set `MEDIKIOSK_LOCATIONS` in the local backend environment or `.env` to a JSON array of facility names. The default is an empty list with a free-text Other option. No real facilities or credentials are embedded in the repository.

The prototype uses one fixed physician and one fixed lab assistant. Open `/physician` or `/lab` directly without login, registration or provisioning. See [LAB_WORKFLOW.md](LAB_WORKFLOW.md). Patient login and consent are unchanged.

## Behavior and compatibility

- Interview `status` retains `active|completed`. The added `visit_status` tracks `in_progress|completed|abandoned`, so completing the questions does not finish the visit. `step` persists consent, interview, triage, documents, summary and complete. Starting a new visit preserves the previous visit as abandoned.
- Startup performs an idempotent backfill for legacy interview records. Legacy documents retain unknown/system provenance rather than inventing an uploader. Old in-memory summaries and queues cannot be recovered after their original process exits.
- User owns demographics and identity. `patient_profiles` stores only additional fields, avoiding duplicate identity records. The existing `/api/profile/` remains available; `/api/patient/profile` supplies the aggregate screen payload and accepts validated editable fields via PUT. The screen itself is read-only.
- Clinical and medication summaries are persisted per visit. Repeated generation reuses that visit's summary. New visits never return a previous visit's draft.
- Patient read-back acknowledgement confirms the medication snapshot and completes the kiosk visit. It queues the patient while preserving the clinical summary as a draft for physician review. This retains the existing patient/physician confirmation distinction.
- Assignment uses the automatically created singleton prototype physician. One persistent queue entry exists per visit. Existing waiting entries move to this desk. Queue views refresh every five seconds and include location, priority and doctor. Red-flag priority remains entirely determined by the existing detector.
- Prescription issuance creates linked medication records with the singleton physician's ID and an audit entry. Medication snapshots preserve what was recorded at their generation time; later prescriptions appear in Medicines and Session History, and in the next visit's medication snapshot. OCR results are not automatically promoted into verified prescriptions.
- The QR is a PNG encoding version, patient ID, summary reference and a random opaque token. It includes no names, diagnoses or medicine data. Resolve it through authenticated `GET /api/patient/medication-summary/resolve/{token}`. Tokens remain valid for the lifetime of the saved snapshot; possession alone grants no access. No public QR sharing URL is created.
- Patient timelines include all events for that patient. Physician audit access requires assignment. Audit inserts use unique event keys for retry-safe summary, answer, upload and assignment events; no edit/delete audit endpoints exist. State changes and audit inserts span collections, so deployments requiring crash-atomic audit guarantees should use MongoDB transactions/outbox processing and database-level append-only permissions.

Physician and lab endpoints are public prototype endpoints with fixed staff identities. Patient endpoints retain authentication.

## Verification

```powershell
venv/Scripts/python.exe -m pytest tests/test_continuity.py tests/test_phase6_and_prompt.py -q
```

Frontend: `npm run lint`, `npm test`, `npm run build`. Continuity tests cover location validation, ownership, start/resume/abandon, immutable snapshots, actual QR decoding, persistent/idempotent queues, prescription provenance, and upload attribution. Existing backend auth tests still import the removed mock `login` function; old Groq integration tests patch a removed `_groq_follow_up` method.
