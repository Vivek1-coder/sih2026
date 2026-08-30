# MediKiosk Implementation Guide
## PS047: AI-powered Clinical History Software Platform

> **MediKiosk** is a demo healthcare application solving the clinical history-taking bottleneck in Indian hospitals. Patients answer questions once (voice + touch), AI generates structured summaries, doctors get prepared consultations.

---

## 📚 Documentation Hierarchy

Start here and follow in order:

### 1. **This File** (`README_IMPLEMENTATION.md`)
   - Overview and navigation guide
   - High-level architecture
   - Getting started checklist

### 2. **`SETUP_CHECKLIST.md`** (5 min read)
   - Environment verification
   - Pre-implementation prerequisites
   - Phase 0 readiness check

### 3. **`QUICKSTART.md`** (10 min read)
   - How to run frontend + backend
   - Current project structure
   - Phase 0 overview
   - FAQ

### 4. **`IMPLEMENTATION_PLAN.md`** (Primary Reference)
   - **Complete phase-by-phase breakdown**
   - File lists for each phase
   - Code architecture patterns
   - Acceptance criteria
   - ~60 minute read for complete understanding

### 5. **`context.md`** (Architecture Reference)
   - Tech stack details
   - Data models
   - API contract overview
   - Security considerations

---

## 🎯 What is MediKiosk?

### The Problem (PS047)
Indian hospitals face a critical inefficiency: patients repeat their medical history to multiple doctors during a single visit, causing:
- ⏱️ Wasted consultation time
- 😤 Patient frustration (repeating trauma/embarrassment)
- ❌ Information loss/inconsistency
- 📉 Poor diagnostic accuracy

### The Solution
**MediKiosk**: A self-service kiosk + digital platform where patients:
1. Answer medical history questions **once** (voice or touch)
2. Upload past medical documents
3. Receive AI-generated structured clinical summary
4. Doctors consult with **complete, organized history ready**

### Why MediKiosk?
- 🎤 **Voice-First** - Accessible to non-literate patients
- 🤖 **AI-Powered** - Adaptive questions, red-flag detection, smart summarization
- 🔒 **Privacy-First** - DPDP Act 2023 compliant, granular consent
- 🌍 **Multilingual** - 7 Indian languages built-in
- ♿ **Accessible** - WCAG 2.1 AA, keyboard-only navigation
- 📋 **Standards-Ready** - FHIR/ABDM integration path (mocked in demo)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        MediKiosk                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FRONTEND (React 19 + TypeScript + Tailwind)              │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Landing → Identify → Consent → Interview →           │ │
│  │          Documents → Summary → Consult (physician)    │ │
│  │                                                      │ │
│  │ Features:                                            │ │
│  │ • Voice + Touch input (Web Speech API)              │ │
│  │ • 7-language support (i18next)                      │ │
│  │ • Accessibility-first (keyboard nav, screen reader) │ │
│  └──────────────────────────────────────────────────────┘ │
│                           ↕ (HTTP)                         │
│  BACKEND (FastAPI + SQLModel + Claude API)               │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ • JWT Auth (access + refresh tokens)                │ │
│  │ • Interview Engine (ontology + LLM-driven Q&A)     │ │
│  │ • Red-Flag Detection (clinical rules + AI)         │ │
│  │ • Document OCR (mock extraction pipeline)          │ │
│  │ • Clinical Summary (Claude API integration)        │ │
│  │ • Physician Queue (prioritized by red flags)       │ │
│  │ • ABDM/FHIR Push (mock for demo)                  │ │
│  └──────────────────────────────────────────────────────┘ │
│                           ↕                               │
│  DATA (SQLite local, PostgreSQL production)              │
│  ├── Patients                                             │
│  ├── Consent Records                                      │
│  ├── Interview Sessions & Answers                        │
│  ├── Documents & Extractions                            │
│  └── Clinical Summaries                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Node.js v18+ and npm v10+
- Python 3.10+ and pip
- Git

