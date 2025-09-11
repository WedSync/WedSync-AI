import { ChartVirtualizationService } from '@/lib/services/mobile/ChartVirtualization';

// Mock Canvas and WebGL contexts
const mockCanvasContext = {
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  beginPath: jest.fn(),
  closePath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  drawImage: jest.fn(),
  getImageData: jest.fn(),
  putImageData: jest.fn(),
  createImageData: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  scale: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  fillStyle: '#000000',
  strokeStyle: '#000000',
  lineWidth: 1,
  font: '10px sans-serif',
  textAlign: 'start',
  textBaseline: 'alphabetic',
};

const mockWebGLContext = {
  createShader: jest.fn(() => 'mockShader'),
  shaderSource: jest.fn(),
  compileShader: jest.fn(),
  createProgram: jest.fn(() => 'mockProgram'),
  attachShader: jest.fn(),
  linkProgram: jest.fn(),
  useProgram: jest.fn(),
  createBuffer: jest.fn(() => 'mockBuffer'),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  getAttribLocation: jest.fn(() => 0),
  enableVertexAttribArray: jest.fn(),
  vertexAttribPointer: jest.fn(),
  drawArrays: jest.fn(),
  viewport: jest.fn(),
  clear: jest.fn(),
  clearColor: jest.fn(),
  enable: jest.fn(),
  disable: jest.fn(),
  VERTEX_SHADER: 35633,
  FRAGMENT_SHADER: 35632,
  ARRAY_BUFFER: 34962,
  STATIC_DRAW: 35044,
  TRIANGLES: 4,
  COLOR_BUFFER_BIT: 16384,
  DEPTH_BUFFER_BIT: 256,
  BLEND: 3042,
  ONE: 1,
  ONE_MINUS_SRC_ALPHA: 771,
  blendFunc: jest.fn(),
};

// Mock HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn((contextType) => {
    if (contextType === '2d') return mockCanvasContext;
    if (contextType === 'webgl' || contextType === 'experimental-webgl') return mockWebGLContext;
    return null;
  }),
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(callback => {
  setTimeout(() => callback(performance.now()), 16);
  return 1;
});

global.cancelAnimationFrame = jest.fn();

// Mock performance
Object.defineProperty(performance, 'now', {
  value: jest.fn(() => Date.now()),
});

// Mock intersection observer
global.IntersectionObserver = class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  
  private callback: IntersectionObserverCallback;
  
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
};

