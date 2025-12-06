import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { submitSelection } from '../api'

export default function LayoutPage({ projectData, setProjectData }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [afterState, setAfterState] = useState(null)
  const [warnings, setWarnings] = useState([])

  const handleSubmitSelection = async () => {
    if (!projectData.projectId || !projectData.selectedProducts || !projectData.anchors) {
      setError('Ontbrekende project data. Ga terug naar vorige stappen.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const selectedIds = projectData.selectedProducts.map(p => p.product_id)

      const result = await submitSelection(
        projectData.projectId,
        selectedIds,
        projectData.roomImagePath,
        projectData.anchors,
        { theme: 'modern', ambiance: 'bright' },
        { preserve_structure: true },
        { photorealistic: true }
      )

      setAfterState(result.after_state)
      setWarnings(result.fit_warnings || [])

      setProjectData(prev => ({
        ...prev,
        afterState: result.after_state,
        fitWarnings: result.fit_warnings
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    if (!afterState) {
      setError('Genereer eerst de layout')
      return
    }
    navigate('/visualize')
  }

  return (
    <div className="page">
      <h1 className="page-title">Layout & Fit Check</h1>
      <p className="page-subtitle">
        Controleer of de geselecteerde producten in uw badkamer passen
      </p>

      {error && <div className="error">{error}</div>}

      {projectData.anchors && (
        <div style={{ marginBottom: '2rem', background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px' }}>
          <h3>Ruimte afmetingen:</h3>
          <p>
            Breedte: {projectData.anchors.room_width_cm} cm<br />
            Diepte: {projectData.anchors.room_depth_cm} cm
          </p>

          <h3 style={{ marginTop: '1rem' }}>Geselecteerde producten ({projectData.selectedProducts?.length}):</h3>
          <ul>
            {projectData.selectedProducts?.map(p => (
              <li key={p.product_id}>{p.name} - €{p.price_eur?.toFixed(2)}</li>
            ))}
          </ul>
        </div>
      )}

      {!afterState && (
        <button
          className="btn btn-primary"
          onClick={handleSubmitSelection}
          disabled={loading}
        >
          {loading ? 'Layout genereren...' : 'Genereer Layout'}
        </button>
      )}

      {warnings.length > 0 && (
        <div className="warning" style={{ marginTop: '2rem' }}>
          <h3>Waarschuwingen:</h3>
          <ul>
            {warnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
          <p style={{ marginTop: '1rem' }}>
            Let op: deze waarschuwingen geven aan dat sommige producten mogelijk niet optimaal passen.
            U kunt toch doorgaan, maar houd rekening met mogelijke aanpassingen.
          </p>
        </div>
      )}

      {afterState && (
        <div style={{ marginTop: '2rem' }}>
          <div className="success">
            Layout succesvol gegenereerd! U kunt nu doorgaan naar visualisatie.
          </div>

          <div style={{ marginTop: '2rem', textAlign: 'right' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/catalog')} style={{ marginRight: '1rem' }}>
              Terug naar catalogus
            </button>
            <button className="btn btn-primary" onClick={handleContinue}>
              Ga verder naar visualisatie
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
