import { describe, test, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileContentEditor } from '@/components/cms/MobileContentEditor';
import { MediaManager } from '@/components/cms/MediaManager';
import { getCacheManager, CMSCacheUtils } from '@/lib/cms/cache-manager';
import { ContentCompressionEngine, CompressionPerformanceMonitor } from '@/lib/cms/compression';
import { CMSLoadTester, CMS_LOAD_TEST_SCENARIOS } from '@/lib/cms/load-testing';
import { CMSContent, CMSMedia } from '@/types/cms';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
  })
}));

// Mock fetch for load testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock file creation for testing
function createMockFile(name: string, size: number, type: string): File {
  const content = 'a'.repeat(size);
  return new File([content], name, { type });
}

// Mock image for canvas operations
function createMockImage(): HTMLImageElement {
  const img = new Image();
  Object.defineProperty(img, 'width', { value: 1920, writable: false });
  Object.defineProperty(img, 'height', { value: 1080, writable: false });
  Object.defineProperty(img, 'onload', { 
    set: function(fn) { 
      setTimeout(fn, 0); 
    }
  });
  return img;
}

// Mock canvas
function setupCanvasMock() {
  const mockCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ({
      drawImage: vi.fn(),
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high'
    })),
    toBlob: vi.fn((callback, type, quality) => {
      const blob = new Blob(['mock-image-data'], { type });
      callback(blob);
    })
  };

  vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
    if (tagName === 'canvas') return mockCanvas as any;
    if (tagName === 'img') return createMockImage();
    return document.createElement(tagName);
  });
}

