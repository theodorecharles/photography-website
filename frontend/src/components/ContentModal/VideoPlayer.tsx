/**
 * Simple Video Player Component
 * Uses native browser controls + HLS.js for adaptive streaming
 */

import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { API_URL } from '../../config';
import { trackVideoQualityChange } from '../../utils/analytics';

interface VideoPlayerProps {
  album: string;
  filename: string;
  videoTitle?: string;
  posterUrl?: string;
  onLoadStart?: () => void;
  onLoaded?: () => void;
  secretKey?: string;
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
  const videoId = `${album}/${filename}`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || initializingRef.current) return;
    
    initializingRef.current = true;
    console.log('[VideoPlayer] Initializing for', filename);

    if (onLoadStart) onLoadStart();

    // Construct master playlist URL
    const masterPlaylistUrl = `${API_URL}/api/video/${encodeURIComponent(album)}/${encodeURIComponent(filename)}/master.m3u8`;
    console.log('[VideoPlayer] Master playlist URL:', masterPlaylistUrl);

    if (Hls.isSupported()) {
      console.log('[VideoPlayer] Using HLS.js');
      
      // Custom loader to append secretKey to all requests
      class CustomLoader extends Hls.DefaultConfig.loader {
        constructor(config: any) {
          super(config);
          const load = this.load.bind(this);
          this.load = function(context: any, config: any, callbacks: any) {
            // Add secretKey to all video API requests
            if (secretKey && context.url && context.url.includes('/api/video/')) {
              const separator = context.url.includes('?') ? '&' : '?';
              context.url = `${context.url}${separator}key=${secretKey}`;
            }
            return load(context, config, callbacks);
          };
        }
      }

      const hls = new Hls({
        enableWorker: true,
        maxBufferLength: 10, // Buffer 10 seconds ahead
        maxMaxBufferLength: 15,
        maxBufferSize: 15 * 1000 * 1000,
        backBufferLength: 30,
        loader: CustomLoader,
        xhrSetup: (xhr: XMLHttpRequest) => {
          xhr.withCredentials = true;
        },
      });

      hlsRef.current = hls;
      hls.loadSource(masterPlaylistUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('[VideoPlayer] Loaded:', hls.levels.map(l => l.height + 'p'));
        if (onLoaded) onLoaded();
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const level = hls.levels[data.level];
        const quality = `${level.height}p`;
        trackVideoQualityChange(videoId, album, videoTitle, quality, true);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error('[VideoPlayer] Fatal error:', data);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('[VideoPlayer] Using native HLS (Safari)');
      video.src = masterPlaylistUrl;
      video.addEventListener('loadedmetadata', () => {
        if (onLoaded) onLoaded();
      });
    } else {
      console.error('[VideoPlayer] HLS not supported');
    }

    return () => {
      initializingRef.current = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [album, filename, videoTitle, secretKey, onLoadStart, onLoaded]);

  const posterUrlFull = posterUrl ? `${API_URL}${posterUrl}${secretKey ? `?key=${secretKey}` : ''}` : undefined;

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      preload="metadata"
      poster={posterUrlFull}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        objectFit: 'contain',
        backgroundColor: '#000'
      }}
    />
  );
};

export default VideoPlayer;
