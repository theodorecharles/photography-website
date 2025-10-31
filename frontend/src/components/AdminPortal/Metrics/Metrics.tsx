/**
 * Metrics Component
 * Displays analytics data and visualizations from OpenObserve
 */

import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { API_URL } from '../../config';
import { fetchWithRateLimitCheck } from '../../utils/fetchWrapper';
import VisitorMap from './VisitorMap';
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

interface HourlyPageviewData {
  hour: string;
  pageviews: number;
}

interface VisitorLocation {
  latitude: number;
  longitude: number;
  city: string | null;
  region: string | null;
  country: string | null;
  visit_count: number;
  unique_visitors: number;
}

export default function Metrics() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(30); // days
  const [visitorsOverTime, setVisitorsOverTime] = useState<TimeSeriesData[]>([]);
  const [loadingTimeSeries, setLoadingTimeSeries] = useState(false);
  const [pageviewsByHour, setPageviewsByHour] = useState<HourlyPageviewData[]>([]);
  const [loadingPageviewsByHour, setLoadingPageviewsByHour] = useState(false);
  const [visitorLocations, setVisitorLocations] = useState<VisitorLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, Set<number>>>({});

  const loadStats = useCallback(async () => {
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
  }, [timeRange]);

  const loadVisitorsOverTime = useCallback(async () => {
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
  }, [timeRange]);

  const loadPageviewsByHour = useCallback(async () => {
    setLoadingPageviewsByHour(true);
    try {
      // Get browser timezone offset
      const offsetMinutes = new Date().getTimezoneOffset();
      const offsetHours = -offsetMinutes / 60;
      
      const res = await fetchWithRateLimitCheck(`${API_URL}/api/metrics/pageviews-by-hour?days=${timeRange}&timezoneOffset=${offsetHours}`);

      if (!res.ok) {
        throw new Error('Failed to load hourly pageviews');
      }

      const data = await res.json();
      const hits = data.hits || [];
      
      // Fill in missing hours with 0 pageviews
      const now = new Date();
      const filledData: HourlyPageviewData[] = [];
      
      // Calculate the start time (timeRange days ago)
      const startTime = new Date(now);
      startTime.setDate(startTime.getDate() - timeRange);
      startTime.setMinutes(0, 0, 0); // Round to the hour
      
      // Generate all hours in the time range
      const currentHour = new Date(startTime);
      while (currentHour <= now) {
        // Find if we have data for this hour
        const existing = hits.find((d: any) => {
          if (!d.hour_local) return false;
          const apiHour = new Date(d.hour_local);
          return apiHour.getTime() === currentHour.getTime();
        });
        
        filledData.push({
          hour: currentHour.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            hour12: true
          }),
          pageviews: existing ? existing.pageviews : 0
        });
        
        // Move to next hour
        currentHour.setHours(currentHour.getHours() + 1);
      }
      
      setPageviewsByHour(filledData);
    } catch (err) {
      console.error('Failed to load hourly pageviews:', err);
    } finally {
      setLoadingPageviewsByHour(false);
    }
  }, [timeRange]);

  const loadVisitorLocations = useCallback(async () => {
    setLoadingLocations(true);
    try {
      const res = await fetchWithRateLimitCheck(`${API_URL}/api/metrics/visitor-locations?days=${timeRange}`);

      if (!res.ok) {
        throw new Error('Failed to load location data');
      }

      const data = await res.json();
      setVisitorLocations(data.locations || []);
    } catch (err) {
      console.error('Failed to load visitor locations:', err);
    } finally {
      setLoadingLocations(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadStats();
    loadVisitorsOverTime();
    loadPageviewsByHour();
    loadVisitorLocations();
  }, [loadStats, loadVisitorsOverTime, loadPageviewsByHour, loadVisitorLocations]);

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
    // Convert microseconds to milliseconds for proper date formatting
    return new Date(timestamp / 1000).toLocaleDateString();
  };

  const truncateUrl = (url: string, maxLength: number = 40) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  const toggleRowExpansion = (tableName: string, rowIndex: number) => {
    setExpandedRows(prev => {
      const newExpanded = { ...prev };
      if (!newExpanded[tableName]) {
        newExpanded[tableName] = new Set();
      }
      const tableExpanded = new Set(newExpanded[tableName]);
      if (tableExpanded.has(rowIndex)) {
        tableExpanded.delete(rowIndex);
      } else {
        tableExpanded.add(rowIndex);
      }
      newExpanded[tableName] = tableExpanded;
      return newExpanded;
    });
  };

  const isRowExpanded = (tableName: string, rowIndex: number): boolean => {
    return expandedRows[tableName]?.has(rowIndex) || false;
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

          {/* Visitor Locations Map */}
          <div className="metrics-section">
            <h3>Visitor Locations</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              Geographic distribution of visitors based on their IP addresses
            </p>
            <VisitorMap locations={visitorLocations} loading={loadingLocations} />
          </div>

          {/* Visitors Over Time Chart */}
          <div className="metrics-section">
            <h3>Unique Visitors Over Time</h3>
            {loadingTimeSeries ? (
              <div className="chart-loading">Loading chart data...</div>
            ) : visitorsOverTime.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
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
                      type="linear" 
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

          {/* Pageviews by Hour Chart */}
          <div className="metrics-section">
            <h3>Pageviews per Hour</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              Hourly breakdown of page views showing traffic patterns throughout the day
            </p>
            {loadingPageviewsByHour ? (
              <div className="chart-loading">Loading chart data...</div>
            ) : pageviewsByHour.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart 
                    data={pageviewsByHour}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorPageviews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#535353" opacity={0.5} />
                    <XAxis 
                      dataKey="hour" 
                      stroke="#9ca3af"
                      style={{ fontSize: '0.75rem', fill: '#9ca3af' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fill: '#9ca3af' }}
                      interval={Math.max(Math.floor(pageviewsByHour.length / 20), 0)}
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
                      formatter={(value: number) => [value, 'Pageviews']}
                    />
                    <Area 
                      type="linear" 
                      dataKey="pageviews" 
                      stroke="#22c55e" 
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorPageviews)"
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="no-data">No hourly pageview data available for this time range</div>
            )}
          </div>

          {/* Top Pictures by View Duration */}
          <div className="metrics-section">
            <h3>Most Engaging Pictures</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              Pictures ranked by total time spent viewing
            </p>
            {stats.topPicturesByDuration && stats.topPicturesByDuration.length > 0 ? (
              <div className="metrics-table">
                <table>
                  <thead>
                    <tr>
                      <th>Thumbnail</th>
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
                      const expanded = isRowExpanded('pictures', index);
                      
                      return (
                        <>
                          <tr 
                            key={index} 
                            className={`clickable-row ${expanded ? 'expanded-row' : ''}`}
                            onClick={() => toggleRowExpansion('pictures', index)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td className="photo-thumbnail-cell">
                              <div className="photo-thumbnail-wrapper">
                                <img src={thumbnailUrl} alt={photoName} className="photo-thumbnail-small" />
                                <div className="photo-thumbnail-preview">
                                  <img src={thumbnailUrl} alt={photoName} />
                                </div>
                              </div>
                            </td>
                            <td className="text-right">{formatDuration(picture.total_duration)}</td>
                            <td className="text-right">{formatDuration(picture.avg_duration)}</td>
                            <td className="text-right">{formatNumber(picture.views)}</td>
                          </tr>
                          {expanded && (
                            <tr key={`${index}-expanded`} className="expanded-content-row">
                              <td colSpan={4}>
                                <div className="expanded-content">
                                  <div className="expanded-detail">
                                    <strong>Photo ID:</strong> {picture.photo_id}
                                  </div>
                                  <div className="expanded-detail">
                                    <strong>Album:</strong> {albumName}
                                  </div>
                                  <div className="expanded-detail">
                                    <strong>File Name:</strong> {photoName}
                                  </div>
                                  <div className="expanded-actions">
                                    <a 
                                      href={photoUrl} 
                                      className="view-photo-btn"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      View Photo →
                                    </a>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
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
                      const expanded = isRowExpanded('pages', index);
                      return (
                        <>
                          <tr 
                            key={index} 
                            className={`clickable-row ${expanded ? 'expanded-row' : ''}`}
                            onClick={() => toggleRowExpansion('pages', index)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td className="page-path">{page.page_path}</td>
                            <td className="text-right">{formatNumber(page.views)}</td>
                            <td className="text-right">{percentage}%</td>
                          </tr>
                          {expanded && (
                            <tr key={`${index}-expanded`} className="expanded-content-row">
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
                        </>
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
                      const expanded = isRowExpanded('referrers', index);
                      return (
                        <>
                          <tr 
                            key={index}
                            className={`clickable-row ${expanded ? 'expanded-row' : ''}`}
                            onClick={() => toggleRowExpansion('referrers', index)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td className="referrer" title={referrer.referrer}>
                              {truncateUrl(referrer.referrer)}
                            </td>
                            <td className="text-right">{formatNumber(referrer.count)}</td>
                            <td className="text-right">{percentage}%</td>
                          </tr>
                          {expanded && (
                            <tr key={`${index}-expanded`} className="expanded-content-row">
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
                        </>
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
                      const expanded = isRowExpanded('events', index);
                      return (
                        <>
                          <tr 
                            key={index}
                            className={`clickable-row ${expanded ? 'expanded-row' : ''}`}
                            onClick={() => toggleRowExpansion('events', index)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td className="event-type">{event.event_type}</td>
                            <td className="text-right">{formatNumber(event.count)}</td>
                            <td className="text-right">{percentage}%</td>
                          </tr>
                          {expanded && (
                            <tr key={`${index}-expanded`} className="expanded-content-row">
                              <td colSpan={3}>
                                <div className="expanded-content">
                                  <div className="expanded-detail">
                                    <strong>Event Type:</strong> {event.event_type}
                                  </div>
                                  <div className="expanded-detail">
                                    <strong>Total Count:</strong> {formatNumber(event.count)}
                                  </div>
                                  <div className="expanded-detail">
                                    <strong>Percentage:</strong> {percentage}% of all events
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
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

