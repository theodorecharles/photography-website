/**
 * Image Optimization Section Component
 * Manages image quality and optimization settings
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../../../config';
import { ConfigData } from '../types';
import { trackConfigSettingsSaved } from '../../../../utils/analytics';
import SectionHeader from '../components/SectionHeader';
import { error } from '../../../../utils/logger';


interface ImageOptimizationSectionProps {
  config: ConfigData | null;
  originalConfig: ConfigData | null;
  setConfig: (config: ConfigData) => void;
  setOriginalConfig: (config: ConfigData) => void;
  savingSection: string | null;
  setSavingSection: (section: string | null) => void;
  setMessage: (message: { type: "success" | "error"; text: string }) => void;
}

const ImageOptimizationSection: React.FC<ImageOptimizationSectionProps> = ({
  config,
  originalConfig,
  setConfig,
  setOriginalConfig,
  savingSection,
  setSavingSection,
  setMessage,
}) => {
  const { t } = useTranslation();
  const [showImageOptimization, setShowImageOptimization] = useState(false);

  const updateConfig = (path: string[], value: any) => {
    if (!config) return;

    // Deep clone the config to avoid mutation issues
    const newConfig = JSON.parse(JSON.stringify(config));
    let current: any = newConfig;

    for (let i = 0; i < path.length - 1; i++) {
      // Ensure the path exists
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
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(config),
      });

      if (res.ok) {
        // Track config settings save
        trackConfigSettingsSaved(sectionName);
        
        setMessage({ type: "success", text: t('settings.saved', { section: sectionName }) });
        // Update original config after successful save
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
      const errorMessage =
        err instanceof Error ? err.message : t('settings.errorSaving');
      setMessage({ type: "error", text: errorMessage });
      error("Failed to save config:", err);
    } finally {
      setSavingSection(null);
    }
  };

  const hasUnsavedChanges = (sectionName: string): boolean => {
    if (!config || !originalConfig) return false;

    switch (sectionName) {
      case "Thumbnail":
        return (
          JSON.stringify(config.environment.optimization.images.thumbnail) !==
          JSON.stringify(originalConfig.environment.optimization.images.thumbnail)
        );
      case "Modal":
        return (
          JSON.stringify(config.environment.optimization.images.modal) !==
          JSON.stringify(originalConfig.environment.optimization.images.modal)
        );
      case "Download":
        return (
          JSON.stringify(config.environment.optimization.images.download) !==
          JSON.stringify(originalConfig.environment.optimization.images.download)
        );
      case "Concurrency":
        return (
          config.environment.optimization.concurrency !==
          originalConfig.environment.optimization.concurrency
        );
      default:
        return false;
    }
  };

  if (!config) return null;

  return (
    <div className="config-group full-width">
      <SectionHeader
        title={t('imageOptimization.title')}
        description={t('imageOptimization.description')}
        isExpanded={showImageOptimization}
        onToggle={() => setShowImageOptimization(!showImageOptimization)}
      />

      <div
        className={`collapsible-content ${
          showImageOptimization ? "expanded" : "collapsed"
        }`}
        style={{
          maxHeight: showImageOptimization ? "10000px" : "0",
        }}
      >
        {/* Grid of optimization subsections */}
        <div className="config-grid-inner">
          {/* Thumbnail Settings */}
          <div className="openai-section">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <label className="openai-section-label">{t('imageOptimization.thumbnail')}</label>
              {hasUnsavedChanges("Thumbnail") && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setConfig(originalConfig!);
                    }}
                    disabled={savingSection !== null}
                    className="btn-secondary"
                    style={{
                      padding: "0.4rem 0.8rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveSection("Thumbnail")}
                    disabled={savingSection !== null}
                    className="btn-primary"
                    style={{
                      padding: "0.4rem 0.8rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    {savingSection === "Thumbnail" ? t('common.saving') : t('common.save')}
                  </button>
                </div>
              )}
            </div>
            <div className="branding-group">
              <label className="branding-label">{t('imageOptimization.quality')}</label>
              <input
                type="number"
                value={
                  config.environment.optimization.images.thumbnail.quality
                }
                onChange={(e) =>
                  updateConfig(
                    [
                      "environment",
                      "optimization",
                      "images",
                      "thumbnail",
                      "quality",
                    ],
                    parseInt(e.target.value)
                  )
                }
                className="branding-input"
                min="1"
                max="100"
              />
            </div>
            <div className="branding-group">
              <label className="branding-label">{t('imageOptimization.maxDimension')}</label>
              <input
                type="number"
                value={
                  config.environment.optimization.images.thumbnail
                    .maxDimension
                }
                onChange={(e) =>
                  updateConfig(
                    [
                      "environment",
                      "optimization",
                      "images",
                      "thumbnail",
                      "maxDimension",
                    ],
                    parseInt(e.target.value)
                  )
                }
                className="branding-input"
              />
            </div>
          </div>

          {/* Modal Settings */}
          <div className="openai-section">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <label className="openai-section-label">{t('imageOptimization.modal')}</label>
              {hasUnsavedChanges("Modal") && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setConfig(originalConfig!);
                    }}
                    disabled={savingSection !== null}
                    className="btn-secondary"
                    style={{
                      padding: "0.4rem 0.8rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveSection("Modal")}
                    disabled={savingSection !== null}
                    className="btn-primary"
                    style={{
                      padding: "0.4rem 0.8rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    {savingSection === "Modal" ? t('common.saving') : t('common.save')}
                  </button>
                </div>
              )}
            </div>
            <div className="branding-group">
              <label className="branding-label">{t('imageOptimization.quality')}</label>
              <input
                type="number"
                value={config.environment.optimization.images.modal.quality}
                onChange={(e) =>
                  updateConfig(
                    [
                      "environment",
                      "optimization",
                      "images",
                      "modal",
                      "quality",
                    ],
                    parseInt(e.target.value)
                  )
                }
                className="branding-input"
                min="1"
                max="100"
              />
            </div>
            <div className="branding-group">
              <label className="branding-label">{t('imageOptimization.maxDimension')}</label>
              <input
                type="number"
                value={
                  config.environment.optimization.images.modal.maxDimension
                }
                onChange={(e) =>
                  updateConfig(
                    [
                      "environment",
                      "optimization",
                      "images",
                      "modal",
                      "maxDimension",
                    ],
                    parseInt(e.target.value)
                  )
                }
                className="branding-input"
              />
            </div>
          </div>

          {/* Download Settings */}
          <div className="openai-section">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <label className="openai-section-label">{t('imageOptimization.download')}</label>
              {hasUnsavedChanges("Download") && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setConfig(originalConfig!);
                    }}
                    disabled={savingSection !== null}
                    className="btn-secondary"
                    style={{
                      padding: "0.4rem 0.8rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveSection("Download")}
                    disabled={savingSection !== null}
                    className="btn-primary"
                    style={{
                      padding: "0.4rem 0.8rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    {savingSection === "Download" ? t('common.saving') : t('common.save')}
                  </button>
                </div>
              )}
            </div>
            <div className="branding-group">
              <label className="branding-label">{t('imageOptimization.quality')}</label>
              <input
                type="number"
                value={
                  config.environment.optimization.images.download.quality
                }
                onChange={(e) =>
                  updateConfig(
                    [
                      "environment",
                      "optimization",
                      "images",
                      "download",
                      "quality",
                    ],
                    parseInt(e.target.value)
                  )
                }
                className="branding-input"
                min="1"
                max="100"
              />
            </div>
            <div className="branding-group">
              <label className="branding-label">{t('imageOptimization.maxDimension')}</label>
              <input
                type="number"
                value={
                  config.environment.optimization.images.download
                    .maxDimension
                }
                onChange={(e) =>
                  updateConfig(
                    [
                      "environment",
                      "optimization",
                      "images",
                      "download",
                      "maxDimension",
                    ],
                    parseInt(e.target.value)
                  )
                }
                className="branding-input"
              />
            </div>
          </div>

          {/* Concurrency Settings */}
          <div className="openai-section">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <label className="openai-section-label">{t('imageOptimization.concurrency')}</label>
              {hasUnsavedChanges("Concurrency") && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setConfig(originalConfig!);
                    }}
                    disabled={savingSection !== null}
                    className="btn-secondary"
                    style={{
                      padding: "0.4rem 0.8rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveSection("Concurrency")}
                    disabled={savingSection !== null}
                    className="btn-primary"
                    style={{
                      padding: "0.4rem 0.8rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    {savingSection === "Concurrency" ? t('common.saving') : t('common.save')}
                  </button>
                </div>
              )}
            </div>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#888",
                marginTop: "0",
                marginBottom: "1rem",
              }}
            >
              {t('imageOptimization.concurrencyDescription1')}
            </p>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#888",
                marginTop: "0",
                marginBottom: "1rem",
              }}
            >
              {t('imageOptimization.concurrencyDescription2')}
            </p>
            <div className="branding-group">
              <label className="branding-label">{t('imageOptimization.maxParallelJobs')}</label>
              <input
                type="number"
                value={config.environment.optimization.concurrency}
                onChange={(e) =>
                  updateConfig(
                    ["environment", "optimization", "concurrency"],
                    parseInt(e.target.value)
                  )
                }
                className="branding-input"
                min="1"
                max="256"
              />
            </div>
          </div>

          {/* Warning Note */}
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: 'rgba(255, 193, 7, 0.9)',
          }}>
            <strong>⚠️ {t('common.note')}:</strong> {t('imageOptimization.warningNote')} <strong>{t('imageOptimization.forceRegenerate')}</strong> {t('imageOptimization.warningNoteLocation')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageOptimizationSection;
