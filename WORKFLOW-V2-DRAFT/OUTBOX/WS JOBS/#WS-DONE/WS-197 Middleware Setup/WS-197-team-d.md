# WS-197: Middleware Setup - Team D Mobile & PWA Architect

## ROLE: Mobile & PWA Middleware Architect
You are Team D, the Mobile & PWA Middleware Architect for WedSync, responsible for building mobile-optimized middleware infrastructure that handles offline functionality, service worker integration, push notifications, mobile-specific caching strategies, and PWA application lifecycle management. Your focus is on creating middleware that provides seamless mobile experiences for couples, suppliers, and coordinators managing weddings on mobile devices.

## FEATURE CONTEXT: Middleware Setup
Building a comprehensive middleware infrastructure for WedSync's wedding coordination platform with special emphasis on mobile and PWA capabilities. This middleware must handle offline-first design, intelligent caching, background synchronization, push notifications, mobile performance optimization, and seamless online/offline transitions for wedding management workflows.

## YOUR IMPLEMENTATION FOCUS
Your Team D implementation must include:

1. **Mobile-Optimized Middleware**
   - Device detection and adaptive response formatting
   - Mobile-specific request/response compression
   - Touch-friendly error handling and user feedback
   - Battery-conscious background processing

2. **PWA Service Worker Integration**
   - Intelligent caching strategies for wedding data
   - Background synchronization for offline actions
   - Push notification delivery and management
   - App update mechanisms and cache invalidation

3. **Offline-First Architecture**
   - Request queuing for offline scenarios
   - Data synchronization conflict resolution
   - Local storage management and encryption
   - Progressive data loading and prefetching

4. **Mobile Performance Optimization**
   - Adaptive resource loading based on connection quality
   - Image optimization and responsive delivery
   - Critical resource prioritization
   - Battery and memory usage optimization

## IMPLEMENTATION REQUIREMENTS

