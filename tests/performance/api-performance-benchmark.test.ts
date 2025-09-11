/**
 * API Performance Benchmark Tests - WS-173
 * Team B - Round 1 Implementation
 * Validates <200ms response time requirements for critical endpoints
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/testing-library/jest-dom'
import { performance } from 'perf_hooks'
import { createClient } from '@/lib/supabase/client'

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  CRITICAL: 100,    // Critical user-facing endpoints
  STANDARD: 200,    // Standard API endpoints  
  ANALYTICS: 500,   // Analytics and reporting endpoints
  BULK: 1000       // Bulk operations
} as const

// Test data for consistent benchmarking
const TEST_DATA = {
  validClientId: '00000000-0000-0000-0000-000000000001',
  validBudgetId: '00000000-0000-0000-0000-000000000002',
  validTaskId: '00000000-0000-0000-0000-000000000003',
  sampleDateRange: {
    start: '2025-01-01T00:00:00Z',
    end: '2025-12-31T23:59:59Z'
  }
}

// Helper function to measure API response time
async function measureAPICall(
  endpoint: string, 
  init?: RequestInit,
  expectedStatus: number = 200
): Promise<{ responseTime: number; status: number; data?: any }> {
  const startTime = performance.now()
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api${endpoint}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        ...init?.headers
      }
    })
    
    const endTime = performance.now()
    const responseTime = endTime - startTime
    
    let data
    try {
      data = await response.json()
    } catch {
      data = null
    }
    
    return {
      responseTime,
      status: response.status,
      data
    }
  } catch (error) {
    const endTime = performance.now()
    return {
      responseTime: endTime - startTime,
      status: 500,
      data: { error: error.message }
    }
  }
}

// Run multiple samples and get statistics
async function benchmarkEndpoint(
  endpoint: string,
  samples: number = 10,
  init?: RequestInit
): Promise<{
  avg: number
  min: number
  max: number
  p95: number
  p99: number
  successRate: number
  results: Array<{ responseTime: number; status: number }>
}> {
  const results = []
  let successCount = 0
  
  for (let i = 0; i < samples; i++) {
    const result = await measureAPICall(endpoint, init)
    results.push(result)
    
    if (result.status >= 200 && result.status < 300) {
      successCount++
    }
    
    // Small delay between requests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  const responseTimes = results.map(r => r.responseTime).sort((a, b) => a - b)
  const avg = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
  const min = responseTimes[0]
  const max = responseTimes[responseTimes.length - 1]
  const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)]
  const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)]
  const successRate = (successCount / samples) * 100
  
  return {
    avg,
    min,
    max,
    p95,
    p99,
    successRate,
    results
  }
}

describe('API Performance Benchmarks', () => {
  beforeAll(async () => {
    // Ensure test environment is ready
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      throw new Error('NEXT_PUBLIC_APP_URL environment variable is required for performance tests')
    }
  })

  describe('Critical User-Facing Endpoints (<100ms)', () => {
    test('GET /api/clients/{id} - Client details', async () => {
      const endpoint = `/clients/${TEST_DATA.validClientId}`
      const benchmark = await benchmarkEndpoint(endpoint, 20)
      
      console.log(`Client Details API Performance:
        Average: ${benchmark.avg.toFixed(1)}ms
        P95: ${benchmark.p95.toFixed(1)}ms
        Success Rate: ${benchmark.successRate}%`)
      
      expect(benchmark.avg).toBeLessThan(PERFORMANCE_THRESHOLDS.CRITICAL)
      expect(benchmark.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.CRITICAL * 1.5)
      expect(benchmark.successRate).toBeGreaterThan(95)
    })

    test('GET /api/notifications - User notifications', async () => {
      const endpoint = '/notifications?limit=10'
      const benchmark = await benchmarkEndpoint(endpoint, 20)
      
      console.log(`Notifications API Performance:
        Average: ${benchmark.avg.toFixed(1)}ms
        P95: ${benchmark.p95.toFixed(1)}ms
        Success Rate: ${benchmark.successRate}%`)
      
      expect(benchmark.avg).toBeLessThan(PERFORMANCE_THRESHOLDS.CRITICAL)
      expect(benchmark.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.CRITICAL * 1.5)
      expect(benchmark.successRate).toBeGreaterThan(95)
    })

    test('POST /api/tasks - Create task', async () => {
      const endpoint = '/tasks'
      const taskData = {
        title: 'Performance Test Task',
        description: 'Automated performance test',
        due_date: '2025-12-31T23:59:59Z',
        priority: 'medium'
      }
      
      const benchmark = await benchmarkEndpoint(endpoint, 15, {
        method: 'POST',
        body: JSON.stringify(taskData)
      })
      
      console.log(`Create Task API Performance:
        Average: ${benchmark.avg.toFixed(1)}ms
        P95: ${benchmark.p95.toFixed(1)}ms
        Success Rate: ${benchmark.successRate}%`)
      
      expect(benchmark.avg).toBeLessThan(PERFORMANCE_THRESHOLDS.CRITICAL)
      expect(benchmark.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.CRITICAL * 1.5)
      expect(benchmark.successRate).toBeGreaterThan(90) // Slightly lower for write operations
    })
  })

  describe('Standard API Endpoints (<200ms)', () => {
    test('GET /api/budget/items - Budget items list', async () => {
      const endpoint = '/budget/items?limit=50'
      const benchmark = await benchmarkEndpoint(endpoint, 20)
      
      console.log(`Budget Items API Performance:
        Average: ${benchmark.avg.toFixed(1)}ms
        P95: ${benchmark.p95.toFixed(1)}ms
        Success Rate: ${benchmark.successRate}%`)
      
      expect(benchmark.avg).toBeLessThan(PERFORMANCE_THRESHOLDS.STANDARD)
      expect(benchmark.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.STANDARD * 1.2)
      expect(benchmark.successRate).toBeGreaterThan(95)
    })

    test('GET /api/vendors - Vendors list', async () => {
      const endpoint = '/vendors?limit=20&status=active'
      const benchmark = await benchmarkEndpoint(endpoint, 20)
      
      console.log(`Vendors API Performance:
        Average: ${benchmark.avg.toFixed(1)}ms
        P95: ${benchmark.p95.toFixed(1)}ms
        Success Rate: ${benchmark.successRate}%`)
      
      expect(benchmark.avg).toBeLessThan(PERFORMANCE_THRESHOLDS.STANDARD)
      expect(benchmark.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.STANDARD * 1.2)
      expect(benchmark.successRate).toBeGreaterThan(95)
    })

    test('PUT /api/budget/items/{id} - Update budget item', async () => {
      const endpoint = `/budget/items/${TEST_DATA.validBudgetId}`
      const updateData = {
        planned_amount: 1500,
        notes: 'Updated via performance test'
      }
      
      const benchmark = await benchmarkEndpoint(endpoint, 10, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
      
      console.log(`Update Budget Item API Performance:
        Average: ${benchmark.avg.toFixed(1)}ms
        P95: ${benchmark.p95.toFixed(1)}ms
        Success Rate: ${benchmark.successRate}%`)
      
      expect(benchmark.avg).toBeLessThan(PERFORMANCE_THRESHOLDS.STANDARD)
      expect(benchmark.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.STANDARD * 1.2)
      expect(benchmark.successRate).toBeGreaterThan(90)
    })
  })

  describe('Analytics Endpoints (<500ms)', () => {
    test('GET /api/analytics/dashboard - Dashboard metrics', async () => {
      const endpoint = `/analytics/dashboard?timeRange=30d`
      const benchmark = await benchmarkEndpoint(endpoint, 10)
      
      console.log(`Dashboard Analytics Performance:
        Average: ${benchmark.avg.toFixed(1)}ms
        P95: ${benchmark.p95.toFixed(1)}ms
        Success Rate: ${benchmark.successRate}%`)
      
      expect(benchmark.avg).toBeLessThan(PERFORMANCE_THRESHOLDS.ANALYTICS)
      expect(benchmark.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.ANALYTICS * 1.2)
      expect(benchmark.successRate).toBeGreaterThan(90)
    })

    test('GET /api/analytics/reports/budget - Budget analytics', async () => {
      const endpoint = `/analytics/reports/budget?period=quarterly`
      const benchmark = await benchmarkEndpoint(endpoint, 10)
      
      console.log(`Budget Analytics Performance:
        Average: ${benchmark.avg.toFixed(1)}ms
        P95: ${benchmark.p95.toFixed(1)}ms
        Success Rate: ${benchmark.successRate}%`)
      
      expect(benchmark.avg).toBeLessThan(PERFORMANCE_THRESHOLDS.ANALYTICS)
      expect(benchmark.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.ANALYTICS * 1.2)
      expect(benchmark.successRate).toBeGreaterThan(90)
    })
  })

  describe('Performance Monitoring Endpoints', () => {
    test('GET /api/performance/health - Health check', async () => {
      const endpoint = '/performance/health'
      const benchmark = await benchmarkEndpoint(endpoint, 15)
      
      console.log(`Health Check Performance:
        Average: ${benchmark.avg.toFixed(1)}ms
        P95: ${benchmark.p95.toFixed(1)}ms
        Success Rate: ${benchmark.successRate}%`)
      
      // Health checks should be very fast
      expect(benchmark.avg).toBeLessThan(50)
      expect(benchmark.p95).toBeLessThan(100)
      expect(benchmark.successRate).toBeGreaterThan(98)
    })

    test('GET /api/performance/metrics - Performance metrics', async () => {
      const endpoint = '/performance/metrics?timeRange=1h'
      const benchmark = await benchmarkEndpoint(endpoint, 5) // Fewer samples for admin endpoints
      
      console.log(`Performance Metrics API:
        Average: ${benchmark.avg.toFixed(1)}ms
        P95: ${benchmark.p95.toFixed(1)}ms
        Success Rate: ${benchmark.successRate}%`)
      
      expect(benchmark.avg).toBeLessThan(PERFORMANCE_THRESHOLDS.STANDARD)
      expect(benchmark.successRate).toBeGreaterThan(80) // Admin endpoints may have auth failures
    })
  })

  describe('Cache Performance Validation', () => {
    test('Cache hit performance vs cache miss', async () => {
      const endpoint = '/clients?limit=10'
      
      // First call (likely cache miss)
      const coldResult = await measureAPICall(endpoint)
      
      // Wait a moment then call again (should be cached)
      await new Promise(resolve => setTimeout(resolve, 100))
      const warmResult = await measureAPICall(endpoint)
      
      console.log(`Cache Performance:
        Cold (miss): ${coldResult.responseTime.toFixed(1)}ms
        Warm (hit): ${warmResult.responseTime.toFixed(1)}ms
        Cache improvement: ${((coldResult.responseTime - warmResult.responseTime) / coldResult.responseTime * 100).toFixed(1)}%`)
      
      // Warm requests should be significantly faster
      expect(warmResult.responseTime).toBeLessThan(coldResult.responseTime * 0.8)
      expect(warmResult.responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CRITICAL)
    })
  })

  describe('Load Test Scenarios', () => {
    test('Concurrent requests handling', async () => {
      const endpoint = '/clients?limit=5'
      const concurrentRequests = 20
      
      const startTime = performance.now()
      const promises = Array(concurrentRequests).fill(null).map(() => 
        measureAPICall(endpoint)
      )
      
      const results = await Promise.all(promises)
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      const successfulRequests = results.filter(r => r.status >= 200 && r.status < 300).length
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
      const successRate = (successfulRequests / concurrentRequests) * 100
      
      console.log(`Concurrent Load Test (${concurrentRequests} requests):
        Total Time: ${totalTime.toFixed(1)}ms
        Average Response Time: ${avgResponseTime.toFixed(1)}ms
        Success Rate: ${successRate}%
        Throughput: ${(concurrentRequests / totalTime * 1000).toFixed(1)} req/sec`)
      
      expect(successRate).toBeGreaterThan(90)
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.STANDARD * 1.5)
    })
  })
})

// Performance test runner that can be used independently
export class APIBenchmarkRunner {
  private baseURL: string

  constructor(baseURL: string = process.env.NEXT_PUBLIC_APP_URL || '') {
    this.baseURL = baseURL
  }

  async runComprehensiveBenchmark(): Promise<{
    summary: {
      totalEndpoints: number
      averageResponseTime: number
      overallSuccessRate: number
      failedThresholds: string[]
    }
    details: Array<{
      endpoint: string
      category: string
      performance: any
      passed: boolean
    }>
  }> {
    const endpoints = [
      { path: '/clients?limit=10', category: 'critical', threshold: PERFORMANCE_THRESHOLDS.CRITICAL },
      { path: '/notifications?limit=10', category: 'critical', threshold: PERFORMANCE_THRESHOLDS.CRITICAL },
      { path: '/budget/items?limit=20', category: 'standard', threshold: PERFORMANCE_THRESHOLDS.STANDARD },
      { path: '/vendors?status=active', category: 'standard', threshold: PERFORMANCE_THRESHOLDS.STANDARD },
      { path: '/analytics/dashboard?timeRange=7d', category: 'analytics', threshold: PERFORMANCE_THRESHOLDS.ANALYTICS },
      { path: '/performance/health', category: 'monitoring', threshold: 50 }
    ]

    const results = []
    let totalResponseTime = 0
    let totalSuccessRate = 0
    const failedThresholds = []

    for (const endpoint of endpoints) {
      const benchmark = await benchmarkEndpoint(endpoint.path, 10)
      const passed = benchmark.avg < endpoint.threshold && benchmark.successRate > 90
      
      if (!passed) {
        failedThresholds.push(`${endpoint.path} (${benchmark.avg.toFixed(1)}ms > ${endpoint.threshold}ms)`)
      }

      results.push({
        endpoint: endpoint.path,
        category: endpoint.category,
        performance: benchmark,
        passed
      })

      totalResponseTime += benchmark.avg
      totalSuccessRate += benchmark.successRate
    }

    return {
      summary: {
        totalEndpoints: endpoints.length,
        averageResponseTime: totalResponseTime / endpoints.length,
        overallSuccessRate: totalSuccessRate / endpoints.length,
        failedThresholds
      },
      details: results
    }
  }
}