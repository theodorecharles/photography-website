/**
 * Notification Preferences Section
 * 
 * Allows admins to configure which push notifications they want to receive
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../../../config';
import { fetchWithRateLimitCheck } from '../../../../utils/fetchWrapper';

interface NotificationPreferences {
  [key: string]: boolean;
}

interface NotificationType {
  key: string;
  titleKey: string;
  descriptionKey: string;
  icon: string;
}

interface NotificationCategory {
  key: string;
  titleKey: string;
  descriptionKey: string;
  notifications: NotificationType[];
}

export default function NotificationPreferencesSection() {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<NotificationPreferences>({});
  const [categories, setCategories] = useState<NotificationCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/notification-preferences`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load notification preferences');
      }

      const data = await response.json();
      setPreferences(data.preferences);
      setCategories(data.categories);
    } catch (err) {
      console.error('Error loading notification preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetchWithRateLimitCheck(`${API_URL}/api/notification-preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': (window as any).csrfToken || ''
        },
        credentials: 'include',
        body: JSON.stringify({ preferences }),
      });

      if (!response.ok) {
        throw new Error('Failed to save notification preferences');
      }

      const data = await response.json();
      setPreferences(data.preferences);
      setSuccessMessage(t('settings.notifications.saved'));

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving notification preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!confirm(t('settings.notifications.confirmReset'))) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetchWithRateLimitCheck(`${API_URL}/api/notification-preferences/reset`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': (window as any).csrfToken || ''
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to reset notification preferences');
      }

      const data = await response.json();
      setPreferences(data.preferences);
      setSuccessMessage(t('settings.notifications.resetSuccess'));

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error resetting notification preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleEnableAll = () => {
    const allEnabled: NotificationPreferences = {};
    categories.forEach(category => {
      category.notifications.forEach(notif => {
        allEnabled[notif.key] = true;
      });
    });
    setPreferences(allEnabled);
  };

  const handleDisableAll = () => {
    const allDisabled: NotificationPreferences = {};
    categories.forEach(category => {
      category.notifications.forEach(notif => {
        allDisabled[notif.key] = false;
      });
    });
    setPreferences(allDisabled);
  };

  if (loading) {
    return (
      <div className="config-section">
        <h3>{t('settings.notifications.title')}</h3>
        <p className="section-description">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="config-section">
      <div className="section-header">
        <div>
          <h3>{t('settings.notifications.title')}</h3>
          <p className="section-description">
            {t('settings.notifications.description')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleEnableAll} className="btn-secondary">
            {t('settings.notifications.enableAll')}
          </button>
          <button onClick={handleDisableAll} className="btn-secondary">
            {t('settings.notifications.disableAll')}
          </button>
          <button onClick={handleResetToDefaults} className="btn-secondary">
            {t('settings.notifications.resetToDefaults')}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {successMessage && (
        <div className="success-banner" style={{ marginBottom: '1rem' }}>
          {successMessage}
        </div>
      )}

      <div className="notification-preferences">
        {categories.map(category => (
          <div key={category.key} className="notification-category">
            <div className="category-header">
              <h4>{t(category.titleKey)}</h4>
              <p className="category-description">{t(category.descriptionKey)}</p>
            </div>

            <div className="notification-list">
              {category.notifications.map(notification => (
                <div key={notification.key} className="notification-item">
                  <div className="notification-info">
                    <span className="notification-icon">{notification.icon}</span>
                    <div className="notification-details">
                      <div className="notification-title">
                        {t(notification.titleKey)}
                      </div>
                      <div className="notification-description">
                        {t(notification.descriptionKey)}
                      </div>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={preferences[notification.key] || false}
                      onChange={() => handleToggle(notification.key)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="section-actions">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </div>
  );
}
