import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ANALYTICS_ENABLED } from './config'
import { initAnalytics } from './utils/analytics'

// Initialize analytics (backend will handle OpenObserve forwarding)
initAnalytics(ANALYTICS_ENABLED);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
