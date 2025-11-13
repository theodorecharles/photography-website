import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ANALYTICS_ENABLED } from './config'
import { initAnalytics } from './utils/analytics'
import { registerServiceWorker } from './utils/serviceWorker'

// Initialize analytics
initAnalytics(ANALYTICS_ENABLED);

// Register service worker for caching
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
