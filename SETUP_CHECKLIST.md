# MediKiosk Setup Checklist

**Purpose**: One-page checklist to get started with MediKiosk development  
**Last Updated**: 2026-08-29

---

## ✅ Pre-Implementation Checklist

### 1. Project Understanding
- [ ] Read **`README.md`** (project overview)
- [ ] Read **`context.md`** (architecture & tech stack)
- [ ] Read **`QUICKSTART.md`** (quick reference)
- [ ] Read **`IMPLEMENTATION_PLAN.md`** (detailed phases)

### 2. Environment Setup

#### Node.js / npm
```bash
node --version    # Should be v18+ (or v20+)
npm --version     # Should be v10+
```
- [ ] Node.js v18+ installed
- [ ] npm v10+ installed

#### Python / pip
```bash
python --version  # Should be 3.10+
pip --version
```
- [ ] Python 3.10+ installed
- [ ] pip installed and accessible
- [ ] Virtual environment support available

#### Git
```bash
git --version     # Should be 2.25+
cd sih2026 && git status
```
- [ ] Git installed
- [ ] Repository cloned to `E:\Desktop\sih2026` (or wherever)
- [ ] No uncommitted changes blocking work

### 3. Frontend Environment
```bash
cd frontend
npm --version
npm install       # First-time dependency install
npm run dev       # Should start on http://localhost:5173
```
- [ ] `frontend/` directory exists
- [ ] `package.json` readable
- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts the dev server
- [ ] Browser can access http://localhost:5173

### 4. Backend Environment
```bash
cd backend
python --version
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
- [ ] `backend/` directory exists
- [ ] `requirements.txt` readable
- [ ] Virtual environment created and activated
- [ ] Dependencies installed (check `pip list`)
- [ ] `uvicorn` starts cleanly on http://localhost:8000
- [ ] `/health` endpoint returns `{"status": "healthy"}`

### 5. Verify Existing Functionality
```bash
# Terminal 1: Frontend
cd frontend && npm run dev

# Terminal 2: Backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Terminal 3: Test
curl http://localhost:8000/health
curl http://localhost:8000/
```
- [ ] Frontend loads (http://localhost:5173)
- [ ] Backend health check responds (http://localhost:8000/health)
- [ ] No TypeScript errors in frontend console
- [ ] No Python errors in backend terminal

---

## 📋 Before Starting Phase 0

### Knowledge Check
- [ ] Understand MediKiosk's 5-step patient journey
- [ ] Know what "mock" means (demo data, no real PII)
- [ ] Familiar with React + TypeScript basics
- [ ] Familiar with FastAPI + Pydantic basics
- [ ] Understand JWT token flow basics

### Repository State
```bash
cd sih2026
git status         # Should show no uncommitted changes
git branch         # Should be on main or dev branch
git log --oneline  # Should show recent commits
```
- [ ] Repository is clean (no modified files)
- [ ] On correct branch (typically `main` or `develop`)
- [ ] Last commit is the rebranding to "MediKiosk"

### File Structure Verification
```bash
# Should exist:
ls frontend/src/pages/identify.tsx
ls frontend/src/components/layout/header.tsx
ls backend/app/main.py
ls backend/app/core/config.py
ls context.md
ls IMPLEMENTATION_PLAN.md
ls QUICKSTART.md
```
- [ ] All frontend pages exist
- [ ] All backend core files exist
- [ ] Documentation files created
- [ ] No unexpected file deletions

### .env Configuration
```bash
# backend/.env should exist with:
cat backend/.env
```
Check contents:
- [ ] `JWT_ACCESS_SECRET` is set
- [ ] `JWT_REFRESH_SECRET` is set
- [ ] `OTP_SECRET` is set
- [ ] All values are placeholders (clearly demo)
- [ ] File is in `.gitignore` (not committed)

---

## 🚀 Phase 0 Readiness

### Architecture Understanding
- [ ] Know what "service interfaces" means (ASR, LLM, OCR, ABDM)
- [ ] Understand why mocking is important for this demo
- [ ] Know the 5-step journey and how it maps to phases
- [ ] Understand JWT auth flow (access + refresh tokens)

### Dependency Planning
**Frontend (Phase 0 additions)**:
```
@tanstack/react-query  # Server state management
i18next / react-i18next # i18n framework
vitest / @testing-library/react # Testing
```

**Backend (Phase 0 additions)**:
```
sqlmodel         # ORM
alembic          # Migrations
pytest           # Testing
python-jose      # JWT
pyotp            # OTP
```

- [ ] Understand why each dependency is added
- [ ] Know where to add them (package.json vs requirements.txt)
- [ ] Ready to run `npm install` and `pip install`

### Code Organization Understanding
```
Phase 0 creates:
  frontend/src/i18n/           # i18n files (en.json, hi.json, etc.)
  frontend/src/__tests__/      # Test directory
  frontend/src/context/        # AuthContext placeholder
  backend/app/services/        # Service interfaces (ASR, LLM, OCR, ABDM)
  backend/app/core/database.py # DB session management
  backend/tests/               # Test directory
