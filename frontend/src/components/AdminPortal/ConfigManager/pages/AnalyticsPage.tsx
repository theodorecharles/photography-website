/**
 * Analytics Settings Page
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../../../config';
import Breadcrumbs from '../components/Breadcrumbs';
import AnalyticsSettings from '../components/AnalyticsSettings';
import { ConfigData } from '../types';
import { error } from '../../../../utils/logger';
import { updateConfig as updateConfigHelper } from '../utils/configHelpers';

interface AnalyticsPageProps {
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ setMessage }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [originalConfig, setOriginalConfig] = useState<ConfigData | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);

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
    updateConfigHelper(config, setConfig, path, value);
  };

  const hasUnsavedChanges = (): boolean => {
    if (!config || !originalConfig) return false;
    return JSON.stringify(config.analytics) !== JSON.stringify(originalConfig.analytics);
  };

  const handleSave = async () => {
    if (!config) return;
    setSavingSection('Analytics');

    try {
      const res = await fetch(`${API_URL}/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Analytics settings saved successfully' });
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
        <h2 className="settings-page-title">{t('settings.analytics.title')}</h2>
        <p className="settings-page-description">
          {t('settings.analytics.pageDescription')}
        </p>
      </div>

      <Breadcrumbs section={t('settings.analytics.title')} />

      <AnalyticsSettings
        config={config}
        originalConfig={originalConfig!}
        setConfig={setConfig}
        setOriginalConfig={setOriginalConfig}
        updateConfig={updateConfig}
        hasUnsavedChanges={hasUnsavedChanges()}
        onSave={handleSave}
        onCancel={() => setConfig(originalConfig)}
        savingSection={savingSection}
        setMessage={setMessage}
        onOpenObserveSave={() => {}}
      />
    </div>
  );
};

export default AnalyticsPage;

