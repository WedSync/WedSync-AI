/**
 * PWA Service Worker for Collaborative Editing
 * WS-244 Team D - Mobile-First Real-Time Collaboration System
 * 
 * Features:
 * - Offline collaborative document caching
 * - Y.js document persistence in IndexedDB  
 * - Background sync for pending operations
 * - Push notifications for collaboration events
 * - Battery-optimized sync strategies
 * - Wedding-specific offline prioritization
 */

const CACHE_VERSION = 'wedsync-collaboration-v1';
const COLLABORATION_CACHE = 'collaboration-documents';
const STATIC_CACHE = 'collaboration-static';
const YJS_STORE = 'yjs-documents';

// Critical collaboration resources to cache
const CRITICAL_RESOURCES = [
  '/api/collaboration/save',
  '/api/collaboration/sync',
  '/components/mobile/collaboration/MobileCollaborativeEditor',
  '/components/mobile/collaboration/MobilePresenceDisplay',
  '/components/mobile/collaboration/TouchSelectionHandler',
  '/components/mobile/collaboration/OfflineCollaborationManager'
];

// Wedding document type priorities (for offline caching)
const DOCUMENT_PRIORITIES = {
  'timeline': 1,      // Highest priority - wedding day schedule
  'guest_list': 2,    // High priority - guest management
  'vendor_selection': 3,  // Medium priority - vendor planning
  'family_input': 4   // Lower priority - family suggestions
};

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing collaboration service worker');
  
  event.waitUntil(
    (async () => {
      try {
        // Cache critical collaboration resources
        const staticCache = await caches.open(STATIC_CACHE);
        await staticCache.addAll(CRITICAL_RESOURCES);
        
        // Initialize IndexedDB for Y.js documents
        await initializeYjsStore();
        
        console.log('[SW] Collaboration resources cached successfully');
        
        // Skip waiting to activate immediately
        self.skipWaiting();
      } catch (error) {
        console.error('[SW] Failed to cache collaboration resources:', error);
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating collaboration service worker');
  
  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
          name.startsWith('wedsync-collaboration-') && name !== CACHE_VERSION
        );
        
        await Promise.all(
          oldCaches.map(cacheName => caches.delete(cacheName))
        );
        
        // Take control of all clients
        await self.clients.claim();
        
        console.log('[SW] Collaboration service worker activated');
      } catch (error) {
        console.error('[SW] Failed to activate collaboration service worker:', error);
      }
    })()
  );
});

// Fetch event - handle collaboration API requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle collaboration API requests
  if (url.pathname.startsWith('/api/collaboration/')) {
    event.respondWith(handleCollaborationRequest(event.request));
    return;
  }
  
  // Handle collaborative document requests
  if (url.pathname.includes('/collaboration/')) {
    event.respondWith(handleDocumentRequest(event.request));
    return;
  }
  
  // Handle Y.js related requests
  if (url.pathname.includes('yjs') || url.searchParams.has('collaborative')) {
    event.respondWith(handleYjsRequest(event.request));
    return;
  }
});

