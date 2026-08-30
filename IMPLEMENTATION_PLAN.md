# MediKiosk Implementation Plan
## PS047: AI-powered Clinical History Software Platform

**Document Version**: 1.0  
**Target**: Full-stack React + FastAPI implementation for SIH 2026  
**Constraint**: Demo/hackathon build with mocked government APIs and no real PII/PHI  

---

## 📋 Executive Summary

This document provides a phase-by-phase roadmap to transform MediKiosk from a basic landing page into a fully functional AI-powered clinical history platform supporting:

- **Patient Journey**: 5-step workflow (Identify → Converse → Scan → Summarize → Consult)
- **AI Components**: Adaptive questioning, red-flag detection, document OCR, clinical summarization
- **Accessibility**: Voice + touch input, keyboard navigation, 7-language support
- **Healthcare Standards**: FHIR/ABDM integration (mocked), AYUSH support, consent management

---

## 🎯 Core Requirements

### Global Instructions
1. **Extend, don't restructure** - Keep existing folder structure and naming conventions
2. **Type safety** - TypeScript strict mode, no `any` without justification
3. **Accessibility first** - Every component keyboard-navigable with aria-* attributes
4. **i18n always** - Never hardcode English strings in JSX; use translation dictionary
5. **Mocked services** - All external integrations (ABHA/ABDM/LLM) behind service interfaces
6. **No real PII** - Demo mode; clearly label all mock data
7. **Testing** - Unit tests for backend (pytest), smoke tests for frontend (vitest)
8. **No secrets in code** - All config via .env / settings

---

## 🏗️ Tech Stack

### Frontend
- **React 19** + **TypeScript** (strict mode)
- **Vite** (build), **Tailwind CSS** (styling)
- **React Router v7** (routing), **Lucide React** (icons)
- **TanStack Query** (server state) + **React Context** (client state)
- **i18next** (internationalization)
- **Web Speech API** (voice I/O) + **TTS** (text-to-speech)
- **Vitest** + **React Testing Library** (testing)

### Backend
- **FastAPI** (web framework) + **Uvicorn** (ASGI server)
- **Pydantic v2** (validation)
- **SQLModel** / **SQLAlchemy** (ORM) + **Alembic** (migrations)
- **SQLite** (local demo) → PostgreSQL (production)
- **PyJWT** / **python-jose** + **passlib[bcrypt]** (auth)
- **pyotp** (OTP generation)
- **pytest** + **httpx** AsyncClient (testing)

### AI Services (Abstracted)
- **LLM**: Claude API (via `ClinicalLLMService`)
- **ASR/TTS**: Web Speech API (browser) + mocked server interface
- **OCR**: Mocked `DocumentOCRService` (real: Tesseract/cloud)
- **ABDM**: Mocked `AbdmService` returning fake FHIR bundles

---

## 📊 Data Models

### Core Entities
| Entity | Purpose |
|--------|---------|
| **Patient** | User profile (auth_method, language, demographics) |
| **ConsentRecord** | Granular, revocable consent per data category |
| **InterviewSession** | Conversation state & metadata |
| **InterviewAnswer** | Q&A pairs with input mode (voice/touch) |
| **RedFlagAlert** | Clinical red flags triggered during interview |
| **UploadedDocument** | File metadata + OCR processing state |
| **ExtractedDocumentData** | Structured extraction (diagnoses, meds, labs) |
| **ClinicalHistorySummary** | Final compiled history (draft → confirmed) |
| **AyushProfile** | Ayurvedic constitutional assessment |

### Frontend Type Mirrors
All backend Pydantic models mirrored as TypeScript interfaces in `frontend/src/types/`.

---

## 🚀 Implementation Phases

### Phase 0: Foundation & Tooling *(1-2 days)*
**Objective**: Set up dependencies, testing, and service architecture

**Tasks**:
- Add dependencies: TanStack Query, i18next, vitest, SQLModel, pytest
- Create i18n scaffold with `en.json` + 6 stub locales
- Add CORS middleware for Vite dev origin
- Create `backend/app/services/` package with interfaces:
  - `asr_service.py` (mock voice input)
  - `llm_service.py` (mock clinical LLM)
  - `ocr_service.py` (mock document extraction)
  - `abdm_service.py` (mock FHIR push)
