import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from 'vitest';
import { WorkspaceBroadcastService } from '../workspace-service';
import { createClient } from '@supabase/supabase-js';
import { WebClient } from '@slack/web-api';
import { Client } from '@microsoft/microsoft-graph-client';

// Mock dependencies
vi.mock('@supabase/supabase-js');
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

const mockSlackClient = {
  chat: {
    postMessage: vi.fn(),
    update: vi.fn(),
  },
  conversations: {
    create: vi.fn(),
    invite: vi.fn(),
    list: vi.fn(),
  },
  users: {
    lookupByEmail: vi.fn(),
  },
};

const mockTeamsClient = {
  api: vi.fn(() => ({
    post: vi.fn(),
    get: vi.fn(),
  })),
};

describe('WorkspaceBroadcastService', () => {
  let workspaceService: WorkspaceBroadcastService;

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as Mock).mockReturnValue(mockSupabase);
    (WebClient as Mock).mockImplementation(() => mockSlackClient);
    (Client.init as Mock).mockReturnValue(mockTeamsClient);
    workspaceService = new WorkspaceBroadcastService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Slack Integration', () => {
    it('should send wedding-themed Slack messages', async () => {
      const mockBroadcast = {
        id: 'broadcast-123',
        title: 'Wedding Day Timeline Update',
        content: "Timeline has been updated for Sarah & Mike's wedding",
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {
          wedding_date: '2024-06-15',
          couple_names: 'Sarah & Mike',
          timeline_changes: [
            'Ceremony moved to 4 PM',
            'Reception starts at 6 PM',
          ],
          urgency: 'high',
        },
      };

      const mockRecipients = [
        {
          id: 'recipient-1',
          slack_user_id: 'U123456789',
          slack_channel: '#wedding-vendors',
          name: 'Wedding Photographer',
          type: 'photographer',
        },
      ];

      mockSlackClient.chat.postMessage.mockResolvedValue({
        ok: true,
        ts: '1640995200.123456',
        message: { text: 'Message sent' },
      });

      const result = await workspaceService.sendSlackBroadcast(
        mockBroadcast,
        mockRecipients,
      );

      expect(mockSlackClient.chat.postMessage).toHaveBeenCalledWith({
        channel: '#wedding-vendors',
        text: 'Wedding Day Timeline Update',
        blocks: expect.arrayContaining([
          expect.objectContaining({
            type: 'header',
            text: expect.objectContaining({
              text: '💒 Wedding Day Timeline Update',
            }),
          }),
          expect.objectContaining({
            type: 'section',
            text: expect.objectContaining({
              text: expect.stringContaining('Sarah & Mike'),
            }),
          }),
        ]),
        attachments: expect.arrayContaining([
          expect.objectContaining({
            color: '#ff6b6b', // High urgency color
            fields: expect.arrayContaining([
              expect.objectContaining({
                title: 'Wedding Date',
                value: 'June 15, 2024',
              }),
            ]),
          }),
        ]),
      });

      expect(result.success).toBe(true);
      expect(result.sent_count).toBe(1);
    });

    it('should create interactive Slack buttons for vendor responses', async () => {
      const mockBroadcast = {
        id: 'broadcast-123',
        title: 'Vendor Availability Check',
        content: 'Please confirm your availability for setup',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {
          requires_response: true,
          response_type: 'confirmation',
          deadline: '2024-06-14T18:00:00Z',
        },
      };

      const mockRecipients = [
        {
          id: 'recipient-1',
          slack_user_id: 'U123456789',
          slack_channel: '@U123456789', // DM
          name: 'Wedding Florist',
          type: 'florist',
        },
      ];

      mockSlackClient.chat.postMessage.mockResolvedValue({
        ok: true,
        ts: '1640995200.123456',
      });

      const result = await workspaceService.sendSlackBroadcast(
        mockBroadcast,
        mockRecipients,
      );

      expect(mockSlackClient.chat.postMessage).toHaveBeenCalledWith({
        channel: '@U123456789',
        text: 'Vendor Availability Check',
        blocks: expect.arrayContaining([
          expect.objectContaining({
            type: 'actions',
            elements: expect.arrayContaining([
              expect.objectContaining({
                type: 'button',
                text: expect.objectContaining({ text: '✅ Available' }),
                style: 'primary',
                action_id: 'confirm_available',
                value: 'broadcast-123',
              }),
              expect.objectContaining({
                type: 'button',
                text: expect.objectContaining({ text: '❌ Unavailable' }),
                style: 'danger',
                action_id: 'confirm_unavailable',
                value: 'broadcast-123',
              }),
            ]),
          }),
        ]),
      });
    });

    it('should handle Slack channel creation for wedding teams', async () => {
      const weddingData = {
        wedding_id: 'wedding-123',
        couple_names: 'Alex & Jordan',
        wedding_date: '2024-07-20',
        vendors: [
          { email: 'photographer@example.com', type: 'photographer' },
          { email: 'florist@example.com', type: 'florist' },
          { email: 'caterer@example.com', type: 'caterer' },
        ],
      };

      mockSlackClient.conversations.create.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'alex-jordan-wedding-july-2024',
        },
      });

      mockSlackClient.users.lookupByEmail
        .mockResolvedValueOnce({ ok: true, user: { id: 'U111' } })
        .mockResolvedValueOnce({ ok: true, user: { id: 'U222' } })
        .mockResolvedValueOnce({ ok: true, user: { id: 'U333' } });

      mockSlackClient.conversations.invite.mockResolvedValue({ ok: true });

      const result =
        await workspaceService.createWeddingSlackChannel(weddingData);

      expect(mockSlackClient.conversations.create).toHaveBeenCalledWith({
        name: 'alex-jordan-wedding-july-2024',
        is_private: false,
        is_archived: false,
      });

      expect(mockSlackClient.conversations.invite).toHaveBeenCalledWith({
        channel: 'C1234567890',
        users: 'U111,U222,U333',
      });

      expect(result.channel_created).toBe(true);
      expect(result.channel_id).toBe('C1234567890');
      expect(result.members_added).toBe(3);
    });

    it('should handle Slack workflow triggers', async () => {
      const mockBroadcast = {
        id: 'broadcast-123',
        title: 'Payment Overdue Reminder',
        content: 'Invoice payment is now 7 days overdue',
        recipient_type: 'couple' as const,
        organization_id: 'org-123',
        metadata: {
          trigger_type: 'payment_overdue',
          days_overdue: 7,
          amount_due: '$2,500',
          workflow_action: 'escalate_to_manager',
        },
      };

      mockSlackClient.chat.postMessage.mockResolvedValue({
        ok: true,
        ts: '1640995200.123456',
      });

      const result = await workspaceService.triggerSlackWorkflow(mockBroadcast);

      expect(result.workflow_triggered).toBe(true);
      expect(result.escalation_level).toBe('manager');
    });
  });

  describe('Microsoft Teams Integration', () => {
    it('should send Teams adaptive cards for wedding updates', async () => {
      const mockBroadcast = {
        id: 'broadcast-123',
        title: 'Reception Menu Finalized',
        content: 'The reception menu has been confirmed',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {
          wedding_date: '2024-06-15',
          couple_names: 'Emma & James',
          menu_items: ['Salmon', 'Chicken', 'Vegetarian Pasta'],
          dietary_restrictions: ['Gluten-free options', '2 vegan meals'],
        },
      };

      const mockRecipients = [
        {
          id: 'recipient-1',
          teams_user_id: 'teams-user-123',
          teams_channel: 'wedding-catering-team',
          name: 'Catering Manager',
          type: 'caterer',
        },
      ];

      mockTeamsClient.api().post.mockResolvedValue({
        id: 'message-123',
        webUrl: 'https://teams.microsoft.com/...',
      });

      const result = await workspaceService.sendTeamsBroadcast(
        mockBroadcast,
        mockRecipients,
      );

      expect(mockTeamsClient.api().post).toHaveBeenCalledWith(
        '/chats/wedding-catering-team/messages',
        expect.objectContaining({
          body: {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: expect.objectContaining({
              $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
              type: 'AdaptiveCard',
              version: '1.4',
              body: expect.arrayContaining([
                expect.objectContaining({
                  type: 'TextBlock',
                  text: '🍽️ Reception Menu Finalized',
                  weight: 'Bolder',
                  size: 'Large',
                }),
              ]),
            }),
          },
        }),
      );

      expect(result.success).toBe(true);
      expect(result.sent_count).toBe(1);
    });

    it('should create Teams meeting for vendor coordination', async () => {
      const meetingData = {
        wedding_id: 'wedding-123',
        title: 'Vendor Coordination Call - Sarah & Mike Wedding',
        start_time: '2024-06-10T14:00:00Z',
        end_time: '2024-06-10T15:00:00Z',
        attendees: [
          'photographer@example.com',
          'florist@example.com',
          'coordinator@example.com',
        ],
      };

      mockTeamsClient.api().post.mockResolvedValue({
        id: 'meeting-123',
        webUrl: 'https://teams.microsoft.com/l/meetup-join/...',
        joinUrl: 'https://teams.microsoft.com/l/meetup-join/...',
      });

      const result = await workspaceService.createTeamsMeeting(meetingData);

      expect(mockTeamsClient.api().post).toHaveBeenCalledWith(
        '/me/onlineMeetings',
        expect.objectContaining({
          subject: 'Vendor Coordination Call - Sarah & Mike Wedding',
          startDateTime: '2024-06-10T14:00:00Z',
          endDateTime: '2024-06-10T15:00:00Z',
          participants: {
            attendees: expect.arrayContaining([
              expect.objectContaining({
                upn: 'photographer@example.com',
              }),
            ]),
          },
        }),
      );

      expect(result.meeting_created).toBe(true);
      expect(result.join_url).toBeDefined();
    });

    it('should handle Teams bot interactions', async () => {
      const botCommand = {
        command: '/wedding-status',
        parameters: ['wedding-123'],
        user_id: 'teams-user-456',
        channel_id: 'channel-789',
      };

      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            id: 'wedding-123',
            couple_names: 'Sarah & Mike',
            wedding_date: '2024-06-15',
            status: 'in_progress',
            completion_percentage: 75,
          },
          error: null,
        });

      const result = await workspaceService.handleTeamsBotCommand(botCommand);

      expect(result.response_sent).toBe(true);
      expect(result.card_data).toMatchObject({
        wedding_status: 'in_progress',
        completion_percentage: 75,
      });
    });
  });

  describe('Cross-Platform Synchronization', () => {
    it('should sync messages between Slack and Teams', async () => {
      const mockBroadcast = {
        id: 'broadcast-123',
        title: 'Urgent Venue Change',
        content: 'Wedding venue changed due to weather',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {
          cross_platform_sync: true,
          platforms: ['slack', 'teams'],
          urgency: 'critical',
        },
      };

      const mockRecipients = [
        {
          id: 'recipient-1',
          slack_user_id: 'U123456789',
          name: 'Photographer',
          type: 'photographer',
        },
        {
          id: 'recipient-2',
          teams_user_id: 'teams-user-123',
          name: 'Florist',
          type: 'florist',
        },
      ];

      mockSlackClient.chat.postMessage.mockResolvedValue({
        ok: true,
        ts: '123',
      });
      mockTeamsClient.api().post.mockResolvedValue({ id: 'teams-msg-123' });

      const result = await workspaceService.sendCrossPlatformBroadcast(
        mockBroadcast,
        mockRecipients,
      );

      expect(result.slack_sent).toBe(1);
      expect(result.teams_sent).toBe(1);
      expect(result.total_recipients).toBe(2);
      expect(result.sync_successful).toBe(true);
    });

    it('should maintain message threading across platforms', async () => {
      const originalMessage = {
        slack_ts: '1640995200.123456',
        teams_message_id: 'teams-msg-123',
        thread_id: 'thread-abc',
      };

      const replyBroadcast = {
        id: 'broadcast-124',
        title: 'UPDATE: Venue Confirmed',
        content: 'New venue has been secured',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {
          reply_to: 'broadcast-123',
          thread_id: 'thread-abc',
        },
      };

      const result = await workspaceService.sendThreadedReply(
        replyBroadcast,
        originalMessage,
      );

      expect(mockSlackClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          thread_ts: '1640995200.123456',
        }),
      );

      expect(mockTeamsClient.api().post).toHaveBeenCalledWith(
        expect.stringContaining('/replies'),
        expect.any(Object),
      );

      expect(result.thread_maintained).toBe(true);
    });
  });

  describe('Wedding-Specific Features', () => {
    it('should create vendor availability polls', async () => {
      const pollData = {
        wedding_id: 'wedding-123',
        title: 'Setup Time Confirmation',
        question: 'When can you arrive for setup on wedding day?',
        options: ['7:00 AM', '8:00 AM', '9:00 AM', 'Other (specify)'],
        vendors: ['photographer', 'florist', 'caterer'],
        deadline: '2024-06-13T23:59:59Z',
      };

      mockSlackClient.chat.postMessage.mockResolvedValue({
        ok: true,
        ts: '1640995200.123456',
      });

      const result = await workspaceService.createVendorPoll(pollData);

      expect(result.poll_created).toBe(true);
      expect(result.responses_tracked).toBe(true);
      expect(result.slack_poll_id).toBeDefined();
    });

    it('should track wedding milestone completions', async () => {
      const milestones = [
        { name: 'venue_booked', completed: true, date: '2024-01-15' },
        { name: 'photographer_hired', completed: true, date: '2024-02-01' },
        { name: 'flowers_ordered', completed: false, due_date: '2024-05-15' },
        { name: 'cake_ordered', completed: false, due_date: '2024-05-20' },
      ];

      const result = await workspaceService.updateWeddingMilestones(
        'wedding-123',
        milestones,
      );

      expect(result.milestones_updated).toBe(4);
      expect(result.completion_percentage).toBe(50);
      expect(result.overdue_milestones).toBe(0);
    });

    it('should handle wedding day emergency broadcasts', async () => {
      const emergencyBroadcast = {
        id: 'broadcast-emergency',
        title: '🚨 WEDDING DAY EMERGENCY',
        content: 'URGENT: Timeline change - ceremony delayed 30 minutes',
        recipient_type: 'all' as const,
        organization_id: 'org-123',
        metadata: {
          is_emergency: true,
          is_wedding_day: true,
          delay_minutes: 30,
          affected_events: ['ceremony', 'photography', 'reception'],
        },
      };

      const result =
        await workspaceService.sendEmergencyBroadcast(emergencyBroadcast);

      expect(result.priority_delivery).toBe(true);
      expect(result.all_channels_notified).toBe(true);
      expect(result.escalation_triggered).toBe(true);
      expect(result.read_receipts_required).toBe(true);
    });
  });

  describe('Analytics and Engagement Tracking', () => {
    it('should track message engagement metrics', async () => {
      const messageData = {
        broadcast_id: 'broadcast-123',
        slack_ts: '1640995200.123456',
        teams_message_id: 'teams-msg-123',
        sent_at: '2024-06-10T10:00:00Z',
      };

      // Mock engagement data
      mockSupabase
        .from()
        .select()
        .eq.mockResolvedValue({
          data: [
            {
              user_id: 'user-1',
              action: 'read',
              timestamp: '2024-06-10T10:05:00Z',
            },
            {
              user_id: 'user-2',
              action: 'react',
              timestamp: '2024-06-10T10:10:00Z',
            },
            {
              user_id: 'user-3',
              action: 'reply',
              timestamp: '2024-06-10T10:15:00Z',
            },
          ],
          error: null,
        });

      const analytics = await workspaceService.getMessageAnalytics(messageData);

      expect(analytics.total_reads).toBe(1);
      expect(analytics.total_reactions).toBe(1);
      expect(analytics.total_replies).toBe(1);
      expect(analytics.engagement_rate).toBe(1.0); // 3 actions / 3 unique users
      expect(analytics.average_response_time).toBeGreaterThan(0);
    });

    it('should generate platform usage reports', async () => {
      const organizationId = 'org-123';
      const dateRange = {
        start: '2024-06-01T00:00:00Z',
        end: '2024-06-30T23:59:59Z',
      };

      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            { platform: 'slack', messages_sent: 45, engagement_rate: 0.85 },
            { platform: 'teams', messages_sent: 32, engagement_rate: 0.78 },
          ],
          error: null,
        });

      const report = await workspaceService.generateUsageReport(
        organizationId,
        dateRange,
      );

      expect(report.total_messages_sent).toBe(77);
      expect(report.preferred_platform).toBe('slack');
      expect(report.overall_engagement_rate).toBeCloseTo(0.82);
      expect(report.platform_breakdown).toHaveLength(2);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle Slack API rate limits', async () => {
      const mockBroadcast = {
        id: 'broadcast-123',
        title: 'Test Message',
        content: 'Test content',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {},
      };

      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).code = 'slack_rate_limited';

      mockSlackClient.chat.postMessage.mockRejectedValue(rateLimitError);

      const result = await workspaceService.sendSlackBroadcast(
        mockBroadcast,
        [],
      );

      expect(result.success).toBe(false);
      expect(result.rate_limited).toBe(true);
      expect(result.retry_after).toBeGreaterThan(0);
    });

    it('should handle Teams authentication failures', async () => {
      const authError = new Error('Invalid access token');
      (authError as any).code = 'InvalidAuthenticationToken';

      mockTeamsClient.api().post.mockRejectedValue(authError);

      const result = await workspaceService.sendTeamsBroadcast({} as any, []);

      expect(result.success).toBe(false);
      expect(result.auth_refresh_required).toBe(true);
    });

    it('should implement graceful degradation', async () => {
      const mockBroadcast = {
        id: 'broadcast-123',
        title: 'Important Update',
        content: 'This is important',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {
          fallback_methods: ['email', 'sms'],
        },
      };

      // Both Slack and Teams fail
      mockSlackClient.chat.postMessage.mockRejectedValue(
        new Error('Service down'),
      );
      mockTeamsClient.api().post.mockRejectedValue(new Error('Service down'));

      const result = await workspaceService.sendCrossPlatformBroadcast(
        mockBroadcast,
        [],
      );

      expect(result.workspace_delivery_failed).toBe(true);
      expect(result.fallback_triggered).toBe(true);
      expect(result.fallback_methods).toEqual(['email', 'sms']);
    });
  });
});
