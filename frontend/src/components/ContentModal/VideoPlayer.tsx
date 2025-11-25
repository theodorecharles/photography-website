/**
 * Video Player Component
 * HLS video player with adaptive streaming (automatic quality selection)
 */

import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { API_URL } from '../../config';
import { trackVideoPlay, trackVideoPause, trackVideoEnd, trackVideoProgress, trackVideoSeek, trackVideoQualityChange, trackVideoSession } from '../../utils/analytics';

interface VideoPlayerProps {
  album: string;
  filename: string;
  videoTitle?: string;
  posterUrl?: string; // Thumbnail to show before video plays
  onLoadStart?: () => void;
  onLoaded?: () => void;
  secretKey?: string; // For share link access
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  album,
  filename,
  videoTitle = '',
  posterUrl,
  onLoadStart,
  onLoaded,
  secretKey
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const initializingRef = useRef(false);
  
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
    const video = videoRef.current;
    if (!video || initializingRef.current) return;
    
    initializingRef.current = true;
    console.log('[VideoPlayer] Initializing HLS for', filename);
    
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
        // Buffer configuration to prevent stalling and buffer holes
        maxBufferLength: 30, // Maximum buffer length in seconds
        maxMaxBufferLength: 60, // Maximum max buffer length
        maxBufferSize: 60 * 1000 * 1000, // 60 MB max buffer size
        maxBufferHole: 0.5, // Max hole size (seconds) that can be skipped
        highBufferWatchdogPeriod: 2, // Check for buffer issues every 2 seconds
        nudgeOffset: 0.1, // Small offset to skip tiny buffer holes
        nudgeMaxRetry: 3, // Max retries for nudging
        liveSyncDurationCount: 3, // VOD: buffer 3 segments initially
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
        
        if (onLoaded) onLoaded();
        // No autoplay - user clicks play manually
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
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('[VideoPlayer] Media error, attempting recovery');
              hls.recoverMediaError();
              break;
            default:
              console.error('[VideoPlayer] Fatal error:', data);
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
        if (onLoaded) onLoaded();
      });

      video.addEventListener('error', (e) => {
        console.error('[VideoPlayer] Native video error:', e, video.error);
      });
    } else {
      console.error('[VideoPlayer] HLS not supported');
    }

    // Add video analytics event listeners
    const handlePlay = () => {
      console.log('[VideoPlayer] handlePlay analytics called');
      watchStartTime.current = Date.now();
      playCount.current++;
      // Delay analytics to avoid triggering re-render
      setTimeout(() => {
        trackVideoPlay(videoId, album, videoTitle, video.currentTime, video.duration);
      }, 100);
    };

    const handlePause = () => {
      console.log('[VideoPlayer] handlePause analytics called');
      if (watchStartTime.current) {
        const watchDuration = (Date.now() - watchStartTime.current) / 1000;
        totalWatchTime.current += watchDuration;
        watchStartTime.current = null;
      }
      pauseCount.current++;
      // Delay analytics to avoid triggering re-render
      setTimeout(() => {
        trackVideoPause(videoId, album, videoTitle, video.currentTime, video.duration);
      }, 100);
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
  }, [album, filename, videoTitle, secretKey]); // Don't include callbacks in deps - they cause re-render loops

  const posterUrlFull = posterUrl ? `${API_URL}${posterUrl}${secretKey ? `?key=${secretKey}` : ''}` : undefined;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      
      <video
        ref={videoRef}
        controls
        playsInline
        preload="metadata"
        muted
        poster={posterUrlFull}
        data-video-id={`${album}/${filename}`}
        onPlay={(e) => {
          console.log('[VideoPlayer] Video PLAY event fired');
          e.stopPropagation();
        }}
        onPause={(e) => {
          console.log('[VideoPlayer] Video PAUSE event fired. Stack trace:', new Error().stack);
          e.stopPropagation();
        }}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain'
        }}
      />
    </div>
  );
};

export default VideoPlayer;
