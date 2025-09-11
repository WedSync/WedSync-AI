import { jest } from '@jest/globals';
import { ChartVirtualization } from '../../../src/lib/services/mobile/ChartVirtualization';
import { ChartDataPoint, VirtualizedChartData, ViewportInfo, LODLevel } from '../../../src/types/mobile-analytics';

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
  },
};

global.performance = mockPerformance as any;

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 16); // 60fps
  return 1;
});

global.cancelAnimationFrame = jest.fn();

// Mock WebGL context
const mockWebGLContext = {
  canvas: {
    width: 800,
    height: 600,
  },
  createBuffer: jest.fn(),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  createProgram: jest.fn(),
  createShader: jest.fn(),
  shaderSource: jest.fn(),
  compileShader: jest.fn(),
  attachShader: jest.fn(),
  linkProgram: jest.fn(),
  useProgram: jest.fn(),
  getAttribLocation: jest.fn(),
  enableVertexAttribArray: jest.fn(),
  vertexAttribPointer: jest.fn(),
  drawArrays: jest.fn(),
  viewport: jest.fn(),
  clear: jest.fn(),
  clearColor: jest.fn(),
};

// Mock canvas and context
const mockCanvas = {
  getContext: jest.fn((type) => {
    if (type === 'webgl' || type === 'webgl2') {
      return mockWebGLContext;
    }
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
    };
  }),
  width: 800,
  height: 600,
};

global.HTMLCanvasElement.prototype.getContext = mockCanvas.getContext as any;

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Generate mock data
const generateMockData = (count: number): ChartDataPoint[] => {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: new Date(2025, 0, 1 + i),
    value: Math.random() * 100 + 50,
    label: `Point ${i + 1}`,
    metadata: {
      category: i % 3 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low',
      confidence: Math.random(),
    },
  }));
};

const mockSmallDataset = generateMockData(100);
const mockLargeDataset = generateMockData(10000);
const mockHugeDataset = generateMockData(100000);

