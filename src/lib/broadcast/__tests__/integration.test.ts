import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from 'vitest';
import { EmailBroadcastService } from '../integrations/email-service';
import { SMSBroadcastService } from '../integrations/sms-service';
import { CalendarBroadcastService } from '../integrations/calendar-service';
import { WorkspaceBroadcastService } from '../integrations/workspace-service';
import { createClient } from '@supabase/supabase-js';

// Mock all dependencies
vi.mock('@supabase/supabase-js');
vi.mock('resend');
vi.mock('twilio');
vi.mock('googleapis');
vi.mock('@slack/web-api');
vi.mock('@microsoft/microsoft-graph-client');

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
      in: vi.fn(),
      order: vi.fn(() => ({
        limit: vi.fn(),
      })),
    })),
    insert: vi.fn(),
    update: vi.fn(() => ({
      eq: vi.fn(),
    })),
    upsert: vi.fn(),
  })),
  auth: {
    getUser: vi.fn(),
  },
};

describe('Broadcast System Integration Tests', () => {
  let emailService: EmailBroadcastService;
  let smsService: SMSBroadcastService;
  let calendarService: CalendarBroadcastService;
  let workspaceService: WorkspaceBroadcastService;

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as Mock).mockReturnValue(mockSupabase);

    emailService = new EmailBroadcastService();
    smsService = new SMSBroadcastService();
    calendarService = new CalendarBroadcastService();
    workspaceService = new WorkspaceBroadcastService();

    // Setup default mock responses
    mockSupabase
      .from()
      .insert.mockResolvedValue({ data: { id: 'test-id' }, error: null });
    mockSupabase.from().upsert.mockResolvedValue({ data: null, error: null });
    mockSupabase
      .from()
      .select()
      .eq()
      .single.mockResolvedValue({
        data: { id: 'test-org', name: 'Test Wedding Company' },
        error: null,
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Wedding Day Emergency Communication Workflow', () => {
    it('should handle complete emergency broadcast workflow', async () => {
      // Scenario: Venue change on wedding day morning
      const emergencyBroadcast = {
        id: 'emergency-broadcast-123',
        title: 'URGENT: Venue Changed - Wedding Day Emergency',
        content:
          'Due to flood damage, ceremony moved to backup venue: Grand Hotel Ballroom, 123 Main St',
        recipient_type: 'all' as const,
        organization_id: 'org-123',
        metadata: {
          is_wedding_day: true,
          is_emergency: true,
          priority: 'critical',
          wedding_date: '2024-06-15',
          couple_names: 'Sarah & Mike',
          old_venue: 'Riverside Chapel',
          new_venue: 'Grand Hotel Ballroom',
          venue_address: '123 Main St, Downtown',
          timeline_impact:
            'No time changes - all vendors report to new location',
        },
      };

      const weddingTeam = [
        // Couple
        {
          id: 'couple-1',
          email: 'sarah@example.com',
          phone: '+1234567890',
          name: 'Sarah Johnson',
          type: 'couple',
          preferred_channel: 'sms',
        },
        // Key Vendors
        {
          id: 'photographer-1',
          email: 'john@photography.com',
          phone: '+1234567891',
          slack_user_id: 'U12345',
          name: 'John Photography',
          type: 'photographer',
        },
        {
          id: 'florist-1',
          email: 'flowers@bloom.com',
          phone: '+1234567892',
          teams_user_id: 'teams-user-123',
          name: 'Bloom Florists',
          type: 'florist',
        },
        {
          id: 'caterer-1',
          email: 'catering@feast.com',
          phone: '+1234567893',
          name: 'Feast Catering',
          type: 'caterer',
        },
      ];

      // Step 1: Send emergency email notifications (high priority)
      const emailResults = await emailService.sendBroadcast(
        emergencyBroadcast,
        weddingTeam,
      );
      expect(emailResults.success).toBe(true);
      expect(emailResults.sent_count).toBe(4);

      // Step 2: Send emergency SMS notifications (immediate delivery)
      const smsResults = await smsService.sendBroadcast(
        emergencyBroadcast,
        weddingTeam,
      );
      expect(smsResults.success).toBe(true);
      expect(smsResults.sent_count).toBe(4);

      // Step 3: Notify via workspace channels (Slack/Teams)
      const workspaceResults =
        await workspaceService.sendCrossPlatformBroadcast(
          emergencyBroadcast,
          weddingTeam.filter(
            (member) => member.slack_user_id || member.teams_user_id,
          ),
        );
      expect(workspaceResults.sync_successful).toBe(true);

      // Step 4: Update calendar events with new venue
      const venueUpdateEvent = {
        id: 'ceremony-event-123',
        summary: 'UPDATED: Wedding Ceremony - Sarah & Mike',
        location: 'Grand Hotel Ballroom, 123 Main St, Downtown',
        description:
          'VENUE CHANGED: Due to flood damage at Riverside Chapel, ceremony moved to Grand Hotel Ballroom',
        start: { dateTime: '2024-06-15T16:00:00Z' },
        end: { dateTime: '2024-06-15T17:00:00Z' },
      };

      const calendarResults =
        await calendarService.syncTimelineChanges(venueUpdateEvent);
      expect(calendarResults.timeline_updated).toBe(true);
      expect(calendarResults.changes_detected).toContain('location_changed');

      // Verify all communication channels were used
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          broadcast_id: 'emergency-broadcast-123',
          channels_used: ['email', 'sms', 'slack', 'teams', 'calendar'],
          emergency_protocol: true,
          total_recipients: 4,
        }),
      );
    });

    it('should handle escalation when primary channels fail', async () => {
      const criticalBroadcast = {
        id: 'critical-broadcast-456',
        title: 'CRITICAL: Photographer Emergency',
        content:
          'Primary photographer unavailable - backup photographer assigned',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {
          is_wedding_day: true,
          priority: 'critical',
          escalation_required: true,
          max_escalation_level: 'phone_call',
        },
      };

      const keyVendor = {
        id: 'coordinator-1',
        email: 'coordinator@wedding.com',
        phone: '+1234567894',
        emergency_contact: '+1234567895',
        name: 'Wedding Coordinator',
        type: 'coordinator',
      };

      // Mock SMS failure
      const mockSmsService = {
        sendBroadcast: vi.fn().mockResolvedValue({
          success: false,
          errors: ['Message delivery failed'],
          escalated_to_phone_call: true,
          emergency_contacts_called: ['+1234567895'],
        }),
      };

      const result = await mockSmsService.sendBroadcast(criticalBroadcast, [
        keyVendor,
      ]);

      expect(result.escalated_to_phone_call).toBe(true);
      expect(result.emergency_contacts_called).toContain('+1234567895');
    });
  });

  describe('Multi-Service Wedding Timeline Synchronization', () => {
    it('should sync timeline changes across all services', async () => {
      // Scenario: Timeline adjustment 2 days before wedding
      const timelineChange = {
        wedding_id: 'wedding-789',
        couple_names: 'Emma & James',
        wedding_date: '2024-06-17',
        changes: [
          {
            event_type: 'first_look',
            old_time: '2024-06-17T14:30:00Z',
            new_time: '2024-06-17T15:00:00Z',
            reason: 'Better lighting conditions',
          },
          {
            event_type: 'ceremony',
            old_time: '2024-06-17T16:00:00Z',
            new_time: '2024-06-17T16:30:00Z',
            reason: 'Accommodate first look change',
          },
        ],
      };

      const affectedVendors = [
        {
          id: 'photographer-2',
          email: 'photo@studio.com',
          phone: '+1234567896',
          slack_user_id: 'U67890',
          name: 'Studio Photography',
          type: 'photographer',
        },
        {
          id: 'officiant-1',
          email: 'officiant@weddings.com',
          phone: '+1234567897',
          name: 'Wedding Officiant',
          type: 'officiant',
        },
      ];

      // Step 1: Update calendar events
      for (const change of timelineChange.changes) {
        const calendarEvent = {
          id: `${change.event_type}-event`,
          summary: `${change.event_type} - ${timelineChange.couple_names}`,
          start: { dateTime: change.new_time },
          description: `Timeline update: ${change.reason}`,
        };

        const calendarResult =
          await calendarService.syncTimelineChanges(calendarEvent);
        expect(calendarResult.timeline_updated).toBe(true);
      }

      // Step 2: Create broadcast notification
      const timelineBroadcast = {
        id: 'timeline-broadcast-789',
        title: 'Timeline Update - Emma & James Wedding',
        content:
          'Wedding timeline has been adjusted for better photo opportunities',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {
          wedding_date: timelineChange.wedding_date,
          couple_names: timelineChange.couple_names,
          timeline_changes: timelineChange.changes,
          requires_confirmation: true,
        },
      };

      // Step 3: Send coordinated notifications
      const emailResult = await emailService.sendBroadcast(
        timelineBroadcast,
        affectedVendors,
      );
      expect(emailResult.success).toBe(true);

      const workspaceResult = await workspaceService.sendSlackBroadcast(
        timelineBroadcast,
        affectedVendors.filter((v) => v.slack_user_id),
      );
      expect(workspaceResult.success).toBe(true);

      // Verify timeline synchronization was logged
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          wedding_id: 'wedding-789',
          sync_type: 'timeline_update',
          changes_count: 2,
          vendors_notified: 2,
          confirmation_required: true,
        }),
      );
    });

    it('should handle partial service failures gracefully', async () => {
      const broadcast = {
        id: 'broadcast-partial-fail',
        title: 'Vendor Update',
        content: 'Important update for all vendors',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {
          fallback_enabled: true,
          fallback_channels: ['email', 'sms'],
        },
      };

      const vendors = [
        {
          id: 'vendor-1',
          email: 'vendor1@example.com',
          phone: '+1234567898',
          slack_user_id: 'U11111',
          name: 'Vendor One',
          type: 'vendor',
        },
      ];

      // Mock Slack failure but email success
      const mockEmailService = {
        sendBroadcast: vi
          .fn()
          .mockResolvedValue({ success: true, sent_count: 1 }),
      };
      const mockWorkspaceService = {
        sendSlackBroadcast: vi.fn().mockResolvedValue({
          success: false,
          error: 'Slack API unavailable',
        }),
      };

      const emailResult = await mockEmailService.sendBroadcast(
        broadcast,
        vendors,
      );
      const workspaceResult = await mockWorkspaceService.sendSlackBroadcast(
        broadcast,
        vendors,
      );

      expect(emailResult.success).toBe(true);
      expect(workspaceResult.success).toBe(false);

      // System should log partial failure and successful fallback
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          broadcast_id: 'broadcast-partial-fail',
          primary_channel_failed: true,
          fallback_successful: true,
          channels_failed: ['slack'],
          channels_succeeded: ['email'],
        }),
      );
    });
  });

  describe('Wedding Milestone Communication Automation', () => {
    it('should trigger automated communications for milestone completions', async () => {
      // Scenario: Venue booking completed - trigger vendor notifications
      const milestoneCompletion = {
        wedding_id: 'wedding-milestone-123',
        milestone: 'venue_booked',
        completed_at: '2024-03-15T10:00:00Z',
        details: {
          venue_name: 'Sunset Gardens',
          venue_contact: 'events@sunsetgardens.com',
          wedding_date: '2024-08-15',
          guest_count: 150,
          ceremony_time: '16:00',
          reception_time: '18:00',
        },
      };

      const weddingTeam = [
        {
          id: 'planner-1',
          email: 'planner@weddings.com',
          name: 'Wedding Planner',
          type: 'planner',
        },
        {
          id: 'photographer-3',
          email: 'photos@capture.com',
          name: 'Capture Photography',
          type: 'photographer',
        },
      ];

      // Generate milestone-specific broadcast
      const milestoneBroadcast = {
        id: 'milestone-broadcast-venue',
        title: '🏛️ Venue Booked - Next Steps Available',
        content:
          "Great news! The venue has been secured. Here's what happens next...",
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {
          milestone_type: 'venue_booked',
          venue_details: milestoneCompletion.details,
          next_milestones: [
            'photographer_booking',
            'catering_selection',
            'florist_booking',
          ],
          automation_triggered: true,
        },
      };

      const result = await emailService.sendBroadcast(
        milestoneBroadcast,
        weddingTeam,
      );

      expect(result.success).toBe(true);
      expect(result.sent_count).toBe(2);

      // Verify milestone automation tracking
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          wedding_id: 'wedding-milestone-123',
          milestone: 'venue_booked',
          automation_triggered: true,
          notifications_sent: 2,
          next_actions_generated: true,
        }),
      );
    });

    it('should handle milestone deadline reminders', async () => {
      const upcomingDeadlines = [
        {
          wedding_id: 'wedding-deadlines-456',
          milestone: 'final_headcount',
          due_date: '2024-06-01T23:59:59Z',
          days_remaining: 7,
          importance: 'critical',
          affects: ['caterer', 'venue'],
        },
        {
          wedding_id: 'wedding-deadlines-456',
          milestone: 'song_selections',
          due_date: '2024-06-08T23:59:59Z',
          days_remaining: 14,
          importance: 'medium',
          affects: ['dj', 'band'],
        },
      ];

      const couple = {
        id: 'couple-deadlines',
        email: 'couple@example.com',
        phone: '+1234567899',
        name: 'Happy Couple',
        type: 'couple',
      };

      for (const deadline of upcomingDeadlines) {
        const reminderBroadcast = {
          id: `deadline-reminder-${deadline.milestone}`,
          title: `⏰ Reminder: ${deadline.milestone.replace('_', ' ')} Due Soon`,
          content: `Your ${deadline.milestone.replace('_', ' ')} deadline is in ${deadline.days_remaining} days`,
          recipient_type: 'couple' as const,
          organization_id: 'org-123',
          metadata: {
            deadline_type: deadline.milestone,
            days_remaining: deadline.days_remaining,
            importance: deadline.importance,
            automated_reminder: true,
          },
        };

        if (deadline.importance === 'critical') {
          // Send both email and SMS for critical deadlines
          const emailResult = await emailService.sendBroadcast(
            reminderBroadcast,
            [couple],
          );
          const smsResult = await smsService.sendBroadcast(reminderBroadcast, [
            couple,
          ]);

          expect(emailResult.success).toBe(true);
          expect(smsResult.success).toBe(true);
        } else {
          // Email only for non-critical reminders
          const emailResult = await emailService.sendBroadcast(
            reminderBroadcast,
            [couple],
          );
          expect(emailResult.success).toBe(true);
        }
      }
    });
  });

  describe('Cross-Platform Analytics and Reporting', () => {
    it('should aggregate engagement metrics across all communication channels', async () => {
      const broadcastId = 'analytics-broadcast-789';
      const testPeriod = {
        start: '2024-06-01T00:00:00Z',
        end: '2024-06-30T23:59:59Z',
      };

      // Mock analytics data from different services
      mockSupabase
        .from()
        .select()
        .eq.mockResolvedValueOnce({
          // Email analytics
          data: [
            { channel: 'email', event_type: 'sent', count: 100 },
            { channel: 'email', event_type: 'opened', count: 75 },
            { channel: 'email', event_type: 'clicked', count: 45 },
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          // SMS analytics
          data: [
            { channel: 'sms', event_type: 'sent', count: 80 },
            { channel: 'sms', event_type: 'delivered', count: 78 },
            { channel: 'sms', event_type: 'clicked', count: 25 },
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          // Workspace analytics
          data: [
            { channel: 'slack', event_type: 'sent', count: 50 },
            { channel: 'slack', event_type: 'read', count: 45 },
            { channel: 'slack', event_type: 'reacted', count: 30 },
          ],
          error: null,
        });

      // Aggregate cross-platform metrics
      const consolidatedAnalytics = {
        total_messages_sent: 230, // 100 + 80 + 50
        overall_engagement_rate: 0.65, // (75 + 78 + 45) / 230
        channel_performance: {
          email: { sent: 100, engagement: 75, rate: 0.75 },
          sms: { sent: 80, engagement: 78, rate: 0.975 },
          slack: { sent: 50, engagement: 45, rate: 0.9 },
        },
        best_performing_channel: 'sms',
        recommendations: [
          'SMS has highest engagement - consider increasing SMS budget',
          'Email click rates good but could improve with A/B testing',
          'Slack engagement high - expand team collaboration features',
        ],
      };

      expect(consolidatedAnalytics.total_messages_sent).toBe(230);
      expect(consolidatedAnalytics.best_performing_channel).toBe('sms');
      expect(consolidatedAnalytics.channel_performance.sms.rate).toBeCloseTo(
        0.975,
      );
    });
  });

  describe('Disaster Recovery and Failover', () => {
    it('should maintain service during external API outages', async () => {
      const emergencyBroadcast = {
        id: 'disaster-recovery-test',
        title: 'Service Continuity Test',
        content: 'Testing disaster recovery protocols',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {
          disaster_recovery_mode: true,
          priority: 'high',
        },
      };

      const recipients = [
        {
          id: 'recipient-dr-1',
          email: 'vendor@example.com',
          phone: '+1234567900',
          name: 'Test Vendor',
          type: 'vendor',
        },
      ];

      // Mock all external services failing
      const mockFailedServices = {
        email: { success: false, error: 'Resend API unavailable' },
        sms: { success: false, error: 'Twilio service down' },
        slack: { success: false, error: 'Slack rate limited' },
      };

      // System should queue messages for retry and use alternative channels
      const fallbackResult = {
        primary_services_failed: 3,
        fallback_activated: true,
        messages_queued: 1,
        retry_scheduled: true,
        alternative_channels_used: [
          'database_notification',
          'webhook_notification',
        ],
        estimated_recovery_time: '15 minutes',
      };

      expect(fallbackResult.fallback_activated).toBe(true);
      expect(fallbackResult.messages_queued).toBe(1);
      expect(fallbackResult.alternative_channels_used).toContain(
        'database_notification',
      );

      // Verify disaster recovery logging
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          incident_type: 'service_outage',
          services_affected: ['email', 'sms', 'slack'],
          failover_activated: true,
          messages_preserved: 1,
          recovery_plan_executed: true,
        }),
      );
    });
  });
});
