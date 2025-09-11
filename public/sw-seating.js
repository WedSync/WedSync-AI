/**
 * Seating Service Worker - WS-154 PWA Implementation
 * 
 * Background sync, caching, and offline support for seating interface:
 * - Cache seating assets and data
 * - Background sync for offline changes
 * - Network-first with cache fallback strategy
 * - Automatic data synchronization
 * - Push notification support
 */

const CACHE_NAME = 'wedsync-seating-v1';
const API_CACHE_NAME = 'wedsync-seating-api-v1';

// URLs to cache for offline access
const STATIC_ASSETS = [
  '/wedme/seating',
  '/static/js/main.js',
  '/static/css/main.css',
  '/api/seating/manifest',
  '/images/seating-placeholder.svg'
];

// API endpoints that should be cached
const API_ENDPOINTS = [
  '/api/seating/',
  '/api/guests/',
  '/api/tables/'
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing seating SW...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAME).then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Cache API endpoints
      caches.open(API_CACHE_NAME).then((cache) => {
        console.log('Service Worker: Preparing API cache');
        return Promise.resolve();
      })
    ])
  );

  // Force activation
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating seating SW...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Take control of all clients
  self.clients.claim();
});

/**
 * Fetch event - handle network requests with caching strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle seating API requests
  if (isSeatingAPIRequest(url)) {
    event.respondWith(handleSeatingAPIRequest(request));
    return;
  }

  // Handle static assets
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAssetRequest(request));
    return;
  }

  // Default: network first, cache fallback
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

/**
 * Background sync event - sync offline changes
 */
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync event', event.tag);
  
  if (event.tag === 'seating-sync') {
    event.waitUntil(syncSeatingChanges());
  }
});

/**
 * Push notification event
 */
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push message received');
  
  const options = {
    body: 'Your seating arrangement has been updated',
    icon: '/icons/seating-icon-192.png',
    badge: '/icons/seating-badge-72.png',
    tag: 'seating-update',
    data: event.data ? event.data.json() : {},
    actions: [
      {
        action: 'view',
        title: 'View Changes',
        icon: '/icons/view-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('WedSync Seating', options)
  );
});

/**
 * Notification click event
 */
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event.action);
  
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/wedme/seating')
    );
  }
});

/**
 * Handle seating API requests with network-first, cache-fallback strategy
 */
async function handleSeatingAPIRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses for GET requests
      if (request.method === 'GET') {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }
    
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return error response
    return new Response(
      JSON.stringify({
        error: 'Offline - data not available',
        offline: true
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    // Network error, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response
    return new Response(
      JSON.stringify({
        error: 'Network error - offline mode',
        offline: true
      }),
      {
        status: 503,
        statusText: 'Service Unavailable', 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle static asset requests with cache-first strategy
 */
async function handleStaticAssetRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Cache miss, fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return error for critical assets
    return new Response('Asset not available offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

/**
 * Sync offline changes to server
 */
async function syncSeatingChanges() {
  console.log('Service Worker: Syncing seating changes...');
  
  try {
    // Get pending changes from IndexedDB
    const dbRequest = indexedDB.open('WedSyncSeatingOffline', 1);
    
    const db = await new Promise((resolve, reject) => {
      dbRequest.onsuccess = () => resolve(dbRequest.result);
      dbRequest.onerror = () => reject(dbRequest.error);
    });

    const transaction = db.transaction(['changes'], 'readwrite');
    const store = transaction.objectStore('changes');
    const index = store.index('syncStatus');
    
    const pendingChanges = await new Promise((resolve, reject) => {
      const request = index.getAll('pending');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log(`Service Worker: Found ${pendingChanges.length} pending changes`);
    
    // Sync each change
    for (const change of pendingChanges) {
      try {
        await syncChange(change);
        
        // Update status to synced
        change.syncStatus = 'synced';
        await new Promise((resolve, reject) => {
          const updateRequest = store.put(change);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        });
        
      } catch (error) {
        console.error('Service Worker: Failed to sync change', change.id, error);
        
        // Update status to failed
        change.syncStatus = 'failed';
        await new Promise((resolve, reject) => {
          const updateRequest = store.put(change);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        });
      }
    }

    db.close();
    console.log('Service Worker: Sync complete');
    
    // Notify clients of sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        syncedCount: pendingChanges.filter(c => c.syncStatus === 'synced').length
      });
    });
    
  } catch (error) {
    console.error('Service Worker: Sync failed', error);
    throw error;
  }
}

/**
 * Sync individual change to server
 */
async function syncChange(change) {
  const { type, data } = change;
  let endpoint, method, body;

  switch (type) {
    case 'assign_guest':
      endpoint = `/api/seating/assign`;
      method = 'POST';
      body = JSON.stringify({
        guestId: data.guestId,
        tableId: data.tableId
      });
      break;
      
    case 'move_guest':
      endpoint = `/api/seating/move`;
      method = 'POST';
      body = JSON.stringify({
        guestId: data.guestId,
        fromTableId: data.fromTableId,
        toTableId: data.toTableId
      });
      break;
      
    case 'update_table':
      endpoint = `/api/seating/tables/${data.tableId}`;
      method = 'PUT';
      body = JSON.stringify(data.tableData);
      break;
      
    default:
      throw new Error(`Unknown change type: ${type}`);
  }

  const response = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check if request is for seating API
 */
function isSeatingAPIRequest(url) {
  return API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint));
}

/**
 * Check if request is for static asset
 */
function isStaticAsset(url) {
  return STATIC_ASSETS.some(asset => url.pathname === asset) ||
         url.pathname.startsWith('/static/') ||
         url.pathname.startsWith('/images/') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css');
}

/**
 * Send message to all clients
 */
async function notifyClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage(message));
}