# MediKiosk Project Context

## Purpose

MediKiosk is an SIH 2026 full-stack patient pre-consultation kiosk. It helps a patient identify themselves, provide consent, complete an adaptive clinical intake, upload prior records, review an AI-assisted summary, and join a physician queue before the consultation. The physician dashboard presents the structured history, documents, summaries, queue information, and clinical follow-up workflow.

The application is a development/demo system. Secrets, patient data, and production credentials must remain outside the repository.

## Repository layout

```text
backend/
  app/
    api/routes/       FastAPI route modules
    core/              settings, database, authentication helpers
    data/              clinical_ontology.json
    models/            MongoEngine documents
    schemas/           Pydantic request/response schemas
    services/          interview, summary, document, continuity, queue services
  tests/               pytest tests using mongomock where possible
  README.md            backend setup and API reference
  CONTINUITY.md        patient continuity and migration behavior
  requirements.txt     pinned Python environment dependencies

frontend/
  src/components/      reusable patient and physician UI
  src/context/         authentication and accessibility/i18n state
  src/hooks/           speech, authentication, and accessibility hooks
  src/pages/           route-level screens
  src/routes/          ProtectedRoute and route guards
  src/services/        typed fetch/API clients
  src/types/           TypeScript domain types
  README.md            frontend setup and route reference
  package.json          scripts and dependencies

docker-compose.yml      full-stack development services
```

## Technology stack

### Frontend

- React 19 and TypeScript 6
- Vite 8
- Tailwind CSS 4 plus project CSS
- React Router 7
- Lucide icons and Recharts
- Native `fetch` through `frontend/src/services/api.ts`
- Web Speech API for speech-to-text and text-to-speech
- Vitest, Testing Library, and jsdom

Authentication requests use cookies and the API wrapper can refresh an expired access token. Patient-facing text is routed through the accessibility/i18n context, which also controls font scaling and preferred speech language.

### Backend

- Python 3.14+
- FastAPI and Uvicorn
- MongoEngine with MongoDB 7+
- JWT access and refresh tokens
- Groq (`llama-3.3-70b-versatile`) for contextual follow-up questions, with scripted fallback
- OCR/document processing and object-storage integration
- pytest, pytest-cov, and mongomock

The FastAPI application is created in `backend/app/main.py`. It connects to MongoDB during lifespan startup, runs the idempotent legacy visit backfill, mounts routers, and disconnects on shutdown. `/health`, `/docs`, and `/` are at the application root; feature endpoints are mounted under `/api`.

## Frontend routes and guards

| Route | Guard | Purpose |
|---|---|---|
| `/` | none | Landing page and entry point |
| `/patient/identify` | none | ABHA/Aadhaar mock or guest identification |
| `/patient/home` | authenticated | Choose a new visit, resume a visit, or open profile |
| `/patient/location` | authenticated | Select/validate facility before a new or resumed visit |
| `/patient/consent` | authenticated + visit | Collect DPDP-aligned consent |
| `/patient/interview` | authenticated + visit + consent | Multimodal adaptive clinical interview |
| `/patient/triage-alert` | authenticated + visit + consent | Urgent/priority triage notice |
| `/patient/documents` | authenticated + visit + consent | Upload reports and prescriptions |
| `/patient/summary` | authenticated + visit + consent | Review and confirm the generated summary |
| `/patient/complete` | authenticated + consent | Read-back acknowledgement and queue completion |
| `/patient/profile` | authenticated | Profile, medicines, documents, session history, and medication summary |
| `/physician` | currently readable for demo compatibility | Physician queue |
| `/physician/patient/:patientId` | currently readable for demo compatibility | Consultation record |

`ProtectedRoute` redirects users when authentication, an active visit, or consent is missing. Route changes reset scroll position and focus `#patient-content` for accessibility.

## Patient workflow

1. The patient identifies themselves and receives an authenticated session.
2. `/patient/home` offers:
   - **Start**: begin a new visit.
   - **Resume**: continue an eligible in-progress visit.
   - **Profile**: view continuity data without starting an interview.
3. New and resumed visits select a configured facility/location.
4. The patient gives consent.
5. The interview uses touch controls, free text, and optional voice input. Questions are driven by `backend/app/data/clinical_ontology.json`.
6. Every answer runs deterministic red-flag detection. The LLM must not decide whether a triage alert is required.
7. The patient uploads documents, reviews the draft clinical history, acknowledges the medication read-back, and enters the physician queue.
8. The queue assigns the least-loaded on-duty physician, using physician ID as the stable tie-breaker. If no physician is available, the entry remains awaiting assignment.

