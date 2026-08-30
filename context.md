# MediKiosk - Project Context

## Overview
**MediKiosk** is a modern healthcare application designed to streamline patient-doctor interactions by enabling patients to comprehensively share their medical history before consultations. The platform operates as a dual-sided system serving both patients and physicians.

## Project Structure

```
sih2026/
├── frontend/                    # React + TypeScript + Vite frontend application
│   ├── src/
│   │   ├── pages/
│   │   │   ├── landing.tsx              # Homepage with feature overview
│   │   │   ├── identify.tsx             # Patient identification (ABHA/Aadhaar)
│   │   │   ├── consultationPage.tsx     # Consultation view
│   │   │   ├── physician.tsx            # Physician dashboard
│   │   │   ├── summary.tsx              # History summary review
│   │   │   ├── complete.tsx             # Completion confirmation
│   │   │   └── notFound.tsx             # 404 error page
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── consent.tsx          # Consent management
│   │   │   │   ├── documents.tsx        # Document upload
│   │   │   │   ├── emergency.tsx        # Emergency info
│   │   │   │   ├── field.tsx            # Form field component
│   │   │   │   ├── interview.tsx        # Medical history interview
│   │   │   │   ├── patientShell.tsx     # Patient interface wrapper
│   │   │   │   ├── priorityBadge.tsx    # Priority indicator
│   │   │   │   └── stepper.tsx          # Progress stepper
│   │   │   └── layout/
│   │   │       ├── header.tsx           # Navigation header
│   │   │       └── footer.tsx           # Footer
│   │   ├── routes/
│   │   │   ├── AppRoutes.tsx            # Route configuration
│   │   │   └── ProtectedRoute.tsx       # Protected route wrapper
│   │   ├── types/
│   │   │   ├── patient.type.ts          # Patient data model
│   │   │   ├── priority.type.ts         # Priority levels
│   │   │   └── step.type.ts             # Step progression
│   │   ├── App.tsx                      # Main app component
│   │   ├── App.css                      # App styling
│   │   └── main.tsx                     # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── eslint.config.js
│   ├── index.html
│   └── public/                          # Static assets
│
├── backend/                             # Python FastAPI backend
│   ├── app/
│   │   ├── main.py                      # FastAPI application entry
│   │   ├── __init__.py
│   │   ├── core/
│   │   │   ├── config.py                # Configuration and settings
│   │   │   └── security.py              # Security utilities
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   └── auth.py              # Authentication routes
│   │   │   └── dependencies.py          # Dependency injection
│   │   ├── models/
│   │   │   └── User.model.py            # User database model
│   │   └── schemas/
│   │       └── userSchema.py            # User request/response schemas
│   ├── requirements.txt                 # Python dependencies
│   ├── .env                             # Environment variables
│   ├── .gitignore
│   └── venv/                            # Python virtual environment
│
├── context.md                           # This file
└── .git/                                # Git repository
```

## Key Features

### Patient Journey (5-Step Process)
1. **Identify** - Patient authentication and identification
2. **Converse** - Interactive interview with medical history questions
3. **Scan** - Document upload and past medical reports
4. **Summarize** - AI-powered summary generation for review
5. **Consult** - Meeting with physician with prepared information

### User Roles
- **Patients**: Share medical history at their own pace using multiple languages
- **Physicians**: Access structured patient histories with full context for better consultations

### Core Functionality
- 🔒 Privacy-first design with no real health data collection
- 🌍 Multi-language support (7 languages)
- ♿ Accessibility features (large text toggle, screen reader friendly)
- 📱 Responsive design for all devices
- 🔐 Secure document handling and history management

## Technology Stack

### Frontend
- **Framework**: React 19.2.8
- **Language**: TypeScript 6.0
- **Build Tool**: Vite 8.2.2
- **Styling**: Tailwind CSS 4.3.3
- **Routing**: React Router DOM 7.18.2
- **Icons**: Lucide React 1.35.0
- **Charts**: Recharts 3.10.1
- **Utilities**: CLSX 2.1.1

