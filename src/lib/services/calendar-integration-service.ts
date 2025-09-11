import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { TaskStatus, TaskPriority } from '@/types/workflow';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_time: Date;
  end_time: Date;
  all_day: boolean;
  location?: string;
  attendees?: string[];
  task_id?: string;
  wedding_id: string;
  created_by: string;
  calendar_provider?: 'google' | 'outlook' | 'apple' | 'internal';
  external_id?: string;
  recurrence_rule?: string;
  reminder_minutes?: number[];
  color?: string;
  visibility: 'public' | 'private' | 'team';
  metadata?: Record<string, any>;
}

export interface CalendarSync {
  user_id: string;
  provider: 'google' | 'outlook' | 'apple';
  provider_account_id: string;
  calendar_id: string;
  calendar_name: string;
  access_token: string;
  refresh_token?: string;
  expires_at?: Date;
  sync_enabled: boolean;
  last_sync_at?: Date;
  sync_direction: 'import' | 'export' | 'bidirectional';
}

export interface TaskCalendarMapping {
  task_id: string;
  calendar_event_id: string;
  mapping_type: 'deadline' | 'work_block' | 'milestone' | 'reminder';
  auto_sync: boolean;
  sync_updates: boolean;
}

export class CalendarIntegrationService {
  // Check helper availability across all calendar integrations
  async checkHelperAvailability(
    helperId: string,
    startTime: Date,
    endTime: Date,
    weddingId: string,
  ): Promise<{
    helper_id: string;
    is_available: boolean;
    conflicting_events: CalendarEvent[];
    suggested_alternatives: Array<{
      start_time: string;
      end_time: string;
      confidence_score: number;
      reason: string;
    }>;
    confidence_score: number;
    check_duration_ms: number;
    last_sync: string;
    provider_status: string;
    error?: string;
  }> {
    const startCheck = Date.now();

    try {
      // Get helper's calendar sync settings
      const { data: syncSettings } = await supabase
        .from('calendar_syncs')
        .select('*')
        .eq('user_id', helperId)
        .eq('sync_enabled', true);

      if (!syncSettings?.length) {
        return {
          helper_id: helperId,
          is_available: true,
          conflicting_events: [],
          suggested_alternatives: [],
          confidence_score: 0.5,
          check_duration_ms: Date.now() - startCheck,
          last_sync: new Date().toISOString(),
          provider_status: 'no_integration',
        };
      }

      const conflictingEvents: CalendarEvent[] = [];

      // Check each integrated calendar for conflicts
      for (const sync of syncSettings) {
        const events = await this.getExternalCalendarEvents(
          sync,
          startTime,
          endTime,
        );
        const conflicts = events.filter((event) =>
          this.hasTimeConflict(event, startTime, endTime),
        );
        conflictingEvents.push(...conflicts);
      }

      // Generate alternative time suggestions if conflicts exist
      const suggestedAlternatives =
        conflictingEvents.length > 0
          ? await this.generateAlternativeSlots(
              helperId,
              startTime,
              endTime,
              conflictingEvents,
            )
          : [];

      return {
        helper_id: helperId,
        is_available: conflictingEvents.length === 0,
        conflicting_events: conflictingEvents,
        suggested_alternatives: suggestedAlternatives,
        confidence_score: this.calculateAvailabilityConfidence(
          syncSettings,
          conflictingEvents,
          Date.now() - startCheck,
        ),
        check_duration_ms: Date.now() - startCheck,
        last_sync: new Date().toISOString(),
        provider_status: 'synchronized',
      };
    } catch (error) {
      console.error('Calendar availability check failed:', error);

      return {
        helper_id: helperId,
        is_available: false,
        conflicting_events: [],
        suggested_alternatives: [],
        confidence_score: 0.1,
        check_duration_ms: Date.now() - startCheck,
        last_sync: new Date().toISOString(),
        provider_status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async getExternalCalendarEvents(
    sync: CalendarSync,
    startTime: Date,
    endTime: Date,
  ): Promise<CalendarEvent[]> {
    try {
      switch (sync.provider) {
        case 'google':
          return await this.getGoogleCalendarEventsForAvailability(
            sync,
            startTime,
            endTime,
          );
        case 'outlook':
          return await this.getOutlookCalendarEventsForAvailability(
            sync,
            startTime,
            endTime,
          );
        case 'apple':
          return await this.getAppleCalendarEventsForAvailability(
            sync,
            startTime,
            endTime,
          );
        default:
          return [];
      }
    } catch (error) {
      console.error(`Failed to get events from ${sync.provider}:`, error);
      return [];
    }
  }

  private async getGoogleCalendarEventsForAvailability(
    sync: CalendarSync,
    startTime: Date,
    endTime: Date,
  ): Promise<CalendarEvent[]> {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${sync.calendar_id}/events?` +
        `timeMin=${startTime.toISOString()}&timeMax=${endTime.toISOString()}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${sync.access_token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.status}`);
    }

    const data = await response.json();

    return (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.summary || 'Untitled Event',
      description: item.description || '',
      start_time: new Date(item.start?.dateTime || item.start?.date),
      end_time: new Date(item.end?.dateTime || item.end?.date),
      all_day: !item.start?.dateTime,
      location: item.location,
      attendees: item.attendees?.map((a: any) => a.email) || [],
      wedding_id: '',
      created_by: sync.user_id,
      calendar_provider: 'google' as const,
      external_id: item.id,
      visibility: 'private' as const,
    }));
  }

  private async getOutlookCalendarEventsForAvailability(
    sync: CalendarSync,
    startTime: Date,
    endTime: Date,
  ): Promise<CalendarEvent[]> {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendars/${sync.calendar_id}/events?` +
        `$filter=start/dateTime ge '${startTime.toISOString()}' and end/dateTime le '${endTime.toISOString()}'`,
      {
        headers: {
          Authorization: `Bearer ${sync.access_token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Outlook Calendar API error: ${response.status}`);
    }

    const data = await response.json();

    return (data.value || []).map((item: any) => ({
      id: item.id,
      title: item.subject || 'Untitled Event',
      description: item.bodyPreview || '',
      start_time: new Date(item.start.dateTime),
      end_time: new Date(item.end.dateTime),
      all_day: item.isAllDay,
      location: item.location?.displayName,
      attendees: item.attendees?.map((a: any) => a.emailAddress.address) || [],
      wedding_id: '',
      created_by: sync.user_id,
      calendar_provider: 'outlook' as const,
      external_id: item.id,
      visibility: 'private' as const,
    }));
  }

  private async getAppleCalendarEventsForAvailability(
    sync: CalendarSync,
    startTime: Date,
    endTime: Date,
  ): Promise<CalendarEvent[]> {
    // Apple Calendar integration via CalDAV would be implemented here
    console.warn(
      'Apple Calendar integration not fully implemented for availability checking',
    );
    return [];
  }

  private hasTimeConflict(
    event: CalendarEvent,
    proposedStart: Date,
    proposedEnd: Date,
  ): boolean {
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);

    // Check for any overlap
    return (
      (proposedStart >= eventStart && proposedStart < eventEnd) ||
      (proposedEnd > eventStart && proposedEnd <= eventEnd) ||
      (proposedStart <= eventStart && proposedEnd >= eventEnd)
    );
  }

  private async generateAlternativeSlots(
    helperId: string,
    originalStart: Date,
    originalEnd: Date,
    conflicts: CalendarEvent[],
  ): Promise<
    Array<{
      start_time: string;
      end_time: string;
      confidence_score: number;
      reason: string;
    }>
  > {
    const alternatives = [];
    const taskDuration = originalEnd.getTime() - originalStart.getTime();

    // Try slot before the original time
    const beforeSlot = new Date(originalStart.getTime() - taskDuration);
    if (await this.isSlotFree(helperId, beforeSlot, originalStart)) {
      alternatives.push({
        start_time: beforeSlot.toISOString(),
        end_time: originalStart.toISOString(),
        confidence_score: 0.8,
        reason: 'Available slot before original time',
      });
    }

    // Try slot after conflicts
    const latestConflictEnd = Math.max(
      ...conflicts.map((c) => new Date(c.end_time).getTime()),
    );
    const afterSlot = new Date(latestConflictEnd);
    const afterSlotEnd = new Date(afterSlot.getTime() + taskDuration);

    if (await this.isSlotFree(helperId, afterSlot, afterSlotEnd)) {
      alternatives.push({
        start_time: afterSlot.toISOString(),
        end_time: afterSlotEnd.toISOString(),
        confidence_score: 0.7,
        reason: 'Available slot after conflicts',
      });
    }

    // Try next day same time
    const nextDay = new Date(originalStart.getTime() + 24 * 60 * 60 * 1000);
    const nextDayEnd = new Date(nextDay.getTime() + taskDuration);

    if (await this.isSlotFree(helperId, nextDay, nextDayEnd)) {
      alternatives.push({
        start_time: nextDay.toISOString(),
        end_time: nextDayEnd.toISOString(),
        confidence_score: 0.6,
        reason: 'Same time next day',
      });
    }

    return alternatives.slice(0, 3);
  }

  private async isSlotFree(
    helperId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<boolean> {
    const availability = await this.checkHelperAvailability(
      helperId,
      startTime,
      endTime,
      'availability-check',
    );

    return availability.is_available;
  }

  private calculateAvailabilityConfidence(
    integrations: CalendarSync[],
    conflicts: CalendarEvent[],
    checkDuration: number,
  ): number {
    let confidence = 1.0;

    // Reduce confidence if check took too long (network issues)
    if (checkDuration > 2000) confidence -= 0.2;

    // Reduce confidence if no integrations
    if (integrations.length === 0) confidence = 0.5;

    // Reduce confidence based on number of conflicts
    confidence -= conflicts.length * 0.1;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  // Schedule helper assignment with calendar integration
  async scheduleHelperAssignment(request: {
    helper_id: string;
    task_id: string;
    start_time: string;
    end_time: string;
    wedding_id: string;
    auto_create_event?: boolean;
    force_schedule?: boolean;
  }): Promise<{
    success: boolean;
    helper_id: string;
    task_id: string;
    conflicts?: CalendarEvent[];
    suggested_alternatives?: Array<{
      start_time: string;
      end_time: string;
      confidence_score: number;
      reason: string;
    }>;
    created_events?: CalendarEvent[];
    sync_duration_ms: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const {
        helper_id,
        task_id,
        start_time,
        end_time,
        wedding_id,
        auto_create_event = true,
      } = request;

      // Check availability first
      const availability = await this.checkHelperAvailability(
        helper_id,
        new Date(start_time),
        new Date(end_time),
        wedding_id,
      );

      if (!availability.is_available && !request.force_schedule) {
        return {
          success: false,
          helper_id,
          task_id,
          conflicts: availability.conflicting_events,
          suggested_alternatives: availability.suggested_alternatives,
          sync_duration_ms: Date.now() - startTime,
          error: 'Helper not available during requested time',
        };
      }

      // Create calendar events if auto_create_event is true
      const createdEvents: CalendarEvent[] = [];

      if (auto_create_event) {
        const event = await this.createEventFromTask(task_id);
        createdEvents.push(event);
      }

      // Update task assignment
      await supabase
        .from('task_assignments')
        .update({
          assigned_helper_id: helper_id,
          scheduled_start: start_time,
          scheduled_end: end_time,
          calendar_synced: true,
          updated_at: new Date().toISOString(),
        })
        .eq('task_id', task_id);

      return {
        success: true,
        helper_id,
        task_id,
        created_events: createdEvents,
        sync_duration_ms: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Calendar scheduling failed:', error);

      return {
        success: false,
        helper_id: request.helper_id,
        task_id: request.task_id,
        sync_duration_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Create calendar event from task
  async createEventFromTask(
    taskId: string,
    mapping_type: 'deadline' | 'work_block' | 'milestone' = 'deadline',
  ): Promise<CalendarEvent> {
    try {
      // Get task details
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select(
          `
          id, title, description, deadline, estimated_duration, priority,
          wedding_id, assigned_to, category, status,
          wedding:weddings(client_name, wedding_date)
        `,
        )
        .eq('id', taskId)
        .single();

      if (taskError || !task) {
        throw new Error('Task not found');
      }

      // Calculate event timing based on mapping type
      const eventTiming = this.calculateEventTiming(task, mapping_type);

      const calendarEvent: Omit<CalendarEvent, 'id'> = {
        title: this.generateEventTitle(task, mapping_type),
        description: this.generateEventDescription(task, mapping_type),
        start_time: eventTiming.start_time,
        end_time: eventTiming.end_time,
        all_day: eventTiming.all_day,
        location: task.wedding?.client_name
          ? `${task.wedding.client_name} Wedding`
          : undefined,
        task_id: taskId,
        wedding_id: task.wedding_id,
        created_by: task.assigned_to || 'system',
        calendar_provider: 'internal',
        reminder_minutes: this.getDefaultReminders(task.priority, mapping_type),
        color: this.getTaskColor(task.category, task.priority),
        visibility: 'team',
        metadata: {
          task_category: task.category,
          task_priority: task.priority,
          task_status: task.status,
          mapping_type,
          estimated_duration: task.estimated_duration,
        },
      };

      // Insert calendar event
      const { data: createdEvent, error: insertError } = await supabase
        .from('calendar_events')
        .insert(calendarEvent)
        .select()
        .single();

      if (insertError) throw insertError;

      // Create task-calendar mapping
      await this.createTaskCalendarMapping(
        taskId,
        createdEvent.id,
        mapping_type,
      );

      // Sync to external calendars if enabled
      await this.syncEventToExternalCalendars(createdEvent.id);

      return createdEvent;
    } catch (error) {
      console.error('Failed to create event from task:', error);
      throw error;
    }
  }

  // Calculate event timing based on mapping type
  private calculateEventTiming(task: any, mapping_type: string) {
    const deadline = new Date(task.deadline);
    const duration = task.estimated_duration || 1;

    switch (mapping_type) {
      case 'deadline':
        return {
          start_time: deadline,
          end_time: new Date(deadline.getTime() + 30 * 60 * 1000), // 30 minutes
          all_day: false,
        };

      case 'work_block':
        // Schedule work block 1-2 days before deadline
        const workStart = new Date(
          deadline.getTime() - 2 * 24 * 60 * 60 * 1000,
        );
        workStart.setHours(9, 0, 0, 0); // 9 AM
        const workEnd = new Date(
          workStart.getTime() + duration * 60 * 60 * 1000,
        );

        return {
          start_time: workStart,
          end_time: workEnd,
          all_day: duration >= 8, // All day if 8+ hours
        };

      case 'milestone':
        return {
          start_time: deadline,
          end_time: deadline,
          all_day: true,
        };

      default:
        return {
          start_time: deadline,
          end_time: new Date(deadline.getTime() + 60 * 60 * 1000), // 1 hour
          all_day: false,
        };
    }
  }

  // Generate event title based on task and mapping type
  private generateEventTitle(task: any, mapping_type: string): string {
    const prefix =
      {
        deadline: '📅 Deadline:',
        work_block: '🔨 Work:',
        milestone: '🎯 Milestone:',
      }[mapping_type] || '';

    return `${prefix} ${task.title}`;
  }

  // Generate event description
  private generateEventDescription(task: any, mapping_type: string): string {
    const parts = [];

    if (task.description) {
      parts.push(task.description);
    }

    parts.push(`Category: ${task.category.replace('_', ' ')}`);
    parts.push(`Priority: ${task.priority}`);
    parts.push(`Status: ${task.status}`);

    if (task.estimated_duration) {
      parts.push(`Estimated Duration: ${task.estimated_duration} hours`);
    }

    parts.push(`Wedding: ${task.wedding?.client_name || 'Unknown'}`);

    return parts.join('\n');
  }

  // Get default reminder times based on priority and type
  private getDefaultReminders(
    priority: string,
    mapping_type: string,
  ): number[] {
    const reminders = {
      critical: {
        deadline: [60, 24 * 60, 7 * 24 * 60], // 1 hour, 1 day, 1 week
        work_block: [15, 60], // 15 min, 1 hour
        milestone: [60, 24 * 60], // 1 hour, 1 day
      },
      high: {
        deadline: [60, 24 * 60], // 1 hour, 1 day
        work_block: [15], // 15 min
        milestone: [60], // 1 hour
      },
      medium: {
        deadline: [24 * 60], // 1 day
        work_block: [15], // 15 min
        milestone: [60], // 1 hour
      },
      low: {
        deadline: [24 * 60], // 1 day
        work_block: [], // No reminders
        milestone: [], // No reminders
      },
    };

    return (
      reminders[priority as keyof typeof reminders]?.[
        mapping_type as keyof typeof reminders.critical
      ] || [60]
    );
  }

  // Get task color based on category and priority
  private getTaskColor(category: string, priority: string): string {
    const priorityColors = {
      critical: '#ef4444', // red
      high: '#f97316', // orange
      medium: '#eab308', // yellow
      low: '#22c55e', // green
    };

    return priorityColors[priority as keyof typeof priorityColors] || '#6b7280';
  }

  // Create task-calendar mapping
  private async createTaskCalendarMapping(
    taskId: string,
    eventId: string,
    mapping_type: string,
    auto_sync: boolean = true,
  ): Promise<void> {
    try {
      await supabase.from('task_calendar_mappings').insert({
        task_id: taskId,
        calendar_event_id: eventId,
        mapping_type: mapping_type as any,
        auto_sync,
        sync_updates: true,
      });
    } catch (error) {
      console.error('Failed to create task calendar mapping:', error);
    }
  }

  // Sync event to external calendars
  private async syncEventToExternalCalendars(eventId: string): Promise<void> {
    try {
      // Get event details
      const { data: event, error } = await supabase
        .from('calendar_events')
        .select('*, task:tasks(assigned_to)')
        .eq('id', eventId)
        .single();

      if (error || !event) return;

      // Get user's calendar sync settings
      const assignedUserId = event.task?.assigned_to;
      if (!assignedUserId) return;

      const { data: syncSettings } = await supabase
        .from('calendar_syncs')
        .select('*')
        .eq('user_id', assignedUserId)
        .eq('sync_enabled', true);

      if (!syncSettings || syncSettings.length === 0) return;

      // Sync to each configured calendar
      for (const sync of syncSettings) {
        await this.syncToExternalProvider(event, sync);
      }
    } catch (error) {
      console.error('Failed to sync to external calendars:', error);
    }
  }

  // Sync to external calendar provider
  private async syncToExternalProvider(
    event: CalendarEvent,
    sync: CalendarSync,
  ): Promise<void> {
    try {
      switch (sync.provider) {
        case 'google':
          await this.syncToGoogleCalendar(event, sync);
          break;
        case 'outlook':
          await this.syncToOutlookCalendar(event, sync);
          break;
        case 'apple':
          await this.syncToAppleCalendar(event, sync);
          break;
      }
    } catch (error) {
      console.error(`Failed to sync to ${sync.provider}:`, error);
    }
  }

  // Google Calendar integration
  private async syncToGoogleCalendar(
    event: CalendarEvent,
    sync: CalendarSync,
  ): Promise<void> {
    try {
      // Check if token needs refresh
      if (sync.expires_at && new Date(sync.expires_at) <= new Date()) {
        await this.refreshGoogleToken(sync);
      }

      const googleEvent = {
        summary: event.title,
        description: event.description,
        start: event.all_day
          ? { date: event.start_time.toISOString().split('T')[0] }
          : { dateTime: event.start_time.toISOString() },
        end: event.all_day
          ? { date: event.end_time.toISOString().split('T')[0] }
          : { dateTime: event.end_time.toISOString() },
        location: event.location,
        reminders: {
          useDefault: false,
          overrides:
            event.reminder_minutes?.map((minutes) => ({
              method: 'popup',
              minutes,
            })) || [],
        },
      };

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${sync.calendar_id}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sync.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(googleEvent),
        },
      );

      if (response.ok) {
        const createdEvent = await response.json();

        // Update our event with external ID
        await supabase
          .from('calendar_events')
          .update({
            external_id: createdEvent.id,
            calendar_provider: 'google',
          })
          .eq('id', event.id);
      }
    } catch (error) {
      console.error('Google Calendar sync failed:', error);
    }
  }

  // Outlook Calendar integration
  private async syncToOutlookCalendar(
    event: CalendarEvent,
    sync: CalendarSync,
  ): Promise<void> {
    try {
      const outlookEvent = {
        subject: event.title,
        body: {
          contentType: 'text',
          content: event.description,
        },
        start: {
          dateTime: event.start_time.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: event.end_time.toISOString(),
          timeZone: 'UTC',
        },
        location: {
          displayName: event.location || '',
        },
        isAllDay: event.all_day,
      };

      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/calendars/${sync.calendar_id}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sync.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(outlookEvent),
        },
      );

      if (response.ok) {
        const createdEvent = await response.json();

        await supabase
          .from('calendar_events')
          .update({
            external_id: createdEvent.id,
            calendar_provider: 'outlook',
          })
          .eq('id', event.id);
      }
    } catch (error) {
      console.error('Outlook Calendar sync failed:', error);
    }
  }

  // Apple Calendar integration (CalDAV)
  private async syncToAppleCalendar(
    event: CalendarEvent,
    sync: CalendarSync,
  ): Promise<void> {
    // Apple Calendar integration would use CalDAV protocol
    // This is a simplified placeholder for the actual implementation
    console.log('Apple Calendar sync not implemented yet');
  }

  // Refresh Google OAuth token
  private async refreshGoogleToken(sync: CalendarSync): Promise<void> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: sync.refresh_token!,
          client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
          client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
        }),
      });

      if (response.ok) {
        const tokens = await response.json();

        await supabase
          .from('calendar_syncs')
          .update({
            access_token: tokens.access_token,
            expires_at: new Date(
              Date.now() + tokens.expires_in * 1000,
            ).toISOString(),
          })
          .eq('user_id', sync.user_id)
          .eq('provider', 'google');
      }
    } catch (error) {
      console.error('Failed to refresh Google token:', error);
    }
  }

  // Get calendar events for a date range
  async getCalendarEvents(
    weddingId: string,
    startDate: Date,
    endDate: Date,
    userId?: string,
  ): Promise<CalendarEvent[]> {
    try {
      let query = supabase
        .from('calendar_events')
        .select(
          `
          *,
          task:tasks(title, status, priority, category),
          wedding:weddings(client_name, wedding_date)
        `,
        )
        .eq('wedding_id', weddingId)
        .gte('start_time', startDate.toISOString())
        .lte('end_time', endDate.toISOString())
        .order('start_time');

      if (userId) {
        query = query.eq('created_by', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Failed to get calendar events:', error);
      throw error;
    }
  }

  // Update calendar event
  async updateCalendarEvent(
    eventId: string,
    updates: Partial<CalendarEvent>,
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', eventId);

      if (error) throw error;

      // Sync updates to external calendars
      await this.syncEventToExternalCalendars(eventId);
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      throw error;
    }
  }

  // Delete calendar event
  async deleteCalendarEvent(eventId: string): Promise<void> {
    try {
      // Get event details for external sync
      const { data: event } = await supabase
        .from('calendar_events')
        .select('external_id, calendar_provider')
        .eq('id', eventId)
        .single();

      // Delete from external calendar first
      if (event?.external_id && event.calendar_provider) {
        await this.deleteFromExternalCalendar(
          event.external_id,
          event.calendar_provider,
        );
      }

      // Delete task-calendar mappings
      await supabase
        .from('task_calendar_mappings')
        .delete()
        .eq('calendar_event_id', eventId);

      // Delete calendar event
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      throw error;
    }
  }

  // Delete from external calendar
  private async deleteFromExternalCalendar(
    externalId: string,
    provider: string,
  ): Promise<void> {
    // Implementation would depend on the provider
    // This is a placeholder for the actual deletion logic
    console.log(`Deleting event ${externalId} from ${provider}`);
  }

  // Bulk create events from tasks
  async bulkCreateEventsFromTasks(
    taskIds: string[],
    mapping_type: 'deadline' | 'work_block' | 'milestone' = 'deadline',
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const taskId of taskIds) {
      try {
        await this.createEventFromTask(taskId, mapping_type);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Task ${taskId}: ${error}`);
      }
    }

    return results;
  }

  // Sync all task deadlines to calendar
  async syncAllTaskDeadlines(weddingId: string): Promise<void> {
    try {
      // Get all tasks without calendar events
      const { data: tasks } = await supabase
        .from('tasks')
        .select(
          `
          id, title, deadline, status,
          mapping:task_calendar_mappings(calendar_event_id)
        `,
        )
        .eq('wedding_id', weddingId)
        .neq('status', TaskStatus.COMPLETED)
        .is('mapping.calendar_event_id', null);

      if (!tasks) return;

      const taskIds = tasks.map((t) => t.id);
      await this.bulkCreateEventsFromTasks(taskIds, 'deadline');
    } catch (error) {
      console.error('Failed to sync all task deadlines:', error);
      throw error;
    }
  }

  // Get calendar sync settings for user
  async getCalendarSyncSettings(userId: string): Promise<CalendarSync[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_syncs')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get calendar sync settings:', error);
      throw error;
    }
  }

  // Update calendar sync settings
  async updateCalendarSyncSettings(
    userId: string,
    provider: string,
    settings: Partial<CalendarSync>,
  ): Promise<void> {
    try {
      const { error } = await supabase.from('calendar_syncs').upsert({
        user_id: userId,
        provider: provider as any,
        ...settings,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update calendar sync settings:', error);
      throw error;
    }
  }
}
