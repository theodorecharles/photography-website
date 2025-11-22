/**
 * Top Referrers Table Component
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '../../../utils/formatters';
import { SkeletonTable } from './SkeletonLoader';

interface Referrer {
  referrer: string;
  count: number;
}

interface ReferrersTableProps {
  referrers: Referrer[];
  expandedRows: Set<number>;
  isExpanded: boolean;
  loading?: boolean;
  onToggleRow: (index: number) => void;
  onToggleTable: () => void;
}

const ReferrersTable: React.FC<ReferrersTableProps> = ({
  referrers,
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
  
  if (!referrers || referrers.length === 0) {
    return <div className="no-data">{t('metrics.referrersTable.noData')}</div>;
  }

  const totalReferrers = referrers.reduce((sum, r) => sum + r.count, 0);

  return (
    <>
      <div className={`metrics-table-container ${isExpanded ? 'expanded' : ''}`}>
        <div className="metrics-table" data-table-name="referrers">
          <table>
            <thead>
              <tr>
                <th>{t('metrics.referrersTable.referrer')}</th>
                <th className="text-right" style={{ width: '80px' }}>{t('metrics.referrersTable.visits')}</th>
                <th className="text-right" style={{ width: '80px' }}>{t('metrics.referrersTable.percentOfTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {referrers.map((referrer, index) => {
                const percentage = totalReferrers > 0 
                  ? ((referrer.count / totalReferrers) * 100).toFixed(1)
                  : '0';
                const expanded = expandedRows.has(index);
                return (
                  <React.Fragment key={index}>
                    <tr 
                      className={`clickable-row ${expanded ? 'expanded-row' : ''}`}
                      onClick={() => onToggleRow(index)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="referrer" title={referrer.referrer}>
                        {referrer.referrer}
                      </td>
                      <td className="text-right">{formatNumber(referrer.count)}</td>
                      <td className="text-right">{percentage}%</td>
                    </tr>
                    {expanded && (
                      <tr className="expanded-content-row">
                        <td colSpan={3}>
                          <div className="expanded-content">
                            <div className="expanded-detail">
                              <strong>{t('metrics.referrersTable.fullReferrerUrl')}:</strong>
                              <div style={{ wordBreak: 'break-all', marginTop: '0.5rem' }}>
                                {referrer.referrer}
                              </div>
                            </div>
                            <div className="expanded-detail">
                              <strong>{t('metrics.referrersTable.totalVisits')}:</strong> {formatNumber(referrer.count)}
                            </div>
                            <div className="expanded-detail">
                              <strong>{t('metrics.referrersTable.percentage')}:</strong> {t('metrics.referrersTable.percentageText', { percentage })}
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

export default ReferrersTable;

