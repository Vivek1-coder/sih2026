# MediKiosk Project Context

## Overview

MediKiosk is a patient pre-consultation kiosk and physician dashboard for SIH 2026. The application supports patient identification, consent collection, an adaptive medical-history interview, document upload/OCR, clinical-summary generation, physician review, and visit continuity.

The repository has two independently runnable applications:

- `backend/`: FastAPI API backed by MongoDB/MongoEngine.
- `frontend/`: React 19 + TypeScript kiosk and physician dashboard.

## Technology

### Backend

- Python 3.14+
- FastAPI and Uvicorn
- MongoEngine with MongoDB 7+
- JWT access and refresh tokens
- `scrypt` password hashing from Python's standard library
- Optional Groq integration with scripted fallback
- `mongomock` for tests

### Frontend

- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS 4
- React Router 7
- Native `fetch` for protected API calls
- Axios for authentication calls
- Vitest and Testing Library

## Local Development

### Backend

From `backend/`:

```powershell
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`. Swagger documentation is available at `http://localhost:8000/docs`.

The backend requires a local or Atlas MongoDB connection and environment variables for MongoDB and JWT secrets. Keep real credentials only in a local `.env`; never commit them.

### Frontend

From `frontend/`:

```powershell
npm install
npm run dev
```

The development app runs at `http://localhost:5173`.

The frontend API URL is configured through `VITE_API_BASE_URL`. For local development, use:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Authentication Context

Authentication uses two HttpOnly cookies:

- `medikiosk_access`: short-lived access JWT, available to `/api` routes.
- `medikiosk_refresh`: rotating refresh JWT, available to `/api/auth` routes.

The backend accepts access tokens from the access cookie or the standard HTTP authorization header. The frontend sends cookies with `credentials: "include"` or Axios `withCredentials: true`.

The main frontend authentication flow is:

1. Login, registration, or OTP verification calls an auth endpoint.
2. The backend issues access and refresh JWTs and sets both cookies.
3. Protected requests use the access cookie.
4. A 401 response triggers one shared refresh request.
5. The backend validates and rotates the refresh token, sets replacement cookies, and the original request is retried.
6. Logout revokes the stored refresh token and clears both cookies.

Relevant files:

- `backend/app/api/routes/auth.py`
- `backend/app/api/dependencies.py`
- `backend/app/core/security.py`
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/services/auth.ts`
- `frontend/src/services/api.ts`
- `frontend/src/services/baseUrl.ts`

## Local Cookie Host Rule

`localhost` and `127.0.0.1` must not be mixed during local development. They are different browser sites, so a cookie issued while using one host may not be sent when requests use the other host. With the backend's default `SameSite=Lax` policy, this causes the following pattern:

```text
POST /api/auth/login/password       200
GET  /api/patient/session-status    401
POST /api/auth/refresh               401
```

The frontend now uses `frontend/src/services/baseUrl.ts` to normalize loopback hosts and `frontend/.env` defaults to `http://localhost:8000`. Restart Vite after changing `.env`, and open the frontend at `http://localhost:5173`.

If stale cookies remain in the browser after changing hosts, clear the site cookies once and log in again.

## Main Patient Journey

1. Landing page
2. Patient identification/login
3. Consent
4. Adaptive interview
5. Triage alert when a deterministic red flag is detected
6. Previous document upload and OCR
7. AI-assisted clinical summary review
8. Visit completion and queue token
9. Profile and continuity history

Protected patient routes live under `/patient/*`. Physician routes are under `/physician/*`. Route access is enforced by `frontend/src/routes/ProtectedRoute.tsx`.

## API Areas

The backend routes are grouped by feature:

- `/api/auth`: registration, password/OTP login, session lookup, refresh, logout
- `/api/consent`: consent records
- `/api/interview`: interview sessions, questions, answers, progress, completion
- `/api/documents`: document upload, extraction, listing, download, deletion
- `/api/summary`: clinical-summary generation and review
- `/api/patient`: patient session status, locations, profile, and visit continuity
- `/api/physician`: queue and patient consultation data
- `/api/lab`: laboratory workflow
- `/api/abdm`: ABDM-related integration endpoints

## Validation Commands

### Frontend

```powershell
cd frontend
npm run build
npm run test
npm run lint
```

`npm run build` performs TypeScript checking and creates the Vite production bundle.

### Backend

```powershell
cd backend
python -m pytest -v
```

The tests use an in-memory `mongomock` fixture and should not require a live MongoDB instance.

## Known Validation Notes

- The frontend build currently passes after the cookie-host fix.
- Some frontend lint errors may exist in unrelated pre-existing files.
- The current backend auth test file imports a legacy `login` symbol that is not exposed by `backend/app/api/routes/auth.py`; this is a test compatibility issue separate from the browser cookie fix.
- Do not use real API keys, database credentials, or JWT secrets in documentation, commits, screenshots, or issue reports.

## Change Guidelines

- Preserve HttpOnly cookie authentication; do not move JWTs into localStorage.
- Keep frontend API calls on the same loopback hostname as the browser origin during local development.
- Use the existing service wrappers for authenticated requests.
- Keep backend secrets in environment configuration.
- Run the smallest relevant frontend or backend validation after each authentication change.
