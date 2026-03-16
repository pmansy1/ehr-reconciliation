import { useState } from 'react'

type SourceReliability = 'low' | 'medium' | 'high'

interface SourceInput {
  system: string
  medication: string
  last_updated: string
  last_filled: string
  source_reliability: SourceReliability
}

interface MedicationReconcilerProps {
  apiKey?: string
}

interface ReconcileResponse {
  reconciled_medication: string
  confidence_score: number
  reasoning: string
  recommended_actions: string[]
  clinical_safety_check: string
}

export function MedicationReconciler({ apiKey }: MedicationReconcilerProps) {
  const [age, setAge] = useState<number | ''>('')
  const [conditions, setConditions] = useState('')
  const [sources, setSources] = useState<SourceInput[]>([
    {
      system: '',
      medication: '',
      last_updated: '',
      last_filled: '',
      source_reliability: 'medium',
    },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ReconcileResponse | null>(null)
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null)

  const handleSourceChange = (index: number, field: keyof SourceInput, value: string) => {
    setSources((prev) =>
      prev.map((src, i) => (i === index ? { ...src, [field]: value } : src)),
    )
  }

  const addSourceRow = () => {
    setSources((prev) => [
      ...prev,
      {
        system: '',
        medication: '',
        last_updated: '',
        last_filled: '',
        source_reliability: 'medium',
      },
    ])
  }

  const removeSourceRow = (index: number) => {
    setSources((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!apiKey) {
      setError('Enter an API key to call the backend.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setDecision(null)

    const payload = {
      patient_context: {
        age: typeof age === 'number' ? age : undefined,
        conditions: conditions
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      },
      sources: sources.filter((s) => s.system || s.medication),
    }

    try {
      const response = await fetch('/api/reconcile/medication', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to reconcile medication records')
      }

      const data: ReconcileResponse = await response.json()
      setResult(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const confidencePercentage = result ? Math.round(result.confidence_score * 100) : null

  return (
    <div className="panel">
      <h2 className="panel-title">Medication Reconciler</h2>
      <p className="panel-description">
        Paste or enter conflicting medication records across systems. The engine will propose a
        reconciled medication, confidence score, reasoning, and recommended actions.
      </p>

      <form className="form" onSubmit={handleSubmit}>
        <fieldset className="fieldset">
          <legend className="legend">Patient context</legend>
          <div className="field-row">
            <label className="field-label" htmlFor="age">
              Age
            </label>
            <input
              id="age"
              type="number"
              min={0}
              className="text-input"
              value={age}
              onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
              placeholder="e.g. 67"
            />
          </div>
          <div className="field-row">
            <label className="field-label" htmlFor="conditions">
              Conditions
            </label>
            <textarea
              id="conditions"
              className="text-area"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="Comma-separated list, e.g. Type 2 Diabetes, Hypertension"
              rows={2}
            />
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend className="legend">Medication sources</legend>
          <div className="sources-grid">
            {sources.map((source, index) => (
              <div key={index} className="source-row">
                <div className="field-row">
                  <label className="field-label">System</label>
                  <input
                    type="text"
                    className="text-input"
                    value={source.system}
                    onChange={(e) => handleSourceChange(index, 'system', e.target.value)}
                    placeholder="e.g. Hospital EHR"
                  />
                </div>
                <div className="field-row">
                  <label className="field-label">Medication</label>
                  <input
                    type="text"
                    className="text-input"
                    value={source.medication}
                    onChange={(e) => handleSourceChange(index, 'medication', e.target.value)}
                    placeholder="e.g. Metformin 1000mg twice daily"
                  />
                </div>
                <div className="field-row field-row-inline">
                  <div>
                    <label className="field-label">Last updated</label>
                    <input
                      type="date"
                      className="text-input"
                      value={source.last_updated}
                      onChange={(e) => handleSourceChange(index, 'last_updated', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">Last filled</label>
                    <input
                      type="date"
                      className="text-input"
                      value={source.last_filled}
                      onChange={(e) => handleSourceChange(index, 'last_filled', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">Reliability</label>
                    <select
                      className="text-input"
                      value={source.source_reliability}
                      onChange={(e) =>
                        handleSourceChange(index, 'source_reliability', e.target.value)
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                {sources.length > 1 && (
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => removeSourceRow(index)}
                  >
                    Remove source
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            className="button button-secondary"
            onClick={addSourceRow}
          >
            Add another source
          </button>
        </fieldset>

        <div className="form-actions">
          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Reconciling…' : 'Reconcile medication'}
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
      </form>

      {result && (
        <section className="result-card">
          <header className="result-header">
            <div>
              <h3 className="result-title">Reconciled medication</h3>
              <p className="result-medication">{result.reconciled_medication}</p>
            </div>
            {confidencePercentage !== null && (
              <div className="result-confidence">
                <span className="label">Confidence</span>
                <span className="confidence-value">{confidencePercentage}%</span>
              </div>
            )}
          </header>

          <div className="result-body">
            <div>
              <h4 className="section-heading">Reasoning</h4>
              <p className="result-text">{result.reasoning}</p>
            </div>

            {result.recommended_actions?.length > 0 && (
              <div>
                <h4 className="section-heading">Recommended actions</h4>
                <ul className="bullet-list">
                  {result.recommended_actions.map((action, idx) => (
                    <li key={idx}>{action}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h4 className="section-heading">Clinical safety check</h4>
              <p className="result-text">{result.clinical_safety_check}</p>
            </div>
          </div>

          <footer className="result-footer">
            <span className="label">Clinician decision</span>
            <div className="button-group">
              <button
                type="button"
                className={`button button-small ${
                  decision === 'approved' ? 'button-primary-outline' : 'button-secondary'
                }`}
                onClick={() => setDecision('approved')}
              >
                Approve
              </button>
              <button
                type="button"
                className={`button button-small ${
                  decision === 'rejected' ? 'button-primary-outline' : 'button-secondary'
                }`}
                onClick={() => setDecision('rejected')}
              >
                Reject
              </button>
            </div>
            {decision && (
              <span className="decision-pill">
                {decision === 'approved' ? 'Approved' : 'Rejected'} by clinician
              </span>
            )}
          </footer>
        </section>
      )}
    </div>
  )
}

