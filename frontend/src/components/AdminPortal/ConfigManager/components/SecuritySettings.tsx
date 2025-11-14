/**
 * Security Settings Component
 */

import React from 'react';
import { ConfigData } from '../types';

interface SecuritySettingsProps {
  config: ConfigData;
  updateConfig: (path: string[], value: any) => void;
  updateArrayItem: (path: string[], index: number, value: string) => void;
  addArrayItem: (path: string[]) => void;
  removeArrayItem: (path: string[], index: number) => void;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onCancel: () => void;
  savingSection: string | null;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  config,
  updateConfig,
  updateArrayItem,
  addArrayItem,
  removeArrayItem,
  hasUnsavedChanges,
  onSave,
  onCancel,
  savingSection,
}) => {
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
        <label className="openai-section-label">SECURITY</label>
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
                onSave();
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
  );
};

export default SecuritySettings;

