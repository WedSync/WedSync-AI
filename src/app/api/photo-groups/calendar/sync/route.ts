import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Calendar integration schemas
const CalendarSyncSchema = z.object({
  couple_id: z.string().uuid(),
  provider: z.enum(['google', 'outlook', 'apple']),
  action: z.enum(['connect', 'sync', 'disconnect']),
  credentials: z
    .object({
      access_token: z.string().optional(),
      refresh_token: z.string().optional(),
      calendar_id: z.string().optional(),
      account_id: z.string().optional(),
    })
    .optional(),
  sync_options: z
    .object({
      create_events: z.boolean().default(true),
      update_events: z.boolean().default(true),
      delete_events: z.boolean().default(false),
      include_conflicts: z.boolean().default(false),
      event_prefix: z.string().default('WedSync: '),
      sync_direction: z.enum(['one_way', 'two_way']).default('one_way'),
    })
    .optional(),
});

const CalendarEventSchema = z.object({
  photo_group_id: z.string().uuid(),
  external_event_id: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  location: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  reminders: z
    .array(
      z.object({
        method: z.enum(['email', 'popup']),
        minutes: z.number(),
      }),
    )
    .optional(),
});

// Calendar provider interfaces
interface CalendarProvider {
  name: string;
  connect(credentials: any): Promise<any>;
  createEvent(event: any): Promise<any>;
  updateEvent(eventId: string, event: any): Promise<any>;
  deleteEvent(eventId: string): Promise<any>;
  listEvents(startDate: string, endDate: string): Promise<any[]>;
  disconnect(): Promise<void>;
}

// Google Calendar provider implementation
class GoogleCalendarProvider implements CalendarProvider {
  name = 'google';
  private accessToken: string;
  private calendarId: string;

  constructor(credentials: any) {
    this.accessToken = credentials.access_token;
    this.calendarId = credentials.calendar_id || 'primary';
  }

