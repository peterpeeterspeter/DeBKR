import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { calculatePricing } from '../api'

export default function PricingPage({ projectData, setProjectData }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pricing, setPricing] = useState(null)

  const calculateMockPricing = () => {
    const hours = projectData.workPlan?.total_estimated_hours || 79
    const laborRate = 75
    const regionMultiplier = 1.05
    const materialCost = projectData.selectedProducts?.reduce((sum, p) => sum + (p.price_eur || 0), 0) || 2500

    const laborCost = hours * laborRate * regionMultiplier
    const contingency = (laborCost + materialCost) * 0.1
    const total = laborCost + materialCost + contingency + 200

    return {
      labor_cost: laborCost.toFixed(2),
      material_cost: materialCost.toFixed(2),
      contingency: contingency.toFixed(2),
      disposal_fee: 200,
      total: total.toFixed(2)
    }
  }

  useEffect(() => {
    setPricing(calculateMockPricing())
  }, [])

  const handleCalculate = async () => {
    if (!projectData.workPlan) {
      setError('Genereer eerst het werkplan')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await calculatePricing(
        projectData.projectId,
        projectData.workPlan,
        'vlaanderen',
        1.0
      )

      setPricing(result.costs)
      setProjectData(prev => ({
        ...prev,
        pricing: result.costs
      }))
    } catch (err) {
      setError(err.message)
      setPricing(calculateMockPricing())
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitForApproval = () => {
    navigate('/review')
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

      {!projectData.pricing && (
        <button
          className="btn btn-primary"
          onClick={handleCalculate}
          disabled={loading}
          style={{ marginBottom: '2rem' }}
        >
          {loading ? 'Berekenen...' : 'Bereken Prijs'}
        </button>
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
              <li>Totaal uren: {projectData.workPlan?.total_estimated_hours || 79}</li>
              <li>Aantal producten: {projectData.selectedProducts?.length || 0}</li>
            </ul>
          </div>

          <div style={{ marginTop: '2rem', textAlign: 'right' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/workplan')} style={{ marginRight: '1rem' }}>
              Terug
            </button>
            <button className="btn btn-success" onClick={handleSubmitForApproval}>
              Indienen voor goedkeuring
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
