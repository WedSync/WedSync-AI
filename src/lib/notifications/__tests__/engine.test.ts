/**
 * WS-008: Notification Engine Tests
 * Comprehensive tests for the multi-channel notification engine
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { NotificationEngine, NotificationRequest, NotificationTemplate, NotificationRecipient } from '../engine';
// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    insert: jest.fn(() => Promise.resolve({ data: {}, error: null })),
    update: jest.fn(() => Promise.resolve({ data: {}, error: null }))
  })),
  channel: jest.fn(() => ({
    send: jest.fn(() => Promise.resolve())
  }))
};
// Mock email service
const mockEmailService = {
  sendEmail: jest.fn(() => Promise.resolve({
    message_id: 'email_123',
    status: 'sent',
    delivery_timestamp: new Date().toISOString()
// Mock SMS service
const mockSMSService = {
  sendSMS: jest.fn(() => Promise.resolve({
    message_id: 'sms_123',
    delivery_timestamp: new Date().toISOString(),
    segments_used: 1,
    cost_estimate: 0.0075
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase
}));
jest.mock('@/lib/services/email-connector', () => ({
  emailServiceConnector: mockEmailService
jest.mock('@/lib/services/sms-connector', () => ({
  smsServiceConnector: mockSMSService
describe('NotificationEngine', () => {
  let engine: NotificationEngine;
  let mockTemplate: NotificationTemplate;
  let mockRecipient: NotificationRecipient;
  let mockRequest: NotificationRequest;
  beforeEach(() => {
    engine = NotificationEngine.getInstance();
    
    mockTemplate = {
      id: 'test-template',
      name: 'Test Template',
      category: 'wedding_timeline',
      priority: 'high',
      channels: {
        email: {
          subject_template: 'Test Subject: {{name}}',
          html_template: '<p>Hello {{name}}, your wedding is on {{date}}!</p>',
          text_template: 'Hello {{name}}, your wedding is on {{date}}!'
        },
        sms: {
          message_template: 'Hi {{name}}! Wedding reminder: {{date}}',
          max_length: 160
        push: {
          title_template: 'Wedding Reminder',
          body_template: 'Hi {{name}}, your wedding is on {{date}}!',
          icon: '/icon.png'
        in_app: {
          message_template: 'Your wedding is coming up on {{date}}!',
          action_url: '/wedding-details',
          action_text: 'View Details'
        }
      },
      variables: ['name', 'date'],
      routing_rules: {
        fallback_channel_order: ['email', 'sms', 'push', 'in_app'],
        require_confirmation: false,
        retry_policy: {
          max_attempts: 3,
          backoff_multiplier: 2,
          initial_delay_ms: 1000
      wedding_context: {
        timeline_dependent: true,
        vendor_specific: false,
        couple_approval_required: false
      }
    };
    mockRecipient = {
      id: 'user_123',
      name: 'John & Jane Doe',
      email: 'couple@example.com',
      phone: '+1234567890',
      push_token: 'push_token_123',
      type: 'couple',
      preferences: {
        channels: [
          { type: 'email', enabled: true, priority: 1 },
          { type: 'sms', enabled: true, priority: 2 },
          { type: 'push', enabled: true, priority: 3 },
          { type: 'in_app', enabled: true, priority: 4 }
        ],
        quiet_hours: {
          start: '22:00',
          end: '08:00',
          timezone: 'America/New_York'
      wedding_role: 'bride'
    mockRequest = {
      template_id: 'test-template',
      recipients: [mockRecipient],
      variables: {
        name: 'John & Jane',
        date: '2024-06-15'
      context: {
        wedding_id: 'wedding_123',
        vendor_id: 'vendor_456',
        event_date: '2024-06-15',
        timeline_milestone: 'final_reminders'
      delivery_options: {
        respect_quiet_hours: false,
        require_delivery_confirmation: true
    // Reset mocks
    jest.clearAllMocks();
  });
  afterEach(() => {
  describe('sendNotification', () => {
    it('should send notification successfully to all channels', async () => {
      // Mock template retrieval
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: mockTemplate, 
              error: null 
            }))
          }))
        }))
      });
      // Mock notification batch recording
        insert: jest.fn(() => Promise.resolve({ data: {}, error: null }))
      const results = await engine.sendNotification(mockRequest);
      expect(results).toHaveLength(4); // One for each channel
      expect(results.every(r => r.status === 'sent')).toBe(true);
      expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(1);
      expect(mockSMSService.sendSMS).toHaveBeenCalledTimes(1);
    });
    it('should validate template variables', async () => {
      const requestWithMissingVariables = {
        ...mockRequest,
        variables: { name: 'John & Jane' } // Missing 'date' variable
      };
      await expect(engine.sendNotification(requestWithMissingVariables))
        .rejects.toThrow('Missing required variables: date');
    it('should handle template not found', async () => {
      // Mock template not found
              data: null, 
      await expect(engine.sendNotification(mockRequest))
        .rejects.toThrow('Template test-template not found');
    it('should respect quiet hours when configured', async () => {
      // Mock current time to be during quiet hours (23:00)
      const mockDate = new Date('2024-01-01T23:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
      // Mock scheduled notification storage
      const requestWithQuietHours = {
        delivery_options: {
          ...mockRequest.delivery_options!,
          respect_quiet_hours: true
      const results = await engine.sendNotification(requestWithQuietHours);
      // Should schedule notifications instead of sending immediately
      expect(results.every(r => r.status === 'scheduled')).toBe(true);
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
      expect(mockSMSService.sendSMS).not.toHaveBeenCalled();
      // Restore Date
      jest.restoreAllMocks();
    it('should handle channel priorities correctly', async () => {
              data: {
                ...mockTemplate,
                priority: 'urgent' // High priority should use fewer channels
              }, 
      const results = await engine.sendNotification({
        template_id: 'urgent-template'
      // For urgent notifications, should stop after first successful delivery
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.status === 'sent')).toBe(true);
    it('should handle delivery failures gracefully', async () => {
      // Mock email service failure
      mockEmailService.sendEmail.mockRejectedValueOnce(new Error('Email service unavailable'));
      // Should have both successful and failed deliveries
      expect(results.some(r => r.status === 'failed')).toBe(true);
      
      const failedResult = results.find(r => r.status === 'failed');
      expect(failedResult?.error_message).toContain('Email service unavailable');
  describe('channel determination', () => {
    it('should use all channels for emergency notifications', () => {
      const emergencyTemplate = {
        ...mockTemplate,
        priority: 'emergency' as const
      // Access private method through any type casting
      const channels = (engine as any).determineDeliveryChannels(
        emergencyTemplate,
        mockRecipient,
        undefined
      );
      expect(channels).toEqual(['email', 'sms', 'push', 'in_app']);
    it('should use single channel for normal priority', () => {
      const normalTemplate = {
        priority: 'normal' as const
        normalTemplate,
      expect(channels).toHaveLength(1);
      expect(channels[0]).toBe('email'); // Highest priority channel
    it('should respect urgency override', () => {
        'emergency'
  describe('template rendering', () => {
    it('should render templates with variables correctly', () => {
      const template = 'Hello {{name}}, your wedding is on {{date}}!';
      const variables = { name: 'John & Jane', date: '2024-06-15' };
      const rendered = (engine as any).renderTemplate(template, variables);
      expect(rendered).toBe('Hello John & Jane, your wedding is on 2024-06-15!');
    it('should handle missing variables gracefully', () => {
      const variables = { name: 'John & Jane' }; // Missing 'date'
      expect(rendered).toBe('Hello John & Jane, your wedding is on {{date}}!');
  describe('quiet hours handling', () => {
    it('should detect quiet hours correctly', () => {
      const quietHours = {
        start: '22:00',
        end: '08:00',
        timezone: 'America/New_York'
      // Mock current time to be 23:00 (during quiet hours)
      const mockDate = new Date('2024-01-01T23:00:00-05:00');
      const isQuiet = (engine as any).isQuietHours(quietHours);
      expect(isQuiet).toBe(true);
    it('should calculate post-quiet hours delivery time', () => {
      const mockDate = new Date('2024-01-01T23:00:00');
      const deliveryTime = (engine as any).calculatePostQuietHoursDelivery(quietHours);
      expect(deliveryTime.getHours()).toBe(8); // Should schedule for 08:00
      expect(deliveryTime.getMinutes()).toBe(0);
  describe('analytics', () => {
    it('should calculate delivery analytics correctly', async () => {
      const mockDeliveryLogs = [
        { channel: 'email', status: 'delivered', delivery_duration_ms: 1000, cost_estimate: 0.001 },
        { channel: 'email', status: 'failed', delivery_duration_ms: null, cost_estimate: 0.001 },
        { channel: 'sms', status: 'delivered', delivery_duration_ms: 2000, cost_estimate: 0.0075 },
        { channel: 'push', status: 'delivered', delivery_duration_ms: 500, cost_estimate: 0.0001 }
      ];
      // Mock database query
          gte: jest.fn(() => ({
            lte: jest.fn(() => Promise.resolve({ data: mockDeliveryLogs }))
      const analytics = await engine.getNotificationAnalytics({
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      expect(analytics.total_sent).toBe(4);
      expect(analytics.delivery_rate_by_channel.email).toBe(50); // 1 delivered out of 2
      expect(analytics.delivery_rate_by_channel.sms).toBe(100); // 1 delivered out of 1
      expect(analytics.average_delivery_time_ms).toBe(1166.67); // Average of 1000, 2000, 500
      expect(analytics.failure_rate).toBe(25); // 1 failed out of 4
      expect(analytics.cost_breakdown.email).toBe(0.002);
      expect(analytics.cost_breakdown.sms).toBe(0.0075);
});
export {};
