/**
 * Service Worker for Photography Website
 * Provides aggressive caching for optimized images ONLY
 * All other resources (JS, CSS, JSON) are handled by the browser
 */

const CACHE_VERSION = 'v8';
const CACHE_NAME = `photo-site-${CACHE_VERSION}`;

// Resources to cache immediately on install
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/photos/avatar.png', // User avatar - cache aggressively
];

// Cache strategy: Only cache optimized images
const CACHE_STRATEGIES = {
  // Images: Cache first, network fallback (images rarely change)
  images: 'cache-first',
};

/**
 * Install event - precache essential resources
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching essential resources');
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

/**
 * Determine cache strategy based on request URL
 */
function getCacheStrategy(url) {
  const urlObj = new URL(url);
  
  // Optimized images (thumbnail, modal, download) - cache aggressively
  if (urlObj.pathname.startsWith('/optimized/')) {
    return CACHE_STRATEGIES.images;
  }
  
  // User avatar - cache aggressively
  if (urlObj.pathname === '/photos/avatar.png') {
    return CACHE_STRATEGIES.images;
  }
  
  // Everything else: don't cache
  return null;
}

/**
 * Cache-first strategy: Try cache, fallback to network
 * Includes timeout handling and retry logic for resilience
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('[SW] Cache hit:', request.url);
    return cached;
  }
  
  console.log('[SW] Cache miss, fetching:', request.url);
  
  // Try fetching with retries
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Create an AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout per attempt
    
    try {
      const response = await fetch(request, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      // Only cache successful responses
      if (response.ok) {
        cache.put(request, response.clone());
        console.log('[SW] Cached image:', request.url);
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // If it's the last attempt, throw the error
      if (attempt === maxRetries) {
        if (error.name === 'AbortError') {
          console.error('[SW] Fetch timeout after retries:', request.url);
        } else {
          console.error('[SW] Fetch failed after retries:', request.url, error);
        }
        throw error;
      }
      
      // Otherwise, log and retry
      console.warn(`[SW] Fetch attempt ${attempt + 1} failed, retrying...`, request.url);
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
    }
  }
}

/**
 * Network-first strategy: Try network, fallback to cache
 */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const response = await fetch(request);
    
    // Cache the fresh response
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    console.log('[SW] Network fetch successful:', request.url);
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cached = await cache.match(request);
    
    if (cached) {
      console.log('[SW] Serving from cache:', request.url);
      return cached;
    }
    
    console.error('[SW] No cache available:', request.url, error);
    throw error;
  }
}

/**
 * Network-only strategy: Always fetch from network
 */
async function networkOnly(request) {
  return fetch(request);
}

/**
 * Fetch event - intercept and cache requests
 */
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip chrome extensions and non-http(s) requests
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  // Skip external requests (let them handle their own caching/errors)
  const urlObj = new URL(event.request.url);
  if (urlObj.hostname.includes('basemaps.cartocdn.com') || 
      urlObj.hostname.includes('openstreetmap.org') ||
      urlObj.hostname.includes('gravatar.com')) {
    return;
  }
  
  const strategy = getCacheStrategy(event.request.url);
  
  // Only intercept requests we want to cache (images)
  if (!strategy) {
    return; // Let browser handle everything else
  }
  
  event.respondWith(
    (async () => {
      try {
        switch (strategy) {
          case 'cache-first':
            return await cacheFirst(event.request);
          case 'network-first':
            return await networkFirst(event.request);
          case 'network-only':
            return await networkOnly(event.request);
          default:
            return await networkFirst(event.request);
        }
      } catch (error) {
        console.error('[SW] Request failed:', event.request.url, error);
        
        // For image requests, return a 503 (Service Unavailable) instead of 408
        // This indicates a temporary server issue rather than a request timeout
        // The browser will handle this more gracefully
        return new Response('Service temporarily unavailable', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 
            'Content-Type': 'text/plain',
            'Retry-After': '5' // Suggest retry after 5 seconds
          },
        });
      }
    })()
  );
});

/**
 * Message event - handle commands from the app
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        console.log('[SW] Cache cleared');
        return self.clients.matchAll();
      }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'CACHE_CLEARED' });
        });
      })
    );
  }
});

console.log('[SW] Service worker script loaded');

