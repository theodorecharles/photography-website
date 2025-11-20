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
  const initializingRef = useRef(false); // Prevent multiple initializations

  useEffect(() => {
    const debugInfo = {
      component: 'VideoPlayer',
      album,
      filename,
      autoplay,
      API_URL,
      timestamp: new Date().toISOString(),
      initializing: initializingRef.current
    };
    console.log('[VideoPlayer] Component mounted/updated:', debugInfo);
    
    // Send debug to window object so it's visible in mobile debugging
    if (typeof window !== 'undefined') {
      (window as any).lastVideoDebug = debugInfo;
    }
    
    const video = videoRef.current;
    if (!video) {
      console.warn('[VideoPlayer] Video ref not yet attached, waiting...');
      setError('Waiting for video element...');
      // Don't error - React will attach the ref on next render
      return;
    }

    // Prevent duplicate initialization
    if (initializingRef.current) {
      console.log('[VideoPlayer] Already initializing, skipping...');
      return;
    }
    initializingRef.current = true;

    console.log('[VideoPlayer] Video element found:', video);
    setError(null); // Clear any previous errors

    if (onLoadStart) onLoadStart();

    // Load master playlist for adaptive streaming
    const masterPlaylistUrl = `${API_URL}/api/video/${encodeURIComponent(album)}/${encodeURIComponent(filename)}/master.m3u8`;
    const urlDebug = { 
      album, 
      filename, 
      encodedAlbum: encodeURIComponent(album),
      encodedFilename: encodeURIComponent(filename),
      fullUrl: masterPlaylistUrl,
      API_URL
    };
    console.log('[VideoPlayer] Constructed URL:', urlDebug);
    
    // Store in window for mobile debugging
    if (typeof window !== 'undefined') {
      (window as any).lastVideoUrl = urlDebug;
    }
    
    // Test URL accessibility
    setError('Testing playlist URL...');
    fetch(masterPlaylistUrl)
      .then(res => {
        console.log('[VideoPlayer] Playlist fetch test:', res.status, res.statusText);
        if (!res.ok) {
          return res.text().then(text => {
            console.error('[VideoPlayer] Playlist not accessible:', text);
            const errorMsg = `Playlist error: ${res.status} ${res.statusText}`;
            setError(errorMsg);
            // Store error in window for debugging
            if (typeof window !== 'undefined') {
              (window as any).lastVideoError = { status: res.status, text };
            }
          });
        }
        return res.text().then(text => {
          console.log('[VideoPlayer] Playlist content:', text.substring(0, 200));
          setError('Playlist OK, loading video...');
          // Store success in window
          if (typeof window !== 'undefined') {
            (window as any).lastVideoPlaylist = text.substring(0, 500);
          }
        });
      })
      .catch(err => {
        console.error('[VideoPlayer] Playlist fetch failed:', err);
        const errorMsg = `Network error: ${err.message}`;
        setError(errorMsg);
        // Store error in window
        if (typeof window !== 'undefined') {
          (window as any).lastVideoError = { message: err.message, stack: err.stack };
        }
      });

    if (Hls.isSupported()) {
      console.log('[VideoPlayer] Using HLS.js for playback');
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
        debug: true, // Set to true for verbose logging
        xhrSetup: (xhr: XMLHttpRequest) => {
          // Don't send credentials with video requests (CORS with wildcard origin)
          xhr.withCredentials = false;
        },
      });

      hlsRef.current = hls;

      hls.loadSource(masterPlaylistUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('[VideoPlayer] Master playlist loaded, available qualities:', hls.levels.map(l => l.height + 'p'));
        if (onLoaded) onLoaded();
        if (autoplay) {
          console.log('[VideoPlayer] Attempting autoplay');
          video.play().catch(err => {
            console.error('[VideoPlayer] Autoplay failed:', err);
            // On mobile, autoplay often fails - user must manually start
            setError('Tap to play video');
          });
        }
      });

      // Log quality level changes for debugging
      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const level = hls.levels[data.level];
        console.log(`[VideoPlayer] Quality switched to: ${level.height}p (${Math.round(level.bitrate / 1000)} Kbps)`);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('[VideoPlayer] HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('[VideoPlayer] Network error, attempting recovery');
              setError('Network error, retrying...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('[VideoPlayer] Media error, attempting recovery');
              setError('Media error, retrying...');
              hls.recoverMediaError();
              break;
            default:
              console.error('[VideoPlayer] Fatal error:', data);
              setError(`Failed to load video: ${data.details || 'Unknown error'}`);
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari/iOS)
      console.log('[VideoPlayer] Using native HLS support');
      video.src = masterPlaylistUrl;
      
      video.addEventListener('loadedmetadata', () => {
        console.log('[VideoPlayer] Native HLS loaded');
        if (onLoaded) onLoaded();
        if (autoplay) {
          console.log('[VideoPlayer] Attempting native autoplay');
          video.play().catch(err => {
            console.error('[VideoPlayer] Native autoplay failed:', err);
            setError('Tap to play video');
          });
        }
      });

      video.addEventListener('error', (e) => {
        console.error('[VideoPlayer] Native video error:', e, video.error);
        setError(`Video error: ${video.error?.message || 'Unknown error'}`);
      });
    } else {
      console.error('[VideoPlayer] HLS not supported');
      setError('HLS video playback not supported in this browser');
    }

    return () => {
      console.log('[VideoPlayer] Cleanup: destroying HLS instance');
      initializingRef.current = false; // Reset on cleanup
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [album, filename, autoplay, onLoadStart, onLoaded]);

  if (error && !error.includes('Tap to play')) {
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
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>{error}</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '10px' }}>Video: {filename}</p>
          <p style={{ fontSize: '0.85rem', opacity: 0.5, marginTop: '10px' }}>Album: {album}</p>
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
      backgroundColor: '#000',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {error && (
        <div style={{
          color: '#ff6b6b',
          padding: '10px',
          textAlign: 'center',
          fontSize: '0.9rem',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          borderRadius: '4px',
          maxWidth: '90%'
        }}>
          {error}
        </div>
      )}
      <video
        ref={videoRef}
        controls
        playsInline
        preload="metadata"
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
