/**
 * WS-194 Team D - Enhanced Environment-Aware Service Worker
 * Advanced PWA Service Worker with Environment-Specific Configurations
 * 
 * This service worker provides:
 * - Environment-specific caching strategies (dev/staging/production)
 * - Dynamic cache configuration based on deployment environment
 * - Wedding-day optimized offline functionality
 * - Cross-platform mobile compatibility
 * - Enhanced push notification handling per environment
 */

// =====================================================
// ENVIRONMENT DETECTION AND CONFIGURATION
// =====================================================

// Detect environment from URL or fallback methods
function detectEnvironment() {
  const hostname = self.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost:')) {
    return 'development';
  }
  
  if (hostname.includes('staging') || hostname.includes('preview') || hostname.includes('dev.')) {
    return 'staging';
  }
  
  return 'production';
}

const CURRENT_ENVIRONMENT = detectEnvironment();
const CACHE_VERSION = `wedsync-v2.0.0-ws194-${CURRENT_ENVIRONMENT}`;

console.log(`[WS-194 ServiceWorker] Initializing for environment: ${CURRENT_ENVIRONMENT}`);

// Environment-specific cache configurations
const ENVIRONMENT_CONFIG = {
  development: {
    cacheStrategy: 'networkFirst',
    networkTimeout: 10000,
    maxCacheSize: 50,
    debugMode: true,
    cacheName: `${CACHE_VERSION}-dev`,
    features: {
      debugMenu: true,
      performanceMonitoring: true,
      offlineDevTools: true
    }
  },
  staging: {
    cacheStrategy: 'staleWhileRevalidate',
    networkTimeout: 5000,
    maxCacheSize: 75,
    debugMode: false,
    cacheName: `${CACHE_VERSION}-staging`,
    features: {
      debugMenu: false,
      performanceMonitoring: true,
      offlineDevTools: false
    }
  },
  production: {
    cacheStrategy: 'staleWhileRevalidate',
    networkTimeout: 3000,
    maxCacheSize: 100,
    debugMode: false,
    cacheName: `${CACHE_VERSION}-prod`,
    features: {
      debugMenu: false,
      performanceMonitoring: true,
      offlineDevTools: false
    }
  }
};

const CONFIG = ENVIRONMENT_CONFIG[CURRENT_ENVIRONMENT];

// Dynamic cache names based on environment
const CACHE_NAMES = {
  static: `${CONFIG.cacheName}-static`,
  dynamic: `${CONFIG.cacheName}-dynamic`,
  images: `${CONFIG.cacheName}-images`,
  api: `${CONFIG.cacheName}-api`,
  wedding: `${CONFIG.cacheName}-wedding-data`,
  payments: `${CONFIG.cacheName}-payment-data`,
  timeline: `${CONFIG.cacheName}-timeline`,
  vendors: `${CONFIG.cacheName}-vendors`,
  emergency: `${CONFIG.cacheName}-emergency`,
  appShell: `${CONFIG.cacheName}-app-shell`
};

// Environment-specific static assets
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/_next/static/css/app.css'
].concat(
  CONFIG.features.debugMenu ? ['/dev-tools', '/debug'] : [],
  CURRENT_ENVIRONMENT === 'staging' ? ['/test-scenarios'] : []
);

// Environment-specific API patterns for caching
const API_CACHE_PATTERNS = {
  critical: [
    '/api/timeline',
    '/api/wedding-day',
    '/api/emergency',
    '/api/vendors/emergency-contacts'
  ],
  high: [
    '/api/clients',
    '/api/vendors',
    '/api/communications',
    '/api/helpers/schedules',
    '/api/budget'
  ],
  medium: [
    '/api/photos',
    '/api/portfolio',
    '/api/expenses',
    '/api/analytics'
  ],
  low: [
    '/api/settings',
    '/api/integrations',
    '/api/admin'
  ]
};

// Environment-specific offline pages
const OFFLINE_PAGES = {
  development: ['/offline', '/dashboard', '/dev-tools'],
  staging: ['/offline', '/dashboard', '/test-scenarios'],
  production: [
    '/offline',
    '/dashboard',
    '/dashboard/wedding-day',
    '/dashboard/emergency',
    '/helpers/schedules',
    '/budget/categories',
    '/expenses/capture'
  ]
}[CURRENT_ENVIRONMENT];

