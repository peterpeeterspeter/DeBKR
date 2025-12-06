import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import IntakePage from './pages/IntakePage'
import CatalogPage from './pages/CatalogPage'
import LayoutPage from './pages/LayoutPage'
import VisualizePage from './pages/VisualizePage'
import WorkPlanPage from './pages/WorkPlanPage'
import PricingPage from './pages/PricingPage'
import ReviewPage from './pages/ReviewPage'
import AdminPage from './pages/AdminPage'
import ProgressBar from './components/ProgressBar'

function App() {
  const [projectData, setProjectData] = useState({
    projectId: null,
    userId: 'demo-user',
    beforeState: null,
    afterState: null,
    selectedProducts: [],
    workPlan: null,
    pricing: null
  })

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
              path="/layout"
              element={<LayoutPage projectData={projectData} setProjectData={setProjectData} />}
            />
            <Route
              path="/visualize"
              element={<VisualizePage projectData={projectData} setProjectData={setProjectData} />}
            />
            <Route
              path="/workplan"
              element={<WorkPlanPage projectData={projectData} setProjectData={setProjectData} />}
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
