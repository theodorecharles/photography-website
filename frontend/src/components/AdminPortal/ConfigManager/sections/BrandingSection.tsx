/**
 * Branding Section Component
 * Manages site branding including logo, colors, and metadata
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../../../config';
import { BrandingConfig } from '../../types';
import { trackBrandingUpdate, trackAvatarUpload } from '../../../../utils/analytics';
import SectionHeader from '../components/SectionHeader';
import CustomDropdown from '../components/CustomDropdown';
import { LICENSE_OPTIONS, getLicenseById } from '../../../../utils/licenses';
import '../../BrandingManager.css';
import { error, info } from '../../../../utils/logger';


interface BrandingSectionProps {
  branding: BrandingConfig;
  setBranding: (branding: BrandingConfig) => void;
  loadBranding: () => Promise<void>;
  setMessage: (message: { type: "success" | "error"; text: string }) => void;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: '简体中文', flag: '🇨🇳' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'tl', name: 'Filipino', flag: '🇵🇭' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
];

const BrandingSection: React.FC<BrandingSectionProps> = ({
  branding,
  setBranding,
  loadBranding,
  setMessage,
}) => {
  const { t, i18n } = useTranslation();
  const [showBranding, setShowBranding] = useState(false);
  const [originalBranding, setOriginalBranding] = useState<BrandingConfig>(branding);
  const [savingBrandingSection, setSavingBrandingSection] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const handleBrandingChange = (field: keyof BrandingConfig, value: string | boolean) => {
    setBranding({
      ...branding,
      [field]: value,
    });
  };
  
  // Get translated license description
  const getLicenseDescription = (licenseId: string): string => {
    const descMap: Record<string, string> = {
      'all-rights-reserved': t('license.allRightsReservedDesc'),
      'cc-by': t('license.ccByDesc'),
      'cc-by-sa': t('license.ccBySaDesc'),
      'cc-by-nd': t('license.ccByNdDesc'),
      'cc-by-nc': t('license.ccByNcDesc'),
      'cc-by-nc-sa': t('license.ccByNcSaDesc'),
      'cc-by-nc-nd': t('license.ccByNcNdDesc'),
      'cc0': t('license.cc0Desc'),
      'public-domain': t('license.publicDomainDesc'),
    };
    const license = getLicenseById(licenseId);
    return descMap[licenseId] || license?.description || '';
  };
  
  // Initialize language from branding config or use current i18n language
  useEffect(() => {
    if (branding.language) {
      i18n.changeLanguage(branding.language);
    } else {
      // If no language in branding, use current i18n language
      const currentLang = i18n.language;
      if (currentLang !== 'en') {
        // Only change if it's not already English (default)
        i18n.changeLanguage(currentLang);
      }
    }
  }, [branding.language, i18n]);

  // Initialize originalBranding only once when component first loads
  useEffect(() => {
    if (!isInitialized && branding.siteName) {
      info('[BrandingSection] Initializing originalBranding:', branding);
      info('[BrandingSection] photoLicense:', branding.photoLicense);
      setOriginalBranding(branding);
      setIsInitialized(true);
    }
  }, [branding, isInitialized]);

  const handleAvatarFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    setPendingAvatarFile(file);
  };

  const handleAvatarDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleAvatarDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleAvatarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleAvatarFileSelect(file);
      }
    }
  };

  const handleAvatarClick = () => {
    avatarFileInputRef.current?.click();
  };

  const saveBrandingSection = async (sectionName: string, fields: (keyof BrandingConfig)[]) => {
    setSavingBrandingSection(sectionName);
    
    try {
      let updatedBranding = { ...branding };
      
      // If this is the avatar section and there's a pending file, upload it first
      if (sectionName === 'Logo' && pendingAvatarFile) {
        const formData = new FormData();
        formData.append('avatar', pendingAvatarFile);

        info('[Avatar Upload] Starting upload...');
        const avatarRes = await fetch(`${API_URL}/api/branding/upload-avatar`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        info('[Avatar Upload] Response status:', avatarRes.status);
        
        if (avatarRes.ok) {
          const data = await avatarRes.json();
          info('[Avatar Upload] Success:', data);
          updatedBranding.avatarPath = data.avatarPath;
          setBranding({
            ...branding,
            avatarPath: data.avatarPath
          });
          trackAvatarUpload();
          setPendingAvatarFile(null);
          setAvatarPreviewUrl(null);
        } else {
          const errorText = await avatarRes.text();
          error('[Avatar Upload] Error response:', errorText);
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || 'Unknown error' };
          }
          throw new Error(errorData.error || 'Failed to upload avatar');
        }
      }

      // Save the branding settings
      const res = await fetch(`${API_URL}/api/branding`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedBranding),
      });

      if (res.ok) {
                    // Use section-specific translation key
                    const sectionKey = sectionName + 'Saved';
                    setMessage({ type: 'success', text: t(`branding.${sectionKey}`) });
        trackBrandingUpdate(fields.map(f => String(f)));
        
        // Reload branding to get fresh data
        await loadBranding();
        
        // Update original branding to match the reloaded data (after loadBranding completes)
        // Use a small delay to ensure parent state has updated
        setTimeout(() => {
          setOriginalBranding(branding);
        }, 100);
        
        // Notify main app to refresh branding (site name or avatar)
        if (fields.includes('siteName') || fields.includes('avatarPath')) {
          window.dispatchEvent(new Event('branding-updated'));
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: t('common.unknownError') }));
        setMessage({ type: 'error', text: errorData.error || t('branding.failedToSave', { section: sectionName }) });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('branding.failedToSave', { section: sectionName });
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSavingBrandingSection(null);
    }
  };

  const cancelBrandingSection = (fields: (keyof BrandingConfig)[]) => {
    // Revert the specified fields to their original values
    const revertedBranding = { ...branding };
    fields.forEach(field => {
      (revertedBranding as any)[field] = originalBranding[field];
    });
    setBranding(revertedBranding);
    
    // Clear avatar upload state
    setPendingAvatarFile(null);
    setAvatarPreviewUrl(null);
  };

  const hasBrandingChanges = (fields: (keyof BrandingConfig)[]): boolean => {
    // Check if avatar has pending upload
    if (fields.includes('avatarPath') && pendingAvatarFile) {
      info('[BrandingSection] Has pending avatar file, showing save button');
      return true;
    }
    
    // Check if any field values have changed
    const hasChanges = fields.some(field => branding[field] !== originalBranding[field]);
    if (hasChanges) {
      info('[BrandingSection] Field changes detected:', fields);
    }
    return hasChanges;
  };

  return (
    <div className="config-group full-width">
      <SectionHeader
        title={t('branding.title')}
        description={t('branding.description')}
        isExpanded={showBranding}
        onToggle={() => setShowBranding(!showBranding)}
      />

      <div
        className={`collapsible-content ${showBranding ? "expanded" : "collapsed"}`}
        style={{
          maxHeight: showBranding ? "10000px" : "0",
        }}
      >
        <div className="branding-grid">
          <div className="branding-group">
            <label className="branding-label">{t('branding.logo')}</label>
            <div 
              className={`avatar-upload-container ${isDraggingOver ? 'dragging-over' : ''}`}
              onDragOver={handleAvatarDragOver}
              onDragLeave={handleAvatarDragLeave}
              onDrop={handleAvatarDrop}
              onClick={handleAvatarClick}
              style={{ 
                cursor: 'pointer',
                position: 'relative',
                border: isDraggingOver ? '1px dashed var(--primary-color)' : '1px dashed transparent',
                transition: 'border 0.2s ease'
              }}
            >
              {(avatarPreviewUrl || branding.avatarPath) ? (
                <img
                  src={
                    avatarPreviewUrl ||
                    `${API_URL}${branding.avatarPath}?v=${Date.now()}`
                  }
                  alt={t('branding.currentAvatar')}
                  className="current-avatar-preview"
                  key={avatarPreviewUrl || branding.avatarPath}
                  style={{ cursor: 'pointer' }}
                />
              ) : (
                <div style={{
                  width: '120px',
                  height: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px dashed rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '0.875rem',
                  textAlign: 'center',
                  padding: '1rem'
                }}>
                  <span>{t('branding.clickOrDrag')}</span>
                </div>
              )}
              <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleAvatarFileSelect(file);
                  }
                }}
                style={{ display: "none" }}
                disabled={savingBrandingSection === 'Logo'}
              />
            </div>
            {hasBrandingChanges(['avatarPath']) && (
              <div className="section-button-group">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelBrandingSection(['avatarPath']);
                  }}
                  className="btn-secondary btn-small"
                  disabled={savingBrandingSection === 'Logo'}
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    saveBrandingSection('logo', ['avatarPath']);
                  }}
                  className="btn-primary btn-small"
                  disabled={savingBrandingSection === 'Logo'}
                >
                  {savingBrandingSection === 'Logo' ? t('common.saving') : t('common.save')}
                </button>
              </div>
            )}
          </div>

          <div className="branding-group">
            <label className="branding-label">{t('branding.siteName')}</label>
            <input
              type="text"
              value={branding.siteName}
              onChange={(e) =>
                handleBrandingChange("siteName", e.target.value)
              }
              className="branding-input"
              placeholder={t('branding.siteNamePlaceholder')}
              disabled={savingBrandingSection === 'Site Name'}
            />
            {hasBrandingChanges(['siteName']) && (
              <div className="section-button-group">
                <button 
                  onClick={() => cancelBrandingSection(['siteName'])} 
                  className="btn-secondary btn-small"
                  disabled={savingBrandingSection === 'Site Name'}
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={() => saveBrandingSection('siteName', ['siteName'])} 
                  className="btn-primary btn-small"
                  disabled={savingBrandingSection === 'Site Name'}
                >
                  {savingBrandingSection === 'Site Name' ? t('common.saving') : t('common.save')}
                </button>
              </div>
            )}
          </div>

          <div className="branding-group">
            <label className="branding-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
              {t('branding.photoLicense')}
            </label>
            <p className="branding-description">
              {t('branding.photoLicenseDescription')}
            </p>
            <CustomDropdown
              value={branding.photoLicense || 'cc-by'}
              options={LICENSE_OPTIONS.map((license) => ({
                value: license.id,
                label: license.name,
                emoji: license.id.startsWith('cc-') && license.id !== 'cc0' ? '🆓' : 
                       license.id === 'cc0' ? '🌐' : '©️'
              }))}
              openUpward={true}
              onChange={async (newValue) => {
                handleBrandingChange("photoLicense", newValue);
                
                // Auto-save immediately
                setSavingBrandingSection('Photo License');
                try {
                  const updatedBranding = {
                    ...branding,
                    photoLicense: newValue
                  };
                  
                  const res = await fetch(`${API_URL}/api/branding`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(updatedBranding),
                  });

                  if (res.ok) {
                    setMessage({ type: 'success', text: t('branding.photoLicenseUpdated') });
                    trackBrandingUpdate(['photoLicense']);
                    setOriginalBranding(updatedBranding);
                    await loadBranding();
                  } else {
                    const errorData = await res.json().catch(() => ({ error: t('common.unknownError') }));
                    setMessage({ type: 'error', text: errorData.error || t('branding.failedToSaveLicense') });
                    // Revert on error
                    setBranding(branding);
                  }
                } catch (err) {
                  const errorMessage = err instanceof Error ? err.message : t('branding.errorSavingLicense');
                  setMessage({ type: 'error', text: errorMessage });
                  // Revert on error
                  setBranding(branding);
                } finally {
                  setSavingBrandingSection(null);
                }
              }}
              disabled={savingBrandingSection === 'Photo License'}
            />
            {branding.photoLicense && (
              <p className="branding-description" style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                {getLicenseDescription(branding.photoLicense)}
              </p>
            )}
          </div>

          <div className="branding-group">
            <label className="branding-label">{t('branding.shuffleHomepage')}</label>
            <p className="branding-description">
              {t('branding.shuffleHomepageDescription')}
            </p>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={branding.shuffleHomepage ?? true}
                onChange={async (e) => {
                  const newValue = e.target.checked;
                  // Update state immediately with new value
                  const updatedBranding = {
                    ...branding,
                    shuffleHomepage: newValue
                  };
                  setBranding(updatedBranding);
                  
                  // Save to backend
                  setSavingBrandingSection('Homepage Settings');
                  try {
                    const res = await fetch(`${API_URL}/api/branding`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      credentials: 'include',
                      body: JSON.stringify(updatedBranding),
                    });

                    if (res.ok) {
                      // Regenerate static JSON to include new shuffle setting
                      try {
                        await fetch(`${API_URL}/api/static-json/generate`, {
                          method: 'POST',
                          credentials: 'include',
                        });
                        info('Static JSON regenerated with new shuffle setting');
                      } catch (err) {
                        error('Failed to regenerate static JSON:', err);
                      }
                      
                      setMessage({ type: 'success', text: t('branding.homepageShuffleSaved') });
                      setOriginalBranding(updatedBranding);
                      // Don't reload - we already have the correct state
                    } else {
                      const errorData = await res.json().catch(() => ({ error: t('common.unknownError') }));
                      setMessage({ type: 'error', text: errorData.error || t('branding.failedToSaveSetting') });
                      // Revert on error
                      setBranding(branding);
                    }
                  } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : t('branding.errorSavingSetting');
                    setMessage({ type: 'error', text: errorMessage });
                    // Revert on error
                    setBranding(branding);
                  } finally {
                    setSavingBrandingSection(null);
                  }
                }}
                disabled={savingBrandingSection === 'Homepage Settings'}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">
                {branding.shuffleHomepage ?? true ? t('common.enabled') : t('common.disabled')}
              </span>
            </label>
          </div>

          <div className="branding-group">
            <label className="branding-label">{t('branding.primaryColor')}</label>
            <div className="color-input-group">
              <input
                type="color"
                value={branding.primaryColor}
                onChange={(e) =>
                  handleBrandingChange("primaryColor", e.target.value)
                }
                className="color-picker"
                disabled={savingBrandingSection === 'Primary Color'}
              />
              <input
                type="text"
                value={branding.primaryColor}
                onChange={(e) =>
                  handleBrandingChange("primaryColor", e.target.value)
                }
                className="branding-input color-text"
                placeholder="#4ade80"
                disabled={savingBrandingSection === 'Primary Color'}
              />
            </div>
            {hasBrandingChanges(['primaryColor']) && (
              <div className="section-button-group">
                <button 
                  onClick={() => cancelBrandingSection(['primaryColor'])} 
                  className="btn-secondary btn-small"
                  disabled={savingBrandingSection === 'Primary Color'}
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={() => saveBrandingSection('primaryColor', ['primaryColor'])} 
                  className="btn-primary btn-small"
                  disabled={savingBrandingSection === 'Primary Color'}
                >
                  {savingBrandingSection === 'Primary Color' ? t('common.saving') : t('common.save')}
                </button>
              </div>
            )}
          </div>

          <div className="branding-group">
            <label className="branding-label">{t('branding.secondaryColor')}</label>
            <div className="color-input-group">
              <input
                type="color"
                value={branding.secondaryColor}
                onChange={(e) =>
                  handleBrandingChange("secondaryColor", e.target.value)
                }
                className="color-picker"
                disabled={savingBrandingSection === 'Secondary Color'}
              />
              <input
                type="text"
                value={branding.secondaryColor}
                onChange={(e) =>
                  handleBrandingChange("secondaryColor", e.target.value)
                }
                className="branding-input color-text"
                placeholder="#3b82f6"
                disabled={savingBrandingSection === 'Secondary Color'}
              />
            </div>
            {hasBrandingChanges(['secondaryColor']) && (
              <div className="section-button-group">
                <button 
                  onClick={() => cancelBrandingSection(['secondaryColor'])} 
                  className="btn-secondary btn-small"
                  disabled={savingBrandingSection === 'Secondary Color'}
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={() => saveBrandingSection('secondaryColor', ['secondaryColor'])} 
                  className="btn-primary btn-small"
                  disabled={savingBrandingSection === 'Secondary Color'}
                >
                  {savingBrandingSection === 'Secondary Color' ? t('common.saving') : t('common.save')}
                </button>
              </div>
            )}
          </div>

          <div className="branding-group">
            <label className="branding-label">{t('branding.metaDescription')}</label>
            <textarea
              value={branding.metaDescription}
              onChange={(e) =>
                handleBrandingChange("metaDescription", e.target.value)
              }
              className="branding-textarea"
              placeholder={t('branding.metaDescriptionPlaceholder')}
              rows={3}
              disabled={savingBrandingSection === 'Meta Description'}
            />
            {hasBrandingChanges(['metaDescription']) && (
              <div className="section-button-group">
                <button 
                  onClick={() => cancelBrandingSection(['metaDescription'])} 
                  className="btn-secondary btn-small"
                  disabled={savingBrandingSection === 'Meta Description'}
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={() => saveBrandingSection('metaDescription', ['metaDescription'])} 
                  className="btn-primary btn-small"
                  disabled={savingBrandingSection === 'Meta Description'}
                >
                  {savingBrandingSection === 'Meta Description' ? t('common.saving') : t('common.save')}
                </button>
              </div>
            )}
          </div>

          <div className="branding-group">
            <label className="branding-label">{t('branding.metaKeywords')}</label>
            <textarea
              value={branding.metaKeywords}
              onChange={(e) =>
                handleBrandingChange("metaKeywords", e.target.value)
              }
              className="branding-textarea"
              placeholder={t('branding.metaKeywordsPlaceholder')}
              rows={3}
              disabled={savingBrandingSection === 'Meta Keywords'}
            />
            {hasBrandingChanges(['metaKeywords']) && (
              <div className="section-button-group">
                <button 
                  onClick={() => cancelBrandingSection(['metaKeywords'])} 
                  className="btn-secondary btn-small"
                  disabled={savingBrandingSection === 'Meta Keywords'}
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={() => saveBrandingSection('metaKeywords', ['metaKeywords'])} 
                  className="btn-primary btn-small"
                  disabled={savingBrandingSection === 'Meta Keywords'}
                >
                  {savingBrandingSection === 'Meta Keywords' ? t('common.saving') : t('common.save')}
                </button>
              </div>
            )}
          </div>

          <div className="branding-group">
            <label className="branding-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
              {t('branding.language')}
            </label>
            <p className="branding-description">
              {t('branding.languageDescription')}
            </p>
            <CustomDropdown
              value={branding.language || i18n.language || 'en'}
              options={SUPPORTED_LANGUAGES.map((lang) => ({
                value: lang.code,
                label: lang.name,
                emoji: lang.flag
              }))}
              openUpward={true}
              onChange={async (newValue) => {
                handleBrandingChange("language", newValue);
                
                // Auto-save immediately
                setSavingBrandingSection('Language');
                try {
                  // Change i18n language and wait for it to load
                  await i18n.changeLanguage(newValue);
                  
                  // Give React a moment to re-render with the new language
                  await new Promise(resolve => setTimeout(resolve, 50));
                  
                  const updatedBranding = {
                    ...branding,
                    language: newValue
                  };
                  
                  const res = await fetch(`${API_URL}/api/branding`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(updatedBranding),
                  });

                  if (res.ok) {
                    // Get the message in the NEW language using i18n.t() directly
                    setMessage({ type: 'success', text: i18n.t('branding.languageUpdated') });
                    trackBrandingUpdate(['language']);
                    setOriginalBranding(updatedBranding);
                    await loadBranding();
                  } else {
                    const errorData = await res.json().catch(() => ({ error: t('common.unknownError') }));
                    setMessage({ type: 'error', text: errorData.error || t('branding.failedToSaveLanguage') });
                    // Revert on error
                    setBranding(branding);
                    await i18n.changeLanguage(branding.language || 'en');
                  }
                } catch (err) {
                  const errorMessage = err instanceof Error ? err.message : t('branding.errorSavingLanguage');
                  setMessage({ type: 'error', text: errorMessage });
                  // Revert on error
                  setBranding(branding);
                  await i18n.changeLanguage(branding.language || 'en');
                } finally {
                  setSavingBrandingSection(null);
                }
              }}
              disabled={savingBrandingSection === 'Language'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandingSection;
