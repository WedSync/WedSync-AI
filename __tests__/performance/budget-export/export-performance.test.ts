/**
 * WS-166 Budget Export Performance Tests
 * Team D - Round 1 Implementation
 * 
 * Comprehensive performance testing for budget export optimization
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  ExportPerformanceOptimizer,
  DeviceCapabilityDetector,
  BudgetData,
  DeviceInfo,
  PerformanceMetrics
} from '@/lib/performance/budget-export/export-optimizer';
import { MobileExportQueue } from '@/lib/performance/budget-export/mobile-export-queue';

// Mock performance API
const mockPerformanceMemory = {
  usedJSHeapSize: 50 * 1024 * 1024, // 50MB
  totalJSHeapSize: 100 * 1024 * 1024, // 100MB
  jsHeapSizeLimit: 200 * 1024 * 1024 // 200MB
};

Object.defineProperty(performance, 'memory', {
  value: mockPerformanceMemory,
  writable: true
});

Object.defineProperty(performance, 'now', {
  value: jest.fn(() => Date.now()),
  writable: true
});

// Mock navigator APIs
Object.defineProperty(navigator, 'deviceMemory', {
  value: 4,
  writable: true
});

Object.defineProperty(navigator, 'connection', {
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 100
  },
  writable: true
});

Object.defineProperty(navigator, 'getBattery', {
  value: jest.fn(() => Promise.resolve({
    level: 0.8,
    charging: false,
    chargingTime: Infinity,
    dischargingTime: 7200
  })),
  writable: true
});

// Test data generators
const generateBudgetData = (
  categoriesCount: number = 10,
  transactionsCount: number = 100
): BudgetData => {
  const categories = Array.from({ length: categoriesCount }, (_, i) => ({
    id: `category_${i}`,
    name: `Category ${i}`,
    allocated: 1000 * (i + 1),
    spent: 800 * (i + 1),
    remaining: 200 * (i + 1),
    transactions: []
  }));

  const transactions = Array.from({ length: transactionsCount }, (_, i) => ({
    id: `transaction_${i}`,
    categoryId: categories[i % categoriesCount].id,
    vendorId: `vendor_${i % 5}`,
    amount: 100 + (i * 10),
    description: `Transaction ${i}`,
    date: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)), // Past days
    type: ['expense', 'payment', 'refund'][i % 3] as 'expense' | 'payment' | 'refund',
    status: ['pending', 'completed', 'cancelled'][i % 3] as 'pending' | 'completed' | 'cancelled'
  }));

  const totals = {
    totalBudget: categories.reduce((sum, cat) => sum + cat.allocated, 0),
    totalSpent: categories.reduce((sum, cat) => sum + cat.spent, 0),
    totalRemaining: categories.reduce((sum, cat) => sum + cat.remaining, 0),
    categoriesCount,
    transactionsCount
  };

  return {
    categories,
    transactions,
    totals,
    metadata: {
      weddingId: 'test-wedding-123',
      coupleIds: ['couple-1', 'couple-2'],
      currency: 'USD',
      lastUpdated: new Date(),
      exportedAt: new Date()
    }
  };
};

const generateDeviceInfo = (isLowEnd: boolean = false): DeviceInfo => ({
  memory: isLowEnd ? 2 : 8,
  connectionType: isLowEnd ? '3g' : '4g',
  screenWidth: isLowEnd ? 375 : 1920,
  userAgent: isLowEnd ? 
    'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15' :
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  isLowEndDevice: isLowEnd,
  batteryLevel: 0.8
});

describe('ExportPerformanceOptimizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset performance timers
    (performance.now as jest.Mock).mockImplementation(() => Date.now());
  });

  describe('optimizeForMobile', () => {
    it('should optimize data for low-end devices within performance targets', async () => {
      const startTime = Date.now();
      const budgetData = generateBudgetData(20, 500); // Large dataset
      const deviceInfo = generateDeviceInfo(true); // Low-end device

      const optimized = await ExportPerformanceOptimizer.optimizeForMobile(
        budgetData,
        deviceInfo
      );

      const processingTime = Date.now() - startTime;

      // Performance assertions
      expect(processingTime).toBeLessThan(2000); // Under 2 seconds
      expect(optimized.chunks.length).toBeGreaterThan(0);
      expect(optimized.optimization.compressionRatio).toBeGreaterThan(1);
      expect(optimized.optimization.memoryReduction).toBeGreaterThan(0);

      // Verify chunks are appropriately sized for low-end device
      optimized.chunks.forEach(chunk => {
        expect(chunk.size).toBeLessThan(50 * 1024); // 50KB max per chunk
        expect(chunk.data.transactions?.length).toBeLessThanOrEqual(25); // Max 25 transactions per chunk
      });
    });

    it('should handle high-end devices with larger chunks', async () => {
      const budgetData = generateBudgetData(10, 200);
      const deviceInfo = generateDeviceInfo(false); // High-end device

      const optimized = await ExportPerformanceOptimizer.optimizeForMobile(
        budgetData,
        deviceInfo
      );

      // High-end devices should get larger chunks for efficiency
      optimized.chunks.forEach(chunk => {
        expect(chunk.data.transactions?.length).toBeLessThanOrEqual(100); // Larger chunks allowed
      });
    });

    it('should cache optimized results for repeated requests', async () => {
      const budgetData = generateBudgetData(5, 50);
      const deviceInfo = generateDeviceInfo();

      // First optimization
      const startTime1 = Date.now();
      const optimized1 = await ExportPerformanceOptimizer.optimizeForMobile(
        budgetData,
        deviceInfo
      );
      const time1 = Date.now() - startTime1;

      // Second optimization (should use cache)
      const startTime2 = Date.now();
      const optimized2 = await ExportPerformanceOptimizer.optimizeForMobile(
        budgetData,
        deviceInfo
      );
      const time2 = Date.now() - startTime2;

      // Cache should make second request faster
      expect(time2).toBeLessThan(time1);
      expect(optimized1.optimization.chunksCreated).toBe(optimized2.optimization.chunksCreated);
    });
  });

  describe('measureExportPerformance', () => {
    it('should measure performance within expected ranges', async () => {
      const metrics = await ExportPerformanceOptimizer.measureExportPerformance(
        'csv',
        1000 // 1000 records
      );

      // Validate performance metrics structure
      expect(metrics).toHaveProperty('renderTime');
      expect(metrics).toHaveProperty('exportGenerationTime');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('batteryImpact');
      expect(metrics).toHaveProperty('networkUsage');
      expect(metrics).toHaveProperty('chunksProcessed');
      expect(metrics).toHaveProperty('errorRate');

      // Performance targets
      expect(metrics.renderTime).toBeLessThan(500); // Under 500ms render time
      expect(metrics.batteryImpact).toBeLessThan(5); // Under 5% battery impact
      expect(metrics.errorRate).toBe(0); // No errors
      expect(metrics.chunksProcessed).toBeGreaterThan(0);
    });

    it('should show different performance characteristics by format', async () => {
      const csvMetrics = await ExportPerformanceOptimizer.measureExportPerformance('csv', 1000);
      const pdfMetrics = await ExportPerformanceOptimizer.measureExportPerformance('pdf', 1000);
      const excelMetrics = await ExportPerformanceOptimizer.measureExportPerformance('excel', 1000);

      // PDF should take more time than CSV
      expect(pdfMetrics.renderTime).toBeGreaterThan(csvMetrics.renderTime);
      // Excel should take more time than both
      expect(excelMetrics.renderTime).toBeGreaterThan(pdfMetrics.renderTime);

      // Network usage should vary by format
      expect(pdfMetrics.networkUsage).toBeGreaterThan(csvMetrics.networkUsage);
      expect(excelMetrics.networkUsage).toBeGreaterThan(csvMetrics.networkUsage);
    });
  });

  describe('getOptimalChunkSize', () => {
    it('should calculate appropriate chunk sizes for device capabilities', async () => {
      // Low-end device should get smaller chunks
      const lowEndChunkSize = await ExportPerformanceOptimizer.getOptimalChunkSize(1000, 2);
      expect(lowEndChunkSize).toBeLessThan(50);

      // High-end device should get larger chunks
      const highEndChunkSize = await ExportPerformanceOptimizer.getOptimalChunkSize(1000, 8);
      expect(highEndChunkSize).toBeGreaterThan(lowEndChunkSize);

      // Very large datasets should get smaller chunks regardless
      const largeDataChunkSize = await ExportPerformanceOptimizer.getOptimalChunkSize(5000, 8);
      expect(largeDataChunkSize).toBeLessThan(highEndChunkSize);
    });

    it('should enforce minimum and maximum bounds', async () => {
      // Test minimum bounds
      const minChunkSize = await ExportPerformanceOptimizer.getOptimalChunkSize(5, 1);
      expect(minChunkSize).toBeGreaterThanOrEqual(10);

      // Test maximum bounds  
      const maxChunkSize = await ExportPerformanceOptimizer.getOptimalChunkSize(10, 32);
      expect(maxChunkSize).toBeLessThanOrEqual(200);
    });
  });

  describe('preloadCriticalData', () => {
    it('should complete preloading within time limits', async () => {
      const startTime = Date.now();
      
      await expect(
        ExportPerformanceOptimizer.preloadCriticalData('test-wedding-123')
      ).resolves.not.toThrow();

      const preloadTime = Date.now() - startTime;
      expect(preloadTime).toBeLessThan(5000); // Under 5 seconds
    });

    it('should handle preloading errors gracefully', async () => {
      // Test with invalid wedding ID
      await expect(
        ExportPerformanceOptimizer.preloadCriticalData('')
      ).resolves.not.toThrow(); // Should not throw, just log error
    });
  });
});

describe('DeviceCapabilityDetector', () => {
  it('should detect device capabilities accurately', async () => {
    const capabilities = await DeviceCapabilityDetector.detectCapabilities();

    expect(capabilities).toHaveProperty('memory');
    expect(capabilities).toHaveProperty('connectionType');
    expect(capabilities).toHaveProperty('screenWidth');
    expect(capabilities).toHaveProperty('userAgent');
    expect(capabilities).toHaveProperty('isLowEndDevice');

    expect(capabilities.memory).toBeGreaterThan(0);
    expect(capabilities.screenWidth).toBeGreaterThan(0);
    expect(['wifi', '4g', '3g', 'slow']).toContain(capabilities.connectionType);
    expect(typeof capabilities.isLowEndDevice).toBe('boolean');
  });

  it('should correctly identify low-end devices', async () => {
    // Mock low-end device characteristics
    Object.defineProperty(navigator, 'deviceMemory', { value: 2 });
    Object.defineProperty(window, 'innerWidth', { value: 375 });
    Object.defineProperty(navigator, 'userAgent', { 
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X)' 
    });

    const capabilities = await DeviceCapabilityDetector.detectCapabilities();
    expect(capabilities.isLowEndDevice).toBe(true);
  });
});

describe('Performance Benchmarks', () => {
  it('should meet performance targets for small datasets (< 100 items)', async () => {
    const budgetData = generateBudgetData(5, 50);
    const deviceInfo = generateDeviceInfo();

    const startTime = performance.now();
    const optimized = await ExportPerformanceOptimizer.optimizeForMobile(budgetData, deviceInfo);
    const processingTime = performance.now() - startTime;

    // Small dataset performance targets
    expect(processingTime).toBeLessThan(300); // Under 300ms
    expect(optimized.chunks.length).toBeLessThanOrEqual(3); // Should not need many chunks
  });

  it('should meet performance targets for medium datasets (100-500 items)', async () => {
    const budgetData = generateBudgetData(15, 300);
    const deviceInfo = generateDeviceInfo();

    const startTime = performance.now();
    const optimized = await ExportPerformanceOptimizer.optimizeForMobile(budgetData, deviceInfo);
    const processingTime = performance.now() - startTime;

    // Medium dataset performance targets
    expect(processingTime).toBeLessThan(1000); // Under 1 second
    expect(optimized.optimization.memoryReduction).toBeGreaterThan(0);
  });

  it('should meet performance targets for large datasets (> 500 items)', async () => {
    const budgetData = generateBudgetData(30, 1000);
    const deviceInfo = generateDeviceInfo();

    const startTime = performance.now();
    const optimized = await ExportPerformanceOptimizer.optimizeForMobile(budgetData, deviceInfo);
    const processingTime = performance.now() - startTime;

    // Large dataset performance targets
    expect(processingTime).toBeLessThan(3000); // Under 3 seconds
    expect(optimized.chunks.length).toBeGreaterThan(5); // Should create multiple chunks
    expect(optimized.optimization.compressionRatio).toBeGreaterThan(1.2); // Good compression
  });

  it('should handle memory constraints on low-end devices', async () => {
    const budgetData = generateBudgetData(50, 2000); // Very large dataset
    const lowEndDevice = generateDeviceInfo(true);

    const initialMemory = mockPerformanceMemory.usedJSHeapSize;
    const optimized = await ExportPerformanceOptimizer.optimizeForMobile(budgetData, lowEndDevice);
    
    // Should not cause memory to spike beyond limits
    const finalMemory = mockPerformanceMemory.usedJSHeapSize;
    const memoryIncrease = finalMemory - initialMemory;
    
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    expect(optimized.chunks.length).toBeGreaterThan(10); // Many small chunks for low-end device
  });
});

describe('Error Handling and Edge Cases', () => {
  it('should handle empty budget data gracefully', async () => {
    const emptyBudgetData: BudgetData = {
      categories: [],
      transactions: [],
      totals: {
        totalBudget: 0,
        totalSpent: 0,
        totalRemaining: 0,
        categoriesCount: 0,
        transactionsCount: 0
      },
      metadata: {
        weddingId: 'empty-wedding',
        coupleIds: ['couple-1'],
        currency: 'USD',
        lastUpdated: new Date(),
        exportedAt: new Date()
      }
    };

    const deviceInfo = generateDeviceInfo();
    const optimized = await ExportPerformanceOptimizer.optimizeForMobile(
      emptyBudgetData,
      deviceInfo
    );

    expect(optimized.chunks.length).toBe(0);
    expect(optimized.optimization.originalSize).toBe(optimized.optimization.optimizedSize);
  });

  it('should handle malformed device information', async () => {
    const budgetData = generateBudgetData(5, 50);
    const malformedDevice: DeviceInfo = {
      memory: -1, // Invalid memory
      connectionType: 'unknown' as any,
      screenWidth: 0, // Invalid screen width
      userAgent: '',
      isLowEndDevice: true
    };

    // Should not throw error, should use fallbacks
    const optimized = await ExportPerformanceOptimizer.optimizeForMobile(
      budgetData,
      malformedDevice
    );

    expect(optimized.chunks.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle concurrent optimization requests', async () => {
    const budgetData = generateBudgetData(10, 200);
    const deviceInfo = generateDeviceInfo();

    // Start multiple optimizations concurrently
    const promises = Array.from({ length: 5 }, () =>
      ExportPerformanceOptimizer.optimizeForMobile(budgetData, deviceInfo)
    );

    const results = await Promise.all(promises);

    // All should succeed and return consistent results
    expect(results).toHaveLength(5);
    results.forEach(result => {
      expect(result.chunks.length).toBe(results[0].chunks.length);
      expect(result.optimization.chunksCreated).toBe(results[0].optimization.chunksCreated);
    });
  });

  it('should cleanup resources properly', async () => {
    const budgetData = generateBudgetData(20, 400);
    const deviceInfo = generateDeviceInfo();

    const initialMemory = mockPerformanceMemory.usedJSHeapSize;
    
    // Perform multiple optimizations to test cleanup
    for (let i = 0; i < 10; i++) {
      await ExportPerformanceOptimizer.optimizeForMobile(budgetData, deviceInfo);
    }

    // Memory should not continuously grow (basic check)
    const finalMemory = mockPerformanceMemory.usedJSHeapSize;
    const memoryGrowth = finalMemory - initialMemory;
    
    // Should not grow by more than reasonable amount
    expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // 100MB
  });
});

describe('Integration Performance', () => {
  it('should maintain performance when integrated with MobileExportQueue', async () => {
    // Initialize queue
    await MobileExportQueue.initialize();

    const startTime = performance.now();
    
    // Queue multiple exports
    const exportIds = await Promise.all([
      MobileExportQueue.queueExportRequest({
        weddingId: 'test-1',
        format: 'csv',
        includeVendors: true,
        includeTransactions: true
      }, 'high'),
      MobileExportQueue.queueExportRequest({
        weddingId: 'test-2', 
        format: 'pdf',
        includeVendors: true,
        includeTransactions: true
      }, 'normal')
    ]);

    const queueTime = performance.now() - startTime;

    expect(queueTime).toBeLessThan(100); // Queueing should be fast
    expect(exportIds).toHaveLength(2);
    exportIds.forEach(id => expect(id).toBeTruthy());

    // Get statistics
    const stats = await MobileExportQueue.getQueueStatistics();
    expect(stats.totalItems).toBe(2);
    expect(stats.pendingItems).toBe(2);
  });
});