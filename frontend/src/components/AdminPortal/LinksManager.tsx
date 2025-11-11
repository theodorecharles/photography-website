/**
 * Links Manager Component
 * Manages external links shown in the navigation menu
 */

import { useState } from 'react';
import { ExternalLink } from './types';
import { trackExternalLinksUpdate } from '../../utils/analytics';
import './LinksManager.css';

const API_URL = import.meta.env.VITE_API_URL || '';

interface LinksManagerProps {
  externalLinks: ExternalLink[];
  setExternalLinks: (links: ExternalLink[]) => void;
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
}

const LinksManager: React.FC<LinksManagerProps> = ({
  externalLinks,
  setExternalLinks,
  setMessage,
}) => {
  const [saving, setSaving] = useState(false);

  const handleAddLink = () => {
    setExternalLinks([...externalLinks, { title: '', url: '' }]);
  };

  const handleDeleteLink = (index: number) => {
    setExternalLinks(externalLinks.filter((_, i) => i !== index));
  };

  const handleLinkChange = (index: number, field: 'title' | 'url', value: string) => {
    const newLinks = [...externalLinks];
    newLinks[index][field] = value;
    setExternalLinks(newLinks);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newLinks = [...externalLinks];
    const temp = newLinks[index];
    newLinks[index] = newLinks[index - 1];
    newLinks[index - 1] = temp;
    setExternalLinks(newLinks);
  };

  const handleMoveDown = (index: number) => {
    if (index === externalLinks.length - 1) return;
    const newLinks = [...externalLinks];
    const temp = newLinks[index];
    newLinks[index] = newLinks[index + 1];
    newLinks[index + 1] = temp;
    setExternalLinks(newLinks);
  };

  const handleSaveLinks = async () => {
    setSaving(true);
    
    try {
      const res = await fetch(`${API_URL}/api/external-links`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ links: externalLinks }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'External links saved successfully!' });
        trackExternalLinksUpdate(externalLinks.length);
        
        // Dispatch event to update header
        window.dispatchEvent(new Event('external-links-updated'));
      } else {
        const errorData = await res.json();
        setMessage({ 
          type: 'error', 
          text: errorData.error || 'Failed to save external links' 
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-section">
      <h2>🔗 External Links</h2>
      <p className="section-description">Manage links shown in the navigation menu</p>
      
      <div className="links-list">
        {externalLinks.map((link, index) => (
          <div key={index} className="link-wrapper">
            <div className="link-item">
              <div className="link-fields">
                <input
                  type="text"
                  placeholder="Title"
                  value={link.title}
                  onChange={(e) => handleLinkChange(index, 'title', e.target.value)}
                  className="link-input"
                />
                <input
                  type="text"
                  placeholder="URL"
                  value={link.url}
                  onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                  className="link-input"
                />
              </div>
              <div className="link-controls">
                <div className="reorder-buttons">
                  <button
                    onClick={() => handleMoveUp(index)}
                    className="btn-reorder"
                    title="Move up"
                    disabled={index === 0}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    className="btn-reorder"
                    title="Move down"
                    disabled={index === externalLinks.length - 1}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={() => handleDeleteLink(index)}
                  className="btn-delete-link"
                  title="Delete link"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="section-actions">
        <button onClick={handleAddLink} className="btn-secondary">
          + Add Link
        </button>
        <button 
          onClick={handleSaveLinks} 
          className="btn-primary"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </section>
  );
};

export default LinksManager;

