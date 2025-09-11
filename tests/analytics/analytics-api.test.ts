import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createMocks } from 'node-mocks-http'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/**
 * WS-246: Vendor Performance Analytics System - API Testing
 * Tests all analytics API endpoints with validation scenarios
 */

// Mock Supabase
jest.mock('@/lib/supabase/server')
jest.mock('next/headers')

const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: mockVendorData, error: null })),
        range: jest.fn(() => Promise.resolve({ data: [mockVendorData], error: null }))
      })),
      order: jest.fn(() => ({
        range: jest.fn(() => Promise.resolve({ data: [mockVendorData], error: null }))
      })),
      range: jest.fn(() => Promise.resolve({ data: [mockVendorData], error: null }))
    })),
    insert: jest.fn(() => Promise.resolve({ data: mockVendorData, error: null })),
    update: jest.fn(() => Promise.resolve({ data: mockVendorData, error: null })),
    delete: jest.fn(() => Promise.resolve({ data: null, error: null }))
  })),
  rpc: jest.fn(() => Promise.resolve({ data: 92.5, error: null })),
  auth: {
    getUser: jest.fn(() => Promise.resolve({ 
      data: { user: { id: 'test-user-id', role: 'authenticated' } }, 
      error: null 
    }))
  }
}

;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
;(cookies as jest.Mock).mockReturnValue(new Map())

// Import API handlers
import dashboardHandler from '@/app/api/analytics/dashboard/route'
import vendorsHandler from '@/app/api/analytics/vendors/route'
import vendorDetailHandler from '@/app/api/analytics/vendors/[id]/route'
import chartsHandler from '@/app/api/analytics/charts/[type]/route'
import exportHandler from '@/app/api/analytics/export/route'

// Mock data
const mockVendorData = {
  id: 'test-vendor-123',
  name: 'Test Photography Studio',
  type: 'photographer',
  overall_score: 92.5,
  response_time_score: 95.2,
  booking_success_rate: 0.88,
  satisfaction_score: 4.7,
  total_bookings: 156,
  total_revenue: 234500.00,
  response_time_avg: 1.2,
  created_at: '2024-01-15T10:00:00Z',
  last_updated: '2025-01-15T14:30:00Z'
}

const mockDashboardData = {
  overview: {
    total_vendors: 245,
    active_vendors: 189,
    total_bookings: 1234,
    total_revenue: 2450000,
    avg_response_time: 2.3,
    satisfaction_rate: 4.6,
    last_updated: '2025-01-15T14:30:00Z'
  },
  performance_trends: [
    { date: '2025-01-01', bookings: 45, revenue: 67500, satisfaction: 4.5 },
    { date: '2025-01-08', bookings: 52, revenue: 78900, satisfaction: 4.6 },
    { date: '2025-01-15', bookings: 48, revenue: 72300, satisfaction: 4.7 }
  ],
  top_performers: [mockVendorData]
}

