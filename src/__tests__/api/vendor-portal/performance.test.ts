import { GET, POST } from '@/app/api/vendor-portal/performance/route'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/supabase/server')
const mockCreateClient = createClient as ReturnType<typeof vi.fn>edFunction<typeof createClient>
// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: vi.fn(),
        order: jest.fn(() => ({
          limit: vi.fn(),
        })),
        gte: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: vi.fn(),
          })),
      })),
      filter: jest.fn(() => ({
        gte: vi.fn(),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
  })),
}
describe('/api/vendor-portal/performance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateClient.mockReturnValue(mockSupabaseClient as unknown)
  })
  describe('GET', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      })
      const request = new NextRequest('http://localhost:3000/api/vendor-portal/performance?vendor_id=vendor1')
      const response = await GET(request)
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })
    it('returns 400 when vendor_id is missing', async () => {
        data: { user: { id: 'user1' } },
        error: null,
      const request = new NextRequest('http://localhost:3000/api/vendor-portal/performance')
      expect(response.status).toBe(400)
      expect(data.error).toBe('Vendor ID required')
    it('returns 404 when vendor is not found', async () => {
      mockSupabaseClient.from().select().eq().single
        .mockResolvedValue({ data: null, error: new Error('Not found') })
      expect(response.status).toBe(404)
      expect(data.error).toBe('Vendor not found')
    it('returns performance metrics successfully', async () => {
      const mockVendor = {
        id: 'vendor1',
        business_name: 'Test Photography',
        organization_id: 'org1',
        average_rating: 4.5,
        total_reviews: 25,
        response_time_hours: 3,
      }
      const mockWeddings = [
        {
          id: 'w1',
          clients: { status: 'completed', wedding_date: '2024-01-15' },
        },
      ]
        .mockResolvedValueOnce({ data: mockVendor, error: null })
      mockSupabaseClient.from().select().eq().eq().gte()
        .mockResolvedValueOnce({ data: mockWeddings, error: null })
        .mockResolvedValueOnce({ data: [], error: null })
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('overall_score')
      expect(data).toHaveProperty('delivery_score')
      expect(data).toHaveProperty('communication_score')
      expect(data).toHaveProperty('quality_score')
      expect(data).toHaveProperty('reliability_score')
      expect(data.completed_weddings).toBe(1)
      expect(data.customer_satisfaction).toBe(90) // 4.5 * 20
    it('calculates performance metrics based on different periods', async () => {
        .mockResolvedValue({ data: mockVendor, error: null })
        .mockResolvedValue({ data: [], error: null })
      // Test 1 month period
      const request1Month = new NextRequest('http://localhost:3000/api/vendor-portal/performance?vendor_id=vendor1&period=1month')
      const response1Month = await GET(request1Month)
      expect(response1Month.status).toBe(200)
      // Test all time period
      const requestAllTime = new NextRequest('http://localhost:3000/api/vendor-portal/performance?vendor_id=vendor1&period=all')
      const responseAllTime = await GET(requestAllTime)
      expect(responseAllTime.status).toBe(200)
    it('includes achievements when criteria are met', async () => {
        average_rating: 4.8,
        total_reviews: 50,
        response_time_hours: 2,
      expect(data.achievements).toHaveLength(3) // Should have all achievements
      expect(data.achievements.some((a: any) => a.title === 'Top Rated Vendor')).toBe(true)
      expect(data.achievements.some((a: any) => a.title === 'Customer Champion')).toBe(true)
    it('includes areas for improvement when needed', async () => {
        average_rating: 3.5,
        total_reviews: 5,
        response_time_hours: 6,
      expect(data.areas_for_improvement).toContain('Reduce average response time to under 3 hours')
      expect(data.areas_for_improvement).toContain('Improve customer satisfaction ratings')
      expect(data.areas_for_improvement).toContain('Build experience with more completed weddings')
  describe('POST', () => {
      const request = new NextRequest('http://localhost:3000/api/vendor-portal/performance', {
        method: 'POST',
        body: JSON.stringify({
          vendor_id: 'vendor1',
          metric_type: 'delivery_time',
          value: 2.5,
          wedding_id: 'wedding1',
        }),
      const response = await POST(request)
    it('records performance metric successfully', async () => {
      const mockMetric = {
        id: 'metric1',
        vendor_id: 'vendor1',
        metric_type: 'delivery_time',
        value: 2.5,
        wedding_id: 'wedding1',
        recorded_by: 'user1',
        recorded_at: new Date().toISOString(),
      mockSupabaseClient.from().insert().select().single
        .mockResolvedValue({ data: mockMetric, error: null })
      expect(data).toEqual(mockMetric)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('vendor_performance_logs')
    it('handles database errors gracefully', async () => {
        .mockResolvedValue({ data: null, error: new Error('Database error') })
      expect(data.error).toBe('Database error')
})
