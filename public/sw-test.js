// Test Service Worker for WS-171 PWA Testing
// This is a basic service worker template for testing service worker lifecycle

const CACHE_NAME = 'wedsync-test-v1.0.0';
const STATIC_CACHE = 'wedsync-static-v1.0.0';
const API_CACHE = 'wedsync-api-v1.0.0';

// Resources to cache immediately
const PRECACHE_RESOURCES = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Precaching static resources');
        return cache.addAll(PRECACHE_RESOURCES);
      }),
      caches.open(API_CACHE) // Create API cache
    ]).then(() => {
      console.log('Service Worker installed successfully');
      // Skip waiting to activate immediately for testing
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old caches that don't match current version
          if (cacheName.startsWith('wedsync-') && 
              cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE && 
              cacheName !== API_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      // Claim control of all clients
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }
  
  event.respondWith(
    (async () => {
      // API requests - Network First strategy
      if (url.pathname.startsWith('/api/')) {
        return networkFirstStrategy(request, API_CACHE);
      }
      
      // Static assets - Cache First strategy
      if (url.pathname.includes('/_next/static/') || 
          url.pathname.includes('/icon-') ||
          url.pathname === '/manifest.json') {
        return cacheFirstStrategy(request, STATIC_CACHE);
      }
      
      // Pages - Stale While Revalidate
      return staleWhileRevalidateStrategy(request, STATIC_CACHE);
    })()
  );
});

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({
        type: 'VERSION',
        version: '1.0.0'
      });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({
          type: 'CACHE_CLEARED'
        });
      });
      break;
      
    case 'TEST_MESSAGE':
      event.ports[0].postMessage({
        type: 'TEST_RESPONSE',
        data: 'Hello from Service Worker'
      });
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

// Background Sync event - handle offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);
  
  switch (event.tag) {
    case 'wedding-data-sync':
      event.waitUntil(syncWeddingData());
      break;
      
    case 'photo-upload-sync':
      event.waitUntil(syncPhotoUploads());
      break;
      
    case 'task-update-sync':
      event.waitUntil(syncTaskUpdates());
      break;
      
    case 'test-sync':
      event.waitUntil(handleTestSync());
      break;
      
    default:
      console.log('Unknown sync tag:', event.tag);
  }
});

// Caching Strategies

async function networkFirstStrategy(request, cacheName) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fall back to cache
    console.log('Network failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response
    return new Response(
      JSON.stringify({ error: 'Offline', cached: false }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function cacheFirstStrategy(request, cacheName) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Fall back to network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);
    throw error;
  }
}

async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await caches.match(request);
  
  // Fetch fresh version in background
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cachedResponse);
  
  // Return cached version immediately if available
  return cachedResponse || fetchPromise;
}

// Background Sync Handlers

async function syncWeddingData() {
  console.log('Syncing wedding data...');
  
  try {
    // Get queued wedding data from IndexedDB (simulated with a placeholder)
    const queuedData = await getQueuedWeddingData();
    
    for (const item of queuedData) {
      await syncSingleItem(item);
    }
    
    // Notify clients of successful sync
    await notifyClients({
      type: 'SYNC_COMPLETE',
      syncType: 'wedding-data',
      itemCount: queuedData.length
    });
    
    console.log('Wedding data sync complete');
  } catch (error) {
    console.error('Wedding data sync failed:', error);
    throw error;
  }
}

async function syncPhotoUploads() {
  console.log('Syncing photo uploads...');
  
  try {
    const queuedPhotos = await getQueuedPhotos();
    
    for (const photo of queuedPhotos) {
      await uploadPhoto(photo);
    }
    
    await notifyClients({
      type: 'SYNC_COMPLETE',
      syncType: 'photo-upload',
      photoCount: queuedPhotos.length
    });
    
    console.log('Photo upload sync complete');
  } catch (error) {
    console.error('Photo upload sync failed:', error);
    throw error;
  }
}

async function syncTaskUpdates() {
  console.log('Syncing task updates...');
  
  try {
    const queuedTasks = await getQueuedTasks();
    
    for (const task of queuedTasks) {
      await syncTaskUpdate(task);
    }
    
    await notifyClients({
      type: 'SYNC_COMPLETE',
      syncType: 'task-update',
      taskCount: queuedTasks.length
    });
    
    console.log('Task update sync complete');
  } catch (error) {
    console.error('Task update sync failed:', error);
    throw error;
  }
}

async function handleTestSync() {
  console.log('Handling test sync...');
  
  // Simulate sync work
  await new Promise(resolve => setTimeout(resolve, 100));
  
  await notifyClients({
    type: 'SYNC_COMPLETE',
    syncType: 'test',
    timestamp: Date.now()
  });
}

// Helper Functions

async function getQueuedWeddingData() {
  // Placeholder - would typically read from IndexedDB
  return [
    { id: 1, type: 'timeline-update', data: {} },
    { id: 2, type: 'vendor-change', data: {} }
  ];
}

async function getQueuedPhotos() {
  // Placeholder - would typically read from IndexedDB
  return [
    { id: 1, file: 'photo1.jpg', metadata: {} }
  ];
}

async function getQueuedTasks() {
  // Placeholder - would typically read from IndexedDB
  return [
    { id: 1, taskId: 'task-123', status: 'completed' }
  ];
}

async function syncSingleItem(item) {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 50));
  console.log('Synced item:', item.id);
}

async function uploadPhoto(photo) {
  // Simulate photo upload
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log('Uploaded photo:', photo.id);
}

async function syncTaskUpdate(task) {
  // Simulate task sync
  await new Promise(resolve => setTimeout(resolve, 30));
  console.log('Synced task:', task.id);
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage(message);
  });
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// Error handling
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled rejection:', event.reason);
  event.preventDefault();
});

console.log('Service Worker loaded successfully');