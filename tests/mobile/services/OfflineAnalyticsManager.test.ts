import { jest } from '@jest/globals';
import { OfflineAnalyticsManager } from '../../../src/lib/services/mobile/OfflineAnalyticsManager';
import { VendorMetrics, OfflineAnalyticsData, SyncConflict } from '../../../src/types/mobile-analytics';

// Mock IndexedDB
const mockIDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

const mockDB = {
  transaction: jest.fn(),
  createObjectStore: jest.fn(),
  close: jest.fn(),
  version: 1,
  name: 'AnalyticsDB',
};

const mockTransaction = {
  objectStore: jest.fn(),
  oncomplete: null,
  onerror: null,
  onabort: null,
};

const mockObjectStore = {
  add: jest.fn(),
  put: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  getAll: jest.fn(),
  count: jest.fn(),
  createIndex: jest.fn(),
  index: jest.fn(),
};

const mockRequest = {
  result: null,
  error: null,
  onsuccess: null,
  onerror: null,
};

// Setup IndexedDB mocks
global.indexedDB = mockIDB as any;
global.IDBKeyRange = {
  bound: jest.fn(),
  only: jest.fn(),
  lowerBound: jest.fn(),
  upperBound: jest.fn(),
} as any;

// Mock crypto for encryption
const mockCrypto = {
  subtle: {
    generateKey: jest.fn(),
    exportKey: jest.fn(),
    importKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  },
  getRandomValues: jest.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
};

global.crypto = mockCrypto as any;

// Mock fetch
global.fetch = jest.fn();

// Mock network status
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
});

// Mock data
const mockVendorData: VendorMetrics[] = [
  {
    id: 'vendor1',
    name: 'Photography Studio A',
    type: 'photographer',
    overallScore: 8.5,
    responseTime: 2.5,
    clientSatisfaction: 9.2,
    completionRate: 95,
    revenue: 125000,
    bookingsCount: 45,
    averageBookingValue: 2777.78,
    lastActive: new Date('2025-01-14T10:00:00Z'),
    performanceTrend: 'improving',
    communicationScore: 8.8,
    punctualityScore: 9.1,
    qualityScore: 8.9,
    valueScore: 8.3,
    reviewsCount: 127,
    averageRating: 4.6,
    monthlyGrowth: 12.5,
    repeatClientRate: 68,
    referralRate: 23,
  },
];

const mockOfflineData: OfflineAnalyticsData = {
  vendors: mockVendorData,
  chartData: [
    { timestamp: new Date('2025-01-01'), value: 8.2, label: 'Jan 1' },
    { timestamp: new Date('2025-01-02'), value: 8.5, label: 'Jan 2' },
  ],
  lastSync: new Date('2025-01-14T10:00:00Z'),
  version: 1,
  checksum: 'abc123',
  compressed: false,
  metadata: {
    source: 'api',
    userId: 'user1',
    organizationId: 'org1',
  },
};

