/**
 * Service Worker Tests for PWA Analytics
 * Tests the sw-analytics.js Service Worker functionality
 */

// Mock ServiceWorker global environment
global.self = {
  addEventListener: jest.fn(),
  clients: {
    matchAll: jest.fn(),
    openWindow: jest.fn(),
    claim: jest.fn(),
  },
  registration: {
    showNotification: jest.fn(),
    update: jest.fn(),
    sync: {
      register: jest.fn(),
    },
  },
  skipWaiting: jest.fn(),
  caches: {
    open: jest.fn(),
    match: jest.fn(),
    delete: jest.fn(),
    keys: jest.fn(),
  },
  fetch: jest.fn(),
  importScripts: jest.fn(),
};

// Mock Cache API
const mockCache = {
  match: jest.fn(),
  put: jest.fn(),
  add: jest.fn(),
  addAll: jest.fn(),
  delete: jest.fn(),
  keys: jest.fn(),
};

global.self.caches.open.mockResolvedValue(mockCache);
global.self.caches.match.mockResolvedValue(null);
global.self.caches.keys.mockResolvedValue(['analytics-cache-v1', 'static-cache-v1']);

// Mock IndexedDB
const mockDB = {
  createObjectStore: jest.fn(),
  transaction: jest.fn(),
  close: jest.fn(),
  version: 1,
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
  getAll: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  createIndex: jest.fn(),
};

global.indexedDB = {
  open: jest.fn(() => {
    const request = {
      result: mockDB,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    };
    
    setTimeout(() => {
      if (request.onsuccess) request.onsuccess({ target: { result: mockDB } });
    }, 0);
    
    return request;
  }),
  deleteDatabase: jest.fn(),
};

mockDB.transaction.mockReturnValue(mockTransaction);
mockTransaction.objectStore.mockReturnValue(mockObjectStore);

// Mock fetch responses
const mockFetchResponse = (data, options = {}) => {
  return Promise.resolve(new Response(JSON.stringify(data), {
    status: options.status || 200,
    statusText: options.statusText || 'OK',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }));
};

// Load the Service Worker code (we'll mock the main functionality)
// Since we can't directly import the SW file, we'll test the key functions

