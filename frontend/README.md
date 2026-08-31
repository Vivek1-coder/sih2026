# MediKiosk — Frontend

React 19 patient-facing kiosk and physician dashboard for the MediKiosk pre-consultation system (SIH 2026).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Library | React 19 |
| Language | TypeScript 6 |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS 4 |
| Routing | React Router 7 |
| Speech | Web Speech API (`useSpeech` hook — TTS + STT) |
| HTTP | Native `fetch` via `src/services/api.ts` (cookie auth + silent 401 refresh) |
| Testing | Vitest + Testing Library |

---

## Prerequisites

- **Node.js 22+** (includes npm 10+)
- Backend API running at `http://localhost:8000` (see `backend/README.md`)

---

## Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Configure the API base URL
#    Create .env.local if the backend is not at http://localhost:8000
echo "VITE_API_BASE=http://localhost:8000" > .env.local

# 3. Start the development server with HMR
npm run dev
```

App is available at `http://localhost:5173`.

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server with hot module replacement |
| `npm run build` | TypeScript type-check + production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run test` | Run Vitest test suite once (CI mode) |
| `npm run test:ui` | Run Vitest with interactive browser UI |
| `npm run lint` | Run ESLint on all TypeScript source files |

---

## Patient Journey — Routes

All patient routes under `/patient/*` require authentication. Routes marked **Consent** additionally require the patient to have granted required consent.

| Route | Guard | Description |
|-------|-------|-------------|
| `/` | — | Landing page — kiosk entry point |
| `/patient/identify` | — | Login (ABHA mock, Aadhaar mock, or guest) |
| `/patient/consent` | Auth | Consent collection (DPDP Act aligned) |
| `/patient/interview` | Auth + Consent | **Adaptive multimodal history interview** (Module A) |
| `/patient/triage-alert` | Auth + Consent | Urgent triage notification (auto-navigated on red flag) |
| `/patient/documents` | Auth + Consent | Upload prior reports and prescriptions |
| `/patient/summary` | Auth + Consent | Review and confirm AI-drafted clinical summary |
| `/patient/complete` | Auth + Consent | Visit complete — queue token display |
| `/patient/profile` | Auth + Consent | Patient profile settings |

---

## Physician Dashboard — Routes

| Route | Description |
|-------|-------------|
| `/physician` | Today's patient queue |
| `/physician/patient/:patientId` | Full consultation view — interview transcript, documents, summary |

---

## Interview Module (Module A)

The `/patient/interview` page is the core of the patient experience:

- **Both voice and touch are always available** — mic button for STT, large tappable options for single/scale/multi-choice questions
- **Question types**: `single_choice`, `scale` (0–10), `free_text`, `multi_choice`
- **TTS auto-read** — each new question is read aloud if the patient toggles the accessibility switch
- **Live preview** — last 6 answers shown in the right panel as the session progresses
- **Red-flag auto-navigation** — if the backend returns `triage_required: true`, the page immediately navigates to `/patient/triage-alert` without waiting for a button click
- **Completion auto-navigation** — on `status === "completed"`, navigates to `/patient/documents`
- **Offline/error resilience** — any network error shows a retry button; the interview never shows a permanent spinner

---

## Project Structure

```
frontend/
├── public/                   # Static assets
├── src/
│   ├── components/
│   │   └── common/           # Shared components
│   │       ├── interview.tsx  # Multimodal interview UI (Module A)
│   │       ├── interview.test.tsx
│   │       ├── documents.tsx  # Document upload (Module B)
│   │       ├── patientShell.tsx  # Patient layout wrapper
│   │       ├── field.tsx      # Form input primitives
│   │       └── stepper.tsx    # Progress step indicator
│   ├── context/
│   │   ├── AuthContext.tsx    # Auth state + preferredLanguage
│   │   └── AccessibilityContext.tsx  # Font scale + i18n t()
│   ├── hooks/
│   │   ├── useAuth.ts         # Auth context hook
│   │   ├── useAccessibility.ts
│   │   └── useSpeech.ts       # Web Speech API — TTS + STT
│   ├── pages/                 # Route-level page components
│   ├── routes/
│   │   └── ProtectedRoute.tsx # Auth + consent guard
│   ├── services/
│   │   ├── api.ts             # Base fetch wrapper (credentials + 401 refresh)
│   │   ├── interview.ts       # Interview API calls
│   │   ├── consent.ts
│   │   ├── documents.ts
│   │   └── summary.ts
│   ├── types/
│   │   └── interview.type.ts  # TypeScript types for all interview data
│   ├── App.tsx                # Route definitions
│   └── main.tsx               # React root
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Accessibility & Internationalisation

- All patient-facing text goes through `t(key)` from `AccessibilityContext` (i18n-ready)
- Font scale is applied globally via `AccessibilityContext.largeText`
- All interactive elements have `aria-label`, `role`, and focus management
- `useSpeech` respects the patient's `preferredLanguage` (e.g. `hi-IN`, `en-IN`) for both TTS voice selection and STT recognition language
- Route changes trigger `window.scrollTo` + `#patient-content` focus automatically

---

## Testing

```bash
# Run all tests
npm run test

# Run with coverage
npm run test -- --coverage
```

Current test files:
- `src/components/common/interview.test.tsx` — 8 tests (voice + touch affordances, auto-navigation, error states, progress)
- `src/components/common/documents.test.tsx` — 1 test (document upload flow)

All tests mock `react-router-dom`, `useSpeech`, `useAuth`, and service calls — no real network or browser APIs needed.

---

## Docker

```bash
# Build and serve the production build via the full stack
docker-compose up --build

# Frontend only (development, with hot reload)
docker-compose up frontend
```
