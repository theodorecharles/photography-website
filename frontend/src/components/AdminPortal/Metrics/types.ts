/**
 * Shared types for Metrics components
 */

export interface Stats {
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
  topPicturesByDuration?: Array<{ 
    photo_id: string; 
    total_duration: number; 
    avg_duration: number; 
    views: number 
  }>;
}

export interface TimeSeriesData {
  date: string;
  count: number;
}

export interface HourlyPageviewData {
  hour: string;
  pageviews: number;
}

export interface VisitorLocation {
  latitude: number;
  longitude: number;
  city: string | null;
  region: string | null;
  country: string | null;
  visit_count: number;
  unique_visitors: number;
}

