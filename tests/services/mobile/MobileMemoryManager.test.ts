import { MobileMemoryManager } from '@/lib/services/mobile/MobileMemoryManager';

// Mock performance.memory API
Object.defineProperty(performance, 'memory', {
  value: {
    usedJSHeapSize: 10 * 1024 * 1024, // 10MB
    totalJSHeapSize: 50 * 1024 * 1024, // 50MB
    jsHeapSizeLimit: 100 * 1024 * 1024, // 100MB
  },
  writable: true,
});

// Mock global gc() function
Object.defineProperty(global, 'gc', {
  value: jest.fn(),
  writable: true,
});

// Mock WeakRef and FinalizationRegistry for older environments
if (!global.WeakRef) {
  global.WeakRef = class MockWeakRef<T> {
    private target: T | undefined;
    constructor(target: T) {
      this.target = target;
    }
    deref(): T | undefined {
      return this.target;
    }
  } as any;
}

if (!global.FinalizationRegistry) {
  global.FinalizationRegistry = class MockFinalizationRegistry<T> {
    constructor(callback: (heldValue: T) => void) {}
    register(target: object, heldValue: T): void {}
    unregister(unregisterToken: object): boolean { return true; }
  } as any;
}

describe('MobileMemoryManager', () => {
  let memoryManager: MobileMemoryManager;

  beforeEach(() => {
    jest.clearAllMocks();
    memoryManager = MobileMemoryManager.getInstance();
    
    // Reset memory stats to default
    Object.defineProperty(performance, 'memory', {
      value: {
        usedJSHeapSize: 10 * 1024 * 1024,
        totalJSHeapSize: 50 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024,
      },
      writable: true,
    });
  });

  describe('Initialization', () => {
    it('creates singleton instance', () => {
      const instance1 = MobileMemoryManager.getInstance();
      const instance2 = MobileMemoryManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('initializes with default configuration', () => {
      expect(memoryManager.getConfig()).toEqual({
        memoryPressureThreshold: 0.8,
        gcThreshold: 0.9,
        poolSizes: {
          small: 100,
          medium: 50,
          large: 20,
        },
        leakDetectionEnabled: true,
        monitoringInterval: 5000,
      });
    });

    it('starts memory monitoring on initialization', () => {
      jest.useFakeTimers();
      
      const monitorSpy = jest.spyOn(memoryManager, 'monitorMemoryUsage');
      
      memoryManager.startMonitoring();
      
      jest.advanceTimersByTime(5000);
      
      expect(monitorSpy).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('Memory Monitoring', () => {
    it('detects memory usage correctly', () => {
      const usage = memoryManager.getMemoryUsage();
      
      expect(usage.used).toBe(10 * 1024 * 1024);
      expect(usage.total).toBe(50 * 1024 * 1024);
      expect(usage.limit).toBe(100 * 1024 * 1024);
      expect(usage.percentage).toBe(10); // 10MB / 100MB = 10%
    });

    it('triggers memory pressure warnings', () => {
      // Mock high memory usage
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 85 * 1024 * 1024, // 85MB
          totalJSHeapSize: 90 * 1024 * 1024, // 90MB
          jsHeapSizeLimit: 100 * 1024 * 1024, // 100MB
        },
        writable: true,
      });
      
      const pressureCallback = jest.fn();
      memoryManager.onMemoryPressure(pressureCallback);
      
      memoryManager.monitorMemoryUsage();
      
      expect(pressureCallback).toHaveBeenCalledWith({
        severity: 'high',
        usage: expect.objectContaining({
          percentage: 85,
        }),
        recommendedActions: expect.arrayContaining(['clear_caches', 'reduce_quality']),
      });
    });

    it('triggers garbage collection when threshold exceeded', () => {
      // Mock very high memory usage
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 92 * 1024 * 1024, // 92MB
          totalJSHeapSize: 95 * 1024 * 1024, // 95MB
          jsHeapSizeLimit: 100 * 1024 * 1024, // 100MB
        },
        writable: true,
      });
      
      memoryManager.monitorMemoryUsage();
      
      expect(global.gc).toHaveBeenCalled();
    });

    it('adapts monitoring frequency based on memory pressure', () => {
      jest.useFakeTimers();
      
      // Start with normal monitoring
      memoryManager.startMonitoring();
      
      // Simulate memory pressure
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 85 * 1024 * 1024,
          totalJSHeapSize: 90 * 1024 * 1024,
          jsHeapSizeLimit: 100 * 1024 * 1024,
        },
        writable: true,
      });
      
      memoryManager.monitorMemoryUsage();
      
      // Should increase monitoring frequency
      jest.advanceTimersByTime(1000); // Faster interval during pressure
      
      const monitorSpy = jest.spyOn(memoryManager, 'monitorMemoryUsage');
      jest.advanceTimersByTime(1000);
      
      expect(monitorSpy).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('Memory Pool Management', () => {
    it('creates and manages memory pools', () => {
      const smallPool = memoryManager.getPool('small');
      const mediumPool = memoryManager.getPool('medium');
      const largePool = memoryManager.getPool('large');
      
      expect(smallPool).toBeDefined();
      expect(mediumPool).toBeDefined();
      expect(largePool).toBeDefined();
    });

    it('allocates objects from appropriate pools', () => {
      const smallObject = memoryManager.allocate('small', () => ({ size: 'small' }));
      const mediumObject = memoryManager.allocate('medium', () => ({ size: 'medium' }));
      
      expect(smallObject).toEqual({ size: 'small' });
      expect(mediumObject).toEqual({ size: 'medium' });
    });

    it('reuses objects from pools when available', () => {
      const factory = jest.fn(() => ({ reused: true }));
      
      // Allocate and release an object
      const obj1 = memoryManager.allocate('small', factory);
      memoryManager.release('small', obj1);
      
      // Allocate again - should reuse
      const obj2 = memoryManager.allocate('small', factory);
      
      expect(factory).toHaveBeenCalledTimes(1); // Factory called only once
      expect(obj2).toBe(obj1); // Same object reused
    });

    it('expands pool size when needed', () => {
      const factory = () => ({ id: Math.random() });
      
      // Allocate more objects than initial pool size
      const objects = [];
      for (let i = 0; i < 150; i++) { // More than default small pool size (100)
        objects.push(memoryManager.allocate('small', factory));
      }
      
      expect(objects).toHaveLength(150);
    });

    it('clears pools during memory pressure', () => {
      const factory = () => ({ id: Math.random() });
      
      // Fill pool with objects
      for (let i = 0; i < 50; i++) {
        const obj = memoryManager.allocate('small', factory);
        memoryManager.release('small', obj);
      }
      
      // Trigger memory pressure cleanup
      memoryManager.optimizeForLowMemory();
      
      // Pool should be cleared
      const poolStats = memoryManager.getPoolStats();
      expect(poolStats.small.available).toBe(0);
    });
  });

  describe('Memory Leak Detection', () => {
    it('tracks object allocations', () => {
      const testObject = { test: 'data' };
      
      memoryManager.trackAllocation('test-component', testObject);
      
      const allocations = memoryManager.getAllocations('test-component');
      expect(allocations).toContain(testObject);
    });

    it('detects potential memory leaks', async () => {
      // Create many objects without releasing them
      for (let i = 0; i < 1000; i++) {
        const obj = { id: i, data: new Array(1000).fill('data') };
        memoryManager.trackAllocation('leak-component', obj);
      }
      
      const leaks = await memoryManager.detectMemoryLeaks();
      
      expect(leaks).toContainEqual({
        component: 'leak-component',
        count: 1000,
        estimatedSize: expect.any(Number),
        severity: 'high',
      });
    });

    it('cleans up tracked allocations automatically', () => {
      const weakObject = { id: 1 };
      
      memoryManager.trackAllocation('auto-cleanup-component', weakObject);
      
      // Simulate garbage collection
      if (global.gc) {
        global.gc();
      }
      
      // Force cleanup check
      memoryManager.cleanup();
      
      // Object should be automatically removed from tracking
      setTimeout(() => {
        const allocations = memoryManager.getAllocations('auto-cleanup-component');
        expect(allocations).not.toContain(weakObject);
      }, 100);
    });

    it('provides memory leak prevention recommendations', () => {
      // Simulate various problematic patterns
      memoryManager.trackAllocation('event-listeners', { listeners: new Array(100) });
      memoryManager.trackAllocation('closures', { closures: new Array(50) });
      
      const recommendations = memoryManager.getLeakPreventionTips();
      
      expect(recommendations).toContain('Remove event listeners on component unmount');
      expect(recommendations).toContain('Avoid creating closures in render functions');
    });
  });

  describe('Memory Optimization', () => {
    it('optimizes memory usage during low memory conditions', () => {
      const optimizationCallback = jest.fn();
      memoryManager.registerOptimizationCallback('test-component', optimizationCallback);
      
      memoryManager.optimizeForLowMemory();
      
      expect(optimizationCallback).toHaveBeenCalledWith({
        severity: 'high',
        recommendedActions: expect.any(Array),
      });
    });

    it('compacts memory pools during optimization', () => {
      const factory = () => ({ data: new Array(100).fill('data') });
      
      // Create fragmented pool
      const objects = [];
      for (let i = 0; i < 50; i++) {
        objects.push(memoryManager.allocate('medium', factory));
      }
      
      // Release every other object to create fragmentation
      for (let i = 0; i < objects.length; i += 2) {
        memoryManager.release('medium', objects[i]);
      }
      
      memoryManager.optimizeForLowMemory();
      
      // Pool should be compacted
      const stats = memoryManager.getPoolStats();
      expect(stats.medium.fragmentation).toBeLessThan(0.5);
    });

    it('implements progressive memory cleanup', async () => {
      const cleanupSteps = [];
      
      memoryManager.registerOptimizationCallback('step1', () => {
        cleanupSteps.push('step1');
      });
      
      memoryManager.registerOptimizationCallback('step2', () => {
        cleanupSteps.push('step2');
      });
      
      memoryManager.registerOptimizationCallback('step3', () => {
        cleanupSteps.push('step3');
      });
      
      await memoryManager.progressiveCleanup();
      
      expect(cleanupSteps).toEqual(['step1', 'step2', 'step3']);
    });

    it('prioritizes cleanup based on memory impact', () => {
      const highImpactCallback = jest.fn();
      const lowImpactCallback = jest.fn();
      
      memoryManager.registerOptimizationCallback('high-impact', highImpactCallback, {
        priority: 'high',
        estimatedMemoryFreed: 10 * 1024 * 1024, // 10MB
      });
      
      memoryManager.registerOptimizationCallback('low-impact', lowImpactCallback, {
        priority: 'low',
        estimatedMemoryFreed: 1 * 1024 * 1024, // 1MB
      });
      
      memoryManager.optimizeForLowMemory();
      
      // High impact should be called first
      expect(highImpactCallback).toHaveBeenCalled();
      expect(lowImpactCallback).toHaveBeenCalled();
    });
  });

  describe('Device-Specific Optimizations', () => {
    it('adapts to device memory constraints', () => {
      // Mock low-memory device
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 2, // 2GB RAM
        writable: true,
      });
      
      memoryManager.optimizeForDevice();
      
      const config = memoryManager.getConfig();
      expect(config.memoryPressureThreshold).toBeLessThan(0.8); // More aggressive on low-mem devices
    });

    it('adjusts pool sizes based on available memory', () => {
      // Mock high-memory device
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 8, // 8GB RAM
        writable: true,
      });
      
      memoryManager.optimizeForDevice();
      
      const config = memoryManager.getConfig();
      expect(config.poolSizes.large).toBeGreaterThan(20); // Larger pools on high-mem devices
    });

    it('handles devices without memory API gracefully', () => {
      // Remove memory API
      Object.defineProperty(performance, 'memory', {
        value: undefined,
        writable: true,
      });
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      const usage = memoryManager.getMemoryUsage();
      
      expect(usage.used).toBe(0);
      expect(usage.total).toBe(0);
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Memory API not available')
      );
      
      consoleWarn.mockRestore();
    });
  });

  describe('Performance Monitoring', () => {
    it('tracks memory allocation performance', () => {
      const factory = () => ({ data: 'test' });
      
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        memoryManager.allocate('small', factory);
      }
      
      const endTime = performance.now();
      const stats = memoryManager.getPerformanceStats();
      
      expect(stats.allocationsPerSecond).toBeGreaterThan(0);
      expect(stats.averageAllocationTime).toBeLessThan(endTime - startTime);
    });

    it('monitors garbage collection impact', () => {
      // Mock gc calls
      const originalGc = global.gc;
      let gcCallCount = 0;
      global.gc = jest.fn(() => {
        gcCallCount++;
      });
      
      // Trigger multiple gc calls
      memoryManager.optimizeForLowMemory();
      memoryManager.optimizeForLowMemory();
      
      const stats = memoryManager.getPerformanceStats();
      
      expect(stats.gcCallsCount).toBe(gcCallCount);
      
      global.gc = originalGc;
    });

    it('provides memory usage trends', () => {
      // Simulate increasing memory usage over time
      const usageHistory = [10, 20, 30, 40, 50]; // MB
      
      usageHistory.forEach((usage, index) => {
        Object.defineProperty(performance, 'memory', {
          value: {
            usedJSHeapSize: usage * 1024 * 1024,
            totalJSHeapSize: 100 * 1024 * 1024,
            jsHeapSizeLimit: 200 * 1024 * 1024,
          },
          writable: true,
        });
        
        memoryManager.monitorMemoryUsage();
      });
      
      const trends = memoryManager.getMemoryTrends();
      
      expect(trends.direction).toBe('increasing');
      expect(trends.growthRate).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('handles allocation failures gracefully', () => {
      const failingFactory = () => {
        throw new Error('Allocation failed');
      };
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      const result = memoryManager.allocate('small', failingFactory);
      
      expect(result).toBeNull();
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to allocate object')
      );
      
      consoleError.mockRestore();
    });

    it('recovers from pool corruption', () => {
      // Corrupt a pool
      const pool = memoryManager.getPool('small');
      (pool as any).available = null;
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      // Should recreate pool
      const factory = () => ({ recovered: true });
      const obj = memoryManager.allocate('small', factory);
      
      expect(obj).toEqual({ recovered: true });
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Pool corruption detected')
      );
      
      consoleWarn.mockRestore();
    });

    it('handles missing garbage collection API', () => {
      // Remove gc function
      const originalGc = global.gc;
      delete (global as any).gc;
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      // Should handle gracefully
      memoryManager.forceGarbageCollection();
      
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Garbage collection not available')
      );
      
      global.gc = originalGc;
      consoleWarn.mockRestore();
    });

    it('prevents infinite cleanup loops', () => {
      let cleanupCallCount = 0;
      
      memoryManager.registerOptimizationCallback('recursive-cleanup', () => {
        cleanupCallCount++;
        if (cleanupCallCount < 10) {
          // Try to trigger more cleanup
          memoryManager.optimizeForLowMemory();
        }
      });
      
      memoryManager.optimizeForLowMemory();
      
      // Should prevent infinite recursion
      expect(cleanupCallCount).toBeLessThan(5);
    });
  });
});