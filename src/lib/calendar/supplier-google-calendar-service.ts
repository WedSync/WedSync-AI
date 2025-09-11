// WS-161: Supplier Google Calendar Integration Service
import {
  CalendarIntegrationService,
  CalendarEvent,
  CalendarSync,
} from '@/lib/services/calendar-integration-service';
import { SupplierCalendarInviteService } from '@/lib/calendar/supplier-calendar-invite-service';
import { createClient } from '@/lib/supabase/server';
import { SupplierScheduleEvent, SupplierContactInfo } from '@/types/suppliers';

interface SupplierCalendarSyncSettings extends CalendarSync {
  organization_id: string;
  supplier_id?: string;
  auto_sync_enabled: boolean;
  conflict_resolution: 'manual' | 'auto_reschedule' | 'notify_only';
  sync_window_days: number;
  sync_categories: string[];
  notification_preferences: {
    sync_errors: boolean;
    conflict_alerts: boolean;
    schedule_updates: boolean;
  };
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  status: 'confirmed' | 'tentative' | 'cancelled';
  transparency?: 'opaque' | 'transparent';
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
  colorId?: string;
  source?: {
    title: string;
    url: string;
  };
}

interface SupplierSyncResult {
  supplier_id: string;
  success: boolean;
  events_synced: number;
  conflicts_found: number;
  errors: string[];
  sync_duration_ms: number;
  last_sync_time: string;
}

interface BulkSyncResult {
  total_suppliers: number;
  successful_syncs: number;
  failed_syncs: number;
  total_events_synced: number;
  total_conflicts: number;
  supplier_results: SupplierSyncResult[];
  errors: string[];
}

export class SupplierGoogleCalendarService extends CalendarIntegrationService {
  private static readonly GOOGLE_CALENDAR_API_BASE =
    'https://www.googleapis.com/calendar/v3';
  private static readonly WEDDING_CALENDAR_COLOR_ID = '9'; // Blue for wedding events
  private static readonly CONFLICT_CALENDAR_COLOR_ID = '11'; // Red for conflicts

  /**
   * Sync a single supplier's schedule to Google Calendar
   */
  static async syncSupplierScheduleToGoogleCalendar(
    supplier: SupplierContactInfo,
    scheduleEvents: SupplierScheduleEvent[],
    organizationId: string,
    syncSettings?: Partial<SupplierCalendarSyncSettings>,
  ): Promise<SupplierSyncResult> {
    const startTime = Date.now();
    const result: SupplierSyncResult = {
      supplier_id: supplier.id,
      success: false,
      events_synced: 0,
      conflicts_found: 0,
      errors: [],
      sync_duration_ms: 0,
      last_sync_time: new Date().toISOString(),
    };

    try {
      const supabase = await createClient();

      // Get supplier's Google Calendar sync settings
      const { data: calendarSync } = await supabase
        .from('supplier_calendar_syncs')
        .select('*')
        .eq('supplier_id', supplier.id)
        .eq('organization_id', organizationId)
        .eq('provider', 'google')
        .eq('sync_enabled', true)
        .single();

      if (!calendarSync) {
        result.errors.push('Google Calendar sync not enabled for supplier');
        return result;
      }

      // Refresh token if needed
      await this.refreshGoogleTokenIfNeeded(calendarSync);

      // Get existing events from Google Calendar
      const existingEvents = await this.getSupplierGoogleCalendarEvents(
        calendarSync,
        organizationId,
        supplier.id,
      );

      // Process each schedule event
      for (const scheduleEvent of scheduleEvents) {
        try {
          const googleEvent = await this.convertToGoogleCalendarEvent(
            scheduleEvent,
            supplier,
            organizationId,
          );

          // Check if event already exists
          const existingEvent = existingEvents.find(
            (e) =>
              e.source?.url ===
              `wedsync://supplier-schedule/${scheduleEvent.id}`,
          );

          let syncedEvent;
          if (existingEvent) {
            // Update existing event
            syncedEvent = await this.updateGoogleCalendarEvent(
              calendarSync,
              existingEvent.id,
              googleEvent,
            );
          } else {
            // Create new event
            syncedEvent = await this.createGoogleCalendarEvent(
              calendarSync,
              googleEvent,
            );
          }

          if (syncedEvent) {
            result.events_synced++;

            // Update our database with Google Calendar event ID
            await this.updateSupplierScheduleWithGoogleId(
              scheduleEvent.id,
              syncedEvent.id,
              organizationId,
            );
          }
        } catch (eventError) {
          result.errors.push(`Event ${scheduleEvent.id}: ${eventError}`);
        }
      }

      // Check for conflicts with supplier's personal calendar
      const conflicts = await this.detectSupplierCalendarConflicts(
        calendarSync,
        scheduleEvents,
        organizationId,
      );

      result.conflicts_found = conflicts.length;

      // Handle conflicts based on sync settings
      if (conflicts.length > 0) {
        await this.handleSupplierCalendarConflicts(
          conflicts,
          calendarSync,
          organizationId,
        );
      }

      result.success = true;
    } catch (error) {
      console.error('Supplier Google Calendar sync failed:', error);
      result.errors.push(
        error instanceof Error ? error.message : 'Unknown error',
      );
    } finally {
      result.sync_duration_ms = Date.now() - startTime;
    }

    // Log sync result
    await this.logSupplierSyncResult(result, organizationId);

    return result;
  }

