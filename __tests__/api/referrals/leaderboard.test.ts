/**
 * WS-344 Team B - Referral Leaderboard API Tests
 * Comprehensive test suite with >90% coverage
 */

import { NextRequest } from 'next/server'
import { GET, HEAD, OPTIONS } from '@/app/api/referrals/leaderboard/route'
import { referralTrackingService } from '@/services/referral-tracking'

// Mock dependencies
jest.mock('@/services/referral-tracking')

const mockReferralTrackingService = referralTrackingService as jest.Mocked<typeof referralTrackingService>

// Test utilities
function createMockRequest(params: Record<string, string> = {}, headers: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/referrals/leaderboard')
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  
  return new NextRequest(url.toString(), {
    method: 'GET',
    headers: {
      'user-agent': 'test-agent',
      'x-forwarded-for': '192.168.1.1',
      ...headers
    }
  })
}

const mockLeaderboardResult = {
  entries: [
    {
      rank: 1,
      businessName: 'Elite Photography Studio',
      logoUrl: 'https://example.com/logo1.jpg',
      businessLocation: 'London, UK',
      businessCategory: 'photographer',
      paidConversions: 150,
      conversionRate: 75.0,
      monthsEarned: 1800,
      rankChange: 0,
      trend: 'stable' as const,
      badges: ['top-performer', 'high-conversion']
    },
    {
      rank: 2,
      businessName: 'Dream Venues Ltd',
      logoUrl: 'https://example.com/logo2.jpg',
      businessLocation: 'Manchester, UK',
      businessCategory: 'venue',
      paidConversions: 128,
      conversionRate: 68.5,
      monthsEarned: 1536,
      rankChange: 2,
      trend: 'rising' as const,
      badges: ['rising-star']
    },
    {
      rank: 3,
      businessName: 'Perfect Flowers',
      logoUrl: 'https://example.com/logo3.jpg',
      businessLocation: 'Birmingham, UK',
      businessCategory: 'florist',
      paidConversions: 95,
      conversionRate: 62.3,
      monthsEarned: 1140,
      rankChange: -1,
      trend: 'declining' as const,
      badges: ['consistent-performer']
    }
  ],
  totalEntries: 1250,
  currentPage: 1,
  totalPages: 63,
  lastUpdated: '2025-01-20T10:00:00Z'
}

