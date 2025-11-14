/**
 * Metrics Component
 * Displays analytics data and visualizations from OpenObserve
 */

import { useEffect, useState, useCallback } from 'react';
import { API_URL } from '../../../config';
import { fetchWithRateLimitCheck } from '../../../utils/fetchWrapper';
import { formatNumber } from '../../../utils/formatters';
import { formatDateFromMicroseconds, formatDurationDetailed } from '../../../utils/metricsHelpers';
import VisitorMap from './VisitorMap';
import VisitorsChart from './VisitorsChart';
import PageviewsChart from './PageviewsChart';
import PicturesTable from './PicturesTable';
import PagesTable from './PagesTable';
import ReferrersTable from './ReferrersTable';
import EventTypesTable from './EventTypesTable';
import './Metrics.css';

// Import interfaces from types.ts (canonical location)
import type { Stats, TimeSeriesData, HourlyPageviewData, VisitorLocation } from './types';

export default function Metrics() {
  // Get the secondary color from CSS custom property
  const secondaryColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--secondary-color')
    .trim() || '#3b82f6';

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
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

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
          hour: currentHour.toISOString(),
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

  const toggleRowExpansion = (tableName: string, rowIndex: number) => {
    setExpandedRows(prev => {
      const newExpanded = { ...prev };
      if (!newExpanded[tableName]) {
        newExpanded[tableName] = new Set();
      }
      const tableExpanded = new Set(newExpanded[tableName]);
      const isExpanding = !tableExpanded.has(rowIndex);
      
      if (tableExpanded.has(rowIndex)) {
        tableExpanded.delete(rowIndex);
      } else {
        tableExpanded.add(rowIndex);
      }
      newExpanded[tableName] = tableExpanded;
      
      // Scroll expanded row into view
      if (isExpanding) {
        setTimeout(() => {
          // Find the specific table by data attribute and get its rows
          const table = document.querySelector(`.metrics-table[data-table-name="${tableName}"]`);
          if (table) {
            const rows = table.querySelectorAll('tbody tr.clickable-row');
            const targetRow = rows[rowIndex];
            if (targetRow) {
              const nextRow = targetRow.nextElementSibling;
              if (nextRow && nextRow.classList.contains('expanded-content-row')) {
                nextRow.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'nearest',
                  inline: 'nearest'
                });
              }
            }
          }
        }, 50);
      }
      
      return newExpanded;
    });
  };

  const toggleTableExpansion = (tableName: string) => {
    setExpandedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
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
    <section className="admin-section">
      <div className="metrics-header-wrapper">
        <div className="metrics-header-content">
          <h2>📊 Metrics</h2>
          <p className="section-description">View analytics and visitor data for your photography website</p>
        </div>
        <div className="metrics-time-range">
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
                <div className="metric-value">{formatDurationDetailed(stats.totalViewDuration || 0)}</div>
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

          {/* Charts Grid - Side by Side on Desktop */}
          <div className="metrics-grid">
            <div className="metrics-section">
              <h3>Unique Visitors Over Time</h3>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                Daily breakdown of unique visitors
              </p>
              <VisitorsChart 
                data={visitorsOverTime} 
                loading={loadingTimeSeries} 
                secondaryColor={secondaryColor} 
              />
            </div>

            <div className="metrics-section">
              <h3>Pageviews per Hour</h3>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                Hourly breakdown of page views
              </p>
              <PageviewsChart 
                data={pageviewsByHour} 
                loading={loadingPageviewsByHour} 
                secondaryColor={secondaryColor} 
              />
            </div>
          </div>

          {/* Tables Grid - Most Engaging Pictures and Top Pages */}
          <div className="metrics-grid">
            <div className="metrics-section">
              <h3>Most Engaging Pictures</h3>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                Pictures ranked by total time spent viewing
              </p>
              <PicturesTable
                pictures={stats.topPicturesByDuration || []}
                expandedRows={expandedRows['pictures'] || new Set()}
                isExpanded={expandedTables['pictures'] || false}
                onToggleRow={(index) => toggleRowExpansion('pictures', index)}
                onToggleTable={() => toggleTableExpansion('pictures')}
              />
            </div>

            <div className="metrics-section">
              <h3>Top Pages</h3>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                Pages ranked by total views
              </p>
              <PagesTable
                pages={stats.topPages || []}
                totalPageViews={stats.pageViews}
                expandedRows={expandedRows['pages'] || new Set()}
                isExpanded={expandedTables['pages'] || false}
                onToggleRow={(index) => toggleRowExpansion('pages', index)}
                onToggleTable={() => toggleTableExpansion('pages')}
              />
            </div>
          </div>

          {/* Tables Grid - Top Referrers and Event Types */}
          <div className="metrics-grid">
            <div className="metrics-section">
              <h3>Top Referrers</h3>
              <ReferrersTable
                referrers={stats.topReferrers || []}
                expandedRows={expandedRows['referrers'] || new Set()}
                isExpanded={expandedTables['referrers'] || false}
                onToggleRow={(index) => toggleRowExpansion('referrers', index)}
                onToggleTable={() => toggleTableExpansion('referrers')}
              />
            </div>

            <div className="metrics-section">
              <h3>Event Types</h3>
              <EventTypesTable
                events={stats.eventTypes || []}
                expandedRows={expandedRows['events'] || new Set()}
                isExpanded={expandedTables['events'] || false}
                onToggleRow={(index) => toggleRowExpansion('events', index)}
                onToggleTable={() => toggleTableExpansion('events')}
              />
            </div>
          </div>

          {/* Footer Info */}
          <div className="metrics-footer">
            <p>
              Data from {formatDateFromMicroseconds(stats.timeRange.start)} to {formatDateFromMicroseconds(stats.timeRange.end)}
            </p>
          </div>
        </>
      )}
    </section>
  );
}
