/**
 * Info Panel Component
 * Displays photo metadata and EXIF data
 */

import React from 'react';
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
  if (!show) return null;

  return (
    <div className="modal-info-panel" style={style}>
      {imageTitle && (
        <div className="info-item" style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          <span className="info-value">{imageTitle}</span>
        </div>
      )}
      
      <div className="info-item">
        <span className="info-label">File:</span>
        <span className="info-value">{photo.id.split('/').pop()}</span>
      </div>
      
      <div className="info-item">
        <span className="info-label">Title:</span>
        <span className="info-value">{photo.title}</span>
      </div>
      
      <div className="info-item">
        <span className="info-label">Album:</span>
        <span className="info-value">{photo.album}</span>
      </div>
      
      {photo.metadata && (
        <div className="info-item">
          <span className="info-label">Size:</span>
          <span className="info-value">{formatFileSize(photo.metadata.size)}</span>
        </div>
      )}
      
      {loadingExif && (
        <div className="info-item">
          <span className="info-value">Loading EXIF data...</span>
        </div>
      )}
      
      {exifData && !exifData.error && (
        <>
          {exifData.Make && (
            <div className="info-item">
              <span className="info-label">Camera:</span>
              <span className="info-value">{exifData.Make} {exifData.Model}</span>
            </div>
          )}
          
          {exifData.LensModel && (
            <div className="info-item">
              <span className="info-label">Lens:</span>
              <span className="info-value">{exifData.LensModel}</span>
            </div>
          )}
          
          {exifData.FocalLength && (
            <div className="info-item">
              <span className="info-label">Focal Length:</span>
              <span className="info-value">{exifData.FocalLength}mm</span>
            </div>
          )}
          
          {exifData.FNumber && (
            <div className="info-item">
              <span className="info-label">Aperture:</span>
              <span className="info-value">f/{exifData.FNumber}</span>
            </div>
          )}
          
          {exifData.ExposureTime && (
            <div className="info-item">
              <span className="info-label">Shutter:</span>
              <span className="info-value">
                {exifData.ExposureTime < 1 
                  ? `1/${Math.round(1/exifData.ExposureTime)}` 
                  : exifData.ExposureTime}s
              </span>
            </div>
          )}
          
          {exifData.ISO && (
            <div className="info-item">
              <span className="info-label">ISO:</span>
              <span className="info-value">{exifData.ISO}</span>
            </div>
          )}
          
          {exifData.DateTimeOriginal && (
            <div className="info-item">
              <span className="info-label">Date Taken:</span>
              <span className="info-value">
                {new Date(exifData.DateTimeOriginal).toLocaleDateString('en-US', {
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

