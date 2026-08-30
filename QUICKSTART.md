# MediKiosk Quick Start Guide

**Status**: Ready for Phase 0 implementation  
**See also**: `IMPLEMENTATION_PLAN.md` (comprehensive), `context.md` (architecture)

---

## 🚀 Getting Started (Development)

### Frontend Setup
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

### Backend Setup
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Unix: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload  # http://localhost:8000
```

### Verify Everything Works
```bash
# Terminal 1: Frontend
cd frontend && npm run dev

# Terminal 2: Backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Terminal 3: Test
curl http://localhost:8000/health
# Expected: {"status": "healthy"}
```

---

## 🎯 What is MediKiosk?

**AI-powered clinical history platform** for Indian hospitals addressing the bottleneck where patients repeat their medical history to multiple doctors.

### 5-Step Patient Journey
1. **Identify** - Login via ABHA/Aadhaar mock or guest
2. **Converse** - Answer adaptive medical questions (voice + touch)
3. **Scan** - Upload past medical documents
4. **Summarize** - AI generates structured clinical summary
5. **Consult** - Doctor receives prepared history

### Key Features
- 🎤 **Voice + Touch Input** - Accessible to all patients
- 🤖 **AI-Powered** - Claude API for summarization, red-flag detection
- 🔒 **Privacy-First** - Demo mode, no real PII, clearly labeled mocks
- 🌍 **7 Languages** - React i18n ready
- ♿ **Accessibility** - WCAG 2.1 AA, keyboard navigation
- 📋 **ABDM Ready** - Mock FHIR integration path

---

## 📦 Current Project Structure

```
sih2026/
├── frontend/              # React + TypeScript + Vite
│   ├── src/
│   │   ├── pages/        # Landing, Identify, Interview, Documents, Summary, etc.
│   │   ├── components/   # UI components (header, footer, consent, etc.)
│   │   ├── routes/       # AppRoutes, ProtectedRoute
│   │   └── types/        # TypeScript interfaces
│   ├── package.json      # React 19, Tailwind CSS, Vite
│   └── index.html
│
├── backend/               # Python FastAPI
│   ├── app/
│   │   ├── main.py      # FastAPI app entry
│   │   ├── core/        # Config, security settings
│   │   ├── models/      # DB/domain models (to be extended)
│   │   ├── schemas/     # Pydantic request/response
│   │   ├── api/routes/  # API endpoints
│   │   └── services/    # (To be created: LLM, OCR, ASR, ABDM)
│   ├── requirements.txt  # FastAPI, Pydantic, etc.
│   └── .env            # Secrets (gitignored)
│
├── context.md           # Full architecture & tech stack
├── IMPLEMENTATION_PLAN.md # Phase-by-phase roadmap
└── README.md            # Project intro
```

---

## 🔑 Key Tech Stack

### Frontend
- React 19 + TypeScript (strict)
- Vite (builder)
- Tailwind CSS (styling)
- React Router v7 (routing)
- Web Speech API (voice I/O)
- i18next (i18n)
- Lucide React (icons)
- TanStack Query (server state) - *To add in Phase 0*
- Vitest + React Testing Library - *To add in Phase 0*

### Backend
- FastAPI (web framework)
- Pydantic v2 (validation)
- SQLModel + SQLAlchemy (ORM) - *To add in Phase 0*
- PyJWT + passlib (auth)
- Uvicorn (ASGI server)
- Pytest - *To add in Phase 0*

### AI Services (Mock/Pluggable)
- Claude API (via `ClinicalLLMService`)
- Web Speech API (ASR/TTS)
- Mock OCR (`DocumentOCRService`)
- Mock ABDM (`AbdmService`)

---

## 🎯 Phase 0: Foundation (Starting Point)

**Goal**: Add dependencies and scaffolding without breaking the build

### Dependencies to Add

**Frontend** (`package.json`):
```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.x",
    "i18next": "^23.x",
    "react-i18next": "^13.x"
  },
  "devDependencies": {
    "vitest": "^1.x",
    "@testing-library/react": "^14.x",
    "@testing-library/jest-dom": "^6.x"
  }
}
```

**Backend** (`requirements.txt`):
```
sqlmodel==0.0.14
alembic==1.13.0
pytest==7.4.3
httpx==0.25.2
python-jose[cryptography]==3.3.0
pyotp==2.9.0
```

### Files to Create in Phase 0

**Frontend**:
- `src/i18n/` directory with `en.json` + 6 language stubs
- `vitest.config.ts` (test runner config)
- `src/__tests__/` directory (test scaffold)
- `src/context/AuthContext.tsx` (placeholder)

**Backend**:
- `app/services/` directory with 4 service files (asr, llm, ocr, abdm)
- `app/core/database.py` (DB session management)
- `backend/tests/` directory
- Update `app/main.py` to add CORS middleware

### Success Criteria
```bash
npm run build && npm run lint  # Frontend builds cleanly
uvicorn app.main:app --reload # Backend starts
curl http://localhost:8000/health  # Returns 200
```

---

## 🔄 Workflow: Each Phase

1. **Create/modify files** for the phase tasks
2. **Run tests**: `pytest backend/ -v` and `npm run test`
3. **Verify builds**: `npm run build` and `npm run lint`
4. **Test end-to-end**: Frontend ↔ Backend integration
5. **Document changes** in phase completion summary
6. **Move to next phase** only after verification passes

---

## 📋 API Contract (Preview)

All endpoints prefixed with `/api/`:

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/login` | Patient login (ABHA/Aadhaar mock/guest) |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/consent` | Record consent |
| GET | `/consent/{patient_id}` | Fetch consent status |
| POST | `/interview/session` | Start interview session |
| POST | `/interview/session/{id}/answer` | Submit answer → next question |
| POST | `/documents/upload` | Upload medical document |
| GET | `/documents/{id}/status` | Poll OCR status |
| POST | `/summary/generate` | Generate clinical summary via LLM |
| PATCH | `/summary/{id}` | Physician edits summary |
| POST | `/abdm/push/{summary_id}` | Mock FHIR push |
| GET | `/physician/queue` | Physician dashboard queue |

*Full endpoint list in `IMPLEMENTATION_PLAN.md`*

---

## 🔒 Security Notes (Demo Mode)

- ✅ No real ABHA/Aadhaar/PII stored or validated
- ✅ All mock data labeled "MOCK" in responses
- ✅ JWT secrets in `.env` (never in code)
- ✅ Rate-limiting on auth endpoints (to add)
- ✅ File upload validation before OCR (to add)
- ✅ Consent notice visible on first entry (to add)
- ⚠️ This is a **demo/hackathon build** — NOT for production with real patient data

---

## 📚 File Navigation

### Must Read
- **`IMPLEMENTATION_PLAN.md`** - Complete 8-phase roadmap with file lists
- **`context.md`** - Architecture, tech stack, data models
- **This file** - Quick start + Phase 0 overview

### Frontend Entry Points
- `frontend/src/App.tsx` - Route dispatcher
- `frontend/src/pages/landing.tsx` - Current homepage
- `frontend/src/pages/identify.tsx` - Login page (to be wired to API)
- `frontend/src/components/layout/header.tsx` - Navigation

### Backend Entry Points
- `backend/app/main.py` - FastAPI app + current endpoints
- `backend/app/core/config.py` - Settings (JWT, OTP secrets)
- `backend/app/core/security.py` - Auth utilities (to expand)

---

## 🚦 Running Phase 0

```bash
# 1. Install new dependencies
cd frontend && npm install
cd ../backend && pip install -r requirements.txt

