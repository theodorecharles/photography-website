/**
 * Analytics tracking utility for sending events to the backend API.
 * The backend then forwards events to OpenObserve with authentication.
 * This keeps credentials secure and never exposes them in the frontend.
 * 
 * Events are signed with HMAC-SHA256 to prevent tampering.
 */

import { API_URL } from '../config';

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
let hmacSecret: string | null = null;

/**
 * Initialize analytics
 */
export function initAnalytics(enabled: boolean, secret?: string) {
  analyticsEnabled = enabled;
  hmacSecret = secret || null;
}

/**
 * Generate HMAC-SHA256 signature for payload
 */
async function generateHmac(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(payload);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get base event data that's common to all events
 */
function getBaseEventData(): Partial<AnalyticsEvent> {
  return {
    timestamp: new Date().toISOString(),
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
 * Send an event to the backend API which forwards to OpenObserve
 * Events are signed with HMAC to prevent tampering
 */
async function sendEvent(eventData: Partial<AnalyticsEvent>) {
  if (!analyticsEnabled) {
    return;
  }

  const event: AnalyticsEvent = {
    ...getBaseEventData(),
    ...eventData,
  } as AnalyticsEvent;

  try {
    const payload = JSON.stringify([event]);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add HMAC signature if secret is available
    if (hmacSecret) {
      const signature = await generateHmac(payload, hmacSecret);
      headers['X-Analytics-Signature'] = signature;
    }
    
    await fetch(`${API_URL}/api/analytics/track`, {
      method: 'POST',
      headers,
      body: payload,
    });
  } catch (error) {
    // Silently fail - don't break the app if analytics fails
    console.debug('Analytics tracking failed:', error);
  }
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
export function trackPhotoNavigation(direction: 'next' | 'previous', photoId: string, album: string) {
  sendEvent({
    event_type: 'photo_navigation',
    direction: direction,
    photo_id: photoId,
    album: album,
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
export function trackModalClose(photoId: string, album: string, viewDuration?: number) {
  sendEvent({
    event_type: 'modal_close',
    photo_id: photoId,
    album: album,
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
 * Track admin authentication
 */
export function trackAdminAuth(action: 'login' | 'logout', userEmail?: string) {
  sendEvent({
    event_type: 'admin_auth',
    action: action,
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
 * Track album management actions
 */
export function trackAlbumManagement(action: 'create' | 'delete', albumName: string) {
  sendEvent({
    event_type: 'admin_album_management',
    action: action,
    album_name: albumName,
  });
}

/**
 * Track photo management actions
 */
export function trackPhotoManagement(action: 'upload' | 'delete', albumName: string, photoCount?: number, photoId?: string) {
  sendEvent({
    event_type: 'admin_photo_management',
    action: action,
    album_name: albumName,
    photo_count: photoCount,
    photo_id: photoId,
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