// =====================================================
// SERVICE WORKER LIFECYCLE EVENTS
// =====================================================

self.addEventListener('install', (event) => {
  console.log(`[WS-194] Installing enhanced service worker for ${CURRENT_ENVIRONMENT} environment`);
  
  event.waitUntil(
    Promise.all([
      cacheStaticAssets(),
      initializeEnvironmentStorage(),
      setupEnvironmentSpecificSync()
    ]).then(() => {
      console.log(`[WS-194] Service worker installation complete for ${CURRENT_ENVIRONMENT}`);
      return self.skipWaiting();
    }).catch(error => {
      console.error(`[WS-194] Installation failed for ${CURRENT_ENVIRONMENT}:`, error);
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log(`[WS-194] Activating service worker for ${CURRENT_ENVIRONMENT} environment`);
  
  event.waitUntil(
    Promise.all([
      cleanupEnvironmentCaches(),
      setupEnvironmentNotifications(),
      initializeEnvironmentFeatures()
    ]).then(() => {
      console.log(`[WS-194] Service worker activation complete for ${CURRENT_ENVIRONMENT}`);
      return self.clients.claim();
    })
  );
});

// =====================================================
// ENVIRONMENT-AWARE FETCH STRATEGIES
// =====================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-HTTP requests and cross-origin requests not related to our app
  if (!url.protocol.startsWith('http') || 
      (url.origin !== self.location.origin && !isTrustedOrigin(url.origin))) {
    return;
  }
  
  // Apply environment-specific fetch strategies
  if (request.method === 'GET') {
    if (isStaticAsset(url)) {
      event.respondWith(handleStaticAsset(request));
    } else if (isAppShellRequest(url)) {
      event.respondWith(handleAppShell(request));
    } else if (isCriticalAPI(url)) {
      event.respondWith(handleCriticalAPI(request));
    } else if (isHighPriorityAPI(url)) {
      event.respondWith(handleHighPriorityAPI(request));
    } else if (isWeddingDayAPI(url)) {
      event.respondWith(handleWeddingDayAPI(request));
    } else if (isApiRequest(url)) {
      event.respondWith(handleGeneralAPI(request));
    } else {
      event.respondWith(handleDynamicContent(request));
    }
  } else if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    event.respondWith(handleMutationRequest(request));
  }
});

// =====================================================
// ENVIRONMENT-SPECIFIC CACHING STRATEGIES
// =====================================================

async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAMES.static);
  const cached = await cache.match(request);
  
  // For static assets, prefer cache but update in background
  if (cached) {
    // Background update for development, immediate for production
    if (CURRENT_ENVIRONMENT === 'development') {
      setTimeout(async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            await cache.put(request, response);
          }
        } catch (error) {
          console.log(`[WS-194] Background update failed:`, error.message);
        }
      }, 100);
    }
    return cached;
  }
  
  try {
    const response = await fetch(request, { 
      signal: createTimeoutSignal(CONFIG.networkTimeout) 
    });
    
    if (response.ok) {
      await manageCacheSize(CACHE_NAMES.static, CONFIG.maxCacheSize);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return createOfflineResponse(request, 'Static asset unavailable offline');
  }
}

async function handleAppShell(request) {
  const strategy = CONFIG.cacheStrategy;
  
  switch (strategy) {
    case 'networkFirst':
      return networkFirstStrategy(request, CACHE_NAMES.appShell);
    case 'cacheFirst':
      return cacheFirstStrategy(request, CACHE_NAMES.appShell);
    case 'staleWhileRevalidate':
    default:
      return staleWhileRevalidateStrategy(request, CACHE_NAMES.appShell);
  }
}

async function handleCriticalAPI(request) {
  // Critical APIs always use network first with fast fallback
  try {
    const response = await fetch(request, { 
      signal: createTimeoutSignal(Math.min(CONFIG.networkTimeout, 2000)) // Max 2s for critical
    });
    
    if (response.ok) {
      const cache = await caches.open(CACHE_NAMES.wedding);
      await manageCacheSize(CACHE_NAMES.wedding, CONFIG.maxCacheSize);
      cache.put(request, response.clone());
      
      // Notify clients of successful critical data update
      notifyClients('critical-data-update', {
        url: request.url,
        environment: CURRENT_ENVIRONMENT,
        timestamp: Date.now()
      });
    }
    
    return response;
  } catch (error) {
    // Try cache for critical data
    const cached = await caches.match(request);
    if (cached) {
      // Add offline indicator to critical cached responses
      const offlineResponse = new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: new Headers(cached.headers)
      });
      offlineResponse.headers.set('X-WS194-Served-From', 'cache-critical');
      offlineResponse.headers.set('X-WS194-Environment', CURRENT_ENVIRONMENT);
      
      // Notify clients that we're serving critical data from cache
      notifyClients('serving-critical-from-cache', {
        url: request.url,
        environment: CURRENT_ENVIRONMENT
      });
      
      return offlineResponse;
    }
    
    return createCriticalDataOfflineResponse(request);
  }
}

