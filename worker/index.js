// =====================================================
// WEDSYNC COMPREHENSIVE SERVICE WORKER
// Advanced PWA with Wedding Day Offline Functionality
// =====================================================

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { BackgroundSync } from 'workbox-background-sync';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BroadcastUpdatePlugin } from 'workbox-broadcast-update';
import { Queue } from 'workbox-background-sync';

// =====================================================
// SERVICE WORKER CONFIGURATION
// =====================================================

// Enable navigation preload for faster page loads
const enableNavigationPreload = () => {
  if (self.registration.navigationPreload) {
    self.registration.navigationPreload.enable();
  }
};

// Performance monitoring
const performanceObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'measure') {
      console.log(`[SW Performance] ${entry.name}: ${entry.duration}ms`);
    }
  }
});

performanceObserver.observe({ entryTypes: ['measure'] });

// =====================================================
// CACHE CONFIGURATION
// =====================================================

const CACHE_NAMES = {
  CRITICAL_WEDDING_DATA: 'critical-wedding-data-v1',
  TIMELINE_API: 'timeline-api-v1',
  VENDOR_DATA: 'vendor-data-v1',
  STATIC_RESOURCES: 'static-resources-v1',
  IMAGES: 'images-v1',
  API_CACHE: 'api-cache-v1',
  WEDDING_DAY_CACHE: 'wedding-day-cache-v1'
};

const CACHE_SIZES = {
  CRITICAL_WEDDING_DATA: 50, // Critical data - smaller cache, fresher data
  TIMELINE_API: 100,
  VENDOR_DATA: 200,
  STATIC_RESOURCES: 60,
  IMAGES: 150,
  API_CACHE: 100,
  WEDDING_DAY_CACHE: 300 // Large cache for wedding day data
};

const CACHE_TTL = {
  CRITICAL: 2 * 60 * 60, // 2 hours
  TIMELINE: 4 * 60 * 60, // 4 hours
  VENDOR: 24 * 60 * 60, // 1 day
  STATIC: 30 * 24 * 60 * 60, // 30 days
  API: 6 * 60 * 60, // 6 hours
  WEDDING_DAY: 7 * 24 * 60 * 60 // 1 week for wedding day data
};

// =====================================================
// BACKGROUND SYNC QUEUES
// =====================================================

// Wedding Day Actions Queue (High Priority)
const weddingDayQueue = new Queue('wedding-day-actions', {
  onSync: async ({ queue }) => {
    performance.mark('wedding-day-sync-start');
    
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        const response = await fetch(entry.request);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        // Broadcast success to clients
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'WEDDING_DAY_SYNC_SUCCESS',
              data: { url: entry.request.url, timestamp: Date.now() }
            });
          });
        });
        
        console.log(`[Wedding Day Sync] Success: ${entry.request.url}`);
      } catch (error) {
        console.error(`[Wedding Day Sync] Failed: ${entry.request.url}`, error);
        
        // Re-queue for retry with exponential backoff
        if (entry.metadata && entry.metadata.retryCount < 3) {
          await queue.unshiftRequest({
            request: entry.request,
            metadata: { ...entry.metadata, retryCount: (entry.metadata.retryCount || 0) + 1 }
          });
        } else {
          // Notify clients of permanent failure
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'WEDDING_DAY_SYNC_FAILED',
                data: { url: entry.request.url, error: error.message }
              });
            });
          });
        }
        throw error;
      }
    }
    
    performance.mark('wedding-day-sync-end');
    performance.measure('wedding-day-sync', 'wedding-day-sync-start', 'wedding-day-sync-end');
  }
});

// General API Queue (Medium Priority)
const apiQueue = new Queue('api-requests', {
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
        console.log(`[API Sync] Success: ${entry.request.url}`);
      } catch (error) {
        console.error(`[API Sync] Failed: ${entry.request.url}`, error);
        throw error;
      }
    }
  }
});

// Form Submissions Queue (Low Priority)
const formQueue = new Queue('form-submissions', {
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
        console.log(`[Form Sync] Success: ${entry.request.url}`);
      } catch (error) {
        console.error(`[Form Sync] Failed: ${entry.request.url}`, error);
        throw error;
      }
    }
  }
});

// =====================================================
// WEDDING DAY PRE-CACHING SYSTEM
// =====================================================

