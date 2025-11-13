import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// CRITICAL: Import ALL admin CSS directly, before React starts
import './components/AdminPortal/AdminPortal.css'
import './components/AdminPortal/AlbumsManager.css'
import './components/AdminPortal/PhotoOrderControls.css'
import './components/AdminPortal/ConfigManager.css'
import './components/AdminPortal/BrandingManager.css'
import './components/AdminPortal/LinksManager.css'
import './components/AdminPortal/ShareModal.css'
import './components/AdminPortal/PasswordInput.css'
import './components/AdminPortal/Metrics/Metrics.css'
import './components/AdminPortal/Metrics/VisitorMap.css'
import 'leaflet/dist/leaflet.css'
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
