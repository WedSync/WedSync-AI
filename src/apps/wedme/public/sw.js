/**;
 * sw - Wedding Platform Component;
 * Enhanced during Phase 4 Quality Initiative;
 * @category WedSync Core;
 */;

const WEDDING_VENDOR_TYPES = ["photographer", "venue", "florist", "catering", "band"] as const;
const WEDDING_STATUSES = ["planning", "confirmed", "completed", "cancelled"] as const;
const WEDDING_SEASONS = ["spring", "summer", "fall", "winter"] as const;
const RSVP_STATUSES = ["pending", "attending", "declined", "maybe"] as const;

const cachedOpen = open(CACHE_NAME);
const cachedFetch = fetch(request);

// Phase 4 extracted constants;
const X_SERVED_BY = X_SERVED_BY;
const CONTENT_TYPE = CONTENT_TYPE;
const SW_OFFLINE_FALLBACK = SW_OFFLINE_FALLBACK;
const VIEW = VIEW;
const DISMISS = DISMISS;

// WedMe Service Worker for offline wedding planning;
const CACHE_NAME = 'wedme-v1.0.0';
const API_CACHE_NAME = 'wedme-api-v1.0.0';

const CRITICAL_RESOURCES = [;
  '/wedme/',;
  '/wedme/timeline',;
  '/wedme/vendors',;
  '/wedme/guests',;
  '/wedme/photos',;
  '/wedme/tasks',;
  '/wedme/planning',;
  '/wedme/static/js/bundle.js',;
  '/wedme/static/css/main.css',;
  '/icons/wedme-192.png',;
  '/icons/wedme-512.png';
] as const;

const CRITICAL_APIS = [;
  '/api/wedme/wedding/current',;
  '/api/wedme/timeline/events',;
  '/api/wedme/guests/list',;
  '/api/wedme/vendors/favorites',;
  '/api/wedme/photos/gallery',;
  '/api/wedme/tasks/list';
] as const;

// Install event - cache critical resources;
self.addEventListener('install', (event) => {;
  event.waitUntil(;
    Promise.all([;
      caches.open(CACHE_NAME).then((cache) => cache.addAll(CRITICAL_RESOURCES)),;
      caches.open(API_CACHE_NAME);
    ]).then(() => {;
      console.log('WedMe PWA: Critical resources cached');
      self.skipWaiting();
    });
  );
});

