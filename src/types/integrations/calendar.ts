/**
 * Calendar Integration Types
 * Types for calendar adapters and sync engines
 */

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  attendees?: string[];
  isAllDay?: boolean;
  recurrence?: CalendarRecurrence;
}

export interface CalendarRecurrence {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  until?: Date;
  count?: number;
}

export interface CalendarAdapter {
  name: string;
  connect(credentials: any): Promise<boolean>;
  disconnect(): Promise<void>;
  getEvents(start: Date, end: Date): Promise<CalendarEvent[]>;
  createEvent(event: CalendarEvent): Promise<string>;
  updateEvent(id: string, event: CalendarEvent): Promise<boolean>;
  deleteEvent(id: string): Promise<boolean>;
}

export interface CalendarCredentials {
  type: 'google' | 'outlook' | 'apple' | 'icloud';
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
}

export interface CalendarSyncResult {
  success: boolean;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  errors: string[];
}
