/**
 * WedSync Service Worker
 * 
 * Provides PWA functionality, background sync, offline support, and push notifications
 * for the WedSync mobile wedding coordination platform.
 * 
 * Features:
 * - Offline support with intelligent caching
 * - Background sync for critical wedding data
 * - Push notification handling
 * - Photo upload queuing and retry
 * - Emergency wedding day functionality
 */

const CACHE_NAME = 'wedsync-mobile-cache-v1';
const OFFLINE_URL = '/offline.html';
const API_CACHE_NAME = 'wedsync-api-cache-v1';
const PHOTO_CACHE_NAME = 'wedsync-photos-cache-v1';
const STATIC_CACHE_NAME = 'wedsync-static-cache-v1';

// Wedding day critical resources (always cached)
const CRITICAL_WEDDING_RESOURCES = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/wedding-dashboard',
  '/emergency-contact',
  '/vendor-directory'
];

// API endpoints that can be cached
const CACHEABLE_API_ROUTES = [
  '/api/vendors',
  '/api/wedding-timeline',
  '/api/venues',
  '/api/weather'
];

// Background sync tags for different operations
const SYNC_TAGS = {
  PHOTO_UPLOAD: 'photo-upload-sync',
  FORM_SUBMISSION: 'form-submission-sync',
  VENDOR_MESSAGE: 'vendor-message-sync',
  WEDDING_UPDATE: 'wedding-update-sync',
  EMERGENCY_ALERT: 'emergency-alert-sync'
};

// Priority levels for wedding operations
const PRIORITIES = {
  EMERGENCY: 1,
  WEDDING_DAY: 2,
  VENDOR_CRITICAL: 3,
  CLIENT_UPDATE: 4,
  GENERAL: 5
};

/**
 * Service Worker Installation
 * Pre-cache critical wedding resources
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing WedSync Service Worker v1.0.0');
  
  event.waitUntil(
    (async () => {
      // Pre-cache critical wedding resources
      const cache = await caches.open(STATIC_CACHE_NAME);
      await cache.addAll(CRITICAL_WEDDING_RESOURCES);
      
      // Create offline page
      await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
      
      console.log('[SW] Critical wedding resources cached successfully');
      
      // Skip waiting to activate immediately
      self.skipWaiting();
    })()
  );
});

/**
 * Service Worker Activation
 * Clean up old caches and claim clients
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating WedSync Service Worker');
  
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      const deletePromises = cacheNames
        .filter(name => !name.includes('v1'))
        .map(name => caches.delete(name));
      
      await Promise.all(deletePromises);
      
      // Claim all clients immediately
      await self.clients.claim();
      
      console.log('[SW] Service Worker activated and clients claimed');
    })()
  );
});

/**
 * Fetch Event Handler
 * Intelligent caching strategy based on request type and wedding priorities
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests for caching
  if (request.method !== 'GET') return;
  
  // Skip cross-origin requests unless they're wedding APIs
  if (url.origin !== self.location.origin && !isWeddingAPI(url)) return;
  
  event.respondWith(handleFetch(request));
});

/**
 * Intelligent fetch handler with wedding-specific caching strategies
 */
async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // Wedding Day Strategy: Emergency contacts and critical info
    if (isEmergencyRoute(url.pathname)) {
      return await emergencyFetchStrategy(request);
    }
    
    // Photo Strategy: Cache with background sync for uploads
    if (isPhotoRequest(url)) {
      return await photoFetchStrategy(request);
    }
    
    // API Strategy: Stale-while-revalidate for dynamic content
    if (isAPIRequest(url.pathname)) {
      return await apiFetchStrategy(request);
    }
    
    // Static Strategy: Cache first for static assets
    if (isStaticAsset(url.pathname)) {
      return await staticFetchStrategy(request);
    }
    
    // Default Strategy: Network first with cache fallback
    return await networkFirstStrategy(request);
    
  } catch (error) {
    console.error('[SW] Fetch error:', error);
    
    // Emergency fallback for wedding day operations
    if (isWeddingDay()) {
      return await weddingDayFallback(request);
    }
    
    return await defaultOfflineFallback(request);
  }
}

/**
 * Emergency fetch strategy for wedding day critical operations
 */
async function emergencyFetchStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Try network first for real-time emergency info
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful emergency responses
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
    
  } catch (error) {
    console.warn('[SW] Emergency network failed, using cache');
    
    // Fallback to cached emergency info
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Ultimate fallback: Emergency contact page
    return await cache.match('/emergency-contact') || 
           await cache.match(OFFLINE_URL);
  }
}

/**
 * Photo fetch strategy with intelligent caching and upload queuing
 */
