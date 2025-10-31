/**
 * Modal Controls Component
 * Renders the top control buttons: info, copy link, download, fullscreen, close
 */

import React from 'react';
import { Photo } from './types';

interface ModalControlsProps {
  show: boolean;
  showInfo: boolean;
  copiedLink: boolean;
  isFullscreen: boolean;
  onToggleInfo: () => void;
  onCopyLink: (photo: Photo) => void;
  onDownload: (photo: Photo) => void;
  onToggleFullscreen: () => void;
  onClose: () => void;
  selectedPhoto: Photo;
  style?: React.CSSProperties;
}

const ModalControls: React.FC<ModalControlsProps> = ({
  show,
  showInfo,
  copiedLink,
  isFullscreen,
  onToggleInfo,
  onCopyLink,
  onDownload,
  onToggleFullscreen,
  onClose,
  selectedPhoto,
  style,
}) => {
  return (
    <div
      className="modal-controls-top"
      style={{ opacity: show ? 1 : 0, ...style }}
    >
      {/* Info button */}
      <button
        onClick={onToggleInfo}
        className={showInfo ? 'active' : ''}
        title="Photo information"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </button>

      {/* Copy link button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCopyLink(selectedPhoto);
        }}
        title={copiedLink ? "Copied!" : "Copy link"}
        className={copiedLink ? "copied" : ""}
      >
        {copiedLink ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        )}
      </button>

      {/* Download button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDownload(selectedPhoto);
        }}
        title="Download photo"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>

      {/* Fullscreen button */}
      <button
        className="fullscreen-toggle"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFullscreen();
        }}
        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      >
        {isFullscreen ? (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
          </svg>
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        )}
      </button>

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        title="Close"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

export default ModalControls;