### Run Locally
```bash
# Terminal 1: Frontend
cd frontend
npm install
npm run dev              # http://localhost:5173

# Terminal 2: Backend
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Unix: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload  # http://localhost:8000

# Terminal 3: Verify
curl http://localhost:8000/health
# Expected: {"status": "healthy"}
```

Visit http://localhost:5173 in browser to see MediKiosk.

---

## 📋 Implementation Roadmap (8 Phases)

| Phase | Title | Duration | Status |
|-------|-------|----------|--------|
| 0 | Foundation & Tooling | 1-2d | 📋 Ready |
| 1 | Auth & Identify | 2-3d | ⏳ Next |
| 2 | Consent | 1-2d | ⏳ Future |
| 3 | Interview Engine | 3-4d | ⏳ Future |
| 4 | Document Digitization | 2-3d | ⏳ Future |
| 5 | Summary Generator | 2-3d | ⏳ Future |
| 6 | ABDM & Physician Queue | 2d | ⏳ Future |
| 7 | Accessibility & i18n | 2-3d | ⏳ Future |
| 8 | Tests & Deployment | 2-3d | ⏳ Future |
| | **TOTAL** | **~20 days** | |

**See `IMPLEMENTATION_PLAN.md` for complete phase breakdown.**

### Current Status
- ✅ Project rebranded to "MediKiosk"
- ✅ Documentation created (context.md, IMPLEMENTATION_PLAN.md, etc.)
- ⏳ **Phase 0 ready to start**

---

## 🎯 5-Step Patient Journey

```
IDENTIFY
   ↓
   Patient logs in via ABHA/Aadhaar mock or guest
   Returns JWT access/refresh tokens
   
   ↓
CONSENT
   ↓
   Granular toggles: history sharing, document upload, AI summary, ABDM push
   Audio explanation per consent category (TTS)
   Cannot proceed until required consents granted
   
   ↓
CONVERSE (Interview)
   ↓
   Adaptive questions driven by clinical ontology + LLM
   Input: Voice (Web Speech API) or Touch (tappable options)
   Red-flag detection triggers priority alerts
   Chief complaint → SOCRATES for pain → ROS → AYUSH mode (if applicable)
   
   ↓
SCAN (Documents)
   ↓
   Upload past reports (prescriptions, lab results, discharge summaries)
   Drag-drop + camera capture
   Mock OCR extracts: diagnoses, medications, investigations
   Chronological timeline with abnormal values highlighted
   
   ↓
SUMMARIZE
   ↓
   AI generates structured clinical summary:
     Chief Complaint → HPI → Past Medical/Surgical → Drug & Allergy
     → Family → Personal → ROS → Prior Investigations → AYUSH (if applicable)
   Patient reviews with audio read-back (bilingual)
   Confirms or requests changes
   
   ↓
CONSULT
   ↓
   Summary marked "confirmed"
   Mock FHIR push to ABDM (returns fake Bundle ID)
   Physician sees patient in prioritized queue
   Physician sees full consultation-ready view:
     • Summary (can edit + re-confirm)
     • Documents with extractions
     • Red-flag alerts
   Doctor consults with complete prepared context
```

---

## 🔑 Key Features by Phase

### Phase 0: Scaffolding
- Dependency setup (TanStack Query, i18next, SQLModel, pytest)
- i18n framework with locale stubs
- Service interfaces for AI/external calls
- Database session management

### Phase 1-2: Authentication & Consent
- JWT token issuing/verification
- Mock ABHA/Aadhaar/guest login
- Granular, revocable consent with audio explanation

### Phase 3: Adaptive Interview
- **Clinical Ontology** (JSON) - Chief complaint branches + SOCRATES framework
- **Question Engine** - Deterministic branches → LLM for free-text follow-ups
- **Red-Flag Detection** - Hardcoded rules + LLM-assisted pattern matching
- **Dual-Mode Input** - Voice (Web Speech API) + Touch (tappable options)
- **AYUSH Support** - Dashavidha Pariksha for Ayurvedic consultations

