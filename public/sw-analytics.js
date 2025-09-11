/**
 * Analytics Service Worker - PWA offline functionality for vendor analytics
 * 
 * Features:
 * - Offline analytics data caching
 * - Background sync for analytics updates
 * - Push notifications for performance alerts
 * - Smart caching strategies for different data types
 * - Network-first with fallback for real-time data
 * - Cache-first for static assets
 * - Background fetch for large analytics datasets
 */

const CACHE_NAME = 'wedsync-analytics-v1';
const DATA_CACHE_NAME = 'wedsync-analytics-data-v1';
const API_CACHE_NAME = 'wedsync-analytics-api-v1';

// Cache strategies
const NETWORK_FIRST_PATHS = [
  '/api/analytics/vendors',
  '/api/analytics/metrics',
  '/api/analytics/realtime'
];

const CACHE_FIRST_PATHS = [
  '/analytics',
  '/mobile/analytics',
  '/_next/static',
  '/images/analytics'
];

const STALE_WHILE_REVALIDATE_PATHS = [
  '/api/analytics/historical',
  '/api/analytics/trends'
];

// Assets to cache immediately
const PRECACHE_ASSETS = [
  '/analytics',
  '/mobile/analytics',
  '/offline-analytics.html',
  '/_next/static/css/',
  '/_next/static/js/'
];

// IndexedDB for offline analytics storage
let analyticsDB;

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Analytics Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Pre-caching analytics assets');
        return cache.addAll(PRECACHE_ASSETS);
      }),
      
      // Initialize IndexedDB for analytics data
      initializeAnalyticsDB(),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Analytics Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('wedsync-analytics-') && 
                cacheName !== CACHE_NAME && 
                cacheName !== DATA_CACHE_NAME &&
                cacheName !== API_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Claim all clients
      self.clients.claim()
    ])
  );
});

/**
 * Fetch Event Handler - Network strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests for caching
  if (request.method !== 'GET') {
    // Handle POST/PUT analytics data for offline sync
    if (url.pathname.startsWith('/api/analytics/')) {
      event.respondWith(handleAnalyticsDataRequest(request));
    }
    return;
  }
  
  // Determine caching strategy based on path
  if (NETWORK_FIRST_PATHS.some(path => url.pathname.startsWith(path))) {
    event.respondWith(networkFirstWithOfflineFallback(request));
  } else if (CACHE_FIRST_PATHS.some(path => url.pathname.startsWith(path))) {
    event.respondWith(cacheFirstWithNetworkFallback(request));
  } else if (STALE_WHILE_REVALIDATE_PATHS.some(path => url.pathname.startsWith(path))) {
    event.respondWith(staleWhileRevalidate(request));
  } else if (url.pathname.startsWith('/api/analytics/')) {
    event.respondWith(networkFirstWithOfflineFallback(request));
  } else {
    event.respondWith(cacheFirstWithNetworkFallback(request));
  }
});

/**
 * Background Sync for analytics data
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'analytics-sync') {
    event.waitUntil(syncAnalyticsData());
  } else if (event.tag === 'analytics-metrics-sync') {
    event.waitUntil(syncVendorMetrics());
  }
});

/**
 * Push notification handler
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);
  
  const options = {
    body: 'Your vendor analytics have been updated',
    icon: '/icons/analytics-icon-192.png',
    badge: '/icons/analytics-badge-72.png',
    tag: 'analytics-update',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Analytics'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    data: {
      timestamp: Date.now(),
      url: '/analytics'
    }
  };
  
  if (event.data) {
    const payload = event.data.json();
    options.body = payload.body || options.body;
    options.data = { ...options.data, ...payload.data };
  }
  
  event.waitUntil(
    self.registration.showNotification('WedSync Analytics', options)
  );
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        // Try to focus existing window
        for (const client of clientList) {
          if (client.url.includes('/analytics') && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if none found
        if (self.clients.openWindow) {
          return self.clients.openWindow('/analytics');
        }
      })
    );
  }
});

/**
 * Message handler for client communication
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SYNC_ANALYTICS') {
    event.waitUntil(syncAnalyticsData());
  } else if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAnalyticsCache());
  } else if (event.data.type === 'GET_CACHE_SIZE') {
    event.waitUntil(getCacheSize().then(size => {
      event.ports[0].postMessage({ size });
    }));
  }
});

/**
 * Network-first with offline fallback strategy
 */
async function networkFirstWithOfflineFallback(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // If network fails, try cache
    return await getCachedResponseOrOfflineFallback(request);
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error);
    return await getCachedResponseOrOfflineFallback(request);
  }
}

/**
 * Cache-first with network fallback strategy
 */
async function cacheFirstWithNetworkFallback(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Both cache and network failed:', error);
    return await getOfflineResponse(request);
  }
}

/**
 * Stale-while-revalidate strategy
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DATA_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Fetch from network to update cache
  const networkResponsePromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Network failed, but we might have cache
    return null;
  });
  
  // Return cached version immediately if available
  return cachedResponse || await networkResponsePromise || await getOfflineResponse(request);
}

/**
 * Handle analytics data requests (POST/PUT) for offline sync
 */
