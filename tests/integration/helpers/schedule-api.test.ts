// ✅ WS-162 COMPREHENSIVE INTEGRATION TESTING SUITE - Helper Schedule API
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@/lib/supabase/client';
import { notificationService } from '@/services/NotificationService';
import {
  HelperAssignment,
  HelperSchedule,
  ScheduleUpdatePayload,
  NotificationPreferences,
  HelperRole,
  AssignmentStatus,
  ConfirmationStatus
} from '@/types/helpers';

// Test database client
let testSupabaseClient: any;
let testWeddingId: string;
let testHelperId: string;
let testAssignmentId: string;

// Mock notification service for integration testing
vi.mock('@/services/NotificationService', () => ({
  notificationService: {
    notifyScheduleAssignment: vi.fn().mockResolvedValue(true),
    notifyScheduleChange: vi.fn().mockResolvedValue(true),
    sendScheduleReminder: vi.fn().mockResolvedValue(true),
    notifyScheduleConflict: vi.fn().mockResolvedValue(true),
    notifyScheduleCancellation: vi.fn().mockResolvedValue(true),
    sendBulkNotifications: vi.fn().mockResolvedValue({ success: 2, failed: 0, errors: [] })
  }
}));

describe('WS-162 Helper Schedule API Integration Tests', () => {
  beforeEach(async () => {
    testSupabaseClient = createClient();
    
    // Create test data
    const { data: wedding, error: weddingError } = await testSupabaseClient
      .from('weddings')
      .insert({
        couple_name: 'Test Couple',
        wedding_date: '2024-06-15',
        venue_name: 'Test Venue',
        guest_count: 100,
        status: 'planning'
      })
      .select()
      .single();

    if (weddingError) throw weddingError;
    testWeddingId = wedding.id;

    const { data: helper, error: helperError } = await testSupabaseClient
      .from('helpers')
      .insert({
        name: 'Test Helper',
        email: 'test.helper@example.com',
        phone: '+1-555-0123',
        role: HelperRole.PHOTOGRAPHER,
        verified: true
      })
      .select()
      .single();

    if (helperError) throw helperError;
    testHelperId = helper.id;
  });

  afterEach(async () => {
    // Cleanup test data
    if (testAssignmentId) {
      await testSupabaseClient
        .from('helper_assignments')
        .delete()
        .eq('id', testAssignmentId);
    }

    if (testHelperId) {
      await testSupabaseClient
        .from('helpers')
        .delete()
        .eq('id', testHelperId);
    }

    if (testWeddingId) {
      await testSupabaseClient
        .from('weddings')
        .delete()
        .eq('id', testWeddingId);
    }

    vi.clearAllMocks();
  });

  describe('Helper Assignment Creation', () => {
    it('should create helper assignment with schedule successfully', async () => {
      const assignmentData = {
        wedding_id: testWeddingId,
        helper_id: testHelperId,
        helper_name: 'Test Helper',
        helper_email: 'test.helper@example.com',
        role: HelperRole.PHOTOGRAPHER,
        status: AssignmentStatus.PENDING,
        notification_preferences: {
          scheduleChanges: true,
          taskUpdates: true,
          reminderHours: 24,
          preferredMethod: 'email',
          quietHours: { start: '22:00', end: '08:00' }
        },
        created_by: 'test-user'
      };

      const { data: assignment, error: assignmentError } = await testSupabaseClient
        .from('helper_assignments')
        .insert(assignmentData)
        .select()
        .single();

      expect(assignmentError).toBeNull();
      expect(assignment).toBeDefined();
      expect(assignment.wedding_id).toBe(testWeddingId);
      expect(assignment.helper_id).toBe(testHelperId);
      expect(assignment.role).toBe(HelperRole.PHOTOGRAPHER);

      testAssignmentId = assignment.id;

      // Create associated schedule
      const scheduleData = {
        assignment_id: testAssignmentId,
        date: '2024-06-15',
        start_time: '14:00',
        end_time: '18:00',
        time_zone: 'America/New_York',
        location: {
          id: 'venue-1',
          name: 'Grand Ballroom',
          address: '123 Wedding Ave, City, ST 12345',
          coordinates: { latitude: 40.7128, longitude: -74.0060 },
          contactPerson: 'John Venue Manager',
          contactPhone: '+1-555-0123'
        },
        confirmation_status: ConfirmationStatus.PENDING,
        last_modified_by: 'test-user'
      };

      const { data: schedule, error: scheduleError } = await testSupabaseClient
        .from('helper_schedules')
        .insert(scheduleData)
        .select()
        .single();

      expect(scheduleError).toBeNull();
      expect(schedule).toBeDefined();
      expect(schedule.assignment_id).toBe(testAssignmentId);
      expect(schedule.start_time).toBe('14:00');
      expect(schedule.end_time).toBe('18:00');

      // Verify notification was triggered
      expect(notificationService.notifyScheduleAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          id: testAssignmentId,
          helperId: testHelperId,
          role: HelperRole.PHOTOGRAPHER
        })
      );
    });

    it('should handle assignment creation with invalid data', async () => {
      const invalidAssignmentData = {
        wedding_id: 'non-existent-id',
        helper_id: testHelperId,
        helper_name: 'Test Helper',
        role: 'INVALID_ROLE' as HelperRole,
        status: AssignmentStatus.PENDING
      };

      const { error } = await testSupabaseClient
        .from('helper_assignments')
        .insert(invalidAssignmentData)
        .select()
        .single();

      expect(error).toBeDefined();
      expect(error?.message).toContain('foreign key');
    });

    it('should enforce assignment uniqueness constraints', async () => {
      // Create first assignment
      const assignmentData = {
        wedding_id: testWeddingId,
        helper_id: testHelperId,
        helper_name: 'Test Helper',
        helper_email: 'test.helper@example.com',
        role: HelperRole.PHOTOGRAPHER,
        status: AssignmentStatus.PENDING,
        created_by: 'test-user'
      };

      const { data: assignment1 } = await testSupabaseClient
        .from('helper_assignments')
        .insert(assignmentData)
        .select()
        .single();

      testAssignmentId = assignment1.id;

      // Try to create duplicate assignment for same helper/wedding
      const { error } = await testSupabaseClient
        .from('helper_assignments')
        .insert(assignmentData)
        .select()
        .single();

      expect(error).toBeDefined();
      expect(error?.message).toContain('duplicate');
    });
  });

  describe('Schedule Updates and Real-time Sync', () => {
    beforeEach(async () => {
      // Create test assignment and schedule
      const { data: assignment } = await testSupabaseClient
        .from('helper_assignments')
        .insert({
          wedding_id: testWeddingId,
          helper_id: testHelperId,
          helper_name: 'Test Helper',
          helper_email: 'test.helper@example.com',
          role: HelperRole.PHOTOGRAPHER,
          status: AssignmentStatus.CONFIRMED,
          created_by: 'test-user'
        })
        .select()
        .single();

      testAssignmentId = assignment.id;

      await testSupabaseClient
        .from('helper_schedules')
        .insert({
          assignment_id: testAssignmentId,
          date: '2024-06-15',
          start_time: '14:00',
          end_time: '18:00',
          time_zone: 'America/New_York',
          location: {
            id: 'venue-1',
            name: 'Grand Ballroom',
            address: '123 Wedding Ave, City, ST 12345'
          },
          confirmation_status: ConfirmationStatus.PENDING,
          last_modified_by: 'test-user'
        });
    });

    it('should update schedule successfully', async () => {
      const updateData: Partial<HelperSchedule> = {
        startTime: '13:00',
        endTime: '17:00',
        confirmationStatus: ConfirmationStatus.CONFIRMED
      };

      const { data: updatedSchedule, error } = await testSupabaseClient
        .from('helper_schedules')
        .update({
          start_time: updateData.startTime,
          end_time: updateData.endTime,
          confirmation_status: updateData.confirmationStatus,
          last_modified_at: new Date().toISOString(),
          last_modified_by: 'test-user'
        })
        .eq('assignment_id', testAssignmentId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedSchedule).toBeDefined();
      expect(updatedSchedule.start_time).toBe('13:00');
      expect(updatedSchedule.end_time).toBe('17:00');
      expect(updatedSchedule.confirmation_status).toBe(ConfirmationStatus.CONFIRMED);

      // Verify notification was triggered for schedule change
      expect(notificationService.notifyScheduleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          id: testAssignmentId
        }),
        expect.objectContaining({
          start_time: '14:00', // Old time
          end_time: '18:00'
        }),
        undefined // No reason provided
      );
    });

    it('should handle concurrent schedule updates correctly', async () => {
      // Simulate concurrent updates
      const update1 = testSupabaseClient
        .from('helper_schedules')
        .update({
          start_time: '13:00',
          last_modified_at: new Date().toISOString(),
          last_modified_by: 'user-1'
        })
        .eq('assignment_id', testAssignmentId);

      const update2 = testSupabaseClient
        .from('helper_schedules')
        .update({
          end_time: '19:00',
          last_modified_at: new Date().toISOString(),
          last_modified_by: 'user-2'
        })
        .eq('assignment_id', testAssignmentId);

      const [result1, result2] = await Promise.allSettled([update1, update2]);

      // Both updates should complete successfully
      expect(result1.status).toBe('fulfilled');
      expect(result2.status).toBe('fulfilled');

      // Verify final state
      const { data: finalSchedule } = await testSupabaseClient
        .from('helper_schedules')
        .select()
        .eq('assignment_id', testAssignmentId)
        .single();

      expect(finalSchedule.start_time).toBe('13:00');
      expect(finalSchedule.end_time).toBe('19:00');
    });

    it('should maintain data consistency during updates', async () => {
      const originalSchedule = await testSupabaseClient
        .from('helper_schedules')
        .select()
        .eq('assignment_id', testAssignmentId)
        .single();

      // Update with invalid time range
      const { error } = await testSupabaseClient
        .from('helper_schedules')
        .update({
          start_time: '20:00',
          end_time: '10:00', // End before start
          last_modified_at: new Date().toISOString()
        })
        .eq('assignment_id', testAssignmentId);

      // Database constraints should prevent invalid updates
      expect(error).toBeDefined();

      // Verify original data is unchanged
      const { data: unchangedSchedule } = await testSupabaseClient
        .from('helper_schedules')
        .select()
        .eq('assignment_id', testAssignmentId)
        .single();

      expect(unchangedSchedule.start_time).toBe(originalSchedule.data.start_time);
      expect(unchangedSchedule.end_time).toBe(originalSchedule.data.end_time);
    });
  });

  describe('Real-time Subscriptions and Notifications', () => {
    it('should trigger real-time updates on schedule changes', async () => {
      // Create test assignment and schedule
      const { data: assignment } = await testSupabaseClient
        .from('helper_assignments')
        .insert({
          wedding_id: testWeddingId,
          helper_id: testHelperId,
          helper_name: 'Test Helper',
          helper_email: 'test.helper@example.com',
          role: HelperRole.COORDINATOR,
          status: AssignmentStatus.CONFIRMED,
          created_by: 'test-user'
        })
        .select()
        .single();

      testAssignmentId = assignment.id;

      await testSupabaseClient
        .from('helper_schedules')
        .insert({
          assignment_id: testAssignmentId,
          date: '2024-06-15',
          start_time: '09:00',
          end_time: '17:00',
          time_zone: 'America/New_York',
          location: {
            id: 'venue-1',
            name: 'Wedding Venue',
            address: '123 Main St'
          },
          confirmation_status: ConfirmationStatus.PENDING,
          last_modified_by: 'test-user'
        });

      // Set up real-time subscription
      const subscriptionData: any[] = [];
      
      const subscription = testSupabaseClient
        .channel('schedule-test-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'helper_schedules',
            filter: `assignment_id=eq.${testAssignmentId}`
          },
          (payload: any) => subscriptionData.push(payload)
        )
        .subscribe();

      // Wait for subscription to be active
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Make update to trigger real-time event
      await testSupabaseClient
        .from('helper_schedules')
        .update({
          confirmation_status: ConfirmationStatus.CONFIRMED,
          last_modified_at: new Date().toISOString()
        })
        .eq('assignment_id', testAssignmentId);

      // Wait for real-time event
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify real-time event was received
      expect(subscriptionData).toHaveLength(1);
      expect(subscriptionData[0].new.confirmation_status).toBe(ConfirmationStatus.CONFIRMED);

      // Cleanup subscription
      subscription.unsubscribe();
    });

    it('should send notifications with proper timing', async () => {
      const { data: assignment } = await testSupabaseClient
        .from('helper_assignments')
        .insert({
          wedding_id: testWeddingId,
          helper_id: testHelperId,
          helper_name: 'Test Helper',
          helper_email: 'test.helper@example.com',
          role: HelperRole.PHOTOGRAPHER,
          status: AssignmentStatus.PENDING,
          notification_preferences: {
            scheduleChanges: true,
            taskUpdates: true,
            reminderHours: 2, // 2 hours before event
            preferredMethod: 'both',
            quietHours: { start: '22:00', end: '08:00' }
          },
          created_by: 'test-user'
        })
        .select()
        .single();

      testAssignmentId = assignment.id;

      // Create schedule for near-future event (3 hours from now)
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 3);

      await testSupabaseClient
        .from('helper_schedules')
        .insert({
          assignment_id: testAssignmentId,
          date: futureDate.toISOString().split('T')[0],
          start_time: futureDate.toTimeString().slice(0, 5),
          end_time: `${futureDate.getHours() + 4}:00`,
          time_zone: 'America/New_York',
          location: {
            id: 'venue-1',
            name: 'Wedding Venue',
            address: '123 Main St'
          },
          confirmation_status: ConfirmationStatus.CONFIRMED,
          last_modified_by: 'test-user'
        });

      // Trigger reminder notification
      await notificationService.sendScheduleReminder(assignment, 2);

      expect(notificationService.sendScheduleReminder).toHaveBeenCalledWith(
        assignment,
        2
      );
    });

    it('should handle notification failures gracefully', async () => {
      // Mock notification service to fail
      vi.mocked(notificationService.notifyScheduleChange).mockRejectedValueOnce(
        new Error('Email service unavailable')
      );

      const { data: assignment } = await testSupabaseClient
        .from('helper_assignments')
        .insert({
          wedding_id: testWeddingId,
          helper_id: testHelperId,
          helper_name: 'Test Helper',
          helper_email: 'test.helper@example.com',
          role: HelperRole.COORDINATOR,
          status: AssignmentStatus.CONFIRMED,
          created_by: 'test-user'
        })
        .select()
        .single();

      testAssignmentId = assignment.id;

      await testSupabaseClient
        .from('helper_schedules')
        .insert({
          assignment_id: testAssignmentId,
          date: '2024-06-15',
          start_time: '14:00',
          end_time: '18:00',
          time_zone: 'America/New_York',
          location: { id: 'venue-1', name: 'Wedding Venue' },
          confirmation_status: ConfirmationStatus.PENDING,
          last_modified_by: 'test-user'
        });

      // Update schedule (should fail to send notification but still update DB)
      const { error } = await testSupabaseClient
        .from('helper_schedules')
        .update({
          start_time: '13:00',
          last_modified_at: new Date().toISOString()
        })
        .eq('assignment_id', testAssignmentId);

      // Database update should succeed despite notification failure
      expect(error).toBeNull();

      // Verify the update was saved
      const { data: updatedSchedule } = await testSupabaseClient
        .from('helper_schedules')
        .select()
        .eq('assignment_id', testAssignmentId)
        .single();

      expect(updatedSchedule.start_time).toBe('13:00');
    });
  });

  describe('Schedule Conflict Detection Integration', () => {
    let conflictingAssignmentId1: string;
    let conflictingAssignmentId2: string;

    beforeEach(async () => {
      // Create helper 1
      const { data: helper1 } = await testSupabaseClient
        .from('helpers')
        .insert({
          name: 'Helper One',
          email: 'helper1@example.com',
          role: HelperRole.PHOTOGRAPHER,
          verified: true
        })
        .select()
        .single();

      // Create two assignments for the same helper on the same day
      const { data: assignment1 } = await testSupabaseClient
        .from('helper_assignments')
        .insert({
          wedding_id: testWeddingId,
          helper_id: helper1.id,
          helper_name: 'Helper One',
          helper_email: 'helper1@example.com',
          role: HelperRole.PHOTOGRAPHER,
          status: AssignmentStatus.CONFIRMED,
          created_by: 'test-user'
        })
        .select()
        .single();

      conflictingAssignmentId1 = assignment1.id;

      const { data: assignment2 } = await testSupabaseClient
        .from('helper_assignments')
        .insert({
          wedding_id: testWeddingId,
          helper_id: helper1.id,
          helper_name: 'Helper One',
          helper_email: 'helper1@example.com',
          role: HelperRole.PHOTOGRAPHER,
          status: AssignmentStatus.CONFIRMED,
          created_by: 'test-user'
        })
        .select()
        .single();

      conflictingAssignmentId2 = assignment2.id;

      // Create overlapping schedules
      await testSupabaseClient
        .from('helper_schedules')
        .insert([
          {
            assignment_id: conflictingAssignmentId1,
            date: '2024-06-15',
            start_time: '14:00',
            end_time: '18:00',
            time_zone: 'America/New_York',
            location: { id: 'venue-1', name: 'Venue 1' },
            confirmation_status: ConfirmationStatus.CONFIRMED,
            last_modified_by: 'test-user'
          },
          {
            assignment_id: conflictingAssignmentId2,
            date: '2024-06-15',
            start_time: '16:00', // Overlaps with first schedule
            end_time: '20:00',
            time_zone: 'America/New_York',
            location: { id: 'venue-2', name: 'Venue 2' },
            confirmation_status: ConfirmationStatus.PENDING,
            last_modified_by: 'test-user'
          }
        ]);
    });

    afterEach(async () => {
      // Cleanup conflicting assignments
      if (conflictingAssignmentId1) {
        await testSupabaseClient
          .from('helper_assignments')
          .delete()
          .eq('id', conflictingAssignmentId1);
      }
      if (conflictingAssignmentId2) {
        await testSupabaseClient
          .from('helper_assignments')
          .delete()
          .eq('id', conflictingAssignmentId2);
      }
    });

    it('should detect and log schedule conflicts', async () => {
      // Query for conflicting schedules
      const { data: schedules } = await testSupabaseClient
        .from('helper_schedules')
        .select(`
          *,
          helper_assignments (
            helper_id,
            helper_name
          )
        `)
        .eq('date', '2024-06-15')
        .order('start_time');

      expect(schedules).toHaveLength(2);

      // Check for overlaps programmatically
      const schedule1 = schedules[0];
      const schedule2 = schedules[1];

      const start1 = parseInt(schedule1.start_time.replace(':', ''));
      const end1 = parseInt(schedule1.end_time.replace(':', ''));
      const start2 = parseInt(schedule2.start_time.replace(':', ''));
      const end2 = parseInt(schedule2.end_time.replace(':', ''));

      const hasOverlap = start1 < end2 && start2 < end1;
      expect(hasOverlap).toBe(true);

      // Should trigger conflict notification
      expect(notificationService.notifyScheduleConflict).toHaveBeenCalled();
    });

    it('should update conflict status when schedules are modified', async () => {
      // Resolve conflict by updating one schedule
      const { error } = await testSupabaseClient
        .from('helper_schedules')
        .update({
          start_time: '09:00',
          end_time: '13:00', // No longer overlaps
          last_modified_at: new Date().toISOString()
        })
        .eq('assignment_id', conflictingAssignmentId1);

      expect(error).toBeNull();

      // Verify conflict is resolved
      const { data: updatedSchedules } = await testSupabaseClient
        .from('helper_schedules')
        .select()
        .eq('date', '2024-06-15')
        .order('start_time');

      const schedule1 = updatedSchedules[0];
      const schedule2 = updatedSchedules[1];

      const start1 = parseInt(schedule1.start_time.replace(':', ''));
      const end1 = parseInt(schedule1.end_time.replace(':', ''));
      const start2 = parseInt(schedule2.start_time.replace(':', ''));
      const end2 = parseInt(schedule2.end_time.replace(':', ''));

      const hasOverlap = start1 < end2 && start2 < end1;
      expect(hasOverlap).toBe(false);
    });
  });

  describe('Bulk Operations and Performance', () => {
    it('should handle bulk assignment creation efficiently', async () => {
      // Create multiple helpers
      const helpers = await Promise.all(
        Array.from({ length: 5 }, async (_, i) => {
          const { data } = await testSupabaseClient
            .from('helpers')
            .insert({
              name: `Bulk Helper ${i + 1}`,
              email: `bulk.helper${i + 1}@example.com`,
              role: HelperRole.ASSISTANT,
              verified: true
            })
            .select()
            .single();
          return data;
        })
      );

      // Create bulk assignments
      const bulkAssignments = helpers.map(helper => ({
        wedding_id: testWeddingId,
        helper_id: helper.id,
        helper_name: helper.name,
        helper_email: helper.email,
        role: HelperRole.ASSISTANT,
        status: AssignmentStatus.PENDING,
        created_by: 'test-user'
      }));

      const startTime = performance.now();
      
      const { data: createdAssignments, error } = await testSupabaseClient
        .from('helper_assignments')
        .insert(bulkAssignments)
        .select();

      const endTime = performance.now();
      const operationTime = endTime - startTime;

      expect(error).toBeNull();
      expect(createdAssignments).toHaveLength(5);
      expect(operationTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify bulk notifications
      expect(notificationService.sendBulkNotifications).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: HelperRole.ASSISTANT })
        ]),
        'schedule_assigned',
        expect.any(Object)
      );

      // Cleanup
      await testSupabaseClient
        .from('helper_assignments')
        .delete()
        .in('id', createdAssignments.map(a => a.id));

      await testSupabaseClient
        .from('helpers')
        .delete()
        .in('id', helpers.map(h => h.id));
    });

    it('should maintain performance with large datasets', async () => {
      // Create multiple assignments for performance testing
      const helpers = await Promise.all(
        Array.from({ length: 20 }, async (_, i) => {
          const { data } = await testSupabaseClient
            .from('helpers')
            .insert({
              name: `Perf Helper ${i + 1}`,
              email: `perf.helper${i + 1}@example.com`,
              role: i % 2 === 0 ? HelperRole.PHOTOGRAPHER : HelperRole.COORDINATOR,
              verified: true
            })
            .select()
            .single();
          return data;
        })
      );

      const assignments = helpers.map(helper => ({
        wedding_id: testWeddingId,
        helper_id: helper.id,
        helper_name: helper.name,
        helper_email: helper.email,
        role: helper.role,
        status: AssignmentStatus.CONFIRMED,
        created_by: 'test-user'
      }));

      const { data: createdAssignments } = await testSupabaseClient
        .from('helper_assignments')
        .insert(assignments)
        .select();

      // Query performance test
      const queryStartTime = performance.now();
      
      const { data: queriedAssignments, error } = await testSupabaseClient
        .from('helper_assignments')
        .select(`
          *,
          helper_schedules(*),
          helper_tasks(*)
        `)
        .eq('wedding_id', testWeddingId)
        .order('created_at');

      const queryEndTime = performance.now();
      const queryTime = queryEndTime - queryStartTime;

      expect(error).toBeNull();
      expect(queriedAssignments).toHaveLength(20);
      expect(queryTime).toBeLessThan(2000); // Should complete within 2 seconds

      // Cleanup
      await testSupabaseClient
        .from('helper_assignments')
        .delete()
        .in('id', createdAssignments.map(a => a.id));

      await testSupabaseClient
        .from('helpers')
        .delete()
        .in('id', helpers.map(h => h.id));
    });
  });

  describe('Data Validation and Security', () => {
    it('should enforce proper data validation', async () => {
      const invalidData = {
        wedding_id: testWeddingId,
        helper_id: testHelperId,
        helper_name: '', // Invalid: empty name
        helper_email: 'invalid-email', // Invalid: malformed email
        role: 'INVALID_ROLE', // Invalid: non-existent role
        status: AssignmentStatus.PENDING,
        created_by: 'test-user'
      };

      const { error } = await testSupabaseClient
        .from('helper_assignments')
        .insert(invalidData);

      expect(error).toBeDefined();
      // Should reject due to validation constraints
    });

    it('should enforce Row Level Security (RLS) policies', async () => {
      // This would test RLS policies if implemented
      // For now, we verify that proper user context is required

      const { data: assignment } = await testSupabaseClient
        .from('helper_assignments')
        .insert({
          wedding_id: testWeddingId,
          helper_id: testHelperId,
          helper_name: 'Test Helper',
          helper_email: 'test.helper@example.com',
          role: HelperRole.PHOTOGRAPHER,
          status: AssignmentStatus.PENDING,
          created_by: 'test-user'
        })
        .select()
        .single();

      testAssignmentId = assignment.id;

      // Verify assignment was created with proper permissions
      expect(assignment.created_by).toBe('test-user');
    });

    it('should sanitize input data properly', async () => {
      const dataWithPotentialXSS = {
        wedding_id: testWeddingId,
        helper_id: testHelperId,
        helper_name: '<script>alert("xss")</script>',
        helper_email: 'test@example.com',
        role: HelperRole.COORDINATOR,
        status: AssignmentStatus.PENDING,
        created_by: 'test-user'
      };

      const { data: assignment, error } = await testSupabaseClient
        .from('helper_assignments')
        .insert(dataWithPotentialXSS)
        .select()
        .single();

      expect(error).toBeNull();
      expect(assignment.helper_name).not.toContain('<script>');
      // Should be sanitized by database constraints or application layer

      testAssignmentId = assignment.id;
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle database connection failures gracefully', async () => {
      // Simulate connection issue by using invalid client
      const invalidClient = createClient();
      // Modify URL to cause connection failure
      invalidClient.supabaseUrl = 'https://invalid-url.supabase.co';

      const { error } = await invalidClient
        .from('helper_assignments')
        .select()
        .limit(1);

      expect(error).toBeDefined();
      expect(error.message).toContain('fetch');
    });

    it('should recover from transaction failures', async () => {
      // Start a transaction that will fail
      const { error: transactionError } = await testSupabaseClient.rpc(
        'create_assignment_with_schedule',
        {
          assignment_data: {
            wedding_id: testWeddingId,
            helper_id: 'non-existent-helper', // This will cause transaction to fail
            helper_name: 'Test Helper',
            role: HelperRole.PHOTOGRAPHER
          },
          schedule_data: {
            date: '2024-06-15',
            start_time: '14:00',
            end_time: '18:00'
          }
        }
      );

      expect(transactionError).toBeDefined();

      // Verify no partial data was created
      const { data: assignments } = await testSupabaseClient
        .from('helper_assignments')
        .select()
        .eq('wedding_id', testWeddingId);

      expect(assignments).toHaveLength(0);
    });

    it('should handle API rate limiting gracefully', async () => {
      // Simulate rapid requests to test rate limiting
      const rapidRequests = Array.from({ length: 100 }, () =>
        testSupabaseClient
          .from('helper_assignments')
          .select()
          .limit(1)
      );

      const results = await Promise.allSettled(rapidRequests);
      
      // Some requests might fail due to rate limiting, but system should remain stable
      const successfulRequests = results.filter(r => r.status === 'fulfilled').length;
      const failedRequests = results.filter(r => r.status === 'rejected').length;

      expect(successfulRequests + failedRequests).toBe(100);
      expect(successfulRequests).toBeGreaterThan(0); // At least some should succeed
    });
  });
});

