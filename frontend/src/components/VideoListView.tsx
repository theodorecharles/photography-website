/**
 * VideoListView component for displaying video-only albums
 * Shows videos in a single-column list format with titles, descriptions, and share links
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import { Photo } from '../types/photo';
import VideoPlayer from './ContentModal/VideoPlayer';
import ImageCanvas from './ContentModal/ImageCanvas';
import { ShareIcon, PlayIcon } from './icons';
import LinkifiedText from './LinkifiedText';
import VideoShareModal from './AdminPortal/VideoShareModal';
import './VideoListView.css';

interface VideoListViewProps {
  videos: Photo[];
  album: string;
  secretKey?: string; // For share link access
}

const VideoListView: React.FC<VideoListViewProps> = ({ videos, album, secretKey }) => {
  const { t } = useTranslation();
  const [shareModalVideo, setShareModalVideo] = useState<Photo | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [thumbnailLoadedMap, setThumbnailLoadedMap] = useState<Record<string, boolean>>({});
  const [modalImageLoadedMap, setModalImageLoadedMap] = useState<Record<string, boolean>>({});
  const [containerWidths, setContainerWidths] = useState<Record<string, number>>({});

  const imageQueryString = secretKey ? `?key=${secretKey}` : '';

  const handleShareClick = (video: Photo) => {
    setShareModalVideo(video);
  };

  const handlePlayClick = (videoId: string) => {
    // Stop any currently playing video
    if (playingVideoId && playingVideoId !== videoId) {
      setPlayingVideoId(null);
      setTimeout(() => setPlayingVideoId(videoId), 50);
    } else {
      setPlayingVideoId(videoId);
    }
  };

  const handleThumbnailLoad = (videoId: string) => {
    setThumbnailLoadedMap(prev => ({ ...prev, [videoId]: true }));
  };

  const handleModalLoad = (videoId: string, img?: HTMLImageElement) => {
    if (!img) return;
    
    // Calculate appropriate width based on aspect ratio if height is constrained
    // Use modal image dimensions (2048px) not thumbnail (512px) for proper sizing
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    const maxHeight = window.innerHeight * 0.85; // 85vh
    
    // For portrait videos (aspect ratio < 0.7), don't set a fixed width
    // Let them center naturally with object-fit: contain
    if (aspectRatio < 0.7) {
      // Portrait video - don't constrain width, video will size naturally
      setContainerWidths(prev => {
        const newWidths = { ...prev };
        delete newWidths[videoId];
        return newWidths;
      });
      return;
    }
    
    if (img.naturalHeight > maxHeight) {
      // Height is constrained, calculate width based on aspect ratio
      const constrainedWidth = maxHeight * aspectRatio;
      setContainerWidths(prev => ({ ...prev, [videoId]: constrainedWidth }));
    } else {
      // Image fits within height constraint, use its natural width
      setContainerWidths(prev => ({ ...prev, [videoId]: img.naturalWidth }));
    }
  };

  if (videos.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📹</div>
        <h2>{t('videoList.noVideosYet')}</h2>
        <p>{t('videoList.albumEmpty')}</p>
      </div>
    );
  }

  return (
    <div className="video-list-view">
      {videos.map((video) => {
        const filename = video.id.split('/').pop() || video.id;
        const isPlaying = playingVideoId === video.id;
        const thumbnailLoaded = thumbnailLoadedMap[video.id] || false;
        const containerWidth = containerWidths[video.id];
        
        return (
          <div key={video.id} className="video-list-item">
            <div 
              className="video-player-wrapper"
              style={{
                width: containerWidth ? `${containerWidth}px` : '100%',
                maxWidth: '100%',
                margin: '0 auto'
              }}
            >
              <div 
                className="video-player-container"
                data-video-id={video.id}
                style={{ position: 'relative' }}
              >
                {/* Always show thumbnail and modal image */}
                <ImageCanvas
                  photo={video}
                  apiUrl={API_URL}
                  imageQueryString={imageQueryString}
                  modalImageLoaded={modalImageLoadedMap[video.id] || false}
                  showModalImage={true}
                  onThumbnailLoad={() => handleThumbnailLoad(video.id)}
                  onModalLoad={(img) => handleModalLoad(video.id, img)}
                />
                
                {/* Play button overlay (hidden when video is playing) */}
                {thumbnailLoaded && !isPlaying && (
                  <button
                    onClick={() => handlePlayClick(video.id)}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handlePlayClick(video.id);
                    }}
                    className="video-play-button-overlay"
                    aria-label="Play video"
                  >
                    <PlayIcon width={80} height={80} />
                  </button>
                )}
                
                {/* Video player overlay (only rendered when playing) */}
                {isPlaying && (
                  <div className="modal-video-overlay">
                    <VideoPlayer
                      album={video.album}
                      filename={filename}
                      videoTitle={video.title}
                      autoplay={true}
                      onLoadStart={() => setThumbnailLoadedMap(prev => ({ ...prev, [video.id]: false }))}
                      onLoaded={() => {
                        setThumbnailLoadedMap(prev => ({ ...prev, [video.id]: true }));
                        setModalImageLoadedMap(prev => ({ ...prev, [video.id]: true }));
                      }}
                      secretKey={secretKey}
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className="video-info">
              <div className="video-header">
                <h2 className="video-title">{video.title}</h2>
                <button
                  className="video-share-button"
                  onClick={() => handleShareClick(video)}
                  title={t('videoList.shareVideo')}
                >
                  <ShareIcon width={20} height={20} />
                  <span className="video-share-text">
                    {t('videoList.share')}
                  </span>
                </button>
              </div>
              
              {video.description && (
                <p className="video-description">
                  <LinkifiedText text={video.description} />
                </p>
              )}
            </div>
          </div>
        );
      })}

      {shareModalVideo && (
        <VideoShareModal
          album={album}
          filename={shareModalVideo.id.split('/').pop() || shareModalVideo.id}
          videoTitle={shareModalVideo.title}
          onClose={() => setShareModalVideo(null)}
        />
      )}
    </div>
  );
};

export default VideoListView;

