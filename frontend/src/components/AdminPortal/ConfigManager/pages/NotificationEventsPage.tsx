/**
 * Notification Events Page
 * Configure which notification types should be sent
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../../../config';
import Breadcrumbs from '../components/Breadcrumbs';
import { error as logError } from '../../../../utils/logger';
import '../../AlbumsManager.css'; // For toggle switch styles
import './NotificationEventsPage.css';

interface NotificationEventsPageProps {
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
}

interface NotificationPreferences {
  [key: string]: boolean;
}

interface NotificationCategory {
  key: string;
  titleKey: string;
  descriptionKey: string;
  notifications: {
    key: string;
    titleKey: string;
    descriptionKey: string;
    icon: string;
  }[];
}

const NotificationEventsPage: React.FC<NotificationEventsPageProps> = ({ setMessage }) => {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [categories, setCategories] = useState<NotificationCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const res = await fetch(`${API_URL}/api/notification-preferences`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        console.log('[NotificationEvents] Loaded preferences from server:', data.preferences);
        setPreferences(data.preferences);
        setCategories(data.categories);
      } else {
        setMessage({ type: 'error', text: 'Failed to load notification preferences' });
      }
    } catch (err) {
      logError('Failed to load notification preferences:', err);
      setMessage({ type: 'error', text: 'Failed to load notification preferences' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: string, currentValue: boolean) => {
    if (!preferences) return;

    // Optimistically update UI
    const newPreferences = {
      ...preferences,
      [key]: !currentValue,
    };
    console.log('[NotificationEvents] Toggling:', key, 'from', currentValue, 'to', !currentValue);
    console.log('[NotificationEvents] Sending preferences:', newPreferences);
    setPreferences(newPreferences);
    setSaving(key);

    try {
      const res = await fetch(`${API_URL}/api/notification-preferences`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': (window as any).csrfToken || ''
        },
        credentials: 'include',
        body: JSON.stringify({ preferences: newPreferences }),
      });

      console.log('[NotificationEvents] Response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('[NotificationEvents] Response data:', data);
        setPreferences(data.preferences);
        setMessage({ 
          type: 'success', 
          text: t('settings.notifications.events.saved', { 
            notification: t(`settings.notifications.types.${key}.title`) 
          })
        });
      } else {
        // Revert on error
        setPreferences(preferences);
        const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
        setMessage({ type: 'error', text: errorData.message || 'Failed to save preferences' });
      }
    } catch (err) {
      // Revert on error
      setPreferences(preferences);
      logError('Failed to save notification preferences:', err);
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading notification events...</p>
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="settings-page">
        <div className="error-container">
          <p>Failed to load notification preferences</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-page-header">
        <h2 className="settings-page-title">{t('settings.notificationEvents.title')}</h2>
        <p className="settings-page-description">
          {t('settings.notificationEvents.pageDescription')}
        </p>
      </div>

      <Breadcrumbs 
        parentSection={{
          title: t('settings.pushNotifications.title'),
          path: '/admin/settings/push-notifications'
        }}
        section={t('settings.notificationEvents.title')} 
      />

      <div style={{ marginTop: '2rem' }}>
        {categories.map((category) => (
          <div key={category.key} className="settings-section" style={{ marginBottom: '2.5rem' }}>
            <div style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 500, color: '#fff', margin: 0 }}>
                {t(category.titleKey)}
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#999', margin: '0.25rem 0 0 0' }}>
                {t(category.descriptionKey)}
              </p>
            </div>

            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '0.75rem' 
              }}
              className="notification-events-grid"
            >
              {category.notifications.map((notification) => (
                <div
                  key={notification.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', minWidth: 0 }}>
                      <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{notification.icon}</span>
                      <span style={{ 
                        fontSize: '0.95rem', 
                        fontWeight: 500, 
                        color: '#fff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                        flex: 1
                      }}>
                        {t(notification.titleKey)}
                      </span>
                    </div>
                    <p 
                      className="notification-event-description"
                      style={{ 
                        fontSize: '0.8rem', 
                        color: '#999', 
                        margin: 0, 
                        paddingLeft: '2rem'
                      }}
                    >
                      {t(notification.descriptionKey)}
                    </p>
                  </div>

                  <div className="toggle-controls" style={{ flexShrink: 0 }}>
                    <span
                      className="toggle-label"
                      style={{
                        color: preferences[notification.key] ? '#10b981' : '#666',
                        fontWeight: preferences[notification.key] ? 500 : 400,
                      }}
                    >
                      {preferences[notification.key] ? t('videoOptimization.on') : t('videoOptimization.off')}
                    </span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={preferences[notification.key] ?? true}
                        onChange={() => handleToggle(notification.key, preferences[notification.key] ?? true)}
                        disabled={saving === notification.key}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationEventsPage;