const preCache24HourData = async (weddingId, weddingDate) => {
  const now = new Date();
  const wedding = new Date(weddingDate);
  const timeDiff = wedding.getTime() - now.getTime();
  const hoursUntilWedding = Math.ceil(timeDiff / (1000 * 60 * 60));

  if (hoursUntilWedding <= 24 && hoursUntilWedding > 0) {
    console.log(`[Pre-Cache] Wedding day approaching (${hoursUntilWedding}h), pre-caching critical data...`);
    
    try {
      const cache = await caches.open(CACHE_NAMES.WEDDING_DAY_CACHE);
      
      // Critical wedding day endpoints to pre-cache
      const criticalEndpoints = [
        `/api/timeline/wedding/${weddingId}`,
        `/api/vendors/wedding/${weddingId}`,
        `/api/wedding-coordination/${weddingId}`,
        `/api/issues/wedding/${weddingId}`,
        `/api/weather/wedding/${weddingId}`,
        `/api/emergency-contacts/wedding/${weddingId}`,
        `/api/backup-plans/wedding/${weddingId}`
      ];

      const fetchPromises = criticalEndpoints.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response.clone());
            console.log(`[Pre-Cache] Cached: ${url}`);
          }
        } catch (error) {
          console.warn(`[Pre-Cache] Failed to cache: ${url}`, error);
        }
      });

      await Promise.allSettled(fetchPromises);
      
      // Notify clients
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'WEDDING_DAY_PRECACHE_COMPLETE',
            data: { weddingId, hoursUntilWedding }
          });
        });
      });
      
    } catch (error) {
      console.error('[Pre-Cache] Wedding day pre-caching failed:', error);
    }
  }
};

// =====================================================
// CACHE STRATEGIES WITH PERFORMANCE OPTIMIZATION
// =====================================================

// Critical Wedding Day API - Network First with <100ms cache fallback
registerRoute(
  ({ url }) => url.pathname.match(/\/api\/(timeline|wedding-coordination|vendors|issues|weather|emergency)\//),
  new NetworkFirst({
    cacheName: CACHE_NAMES.CRITICAL_WEDDING_DATA,
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: CACHE_SIZES.CRITICAL_WEDDING_DATA,
        maxAgeSeconds: CACHE_TTL.CRITICAL,
        purgeOnQuotaError: true
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new BroadcastUpdatePlugin(),
      {
        // Performance optimization - sub-100ms cache operations
        cacheKeyWillBeUsed: async ({ request }) => {
          const url = new URL(request.url);
          // Remove timestamp parameters that would prevent cache hits
          url.searchParams.delete('_t');
          url.searchParams.delete('timestamp');
          return url.href;
        },
        cacheWillUpdate: async ({ request, response }) => {
          // Only cache successful responses
          return response.status === 200;
        },
        requestWillFetch: async ({ request }) => {
          performance.mark(`fetch-start-${request.url}`);
          return request;
        },
        fetchDidSucceed: async ({ request, response }) => {
          performance.mark(`fetch-end-${request.url}`);
          performance.measure(
            `fetch-${request.url}`,
            `fetch-start-${request.url}`,
            `fetch-end-${request.url}`
          );
          return response;
        }
      }
    ]
  })
);

// Timeline API - Enhanced for wedding day performance
registerRoute(
  ({ url }) => url.pathname.match(/\/api\/timeline\//),
  new NetworkFirst({
    cacheName: CACHE_NAMES.TIMELINE_API,
    networkTimeoutSeconds: 2,
    plugins: [
      new ExpirationPlugin({
        maxEntries: CACHE_SIZES.TIMELINE_API,
        maxAgeSeconds: CACHE_TTL.TIMELINE
      }),
      new BackgroundSync({
        name: 'timeline-sync',
        options: {
          maxRetentionTime: 48 * 60 // 2 days
        }
      }),
      new BroadcastUpdatePlugin()
    ]
  })
);

// Vendor Data - Stale While Revalidate for better UX
registerRoute(
  ({ url }) => url.pathname.match(/\/api\/vendors\//),
  new StaleWhileRevalidate({
    cacheName: CACHE_NAMES.VENDOR_DATA,
    plugins: [
      new ExpirationPlugin({
        maxEntries: CACHE_SIZES.VENDOR_DATA,
        maxAgeSeconds: CACHE_TTL.VENDOR
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200]
      })
    ]
  })
);

// Static Images - Cache First with aggressive caching
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: CACHE_NAMES.IMAGES,
    plugins: [
      new ExpirationPlugin({
        maxEntries: CACHE_SIZES.IMAGES,
        maxAgeSeconds: CACHE_TTL.STATIC
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200]
      })
    ]
  })
);

