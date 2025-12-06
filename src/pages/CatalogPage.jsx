import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCatalog } from '../api'

const MAX_IMAGES = 14
const MAX_PRODUCTS = 13

export default function CatalogPage({ projectData, setProjectData }) {
  const navigate = useNavigate()
  const [catalog, setCatalog] = useState([])
  const [selectedProducts, setSelectedProducts] = useState(projectData.selectedProducts || [])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadCatalog()
  }, [categoryFilter])

  const loadCatalog = async () => {
    try {
      const filters = categoryFilter ? { category: categoryFilter } : {}
      const items = await fetchCatalog(filters)
      setCatalog(items)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleProduct = (product) => {
    const isSelected = selectedProducts.find(p => p.product_id === product.product_id)

    if (isSelected) {
      setSelectedProducts(selectedProducts.filter(p => p.product_id !== product.product_id))
    } else {
      if (selectedProducts.length >= MAX_PRODUCTS) {
        alert(`Maximum van ${MAX_PRODUCTS} producten bereikt (14 totale beelden: 1 kamer + 13 producten)`)
        return
      }
      setSelectedProducts([...selectedProducts, product])
    }
  }

  const handleContinue = () => {
    if (selectedProducts.length === 0) {
      alert('Selecteer minimaal 1 product')
      return
    }

    setProjectData(prev => ({
      ...prev,
      selectedProducts
    }))
    navigate('/layout')
  }

  const categories = [
    { value: '', label: 'Alle categorieën' },
    { value: 'floor_tile', label: 'Vloertegels' },
    { value: 'wall_tile', label: 'Wandtegels' },
    { value: 'toilet', label: 'Toiletten' },
    { value: 'washbasin', label: 'Wastafels' },
    { value: 'shower', label: 'Douches' },
    { value: 'bathtub', label: 'Badkuipen' },
    { value: 'radiator', label: 'Radiatoren' },
    { value: 'lighting', label: 'Verlichting' },
    { value: 'accessory', label: 'Accessoires' }
  ]

  if (loading) return <div className="page"><div className="loading">Catalogus laden...</div></div>
  if (error) return <div className="page"><div className="error">{error}</div></div>

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Product Catalogus</h1>
          <p className="page-subtitle">
            Kies uw producten (max {MAX_PRODUCTS})
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: selectedProducts.length >= MAX_PRODUCTS ? '#e74c3c' : '#3498db' }}>
            {selectedProducts.length} / {MAX_PRODUCTS}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
            Beeldslots gebruikt (1 kamer + {selectedProducts.length} producten)
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ padding: '0.75rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {selectedProducts.length > 0 && (
        <div style={{ marginBottom: '2rem', background: '#e8f5e9', padding: '1rem', borderRadius: '8px' }}>
          <strong>Geselecteerde producten:</strong>
          <div style={{ marginTop: '0.5rem' }}>
            {selectedProducts.map(p => (
              <span
                key={p.product_id}
                style={{
                  display: 'inline-block',
                  background: '#27ae60',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '16px',
                  marginRight: '0.5rem',
                  marginTop: '0.5rem',
                  fontSize: '0.9rem'
                }}
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-3">
        {catalog.map(product => {
          const isSelected = selectedProducts.find(p => p.product_id === product.product_id)
          return (
            <div
              key={product.product_id}
              className="card"
              style={{
                border: isSelected ? '3px solid #27ae60' : '1px solid #e0e0e0',
                cursor: 'pointer',
                position: 'relative'
              }}
              onClick={() => handleToggleProduct(product)}
            >
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: '#27ae60',
                  color: 'white',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem'
                }}>
                  ✓
                </div>
              )}

              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '4px', marginBottom: '1rem' }}
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              )}

              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{product.name}</h3>
              <p style={{ color: '#7f8c8d', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                {product.category}
              </p>
              <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2c3e50' }}>
                €{product.price_eur?.toFixed(2) || '0.00'}
              </p>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'right' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/intake')} style={{ marginRight: '1rem' }}>
          Terug
        </button>
        <button
          className="btn btn-primary"
          onClick={handleContinue}
          disabled={selectedProducts.length === 0}
        >
          Ga verder naar layout
        </button>
      </div>
    </div>
  )
}