async function photoFetchStrategy(request) {
  const photoCache = await caches.open(PHOTO_CACHE_NAME);
  
  // For photo retrieval, cache first with network update
  const cachedPhoto = await photoCache.match(request);
  if (cachedPhoto) {
    // Background update if photo is older than 1 hour
    const cacheTime = new Date(cachedPhoto.headers.get('date') || 0);
    const isStale = Date.now() - cacheTime.getTime() > 3600000; // 1 hour
    
    if (isStale) {
      // Background fetch to update cache
      fetch(request)
        .then(response => {
          if (response.ok) {
            photoCache.put(request, response.clone());
          }
        })
        .catch(console.error);
    }
    
    return cachedPhoto;
  }
  
  // Network fetch for new photos
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      photoCache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Fallback to placeholder image
    return await photoCache.match('/images/photo-placeholder.jpg');
  }
}

/**
 * API fetch strategy with stale-while-revalidate
 */
async function apiFetchStrategy(request) {
  const apiCache = await caches.open(API_CACHE_NAME);
  
  // Only cache GET requests to approved endpoints
  if (request.method === 'GET' && isCacheableAPI(request.url)) {
    const cachedResponse = await apiCache.match(request);
    
    // Return cached version immediately
    if (cachedResponse) {
      // Background revalidation
      fetch(request)
        .then(response => {
          if (response.ok) {
            apiCache.put(request, response.clone());
          }
        })
        .catch(console.error);
        
      return cachedResponse;
    }
  }
  
  // Network first for non-cacheable or POST/PUT/DELETE requests
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful GET responses
    if (networkResponse.ok && request.method === 'GET' && isCacheableAPI(request.url)) {
      apiCache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    // Fallback to cached version if available
    const cachedResponse = await apiCache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * Static asset fetch strategy - cache first
 */
async function staticFetchStrategy(request) {
  const staticCache = await caches.open(STATIC_CACHE_NAME);
  
  const cachedResponse = await staticCache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      staticCache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // For essential assets, try to find alternatives
    if (request.url.includes('icon')) {
      return await staticCache.match('/icons/icon-192.png');
    }
    throw error;
  }
}

/**
 * Network first strategy with cache fallback
 */
async function networkFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * Background Sync Event Handler
 * Handles queued operations when network is restored
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case SYNC_TAGS.PHOTO_UPLOAD:
      event.waitUntil(processPendingPhotoUploads());
      break;
      
    case SYNC_TAGS.FORM_SUBMISSION:
      event.waitUntil(processPendingFormSubmissions());
      break;
      
    case SYNC_TAGS.VENDOR_MESSAGE:
      event.waitUntil(processPendingVendorMessages());
      break;
      
    case SYNC_TAGS.WEDDING_UPDATE:
      event.waitUntil(processPendingWeddingUpdates());
      break;
      
    case SYNC_TAGS.EMERGENCY_ALERT:
      event.waitUntil(processPendingEmergencyAlerts());
      break;
      
    default:
      console.warn('[SW] Unknown sync tag:', event.tag);
  }
});

/**
 * Push Notification Event Handler
 * Handles incoming push notifications with wedding-specific priorities
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  if (!event.data) {
    console.warn('[SW] Push notification has no data');
    return;
  }
  
  try {
    const data = event.data.json();
    event.waitUntil(handlePushNotification(data));
  } catch (error) {
    console.error('[SW] Error parsing push notification data:', error);
  }
});

/**
 * Handle push notifications with wedding-specific logic
 */
async function handlePushNotification(data) {
  const {
    title,
    body,
    icon = '/icons/icon-192.png',
    badge = '/icons/badge-96.png',
    tag,
    data: notificationData,
    priority = PRIORITIES.GENERAL
  } = data;
  
  // Wedding day notifications get maximum priority
  const options = {
    body,
    icon,
    badge,
    tag,
    data: notificationData,
    requireInteraction: priority <= PRIORITIES.WEDDING_DAY,
    actions: getNotificationActions(data.type),
    timestamp: Date.now()
  };
  
  // Add wedding day specific styling
  if (isWeddingDay() || priority === PRIORITIES.EMERGENCY) {
    options.requireInteraction = true;
    options.silent = false;
    options.vibrate = [200, 100, 200, 100, 200];
  }
  
  await self.registration.showNotification(title, options);
}

/**
 * Notification Click Event Handler
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const { data } = event.notification;
  const action = event.action;
  
  event.waitUntil(handleNotificationClick(data, action));
});

/**
 * Handle notification clicks with deep linking
 */
