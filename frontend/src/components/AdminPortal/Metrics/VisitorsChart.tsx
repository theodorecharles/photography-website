/**
 * Visitors Over Time Chart Component
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
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
import { SkeletonChart } from './SkeletonLoader';

interface VisitorsChartProps {
  data: TimeSeriesData[];
  loading: boolean;
  secondaryColor: string;
}

const VisitorsChart: React.FC<VisitorsChartProps> = ({ data, loading, secondaryColor }) => {
  const { t } = useTranslation();
  
  if (loading) {
    return <SkeletonChart />;
  }

  if (data.length === 0) {
    return <div className="no-data">{t('metrics.charts.noVisitorData')}</div>;
  }

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart 
          data={data.map(point => {
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
          })}
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
            formatter={(value: number) => [value, t('metrics.charts.visitors')]}
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
  );
};

export default VisitorsChart;
