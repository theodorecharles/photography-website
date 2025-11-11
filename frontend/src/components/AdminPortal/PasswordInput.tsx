import { useState } from "react";
import "./PasswordInput.css";

interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  className = "",
  placeholder = "",
  inputRef,
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
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="password-input-wrapper">
      <input
        ref={inputRef}
        type={isVisible ? "text" : "password"}
        value={value}
        onChange={onChange}
        className={className}
        placeholder={placeholder}
      />
      <div className="password-input-buttons">
        <button
          type="button"
          className="password-toggle-btn"
          onClick={toggleVisibility}
          title={isVisible ? "Hide password" : "Show password"}
          aria-label={isVisible ? "Hide password" : "Show password"}
        >
          {isVisible ? (
            // Eye slash icon (hidden)
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            // Eye icon (visible)
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
        {value && (
          <button
            type="button"
            className="password-copy-btn"
            onClick={copyToClipboard}
            title="Copy to clipboard"
            aria-label="Copy to clipboard"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