### Backend
- **Framework**: FastAPI 0.141.1 (async Python web framework)
- **Server**: Uvicorn 0.52.4 (ASGI server)
- **Validation**: Pydantic 2.13.5 (data validation and serialization)
- **HTTP**: Starlette 1.6.0 (underlying web framework)
- **CLI**: Click 8.5.0 (command-line interface)
- **Annotations**: annotated-doc 0.0.5, annotated-types 0.8.0
- **Security**: JWT token-based authentication

### Development Tools (Frontend)
- **Linting**: ESLint 10.9.0
- **Plugins**: 
  - Vite React Plugin (@vitejs/plugin-react)
  - Tailwind CSS Vite Plugin (@tailwindcss/vite)
  - ESLint React Hooks Plugin
  - ESLint React Refresh Plugin

## Page Structure

### Public Pages
- **Landing** (`/`) - Homepage with feature overview and call-to-action
- **Patient Flow** 
  - `/patient/identify` - Patient identification (ABHA ID, Aadhaar, or new patient registration)
  - `/patient/consent` - Consent management
  - `/patient/interview` - Medical history interview
  - `/patient/documents` - Document upload
  - `/patient/summary` - History summary review
  - `/patient/complete` - Completion confirmation
- **Physician Flow**
  - `/physician` - Physician dashboard
  - `/physician/patient/:id` - Consultation view for specific patient

### Error Handling
- `/notfound` - 404 error page

## Backend API

### Architecture
FastAPI-based RESTful API with async request handling and Pydantic validation.

### Core Modules

#### `app/main.py` - Application Entry Point
- Initializes FastAPI application
- Defines root and health check endpoints
- Sets up API title and version

#### `app/core/config.py` - Configuration Management
Manages application settings via Pydantic BaseSettings:
- **JWT Secrets**
  - `JWT_ACCESS_SECRET` - Secret for access token signing
  - `JWT_REFRESH_SECRET` - Secret for refresh token signing
  - `OTP_SECRET` - Secret for OTP generation
- **Token Configuration**
  - `ACCESS_TOKEN_EXPIRE_MINUTES` - Default: 15 minutes
  - `REFRESH_TOKEN_EXPIRE_DAYS` - Default: 7 days
  - `JWT_ALGORITHM` - Default: HS256
- **JWT Claims**
  - `JWT_ISSUER` - Token issuer (my-api)
  - `JWT_AUDIENCE` - Token audience (my-react-app)

#### `app/core/security.py` - Security Utilities
Handles encryption, token generation, and validation (implementation details TBD)

#### `app/models/User.model.py` - User Model
Database model for user data:
```python
class User:
    id: str          # Unique user identifier
    username: str    # User's username
    email: str       # User's email address
    is_active: bool  # Account status
```

#### `app/schemas/userSchema.py` - User Schema
Pydantic schemas for request/response validation (details TBD)

#### `app/api/routes/auth.py` - Authentication Routes
Handles user authentication and authorization:
- User login (ABHA ID, Aadhaar, new patient registration)
- Token refresh
- Logout
- OTP verification

#### `app/api/dependencies.py` - Dependency Injection
FastAPI dependencies for:
- JWT token validation
- User authentication verification
- Request validation

### API Endpoints

#### Health Check
```
GET /
Response: {"message": "FastAPI server is running"}

GET /health
Response: {"status": "healthy"}
```

#### Authentication (TBD)
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `POST /api/auth/otp/verify` - Verify OTP

### Environment Variables
See `.env` file in backend directory for configuration values.

## Frontend Features

## Frontend Features

### Patient Identification (`identify.tsx`)
Multiple authentication methods for patient login:
1. **ABHA ID** - Ayushman Bharat Health Account identifier
   - Validates ABHA format
   - Supports address or ID number
2. **Aadhaar** - National identification number
   - Validates 12-digit Aadhaar number
   - Indian resident authentication
3. **New Patient** - Self-registration
   - Create new patient profile
   - No validation required for entry

