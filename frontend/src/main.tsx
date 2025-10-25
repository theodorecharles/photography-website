import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ANALYTICS_ENABLED, API_URL } from './config'
import { initAnalytics } from './utils/analytics'

// Initialize analytics with HMAC secret from backend
(async () => {
  if (ANALYTICS_ENABLED) {
    try {
      const response = await fetch(`${API_URL}/api/branding`);
      const config = await response.json();
      initAnalytics(true, config.analyticsHmacSecret);
    } catch (error) {
      console.warn('Failed to fetch analytics config, initializing without HMAC:', error);
      initAnalytics(true);
    }
  } else {
    initAnalytics(false);
  }
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
