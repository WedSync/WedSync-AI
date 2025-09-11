/**
 * Service Worker for Google Places Integration PWA
 * 
 * Provides offline functionality, background sync, and caching
 * for venue discovery during wedding planning site visits.
 */

const CACHE_NAME = 'wedsync-places-v1';
const STATIC_CACHE = 'wedsync-static-v1';
const DYNAMIC_CACHE = 'wedsync-dynamic-v1';
const PLACES_API_CACHE = 'wedsync-places-api-v1';

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/wedsync-192.png',
  '/icons/wedsync-512.png',
  '/offline.html',
  '/_next/static/css/app/layout.css',
  '/_next/static/chunks/webpack.js',
  '/_next/static/chunks/main.js'
];

// API endpoints that can be cached
const CACHEABLE_APIS = [
  '/api/google-places/search',
  '/api/google-places/details',
  '/api/venues/sync',
  '/api/venue-comparisons'
];

// Maximum cache sizes
const MAX_DYNAMIC_CACHE_SIZE = 100;
const MAX_API_CACHE_SIZE = 50;
const MAX_IMAGE_CACHE_SIZE = 200;

// Background sync tag
const SYNC_TAG = 'venue-data-sync';

/**
 * Install event - Cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('Places SW: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Places SW: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Initialize places cache
      caches.open(PLACES_API_CACHE),
      
      // Initialize dynamic cache
      caches.open(DYNAMIC_CACHE)
    ]).then(() => {
      console.log('Places SW: Installation complete');
      return self.skipWaiting();
    }).catch((error) => {
      console.error('Places SW: Installation failed', error);
    })
  );
});

/**
 * Activate event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('Places SW: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== PLACES_API_CACHE) {
              console.log('Places SW: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Claim clients
      self.clients.claim()
    ]).then(() => {
      console.log('Places SW: Activation complete');
    }).catch((error) => {
      console.error('Places SW: Activation failed', error);
    })
  );
});

/**
 * Fetch event - Handle requests with caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isPlacesAPI(request)) {
    event.respondWith(handlePlacesAPI(request));
  } else if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

/**
 * Background sync event - Sync venue data when online
 */
self.addEventListener('sync', (event) => {
  console.log('Places SW: Background sync triggered', event.tag);
  
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncVenueData());
  }
});

/**
 * Push event - Handle push notifications
 */
self.addEventListener('push', (event) => {
  console.log('Places SW: Push received');
  
  if (event.data) {
    const data = event.data.json();
    
    if (data.type === 'venue-update') {
      event.waitUntil(handleVenueUpdateNotification(data));
    }
  }
});

/**
 * Message event - Handle messages from main thread
 */
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_CACHE_STATS':
      event.ports[0].postMessage(getCacheStats());
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(clearSpecificCache(data.cacheName));
      break;
      
    case 'SYNC_VENUE_DATA':
      event.waitUntil(syncVenueData());
      break;
      
    case 'PRELOAD_VENUES':
      event.waitUntil(preloadVenues(data.venues));
      break;
  }
});

/**
 * Check if request is for static assets
 */
function isStaticAsset(request) {
  return STATIC_ASSETS.some(asset => request.url.endsWith(asset)) ||
         request.url.includes('/_next/static/') ||
         request.url.includes('/icons/');
}

/**
 * Check if request is for Places API
 */
function isPlacesAPI(request) {
  return CACHEABLE_APIS.some(api => request.url.includes(api));
}

/**
 * Check if request is for images
 */
function isImageRequest(request) {
  return request.destination === 'image' ||
         request.url.includes('googleusercontent.com') ||
         request.url.includes('places/photo') ||
         /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(request.url);
}

/**
 * Check if request is navigation
 */
function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

/**
 * Handle static assets - Cache first strategy
 */
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Places SW: Static asset fetch failed', error);
    
    // Return offline fallback if available
    const cache = await caches.open(STATIC_CACHE);
    return cache.match('/offline.html') || new Response('Offline', { status: 503 });
  }
}

/**
 * Handle Places API - Network first with cache fallback
 */
async function handlePlacesAPI(request) {
  try {
    // Try network first for fresh data
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), 5000)
      )
    ]);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(PLACES_API_CACHE);
      cache.put(request, networkResponse.clone());
      
      // Limit cache size
      await limitCacheSize(PLACES_API_CACHE, MAX_API_CACHE_SIZE);
      
      return networkResponse;
    }
  } catch (error) {
    console.log('Places SW: Network failed, trying cache', error.message);
  }
  
  // Fallback to cache
  const cache = await caches.open(PLACES_API_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Add offline indicator header
    const response = cachedResponse.clone();
    response.headers.set('X-Served-By', 'sw-cache');
    return response;
  }
  
  // Return error response if no cache available
  return new Response(
    JSON.stringify({
      error: 'Offline - No cached data available',
      offline: true
    }), 
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Handle image requests - Cache with fallback
 */
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Only cache images that aren't too large
      const contentLength = networkResponse.headers.get('content-length');
      if (!contentLength || parseInt(contentLength) < 500000) { // 500KB limit
        cache.put(request, networkResponse.clone());
        await limitCacheSize(DYNAMIC_CACHE, MAX_IMAGE_CACHE_SIZE);
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Places SW: Image fetch failed', error);
    
    // Return placeholder image
    return fetch('/icons/venue-placeholder.png').catch(() => 
      new Response('', { status: 404 })
    );
  }
}

