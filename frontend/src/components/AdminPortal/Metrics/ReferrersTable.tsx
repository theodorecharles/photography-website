/**
 * Top Referrers Table Component
 */

import React from 'react';
import { formatNumber } from '../../../utils/formatters';

interface Referrer {
  referrer: string;
  count: number;
}

interface ReferrersTableProps {
  referrers: Referrer[];
  expandedRows: Set<number>;
  isExpanded: boolean;
  onToggleRow: (index: number) => void;
  onToggleTable: () => void;
}

const ReferrersTable: React.FC<ReferrersTableProps> = ({
  referrers,
  expandedRows,
  isExpanded,
  onToggleRow,
  onToggleTable,
}) => {
  if (!referrers || referrers.length === 0) {
    return <div className="no-data">No referrer data available</div>;
  }

  const totalReferrers = referrers.reduce((sum, r) => sum + r.count, 0);

  return (
    <>
      <div className={`metrics-table-container ${isExpanded ? 'expanded' : ''}`}>
        <div className="metrics-table" data-table-name="referrers">
          <table>
            <thead>
              <tr>
                <th>Referrer</th>
                <th className="text-right" style={{ width: '80px' }}>Visits</th>
                <th className="text-right" style={{ width: '80px' }}>% of Total</th>
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
                              <strong>Full Referrer URL:</strong>
                              <div style={{ wordBreak: 'break-all', marginTop: '0.5rem' }}>
                                {referrer.referrer}
                              </div>
                            </div>
                            <div className="expanded-detail">
                              <strong>Total Visits:</strong> {formatNumber(referrer.count)}
                            </div>
                            <div className="expanded-detail">
                              <strong>Percentage:</strong> {percentage}% of all referrers
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
        {isExpanded ? 'View Less ▲' : 'View More ▼'}
      </button>
    </>
  );
};

export default ReferrersTable;

