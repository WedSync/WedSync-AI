/**
 * WS-336 Calendar Integration System - Performance Tests
 * Wedding day load testing and performance benchmarks
 * 
 * WEDDING CONTEXT: Performance tests simulate peak Saturday wedding load
 * Tests ensure 99.9% reliability during wedding season when failure means disaster
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals'
import { performance } from 'perf_hooks'
import { CalendarSyncEngine } from '@/services/calendar/CalendarSyncEngine'
import { supabase } from '@/lib/supabase'

// Performance thresholds for wedding day requirements
const PERFORMANCE_THRESHOLDS = {
  // API Response Times (Wedding day tolerance)
  singleEventSync: 2000,      // 2s max for single event sync
  batchEventSync: 5000,       // 5s max for batch sync (up to 20 events)
  webhookProcessing: 100,     // 100ms max for webhook processing
  tokenRefresh: 1000,         // 1s max for token refresh
  
  // Throughput Requirements
  concurrentSyncs: 100,       // Support 100 concurrent sync operations
  eventsPerMinute: 1000,      // Process 1000 events per minute
  webhooksPerMinute: 500,     // Handle 500 webhooks per minute
  
  // Memory and Resource Limits
  memoryLeakThreshold: 100 * 1024 * 1024, // 100MB max memory increase
  cpuUtilization: 80,         // 80% max CPU usage
  
  // Wedding Day Peak Load Scenarios
  saturdayMorningPeak: 500,   // 500 vendors syncing simultaneously at 9 AM
  ceremonyRushPeak: 1000,     // 1000 timeline updates during ceremony hours
  receptionPeak: 800          // 800 photo/event updates during reception
}

describe('Calendar Integration Performance Tests', () => {
  let syncEngine: CalendarSyncEngine
  let testVendors: string[] = []
  let testWeddings: string[] = []

  beforeAll(async () => {
    syncEngine = new CalendarSyncEngine()
    await setupPerformanceTestData()
  })

  afterAll(async () => {
    await cleanupPerformanceTestData()
  })

  beforeEach(() => {
    // Reset performance monitoring
    if (global.gc) {
      global.gc() // Force garbage collection if available
    }
  })

  describe('Wedding Day Peak Load Simulation', () => {
    it('should handle Saturday morning peak (500 concurrent vendors)', async () => {
      // Arrange - Simulate 9 AM Saturday rush when vendors start their day
      const saturdayMorningEvents = Array(500).fill(null).map((_, index) => ({
        vendorId: `saturday-vendor-${index}`,
        weddingId: `saturday-wedding-${index}`,
        events: generateWeddingDayTimeline('09:00', `Vendor ${index} Wedding`)
      }))

      const startTime = performance.now()
      const initialMemory = process.memoryUsage()

      // Act - Process all Saturday morning syncs concurrently
      const syncPromises = saturdayMorningEvents.map(async (vendorData) => {
        return syncEngine.syncWeddingTimeline(vendorData.weddingId, {
          provider: 'google',
          events: vendorData.events,
          priority: 'wedding_day_high'
        })
      })

      const results = await Promise.allSettled(syncPromises)
      const endTime = performance.now()
      const finalMemory = process.memoryUsage()

      // Assert - All syncs should succeed within acceptable time
      const syncDuration = endTime - startTime
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      const successfulSyncs = results.filter(r => r.status === 'fulfilled').length
      const failedSyncs = results.filter(r => r.status === 'rejected').length

      expect(syncDuration).toBeLessThan(30000) // 30 second max for peak load
      expect(successfulSyncs).toBeGreaterThan(475) // 95% success rate minimum
      expect(failedSyncs).toBeLessThan(25) // Max 5% failure rate
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryLeakThreshold)

      console.log(`Saturday Morning Peak Results:
        - Duration: ${syncDuration.toFixed(2)}ms
        - Successful: ${successfulSyncs}/500 (${(successfulSyncs/500*100).toFixed(1)}%)
        - Failed: ${failedSyncs}/500
        - Memory increase: ${(memoryIncrease/1024/1024).toFixed(2)}MB
      `)
    })

    it('should handle ceremony rush hour (1000 timeline updates)', async () => {
      // Arrange - Simulate 2 PM ceremony hour when all vendors update timelines
      const ceremonyUpdates = Array(1000).fill(null).map((_, index) => ({
        updateId: `ceremony-update-${index}`,
        eventType: 'timeline_change',
        change: {
          eventId: `ceremony-event-${index % 100}`, // 100 different events being updated
          oldTime: '2024-06-15T14:00:00Z',
          newTime: '2024-06-15T14:15:00Z', // 15 minute delay
          reason: 'Bride running late'
        }
      }))

      const startTime = performance.now()

      // Act - Process ceremony rush updates
      const updatePromises = ceremonyUpdates.map(async (update) => {
        return syncEngine.processTimelineUpdate(update.change, {
          priority: 'ceremony_critical',
          propagateToAllProviders: true,
          notifyAllVendors: true
        })
      })

      const results = await Promise.allSettled(updatePromises)
      const endTime = performance.now()

      // Assert - Critical timeline updates must propagate quickly
      const updateDuration = endTime - startTime
      const successfulUpdates = results.filter(r => r.status === 'fulfilled').length

      expect(updateDuration).toBeLessThan(45000) // 45 second max for ceremony updates
      expect(successfulUpdates).toBeGreaterThan(950) // 95% success rate minimum

      // Verify propagation speed
      const avgUpdateTime = updateDuration / 1000
      expect(avgUpdateTime).toBeLessThan(45) // Average 45ms per update

      console.log(`Ceremony Rush Results:
        - Duration: ${updateDuration.toFixed(2)}ms
        - Updates processed: ${successfulUpdates}/1000
        - Average per update: ${avgUpdateTime.toFixed(2)}ms
      `)
    })

    it('should handle reception photo upload peak (800 concurrent uploads)', async () => {
      // Arrange - Simulate 8 PM reception when photographers upload photos
      const receptionUploads = Array(800).fill(null).map((_, index) => ({
        uploadId: `reception-photo-${index}`,
        photographer: `photographer-${index % 50}`, // 50 photographers
        photoData: {
          weddingId: `wedding-${index % 100}`,
          eventMoment: 'first_dance',
          timestamp: '2024-06-15T20:00:00Z',
          photoCount: Math.floor(Math.random() * 20) + 5 // 5-25 photos per batch
        }
      }))

      const startTime = performance.now()

      // Act - Process reception uploads with calendar timeline sync
      const uploadPromises = receptionUploads.map(async (upload) => {
        return syncEngine.syncPhotoUploadToTimeline(upload.photoData, {
          updateCalendarEvent: true,
          createTimelineMarker: true,
          notifyCouple: true
        })
      })

      const results = await Promise.allSettled(uploadPromises)
      const endTime = performance.now()

      // Assert - Photo uploads should not overwhelm calendar sync
      const uploadDuration = endTime - startTime
      const successfulUploads = results.filter(r => r.status === 'fulfilled').length

      expect(uploadDuration).toBeLessThan(60000) // 1 minute max for reception uploads
      expect(successfulUploads).toBeGreaterThan(760) // 95% success rate

      console.log(`Reception Upload Peak Results:
        - Duration: ${uploadDuration.toFixed(2)}ms
        - Successful uploads: ${successfulUploads}/800
        - Average per upload: ${(uploadDuration/800).toFixed(2)}ms
      `)
    })
  })

  describe('Individual Operation Performance', () => {
    it('should sync single wedding event within performance threshold', async () => {
      // Arrange
      const weddingEvent = {
        id: 'perf-test-single-event',
        title: 'Johnson Wedding - Ceremony Photography',
        startTime: '2024-06-15T14:00:00Z',
        endTime: '2024-06-15T15:00:00Z',
        location: 'Grand Ballroom',
        type: 'wedding_ceremony'
      }

      // Act
      const startTime = performance.now()
      const result = await syncEngine.syncSingleEvent('google', weddingEvent, {
        priority: 'normal',
        retryOnFailure: true
      })
      const endTime = performance.now()

      // Assert
      const syncDuration = endTime - startTime
      expect(result.success).toBe(true)
      expect(syncDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.singleEventSync)

      console.log(`Single event sync: ${syncDuration.toFixed(2)}ms`)
    })

    it('should process batch event sync within performance threshold', async () => {
      // Arrange - Full wedding day timeline (20 events)
      const weddingTimeline = generateWeddingDayTimeline('08:00', 'Performance Test Wedding')

      // Act
      const startTime = performance.now()
      const result = await syncEngine.syncEventBatch('google', weddingTimeline, {
        batchSize: 20,
        priority: 'wedding_day_high'
      })
      const endTime = performance.now()

      // Assert
      const batchSyncDuration = endTime - startTime
      expect(result.successful).toBe(weddingTimeline.length)
      expect(result.failed).toBe(0)
      expect(batchSyncDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.batchEventSync)

      console.log(`Batch sync (${weddingTimeline.length} events): ${batchSyncDuration.toFixed(2)}ms`)
    })

    it('should process webhooks within performance threshold', async () => {
      // Arrange
      const webhookPayload = {
        provider: 'google',
        eventId: 'perf-test-webhook',
        changeType: 'updated',
        timestamp: new Date().toISOString()
      }

      // Act
      const startTime = performance.now()
      const result = await syncEngine.processWebhook(webhookPayload, {
        validateSignature: true,
        propagateChanges: true
      })
      const endTime = performance.now()

      // Assert
      const webhookDuration = endTime - startTime
      expect(result.processed).toBe(true)
      expect(webhookDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.webhookProcessing)

      console.log(`Webhook processing: ${webhookDuration.toFixed(2)}ms`)
    })

    it('should refresh OAuth tokens within performance threshold', async () => {
      // Arrange
      const expiredToken = {
        accessToken: 'expired_token',
        refreshToken: 'valid_refresh_token',
        expiresAt: Date.now() - 3600000 // 1 hour ago
      }

      // Act
      const startTime = performance.now()
      const result = await syncEngine.refreshToken('google', expiredToken)
      const endTime = performance.now()

      // Assert
      const refreshDuration = endTime - startTime
      expect(result.success).toBe(true)
      expect(result.newAccessToken).toBeTruthy()
      expect(refreshDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.tokenRefresh)

      console.log(`Token refresh: ${refreshDuration.toFixed(2)}ms`)
    })
  })

  describe('Stress Testing and Resource Management', () => {
    it('should handle sustained high throughput without memory leaks', async () => {
      // Arrange - 10 minute sustained load test
      const testDurationMs = 10 * 60 * 1000 // 10 minutes
      const eventsPerSecond = 10
      const totalEvents = (testDurationMs / 1000) * eventsPerSecond

      const initialMemory = process.memoryUsage()
      const startTime = performance.now()

      // Act - Generate sustained load
      const eventPromises: Promise<any>[] = []
      const eventInterval = setInterval(() => {
        if (performance.now() - startTime >= testDurationMs) {
          clearInterval(eventInterval)
          return
        }

        // Generate batch of events
        for (let i = 0; i < eventsPerSecond; i++) {
          const event = {
            id: `sustained-load-${Date.now()}-${i}`,
            title: `Sustained Load Event ${i}`,
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString()
          }
          
          eventPromises.push(
            syncEngine.syncSingleEvent('google', event, { priority: 'normal' })
          )
        }
      }, 1000)

      // Wait for test completion
      await new Promise(resolve => {
        setTimeout(resolve, testDurationMs)
      })

      // Wait for all events to complete
      const results = await Promise.allSettled(eventPromises)
      const endTime = performance.now()
      const finalMemory = process.memoryUsage()

      // Assert
      const actualDuration = endTime - startTime
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      const successfulEvents = results.filter(r => r.status === 'fulfilled').length
      const throughput = (successfulEvents / actualDuration) * 1000 // events per second

      expect(successfulEvents).toBeGreaterThan(totalEvents * 0.95) // 95% success rate
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryLeakThreshold)
      expect(throughput).toBeGreaterThan(8) // At least 8 events per second sustained

      console.log(`Sustained Load Test Results:
        - Duration: ${(actualDuration/1000).toFixed(1)}s
        - Events processed: ${successfulEvents}/${eventPromises.length}
        - Throughput: ${throughput.toFixed(2)} events/sec
        - Memory increase: ${(memoryIncrease/1024/1024).toFixed(2)}MB
      `)
    })

    it('should handle concurrent database operations without deadlocks', async () => {
      // Arrange - Multiple vendors updating same wedding timeline concurrently
      const sharedWeddingId = 'concurrent-test-wedding'
      const vendorUpdates = Array(20).fill(null).map((_, index) => ({
        vendorId: `concurrent-vendor-${index}`,
        update: {
          eventId: `shared-event-${index % 5}`, // 5 events, 4 vendors each
          newTime: `2024-06-15T${14 + index}:00:00Z`,
          vendorNotes: `Update from vendor ${index}`
        }
      }))

      // Act
      const startTime = performance.now()
      const updatePromises = vendorUpdates.map(async (vendorUpdate) => {
        return syncEngine.updateSharedTimeline(sharedWeddingId, vendorUpdate.vendorId, vendorUpdate.update, {
          lockTimeout: 5000,
          retryOnDeadlock: true
        })
      })

      const results = await Promise.allSettled(updatePromises)
      const endTime = performance.now()

      // Assert
      const concurrentDuration = endTime - startTime
      const successfulUpdates = results.filter(r => r.status === 'fulfilled').length

      expect(successfulUpdates).toBeGreaterThan(18) // At least 90% should succeed
      expect(concurrentDuration).toBeLessThan(15000) // 15 second max for conflict resolution
      
      // Verify no data corruption
      const finalTimeline = await syncEngine.getWeddingTimeline(sharedWeddingId)
      expect(finalTimeline.events).toHaveLength(5) // Should still have 5 events
      expect(finalTimeline.lastUpdated).toBeTruthy()

      console.log(`Concurrent Updates Results:
        - Duration: ${concurrentDuration.toFixed(2)}ms
        - Successful updates: ${successfulUpdates}/20
        - Data integrity: ${finalTimeline.events.length === 5 ? 'PASS' : 'FAIL'}
      `)
    })
  })

  describe('Network Performance and Resilience', () => {
    it('should handle API rate limiting gracefully', async () => {
      // Arrange - Rapidly send requests to trigger rate limiting
      const rapidRequests = Array(50).fill(null).map((_, index) => ({
        id: `rate-limit-test-${index}`,
        title: `Rate Limited Event ${index}`
      }))

      // Act
      const startTime = performance.now()
      const results = await Promise.allSettled(
        rapidRequests.map(event => 
          syncEngine.syncSingleEvent('google', event, { 
            respectRateLimit: true,
            maxRetries: 3
          })
        )
      )
      const endTime = performance.now()

      // Assert
      const rateLimitDuration = endTime - startTime
      const successfulRequests = results.filter(r => r.status === 'fulfilled').length
      const rateLimitedRequests = results.filter(r => 
        r.status === 'rejected' && 
        r.reason?.message?.includes('rate limit')
      ).length

      // Should handle rate limiting without complete failure
      expect(successfulRequests).toBeGreaterThan(30) // At least 60% should succeed
      expect(rateLimitedRequests).toBeGreaterThan(0) // Some should be rate limited
      expect(rateLimitDuration).toBeLessThan(60000) // 1 minute max with retries

      console.log(`Rate Limiting Test Results:
        - Duration: ${rateLimitDuration.toFixed(2)}ms
        - Successful: ${successfulRequests}/50
        - Rate limited: ${rateLimitedRequests}/50
      `)
    })

    it('should recover from network timeouts and API failures', async () => {
      // Arrange - Simulate intermittent network issues
      const unreliableRequests = Array(20).fill(null).map((_, index) => ({
        id: `unreliable-test-${index}`,
        title: `Unreliable Event ${index}`,
        simulateFailure: index % 3 === 0 // Every 3rd request fails initially
      }))

      // Act
      const startTime = performance.now()
      const results = await Promise.allSettled(
        unreliableRequests.map(event => 
          syncEngine.syncSingleEvent('google', event, {
            maxRetries: 5,
            retryDelay: 1000,
            exponentialBackoff: true
          })
        )
      )
      const endTime = performance.now()

      // Assert
      const recoveryDuration = endTime - startTime
      const successfulAfterRetry = results.filter(r => r.status === 'fulfilled').length

      // Most should succeed after retries
      expect(successfulAfterRetry).toBeGreaterThan(18) // 90% success after retries
      expect(recoveryDuration).toBeLessThan(30000) // 30 second max with retries

      console.log(`Network Recovery Test Results:
        - Duration: ${recoveryDuration.toFixed(2)}ms
        - Recovered: ${successfulAfterRetry}/20
        - Recovery rate: ${(successfulAfterRetry/20*100).toFixed(1)}%
      `)
    })
  })

  // Helper functions
  async function setupPerformanceTestData() {
    // Create test vendors for performance testing
    const vendorPromises = Array(100).fill(null).map(async (_, index) => {
      const vendorId = `perf-test-vendor-${index}`
      testVendors.push(vendorId)
      
      return supabase.from('user_profiles').upsert({
        id: vendorId,
        email: `perf-test-${index}@wedsync.com`,
        business_name: `Performance Test Vendor ${index}`,
        user_type: 'vendor',
        subscription_tier: 'professional'
      })
    })

    await Promise.all(vendorPromises)

    // Create test weddings
    const weddingPromises = Array(200).fill(null).map(async (_, index) => {
      const weddingId = `perf-test-wedding-${index}`
      testWeddings.push(weddingId)
      
      return supabase.from('weddings').upsert({
        id: weddingId,
        vendor_id: testVendors[index % testVendors.length],
        couple_names: `Performance Test Couple ${index}`,
        wedding_date: '2024-06-15',
        venue_name: `Performance Test Venue ${index}`,
        status: 'confirmed'
      })
    })

    await Promise.all(weddingPromises)
  }

  async function cleanupPerformanceTestData() {
    // Clean up test data
    if (testWeddings.length > 0) {
      await supabase.from('weddings').delete().in('id', testWeddings)
    }
    if (testVendors.length > 0) {
      await supabase.from('user_profiles').delete().in('id', testVendors)
    }
  }

  function generateWeddingDayTimeline(startTime: string, weddingName: string) {
    const baseEvents = [
      { name: 'Getting Ready Photos', duration: 120, type: 'photography' },
      { name: 'First Look', duration: 30, type: 'photography' },
      { name: 'Bridal Party Photos', duration: 60, type: 'photography' },
      { name: 'Ceremony Setup', duration: 30, type: 'setup' },
      { name: 'Guest Arrival', duration: 30, type: 'coordination' },
      { name: 'Wedding Ceremony', duration: 60, type: 'ceremony' },
      { name: 'Cocktail Hour', duration: 60, type: 'reception' },
      { name: 'Family Photos', duration: 45, type: 'photography' },
      { name: 'Reception Entrance', duration: 15, type: 'reception' },
      { name: 'First Dance', duration: 10, type: 'reception' },
      { name: 'Dinner Service', duration: 90, type: 'catering' },
      { name: 'Speeches', duration: 30, type: 'reception' },
      { name: 'Cake Cutting', duration: 15, type: 'reception' },
      { name: 'Dancing', duration: 180, type: 'reception' },
      { name: 'Bouquet Toss', duration: 10, type: 'reception' },
      { name: 'Send Off', duration: 15, type: 'coordination' }
    ]

    let currentTime = new Date(`2024-06-15T${startTime}:00Z`)
    
    return baseEvents.map((event, index) => {
      const eventStart = new Date(currentTime)
      currentTime = new Date(currentTime.getTime() + event.duration * 60000)
      
      return {
        id: `${weddingName.toLowerCase().replace(/\s+/g, '-')}-${event.name.toLowerCase().replace(/\s+/g, '-')}`,
        title: `${weddingName} - ${event.name}`,
        startTime: eventStart.toISOString(),
        endTime: currentTime.toISOString(),
        duration: event.duration,
        type: event.type,
        location: 'Wedding Venue'
      }
    })
  }
})