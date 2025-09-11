# TEAM D - ROUND 1: WS-196 - API Routes Structure
## 2025-08-29 - Development Round 1

**YOUR MISSION:** Create mobile-optimized API route structure with PWA integration, offline API caching, mobile-specific endpoints, and cross-device synchronization for wedding suppliers managing clients on-the-go
**FEATURE ID:** WS-196 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about mobile API optimization, PWA service worker integration, offline data synchronization, and ensuring wedding photographers can manage bookings during outdoor shoots, venues can handle inquiries from mobile devices, and couples can access their wedding planning data seamlessly across all devices

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/api/mobile/
cat $WS_ROOT/wedsync/public/sw.js | head -20
```

2. **TEST RESULTS:**
```bash
npm test mobile-api
# MUST show: "All mobile API tests passing"
```

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY)

### A. SERENA PROJECT ACTIVATION
```typescript
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__search_for_pattern("mobile pwa service worker api");
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/api/");
```

## 🧠 STEP 2: SEQUENTIAL THINKING FOR MOBILE API ARCHITECTURE

```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Mobile API Architecture needs: PWA service worker with intelligent caching strategies, mobile-optimized endpoints with reduced payload sizes, offline-first data synchronization, background sync for form submissions, optimistic updates for real-time user experience, and cross-device state management. Key mobile scenarios: photographers uploading images from wedding venues with poor connectivity, venue managers handling bookings on tablets, couples planning on phones during commutes.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});
```

## 🎯 TEAM D SPECIALIZATION: MOBILE/PWA FOCUS

**MOBILE API OPTIMIZATION:**
- PWA service worker with intelligent API caching and offline support
- Mobile-optimized API endpoints with compressed payloads and reduced data transfer
- Offline-first data synchronization with conflict resolution strategies
- Background sync capabilities for form submissions and data updates
- Cross-device state management with real-time synchronization
- Mobile-specific authentication flows with biometric support
- Touch-optimized API response formats for mobile UI components

## 📋 TECHNICAL DELIVERABLES

- [ ] PWA service worker with comprehensive API caching strategies
- [ ] Mobile-optimized API endpoints with compressed response formats
- [ ] Offline data synchronization system with conflict resolution
- [ ] Background sync implementation for reliable data submission
- [ ] Cross-device state management with WebSocket integration
- [ ] Mobile authentication system with biometric capabilities
- [ ] Performance monitoring for mobile API response times

## 💾 WHERE TO SAVE YOUR WORK
- Mobile API: $WS_ROOT/wedsync/src/lib/api/mobile/
- Service Worker: $WS_ROOT/wedsync/public/sw.js
- Offline Sync: $WS_ROOT/wedsync/src/lib/offline/
- PWA Config: $WS_ROOT/wedsync/public/manifest.json

## 📱 MOBILE API PATTERNS

### PWA Service Worker with Intelligent API Caching
```typescript
// public/sw.js - Service Worker for API caching and offline support
const CACHE_VERSION = 'wedsync-api-v1.0';
const API_CACHE = `${CACHE_VERSION}-api`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const OFFLINE_QUEUE_CACHE = `${CACHE_VERSION}-offline-queue`;

// Wedding industry API endpoints that need different caching strategies
const CACHING_STRATEGIES = {
  // Critical data that needs frequent updates
  realtime: [
    '/api/suppliers/*/bookings/today',
    '/api/couples/*/timeline/current',
    '/api/venues/*/availability/today',
  ],
  
  // Data that can be cached for longer periods
  cacheable: [
    '/api/suppliers/*/profile',
    '/api/forms/*/template',
    '/api/venues/*/details',
    '/api/packages/*/pricing',
  ],
  
  // Data that should always be fresh
  networkFirst: [
    '/api/payments/*',
    '/api/bookings/*/status',
    '/api/auth/*',
  ],
  
  // Data that can work offline
  cacheFirst: [
    '/api/suppliers/*/portfolio',
    '/api/venues/*/photos',
    '/api/forms/*/fields',
  ]
};