### Phase 4: Document Processing
- Mock OCR extraction (diagnoses, medications, lab investigations)
- Chronological sorting by document date
- Abnormal lab value detection against reference ranges
- Drag-drop + camera capture upload

### Phase 5: AI Summary
- **Claude API Integration** - Structured prompt for history compilation
- Standard sections following medical curricula
- Physician edit + confirm flow
- Bilingual audio read-back for patient review

### Phase 6: Physician Queue
- Mock FHIR/ABDM push (returns fake Bundle ID)
- Physician dashboard with prioritized queue
- Full consultation-ready view per patient
- Red-flag sorting (urgent first)

### Phase 7: Accessibility & i18n
- Full keyboard navigation + screen reader support
- Accessible font-size toggle (CSS variable)
- 2+ complete non-English locales (Hindi + regional language)
- Stepper progress tracking through 5-step journey

### Phase 8: Tests & Deployment
- Backend pytest coverage (auth, interview, red-flags, summary)
- Frontend vitest smoke tests (interview, documents, summary)
- Docker setup (Dockerfile.frontend, Dockerfile.backend, docker-compose.yml)
- Final documentation

---

## 📊 API Overview

All endpoints prefixed `/api/`:

### Authentication
```
POST   /auth/login          # abha_mock | aadhaar_mock | guest → JWT
POST   /auth/refresh        # Refresh access token
POST   /auth/logout         # Invalidate session
POST   /auth/otp/verify     # Verify mock OTP
```

### Consent
```
POST   /consent             # Record patient consent
GET    /consent/{patient_id}# Fetch consent status
```

### Interview
```
POST   /interview/session   # Start new session → first question
POST   /interview/session/{id}/answer   # Submit answer → next question + red-flags
POST   /interview/session/{id}/complete # Mark complete
GET    /interview/session/{id}          # Fetch full Q&A
```

### Documents
```
POST   /documents/upload           # Upload file (multipart)
GET    /documents/{id}/status      # Poll OCR status
GET    /documents/patient/{patient_id}  # List docs + extractions
```

### Summary
```
POST   /summary/generate      # Generate via LLM
GET    /summary/{id}          # Fetch summary
PATCH  /summary/{id}          # Physician edits + confirm
```

### Physician
```
POST   /abdm/push/{summary_id}     # Mock FHIR push
GET    /physician/queue            # Prioritized queue
GET    /physician/patient/{id}/summary  # Full consult view
```

**Full API details in `IMPLEMENTATION_PLAN.md`**

---

## 🔐 Security & Privacy

### Demo Mode Highlights
- ✅ No real ABHA/Aadhaar/PII stored or verified
- ✅ All mock data labeled "MOCK" in API responses
- ✅ JWT secrets in `.env` (gitignored, never in code)
- ✅ DPDP Act 2023 / consent notice visible on first entry
- ✅ Rate-limiting on auth/OTP endpoints
- ✅ File upload validation (type + size) before OCR

### This is NOT Production-Ready
⚠️ For production use with real patient data:
- Integrate real ABHA/ABDM APIs (not mocked)
- Use HIPAA/GDPR-compliant database encryption
- Implement proper authentication (Aadhaar OTP flow)
- Wire real AI/ML models (not mock services)
- Add comprehensive audit logging
- Conduct security penetration testing
- Obtain healthcare compliance certifications

---

## 🛠️ Tech Stack

### Frontend
```
React 19 + TypeScript       Build: Vite
Styling: Tailwind CSS       State: React Context + TanStack Query
Routing: React Router v7    Icons: Lucide React
i18n: i18next              Testing: Vitest + React Testing Library
Audio: Web Speech API (ASR/TTS)
```

### Backend
```
FastAPI + Uvicorn          Validation: Pydantic v2
ORM: SQLModel + SQLAlchemy Database: SQLite → PostgreSQL
Auth: PyJWT + passlib       OTP: pyotp
Migration: Alembic         Testing: pytest + httpx
```