### 1. Mobile-Optimized Middleware Stack
```typescript
// /wedsync/src/middleware/mobile-middleware.ts
import { NextRequest } from 'next/server';
import { UserAgent } from 'next/server';
import { Redis } from 'ioredis';

interface MobileContext {
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'tv';
  platform: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
  browserEngine: 'webkit' | 'blink' | 'gecko' | 'edge' | 'unknown';
  supportsPWA: boolean;
  supportsWebP: boolean;
  networkQuality: 'fast' | 'medium' | 'slow' | 'offline';
  batteryLevel?: number;
  isLowPowerMode?: boolean;
  screenSize: {
    width: number;
    height: number;
    density: number;
  };
  capabilities: {
    serviceWorker: boolean;
    push: boolean;
    notifications: boolean;
    backgroundSync: boolean;
    camera: boolean;
    location: boolean;
  };
}

interface MobileOptimizationConfig {
  imageOptimization: {
    formats: string[];
    qualityByConnection: Record<string, number>;
    maxSizeByDevice: Record<string, number>;
  };
  caching: {
    ttlByResourceType: Record<string, number>;
    maxCacheSizeByDevice: Record<string, number>;
    compressionLevel: number;
  };
  performance: {
    maxConcurrentRequests: number;
    requestTimeoutByConnection: Record<string, number>;
    prefetchThreshold: number;
  };
}

export class MobileMiddleware {
  private redis: Redis;
  private optimizationConfig: MobileOptimizationConfig;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
    this.initializeOptimizationConfig();
  }

  private initializeOptimizationConfig(): void {
    this.optimizationConfig = {
      imageOptimization: {
        formats: ['webp', 'avif', 'jpeg', 'png'],
        qualityByConnection: {
          fast: 90,
          medium: 75,
          slow: 60,
          offline: 0
        },
        maxSizeByDevice: {
          mobile: 800,
          tablet: 1200,
          desktop: 1920
        }
      },
      caching: {
        ttlByResourceType: {
          'wedding-data': 300, // 5 minutes
          'supplier-profiles': 1800, // 30 minutes
          'static-assets': 86400, // 24 hours
          'user-preferences': 3600 // 1 hour
        },
        maxCacheSizeByDevice: {
          mobile: 50 * 1024 * 1024, // 50MB
          tablet: 100 * 1024 * 1024, // 100MB
          desktop: 200 * 1024 * 1024 // 200MB
        },
        compressionLevel: 6
      },
      performance: {
        maxConcurrentRequests: 4,
        requestTimeoutByConnection: {
          fast: 10000,
          medium: 20000,
          slow: 30000
        },
        prefetchThreshold: 0.7
      }
    };
  }

  async processRequest(request: NextRequest): Promise<{ context: MobileContext; response?: Response }> {
    const userAgent = request.headers.get('user-agent') || '';
    const clientHints = this.extractClientHints(request);
    
    // Detect mobile context
    const context = await this.detectMobileContext(userAgent, clientHints, request);
    
    // Check if we should serve cached response
    const cacheKey = this.generateCacheKey(request.url, context);
    const cachedResponse = await this.getCachedResponse(cacheKey, context);
    
    if (cachedResponse) {
      return { context, response: cachedResponse };
    }

    // Apply mobile-specific optimizations to the request
    const optimizedRequest = await this.optimizeRequest(request, context);
    
    return { context };
  }

  private async detectMobileContext(userAgent: string, clientHints: any, request: NextRequest): Promise<MobileContext> {
    const ua = new UserAgent(userAgent);
    
    // Device type detection
    const deviceType = this.detectDeviceType(userAgent, clientHints);
    const platform = this.detectPlatform(userAgent);
    const browserEngine = this.detectBrowserEngine(userAgent);
    
    // PWA and capability detection
    const supportsPWA = this.detectPWASupport(userAgent);
    const supportsWebP = request.headers.get('accept')?.includes('image/webp') || false;
    
    // Network quality estimation
    const networkQuality = await this.estimateNetworkQuality(request);
    
    // Screen information from client hints or defaults
    const screenSize = {
      width: clientHints.viewportWidth || this.getDefaultScreenWidth(deviceType),
      height: clientHints.viewportHeight || this.getDefaultScreenHeight(deviceType),
      density: clientHints.devicePixelRatio || 1
    };

    // Capability detection
    const capabilities = {
      serviceWorker: this.detectServiceWorkerSupport(userAgent),
      push: this.detectPushSupport(userAgent),
      notifications: this.detectNotificationSupport(userAgent),
      backgroundSync: this.detectBackgroundSyncSupport(userAgent),
      camera: platform === 'ios' || platform === 'android',
      location: true // Most modern browsers support geolocation
    };

    return {
      deviceType,
      platform,
      browserEngine,
      supportsPWA,
      supportsWebP,
      networkQuality,
      screenSize,
      capabilities
    };
  }

  async optimizeResponse(response: Response, context: MobileContext): Promise<Response> {
    const contentType = response.headers.get('content-type') || '';
    
    // Handle different content types
    if (contentType.includes('application/json')) {
      return await this.optimizeJSONResponse(response, context);
    } else if (contentType.includes('text/html')) {
      return await this.optimizeHTMLResponse(response, context);
    } else if (contentType.includes('image/')) {
      return await this.optimizeImageResponse(response, context);
    }
    
    return response;
  }

  private async optimizeJSONResponse(response: Response, context: MobileContext): Promise<Response> {
    const data = await response.json();
    
    // Apply mobile-specific data optimizations
    let optimizedData = data;
    
    // Reduce data payload for mobile devices
    if (context.deviceType === 'mobile') {
      optimizedData = this.reduceDataPayload(data, context);
    }
    
    // Apply compression based on network quality
    const compressionLevel = this.getCompressionLevel(context.networkQuality);
    
    const optimizedResponse = new Response(JSON.stringify(optimizedData), {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'Content-Type': 'application/json',
        'Content-Encoding': compressionLevel > 0 ? 'gzip' : '',
        'Cache-Control': this.getCacheControl(context),
        'X-Mobile-Optimized': 'true',
        'X-Device-Type': context.deviceType
      }
    });

    return optimizedResponse;
  }

  private reduceDataPayload(data: any, context: MobileContext): any {
    if (Array.isArray(data)) {
      return data.map(item => this.reduceDataPayload(item, context));
    }

    if (typeof data === 'object' && data !== null) {
      const reduced: any = {};

      // Wedding-specific mobile optimizations
      for (const [key, value] of Object.entries(data)) {
        switch (key) {
          case 'supplier_profiles':
            // Reduce supplier profile data for mobile
            reduced[key] = this.reduceMobileSupplierProfiles(value as any[], context);
            break;

          case 'wedding_photos':
            // Optimize photo data for mobile
            reduced[key] = this.reduceMobilePhotoData(value as any[], context);
            break;

          case 'timeline_events':
            // Simplify timeline for mobile view
            reduced[key] = this.reduceMobileTimelineEvents(value as any[], context);
            break;

          case 'budget_items':
            // Focus on key budget information
            reduced[key] = this.reduceMobileBudgetItems(value as any[], context);
            break;

          default:
            // Keep essential fields, remove verbose descriptions on mobile
            if (context.deviceType === 'mobile' && key.includes('description') && typeof value === 'string' && value.length > 100) {
              reduced[key] = value.substring(0, 100) + '...';
            } else {
              reduced[key] = this.reduceDataPayload(value, context);
            }
        }
      }

      return reduced;
    }

    return data;
  }

  private reduceMobileSupplierProfiles(profiles: any[], context: MobileContext): any[] {
    return profiles.map(profile => ({
      id: profile.id,
      name: profile.name,
      category: profile.category,
      rating: profile.rating,
      price_range: profile.price_range,
      primary_image: this.optimizeImageForMobile(profile.primary_image, context),
      location: {
        city: profile.location?.city,
        state: profile.location?.state
      },
      availability_status: profile.availability_status,
      // Remove detailed descriptions, portfolios, and reviews for mobile
      contact: {
        phone: profile.contact?.phone,
        email: profile.contact?.email
      }
    }));
  }

  private reduceMobilePhotoData(photos: any[], context: MobileContext): any[] {
    const maxPhotos = context.deviceType === 'mobile' ? 20 : 50;
    
    return photos.slice(0, maxPhotos).map(photo => ({
      id: photo.id,
      url: this.optimizeImageForMobile(photo.url, context),
      thumbnail: this.optimizeImageForMobile(photo.thumbnail, context, 'thumbnail'),
      alt: photo.alt,
      upload_date: photo.upload_date,
      category: photo.category
      // Remove EXIF data, full resolution URLs, etc. for mobile
    }));
  }

  private optimizeImageForMobile(imageUrl: string, context: MobileContext, variant: 'full' | 'thumbnail' = 'full'): string {
    if (!imageUrl) return '';
    
    const quality = this.optimizationConfig.imageOptimization.qualityByConnection[context.networkQuality];
    const maxSize = variant === 'thumbnail' ? 150 : this.optimizationConfig.imageOptimization.maxSizeByDevice[context.deviceType];
    const format = context.supportsWebP ? 'webp' : 'jpeg';
    
    return `${imageUrl}?format=${format}&quality=${quality}&w=${maxSize}&h=${maxSize}`;
  }
}
```

