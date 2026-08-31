# MediKiosk — Backend

FastAPI + MongoDB backend for the MediKiosk patient pre-consultation kiosk (SIH 2026).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Python 3.14 |
| Framework | FastAPI 0.141 |
| ODM | MongoEngine |
| Database | MongoDB 7+ |
| Auth | JWT (HS256) — access + refresh token rotation |
| LLM | Groq API (llama-3.3-70b-versatile) with scripted fallback |
| Server | Uvicorn (ASGI) |

---

## Prerequisites

- **Python 3.14+**
- **MongoDB 7+** running locally or a MongoDB Atlas connection string
- (Optional) **Groq API key** from [console.groq.com](https://console.groq.com) — the system falls back to scripted questions if the key is absent

---

## Local Development Setup

```bash
# 1. Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # macOS / Linux

# 2. Install all dependencies
pip install -r requirements-dev.txt

# 3. Configure environment variables
#    Copy the example and fill in your values
cp .env.example .env        # or create .env manually (see below)

# 4. Start the development server
uvicorn app.main:app --reload
```

API is now available at `http://localhost:8000`.  
Interactive docs (Swagger UI): `http://localhost:8000/docs`

---

## Environment Variables (`.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGO_URI` | ✅ | — | MongoDB connection URI (e.g. `mongodb://localhost:27017`) |
| `MONGO_DB_NAME` | ✅ | — | Database name (e.g. `medikiosk`) |
| `JWT_ACCESS_SECRET` | ✅ | — | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | ✅ | — | Secret for signing refresh tokens |
| `OTP_SECRET` | ✅ | — | Secret used to verify demo OTPs |
| `GROQ_API_KEY` | ❌ | `""` | Groq API key — leave blank for scripted-only mode |
| `GROQ_MODEL` | ❌ | `llama-3.3-70b-versatile` | Groq model name |
| `COOKIE_SECURE` | ❌ | `false` | Set `true` in production (HTTPS) |
| `COOKIE_SAMESITE` | ❌ | `lax` | Cookie SameSite policy |
| `FRONTEND_ORIGIN` | ❌ | `http://localhost:5173` | Allowed CORS origin |

---

## Running Tests

```bash
# Run all interview and workflow tests (uses mongomock — no real MongoDB needed)
pytest tests/test_interview.py tests/test_workflow.py -v

# Run auth tests (also requires no live MongoDB)
pytest tests/test_auth.py -v

# Run all tests with coverage report
pytest --cov=app --cov-report=term-missing
```

> Tests use `mongomock` (in-memory MongoDB) via the `tests/conftest.py` fixture — you do not need a running MongoDB instance to run the test suite.

---

## Docker

```bash
# Build and start the backend + MongoDB together
docker-compose up --build

# Backend only (if MongoDB is already running)
docker-compose up backend
```

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require a valid JWT access token (cookie `medikiosk_access` or `Authorization: Bearer <token>`).

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/login` | — | Login with ABHA mock, Aadhaar mock, or guest |
| `POST` | `/api/auth/refresh` | — | Rotate refresh token, issue new access token |
| `POST` | `/api/auth/logout` | ✅ | Clear session cookies |
| `GET` | `/api/auth/me` | ✅ | Current authenticated user |

### Consent — `/api/consent`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/consent` | ✅ | Save or update consent choices |
| `GET` | `/api/consent` | ✅ | Get current consent record |
| `DELETE` | `/api/consent` | ✅ | Revoke all consent |

### Interview — `/api/interview`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/interview/session` | ✅ | Start or resume a session |
| `GET` | `/api/interview/session/current` | ✅ | Get current/most-recent session |
| `GET` | `/api/interview/session/{id}` | ✅ | Get session by ID |
| `GET` | `/api/interview/session/{id}/next-question` | ✅ | Fetch next question (scripted or Groq-generated) |
| `POST` | `/api/interview/session/{id}/answer` | ✅ | Submit an answer; runs red-flag detection |
| `GET` | `/api/interview/session/{id}/progress` | ✅ | Current completion percentage and status |
| `POST` | `/api/interview/session/{id}/complete` | ✅ | Mark session complete |

> **Red-flag detection** runs deterministically on every answer submission (no LLM). If `triage_required` is `true` in the response, the frontend must route to `/patient/triage-alert`.

### Documents — `/api/documents`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/documents` | ✅ | List patient's uploaded documents |
| `POST` | `/api/documents` | ✅ | Upload a document (PDF / image) |
| `GET` | `/api/documents/{id}` | ✅ | Get single document with OCR extraction |
| `DELETE` | `/api/documents/{id}` | ✅ | Delete a document |

### Summary — `/api/summary`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/summary/generate` | ✅ | Generate draft clinical summary |
| `GET` | `/api/summary` | ✅ | Get current summary |
| `PATCH` | `/api/summary/{id}` | ✅ | Edit sections or confirm summary |

### Physician — `/api/physician`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/physician/queue` | ✅ | Get today's patient queue |
| `GET` | `/api/physician/patient/{id}` | ✅ | Get full patient record for consultation |

---

## Data Models (MongoDB Collections)

| Collection | Description |
|------------|-------------|
| `users` | Patient accounts (Aadhaar, ABHA, credentials) |
| `patient_consents` | Consent record per patient (one document per patient) |
| `interview_sessions` | Full interview session including all answers and red-flag alerts |
| `patient_documents` | Uploaded documents with OCR extraction results |
| `clinical_summaries` | AI-drafted + physician-confirmed clinical history summaries |

### `interview_sessions` document shape

```json
{
  "_id": "<uuid-string>",
  "patient_id": "...",
  "preferred_language": "en-IN",
  "department": "general_medicine",
  "status": "active | completed",
  "priority": "routine | priority | urgent",
  "current_question_id": "socrates_site",
  "answers": [
    {
      "id": "<uuid>",
      "question_id": "chief_complaint",
      "question_text": "What is your main health concern?",
      "section": "Chief complaint",
      "value": "chest_pain",
      "input_mode": "touch | voice | text",
      "answered_at": "2026-08-31T..."
    }
  ],
  "alerts": [
    {
      "id": "<uuid>",
      "rule_id": "chest_pain_with_dyspnoea",
      "reason": "...",
      "priority": "urgent",
      "evidence": ["chest pain", "shortness of breath"],
      "created_at": "..."
    }
  ],
  "created_at": "...",
  "updated_at": "...",
  "completed_at": null
}
```

---

## Clinical Interview Engine

- **Department routing**: `general_medicine` → SOCRATES framework (12 questions); `ayurveda` → Dashavidha Pariksha (22 questions)
- **Question tree**: defined in `app/data/clinical_ontology.json` — edit there, not in Python
- **LLM follow-up**: when a node has `"generator": "free_text_follow_up"`, Groq generates a contextual question; scripted fallback is always available
- **Red-flag rules** (deterministic, never LLM):
  - `chest_pain_with_dyspnoea` — urgent
  - `possible_stroke_symptoms` — urgent (7 keyword phrases)
  - `severe_pain` — priority (pain score ≥ 7/10)

---

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── dependencies.py        # JWT auth dependency
│   │   └── routes/                # FastAPI routers
│   ├── core/
│   │   ├── config.py              # Pydantic BaseSettings
│   │   ├── dbConnection.py        # MongoEngine connect/disconnect
│   │   └── security.py            # Token creation + validation
│   ├── data/
│   │   └── clinical_ontology.json # SOCRATES + AYUSH question tree
│   ├── models/                    # MongoEngine Documents
│   ├── prompts/                   # LLM prompt templates
│   ├── schemas/                   # Pydantic request/response schemas
│   └── services/                  # Business logic
├── tests/
│   ├── conftest.py                # mongomock DB fixture
│   ├── test_auth.py
│   ├── test_interview.py
│   └── test_workflow.py
├── requirements.txt
├── requirements-dev.txt
└── .env
```
