/**
 * OpenAI Settings Page
 * Contains OpenAI configuration and force regenerate all titles button
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../../../config';
import { useSSEToaster } from '../../../../contexts/SSEToasterContext';
import Breadcrumbs from '../components/Breadcrumbs';
import OpenAISection from '../sections/OpenAISection';
import { ConfigData } from '../types';
import { error, info } from '../../../../utils/logger';
import {
  trackAITitleGenerationStarted,
  trackAITitleGenerationStopped,
} from '../../../../utils/analytics';

interface OpenAIPageProps {
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
}

const OpenAIPage: React.FC<OpenAIPageProps> = ({ setMessage }) => {
  const { t } = useTranslation();
  const sseToaster = useSSEToaster();
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [originalConfig, setOriginalConfig] = useState<ConfigData | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [hasMissingTitles, setHasMissingTitles] = useState(false);
  const [apiKeyValidated, setApiKeyValidated] = useState(false);

  useEffect(() => {
    loadConfig();
    checkForRunningJobs();
    checkMissingTitles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for OpenAI config save events
  useEffect(() => {
    const handleOpenAISaved = () => {
      setApiKeyValidated(true);
      checkMissingTitles(); // Refresh missing titles count after save
    };

    window.addEventListener('openai-config-saved', handleOpenAISaved);
    return () => {
      window.removeEventListener('openai-config-saved', handleOpenAISaved);
    };
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
        
        // If there's already an API key saved, consider it validated
        if (data?.openai?.apiKey) {
          setApiKeyValidated(true);
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to load configuration' });
      }
    } catch (err) {
      error('Failed to load config:', err);
      setMessage({ type: 'error', text: 'Failed to load configuration' });
    }
  };

  const checkMissingTitles = async () => {
    try {
      const res = await fetch(`${API_URL}/api/ai-titles/check-missing`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setHasMissingTitles(data.hasMissingTitles);
      }
    } catch (err) {
      error('Failed to check missing titles:', err);
    }
  };

  const checkForRunningJobs = async () => {
    if (sseToaster.generatingTitles) {
      info('[OpenAIPage] Job already running in context, skipping backend check');
      return;
    }

    try {
      const titlesRes = await fetch(`${API_URL}/api/ai-titles/status`, {
        credentials: 'include',
      });
      if (titlesRes.ok) {
        const titlesStatus = await titlesRes.json();
        if (titlesStatus.running && !titlesStatus.isComplete) {
          info('Reconnecting to AI titles job...');

          const parsedOutput: string[] = [];
          let lastProgress = 0;
          let lastWaiting: number | null = null;

          for (const item of titlesStatus.output || []) {
            try {
              const parsed = JSON.parse(item);
              if (parsed.type === 'progress') {
                lastProgress = parsed.percent;
                parsedOutput.push(parsed.message);
              } else if (parsed.type === 'waiting') {
                lastWaiting = parsed.seconds;
              }
            } catch {
              parsedOutput.push(item);
            }
          }

          sseToaster.setGeneratingTitles(true);
          sseToaster.setTitlesOutput(parsedOutput);
          sseToaster.setTitlesProgress(lastProgress);
          sseToaster.setTitlesWaiting(lastWaiting);

          reconnectToTitlesJob();
        }
      }
    } catch (err) {
      error('Error checking for running jobs:', err);
    }
  };

  const reconnectToTitlesJob = async () => {
    const controller = new AbortController();
    sseToaster.titlesAbortController.current = controller;

    try {
      const res = await fetch(`${API_URL}/api/ai-titles/generate`, {
        method: 'POST',
        credentials: 'include',
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error('Failed to reconnect to AI title generation');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);

            if (data === '__COMPLETE__') {
              setMessage({
                type: 'success',
                text: 'AI title generation completed successfully!',
              });
              sseToaster.setGeneratingTitles(false);
              sseToaster.titlesAbortController.current = null;
            } else if (data.startsWith('__ERROR__')) {
              setMessage({ type: 'error', text: data.substring(10) });
              sseToaster.setGeneratingTitles(false);
              sseToaster.titlesAbortController.current = null;
            } else {
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'progress') {
                  sseToaster.setTitlesProgress(parsed.percent);
                  sseToaster.setTitlesWaiting(null);
                  sseToaster.setTitlesOutput((prev) => [...prev, parsed.message]);
                } else if (parsed.type === 'waiting') {
                  sseToaster.setTitlesWaiting(parsed.seconds);
                } else {
                  sseToaster.setTitlesOutput((prev) => [...prev, data]);
                }
              } catch {
                sseToaster.setTitlesOutput((prev) => [...prev, data]);
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        info('AI titles job stopped by user');
        sseToaster.titlesAbortController.current = null;
      } else {
        error('Failed to reconnect to titles job:', err);
        sseToaster.setGeneratingTitles(false);
        sseToaster.titlesAbortController.current = null;
      }
    }
  };

  const handleGenerateTitles = async (forceRegenerate = false) => {
    trackAITitleGenerationStarted(forceRegenerate);

    sseToaster.setGeneratingTitles(true);
    sseToaster.setTitlesOutput([]);
    sseToaster.setTitlesProgress(0);
    sseToaster.setTitlesWaiting(null);
    sseToaster.resetToasterState();

    try {
      const abortController = new AbortController();
      sseToaster.titlesAbortController.current = abortController;

      const res = await fetch(
        `${API_URL}/api/ai-titles/generate?forceRegenerate=${forceRegenerate}`,
        {
          method: 'POST',
          credentials: 'include',
          signal: abortController.signal,
        }
      );

      if (!res.ok) {
        throw new Error('Failed to start AI title generation');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);

            if (data === '__COMPLETE__') {
              setMessage({
                type: 'success',
                text: 'AI title generation completed successfully!',
              });
              sseToaster.setGeneratingTitles(false);
              sseToaster.titlesAbortController.current = null;
              checkMissingTitles();
            } else if (data.startsWith('__ERROR__')) {
              setMessage({ type: 'error', text: data.substring(10) });
              sseToaster.setGeneratingTitles(false);
              sseToaster.titlesAbortController.current = null;
              checkMissingTitles();
            } else if (data.startsWith('TITLE_UPDATE:')) {
              try {
                const titleData = JSON.parse(data.substring(13));
                sseToaster.addTitleUpdate(
                  titleData.album,
                  titleData.filename,
                  titleData.title
                );
              } catch (err) {
                error('Failed to parse TITLE_UPDATE:', err);
              }
            } else {
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'progress') {
                  sseToaster.setTitlesProgress(parsed.percent);
                  sseToaster.setTitlesWaiting(null);
                  sseToaster.setTitlesOutput((prev) => [...prev, parsed.message]);
                } else if (parsed.type === 'waiting') {
                  sseToaster.setTitlesWaiting(parsed.seconds);
                } else {
                  sseToaster.setTitlesOutput((prev) => [...prev, data]);
                }
              } catch {
                sseToaster.setTitlesOutput((prev) => [...prev, data]);
              }
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const errorMessage =
        err instanceof Error ? err.message : 'Error generating titles';
      setMessage({ type: 'error', text: errorMessage });
      error('Failed to generate titles:', err);
      sseToaster.setGeneratingTitles(false);
      sseToaster.titlesAbortController.current = null;
      checkMissingTitles();
    }
  };

  const handleStopTitles = useCallback(async () => {
    info('[handleStopTitles] Called');
    trackAITitleGenerationStopped(true);

    try {
      const response = await fetch(`${API_URL}/api/ai-titles/stop`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      info('[handleStopTitles] Backend response:', response.ok);

      if (sseToaster.titlesAbortController.current) {
        info('[handleStopTitles] Aborting SSE connection');
        sseToaster.titlesAbortController.current.abort();
        sseToaster.titlesAbortController.current = null;
      }

      info('[handleStopTitles] Clearing global state');
      sseToaster.setGeneratingTitles(false);
      sseToaster.setTitlesOutput([]);
      sseToaster.setTitlesProgress(0);
      sseToaster.setTitlesWaiting(null);
      info('[handleStopTitles] Done');
    } catch (err) {
      error('Failed to stop AI titles job:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    info('[OpenAIPage] Registering stop handler');
    sseToaster.setStopTitlesHandler(() => handleStopTitles);
    info('[OpenAIPage] Stop handler registered');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <h2 className="settings-page-title">{t('settings.openai.title')}</h2>
        <p className="settings-page-description">
          {t('settings.openai.pageDescription')}
        </p>
      </div>

      <Breadcrumbs section={t('settings.openai.title')} />

      <OpenAISection
        config={config}
        originalConfig={originalConfig}
        setConfig={setConfig}
        setOriginalConfig={setOriginalConfig}
        savingSection={savingSection}
        setSavingSection={setSavingSection}
        setMessage={setMessage}
        scrollToOpenAI={false}
        setScrollToOpenAI={() => {}}
        sectionRef={{ current: null }}
      />

      {/* AI Title Generation Section */}
      {/* Warning Banner with AI Title Generation Controls - Only show if API key is validated */}
      {apiKeyValidated && config?.openai?.apiKey && (
        <div
          style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            borderRadius: '8px',
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <strong style={{ fontSize: '0.875rem', color: 'rgba(255, 193, 7, 0.9)' }}>
              ⚠️ {t('common.note')}:
            </strong>
            <span style={{ fontSize: '0.875rem', color: 'rgba(255, 193, 7, 0.9)', marginLeft: '0.5rem' }}>
              {config?.ai?.autoGenerateTitlesOnUpload
                ? t('openAI.generateTitles.autoEnabledDescription')
                : t('openAI.generateTitles.autoDisabledDescription')}
            </span>
          </div>

          <div className="openai-button-group" style={{ display: 'flex', gap: '0.75rem' }}>
            {!sseToaster.generatingTitles && (
              <button
                className="btn-secondary"
                onClick={() => handleGenerateTitles(false)}
                disabled={!hasMissingTitles}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: hasMissingTitles ? 'rgba(255, 193, 7, 0.15)' : 'rgba(34, 197, 94, 0.1)',
                  border: `1px solid ${hasMissingTitles ? 'rgba(255, 193, 7, 0.5)' : 'rgba(34, 197, 94, 0.4)'}`,
                  color: hasMissingTitles ? 'rgba(255, 193, 7, 1)' : 'rgba(34, 197, 94, 0.9)',
                  cursor: hasMissingTitles ? 'pointer' : 'not-allowed',
                  opacity: 1,
                }}
              >
                <span>{hasMissingTitles ? t('openAI.generateTitles.generateMissing') : t('openAI.generateTitles.noMissingTitles')}</span>
                {!hasMissingTitles && <span style={{ fontSize: '1.2em', color: 'rgba(34, 197, 94, 1)' }}>✓</span>}
              </button>
            )}

            {!sseToaster.generatingTitles && (
              <button
                className="btn-secondary"
                onClick={() => handleGenerateTitles(true)}
                style={{
                  flex: 1,
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  color: '#ef4444',
                }}
              >
                {t('openAI.generateTitles.regenerateAll')}
              </button>
            )}

            {sseToaster.generatingTitles && (
              <button
                className="btn-secondary"
                onClick={handleStopTitles}
                style={{
                  width: '100%',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  color: '#ef4444',
                }}
              >
                {t('common.stop')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OpenAIPage;

