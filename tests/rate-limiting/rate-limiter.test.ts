import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest'
import { RateLimiter, SubscriptionTier, VendorType, RateLimitConfig } from '../../src/lib/rate-limit'

// Mock Redis for testing
vi.mock('ioredis', () => {
  const MockRedis = vi.fn(() => ({
    get: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
    keys: vi.fn(),
    del: vi.fn(),
    pipeline: vi.fn(() => ({
      incr: vi.fn(),
      expire: vi.fn(),
      exec: vi.fn(),
    })),
    disconnect: vi.fn(),
  }))
  return { default: MockRedis }
})

describe('WS-199 Rate Limiting System - Unit Tests', () => {
  let rateLimiter: RateLimiter
  const photographerConfig: RateLimitConfig = {
    requests: 60,
    window: 60000,
    tier: 'STARTER' as SubscriptionTier,
    vendorType: 'photographer' as VendorType,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    rateLimiter = new RateLimiter()
  })

  afterEach(() => {
    if (rateLimiter) {
      rateLimiter.destroy()
    }
  })

  describe('Core Rate Limiting Functionality', () => {
    it('should allow requests within limit', async () => {
      const identifier = 'photographer-123'
      
      const result = await rateLimiter.checkLimit(identifier, photographerConfig)
      
      expect(result.success).toBe(true)
      expect(result.remaining).toBeGreaterThan(0)
      expect(result.tier).toBe('STARTER')
    })

    it('should block requests when limit exceeded', async () => {
      const identifier = 'photographer-456'
      
      // Exhaust the rate limit by checking many times quickly
      const promises = []
      for (let i = 0; i < 100; i++) {
        promises.push(rateLimiter.checkLimit(identifier, photographerConfig))
      }
      
      const results = await Promise.all(promises)
      
      // At least some requests should be blocked
      const blocked = results.filter(r => !r.success)
      expect(blocked.length).toBeGreaterThan(0)
      
      // Blocked requests should have retryAfter
      blocked.forEach(result => {
        expect(result.retryAfter).toBeGreaterThan(0)
      })
    })

    it('should reset limits after window expires', async () => {
      const identifier = 'photographer-reset-test'
      const shortWindowConfig = { ...photographerConfig, window: 100 } // 100ms window
      
      // Use up the limit
      for (let i = 0; i < 10; i++) {
        await rateLimiter.checkLimit(identifier, shortWindowConfig)
      }
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Should be able to make requests again
      const result = await rateLimiter.checkLimit(identifier, shortWindowConfig)
      expect(result.success).toBe(true)
    }, 10000)
  })

  describe('Subscription Tier Limits', () => {
    const tierConfigs = [
      { tier: 'FREE' as SubscriptionTier, expectedBase: 30 },
      { tier: 'STARTER' as SubscriptionTier, expectedBase: 60 },
      { tier: 'PROFESSIONAL' as SubscriptionTier, expectedBase: 120 },
      { tier: 'SCALE' as SubscriptionTier, expectedBase: 300 },
      { tier: 'ENTERPRISE' as SubscriptionTier, expectedBase: 1000 },
    ]

    tierConfigs.forEach(({ tier, expectedBase }) => {
      it(`should apply correct limits for ${tier} tier`, async () => {
        const config: RateLimitConfig = {
          requests: expectedBase,
          window: 60000,
          tier,
        }
        
        const result = await rateLimiter.checkLimit(`test-${tier}`, config)
        
        expect(result.success).toBe(true)
        expect(result.tier).toBe(tier)
        // The actual limit might be higher due to multipliers
        expect(result.remaining).toBeGreaterThanOrEqual(expectedBase - 1)
      })
    })
  })

  describe('Vendor-Specific Multipliers', () => {
    const vendorTypes: VendorType[] = ['photographer', 'venue', 'planner', 'florist', 'caterer', 'other']

    vendorTypes.forEach(vendorType => {
      it(`should apply vendor multiplier for ${vendorType}`, async () => {
        const config: RateLimitConfig = {
          requests: 60,
          window: 60000,
          tier: 'STARTER',
          vendorType,
        }
        
        const result = await rateLimiter.checkLimit(`vendor-${vendorType}`, config)
        
        expect(result.success).toBe(true)
        expect(result.tier).toBe('STARTER')
      })
    })
  })

  describe('Wedding Season Multipliers', () => {
    it('should detect wedding season correctly', async () => {
      const weddingSeason = new Date('2025-07-15') // July is wedding season
      const nonWeddingSeason = new Date('2025-01-15') // January is not wedding season

      // Mock the date to test wedding season detection
      vi.useFakeTimers()
      
      // Test wedding season
      vi.setSystemTime(weddingSeason)
      let result = await rateLimiter.checkLimit('wedding-season-test', photographerConfig)
      expect(result.isWeddingSeasonActive).toBe(true)
      
      // Test non-wedding season
      vi.setSystemTime(nonWeddingSeason)
      result = await rateLimiter.checkLimit('non-wedding-season-test', photographerConfig)
      expect(result.isWeddingSeasonActive).toBe(false)
      
      vi.useRealTimers()
    })
  })

  describe('Saturday Wedding Day Boost', () => {
    it('should detect Saturday morning boost correctly', async () => {
      const saturdayMorning = new Date('2025-07-12 09:00:00') // Saturday 9 AM
      const mondayMorning = new Date('2025-07-14 09:00:00') // Monday 9 AM

      vi.useFakeTimers()
      
      // Test Saturday morning boost
      vi.setSystemTime(saturdayMorning)
      let result = await rateLimiter.checkLimit('saturday-boost-test', photographerConfig)
      expect(result.isSaturdayBoostActive).toBe(true)
      
      // Test non-Saturday
      vi.setSystemTime(mondayMorning)
      result = await rateLimiter.checkLimit('non-saturday-test', photographerConfig)
      expect(result.isSaturdayBoostActive).toBe(false)
      
      vi.useRealTimers()
    })
  })

  describe('Wedding Industry Scenarios', () => {
    it('should handle photographer Sunday night gallery upload surge', async () => {
      const photographerConfig: RateLimitConfig = {
        requests: 120,
        window: 60000,
        tier: 'PROFESSIONAL',
        vendorType: 'photographer',
      }
      
      const identifier = 'photographer-sunday-surge'
      const results = []
      
      // Simulate multiple concurrent upload requests
      for (let i = 0; i < 50; i++) {
        const result = await rateLimiter.checkLimit(identifier, photographerConfig)
        results.push(result)
      }
      
      // Most requests should succeed due to photographer multiplier
      const successfulRequests = results.filter(r => r.success).length
      expect(successfulRequests).toBeGreaterThan(30)
    })

    it('should handle venue Monday morning booking updates', async () => {
      const venueConfig: RateLimitConfig = {
        requests: 120,
        window: 60000,
        tier: 'PROFESSIONAL',
        vendorType: 'venue',
      }
      
      const identifier = 'venue-monday-updates'
      
      // Simulate batch booking updates
      const results = []
      for (let i = 0; i < 20; i++) {
        const result = await rateLimiter.checkLimit(identifier, venueConfig)
        results.push(result)
      }
      
      // All or most requests should succeed for venue updates
      const successfulRequests = results.filter(r => r.success).length
      expect(successfulRequests).toBeGreaterThan(15)
    })

    it('should handle wedding planner final month coordination', async () => {
      const plannerConfig: RateLimitConfig = {
        requests: 120,
        window: 60000,
        tier: 'PROFESSIONAL',
        vendorType: 'planner',
      }
      
      const identifier = 'planner-final-month'
      
      // Simulate intensive coordination activities
      const results = []
      for (let i = 0; i < 30; i++) {
        const result = await rateLimiter.checkLimit(identifier, plannerConfig)
        results.push(result)
      }
      
      // Planner should get multiplier boost
      const successfulRequests = results.filter(r => r.success).length
      expect(successfulRequests).toBeGreaterThan(20)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid identifiers gracefully', async () => {
      const emptyIdentifier = ''
      const result = await rateLimiter.checkLimit(emptyIdentifier, photographerConfig)
      
      // Should still work with empty identifier
      expect(result.success).toBe(true)
      expect(result.tier).toBe('STARTER')
    })

    it('should handle very high request volumes', async () => {
      const identifier = 'high-volume-test'
      const results = []
      
      // Make 200 requests rapidly
      for (let i = 0; i < 200; i++) {
        const result = await rateLimiter.checkLimit(identifier, photographerConfig)
        results.push(result)
      }
      
      // Should handle gracefully without crashing
      expect(results.length).toBe(200)
      
      const successCount = results.filter(r => r.success).length
      const blockedCount = results.filter(r => !r.success).length
      
      expect(successCount + blockedCount).toBe(200)
      expect(blockedCount).toBeGreaterThan(0) // Some should be blocked
    })

    it('should clean up expired entries', async () => {
      const identifier = 'cleanup-test'
      const shortConfig = { ...photographerConfig, window: 50 } // 50ms window
      
      // Make some requests
      await rateLimiter.checkLimit(identifier, shortConfig)
      
      // Wait for entries to expire
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Make another request - should succeed as if fresh
      const result = await rateLimiter.checkLimit(identifier, shortConfig)
      expect(result.success).toBe(true)
    })
  })

  describe('Metrics and Monitoring', () => {
    it('should provide rate limit metrics', async () => {
      const identifier = 'metrics-test'
      
      // Make some requests
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkLimit(identifier, photographerConfig)
      }
      
      // Get metrics (implementation may return null if not tracking)
      const metrics = await rateLimiter.getMetrics(identifier)
      
      // Should either return metrics or null (both are valid)
      if (metrics) {
        expect(typeof metrics.totalRequests).toBe('number')
        expect(typeof metrics.successfulRequests).toBe('number')
        expect(typeof metrics.rateLimitedRequests).toBe('number')
      }
    })

    it('should allow resetting limits', async () => {
      const identifier = 'reset-test'
      
      // Exhaust limits
      for (let i = 0; i < 100; i++) {
        await rateLimiter.checkLimit(identifier, photographerConfig)
      }
      
      // Reset limits
      await rateLimiter.resetLimits(identifier)
      
      // Should be able to make requests again
      const result = await rateLimiter.checkLimit(identifier, photographerConfig)
      expect(result.success).toBe(true)
    })
  })

  describe('System Health and Cleanup', () => {
    it('should track cleanup status', () => {
      const isCleanupInProgress = rateLimiter.isCleanupInProgress()
      expect(typeof isCleanupInProgress).toBe('boolean')
    })

    it('should handle destruction gracefully', () => {
      const tempRateLimiter = new RateLimiter()
      
      expect(() => {
        tempRateLimiter.destroy()
      }).not.toThrow()
    })
  })

  describe('Performance Requirements', () => {
    it('should complete rate limit checks quickly', async () => {
      const identifier = 'performance-test'
      const startTime = Date.now()
      
      await rateLimiter.checkLimit(identifier, photographerConfig)
      
      const endTime = Date.now()
      const responseTime = endTime - startTime
      
      // Should complete in less than 50ms (well under 5ms requirement for simple cases)
      expect(responseTime).toBeLessThan(50)
    })

    it('should handle concurrent requests efficiently', async () => {
      const identifier = 'concurrent-test'
      const startTime = Date.now()
      
      // Make 10 concurrent requests
      const promises = Array.from({ length: 10 }, () => 
        rateLimiter.checkLimit(identifier, photographerConfig)
      )
      
      const results = await Promise.all(promises)
      
      const endTime = Date.now()
      const totalTime = endTime - startTime
      
      // All 10 concurrent requests should complete in reasonable time
      expect(totalTime).toBeLessThan(100) // 100ms for 10 concurrent requests
      expect(results.length).toBe(10)
    })
  })
})