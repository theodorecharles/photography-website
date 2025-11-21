/**
 * Section Header Component
 * Collapsible section header with chevron icon
 */

import React from 'react';
import { ChevronRightIcon } from '../../../icons';

interface SectionHeaderProps {
  title: string;
  description: string;
  isExpanded: boolean;
  onToggle: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  isExpanded,
  onToggle,
}) => {
  return (
    <div
      className="section-header"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "0.5rem",
        cursor: "pointer",
        padding: "1rem",
        background: "rgba(255, 255, 255, 0.02)",
        borderRadius: "8px",
        border: "1px solid rgba(255, 255, 255, 0.05)",
      }}
      onClick={onToggle}
    >
      <h3
        className="config-section-title"
        style={{
          margin: 0,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <ChevronRightIcon 
          width="20"
          height="20"
          style={{
            transition: "transform 0.2s",
            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        />
        {title}
      </h3>
      <span className="config-section-description" style={{ color: "#888", fontSize: "0.9rem" }}>
        {description}
      </span>
    </div>
  );
};

export default SectionHeader;
