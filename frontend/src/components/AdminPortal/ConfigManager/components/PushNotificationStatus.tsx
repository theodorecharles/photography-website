/**
 * Push Notification Status Component
 * Shows subscription status and controls at the top of push notifications settings
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
// API_URL removed - using relative URLs for push notifications to avoid Safari PWA cross-origin blocking
import { showToast } from '../../../../utils/toast';

interface PushNotificationStatusProps {
  isConfigured: boolean; // Whether push notifications are configured on server
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

export function PushNotificationStatus({ isConfigured }: PushNotificationStatusProps) {
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
  }, [isConfigured]);

  async function fetchConfigAndStatus() {
    try {
      // Use /notifications/ path to avoid Safari content blocker
      const response = await fetch(`/notifications/config`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch config');
      }
      
      const data = await response.json();
      setConfig(data);

      if ('Notification' in window) {
        setPermission(Notification.permission);
      }

      if (data.enabled && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
    } catch (error) {
      console.error('[PushNotificationStatus] Failed to fetch config:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubscribe() {
    if (!isPushSupported || !config?.enabled || !config.vapidPublicKey) {
      showToast(t('notifications.error'), 'error');
      return;
    }

    try {
      // Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === 'granted') {
        await subscribeToPush();
        showToast(t('notifications.permissionGranted'), 'success');
      } else if (perm === 'denied') {
        showToast(t('notifications.permissionDenied'), 'error');
      }
    } catch (error) {
      console.error('[PushNotificationStatus] Failed to subscribe:', error);
      showToast(t('notifications.error'), 'error');
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
        showToast(t('notifications.unsubscribed'), 'success');
      }
    } catch (error) {
      console.error('[PushNotificationStatus] Failed to unsubscribe:', error);
      showToast(t('notifications.error'), 'error');
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

      showToast(t('notifications.testSent'), 'success');
    } catch (error) {
      console.error('[PushNotificationStatus] Failed to send test:', error);
      showToast(t('notifications.error'), 'error');
    }
  }

  // Don't render if not configured, not supported, or still loading
  if (!isConfigured || !isPushSupported || isLoading || !config?.enabled) {
    return null;
  }

  return (
    <div style={{
      background: 'rgba(102, 126, 234, 0.1)',
      border: '1px solid rgba(102, 126, 234, 0.2)',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem'
    }}>
      {permission === 'granted' && isSubscribed ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#22c55e',
              animation: 'pulse 2s ease-in-out infinite'
            }}></span>
            <span style={{ color: 'white', fontSize: '0.95rem' }}>
              {t('notifications.active')}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" onClick={handleTest} style={{ padding: '0.4rem 0.875rem', fontSize: '0.875rem' }}>
              {t('notifications.sendTest')}
            </button>
            <button className="btn-secondary" onClick={handleUnsubscribe} style={{ padding: '0.4rem 0.875rem', fontSize: '0.875rem' }}>
              {t('notifications.disable')}
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ color: '#888', fontSize: '0.95rem' }}>
            {permission === 'denied' 
              ? t('notifications.blocked')
              : t('notifications.subscribePrompt')}
          </div>
          {permission !== 'denied' && (
            <button className="btn-primary" onClick={handleSubscribe} style={{ padding: '0.4rem 1rem', fontSize: '0.875rem' }}>
              {t('notifications.subscribe')}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default PushNotificationStatus;