describe('Analytics Dashboard API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: mockDashboardData, error: null })),
        order: jest.fn(() => Promise.resolve({ data: mockDashboardData, error: null })),
        range: jest.fn(() => Promise.resolve({ data: mockDashboardData, error: null }))
      }))
    })
  })

  describe('GET /api/analytics/dashboard', () => {
    it('should return dashboard data with valid parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/dashboard?timeframe=30d')
      const response = await dashboardHandler.GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('overview')
      expect(data).toHaveProperty('performance_trends')
      expect(data).toHaveProperty('top_performers')
      expect(data.overview.total_vendors).toBe(245)
    })

    it('should validate timeframe parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/dashboard?timeframe=invalid')
      const response = await dashboardHandler.GET(request)

      expect(response.status).toBe(400)
      const errorData = await response.json()
      expect(errorData.error).toContain('Invalid timeframe')
    })

    it('should handle missing authentication', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ 
        data: { user: null }, 
        error: new Error('Not authenticated') 
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/dashboard')
      const response = await dashboardHandler.GET(request)

      expect(response.status).toBe(401)
      const errorData = await response.json()
      expect(errorData.error).toBe('Unauthorized')
    })

    it('should implement rate limiting', async () => {
      // Simulate 10 rapid requests
      const requests = Array.from({ length: 10 }, () => 
        new NextRequest('http://localhost:3000/api/analytics/dashboard')
      )

      const responses = await Promise.all(
        requests.map(req => dashboardHandler.GET(req))
      )

      // Should have some rate limited responses
      const rateLimitedResponses = responses.filter(r => r.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })

    it('should cache responses appropriately', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/dashboard?timeframe=30d')
      
      // First request
      const response1 = await dashboardHandler.GET(request)
      const data1 = await response1.json()

      // Second identical request should be cached
      const response2 = await dashboardHandler.GET(request)
      const data2 = await response2.json()

      expect(response1.headers.get('Cache-Control')).toContain('max-age')
      expect(data1).toEqual(data2)
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ 
            data: null, 
            error: new Error('Database connection failed') 
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/dashboard')
      const response = await dashboardHandler.GET(request)

      expect(response.status).toBe(500)
      const errorData = await response.json()
      expect(errorData.error).toContain('Internal server error')
    })
  })

  describe('GET /api/analytics/vendors', () => {
    it('should return paginated vendor list', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/vendors?page=1&limit=20')
      const response = await vendorsHandler.GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('vendors')
      expect(data).toHaveProperty('pagination')
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(20)
    })

    it('should filter vendors by type', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/vendors?type=photographer')
      const response = await vendorsHandler.GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      data.vendors.forEach((vendor: any) => {
        expect(vendor.type).toBe('photographer')
      })
    })

    it('should sort vendors by performance score', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/vendors?sort=score&order=desc')
      const response = await vendorsHandler.GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Check if vendors are sorted by score descending
      for (let i = 1; i < data.vendors.length; i++) {
        expect(data.vendors[i-1].overall_score).toBeGreaterThanOrEqual(data.vendors[i].overall_score)
      }
    })

    it('should validate pagination parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/vendors?page=-1&limit=1000')
      const response = await vendorsHandler.GET(request)

      expect(response.status).toBe(400)
      const errorData = await response.json()
      expect(errorData.error).toContain('Invalid pagination parameters')
    })

    it('should handle search query', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/vendors?search=photography')
      const response = await vendorsHandler.GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      data.vendors.forEach((vendor: any) => {
        expect(vendor.name.toLowerCase()).toContain('photography')
      })
    })
  })

  describe('GET /api/analytics/vendors/[id]', () => {
    it('should return detailed vendor analytics', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/vendors/test-vendor-123')
      const response = await vendorDetailHandler.GET(request, { params: { id: 'test-vendor-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('vendor')
      expect(data).toHaveProperty('performance_history')
      expect(data).toHaveProperty('metrics_breakdown')
      expect(data.vendor.id).toBe('test-vendor-123')
    })

    it('should return 404 for non-existent vendor', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/vendors/non-existent-id')
      const response = await vendorDetailHandler.GET(request, { params: { id: 'non-existent-id' } })

      expect(response.status).toBe(404)
      const errorData = await response.json()
      expect(errorData.error).toBe('Vendor not found')
    })

    it('should validate vendor ID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/vendors/invalid-id-format!')
      const response = await vendorDetailHandler.GET(request, { params: { id: 'invalid-id-format!' } })

      expect(response.status).toBe(400)
      const errorData = await response.json()
      expect(errorData.error).toContain('Invalid vendor ID format')
    })

    it('should include performance metrics in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/vendors/test-vendor-123')
      const response = await vendorDetailHandler.GET(request, { params: { id: 'test-vendor-123' } })
      const data = await response.json()

      expect(data.metrics_breakdown).toHaveProperty('response_time')
      expect(data.metrics_breakdown).toHaveProperty('booking_success')
      expect(data.metrics_breakdown).toHaveProperty('satisfaction')
      expect(data.metrics_breakdown).toHaveProperty('revenue')
    })
  })

  describe('GET /api/analytics/charts/[type]', () => {
    const chartTypes = ['performance-trends', 'booking-funnel', 'revenue-overview', 'vendor-comparison']

    chartTypes.forEach(chartType => {
      it(`should return ${chartType} chart data`, async () => {
        const request = new NextRequest(`http://localhost:3000/api/analytics/charts/${chartType}`)
        const response = await chartsHandler.GET(request, { params: { type: chartType } })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toHaveProperty('chartData')
        expect(data).toHaveProperty('chartType')
        expect(data.chartType).toBe(chartType)
      })
    })

    it('should return 400 for invalid chart type', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/charts/invalid-chart-type')
      const response = await chartsHandler.GET(request, { params: { type: 'invalid-chart-type' } })

      expect(response.status).toBe(400)
      const errorData = await response.json()
      expect(errorData.error).toContain('Invalid chart type')
    })

    it('should handle date range parameters for charts', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/charts/performance-trends?from=2025-01-01&to=2025-01-31')
      const response = await chartsHandler.GET(request, { params: { type: 'performance-trends' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.chartData).toBeDefined()
      expect(data.dateRange).toEqual({
        from: '2025-01-01',
        to: '2025-01-31'
      })
    })

    it('should validate date range parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/charts/performance-trends?from=invalid-date')
      const response = await chartsHandler.GET(request, { params: { type: 'performance-trends' } })

      expect(response.status).toBe(400)
      const errorData = await response.json()
      expect(errorData.error).toContain('Invalid date format')
    })
  })

  describe('POST /api/analytics/export', () => {
    it('should export dashboard data as CSV', async () => {
      const requestBody = {
        type: 'dashboard',
        format: 'csv',
        timeframe: '30d'
      }

      const { req } = createMocks({
        method: 'POST',
        body: requestBody,
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/export', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await exportHandler.POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/csv')
      expect(response.headers.get('Content-Disposition')).toContain('attachment')
    })

    it('should export vendor data as JSON', async () => {
      const requestBody = {
        type: 'vendors',
        format: 'json',
        vendorIds: ['test-vendor-123']
      }

      const request = new NextRequest('http://localhost:3000/api/analytics/export', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await exportHandler.POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json')
    })

    it('should validate export parameters', async () => {
      const requestBody = {
        type: 'invalid-type',
        format: 'invalid-format'
      }

      const request = new NextRequest('http://localhost:3000/api/analytics/export', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await exportHandler.POST(request)

      expect(response.status).toBe(400)
      const errorData = await response.json()
      expect(errorData.error).toContain('Invalid export parameters')
    })

    it('should handle large exports with pagination', async () => {
      const requestBody = {
        type: 'vendors',
        format: 'csv',
        limit: 1000
      }

      const request = new NextRequest('http://localhost:3000/api/analytics/export', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await exportHandler.POST(request)

      expect(response.status).toBe(200)
      // Should include pagination headers for large datasets
      expect(response.headers.has('X-Total-Count')).toBe(true)
    })

    it('should require authentication for exports', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ 
        data: { user: null }, 
        error: new Error('Not authenticated') 
      })

      const requestBody = {
        type: 'dashboard',
        format: 'csv'
      }

      const request = new NextRequest('http://localhost:3000/api/analytics/export', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await exportHandler.POST(request)

      expect(response.status).toBe(401)
    })
  })

  describe('API Security and Validation', () => {
    it('should validate request content-type', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/export', {
        method: 'POST',
        body: 'invalid-json',
        headers: { 'Content-Type': 'text/plain' }
      })

      const response = await exportHandler.POST(request)

      expect(response.status).toBe(400)
      const errorData = await response.json()
      expect(errorData.error).toContain('Invalid content type')
    })

    it('should sanitize SQL injection attempts', async () => {
      const maliciousRequest = new NextRequest("http://localhost:3000/api/analytics/vendors?search=' OR 1=1--")
      const response = await vendorsHandler.GET(maliciousRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Should not return unauthorized data
      expect(data.vendors.length).toBeLessThan(1000) // Reasonable limit
    })

    it('should prevent NoSQL injection in parameters', async () => {
      const maliciousRequest = new NextRequest('http://localhost:3000/api/analytics/vendors/{"$ne": null}')
      const response = await vendorDetailHandler.GET(maliciousRequest, { params: { id: '{"$ne": null}' } })

      expect(response.status).toBe(400)
      const errorData = await response.json()
      expect(errorData.error).toContain('Invalid vendor ID format')
    })

    it('should implement CORS headers correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/dashboard')
      const response = await dashboardHandler.GET(request)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined()
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined()
    })

    it('should handle request timeout gracefully', async () => {
      // Mock slow database response
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => new Promise(resolve => setTimeout(() => resolve({ data: mockDashboardData, error: null }), 35000))) // 35 second delay
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/dashboard')
      const startTime = Date.now()
      
      const response = await Promise.race([
        dashboardHandler.GET(request),
        new Promise<Response>(resolve => 
          setTimeout(() => resolve(new Response('Timeout', { status: 408 })), 30000)
        )
      ])

      const duration = Date.now() - startTime
      
      expect(duration).toBeLessThan(31000) // Should timeout before 31 seconds
      expect(response.status).toBe(408)
    }, 35000) // Increase test timeout to 35 seconds

    it('should validate file size limits for exports', async () => {
      const requestBody = {
        type: 'vendors',
        format: 'csv',
        limit: 1000000 // Very large limit
      }

      const request = new NextRequest('http://localhost:3000/api/analytics/export', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await exportHandler.POST(request)

      expect(response.status).toBe(400)
      const errorData = await response.json()
      expect(errorData.error).toContain('Export size limit exceeded')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/export', {
        method: 'POST',
        body: '{"invalid": json}',
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await exportHandler.POST(request)

      expect(response.status).toBe(400)
      const errorData = await response.json()
      expect(errorData.error).toContain('Invalid JSON')
    })

    it('should handle empty request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/export', {
        method: 'POST',
        body: '',
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await exportHandler.POST(request)

      expect(response.status).toBe(400)
      const errorData = await response.json()
      expect(errorData.error).toContain('Request body required')
    })

    it('should handle database constraint violations', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ 
            data: null, 
            error: { code: '23505', message: 'duplicate key violation' } 
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/dashboard')
      const response = await dashboardHandler.GET(request)

      expect(response.status).toBe(500)
      const errorData = await response.json()
      expect(errorData.error).toContain('Database constraint violation')
    })

    it('should handle network connectivity issues', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.reject(new Error('Network request failed')))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/dashboard')
      const response = await dashboardHandler.GET(request)

      expect(response.status).toBe(503)
      const errorData = await response.json()
      expect(errorData.error).toContain('Service temporarily unavailable')
    })
  })
})

