# MediKiosk Backend

The backend is a FastAPI service for patient identification, consent,
clinical interviews, triage, document processing, summaries, and physician
workflows. It uses MongoDB through MongoEngine and can optionally use Groq for
contextual interview follow-up questions.

## Technology

| Area | Technology |
| --- | --- |
| Runtime | Python 3.13+ |
| API | FastAPI and Uvicorn |
| Database | MongoDB and MongoEngine |
| Validation | Pydantic Settings and schemas |
| Authentication | JWT access tokens and rotating refresh tokens |
| Storage | Supabase S3-compatible object storage |
| Optional AI | Groq |
| Testing | Pytest and Mongomock |

## Requirements

- Python 3.13 or newer
- MongoDB 7+ locally or a MongoDB Atlas URI
- Supabase S3-compatible storage credentials
- Groq API key is optional; scripted interview fallback remains available

## Local setup

From this directory:

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements-dev.txt
Copy-Item .env.sample .env
```

Fill in the required values in `.env`, then start the API:

```powershell
uvicorn app.main:app --reload
```

The API runs at <http://localhost:8000>. OpenAPI documentation is available
at <http://localhost:8000/docs> and the health check is at
<http://localhost:8000/health>.

## Configuration

Required environment variables:

| Variable | Description |
| --- | --- |
| `MONGO_URI` | MongoDB connection URI |
| `MONGO_DB_NAME` | MongoDB database name |
| `JWT_ACCESS_SECRET` | Access-token signing secret |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret |
| `OTP_SECRET` | OTP hashing/signing secret |
| `SUPABASE_S3_ENDPOINT` | S3-compatible storage endpoint |
| `SUPABASE_S3_REGION` | Storage region |
| `SUPABASE_S3_ACCESS_KEY_ID` | Storage access key |
| `SUPABASE_S3_SECRET_ACCESS_KEY` | Storage secret |
| `SUPABASE_S3_BUCKET` | Storage bucket |

Useful optional settings:

| Variable | Default | Description |
| --- | --- | --- |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | Access-token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh-token lifetime |
| `JWT_ALGORITHM` | `HS256` | JWT algorithm |
| `JWT_ISSUER` | `my-api` | JWT issuer claim |
| `JWT_AUDIENCE` | `my-react-app` | JWT audience claim |
| `COOKIE_SECURE` | `false` | Force secure cookies |
| `COOKIE_SAMESITE` | `lax` | Local cookie SameSite policy |
| `COOKIE_DOMAIN` | unset | Optional cookie domain |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Primary allowed frontend origin |
| `FRONTEND_ORIGINS` | deployed frontend origin | Comma-separated allowed origins |
| `GROQ_API_KEY` | empty | Optional Groq credential |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq model |

Never commit `.env`. Generate strong, different production values for all
secrets. When the API is behind an HTTPS reverse proxy, authentication cookies
automatically use `Secure` and `SameSite=None` so cross-origin frontend
requests can send them.

## Authentication

Login and registration issue:

- `medikiosk_access`: short-lived HTTP-only access cookie scoped to `/api`
- `medikiosk_refresh`: rotating HTTP-only refresh cookie scoped to
  `/api/auth`

Protected endpoints accept the access cookie or an `Authorization: Bearer
JWT` header. Refresh tokens are hashed in MongoDB and are single-use;
refreshing rotates the stored token. CORS is configured with credentials
enabled, so the deployed frontend origin must be configured exactly.

## API overview

All routes are prefixed with `/api`.

| Area | Main endpoints |
| --- | --- |
| Auth | `/auth/register`, `/auth/login/password`, `/auth/login/otp`, `/auth/refresh`, `/auth/logout`, `/auth/me` |
| Consent | `/consent` |
| Patient workflow | `/patient/session-status`, `/patient/sessions`, `/patient/profile`, `/patient/medications` |
| Interview | `/interview/session`, `/interview/session/current`, `/interview/session/{id}/answer`, `/interview/session/{id}/complete` |
| Documents | `/documents`, `/documents/{id}` |
| Summary | `/summary`, `/summary/generate`, `/summary/{id}` |
| Physician | `/physician/queue`, `/physician/patient/{id}` |
| Lab and prescriptions | `/lab/*`, `/prescriptions/*` |

The interview engine uses the clinical ontology in
`app/data/clinical_ontology.json`. Red-flag detection is deterministic and
can route patients to urgent triage without depending on the LLM.

## Project structure

```text
backend/
├── app/
│   ├── api/routes/       # FastAPI route modules
│   ├── core/             # Settings, DB connection, JWT security
│   ├── data/             # Clinical ontology and message codes
│   ├── models/           # MongoEngine documents
│   ├── schemas/          # Pydantic request/response models
│   └── services/         # Interview, OCR, storage, queue, and summary logic
├── tests/                # Unit and workflow tests
├── Dockerfile
├── requirements.txt
├── requirements-dev.txt
└── .env.sample
```

## Tests and checks

```powershell
# Run all tests
pytest -q

# Run focused authentication tests
pytest tests\test_auth.py -q

# Run with coverage
pytest --cov=app --cov-report=term-missing
```

Tests use the repository's test fixtures and Mongomock where applicable; a
live MongoDB instance is not required for those tests.

## Docker and deployment

Build and run the backend image:

```powershell
docker build -t medikiosk-backend .
docker run --rm -p 8000:8000 --env-file .env medikiosk-backend
```

From the repository root, `docker compose up --build` starts the backend,
frontend, and MongoDB services together. The container honours the hosting
platform's `PORT` environment variable.

For Render or another HTTPS host, configure the production environment
variables in the platform dashboard rather than committing them to the
repository. Set the frontend URL in `FRONTEND_ORIGIN` and
`FRONTEND_ORIGINS`.
