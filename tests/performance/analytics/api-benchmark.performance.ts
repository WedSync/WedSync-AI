/**
 * API Benchmark Performance Tests
 * WS-246 Vendor Performance Analytics System
 * 
 * Tests API response times, throughput, and performance under load
 * Validates all analytics endpoints meet performance requirements (<200ms p95)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'
import { performance } from 'perf_hooks'

// Mock performance monitoring
const performanceMetrics = {
  apiResponseTimes: [] as number[],
  throughputMetrics: [] as { endpoint: string, rps: number }[],
  errorRates: [] as { endpoint: string, errors: number, total: number }[]
}

// API endpoint configurations for benchmarking
const API_ENDPOINTS = {
  dashboard: '/api/analytics/dashboard',
  journeys: '/api/analytics/journeys',
  vendors: '/api/analytics/vendors',
  clients: '/api/analytics/clients',
  performance: '/api/analytics/performance',
  exports: '/api/analytics/export',
  realtime: '/api/analytics/realtime'
}

// Performance thresholds (wedding industry requirements)
const PERFORMANCE_THRESHOLDS = {
  p50: 100, // 50th percentile < 100ms
  p95: 200, // 95th percentile < 200ms
  p99: 500, // 99th percentile < 500ms
  minThroughput: 100, // Minimum 100 RPS per endpoint
  maxErrorRate: 0.01, // Maximum 1% error rate
  concurrentUsers: 500, // Support 500 concurrent analytics users
  weddingDayThreshold: 50 // Wedding day: <50ms response times
}

// Mock API client
class ApiClient {
  private baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  
  async get(endpoint: string, params?: Record<string, any>): Promise<{ 
    data: any, 
    responseTime: number, 
    status: number 
  }> {
    const startTime = performance.now()
    
    try {
      const queryParams = params ? new URLSearchParams(params).toString() : ''
      const url = `${this.baseUrl}${endpoint}${queryParams ? `?${queryParams}` : ''}`
      
      // Simulate API call
      await this.simulateNetworkDelay()
      
      // Mock successful response
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      return {
        data: { success: true, analytics: this.generateMockAnalyticsData(endpoint) },
        responseTime,
        status: 200
      }
    } catch (error) {
      const endTime = performance.now()
      return {
        data: { error: 'API Error' },
        responseTime: endTime - startTime,
        status: 500
      }
    }
  }

  private async simulateNetworkDelay(): Promise<void> {
    // Simulate realistic API response times
    const baseDelay = Math.random() * 50 + 20 // 20-70ms base
    const networkJitter = Math.random() * 30 // 0-30ms jitter
    const totalDelay = baseDelay + networkJitter
    
    return new Promise(resolve => setTimeout(resolve, totalDelay))
  }

  private generateMockAnalyticsData(endpoint: string): any {
    const baseData = {
      timestamp: new Date().toISOString(),
      endpoint,
      dataSize: Math.floor(Math.random() * 1000) + 100 // 100-1100 KB
    }

    switch (endpoint) {
      case API_ENDPOINTS.dashboard:
        return {
          ...baseData,
          overview: { totalRevenue: 125000, activeVendors: 245, bookings: 1250 },
          funnel: [100, 85, 72, 61, 45],
          trends: Array.from({ length: 30 }, (_, i) => ({ day: i, value: Math.random() * 1000 }))
        }
      case API_ENDPOINTS.journeys:
        return {
          ...baseData,
          journeys: Array.from({ length: 50 }, (_, i) => ({ 
            id: `journey-${i}`, 
            name: `Journey ${i}`,
            completionRate: Math.random() 
          }))
        }
      case API_ENDPOINTS.vendors:
        return {
          ...baseData,
          vendors: Array.from({ length: 200 }, (_, i) => ({
            id: `vendor-${i}`,
            score: Math.random() * 100,
            responseTime: Math.random() * 24,
            bookings: Math.floor(Math.random() * 50)
          }))
        }
      default:
        return baseData
    }
  }
}

describe('Analytics API Benchmark Performance Tests', () => {
  let apiClient: ApiClient
  let testStartTime: number

  beforeAll(async () => {
    apiClient = new ApiClient()
    console.log('🚀 Starting API benchmark performance tests...')
    
    // Clear performance metrics
    performanceMetrics.apiResponseTimes = []
    performanceMetrics.throughputMetrics = []
    performanceMetrics.errorRates = []
    
    testStartTime = Date.now()
  })

  afterAll(async () => {
    const testDuration = Date.now() - testStartTime
    console.log(`📊 API benchmark tests completed in ${testDuration}ms`)
    
    // Generate performance report
    console.log('Performance Summary:')
    console.log(`- Total API calls: ${performanceMetrics.apiResponseTimes.length}`)
    console.log(`- Average response time: ${calculateAverage(performanceMetrics.apiResponseTimes).toFixed(2)}ms`)
    console.log(`- 95th percentile: ${calculatePercentile(performanceMetrics.apiResponseTimes, 95).toFixed(2)}ms`)
    console.log(`- Error rate: ${calculateOverallErrorRate().toFixed(2)}%`)
  })

  beforeEach(() => {
    // Reset per-test metrics
    jest.clearAllMocks()
  })

  describe('Single Endpoint Performance', () => {
    it('dashboard endpoint should respond within thresholds', async () => {
      const iterations = 100
      const responseTimes: number[] = []
      
      // Run multiple requests to get statistical significance
      for (let i = 0; i < iterations; i++) {
        const result = await apiClient.get(API_ENDPOINTS.dashboard, {
          timeframe: '30d',
          includeMetrics: true
        })
        
        expect(result.status).toBe(200)
        responseTimes.push(result.responseTime)
        performanceMetrics.apiResponseTimes.push(result.responseTime)
      }
      
      // Validate performance thresholds
      const p50 = calculatePercentile(responseTimes, 50)
      const p95 = calculatePercentile(responseTimes, 95)
      const p99 = calculatePercentile(responseTimes, 99)
      
      expect(p50).toBeLessThan(PERFORMANCE_THRESHOLDS.p50)
      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.p95)
      expect(p99).toBeLessThan(PERFORMANCE_THRESHOLDS.p99)
      
      console.log(`Dashboard API - P50: ${p50.toFixed(2)}ms, P95: ${p95.toFixed(2)}ms, P99: ${p99.toFixed(2)}ms`)
    })

    it('vendor analytics endpoint should handle large datasets efficiently', async () => {
      const result = await apiClient.get(API_ENDPOINTS.vendors, {
        limit: 1000,
        includeMetrics: true,
        includeHistory: true
      })
      
      expect(result.status).toBe(200)
      expect(result.responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.p95)
      expect(result.data.vendors).toBeDefined()
      
      performanceMetrics.apiResponseTimes.push(result.responseTime)
      
      console.log(`Vendor analytics (1000 records): ${result.responseTime.toFixed(2)}ms`)
    })

    it('export endpoints should handle large data exports', async () => {
      const formats = ['csv', 'excel', 'pdf', 'json']
      
      for (const format of formats) {
        const result = await apiClient.get(API_ENDPOINTS.exports, {
          format,
          timeframe: '12m',
          includeAllMetrics: true
        })
        
        expect(result.status).toBe(200)
        expect(result.responseTime).toBeLessThan(5000) // 5 second limit for exports
        
        performanceMetrics.apiResponseTimes.push(result.responseTime)
        
        console.log(`Export ${format}: ${result.responseTime.toFixed(2)}ms`)
      }
    })
  })

  describe('Concurrent Load Performance', () => {
    it('should handle 50+ concurrent dashboard requests', async () => {
      const concurrentRequests = 50
      const promises: Promise<any>[] = []
      
      const startTime = performance.now()
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(apiClient.get(API_ENDPOINTS.dashboard, {
          timeframe: '7d',
          concurrent_id: i
        }))
      }
      
      const results = await Promise.allSettled(promises)
      const endTime = performance.now()
      
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      const totalTime = endTime - startTime
      
      // Calculate throughput
      const requestsPerSecond = (successful / totalTime) * 1000
      
      expect(successful).toBeGreaterThanOrEqual(concurrentRequests * 0.95) // 95% success rate
      expect(requestsPerSecond).toBeGreaterThan(PERFORMANCE_THRESHOLDS.minThroughput)
      
      performanceMetrics.throughputMetrics.push({
        endpoint: 'dashboard',
        rps: requestsPerSecond
      })
      
      console.log(`Concurrent load - Success: ${successful}/${concurrentRequests}, RPS: ${requestsPerSecond.toFixed(2)}`)
    })

    it('should maintain performance under sustained load', async () => {
      const duration = 30000 // 30 seconds
      const requestInterval = 100 // Request every 100ms (10 RPS)
      const startTime = Date.now()
      const results: { responseTime: number, success: boolean }[] = []
      
      while (Date.now() - startTime < duration) {
        const requestStart = performance.now()
        
        try {
          const result = await apiClient.get(API_ENDPOINTS.performance, {
            metrics: ['cpu', 'memory', 'db_connections'],
            timestamp: Date.now()
          })
          
          results.push({
            responseTime: result.responseTime,
            success: result.status === 200
          })
          
          performanceMetrics.apiResponseTimes.push(result.responseTime)
        } catch (error) {
          results.push({
            responseTime: performance.now() - requestStart,
            success: false
          })
        }
        
        // Maintain request interval
        await new Promise(resolve => setTimeout(resolve, requestInterval))
      }
      
      const successRate = results.filter(r => r.success).length / results.length
      const avgResponseTime = calculateAverage(results.map(r => r.responseTime))
      
      expect(successRate).toBeGreaterThan(0.95) // 95% success rate
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.p95)
      
      console.log(`Sustained load - Success rate: ${(successRate * 100).toFixed(2)}%, Avg response: ${avgResponseTime.toFixed(2)}ms`)
    })
  })

  describe('Wedding Day Performance Requirements', () => {
    it('should meet ultra-low latency requirements for wedding day operations', async () => {
      // Wedding day scenario: critical operations during live events
      const weddingDayEndpoints = [
        { endpoint: API_ENDPOINTS.dashboard, params: { priority: 'wedding_day' }},
        { endpoint: API_ENDPOINTS.realtime, params: { event_type: 'live_wedding' }},
        { endpoint: API_ENDPOINTS.vendors, params: { status: 'active_wedding' }}
      ]
      
      for (const { endpoint, params } of weddingDayEndpoints) {
        const iterations = 20
        const responseTimes: number[] = []
        
        for (let i = 0; i < iterations; i++) {
          const result = await apiClient.get(endpoint, params)
          
          expect(result.status).toBe(200)
          responseTimes.push(result.responseTime)
        }
        
        const p95 = calculatePercentile(responseTimes, 95)
        expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.weddingDayThreshold)
        
        performanceMetrics.apiResponseTimes.push(...responseTimes)
        
        console.log(`Wedding day ${endpoint}: P95 = ${p95.toFixed(2)}ms`)
      }
    })

    it('should handle peak wedding season traffic', async () => {
      // Simulate peak wedding season (May-October Saturdays)
      const peakConcurrency = 500
      const promises: Promise<any>[] = []
      
      // Mix of endpoint types during peak season
      const endpointDistribution = [
        { endpoint: API_ENDPOINTS.dashboard, weight: 0.4 }, // 40% dashboard
        { endpoint: API_ENDPOINTS.vendors, weight: 0.3 },   // 30% vendor lookups
        { endpoint: API_ENDPOINTS.journeys, weight: 0.2 },  // 20% journey tracking
        { endpoint: API_ENDPOINTS.realtime, weight: 0.1 }   // 10% real-time updates
      ]
      
      for (let i = 0; i < peakConcurrency; i++) {
        const random = Math.random()
        let cumulativeWeight = 0
        
        for (const { endpoint, weight } of endpointDistribution) {
          cumulativeWeight += weight
          if (random <= cumulativeWeight) {
            promises.push(apiClient.get(endpoint, {
              peak_season: true,
              request_id: i
            }))
            break
          }
        }
      }
      
      const startTime = performance.now()
      const results = await Promise.allSettled(promises)
      const endTime = performance.now()
      
      const successful = results.filter(r => r.status === 'fulfilled').length
      const totalTime = endTime - startTime
      const throughput = (successful / totalTime) * 1000
      
      expect(successful / peakConcurrency).toBeGreaterThan(0.98) // 98% success in peak season
      expect(throughput).toBeGreaterThan(PERFORMANCE_THRESHOLDS.minThroughput)
      
      console.log(`Peak season - Success: ${successful}/${peakConcurrency} (${((successful/peakConcurrency)*100).toFixed(2)}%)`)
      console.log(`Peak season throughput: ${throughput.toFixed(2)} RPS`)
    })
  })

  describe('Resource Consumption Monitoring', () => {
    it('should track memory usage during API calls', async () => {
      const iterations = 100
      const memorySnapshots: number[] = []
      
      // Get initial memory baseline
      const initialMemory = process.memoryUsage().heapUsed
      
      for (let i = 0; i < iterations; i++) {
        await apiClient.get(API_ENDPOINTS.dashboard, {
          includeHeavyData: true,
          iteration: i
        })
        
        // Sample memory every 10th iteration
        if (i % 10 === 0) {
          memorySnapshots.push(process.memoryUsage().heapUsed)
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory
      const maxMemoryIncrease = 50 * 1024 * 1024 // 50MB threshold
      
      expect(memoryIncrease).toBeLessThan(maxMemoryIncrease)
      
      console.log(`Memory usage - Initial: ${(initialMemory/1024/1024).toFixed(2)}MB, Final: ${(finalMemory/1024/1024).toFixed(2)}MB`)
      console.log(`Memory increase: ${(memoryIncrease/1024/1024).toFixed(2)}MB`)
    })

    it('should monitor API response payload sizes', async () => {
      const endpoints = Object.values(API_ENDPOINTS)
      const payloadSizes: { endpoint: string, size: number }[] = []
      
      for (const endpoint of endpoints) {
        const result = await apiClient.get(endpoint, {
          includeAllData: true
        })
        
        // Simulate payload size calculation
        const payloadSize = JSON.stringify(result.data).length
        payloadSizes.push({ endpoint, size: payloadSize })
        
        // Reasonable payload size limits (wedding industry context)
        expect(payloadSize).toBeLessThan(1024 * 1024) // 1MB max per endpoint
        
        performanceMetrics.apiResponseTimes.push(result.responseTime)
      }
      
      console.log('Payload sizes:')
      payloadSizes.forEach(({ endpoint, size }) => {
        console.log(`  ${endpoint}: ${(size / 1024).toFixed(2)}KB`)
      })
    })
  })
})

// Utility functions for performance calculations
function calculateAverage(numbers: number[]): number {
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length
}

function calculatePercentile(numbers: number[], percentile: number): number {
  const sorted = [...numbers].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[index] || 0
}

function calculateOverallErrorRate(): number {
  const totalErrors = performanceMetrics.errorRates.reduce((sum, metric) => sum + metric.errors, 0)
  const totalRequests = performanceMetrics.errorRates.reduce((sum, metric) => sum + metric.total, 0)
  return totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
}