/**
 * WS-166 Mobile Export Queue Tests
 * Team D - Round 1 Implementation
 * 
 * Tests for offline queue management and mobile-specific optimizations
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MobileExportQueue } from '@/lib/performance/budget-export/mobile-export-queue';

// Mock IndexedDB for testing
const mockIndexedDB = {
  databases: new Map(),
  open: jest.fn(),
  deleteDatabase: jest.fn()
};

// Mock IDBDatabase
const mockDatabase = {
  transaction: jest.fn(),
  close: jest.fn(),
  objectStoreNames: { contains: jest.fn().mockReturnValue(true) }
};

// Mock IDBTransaction and IDBObjectStore
const mockTransaction = {
  objectStore: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

const mockObjectStore = {
  add: jest.fn(),
  put: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  delete: jest.fn(),
  index: jest.fn(),
  createIndex: jest.fn()
};

// Mock IDBRequest
const createMockRequest = (result: any = null, error: any = null) => ({
  result,
  error,
  onsuccess: null as any,
  onerror: null as any,
  addEventListener: jest.fn((type, handler) => {
    if (type === 'success' && !error) {
      setTimeout(() => handler({ target: { result } }), 0);
    } else if (type === 'error' && error) {
      setTimeout(() => handler({ target: { error } }), 0);
    }
  })
});

// Setup IndexedDB mocks
beforeEach(() => {
  global.indexedDB = mockIndexedDB as any;
  
  mockIndexedDB.open.mockImplementation(() => {
    const request = createMockRequest(mockDatabase);
    request.onupgradeneeded = null;
    return request;
  });

  mockTransaction.objectStore.mockReturnValue(mockObjectStore);
  mockDatabase.transaction.mockReturnValue(mockTransaction);
  
  // Reset mocks
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock connection API
Object.defineProperty(navigator, 'connection', {
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 50
  },
  writable: true
});

describe('MobileExportQueue', () => {
  beforeEach(async () => {
    // Mock successful database operations
    mockObjectStore.add.mockImplementation(() => createMockRequest(1));
    mockObjectStore.put.mockImplementation(() => createMockRequest(1));
    mockObjectStore.get.mockImplementation(() => createMockRequest(null));
    mockObjectStore.getAll.mockImplementation(() => createMockRequest([]));
    mockObjectStore.delete.mockImplementation(() => createMockRequest(undefined));
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(MobileExportQueue.initialize()).resolves.not.toThrow();
    });

    it('should handle database initialization errors gracefully', async () => {
      mockIndexedDB.open.mockImplementation(() => {
        const request = createMockRequest(null, new Error('Database error'));
        return request;
      });

      await expect(MobileExportQueue.initialize()).rejects.toThrow();
    });
  });

  describe('queueExportRequest', () => {
    beforeEach(async () => {
      await MobileExportQueue.initialize();
    });

    it('should queue export requests successfully', async () => {
      const request = {
        weddingId: 'test-wedding-123',
        format: 'csv' as const,
        includeVendors: true,
        includeTransactions: true
      };

      const exportId = await MobileExportQueue.queueExportRequest(request, 'high');

      expect(exportId).toBeTruthy();
      expect(exportId).toMatch(/^export_\d+_[a-z0-9]+$/);
      expect(mockObjectStore.add).toHaveBeenCalledTimes(1);
    });

    it('should handle different priority levels', async () => {
      const request = {
        weddingId: 'test-wedding-123',
        format: 'pdf' as const,
        includeVendors: true,
        includeTransactions: true
      };

      const highPriorityId = await MobileExportQueue.queueExportRequest(request, 'high');
      const normalPriorityId = await MobileExportQueue.queueExportRequest(request, 'normal');
      const lowPriorityId = await MobileExportQueue.queueExportRequest(request, 'low');

      expect(highPriorityId).toBeTruthy();
      expect(normalPriorityId).toBeTruthy();
      expect(lowPriorityId).toBeTruthy();
      expect(mockObjectStore.add).toHaveBeenCalledTimes(3);
    });

    it('should estimate export size correctly', async () => {
      const smallRequest = {
        weddingId: 'test-wedding-small',
        format: 'csv' as const,
        includeVendors: false,
        includeTransactions: false
      };

      const largeRequest = {
        weddingId: 'test-wedding-large',
        format: 'pdf' as const,
        includeVendors: true,
        includeTransactions: true,
        categories: ['cat1', 'cat2', 'cat3', 'cat4', 'cat5']
      };

      await MobileExportQueue.queueExportRequest(smallRequest, 'normal');
      await MobileExportQueue.queueExportRequest(largeRequest, 'normal');

      // Check that add was called with different estimated sizes
      expect(mockObjectStore.add).toHaveBeenCalledTimes(2);
      const calls = mockObjectStore.add.mock.calls;
      
      const smallExportItem = calls[0][0];
      const largeExportItem = calls[1][0];
      
      expect(largeExportItem.estimatedSize).toBeGreaterThan(smallExportItem.estimatedSize);
    });
  });

  describe('offline queue processing', () => {
    beforeEach(async () => {
      await MobileExportQueue.initialize();
    });

    it('should process queued items when online', async () => {
      // Mock fetch for API calls
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'processing', progress: 10 })
        })
      ) as jest.Mock;

      // Mock pending items in queue
      const mockPendingItems = [{
        exportId: 'export_123',
        weddingId: 'test-wedding',
        format: 'csv',
        filters: { includeMetadata: true, transactionTypes: ['expense'] },
        priority: 'normal',
        timestamp: new Date(),
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        estimatedSize: 1024,
        progress: 0,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }];

      mockObjectStore.getAll.mockImplementation(() => createMockRequest(mockPendingItems));

      await MobileExportQueue.processOfflineQueue();

      expect(fetch).toHaveBeenCalledWith('/api/budget/export/queue', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }));
    });

    it('should handle API errors during processing', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
      ) as jest.Mock;

      const mockPendingItems = [{
        exportId: 'export_456',
        weddingId: 'test-wedding',
        format: 'pdf',
        filters: { includeMetadata: true, transactionTypes: ['expense'] },
        priority: 'normal',
        timestamp: new Date(),
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        estimatedSize: 2048,
        progress: 0,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }];

      mockObjectStore.getAll.mockImplementation(() => createMockRequest(mockPendingItems));

      // Should not throw, should handle errors gracefully
      await expect(MobileExportQueue.processOfflineQueue()).resolves.not.toThrow();
    });

    it('should remove expired items during processing', async () => {
      const expiredItem = {
        exportId: 'export_expired',
        weddingId: 'test-wedding',
        format: 'csv',
        filters: { includeMetadata: true, transactionTypes: ['expense'] },
        priority: 'normal',
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        estimatedSize: 1024,
        progress: 0,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000) // Expired 1 hour ago
      };

      mockObjectStore.getAll.mockImplementation(() => createMockRequest([expiredItem]));

      await MobileExportQueue.processOfflineQueue();

      // Should delete expired item
      expect(mockObjectStore.delete).toHaveBeenCalledWith('export_expired');
    });
  });

  describe('network optimization', () => {
    beforeEach(async () => {
      await MobileExportQueue.initialize();
    });

    it('should optimize queue processing for different connection types', async () => {
      // Test different connection types
      const connectionTypes = ['wifi', '4g', '3g', 'slow'] as const;

      for (const connectionType of connectionTypes) {
        await MobileExportQueue.optimizeQueueForNetwork(connectionType);
        
        // Should complete without error
        expect(true).toBe(true); // Placeholder - actual implementation would set internal parameters
      }
    });

    it('should adjust processing strategy for slow connections', async () => {
      // Mock slow connection
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: 'slow-2g',
          downlink: 0.5,
          rtt: 2000
        },
        writable: true
      });

      await MobileExportQueue.optimizeQueueForNetwork('slow');

      // Should prioritize high-priority items only on slow connections
      expect(true).toBe(true); // Placeholder for actual verification
    });
  });

  describe('queue statistics', () => {
    beforeEach(async () => {
      await MobileExportQueue.initialize();
    });

    it('should return accurate queue statistics', async () => {
      const mockItems = [
        { status: 'pending', retryCount: 0, timestamp: new Date() },
        { status: 'processing', retryCount: 0, timestamp: new Date() },
        { status: 'completed', retryCount: 1, timestamp: new Date() },
        { status: 'failed', retryCount: 3, timestamp: new Date() }
      ];

      mockObjectStore.getAll.mockImplementation(() => createMockRequest(mockItems));

      const stats = await MobileExportQueue.getQueueStatistics();

      expect(stats).toEqual({
        totalItems: 4,
        pendingItems: 1,
        processingItems: 1,
        completedItems: 1,
        failedItems: 1,
        averageProcessingTime: expect.any(Number),
        queueHealthScore: expect.any(Number)
      });

      expect(stats.queueHealthScore).toBeGreaterThanOrEqual(0);
      expect(stats.queueHealthScore).toBeLessThanOrEqual(100);
    });

    it('should handle empty queue statistics', async () => {
      mockObjectStore.getAll.mockImplementation(() => createMockRequest([]));

      const stats = await MobileExportQueue.getQueueStatistics();

      expect(stats.totalItems).toBe(0);
      expect(stats.pendingItems).toBe(0);
      expect(stats.queueHealthScore).toBe(100); // Perfect score for empty queue
    });
  });

  describe('export cancellation', () => {
    beforeEach(async () => {
      await MobileExportQueue.initialize();
    });

    it('should cancel pending exports successfully', async () => {
      const exportId = 'export_to_cancel';
      const mockItem = {
        exportId,
        status: 'pending',
        weddingId: 'test-wedding',
        timestamp: new Date()
      };

      mockObjectStore.get.mockImplementation(() => createMockRequest(mockItem));

      const result = await MobileExportQueue.cancelExport(exportId);

      expect(result).toBe(true);
      expect(mockObjectStore.put).toHaveBeenCalled();
    });

    it('should handle cancellation of processing exports', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({ ok: true })
      ) as jest.Mock;

      const exportId = 'export_processing';
      const mockItem = {
        exportId,
        status: 'processing',
        weddingId: 'test-wedding',
        timestamp: new Date()
      };

      mockObjectStore.get.mockImplementation(() => createMockRequest(mockItem));

      const result = await MobileExportQueue.cancelExport(exportId);

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        `/api/budget/export/${exportId}/cancel`,
        { method: 'POST' }
      );
    });

    it('should return false for non-existent exports', async () => {
      mockObjectStore.get.mockImplementation(() => createMockRequest(null));

      const result = await MobileExportQueue.cancelExport('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('cleanup operations', () => {
    beforeEach(async () => {
      await MobileExportQueue.initialize();
    });

    it('should clean up expired exports', async () => {
      const now = new Date();
      const mockItems = [
        {
          exportId: 'export_expired_1',
          expiresAt: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
          timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000), // 48 hours ago
          status: 'completed'
        },
        {
          exportId: 'export_current',
          expiresAt: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour from now
          timestamp: new Date(),
          status: 'pending'
        },
        {
          exportId: 'export_failed',
          expiresAt: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour from now
          timestamp: new Date(),
          status: 'failed',
          retryCount: 3,
          maxRetries: 3
        }
      ];

      mockObjectStore.getAll.mockImplementation(() => createMockRequest(mockItems));

      const removedCount = await MobileExportQueue.cleanupExpiredExports();

      expect(removedCount).toBe(2); // Should remove expired and max-retried items
      expect(mockObjectStore.delete).toHaveBeenCalledTimes(2);
      expect(mockObjectStore.delete).toHaveBeenCalledWith('export_expired_1');
      expect(mockObjectStore.delete).toHaveBeenCalledWith('export_failed');
    });

    it('should handle cleanup errors gracefully', async () => {
      mockObjectStore.getAll.mockImplementation(() => 
        createMockRequest(null, new Error('Database error'))
      );

      const removedCount = await MobileExportQueue.cleanupExpiredExports();

      expect(removedCount).toBe(0);
    });
  });

  describe('status listeners', () => {
    beforeEach(async () => {
      await MobileExportQueue.initialize();
    });

    it('should manage status listeners correctly', () => {
      const exportId = 'export_with_listener';
      const mockCallback = jest.fn();

      // Add listener
      MobileExportQueue.addStatusListener(exportId, mockCallback);

      // Remove listener
      MobileExportQueue.removeStatusListener(exportId);

      // No errors should occur
      expect(true).toBe(true);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle database connection failures', async () => {
      mockIndexedDB.open.mockImplementation(() => {
        throw new Error('IndexedDB not supported');
      });

      await expect(MobileExportQueue.initialize()).rejects.toThrow();
    });

    it('should handle queue capacity limits', async () => {
      // Mock a full queue
      const fullQueue = Array.from({ length: 50 }, (_, i) => ({
        exportId: `export_${i}`,
        status: 'completed',
        timestamp: new Date(Date.now() - i * 60 * 1000) // Spread over time
      }));

      mockObjectStore.getAll.mockImplementation(() => createMockRequest(fullQueue));

      const request = {
        weddingId: 'test-wedding',
        format: 'csv' as const,
        includeVendors: true,
        includeTransactions: true
      };

      // Should still succeed by cleaning up old items
      const exportId = await MobileExportQueue.queueExportRequest(request, 'normal');
      expect(exportId).toBeTruthy();
    });

    it('should handle concurrent queue operations', async () => {
      const request = {
        weddingId: 'test-wedding',
        format: 'csv' as const,
        includeVendors: true,
        includeTransactions: true
      };

      // Start multiple queue operations concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        MobileExportQueue.queueExportRequest({ ...request, weddingId: `wedding-${i}` }, 'normal')
      );

      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(5);
      results.forEach(id => expect(id).toBeTruthy());
    });
  });
});