  /**
   * Bulk sync multiple suppliers to Google Calendar
   */
  static async bulkSyncSuppliersToGoogleCalendar(
    supplierSchedules: Array<{
      supplier: SupplierContactInfo;
      scheduleEvents: SupplierScheduleEvent[];
    }>,
    organizationId: string,
  ): Promise<BulkSyncResult> {
    const result: BulkSyncResult = {
      total_suppliers: supplierSchedules.length,
      successful_syncs: 0,
      failed_syncs: 0,
      total_events_synced: 0,
      total_conflicts: 0,
      supplier_results: [],
      errors: [],
    };

    // Process suppliers in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < supplierSchedules.length; i += batchSize) {
      const batch = supplierSchedules.slice(i, i + batchSize);

      const batchPromises = batch.map(async ({ supplier, scheduleEvents }) => {
        return await this.syncSupplierScheduleToGoogleCalendar(
          supplier,
          scheduleEvents,
          organizationId,
        );
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((res, index) => {
        if (res.status === 'fulfilled') {
          const syncResult = res.value;
          result.supplier_results.push(syncResult);

          if (syncResult.success) {
            result.successful_syncs++;
            result.total_events_synced += syncResult.events_synced;
            result.total_conflicts += syncResult.conflicts_found;
          } else {
            result.failed_syncs++;
            result.errors.push(...syncResult.errors);
          }
        } else {
          result.failed_syncs++;
          const supplier = batch[index].supplier;
          result.errors.push(`Supplier ${supplier.id}: ${res.reason}`);
        }
      });

      // Add delay between batches to respect rate limits
      if (i + batchSize < supplierSchedules.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return result;
  }

  /**
   * Set up Google Calendar integration for a supplier
   */
  static async setupSupplierGoogleCalendarSync(
    supplierId: string,
    organizationId: string,
    googleOAuthCode: string,
    syncSettings: Partial<SupplierCalendarSyncSettings> = {},
  ): Promise<{
    success: boolean;
    calendar_sync_id?: string;
    error?: string;
  }> {
    try {
      const supabase = await createClient();

      // Exchange OAuth code for tokens
      const tokenResponse = await this.exchangeGoogleOAuthCode(googleOAuthCode);
      if (!tokenResponse.success) {
        return { success: false, error: tokenResponse.error };
      }

      // Get user's primary calendar
      const calendarInfo = await this.getGoogleUserCalendar(
        tokenResponse.access_token!,
      );

      // Create calendar sync record
      const { data: calendarSync, error } = await supabase
        .from('supplier_calendar_syncs')
        .insert({
          supplier_id: supplierId,
          organization_id: organizationId,
          provider: 'google',
          provider_account_id: tokenResponse.user_email!,
          calendar_id: calendarInfo.id,
          calendar_name: calendarInfo.summary,
          access_token: tokenResponse.access_token,
          refresh_token: tokenResponse.refresh_token,
          expires_at: new Date(
            Date.now() + tokenResponse.expires_in! * 1000,
          ).toISOString(),
          sync_enabled: true,
          auto_sync_enabled: syncSettings.auto_sync_enabled ?? true,
          conflict_resolution: syncSettings.conflict_resolution ?? 'manual',
          sync_window_days: syncSettings.sync_window_days ?? 30,
          sync_categories: syncSettings.sync_categories ?? ['all'],
          notification_preferences: syncSettings.notification_preferences ?? {
            sync_errors: true,
            conflict_alerts: true,
            schedule_updates: true,
          },
          last_sync_at: null,
          sync_direction: 'export',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        calendar_sync_id: calendarSync.id,
      };
    } catch (error) {
      console.error('Google Calendar setup failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Convert supplier schedule event to Google Calendar format
   */
  private static async convertToGoogleCalendarEvent(
    scheduleEvent: SupplierScheduleEvent,
    supplier: SupplierContactInfo,
    organizationId: string,
  ): Promise<GoogleCalendarEvent> {
    const title = `${scheduleEvent.couple_names} - ${scheduleEvent.title}`;
    const location = scheduleEvent.venue_address || scheduleEvent.location;

    const description = [
      `Wedding: ${scheduleEvent.couple_names}`,
      `Date: ${scheduleEvent.wedding_date.toLocaleDateString()}`,
      `Role: ${scheduleEvent.supplier_role || supplier.role}`,
      scheduleEvent.description && `Description: ${scheduleEvent.description}`,
      scheduleEvent.special_instructions &&
        `Special Instructions: ${scheduleEvent.special_instructions}`,
      scheduleEvent.contact_person &&
        `Contact: ${scheduleEvent.contact_person}`,
      scheduleEvent.contact_phone && `Phone: ${scheduleEvent.contact_phone}`,
      scheduleEvent.contact_email && `Email: ${scheduleEvent.contact_email}`,
      `Status: ${scheduleEvent.status}`,
      `Priority: ${scheduleEvent.priority}`,
    ]
      .filter(Boolean)
      .join('\n');

    // Calculate reminders based on priority
    const reminders = this.getSupplierEventReminders(
      scheduleEvent.priority,
      scheduleEvent.start_time,
    );

    const googleEvent: GoogleCalendarEvent = {
      id: '', // Will be set by Google
      summary: title,
      description,
      start: scheduleEvent.setup_time
        ? {
            dateTime: scheduleEvent.setup_time.toISOString(),
            timeZone: 'UTC',
          }
        : {
            dateTime: scheduleEvent.start_time.toISOString(),
            timeZone: 'UTC',
          },
      end: scheduleEvent.breakdown_time
        ? {
            dateTime: scheduleEvent.breakdown_time.toISOString(),
            timeZone: 'UTC',
          }
        : {
            dateTime: scheduleEvent.end_time.toISOString(),
            timeZone: 'UTC',
          },
      location,
      status: scheduleEvent.status === 'cancelled' ? 'cancelled' : 'confirmed',
      transparency: 'opaque',
      visibility: 'private',
      colorId: this.WEDDING_CALENDAR_COLOR_ID,
      reminders: {
        useDefault: false,
        overrides: reminders,
      },
      source: {
        title: 'WedSync Supplier Schedule',
        url: `wedsync://supplier-schedule/${scheduleEvent.id}`,
      },
    };

    // Add planner as attendee if available
    if (scheduleEvent.planner_email) {
      googleEvent.attendees = [
        {
          email: scheduleEvent.planner_email,
          displayName: scheduleEvent.planner_name || 'Wedding Planner',
          responseStatus: 'accepted',
        },
      ];
    }

    return googleEvent;
  }

  /**
   * Get reminder settings based on priority and event timing
   */
  private static getSupplierEventReminders(
    priority: 'low' | 'medium' | 'high' | 'critical',
    eventStart: Date,
  ): Array<{ method: string; minutes: number }> {
    const daysBefore = Math.floor(
      (eventStart.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    const baseReminders = [
      { method: 'popup', minutes: 60 }, // 1 hour before
      { method: 'popup', minutes: 24 * 60 }, // 1 day before
    ];

    switch (priority) {
      case 'critical':
        return [
          ...baseReminders,
          { method: 'popup', minutes: 15 }, // 15 minutes before
          { method: 'popup', minutes: 7 * 24 * 60 }, // 1 week before
          ...(daysBefore > 7
            ? [{ method: 'popup', minutes: 3 * 24 * 60 }]
            : []), // 3 days before if far enough out
        ];

      case 'high':
        return [
          ...baseReminders,
          { method: 'popup', minutes: 30 }, // 30 minutes before
          { method: 'popup', minutes: 3 * 24 * 60 }, // 3 days before
        ];

      case 'medium':
        return baseReminders;

      case 'low':
        return [
          { method: 'popup', minutes: 24 * 60 }, // 1 day before only
        ];

      default:
        return baseReminders;
    }
  }

  /**
   * Create event in Google Calendar
   */
  private static async createGoogleCalendarEvent(
    calendarSync: SupplierCalendarSyncSettings,
    googleEvent: GoogleCalendarEvent,
  ): Promise<GoogleCalendarEvent | null> {
    try {
      const response = await fetch(
        `${this.GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarSync.calendar_id)}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${calendarSync.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(googleEvent),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `Google Calendar API error: ${response.status} - ${error}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create Google Calendar event:', error);
      throw error;
    }
  }

  /**
   * Update event in Google Calendar
   */
  private static async updateGoogleCalendarEvent(
    calendarSync: SupplierCalendarSyncSettings,
    eventId: string,
    googleEvent: GoogleCalendarEvent,
  ): Promise<GoogleCalendarEvent | null> {
    try {
      const response = await fetch(
        `${this.GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarSync.calendar_id)}/events/${eventId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${calendarSync.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(googleEvent),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `Google Calendar API error: ${response.status} - ${error}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update Google Calendar event:', error);
      throw error;
    }
  }

  /**
   * Get supplier's Google Calendar events
   */
  private static async getSupplierGoogleCalendarEvents(
    calendarSync: SupplierCalendarSyncSettings,
    organizationId: string,
    supplierId: string,
    timeMin?: Date,
    timeMax?: Date,
  ): Promise<GoogleCalendarEvent[]> {
    try {
      const params = new URLSearchParams({
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
      });

      if (timeMin) params.append('timeMin', timeMin.toISOString());
      if (timeMax) params.append('timeMax', timeMax.toISOString());

      const response = await fetch(
        `${this.GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarSync.calendar_id)}/events?${params}`,
        {
          headers: {
            Authorization: `Bearer ${calendarSync.access_token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.status}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Failed to get Google Calendar events:', error);
      throw error;
    }
  }

  /**
   * Detect conflicts between supplier schedule and their Google Calendar
   */
  private static async detectSupplierCalendarConflicts(
    calendarSync: SupplierCalendarSyncSettings,
    scheduleEvents: SupplierScheduleEvent[],
    organizationId: string,
  ): Promise<
    Array<{
      scheduleEvent: SupplierScheduleEvent;
      conflictingEvent: GoogleCalendarEvent;
      conflictType: 'overlap' | 'adjacent' | 'travel_time';
    }>
  > {
    const conflicts = [];

    try {
      // Get supplier's Google Calendar events in the relevant time range
      const timeMin = new Date(
        Math.min(...scheduleEvents.map((e) => e.start_time.getTime())),
      );
      const timeMax = new Date(
        Math.max(...scheduleEvents.map((e) => e.end_time.getTime())),
      );

      const googleEvents = await this.getSupplierGoogleCalendarEvents(
        calendarSync,
        organizationId,
        calendarSync.supplier_id!,
        timeMin,
        timeMax,
      );

      // Filter out WedSync-created events to avoid false conflicts
      const externalEvents = googleEvents.filter(
        (event) => !event.source?.url?.startsWith('wedsync://'),
      );

      // Check each schedule event for conflicts
      for (const scheduleEvent of scheduleEvents) {
        for (const googleEvent of externalEvents) {
          const conflict = this.checkEventConflict(scheduleEvent, googleEvent);
          if (conflict) {
            conflicts.push({
              scheduleEvent,
              conflictingEvent: googleEvent,
              conflictType: conflict,
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to detect calendar conflicts:', error);
    }

    return conflicts;
  }

  /**
   * Check if two events conflict
   */
  private static checkEventConflict(
    scheduleEvent: SupplierScheduleEvent,
    googleEvent: GoogleCalendarEvent,
  ): 'overlap' | 'adjacent' | 'travel_time' | null {
    const scheduleStart = scheduleEvent.setup_time || scheduleEvent.start_time;
    const scheduleEnd = scheduleEvent.breakdown_time || scheduleEvent.end_time;

    const googleStart = new Date(
      googleEvent.start.dateTime || googleEvent.start.date!,
    );
    const googleEnd = new Date(
      googleEvent.end.dateTime || googleEvent.end.date!,
    );

    // Check for direct overlap
    if (
      (scheduleStart < googleEnd && scheduleEnd > googleStart) ||
      (googleStart < scheduleEnd && googleEnd > scheduleStart)
    ) {
      return 'overlap';
    }

    // Check for adjacent events (within 30 minutes)
    const thirtyMinutes = 30 * 60 * 1000;
    if (
      Math.abs(scheduleEnd.getTime() - googleStart.getTime()) <=
        thirtyMinutes ||
      Math.abs(googleEnd.getTime() - scheduleStart.getTime()) <= thirtyMinutes
    ) {
      return 'adjacent';
    }

    // Check for travel time conflicts (within 2 hours for different locations)
    const twoHours = 2 * 60 * 60 * 1000;
    const hasDifferentLocation =
      googleEvent.location &&
      scheduleEvent.venue_address &&
      !googleEvent.location.includes(scheduleEvent.venue_address);

    if (hasDifferentLocation) {
      if (
        Math.abs(scheduleEnd.getTime() - googleStart.getTime()) <= twoHours ||
        Math.abs(googleEnd.getTime() - scheduleStart.getTime()) <= twoHours
      ) {
        return 'travel_time';
      }
    }

    return null;
  }

  /**
   * Handle calendar conflicts based on sync settings
   */
  private static async handleSupplierCalendarConflicts(
    conflicts: Array<{
      scheduleEvent: SupplierScheduleEvent;
      conflictingEvent: GoogleCalendarEvent;
      conflictType: 'overlap' | 'adjacent' | 'travel_time';
    }>,
    calendarSync: SupplierCalendarSyncSettings,
    organizationId: string,
  ): Promise<void> {
    const supabase = await createClient();

    for (const conflict of conflicts) {
      // Log the conflict
      await supabase.from('supplier_calendar_conflicts').insert({
        supplier_id: calendarSync.supplier_id,
        organization_id: organizationId,
        schedule_event_id: conflict.scheduleEvent.id,
        google_event_id: conflict.conflictingEvent.id,
        conflict_type: conflict.conflictType,
        conflict_details: {
          schedule_event: {
            title: conflict.scheduleEvent.title,
            start_time: conflict.scheduleEvent.start_time.toISOString(),
            end_time: conflict.scheduleEvent.end_time.toISOString(),
          },
          google_event: {
            summary: conflict.conflictingEvent.summary,
            start: conflict.conflictingEvent.start,
            end: conflict.conflictingEvent.end,
          },
        },
        resolution_status: 'pending',
        created_at: new Date().toISOString(),
      });

      // Handle based on conflict resolution setting
      switch (calendarSync.conflict_resolution) {
        case 'auto_reschedule':
          await this.attemptAutoReschedule(conflict, organizationId);
          break;

        case 'notify_only':
          await this.notifyConflict(conflict, calendarSync, organizationId);
          break;

        case 'manual':
        default:
          // Just log for manual resolution
          console.log(
            `Manual conflict resolution required for supplier ${calendarSync.supplier_id}`,
          );
          break;
      }
    }
  }

  /**
   * Exchange Google OAuth code for tokens
   */
  private static async exchangeGoogleOAuthCode(code: string): Promise<{
    success: boolean;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    user_email?: string;
    error?: string;
  }> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
          client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
          redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI!,
        }),
      });

      if (!response.ok) {
        return { success: false, error: 'Failed to exchange OAuth code' };
      }

      const tokens = await response.json();

      // Get user info
      const userResponse = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        },
      );

      const userInfo = userResponse.ok ? await userResponse.json() : null;

      return {
        success: true,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        user_email: userInfo?.email,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get Google user's primary calendar
   */
  private static async getGoogleUserCalendar(accessToken: string): Promise<{
    id: string;
    summary: string;
  }> {
    const response = await fetch(
      `${this.GOOGLE_CALENDAR_API_BASE}/users/me/calendarList/primary`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to get user calendar');
    }

    return await response.json();
  }

  /**
   * Refresh Google token if needed
   */
  private static async refreshGoogleTokenIfNeeded(
    calendarSync: SupplierCalendarSyncSettings,
  ): Promise<void> {
    if (
      !calendarSync.expires_at ||
      new Date(calendarSync.expires_at) > new Date()
    ) {
      return; // Token still valid
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: calendarSync.refresh_token!,
          client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
          client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
        }),
      });

      if (response.ok) {
        const tokens = await response.json();

        const supabase = await createClient();
        await supabase
          .from('supplier_calendar_syncs')
          .update({
            access_token: tokens.access_token,
            expires_at: new Date(
              Date.now() + tokens.expires_in * 1000,
            ).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('supplier_id', calendarSync.supplier_id)
          .eq('organization_id', calendarSync.organization_id)
          .eq('provider', 'google');

        // Update the sync object
        calendarSync.access_token = tokens.access_token;
        calendarSync.expires_at = new Date(
          Date.now() + tokens.expires_in * 1000,
        ).toISOString();
      }
    } catch (error) {
      console.error('Failed to refresh Google token:', error);
      throw error;
    }
  }

  /**
   * Update supplier schedule event with Google Calendar ID
   */
  private static async updateSupplierScheduleWithGoogleId(
    scheduleEventId: string,
    googleEventId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase
        .from('supplier_schedule_events')
        .update({
          google_calendar_id: googleEventId,
          calendar_synced: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', scheduleEventId)
        .eq('organization_id', organizationId);
    } catch (error) {
      console.error('Failed to update schedule with Google ID:', error);
    }
  }

  /**
   * Log supplier sync result
   */
  private static async logSupplierSyncResult(
    result: SupplierSyncResult,
    organizationId: string,
  ): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase.from('supplier_calendar_sync_log').insert({
        supplier_id: result.supplier_id,
        organization_id: organizationId,
        provider: 'google',
        sync_result: result.success ? 'success' : 'failure',
        events_synced: result.events_synced,
        conflicts_found: result.conflicts_found,
        sync_duration_ms: result.sync_duration_ms,
        errors: result.errors,
        synced_at: result.last_sync_time,
      });
    } catch (error) {
      console.error('Failed to log sync result:', error);
    }
  }

  /**
   * Attempt automatic rescheduling for conflicts
   */
  private static async attemptAutoReschedule(
    conflict: any,
    organizationId: string,
  ): Promise<void> {
    // Implementation for automatic rescheduling would go here
    // This is a complex feature that would analyze available time slots
    // and suggest alternative times for the wedding schedule event
    console.log('Auto-rescheduling not implemented yet');
  }

  /**
   * Notify about calendar conflict
   */
  private static async notifyConflict(
    conflict: any,
    calendarSync: SupplierCalendarSyncSettings,
    organizationId: string,
  ): Promise<void> {
    // Implementation for conflict notifications would go here
    // This would send emails or push notifications about the conflict
    console.log('Conflict notification not implemented yet');
  }

  /**
   * Get supplier calendar sync status
   */
  static async getSupplierCalendarSyncStatus(
    supplierId: string,
    organizationId: string,
  ): Promise<{
    is_connected: boolean;
    provider: string;
    last_sync_at: string | null;
    sync_enabled: boolean;
    events_synced: number;
    conflicts_pending: number;
    error_count: number;
  } | null> {
    try {
      const supabase = await createClient();

      const { data: syncData } = await supabase
        .from('supplier_calendar_syncs')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('organization_id', organizationId)
        .eq('provider', 'google')
        .single();

      if (!syncData) return null;

      // Get sync statistics
      const { data: syncStats } = await supabase
        .from('supplier_calendar_sync_log')
        .select('events_synced, conflicts_found, errors')
        .eq('supplier_id', supplierId)
        .eq('organization_id', organizationId)
        .eq('provider', 'google')
        .order('synced_at', { ascending: false })
        .limit(1)
        .single();

      const { count: conflictsCount } = await supabase
        .from('supplier_calendar_conflicts')
        .select('*', { count: 'exact' })
        .eq('supplier_id', supplierId)
        .eq('organization_id', organizationId)
        .eq('resolution_status', 'pending');

      return {
        is_connected: true,
        provider: 'google',
        last_sync_at: syncData.last_sync_at,
        sync_enabled: syncData.sync_enabled,
        events_synced: syncStats?.events_synced || 0,
        conflicts_pending: conflictsCount || 0,
        error_count: syncStats?.errors?.length || 0,
      };
    } catch (error) {
      console.error('Failed to get calendar sync status:', error);
      return null;
    }
  }
}