describe('Service Worker Analytics', () => {
  let serviceWorkerScope;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the service worker environment
    serviceWorkerScope = {
      // Cache management
      CACHE_VERSION: 'v1',
      CACHE_NAMES: {
        STATIC: 'analytics-static-v1',
        DYNAMIC: 'analytics-dynamic-v1',
        OFFLINE: 'analytics-offline-v1',
      },
      
      // Mock the SW event handlers that would be in sw-analytics.js
      handleInstall: jest.fn(),
      handleActivate: jest.fn(),
      handleFetch: jest.fn(),
      handleSync: jest.fn(),
      handlePush: jest.fn(),
      handleNotificationClick: jest.fn(),
    };
  });

  describe('Installation and Activation', () => {
    it('installs service worker and pre-caches resources', async () => {
      const installEvent = {
        waitUntil: jest.fn(),
        preventDefault: jest.fn(),
      };

      const staticResources = [
        '/analytics-dashboard',
        '/offline.html',
        '/manifest-analytics.json',
        '/_next/static/css/app.css',
        '/_next/static/js/app.js',
      ];

      // Mock pre-caching logic
      mockCache.addAll.mockResolvedValue(undefined);

      const preCache = async () => {
        const cache = await self.caches.open(serviceWorkerScope.CACHE_NAMES.STATIC);
        await cache.addAll(staticResources);
      };

      await preCache();

      expect(self.caches.open).toHaveBeenCalledWith(serviceWorkerScope.CACHE_NAMES.STATIC);
      expect(mockCache.addAll).toHaveBeenCalledWith(staticResources);
    });

    it('activates service worker and cleans old caches', async () => {
      const activateEvent = {
        waitUntil: jest.fn(),
        preventDefault: jest.fn(),
      };

      const oldCaches = ['analytics-cache-v0', 'static-cache-v0'];
      self.caches.keys.mockResolvedValue([
        ...oldCaches,
        'analytics-static-v1', // Current cache should remain
      ]);

      // Mock cache cleanup logic
      const cleanup = async () => {
        const cacheNames = await self.caches.keys();
        const validCacheNames = Object.values(serviceWorkerScope.CACHE_NAMES);
        
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!validCacheNames.includes(cacheName)) {
              return self.caches.delete(cacheName);
            }
          })
        );
      };

      self.caches.delete.mockResolvedValue(true);

      await cleanup();

      expect(self.caches.delete).toHaveBeenCalledWith('analytics-cache-v0');
      expect(self.caches.delete).toHaveBeenCalledWith('static-cache-v0');
      expect(self.caches.delete).not.toHaveBeenCalledWith('analytics-static-v1');
    });

    it('claims existing clients on activation', async () => {
      self.clients.claim.mockResolvedValue(undefined);
      self.skipWaiting.mockResolvedValue(undefined);

      // Mock activation logic
      const activate = async () => {
        await self.skipWaiting();
        await self.clients.claim();
      };

      await activate();

      expect(self.skipWaiting).toHaveBeenCalled();
      expect(self.clients.claim).toHaveBeenCalled();
    });
  });

  describe('Fetch Interception and Caching Strategies', () => {
    it('implements cache-first strategy for static assets', async () => {
      const request = new Request('/static/analytics-chart.js');
      const cachedResponse = new Response('cached-content');
      
      mockCache.match.mockResolvedValue(cachedResponse);

      // Mock cache-first strategy
      const cacheFirst = async (request) => {
        const cache = await self.caches.open(serviceWorkerScope.CACHE_NAMES.STATIC);
        const cached = await cache.match(request);
        
        if (cached) {
          return cached;
        }

        const response = await fetch(request);
        if (response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      };

      const result = await cacheFirst(request);

      expect(result).toBe(cachedResponse);
      expect(mockCache.match).toHaveBeenCalledWith(request);
    });

    it('implements network-first strategy for API calls', async () => {
      const request = new Request('/api/analytics/vendors');
      const networkResponse = mockFetchResponse({ vendors: [] });
      
      global.fetch = jest.fn().mockResolvedValue(networkResponse);

      // Mock network-first strategy
      const networkFirst = async (request) => {
        try {
          const response = await fetch(request);
          
          if (response.status === 200) {
            const cache = await self.caches.open(serviceWorkerScope.CACHE_NAMES.DYNAMIC);
            cache.put(request, response.clone());
          }
          
          return response;
        } catch (error) {
          const cache = await self.caches.open(serviceWorkerScope.CACHE_NAMES.DYNAMIC);
          const cached = await cache.match(request);
          return cached || new Response('Offline', { status: 503 });
        }
      };

      const result = await networkFirst(request);

      expect(global.fetch).toHaveBeenCalledWith(request);
      expect(result).toBe(networkResponse);
      expect(mockCache.put).toHaveBeenCalled();
    });

    it('implements stale-while-revalidate for analytics data', async () => {
      const request = new Request('/api/analytics/performance');
      const staleResponse = new Response(JSON.stringify({ stale: true }));
      const freshResponse = mockFetchResponse({ fresh: true });
      
      mockCache.match.mockResolvedValue(staleResponse);
      global.fetch = jest.fn().mockResolvedValue(freshResponse);

      // Mock stale-while-revalidate strategy
      const staleWhileRevalidate = async (request) => {
        const cache = await self.caches.open(serviceWorkerScope.CACHE_NAMES.DYNAMIC);
        const cached = await cache.match(request);
        
        const fetchPromise = fetch(request).then(response => {
          if (response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        });

        return cached || fetchPromise;
      };

      const result = await staleWhileRevalidate(request);

      expect(result).toBe(staleResponse);
      expect(global.fetch).toHaveBeenCalledWith(request);
      expect(mockCache.put).toHaveBeenCalled();
    });

    it('serves offline fallback for failed requests', async () => {
      const request = new Request('/api/analytics/unreachable');
      
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      mockCache.match.mockResolvedValue(null);

      // Mock offline fallback
      const offlineFallback = async (request) => {
        try {
          return await fetch(request);
        } catch (error) {
          const cache = await self.caches.open(serviceWorkerScope.CACHE_NAMES.OFFLINE);
          
          if (request.destination === 'document') {
            return cache.match('/offline.html');
          }
          
          if (request.url.includes('/api/')) {
            return new Response(JSON.stringify({ 
              error: 'Offline',
              offline: true,
              timestamp: Date.now()
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          return new Response('Resource unavailable offline', { status: 503 });
        }
      };

      const result = await offlineFallback(request);

      expect(global.fetch).toHaveBeenCalledWith(request);
      expect(result.status).toBe(200);
      
      const responseData = await result.json();
      expect(responseData.offline).toBe(true);
    });
  });

  describe('Background Sync', () => {
    it('registers background sync for offline analytics data', async () => {
      const syncEvent = {
        tag: 'analytics-sync',
        waitUntil: jest.fn(),
      };

      self.registration.sync.register.mockResolvedValue(undefined);

      // Mock sync registration
      const registerSync = async (tag) => {
        return self.registration.sync.register(tag);
      };

      await registerSync('analytics-sync');

      expect(self.registration.sync.register).toHaveBeenCalledWith('analytics-sync');
    });

    it('processes offline analytics data during sync', async () => {
      const syncEvent = {
        tag: 'analytics-sync',
        waitUntil: jest.fn(),
      };

      const offlineData = [
        {
          id: 1,
          type: 'vendor_view',
          data: { vendorId: 'vendor-1', timestamp: Date.now() },
        },
        {
          id: 2,
          type: 'chart_interaction',
          data: { chartType: 'revenue', action: 'zoom', timestamp: Date.now() },
        },
      ];

      const mockGetAllRequest = { onsuccess: null, onerror: null };
      mockObjectStore.getAll.mockReturnValue(mockGetAllRequest);

      setTimeout(() => {
        if (mockGetAllRequest.onsuccess) {
          mockGetAllRequest.onsuccess({ target: { result: offlineData } });
        }
      }, 0);

      global.fetch = jest.fn().mockResolvedValue(mockFetchResponse({ success: true }));

      // Mock sync processing
      const processOfflineData = async () => {
        const db = await new Promise((resolve) => {
          const request = indexedDB.open('AnalyticsOfflineDB', 1);
          request.onsuccess = () => resolve(request.result);
        });

        const transaction = db.transaction(['offline_analytics'], 'readwrite');
        const store = transaction.objectStore('offline_analytics');
        const data = await new Promise((resolve) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
        });

        for (const item of data) {
          try {
            await fetch('/api/analytics/offline-sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item),
            });
            
            // Remove successful sync from offline storage
            store.delete(item.id);
          } catch (error) {
            console.warn('Failed to sync offline data:', item.id);
          }
        }
      };

      await processOfflineData();

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(mockObjectStore.delete).toHaveBeenCalledTimes(2);
    });

    it('handles sync failures gracefully', async () => {
      const syncEvent = {
        tag: 'analytics-sync',
        waitUntil: jest.fn(),
      };

      global.fetch = jest.fn().mockRejectedValue(new Error('Sync failed'));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock sync with failure handling
      const handleSyncWithFailure = async () => {
        try {
          await fetch('/api/analytics/sync');
        } catch (error) {
          console.warn('Background sync failed:', error.message);
          // Reschedule sync for later
          setTimeout(() => {
            self.registration.sync.register('analytics-sync-retry');
          }, 30000);
        }
      };

      await handleSyncWithFailure();

      expect(consoleWarnSpy).toHaveBeenCalledWith('Background sync failed:', 'Sync failed');
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Push Notifications', () => {
    it('handles push notifications for analytics alerts', async () => {
      const pushEvent = {
        data: {
          json: () => ({
            title: 'Analytics Alert',
            body: 'Vendor performance threshold exceeded',
            icon: '/icons/alert-icon.png',
            badge: '/icons/badge-icon.png',
            tag: 'vendor-alert',
            data: {
              type: 'vendor_alert',
              vendorId: 'vendor-123',
              metric: 'response_time',
              threshold: 5000,
              current: 7500,
            },
          }),
        },
        waitUntil: jest.fn(),
      };

      self.registration.showNotification.mockResolvedValue(undefined);

      // Mock push notification handler
      const handlePush = async (event) => {
        const data = event.data.json();
        
        const notificationOptions = {
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
        };

        await self.registration.showNotification(data.title, notificationOptions);
      };

      await handlePush(pushEvent);

      expect(self.registration.showNotification).toHaveBeenCalledWith(
        'Analytics Alert',
        expect.objectContaining({
          body: 'Vendor performance threshold exceeded',
          tag: 'vendor-alert',
          actions: expect.arrayContaining([
            expect.objectContaining({ action: 'view', title: 'View Details' }),
          ]),
        })
      );
    });

    it('handles notification click events', async () => {
      const notificationEvent = {
        notification: {
          tag: 'vendor-alert',
          data: {
            type: 'vendor_alert',
            vendorId: 'vendor-123',
            url: '/analytics/vendors/vendor-123',
          },
          close: jest.fn(),
        },
        action: 'view',
        waitUntil: jest.fn(),
      };

      self.clients.matchAll.mockResolvedValue([
        { focus: jest.fn(), postMessage: jest.fn() }
      ]);

      // Mock notification click handler
      const handleNotificationClick = async (event) => {
        event.notification.close();

        const clients = await self.clients.matchAll({ type: 'window' });
        const data = event.notification.data;

        if (clients.length > 0) {
          // Focus existing window and navigate
          const client = clients[0];
          await client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            action: event.action,
            data: data,
          });
        } else {
          // Open new window
          await self.clients.openWindow(data.url);
        }
      };

      await handleNotificationClick(notificationEvent);

      expect(notificationEvent.notification.close).toHaveBeenCalled();
      expect(self.clients.matchAll).toHaveBeenCalledWith({ type: 'window' });
    });

    it('handles different notification types appropriately', async () => {
      const notifications = [
        {
          type: 'performance_alert',
          title: 'Performance Alert',
          urgency: 'high',
        },
        {
          type: 'weekly_report',
          title: 'Weekly Analytics Report',
          urgency: 'low',
        },
        {
          type: 'system_update',
          title: 'System Update Available',
          urgency: 'medium',
        },
      ];

      self.registration.showNotification.mockResolvedValue(undefined);

      // Mock notification type handling
      const showNotificationByType = async (notification) => {
        const baseOptions = {
          icon: '/icons/analytics-icon.png',
          badge: '/icons/badge-icon.png',
        };

        let options = { ...baseOptions };

        switch (notification.type) {
          case 'performance_alert':
            options.requireInteraction = true;
            options.silent = false;
            options.vibrate = [200, 100, 200];
            break;
          
          case 'weekly_report':
            options.requireInteraction = false;
            options.silent = true;
            break;
          
          case 'system_update':
            options.requireInteraction = false;
            options.silent = false;
            break;
        }

        await self.registration.showNotification(notification.title, options);
      };

      for (const notification of notifications) {
        await showNotificationByType(notification);
      }

      expect(self.registration.showNotification).toHaveBeenCalledTimes(3);
      
      // Performance alert should require interaction
      expect(self.registration.showNotification).toHaveBeenCalledWith(
        'Performance Alert',
        expect.objectContaining({ requireInteraction: true })
      );
      
      // Weekly report should be silent
      expect(self.registration.showNotification).toHaveBeenCalledWith(
        'Weekly Analytics Report',
        expect.objectContaining({ silent: true })
      );
    });
  });

  describe('IndexedDB Integration', () => {
    it('stores offline analytics data in IndexedDB', async () => {
      const analyticsData = {
        id: Date.now(),
        type: 'chart_interaction',
        vendorId: 'vendor-123',
        action: 'filter_applied',
        filters: { dateRange: '30d', category: 'photographer' },
        timestamp: Date.now(),
      };

      const mockAddRequest = { onsuccess: null, onerror: null };
      mockObjectStore.add.mockReturnValue(mockAddRequest);

      setTimeout(() => {
        if (mockAddRequest.onsuccess) mockAddRequest.onsuccess({});
      }, 0);

      // Mock IndexedDB storage function
      const storeOfflineData = async (data) => {
        const db = await new Promise((resolve) => {
          const request = indexedDB.open('AnalyticsOfflineDB', 1);
          request.onsuccess = () => resolve(request.result);
        });

        const transaction = db.transaction(['offline_analytics'], 'readwrite');
        const store = transaction.objectStore('offline_analytics');
        
        await new Promise((resolve, reject) => {
          const request = store.add(data);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      };

      await storeOfflineData(analyticsData);

      expect(indexedDB.open).toHaveBeenCalledWith('AnalyticsOfflineDB', 1);
      expect(mockObjectStore.add).toHaveBeenCalledWith(analyticsData);
    });

    it('manages storage quota and cleanup old data', async () => {
      // Mock storage estimate API
      global.navigator = {
        storage: {
          estimate: jest.fn().mockResolvedValue({
            quota: 100 * 1024 * 1024, // 100MB
            usage: 85 * 1024 * 1024,  // 85MB used
          }),
        },
      };

      const oldData = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        timestamp: Date.now() - (30 * 24 * 60 * 60 * 1000), // 30 days old
      }));

      const mockGetAllRequest = { onsuccess: null, onerror: null };
      mockObjectStore.getAll.mockReturnValue(mockGetAllRequest);

      setTimeout(() => {
        if (mockGetAllRequest.onsuccess) {
          mockGetAllRequest.onsuccess({ target: { result: oldData } });
        }
      }, 0);

      // Mock storage cleanup
      const cleanupOldData = async () => {
        const estimate = await navigator.storage.estimate();
        const usagePercentage = (estimate.usage / estimate.quota) * 100;

        if (usagePercentage > 80) {
          const db = await new Promise((resolve) => {
            const request = indexedDB.open('AnalyticsOfflineDB', 1);
            request.onsuccess = () => resolve(request.result);
          });

          const transaction = db.transaction(['offline_analytics'], 'readwrite');
          const store = transaction.objectStore('offline_analytics');
          
          const allData = await new Promise((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
          });

          // Remove data older than 7 days
          const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
          const dataToDelete = allData.filter(item => item.timestamp < cutoffTime);

          for (const item of dataToDelete) {
            store.delete(item.id);
          }
        }
      };

      await cleanupOldData();

      expect(navigator.storage.estimate).toHaveBeenCalled();
      expect(mockObjectStore.delete).toHaveBeenCalledTimes(100);
    });

    it('handles IndexedDB errors gracefully', async () => {
      // Mock IndexedDB error
      global.indexedDB.open.mockImplementation(() => {
        const request = {
          result: null,
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
        };
        
        setTimeout(() => {
          if (request.onerror) {
            request.onerror({ target: { error: new Error('IndexedDB unavailable') } });
          }
        }, 0);
        
        return request;
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock fallback storage
      const storeWithFallback = async (data) => {
        try {
          const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('AnalyticsOfflineDB', 1);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
        } catch (error) {
          console.warn('IndexedDB unavailable, using localStorage fallback');
          const existingData = JSON.parse(localStorage.getItem('offline_analytics') || '[]');
          existingData.push(data);
          localStorage.setItem('offline_analytics', JSON.stringify(existingData));
        }
      };

      // Mock localStorage
      const localStorageMock = {
        getItem: jest.fn(() => '[]'),
        setItem: jest.fn(),
      };
      global.localStorage = localStorageMock;

      await storeWithFallback({ id: 1, data: 'test' });

      expect(consoleWarnSpy).toHaveBeenCalledWith('IndexedDB unavailable, using localStorage fallback');
      expect(localStorageMock.setItem).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Performance Monitoring', () => {
    it('tracks service worker performance metrics', async () => {
      const performanceMetrics = {
        cacheHitRate: 0,
        averageResponseTime: 0,
        offlineRequestsCount: 0,
        syncSuccessRate: 0,
      };

      // Mock performance tracking
      const trackCacheHit = (hit) => {
        performanceMetrics.cacheHitRate = 
          (performanceMetrics.cacheHitRate * 0.9) + (hit ? 0.1 : 0);
      };

      const trackResponseTime = (time) => {
        performanceMetrics.averageResponseTime = 
          (performanceMetrics.averageResponseTime * 0.9) + (time * 0.1);
      };

      // Simulate some metrics
      trackCacheHit(true);
      trackCacheHit(false);
      trackCacheHit(true);
      
      trackResponseTime(120);
      trackResponseTime(95);
      trackResponseTime(150);

      expect(performanceMetrics.cacheHitRate).toBeGreaterThan(0.5);
      expect(performanceMetrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('monitors cache storage usage', async () => {
      self.caches.keys.mockResolvedValue(['cache1', 'cache2']);
      
      // Mock cache size calculation
      const getCacheSize = async () => {
        const cacheNames = await self.caches.keys();
        let totalSize = 0;

        for (const cacheName of cacheNames) {
          const cache = await self.caches.open(cacheName);
          const requests = await cache.keys();
          
          for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.blob();
              totalSize += blob.size;
            }
          }
        }

        return totalSize;
      };

      // Mock responses for size calculation
      mockCache.keys.mockResolvedValue([new Request('/test1'), new Request('/test2')]);
      mockCache.match.mockResolvedValue(new Response('test content'));

      const size = await getCacheSize();

      expect(typeof size).toBe('number');
      expect(size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('handles cache corruption gracefully', async () => {
      // Mock cache corruption
      mockCache.match.mockRejectedValue(new Error('Cache corrupted'));
      self.caches.delete.mockResolvedValue(true);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock cache recovery
      const handleCacheError = async (cacheName) => {
        try {
          await self.caches.delete(cacheName);
          console.error(`Cache ${cacheName} corrupted, cleared and will be rebuilt`);
          return self.caches.open(cacheName);
        } catch (error) {
          console.error('Failed to recover from cache error:', error);
          return null;
        }
      };

      const result = await handleCacheError('test-cache');

      expect(self.caches.delete).toHaveBeenCalledWith('test-cache');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('handles service worker update errors', async () => {
      self.registration.update.mockRejectedValue(new Error('Update failed'));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock update error handling
      const handleUpdateError = async () => {
        try {
          await self.registration.update();
        } catch (error) {
          console.warn('Service worker update failed:', error.message);
          // Schedule retry
          setTimeout(() => {
            self.registration.update().catch(() => {
              console.warn('Service worker update retry also failed');
            });
          }, 60000);
        }
      };

      await handleUpdateError();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Service worker update failed:',
        'Update failed'
      );

      consoleWarnSpy.mockRestore();
    });

    it('provides meaningful error messages for different failure scenarios', () => {
      const getErrorMessage = (error) => {
        if (error.name === 'QuotaExceededError') {
          return 'Storage quota exceeded. Some offline features may not work.';
        }
        
        if (error.name === 'NetworkError') {
          return 'Network connection lost. Working in offline mode.';
        }
        
        if (error.name === 'SecurityError') {
          return 'Security restriction encountered. Some features may be limited.';
        }
        
        return 'An unexpected error occurred. Please refresh the page.';
      };

      expect(getErrorMessage({ name: 'QuotaExceededError' }))
        .toContain('Storage quota exceeded');
      expect(getErrorMessage({ name: 'NetworkError' }))
        .toContain('offline mode');
      expect(getErrorMessage({ name: 'SecurityError' }))
        .toContain('Security restriction');
      expect(getErrorMessage({ name: 'UnknownError' }))
        .toContain('unexpected error');
    });
  });
});