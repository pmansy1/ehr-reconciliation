# CLAUDE.md — Project Scope & Context

This file exists to give Claude Code (and Cursor) full context about this project so
every suggestion stays within scope. Read this before generating any code.

---

## What This Project Is

A **mini clinical data reconciliation engine** — a full-stack web application that uses
AI to resolve conflicting patient medication records across multiple healthcare systems
and validate the quality of patient data.

This is a take-home assessment for an EHR Integration Intern role at Onye.

---

## Tech Stack

| Layer      | Choice               | Why                                                 |
| ---------- | -------------------- | --------------------------------------------------- |
| Backend    | Node.js + Express    | Familiar, fast to scaffold, good TypeScript support |
| Language   | TypeScript           | Type safety on medical data is important            |
| Frontend   | React + Vite         | Component model fits the dashboard UI well          |
| AI         | Anthropic Claude API | Listed in assessment, best JSON reasoning output    |
| Validation | Zod                  | Runtime schema validation for API inputs            |
| Testing    | Vitest               | Fast, native TypeScript support                     |
| Storage    | In-memory (Map)      | Assessment explicitly allows this, no DB needed     |

---

## Project Structure

```
ehr-reconciliation/
├── server/
│   ├── src/
│   │   ├── routes/         # Express route handlers
│   │   ├── services/       # Claude API calls live here
│   │   ├── middleware/     # Auth key checking
│   │   ├── utils/          # Cache, helpers
│   │   └── index.ts        # App entry point
│   └── tests/              # Vitest unit tests
└── client/
    └── src/
        ├── components/     # Reusable UI pieces
        ├── pages/          # MedicationReconciler, DataQuality
        └── api/            # Axios calls to our backend
```

---

## API Endpoints (Exactly 2 — Do Not Add More)

The assessment restricts us to exactly these two endpoints.

### 1. POST /api/reconcile/medication

Resolves conflicting medication records from multiple healthcare sources.

**Request body:**

```json
{
  "patient_context": {
    "age": 67,
    "conditions": ["Type 2 Diabetes", "Hypertension"],
    "recent_labs": { "eGFR": 45 }
  },
  "sources": [
    {
      "system": "Hospital EHR",
      "medication": "Metformin 1000mg twice daily",
      "last_updated": "2024-10-15",
      "source_reliability": "high"
    },
    {
      "system": "Primary Care",
      "medication": "Metformin 500mg twice daily",
      "last_updated": "2025-01-20",
      "source_reliability": "high"
    },
    {
      "system": "Pharmacy",
      "medication": "Metformin 1000mg daily",
      "last_filled": "2025-01-25",
      "source_reliability": "medium"
    }
  ]
}
```

**Response body:**

```json
{
  "reconciled_medication": "Metformin 500mg twice daily",
  "confidence_score": 0.88,
  "reasoning": "Primary care record is most recent...",
  "recommended_actions": ["Update Hospital EHR to 500mg twice daily"],
  "clinical_safety_check": "PASSED"
}
```

---

### 2. POST /api/validate/data-quality

Scores a patient record across four data quality dimensions.

**Request body:**

```json
{
  "demographics": { "name": "John Doe", "dob": "1955-03-15", "gender": "M" },
  "medications": ["Metformin 500mg", "Lisinopril 10mg"],
  "allergies": [],
  "conditions": ["Type 2 Diabetes"],
  "vital_signs": { "blood_pressure": "340/180", "heart_rate": 72 },
  "last_updated": "2024-06-15"
}
```

**Response body:**

```json
{
  "overall_score": 62,
  "breakdown": {
    "completeness": 60,
    "accuracy": 50,
    "timeliness": 70,
    "clinical_plausibility": 40
  },
  "issues_detected": [
    {
      "field": "allergies",
      "issue": "No allergies documented - likely incomplete",
      "severity": "medium"
    },
    {
      "field": "vital_signs.blood_pressure",
      "issue": "Blood pressure 340/180 is physiologically implausible",
      "severity": "high"
    }
  ]
}
```

---

## Authentication

All API endpoints are protected by a simple API key check.

- Header: `x-api-key`
- Value must match `API_SECRET_KEY` environment variable
- Return `401` if missing or wrong
- This is NOT user auth — it's just to protect the API from open access

---

## AI Integration Rules

- All Claude API calls live in `server/src/services/claudeService.ts`
- Every call must be wrapped in try/catch with graceful fallback error messages
- Responses must be prompted to return **only valid JSON** — no markdown, no preamble
- Cache responses in an in-memory `Map` keyed by a hash of the input to avoid
  redundant API calls on identical requests
- Model to use: `claude-sonnet-4-20250514`
- Always include patient context in prompts — it matters for clinical reasoning

---

## Frontend Requirements

Two pages only:

1. **Medication Reconciler** — form to input conflicting records, displays reconciliation
   result with confidence score, reasoning, and approve/reject buttons
2. **Data Quality Validator** — form to input a patient record, displays scored breakdown
   with color indicators (red < 50, yellow 50–75, green > 75)

Keep the UI simple and functional. This is a clinician-facing tool — clarity wins over
visual complexity.

---

## Required Unit Tests (Minimum 5)

Tests live in `server/tests/`. Cover:

1. Input validation rejects malformed medication reconciliation requests
2. Input validation rejects malformed data quality requests
3. Auth middleware blocks requests with missing or wrong API key
4. Cache returns stored result on duplicate input (no second Claude call)
5. Data quality scoring correctly flags implausible vital signs

---

## Environment Variables

```
ANTHROPIC_API_KEY=      # Your Claude API key
API_SECRET_KEY=         # Secret for the x-api-key header auth
PORT=3001               # Server port
```

---


## Hard Constraints — Do Not Violate

- Do not add a third API endpoint
- Do not add a database (in-memory only)
- Do not add user authentication (API key check is sufficient)
- Do not add FHIR parsing or HL7 handling (out of scope)
- Do not use OpenAI — use Anthropic Claude API only
- Do not skip input validation — Zod schemas are required on both endpoints
- Do not hardcode the API key anywhere — always use environment variables
