/**
 * Stats Cards Component
 * Displays summary statistics cards (Unique Visitors, Page Views, Total Time)
 */

import React from 'react';
import { Stats } from './types';

interface StatsCardsProps {
  stats: Stats;
}

const formatNumber = (num: number) => {
  return num.toLocaleString();
};

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

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

