/**
 * Video Optimization Section Component
 * Manages video quality and streaming settings
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../../../config';
import { ConfigData } from '../types';
import { trackConfigSettingsSaved } from '../../../../utils/analytics';
import SectionHeader from '../components/SectionHeader';
import { error } from '../../../../utils/logger';
import '../../AlbumsManager.css'; // For toggle switch styles


interface VideoOptimizationSectionProps {
  config: ConfigData | null;
  originalConfig: ConfigData | null;
  setConfig: (config: ConfigData) => void;
  setOriginalConfig: (config: ConfigData) => void;
  savingSection: string | null;
  setSavingSection: (section: string | null) => void;
  setMessage: (message: { type: "success" | "error"; text: string }) => void;
  onNavigateToAdvanced: () => void;
}

const VideoOptimizationSection: React.FC<VideoOptimizationSectionProps> = ({
  config,
  originalConfig,
  setConfig,
  setOriginalConfig,
  savingSection,
  setSavingSection,
  setMessage,
  onNavigateToAdvanced,
}) => {
  const { t } = useTranslation();
  const [showVideoOptimization, setShowVideoOptimization] = useState(false);

  const updateConfig = (path: string[], value: any) => {
    if (!config) return;

    console.log('[VideoOptimization] updateConfig called:', {
      path,
      value,
      currentConfig: config.environment?.optimization?.video
    });

    // Deep clone the config to avoid mutation issues
    const newConfig = JSON.parse(JSON.stringify(config));
    
    // Special handling: if we're updating resolutions but they don't exist yet,
    // initialize them with defaultResolutions first
    if (path.includes('resolutions') && !newConfig.environment?.optimization?.video?.resolutions) {
      console.log('[VideoOptimization] Initializing resolutions with defaults before update');
      if (!newConfig.environment) newConfig.environment = {};
      if (!newConfig.environment.optimization) newConfig.environment.optimization = {};
      if (!newConfig.environment.optimization.video) newConfig.environment.optimization.video = {};
      newConfig.environment.optimization.video.resolutions = JSON.parse(JSON.stringify(defaultResolutions));
    }
    
    let current: any = newConfig;

    for (let i = 0; i < path.length - 1; i++) {
      // Ensure the path exists
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }

    current[path[path.length - 1]] = value;
    
    console.log('[VideoOptimization] After update:', {
      newVideoConfig: newConfig.environment?.optimization?.video,
      updatedPath: path.join('.'),
      updatedValue: value
    });

    setConfig(newConfig);
  };

  const handleSaveSection = async (sectionName: string) => {
    if (!config) return;

    setSavingSection(sectionName);

    try {
      const res = await fetch(`${API_URL}/api/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(config),
      });

      if (res.ok) {
        trackConfigSettingsSaved(sectionName);
        
        setMessage({ type: "success", text: t('settings.saved', { section: sectionName }) });
        setOriginalConfig(structuredClone(config));
      } else {
        const errorData = await res
          .json()
          .catch(() => ({ error: t('common.unknownError') }));
        setMessage({
          type: "error",
          text: errorData.error || t('settings.failedToSave'),
        });
      }
    } catch (err) {
      error("[VideoOptimization] Failed to save config:", err);
      setMessage({
        type: "error",
        text: t('settings.failedToSave'),
      });
    } finally {
      setSavingSection(null);
    }
  };

  // Initialize video config with defaults if not present
  const defaultResolutions = {
    '240p': { enabled: true, height: 240, videoBitrate: '400k', audioBitrate: '64k' },
    '360p': { enabled: true, height: 360, videoBitrate: '800k', audioBitrate: '96k' },
    '720p': { enabled: true, height: 720, videoBitrate: '2500k', audioBitrate: '128k' },
    '1080p': { enabled: true, height: 1080, videoBitrate: '5000k', audioBitrate: '192k' }
  };

  const videoConfig = config?.environment?.optimization?.video;
  const segmentDuration = videoConfig?.segmentDuration || 4;
  const resolutions = videoConfig?.resolutions || defaultResolutions;

  console.log('[VideoOptimization] Render - Current state:', {
    hasVideoConfig: !!videoConfig,
    hasResolutions: !!videoConfig?.resolutions,
    resolutions: resolutions,
    segmentDuration
  });

  // Initialize video config if it doesn't exist (only once on mount)
  useEffect(() => {
    if (config && !config.environment?.optimization?.video) {
      console.log('[VideoOptimization] Initializing video config with defaults');
      updateConfig(['environment', 'optimization', 'video'], {
        segmentDuration: 4,
        resolutions: defaultResolutions
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasVideoChanges = JSON.stringify(config?.environment?.optimization?.video) !== 
                          JSON.stringify(originalConfig?.environment?.optimization?.video);

  return (
    <div className="config-group full-width">
      <SectionHeader
        title={t('videoOptimization.title')}
        description={t('videoOptimization.description')}
        isExpanded={showVideoOptimization}
        onToggle={() => setShowVideoOptimization(!showVideoOptimization)}
      />

      <div
        className={`collapsible-content ${
          showVideoOptimization ? "expanded" : "collapsed"
        }`}
        style={{
          maxHeight: showVideoOptimization ? "10000px" : "0",
        }}
      >
        {/* Grid of optimization subsections */}
        <div className="config-grid-inner">
          
          {/* HLS Settings */}
          <div className="openai-section">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <label className="openai-section-label">{t('videoOptimization.hlsStreaming')}</label>
            </div>
            <p style={{
              fontSize: '0.85rem',
              color: '#888',
              marginTop: '0',
              marginBottom: '1rem',
            }}>
              {t('videoOptimization.hlsDescription')}
            </p>
            <div className="branding-group">
              <label className="branding-label">{t('videoOptimization.segmentDuration')}</label>
              <input
                type="number"
                min="1"
                max="10"
                step="1"
                value={segmentDuration}
                onChange={(e) => updateConfig(['environment', 'optimization', 'video', 'segmentDuration'], parseInt(e.target.value))}
                className="branding-input"
              />
              <p style={{
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.5)',
                marginTop: '0.5rem',
                marginBottom: '0',
              }}>
                {t('videoOptimization.segmentDurationHelp')}
              </p>
            </div>
          </div>

          {/* Warning Note */}
          <div className="openai-section">
            <div style={{
              padding: '1rem',
              background: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              borderRadius: '8px',
              fontSize: '0.875rem',
              color: 'rgba(255, 193, 7, 0.9)',
              height: 'fit-content',
            }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong>⚠️ {t('common.note')}:</strong> {t('videoOptimization.warningNote')}
              </div>
              <button
                onClick={onNavigateToAdvanced}
                className="btn-secondary"
                style={{
                  fontSize: '0.85rem',
                  padding: '0.5rem 0.75rem',
                  width: '100%',
                  background: 'rgba(255, 193, 7, 0.15)',
                  border: '1px solid rgba(255, 193, 7, 0.5)',
                  color: 'rgba(255, 193, 7, 1)',
                }}
              >
                🎯 {t('videoOptimization.forceRegenerate')}
              </button>
            </div>
          </div>

          {/* Video Resolutions */}
          <div className="openai-section" style={{ gridColumn: '1 / -1' }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <label className="openai-section-label">{t('videoOptimization.videoResolutions')}</label>
            </div>
            <p style={{
              fontSize: '0.85rem',
              color: '#888',
              marginTop: '0',
              marginBottom: '1.25rem',
            }}>
              {t('videoOptimization.resolutionsDescription')}
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1rem',
            }}>
            {Object.entries(resolutions).map(([name, res]: [string, any]) => {
              console.log(`[VideoOptimization] Rendering ${name}:`, res);
              return (
              <div key={name} style={{
                background: res.enabled ? 'rgba(74, 222, 128, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${res.enabled ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '8px',
                padding: '1rem',
                transition: 'all 0.3s ease',
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '0.75rem',
                  paddingBottom: res.enabled ? '0.75rem' : '0',
                  borderBottom: res.enabled ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: res.enabled ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                      transition: 'color 0.3s ease',
                    }}>
                      {name}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      color: 'rgba(255, 255, 255, 0.4)',
                      fontWeight: 400,
                    }}>
                      {res.height}p
                    </span>
                  </div>
                  
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={res.enabled}
                      onChange={(e) => updateConfig(
                        ['environment', 'optimization', 'video', 'resolutions', name, 'enabled'],
                        e.target.checked
                      )}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label" style={{ minWidth: '60px' }}>{res.enabled ? t('videoOptimization.on') : t('videoOptimization.off')}</span>
                  </label>
                </div>

                {res.enabled && (
                  <>
                    <div className="branding-group">
                      <label className="branding-label">{t('videoOptimization.videoBitrate')}</label>
                      <input
                        type="text"
                        value={res.videoBitrate || ''}
                        onChange={(e) => {
                          console.log(`[VideoOptimization] Video bitrate change for ${name}:`, e.target.value);
                          updateConfig(
                            ['environment', 'optimization', 'video', 'resolutions', name, 'videoBitrate'],
                            e.target.value
                          );
                        }}
                        className="branding-input"
                        placeholder="2500k"
                      />
                      <p style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.5)',
                        marginTop: '0.25rem',
                        marginBottom: '0',
                      }}>
                        {t('videoOptimization.videoBitrateExample')}
                      </p>
                    </div>

                    <div className="branding-group">
                      <label className="branding-label">{t('videoOptimization.audioBitrate')}</label>
                      <input
                        type="text"
                        value={res.audioBitrate || ''}
                        onChange={(e) => {
                          console.log(`[VideoOptimization] Audio bitrate change for ${name}:`, e.target.value);
                          updateConfig(
                            ['environment', 'optimization', 'video', 'resolutions', name, 'audioBitrate'],
                            e.target.value
                          );
                        }}
                        className="branding-input"
                        placeholder="128k"
                      />
                      <p style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.5)',
                        marginTop: '0.25rem',
                        marginBottom: '0',
                      }}>
                        {t('videoOptimization.audioBitrateExample')}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
            )}
            </div>

            {/* Save and Cancel Buttons - Only show when there are changes */}
            {hasVideoChanges && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '1rem', marginTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <button
                  onClick={() => {
                    if (originalConfig) {
                      setConfig(structuredClone(originalConfig));
                    }
                  }}
                  disabled={savingSection === 'Video Optimization'}
                  className="btn-secondary"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => handleSaveSection('Video Optimization')}
                  disabled={savingSection === 'Video Optimization'}
                  className="btn-primary"
                >
                  {savingSection === 'Video Optimization' ? t('common.saving') : t('common.save')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoOptimizationSection;

