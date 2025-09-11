/**
 * WS-243 PWA Functionality Tests
 * Team D - Progressive Web App Testing Suite
 * 
 * CORE TEST COVERAGE:
 * - Service worker registration and lifecycle
 * - Offline message queuing and synchronization
 * - Cache management and strategies
 * - Background sync functionality
 * - Push notifications
 * - IndexedDB storage operations
 * - Network resilience testing
 * 
 * @version 1.0.0
 * @author WedSync Team D - Mobile Chat Integration
 */

import { jest } from '@jest/globals';

// Mock service worker and related APIs
const mockServiceWorker = {
  register: jest.fn(),
  update: jest.fn(),
  unregister: jest.fn()
};

const mockCaches = {
  open: jest.fn(),
  delete: jest.fn(),
  keys: jest.fn(),
  match: jest.fn()
};

const mockCache = {
  add: jest.fn(),
  addAll: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  keys: jest.fn(),
  match: jest.fn()
};

const mockRegistration = {
  sync: {
    register: jest.fn()
  },
  showNotification: jest.fn(),
  getNotifications: jest.fn()
};

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn()
};

const mockDatabase = {
  transaction: jest.fn(),
  close: jest.fn(),
  deleteObjectStore: jest.fn(),
  createObjectStore: jest.fn()
};

const mockTransaction = {
  objectStore: jest.fn(),
  oncomplete: null,
  onerror: null,
  onabort: null
};

const mockObjectStore = {
  add: jest.fn(),
  put: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  createIndex: jest.fn()
};

// Setup global mocks
global.navigator = {
  ...global.navigator,
  serviceWorker: mockServiceWorker,
  onLine: true
};

global.caches = mockCaches as any;
global.indexedDB = mockIndexedDB as any;

