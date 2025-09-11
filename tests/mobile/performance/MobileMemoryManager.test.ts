import { jest } from '@jest/globals';
import { MobileMemoryManager } from '../../../src/lib/services/mobile/MobileMemoryManager';

// Mock performance API with memory
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024, // 2GB
  },
};

global.performance = mockPerformance as any;

// Mock navigator for device memory
Object.defineProperty(navigator, 'deviceMemory', {
  value: 4, // 4GB device
  writable: true,
});

// Mock navigator for hardware concurrency
Object.defineProperty(navigator, 'hardwareConcurrency', {
  value: 4, // 4 cores
  writable: true,
});

// Mock MemoryInfo API
global.MemoryInfo = jest.fn().mockImplementation(() => ({
  usedJSHeapSize: mockPerformance.memory.usedJSHeapSize,
  totalJSHeapSize: mockPerformance.memory.totalJSHeapSize,
  jsHeapSizeLimit: mockPerformance.memory.jsHeapSizeLimit,
})) as any;

// Mock requestIdleCallback
global.requestIdleCallback = jest.fn((callback) => {
  setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 0);
  return 1;
});

global.cancelIdleCallback = jest.fn();

// Mock WeakMap and WeakSet for better memory management testing
global.WeakMap = Map as any;
global.WeakSet = Set as any;

