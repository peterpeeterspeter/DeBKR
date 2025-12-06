import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PricingPage({ projectData, setProjectData }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pricing, setPricing] = useState(null)
  const [workPlan, setWorkPlan] = useState(null)

  const generateMockWorkPlan = () => {
    const hasFloorTiles = projectData.selectedProducts?.some(p => p.category === 'floor_tile')
    const hasWallTiles = projectData.selectedProducts?.some(p => p.category === 'wall_tile')
    const hasToilet = projectData.selectedProducts?.some(p => p.category === 'toilet')
    const hasWashbasin = projectData.selectedProducts?.some(p => p.category === 'washbasin')
    const hasShower = projectData.selectedProducts?.some(p => p.category === 'shower')

    const tasks = [
      { name: 'Demontage oude installaties', hours: 8, volgorde: 1 },
      { name: 'Afvoer en verwijdering', hours: 4, volgorde: 2 }
    ]

    if (hasFloorTiles || hasWallTiles) {
      tasks.push({ name: 'Tegelwerk', hours: 24, volgorde: 3 })
    }
    if (hasToilet || hasWashbasin) {
      tasks.push({ name: 'Sanitair installatie', hours: 16, volgorde: 4 })
    }
    if (hasShower) {
      tasks.push({ name: 'Douchecabine installatie', hours: 12, volgorde: 5 })
    }

    tasks.push(
      { name: 'Loodgieterswerk', hours: 16, volgorde: 6 },
      { name: 'Elektrische werk', hours: 8, volgorde: 7 },
      { name: 'Afwerking en opkuis', hours: 8, volgorde: 8 }
    )

    const totalHours = tasks.reduce((sum, t) => sum + t.hours, 0)

    return {
      tasks,
      total_estimated_hours: totalHours,
      estimated_days: Math.ceil(totalHours / 8)
    }
  }

  const calculateMockPricing = (plan) => {
    const hours = plan.total_estimated_hours
    const laborRate = 75
    const regionMultiplier = 1.05
    const materialCost = projectData.selectedProducts?.reduce((sum, p) => sum + (p.price_eur || 0), 0) || 0

    const laborCost = hours * laborRate * regionMultiplier
    const contingency = (laborCost + materialCost) * 0.1
    const total = laborCost + materialCost + contingency + 200

    return {
      labor_cost: laborCost.toFixed(2),
      material_cost: materialCost.toFixed(2),
      contingency: contingency.toFixed(2),
      disposal_fee: 200,
      total: total.toFixed(2),
      total_hours: hours
    }
  }

  useEffect(() => {
    const plan = generateMockWorkPlan()
    setWorkPlan(plan)
    setPricing(calculateMockPricing(plan))
  }, [])

  const handleSavePricing = async () => {
    if (!workPlan || !pricing) return

    setLoading(true)
    try {
      const { error: workPlanError } = await supabase
        .from('work_plans')
        .insert([{
          project_id: projectData.projectId,
          data: workPlan
        }])

      if (workPlanError && !workPlanError.message.includes('duplicate')) {
        throw new Error('Failed to save work plan: ' + workPlanError.message)
      }

      const { error: pricingError } = await supabase
        .from('pricing_generated')
        .insert([{
          project_id: projectData.projectId,
          region: 'vlaanderen',
          data: pricing
        }])

      if (pricingError && !pricingError.message.includes('duplicate')) {
        throw new Error('Failed to save pricing: ' + pricingError.message)
      }

      const { error: updateError } = await supabase
        .from('projects')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', projectData.projectId)

      if (updateError) {
        throw new Error('Failed to update project status: ' + updateError.message)
      }

      setProjectData(prev => ({
        ...prev,
        workPlan,
        pricing,
        status: 'pending'
      }))

      navigate('/review')
    } catch (err) {
      setError('Fout bij opslaan: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitForApproval = () => {
    handleSavePricing()
  }

  return (
    <div className="page">
      <h1 className="page-title">Prijsberekening</h1>
      <p className="page-subtitle">
        Indicatieve prijs voor de badkamerrenovatie
      </p>

      {error && <div className="error">{error}</div>}

      <div className="warning" style={{ marginBottom: '2rem' }}>
        <strong>Disclaimer:</strong> Dit is een richtprijs. De exacte kosten worden bepaald na inspectie door de aannemer.
        Prijzen zijn exclusief BTW.
      </div>

      {workPlan && (
        <div style={{ marginBottom: '2rem', background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '1rem' }}>Werkplan</h3>
          <table style={{ width: '100%' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Taak</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Uren</th>
              </tr>
            </thead>
            <tbody>
              {workPlan.tasks.map((task, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '0.5rem' }}>{task.name}</td>
                  <td style={{ textAlign: 'right', padding: '0.5rem' }}>{task.hours}u</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 'bold', borderTop: '2px solid #2c3e50' }}>
                <td style={{ padding: '0.5rem' }}>Totaal</td>
                <td style={{ textAlign: 'right', padding: '0.5rem' }}>{workPlan.total_estimated_hours}u</td>
              </tr>
            </tbody>
          </table>
          <p style={{ marginTop: '1rem', color: '#7f8c8d' }}>
            Geschatte duur: {workPlan.estimated_days} werkdagen
          </p>
        </div>
      )}

      {pricing && (
        <div>
          <div style={{ background: '#f8f9fa', padding: '2rem', borderRadius: '8px' }}>
            <table style={{ width: '100%', fontSize: '1.1rem' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '1rem 0' }}>Arbeidskosten</td>
                  <td style={{ textAlign: 'right', padding: '1rem 0' }}>€{pricing.labor_cost}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '1rem 0' }}>Materiaalkosten</td>
                  <td style={{ textAlign: 'right', padding: '1rem 0' }}>€{pricing.material_cost}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '1rem 0' }}>Contingency (10%)</td>
                  <td style={{ textAlign: 'right', padding: '1rem 0' }}>€{pricing.contingency}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '1rem 0' }}>Afvoer/stort</td>
                  <td style={{ textAlign: 'right', padding: '1rem 0' }}>€{pricing.disposal_fee}</td>
                </tr>
                <tr style={{ borderTop: '3px solid #2c3e50' }}>
                  <td style={{ padding: '1rem 0', fontSize: '1.5rem', fontWeight: 'bold' }}>Totaal</td>
                  <td style={{ textAlign: 'right', padding: '1rem 0', fontSize: '1.5rem', fontWeight: 'bold', color: '#27ae60' }}>
                    €{pricing.total}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', background: '#e8f5e9', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Prijs indicatoren:</h3>
            <ul>
              <li>Regio: Vlaanderen (multiplier 1.05)</li>
              <li>Arbeidsuurprijs: €75/uur</li>
              <li>Totaal uren: {pricing.total_hours}</li>
              <li>Aantal producten: {projectData.selectedProducts?.length || 0}</li>
            </ul>
          </div>

          <div style={{ marginTop: '2rem', textAlign: 'right' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/visualize')} style={{ marginRight: '1rem' }}>
              Terug naar visualisatie
            </button>
            <button
              className="btn btn-success"
              onClick={handleSubmitForApproval}
              disabled={loading}
            >
              {loading ? 'Opslaan...' : 'Indienen voor goedkeuring'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
