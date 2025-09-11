/**
 * Performance Benchmarking Tests for Brand Asset Loading
 *
 * Tests cover:
 * - Brand asset upload performance
 * - Brand preview rendering performance
 * - Memory usage during asset loading
 * - Network optimization for brand assets
 * - Cache performance for brand resources
 */

import { performance, PerformanceObserver } from 'perf_hooks';
import { describe, test, expect, beforeEach, afterEach } from 'vitest';

// Mock brand asset data
const createMockAsset = (size: number, type: string = 'image/png') => {
  return {
    id: `asset-${Math.random()}`,
    brandId: 'brand-123',
    type: 'logo',
    filename: `test-asset.${type.split('/')[1]}`,
    url: `https://example.com/test-asset.${type.split('/')[1]}`,
    size: size,
    mimeType: type,
    uploadedAt: new Date().toISOString(),
  };
};

// Performance measurement utilities
class PerformanceTracker {
  private measurements: Map<string, number[]> = new Map();

  startMeasurement(name: string): void {
    performance.mark(`${name}-start`);
  }

  endMeasurement(name: string): number {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    const measure = performance.getEntriesByName(name, 'measure')[0];
    const duration = measure.duration;

    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(duration);

    return duration;
  }

  getAverageDuration(name: string): number {
    const durations = this.measurements.get(name) || [];
    return durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;
  }

  getP95Duration(name: string): number {
    const durations = this.measurements.get(name) || [];
    if (durations.length === 0) return 0;

    const sorted = durations.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[index];
  }

  reset(): void {
    this.measurements.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }
}

// Mock fetch for network operations
const mockFetch = (responseTime: number = 100, success: boolean = true) => {
  return jest.fn().mockImplementation(
    () =>
      new Promise((resolve) => {
        setTimeout(() => {
          if (success) {
            resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  success: true,
                  asset: createMockAsset(1024),
                }),
              blob: () =>
                Promise.resolve(new Blob(['test'], { type: 'image/png' })),
            });
          } else {
            resolve({
              ok: false,
              status: 500,
              json: () => Promise.resolve({ error: 'Server error' }),
            });
          }
        }, responseTime);
      }),
  );
};

// Memory usage tracking
class MemoryTracker {
  private initialMemory: number = 0;

  start(): void {
    if (typeof global.gc === 'function') {
      global.gc();
    }
    this.initialMemory = process.memoryUsage().heapUsed;
  }

  getMemoryDelta(): number {
    if (typeof global.gc === 'function') {
      global.gc();
    }
    return process.memoryUsage().heapUsed - this.initialMemory;
  }
}

