import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Photo, UploadingImage } from '../types';
import { API_URL } from '../../../../config';
import { EditIcon, TrashIcon } from '../../../icons';

interface PhotoListItemProps {
  // Either an existing photo or an uploading image
  photo?: Photo;
  uploadingImage?: UploadingImage;
  uploadingIndex?: number;
  
  // Handlers
  onEdit: (photo: Photo) => void;
  onDelete: (album: string, filename: string, photoTitle: string, thumbnail: string) => void;
  
  // State
  deletingPhotoId: string | null;
  canEdit: boolean;
}

export const PhotoListItem: React.FC<PhotoListItemProps> = ({
  photo,
  uploadingImage,
  uploadingIndex,
  onEdit,
  onDelete,
  deletingPhotoId,
  canEdit,
}) => {
  const { t } = useTranslation();
  // Determine the data source
  const photoData = uploadingImage?.photo || photo;
  const isComplete = uploadingImage ? uploadingImage.state === 'complete' : true;
  const isUploading = uploadingImage && uploadingImage.state !== 'complete';
  
  // Extract info
  const photoId = photoData?.id || `uploading-${uploadingIndex}`;
  const filename = photoData?.id ? decodeURIComponent(photoData.id.split('/')[1]) : t('albumsManager.uploadingEllipsis');
  const album = photoData?.id ? photoData.id.split('/')[0] : '';
  const title = photoData?.title || filename;
  const thumbnailUrl = photoData?.thumbnail || '';
  
  const isDeleting = deletingPhotoId === photoId;
  
  // Drag and drop
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: photoId,
    disabled: !canEdit,
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Show status for uploading items
  const getStatusText = () => {
    if (!uploadingImage) return null;
    
    switch (uploadingImage.state) {
      case 'queued':
        return t('sse.queuedWithEllipsis');
      case 'uploading':
        return t('sse.uploadingWithProgress', { progress: uploadingImage.progress });
      case 'optimizing':
        return t('sse.optimizingWithProgress', { progress: uploadingImage.optimizeProgress });
      case 'generating-title':
        return t('sse.generatingTitleLowercase');
      case 'error':
        return 'Error';
      default:
        return null;
    }
  };

  const statusText = getStatusText();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`list-item ${isDragging ? 'dragging' : ''} ${isDeleting ? 'deleting' : ''} ${isUploading ? 'uploading' : ''}`}
      {...attributes}
      {...listeners}
    >
      {/* Thumbnail */}
      <div className="list-item-thumbnail">
        {thumbnailUrl ? (
          <img
            src={`${API_URL}${thumbnailUrl}?t=${Date.now()}`}
            alt={title}
          />
        ) : isUploading ? (
          <div className="thumbnail-placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
            <div className="loading-spinner" style={{ width: '24px', height: '24px', marginTop: '12px' }} />
          </div>
        ) : (
          <div className="thumbnail-placeholder" />
        )}
      </div>

      {/* Title */}
      <div className="list-item-title">
        {statusText ? (
          <>
            <div className="title-text">{title}</div>
            <div className="status-text">{statusText}</div>
          </>
        ) : (
          <div className="title-text">{title}</div>
        )}
      </div>

      {/* Actions */}
      {isComplete && canEdit && (
        <div className="list-item-actions">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (photoData) onEdit(photoData);
            }}
            className="list-action-btn"
            title="Edit photo"
          >
            <EditIcon width="16" height="16" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(album, filename, title, thumbnailUrl);
            }}
            className="list-action-btn delete"
            title="Delete photo"
          >
            <TrashIcon width="16" height="16" />
          </button>
        </div>
      )}
    </div>
  );
};

