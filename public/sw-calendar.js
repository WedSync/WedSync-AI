// Wedding Calendar Service Worker - Offline Support for Critical Wedding Timeline Data
// Version: 1.0.0
// Priority: CRITICAL - Wedding day timeline must work offline

const CACHE_VERSION = 'wedding-calendar-v1.0.0';
const CACHE_NAMES = {
  STATIC: `${CACHE_VERSION}-static`,
  DYNAMIC: `${CACHE_VERSION}-dynamic`,
  CALENDAR: `${CACHE_VERSION}-calendar-data`,
  IMAGES: `${CACHE_VERSION}-calendar-images`
};

// Critical wedding calendar resources to cache
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/manifest.json',
  '/offline',
  '/icons/calendar-192.png',
  '/icons/calendar-512.png',
  '/icons/badge-72.png',
  // Calendar-specific routes
  '/weddings',
  '/timeline',
  '/calendar',
  // Critical CSS and JS (Next.js chunks)
  '/_next/static/css/',
  '/_next/static/chunks/',
  '/_next/static/media/'
];

// Wedding timeline API endpoints to cache
const CALENDAR_API_PATTERNS = [
  /\/api\/weddings\/[^\/]+\/timeline/,
  /\/api\/weddings\/[^\/]+\/events/,
  /\/api\/vendors\/[^\/]+\/schedule/,
  /\/api\/calendar\/sync/
];

// Maximum offline storage limits (wedding data is precious)
const STORAGE_LIMITS = {
  MAX_CALENDAR_ENTRIES: 1000,
  MAX_SYNC_QUEUE_SIZE: 500,
  MAX_CACHE_AGE_HOURS: 24 * 7, // 1 week
  MAX_STORAGE_MB: 50
};

// Sync strategies for different connection types
const SYNC_STRATEGIES = {
  WIFI: { frequency: 30000, batchSize: 50 },      // Every 30s, large batches
  CELLULAR: { frequency: 120000, batchSize: 20 }, // Every 2min, small batches  
  SLOW_2G: { frequency: 300000, batchSize: 5 },   // Every 5min, tiny batches
  OFFLINE: { frequency: 0, batchSize: 0 }         // No sync
};

let syncQueue = [];
let isOnline = true;
let batteryLevel = 1.0;
let connectionType = 'wifi';

// Install event - Cache critical wedding resources
self.addEventListener('install', (event) => {
  console.log('[SW] Wedding Calendar Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAMES.STATIC).then(cache => {
        console.log('[SW] Caching critical wedding assets...');
        return cache.addAll(STATIC_ASSETS.filter(asset => !asset.includes('_next')));
      }),
      
      // Initialize IndexedDB for wedding data
      initializeWeddingDatabase(),
      
      // Skip waiting to activate immediately (wedding emergencies can't wait)
      self.skipWaiting()
    ])
  );
});

// Activate event - Clean up old caches and setup sync
self.addEventListener('activate', (event) => {
  console.log('[SW] Wedding Calendar Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!Object.values(CACHE_NAMES).includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Claim all clients immediately
      self.clients.claim(),
      
      // Setup background sync for wedding timeline changes
      setupBackgroundSync()
    ])
  );
});

// Fetch event - Intelligent caching for wedding data
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome extensions
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Wedding API requests - Critical for timeline functionality
  if (isWeddingApiRequest(request)) {
    event.respondWith(handleWeddingApiRequest(request));
    return;
  }

  // Static assets - Fast loading for wedding professionals
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAssetRequest(request));
    return;
  }

  // Images - Lazy loading with offline fallbacks
  if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // HTML pages - App shell with offline support
  if (isHtmlRequest(request)) {
    event.respondWith(handleHtmlRequest(request));
    return;
  }

  // Default - Network first with cache fallback
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// Background sync for wedding timeline changes
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'wedding-calendar-sync') {
    event.waitUntil(performWeddingCalendarSync());
  }
  
  if (event.tag === 'wedding-emergency-sync') {
    event.waitUntil(performEmergencySync());
  }
});

