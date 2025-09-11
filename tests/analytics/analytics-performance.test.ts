import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { performance } from 'perf_hooks'

/**
 * WS-246: Vendor Performance Analytics System - Performance Testing
 * Tests dashboard performance, load testing, and response times
 */

describe('Analytics Dashboard Performance', () => {
  let supabase: any
  let performanceMetrics: Array<{ test: string; duration: number; timestamp: Date }>

  beforeAll(async () => {
    const cookieStore = cookies()
    supabase = createClient(cookieStore)
    performanceMetrics = []
    
    // Set up test data for performance testing
    await setupPerformanceTestData()
  })

  afterAll(async () => {
    // Log performance results
    console.log('Performance Test Results:', performanceMetrics)
    
    // Cleanup test data
    await cleanupPerformanceTestData()
  })

  beforeEach(() => {
    // Clear any cached data between tests
    if (global.gc) {
      global.gc()
    }
  })

  describe('Dashboard Load Performance', () => {
    it('should load main analytics dashboard in under 2 seconds', async () => {
      const startTime = performance.now()

      // Simulate dashboard API call
      const response = await fetch('/api/analytics/dashboard?timeframe=30d', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      
      const endTime = performance.now()
      const duration = endTime - startTime

      performanceMetrics.push({
        test: 'dashboard_load',
        duration,
        timestamp: new Date()
      })

      expect(duration).toBeLessThan(2000) // 2 seconds
      expect(data).toHaveProperty('overview')
      expect(data).toHaveProperty('performance_metrics')
    })

    it('should load vendor analytics in under 1.5 seconds', async () => {
      const startTime = performance.now()

      // Test vendor-specific analytics
      const response = await fetch('/api/analytics/vendors?limit=50&sort=performance', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      
      const endTime = performance.now()
      const duration = endTime - startTime

      performanceMetrics.push({
        test: 'vendor_analytics_load',
        duration,
        timestamp: new Date()
      })

      expect(duration).toBeLessThan(1500) // 1.5 seconds
      expect(Array.isArray(data.vendors)).toBe(true)
    })

    it('should load charts data in under 800ms', async () => {
      const startTime = performance.now()

      // Test chart data endpoints
      const chartRequests = [
        '/api/analytics/charts/performance-trends',
        '/api/analytics/charts/booking-funnel',
        '/api/analytics/charts/revenue-overview',
        '/api/analytics/charts/vendor-comparison'
      ]

      const responses = await Promise.all(
        chartRequests.map(url => fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }))
      )

      const endTime = performance.now()
      const duration = endTime - startTime

      performanceMetrics.push({
        test: 'charts_load',
        duration,
        timestamp: new Date()
      })

      expect(duration).toBeLessThan(800) // 800ms for all charts
      responses.forEach(response => {
        expect(response.ok).toBe(true)
      })
    })
  })

  describe('Database Query Performance', () => {
    it('should execute vendor scoring queries in under 200ms', async () => {
      const testVendorIds = await getTestVendorIds(10)

      for (const vendorId of testVendorIds) {
        const startTime = performance.now()

        const { data, error } = await supabase.rpc('calculate_overall_vendor_score', {
          vendor_id_input: vendorId
        })

        const endTime = performance.now()
        const duration = endTime - startTime

        expect(error).toBeNull()
        expect(data).toBeDefined()
        expect(duration).toBeLessThan(200) // 200ms per vendor

        performanceMetrics.push({
          test: `vendor_scoring_${vendorId}`,
          duration,
          timestamp: new Date()
        })
      }
    })

    it('should handle batch analytics calculations efficiently', async () => {
      const startTime = performance.now()

      // Test batch processing of 100 vendors
      const { data, error } = await supabase.rpc('calculate_batch_vendor_scores', {
        batch_size: 100
      })

      const endTime = performance.now()
      const duration = endTime - startTime

      performanceMetrics.push({
        test: 'batch_scoring_100_vendors',
        duration,
        timestamp: new Date()
      })

      expect(error).toBeNull()
      expect(duration).toBeLessThan(5000) // 5 seconds for 100 vendors
      expect(data.length).toBeGreaterThan(0)
    })

    it('should efficiently query large datasets', async () => {
      const startTime = performance.now()

      // Query large analytics dataset with pagination
      const { data, error } = await supabase
        .from('vendor_analytics')
        .select(`
          *,
          suppliers(name, type),
          vendor_interactions(count),
          bookings(count)
        `)
        .range(0, 999) // 1000 records
        .order('overall_score', { ascending: false })

      const endTime = performance.now()
      const duration = endTime - startTime

      performanceMetrics.push({
        test: 'large_dataset_query',
        duration,
        timestamp: new Date()
      })

      expect(error).toBeNull()
      expect(duration).toBeLessThan(1000) // 1 second for 1000 records
      expect(data.length).toBeGreaterThan(0)
    })
  })

  describe('Concurrent User Load Testing', () => {
    it('should handle 50 concurrent dashboard requests', async () => {
      const concurrentUsers = 50
      const startTime = performance.now()

      const requests = Array.from({ length: concurrentUsers }, async (_, index) => {
        const userStartTime = performance.now()
        
        try {
          const response = await fetch(`/api/analytics/dashboard?user=${index}&timeframe=7d`)
          const data = await response.json()
          
          const userEndTime = performance.now()
          const userDuration = userEndTime - userStartTime

          return {
            success: response.ok,
            duration: userDuration,
            dataReceived: !!data.overview
          }
        } catch (error) {
          return {
            success: false,
            duration: performance.now() - userStartTime,
            error: error.message
          }
        }
      })

      const results = await Promise.all(requests)
      const endTime = performance.now()
      const totalDuration = endTime - startTime

      performanceMetrics.push({
        test: `concurrent_load_${concurrentUsers}_users`,
        duration: totalDuration,
        timestamp: new Date()
      })

      // Analyze results
      const successfulRequests = results.filter(r => r.success).length
      const averageResponseTime = results
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.duration, 0) / successfulRequests

      expect(successfulRequests).toBeGreaterThanOrEqual(concurrentUsers * 0.95) // 95% success rate
      expect(averageResponseTime).toBeLessThan(3000) // Average under 3 seconds
      expect(totalDuration).toBeLessThan(10000) // Total under 10 seconds
    })

    it('should maintain performance under database stress', async () => {
      const stressTestOperations = [
        // Read operations
        () => supabase.from('vendor_analytics').select('*').limit(100),
        () => supabase.from('vendor_interactions').select('count(*)'),
        () => supabase.from('bookings').select('sum(total_amount)'),
        
        // Complex aggregations
        () => supabase.rpc('refresh_analytics_materialized_views'),
        () => supabase.rpc('calculate_trending_vendors'),
        
        // Write operations (lighter load)
        () => supabase.from('analytics_events').insert({
          event_type: 'performance_test',
          timestamp: new Date().toISOString(),
          data: { test: 'stress_test' }
        })
      ]

      const startTime = performance.now()
      const stressPromises = []

      // Execute 200 mixed operations
      for (let i = 0; i < 200; i++) {
        const randomOperation = stressTestOperations[Math.floor(Math.random() * stressTestOperations.length)]
        stressPromises.push(randomOperation())
      }

      const results = await Promise.allSettled(stressPromises)
      const endTime = performance.now()
      const duration = endTime - startTime

      performanceMetrics.push({
        test: 'database_stress_200_ops',
        duration,
        timestamp: new Date()
      })

      const successfulOps = results.filter(r => r.status === 'fulfilled').length
      const successRate = (successfulOps / results.length) * 100

      expect(successRate).toBeGreaterThan(90) // 90% success rate under stress
      expect(duration).toBeLessThan(15000) // Complete within 15 seconds
    })
  })

  describe('Memory and Resource Usage', () => {
    it('should not create memory leaks during analytics processing', async () => {
      const initialMemory = process.memoryUsage()

      // Perform intensive analytics operations
      for (let i = 0; i < 50; i++) {
        await supabase.rpc('calculate_overall_vendor_score', {
          vendor_id_input: `test-vendor-${i % 10}`
        })

        // Simulate chart data processing
        await fetch('/api/analytics/charts/performance-trends')
        
        if (i % 10 === 0 && global.gc) {
          global.gc() // Force garbage collection if available
        }
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })

    it('should handle large result sets without excessive memory usage', async () => {
      const initialMemory = process.memoryUsage()

      // Query large dataset
      const { data } = await supabase
        .from('vendor_interactions')
        .select('*')
        .limit(5000)

      const afterQueryMemory = process.memoryUsage()
      const memoryUsed = afterQueryMemory.heapUsed - initialMemory.heapUsed

      expect(data.length).toBeGreaterThan(0)
      expect(memoryUsed).toBeLessThan(100 * 1024 * 1024) // Less than 100MB
    })
  })

  describe('Caching Performance', () => {
    it('should show significant performance improvement with caching', async () => {
      const cacheKey = 'dashboard_analytics_30d'

      // First request (cache miss)
      const firstStartTime = performance.now()
      const firstResponse = await fetch(`/api/analytics/dashboard?timeframe=30d&cache=false`)
      const firstData = await firstResponse.json()
      const firstDuration = performance.now() - firstStartTime

      // Second request (should hit cache)
      const secondStartTime = performance.now()
      const secondResponse = await fetch(`/api/analytics/dashboard?timeframe=30d`)
      const secondData = await secondResponse.json()
      const secondDuration = performance.now() - secondStartTime

      performanceMetrics.push(
        {
          test: 'cache_miss',
          duration: firstDuration,
          timestamp: new Date()
        },
        {
          test: 'cache_hit',
          duration: secondDuration,
          timestamp: new Date()
        }
      )

      expect(secondDuration).toBeLessThan(firstDuration * 0.3) // 70% faster with cache
      expect(firstData).toEqual(secondData) // Data consistency
    })

    it('should invalidate cache appropriately', async () => {
      // Get cached data
      const cachedResponse = await fetch('/api/analytics/dashboard?timeframe=7d')
      const cachedData = await cachedResponse.json()

      // Trigger cache invalidation by updating data
      await supabase.from('vendor_interactions').insert({
        vendor_id: 'cache-test-vendor',
        client_id: 'cache-test-client',
        type: 'inquiry',
        created_at: new Date().toISOString()
      })

      // Request fresh data
      const freshResponse = await fetch('/api/analytics/dashboard?timeframe=7d&cache=false')
      const freshData = await freshResponse.json()

      // Data should be different (updated)
      expect(freshData.overview.last_updated).not.toEqual(cachedData.overview.last_updated)
    })
  })

  describe('Real-time Performance', () => {
    it('should handle real-time updates efficiently', async (done) => {
      const updateTimes: number[] = []
      let updatesReceived = 0
      const expectedUpdates = 5

      // Subscribe to real-time analytics updates
      const channel = supabase
        .channel('performance-test-realtime')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'vendor_analytics'
          },
          (payload: any) => {
            const updateTime = Date.now()
            updateTimes.push(updateTime)
            updatesReceived++

            if (updatesReceived === expectedUpdates) {
              // Calculate update latency
              const avgLatency = updateTimes.reduce((sum, time, index) => {
                if (index === 0) return 0
                return sum + (time - updateTimes[index - 1])
              }, 0) / (expectedUpdates - 1)

              performanceMetrics.push({
                test: 'realtime_update_latency',
                duration: avgLatency,
                timestamp: new Date()
              })

              expect(avgLatency).toBeLessThan(1000) // Updates within 1 second
              supabase.removeChannel(channel)
              done()
            }
          }
        )
        .subscribe()

      // Trigger updates
      for (let i = 0; i < expectedUpdates; i++) {
        setTimeout(async () => {
          await supabase
            .from('vendor_analytics')
            .update({ 
              last_calculated: new Date().toISOString(),
              calculation_version: i + 1
            })
            .eq('vendor_id', 'realtime-test-vendor')
        }, i * 200) // Stagger updates every 200ms
      }

      // Timeout after 10 seconds
      setTimeout(() => {
        supabase.removeChannel(channel)
        if (updatesReceived < expectedUpdates) {
          done(new Error(`Only received ${updatesReceived}/${expectedUpdates} updates`))
        }
      }, 10000)
    })
  })

  describe('Mobile Performance Optimization', () => {
    it('should deliver lightweight mobile dashboard', async () => {
      const startTime = performance.now()

      const response = await fetch('/api/analytics/dashboard/mobile?timeframe=7d', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
        }
      })

      const data = await response.json()
      const endTime = performance.now()
      const duration = endTime - startTime

      // Check response size
      const responseSize = JSON.stringify(data).length

      performanceMetrics.push({
        test: 'mobile_dashboard',
        duration,
        timestamp: new Date()
      })

      expect(duration).toBeLessThan(1500) // 1.5 seconds on mobile
      expect(responseSize).toBeLessThan(50 * 1024) // Less than 50KB response
      expect(data).toHaveProperty('mobile_optimized', true)
    })
  })

  // Helper functions
  async function setupPerformanceTestData() {
    // Create test vendors for performance testing
    const vendors = Array.from({ length: 100 }, (_, i) => ({
      name: `Performance Test Vendor ${i}`,
      email: `perf-vendor-${i}@test.com`,
      type: i % 2 === 0 ? 'photographer' : 'venue',
      tier: ['FREE', 'STARTER', 'PROFESSIONAL'][i % 3],
      status: 'active'
    }))

    await supabase.from('suppliers').insert(vendors)

    // Create test interactions and bookings
    const { data: createdVendors } = await supabase
      .from('suppliers')
      .select('id')
      .like('email', 'perf-vendor-%@test.com')

    const interactions = []
    const bookings = []

    for (const vendor of createdVendors.slice(0, 50)) {
      // Create 10 interactions per vendor
      for (let i = 0; i < 10; i++) {
        interactions.push({
          vendor_id: vendor.id,
          client_id: 'perf-test-client',
          type: 'inquiry_response',
          response_time_hours: Math.random() * 24,
          created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        })
      }

      // Create 3 bookings per vendor
      for (let i = 0; i < 3; i++) {
        bookings.push({
          vendor_id: vendor.id,
          client_id: 'perf-test-client',
          status: 'confirmed',
          booking_date: '2025-07-15',
          total_amount: Math.random() * 3000 + 500
        })
      }
    }

    await supabase.from('vendor_interactions').insert(interactions)
    await supabase.from('bookings').insert(bookings)
  }

  async function cleanupPerformanceTestData() {
    // Clean up test data
    await supabase.from('vendor_interactions').delete().like('client_id', 'perf-test-%')
    await supabase.from('bookings').delete().like('client_id', 'perf-test-%')
    await supabase.from('suppliers').delete().like('email', 'perf-vendor-%@test.com')
    await supabase.from('analytics_events').delete().eq('event_type', 'performance_test')
  }

  async function getTestVendorIds(limit: number): Promise<string[]> {
    const { data } = await supabase
      .from('suppliers')
      .select('id')
      .like('email', 'perf-vendor-%@test.com')
      .limit(limit)

    return data.map(v => v.id)
  }
})