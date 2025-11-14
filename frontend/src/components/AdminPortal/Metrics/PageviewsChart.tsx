/**
 * Pageviews by Hour Chart Component
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
import { HourlyPageviewData } from './types';

interface PageviewsChartProps {
  data: HourlyPageviewData[];
  loading: boolean;
  secondaryColor: string;
}

const PageviewsChart: React.FC<PageviewsChartProps> = ({ data, loading, secondaryColor }) => {
  if (loading) {
    return <div className="chart-loading">Loading chart data...</div>;
  }

  if (data.length === 0) {
    return <div className="no-data">No hourly pageview data available for this time range</div>;
  }

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart 
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorPageviews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={secondaryColor} stopOpacity={0.6}/>
              <stop offset="95%" stopColor={secondaryColor} stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#535353" opacity={0.5} />
          <XAxis 
            dataKey="hour" 
            stroke="#9ca3af"
            style={{ fontSize: '0.875rem', fill: '#9ca3af' }}
            tick={{ fill: '#9ca3af' }}
            ticks={data
              .filter((d) => {
                const date = new Date(d.hour);
                const localHour = date.getHours();
                return localHour === 0; // Show only midnight hours
              })
              .map((d) => d.hour)}
            tickFormatter={(value: string) => {
              const date = new Date(value);
              return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              });
            }}
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
            formatter={(value: number) => [value, 'Pageviews']}
          />
          <Area 
            type="linear" 
            dataKey="pageviews" 
            stroke={secondaryColor} 
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorPageviews)"
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PageviewsChart;

