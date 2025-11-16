/**
 * Modal Helper Utilities
 * 
 * Functions for managing confirmation modals and other modal interactions
 */

export interface ConfirmModalConfig {
  message: string;
  onConfirm: () => void;
}

/**
 * Shows a confirmation modal and returns a promise that resolves with the user's choice
 */
export const showConfirmation = (
  message: string,
  setShowConfirmModal: (show: boolean) => void,
  setConfirmConfig: (config: ConfirmModalConfig | null) => void
): Promise<boolean> => {
  return new Promise((resolve) => {
    setConfirmConfig({
      message,
      onConfirm: () => {
        setShowConfirmModal(false);
        setConfirmConfig(null);
        resolve(true);
      },
    });
    setShowConfirmModal(true);
    // Store reject function for cancel
    (window as any).__modalResolve = resolve;
  });
};

/**
 * Handles modal cancellation by cleaning up state and resolving promise with false
 */
export const handleModalCancel = (
  setShowConfirmModal: (show: boolean) => void,
  setConfirmConfig: (config: ConfirmModalConfig | null) => void
): void => {
  setShowConfirmModal(false);
  setConfirmConfig(null);
  if ((window as any).__modalResolve) {
    (window as any).__modalResolve(false);
    delete (window as any).__modalResolve;
  }
};

