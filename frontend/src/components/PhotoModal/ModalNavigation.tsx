/**
 * Modal Navigation Component
 * Renders previous/next buttons and navigation hint
 */

import React from 'react';

interface ModalNavigationProps {
  showHint: boolean;
  onPrevious: () => void;
  onNext: () => void;
  style?: React.CSSProperties;
}

const ModalNavigation: React.FC<ModalNavigationProps> = ({
  showHint,
  onPrevious,
  onNext,
  style,
}) => {
  return (
    <div className="modal-navigation-container" style={style}>
      {showHint && (
        <div className="modal-navigation-hint">
          ← press arrow keys to navigate →
        </div>
      )}
      
      <div className="modal-navigation">
        <button onClick={onPrevious}>
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 12L18 18" />
          </svg>
        </button>
        
        <button onClick={onNext}>
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 6L18 12L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ModalNavigation;

