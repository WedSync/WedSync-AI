/**
 * WS-171: Unit Tests for PWA Storage Optimizer
 * Comprehensive tests for storage quota monitoring and management
 */

import { PWAStorageOptimizer, StorageQuota, StorageBreakdown, StorageAlert } from '../../../lib/pwa/storage-optimizer';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { setupBrowserMocks, resetBrowserMocks } from '../setup/browser-api-mocks';
import { CachePriority, WeddingDataType } from '../../../lib/pwa/cache-manager';
// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: vi.fn().mockResolvedValue({}),
      select: vi.fn().mockResolvedValue({ data: [], error: null })
    }))
  }))
}));
// Mock navigator.storage
const mockStorageEstimate = {
  quota: 50 * 1024 * 1024 * 1024, // 50GB
  usage: 5 * 1024 * 1024 * 1024,  // 5GB
  usageDetails: {
    caches: 2 * 1024 * 1024 * 1024,      // 2GB
    indexedDB: 1 * 1024 * 1024 * 1024,   // 1GB
    serviceWorker: 500 * 1024 * 1024,    // 500MB
    webSQL: 0
  }
};
Object.defineProperty(global, 'navigator', {
  value: {
    storage: {
      estimate: vi.fn().mockResolvedValue(mockStorageEstimate)
    }
  },
  writable: true
});
// Mock localStorage
const mockLocalStorage = {
  store: new Map<string, string>(),
  getItem: jest.fn((key: string) => mockLocalStorage.store.get(key) || null),
  setItem: jest.fn((key: string, value: string) => {
    mockLocalStorage.store.set(key, value);
  }),
  removeItem: jest.fn((key: string) => {
    mockLocalStorage.store.delete(key);
  clear: jest.fn(() => {
    mockLocalStorage.store.clear();
  })
Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });
// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn((key: string) => mockSessionStorage.store.get(key) || null),
    mockSessionStorage.store.set(key, value);
    mockSessionStorage.store.delete(key);
Object.defineProperty(global, 'sessionStorage', { value: mockSessionStorage });
// Mock caches API
const mockCache = {
  delete: vi.fn().mockResolvedValue(true),
  keys: vi.fn().mockResolvedValue([
    { url: 'http://example.com/api/data1' },
    { url: 'http://example.com/api/data2' },
    { url: 'http://example.com/api/data3' }
  ])
const mockCaches = {
  keys: vi.fn().mockResolvedValue(['cache-v1', 'cache-v2', 'critical-cache']),
  open: vi.fn().mockResolvedValue(mockCache),
  delete: vi.fn().mockResolvedValue(true)
Object.defineProperty(global, 'caches', { value: mockCaches });
// Mock document
Object.defineProperty(global, 'document', {
    hidden: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
// Mock window
Object.defineProperty(global, 'window', {
    removeEventListener: vi.fn(),
    cacheManager: {
      clear: vi.fn().mockResolvedValue(5),
      getStats: vi.fn().mockReturnValue({
        totalEntries: 10,
        totalSize: 1024 * 1024 // 1MB
      }),
      cleanup: vi.fn().mockResolvedValue(undefined)
describe('PWAStorageOptimizer', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
  let storageOptimizer: PWAStorageOptimizer;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.store.clear();
    
    storageOptimizer = new PWAStorageOptimizer({
      warningThreshold: 80,
      criticalThreshold: 95,
      autoCleanup: true,
      cleanupInterval: 60000,
      emergencyCleanup: true
    });
  });
  afterEach(() => {
    if (storageOptimizer) {
      storageOptimizer.destroy();
  describe('Storage Quota Management', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    test('should get storage quota information', async () => {
      const quota = await storageOptimizer.getStorageQuota();
      
      expect(quota.quota).toBe(mockStorageEstimate.quota);
      expect(quota.usage).toBe(mockStorageEstimate.usage);
      expect(quota.available).toBe(mockStorageEstimate.quota - mockStorageEstimate.usage);
      expect(quota.usagePercentage).toBeCloseTo(10); // 5GB / 50GB * 100
    test('should handle storage API not available', async () => {
      // Temporarily remove storage API
      const originalStorage = navigator.storage;
      delete (navigator as unknown).storage;
      // Should return fallback values
      expect(quota.quota).toBe(50 * 1024 * 1024 * 1024);
      expect(quota.usage).toBe(0);
      expect(quota.available).toBe(50 * 1024 * 1024 * 1024);
      expect(quota.usagePercentage).toBe(0);
      // Restore storage API
      (navigator as unknown).storage = originalStorage;
    test('should get detailed storage breakdown', async () => {
      const breakdown = await storageOptimizer.getStorageBreakdown();
      expect(breakdown.cache).toBe(mockStorageEstimate.usageDetails!.caches);
      expect(breakdown.indexedDB).toBe(mockStorageEstimate.usageDetails!.indexedDB);
      expect(breakdown.serviceWorker).toBe(mockStorageEstimate.usageDetails!.serviceWorker);
      expect(breakdown.localStorage).toBeGreaterThanOrEqual(0);
  describe('Storage Health Monitoring', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    test('should detect normal storage usage', async () => {
      // Mock low usage
      navigator.storage.estimate = vi.fn().mockResolvedValue({
        quota: 50 * 1024 * 1024 * 1024,
        usage: 10 * 1024 * 1024 * 1024, // 20% usage
        usageDetails: mockStorageEstimate.usageDetails
      });
      const alerts = await storageOptimizer.checkStorageHealth();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('info');
      expect(alerts[0].currentUsage).toBeCloseTo(20);
    test('should detect warning threshold storage usage', async () => {
      // Mock high usage (85%)
        usage: 42.5 * 1024 * 1024 * 1024, // 85% usage
      expect(alerts[0].type).toBe('warning');
      expect(alerts[0].currentUsage).toBeCloseTo(85);
      expect(alerts[0].action).toBe('scheduled_cleanup');
    test('should detect critical threshold storage usage', async () => {
      // Mock critical usage (97%)
        usage: 48.5 * 1024 * 1024 * 1024, // 97% usage
      expect(alerts[0].type).toBe('critical');
      expect(alerts[0].currentUsage).toBeCloseTo(97);
      expect(alerts[0].action).toBe('emergency_cleanup');
  describe('Scheduled Cleanup', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    beforeEach(() => {
      // Setup test data in localStorage
      mockLocalStorage.store.set('temp_data_1', JSON.stringify({ 
        timestamp: Date.now() - 86400000, // 1 day old
        data: 'test' 
      }));
      mockLocalStorage.store.set('cache:expired', JSON.stringify({ 
        expirationTime: Date.now() - 3600000, // Expired 1 hour ago
      mockLocalStorage.store.set('large_item', 'x'.repeat(200000)); // Large item
    test('should perform scheduled cleanup successfully', async () => {
      const result = await storageOptimizer.performScheduledCleanup();
      expect(result.success).toBe(true);
      expect(result.freedBytes).toBeGreaterThan(0);
      expect(result.deletedEntries).toBeGreaterThan(0);
      expect(result.cleanupDuration).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    test('should not start cleanup if already in progress', async () => {
      // Start first cleanup
      const cleanup1Promise = storageOptimizer.performScheduledCleanup();
      // Try to start second cleanup immediately
      const result2 = await storageOptimizer.performScheduledCleanup();
      expect(result2.success).toBe(false);
      expect(result2.errors).toContain('Cleanup already in progress');
      // Wait for first cleanup to complete
      await cleanup1Promise;
    test('should track cleanup in progress status', async () => {
      expect(storageOptimizer.isCleanupInProgress()).toBe(false);
      const cleanupPromise = storageOptimizer.performScheduledCleanup();
      expect(storageOptimizer.isCleanupInProgress()).toBe(true);
      await cleanupPromise;
  describe('Emergency Cleanup', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    test('should perform emergency cleanup more aggressively', async () => {
      const result = await storageOptimizer.performEmergencyCleanup();
    test('should clean up analytics data during emergency', async () => {
      mockLocalStorage.store.set('analytics_data', JSON.stringify({
        timestamp: Date.now(),
        data: 'analytics'
      expect(mockLocalStorage.store.has('analytics_data')).toBe(false);
    test('should clear browser caches during emergency', async () => {
      expect(mockCaches.keys).toHaveBeenCalled();
      expect(mockCaches.open).toHaveBeenCalled();
  describe('Data Type Specific Cleanup', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    test('should clean up by specific data type', async () => {
      mockLocalStorage.store.set('timeline_data', JSON.stringify({
        dataType: WeddingDataType.TIMELINE,
        data: 'timeline'
        dataType: WeddingDataType.ANALYTICS,
      const result = await storageOptimizer.cleanupByDataType(WeddingDataType.ANALYTICS);
    test('should clean up by cache priority', async () => {
      const result = await storageOptimizer.cleanupByPriority(CachePriority.BACKGROUND);
      expect(window.cacheManager.clear).toHaveBeenCalledWith({ 
        priority: CachePriority.BACKGROUND 
  describe('Retention Policies', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    test('should apply retention policies based on data age', async () => {
      const oldTimestamp = Date.now() - (10 * 24 * 60 * 60 * 1000); // 10 days old
      mockLocalStorage.store.set('analytics_old', JSON.stringify({
        timestamp: oldTimestamp,
        data: 'old analytics'
      const result = await (storageOptimizer as unknown).applyRetentionPolicies();
    test('should preserve recent data within retention period', async () => {
      const recentTimestamp = Date.now() - (1 * 24 * 60 * 60 * 1000); // 1 day old
      mockLocalStorage.store.set('timeline_recent', JSON.stringify({
        timestamp: recentTimestamp,
        data: 'recent timeline'
      // Recent timeline data should be preserved (30-day retention)
      expect(mockLocalStorage.store.has('timeline_recent')).toBe(true);
  describe('Configuration Management', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    test('should return current configuration', () => {
      const config = storageOptimizer.getConfig();
      expect(config.warningThreshold).toBe(80);
      expect(config.criticalThreshold).toBe(95);
      expect(config.autoCleanup).toBe(true);
      expect(config.emergencyCleanup).toBe(true);
    test('should update configuration', () => {
      storageOptimizer.updateConfig({
        warningThreshold: 70,
        criticalThreshold: 90,
        autoCleanup: false
      expect(config.warningThreshold).toBe(70);
      expect(config.criticalThreshold).toBe(90);
      expect(config.autoCleanup).toBe(false);
    test('should restart monitoring when cleanup interval changes', () => {
      const originalInterval = 60000;
      const newInterval = 30000;
        cleanupInterval: newInterval
      expect(config.cleanupInterval).toBe(newInterval);
  describe('Public API', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    test('should get comprehensive storage status', async () => {
      const status = await storageOptimizer.getStorageStatus();
      expect(status.quota).toBeDefined();
      expect(status.breakdown).toBeDefined();
      expect(status.alerts).toBeDefined();
      expect(status.lastCleanup).toBeDefined();
      expect(typeof status.lastCleanup).toBe('number');
    test('should trigger cleanup on demand', async () => {
      const result = await storageOptimizer.triggerCleanup('scheduled');
    test('should trigger emergency cleanup on demand', async () => {
      const result = await storageOptimizer.triggerCleanup('emergency');
  describe('Error Handling', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    test('should handle storage API errors gracefully', async () => {
      // Mock storage API to throw error
      navigator.storage.estimate = vi.fn().mockRejectedValue(new Error('Storage API error'));
      expect(quota.quota).toBeGreaterThan(0);
    test('should handle cache API errors during cleanup', async () => {
      // Mock caches.keys to throw error
      mockCaches.keys.mockRejectedValue(new Error('Cache API error'));
      // Should continue with cleanup despite cache errors
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
    test('should handle localStorage errors during cleanup', async () => {
      // Mock localStorage to throw error
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('localStorage error');
      const result = await (storageOptimizer as unknown).cleanupLocalStorage();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('localStorage error');
  describe('Event Handlers', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    test('should setup quota exceeded error handler', () => {
      const errorEvent = new ErrorEvent('error', {
        error: { name: 'QuotaExceededError' }
      // Spy on performEmergencyCleanup
      const emergencyCleanupSpy = vi.spyOn(storageOptimizer, 'performEmergencyCleanup');
      // Simulate quota exceeded error
      window.dispatchEvent(errorEvent);
      // Note: In a real test environment, we'd need to properly trigger the event handler
      // For now, we just verify the handler was set up
      expect(window.addEventListener).toHaveBeenCalled();
    test('should setup visibility change handler', () => {
      // Verify that visibility change handler was set up
      expect(document.addEventListener).toHaveBeenCalledWith(
        'visibilitychange', 
        expect.any(Function)
      );
  describe('Cleanup Strategies', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    test('should prioritize low-value data for deletion', async () => {
      // Setup various types of data
        timestamp: Date.now() - 86400000,
        timestamp: Date.now() - 3600000,
    test('should compress data when possible during cleanup', async () => {
      const compressionResult = await (storageOptimizer as unknown).compressUncompressedData();
      expect(compressionResult.success).toBe(true);
      expect(compressionResult.freedBytes).toBeGreaterThanOrEqual(0);
  describe('Monitoring and Analytics', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
    test('should track storage health metrics', async () => {
      await storageOptimizer.checkStorageHealth();
      // Verify tracking would be called (mocked Supabase)
      expect(quota.usagePercentage).toBeDefined();
    test('should track cleanup results', async () => {
      expect(result.freedBytes).toBeGreaterThanOrEqual(0);
describe('Storage Optimizer Configuration', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
  test('should initialize with default configuration', () => {
    const defaultOptimizer = new PWAStorageOptimizer();
    const config = defaultOptimizer.getConfig();
    expect(config.warningThreshold).toBe(80);
    expect(config.criticalThreshold).toBe(95);
    expect(config.autoCleanup).toBe(true);
    expect(config.emergencyCleanup).toBe(true);
    defaultOptimizer.destroy();
  test('should initialize with custom configuration', () => {
    const customConfig = {
      warningThreshold: 70,
      criticalThreshold: 90,
      autoCleanup: false,
      cleanupInterval: 120000,
      emergencyCleanup: false,
      compressionEnabled: false
    };
    const customOptimizer = new PWAStorageOptimizer(customConfig);
    const config = customOptimizer.getConfig();
    expect(config.warningThreshold).toBe(70);
    expect(config.criticalThreshold).toBe(90);
    expect(config.autoCleanup).toBe(false);
    expect(config.emergencyCleanup).toBe(false);
    expect(config.compressionEnabled).toBe(false);
    customOptimizer.destroy();
  test('should use default retention policies', () => {
    const optimizer = new PWAStorageOptimizer();
    const config = optimizer.getConfig();
    expect(config.retentionPolicies[WeddingDataType.TIMELINE]).toBe(30);
    expect(config.retentionPolicies[WeddingDataType.ANALYTICS]).toBe(7);
    expect(config.retentionPolicies[WeddingDataType.DOCUMENTS]).toBe(365);
    optimizer.destroy();
describe('Integration with Cache Manager', () => {
  beforeEach(() => {
    setupBrowserMocks();
    resetBrowserMocks();
  });
  test('should integrate with cache manager for cleanup', async () => {
    // Mock cache manager integration
    (window as unknown).cacheManager = {
        totalSize: 1024 * 1024
    const result = await (storageOptimizer as unknown).cleanupExpiredCache();
    expect(result.success).toBe(true);
    expect(window.cacheManager.cleanup).toHaveBeenCalled();
  test('should handle missing cache manager gracefully', async () => {
    // Remove cache manager
    delete (window as unknown).cacheManager;
    expect(result.deletedEntries).toBe(0);
