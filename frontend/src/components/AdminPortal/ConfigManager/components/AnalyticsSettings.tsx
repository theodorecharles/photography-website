/**
 * Analytics Settings Component
 */

import React from 'react';
import { API_URL } from '../../../../config';
import { ConfigData } from '../types';
import { PasswordInput } from '../../PasswordInput';


interface AnalyticsSettingsProps {
  config: ConfigData;
  originalConfig: ConfigData;
  setConfig: (config: ConfigData) => void;
  setOriginalConfig: (config: ConfigData) => void;
  updateConfig: (path: string[], value: any) => void;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onCancel: () => void;
  savingSection: string | null;
  setMessage: (message: { type: "success" | "error"; text: string }) => void;
  onOpenObserveSave?: () => void;
}

const AnalyticsSettings: React.FC<AnalyticsSettingsProps> = ({
  config,
  originalConfig,
  setOriginalConfig,
  updateConfig,
  hasUnsavedChanges,
  onCancel,
  savingSection,
  setMessage,
  onOpenObserveSave,
}) => {
  // Handle save with restart modal
  const handleSaveAnalytics = async () => {
    try {
      const res = await fetch(`${API_URL}/api/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(config),
      });

      if (res.ok) {
        // Check if OpenObserve settings changed BEFORE updating originalConfig
        const openObserveChanged = 
          config.analytics.openobserve.enabled !== originalConfig.analytics.openobserve.enabled ||
          config.analytics.openobserve.endpoint !== originalConfig.analytics.openobserve.endpoint ||
          config.analytics.openobserve.organization !== originalConfig.analytics.openobserve.organization ||
          config.analytics.openobserve.username !== originalConfig.analytics.openobserve.username ||
          config.analytics.openobserve.password !== originalConfig.analytics.openobserve.password ||
          config.analytics.openobserve.stream !== originalConfig.analytics.openobserve.stream;
        
        // Update original config to match
        setOriginalConfig(structuredClone(config));
        setMessage({
          type: "success",
          text: "Analytics settings saved!",
        });
        
        // If OpenObserve settings changed, show restart modal
        if (openObserveChanged && onOpenObserveSave) {
          onOpenObserveSave();
        }
      } else {
        const error = await res.json();
        setMessage({
          type: "error",
          text: error.error || "Failed to update setting",
        });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error occurred" });
    }
  };

  return (
    <div className="openai-section" style={{ marginBottom: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <label className="openai-section-label">ANALYTICS</label>
        {hasUnsavedChanges && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
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
              onClick={(e) => {
                e.stopPropagation();
                handleSaveAnalytics();
              }}
              disabled={savingSection !== null}
              className="btn-primary"
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
            >
              {savingSection === "Analytics" ? "Saving..." : "Save"}
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
        Analytics tracking configuration including OpenObserve
        integration
      </p>
      <div className="config-grid-inner">
        <div className="branding-group">
          <label className="branding-label">
            Enable OpenObserve Integration
          </label>
          <div className="ai-toggle-container">
            <div className="ai-toggle-controls">
              <button
                type="button"
                onClick={() => updateConfig(
                  ["analytics", "openobserve", "enabled"],
                  !config.analytics.openobserve.enabled
                )}
                className={`toggle-button ${
                  config.analytics.openobserve.enabled ? "active" : ""
                }`}
                style={{
                  width: "48px",
                  height: "24px",
                  borderRadius: "12px",
                  border: "none",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background-color 0.2s",
                  backgroundColor: config.analytics.openobserve.enabled
                    ? "var(--primary-color)"
                    : "rgba(255, 255, 255, 0.1)",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "2px",
                    left: config.analytics.openobserve.enabled
                      ? "26px"
                      : "2px",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: "white",
                    transition: "left 0.2s",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  }}
                />
              </button>
              <span
                style={{
                  color: config.analytics.openobserve.enabled
                    ? "var(--primary-color)"
                    : "#888",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {config.analytics.openobserve.enabled
                  ? "Enabled"
                  : "Disabled"}
              </span>
            </div>
          </div>
        </div>

        <div className="branding-group">
          <label className="branding-label">Script Path</label>
          <input
            type="text"
            value={config.analytics.scriptPath}
            onChange={(e) =>
              updateConfig(["analytics", "scriptPath"], e.target.value)
            }
            className="branding-input"
            placeholder="/analytics.js"
          />
        </div>

        {config.analytics.openobserve.enabled && (
          <>
            <div className="branding-group">
              <label className="branding-label">
                OpenObserve Endpoint
              </label>
              <input
                type="text"
                value={config.analytics.openobserve.endpoint}
                onChange={(e) =>
                  updateConfig(
                    ["analytics", "openobserve", "endpoint"],
                    e.target.value
                  )
                }
                className="branding-input"
                placeholder="https://api.openobserve.ai"
              />
            </div>

            <div className="branding-group">
              <label className="branding-label">Organization</label>
              <input
                type="text"
                value={config.analytics.openobserve.organization}
                onChange={(e) =>
                  updateConfig(
                    ["analytics", "openobserve", "organization"],
                    e.target.value
                  )
                }
                className="branding-input"
              />
            </div>

            <div className="branding-group">
              <label className="branding-label">Username</label>
              <input
                type="text"
                value={config.analytics.openobserve.username}
                onChange={(e) =>
                  updateConfig(
                    ["analytics", "openobserve", "username"],
                    e.target.value
                  )
                }
                className="branding-input"
              />
            </div>

            <div className="branding-group">
              <label className="branding-label">Password</label>
              <PasswordInput
                value={config.analytics.openobserve.password}
                onChange={(e) =>
                  updateConfig(
                    ["analytics", "openobserve", "password"],
                    e.target.value
                  )
                }
                className="branding-input"
              />
            </div>

            <div className="branding-group">
              <label className="branding-label">Stream</label>
              <input
                type="text"
                value={config.analytics.openobserve.stream}
                onChange={(e) =>
                  updateConfig(
                    ["analytics", "openobserve", "stream"],
                    e.target.value
                  )
                }
                className="branding-input"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsSettings;