describe('ChartVirtualizationService', () => {
  let virtualizationService: ChartVirtualizationService;
  let mockCanvas: HTMLCanvasElement;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock DOM elements
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 800;
    mockCanvas.height = 600;
    
    mockContainer = document.createElement('div');
    mockContainer.style.width = '800px';
    mockContainer.style.height = '600px';
    mockContainer.appendChild(mockCanvas);
    
    virtualizationService = ChartVirtualizationService.getInstance();
  });

  describe('Initialization', () => {
    it('creates singleton instance', () => {
      const instance1 = ChartVirtualizationService.getInstance();
      const instance2 = ChartVirtualizationService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('initializes with container and configuration', () => {
      virtualizationService.initializeVirtualization({
        container: mockContainer,
        containerWidth: 800,
        containerHeight: 600,
        itemHeight: 100,
        itemWidth: 200,
        overscan: 2,
      });
      
      const config = virtualizationService.getConfig();
      
      expect(config.containerWidth).toBe(800);
      expect(config.containerHeight).toBe(600);
      expect(config.itemHeight).toBe(100);
      expect(config.itemWidth).toBe(200);
      expect(config.overscan).toBe(2);
    });

    it('detects WebGL support', () => {
      const hasWebGL = virtualizationService.hasWebGLSupport();
      
      expect(hasWebGL).toBe(true);
      expect(mockCanvas.getContext).toHaveBeenCalledWith('webgl');
    });

    it('falls back to Canvas 2D when WebGL unavailable', () => {
      // Mock WebGL as unavailable
      const originalGetContext = mockCanvas.getContext;
      (mockCanvas.getContext as jest.Mock).mockImplementation((contextType) => {
        if (contextType === 'webgl' || contextType === 'experimental-webgl') return null;
        if (contextType === '2d') return mockCanvasContext;
        return null;
      });
      
      const hasWebGL = virtualizationService.hasWebGLSupport();
      
      expect(hasWebGL).toBe(false);
      
      // Restore
      mockCanvas.getContext = originalGetContext;
    });
  });

  describe('Viewport Management', () => {
    beforeEach(() => {
      virtualizationService.initializeVirtualization({
        container: mockContainer,
        containerWidth: 800,
        containerHeight: 600,
        itemHeight: 100,
        itemWidth: 200,
        overscan: 2,
      });
    });

    it('calculates visible range correctly', () => {
      virtualizationService.updateViewport(0, 150); // Scrolled 150px down
      
      const visibleRange = virtualizationService.getVisibleRange();
      
      // Should show items 1-7 (150px scroll with 100px item height, plus overscan)
      expect(visibleRange.start).toBe(0); // With overscan
      expect(visibleRange.end).toBe(7);
    });

    it('handles horizontal scrolling', () => {
      virtualizationService.updateViewport(200, 0); // Scrolled 200px right
      
      const visibleRange = virtualizationService.getVisibleRange();
      
      // Should calculate based on horizontal scrolling
      expect(visibleRange.start).toBe(0); // With overscan
      expect(visibleRange.end).toBeGreaterThan(0);
    });

    it('applies overscan correctly', () => {
      virtualizationService.updateViewport(0, 300); // Scroll to middle
      
      const visibleRange = virtualizationService.getVisibleRange();
      const rangeWithoutOverscan = virtualizationService.getVisibleRange(false);
      
      // Range with overscan should be larger
      expect(visibleRange.end - visibleRange.start).toBeGreaterThan(
        rangeWithoutOverscan.end - rangeWithoutOverscan.start
      );
    });

    it('updates viewport efficiently', () => {
      const updateSpy = jest.spyOn(virtualizationService, 'scheduleUpdate');
      
      // Rapid viewport updates
      virtualizationService.updateViewport(0, 100);
      virtualizationService.updateViewport(0, 110);
      virtualizationService.updateViewport(0, 120);
      
      // Should debounce updates
      expect(updateSpy).toHaveBeenCalledTimes(1);
    });

    it('handles edge cases at boundaries', () => {
      // Test scrolling to very beginning
      virtualizationService.updateViewport(0, 0);
      let visibleRange = virtualizationService.getVisibleRange();
      expect(visibleRange.start).toBe(0);
      
      // Test scrolling beyond content
      virtualizationService.updateViewport(0, 10000);
      visibleRange = virtualizationService.getVisibleRange();
      expect(visibleRange.start).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Chart Rendering', () => {
    beforeEach(() => {
      virtualizationService.initializeVirtualization({
        container: mockContainer,
        containerWidth: 800,
        containerHeight: 600,
        itemHeight: 100,
        itemWidth: 200,
        overscan: 1,
      });
    });

    it('renders visible charts only', () => {
      const chartData = Array.from({ length: 100 }, (_, i) => ({
        id: `chart-${i}`,
        data: [i, i * 2, i * 3],
        type: 'line' as const,
      }));
      
      virtualizationService.setChartData(chartData);
      virtualizationService.updateViewport(0, 0);
      
      const renderedCharts = virtualizationService.renderVisibleCharts();
      
      // Should only render visible charts (not all 100)
      expect(renderedCharts.length).toBeLessThan(20);
      expect(renderedCharts.length).toBeGreaterThan(0);
    });

    it('uses level of detail based on zoom', () => {
      const chartData = [{
        id: 'detailed-chart',
        data: Array.from({ length: 1000 }, (_, i) => ({ x: i, y: Math.sin(i / 10) })),
        type: 'line' as const,
      }];
      
      virtualizationService.setChartData(chartData);
      
      // Test low zoom (far out) - should use low detail
      virtualizationService.setZoomLevel(0.5);
      const lowDetailRender = virtualizationService.renderVisibleCharts();
      
      // Test high zoom (close up) - should use high detail
      virtualizationService.setZoomLevel(2.0);
      const highDetailRender = virtualizationService.renderVisibleCharts();
      
      // High detail should have more data points
      expect(highDetailRender[0]?.lodLevel).toBe('high');
      expect(lowDetailRender[0]?.lodLevel).toBe('low');
    });

    it('implements progressive rendering for large datasets', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `chart-${i}`,
        data: Array.from({ length: 500 }, (_, j) => ({ x: j, y: Math.random() })),
        type: 'scatter' as const,
      }));
      
      virtualizationService.setChartData(largeDataset);
      
      const renderPromise = virtualizationService.progressiveRender();
      
      // Should render in chunks
      expect(global.requestAnimationFrame).toHaveBeenCalled();
      
      await renderPromise;
      
      const renderStats = virtualizationService.getRenderStatistics();
      expect(renderStats.chunksRendered).toBeGreaterThan(1);
    });

    it('handles different chart types efficiently', () => {
      const mixedChartData = [
        { id: 'line-1', data: [1, 2, 3], type: 'line' as const },
        { id: 'bar-1', data: [4, 5, 6], type: 'bar' as const },
        { id: 'pie-1', data: [7, 8, 9], type: 'pie' as const },
        { id: 'scatter-1', data: [10, 11, 12], type: 'scatter' as const },
      ];
      
      virtualizationService.setChartData(mixedChartData);
      
      const renderedCharts = virtualizationService.renderVisibleCharts();
      
      // Should handle all chart types
      expect(renderedCharts).toHaveLength(4);
      expect(renderedCharts.map(c => c.type)).toEqual(['line', 'bar', 'pie', 'scatter']);
    });

    it('batches similar chart updates', () => {
      const similarCharts = Array.from({ length: 10 }, (_, i) => ({
        id: `similar-${i}`,
        data: [i, i * 2],
        type: 'line' as const,
        style: { color: 'blue', lineWidth: 2 },
      }));
      
      virtualizationService.setChartData(similarCharts);
      
      const batchSpy = jest.spyOn(virtualizationService, 'batchRender');
      
      virtualizationService.renderVisibleCharts();
      
      expect(batchSpy).toHaveBeenCalled();
    });
  });

  describe('Performance Optimization', () => {
    beforeEach(() => {
      virtualizationService.initializeVirtualization({
        container: mockContainer,
        containerWidth: 800,
        containerHeight: 600,
        itemHeight: 100,
        itemWidth: 200,
        overscan: 2,
      });
    });

    it('implements object pooling for chart elements', () => {
      const poolStats = virtualizationService.getObjectPoolStats();
      
      expect(poolStats.linePool).toBeDefined();
      expect(poolStats.barPool).toBeDefined();
      expect(poolStats.pointPool).toBeDefined();
    });

    it('reuses chart elements from pool', () => {
      const chartData = [
        { id: 'chart-1', data: [1, 2, 3], type: 'line' as const },
      ];
      
      virtualizationService.setChartData(chartData);
      
      // Render once
      virtualizationService.renderVisibleCharts();
      
      // Update data and render again
      chartData[0].data = [4, 5, 6];
      virtualizationService.setChartData(chartData);
      virtualizationService.renderVisibleCharts();
      
      const poolStats = virtualizationService.getObjectPoolStats();
      expect(poolStats.linePool.reused).toBeGreaterThan(0);
    });

    it('manages memory usage efficiently', () => {
      const memoryBefore = virtualizationService.getMemoryUsage();
      
      // Add lots of chart data
      const heavyData = Array.from({ length: 500 }, (_, i) => ({
        id: `heavy-${i}`,
        data: Array.from({ length: 1000 }, () => Math.random()),
        type: 'scatter' as const,
      }));
      
      virtualizationService.setChartData(heavyData);
      virtualizationService.renderVisibleCharts();
      
      // Trigger cleanup
      virtualizationService.cleanup();
      
      const memoryAfter = virtualizationService.getMemoryUsage();
      
      // Memory should be managed properly
      expect(memoryAfter.allocatedObjects).toBeLessThan(memoryBefore.allocatedObjects + heavyData.length);
    });

    it('implements dirty region optimization', () => {
      const chartData = [
        { id: 'static-chart', data: [1, 2, 3], type: 'line' as const },
        { id: 'dynamic-chart', data: [4, 5, 6], type: 'line' as const },
      ];
      
      virtualizationService.setChartData(chartData);
      virtualizationService.renderVisibleCharts();
      
      // Update only one chart
      chartData[1].data = [7, 8, 9];
      virtualizationService.updateChart('dynamic-chart', chartData[1]);
      
      const dirtyRegions = virtualizationService.getDirtyRegions();
      
      // Should only mark the updated chart region as dirty
      expect(dirtyRegions).toHaveLength(1);
      expect(dirtyRegions[0].chartId).toBe('dynamic-chart');
    });

    it('uses frame budget for smooth animations', () => {
      jest.useFakeTimers();
      
      const renderSpy = jest.spyOn(virtualizationService, 'renderChunk');
      
      // Start progressive render with frame budget
      virtualizationService.progressiveRender({ frameBudget: 16 });
      
      jest.advanceTimersByTime(16); // One frame
      
      expect(renderSpy).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('Touch and Interaction Optimization', () => {
    beforeEach(() => {
      virtualizationService.initializeVirtualization({
        container: mockContainer,
        containerWidth: 800,
        containerHeight: 600,
        itemHeight: 100,
        itemWidth: 200,
        overscan: 2,
      });
    });

    it('optimizes touch target sizes for mobile', () => {
      const touchTargets = virtualizationService.getTouchTargets();
      
      // All touch targets should meet minimum size requirements
      touchTargets.forEach(target => {
        expect(target.width).toBeGreaterThanOrEqual(44); // iOS minimum
        expect(target.height).toBeGreaterThanOrEqual(44);
      });
    });

    it('implements efficient hit testing', () => {
      const chartData = [
        { id: 'chart-1', data: [1, 2, 3], type: 'line' as const },
        { id: 'chart-2', data: [4, 5, 6], type: 'bar' as const },
      ];
      
      virtualizationService.setChartData(chartData);
      virtualizationService.renderVisibleCharts();
      
      // Test hit detection at specific coordinates
      const hitResult = virtualizationService.hitTest(100, 150);
      
      expect(hitResult).toBeDefined();
      expect(hitResult?.chartId).toBeDefined();
      expect(hitResult?.elementIndex).toBeDefined();
    });

    it('handles multi-touch interactions', () => {
      const mockTouchEvent = {
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 200 },
        ],
        preventDefault: jest.fn(),
      };
      
      const gestureResult = virtualizationService.handleMultiTouch(mockTouchEvent as any);
      
      expect(gestureResult).toBeDefined();
      expect(gestureResult?.gestureType).toBe('pinch');
      expect(gestureResult?.scale).toBeDefined();
    });

    it('optimizes scroll performance', () => {
      const scrollHandler = jest.fn();
      virtualizationService.onScroll(scrollHandler);
      
      // Simulate rapid scroll events
      for (let i = 0; i < 100; i++) {
        virtualizationService.updateViewport(0, i * 10);
      }
      
      // Should debounce scroll events
      expect(scrollHandler).toHaveBeenCalledTimes(1);
    });

    it('provides smooth zoom interactions', () => {
      const initialZoom = virtualizationService.getZoomLevel();
      
      virtualizationService.zoomTo(2.0, { x: 400, y: 300 });
      
      const finalZoom = virtualizationService.getZoomLevel();
      const zoomCenter = virtualizationService.getZoomCenter();
      
      expect(finalZoom).toBe(2.0);
      expect(zoomCenter.x).toBe(400);
      expect(zoomCenter.y).toBe(300);
    });
  });

  describe('WebGL Acceleration', () => {
    beforeEach(() => {
      virtualizationService.initializeVirtualization({
        container: mockContainer,
        containerWidth: 800,
        containerHeight: 600,
        itemHeight: 100,
        itemWidth: 200,
        overscan: 2,
        useWebGL: true,
      });
    });

    it('initializes WebGL shaders', () => {
      virtualizationService.initializeWebGL();
      
      expect(mockWebGLContext.createShader).toHaveBeenCalled();
      expect(mockWebGLContext.createProgram).toHaveBeenCalled();
      expect(mockWebGLContext.linkProgram).toHaveBeenCalled();
    });

    it('renders charts using WebGL for better performance', () => {
      const chartData = [{
        id: 'webgl-chart',
        data: Array.from({ length: 10000 }, (_, i) => ({ x: i, y: Math.sin(i / 100) })),
        type: 'line' as const,
      }];
      
      virtualizationService.setChartData(chartData);
      virtualizationService.renderVisibleCharts();
      
      expect(mockWebGLContext.drawArrays).toHaveBeenCalled();
    });

    it('batches WebGL draw calls efficiently', () => {
      const multipleCharts = Array.from({ length: 10 }, (_, i) => ({
        id: `webgl-chart-${i}`,
        data: Array.from({ length: 100 }, (_, j) => ({ x: j, y: Math.sin(j / 10 + i) })),
        type: 'line' as const,
      }));
      
      virtualizationService.setChartData(multipleCharts);
      virtualizationService.renderVisibleCharts();
      
      // Should batch similar charts into fewer draw calls
      const drawCalls = (mockWebGLContext.drawArrays as jest.Mock).mock.calls.length;
      expect(drawCalls).toBeLessThan(multipleCharts.length);
    });

    it('handles WebGL context loss gracefully', () => {
      const contextLossEvent = new Event('webglcontextlost');
      const contextRestoreEvent = new Event('webglcontextrestored');
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      mockCanvas.dispatchEvent(contextLossEvent);
      
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('WebGL context lost')
      );
      
      mockCanvas.dispatchEvent(contextRestoreEvent);
      
      expect(mockWebGLContext.createProgram).toHaveBeenCalledTimes(2); // Re-initialized
      
      consoleWarn.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('handles invalid chart data gracefully', () => {
      const invalidData = [
        { id: 'invalid-1', data: null, type: 'line' as const },
        { id: 'invalid-2', data: undefined, type: 'bar' as const },
        { id: 'invalid-3', data: 'not-an-array' as any, type: 'pie' as const },
      ];
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      virtualizationService.setChartData(invalidData);
      const renderedCharts = virtualizationService.renderVisibleCharts();
      
      expect(renderedCharts).toHaveLength(0);
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid chart data')
      );
      
      consoleWarn.mockRestore();
    });

    it('recovers from rendering errors', () => {
      const chartData = [{
        id: 'error-chart',
        data: [1, 2, 3],
        type: 'line' as const,
      }];
      
      // Mock rendering error
      const originalFillRect = mockCanvasContext.fillRect;
      mockCanvasContext.fillRect = jest.fn(() => {
        throw new Error('Canvas rendering error');
      });
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      virtualizationService.setChartData(chartData);
      const renderedCharts = virtualizationService.renderVisibleCharts();
      
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Chart rendering error')
      );
      
      // Should continue rendering other charts
      expect(renderedCharts).toBeDefined();
      
      mockCanvasContext.fillRect = originalFillRect;
      consoleError.mockRestore();
    });

    it('handles container resize errors', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      // Try to resize with invalid dimensions
      virtualizationService.resize(-100, -100);
      
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Invalid container dimensions')
      );
      
      consoleError.mockRestore();
    });

    it('handles memory exhaustion gracefully', () => {
      // Mock memory allocation failure
      const originalCreateBuffer = mockWebGLContext.createBuffer;
      mockWebGLContext.createBuffer = jest.fn(() => null);
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `memory-test-${i}`,
        data: Array.from({ length: 1000 }, () => Math.random()),
        type: 'scatter' as const,
      }));
      
      virtualizationService.setChartData(largeDataset);
      virtualizationService.renderVisibleCharts();
      
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to allocate WebGL buffer')
      );
      
      mockWebGLContext.createBuffer = originalCreateBuffer;
      consoleError.mockRestore();
    });
  });

  describe('Performance Monitoring', () => {
    it('tracks rendering performance metrics', () => {
      const chartData = [{
        id: 'perf-chart',
        data: Array.from({ length: 1000 }, (_, i) => ({ x: i, y: Math.sin(i / 10) })),
        type: 'line' as const,
      }];
      
      virtualizationService.setChartData(chartData);
      virtualizationService.renderVisibleCharts();
      
      const perfStats = virtualizationService.getPerformanceStats();
      
      expect(perfStats.averageFrameTime).toBeDefined();
      expect(perfStats.totalFrames).toBeGreaterThan(0);
      expect(perfStats.droppedFrames).toBeDefined();
    });

    it('monitors memory usage', () => {
      const memoryStats = virtualizationService.getMemoryUsage();
      
      expect(memoryStats.allocatedObjects).toBeDefined();
      expect(memoryStats.poolUtilization).toBeDefined();
      expect(memoryStats.canvasMemory).toBeDefined();
    });

    it('provides optimization recommendations', () => {
      // Simulate performance issues
      const heavyData = Array.from({ length: 1000 }, (_, i) => ({
        id: `heavy-${i}`,
        data: Array.from({ length: 10000 }, () => Math.random()),
        type: 'scatter' as const,
      }));
      
      virtualizationService.setChartData(heavyData);
      virtualizationService.renderVisibleCharts();
      
      const recommendations = virtualizationService.getOptimizationRecommendations();
      
      expect(recommendations).toContain('Consider using lower level of detail for distant charts');
      expect(recommendations).toContain('Reduce data point density for better performance');
    });
  });
});