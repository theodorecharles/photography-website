/**
 * Logging Settings Page
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../../../config';
import Breadcrumbs from '../components/Breadcrumbs';
import CustomDropdown from '../components/CustomDropdown';
import { ConfigData } from '../types';
import { error } from '../../../../utils/logger';
import { trackConfigSettingsSaved } from '../../../../utils/analytics';

interface LoggingPageProps {
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
}

const LoggingPage: React.FC<LoggingPageProps> = ({ setMessage }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<ConfigData | null>(null);

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
      } else {
        setMessage({ type: 'error', text: 'Failed to load configuration' });
      }
    } catch (err) {
      error('Failed to load config:', err);
      setMessage({ type: 'error', text: 'Failed to load configuration' });
    }
  };

  const handleLogLevelChange = async (newLevel: string) => {
    if (!config) return;

    const newConfig = {
      ...config,
      environment: {
        ...config.environment,
        logging: {
          ...config.environment.logging,
          level: newLevel,
        },
      },
    };
    setConfig(newConfig);

    // Auto-save immediately
    try {
      const response = await fetch(`${API_URL}/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newConfig),
      });

      if (!response.ok) {
        throw new Error(t('advancedSettings.failedToSaveLogLevel'));
      }

      setMessage({
        type: 'success',
        text: t('advancedSettings.logLevelChanged', { level: newLevel }),
      });
      trackConfigSettingsSaved('Logging');
    } catch (err) {
      error('[LoggingPage] Failed to save log level:', err);
      setMessage({
        type: 'error',
        text: t('advancedSettings.failedToSaveLogLevel'),
      });
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
        <h2 className="settings-page-title">{t('settings.logging.title')}</h2>
        <p className="settings-page-description">
          {t('settings.logging.pageDescription')}
        </p>
      </div>

      <Breadcrumbs section={t('settings.logging.title')} />

      <div
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <label
              className="branding-label"
              style={{ display: 'block', marginBottom: '0.5rem' }}
            >
              {t('advancedSettings.logLevel')}
            </label>
            <CustomDropdown
              value={config?.environment?.logging?.level || 'error'}
              options={[
                {
                  value: 'silent',
                  label: t('advancedSettings.logLevelSilent'),
                  emoji: '🔇',
                },
                {
                  value: 'error',
                  label: t('advancedSettings.logLevelError'),
                  emoji: '❌',
                },
                {
                  value: 'warn',
                  label: t('advancedSettings.logLevelWarn'),
                  emoji: '⚠️',
                },
                {
                  value: 'info',
                  label: t('advancedSettings.logLevelInfo'),
                  emoji: 'ℹ️',
                },
                {
                  value: 'debug',
                  label: t('advancedSettings.logLevelDebug'),
                  emoji: '🐛',
                },
                {
                  value: 'verbose',
                  label: t('advancedSettings.logLevelVerbose'),
                  emoji: '📝',
                },
                {
                  value: 'trace',
                  label: t('advancedSettings.logLevelTrace'),
                  emoji: '🔍',
                },
              ]}
              onChange={handleLogLevelChange}
              openUpward={false}
            />
            <p
              style={{
                fontSize: '0.85rem',
                color: '#888',
                marginTop: '0.5rem',
                lineHeight: '1.4',
              }}
            >
              {t('advancedSettings.logLevelDescription')}
            </p>
          </div>

          <div>
            <button
              className="btn-secondary"
              onClick={() =>
                window.open(
                  '/logs',
                  'LogViewer',
                  'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no'
                )
              }
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                height: 'auto',
                marginTop: '1.8rem',
              }}
            >
              📋 {t('advancedSettings.viewLiveLogs')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoggingPage;

