import { OfflineAnalyticsManager } from '@/lib/services/mobile/OfflineAnalyticsManager';
import { VendorMetrics, OfflineAnalyticsData } from '@/types/mobile-analytics';

// Mock IndexedDB
const mockIDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

const mockDB = {
  createObjectStore: jest.fn(),
  transaction: jest.fn(),
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
  getAll: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  createIndex: jest.fn(),
};

// Mock global indexedDB
Object.defineProperty(global, 'indexedDB', {
  value: mockIDB,
  writable: true,
});

// Mock crypto for encryption
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      generateKey: jest.fn().mockResolvedValue({
        algorithm: { name: 'AES-GCM' },
      }),
      encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
      decrypt: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
      exportKey: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
      importKey: jest.fn().mockResolvedValue({
        algorithm: { name: 'AES-GCM' },
      }),
    },
    getRandomValues: jest.fn().mockReturnValue(new Uint8Array(12)),
  },
  writable: true,
});

// Mock fetch for network operations
global.fetch = jest.fn();

describe('OfflineAnalyticsManager', () => {
  let manager: OfflineAnalyticsManager;
  
  const mockVendorData: VendorMetrics[] = [
    {
      id: '1',
      name: 'Elite Photography',
      type: 'photographer',
      performanceScore: 95,
      responseTime: 2.5,
      completionRate: 98,
      customerSatisfaction: 4.8,
      revenueGenerated: 45000,
      bookingsCount: 28,
      averageBookingValue: 1607,
      monthlyGrowth: 12.5,
      repeatClientRate: 85,
      onTimeDeliveryRate: 96,
      communicationScore: 92,
      qualityScore: 94,
      reliabilityScore: 88,
      lastUpdated: new Date('2024-01-15'),
      trends: {
        revenue: [35000, 40000, 45000],
        bookings: [22, 25, 28],
        satisfaction: [4.6, 4.7, 4.8],
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup IndexedDB mocks
    mockIDB.open.mockImplementation(() => {
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
    });
    
    mockDB.transaction.mockReturnValue(mockTransaction);
    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
    
    manager = OfflineAnalyticsManager.getInstance();
  });

  describe('Initialization', () => {
    it('creates singleton instance', () => {
      const instance1 = OfflineAnalyticsManager.getInstance();
      const instance2 = OfflineAnalyticsManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('initializes IndexedDB database', async () => {
      await manager.initialize('org-123');
      
      expect(mockIDB.open).toHaveBeenCalledWith('WedSyncOfflineAnalytics_org-123', 1);
    });

    it('creates object stores on database upgrade', async () => {
      mockIDB.open.mockImplementation(() => {
        const request = {
          result: mockDB,
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
        };
        
        setTimeout(() => {
          if (request.onupgradeneeded) {
            request.onupgradeneeded({ target: { result: mockDB } });
          }
          if (request.onsuccess) request.onsuccess({ target: { result: mockDB } });
        }, 0);
        
        return request;
      });
      
      await manager.initialize('org-123');
      
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('vendorMetrics', {
        keyPath: 'id',
      });
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('analyticsCache', {
        keyPath: 'key',
      });
    });

    it('handles database initialization errors', async () => {
      mockIDB.open.mockImplementation(() => {
        const request = {
          result: null,
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
        };
        
        setTimeout(() => {
          if (request.onerror) request.onerror(new Error('DB init failed'));
        }, 0);
        
        return request;
      });
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      await expect(manager.initialize('org-123')).rejects.toThrow('DB init failed');
      
      consoleError.mockRestore();
    });
  });

  describe('Data Storage', () => {
    beforeEach(async () => {
      await manager.initialize('org-123');
    });

    it('stores vendor metrics with encryption', async () => {
      const mockRequest = { onsuccess: null, onerror: null };
      mockObjectStore.put.mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onsuccess) mockRequest.onsuccess({});
      }, 0);
      
      await manager.storeVendorMetrics(mockVendorData);
      
      expect(global.crypto.subtle.encrypt).toHaveBeenCalled();
      expect(mockObjectStore.put).toHaveBeenCalled();
    });

    it('stores analytics queries for offline access', async () => {
      const queryData = {
        query: 'revenue-trend',
        params: { vendorId: '1', period: '3months' },
        result: mockVendorData,
        timestamp: Date.now(),
      };
      
      const mockRequest = { onsuccess: null, onerror: null };
      mockObjectStore.put.mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onsuccess) mockRequest.onsuccess({});
      }, 0);
      
      await manager.storeQueryResult('revenue-trend', queryData.params, queryData.result);
      
      expect(mockObjectStore.put).toHaveBeenCalled();
    });

    it('handles storage quota exceeded', async () => {
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      
      const mockRequest = { onsuccess: null, onerror: null };
      mockObjectStore.put.mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onerror) mockRequest.onerror({ target: { error: quotaError } });
      }, 0);
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      await manager.storeVendorMetrics(mockVendorData);
      
      expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('Storage quota exceeded'));
      
      consoleWarn.mockRestore();
    });

    it('implements data compression for large datasets', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockVendorData[0],
        id: `vendor-${i}`,
      }));
      
      const mockRequest = { onsuccess: null, onerror: null };
      mockObjectStore.put.mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onsuccess) mockRequest.onsuccess({});
      }, 0);
      
      await manager.storeVendorMetrics(largeDataset);
      
      // Should compress data before storage
      const storedData = mockObjectStore.put.mock.calls[0][0];
      expect(storedData).toHaveProperty('compressed', true);
    });
  });

  describe('Data Retrieval', () => {
    beforeEach(async () => {
      await manager.initialize('org-123');
    });

    it('retrieves and decrypts vendor metrics', async () => {
      const encryptedData = {
        id: 'vendor-metrics',
        data: new ArrayBuffer(16),
        iv: new Uint8Array(12),
        encrypted: true,
      };
      
      const mockRequest = { onsuccess: null, onerror: null };
      mockObjectStore.get.mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: { result: encryptedData } });
        }
      }, 0);
      
      // Mock decryption to return JSON string
      global.crypto.subtle.decrypt = jest.fn().mockResolvedValue(
        new TextEncoder().encode(JSON.stringify(mockVendorData))
      );
      
      const result = await manager.getVendorMetrics();
      
      expect(global.crypto.subtle.decrypt).toHaveBeenCalled();
      expect(result).toEqual(mockVendorData);
    });

    it('retrieves cached query results', async () => {
      const cachedQuery = {
        key: 'revenue-trend-vendor1',
        query: 'revenue-trend',
        params: { vendorId: '1' },
        result: mockVendorData,
        timestamp: Date.now() - 30000, // 30 seconds ago
      };
      
      const mockRequest = { onsuccess: null, onerror: null };
      mockObjectStore.get.mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: { result: cachedQuery } });
        }
      }, 0);
      
      const result = await manager.getCachedQuery('revenue-trend', { vendorId: '1' });
      
      expect(result).toEqual(mockVendorData);
    });

    it('handles cache expiration', async () => {
      const expiredQuery = {
        key: 'revenue-trend-vendor1',
        query: 'revenue-trend',
        params: { vendorId: '1' },
        result: mockVendorData,
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      };
      
      const mockRequest = { onsuccess: null, onerror: null };
      mockObjectStore.get.mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: { result: expiredQuery } });
        }
      }, 0);
      
      const result = await manager.getCachedQuery('revenue-trend', { vendorId: '1' });
      
      expect(result).toBeNull(); // Should return null for expired cache
    });

    it('returns null for missing data', async () => {
      const mockRequest = { onsuccess: null, onerror: null };
      mockObjectStore.get.mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: { result: undefined } });
        }
      }, 0);
      
      const result = await manager.getVendorMetrics();
      
      expect(result).toBeNull();
    });
  });

  describe('Synchronization', () => {
    beforeEach(async () => {
      await manager.initialize('org-123');
    });

    it('syncs data when online', async () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue(new Response(JSON.stringify(mockVendorData)));
      
      await manager.syncWithServer();
      
      expect(mockFetch).toHaveBeenCalledWith('/api/analytics/vendors', {
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      });
    });

    it('queues updates when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      
      await manager.queueOfflineUpdate({
        type: 'vendor_update',
        vendorId: '1',
        data: { performanceScore: 96 },
        timestamp: Date.now(),
      });
      
      const pendingUpdates = await manager.getPendingUpdates();
      expect(pendingUpdates).toHaveLength(1);
      expect(pendingUpdates[0].type).toBe('vendor_update');
    });

    it('handles sync conflicts with server', async () => {
      const serverData = [
        { ...mockVendorData[0], performanceScore: 97, lastUpdated: new Date('2024-01-16') },
      ];
      
      const localData = [
        { ...mockVendorData[0], performanceScore: 96, lastUpdated: new Date('2024-01-15') },
      ];
      
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue(new Response(JSON.stringify(serverData)));
      
      // Mock local data retrieval
      const mockRequest = { onsuccess: null, onerror: null };
      mockObjectStore.getAll.mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: { result: localData } });
        }
      }, 0);
      
      const conflicts = await manager.syncWithServer();
      
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].resolution).toBe('server_wins'); // Server data is newer
    });

    it('implements exponential backoff for failed sync attempts', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      jest.useFakeTimers();
      
      const syncPromise = manager.syncWithServer();
      
      // Should retry with increasing delays
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000); // First retry: 1s
      
      jest.advanceTimersByTime(1000);
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000); // Second retry: 2s
      
      jest.advanceTimersByTime(2000);
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 4000); // Third retry: 4s
      
      jest.useRealTimers();
    });
  });

  describe('Memory Management', () => {
    beforeEach(async () => {
      await manager.initialize('org-123');
    });

    it('monitors storage usage', async () => {
      const mockEstimate = {
        usage: 50 * 1024 * 1024, // 50MB
        quota: 100 * 1024 * 1024, // 100MB
      };
      
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: jest.fn().mockResolvedValue(mockEstimate),
        },
        writable: true,
      });
      
      const usage = await manager.getStorageUsage();
      
      expect(usage.used).toBe(50 * 1024 * 1024);
      expect(usage.available).toBe(100 * 1024 * 1024);
      expect(usage.percentUsed).toBe(50);
    });

    it('implements LRU eviction when storage is full', async () => {
      // Mock storage near capacity
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: jest.fn().mockResolvedValue({
            usage: 95 * 1024 * 1024, // 95MB
            quota: 100 * 1024 * 1024, // 100MB
          }),
        },
        writable: true,
      });
      
      const mockRequest = { onsuccess: null, onerror: null };
      mockObjectStore.getAll.mockReturnValue(mockRequest);
      
      const oldCacheEntries = [
        { key: 'old-query-1', timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000 }, // 7 days old
        { key: 'old-query-2', timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 }, // 3 days old
      ];
      
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: { result: oldCacheEntries } });
        }
      }, 0);
      
      await manager.cleanupOldData();
      
      expect(mockObjectStore.delete).toHaveBeenCalledWith('old-query-1'); // Oldest should be deleted first
    });

    it('compresses data to save space', async () => {
      const largeVendorData = Array.from({ length: 100 }, (_, i) => ({
        ...mockVendorData[0],
        id: `vendor-${i}`,
        description: 'A'.repeat(1000), // Large text field
      }));
      
      const compressed = await manager.compressData(largeVendorData);
      const decompressed = await manager.decompressData(compressed);
      
      expect(compressed.byteLength).toBeLessThan(JSON.stringify(largeVendorData).length);
      expect(decompressed).toEqual(largeVendorData);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await manager.initialize('org-123');
    });

    it('handles IndexedDB transaction errors', async () => {
      const mockRequest = { onsuccess: null, onerror: null };
      mockObjectStore.put.mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onerror) {
          mockRequest.onerror({ target: { error: new Error('Transaction failed') } });
        }
      }, 0);
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      await expect(manager.storeVendorMetrics(mockVendorData)).rejects.toThrow('Transaction failed');
      
      consoleError.mockRestore();
    });

    it('handles encryption errors gracefully', async () => {
      global.crypto.subtle.encrypt = jest.fn().mockRejectedValue(new Error('Encryption failed'));
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      await manager.storeVendorMetrics(mockVendorData);
      
      expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('Encryption failed'));
      // Should store data unencrypted as fallback
      expect(mockObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({ encrypted: false })
      );
      
      consoleWarn.mockRestore();
    });

    it('recovers from database corruption', async () => {
      mockIDB.deleteDatabase.mockResolvedValue(undefined);
      
      const corruptionError = new Error('Database corrupted');
      mockDB.transaction.mockImplementation(() => {
        throw corruptionError;
      });
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      await manager.handleDatabaseCorruption();
      
      expect(mockIDB.deleteDatabase).toHaveBeenCalled();
      expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('Database corrupted'));
      
      consoleWarn.mockRestore();
    });
  });
});