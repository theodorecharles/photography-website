/**
 * VideoListView component for displaying video-only albums
 * Shows videos in a single-column list format with titles, descriptions, and share links
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import { Photo } from '../types/photo';
import VideoPlayer from './ContentModal/VideoPlayer';
import { ShareIcon } from './icons';
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

  // Pause all other videos when one starts playing
  useEffect(() => {
    const handlePlay = (e: Event) => {
      const playingVideo = e.target as HTMLVideoElement;
      const videoId = playingVideo.dataset.videoId;
      
      if (videoId) {
        // Pause all other videos
        const allVideos = document.querySelectorAll('.video-list-item video');
        allVideos.forEach((video) => {
          const vid = video as HTMLVideoElement;
          const vidId = vid.dataset.videoId;
          if (vidId !== videoId && !vid.paused) {
            vid.pause();
          }
        });
      }
    };

    // Add play event listeners to all videos
    const allVideos = document.querySelectorAll('.video-list-item video');
    allVideos.forEach((video) => {
      video.addEventListener('play', handlePlay);
    });

    return () => {
      allVideos.forEach((video) => {
        video.removeEventListener('play', handlePlay);
      });
    };
  }, [videos.length]); // Re-run when video list changes

  const handleShareClick = (video: Photo) => {
    setShareModalVideo(video);
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
        
        return (
          <div key={video.id} className="video-list-item">
            <div className="video-player-wrapper">
              <div 
                className="video-player-container"
                data-video-id={video.id}
              >
                <VideoPlayer
                  album={video.album}
                  filename={filename}
                  videoTitle={video.title}
                  posterUrl={`${API_URL}${video.thumbnail}${secretKey ? `?key=${secretKey}` : ''}`}
                  autoplay={false}
                  secretKey={secretKey}
                />
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

