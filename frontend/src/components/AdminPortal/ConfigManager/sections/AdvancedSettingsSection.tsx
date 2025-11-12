/**
 * Advanced Settings Section Component
 * Contains backend, frontend, security, auth, analytics settings, and regeneration operations
 */

import React, { useState } from 'react';
import { ConfigData } from '../types';
import { PasswordInput } from '../../PasswordInput';
import SectionHeader from '../components/SectionHeader';

const API_URL = import.meta.env.VITE_API_URL || '';

interface AdvancedSettingsSectionProps {
  config: ConfigData | null;
  originalConfig: ConfigData | null;
  setConfig: (config: ConfigData) => void;
  setOriginalConfig: (config: ConfigData) => void;
  savingSection: string | null;
  setSavingSection: (section: string | null) => void;
  setMessage: (message: { type: "success" | "error"; text: string }) => void;
  hasMissingTitles: boolean;
  optimizationComplete: boolean;
  // SSE state
  generatingTitles: boolean;
  isOptimizationRunning: boolean;
  // Actions
  onGenerateTitles: (forceRegenerate: boolean) => void;
  onStopTitles: () => void;
  onRunOptimization: (force: boolean) => void;
  onStopOptimization: () => void;
  onSetupOpenAI: () => void;
  showConfirmation: (message: string) => Promise<boolean>;
}