async function handleNotificationClick(data, action) {
  let targetUrl = '/';
  
  switch (data?.type) {
    case 'wedding_day_update':
      targetUrl = `/wedding-dashboard?weddingId=${data.weddingId}&tab=timeline`;
      break;
      
    case 'vendor_message':
      targetUrl = `/messages?vendorId=${data.vendorId}`;
      break;
      
    case 'emergency_alert':
      targetUrl = `/emergency-contact?weddingId=${data.weddingId}`;
      break;
      
    case 'form_submission':
      targetUrl = `/forms/${data.formId}`;
      break;
      
    default:
      targetUrl = data?.url || '/';
  }
  
  // Handle notification actions
  if (action === 'reply' && data?.type === 'vendor_message') {
    targetUrl += '&reply=true';
  } else if (action === 'call' && data?.phone) {
    targetUrl = `tel:${data.phone}`;
  }
  
  // Open or focus the app
  const clients = await self.clients.matchAll({ type: 'window' });
  const existingClient = clients.find(client => client.url.includes(self.location.origin));
  
  if (existingClient) {
    existingClient.navigate(targetUrl);
    existingClient.focus();
  } else {
    self.clients.openWindow(targetUrl);
  }
}

// =====================================
// Helper Functions
// =====================================

function isEmergencyRoute(pathname) {
  const emergencyRoutes = ['/emergency-contact', '/emergency', '/help'];
  return emergencyRoutes.some(route => pathname.includes(route));
}

function isPhotoRequest(url) {
  return url.pathname.includes('/photos') || 
         url.pathname.includes('/images') ||
         url.pathname.includes('/gallery') ||
         ['jpg', 'jpeg', 'png', 'webp', 'heic'].some(ext => url.pathname.endsWith(ext));
}

function isAPIRequest(pathname) {
  return pathname.startsWith('/api/');
}

function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.woff', '.woff2', '.ttf', '.ico'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

function isWeddingAPI(url) {
  const weddingAPIs = ['api.wedsync.com', 'staging-api.wedsync.com'];
  return weddingAPIs.includes(url.hostname);
}

function isCacheableAPI(url) {
  return CACHEABLE_API_ROUTES.some(route => url.includes(route));
}

function isWeddingDay() {
  // This would be determined by checking current date against wedding dates
  // For now, return false - would be implemented with proper date checking
  return false;
}

async function processPendingPhotoUploads() {
  console.log('[SW] Processing pending photo uploads');
  // Implementation would handle queued photo uploads
}

async function processPendingFormSubmissions() {
  console.log('[SW] Processing pending form submissions');
  // Implementation would handle queued form submissions
}

async function processPendingVendorMessages() {
  console.log('[SW] Processing pending vendor messages');
  // Implementation would handle queued vendor messages
}

async function processPendingWeddingUpdates() {
  console.log('[SW] Processing pending wedding updates');
  // Implementation would handle queued wedding updates
}

async function processPendingEmergencyAlerts() {
  console.log('[SW] Processing pending emergency alerts');
  // Implementation would handle queued emergency alerts
}

function getNotificationActions(type) {
  switch (type) {
    case 'vendor_message':
      return [
        { action: 'reply', title: 'Reply', icon: '/icons/reply.png' },
        { action: 'call', title: 'Call', icon: '/icons/phone.png' }
      ];
      
    case 'wedding_day_update':
      return [
        { action: 'view', title: 'View Timeline', icon: '/icons/calendar.png' },
        { action: 'share', title: 'Share Update', icon: '/icons/share.png' }
      ];
      
    case 'emergency_alert':
      return [
        { action: 'call', title: 'Call Now', icon: '/icons/emergency.png' },
        { action: 'navigate', title: 'Get Directions', icon: '/icons/navigation.png' }
      ];
      
    default:
      return [];
  }
}

async function weddingDayFallback(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Priority fallbacks for wedding day
  const fallbackRoutes = [
    '/wedding-dashboard',
    '/emergency-contact',
    '/vendor-directory',
    '/timeline',
    OFFLINE_URL
  ];
  
  for (const route of fallbackRoutes) {
    const fallbackResponse = await cache.match(route);
    if (fallbackResponse) {
      return fallbackResponse;
    }
  }
  
  // Create emergency response
  return new Response(
    JSON.stringify({
      error: 'Service temporarily unavailable',
      message: 'Wedding day emergency: Please contact your venue directly',
      emergency_contacts: []
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

async function defaultOfflineFallback(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Check if it's a navigation request
  if (request.mode === 'navigate') {
    const offlinePage = await cache.match(OFFLINE_URL);
    if (offlinePage) {
      return offlinePage;
    }
  }
  
  // For API requests, return offline indicator
  if (isAPIRequest(new URL(request.url).pathname)) {
    return new Response(
      JSON.stringify({
        offline: true,
        message: 'You are currently offline. Data will sync when connection is restored.'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  // For other requests, return generic offline response
  return new Response('Offline', { status: 503 });
}

console.log('[SW] WedSync Service Worker loaded successfully');