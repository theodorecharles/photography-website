/**
 * Regeneration Controls Component
 * Handles AI title generation and image optimization
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigData } from '../types';

interface RegenerationControlsProps {
  config: ConfigData | null;
  hasMissingTitles: boolean;
  optimizationComplete: boolean;
  videoOptimizationComplete: boolean;
  generatingTitles: boolean;
  isOptimizationRunning: boolean;
  isVideoOptimizationRunning: boolean;
  onGenerateTitles: (forceRegenerate: boolean) => void;
  onStopTitles: () => void;
  onRunOptimization: (force: boolean) => void;
  onStopOptimization: () => void;
  onRunVideoOptimization: () => void;
  onStopVideoOptimization: () => void;
  onSetupOpenAI: () => void;
  showConfirmation: (message: string) => Promise<boolean>;
}

const RegenerationControls: React.FC<RegenerationControlsProps> = ({
  config,
  hasMissingTitles,
  optimizationComplete,
  videoOptimizationComplete,
  generatingTitles,
  isOptimizationRunning,
  isVideoOptimizationRunning,
  onGenerateTitles,
  onStopTitles,
  onRunOptimization,
  onStopOptimization,
  onRunVideoOptimization,
  onStopVideoOptimization,
  onSetupOpenAI,
  showConfirmation,
}) => {
  const { t } = useTranslation();
  const isAnyJobRunning = generatingTitles || isOptimizationRunning || isVideoOptimizationRunning;

  if (!config) return null;

  return (
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
          {t('advancedSettings.regenerationControls.titleGeneration')}
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
              {t('advancedSettings.regenerationControls.setUpOpenAI')}
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
                  {t('advancedSettings.regenerationControls.backfillMissingTitles')}
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  const confirmed = await showConfirmation(
                    t('advancedSettings.regenerationControls.forceRegenerateAllConfirm')
                  );
                  if (confirmed) {
                    onGenerateTitles(true);
                  }
                }}
                className="btn-force-regenerate"
                style={{ flex: "1 1 auto", minWidth: "200px" }}
                disabled={isOptimizationRunning}
              >
                {t('advancedSettings.regenerationControls.forceRegenerateAll')}
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
              {t('advancedSettings.regenerationControls.stop')}
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
          {t('advancedSettings.regenerationControls.optimizedImages')}
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
              disabled={generatingTitles || isVideoOptimizationRunning}
            >
              {t('advancedSettings.regenerationControls.forceRegenerateAll')}
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
              {t('advancedSettings.regenerationControls.stop')}
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

      {/* Optimized Videos */}
      <div className="openai-section" style={{ marginBottom: "0" }}>
        <label
          className="openai-section-label"
          style={{ display: "block", marginBottom: "0.75rem" }}
        >
          {t('advancedSettings.regenerationControls.optimizedVideos')}
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
          {!isVideoOptimizationRunning ? (
            <button
              type="button"
              onClick={async () => {
                const confirmed = await showConfirmation(
                  t('advancedSettings.regenerationControls.forceRegenerateVideosConfirm')
                );
                if (confirmed) {
                  onRunVideoOptimization();
                }
              }}
              className="btn-force-regenerate"
              style={{ flex: "1 1 auto", minWidth: "200px" }}
              disabled={generatingTitles || isOptimizationRunning}
            >
              {t('advancedSettings.regenerationControls.forceRegenerateAll')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onStopVideoOptimization}
              className="btn-force-regenerate"
              style={{
                backgroundColor: "#dc2626",
                borderColor: "#dc2626",
                flex: "1 1 auto",
                minWidth: "200px",
              }}
            >
              {t('advancedSettings.regenerationControls.stop')}
            </button>
          )}
          {videoOptimizationComplete && !isVideoOptimizationRunning && (
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
  );
};

export default RegenerationControls;

