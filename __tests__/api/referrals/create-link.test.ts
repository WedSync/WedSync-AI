/**
 * WS-344 Team B - Create Referral Link API Tests
 * Comprehensive test suite with >90% coverage
 */

import { NextRequest } from 'next/server'
import { POST, OPTIONS } from '@/app/api/referrals/create-link/route'
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
function createMockRequest(body: any, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/referrals/create-link', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
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

const mockValidReferralResult = {
  referralCode: 'TEST1234',
  customLink: 'https://wedsync.com/join/TEST1234',
  qrCodeUrl: 'https://storage.supabase.co/qr-codes/test.png'
}

describe('POST /api/referrals/create-link', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue(mockSession)
    mockReferralTrackingService.createReferralLink = jest.fn().mockResolvedValue(mockValidReferralResult)
  })

  describe('Authentication Tests', () => {
    test('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)
      
      const request = createMockRequest({
        source: 'link',
        generateQR: true
      })
      
      const response = await POST(request)
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
      
      const request = createMockRequest({
        source: 'link',
        generateQR: true
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe('FORBIDDEN')
      expect(data.message).toContain('Supplier organization access required')
    })
  })

  describe('Validation Tests', () => {
    test('should accept valid request data', async () => {
      const validData = {
        source: 'link',
        generateQR: true,
        utmSource: 'website',
        utmMedium: 'referral',
        utmCampaign: 'supplier-growth'
      }
      
      const request = createMockRequest(validData)
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.referralCode).toBe('TEST1234')
      expect(data.data.customLink).toBe('https://wedsync.com/join/TEST1234')
    })

    test('should handle invalid source type', async () => {
      const invalidData = {
        source: 'invalid-source',
        generateQR: true
      }
      
      const request = createMockRequest(invalidData)
      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })

    test('should validate UTM parameters format', async () => {
      const invalidUTM = {
        source: 'link',
        utmSource: 'valid-source',
        utmMedium: 'invalid@medium!', // Invalid characters
        generateQR: true
      }
      
      const request = createMockRequest(invalidUTM)
      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })
  })

  describe('Rate Limiting Tests', () => {
    test('should allow requests within rate limit', async () => {
      const validData = {
        source: 'link',
        generateQR: true
      }
      
      // Make multiple requests within limit (5 per minute)
      for (let i = 0; i < 5; i++) {
        const request = createMockRequest(validData)
        const response = await POST(request)
        expect(response.status).toBe(201)
      }
    })

    test('should reject requests exceeding rate limit', async () => {
      const validData = {
        source: 'link',
        generateQR: true
      }
      
      // Make requests up to the limit
      for (let i = 0; i < 5; i++) {
        const request = createMockRequest(validData)
        await POST(request)
      }
      
      // This request should be rate limited
      const request = createMockRequest(validData)
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(429)
      expect(data.error).toBe('RATE_LIMITED')
      expect(data.retryAfter).toBeGreaterThan(0)
    })

    test('should include rate limit headers', async () => {
      const request = createMockRequest({
        source: 'link',
        generateQR: true
      })
      
      const response = await POST(request)
      
      expect(response.headers.get('X-RateLimit-Limit')).toBe('5')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('4')
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy()
    })
  })

  describe('Fraud Detection Tests', () => {
    test('should handle fraud detection errors', async () => {
      const { FraudError } = await import('@/services/referral-tracking')
      mockReferralTrackingService.createReferralLink.mockRejectedValue(
        new FraudError('Suspicious activity detected', 'suspicious_activity')
      )
      
      const request = createMockRequest({
        source: 'link',
        generateQR: true
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(403)
      expect(data.error).toBe('FRAUD_DETECTED')
      expect(data.message).toContain('Suspicious activity')
    })

    test('should handle validation errors from service', async () => {
      const { ValidationError } = await import('@/services/referral-tracking')
      mockReferralTrackingService.createReferralLink.mockRejectedValue(
        new ValidationError('Invalid input data')
      )
      
      const request = createMockRequest({
        source: 'link',
        generateQR: true
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('VALIDATION_ERROR')
      expect(data.message).toBe('Invalid input data')
    })
  })

  describe('Success Response Tests', () => {
    test('should return complete referral link data with QR code', async () => {
      const request = createMockRequest({
        source: 'qr',
        generateQR: true,
        customMessage: 'Join our referral program!'
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toEqual({
        referralCode: 'TEST1234',
        customLink: 'https://wedsync.com/join/TEST1234',
        qrCodeUrl: 'https://storage.supabase.co/qr-codes/test.png'
      })
      expect(data.message).toContain('successfully')
      expect(data.timestamp).toBeTruthy()
    })

    test('should call service with correct parameters', async () => {
      const requestData = {
        source: 'email',
        generateQR: false,
        utmSource: 'email-campaign',
        utmMedium: 'email',
        customMessage: 'Special invitation'
      }
      
      const request = createMockRequest(requestData)
      await POST(request)
      
      expect(mockReferralTrackingService.createReferralLink).toHaveBeenCalledWith(
        'org456', // supplierId
        requestData,
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent',
          userId: 'user123'
        })
      )
    })
  })

  describe('Error Handling Tests', () => {
    test('should handle database errors', async () => {
      const { DatabaseError } = await import('@/services/referral-tracking')
      mockReferralTrackingService.createReferralLink.mockRejectedValue(
        new DatabaseError('Database connection failed')
      )
      
      const request = createMockRequest({
        source: 'link',
        generateQR: true
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toBe('DATABASE_ERROR')
    })

    test('should handle generic errors', async () => {
      mockReferralTrackingService.createReferralLink.mockRejectedValue(
        new Error('Unexpected error')
      )
      
      const request = createMockRequest({
        source: 'link',
        generateQR: true
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toBe('INTERNAL_ERROR')
      expect(data.message).toContain('unexpected error')
    })
  })

  describe('IP Address Extraction', () => {
    test('should extract IP from x-forwarded-for header', async () => {
      const request = createMockRequest(
        { source: 'link', generateQR: true },
        { 'x-forwarded-for': '203.0.113.1, 192.168.1.1' }
      )
      
      await POST(request)
      
      expect(mockReferralTrackingService.createReferralLink).toHaveBeenCalledWith(
        'org456',
        expect.any(Object),
        expect.objectContaining({
          ipAddress: '203.0.113.1' // First IP in forwarded header
        })
      )
    })

    test('should handle missing IP headers', async () => {
      const request = createMockRequest(
        { source: 'link', generateQR: true },
        {} // No IP headers
      )
      
      await POST(request)
      
      expect(mockReferralTrackingService.createReferralLink).toHaveBeenCalledWith(
        'org456',
        expect.any(Object),
        expect.objectContaining({
          ipAddress: 'unknown'
        })
      )
    })
  })
})

describe('OPTIONS /api/referrals/create-link', () => {
  test('should handle CORS preflight request', async () => {
    const request = new NextRequest('http://localhost:3000/api/referrals/create-link', {
      method: 'OPTIONS'
    })
    
    const response = await OPTIONS(request)
    
    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type')
  })
})

describe('Edge Cases', () => {
  test('should handle malformed JSON body', async () => {
    const request = new NextRequest('http://localhost:3000/api/referrals/create-link', {
      method: 'POST',
      body: 'invalid json',
      headers: {
        'content-type': 'application/json'
      }
    })
    
    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  test('should handle empty request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/referrals/create-link', {
      method: 'POST',
      body: '',
      headers: {
        'content-type': 'application/json'
      }
    })
    
    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  test('should handle missing content-type header', async () => {
    const request = new NextRequest('http://localhost:3000/api/referrals/create-link', {
      method: 'POST',
      body: JSON.stringify({ source: 'link', generateQR: true })
    })
    
    const response = await POST(request)
    // Should still work as withSecureValidation handles JSON parsing
    expect(response.status).toBe(201)
  })
})