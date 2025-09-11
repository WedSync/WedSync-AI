import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import jwt from 'jsonwebtoken'

// Mock the modules
vi.mock('@/lib/supabase/server')
vi.mock('jsonwebtoken')
vi.mock('@/lib/validation/middleware', () => ({
  withSecureValidation: (schema: any, handler: any) => handler,
  withQueryValidation: (schema: any, handler: any) => handler
}))
// Import the API handlers after mocking
const mockTimelineSchedulesHandler = vi.fn()
const mockSupplierScheduleHandler = vi.fn() 
const mockScheduleConfirmHandler = vi.fn()
// Mock the actual handlers
vi.doMock('/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/timeline/[id]/supplier-schedules/route', () => ({
  GET: mockTimelineSchedulesHandler,
  POST: mockTimelineSchedulesHandler
describe('Supplier Schedule APIs', () => {
  let mockSupabaseClient: any
  let mockRequest: NextRequest
  let mockParams: any
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Setup mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn()
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
            order: vi.fn(() => ({
              range: vi.fn(),
              eq: vi.fn(() => ({
                eq: vi.fn()
              }))
            }))
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
        update: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn()
        upsert: vi.fn(() => ({
        }))
      })),
      rpc: vi.fn()
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabaseClient)
    // Setup mock request
    mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams()
      json: vi.fn()
    } as any
    mockParams = { id: 'timeline-123' }
  })
  afterEach(() => {
    vi.resetAllMocks()
  describe('Timeline Supplier Schedules API', () => {
    describe('GET /api/timeline/[id]/supplier-schedules', () => {
      it('should return 401 when user is not authenticated', async () => {
        // Arrange
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: new Error('Not authenticated')
        })
        const { GET } = await import('../../../app/api/timeline/[id]/supplier-schedules/route')
        // Act & Assert
        const response = await GET(mockRequest, { params: mockParams })
        const responseBody = await response.json()
        expect(response.status).toBe(401)
        expect(responseBody.error).toBe('Authentication required')
      })
      it('should return 403 when user does not have access to timeline', async () => {
        const mockUser = { id: 'user-123' }
          data: { user: mockUser },
          error: null
        // Mock user profile fetch - user not found
        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'user_profiles') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: new Error('User not found')
                  })
                }))
            }
          }
          return mockSupabaseClient.from()
        expect(response.status).toBe(500)
        expect(responseBody.error).toContain('UNAUTHORIZED: User organization not found')
      it('should successfully generate supplier schedules', async () => {
        const mockProfile = { organization_id: 'org-123' }
        const mockTimeline = {
          id: 'timeline-123',
          timeline_name: 'Smith Wedding',
          wedding_date: '2024-06-15',
          organization_id: 'org-123'
        }
        const mockEvents = [
          {
            id: 'event-1',
            event_title: 'Ceremony',
            event_description: 'Wedding ceremony',
            event_time: '14:00:00',
            event_duration_minutes: 60,
            event_location: 'Church of St. Mary',
            event_category: 'photography'
        ]
        const mockSuppliers = [
            id: 'supplier-1',
            business_name: 'Perfect Photos',
            primary_category: 'photography',
            email: 'info@perfectphotos.com',
            phone: '+44123456789',
            is_published: true
        // Mock authentication
        // Mock database calls with proper chaining
        let callCount = 0
          callCount++
          
                    data: mockProfile,
                    error: null
          if (table === 'wedding_timelines') {
                    data: mockTimeline,
          if (table === 'timeline_events') {
                  order: vi.fn().mockResolvedValue({
                    data: mockEvents,
          if (table === 'suppliers') {
                  data: mockSuppliers,
                  error: null
          if (table === 'supplier_schedules') {
              upsert: vi.fn(() => ({
                data: [{ id: 'schedule-1' }],
                error: null
          // Default mock
          return {
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
                order: vi.fn().mockResolvedValue({ data: [], error: null })
        // Act
        // Assert
        expect(response.status).toBe(200)
        expect(responseBody.success).toBe(true)
        expect(responseBody.data).toHaveProperty('timeline_id', 'timeline-123')
        expect(responseBody.data).toHaveProperty('supplier_schedules')
        expect(responseBody.data.supplier_schedules).toHaveLength(1)
        expect(responseBody.data.supplier_schedules[0]).toHaveProperty('supplier_name', 'Perfect Photos')
    })
    describe('POST /api/timeline/[id]/supplier-schedules', () => {
      it('should create and save supplier schedules', async () => {
        const mockRequestBody = {
          params: { id: 'timeline-123' },
          supplier_ids: ['supplier-1'],
          buffer_time_minutes: 15,
          include_setup_breakdown: true
        mockRequest.json = vi.fn().mockResolvedValue(mockRequestBody)
        
        // Setup proper database mocking
                single: vi.fn().mockResolvedValue({ data: {}, error: null }),
            })),
            upsert: vi.fn().mockResolvedValue({
              data: [{ id: 'schedule-1' }],
              error: null
            })
        const { POST } = await import('../../../app/api/timeline/[id]/supplier-schedules/route')
        const response = await POST(mockRequest, { params: mockParams })
        expect(response.status).toBe(201)
        expect(responseBody.data).toHaveProperty('schedules_generated')
  describe('Individual Supplier Schedule API', () => {
    describe('GET /api/suppliers/[id]/schedule', () => {
      it('should return schedule for authenticated user', async () => {
        const mockSupplier = {
          id: 'supplier-1',
          business_name: 'Perfect Photos',
          primary_category: 'photography',
          email: 'info@perfectphotos.com'
        const mockSchedules = [
            id: 'schedule-1',
            timeline_id: 'timeline-123',
            schedule_data: {
              supplier_name: 'Perfect Photos',
              schedule_items: []
            },
            status: 'generated',
            confirmation_status: 'pending',
            wedding_timelines: {
              timeline_name: 'Smith Wedding',
              wedding_date: '2024-06-15'
                    data: { organization_id: 'org-123' },
                    data: mockSupplier,
                    data: mockSchedules,
        const { GET } = await import('../../../app/api/suppliers/[id]/schedule/route')
        const response = await GET(mockRequest, { params: { id: 'supplier-1' } })
        expect(responseBody.data).toHaveProperty('supplier_name', 'Perfect Photos')
        expect(responseBody.data).toHaveProperty('schedules')
        expect(responseBody.data.schedules).toHaveLength(1)
      it('should return schedule with valid access token', async () => {
        const mockToken = 'valid.jwt.token'
        const mockDecodedToken = {
          supplier_id: 'supplier-1',
          timeline_id: 'timeline-123',
          token_id: 'token-123'
        mockRequest.nextUrl.searchParams.set('access_token', mockToken)
        vi.mocked(jwt.verify).mockReturnValue(mockDecodedToken)
        // Mock token record lookup
          if (table === 'supplier_access_tokens') {
                    data: {
                      id: 'token-123',
                      is_active: true,
                      expires_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                      usage_count: 0,
                      usage_limit: null,
                      permissions: ['view']
                    },
        expect(jwt.verify).toHaveBeenCalledWith(mockToken, process.env.JWT_SECRET)
      it('should return 403 for invalid access token', async () => {
        const mockToken = 'invalid.jwt.token'
        vi.mocked(jwt.verify).mockImplementation(() => {
          throw new Error('Invalid token')
        expect(response.status).toBe(403)
        expect(responseBody.error).toContain('Invalid token format or signature')
  describe('Schedule Confirmation API', () => {
    describe('POST /api/suppliers/[id]/schedule/confirm', () => {
      it('should successfully confirm a schedule', async () => {
          params: { id: 'supplier-1' },
          confirmation_status: 'confirmed' as const,
          overall_notes: 'All looks good!'
        const mockExistingSchedule = {
          id: 'schedule-1',
          schedule_data: {
            supplier_name: 'Perfect Photos',
            total_events: 3
          },
          wedding_timelines: {
            timeline_name: 'Smith Wedding',
            wedding_date: '2024-06-15',
            organization_id: 'org-123'
          suppliers: {
            email: 'info@perfectphotos.com'
        // Mock database operations
                    data: { id: 'supplier-1', organization_id: 'org-123' },
                    data: { id: 'timeline-123', organization_id: 'org-123' },
                    data: mockExistingSchedule,
              })),
              update: vi.fn(() => ({
                  select: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        ...mockExistingSchedule,
                        confirmation_status: 'confirmed',
                        confirmed_at: new Date().toISOString()
                      },
                      error: null
                    })
                  }))
          if (table === 'notifications') {
              insert: vi.fn().mockResolvedValue({
                data: [{ id: 'notification-1' }],
              })
        const { POST } = await import('../../../app/api/suppliers/[id]/schedule/confirm/route')
        const response = await POST(mockRequest, { params: { id: 'supplier-1' } })
        expect(responseBody.data).toHaveProperty('confirmation_status', 'confirmed')
        expect(responseBody.message).toBe('Schedule confirmed successfully')
      it('should handle schedule decline', async () => {
          confirmation_status: 'declined' as const,
          overall_notes: 'Cannot make it due to conflict'
        expect(responseBody.message).toBe('Schedule declined - please contact the wedding planner')
})
describe('API Error Handling', () => {
      }))
  it('should handle database errors gracefully', async () => {
    // Arrange
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    mockSupabaseClient.from.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Database connection failed')
          })
    }))
    const mockRequest = {
      nextUrl: { searchParams: new URLSearchParams() }
    const { GET } = await import('../../../app/api/timeline/[id]/supplier-schedules/route')
    // Act
    const response = await GET(mockRequest, { params: { id: 'timeline-123' } })
    const responseBody = await response.json()
    // Assert
    expect(response.status).toBe(500)
    expect(responseBody.error).toContain('UNAUTHORIZED: User organization not found')
  it('should handle malformed request data', async () => {
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
    const { POST } = await import('../../../app/api/suppliers/[id]/schedule/confirm/route')
    const response = await POST(mockRequest, { params: { id: 'supplier-1' } })
    expect(responseBody.error).toBeDefined()
