import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { EmailServiceConnector } from '../email-connector';

// Mock Supabase client
const mockSupabaseClient = {
  functions: {
    invoke: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    order: jest.fn().mockReturnThis()
  })),
  channel: jest.fn(() => ({
    send: jest.fn().mockResolvedValue({ data: null, error: null })
  }))
};
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));
describe('EmailServiceConnector', () => {
  let emailConnector: EmailServiceConnector;
  beforeEach(() => {
    emailConnector = EmailServiceConnector.getInstance();
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.resetAllMocks();
  describe('sendEmail', () => {
    it('should send email successfully with valid template', async () => {
      // Mock template exists
      const mockTemplate = {
        id: 'template-123',
        name: 'Welcome Email',
        subject_template: 'Welcome {client_name}!',
        html_template: '<p>Hello {client_name}</p>',
        template_variables: ['client_name'],
        category: 'journey',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      // Mock successful Supabase function call
      const mockDeliveryResult = {
        message_id: 'msg-123',
        status: 'sent',
        delivery_timestamp: '2024-01-01T12:00:00Z'
      mockSupabaseClient.from().single.mockResolvedValueOnce({
        data: mockTemplate,
        error: null
      });
      mockSupabaseClient.functions.invoke.mockResolvedValueOnce({
        data: mockDeliveryResult,
      mockSupabaseClient.from().insert.mockResolvedValueOnce({
        data: { id: 'delivery-123' },
      const result = await emailConnector.sendEmail({
        template_id: 'template-123',
        recipient: {
          email: 'test@example.com',
          name: 'Test User'
        },
        variables: {
          client_name: 'Test User',
          vendor_name: 'Test Vendor'
        priority: 'normal'
      expect(result).toEqual(mockDeliveryResult);
      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
        'email-service',
        expect.objectContaining({
          body: expect.objectContaining({
            action: 'send_email',
            template_id: 'template-123',
            recipient: {
              email: 'test@example.com',
              name: 'Test User'
            },
            variables: {
              client_name: 'Test User',
              vendor_name: 'Test Vendor'
            priority: 'normal'
          })
        })
      );
    });
    it('should throw error for inactive template', async () => {
        data: null,
      await expect(
        emailConnector.sendEmail({
          template_id: 'inactive-template',
          recipient: {
            email: 'test@example.com'
          },
          variables: {},
          priority: 'normal'
      ).rejects.toThrow('Template inactive-template not found or inactive');
    it('should throw error for missing required variables', async () => {
        template_variables: ['client_name', 'vendor_name'],
        is_active: true
          template_id: 'template-123',
          variables: {
            client_name: 'Test User'
            // Missing vendor_name
      ).rejects.toThrow('Missing required variables: vendor_name');
    it('should handle Supabase function errors', async () => {
        template_variables: [],
        error: { message: 'Email service unavailable' }
      ).rejects.toThrow('Email service error: Email service unavailable');
  describe('sendBulkEmails', () => {
    it('should send multiple emails with rate limiting', async () => {
      mockSupabaseClient.from().single.mockResolvedValue({
      mockSupabaseClient.functions.invoke.mockResolvedValue({
      mockSupabaseClient.from().insert.mockResolvedValue({
      const emails = Array.from({ length: 15 }, (_, i) => ({
          email: `test${i}@example.com`
        variables: {},
        priority: 'normal' as const
      }));
      const results = await emailConnector.sendBulkEmails(emails);
      expect(results).toHaveLength(15);
      expect(results.every(r => r.status === 'sent')).toBe(true);
      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledTimes(15);
    it('should handle partial failures in bulk send', async () => {
      // First call succeeds, second fails
      mockSupabaseClient.functions.invoke
        .mockResolvedValueOnce({
          data: {
            message_id: 'msg-123',
            status: 'sent',
            delivery_timestamp: '2024-01-01T12:00:00Z'
          error: null
          data: null,
          error: { message: 'Service error' }
        });
      const emails = [
        {
          recipient: { email: 'test1@example.com' },
          priority: 'normal' as const
          recipient: { email: 'test2@example.com' },
        }
      ];
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('sent');
      expect(results[1].status).toBe('failed');
      expect(results[1].error_message).toContain('Service error');
  describe('getTemplate', () => {
    it('should return template when found', async () => {
        name: 'Test Template',
      const result = await emailConnector.getTemplate('template-123');
      expect(result).toEqual(mockTemplate);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('email_templates');
    it('should return null when template not found', async () => {
        error: { message: 'Not found' }
      const result = await emailConnector.getTemplate('nonexistent');
      expect(result).toBeNull();
  describe('upsertTemplate', () => {
    it('should create new template successfully', async () => {
      const templateData = {
        name: 'New Template',
        subject_template: 'Hello {name}',
        html_template: '<p>Hello {name}</p>',
        template_variables: ['name'],
      const createdTemplate = {
        ...templateData,
      mockSupabaseClient.from().select.mockReturnThis();
        data: createdTemplate,
      const result = await emailConnector.upsertTemplate(templateData);
      expect(result).toEqual(createdTemplate);
    it('should handle upsert errors', async () => {
        error: { message: 'Database error' }
        emailConnector.upsertTemplate({
          name: 'Test',
          subject_template: 'Test',
          html_template: 'Test',
          template_variables: [],
          category: 'journey',
          is_active: true
      ).rejects.toThrow('Failed to save template: Database error');
  describe('testTemplate', () => {
    it('should test template with sample data', async () => {
      const mockTestResult = {
        subject: 'Hello Test User',
        html: '<p>Hello Test User</p>',
        variables_used: ['name'],
        missing_variables: []
        data: mockTestResult,
      const result = await emailConnector.testTemplate('template-123', {
        name: 'Test User'
      expect(result).toEqual(mockTestResult);
          body: {
            action: 'test_template',
            sample_data: { name: 'Test User' }
          }
  describe('handleWebhook', () => {
    it('should process webhook events correctly', async () => {
      const webhookEvent = {
        type: 'delivered' as const,
        timestamp: '2024-01-01T12:00:00Z',
        recipient: 'test@example.com',
        data: { delivery_time: '2024-01-01T12:00:00Z' }
        data: { id: 'event-123' },
      mockSupabaseClient.from().update.mockResolvedValueOnce({
        data: {},
      await emailConnector.handleWebhook(webhookEvent);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('email_events');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('email_deliveries');
    it('should handle unsubscribe events', async () => {
        type: 'unsubscribed' as const,
        recipient: 'test@example.com'
      mockSupabaseClient.from().update
        .mockResolvedValueOnce({ data: {}, error: null }) // For email_deliveries
        .mockResolvedValueOnce({ data: {}, error: null }); // For clients unsubscribe
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('clients');
  describe('getDeliveryAnalytics', () => {
    it('should return analytics data', async () => {
      const mockAnalytics = {
        total_sent: 100,
        total_delivered: 95,
        total_opened: 70,
        total_clicked: 25,
        total_bounced: 5,
        delivery_rate: 95.0,
        open_rate: 73.68,
        click_rate: 35.71,
        bounce_rate: 5.0
        data: mockAnalytics,
      const result = await emailConnector.getDeliveryAnalytics({
        journey_id: 'journey-123',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      expect(result).toEqual(mockAnalytics);
  describe('scheduleEmail', () => {
    it('should schedule email for future delivery', async () => {
      const deliveryTime = new Date('2024-01-02T12:00:00Z');
      const emailOptions = {
        recipient: { email: 'test@example.com' },
        data: { id: 'schedule-123' },
      const result = await emailConnector.scheduleEmail(emailOptions, deliveryTime);
      expect(result).toEqual({ schedule_id: 'schedule-123' });
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('email_schedules');
  describe('cancelScheduledEmail', () => {
    it('should cancel scheduled email', async () => {
      const result = await emailConnector.cancelScheduledEmail('schedule-123');
      expect(result).toBe(true);
    it('should return false on cancellation error', async () => {
      expect(result).toBe(false);
});