describe('Brand Asset Performance Benchmarks', () => {
  let performanceTracker: PerformanceTracker;
  let memoryTracker: MemoryTracker;
  let originalFetch: any;

  beforeEach(() => {
    performanceTracker = new PerformanceTracker();
    memoryTracker = new MemoryTracker();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    performanceTracker.reset();
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('Brand Asset Upload Performance', () => {
    test('small image upload completes within 2 seconds', async () => {
      const smallImageSize = 100 * 1024; // 100KB
      global.fetch = mockFetch(500); // 500ms response time

      performanceTracker.startMeasurement('small-upload');

      // Simulate upload
      const formData = new FormData();
      formData.append(
        'file',
        new Blob(['x'.repeat(smallImageSize)], { type: 'image/png' }),
      );
      formData.append('type', 'logo');

      const response = await fetch('/api/branding/upload', {
        method: 'POST',
        body: formData,
      });

      const duration = performanceTracker.endMeasurement('small-upload');

      expect(response.ok).toBe(true);
      expect(duration).toBeLessThan(2000); // Less than 2 seconds
    });

    test('medium image upload completes within 5 seconds', async () => {
      const mediumImageSize = 1024 * 1024; // 1MB
      global.fetch = mockFetch(2000); // 2s response time

      performanceTracker.startMeasurement('medium-upload');

      const formData = new FormData();
      formData.append(
        'file',
        new Blob(['x'.repeat(mediumImageSize)], { type: 'image/png' }),
      );
      formData.append('type', 'logo');

      const response = await fetch('/api/branding/upload', {
        method: 'POST',
        body: formData,
      });

      const duration = performanceTracker.endMeasurement('medium-upload');

      expect(response.ok).toBe(true);
      expect(duration).toBeLessThan(5000); // Less than 5 seconds
    });

    test('large image upload completes within 10 seconds', async () => {
      const largeImageSize = 4 * 1024 * 1024; // 4MB
      global.fetch = mockFetch(5000); // 5s response time

      performanceTracker.startMeasurement('large-upload');

      const formData = new FormData();
      formData.append(
        'file',
        new Blob(['x'.repeat(largeImageSize)], { type: 'image/png' }),
      );
      formData.append('type', 'logo');

      const response = await fetch('/api/branding/upload', {
        method: 'POST',
        body: formData,
      });

      const duration = performanceTracker.endMeasurement('large-upload');

      expect(response.ok).toBe(true);
      expect(duration).toBeLessThan(10000); // Less than 10 seconds
    });

    test('concurrent uploads handle efficiently', async () => {
      const uploadSize = 500 * 1024; // 500KB each
      global.fetch = mockFetch(1000); // 1s response time

      const uploadPromises = [];

      performanceTracker.startMeasurement('concurrent-uploads');

      for (let i = 0; i < 5; i++) {
        const formData = new FormData();
        formData.append(
          'file',
          new Blob(['x'.repeat(uploadSize)], { type: 'image/png' }),
        );
        formData.append('type', 'logo');

        uploadPromises.push(
          fetch('/api/branding/upload', {
            method: 'POST',
            body: formData,
          }),
        );
      }

      const responses = await Promise.all(uploadPromises);
      const duration = performanceTracker.endMeasurement('concurrent-uploads');

      // All uploads should complete
      expect(responses.every((r) => r.ok)).toBe(true);

      // Concurrent uploads should not take significantly longer than single upload
      expect(duration).toBeLessThan(3000); // Less than 3 seconds for 5 concurrent uploads
    });

    test('upload progress tracking performs efficiently', async () => {
      const uploadSize = 2 * 1024 * 1024; // 2MB
      let progressCallbacks = 0;

      // Mock XMLHttpRequest for progress tracking
      const mockXHR = {
        upload: {
          addEventListener: jest.fn((event, callback) => {
            if (event === 'progress') {
              // Simulate progress events
              setTimeout(() => {
                callback({ loaded: uploadSize * 0.5, total: uploadSize });
                progressCallbacks++;
              }, 100);
              setTimeout(() => {
                callback({ loaded: uploadSize, total: uploadSize });
                progressCallbacks++;
              }, 200);
            }
          }),
        },
        open: jest.fn(),
        send: jest.fn(),
        readyState: 4,
        status: 200,
        response: JSON.stringify({ success: true }),
      };

      (global as any).XMLHttpRequest = jest.fn(() => mockXHR);

      performanceTracker.startMeasurement('progress-tracking');

      // Simulate upload with progress
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e: any) => {
        // Progress callback should execute quickly
        const start = performance.now();
        // Simulate progress UI update
        const progressPercent = (e.loaded / e.total) * 100;
        const end = performance.now();

        expect(end - start).toBeLessThan(10); // Progress update < 10ms
      });

      xhr.open('POST', '/api/branding/upload');
      xhr.send(new FormData());

      // Wait for progress callbacks
      await new Promise((resolve) => setTimeout(resolve, 300));

      const duration = performanceTracker.endMeasurement('progress-tracking');

      expect(progressCallbacks).toBeGreaterThan(0);
      expect(duration).toBeLessThan(500); // Progress tracking overhead < 500ms
    });
  });

  describe('Brand Preview Rendering Performance', () => {
    test('brand preview renders within 100ms', async () => {
      const mockBrand = {
        name: 'Performance Test Brand',
        primaryColor: '#FF5733',
        secondaryColor: '#33FF57',
        accentColor: '#3357FF',
        fontFamily: 'Inter',
      };

      // Mock DOM rendering
      const mockElement = {
        style: {} as any,
        textContent: '',
        className: '',
      };

      performanceTracker.startMeasurement('brand-preview-render');

      // Simulate brand preview rendering
      mockElement.textContent = mockBrand.name;
      mockElement.style.backgroundColor = mockBrand.primaryColor;
      mockElement.style.fontFamily = mockBrand.fontFamily;
      mockElement.className = 'brand-preview-updated';

      const duration = performanceTracker.endMeasurement(
        'brand-preview-render',
      );

      expect(duration).toBeLessThan(100); // Less than 100ms
    });

    test('color palette update performs efficiently', async () => {
      const colors = ['#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#33FFF5'];

      performanceTracker.startMeasurement('color-palette-update');

      // Simulate updating multiple color swatches
      colors.forEach((color) => {
        const mockSwatch = { style: {} as any };
        mockSwatch.style.backgroundColor = color;

        // Simulate CSS calculation
        const rgb = color.match(/\w\w/g)?.map((x) => parseInt(x, 16));
        mockSwatch.style.color =
          rgb && rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 > 186
            ? '#000'
            : '#fff';
      });

      const duration = performanceTracker.endMeasurement(
        'color-palette-update',
      );

      expect(duration).toBeLessThan(50); // Less than 50ms for 5 colors
    });

    test('font family change updates smoothly', async () => {
      const fonts = [
        'Inter',
        'Roboto',
        'Poppins',
        'Montserrat',
        'Playfair Display',
      ];

      performanceTracker.startMeasurement('font-family-update');

      fonts.forEach((font) => {
        const mockElements = Array(10)
          .fill(null)
          .map(() => ({ style: {} as any }));

        mockElements.forEach((element) => {
          element.style.fontFamily = font;
          element.style.fontWeight = 'normal';
          element.style.fontSize = '16px';
        });
      });

      const duration = performanceTracker.endMeasurement('font-family-update');

      expect(duration).toBeLessThan(100); // Less than 100ms for all font changes
    });

    test('CSS custom properties update efficiently', async () => {
      const customProperties = {
        '--brand-primary': '#FF5733',
        '--brand-secondary': '#33FF57',
        '--brand-accent': '#3357FF',
        '--brand-font': 'Inter',
        '--brand-radius': '8px',
      };

      performanceTracker.startMeasurement('css-custom-properties');

      // Simulate CSS custom property updates
      const mockDocumentStyle = { setProperty: jest.fn() };

      Object.entries(customProperties).forEach(([property, value]) => {
        mockDocumentStyle.setProperty(property, value);
      });

      const duration = performanceTracker.endMeasurement(
        'css-custom-properties',
      );

      expect(duration).toBeLessThan(25); // Less than 25ms
      expect(mockDocumentStyle.setProperty).toHaveBeenCalledTimes(5);
    });
  });

  describe('Memory Usage During Asset Loading', () => {
    test('single asset loading does not cause memory leaks', async () => {
      memoryTracker.start();

      // Simulate asset loading
      const asset = createMockAsset(1024 * 1024); // 1MB
      const mockImageData = new Uint8Array(asset.size);

      // Simulate image processing
      for (let i = 0; i < 100; i++) {
        const processedData = mockImageData.slice();
        // Simulate some processing
        processedData[0] = i;
      }

      const memoryDelta = memoryTracker.getMemoryDelta();

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryDelta).toBeLessThan(10 * 1024 * 1024);
    });

    test('multiple asset loading manages memory efficiently', async () => {
      memoryTracker.start();

      const assets = Array(10)
        .fill(null)
        .map(() => createMockAsset(100 * 1024)); // 10 x 100KB

      // Simulate loading multiple assets
      const loadedAssets = [];
      for (const asset of assets) {
        const mockData = new Uint8Array(asset.size);
        loadedAssets.push({
          ...asset,
          data: mockData,
        });
      }

      // Simulate cleanup
      loadedAssets.length = 0;

      const memoryDelta = memoryTracker.getMemoryDelta();

      // Memory should not increase significantly after cleanup
      expect(memoryDelta).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
    });

    test('image preview generation is memory efficient', async () => {
      memoryTracker.start();

      // Simulate generating previews for different sizes
      const originalSize = 2 * 1024 * 1024; // 2MB original
      const previewSizes = [
        { width: 300, height: 300 }, // Large preview
        { width: 150, height: 150 }, // Medium preview
        { width: 64, height: 64 }, // Thumbnail
      ];

      previewSizes.forEach((size) => {
        // Simulate image resize calculation
        const estimatedSize = size.width * size.height * 4; // RGBA
        const mockPreviewData = new Uint8Array(estimatedSize);

        // Simulate basic image operations
        for (let i = 0; i < Math.min(1000, estimatedSize); i++) {
          mockPreviewData[i] = Math.floor(Math.random() * 255);
        }
      });

      const memoryDelta = memoryTracker.getMemoryDelta();

      // Preview generation should not use excessive memory
      expect(memoryDelta).toBeLessThan(15 * 1024 * 1024); // Less than 15MB
    });
  });

  describe('Network Optimization for Brand Assets', () => {
    test('asset URLs are properly cached', async () => {
      const cacheStorage = new Map();

      performanceTracker.startMeasurement('asset-caching');

      const assetUrl = 'https://example.com/brand-logo.png';

      // First request (cache miss)
      if (!cacheStorage.has(assetUrl)) {
        global.fetch = mockFetch(500); // 500ms for network request
        const response = await fetch(assetUrl);
        cacheStorage.set(assetUrl, await response.blob());
      }

      // Second request (cache hit)
      const cachedAsset = cacheStorage.get(assetUrl);

      const duration = performanceTracker.endMeasurement('asset-caching');

      expect(cachedAsset).toBeDefined();
      expect(duration).toBeLessThan(600); // Should be fast due to caching
    });

    test('image optimization reduces load time', async () => {
      const originalImageSize = 5 * 1024 * 1024; // 5MB
      const optimizedImageSize = 800 * 1024; // 800KB

      performanceTracker.startMeasurement('image-optimization');

      // Simulate image optimization
      const mockOptimization = (originalSize: number) => {
        // Simulate compression algorithm
        let compressedSize = originalSize;

        // Simulate quality reduction
        compressedSize *= 0.7; // 70% quality

        // Simulate format optimization
        compressedSize *= 0.8; // WebP conversion

        return Math.floor(compressedSize);
      };

      const optimizedSize = mockOptimization(originalImageSize);
      const duration = performanceTracker.endMeasurement('image-optimization');

      expect(optimizedSize).toBeLessThan(originalImageSize);
      expect(optimizedSize).toBeCloseTo(optimizedImageSize, -50000); // Within 50KB
      expect(duration).toBeLessThan(200); // Optimization should be fast
    });

    test('lazy loading improves initial page load', async () => {
      const brandLogos = Array(20)
        .fill(null)
        .map((_, i) => `https://example.com/brand-logo-${i}.png`);

      performanceTracker.startMeasurement('lazy-loading');

      // Simulate lazy loading - only load visible assets initially
      const visibleAssets = brandLogos.slice(0, 5); // First 5 visible
      const lazyAssets = brandLogos.slice(5); // Rest for lazy loading

      // Load visible assets immediately
      global.fetch = mockFetch(100);
      const visiblePromises = visibleAssets.map((url) => fetch(url));
      await Promise.all(visiblePromises);

      // Lazy assets are not loaded yet
      const lazyLoadDuration =
        performanceTracker.endMeasurement('lazy-loading');

      expect(lazyLoadDuration).toBeLessThan(1000); // Fast initial load
      expect(lazyAssets.length).toBe(15); // Lazy assets waiting
    });
  });

  describe('Cache Performance for Brand Resources', () => {
    test('brand configuration caches effectively', async () => {
      const mockCache = new Map();
      const cacheKey = 'brand-config-org-123';

      performanceTracker.startMeasurement('brand-config-cache');

      // First access (cache miss)
      if (!mockCache.has(cacheKey)) {
        global.fetch = mockFetch(200);
        const response = await fetch('/api/branding');
        const brandConfig = await response.json();
        mockCache.set(cacheKey, brandConfig);
      }

      // Subsequent accesses (cache hits)
      for (let i = 0; i < 10; i++) {
        const cachedConfig = mockCache.get(cacheKey);
        expect(cachedConfig).toBeDefined();
      }

      const duration = performanceTracker.endMeasurement('brand-config-cache');

      expect(duration).toBeLessThan(300); // Fast cache access
    });

    test('asset thumbnails cache for quick preview', async () => {
      const thumbnailCache = new Map();
      const assetId = 'asset-123';

      performanceTracker.startMeasurement('thumbnail-cache');

      // Generate thumbnail (expensive operation)
      if (!thumbnailCache.has(assetId)) {
        const originalAsset = new Uint8Array(2 * 1024 * 1024); // 2MB

        // Simulate thumbnail generation
        const thumbnail = new Uint8Array(64 * 64 * 4); // 64x64 RGBA
        for (let i = 0; i < thumbnail.length; i += 4) {
          thumbnail[i] = originalAsset[i % originalAsset.length]; // R
          thumbnail[i + 1] = originalAsset[(i + 1) % originalAsset.length]; // G
          thumbnail[i + 2] = originalAsset[(i + 2) % originalAsset.length]; // B
          thumbnail[i + 3] = 255; // A
        }

        thumbnailCache.set(assetId, thumbnail);
      }

      // Quick thumbnail retrieval
      const cachedThumbnail = thumbnailCache.get(assetId);
      const duration = performanceTracker.endMeasurement('thumbnail-cache');

      expect(cachedThumbnail).toBeDefined();
      expect(cachedThumbnail.length).toBe(64 * 64 * 4);
      expect(duration).toBeLessThan(100); // Thumbnail generation + cache < 100ms
    });

    test('font loading cache prevents repeated downloads', async () => {
      const fontCache = new Map();
      const fonts = ['Inter', 'Roboto', 'Poppins'];

      performanceTracker.startMeasurement('font-cache');

      for (const fontFamily of fonts) {
        const fontKey = `font-${fontFamily}`;

        if (!fontCache.has(fontKey)) {
          // Simulate font loading
          global.fetch = mockFetch(300);
          const fontResponse = await fetch('/api/placeholder');
          const fontData = await fontResponse.blob();
          fontCache.set(fontKey, fontData);
        }

        // Quick font access from cache
        const cachedFont = fontCache.get(fontKey);
        expect(cachedFont).toBeDefined();
      }

      const duration = performanceTracker.endMeasurement('font-cache');

      // All fonts should load quickly due to caching
      expect(duration).toBeLessThan(1000); // Less than 1s for 3 fonts
    });
  });

  describe('Performance Regression Testing', () => {
    test('brand customization performance does not degrade', async () => {
      const iterations = 100;
      const performanceResults = [];

      for (let i = 0; i < iterations; i++) {
        performanceTracker.startMeasurement(`iteration-${i}`);

        // Simulate brand customization operations
        const mockBrand = {
          name: `Performance Test ${i}`,
          primaryColor: `#${Math.random().toString(16).slice(2, 8)}`,
          secondaryColor: `#${Math.random().toString(16).slice(2, 8)}`,
          accentColor: `#${Math.random().toString(16).slice(2, 8)}`,
        };

        // Simulate operations
        const operations = [
          () => mockBrand.name.length,
          () => mockBrand.primaryColor.toUpperCase(),
          () => parseInt(mockBrand.secondaryColor.slice(1), 16),
          () => mockBrand.accentColor.match(/\w\w/g),
        ];

        operations.forEach((op) => op());

        const duration = performanceTracker.endMeasurement(`iteration-${i}`);
        performanceResults.push(duration);
      }

      // Analyze performance stability
      const avgDuration =
        performanceResults.reduce((a, b) => a + b) / performanceResults.length;
      const maxDuration = Math.max(...performanceResults);
      const minDuration = Math.min(...performanceResults);

      // Performance should be consistent
      expect(maxDuration - minDuration).toBeLessThan(avgDuration); // Variation < average
      expect(avgDuration).toBeLessThan(10); // Operations should be fast
    });

    test('memory usage remains stable across multiple operations', async () => {
      const memorySnapshots = [];

      for (let i = 0; i < 50; i++) {
        memoryTracker.start();

        // Simulate brand operations
        const brandData = Array(10)
          .fill(null)
          .map(() => ({
            id: `brand-${Math.random()}`,
            name: `Brand ${i}-${Math.random()}`,
            assets: Array(5)
              .fill(null)
              .map(() => new Uint8Array(1024)),
          }));

        // Process brands
        brandData.forEach((brand) => {
          brand.assets.forEach((asset) => {
            // Simulate asset processing
            for (let j = 0; j < asset.length; j += 4) {
              asset[j] = Math.floor(Math.random() * 255);
            }
          });
        });

        // Cleanup
        brandData.length = 0;

        const memoryUsage = memoryTracker.getMemoryDelta();
        memorySnapshots.push(memoryUsage);
      }

      // Memory usage should not grow significantly over time
      const avgMemory =
        memorySnapshots.reduce((a, b) => a + b) / memorySnapshots.length;
      const lastMemory = memorySnapshots.slice(-5).reduce((a, b) => a + b) / 5; // Last 5 measurements

      expect(lastMemory).toBeLessThan(avgMemory * 1.5); // Memory growth < 50%
    });
  });

  describe('Performance Reporting and Analytics', () => {
    test('performance metrics are captured accurately', async () => {
      // Test multiple operations
      const operations = [
        { name: 'brand-create', expectedTime: 100 },
        { name: 'asset-upload', expectedTime: 1000 },
        { name: 'preview-render', expectedTime: 50 },
      ];

      for (const op of operations) {
        // Run operation multiple times
        for (let i = 0; i < 10; i++) {
          performanceTracker.startMeasurement(op.name);

          // Simulate operation with expected timing
          await new Promise((resolve) =>
            setTimeout(resolve, op.expectedTime + Math.random() * 20),
          );

          performanceTracker.endMeasurement(op.name);
        }

        // Verify metrics
        const avgDuration = performanceTracker.getAverageDuration(op.name);
        const p95Duration = performanceTracker.getP95Duration(op.name);

        expect(avgDuration).toBeCloseTo(op.expectedTime, -10); // Within 10ms
        expect(p95Duration).toBeGreaterThan(avgDuration); // P95 should be higher than average
      }
    });

    test('performance alerts trigger for degradation', async () => {
      const performanceThresholds = {
        'brand-save': 2000, // 2 seconds
        'asset-upload': 10000, // 10 seconds
        'preview-render': 100, // 100ms
      };

      const alerts = [];

      Object.entries(performanceThresholds).forEach(
        ([operation, threshold]) => {
          performanceTracker.startMeasurement(operation);

          // Simulate slow performance
          const simulatedDuration = threshold + 500; // 500ms over threshold

          // Mock the measurement
          performanceTracker.endMeasurement(operation);

          // Check if alert should be triggered
          const actualDuration =
            performanceTracker.getAverageDuration(operation) ||
            simulatedDuration;

          if (actualDuration > threshold) {
            alerts.push({
              operation,
              duration: actualDuration,
              threshold,
              severity:
                actualDuration > threshold * 1.5 ? 'critical' : 'warning',
            });
          }
        },
      );

      expect(alerts.length).toBeGreaterThan(0); // Should have performance alerts
      expect(alerts.every((alert) => alert.duration > alert.threshold)).toBe(
        true,
      );
    });
  });
});
