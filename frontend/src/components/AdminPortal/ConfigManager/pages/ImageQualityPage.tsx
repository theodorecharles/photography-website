/**
 * Image Quality Settings Page
 * Contains image optimization configuration and force regenerate all images button
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../../../config';
import { useSSEToaster } from '../../../../contexts/SSEToasterContext';
import Breadcrumbs from '../components/Breadcrumbs';
import ImageOptimizationSection from '../sections/ImageOptimizationSection';
import { ConfigData } from '../types';
import { error, info } from '../../../../utils/logger';
import {
  trackImageOptimizationStarted,
  trackImageOptimizationStopped,
} from '../../../../utils/analytics';

interface ImageQualityPageProps {
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
}

const ImageQualityPage: React.FC<ImageQualityPageProps> = ({ setMessage }) => {
  const { t } = useTranslation();
  const sseToaster = useSSEToaster();
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [originalConfig, setOriginalConfig] = useState<ConfigData | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    loadConfig();
    checkForRunningJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const checkForRunningJobs = async () => {
    if (sseToaster.isOptimizationRunning) {
      return;
    }

    try {
      const optRes = await fetch(`${API_URL}/api/image-optimization/status`, {
        credentials: 'include',
      });
      if (optRes.ok) {
        const optStatus = await optRes.json();
        if (optStatus.running && !optStatus.isComplete) {
          info('Reconnecting to optimization job...');

          const parsedOutput: string[] = [];
          let lastProgress = 0;

          for (const item of optStatus.output || []) {
            try {
              const parsed = JSON.parse(item);
              if (parsed.type === 'progress') {
                lastProgress = parsed.percent;
                parsedOutput.push(parsed.message);
              } else if (parsed.type === 'stdout' || parsed.type === 'stderr') {
                parsedOutput.push(parsed.message);
              }
            } catch {
              parsedOutput.push(item);
            }
          }

          sseToaster.setIsOptimizationRunning(true);
          sseToaster.setOptimizationLogs(parsedOutput);
          sseToaster.setOptimizationProgress(lastProgress);

          reconnectToOptimizationJob();
        }
      }
    } catch (err) {
      error('Error checking for running jobs:', err);
    }
  };

  const reconnectToOptimizationJob = async () => {
    const controller = new AbortController();
    sseToaster.optimizationAbortController.current = controller;

    trackImageOptimizationStarted('all');

    try {
      const res = await fetch(`${API_URL}/api/image-optimization/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ force: true }),
        signal: controller.signal,
      });

      if (!res.ok) {
        sseToaster.setIsOptimizationRunning(false);
        sseToaster.optimizationAbortController.current = null;
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        sseToaster.setIsOptimizationRunning(false);
        sseToaster.optimizationAbortController.current = null;
        return;
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'progress') {
                sseToaster.setOptimizationProgress(data.percent);
                sseToaster.setOptimizationLogs((prev) => [...prev, data.message]);
              } else if (data.type === 'stdout' || data.type === 'stderr') {
                sseToaster.setOptimizationLogs((prev) => [...prev, data.message]);
              } else if (data.type === 'complete') {
                sseToaster.setIsOptimizationRunning(false);
                sseToaster.optimizationAbortController.current = null;
              } else if (data.type === 'error') {
                setMessage({ type: 'error', text: data.message });
                sseToaster.setIsOptimizationRunning(false);
                sseToaster.optimizationAbortController.current = null;
              }
            } catch (e) {
              error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        info('Optimization job stopped by user');
        sseToaster.optimizationAbortController.current = null;
      } else {
        error('Failed to reconnect to optimization job:', err);
        sseToaster.setIsOptimizationRunning(false);
        sseToaster.optimizationAbortController.current = null;
      }
    }
  };

  const showConfirmation = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmConfig({
        message,
        onConfirm: () => {
          setShowConfirmModal(false);
          setConfirmConfig(null);
          resolve(true);
        },
      });
      setShowConfirmModal(true);
      (window as any).__modalResolve = resolve;
    });
  };

  const handleModalCancel = () => {
    setShowConfirmModal(false);
    setConfirmConfig(null);
    if ((window as any).__modalResolve) {
      (window as any).__modalResolve(false);
      delete (window as any).__modalResolve;
    }
  };

  const handleRunOptimization = async (force: boolean = false) => {
    const confirmed = await showConfirmation(
      force
        ? t('advancedSettings.regenerationControls.forceRegenerateImagesConfirm')
        : t('advancedSettings.regenerationControls.runOptimizationConfirm')
    );
    if (!confirmed) return;

    sseToaster.setIsOptimizationRunning(true);
    sseToaster.setOptimizationComplete(false);
    sseToaster.setOptimizationLogs([]);
    sseToaster.setOptimizationProgress(0);
    sseToaster.resetToasterState();

    try {
      const abortController = new AbortController();
      sseToaster.optimizationAbortController.current = abortController;

      const res = await fetch(`${API_URL}/api/image-optimization/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ force }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        let errorMessage = 'Failed to start optimization';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response isn't JSON, use default message
        }
        setMessage({
          type: 'error',
          text: `${errorMessage} (Status: ${res.status})`,
        });
        sseToaster.setIsOptimizationRunning(false);
        sseToaster.optimizationAbortController.current = null;
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setMessage({ type: 'error', text: 'Failed to read response stream' });
        sseToaster.setIsOptimizationRunning(false);
        return;
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          sseToaster.setIsOptimizationRunning(false);
          sseToaster.optimizationAbortController.current = null;
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'progress') {
                sseToaster.setOptimizationProgress(data.percent);
                sseToaster.setOptimizationLogs((prev) => [...prev, data.message]);
              } else if (data.type === 'stdout' || data.type === 'stderr') {
                sseToaster.setOptimizationLogs((prev) => [...prev, data.message]);
              } else if (data.type === 'complete') {
                sseToaster.setIsOptimizationRunning(false);
                sseToaster.setOptimizationComplete(true);
                sseToaster.setOptimizationLogs((prev) => [...prev, data.message]);
                setMessage({
                  type: data.exitCode === 0 ? 'success' : 'error',
                  text:
                    data.exitCode === 0
                      ? 'Optimization completed successfully!'
                      : 'Optimization failed',
                });
              } else if (data.type === 'error') {
                setMessage({ type: 'error', text: data.message });
              }
            } catch (e) {
              error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      error('Optimization error:', err);
      setMessage({ type: 'error', text: 'Network error occurred' });
      sseToaster.setIsOptimizationRunning(false);
      sseToaster.optimizationAbortController.current = null;
    }
  };

  const handleStopOptimization = useCallback(async () => {
    info('[handleStopOptimization] Called');
    trackImageOptimizationStopped(true);

    try {
      const response = await fetch(`${API_URL}/api/image-optimization/stop`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      info('[handleStopOptimization] Backend response:', result.success);

      if (sseToaster.optimizationAbortController.current) {
        info('[handleStopOptimization] Aborting SSE connection');
        sseToaster.optimizationAbortController.current.abort();
        sseToaster.optimizationAbortController.current = null;
      }

      info('[handleStopOptimization] Clearing global state');
      sseToaster.setIsOptimizationRunning(false);
      sseToaster.setOptimizationComplete(false);
      sseToaster.setOptimizationLogs([]);
      sseToaster.setOptimizationProgress(0);
      info('[handleStopOptimization] Done');
    } catch (err) {
      error('Failed to stop optimization job:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    info('[ImageQualityPage] Registering stop handler');
    sseToaster.setStopOptimizationHandler(() => handleStopOptimization);
    info('[ImageQualityPage] Stop handler registered');
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
        <h2 className="settings-page-title">{t('settings.imageQuality.title')}</h2>
        <p className="settings-page-description">
          {t('settings.imageQuality.pageDescription')}
        </p>
      </div>

      <Breadcrumbs section={t('settings.imageQuality.title')} />

      {/* Warning Banner */}
      <div
        className="image-optimization-banner"
        style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          background: 'rgba(255, 193, 7, 0.1)',
          border: '1px solid rgba(255, 193, 7, 0.3)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
        }}
      >
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: '0.875rem', color: 'rgba(255, 193, 7, 0.9)' }}>
            ⚠️ {t('common.note')}:
          </strong>
          <span style={{ fontSize: '0.875rem', color: 'rgba(255, 193, 7, 0.9)', marginLeft: '0.5rem' }}>
            {t('imageOptimization.warningNote')}
          </span>
        </div>

        {!sseToaster.isOptimizationRunning && (
          <button
            className="btn-secondary"
            onClick={() => handleRunOptimization(true)}
            style={{
              whiteSpace: 'nowrap',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: '#ef4444',
            }}
          >
            {t('advancedSettings.regenerationControls.forceRegenerateImages')}
          </button>
        )}

        {sseToaster.isOptimizationRunning && (
          <button
            className="btn-secondary"
            onClick={handleStopOptimization}
            style={{
              whiteSpace: 'nowrap',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: '#ef4444',
            }}
          >
            {t('common.stop')}
          </button>
        )}
      </div>

      <ImageOptimizationSection
        config={config}
        originalConfig={originalConfig}
        setConfig={setConfig}
        setOriginalConfig={setOriginalConfig}
        savingSection={savingSection}
        setSavingSection={setSavingSection}
        setMessage={setMessage}
      />

      {/* Confirmation Modal */}
      {showConfirmModal && confirmConfig && (
        <div className="modal-overlay" onClick={handleModalCancel}>
          <div
            className="generic-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px' }}
          >
            <div className="generic-modal-header">
              <h2>{t('common.confirmAction')}</h2>
              <button
                className="close-button"
                onClick={handleModalCancel}
                aria-label={t('common.close')}
              >
                ×
              </button>
            </div>
            <div className="generic-modal-content">
              <p className="share-description">{confirmConfig.message}</p>
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                  paddingTop: '1rem',
                  borderTop: '1px solid #3a3a3a',
                }}
              >
                <button onClick={handleModalCancel} className="btn-secondary">
                  {t('common.cancel')}
                </button>
                <button onClick={confirmConfig.onConfirm} className="btn-primary">
                  {t('common.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageQualityPage;

