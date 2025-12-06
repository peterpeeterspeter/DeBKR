import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const MAX_VARIANTS = 5

export default function VisualizePage({ projectData, setProjectData }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [variants, setVariants] = useState([])
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [generationProgress, setGenerationProgress] = useState('')

  useEffect(() => {
    if (!projectData.projectId || !projectData.selectedProducts || projectData.selectedProducts.length === 0) {
      setError('Geen project of producten geselecteerd. Ga terug naar de catalogus.')
    }
  }, [projectData])

  const handleGenerateImage = async () => {
    if (variants.length >= MAX_VARIANTS) {
      alert(`Maximum van ${MAX_VARIANTS} varianten bereikt`)
      return
    }

    setLoading(true)
    setError(null)
    setGenerationProgress('Voorbereiden van productinformatie...')

    try {
      const productData = projectData.selectedProducts.map(p => ({
        product_id: p.product_id,
        name: p.name,
        category: p.category,
        dimensions: p.dimensions_json
      }))

      setGenerationProgress('Genereren van after-beeld met Gemini...')

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: projectData.projectId,
          before_state: projectData.beforeState,
          products: productData,
          room_image_path: projectData.roomImagePath,
          seed: Date.now().toString()
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Image generation failed')
      }

      const result = await response.json()

      setGenerationProgress('Opslaan van gegenereerde afbeelding...')

      const { data: imageRecord, error: dbError } = await supabase
        .from('images')
        .insert([{
          project_id: projectData.projectId,
          type: 'after_generated',
          seed: result.seed,
          prompt: result.prompt,
          path: result.image_path
        }])
        .select()
        .single()

      if (dbError) throw new Error('Failed to save image record: ' + dbError.message)

      const newVariant = {
        id: imageRecord.id,
        path: result.image_path,
        url: result.image_url,
        seed: result.seed
      }

      setVariants([...variants, newVariant])
      setGenerationProgress('Klaar!')

    } catch (err) {
      setError('Fout bij genereren: ' + err.message)
      setGenerationProgress('')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectVariant = async (variant) => {
    setSelectedVariant(variant)

    const afterState = {
      dimensions_cm: projectData.beforeState.dimensions_cm,
      fixtures: projectData.beforeState.fixtures,
      selected_products: projectData.selectedProducts.map(p => p.product_id),
      visualization_seed: variant.seed
    }

    try {
      const { error: dbError } = await supabase
        .from('after_states')
        .insert([{
          project_id: projectData.projectId,
          data: afterState,
          user_approved_at: new Date().toISOString()
        }])

      if (dbError && !dbError.message.includes('duplicate')) {
        throw new Error('Failed to save after state: ' + dbError.message)
      }

      const { error: updateError } = await supabase
        .from('images')
        .update({ type: 'final' })
        .eq('id', variant.id)

      if (updateError) console.warn('Failed to update image type:', updateError)

      setProjectData(prev => ({
        ...prev,
        afterState,
        finalImageUrl: variant.url
      }))

    } catch (err) {
      console.error('Error saving selection:', err)
    }
  }

  const handleContinue = () => {
    if (!selectedVariant) {
      alert('Selecteer eerst een variant')
      return
    }
    navigate('/pricing')
  }

  return (
    <div className="page">
      <h1 className="page-title">Visualisatie Genereren</h1>
      <p className="page-subtitle">
        Genereer fotorealistische visualisaties van uw nieuwe badkamer
      </p>

      {error && <div className="error">{error}</div>}

      <div className="grid grid-2" style={{ marginBottom: '2rem' }}>
        <div>
          <h3>Before: Huidige Badkamer</h3>
          {projectData.roomImagePath && (
            <img
              src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/user-uploads/${projectData.roomImagePath}`}
              alt="Before"
              style={{ width: '100%', borderRadius: '8px', border: '2px solid #ddd' }}
            />
          )}
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
            <strong>Geselecteerde producten ({projectData.selectedProducts?.length || 0}):</strong>
            <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
              {projectData.selectedProducts?.map(p => (
                <li key={p.product_id}>{p.name}</li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <h3>After: Nieuwe Badkamer</h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <button
              className="btn btn-primary"
              onClick={handleGenerateImage}
              disabled={loading || variants.length >= MAX_VARIANTS}
            >
              {loading ? 'Genereren...' : `Genereer variant (${variants.length}/${MAX_VARIANTS})`}
            </button>

            {loading && generationProgress && (
              <div style={{ padding: '1rem', background: '#e3f2fd', borderRadius: '8px', textAlign: 'center' }}>
                {generationProgress}
              </div>
            )}

            {variants.length === 0 && !loading && (
              <div style={{
                padding: '3rem',
                background: '#f8f9fa',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#7f8c8d'
              }}>
                <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎨</p>
                <p>Klik op "Genereer variant" om een visualisatie te maken</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Dit kan 30-60 seconden duren
                </p>
              </div>
            )}

            {variants.map((variant, index) => (
              <div
                key={variant.id}
                style={{
                  border: selectedVariant?.id === variant.id ? '3px solid #27ae60' : '1px solid #ddd',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onClick={() => handleSelectVariant(variant)}
              >
                {selectedVariant?.id === variant.id && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: '#27ae60',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    zIndex: 1
                  }}>
                    Geselecteerd
                  </div>
                )}
                <img
                  src={variant.url}
                  alt={`Variant ${index + 1}`}
                  style={{ width: '100%', display: 'block' }}
                />
                <div style={{ padding: '0.5rem', background: '#f8f9fa', textAlign: 'center' }}>
                  Variant {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'right' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/catalog')} style={{ marginRight: '1rem' }}>
          Terug naar catalogus
        </button>
        <button
          className="btn btn-primary"
          onClick={handleContinue}
          disabled={!selectedVariant}
        >
          Ga verder naar prijsopgave
        </button>
      </div>
    </div>
  )
}