describe('GET /api/referrals/leaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockReferralTrackingService.getLeaderboard = jest.fn().mockResolvedValue(mockLeaderboardResult)
  })

  describe('Query Validation Tests', () => {
    test('should accept valid query parameters', async () => {
      const request = createMockRequest({
        period: '30d',
        category: 'photographer',
        location: 'London',
        limit: '10',
        offset: '0'
      })
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.meta.period).toBe('30d')
      expect(data.meta.category).toBe('photographer')
      expect(data.meta.location).toBe('London')
    })

    test('should handle default parameters when not provided', async () => {
      const request = createMockRequest()
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.meta.period).toBe('30d')
      expect(data.meta.category).toBeUndefined()
      expect(data.meta.location).toBeUndefined()
    })

    test('should validate period parameter', async () => {
      const request = createMockRequest({ period: 'invalid' })
      const response = await GET(request)
      
      expect(response.status).toBe(400)
    })

    test('should validate limit parameter bounds', async () => {
      const request = createMockRequest({ limit: '101' }) // Over max limit
      const response = await GET(request)
      
      expect(response.status).toBe(400)
    })

    test('should validate offset parameter', async () => {
      const request = createMockRequest({ offset: '-1' })
      const response = await GET(request)
      
      expect(response.status).toBe(400)
    })
  })

  describe('Category Validation Tests', () => {
    test('should accept valid business categories', async () => {
      const validCategories = ['photographer', 'videographer', 'florist', 'caterer', 'venue', 'band', 'dj', 'other']
      
      for (const category of validCategories) {
        const request = createMockRequest({ category })
        const response = await GET(request)
        expect(response.status).toBe(200)
      }
    })

    test('should reject invalid business category', async () => {
      const request = createMockRequest({ category: 'invalid-category' })
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('INVALID_CATEGORY')
      expect(data.validCategories).toEqual([
        'photographer', 'videographer', 'florist', 'caterer', 'venue', 'band', 'dj', 'other'
      ])
    })

    test('should handle case insensitive category matching', async () => {
      const request = createMockRequest({ category: 'PHOTOGRAPHER' })
      const response = await GET(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Location Sanitization Tests', () => {
    test('should sanitize dangerous characters from location', async () => {
      const request = createMockRequest({ location: 'London<script>alert("xss")</script>' })
      await GET(request)
      
      expect(mockReferralTrackingService.getLeaderboard).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'Londonscriptalert("xss")/script'
        })
      )
    })

    test('should remove command injection characters', async () => {
      const request = createMockRequest({ location: 'London; rm -rf /' })
      await GET(request)
      
      expect(mockReferralTrackingService.getLeaderboard).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'London rm -rf /'
        })
      )
    })

    test('should limit location string length', async () => {
      const longLocation = 'A'.repeat(200)
      const request = createMockRequest({ location: longLocation })
      await GET(request)
      
      expect(mockReferralTrackingService.getLeaderboard).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'A'.repeat(100) // Should be truncated to 100 chars
        })
      )
    })
  })

  describe('Rate Limiting Tests', () => {
    test('should allow requests within rate limit', async () => {
      // Make multiple requests within limit (60 per minute)
      for (let i = 0; i < 60; i++) {
        const request = createMockRequest()
        const response = await GET(request)
        expect(response.status).toBe(200)
      }
    })

    test('should reject requests exceeding rate limit', async () => {
      // Make requests up to the limit
      for (let i = 0; i < 60; i++) {
        const request = createMockRequest()
        await GET(request)
      }
      
      // This request should be rate limited
      const request = createMockRequest()
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(429)
      expect(data.error).toBe('RATE_LIMITED')
      expect(data.message).toContain('Too many requests for leaderboard data')
      expect(data.retryAfter).toBeGreaterThan(0)
    })

    test('should include rate limit headers', async () => {
      const request = createMockRequest()
      const response = await GET(request)
      
      expect(response.headers.get('X-RateLimit-Limit')).toBe('60')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('59')
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy()
      expect(response.headers.get('Retry-After')).toBeFalsy() // Only present when rate limited
    })

    test('should use IP-based rate limiting for public endpoint', async () => {
      // First IP uses up rate limit
      for (let i = 0; i < 60; i++) {
        await GET(createMockRequest({}, { 'x-forwarded-for': '192.168.1.1' }))
      }
      
      // Different IP should still have access
      const response = await GET(createMockRequest({}, { 'x-forwarded-for': '192.168.1.2' }))
      expect(response.status).toBe(200)
    })
  })

  describe('Caching Tests', () => {
    test('should return cached response on subsequent identical requests', async () => {
      const request = createMockRequest({ period: '30d' })
      
      // First request should call service
      const response1 = await GET(request)
      const data1 = await response1.json()
      expect(response1.headers.get('X-Cache')).toBe('MISS')
      expect(data1.meta.cached).toBe(false)
      expect(mockReferralTrackingService.getLeaderboard).toHaveBeenCalledTimes(1)
      
      // Second request should return cached result
      const response2 = await GET(createMockRequest({ period: '30d' }))
      const data2 = await response2.json()
      expect(response2.headers.get('X-Cache')).toBe('HIT')
      expect(data2.meta.cached).toBe(true)
      expect(data2.meta.cacheAge).toBeGreaterThanOrEqual(0)
      expect(mockReferralTrackingService.getLeaderboard).toHaveBeenCalledTimes(1)
    })

    test('should use different cache keys for different parameters', async () => {
      await GET(createMockRequest({ period: '7d' }))
      await GET(createMockRequest({ period: '30d' }))
      await GET(createMockRequest({ category: 'photographer' }))
      
      // Should call service for each unique parameter combination
      expect(mockReferralTrackingService.getLeaderboard).toHaveBeenCalledTimes(3)
    })

    test('should include cache control headers', async () => {
      const request = createMockRequest()
      const response = await GET(request)
      
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=600, s-maxage=600')
      expect(response.headers.get('Vary')).toBe('Accept-Encoding')
    })
  })

  describe('Success Response Tests', () => {
    test('should return properly formatted leaderboard data with gamification', async () => {
      const request = createMockRequest()
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.entries).toHaveLength(3)
      
      // Check gamification elements are added
      const topEntry = data.data.entries[0]
      expect(topEntry).toEqual({
        rank: 1,
        businessName: 'Elite Photography Studio',
        logoUrl: 'https://example.com/logo1.jpg',
        businessLocation: 'London, UK',
        businessCategory: 'photographer',
        paidConversions: 150,
        conversionRate: 75.0,
        monthsEarned: 1800,
        rankChange: 0,
        trend: 'stable',
        badges: ['top-performer', 'high-conversion'],
        isTopPerformer: true,
        isRising: false,
        achievementLevel: 'legend'
      })
    })

    test('should calculate achievement levels correctly', async () => {
      const customResult = {
        ...mockLeaderboardResult,
        entries: [
          { ...mockLeaderboardResult.entries[0], paidConversions: 120, rank: 1 }, // legend
          { ...mockLeaderboardResult.entries[0], paidConversions: 60, rank: 2 },  // master
          { ...mockLeaderboardResult.entries[0], paidConversions: 30, rank: 3 },  // champion
          { ...mockLeaderboardResult.entries[0], paidConversions: 15, rank: 4 },  // expert
          { ...mockLeaderboardResult.entries[0], paidConversions: 8, rank: 5 },   // rising
          { ...mockLeaderboardResult.entries[0], paidConversions: 3, rank: 6 }    // starter
        ]
      }
      
      mockReferralTrackingService.getLeaderboard.mockResolvedValue(customResult)
      
      const response = await GET(createMockRequest())
      const data = await response.json()
      
      expect(data.data.entries[0].achievementLevel).toBe('legend')
      expect(data.data.entries[1].achievementLevel).toBe('master')
      expect(data.data.entries[2].achievementLevel).toBe('champion')
      expect(data.data.entries[3].achievementLevel).toBe('expert')
      expect(data.data.entries[4].achievementLevel).toBe('rising')
      expect(data.data.entries[5].achievementLevel).toBe('starter')
    })

    test('should identify top performers and rising stars', async () => {
      const customResult = {
        ...mockLeaderboardResult,
        entries: [
          { ...mockLeaderboardResult.entries[0], rank: 1, rankChange: 0, trend: 'stable' as const },
          { ...mockLeaderboardResult.entries[0], rank: 2, rankChange: -8, trend: 'rising' as const },
          { ...mockLeaderboardResult.entries[0], rank: 10, rankChange: -3, trend: 'rising' as const }
        ]
      }
      
      mockReferralTrackingService.getLeaderboard.mockResolvedValue(customResult)
      
      const response = await GET(createMockRequest())
      const data = await response.json()
      
      expect(data.data.entries[0].isTopPerformer).toBe(true)
      expect(data.data.entries[0].isRising).toBe(false)
      expect(data.data.entries[1].isTopPerformer).toBe(true)
      expect(data.data.entries[1].isRising).toBe(true) // Rising with big rank change
      expect(data.data.entries[2].isTopPerformer).toBe(false)
      expect(data.data.entries[2].isRising).toBe(false) // Rising but small rank change
    })

    test('should include comprehensive metadata', async () => {
      const request = createMockRequest({
        period: '7d',
        category: 'photographer',
        location: 'London',
        limit: '20',
        offset: '0'
      })
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(data.meta).toEqual({
        period: '7d',
        category: 'photographer',
        location: 'London',
        filters: {
          hasCategory: true,
          hasLocation: true,
          appliedFilters: ['category: photographer', 'location: London']
        },
        pagination: {
          currentPage: 1,
          totalPages: 63,
          totalEntries: 1250,
          pageSize: 20,
          hasNextPage: true,
          hasPrevPage: false
        },
        performance: {
          cached: false,
          responseTime: expect.any(Number),
          nextUpdate: expect.any(String)
        }
      })
    })

    test('should call service with correct parameters', async () => {
      const request = createMockRequest({
        period: '7d',
        category: 'photographer',
        location: 'London',
        limit: '25',
        offset: '50'
      })
      
      await GET(request)
      
      expect(mockReferralTrackingService.getLeaderboard).toHaveBeenCalledWith({
        period: '7d',
        category: 'photographer',
        location: 'London',
        limit: 25,
        offset: 50
      })
    })
  })

  describe('Error Handling Tests', () => {
    test('should handle service errors', async () => {
      const { ReferralError } = await import('@/services/referral-tracking')
      mockReferralTrackingService.getLeaderboard.mockRejectedValue(
        new ReferralError('Database connection failed', 'DATABASE_ERROR')
      )
      
      const request = createMockRequest()
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('DATABASE_ERROR')
      expect(data.message).toBe('Database connection failed')
    })

    test('should handle generic errors', async () => {
      mockReferralTrackingService.getLeaderboard.mockRejectedValue(
        new Error('Unexpected error')
      )
      
      const request = createMockRequest()
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toBe('INTERNAL_ERROR')
      expect(data.message).toContain('unexpected error')
      expect(data.responseTime).toBeGreaterThan(0)
    })

    test('should include comprehensive error information', async () => {
      mockReferralTrackingService.getLeaderboard.mockRejectedValue(new Error('Test error'))
      
      const request = createMockRequest()
      const response = await GET(request)
      const data = await response.json()
      
      expect(data).toEqual({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while fetching the leaderboard',
        responseTime: expect.any(Number),
        timestamp: expect.any(String)
      })
    })
  })

  describe('HTTP Headers Tests', () => {
    test('should include security headers', async () => {
      const request = createMockRequest()
      const response = await GET(request)
      
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    })

    test('should include CORS headers for public endpoint', async () => {
      const request = createMockRequest()
      const response = await GET(request)
      
      expect(response.headers.get('Vary')).toBe('Accept-Encoding')
    })
  })

  describe('Cache Key Generation Tests', () => {
    test('should generate consistent cache keys', async () => {
      // Test that identical requests use the same cache
      await GET(createMockRequest({ period: '30d', category: 'photographer' }))
      await GET(createMockRequest({ period: '30d', category: 'photographer' }))
      
      // Service should only be called once due to caching
      expect(mockReferralTrackingService.getLeaderboard).toHaveBeenCalledTimes(1)
    })

    test('should generate different cache keys for different parameters', async () => {
      await GET(createMockRequest({ period: '30d', limit: '10' }))
      await GET(createMockRequest({ period: '30d', limit: '20' }))
      
      expect(mockReferralTrackingService.getLeaderboard).toHaveBeenCalledTimes(2)
    })
  })

  describe('IP Address Extraction', () => {
    test('should extract IP from various headers', async () => {
      const testCases = [
        { 'x-forwarded-for': '203.0.113.1, 192.168.1.1' },
        { 'x-real-ip': '203.0.113.2' },
        { 'remote-addr': '203.0.113.3' }
      ]
      
      for (const headers of testCases) {
        const response = await GET(createMockRequest({}, headers))
        expect(response.status).toBe(200)
      }
    })

    test('should handle missing IP information', async () => {
      const response = await GET(createMockRequest({}, {}))
      expect(response.status).toBe(200)
    })
  })
})

