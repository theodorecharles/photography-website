/**
 * Branding Manager Component
 * Manages site branding settings including avatar, site name, and meta tags
 */

import { useState, useEffect } from 'react';
import { BrandingConfig } from './types';
import { trackBrandingUpdate, trackAvatarUpload } from '../../utils/analytics';
import './BrandingManager.css';

const API_URL = import.meta.env.VITE_API_URL || '';

interface BrandingManagerProps {
  branding: BrandingConfig;
  setBranding: (branding: BrandingConfig) => void;
  loadBranding: () => Promise<void>;
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
}

const BrandingManager: React.FC<BrandingManagerProps> = ({
  branding,
  setBranding,
  loadBranding,
  setMessage,
}) => {
  const [originalBranding, setOriginalBranding] = useState<BrandingConfig>(branding);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  // Update original branding when parent branding changes (e.g., after loadBranding)
  useEffect(() => {
    setOriginalBranding(branding);
  }, [branding]);

  const handleAvatarFileSelect = (file: File) => {
    // Use FileReader to create data URL for better cross-origin compatibility
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    setPendingAvatarFile(file);
  };

  const handleBrandingChange = (field: keyof BrandingConfig, value: string) => {
    setBranding({
      ...branding,
      [field]: value
    });
  };

  const saveBrandingSection = async (sectionName: string, fields: (keyof BrandingConfig)[]) => {
    setSavingSection(sectionName);
    
    try {
      // Prepare the branding data to save
      let updatedBranding = { ...branding };
      
      // If this is the avatar section and there's a pending file, upload it first
      if (sectionName === 'avatar' && pendingAvatarFile) {
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
          console.error('Avatar upload failed:', avatarRes.status, errorData);
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
        console.error('Branding save failed:', res.status, errorData);
        setMessage({ type: 'error', text: errorData.error || `Failed to save ${sectionName}` });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Error saving ${sectionName}`;
      setMessage({ type: 'error', text: errorMessage });
      console.error(`Failed to save ${sectionName}:`, err);
    } finally {
      setSavingSection(null);
    }
  };

  const cancelSection = (fields: (keyof BrandingConfig)[]) => {
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

  return (
    <section className="admin-section">
      <h2>🎨 Branding</h2>
      <p className="section-description">Customize your site's appearance, colors, and branding</p>
      
      <div className="branding-grid">
        <div className="branding-group">
          <label className="branding-label">Logo</label>
          <div className="avatar-upload-container">
            {(avatarPreviewUrl || branding.avatarPath) && (
              <img 
                src={avatarPreviewUrl || `${API_URL}${branding.avatarPath}?v=${Date.now()}`} 
                alt="Current avatar"
                className="current-avatar-preview"
                key={avatarPreviewUrl || branding.avatarPath}
              />
            )}
            <label className="btn-secondary upload-avatar-btn">
              {pendingAvatarFile ? 'Change Logo' : 'Edit Logo'}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleAvatarFileSelect(file);
                  }
                }}
                style={{ display: 'none' }}
                disabled={savingSection === 'avatar'}
              />
            </label>
          </div>
          <div className="section-button-group">
            <button 
              onClick={() => saveBrandingSection('Logo', ['avatarPath'])} 
              className="btn-primary btn-small"
              disabled={savingSection === 'avatar'}
            >
              {savingSection === 'avatar' ? 'Saving...' : 'Save'}
            </button>
            <button 
              onClick={() => cancelSection(['avatarPath'])} 
              className="btn-secondary btn-small"
              disabled={savingSection === 'avatar'}
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="branding-group">
          <label className="branding-label">Site Name</label>
          <input
            type="text"
            value={branding.siteName}
            onChange={(e) => handleBrandingChange('siteName', e.target.value)}
            className="branding-input"
            placeholder="Your site name"
            disabled={savingSection === 'siteName'}
          />
          <div className="section-button-group">
            <button 
              onClick={() => saveBrandingSection('Site Name', ['siteName'])} 
              className="btn-primary btn-small"
              disabled={savingSection === 'siteName'}
            >
              {savingSection === 'siteName' ? 'Saving...' : 'Save'}
            </button>
            <button 
              onClick={() => cancelSection(['siteName'])} 
              className="btn-secondary btn-small"
              disabled={savingSection === 'siteName'}
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="branding-group">
          <label className="branding-label">Primary Color</label>
          <div className="color-input-group">
            <input
              type="color"
              value={branding.primaryColor}
              onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
              className="color-picker"
              disabled={savingSection === 'primaryColor'}
            />
            <input
              type="text"
              value={branding.primaryColor}
              onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
              className="branding-input color-text"
              placeholder="#4ade80"
              disabled={savingSection === 'primaryColor'}
            />
          </div>
          <div className="section-button-group">
            <button 
              onClick={() => saveBrandingSection('Primary Color', ['primaryColor'])} 
              className="btn-primary btn-small"
              disabled={savingSection === 'primaryColor'}
            >
              {savingSection === 'primaryColor' ? 'Saving...' : 'Save'}
            </button>
            <button 
              onClick={() => cancelSection(['primaryColor'])} 
              className="btn-secondary btn-small"
              disabled={savingSection === 'primaryColor'}
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="branding-group">
          <label className="branding-label">Secondary Color</label>
          <div className="color-input-group">
            <input
              type="color"
              value={branding.secondaryColor}
              onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
              className="color-picker"
              disabled={savingSection === 'secondaryColor'}
            />
            <input
              type="text"
              value={branding.secondaryColor}
              onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
              className="branding-input color-text"
              placeholder="#3b82f6"
              disabled={savingSection === 'secondaryColor'}
            />
          </div>
          <div className="section-button-group">
            <button 
              onClick={() => saveBrandingSection('Secondary Color', ['secondaryColor'])} 
              className="btn-primary btn-small"
              disabled={savingSection === 'secondaryColor'}
            >
              {savingSection === 'secondaryColor' ? 'Saving...' : 'Save'}
            </button>
            <button 
              onClick={() => cancelSection(['secondaryColor'])} 
              className="btn-secondary btn-small"
              disabled={savingSection === 'secondaryColor'}
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="branding-group">
          <label className="branding-label">Meta Description</label>
          <textarea
            value={branding.metaDescription}
            onChange={(e) => handleBrandingChange('metaDescription', e.target.value)}
            className="branding-textarea"
            placeholder="Brief description of your site for search engines"
            rows={3}
            disabled={savingSection === 'metaDescription'}
          />
          <div className="section-button-group">
            <button 
              onClick={() => saveBrandingSection('Meta Description', ['metaDescription'])} 
              className="btn-primary btn-small"
              disabled={savingSection === 'metaDescription'}
            >
              {savingSection === 'metaDescription' ? 'Saving...' : 'Save'}
            </button>
            <button 
              onClick={() => cancelSection(['metaDescription'])} 
              className="btn-secondary btn-small"
              disabled={savingSection === 'metaDescription'}
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="branding-group">
          <label className="branding-label">Meta Keywords</label>
          <textarea
            value={branding.metaKeywords}
            onChange={(e) => handleBrandingChange('metaKeywords', e.target.value)}
            className="branding-textarea"
            placeholder="photography, portfolio, your name (comma separated)"
            rows={3}
            disabled={savingSection === 'metaKeywords'}
          />
          <div className="section-button-group">
            <button 
              onClick={() => saveBrandingSection('Meta Keywords', ['metaKeywords'])} 
              className="btn-primary btn-small"
              disabled={savingSection === 'metaKeywords'}
            >
              {savingSection === 'metaKeywords' ? 'Saving...' : 'Save'}
            </button>
            <button 
              onClick={() => cancelSection(['metaKeywords'])} 
              className="btn-secondary btn-small"
              disabled={savingSection === 'metaKeywords'}
            >
              Cancel
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};

export default BrandingManager;

