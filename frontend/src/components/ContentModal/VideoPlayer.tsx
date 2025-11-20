/**
 * Video Player Component
 * HLS video player with adaptive streaming support
 */

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { API_URL } from '../../config';

interface VideoPlayerProps {
  album: string;
  filename: string;
  autoplay?: boolean;
  onLoadStart?: () => void;
  onLoaded?: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  album,
  filename,
  autoplay = false,
  onLoadStart,
  onLoaded
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [currentQuality, setCurrentQuality] = useState<string>('auto');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Fetch available resolutions
    const fetchResolutions = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/video/${encodeURIComponent(album)}/${encodeURIComponent(filename)}/resolutions`,
          { credentials: 'include' }
        );
        const data = await res.json();
        
        if (data.resolutions && data.resolutions.length > 0) {
          setAvailableQualities(data.resolutions);
          
          // Default to highest available quality
          const defaultQuality = data.resolutions[data.resolutions.length - 1];
          loadVideo(defaultQuality);
        } else {
          setError('No video resolutions available');
        }
      } catch (err) {
        console.error('Failed to fetch video resolutions:', err);
        setError('Failed to load video');
      }
    };

    fetchResolutions();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [album, filename]);

  const loadVideo = (quality: string) => {
    const video = videoRef.current;
    if (!video) return;

    if (onLoadStart) onLoadStart();

    const playlistUrl = `${API_URL}/api/video/${encodeURIComponent(album)}/${encodeURIComponent(filename)}/${quality}/playlist.m3u8`;

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });

      hlsRef.current = hls;

      hls.loadSource(playlistUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (onLoaded) onLoaded();
        if (autoplay) {
          video.play().catch(err => {
            console.error('Autoplay failed:', err);
          });
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Network error');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Media error');
              hls.recoverMediaError();
              break;
            default:
              setError('Fatal error loading video');
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = playlistUrl;
      video.addEventListener('loadedmetadata', () => {
        if (onLoaded) onLoaded();
        if (autoplay) {
          video.play().catch(err => {
            console.error('Autoplay failed:', err);
          });
        }
      });
    } else {
      setError('HLS not supported in this browser');
    }

    setCurrentQuality(quality);
  };

  const handleQualityChange = (quality: string) => {
    const video = videoRef.current;
    if (!video) return;

    const currentTime = video.currentTime;
    const wasPlaying = !video.paused;

    loadVideo(quality);

    // Restore playback position
    video.addEventListener('loadedmetadata', () => {
      video.currentTime = currentTime;
      if (wasPlaying) {
        video.play().catch(err => {
          console.error('Failed to resume playback:', err);
        });
      }
    }, { once: true });
  };

  if (error) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        background: 'rgba(0,0,0,0.8)'
      }}>
        <div>
          <p>{error}</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Video: {filename}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <video
        ref={videoRef}
        controls
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto'
        }}
      />
      
      {availableQualities.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '60px',
          right: '20px',
          background: 'rgba(0,0,0,0.8)',
          borderRadius: '4px',
          padding: '8px',
          display: 'flex',
          gap: '8px',
          zIndex: 10
        }}>
          {availableQualities.map(quality => (
            <button
              key={quality}
              onClick={() => handleQualityChange(quality)}
              style={{
                background: currentQuality === quality ? 'var(--primary-color)' : 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              {quality}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