async function handleAnalyticsDataRequest(request) {
  try {
    // Try to send the request
    const response = await fetch(request.clone());
    
    if (response.ok) {
      return response;
    }
    
    // If failed, store for later sync
    await storeForOfflineSync(request);
    return new Response(
      JSON.stringify({ success: true, queued: true }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // Store for offline sync
    await storeForOfflineSync(request);
    return new Response(
      JSON.stringify({ success: true, queued: true }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Get cached response or offline fallback
 */
async function getCachedResponseOrOfflineFallback(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  return await getOfflineResponse(request);
}

/**
 * Generate offline response
 */
async function getOfflineResponse(request) {
  const url = new URL(request.url);
  
  // For API requests, return cached data or empty response
  if (url.pathname.startsWith('/api/analytics/')) {
    const offlineData = await getOfflineAnalyticsData(url.pathname);
    
    if (offlineData) {
      return new Response(JSON.stringify(offlineData), {
        headers: { 
          'Content-Type': 'application/json',
          'X-Offline-Response': 'true'
        }
      });
    }
    
    return new Response(
      JSON.stringify({ error: 'Offline - data not available' }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  // For page requests, return offline page
  if (request.mode === 'navigate') {
    const offlinePage = await caches.match('/offline-analytics.html');
    return offlinePage || new Response('Offline - Please check your connection', {
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  return new Response('Offline', { status: 503 });
}

/**
 * Initialize IndexedDB for analytics data
 */
async function initializeAnalyticsDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AnalyticsServiceWorker', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      analyticsDB = request.result;
      resolve();
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('offlineQueue')) {
        const queueStore = db.createObjectStore('offlineQueue', { keyPath: 'id', autoIncrement: true });
        queueStore.createIndex('timestamp', 'timestamp');
      }
      
      if (!db.objectStoreNames.contains('cachedAnalytics')) {
        const analyticsStore = db.createObjectStore('cachedAnalytics', { keyPath: 'path' });
        analyticsStore.createIndex('timestamp', 'timestamp');
      }
    };
  });
}

/**
 * Store request for offline sync
 */
async function storeForOfflineSync(request) {
  if (!analyticsDB) await initializeAnalyticsDB();
  
  const requestData = {
    url: request.url,
    method: request.method,
    headers: [...request.headers.entries()],
    body: await request.text(),
    timestamp: Date.now()
  };
  
  const transaction = analyticsDB.transaction(['offlineQueue'], 'readwrite');
  const store = transaction.objectStore('offlineQueue');
  
  return new Promise((resolve, reject) => {
    const request = store.add(requestData);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get offline analytics data
 */
async function getOfflineAnalyticsData(path) {
  if (!analyticsDB) return null;
  
  const transaction = analyticsDB.transaction(['cachedAnalytics'], 'readonly');
  const store = transaction.objectStore('cachedAnalytics');
  
  return new Promise((resolve) => {
    const request = store.get(path);
    request.onsuccess = () => {
      const result = request.result;
      if (result && Date.now() - result.timestamp < 24 * 60 * 60 * 1000) { // 24 hours
        resolve(result.data);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => resolve(null);
  });
}

/**
 * Sync analytics data when online
 */
async function syncAnalyticsData() {
  if (!analyticsDB) return;
  
  const transaction = analyticsDB.transaction(['offlineQueue'], 'readwrite');
  const store = transaction.objectStore('offlineQueue');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    
    request.onsuccess = async () => {
      const queuedRequests = request.result;
      console.log(`[SW] Syncing ${queuedRequests.length} queued requests`);
      
      for (const requestData of queuedRequests) {
        try {
          const response = await fetch(requestData.url, {
            method: requestData.method,
            headers: requestData.headers,
            body: requestData.body
          });
          
          if (response.ok) {
            // Remove from queue on success
            const deleteTransaction = analyticsDB.transaction(['offlineQueue'], 'readwrite');
            const deleteStore = deleteTransaction.objectStore('offlineQueue');
            deleteStore.delete(requestData.id);
          }
        } catch (error) {
          console.log('[SW] Failed to sync request:', error);
          // Keep in queue for retry
        }
      }
      
      resolve();
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Sync vendor metrics specifically
 */
async function syncVendorMetrics() {
  try {
    const response = await fetch('/api/analytics/vendors/metrics');
    if (response.ok) {
      const metrics = await response.json();
      
      // Cache the metrics data
      const cache = await caches.open(DATA_CACHE_NAME);
      cache.put('/api/analytics/vendors/metrics', new Response(JSON.stringify(metrics), {
        headers: { 'Content-Type': 'application/json' }
      }));
      
      // Notify clients of update
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'METRICS_UPDATED',
          data: metrics
        });
      });
    }
  } catch (error) {
    console.log('[SW] Failed to sync vendor metrics:', error);
  }
}

/**
 * Clear analytics cache
 */
async function clearAnalyticsCache() {
  const cacheNames = [CACHE_NAME, DATA_CACHE_NAME, API_CACHE_NAME];
  
  for (const cacheName of cacheNames) {
    await caches.delete(cacheName);
  }
  
  console.log('[SW] Analytics cache cleared');
}

/**
 * Get total cache size
 */
async function getCacheSize() {
  let totalSize = 0;
  const cacheNames = await caches.keys();
  
  for (const cacheName of cacheNames) {
    if (cacheName.startsWith('wedsync-analytics-')) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const clone = response.clone();
          const buffer = await clone.arrayBuffer();
          totalSize += buffer.byteLength;
        }
      }
    }
  }
  
  return totalSize;
}