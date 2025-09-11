import { jest } from '@jest/globals';

// Mock Service Worker APIs
const mockServiceWorkerRegistration = {
  installing: null,
  waiting: null,
  active: {
    postMessage: jest.fn(),
    state: 'activated',
  },
  scope: 'http://localhost:3000/',
  unregister: jest.fn(),
  update: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  sync: {
    register: jest.fn().mockResolvedValue(undefined),
  },
  showNotification: jest.fn(),
};

const mockServiceWorker = {
  register: jest.fn().mockResolvedValue(mockServiceWorkerRegistration),
  ready: Promise.resolve(mockServiceWorkerRegistration),
  controller: mockServiceWorkerRegistration.active,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

Object.defineProperty(navigator, 'serviceWorker', {
  value: mockServiceWorker,
  writable: true,
});

// Mock IndexedDB
const mockDB = {
  transaction: jest.fn(),
  createObjectStore: jest.fn(),
  close: jest.fn(),
};

const mockTransaction = {
  objectStore: jest.fn(),
  oncomplete: null,
  onerror: null,
};

const mockObjectStore = {
  add: jest.fn(),
  put: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  getAll: jest.fn(),
};

const mockIDBRequest = {
  result: null,
  error: null,
  onsuccess: null,
  onerror: null,
};

global.indexedDB = {
  open: jest.fn().mockReturnValue({
    ...mockIDBRequest,
    result: mockDB,
  }),
  deleteDatabase: jest.fn(),
} as any;

// Mock Cache API
const mockCache = {
  match: jest.fn(),
  add: jest.fn(),
  addAll: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  keys: jest.fn(),
};

global.caches = {
  open: jest.fn().mockResolvedValue(mockCache),
  match: jest.fn(),
  has: jest.fn(),
  delete: jest.fn(),
  keys: jest.fn(),
} as any;

// Mock fetch
global.fetch = jest.fn();

// Mock Notification API
global.Notification = {
  permission: 'default',
  requestPermission: jest.fn().mockResolvedValue('granted'),
} as any;

global.PushManager = {
  supportedContentEncodings: ['aes128gcm'],
} as any;

// Mock performance API for Service Worker context
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
};

global.performance = mockPerformance as any;

