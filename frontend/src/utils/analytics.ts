/**
 * Analytics tracking utility for sending events to the backend API.
 * The backend then forwards events to OpenObserve with authentication.
 * This keeps credentials secure and never exposes them in the frontend.
 * 
 * Events are validated by origin on the backend to prevent unauthorized tracking.
 */

import { API_URL } from '../config';
// import { showToast } from './toast'; // Disabled - working correctly

interface AnalyticsEvent {
  event_type: string;
  timestamp: string;
  page_url: string;
  page_path: string;
  referrer: string;
  user_agent: string;
  screen_width: number;
  screen_height: number;
  viewport_width: number;
  viewport_height: number;
  [key: string]: string | number | boolean;
}

let analyticsEnabled = false;
let eventQueue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 5000; // 5 seconds
const BATCH_SIZE = 20; // events

/**
 * Initialize analytics
 */
export function initAnalytics(enabled: boolean) {
  analyticsEnabled = enabled;

  if (enabled) {
    // Flush events when page is being unloaded
    window.addEventListener('beforeunload', () => {
      flushQueue(true);
    });

    // Flush events when page visibility changes (e.g., user switches tabs or minimizes)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushQueue(true);
      }
    });

    // Flush events on page freeze (mobile browsers)
    window.addEventListener('pagehide', () => {
      flushQueue(true);
    });
  }
}

/**
 * Get base event data that's common to all events
 */
function getBaseEventData(): Partial<AnalyticsEvent> {
  const timestamp = new Date().toISOString();
  return {
    timestamp,
    _timestamp: Date.now() * 1000000, // OpenObserve expects nanoseconds for timestamp override
    page_url: window.location.href,
    page_path: window.location.pathname,
    referrer: document.referrer || 'direct',
    user_agent: navigator.userAgent,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
  };
}

/**
 * Flush the event queue by sending all queued events to the backend
 */
async function flushQueue(useBeacon = false): Promise<void> {
  if (eventQueue.length === 0) {
    return;
  }

  // Take all events from the queue
  const eventsToSend = [...eventQueue];
  const eventCount = eventsToSend.length;
  eventQueue = [];

  // Clear the flush timer if it exists
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Use sendBeacon for page unload if available, otherwise use fetch
    if (useBeacon && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(eventsToSend)], { type: 'application/json' });
      navigator.sendBeacon(`${API_URL}/api/analytics/track`, blob);
    } else {
      await fetch(`${API_URL}/api/analytics/track`, {
        method: 'POST',
        headers,
        body: JSON.stringify(eventsToSend),
        credentials: 'include', // Include cookies for session-based validation
        keepalive: useBeacon, // Keep request alive during page unload
      });
    }
  } catch (error) {
    // Silently fail - don't break the app if analytics fails
    console.debug('Analytics tracking failed:', error);
  }
}

/**
 * Schedule a flush of the event queue
 */
function scheduleFlush() {
  if (flushTimer) {
    return; // Timer already scheduled
  }

  flushTimer = setTimeout(() => {
    flushQueue();
  }, FLUSH_INTERVAL);
}

/**
 * Queue an event and flush if needed
 */
async function queueEvent(eventData: Partial<AnalyticsEvent>) {
  if (!analyticsEnabled) {
    return;
  }

  const event: AnalyticsEvent = {
    ...getBaseEventData(),
    ...eventData,
  } as AnalyticsEvent;

  eventQueue.push(event);

  // Flush immediately if we've reached the batch size
  if (eventQueue.length >= BATCH_SIZE) {
    await flushQueue();
  } else {
    // Schedule a flush if not already scheduled
    scheduleFlush();
  }
}

/**
 * Send an event (now queued for batching)
 * The backend validates the request origin to prevent unauthorized tracking
 */
async function sendEvent(eventData: Partial<AnalyticsEvent>) {
  return queueEvent(eventData);
}

/**
 * Track a page view
 */
export function trackPageView(pagePath: string, pageTitle?: string) {
  sendEvent({
    event_type: 'pageview',
    page_title: pageTitle || document.title,
    page_path: pagePath,
  });
}

/**
 * Track a photo click (opening modal)
 */
export function trackPhotoClick(photoId: string, album: string, photoTitle: string) {
  sendEvent({
    event_type: 'photo_click',
    photo_id: photoId,
    album: album,
    photo_title: photoTitle,
  });
}

/**
 * Track photo navigation in modal
 */
