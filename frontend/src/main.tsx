import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { OptimizelyProvider, createInstance } from '@optimizely/react-sdk'
import App from './App.tsx'
import { ANALYTICS_ENABLED } from './config'
import { initAnalytics } from './utils/analytics'
import { registerServiceWorker } from './utils/serviceWorker'
import { OPTIMIZELY_SDK_KEY } from './optimizely-config'
import './i18n/config' // Initialize i18n

// Initialize analytics
initAnalytics(ANALYTICS_ENABLED);

// Register service worker for caching
registerServiceWorker();

// Initialize Optimizely SDK
const optimizelyClient = createInstance({
  sdkKey: OPTIMIZELY_SDK_KEY,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OptimizelyProvider
      optimizely={optimizelyClient}
      user={{ id: 'admin_user' }}
    >
      <App />
    </OptimizelyProvider>
  </StrictMode>,
)