describe('CMS Performance Test Suite', () => {
  let mockUser: any;
  let cacheManager: any;
  let compressionMonitor: CompressionPerformanceMonitor;
  let loadTester: CMSLoadTester;

  beforeAll(() => {
    setupCanvasMock();
  });

  beforeEach(() => {
    mockUser = userEvent.setup();
    cacheManager = getCacheManager({ maxSize: 1024 * 1024 }); // 1MB for testing
    compressionMonitor = new CompressionPerformanceMonitor();
    loadTester = new CMSLoadTester();
    
    // Reset mocks
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ success: true })
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Mobile Content Editor Performance', () => {
    const mockContent: CMSContent = {
      id: '1',
      title: 'Test Content',
      slug: 'test-content',
      content: 'Test content body',
      content_type: 'page',
      status: 'draft',
      author_id: 'user1',
      organization_id: 'org1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      mobile_optimized: true
    };

    test('should render mobile editor with performance optimizations', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      
      const startTime = performance.now();
      
      render(
        <MobileContentEditor
          content={mockContent}
          onSave={onSave}
          mobileOptimized={true}
          performanceMode="fast"
          enableTouchOptimization={true}
        />
      );

      const renderTime = performance.now() - startTime;
      
      // Verify mobile-optimized rendering
      expect(screen.getByDisplayValue('Test Content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      
      // Performance assertion
      expect(renderTime).toBeLessThan(100); // Should render in <100ms
    });

    test('should handle auto-save with performance monitoring', async () => {
      const onSave = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 50)) // Simulate 50ms save time
      );

      render(
        <MobileContentEditor
          content={mockContent}
          onSave={onSave}
          mobileOptimized={true}
        />
      );

      const titleInput = screen.getByDisplayValue('Test Content');
      
      // Modify content to trigger auto-save
      await mockUser.clear(titleInput);
      await mockUser.type(titleInput, 'Updated Test Content');

      // Fast-forward timers to trigger auto-save
      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Updated Test Content'
          })
        );
      });
    });

    test('should calculate accurate mobile score', async () => {
      const onSave = vi.fn();

      render(
        <MobileContentEditor
          content={{
            ...mockContent,
            meta_description: 'Good meta description with proper length for SEO and mobile optimization'
          }}
          onSave={onSave}
          mobileOptimized={true}
        />
      );

      // Check if mobile score is displayed
      const performanceTab = screen.getByRole('tab', { name: /performance/i });
      await mockUser.click(performanceTab);

      await waitFor(() => {
        expect(screen.getByText(/mobile score/i)).toBeInTheDocument();
      });
    });

    test('should handle viewport switching performance', async () => {
      const onSave = vi.fn();

      render(
        <MobileContentEditor
          content={mockContent}
          onSave={onSave}
          mobileOptimized={true}
        />
      );

      const mobileButton = screen.getByRole('button', { name: /smartphone/i });
      const tabletButton = screen.getByRole('button', { name: /tablet/i });
      const desktopButton = screen.getByRole('button', { name: /monitor/i });

      // Measure viewport switch performance
      const startTime = performance.now();
      
      await mockUser.click(tabletButton);
      await mockUser.click(desktopButton);
      await mockUser.click(mobileButton);
      
      const switchTime = performance.now() - startTime;
      
      // Should be very fast
      expect(switchTime).toBeLessThan(50);
    });
  });

  describe('Media Manager Performance', () => {
    test('should handle file upload with compression performance tracking', async () => {
      const onUpload = vi.fn().mockResolvedValue([]);

      render(
        <MediaManager
          onUpload={onUpload}
          enableCompression={true}
          mobileOptimized={true}
          maxFileSize={10 * 1024 * 1024}
        />
      );

      // Mock file upload
      const file = createMockFile('test-image.jpg', 5 * 1024 * 1024, 'image/jpeg');
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false
      });

      const startTime = performance.now();
      
      fireEvent.change(input);

      // Should show upload progress immediately
      await waitFor(() => {
        expect(screen.getByText(/upload progress/i)).toBeInTheDocument();
      });

      const processingTime = performance.now() - startTime;
      expect(processingTime).toBeLessThan(1000); // Should start processing quickly
    });

    test('should display performance metrics correctly', async () => {
      render(
        <MediaManager
          enableCompression={true}
          mobileOptimized={true}
        />
      );

      // Check if performance metrics are displayed
      await waitFor(() => {
        expect(screen.getByText(/performance metrics/i)).toBeInTheDocument();
        expect(screen.getByText(/total uploads/i)).toBeInTheDocument();
        expect(screen.getByText(/avg compression/i)).toBeInTheDocument();
        expect(screen.getByText(/space saved/i)).toBeInTheDocument();
      });
    });

    test('should handle batch upload performance', async () => {
      const onUpload = vi.fn();

      render(
        <MediaManager
          onUpload={onUpload}
          allowMultiple={true}
          enableCompression={true}
        />
      );

      // Create multiple mock files
      const files = [
        createMockFile('image1.jpg', 2 * 1024 * 1024, 'image/jpeg'),
        createMockFile('image2.png', 3 * 1024 * 1024, 'image/png'),
        createMockFile('image3.gif', 1 * 1024 * 1024, 'image/gif')
      ];

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, 'files', { value: files });

      const startTime = performance.now();
      fireEvent.change(input);

      // Should handle multiple files efficiently
      await waitFor(() => {
        expect(screen.getByText(/upload progress/i)).toBeInTheDocument();
      });

      const batchProcessingTime = performance.now() - startTime;
      expect(batchProcessingTime).toBeLessThan(2000); // Batch should start quickly
    });
  });

  describe('Cache Manager Performance', () => {
    test('should perform cache operations within acceptable time limits', async () => {
      const organizationId = 'org1';
      const testData = { 
        content: 'Large content data for testing cache performance',
        metadata: { size: 'large', type: 'test' }
      };

      // Test cache set performance
      const setStartTime = performance.now();
      await cacheManager.set('test-key', testData, organizationId);
      const setTime = performance.now() - setStartTime;

      expect(setTime).toBeLessThan(100); // Cache set should be <100ms

      // Test cache get performance
      const getStartTime = performance.now();
      const result = await cacheManager.get('test-key', organizationId);
      const getTime = performance.now() - getStartTime;

      expect(getTime).toBeLessThan(50); // Cache get should be <50ms
      expect(result).toEqual(testData);
    });

    test('should maintain performance with large datasets', async () => {
      const organizationId = 'org1';
      const cacheUtils = new CMSCacheUtils();

      // Create multiple large cache entries
      const promises = [];
      for (let i = 0; i < 100; i++) {
        const largeData = {
          id: i,
          content: 'x'.repeat(10000), // 10KB content
          timestamp: Date.now()
        };
        promises.push(cacheUtils.cacheContent(largeData, organizationId, `content-${i}`));
      }

      const startTime = performance.now();
      await Promise.all(promises);
      const batchTime = performance.now() - startTime;

      expect(batchTime).toBeLessThan(5000); // 100 cache operations should complete in <5s
    });

    test('should handle cache invalidation efficiently', async () => {
      const organizationId = 'org1';

      // Set multiple cache entries
      await cacheManager.set('content:1', { id: 1 }, organizationId);
      await cacheManager.set('content:2', { id: 2 }, organizationId);
      await cacheManager.set('media:1', { id: 1 }, organizationId);

      const startTime = performance.now();
      const invalidatedCount = await cacheManager.invalidate('content:*', organizationId);
      const invalidationTime = performance.now() - startTime;

      expect(invalidationTime).toBeLessThan(100); // Invalidation should be fast
      expect(invalidatedCount).toBeGreaterThan(0);
    });

    test('should provide accurate cache statistics', () => {
      const stats = cacheManager.getStats();

      expect(stats).toHaveProperty('memoryUsage');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('totalHits');
      expect(stats).toHaveProperty('totalMisses');
      expect(stats.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeLessThanOrEqual(100);
    });
  });

  describe('Content Compression Performance', () => {
    test('should compress images efficiently', async () => {
      const imageFile = createMockFile('test.jpg', 2 * 1024 * 1024, 'image/jpeg');

      const startTime = performance.now();
      const result = await ContentCompressionEngine.compressImage(imageFile, {
        quality: 0.8,
        mobileOptimized: true
      });
      const compressionTime = performance.now() - startTime;

      expect(compressionTime).toBeLessThan(2000); // Should compress in <2s
      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.compressedSize).toBeLessThan(result.originalSize);
      compressionMonitor.recordCompression(result, compressionTime);
    });

    test('should handle batch compression performance', async () => {
      const files = [
        createMockFile('image1.jpg', 1024 * 1024, 'image/jpeg'),
        createMockFile('image2.png', 1024 * 1024, 'image/png'),
        createMockFile('style.css', 50 * 1024, 'text/css'),
        createMockFile('script.js', 100 * 1024, 'text/javascript')
      ];

      let progressCallCount = 0;
      const onProgress = vi.fn((progress) => {
        progressCallCount++;
        expect(progress).toBeGreaterThan(0);
        expect(progress).toBeLessThanOrEqual(100);
      });

      const startTime = performance.now();
      const results = await ContentCompressionEngine.compressBatch(files, {
        mobileOptimized: true
      }, onProgress);
      const batchTime = performance.now() - startTime;

      expect(batchTime).toBeLessThan(5000); // Batch compression should complete in <5s
      expect(results).toHaveLength(files.length);
      expect(progressCallCount).toBe(files.length);

      // Record all results for monitoring
      results.forEach((result, index) => {
        compressionMonitor.recordCompression(result, batchTime / files.length);
      });
    });

    test('should provide performance statistics', () => {
      const stats = compressionMonitor.getPerformanceStats();

      if (stats) {
        expect(stats).toHaveProperty('totalFiles');
        expect(stats).toHaveProperty('averageCompressionRatio');
        expect(stats).toHaveProperty('averageProcessingTime');
        expect(stats).toHaveProperty('totalSpaceSaved');
        expect(stats.averageCompressionRatio).toBeGreaterThanOrEqual(0);
        expect(stats.averageProcessingTime).toBeGreaterThan(0);
      }
    });

    test('should analyze files and provide optimization recommendations', () => {
      const imageFile = createMockFile('large-image.jpg', 5 * 1024 * 1024, 'image/jpeg');
      const analysis = ContentCompressionEngine.analyzeFile(imageFile);

      expect(analysis.canCompress).toBe(true);
      expect(analysis.estimatedSavings).toBeGreaterThan(0);
      expect(analysis.mobileOptimizations.length).toBeGreaterThan(0);
    });
  });

  describe('Load Testing Framework', () => {
    test('should execute smoke test successfully', async () => {
      // Mock successful API responses
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK'
      });

      const config = {
        ...CMS_LOAD_TEST_SCENARIOS.SMOKE_TEST,
        testDurationMs: 5000, // Reduce test time for unit test
        concurrentUsers: 2
      };

      const startTime = performance.now();
      const result = await loadTester.runLoadTest(config);
      const testDuration = performance.now() - startTime;

      expect(result.totalRequests).toBeGreaterThan(0);
      expect(result.errorRate).toBeLessThan(config.errorRateThreshold);
      expect(result.averageResponseTime).toBeLessThan(config.maxResponseTimeMs);
      expect(testDuration).toBeGreaterThanOrEqual(config.testDurationMs - 100); // Allow small variance
    });

    test('should handle load test with mixed success/failure responses', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: callCount % 5 !== 0, // Fail every 5th request
          status: callCount % 5 !== 0 ? 200 : 500,
          statusText: callCount % 5 !== 0 ? 'OK' : 'Internal Server Error'
        });
      });

      const config = {
        ...CMS_LOAD_TEST_SCENARIOS.SMOKE_TEST,
        testDurationMs: 3000,
        concurrentUsers: 3,
        errorRateThreshold: 25 // Allow higher error rate for this test
      };

      const result = await loadTester.runLoadTest(config);

      expect(result.totalRequests).toBeGreaterThan(0);
      expect(result.failedRequests).toBeGreaterThan(0);
      expect(result.errorRate).toBeGreaterThan(0);
      expect(result.errorRate).toBeLessThan(25); // Should be around 20%
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should generate comprehensive performance report', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK'
      });

      const config = {
        ...CMS_LOAD_TEST_SCENARIOS.SMOKE_TEST,
        testDurationMs: 2000,
        concurrentUsers: 2
      };

      const result = await loadTester.runLoadTest(config);
      const report = loadTester.generateReport(result);

      expect(report).toContain('CMS Load Test Report');
      expect(report).toContain('Overall Results');
      expect(report).toContain('Response Times');
      expect(report).toContain('Operation Breakdown');
      expect(report).toContain('Performance Assessment');
      expect(report.length).toBeGreaterThan(500); // Should be a detailed report
    });

    test('should track test history and analytics', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK'
      });

      const config = {
        ...CMS_LOAD_TEST_SCENARIOS.MOBILE_TEST,
        testDurationMs: 1000,
        concurrentUsers: 1
      };

      const initialHistory = loadTester.getTestHistory();
      const initialLength = initialHistory.length;

      await loadTester.runLoadTest(config);

      const updatedHistory = loadTester.getTestHistory();
      expect(updatedHistory.length).toBe(initialLength + 1);
      expect(updatedHistory[updatedHistory.length - 1].config).toEqual(config);
    });

    test('should prevent concurrent load tests', async () => {
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          status: 200,
          statusText: 'OK'
        }), 100))
      );

      const config = {
        ...CMS_LOAD_TEST_SCENARIOS.SMOKE_TEST,
        testDurationMs: 1000,
        concurrentUsers: 1
      };

      // Start first test
      const firstTest = loadTester.runLoadTest(config);

      // Try to start second test while first is running
      await expect(loadTester.runLoadTest(config)).rejects.toThrow('Load test already in progress');

      // Wait for first test to complete
      await firstTest;

      // Second test should now work
      await expect(loadTester.runLoadTest(config)).resolves.toBeDefined();
    });
  });

  describe('End-to-End Performance Integration', () => {
    test('should demonstrate complete CMS workflow performance', async () => {
      const organizationId = 'org1';
      const cacheUtils = new CMSCacheUtils();

      // Step 1: Content creation with compression
      const largeContent = {
        id: 'perf-test-1',
        title: 'Performance Test Content',
        content: 'Large content body '.repeat(1000), // Large content for testing
        content_type: 'blog' as const,
        organization_id: organizationId
      };

      const step1Start = performance.now();
      await cacheUtils.cacheContent(largeContent, organizationId, largeContent.id);
      const step1Time = performance.now() - step1Start;

      // Step 2: Media compression and caching
      const imageFile = createMockFile('performance-test.jpg', 3 * 1024 * 1024, 'image/jpeg');
      
      const step2Start = performance.now();
      const compressionResult = await ContentCompressionEngine.compressImage(imageFile, {
        mobileOptimized: true,
        quality: 0.8
      });
      
      const mediaData = {
        id: 'media-perf-1',
        filename: 'performance-test.jpg',
        original_size: imageFile.size,
        compressed_size: compressionResult.compressedSize,
        compression_ratio: compressionResult.compressionRatio
      };
      
      await cacheUtils.cacheMedia(mediaData, organizationId, mediaData.id);
      const step2Time = performance.now() - step2Start;

      // Step 3: Cache retrieval performance
      const step3Start = performance.now();
      const cachedContent = await cacheManager.get(`content:${largeContent.id}`, organizationId);
      const cachedMedia = await cacheManager.get(`media:${mediaData.id}`, organizationId);
      const step3Time = performance.now() - step3Start;

      // Verify performance benchmarks
      expect(step1Time).toBeLessThan(200); // Content caching <200ms
      expect(step2Time).toBeLessThan(3000); // Image compression and caching <3s
      expect(step3Time).toBeLessThan(50); // Cache retrieval <50ms

      expect(cachedContent).toBeDefined();
      expect(cachedMedia).toBeDefined();
      expect(compressionResult.compressionRatio).toBeGreaterThan(0);

      // Verify cache statistics
      const cacheStats = cacheManager.getStats();
      expect(cacheStats.hitRate).toBeGreaterThan(0);
    });

    test('should maintain performance under concurrent operations', async () => {
      const organizationId = 'org1';
      const operationPromises = [];

      // Simulate concurrent CMS operations
      for (let i = 0; i < 20; i++) {
        // Content operations
        operationPromises.push(
          cacheManager.set(`concurrent-content-${i}`, {
            id: `content-${i}`,
            content: `Content ${i}`,
            timestamp: Date.now()
          }, organizationId)
        );

        // Compression operations
        const file = createMockFile(`concurrent-${i}.jpg`, 1024 * 1024, 'image/jpeg');
        operationPromises.push(
          ContentCompressionEngine.compressImage(file, { mobileOptimized: true })
        );
      }

      const startTime = performance.now();
      const results = await Promise.all(operationPromises);
      const totalTime = performance.now() - startTime;

      expect(totalTime).toBeLessThan(10000); // All operations should complete in <10s
      expect(results.length).toBe(40); // 20 cache + 20 compression operations
      
      // Verify all operations completed successfully
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });
});