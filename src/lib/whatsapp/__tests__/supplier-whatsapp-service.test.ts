import { SupplierWhatsAppService } from '../supplier-whatsapp-service'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { WhatsAppService } from '../service'
import { SupplierContactInfo, SupplierScheduleEvent } from '@/types/supplier-communication'
import { createClient } from '@/lib/supabase/server'

// Mock dependencies
jest.mock('../service')
jest.mock('@/lib/supabase/server')
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
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  data: null,
  error: null
const mockWhatsAppService = {
  sendTemplateMessage: jest.fn(),
  sendTextMessage: jest.fn(),
  sendMediaMessage: jest.fn(),
  getMessageTemplates: jest.fn(),
  processWebhook: jest.fn()
describe('SupplierWhatsAppService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    (WhatsAppService as jest.MockedClass<typeof WhatsAppService>).mockImplementation(() => mockWhatsAppService as any)
  })
  describe('sendScheduleUpdateNotification', () => {
    const mockChangeDetails = {
      change_type: 'time_update',
      original_values: { start_time: '09:00', end_time: '17:00' },
      new_values: { start_time: '10:00', end_time: '18:00' },
      change_reason: 'Client requested later start time',
      urgency_level: 'medium' as const
    }
    it('should send WhatsApp schedule update notification successfully', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { whatsapp_notifications: true },
        error: null
      })
      mockWhatsAppService.sendTemplateMessage.mockResolvedValue({
        success: true,
        messageId: 'whatsapp-msg-123'
      const result = await SupplierWhatsAppService.sendScheduleUpdateNotification(
        mockSupplier,
        mockScheduleEvent,
        mockChangeDetails,
        'org-1'
      )
      expect(result.success).toBe(true)
      expect(result.message_id).toBe('whatsapp-msg-123')
      expect(mockWhatsAppService.sendTemplateMessage).toHaveBeenCalledWith(
        mockSupplier.phone,
        'supplier_schedule_update',
        'en',
        expect.arrayContaining([
          expect.objectContaining({
            type: 'body',
            parameters: expect.arrayContaining([
              { type: 'text', text: mockSupplier.name },
              { type: 'text', text: mockScheduleEvent.couple_names },
              { type: 'text', text: 'Jun 15, 2024' },
              { type: 'text', text: mockChangeDetails.change_reason }
            ])
          })
        ]),
        expect.objectContaining({
          supplier_id: 'supplier-1',
          event_id: 'event-1',
          change_type: 'time_update'
        })
    })
    it('should handle WhatsApp disabled in preferences', async () => {
        data: { whatsapp_notifications: false },
      expect(result.skipped).toBe(true)
      expect(result.reason).toBe('WhatsApp notifications disabled')
      expect(mockWhatsAppService.sendTemplateMessage).not.toHaveBeenCalled()
    it('should handle urgent changes with special template', async () => {
      const urgentChanges = { ...mockChangeDetails, urgency_level: 'urgent' as const }
      
        messageId: 'urgent-msg'
        urgentChanges,
        'supplier_urgent_update',
        expect.any(Array),
        expect.any(Object)
    it('should handle WhatsApp service failures', async () => {
        success: false,
        error: 'WhatsApp API rate limit exceeded'
      expect(result.success).toBe(false)
      expect(result.error).toBe('WhatsApp API rate limit exceeded')
    it('should validate phone number format', async () => {
      const supplierWithInvalidPhone = { ...mockSupplier, phone: 'invalid-phone' }
        supplierWithInvalidPhone,
      expect(result.error).toContain('Invalid phone number')
  describe('sendScheduleReminderNotification', () => {
    const mockReminderSettings = {
      hours_before: 24,
      include_preparation_notes: true,
      include_contact_info: true
    it('should send reminder notification successfully', async () => {
        messageId: 'reminder-msg'
      const result = await SupplierWhatsAppService.sendScheduleReminderNotification(
        'org-1',
        mockReminderSettings
      expect(result.message_id).toBe('reminder-msg')
        'supplier_schedule_reminder',
              { type: 'text', text: '24 hours' },
              { type: 'text', text: mockScheduleEvent.title },
              { type: 'text', text: mockScheduleEvent.location }
          reminder_type: '24_hours_before'
    it('should handle different reminder timings', async () => {
      // Test 2-hour reminder
      await SupplierWhatsAppService.sendScheduleReminderNotification(
        { hours_before: 2 }
              { type: 'text', text: '2 hours' }
          reminder_type: '2_hours_before'
  describe('sendConflictAlertNotification', () => {
    const mockConflictDetails = {
      conflict_type: 'double_booking',
      conflicting_event: {
        title: 'Another Wedding',
        couple_names: 'John & Jane',
        time: '2024-06-15T10:00:00Z'
      },
      resolution_options: ['reschedule', 'cancel', 'delegate'],
      urgency_level: 'high' as const,
      deadline_for_response: new Date('2024-06-14T18:00:00Z')
    it('should send conflict alert notification', async () => {
        messageId: 'conflict-alert'
      const result = await SupplierWhatsAppService.sendConflictAlertNotification(
        mockConflictDetails,
        'supplier_conflict_alert',
              { type: 'text', text: 'double_booking' },
              { type: 'text', text: mockConflictDetails.conflicting_event.title }
          conflict_type: 'double_booking',
          requires_response: true
    it('should include action buttons for conflict resolution', async () => {
        messageId: 'conflict-with-buttons'
      const templateCall = mockWhatsAppService.sendTemplateMessage.mock.calls[0]
      const components = templateCall[2]
      const buttonComponent = components.find(c => c.type === 'buttons')
      expect(buttonComponent).toBeDefined()
      expect(buttonComponent.buttons).toContainEqual(
          type: 'quick_reply',
          text: 'Reschedule',
          payload: 'RESCHEDULE_EVENT'
  describe('sendBulkSupplierNotifications', () => {
    const mockSuppliers = [
      mockSupplier,
      { ...mockSupplier, id: 'supplier-2', phone: '+0987654321', name: 'Jane Smith' }
    ]
    it('should send bulk notifications successfully', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { whatsapp_notifications: true }, error: null })
      mockWhatsAppService.sendTemplateMessage
        .mockResolvedValueOnce({ success: true, messageId: 'bulk-1' })
        .mockResolvedValueOnce({ success: true, messageId: 'bulk-2' })
      const notifications = mockSuppliers.map(supplier => ({
        supplier,
        template: 'supplier_general_announcement',
        message: `Important announcement for ${supplier.name}`,
        parameters: [
          { type: 'text', text: supplier.name },
          { type: 'text', text: 'System maintenance scheduled' }
        ]
      }))
      const result = await SupplierWhatsAppService.sendBulkSupplierNotifications(
        notifications,
      expect(result.sent_count).toBe(2)
      expect(result.failed_count).toBe(0)
      expect(result.results).toHaveLength(2)
      expect(mockWhatsAppService.sendTemplateMessage).toHaveBeenCalledTimes(2)
    it('should handle partial failures in bulk sending', async () => {
        .mockResolvedValue({ data: { whatsapp_notifications: true }, error: null })
        .mockResolvedValueOnce({ success: false, error: 'Invalid phone number' })
        message: `Message for ${supplier.name}`,
        parameters: []
      expect(result.sent_count).toBe(1)
      expect(result.failed_count).toBe(1)
      expect(result.results[0].success).toBe(true)
      expect(result.results[1].success).toBe(false)
    it('should respect rate limiting', async () => {
      const manySuppliers = Array.from({ length: 50 }, (_, i) => ({
        ...mockSupplier,
        id: `supplier-${i}`,
        phone: `+123456789${i.toString().padStart(1, '0')}`
        messageId: 'rate-limited-msg'
      const notifications = manySuppliers.map(supplier => ({
        message: 'Test message',
      const startTime = Date.now()
      const endTime = Date.now()
      // Should take some time due to rate limiting
      expect(endTime - startTime).toBeGreaterThan(1000) // At least 1 second
      expect(result.sent_count).toBe(50)
  describe('processIncomingWhatsAppMessage', () => {
    const mockIncomingMessage = {
      from: '+1234567890',
      message: 'CONFIRM',
      message_id: 'incoming-123',
      timestamp: new Date().toISOString(),
      message_type: 'text'
    it('should process confirmation message', async () => {
        data: {
          id: 'pending-123',
          message_type: 'conflict_alert',
          awaiting_response: true
        },
      const result = await SupplierWhatsAppService.processIncomingWhatsAppMessage(
        mockIncomingMessage,
      expect(result.response_type).toBe('confirmation')
      expect(result.action_taken).toBe('confirmed')
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        supplier_response: 'CONFIRM',
        responded_at: expect.any(String),
        response_processed: true
    it('should process decline message', async () => {
      const declineMessage = { ...mockIncomingMessage, message: 'DECLINE' }
        declineMessage,
      expect(result.response_type).toBe('decline')
      expect(result.action_taken).toBe('declined')
    it('should handle general messages with auto-replies', async () => {
        data: null, // No pending message
      const generalMessage = { ...mockIncomingMessage, message: 'Hello, I need help with my schedule' }
        generalMessage,
      expect(result.response_type).toBe('auto_reply')
      expect(result.auto_reply_sent).toBe(true)
    it('should handle unknown supplier phone numbers', async () => {
      const unknownMessage = { ...mockIncomingMessage, from: '+9999999999' }
        data: null,
        unknownMessage,
      expect(result.error).toContain('Supplier not found')
  describe('getSupplierWhatsAppConversationHistory', () => {
    const mockConversationHistory = [
      {
        id: 'msg-1',
        direction: 'outgoing',
        message_type: 'template',
        content: 'Schedule update notification sent',
        timestamp: '2024-01-15T10:00:00Z',
        template_name: 'supplier_schedule_update',
        delivery_status: 'delivered'
        id: 'msg-2',
        direction: 'incoming',
        message_type: 'text',
        content: 'CONFIRM',
        timestamp: '2024-01-15T10:05:00Z',
        processed: true
      }
    it('should retrieve conversation history', async () => {
      mockSupabaseClient.data = mockConversationHistory
      mockSupabaseClient.error = null
      const result = await SupplierWhatsAppService.getSupplierWhatsAppConversationHistory(
        'supplier-1',
        { limit: 50 }
      expect(result.conversation_history).toHaveLength(2)
      expect(result.conversation_history![0].direction).toBe('outgoing')
      expect(result.conversation_history![1].direction).toBe('incoming')
    it('should filter by message type', async () => {
      mockSupabaseClient.data = [mockConversationHistory[0]] // Only template messages
        { message_type: 'template' }
      expect(result.conversation_history).toHaveLength(1)
      expect(result.conversation_history![0].message_type).toBe('template')
    it('should filter by date range', async () => {
        {
          start_date: new Date('2024-01-15'),
          end_date: new Date('2024-01-16')
        }
      expect(mockSupabaseClient.gte).toHaveBeenCalledWith('timestamp', '2024-01-15T00:00:00.000Z')
      expect(mockSupabaseClient.lte).toHaveBeenCalledWith('timestamp', '2024-01-16T00:00:00.000Z')
  describe('error handling', () => {
    it('should handle WhatsApp API errors', async () => {
      mockWhatsAppService.sendTemplateMessage.mockRejectedValue(
        new Error('WhatsApp Business API unavailable')
          change_type: 'time_update',
          original_values: {},
          new_values: {},
          change_reason: 'Test',
          urgency_level: 'low'
      expect(result.error).toContain('WhatsApp Business API unavailable')
    it('should handle database errors', async () => {
        error: { message: 'Database connection failed' }
      expect(result.error).toContain('Database connection failed')
    it('should validate required parameters', async () => {
        null as any,
      expect(result.error).toContain('Supplier information is required')
  describe('message templating', () => {
    it('should format template parameters correctly', async () => {
        messageId: 'template-msg'
      await SupplierWhatsAppService.sendScheduleUpdateNotification(
          change_type: 'location_change',
          original_values: { location: 'Old Venue' },
          new_values: { location: 'New Venue' },
          change_reason: 'Venue changed due to weather',
          urgency_level: 'high'
      const [, , , components] = mockWhatsAppService.sendTemplateMessage.mock.calls[0]
      const bodyComponent = components.find(c => c.type === 'body')
      expect(bodyComponent.parameters).toContainEqual({
        type: 'text',
        text: mockSupplier.name
        text: 'Venue changed due to weather'
    it('should handle missing template parameters gracefully', async () => {
        messageId: 'fallback-msg'
      const incompleteEvent = { ...mockScheduleEvent, couple_names: undefined as any }
        incompleteEvent,
      // Should use fallback values for missing parameters
        text: 'Wedding Event' // Fallback couple names
})
