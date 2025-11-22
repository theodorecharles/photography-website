/**
 * Email (SMTP) Settings Page
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../../../config';
import Breadcrumbs from '../components/Breadcrumbs';
import SMTPSettings from '../components/SMTPSettings';
import { ConfigData } from '../types';
import { error } from '../../../../utils/logger';

interface EmailPageProps {
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
}

const EmailPage: React.FC<EmailPageProps> = ({ setMessage }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [originalConfig, setOriginalConfig] = useState<ConfigData | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [actionButtons, setActionButtons] = useState<React.ReactNode>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

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

  const hasUnsavedChanges = (): boolean => {
    if (!config || !originalConfig) return false;
    return JSON.stringify((config as any).email) !== JSON.stringify((originalConfig as any).email);
  };

  const handleSave = async () => {
    if (!config) return;
    setSavingSection('Email');

    try {
      const res = await fetch(`${API_URL}/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Email settings saved successfully' });
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
        <h2 className="settings-page-title">{t('settings.email.title')}</h2>
        <p className="settings-page-description">
          {t('settings.email.pageDescription')}
        </p>
      </div>

      <Breadcrumbs 
        section={t('settings.email.title')}
        actions={actionButtons}
      />

      <SMTPSettings
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
        sectionRef={sectionRef}
        setActionButtons={setActionButtons}
      />
    </div>
  );
};

export default EmailPage;

