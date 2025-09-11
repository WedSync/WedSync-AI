/**
 * WS-245: Budget Service Worker
 * PWA service worker for offline budget functionality
 * Handles caching, background sync, and notifications for mobile wedding budget planning
 */

const CACHE_NAME = 'wedsync-budget-v1.0.0';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Static assets to cache for budget functionality
const BUDGET_STATIC_CACHE = [
  '/budget',
  '/budget/optimizer',
  '/budget/allocate',
  '/budget/expenses',
  '/components/mobile/budget/',
  '/api/budgets/offline-manifest',
  // Budget-related images and icons
  '/icons/budget-pie-chart.svg',
  '/icons/calculator.svg',
  '/icons/expense-add.svg',
  '/icons/gesture-swipe.svg',
  // Budget calculation libraries (if served statically)
  '/js/budget-calculations.js',
  '/js/currency-formatter.js',
];

// API endpoints to cache for offline budget access
const BUDGET_API_CACHE = [
  '/api/budgets/',
  '/api/budget-categories/',
  '/api/expenses/',
  '/api/budget-templates/',
  '/api/market-data/',
];

// Dynamic content patterns for budget pages
const BUDGET_DYNAMIC_PATTERNS = [
  /^\/budget\/[a-zA-Z0-9-]+$/,
  /^\/api\/budgets\/[a-zA-Z0-9-]+$/,
  /^\/api\/expenses\/budget\/[a-zA-Z0-9-]+$/,
  /^\/api\/budget-categories\/wedding\/[a-zA-Z0-9-]+$/,
];

/**
 * Service Worker Installation
 * Cache essential budget assets
 */
