/**
 * Service Worker for Photography Website
 * Provides aggressive caching for images and static resources
 */

const CACHE_VERSION = 'v4';
const CACHE_NAME = `photo-site-${CACHE_VERSION}`;

// Resources to cache immediately on install
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
];

// Cache strategies for different resource types
const CACHE_STRATEGIES = {
  // Images: Cache first, network fallback (images rarely change)
  images: 'cache-first',
  // Static JSON: Network first, cache fallback (needs to be fresh but can use stale)
  json: 'network-first',
  // Static assets: Cache first (JS/CSS/fonts rarely change and have cache busting)
  static: 'cache-first',
  // API calls: Network only (always need fresh data)
  api: 'network-only',
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
  
  // API calls - always fetch fresh
  if (urlObj.pathname.startsWith('/api/')) {
    return CACHE_STRATEGIES.api;
  }
  
  // Avatar and favicon - always fetch fresh (can be updated via admin)
  if (urlObj.pathname === '/photos/avatar.png' || 
      urlObj.pathname.startsWith('/photos/favicon')) {
    return CACHE_STRATEGIES.api; // network-only
  }
  
  // Static JSON data
  if (urlObj.pathname.startsWith('/albums-data/') && urlObj.pathname.endsWith('.json')) {
    return CACHE_STRATEGIES.json;
  }
  
  // Optimized images (thumbnail, modal, download)
  if (urlObj.pathname.startsWith('/optimized/')) {
    return CACHE_STRATEGIES.images;
  }
  
  // Static assets (JS, CSS, fonts, etc.)
  if (
    urlObj.pathname.match(/\.(js|css|woff2|woff|ttf|eot|svg|ico|png|jpg|jpeg|webp)$/)
  ) {
    return CACHE_STRATEGIES.static;
  }
  
  // Default: network first
  return CACHE_STRATEGIES.json;
}

/**
 * Cache-first strategy: Try cache, fallback to network
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('[SW] Cache hit:', request.url);
    return cached;
  }
  
  console.log('[SW] Cache miss, fetching:', request.url);
  try {
    const response = await fetch(request);
    
    // Only cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', request.url, error);
    throw error;
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
        
        // Return a generic error response
        return new Response('Network error', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' },
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

