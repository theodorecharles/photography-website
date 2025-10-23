import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ANALYTICS_SCRIPT_PATH } from './config'

// Load analytics script if configured
if (ANALYTICS_SCRIPT_PATH) {
  const script = document.createElement('script');
  script.src = ANALYTICS_SCRIPT_PATH;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
