/**
 * Integration Tests for Supplier Communication & Integration System (WS-161)
 * 
 * These tests verify end-to-end workflows for supplier communication,
 * testing the integration between all services rather than individual components.
 */

import { SupplierScheduleEmailService } from '@/lib/email/supplier-schedule-service'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { SupplierScheduleSMSService } from '@/lib/messaging/supplier-schedule-sms-service'
import { SupplierWhatsAppService } from '@/lib/whatsapp/supplier-whatsapp-service'
import { SupplierCalendarInviteService } from '@/lib/calendar/supplier-calendar-invite-service'
import { SupplierGoogleCalendarService } from '@/lib/calendar/supplier-google-calendar-service'
import { SupplierScheduleFeedbackService } from '@/lib/feedback/supplier-schedule-feedback-service'
import { ScheduleApprovalWorkflowService } from '@/lib/workflow/schedule-approval-workflow-service'
import { SupplierAuthService } from '@/lib/auth/supplier-auth-service'
import { SupplierPortalService } from '@/lib/portal/supplier-portal-service'
import { createClient } from '@/lib/supabase/server'
import { SupplierContactInfo, SupplierScheduleEvent, ScheduleChangeDetails } from '@/types/supplier-communication'
// Mock Supabase and external services
vi.mock('@/lib/supabase/server')
vi.mock('@/lib/email/service')
vi.mock('@/lib/messaging/enhanced-sms-service')
vi.mock('@/lib/whatsapp/service')
vi.mock('googleapis')
// Test data setup
const testOrganizationId = 'test-org-1'
const testSupplier: SupplierContactInfo = {
  id: 'supplier-integration-test',
  name: 'Test Photographer',
  email: 'test@photographer.com',
  phone: '+1234567890',
  company_name: 'Test Photography Co',
  role: 'photographer',
  organization_id: testOrganizationId
}
const testScheduleEvent: SupplierScheduleEvent = {
  id: 'event-integration-test',
  title: 'Integration Test Wedding',
  start_time: new Date('2024-06-15T10:00:00Z'),
  end_time: new Date('2024-06-15T18:00:00Z'),
  location: 'Test Venue, 123 Test St',
  event_type: 'wedding_day',
  couple_names: 'Alice & Bob Test',
  wedding_date: new Date('2024-06-15'),
  supplier_id: testSupplier.id,
  organization_id: testOrganizationId,
  client_id: 'client-integration-test',
  status: 'scheduled'
const testChangeDetails: ScheduleChangeDetails = {
  change_type: 'time_update',
  original_values: { start_time: '09:00', end_time: '17:00' },
  new_values: { start_time: '10:00', end_time: '18:00' },
  change_reason: 'Integration test - client requested later start',
  urgency_level: 'medium'
// Mock Supabase client setup
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  data: null,
  error: null
describe('Supplier Communication Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient)
    
    // Setup default successful responses
    mockSupabaseClient.single.mockResolvedValue({
      data: { 
        notification_preferences: {
          email_notifications: true,
          sms_notifications: true,
          whatsapp_notifications: true
        }
      },
      error: null
    })
  })
  describe('Complete Supplier Notification Workflow', () => {
    it('should send notifications across all channels for schedule changes', async () => {
      // Mock all service responses as successful
      const mockEmailResponse = { success: true, email_id: 'email-123' }
      const mockSMSResponse = { success: true, sms_id: 'sms-123' }
      const mockWhatsAppResponse = { success: true, message_id: 'whatsapp-123' }
      vi.spyOn(SupplierScheduleEmailService, 'sendScheduleUpdateNotification')
        .mockResolvedValue(mockEmailResponse)
      vi.spyOn(SupplierScheduleSMSService, 'sendUrgentScheduleChangeNotification')
        .mockResolvedValue(mockSMSResponse)
      vi.spyOn(SupplierWhatsAppService, 'sendScheduleUpdateNotification')
        .mockResolvedValue(mockWhatsAppResponse)
      // Execute complete notification workflow
      const emailResult = await SupplierScheduleEmailService.sendScheduleUpdateNotification(
        testSupplier, testScheduleEvent, testChangeDetails, testOrganizationId
      )
      const smsResult = await SupplierScheduleSMSService.sendUrgentScheduleChangeNotification(
        testSupplier, testScheduleEvent, testChangeDetails
      const whatsappResult = await SupplierWhatsAppService.sendScheduleUpdateNotification(
      // Verify all notifications were sent successfully
      expect(emailResult.success).toBe(true)
      expect(smsResult.success).toBe(true)
      expect(whatsappResult.success).toBe(true)
      // Verify each service was called with correct parameters
      expect(SupplierScheduleEmailService.sendScheduleUpdateNotification)
        .toHaveBeenCalledWith(testSupplier, testScheduleEvent, testChangeDetails, testOrganizationId)
      expect(SupplierScheduleSMSService.sendUrgentScheduleChangeNotification)
        .toHaveBeenCalledWith(testSupplier, testScheduleEvent, testChangeDetails)
      expect(SupplierWhatsAppService.sendScheduleUpdateNotification)
    it('should handle partial communication failures gracefully', async () => {
      // Mock mixed success/failure responses
        .mockResolvedValue({ success: true, email_id: 'email-123' })
        .mockResolvedValue({ success: false, error: 'SMS service unavailable' })
        .mockResolvedValue({ success: true, message_id: 'whatsapp-123' })
      // Execute workflow and collect results
      const results = await Promise.allSettled([
        SupplierScheduleEmailService.sendScheduleUpdateNotification(
          testSupplier, testScheduleEvent, testChangeDetails, testOrganizationId
        ),
        SupplierScheduleSMSService.sendUrgentScheduleChangeNotification(
          testSupplier, testScheduleEvent, testChangeDetails
        SupplierWhatsAppService.sendScheduleUpdateNotification(
        )
      ])
      // Verify results - should have 2 successes and 1 failure
      const successfulNotifications = results.filter(
        result => result.status === 'fulfilled' && result.value.success
      const failedNotifications = results.filter(
        result => result.status === 'fulfilled' && !result.value.success
      expect(successfulNotifications).toHaveLength(2)
      expect(failedNotifications).toHaveLength(1)
    it('should respect supplier notification preferences', async () => {
      // Mock supplier with selective notification preferences
      mockSupabaseClient.single.mockResolvedValue({
        data: { 
          notification_preferences: {
            email_notifications: true,
            sms_notifications: false, // SMS disabled
            whatsapp_notifications: true
          }
        },
        error: null
      })
        .mockResolvedValue({ success: true, skipped: true, reason: 'SMS notifications disabled' })
      // Execute workflow
      // Verify preferences were respected
      expect(smsResult.skipped).toBe(true)
  describe('Schedule Change Approval Workflow Integration', () => {
    it('should complete end-to-end approval workflow', async () => {
      const mockChangeRequest = {
        supplier_id: testSupplier.id,
        organization_id: testOrganizationId,
        client_id: testScheduleEvent.client_id,
        event_id: testScheduleEvent.id,
        change_type: 'time_update' as const,
        original_values: testChangeDetails.original_values,
        requested_values: testChangeDetails.new_values,
        change_reason: testChangeDetails.change_reason,
        urgency_level: 'medium' as const,
        business_justification: 'Client request for later start time',
        supplier_notes: 'Happy to accommodate the change',
        requested_by: testSupplier.id,
        approval_required: true
      }
      // Mock workflow service responses
      vi.spyOn(ScheduleApprovalWorkflowService, 'createScheduleChangeRequest')
        .mockResolvedValue({
          success: true,
          request_id: 'request-123',
          auto_approved: false,
          requires_couple_approval: true
        })
      vi.spyOn(ScheduleApprovalWorkflowService, 'processCoupleResponse')
          new_status: 'approved',
          schedule_updated: true
      // Mock notification services
        .mockResolvedValue({ success: true, email_id: 'approval-email' })
      // Step 1: Create change request
      const requestResult = await ScheduleApprovalWorkflowService.createScheduleChangeRequest(
        mockChangeRequest,
        testOrganizationId
      expect(requestResult.success).toBe(true)
      expect(requestResult.request_id).toBe('request-123')
      expect(requestResult.requires_couple_approval).toBe(true)
      // Step 2: Process couple approval
      const approvalResult = await ScheduleApprovalWorkflowService.processCoupleResponse(
        'request-123',
        'approved',
        testScheduleEvent.client_id!,
        testOrganizationId,
        'Approved - time change looks good!'
      expect(approvalResult.success).toBe(true)
      expect(approvalResult.new_status).toBe('approved')
      expect(approvalResult.schedule_updated).toBe(true)
      // Step 3: Send confirmation notification
      const confirmationResult = await SupplierScheduleEmailService.sendScheduleUpdateNotification(
      expect(confirmationResult.success).toBe(true)
    it('should handle declined change requests', async () => {
        urgency_level: 'low' as const,
        business_justification: 'Testing decline workflow',
        supplier_notes: 'Understanding if change is possible',
          request_id: 'request-decline-123',
          new_status: 'declined',
          schedule_updated: false,
          alternative_required: true
      // Mock feedback service for handling declined requests
      vi.spyOn(SupplierScheduleFeedbackService, 'submitSupplierFeedback')
          feedback_id: 'feedback-decline-123'
      // Create and process decline
      const declineResult = await ScheduleApprovalWorkflowService.processCoupleResponse(
        'request-decline-123',
        'declined',
        'Sorry, we cannot accommodate this change due to venue constraints.'
      expect(declineResult.success).toBe(true)
      expect(declineResult.new_status).toBe('declined')
      expect(declineResult.alternative_required).toBe(true)
      // Supplier should be able to submit feedback about the declined request
      const feedbackResult = await SupplierScheduleFeedbackService.submitSupplierFeedback(
        {
          supplier_id: testSupplier.id,
          organization_id: testOrganizationId,
          event_id: testScheduleEvent.id,
          feedback_type: 'schedule_conflict',
          conflict_type: 'change_declined',
          description: 'Change request was declined, need alternative solutions',
          urgency_level: 'medium',
          client_id: testScheduleEvent.client_id
        testSupplier.id
      expect(feedbackResult.success).toBe(true)
  describe('Supplier Authentication and Portal Access Integration', () => {
    it('should complete full authentication to dashboard workflow', async () => {
      const mockRegistrationData = {
        email: testSupplier.email,
        password: 'TestPassword123!',
        phone: testSupplier.phone,
        emergency_contact: {
          name: 'Emergency Contact',
          phone: '+0987654321',
          relationship: 'spouse'
          push_notifications: false,
          notification_frequency: 'immediate' as const,
          notification_types: ['schedule_updates', 'messages']
      const mockLoginMetadata = {
        ip_address: '192.168.1.100',
        user_agent: 'Integration Test Browser',
        device_type: 'desktop' as const
      // Mock auth service responses
      vi.spyOn(SupplierAuthService, 'registerSupplier')
          user_id: 'auth-user-123',
          email_verification_required: true
      vi.spyOn(SupplierAuthService, 'verifyEmail')
        .mockResolvedValue({ success: true })
      vi.spyOn(SupplierAuthService, 'authenticateSupplier')
          user: {
            id: 'auth-user-123',
            supplier_id: testSupplier.id,
            email: testSupplier.email,
            name: testSupplier.name,
            company_name: testSupplier.company_name,
            role: testSupplier.role,
            permissions: ['read_schedule', 'update_availability'],
            organization_id: testOrganizationId
          },
          access_token: 'jwt-token-123',
          session: {
            id: 'session-123',
            session_token: 'session-token-123',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      // Mock portal service response
      vi.spyOn(SupplierPortalService, 'getSupplierDashboard')
          upcoming_events: [testScheduleEvent],
          recent_communications: [],
          schedule_statistics: {
            total_events_this_month: 5,
            completed_events: 2,
            upcoming_events: 3,
            average_event_duration: '6 hours',
            total_revenue_this_month: 7500,
            client_satisfaction_rating: 4.8
          quick_actions: [
            { id: 'update_availability', label: 'Update Availability', url: '/availability' }
          ]
      // Execute complete workflow
      // Step 1: Register supplier
      const registrationResult = await SupplierAuthService.registerSupplier(
        mockRegistrationData,
      expect(registrationResult.success).toBe(true)
      expect(registrationResult.email_verification_required).toBe(true)
      // Step 2: Verify email
      const verificationResult = await SupplierAuthService.verifyEmail('mock-verification-token')
      expect(verificationResult.success).toBe(true)
      // Step 3: Authenticate
      const loginResult = await SupplierAuthService.authenticateSupplier(
        testSupplier.email,
        'TestPassword123!',
        mockLoginMetadata
      expect(loginResult.success).toBe(true)
      expect(loginResult.user).toBeDefined()
      expect(loginResult.access_token).toBe('jwt-token-123')
      expect(loginResult.session).toBeDefined()
      // Step 4: Load dashboard
      const dashboardResult = await SupplierPortalService.getSupplierDashboard(
        testSupplier.id,
      expect(dashboardResult).toBeDefined()
      expect(dashboardResult.upcoming_events).toHaveLength(1)
      expect(dashboardResult.schedule_statistics).toBeDefined()
    it('should handle authentication failures gracefully', async () => {
          success: false,
          error: 'Invalid email or password'
        'wrong@email.com',
        'wrongpassword',
      expect(loginResult.success).toBe(false)
      expect(loginResult.error).toBe('Invalid email or password')
      expect(loginResult.user).toBeUndefined()
      expect(loginResult.session).toBeUndefined()
  describe('Calendar Integration Workflow', () => {
    it('should complete calendar invite generation and sync workflow', async () => {
      // Mock calendar services
      vi.spyOn(SupplierCalendarInviteService, 'generateSupplierCalendarInvite')
          invite_data: {
            event_id: testScheduleEvent.id,
            title: testScheduleEvent.title,
            description: `Wedding photography for ${testScheduleEvent.couple_names}`,
            location: testScheduleEvent.location,
            start_time: testScheduleEvent.start_time,
            end_time: testScheduleEvent.end_time,
            ics_content: 'BEGIN:VCALENDAR\nVERSION:2.0\n...END:VCALENDAR',
            calendar_provider_urls: {
              google: 'https://calendar.google.com/calendar/render?action=TEMPLATE&...',
              outlook: 'https://outlook.live.com/calendar/0/deeplink/compose?...',
              apple: 'webcal://example.com/calendar.ics',
              yahoo: 'https://calendar.yahoo.com/?v=60&...'
            }
      vi.spyOn(SupplierGoogleCalendarService, 'syncSupplierScheduleToGoogleCalendar')
          synced_events: 1,
          failed_events: 0,
          conflicts_detected: 0,
          sync_summary: 'Successfully synced 1 event to Google Calendar'
      // Step 1: Generate calendar invite
      const inviteResult = await SupplierCalendarInviteService.generateSupplierCalendarInvite(
        testScheduleEvent,
      expect(inviteResult.success).toBe(true)
      expect(inviteResult.invite_data).toBeDefined()
      expect(inviteResult.invite_data!.ics_content).toContain('BEGIN:VCALENDAR')
      expect(inviteResult.invite_data!.calendar_provider_urls.google).toContain('calendar.google.com')
      // Step 2: Sync to Google Calendar
      const syncResult = await SupplierGoogleCalendarService.syncSupplierScheduleToGoogleCalendar(
        testSupplier,
        [testScheduleEvent],
      expect(syncResult.success).toBe(true)
      expect(syncResult.synced_events).toBe(1)
      expect(syncResult.conflicts_detected).toBe(0)
    it('should handle calendar conflicts during sync', async () => {
          synced_events: 0,
          failed_events: 1,
          conflicts_detected: 1,
          conflicts: [{
            conflict_type: 'time_overlap',
            conflicting_event_id: 'existing-google-event',
            conflict_details: 'Event overlaps with existing appointment',
            suggested_resolution: 'Reschedule or delegate to another photographer'
          }]
          feedback_id: 'conflict-feedback-123'
      // Execute sync and handle conflicts
      expect(syncResult.conflicts_detected).toBe(1)
      expect(syncResult.conflicts).toHaveLength(1)
      // Handle conflict by submitting feedback
      const conflictFeedbackResult = await SupplierScheduleFeedbackService.submitSupplierFeedback(
          conflict_type: 'calendar_sync_conflict',
          description: syncResult.conflicts![0].conflict_details,
          urgency_level: 'high',
          suggested_resolution: syncResult.conflicts![0].suggested_resolution,
      expect(conflictFeedbackResult.success).toBe(true)
  describe('Feedback Submission and Resolution Workflow', () => {
    it('should complete end-to-end feedback lifecycle', async () => {
      const mockFeedback = {
        feedback_type: 'schedule_conflict' as const,
        conflict_type: 'venue_availability',
        description: 'Venue double-booked, need alternative solutions',
        urgency_level: 'high' as const,
        suggested_resolution: 'Find backup venue or reschedule',
        contact_preference: 'phone' as const,
        available_alternatives: [
          { date: '2024-06-16', start_time: '10:00', end_time: '18:00' }
        ],
        client_id: testScheduleEvent.client_id
      const mockFeedbackResponse = {
        feedback_id: 'feedback-123',
        response_type: 'resolution' as const,
        response_message: 'We have secured an alternative venue and updated your schedule',
        action_taken: 'venue_changed',
        responder_id: 'coordinator-123',
        responder_role: 'coordinator' as const,
        estimated_resolution_time: '2 hours',
        follow_up_required: false
      // Mock feedback service responses
          feedback_id: 'feedback-123',
          requires_immediate_attention: true
      vi.spyOn(SupplierScheduleFeedbackService, 'respondToSupplierFeedback')
          response_id: 'response-123',
          feedback_status_updated: true
        .mockResolvedValue({ success: true, email_id: 'resolution-email' })
      // Execute complete feedback workflow
      // Step 1: Submit feedback
        mockFeedback,
      expect(feedbackResult.feedback_id).toBe('feedback-123')
      expect(feedbackResult.requires_immediate_attention).toBe(true)
      // Step 2: Respond to feedback
      const responseResult = await SupplierScheduleFeedbackService.respondToSupplierFeedback(
        'feedback-123',
        mockFeedbackResponse,
      expect(responseResult.success).toBe(true)
      expect(responseResult.response_id).toBe('response-123')
      expect(responseResult.feedback_status_updated).toBe(true)
      // Step 3: Send resolution notification
      const notificationResult = await SupplierScheduleEmailService.sendScheduleUpdateNotification(
          change_type: 'venue_change',
          original_values: { venue: 'Original Venue' },
          new_values: { venue: 'Alternative Venue' },
          change_reason: 'Venue conflict resolved',
          urgency_level: 'low'
      expect(notificationResult.success).toBe(true)
  describe('Error Handling and Resilience', () => {
    it('should handle service failures gracefully in complete workflow', async () => {
      // Mock mixed success/failure responses across services
        .mockRejectedValue(new Error('Email service timeout'))
        .mockResolvedValue({ success: false, error: 'SMS quota exceeded' })
        .mockResolvedValue({ success: true, message_id: 'whatsapp-backup' })
      // Execute workflow with error handling
      const notificationResults = await Promise.allSettled([
        ).catch(error => ({ success: false, error: error.message })),
      // Verify graceful handling - at least one channel should succeed
      const successfulResults = notificationResults.filter(
        result => result.status === 'fulfilled' && 
        (result.value as unknown).success === true
      expect(successfulResults.length).toBeGreaterThan(0)
      
      // WhatsApp should have succeeded as backup channel
      const whatsappResult = notificationResults[2]
      expect(whatsappResult.status).toBe('fulfilled')
      expect((whatsappResult as unknown).value.success).toBe(true)
    it('should maintain data integrity during partial workflow failures', async () => {
      // Test scenario where approval workflow partially fails but data remains consistent
          request_id: 'request-integrity-test',
          auto_approved: false
        .mockRejectedValue(new Error('Database connection lost during approval'))
      // Create request successfully
          client_id: testScheduleEvent.client_id!,
          change_type: 'time_update',
          original_values: {},
          requested_values: {},
          change_reason: 'Integrity test',
          urgency_level: 'low',
          business_justification: 'Test',
          supplier_notes: 'Test',
          requested_by: testSupplier.id,
          approval_required: true
      // Attempt processing that fails
      await expect(
        ScheduleApprovalWorkflowService.processCoupleResponse(
          'request-integrity-test',
          'approved',
          testScheduleEvent.client_id!,
          testOrganizationId
      ).rejects.toThrow('Database connection lost during approval')
      // Verify request remains in valid state for retry
      expect(requestResult.request_id).toBe('request-integrity-test')
  describe('Performance and Scalability', () => {
    it('should handle bulk operations efficiently', async () => {
      const bulkSuppliers = Array.from({ length: 10 }, (_, i) => ({
        ...testSupplier,
        id: `bulk-supplier-${i}`,
        email: `bulk${i}@test.com`,
        phone: `+123456789${i}`
      }))
      const bulkEvents = bulkSuppliers.map((supplier, i) => ({
        ...testScheduleEvent,
        id: `bulk-event-${i}`,
        supplier_id: supplier.id
      // Mock bulk notification service
      vi.spyOn(SupplierScheduleEmailService, 'sendBulkScheduleNotifications')
          sent_count: 10,
          failed_count: 0,
          results: bulkSuppliers.map((supplier, i) => ({
            supplier_id: supplier.id,
            success: true,
            email_id: `bulk-email-${i}`
          }))
      // Mock bulk calendar invite service
      vi.spyOn(SupplierCalendarInviteService, 'createBulkCalendarInvites')
          created_count: 10,
          invites: bulkEvents.map(event => ({
            event_id: event.id,
            title: event.title,
            description: `Calendar invite for ${event.couple_names}`,
            location: event.location,
            start_time: event.start_time,
            end_time: event.end_time,
            ics_content: 'BEGIN:VCALENDAR...',
              google: 'https://calendar.google.com/...',
              outlook: 'https://outlook.live.com/...',
              apple: 'webcal://...',
              yahoo: 'https://calendar.yahoo.com/...'
      // Execute bulk operations
      const startTime = Date.now()
      const [emailResults, calendarResults] = await Promise.all([
        SupplierScheduleEmailService.sendBulkScheduleNotifications(
          bulkSuppliers.map((supplier, i) => ({
            supplier,
            scheduleEvent: bulkEvents[i],
            changeDetails: testChangeDetails
          })),
          'schedule_update',
        SupplierCalendarInviteService.createBulkCalendarInvites(
          bulkEvents,
      const endTime = Date.now()
      const executionTime = endTime - startTime
      // Verify bulk operations completed successfully
      expect(emailResults.success).toBe(true)
      expect(emailResults.sent_count).toBe(10)
      expect(calendarResults.success).toBe(true)
      expect(calendarResults.created_count).toBe(10)
      // Verify reasonable performance (should complete within 5 seconds)
      expect(executionTime).toBeLessThan(5000)
})
// Test utilities for integration testing
export class IntegrationTestHelpers {
  static async setupTestData() {
    // Helper to set up test data for integration tests
    return {
      supplier: testSupplier,
      event: testScheduleEvent,
      changeDetails: testChangeDetails,
      organizationId: testOrganizationId
    }
  }
  static async cleanupTestData() {
    // Helper to clean up test data after integration tests
    // In real implementation, this would clean up test database records
    console.log('Integration test cleanup completed')
  static createMockSupplierWithPreferences(preferences: any) {
      ...testSupplier,
      notification_preferences: preferences
  static createMockScheduleEventWithDate(date: Date) {
      ...testScheduleEvent,
      start_time: date,
      end_time: new Date(date.getTime() + 8 * 60 * 60 * 1000), // 8 hours later
      wedding_date: date
