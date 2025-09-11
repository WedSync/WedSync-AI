/**
 * WS-250: API Gateway Management System Tests - External API Connector
 * Team C - Round 1: Comprehensive tests for third-party API service integration
 */

import { describe, it, expect, beforeEach, afterEach, jest, beforeAll } from '@jest/globals'
import ExternalAPIConnector from '../../../src/integrations/api-gateway/ExternalAPIConnector'
import { IntegrationCredentials, ErrorCategory } from '../../../src/types/integrations'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('ExternalAPIConnector', () => {
  let connector: ExternalAPIConnector
  let mockConfig: any
  let mockCredentials: IntegrationCredentials

  beforeAll(() => {
    jest.useFakeTimers()
  })

  beforeEach(() => {
    mockConfig = {
      baseUrl: 'https://api.example.com',
      timeout: 5000,
      circuitBreaker: {
        failureThreshold: 3,
        recoveryTimeout: 30000,
        monitoringWindow: 60000
      },
      rateLimit: {
        requests: 100,
        windowMs: 60000
      },
      weddingDayProtection: true
    }

    mockCredentials = {
      userId: 'test-user',
      organizationId: 'test-org',
      provider: 'test-provider',
      apiKey: 'test-api-key',
      accessToken: 'test-access-token'
    }

    connector = new ExternalAPIConnector(mockConfig, mockCredentials)
    mockFetch.mockClear()
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(connector).toBeInstanceOf(ExternalAPIConnector)
    })

    it('should set up circuit breaker with default values', () => {
      const defaultConnector = new ExternalAPIConnector(
        { baseUrl: 'https://api.test.com' },
        mockCredentials
      )
      expect(defaultConnector).toBeInstanceOf(ExternalAPIConnector)
    })

    it('should initialize rate limiter correctly', () => {
      const metrics = connector.getMetrics()
      expect(metrics.rateLimiterState.tokens).toBe(100)
    })
  })

  describe('executeRequest', () => {
    it('should execute successful API request', async () => {
      const mockResponse = { data: 'test response' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await connector.executeRequest(
        {
          path: '/test',
          method: 'GET',
          requiresAuth: true
        }
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token'
          })
        })
      )
    })

    it('should handle API errors correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      const result = await connector.executeRequest(
        {
          path: '/nonexistent',
          method: 'GET',
          requiresAuth: true
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('404')
    })

    it('should handle network timeouts', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AbortError')), 100)
        )
      )

      const result = await connector.executeRequest(
        {
          path: '/timeout',
          method: 'GET',
          requiresAuth: true
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should respect rate limiting', async () => {
      // Exhaust rate limit
      const connector = new ExternalAPIConnector(
        { ...mockConfig, rateLimit: { requests: 1, windowMs: 60000 } },
        mockCredentials
      )

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      })

      // First request should succeed
      const result1 = await connector.executeRequest({
        path: '/test1',
        method: 'GET',
        requiresAuth: false
      })
      expect(result1.success).toBe(true)

      // Second request should fail due to rate limiting
      const result2 = await connector.executeRequest({
        path: '/test2',
        method: 'GET',
        requiresAuth: false
      })
      expect(result2.success).toBe(false)
      expect(result2.error).toContain('Rate limit exceeded')
    })

    it('should apply wedding day protection', async () => {
      const weddingContext = {
        isWeddingWeekend: true,
        priority: 'low' as const
      }

      const result = await connector.executeRequest(
        {
          path: '/test',
          method: 'GET',
          requiresAuth: false
        },
        {},
        weddingContext
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('wedding day protection')
    })

    it('should allow critical requests on wedding day', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'critical response' })
      })

      const weddingContext = {
        isWeddingWeekend: true,
        priority: 'critical' as const
      }

      const result = await connector.executeRequest(
        {
          path: '/critical',
          method: 'POST',
          requiresAuth: true
        },
        { urgentData: true },
        weddingContext
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ data: 'critical response' })
    })
  })

  describe('executeBatch', () => {
    it('should process multiple requests in batch', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'batch response' })
      })

      const requests = [
        { endpoint: { path: '/test1', method: 'GET' as const, requiresAuth: false } },
        { endpoint: { path: '/test2', method: 'GET' as const, requiresAuth: false } },
        { endpoint: { path: '/test3', method: 'GET' as const, requiresAuth: false } }
      ]

      const result = await connector.executeBatch(requests, {
        maxConcurrent: 2,
        prioritizeWeddingDay: false
      })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(3)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should prioritize wedding requests in batch', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'response' })
      })

      const requests = [
        { 
          endpoint: { path: '/normal', method: 'GET' as const, requiresAuth: false },
          context: { priority: 'low' as const, isWeddingWeekend: false }
        },
        { 
          endpoint: { path: '/wedding', method: 'GET' as const, requiresAuth: false },
          context: { priority: 'critical' as const, isWeddingWeekend: true }
        }
      ]

      const result = await connector.executeBatch(requests, {
        prioritizeWeddingDay: true
      })

      expect(result.success).toBe(true)
      // Wedding request should be processed first due to prioritization
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://api.example.com/wedding',
        expect.any(Object)
      )
    })
  })

  describe('performHealthCheck', () => {
    it('should perform successful health check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' })
      })

      const health = await connector.performHealthCheck()

      expect(health.isHealthy).toBe(true)
      expect(health.responseTime).toBeGreaterThan(0)
      expect(health.status).toBe('connected')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/health',
        expect.any(Object)
      )
    })

    it('should detect unhealthy service', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Service unavailable'))

      const health = await connector.performHealthCheck()

      expect(health.isHealthy).toBe(false)
      expect(health.status).toBe('disconnected')
      expect(health.consecutiveFailures).toBe(1)
    })
  })

  describe('circuit breaker', () => {
    it('should open circuit breaker after threshold failures', async () => {
      const connector = new ExternalAPIConnector(
        { 
          ...mockConfig, 
          circuitBreaker: { 
            failureThreshold: 2,
            recoveryTimeout: 60000,
            monitoringWindow: 300000
          }
        },
        mockCredentials
      )

      mockFetch.mockRejectedValue(new Error('Service error'))

      // First two failures should execute
      const result1 = await connector.executeRequest({
        path: '/fail1',
        method: 'GET',
        requiresAuth: false
      })
      expect(result1.success).toBe(false)

      const result2 = await connector.executeRequest({
        path: '/fail2',
        method: 'GET',
        requiresAuth: false
      })
      expect(result2.success).toBe(false)

      // Third request should be blocked by circuit breaker
      const result3 = await connector.executeRequest({
        path: '/fail3',
        method: 'GET',
        requiresAuth: false
      })
      expect(result3.success).toBe(false)
      expect(result3.error).toContain('Circuit breaker is open')

      // Should have only called fetch twice (third was blocked)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should reset circuit breaker after recovery timeout', async () => {
      const connector = new ExternalAPIConnector(
        { 
          ...mockConfig, 
          circuitBreaker: { 
            failureThreshold: 1,
            recoveryTimeout: 1000,
            monitoringWindow: 300000
          }
        },
        mockCredentials
      )

      // First request fails, opening circuit breaker
      mockFetch.mockRejectedValueOnce(new Error('Service error'))
      const result1 = await connector.executeRequest({
        path: '/fail',
        method: 'GET',
        requiresAuth: false
      })
      expect(result1.success).toBe(false)

      // Second request is blocked
      const result2 = await connector.executeRequest({
        path: '/blocked',
        method: 'GET',
        requiresAuth: false
      })
      expect(result2.success).toBe(false)
      expect(result2.error).toContain('Circuit breaker is open')

      // Advance time past recovery timeout
      jest.advanceTimersByTime(1500)

      // Third request should succeed (circuit breaker allows retry)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'recovered' })
      })

      const result3 = await connector.executeRequest({
        path: '/recovery',
        method: 'GET',
        requiresAuth: false
      })
      expect(result3.success).toBe(true)
    })
  })

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      const metrics = connector.getMetrics()

      expect(metrics).toHaveProperty('requestCount')
      expect(metrics).toHaveProperty('successCount')
      expect(metrics).toHaveProperty('failureCount')
      expect(metrics).toHaveProperty('averageResponseTime')
      expect(metrics).toHaveProperty('circuitBreakerState')
      expect(metrics).toHaveProperty('rateLimiterState')
    })

    it('should track request metrics accurately', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      })

      // Make a successful request
      await connector.executeRequest({
        path: '/test',
        method: 'GET',
        requiresAuth: false
      })

      const metrics = connector.getMetrics()
      expect(metrics.requestCount).toBe(1)
      expect(metrics.successCount).toBe(1)
      expect(metrics.failureCount).toBe(0)
    })
  })

  describe('resetCircuitBreaker', () => {
    it('should reset circuit breaker state', () => {
      connector.resetCircuitBreaker()
      
      const metrics = connector.getMetrics()
      expect(metrics.circuitBreakerState.state).toBe('closed')
      expect(metrics.circuitBreakerState.failureCount).toBe(0)
    })
  })

  describe('authentication', () => {
    it('should include API key in headers when provided', async () => {
      const credentialsWithApiKey = {
        ...mockCredentials,
        apiKey: 'test-api-key',
        accessToken: undefined
      }

      const connector = new ExternalAPIConnector(mockConfig, credentialsWithApiKey)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      })

      await connector.executeRequest({
        path: '/test',
        method: 'GET',
        requiresAuth: true
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key'
          })
        })
      )
    })

    it('should prefer access token over API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      })

      await connector.executeRequest({
        path: '/test',
        method: 'GET',
        requiresAuth: true
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token'
          })
        })
      )
    })
  })

  describe('error handling', () => {
    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })

      const result = await connector.executeRequest({
        path: '/invalid-json',
        method: 'GET',
        requiresAuth: false
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await connector.executeRequest({
        path: '/network-error',
        method: 'GET',
        requiresAuth: false
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })
  })

  describe('request data handling', () => {
    it('should send POST data correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ created: true })
      })

      const postData = { name: 'Test Wedding', date: '2024-06-15' }

      await connector.executeRequest(
        {
          path: '/weddings',
          method: 'POST',
          requiresAuth: true
        },
        postData
      )

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/weddings',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
    })

    it('should handle GET requests without body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      })

      await connector.executeRequest({
        path: '/weddings',
        method: 'GET',
        requiresAuth: false
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/weddings',
        expect.objectContaining({
          method: 'GET'
        })
      )

      // Should not include body in GET request
      const call = mockFetch.mock.calls[0]
      expect(call[1]).not.toHaveProperty('body')
    })
  })
})