The component features:
- Tab-based navigation between authentication methods
- Input validation with error messages
- Loading state handling
- Form submission with error recovery

## UI Components

### Common Components
- **consent.tsx** - Consent management interface for legal agreements
- **documents.tsx** - Document upload and past medical report management
- **emergency.tsx** - Emergency contact information collection
- **field.tsx** - Reusable form field component with validation
- **interview.tsx** - Medical history interview question handler
- **patientShell.tsx** - Patient interface wrapper with layout
- **priorityBadge.tsx** - Priority level indicator component
- **stepper.tsx** - Multi-step progress indicator for patient journey

### Layout Components
- **header.tsx** - Top navigation bar featuring:
  - MediKiosk branding with heart icon
  - Language selection
  - Accessibility options (large text toggle)
  - Help button
  - User profile section (patient or physician)
- **footer.tsx** - Footer with:
  - MediKiosk branding
  - Privacy, Help, and Terms links
  - Medical disclaimer

## Authentication & Security

### JWT-Based Authentication
- **Access Tokens** - Short-lived (15 minutes) for API requests
- **Refresh Tokens** - Long-lived (7 days) for token renewal
- **Algorithm** - HS256 (HMAC with SHA-256)
- **Issuer** - my-api
- **Audience** - my-react-app

### Authentication Methods
1. ABHA ID (Ayushman Bharat)
2. Aadhaar number (national ID)
3. New patient registration
4. OTP verification

### Security Considerations
- JWT secrets stored in environment variables
- OTP-based verification for sensitive operations
- Token expiration and refresh mechanisms
- Secure password handling (implementation in security.py)
- Private by design - no real data collection

## Development & Build

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Development server (Vite with HMR)
npm run dev          # http://localhost:5173

# Build for production
npm run build        # TypeScript check + Vite build

# Lint code
npm run lint         # ESLint checks

# Preview production build
npm run preview      # Local preview
```

### Backend Setup
```bash
cd backend

# Create virtual environment (if not exists)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload
# Server: http://localhost:8000
# Docs: http://localhost:8000/docs
# ReDoc: http://localhost:8000/redoc
```

### Environment Variables
**Backend (.env file)**
```
JWT_ACCESS_SECRET=your-super-secret-access-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
OTP_SECRET=another-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
JWT_ALGORITHM=HS256
JWT_ISSUER=my-api
JWT_AUDIENCE=my-react-app
```

## Styling & Design

### Design System
- **Color Scheme**: Purple/Violet primary branding for MediKiosk
- **Typography**: Modern, accessible font stack
- **Spacing**: Tailwind CSS default spacing scale
- **Responsive Design**: Mobile-first approach
- **Icons**: Lucide React for consistent iconography

### Tailwind CSS Features Used
- Utility-first styling
- Responsive breakpoints (mobile, tablet, desktop)
- Custom component classes in App.css
- Dark mode support (if enabled)

### CSS Structure
- `App.css` - Component-specific styles and animations
- Tailwind configuration in `tailwind.config.ts`
- Global styles applied at component level

## Data Models

### User Model
```python
class User:
    id: str          # Unique identifier (ABHA/Aadhaar/custom)
    username: str    # Display name
    email: str       # Contact email
    is_active: bool  # Account active status
