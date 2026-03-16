# Architecture

## System overview

```
Browser (React + Vite :5173)
        │
        │  HTTP POST /api/...
        │  x-api-key header
        ▼
Express server (:3001)
        │
        ├─ Auth middleware ──────────────── 401 if key missing/wrong
        │
        ├─ Zod validation ───────────────── 400 + field errors if invalid
        │
        ├─ Cache lookup (SHA-256 hash) ──── return cached response if hit
        │
        ├─ Claude API call ──────────────── build prompt → POST to Anthropic
        │
        ├─ Parse + validate JSON response
        │
        ├─ Store in cache
        │
        └─ Return JSON to client
```

---

## Request lifecycle

### 1. Client → Server

The React frontend sends a `POST` request to `/api/reconcile/medication` or
`/api/validate/data-quality`. The `x-api-key` header is set from the key the clinician
entered in the UI. Vite's dev proxy forwards `/api/*` to `http://localhost:3001`.

### 2. Auth middleware

`authMiddleware` reads `req.headers['x-api-key']` and compares it to `process.env.API_SECRET_KEY`.
Any mismatch returns `401` immediately — no business logic runs.

### 3. Zod validation

The route handler calls `Schema.safeParse(req.body)`. On failure it returns `400` with
`error.flatten()` — structured field-level errors the client can display directly.
On success the parsed, typed value flows to the service layer.

### 4. Cache lookup

`claudeService.ts` hashes the entire request payload with SHA-256 and checks an
in-memory `Map`. A cache hit returns the stored response immediately, skipping the
Claude API call entirely.

### 5. Claude API call

A prompt is built that embeds the full patient context alongside the source records (for
reconciliation) or the patient record fields (for data quality). The prompt instructs
Claude to return **only a raw JSON object** — no markdown, no preamble. The request is
sent to `https://api.anthropic.com/v1/messages` using `claude-sonnet-4-20250514`.

### 6. Response parsing

The raw text from `message.content[0].text` is parsed with `JSON.parse`. If parsing
fails or the shape is unexpected, an error is thrown and the route returns `500` with a
safe error message.

### 7. Cache store + return

The parsed response is stored in the cache under the request hash, then returned as
the HTTP response body.

---

## Directory structure

```
ehr-reconciliation/
├── .env                          # ANTHROPIC_API_KEY, API_SECRET_KEY, PORT
├── server/
│   ├── src/
│   │   ├── index.ts              # Express app, CORS, route registration
│   │   ├── middleware/
│   │   │   └── auth.ts           # x-api-key header check
│   │   ├── routes/
│   │   │   ├── reconcile.ts      # POST /api/reconcile/medication
│   │   │   └── validate.ts       # POST /api/validate/data-quality
│   │   ├── schemas/
│   │   │   └── index.ts          # Zod schemas + inferred TypeScript types
│   │   └── services/
│   │       └── claudeService.ts  # Prompt construction, cache, Claude HTTP call
│   └── tests/
│       └── index.test.ts         # Vitest unit tests (9 tests)
└── client/
    └── src/
        ├── App.tsx               # Shell: nav tabs, API key input
        ├── App.css               # All styles (colour system, layout, components)
        └── components/
            ├── MedicationReconciler.tsx   # Source form + reconciliation result
            └── DataQualityValidator.tsx   # Patient record form + scored breakdown
```

---

## Data flow diagrams

### Medication reconciliation

```
Client submits:
  patient_context { age, conditions, recent_labs }
  sources[]       { system, medication, reliability, dates }
         │
         ▼
Zod: ReconcileRequestSchema
  - patient_context required
  - sources min length 2
  - source_reliability enum: high | medium | low
         │
         ▼
SHA-256 hash of payload → cache lookup
         │
    hit ─┤─ miss
         │        │
         │        ▼
         │   Claude prompt:
         │     - Patient context embedded
         │     - Each source listed with reliability + recency
         │     - Instruction: return JSON only
         │        │
         │        ▼
         │   Response parsed:
         │     { reconciled_medication, confidence_score,
         │       reasoning, recommended_actions, clinical_safety_check }
         │        │
         └────────┤
                  ▼
             JSON response to client
```

### Data quality validation

```
Client submits:
  demographics, medications[], allergies[],
  conditions[], vital_signs{}, last_updated
         │
         ▼
Zod: DataQualityRequestSchema
  - medications, allergies, conditions required arrays
         │
         ▼
SHA-256 hash → cache lookup
         │
    hit ─┤─ miss
         │        │
         │        ▼
         │   Claude prompt:
         │     - All fields serialised into prompt
         │     - Score 4 dimensions 0–100
         │     - Identify field-level issues with severity
         │        │
         │        ▼
         │   Response parsed:
         │     { overall_score, breakdown{}, issues_detected[] }
         │        │
         └────────┤
                  ▼
             JSON response to client
             (colour-coded in UI: red <50, yellow 50–75, green >75)
```

---

## Key constraints

- Exactly 2 API endpoints — no additions
- In-memory storage only — no database
- Anthropic Claude API only — no other AI providers
- API key auth only — no user authentication
- Zod validation on every endpoint — no raw `req.body` access
