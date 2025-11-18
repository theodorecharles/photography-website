import { useState } from "react";
import "./PasswordInput.css";
import { EyeIcon, CopyIcon } from "../icons/";
import { error } from '../../utils/logger';

interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  required?: boolean;
  disabled?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  className = "",
  placeholder = "",
  inputRef,
  required = false,
  disabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value);
      // Optional: Could add a toast notification here
    } catch (err) {
      error("Failed to copy:", err);
    }
  };

  return (
    <div className="password-input-wrapper">
      <input
        ref={inputRef}
        type={isVisible ? "text" : "password"}
        value={value}
        onChange={onChange}
        className={`branding-input ${className}`}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
      />
      <div className="password-input-buttons">
        <button
          type="button"
          className="password-toggle-btn"
          onClick={toggleVisibility}
          title={isVisible ? "Hide password" : "Show password"}
          aria-label={isVisible ? "Hide password" : "Show password"}
          disabled={disabled}
        >
          <EyeIcon width="18" height="18" isSlashed={isVisible} />
        </button>
        {value && (
          <button
            type="button"
            className="password-copy-btn"
            onClick={copyToClipboard}
            title="Copy to clipboard"
            aria-label="Copy to clipboard"
            disabled={disabled}
          >
            <CopyIcon width="16" height="16" />
          </button>
        )}
      </div>
    </div>
  );
};