- Verify health check & existing login still work

**Files Created/Modified**:
```
frontend/
  ├── package.json (+TanStack Query, i18next, vitest)
  ├── src/i18n/
  │   ├── en.json
  │   ├── hi.json (stub)
  │   └── ...5 more (stub)
  ├── vitest.config.ts
  └── src/__tests__/ (directory)

backend/
  ├── requirements.txt (+SQLModel, alembic, pytest, httpx)
  ├── app/services/
  │   ├── __init__.py
  │   ├── asr_service.py
  │   ├── llm_service.py
  │   ├── ocr_service.py
  │   └── abdm_service.py
  ├── app/core/
  │   └── database.py (new)
  ├── app/main.py (CORS added)
  └── tests/ (directory)
```

**Verification**:
```bash
cd frontend && npm run build && npm run lint
cd backend && uvicorn app.main:app --reload  # verify /health
pytest backend/ -v  # all tests pass
```

---

### Phase 1: Auth & Identify *(2-3 days)*
**Objective**: Implement JWT auth and connect identify.tsx to backend

**Tasks**:
- Complete JWT issuing/verification in `security.py`
- Implement `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout` with mock ABHA/Aadhaar/guest paths
- Wire `identify.tsx` to POST `/api/auth/login`
- Implement token storage (httpOnly cookie or in-memory with refresh rotation)
- Build `AuthContext` for shared auth state
- Update `ProtectedRoute.tsx` to check auth via context

**New Backend Routes**:
```
POST   /api/auth/login        # abha_mock | aadhaar_mock | guest
POST   /api/auth/refresh      # refresh access token
POST   /api/auth/logout       # invalidate session
POST   /api/auth/otp/verify   # mock OTP check
```

**Files Created/Modified**:
```
frontend/
  ├── src/context/AuthContext.tsx (new)
  ├── src/pages/identify.tsx (updated: POST /api/auth/login)
  ├── src/routes/ProtectedRoute.tsx (updated: auth check)
  └── src/hooks/useAuth.ts (new)

backend/
  ├── app/core/security.py (JWT implementation)
  ├── app/models/User.model.py (extended)
  ├── app/schemas/userSchema.py (new)
  ├── app/api/routes/auth.py (new)
  ├── app/main.py (register auth router)
  └── tests/test_auth.py (new)
```

**Verification**:
```bash
# Frontend
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"auth_method":"abha_mock"}'

# Should return: {"access_token": "...", "refresh_token": "...", "token_type": "bearer"}

# Backend tests
pytest backend/tests/test_auth.py -v
```

---

### Phase 2: Consent *(1-2 days)*
**Objective**: Build granular, revocable consent flow

**Tasks**:
- Implement `ConsentRecord` model + `/api/consent` endpoints
- Build `consent.tsx`: granular toggles (history sharing, document upload, AI summary, ABDM push)
- Wire TTS for audio explanation of each category in patient's language
- Block progression to interview until required consents granted
- Add consent status check in `ProtectedRoute`

**New Backend Routes**:
```
POST   /api/consent           # record consent
GET    /api/consent/{patient_id}  # fetch status
```

**Files Created/Modified**:
```
frontend/
  ├── src/pages/consent.tsx (updated: granular toggles)
  ├── src/components/common/consentToggle.tsx (new)
  ├── src/hooks/useConsent.ts (new)
  └── src/App.tsx (route guard for /patient/consent)

backend/
  ├── app/models/ConsentRecord.model.py (new)
  ├── app/schemas/consentSchema.py (new)
  ├── app/api/routes/consent.py (new)
  └── tests/test_consent.py (new)
```

**Verification**:
```bash
# POST consent, verify required consents block interview route
# TTS playback for consent text in browser DevTools
pytest backend/tests/test_consent.py -v
```

---

### Phase 3: Conversational History Engine *(3-4 days)*
**Objective**: Implement adaptive questioning with AI red-flag detection

**Tasks**:
- Create clinical ontology (JSON) covering chief complaints + SOCRATES framework
- Implement adaptive question engine (deterministic branches → LLM for free-text)
- Build red-flag rules (chest pain + dyspnea, stroke keywords, etc.)
- Add AYUSH mode for Ayurvedic departments
- Build `interview.tsx`: dual-mode (tappable options + voice input)
- Show priority banner on red-flag response