export function trackPhotoNavigation(direction: 'next' | 'previous', photoId: string, album: string, photoTitle: string, viewDuration?: number) {
  sendEvent({
    event_type: 'photo_navigation',
    direction: direction,
    photo_id: photoId,
    album: album,
    photo_title: photoTitle,
    view_duration_ms: viewDuration,
  });
}

/**
 * Track photo download
 */
export function trackPhotoDownload(photoId: string, album: string, photoTitle: string) {
  sendEvent({
    event_type: 'photo_download',
    photo_id: photoId,
    album: album,
    photo_title: photoTitle,
  });
}

/**
 * Track modal close
 */
export function trackModalClose(photoId: string, album: string, photoTitle: string, viewDuration?: number) {
  sendEvent({
    event_type: 'modal_close',
    photo_id: photoId,
    album: album,
    photo_title: photoTitle,
    view_duration_ms: viewDuration,
  });
}

/**
 * Track album navigation
 */
export function trackAlbumNavigation(albumName: string, source: 'header' | 'footer' | 'mobile_menu') {
  sendEvent({
    event_type: 'album_navigation',
    album: albumName,
    navigation_source: source,
  });
}

/**
 * Track external link click
 */
export function trackExternalLinkClick(linkTitle: string, linkUrl: string, source: 'header' | 'mobile_menu') {
  sendEvent({
    event_type: 'external_link_click',
    link_title: linkTitle,
    link_url: linkUrl,
    navigation_source: source,
  });
}

/**
 * Track dropdown interactions
 */
export function trackDropdownOpen(dropdownType: 'albums' | 'links' | 'mobile_menu') {
  sendEvent({
    event_type: 'dropdown_interaction',
    action: 'open',
    dropdown_type: dropdownType,
  });
}

/**
 * Track dropdown close
 */
export function trackDropdownClose(dropdownType: 'albums' | 'links' | 'mobile_menu', reason: 'click' | 'scroll' | 'navigation' | 'outside_click') {
  sendEvent({
    event_type: 'dropdown_interaction',
    action: 'close',
    dropdown_type: dropdownType,
    close_reason: reason,
  });
}

/**
 * Track error events
 */
export function trackError(errorMessage: string, errorContext?: string) {
  sendEvent({
    event_type: 'error',
    error_message: errorMessage,
    error_context: errorContext || 'unknown',
  });
}

/**
 * Track search or filter actions
 */
export function trackSearch(query: string, resultCount: number) {
  sendEvent({
    event_type: 'search',
    search_query: query,
    result_count: resultCount,
  });
}

/**
 * Track successful admin login/portal access
 */
export function trackLoginSucceeded(userEmail?: string, userName?: string) {
  sendEvent({
    event_type: 'login_succeeded',
    user_email: userEmail || 'unknown',
    user_name: userName,
  });
}

/**
 * Track logout
 */
export function trackLogout(userEmail?: string) {
  sendEvent({
    event_type: 'logout',
    user_email: userEmail || 'unknown',
  });
}

/**
 * Track admin tab navigation
 */
export function trackAdminTabChange(tabName: string) {
  sendEvent({
    event_type: 'admin_tab_change',
    tab_name: tabName,
  });
}

/**
 * Track album creation
 */
export function trackAlbumCreated(album: string) {
  sendEvent({
    event_type: 'album_created',
    album: album,
  });
}

/**
 * Track album deletion
 */
export function trackAlbumDeleted(album: string) {
  sendEvent({
    event_type: 'album_deleted',
    album: album,
  });
}

/**
 * Track photo upload
 */
export function trackPhotoUploaded(album: string, photoCount: number, photoTitles: string[]) {
  sendEvent({
    event_type: 'photo_uploaded',
    album: album,
    photo_count: photoCount,
    photo_titles: photoTitles.join(', '),
  });
}

/**
 * Track photo deletion
 */
export function trackPhotoDeleted(album: string, photoId: string, photoTitle: string) {
  sendEvent({
    event_type: 'photo_deleted',
    album: album,
    photo_id: photoId,
    photo_title: photoTitle,
  });
}

/**
 * Track external links management
 */
export function trackExternalLinksUpdate(linkCount: number) {
  sendEvent({
    event_type: 'admin_external_links_update',
    link_count: linkCount,
  });
}

/**
 * Track branding settings updates
 */
export function trackBrandingUpdate(fields: string[]) {
  sendEvent({
    event_type: 'admin_branding_update',
    updated_fields: fields.join(','),
    field_count: fields.length,
  });
}

/**
 * Track avatar uploads
 */
export function trackAvatarUpload() {
  sendEvent({
    event_type: 'admin_avatar_upload',
  });
}

