import type { MessageType } from './types';

/**
 * Helper to wrap API calls with loading state and error handling
 */
export async function withLoadingAndErrorHandling<T>(
  setLoading: (loading: boolean) => void,
  setMessage: (message: MessageType) => void,
  apiCall: () => Promise<T>,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: (result: T) => void;
  }
): Promise<void> {
  setLoading(true);
  try {
    const result = await apiCall();
    if (options?.successMessage) {
      setMessage({ type: 'success', text: options.successMessage });
    }
    if (options?.onSuccess) {
      options.onSuccess(result);
    }
  } catch (err: any) {
    setMessage({
      type: 'error',
      text: err.message || options?.errorMessage || 'Operation failed',
    });
  } finally {
    setLoading(false);
  }
}

/**
 * Helper to create confirmation modal state
 */
export function createConfirmModal(
  title: string,
  message: string,
  confirmText: string,
  onConfirm: () => void,
  options?: {
    isDangerous?: boolean;
    requirePassword?: boolean;
  }
) {
  return {
    show: true,
    title,
    message,
    confirmText,
    onConfirm,
    isDangerous: options?.isDangerous || false,
    requirePassword: options?.requirePassword || false,
  };
}

