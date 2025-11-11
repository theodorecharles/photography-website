/**
 * Branding Manager Component
 * Manages site branding settings including avatar, site name, and meta tags
 */

import { useState } from 'react';
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
  const [savingBranding, setSavingBranding] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

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

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    setMessage(null);
    
    try {
      // Keep track of the updated branding data to send
      let updatedBranding = { ...branding };
      
      // First upload avatar if there's a pending file
      if (pendingAvatarFile) {
        const formData = new FormData();
        formData.append('avatar', pendingAvatarFile);

        const avatarRes = await fetch(`${API_URL}/api/branding/upload-avatar`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (avatarRes.ok) {
          const data = await avatarRes.json();
          // Update both state and our local copy
          updatedBranding.avatarPath = data.avatarPath;
          setBranding({
            ...branding,
            avatarPath: data.avatarPath
          });
          // Track avatar upload
          trackAvatarUpload();
          // Clear pending avatar
          setPendingAvatarFile(null);
          setAvatarPreviewUrl(null);
        } else {
          const errorData = await avatarRes.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Avatar upload failed:', avatarRes.status, errorData);
          throw new Error(errorData.error || 'Failed to upload avatar');
        }
      }

      // Then save branding settings with the updated avatarPath
      const res = await fetch(`${API_URL}/api/branding`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedBranding),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Branding settings saved successfully!' });
        // Track branding update - track all branding fields that could have changed
        const updatedFields = Object.keys(branding).filter(key => branding[key as keyof BrandingConfig]);
        trackBrandingUpdate(updatedFields);
        // Reload branding to get fresh avatar path with updated timestamp
        await loadBranding();
        // Notify main app to refresh site name
        window.dispatchEvent(new Event('branding-updated'));
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Branding save failed:', res.status, errorData);
        setMessage({ type: 'error', text: errorData.error || 'Failed to save branding settings' });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error saving branding settings';
      setMessage({ type: 'error', text: errorMessage });
      console.error('Failed to save branding settings:', err);
    } finally {
      setSavingBranding(false);
    }
  };

  return (
    <section className="admin-section">
      <h2>🎨 Branding</h2>
      <p className="section-description">Customize your site's appearance, colors, and branding</p>
      
      <div className="branding-grid">
        <div className="branding-group">
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
              {pendingAvatarFile ? 'Upload Logo' : 'Edit Logo'}
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
                disabled={savingBranding}
              />
            </label>
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
          />
        </div>

        <div className="branding-group">
          <label className="branding-label">Primary Color</label>
          <div className="color-input-group">
            <input
              type="color"
              value={branding.primaryColor}
              onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
              className="color-picker"
            />
            <input
              type="text"
              value={branding.primaryColor}
              onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
              className="branding-input color-text"
              placeholder="#4ade80"
            />
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
            />
            <input
              type="text"
              value={branding.secondaryColor}
              onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
              className="branding-input color-text"
              placeholder="#3b82f6"
            />
          </div>
        </div>

        <div className="branding-group full-width">
          <label className="branding-label">Meta Description</label>
          <textarea
            value={branding.metaDescription}
            onChange={(e) => handleBrandingChange('metaDescription', e.target.value)}
            className="branding-textarea"
            placeholder="Brief description of your site for search engines"
            rows={3}
          />
        </div>

        <div className="branding-group full-width">
          <label className="branding-label">Meta Keywords</label>
          <input
            type="text"
            value={branding.metaKeywords}
            onChange={(e) => handleBrandingChange('metaKeywords', e.target.value)}
            className="branding-input"
            placeholder="photography, portfolio, your name (comma separated)"
          />
        </div>

      </div>

      <div className="section-actions">
        <button 
          onClick={handleSaveBranding} 
          className="btn-primary"
          disabled={savingBranding}
        >
          {savingBranding ? 'Saving...' : 'Save'}
        </button>
      </div>
    </section>
  );
};

export default BrandingManager;

