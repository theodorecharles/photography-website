/**
 * ShareModal Component
 * Modal for creating and managing share links for unpublished albums
 */

import { useState } from 'react';
import { API_URL, SITE_URL } from '../../config';
import './ShareModal.css';

interface ShareModalProps {
  album: string;
  onClose: () => void;
}

const EXPIRATION_OPTIONS = [
  { label: '15 minutes', minutes: 15 },
  { label: '1 hour', minutes: 60 },
  { label: '12 hours', minutes: 720 },
  { label: '1 day', minutes: 1440 },
  { label: '1 week', minutes: 10080 },
  { label: '1 month', minutes: 43200 },
  { label: 'Forever', minutes: null },
];

export default function ShareModal({ album, onClose }: ShareModalProps) {
  const [selectedExpiration, setSelectedExpiration] = useState<number | null>(1440); // Default: 1 day
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      // Try modern clipboard API first
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback to older method
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch (fallbackErr) {
        console.error('Fallback clipboard copy failed:', fallbackErr);
        return false;
      }
    }
  };

  const generateAndCopyLink = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      // Create share link (no CSRF token needed - auth is checked via session)
      const response = await fetch(`${API_URL}/api/share-links/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          album,
          expirationMinutes: selectedExpiration,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create share link');
      }

      const data = await response.json();
      
      // Copy to clipboard
      const url = `${SITE_URL}/shared/${data.shareLink.secretKey}`;
      const copySuccess = await copyToClipboard(url);
      
      if (copySuccess) {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } else {
        setError('Failed to copy link to clipboard. Please try again.');
      }
    } catch (err) {
      console.error('Error generating share link:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate share link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h2>Share Album: {album}</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="share-modal-content">
          <p className="share-description">
            Create a shareable link to give visitors access to this unpublished album.
            The link can be set to expire after a certain time.
          </p>

          <div className="expiration-selector">
            <label htmlFor="expiration">Link expires in:</label>
            <select
              id="expiration"
              value={selectedExpiration === null ? 'null' : selectedExpiration}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedExpiration(value === 'null' ? null : parseInt(value));
              }}
            >
              {EXPIRATION_OPTIONS.map((option) => (
                <option
                  key={option.label}
                  value={option.minutes === null ? 'null' : option.minutes}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {error && <div className="share-error">{error}</div>}
          {copied && <div className="share-success-inline">✓ Link copied to clipboard!</div>}

          <button
            className="generate-button"
            onClick={generateAndCopyLink}
            disabled={loading}
          >
            {loading ? 'Copying...' : 'Copy Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