// Cache duration for different types of wedding data
const CACHE_DURATIONS = {
  bookings: 5 * 60 * 1000,        // 5 minutes for booking data
  availability: 10 * 60 * 1000,   // 10 minutes for availability
  profiles: 60 * 60 * 1000,       // 1 hour for profile data
  portfolios: 24 * 60 * 60 * 1000, // 24 hours for portfolio images
  forms: 30 * 60 * 1000,          // 30 minutes for form templates
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        return cache.addAll([
          '/',
          '/offline',
          '/static/js/offline-handler.js',
          '/static/css/offline.css',
        ]);
      }),
      caches.open(API_CACHE),
      caches.open(OFFLINE_QUEUE_CACHE)
    ])
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName.startsWith('wedsync-') && !cacheName.startsWith(CACHE_VERSION))
            .map(cacheName => caches.delete(cacheName))
        );
      }),
      // Process any queued offline requests
      processOfflineQueue(),
    ])
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Handle API requests with intelligent caching
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Handle static assets
  if (request.method === 'GET') {
    event.respondWith(handleStaticRequest(request));
  }
});

async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  try {
    // Determine caching strategy based on endpoint
    const strategy = determineStrategy(pathname);
    
    switch (strategy) {
      case 'networkFirst':
        return await networkFirst(request);
      case 'cacheFirst':
        return await cacheFirst(request);
      case 'realtime':
        return await realtimeStrategy(request);
      default:
        return await smartCachingStrategy(request);
    }
  } catch (error) {
    console.error('Service Worker API request failed:', error);
    
    // Handle offline scenarios
    if (method === 'GET') {
      return await getCachedResponseOrOfflinePage(request);
    } else {
      return await queueOfflineRequest(request);
    }
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE);
      const responseClone = response.clone();
      
      // Add timestamp for cache invalidation
      const cachedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: {
          ...Object.fromEntries(responseClone.headers.entries()),
          'sw-cached-at': Date.now().toString(),
          'sw-cache-strategy': 'network-first',
        },
      });
      
      await cache.put(request, cachedResponse);
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return addOfflineHeaders(cachedResponse);
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    const cachedAt = cachedResponse.headers.get('sw-cached-at');
    const cacheAge = Date.now() - parseInt(cachedAt || '0');
    const maxAge = getCacheMaxAge(request.url);
    
    if (cacheAge < maxAge) {
      // Update cache in background
      updateCacheInBackground(request);
      return cachedResponse;
    }
  }
  
  // Cache miss or expired, fetch from network
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (cachedResponse) {
      return addOfflineHeaders(cachedResponse);
    }
    throw error;
  }
}

async function realtimeStrategy(request) {
  // Always try network first for realtime data
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(request, { 
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      // Cache briefly for offline fallback
      const cache = await caches.open(API_CACHE);
      const cachedResponse = new Response(response.clone().body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'sw-cached-at': Date.now().toString(),
          'sw-cache-strategy': 'realtime',
          'sw-cache-expires': (Date.now() + 30000).toString(), // 30 second expiry
        },
      });
      await cache.put(request, cachedResponse);
    }
    
    return response;
  } catch (error) {
    // For realtime data, only use very recent cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      const expiresAt = cachedResponse.headers.get('sw-cache-expires');
      if (expiresAt && Date.now() < parseInt(expiresAt)) {
        return addOfflineHeaders(cachedResponse);
      }
    }
    
    // Return offline response for critical realtime endpoints
    return createOfflineResponse(request);
  }
}

async function smartCachingStrategy(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Wedding-specific intelligent caching
  if (pathname.includes('/bookings/')) {
    return await networkFirst(request);
  } else if (pathname.includes('/portfolio/') || pathname.includes('/photos/')) {
    return await cacheFirst(request);
  } else if (pathname.includes('/availability/')) {
    return await realtimeStrategy(request);
  } else {
    return await networkFirst(request);
  }
}

