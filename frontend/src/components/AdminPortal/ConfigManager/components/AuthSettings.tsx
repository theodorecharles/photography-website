/**
 * Google Sign On Settings Component
 */

import React, { useEffect } from 'react';
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
  setActionButtons: (buttons: React.ReactNode) => void;
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
  setActionButtons,
}) => {
  const { t } = useTranslation();
  const isEnabled = config.environment.auth.google.enabled;

  // Update action buttons when changes occur
  useEffect(() => {
    if (hasUnsavedChanges) {
      const buttons = [
        <button
          key="cancel"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          disabled={savingSection !== null}
          className="btn-secondary"
          style={{ fontSize: '0.875rem', padding: '0.4rem 0.8rem' }}
        >
          {t('common.cancel')}
        </button>,
        <button
          key="save"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          disabled={savingSection !== null}
          className="btn-primary"
          style={{ fontSize: '0.875rem', padding: '0.4rem 0.8rem' }}
        >
          {savingSection ? t('common.saving') : t('common.save')}
        </button>
      ];
      setActionButtons(<>{buttons}</>);
    } else {
      setActionButtons(null);
    }
  }, [hasUnsavedChanges, savingSection, onCancel, onSave, t, setActionButtons]);

  return (
    <div>
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

      {isEnabled && (
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
      )}
    </div>
  );
};

export default AuthSettings;

