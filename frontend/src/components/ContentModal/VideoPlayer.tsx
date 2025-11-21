/**
 * Video Player Component
 * HLS video player with adaptive streaming (automatic quality selection)
 */

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { API_URL } from '../../config';
import { trackVideoPlay, trackVideoPause, trackVideoEnd, trackVideoProgress, trackVideoSeek, trackVideoQualityChange, trackVideoSession } from '../../utils/analytics';

interface VideoPlayerProps {
  album: string;
  filename: string;
  videoTitle?: string;
  autoplay?: boolean;
  posterUrl?: string; // Thumbnail to show before video plays
  onLoadStart?: () => void;
  onLoaded?: () => void;
  secretKey?: string; // For share link access
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  album,
  filename,
  videoTitle = '',
  autoplay = false,
  posterUrl,
  onLoadStart,
  onLoaded,
  secretKey
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false); // Track if user clicked play
  const initializingRef = useRef(false); // Prevent multiple initializations
  
  // Analytics tracking state
  const watchStartTime = useRef<number | null>(null);
  const totalWatchTime = useRef<number>(0);
  const lastCurrentTime = useRef<number>(0);
  const milestonesPassed = useRef<Set<number>>(new Set());
  const playCount = useRef<number>(0);
  const pauseCount = useRef<number>(0);
  const seekCount = useRef<number>(0);
  const maxPercentageReached = useRef<number>(0);
  const videoId = `${album}/${filename}`;

  useEffect(() => {
    // Only initialize HLS if user has interacted or autoplay is enabled
    if (!hasInteracted && !autoplay) {
      console.log('[VideoPlayer] Waiting for user interaction before loading video');
      return;
    }

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
    // Note: Don't add ?key= here - xhrSetup will add it to all requests (playlist + segments)
    const masterPlaylistUrl = `${API_URL}/api/video/${encodeURIComponent(album)}/${encodeURIComponent(filename)}/master.m3u8`;
    const urlDebug = { 
      album, 
      filename, 
      encodedAlbum: encodeURIComponent(album),
      encodedFilename: encodeURIComponent(filename),
      fullUrl: masterPlaylistUrl,
      hasSecretKey: !!secretKey,
      API_URL
    };
    console.log('[VideoPlayer] Constructed URL:', urlDebug);
    
    // Store in window for mobile debugging
    if (typeof window !== 'undefined') {
      (window as any).lastVideoUrl = urlDebug;
    }

    if (Hls.isSupported()) {
      console.log('[VideoPlayer] Using HLS.js for playback');
      // Use HLS.js for adaptive streaming
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        // Enable automatic quality switching based on bandwidth
        abrEwmaDefaultEstimate: 5000000, // Start with higher estimate (5 Mbps) for better initial quality
        abrEwmaSlowVoD: 3, // Weight for slow EMA (VOD)
        abrEwmaFastVoD: 3, // Weight for fast EMA (VOD)
        abrMaxWithRealBitrate: false, // Use bandwidth estimate, not max bitrate
        debug: false, // Disable verbose logging in production
        xhrSetup: (xhr: XMLHttpRequest, url: string) => {
          // Send credentials (cookies) with video requests for authentication
          xhr.withCredentials = true;
          
          // If using share link, append secretKey to all video requests
          if (secretKey && url.includes('/api/video/')) {
            const separator = url.includes('?') ? '&' : '?';
            xhr.open('GET', `${url}${separator}key=${secretKey}`, true);
          }
        },
      });

      hlsRef.current = hls;

      hls.loadSource(masterPlaylistUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('[VideoPlayer] Master playlist loaded, available qualities:', hls.levels.map(l => l.height + 'p'));
        
        // Start at highest quality (720p or 1080p), then let ABR adapt if needed
        // Find the highest quality level by bitrate
        const highestQualityLevel = hls.levels.reduce((highest, level, index) => {
          return level.bitrate > hls.levels[highest].bitrate ? index : highest;
        }, 0);
        
        console.log(`[VideoPlayer] Starting at highest quality: ${hls.levels[highestQualityLevel].height}p`);
        hls.startLevel = highestQualityLevel;
        
        setError(null); // Clear loading status
        if (onLoaded) onLoaded();
        if (autoplay) {
          console.log('[VideoPlayer] Attempting autoplay');
          video.play().catch(err => {
            console.error('[VideoPlayer] Autoplay failed:', err);
            // On mobile, autoplay often fails - user must manually start (silently fail)
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
      
      // Track quality changes (analytics)
      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const level = hls.levels[data.level];
        const quality = `${level.height}p`;
        trackVideoQualityChange(videoId, album, videoTitle, quality, true);
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari/iOS)
      console.log('[VideoPlayer] Using native HLS support');
      video.src = masterPlaylistUrl;
      
      video.addEventListener('loadedmetadata', () => {
        console.log('[VideoPlayer] Native HLS loaded');
        setError(null); // Clear loading status
        if (onLoaded) onLoaded();
        if (autoplay) {
          console.log('[VideoPlayer] Attempting native autoplay');
          video.play().catch(err => {
            console.error('[VideoPlayer] Native autoplay failed:', err);
            // On mobile, autoplay often fails - user must manually start (silently fail)
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

    // Add video analytics event listeners
    const handlePlay = () => {
      watchStartTime.current = Date.now();
      playCount.current++;
      trackVideoPlay(videoId, album, videoTitle, video.currentTime, video.duration);
    };

    const handlePause = () => {
      if (watchStartTime.current) {
        const watchDuration = (Date.now() - watchStartTime.current) / 1000;
        totalWatchTime.current += watchDuration;
        watchStartTime.current = null;
      }
      pauseCount.current++;
      trackVideoPause(videoId, album, videoTitle, video.currentTime, video.duration);
    };

    const handleEnded = () => {
      if (watchStartTime.current) {
        const watchDuration = (Date.now() - watchStartTime.current) / 1000;
        totalWatchTime.current += watchDuration;
        watchStartTime.current = null;
      }
      trackVideoEnd(videoId, album, videoTitle, video.duration, totalWatchTime.current);
    };

    const handleTimeUpdate = () => {
      if (!video.duration) return;
      
      const currentPercent = (video.currentTime / video.duration) * 100;
      maxPercentageReached.current = Math.max(maxPercentageReached.current, Math.round(currentPercent));

      // Track progress milestones (25%, 50%, 75%, 100%)
      const milestones = [25, 50, 75, 100];
      for (const milestone of milestones) {
        if (currentPercent >= milestone && !milestonesPassed.current.has(milestone)) {
          milestonesPassed.current.add(milestone);
          trackVideoProgress(videoId, album, videoTitle, video.currentTime, video.duration, milestone);
        }
      }
      
      lastCurrentTime.current = video.currentTime;
    };

    const handleSeeking = () => {
      // Track when user seeks to a different position
      if (video.duration && Math.abs(video.currentTime - lastCurrentTime.current) > 1) {
        seekCount.current++;
        trackVideoSeek(videoId, album, videoTitle, lastCurrentTime.current, video.currentTime, video.duration);
        lastCurrentTime.current = video.currentTime;
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeking', handleSeeking);

    return () => {
      console.log('[VideoPlayer] Cleanup: destroying HLS instance');
      
      // Track session summary before unmounting
      if (video.duration) {
        trackVideoSession(
          videoId,
          album,
          videoTitle,
          video.duration,
          totalWatchTime.current,
          maxPercentageReached.current,
          playCount.current,
          pauseCount.current,
          seekCount.current
        );
      }
      
      // Clean up event listeners
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeking', handleSeeking);
      
      initializingRef.current = false; // Reset on cleanup
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [album, filename, videoTitle, autoplay, secretKey, hasInteracted]); // Don't include callbacks in deps - they cause re-render loops

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

  // Handle play button click - start loading video
  const handlePlayClick = () => {
    console.log('[VideoPlayer] User clicked play, initializing HLS');
    setHasInteracted(true);
    
    // Auto-play once HLS is loaded
    const video = videoRef.current;
    if (video) {
      video.play().catch(err => {
        console.warn('[VideoPlayer] Auto-play failed:', err);
      });
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {error && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#ff6b6b',
          padding: '10px',
          textAlign: 'center',
          fontSize: '0.9rem',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          borderRadius: '4px',
          maxWidth: '90%',
          zIndex: 10
        }}>
          {error}
        </div>
      )}
      
      {/* Show thumbnail with play button if video not loaded yet */}
      {!hasInteracted && !autoplay && posterUrl && (
        <div
          onClick={handlePlayClick}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 5,
            background: `url(${API_URL}${posterUrl}) center/contain no-repeat`,
            backgroundColor: '#000'
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid rgba(255, 255, 255, 0.9)',
              transition: 'transform 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="white"
              style={{ marginLeft: '4px' }}
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
      
      <video
        ref={videoRef}
        controls
        playsInline
        preload="none"
        poster={posterUrl}
        data-video-id={`${album}/${filename}`}
        style={{
          display: hasInteracted || autoplay ? 'block' : 'none',
          width: '100%',
          maxHeight: '80vh',
          height: 'auto',
          objectFit: 'contain'
        }}
      />
    </div>
  );
};

export default VideoPlayer;
