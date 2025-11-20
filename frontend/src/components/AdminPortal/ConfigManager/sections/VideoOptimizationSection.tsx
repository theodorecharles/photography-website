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


interface VideoOptimizationSectionProps {
  config: ConfigData | null;
  originalConfig: ConfigData | null;
  setConfig: (config: ConfigData) => void;
  setOriginalConfig: (config: ConfigData) => void;
  savingSection: string | null;
  setSavingSection: (section: string | null) => void;
  setMessage: (message: { type: "success" | "error"; text: string }) => void;
}

const VideoOptimizationSection: React.FC<VideoOptimizationSectionProps> = ({
  config,
  originalConfig,
  setConfig,
  setOriginalConfig,
  savingSection,
  setSavingSection,
  setMessage,
}) => {
  const { t } = useTranslation();
  const [showVideoOptimization, setShowVideoOptimization] = useState(false);

  const updateConfig = (path: string[], value: any) => {
    if (!config) return;

    const newConfig = { ...config };
    let current: any = newConfig;

    for (let i = 0; i < path.length - 1; i++) {
      // Ensure the path exists and is properly copied
      if (!current[path[i]]) {
        current[path[i]] = {};
      } else {
        current[path[i]] = { ...current[path[i]] };
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

  // Initialize video config if it doesn't exist (only once on mount)
  useEffect(() => {
    if (config && !config.environment?.optimization?.video) {
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
    <>
      <SectionHeader
        title="Video Optimization"
        description="Configure video quality, streaming, and HLS settings"
        isExpanded={showVideoOptimization}
        onToggle={() => setShowVideoOptimization(!showVideoOptimization)}
      />

      {showVideoOptimization && config && (
        <div style={{ marginTop: '1rem' }}>
          
          {/* Segment Duration */}
          <div style={{ marginBottom: '2rem' }}>
            <label className="branding-label">
              HLS Segment Duration (seconds)
            </label>
            <p style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '0.75rem',
              marginTop: '0.25rem',
            }}>
              Length of each video segment. Longer segments (4-6s) reduce server requests and improve streaming performance.
            </p>
            <input
              type="number"
              min="1"
              max="10"
              step="1"
              value={segmentDuration}
              onChange={(e) => updateConfig(['environment', 'optimization', 'video', 'segmentDuration'], parseInt(e.target.value))}
              className="branding-input"
              style={{ width: '100px' }}
            />
          </div>

          {/* Resolution Settings */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: '#fff',
              marginBottom: '0.75rem',
            }}>
              Video Resolutions
            </h4>
            <p style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '1rem',
            }}>
              Configure which resolutions to generate and their quality settings. Higher bitrates improve quality but increase file size.
            </p>

            {Object.entries(resolutions).map(([name, res]: [string, any]) => (
              <div key={name} style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                  }}>
                    <input
                      type="checkbox"
                      checked={res.enabled}
                      onChange={(e) => updateConfig(
                        ['environment', 'optimization', 'video', 'resolutions', name, 'enabled'],
                        e.target.checked
                      )}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    {name} ({res.height}p)
                  </label>
                </div>

                {res.enabled && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                  }}>
                    <div>
                      <label className="branding-label" style={{ fontSize: '0.85rem' }}>
                        Video Bitrate
                      </label>
                      <input
                        type="text"
                        value={res.videoBitrate}
                        onChange={(e) => updateConfig(
                          ['environment', 'optimization', 'video', 'resolutions', name, 'videoBitrate'],
                          e.target.value
                        )}
                        className="branding-input"
                        placeholder="2500k"
                      />
                    </div>

                    <div>
                      <label className="branding-label" style={{ fontSize: '0.85rem' }}>
                        Audio Bitrate
                      </label>
                      <input
                        type="text"
                        value={res.audioBitrate}
                        onChange={(e) => updateConfig(
                          ['environment', 'optimization', 'video', 'resolutions', name, 'audioBitrate'],
                          e.target.value
                        )}
                        className="branding-input"
                        placeholder="128k"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <button
              onClick={() => handleSaveSection('Video Optimization')}
              disabled={!hasVideoChanges || savingSection === 'Video Optimization'}
              className="btn-primary"
              style={{
                opacity: !hasVideoChanges || savingSection === 'Video Optimization' ? 0.5 : 1,
                cursor: !hasVideoChanges || savingSection === 'Video Optimization' ? 'not-allowed' : 'pointer',
              }}
            >
              {savingSection === 'Video Optimization' ? t('common.saving') : t('common.saveChanges')}
            </button>
          </div>

          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: 'rgba(255, 193, 7, 0.9)',
          }}>
            <strong>⚠️ Note:</strong> Changes to video settings only apply to newly uploaded videos. 
            Existing videos will keep their current quality settings. To regenerate existing videos with new settings, 
            you'll need to re-upload them or run a video reprocessing script.
          </div>
        </div>
      )}
    </>
  );
};

export default VideoOptimizationSection;

