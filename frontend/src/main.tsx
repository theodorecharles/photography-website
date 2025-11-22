import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ANALYTICS_ENABLED } from './config'
import { initAnalytics } from './utils/analytics'
import { registerServiceWorker } from './utils/serviceWorker'
import './i18n/config' // Initialize i18n

// Initialize analytics
initAnalytics(ANALYTICS_ENABLED);

// Register service worker for caching
registerServiceWorker();

// Hide the initial loading spinner once React starts mounting
const loader = document.getElementById('initial-loader');
if (loader) {
  loader.classList.add('hidden');
  // Remove from DOM after fade out animation
  setTimeout(() => loader.remove(), 300);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
