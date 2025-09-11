import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import SupplierScheduleUpdateService from '@/lib/services/supplier-schedule-update-service'
import SupplierNotificationService from '@/lib/services/supplier-notification-service'
import SupplierAccessTokenService from '@/lib/services/supplier-access-token-service'
import ScheduleExportService from '@/lib/services/schedule-export-service'
import { createClient } from '@/lib/supabase/server'
import jwt from 'jsonwebtoken'

// Mock dependencies
vi.mock('@/lib/supabase/server')
vi.mock('jsonwebtoken')
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn()
    }
  }))
}))
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        setContent: vi.fn(),
        pdf: vi.fn(),
        close: vi.fn()
      }),
      close: vi.fn()
    })
  }
describe('Supplier Schedule Services', () => {
  let mockSupabaseClient: any
  beforeEach(() => {
    mockSupabaseClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
            order: vi.fn(() => ({
              eq: vi.fn(),
              select: vi.fn()
            })),
            not: vi.fn()
          })),
          update: vi.fn(() => ({
            eq: vi.fn()
          insert: vi.fn(),
          upsert: vi.fn()
        })),
        update: vi.fn(() => ({
          eq: vi.fn()
        insert: vi.fn(),
        upsert: vi.fn()
      })),
      rpc: vi.fn()
    vi.mocked(createClient).mockResolvedValue(mockSupabaseClient)
  })
  afterEach(() => {
    vi.resetAllMocks()
  describe('SupplierScheduleUpdateService', () => {
    let service: SupplierScheduleUpdateService
    beforeEach(() => {
      service = new SupplierScheduleUpdateService(mockSupabaseClient)
    describe('handleTimelineChange', () => {
      it('should process event creation and update affected suppliers', async () => {
        // Arrange
        const timelineChange = {
          type: 'event_created' as const,
          timeline_id: 'timeline-123',
          event_id: 'event-1',
          new_data: {
            id: 'event-1',
            event_title: 'Reception',
            event_time: '18:00:00',
            event_category: 'catering'
          },
          change_metadata: {
            user_id: 'user-123',
            timestamp: new Date().toISOString()
          }
        }
        const mockAffectedSuppliers = [
          {
            id: 'supplier-1',
            business_name: 'Gourmet Catering',
            primary_category: 'catering',
            email: 'info@gourmet.com',
            current_schedule: {
              schedule_items: [],
              version: 1
            },
            status: 'confirmed'
        ]
        const mockTimelineEvents = [
            event_duration_minutes: 180,
            event_category: 'catering',
            event_location: 'Grand Ballroom'
        const mockTimeline = {
          timeline_name: 'Smith Wedding',
          wedding_date: '2024-06-15',
          organization_id: 'org-123'
        // Mock database calls
        mockSupabaseClient.from.mockImplementation((table: string) => {
          if (table === 'supplier_schedules') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  not: vi.fn().mockResolvedValue({
                    data: mockAffectedSuppliers.map(supplier => ({
                      supplier_id: supplier.id,
                      schedule_data: supplier.current_schedule,
                      status: supplier.status,
                      suppliers: {
                        id: supplier.id,
                        business_name: supplier.business_name,
                        primary_category: supplier.primary_category,
                        email: supplier.email
                      }
                    })),
                    error: null
                  })
                }))
              })),
              update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: 'schedule-1' }],
                  error: null
                })
              }))
            }
          if (table === 'timeline_events') {
                  order: vi.fn().mockResolvedValue({
                    data: mockTimelineEvents,
          if (table === 'wedding_timelines') {
                  single: vi.fn().mockResolvedValue({
                    data: mockTimeline,
          return mockSupabaseClient.from()
        })
        // Act
        const results = await service.handleTimelineChange(timelineChange)
        // Assert
        expect(results).toHaveLength(1)
        expect(results[0]).toEqual(expect.objectContaining({
          supplier_id: 'supplier-1',
          success: true,
          updated_events: expect.any(Number)
        }))
      })
      it('should handle no affected suppliers gracefully', async () => {
          type: 'event_updated' as const,
                    data: [], // No affected suppliers
        expect(results).toEqual([])
      it('should handle database errors gracefully', async () => {
          type: 'event_deleted' as const,
        mockSupabaseClient.from.mockImplementation(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              not: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Database connection failed')
              })
            }))
          }))
        // Act & Assert
        await expect(service.handleTimelineChange(timelineChange)).rejects.toThrow('Database connection failed')
  describe('SupplierNotificationService', () => {
    let service: SupplierNotificationService
      service = new SupplierNotificationService(mockSupabaseClient)
    describe('sendScheduleNotification', () => {
      it('should send notification via email successfully', async () => {
        const notificationData = {
          notification_type: 'schedule_generated' as const,
          priority: 'medium' as const,
          data: {
            timeline_name: 'Smith Wedding',
            wedding_date: '2024-06-15',
            supplier_name: 'Perfect Photos',
            contact_email: 'info@perfectphotos.com',
            schedule_summary: {
              total_events: 3,
              earliest_arrival: '2024-06-15T13:00:00Z',
              latest_departure: '2024-06-15T22:00:00Z'
        const mockPreferences = {
          email_enabled: true,
          sms_enabled: false,
          push_enabled: false
        const mockNotificationRecord = {
          id: 'notification-1',
          created_at: new Date().toISOString()
          if (table === 'supplier_notification_preferences') {
                    data: mockPreferences,
          if (table === 'supplier_notifications') {
              insert: vi.fn(() => ({
                select: vi.fn(() => ({
                    data: mockNotificationRecord,
                  data: [mockNotificationRecord],
          if (table === 'in_app_notifications') {
              insert: vi.fn().mockResolvedValue({
                data: [{ id: 'in-app-1' }],
                error: null
        const result = await service.sendScheduleNotification(notificationData)
        expect(result).toEqual(expect.objectContaining({
          notification_id: 'notification-1',
          channels_sent: expect.arrayContaining(['in_app'])
      it('should respect quiet hours and schedule for later', async () => {
          notification_type: 'schedule_updated' as const,
          priority: 'high' as const,
            contact_email: 'info@perfectphotos.com'
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
          timezone: 'Europe/London'
        // Mock current time to be during quiet hours
        const originalDate = Date.now
        vi.spyOn(Date, 'now').mockReturnValue(new Date('2024-06-15T23:00:00Z').getTime())
        expect(result.success).toBe(true)
        expect(result.errors).toContain('Notification scheduled for later due to quiet hours')
        // Restore
        Date.now = originalDate
    describe('Static helper methods', () => {
      it('should notify schedule generated', async () => {
        vi.spyOn(SupplierNotificationService, 'create').mockResolvedValue(service)
        vi.spyOn(service, 'sendScheduleNotification').mockResolvedValue({
          channels_sent: ['email'],
          success: true
        const result = await SupplierNotificationService.notifyScheduleGenerated(
          'supplier-1',
          'timeline-123',
            total_events: 3
        )
        expect(service.sendScheduleNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            notification_type: 'schedule_generated',
            priority: 'medium'
          })
  describe('SupplierAccessTokenService', () => {
    let service: SupplierAccessTokenService
      service = new SupplierAccessTokenService(mockSupabaseClient)
      process.env.JWT_SECRET = 'test-secret-key'
    describe('generateAccessToken', () => {
      it('should generate valid access token with default options', async () => {
        const supplierId = 'supplier-1'
        const timelineId = 'timeline-123'
        const issuedBy = 'user-123'
        const mockTokenRecord = {
          id: 'token-123',
          supplier_id: supplierId,
          timeline_id: timelineId,
          token_hash: 'hash-123',
          permissions: ['view', 'confirm'],
          expires_at: new Date().toISOString(),
          is_active: true
          if (table === 'suppliers') {
                    data: { id: supplierId, business_name: 'Perfect Photos' },
                    data: { id: timelineId, timeline_name: 'Smith Wedding' },
          if (table === 'supplier_access_tokens') {
                    data: mockTokenRecord,
        vi.mocked(jwt.sign).mockReturnValue('signed.jwt.token')
        const result = await service.generateAccessToken(supplierId, timelineId, {}, issuedBy)
          token: 'signed.jwt.token',
          record: expect.objectContaining({
            id: 'token-123',
            supplier_id: supplierId,
            timeline_id: timelineId
        expect(jwt.sign).toHaveBeenCalledWith(
            timeline_id: timelineId,
            permissions: ['view', 'confirm']
          }),
          'test-secret-key',
          expect.any(Object)
      it('should handle custom token options', async () => {
        const options = {
          expires_in_days: 7,
          usage_limit: 5,
          permissions: ['view'] as const,
          ip_restrictions: ['192.168.1.1'],
          one_time_use: true
        // Mock successful database operations
              single: vi.fn().mockResolvedValue({ data: {}, error: null }),
                eq: vi.fn().mockResolvedValue({ data: [], error: null })
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'token-123' },
            eq: vi.fn().mockResolvedValue({ data: [], error: null })
        const result = await service.generateAccessToken('supplier-1', 'timeline-123', options)
        expect(result.token).toBe('signed.jwt.token')
            permissions: ['view'],
            usage_limit: 5,
            ip_restrictions: ['192.168.1.1']
            expiresIn: '7d'
    describe('validateAccessToken', () => {
      it('should validate token successfully', async () => {
        const mockToken = 'valid.jwt.token'
        const mockDecodedToken = {
          token_id: 'token-123',
          permissions: ['view', 'confirm']
          is_active: true,
          expires_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          usage_count: 0,
          usage_limit: null,
        vi.mocked(jwt.verify).mockReturnValue(mockDecodedToken)
                  data: [mockTokenRecord],
          if (table === 'supplier_token_usage_logs') {
                data: [{ id: 'log-1' }],
        const result = await service.validateAccessToken(mockToken, 'view', '192.168.1.1')
          valid: true,
          payload: mockDecodedToken,
          expires_in_hours: expect.any(Number)
        expect(jwt.verify).toHaveBeenCalledWith(mockToken, 'test-secret-key')
      it('should reject expired token', async () => {
        const mockToken = 'expired.jwt.token'
          token_id: 'token-123'
          expires_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          permissions: ['view']
        const result = await service.validateAccessToken(mockToken)
        expect(result).toEqual({
          valid: false,
          error: 'Token has expired'
      it('should reject token with insufficient permissions', async () => {
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          permissions: ['view'] // Only has view permission
        const result = await service.validateAccessToken(mockToken, 'export') // Requires export permission
          error: 'Token does not have required permission: export'
      it('should generate token via static method', async () => {
        vi.spyOn(SupplierAccessTokenService, 'create').mockResolvedValue(service)
        vi.spyOn(service, 'generateAccessToken').mockResolvedValue({
          token: 'generated.token',
          record: { id: 'token-123' } as any
        const token = await SupplierAccessTokenService.generateToken('supplier-1', 'timeline-123')
        expect(token).toBe('generated.token')
        expect(service.generateAccessToken).toHaveBeenCalledWith('supplier-1', 'timeline-123', undefined)
      it('should validate token via static method', async () => {
        const expectedResult = { valid: true, payload: {} }
        vi.spyOn(service, 'validateAccessToken').mockResolvedValue(expectedResult)
        const result = await SupplierAccessTokenService.validateToken('token', 'view', '192.168.1.1')
        expect(result).toEqual(expectedResult)
        expect(service.validateAccessToken).toHaveBeenCalledWith('token', 'view', '192.168.1.1')
  describe('ScheduleExportService', () => {
    let service: ScheduleExportService
      service = new ScheduleExportService(mockSupabaseClient)
    describe('exportSchedule', () => {
      it('should export schedule as JSON', async () => {
        const mockScheduleData = {
          supplier_name: 'Perfect Photos',
          supplier_category: 'photography',
          supplier_contact: { email: 'info@perfectphotos.com' },
          schedule_items: [
            {
              event_id: 'event-1',
              event_title: 'Ceremony',
              scheduled_arrival: '2024-06-15T13:45:00Z',
              event_start: '2024-06-15T14:00:00Z',
              event_end: '2024-06-15T15:00:00Z',
              scheduled_departure: '2024-06-15T15:15:00Z',
              location: 'Church of St. Mary',
              category: 'photography'
          ],
          generated_at: new Date().toISOString(),
          status: 'confirmed'
                    data: {
                      schedule_data: mockScheduleData,
                      status: 'confirmed',
                        business_name: 'Perfect Photos',
                        primary_category: 'photography',
                        email: 'info@perfectphotos.com'
                      },
                      wedding_timelines: {
                        timeline_name: 'Smith Wedding',
                        wedding_date: '2024-06-15'
                    },
        const result = await service.exportSchedule('supplier-1', 'timeline-123', { format: 'json' })
        expect(result.content_type).toBe('application/json')
        expect(result.filename).toMatch(/wedding_schedule_perfect_photos_20240615\.json/)
        expect(result.data).toBeInstanceOf(Buffer)
        expect(result.size_bytes).toBeGreaterThan(0)
      it('should export schedule as CSV', async () => {
              event_description: 'Wedding ceremony photography',
              category: 'photography',
              duration_minutes: 60,
              status: 'confirmed'
          ]
                data: { schedule_data: mockScheduleData },
        const result = await service.exportSchedule('supplier-1', 'timeline-123', { format: 'csv' })
        expect(result.content_type).toBe('text/csv')
        expect(result.filename).toMatch(/\.csv$/)
        
        const csvContent = result.data!.toString()
        expect(csvContent).toContain('Event Title,Event Description,Arrival Time')
        expect(csvContent).toContain('Ceremony,Wedding ceremony photography')
      it('should export schedule as ICS calendar', async () => {
        const result = await service.exportSchedule('supplier-1', 'timeline-123', { format: 'ics' })
        expect(result.content_type).toBe('text/calendar')
        expect(result.filename).toMatch(/\.ics$/)
        const icsContent = result.data!.toString()
        expect(icsContent).toContain('BEGIN:VCALENDAR')
        expect(icsContent).toContain('BEGIN:VEVENT')
        expect(icsContent).toContain('SUMMARY:Ceremony')
        expect(icsContent).toContain('LOCATION:Church of St. Mary')
        expect(icsContent).toContain('END:VCALENDAR')
      it('should handle schedule not found error', async () => {
                error: new Error('Schedule not found')
        expect(result.success).toBe(false)
        expect(result.error).toContain('Schedule not found')
      it('should handle unsupported export format', async () => {
        const result = await service.exportSchedule('supplier-1', 'timeline-123', { 
          format: 'xml' as any 
        expect(result.error).toContain('Unsupported export format: xml')
    describe('Static helper method', () => {
      it('should export via static method', async () => {
        vi.spyOn(ScheduleExportService, 'create').mockResolvedValue(service)
        vi.spyOn(service, 'exportSchedule').mockResolvedValue({
          filename: 'test.json',
          content_type: 'application/json',
          data: Buffer.from('{}')
        const result = await ScheduleExportService.quickExport('supplier-1', 'timeline-123', 'json')
        expect(service.exportSchedule).toHaveBeenCalledWith('supplier-1', 'timeline-123', { format: 'json' })
})
