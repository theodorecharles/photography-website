/**
 * Video Thumbnail Picker Component
 * Allows admin to scrub through video and select a frame as thumbnail
 */

import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Hls from 'hls.js';
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
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const [videoError, setVideoError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Load video with HLS.js
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const masterPlaylistUrl = `${API_URL}/api/video/${encodeURIComponent(album)}/${encodeURIComponent(filename)}/master.m3u8`;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        autoStartLoad: true, // MUST load segments for thumbnail picker to work
        debug: false,
        xhrSetup: (xhr: XMLHttpRequest) => {
          xhr.withCredentials = true;
        },
      });

      hlsRef.current = hls;
      hls.loadSource(masterPlaylistUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('[VideoThumbnailPicker] Manifest loaded');
        // Don't set duration here - wait for loadedmetadata
        setVideoError(false);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('[VideoThumbnailPicker] HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('[VideoThumbnailPicker] Network error, attempting recovery');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('[VideoThumbnailPicker] Media error, attempting recovery');
              hls.recoverMediaError();
              break;
            default:
              console.error('[VideoThumbnailPicker] Fatal error, giving up');
              setVideoError(true);
              break;
          }
        }
      });

      // Handle metadata loaded - this is when we actually have duration
      const handleLoadedMetadata = () => {
        console.log('[VideoThumbnailPicker] Metadata loaded, duration:', video.duration);
        setDuration(video.duration);
        setVideoError(false);
      };
      video.addEventListener('loadedmetadata', handleLoadedMetadata);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = masterPlaylistUrl;
      
      const handleLoadedMetadata = () => {
        setDuration(video.duration);
        setVideoError(false);
      };
      
      const handleError = () => {
        setVideoError(true);
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleError);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleError);
      };
    } else {
      setVideoError(true);
      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [album, filename]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSetThumbnail = async () => {
    setIsUpdating(true);
    setUpdateStatus(''); // Don't show status during update - button shows "Updating..."

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

      // Success - close modal and trigger refresh
      onThumbnailUpdated();
    } catch (err) {
      console.error('Failed to update thumbnail:', err);
      setUpdateStatus(t('albumsManager.failedToUpdateThumbnail'));
      setTimeout(() => setUpdateStatus(''), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUpdateStatus(t('albumsManager.pleaseSelectImageFile'));
      setTimeout(() => setUpdateStatus(''), 3000);
      return;
    }

    setIsUploading(true);
    setUpdateStatus(''); // Don't show status during upload - button shows "Uploading..."

    try {
      const formData = new FormData();
      formData.append('thumbnail', file);

      const response = await fetch(
        `${API_URL}/api/albums/${encodeURIComponent(album)}/video/${encodeURIComponent(filename)}/upload-thumbnail`,
        {
          method: 'POST',
          credentials: 'include',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to upload thumbnail');
      }

      // Success - close modal and trigger refresh
      onThumbnailUpdated();
    } catch (err) {
      console.error('Failed to upload thumbnail:', err);
      setUpdateStatus(t('albumsManager.failedToUploadThumbnail'));
      setTimeout(() => setUpdateStatus(''), 3000);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
        {t('albumsManager.unableToLoadVideo')}
      </div>
    );
  }

  return (
    <>
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

      {/* Thumbnail Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <button
          onClick={handleSetThumbnail}
          disabled={isUpdating || isUploading || !duration}
          style={{
            flex: 1,
            padding: '0.5rem 1rem',
            background: isUpdating ? '#666' : '#4ade80',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: isUpdating || isUploading || !duration ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem',
            opacity: isUpdating || isUploading || !duration ? 0.5 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          {isUpdating ? t('albumsManager.updating') : t('albumsManager.useCurrentFrame')}
        </button>
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUpdating || isUploading}
          style={{
            flex: 1,
            padding: '0.5rem 1rem',
            background: isUploading ? '#666' : '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: isUpdating || isUploading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem',
            opacity: isUpdating || isUploading ? 0.5 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          {isUploading ? t('albumsManager.uploading') : t('albumsManager.uploadThumbnail')}
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </div>

      {/* Status Message */}
      {updateStatus && (
        <div style={{
          fontSize: '0.875rem',
          color: updateStatus.includes('✓') ? '#4ade80' : '#ff4444',
          marginBottom: '0.5rem',
          textAlign: 'center'
        }}>
          {updateStatus}
        </div>
      )}

    </>
  );
};

export default VideoThumbnailPicker;

