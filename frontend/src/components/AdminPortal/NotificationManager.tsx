/**
 * NotificationManager Component
 * 
 * Handles Web Push notification permissions and subscriptions.
 * Only shown to managers and admins who can run processing jobs.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { showToast } from '../../utils/toast';
import { API_URL } from '../../config';
import './NotificationManager.css';

interface NotificationConfig {
  enabled: boolean;
  vapidPublicKey: string | null;
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

export function NotificationManager() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  // Check if push notifications are supported
  const isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  useEffect(() => {
    console.log('[NotificationManager] Initializing...', { isPushSupported });
    if (!isPushSupported) {
      console.log('[NotificationManager] Push not supported in this browser');
      setIsLoading(false);
      return;
    }

    // Fetch config and check current subscription status
    fetchConfigAndStatus();
  }, []);

  useEffect(() => {
    // Show banner if:
    // 1. Push is supported
    // 2. Server has push enabled
    // 3. User hasn't granted permission yet
    // 4. User hasn't dismissed the banner this session
    console.log('[NotificationManager] Checking if should show banner:', {
      isPushSupported,
      configEnabled: config?.enabled,
      permission,
      dismissed: sessionStorage.getItem('notificationBannerDismissed')
    });
    
    if (isPushSupported && config?.enabled && permission === 'default') {
      const dismissed = sessionStorage.getItem('notificationBannerDismissed');
      if (!dismissed) {
        console.log('[NotificationManager] Showing banner!');
        setShowBanner(true);
      } else {
        console.log('[NotificationManager] Banner dismissed this session');
      }
    } else {
      console.log('[NotificationManager] Not showing banner - conditions not met');
      setShowBanner(false);
    }
  }, [isPushSupported, config, permission]);

  async function fetchConfigAndStatus() {
    try {
      // Fetch push notification config from server
      console.log('[NotificationManager] Fetching config from /api/push-notifications/config');
      const response = await fetch(`${API_URL}/api/push-notifications/config`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('[NotificationManager] Config fetch failed:', response.status, response.statusText);
        throw new Error('Failed to fetch config');
      }
      
      const data = await response.json();
      console.log('[NotificationManager] Config fetched:', data);
      setConfig(data);

      // Check current notification permission
      if ('Notification' in window) {
        const perm = Notification.permission;
        console.log('[NotificationManager] Current permission:', perm);
        setPermission(perm);
      }

      // Check if already subscribed
      if (data.enabled && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        console.log('[NotificationManager] Current subscription:', subscription ? 'exists' : 'none');
        setIsSubscribed(!!subscription);
      }
    } catch (error) {
      console.error('[NotificationManager] Failed to fetch config:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function requestPermission() {
    if (!isPushSupported || !config?.enabled || !config.vapidPublicKey) {
      return;
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        // Subscribe to push notifications
        await subscribeToPush();
        showToast(t('notifications.permissionGranted'), 'success');
        setShowBanner(false);
      } else if (permission === 'denied') {
        showToast(t('notifications.permissionDenied'), 'error');
        setShowBanner(false);
      }
    } catch (error) {
      console.error('[NotificationManager] Failed to request permission:', error);
      showToast(t('notifications.error'), 'error');
    }
  }

  async function subscribeToPush() {
    if (!config?.vapidPublicKey) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        const applicationServerKey = urlBase64ToUint8Array(config.vapidPublicKey);
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as BufferSource
        });
      }

      // Send subscription to server
      const response = await fetch(`${API_URL}/api/push-notifications/subscribe`, {
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
      console.error('[NotificationManager] Failed to subscribe:', error);
      throw error;
    }
  }

  async function unsubscribeFromPush() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Unsubscribe locally
        await subscription.unsubscribe();
        
        // Notify server
        await fetch(`${API_URL}/api/push-notifications/unsubscribe`, {
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
      console.error('[NotificationManager] Failed to unsubscribe:', error);
      showToast(t('notifications.error'), 'error');
    }
  }

  async function sendTestNotification() {
    try {
      const response = await fetch(`${API_URL}/api/push-notifications/test`, {
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
      console.error('[NotificationManager] Failed to send test:', error);
      showToast(t('notifications.error'), 'error');
    }
  }

  function dismissBanner() {
    setShowBanner(false);
    sessionStorage.setItem('notificationBannerDismissed', 'true');
  }

  // Don't render anything if loading or push not supported
  if (isLoading) {
    console.log('[NotificationManager] Still loading, not rendering');
    return null;
  }

  // Don't render if server doesn't have push enabled
  if (!config?.enabled) {
    console.log('[NotificationManager] Push not enabled on server, not rendering');
    return null;
  }

  // Don't render if browser doesn't support push
  if (!isPushSupported) {
    console.log('[NotificationManager] Push not supported, not rendering');
    return null;
  }

  console.log('[NotificationManager] Render decision:', { showBanner, permission, isSubscribed });

  // Render permission banner (only if default permission state)
  if (showBanner && permission === 'default') {
    console.log('[NotificationManager] Rendering banner!');
    return (
      <div className="notification-banner">
        <div className="notification-banner-content">
          <div className="notification-banner-icon">🔔</div>
          <div className="notification-banner-text">
            <strong>{t('notifications.bannerTitle')}</strong>
            <p>{t('notifications.bannerDescription')}</p>
          </div>
          <div className="notification-banner-actions">
            <button className="btn-primary" onClick={requestPermission}>
              {t('notifications.enable')}
            </button>
            <button className="btn-secondary" onClick={dismissBanner}>
              {t('notifications.dismiss')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render settings panel (for already granted permissions)
  if (permission === 'granted' && isSubscribed) {
    return (
      <div className="notification-settings">
        <div className="notification-status">
          <span className="status-indicator status-active"></span>
          <span>{t('notifications.active')}</span>
        </div>
        <div className="notification-actions">
          <button className="btn-secondary" onClick={sendTestNotification}>
            {t('notifications.sendTest')}
          </button>
          <button className="btn-secondary" onClick={unsubscribeFromPush}>
            {t('notifications.disable')}
          </button>
        </div>
      </div>
    );
  }

  // Don't render anything if permission denied
  return null;
}

