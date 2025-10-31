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
  setMessage: (message: { type: 'success' | 'error'; text: string } | null) => void;
}

const LinksManager: React.FC<LinksManagerProps> = ({
  externalLinks,
  setExternalLinks,
  setMessage,
}) => {
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newLinks = [...externalLinks];
    const draggedItem = newLinks[draggedIndex];
    
    // Remove from old position
    newLinks.splice(draggedIndex, 1);
    // Insert at new position
    newLinks.splice(dropIndex, 0, draggedItem);
    
    setExternalLinks(newLinks);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSaveLinks = async () => {
    setSaving(true);
    setMessage(null);
    
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
          <div key={index}>
            {/* Show drop preview before this item if it's the drag target */}
            {dragOverIndex === index && draggedIndex !== null && (
              <div className="drop-preview">
                <div className="drag-handle">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="3" y1="15" x2="21" y2="15" />
                  </svg>
                </div>
                <div className="link-fields">
                  <input
                    type="text"
                    placeholder="Title"
                    value={externalLinks[draggedIndex].title}
                    className="link-input"
                    readOnly
                    disabled
                  />
                  <input
                    type="text"
                    placeholder="URL"
                    value={externalLinks[draggedIndex].url}
                    className="link-input"
                    readOnly
                    disabled
                  />
                </div>
                <button className="btn-delete" disabled>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            )}
            
            <div
              className={`link-item ${draggedIndex === index ? 'dragging' : ''}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className="drag-handle" title="Drag to reorder">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="3" y1="15" x2="21" y2="15" />
                </svg>
              </div>
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
              <button
                onClick={() => handleDeleteLink(index)}
                className="btn-delete"
                title="Delete link"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
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