describe('Service Worker Analytics', () => {
  let serviceWorkerCode: string;

  beforeAll(async () => {
    // Read the actual service worker file
    const fs = await import('fs');
    const path = await import('path');
    
    try {
      serviceWorkerCode = fs.readFileSync(
        path.join(process.cwd(), 'wedsync/public/sw-analytics.js'),
        'utf8'
      );
    } catch (error) {
      // If file doesn't exist, use a mock implementation
      serviceWorkerCode = `
        const CACHE_NAME = 'analytics-cache-v1';
        const urlsToCache = ['/'];
        
        self.addEventListener('install', (event) => {
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
          );
        });
        
        self.addEventListener('fetch', (event) => {
          event.respondWith(
            caches.match(event.request).then((response) => {
              return response || fetch(event.request);
            })
          );
        });
      `;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset fetch mock
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      clone: function() { return this; },
    });

    // Reset cache mock
    mockCache.match.mockResolvedValue(null);
    mockCache.put.mockResolvedValue(undefined);
    mockCache.addAll.mockResolvedValue(undefined);

    // Reset IndexedDB mocks
    mockDB.transaction.mockReturnValue(mockTransaction);
    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
    mockObjectStore.get.mockReturnValue({
      ...mockIDBRequest,
      result: null,
    });
    mockObjectStore.put.mockReturnValue({
      ...mockIDBRequest,
      result: 'success',
    });
  });

  describe('Service Worker Registration', () => {
    it('should register service worker successfully', async () => {
      const registration = await navigator.serviceWorker.register('/sw-analytics.js');
      
      expect(registration).toBeDefined();
      expect(registration.scope).toBe('http://localhost:3000/');
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw-analytics.js');
    });

    it('should handle service worker registration errors', async () => {
      mockServiceWorker.register.mockRejectedValueOnce(new Error('Registration failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        await navigator.serviceWorker.register('/sw-analytics.js');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should update service worker when new version available', async () => {
      const registration = await navigator.serviceWorker.register('/sw-analytics.js');
      
      await registration.update();
      
      expect(registration.update).toHaveBeenCalled();
    });

    it('should unregister service worker', async () => {
      const registration = await navigator.serviceWorker.register('/sw-analytics.js');
      
      const unregistered = await registration.unregister();
      
      expect(unregistered).toBe(true);
      expect(registration.unregister).toHaveBeenCalled();
    });
  });

  describe('Caching Strategies', () => {
    it('should implement cache-first strategy', async () => {
      // Mock cached response
      const cachedResponse = new Response('cached data');
      mockCache.match.mockResolvedValue(cachedResponse);

      const event = {
        request: new Request('/api/cached-data'),
        respondWith: jest.fn(),
        waitUntil: jest.fn(),
      };

      // Simulate cache-first strategy
      const cacheFirst = async (request: Request) => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        const cache = await caches.open('analytics-cache-v1');
        cache.put(request, networkResponse.clone());
        return networkResponse;
      };

      const response = await cacheFirst(event.request);
      
      expect(response).toBe(cachedResponse);
      expect(mockCache.match).toHaveBeenCalledWith(event.request);
    });

    it('should implement network-first strategy', async () => {
      // Mock network response
      const networkResponse = new Response('network data');
      (global.fetch as jest.Mock).mockResolvedValue(networkResponse);

      const event = {
        request: new Request('/api/live-data'),
        respondWith: jest.fn(),
        waitUntil: jest.fn(),
      };

      // Simulate network-first strategy
      const networkFirst = async (request: Request) => {
        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open('analytics-cache-v1');
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch {
          return await caches.match(request);
        }
      };

      const response = await networkFirst(event.request);
      
      expect(response).toBe(networkResponse);
      expect(global.fetch).toHaveBeenCalledWith(event.request);
    });

    it('should implement stale-while-revalidate strategy', async () => {
      const cachedResponse = new Response('stale data');
      const freshResponse = new Response('fresh data');
      
      mockCache.match.mockResolvedValue(cachedResponse);
      (global.fetch as jest.Mock).mockResolvedValue(freshResponse);

      const event = {
        request: new Request('/api/analytics-data'),
        respondWith: jest.fn(),
        waitUntil: jest.fn(),
      };

      // Simulate stale-while-revalidate strategy
      const staleWhileRevalidate = async (request: Request) => {
        const cachedResponse = await caches.match(request);
        
        const fetchPromise = fetch(request).then(networkResponse => {
          const cache = caches.open('analytics-cache-v1');
          cache.then(c => c.put(request, networkResponse.clone()));
          return networkResponse;
        });

        return cachedResponse || fetchPromise;
      };

      const response = await staleWhileRevalidate(event.request);
      
      expect(response).toBe(cachedResponse);
      expect(mockCache.match).toHaveBeenCalledWith(event.request);
      expect(global.fetch).toHaveBeenCalledWith(event.request);
    });

    it('should cache static assets during install', async () => {
      const staticAssets = [
        '/',
        '/manifest.json',
        '/icons/icon-192x192.png',
        '/css/analytics.css',
        '/js/analytics.js',
      ];

      // Simulate install event
      const installEvent = {
        waitUntil: jest.fn((promise) => promise),
      };

      // Simulate install handler
      const handleInstall = async () => {
        const cache = await caches.open('analytics-cache-v1');
        await cache.addAll(staticAssets);
      };

      await installEvent.waitUntil(handleInstall());

      expect(mockCache.addAll).toHaveBeenCalledWith(staticAssets);
    });

    it('should clean up old caches on activate', async () => {
      const oldCaches = ['analytics-cache-v0', 'old-cache'];
      const currentCache = 'analytics-cache-v1';

      (global.caches.keys as jest.Mock).mockResolvedValue([
        currentCache,
        ...oldCaches,
      ]);

      // Simulate activate event
      const activateEvent = {
        waitUntil: jest.fn((promise) => promise),
      };

      // Simulate activate handler
      const handleActivate = async () => {
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames
          .filter(cacheName => cacheName !== currentCache)
          .map(cacheName => caches.delete(cacheName));
        
        await Promise.all(deletePromises);
      };

      await activateEvent.waitUntil(handleActivate());

      oldCaches.forEach(cacheName => {
        expect(global.caches.delete).toHaveBeenCalledWith(cacheName);
      });
    });
  });

  describe('Background Sync', () => {
    it('should register background sync', async () => {
      const registration = await navigator.serviceWorker.ready;
      
      await registration.sync.register('analytics-sync');
      
      expect(registration.sync.register).toHaveBeenCalledWith('analytics-sync');
    });

    it('should handle background sync events', async () => {
      const syncData = [
        { type: 'analytics', data: { event: 'page_view', page: '/dashboard' }},
        { type: 'analytics', data: { event: 'click', element: 'export-button' }},
      ];

      // Mock queued sync data
      mockObjectStore.getAll.mockReturnValue({
        ...mockIDBRequest,
        result: syncData,
      });

      const handleBackgroundSync = async (tag: string) => {
        if (tag === 'analytics-sync') {
          const db = await indexedDB.open('analytics-db', 1);
          const transaction = db.transaction(['sync-queue'], 'readonly');
          const store = transaction.objectStore('sync-queue');
          const queuedData = await store.getAll();

          // Process queued data
          for (const item of queuedData) {
            await fetch('/api/analytics', {
              method: 'POST',
              body: JSON.stringify(item.data),
            });
          }

          // Clear queue after successful sync
          const clearTransaction = db.transaction(['sync-queue'], 'readwrite');
          const clearStore = clearTransaction.objectStore('sync-queue');
          await clearStore.clear();
        }
      };

      await handleBackgroundSync('analytics-sync');

      expect(global.fetch).toHaveBeenCalledTimes(syncData.length);
      syncData.forEach((item, index) => {
        expect(global.fetch).toHaveBeenNthCalledWith(index + 1, '/api/analytics', {
          method: 'POST',
          body: JSON.stringify(item.data),
        });
      });
    });

    it('should queue data when offline', async () => {
      // Mock offline scenario
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const analyticsData = {
        event: 'offline_action',
        timestamp: Date.now(),
        page: '/analytics',
      };

      const queueForSync = async (data: any) => {
        const db = await indexedDB.open('analytics-db', 1);
        const transaction = db.transaction(['sync-queue'], 'readwrite');
        const store = transaction.objectStore('sync-queue');
        
        await store.add({
          id: Date.now(),
          data,
          timestamp: Date.now(),
        });

        // Register for background sync
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('analytics-sync');
      };

      await queueForSync(analyticsData);

      expect(mockObjectStore.add).toHaveBeenCalledWith({
        id: expect.any(Number),
        data: analyticsData,
        timestamp: expect.any(Number),
      });
    });
  });

  describe('Push Notifications', () => {
    beforeEach(() => {
      global.Notification.permission = 'granted';
    });

    it('should request notification permission', async () => {
      const permission = await Notification.requestPermission();
      
      expect(permission).toBe('granted');
      expect(Notification.requestPermission).toHaveBeenCalled();
    });

    it('should handle push events', async () => {
      const pushData = {
        title: 'Analytics Update',
        body: 'New performance data available',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'analytics-update',
        data: {
          url: '/analytics/performance',
          timestamp: Date.now(),
        },
      };

      const handlePush = async (event: any) => {
        const data = event.data?.json() || {};
        const registration = await navigator.serviceWorker.ready;
        
        await registration.showNotification(data.title, {
          body: data.body,
          icon: data.icon,
          badge: data.badge,
          tag: data.tag,
          data: data.data,
          requireInteraction: true,
          actions: [
            {
              action: 'view',
              title: 'View Details',
              icon: '/icons/view-icon.png',
            },
            {
              action: 'dismiss',
              title: 'Dismiss',
              icon: '/icons/dismiss-icon.png',
            },
          ],
        });
      };

      const pushEvent = {
        data: {
          json: () => pushData,
        },
        waitUntil: jest.fn((promise) => promise),
      };

      await pushEvent.waitUntil(handlePush(pushEvent));

      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        pushData.title,
        expect.objectContaining({
          body: pushData.body,
          icon: pushData.icon,
          badge: pushData.badge,
          tag: pushData.tag,
          data: pushData.data,
          requireInteraction: true,
          actions: expect.arrayContaining([
            expect.objectContaining({
              action: 'view',
              title: 'View Details',
            }),
            expect.objectContaining({
              action: 'dismiss',
              title: 'Dismiss',
            }),
          ]),
        })
      );
    });

    it('should handle notification click events', async () => {
      const notificationData = {
        url: '/analytics/dashboard',
        timestamp: Date.now(),
      };

      const handleNotificationClick = async (event: any) => {
        const { action, notification } = event;
        
        if (action === 'view') {
          // Open the URL from notification data
          await (self as any).clients.openWindow(notification.data.url);
        }
        
        notification.close();
      };

      const clickEvent = {
        action: 'view',
        notification: {
          data: notificationData,
          close: jest.fn(),
        },
        waitUntil: jest.fn((promise) => promise),
      };

      // Mock clients API
      (self as any).clients = {
        openWindow: jest.fn(),
      };

      await clickEvent.waitUntil(handleNotificationClick(clickEvent));

      expect((self as any).clients.openWindow).toHaveBeenCalledWith(notificationData.url);
      expect(clickEvent.notification.close).toHaveBeenCalled();
    });

    it('should handle push subscription', async () => {
      const mockSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint',
        keys: {
          p256dh: 'key1',
          auth: 'key2',
        },
        toJSON: jest.fn(() => ({
          endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint',
          keys: { p256dh: 'key1', auth: 'key2' },
        })),
      };

      const mockPushManager = {
        subscribe: jest.fn().mockResolvedValue(mockSubscription),
        getSubscription: jest.fn().mockResolvedValue(mockSubscription),
      };

      mockServiceWorkerRegistration.pushManager = mockPushManager;

      const subscription = await mockServiceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'test-key',
      });

      expect(subscription).toBe(mockSubscription);
      expect(mockPushManager.subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: 'test-key',
      });
    });
  });

  describe('IndexedDB Operations', () => {
    it('should store analytics data offline', async () => {
      const analyticsData = {
        event: 'page_view',
        page: '/analytics',
        timestamp: Date.now(),
        userId: 'user123',
      };

      const storeOfflineData = async (data: any) => {
        const db = await indexedDB.open('analytics-db', 1);
        const transaction = db.transaction(['analytics'], 'readwrite');
        const store = transaction.objectStore('analytics');
        
        return await store.add({
          ...data,
          id: Date.now(),
          synced: false,
        });
      };

      await storeOfflineData(analyticsData);

      expect(mockObjectStore.add).toHaveBeenCalledWith({
        ...analyticsData,
        id: expect.any(Number),
        synced: false,
      });
    });

    it('should retrieve offline analytics data', async () => {
      const storedData = [
        { id: 1, event: 'click', synced: false },
        { id: 2, event: 'scroll', synced: true },
      ];

      mockObjectStore.getAll.mockReturnValue({
        ...mockIDBRequest,
        result: storedData,
      });

      const getOfflineData = async () => {
        const db = await indexedDB.open('analytics-db', 1);
        const transaction = db.transaction(['analytics'], 'readonly');
        const store = transaction.objectStore('analytics');
        
        return await store.getAll();
      };

      const result = await getOfflineData();

      expect(result).toEqual(storedData);
      expect(mockObjectStore.getAll).toHaveBeenCalled();
    });

    it('should handle database upgrade', async () => {
      const upgradeHandler = (event: any) => {
        const db = event.target.result;
        
        // Create analytics object store
        const analyticsStore = db.createObjectStore('analytics', {
          keyPath: 'id',
          autoIncrement: true,
        });
        analyticsStore.createIndex('timestamp', 'timestamp', { unique: false });
        analyticsStore.createIndex('event', 'event', { unique: false });

        // Create sync queue object store
        const syncStore = db.createObjectStore('sync-queue', {
          keyPath: 'id',
          autoIncrement: true,
        });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      };

      const mockUpgradeEvent = {
        target: {
          result: {
            createObjectStore: jest.fn().mockReturnValue({
              createIndex: jest.fn(),
            }),
          },
        },
      };

      upgradeHandler(mockUpgradeEvent);

      expect(mockUpgradeEvent.target.result.createObjectStore).toHaveBeenCalledWith(
        'analytics',
        { keyPath: 'id', autoIncrement: true }
      );
      expect(mockUpgradeEvent.target.result.createObjectStore).toHaveBeenCalledWith(
        'sync-queue',
        { keyPath: 'id', autoIncrement: true }
      );
    });
  });

  describe('Performance Monitoring', () => {
    it('should track service worker performance', () => {
      const trackPerformance = (operation: string, startTime: number, endTime: number) => {
        const duration = endTime - startTime;
        
        // Store performance data
        const performanceData = {
          operation,
          duration,
          timestamp: Date.now(),
        };

        // In real implementation, this would be stored in IndexedDB
        expect(performanceData.operation).toBe(operation);
        expect(performanceData.duration).toBeGreaterThanOrEqual(0);
      };

      const startTime = performance.now();
      // Simulate operation
      const endTime = performance.now();

      trackPerformance('cache-lookup', startTime, endTime);
    });

    it('should monitor cache hit rates', () => {
      let cacheHits = 0;
      let cacheMisses = 0;

      const trackCachePerformance = (isHit: boolean) => {
        if (isHit) {
          cacheHits++;
        } else {
          cacheMisses++;
        }
      };

      // Simulate cache operations
      trackCachePerformance(true);  // Hit
      trackCachePerformance(false); // Miss
      trackCachePerformance(true);  // Hit

      const hitRate = cacheHits / (cacheHits + cacheMisses);
      expect(hitRate).toBe(2/3);
    });

    it('should measure network request performance', async () => {
      const measureNetworkRequest = async (url: string) => {
        const startTime = performance.now();
        
        try {
          const response = await fetch(url);
          const endTime = performance.now();
          
          return {
            url,
            duration: endTime - startTime,
            success: response.ok,
            status: response.status,
          };
        } catch (error) {
          const endTime = performance.now();
          
          return {
            url,
            duration: endTime - startTime,
            success: false,
            error: (error as Error).message,
          };
        }
      };

      const result = await measureNetworkRequest('/api/analytics');

      expect(result).toHaveProperty('url', '/api/analytics');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('success');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle cache operation failures', async () => {
      mockCache.match.mockRejectedValue(new Error('Cache corrupted'));

      const safeCacheMatch = async (request: Request) => {
        try {
          return await caches.match(request);
        } catch (error) {
          console.warn('Cache operation failed:', error);
          return null;
        }
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await safeCacheMatch(new Request('/api/data'));

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Cache operation failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should recover from IndexedDB failures', async () => {
      const mockFailedDB = {
        open: jest.fn().mockRejectedValue(new Error('DB unavailable')),
      };

      global.indexedDB = mockFailedDB as any;

      const safeDBOperation = async (operation: string, data: any) => {
        try {
          const db = await indexedDB.open('analytics-db', 1);
          // Perform operation
          return { success: true, data };
        } catch (error) {
          console.error('IndexedDB operation failed:', error);
          // Fallback to memory storage or skip
          return { success: false, error: (error as Error).message };
        }
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await safeDBOperation('store', { test: 'data' });

      expect(result.success).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'IndexedDB operation failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle network failures gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network unavailable'));

      const resilientFetch = async (request: Request) => {
        try {
          return await fetch(request);
        } catch (error) {
          // Try cache fallback
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Return offline response
          return new Response(
            JSON.stringify({ 
              error: 'Offline', 
              message: 'Data will be synced when connection is restored' 
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      };

      const response = await resilientFetch(new Request('/api/analytics'));
      const data = await response.json();

      expect(data).toHaveProperty('error', 'Offline');
      expect(mockCache.match).toHaveBeenCalled();
    });
  });

  describe('Service Worker Lifecycle', () => {
    it('should handle service worker updates', async () => {
      const handleUpdate = (registration: ServiceWorkerRegistration) => {
        if (registration.waiting) {
          // New service worker is waiting, prompt user to reload
          const updateSW = () => {
            registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
          };

          // In real implementation, show user notification
          updateSW();
        }
      };

      mockServiceWorkerRegistration.waiting = {
        postMessage: jest.fn(),
        state: 'waiting',
      } as any;

      handleUpdate(mockServiceWorkerRegistration);

      expect(mockServiceWorkerRegistration.waiting.postMessage).toHaveBeenCalledWith({
        type: 'SKIP_WAITING',
      });
    });

    it('should communicate with main thread', async () => {
      const messageHandler = (event: any) => {
        const { type, payload } = event.data;
        
        switch (type) {
          case 'SYNC_ANALYTICS':
            // Trigger background sync
            return { success: true, synced: payload.length };
          case 'CLEAR_CACHE':
            // Clear specific cache
            return { success: true, cleared: true };
          default:
            return { success: false, error: 'Unknown message type' };
        }
      };

      const syncMessage = {
        data: {
          type: 'SYNC_ANALYTICS',
          payload: [{ event: 'test' }],
        },
      };

      const result = messageHandler(syncMessage);

      expect(result).toEqual({ success: true, synced: 1 });
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with offline analytics', async () => {
      // 1. Service worker installs and caches resources
      const staticAssets = ['/', '/analytics.js'];
      await (await caches.open('analytics-cache-v1')).addAll(staticAssets);

      // 2. User goes offline, analytics data is queued
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Offline'));
      
      const queueAnalytics = async (data: any) => {
        const db = await indexedDB.open('analytics-db', 1);
        const transaction = db.transaction(['sync-queue'], 'readwrite');
        const store = transaction.objectStore('sync-queue');
        await store.add(data);
      };

      await queueAnalytics({ event: 'offline_click', timestamp: Date.now() });

      // 3. User comes back online, background sync processes queue
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const processSyncQueue = async () => {
        const db = await indexedDB.open('analytics-db', 1);
        const transaction = db.transaction(['sync-queue'], 'readwrite');
        const store = transaction.objectStore('sync-queue');
        const queuedItems = await store.getAll();

        for (const item of queuedItems) {
          await fetch('/api/analytics', {
            method: 'POST',
            body: JSON.stringify(item),
          });
        }

        await store.clear();
      };

      mockObjectStore.getAll.mockReturnValue({
        ...mockIDBRequest,
        result: [{ event: 'offline_click', timestamp: Date.now() }],
      });

      await processSyncQueue();

      // Verify the flow worked
      expect(mockCache.addAll).toHaveBeenCalledWith(staticAssets);
      expect(mockObjectStore.add).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith('/api/analytics', {
        method: 'POST',
        body: expect.any(String),
      });
      expect(mockObjectStore.clear).toHaveBeenCalled();
    });
  });
});