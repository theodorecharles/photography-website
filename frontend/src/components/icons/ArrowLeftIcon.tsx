/**
 * Arrow Left Icon Component
 */

import React from 'react';

interface ArrowLeftIconProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

const ArrowLeftIcon: React.FC<ArrowLeftIconProps> = ({ width = 24, height = 24, className, style }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
};

export default ArrowLeftIcon;