### AI Services (Abstracted Behind Service Interfaces)
```
LLM: Claude API (via ClinicalLLMService)
ASR/TTS: Web Speech API (browser) + mocked server
OCR: Mocked DocumentOCRService (real: Tesseract/cloud)
ABDM: Mocked AbdmService (real: ABDM FHIR REST APIs)
```

---

## 📦 Project Structure

```
sih2026/
├── frontend/
│   ├── src/
│   │   ├── pages/           # Landing, Identify, Interview, Documents, etc.
│   │   ├── components/      # Shared UI components + layout
│   │   ├── routes/          # AppRoutes, ProtectedRoute
│   │   ├── types/           # TypeScript interfaces mirroring backend models
│   │   ├── i18n/            # Locale files (en.json, hi.json, etc.)
│   │   ├── context/         # AuthContext, AccessibilityContext
│   │   ├── hooks/           # useAuth, useConsent, useInterview, etc.
│   │   ├── services/        # API client (TanStack Query hooks)
│   │   ├── __tests__/       # Component tests (vitest)
│   │   ├── App.tsx          # Route dispatcher
│   │   ├── App.css          # Component-specific styles
│   │   └── main.tsx         # Entry point
│   ├── package.json         # React 19, Vite, Tailwind, i18next, etc.
│   ├── vite.config.ts
│   ├── vitest.config.ts     # (Added Phase 0)
│   ├── tsconfig.json
│   └── index.html
│
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + routes
│   │   ├── core/
│   │   │   ├── config.py    # Settings (JWT, OTP secrets)
│   │   │   ├── security.py  # Auth utilities
│   │   │   └── database.py  # SQLModel session (Phase 0)
│   │   ├── models/          # Domain/DB models
│   │   │   └── User.model.py
│   │   ├── schemas/         # Pydantic request/response
│   │   │   └── userSchema.py
│   │   ├── api/
│   │   │   ├── routes/      # Endpoint implementations (auth.py, etc.)
│   │   │   └── dependencies.py # Dependency injection
│   │   ├── services/        # (Phase 0) Service interfaces
│   │   │   ├── asr_service.py
│   │   │   ├── llm_service.py
│   │   │   ├── ocr_service.py
│   │   │   └── abdm_service.py
│   │   └── data/
│   │       └── clinical_ontology.json # (Phase 3)
│   ├── tests/               # pytest test suite
│   ├── requirements.txt
│   ├── .env                 # (gitignored) Secrets
│   └── .gitignore
│
├── context.md               # Architecture & tech stack (reference)
├── IMPLEMENTATION_PLAN.md   # Phase-by-phase roadmap (PRIMARY)
├── QUICKSTART.md            # Quick reference + FAQ
├── SETUP_CHECKLIST.md       # Pre-implementation verification
├── README_IMPLEMENTATION.md # This file (navigation guide)
└── README.md                # Original project intro
```

---

## ✅ Getting Started (Right Now)

### Step 1: Verify Prerequisites (5 min)
```bash
node --version          # v18+
npm --version           # v10+
python --version        # 3.10+
git status              # No uncommitted changes
```

### Step 2: Read Setup Checklist (5 min)
```bash
cat SETUP_CHECKLIST.md
# ✅ Verify all prerequisite checkboxes
```

### Step 3: Run Locally (5 min)
```bash
# Terminal 1
cd frontend && npm install && npm run dev

# Terminal 2
cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --reload

# Terminal 3
curl http://localhost:8000/health
# Expected: {"status": "healthy"}
```

### Step 4: Understand Architecture (30 min)
```bash
cat context.md           # Tech stack & data models
cat QUICKSTART.md        # Quick reference
```

### Step 5: Begin Phase 0 (1-2 days)
```bash
# Read comprehensive phase breakdown
cat IMPLEMENTATION_PLAN.md | grep -A 50 "phase.*0"

# Follow Phase 0 tasks step-by-step
# Create files in order listed
# Verify after each file
# Commit when complete
```

---

## 🎓 Learning Path

