/**
 * Google Sign On Settings Component
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigData } from '../types';
import { PasswordInput } from '../../PasswordInput';
import { Toggle } from './Toggle';

interface AuthSettingsProps {
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

const AuthSettings: React.FC<AuthSettingsProps> = ({
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
  const { t } = useTranslation();
  const isEnabled = config.environment.auth.google.enabled;

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
        <label className="openai-section-label">{t('authSettings.title')}</label>
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
              {t('authSettings.cancel')}
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
              {savingSection === t('authSettings.sectionName')
                ? t('authSettings.saving')
                : t('authSettings.save')}
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
        {t('authSettings.description')}
      </p>

      {/* Enable/Disable Toggle */}
      <div className="branding-group" style={{ margin: 0, marginBottom: "1.5rem" }}>
        <Toggle
          checked={isEnabled}
          onChange={() =>
            updateConfig(
              ["environment", "auth", "google", "enabled"],
              !isEnabled
            )
          }
          label={t('authSettings.enableGoogleSignIn')}
        />
        <p
          style={{
            fontSize: "0.8rem",
            color: "#666",
            marginTop: "0.5rem",
            marginLeft: "52px", // Align with toggle label
          }}
        >
          {isEnabled
            ? t('authSettings.enabledDescription')
            : t('authSettings.disabledDescription')}
        </p>
      </div>

      <div className="config-grid-inner">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="branding-group" style={{ margin: 0 }}>
            <label className="branding-label">{t('authSettings.googleClientId')}</label>
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
            <label className="branding-label">{t('authSettings.googleClientSecret')}</label>
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
            <label className="branding-label">{t('authSettings.sessionSecret')}</label>
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
          <label className="branding-label">{t('authSettings.authorizedEmails')}</label>
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
            {t('authSettings.addEmail')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthSettings;