### 2. PWA Service Worker Middleware
```typescript
// /wedsync/public/sw.js - Service Worker for PWA functionality
const CACHE_NAME = 'wedsync-v1.0.0';
const WEDDING_DATA_CACHE = 'wedding-data-v1.0.0';
const STATIC_CACHE = 'static-assets-v1.0.0';
const IMAGE_CACHE = 'wedding-images-v1.0.0';

// Wedding-specific caching strategies
const CACHING_STRATEGIES = {
  // Critical wedding data - cache first with network fallback
  critical: [
    '/api/weddings/current',
    '/api/timeline/today',
    '/api/suppliers/booked',
    '/api/emergency/contacts'
  ],
  
  // Real-time data - network first with cache fallback
  realtime: [
    '/api/suppliers/*/availability',
    '/api/payments/*/status',
    '/api/notifications/recent',
    '/api/timeline/updates'
  ],
  
  // Static resources - cache first
  static: [
    '/manifest.json',
    '/icons/',
    '/_next/static/',
    '/api/static/categories',
    '/api/static/locations'
  ],
  
  // Images - cache first with size limits
  images: [
    '/api/photos/',
    '/uploads/weddings/',
    '/uploads/suppliers/',
    '/_next/image'
  ]
};

// Background sync tags for wedding operations
const SYNC_TAGS = {
  WEDDING_UPDATE: 'wedding-update-sync',
  SUPPLIER_MESSAGE: 'supplier-message-sync',
  PHOTO_UPLOAD: 'photo-upload-sync',
  TIMELINE_UPDATE: 'timeline-update-sync',
  PAYMENT_SYNC: 'payment-sync',
  OFFLINE_ACTIONS: 'offline-actions-sync'
};

// Service Worker Installation
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      // Pre-cache critical wedding resources
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll([
          '/',
          '/wedding-dashboard',
          '/suppliers',
          '/timeline',
          '/budget',
          '/offline',
          '/manifest.json'
        ]);
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Service Worker Activation
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!cacheName.includes('v1.0.0')) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Claim all clients immediately
      self.clients.claim()
    ])
  );
});

// Fetch event handler with intelligent caching
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle different request types
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
  } else if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else if (isStaticResource(request)) {
    event.respondWith(handleStaticRequest(request));
  } else {
    event.respondWith(handlePageRequest(request));
  }
});

// API request handling with wedding-specific logic
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Determine caching strategy based on endpoint
  if (isCriticalWeddingEndpoint(pathname)) {
    return handleCriticalData(request);
  } else if (isRealtimeEndpoint(pathname)) {
    return handleRealtimeData(request);
  } else if (request.method !== 'GET') {
    return handleMutationRequest(request);
  }
  
  // Default to network-first for API requests
  return networkFirstStrategy(request, WEDDING_DATA_CACHE);
}

// Handle critical wedding data (cache-first)
async function handleCriticalData(request) {
  const cache = await caches.open(WEDDING_DATA_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Return cached version immediately
    const networkPromise = fetchAndCache(request, cache);
    
    // Update cache in background if online
    if (navigator.onLine) {
      networkPromise.catch(() => {}); // Ignore network errors
    }
    
    return cachedResponse;
  }
  
  return fetchAndCache(request, cache);
}

// Handle real-time wedding data (network-first)
async function handleRealtimeData(request) {
  const cache = await caches.open(WEDDING_DATA_CACHE);
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful responses
      await cache.put(request, response.clone());
      return response;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for wedding data
    return createOfflineWeddingResponse(request);
  }
}

// Handle mutation requests (POST, PUT, DELETE)
async function handleMutationRequest(request) {
  if (!navigator.onLine) {
    // Queue for background sync
    await queueOfflineAction(request);
    
    return new Response(
      JSON.stringify({
        success: true,
        offline: true,
        message: 'Action queued for when you\'re back online'
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  try {
    const response = await fetch(request);
    
    // If successful, clear any queued actions for this endpoint
    await clearQueuedActions(request.url);
    
    return response;
  } catch (error) {
    // Queue for retry
    await queueOfflineAction(request);
    
    return new Response(
      JSON.stringify({
        success: false,
        offline: true,
        message: 'Action will retry when connection is restored'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Background Sync for offline actions
self.addEventListener('sync', event => {
  console.log('Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case SYNC_TAGS.WEDDING_UPDATE:
      event.waitUntil(syncWeddingUpdates());
      break;
      
    case SYNC_TAGS.SUPPLIER_MESSAGE:
      event.waitUntil(syncSupplierMessages());
      break;
      
    case SYNC_TAGS.PHOTO_UPLOAD:
      event.waitUntil(syncPhotoUploads());
      break;
      
    case SYNC_TAGS.TIMELINE_UPDATE:
      event.waitUntil(syncTimelineUpdates());
      break;
      
    case SYNC_TAGS.PAYMENT_SYNC:
      event.waitUntil(syncPaymentData());
      break;
      
    case SYNC_TAGS.OFFLINE_ACTIONS:
      event.waitUntil(syncOfflineActions());
      break;
  }
});

// Sync wedding updates when back online
async function syncWeddingUpdates() {
  const db = await openIndexedDB();
  const queuedUpdates = await getQueuedWeddingUpdates(db);
  
  for (const update of queuedUpdates) {
    try {
      const response = await fetch(update.url, {
        method: update.method,
        headers: update.headers,
        body: update.body
      });
      
      if (response.ok) {
        // Remove from queue
        await removeFromQueue(db, update.id);
        
        // Notify the main thread
        await notifyClients({
          type: 'SYNC_SUCCESS',
          data: { updateType: 'wedding', id: update.id }
        });
      }
    } catch (error) {
      console.error('Failed to sync wedding update:', error);
      // Keep in queue for next sync
    }
  }
}

// Push notification handling for wedding updates
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'You have a wedding update',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || 'wedding-update',
    data: data.data || {},
    actions: getNotificationActions(data.type),
    requireInteraction: data.urgent || false,
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'WedSync Update', options)
  );
});

// Handle notification actions
self.addEventListener('notificationclick', event => {
  const { notification, action } = event;
  const data = notification.data || {};
  
  event.notification.close();
  
  event.waitUntil(
    handleNotificationAction(action, data)
  );
});

function getNotificationActions(type) {
  switch (type) {
    case 'supplier_message':
      return [
        { action: 'reply', title: 'Reply', icon: '/icons/reply.png' },
        { action: 'view', title: 'View', icon: '/icons/view.png' }
      ];
      
    case 'timeline_update':
      return [
        { action: 'view', title: 'View Timeline', icon: '/icons/timeline.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss.png' }
      ];
      
    case 'payment_reminder':
      return [
        { action: 'pay_now', title: 'Pay Now', icon: '/icons/payment.png' },
        { action: 'remind_later', title: 'Remind Later', icon: '/icons/later.png' }
      ];
      
    default:
      return [
        { action: 'view', title: 'View', icon: '/icons/view.png' }
      ];
  }
}

async function handleNotificationAction(action, data) {
  const clients = await self.clients.matchAll();
  
  switch (action) {
    case 'reply':
      return openWindow('/messages/' + data.supplierId);
      
    case 'view':
      return openWindow(data.url || '/wedding-dashboard');
      
    case 'pay_now':
      return openWindow('/payments/' + data.paymentId);
      
    case 'remind_later':
      // Schedule another reminder
      return scheduleReminder(data);
      
    default:
      return openWindow('/wedding-dashboard');
  }
}

async function openWindow(url) {
  const clients = await self.clients.matchAll({ type: 'window' });
  
  // Check if window is already open
  for (const client of clients) {
    if (client.url.includes(url)) {
      return client.focus();
    }
  }
  
  // Open new window
  return self.clients.openWindow(url);
}

// Wedding-specific helper functions
function isCriticalWeddingEndpoint(pathname) {
  return CACHING_STRATEGIES.critical.some(pattern => 
    pathname.includes(pattern.replace('*', ''))
  );
}

function isRealtimeEndpoint(pathname) {
  return CACHING_STRATEGIES.realtime.some(pattern => 
    pathname.includes(pattern.replace('*', ''))
  );
}

function createOfflineWeddingResponse(request) {
  const url = new URL(request.url);
  
  // Return appropriate offline responses based on endpoint
  if (url.pathname.includes('/api/timeline')) {
    return new Response(
      JSON.stringify({
        events: [],
        offline: true,
        message: 'Timeline will sync when you\'re back online'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  // Default offline response
  return new Response(
    JSON.stringify({
      offline: true,
      message: 'Data will be available when you\'re back online'
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
```

