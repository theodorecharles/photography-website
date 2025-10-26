/**
 * Metrics Component
 * Displays analytics data and visualizations from OpenObserve
 */

import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { API_URL } from '../config';
import { fetchWithRateLimitCheck } from '../utils/fetchWrapper';
import './Metrics.css';

interface Stats {
  uniqueVisitors: number;
  pageViews: number;
  topPages: Array<{ page_path: string; views: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  eventTypes: Array<{ event_type: string; count: number }>;
  stream: string;
  timeRange: {
    start: number;
    end: number;
    days: number;
  };
  totalViewDuration?: number;
  topPicturesByDuration?: Array<{ photo_id: string; total_duration: number; avg_duration: number; views: number }>;
}

interface TimeSeriesData {
  date: string;
  count: number;
}

export default function Metrics() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(30); // days
  const [visitorsOverTime, setVisitorsOverTime] = useState<TimeSeriesData[]>([]);
  const [loadingTimeSeries, setLoadingTimeSeries] = useState(false);

  useEffect(() => {
    loadStats();
    loadVisitorsOverTime();
  }, [timeRange]);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRateLimitCheck(`${API_URL}/api/metrics/stats?days=${timeRange}`);

      if (!res.ok) {
        throw new Error('Failed to load metrics');
      }

      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to load metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  const loadVisitorsOverTime = async () => {
    setLoadingTimeSeries(true);
    try {
      // Get browser timezone offset in hours (negative of getTimezoneOffset() / 60)
      const offsetMinutes = new Date().getTimezoneOffset();
      const offsetHours = -offsetMinutes / 60; // Negative because getTimezoneOffset returns opposite sign
      
      const res = await fetchWithRateLimitCheck(`${API_URL}/api/metrics/visitors-over-time?days=${timeRange}&timezoneOffset=${offsetHours}`);

      if (!res.ok) {
        throw new Error('Failed to load time series data');
      }

      const data = await res.json();
      const actualData = data.hits || [];
      
      // Fill in missing dates with 0 visitors
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const filledData: TimeSeriesData[] = [];
      
      for (let i = timeRange - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Find if we have data for this date (normalize API date to YYYY-MM-DD format)
        const existing = actualData.find((d: any) => {
          const apiDateStr = d.date?.toString().split('T')[0];
          return apiDateStr === dateStr;
        });
        
        filledData.push({
          date: dateStr,
          count: existing ? existing.count : 0
        });
      }
      
      setVisitorsOverTime(filledData);
    } catch (err) {
      console.error('Failed to load time series:', err);
    } finally {
      setLoadingTimeSeries(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    // Pad with zeros for consistent formatting
    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
    
    return `${hh}:${mm}:${ss}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const truncateUrl = (url: string, maxLength: number = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  if (loading && !stats) {
    return (
      <div className="metrics-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading metrics...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="metrics-container">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={loadStats} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="metrics-container">
      <div className="metrics-header">
        <h2>Metrics</h2>
        <div className="time-range-selector">
          <label>Time Range:</label>
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="time-range-select"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
        </div>
      </div>

      {stats && (
        <>
          {/* Summary Cards */}
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

          {/* Visitors Over Time Chart */}
          <div className="metrics-section">
            <h3>Unique Visitors Over Time</h3>
            {loadingTimeSeries ? (
              <div className="chart-loading">Loading chart data...</div>
            ) : visitorsOverTime.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={380}>
                  <AreaChart 
                    data={visitorsOverTime.map(point => {
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
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05}/>
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
                      itemStyle={{ color: '#22c55e' }}
                      formatter={(value: number) => [value, 'Visitors']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#22c55e" 
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorVisitors)"
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="no-data">No visitor data available for this time range</div>
            )}
          </div>

          {/* Top Pictures by View Duration */}
          <div className="metrics-section">
            <h3>Most Engaging Pictures</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Pictures ranked by total time spent viewing
            </p>
            {stats.topPicturesByDuration && stats.topPicturesByDuration.length > 0 ? (
              <div className="metrics-table">
                <table>
                  <thead>
                    <tr>
                      <th>Photo ID</th>
                      <th className="text-right">Total Time</th>
                      <th className="text-right">Avg Time</th>
                      <th className="text-right">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topPicturesByDuration.map((picture, index) => {
                      // Extract album and photo name from photo_id (e.g., "people/08053-00001.jpg")
                      const [albumName, photoName] = picture.photo_id.split('/');
                      const photoUrl = `/album/${albumName}?photo=${encodeURIComponent(photoName)}`;
                      const thumbnailUrl = `${API_URL}/photos/${albumName}/${photoName}`;
                      
                      return (
                        <tr 
                          key={index} 
                          className="clickable-row"
                          onClick={() => window.location.href = photoUrl}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="page-path photo-id-cell">
                            <div className="photo-id-wrapper">
                              <span>{picture.photo_id}</span>
                              <div className="photo-thumbnail-preview">
                                <img src={thumbnailUrl} alt={photoName} />
                              </div>
                            </div>
                          </td>
                          <td className="text-right">{formatDuration(picture.total_duration)}</td>
                          <td className="text-right">{formatDuration(picture.avg_duration)}</td>
                          <td className="text-right">{formatNumber(picture.views)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-data">No picture view duration data available</div>
            )}
          </div>

          {/* Top Pages */}
          <div className="metrics-section">
            <h3>Top Pages</h3>
            {stats.topPages.length > 0 ? (
              <div className="metrics-table">
                <table>
                  <thead>
                    <tr>
                      <th>Page Path</th>
                      <th className="text-right">Views</th>
                      <th className="text-right">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topPages.map((page, index) => {
                      const percentage = stats.pageViews > 0 
                        ? ((page.views / stats.pageViews) * 100).toFixed(1)
                        : '0';
                      return (
                        <tr key={index}>
                          <td className="page-path">{page.page_path}</td>
                          <td className="text-right">{formatNumber(page.views)}</td>
                          <td className="text-right">{percentage}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-data">No page view data available</div>
            )}
          </div>

          {/* Top Referrers */}
          <div className="metrics-section">
            <h3>Top Referrers</h3>
            {stats.topReferrers.length > 0 ? (
              <div className="metrics-table">
                <table>
                  <thead>
                    <tr>
                      <th>Referrer</th>
                      <th className="text-right">Visits</th>
                      <th className="text-right">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topReferrers.map((referrer, index) => {
                      const totalReferrers = stats.topReferrers.reduce((sum, r) => sum + r.count, 0);
                      const percentage = totalReferrers > 0 
                        ? ((referrer.count / totalReferrers) * 100).toFixed(1)
                        : '0';
                      return (
                        <tr key={index}>
                          <td className="referrer" title={referrer.referrer}>
                            {truncateUrl(referrer.referrer)}
                          </td>
                          <td className="text-right">{formatNumber(referrer.count)}</td>
                          <td className="text-right">{percentage}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-data">No referrer data available</div>
            )}
          </div>

          {/* Event Types Distribution */}
          <div className="metrics-section">
            <h3>Event Types</h3>
            {stats.eventTypes.length > 0 ? (
              <div className="metrics-table">
                <table>
                  <thead>
                    <tr>
                      <th>Event Type</th>
                      <th className="text-right">Count</th>
                      <th className="text-right">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.eventTypes.map((event, index) => {
                      const totalEvents = stats.eventTypes.reduce((sum, e) => sum + e.count, 0);
                      const percentage = totalEvents > 0 
                        ? ((event.count / totalEvents) * 100).toFixed(1)
                        : '0';
                      return (
                        <tr key={index}>
                          <td className="event-type">{event.event_type}</td>
                          <td className="text-right">{formatNumber(event.count)}</td>
                          <td className="text-right">{percentage}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-data">No event data available</div>
            )}
          </div>

          {/* Footer Info */}
          <div className="metrics-footer">
            <p>
              Data from {formatDate(stats.timeRange.start)} to {formatDate(stats.timeRange.end)}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

