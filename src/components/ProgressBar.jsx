import { useLocation } from 'react-router-dom'

const steps = [
  { path: '/intake', label: 'Intake' },
  { path: '/catalog', label: 'Catalogus' },
  { path: '/layout', label: 'Layout' },
  { path: '/visualize', label: 'Visualisatie' },
  { path: '/workplan', label: 'Werkplan' },
  { path: '/pricing', label: 'Prijs' },
  { path: '/review', label: 'Review' }
]

export default function ProgressBar() {
  const location = useLocation()
  const currentIndex = steps.findIndex(step => step.path === location.pathname)

  if (location.pathname === '/admin') {
    return null
  }

  return (
    <div className="progress-bar">
      <div className="progress-steps">
        {steps.map((step, index) => (
          <div
            key={step.path}
            className={`progress-step ${
              index === currentIndex
                ? 'active'
                : index < currentIndex
                ? 'completed'
                : ''
            }`}
          >
            {step.label}
          </div>
        ))}
      </div>
    </div>
  )
}