async function queueOfflineRequest(request) {
  // Queue non-GET requests for when network is available
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.method !== 'GET' ? await request.text() : null,
    timestamp: Date.now(),
    id: generateRequestId(),
  };
  
  const cache = await caches.open(OFFLINE_QUEUE_CACHE);
  const queueResponse = new Response(JSON.stringify(requestData));
  await cache.put(`offline-${requestData.id}`, queueResponse);
  
  // Notify client that request was queued
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'REQUEST_QUEUED',
      requestId: requestData.id,
      message: 'Request saved and will be sent when connection is restored',
    });
  });
  
  return new Response(JSON.stringify({
    success: false,
    queued: true,
    requestId: requestData.id,
    message: 'Request queued for when connection is restored',
  }), {
    status: 202,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function processOfflineQueue() {
  const cache = await caches.open(OFFLINE_QUEUE_CACHE);
  const requests = await cache.keys();
  
  for (const request of requests) {
    if (request.url.includes('offline-')) {
      try {
        const cachedResponse = await cache.match(request);
        const requestData = await cachedResponse?.json();
        
        if (requestData) {
          // Attempt to replay the request
          const originalRequest = new Request(requestData.url, {
            method: requestData.method,
            headers: requestData.headers,
            body: requestData.body,
          });
          
          const response = await fetch(originalRequest);
          
          if (response.ok) {
            // Request succeeded, remove from queue
            await cache.delete(request);
            
            // Notify clients of successful sync
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
              client.postMessage({
                type: 'OFFLINE_REQUEST_SYNCED',
                requestId: requestData.id,
                response: await response.clone().json(),
              });
            });
          }
        }
      } catch (error) {
        console.error('Failed to process offline request:', error);
        // Keep in queue for next sync attempt
      }
    }
  }
}

// Background sync for critical wedding data
self.addEventListener('sync', (event) => {
  if (event.tag === 'wedding-data-sync') {
    event.waitUntil(syncWeddingData());
  } else if (event.tag === 'offline-requests') {
    event.waitUntil(processOfflineQueue());
  }
});

async function syncWeddingData() {
  const criticalEndpoints = [
    '/api/suppliers/current/bookings/today',
    '/api/suppliers/current/availability/current',
    '/api/forms/pending/submissions',
  ];
  
  for (const endpoint of criticalEndpoints) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        const cache = await caches.open(API_CACHE);
        await cache.put(endpoint, response.clone());
      }
    } catch (error) {
      console.error(`Failed to sync ${endpoint}:`, error);
    }
  }
}

// Helper functions
function determineStrategy(pathname) {
  for (const [strategy, patterns] of Object.entries(CACHING_STRATEGIES)) {
    for (const pattern of patterns) {
      if (matchesPattern(pathname, pattern)) {
        return strategy;
      }
    }
  }
  return 'networkFirst';
}

function matchesPattern(pathname, pattern) {
  // Convert pattern with wildcards to regex
  const regex = new RegExp(
    '^' + pattern.replace(/\*/g, '[^/]+').replace(/\//g, '\\/') + '$'
  );
  return regex.test(pathname);
}

function getCacheMaxAge(url) {
  for (const [type, duration] of Object.entries(CACHE_DURATIONS)) {
    if (url.includes(type)) {
      return duration;
    }
  }
  return 5 * 60 * 1000; // Default 5 minutes
}

async function updateCacheInBackground(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      await cache.put(request, response.clone());
    }
  } catch (error) {
    // Silently fail background updates
  }
}

