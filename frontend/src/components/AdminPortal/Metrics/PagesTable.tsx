/**
 * Top Pages Table Component
 */

import React from 'react';
import { formatNumber } from '../../../utils/formatters';

interface Page {
  page_path: string;
  views: number;
}

interface PagesTableProps {
  pages: Page[];
  totalPageViews: number;
  expandedRows: Set<number>;
  isExpanded: boolean;
  onToggleRow: (index: number) => void;
  onToggleTable: () => void;
}

const PagesTable: React.FC<PagesTableProps> = ({
  pages,
  totalPageViews,
  expandedRows,
  isExpanded,
  onToggleRow,
  onToggleTable,
}) => {
  if (!pages || pages.length === 0) {
    return <div className="no-data">No page view data available</div>;
  }

  return (
    <>
      <div className={`metrics-table-container ${isExpanded ? 'expanded' : ''}`}>
        <div className="metrics-table" data-table-name="pages">
          <table>
            <thead>
              <tr>
                <th>Page Path</th>
                <th className="text-right">Views</th>
                <th className="text-right">% of Total</th>
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
                              <strong>Full Path:</strong> {page.page_path}
                            </div>
                            <div className="expanded-detail">
                              <strong>Total Views:</strong> {formatNumber(page.views)}
                            </div>
                            <div className="expanded-detail">
                              <strong>Percentage of Total:</strong> {percentage}% of all page views
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

export default PagesTable;

