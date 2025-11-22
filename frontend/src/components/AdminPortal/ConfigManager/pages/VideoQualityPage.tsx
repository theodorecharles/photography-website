/**
 * Video Quality Settings Page
 * Contains video optimization configuration and force regenerate all videos button
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../../../config';
import { useSSEToaster } from '../../../../contexts/SSEToasterContext';
import Breadcrumbs from '../components/Breadcrumbs';
import VideoOptimizationSection from '../sections/VideoOptimizationSection';
import { ConfigData } from '../types';
import { error } from '../../../../utils/logger';

interface VideoQualityPageProps {
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
}

const VideoQualityPage: React.FC<VideoQualityPageProps> = ({ setMessage }) => {
  const { t } = useTranslation();
  const sseToaster = useSSEToaster();
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [originalConfig, setOriginalConfig] = useState<ConfigData | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [isVideoOptimizationRunning, setIsVideoOptimizationRunning] = useState(false);

  useEffect(() => {
    loadConfig();
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

  const handleRunVideoOptimization = async () => {
    sseToaster.setIsOptimizationRunning(true);
    sseToaster.setOptimizationComplete(false);
    sseToaster.setOptimizationLogs([]);
    sseToaster.setOptimizationProgress(0);
    setIsVideoOptimizationRunning(true);
    sseToaster.resetToasterState();

    try {
      const abortController = new AbortController();
      sseToaster.optimizationAbortController.current = abortController;

      const response = await fetch(`${API_URL}/api/video-optimization/reprocess`, {
        method: 'POST',
        credentials: 'include',
        signal: abortController.signal,
      });

      if (!response.ok) {
        setMessage({ type: 'error', text: 'Failed to start video reprocessing' });
        setIsVideoOptimizationRunning(false);
        sseToaster.setIsOptimizationRunning(false);
        sseToaster.optimizationAbortController.current = null;
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setMessage({ type: 'error', text: 'Failed to read response stream' });
        setIsVideoOptimizationRunning(false);
        sseToaster.setIsOptimizationRunning(false);
        sseToaster.optimizationAbortController.current = null;
        return;
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          setIsVideoOptimizationRunning(false);
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

              if (data.type === 'stdout' || data.type === 'stderr') {
                sseToaster.setOptimizationLogs((prev) => [...prev, data.message]);
              } else if (data.type === 'complete') {
                setIsVideoOptimizationRunning(false);
                sseToaster.setIsOptimizationRunning(false);
                sseToaster.setOptimizationComplete(true);
                sseToaster.setOptimizationLogs((prev) => [...prev, data.message]);
                sseToaster.optimizationAbortController.current = null;
                setMessage({
                  type: data.exitCode === 0 ? 'success' : 'error',
                  text: data.message,
                });
              } else if (data.type === 'error') {
                setMessage({ type: 'error', text: data.message });
                setIsVideoOptimizationRunning(false);
                sseToaster.setIsOptimizationRunning(false);
                sseToaster.optimizationAbortController.current = null;
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      error('Failed to start video reprocessing:', err);
      setMessage({ type: 'error', text: 'Failed to start video reprocessing' });
      setIsVideoOptimizationRunning(false);
      sseToaster.setIsOptimizationRunning(false);
      sseToaster.optimizationAbortController.current = null;
    }
  };

  const handleStopVideoOptimization = async () => {
    try {
      const response = await fetch(`${API_URL}/api/video-optimization/stop`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Video playlist regeneration stopped' });
        setIsVideoOptimizationRunning(false);
      }
    } catch (err) {
      error('Failed to stop video optimization:', err);
      setIsVideoOptimizationRunning(false);
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
        <h2 className="settings-page-title">{t('settings.videoQuality.title')}</h2>
        <p className="settings-page-description">
          {t('settings.videoQuality.pageDescription')}
        </p>
      </div>

      <Breadcrumbs section={t('settings.videoQuality.title')} />

      {/* Warning Banner */}
      <div
        className="video-optimization-banner"
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
            {t('videoOptimization.warningNote')}
          </span>
        </div>

        {!isVideoOptimizationRunning && (
          <button
            className="btn-secondary"
            onClick={handleRunVideoOptimization}
            style={{
              whiteSpace: 'nowrap',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: '#ef4444',
            }}
          >
            {t('advancedSettings.regenerationControls.regenerateVideoPlaylists')}
          </button>
        )}

        {isVideoOptimizationRunning && (
          <button
            className="btn-secondary"
            onClick={handleStopVideoOptimization}
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

      <VideoOptimizationSection
        config={config}
        originalConfig={originalConfig}
        setConfig={setConfig}
        setOriginalConfig={setOriginalConfig}
        savingSection={savingSection}
        setSavingSection={setSavingSection}
        setMessage={setMessage}
      />
    </div>
  );
};

export default VideoQualityPage;

