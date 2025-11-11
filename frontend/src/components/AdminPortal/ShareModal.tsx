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

interface ShareLink {
  id: number;
  album: string;
  secretKey: string;
  expiresAt: string | null;
  createdAt: string;
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
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateShareLink = async () => {
    setLoading(true);
    setError(null);

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
      setShareLink(data.shareLink);
      
      // Auto-copy to clipboard after generation
      const url = `${SITE_URL}/shared/${data.shareLink.secretKey}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (err) {
      console.error('Error generating share link:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate share link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!shareLink) return;

    const url = `${SITE_URL}/shared/${shareLink.secretKey}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getShareUrl = () => {
    if (!shareLink) return '';
    return `${SITE_URL}/shared/${shareLink.secretKey}`;
  };

  const formatExpirationDate = (expiresAt: string | null) => {
    if (!expiresAt) return 'Never';
    const date = new Date(expiresAt);
    return date.toLocaleString();
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
          {!shareLink ? (
            <>
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

              <button
                className="generate-button"
                onClick={generateShareLink}
                disabled={loading}
              >
                {loading ? 'Copying...' : 'Copy Link'}
              </button>
            </>
          ) : (
            <>
              <div className="share-success">
                <div className="success-icon">✓</div>
                <p>Share link created successfully!</p>
              </div>

              <div className="share-link-info">
                <div className="share-link-label">Share URL:</div>
                <div className="share-link-url">
                  <input
                    type="text"
                    value={getShareUrl()}
                    readOnly
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    className={`copy-button ${copied ? 'copied' : ''}`}
                    onClick={copyToClipboard}
                  >
                    {copied ? '✓ Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>

              <div className="share-details">
                <div className="share-detail">
                  <strong>Expires:</strong> {formatExpirationDate(shareLink.expiresAt)}
                </div>
                <div className="share-detail">
                  <strong>Created:</strong> {new Date(shareLink.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="share-actions">
                <button className="done-button" onClick={onClose}>
                  Done
                </button>
                <button
                  className="new-link-button"
                  onClick={() => {
                    setShareLink(null);
                    setCopied(false);
                  }}
                >
                  Create Another Link
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
