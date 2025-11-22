/**
 * Push Notifications Settings Page
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../../../config';
import Breadcrumbs from '../components/Breadcrumbs';
import PushNotificationsSettings from '../components/PushNotificationsSettings';
import { ConfigData } from '../types';
import { error } from '../../../../utils/logger';

interface PushNotificationsPageProps {
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
}

const PushNotificationsPage: React.FC<PushNotificationsPageProps> = ({ setMessage }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [originalConfig, setOriginalConfig] = useState<ConfigData | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [actionButtons, setActionButtons] = useState<React.ReactNode>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/api/config`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setOriginalConfig(structuredClone(data));
      } else {
        setMessage({ type: 'error', text: 'Failed to load configuration' });
      }
    } catch (err) {
      error('Failed to load config:', err);
      setMessage({ type: 'error', text: 'Failed to load configuration' });
    }
  };

  const updateConfig = (path: string[], value: any) => {
    if (!config) return;
    const newConfig = structuredClone(config);
    let current: any = newConfig;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    setConfig(newConfig);
  };

  const handleSaveSection = async (sectionName: string) => {
    if (!config) return;
    setSavingSection(sectionName);

    try {
      const res = await fetch(`${API_URL}/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `${sectionName} settings saved successfully` });
        setOriginalConfig(structuredClone(config));
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        setMessage({ type: 'error', text: errorData.error || 'Failed to save settings' });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error saving settings';
      setMessage({ type: 'error', text: errorMessage });
      error('Failed to save config:', err);
    } finally {
      setSavingSection(null);
    }
  };

  if (!config) {
    return (
      <div className="settings-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-page-header">
        <h2 className="settings-page-title">{t('settings.pushNotifications.title')}</h2>
        <p className="settings-page-description">
          {t('settings.pushNotifications.pageDescription')}
        </p>
      </div>

      <Breadcrumbs 
        section={t('settings.pushNotifications.title')}
        actions={actionButtons}
      />

      <PushNotificationsSettings
        config={config}
        originalConfig={originalConfig!}
        updateConfig={updateConfig}
        savingSection={savingSection}
        onSave={handleSaveSection}
        setMessage={setMessage}
        setActionButtons={setActionButtons}
      />
    </div>
  );
};

export default PushNotificationsPage;

