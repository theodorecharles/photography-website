/**
 * Modal Navigation Component
 * Renders previous/next buttons and navigation hint
 */

import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '../icons/';

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
    <>
      {showHint && (
        <div className="modal-navigation-hint">
          ← press arrow keys to navigate →
        </div>
      )}
      
      <div className="modal-navigation" style={style}>
        <button onClick={onPrevious}>
          <ChevronLeftIcon width="32" height="32" />
        </button>
        
        <button onClick={onNext}>
          <ChevronRightIcon width="32" height="32" />
        </button>
      </div>
    </>
  );
};

export default ModalNavigation;

