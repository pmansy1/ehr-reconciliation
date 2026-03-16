import crypto from 'crypto';
import { ReconcileRequest, DataQualityRequest } from '../schemas';

type ReconcileResponse = {
  reconciled_medication: string;
  confidence_score: number;
  reasoning: string;
  recommended_actions: string[];
  clinical_safety_check: string;
};

type DataQualityResponse = {
  overall_score: number;
  breakdown: {
    completeness: number;
    accuracy: number;
    timeliness: number;
    clinical_plausibility: number;
  };
  issues_detected: Array<{
    field: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
  }>;
};

const reconcileCache = new Map<string, ReconcileResponse>();
const dataQualityCache = new Map<string, DataQualityResponse>();

const MODEL_NAME = 'claude-sonnet-4-20250514';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

function hashInput(input: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

async function callClaude(userPrompt: string): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      max_tokens: 600,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: userPrompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Claude API rate limit reached — please try again shortly');
    }
    const errorText = await response.text();
    throw new Error(`Anthropic HTTP ${response.status}: ${errorText}`);
  }

  return response.json();
}

export async function reconcileMedicationWithClaude(
  payload: ReconcileRequest,
): Promise<ReconcileResponse> {
  const cacheKey = hashInput(payload);
  const cached = reconcileCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const userPrompt = `
You are a clinical decision support assistant helping reconcile conflicting medication records.

Patient context:
- Age: ${payload.patient_context.age}
- Conditions: ${payload.patient_context.conditions.join(', ') || 'none documented'}
- Recent labs: ${
    payload.patient_context.recent_labs
      ? Object.entries(payload.patient_context.recent_labs)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')
      : 'none provided'
  }

Source medication records (with reliability and recency):
${payload.sources
  .map((s, idx) => {
    const lastUpdated = s.last_updated ? `last_updated: ${s.last_updated}` : '';
    const lastFilled = s.last_filled ? `last_filled: ${s.last_filled}` : '';
    const recency = [lastUpdated, lastFilled].filter(Boolean).join(', ');
    return `- [${idx + 1}] system: ${s.system}, medication: ${s.medication}, reliability: ${
      s.source_reliability
    }${recency ? `, ${recency}` : ''}`;
  })
  .join('\n')}

Task:
1. Reconcile these records into ONE recommended medication regimen.
2. Consider both source reliability and recency, as well as clinical safety given the patient context.
3. Return ONLY a single JSON object with the following shape (no markdown, no extra text):
{
  "reconciled_medication": string,           // final recommended regimen
  "confidence_score": number,               // 0 to 1
  "reasoning": string,                      // concise explanation
  "recommended_actions": string[],          // e.g. actions to update EHRs, confirm with patient
  "clinical_safety_check": "PASSED" | "FAILED"
}
`;

  try {
    const message = await callClaude(userPrompt);

    if (!message.content || !Array.isArray(message.content) || message.content.length === 0) {
      throw new Error('Empty Claude response content');
    }

    const first = message.content[0];
    if (first.type !== 'text' || !first.text) {
      throw new Error('Unexpected Claude response format');
    }

    const parsed = JSON.parse(first.text) as ReconcileResponse;
    reconcileCache.set(cacheKey, parsed);
    return parsed;
  } catch (error: unknown) {
    // Surface a clean error upwards; route will convert to HTTP 500
    const message =
      error instanceof Error ? error.message : 'Unknown error calling Claude for reconciliation';
    throw new Error(`Claude reconciliation failed: ${message}`);
  }
}

export async function validateDataQualityWithClaude(
  payload: DataQualityRequest,
): Promise<DataQualityResponse> {
  const cacheKey = hashInput(payload);
  const cached = dataQualityCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const userPrompt = `
You are a clinical data quality reviewer. Score the quality of this patient record and flag issues.

Patient record:
- Demographics: ${JSON.stringify(payload.demographics)}
- Medications: ${JSON.stringify(payload.medications)}
- Allergies: ${JSON.stringify(payload.allergies)}
- Conditions: ${JSON.stringify(payload.conditions)}
- Vital signs: ${JSON.stringify(payload.vital_signs)}
- Last updated: ${payload.last_updated ?? 'not documented'}

Task:
1. Score data quality from 0–100 on these dimensions:
   - completeness
   - accuracy
   - timeliness
   - clinical_plausibility
2. Compute an overall_score (0–100) summarizing these.
3. Identify specific fields that look incomplete, inaccurate, out-of-date, or implausible.
4. For each issue, provide:
   - field: string (e.g. "allergies" or "vital_signs.blood_pressure")
   - issue: string description
   - severity: "low" | "medium" | "high"

Return ONLY a single JSON object with this exact shape (no markdown, no extra text):
{
  "overall_score": number,
  "breakdown": {
    "completeness": number,
    "accuracy": number,
    "timeliness": number,
    "clinical_plausibility": number
  },
  "issues_detected": [
    {
      "field": string,
      "issue": string,
      "severity": "low" | "medium" | "high"
    }
  ]
}
`;

  try {
    const message = await callClaude(userPrompt);

    if (!message.content || !Array.isArray(message.content) || message.content.length === 0) {
      throw new Error('Empty Claude response content');
    }

    const first = message.content[0];
    if (first.type !== 'text' || !first.text) {
      throw new Error('Unexpected Claude response format');
    }

    const parsed = JSON.parse(first.text) as DataQualityResponse;
    dataQualityCache.set(cacheKey, parsed);
    return parsed;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error calling Claude for data quality';
    throw new Error(`Claude data quality validation failed: ${message}`);
  }
}

