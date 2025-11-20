/**
 * Modal Navigation Component
 * Renders previous/next buttons and navigation hint
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  
  return (
    <>
      {showHint && (
        <div className="modal-navigation-hint">
          {t('photoModal.navigationHint')}
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

