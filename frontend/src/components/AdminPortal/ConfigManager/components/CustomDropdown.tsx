import React, { useState, useRef, useEffect } from 'react';

interface DropdownOption {
  value: string;
  label: string;
  emoji?: string;
}

interface CustomDropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
}

export default function CustomDropdown({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Select...',
  style = {},
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'relative',
        width: '100%',
        ...style,
      }}
    >
      {/* Dropdown Button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 0.75rem',
          background: disabled ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '6px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: disabled ? '#666' : '#e5e7eb',
          fontSize: '0.9rem',
          transition: 'all 0.2s',
          opacity: disabled ? 0.5 : 1,
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = 'rgba(74, 222, 128, 0.3)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          }
        }}
      >
        <span>
          {selectedOption ? (
            <>
              {selectedOption.emoji && `${selectedOption.emoji} `}
              {selectedOption.label}
            </>
          ) : (
            placeholder
          )}
        </span>
        <span
          style={{
            marginLeft: '0.5rem',
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▾
        </span>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div
          style={{
            position: 'fixed',
            ...(() => {
              if (!dropdownRef.current) return { top: 0, left: 0 };
              
              const rect = dropdownRef.current.getBoundingClientRect();
              const dropdownHeight = 300; // maxHeight
              const spaceBelow = window.innerHeight - rect.bottom;
              const spaceAbove = rect.top;
              
              // If not enough space below, flip upward
              const shouldFlipUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
              
              return {
                [shouldFlipUp ? 'bottom' : 'top']: shouldFlipUp 
                  ? window.innerHeight - rect.top + 4
                  : rect.bottom + 4,
                left: rect.left,
              };
            })(),
            width: dropdownRef.current
              ? dropdownRef.current.getBoundingClientRect().width
              : 'auto',
            background: '#2a2a2a',
            border: '1px solid #3a3a3a',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 100001,
            maxHeight: '300px',
            overflowY: 'auto',
            animation: 'dropdownFadeIn 0.15s ease-out',
          }}
        >
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => handleSelect(option.value)}
              style={{
                padding: '0.65rem 0.75rem',
                cursor: 'pointer',
                color: value === option.value ? '#4ade80' : '#e5e7eb',
                background: value === option.value ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
                transition: 'background 0.2s',
                fontSize: '0.9rem',
              }}
              onMouseEnter={(e) => {
                if (value !== option.value) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (value !== option.value) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {option.emoji && `${option.emoji} `}
              {option.label}
              {value === option.value && ' ✓'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
