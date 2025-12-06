import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateWorkPlan } from '../api'

export default function WorkPlanPage({ projectData, setProjectData }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [workPlan, setWorkPlan] = useState(projectData.workPlan)

  const handleGenerateWorkPlan = async () => {
    if (!projectData.beforeState || !projectData.afterState) {
      setError('Ontbrekende before/after state. Ga terug naar vorige stappen.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await generateWorkPlan(
        projectData.projectId,
        projectData.beforeState,
        projectData.afterState,
        'mid'
      )

      setWorkPlan(result.work_plan)
      setProjectData(prev => ({
        ...prev,
        workPlan: result.work_plan
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    if (!workPlan) {
      setError('Genereer eerst het werkplan')
      return
    }
    navigate('/pricing')
  }

  const mockWorkPlan = {
    phases: [
      {
        phase: 1,
        name: 'Sloop & Voorbereiding',
        tasks: [
          { task: 'Verwijderen oude tegels', estimated_hours: 8 },
          { task: 'Verwijderen sanitair', estimated_hours: 4 }
        ]
      },
      {
        phase: 2,
        name: 'Loodgieterswerk',
        tasks: [
          { task: 'Leidingen aanpassen', estimated_hours: 12 },
          { task: 'Afvoeren verleggen', estimated_hours: 6 }
        ]
      },
      {
        phase: 3,
        name: 'Tegelwerk',
        tasks: [
          { task: 'Vloertegels plaatsen', estimated_hours: 16 },
          { task: 'Wandtegels plaatsen', estimated_hours: 20 }
        ]
      },
      {
        phase: 4,
        name: 'Installatie Sanitair',
        tasks: [
          { task: 'Toilet plaatsen', estimated_hours: 3 },
          { task: 'Wastafel installeren', estimated_hours: 4 },
          { task: 'Douche installeren', estimated_hours: 6 }
        ]
      }
    ],
    total_estimated_hours: 79
  }

  const displayPlan = workPlan || mockWorkPlan

  return (
    <div className="page">
      <h1 className="page-title">Werkplan</h1>
      <p className="page-subtitle">
        Gedetailleerd overzicht van de uit te voeren werkzaamheden
      </p>

      {error && <div className="error">{error}</div>}

      {!workPlan && (
        <div style={{ marginBottom: '2rem' }}>
          <div className="warning">
            <strong>Let op:</strong> Voor een AI-gegenereerd werkplan is GEMINI_API_KEY vereist.
            Hieronder ziet u een voorbeeld werkplan.
          </div>
          <button
            className="btn btn-primary"
            onClick={handleGenerateWorkPlan}
            disabled={loading}
            style={{ marginTop: '1rem' }}
          >
            {loading ? 'Werkplan genereren...' : 'Genereer AI Werkplan'}
          </button>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <h3>Totaal geschatte uren: {displayPlan.total_estimated_hours}</h3>
        </div>

        {displayPlan.phases.map((phase, idx) => (
          <div key={idx} style={{ marginBottom: '2rem', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem' }}>
            <h3 style={{ color: '#2c3e50', marginBottom: '1rem' }}>
              Fase {phase.phase}: {phase.name}
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Taak</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem' }}>Uren</th>
                </tr>
              </thead>
              <tbody>
                {phase.tasks.map((task, taskIdx) => (
                  <tr key={taskIdx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '0.75rem' }}>{task.task}</td>
                    <td style={{ textAlign: 'right', padding: '0.75rem' }}>{task.estimated_hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'right' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/visualize')} style={{ marginRight: '1rem' }}>
          Terug
        </button>
        <button className="btn btn-primary" onClick={handleContinue}>
          Ga verder naar prijsberekening
        </button>
      </div>
    </div>
  )
}