```

### Patient Types (`patient.type.ts`)
- Patient profile data structure
- Medical history fields
- Document references

### Priority Types (`priority.type.ts`)
- Urgency levels for consultations
- Medical priority indicators

### Step Types (`step.type.ts`)
- Progress tracking through patient journey
- Step completion status

## Configuration Files

### Frontend Configuration

| File | Purpose |
|------|---------|
| `tsconfig.json` | Base TypeScript configuration |
| `tsconfig.app.json` | App-specific TypeScript settings |
| `tsconfig.node.json` | Node.js/build tool TypeScript settings |
| `vite.config.ts` | Vite bundler configuration with React plugin |
| `eslint.config.js` | ESLint rules and code quality standards |
| `package.json` | Dependencies and npm scripts |
| `index.html` | HTML entry point with root div |
| `tailwind.config.ts` | Tailwind CSS customization (implied) |

### Backend Configuration

| File | Purpose |
|------|---------|
| `app/main.py` | FastAPI application initialization |
| `app/core/config.py` | Settings management and validation |
| `app/core/security.py` | Authentication and encryption utilities |
| `requirements.txt` | Python package dependencies |
| `.env` | Environment variables (NOT committed to git) |
| `.gitignore` | Git ignore rules (venv, __pycache__, .env) |

## Recent Changes (Phases 1–8)

- Implemented cookie-based JWT authentication with rotating refresh tokens and clearly marked mock ABHA, Aadhaar, and guest paths.
- Added granular revocable consent, adaptive ontology/SOCRATES/AYUSH interviewing, deterministic red-flag triage, mock OCR, and AI-assisted structured summaries.
- Added mock ABDM FHIR Bundle pushes, priority-sorted physician queue, aggregate consultation view, and patient token/position confirmation.
- Added global font scaling, keyboard/focus improvements, translated Hindi and Tamil patient-flow UI, and safe journey stepper navigation.
- Added pytest and Vitest coverage plus frontend/backend Dockerfiles and `docker-compose.yml`.

## Implementation Status

### Frontend ✅
- [x] Landing page with feature showcase
- [x] Patient identification page (ABHA/Aadhaar)
- [x] Multi-step patient journey layout
- [x] Component structure and routing
- [x] Header and footer with MediKiosk branding
- [x] Responsive design
- [x] API integration with backend
- [x] Shared auth/accessibility state management
- [x] Form validation and error handling
- [x] Voice + touch adaptive interview and red-flag triage UI
- [x] Document upload, camera capture, OCR status, and timeline
- [x] Patient read-back and physician confirmation workflow
- [x] Physician priority queue and consult-ready aggregate view
- [x] Hindi and Tamil patient-flow localization proof
- [x] Keyboard, screen-reader, font scale, and stepper wiring
- [x] Vitest smoke tests

### Backend ✅ Demo Complete
- [x] FastAPI application setup
- [x] Configuration management with Pydantic
- [x] User model definition
- [x] User/auth schemas and validation
- [x] Mock authentication routes
- [x] JWT issuing, verification, cookies, and refresh rotation
- [x] Consent, interview, document, summary, ABDM, and physician APIs
- [x] Adaptive ontology, SOCRATES, AYUSH, and red-flag services
- [x] Mock OCR, LLM seam, and FHIR Bundle push adapter
- [x] Automatic Swagger/OpenAPI documentation
- [x] Structured HTTP errors and credentialed CORS
- [x] Pytest coverage for auth, branching, red flags, prompts, and phase 6
- [ ] Persistent database and migrations (demo currently uses process memory)
- [ ] Production clinician RBAC, real identity/ABDM verification, audit logging, and rate limiting

### Deployment ✅ Demo Ready

- [x] Non-root backend Docker image
- [x] Multi-stage frontend/Nginx Docker image with SPA fallback
- [x] Health-gated Docker Compose stack and persistent upload volume
- [x] Separate runtime and development Python requirements

## Project Goals

1. **Patient Empowerment** - Enable patients to share complete medical history on their terms
2. **Physician Efficiency** - Provide structured, patient-reviewed medical information
3. **Privacy First** - No real health data collection or storage
4. **Accessibility** - Support multiple languages and accessibility standards
5. **Scalability** - Build for high-volume medical consultations

## Technology Decisions

### Why FastAPI?
- Async-first framework for high concurrency
- Automatic OpenAPI/Swagger documentation
- Built-in data validation with Pydantic
- Fast performance comparable to Node.js
- Modern Python web framework with type hints

### Why React + TypeScript?
- Component-based architecture for maintainability
- Type safety with TypeScript
- Rich ecosystem for medical UI components
- Fast re-renders with React's virtual DOM
- Strong community support

### Why Tailwind CSS?
- Rapid UI development with utility classes
- Consistent design system
- Excellent accessibility support
- Responsive design by default
- Easy customization

## Architecture Decisions

### Frontend-Backend Communication
- RESTful API via HTTP/HTTPS
- JWT-based authentication
- Request/response validation with Pydantic
- CORS enabled for frontend domain

### Data Flow
1. Patient enters identification (ABHA/Aadhaar)
2. Backend validates and creates/retrieves user session
3. Backend sets access and rotating refresh JWTs in httpOnly cookies
4. Patient completes interview and document upload
5. Backend processes and organizes medical history
6. Physician retrieves structured patient information

### Security Model
- Secrets stored in environment variables
- JWT tokens with expiration
- OTP verification for sensitive operations
- Password hashing with bcrypt (implementation TBD)
- No PII in frontend logs or localStorage

## Dependencies Summary

### Frontend Dependencies
- **React Ecosystem**: react, react-dom, react-router-dom
- **UI**: tailwindcss, lucide-react, recharts
- **Development**: typescript, vite, eslint

### Backend Dependencies
- **Web**: fastapi, uvicorn, starlette
- **Validation**: pydantic, annotated-types
- **Utilities**: click, anyio, idna

## Implementation Roadmap (8 Phases)

**See `IMPLEMENTATION_PLAN.md` for comprehensive phase-by-phase breakdown**

### Quick Phase Overview
| Phase | Title | Duration | Key Deliverable |
|-------|-------|----------|-----------------|
| 0 | Foundation & Tooling | 1-2d | Dependencies, testing scaffolds, service interfaces |
| 1 | Auth & Identify | 2-3d | JWT auth, identify.tsx → `/api/auth/login` |
| 2 | Consent | 1-2d | Granular consent toggles with TTS explanation |
| 3 | Interview Engine | 3-4d | Adaptive questions, red-flag detection, voice I/O |
| 4 | Document Digitization | 2-3d | Upload + mock OCR extraction with abnormal flags |
| 5 | Summary Generator | 2-3d | Claude API integration for structured summary |
| 6 | ABDM & Queue | 2d | Mock FHIR push, physician dashboard + queue |
| 7 | Accessibility & i18n | 2-3d | Keyboard nav, 2+ full non-English languages |
| 8 | Tests & Deployment | 2-3d | Full coverage, Docker setup, final docs |

### Key Architecture Patterns
- **Frontend State**: React Context for auth/accessibility plus typed service modules for server state
- **Backend Services**: All AI/external calls behind abstracted service interfaces (ASR, LLM, OCR, ABDM)
- **Database**: in-memory demo repositories; production persistence remains intentionally out of scope
- **API Pattern**: RESTful with consistent error schema and JWT auth per endpoint

### Critical Features to Implement
1. **Adaptive Interview Engine** ✅ - Clinical ontology + SOCRATES + scripted LLM fallback seam
2. **Red-Flag Detection** ✅ - Deterministic urgent symptom rules
3. **Document OCR** ✅ - Mock extraction with abnormal lab highlighting
4. **Clinical Summary** ✅ - Prompt-based interview/document merge
5. **Multi-Modal Input** ✅ - Web Speech voice and touch input
6. **Accessibility** ✅ - Keyboard/screen-reader improvements, Hindi/Tamil proof locales, and 7-language consent audio choices

## Support & Resources

- **Frontend Docs**: React documentation, Tailwind CSS docs, Vite guide
- **Backend Docs**: FastAPI documentation, Pydantic guide, Uvicorn server
- **Development**: Use npm/pip for package management, follow folder structure
- **Deployment**: Prepare Docker setup, environment variables, database config

## Important Notes

⚠️ **Demo Disclaimer**
- This is a fictional frontend demonstration
- No real health or identity data is collected, stored, or sent
- All patient and physician information is for demonstration purposes only
- Not for production use with real patient data without proper compliance

🔒 **Privacy & Compliance**
- HIPAA compliance required for production
- GDPR compliance for EU users
- Data encryption at rest and in transit
- Regular security audits recommended
- Comply with local healthcare regulations
