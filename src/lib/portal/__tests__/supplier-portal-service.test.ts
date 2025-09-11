import { SupplierPortalService } from '../supplier-portal-service'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { SupplierDashboard, SupplierScheduleOverview, SupplierCommunicationHub } from '@/types/supplier-communication'
import { createClient } from '@/lib/supabase/server'

// Mock dependencies
jest.mock('@/lib/supabase/server')
// Mock data
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn(),
  data: null,
  error: null
}
const mockDashboardData = {
  upcoming_events: [
    {
      id: 'event-1',
      title: 'Wedding Photography',
      start_time: '2024-06-15T10:00:00Z',
      couple_names: 'Alice & Bob',
      location: 'Grand Hotel'
    },
      id: 'event-2',
      title: 'Engagement Session',
      start_time: '2024-06-20T14:00:00Z',
      couple_names: 'John & Jane',
      location: 'Central Park'
    }
  ],
  recent_communications: [
      id: 'comm-1',
      type: 'schedule_update',
      message: 'Schedule updated for Alice & Bob wedding',
      timestamp: '2024-01-15T10:00:00Z',
      read: false
  schedule_statistics: {
    total_events_this_month: 12,
    completed_events: 8,
    upcoming_events: 4,
    average_event_duration: '6.5 hours',
    total_revenue_this_month: 15000,
    client_satisfaction_rating: 4.8
  },
  quick_actions: [
    { id: 'update_availability', label: 'Update Availability', url: '/availability' },
    { id: 'view_schedule', label: 'View Full Schedule', url: '/schedule' }
  ]
describe('SupplierPortalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })
  describe('getSupplierDashboard', () => {
    it('should return complete dashboard data', async () => {
      // Mock multiple database queries for dashboard components
      mockSupabaseClient.data = mockDashboardData.upcoming_events
      mockSupabaseClient.error = null
      const result = await SupplierPortalService.getSupplierDashboard(
        'supplier-1',
        'org-1'
      )
      expect(result).toBeDefined()
      expect(result.upcoming_events).toHaveLength(2)
      expect(result.upcoming_events[0].title).toBe('Wedding Photography')
      expect(result.schedule_statistics).toBeDefined()
      expect(result.quick_actions).toBeDefined()
    })
    it('should handle empty upcoming events', async () => {
      mockSupabaseClient.data = []
      expect(result.upcoming_events).toHaveLength(0)
    it('should calculate schedule statistics correctly', async () => {
      expect(result.schedule_statistics.total_events_this_month).toBeDefined()
      expect(result.schedule_statistics.completed_events).toBeDefined()
      expect(result.schedule_statistics.upcoming_events).toBeDefined()
      expect(typeof result.schedule_statistics.average_event_duration).toBe('string')
    it('should handle database errors', async () => {
      mockSupabaseClient.data = null
      mockSupabaseClient.error = { message: 'Database connection failed' }
      await expect(
        SupplierPortalService.getSupplierDashboard('supplier-1', 'org-1')
      ).rejects.toThrow('Database connection failed')
    it('should filter dashboard data by supplier', async () => {
      await SupplierPortalService.getSupplierDashboard('supplier-1', 'org-1')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('supplier_id', 'supplier-1')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('organization_id', 'org-1')
  describe('getSupplierScheduleOverview', () => {
    const mockScheduleData = {
      monthly_events: [
        {
          id: 'event-1',
          title: 'Wedding Photography',
          start_time: '2024-06-15T10:00:00Z',
          end_time: '2024-06-15T18:00:00Z',
          status: 'confirmed',
          couple_names: 'Alice & Bob'
        },
          id: 'event-2',
          title: 'Rehearsal Dinner',
          start_time: '2024-06-14T19:00:00Z',
          end_time: '2024-06-14T22:00:00Z',
          status: 'tentative',
        }
      ],
      availability_slots: [
        { date: '2024-06-16', available: true, hours: '9:00-17:00' },
        { date: '2024-06-17', available: false, reason: 'booked' }
      schedule_conflicts: [],
      month_statistics: {
        total_events: 15,
        confirmed_events: 12,
        tentative_events: 3,
        total_hours_booked: 85,
        revenue_projected: 18500
      }
    it('should return schedule overview for current month', async () => {
      mockSupabaseClient.data = mockScheduleData.monthly_events
      const result = await SupplierPortalService.getSupplierScheduleOverview(
      expect(result.monthly_events).toHaveLength(2)
      expect(result.month_statistics).toBeDefined()
      expect(result.availability_slots).toBeDefined()
    it('should filter by specific month and year', async () => {
      mockSupabaseClient.data = [mockScheduleData.monthly_events[0]]
        'org-1',
        6, // June
        2024
      expect(result.monthly_events).toHaveLength(1)
      expect(mockSupabaseClient.gte).toHaveBeenCalledWith('start_time', '2024-06-01T00:00:00.000Z')
      expect(mockSupabaseClient.lte).toHaveBeenCalledWith('start_time', '2024-06-30T23:59:59.999Z')
    it('should identify schedule conflicts', async () => {
      const conflictingEvents = [
          end_time: '2024-06-15T14:00:00Z'
          start_time: '2024-06-15T12:00:00Z', // Overlaps with event-1
          end_time: '2024-06-15T16:00:00Z'
      ]
      mockSupabaseClient.data = conflictingEvents
      expect(result.schedule_conflicts).toHaveLength(1)
      expect(result.schedule_conflicts[0].conflict_type).toBe('time_overlap')
    it('should calculate availability slots', async () => {
        6,
      expect(Array.isArray(result.availability_slots)).toBe(true)
      expect(result.availability_slots.length).toBeGreaterThan(0)
  describe('getSupplierCommunicationHub', () => {
    const mockCommunicationData = {
      unread_messages: [
          id: 'msg-1',
          type: 'schedule_update',
          from: 'coordinator@eliteweddings.com',
          subject: 'Schedule Change Request',
          message: 'Client requested time change for June 15th event',
          timestamp: '2024-01-15T14:30:00Z',
          priority: 'high',
          read: false
      recent_notifications: [
          id: 'notif-1',
          type: 'schedule_reminder',
          title: 'Upcoming Event Reminder',
          message: 'Wedding photography session in 2 hours',
          timestamp: '2024-01-15T08:00:00Z',
          read: true
      feedback_requests: [
          id: 'feedback-1',
          event_id: 'event-1',
          couple_names: 'Alice & Bob',
          request_type: 'post_event_feedback',
          due_date: '2024-01-20T00:00:00Z',
          status: 'pending'
      communication_preferences: {
        email_notifications: true,
        sms_notifications: false,
        push_notifications: true,
        notification_frequency: 'immediate',
        quiet_hours: { start: '22:00', end: '07:00' }
    it('should return communication hub data', async () => {
      mockSupabaseClient.data = mockCommunicationData.unread_messages
      const result = await SupplierPortalService.getSupplierCommunicationHub(
      expect(result.unread_messages).toBeDefined()
      expect(result.recent_notifications).toBeDefined()
      expect(result.feedback_requests).toBeDefined()
      expect(result.communication_preferences).toBeDefined()
    it('should prioritize high-priority messages', async () => {
      const messagesWithPriority = [
        { ...mockCommunicationData.unread_messages[0], priority: 'low' },
        { ...mockCommunicationData.unread_messages[0], id: 'msg-2', priority: 'high' },
        { ...mockCommunicationData.unread_messages[0], id: 'msg-3', priority: 'urgent' }
      mockSupabaseClient.data = messagesWithPriority
      // High and urgent priority messages should be at the top
      expect(result.unread_messages[0].priority).toBe('urgent')
      expect(result.unread_messages[1].priority).toBe('high')
      expect(result.unread_messages[2].priority).toBe('low')
    it('should filter unread messages', async () => {
      const mixedMessages = [
        { ...mockCommunicationData.unread_messages[0], read: false },
        { ...mockCommunicationData.unread_messages[0], id: 'msg-2', read: true },
        { ...mockCommunicationData.unread_messages[0], id: 'msg-3', read: false }
      mockSupabaseClient.data = mixedMessages
      expect(result.unread_messages).toHaveLength(2)
      expect(result.unread_messages.every(msg => !msg.read)).toBe(true)
  describe('updateSupplierProfile', () => {
    const mockProfileUpdate = {
      phone: '+1234567890',
      address: '123 Main St, Anytown, ST 12345',
      emergency_contact: {
        name: 'Jane Doe',
        phone: '+0987654321',
        relationship: 'spouse'
      },
      notification_preferences: {
        sms_notifications: true,
        push_notifications: false,
        notification_frequency: 'daily'
    it('should update supplier profile successfully', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: 'user-123', updated_at: new Date().toISOString() },
        error: null
      })
      const result = await SupplierPortalService.updateSupplierProfile(
        mockProfileUpdate
      expect(result.success).toBe(true)
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        ...mockProfileUpdate,
        updated_at: expect.any(String)
    it('should validate profile update data', async () => {
      const invalidUpdate = {
        phone: 'invalid-phone-number',
        email: 'invalid-email'
        invalidUpdate
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid phone number format')
    it('should handle database update errors', async () => {
        data: null,
        error: { message: 'Update failed - constraint violation' }
      expect(result.error).toContain('constraint violation')
    it('should handle partial profile updates', async () => {
      const partialUpdate = {
        phone: '+1234567890'
        data: { id: 'user-123' },
        partialUpdate
        phone: '+1234567890',
  describe('markNotificationsAsRead', () => {
    it('should mark multiple notifications as read', async () => {
      const notificationIds = ['notif-1', 'notif-2', 'notif-3']
      mockSupabaseClient.data = { count: 3 }
      const result = await SupplierPortalService.markNotificationsAsRead(
        notificationIds
      expect(result.updated_count).toBe(3)
    it('should handle empty notification list', async () => {
        []
      expect(result.updated_count).toBe(0)
    it('should handle invalid notification IDs', async () => {
      const invalidIds = ['invalid-id-1', 'invalid-id-2']
      mockSupabaseClient.data = { count: 0 }
        invalidIds
  describe('getSupplierAnalytics', () => {
    const mockAnalyticsData = {
      performance_metrics: {
        events_completed: 45,
        average_rating: 4.8,
        on_time_percentage: 96,
        client_retention_rate: 85
      revenue_analytics: {
        total_revenue: 125000,
        average_event_value: 2500,
        revenue_growth: 15.3,
        top_service_categories: [
          { category: 'wedding_photography', revenue: 85000, events: 34 },
          { category: 'engagement_sessions', revenue: 40000, events: 20 }
        ]
      client_feedback: {
        total_reviews: 67,
        rating_distribution: {
          5: 45,
          4: 18,
          3: 3,
          2: 1,
          1: 0
        recent_feedback: [
          {
            rating: 5,
            comment: 'Absolutely wonderful photographer!',
            client_names: 'Alice & Bob',
            event_date: '2024-01-10'
          }
    it('should return supplier analytics', async () => {
      mockSupabaseClient.data = mockAnalyticsData.performance_metrics
      const result = await SupplierPortalService.getSupplierAnalytics(
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-12-31')
      expect(result.performance_metrics).toBeDefined()
      expect(result.revenue_analytics).toBeDefined()
      expect(result.client_feedback).toBeDefined()
    it('should filter analytics by date range', async () => {
      const startDate = new Date('2024-06-01')
      const endDate = new Date('2024-06-30')
      await SupplierPortalService.getSupplierAnalytics(
        { start_date: startDate, end_date: endDate }
      expect(mockSupabaseClient.gte).toHaveBeenCalledWith('event_date', '2024-06-01T00:00:00.000Z')
      expect(mockSupabaseClient.lte).toHaveBeenCalledWith('event_date', '2024-06-30T23:59:59.999Z')
  describe('error handling', () => {
    it('should handle missing supplier ID', async () => {
        SupplierPortalService.getSupplierDashboard('', 'org-1')
      ).rejects.toThrow('Supplier ID is required')
    it('should handle missing organization ID', async () => {
        SupplierPortalService.getSupplierDashboard('supplier-1', '')
      ).rejects.toThrow('Organization ID is required')
    it('should handle database connection timeouts', async () => {
      mockSupabaseClient.error = { message: 'Connection timeout' }
        SupplierPortalService.getSupplierScheduleOverview('supplier-1', 'org-1')
      ).rejects.toThrow('Connection timeout')
    it('should handle invalid date parameters', async () => {
        SupplierPortalService.getSupplierScheduleOverview(
          'supplier-1',
          'org-1',
          13, // Invalid month
          2024
        )
      ).rejects.toThrow('Invalid month')
  describe('data formatting', () => {
    it('should format event dates correctly', async () => {
      const rawEvent = {
        id: 'event-1',
        title: 'Test Event',
        start_time: '2024-06-15T10:00:00.000Z',
        end_time: '2024-06-15T18:00:00.000Z'
      mockSupabaseClient.data = [rawEvent]
      const result = await SupplierPortalService.getSupplierDashboard('supplier-1', 'org-1')
      expect(result.upcoming_events[0].start_time).toEqual(new Date(rawEvent.start_time))
      expect(result.upcoming_events[0].end_time).toEqual(new Date(rawEvent.end_time))
    it('should sanitize client information based on privacy settings', async () => {
      const sensitiveEvent = {
        title: 'Wedding Photography',
        couple_names: 'John & Jane Doe',
        location: '123 Private St, Secret City',
        client_phone: '+1234567890',
        privacy_level: 'high'
      mockSupabaseClient.data = [sensitiveEvent]
      // High privacy should mask sensitive details
      expect(result.upcoming_events[0].couple_names).toBe('J*** & J*** D***')
      expect(result.upcoming_events[0].location).toContain('***')
})
