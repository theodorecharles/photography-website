/**
 * Stats Cards Component
 * Displays summary statistics cards (Unique Visitors, Page Views, Total Time)
 */

import React from 'react';
import { Stats } from './types';
import { formatNumber, formatDuration } from '../../../utils/formatters';

interface StatsCardsProps {
  stats: Stats;
}

// formatNumber and formatDuration functions moved to utils/formatters.ts

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <div className="metrics-summary">
      <div className="metric-card">
        <div className="metric-icon">👥</div>
        <div className="metric-content">
          <div className="metric-value">{formatNumber(stats.uniqueVisitors)}</div>
          <div className="metric-label">Unique Visitors</div>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-icon">📄</div>
        <div className="metric-content">
          <div className="metric-value">{formatNumber(stats.pageViews)}</div>
          <div className="metric-label">Page Views</div>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-icon">⏱️</div>
        <div className="metric-content">
          <div className="metric-value">{formatDuration(stats.totalViewDuration || 0)}</div>
          <div className="metric-label">Total Time Viewing</div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;

