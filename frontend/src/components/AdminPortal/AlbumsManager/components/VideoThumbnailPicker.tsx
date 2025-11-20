/**
 * Video Thumbnail Picker Component
 * Allows admin to scrub through video and select a frame as thumbnail
 */

import React, { useRef, useState, useEffect } from 'react';
import { API_URL } from '../../../../config';

interface VideoThumbnailPickerProps {
  album: string;
  filename: string;
  onThumbnailUpdated: () => void;
}

const VideoThumbnailPicker: React.FC<VideoThumbnailPickerProps> = ({
  album,
  filename,
  onThumbnailUpdated
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const [videoError, setVideoError] = useState(false);

  // Load video metadata
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setVideoError(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleError = () => {
      setVideoError(true);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('error', handleError);
    };
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSetThumbnail = async () => {
    setIsUpdating(true);
    setUpdateStatus('Updating thumbnail...');

    try {
      const response = await fetch(
        `${API_URL}/api/albums/${encodeURIComponent(album)}/video/${encodeURIComponent(filename)}/update-thumbnail`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            timestamp: currentTime
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update thumbnail');
      }

      setUpdateStatus('✓ Thumbnail updated!');
      setTimeout(() => {
        setUpdateStatus('');
        onThumbnailUpdated();
      }, 2000);
    } catch (err) {
      console.error('Failed to update thumbnail:', err);
      setUpdateStatus('✗ Failed to update thumbnail');
      setTimeout(() => setUpdateStatus(''), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate master playlist URL
  const videoUrl = `${API_URL}/api/video/${encodeURIComponent(album)}/${encodeURIComponent(filename)}/master.m3u8`;

  if (videoError) {
    return (
      <div style={{
        padding: '1rem',
        background: 'rgba(255, 68, 68, 0.1)',
        border: '1px solid rgba(255, 68, 68, 0.3)',
        borderRadius: '8px',
        color: '#ff4444',
        fontSize: '0.875rem'
      }}>
        Unable to load video for thumbnail selection. The video may still be processing.
      </div>
    );
  }

  return (
    <div style={{
      marginTop: '1rem',
      padding: '1rem',
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px'
    }}>
      <div style={{
        fontSize: '0.875rem',
        marginBottom: '0.75rem',
        fontWeight: 600,
        color: 'rgba(255, 255, 255, 0.9)'
      }}>
        Update Thumbnail
      </div>

      {/* Video Preview */}
      <div style={{
        position: 'relative',
        width: '100%',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '0.75rem',
        background: '#000'
      }}>
        <video
          ref={videoRef}
          src={videoUrl}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block'
          }}
          preload="metadata"
          playsInline
        />
      </div>

      {/* Timeline Scrubber */}
      <div style={{ marginBottom: '0.75rem' }}>
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          disabled={!duration}
          style={{
            width: '100%',
            cursor: 'pointer',
            accentColor: '#4ade80'
          }}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: 'rgba(255, 255, 255, 0.6)',
          marginTop: '0.25rem'
        }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Set Thumbnail Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={handleSetThumbnail}
          disabled={isUpdating || !duration}
          style={{
            flex: 1,
            padding: '0.5rem 1rem',
            background: isUpdating ? '#666' : '#4ade80',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: isUpdating || !duration ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem',
            opacity: isUpdating || !duration ? 0.5 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          {isUpdating ? 'Updating...' : 'Set as Thumbnail'}
        </button>
        {updateStatus && (
          <span style={{
            fontSize: '0.875rem',
            color: updateStatus.includes('✓') ? '#4ade80' : '#ff4444'
          }}>
            {updateStatus}
          </span>
        )}
      </div>

      <div style={{
        fontSize: '0.75rem',
        color: 'rgba(255, 255, 255, 0.5)',
        marginTop: '0.5rem'
      }}>
        Scrub to find the perfect frame, then click "Set as Thumbnail"
      </div>
    </div>
  );
};

export default VideoThumbnailPicker;