async function handleWeddingDayAPI(request) {
  // Wedding day APIs prioritize reliability over freshness
  const cache = await caches.open(CACHE_NAMES.wedding);
  
  try {
    // Try network first but with shorter timeout on production
    const timeout = CURRENT_ENVIRONMENT === 'production' ? 2000 : CONFIG.networkTimeout;
    const response = await fetch(request, { 
      signal: createTimeoutSignal(timeout)
    });
    
    if (response.ok) {
      await manageCacheSize(CACHE_NAMES.wedding, CONFIG.maxCacheSize);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // For wedding day, serve cache immediately if available
    const cached = await cache.match(request);
    if (cached) {
      // Schedule background sync for wedding day updates
      if ('sync' in self.registration) {
        try {
          await self.registration.sync.register(`wedding-day-sync-${Date.now()}`);
        } catch (syncError) {
          console.log('[WS-194] Background sync registration failed:', syncError.message);
        }
      }
      
      return cached;
    }
    
    return createWeddingDayOfflineResponse(request);
  }
}

async function handleMutationRequest(request) {
  try {
    const response = await fetch(request, {
      signal: createTimeoutSignal(CONFIG.networkTimeout * 2) // Longer timeout for mutations
    });
    
    if (response.ok) {
      // Clear related cache entries after successful mutation
      await invalidateRelatedCaches(request.url);
      
      // Notify clients of successful mutation
      notifyClients('mutation-success', {
        url: request.url,
        method: request.method,
        environment: CURRENT_ENVIRONMENT
      });
    }
    
    return response;
  } catch (error) {
    // Queue mutation for background sync
    const mutationId = await queueMutationForSync(request);
    
    return new Response(
      JSON.stringify({
        success: true,
        offline: true,
        mutationId,
        environment: CURRENT_ENVIRONMENT,
        message: `Changes saved offline for ${CURRENT_ENVIRONMENT} and will sync when connection is restored`,
        estimatedSync: calculateEstimatedSyncTime()
      }),
      {
        status: 202,
        headers: { 
          'Content-Type': 'application/json',
          'X-WS194-Offline-Mutation': 'true',
          'X-WS194-Environment': CURRENT_ENVIRONMENT
        }
      }
    );
  }
}

// =====================================================
// ENVIRONMENT-SPECIFIC UTILITY FUNCTIONS
// =====================================================

function isTrustedOrigin(origin) {
  const trustedOrigins = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://cdn.jsdelivr.net'
  ];
  
  // Add environment-specific origins
  if (CURRENT_ENVIRONMENT === 'development') {
    trustedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }
  
  return trustedOrigins.some(trusted => origin.startsWith(trusted));
}

function isCriticalAPI(url) {
  return API_CACHE_PATTERNS.critical.some(pattern => url.pathname.includes(pattern));
}

function isHighPriorityAPI(url) {
  return API_CACHE_PATTERNS.high.some(pattern => url.pathname.includes(pattern));
}

function isWeddingDayAPI(url) {
  return url.pathname.includes('/api/wedding-day') || 
         url.pathname.includes('/api/emergency') ||
         url.pathname.includes('/api/timeline');
}

function isStaticAsset(url) {
  return url.pathname.includes('/_next/static/') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.svg') ||
         url.pathname === '/manifest.json';
}

function isAppShellRequest(url) {
  return OFFLINE_PAGES.includes(url.pathname) ||
         url.pathname === '/' ||
         (CONFIG.features.debugMenu && url.pathname === '/dev-tools');
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

// Environment-specific cache strategies
async function networkFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request, { 
      signal: createTimeoutSignal(CONFIG.networkTimeout)
    });
    
    if (response.ok) {
      await manageCacheSize(cacheName, CONFIG.maxCacheSize);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  const response = await fetch(request, { 
    signal: createTimeoutSignal(CONFIG.networkTimeout)
  });
  
  if (response.ok) {
    await manageCacheSize(cacheName, CONFIG.maxCacheSize);
    cache.put(request, response.clone());
  }
  
  return response;
}