**Backend Logic**:
- `InterviewSession` → `InterviewAnswer` models
- Question branching engine (ontology-driven)
- Red-flag detection rules (hardcoded + LLM-assisted)
- SOCRATES field extraction for pain complaints

**New Backend Routes**:
```
POST   /api/interview/session              # start new session
POST   /api/interview/session/{id}/answer  # submit answer → next question
POST   /api/interview/session/{id}/complete
GET    /api/interview/session/{id}
```

**Files Created/Modified**:
```
frontend/
  ├── src/pages/interview.tsx (updated: voice + touch modes)
  ├── src/components/common/questionRenderer.tsx (new)
  ├── src/hooks/useVoiceInput.ts (new)
  ├── src/utils/audioUtils.ts (new: TTS/ASR wrappers)
  └── src/__tests__/interview.test.tsx (new)

backend/
  ├── app/data/clinical_ontology.json (new)
  ├── app/models/InterviewSession.model.py (new)
  ├── app/models/InterviewAnswer.model.py (new)
  ├── app/models/RedFlagAlert.model.py (new)
  ├── app/schemas/interviewSchema.py (new)
  ├── app/api/routes/interview.py (new)
  ├── app/services/interview_engine.py (new)
  ├── app/services/red_flag_detector.py (new)
  ├── tests/test_interview.py (new)
  └── tests/test_red_flags.py (new)
```

**Verification**:
```bash
# Voice input (browser test)
# Test red-flag scenario: "chest pain" + "shortness of breath"
# Verify /api/interview/session returns next question + red-flag alert

pytest backend/tests/test_interview.py backend/tests/test_red_flags.py -v
npm run test -- interview.test.tsx
```

---

### Phase 4: Document Digitization *(2-3 days)*
**Objective**: File upload + OCR extraction

**Tasks**:
- Implement `UploadedDocument` + `ExtractedDocumentData` models
- Build file storage (local `uploads/` dir, gitignored)
- Implement mock OCR service (structured extraction + async delay)
- Flag out-of-range lab values against reference ranges
- Implement chronological sorting by document date
- Build `documents.tsx`: drag-drop + camera upload, status timeline

**New Backend Routes**:
```
POST   /api/documents/upload
GET    /api/documents/{id}/status
GET    /api/documents/patient/{patient_id}
```

**Files Created/Modified**:
```
frontend/
  ├── src/pages/documents.tsx (updated: drag-drop, camera)
  ├── src/components/common/uploadDropZone.tsx (new)
  ├── src/components/common/documentTimeline.tsx (new)
  ├── src/__tests__/documents.test.tsx (new)
  └── public/uploads/ (gitignored directory)

backend/
  ├── app/models/UploadedDocument.model.py (new)
  ├── app/models/ExtractedDocumentData.model.py (new)
  ├── app/schemas/documentSchema.py (new)
  ├── app/api/routes/documents.py (new)
  ├── app/services/ocr_service.py (implement mock extraction)
  ├── app/services/lab_reference_ranges.py (new: hardcoded ranges)
  ├── backend/uploads/ (gitignored directory)
  └── tests/test_documents.py (new)
```

**Verification**:
```bash
# Upload a file (multipart)
curl -X POST http://localhost:8000/api/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample.pdf"

# Poll /api/documents/{id}/status until done
# Verify extracted data includes abnormal flags

pytest backend/tests/test_documents.py -v
npm run test -- documents.test.tsx
```

---

### Phase 5: Structured Summary Generator *(2-3 days)*
**Objective**: Merge interview + documents into clinical summary via LLM

**Tasks**:
- Implement `/api/summary/generate` calling `ClinicalLLMService` (Claude API)
- Build prompt template merging InterviewAnswers + ExtractedDocumentData
- Implement PATCH `/api/summary/{id}` for physician edits + confirm
- Build `summary.tsx`: patient bilingual read-back + audio confirmation
- Update `consultationPage.tsx` with AI-drafted messaging disclaimer

**Summary Sections**:
- Chief Complaint
- History of Present Illness (HPI)
- Past Medical/Surgical History
- Drug & Allergy History
- Family History
- Personal History
- Review of Systems (ROS)
- Prior Investigations Summary
- AYUSH fields (if applicable)

