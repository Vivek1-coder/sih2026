# MediKiosk Frontend

The frontend is a React 19 and TypeScript application for the patient kiosk
and physician dashboard. It is built with Vite and communicates with the
FastAPI backend using HTTP-only cookie authentication.

## Features

- Patient login, registration, OTP, guest identification, and session restore.
- English and Hindi translations with browser-language detection.
- Accessible patient workflow with large text, keyboard navigation, focus
  management, and optional Web Speech API TTS/STT.
- Consent, adaptive interview, red-flag triage, document upload, summary
  review, completion, and profile pages.
- Physician queue and patient consultation views.
- Silent access-token refresh with a single shared refresh request.

## Technology

| Area | Technology |
| --- | --- |
| UI | React 19 |
| Language | TypeScript |
| Build | Vite |
| Routing | React Router |
| Styling | Tailwind CSS and project design-system CSS |
| HTTP | Native `fetch` and Axios auth client |
| Icons/charts | lucide-react and Recharts |
| Testing | Vitest, Testing Library, jsdom |

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- Backend API running locally or a deployed API URL

## Local setup

```powershell
npm ci
Copy-Item .env.sample .env.local
npm run dev
```

The development server runs at <http://localhost:5173>.

Configure the API URL in `.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:8000
```

Environment variables are embedded at build time. Rebuild the frontend after
changing `VITE_API_BASE_URL`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite with hot reload |
| `npm run build` | Type-check and create `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run check:i18n` | Check English/Hindi translation parity |

## Application routes

### Patient

| Route | Description |
| --- | --- |
| `/` | Kiosk landing page |
| `/patient/identify` | Patient identification and login |
| `/patient/consent` | Consent collection |
| `/patient/interview` | Adaptive multimodal history interview |
| `/patient/triage-alert` | Urgent symptom escalation |
| `/patient/documents` | Medical document upload |
| `/patient/summary` | Review and confirm clinical summary |
| `/patient/complete` | Visit completion and queue token |
| `/patient/profile` | Patient profile settings |

### Physician

| Route | Description |
| --- | --- |
| `/physician` | Current patient queue |
| `/physician/patient/:patientId` | Patient consultation details |

Protected routes require an authenticated backend session. Consent-protected
routes also require the patient's consent record.

## Project structure

```text
frontend/
├── public/                 # Static assets and favicon
├── src/
│   ├── components/         # Shared UI, interview, documents, and layout
│   ├── context/            # Auth and accessibility state
│   ├── hooks/              # Auth, accessibility, and speech hooks
│   ├── i18n/               # English and Hindi namespaces
│   ├── pages/              # Route-level screens
│   ├── routes/             # Protected route guards
│   ├── services/           # API clients and domain requests
│   ├── types/              # TypeScript domain types
│   ├── App.tsx             # Application routes
│   └── main.tsx            # React entry point
├── Dockerfile
├── nginx.conf
├── package.json
└── vite.config.ts
```

## Authentication and API requests

The browser does not store JWTs in local storage. Login and refresh responses
set `medikiosk_access` and `medikiosk_refresh` as HTTP-only cookies. Requests
use `credentials: "include"`. `src/services/api.ts` retries one 401 after a
shared refresh request; failed refreshes leave the user unauthenticated.

For a deployed frontend and API on different origins, the API must allow the
frontend origin through CORS and issue HTTPS-compatible cookies. See
[`backend/README.md`](../backend/README.md).

## Internationalisation and accessibility

Add matching keys to both `src/i18n/en/` and `src/i18n/hi/`. Use
`useTranslation` for reactive translations and keep API enum values,
identifiers, and patient-entered values unchanged. English and Hindi are the
currently supported languages.

Use the shared loading and progress components for pending states. Forms
should disable submit controls while requests are in progress and expose
appropriate status announcements.

## Testing

```powershell
npm run lint
npm run build
npm run test
npm run check:i18n
```

Tests mock routing, speech APIs, authentication, and service calls, so they
do not require a running backend.

## Docker and deployment

Build the production image:

```powershell
docker build --build-arg VITE_API_BASE_URL=https://sih2026-t80s.onrender.com -t medikiosk-frontend .
docker run --rm -p 5173:80 medikiosk-frontend
```

The image builds the Vite app and serves `dist/` through Nginx. The Vercel
configuration uses `npm ci`, `npm run build`, and `dist` as the output.