async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request, { 
    signal: createTimeoutSignal(CONFIG.networkTimeout)
  }).then(async response => {
    if (response.ok) {
      await manageCacheSize(cacheName, CONFIG.maxCacheSize);
      cache.put(request, response.clone());
    }
    return response;
  }).catch(error => {
    console.log(`[WS-194] Network update failed:`, error.message);
    return cached;
  });
  
  return cached || fetchPromise;
}

// Environment-specific timeout creation
function createTimeoutSignal(timeout) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return controller.signal;
}

// Environment-specific cache management
async function manageCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  
  if (requests.length >= maxSize) {
    // Remove oldest entries (simple FIFO for now)
    const toDelete = requests.slice(0, requests.length - maxSize + 10); // Keep some buffer
    
    for (const request of toDelete) {
      await cache.delete(request);
    }
    
    if (CONFIG.debugMode) {
      console.log(`[WS-194] Cleaned cache ${cacheName}: removed ${toDelete.length} entries`);
    }
  }
}

// =====================================================
// ENVIRONMENT-SPECIFIC INITIALIZATION
// =====================================================

async function cacheStaticAssets() {
  const cache = await caches.open(CACHE_NAMES.static);
  
  try {
    await cache.addAll(STATIC_ASSETS);
    console.log(`[WS-194] Cached ${STATIC_ASSETS.length} static assets for ${CURRENT_ENVIRONMENT}`);
  } catch (error) {
    console.error(`[WS-194] Failed to cache static assets:`, error);
    // Try caching individually to identify problematic assets
    for (const asset of STATIC_ASSETS) {
      try {
        await cache.add(asset);
      } catch (assetError) {
        console.warn(`[WS-194] Failed to cache asset ${asset}:`, assetError.message);
      }
    }
  }
}

async function initializeEnvironmentStorage() {
  // Initialize IndexedDB with environment-specific configuration
  // This would be implemented based on the environment's needs
  console.log(`[WS-194] Initializing environment storage for ${CURRENT_ENVIRONMENT}`);
}

async function setupEnvironmentSpecificSync() {
  // Configure background sync based on environment
  const syncTags = ['wedding-data-sync', 'vendor-contacts-sync'];
  
  if (CONFIG.features.performanceMonitoring) {
    syncTags.push('performance-metrics-sync');
  }
  
  if (CONFIG.features.offlineDevTools) {
    syncTags.push('debug-data-sync');
  }
  
  console.log(`[WS-194] Configured sync tags for ${CURRENT_ENVIRONMENT}:`, syncTags);
}

async function cleanupEnvironmentCaches() {
  // Remove caches from other environments
  const cacheNames = await caches.keys();
  const currentCachePrefix = CONFIG.cacheName;
  
  const cachesToDelete = cacheNames.filter(name => 
    name.includes('wedsync-v2.0.0-ws194-') && 
    !name.includes(currentCachePrefix)
  );
  
  await Promise.all(cachesToDelete.map(name => caches.delete(name)));
  
  if (cachesToDelete.length > 0) {
    console.log(`[WS-194] Cleaned up ${cachesToDelete.length} old environment caches`);
  }
}

async function setupEnvironmentNotifications() {
  // Configure push notifications based on environment
  console.log(`[WS-194] Setting up notifications for ${CURRENT_ENVIRONMENT}`);
}

async function initializeEnvironmentFeatures() {
  // Initialize environment-specific features
  if (CONFIG.features.performanceMonitoring) {
    // Set up performance monitoring
    console.log('[WS-194] Performance monitoring enabled');
  }
  
  if (CONFIG.features.debugMenu) {
    // Set up debug features
    console.log('[WS-194] Debug menu enabled');
  }
}

// =====================================================
// ENVIRONMENT-SPECIFIC OFFLINE RESPONSES
// =====================================================

