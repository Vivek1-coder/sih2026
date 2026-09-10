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
# English/Hindi and loading states

Translations live in `src/i18n/en/<namespace>.json` and the matching `hi` file. Add the same key to both files, then use `useTranslation('<namespace>')` and `t('key')` in a component. Existing components also use the reactive accessibility context and the `ui('namespace:key', values)` compatibility helper. Keep API enum values, React keys, identifiers and patient-entered text unchanged; translate their display labels. Use interpolation and plural keys for variable sentences, and `formatDate` / `formatNumber` from `src/i18n` for displayed values.

The navbar offers EN / हिंदी. i18next detects the browser language on first use, falls back to English and stores an explicit selection under `medikiosk-language` in localStorage. Language changes do not remount active forms. The root uses `I18nextProvider`; components calling the standalone `ui` helper must also subscribe through `useTranslation` or `useAccessibility`.

For a future language, add matching namespace JSON files, extend `supportedLngs`, the eager resource glob and language/locale helpers in `src/i18n`, and `supportedLanguages` in `locales.ts`. Extend backend request validation and clinical translations before advertising that language. English and Hindi are the supported languages today.

Use the shared `Loader`, `Skeleton` and `ProgressIndicator` components in `src/components/common`. Their status regions announce progress politely and expose `aria-busy`; pending forms disable their submit controls. Fetch requests have a 45-second deadline (auth: 15 seconds), route chunks have a 20-second deadline, and document polling stops after two minutes with retry controls. Processing stages come from the server's persisted `processing_stage`; they are not simulated percentages. Retrying a failed upload means selecting the file again; a timeout does not guarantee the server cancelled the operation, so inspect the refreshed record before uploading again.

Interview start/answer requests include `preferred_language`; API requests also send `Accept-Language`. Scripted Hindi questions and option labels are in `questions.json`, mirrored in `backend/app/data/questions_hi.json`. Stored option values stay language-neutral. Groq receives the language for follow-ups and summaries. A translated view of an existing summary does not overwrite the reviewed record. Without Groq, scripted questions and known structured values still translate; free-form patient narrative and source-document text remain verbatim rather than receiving an invented translation.

Public backend errors return stable `code` values plus field/type codes for validation. Register new errors in `backend/app/data/message_codes.json` and add both language strings in `errors.json`. UI errors are translated when rendered, so an existing error can follow a language change.

Run `npm run check:i18n`, `npm run lint`, `npm run build`, and `npm test`. The multilingual regression tests cover active-flow switching, persistence, API language headers, request loading and timeout/retry behavior. Vitest isolates modules so mock providers cannot leak between workflow tests.
