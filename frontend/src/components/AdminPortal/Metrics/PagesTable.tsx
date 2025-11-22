/**
 * Top Pages Table Component
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '../../../utils/formatters';
import { SkeletonTable } from './SkeletonLoader';

interface Page {
  page_path: string;
  views: number;
}

interface PagesTableProps {
  pages: Page[];
  totalPageViews: number;
  expandedRows: Set<number>;
  isExpanded: boolean;
  loading?: boolean;
  onToggleRow: (index: number) => void;
  onToggleTable: () => void;
}

const PagesTable: React.FC<PagesTableProps> = ({
  pages,
  totalPageViews,
  expandedRows,
  isExpanded,
  loading,
  onToggleRow,
  onToggleTable,
}) => {
  const { t } = useTranslation();
  
  if (loading) {
    return <SkeletonTable rows={5} />;
  }
  
  if (!pages || pages.length === 0) {
    return <div className="no-data">{t('metrics.pagesTable.noData')}</div>;
  }

  return (
    <>
      <div className={`metrics-table-container ${isExpanded ? 'expanded' : ''}`}>
        <div className="metrics-table" data-table-name="pages">
          <table>
            <thead>
              <tr>
                <th>{t('metrics.pagesTable.pagePath')}</th>
                <th className="text-right">{t('metrics.pagesTable.views')}</th>
                <th className="text-right">{t('metrics.pagesTable.percentOfTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page, index) => {
                const percentage = totalPageViews > 0 
                  ? ((page.views / totalPageViews) * 100).toFixed(1)
                  : '0';
                const expanded = expandedRows.has(index);
                return (
                  <React.Fragment key={index}>
                    <tr 
                      className={`clickable-row ${expanded ? 'expanded-row' : ''}`}
                      onClick={() => onToggleRow(index)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="page-path">{page.page_path}</td>
                      <td className="text-right">{formatNumber(page.views)}</td>
                      <td className="text-right">{percentage}%</td>
                    </tr>
                    {expanded && (
                      <tr className="expanded-content-row">
                        <td colSpan={3}>
                          <div className="expanded-content">
                            <div className="expanded-detail">
                              <strong>{t('metrics.pagesTable.fullPath')}:</strong> {page.page_path}
                            </div>
                            <div className="expanded-detail">
                              <strong>{t('metrics.pagesTable.totalViews')}:</strong> {formatNumber(page.views)}
                            </div>
                            <div className="expanded-detail">
                              <strong>{t('metrics.pagesTable.percentageOfTotal')}:</strong> {t('metrics.pagesTable.percentageOfTotalText', { percentage })}
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

export default PagesTable;