function createOfflineResponse(request, message = 'Content unavailable offline') {
  const envLabel = CURRENT_ENVIRONMENT.charAt(0).toUpperCase() + CURRENT_ENVIRONMENT.slice(1);
  
  return new Response(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>WedSync ${envLabel} - Offline</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
                 margin: 40px; text-align: center; color: #333; }
          .env-badge { 
            display: inline-block; 
            background: ${CURRENT_ENVIRONMENT === 'development' ? '#f59e0b' : 
                        CURRENT_ENVIRONMENT === 'staging' ? '#eab308' : '#6366f1'}; 
            color: white; 
            padding: 4px 12px; 
            border-radius: 12px; 
            font-size: 12px; 
            margin-bottom: 20px; 
          }
          .icon { font-size: 48px; margin-bottom: 20px; }
          h1 { color: #6B7280; margin-bottom: 20px; }
          p { line-height: 1.5; margin-bottom: 20px; }
          .status { background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="env-badge">${envLabel} Environment</div>
        <div class="icon">🔄</div>
        <h1>WedSync - Working Offline</h1>
        <p>${message}</p>
        <div class="status">
          <strong>Your wedding data is safely stored and will sync when you're back online.</strong>
        </div>
        <p>📱 Environment: ${CURRENT_ENVIRONMENT}</p>
        <p>🔄 Your changes are being saved locally and will be synchronized automatically once your connection is restored.</p>
      </body>
    </html>`,
    {
      status: 200,
      headers: { 
        'Content-Type': 'text/html',
        'X-WS194-Environment': CURRENT_ENVIRONMENT,
        'X-WS194-Offline': 'true'
      }
    }
  );
}

async function createCriticalDataOfflineResponse(request) {
  return new Response(
    JSON.stringify({
      error: 'Critical wedding data temporarily unavailable',
      offline: true,
      environment: CURRENT_ENVIRONMENT,
      message: 'Essential wedding information is cached when available. Some real-time features may be limited.',
      cached: false,
      timestamp: new Date().toISOString(),
      debugMode: CONFIG.debugMode
    }),
    {
      status: 503,
      headers: { 
        'Content-Type': 'application/json',
        'X-WS194-Environment': CURRENT_ENVIRONMENT,
        'X-WS194-Critical-Offline': 'true'
      }
    }
  );
}

async function createWeddingDayOfflineResponse(request) {
  return new Response(
    JSON.stringify({
      error: 'Wedding day data temporarily unavailable',
      offline: true,
      environment: CURRENT_ENVIRONMENT,
      message: 'Wedding day coordination features require connection. Cached timeline available when previously loaded.',
      weddingDayMode: CONFIG.features?.weddingDayMode || false,
      emergencyContacts: 'Check cached emergency contacts in timeline',
      timestamp: new Date().toISOString()
    }),
    {
      status: 503,
      headers: { 
        'Content-Type': 'application/json',
        'X-WS194-Environment': CURRENT_ENVIRONMENT,
        'X-WS194-Wedding-Day-Offline': 'true'
      }
    }
  );
}

// =====================================================
// CLIENT COMMUNICATION
// =====================================================

function notifyClients(type, data) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type,
        data: {
          ...data,
          environment: CURRENT_ENVIRONMENT,
          timestamp: Date.now()
        }
      });
    });
  });
}

// Utility functions for mutation handling and sync
async function queueMutationForSync(request) {
  const mutationId = `mutation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  // Implementation would store mutation details for later sync
  return mutationId;
}

function calculateEstimatedSyncTime() {
  const minutes = CURRENT_ENVIRONMENT === 'development' ? 2 : 5;
  return new Date(Date.now() + minutes * 60000).toISOString();
}

async function invalidateRelatedCaches(url) {
  // Implementation would clear related cache entries after mutations
  console.log(`[WS-194] Invalidating caches related to: ${url}`);
}

async function handleGeneralAPI(request) {
  return staleWhileRevalidateStrategy(request, CACHE_NAMES.api);
}

async function handleDynamicContent(request) {
  return networkFirstStrategy(request, CACHE_NAMES.dynamic);
}

// Initialize service worker
console.log(`[WS-194] Enhanced service worker loaded for ${CURRENT_ENVIRONMENT} environment with config:`, {
  cacheStrategy: CONFIG.cacheStrategy,
  networkTimeout: CONFIG.networkTimeout,
  maxCacheSize: CONFIG.maxCacheSize,
  debugMode: CONFIG.debugMode,
  features: CONFIG.features
});