describe('PWA Functionality Tests', () => {
  let mockSWRegistration: typeof mockRegistration;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset all mocks to their default behavior
    mockCaches.open.mockResolvedValue(mockCache);
    mockCaches.keys.mockResolvedValue(['wedsync-chat-v2.0.0']);
    mockCache.addAll.mockResolvedValue(undefined);
    mockCache.match.mockResolvedValue(null);
    
    mockIndexedDB.open.mockImplementation(() => {
      const request = {
        result: mockDatabase,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null
      };
      
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess({ target: request } as any);
      }, 0);
      
      return request;
    });
    
    mockDatabase.transaction.mockReturnValue(mockTransaction);
    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
    
    mockSWRegistration = mockRegistration;
  });

  describe('Service Worker Registration', () => {
    it('registers service worker successfully', async () => {
      mockServiceWorker.register.mockResolvedValue(mockSWRegistration);

      const registration = await navigator.serviceWorker.register('/sw-chat.js');
      
      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw-chat.js');
      expect(registration).toBe(mockSWRegistration);
    });

    it('handles service worker registration failure', async () => {
      const registrationError = new Error('Service worker registration failed');
      mockServiceWorker.register.mockRejectedValue(registrationError);

      await expect(navigator.serviceWorker.register('/sw-chat.js')).rejects.toThrow(
        'Service worker registration failed'
      );
    });

    it('updates service worker when new version available', async () => {
      mockServiceWorker.register.mockResolvedValue(mockSWRegistration);
      mockSWRegistration.update = jest.fn().mockResolvedValue(undefined);

      const registration = await navigator.serviceWorker.register('/sw-chat.js');
      await registration.update();

      expect(mockSWRegistration.update).toHaveBeenCalled();
    });
  });

  describe('Cache Management', () => {
    it('opens cache and stores assets', async () => {
      const chatAssets = [
        '/chat',
        '/icons/chat-notification.png',
        '/offline-chat.html'
      ];

      const cache = await caches.open('wedsync-chat-v2.0.0');
      await cache.addAll(chatAssets);

      expect(mockCaches.open).toHaveBeenCalledWith('wedsync-chat-v2.0.0');
      expect(mockCache.addAll).toHaveBeenCalledWith(chatAssets);
    });

    it('retrieves cached assets', async () => {
      const mockResponse = new Response('cached content');
      mockCache.match.mockResolvedValue(mockResponse);

      const cache = await caches.open('wedsync-chat-v2.0.0');
      const cachedResponse = await cache.match('/chat');

      expect(mockCache.match).toHaveBeenCalledWith('/chat');
      expect(cachedResponse).toBe(mockResponse);
    });

    it('cleans up old cache versions', async () => {
      const oldCaches = ['wedsync-chat-v1.0.0', 'wedsync-chat-v2.0.0'];
      mockCaches.keys.mockResolvedValue(oldCaches);
      mockCaches.delete.mockResolvedValue(true);

      const cacheKeys = await caches.keys();
      const deletionPromises = cacheKeys
        .filter(key => key !== 'wedsync-chat-v2.0.0' && key.startsWith('wedsync-chat-'))
        .map(key => caches.delete(key));

      await Promise.all(deletionPromises);

      expect(mockCaches.delete).toHaveBeenCalledWith('wedsync-chat-v1.0.0');
      expect(mockCaches.delete).not.toHaveBeenCalledWith('wedsync-chat-v2.0.0');
    });

    it('handles cache storage quota exceeded', async () => {
      const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
      mockCache.addAll.mockRejectedValue(quotaError);

      const cache = await caches.open('wedsync-chat-v2.0.0');
      
      await expect(cache.addAll(['/large-asset'])).rejects.toThrow('Quota exceeded');
    });
  });

  describe('Offline Message Queuing', () => {
    it('stores messages in IndexedDB when offline', async () => {
      const testMessage = {
        id: 'msg-123',
        content: 'Test offline message',
        timestamp: new Date(),
        weddingId: 'wedding-123'
      };

      mockObjectStore.add.mockResolvedValue(undefined);

      // Simulate opening database
      const dbRequest = indexedDB.open('wedsync_chat_sw', 1);
      
      return new Promise((resolve) => {
        dbRequest.onsuccess = async () => {
          const db = dbRequest.result;
          const transaction = db.transaction(['queuedRequests'], 'readwrite');
          const store = transaction.objectStore('queuedRequests');
          
          await store.add(testMessage);
          
          expect(mockObjectStore.add).toHaveBeenCalledWith(testMessage);
          resolve(undefined);
        };
      });
    });

    it('retrieves queued messages from IndexedDB', async () => {
      const queuedMessages = [
        { id: 'msg-1', content: 'Message 1', timestamp: new Date() },
        { id: 'msg-2', content: 'Message 2', timestamp: new Date() }
      ];

      mockObjectStore.getAll.mockResolvedValue(queuedMessages);

      const dbRequest = indexedDB.open('wedsync_chat_sw', 1);
      
      return new Promise((resolve) => {
        dbRequest.onsuccess = async () => {
          const db = dbRequest.result;
          const transaction = db.transaction(['queuedRequests'], 'readonly');
          const store = transaction.objectStore('queuedRequests');
          
          const messages = await store.getAll();
          
          expect(mockObjectStore.getAll).toHaveBeenCalled();
          expect(messages).toEqual(queuedMessages);
          resolve(undefined);
        };
      });
    });

    it('removes messages from queue after successful sync', async () => {
      mockObjectStore.delete.mockResolvedValue(undefined);

      const dbRequest = indexedDB.open('wedsync_chat_sw', 1);
      
      return new Promise((resolve) => {
        dbRequest.onsuccess = async () => {
          const db = dbRequest.result;
          const transaction = db.transaction(['queuedRequests'], 'readwrite');
          const store = transaction.objectStore('queuedRequests');
          
          await store.delete('msg-123');
          
          expect(mockObjectStore.delete).toHaveBeenCalledWith('msg-123');
          resolve(undefined);
        };
      });
    });
  });

  describe('Background Sync', () => {
    it('registers background sync for chat messages', async () => {
      mockSWRegistration.sync.register.mockResolvedValue(undefined);

      await mockSWRegistration.sync.register('chat-sync');

      expect(mockSWRegistration.sync.register).toHaveBeenCalledWith('chat-sync');
    });

    it('handles background sync failure', async () => {
      const syncError = new Error('Background sync not supported');
      mockSWRegistration.sync.register.mockRejectedValue(syncError);

      await expect(mockSWRegistration.sync.register('chat-sync')).rejects.toThrow(
        'Background sync not supported'
      );
    });

    it('processes queued messages during background sync', async () => {
      const queuedMessages = [
        {
          id: 'req-1',
          url: '/api/chat/mobile',
          method: 'POST',
          body: JSON.stringify({ message: 'Test message' }),
          headers: { 'Content-Type': 'application/json' }
        }
      ];

      mockObjectStore.getAll.mockResolvedValue(queuedMessages);
      mockObjectStore.delete.mockResolvedValue(undefined);

      // Mock fetch for successful sync
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      // Simulate background sync event processing
      const syncPromises = queuedMessages.map(async (queuedRequest) => {
        const response = await fetch(queuedRequest.url, {
          method: queuedRequest.method,
          headers: queuedRequest.headers,
          body: queuedRequest.body
        });

        if (response.ok) {
          // Remove from queue
          const dbRequest = indexedDB.open('wedsync_chat_sw', 1);
          return new Promise((resolve) => {
            dbRequest.onsuccess = async () => {
              const db = dbRequest.result;
              const transaction = db.transaction(['queuedRequests'], 'readwrite');
              const store = transaction.objectStore('queuedRequests');
              await store.delete(queuedRequest.id);
              resolve({ success: true, id: queuedRequest.id });
            };
          });
        }

        return { success: false, id: queuedRequest.id };
      });

      const results = await Promise.all(syncPromises);

      expect(results[0]).toEqual({ success: true, id: 'req-1' });
      expect(global.fetch).toHaveBeenCalledWith('/api/chat/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test message' })
      });
    });
  });

  describe('Push Notifications', () => {
    it('shows push notification', async () => {
      const notificationData = {
        title: 'New Wedding Message',
        body: 'You have a new message from your photographer',
        icon: '/icons/chat-notification.png',
        tag: 'wedding-chat-notification'
      };

      mockSWRegistration.showNotification.mockResolvedValue(undefined);

      await mockSWRegistration.showNotification(notificationData.title, {
        body: notificationData.body,
        icon: notificationData.icon,
        tag: notificationData.tag
      });

      expect(mockSWRegistration.showNotification).toHaveBeenCalledWith(
        notificationData.title,
        expect.objectContaining({
          body: notificationData.body,
          icon: notificationData.icon,
          tag: notificationData.tag
        })
      );
    });

    it('handles notification permission denied', async () => {
      // Mock Notification API
      global.Notification = {
        permission: 'denied',
        requestPermission: jest.fn().mockResolvedValue('denied')
      } as any;

      const permission = await Notification.requestPermission();
      expect(permission).toBe('denied');
    });

    it('clears notifications by tag', async () => {
      const notifications = [
        { tag: 'wedsync-chat-msg-1', close: jest.fn() },
        { tag: 'wedsync-chat-msg-2', close: jest.fn() }
      ];

      mockSWRegistration.getNotifications.mockResolvedValue(notifications);

      const existingNotifications = await mockSWRegistration.getNotifications({
        tag: 'wedsync-chat-msg-1'
      });

      existingNotifications.forEach((notification: any) => {
        notification.close();
      });

      expect(notifications[0].close).toHaveBeenCalled();
    });
  });

  describe('Network Resilience', () => {
    it('detects online/offline status changes', () => {
      const onlineHandler = jest.fn();
      const offlineHandler = jest.fn();

      // Mock event listeners
      const addEventListener = jest.fn();
      global.window = {
        ...global.window,
        addEventListener
      } as any;

      window.addEventListener('online', onlineHandler);
      window.addEventListener('offline', offlineHandler);

      expect(addEventListener).toHaveBeenCalledWith('online', onlineHandler);
      expect(addEventListener).toHaveBeenCalledWith('offline', offlineHandler);
    });

    it('handles intermittent connectivity', async () => {
      // Simulate network going offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

      expect(navigator.onLine).toBe(false);

      // Mock queuing message while offline
      const offlineMessage = {
        id: 'offline-msg-1',
        content: 'Message sent while offline',
        timestamp: new Date()
      };

      mockObjectStore.add.mockResolvedValue(undefined);

      // Queue the message
      const dbRequest = indexedDB.open('wedsync_chat_sw', 1);
      
      return new Promise((resolve) => {
        dbRequest.onsuccess = async () => {
          const db = dbRequest.result;
          const transaction = db.transaction(['queuedRequests'], 'readwrite');
          const store = transaction.objectStore('queuedRequests');
          
          await store.add(offlineMessage);
          
          // Network comes back online
          Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
          
          expect(navigator.onLine).toBe(true);
          expect(mockObjectStore.add).toHaveBeenCalledWith(offlineMessage);
          resolve(undefined);
        };
      });
    });

    it('retries failed requests with exponential backoff', async () => {
      const failedRequest = {
        id: 'retry-req-1',
        url: '/api/chat/mobile',
        method: 'POST',
        retryCount: 0
      };

      // Mock fetch to fail initially, then succeed
      global.fetch = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });

      const maxRetries = 3;
      let currentRetry = 0;

      const attemptRequest = async (): Promise<boolean> => {
        try {
          const response = await fetch(failedRequest.url, {
            method: failedRequest.method
          });
          return response.ok;
        } catch (error) {
          currentRetry++;
          if (currentRetry < maxRetries) {
            // Exponential backoff: wait 2^currentRetry seconds
            const delay = Math.pow(2, currentRetry) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            return attemptRequest();
          }
          throw error;
        }
      };

      const success = await attemptRequest();
      
      expect(success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Storage Management', () => {
    it('estimates available storage', async () => {
      // Mock Storage API
      global.navigator.storage = {
        estimate: jest.fn().mockResolvedValue({
          quota: 50000000, // 50MB
          usage: 5000000,  // 5MB
          usageDetails: {
            indexedDB: 3000000,
            caches: 2000000
          }
        })
      } as any;

      const estimate = await navigator.storage.estimate();

      expect(estimate.quota).toBe(50000000);
      expect(estimate.usage).toBe(5000000);
      expect(estimate.usageDetails?.indexedDB).toBe(3000000);
    });

    it('handles storage quota exceeded gracefully', async () => {
      const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
      mockObjectStore.add.mockRejectedValue(quotaError);

      const dbRequest = indexedDB.open('wedsync_chat_sw', 1);
      
      return new Promise((resolve, reject) => {
        dbRequest.onsuccess = async () => {
          try {
            const db = dbRequest.result;
            const transaction = db.transaction(['queuedRequests'], 'readwrite');
            const store = transaction.objectStore('queuedRequests');
            
            await store.add({ id: 'large-message', data: 'x'.repeat(10000000) });
            reject(new Error('Should have thrown quota error'));
          } catch (error) {
            expect((error as Error).name).toBe('QuotaExceededError');
            resolve(undefined);
          }
        };
      });
    });

    it('cleans up old stored messages', async () => {
      const oldMessages = [
        { id: 'old-1', timestamp: Date.now() - (7 * 24 * 60 * 60 * 1000) }, // 7 days old
        { id: 'recent-1', timestamp: Date.now() - (1 * 60 * 60 * 1000) }     // 1 hour old
      ];

      mockObjectStore.getAll.mockResolvedValue(oldMessages);
      mockObjectStore.delete.mockResolvedValue(undefined);

      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      const now = Date.now();

      // Simulate cleanup process
      const dbRequest = indexedDB.open('wedsync_chat_sw', 1);
      
      return new Promise((resolve) => {
        dbRequest.onsuccess = async () => {
          const db = dbRequest.result;
          const transaction = db.transaction(['queuedRequests'], 'readwrite');
          const store = transaction.objectStore('queuedRequests');
          
          const allMessages = await store.getAll();
          const expiredMessages = allMessages.filter(msg => now - msg.timestamp > maxAge);
          
          for (const expiredMsg of expiredMessages) {
            await store.delete(expiredMsg.id);
          }
          
          expect(mockObjectStore.delete).toHaveBeenCalledWith('old-1');
          expect(mockObjectStore.delete).not.toHaveBeenCalledWith('recent-1');
          resolve(undefined);
        };
      });
    });
  });

  describe('Performance Optimization', () => {
    it('implements efficient cache strategies', async () => {
      const cacheFirst = async (request: string) => {
        const cache = await caches.open('wedsync-chat-v2.0.0');
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
          // Update cache in background
          fetch(request).then(response => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
          }).catch(() => {
            // Silently fail background update
          });
          
          return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
      };

      const mockResponse = new Response('cached content');
      mockCache.match.mockResolvedValue(mockResponse);
      global.fetch = jest.fn().mockResolvedValue(new Response('fresh content'));

      const response = await cacheFirst('/chat-asset.js');

      expect(response).toBe(mockResponse);
      expect(mockCache.match).toHaveBeenCalledWith('/chat-asset.js');
    });

    it('batches IndexedDB operations for performance', async () => {
      const messages = [
        { id: 'batch-1', content: 'Message 1' },
        { id: 'batch-2', content: 'Message 2' },
        { id: 'batch-3', content: 'Message 3' }
      ];

      mockObjectStore.add.mockResolvedValue(undefined);

      // Simulate batched operations
      const dbRequest = indexedDB.open('wedsync_chat_sw', 1);
      
      return new Promise((resolve) => {
        dbRequest.onsuccess = async () => {
          const db = dbRequest.result;
          const transaction = db.transaction(['queuedRequests'], 'readwrite');
          const store = transaction.objectStore('queuedRequests');
          
          // Batch all operations in single transaction
          const addPromises = messages.map(msg => store.add(msg));
          await Promise.all(addPromises);
          
          expect(mockObjectStore.add).toHaveBeenCalledTimes(3);
          resolve(undefined);
        };
      });
    });
  });
});

// Helper functions for PWA testing
export const mockServiceWorkerEnvironment = () => {
  // Mock service worker global scope
  global.self = {
    ...global.self,
    addEventListener: jest.fn(),
    skipWaiting: jest.fn().mockResolvedValue(undefined),
    clients: {
      claim: jest.fn().mockResolvedValue(undefined),
      matchAll: jest.fn().mockResolvedValue([]),
      openWindow: jest.fn().mockResolvedValue({})
    },
    registration: mockRegistration
  } as any;
};

export const simulateNetworkConditions = (online: boolean, effectiveType?: string) => {
  Object.defineProperty(navigator, 'onLine', { value: online, writable: true });
  
  if (effectiveType) {
    Object.defineProperty(navigator, 'connection', {
      value: { effectiveType },
      writable: true
    });
  }
};

export const createMockPushEvent = (data: any) => ({
  data: {
    json: () => data,
    text: () => JSON.stringify(data)
  },
  waitUntil: jest.fn()
});

export const createMockSyncEvent = (tag: string) => ({
  tag,
  waitUntil: jest.fn()
});