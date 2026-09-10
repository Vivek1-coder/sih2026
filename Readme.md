# SIH 2026 Project Repository

This repository contains **MediKiosk**, a multilingual, AI-assisted patient medical document management and pre-consultation platform developed for **Smart India Hackathon (SIH) 2026**. The system includes a patient self-service kiosk, intelligent clinical interview workflow, medical document digitization, and dedicated physician and lab dashboards.

## 1. Project Information

* **Project Title:** MediKiosk – AI-Assisted Patient Pre-Consultation System

* **PS ID:** SIH26047

* **PS Title:** Patient Case Taking Software

* **Category:** Software

* **Theme:** MedTech / BioTech / HealthTech

## 2. Problem Statement

Indian OPDs are severely overloaded, with major tertiary hospitals often registering **4,000–10,000 patients per day** and doctor-patient consultation windows frequently shrinking to just **2–5 minutes**. Within this limited time, physicians must obtain the patient's history, examine the patient, identify possible diagnoses, and prescribe treatment. This can lead to incomplete history-taking, overlooked comorbidities, and potential diagnostic errors.

Existing hospital registration systems primarily capture demographic and appointment information rather than detailed clinical history. Patients also carry fragmented and unstructured medical records—including prescriptions, laboratory reports, and discharge summaries—which clinicians must manually review during already limited consultation time.

AYUSH OPDs face an additional challenge because Ayurvedic case-taking methods such as **Dashavidha Pariksha** require a more extensive assessment than conventional consultation times typically allow.

Meanwhile, **ABDM and ABHA** provide the digital health infrastructure required for interoperable healthcare records, but there remains a critical patient-side gap: there is no widely available system that captures structured medical history and digitizes existing documents before the consultation begins.

MediKiosk aims to bridge this **"first-mile" healthcare data gap**.

## 3. Proposed Solution

MediKiosk is an **AI-powered Patient Case-Taking Software platform** that enables patients to independently record a comprehensive medical history through natural voice interaction and guided touchscreen workflows while simultaneously digitizing their existing physical medical documents.

The platform generates a structured, physician-ready clinical summary that can integrate with the **Hospital Information System (HIS), Electronic Medical Record (EMR), and the patient's ABHA-linked health records**. The entire workflow is completed before the patient enters the consultation room, requiring minimal staff assistance.

How It Works (High Level):

**Identify & Consent** – The patient identifies themselves using ABHA/Aadhaar or registers as a new patient, selects a preferred language, and provides audio-guided, granular consent before proceeding.

**Converse** – An adaptive AI interview engine using voice, touch, and multilingual interaction asks context-aware follow-up questions based on the patient's chief complaint. The workflow follows structured clinical history-taking principles such as SOCRATES. AYUSH patients can additionally complete an extended Dashavidha Pariksha-based assessment.

**Scan** – Previous prescriptions, laboratory reports, discharge summaries, and other medical documents are uploaded and processed using OCR, including support for handwritten and printed text. Relevant clinical entities such as diagnoses, medications, investigations, and laboratory values are extracted and organized into a chronological timeline.

**Summarize & Route** – The system generates a standardized clinical summary covering the chief complaint, History of Present Illness (HPI), past medical history, medication history, family history, personal history, Review of Systems (ROS), and previous investigations. The structured record can then be shared with HIS/EMR systems and linked with ABHA through FHIR-ready APIs.

**Consult** – The physician receives the patient's complete and editable medical history before the consultation begins, allowing consultation time to focus on physical examination, clinical reasoning, diagnosis, and treatment rather than repetitive data collection.

## 4. Key Features

- **Patient onboarding:** ABHA, Aadhaar, email/phone, OTP, password, and guest identification with consent-first authentication.
- **Multilingual accessibility:** English and Hindi interfaces, large-text support, keyboard navigation, speech input, and text-to-speech.
- **Adaptive clinical interview:** Touch, voice, text, single-choice, multiple-choice, and scale-based questions that adapt to patient responses.
- **Document digitization:** Upload and OCR processing for prescriptions, laboratory reports, discharge summaries, and other medical records.
- **Clinical summary:** AI-assisted, structured summaries that physicians can review and edit before consultation.
- **Safety triage:** Deterministic red-flag detection with urgent triage notifications.
- **Role-based workflows:** Patient, laboratory, and physician dashboards with queue management and consultation views.
- **Secure sessions:** JWT authentication with rotating, HTTP-only refresh-token cookies.
- **Interoperability foundation:** APIs designed for future ABDM, ABHA, FHIR, HIS, and EMR integration.

