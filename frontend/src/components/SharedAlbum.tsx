/**
 * SharedAlbum Component
 * Displays an album accessed via a share link
 */

import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import PhotoGrid from './PhotoGrid';
import { API_URL } from '../config';
import ExpiredLink from './Misc/ExpiredLink';
import NotFound from './Misc/NotFound';

interface Photo {
  id: string;
  src: string;
  thumbnail: string;
  download: string;
  title: string;
  album: string;
  sort_order: number | null;
}

export default function SharedAlbum() {
  const { secretKey } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [albumName, setAlbumName] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);

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
        setLoading(false);
      } catch (err) {
        console.error('Error validating share link:', err);
        setError('Failed to load shared album');
        setLoading(false);
      }
    };

    validateShareLink();
  }, [secretKey]);

  if (loading) {
    return <div className="loading">Loading shared album...</div>;
  }

  if (expired) {
    return <ExpiredLink />;
  }

  if (error || !albumName) {
    return <NotFound />;
  }

  return <PhotoGrid album={albumName} initialPhotos={photos} />;
}