### 3. Offline-First Data Management
```typescript
// /wedsync/src/middleware/offline-sync.ts
import { openDB, DBSchema } from 'idb';

interface OfflineDB extends DBSchema {
  'queued-actions': {
    key: string;
    value: {
      id: string;
      url: string;
      method: string;
      headers: Record<string, string>;
      body?: string;
      timestamp: number;
      retries: number;
      priority: 'high' | 'medium' | 'low';
      weddingId?: string;
      category: 'wedding' | 'supplier' | 'payment' | 'photo' | 'timeline';
    };
  };
  
  'cached-wedding-data': {
    key: string;
    value: {
      id: string;
      data: any;
      timestamp: number;
      expiresAt: number;
      syncStatus: 'synced' | 'pending' | 'conflict';
      version: number;
    };
  };
  
  'offline-photos': {
    key: string;
    value: {
      id: string;
      file: Blob;
      weddingId: string;
      metadata: {
        name: string;
        size: number;
        type: string;
        category: string;
        uploadedAt: number;
      };
      uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
      progress?: number;
    };
  };
}

export class OfflineSyncManager {
  private db: Promise<any>;

  constructor() {
    this.db = this.initializeDB();
  }

  private async initializeDB() {
    return openDB<OfflineDB>('wedsync-offline', 1, {
      upgrade(db) {
        // Queued actions store
        if (!db.objectStoreNames.contains('queued-actions')) {
          const actionsStore = db.createObjectStore('queued-actions', { keyPath: 'id' });
          actionsStore.createIndex('priority', 'priority');
          actionsStore.createIndex('category', 'category');
          actionsStore.createIndex('timestamp', 'timestamp');
          actionsStore.createIndex('weddingId', 'weddingId');
        }

        // Cached wedding data store
        if (!db.objectStoreNames.contains('cached-wedding-data')) {
          const dataStore = db.createObjectStore('cached-wedding-data', { keyPath: 'id' });
          dataStore.createIndex('timestamp', 'timestamp');
          dataStore.createIndex('expiresAt', 'expiresAt');
          dataStore.createIndex('syncStatus', 'syncStatus');
        }

        // Offline photos store
        if (!db.objectStoreNames.contains('offline-photos')) {
          const photosStore = db.createObjectStore('offline-photos', { keyPath: 'id' });
          photosStore.createIndex('weddingId', 'weddingId');
          photosStore.createIndex('uploadStatus', 'uploadStatus');
          photosStore.createIndex('uploadedAt', 'metadata.uploadedAt');
        }
      }
    });
  }

  async queueAction(action: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
    priority?: 'high' | 'medium' | 'low';
    weddingId?: string;
    category: 'wedding' | 'supplier' | 'payment' | 'photo' | 'timeline';
  }) {
    const db = await this.db;
    const queuedAction = {
      id: crypto.randomUUID(),
      ...action,
      timestamp: Date.now(),
      retries: 0,
      priority: action.priority || 'medium'
    };

    await db.add('queued-actions', queuedAction);
    
    // Register background sync if available
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('offline-actions-sync');
    }

    return queuedAction.id;
  }

  async processQueuedActions(): Promise<{ processed: number; failed: number }> {
    const db = await this.db;
    const queuedActions = await db.getAll('queued-actions');
    
    let processed = 0;
    let failed = 0;

    // Sort by priority and timestamp
    const sortedActions = queuedActions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
    });

    for (const action of sortedActions) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        });

        if (response.ok) {
          // Success - remove from queue
          await db.delete('queued-actions', action.id);
          processed++;
          
          // Handle wedding-specific post-sync actions
          await this.handleSuccessfulSync(action, response);
          
        } else {
          // HTTP error - increment retry count
          action.retries++;
          
          if (action.retries >= 5) {
            // Max retries reached - remove from queue
            await db.delete('queued-actions', action.id);
            failed++;
            await this.handleFailedSync(action, 'max_retries_exceeded');
          } else {
            // Update retry count
            await db.put('queued-actions', action);
          }
        }
        
      } catch (error) {
        // Network error - increment retry count
        action.retries++;
        
        if (action.retries >= 5) {
          await db.delete('queued-actions', action.id);
          failed++;
          await this.handleFailedSync(action, error.message);
        } else {
          await db.put('queued-actions', action);
        }
      }
    }

    return { processed, failed };
  }

  private async handleSuccessfulSync(action: any, response: Response): Promise<void> {
    switch (action.category) {
      case 'wedding':
        await this.updateWeddingDataCache(action, response);
        break;
        
      case 'supplier':
        await this.updateSupplierDataCache(action, response);
        break;
        
      case 'photo':
        await this.updatePhotoUploadStatus(action, 'uploaded');
        break;
        
      case 'timeline':
        await this.syncTimelineData(action, response);
        break;
    }

    // Notify main thread of successful sync
    this.broadcastSyncUpdate({
      type: 'SYNC_SUCCESS',
      category: action.category,
      actionId: action.id
    });
  }

  async storePhotoOffline(file: File, weddingId: string, category: string): Promise<string> {
    const db = await this.db;
    const photoId = crypto.randomUUID();
    
    const offlinePhoto = {
      id: photoId,
      file,
      weddingId,
      metadata: {
        name: file.name,
        size: file.size,
        type: file.type,
        category,
        uploadedAt: Date.now()
      },
      uploadStatus: 'pending' as const
    };

    await db.add('offline-photos', offlinePhoto);
    
    // Queue upload action
    await this.queuePhotoUpload(photoId, file, weddingId, category);
    
    return photoId;
  }

  private async queuePhotoUpload(photoId: string, file: File, weddingId: string, category: string): Promise<void> {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('weddingId', weddingId);
    formData.append('category', category);
    formData.append('photoId', photoId);

    await this.queueAction({
      url: '/api/photos/upload',
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: JSON.stringify({
        photoId,
        weddingId,
        category,
        filename: file.name,
        size: file.size
      }),
      priority: 'high',
      weddingId,
      category: 'photo'
    });
  }

  private broadcastSyncUpdate(update: any): void {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('wedsync-sync');
      channel.postMessage(update);
      channel.close();
    }
  }
}
```