# 2. Create directories and scaffolds
mkdir -p frontend/src/i18n
mkdir -p frontend/src/__tests__
mkdir -p frontend/src/context
mkdir -p backend/app/services
mkdir -p backend/tests

# 3. Add Phase 0 files (from IMPLEMENTATION_PLAN.md)

# 4. Verify everything works
cd frontend && npm run build && npm run lint
cd ../backend && pytest -v

# 5. Start dev servers
# Terminal 1
cd frontend && npm run dev

# Terminal 2
cd backend && uvicorn app.main:app --reload
```

---

## ❓ FAQ

**Q: Can I skip a phase?**  
A: No. Each phase builds on previous ones. Follow the order strictly.

**Q: What if the build breaks?**  
A: Revert changes and check the phase instructions. Each phase should be independently verifiable.

**Q: Where do I see the AI magic?**  
A: Phases 3 (red-flag detection) and 5 (summary generation) use Claude API via service interfaces.

**Q: How is this different from real ABDM?**  
A: Everything labeled "MOCK" returns fake but realistic data. Production would swap in real ABDM/Bhashini APIs.

**Q: How do I add new languages?**  
A: Add language JSON file to `src/i18n/` in Phase 7. The structure is: `{ "key": "translated_text" }`.

**Q: What about mobile?**  
A: Responsive design built in (Tailwind CSS). Tested on mobile viewport widths in each phase.

---

## 📞 Support

- **Architecture questions**: See `context.md`
- **Implementation details**: See `IMPLEMENTATION_PLAN.md`
- **Code issues**: Check phase verification steps
- **Tech stack questions**: Refer to individual library docs (React, FastAPI, Tailwind, etc.)

---

**Last Updated**: 2026-08-29  
**Phase 0 Status**: Ready to begin  
**Estimated Total Time**: ~20 days (depends on parallelization)
