import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeadlineTrackingService } from '@/lib/services/deadline-tracking-service';
import { TaskPriority } from '@/types/workflow';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({ error: null })),
    select: vi.fn(() => ({
      is: vi.fn(() => ({
        lte: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      in: vi.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null }))
    delete: vi.fn(() => ({
        is: vi.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }))
};
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createServerComponentClient: () => mockSupabase
}));
vi.mock('next/headers', () => ({
  cookies: () => ({})
describe('DeadlineTrackingService', () => {
  let service: DeadlineTrackingService;
  beforeEach(() => {
    vi.clearAllMocks();
    service = new DeadlineTrackingService();
  });
  describe('scheduleDeadlineAlerts', () => {
    it('should schedule alerts for high priority tasks', async () => {
      const taskId = 'task-123';
      const deadline = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days from now
      const priority = TaskPriority.HIGH;
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: insertMock
      });
      await service.scheduleDeadlineAlerts(taskId, deadline, priority);
      expect(insertMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            task_id: taskId,
            alert_type: 'reminder',
            priority: 'high'
          }),
            alert_type: 'warning',
            priority: 'critical'
            alert_type: 'overdue',
          })
        ])
      );
    });
    it('should schedule different alerts for critical vs normal priority', async () => {
      const taskId = 'task-456';
      const deadline = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      
      // Test critical priority
      await service.scheduleDeadlineAlerts(taskId, deadline, TaskPriority.CRITICAL);
      const criticalAlerts = insertMock.mock.calls[0][0];
      const hasEscalationAlert = criticalAlerts.some((alert: any) => alert.alert_type === 'escalation');
      expect(hasEscalationAlert).toBe(true);
      insertMock.mockClear();
      // Test medium priority
      await service.scheduleDeadlineAlerts(taskId, deadline, TaskPriority.MEDIUM);
      const mediumAlerts = insertMock.mock.calls[0][0];
      const mediumHasEscalation = mediumAlerts.some((alert: any) => alert.alert_type === 'escalation');
      expect(mediumHasEscalation).toBe(false);
    it('should handle tasks with short deadlines', async () => {
      const taskId = 'task-789';
      const deadline = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000); // 1 day from now
      const alerts = insertMock.mock.calls[0][0];
      // Should still have overdue alert
      const hasOverdueAlert = alerts.some((alert: any) => alert.alert_type === 'overdue');
      expect(hasOverdueAlert).toBe(true);
      // Should not have 7-day reminder for 1-day deadline
      const has7DayReminder = alerts.some((alert: any) => 
        alert.alert_type === 'reminder' && alert.message.includes('7 days')
      expect(has7DayReminder).toBe(false);
    it('should throw error when database operation fails', async () => {
      const taskId = 'task-error';
      const deadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const priority = TaskPriority.MEDIUM;
        insert: vi.fn().mockResolvedValue({ 
          error: { message: 'Database error' } 
        })
      await expect(
        service.scheduleDeadlineAlerts(taskId, deadline, priority)
      ).rejects.toThrow('Failed to schedule deadline alerts');
  describe('getPendingAlerts', () => {
    it('should return pending alerts that are due', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          task_id: 'task-1',
          alert_type: 'reminder',
          alert_time: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
          triggered_at: null,
          message: 'Task due in 3 days',
          priority: 'medium'
        },
          id: 'alert-2',
          task_id: 'task-2',
          alert_type: 'warning',
          alert_time: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
          message: 'Task due tomorrow',
          priority: 'high'
        }
      ];
      const selectMock = {
        is: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockAlerts,
              error: null
            })
      };
        select: vi.fn().mockReturnValue(selectMock)
      const result = await service.getPendingAlerts();
      expect(result).toEqual(mockAlerts);
      expect(selectMock.is).toHaveBeenCalledWith('triggered_at', null);
    it('should handle empty results', async () => {
              data: null,
      expect(result).toEqual([]);
    it('should throw error on database failure', async () => {
              error: { message: 'Connection error' }
      await expect(service.getPendingAlerts()).rejects.toThrow('Failed to fetch pending alerts');
  describe('processAlerts', () => {
    it('should process multiple alerts successfully', async () => {
          alert_time: new Date().toISOString(),
          message: 'Test alert 1',
          message: 'Test alert 2',
      // Mock getPendingAlerts
      // Mock task data for triggerAlert
      const taskSelectMock = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'task-1',
              title: 'Test Task',
              assigned_to: { user_id: 'user-1', name: 'User 1' },
              created_by: { user_id: 'user-2', name: 'User 2' },
              wedding: { bride_name: 'Jane', groom_name: 'John' }
            },
            error: null
      // Mock alert update
      const updateMock = {
        eq: vi.fn().mockResolvedValue({ error: null })
      // Mock notification insert
      mockSupabase.from
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(selectMock) }) // getPendingAlerts
        .mockReturnValueOnce({ update: vi.fn().mockReturnValue(updateMock) }) // mark as triggered
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(taskSelectMock) }) // get task data
        .mockReturnValueOnce({ insert: insertMock }) // insert notifications
        .mockReturnValueOnce({ insert: insertMock }); // insert notifications
      const result = await service.processAlerts();
      expect(result.processed).toBe(2);
      expect(result.errors).toHaveLength(0);
    it('should handle partial failures gracefully', async () => {
          task_id: 'task-invalid',
      // Mock successful first alert processing
      const successfulTaskSelect = {
              assigned_to: { user_id: 'user-1', name: 'User 1' }
      // Mock failed second alert processing
      const failedTaskSelect = {
            data: null,
            error: { message: 'Task not found' }
        .mockReturnValueOnce({ update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) }) // mark as triggered
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(successfulTaskSelect) }) // get task data
        .mockReturnValueOnce({ insert: vi.fn().mockResolvedValue({ error: null }) }) // insert notifications
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(failedTaskSelect) }); // get task data (fails)
      expect(result.processed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('alert-2');
  describe('getDeadlineStats', () => {
    it('should calculate deadline statistics correctly', async () => {
      const mockTasks = [
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          status: 'pending',
          deadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
          status: 'in_progress',
          priority: 'critical'
          deadline: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
          status: 'completed',
          not: vi.fn().mockResolvedValue({
            data: mockTasks,
      const result = await service.getDeadlineStats('wedding-123');
      expect(result.upcoming).toBe(1); // One future deadline
      expect(result.overdue).toBe(1); // One overdue non-completed task
      expect(result.completed).toBe(1); // One completed task
      expect(result.critical_overdue).toBe(1); // One critical overdue task
    it('should handle no tasks gracefully', async () => {
            data: [],
      const result = await service.getDeadlineStats('wedding-empty');
      expect(result.upcoming).toBe(0);
      expect(result.overdue).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.critical_overdue).toBe(0);
  describe('updateTaskDeadline', () => {
    it('should delete old alerts and schedule new ones', async () => {
      const taskId = 'task-update';
      const newDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const deleteMock = {
          is: vi.fn().mockResolvedValue({ error: null })
        .mockReturnValueOnce({ delete: vi.fn().mockReturnValue(deleteMock) }) // Delete old alerts
        .mockReturnValueOnce({ insert: insertMock }); // Insert new alerts
      await service.updateTaskDeadline(taskId, newDeadline, priority);
      expect(deleteMock.eq).toHaveBeenCalledWith('task_id', taskId);
      expect(deleteMock.is).toHaveBeenCalledWith('triggered_at', null);
      expect(insertMock).toHaveBeenCalled();
    it('should handle deadline update errors', async () => {
          is: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } })
      mockSupabase.from.mockReturnValue({ 
        delete: vi.fn().mockReturnValue(deleteMock)
      // Should not throw error for delete failure, but continue with scheduling
        service.updateTaskDeadline(taskId, newDeadline, priority)
      ).resolves.not.toThrow();
  describe('Alert Message Generation', () => {
    it('should generate appropriate messages for different alert types', async () => {
      const taskId = 'task-msg';
      const reminderAlert = alerts.find((a: any) => a.alert_type === 'reminder');
      const warningAlert = alerts.find((a: any) => a.alert_type === 'warning');
      const overdueAlert = alerts.find((a: any) => a.alert_type === 'overdue');
      expect(reminderAlert.message).toContain('days');
      expect(warningAlert.message).toContain('URGENT');
      expect(overdueAlert.message).toContain('overdue');
});