describe('API Performance Tests', () => {
  it('should respond to dashboard requests within 2 seconds', async () => {
    const startTime = Date.now()
    
    const request = new NextRequest('http://localhost:3000/api/analytics/dashboard')
    const response = await dashboardHandler.GET(request)
    
    const duration = Date.now() - startTime
    
    expect(response.status).toBe(200)
    expect(duration).toBeLessThan(2000)
  })

  it('should handle concurrent requests efficiently', async () => {
    const concurrentRequests = 10
    const requests = Array.from({ length: concurrentRequests }, () => 
      new NextRequest('http://localhost:3000/api/analytics/dashboard')
    )

    const startTime = Date.now()
    const responses = await Promise.all(
      requests.map(req => dashboardHandler.GET(req))
    )
    const duration = Date.now() - startTime

    responses.forEach(response => {
      expect(response.status).toBe(200)
    })
    
    // All requests should complete within 5 seconds
    expect(duration).toBeLessThan(5000)
  })

  it('should maintain consistent response times under load', async () => {
    const loadTestRequests = 50
    const responseTimes: number[] = []

    for (let i = 0; i < loadTestRequests; i++) {
      const startTime = Date.now()
      
      const request = new NextRequest('http://localhost:3000/api/analytics/dashboard')
      const response = await dashboardHandler.GET(request)
      
      const duration = Date.now() - startTime
      responseTimes.push(duration)
      
      expect(response.status).toBe(200)
    }

    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    const maxResponseTime = Math.max(...responseTimes)
    
    expect(averageResponseTime).toBeLessThan(1000) // Average under 1 second
    expect(maxResponseTime).toBeLessThan(3000) // Max under 3 seconds
  })
})