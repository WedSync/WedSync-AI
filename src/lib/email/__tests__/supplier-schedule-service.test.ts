import { SupplierScheduleEmailService } from '../supplier-schedule-service'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailService } from '../service'
import { SupplierContactInfo, SupplierScheduleEvent, ScheduleChangeDetails } from '@/types/supplier-communication'
import { createClient } from '@/lib/supabase/server'
import { setupSecureTestEnvironment, cleanupSecureTestEnvironment } from '@/__tests__/utils/secure-test-env';

// Mock dependencies
vest.mock('../service')
vi.mock('@/lib/supabase/server')
// 🔒 SECURITY FIX: Remove hardcoded environment config
// Using secure test environment manager instead
// Mock data
const mockSupplier: SupplierContactInfo = {
  id: 'supplier-1',
  name: 'John Doe',
  email: 'john@photography.com',
  phone: '+1234567890',
  company_name: 'John Photography',
  role: 'photographer',
  organization_id: 'org-1'
}
const mockScheduleEvent: SupplierScheduleEvent = {
  id: 'event-1',
  title: 'Wedding Photography',
  start_time: new Date('2024-06-15T10:00:00Z'),
  end_time: new Date('2024-06-15T18:00:00Z'),
  location: 'Grand Hotel',
  event_type: 'wedding_day',
  couple_names: 'Alice & Bob',
  wedding_date: new Date('2024-06-15'),
  supplier_id: 'supplier-1',
  organization_id: 'org-1',
  client_id: 'client-1',
  status: 'scheduled'
const mockChangeDetails: ScheduleChangeDetails = {
  change_type: 'time_update',
  original_values: { start_time: '09:00', end_time: '17:00' },
  new_values: { start_time: '10:00', end_time: '18:00' },
  change_reason: 'Client requested later start time',
  urgency_level: 'medium'
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  data: null,
  error: null
const mockEmailService = {
  sendTemplateEmail: jest.fn(),
  logEmailActivity: jest.fn()
describe('SupplierScheduleEmailService', () => {
  let testEnvManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // 🔒 SECURITY FIX: Use secure test environment
    testEnvManager = setupSecureTestEnvironment();
    (createClient as vi.Mock).mockReturnValue(mockSupabaseClient);
    (EmailService as any).mockImplementation(() => mockEmailService as any)
  })

  afterEach(() => {
    // 🧹 SECURITY CLEANUP: Remove test environment variables
    cleanupSecureTestEnvironment();
  })
  describe('sendScheduleUpdateNotification', () => {
    it('should send schedule update email successfully', async () => {
      mockEmailService.sendTemplateEmail.mockResolvedValue({
        success: true,
        messageId: 'msg-123'
      })
      mockSupabaseClient.single.mockResolvedValue({
        data: { notification_preferences: { email_notifications: true } },
        error: null
      const result = await SupplierScheduleEmailService.sendScheduleUpdateNotification(
        mockSupplier,
        mockScheduleEvent,
        mockChangeDetails,
        'org-1'
      )
      expect(result.success).toBe(true)
      expect(result.email_id).toBe('msg-123')
      expect(mockEmailService.sendTemplateEmail).toHaveBeenCalledWith(
        mockSupplier.email,
        expect.objectContaining({
          subject: expect.stringContaining('Schedule Update'),
          template: 'supplier-schedule-update'
        }),
        expect.any(Object)
    })
    it('should handle email disabled in preferences', async () => {
        data: { notification_preferences: { email_notifications: false } },
      expect(result.skipped).toBe(true)
      expect(result.reason).toBe('Email notifications disabled')
      expect(mockEmailService.sendTemplateEmail).not.toHaveBeenCalled()
    it('should handle email service failure', async () => {
        success: false,
        error: 'Email service unavailable'
      expect(result.success).toBe(false)
      expect(result.error).toBe('Email service unavailable')
    it('should handle database error when fetching preferences', async () => {
        data: null,
        error: { message: 'Database connection failed' }
      expect(result.error).toContain('Database connection failed')
  describe('sendScheduleCancellationNotification', () => {
    it('should send cancellation email with proper urgency', async () => {
        messageId: 'msg-456'
      const cancellationReason = 'Wedding postponed due to weather'
      
      const result = await SupplierScheduleEmailService.sendScheduleCancellationNotification(
        cancellationReason,
          subject: expect.stringContaining('CANCELLED'),
          template: 'supplier-schedule-cancellation'
          cancellationReason
        })
  describe('sendScheduleReminderNotification', () => {
    it('should send reminder email with event details', async () => {
        messageId: 'msg-789'
      const result = await SupplierScheduleEmailService.sendScheduleReminderNotification(
        'org-1',
        { hours_before: 24 }
          subject: expect.stringContaining('Reminder'),
          template: 'supplier-schedule-reminder'
          reminderType: '24 hours before'
    it('should handle different reminder types', async () => {
        messageId: 'msg-reminder'
      // Test 1 week before reminder
      await SupplierScheduleEmailService.sendScheduleReminderNotification(
        { days_before: 7 }
          reminderType: '7 days before'
  describe('sendBulkScheduleNotifications', () => {
    const mockSuppliers = [mockSupplier, { ...mockSupplier, id: 'supplier-2', email: 'jane@catering.com' }]
    const mockEvents = [mockScheduleEvent, { ...mockScheduleEvent, id: 'event-2', supplier_id: 'supplier-2' }]
    it('should send bulk notifications successfully', async () => {
      mockEmailService.sendTemplateEmail
        .mockResolvedValueOnce({ success: true, messageId: 'msg-1' })
        .mockResolvedValueOnce({ success: true, messageId: 'msg-2' })
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { notification_preferences: { email_notifications: true } }, error: null })
      const result = await SupplierScheduleEmailService.sendBulkScheduleNotifications(
        mockSuppliers.map((supplier, index) => ({
          supplier,
          scheduleEvent: mockEvents[index],
          changeDetails: mockChangeDetails
        })),
        'schedule_update',
      expect(result.sent_count).toBe(2)
      expect(result.failed_count).toBe(0)
      expect(result.results).toHaveLength(2)
      expect(mockEmailService.sendTemplateEmail).toHaveBeenCalledTimes(2)
    it('should handle partial failures in bulk send', async () => {
        .mockResolvedValueOnce({ success: false, error: 'Invalid email' })
        .mockResolvedValue({ data: { notification_preferences: { email_notifications: true } }, error: null })
      expect(result.sent_count).toBe(1)
      expect(result.failed_count).toBe(1)
      expect(result.results[0].success).toBe(true)
      expect(result.results[1].success).toBe(false)
    it('should handle empty bulk notification list', async () => {
        [],
      expect(result.sent_count).toBe(0)
      expect(result.results).toHaveLength(0)
  describe('error handling', () => {
    it('should handle network timeouts gracefully', async () => {
      mockEmailService.sendTemplateEmail.mockRejectedValue(new Error('Network timeout'))
      expect(result.error).toContain('Network timeout')
    it('should validate required parameters', async () => {
        null as any,
      expect(result.error).toContain('Supplier information is required')
})
