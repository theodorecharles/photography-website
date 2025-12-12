/**
 * General Section Component
 * Manages general site settings including logo, metadata, and language
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../../../config';
import { BrandingConfig } from '../../types';
import { trackBrandingUpdate, trackAvatarUpload } from '../../../../utils/analytics';
import CustomDropdown from '../components/CustomDropdown';
import { LICENSE_OPTIONS, getLicenseById } from '../../../../utils/licenses';
import '../../BrandingManager.css';
import { error, info } from '../../../../utils/logger';


interface GeneralSectionProps {
  branding: BrandingConfig;
  setBranding: (branding: BrandingConfig) => void;
  loadBranding: () => Promise<void>;
  setMessage: (message: { type: "success" | "error"; text: string }) => void;
}

const SUPPORTED_LANGUAGES = [
  // English
  { code: 'en', name: 'English', flag: '🇺🇸' },
  // European languages (by speakers, descending)
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'ca', name: 'Català', flag: '🇪🇸' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'bg', name: 'Български', flag: '🇧🇬' },
  { code: 'sr', name: 'Српски', flag: '🇷🇸' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'sk', name: 'Slovenčina', flag: '🇸🇰' },
  { code: 'hr', name: 'Hrvatski', flag: '🇭🇷' },
  { code: 'lt', name: 'Lietuvių', flag: '🇱🇹' },
  { code: 'sl', name: 'Slovenščina', flag: '🇸🇮' },
  { code: 'eu', name: 'Euskara', flag: '🐑' },
  { code: 'la', name: 'Latina', flag: '🏛️' },
  // Asian languages (by speakers, descending)
  { code: 'zh', name: '简体中文', flag: '🇨🇳' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'tl', name: 'Filipino', flag: '🇵🇭' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'my', name: 'မြန်မာ', flag: '🇲🇲' },
];

const GeneralSection: React.FC<GeneralSectionProps> = ({
  branding,
  setBranding,
  loadBranding,
  setMessage,
}) => {
  const { t, i18n } = useTranslation();
  const [originalBranding, setOriginalBranding] = useState<BrandingConfig>(branding);
  const [savingBrandingSection, setSavingBrandingSection] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const handleBrandingChange = (field: keyof BrandingConfig, value: string | boolean | number) => {
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
                    setMessage({ type: 'success', text: t(`general.${sectionKey}`) });
        trackBrandingUpdate(fields.map(f => String(f)));
        
        // Update original branding to reflect the saved state
        setOriginalBranding(updatedBranding);
        
        // Clear pending avatar state
        setPendingAvatarFile(null);
        setAvatarPreviewUrl(null);
        
        // Blur active input to dismiss mobile keyboard before reload
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        
        // Reload branding to get fresh data from server
        await loadBranding();
        
        // Notify main app to refresh branding (site name or avatar)
        if (fields.includes('siteName') || fields.includes('avatarPath')) {
          window.dispatchEvent(new Event('branding-updated'));
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: t('common.unknownError') }));
        setMessage({ type: 'error', text: errorData.error || t('general.failedToSave', { section: sectionName }) });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('general.failedToSave', { section: sectionName });
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
    <>
      <div className="branding-grid">
          <div className="branding-group">
            <label className="branding-label">{t('general.logo')}</label>
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
                  alt={t('general.currentAvatar')}
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
                  <span>{t('general.clickOrDrag')}</span>
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
                    saveBrandingSection('Logo', ['avatarPath']);
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
            <label className="branding-label">{t('general.siteName')}</label>
            <input
              type="text"
              value={branding.siteName}
              onChange={(e) =>
                handleBrandingChange("siteName", e.target.value)
              }
              className="branding-input"
              placeholder={t('general.siteNamePlaceholder')}
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
              {t('general.photoLicense')}
            </label>
            <p className="branding-description">
              {t('general.photoLicenseDescription')}
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
                    setMessage({ type: 'success', text: t('general.photoLicenseUpdated') });
                    trackBrandingUpdate(['photoLicense']);
                    setOriginalBranding(updatedBranding);
                    // Blur active input to dismiss mobile keyboard before reload
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                    await loadBranding();
                  } else {
                    const errorData = await res.json().catch(() => ({ error: t('common.unknownError') }));
                    setMessage({ type: 'error', text: errorData.error || t('general.failedToSaveLicense') });
                    // Revert on error
                    setBranding(branding);
                  }
                } catch (err) {
                  const errorMessage = err instanceof Error ? err.message : t('general.errorSavingLicense');
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
            <label className="branding-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
              {t('general.language')}
            </label>
            <p className="branding-description">
              {t('general.languageDescription')}
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
                    setMessage({ type: 'success', text: i18n.t('general.languageUpdated') });
                    trackBrandingUpdate(['language']);
                    setOriginalBranding(updatedBranding);
                    // Dispatch event so App.tsx can update its state
                    window.dispatchEvent(new Event('branding-updated'));
                  } else {
                    const errorData = await res.json().catch(() => ({ error: t('common.unknownError') }));
                    setMessage({ type: 'error', text: errorData.error || t('general.failedToSaveLanguage') });
                    // Revert on error
                    setBranding(branding);
                    await i18n.changeLanguage(branding.language || 'en');
                  }
                } catch (err) {
                  const errorMessage = err instanceof Error ? err.message : t('general.errorSavingLanguage');
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

          <div className="branding-group">
            <label className="branding-label">{t('general.metaDescription')}</label>
            <textarea
              value={branding.metaDescription}
              onChange={(e) =>
                handleBrandingChange("metaDescription", e.target.value)
              }
              className="branding-textarea"
              placeholder={t('general.metaDescriptionPlaceholder')}
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
            <label className="branding-label">{t('general.metaKeywords')}</label>
            <textarea
              value={branding.metaKeywords}
              onChange={(e) =>
                handleBrandingChange("metaKeywords", e.target.value)
              }
              className="branding-textarea"
              placeholder={t('general.metaKeywordsPlaceholder')}
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
            <label className="branding-label">{t('general.shuffleHomepage')}</label>
            <p className="branding-description">
              {t('general.shuffleHomepageDescription')}
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
                      
                      setMessage({ type: 'success', text: t('general.homepageShuffleSaved') });
                      setOriginalBranding(updatedBranding);
                      // Don't reload - we already have the correct state
                    } else {
                      const errorData = await res.json().catch(() => ({ error: t('common.unknownError') }));
                      setMessage({ type: 'error', text: errorData.error || t('general.failedToSaveSetting') });
                      // Revert on error
                      setBranding(branding);
                    }
                  } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : t('general.errorSavingSetting');
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
            <label className="branding-label">{t('general.animatedBackground')}</label>
            <p className="branding-description">
              {t('general.animatedBackgroundDescription')}
            </p>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={branding.enableAnimatedBackground ?? true}
                onChange={async (e) => {
                  const newValue = e.target.checked;
                  // Update state immediately with new value
                  const updatedBranding = {
                    ...branding,
                    enableAnimatedBackground: newValue
                  };
                  setBranding(updatedBranding);

                  // Save to backend
                  setSavingBrandingSection('Animated Background');
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
                    setMessage({ type: 'success', text: t('general.animatedBackgroundSaved') });
                    setOriginalBranding(updatedBranding);
                    // Don't reload - state is already updated and background will apply on next navigation
                  } else {
                      const errorData = await res.json().catch(() => ({ error: t('common.unknownError') }));
                      setMessage({ type: 'error', text: errorData.error || t('general.failedToSaveSetting') });
                      // Revert on error
                      setBranding(branding);
                    }
                  } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : t('general.errorSavingSetting');
                    setMessage({ type: 'error', text: errorMessage });
                    // Revert on error
                    setBranding(branding);
                  } finally {
                    setSavingBrandingSection(null);
                  }
                }}
                disabled={savingBrandingSection === 'Animated Background'}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">
                {branding.enableAnimatedBackground ?? true ? t('common.enabled') : t('common.disabled')}
              </span>
            </label>
          </div>

          <div className="branding-group">
            <label className="branding-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
              {t('general.headerTheme')}
            </label>
            <p className="branding-description">
              {t('general.headerThemeDescription')}
            </p>
            <CustomDropdown
              value={branding.headerTheme || 'light'}
              options={[
                { value: 'light', label: t('general.headerThemeLight') },
                { value: 'dark', label: t('general.headerThemeDark') },
                { value: 'custom', label: t('general.headerThemeCustom') }
              ]}
              openUpward={true}
              onChange={async (newValue) => {
                handleBrandingChange("headerTheme", newValue);

                // Dispatch preview event immediately for live preview
                window.dispatchEvent(new CustomEvent('header-theme-preview', {
                  detail: { headerTheme: newValue as 'light' | 'dark' | 'custom' }
                }));

                // Auto-save immediately
                setSavingBrandingSection('Header Theme');
                try {
                  const updatedBranding = {
                    ...branding,
                    headerTheme: newValue as 'light' | 'dark' | 'custom'
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
                    setMessage({ type: 'success', text: t('general.headerThemeSaved') });
                    trackBrandingUpdate(['headerTheme']);
                    setOriginalBranding(updatedBranding);
                  } else {
                    const errorData = await res.json().catch(() => ({ error: t('common.unknownError') }));
                    setMessage({ type: 'error', text: errorData.error || t('general.failedToSaveHeaderTheme') });
                    // Revert on error
                    setBranding(branding);
                    // Revert preview
                    window.dispatchEvent(new CustomEvent('header-theme-preview', {
                      detail: { headerTheme: branding.headerTheme || 'light' }
                    }));
                  }
                } catch (err) {
                  const errorMessage = err instanceof Error ? err.message : t('general.errorSavingHeaderTheme');
                  setMessage({ type: 'error', text: errorMessage });
                  // Revert on error
                  setBranding(branding);
                  // Revert preview
                  window.dispatchEvent(new CustomEvent('header-theme-preview', {
                    detail: { headerTheme: branding.headerTheme || 'light' }
                  }));
                } finally {
                  setSavingBrandingSection(null);
                }
              }}
              disabled={savingBrandingSection === 'Header Theme'}
            />

            {/* Custom color pickers - show when custom theme is selected */}
            {branding.headerTheme === 'custom' && (
              <div className="custom-header-colors" style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1', minWidth: '120px' }}>
                    <label className="branding-label" style={{ fontSize: '0.875rem', marginBottom: '0.25rem', display: 'block' }}>
                      {t('general.headerBackgroundColor')}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="color"
                        value={branding.headerBackgroundColor || '#e7e7e7'}
                        onChange={(e) => {
                          const newColor = e.target.value;
                          handleBrandingChange("headerBackgroundColor", newColor);
                          // Live preview
                          window.dispatchEvent(new CustomEvent('header-theme-preview', {
                            detail: { headerBackgroundColor: newColor }
                          }));
                        }}
                        onBlur={async (e) => {
                          // Auto-save on blur
                          const newColor = e.target.value;
                          if (newColor !== originalBranding.headerBackgroundColor) {
                            try {
                              const updatedBranding = { ...branding, headerBackgroundColor: newColor };
                              const res = await fetch(`${API_URL}/api/branding`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify(updatedBranding),
                              });
                              if (res.ok) {
                                setOriginalBranding(updatedBranding);
                              }
                            } catch (err) {
                              // Silent fail - color is still previewed
                            }
                          }
                        }}
                        style={{
                          width: '40px',
                          height: '40px',
                          padding: '0',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      />
                      <input
                        type="text"
                        value={branding.headerBackgroundColor || '#e7e7e7'}
                        onChange={(e) => {
                          const newColor = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(newColor) || newColor === '#') {
                            handleBrandingChange("headerBackgroundColor", newColor);
                            // Live preview only for valid colors
                            if (/^#[0-9A-Fa-f]{6}$/.test(newColor)) {
                              window.dispatchEvent(new CustomEvent('header-theme-preview', {
                                detail: { headerBackgroundColor: newColor }
                              }));
                            }
                          }
                        }}
                        onBlur={async (e) => {
                          const newColor = e.target.value;
                          if (/^#[0-9A-Fa-f]{6}$/.test(newColor) && newColor !== originalBranding.headerBackgroundColor) {
                            try {
                              const updatedBranding = { ...branding, headerBackgroundColor: newColor };
                              const res = await fetch(`${API_URL}/api/branding`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify(updatedBranding),
                              });
                              if (res.ok) {
                                setOriginalBranding(updatedBranding);
                              }
                            } catch (err) {
                              // Silent fail
                            }
                          }
                        }}
                        className="branding-input"
                        style={{ width: '90px', fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>
                  <div style={{ flex: '1', minWidth: '120px' }}>
                    <label className="branding-label" style={{ fontSize: '0.875rem', marginBottom: '0.25rem', display: 'block' }}>
                      {t('general.headerTextColor')}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="color"
                        value={branding.headerTextColor || '#1e1e1e'}
                        onChange={(e) => {
                          const newColor = e.target.value;
                          handleBrandingChange("headerTextColor", newColor);
                          // Live preview
                          window.dispatchEvent(new CustomEvent('header-theme-preview', {
                            detail: { headerTextColor: newColor }
                          }));
                        }}
                        onBlur={async (e) => {
                          // Auto-save on blur
                          const newColor = e.target.value;
                          if (newColor !== originalBranding.headerTextColor) {
                            try {
                              const updatedBranding = { ...branding, headerTextColor: newColor };
                              const res = await fetch(`${API_URL}/api/branding`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify(updatedBranding),
                              });
                              if (res.ok) {
                                setOriginalBranding(updatedBranding);
                              }
                            } catch (err) {
                              // Silent fail
                            }
                          }
                        }}
                        style={{
                          width: '40px',
                          height: '40px',
                          padding: '0',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      />
                      <input
                        type="text"
                        value={branding.headerTextColor || '#1e1e1e'}
                        onChange={(e) => {
                          const newColor = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(newColor) || newColor === '#') {
                            handleBrandingChange("headerTextColor", newColor);
                            // Live preview only for valid colors
                            if (/^#[0-9A-Fa-f]{6}$/.test(newColor)) {
                              window.dispatchEvent(new CustomEvent('header-theme-preview', {
                                detail: { headerTextColor: newColor }
                              }));
                            }
                          }
                        }}
                        onBlur={async (e) => {
                          const newColor = e.target.value;
                          if (/^#[0-9A-Fa-f]{6}$/.test(newColor) && newColor !== originalBranding.headerTextColor) {
                            try {
                              const updatedBranding = { ...branding, headerTextColor: newColor };
                              const res = await fetch(`${API_URL}/api/branding`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify(updatedBranding),
                              });
                              if (res.ok) {
                                setOriginalBranding(updatedBranding);
                              }
                            } catch (err) {
                              // Silent fail
                            }
                          }
                        }}
                        className="branding-input"
                        style={{ width: '90px', fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Opacity slider */}
                <div style={{ marginTop: '1rem' }}>
                  <label className="branding-label" style={{ fontSize: '0.875rem', marginBottom: '0.25rem', display: 'block' }}>
                    {t('general.headerOpacity')}: {Math.round((branding.headerOpacity ?? 1) * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={branding.headerOpacity ?? 1}
                    onChange={(e) => {
                      const newOpacity = parseFloat(e.target.value);
                      handleBrandingChange("headerOpacity", newOpacity);
                      // Live preview
                      window.dispatchEvent(new CustomEvent('header-theme-preview', {
                        detail: { headerOpacity: newOpacity }
                      }));
                    }}
                    onMouseUp={async (e) => {
                      const newOpacity = parseFloat((e.target as HTMLInputElement).value);
                      if (newOpacity !== originalBranding.headerOpacity) {
                        try {
                          const updatedBranding = { ...branding, headerOpacity: newOpacity };
                          const res = await fetch(`${API_URL}/api/branding`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify(updatedBranding),
                          });
                          if (res.ok) {
                            setOriginalBranding(updatedBranding);
                          }
                        } catch (err) {
                          // Silent fail
                        }
                      }
                    }}
                    className="quality-slider"
                    style={{
                      width: '100%',
                      height: '6px',
                      borderRadius: '3px',
                      outline: 'none',
                      background: `linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${(branding.headerOpacity ?? 1) * 100}%, rgba(255, 255, 255, 0.1) ${(branding.headerOpacity ?? 1) * 100}%, rgba(255, 255, 255, 0.1) 100%)`,
                      cursor: 'pointer',
                    }}
                  />
                </div>

                {/* Blur slider */}
                <div style={{ marginTop: '1rem' }}>
                  <label className="branding-label" style={{ fontSize: '0.875rem', marginBottom: '0.25rem', display: 'block' }}>
                    {t('general.headerBlur')}: {branding.headerBlur ?? 0}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={branding.headerBlur ?? 0}
                    onChange={(e) => {
                      const newBlur = parseFloat(e.target.value);
                      handleBrandingChange("headerBlur", newBlur);
                      // Live preview
                      window.dispatchEvent(new CustomEvent('header-theme-preview', {
                        detail: { headerBlur: newBlur }
                      }));
                    }}
                    onMouseUp={async (e) => {
                      const newBlur = parseFloat((e.target as HTMLInputElement).value);
                      if (newBlur !== originalBranding.headerBlur) {
                        try {
                          const updatedBranding = { ...branding, headerBlur: newBlur };
                          const res = await fetch(`${API_URL}/api/branding`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify(updatedBranding),
                          });
                          if (res.ok) {
                            setOriginalBranding(updatedBranding);
                          }
                        } catch (err) {
                          // Silent fail
                        }
                      }
                    }}
                    className="quality-slider"
                    style={{
                      width: '100%',
                      height: '6px',
                      borderRadius: '3px',
                      outline: 'none',
                      background: `linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${((branding.headerBlur ?? 0) / 20) * 100}%, rgba(255, 255, 255, 0.1) ${((branding.headerBlur ?? 0) / 20) * 100}%, rgba(255, 255, 255, 0.1) 100%)`,
                      cursor: 'pointer',
                    }}
                  />
                </div>

                {/* Border color */}
                <div style={{ marginTop: '1rem' }}>
                  <label className="branding-label" style={{ fontSize: '0.875rem', marginBottom: '0.25rem', display: 'block' }}>
                    {t('general.headerBorderColor')}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="color"
                      value={branding.headerBorderColor || '#1e1e1e'}
                      onChange={(e) => {
                        const newColor = e.target.value;
                        handleBrandingChange("headerBorderColor", newColor);
                        // Live preview
                        window.dispatchEvent(new CustomEvent('header-theme-preview', {
                          detail: { headerBorderColor: newColor }
                        }));
                      }}
                      onBlur={async (e) => {
                        const newColor = e.target.value;
                        if (newColor !== originalBranding.headerBorderColor) {
                          try {
                            const updatedBranding = { ...branding, headerBorderColor: newColor };
                            const res = await fetch(`${API_URL}/api/branding`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify(updatedBranding),
                            });
                            if (res.ok) {
                              setOriginalBranding(updatedBranding);
                            }
                          } catch (err) {
                            // Silent fail
                          }
                        }
                      }}
                      style={{
                        width: '40px',
                        height: '40px',
                        padding: '0',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    />
                    <input
                      type="text"
                      value={branding.headerBorderColor || '#1e1e1e'}
                      onChange={(e) => {
                        const newColor = e.target.value;
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(newColor) || newColor === '#') {
                          handleBrandingChange("headerBorderColor", newColor);
                          if (/^#[0-9A-Fa-f]{6}$/.test(newColor)) {
                            window.dispatchEvent(new CustomEvent('header-theme-preview', {
                              detail: { headerBorderColor: newColor }
                            }));
                          }
                        }
                      }}
                      onBlur={async (e) => {
                        const newColor = e.target.value;
                        if (/^#[0-9A-Fa-f]{6}$/.test(newColor) && newColor !== originalBranding.headerBorderColor) {
                          try {
                            const updatedBranding = { ...branding, headerBorderColor: newColor };
                            const res = await fetch(`${API_URL}/api/branding`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify(updatedBranding),
                            });
                            if (res.ok) {
                              setOriginalBranding(updatedBranding);
                            }
                          } catch (err) {
                            // Silent fail
                          }
                        }
                      }}
                      className="branding-input"
                      style={{ width: '90px', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                {/* Border opacity slider */}
                <div style={{ marginTop: '1rem' }}>
                  <label className="branding-label" style={{ fontSize: '0.875rem', marginBottom: '0.25rem', display: 'block' }}>
                    {t('general.headerBorderOpacity')}: {Math.round((branding.headerBorderOpacity ?? 0.2) * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={branding.headerBorderOpacity ?? 0.2}
                    onChange={(e) => {
                      const newOpacity = parseFloat(e.target.value);
                      handleBrandingChange("headerBorderOpacity", newOpacity);
                      // Live preview
                      window.dispatchEvent(new CustomEvent('header-theme-preview', {
                        detail: { headerBorderOpacity: newOpacity }
                      }));
                    }}
                    onMouseUp={async (e) => {
                      const newOpacity = parseFloat((e.target as HTMLInputElement).value);
                      if (newOpacity !== originalBranding.headerBorderOpacity) {
                        try {
                          const updatedBranding = { ...branding, headerBorderOpacity: newOpacity };
                          const res = await fetch(`${API_URL}/api/branding`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify(updatedBranding),
                          });
                          if (res.ok) {
                            setOriginalBranding(updatedBranding);
                          }
                        } catch (err) {
                          // Silent fail
                        }
                      }
                    }}
                    className="quality-slider"
                    style={{
                      width: '100%',
                      height: '6px',
                      borderRadius: '3px',
                      outline: 'none',
                      background: `linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${(branding.headerBorderOpacity ?? 0.2) * 100}%, rgba(255, 255, 255, 0.1) ${(branding.headerBorderOpacity ?? 0.2) * 100}%, rgba(255, 255, 255, 0.1) 100%)`,
                      cursor: 'pointer',
                    }}
                  />
                </div>

              </div>
            )}
          </div>

          {/* Custom CSS */}
          <div className="branding-group" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <label className="branding-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
              {t('general.customCSS')}
            </label>
            <p className="branding-description">
              {t('general.customCSSDescription')}
            </p>
            <textarea
              value={branding.customCSS || ''}
              onChange={(e) => handleBrandingChange("customCSS", e.target.value)}
              className="branding-textarea"
              placeholder={t('general.customCSSPlaceholder')}
              style={{
                width: '100%',
                flex: 1,
                minHeight: '150px',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                resize: 'vertical'
              }}
              disabled={savingBrandingSection === 'Custom CSS'}
            />
            {hasBrandingChanges(['customCSS']) && (
              <div className="section-button-group">
                <button
                  onClick={() => cancelBrandingSection(['customCSS'])}
                  className="btn-secondary btn-small"
                  disabled={savingBrandingSection === 'Custom CSS'}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => saveBrandingSection('customCSS', ['customCSS'])}
                  className="btn-primary btn-small"
                  disabled={savingBrandingSection === 'Custom CSS'}
                >
                  {savingBrandingSection === 'Custom CSS' ? t('common.saving') : t('common.save')}
                </button>
              </div>
            )}
          </div>

          {/* Photo Grid Theme */}
          <div className="branding-group">
            <label className="branding-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
              {t('general.photoGridTheme')}
            </label>
            <p className="branding-description">
              {t('general.photoGridThemeDescription')}
            </p>
            <CustomDropdown
              value={branding.photoGridTheme || 'dark'}
              options={[
                { value: 'dark', label: t('general.headerThemeDark') },
                { value: 'light', label: t('general.headerThemeLight') }
              ]}
              openUpward={true}
              onChange={async (newValue) => {
                handleBrandingChange("photoGridTheme", newValue);
                // Live preview
                window.dispatchEvent(new CustomEvent('header-theme-preview', {
                  detail: { photoGridTheme: newValue as 'light' | 'dark' }
                }));
                // Auto-save
                try {
                  const updatedBranding = { ...branding, photoGridTheme: newValue as 'light' | 'dark' };
                  const res = await fetch(`${API_URL}/api/branding`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(updatedBranding),
                  });
                  if (res.ok) {
                    setMessage({ type: 'success', text: t('general.photoGridThemeSaved') });
                    setOriginalBranding(updatedBranding);
                  }
                } catch (err) {
                  // Silent fail
                }
              }}
            />
          </div>

          {/* Dropdown Style */}
          <div className="branding-group">
            <label className="branding-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
              {t('general.headerDropdownTheme')}
            </label>
            <p className="branding-description">
              {t('general.headerDropdownThemeDescription')}
            </p>
            <CustomDropdown
              value={branding.headerDropdownTheme || 'light'}
              options={[
                { value: 'light', label: t('general.headerThemeLight') },
                { value: 'dark', label: t('general.headerThemeDark') }
              ]}
              openUpward={true}
              onChange={async (newValue) => {
                handleBrandingChange("headerDropdownTheme", newValue);
                // Live preview
                window.dispatchEvent(new CustomEvent('header-theme-preview', {
                  detail: { headerDropdownTheme: newValue as 'light' | 'dark' }
                }));
                // Auto-save
                try {
                  const updatedBranding = { ...branding, headerDropdownTheme: newValue as 'light' | 'dark' };
                  const res = await fetch(`${API_URL}/api/branding`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(updatedBranding),
                  });
                  if (res.ok) {
                    setOriginalBranding(updatedBranding);
                  }
                } catch (err) {
                  // Silent fail
                }
              }}
            />
          </div>
        </div>
    </>
  );
};

export default GeneralSection;
