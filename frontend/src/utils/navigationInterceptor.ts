/**
 * Navigation interceptor for service worker updates
 * Checks if a service worker update is pending and reloads on next navigation
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { info } from './logger';

/**
 * Hook that intercepts navigation and reloads if a service worker update is pending
 */
export function useServiceWorkerNavigationReload() {
  const location = useLocation();

  useEffect(() => {
    // Check if there's a pending service worker update
    const hasPendingUpdate = 
      window.__pendingServiceWorkerUpdate === true || 
      sessionStorage.getItem('pendingServiceWorkerUpdate') === 'true';

    if (hasPendingUpdate) {
      info('[SW] Pending update detected on navigation. Reloading to apply new version...');
      
      // Clear the flags before reloading
      window.__pendingServiceWorkerUpdate = false;
      sessionStorage.removeItem('pendingServiceWorkerUpdate');
      
      // Reload the page to activate the new service worker
      window.location.reload();
    }
  }, [location.pathname]); // Trigger on navigation (pathname change)
}