  async connect(credentials: any): Promise<any> {
    // In a real implementation, this would handle OAuth flow
    try {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary',
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.status}`);
      }

      const calendarInfo = await response.json();

      return {
        connected: true,
        calendar_name: calendarInfo.summary,
        calendar_id: calendarInfo.id,
        time_zone: calendarInfo.timeZone,
      };
    } catch (error) {
      console.error('Google Calendar connection error:', error);
      throw new Error('Failed to connect to Google Calendar');
    }
  }

  async createEvent(event: any): Promise<any> {
    try {
      const googleEvent = {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.start_time,
          timeZone: event.timeZone || 'UTC',
        },
        end: {
          dateTime: event.end_time,
          timeZone: event.timeZone || 'UTC',
        },
        location: event.location,
        attendees: event.attendees?.map((email: string) => ({ email })),
        reminders: {
          useDefault: false,
          overrides: event.reminders?.map((r: any) => ({
            method: r.method,
            minutes: r.minutes,
          })) || [{ method: 'email', minutes: 60 }],
        },
      };

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${this.calendarId}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(googleEvent),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Google Calendar create event error: ${response.status}`,
        );
      }

      const createdEvent = await response.json();

      return {
        external_event_id: createdEvent.id,
        html_link: createdEvent.htmlLink,
        status: createdEvent.status,
      };
    } catch (error) {
      console.error('Google Calendar create event error:', error);
      throw error;
    }
  }

  async updateEvent(eventId: string, event: any): Promise<any> {
    try {
      const googleEvent = {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.start_time,
          timeZone: event.timeZone || 'UTC',
        },
        end: {
          dateTime: event.end_time,
          timeZone: event.timeZone || 'UTC',
        },
        location: event.location,
        attendees: event.attendees?.map((email: string) => ({ email })),
      };

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${this.calendarId}/events/${eventId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(googleEvent),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Google Calendar update event error: ${response.status}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Google Calendar update event error:', error);
      throw error;
    }
  }

  async deleteEvent(eventId: string): Promise<any> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${this.calendarId}/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      if (!response.ok && response.status !== 404) {
        throw new Error(
          `Google Calendar delete event error: ${response.status}`,
        );
      }

      return { deleted: true };
    } catch (error) {
      console.error('Google Calendar delete event error:', error);
      throw error;
    }
  }

  async listEvents(startDate: string, endDate: string): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        timeMin: startDate,
        timeMax: endDate,
        singleEvents: 'true',
        orderBy: 'startTime',
      });

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${this.calendarId}/events?${params}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `Google Calendar list events error: ${response.status}`,
        );
      }

      const data = await response.json();

      return (
        data.items?.map((event: any) => ({
          external_event_id: event.id,
          title: event.summary,
          description: event.description,
          start_time: event.start.dateTime || event.start.date,
          end_time: event.end.dateTime || event.end.date,
          location: event.location,
          html_link: event.htmlLink,
        })) || []
      );
    } catch (error) {
      console.error('Google Calendar list events error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // Revoke token if needed
    try {
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${this.accessToken}`,
        {
          method: 'POST',
        },
      );
    } catch (error) {
      console.error('Error revoking Google Calendar token:', error);
    }
  }
}

// Outlook Calendar provider implementation
class OutlookCalendarProvider implements CalendarProvider {
  name = 'outlook';
  private accessToken: string;
  private calendarId: string;

  constructor(credentials: any) {
    this.accessToken = credentials.access_token;
    this.calendarId = credentials.calendar_id || 'primary';
  }

  async connect(credentials: any): Promise<any> {
    try {
      const response = await fetch(
        'https://graph.microsoft.com/v1.0/me/calendar',
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Outlook Calendar API error: ${response.status}`);
      }

      const calendarInfo = await response.json();

      return {
        connected: true,
        calendar_name: calendarInfo.name,
        calendar_id: calendarInfo.id,
        owner: calendarInfo.owner.name,
      };
    } catch (error) {
      console.error('Outlook Calendar connection error:', error);
      throw new Error('Failed to connect to Outlook Calendar');
    }
  }

  async createEvent(event: any): Promise<any> {
    try {
      const outlookEvent = {
        subject: event.title,
        body: {
          contentType: 'HTML',
          content: event.description,
        },
        start: {
          dateTime: event.start_time,
          timeZone: 'UTC',
        },
        end: {
          dateTime: event.end_time,
          timeZone: 'UTC',
        },
        location: event.location
          ? {
              displayName: event.location,
            }
          : undefined,
        attendees: event.attendees?.map((email: string) => ({
          emailAddress: { address: email },
        })),
        reminderMinutesBeforeStart: event.reminders?.[0]?.minutes || 60,
      };

      const response = await fetch(
        'https://graph.microsoft.com/v1.0/me/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(outlookEvent),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Outlook Calendar create event error: ${response.status}`,
        );
      }

      const createdEvent = await response.json();

      return {
        external_event_id: createdEvent.id,
        web_link: createdEvent.webLink,
        status: createdEvent.responseStatus?.response,
      };
    } catch (error) {
      console.error('Outlook Calendar create event error:', error);
      throw error;
    }
  }

  async updateEvent(eventId: string, event: any): Promise<any> {
    try {
      const outlookEvent = {
        subject: event.title,
        body: {
          contentType: 'HTML',
          content: event.description,
        },
        start: {
          dateTime: event.start_time,
          timeZone: 'UTC',
        },
        end: {
          dateTime: event.end_time,
          timeZone: 'UTC',
        },
        location: event.location
          ? {
              displayName: event.location,
            }
          : undefined,
      };

      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(outlookEvent),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Outlook Calendar update event error: ${response.status}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Outlook Calendar update event error:', error);
      throw error;
    }
  }

  async deleteEvent(eventId: string): Promise<any> {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      if (!response.ok && response.status !== 404) {
        throw new Error(
          `Outlook Calendar delete event error: ${response.status}`,
        );
      }

      return { deleted: true };
    } catch (error) {
      console.error('Outlook Calendar delete event error:', error);
      throw error;
    }
  }

  async listEvents(startDate: string, endDate: string): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        startDateTime: startDate,
        endDateTime: endDate,
        $orderby: 'start/dateTime',
      });

      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/calendarview?${params}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `Outlook Calendar list events error: ${response.status}`,
        );
      }

      const data = await response.json();

      return (
        data.value?.map((event: any) => ({
          external_event_id: event.id,
          title: event.subject,
          description: event.body?.content,
          start_time: event.start.dateTime,
          end_time: event.end.dateTime,
          location: event.location?.displayName,
          web_link: event.webLink,
        })) || []
      );
    } catch (error) {
      console.error('Outlook Calendar list events error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // Microsoft handles token revocation differently
    console.log('Outlook Calendar disconnected');
  }
}

