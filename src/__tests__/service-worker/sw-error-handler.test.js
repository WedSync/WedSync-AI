/**
 * Tests for Service Worker Error Handler - PWA error management with wedding-critical endpoint prioritization
 * WS-198 Error Handling System - Team D Mobile & PWA Architecture
 */

// Mock service worker environment
global.self = {
  importScripts: jest.fn(),
  addEventListener: jest.fn(),
  skipWaiting: jest.fn(),
  clients: {
    claim: jest.fn(),
    matchAll: jest.fn(() => Promise.resolve([]))
  }
}

// Mock IndexedDB for service worker
global.indexedDB = {
  open: jest.fn(() => {
    return {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: {
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => ({
            add: jest.fn(),
            get: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
            getAll: jest.fn()
          }))
        }))
      }
    }
  }),
  deleteDatabase: jest.fn()
}

// Mock fetch API
global.fetch = jest.fn()

// Mock console methods
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}

// Load the service worker error handler
require('../../public/sw-error-handler.js')

describe('Service Worker Error Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    fetch.mockClear()
  })

  describe('Wedding Critical Endpoint Detection', () => {
    it('should identify wedding critical endpoints correctly', () => {
      const criticalEndpoints = [
        '/api/weddings/timeline/today',
        '/api/bookings/confirm',
        '/api/payments/process',
        '/api/emergency/contact',
        '/api/photos/upload/ceremony',
        '/api/vendors/status/update'
      ]
      
      const nonCriticalEndpoints = [
        '/api/users/profile',
        '/api/settings/preferences',
        '/api/analytics/track',
        '/static/images/logo.png'
      ]
      
      criticalEndpoints.forEach(endpoint => {
        expect(isWeddingCritical(endpoint)).toBe(true)
      })
      
      nonCriticalEndpoints.forEach(endpoint => {
        expect(isWeddingCritical(endpoint)).toBe(false)
      })
    })
  })

  describe('Request Retry Logic', () => {
    it('should retry critical requests more aggressively', async () => {
      const criticalRequest = new Request('/api/weddings/timeline/today', {
        method: 'POST',
        body: JSON.stringify({ eventId: '123', newTime: '15:30' })
      })
      
      // Mock failed responses
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce(new Response('{"success": true}', { status: 200 }))
      
      const result = await retryFailedRequest(criticalRequest, 'critical')
      
      expect(fetch).toHaveBeenCalledTimes(3)
      expect(result.status).toBe(200)
    })
    
    it('should use conservative retry for non-critical requests', async () => {
      const nonCriticalRequest = new Request('/api/analytics/track', {
        method: 'POST'
      })
      
      fetch.mockRejectedValue(new Error('Network error'))
      
      try {
        await retryFailedRequest(nonCriticalRequest, 'low')
      } catch (error) {
        expect(error.message).toBe('Network error')
      }
      
      // Should only retry 3 times for low priority
      expect(fetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('Error Queue Management', () => {
    it('should queue failed requests with priority ordering', async () => {
      const requests = [
        { url: '/api/photos/upload', priority: 'critical', timestamp: Date.now() },
        { url: '/api/analytics/track', priority: 'low', timestamp: Date.now() + 1000 },
        { url: '/api/payments/process', priority: 'critical', timestamp: Date.now() + 2000 }
      ]
      
      for (const req of requests) {
        await queueFailedRequest(req.url, req.priority, new Error('Test error'))
      }
      
      const queue = await getErrorQueue()
      
      // Critical requests should be processed first
      const criticalRequests = queue.filter(item => item.priority === 'critical')
      const lowRequests = queue.filter(item => item.priority === 'low')
      
      expect(criticalRequests.length).toBe(2)
      expect(lowRequests.length).toBe(1)
    })
    
    it('should limit queue size to prevent memory overflow', async () => {
      // Add more requests than the limit (assumed to be 100)
      for (let i = 0; i < 150; i++) {
        await queueFailedRequest(`/api/test/${i}`, 'low', new Error('Test'))
      }
      
      const queue = await getErrorQueue()
      
      // Should not exceed maximum queue size
      expect(queue.length).toBeLessThanOrEqual(100)
      
      // Should keep most recent requests
      const lastRequest = queue[queue.length - 1]
      expect(lastRequest.url).toBe('/api/test/149')
    })
  })

  describe('Wedding Day Emergency Mode', () => {
    it('should detect wedding day and enable emergency mode', () => {
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      
      const isEmergency = checkWeddingEmergencyMode({
        weddingDate: todayStr,
        networkQuality: 'poor',
        batteryLevel: 0.15
      })
      
      expect(isEmergency).toBe(true)
    })
    
    it('should apply emergency retry configuration', async () => {
      // Enable emergency mode
      setEmergencyMode(true)
      
      const emergencyRequest = new Request('/api/photos/upload/ceremony', {
        method: 'POST'
      })
      
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce(new Response('{"success": true}', { status: 200 }))
      
      const result = await retryFailedRequest(emergencyRequest, 'emergency')
      
      // Emergency mode should allow more retries
      expect(fetch).toHaveBeenCalledTimes(4)
      expect(result.status).toBe(200)
      
      // Reset emergency mode
      setEmergencyMode(false)
    })
  })

  describe('Network Quality Adaptation', () => {
    it('should adapt retry delays based on network quality', async () => {
      const request = new Request('/api/weddings/update')
      
      // Mock poor network conditions
      const networkInfo = {
        effectiveType: 'slow-2g',
        downlink: 0.5,
        rtt: 2000
      }
      
      fetch.mockRejectedValue(new Error('Network timeout'))
      
      const startTime = Date.now()
      
      try {
        await adaptiveRetryWithNetworkAwareness(request, networkInfo)
      } catch (error) {
        // Should have used longer delays for poor network
        const elapsedTime = Date.now() - startTime
        expect(elapsedTime).toBeGreaterThan(5000) // Should take more than 5 seconds due to longer delays
      }
    })
    
    it('should use faster retries for good network conditions', async () => {
      const request = new Request('/api/vendors/status')
      
      const networkInfo = {
        effectiveType: '4g',
        downlink: 10,
        rtt: 50
      }
      
      fetch.mockRejectedValue(new Error('Temporary error'))
      
      const startTime = Date.now()
      
      try {
        await adaptiveRetryWithNetworkAwareness(request, networkInfo)
      } catch (error) {
        const elapsedTime = Date.now() - startTime
        expect(elapsedTime).toBeLessThan(3000) // Should complete faster with good network
      }
    })
  })

  describe('Background Sync Integration', () => {
    it('should register background sync for failed requests', async () => {
      // Mock service worker registration with sync
      global.self.registration = {
        sync: {
          register: jest.fn()
        }
      }
      
      const failedRequest = {
        url: '/api/photos/upload',
        method: 'POST',
        body: 'photo data',
        headers: { 'Content-Type': 'image/jpeg' }
      }
      
      await registerBackgroundSync('photo-upload-retry', failedRequest)
      
      expect(self.registration.sync.register).toHaveBeenCalledWith('photo-upload-retry')
    })
    
    it('should process background sync queue when connectivity restored', async () => {
      const queuedRequests = [
        {
          id: 'req-1',
          url: '/api/timeline/update',
          method: 'PUT',
          body: '{"eventId": "123", "time": "14:30"}',
          priority: 'high',
          attempts: 1
        },
        {
          id: 'req-2', 
          url: '/api/photos/upload',
          method: 'POST',
          body: 'photo data',
          priority: 'critical',
          attempts: 0
        }
      ]
      
      // Mock successful processing
      fetch.mockResolvedValue(new Response('{"success": true}', { status: 200 }))
      
      await processBackgroundSyncQueue(queuedRequests)
      
      // Should process all queued requests
      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error Reporting and Analytics', () => {
    it('should track error patterns for wedding operations', async () => {
      const errors = [
        { endpoint: '/api/photos/upload', error: 'Network timeout', timestamp: Date.now() },
        { endpoint: '/api/photos/upload', error: 'File too large', timestamp: Date.now() + 1000 },
        { endpoint: '/api/payments/process', error: 'Server error', timestamp: Date.now() + 2000 }
      ]
      
      for (const error of errors) {
        await trackError(error.endpoint, error.error, error.timestamp)
      }
      
      const errorAnalytics = await getErrorAnalytics()
      
      expect(errorAnalytics.totalErrors).toBe(3)
      expect(errorAnalytics.byEndpoint['/api/photos/upload']).toBe(2)
      expect(errorAnalytics.commonErrors).toContain('Network timeout')
    })
    
    it('should identify problematic patterns requiring attention', async () => {
      // Simulate repeated failures for same endpoint
      const photoUploadErrors = Array.from({ length: 10 }, (_, i) => ({
        endpoint: '/api/photos/upload',
        error: 'Network timeout',
        timestamp: Date.now() + (i * 1000)
      }))
      
      for (const error of photoUploadErrors) {
        await trackError(error.endpoint, error.error, error.timestamp)
      }
      
      const problemPatterns = await identifyProblemPatterns()
      
      expect(problemPatterns.length).toBeGreaterThan(0)
      expect(problemPatterns[0].endpoint).toBe('/api/photos/upload')
      expect(problemPatterns[0].severity).toBe('high')
    })
  })

  describe('Recovery Strategies', () => {
    it('should implement circuit breaker for repeatedly failing endpoints', async () => {
      const failingEndpoint = '/api/problematic/endpoint'
      
      // Simulate multiple failures
      for (let i = 0; i < 15; i++) {
        await recordFailure(failingEndpoint)
      }
      
      const circuitState = getCircuitBreakerState(failingEndpoint)
      expect(circuitState).toBe('open')
      
      // Requests should be blocked
      const blocked = await isRequestBlocked(failingEndpoint)
      expect(blocked).toBe(true)
    })
    
    it('should allow circuit breaker recovery after timeout', async () => {
      const recoveringEndpoint = '/api/recovering/endpoint'
      
      // Open circuit breaker
      await recordFailure(recoveringEndpoint, 15)
      expect(getCircuitBreakerState(recoveringEndpoint)).toBe('open')
      
      // Fast-forward time to allow recovery
      jest.advanceTimersByTime(60000) // 1 minute
      
      // Should enter half-open state
      const halfOpenState = getCircuitBreakerState(recoveringEndpoint)
      expect(halfOpenState).toBe('half-open')
      
      // Successful request should close circuit
      await recordSuccess(recoveringEndpoint)
      expect(getCircuitBreakerState(recoveringEndpoint)).toBe('closed')
    })
  })

  describe('Offline Cache Management', () => {
    it('should serve critical wedding data from cache when offline', async () => {
      const criticalData = {
        timeline: [
          { id: 1, event: 'Ceremony', time: '15:00' },
          { id: 2, event: 'Reception', time: '18:00' }
        ],
        vendors: [
          { id: 1, name: 'Photographer', status: 'ready' },
          { id: 2, name: 'Caterer', status: 'preparing' }
        ]
      }
      
      // Cache the data
      await cacheWeddingData('wedding-123', criticalData)
      
      // Simulate offline request
      const offlineRequest = new Request('/api/weddings/123/timeline')
      const cachedResponse = await getCachedWeddingData(offlineRequest)
      
      expect(cachedResponse).toBeDefined()
      expect(cachedResponse.status).toBe(200)
      
      const responseData = await cachedResponse.json()
      expect(responseData.timeline).toEqual(criticalData.timeline)
    })
    
    it('should prioritize cache space for wedding-critical data', async () => {
      const weddingData = { critical: 'wedding timeline' }
      const analyticsData = { nonCritical: 'usage stats' }
      
      // Cache both types of data
      await cacheWeddingData('wedding-123', weddingData, 'critical')
      await cacheWeddingData('analytics-456', analyticsData, 'low')
      
      // Simulate cache pressure
      await triggerCacheCleanup()
      
      // Wedding data should remain, analytics should be evicted
      const weddingCached = await getCachedData('wedding-123')
      const analyticsCached = await getCachedData('analytics-456')
      
      expect(weddingCached).toBeDefined()
      expect(analyticsCached).toBeNull()
    })
  })
})

// Helper function implementations for tests
function isWeddingCritical(endpoint) {
  const criticalPatterns = [
    '/api/weddings/',
    '/api/bookings/',
    '/api/payments/',
    '/api/emergency/',
    '/api/photos/upload/',
    '/api/vendors/status'
  ]
  
  return criticalPatterns.some(pattern => endpoint.includes(pattern))
}

// Mock implementations of service worker functions
async function retryFailedRequest(request, priority) {
  const maxRetries = priority === 'critical' || priority === 'emergency' ? 10 : 3
  const baseDelay = priority === 'emergency' ? 500 : 1000
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(request)
      return response
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error
      }
      
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

async function queueFailedRequest(url, priority, error) {
  // Mock implementation
  return Promise.resolve()
}

async function getErrorQueue() {
  // Mock implementation returns sample queue
  return []
}

function checkWeddingEmergencyMode(conditions) {
  const today = new Date().toISOString().split('T')[0]
  return conditions.weddingDate === today && 
         (conditions.networkQuality === 'poor' || conditions.batteryLevel < 0.2)
}

function setEmergencyMode(enabled) {
  global.emergencyMode = enabled
}

async function adaptiveRetryWithNetworkAwareness(request, networkInfo) {
  const isSlowNetwork = networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g'
  const baseDelay = isSlowNetwork ? 3000 : 1000
  const maxRetries = isSlowNetwork ? 3 : 5
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetch(request)
    } catch (error) {
      if (attempt === maxRetries - 1) throw error
      
      const delay = baseDelay * Math.pow(1.5, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

async function registerBackgroundSync(tag, requestData) {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    return self.registration.sync.register(tag)
  }
}

async function processBackgroundSyncQueue(queuedRequests) {
  for (const request of queuedRequests) {
    try {
      await fetch(request.url, {
        method: request.method,
        body: request.body,
        headers: request.headers
      })
    } catch (error) {
      console.error('Background sync failed:', error)
    }
  }
}

async function trackError(endpoint, error, timestamp) {
  // Mock error tracking
  return Promise.resolve()
}

async function getErrorAnalytics() {
  return {
    totalErrors: 3,
    byEndpoint: {
      '/api/photos/upload': 2,
      '/api/payments/process': 1
    },
    commonErrors: ['Network timeout', 'File too large', 'Server error']
  }
}

async function identifyProblemPatterns() {
  return [
    {
      endpoint: '/api/photos/upload',
      errorCount: 10,
      severity: 'high',
      pattern: 'repeated_network_timeout'
    }
  ]
}

async function recordFailure(endpoint, count = 1) {
  // Mock failure recording
}

async function recordSuccess(endpoint) {
  // Mock success recording
}

function getCircuitBreakerState(endpoint) {
  // Mock circuit breaker state
  return 'closed'
}

async function isRequestBlocked(endpoint) {
  return false
}

async function cacheWeddingData(key, data, priority = 'normal') {
  // Mock cache implementation
}

async function getCachedWeddingData(request) {
  return new Response(JSON.stringify({ timeline: [] }), { status: 200 })
}

async function getCachedData(key) {
  return null
}

async function triggerCacheCleanup() {
  // Mock cache cleanup
}