/**
 * Visitors Chart Component
 * Displays unique visitors over time as an area chart
 */

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { TimeSeriesData } from './types';

interface VisitorsChartProps {
  data: TimeSeriesData[];
  loading: boolean;
}

const VisitorsChart: React.FC<VisitorsChartProps> = ({ data, loading }) => {
  // Get the secondary color from CSS custom property
  const secondaryColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--secondary-color')
    .trim() || '#3b82f6';
  if (loading) {
    return (
      <div className="metrics-section">
        <h3>Unique Visitors Over Time</h3>
        <div className="chart-loading">Loading chart data...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="metrics-section">
        <h3>Unique Visitors Over Time</h3>
        <div className="no-data">No visitor data available for this time range</div>
      </div>
    );
  }

  const formattedData = data.map(point => {
    // Parse date string as local time to avoid timezone shifting
    const [year, month, day] = point.date.toString().split(/[-T]/);
    const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return {
      ...point,
      formattedDate: localDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    };
  });

  return (
    <div className="metrics-section">
      <h3>Unique Visitors Over Time</h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart 
            data={formattedData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={secondaryColor} stopOpacity={0.6}/>
                <stop offset="95%" stopColor={secondaryColor} stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#535353" opacity={0.5} />
            <XAxis 
              dataKey="formattedDate" 
              stroke="#9ca3af"
              style={{ fontSize: '0.875rem', fill: '#9ca3af' }}
              interval="preserveStartEnd"
              tick={{ fill: '#9ca3af' }}
            />
            <YAxis 
              stroke="#9ca3af"
              style={{ fontSize: '0.875rem', fill: '#9ca3af' }}
              allowDecimals={false}
              tick={{ fill: '#9ca3af' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(45, 45, 45, 0.98)',
                border: '1px solid #535353',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                color: '#e5e7eb'
              }}
              labelStyle={{ color: '#f9fafb', fontWeight: 600 }}
              itemStyle={{ color: secondaryColor }}
              formatter={(value: number) => [value, 'Visitors']}
            />
            <Area 
              type="linear" 
              dataKey="count" 
              stroke={secondaryColor} 
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorVisitors)"
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default VisitorsChart;