const AdvancedSettingsSection: React.FC<AdvancedSettingsSectionProps> = ({
  config,
  originalConfig,
  setConfig,
  setOriginalConfig,
  savingSection,
  setSavingSection,
  setMessage,
  hasMissingTitles,
  optimizationComplete,
  generatingTitles,
  isOptimizationRunning,
  onGenerateTitles,
  onStopTitles,
  onRunOptimization,
  onStopOptimization,
  onSetupOpenAI,
  showConfirmation,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [restartingBackend, setRestartingBackend] = useState(false);
  const [restartingFrontend, setRestartingFrontend] = useState(false);

  const isAnyJobRunning = generatingTitles || isOptimizationRunning;

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

  const updateArrayItem = (path: string[], index: number, value: string) => {
    if (!config) return;

    const newConfig = { ...config };
    let current: any = newConfig;

    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = { ...current[path[i]] };
      current = current[path[i]];
    }

    const array = [...current[path[path.length - 1]]];
    array[index] = value;
    current[path[path.length - 1]] = array;
    setConfig(newConfig);
  };

  const addArrayItem = (path: string[]) => {
    if (!config) return;

    const newConfig = { ...config };
    let current: any = newConfig;

    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = { ...current[path[i]] };
      current = current[path[i]];
    }

    const array = [...current[path[path.length - 1]]];
    array.push("");
    current[path[path.length - 1]] = array;
    setConfig(newConfig);
  };

  const removeArrayItem = (path: string[], index: number) => {
    if (!config) return;

    const newConfig = { ...config };
    let current: any = newConfig;

    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = { ...current[path[i]] };
      current = current[path[i]];
    }

    const array = [...current[path[path.length - 1]]];
    array.splice(index, 1);
    current[path[path.length - 1]] = array;
    setConfig(newConfig);
  };

  // Auto-save handler for OpenObserve toggle
  const handleToggleOpenObserve = async () => {
    if (!config) return;

    const newValue = !config.analytics.openobserve.enabled;

    // Optimistically update UI
    const newConfig = {
      ...config,
      analytics: {
        ...config.analytics,
        openobserve: {
          ...config.analytics.openobserve,
          enabled: newValue,
        },
      },
    };
    setConfig(newConfig);

    try {
      const res = await fetch(`${API_URL}/api/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newConfig),
      });

      if (res.ok) {
        // Update original config to match
        setOriginalConfig(structuredClone(newConfig));
        setMessage({
          type: "success",
          text: `OpenObserve integration ${newValue ? "enabled" : "disabled"}`,
        });
      } else {
        const error = await res.json();
        setMessage({
          type: "error",
          text: error.error || "Failed to update setting",
        });
        // Revert on error
        setConfig(config);
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error occurred" });
      // Revert on error
      setConfig(config);
    }
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
      console.error("Failed to save config:", err);
    } finally {
      setSavingSection(null);
    }
  };

  const handleRestartBackend = async () => {
    const confirmed = await showConfirmation(
      "⚠️ Restart the backend server? This will temporarily disconnect all users."
    );
    if (!confirmed) return;

    setRestartingBackend(true);

    try {
      const res = await fetch(`${API_URL}/api/system/restart/backend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (res.ok) {
        setMessage({
          type: "success",
          text: "Backend server restarting... Please wait 5-10 seconds and refresh the page.",
        });
      } else {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Unknown error" }));
        setMessage({
          type: "error",
          text: errorData.error || "Failed to restart backend",
        });
      }
    } catch (err) {
      // Expected error since server is restarting
      setMessage({
        type: "success",
        text: "Backend server restarting... Please wait 5-10 seconds and refresh the page.",
      });
    } finally {
      setRestartingBackend(false);
    }
  };

  const handleRestartFrontend = async () => {
    const confirmed = await showConfirmation(
      "⚠️ Restart the frontend server? This requires manual restart if in development mode."
    );
    if (!confirmed) return;

    setRestartingFrontend(true);

    try {
      const res = await fetch(`${API_URL}/api/system/restart/frontend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ type: "success", text: data.message });
      } else {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Unknown error" }));
        setMessage({
          type: "error",
          text: errorData.error || "Failed to restart frontend",
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Network error occurred";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setRestartingFrontend(false);
    }
  };

  const hasUnsavedChanges = (sectionName: string): boolean => {
    if (!config || !originalConfig) return false;

    switch (sectionName) {
      case "Backend":
        return (
          JSON.stringify(config.environment.backend) !==
          JSON.stringify(originalConfig.environment.backend)
        );
      case "Frontend":
        return (
          JSON.stringify(config.environment.frontend) !==
          JSON.stringify(originalConfig.environment.frontend)
        );
      case "Security":
        return (
          JSON.stringify(config.environment.security) !==
          JSON.stringify(originalConfig.environment.security)
        );
      case "Authentication":
        return (
          JSON.stringify(config.environment.auth) !==
          JSON.stringify(originalConfig.environment.auth)
        );
      case "Analytics":
        return (
          JSON.stringify(config.analytics) !==
          JSON.stringify(originalConfig.analytics)
        );
      default:
        return false;
    }
  };

  if (!config) return null;

  return (
    <div className="config-group full-width">
      <SectionHeader
        title="Advanced Settings"
        description="System controls and developer options"
        isExpanded={showAdvanced}
        onToggle={() => setShowAdvanced(!showAdvanced)}
      />

      <div
        className={`collapsible-content ${showAdvanced ? "expanded" : "collapsed"}`}
        style={{
          maxHeight: showAdvanced ? "10000px" : "0",
        }}
      >
        {/* Danger Zone Warning */}
        <div
          style={{
            marginBottom: "2rem",
            padding: "1rem 1.5rem",
            background:
              "linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(153, 27, 27, 0.15) 100%)",
            border: "2px solid rgba(220, 38, 38, 0.5)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>⚠️</span>
          <div>
            <div
              style={{
                color: "#fca5a5",
                fontWeight: 700,
                fontSize: "1rem",
                letterSpacing: "0.1em",
                marginBottom: "0.25rem",
              }}
            >
              [ DANGER ZONE ]
            </div>
            <div style={{ color: "#fecaca", fontSize: "0.9rem" }}>
              Make sure you know what you're doing!
            </div>
          </div>
        </div>

        {/* Title Generation and Optimized Images Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "2rem",
            marginBottom: "2rem",
          }}
          className="regenerate-sections-grid"
        >
          {/* Force Regenerate All Titles */}
          <div className="openai-section" style={{ marginBottom: "0" }}>
            <label
              className="openai-section-label"
              style={{ display: "block", marginBottom: "0.75rem" }}
            >
              TITLE GENERATION
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "stretch",
                gap: "0.75rem",
                flexWrap: "wrap",
                marginBottom: "0.75rem",
              }}
            >
              {!config.openai?.apiKey ? (
                <button
                  type="button"
                  onClick={onSetupOpenAI}
                  className="btn-secondary"
                  style={{ flex: "1 1 auto", minWidth: "200px" }}
                  disabled={isOptimizationRunning}
                >
                  Set Up OpenAI
                </button>
              ) : !generatingTitles ? (
                <>
                  {hasMissingTitles && (
                    <button
                      type="button"
                      onClick={() => {
                        onGenerateTitles(false);
                      }}
                      className="btn-secondary"
                      style={{ flex: "1 1 auto", minWidth: "200px" }}
                      disabled={isAnyJobRunning}
                    >
                      Backfill Missing Titles
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      const confirmed = await showConfirmation(
                        "⚠️ This will regenerate ALL image titles and overwrite any custom titles you have set. This action cannot be undone.\n\nAre you sure you want to continue?"
                      );
                      if (confirmed) {
                        onGenerateTitles(true);
                      }
                    }}
                    className="btn-force-regenerate"
                    style={{ flex: "1 1 auto", minWidth: "200px" }}
                    disabled={isOptimizationRunning}
                  >
                    Force Regenerate All
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onStopTitles}
                  className="btn-force-regenerate"
                  style={{
                    backgroundColor: "#dc2626",
                    borderColor: "#dc2626",
                    flex: "1 1 auto",
                    minWidth: "200px",
                  }}
                >
                  Stop
                </button>
              )}
            </div>
          </div>

          {/* Optimized Images */}
          <div className="openai-section" style={{ marginBottom: "0" }}>
            <label
              className="openai-section-label"
              style={{ display: "block", marginBottom: "0.75rem" }}
            >
              OPTIMIZED IMAGES
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
                marginBottom: "0.75rem",
              }}
            >
              {!isOptimizationRunning ? (
                <button
                  type="button"
                  onClick={() => onRunOptimization(true)}
                  className="btn-force-regenerate"
                  style={{ flex: "1 1 auto", minWidth: "200px" }}
                  disabled={generatingTitles}
                >
                  Force Regenerate All
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStopOptimization}
                  className="btn-force-regenerate"
                  style={{
                    backgroundColor: "#dc2626",
                    borderColor: "#dc2626",
                    flex: "1 1 auto",
                    minWidth: "200px",
                  }}
                >
                  Stop
                </button>
              )}
              {optimizationComplete && !isOptimizationRunning && (
                <span
                  style={{
                    color: "var(--primary-color)",
                    fontSize: "1.5rem",
                  }}
                >
                  ✓
                </span>
              )}
            </div>
          </div>
        </div>
        {/* End Title Generation and Optimized Images Grid */}

        {/* Backend Settings */}
        <div className="openai-section" style={{ marginBottom: "2rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <label className="openai-section-label">BACKEND</label>
            {hasUnsavedChanges("Backend") && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveSection("Backend");
                  }}
                  disabled={savingSection !== null}
                  className="btn-primary"
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                >
                  {savingSection === "Backend" ? "Saving..." : "Save"}
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
            Server configuration including port, photos directory, and CORS
            allowed origins
          </p>
          <div className="config-grid-inner">
            <div className="branding-group">
              <label className="branding-label">Port</label>
              <input
                type="number"
                value={config.environment.backend.port}
                onChange={(e) =>
                  updateConfig(
                    ["environment", "backend", "port"],
                    parseInt(e.target.value)
                  )
                }
                className="branding-input"
              />
            </div>

            <div className="branding-group">
              <label className="branding-label">Photos Directory</label>
              <input
                type="text"
                value={config.environment.backend.photosDir}
                onChange={(e) =>
                  updateConfig(
                    ["environment", "backend", "photosDir"],
                    e.target.value
                  )
                }
                className="branding-input"
              />
            </div>

            <div className="branding-group full-width">
              <label className="branding-label">Allowed Origins</label>
              {config.environment.backend.allowedOrigins.map(
                (origin, index) => (
                  <div key={index} className="array-item">
                    <input
                      type="text"
                      value={origin}
                      onChange={(e) =>
                        updateArrayItem(
                          ["environment", "backend", "allowedOrigins"],
                          index,
                          e.target.value
                        )
                      }
                      className="branding-input"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        removeArrayItem(
                          ["environment", "backend", "allowedOrigins"],
                          index
                        )
                      }
                      className="btn-remove"
                    >
                      ×
                    </button>
                  </div>
                )
              )}
              <button
                type="button"
                onClick={() =>
                  addArrayItem(["environment", "backend", "allowedOrigins"])
                }
                className="btn-add"
              >
                + Add Origin
              </button>
            </div>
          </div>

          {/* Backend Restart Button */}
          <div
            style={{
              marginTop: "1rem",
              paddingTop: "1rem",
              borderTop: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            <button
              type="button"
              onClick={handleRestartBackend}
              disabled={restartingBackend}
              className="btn-secondary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              🔄{" "}
              {restartingBackend
                ? "Restarting..."
                : "Restart Backend Server"}
            </button>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#888",
                marginTop: "0.5rem",
                marginBottom: 0,
              }}
            >
              Server will restart automatically if using a process manager
              (pm2, nodemon, systemd)
            </p>
          </div>
        </div>

        {/* Frontend Settings */}
        <div className="openai-section" style={{ marginBottom: "2rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <label className="openai-section-label">FRONTEND</label>
            {hasUnsavedChanges("Frontend") && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveSection("Frontend");
                  }}
                  disabled={savingSection !== null}
                  className="btn-primary"
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                >
                  {savingSection === "Frontend" ? "Saving..." : "Save"}
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
            Frontend development server port and API URL for connecting to
            the backend
          </p>
          <div className="config-grid-inner">
            <div className="branding-group">
              <label className="branding-label">Port</label>
              <input
                type="number"
                value={config.environment.frontend.port}
                onChange={(e) =>
                  updateConfig(
                    ["environment", "frontend", "port"],
                    parseInt(e.target.value)
                  )
                }
                className="branding-input"
              />
            </div>

            <div className="branding-group">
              <label className="branding-label">API URL</label>
              <input
                type="text"
                value={config.environment.frontend.apiUrl}
                onChange={(e) =>
                  updateConfig(
                    ["environment", "frontend", "apiUrl"],
                    e.target.value
                  )
                }
                className="branding-input"
              />
            </div>
          </div>

          {/* Frontend Restart Button */}
          <div
            style={{
              marginTop: "1rem",
              paddingTop: "1rem",
              borderTop: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            <button
              type="button"
              onClick={handleRestartFrontend}
              disabled={restartingFrontend}
              className="btn-secondary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              🔄{" "}
              {restartingFrontend
                ? "Restarting..."
                : "Restart Frontend Server"}
            </button>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#888",
                marginTop: "0.5rem",
                marginBottom: 0,
              }}
            >
              In development, manually restart your dev server. In
              production, use your process manager.
            </p>
          </div>
        </div>

        {/* Security Settings */}
        <div className="openai-section" style={{ marginBottom: "2rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <label className="openai-section-label">SECURITY</label>
            {hasUnsavedChanges("Security") && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveSection("Security");
                  }}
                  disabled={savingSection !== null}
                  className="btn-primary"
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                >
                  {savingSection === "Security" ? "Saving..." : "Save"}
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
            Rate limiting and allowed hosts for protecting against abuse and
            unauthorized access
          </p>
          <div className="config-grid-inner">
            <div className="branding-group">
              <label className="branding-label">
                Rate Limit Window (ms)
              </label>
              <input
                type="number"
                value={config.environment.security.rateLimitWindowMs}
                onChange={(e) =>
                  updateConfig(
                    ["environment", "security", "rateLimitWindowMs"],
                    parseInt(e.target.value)
                  )
                }
                className="branding-input"
              />
            </div>

            <div className="branding-group">
              <label className="branding-label">
                Rate Limit Max Requests
              </label>
              <input
                type="number"
                value={config.environment.security.rateLimitMaxRequests}
                onChange={(e) =>
                  updateConfig(
                    ["environment", "security", "rateLimitMaxRequests"],
                    parseInt(e.target.value)
                  )
                }
                className="branding-input"
              />
            </div>

            <div className="branding-group full-width">
              <label className="branding-label">Allowed Hosts</label>
              {config.environment.security.allowedHosts.map(
                (host, index) => (
                  <div key={index} className="array-item">
                    <input
                      type="text"
                      value={host}
                      onChange={(e) =>
                        updateArrayItem(
                          ["environment", "security", "allowedHosts"],
                          index,
                          e.target.value
                        )
                      }
                      className="branding-input"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        removeArrayItem(
                          ["environment", "security", "allowedHosts"],
                          index
                        )
                      }
                      className="btn-remove"
                    >
                      ×
                    </button>
                  </div>
                )
              )}
              <button
                type="button"
                onClick={() =>
                  addArrayItem(["environment", "security", "allowedHosts"])
                }
                className="btn-add"
              >
                + Add Host
              </button>
            </div>
          </div>
        </div>

        {/* Auth Settings */}
        <div className="openai-section" style={{ marginBottom: "2rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <label className="openai-section-label">AUTHENTICATION</label>
            {hasUnsavedChanges("Authentication") && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveSection("Authentication");
                  }}
                  disabled={savingSection !== null}
                  className="btn-primary"
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                >
                  {savingSection === "Authentication"
                    ? "Saving..."
                    : "Save"}
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
            Google OAuth credentials and authorized email addresses for
            admin access
          </p>
          <div className="config-grid-inner">
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="branding-group" style={{ margin: 0 }}>
                <label className="branding-label">Google Client ID</label>
                <input
                  type="text"
                  value={config.environment.auth.google.clientId}
                  onChange={(e) =>
                    updateConfig(
                      ["environment", "auth", "google", "clientId"],
                      e.target.value
                    )
                  }
                  className="branding-input"
                />
              </div>

              <div className="branding-group" style={{ margin: 0 }}>
                <label className="branding-label">Google Client Secret</label>
                <PasswordInput
                  value={config.environment.auth.google.clientSecret}
                  onChange={(e) =>
                    updateConfig(
                      ["environment", "auth", "google", "clientSecret"],
                      e.target.value
                    )
                  }
                  className="branding-input"
                />
              </div>

              <div className="branding-group" style={{ margin: 0 }}>
                <label className="branding-label">Session Secret</label>
                <PasswordInput
                  value={config.environment.auth.sessionSecret}
                  onChange={(e) =>
                    updateConfig(
                      ["environment", "auth", "sessionSecret"],
                      e.target.value
                    )
                  }
                  className="branding-input"
                />
              </div>
            </div>

            <div className="branding-group" style={{ margin: 0 }}>
              <label className="branding-label">Authorized Emails</label>
              {config.environment.auth.authorizedEmails.map(
                (email, index) => (
                  <div key={index} className="array-item">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) =>
                        updateArrayItem(
                          ["environment", "auth", "authorizedEmails"],
                          index,
                          e.target.value
                        )
                      }
                      className="branding-input"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        removeArrayItem(
                          ["environment", "auth", "authorizedEmails"],
                          index
                        )
                      }
                      className="btn-remove"
                    >
                      ×
                    </button>
                  </div>
                )
              )}
              <button
                type="button"
                onClick={() =>
                  addArrayItem(["environment", "auth", "authorizedEmails"])
                }
                className="btn-add"
              >
                + Add Email
              </button>
            </div>
          </div>
        </div>

        {/* Analytics Settings */}
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
            {hasUnsavedChanges("Analytics") && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveSection("Analytics");
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
                    onClick={handleToggleOpenObserve}
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
      </div>
    </div>
  );
};

export default AdvancedSettingsSection;
