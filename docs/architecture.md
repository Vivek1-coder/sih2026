# System Architecture

## High-level flow

```text
Patient / Physician
        |
        v
React + TypeScript Frontend
        |
        | HTTPS requests with HTTP-only cookies
        v
FastAPI Backend API
        |
        +--------------------> MongoDB
        |                       |
        |                       +--> Users, visits, consent, summaries,
        |                            documents, prescriptions, and lab data
        |
        +--------------------> Supabase S3 Storage
        |                       |
        |                       +--> Uploaded medical documents
        |
        +--------------------> Clinical Workflow Services
        |                       |
        |                       +--> Consent, interview, triage, summary,
        |                            physician queue, prescriptions, and labs
        |
        +--------------------> Optional Groq AI Service
                                |
                                +--> Interview follow-up questions
                                     and contextual summaries
        |
        v
Frontend displays the patient or physician result
```

[Open Image](./architecture.png)

## Components

### Frontend

The React and TypeScript application provides the patient kiosk and physician
dashboard. It handles authentication, consent, the clinical interview,
document upload, summary review, visit completion, patient profiles, and
physician consultation views. English and Hindi translations and accessibility
features are handled in the frontend.

### Backend API

The FastAPI service exposes the `/api` endpoints used by the frontend. It
validates requests with Pydantic schemas, coordinates the clinical workflow,
enforces authentication and consent requirements, and returns patient and
physician data.

### Authentication and authorization

The backend issues short-lived access tokens and rotating refresh tokens in
HTTP-only cookies. Protected routes use the authenticated patient or physician
identity, while consent-protected routes also require the patient’s consent
record. Production cross-origin requests use HTTPS-compatible cookies and
credentialed CORS.

### Clinical workflow services

The backend services manage patient identification, consent, adaptive
interviews, deterministic red-flag triage, document processing, clinical
summaries, physician queues, prescriptions, and laboratory records. Red-flag
triage can route urgent cases without depending on an external AI service.

### Optional AI service

Groq can generate contextual interview follow-up questions and support summary
generation. The interview flow has a scripted fallback, so core patient
workflow functionality does not require the optional AI integration.

### MongoDB

MongoDB stores application records, including users, authentication sessions,
patient visits, consent records, interview answers, summaries, physician
workflow data, prescriptions, and laboratory records.

### Supabase S3-compatible storage

Uploaded medical documents are stored in the configured Supabase
S3-compatible bucket. MongoDB stores the document metadata and references
needed by the backend.

## Data flow

1. A patient or physician opens the frontend and signs in.
2. The frontend sends credentialed requests to the FastAPI backend.
3. The backend validates the request, authenticates the user, and checks
   consent where required.
4. Workflow services read and write structured records in MongoDB.
5. Documents are uploaded to object storage and linked to their MongoDB
   metadata records.
6. The optional Groq integration generates contextual content when configured;
   deterministic clinical rules remain responsible for red-flag triage.
7. The backend returns the workflow state or result to the frontend.

## Deployment

The frontend is deployed as a Vite build served by Vercel or Nginx. The
backend runs as a FastAPI/Uvicorn service on Render or Docker. Production
configuration supplies the frontend origin, MongoDB URI, JWT secrets, storage
credentials, and optional Groq credentials through environment variables.
Local development can run the frontend, backend, and MongoDB together with
`docker compose`.