self.addEventListener('install', (event) => {
  console.log('[Budget SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Budget SW] Caching budget assets...');
      return cache.addAll(BUDGET_STATIC_CACHE);
    }).then(() => {
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

/**
 * Service Worker Activation
 * Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[Budget SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old budget caches
          if (cacheName !== CACHE_NAME && cacheName.startsWith('wedsync-budget-')) {
            console.log('[Budget SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim all open budget pages
      return self.clients.claim();
    })
  );
});

/**
 * Fetch Event Handler
 * Implement network-first strategy for budget data with offline fallback
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle budget-related requests
  if (!isBudgetRequest(url)) {
    return;
  }

  // Handle budget API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleBudgetAPI(request));
  } 
  // Handle budget page requests
  else if (isBudgetPageRequest(url)) {
    event.respondWith(handleBudgetPage(request));
  }
  // Handle static budget assets
  else {
    event.respondWith(handleStaticAssets(request));
  }
});

/**
 * Check if request is budget-related
 */
function isBudgetRequest(url) {
  return url.pathname.includes('/budget') ||
         url.pathname.includes('/api/budgets') ||
         url.pathname.includes('/api/expenses') ||
         url.pathname.includes('/api/budget-categories') ||
         BUDGET_DYNAMIC_PATTERNS.some(pattern => pattern.test(url.pathname));
}

/**
 * Check if request is for a budget page
 */
function isBudgetPageRequest(url) {
  return url.pathname.startsWith('/budget') ||
         BUDGET_DYNAMIC_PATTERNS.some(pattern => pattern.test(url.pathname));
}

/**
 * Handle budget API requests with network-first, cache fallback strategy
 */
async function handleBudgetAPI(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  try {
    // Try network first for fresh data
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      if (request.method === 'GET') {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } else {
      throw new Error(`Network response not ok: ${networkResponse.status}`);
    }
  } catch (error) {
    console.log('[Budget SW] Network failed, trying cache:', error);
    
    // Return cached version if available
    if (cachedResponse) {
      // Add offline indicator header
      const response = cachedResponse.clone();
      response.headers.set('X-Served-From-Cache', 'true');
      response.headers.set('X-Cache-Date', new Date().toISOString());
      return response;
    }

    // For POST/PUT requests (budget updates), queue for background sync
    if (request.method !== 'GET') {
      await queueBudgetSync(request);
      return new Response(JSON.stringify({
        success: true,
        queued: true,
        message: 'Budget update queued for sync when online'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return offline response for GET requests
    return new Response(JSON.stringify({
      error: 'Offline - no cached data available',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle budget page requests with cache-first strategy
 */
async function handleBudgetPage(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Return cached version immediately if available
  if (cachedResponse && !isExpired(cachedResponse)) {
    // Update in background
    updateBudgetPageInBackground(request, cache);
    return cachedResponse;
  }

  try {
    // Try network for fresh page
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('[Budget SW] Network failed for page:', error);
  }

  // Return stale cache if available
  if (cachedResponse) {
    return cachedResponse;
  }

  // Return offline fallback page
  return caches.match('/budget/offline');
}

/**
 * Handle static budget assets with cache-first strategy
 */
async function handleStaticAssets(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[Budget SW] Failed to fetch static asset:', error);
    throw error;
  }
}

/**
 * Update budget page in background
 */
async function updateBudgetPageInBackground(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response);
    }
  } catch (error) {
    console.log('[Budget SW] Background update failed:', error);
  }
}

/**
 * Check if cached response is expired
 */
function isExpired(response) {
  const cacheDate = response.headers.get('date');
  if (!cacheDate) return false;
  
  const age = Date.now() - new Date(cacheDate).getTime();
  return age > CACHE_EXPIRY;
}

/**
 * Queue budget operations for background sync
 */
async function queueBudgetSync(request) {
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.method !== 'GET' ? await request.text() : null,
    timestamp: Date.now(),
    retryCount: 0
  };

  // Store in IndexedDB for background sync
  const db = await openBudgetSyncDB();
  const transaction = db.transaction(['syncQueue'], 'readwrite');
  const store = transaction.objectStore('syncQueue');
  
  await store.add({
    id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...requestData
  });

  // Register background sync
  if ('serviceWorker' in self && 'sync' in window.ServiceWorkerRegistration.prototype) {
    try {
      await self.registration.sync.register('budget-background-sync');
    } catch (error) {
      console.log('[Budget SW] Background sync registration failed:', error);
    }
  }
}

/**
 * Background Sync Event Handler
 * Sync queued budget operations when online
 */
self.addEventListener('sync', (event) => {
  console.log('[Budget SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'budget-background-sync') {
    event.waitUntil(processBudgetSyncQueue());
  }
});

/**
 * Process queued budget sync operations
 */
async function processBudgetSyncQueue() {
  const db = await openBudgetSyncDB();
  const transaction = db.transaction(['syncQueue'], 'readwrite');
  const store = transaction.objectStore('syncQueue');
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = async () => {
      const queuedItems = request.result;
      console.log('[Budget SW] Processing', queuedItems.length, 'queued items');

      for (const item of queuedItems) {
        try {
          await syncBudgetOperation(item);
          // Remove from queue after successful sync
          await store.delete(item.id);
          console.log('[Budget SW] Synced:', item.url);
        } catch (error) {
          console.log('[Budget SW] Sync failed:', error);
          
          // Retry logic
          item.retryCount = (item.retryCount || 0) + 1;
          if (item.retryCount < 3) {
            await store.put(item);
          } else {
            // Remove after 3 failed attempts
            await store.delete(item.id);
            console.log('[Budget SW] Removed after 3 failed attempts:', item.url);
          }
        }
      }
      
      resolve();
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Sync individual budget operation
 */
async function syncBudgetOperation(item) {
  const { url, method, headers, body } = item;
  
  const request = new Request(url, {
    method,
    headers,
    body: body || undefined
  });

  const response = await fetch(request);
  
  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
  }

  return response;
}

/**
 * Open IndexedDB for sync queue
 */
async function openBudgetSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('wedsync_budget_sync', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('url', 'url', { unique: false });
      }
    };
  });
}

/**
 * Push Event Handler
 * Handle budget-related push notifications
 */
self.addEventListener('push', (event) => {
  console.log('[Budget SW] Push received');
  
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (error) {
      console.log('[Budget SW] Error parsing push data:', error);
      return;
    }
  }

  // Only handle budget-related notifications
  if (data.type !== 'budget' && data.category !== 'budget') {
    return;
  }

  const options = {
    title: data.title || 'WedSync Budget Update',
    body: data.body || 'Your wedding budget has been updated',
    icon: '/icons/budget-notification-icon.png',
    badge: '/icons/budget-badge.png',
    tag: `budget-${data.budgetId || 'general'}`,
    data: {
      budgetId: data.budgetId,
      weddingId: data.weddingId,
      url: data.url || '/budget'
    },
    actions: [
      {
        action: 'view-budget',
        title: 'View Budget',
        icon: '/icons/view-budget.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: data.priority === 'high',
    silent: data.priority === 'low'
  };

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

/**
 * Notification Click Handler
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[Budget SW] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'view-budget') {
    const budgetId = event.notification.data.budgetId;
    const url = budgetId ? `/budget/${budgetId}` : '/budget';
    
    event.waitUntil(
      clients.openWindow(url)
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default click - open budget page
    const url = event.notification.data.url || '/budget';
    event.waitUntil(
      clients.openWindow(url)
    );
  }
});

/**
 * Message Event Handler
 * Handle messages from budget components
 */
self.addEventListener('message', (event) => {
  console.log('[Budget SW] Message received:', event.data);

  if (event.data && event.data.type === 'BUDGET_CACHE_UPDATE') {
    event.waitUntil(
      updateBudgetCache(event.data.payload)
    );
  } else if (event.data && event.data.type === 'BUDGET_SYNC_NOW') {
    event.waitUntil(
      processBudgetSyncQueue().then(() => {
        event.ports[0].postMessage({ success: true });
      }).catch((error) => {
        event.ports[0].postMessage({ success: false, error: error.message });
      })
    );
  }
});

/**
 * Update budget cache with new data
 */
async function updateBudgetCache(payload) {
  const cache = await caches.open(CACHE_NAME);
  const { url, data } = payload;

  const response = new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'X-Cache-Updated': new Date().toISOString()
    }
  });

  await cache.put(url, response);
  console.log('[Budget SW] Cache updated for:', url);
}

/**
 * Periodic Background Sync
 * Try to sync budget data periodically when online
 */
self.addEventListener('periodicsync', (event) => {
  console.log('[Budget SW] Periodic sync triggered:', event.tag);
  
  if (event.tag === 'budget-periodic-sync') {
    event.waitUntil(processBudgetSyncQueue());
  }
});

/**
 * Error Event Handler
 */
self.addEventListener('error', (event) => {
  console.error('[Budget SW] Service worker error:', event.error);
});

/**
 * Unhandled Rejection Handler
 */
self.addEventListener('unhandledrejection', (event) => {
  console.error('[Budget SW] Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

console.log('[Budget SW] Service worker loaded successfully');