## IMPLEMENTATION EVIDENCE REQUIRED

### 1. Mobile Optimization Verification
- [ ] Demonstrate adaptive response formatting based on device type
- [ ] Show image optimization and compression working across different connection speeds
- [ ] Verify mobile-specific caching strategies and storage limits
- [ ] Test battery-conscious background processing
- [ ] Evidence of touch-friendly error handling
- [ ] Document performance metrics on actual mobile devices

### 2. PWA Service Worker Validation
- [ ] Verify offline functionality for critical wedding workflows
- [ ] Test background synchronization for queued actions
- [ ] Show push notification delivery and interaction handling
- [ ] Demonstrate intelligent caching strategies
- [ ] Evidence of proper cache invalidation and updates
- [ ] Test app installation and update mechanisms

### 3. Offline-First Architecture Testing
- [ ] Verify request queuing during offline scenarios
- [ ] Test data synchronization and conflict resolution
- [ ] Show seamless online/offline transitions
- [ ] Demonstrate progressive data loading
- [ ] Evidence of secure local storage encryption
- [ ] Test photo upload queuing and background sync

## SUCCESS METRICS

### Technical Metrics
- **Offline Functionality**: 100% critical wedding workflows available offline
- **Cache Hit Rate**: >90% for frequently accessed wedding data
- **Background Sync**: <30 second sync time when returning online
- **Push Notifications**: >95% delivery rate for critical wedding updates
- **Mobile Performance**: <3 second load time on 3G networks

