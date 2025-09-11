import { MobileNetworkOptimizer } from '@/lib/services/mobile/MobileNetworkOptimizer';

// Mock Network Information API
Object.defineProperty(navigator, 'connection', {
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  writable: true,
});

// Mock fetch
global.fetch = jest.fn();

// Mock IndexedDB for offline queue
const mockIDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

const mockDB = {
  createObjectStore: jest.fn(),
  transaction: jest.fn(),
  close: jest.fn(),
};

const mockTransaction = {
  objectStore: jest.fn(),
  oncomplete: null,
  onerror: null,
};

const mockObjectStore = {
  add: jest.fn(),
  put: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(global, 'indexedDB', {
  value: mockIDB,
  writable: true,
});

describe('MobileNetworkOptimizer', () => {
  let networkOptimizer: MobileNetworkOptimizer;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup IndexedDB mocks
    mockIDB.open.mockImplementation(() => {
      const request = {
        result: mockDB,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };
      
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess({ target: { result: mockDB } });
      }, 0);
      
      return request;
    });
    
    mockDB.transaction.mockReturnValue(mockTransaction);
    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
    
    networkOptimizer = MobileNetworkOptimizer.getInstance();
  });

  describe('Initialization', () => {
    it('creates singleton instance', () => {
      const instance1 = MobileNetworkOptimizer.getInstance();
      const instance2 = MobileNetworkOptimizer.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('initializes with network monitoring', async () => {
      await networkOptimizer.initialize();
      
      expect(navigator.connection!.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });

    it('detects initial network conditions', async () => {
      await networkOptimizer.initialize();
      
      const networkInfo = networkOptimizer.getNetworkInfo();
      
      expect(networkInfo.effectiveType).toBe('4g');
      expect(networkInfo.downlink).toBe(10);
      expect(networkInfo.rtt).toBe(100);
      expect(networkInfo.saveData).toBe(false);
    });

    it('handles missing Network Information API', async () => {
      // Remove network API
      Object.defineProperty(navigator, 'connection', {
        value: undefined,
        writable: true,
      });
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      await networkOptimizer.initialize();
      
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Network Information API not available')
      );
      
      consoleWarn.mockRestore();
    });
  });

  describe('Network Condition Detection', () => {
    it('detects slow network conditions', () => {
      // Mock slow connection
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '2g',
          downlink: 0.5,
          rtt: 2000,
          saveData: true,
        },
        writable: true,
      });
      
      const isSlowNetwork = networkOptimizer.isSlowNetwork();
      
      expect(isSlowNetwork).toBe(true);
    });

    it('detects fast network conditions', () => {
      // Mock fast connection
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '4g',
          downlink: 50,
          rtt: 50,
          saveData: false,
        },
        writable: true,
      });
      
      const isSlowNetwork = networkOptimizer.isSlowNetwork();
      
      expect(isSlowNetwork).toBe(false);
    });

    it('adapts to network changes', async () => {
      await networkOptimizer.initialize();
      
      const networkChangeCallback = jest.fn();
      networkOptimizer.onNetworkChange(networkChangeCallback);
      
      // Simulate network change
      const changeEvent = new Event('change');
      const addEventListenerCall = (navigator.connection!.addEventListener as jest.Mock).mock.calls[0];
      const changeHandler = addEventListenerCall[1];
      
      // Change to slow network
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '2g',
          downlink: 0.3,
          rtt: 3000,
          saveData: true,
        },
        writable: true,
      });
      
      changeHandler(changeEvent);
      
      expect(networkChangeCallback).toHaveBeenCalledWith({
        effectiveType: '2g',
        downlink: 0.3,
        rtt: 3000,
        saveData: true,
        isSlowNetwork: true,
      });
    });

    it('detects offline conditions', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });
      
      const isOffline = networkOptimizer.isOffline();
      
      expect(isOffline).toBe(true);
    });
  });

  describe('Request Batching', () => {
    beforeEach(async () => {
      await networkOptimizer.initialize();
    });

    it('batches multiple requests', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true })));
      
      const requests = [
        { url: '/api/vendor/1', method: 'GET' },
        { url: '/api/vendor/2', method: 'GET' },
        { url: '/api/vendor/3', method: 'GET' },
      ];
      
      await networkOptimizer.batchRequests(requests);
      
      // Should make single batched request instead of 3 separate ones
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Batch-Request': 'true',
        },
        body: JSON.stringify({ requests }),
      });
    });

    it('respects batching limits', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true })));
      
      // Create more requests than batch limit
      const requests = Array.from({ length: 25 }, (_, i) => ({
        url: `/api/vendor/${i}`,
        method: 'GET',
      }));
      
      await networkOptimizer.batchRequests(requests, { maxBatchSize: 10 });
      
      // Should create multiple batches
      expect(mockFetch).toHaveBeenCalledTimes(3); // 10 + 10 + 5
    });

    it('adapts batch size based on network conditions', async () => {
      // Set slow network
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '2g',
          downlink: 0.5,
          rtt: 2000,
        },
        writable: true,
      });
      
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true })));
      
      const requests = Array.from({ length: 20 }, (_, i) => ({
        url: `/api/vendor/${i}`,
        method: 'GET',
      }));
      
      await networkOptimizer.batchRequests(requests);
      
      // Should use smaller batches for slow networks
      expect(mockFetch).toHaveBeenCalledTimes(4); // Smaller batch size of 5
    });

    it('handles batch request failures gracefully', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const requests = [
        { url: '/api/vendor/1', method: 'GET' },
        { url: '/api/vendor/2', method: 'GET' },
      ];
      
      const results = await networkOptimizer.batchRequests(requests);
      
      expect(results).toEqual([
        { error: 'Network error', originalRequest: requests[0] },
        { error: 'Network error', originalRequest: requests[1] },
      ]);
    });
  });

  describe('Request Compression', () => {
    beforeEach(async () => {
      await networkOptimizer.initialize();
    });

    it('compresses request payloads', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue(new Response('compressed response'));
      
      const largePayload = {
        data: Array.from({ length: 1000 }, (_, i) => `item-${i}`),
        description: 'A'.repeat(5000),
      };
      
      await networkOptimizer.compressedRequest('/api/data', {
        method: 'POST',
        body: JSON.stringify(largePayload),
      });
      
      const fetchCall = mockFetch.mock.calls[0];
      const requestInit = fetchCall[1] as RequestInit;
      
      expect(requestInit.headers).toMatchObject({
        'Content-Encoding': 'gzip',
        'Content-Type': 'application/json',
      });
    });

    it('only compresses payloads above threshold', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue(new Response('ok'));
      
      const smallPayload = { id: 1, name: 'test' };
      
      await networkOptimizer.compressedRequest('/api/data', {
        method: 'POST',
        body: JSON.stringify(smallPayload),
      });
      
      const fetchCall = mockFetch.mock.calls[0];
      const requestInit = fetchCall[1] as RequestInit;
      
      expect(requestInit.headers).not.toHaveProperty('Content-Encoding');
    });

    it('handles compression errors gracefully', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue(new Response('ok'));
      
      // Mock compression failure
      const originalCompress = require('lz-string').compress;
      require('lz-string').compress = jest.fn(() => {
        throw new Error('Compression failed');
      });
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      await networkOptimizer.compressedRequest('/api/data', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
      });
      
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Request compression failed')
      );
      
      // Should fall back to uncompressed request
      expect(mockFetch).toHaveBeenCalled();
      
      require('lz-string').compress = originalCompress;
      consoleWarn.mockRestore();
    });
  });

  describe('Offline Queue Management', () => {
    beforeEach(async () => {
      await networkOptimizer.initialize();
    });

    it('queues requests when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });
      
      const mockRequest = { onsuccess: null, onerror: null };
      mockObjectStore.add.mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onsuccess) mockRequest.onsuccess({});
      }, 0);
      
      await networkOptimizer.queueOfflineRequest({
        url: '/api/vendor/1',
        method: 'POST',
        body: JSON.stringify({ name: 'Test Vendor' }),
      });
      
      expect(mockObjectStore.add).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/vendor/1',
          method: 'POST',
          timestamp: expect.any(Number),
          retries: 0,
        })
      );
    });

    it('processes offline queue when coming back online', async () => {
      const queuedRequests = [
        {
          id: 1,
          url: '/api/vendor/1',
          method: 'POST',
          body: JSON.stringify({ name: 'Vendor 1' }),
          timestamp: Date.now() - 30000,
          retries: 0,
        },
        {
          id: 2,
          url: '/api/vendor/2',
          method: 'POST',
          body: JSON.stringify({ name: 'Vendor 2' }),
          timestamp: Date.now() - 20000,
          retries: 0,
        },
      ];
      
      const mockRequest = { onsuccess: null, onerror: null };
      mockObjectStore.getAll.mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: { result: queuedRequests } });
        }
      }, 0);
      
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true })));
      
      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
      });
      
      await networkOptimizer.processOfflineQueue();
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('implements exponential backoff for failed requests', async () => {
      const failedRequest = {
        id: 1,
        url: '/api/vendor/1',
        method: 'POST',
        body: JSON.stringify({ name: 'Vendor 1' }),
        timestamp: Date.now() - 60000,
        retries: 2,
      };
      
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValue(new Error('Server error'));
      
      jest.useFakeTimers();
      
      const retryPromise = networkOptimizer.retryFailedRequest(failedRequest);
      
      // Should wait for exponential backoff delay (2^2 * 1000 = 4000ms)
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 4000);
      
      jest.advanceTimersByTime(4000);
      
      await retryPromise;
      
      expect(mockFetch).toHaveBeenCalled();
      
      jest.useRealTimers();
    });

    it('removes expired requests from queue', async () => {
      const expiredRequest = {
        id: 1,
        url: '/api/vendor/1',
        method: 'POST',
        timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days old
        retries: 0,
      };
      
      const mockDeleteRequest = { onsuccess: null, onerror: null };
      mockObjectStore.delete.mockReturnValue(mockDeleteRequest);
      
      setTimeout(() => {
        if (mockDeleteRequest.onsuccess) mockDeleteRequest.onsuccess({});
      }, 0);
      
      await networkOptimizer.cleanupExpiredRequests();
      
      expect(mockObjectStore.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('Intelligent Retry Logic', () => {
    beforeEach(async () => {
      await networkOptimizer.initialize();
    });

    it('retries requests with exponential backoff', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true })));
      
      jest.useFakeTimers();
      
      const requestPromise = networkOptimizer.requestWithRetry('/api/vendor/1', {
        method: 'GET',
        maxRetries: 3,
        baseDelay: 1000,
      });
      
      // First attempt fails immediately
      await Promise.resolve(); // Allow first attempt to complete
      
      // Should schedule first retry after 1000ms
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
      jest.advanceTimersByTime(1000);
      
      await Promise.resolve(); // Allow first retry to complete
      
      // Should schedule second retry after 2000ms (exponential backoff)
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000);
      jest.advanceTimersByTime(2000);
      
      const result = await requestPromise;
      
      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledTimes(3);
      
      jest.useRealTimers();
    });

    it('adapts retry strategy based on error type', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      
      // Network timeout - should retry
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ success: true })));
      
      const result1 = await networkOptimizer.requestWithRetry('/api/vendor/1', {
        maxRetries: 2,
      });
      
      expect(result1).toEqual({ success: true });
      
      mockFetch.mockClear();
      
      // 400 Bad Request - should not retry
      mockFetch.mockResolvedValueOnce(new Response('Bad Request', { status: 400 }));
      
      const result2 = await networkOptimizer.requestWithRetry('/api/vendor/2', {
        maxRetries: 2,
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retries for 4xx errors
    });

    it('uses jittered backoff to prevent thundering herd', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValue(new Error('Server overloaded'));
      
      jest.useFakeTimers();
      
      // Start multiple requests simultaneously
      const promises = Array.from({ length: 10 }, () =>
        networkOptimizer.requestWithRetry('/api/vendor/1', {
          maxRetries: 1,
          baseDelay: 1000,
          jitter: true,
        })
      );
      
      await Promise.resolve(); // Allow first attempts to complete
      
      // Check that retry delays are jittered (not all exactly 1000ms)
      const timeoutCalls = (setTimeout as jest.Mock).mock.calls;
      const delays = timeoutCalls.map(call => call[1]);
      const uniqueDelays = new Set(delays);
      
      expect(uniqueDelays.size).toBeGreaterThan(1); // Should have different delays due to jitter
      
      jest.useRealTimers();
    });
  });

  describe('Connection-Aware Resource Loading', () => {
    beforeEach(async () => {
      await networkOptimizer.initialize();
    });

    it('reduces image quality on slow connections', () => {
      // Mock slow connection
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '2g',
          downlink: 0.5,
          saveData: true,
        },
        writable: true,
      });
      
      const optimizedUrl = networkOptimizer.optimizeImageUrl(
        'https://example.com/image.jpg',
        { width: 800, height: 600 }
      );
      
      expect(optimizedUrl).toContain('q=30'); // Low quality for slow connection
      expect(optimizedUrl).toContain('w=400'); // Reduced size
      expect(optimizedUrl).toContain('h=300');
    });

    it('maintains high quality on fast connections', () => {
      // Mock fast connection
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '4g',
          downlink: 50,
          saveData: false,
        },
        writable: true,
      });
      
      const optimizedUrl = networkOptimizer.optimizeImageUrl(
        'https://example.com/image.jpg',
        { width: 800, height: 600 }
      );
      
      expect(optimizedUrl).toContain('q=85'); // High quality for fast connection
      expect(optimizedUrl).toContain('w=800'); // Full size
      expect(optimizedUrl).toContain('h=600');
    });

    it('preloads critical resources intelligently', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue(new Response('resource content'));
      
      await networkOptimizer.preloadCriticalResources([
        { url: '/api/vendors', priority: 'high' },
        { url: '/api/analytics', priority: 'medium' },
        { url: '/api/reports', priority: 'low' },
      ]);
      
      // High priority resources should be loaded first
      expect(mockFetch).toHaveBeenCalledWith('/api/vendors', {
        priority: 'high',
        cache: 'force-cache',
      });
    });

    it('defers non-critical resources on slow connections', async () => {
      // Mock slow connection
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '2g',
          downlink: 0.3,
        },
        writable: true,
      });
      
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue(new Response('resource content'));
      
      await networkOptimizer.preloadCriticalResources([
        { url: '/api/vendors', priority: 'high' },
        { url: '/api/reports', priority: 'low' },
      ]);
      
      // Only high priority should be loaded on slow connections
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/vendors', expect.any(Object));
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await networkOptimizer.initialize();
    });

    it('tracks request performance metrics', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockImplementation(async () => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return new Response(JSON.stringify({ success: true }));
      });
      
      jest.useFakeTimers();
      
      const requestPromise = networkOptimizer.trackedRequest('/api/vendor/1');
      
      jest.advanceTimersByTime(100);
      
      await requestPromise;
      
      const metrics = networkOptimizer.getPerformanceMetrics();
      
      expect(metrics.averageRequestTime).toBeGreaterThan(0);
      expect(metrics.totalRequests).toBe(1);
      
      jest.useRealTimers();
    });

    it('monitors network utilization', () => {
      // Simulate multiple concurrent requests
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue(new Response('ok'));
      
      // Start multiple requests
      networkOptimizer.trackedRequest('/api/vendor/1');
      networkOptimizer.trackedRequest('/api/vendor/2');
      networkOptimizer.trackedRequest('/api/vendor/3');
      
      const utilization = networkOptimizer.getNetworkUtilization();
      
      expect(utilization.concurrentRequests).toBe(3);
      expect(utilization.utilizationPercentage).toBeGreaterThan(0);
    });

    it('detects and reports network anomalies', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      
      // Simulate consistently slow responses
      mockFetch.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
        return new Response('ok');
      });
      
      const anomalyCallback = jest.fn();
      networkOptimizer.onNetworkAnomaly(anomalyCallback);
      
      jest.useFakeTimers();
      
      const requestPromise = networkOptimizer.trackedRequest('/api/slow-endpoint');
      
      jest.advanceTimersByTime(5000);
      
      await requestPromise;
      
      expect(anomalyCallback).toHaveBeenCalledWith({
        type: 'slow_response',
        responseTime: 5000,
        threshold: expect.any(Number),
      });
      
      jest.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      const result = await networkOptimizer.requestWithRetry('/api/vendor/1', {
        maxRetries: 0, // No retries for this test
      });
      
      expect(result).toBeNull();
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Network request failed')
      );
      
      consoleError.mockRestore();
    });

    it('handles offline queue database errors', async () => {
      // Mock IndexedDB error
      mockObjectStore.add.mockImplementation(() => {
        const request = { onsuccess: null, onerror: null };
        setTimeout(() => {
          if (request.onerror) request.onerror({ target: { error: new Error('DB error') } });
        }, 0);
        return request;
      });
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      await networkOptimizer.queueOfflineRequest({
        url: '/api/vendor/1',
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      });
      
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to queue offline request')
      );
      
      consoleError.mockRestore();
    });

    it('recovers from compression failures', async () => {
      // Mock compression library failure
      const originalCompress = require('lz-string').compress;
      require('lz-string').compress = jest.fn(() => {
        throw new Error('Compression library error');
      });
      
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue(new Response('ok'));
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      await networkOptimizer.compressedRequest('/api/data', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
      });
      
      // Should fall back to uncompressed request
      expect(mockFetch).toHaveBeenCalled();
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Request compression failed')
      );
      
      require('lz-string').compress = originalCompress;
      consoleWarn.mockRestore();
    });
  });
});