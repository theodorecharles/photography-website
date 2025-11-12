/**
 * OpenAI Section Component
 * Manages OpenAI API configuration and AI title generation
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConfigData } from '../types';
import { PasswordInput } from '../../PasswordInput';
import SectionHeader from '../components/SectionHeader';

const API_URL = import.meta.env.VITE_API_URL || '';

interface OpenAISectionProps {
  config: ConfigData | null;
  originalConfig: ConfigData | null;
  setConfig: (config: ConfigData) => void;
  setOriginalConfig: (config: ConfigData) => void;
  savingSection: string | null;
  setSavingSection: (section: string | null) => void;
  setMessage: (message: { type: "success" | "error"; text: string }) => void;
}

const OpenAISection: React.FC<OpenAISectionProps> = ({
  config,
  originalConfig,
  setConfig,
  setOriginalConfig,
  savingSection,
  setSavingSection,
  setMessage,
}) => {
  const [searchParams] = useSearchParams();
  const [showOpenAI, setShowOpenAI] = useState(false);
  const openAISectionRef = useRef<HTMLDivElement>(null);
  const apiKeyInputRef = useRef<HTMLInputElement>(null);

  // Handle section parameter from URL (e.g., ?section=openai)
  useEffect(() => {
    const section = searchParams.get('section');
    if (!section) return;
    
    setTimeout(() => {
      if (section === 'openai') {
        setShowOpenAI(true);
        setTimeout(() => {
          if (openAISectionRef.current) {
            const yOffset = -100;
            const element = openAISectionRef.current;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: "smooth" });
          }
        }, 300);
      }
    }, 100);
  }, [searchParams]);

  // handleSetupOpenAI removed - handled by parent component now via URL params

  // Automatically disable auto-generate when API key is removed
  useEffect(() => {
    if (
      config &&
      !config.openai?.apiKey &&
      config.ai?.autoGenerateTitlesOnUpload
    ) {
      const newConfig = {
        ...config,
        ai: {
          ...config.ai,
          autoGenerateTitlesOnUpload: false,
        },
      };
      setConfig(newConfig);
    }
  }, [config?.openai?.apiKey]);

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

  // Auto-save handler for AI toggle (like published toggle for albums)
  const handleToggleAutoAI = async () => {
    if (!config) return;

    // Don't allow toggling if no API key is set
    if (!config.openai?.apiKey) {
      setMessage({
        type: "error",
        text: "OpenAI API key is required for auto-generating titles",
      });
      return;
    }

    const newValue = !(config.ai?.autoGenerateTitlesOnUpload || false);

    // Optimistically update UI
    const newConfig = {
      ...config,
      ai: {
        ...config.ai,
        autoGenerateTitlesOnUpload: newValue,
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
          text: `Auto-generate AI titles ${newValue ? "enabled" : "disabled"}`,
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

  // Validate OpenAI API key
  const validateOpenAIKey = async (apiKey: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${API_URL}/api/config/validate-openai-key`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ apiKey }),
        }
      );

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.valid;
    } catch (error) {
      console.error("Error validating OpenAI key:", error);
      return false;
    }
  };

  const handleSaveSection = async () => {
    if (!config) return;

    // Validate OpenAI API key before saving
    if (config.openai?.apiKey) {
      setSavingSection("OpenAI");

      const isValid = await validateOpenAIKey(config.openai.apiKey);

      if (!isValid) {
        setMessage({
          type: "error",
          text: "Invalid OpenAI API key. Please check your key and try again.",
        });
        setSavingSection(null);
        return;
      }
    }

    setSavingSection("OpenAI");

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
        setMessage({ type: "success", text: `OpenAI settings saved!` });
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

  const hasUnsavedChanges = (): boolean => {
    if (!config || !originalConfig) return false;
    // Only check API key, not the auto-generate toggle (which auto-saves)
    return config.openai?.apiKey !== originalConfig.openai?.apiKey;
  };

  if (!config) return null;

  return (
    <div className="config-group full-width" ref={openAISectionRef}>
      <SectionHeader
        title="OpenAI"
        description="Configure AI-powered title generation"
        isExpanded={showOpenAI}
        onToggle={() => setShowOpenAI(!showOpenAI)}
      />

      <div
        className={`collapsible-content ${showOpenAI ? "expanded" : "collapsed"}`}
        style={{
          maxHeight: showOpenAI ? "10000px" : "0",
        }}
      >
        <div className="openai-settings-grid">
          {/* Left: API Key Section */}
          <div className="openai-section">
            <label className="openai-section-label">API KEY</label>
            <PasswordInput
              inputRef={apiKeyInputRef}
              value={config.openai?.apiKey || ""}
              onChange={(e) =>
                updateConfig(["openai", "apiKey"], e.target.value)
              }
              className="branding-input"
              placeholder="sk-..."
            />

            {/* Save/Cancel buttons */}
            {hasUnsavedChanges() && (
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginTop: "0.5rem",
                }}
              >
                <button
                  type="button"
                  onClick={handleSaveSection}
                  disabled={savingSection !== null}
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  {savingSection === "OpenAI" ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfig(originalConfig!);
                  }}
                  disabled={savingSection !== null}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Right: Auto-generate Toggle Section */}
          <div className="openai-section">
            <label className="openai-section-label">
              Auto-generate AI Titles on Upload
            </label>
            <div className="ai-toggle-container">
              <div className="ai-toggle-controls">
                <button
                  type="button"
                  onClick={handleToggleAutoAI}
                  disabled={!config.openai?.apiKey}
                  title={
                    !config.openai?.apiKey
                      ? "OpenAI API key is required"
                      : ""
                  }
                  className={`toggle-button ${
                    config.ai?.autoGenerateTitlesOnUpload ? "active" : ""
                  }`}
                  style={{
                    width: "48px",
                    height: "24px",
                    borderRadius: "12px",
                    border: "none",
                    cursor: config.openai?.apiKey
                      ? "pointer"
                      : "not-allowed",
                    position: "relative",
                    transition: "background-color 0.2s",
                    backgroundColor: config.ai?.autoGenerateTitlesOnUpload
                      ? "var(--primary-color)"
                      : "rgba(255, 255, 255, 0.1)",
                    opacity: config.openai?.apiKey ? 1 : 0.5,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: "2px",
                      left: config.ai?.autoGenerateTitlesOnUpload
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
                    color: config.ai?.autoGenerateTitlesOnUpload
                      ? "var(--primary-color)"
                      : "#888",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    opacity: config.openai?.apiKey ? 1 : 0.5,
                    flexShrink: 0,
                  }}
                >
                  {config.ai?.autoGenerateTitlesOnUpload
                    ? "Enabled"
                    : "Disabled"}
                </span>
              </div>
            </div>
            {!config.openai?.apiKey && (
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#fbbf24",
                  marginTop: "0.5rem",
                  marginBottom: 0,
                }}
              >
                ⚠️ API key required to enable auto-generation
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpenAISection;
