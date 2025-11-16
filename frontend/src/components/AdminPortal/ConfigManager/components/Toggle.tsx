/**
 * Toggle Switch Component
 * Reusable toggle/switch UI element
 */

import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled = false, label }) => {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        onClick={disabled ? undefined : onChange}
        style={{
          position: 'relative',
          width: '44px',
          height: '24px',
          background: checked ? 'var(--primary-color, #4ade80)' : '#3a3a3a',
          borderRadius: '12px',
          transition: 'background 0.2s ease',
          cursor: disabled ? 'not-allowed' : 'pointer',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: checked ? '22px' : '2px',
            width: '20px',
            height: '20px',
            background: 'white',
            borderRadius: '50%',
            transition: 'left 0.2s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          }}
        />
      </div>
      {label && (
        <span
          style={{
            marginLeft: '0.75rem',
            color: disabled ? '#888' : '#e5e7eb',
            fontSize: '0.95rem',
          }}
        >
          {label}
        </span>
      )}
    </label>
  );
};

