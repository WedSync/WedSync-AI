/**
 * WS-158: External Calendar and Platform Integration for Task Categories
 * Handles integration with Google Calendar, Outlook, Apple Calendar, and other platforms
 */

import { TaskCategory, WorkflowTask } from '@/types/workflow';
import { createClient } from '@/lib/supabase/client';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  category?: string;
  color?: string;
  attendees?: string[];
  location?: string;
  recurrence?: string;
  reminders?: CalendarReminder[];
}

export interface CalendarReminder {
  method: 'email' | 'popup' | 'sms';
  minutesBefore: number;
}

export interface CalendarProvider {
  name: 'google' | 'outlook' | 'apple' | 'ical';
  authToken?: string;
  refreshToken?: string;
  calendarId?: string;
  syncEnabled: boolean;
  lastSync?: Date;
}

export interface IntegrationConfig {
  organizationId: string;
  userId: string;
  providers: CalendarProvider[];
  syncInterval?: number; // minutes
  autoSync?: boolean;
  categoryMapping?: Map<string, string>; // Map category IDs to calendar names
}

export interface SyncResult {
  provider: string;
  success: boolean;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  errors: string[];
  timestamp: Date;
}

export class CategoryIntegrationService {
  private config: IntegrationConfig;
  private supabase = createClient();
  private syncQueue: Map<string, CalendarEvent> = new Map();
  private syncInProgress = false;
  private syncInterval?: NodeJS.Timeout;
  private providerClients: Map<string, any> = new Map();

  constructor(config: IntegrationConfig) {
    this.config = config;
    this.initializeProviders();

    if (config.autoSync && config.syncInterval) {
      this.startAutoSync();
    }
  }

  /**
   * Initialize calendar provider clients
   */
  private async initializeProviders(): Promise<void> {
    for (const provider of this.config.providers) {
      if (!provider.syncEnabled) continue;

      switch (provider.name) {
        case 'google':
          await this.initializeGoogleCalendar(provider);
          break;
        case 'outlook':
          await this.initializeOutlookCalendar(provider);
          break;
        case 'apple':
          await this.initializeAppleCalendar(provider);
          break;
        case 'ical':
          await this.initializeICalendar(provider);
          break;
      }
    }
  }

  /**
   * Initialize Google Calendar integration
   */
  private async initializeGoogleCalendar(
    provider: CalendarProvider,
  ): Promise<void> {
    try {
      // In production, use proper Google Calendar API client
      // For now, we'll create a mock client structure
      const googleClient = {
        calendar: {
          events: {
            insert: async (params: any) => this.mockGoogleInsert(params),
            update: async (params: any) => this.mockGoogleUpdate(params),
            delete: async (params: any) => this.mockGoogleDelete(params),
            list: async (params: any) => this.mockGoogleList(params),
            watch: async (params: any) => this.mockGoogleWatch(params),
          },
          calendars: {
            get: async (params: any) => this.mockGoogleCalendarGet(params),
          },
        },
      };

      this.providerClients.set('google', googleClient);

      // Set up webhook for real-time sync
      await this.setupGoogleWebhook(provider);
    } catch (error) {
      console.error('Failed to initialize Google Calendar:', error);
      throw error;
    }
  }

  /**
   * Initialize Outlook Calendar integration
   */
  private async initializeOutlookCalendar(
    provider: CalendarProvider,
  ): Promise<void> {
    // Microsoft Graph API client initialization
    const outlookClient = {
      api: async (endpoint: string, options?: any) => {
        // Mock implementation
        return this.mockOutlookAPI(endpoint, options);
      },
    };

    this.providerClients.set('outlook', outlookClient);
    await this.setupOutlookWebhook(provider);
  }