**New Backend Routes**:
```
POST   /api/summary/generate
GET    /api/summary/{id}
PATCH  /api/summary/{id}    # physician edits/confirms
```

**Files Created/Modified**:
```
frontend/
  ├── src/pages/summary.tsx (updated: bilingual read-back)
  ├── src/pages/consultationPage.tsx (updated: physician view)
  ├── src/components/common/summarySection.tsx (new)
  ├── src/hooks/useSummary.ts (new)
  └── src/__tests__/summary.test.tsx (new)

backend/
  ├── app/models/ClinicalHistorySummary.model.py (new)
  ├── app/schemas/summarySchema.py (new)
  ├── app/api/routes/summary.py (new)
  ├── app/prompts/clinical_summary_template.txt (new)
  ├── app/services/llm_service.py (implement Claude call)
  └── tests/test_summary.py (new: mock LLM)
```

**Verification**:
```bash
# Generate summary (requires interview + document completed)
curl -X POST http://localhost:8000/api/summary/generate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"session_id":"...", "document_ids":["..."]}'

# Verify standard sections in response
# Read-back audio in browser
pytest backend/tests/test_summary.py -v
```

---

### Phase 6: ABDM/HIS Push & Physician Queue *(2 days)*
**Objective**: Finalize workflow with mock FHIR push + physician dashboard

**Tasks**:
- Implement `abdm_service.py` mock push returning fake FHIR Bundle ID
- Implement `/api/physician/queue` (sorted by priority: red-flags first)
- Implement `/api/physician/patient/{id}/summary` (aggregate view)
- Update `physician.tsx` dashboard with queue + priority badges
- Complete `complete.tsx` confirmation screen (queue position, token)

**New Backend Routes**:
```
POST   /api/abdm/push/{summary_id}
GET    /api/physician/queue
GET    /api/physician/patient/{id}/summary
```

**Files Created/Modified**:
```
frontend/
  ├── src/pages/physician.tsx (updated: queue dashboard)
  ├── src/pages/consultationPage.tsx (updated: full view)
  ├── src/pages/complete.tsx (updated: confirmation + queue)
  ├── src/components/common/queueCard.tsx (new)
  └── src/hooks/usePhysicianQueue.ts (new)

backend/
  ├── app/api/routes/physician.py (new)
  ├── app/services/abdm_service.py (implement mock push)
  └── tests/test_physician.py (new)
```

**Verification**:
```bash
# Confirm summary, trigger ABDM push
# Verify mock FHIR Bundle ID in response
# Check /api/physician/queue shows patient in priority order

pytest backend/tests/test_physician.py -v
```

---

### Phase 7: Accessibility, i18n, & Polish *(2-3 days)*
**Objective**: Full keyboard navigation, 7-language proof

**Tasks**:
- Audit all patient pages for keyboard navigation + screen-reader labels
- Wire `header.tsx` large-text toggle to global font-scale CSS variable
- Fully populate 2+ non-English locales (Hindi + one regional)
- Test all patient flows in multiple languages end-to-end
- Wire `stepper.tsx` state across 5-step journey (allow backward navigation where safe)

**Files Modified**:
```
frontend/
  ├── src/i18n/
  │   ├── en.json (complete)
  │   ├── hi.json (complete: Hindi)
  │   ├── ta.json (complete: Tamil or another language)
  │   └── ...others (stubs)
  ├── src/App.css (font-scale CSS var)
  ├── src/context/AccessibilityContext.tsx (new)
  ├── src/components/common/stepper.tsx (updated: state wiring)
  ├── src/components/layout/header.tsx (updated: large-text wiring)
  └── src/__tests__/accessibility.test.tsx (new)
```

**Verification**:
```bash
# Test with keyboard only (no mouse)
# Test with screen reader (NVDA/JAWS)
# Render pages in multiple languages
# Verify stepper state persists across navigation

npm run test -- accessibility.test.tsx
```

---

### Phase 8: Tests, Docs, & Deployment Readiness *(2-3 days)*
**Objective**: Full test coverage, Docker setup, final docs

