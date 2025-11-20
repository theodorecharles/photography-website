/**
 * Video Player Component
 * HLS video player with adaptive streaming (automatic quality selection)
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (onLoadStart) onLoadStart();

    // Load master playlist for adaptive streaming
    const masterPlaylistUrl = `${API_URL}/api/video/${encodeURIComponent(album)}/${encodeURIComponent(filename)}/master.m3u8`;

    if (Hls.isSupported()) {
      // Use HLS.js for adaptive streaming
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        // Enable automatic quality switching based on bandwidth
        abrEwmaDefaultEstimate: 500000, // Start with conservative estimate (500 Kbps)
        abrEwmaSlowVoD: 3, // Weight for slow EMA (VOD)
        abrEwmaFastVoD: 3, // Weight for fast EMA (VOD)
        abrMaxWithRealBitrate: false, // Use bandwidth estimate, not max bitrate
      });

      hlsRef.current = hls;

      hls.loadSource(masterPlaylistUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('[VideoPlayer] Master playlist loaded, available qualities:', hls.levels.map(l => l.height + 'p'));
        if (onLoaded) onLoaded();
        if (autoplay) {
          video.play().catch(err => {
            console.error('Autoplay failed:', err);
          });
        }
      });

      // Log quality level changes for debugging
      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const level = hls.levels[data.level];
        console.log(`[VideoPlayer] Quality switched to: ${level.height}p (${Math.round(level.bitrate / 1000)} Kbps)`);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('[VideoPlayer] Network error, attempting recovery');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('[VideoPlayer] Media error, attempting recovery');
              hls.recoverMediaError();
              break;
            default:
              console.error('[VideoPlayer] Fatal error:', data);
              setError('Failed to load video');
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = masterPlaylistUrl;
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

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [album, filename, autoplay, onLoadStart, onLoaded]);

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
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#000'
    }}>
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
    </div>
  );
};

export default VideoPlayer;