// API Requests - Network First with background sync
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  async ({ event }) => {
    const { request } = event;
    
    // Handle POST/PUT/DELETE with background sync
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      try {
        const response = await fetch(request.clone());
        return response;
      } catch (error) {
        // Queue for background sync
        if (request.url.includes('wedding-day') || request.url.includes('timeline')) {
          await weddingDayQueue.pushRequest({ request: request.clone() });
        } else {
          await apiQueue.pushRequest({ request: request.clone() });
        }
        
        return new Response(
          JSON.stringify({
            error: 'Offline',
            message: 'Request queued for sync when online',
            queued: true
          }),
          {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    // Handle GET requests with network first
    const strategy = new NetworkFirst({
      cacheName: CACHE_NAMES.API_CACHE,
      networkTimeoutSeconds: 5,
      plugins: [
        new ExpirationPlugin({
          maxEntries: CACHE_SIZES.API_CACHE,
          maxAgeSeconds: CACHE_TTL.API
        })
      ]
    });
    
    return strategy.handle({ event, request });
  }
);

// =====================================================
// NAVIGATION AND APP SHELL
// =====================================================

// Precache app shell and critical resources
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Navigation fallback for SPA routing
const handler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(handler, {
  denylist: [/^\/_/, /\/[^/?]+\.[^/]+$/]
});
registerRoute(navigationRoute);

// =====================================================
// CACHE MANAGEMENT AND CLEANUP
// =====================================================

const manageCacheSize = async () => {
  performance.mark('cache-cleanup-start');
  
  try {
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      // Check if cache exceeds size limit
      const maxSize = CACHE_SIZES[cacheName] || 100;
      
      if (requests.length > maxSize) {
        console.log(`[Cache Cleanup] ${cacheName} exceeds size limit (${requests.length}/${maxSize})`);
        
        // Remove oldest entries
        const sortedRequests = requests.sort((a, b) => {
          // Sort by URL (oldest cache entries typically have older timestamps in URLs)
          return a.url.localeCompare(b.url);
        });
        
        const toDelete = sortedRequests.slice(0, requests.length - maxSize);
        
        for (const request of toDelete) {
          await cache.delete(request);
        }
        
        console.log(`[Cache Cleanup] Deleted ${toDelete.length} entries from ${cacheName}`);
      }
    }
  } catch (error) {
    console.error('[Cache Cleanup] Error:', error);
  }
  
  performance.mark('cache-cleanup-end');
  performance.measure('cache-cleanup', 'cache-cleanup-start', 'cache-cleanup-end');
};

// Run cache cleanup every hour
setInterval(manageCacheSize, 60 * 60 * 1000);

// =====================================================
// MESSAGE HANDLING
// =====================================================

self.addEventListener('message', async (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLAIM_CLIENTS':
      self.clients.claim();
      break;
      
    case 'PRE_CACHE_WEDDING_DAY':
      if (data.weddingId && data.weddingDate) {
        await preCache24HourData(data.weddingId, data.weddingDate);
      }
      break;
      
    case 'FORCE_SYNC':
      try {
        await weddingDayQueue.replayRequests();
        await apiQueue.replayRequests();
        event.ports[0]?.postMessage({ success: true });
      } catch (error) {
        event.ports[0]?.postMessage({ success: false, error: error.message });
      }
      break;
      
    case 'CACHE_STATS':
      const stats = {};
      const cacheNames = await caches.keys();
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        stats[cacheName] = requests.length;
      }
      
      event.ports[0]?.postMessage({ stats });
      break;
      
    case 'CLEAR_CACHE':
      if (data.cacheName) {
        await caches.delete(data.cacheName);
      } else {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      event.ports[0]?.postMessage({ success: true });
      break;
      
    default:
      console.log(`[SW] Unknown message type: ${type}`);
  }
});

// =====================================================
// PUSH NOTIFICATIONS
// =====================================================

self.addEventListener('push', (event) => {
  console.log('[Push] Notification received');
  
  let notificationData = {
    title: 'WedSync',
    body: 'New update available',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/badge-72x72.svg',
    data: {},
    actions: [
      { action: 'view', title: '👀 View' },
      { action: 'dismiss', title: '✖️ Dismiss' }
    ]
  };

  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (error) {
      console.error('[Push] Failed to parse push data:', error);
    }
  }

  // Enhanced notification options
  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    data: notificationData.data,
    tag: `wedsync-${notificationData.data.type || 'general'}-${Date.now()}`,
    renotify: true,
    requireInteraction: notificationData.requireInteraction || false,
    actions: notificationData.actions,
    vibrate: [200, 100, 200, 100, 200],
    timestamp: Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[Notification] Click:', event.notification.tag);
  
  event.notification.close();
  
  const notificationData = event.notification.data;
  const action = event.action;
  
  if (action === 'dismiss') {
    return;
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus existing window or open new one
      if (clients.length > 0) {
        clients[0].focus();
        clients[0].postMessage({
          type: 'notification-action',
          data: { action, notification: event.notification.data }
        });
      } else {
        const url = notificationData.url || '/dashboard';
        return self.clients.openWindow(url);
      }
    })
  );
});

// =====================================================
// LIFECYCLE EVENTS
// =====================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    (async () => {
      // Enable navigation preload
      enableNavigationPreload();
      
      // Skip waiting to activate immediately
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    (async () => {
      // Clean up old caches
      await cleanupOutdatedCaches();
      
      // Claim all clients
      self.clients.claim();
      
      // Initialize cache cleanup
      await manageCacheSize();
      
      console.log('[SW] Activated and ready!');
    })()
  );
});

// =====================================================
// ERROR HANDLING
// =====================================================

self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled Promise Rejection:', event.reason);
});

// =====================================================
// PERIODIC BACKGROUND SYNC
// =====================================================

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'wedding-day-data-sync') {
    event.waitUntil(
      (async () => {
        console.log('[Periodic Sync] Wedding day data sync');
        
        // Check for upcoming weddings and pre-cache data
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'PERIODIC_SYNC_REQUEST',
            data: { syncType: 'wedding-day-data' }
          });
        });
      })()
    );
  }
});

console.log('🚀 WedSync Advanced Service Worker loaded and ready for wedding day coordination!');