function addOfflineHeaders(response) {
  const newHeaders = new Headers(response.headers);
  newHeaders.set('X-Served-From', 'cache');
  newHeaders.set('X-Offline-Mode', 'true');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

function createOfflineResponse(request) {
  const url = new URL(request.url);
  
  // Return meaningful offline responses for different endpoints
  if (url.pathname.includes('/bookings/')) {
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: 'OFFLINE',
        message: 'Booking data not available offline',
      },
      offline_data: {
        last_sync: localStorage.getItem('last-booking-sync'),
        next_sync_attempt: Date.now() + 30000,
      },
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  return new Response(JSON.stringify({
    success: false,
    error: {
      code: 'OFFLINE',
      message: 'Data not available offline',
    },
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/offline');
      return offlineResponse || new Response('Offline', { status: 503 });
    }
    throw error;
  }
}
```

### Mobile-Optimized API Endpoints
```typescript
// src/lib/api/mobile/mobile-optimizations.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';

export interface MobileAPIOptions {
  compress: boolean;
  minify: boolean;
  includeMetadata: boolean;
  maxImageSize: number;
  includeRelations: string[];
  excludeFields: string[];
}

export interface MobileContext {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connectionType: '4g' | '3g' | '2g' | 'wifi' | 'ethernet';
  batteryLevel?: number;
  isLowPowerMode?: boolean;
  screenSize: {
    width: number;
    height: number;
  };
}

const MobileContextSchema = z.object({
  deviceType: z.enum(['mobile', 'tablet', 'desktop']).default('mobile'),
  connectionType: z.enum(['4g', '3g', '2g', 'wifi', 'ethernet']).default('4g'),
  batteryLevel: z.number().min(0).max(100).optional(),
  isLowPowerMode: z.boolean().optional(),
  screenSize: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
});

export class MobileAPIOptimizer {
  public static parseMobileContext(request: NextRequest): MobileContext {
    // Parse mobile context from headers
    const userAgent = request.headers.get('user-agent') || '';
    const deviceType = this.detectDeviceType(userAgent);
    const connectionType = request.headers.get('x-connection-type') as any || '4g';
    const batteryLevel = request.headers.get('x-battery-level') 
      ? parseInt(request.headers.get('x-battery-level')!)
      : undefined;
    const isLowPowerMode = request.headers.get('x-low-power-mode') === 'true';
    
    // Parse screen size from viewport headers
    const viewport = request.headers.get('x-viewport');
    const screenSize = viewport 
      ? this.parseViewport(viewport)
      : { width: 375, height: 667 }; // iPhone default

    const context = MobileContextSchema.parse({
      deviceType,
      connectionType,
      batteryLevel,
      isLowPowerMode,
      screenSize,
    });

    return context;
  }

  public static optimizeResponse<T>(
    data: T,
    context: MobileContext,
    options: Partial<MobileAPIOptions> = {}
  ): T {
    const defaultOptions: MobileAPIOptions = {
      compress: true,
      minify: context.connectionType === '2g' || context.connectionType === '3g',
      includeMetadata: !context.isLowPowerMode,
      maxImageSize: this.getMaxImageSize(context),
      includeRelations: [],
      excludeFields: [],
    };

    const finalOptions = { ...defaultOptions, ...options };

    let optimizedData = this.compressData(data, finalOptions);
    optimizedData = this.optimizeImages(optimizedData, finalOptions, context);
    optimizedData = this.filterFields(optimizedData, finalOptions);

    return optimizedData;
  }

  private static detectDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
    const mobileRegex = /iPhone|Android.*Mobile|BlackBerry|Opera Mini/i;
    const tabletRegex = /iPad|Android(?!.*Mobile)|Tablet/i;
    
    if (mobileRegex.test(userAgent)) return 'mobile';
    if (tabletRegex.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  private static parseViewport(viewport: string): { width: number; height: number } {
    const [width, height] = viewport.split('x').map(Number);
    return { width: width || 375, height: height || 667 };
  }

  private static getMaxImageSize(context: MobileContext): number {
    if (context.connectionType === '2g') return 50 * 1024; // 50KB
    if (context.connectionType === '3g') return 100 * 1024; // 100KB
    if (context.deviceType === 'mobile') return 200 * 1024; // 200KB
    return 500 * 1024; // 500KB for tablets/desktop
  }

  private static compressData<T>(data: T, options: MobileAPIOptions): T {
    if (!options.compress) return data;

    // Remove null/undefined values to reduce payload size
    return this.removeEmpty(data);
  }

  private static optimizeImages<T>(data: T, options: MobileAPIOptions, context: MobileContext): T {
    if (typeof data !== 'object' || !data) return data;

    const optimized = { ...data };

    // Find image fields and optimize them
    for (const [key, value] of Object.entries(optimized)) {
      if (this.isImageField(key) && typeof value === 'string') {
        (optimized as any)[key] = this.optimizeImageUrl(value, context, options);
      } else if (Array.isArray(value)) {
        (optimized as any)[key] = value.map(item => 
          this.optimizeImages(item, options, context)
        );
      } else if (typeof value === 'object' && value !== null) {
        (optimized as any)[key] = this.optimizeImages(value, options, context);
      }
    }

    return optimized;
  }

  private static isImageField(fieldName: string): boolean {
    const imageFields = [
      'image', 'photo', 'thumbnail', 'avatar', 'cover_image',
      'portfolio_image', 'venue_photo', 'profile_image'
    ];
    return imageFields.some(field => fieldName.toLowerCase().includes(field));
  }

  private static optimizeImageUrl(
    imageUrl: string,
    context: MobileContext,
    options: MobileAPIOptions
  ): string {
    if (!imageUrl.startsWith('http')) return imageUrl;

    // Add optimization parameters to image URLs
    const url = new URL(imageUrl);
    
    // Set appropriate image dimensions based on device
    if (context.deviceType === 'mobile') {
      url.searchParams.set('w', (context.screenSize.width * 2).toString()); // 2x for retina
      url.searchParams.set('h', (context.screenSize.height * 2).toString());
    }

    // Set quality based on connection
    const quality = this.getImageQuality(context);
    url.searchParams.set('q', quality.toString());

    // Set format
    url.searchParams.set('f', 'webp');

    return url.toString();
  }

  private static getImageQuality(context: MobileContext): number {
    if (context.isLowPowerMode) return 60;
    if (context.connectionType === '2g') return 50;
    if (context.connectionType === '3g') return 70;
    return 85;
  }

  private static filterFields<T>(data: T, options: MobileAPIOptions): T {
    if (!options.excludeFields.length || typeof data !== 'object' || !data) {
      return data;
    }

    const filtered = { ...data };

    for (const field of options.excludeFields) {
      delete (filtered as any)[field];
    }

    return filtered;
  }

  private static removeEmpty<T>(obj: T): T {
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeEmpty(item)) as unknown as T;
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const cleaned: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        if (value !== null && value !== undefined && value !== '') {
          cleaned[key] = this.removeEmpty(value);
        }
      }
      
      return cleaned;
    }
    
    return obj;
  }
}

