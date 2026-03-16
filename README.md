# EHR Reconciliation Engine

A mini clinical data reconciliation engine that uses AI to resolve conflicting patient
medication records across multiple healthcare systems and score the quality of patient data.

Built as a take-home assessment for the EHR Integration Intern role at Onye.

**Live demo:** https://ehr-reconciliation.vercel.app

---

## What it does

**Medication Reconciler** — Given conflicting medication records from multiple sources
(hospital EHR, primary care, pharmacy), the engine produces a single reconciled regimen
with a confidence score, clinical reasoning, and recommended follow-up actions.

**Data Quality Validator** — Given a patient record, the engine scores it across four
dimensions (completeness, accuracy, timeliness, clinical plausibility) and surfaces
specific field-level issues with severity labels.

---

## Running locally

### Prerequisites

- Node.js 18+
- An Anthropic API key

### 1. Clone and install

```bash
git clone https://github.com/pmansy1/ehr-reconciliation
cd ehr-reconciliation

cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 2. Configure environment

Create a `.env` file at the repo root:

```env
ANTHROPIC_API_KEY=sk-ant-...   # Your Claude API key
API_SECRET_KEY=your-secret     # Any string — used as the x-api-key header value
PORT=3001
```

### 3. Build and start the server

```bash
cd server
npm run build
npm start
```

### 4. Start the frontend

```bash
cd client
npm run dev
```

Open `http://localhost:5173`, enter your `API_SECRET_KEY` in the key field, and both
pages are ready.

### 5. Run the tests

```bash
cd server
npm test
```

---

## API endpoints

All endpoints require the `x-api-key` header matching `API_SECRET_KEY`.

### `POST /api/reconcile/medication`

Reconciles conflicting medication records from multiple sources.

```json
{
  "patient_context": {
    "age": 67,
    "conditions": ["Type 2 Diabetes", "Hypertension"],
    "recent_labs": { "eGFR": 45 }
  },
  "sources": [
    { "system": "Hospital EHR", "medication": "Metformin 1000mg twice daily", "last_updated": "2024-10-15", "source_reliability": "high" },
    { "system": "Primary Care",  "medication": "Metformin 500mg twice daily",  "last_updated": "2025-01-20", "source_reliability": "high" },
    { "system": "Pharmacy",      "medication": "Metformin 1000mg daily",       "last_filled": "2025-01-25", "source_reliability": "medium" }
  ]
}
```

### `POST /api/validate/data-quality`

Scores a patient record across four data quality dimensions.

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

---

## Why Claude API

**JSON output reliability.** Claude follows structured output instructions consistently.
Every prompt explicitly requests a raw JSON object with no markdown — the responses parse
reliably without post-processing.

**Clinical reasoning quality.** Medication reconciliation requires understanding
drug–condition interactions, dose adjustments for lab values (e.g. Metformin + low eGFR),
and source trustworthiness. Claude's reasoning over clinical context is materially better
than simpler completion models for this task.

**Recency weighting.** The prompt surfaces both `last_updated` and `last_filled` dates
alongside `source_reliability`. Claude correctly treats a more recent low-reliability
source as a tie-breaker signal rather than a definitive answer, matching real clinical
workflow.

---

## Prompt engineering approach

**Patient context is embedded inline with the source records, not sent separately.**
Medication reconciliation decisions are context-dependent — the right dose of Metformin
for a 67-year-old with eGFR 45 is different from the right dose for a healthy 40-year-old.
By placing age, conditions, and lab values in the same prompt block as the conflicting
sources, Claude reasons over them together rather than treating them as independent inputs.
This produces clinically grounded reconciliation rather than a simple recency or
reliability vote.

**Every prompt instructs Claude to return raw JSON with no markdown preamble.**
LLMs naturally want to wrap responses in prose or code fences. A stray ` ```json ` block
breaks `JSON.parse` silently. The prompts explicitly state "Return ONLY a single JSON
object with this exact shape (no markdown, no extra text)" and include the target schema
inline so the field names, types, and allowed enum values are unambiguous. This makes
the response parseable deterministically without regex cleanup or post-processing.

**Temperature is set to 0.2.**
Clinical decisions should be consistent and reproducible for the same inputs. A low
temperature reduces variance in the output while still allowing Claude to reason through
novel combinations of conditions and sources.

---

## Design decisions

**In-memory cache (`Map` keyed by SHA-256 of the request body)**
Every Claude call costs money and adds latency. Identical inputs should never trigger a
second API call within a server session. A `Map` is sufficient for this scope — no
external dependency, zero ops overhead. A production system would use Redis with a TTL.

**Zod validation at the route boundary**
All inputs are validated against a strict schema before touching any business logic. This
gives precise field-level error messages, ensures TypeScript types are sound at runtime,
and fails fast so bad data never reaches the Claude prompt.

**Monorepo layout (`server/` + `client/`)**
Both packages share the same `.env` and git history, making it trivial to run, review,
and deploy together. For a larger project they would be split into separate repos with
a shared types package.

**Express 5 + TypeScript**
Express 5 ships async error propagation natively, which removes the need for
`express-async-errors` wrappers. TypeScript enforces the Zod-inferred request/response
shapes across the whole server.

---

## What I'd improve with more time

| Area | Current | Improvement |
|------|---------|-------------|
| Persistence | In-memory `Map` (resets on restart) | PostgreSQL or Redis for durable cache + audit trail |
| Data models | Free-form JSON fields | FHIR R4 resource types (MedicationStatement, Patient, Observation) |
| Streaming | Full response before render | Server-sent events so reasoning streams to the UI token-by-token |
| Confidence calibration | Delegated entirely to Claude | Pre-score sources by recency + reliability before the prompt to anchor Claude's output |
| Duplicate detection | Not implemented | Detect when two sources describe the same record (same drug, similar dose) before reconciling |
| Auth | Single shared API key | Per-user JWT or API key rotation with an audit log |
| Observability | `console.log` | Structured logging (Pino), request tracing, Claude call latency metrics |

---

## How I used Claude Code

**Scaffolding and wiring verification.** I used Claude Code to spin up both the server
and client, run live curl requests against the API, and confirm every layer was wired
correctly — auth rejection, Zod validation errors, and full Claude responses — before
writing a single test. This caught a missing `vite-env.d.ts` that was causing the
frontend TypeScript build to fail silently.

**Prompt iteration.** I used Claude Code to draft and refine the clinical prompts in
`claudeService.ts`. Rather than guessing whether Claude would reliably return raw JSON
with the right field names, I iterated on the prompt wording with Claude Code until the
response shape was consistent and parseable without any post-processing cleanup.

---

## Time spent

| Task | Time |
|------|------|
| Project scaffolding, Express setup, middleware | ~1 h |
| Zod schemas + route handlers | ~45 min |
| Claude service (prompts, caching, error handling) | ~1.5 h |
| React frontend (both pages + CSS) | ~2 h |
| Unit tests | ~1 h |
| README + architecture doc | ~45 min |
| **Total** | **~7 h** |
