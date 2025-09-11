import { jest } from '@jest/globals';
import { MobileNetworkOptimizer } from '../../../src/lib/services/mobile/MobileNetworkOptimizer';

// Mock fetch
global.fetch = jest.fn();

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
};

global.performance = mockPerformance as any;

// Mock navigator.connection (Network Information API)
const mockConnection = {
  effectiveType: '4g',
  downlink: 10,
  rtt: 50,
  saveData: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

Object.defineProperty(navigator, 'connection', {
  value: mockConnection,
  writable: true,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
});

// Mock CompressionStream (for request compression)
global.CompressionStream = jest.fn().mockImplementation((format) => ({
  readable: new ReadableStream(),
  writable: new WritableStream(),
})) as any;

global.DecompressionStream = jest.fn().mockImplementation((format) => ({
  readable: new ReadableStream(),
  writable: new WritableStream(),
})) as any;

// Mock AbortController
global.AbortController = jest.fn().mockImplementation(() => ({
  signal: { aborted: false },
  abort: jest.fn(),
})) as any;

describe('MobileNetworkOptimizer', () => {
  let networkOptimizer: MobileNetworkOptimizer;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset fetch mock
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        'content-type': 'application/json',
        'content-length': '1024',
      }),
      json: () => Promise.resolve({ data: 'test' }),
      text: () => Promise.resolve('test'),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    });

    // Reset connection mock
    mockConnection.effectiveType = '4g';
    mockConnection.downlink = 10;
    mockConnection.rtt = 50;
    mockConnection.saveData = false;

    networkOptimizer = MobileNetworkOptimizer.getInstance();
  });

  afterEach(() => {
    networkOptimizer.cleanup();
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MobileNetworkOptimizer.getInstance();
      const instance2 = MobileNetworkOptimizer.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = MobileNetworkOptimizer.getInstance();
      instance1.setBatchSize(10);
      
      const instance2 = MobileNetworkOptimizer.getInstance();
      
      expect(instance2.getBatchSize()).toBe(10);
    });
  });

  describe('Network Detection', () => {
    it('should detect network connection type', () => {
      mockConnection.effectiveType = '3g';
      mockConnection.downlink = 2;
      mockConnection.rtt = 200;

      const connectionInfo = networkOptimizer.getConnectionInfo();

      expect(connectionInfo.type).toBe('3g');
      expect(connectionInfo.downlink).toBe(2);
      expect(connectionInfo.rtt).toBe(200);
      expect(connectionInfo.isSlowConnection).toBe(true);
    });

    it('should detect save data preference', () => {
      mockConnection.saveData = true;

      const connectionInfo = networkOptimizer.getConnectionInfo();

      expect(connectionInfo.saveData).toBe(true);
    });

    it('should detect offline status', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

      const connectionInfo = networkOptimizer.getConnectionInfo();

      expect(connectionInfo.isOnline).toBe(false);
    });

    it('should listen for connection changes', () => {
      const changeHandler = jest.fn();
      networkOptimizer.onConnectionChange(changeHandler);

      // Simulate connection change
      mockConnection.effectiveType = '2g';
      const changeEvent = new Event('change');
      mockConnection.addEventListener.mock.calls[0][1](changeEvent);

      expect(changeHandler).toHaveBeenCalledWith({
        type: '2g',
        downlink: 10,
        rtt: 50,
        saveData: false,
        isOnline: true,
        isSlowConnection: true,
      });
    });

    it('should handle missing Network Information API', () => {
      Object.defineProperty(navigator, 'connection', {
        value: undefined,
        writable: true,
      });

      const connectionInfo = networkOptimizer.getConnectionInfo();

      expect(connectionInfo.type).toBe('unknown');
      expect(connectionInfo.downlink).toBe(0);
      expect(connectionInfo.rtt).toBe(0);
    });
  });

  describe('Request Batching', () => {
    it('should batch multiple requests', async () => {
      networkOptimizer.setBatchSize(3);

      const requests = [
        networkOptimizer.fetch('/api/data1'),
        networkOptimizer.fetch('/api/data2'),
        networkOptimizer.fetch('/api/data3'),
      ];

      jest.advanceTimersByTime(100); // Trigger batch processing

      await Promise.all(requests);

      // Should have made a single batched request
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('batch'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('data1'),
        })
      );
    });

    it('should handle individual requests when batching is disabled', async () => {
      networkOptimizer.setBatchingEnabled(false);

      const requests = [
        networkOptimizer.fetch('/api/data1'),
        networkOptimizer.fetch('/api/data2'),
      ];

      await Promise.all(requests);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should flush batch on timeout', async () => {
      networkOptimizer.setBatchSize(5);
      networkOptimizer.setBatchTimeout(200);

      // Add fewer requests than batch size
      networkOptimizer.fetch('/api/data1');
      networkOptimizer.fetch('/api/data2');

      jest.advanceTimersByTime(200);

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should prioritize requests by priority', async () => {
      const highPriorityRequest = networkOptimizer.fetch('/api/critical', {
        priority: 'high'
      });
      
      const lowPriorityRequest = networkOptimizer.fetch('/api/background', {
        priority: 'low'
      });

      jest.advanceTimersByTime(50);

      await Promise.all([highPriorityRequest, lowPriorityRequest]);

      // High priority should be processed first
      const batchData = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(batchData.requests[0].url).toContain('critical');
    });

    it('should handle batch request failures gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const request = networkOptimizer.fetch('/api/failing');
      jest.advanceTimersByTime(100);

      await expect(request).rejects.toThrow('Network error');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Batch request failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Request Compression', () => {
    it('should compress request bodies when enabled', async () => {
      networkOptimizer.setCompressionEnabled(true);

      const largeData = { data: 'x'.repeat(1000) };

      await networkOptimizer.fetch('/api/upload', {
        method: 'POST',
        body: JSON.stringify(largeData),
      });

      const call = (global.fetch as jest.Mock).mock.calls[0];
      expect(call[1].headers).toHaveProperty('content-encoding', 'gzip');
    });

    it('should not compress small payloads', async () => {
      networkOptimizer.setCompressionEnabled(true);
      networkOptimizer.setCompressionThreshold(100); // 100 bytes

      const smallData = { message: 'small' };

      await networkOptimizer.fetch('/api/small', {
        method: 'POST',
        body: JSON.stringify(smallData),
      });

      const call = (global.fetch as jest.Mock).mock.calls[0];
      expect(call[1].headers).not.toHaveProperty('content-encoding');
    });

    it('should handle compression failures gracefully', async () => {
      // Mock compression failure
      (global.CompressionStream as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Compression failed');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await networkOptimizer.fetch('/api/data', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Request compression failed, sending uncompressed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Adaptive Request Handling', () => {
    it('should adapt request timeout based on connection', async () => {
      // Slow connection
      mockConnection.effectiveType = '2g';
      mockConnection.rtt = 500;

      await networkOptimizer.fetch('/api/data');

      const call = (global.fetch as jest.Mock).mock.calls[0];
      expect(call[1].signal).toBeDefined(); // Should have timeout signal
    });

    it('should reduce concurrent requests on slow connections', () => {
      mockConnection.effectiveType = '2g';
      networkOptimizer.adaptToConnection();

      const concurrency = networkOptimizer.getMaxConcurrentRequests();
      expect(concurrency).toBeLessThan(6); // Default is usually 6
    });

    it('should enable request deduplication on slow connections', async () => {
      mockConnection.effectiveType = 'slow-2g';
      networkOptimizer.adaptToConnection();

      // Make identical requests
      const request1 = networkOptimizer.fetch('/api/same');
      const request2 = networkOptimizer.fetch('/api/same');

      await Promise.all([request1, request2]);

      // Should only make one actual network request
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should adjust batch size based on connection quality', () => {
      // Good connection
      mockConnection.effectiveType = '4g';
      mockConnection.downlink = 20;
      networkOptimizer.adaptToConnection();
      
      const goodConnectionBatchSize = networkOptimizer.getBatchSize();

      // Poor connection
      mockConnection.effectiveType = '2g';
      mockConnection.downlink = 0.5;
      networkOptimizer.adaptToConnection();
      
      const poorConnectionBatchSize = networkOptimizer.getBatchSize();

      expect(poorConnectionBatchSize).toBeLessThan(goodConnectionBatchSize);
    });
  });

  describe('Request Retry Logic', () => {
    it('should retry failed requests with exponential backoff', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      const request = networkOptimizer.fetch('/api/retry', {
        retryAttempts: 3,
        retryDelay: 100,
      });

      jest.advanceTimersByTime(100); // First retry
      jest.advanceTimersByTime(200); // Second retry (exponential backoff)

      await request;

      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry on certain error codes', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        networkOptimizer.fetch('/api/bad-request', { retryAttempts: 3 })
      ).rejects.toThrow('Bad Request');

      expect(global.fetch).toHaveBeenCalledTimes(1); // No retries for 4xx
      consoleSpy.mockRestore();
    });

    it('should respect maximum retry attempts', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        networkOptimizer.fetch('/api/failing', { retryAttempts: 2 })
      ).rejects.toThrow('Network error');

      expect(global.fetch).toHaveBeenCalledTimes(3); // Original + 2 retries
      consoleSpy.mockRestore();
    });

    it('should apply jitter to retry delays', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      const retryDelaySpy = jest.spyOn(networkOptimizer, 'calculateRetryDelay');

      networkOptimizer.fetch('/api/jitter', {
        retryAttempts: 1,
        retryDelay: 1000,
        jitter: true,
      });

      jest.advanceTimersByTime(1500); // Allow for jitter

      expect(retryDelaySpy).toHaveBeenCalledWith(1000, 1, true);
    });
  });

  describe('Caching and Offline Support', () => {
    it('should cache successful responses', async () => {
      const response = {
        ok: true,
        status: 200,
        headers: new Headers({ 'cache-control': 'max-age=3600' }),
        json: () => Promise.resolve({ cached: true }),
        clone: function() { return this; },
      };

      (global.fetch as jest.Mock).mockResolvedValue(response);

      // First request
      const result1 = await networkOptimizer.fetch('/api/cacheable');
      
      // Second request - should use cache
      const result2 = await networkOptimizer.fetch('/api/cacheable');

      expect(global.fetch).toHaveBeenCalledTimes(1); // Only one network request
      expect(await result1.json()).toEqual({ cached: true });
      expect(await result2.json()).toEqual({ cached: true });
    });

    it('should serve cached responses when offline', async () => {
      // First, cache a response
      const cachedResponse = {
        ok: true,
        json: () => Promise.resolve({ offline: false }),
        clone: function() { return this; },
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(cachedResponse);

      await networkOptimizer.fetch('/api/offline-test');

      // Go offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

      // Request should return cached version
      const offlineResult = await networkOptimizer.fetch('/api/offline-test');
      
      expect(await offlineResult.json()).toEqual({ offline: false });
    });

    it('should queue requests when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

      const offlineRequest = networkOptimizer.fetch('/api/queued', {
        method: 'POST',
        body: JSON.stringify({ queued: true }),
      });

      // Come back online
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      window.dispatchEvent(new Event('online'));

      jest.advanceTimersByTime(100); // Allow queue processing

      await offlineRequest;

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/queued',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should respect cache-control headers', async () => {
      const shortCacheResponse = {
        ok: true,
        headers: new Headers({ 'cache-control': 'max-age=1' }),
        json: () => Promise.resolve({ version: 1 }),
        clone: function() { return this; },
      };

      const freshResponse = {
        ok: true,
        headers: new Headers({ 'cache-control': 'max-age=3600' }),
        json: () => Promise.resolve({ version: 2 }),
        clone: function() { return this; },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(shortCacheResponse)
        .mockResolvedValueOnce(freshResponse);

      // First request
      await networkOptimizer.fetch('/api/short-cache');

      // Wait for cache to expire
      jest.advanceTimersByTime(2000);

      // Second request should hit network again
      const result = await networkOptimizer.fetch('/api/short-cache');

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(await result.json()).toEqual({ version: 2 });
    });
  });

  describe('Performance Monitoring', () => {
    it('should track request performance metrics', async () => {
      const startTime = Date.now();
      mockPerformance.now.mockReturnValue(startTime);

      await networkOptimizer.fetch('/api/performance');

      mockPerformance.now.mockReturnValue(startTime + 500); // 500ms later

      const metrics = networkOptimizer.getPerformanceMetrics();

      expect(metrics.averageRequestTime).toBe(500);
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
    });

    it('should track network utilization', () => {
      // Make multiple concurrent requests
      networkOptimizer.fetch('/api/concurrent1');
      networkOptimizer.fetch('/api/concurrent2');
      networkOptimizer.fetch('/api/concurrent3');

      const utilization = networkOptimizer.getNetworkUtilization();

      expect(utilization.activeRequests).toBe(3);
      expect(utilization.utilizationPercentage).toBeGreaterThan(0);
    });

    it('should measure bandwidth usage', async () => {
      const largeResponse = {
        ok: true,
        headers: new Headers({ 'content-length': '10240' }),
        json: () => Promise.resolve({ data: 'large response' }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(largeResponse);

      await networkOptimizer.fetch('/api/large');

      const metrics = networkOptimizer.getPerformanceMetrics();

      expect(metrics.totalBytesDownloaded).toBe(10240);
    });

    it('should track error rates', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: false, status: 500 });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Successful request
      await networkOptimizer.fetch('/api/success');

      // Failed request
      try {
        await networkOptimizer.fetch('/api/error');
      } catch {}

      // HTTP error
      try {
        await networkOptimizer.fetch('/api/http-error');
      } catch {}

      const metrics = networkOptimizer.getPerformanceMetrics();

      expect(metrics.errorRate).toBeCloseTo(0.67, 2); // 2 out of 3 failed

      consoleSpy.mockRestore();
    });
  });

  describe('Resource Prioritization', () => {
    it('should prioritize critical requests', async () => {
      const criticalRequest = networkOptimizer.fetch('/api/critical', {
        priority: 'high',
      });

      const backgroundRequest = networkOptimizer.fetch('/api/background', {
        priority: 'low',
      });

      // Should process critical request first
      await Promise.all([criticalRequest, backgroundRequest]);

      const calls = (global.fetch as jest.Mock).mock.calls;
      expect(calls[0][0]).toContain('critical');
    });

    it('should throttle low-priority requests on slow connections', async () => {
      mockConnection.effectiveType = '2g';
      networkOptimizer.adaptToConnection();

      const lowPriorityRequests = Array.from({ length: 10 }, (_, i) =>
        networkOptimizer.fetch(`/api/low-priority-${i}`, { priority: 'low' })
      );

      jest.advanceTimersByTime(1000);

      // Should throttle low-priority requests
      expect(global.fetch).toHaveBeenCalledTimes(0); // All requests should be queued
    });

    it('should preload resources based on priority', () => {
      const preloadSpy = jest.spyOn(networkOptimizer, 'preloadResource');

      networkOptimizer.preloadResource('/api/important-data', {
        priority: 'high',
        prefetch: true,
      });

      expect(preloadSpy).toHaveBeenCalledWith('/api/important-data', {
        priority: 'high',
        prefetch: true,
      });
    });
  });

  describe('Data Optimization', () => {
    it('should request appropriate image formats for device', () => {
      const webpSupported = true;
      networkOptimizer.setImageFormatSupport({ webp: webpSupported });

      networkOptimizer.fetch('/api/image', {
        imageOptimization: true,
      });

      const call = (global.fetch as jest.Mock).mock.calls[0];
      expect(call[1].headers).toHaveProperty('accept', expect.stringContaining('webp'));
    });

    it('should request lower quality on save-data mode', () => {
      mockConnection.saveData = true;
      networkOptimizer.adaptToConnection();

      networkOptimizer.fetch('/api/content', {
        adaptiveQuality: true,
      });

      const call = (global.fetch as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('quality=low');
    });

    it('should compress response data when appropriate', async () => {
      const compressedResponse = {
        ok: true,
        headers: new Headers({
          'content-encoding': 'gzip',
          'content-type': 'application/json',
        }),
        json: () => Promise.resolve({ compressed: true }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(compressedResponse);

      const result = await networkOptimizer.fetch('/api/compressed');

      expect(await result.json()).toEqual({ compressed: true });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network timeouts gracefully', async () => {
      const mockAbortController = {
        signal: { aborted: false },
        abort: jest.fn(),
      };

      (global.AbortController as jest.Mock).mockReturnValue(mockAbortController);

      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => {
          setTimeout(() => {
            mockAbortController.signal.aborted = true;
            resolve({ ok: false, status: 408 });
          }, 5000);
        })
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        networkOptimizer.fetch('/api/timeout', { timeout: 1000 })
      ).rejects.toThrow();

      expect(mockAbortController.abort).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle CORS errors appropriately', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new TypeError('Failed to fetch')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        networkOptimizer.fetch('https://example.com/api/cors')
      ).rejects.toThrow('Failed to fetch');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Request failed:',
        expect.any(TypeError)
      );

      consoleSpy.mockRestore();
    });

    it('should recover from DNS failures', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ recovered: true }),
        });

      const result = await networkOptimizer.fetch('/api/dns-recovery', {
        retryAttempts: 1,
      });

      expect(await result.json()).toEqual({ recovered: true });
    });
  });

  describe('Configuration and Settings', () => {
    it('should allow configuration of optimization settings', () => {
      const config = {
        batchingEnabled: false,
        compressionEnabled: false,
        maxConcurrentRequests: 3,
        cacheEnabled: false,
        retryAttempts: 1,
      };

      networkOptimizer.setConfiguration(config);

      const savedConfig = networkOptimizer.getConfiguration();
      expect(savedConfig).toEqual(expect.objectContaining(config));
    });

    it('should validate configuration values', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      networkOptimizer.setMaxConcurrentRequests(-1);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid max concurrent requests: -1. Must be positive.'
      );

      expect(networkOptimizer.getMaxConcurrentRequests()).not.toBe(-1);

      consoleSpy.mockRestore();
    });

    it('should persist settings across sessions', () => {
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem')
        .mockReturnValue(JSON.stringify({ batchSize: 10 }));

      networkOptimizer.saveConfiguration();
      
      expect(setItemSpy).toHaveBeenCalledWith(
        'mobile-network-optimizer-config',
        expect.any(String)
      );

      networkOptimizer.loadConfiguration();

      expect(getItemSpy).toHaveBeenCalledWith('mobile-network-optimizer-config');

      setItemSpy.mockRestore();
      getItemSpy.mockRestore();
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with complex network scenarios', async () => {
      // Start with good connection
      mockConnection.effectiveType = '4g';
      mockConnection.downlink = 15;
      
      // Make initial requests
      const requests = [
        networkOptimizer.fetch('/api/analytics/vendors'),
        networkOptimizer.fetch('/api/analytics/charts'),
        networkOptimizer.fetch('/api/analytics/metrics'),
      ];

      jest.advanceTimersByTime(50); // Allow batching

      // Simulate connection degradation
      mockConnection.effectiveType = '3g';
      mockConnection.downlink = 3;
      mockConnection.addEventListener.mock.calls[0][1](new Event('change'));

      // Network optimizer should adapt
      const metrics = networkOptimizer.getPerformanceMetrics();
      expect(metrics.totalRequests).toBeGreaterThan(0);

      // New request should use adapted settings
      const adaptedRequest = networkOptimizer.fetch('/api/analytics/summary');

      await Promise.all([...requests, adaptedRequest]);

      // Verify optimization applied
      const finalMetrics = networkOptimizer.getPerformanceMetrics();
      expect(finalMetrics.successfulRequests).toBe(4);
      expect(finalMetrics.averageRequestTime).toBeGreaterThan(0);
    });

    it('should handle offline-to-online transitions smoothly', async () => {
      // Start online, make request
      const onlineRequest = networkOptimizer.fetch('/api/online');

      // Go offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

      // Queue offline requests
      const offlineRequest1 = networkOptimizer.fetch('/api/offline1', {
        method: 'POST',
        body: JSON.stringify({ offline: true }),
      });

      const offlineRequest2 = networkOptimizer.fetch('/api/offline2');

      // Come back online
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      window.dispatchEvent(new Event('online'));

      jest.advanceTimersByTime(100); // Allow queue processing

      await Promise.all([onlineRequest, offlineRequest1, offlineRequest2]);

      // All requests should have been processed
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should optimize for real mobile usage patterns', async () => {
      // Simulate mobile device constraints
      mockConnection.effectiveType = '3g';
      mockConnection.downlink = 2;
      mockConnection.rtt = 150;
      mockConnection.saveData = true;

      networkOptimizer.adaptToConnection();

      // Simulate typical mobile app requests
      const userDataRequest = networkOptimizer.fetch('/api/user/profile', {
        priority: 'high',
      });

      const analyticsRequest = networkOptimizer.fetch('/api/analytics/summary', {
        priority: 'medium',
        adaptiveQuality: true,
      });

      const backgroundRequest = networkOptimizer.fetch('/api/background/sync', {
        priority: 'low',
      });

      jest.advanceTimersByTime(200); // Allow prioritization

      await Promise.all([userDataRequest, analyticsRequest, backgroundRequest]);

      // Verify mobile optimizations were applied
      const config = networkOptimizer.getConfiguration();
      expect(config.maxConcurrentRequests).toBeLessThan(6);
      expect(config.batchingEnabled).toBe(true);

      const metrics = networkOptimizer.getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.successfulRequests).toBe(3);
    });
  });
});