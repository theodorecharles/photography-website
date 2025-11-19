/**
 * RestartModal Component
 * Handles server restart process with polling and user feedback
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../config';
import './RestartModal.css';

interface RestartModalProps {
  onClose: () => void;
  message?: string;
}

type RestartStatus = 'restarting' | 'polling' | 'success' | 'error';

export default function RestartModal({ onClose, message }: RestartModalProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<RestartStatus>('restarting');
  const [statusMessage, setStatusMessage] = useState(t('restartModal.restartingServer'));
  const [backendUp, setBackendUp] = useState(false);
  const [frontendUp, setFrontendUp] = useState(false);
  
  const MAX_WAIT_TIME = 120; // 2 minutes in seconds
  const POLL_INTERVAL = 1000; // 1 second

  // Check if backend is up
  const checkBackend = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/health`, {
        method: 'GET',
        cache: 'no-cache',
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  // Check if frontend is up
  const checkFrontend = async (): Promise<boolean> => {
    try {
      const response = await fetch('/health', {
        method: 'GET',
        cache: 'no-cache',
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  // Trigger server restart
  useEffect(() => {
    const triggerRestart = async () => {
      try {
        await fetch(`${API_URL}/api/system/restart`, {
          method: 'POST',
          credentials: 'include',
        });
        
        // Wait 5 seconds before starting to poll
        // This gives the server time to actually restart
        setTimeout(() => {
          setStatus('polling');
          setStatusMessage(t('restartModal.waitingForServer'));
        }, 5000);
      } catch (error) {
        // Expected - connection will be lost during restart
        setTimeout(() => {
          setStatus('polling');
          setStatusMessage(t('restartModal.waitingForServer'));
        }, 5000);
      }
    };

    triggerRestart();
  }, []);

  // Poll servers once they're in polling state
  useEffect(() => {
    if (status !== 'polling') return;

    const pollServers = async () => {
      const [backend, frontend] = await Promise.all([
        checkBackend(),
        checkFrontend(),
      ]);

      setBackendUp(backend);
      setFrontendUp(frontend);

      // Both servers are up!
      if (backend && frontend) {
        setStatusMessage('Both servers are online! Finalizing...');
        
        // Wait 1 second to show green lights
        setTimeout(() => {
          setStatus('success');
          setStatusMessage('Server restarted successfully!');
          
          // Auto-close after 2 seconds
          setTimeout(() => {
            // Dispatch event to trigger config reload
            window.dispatchEvent(new CustomEvent('config-updated'));
            onClose();
          }, 2000);
        }, 1000);
        return;
      }

      // Update status message based on what's up
      if (backend && !frontend) {
        setStatusMessage(t('restartModal.backendOnlineWaitingFrontend'));
      } else if (!backend && frontend) {
        setStatusMessage(t('restartModal.frontendOnlineWaitingBackend'));
      } else {
        setStatusMessage(t('restartModal.waitingForServers'));
      }
    };

    const interval = setInterval(pollServers, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [status, onClose]);

  // Track timeout (2 minutes)
  useEffect(() => {
    if (status !== 'polling') return;

    const timeout = setTimeout(() => {
      setStatus('error');
      setStatusMessage(t('restartModal.timeout'));
    }, MAX_WAIT_TIME * 1000);

    return () => clearTimeout(timeout);
  }, [status]);

  return (
    <div className="restart-modal-overlay">
      <div className="restart-modal">
        <div className="restart-modal-header">
          <h2>
            {status === 'restarting' && `🔄 ${t('restartModal.restartingServer')}`}
            {status === 'polling' && `⏳ ${t('restartModal.serverRestarting')}`}
            {status === 'success' && `✅ ${t('restartModal.restartComplete')}`}
            {status === 'error' && `❌ ${t('restartModal.restartFailed')}`}
          </h2>
        </div>

        <div className="restart-modal-body">
          {message && (
            <p className="restart-message">{message}</p>
          )}

          <p className="restart-status">{statusMessage}</p>

          {status === 'polling' && (
            <>
              <div className="restart-spinner-container">
                <div className="restart-spinner"></div>
              </div>

              <div className="restart-checks">
                <div className={`restart-check ${backendUp ? 'up' : 'polling'}`}>
                  <span className={`restart-status-light ${backendUp ? 'green' : 'yellow'}`}></span>
                  <span className="restart-check-label">{t('restartModal.backendServer')}</span>
                  <span className="restart-check-status">
                    {backendUp ? t('restartModal.online') : t('restartModal.restarting')}
                  </span>
                </div>
                <div className={`restart-check ${frontendUp ? 'up' : 'polling'}`}>
                  <span className={`restart-status-light ${frontendUp ? 'green' : 'yellow'}`}></span>
                  <span className="restart-check-label">{t('restartModal.frontendServer')}</span>
                  <span className="restart-check-status">
                    {frontendUp ? t('restartModal.online') : t('restartModal.restarting')}
                  </span>
                </div>
              </div>
            </>
          )}

          {status === 'success' && (
            <div className="restart-success-animation">
              <div className="restart-checkmark">✓</div>
            </div>
          )}

          {status === 'error' && (
            <>
              <div className="restart-checks">
                <div className="restart-check error">
                  <span className="restart-status-light red"></span>
                  <span className="restart-check-label">{t('restartModal.backendServer')}</span>
                  <span className="restart-check-status">{t('restartModal.timeout')}</span>
                </div>
                <div className="restart-check error">
                  <span className="restart-status-light red"></span>
                  <span className="restart-check-label">{t('restartModal.frontendServer')}</span>
                  <span className="restart-check-status">{t('restartModal.timeout')}</span>
                </div>
              </div>
              
              <p className="restart-error-details">
                {t('restartModal.timeoutDetails', { seconds: MAX_WAIT_TIME })}
              </p>
              <button onClick={onClose} className="btn-primary">
                {t('common.close')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

