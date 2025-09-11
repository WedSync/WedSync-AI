import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { SMSServiceConnector } from '../sms-connector';

// Mock Twilio
const mockTwilioMessage = {
  create: jest.fn(),
  sid: 'SM123456789',
  status: 'queued'
};
const mockTwilioClient = {
  messages: mockTwilioMessage,
  api: {
    accounts: jest.fn(() => ({
      fetch: jest.fn().mockResolvedValue({
        balance: '25.50'
      })
    }))
  },
  incomingPhoneNumbers: {
    list: jest.fn().mockResolvedValue([
      {
        phoneNumber: '+12345678901',
        capabilities: { sms: true, mms: true }
      }
    ])
  }
jest.mock('twilio', () => {
  return jest.fn(() => mockTwilioClient);
});
// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    order: jest.fn().mockReturnThis()
  }))
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));
// Mock environment variables
process.env.TWILIO_ACCOUNT_SID = 'AC123456789';
process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
process.env.TWILIO_PHONE_NUMBER = '+12345678901';
describe('SMSServiceConnector', () => {
  let smsConnector: SMSServiceConnector;
  beforeEach(() => {
    smsConnector = SMSServiceConnector.getInstance();
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.resetAllMocks();
  describe('sendSMS', () => {
    it('should send SMS successfully with valid template', async () => {
      // Mock client data with consent
      const mockClient = {
        phone: '+12345678901',
        first_name: 'Test',
        last_name: 'User',
        sms_consent: true,
        sms_opt_in_date: '2024-01-01T00:00:00Z'
      };
      // Mock vendor data
      const mockVendor = {
        business_name: 'Test Vendor',
        phone: '+12345678902'
      // Mock organization data
      const mockOrg = {
        tier: 'PROFESSIONAL',
        settings: {}
      // Mock template
      const mockTemplate = {
        id: 'sms-template-123',
        message_template: 'Hi {client_first_name}, welcome to {vendor_name}!',
        template_variables: ['client_first_name', 'vendor_name'],
        is_active: true
      // Mock Twilio message creation
      mockTwilioMessage.create.mockResolvedValueOnce({
        sid: 'SM123456789',
        status: 'queued'
      });
      // Set up Supabase mocks
      mockSupabaseClient.from().single
        .mockResolvedValueOnce({ data: mockClient, error: null }) // client query
        .mockResolvedValueOnce({ data: mockVendor, error: null }) // vendor query
        .mockResolvedValueOnce({ data: mockOrg, error: null }) // organization query
        .mockResolvedValueOnce({ data: mockTemplate, error: null }); // template query
      mockSupabaseClient.from().insert.mockResolvedValue({
        data: { id: 'delivery-123' },
        error: null
      const result = await smsConnector.sendSMS({
        template_id: 'sms-template-123',
        recipient: {
          phone: '+12345678901',
          name: 'Test User'
        },
        variables: {
          client_first_name: 'Test',
          vendor_name: 'Test Vendor'
        priority: 'normal',
        compliance_data: {
          consent_given: true,
          consent_timestamp: '2024-01-01T00:00:00Z',
          opt_in_method: 'double_opt_in'
        }
      expect(result).toMatchObject({
        message_id: 'SM123456789',
        status: 'queued',
        recipient: '+12345678901',
        template: 'sms-template-123',
        segments_used: expect.any(Number)
      expect(mockTwilioMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('Hi Test, welcome to Test Vendor!'),
          from: '+12345678901',
          to: '+12345678901'
        })
      );
    });
    it('should throw error when client has no SMS consent', async () => {
        sms_consent: false // No consent
      mockSupabaseClient.from().single.mockResolvedValueOnce({
        data: mockClient,
      await expect(
        smsConnector.sendSMS({
          template_id: 'template-123',
          recipient: { phone: '+12345678901' },
          variables: {},
          priority: 'normal'
      ).rejects.toThrow('Client has not consented to SMS communications');
    it('should throw error when client has no phone number', async () => {
        phone: null, // No phone
        sms_consent: true
      ).rejects.toThrow('Client phone number not found');
    it('should handle custom message instead of template', async () => {
      const mockVendor = { business_name: 'Test Vendor' };
      const mockOrg = { tier: 'PROFESSIONAL' };
        .mockResolvedValueOnce({ data: mockClient, error: null })
        .mockResolvedValueOnce({ data: mockVendor, error: null })
        .mockResolvedValueOnce({ data: mockOrg, error: null });
        status: 'sent'
        custom_message: 'Custom test message',
        recipient: { phone: '+12345678901' },
        variables: {},
        priority: 'normal'
      expect(result.message_content).toBe('Custom test message');
          body: 'Custom test message'
    it('should schedule SMS for future delivery', async () => {
      const futureTime = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
      
        last_name: 'User'
      mockSupabaseClient.from().insert.mockResolvedValueOnce({
        data: { id: 'schedule-123' },
        custom_message: 'Scheduled message',
        delivery_time: futureTime
      expect(result.status).toBe('scheduled');
      expect(result.message_id).toBe('schedule-123');
  describe('sendBulkSMS', () => {
    it('should send multiple SMS with rate limiting', async () => {
        .mockResolvedValue({ data: mockClient, error: null })
        .mockResolvedValue({ data: mockVendor, error: null })
        .mockResolvedValue({ data: mockOrg, error: null });
      mockTwilioMessage.create.mockResolvedValue({
      const messages = Array.from({ length: 3 }, (_, i) => ({
        custom_message: `Message ${i + 1}`,
        recipient: { phone: `+123456789${i}1` },
        priority: 'normal' as const
      }));
      const results = await smsConnector.sendBulkSMS(messages);
      expect(results).toHaveLength(3);
      expect(results.every(r => r.status === 'sent')).toBe(true);
    it('should handle partial failures in bulk send', async () => {
      mockSupabaseClient.from().single.mockResolvedValue({
      // First call succeeds, second fails
      mockTwilioMessage.create
        .mockResolvedValueOnce({
          sid: 'SM123456789',
          status: 'sent'
        .mockRejectedValueOnce(new Error('Twilio error'));
      const messages = [
        {
          custom_message: 'Message 1',
          priority: 'normal' as const
          custom_message: 'Message 2',
          recipient: { phone: '+12345678902' },
      ];
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('sent');
      expect(results[1].status).toBe('failed');
  describe('getTemplate', () => {
    it('should return SMS template when found', async () => {
        id: 'sms-123',
        name: 'Test SMS Template',
        message_template: 'Hello {name}',
        data: mockTemplate,
      const result = await smsConnector.getTemplate('sms-123');
      expect(result).toEqual(mockTemplate);
    it('should return null when template not found', async () => {
        data: null,
        error: { message: 'Not found' }
      const result = await smsConnector.getTemplate('nonexistent');
      expect(result).toBeNull();
  describe('handleTwilioWebhook', () => {
    it('should process delivery status webhook', async () => {
      const webhookData = {
        MessageSid: 'SM123456789',
        MessageStatus: 'delivered',
        From: '+12345678901',
        To: '+12345678902',
        NumSegments: '1',
        Price: '0.0075',
        PriceUnit: 'USD'
      // Mock finding tracking event
      mockSupabaseClient.from().select.mockReturnThis();
      mockSupabaseClient.from().limit.mockReturnThis();
      mockSupabaseClient.from().limit.mockResolvedValueOnce({
        data: [{
          instance_id: 'instance-123',
          client_id: 'client-123'
        }],
        data: { id: 'event-123' },
      mockSupabaseClient.from().update.mockResolvedValueOnce({
        data: {},
      await smsConnector.handleTwilioWebhook(webhookData);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('sms_events');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('sms_deliveries');
    it('should handle webhook with error code', async () => {
        MessageStatus: 'failed',
        ErrorCode: '30008',
        ErrorMessage: 'Unknown error',
        To: '+12345678902'
        data: [{ instance_id: 'instance-123', client_id: 'client-123' }],
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
          event_type: 'failed',
          error_code: '30008',
          error_message: 'Unknown error'
  describe('handleIncomingSMS', () => {
    it('should process incoming SMS and trigger keyword responses', async () => {
        Body: 'YES'
      // Mock finding client
        data: {
          id: 'client-123',
          first_name: 'Test',
          last_name: 'User'
      const result = await smsConnector.handleIncomingSMS(webhookData);
      expect(result).toEqual({
        response_message: 'Thank you for confirming!'
    it('should handle STOP keyword and opt out client', async () => {
        Body: 'STOP'
        response_message: 'You have been unsubscribed from SMS messages.'
      // Should update opt-out tables
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('sms_opt_outs');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('clients');
  describe('getServiceStatus', () => {
    it('should return service status with Twilio account info', async () => {
      const result = await smsConnector.getServiceStatus();
        provider: 'twilio',
        is_configured: true,
        account_balance: 25.50,
        phone_numbers: expect.arrayContaining([
          expect.objectContaining({
            phone_number: '+12345678901',
            capabilities: expect.arrayContaining(['sms', 'mms'])
          })
        ])
    it('should return error status when Twilio not configured', async () => {
      // Temporarily remove environment variables
      const originalSid = process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_ACCOUNT_SID;
      // Create new instance to reflect missing config
      const newConnector = new (SMSServiceConnector as any)();
      const result = await newConnector.getServiceStatus();
        is_configured: false,
        last_error: expect.any(String)
      // Restore environment variable
      process.env.TWILIO_ACCOUNT_SID = originalSid;
  describe('calculateSegments', () => {
    it('should calculate segments correctly for ASCII messages', () => {
      const connector = smsConnector as any;
      // Short message (1 segment)
      expect(connector.calculateSegments('Hello world')).toBe(1);
      // Long message (2 segments)
      const longMessage = 'A'.repeat(160);
      expect(connector.calculateSegments(longMessage)).toBe(2);
    it('should calculate segments correctly for Unicode messages', () => {
      // Unicode message requires more segments
      const unicodeMessage = '🎉'.repeat(70);
      expect(connector.calculateSegments(unicodeMessage)).toBe(2);
  describe('isValidPhoneNumber', () => {
    it('should validate phone numbers correctly', () => {
      expect(connector.isValidPhoneNumber('+12345678901')).toBe(true);
      expect(connector.isValidPhoneNumber('+441234567890')).toBe(true);
      expect(connector.isValidPhoneNumber('12345678901')).toBe(false); // No +
      expect(connector.isValidPhoneNumber('+1')).toBe(false); // Too short
      expect(connector.isValidPhoneNumber('invalid')).toBe(false);
  describe('getSMSStats', () => {
    it('should return SMS statistics', async () => {
      const mockEvents = [
        { event_type: 'sms_sent' },
        { event_type: 'sms_delivered' },
        { event_type: 'sms_failed' },
        { event_type: 'sms_reply' }
      mockSupabaseClient.from().eq.mockReturnThis();
      mockSupabaseClient.from().in.mockReturnThis();
      mockSupabaseClient.from().in.mockResolvedValueOnce({
        data: mockEvents,
      const result = await smsConnector.getSMSStats('instance-123');
        sent: 1,
        delivered: 1,
        failed: 1,
        replies: 1,
        optOuts: 0