// Apple Calendar provider (basic implementation)
class AppleCalendarProvider implements CalendarProvider {
  name = 'apple';
  private credentials: any;

  constructor(credentials: any) {
    this.credentials = credentials;
  }

  async connect(credentials: any): Promise<any> {
    // Apple Calendar integration would require different approach
    // For now, return a placeholder
    return {
      connected: true,
      calendar_name: 'Apple Calendar',
      calendar_id: 'primary',
      note: 'Apple Calendar integration requires native app or EventKit framework',
    };
  }

  async createEvent(event: any): Promise<any> {
    // Placeholder implementation
    return {
      external_event_id: `apple_${Date.now()}`,
      status: 'created',
    };
  }

  async updateEvent(eventId: string, event: any): Promise<any> {
    return { updated: true };
  }

  async deleteEvent(eventId: string): Promise<any> {
    return { deleted: true };
  }

  async listEvents(startDate: string, endDate: string): Promise<any[]> {
    return [];
  }

  async disconnect(): Promise<void> {
    console.log('Apple Calendar disconnected');
  }
}

// Calendar sync manager
class CalendarSyncManager {
  private supabase: any;
  private coupleId: string;
  private provider: CalendarProvider;
  private integration: any;

  constructor(
    supabase: any,
    coupleId: string,
    provider: CalendarProvider,
    integration: any,
  ) {
    this.supabase = supabase;
    this.coupleId = coupleId;
    this.provider = provider;
    this.integration = integration;
  }

