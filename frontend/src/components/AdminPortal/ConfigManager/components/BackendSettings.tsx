/**
 * Backend Settings Component
 */

import React, { useState } from 'react';
import { API_URL } from '../../../../config';
import { ConfigData } from '../types';


interface BackendSettingsProps {
  config: ConfigData;
  updateConfig: (path: string[], value: any) => void;
  updateArrayItem: (path: string[], index: number, value: string) => void;
  addArrayItem: (path: string[]) => void;
  removeArrayItem: (path: string[], index: number) => void;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onCancel: () => void;
  savingSection: string | null;
  showConfirmation: (message: string) => Promise<boolean>;
  setMessage: (message: { type: "success" | "error"; text: string }) => void;
}

const BackendSettings: React.FC<BackendSettingsProps> = ({
  config,
  updateConfig,
  updateArrayItem,
  addArrayItem,
  removeArrayItem,
  hasUnsavedChanges,
  onSave,
  onCancel,
  savingSection,
  showConfirmation,
  setMessage,
}) => {
  const [restartingBackend, setRestartingBackend] = useState(false);

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

  return (
    <div className="settings-section" style={{ marginBottom: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <label className="settings-section-label">BACKEND</label>
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
  );
};

export default BackendSettings;

