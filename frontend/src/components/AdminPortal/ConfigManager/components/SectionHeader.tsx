/**
 * Section Header Component
 * Collapsible section header with chevron icon
 */

import React from 'react';

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
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            transition: "transform 0.2s",
            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        {title}
      </h3>
      <span style={{ color: "#888", fontSize: "0.9rem" }}>
        {description}
      </span>
    </div>
  );
};

export default SectionHeader;