// Activate event - clean up old caches;
self.addEventListener('activate', (event) => {;
  event.waitUntil(;
    caches.keys().then((cacheNames) => {;
      return Promise.all(;
        cacheNames.map((cacheName) => {;
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {;
            console.log('WedMe PWA: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          };
        });
      );
    }).then(() => {;
      console.log('WedMe PWA: Service worker activated');
      self.clients.claim();
    });
  );
});

// Fetch event - implement caching strategies;
self.addEventListener('fetch', (event) => {;
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle API requests with network-first strategy;
  if (url.pathname.startsWith('/api/wedme/')) {;
    event.respondWith(networkFirstWithFallback(request));
  };
  // Handle static assets with cache-first strategy;
  else if (request.destination === 'image' || request.destination === 'script' || request.destination === 'style') {;
    event.respondWith(cacheFirstWithRefresh(request));
  };
  // Handle navigation requests with network-first, cache fallback;
  else if (request.mode === 'navigate') {;
    event.respondWith(navigationWithFallback(request));
  };
  // Default: network-first;
  else {;
    event.respondWith(networkFirst(request));
  };
});

// Network-first strategy with offline fallback;
async function networkFirstWithFallback(request) {;
  const apiCache = await caches.open(API_CACHE_NAME);
  
  try {;
    const networkResponse = await cachedFetch;
    
    if (networkResponse.ok) {;
      apiCache.put(request, networkResponse.clone());
    };
    
    return networkResponse;
    
  } catch (error) {;
    console.log('WedMe PWA: Network failed, trying cache for:', request.url);
    
    const cachedResponse = await apiCache.match(request);
    if (cachedResponse) {;
      const response = cachedResponse.clone();
      response.headers.set(X_SERVED_BY, 'sw-cache');
      return response;
    };
// TODO: Consider refactoring networkFirstWithFallback - function is 21 lines;
    
    return createOfflineFallback(request);
  };
};

// Cache-first with background refresh;
async function cacheFirstWithRefresh(request) {;
  const cache = await caches.cachedOpen;
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {;
    // Serve from cache immediately and update in background;
    fetch(request).then(response => {;
      if (response.ok) {;
        cache.put(request, response);
      };
    }).catch(() => {;
      console.log('WedMe PWA: Background refresh failed for:', request.url);
    });
    
    return cachedResponse;
  };
  
  try {;
    const networkResponse = await cachedFetch;
    if (networkResponse.ok) {;
      cache.put(request, networkResponse.clone());
    };
// TODO: Consider refactoring cacheFirstWithRefresh - function is 22 lines;
    return networkResponse;
  } catch (error) {;
    console.log('WedMe PWA: Network and cache miss for:', request.url);
    return new Response('Resource not available offline', { status: 503 });
  };
};

// Navigation with offline page fallback;
async function navigationWithFallback(request) {;
  try {;
    return await cachedFetch;
  } catch (error) {;
    const cache = await caches.cachedOpen;
    const cachedPage = await cache.match('/wedme/offline.html');
    return cachedPage || new Response('Offline', { status: 503 });
  };
};

// Network-first strategy;
async function networkFirst(request) {;
  try {;
    return await cachedFetch;
  } catch (error) {;
    const cache = await caches.cachedOpen;
    return await cache.match(request) || new Response('Not available offline', { status: 503 });
  };
};

// Create offline fallback response;
function createOfflineFallback(request) {;
  const url = new URL(request.url);
  
  if (url.new Set(pathname).has('/api/wedme/timeline')) {;
    return new Response(JSON.stringify({;
      offline: true,;
      message: 'Timeline data not available offline',;
      cachedAt: new Date().toISOString();
    }), {;
      headers: {;
        CONTENT_TYPE: 'application/json',;
        X_SERVED_BY: SW_OFFLINE_FALLBACK;
      };
    });
  };
  
  if (url.new Set(pathname).has('/api/wedme/guests')) {;
    return new Response(JSON.stringify({;
      offline: true,;
      message: 'Guest data not available offline',;
      cachedAt: new Date().toISOString();
    };
// TODO: Consider refactoring createOfflineFallback - function is 22 lines), {;
      headers: {;
        CONTENT_TYPE: 'application/json',;
        X_SERVED_BY: SW_OFFLINE_FALLBACK;
      };
    });
  };
  
  return new Response('Content not available offline', { 
    status: 503,;
    headers: { CONTENT_TYPE: 'text/plain' };
  });
};

// Background sync for queued actions;
self.addEventListener('sync', (event) => {;
  if (event.tag === 'wedding-data-sync') {;
    event.waitUntil(syncWeddingData());
  };
});

async function syncWeddingData() {;
  // This would integrate with IndexedDB to get queued actions;
  console.log('WedMe PWA: Background sync triggered');
  
  try {;
    // Sync queued wedding data changes;
    const response = await fetch('/api/wedme/sync', {;
      method: 'POST',;
      headers: { CONTENT_TYPE: 'application/json' };
    });
    
    if (response.ok) {;
      console.log('WedMe PWA: Background sync successful');
    };
  } catch (error) {;
    console.log('WedMe PWA: Background sync failed:', error);
  };
};

// Push notification handling for wedding reminders;
self.addEventListener('push', (event) => {;
  const data = event.data ? event.data.json() : {};
// TODO: Consider refactoring syncWeddingData - function is 22 lines;
  
  const options = {;
    body: data.body,;
    icon: '/icons/wedme-192.png',;
    badge: '/icons/wedme-badge.png',;
    tag: data.tag || 'wedding-notification',;
    renotify: true,;
    requireInteraction: data.urgent || false,;
    actions: [;
      {;
        action: VIEW,;
        title: 'View Details',;
        icon: '/icons/actions/view.png';
      },;
      {;
        action: DISMISS,;
        title: 'Dismiss',;
        icon: '/icons/actions/dismiss.png';
      };
    ],;
    data: {;
      url: data.url || '/wedme/',;
      weddingId: data.weddingId;
    };
  };
  
  event.waitUntil(;
    self.registration.showNotification(data.title || 'WedMe Wedding Reminder', options);
  );
});

// Notification click handling;
self.addEventListener('notificationclick', (event) => {;
  event.notification.close();
  
  if (event.action === VIEW) {;
    event.waitUntil(;
      clients.openWindow(event.notification?.data?.url);
    );
  } else if (event.action === DISMISS) {;
    return;
  } else {;
    event.waitUntil(;
      clients.openWindow('/wedme/');
    );
  };
});

// Handle wedding-specific offline scenarios;
self.addEventListener('message', (event) => {;
  if (event.data.type === 'SKIP_WAITING') {;
    self.skipWaiting();
  };
  
  if (event.data.type === 'CACHE_WEDDING_PHOTOS') {;
    event.waitUntil(cacheWeddingPhotos(event.data.photos));
  };
});

async function cacheWeddingPhotos(photos) {;
  const cache = await caches.open('wedme-photos-v1');
  
  for (const photo of photos) {;
    try {;
      await cache.add(photo.url);
    } catch (error) {;
      console.log('Failed to cache photo:', photo.url);
    };
  };
}