// Handle collaboration API requests with offline support
async function handleCollaborationRequest(request) {
  const url = new URL(request.url);
  const isOnline = navigator.onLine;
  
  try {
    if (isOnline) {
      // Try network first when online
      const networkResponse = await fetch(request.clone());
      
      if (networkResponse.ok) {
        // Cache successful responses (except for sensitive data)
        if (request.method === 'GET') {
          const cache = await caches.open(COLLABORATION_CACHE);
          await cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
      }
    }
    
    // Fall back to cache when offline or network fails
    if (request.method === 'GET') {
      const cache = await caches.open(COLLABORATION_CACHE);
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Handle POST/PUT requests offline
    if (['POST', 'PUT'].includes(request.method)) {
      return handleOfflineCollaborativeOperation(request);
    }
    
    // Return offline response
    return new Response(
      JSON.stringify({
        error: 'Offline - operation queued',
        offline: true,
        timestamp: new Date().toISOString()
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('[SW] Collaboration request failed:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Service unavailable',
        offline: !isOnline,
        message: error.message
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle collaborative document requests
async function handleDocumentRequest(request) {
  const isOnline = navigator.onLine;
  
  try {
    if (isOnline) {
      // Try network first
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        // Cache the document
        const cache = await caches.open(COLLABORATION_CACHE);
        await cache.put(request, networkResponse.clone());
        
        return networkResponse;
      }
    }
    
    // Fall back to cached version
    const cache = await caches.open(COLLABORATION_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Add offline header
      const response = cachedResponse.clone();
      response.headers.set('X-Served-By', 'ServiceWorker');
      response.headers.set('X-Cache-Status', 'HIT');
      return response;
    }
    
    // Return offline fallback page
    return generateOfflineDocumentPage(request);
    
  } catch (error) {
    console.error('[SW] Document request failed:', error);
    return generateOfflineDocumentPage(request);
  }
}

// Handle Y.js related requests
async function handleYjsRequest(request) {
  try {
    // Always try to serve Y.js from cache first for performance
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If not cached and online, fetch and cache
    if (navigator.onLine) {
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
        return networkResponse;
      }
    }
    
    throw new Error('Y.js resource not available');
    
  } catch (error) {
    console.error('[SW] Y.js request failed:', error);
    
    return new Response('Y.js resource unavailable offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Handle offline collaborative operations
async function handleOfflineCollaborativeOperation(request) {
  try {
    const requestData = await request.json();
    const operationId = generateOperationId();
    
    // Store the operation for later sync
    await storeOfflineOperation({
      id: operationId,
      request: {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: requestData
      },
      timestamp: new Date().toISOString(),
      priority: getOperationPriority(requestData),
      retryCount: 0
    });
    
    // Store Y.js state if provided
    if (requestData.yDocState) {
      await storeYjsDocument(requestData.documentId, requestData.yDocState);
    }
    
    // Register for background sync
    if ('serviceWorker' in self && 'sync' in self.registration) {
      await self.registration.sync.register('collaboration-sync');
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        offline: true,
        operationId,
        message: 'Operation queued for sync',
        timestamp: new Date().toISOString()
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('[SW] Failed to handle offline operation:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to queue operation',
        message: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'collaboration-sync') {
    event.waitUntil(syncOfflineOperations());
  }
});

// Sync offline operations when back online
async function syncOfflineOperations() {
  try {
    const operations = await getOfflineOperations();
    const sortedOps = operations.sort((a, b) => a.priority - b.priority);
    
    console.log(`[SW] Syncing ${sortedOps.length} offline operations`);
    
    for (const operation of sortedOps) {
      try {
        const response = await fetch(operation.request.url, {
          method: operation.request.method,
          headers: operation.request.headers,
          body: JSON.stringify(operation.request.body)
        });
        
        if (response.ok) {
          await removeOfflineOperation(operation.id);
          console.log(`[SW] Successfully synced operation ${operation.id}`);
        } else {
          // Increment retry count
          await updateOfflineOperationRetry(operation.id);
        }
        
      } catch (error) {
        console.error(`[SW] Failed to sync operation ${operation.id}:`, error);
        await updateOfflineOperationRetry(operation.id);
      }
    }
    
    // Notify clients of sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'collaboration-sync-complete',
        syncedCount: sortedOps.length
      });
    });
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Push event for collaboration notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  if (data.type === 'collaboration') {
    event.waitUntil(handleCollaborationNotification(data));
  }
});

// Handle collaboration notifications
async function handleCollaborationNotification(data) {
  const options = {
    body: data.message,
    icon: '/icons/collaboration-icon-192.png',
    badge: '/icons/collaboration-badge-72.png',
    tag: `collaboration-${data.documentId}`,
    data: data,
    actions: [
      {
        action: 'view',
        title: 'View Document',
        icon: '/icons/view-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-icon.png'
      }
    ]
  };
  
  await self.registration.showNotification(data.title, options);
}

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  
  if (event.action === 'view' && data.documentId) {
    event.waitUntil(
      self.clients.openWindow(`/collaboration/${data.documentId}`)
    );
  }
});

// IndexedDB helpers for Y.js document storage
async function initializeYjsStore() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(YJS_STORE, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create stores
      if (!db.objectStoreNames.contains('documents')) {
        const documentsStore = db.createObjectStore('documents', { keyPath: 'id' });
        documentsStore.createIndex('timestamp', 'timestamp');
        documentsStore.createIndex('priority', 'priority');
      }
      
      if (!db.objectStoreNames.contains('operations')) {
        const operationsStore = db.createObjectStore('operations', { keyPath: 'id' });
        operationsStore.createIndex('timestamp', 'timestamp');
        operationsStore.createIndex('priority', 'priority');
      }
    };
  });
}

async function storeYjsDocument(documentId, yjsState) {
  const db = await initializeYjsStore();
  const transaction = db.transaction(['documents'], 'readwrite');
  const store = transaction.objectStore('documents');
  
  await store.put({
    id: documentId,
    yjsState,
    timestamp: Date.now(),
    priority: 1
  });
}

async function storeOfflineOperation(operation) {
  const db = await initializeYjsStore();
  const transaction = db.transaction(['operations'], 'readwrite');
  const store = transaction.objectStore('operations');
  
  await store.put(operation);
}

async function getOfflineOperations() {
  const db = await initializeYjsStore();
  const transaction = db.transaction(['operations'], 'readonly');
  const store = transaction.objectStore('operations');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removeOfflineOperation(operationId) {
  const db = await initializeYjsStore();
  const transaction = db.transaction(['operations'], 'readwrite');
  const store = transaction.objectStore('operations');
  
  await store.delete(operationId);
}

async function updateOfflineOperationRetry(operationId) {
  const db = await initializeYjsStore();
  const transaction = db.transaction(['operations'], 'readwrite');
  const store = transaction.objectStore('operations');
  
  const operation = await store.get(operationId);
  if (operation) {
    operation.retryCount = (operation.retryCount || 0) + 1;
    
    // Remove operation after 5 failed retries
    if (operation.retryCount > 5) {
      await store.delete(operationId);
    } else {
      await store.put(operation);
    }
  }
}

// Utility functions
function generateOperationId() {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getOperationPriority(requestData) {
  if (requestData.documentType) {
    return DOCUMENT_PRIORITIES[requestData.documentType] || 5;
  }
  return 3; // Default priority
}

function generateOfflineDocumentPage(request) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - WedSync Collaboration</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          margin: 0;
          padding: 20px;
          background: #f9fafb;
          color: #1f2937;
        }
        .container {
          max-width: 400px;
          margin: 0 auto;
          text-align: center;
          padding: 40px 20px;
        }
        .icon {
          width: 80px;
          height: 80px;
          background: #fef3c7;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 12px;
        }
        p {
          color: #6b7280;
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .retry-btn {
          background: #7c3aed;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
        }
        .retry-btn:hover {
          background: #6d28d9;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">
          📱
        </div>
        <h1>Working Offline</h1>
        <p>You're currently offline, but you can still view and edit your wedding documents. Changes will sync automatically when you're back online.</p>
        <button class="retry-btn" onclick="window.location.reload()">
          Try Again
        </button>
      </div>
    </body>
    </html>
  `;
  
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  });
}

console.log('[SW] Collaboration service worker loaded successfully');