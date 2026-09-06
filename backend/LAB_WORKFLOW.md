# Lab assistant workflow and surface redesign

Open `/lab` or `/physician` directly. Both desks are public prototype routes and require no login, registration, or staff provisioning. Patient routes retain their existing authentication.

The lab actor is the fixed `prototype-lab-assistant` identity. The physician is the automatically created `prototype-physician` roster entry. New and existing waiting visits use this one physician desk; audit records and prescriptions retain these stable actor IDs. Staff identity does not depend on the patient's browser login.

## Workflow and data

1. The lab assistant searches an exact Aadhaar, ABHA, email or phone identifier using a type selector. Identifier normalization is shared with login. Lookup uses POST so sensitive identifiers are not placed in URLs. Full Aadhaar and authentication fields are never returned.
2. A matching account is shown for confirmation. If no account matches, the lab assistant records name, date of birth and gender alongside the selected identifier. Optional contact details are also checked for conflicts. Existing unique database indexes prevent duplicate identifiers.
3. Staff correct demographic details and explicitly attest that the patient confirmed their identity and authorized document processing. Only document-processing consent is captured; this does not grant AI or physician-sharing consent. Existing patient permissions are preserved.
4. A verification reference is bound to the patient, lab actor, demographic revision and consent version, and expires in 30 minutes. Upload rechecks these, consent status and optional session ownership. A report may be added without creating a patient interview session.
5. PDF/JPEG/PNG uploads use the same client upload helper, accessible file-picker component, server file validation, storage service and processing pipeline as patient uploads. Documents retain `uploaded_by_role=lab_assistant`, the staff ID, patient ID and optional visit ID. The patient's existing Documents/history screens show the report.
6. Upload and processing completion/failure write audit entries. Lab staff can poll only their own uploaded lab reports, not other staff reports or the patient's unrelated records. A pending report can be revisited via `/lab?report=DOCUMENT_ID`; the server still enforces ownership.

The existing OCR implementation is a demo extraction pipeline. This change reuses it and does not claim to introduce production OCR. Failed processing retains the upload record and an audit event; the interface offers refresh or a replacement report.

## Schema compatibility

Patients remain in `users`. Provisional lab records may omit Aadhaar, phone and address fields when another identifier is supplied. Normal public registration still requires its existing fields. Provisional records have an unusable password; staff cannot set a patient's password. Patients with a phone/email may use the existing OTP flow.

Startup converts the Aadhaar and mobile unique indexes to **sparse unique** indexes so omitted identifiers can coexist without fabricating identity data. Existing populated values remain unique. This is an idempotent index migration; deploy during a controlled maintenance window on an existing database. A backup and the existing deployment's MongoDB index permissions are required operational prerequisites.

## Prototype access

Lab and physician APIs are intentionally public for this prototype, including physician summary review and prescriptions. There is no staff access isolation between visitors. Patient APIs still require patient authentication; document consent, verification expiry, patient/report associations and visit assignment checks remain in place. The shared navbar switches desks and shows the fixed staff identity without sign-in or sign-out controls on staff screens.

## Visual changes

`frontend/src/styles/glass-neon.css` changes component surfaces only: frosted whitish cards, violet/cyan accents, readable dark text, focus rings, and a responsive shared navbar. Existing page structure and grids remain. The original `index.css` and landing stylesheet are unchanged, including page background patterns. Reduced-transparency, reduced-motion and forced-color fallbacks are supplied.

## Checks

```powershell
$env:GROQ_API_KEY=''
venv/Scripts/python.exe -m pytest tests/test_lab.py tests/test_continuity.py tests/test_phase6_and_prompt.py tests/test_interview.py tests/test_workflow.py -k 'not GroqIntegrationTests and not DocumentAndSummaryTests' -q
```

Frontend: `npm run lint`, `npm test`, `npm run build`. Browser visual checks use synthetic data; no real patient data is used for screenshots. The legacy auth suite still imports a removed mock login function, and older Groq tests patch an obsolete method; these predate this workflow.
