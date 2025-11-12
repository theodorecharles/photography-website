/**
 * Branding Section Component
 * Manages site branding including logo, colors, and metadata
 */

import React, { useState, useRef } from 'react';
import { BrandingConfig } from '../../types';
import { trackBrandingUpdate, trackAvatarUpload } from '../../../../utils/analytics';
import SectionHeader from '../components/SectionHeader';
import '../../BrandingManager.css';

const API_URL = import.meta.env.VITE_API_URL || '';

interface BrandingSectionProps {
  branding: BrandingConfig;
  setBranding: (branding: BrandingConfig) => void;
  loadBranding: () => Promise<void>;
  setMessage: (message: { type: "success" | "error"; text: string }) => void;
}

const BrandingSection: React.FC<BrandingSectionProps> = ({
  branding,
  setBranding,
  loadBranding,
  setMessage,
}) => {
  const [showBranding, setShowBranding] = useState(false);
  const [originalBranding, setOriginalBranding] = useState<BrandingConfig>(branding);
  const [savingBrandingSection, setSavingBrandingSection] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

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

  const handleBrandingChange = (field: keyof BrandingConfig, value: string) => {
    setBranding({
      ...branding,
      [field]: value,
    });
  };

  const saveBrandingSection = async (sectionName: string, fields: (keyof BrandingConfig)[]) => {
    setSavingBrandingSection(sectionName);
    
    try {
      let updatedBranding = { ...branding };
      
      // If this is the avatar section and there's a pending file, upload it first
      if (sectionName === 'Logo' && pendingAvatarFile) {
        const formData = new FormData();
        formData.append('avatar', pendingAvatarFile);

        const avatarRes = await fetch(`${API_URL}/api/branding/upload-avatar`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (avatarRes.ok) {
          const data = await avatarRes.json();
          updatedBranding.avatarPath = data.avatarPath;
          setBranding({
            ...branding,
            avatarPath: data.avatarPath
          });
          trackAvatarUpload();
          setPendingAvatarFile(null);
          setAvatarPreviewUrl(null);
        } else {
          const errorData = await avatarRes.json().catch(() => ({ error: 'Unknown error' }));
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
        setMessage({ type: 'success', text: `${sectionName} saved successfully!` });
        trackBrandingUpdate(fields.map(f => String(f)));
        
        // Update original branding to reflect the saved state
        setOriginalBranding(updatedBranding);
        
        // Reload branding to get fresh data
        await loadBranding();
        
        // Notify main app to refresh site name if it changed
        if (fields.includes('siteName')) {
          window.dispatchEvent(new Event('branding-updated'));
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        setMessage({ type: 'error', text: errorData.error || `Failed to save ${sectionName}` });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Error saving ${sectionName}`;
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSavingBrandingSection(null);
    }
  };

  const cancelBrandingSection = (fields: (keyof BrandingConfig)[]) => {
    // Revert the specified fields to their original values
    const revertedBranding = { ...branding };
    fields.forEach(field => {
      revertedBranding[field] = originalBranding[field];
    });
    setBranding(revertedBranding);
    
    // Clear avatar upload state
    setPendingAvatarFile(null);
    setAvatarPreviewUrl(null);
  };

  const hasBrandingChanges = (fields: (keyof BrandingConfig)[]): boolean => {
    // Check if avatar has pending upload
    if (fields.includes('avatarPath') && pendingAvatarFile) {
      return true;
    }
    
    // Check if any field values have changed
    return fields.some(field => branding[field] !== originalBranding[field]);
  };

  return (
    <div className="config-group full-width">
      <SectionHeader
        title="Branding"
        description="Customize your site's name, subtitle, and avatar"
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
            <label className="branding-label">Logo</label>
            <div 
              className={`avatar-upload-container ${isDraggingOver ? 'dragging-over' : ''}`}
              onDragOver={handleAvatarDragOver}
              onDragLeave={handleAvatarDragLeave}
              onDrop={handleAvatarDrop}
              onClick={handleAvatarClick}
              style={{ 
                cursor: 'pointer',
                position: 'relative',
                border: isDraggingOver ? '2px dashed var(--primary-color)' : '2px dashed transparent',
                transition: 'border 0.2s ease'
              }}
            >
              {(avatarPreviewUrl || branding.avatarPath) ? (
                <img
                  src={
                    avatarPreviewUrl ||
                    `${API_URL}${branding.avatarPath}?v=${Date.now()}`
                  }
                  alt="Current avatar"
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
                  border: '2px dashed rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '0.875rem',
                  textAlign: 'center',
                  padding: '1rem'
                }}>
                  <span>Click or drag image here</span>
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
                  Cancel
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    saveBrandingSection('Logo', ['avatarPath']);
                  }}
                  className="btn-primary btn-small"
                  disabled={savingBrandingSection === 'Logo'}
                >
                  {savingBrandingSection === 'Logo' ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          <div className="branding-group">
            <label className="branding-label">Site Name</label>
            <input
              type="text"
              value={branding.siteName}
              onChange={(e) =>
                handleBrandingChange("siteName", e.target.value)
              }
              className="branding-input"
              placeholder="Your site name"
              disabled={savingBrandingSection === 'Site Name'}
            />
            {hasBrandingChanges(['siteName']) && (
              <div className="section-button-group">
                <button 
                  onClick={() => cancelBrandingSection(['siteName'])} 
                  className="btn-secondary btn-small"
                  disabled={savingBrandingSection === 'Site Name'}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => saveBrandingSection('Site Name', ['siteName'])} 
                  className="btn-primary btn-small"
                  disabled={savingBrandingSection === 'Site Name'}
                >
                  {savingBrandingSection === 'Site Name' ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          <div className="branding-group">
            <label className="branding-label">Primary Color</label>
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
                  Cancel
                </button>
                <button 
                  onClick={() => saveBrandingSection('Primary Color', ['primaryColor'])} 
                  className="btn-primary btn-small"
                  disabled={savingBrandingSection === 'Primary Color'}
                >
                  {savingBrandingSection === 'Primary Color' ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          <div className="branding-group">
            <label className="branding-label">Secondary Color</label>
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
                  Cancel
                </button>
                <button 
                  onClick={() => saveBrandingSection('Secondary Color', ['secondaryColor'])} 
                  className="btn-primary btn-small"
                  disabled={savingBrandingSection === 'Secondary Color'}
                >
                  {savingBrandingSection === 'Secondary Color' ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          <div className="branding-group">
            <label className="branding-label">Meta Description</label>
            <textarea
              value={branding.metaDescription}
              onChange={(e) =>
                handleBrandingChange("metaDescription", e.target.value)
              }
              className="branding-textarea"
              placeholder="Brief description of your site for search engines"
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
                  Cancel
                </button>
                <button 
                  onClick={() => saveBrandingSection('Meta Description', ['metaDescription'])} 
                  className="btn-primary btn-small"
                  disabled={savingBrandingSection === 'Meta Description'}
                >
                  {savingBrandingSection === 'Meta Description' ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          <div className="branding-group">
            <label className="branding-label">Meta Keywords</label>
            <textarea
              value={branding.metaKeywords}
              onChange={(e) =>
                handleBrandingChange("metaKeywords", e.target.value)
              }
              className="branding-textarea"
              placeholder="photography, portfolio, your name (comma separated)"
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
                  Cancel
                </button>
                <button 
                  onClick={() => saveBrandingSection('Meta Keywords', ['metaKeywords'])} 
                  className="btn-primary btn-small"
                  disabled={savingBrandingSection === 'Meta Keywords'}
                >
                  {savingBrandingSection === 'Meta Keywords' ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandingSection;
