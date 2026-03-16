import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

import { ReconcileRequestSchema, DataQualityRequestSchema } from '../src/schemas/index'
import { authMiddleware } from '../src/middleware/auth'
import {
  reconcileMedicationWithClaude,
  validateDataQualityWithClaude,
} from '../src/services/claudeService'

// ── helpers ────────────────────────────────────────────────────────────────

function mockReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request
}

function mockRes() {
  const res = { status: vi.fn(), json: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

function fakeFetch(body: object) {
  return Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        content: [{ type: 'text', text: JSON.stringify(body) }],
      }),
  }) as unknown as Promise<globalThis.Response>
}

// ── 1. Input validation — medication records ───────────────────────────────

describe('input validation: medication reconciliation', () => {
  it('rejects empty body', () => {
    const result = ReconcileRequestSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = Object.keys(result.error.flatten().fieldErrors)
      expect(fields).toContain('patient_context')
      expect(fields).toContain('sources')
    }
  })

  it('rejects sources array with fewer than 2 entries', () => {
    const result = ReconcileRequestSchema.safeParse({
      patient_context: { age: 50, conditions: [] },
      sources: [{ system: 'A', medication: 'Aspirin 81mg', source_reliability: 'high' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid source_reliability value', () => {
    const result = ReconcileRequestSchema.safeParse({
      patient_context: { age: 50, conditions: [] },
      sources: [
        { system: 'A', medication: 'Aspirin 81mg', source_reliability: 'unknown' },
        { system: 'B', medication: 'Aspirin 81mg', source_reliability: 'high' },
      ],
    })
    expect(result.success).toBe(false)
  })
})

// ── 2. Reconciliation returns expected shape ───────────────────────────────

describe('reconciliation response shape', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns all required fields with correct types', async () => {
    const claudeBody = {
      reconciled_medication: 'Metformin 500mg twice daily',
      confidence_score: 0.88,
      reasoning: 'Primary care record is most recent.',
      recommended_actions: ['Update hospital EHR'],
      clinical_safety_check: 'PASSED',
    }

    vi.spyOn(globalThis, 'fetch').mockReturnValue(fakeFetch(claudeBody))

    const result = await reconcileMedicationWithClaude({
      patient_context: { age: 67, conditions: ['Type 2 Diabetes'] },
      sources: [
        { system: 'Hospital EHR', medication: 'Metformin 1000mg', source_reliability: 'high', last_updated: '2024-10-15' },
        { system: 'Primary Care', medication: 'Metformin 500mg twice daily', source_reliability: 'high', last_updated: '2025-01-20' },
      ],
    })

    expect(typeof result.reconciled_medication).toBe('string')
    expect(result.reconciled_medication.length).toBeGreaterThan(0)
    expect(typeof result.confidence_score).toBe('number')
    expect(result.confidence_score).toBeGreaterThanOrEqual(0)
    expect(result.confidence_score).toBeLessThanOrEqual(1)
    expect(typeof result.reasoning).toBe('string')
    expect(Array.isArray(result.recommended_actions)).toBe(true)
    expect(['PASSED', 'FAILED']).toContain(result.clinical_safety_check)
  })
})

// ── 3. Data quality — implausible vital signs ──────────────────────────────

describe('data quality: implausible vitals', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('flags BP 340/180 as a high-severity clinical plausibility issue', async () => {
    const claudeBody = {
      overall_score: 40,
      breakdown: { completeness: 70, accuracy: 30, timeliness: 60, clinical_plausibility: 10 },
      issues_detected: [
        {
          field: 'vital_signs.blood_pressure',
          issue: 'Blood pressure 340/180 is physiologically implausible',
          severity: 'high',
        },
      ],
    }

    vi.spyOn(globalThis, 'fetch').mockReturnValue(fakeFetch(claudeBody))

    const result = await validateDataQualityWithClaude({
      demographics: { name: 'John Doe', dob: '1955-03-15', gender: 'M' },
      medications: ['Metformin 500mg'],
      allergies: [],
      conditions: ['Type 2 Diabetes'],
      vital_signs: { blood_pressure: '340/180', heart_rate: 72 },
      last_updated: '2024-06-15',
    })

    const bpIssue = result.issues_detected.find(
      (i) => i.field === 'vital_signs.blood_pressure',
    )
    expect(bpIssue).toBeDefined()
    expect(bpIssue?.severity).toBe('high')
    expect(result.breakdown.clinical_plausibility).toBeLessThan(50)
  })
})

// ── 4. Cache — no duplicate Claude calls ──────────────────────────────────

describe('cache: deduplicates identical requests', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls Claude only once for two identical payloads', async () => {
    const claudeBody = {
      overall_score: 80,
      breakdown: { completeness: 80, accuracy: 80, timeliness: 80, clinical_plausibility: 80 },
      issues_detected: [],
    }

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockReturnValue(fakeFetch(claudeBody))

    const payload = {
      demographics: { name: 'Cache Test Patient' },
      medications: ['Lisinopril 10mg'],
      allergies: ['Penicillin'],
      conditions: ['Hypertension'],
      vital_signs: { blood_pressure: '120/80', heart_rate: 70 },
      last_updated: '2025-01-01',
    }

    const first = await validateDataQualityWithClaude(payload)
    const second = await validateDataQualityWithClaude(payload)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(first).toEqual(second)
  })
})

// ── 5. Auth middleware ─────────────────────────────────────────────────────

describe('auth middleware', () => {
  const SECRET = 'test-secret'

  beforeEach(() => {
    process.env.API_SECRET_KEY = SECRET
  })

  afterEach(() => {
    delete process.env.API_SECRET_KEY
  })

  it('returns 401 when x-api-key header is missing', () => {
    const next = vi.fn() as unknown as NextFunction
    const res = mockRes()

    authMiddleware(mockReq(), res as unknown as Response, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when x-api-key is wrong', () => {
    const next = vi.fn() as unknown as NextFunction
    const res = mockRes()

    authMiddleware(mockReq({ 'x-api-key': 'bad-key' }), res as unknown as Response, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next() when x-api-key is correct', () => {
    const next = vi.fn() as unknown as NextFunction
    const res = mockRes()

    authMiddleware(mockReq({ 'x-api-key': SECRET }), res as unknown as Response, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })
})