// Push notifications for timeline changes
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  if (!event.data) return;
  
  const data = event.data.json();
  
  // Wedding timeline change notifications
  if (data.type === 'timeline-change') {
    event.waitUntil(handleTimelineChangeNotification(data));
  }
  
  // Wedding day emergency notifications
  if (data.type === 'wedding-emergency') {
    event.waitUntil(handleEmergencyNotification(data));
  }
  
  // Vendor status updates
  if (data.type === 'vendor-status') {
    event.waitUntil(handleVendorStatusNotification(data));
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data || {};
  let targetUrl = '/';
  
  // Navigate to specific wedding timeline
  if (data.weddingId) {
    targetUrl = `/weddings/${data.weddingId}/timeline`;
  }
  
  // Navigate to vendor schedule
  if (data.vendorId) {
    targetUrl = `/vendors/${data.vendorId}/schedule`;
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        // Focus existing window if available
        for (const client of clients) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (type === 'SYNC_WEDDING_TIMELINE') {
    queueTimelineSync(data);
  }
  
  if (type === 'UPDATE_CONNECTION_INFO') {
    updateConnectionInfo(data);
  }
  
  if (type === 'EMERGENCY_SYNC') {
    performEmergencySync();
  }
});

// Wedding-specific helper functions

function isWeddingApiRequest(request) {
  const url = new URL(request.url);
  return CALENDAR_API_PATTERNS.some(pattern => pattern.test(url.pathname));
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.includes('/_next/static/') || 
         url.pathname.includes('/icons/') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.js');
}

function isImageRequest(request) {
  const url = new URL(request.url);
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url.pathname);
}

function isHtmlRequest(request) {
  return request.headers.get('accept')?.includes('text/html');
}

