/**
 * Image Optimization Section Component
 * Manages image quality and optimization settings
 */

import React, { useState } from 'react';
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
  const [showImageOptimization, setShowImageOptimization] = useState(false);

  const updateConfig = (path: string[], value: any) => {
    if (!config) return;

    const newConfig = { ...config };
    let current: any = newConfig;

    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = { ...current[path[i]] };
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
        
        setMessage({ type: "success", text: `${sectionName} settings saved!` });
        // Update original config after successful save
        setOriginalConfig(structuredClone(config));
      } else {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Unknown error" }));
        setMessage({
          type: "error",
          text: errorData.error || "Failed to save configuration",
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error saving configuration";
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
        title="Image Optimization"
        description="Optimize and manage image processing"
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
              <label className="openai-section-label">THUMBNAIL</label>
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
                    Cancel
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
                    {savingSection === "Thumbnail" ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>
            <div className="branding-group">
              <label className="branding-label">Quality</label>
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
              <label className="branding-label">Max Dimension</label>
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
              <label className="openai-section-label">MODAL</label>
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
                    Cancel
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
                    {savingSection === "Modal" ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>
            <div className="branding-group">
              <label className="branding-label">Quality</label>
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
              <label className="branding-label">Max Dimension</label>
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
              <label className="openai-section-label">DOWNLOAD</label>
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
                    Cancel
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
                    {savingSection === "Download" ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>
            <div className="branding-group">
              <label className="branding-label">Quality</label>
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
              <label className="branding-label">Max Dimension</label>
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
              <label className="openai-section-label">CONCURRENCY</label>
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
                    Cancel
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
                    {savingSection === "Concurrency" ? "Saving..." : "Save"}
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
              Maximum number of images to process simultaneously. Higher
              values speed up batch processing but use more CPU and memory.
            </p>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#888",
                marginTop: "0",
                marginBottom: "1rem",
              }}
            >
              Rule of thumb: ~4× your logical CPU cores. Recommended: 8-16
              for typical systems, 32-64 for high-performance servers.
            </p>
            <div className="branding-group">
              <label className="branding-label">Max Parallel Jobs</label>
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
        </div>
      </div>
    </div>
  );
};

export default ImageOptimizationSection;
