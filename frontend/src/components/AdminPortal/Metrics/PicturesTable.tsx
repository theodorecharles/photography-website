/**
 * Top Pictures by View Duration Table Component
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../../config';
import { formatNumber } from '../../../utils/formatters';
import { normalizeAlbumName, formatDurationDetailed } from '../../../utils/metricsHelpers';

interface Picture {
  photo_id: string;
  total_duration: number;
  avg_duration: number;
  views: number;
}

interface PicturesTableProps {
  pictures: Picture[];
  expandedRows: Set<number>;
  isExpanded: boolean;
  onToggleRow: (index: number) => void;
  onToggleTable: () => void;
}

const PicturesTable: React.FC<PicturesTableProps> = ({
  pictures,
  expandedRows,
  isExpanded,
  onToggleRow,
  onToggleTable,
}) => {
  const { t } = useTranslation();
  if (!pictures || pictures.length === 0) {
    return <div className="no-data">{t('metrics.picturesTable.noData')}</div>;
  }

  return (
    <>
      <div className={`metrics-table-container ${isExpanded ? 'expanded' : ''}`}>
        <div className="metrics-table" data-table-name="pictures">
          <table>
            <thead>
              <tr>
                <th>{t('metrics.picturesTable.thumbnail')}</th>
                <th className="text-right">{t('metrics.picturesTable.totalTime')}</th>
                <th className="text-right">{t('metrics.picturesTable.avgTime')}</th>
                <th className="text-right">{t('metrics.picturesTable.views')}</th>
              </tr>
            </thead>
            <tbody>
              {pictures.map((picture, index) => {
                // Extract album and photo name from photo_id (e.g., "people/08053-00001.jpg")
                const [rawAlbumName, photoName] = picture.photo_id.split('/');
                // Normalize album name to handle old lowercase data
                const albumName = normalizeAlbumName(rawAlbumName);
                const photoUrl = `/album/${albumName}?photo=${encodeURIComponent(photoName)}`;
                const thumbnailUrl = `${API_URL}/optimized/thumbnail/${albumName}/${photoName}`;
                const expanded = expandedRows.has(index);
                
                return (
                  <React.Fragment key={index}>
                    <tr 
                      className={`clickable-row ${expanded ? 'expanded-row' : ''}`}
                      onClick={() => onToggleRow(index)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="photo-thumbnail-cell">
                        <div className="photo-thumbnail-wrapper">
                          <img src={thumbnailUrl} alt={photoName} className="photo-thumbnail-small" />
                          <div className="photo-thumbnail-preview">
                            <img src={thumbnailUrl} alt={photoName} />
                          </div>
                        </div>
                      </td>
                      <td className="text-right">{formatDurationDetailed(picture.total_duration)}</td>
                      <td className="text-right">{formatDurationDetailed(picture.avg_duration)}</td>
                      <td className="text-right">{formatNumber(picture.views)}</td>
                    </tr>
                    {expanded && (
                      <tr className="expanded-content-row">
                        <td colSpan={4}>
                          <div className="expanded-content">
                            <div className="expanded-detail">
                              <strong>{t('metrics.picturesTable.photoId')}:</strong> {picture.photo_id}
                            </div>
                            <div className="expanded-detail">
                              <strong>{t('metrics.picturesTable.album')}:</strong> {albumName}
                            </div>
                            <div className="expanded-detail">
                              <strong>{t('metrics.picturesTable.fileName')}:</strong> {photoName}
                            </div>
                            <div className="expanded-actions">
                              <a 
                                href={photoUrl} 
                                className="view-photo-btn"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {t('metrics.picturesTable.viewPhoto')} →
                              </a>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <button 
        className="view-more-btn" 
        onClick={onToggleTable}
      >
        {isExpanded ? t('metrics.viewLess') : t('metrics.viewMore')}
      </button>
    </>
  );
};

export default PicturesTable;

