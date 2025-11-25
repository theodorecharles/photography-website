/**
 * VideoListView component for displaying video-only albums
 * Shows videos in a single-column list format with titles, descriptions, and share links
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SITE_URL } from '../config';
import { Photo } from '../types/photo';
import VideoPlayer from './ContentModal/VideoPlayer';
import { ShareIcon } from './icons';
import LinkifiedText from './LinkifiedText';
import VideoShareModal from './AdminPortal/VideoShareModal';
import { error as logError } from '../utils/logger';
import './VideoListView.css';

interface VideoListViewProps {
  videos: Photo[];
  album: string;
  secretKey?: string; // For share link access
  albumPublished?: boolean; // Whether album is published or not
}

const VideoListView: React.FC<VideoListViewProps> = ({ videos, album, secretKey, albumPublished = true }) => {
  const { t } = useTranslation();
  const [shareModalVideo, setShareModalVideo] = useState<Photo | null>(null);
  const [copiedVideoId, setCopiedVideoId] = useState<string | null>(null);

  const handleShareClick = async (video: Photo) => {
    const filename = video.id.split('/').pop() || video.id;
    
    // If album is published, just copy the public link directly
    if (albumPublished) {
      try {
        const publicUrl = `${SITE_URL}/album/${encodeURIComponent(album)}?video=${encodeURIComponent(filename)}`;
        await navigator.clipboard.writeText(publicUrl);
        setCopiedVideoId(video.id);
        setTimeout(() => setCopiedVideoId(null), 2000);
      } catch (err) {
        logError('Failed to copy video link:', err);
      }
    } else {
      // If album is unpublished, open share modal to generate a share link
      setShareModalVideo(video);
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
                  posterUrl={video.modal}
                  secretKey={secretKey}
                />
              </div>
            </div>
            
            <div className="video-info">
              <div className="video-header">
                <h2 className="video-title">{video.title}</h2>
                <button
                  className={`video-share-button ${copiedVideoId === video.id ? 'copied' : ''}`}
                  onClick={() => handleShareClick(video)}
                  title={copiedVideoId === video.id ? t('photo.copied') : t('videoList.shareVideo')}
                >
                  <ShareIcon width={20} height={20} />
                  <span className="video-share-text">
                    {copiedVideoId === video.id ? t('photo.copied') : t('videoList.share')}
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