Interview red flags currently include chest pain with dyspnoea, possible stroke symptoms, and severe pain (pain score at least 7/10). Completing interview questions does not itself complete the visit; visit state separately tracks `in_progress`, `completed`, and `abandoned`.

## Continuity and clinical history

The continuity feature is documented in `backend/CONTINUITY.md`. Important behavior:

- Starting a new visit abandons the previous unfinished visit.
- Legacy interview records are backfilled at startup without inventing document provenance.
- A visit owns its clinical and medication summary; later visits do not reuse a previous draft.
- Patient profile data is aggregated from identity data and additional profile fields.
- The profile page provides details, medicines, documents, sessions, and medication-summary tabs.
- Medication snapshots are immutable for the visit that generated them.
- Physician-issued prescriptions create linked medication records and audit events.
- Patient timelines include audit events; physician audit access requires assignment.
- QR codes contain an opaque token and metadata reference, not names, diagnoses, or medicine data. Resolution still requires authenticated access.

The continuity migration and services are in `backend/app/services/continuity_migration.py` and `backend/app/services/continuity_service.py`. Facility names can be configured with `MEDIKIOSK_LOCATIONS` as a JSON array; when empty, the UI retains a free-text “Other” option.

## Backend API areas

The main route modules are:

- `auth.py`: login, refresh, logout, and current-user state.
- `consent.py`: save, read, revoke, and consent-related state.
- `interview.py`: start/resume sessions, questions, answers, progress, and completion.
- `documents.py`: upload, list, status, download, URL, and delete operations.
- `summary.py`: generate, read, edit, and confirm clinical summaries.
- `patient.py`: locations, visit status, sessions, profile, medications, medication summaries, and patient audit timeline.
- `physician.py`: queue and consultation reads.
- `prescriptions.py`: physician prescription issuance, queue assignment, and physician audit access.
- `abdm.py`: ABDM summary push integration.
- `profile.py`: pre-existing profile endpoint.

Ownership and role checks must remain server-side. In particular, physician status is derived from the trusted doctor roster, not from patient registration input.

## Configuration

Backend settings are loaded from `backend/.env` through `backend/app/core/config.py`. Required values include:

- `MONGO_URI` and `MONGO_DB_NAME`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `OTP_SECRET`
- Supabase S3 endpoint, region, access key, secret, and bucket values

Common optional values are `GROQ_API_KEY`, `GROQ_MODEL`, `COOKIE_SECURE`, `COOKIE_SAMESITE`, `COOKIE_DOMAIN`, `FRONTEND_ORIGIN`, and `MEDIKIOSK_LOCATIONS`. Use secure cookies and HTTPS settings in deployment. Never commit `.env` or real credentials.

The frontend can override the backend URL with `VITE_API_BASE` in `frontend/.env.local`; local development defaults to `http://localhost:8000`.

## Local development

From `backend/` on Windows:

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

From `frontend/`:

```powershell
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`, the API on `http://localhost:8000`, and Swagger UI is available at `http://localhost:8000/docs`.

To provision an existing account as an on-duty physician:

```powershell
venv\Scripts\python.exe -m app.manage_doctors EXISTING_USER_ID --department "General Medicine"
```

Use `--off-duty` to remove a physician from new assignments.

Docker is also supported through the repository `docker-compose.yml`:

```powershell
docker-compose up --build
```

## Validation commands

Frontend:

```powershell
npm run lint
npm test
npm run build
```

Backend:

```powershell
venv\Scripts\python.exe -m pytest -q
```

For focused continuity validation:

```powershell
venv\Scripts\python.exe -m pytest tests\test_continuity.py tests\test_phase6_and_prompt.py -q
```

Tests should use the repository's existing runners and fixtures. No application tests or builds are implied by documentation-only edits.

## Engineering conventions

- Keep route handlers thin; put workflow and persistence logic in services.
- Preserve authentication, consent, visit ownership, and physician assignment checks on the backend.
- Keep deterministic safety/triage rules independent of LLM output.
- Reuse typed API clients and shared UI components instead of duplicating fetch or guard logic.
- Preserve accessibility: keyboard navigation, focus management, labels, large text, and speech alternatives.
- Treat uploaded files, summaries, medications, audit events, and QR tokens as patient-sensitive data.
- Update the relevant README or `backend/CONTINUITY.md` when changing setup or cross-cutting workflow behavior.
