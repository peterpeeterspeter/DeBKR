import { useState, useEffect } from 'react'
import { getPendingProjects, approveProject, getProject } from '../api'

export default function AdminPage() {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const data = await getPendingProjects()
      setProjects(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleViewProject = async (projectId) => {
    try {
      const data = await getProject(projectId)
      setSelectedProject(data)
    } catch (err) {
      alert(`Error loading project: ${err.message}`)
    }
  }

  const handleApprove = async (projectId, status) => {
    try {
      await approveProject(projectId, 'admin-user', status, notes || null)
      alert(`Project ${status === 'approved' ? 'goedgekeurd' : 'afgekeurd'}`)
      setSelectedProject(null)
      setNotes('')
      loadProjects()
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
  }

  if (loading) return <div className="page"><div className="loading">Projecten laden...</div></div>

  return (
    <div className="page">
      <h1 className="page-title">Admin: Project Goedkeuring</h1>
      <p className="page-subtitle">
        Bekijk en goedkeur ingediende badkamerprojecten
      </p>

      {error && <div className="error">{error}</div>}

      {!selectedProject ? (
        <div>
          <h2 style={{ marginBottom: '1rem' }}>Projecten in afwachting ({projects.length})</h2>

          {projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <p style={{ fontSize: '1.2rem', color: '#7f8c8d' }}>
                Geen projecten in afwachting
              </p>
            </div>
          ) : (
            <div className="grid grid-2">
              {projects.map(project => (
                <div key={project.id} className="card">
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>Project ID:</strong> {project.id.substring(0, 8)}...
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>Status:</strong>{' '}
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '16px',
                      background: project.status === 'pending' ? '#fff3cd' : '#d1ecf1',
                      color: project.status === 'pending' ? '#856404' : '#0c5460',
                      fontSize: '0.9rem'
                    }}>
                      {project.status}
                    </span>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>Regio:</strong> {project.region}
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>Aangemaakt:</strong> {new Date(project.created_at).toLocaleDateString('nl-NL')}
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleViewProject(project.id)}
                    style={{ width: '100%' }}
                  >
                    Bekijk details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <button
            className="btn btn-secondary"
            onClick={() => setSelectedProject(null)}
            style={{ marginBottom: '2rem' }}
          >
            ← Terug naar lijst
          </button>

          <div className="grid grid-2">
            <div className="card">
              <h3>Before State</h3>
              {selectedProject.before_state?.data ? (
                <div>
                  <p>
                    <strong>Ruimte:</strong>{' '}
                    {selectedProject.before_state.data.space?.dimensions_cm?.width} x{' '}
                    {selectedProject.before_state.data.space?.dimensions_cm?.depth} cm
                  </p>
                  <p><strong>Fixtures:</strong></p>
                  <ul>
                    {selectedProject.before_state.data.fixtures?.toilet?.present && <li>Toilet</li>}
                    {selectedProject.before_state.data.fixtures?.washbasin?.present && <li>Wastafel</li>}
                    {selectedProject.before_state.data.fixtures?.shower?.present && <li>Douche</li>}
                  </ul>
                </div>
              ) : (
                <p>Geen before state data</p>
              )}
            </div>

            <div className="card">
              <h3>After State</h3>
              {selectedProject.after_state?.data ? (
                <p>After state gegenereerd met geselecteerde producten</p>
              ) : (
                <p>Geen after state data</p>
              )}
            </div>

            <div className="card">
              <h3>Werkplan</h3>
              {selectedProject.work_plan?.data ? (
                <p>
                  <strong>Totaal uren:</strong> {selectedProject.work_plan.data.total_estimated_hours}<br />
                  <strong>Fases:</strong> {selectedProject.work_plan.data.phases?.length || 0}
                </p>
              ) : (
                <p>Geen werkplan data</p>
              )}
            </div>

            <div className="card">
              <h3>Prijsberekening</h3>
              {selectedProject.pricing?.data ? (
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#27ae60' }}>
                  €{selectedProject.pricing.data.total}
                </p>
              ) : (
                <p>Geen pricing data</p>
              )}
            </div>
          </div>

          <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px' }}>
            <h3>Admin notities:</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optionele notities bij goedkeuring/afkeuring..."
              rows="4"
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', marginTop: '1rem' }}
            />

            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
              <button
                className="btn btn-success"
                onClick={() => handleApprove(selectedProject.project.id, 'approved')}
                style={{ flex: 1 }}
              >
                ✓ Goedkeuren
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleApprove(selectedProject.project.id, 'rejected')}
                style={{ flex: 1 }}
              >
                ✗ Afkeuren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