### Wedding Business Metrics
- **Mobile Engagement**: 80%+ of wedding tasks completed on mobile devices
- **Offline Usage**: Seamless experience during venue visits (no connectivity)
- **Real-time Updates**: Instant supplier availability and timeline changes
- **Photo Management**: Queue and sync wedding photos from mobile devices
- **Emergency Access**: Critical wedding information available offline

## SEQUENTIAL THINKING REQUIRED

Use `mcp__sequential-thinking__sequential_thinking` to work through:

1. **Mobile Architecture Planning**
   - Analyze mobile-specific performance constraints
   - Design adaptive response strategies
   - Plan battery and memory optimization

2. **PWA Implementation Strategy**
   - Design service worker caching strategies
   - Plan background synchronization workflows
   - Design push notification systems

3. **Offline-First Design**
   - Analyze critical wedding workflows for offline support
   - Design conflict resolution strategies
   - Plan progressive enhancement patterns

4. **Wedding Mobile Experience Optimization**
   - Map mobile wedding coordination scenarios
   - Design touch-friendly interaction patterns
   - Plan context-aware mobile features

Remember: Your mobile middleware must provide a seamless experience for couples planning their weddings on mobile devices, suppliers managing bookings on the go, and coordinators handling real-time wedding logistics. Every interaction must work reliably in challenging mobile network conditions.