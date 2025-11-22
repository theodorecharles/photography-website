/**
 * Skeleton Loader Components for Metrics
 * Provides placeholder UI while data is loading
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import './SkeletonLoader.css';

export const SkeletonCard: React.FC = () => {
  return (
    <div className="metric-card skeleton-card">
      <div className="skeleton-icon"></div>
      <div className="metric-content">
        <div className="skeleton-value"></div>
        <div className="skeleton-label"></div>
      </div>
    </div>
  );
};

export const SkeletonChart: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="chart-container skeleton-chart-container">
      <div className="skeleton-chart">
        <div className="skeleton-chart-bars">
          {[...Array(12)].map((_, i) => (
            <div 
              key={i} 
              className="skeleton-bar" 
              style={{ height: `${Math.random() * 60 + 40}%` }}
            ></div>
          ))}
        </div>
        <div className="skeleton-chart-overlay">
          <span>{t('metrics.charts.loadingChartData')}</span>
        </div>
      </div>
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="metrics-table-container skeleton-table-container">
      <div className="metrics-table">
        <table>
          <thead>
            <tr>
              <th><div className="skeleton-text" style={{ width: '80px' }}></div></th>
              <th className="text-right"><div className="skeleton-text" style={{ width: '60px', marginLeft: 'auto' }}></div></th>
              <th className="text-right"><div className="skeleton-text" style={{ width: '60px', marginLeft: 'auto' }}></div></th>
              <th className="text-right"><div className="skeleton-text" style={{ width: '40px', marginLeft: 'auto' }}></div></th>
            </tr>
          </thead>
          <tbody>
            {[...Array(rows)].map((_, i) => (
              <tr key={i}>
                <td>
                  <div className="skeleton-thumbnail"></div>
                </td>
                <td className="text-right">
                  <div className="skeleton-text" style={{ width: '60px', marginLeft: 'auto' }}></div>
                </td>
                <td className="text-right">
                  <div className="skeleton-text" style={{ width: '50px', marginLeft: 'auto' }}></div>
                </td>
                <td className="text-right">
                  <div className="skeleton-text" style={{ width: '30px', marginLeft: 'auto' }}></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const SkeletonMap: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="skeleton-map">
      <div className="skeleton-map-overlay">
        <span>{t('metrics.loadingLocations')}</span>
      </div>
    </div>
  );
};
