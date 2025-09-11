/**
 * Media Performance Benchmark Tests
 * Testing wedding vendor upload scenarios
 */

import {
  MediaPerformanceBenchmark,
  PerformanceMonitor,
} from '@/lib/performance/media-benchmarks';

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(() => ({ duration: 1000 })),
  clearMarks: jest.fn(),
  memory: { usedJSHeapSize: 50 * 1024 * 1024 }, // 50MB
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
});

// Mock canvas for image optimization
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => ({
    drawImage: jest.fn(),
    fillStyle: '',
    fillRect: jest.fn(),
    font: '',
    fillText: jest.fn(),
  })),
});

Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
  value: jest.fn((callback) => {
    const blob = new Blob(['mock-image-data'], { type: 'image/webp' });
    callback(blob);
  }),
});

// Mock Image
Object.defineProperty(global, 'Image', {
  value: class MockImage {
    onload: (() => void) | null = null;
    width = 1920;
    height = 1280;

    set src(value: string) {
      setTimeout(() => this.onload?.(), 0);
    }
  },
});

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn(() => 'blob:mock-url'),
});

describe('MediaPerformanceBenchmark', () => {
  let benchmark: MediaPerformanceBenchmark;
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    benchmark = new MediaPerformanceBenchmark();
    performanceMonitor = PerformanceMonitor.getInstance();
    jest.clearAllMocks();
  });

  describe('Single Image Upload Benchmark', () => {
    it('should benchmark single portfolio image upload', async () => {
      const mockFile = new File(['mock-image-data'], 'portfolio.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      // Set file size to 5MB
      Object.defineProperty(mockFile, 'size', { value: 5 * 1024 * 1024 });

      const result = await benchmark.benchmarkImageUpload(
        mockFile,
        'singlePortfolio',
      );

      expect(result).toMatchObject({
        uploadTime: expect.any(Number),
        optimizationTime: expect.any(Number),
        totalTime: expect.any(Number),
        originalSize: 5 * 1024 * 1024,
        optimizedSize: expect.any(Number),
        compressionRatio: expect.any(Number),
        memoryUsage: expect.any(Number),
        deviceType: expect.stringMatching(/desktop|tablet|mobile/),
      });

      // Should meet wedding vendor requirements
      expect(result.totalTime).toBeLessThan(3000); // <3 seconds
      expect(result.compressionRatio).toBeGreaterThan(0); // Should compress
    });

    it('should handle different device types correctly', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      // Mock different viewport sizes
      Object.defineProperty(window, 'innerWidth', { value: 375 }); // Mobile
      let result = await benchmark.benchmarkImageUpload(mockFile);
      expect(result.deviceType).toBe('mobile');

      Object.defineProperty(window, 'innerWidth', { value: 768 }); // Tablet
      result = await benchmark.benchmarkImageUpload(mockFile);
      expect(result.deviceType).toBe('tablet');

      Object.defineProperty(window, 'innerWidth', { value: 1920 }); // Desktop
      result = await benchmark.benchmarkImageUpload(mockFile);
      expect(result.deviceType).toBe('desktop');
    });
  });

  describe('Wedding Gallery Batch Upload', () => {
    it('should benchmark wedding gallery upload scenario', async () => {
      const mockFiles = Array.from(
        { length: 5 },
        (_, i) =>
          new File(['mock-data'], `wedding-${i}.jpg`, { type: 'image/jpeg' }),
      );

      const results = await benchmark.benchmarkBatchUpload(
        mockFiles,
        'quickPreview',
      );

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.totalTime).toBeLessThan(5000); // Each image <5s
        expect(result.compressionRatio).toBeGreaterThan(0);
      });

      // Record metrics for monitoring
      results.forEach((result) => performanceMonitor.recordMetric(result));
    });

    it('should meet wedding day performance requirements', async () => {
      // Simulate large wedding gallery
      const mockFiles = Array.from(
        { length: 25 },
        (_, i) =>
          new File(['large-wedding-image'], `ceremony-${i}.jpg`, {
            type: 'image/jpeg',
          }),
      );

      const startTime = performance.now();
      const results = await benchmark.benchmarkBatchUpload(
        mockFiles,
        'weddingGallery',
      );
      const totalTime = performance.now() - startTime;

      // Wedding day requirement: complete batch in reasonable time
      expect(totalTime).toBeLessThan(120000); // <2 minutes total
      expect(results.length).toBe(25);

      // Average performance per image should be good
      const avgTime =
        results.reduce((sum, r) => sum + r.totalTime, 0) / results.length;
      expect(avgTime).toBeLessThan(3000); // <3s average per image
    });
  });

  describe('Image Optimization', () => {
    it('should optimize images correctly', async () => {
      const mockFile = new File(['large-image-data'], 'large.jpg', {
        type: 'image/jpeg',
      });
      Object.defineProperty(mockFile, 'size', { value: 10 * 1024 * 1024 }); // 10MB

      const optimizedFile = await benchmark.optimizeImage(mockFile);

      expect(optimizedFile.type).toBe('image/webp');
      expect(optimizedFile.name).toBe(mockFile.name);
      expect(optimizedFile.size).toBeLessThan(mockFile.size); // Should be compressed
    });

    it('should handle optimization errors gracefully', async () => {
      // Mock failed canvas operation
      HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
        callback(null); // Simulate failure
      });

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      // Should not throw, should handle gracefully
      await expect(benchmark.optimizeImage(mockFile)).resolves.toBeDefined();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track metrics correctly', () => {
      const mockMetric = {
        uploadTime: 1000,
        optimizationTime: 500,
        totalTime: 2000,
        originalSize: 5000000,
        optimizedSize: 3000000,
        compressionRatio: 0.4,
        memoryUsage: 30000000,
        deviceType: 'desktop' as const,
      };

      performanceMonitor.recordMetric(mockMetric);

      const { avgTime, avgMemory } = performanceMonitor.getAveragePerformance();
      expect(avgTime).toBeGreaterThan(0);
      expect(avgMemory).toBeGreaterThan(0);
    });

    it('should generate performance report', () => {
      const mockMetrics = [
        {
          uploadTime: 1000,
          optimizationTime: 500,
          totalTime: 2000,
          originalSize: 5000000,
          optimizedSize: 3000000,
          compressionRatio: 0.4,
          memoryUsage: 30000000,
          deviceType: 'desktop' as const,
        },
        {
          uploadTime: 1500,
          optimizationTime: 600,
          totalTime: 2500,
          originalSize: 4000000,
          optimizedSize: 2500000,
          compressionRatio: 0.375,
          memoryUsage: 25000000,
          deviceType: 'mobile' as const,
        },
      ];

      mockMetrics.forEach((metric) => performanceMonitor.recordMetric(metric));

      const report = performanceMonitor.generateReport();

      expect(report).toContain('Performance Report');
      expect(report).toContain('Total uploads: 2');
      expect(report).toContain('Desktop: 1');
      expect(report).toContain('Mobile: 1');
      expect(report).toMatch(/Excellent|Good|Acceptable|Poor/);
    });

    it('should alert on poor performance', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const slowMetric = {
        uploadTime: 3000,
        optimizationTime: 2000,
        totalTime: 6000, // >5s
        originalSize: 10000000,
        optimizedSize: 8000000,
        compressionRatio: 0.2,
        memoryUsage: 100000000, // >50MB
        deviceType: 'desktop' as const,
      };

      performanceMonitor.recordMetric(slowMetric);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow upload detected'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('High memory usage'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Wedding Scenarios', () => {
    it('should have correct scenario definitions', () => {
      const scenarios = MediaPerformanceBenchmark.SCENARIOS;

      expect(scenarios.singlePortfolio).toMatchObject({
        name: 'Single Portfolio Image',
        imageCount: 1,
        averageSize: 5,
        expectedTime: 3,
      });

      expect(scenarios.weddingGallery).toMatchObject({
        name: 'Wedding Gallery Upload',
        imageCount: 50,
        averageSize: 4,
        expectedTime: 45,
      });

      expect(scenarios.venueShowcase).toMatchObject({
        name: 'Venue Showcase',
        imageCount: 20,
        averageSize: 6,
        expectedTime: 30,
      });
    });

    it('should run wedding day stress test', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await benchmark.runWeddingDayStressTest();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting Wedding Day Stress Test'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('completed in'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Memory Management', () => {
    it('should track memory usage during operations', async () => {
      // Mock different memory states
      let memoryUsage = 50 * 1024 * 1024; // Start at 50MB
      mockPerformance.memory = {
        get usedJSHeapSize() {
          return memoryUsage;
        },
      };

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      // Simulate memory increase during operation
      setTimeout(() => {
        memoryUsage = 75 * 1024 * 1024; // 75MB after operation
      }, 100);

      const result = await benchmark.benchmarkImageUpload(mockFile);

      expect(result.memoryUsage).toBeGreaterThan(0);
    });

    it('should handle memory pressure scenarios', async () => {
      // Simulate high memory usage
      mockPerformance.memory = {
        usedJSHeapSize: 200 * 1024 * 1024, // 200MB (high usage)
      };

      const mockFile = new File(['large-data'], 'large.jpg', {
        type: 'image/jpeg',
      });
      const result = await benchmark.benchmarkImageUpload(mockFile);

      expect(result).toBeDefined();
      expect(result.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle upload failures gracefully', async () => {
      // Mock network error
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      // Should handle error without crashing
      await expect(
        benchmark.benchmarkImageUpload(mockFile),
      ).resolves.toBeDefined();

      global.fetch = originalFetch;
    });

    it('should handle large file scenarios', async () => {
      const largeFile = new File(['x'.repeat(50 * 1024 * 1024)], 'huge.jpg', {
        type: 'image/jpeg',
      });
      Object.defineProperty(largeFile, 'size', { value: 50 * 1024 * 1024 }); // 50MB

      const result = await benchmark.benchmarkImageUpload(largeFile);

      expect(result).toBeDefined();
      expect(result.originalSize).toBe(50 * 1024 * 1024);
    });
  });
});

describe('Real-world Wedding Scenarios', () => {
  let benchmark: MediaPerformanceBenchmark;

  beforeEach(() => {
    benchmark = new MediaPerformanceBenchmark();
  });

  it('should handle photographer portfolio upload', async () => {
    // Simulate photographer uploading 10 portfolio images
    const portfolioFiles = Array.from(
      { length: 10 },
      (_, i) =>
        new File(['portfolio-image'], `portfolio-${i}.jpg`, {
          type: 'image/jpeg',
        }),
    );

    const results = await benchmark.benchmarkBatchUpload(
      portfolioFiles,
      'quickPreview',
    );

    expect(results.length).toBe(10);

    // Should complete within reasonable time for photographer workflow
    const totalTime = results.reduce((sum, r) => sum + r.totalTime, 0);
    expect(totalTime).toBeLessThan(15000); // <15s total
  });

  it('should handle venue showcase upload', async () => {
    // Simulate venue manager uploading venue photos
    const venueFiles = Array.from(
      { length: 20 },
      (_, i) =>
        new File(['venue-image'], `venue-${i}.jpg`, { type: 'image/jpeg' }),
    );

    const results = await benchmark.benchmarkBatchUpload(
      venueFiles,
      'venueShowcase',
    );

    expect(results.length).toBe(20);

    // Venue photos are typically larger, allow more time
    results.forEach((result) => {
      expect(result.totalTime).toBeLessThan(4000); // <4s per image for venue photos
    });
  });

  it('should handle mobile photographer workflow', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', { value: 375 });

    const mobileFiles = Array.from(
      { length: 5 },
      (_, i) =>
        new File(['mobile-image'], `mobile-${i}.jpg`, { type: 'image/jpeg' }),
    );

    const results = await benchmark.benchmarkBatchUpload(
      mobileFiles,
      'quickPreview',
    );

    results.forEach((result) => {
      expect(result.deviceType).toBe('mobile');
      // Mobile should still perform reasonably well
      expect(result.totalTime).toBeLessThan(5000); // <5s on mobile
    });
  });
});