**Tasks**:
- Backend pytest: auth, interview branching, red-flags, summary generation
- Frontend vitest: interview (voice + touch), documents (upload), summary (edit)
- Create `Dockerfile` for frontend (Node multi-stage build)
- Create `Dockerfile` for backend (Python slim)
- Create `docker-compose.yml` for full-stack local run
- Update `context.md` implementation status
- Add deployment guide to README

**Files Created/Modified**:
```
root/
  ├── Dockerfile.frontend (new)
  ├── Dockerfile.backend (new)
  ├── docker-compose.yml (new)
  ├── context.md (updated: implementation status)
  ├── README.md (updated: deployment guide)

frontend/
  └── tests/ (comprehensive coverage)

backend/
  └── tests/ (comprehensive coverage)
```

**Verification**:
```bash
# Full test suite
pytest backend/ -v --cov=app
npm run test

# Docker build
docker-compose build
docker-compose up

# Verify health check
curl http://localhost:8000/health
curl http://localhost:5173/

# Final build
npm run build && npm run lint (frontend)
```

---

## 🎯 Acceptance Criteria

✅ **Patient completes full 5-step journey** (Identify → Converse → Scan → Summarize → Consult)  
✅ **Voice + Touch modes work** on desktop and mobile  
✅ **Red-flag scenario** (chest pain + dyspnea) triggers priority alert visibly  
✅ **Mock lab report upload** produces structured, chronological entry with abnormal flags  
✅ **Generated summary** editable by physician; physician confirms  
✅ **Confirm → ABDM mock push** produces visible FHIR Bundle ID  
✅ **2+ full non-English locales** render end-to-end  
✅ **Build & lint pass**: `npm run build && npm run lint` ✓  
✅ **Backend healthy**: `uvicorn app.main:app --reload` ✓ and `pytest` ✓

---

## 📅 Timeline Estimate

| Phase | Title | Duration | Start | End |
|-------|-------|----------|-------|-----|
| 0 | Foundation & Tooling | 1-2d | Day 1 | Day 2 |
| 1 | Auth & Identify | 2-3d | Day 2 | Day 4 |
| 2 | Consent | 1-2d | Day 5 | Day 6 |
| 3 | Interview Engine | 3-4d | Day 6 | Day 9 |
| 4 | Document Digitization | 2-3d | Day 10 | Day 12 |
| 5 | Summary Generator | 2-3d | Day 12 | Day 14 |
| 6 | ABDM & Physician Queue | 2d | Day 15 | Day 16 |
| 7 | Accessibility & i18n | 2-3d | Day 16 | Day 18 |
| 8 | Tests & Deployment | 2-3d | Day 18 | Day 20 |
| **Total** | | **~20 days** | | |

---

## 🔐 Security & Privacy Checklist

- [ ] No real ABHA/Aadhaar/PII stored (demo mode)
- [ ] All mock data labeled "MOCK" in API responses
- [ ] JWT secrets in `.env`, never in code
- [ ] Rate-limiting on `/auth/` and `/otp/verify` endpoints
- [ ] File upload validation (type + size) before OCR
- [ ] DPDP Act 2023 / consent notice visible on first entry
- [ ] No localStorage for tokens (httpOnly cookies preferred)
- [ ] All AI calls behind service interfaces (no direct LLM calls in routes)

---

## 🚦 Current Status

**Baseline**: Landing page + basic auth structure  
**After Phase 0**: Full scaffolding, dependencies installed, tests ready  
**After Phase 3**: Conversational history engine live (core feature)  
**After Phase 5**: Summary generation (AI integration)  
**After Phase 8**: Production-ready demo

---

## 📚 References

- **Clinical Ontology**: SOCRATES framework, Indian medical curricula
- **ABDM/FHIR**: Mock FHIR Bundle structure (HL7.org)
- **AYUSH Integration**: Dashavidha Pariksha from Charaka Samhita
- **Accessibility**: WCAG 2.1 AA standards
- **i18n**: i18next library + locale files

---

## 🤝 Contributing

Follow the phase order strictly. After each phase, run:
```bash
npm run build && npm run lint       # Frontend
pytest backend/ -v                 # Backend
```

Never skip verification steps. Document any deferred work in phase TODOs.

---

**Last Updated**: 2026-08-29  
**Next Review**: After Phase 2 completion
