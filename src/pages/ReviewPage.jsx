import { useNavigate } from 'react-router-dom'

export default function ReviewPage({ projectData }) {
  const navigate = useNavigate()

  return (
    <div className="page">
      <h1 className="page-title">Project Overzicht</h1>
      <p className="page-subtitle">
        Compleet overzicht van uw badkamerrenovatie project
      </p>

      <div className="success" style={{ marginBottom: '2rem' }}>
        <strong>Project ingediend!</strong> Uw project is klaar voor admin goedkeuring.
        Project ID: {projectData.projectId}
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Before State</h3>
          <p>
            Ruimte: {projectData.anchors?.room_width_cm} x {projectData.anchors?.room_depth_cm} cm
          </p>
          {projectData.beforeState && (
            <ul>
              {projectData.beforeState.fixtures?.toilet?.present && <li>Toilet</li>}
              {projectData.beforeState.fixtures?.washbasin?.present && <li>Wastafel</li>}
              {projectData.beforeState.fixtures?.shower?.present && <li>Douche</li>}
            </ul>
          )}
        </div>

        <div className="card">
          <h3>Geselecteerde Producten</h3>
          <p>{projectData.selectedProducts?.length || 0} producten</p>
          <ul>
            {projectData.selectedProducts?.slice(0, 5).map(p => (
              <li key={p.product_id}>{p.name}</li>
            ))}
            {projectData.selectedProducts?.length > 5 && (
              <li>... en {projectData.selectedProducts.length - 5} meer</li>
            )}
          </ul>
        </div>

        <div className="card">
          <h3>Werkplan</h3>
          <p>
            Totaal uren: {projectData.workPlan?.total_estimated_hours || 79}
          </p>
          <p>
            Fases: {projectData.workPlan?.phases?.length || 4}
          </p>
        </div>

        <div className="card">
          <h3>Prijsberekening</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#27ae60' }}>
            €{projectData.pricing?.total || 'Berekenen...'}
          </p>
          <p style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
            Richtprijs, exclusief BTW
          </p>
        </div>
      </div>

      <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
        <h3>Volgende stappen:</h3>
        <ol>
          <li>Een admin zal uw project beoordelen</li>
          <li>U ontvangt een bevestiging wanneer het project is goedgekeurd</li>
          <li>De aannemer neemt contact met u op voor een inspectie</li>
          <li>Na inspectie ontvangt u de definitieve offerte</li>
        </ol>
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'right' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/pricing')} style={{ marginRight: '1rem' }}>
          Terug naar prijs
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/intake')}>
          Nieuw project starten
        </button>
      </div>
    </div>
  )
}
