/**
 * Simple toast notification system for analytics debugging
 */

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
  duration?: number;
}

let toastContainer: HTMLDivElement | null = null;
let toastId = 0;

function getOrCreateContainer(): HTMLDivElement {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'analytics-toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function showToast(message: string, type: 'info' | 'success' | 'error' = 'info', duration = 3000) {
  const container = getOrCreateContainer();
  const id = `toast-${toastId++}`;
  
  const toast = document.createElement('div');
  toast.id = id;
  toast.style.cssText = `
    background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#3b82f6'};
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    font-size: 14px;
    max-width: 300px;
    pointer-events: auto;
    animation: slideIn 0.3s ease-out;
    opacity: 0.95;
  `;
  
  toast.textContent = message;
  container.appendChild(toast);
  
  // Auto-remove after duration
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}

// Add CSS animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 0.95;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 0.95;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}