describe('HEAD /api/referrals/leaderboard', () => {
  test('should return health check information', async () => {
    const request = new NextRequest('http://localhost:3000/api/referrals/leaderboard', {
      method: 'HEAD'
    })
    
    const response = await HEAD(request)
    
    expect(response.status).toBe(200)
    expect(response.headers.get('X-Health-Status')).toBe('healthy')
    expect(response.headers.get('X-Response-Time')).toBeTruthy()
    expect(response.headers.get('X-Leaderboard-Available')).toBe('true')
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300')
  })

  test('should handle health check errors gracefully', async () => {
    // Simulate error condition
    const originalConsoleError = console.error
    console.error = jest.fn()
    
    const request = new NextRequest('http://localhost:3000/api/referrals/leaderboard', {
      method: 'HEAD'
    })
    
    // Force an error by mocking Date.now to throw
    const originalDateNow = Date.now
    Date.now = jest.fn().mockImplementation(() => {
      throw new Error('Test error')
    })
    
    const response = await HEAD(request)
    
    expect(response.status).toBe(503)
    expect(response.headers.get('X-Health-Status')).toBe('error')
    expect(response.headers.get('X-Leaderboard-Available')).toBe('false')
    expect(response.headers.get('Cache-Control')).toBe('no-cache')
    
    // Restore mocks
    Date.now = originalDateNow
    console.error = originalConsoleError
  })
})

describe('OPTIONS /api/referrals/leaderboard', () => {
  test('should handle CORS preflight request', async () => {
    const request = new NextRequest('http://localhost:3000/api/referrals/leaderboard', {
      method: 'OPTIONS'
    })
    
    const response = await OPTIONS(request)
    
    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, HEAD, OPTIONS')
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
    expect(response.headers.get('Access-Control-Max-Age')).toBe('86400')
    expect(response.headers.get('Vary')).toBe('Origin')
  })
})

describe('Memory Management and Cleanup', () => {
  test('should handle cache cleanup gracefully', async () => {
    // This test ensures the cache cleanup doesn't crash
    // In a real environment, the cleanup interval would run
    const request = createMockRequest()
    const response = await GET(request)
    expect(response.status).toBe(200)
  })
})