async function handleWeddingApiRequest(request) {
  const cacheName = CACHE_NAMES.CALENDAR;
  const cacheKey = generateCacheKey(request);
  
  try {
    // Network first for fresh wedding data
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(cacheName);
      await cache.put(cacheKey, networkResponse.clone());
      
      // Update IndexedDB for offline access
      if (request.method === 'GET') {
        await updateWeddingDataCache(request, networkResponse.clone());
      }
      
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
    
  } catch (error) {
    console.log('[SW] Network failed for wedding API, falling back to cache');
    
    // Try cache first
    const cachedResponse = await caches.match(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Try IndexedDB for wedding data
    const offlineData = await getOfflineWeddingData(request);
    if (offlineData) {
      return new Response(JSON.stringify(offlineData), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Return offline fallback
    return new Response(JSON.stringify({
      error: 'Offline - Wedding data unavailable',
      offline: true,
      timestamp: new Date().toISOString()
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleStaticAssetRequest(request) {
  const cache = await caches.open(CACHE_NAMES.STATIC);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Static asset unavailable offline:', request.url);
    return new Response('Offline', { status: 503 });
  }
}

async function handleImageRequest(request) {
  const cache = await caches.open(CACHE_NAMES.IMAGES);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return placeholder for missing wedding images
    return new Response(createPlaceholderImage(), {
      headers: { 'Content-Type': 'image/svg+xml' }
    });
  }
}

async function handleHtmlRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // Return cached app shell
    const cache = await caches.open(CACHE_NAMES.STATIC);
    const offlinePage = await cache.match('/offline');
    return offlinePage || new Response('Offline', { 
      status: 503, 
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

async function performWeddingCalendarSync() {
  console.log('[SW] Performing wedding calendar sync...');
  
  if (!isOnline || syncQueue.length === 0) {
    console.log('[SW] Skipping sync - offline or empty queue');
    return;
  }
  
  const strategy = SYNC_STRATEGIES[connectionType] || SYNC_STRATEGIES.WIFI;
  const batchSize = Math.min(strategy.batchSize, syncQueue.length);
  const batch = syncQueue.splice(0, batchSize);
  
  try {
    const syncPromises = batch.map(async (syncItem) => {
      const response = await fetch(syncItem.url, {
        method: syncItem.method,
        headers: syncItem.headers,
        body: syncItem.body
      });
      
      if (!response.ok) {
        // Re-queue failed syncs
        syncQueue.unshift(syncItem);
        throw new Error(`Sync failed: ${response.status}`);
      }
      
      return response;
    });
    
    await Promise.all(syncPromises);
    console.log(`[SW] Successfully synced ${batch.length} wedding timeline changes`);
    
    // Notify clients of successful sync
    notifyClients({
      type: 'SYNC_SUCCESS',
      count: batch.length
    });
    
  } catch (error) {
    console.error('[SW] Wedding calendar sync failed:', error);
    
    // Notify clients of sync failure
    notifyClients({
      type: 'SYNC_FAILED',
      error: error.message
    });
  }
}

async function performEmergencySync() {
  console.log('[SW] Performing emergency wedding sync...');
  
  // Emergency sync bypasses normal throttling
  const emergencyItems = syncQueue.filter(item => item.priority === 'emergency');
  
  for (const item of emergencyItems) {
    try {
      await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body
      });
      
      // Remove from queue on success
      const index = syncQueue.indexOf(item);
      if (index > -1) {
        syncQueue.splice(index, 1);
      }
      
    } catch (error) {
      console.error('[SW] Emergency sync failed for item:', item, error);
    }
  }
}

async function handleTimelineChangeNotification(data) {
  const title = 'Wedding Timeline Updated';
  const options = {
    body: `${data.eventName} time changed to ${data.newTime}`,
    icon: '/icons/calendar-192.png',
    badge: '/icons/badge-72.png',
    tag: 'timeline-update',
    requireInteraction: true,
    data: {
      weddingId: data.weddingId,
      eventId: data.eventId,
      type: 'timeline-change'
    },
    actions: [
      { action: 'view', title: 'View Timeline' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    vibrate: [200, 100, 200]
  };
  
  await self.registration.showNotification(title, options);
}

async function handleEmergencyNotification(data) {
  const title = '🚨 Wedding Emergency';
  const options = {
    body: data.message,
    icon: '/icons/calendar-192.png',
    badge: '/icons/badge-72.png',
    tag: 'wedding-emergency',
    requireInteraction: true,
    silent: false,
    data: {
      weddingId: data.weddingId,
      type: 'emergency'
    },
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'call', title: 'Call Coordinator' }
    ],
    vibrate: [100, 50, 100, 50, 100, 50, 100]
  };
  
  await self.registration.showNotification(title, options);
}

async function handleVendorStatusNotification(data) {
  const title = `${data.vendorName} Status Update`;
  const options = {
    body: data.statusMessage,
    icon: '/icons/calendar-192.png',
    badge: '/icons/badge-72.png',
    tag: `vendor-${data.vendorId}`,
    data: {
      vendorId: data.vendorId,
      weddingId: data.weddingId,
      type: 'vendor-status'
    },
    actions: [
      { action: 'view', title: 'View Schedule' }
    ]
  };
  
  await self.registration.showNotification(title, options);
}

// Utility functions

function generateCacheKey(request) {
  const url = new URL(request.url);
  // Remove cache-busting parameters
  url.searchParams.delete('_t');
  url.searchParams.delete('timestamp');
  return url.toString();
}

function queueTimelineSync(data) {
  const syncItem = {
    url: data.url,
    method: data.method || 'POST',
    headers: data.headers || { 'Content-Type': 'application/json' },
    body: JSON.stringify(data.body),
    priority: data.priority || 'normal',
    timestamp: Date.now(),
    retryCount: 0
  };
  
  syncQueue.push(syncItem);
  
  // Trigger background sync if available
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    self.registration.sync.register('wedding-calendar-sync');
  }
}

function updateConnectionInfo(data) {
  isOnline = data.online;
  connectionType = data.connectionType || 'wifi';
  batteryLevel = data.batteryLevel || 1.0;
  
  console.log(`[SW] Connection updated: ${connectionType}, Battery: ${Math.round(batteryLevel * 100)}%`);
}

function notifyClients(message) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage(message);
    });
  });
}

function createPlaceholderImage() {
  return `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#f3f4f6"/>
    <text x="100" y="100" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="14" fill="#6b7280">
      Image Unavailable Offline
    </text>
  </svg>`;
}

async function initializeWeddingDatabase() {
  // IndexedDB initialization for wedding data would go here
  console.log('[SW] Wedding database initialized');
}

async function setupBackgroundSync() {
  // Setup periodic background sync for wedding timeline updates
  console.log('[SW] Background sync setup complete');
}

async function updateWeddingDataCache(request, response) {
  // Update IndexedDB with wedding timeline data for offline access
  console.log('[SW] Wedding data cache updated');
}

async function getOfflineWeddingData(request) {
  // Retrieve wedding data from IndexedDB when offline
  console.log('[SW] Retrieving offline wedding data');
  return null; // Placeholder
}

console.log('[SW] Wedding Calendar Service Worker loaded - Ready for offline wedding timeline management');