describe('OfflineAnalyticsManager', () => {
  let manager: OfflineAnalyticsManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset IndexedDB mocks
    mockIDB.open.mockReturnValue({
      ...mockRequest,
      result: mockDB,
    });
    
    mockDB.transaction.mockReturnValue(mockTransaction);
    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
    
    mockObjectStore.get.mockReturnValue({
      ...mockRequest,
      result: mockOfflineData,
    });
    
    mockObjectStore.put.mockReturnValue({
      ...mockRequest,
      result: 'vendor1',
    });
    
    mockObjectStore.getAll.mockReturnValue({
      ...mockRequest,
      result: [mockOfflineData],
    });

    // Mock crypto operations
    mockCrypto.subtle.generateKey.mockResolvedValue({
      algorithm: { name: 'AES-GCM', length: 256 },
    } as any);
    
    mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(16));
    mockCrypto.subtle.decrypt.mockResolvedValue(new TextEncoder().encode('decrypted data'));

    // Mock fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockVendorData),
    });

    manager = OfflineAnalyticsManager.getInstance();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = OfflineAnalyticsManager.getInstance();
      const instance2 = OfflineAnalyticsManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('should initialize IndexedDB on first access', async () => {
      await manager.isOnline();
      
      expect(mockIDB.open).toHaveBeenCalledWith('AnalyticsDB', expect.any(Number));
    });

    it('should handle IndexedDB initialization errors', async () => {
      mockIDB.open.mockReturnValue({
        ...mockRequest,
        error: new Error('DB initialization failed'),
      });

      // Trigger initialization
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await manager.cacheData('test-key', mockOfflineData);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize IndexedDB:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should create object stores during setup', async () => {
      const mockUpgradeNeeded = {
        ...mockRequest,
        result: { ...mockDB, version: 0 },
      };
      
      mockIDB.open.mockReturnValue(mockUpgradeNeeded);
      
      // Simulate onupgradeneeded event
      setTimeout(() => {
        if (mockUpgradeNeeded.onupgradeneeded) {
          mockUpgradeNeeded.onupgradeneeded({
            target: { result: mockDB },
          } as any);
        }
      }, 0);
      
      await manager.isOnline();
      
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('analytics', {
        keyPath: 'key',
      });
    });
  });

  describe('Network Status', () => {
    it('should detect online status', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      
      const isOnline = manager.isOnline();
      
      expect(isOnline).toBe(true);
    });

    it('should detect offline status', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      const isOnline = manager.isOnline();
      
      expect(isOnline).toBe(false);
    });

    it('should listen for network status changes', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      manager = OfflineAnalyticsManager.getInstance();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should sync data when coming back online', async () => {
      const syncSpy = jest.spyOn(manager, 'syncData');
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      window.dispatchEvent(new Event('online'));
      
      // Allow async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(syncSpy).toHaveBeenCalled();
    });
  });

  describe('Data Caching', () => {
    it('should cache data with encryption', async () => {
      await manager.cacheData('test-key', mockOfflineData);
      
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
      expect(mockObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test-key',
          encrypted: true,
          data: expect.any(ArrayBuffer),
        })
      );
    });

    it('should cache data without encryption when disabled', async () => {
      await manager.cacheData('test-key', mockOfflineData, { encrypt: false });
      
      expect(mockCrypto.subtle.encrypt).not.toHaveBeenCalled();
      expect(mockObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test-key',
          encrypted: false,
          data: mockOfflineData,
        })
      );
    });

    it('should compress data when caching large datasets', async () => {
      const largeData = {
        ...mockOfflineData,
        vendors: Array.from({ length: 1000 }, () => mockVendorData[0]),
      };
      
      await manager.cacheData('large-data', largeData);
      
      expect(mockObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          compressed: true,
        })
      );
    });

    it('should handle caching errors gracefully', async () => {
      mockObjectStore.put.mockReturnValue({
        ...mockRequest,
        error: new Error('Storage quota exceeded'),
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await manager.cacheData('test-key', mockOfflineData);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to cache data:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Data Retrieval', () => {
    it('should retrieve cached data', async () => {
      const result = await manager.getCachedData('test-key');
      
      expect(mockObjectStore.get).toHaveBeenCalledWith('test-key');
      expect(result).toEqual(mockOfflineData);
    });

    it('should decrypt cached data', async () => {
      mockObjectStore.get.mockReturnValue({
        ...mockRequest,
        result: {
          key: 'test-key',
          data: new ArrayBuffer(16),
          encrypted: true,
          timestamp: Date.now(),
        },
      });
      
      await manager.getCachedData('test-key');
      
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
    });

    it('should decompress cached data', async () => {
      mockObjectStore.get.mockReturnValue({
        ...mockRequest,
        result: {
          key: 'test-key',
          data: mockOfflineData,
          compressed: true,
          encrypted: false,
          timestamp: Date.now(),
        },
      });
      
      const result = await manager.getCachedData('test-key');
      
      expect(result).toBeDefined();
    });

    it('should return null for non-existent keys', async () => {
      mockObjectStore.get.mockReturnValue({
        ...mockRequest,
        result: undefined,
      });
      
      const result = await manager.getCachedData('non-existent');
      
      expect(result).toBeNull();
    });

    it('should handle retrieval errors gracefully', async () => {
      mockObjectStore.get.mockReturnValue({
        ...mockRequest,
        error: new Error('Database error'),
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = await manager.getCachedData('test-key');
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to retrieve cached data:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Data Synchronization', () => {
    it('should sync cached data to server when online', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      
      await manager.syncData();
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/sync'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should not sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      await manager.syncData();
      
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle sync conflicts', async () => {
      const conflictData: SyncConflict = {
        localVersion: 1,
        serverVersion: 2,
        localData: mockOfflineData,
        serverData: { ...mockOfflineData, version: 2 },
        conflictType: 'version_mismatch',
        resolution: 'server_wins',
      };
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ conflict: conflictData }),
      });
      
      const result = await manager.syncData();
      
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toEqual(conflictData);
    });

    it('should retry failed sync operations', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      
      await manager.syncData({ retryAttempts: 2 });
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should batch sync requests for performance', async () => {
      const multipleData = Array.from({ length: 10 }, (_, i) => ({
        key: `data-${i}`,
        data: mockOfflineData,
      }));
      
      mockObjectStore.getAll.mockReturnValue({
        ...mockRequest,
        result: multipleData,
      });
      
      await manager.syncData({ batchSize: 5 });
      
      // Should make multiple batch requests
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Storage Management', () => {
    it('should monitor storage quota', async () => {
      const mockNavigator = {
        storage: {
          estimate: jest.fn().mockResolvedValue({
            usage: 50 * 1024 * 1024, // 50MB
            quota: 100 * 1024 * 1024, // 100MB
          }),
        },
      };
      
      Object.defineProperty(navigator, 'storage', {
        value: mockNavigator.storage,
        writable: true,
      });
      
      const quota = await manager.getStorageQuota();
      
      expect(quota).toEqual({
        used: 50 * 1024 * 1024,
        available: 100 * 1024 * 1024,
        usagePercentage: 50,
      });
    });

    it('should clean old data when storage is full', async () => {
      const mockNavigator = {
        storage: {
          estimate: jest.fn().mockResolvedValue({
            usage: 95 * 1024 * 1024, // 95MB (95% full)
            quota: 100 * 1024 * 1024, // 100MB
          }),
        },
      };
      
      Object.defineProperty(navigator, 'storage', {
        value: mockNavigator.storage,
        writable: true,
      });
      
      const oldData = Array.from({ length: 5 }, (_, i) => ({
        key: `old-data-${i}`,
        timestamp: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days old
      }));
      
      mockObjectStore.getAll.mockReturnValue({
        ...mockRequest,
        result: oldData,
      });
      
      await manager.cleanupOldData();
      
      expect(mockObjectStore.delete).toHaveBeenCalledTimes(5);
    });

    it('should prioritize data based on usage frequency', async () => {
      const dataWithUsage = [
        { key: 'frequent', accessCount: 100, timestamp: Date.now() },
        { key: 'rare', accessCount: 2, timestamp: Date.now() },
        { key: 'medium', accessCount: 50, timestamp: Date.now() },
      ];
      
      mockObjectStore.getAll.mockReturnValue({
        ...mockRequest,
        result: dataWithUsage,
      });
      
      await manager.cleanupOldData({ strategy: 'lru' });
      
      // Should delete least recently used first
      expect(mockObjectStore.delete).toHaveBeenCalledWith('rare');
    });
  });

  describe('Background Sync', () => {
    it('should register service worker for background sync', async () => {
      const mockServiceWorker = {
        register: jest.fn().mockResolvedValue({
          sync: {
            register: jest.fn(),
          },
        }),
      };
      
      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockServiceWorker,
        writable: true,
      });
      
      await manager.enableBackgroundSync();
      
      expect(mockServiceWorker.register).toHaveBeenCalled();
    });

    it('should handle background sync events', async () => {
      const syncEvent = new Event('sync');
      Object.assign(syncEvent, { tag: 'analytics-sync' });
      
      const syncSpy = jest.spyOn(manager, 'syncData');
      
      // Simulate background sync event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(syncEvent);
      }
      
      expect(syncSpy).toHaveBeenCalled();
    });

    it('should schedule periodic background sync', async () => {
      jest.useFakeTimers();
      
      await manager.enableBackgroundSync({ interval: 5 * 60 * 1000 }); // 5 minutes
      
      const syncSpy = jest.spyOn(manager, 'syncData');
      
      jest.advanceTimersByTime(5 * 60 * 1000);
      
      expect(syncSpy).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('Data Validation', () => {
    it('should validate data before caching', async () => {
      const invalidData = {
        vendors: 'invalid', // Should be array
        chartData: null,
      } as any;
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await manager.cacheData('invalid-key', invalidData);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Data validation failed for key:',
        'invalid-key'
      );
      expect(mockObjectStore.put).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should check data integrity with checksums', async () => {
      const dataWithChecksum = {
        ...mockOfflineData,
        checksum: 'invalid-checksum',
      };
      
      mockObjectStore.get.mockReturnValue({
        ...mockRequest,
        result: {
          key: 'test-key',
          data: dataWithChecksum,
          encrypted: false,
          timestamp: Date.now(),
        },
      });
      
      const result = await manager.getCachedData('test-key');
      
      expect(result).toBeNull(); // Should return null for corrupted data
    });

    it('should repair corrupted data when possible', async () => {
      const corruptedData = {
        ...mockOfflineData,
        vendors: undefined, // Missing required field
      };
      
      mockObjectStore.get.mockReturnValue({
        ...mockRequest,
        result: {
          key: 'test-key',
          data: corruptedData,
          encrypted: false,
          timestamp: Date.now(),
        },
      });
      
      const result = await manager.getCachedData('test-key', { repairCorrupted: true });
      
      expect(result?.vendors).toEqual([]); // Should repair with default value
    });
  });

  describe('Performance Monitoring', () => {
    it('should track cache hit/miss ratios', async () => {
      // Hit
      await manager.getCachedData('existing-key');
      
      // Miss
      mockObjectStore.get.mockReturnValue({
        ...mockRequest,
        result: undefined,
      });
      await manager.getCachedData('non-existent-key');
      
      const metrics = manager.getPerformanceMetrics();
      
      expect(metrics.cacheHitRatio).toBeCloseTo(0.5, 2); // 50%
    });

    it('should monitor sync performance', async () => {
      const startTime = Date.now();
      
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          }), 100);
        })
      );
      
      await manager.syncData();
      
      const metrics = manager.getPerformanceMetrics();
      
      expect(metrics.avgSyncDuration).toBeGreaterThanOrEqual(100);
    });

    it('should track storage usage over time', async () => {
      const mockNavigator = {
        storage: {
          estimate: jest.fn().mockResolvedValue({
            usage: 25 * 1024 * 1024,
            quota: 100 * 1024 * 1024,
          }),
        },
      };
      
      Object.defineProperty(navigator, 'storage', {
        value: mockNavigator.storage,
        writable: true,
      });
      
      await manager.cacheData('test-key', mockOfflineData);
      
      const metrics = manager.getPerformanceMetrics();
      
      expect(metrics.storageUsage).toBeDefined();
      expect(metrics.storageUsage.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from database corruption', async () => {
      mockIDB.open.mockReturnValue({
        ...mockRequest,
        error: { name: 'VersionError' },
      });
      
      const deleteDbSpy = mockIDB.deleteDatabase.mockResolvedValue(undefined);
      
      await manager.cacheData('test-key', mockOfflineData);
      
      expect(deleteDbSpy).toHaveBeenCalledWith('AnalyticsDB');
      expect(mockIDB.open).toHaveBeenCalledTimes(2); // Original + retry
    });

    it('should fallback to localStorage when IndexedDB fails', async () => {
      mockIDB.open.mockRejectedValue(new Error('IndexedDB not available'));
      
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem')
        .mockReturnValue(JSON.stringify(mockOfflineData));
      
      await manager.cacheData('test-key', mockOfflineData);
      const result = await manager.getCachedData('test-key');
      
      expect(setItemSpy).toHaveBeenCalled();
      expect(getItemSpy).toHaveBeenCalled();
      expect(result).toEqual(mockOfflineData);
      
      setItemSpy.mockRestore();
      getItemSpy.mockRestore();
    });

    it('should queue operations during database unavailability', async () => {
      // Simulate database temporarily unavailable
      let dbAvailable = false;
      
      mockIDB.open.mockImplementation(() => {
        if (dbAvailable) {
          return { ...mockRequest, result: mockDB };
        } else {
          return { ...mockRequest, error: new Error('DB unavailable') };
        }
      });
      
      // Queue operations
      const promise1 = manager.cacheData('key1', mockOfflineData);
      const promise2 = manager.cacheData('key2', mockOfflineData);
      
      // Make database available
      dbAvailable = true;
      
      await Promise.all([promise1, promise2]);
      
      expect(mockObjectStore.put).toHaveBeenCalledTimes(2);
    });
  });
});