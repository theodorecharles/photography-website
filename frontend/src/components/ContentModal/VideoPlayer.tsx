/**
 * Video Player Component
 * HLS video player with adaptive streaming (automatic quality selection)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import './VideoPlayer.css';
import { API_URL } from '../../config';
import { trackVideoQualityChange } from '../../utils/analytics';

interface VideoPlayerProps {
  album: string;
  filename: string;
  videoTitle?: string;
  posterUrl?: string; // Thumbnail to show before video plays
  onLoadStart?: () => void;
  onLoaded?: () => void;
  secretKey?: string; // For share link access
}

const formatTime = (time: number): string => {
  if (!isFinite(time) || time < 0) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

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
  const containerRef = useRef<HTMLDivElement>(null);
  const initializingRef = useRef(false);
  const hideControlsTimeout = useRef<number | null>(null);
  const videoId = `${album}/${filename}`;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferProgress, setBufferProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const clearHideControlsTimer = () => {
    if (hideControlsTimeout.current) {
      window.clearTimeout(hideControlsTimeout.current);
      hideControlsTimeout.current = null;
    }
  };

  const startHideControlsTimer = useCallback(() => {
    clearHideControlsTimer();
    if (!isPlaying) return;
    hideControlsTimeout.current = window.setTimeout(() => setShowControls(false), 2500);
  }, [isPlaying]);

  const handleUserInteraction = useCallback(() => {
    setShowControls(true);
    if (isPlaying) {
      startHideControlsTimer();
    }
  }, [isPlaying, startHideControlsTimer]);

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

    const updateBuffered = () => {
      if (!video.duration || video.buffered.length === 0) {
        setBufferProgress(0);
        return;
      }
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      setBufferProgress(Math.min(bufferedEnd / video.duration, 1));
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
      updateBuffered();
      if (onLoaded) onLoaded();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleProgress = () => {
      updateBuffered();
    };

    const handlePlay = () => {
      setIsPlaying(true);
      startHideControlsTimer();
    };

    const handlePause = () => {
      setIsPlaying(false);
      setShowControls(true);
      clearHideControlsTimer();
    };

    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted || video.volume === 0);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);

    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    if (Hls.isSupported()) {
      console.log('[VideoPlayer] Using HLS.js for playback');
      // Use HLS.js for adaptive streaming
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        // Enable automatic quality switching based on bandwidth
        abrEwmaDefaultEstimate: 5000000, // Start with higher estimate (5 Mbps) for better initial quality
        abrEwmaSlowVoD: 3, // Weight for slow EMA (VOD)
        abrEwmaFastVoD: 3, // Weight for fast EMA (VOD)
        abrMaxWithRealBitrate: false, // Use bandwidth estimate, not max bitrate
        debug: false, // Disable verbose logging in production
        // Minimal buffer to prevent excessive preloading
        maxBufferLength: 5, // Only buffer 5 seconds ahead
        maxMaxBufferLength: 10, // Max 10 seconds
        maxBufferSize: 10 * 1000 * 1000, // 10 MB max
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 3,
        liveSyncDurationCount: 2, // Only load 2 segments initially
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
      video.addEventListener('error', (e) => {
        console.error('[VideoPlayer] Native video error:', e, video.error);
      });
    } else {
      console.error('[VideoPlayer] HLS not supported');
    }

    return () => {
      console.log('[VideoPlayer] Cleanup: destroying HLS instance');
      initializingRef.current = false;
      clearHideControlsTimer();
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [album, filename, videoTitle, secretKey, onLoadStart, onLoaded, startHideControlsTimer]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc: any = document;
      const fullscreenElement =
        document.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement;
      setIsFullscreen(fullscreenElement === containerRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange as any);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange as any);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange as any);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange as any);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange as any);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange as any);
    };
  }, []);

  useEffect(() => {
    return () => clearHideControlsTimer();
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch((err) => console.error('Failed to play video', err));
    } else {
      video.pause();
    }
  };

  const handleProgressChange = (value: number) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const newTime = (value / 100) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeInput = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    video.muted = value === 0;
    setVolume(value);
    setIsMuted(value === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
    if (!video.muted) {
      setVolume(video.volume || 1);
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    const doc: any = document;
    if (
      document.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    ) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    } else {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      } else if ((container as any).mozRequestFullScreen) {
        (container as any).mozRequestFullScreen();
      } else if ((container as any).msRequestFullscreen) {
        (container as any).msRequestFullscreen();
      }
    }
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const posterUrlFull = posterUrl ? `${API_URL}${posterUrl}${secretKey ? `?key=${secretKey}` : ''}` : undefined;

  const showOverlayPlayButton = !isPlaying;

  return (
    <div
      className={`video-player-shell ${isFullscreen ? 'fullscreen' : ''}`}
      ref={containerRef}
      onMouseMove={handleUserInteraction}
      onTouchStart={handleUserInteraction}
      onDoubleClick={toggleFullscreen}
    >
      <video
        ref={videoRef}
        playsInline
        preload="none"
        poster={posterUrlFull}
        data-video-id={`${album}/${filename}`}
      />

      {showOverlayPlayButton && (
        <button className="video-play-overlay" onClick={togglePlay} aria-label="Play video">
          <PlayIcon />
        </button>
      )}

      <div className={`video-controls ${showControls ? 'visible' : ''}`}>
        <div className="video-progress">
          <div className="video-progress-buffer" style={{ width: `${bufferProgress * 100}%` }} />
          <div className="video-progress-played" style={{ width: `${progressPercent}%` }} />
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progressPercent}
            onChange={(e) => handleProgressChange(parseFloat(e.target.value))}
            aria-label="Seek video"
          />
        </div>

        <div className="video-controls-row">
          <button onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <div className="time-readout">
            <span>{formatTime(currentTime)}</span>
            <span> / </span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="video-volume">
            <button onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted || volume === 0 ? <MuteIcon /> : <VolumeIcon />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeInput(parseFloat(e.target.value))}
              aria-label="Volume"
            />
          </div>

          <div className="spacer" />

          <button onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
            {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
          </button>
        </div>
      </div>
    </div>
  );
};

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path fill="currentColor" d="M6 4.5v15l12-7.5-12-7.5z" />
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path
      fill="currentColor"
      d="M7 5h3v14H7V5zm7 0h3v14h-3V5z"
    />
  </svg>
);

const VolumeIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path
      fill="currentColor"
      d="M5 9v6h4l5 4V5l-5 4H5zm11.54-2.46a5 5 0 0 1 0 7.07l-1.06-1.06a3.5 3.5 0 0 0 0-4.95l1.06-1.06zm2.83-2.83a8 8 0 0 1 0 11.32l-1.06-1.06a6.5 6.5 0 0 0 0-9.19l1.06-1.07z"
    />
  </svg>
);

const MuteIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path
      fill="currentColor"
      d="M5 9v6h4l5 4V5l-5 4H5zm13.59-3L17 7.59 15.41 6 14 7.41 15.59 9 14 10.59 15.41 12 17 10.41 18.59 12 20 10.59 18.41 9 20 7.41 18.59 6z"
    />
  </svg>
);

const FullscreenIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path
      fill="currentColor"
      d="M7 7h3V5H5v5h2V7zm9 0h3v3h2V5h-5v2zm-9 9H5v5h5v-2H7v-3zm14 0h-2v3h-3v2h5v-5z"
    />
  </svg>
);

const ExitFullscreenIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path
      fill="currentColor"
      d="M9 9H5V5h2v2h2v2zm10 0h-4V7h2V5h2v4zm-6 6h2v4h-2v-2h-2v-2h2zm-6 0v2H5v2h4v-4H7z"
    />
  </svg>
);

export default VideoPlayer;
