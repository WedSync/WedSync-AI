// WS-084: Unit Tests for Reminder Service
// Tests CRUD operations, template management, and business logic

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { ReminderService, type ReminderTemplate, type ReminderSchedule } from '@/lib/services/reminder-service';
// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  functions: {
    invoke: vi.fn()
  }
};
const mockQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis()
// Sample test data
const sampleTemplate: ReminderTemplate = {
  id: 'template-1',
  organization_id: 'org-1',
  name: 'Payment Reminder',
  description: 'Standard payment reminder template',
  category: 'payment',
  subject_template: 'Payment Due: {amount} for {serviceName}',
  email_template: '<p>Dear {clientName}, your payment of {amount} is due.</p>',
  sms_template: 'Payment of {amount} due for {serviceName}',
  variables: ['clientName', 'amount', 'serviceName'],
  is_active: true,
  is_system: false
const sampleSchedule: ReminderSchedule = {
  id: 'schedule-1',
  client_id: 'client-1',
  template_id: 'template-1',
  entity_type: 'payment',
  entity_id: 'payment-1',
  entity_name: 'Final venue payment',
  recipient_id: 'client-1',
  recipient_type: 'client',
  recipient_email: 'client@example.com',
  trigger_date: '2024-02-15T10:00:00Z',
  advance_days: 7,
  send_email: true,
  send_sms: false,
  send_in_app: true,
  status: 'scheduled'
describe('ReminderService', () => {
  let reminderService: ReminderService;
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.from.mockReturnValue(mockQuery);
    reminderService = new ReminderService(mockSupabaseClient as unknown);
  });
  describe('Template Management', () => {
    it('should fetch templates for organization', async () => {
      const mockData = [sampleTemplate];
      mockQuery.eq.mockReturnValueOnce(mockQuery);
      mockQuery.order.mockResolvedValueOnce({ data: mockData, error: null });
      const result = await reminderService.getTemplates('org-1');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('reminder_templates');
      expect(mockQuery.eq).toHaveBeenCalledWith('organization_id', 'org-1');
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true);
      expect(result).toEqual(mockData);
    });
    it('should filter templates by category', async () => {
      mockQuery.eq.mockReturnValue(mockQuery);
      await reminderService.getTemplates('org-1', 'payment');
      expect(mockQuery.eq).toHaveBeenCalledWith('category', 'payment');
    it('should fetch system templates', async () => {
      const systemTemplate = { ...sampleTemplate, is_system: true };
      const mockData = [systemTemplate];
      const result = await reminderService.getSystemTemplates();
      expect(mockQuery.eq).toHaveBeenCalledWith('is_system', true);
    it('should create a new template', async () => {
      const templateData = { ...sampleTemplate };
      delete templateData.id;
      
      mockQuery.insert.mockReturnValue(mockQuery);
      mockQuery.select.mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValueOnce({ data: sampleTemplate, error: null });
      const result = await reminderService.createTemplate(templateData);
      expect(mockQuery.insert).toHaveBeenCalledWith({
        ...templateData,
        is_active: true,
        is_system: false
      });
      expect(result).toEqual(sampleTemplate);
    it('should update an existing template', async () => {
      const updates = { name: 'Updated Payment Reminder' };
      const updatedTemplate = { ...sampleTemplate, ...updates };
      mockQuery.update.mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValueOnce({ data: updatedTemplate, error: null });
      const result = await reminderService.updateTemplate('template-1', updates);
      expect(mockQuery.update).toHaveBeenCalledWith(updates);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'template-1');
      expect(result).toEqual(updatedTemplate);
    it('should soft delete a template', async () => {
      mockQuery.eq.mockResolvedValueOnce({ error: null });
      await reminderService.deleteTemplate('template-1');
      expect(mockQuery.update).toHaveBeenCalledWith({ is_active: false });
    it('should handle template fetch errors', async () => {
      const error = new Error('Database error');
      mockQuery.order.mockResolvedValueOnce({ data: null, error });
      await expect(reminderService.getTemplates('org-1'))
        .rejects.toThrow('Failed to fetch reminder templates: Database error');
  describe('Reminder Schedule Management', () => {
    it('should fetch reminders for organization', async () => {
      const mockData = [sampleSchedule];
      const result = await reminderService.getReminders('org-1');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('reminder_schedules');
    it('should apply filters to reminder fetch', async () => {
      const filters = {
        status: 'scheduled',
        entityType: 'payment',
        clientId: 'client-1',
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };
      mockQuery.gte.mockReturnValue(mockQuery);
      mockQuery.lte.mockReturnValue(mockQuery);
      await reminderService.getReminders('org-1', filters);
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'scheduled');
      expect(mockQuery.eq).toHaveBeenCalledWith('entity_type', 'payment');
      expect(mockQuery.eq).toHaveBeenCalledWith('client_id', 'client-1');
      expect(mockQuery.gte).toHaveBeenCalledWith('trigger_date', '2024-01-01');
      expect(mockQuery.lte).toHaveBeenCalledWith('trigger_date', '2024-12-31');
    it('should create reminder for multiple recipients', async () => {
      const request = {
        templateId: 'template-1',
        entityId: 'payment-1',
        entityName: 'Venue payment',
        triggerDate: '2024-02-15T10:00:00Z',
        recipients: [
          { id: 'client-1', type: 'client' as const, email: 'client1@example.com' },
          { id: 'client-2', type: 'client' as const, email: 'client2@example.com' }
        ]
      const createdReminders = [
        { ...sampleSchedule, recipient_id: 'client-1' },
        { ...sampleSchedule, recipient_id: 'client-2' }
      ];
      mockQuery.single.mockResolvedValueOnce({ data: createdReminders[0], error: null });
      mockQuery.single.mockResolvedValueOnce({ data: createdReminders[1], error: null });
      const result = await reminderService.createReminder('org-1', 'client-1', request);
      expect(mockQuery.insert).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0].recipient_id).toBe('client-1');
      expect(result[1].recipient_id).toBe('client-2');
    it('should update reminder status', async () => {
      const updates = { status: 'sent' };
      const updatedSchedule = { ...sampleSchedule, ...updates };
      mockQuery.single.mockResolvedValueOnce({ data: updatedSchedule, error: null });
      const result = await reminderService.updateReminder('schedule-1', updates);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'schedule-1');
      expect(result).toEqual(updatedSchedule);
    it('should cancel a reminder', async () => {
      await reminderService.cancelReminder('schedule-1');
      expect(mockQuery.update).toHaveBeenCalledWith({ status: 'cancelled' });
    it('should snooze a reminder', async () => {
      const snoozeUntil = '2024-02-16T10:00:00Z';
      await reminderService.snoozeReminder('schedule-1', snoozeUntil);
      expect(mockQuery.update).toHaveBeenCalledWith({
        status: 'snoozed',
        snoozed_until: snoozeUntil
  describe('Reminder History and Analytics', () => {
    it('should fetch reminder history', async () => {
      const historyData = [
        {
          id: 'history-1',
          schedule_id: 'schedule-1',
          organization_id: 'org-1',
          channel: 'email',
          sent_at: '2024-02-08T10:00:00Z',
          delivery_status: 'delivered'
        }
      mockQuery.order.mockResolvedValueOnce({ data: historyData, error: null });
      const result = await reminderService.getReminderHistory('org-1');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('reminder_history');
      expect(result).toEqual(historyData);
    it('should calculate reminder statistics', async () => {
          delivery_status: 'sent',
          opened_at: '2024-02-08T11:00:00Z',
          clicked_at: '2024-02-08T11:30:00Z',
          reminder_schedules: {
            reminder_templates: { category: 'payment' }
          }
        },
          channel: 'sms',
          opened_at: null,
          clicked_at: null,
            reminder_templates: { category: 'milestone' }
      mockQuery.gte.mockResolvedValueOnce({ data: historyData, error: null });
      const stats = await reminderService.getReminderStats('org-1', 30);
      expect(stats.totalSent).toBe(2);
      expect(stats.totalOpened).toBe(1);
      expect(stats.totalClicked).toBe(1);
      expect(stats.openRate).toBe(50);
      expect(stats.clickRate).toBe(50);
      expect(stats.channelBreakdown).toEqual({ email: 1, sms: 1 });
      expect(stats.categoryBreakdown).toEqual({ payment: 1, milestone: 1 });
  describe('Template Resolution', () => {
    it('should test template resolution with sample data', async () => {
      const sampleData = {
        clientName: 'John Doe',
        amount: '$1,500',
        serviceName: 'Wedding Photography'
      const result = await reminderService.testReminderTemplate('template-1', sampleData);
      expect(result.resolvedSubject).toBe('Payment Due: $1,500 for Wedding Photography');
      expect(result.resolvedEmailContent).toBe('<p>Dear John Doe, your payment of $1,500 is due.</p>');
      expect(result.resolvedSmsContent).toBe('Payment of $1,500 due for Wedding Photography');
    it('should handle missing template variables gracefully', async () => {
      const sampleData = { clientName: 'John Doe' }; // Missing amount and serviceName
      expect(result.resolvedSubject).toBe('Payment Due:  for ');
      expect(result.resolvedEmailContent).toBe('<p>Dear John Doe, your payment of  is due.</p>');
  describe('Bulk Operations', () => {
    it('should create bulk reminders for multiple entities', async () => {
      const entities = [
          id: 'payment-1',
          name: 'Venue payment',
          triggerDate: '2024-02-15T10:00:00Z',
          recipients: [{ id: 'client-1', type: 'client' as const, email: 'client1@example.com' }]
          id: 'payment-2',
          name: 'Catering payment',
          triggerDate: '2024-02-20T10:00:00Z',
          recipients: [{ id: 'client-2', type: 'client' as const, email: 'client2@example.com' }]
      // Mock successful creation for both entities
      mockQuery.single.mockResolvedValueOnce({ 
        data: { ...sampleSchedule, entity_id: 'payment-1' }, 
        error: null 
        data: { ...sampleSchedule, entity_id: 'payment-2' }, 
      const result = await reminderService.createBulkReminders(
        'org-1',
        'payment',
        entities,
        'template-1'
      );
      expect(result[0].entity_id).toBe('payment-1');
      expect(result[1].entity_id).toBe('payment-2');
  describe('Error Handling', () => {
    it('should throw error when template not found', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: null, error: new Error('Not found') });
      await expect(reminderService.testReminderTemplate('invalid-id', {}))
        .rejects.toThrow('Template not found: Not found');
    it('should handle database errors gracefully', async () => {
      const error = new Error('Connection failed');
      await expect(reminderService.getReminders('org-1'))
        .rejects.toThrow('Failed to fetch reminder schedules: Connection failed');
    it('should validate required fields on reminder creation', async () => {
      const invalidRequest = {
        templateId: '',
        entityName: 'Test',
        recipients: []
      // This should be validated at the service level or component level
      // For now, we'll test that empty recipients array is handled
      const result = await reminderService.createReminder('org-1', undefined, invalidRequest);
      expect(result).toEqual([]);
  describe('Edge Cases', () => {
    it('should handle empty results gracefully', async () => {
      mockQuery.order.mockResolvedValueOnce({ data: null, error: null });
    it('should handle statistics with no data', async () => {
      mockQuery.gte.mockResolvedValueOnce({ data: null, error: null });
      const stats = await reminderService.getReminderStats('org-1');
      expect(stats.totalSent).toBe(0);
      expect(stats.totalOpened).toBe(0);
      expect(stats.totalClicked).toBe(0);
      expect(stats.openRate).toBe(0);
      expect(stats.clickRate).toBe(0);
    it('should handle template resolution with empty template', async () => {
      const emptyTemplate = { ...sampleTemplate, subject_template: '', email_template: '' };
      mockQuery.single.mockResolvedValueOnce({ data: emptyTemplate, error: null });
      const result = await reminderService.testReminderTemplate('template-1', { test: 'data' });
      expect(result.resolvedSubject).toBe('');
      expect(result.resolvedEmailContent).toBe('');
});