describe('ChartVirtualization', () => {
  let virtualization: ChartVirtualization;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPerformance.now.mockReturnValue(Date.now());
    mockPerformance.mark.mockImplementation(() => {});
    mockPerformance.measure.mockImplementation(() => {});
    
    virtualization = ChartVirtualization.getInstance();
  });

  afterEach(() => {
    virtualization.cleanup();
    jest.resetAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ChartVirtualization.getInstance();
      const instance2 = ChartVirtualization.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Data Virtualization', () => {
    it('should virtualize large datasets', () => {
      const viewport: ViewportInfo = {
        startIndex: 0,
        endIndex: 100,
        width: 800,
        height: 600,
        pixelRatio: 1,
        zoomLevel: 1,
      };

      const result = virtualization.virtualizeData(mockLargeDataset, viewport);

      expect(result.visibleData).toHaveLength(101); // startIndex to endIndex inclusive
      expect(result.totalDataPoints).toBe(mockLargeDataset.length);
      expect(result.virtualizationEnabled).toBe(true);
    });

    it('should not virtualize small datasets', () => {
      const viewport: ViewportInfo = {
        startIndex: 0,
        endIndex: 50,
        width: 800,
        height: 600,
        pixelRatio: 1,
        zoomLevel: 1,
      };

      const result = virtualization.virtualizeData(mockSmallDataset, viewport);

      expect(result.visibleData).toHaveLength(mockSmallDataset.length);
      expect(result.virtualizationEnabled).toBe(false);
    });

    it('should handle edge cases in viewport bounds', () => {
      const viewport: ViewportInfo = {
        startIndex: -10, // Negative start
        endIndex: 50000, // Beyond data length
        width: 800,
        height: 600,
        pixelRatio: 1,
        zoomLevel: 1,
      };

      const result = virtualization.virtualizeData(mockLargeDataset, viewport);

      expect(result.visibleData).toHaveLength(mockLargeDataset.length);
      expect(result.startIndex).toBe(0);
      expect(result.endIndex).toBe(mockLargeDataset.length - 1);
    });

    it('should apply data sampling for huge datasets', () => {
      const viewport: ViewportInfo = {
        startIndex: 0,
        endIndex: 1000,
        width: 800,
        height: 600,
        pixelRatio: 1,
        zoomLevel: 0.1, // Zoomed out
      };

      const result = virtualization.virtualizeData(mockHugeDataset, viewport);

      // Should sample data when zoomed out
      expect(result.visibleData.length).toBeLessThan(1001);
      expect(result.samplingApplied).toBe(true);
    });

    it('should preserve data types and structure', () => {
      const viewport: ViewportInfo = {
        startIndex: 10,
        endIndex: 20,
        width: 800,
        height: 600,
        pixelRatio: 1,
        zoomLevel: 1,
      };

      const result = virtualization.virtualizeData(mockLargeDataset, viewport);

      result.visibleData.forEach((point, index) => {
        const originalPoint = mockLargeDataset[10 + index];
        expect(point.timestamp).toEqual(originalPoint.timestamp);
        expect(point.value).toBe(originalPoint.value);
        expect(point.label).toBe(originalPoint.label);
      });
    });
  });

  describe('Viewport Management', () => {
    it('should calculate viewport from scroll position', () => {
      const scrollInfo = {
        scrollLeft: 400,
        scrollTop: 0,
        containerWidth: 800,
        containerHeight: 600,
        contentWidth: 2000,
        contentHeight: 600,
      };

      const viewport = virtualization.calculateViewport(
        scrollInfo,
        mockLargeDataset.length,
        { pixelRatio: 1, zoomLevel: 1 }
      );

      expect(viewport.startIndex).toBeGreaterThanOrEqual(0);
      expect(viewport.endIndex).toBeLessThan(mockLargeDataset.length);
      expect(viewport.width).toBe(800);
      expect(viewport.height).toBe(600);
    });

    it('should handle zoom level changes', () => {
      const scrollInfo = {
        scrollLeft: 0,
        scrollTop: 0,
        containerWidth: 800,
        containerHeight: 600,
        contentWidth: 1600, // 2x zoom
        contentHeight: 600,
      };

      const viewport = virtualization.calculateViewport(
        scrollInfo,
        mockLargeDataset.length,
        { pixelRatio: 1, zoomLevel: 2 }
      );

      expect(viewport.zoomLevel).toBe(2);
      expect(viewport.endIndex - viewport.startIndex).toBeLessThan(
        mockLargeDataset.length / 2
      ); // Fewer visible points when zoomed in
    });

    it('should update viewport efficiently', () => {
      const initialViewport: ViewportInfo = {
        startIndex: 0,
        endIndex: 100,
        width: 800,
        height: 600,
        pixelRatio: 1,
        zoomLevel: 1,
      };

      virtualization.updateViewport(initialViewport);

      const newViewport: ViewportInfo = {
        startIndex: 50,
        endIndex: 150,
        width: 800,
        height: 600,
        pixelRatio: 1,
        zoomLevel: 1,
      };

      const updateSpy = jest.spyOn(virtualization, 'updateViewport');
      virtualization.updateViewport(newViewport);

      expect(updateSpy).toHaveBeenCalledWith(newViewport);
    });

    it('should debounce frequent viewport updates', async () => {
      jest.useFakeTimers();

      const updateSpy = jest.fn();
      virtualization.on('viewportChanged', updateSpy);

      // Rapid viewport updates
      for (let i = 0; i < 10; i++) {
        virtualization.updateViewport({
          startIndex: i * 10,
          endIndex: (i + 1) * 10,
          width: 800,
          height: 600,
          pixelRatio: 1,
          zoomLevel: 1,
        });
      }

      expect(updateSpy).not.toHaveBeenCalled(); // Should be debounced

      jest.advanceTimersByTime(100); // Advance debounce timeout

      expect(updateSpy).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });

  describe('Level of Detail (LOD)', () => {
    it('should determine LOD based on zoom level', () => {
      const testCases: Array<{ zoom: number; expected: LODLevel }> = [
        { zoom: 0.1, expected: 'low' },
        { zoom: 0.5, expected: 'medium' },
        { zoom: 1.0, expected: 'high' },
        { zoom: 2.0, expected: 'high' },
      ];

      testCases.forEach(({ zoom, expected }) => {
        const lod = virtualization.calculateLOD(zoom, mockLargeDataset.length);
        expect(lod).toBe(expected);
      });
    });

    it('should apply appropriate data reduction for LOD levels', () => {
      const lowLODResult = virtualization.applyLOD(mockHugeDataset, 'low');
      const mediumLODResult = virtualization.applyLOD(mockHugeDataset, 'medium');
      const highLODResult = virtualization.applyLOD(mockHugeDataset, 'high');

      expect(lowLODResult.length).toBeLessThan(mediumLODResult.length);
      expect(mediumLODResult.length).toBeLessThan(highLODResult.length);
      expect(highLODResult.length).toBeLessThanOrEqual(mockHugeDataset.length);
    });

    it('should preserve important data points in LOD reduction', () => {
      // Add some extreme values to the dataset
      const dataWithExtremes = [
        ...mockLargeDataset.slice(0, 100),
        {
          timestamp: new Date(2025, 0, 101),
          value: 1000, // Extreme high value
          label: 'Extreme High',
        },
        ...mockLargeDataset.slice(100, 200),
        {
          timestamp: new Date(2025, 0, 201),
          value: 0, // Extreme low value
          label: 'Extreme Low',
        },
        ...mockLargeDataset.slice(200),
      ];

      const result = virtualization.applyLOD(dataWithExtremes, 'low');

      // Should preserve extreme values
      const hasExtremeHigh = result.some(point => point.value === 1000);
      const hasExtremeLow = result.some(point => point.value === 0);

      expect(hasExtremeHigh).toBe(true);
      expect(hasExtremeLow).toBe(true);
    });

    it('should use different sampling algorithms for different LOD levels', () => {
      const data = generateMockData(1000);

      const uniformSample = virtualization.applySampling(data, 100, 'uniform');
      const adaptiveSample = virtualization.applySampling(data, 100, 'adaptive');
      const importanceSample = virtualization.applySampling(data, 100, 'importance');

      expect(uniformSample).toHaveLength(100);
      expect(adaptiveSample).toHaveLength(100);
      expect(importanceSample).toHaveLength(100);

      // Different algorithms should produce different results
      expect(uniformSample).not.toEqual(adaptiveSample);
      expect(adaptiveSample).not.toEqual(importanceSample);
    });
  });

  describe('WebGL Acceleration', () => {
    it('should detect WebGL support', () => {
      const hasWebGL = virtualization.hasWebGLSupport();
      expect(hasWebGL).toBe(true);
    });

    it('should render data using WebGL when available', () => {
      const viewport: ViewportInfo = {
        startIndex: 0,
        endIndex: 1000,
        width: 800,
        height: 600,
        pixelRatio: 1,
        zoomLevel: 1,
      };

      const canvas = document.createElement('canvas');
      virtualization.renderWithWebGL(mockLargeDataset, viewport, canvas);

      expect(mockWebGLContext.createBuffer).toHaveBeenCalled();
      expect(mockWebGLContext.bufferData).toHaveBeenCalled();
      expect(mockWebGLContext.drawArrays).toHaveBeenCalled();
    });

    it('should fallback to canvas 2D when WebGL is not available', () => {
      mockCanvas.getContext.mockImplementation((type) => {
        if (type === 'webgl' || type === 'webgl2') {
          return null; // WebGL not available
        }
        return {
          fillRect: jest.fn(),
          clearRect: jest.fn(),
          beginPath: jest.fn(),
          moveTo: jest.fn(),
          lineTo: jest.fn(),
          stroke: jest.fn(),
        };
      });

      const viewport: ViewportInfo = {
        startIndex: 0,
        endIndex: 1000,
        width: 800,
        height: 600,
        pixelRatio: 1,
        zoomLevel: 1,
      };

      const canvas = document.createElement('canvas');
      const context = virtualization.renderWith2D(mockLargeDataset, viewport, canvas);

      expect(context?.beginPath).toHaveBeenCalled();
      expect(context?.stroke).toHaveBeenCalled();
    });

    it('should handle WebGL context loss gracefully', () => {
      const canvas = document.createElement('canvas');
      const viewport: ViewportInfo = {
        startIndex: 0,
        endIndex: 1000,
        width: 800,
        height: 600,
        pixelRatio: 1,
        zoomLevel: 1,
      };

      // Simulate context loss
      mockWebGLContext.isContextLost = () => true;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      virtualization.renderWithWebGL(mockLargeDataset, viewport, canvas);

      expect(consoleSpy).toHaveBeenCalledWith('WebGL context lost, falling back to 2D');

      consoleSpy.mockRestore();
    });
  });

  describe('Performance Optimization', () => {
    it('should use object pooling for data points', () => {
      const poolSize = 1000;
      const pool = virtualization.createObjectPool(poolSize);

      // Get objects from pool
      const objects = Array.from({ length: 500 }, () => pool.get());

      expect(objects).toHaveLength(500);
      expect(pool.available()).toBe(500); // 500 remaining

      // Return objects to pool
      objects.forEach(obj => pool.return(obj));

      expect(pool.available()).toBe(poolSize);
    });

    it('should batch DOM updates', async () => {
      jest.useFakeTimers();

      const updateSpy = jest.fn();
      virtualization.on('batchUpdate', updateSpy);

      // Queue multiple updates
      virtualization.queueUpdate(() => updateSpy('update1'));
      virtualization.queueUpdate(() => updateSpy('update2'));
      virtualization.queueUpdate(() => updateSpy('update3'));

      expect(updateSpy).not.toHaveBeenCalled(); // Should be batched

      jest.advanceTimersByTime(0); // Advance to next frame

      expect(updateSpy).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
    });

    it('should throttle expensive operations', () => {
      jest.useFakeTimers();

      const expensiveOperation = jest.fn();
      const throttledOperation = virtualization.throttle(expensiveOperation, 100);

      // Call multiple times quickly
      throttledOperation();
      throttledOperation();
      throttledOperation();

      expect(expensiveOperation).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);

      throttledOperation();
      expect(expensiveOperation).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('should cache expensive calculations', () => {
      const expensiveCalculation = jest.fn((data: ChartDataPoint[]) => {
        return data.reduce((sum, point) => sum + point.value, 0);
      });

      const cachedCalculation = virtualization.memoize(expensiveCalculation);

      // First call
      const result1 = cachedCalculation(mockSmallDataset);
      expect(expensiveCalculation).toHaveBeenCalledTimes(1);

      // Second call with same data - should use cache
      const result2 = cachedCalculation(mockSmallDataset);
      expect(expensiveCalculation).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);

      // Call with different data
      const result3 = cachedCalculation(mockLargeDataset);
      expect(expensiveCalculation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Touch Optimization', () => {
    it('should handle touch events efficiently', () => {
      const touchHandler = virtualization.createTouchHandler();
      const mockEvent = {
        touches: [{ clientX: 100, clientY: 200 }],
        preventDefault: jest.fn(),
      } as any;

      touchHandler.onTouchStart(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should optimize for touch viewport updates', () => {
      const viewport: ViewportInfo = {
        startIndex: 0,
        endIndex: 100,
        width: 375, // Mobile width
        height: 667, // Mobile height
        pixelRatio: 2, // Retina
        zoomLevel: 1,
      };

      const result = virtualization.optimizeForTouch(mockLargeDataset, viewport);

      expect(result.touchOptimized).toBe(true);
      expect(result.visibleData.length).toBeLessThanOrEqual(viewport.endIndex - viewport.startIndex + 1);
    });

    it('should adjust rendering quality based on touch interaction', () => {
      virtualization.setTouchActive(true);

      const viewport: ViewportInfo = {
        startIndex: 0,
        endIndex: 1000,
        width: 800,
        height: 600,
        pixelRatio: 1,
        zoomLevel: 1,
      };

      const result = virtualization.virtualizeData(mockLargeDataset, viewport);

      // Should reduce quality during touch interactions
      expect(result.lodLevel).toBe('low');

      virtualization.setTouchActive(false);

      const result2 = virtualization.virtualizeData(mockLargeDataset, viewport);

      // Should restore quality after touch ends
      expect(result2.lodLevel).toBe('high');
    });
  });

  describe('Memory Management', () => {
    it('should monitor memory usage', () => {
      const memoryInfo = virtualization.getMemoryUsage();

      expect(memoryInfo).toEqual({
        usedBytes: 50 * 1024 * 1024,
        totalBytes: 100 * 1024 * 1024,
        percentage: 50,
      });
    });

    it('should clean up resources when memory pressure is high', () => {
      // Mock high memory usage
      mockPerformance.memory.usedJSHeapSize = 90 * 1024 * 1024;
      mockPerformance.memory.totalJSHeapSize = 100 * 1024 * 1024;

      const cleanupSpy = jest.spyOn(virtualization, 'cleanup');

      virtualization.virtualizeData(mockHugeDataset, {
        startIndex: 0,
        endIndex: 1000,
        width: 800,
        height: 600,
        pixelRatio: 1,
        zoomLevel: 1,
      });

      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should dispose of WebGL resources properly', () => {
      const canvas = document.createElement('canvas');
      virtualization.renderWithWebGL(mockLargeDataset, {
        startIndex: 0,
        endIndex: 1000,
        width: 800,
        height: 600,
        pixelRatio: 1,
        zoomLevel: 1,
      }, canvas);

      virtualization.cleanup();

      // WebGL resources should be disposed
      expect(mockWebGLContext.deleteBuffer).toHaveBeenCalled();
    });
  });

  describe('Performance Metrics', () => {
    it('should track rendering performance', () => {
      const viewport: ViewportInfo = {
        startIndex: 0,
        endIndex: 1000,
        width: 800,
        height: 600,
        pixelRatio: 1,
        zoomLevel: 1,
      };

      virtualization.virtualizeData(mockLargeDataset, viewport);

      const metrics = virtualization.getPerformanceMetrics();

      expect(metrics).toHaveProperty('averageRenderTime');
      expect(metrics).toHaveProperty('virtualizationHitRate');
      expect(metrics).toHaveProperty('memoryUsageHistory');
    });

    it('should measure frame rate during animations', () => {
      jest.useFakeTimers();

      virtualization.startPerformanceMonitoring();

      // Simulate multiple frames
      for (let i = 0; i < 60; i++) {
        virtualization.virtualizeData(mockLargeDataset, {
          startIndex: i * 10,
          endIndex: (i + 1) * 10,
          width: 800,
          height: 600,
          pixelRatio: 1,
          zoomLevel: 1,
        });

        jest.advanceTimersByTime(16); // 60fps
      }

      const metrics = virtualization.getPerformanceMetrics();
      expect(metrics.averageFPS).toBeCloseTo(60, 1);

      jest.useRealTimers();
    });

    it('should track LOD effectiveness', () => {
      // Test different LOD levels
      virtualization.applyLOD(mockHugeDataset, 'low');
      virtualization.applyLOD(mockHugeDataset, 'medium');
      virtualization.applyLOD(mockHugeDataset, 'high');

      const metrics = virtualization.getPerformanceMetrics();

      expect(metrics.lodStats).toBeDefined();
      expect(metrics.lodStats.low).toBeGreaterThan(0);
      expect(metrics.lodStats.medium).toBeGreaterThan(0);
      expect(metrics.lodStats.high).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted data gracefully', () => {
      const corruptedData = [
        { timestamp: 'invalid', value: NaN, label: null },
        ...mockSmallDataset,
      ] as any;

      const viewport: ViewportInfo = {
        startIndex: 0,
        endIndex: 50,
        width: 800,
        height: 600,
        pixelRatio: 1,
        zoomLevel: 1,
      };

      const result = virtualization.virtualizeData(corruptedData, viewport);

      // Should filter out corrupted data
      expect(result.visibleData.every(point => 
        point.timestamp instanceof Date && 
        typeof point.value === 'number' && 
        !isNaN(point.value)
      )).toBe(true);
    });

    it('should recover from WebGL errors', () => {
      mockWebGLContext.createBuffer.mockImplementation(() => {
        throw new Error('WebGL error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const canvas = document.createElement('canvas');
      virtualization.renderWithWebGL(mockSmallDataset, {
        startIndex: 0,
        endIndex: 50,
        width: 800,
        height: 600,
        pixelRatio: 1,
        zoomLevel: 1,
      }, canvas);

      expect(consoleSpy).toHaveBeenCalledWith(
        'WebGL rendering error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle viewport calculation errors', () => {
      const invalidScrollInfo = {
        scrollLeft: NaN,
        scrollTop: Infinity,
        containerWidth: -100,
        containerHeight: 0,
        contentWidth: null,
        contentHeight: undefined,
      } as any;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const viewport = virtualization.calculateViewport(
        invalidScrollInfo,
        mockLargeDataset.length,
        { pixelRatio: 1, zoomLevel: 1 }
      );

      expect(viewport.startIndex).toBe(0);
      expect(viewport.endIndex).toBeGreaterThanOrEqual(0);
      expect(viewport.width).toBeGreaterThan(0);
      expect(viewport.height).toBeGreaterThan(0);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid scroll info provided, using defaults'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with real-world scenario', async () => {
      // Large dataset with mixed data types
      const realWorldData = generateMockData(50000);

      // Mobile viewport with retina display
      const mobileViewport: ViewportInfo = {
        startIndex: 0,
        endIndex: 100,
        width: 375,
        height: 667,
        pixelRatio: 2,
        zoomLevel: 1,
      };

      // Initial virtualization
      const result1 = virtualization.virtualizeData(realWorldData, mobileViewport);
      expect(result1.virtualizationEnabled).toBe(true);
      expect(result1.visibleData.length).toBeLessThanOrEqual(101);

      // Zoom in
      const zoomedViewport: ViewportInfo = {
        ...mobileViewport,
        startIndex: 50,
        endIndex: 80,
        zoomLevel: 3,
      };

      const result2 = virtualization.virtualizeData(realWorldData, zoomedViewport);
      expect(result2.lodLevel).toBe('high');
      expect(result2.visibleData.length).toBe(31);

      // Zoom out
      const zoomedOutViewport: ViewportInfo = {
        ...mobileViewport,
        startIndex: 0,
        endIndex: 1000,
        zoomLevel: 0.1,
      };

      const result3 = virtualization.virtualizeData(realWorldData, zoomedOutViewport);
      expect(result3.lodLevel).toBe('low');
      expect(result3.samplingApplied).toBe(true);

      // Performance should remain good throughout
      const metrics = virtualization.getPerformanceMetrics();
      expect(metrics.averageRenderTime).toBeLessThan(16); // 60fps threshold
    });
  });
});