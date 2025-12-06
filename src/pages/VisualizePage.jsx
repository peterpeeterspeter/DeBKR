import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function VisualizePage({ projectData, setProjectData }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleContinue = () => {
    navigate('/workplan')
  }

  return (
    <div className="page">
      <h1 className="page-title">After-Beeld Visualisatie</h1>
      <p className="page-subtitle">
        AI-gegenereerde visualisatie van uw nieuwe badkamer
      </p>

      <div className="warning" style={{ marginBottom: '2rem' }}>
        <strong>Let op:</strong> AI-beeldgeneratie vereist GEMINI_API_KEY en kan 30-60 seconden duren.
        Voor de demo gaan we direct door naar het werkplan.
      </div>

      <div style={{ textAlign: 'center', padding: '3rem', background: '#f8f9fa', borderRadius: '8px' }}>
        <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🖼️</p>
        <p style={{ color: '#7f8c8d' }}>
          Hier zou de gegenereerde after-visualisatie verschijnen met:<br />
          - Behoud van muren, deur en raam uit originele foto<br />
          - Geselecteerde producten geïntegreerd<br />
          - Fotorealistische weergave
        </p>
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'right' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/layout')} style={{ marginRight: '1rem' }}>
          Terug
        </button>
        <button className="btn btn-primary" onClick={handleContinue}>
          Ga verder naar werkplan
        </button>
      </div>
    </div>
  )
}