  /**
   * Initialize Apple Calendar integration
   */
  private async initializeAppleCalendar(
    provider: CalendarProvider,
  ): Promise<void> {
    // Apple EventKit or CalDAV integration
    const appleClient = {
      caldav: {
        createEvent: async (event: any) => this.mockAppleCreate(event),
        updateEvent: async (event: any) => this.mockAppleUpdate(event),
        deleteEvent: async (eventId: string) => this.mockAppleDelete(eventId),
      },
    };

    this.providerClients.set('apple', appleClient);
  }

  /**
   * Initialize iCalendar integration
   */
  private async initializeICalendar(provider: CalendarProvider): Promise<void> {
    // iCal feed generation for read-only calendar sharing
    const icalClient = {
      generateFeed: async () => this.generateICalFeed(),
      parseFeed: async (feed: string) => this.parseICalFeed(feed),
    };

    this.providerClients.set('ical', icalClient);
  }

  /**
   * Sync task categories with external calendars
   */
  async syncCategoriesWithCalendars(
    categories: TaskCategory[],
  ): Promise<SyncResult[]> {
    if (this.syncInProgress) {
      console.warn('Sync already in progress');
      return [];
    }

    this.syncInProgress = true;
    const results: SyncResult[] = [];

    try {
      for (const provider of this.config.providers) {
        if (!provider.syncEnabled) continue;

        const result = await this.syncWithProvider(provider, categories);
        results.push(result);
      }

      // Update last sync timestamps
      await this.updateSyncTimestamps(results);

      return results;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync with specific calendar provider
   */
  private async syncWithProvider(
    provider: CalendarProvider,
    categories: TaskCategory[],
  ): Promise<SyncResult> {
    const result: SyncResult = {
      provider: provider.name,
      success: false,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      errors: [],
      timestamp: new Date(),
    };

    try {
      // Fetch tasks for each category
      const tasksbyCategory = await this.fetchTasksByCategories(categories);

      // Convert to calendar events
      const events = this.convertTasksToEvents(tasksbyCategory, categories);

      // Sync events with provider
      switch (provider.name) {
        case 'google':
          await this.syncWithGoogle(events, result);
          break;
        case 'outlook':
          await this.syncWithOutlook(events, result);
          break;
        case 'apple':
          await this.syncWithApple(events, result);
          break;
        case 'ical':
          await this.generateICalendarFeed(events);
          break;
      }

      result.success = result.errors.length === 0;
    } catch (error) {
      result.errors.push(error?.toString() || 'Unknown sync error');
    }

    return result;
  }

  /**
   * Fetch tasks grouped by categories
   */
  private async fetchTasksByCategories(
    categories: TaskCategory[],
  ): Promise<Map<string, WorkflowTask[]>> {
    const tasksByCategory = new Map<string, WorkflowTask[]>();

    for (const category of categories) {
      const { data: tasks, error } = await this.supabase
        .from('workflow_tasks')
        .select('*')
        .eq('category_id', category.id)
        .eq('organization_id', this.config.organizationId)
        .not('status', 'eq', 'cancelled');

      if (!error && tasks) {
        tasksByCategory.set(category.id, tasks);
      }
    }

    return tasksByCategory;
  }

  /**
   * Convert tasks to calendar events
   */
  private convertTasksToEvents(
    tasksByCategory: Map<string, WorkflowTask[]>,
    categories: TaskCategory[],
  ): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    for (const [categoryId, tasks] of tasksByCategory) {
      const category = categoryMap.get(categoryId);
      if (!category) continue;

      for (const task of tasks) {
        if (!task.due_date) continue; // Skip tasks without due dates

        const event: CalendarEvent = {
          id: `task-${task.id}`,
          title: `[${category.name}] ${task.title}`,
          description: this.formatEventDescription(task, category),
          start: new Date(task.due_date),
          end: this.calculateEndTime(task),
          category: category.name,
          color: category.color,
          attendees: task.assigned_to_email ? [task.assigned_to_email] : [],
          location: task.client_id ? `Client: ${task.client_id}` : undefined,
          reminders: this.generateReminders(task.priority),
        };

        events.push(event);
      }
    }

    return events;
  }

  /**
   * Format event description with task details
   */
  private formatEventDescription(
    task: WorkflowTask,
    category: TaskCategory,
  ): string {
    const parts = [
      task.description || '',
      `Priority: ${task.priority}`,
      `Status: ${task.status}`,
      `Category: ${category.name}`,
    ];

    if (task.tags?.length) {
      parts.push(`Tags: ${task.tags.join(', ')}`);
    }

    if (task.estimated_duration) {
      parts.push(`Estimated Duration: ${task.estimated_duration} minutes`);
    }

    return parts.filter((p) => p).join('\n');
  }

  /**
   * Calculate event end time based on task duration
   */
  private calculateEndTime(task: WorkflowTask): Date {
    const start = new Date(task.due_date!);
    const duration = task.estimated_duration || 60; // Default 1 hour
    return new Date(start.getTime() + duration * 60000);
  }

  /**
   * Generate reminders based on task priority
   */
  private generateReminders(
    priority: WorkflowTask['priority'],
  ): CalendarReminder[] {
    const reminders: CalendarReminder[] = [];

    switch (priority) {
      case 'urgent':
        reminders.push(
          { method: 'popup', minutesBefore: 15 },
          { method: 'email', minutesBefore: 60 },
          { method: 'email', minutesBefore: 1440 }, // 1 day
        );
        break;
      case 'high':
        reminders.push(
          { method: 'popup', minutesBefore: 30 },
          { method: 'email', minutesBefore: 1440 },
        );
        break;
      case 'medium':
        reminders.push({ method: 'popup', minutesBefore: 60 });
        break;
      case 'low':
        reminders.push({ method: 'email', minutesBefore: 1440 });
        break;
    }

    return reminders;
  }

  /**
   * Sync events with Google Calendar
   */
  private async syncWithGoogle(
    events: CalendarEvent[],
    result: SyncResult,
  ): Promise<void> {
    const client = this.providerClients.get('google');
    if (!client) return;

    // Fetch existing events
    const existingEvents = await client.calendar.events.list({
      calendarId:
        this.config.providers.find((p) => p.name === 'google')?.calendarId ||
        'primary',
      q: '[WedSync]', // Search for our events
      showDeleted: false,
      maxResults: 2500,
    });

    const existingMap = new Map(
      existingEvents.items?.map((e: any) => [
        e.extendedProperties?.private?.taskId,
        e,
      ]) || [],
    );

    // Process each event
    for (const event of events) {
      try {
        const existing = existingMap.get(event.id);

        if (existing) {
          // Update existing event
          await client.calendar.events.update({
            calendarId: 'primary',
            eventId: existing.id,
            resource: this.convertToGoogleEvent(event),
          });
          result.eventsUpdated++;
        } else {
          // Create new event
          await client.calendar.events.insert({
            calendarId: 'primary',
            resource: this.convertToGoogleEvent(event),
          });
          result.eventsCreated++;
        }

        existingMap.delete(event.id);
      } catch (error) {
        result.errors.push(`Failed to sync event ${event.id}: ${error}`);
      }
    }

    // Delete removed events
    for (const [taskId, googleEvent] of existingMap) {
      try {
        await client.calendar.events.delete({
          calendarId: 'primary',
          eventId: googleEvent.id,
        });
        result.eventsDeleted++;
      } catch (error) {
        result.errors.push(`Failed to delete event ${taskId}: ${error}`);
      }
    }
  }

  /**
   * Convert to Google Calendar event format
   */
  private convertToGoogleEvent(event: CalendarEvent): any {
    return {
      summary: event.title,
      description: event.description,
      start: {
        dateTime: event.start.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: event.end.toISOString(),
        timeZone: 'UTC',
      },
      attendees: event.attendees?.map((email) => ({ email })),
      location: event.location,
      colorId: this.mapColorToGoogleColorId(event.color),
      reminders: {
        useDefault: false,
        overrides: event.reminders,
      },
      extendedProperties: {
        private: {
          taskId: event.id,
          category: event.category,
        },
      },
    };
  }

  /**
   * Map hex color to Google Calendar color ID
   */
  private mapColorToGoogleColorId(hexColor?: string): string {
    const colorMap: { [key: string]: string } = {
      '#3B82F6': '7', // Blue
      '#10B981': '2', // Green
      '#8B5CF6': '3', // Purple
      '#F59E0B': '5', // Yellow
      '#EF4444': '11', // Red
      '#06B6D4': '9', // Cyan
      '#EC4899': '4', // Pink
      '#84CC16': '10', // Lime
      '#6366F1': '1', // Indigo
    };

    return colorMap[hexColor || ''] || '9'; // Default to blue
  }

  /**
   * Sync with Outlook Calendar
   */
  private async syncWithOutlook(
    events: CalendarEvent[],
    result: SyncResult,
  ): Promise<void> {
    const client = this.providerClients.get('outlook');
    if (!client) return;

    try {
      // Use Microsoft Graph API
      const existingEvents = await client
        .api('/me/events')
        .filter("contains(subject, '[WedSync]')")
        .get();

      // Similar sync logic as Google
      // ... implementation details
    } catch (error) {
      result.errors.push(`Outlook sync failed: ${error}`);
    }
  }

  /**
   * Sync with Apple Calendar
   */
  private async syncWithApple(
    events: CalendarEvent[],
    result: SyncResult,
  ): Promise<void> {
    const client = this.providerClients.get('apple');
    if (!client) return;

    try {
      // Use CalDAV protocol or EventKit
      for (const event of events) {
        await client.caldav.createEvent({
          uid: event.id,
          summary: event.title,
          description: event.description,
          dtstart: event.start,
          dtend: event.end,
          categories: [event.category || ''],
        });
        result.eventsCreated++;
      }
    } catch (error) {
      result.errors.push(`Apple Calendar sync failed: ${error}`);
    }
  }

  /**
   * Generate iCalendar feed
   */
  private async generateICalendarFeed(
    events: CalendarEvent[],
  ): Promise<string> {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//WedSync//Task Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    for (const event of events) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${event.id}@wedsync.com`,
        `DTSTAMP:${this.formatICalDate(new Date())}`,
        `DTSTART:${this.formatICalDate(event.start)}`,
        `DTEND:${this.formatICalDate(event.end)}`,
        `SUMMARY:${this.escapeICalText(event.title)}`,
        `DESCRIPTION:${this.escapeICalText(event.description || '')}`,
        `CATEGORIES:${event.category}`,
        `STATUS:CONFIRMED`,
        'END:VEVENT',
      );
    }

