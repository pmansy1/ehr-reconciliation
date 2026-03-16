import { useState } from 'react'

interface DataQualityValidatorProps {
  apiKey?: string
}

interface DataQualityResponse {
  overall_score: number
  breakdown: {
    completeness: number
    accuracy: number
    timeliness: number
    clinical_plausibility: number
  }
  issues_detected: {
    field: string
    issue: string
    severity: string
  }[]
}

function getScoreClass(score: number): string {
  if (score < 50) return 'score-chip score-chip-red'
  if (score <= 75) return 'score-chip score-chip-yellow'
  return 'score-chip score-chip-green'
}

export function DataQualityValidator({ apiKey }: DataQualityValidatorProps) {
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [medications, setMedications] = useState('')
  const [allergies, setAllergies] = useState('')
  const [conditions, setConditions] = useState('')
  const [bloodPressure, setBloodPressure] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DataQualityResponse | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!apiKey) {
      setError('Enter an API key to call the backend.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    const payload = {
      demographics: {
        name: name || undefined,
        dob: dob || undefined,
        gender: gender || undefined,
      },
      medications: medications
        .split('\n')
        .flatMap((line) => line.split(','))
        .map((m) => m.trim())
        .filter(Boolean),
      allergies: allergies
        .split('\n')
        .flatMap((line) => line.split(','))
        .map((a) => a.trim())
        .filter(Boolean),
      conditions: conditions
        .split('\n')
        .flatMap((line) => line.split(','))
        .map((c) => c.trim())
        .filter(Boolean),
      vital_signs: {
        blood_pressure: bloodPressure || undefined,
        heart_rate: heartRate ? Number(heartRate) : undefined,
      },
      last_updated: lastUpdated || undefined,
    }

    try {
      const response = await fetch('/api/validate/data-quality', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to validate data quality')
      }

      const data: DataQualityResponse = await response.json()
      setResult(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Data Quality Validator</h2>
      <p className="panel-description">
        Enter a patient record to score its data quality across completeness, accuracy, timeliness,
        and clinical plausibility.
      </p>

      <form className="form" onSubmit={handleSubmit}>
        <fieldset className="fieldset">
          <legend className="legend">Demographics</legend>
          <div className="field-row">
            <label className="field-label" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              type="text"
              className="text-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
            />
          </div>
          <div className="field-row field-row-inline">
            <div>
              <label className="field-label" htmlFor="dob">
                Date of birth
              </label>
              <input
                id="dob"
                type="date"
                className="text-input"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="gender">
                Gender
              </label>
              <input
                id="gender"
                type="text"
                className="text-input"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                placeholder="e.g. M / F / X"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend className="legend">Clinical data</legend>
          <div className="field-row">
            <label className="field-label" htmlFor="medications">
              Medications
            </label>
            <textarea
              id="medications"
              className="text-area"
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
              placeholder="One per line or comma separated"
              rows={3}
            />
          </div>

          <div className="field-row">
            <label className="field-label" htmlFor="allergies">
              Allergies
            </label>
            <textarea
              id="allergies"
              className="text-area"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="One per line or comma separated"
              rows={2}
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
              placeholder="One per line or comma separated"
              rows={2}
            />
          </div>

          <div className="field-row field-row-inline">
            <div>
              <label className="field-label" htmlFor="bloodPressure">
                Blood pressure
              </label>
              <input
                id="bloodPressure"
                type="text"
                className="text-input"
                value={bloodPressure}
                onChange={(e) => setBloodPressure(e.target.value)}
                placeholder="e.g. 120/80"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="heartRate">
                Heart rate
              </label>
              <input
                id="heartRate"
                type="number"
                min={0}
                className="text-input"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                placeholder="e.g. 72"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="lastUpdated">
                Last updated
              </label>
              <input
                id="lastUpdated"
                type="date"
                className="text-input"
                value={lastUpdated}
                onChange={(e) => setLastUpdated(e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        <div className="form-actions">
          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Scoring…' : 'Score data quality'}
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
      </form>

      {result && (
        <section className="result-card">
          <header className="result-header">
            <div>
              <h3 className="result-title">Overall data quality</h3>
              <div className={getScoreClass(result.overall_score)}>
                <span className="score-label">{result.overall_score}</span>
              </div>
            </div>
          </header>

          <div className="result-body result-body-grid">
            <div>
              <h4 className="section-heading">Dimension scores</h4>
              <ul className="score-list">
                <li className="score-list-item">
                  <span>Completeness</span>
                  <span className={getScoreClass(result.breakdown.completeness)}>
                    {result.breakdown.completeness}
                  </span>
                </li>
                <li className="score-list-item">
                  <span>Accuracy</span>
                  <span className={getScoreClass(result.breakdown.accuracy)}>
                    {result.breakdown.accuracy}
                  </span>
                </li>
                <li className="score-list-item">
                  <span>Timeliness</span>
                  <span className={getScoreClass(result.breakdown.timeliness)}>
                    {result.breakdown.timeliness}
                  </span>
                </li>
                <li className="score-list-item">
                  <span>Clinical plausibility</span>
                  <span className={getScoreClass(result.breakdown.clinical_plausibility)}>
                    {result.breakdown.clinical_plausibility}
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="section-heading">Issues detected</h4>
              {result.issues_detected.length === 0 ? (
                <p className="result-text">No issues detected.</p>
              ) : (
                <ul className="issue-list">
                  {result.issues_detected.map((issue, idx) => (
                    <li key={idx} className="issue-item">
                      <div className="issue-header">
                        <span className="issue-field">{issue.field}</span>
                        <span className={`issue-severity issue-severity-${issue.severity}`}>
                          {issue.severity}
                        </span>
                      </div>
                      <p className="issue-text">{issue.issue}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