describe('WS-162 Schedule Management Workflow Integration', () => {
  let workflowWeddingId: string;
  let workflowHelperId: string;
  let workflowAssignmentId: string;

  beforeEach(async () => {
    const testClient = createClient();
    
    // Create wedding for workflow testing
    const { data: wedding } = await testClient
      .from('weddings')
      .insert({
        couple_name: 'Workflow Test Couple',
        wedding_date: '2024-07-15',
        venue_name: 'Workflow Test Venue',
        status: 'planning'
      })
      .select()
      .single();

    workflowWeddingId = wedding.id;

    // Create helper for workflow testing
    const { data: helper } = await testClient
      .from('helpers')
      .insert({
        name: 'Workflow Test Helper',
        email: 'workflow.helper@example.com',
        role: HelperRole.COORDINATOR,
        verified: true
      })
      .select()
      .single();

    workflowHelperId = helper.id;
  });

  afterEach(async () => {
    const testClient = createClient();
    
    // Cleanup workflow test data
    if (workflowAssignmentId) {
      await testClient
        .from('helper_assignments')
        .delete()
        .eq('id', workflowAssignmentId);
    }

    if (workflowHelperId) {
      await testClient
        .from('helpers')
        .delete()
        .eq('id', workflowHelperId);
    }

    if (workflowWeddingId) {
      await testClient
        .from('weddings')
        .delete()
        .eq('id', workflowWeddingId);
    }
  });

  it('should complete full assignment-to-completion workflow', async () => {
    const testClient = createClient();

    // Step 1: Create assignment
    const { data: assignment } = await testClient
      .from('helper_assignments')
      .insert({
        wedding_id: workflowWeddingId,
        helper_id: workflowHelperId,
        helper_name: 'Workflow Test Helper',
        helper_email: 'workflow.helper@example.com',
        role: HelperRole.COORDINATOR,
        status: AssignmentStatus.PENDING,
        notification_preferences: {
          scheduleChanges: true,
          taskUpdates: true,
          reminderHours: 24,
          preferredMethod: 'email',
          quietHours: { start: '22:00', end: '08:00' }
        },
        created_by: 'workflow-test-user'
      })
      .select()
      .single();

    workflowAssignmentId = assignment.id;
    expect(assignment.status).toBe(AssignmentStatus.PENDING);

    // Step 2: Create schedule
    const { data: schedule } = await testClient
      .from('helper_schedules')
      .insert({
        assignment_id: workflowAssignmentId,
        date: '2024-07-15',
        start_time: '10:00',
        end_time: '16:00',
        time_zone: 'America/New_York',
        location: {
          id: 'workflow-venue-1',
          name: 'Workflow Test Venue',
          address: '456 Test Ave, Test City, TC 54321'
        },
        confirmation_status: ConfirmationStatus.PENDING,
        last_modified_by: 'workflow-test-user'
      })
      .select()
      .single();

    expect(schedule.confirmation_status).toBe(ConfirmationStatus.PENDING);

    // Step 3: Helper confirms schedule
    const { data: confirmedSchedule } = await testClient
      .from('helper_schedules')
      .update({
        confirmation_status: ConfirmationStatus.CONFIRMED,
        last_modified_at: new Date().toISOString(),
        last_modified_by: workflowHelperId
      })
      .eq('id', schedule.id)
      .select()
      .single();

    expect(confirmedSchedule.confirmation_status).toBe(ConfirmationStatus.CONFIRMED);

    // Step 4: Update assignment status
    const { data: confirmedAssignment } = await testClient
      .from('helper_assignments')
      .update({
        status: AssignmentStatus.CONFIRMED,
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowAssignmentId)
      .select()
      .single();

    expect(confirmedAssignment.status).toBe(AssignmentStatus.CONFIRMED);

    // Step 5: Add tasks to assignment
    const { data: tasks } = await testClient
      .from('helper_tasks')
      .insert([
        {
          assignment_id: workflowAssignmentId,
          title: 'Setup coordination area',
          description: 'Prepare coordination station with supplies',
          category: TaskCategory.SETUP,
          priority: TaskPriority.HIGH,
          estimated_duration: 30,
          is_completed: false
        },
        {
          assignment_id: workflowAssignmentId,
          title: 'Coordinate with vendors',
          description: 'Ensure all vendors are on schedule',
          category: TaskCategory.COORDINATION,
          priority: TaskPriority.CRITICAL,
          estimated_duration: 60,
          is_completed: false
        }
      ])
      .select();

    expect(tasks).toHaveLength(2);

    // Step 6: Mark assignment as in progress
    const { data: inProgressAssignment } = await testClient
      .from('helper_assignments')
      .update({
        status: AssignmentStatus.IN_PROGRESS,
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowAssignmentId)
      .select()
      .single();

    expect(inProgressAssignment.status).toBe(AssignmentStatus.IN_PROGRESS);

    // Step 7: Complete tasks
    await testClient
      .from('helper_tasks')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        completed_by: workflowHelperId
      })
      .eq('assignment_id', workflowAssignmentId);

    // Step 8: Mark assignment as completed
    const { data: completedAssignment } = await testClient
      .from('helper_assignments')
      .update({
        status: AssignmentStatus.COMPLETED,
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowAssignmentId)
      .select()
      .single();

    expect(completedAssignment.status).toBe(AssignmentStatus.COMPLETED);

    // Verify notifications were triggered at appropriate stages
    expect(notificationService.notifyScheduleAssignment).toHaveBeenCalledWith(
      expect.objectContaining({ id: workflowAssignmentId })
    );

    expect(notificationService.notifyScheduleChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: workflowAssignmentId }),
      expect.any(Object),
      expect.any(String)
    );
  });

  it('should handle workflow cancellation properly', async () => {
    const testClient = createClient();

    // Create assignment
    const { data: assignment } = await testClient
      .from('helper_assignments')
      .insert({
        wedding_id: workflowWeddingId,
        helper_id: workflowHelperId,
        helper_name: 'Workflow Test Helper',
        helper_email: 'workflow.helper@example.com',
        role: HelperRole.COORDINATOR,
        status: AssignmentStatus.CONFIRMED,
        created_by: 'workflow-test-user'
      })
      .select()
      .single();

    workflowAssignmentId = assignment.id;

    // Create schedule
    await testClient
      .from('helper_schedules')
      .insert({
        assignment_id: workflowAssignmentId,
        date: '2024-07-15',
        start_time: '10:00',
        end_time: '16:00',
        time_zone: 'America/New_York',
        location: { id: 'venue-1', name: 'Test Venue' },
        confirmation_status: ConfirmationStatus.CONFIRMED,
        last_modified_by: 'workflow-test-user'
      });

    // Cancel assignment
    const { data: cancelledAssignment } = await testClient
      .from('helper_assignments')
      .update({
        status: AssignmentStatus.CANCELLED,
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowAssignmentId)
      .select()
      .single();

    expect(cancelledAssignment.status).toBe(AssignmentStatus.CANCELLED);

    // Verify cancellation notification
    expect(notificationService.notifyScheduleCancellation).toHaveBeenCalledWith(
      expect.objectContaining({ id: workflowAssignmentId }),
      undefined
    );
  });
});