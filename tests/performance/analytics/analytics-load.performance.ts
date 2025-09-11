import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'
import { performance } from 'perf_hooks'
import { Worker } from 'worker_threads'
import * as path from 'path'

/**
 * WS-246: Vendor Performance Analytics System - Load Testing
 * Tests concurrent user load, stress testing, and system capacity limits
 */

interface LoadTestResult {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  requestsPerSecond: number
  errorRate: number
  memoryUsage: NodeJS.MemoryUsage
}

interface LoadTestConfig {
  baseUrl: string
  concurrentUsers: number
  requestsPerUser: number
  duration: number // in milliseconds
  rampUpTime: number // in milliseconds
  endpoint: string
  requestType: 'GET' | 'POST'
  payload?: any
}

describe('Analytics Load Testing', () => {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000'
  let loadTestResults: LoadTestResult[] = []

  beforeAll(async () => {
    console.log('🚀 Starting Analytics Load Testing Suite')
    console.log(`Base URL: ${baseUrl}`)
    
    // Warm up the server
    await warmupServer()
  })

  afterAll(async () => {
    console.log('📊 Load Testing Summary:')
    loadTestResults.forEach((result, index) => {
      console.log(`Test ${index + 1}:`)
      console.log(`  - Total Requests: ${result.totalRequests}`)
      console.log(`  - Success Rate: ${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%`)
      console.log(`  - Average Response Time: ${result.averageResponseTime.toFixed(2)}ms`)
      console.log(`  - Requests/Second: ${result.requestsPerSecond.toFixed(2)}`)
    })
  })

  beforeEach(() => {
    // Clear memory before each test
    if (global.gc) {
      global.gc()
    }
  })

  describe('Dashboard Load Testing', () => {
    it('should handle 50 concurrent users accessing dashboard', async () => {
      const config: LoadTestConfig = {
        baseUrl,
        concurrentUsers: 50,
        requestsPerUser: 10,
        duration: 30000, // 30 seconds
        rampUpTime: 5000, // 5 seconds ramp up
        endpoint: '/api/analytics/dashboard',
        requestType: 'GET'
      }

      const result = await runLoadTest(config)
      loadTestResults.push(result)

      // Performance assertions
      expect(result.successfulRequests).toBeGreaterThan(result.totalRequests * 0.95) // 95% success rate
      expect(result.averageResponseTime).toBeLessThan(2000) // Average under 2 seconds
      expect(result.maxResponseTime).toBeLessThan(5000) // Max under 5 seconds
      expect(result.requestsPerSecond).toBeGreaterThan(10) // At least 10 RPS
      expect(result.errorRate).toBeLessThan(0.05) // Less than 5% error rate

      console.log(`✅ Dashboard Load Test: ${result.successfulRequests}/${result.totalRequests} requests succeeded`)
    }, 60000)

    it('should handle 100 concurrent users with sustained load', async () => {
      const config: LoadTestConfig = {
        baseUrl,
        concurrentUsers: 100,
        requestsPerUser: 20,
        duration: 60000, // 60 seconds
        rampUpTime: 10000, // 10 seconds ramp up
        endpoint: '/api/analytics/dashboard',
        requestType: 'GET'
      }

      const result = await runLoadTest(config)
      loadTestResults.push(result)

      // Stress test assertions (more lenient)
      expect(result.successfulRequests).toBeGreaterThan(result.totalRequests * 0.90) // 90% success rate
      expect(result.averageResponseTime).toBeLessThan(3000) // Average under 3 seconds
      expect(result.requestsPerSecond).toBeGreaterThan(15) // At least 15 RPS under load

      console.log(`✅ Sustained Load Test: ${result.requestsPerSecond.toFixed(2)} RPS sustained`)
    }, 120000)
  })

  describe('Vendor Analytics Load Testing', () => {
    it('should handle concurrent vendor data requests', async () => {
      const config: LoadTestConfig = {
        baseUrl,
        concurrentUsers: 30,
        requestsPerUser: 15,
        duration: 20000,
        rampUpTime: 3000,
        endpoint: '/api/analytics/vendors',
        requestType: 'GET'
      }

      const result = await runLoadTest(config)
      loadTestResults.push(result)

      expect(result.averageResponseTime).toBeLessThan(1500)
      expect(result.errorRate).toBeLessThan(0.03)
      expect(result.requestsPerSecond).toBeGreaterThan(12)

      console.log(`✅ Vendor Analytics Load: ${result.averageResponseTime.toFixed(2)}ms average response`)
    }, 45000)

    it('should handle vendor search queries under load', async () => {
      const searchTerms = ['photography', 'venue', 'catering', 'florist', 'music']
      
      const config: LoadTestConfig = {
        baseUrl,
        concurrentUsers: 25,
        requestsPerUser: 8,
        duration: 15000,
        rampUpTime: 2000,
        endpoint: '/api/analytics/vendors?search=',
        requestType: 'GET'
      }

      // Test with different search terms
      for (const term of searchTerms) {
        config.endpoint = `/api/analytics/vendors?search=${term}`
        const result = await runLoadTest(config)
        
        expect(result.averageResponseTime).toBeLessThan(1000)
        expect(result.errorRate).toBeLessThan(0.05)
        
        console.log(`✅ Search "${term}": ${result.averageResponseTime.toFixed(2)}ms avg`)
      }
    }, 90000)
  })

  describe('Chart Data Load Testing', () => {
    it('should handle concurrent chart data requests', async () => {
      const chartTypes = ['performance-trends', 'booking-funnel', 'revenue-overview', 'vendor-comparison']
      
      for (const chartType of chartTypes) {
        const config: LoadTestConfig = {
          baseUrl,
          concurrentUsers: 20,
          requestsPerUser: 5,
          duration: 10000,
          rampUpTime: 1000,
          endpoint: `/api/analytics/charts/${chartType}`,
          requestType: 'GET'
        }

        const result = await runLoadTest(config)
        
        expect(result.averageResponseTime).toBeLessThan(800)
        expect(result.errorRate).toBeLessThan(0.02)
        
        console.log(`✅ Chart ${chartType}: ${result.requestsPerSecond.toFixed(2)} RPS`)
      }
    }, 60000)
  })

  describe('Export Functionality Load Testing', () => {
    it('should handle concurrent export requests', async () => {
      const config: LoadTestConfig = {
        baseUrl,
        concurrentUsers: 10, // Lower concurrency for resource-intensive exports
        requestsPerUser: 3,
        duration: 15000,
        rampUpTime: 2000,
        endpoint: '/api/analytics/export',
        requestType: 'POST',
        payload: {
          format: 'csv',
          data_type: 'dashboard',
          timeframe: '30d'
        }
      }

      const result = await runLoadTest(config)
      loadTestResults.push(result)

      // Export requests take longer but should still succeed
      expect(result.averageResponseTime).toBeLessThan(10000) // 10 seconds max
      expect(result.errorRate).toBeLessThan(0.1) // 10% error rate acceptable for exports
      expect(result.successfulRequests).toBeGreaterThan(result.totalRequests * 0.8) // 80% success

      console.log(`✅ Export Load: ${result.successfulRequests} successful exports`)
    }, 45000)
  })

  describe('Database Connection Pool Testing', () => {
    it('should handle database connection limits under load', async () => {
      // Test with many small, quick requests to stress connection pool
      const config: LoadTestConfig = {
        baseUrl,
        concurrentUsers: 200, // High concurrency to test connection limits
        requestsPerUser: 5,
        duration: 20000,
        rampUpTime: 2000,
        endpoint: '/api/analytics/vendors?limit=1', // Quick queries
        requestType: 'GET'
      }

      const result = await runLoadTest(config)
      loadTestResults.push(result)

      // Should handle connection pool pressure gracefully
      expect(result.errorRate).toBeLessThan(0.15) // 15% error rate acceptable under extreme load
      expect(result.averageResponseTime).toBeLessThan(5000) // Should not time out

      console.log(`✅ Connection Pool Test: ${result.errorRate.toFixed(3)} error rate under extreme load`)
    }, 60000)
  })

  describe('Memory Pressure Testing', () => {
    it('should maintain performance under memory pressure', async () => {
      const initialMemory = process.memoryUsage()
      
      // Run sustained load to build up memory pressure
      const config: LoadTestConfig = {
        baseUrl,
        concurrentUsers: 75,
        requestsPerUser: 30,
        duration: 45000,
        rampUpTime: 5000,
        endpoint: '/api/analytics/dashboard?timeframe=all', // Large dataset
        requestType: 'GET'
      }

      const result = await runLoadTest(config)
      const finalMemory = process.memoryUsage()
      
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100

      // Memory assertions
      expect(memoryIncreasePercent).toBeLessThan(200) // Less than 200% memory increase
      expect(result.averageResponseTime).toBeLessThan(4000) // Performance shouldn't degrade too much
      
      console.log(`✅ Memory Pressure: ${memoryIncreasePercent.toFixed(1)}% memory increase`)
    }, 90000)
  })

  describe('Peak Hour Simulation', () => {
    it('should handle peak wedding season load', async () => {
      // Simulate peak wedding season: June Saturday afternoon
      const peakConfig: LoadTestConfig = {
        baseUrl,
        concurrentUsers: 150,
        requestsPerUser: 25,
        duration: 120000, // 2 minutes
        rampUpTime: 15000, // 15 seconds ramp up
        endpoint: '/api/analytics/dashboard',
        requestType: 'GET'
      }

      const result = await runLoadTest(peakConfig)
      loadTestResults.push(result)

      // Peak hour requirements
      expect(result.successfulRequests).toBeGreaterThan(result.totalRequests * 0.85) // 85% success
      expect(result.averageResponseTime).toBeLessThan(6000) // 6 seconds max average
      expect(result.requestsPerSecond).toBeGreaterThan(8) // Maintain 8+ RPS

      console.log(`✅ Peak Season Test: ${result.successfulRequests} requests handled successfully`)
    }, 180000)
  })

  // Helper functions
  async function warmupServer(): Promise<void> {
    console.log('🔥 Warming up server...')
    
    const warmupRequests = [
      fetch(`${baseUrl}/api/analytics/dashboard`),
      fetch(`${baseUrl}/api/analytics/vendors`),
      fetch(`${baseUrl}/api/analytics/charts/performance-trends`)
    ]

    await Promise.allSettled(warmupRequests)
    await new Promise(resolve => setTimeout(resolve, 2000))
    console.log('✅ Server warmed up')
  }

  async function runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    console.log(`🔄 Running load test: ${config.concurrentUsers} users × ${config.requestsPerUser} requests`)
    
    const startTime = performance.now()
    const responses: number[] = []
    const errors: any[] = []
    const startMemory = process.memoryUsage()

    // Create worker pool for concurrent requests
    const workers: Promise<any>[] = []
    const usersPerBatch = Math.ceil(config.concurrentUsers / 10) // Batch users to avoid overwhelming
    
    for (let batch = 0; batch < 10; batch++) {
      const batchStart = batch * usersPerBatch
      const batchEnd = Math.min((batch + 1) * usersPerBatch, config.concurrentUsers)
      const batchUsers = batchEnd - batchStart
      
      if (batchUsers > 0) {
        const workerPromise = runUserBatch(batchUsers, config, batch * (config.rampUpTime / 10))
        workers.push(workerPromise)
      }
    }

    // Wait for all batches to complete
    const batchResults = await Promise.allSettled(workers)
    
    // Aggregate results
    let totalRequests = 0
    let successfulRequests = 0
    let totalResponseTime = 0
    let minResponseTime = Infinity
    let maxResponseTime = 0

    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        const batchData = result.value
        totalRequests += batchData.totalRequests
        successfulRequests += batchData.successfulRequests
        totalResponseTime += batchData.totalResponseTime
        minResponseTime = Math.min(minResponseTime, batchData.minResponseTime)
        maxResponseTime = Math.max(maxResponseTime, batchData.maxResponseTime)
        errors.push(...batchData.errors)
      }
    })

    const endTime = performance.now()
    const duration = endTime - startTime
    const endMemory = process.memoryUsage()

    const result: LoadTestResult = {
      totalRequests,
      successfulRequests,
      failedRequests: totalRequests - successfulRequests,
      averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      minResponseTime: minResponseTime === Infinity ? 0 : minResponseTime,
      maxResponseTime,
      requestsPerSecond: totalRequests / (duration / 1000),
      errorRate: totalRequests > 0 ? (totalRequests - successfulRequests) / totalRequests : 0,
      memoryUsage: {
        rss: endMemory.rss - startMemory.rss,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        external: endMemory.external - startMemory.external,
        arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
      }
    }

    console.log(`✅ Load test completed: ${successfulRequests}/${totalRequests} successful (${(result.errorRate * 100).toFixed(2)}% error rate)`)
    
    return result
  }

  async function runUserBatch(userCount: number, config: LoadTestConfig, delay: number = 0): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, delay))
    
    const userPromises = []
    for (let user = 0; user < userCount; user++) {
      userPromises.push(simulateUser(config))
    }

    const userResults = await Promise.allSettled(userPromises)
    
    // Aggregate batch results
    let batchTotalRequests = 0
    let batchSuccessfulRequests = 0
    let batchTotalResponseTime = 0
    let batchMinResponseTime = Infinity
    let batchMaxResponseTime = 0
    const batchErrors: any[] = []

    userResults.forEach(result => {
      if (result.status === 'fulfilled') {
        const userData = result.value
        batchTotalRequests += userData.totalRequests
        batchSuccessfulRequests += userData.successfulRequests
        batchTotalResponseTime += userData.totalResponseTime
        batchMinResponseTime = Math.min(batchMinResponseTime, userData.minResponseTime)
        batchMaxResponseTime = Math.max(batchMaxResponseTime, userData.maxResponseTime)
        batchErrors.push(...userData.errors)
      }
    })

    return {
      totalRequests: batchTotalRequests,
      successfulRequests: batchSuccessfulRequests,
      totalResponseTime: batchTotalResponseTime,
      minResponseTime: batchMinResponseTime === Infinity ? 0 : batchMinResponseTime,
      maxResponseTime: batchMaxResponseTime,
      errors: batchErrors
    }
  }

  async function simulateUser(config: LoadTestConfig): Promise<any> {
    const userResults = {
      totalRequests: 0,
      successfulRequests: 0,
      totalResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      errors: []
    }

    const requestInterval = config.duration / config.requestsPerUser
    
    for (let req = 0; req < config.requestsPerUser; req++) {
      const requestStart = performance.now()
      
      try {
        const requestOptions: RequestInit = {
          method: config.requestType,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'LoadTest-Agent'
          }
        }

        if (config.requestType === 'POST' && config.payload) {
          requestOptions.body = JSON.stringify(config.payload)
        }

        const response = await fetch(`${config.baseUrl}${config.endpoint}`, requestOptions)
        const requestEnd = performance.now()
        const responseTime = requestEnd - requestStart

        userResults.totalRequests++
        userResults.totalResponseTime += responseTime
        userResults.minResponseTime = Math.min(userResults.minResponseTime, responseTime)
        userResults.maxResponseTime = Math.max(userResults.maxResponseTime, responseTime)

        if (response.ok) {
          userResults.successfulRequests++
        } else {
          userResults.errors.push({
            status: response.status,
            statusText: response.statusText,
            responseTime
          })
        }

      } catch (error) {
        const requestEnd = performance.now()
        const responseTime = requestEnd - requestStart
        
        userResults.totalRequests++
        userResults.totalResponseTime += responseTime
        userResults.errors.push({
          error: error.message,
          responseTime
        })
      }

      // Wait between requests (distributed load)
      if (req < config.requestsPerUser - 1) {
        await new Promise(resolve => setTimeout(resolve, requestInterval + Math.random() * 500))
      }
    }

    return userResults
  }
})