import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import IntakePage from './pages/IntakePage'
import CatalogPage from './pages/CatalogPage'
import VisualizePage from './pages/VisualizePage'
import PricingPage from './pages/PricingPage'
import ReviewPage from './pages/ReviewPage'
import AdminPage from './pages/AdminPage'
import ProgressBar from './components/ProgressBar'

function generateUserId() {
  let userId = localStorage.getItem('bathroom_user_id')
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem('bathroom_user_id', userId)
  }
  return userId
}

function App() {
  const [projectData, setProjectData] = useState({
    projectId: null,
    userId: null,
    beforeState: null,
    afterState: null,
    selectedProducts: [],
    workPlan: null,
    pricing: null
  })

  useEffect(() => {
    setProjectData(prev => ({
      ...prev,
      userId: generateUserId()
    }))
  }, [])

  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <h1>Badkamer Configurator</h1>
        </header>
        <ProgressBar />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Navigate to="/intake" replace />} />
            <Route
              path="/intake"
              element={<IntakePage projectData={projectData} setProjectData={setProjectData} />}
            />
            <Route
              path="/catalog"
              element={<CatalogPage projectData={projectData} setProjectData={setProjectData} />}
            />
            <Route
              path="/visualize"
              element={<VisualizePage projectData={projectData} setProjectData={setProjectData} />}
            />
            <Route
              path="/pricing"
              element={<PricingPage projectData={projectData} setProjectData={setProjectData} />}
            />
            <Route
              path="/review"
              element={<ReviewPage projectData={projectData} />}
            />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
