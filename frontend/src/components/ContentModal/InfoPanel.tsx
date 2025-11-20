/**
 * Info Panel Component
 * Displays photo metadata and EXIF data
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Photo, ExifData } from './types';
import { formatFileSize } from '../../utils/formatters';

interface InfoPanelProps {
  show: boolean;
  photo: Photo;
  exifData: ExifData | null;
  loadingExif: boolean;
  imageTitle?: string | null;
  style?: React.CSSProperties;
}

// formatFileSize function moved to utils/formatters.ts

const InfoPanel: React.FC<InfoPanelProps> = ({
  show,
  photo,
  exifData,
  loadingExif,
  imageTitle,
  style,
}) => {
  const { t, i18n } = useTranslation();
  
  if (!show) return null;

  return (
    <div className="modal-info-panel" style={style}>
      {imageTitle && (
        <div className="info-item" style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          <span className="info-value">{imageTitle}</span>
        </div>
      )}
      
      <div className="info-item">
        <span className="info-label">{t('photo.file')}:</span>
        <span className="info-value">{photo.id.split('/').pop()}</span>
      </div>
      
      <div className="info-item">
        <span className="info-label">{t('photo.titleLabel')}:</span>
        <span className="info-value">{photo.title}</span>
      </div>
      
      <div className="info-item">
        <span className="info-label">{t('photo.albumLabel')}:</span>
        <span className="info-value">{photo.album}</span>
      </div>
      
      {photo.metadata && (
        <div className="info-item">
          <span className="info-label">{t('photo.size')}:</span>
          <span className="info-value">{formatFileSize(photo.metadata.size)}</span>
        </div>
      )}
      
      {loadingExif && (
        <div className="info-item">
          <span className="info-value">{t('photo.loadingExif')}</span>
        </div>
      )}
      
      {exifData && !exifData.error && (
        <>
          {exifData.Make && (
            <div className="info-item">
              <span className="info-label">{t('photo.camera')}:</span>
              <span className="info-value">{exifData.Make} {exifData.Model}</span>
            </div>
          )}
          
          {exifData.LensModel && (
            <div className="info-item">
              <span className="info-label">{t('photo.lens')}:</span>
              <span className="info-value">{exifData.LensModel}</span>
            </div>
          )}
          
          {exifData.FocalLength && (
            <div className="info-item">
              <span className="info-label">{t('photo.focalLength')}:</span>
              <span className="info-value">{exifData.FocalLength}mm</span>
            </div>
          )}
          
          {exifData.FNumber && (
            <div className="info-item">
              <span className="info-label">{t('photo.aperture')}:</span>
              <span className="info-value">f/{exifData.FNumber}</span>
            </div>
          )}
          
          {exifData.ExposureTime && (
            <div className="info-item">
              <span className="info-label">{t('photo.shutter')}:</span>
              <span className="info-value">
                {exifData.ExposureTime < 1 
                  ? `1/${Math.round(1/exifData.ExposureTime)}` 
                  : exifData.ExposureTime}s
              </span>
            </div>
          )}
          
          {exifData.ISO && (
            <div className="info-item">
              <span className="info-label">{t('photo.iso')}:</span>
              <span className="info-value">{exifData.ISO}</span>
            </div>
          )}
          
          {exifData.DateTimeOriginal && (
            <div className="info-item">
              <span className="info-label">{t('photo.dateTaken')}:</span>
              <span className="info-value">
                {new Date(exifData.DateTimeOriginal).toLocaleDateString(i18n.language, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InfoPanel;

