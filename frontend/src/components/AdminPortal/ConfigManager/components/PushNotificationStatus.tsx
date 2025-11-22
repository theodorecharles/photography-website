/**
 * Push Notification Status Component
 * Shows subscription status and controls at the top of push notifications settings
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
// API_URL removed - using relative URLs for push notifications to avoid Safari PWA cross-origin blocking

interface PushNotificationStatusProps {
  isConfigured: boolean; // Whether push notifications are configured on server
  refreshKey?: number; // Optional key to force refresh when changed
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

export function PushNotificationStatus({ isConfigured, refreshKey, setMessage }: PushNotificationStatusProps) {
  const { t } = useTranslation();
  const [config, setConfig] = useState<{ enabled: boolean; vapidPublicKey: string | null } | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  useEffect(() => {
    if (isPushSupported && isConfigured) {
      fetchConfigAndStatus();
    } else {
      console.log('[PushNotificationStatus] Not fetching - isPushSupported:', isPushSupported, 'isConfigured:', isConfigured);
      setIsLoading(false);
    }
  }, [isConfigured, isPushSupported, refreshKey]);

  async function fetchConfigAndStatus() {
    console.log('[PushNotificationStatus] Starting fetchConfigAndStatus...');
    try {
      console.log('[PushNotificationStatus] Fetching config from /notifications/config...');
      // Use /notifications/ path to avoid Safari content blocker
      const response = await fetch(`/notifications/config`, {
        credentials: 'include'
      });
      
      console.log('[PushNotificationStatus] Response status:', response.status);
      
      if (!response.ok) {
        console.error('[PushNotificationStatus] Response not OK:', response.status, response.statusText);
        throw new Error('Failed to fetch config');
      }
      
      const data = await response.json();
      console.log('[PushNotificationStatus] Config received:', data);
      setConfig(data);

      if ('Notification' in window) {
        const perm = Notification.permission;
        console.log('[PushNotificationStatus] Notification permission:', perm);
        setPermission(perm);
      }

      if (data.enabled && 'serviceWorker' in navigator) {
        console.log('[PushNotificationStatus] Checking service worker subscription...');
        try {
          // Add timeout to prevent hanging forever
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Service worker timeout')), 5000)
          );
          
          const registration = await Promise.race([
            navigator.serviceWorker.ready,
            timeoutPromise
          ]) as ServiceWorkerRegistration;
          
          console.log('[PushNotificationStatus] Service worker ready');
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
          console.log('[PushNotificationStatus] Subscription status:', !!subscription);
        } catch (swError) {
          console.warn('[PushNotificationStatus] Service worker check failed:', swError);
          // Not subscribed if SW check fails
          setIsSubscribed(false);
        }
      } else {
        console.log('[PushNotificationStatus] Skipping subscription check - enabled:', data.enabled, 'SW supported:', 'serviceWorker' in navigator);
      }
    } catch (error) {
      console.error('[PushNotificationStatus] Failed to fetch config:', error);
      // Set loading to false even on error so we don't show loading forever
      setIsLoading(false);
    } finally {
      console.log('[PushNotificationStatus] Finished fetching, setting loading to false');
      setIsLoading(false);
    }
  }

  async function handleSubscribe() {
    console.log('[PushNotificationStatus] handleSubscribe called');
    console.log('[PushNotificationStatus] isPushSupported:', isPushSupported);
    console.log('[PushNotificationStatus] config:', config);
    console.log('[PushNotificationStatus] csrfToken:', (window as any).csrfToken);
    
    if (!isPushSupported || !config?.enabled || !config.vapidPublicKey) {
      console.error('[PushNotificationStatus] Subscribe failed - missing requirements');
      setMessage({ type: 'error', text: t('notifications.error') });
      return;
    }

    try {
      console.log('[PushNotificationStatus] Requesting notification permission...');
      // Request notification permission
      const perm = await Notification.requestPermission();
      console.log('[PushNotificationStatus] Permission result:', perm);
      setPermission(perm);

      if (perm === 'granted') {
        console.log('[PushNotificationStatus] Permission granted, subscribing to push...');
        await subscribeToPush();
        setMessage({ type: 'success', text: t('notifications.permissionGranted') });
      } else if (perm === 'denied') {
        console.log('[PushNotificationStatus] Permission denied');
        setMessage({ type: 'error', text: t('notifications.permissionDenied') });
      }
    } catch (error) {
      console.error('[PushNotificationStatus] Failed to subscribe:', error);
      setMessage({ type: 'error', text: t('notifications.error') });
    }
  }

  async function subscribeToPush() {
    console.log('[PushNotificationStatus] subscribeToPush called');
    if (!config?.vapidPublicKey) {
      console.error('[PushNotificationStatus] No VAPID public key');
      return;
    }

    try {
      console.log('[PushNotificationStatus] Waiting for service worker...');
      const registration = await navigator.serviceWorker.ready;
      console.log('[PushNotificationStatus] Service worker ready:', registration);
      
      let subscription = await registration.pushManager.getSubscription();
      console.log('[PushNotificationStatus] Existing subscription:', subscription);
      
      if (!subscription) {
        console.log('[PushNotificationStatus] Creating new subscription...');
        const applicationServerKey = urlBase64ToUint8Array(config.vapidPublicKey);
        console.log('[PushNotificationStatus] Application server key:', applicationServerKey);
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as BufferSource
        });
        console.log('[PushNotificationStatus] New subscription created:', subscription);
      }

      const csrfToken = (window as any).csrfToken || '';
      console.log('[PushNotificationStatus] CSRF token:', csrfToken ? 'present' : 'MISSING');
      console.log('[PushNotificationStatus] Sending subscription to server...');
      
      // Use /notifications/ path to avoid Safari content blocker
      const response = await fetch(`/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ subscription: subscription.toJSON() })
      });

      console.log('[PushNotificationStatus] Server response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PushNotificationStatus] Server error:', errorText);
        throw new Error(`Failed to save subscription: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('[PushNotificationStatus] Server response:', result);
      setIsSubscribed(true);
    } catch (error) {
      console.error('[PushNotificationStatus] Failed to subscribe:', error);
      throw error;
    }
  }

  async function handleUnsubscribe() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Use /notifications/ path to avoid Safari content blocker
        await fetch(`/notifications/unsubscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': (window as any).csrfToken || ''
          },
          credentials: 'include',
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        
        setIsSubscribed(false);
        setMessage({ type: 'success', text: t('notifications.unsubscribed') });
      }
    } catch (error) {
      console.error('[PushNotificationStatus] Failed to unsubscribe:', error);
      setMessage({ type: 'error', text: t('notifications.error') });
    }
  }

  async function handleTest() {
    try {
      // Use /notifications/ path to avoid Safari content blocker
      const response = await fetch(`/notifications/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': (window as any).csrfToken || ''
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }

      setMessage({ type: 'success', text: t('notifications.testSent') });
    } catch (error) {
      console.error('[PushNotificationStatus] Failed to send test:', error);
      setMessage({ type: 'error', text: t('notifications.error') });
    }
  }

  // Debug logging
  console.log('[PushNotificationStatus] Render check:', {
    isConfigured,
    isPushSupported,
    isLoading,
    configEnabled: config?.enabled,
    shouldRender: isConfigured && isPushSupported && !isLoading
  });

  // Don't render if not configured or not supported
  if (!isConfigured || !isPushSupported) {
    console.log('[PushNotificationStatus] Not rendering:', { isConfigured, isPushSupported, isLoading });
    return null;
  }

  // Show loading state instead of hiding completely
  if (isLoading) {
    return (
      <div
        className="push-notification-status"
        style={{
          background: 'rgba(102, 126, 234, 0.1)',
          border: '1px solid rgba(102, 126, 234, 0.2)',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <div 
          className="loading-spinner" 
          style={{ 
            width: '20px', 
            height: '20px',
            flexShrink: 0,
            alignSelf: 'center'
          }}
        ></div>
        <span style={{ color: '#888', fontSize: '0.95rem', lineHeight: '1.5' }}>
          Loading notification status...
        </span>
      </div>
    );
  }

  return (
    <div
      className="push-notification-status"
      style={{
        background: 'rgba(102, 126, 234, 0.1)',
        border: '1px solid rgba(102, 126, 234, 0.2)',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}
    >
      {permission === 'granted' && isSubscribed ? (
        <>
          <div className="push-status-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              className="push-status-indicator"
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#22c55e',
              }}
            ></span>
            <span className="push-status-text" style={{ color: 'white', fontSize: '0.95rem' }}>
              {t('notifications.active')}
            </span>
          </div>
          <div className="push-status-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn-secondary"
              onClick={handleTest}
              style={{ padding: '0.4rem 0.875rem', fontSize: '0.875rem' }}
            >
              {t('notifications.sendTest')}
            </button>
            <button
              className="btn-secondary"
              onClick={handleUnsubscribe}
              style={{ padding: '0.4rem 0.875rem', fontSize: '0.875rem' }}
            >
              {t('notifications.disable')}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="push-status-prompt" style={{ color: '#888', fontSize: '0.95rem', flex: 1 }}>
            {permission === 'denied'
              ? t('notifications.blocked')
              : t('notifications.subscribePrompt')}
          </div>
          {permission !== 'denied' && (
            <button
              className="btn-primary push-subscribe-btn"
              onClick={handleSubscribe}
              style={{ padding: '0.4rem 1rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
            >
              {t('notifications.subscribe')}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default PushNotificationStatus;