// Mobile-optimized supplier client endpoint
export async function getMobileSupplierClients(
  request: NextRequest,
  supplierId: string
): Promise<any> {
  const mobileContext = MobileAPIOptimizer.parseMobileContext(request);
  
  // Determine what data to include based on device capabilities
  const includeRelations = mobileContext.deviceType === 'mobile' 
    ? ['basic_info'] 
    : ['forms', 'bookings', 'communications'];

  const excludeFields = mobileContext.connectionType === '2g'
    ? ['requirements', 'special_requests', 'dietary_restrictions']
    : [];

  // Get data from database (implementation would go here)
  const rawData = await getRawSupplierClients(supplierId, {
    includeRelations,
    limit: mobileContext.deviceType === 'mobile' ? 10 : 20,
  });

  // Optimize response for mobile context
  const optimizedData = MobileAPIOptimizer.optimizeResponse(
    rawData,
    mobileContext,
    {
      excludeFields,
      includeRelations,
      maxImageSize: mobileContext.connectionType === '2g' ? 30 * 1024 : 100 * 1024,
    }
  );

  return {
    ...optimizedData,
    mobile_context: {
      device_type: mobileContext.deviceType,
      connection_type: mobileContext.connectionType,
      optimizations_applied: {
        image_compression: true,
        field_filtering: excludeFields.length > 0,
        relation_limiting: includeRelations.length < 3,
      },
    },
  };
}

