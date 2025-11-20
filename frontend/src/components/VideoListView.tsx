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
import './VideoListView.css';

interface VideoListViewProps {
  videos: Photo[];
  album: string;
}

const VideoListView: React.FC<VideoListViewProps> = ({ videos, album }) => {
  const { t } = useTranslation();
  const [copiedVideoId, setCopiedVideoId] = useState<string | null>(null);

  const handleShareClick = async (video: Photo) => {
    const filename = video.id.split('/').pop() || video.id;
    const shareUrl = `${SITE_URL}/video/${encodeURIComponent(album)}/${encodeURIComponent(filename)}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedVideoId(video.id);
      setTimeout(() => setCopiedVideoId(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
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
              <VideoPlayer
                album={video.album}
                filename={filename}
                autoplay={false}
              />
            </div>
            
            <div className="video-info">
              <div className="video-header">
                <h2 className="video-title">{video.title}</h2>
                <button
                  className="video-share-button"
                  onClick={() => handleShareClick(video)}
                  title={t('videoList.copyShareLink')}
                >
                  <ShareIcon width={20} height={20} />
                  <span className="video-share-text">
                    {copiedVideoId === video.id ? t('videoList.linkCopied') : t('videoList.share')}
                  </span>
                </button>
              </div>
              
              {video.description && (
                <p className="video-description">{video.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default VideoListView;

