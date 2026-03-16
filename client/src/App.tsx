import './App.css'
import { useState } from 'react'
import { MedicationReconciler } from './components/MedicationReconciler'
import { DataQualityValidator } from './components/DataQualityValidator'

type View = 'reconciler' | 'quality'

function App() {
  const [activeView, setActiveView] = useState<View>('reconciler')
  const [apiKey, setApiKey] = useState('')

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1 className="app-title">Clinical Data Reconciliation</h1>
          <p className="app-subtitle">
            Mini dashboard for medication reconciliation and data quality scoring.
          </p>
        </div>
        <div className="header-controls">
          <label className="field-label" htmlFor="apiKey">
            API key
          </label>
          <input
            id="apiKey"
            type="password"
            className="text-input api-key-input"
            placeholder="x-api-key for backend"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
      </header>

      <nav className="app-nav">
        <button
          type="button"
          className={`nav-tab ${activeView === 'reconciler' ? 'nav-tab-active' : ''}`}
          onClick={() => setActiveView('reconciler')}
        >
          Medication Reconciler
        </button>
        <button
          type="button"
          className={`nav-tab ${activeView === 'quality' ? 'nav-tab-active' : ''}`}
          onClick={() => setActiveView('quality')}
        >
          Data Quality Validator
        </button>
      </nav>

      <main className="app-main">
        {activeView === 'reconciler' ? (
          <MedicationReconciler apiKey={apiKey || undefined} />
        ) : (
          <DataQualityValidator apiKey={apiKey || undefined} />
        )}
      </main>

      <footer className="app-footer">
        <span className="legend">
          Color system: <span className="dot dot-red" /> scores &lt; 50,{' '}
          <span className="dot dot-yellow" /> 50–75, <span className="dot dot-green" /> &gt; 75.
        </span>
      </footer>
    </div>
  )
}

export default App