```

- [ ] Understand directory structure changes
- [ ] Know which files are new vs. modified
- [ ] Ready to follow file creation order

---

## 🔍 Build & Lint Verification

### Frontend Verification
```bash
cd frontend

# Should pass without errors:
npm run lint       # ESLint checks
npm run build      # TypeScript + Vite build
npm run preview    # Preview production build
npm run test       # Run tests (after Phase 0)
```

- [ ] Lint runs without errors
- [ ] Build succeeds (dist/ folder created)
- [ ] No TypeScript strict mode violations
- [ ] No missing dependencies

### Backend Verification
```bash
cd backend
source venv/bin/activate  # or: venv\Scripts\activate on Windows

# Should pass without errors:
pytest -v                 # Run all tests (after Phase 0)
python -m py_compile app/ # Check syntax
```

- [ ] All imports resolve
- [ ] No Python syntax errors
- [ ] Tests discover correctly
- [ ] Database migrations setup ready (via alembic, after Phase 0)

---

## 🎯 Phase 0 Specific

### Before Phase 0 Work
- [ ] Understand that Phase 0 is **scaffolding only** — no business logic yet
- [ ] Know you'll add dependencies but not change existing routes
- [ ] Understand that health check must still work after Phase 0
- [ ] Plan to commit work at end of Phase 0 with clear message

### Phase 0 Success Criteria
```bash
# After Phase 0, these must pass:
npm run build && npm run lint       # Frontend
pytest backend/ -v                  # Backend
curl http://localhost:8000/health   # Health check
```

- [ ] All dependencies installed successfully
- [ ] No new TypeScript errors introduced
- [ ] No new Python import errors
- [ ] Existing endpoints still functional
- [ ] Test infrastructure in place (files created, scaffolds ready)
- [ ] i18n scaffolds created (en.json + 6 stub files)
- [ ] Service interfaces created (asr, llm, ocr, abdm)

### Phase 0 Deliverables Checklist
**Files to Create**:
- [ ] `frontend/src/i18n/en.json` (English strings)
- [ ] `frontend/src/i18n/hi.json` (Hindi stub)
- [ ] `frontend/src/i18n/ta.json` (Tamil stub)
- [ ] `frontend/src/i18n/te.json` (Telugu stub)
- [ ] `frontend/src/i18n/ka.json` (Kannada stub)
- [ ] `frontend/src/i18n/ml.json` (Malayalam stub)
- [ ] `frontend/src/i18n/bn.json` (Bengali stub)
- [ ] `frontend/vitest.config.ts`
- [ ] `frontend/src/__tests__/` (directory, no files yet)
- [ ] `frontend/src/context/AuthContext.tsx` (placeholder)
- [ ] `backend/app/services/__init__.py`
- [ ] `backend/app/services/asr_service.py` (mock interface)
- [ ] `backend/app/services/llm_service.py` (mock interface)
- [ ] `backend/app/services/ocr_service.py` (mock interface)
- [ ] `backend/app/services/abdm_service.py` (mock interface)
- [ ] `backend/app/core/database.py` (SQLModel session setup)
- [ ] `backend/tests/__init__.py`
- [ ] `backend/tests/conftest.py` (pytest config)

**Files to Modify**:
- [ ] `frontend/package.json` (add TanStack Query, i18next, vitest)
- [ ] `backend/requirements.txt` (add SQLModel, alembic, pytest, etc.)
- [ ] `backend/app/main.py` (add CORS middleware)

---

## 📞 Ready to Proceed?

If all checkboxes above are checked, you're ready to start Phase 0!

### Next Steps
1. **Start Phase 0**: Follow `IMPLEMENTATION_PLAN.md` Phase 0 section
2. **Create files** in the order listed
3. **Run verification** commands at end of phase
4. **Commit work**: `git add . && git commit -m "Phase 0: Foundation & Tooling"`
5. **Move to Phase 1**

### Common Issues to Prevent
- ❌ **Don't skip verification**: Always run build/lint/test after each file
- ❌ **Don't hardcode strings**: All UI text goes to i18n files
- ❌ **Don't use `any` in TypeScript**: Even in Phase 0 scaffolds
- ❌ **Don't commit `.env` or `venv/`**: Both must be in `.gitignore`
- ❌ **Don't modify business logic in Phase 0**: Only scaffolding!

---

## 🎓 Phase 0 Learning Outcomes

After Phase 0, you should understand:
- ✅ MediKiosk architecture (frontend + backend split)
- ✅ How service interfaces abstract external calls (LLM, OCR, etc.)
- ✅ i18n structure for 7-language support
- ✅ Testing scaffolds (pytest + vitest)
- ✅ JWT configuration from `core/config.py`
- ✅ How future phases will build on this foundation

---

**Status**: ✅ Pre-implementation checklist ready  
**Estimated Phase 0 Time**: 1-2 days  
**Next Phase**: Phase 1 (Auth & Identify)
