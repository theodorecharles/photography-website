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

export default function SharedAlbum() {
  const { secretKey } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [albumName, setAlbumName] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

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

  // Countdown timer for expiration warnings
  useEffect(() => {
    if (!expiresAt) return; // No expiration

    const checkExpiration = () => {
      const now = Date.now();
      const expiresAtTime = new Date(expiresAt).getTime();
      const timeLeft = expiresAtTime - now;
      const secondsLeft = Math.floor(timeLeft / 1000);
      const minutesLeft = Math.floor(timeLeft / 60000);

      if (timeLeft <= 0) {
        setShowWarning(true);
        setWarningMessage('EXPIRED!!!');
        setTimeout(() => {
          setExpired(true);
        }, 2000);
        return;
      }

      // Show warnings at specific times
      if (secondsLeft === 5) {
        setShowWarning(true);
        setWarningMessage('5 seconds left!');
        setTimeout(() => setShowWarning(false), 3000);
      } else if (secondsLeft === 10) {
        setShowWarning(true);
        setWarningMessage('10 seconds left!');
        setTimeout(() => setShowWarning(false), 3000);
      } else if (secondsLeft === 30) {
        setShowWarning(true);
        setWarningMessage('30 seconds left to look at this album!');
        setTimeout(() => setShowWarning(false), 3000);
      } else if (minutesLeft === 1 && secondsLeft >= 58 && secondsLeft <= 60) {
        setShowWarning(true);
        setWarningMessage('1 minute left!');
        setTimeout(() => setShowWarning(false), 3000);
      } else if (minutesLeft === 2 && secondsLeft >= 118 && secondsLeft <= 120) {
        setShowWarning(true);
        setWarningMessage('2 minutes left to look at this album!');
        setTimeout(() => setShowWarning(false), 3000);
      } else if (minutesLeft === 5 && secondsLeft >= 298 && secondsLeft <= 300) {
        setShowWarning(true);
        setWarningMessage('5 minutes left to look at this album!');
        setTimeout(() => setShowWarning(false), 3000);
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

  const albumTitle = albumName.charAt(0).toUpperCase() + albumName.slice(1);

  return (
    <>
      {showWarning && (
        <div className="expiration-toast" style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: warningMessage === 'EXPIRED!!!' ? '#dc2626' : '#f59e0b',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '8px',
          fontSize: '1.2rem',
          fontWeight: 'bold',
          zIndex: 10000,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          animation: 'slideDown 0.3s ease-out'
        }}>
          ⏰ {warningMessage}
        </div>
      )}
      <div style={{ padding: '2rem 0 1rem 0', textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: '600', 
          color: 'white',
          margin: 0
        }}>
          {albumTitle}
        </h1>
      </div>
      <PhotoGrid album={albumName} initialPhotos={photos} />
      <style>{`
        @keyframes slideDown {
          from {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
