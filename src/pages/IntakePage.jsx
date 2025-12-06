import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createProject, uploadFile, analyzeBeforeState } from '../api'

export default function IntakePage({ projectData, setProjectData }) {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [orientationHint, setOrientationHint] = useState('front=door')
  const [dimensions, setDimensions] = useState({ width: 240, depth: 300, height: 250 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [beforeState, setBeforeState] = useState(null)
  const [anchors, setAnchors] = useState(null)
  const [useAI, setUseAI] = useState(true)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const handleAnalyze = async () => {
    if (!file) {
      setError('Upload eerst een foto van uw badkamer')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let projectId = projectData.projectId

      if (!projectId) {
        const project = await createProject(projectData.userId)
        projectId = project.id
        setProjectData(prev => ({ ...prev, projectId }))
      }

      const uploadResult = await uploadFile(file, projectData.userId, projectId)

      const result = await analyzeBeforeState(
        projectId,
        orientationHint,
        dimensions,
        uploadResult.file_path,
        !useAI
      )

      setBeforeState(result.before_state)
      setAnchors(result.anchors)
      setProjectData(prev => ({
        ...prev,
        beforeState: result.before_state,
        anchors: result.anchors,
        roomImagePath: uploadResult.file_path
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    if (!beforeState) {
      setError('Analyseer eerst de badkamer')
      return
    }
    navigate('/catalog')
  }

  return (
    <div className="page">
      <h1 className="page-title">Intake: Huidige Badkamer</h1>
      <p className="page-subtitle">
        Upload een foto van uw huidige badkamer en voer de afmetingen in
      </p>

      {error && <div className="error">{error}</div>}

      <div className="grid grid-2">
        <div>
          <div className="form-group">
            <label>Foto van badkamer</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={loading}
            />
          </div>

          {preview && (
            <div style={{ marginTop: '1rem' }}>
              <img
                src={preview}
                alt="Preview"
                style={{ maxWidth: '100%', borderRadius: '8px' }}
              />
            </div>
          )}
        </div>

        <div>
          <div className="form-group">
            <label>Oriëntatie hint</label>
            <select
              value={orientationHint}
              onChange={(e) => setOrientationHint(e.target.value)}
              disabled={loading}
            >
              <option value="front=door">Voorkant = Deur</option>
              <option value="front=window">Voorkant = Raam</option>
              <option value="left=door">Links = Deur</option>
              <option value="left=window">Links = Raam</option>
            </select>
          </div>

          <div className="form-group">
            <label>Breedte (cm)</label>
            <input
              type="number"
              value={dimensions.width}
              onChange={(e) => setDimensions(prev => ({ ...prev, width: parseInt(e.target.value) }))}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Diepte (cm)</label>
            <input
              type="number"
              value={dimensions.depth}
              onChange={(e) => setDimensions(prev => ({ ...prev, depth: parseInt(e.target.value) }))}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Hoogte (cm)</label>
            <input
              type="number"
              value={dimensions.height}
              onChange={(e) => setDimensions(prev => ({ ...prev, height: parseInt(e.target.value) }))}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                disabled={loading}
                style={{ marginRight: '0.5rem' }}
              />
              Gebruik AI analyse (Gemini 3 Pro met thinking_level HIGH)
            </label>
            {useAI && (
              <p style={{ fontSize: '0.85rem', color: '#7f8c8d', marginTop: '0.5rem' }}>
                Vereist GEMINI_API_KEY. Gebruikt deep reasoning voor nauwkeurige fixture detectie en leidingen inschatting.
              </p>
            )}
            {!useAI && (
              <p style={{ fontSize: '0.85rem', color: '#e67e22', marginTop: '0.5rem' }}>
                Mock mode: gebruikt standaard fixture posities zonder AI analyse.
              </p>
            )}
          </div>

          <button
            className="btn btn-primary"
            onClick={handleAnalyze}
            disabled={loading || !file}
            style={{ marginRight: '1rem' }}
          >
            {loading ? 'Analyseren...' : 'Analyseer Badkamer'}
          </button>

          {beforeState && (
            <button className="btn btn-success" onClick={handleConfirm}>
              Bevestig en ga verder
            </button>
          )}
        </div>
      </div>

      {beforeState && (
        <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px' }}>
          <h3>Gedetecteerde fixtures:</h3>
          <ul style={{ marginTop: '1rem' }}>
            {beforeState.fixtures.toilet?.present && (
              <li>Toilet - Positie: {beforeState.fixtures.toilet.position}</li>
            )}
            {beforeState.fixtures.washbasin?.present && (
              <li>Wastafel - Positie: {beforeState.fixtures.washbasin.position}</li>
            )}
            {beforeState.fixtures.shower?.present && (
              <li>Douche - Positie: {beforeState.fixtures.shower.position}</li>
            )}
            {beforeState.fixtures.bathtub?.present && (
              <li>Bad - Positie: {beforeState.fixtures.bathtub.position}</li>
            )}
          </ul>
          <p style={{ marginTop: '1rem', color: '#666' }}>
            <strong>Leidingen inschatting:</strong><br />
            Waterinlaat: {beforeState.plumbing_estimate.water_inlet_likely}<br />
            Afvoer: {beforeState.plumbing_estimate.waste_outlet_likely}<br />
            Vertrouwen: {beforeState.plumbing_estimate.confidence}
          </p>
        </div>
      )}
    </div>
  )
}