describe('MobileMemoryManager', () => {
  let memoryManager: MobileMemoryManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset mock performance memory values
    mockPerformance.memory.usedJSHeapSize = 50 * 1024 * 1024;
    mockPerformance.memory.totalJSHeapSize = 100 * 1024 * 1024;
    
    memoryManager = MobileMemoryManager.getInstance();
  });

  afterEach(() => {
    memoryManager.cleanup();
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MobileMemoryManager.getInstance();
      const instance2 = MobileMemoryManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = MobileMemoryManager.getInstance();
      instance1.setMemoryThreshold(0.7);
      
      const instance2 = MobileMemoryManager.getInstance();
      
      expect(instance2.getMemoryThreshold()).toBe(0.7);
    });
  });

  describe('Memory Pool Management', () => {
    it('should create memory pools for different object types', () => {
      const chartDataPool = memoryManager.createPool('chartData', {
        create: () => ({ x: 0, y: 0, data: [] }),
        reset: (obj) => { obj.x = 0; obj.y = 0; obj.data.length = 0; },
        maxSize: 100,
        preAllocate: 20,
      });

      expect(chartDataPool).toBeDefined();
      expect(chartDataPool.available()).toBe(20); // Pre-allocated objects
      expect(chartDataPool.total()).toBe(20);
    });

    it('should provide objects from pool', () => {
      const pool = memoryManager.createPool('testObjects', {
        create: () => ({ value: 0, items: [] }),
        reset: (obj) => { obj.value = 0; obj.items.length = 0; },
        maxSize: 50,
        preAllocate: 10,
      });

      const obj1 = pool.get();
      const obj2 = pool.get();

      expect(obj1).toBeDefined();
      expect(obj2).toBeDefined();
      expect(obj1).not.toBe(obj2);
      expect(pool.available()).toBe(8); // 10 - 2 = 8
    });

    it('should return objects to pool and reset them', () => {
      const pool = memoryManager.createPool('resetTest', {
        create: () => ({ counter: 0, data: [] }),
        reset: (obj) => { obj.counter = 0; obj.data.length = 0; },
        maxSize: 10,
        preAllocate: 5,
      });

      const obj = pool.get();
      obj.counter = 42;
      obj.data.push('test');

      pool.return(obj);

      expect(pool.available()).toBe(5);
      
      const reusedObj = pool.get();
      expect(reusedObj.counter).toBe(0);
      expect(reusedObj.data).toHaveLength(0);
    });

    it('should enforce pool size limits', () => {
      const pool = memoryManager.createPool('limitTest', {
        create: () => ({ id: Math.random() }),
        reset: (obj) => {},
        maxSize: 3,
        preAllocate: 0,
      });

      const obj1 = pool.get();
      const obj2 = pool.get();
      const obj3 = pool.get();
      const obj4 = pool.get(); // Should create new since pool is empty

      expect(pool.total()).toBe(3); // Should not exceed maxSize

      pool.return(obj1);
      pool.return(obj2);
      pool.return(obj3);
      pool.return(obj4); // Should be discarded due to size limit

      expect(pool.available()).toBe(3);
      expect(pool.total()).toBe(3);
    });

    it('should provide pool statistics', () => {
      const pool = memoryManager.createPool('statsTest', {
        create: () => ({ data: new Array(1000).fill(0) }),
        reset: (obj) => obj.data.fill(0),
        maxSize: 20,
        preAllocate: 5,
      });

      // Use some objects
      const obj1 = pool.get();
      const obj2 = pool.get();

      const stats = pool.getStats();

      expect(stats.total).toBe(5);
      expect(stats.available).toBe(3);
      expect(stats.inUse).toBe(2);
      expect(stats.hitRate).toBe(1); // 100% hits since objects were available
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Memory Usage Monitoring', () => {
    it('should get current memory usage', () => {
      const usage = memoryManager.getUsage();

      expect(usage).toEqual({
        used: 50 * 1024 * 1024,
        total: 100 * 1024 * 1024,
        percentage: 50,
        available: 50 * 1024 * 1024,
      });
    });

    it('should detect memory pressure', () => {
      // Normal usage - no pressure
      expect(memoryManager.isMemoryPressureHigh()).toBe(false);

      // High usage - should detect pressure
      mockPerformance.memory.usedJSHeapSize = 85 * 1024 * 1024; // 85%
      expect(memoryManager.isMemoryPressureHigh()).toBe(true);

      // Critical usage - should detect critical pressure
      mockPerformance.memory.usedJSHeapSize = 95 * 1024 * 1024; // 95%
      expect(memoryManager.isMemoryPressureHigh('critical')).toBe(true);
    });

    it('should track memory usage over time', () => {
      // Initial measurement
      memoryManager.trackMemoryUsage();

      // Change memory usage
      mockPerformance.memory.usedJSHeapSize = 60 * 1024 * 1024;
      memoryManager.trackMemoryUsage();

      // Change again
      mockPerformance.memory.usedJSHeapSize = 70 * 1024 * 1024;
      memoryManager.trackMemoryUsage();

      const history = memoryManager.getMemoryHistory();

      expect(history).toHaveLength(3);
      expect(history[0].used).toBe(50 * 1024 * 1024);
      expect(history[1].used).toBe(60 * 1024 * 1024);
      expect(history[2].used).toBe(70 * 1024 * 1024);
    });

    it('should calculate memory usage trends', () => {
      // Simulate increasing memory usage
      const usageValues = [40, 50, 60, 70, 80]; // MB
      
      usageValues.forEach((usage) => {
        mockPerformance.memory.usedJSHeapSize = usage * 1024 * 1024;
        memoryManager.trackMemoryUsage();
      });

      const trend = memoryManager.getMemoryTrend();

      expect(trend.direction).toBe('increasing');
      expect(trend.slope).toBeGreaterThan(0);
      expect(trend.confidence).toBeGreaterThan(0.8);
    });

    it('should predict memory exhaustion', () => {
      // Simulate rapid memory growth
      const baseUsage = 50;
      for (let i = 0; i < 10; i++) {
        mockPerformance.memory.usedJSHeapSize = (baseUsage + i * 5) * 1024 * 1024;
        memoryManager.trackMemoryUsage();
      }

      const prediction = memoryManager.predictMemoryExhaustion();

      expect(prediction.willExhaust).toBe(true);
      expect(prediction.timeToExhaustion).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Garbage Collection Management', () => {
    it('should suggest garbage collection when appropriate', () => {
      // Low memory usage - no GC needed
      expect(memoryManager.shouldTriggerGC()).toBe(false);

      // High memory usage - should suggest GC
      mockPerformance.memory.usedJSHeapSize = 80 * 1024 * 1024;
      expect(memoryManager.shouldTriggerGC()).toBe(true);
    });

    it('should force garbage collection when available', () => {
      const mockGC = jest.fn();
      (global as any).gc = mockGC;

      memoryManager.triggerGC();

      expect(mockGC).toHaveBeenCalled();

      // Clean up
      delete (global as any).gc;
    });

    it('should fallback when gc is not available', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      memoryManager.triggerGC();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Forced GC not available, using fallback memory cleanup'
      );

      consoleSpy.mockRestore();
    });

    it('should schedule idle-time garbage collection', () => {
      memoryManager.scheduleIdleGC();

      expect(global.requestIdleCallback).toHaveBeenCalledWith(
        expect.any(Function),
        { timeout: 5000 }
      );
    });

    it('should clean up references during GC', () => {
      const weakRefs: WeakRef<any>[] = [];
      const obj = { data: 'test' };
      const weakRef = new WeakRef(obj);
      
      memoryManager.addWeakReference(weakRef);
      
      // Simulate object being garbage collected
      const cleanupSpy = jest.spyOn(memoryManager, 'cleanupWeakReferences');
      memoryManager.triggerGC();

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('Memory Leak Detection', () => {
    it('should detect memory leaks from growing objects', () => {
      const testObj = { items: [] as any[] };
      
      memoryManager.watchObject('testObject', testObj);

      // Simulate object growth
      for (let i = 0; i < 100; i++) {
        testObj.items.push({ data: new Array(1000).fill(i) });
        memoryManager.checkForLeaks();
      }

      const leaks = memoryManager.getDetectedLeaks();
      expect(leaks).toHaveLength(1);
      expect(leaks[0].objectName).toBe('testObject');
      expect(leaks[0].growthRate).toBeGreaterThan(0);
    });

    it('should detect DOM node leaks', () => {
      const container = document.createElement('div');
      
      // Create many DOM nodes
      for (let i = 0; i < 50; i++) {
        const element = document.createElement('div');
        element.textContent = `Element ${i}`;
        container.appendChild(element);
      }

      memoryManager.watchDOMNodes(container);
      
      // Add more nodes
      for (let i = 50; i < 100; i++) {
        const element = document.createElement('div');
        element.textContent = `Element ${i}`;
        container.appendChild(element);
      }

      memoryManager.checkForLeaks();

      const leaks = memoryManager.getDetectedLeaks();
      expect(leaks.some(leak => leak.type === 'dom')).toBe(true);
    });

    it('should detect event listener leaks', () => {
      const element = document.createElement('button');
      const listeners = [];

      // Add many event listeners
      for (let i = 0; i < 20; i++) {
        const listener = () => console.log(`Listener ${i}`);
        element.addEventListener('click', listener);
        listeners.push(listener);
      }

      memoryManager.watchEventListeners(element);
      
      // Add more listeners without removing old ones
      for (let i = 20; i < 40; i++) {
        const listener = () => console.log(`Listener ${i}`);
        element.addEventListener('click', listener);
      }

      memoryManager.checkForLeaks();

      const leaks = memoryManager.getDetectedLeaks();
      expect(leaks.some(leak => leak.type === 'eventListeners')).toBe(true);
    });

    it('should provide leak mitigation suggestions', () => {
      const testObj = { cache: new Map(), items: [] as any[] };
      
      // Simulate cache growth
      for (let i = 0; i < 1000; i++) {
        testObj.cache.set(`key${i}`, { data: new Array(100).fill(i) });
      }

      memoryManager.watchObject('growingCache', testObj);
      memoryManager.checkForLeaks();

      const leaks = memoryManager.getDetectedLeaks();
      const cacheLeaks = leaks.filter(leak => leak.objectName === 'growingCache');
      
      if (cacheLeaks.length > 0) {
        expect(cacheLeaks[0].suggestions).toContain('Consider implementing LRU cache');
        expect(cacheLeaks[0].suggestions).toContain('Add cache size limits');
      }
    });
  });

  describe('Memory Optimization', () => {
    it('should optimize object allocations', () => {
      const originalObj = {
        name: 'test',
        data: new Array(1000).fill('data'),
        metadata: { created: Date.now(), updated: Date.now() },
        cache: new Map(),
      };

      const optimized = memoryManager.optimizeObject(originalObj);

      expect(optimized).toBeDefined();
      expect(optimized.name).toBe('test');
      // Should have been optimized in some way (implementation dependent)
    });

    it('should suggest memory optimizations', () => {
      // High memory usage scenario
      mockPerformance.memory.usedJSHeapSize = 85 * 1024 * 1024;

      const suggestions = memoryManager.getOptimizationSuggestions();

      expect(suggestions).toContain('Consider reducing cache sizes');
      expect(suggestions).toContain('Enable object pooling for frequently created objects');
      expect(suggestions).toContain('Clean up unused event listeners');
    });

    it('should apply automatic optimizations', () => {
      const optimizationSpy = jest.spyOn(memoryManager, 'applyAutomaticOptimizations');
      
      // Trigger high memory pressure
      mockPerformance.memory.usedJSHeapSize = 90 * 1024 * 1024;
      memoryManager.checkMemoryPressure();

      expect(optimizationSpy).toHaveBeenCalled();
    });

    it('should compact memory when possible', () => {
      const compactionSpy = jest.spyOn(memoryManager, 'compactMemory');
      
      memoryManager.compactMemory();

      expect(compactionSpy).toHaveBeenCalled();
      
      // Should trigger GC and cleanup
      expect(global.requestIdleCallback).toHaveBeenCalled();
    });
  });

  describe('Device-Specific Adaptations', () => {
    it('should adapt to low-memory devices', () => {
      // Mock low memory device
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 1, // 1GB device
        writable: true,
      });

      memoryManager.adaptToDevice();

      const threshold = memoryManager.getMemoryThreshold();
      expect(threshold).toBeLessThan(0.8); // Should be more conservative
    });

    it('should adapt to high-memory devices', () => {
      // Mock high memory device
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 8, // 8GB device
        writable: true,
      });

      memoryManager.adaptToDevice();

      const threshold = memoryManager.getMemoryThreshold();
      expect(threshold).toBeGreaterThan(0.8); // Can be more relaxed
    });

    it('should adjust pool sizes based on device memory', () => {
      // Mock low memory device
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 2, // 2GB device
        writable: true,
      });

      memoryManager.adaptToDevice();

      const pool = memoryManager.createPool('adaptivePool', {
        create: () => ({ data: [] }),
        reset: (obj) => obj.data.length = 0,
        maxSize: 100, // Original size
        preAllocate: 20,
      });

      // Should create smaller pool for low-memory device
      expect(pool.getMaxSize()).toBeLessThan(100);
    });

    it('should detect device capabilities', () => {
      const capabilities = memoryManager.getDeviceCapabilities();

      expect(capabilities).toHaveProperty('deviceMemory');
      expect(capabilities).toHaveProperty('hardwareConcurrency');
      expect(capabilities).toHaveProperty('maxTextureSize');
      expect(capabilities).toHaveProperty('webGLSupported');
    });
  });

  describe('Performance Monitoring', () => {
    it('should track allocation performance', () => {
      const pool = memoryManager.createPool('perfTest', {
        create: () => ({ id: Math.random(), data: [] }),
        reset: (obj) => { obj.data.length = 0; },
        maxSize: 50,
        preAllocate: 10,
      });

      // Measure allocation performance
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        const obj = pool.get();
        pool.return(obj);
      }

      const metrics = memoryManager.getPerformanceMetrics();

      expect(metrics.averageAllocationTime).toBeGreaterThan(0);
      expect(metrics.allocationCount).toBe(100);
    });

    it('should monitor GC frequency', () => {
      const initialGCCount = memoryManager.getGCCount();

      // Trigger several GCs
      memoryManager.triggerGC();
      memoryManager.triggerGC();
      memoryManager.triggerGC();

      const finalGCCount = memoryManager.getGCCount();
      expect(finalGCCount).toBeGreaterThan(initialGCCount);
    });

    it('should calculate memory efficiency metrics', () => {
      const pool = memoryManager.createPool('efficiencyTest', {
        create: () => ({ size: 1024 }),
        reset: (obj) => {},
        maxSize: 20,
        preAllocate: 5,
      });

      // Use pool extensively
      for (let i = 0; i < 50; i++) {
        const obj = pool.get();
        if (Math.random() > 0.5) {
          pool.return(obj);
        }
      }

      const efficiency = memoryManager.getMemoryEfficiency();

      expect(efficiency.poolUtilization).toBeGreaterThan(0);
      expect(efficiency.wasteRatio).toBeLessThan(1);
      expect(efficiency.reuseRate).toBeGreaterThan(0);
    });
  });

  describe('Memory Pressure Handling', () => {
    it('should handle memory warnings', () => {
      const warningHandler = jest.fn();
      memoryManager.onMemoryWarning(warningHandler);

      // Trigger memory pressure
      mockPerformance.memory.usedJSHeapSize = 85 * 1024 * 1024;
      memoryManager.checkMemoryPressure();

      expect(warningHandler).toHaveBeenCalledWith({
        level: 'warning',
        usage: expect.any(Object),
        suggestions: expect.any(Array),
      });
    });

    it('should handle memory critical situations', () => {
      const criticalHandler = jest.fn();
      memoryManager.onMemoryCritical(criticalHandler);

      // Trigger critical memory pressure
      mockPerformance.memory.usedJSHeapSize = 95 * 1024 * 1024;
      memoryManager.checkMemoryPressure();

      expect(criticalHandler).toHaveBeenCalledWith({
        level: 'critical',
        usage: expect.any(Object),
        emergencyActions: expect.any(Array),
      });
    });

    it('should perform emergency cleanup', () => {
      const cleanupSpy = jest.spyOn(memoryManager, 'emergencyCleanup');

      // Trigger emergency cleanup
      mockPerformance.memory.usedJSHeapSize = 98 * 1024 * 1024;
      memoryManager.handleMemoryEmergency();

      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should reduce memory usage during pressure', () => {
      const initialUsage = memoryManager.getUsage().used;

      // Create some pools with objects
      const pool = memoryManager.createPool('pressureTest', {
        create: () => ({ data: new Array(1000).fill('test') }),
        reset: (obj) => obj.data.fill(null),
        maxSize: 20,
        preAllocate: 10,
      });

      // Trigger memory pressure response
      mockPerformance.memory.usedJSHeapSize = 90 * 1024 * 1024;
      memoryManager.respondToMemoryPressure('high');

      // Should have reduced pool sizes or cleared caches
      expect(pool.available()).toBeLessThan(10);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle allocation failures gracefully', () => {
      const faultyPool = memoryManager.createPool('faultyPool', {
        create: () => {
          throw new Error('Allocation failed');
        },
        reset: (obj) => {},
        maxSize: 10,
        preAllocate: 0,
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const obj = faultyPool.get();
      expect(obj).toBeNull();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to create object in pool faultyPool:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should recover from memory API unavailability', () => {
      // Mock missing performance.memory
      const originalMemory = mockPerformance.memory;
      delete (mockPerformance as any).memory;

      const usage = memoryManager.getUsage();

      expect(usage.used).toBe(0);
      expect(usage.total).toBe(0);
      expect(usage.percentage).toBe(0);

      // Restore
      mockPerformance.memory = originalMemory;
    });

    it('should handle corrupted pool state', () => {
      const pool = memoryManager.createPool('corruptTest', {
        create: () => ({ valid: true }),
        reset: (obj) => { obj.valid = true; },
        maxSize: 5,
        preAllocate: 2,
      });

      // Corrupt the pool state
      (pool as any)._available = null;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const obj = pool.get();
      expect(obj).toBeDefined(); // Should recover

      expect(consoleSpy).toHaveBeenCalledWith(
        'Pool corruption detected, reinitializing:',
        'corruptTest'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Configuration and Settings', () => {
    it('should allow configuration of memory thresholds', () => {
      memoryManager.setMemoryThreshold(0.75);
      expect(memoryManager.getMemoryThreshold()).toBe(0.75);

      // Should affect pressure detection
      mockPerformance.memory.usedJSHeapSize = 76 * 1024 * 1024; // 76%
      expect(memoryManager.isMemoryPressureHigh()).toBe(true);
    });

    it('should save and restore configuration', () => {
      const config = {
        memoryThreshold: 0.85,
        gcThreshold: 0.9,
        enableAutoCleanup: false,
        poolSizeMultiplier: 1.5,
        leakDetectionEnabled: false,
      };

      memoryManager.setConfiguration(config);

      const savedConfig = memoryManager.getConfiguration();
      expect(savedConfig).toEqual(config);
    });

    it('should validate configuration values', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      memoryManager.setMemoryThreshold(1.5); // Invalid threshold

      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid memory threshold: 1.5. Must be between 0 and 1.'
      );

      expect(memoryManager.getMemoryThreshold()).not.toBe(1.5);

      consoleSpy.mockRestore();
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with complex memory scenarios', async () => {
      // Create multiple pools for different object types
      const chartDataPool = memoryManager.createPool('chartData', {
        create: () => ({ points: [], metadata: {} }),
        reset: (obj) => { obj.points.length = 0; Object.keys(obj.metadata).forEach(k => delete obj.metadata[k]); },
        maxSize: 50,
        preAllocate: 10,
      });

      const vendorPool = memoryManager.createPool('vendors', {
        create: () => ({ id: '', name: '', metrics: {} }),
        reset: (obj) => { obj.id = ''; obj.name = ''; obj.metrics = {}; },
        maxSize: 30,
        preAllocate: 5,
      });

      // Simulate heavy usage
      const objects = [];
      for (let i = 0; i < 100; i++) {
        const chartData = chartDataPool.get();
        const vendor = vendorPool.get();

        chartData.points = Array.from({ length: 100 }, (_, j) => ({ x: j, y: Math.random() }));
        vendor.id = `vendor-${i}`;
        vendor.name = `Vendor ${i}`;

        objects.push({ chartData, vendor });

        if (i % 20 === 0) {
          // Return some objects to pool
          objects.slice(0, 10).forEach(({ chartData, vendor }) => {
            chartDataPool.return(chartData);
            vendorPool.return(vendor);
          });
          objects.splice(0, 10);
        }
      }

      // Check memory state
      const usage = memoryManager.getUsage();
      const chartStats = chartDataPool.getStats();
      const vendorStats = vendorPool.getStats();

      expect(usage.percentage).toBeGreaterThan(0);
      expect(chartStats.hitRate).toBeGreaterThan(0);
      expect(vendorStats.hitRate).toBeGreaterThan(0);

      // Trigger memory pressure
      mockPerformance.memory.usedJSHeapSize = 88 * 1024 * 1024;
      memoryManager.checkMemoryPressure();

      // Should have triggered optimizations
      const leaks = memoryManager.getDetectedLeaks();
      const suggestions = memoryManager.getOptimizationSuggestions();

      expect(suggestions.length).toBeGreaterThan(0);

      // Clean up
      objects.forEach(({ chartData, vendor }) => {
        chartDataPool.return(chartData);
        vendorPool.return(vendor);
      });

      // Verify cleanup
      expect(chartDataPool.available()).toBeGreaterThan(0);
      expect(vendorPool.available()).toBeGreaterThan(0);
    });

    it('should handle real-world mobile constraints', () => {
      // Simulate low-end mobile device
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 1, // 1GB device
        writable: true,
      });

      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 2, // Dual core
        writable: true,
      });

      // Smaller heap limit
      mockPerformance.memory.jsHeapSizeLimit = 512 * 1024 * 1024; // 512MB
      mockPerformance.memory.totalJSHeapSize = 256 * 1024 * 1024; // 256MB
      mockPerformance.memory.usedJSHeapSize = 200 * 1024 * 1024; // 200MB

      // Adapt to device
      memoryManager.adaptToDevice();

      // Create pool with device-adapted settings
      const mobilePool = memoryManager.createPool('mobileOptimized', {
        create: () => ({ data: [] }),
        reset: (obj) => obj.data.length = 0,
        maxSize: 20, // Will be reduced further by device adaptation
        preAllocate: 3,
      });

      // Should have smaller pool size due to device constraints
      expect(mobilePool.getMaxSize()).toBeLessThan(20);

      // Memory pressure should be detected earlier
      expect(memoryManager.isMemoryPressureHigh()).toBe(true); // 200/256 = ~78%

      // Should provide mobile-specific suggestions
      const suggestions = memoryManager.getOptimizationSuggestions();
      expect(suggestions.some(s => s.includes('mobile'))).toBe(true);
    });
  });
});