1. **Understand the Problem** (PS047) - 5 min
   - Read the problem statement at top of this file
   - Watch: "Clinical History-Taking Bottleneck" concept

2. **Understand the Solution** (MediKiosk) - 15 min
   - Read 5-step journey in this file
   - Read `context.md` for architecture

3. **Understand the Implementation** - 45 min
   - Read `IMPLEMENTATION_PLAN.md` intro (phases overview)
   - Study Phase 0 section thoroughly
   - Understand why service interfaces are important

4. **Code the Foundation** (Phase 0) - 1-2 days
   - Follow Phase 0 tasks step-by-step
   - Create each file with understanding (not copy-paste)
   - Verify at each step

5. **Build Core Features** (Phases 1-3) - ~1 week
   - Auth flow (Phase 1) - understand JWT
   - Consent (Phase 2) - understand granular permissions
   - Interview engine (Phase 3) - understand AI integration

6. **Complete the App** (Phases 4-8) - ~1 week
   - Document processing → Summary → Queue → Polish

---

## 📞 FAQ & Troubleshooting

### "Why mock everything?"
This is a **demo/hackathon build**. Mocking lets us build fast without real government APIs. Production would integrate real ABHA/ABDM. See `IMPLEMENTATION_PLAN.md` non-functional requirements.

### "How do I add a new language?"
Add a new JSON file to `frontend/src/i18n/` (e.g., `te.json` for Telugu). Structure: `{ "key": "translated_text" }`. Wire in `i18n.ts`. See Phase 7.

### "Where do I call Claude?"
Never directly. Use `ClinicalLLMService` abstraction in backend (see Phase 0, Phase 5). This lets us swap providers without changing routes.

### "What about HIPAA/GDPR?"
This demo is **not HIPAA/GDPR compliant** — it's for proof-of-concept. Real production needs:
- Data encryption at rest/transit
- Audit logging
- Compliance certifications
- Data residency controls

### "Can I skip phases?"
**No**. Each phase builds on previous. Skip order → broken build. Follow strictly.

### "What if I break something?"
No problem. Git revert + debug. Each phase is independently verifiable. If build fails, revert to last known-good commit and re-read phase instructions.

---

## 🚦 Next Steps

1. **Read SETUP_CHECKLIST.md** (5 min) - Verify environment
2. **Run locally** (5 min) - `npm run dev` + `uvicorn`
3. **Read IMPLEMENTATION_PLAN.md Phase 0** (30 min) - Understand tasks
4. **Start Phase 0** (1-2 days) - Add dependencies + scaffolds
5. **Commit Phase 0** - `git commit -m "Phase 0: Foundation & Tooling"`
6. **Begin Phase 1** - Follow roadmap

---

## 📚 Resources

### Documentation
- `IMPLEMENTATION_PLAN.md` - **Primary reference** (phases 0-8)
- `context.md` - Architecture & tech stack
- `QUICKSTART.md` - Quick reference & FAQ
- `SETUP_CHECKLIST.md` - Pre-implementation

### Libraries & Frameworks
- [React Docs](https://react.dev)
- [FastAPI Docs](https://fastapi.tiangolo.com)
- [Tailwind CSS](https://tailwindcss.com)
- [React Router](https://reactrouter.com)
- [TanStack Query](https://tanstack.com/query/)
- [i18next](https://www.i18next.com)

### Clinical References
- SOCRATES Framework (pain assessment)
- Dashavidha Pariksha (Ayurvedic assessment)
- FHIR/ABDM Standards

---

## 🤝 Contributing

- Follow phase order strictly
- Test after each file creation
- Never hardcode strings (use i18n)
- Never commit secrets (.env)
- Use TypeScript strict mode
- Add JSDoc to exported functions
- Document deferred work

---

**Last Updated**: 2026-08-29  
**Phase Status**: Phase 0 ready to begin  
**Estimated Completion**: ~20 days (8 phases)  

---

**Welcome to MediKiosk! 🏥🤖**