async function getRawSupplierClients(supplierId: string, options: any) {
  // Placeholder for actual database query
  return {
    clients: [],
    total: 0,
    summary: {},
  };
}
```

### Offline Data Synchronization System
```typescript
// src/lib/offline/sync-manager.ts
import { createClient } from '@supabase/supabase-js';

export interface OfflineDataItem {
  id: string;
  table: string;
  operation: 'create' | 'update' | 'delete';
  data: Record<string, any>;
  timestamp: number;
  userId: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  lastError?: string;
}

export interface SyncConflict {
  id: string;
  table: string;
  localData: Record<string, any>;
  serverData: Record<string, any>;
  conflictFields: string[];
  resolution: 'client_wins' | 'server_wins' | 'merge' | 'manual';
}

export class OfflineDataSyncManager {
  private indexedDB!: IDBDatabase;
  private syncQueue: OfflineDataItem[] = [];
  private isOnline = navigator.onLine;
  private syncInProgress = false;

  constructor() {
    this.initializeIndexedDB();
    this.setupEventListeners();
    this.startPeriodicSync();
  }

  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WedSyncOfflineDB', 2);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.indexedDB = request.result;
        this.loadSyncQueue();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create offline data store
        if (!db.objectStoreNames.contains('offline_data')) {
          const offlineStore = db.createObjectStore('offline_data', { keyPath: 'id' });
          offlineStore.createIndex('table', 'table', { unique: false });
          offlineStore.createIndex('timestamp', 'timestamp', { unique: false });
          offlineStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // Create conflict resolution store
        if (!db.objectStoreNames.contains('sync_conflicts')) {
          const conflictStore = db.createObjectStore('sync_conflicts', { keyPath: 'id' });
          conflictStore.createIndex('table', 'table', { unique: false });
        }

        // Create cached API responses
        if (!db.objectStoreNames.contains('api_cache')) {
          const cacheStore = db.createObjectStore('api_cache', { keyPath: 'url' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
          cacheStore.createIndex('table', 'table', { unique: false });
        }
      };
    });
  }

  private setupEventListeners(): void {
    // Online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Visibility change for background sync
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.triggerSync();
      }
    });
  }

  public async saveForOfflineSync(
    table: string,
    operation: 'create' | 'update' | 'delete',
    data: Record<string, any>,
    userId: string
  ): Promise<string> {
    const offlineItem: OfflineDataItem = {
      id: `${table}_${operation}_${Date.now()}_${Math.random().toString(36)}`,
      table,
      operation,
      data,
      timestamp: Date.now(),
      userId,
      syncStatus: 'pending',
      retryCount: 0,
    };

    await this.storeOfflineData(offlineItem);
    this.syncQueue.push(offlineItem);

    // Trigger sync if online
    if (this.isOnline) {
      this.triggerSync();
    }

    return offlineItem.id;
  }

  public async triggerSync(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;

    try {
      // Load any pending items from IndexedDB
      await this.loadSyncQueue();

      // Process each item in the queue
      for (const item of this.syncQueue) {
        if (item.syncStatus !== 'pending') continue;

        try {
          await this.syncItem(item);
        } catch (error) {
          await this.handleSyncError(item, error);
        }
      }

      // Remove successfully synced items
      this.syncQueue = this.syncQueue.filter(item => item.syncStatus !== 'synced');

      // Update IndexedDB
      await this.updateSyncQueue();

      // Notify components of sync completion
      this.notifySync();

    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncItem(item: OfflineDataItem): Promise<void> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    item.syncStatus = 'syncing';

    try {
      let result;
      
      switch (item.operation) {
        case 'create':
          result = await supabase.from(item.table).insert(item.data);
          break;
        case 'update':
          result = await supabase
            .from(item.table)
            .update(item.data)
            .eq('id', item.data.id);
          break;
        case 'delete':
          result = await supabase
            .from(item.table)
            .delete()
            .eq('id', item.data.id);
          break;
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      item.syncStatus = 'synced';
      
      // Wedding-specific success actions
      await this.handleSuccessfulSync(item);

    } catch (error) {
      item.syncStatus = 'failed';
      item.lastError = error instanceof Error ? error.message : 'Unknown error';
      item.retryCount++;
      
      // Check if we need to handle conflicts
      if (error instanceof Error && error.message.includes('conflict')) {
        await this.handleSyncConflict(item, error);
      }
      
      throw error;
    }
  }

  private async handleSyncConflict(item: OfflineDataItem, error: Error): Promise<void> {
    // Fetch current server data
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: serverData } = await supabase
      .from(item.table)
      .select('*')
      .eq('id', item.data.id)
      .single();

    if (serverData) {
      const conflict: SyncConflict = {
        id: `conflict_${item.id}`,
        table: item.table,
        localData: item.data,
        serverData,
        conflictFields: this.detectConflictFields(item.data, serverData),
        resolution: this.determineConflictResolution(item.table, item.data, serverData),
      };

      await this.storeSyncConflict(conflict);
      
      // Auto-resolve if possible
      if (conflict.resolution !== 'manual') {
        await this.resolveConflict(conflict);
      }
    }
  }

  private detectConflictFields(localData: any, serverData: any): string[] {
    const conflicts: string[] = [];
    
    for (const key of Object.keys(localData)) {
      if (localData[key] !== serverData[key]) {
        conflicts.push(key);
      }
    }
    
    return conflicts;
  }

  private determineConflictResolution(
    table: string,
    localData: any,
    serverData: any
  ): 'client_wins' | 'server_wins' | 'merge' | 'manual' {
    // Wedding business logic for conflict resolution
    if (table === 'bookings') {
      // For bookings, server usually wins for payment status
      if (localData.payment_status !== serverData.payment_status) {
        return 'server_wins';
      }
    }
    
    if (table === 'forms') {
      // For forms, client wins for recent submissions
      const localTime = new Date(localData.updated_at || localData.created_at).getTime();
      const serverTime = new Date(serverData.updated_at || serverData.created_at).getTime();
      
      return localTime > serverTime ? 'client_wins' : 'server_wins';
    }
    
    if (table === 'clients') {
      // For client data, merge contact information
      return 'merge';
    }
    
    return 'manual'; // Require manual resolution
  }

  private async resolveConflict(conflict: SyncConflict): Promise<void> {
    let resolvedData;
    
    switch (conflict.resolution) {
      case 'client_wins':
        resolvedData = conflict.localData;
        break;
      case 'server_wins':
        resolvedData = conflict.serverData;
        break;
      case 'merge':
        resolvedData = this.mergeData(conflict.localData, conflict.serverData);
        break;
      default:
        // Manual resolution required
        return;
    }

    // Apply resolved data
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    await supabase
      .from(conflict.table)
      .update(resolvedData)
      .eq('id', resolvedData.id);

    // Remove conflict from storage
    await this.removeSyncConflict(conflict.id);
  }

  private mergeData(localData: any, serverData: any): any {
    // Intelligent merging for wedding data
    const merged = { ...serverData }; // Start with server data

    // Preserve local changes for specific fields
    const clientWinsFields = [
      'requirements',
      'special_requests',
      'preferred_style',
      'notes',
    ];

    for (const field of clientWinsFields) {
      if (localData[field] && localData[field] !== serverData[field]) {
        merged[field] = localData[field];
      }
    }

    // Merge arrays
    if (localData.tags && serverData.tags) {
      merged.tags = [...new Set([...serverData.tags, ...localData.tags])];
    }

    return merged;
  }

  private async handleSuccessfulSync(item: OfflineDataItem): Promise<void> {
    // Wedding-specific post-sync actions
    if (item.table === 'bookings' && item.operation === 'create') {
      // Trigger confirmation email
      await this.triggerWeddingBookingConfirmation(item.data);
    }
    
    if (item.table === 'forms' && item.operation === 'create') {
      // Notify supplier of form submission
      await this.notifySupplierOfFormSubmission(item.data);
    }
  }

  private async triggerWeddingBookingConfirmation(bookingData: any): Promise<void> {
    // Implementation would trigger email/notification
    console.log('Booking confirmation triggered for:', bookingData.id);
  }

  private async notifySupplierOfFormSubmission(formData: any): Promise<void> {
    // Implementation would notify supplier
    console.log('Form submission notification for supplier:', formData.supplier_id);
  }

  private startPeriodicSync(): void {
    // Sync every 5 minutes when online
    setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0) {
        this.triggerSync();
      }
    }, 5 * 60 * 1000);
  }

  private async loadSyncQueue(): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB.transaction(['offline_data'], 'readonly');
      const store = transaction.objectStore('offline_data');
      const request = store.getAll();

      request.onsuccess = () => {
        this.syncQueue = request.result.filter(
          (item: OfflineDataItem) => item.syncStatus === 'pending'
        );
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async storeOfflineData(item: OfflineDataItem): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB.transaction(['offline_data'], 'readwrite');
      const store = transaction.objectStore('offline_data');
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async updateSyncQueue(): Promise<void> {
    const transaction = this.indexedDB.transaction(['offline_data'], 'readwrite');
    const store = transaction.objectStore('offline_data');

    for (const item of this.syncQueue) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  private async storeSyncConflict(conflict: SyncConflict): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB.transaction(['sync_conflicts'], 'readwrite');
      const store = transaction.objectStore('sync_conflicts');
      const request = store.put(conflict);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async removeSyncConflict(conflictId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB.transaction(['sync_conflicts'], 'readwrite');
      const store = transaction.objectStore('sync_conflicts');
      const request = store.delete(conflictId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async handleSyncError(item: OfflineDataItem, error: any): Promise<void> {
    console.error(`Sync failed for ${item.table} ${item.operation}:`, error);
    
    // Exponential backoff for retries
    if (item.retryCount < 5) {
      const delay = Math.pow(2, item.retryCount) * 1000; // 1s, 2s, 4s, 8s, 16s
      
      setTimeout(() => {
        if (this.isOnline) {
          this.syncItem(item);
        }
      }, delay);
    } else {
      // Max retries reached, mark as permanently failed
      item.syncStatus = 'failed';
      await this.storeOfflineData(item);
    }
  }

  private notifySync(): void {
    // Notify React components of sync status
    window.dispatchEvent(new CustomEvent('offline-sync-complete', {
      detail: {
        synced: this.syncQueue.filter(item => item.syncStatus === 'synced').length,
        failed: this.syncQueue.filter(item => item.syncStatus === 'failed').length,
        pending: this.syncQueue.filter(item => item.syncStatus === 'pending').length,
      },
    }));
  }

  public getSyncStatus(): {
    isOnline: boolean;
    syncInProgress: boolean;
    queueLength: number;
    failedItems: number;
  } {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      queueLength: this.syncQueue.length,
      failedItems: this.syncQueue.filter(item => item.syncStatus === 'failed').length,
    };
  }
}

// Global sync manager instance
export const syncManager = new OfflineDataSyncManager();
```

---

**EXECUTE IMMEDIATELY - Comprehensive mobile API architecture with PWA service worker, offline synchronization, and intelligent caching!**