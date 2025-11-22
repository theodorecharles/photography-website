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
      setIsLoading(false);
    }
  }, [isConfigured, isPushSupported, refreshKey]);

  async function fetchConfigAndStatus() {
    try {
      console.log('[PushNotificationStatus] Fetching config...');
      // Use /notifications/ path to avoid Safari content blocker
      const response = await fetch(`/notifications/config`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch config');
      }
      
      const data = await response.json();
      console.log('[PushNotificationStatus] Config received:', data);
      setConfig(data);

      if ('Notification' in window) {
        setPermission(Notification.permission);
      }

      if (data.enabled && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
        console.log('[PushNotificationStatus] Subscription status:', !!subscription);
      }
    } catch (error) {
      console.error('[PushNotificationStatus] Failed to fetch config:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubscribe() {
    if (!isPushSupported || !config?.enabled || !config.vapidPublicKey) {
      setMessage({ type: 'error', text: t('notifications.error') });
      return;
    }

    try {
      // Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === 'granted') {
        await subscribeToPush();
        setMessage({ type: 'success', text: t('notifications.permissionGranted') });
      } else if (perm === 'denied') {
        setMessage({ type: 'error', text: t('notifications.permissionDenied') });
      }
    } catch (error) {
      console.error('[PushNotificationStatus] Failed to subscribe:', error);
      setMessage({ type: 'error', text: t('notifications.error') });
    }
  }

  async function subscribeToPush() {
    if (!config?.vapidPublicKey) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        const applicationServerKey = urlBase64ToUint8Array(config.vapidPublicKey);
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as BufferSource
        });
      }

      // Use /notifications/ path to avoid Safari content blocker
      const response = await fetch(`/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': (window as any).csrfToken || ''
        },
        credentials: 'include',
        body: JSON.stringify({ subscription: subscription.toJSON() })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

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
    shouldRender: isConfigured && isPushSupported && !isLoading && config?.enabled
  });

  // Don't render if not configured, not supported, or still loading
  if (!isConfigured || !isPushSupported || isLoading || !config?.enabled) {
    return null;
  }

  return (
    <div className="push-notification-status">
      {permission === 'granted' && isSubscribed ? (
        <>
          <div className="push-status-info">
            <span className="push-status-indicator"></span>
            <span className="push-status-text">
              {t('notifications.active')}
            </span>
          </div>
          <div className="push-status-buttons">
            <button className="btn-secondary" onClick={handleTest}>
              {t('notifications.sendTest')}
            </button>
            <button className="btn-secondary" onClick={handleUnsubscribe}>
              {t('notifications.disable')}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="push-status-prompt">
            {permission === 'denied' 
              ? t('notifications.blocked')
              : t('notifications.subscribePrompt')}
          </div>
          {permission !== 'denied' && (
            <button className="btn-primary push-subscribe-btn" onClick={handleSubscribe}>
              {t('notifications.subscribe')}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default PushNotificationStatus;

