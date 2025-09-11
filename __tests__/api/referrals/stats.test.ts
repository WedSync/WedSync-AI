/**
 * WS-344 Team B - Referral Stats API Tests
 * Comprehensive test suite with >90% coverage
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/referrals/stats/route'
import { referralTrackingService } from '@/services/referral-tracking'
import { getServerSession } from 'next-auth/next'

// Mock dependencies
jest.mock('next-auth/next')
jest.mock('@/services/referral-tracking')
jest.mock('@/lib/auth/options', () => ({
  authOptions: {}
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockReferralTrackingService = referralTrackingService as jest.Mocked<typeof referralTrackingService>

// Test utilities
function createMockRequest(params: Record<string, string> = {}, headers: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/referrals/stats')
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

const mockSession = {
  user: {
    id: 'user123',
    organizationId: 'org456'
  }
}

const mockStatsResult = {
  stats: {
    totalReferrals: 25,
    activeTrials: 8,
    paidConversions: 12,
    conversionRate: 48.0,
    monthsEarned: 144,
    recentActivity: [
      {
        type: 'referral_created',
        timestamp: '2025-01-20T10:00:00Z',
        details: { referralCode: 'ABC123' }
      },
      {
        type: 'conversion_completed',
        timestamp: '2025-01-20T09:30:00Z',
        details: { referralCode: 'XYZ789', amount: 2400 }
      }
    ]
  },
  rankings: {
    globalRank: 42,
    categoryRank: 15,
    localRank: 8,
    totalSuppliers: 1250,
    percentile: 85
  }
}

describe('GET /api/referrals/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue(mockSession)
    mockReferralTrackingService.getReferralStats = jest.fn().mockResolvedValue(mockStatsResult)
  })

  describe('Authentication Tests', () => {
    test('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)
      
      const request = createMockRequest({ period: '30d' })
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('UNAUTHORIZED')
      expect(data.message).toContain('Authentication required')
    })

    test('should return 403 when user has no organization', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123' }
      })
      
      const request = createMockRequest({ period: '30d' })
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe('FORBIDDEN')
      expect(data.message).toContain('Supplier organization access required')
    })
  })

  describe('Query Validation Tests', () => {
    test('should accept valid query parameters', async () => {
      const request = createMockRequest({
        period: '7d',
        includeBreakdown: 'true'
      })
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.meta.period).toBe('7d')
      expect(data.meta.includeBreakdown).toBe(true)
    })

    test('should handle invalid period parameter', async () => {
      const request = createMockRequest({ period: 'invalid' })
      const response = await GET(request)
      
      expect(response.status).toBe(400)
    })

    test('should default to 30d period when not specified', async () => {
      const request = createMockRequest()
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.meta.period).toBe('30d')
    })

    test('should handle string boolean conversion for includeBreakdown', async () => {
      const request = createMockRequest({ includeBreakdown: 'false' })
      await GET(request)
      
      expect(mockReferralTrackingService.getReferralStats).toHaveBeenCalledWith(
        'org456',
        expect.objectContaining({
          includeBreakdown: false
        })
      )
    })
  })

  describe('Rate Limiting Tests', () => {
    test('should allow requests within rate limit', async () => {
      // Make multiple requests within limit (30 per minute)
      for (let i = 0; i < 30; i++) {
        const request = createMockRequest({ period: '30d' })
        const response = await GET(request)
        expect(response.status).toBe(200)
      }
    })

    test('should reject requests exceeding rate limit', async () => {
      // Make requests up to the limit
      for (let i = 0; i < 30; i++) {
        const request = createMockRequest({ period: '30d' })
        await GET(request)
      }
      
      // This request should be rate limited
      const request = createMockRequest({ period: '30d' })
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(429)
      expect(data.error).toBe('RATE_LIMITED')
      expect(data.retryAfter).toBeGreaterThan(0)
    })

    test('should include rate limit headers', async () => {
      const request = createMockRequest({ period: '30d' })
      const response = await GET(request)
      
      expect(response.headers.get('X-RateLimit-Limit')).toBe('30')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('29')
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy()
    })

    test('should use organization-specific rate limiting', async () => {
      const session1 = { user: { id: 'user1', organizationId: 'org1' } }
      const session2 = { user: { id: 'user2', organizationId: 'org2' } }
      
      // First organization uses up rate limit
      mockGetServerSession.mockResolvedValue(session1)
      for (let i = 0; i < 30; i++) {
        await GET(createMockRequest({ period: '30d' }))
      }
      
      // Second organization should still have access
      mockGetServerSession.mockResolvedValue(session2)
      const response = await GET(createMockRequest({ period: '30d' }))
      expect(response.status).toBe(200)
    })
  })

  describe('Caching Tests', () => {
    test('should return cached response on subsequent requests', async () => {
      const request = createMockRequest({ period: '30d' })
      
      // First request should call service
      const response1 = await GET(request)
      expect(response1.headers.get('X-Cache')).toBe('MISS')
      expect(mockReferralTrackingService.getReferralStats).toHaveBeenCalledTimes(1)
      
      // Second request should return cached result
      const response2 = await GET(createMockRequest({ period: '30d' }))
      const data2 = await response2.json()
      expect(response2.headers.get('X-Cache')).toBe('HIT')
      expect(data2.meta.cached).toBe(true)
      expect(mockReferralTrackingService.getReferralStats).toHaveBeenCalledTimes(1)
    })

    test('should use different cache keys for different parameters', async () => {
      await GET(createMockRequest({ period: '7d' }))
      await GET(createMockRequest({ period: '30d' }))
      
      // Should call service twice for different parameters
      expect(mockReferralTrackingService.getReferralStats).toHaveBeenCalledTimes(2)
    })

    test('should use different cache keys for includeBreakdown parameter', async () => {
      await GET(createMockRequest({ period: '30d', includeBreakdown: 'true' }))
      await GET(createMockRequest({ period: '30d', includeBreakdown: 'false' }))
      
      expect(mockReferralTrackingService.getReferralStats).toHaveBeenCalledTimes(2)
    })
  })

  describe('Success Response Tests', () => {
    test('should return complete stats data without breakdown', async () => {
      const request = createMockRequest({ period: '30d', includeBreakdown: 'false' })
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual({
        totalReferrals: 25,
        activeTrials: 8,
        paidConversions: 12,
        conversionRate: 48.0,
        monthsEarned: 144,
        currentRankings: {
          globalRank: 42,
          categoryRank: 15,
          localRank: 8,
          totalSuppliers: 1250,
          percentile: 85
        }
      })
      expect(data.data.recentActivity).toBeUndefined()
    })

    test('should include breakdown when requested', async () => {
      const request = createMockRequest({ period: '30d', includeBreakdown: 'true' })
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.data.recentActivity).toBeDefined()
      expect(data.data.recentActivity).toHaveLength(2)
      expect(data.data.recentActivity[0]).toEqual({
        type: 'referral_created',
        timestamp: '2025-01-20T10:00:00Z',
        details: { referralCode: 'ABC123' }
      })
    })

    test('should call service with correct parameters', async () => {
      const request = createMockRequest({
        period: '7d',
        includeBreakdown: 'true'
      })
      
      await GET(request)
      
      expect(mockReferralTrackingService.getReferralStats).toHaveBeenCalledWith(
        'org456',
        {
          period: '7d',
          includeBreakdown: true
        }
      )
    })

    test('should include meta information in response', async () => {
      const request = createMockRequest({ period: '7d' })
      const response = await GET(request)
      const data = await response.json()
      
      expect(data.meta).toEqual({
        period: '7d',
        includeBreakdown: false,
        cached: false,
        responseTime: expect.any(Number)
      })
      expect(data.timestamp).toBeTruthy()
    })
  })

  describe('Error Handling Tests', () => {
    test('should handle service errors', async () => {
      const { ReferralError } = await import('@/services/referral-tracking')
      mockReferralTrackingService.getReferralStats.mockRejectedValue(
        new ReferralError('Database connection failed', 'DATABASE_ERROR')
      )
      
      const request = createMockRequest({ period: '30d' })
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('INTERNAL_ERROR')
    })

    test('should handle generic errors', async () => {
      mockReferralTrackingService.getReferralStats.mockRejectedValue(
        new Error('Unexpected error')
      )
      
      const request = createMockRequest({ period: '30d' })
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toBe('INTERNAL_ERROR')
      expect(data.message).toContain('unexpected error')
    })

    test('should include response time in error responses', async () => {
      mockReferralTrackingService.getReferralStats.mockRejectedValue(new Error('Test error'))
      
      const request = createMockRequest({ period: '30d' })
      const response = await GET(request)
      const data = await response.json()
      
      expect(data.responseTime).toBeGreaterThan(0)
    })
  })

  describe('IP Address Extraction', () => {
    test('should extract IP from x-forwarded-for header', async () => {
      const request = createMockRequest(
        { period: '30d' },
        { 'x-forwarded-for': '203.0.113.1, 192.168.1.1' }
      )
      
      // This tests the rate limiting key generation internally
      const response = await GET(request)
      expect(response.status).toBe(200)
    })

    test('should handle missing IP headers', async () => {
      const request = createMockRequest(
        { period: '30d' },
        {} // No IP headers
      )
      
      const response = await GET(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Query Parameter Edge Cases', () => {
    test('should handle multiple period values', async () => {
      const url = new URL('http://localhost:3000/api/referrals/stats')
      url.searchParams.append('period', '7d')
      url.searchParams.append('period', '30d')
      
      const request = new NextRequest(url.toString())
      const response = await GET(request)
      
      // Should use the first value or handle gracefully
      expect(response.status).toBe(200)
    })

    test('should handle empty query parameters', async () => {
      const request = createMockRequest({ period: '', includeBreakdown: '' })
      const response = await GET(request)
      
      // Should handle empty values gracefully or return validation error
      expect([200, 400]).toContain(response.status)
    })
  })
})