  async syncPhotoGroupsToCalendar(options: any): Promise<any> {
    try {
      // Get photo groups to sync
      const { data: photoGroups } = await this.supabase
        .from('photo_groups')
        .select(
          `
          id,
          name,
          description,
          timeline_slot,
          location,
          estimated_time_minutes,
          photographer_notes,
          priority,
          assignments:photo_group_assignments(
            guest:guests(first_name, last_name, email)
          )
        `,
        )
        .eq('couple_id', this.coupleId)
        .not('timeline_slot', 'is', null);

      if (!photoGroups || photoGroups.length === 0) {
        return {
          synced_count: 0,
          message: 'No scheduled photo groups found to sync',
        };
      }

      const syncResults = [];
      const errors = [];

      for (const group of photoGroups) {
        try {
          const calendarEvent = await this.convertPhotoGroupToEvent(
            group,
            options,
          );

          // Check if event already exists
          const existingEvent = await this.findExistingCalendarEvent(group.id);

          let result;
          if (existingEvent && options.update_events) {
            result = await this.provider.updateEvent(
              existingEvent.external_event_id,
              calendarEvent,
            );
          } else if (!existingEvent && options.create_events) {
            result = await this.provider.createEvent(calendarEvent);

            // Store the calendar event reference
            await this.supabase.from('photo_group_calendar_events').upsert({
              photo_group_id: group.id,
              calendar_integration_id: this.integration.id,
              external_event_id: result.external_event_id,
              event_data: calendarEvent,
              sync_status: 'synced',
              last_synced_at: new Date().toISOString(),
            });
          }

          if (result) {
            syncResults.push({
              photo_group_id: group.id,
              photo_group_name: group.name,
              external_event_id: result.external_event_id,
              action: existingEvent ? 'updated' : 'created',
            });
          }
        } catch (groupError) {
          console.error(`Error syncing photo group ${group.id}:`, groupError);
          errors.push({
            photo_group_id: group.id,
            photo_group_name: group.name,
            error: groupError.message,
          });
        }
      }

      // Update integration sync status
      await this.supabase
        .from('photo_group_calendar_integrations')
        .update({
          last_sync_at: new Date().toISOString(),
          sync_status: errors.length > 0 ? 'partial_failure' : 'synced',
          sync_error: errors.length > 0 ? JSON.stringify(errors) : null,
        })
        .eq('id', this.integration.id);

      return {
        synced_count: syncResults.length,
        error_count: errors.length,
        results: syncResults,
        errors,
      };
    } catch (error) {
      console.error('Calendar sync error:', error);

      // Update integration with error status
      await this.supabase
        .from('photo_group_calendar_integrations')
        .update({
          sync_status: 'failed',
          sync_error: error.message,
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', this.integration.id);

      throw error;
    }
  }

  private async convertPhotoGroupToEvent(
    group: any,
    options: any,
  ): Promise<any> {
    // Calculate start and end times based on timeline slot
    const timeSlotMapping = {
      preparation: { start: '10:00', duration: 120 },
      ceremony: { start: '14:00', duration: 90 },
      golden_hour: { start: '17:00', duration: 90 },
      reception: { start: '19:00', duration: 180 },
    };

    const slotInfo = timeSlotMapping[
      group.timeline_slot as keyof typeof timeSlotMapping
    ] || { start: '12:00', duration: group.estimated_time_minutes || 60 };

    // For this example, assume wedding is today (in real app, get from couple data)
    const weddingDate = new Date();
    const [hours, minutes] = slotInfo.start.split(':').map(Number);

    const startTime = new Date(weddingDate);
    startTime.setHours(hours, minutes, 0, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(
      endTime.getMinutes() +
        (group.estimated_time_minutes || slotInfo.duration),
    );

    // Gather attendee emails
    const attendees =
      group.assignments
        ?.map((assignment: any) => assignment.guest?.email)
        .filter((email: string) => email) || [];

    const eventTitle = `${options.event_prefix || 'WedSync: '}${group.name}`;

    let description = group.description || '';
    if (group.photographer_notes) {
      description += `\n\nPhotographer Notes: ${group.photographer_notes}`;
    }
    if (group.assignments && group.assignments.length > 0) {
      const guestNames = group.assignments
        .map((a: any) => `${a.guest?.first_name} ${a.guest?.last_name}`)
        .filter((name) => name.trim())
        .join(', ');
      if (guestNames) {
        description += `\n\nGuests: ${guestNames}`;
      }
    }

    return {
      title: eventTitle,
      description: description.trim(),
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      location: group.location || 'Wedding Venue',
      attendees: attendees,
      reminders: [
        { method: 'email', minutes: 60 },
        { method: 'popup', minutes: 15 },
      ],
    };
  }

  private async findExistingCalendarEvent(photoGroupId: string): Promise<any> {
    const { data: existingEvent } = await this.supabase
      .from('photo_group_calendar_events')
      .select('*')
      .eq('photo_group_id', photoGroupId)
      .eq('calendar_integration_id', this.integration.id)
      .single();

    return existingEvent;
  }
}

function createCalendarProvider(
  providerName: string,
  credentials: any,
): CalendarProvider {
  switch (providerName) {
    case 'google':
      return new GoogleCalendarProvider(credentials);
    case 'outlook':
      return new OutlookCalendarProvider(credentials);
    case 'apple':
      return new AppleCalendarProvider(credentials);
    default:
      throw new Error(`Unsupported calendar provider: ${providerName}`);
  }
}

// POST /api/photo-groups/calendar/sync - Handle calendar sync operations
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { couple_id, provider, action, credentials, sync_options } =
      CalendarSyncSchema.parse(body);

    // Verify user has access to this couple
    const { data: client } = await supabase
      .from('clients')
      .select(
        `
        id,
        user_profiles!inner(user_id)
      `,
      )
      .eq('id', couple_id)
      .eq('user_profiles.user_id', user.id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    let result = {};

    switch (action) {
      case 'connect':
        if (!credentials) {
          return NextResponse.json(
            { error: 'Credentials required for connect action' },
            { status: 400 },
          );
        }

        try {
          const calendarProvider = createCalendarProvider(
            provider,
            credentials,
          );
          const connectionResult = await calendarProvider.connect(credentials);

          // Store integration
          const { data: integration, error: integrationError } = await supabase
            .from('photo_group_calendar_integrations')
            .upsert(
              {
                couple_id,
                calendar_provider: provider,
                integration_data: {
                  ...credentials,
                  ...connectionResult,
                },
                sync_status: 'connected',
                last_sync_at: new Date().toISOString(),
              },
              {
                onConflict: 'couple_id,calendar_provider',
              },
            )
            .select()
            .single();

          if (integrationError) {
            throw integrationError;
          }

          result = {
            action: 'connected',
            provider,
            integration_id: integration.id,
            connection_info: connectionResult,
          };
        } catch (connectionError) {
          console.error('Calendar connection error:', connectionError);
          result = {
            action: 'failed',
            provider,
            error: connectionError.message,
          };
        }
        break;

      case 'sync':
        // Get existing integration
        const { data: integration } = await supabase
          .from('photo_group_calendar_integrations')
          .select('*')
          .eq('couple_id', couple_id)
          .eq('calendar_provider', provider)
          .single();

        if (!integration) {
          return NextResponse.json(
            {
              error: 'Calendar integration not found. Please connect first.',
            },
            { status: 404 },
          );
        }

        try {
          const calendarProvider = createCalendarProvider(
            provider,
            integration.integration_data,
          );
          const syncManager = new CalendarSyncManager(
            supabase,
            couple_id,
            calendarProvider,
            integration,
          );

          const syncResult = await syncManager.syncPhotoGroupsToCalendar(
            sync_options || {},
          );

          result = {
            action: 'synced',
            provider,
            ...syncResult,
          };
        } catch (syncError) {
          console.error('Calendar sync error:', syncError);
          result = {
            action: 'sync_failed',
            provider,
            error: syncError.message,
          };
        }
        break;

      case 'disconnect':
        // Remove integration
        const { error: deleteError } = await supabase
          .from('photo_group_calendar_integrations')
          .delete()
          .eq('couple_id', couple_id)
          .eq('calendar_provider', provider);

        if (deleteError) {
          throw deleteError;
        }

        result = {
          action: 'disconnected',
          provider,
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Calendar sync API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// GET /api/photo-groups/calendar/sync - Get calendar integration status
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const coupleId = searchParams.get('couple_id');
  const provider = searchParams.get('provider');

  if (!coupleId) {
    return NextResponse.json(
      { error: 'couple_id is required' },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this couple
    const { data: client } = await supabase
      .from('clients')
      .select(
        `
        id,
        user_profiles!inner(user_id)
      `,
      )
      .eq('id', coupleId)
      .eq('user_profiles.user_id', user.id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    let query = supabase
      .from('photo_group_calendar_integrations')
      .select('*')
      .eq('couple_id', coupleId);

    if (provider) {
      query = query.eq('calendar_provider', provider);
    }

    const { data: integrations, error: integrationsError } = await query;

    if (integrationsError) {
      console.error('Error fetching calendar integrations:', integrationsError);
      return NextResponse.json(
        { error: 'Failed to fetch calendar integrations' },
        { status: 500 },
      );
    }

    // Get calendar events for this couple
    const { data: calendarEvents } = await supabase
      .from('photo_group_calendar_events')
      .select(
        `
        *,
        photo_groups(id, name, timeline_slot)
      `,
      )
      .in('calendar_integration_id', integrations?.map((i) => i.id) || []);

    return NextResponse.json({
      integrations:
        integrations?.map((integration) => ({
          id: integration.id,
          provider: integration.calendar_provider,
          sync_status: integration.sync_status,
          last_sync_at: integration.last_sync_at,
          sync_error: integration.sync_error,
          calendar_name: integration.integration_data?.calendar_name,
        })) || [],
      calendar_events: calendarEvents || [],
      total_integrations: integrations?.length || 0,
    });
  } catch (error) {
    console.error('Get calendar integrations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