/**
 * Handle navigation requests - Shell with cache fallback
 */
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful navigations
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('Places SW: Navigation failed, trying cache');
  }
  
  // Try cache first
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Return app shell or offline page
  return caches.match('/') || caches.match('/offline.html') ||
    new Response('Offline', { status: 503 });
}

/**
 * Handle dynamic requests - Network first with cache fallback
 */
async function handleDynamicRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      await limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_SIZE);
    }
    
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

/**
 * Limit cache size to prevent storage bloat
 */
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxSize) {
    // Remove oldest entries
    const keysToDelete = keys.slice(0, keys.length - maxSize);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
    
    // SECURITY: Sensitive logging removed;
  }
}

/**
 * Sync venue data with server when online
 */
async function syncVenueData() {
  console.log('Places SW: Starting venue data sync');
  
  try {
    // Get sync queue from IndexedDB (would need implementation)
    const syncQueue = await getSyncQueue();
    
    for (const item of syncQueue) {
      try {
        await syncSingleItem(item);
        await removeSyncQueueItem(item.id);
      } catch (error) {
        console.error('Places SW: Failed to sync item', item.id, error);
        
        // Increment retry count
        item.retryCount = (item.retryCount || 0) + 1;
        
        // Remove items with too many retries
        if (item.retryCount > 5) {
          await removeSyncQueueItem(item.id);
        } else {
          await updateSyncQueueItem(item);
        }
      }
    }
    
    console.log('Places SW: Venue data sync complete');
  } catch (error) {
    console.error('Places SW: Sync failed', error);
  }
}

/**
 * Sync single item with server
 */
async function syncSingleItem(item) {
  const endpoint = getSyncEndpoint(item.type);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Background-Sync': 'true'
    },
    body: JSON.stringify({
      id: item.id,
      type: item.type,
      data: item.data,
      timestamp: item.timestamp
    })
  });
  
  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Get sync endpoint for item type
 */
function getSyncEndpoint(type) {
  switch (type) {
    case 'venue_update':
      return '/api/venues/sync';
    case 'comparison_add':
      return '/api/venue-comparisons/sync';
    case 'itinerary_update':
      return '/api/itinerary/sync';
    default:
      return '/api/sync/general';
  }
}

/**
 * Handle venue update push notification
 */
async function handleVenueUpdateNotification(data) {
  const { title, body, venueId, image } = data;
  
  const options = {
    body,
    icon: '/icons/wedsync-192.png',
    badge: '/icons/wedsync-badge.png',
    image: image || '/icons/venue-placeholder.png',
    data: { venueId, url: `/venues/${venueId}` },
    actions: [
      {
        action: 'view',
        title: 'View Venue',
        icon: '/icons/view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss.png'
      }
    ],
    requireInteraction: true,
    tag: `venue-${venueId}`
  };
  
  await self.registration.showNotification(title, options);
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    stats[cacheName] = keys.length;
  }
  
  return {
    caches: stats,
    totalCaches: cacheNames.length,
    timestamp: Date.now()
  };
}

/**
 * Clear specific cache
 */
async function clearSpecificCache(cacheName) {
  if (await caches.has(cacheName)) {
    await caches.delete(cacheName);
    console.log(`Places SW: Cleared cache ${cacheName}`);
    return true;
  }
  return false;
}

/**
 * Preload venues for offline access
 */
async function preloadVenues(venues) {
  console.log(`Places SW: Preloading ${venues.length} venues`);
  
  const cache = await caches.open(PLACES_API_CACHE);
  const promises = [];
  
  for (const venue of venues) {
    // Preload venue details
    const detailsUrl = `/api/google-places/details/${venue.placeId}`;
    promises.push(
      fetch(detailsUrl).then(response => {
        if (response.ok) {
          cache.put(detailsUrl, response.clone());
        }
      }).catch(error => {
        console.log(`Places SW: Failed to preload venue ${venue.placeId}`, error);
      })
    );
    
    // Preload venue images (first one only)
    if (venue.photos && venue.photos.length > 0) {
      promises.push(
        fetch(venue.photos[0]).then(response => {
          if (response.ok) {
            const imageCache = caches.open(DYNAMIC_CACHE);
            imageCache.then(cache => cache.put(venue.photos[0], response.clone()));
          }
        }).catch(error => {
          console.log(`Places SW: Failed to preload image for ${venue.placeId}`, error);
        })
      );
    }
  }
  
  await Promise.allSettled(promises);
  console.log('Places SW: Venue preloading complete');
}

// Placeholder functions for IndexedDB operations
// These would need proper implementation with IndexedDB
async function getSyncQueue() {
  return []; // Return items from IndexedDB sync queue
}

async function removeSyncQueueItem(id) {
  // Remove item from IndexedDB
}

async function updateSyncQueueItem(item) {
  // Update item in IndexedDB
}

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
  const { action, data } = event.notification;
  
  event.notification.close();
  
  if (action === 'view' && data.url) {
    event.waitUntil(
      self.clients.openWindow(data.url)
    );
  }
});

console.log('Places SW: Service worker loaded');