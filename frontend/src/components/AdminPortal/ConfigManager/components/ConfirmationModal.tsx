/**
 * Confirmation Modal Component
 * Reusable modal for confirming dangerous actions
 */

import React from 'react';

interface ConfirmationModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  message,
  onConfirm,
  onCancel,
}) => {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "1rem",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: "#1a1a1a",
          border: "2px solid rgba(255, 255, 255, 0.2)",
          borderRadius: "12px",
          padding: "2rem",
          maxWidth: "500px",
          width: "100%",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            color: "#e5e7eb",
            fontSize: "1.1rem",
            lineHeight: "1.6",
            marginBottom: "2rem",
            whiteSpace: "pre-wrap",
          }}
        >
          {message}
        </div>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onCancel}
            className="btn-secondary"
            style={{ minWidth: "100px" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn-primary"
            style={{ minWidth: "100px" }}
            autoFocus
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
