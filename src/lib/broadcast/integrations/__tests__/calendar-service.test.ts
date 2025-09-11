import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from 'vitest';
import { CalendarBroadcastService } from '../calendar-service';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

// Mock dependencies
vi.mock('@supabase/supabase-js');
vi.mock('googleapis');

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

const mockGoogleCalendar = {
  events: {
    list: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    watch: vi.fn(),
  },
  calendars: {
    get: vi.fn(),
  },
};

const mockGoogleAuth = {
  setCredentials: vi.fn(),
  getAccessToken: vi.fn(),
};

describe('CalendarBroadcastService', () => {
  let calendarService: CalendarBroadcastService;

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as Mock).mockReturnValue(mockSupabase);
    (google.calendar as Mock).mockReturnValue(mockGoogleCalendar);
    (google.auth.OAuth2 as Mock).mockImplementation(() => mockGoogleAuth);
    calendarService = new CalendarBroadcastService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Wedding Event Classification', () => {
    it('should classify wedding ceremony events', async () => {
      const mockEvent = {
        id: 'event-123',
        summary: 'Sarah & Mike Wedding Ceremony',
        description: "Wedding ceremony at St. Mary's Church",
        start: { dateTime: '2024-06-15T16:00:00Z' },
        end: { dateTime: '2024-06-15T17:00:00Z' },
        location: "St. Mary's Church, Downtown",
      };

      const classification =
        await calendarService.classifyWeddingEvent(mockEvent);

      expect(classification.event_type).toBe('ceremony');
      expect(classification.priority).toBe('high');
      expect(classification.involves_vendors).toBe(true);
      expect(classification.broadcast_triggers).toContain('2_hours_before');
      expect(classification.broadcast_triggers).toContain('30_minutes_before');
    });

    it('should classify reception events', async () => {
      const mockEvent = {
        id: 'event-123',
        summary: 'Wedding Reception - Emma & James',
        description: 'Reception dinner and dancing',
        start: { dateTime: '2024-06-15T18:00:00Z' },
        end: { dateTime: '2024-06-15T23:00:00Z' },
        location: 'Grand Ballroom Hotel',
      };

      const classification =
        await calendarService.classifyWeddingEvent(mockEvent);

      expect(classification.event_type).toBe('reception');
      expect(classification.priority).toBe('high');
      expect(classification.involves_catering).toBe(true);
      expect(classification.involves_music).toBe(true);
      expect(classification.broadcast_triggers).toContain('1_day_before');
    });

    it('should classify vendor meetings', async () => {
      const mockEvent = {
        id: 'event-123',
        summary: 'Photographer Meeting - John Photography',
        description: 'Final timeline discussion with photographer',
        start: { dateTime: '2024-05-20T14:00:00Z' },
        end: { dateTime: '2024-05-20T15:00:00Z' },
        attendees: [{ email: 'john@photography.com' }],
      };

      const classification =
        await calendarService.classifyWeddingEvent(mockEvent);

      expect(classification.event_type).toBe('vendor_meeting');
      expect(classification.vendor_type).toBe('photographer');
      expect(classification.priority).toBe('medium');
      expect(classification.broadcast_triggers).toContain('1_day_before');
      expect(classification.broadcast_triggers).toContain('2_hours_before');
    });

    it('should classify rehearsal events', async () => {
      const mockEvent = {
        id: 'event-123',
        summary: 'Wedding Rehearsal',
        description: 'Practice ceremony and timeline walkthrough',
        start: { dateTime: '2024-06-14T17:00:00Z' },
        end: { dateTime: '2024-06-14T18:30:00Z' },
        location: "St. Mary's Church",
      };

      const classification =
        await calendarService.classifyWeddingEvent(mockEvent);

      expect(classification.event_type).toBe('rehearsal');
      expect(classification.priority).toBe('high');
      expect(classification.involves_vendors).toBe(true);
      expect(classification.broadcast_triggers).toContain('same_day_morning');
    });

    it('should classify engagement sessions', async () => {
      const mockEvent = {
        id: 'event-123',
        summary: 'Engagement Photos - Alex & Jordan',
        description: 'Engagement photo session in the park',
        start: { dateTime: '2024-04-20T10:00:00Z' },
        end: { dateTime: '2024-04-20T12:00:00Z' },
        attendees: [{ email: 'photographer@example.com' }],
      };

      const classification =
        await calendarService.classifyWeddingEvent(mockEvent);

      expect(classification.event_type).toBe('engagement_session');
      expect(classification.vendor_type).toBe('photographer');
      expect(classification.priority).toBe('medium');
    });
  });

  describe('Intelligent Broadcast Triggers', () => {
    it('should create timeline broadcasts for ceremony events', async () => {
      const mockEvent = {
        id: 'event-123',
        summary: 'Wedding Ceremony',
        start: { dateTime: '2024-06-15T16:00:00Z' },
        end: { dateTime: '2024-06-15T17:00:00Z' },
        attendees: [
          {
            email: 'photographer@example.com',
            displayName: 'John Photography',
          },
          { email: 'florist@example.com', displayName: 'Flower Power' },
        ],
      };

      mockSupabase.from().insert.mockResolvedValue({
        data: { id: 'broadcast-123' },
        error: null,
      });

      const broadcasts = await calendarService.createEventBroadcasts(
        mockEvent,
        'ceremony',
      );

      expect(broadcasts).toHaveLength(3); // 1 day before, 2 hours before, 30 minutes before

      const dayBeforeBroadcast = broadcasts.find(
        (b) => b.trigger_time === '1_day_before',
      );
      expect(dayBeforeBroadcast?.title).toContain(
        'Wedding Day Timeline Confirmation',
      );
      expect(dayBeforeBroadcast?.recipient_type).toBe('vendor');

      const twoHoursBroadcast = broadcasts.find(
        (b) => b.trigger_time === '2_hours_before',
      );
      expect(twoHoursBroadcast?.title).toContain('Final Setup Reminder');

      const thirtyMinutesBroadcast = broadcasts.find(
        (b) => b.trigger_time === '30_minutes_before',
      );
      expect(thirtyMinutesBroadcast?.title).toContain('Ceremony Starting Soon');
    });

    it('should create vendor-specific broadcasts', async () => {
      const mockEvent = {
        id: 'event-123',
        summary: 'Cake Tasting Appointment',
        start: { dateTime: '2024-05-10T14:00:00Z' },
        end: { dateTime: '2024-05-10T15:00:00Z' },
        attendees: [
          { email: 'baker@sweetcakes.com', displayName: 'Sweet Cakes Bakery' },
        ],
        description: 'Final cake tasting and design confirmation',
      };

      const broadcasts = await calendarService.createEventBroadcasts(
        mockEvent,
        'vendor_meeting',
      );

      const broadcast = broadcasts[0];
      expect(broadcast.title).toContain('Cake Tasting Appointment');
      expect(broadcast.content).toContain('cake tasting');
      expect(broadcast.metadata.vendor_type).toBe('baker');
      expect(broadcast.metadata.meeting_type).toBe('tasting');
    });

    it('should handle timezone conversions', async () => {
      const mockEvent = {
        id: 'event-123',
        summary: 'Wedding Ceremony',
        start: {
          dateTime: '2024-06-15T20:00:00Z', // 8 PM UTC
          timeZone: 'America/New_York', // 4 PM EDT
        },
        end: {
          dateTime: '2024-06-15T21:00:00Z',
          timeZone: 'America/New_York',
        },
      };

      const broadcasts = await calendarService.createEventBroadcasts(
        mockEvent,
        'ceremony',
      );

      const broadcast = broadcasts[0];
      expect(broadcast.scheduled_at).toContain('2024-06-14'); // Day before in local time
      expect(broadcast.metadata.local_time).toBe('4:00 PM EDT');
      expect(broadcast.metadata.timezone).toBe('America/New_York');
    });
  });

  describe('Google Calendar Integration', () => {
    it('should sync wedding events from Google Calendar', async () => {
      mockGoogleAuth.getAccessToken.mockResolvedValue({ token: 'valid-token' });

      mockGoogleCalendar.events.list.mockResolvedValue({
        data: {
          items: [
            {
              id: 'event-1',
              summary: 'Wedding Ceremony - Sarah & Mike',
              start: { dateTime: '2024-06-15T16:00:00Z' },
              end: { dateTime: '2024-06-15T17:00:00Z' },
              description: 'Beautiful outdoor ceremony',
            },
            {
              id: 'event-2',
              summary: 'Reception Following',
              start: { dateTime: '2024-06-15T18:00:00Z' },
              end: { dateTime: '2024-06-15T23:00:00Z' },
            },
          ],
        },
      });

      mockSupabase.from().upsert.mockResolvedValue({ data: null, error: null });

      const result = await calendarService.syncGoogleCalendar(
        'user-123',
        'primary',
      );

      expect(mockGoogleCalendar.events.list).toHaveBeenCalledWith({
        calendarId: 'primary',
        timeMin: expect.any(String),
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime',
      });

      expect(result.synced_events).toBe(2);
      expect(result.wedding_events_found).toBe(2);
    });

    it('should handle OAuth token refresh', async () => {
      mockGoogleAuth.getAccessToken
        .mockRejectedValueOnce(new Error('Token expired'))
        .mockResolvedValueOnce({ token: 'new-token' });

      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            refresh_token: 'refresh-token',
            access_token: 'old-token',
          },
          error: null,
        });

      mockSupabase
        .from()
        .update()
        .eq.mockResolvedValue({ data: null, error: null });

      const result = await calendarService.refreshGoogleToken('user-123');

      expect(result.token_refreshed).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        access_token: 'new-token',
        updated_at: expect.any(String),
      });
    });

    it('should setup calendar push notifications', async () => {
      const calendarId = 'primary';
      const userId = 'user-123';

      mockGoogleCalendar.events.watch.mockResolvedValue({
        data: {
          id: 'watch-123',
          resourceId: 'resource-456',
          expiration: '1640995200000',
        },
      });

      mockSupabase.from().insert.mockResolvedValue({ data: null, error: null });

      const result = await calendarService.setupCalendarWatch(
        userId,
        calendarId,
      );

      expect(mockGoogleCalendar.events.watch).toHaveBeenCalledWith({
        calendarId: calendarId,
        requestBody: {
          id: expect.any(String),
          type: 'web_hook',
          address: expect.stringContaining('/api/webhooks/broadcast/calendar'),
          params: {
            ttl: '604800', // 7 days
          },
        },
      });

      expect(result.watch_id).toBe('watch-123');
      expect(result.success).toBe(true);
    });
  });

  describe('Wedding Timeline Synchronization', () => {
    it('should sync calendar changes to wedding timeline', async () => {
      const calendarEvent = {
        id: 'event-123',
        summary: 'Ceremony Moved to Garden',
        start: { dateTime: '2024-06-15T15:30:00Z' }, // Moved 30 minutes earlier
        end: { dateTime: '2024-06-15T16:30:00Z' },
        location: 'Garden Venue (Changed from Church)',
      };

      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            id: 'timeline-event-123',
            scheduled_at: '2024-06-15T16:00:00Z', // Original time
            location: "St. Mary's Church",
          },
          error: null,
        });

      mockSupabase
        .from()
        .update()
        .eq.mockResolvedValue({ data: null, error: null });

      const result = await calendarService.syncTimelineChanges(calendarEvent);

      expect(result.timeline_updated).toBe(true);
      expect(result.changes_detected).toEqual([
        'time_changed',
        'location_changed',
      ]);

      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        scheduled_at: '2024-06-15T15:30:00Z',
        location: 'Garden Venue (Changed from Church)',
        updated_at: expect.any(String),
      });
    });

    it('should trigger broadcasts for significant timeline changes', async () => {
      const calendarEvent = {
        id: 'event-123',
        summary: 'URGENT: Ceremony Venue Changed',
        start: { dateTime: '2024-06-15T16:00:00Z' },
        location: 'Emergency Backup Venue',
      };

      // Mock wedding is tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            wedding_date: tomorrow.toISOString().split('T')[0],
            vendor_contacts: [
              { email: 'photographer@example.com', type: 'photographer' },
              { email: 'florist@example.com', type: 'florist' },
            ],
          },
          error: null,
        });

      const result =
        await calendarService.handleUrgentTimelineChange(calendarEvent);

      expect(result.urgent_broadcast_created).toBe(true);
      expect(result.broadcast_type).toBe('urgent_venue_change');
      expect(result.recipients_notified).toBe(2);
    });
  });

  describe('Multi-Calendar Support', () => {
    it('should handle multiple calendar sources', async () => {
      const calendars = [
        { id: 'primary', name: 'Main Calendar', type: 'google' },
        { id: 'wedding-cal', name: 'Wedding Planning', type: 'google' },
        { id: 'vendors-cal', name: 'Vendor Meetings', type: 'google' },
      ];

      mockGoogleCalendar.events.list
        .mockResolvedValueOnce({ data: { items: [{ id: 'event-1' }] } })
        .mockResolvedValueOnce({
          data: { items: [{ id: 'event-2' }, { id: 'event-3' }] },
        })
        .mockResolvedValueOnce({ data: { items: [{ id: 'event-4' }] } });

      const result = await calendarService.syncMultipleCalendars(
        'user-123',
        calendars,
      );

      expect(mockGoogleCalendar.events.list).toHaveBeenCalledTimes(3);
      expect(result.total_events_synced).toBe(4);
      expect(result.calendars_processed).toBe(3);
    });

    it('should deduplicate events across calendars', async () => {
      const duplicateEvent = {
        id: 'event-123',
        summary: 'Wedding Ceremony',
        start: { dateTime: '2024-06-15T16:00:00Z' },
      };

      mockGoogleCalendar.events.list
        .mockResolvedValueOnce({ data: { items: [duplicateEvent] } })
        .mockResolvedValueOnce({ data: { items: [duplicateEvent] } });

      mockSupabase
        .from()
        .select()
        .eq.mockResolvedValue({
          data: [duplicateEvent],
          error: null,
        });

      const result = await calendarService.syncMultipleCalendars('user-123', [
        { id: 'cal-1', name: 'Calendar 1', type: 'google' },
        { id: 'cal-2', name: 'Calendar 2', type: 'google' },
      ]);

      expect(result.duplicates_found).toBe(1);
      expect(result.unique_events_processed).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle Google Calendar API errors', async () => {
      mockGoogleCalendar.events.list.mockRejectedValue(
        new Error('API quota exceeded'),
      );

      const result = await calendarService.syncGoogleCalendar(
        'user-123',
        'primary',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('API quota exceeded');
      expect(result.retry_after).toBeGreaterThan(0);
    });

    it('should handle invalid calendar permissions', async () => {
      const permissionError = new Error('Insufficient permissions');
      (permissionError as any).code = 403;

      mockGoogleCalendar.events.list.mockRejectedValue(permissionError);

      const result = await calendarService.syncGoogleCalendar(
        'user-123',
        'restricted-calendar',
      );

      expect(result.success).toBe(false);
      expect(result.requires_reauth).toBe(true);
    });

    it('should handle network connectivity issues', async () => {
      mockGoogleCalendar.events.list.mockRejectedValue(
        new Error('Network timeout'),
      );

      const result = await calendarService.syncGoogleCalendar(
        'user-123',
        'primary',
      );

      expect(result.success).toBe(false);
      expect(result.should_retry).toBe(true);
      expect(result.retry_delay).toBe(300000); // 5 minutes
    });
  });

  describe('Analytics and Reporting', () => {
    it('should track calendar sync metrics', async () => {
      const userId = 'user-123';
      const calendarId = 'primary';

      mockGoogleCalendar.events.list.mockResolvedValue({
        data: { items: [{ id: 'event-1' }, { id: 'event-2' }] },
      });

      mockSupabase.from().insert.mockResolvedValue({ data: null, error: null });

      await calendarService.syncGoogleCalendar(userId, calendarId);

      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        user_id: userId,
        calendar_id: calendarId,
        sync_type: 'full_sync',
        events_processed: 2,
        sync_duration: expect.any(Number),
        timestamp: expect.any(String),
      });
    });

    it('should generate calendar insights', async () => {
      const userId = 'user-123';

      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            { event_type: 'ceremony', scheduled_at: '2024-06-15T16:00:00Z' },
            { event_type: 'reception', scheduled_at: '2024-06-15T18:00:00Z' },
            {
              event_type: 'vendor_meeting',
              scheduled_at: '2024-05-20T14:00:00Z',
            },
          ],
          error: null,
        });

      const insights = await calendarService.generateCalendarInsights(userId);

      expect(insights.upcoming_wedding_events).toBe(2);
      expect(insights.vendor_meetings_scheduled).toBe(1);
      expect(insights.timeline_conflicts).toBeDefined();
      expect(insights.recommended_broadcasts).toBeDefined();
    });
  });
});
