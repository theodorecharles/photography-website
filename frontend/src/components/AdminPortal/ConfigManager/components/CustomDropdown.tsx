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
  openUpward?: boolean;
}

export default function CustomDropdown({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Select...',
  style = {},
  openUpward = false,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside or scrolling (but not when scrolling inside the dropdown)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleScroll = (event: Event) => {
      // Don't close if scrolling within the dropdown menu itself
      if (menuRef.current && menuRef.current.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    const handleMenuScroll = (event: Event) => {
      // Stop propagation to prevent parent scroll events from closing the dropdown
      event.stopPropagation();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true); // Use capture phase to catch all scroll events
      
      // Add scroll listener to menu to stop propagation
      if (menuRef.current) {
        menuRef.current.addEventListener('scroll', handleMenuScroll);
      }
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
        if (menuRef.current) {
          menuRef.current.removeEventListener('scroll', handleMenuScroll);
        }
      };
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
          ref={menuRef}
          style={{
            position: 'absolute',
            ...(openUpward ? { bottom: '100%', marginBottom: '4px' } : { top: '100%', marginTop: '4px' }),
            left: 0,
            right: 0,
            background: '#1a1a1a',
            border: '1px solid #3a3a3a',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            zIndex: 999999,
            maxHeight: '300px',
            overflowY: 'auto',
            overscrollBehavior: 'contain', // Prevent scroll chaining to parent
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