## 5. Technology Stack

- **Frontend:** React 19, TypeScript, Vite, React Router, Tailwind CSS, and Web Speech API
- **Backend:** Python, FastAPI, Uvicorn, and Pydantic
- **Database:** MongoDB with MongoEngine
- **Storage:** Supabase S3-compatible object storage
- **AI and document processing:** Groq API with scripted fallback, OCR, and clinical text extraction
- **Authentication:** JWT with secure HTTP-only refresh-token cookies
- **Testing:** Vitest, Testing Library, Pytest, and Mongomock
- **Deployment:** Docker, Docker Compose, Vercel, and Render

## 6. Architecture

Detailed frontend and backend documentation is available in [frontend/README.md](frontend/README.md) and [backend/README.md](backend/README.md).

```text
Patient / Physician
        |
        v
React Frontend
        |
        v
FastAPI Backend
        |
        +----> MongoDB / MongoDB Atlas
        |
        +----> Supabase S3 Storage
        |
        +----> Groq API (optional)
        |
        v
Interview, Triage, Documents, Summary, and Queue Workflows
```

## 7. Repository Structure

```text
sih2026/
├── Readme.md
├── backend/
│   ├── app/
│   ├── tests/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── src/
│   ├── public/
│   ├── Dockerfile
│   └── README.md
├── docker-compose.yml
├── context.md
└── .gitignore
```

### What goes where?

| Item                                     | Location                                               |
| ---------------------------------------- | ------------------------------------------------------ |
| Frontend source code                     | `frontend/src/`                                        |
| Backend source code                      | `backend/app/`                                         |
| Backend tests                            | `backend/tests/`                                       |
| Frontend static assets                   | `frontend/public/`                                     |
| Architecture and technical documentation | `Readme.md`, `frontend/README.md`, `backend/README.md` |
| Full-stack local orchestration           | `docker-compose.yml`                                   |
| Environment templates                    | `backend/.env.sample`, `frontend/.env.sample`          |
| Project overview                         | `Readme.md`                                            |

## 8. Final Presentation

Keep the final SIH presentation in the repository whenever the file size permits. If it is too large for GitHub, upload it to Google Drive or OneDrive and add an accessible viewer link here.

## 9. Demo Video

A demo video is optional but recommended. Add the YouTube or Google Drive link here when available.

## 10. Screenshots / Prototype Photos

Add important application screenshots, workflow diagrams, or prototype photos to an appropriate project assets directory and link them here.

## 11. Installation

```bash
git clone https://github.com/Vivek1-coder/sih2026.git
cd sih2026
```

Install and configure the backend:

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
Copy-Item .env.sample .env
```

Install the frontend in a separate terminal:

```powershell
cd frontend
npm ci
Copy-Item .env.sample .env.local
```

Set the required backend configuration values in `backend/.env` and configure:

```dotenv
VITE_API_BASE_URL=http://localhost:8000
```

in `frontend/.env.local`.

## 12. Run

Start the backend:

```powershell
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload
```

Start the frontend in a second terminal:

```powershell
cd frontend
npm run dev
```

The frontend runs at `http://localhost:5173` and the backend runs at `http://localhost:8000`.

To run the complete stack using Docker:

```powershell
docker compose up --build
```

Replace all local development environment values with secure production values when deploying to Vercel, Render, or another hosting provider.

## 13. Future Scope

* Integration with production ABDM services and verified health identifiers

* Support for additional Indian regional languages

* Improved clinical decision-support tools and physician analytics

* Fully offline-first kiosk operation with automatic synchronization

* Role-based administration for hospitals, clinics, and healthcare organizations

* Enhanced audit logging, observability, security monitoring, and deployment analytics

* Advanced medical document understanding and longitudinal patient-record analysis

* Expanded AYUSH-specific clinical case-taking workflows

* Integration with laboratory, pharmacy, and hospital information systems

## Important

Before submission, ensure that the repository is accessible to SIH reviewers.

Do **not** upload passwords, API keys, access tokens, `.env` files containing secrets, database credentials, private certificates, or any other confidential information to the repository.
