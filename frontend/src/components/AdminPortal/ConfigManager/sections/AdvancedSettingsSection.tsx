/**
 * Advanced Settings Section Component
 * Contains backend, frontend, security, auth, analytics settings, and regeneration operations
 */

import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../../../../config';
import { ConfigData } from '../types';
import SectionHeader from '../components/SectionHeader';
import RegenerationControls from '../components/RegenerationControls';
import AuthSettings from '../components/AuthSettings';
import SMTPSettings from '../components/SMTPSettings';
import AnalyticsSettings from '../components/AnalyticsSettings';
import {
  updateConfig as updateConfigHelper,
  updateArrayItem as updateArrayItemHelper,
  addArrayItem as addArrayItemHelper,
  removeArrayItem as removeArrayItemHelper,
} from '../utils/configHelpers';


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
  // SMTP navigation
  scrollToSmtp?: boolean;
  setScrollToSmtp?: (value: boolean) => void;
  sectionRef?: React.RefObject<HTMLDivElement | null>;
  // Restart modal callback
  onOpenObserveSave?: () => void;
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
  onOpenObserveSave,
  onStopTitles,
  onRunOptimization,
  onStopOptimization,
  onSetupOpenAI,
  showConfirmation,
  scrollToSmtp,
  setScrollToSmtp,
  sectionRef,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const smtpSectionRef = useRef<HTMLDivElement>(null);

  // Handle scrollToSmtp trigger from parent
  useEffect(() => {
    if (scrollToSmtp) {
      setShowAdvanced(true);
      setTimeout(() => {
        if (smtpSectionRef.current) {
          const yOffset = -100; // Offset to account for header
          const element = smtpSectionRef.current;
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
        // Reset the trigger
        if (setScrollToSmtp) {
          setScrollToSmtp(false);
        }
      }, 400); // Wait for expansion animation
    }
  }, [scrollToSmtp, setScrollToSmtp]);

  const updateConfig = (path: string[], value: any) => {
    if (!config) return;
    updateConfigHelper(config, setConfig, path, value);
  };

  const updateArrayItem = (path: string[], index: number, value: string) => {
    if (!config) return;
    updateArrayItemHelper(config, setConfig, path, index, value);
  };

  const addArrayItem = (path: string[]) => {
    if (!config) return;
    addArrayItemHelper(config, setConfig, path);
  };

  const removeArrayItem = (path: string[], index: number) => {
    if (!config) return;
    removeArrayItemHelper(config, setConfig, path, index);
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
      case "Email":
        return (
          JSON.stringify((config as any).email) !==
          JSON.stringify((originalConfig as any).email)
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
    <div className="config-group full-width" ref={sectionRef}>
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
            border: "1px solid rgba(220, 38, 38, 0.5)",
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

        {/* Regeneration Controls */}
        <RegenerationControls
          config={config}
          hasMissingTitles={hasMissingTitles}
          optimizationComplete={optimizationComplete}
          generatingTitles={generatingTitles}
          isOptimizationRunning={isOptimizationRunning}
          onGenerateTitles={onGenerateTitles}
          onStopTitles={onStopTitles}
          onRunOptimization={onRunOptimization}
          onStopOptimization={onStopOptimization}
          onSetupOpenAI={onSetupOpenAI}
          showConfirmation={showConfirmation}
        />

        {/* Auth Settings */}
        <AuthSettings
          config={config}
          updateConfig={updateConfig}
          updateArrayItem={updateArrayItem}
          addArrayItem={addArrayItem}
          removeArrayItem={removeArrayItem}
          hasUnsavedChanges={hasUnsavedChanges("Authentication")}
          onSave={() => handleSaveSection("Authentication")}
          onCancel={() => setConfig(originalConfig!)}
          savingSection={savingSection}
        />

        {/* SMTP Settings */}
        <SMTPSettings
          config={config}
          originalConfig={originalConfig!}
          setConfig={setConfig}
          setOriginalConfig={setOriginalConfig}
          updateConfig={updateConfig}
          hasUnsavedChanges={hasUnsavedChanges("Email")}
          onSave={() => handleSaveSection("Email")}
          onCancel={() => setConfig(originalConfig!)}
          savingSection={savingSection}
          setMessage={setMessage}
          sectionRef={smtpSectionRef}
        />

        {/* Analytics Settings */}
        <AnalyticsSettings
          config={config}
          originalConfig={originalConfig!}
          setConfig={setConfig}
          setOriginalConfig={setOriginalConfig}
          updateConfig={updateConfig}
          hasUnsavedChanges={hasUnsavedChanges("Analytics")}
          onSave={() => handleSaveSection("Analytics")}
          onCancel={() => setConfig(originalConfig!)}
          savingSection={savingSection}
          setMessage={setMessage}
          onOpenObserveSave={onOpenObserveSave}
        />
      </div>
    </div>
  );
};

export default AdvancedSettingsSection;
