/**
 * Regeneration Controls Component
 * Handles AI title generation and image optimization
 */

import React from 'react';
import { ConfigData } from '../types';

interface RegenerationControlsProps {
  config: ConfigData | null;
  hasMissingTitles: boolean;
  optimizationComplete: boolean;
  generatingTitles: boolean;
  isOptimizationRunning: boolean;
  onGenerateTitles: (forceRegenerate: boolean) => void;
  onStopTitles: () => void;
  onRunOptimization: (force: boolean) => void;
  onStopOptimization: () => void;
  onSetupOpenAI: () => void;
  showConfirmation: (message: string) => Promise<boolean>;
}

const RegenerationControls: React.FC<RegenerationControlsProps> = ({
  config,
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
  const isAnyJobRunning = generatingTitles || isOptimizationRunning;

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
  );
};

export default RegenerationControls;

