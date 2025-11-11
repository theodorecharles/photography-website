/**
 * SharedAlbum Component
 * Displays an album accessed via a share link
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PhotoGrid from './PhotoGrid';
import { API_URL } from '../config';
import ExpiredLink from './Misc/ExpiredLink';
import NotFound from './Misc/NotFound';
import Header from './Header';

interface Photo {
  id: string;
  src: string;
  thumbnail: string;
  modal: string;
  download: string;
  title: string;
  album: string;
  sort_order?: number | null;
  metadata?: {
    created: string;
    modified: string;
    size: number;
  };
  exif?: any;
}

interface ToastMessage {
  id: number;
  type: 'success' | 'error';
  text: string;
}

export default function SharedAlbum() {
  const { secretKey } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [albumName, setAlbumName] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    const validateShareLink = async () => {
      if (!secretKey) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/shared/${secretKey}`);
        
        if (response.status === 410) {
          // Link expired
          setExpired(true);
          setLoading(false);
          return;
        }
        
        if (!response.ok) {
          setError('Share link not found');
          setLoading(false);
          return;
        }

        const data = await response.json();
        setAlbumName(data.album);
        setPhotos(data.photos || []);
        setExpiresAt(data.expiresAt);
        setLoading(false);
      } catch (err) {
        console.error('Error validating share link:', err);
        setError('Failed to load shared album');
        setLoading(false);
      }
    };

    validateShareLink();
  }, [secretKey]);

  // Helper to add a toast message
  const addMessage = (message: { type: 'success' | 'error'; text: string }) => {
    const newMessage = { ...message, id: Date.now() + Math.random() };
    setMessages(prev => [newMessage, ...prev]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== newMessage.id));
    }, 5000);
  };

  const removeMessage = (id: number) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  // Countdown timer for expiration warnings and display
  useEffect(() => {
    if (!expiresAt) {
      setTimeRemaining('');
      return; // No expiration
    }

    const shownWarnings = new Set<string>();

    const checkExpiration = () => {
      const now = Date.now();
      const expiresAtTime = new Date(expiresAt).getTime();
      const timeLeft = expiresAtTime - now;
      const secondsLeft = Math.floor(timeLeft / 1000);
      const minutesLeft = Math.floor(timeLeft / 60000);
      const hoursLeft = Math.floor(timeLeft / 3600000);

      // Update countdown display
      if (timeLeft <= 0) {
        setTimeRemaining('EXPIRED');
      } else if (hoursLeft > 0) {
        const mins = Math.floor((timeLeft % 3600000) / 60000);
        const secs = Math.floor((timeLeft % 60000) / 1000);
        setTimeRemaining(`${hoursLeft}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      } else if (minutesLeft > 0) {
        const secs = Math.floor((timeLeft % 60000) / 1000);
        setTimeRemaining(`${minutesLeft}:${secs.toString().padStart(2, '0')}`);
      } else {
        setTimeRemaining(`0:${secondsLeft.toString().padStart(2, '0')}`);
      }

      if (timeLeft <= 0 && !shownWarnings.has('expired')) {
        shownWarnings.add('expired');
        addMessage({ type: 'error', text: 'EXPIRED!!!' });
        setTimeout(() => {
          setExpired(true);
        }, 2000);
        return;
      }

      // Show warnings at specific times (only once per warning)
      if (secondsLeft === 5 && !shownWarnings.has('5s')) {
        shownWarnings.add('5s');
        addMessage({ type: 'error', text: '⏰ 5 seconds left!' });
      } else if (secondsLeft === 10 && !shownWarnings.has('10s')) {
        shownWarnings.add('10s');
        addMessage({ type: 'error', text: '⏰ 10 seconds left!' });
      } else if (secondsLeft === 30 && !shownWarnings.has('30s')) {
        shownWarnings.add('30s');
        addMessage({ type: 'error', text: '⏰ 30 seconds left to look at this album!' });
      } else if (minutesLeft === 1 && secondsLeft >= 58 && secondsLeft <= 60 && !shownWarnings.has('1m')) {
        shownWarnings.add('1m');
        addMessage({ type: 'error', text: '⏰ 1 minute left!' });
      } else if (minutesLeft === 2 && secondsLeft >= 118 && secondsLeft <= 120 && !shownWarnings.has('2m')) {
        shownWarnings.add('2m');
        addMessage({ type: 'error', text: '⏰ 2 minutes left to look at this album!' });
      } else if (minutesLeft === 5 && secondsLeft >= 298 && secondsLeft <= 300 && !shownWarnings.has('5m')) {
        shownWarnings.add('5m');
        addMessage({ type: 'error', text: '⏰ 5 minutes left to look at this album!' });
      }
    };

    // Check immediately and then every second
    checkExpiration();
    const interval = setInterval(checkExpiration, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (loading) {
    return <div className="loading">Loading shared album...</div>;
  }

  if (expired) {
    return <ExpiredLink />;
  }

  if (error || !albumName) {
    return <NotFound />;
  }

  return (
    <>
      <Header 
        albums={[]} 
        externalLinks={[]} 
        currentAlbum={albumName}
        siteName=""
        avatarPath=""
        avatarCacheBust={0}
      />
      <PhotoGrid album={albumName} initialPhotos={photos} />
      
      {/* Countdown timer at bottom */}
      {timeRemaining && (
        <div className="countdown-timer">
          <span className="countdown-label">Time remaining:</span>
          <span className={`countdown-value ${timeRemaining === 'EXPIRED' ? 'expired' : ''}`}>
            {timeRemaining}
          </span>
        </div>
      )}
      
      {/* Toast notifications */}
      <div className="toast-container">
        {messages.map((message, index) => (
          <div 
            key={message.id} 
            className={`toast toast-${message.type}`}
            style={{ top: `${80 + index * 80}px` }}
          >
            <div className="toast-content">
              <span className="toast-icon">
                {message.type === 'success' ? '✓' : '⚠'}
              </span>
              <span className="toast-text">{message.text}</span>
              <button 
                className="toast-close"
                onClick={() => removeMessage(message.id)}
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <style>{`
        /* Toast Notification Container */
        .toast-container {
          position: fixed;
          top: 0;
          right: 20px;
          z-index: 9999;
          pointer-events: none;
        }

        /* Toast Notification */
        .toast {
          position: fixed;
          right: 20px;
          min-width: 300px;
          max-width: 500px;
          padding: 1rem 1.25rem;
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          animation: slideInRight 0.3s ease-out;
          transition: top 0.3s ease;
          pointer-events: all;
        }

        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .toast-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .toast-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
          line-height: 1;
        }

        .toast-text {
          flex: 1;
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .toast-close {
          background: none;
          border: none;
          color: inherit;
          font-size: 1.75rem;
          line-height: 1;
          padding: 0;
          margin-left: 0.5rem;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s ease, transform 0.2s ease;
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .toast-close:hover {
          opacity: 1;
          transform: scale(1.1);
        }

        .toast-close:active {
          transform: scale(0.95);
        }

        .toast-success {
          background: linear-gradient(135deg, rgba(26, 77, 46, 0.95) 0%, rgba(20, 60, 36, 0.95) 100%);
          border: 1.5px solid #4ade80;
          color: #4ade80;
        }

        .toast-success .toast-icon {
          color: #4ade80;
        }

        .toast-error {
          background: linear-gradient(135deg, rgba(77, 26, 26, 0.95) 0%, rgba(60, 20, 20, 0.95) 100%);
          border: 1.5px solid #f87171;
          color: #f87171;
        }

        .toast-error .toast-icon {
          color: #f87171;
        }

        @media (max-width: 600px) {
          .toast-container {
            right: 10px;
            left: 10px;
          }
          
          .toast {
            right: 10px;
            left: 10px;
            min-width: auto;
          }
        }

        /* Countdown timer */
        .countdown-timer {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, rgba(26, 26, 26, 0.95) 0%, rgba(15, 15, 15, 0.95) 100%);
          border: 1.5px solid rgba(255, 255, 255, 0.2);
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          gap: 1rem;
          z-index: 1000;
        }

        .countdown-label {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .countdown-value {
          font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Courier New', monospace;
          font-size: 1.2rem;
          font-weight: 600;
          color: #4ade80;
          min-width: 60px;
          text-align: center;
        }

        .countdown-value.expired {
          color: #f87171;
          animation: pulse 0.5s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @media (max-width: 600px) {
          .countdown-timer {
            bottom: 10px;
            padding: 0.5rem 1rem;
          }

          .countdown-label {
            font-size: 0.8rem;
          }

          .countdown-value {
            font-size: 1rem;
            min-width: 50px;
          }
        }
      `}</style>
    </>
  );
}