    lines.push('END:VCALENDAR');

    const feed = lines.join('\r\n');

    // Store feed for subscription access
    await this.storeFeedForSubscription(feed);

    return feed;
  }

  /**
   * Format date for iCalendar
   */
  private formatICalDate(date: Date): string {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  }

  /**
   * Escape text for iCalendar format
   */
  private escapeICalText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  /**
   * Store iCal feed for subscription
   */
  private async storeFeedForSubscription(feed: string): Promise<void> {
    // Store in Supabase storage or cache
    const { error } = await this.supabase.storage
      .from('calendar-feeds')
      .upload(
        `${this.config.organizationId}/tasks.ics`,
        new Blob([feed], { type: 'text/calendar' }),
        { upsert: true },
      );

    if (error) {
      console.error('Failed to store calendar feed:', error);
    }
  }

  /**
   * Set up Google Calendar webhook
   */
  private async setupGoogleWebhook(provider: CalendarProvider): Promise<void> {
    const client = this.providerClients.get('google');
    if (!client) return;

    try {
      await client.calendar.events.watch({
        calendarId: provider.calendarId || 'primary',
        requestBody: {
          id: crypto.randomUUID(),
          type: 'web_hook',
          address: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/google-calendar`,
          expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).getTime(), // 7 days
        },
      });
    } catch (error) {
      console.error('Failed to set up Google webhook:', error);
    }
  }

  /**
   * Set up Outlook webhook
   */
  private async setupOutlookWebhook(provider: CalendarProvider): Promise<void> {
    const client = this.providerClients.get('outlook');
    if (!client) return;

    try {
      await client.api('/subscriptions').post({
        changeType: 'created,updated,deleted',
        notificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/outlook-calendar`,
        resource: '/me/events',
        expirationDateTime: new Date(
          Date.now() + 3 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });
    } catch (error) {
      console.error('Failed to set up Outlook webhook:', error);
    }
  }

  /**
   * Handle incoming webhook from calendar provider
   */
  async handleCalendarWebhook(provider: string, payload: any): Promise<void> {
    // Process webhook notification
    // Sync changes back to task categories

    switch (provider) {
      case 'google':
        await this.processGoogleWebhook(payload);
        break;
      case 'outlook':
        await this.processOutlookWebhook(payload);
        break;
    }
  }

  /**
   * Process Google Calendar webhook
   */
  private async processGoogleWebhook(payload: any): Promise<void> {
    // Extract changed events
    // Update corresponding tasks
  }

  /**
   * Process Outlook webhook
   */
  private async processOutlookWebhook(payload: any): Promise<void> {
    // Extract changed events
    // Update corresponding tasks
  }

  /**
   * Update sync timestamps
   */
  private async updateSyncTimestamps(results: SyncResult[]): Promise<void> {
    for (const result of results) {
      if (result.success) {
        const provider = this.config.providers.find(
          (p) => p.name === result.provider,
        );
        if (provider) {
          provider.lastSync = result.timestamp;
        }
      }
    }
  }

  /**
   * Start automatic synchronization
   */
  private startAutoSync(): void {
    if (!this.config.syncInterval) return;

    this.syncInterval = setInterval(async () => {
      const { data: categories } = await this.supabase
        .from('task_categories')
        .select('*')
        .eq('organization_id', this.config.organizationId);

      if (categories) {
        await this.syncCategoriesWithCalendars(categories);
      }
    }, this.config.syncInterval * 60000);
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
  }

  /**
   * Mock implementations for development
   */
  private async mockGoogleInsert(params: any): Promise<any> {
    return { id: crypto.randomUUID(), ...params.resource };
  }

  private async mockGoogleUpdate(params: any): Promise<any> {
    return { id: params.eventId, ...params.resource };
  }

  private async mockGoogleDelete(params: any): Promise<void> {
    // Mock delete
  }

  private async mockGoogleList(params: any): Promise<any> {
    return { items: [] };
  }

  private async mockGoogleWatch(params: any): Promise<any> {
    return { resourceId: crypto.randomUUID() };
  }

  private async mockGoogleCalendarGet(params: any): Promise<any> {
    return { id: 'primary', summary: 'Primary Calendar' };
  }

  private async mockOutlookAPI(endpoint: string, options?: any): Promise<any> {
    return { value: [] };
  }

  private async mockAppleCreate(event: any): Promise<any> {
    return { id: crypto.randomUUID(), ...event };
  }

  private async mockAppleUpdate(event: any): Promise<any> {
    return event;
  }

  private async mockAppleDelete(eventId: string): Promise<void> {
    // Mock delete
  }

  private async generateICalFeed(): Promise<string> {
    return 'BEGIN:VCALENDAR\r\nEND:VCALENDAR';
  }

  private async parseICalFeed(feed: string): Promise<any[]> {
    return [];
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.stopAutoSync();
    this.syncQueue.clear();
    this.providerClients.clear();
  }
}

// Export singleton factory
let integrationServiceInstance: CategoryIntegrationService | null = null;

export function getCategoryIntegrationService(
  config: IntegrationConfig,
): CategoryIntegrationService {
  if (!integrationServiceInstance) {
    integrationServiceInstance = new CategoryIntegrationService(config);
  }
  return integrationServiceInstance;
}
