# WS-024: Calendar Integration - Technical Specification

## User Story

**As a wedding DJ**, I need to sync my calendar with multiple platforms (Google, Outlook, Apple) so I can manage my availability, prevent double bookings, and automatically create events when clients book my services.

**Real Wedding Scenario**: Mike, a wedding DJ, has his main calendar in Google Calendar but also uses Outlook for business. When Sarah books him for her June wedding through WedSync, the system automatically creates the event in both calendars, blocks the time, sets up reminders, and adds the venue address. When Mike later gets a request for the same date, WedSync shows he's unavailable, preventing double booking.

## Database Schema

```sql
-- Calendar provider configurations
CREATE TABLE calendar_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'google', 'outlook', 'apple', 'ical'
  provider_account_id VARCHAR(100), -- External account identifier
  calendar_id VARCHAR(100), -- Specific calendar within account
  calendar_name VARCHAR(100),
  is_primary BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sync_direction VARCHAR(20) DEFAULT 'bidirectional', -- 'read', 'write', 'bidirectional'
  refresh_token_encrypted TEXT,
  access_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  sync_status VARCHAR(20) DEFAULT 'active', -- 'active', 'error', 'expired'
  sync_errors JSONB DEFAULT '[]',
  configuration JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, provider, calendar_id)
);

-- Working hours and availability rules
CREATE TABLE availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  rule_type VARCHAR(20) NOT NULL, -- 'working_hours', 'buffer_time', 'blocked_dates', 'recurring_block'
  day_of_week INTEGER, -- 0=Sunday, 1=Monday, etc. NULL for date-specific rules
  start_time TIME,
  end_time TIME,
  start_date DATE,
  end_date DATE,
  duration_minutes INTEGER, -- For buffer times
  is_available BOOLEAN DEFAULT TRUE,
  description TEXT,
  recurrence_pattern JSONB, -- For recurring rules
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar events (cached from external calendars)
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  calendar_config_id UUID REFERENCES calendar_configs(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  external_event_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN DEFAULT FALSE,
  location TEXT,
  status VARCHAR(20) DEFAULT 'confirmed', -- 'confirmed', 'tentative', 'cancelled'
  visibility VARCHAR(20) DEFAULT 'private', -- 'private', 'public', 'busy_only'
  attendees JSONB DEFAULT '[]',
  is_wedsync_created BOOLEAN DEFAULT FALSE,
  wedsync_booking_id UUID, -- Link to internal booking if applicable
  recurrence_rule TEXT, -- RFC 5545 RRULE
  original_start_time TIMESTAMPTZ, -- For recurring event instances
  last_modified TIMESTAMPTZ,
  etag VARCHAR(100), -- For change tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(calendar_config_id, external_event_id)
);

-- Calendar sync history and conflicts
CREATE TABLE calendar_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  calendar_config_id UUID REFERENCES calendar_configs(id) ON DELETE CASCADE,
  sync_type VARCHAR(20) NOT NULL, -- 'full', 'incremental', 'push', 'pull'
  sync_direction VARCHAR(10) NOT NULL, -- 'inbound', 'outbound', 'both'
  events_processed INTEGER DEFAULT 0,
  events_created INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  events_deleted INTEGER DEFAULT 0,
  conflicts_detected INTEGER DEFAULT 0,
  sync_duration_ms INTEGER,
  status VARCHAR(20) DEFAULT 'success', -- 'success', 'partial', 'failed'
  error_details JSONB,
  sync_token VARCHAR(255), -- For incremental sync
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  INDEX idx_sync_log_supplier_date (supplier_id, started_at),
  INDEX idx_sync_log_calendar_status (calendar_config_id, status)
);

-- Conflict resolution rules
CREATE TABLE calendar_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  conflict_type VARCHAR(30) NOT NULL, -- 'double_booking', 'working_hours', 'buffer_violation'
  source_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  conflicting_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  conflict_time_start TIMESTAMPTZ NOT NULL,
  conflict_time_end TIMESTAMPTZ NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  resolution_status VARCHAR(20) DEFAULT 'unresolved', -- 'unresolved', 'resolved', 'ignored'
  resolution_action VARCHAR(50), -- 'moved_event', 'cancelled_event', 'adjusted_buffer', 'manual_override'
  resolved_by VARCHAR(20), -- 'auto', 'manual'
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public booking calendar settings
CREATE TABLE public_booking_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  calendar_name VARCHAR(100) NOT NULL,
  calendar_slug VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  advance_booking_days INTEGER DEFAULT 365,
  booking_window_start INTEGER DEFAULT 1, -- Days in advance minimum
  booking_window_end INTEGER DEFAULT 365, -- Days in advance maximum
  meeting_types JSONB DEFAULT '[]',
  custom_fields JSONB DEFAULT '[]',
  branding_config JSONB DEFAULT '{}',
  notification_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, calendar_slug),
  UNIQUE(calendar_slug)
);

-- Indexes for performance
CREATE INDEX idx_calendar_events_supplier_time ON calendar_events(supplier_id, start_time, end_time);
CREATE INDEX idx_calendar_events_external_id ON calendar_events(external_event_id);
CREATE INDEX idx_availability_rules_supplier_active ON availability_rules(supplier_id, is_active);
CREATE INDEX idx_availability_rules_day_time ON availability_rules(day_of_week, start_time, end_time) WHERE is_active = TRUE;
CREATE INDEX idx_calendar_conflicts_unresolved ON calendar_conflicts(supplier_id, resolution_status) WHERE resolution_status = 'unresolved';
```

## API Endpoints

```typescript
// Calendar integration data types
interface CalendarConfig {
  id: string;
  supplierId: string;
  provider: 'google' | 'outlook' | 'apple' | 'ical';
  providerAccountId?: string;
  calendarId: string;
  calendarName: string;
  isPrimary: boolean;
  isActive: boolean;
  syncDirection: 'read' | 'write' | 'bidirectional';
  lastSyncAt?: string;
  syncStatus: 'active' | 'error' | 'expired';
  syncErrors: string[];
  configuration: CalendarConfiguration;
  updatedAt: string;
}

interface CalendarConfiguration {
  syncInterval: number; // minutes
  includeAttendees: boolean;
  includePrivateEvents: boolean;
  autoCreateWedSyncEvents: boolean;
  conflictResolution: 'manual' | 'auto_primary' | 'auto_newest';
  eventPrefix?: string;
  colorMapping?: Record<string, string>;
}

interface AvailabilityRule {
  id: string;
  supplierId: string;
  ruleType: 'working_hours' | 'buffer_time' | 'blocked_dates' | 'recurring_block';
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  startDate?: string;
  endDate?: string;
  durationMinutes?: number;
  isAvailable: boolean;
  description?: string;
  recurrencePattern?: RecurrencePattern;
  isActive: boolean;
}

interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  weekOfMonth?: number;
  monthOfYear?: number;
  endDate?: string;
  occurrences?: number;
}

interface CalendarEvent {
  id: string;
  supplierId: string;
  calendarConfigId: string;
  clientId?: string;
  externalEventId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  location?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility: 'private' | 'public' | 'busy_only';
  attendees: EventAttendee[];
  isWedSyncCreated: boolean;
  wedSyncBookingId?: string;
  recurrenceRule?: string;
  lastModified?: string;
}

interface EventAttendee {
  email: string;
  name?: string;
  status: 'accepted' | 'declined' | 'tentative' | 'needs_action';
  isOrganizer?: boolean;
}

interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  conflicts?: string[];
  bufferBefore?: number;
  bufferAfter?: number;
}

interface CalendarConflict {
  id: string;
  conflictType: 'double_booking' | 'working_hours' | 'buffer_violation';
  sourceEvent: CalendarEvent;
  conflictingEvent: CalendarEvent;
  conflictTimeStart: string;
  conflictTimeEnd: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolutionStatus: 'unresolved' | 'resolved' | 'ignored';
  resolutionAction?: string;
  notes?: string;
}

// API Routes
// POST /api/calendar/connect
interface ConnectCalendarRequest {
  provider: string;
  authCode?: string; // For OAuth flow
  calendarId?: string;
  calendarName?: string;
  configuration: CalendarConfiguration;
}

interface ConnectCalendarResponse {
  success: boolean;
  data: CalendarConfig;
  authUrl?: string; // If OAuth redirect needed
}

// GET /api/calendar/configs
interface GetCalendarConfigsResponse {
  success: boolean;
  data: CalendarConfig[];
}

// POST /api/calendar/sync/:configId
interface SyncCalendarRequest {
  syncType: 'full' | 'incremental';
  dateRange?: {
    start: string;
    end: string;
  };
}

interface SyncCalendarResponse {
  success: boolean;
  data: {
    eventsProcessed: number;
    eventsCreated: number;
    eventsUpdated: number;
    eventsDeleted: number;
    conflictsDetected: number;
    syncDuration: number;
  };
}

// GET /api/calendar/availability
interface GetAvailabilityRequest {
  startDate: string;
  endDate: string;
  duration?: number; // minutes
  bufferTime?: number; // minutes
  workingHoursOnly?: boolean;
}

interface GetAvailabilityResponse {
  success: boolean;
  data: {
    availableSlots: AvailabilitySlot[];
    busyTimes: {
      startTime: string;
      endTime: string;
      reason: string;
    }[];
    conflicts: CalendarConflict[];
  };
}

// POST /api/calendar/events
interface CreateCalendarEventRequest {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: EventAttendee[];
  clientId?: string;
  calendarConfigId?: string; // If not specified, uses primary
  sendNotifications?: boolean;
}

interface CreateCalendarEventResponse {
  success: boolean;
  data: CalendarEvent;
}

// PUT /api/calendar/events/:eventId
interface UpdateCalendarEventRequest {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  status?: string;
  sendNotifications?: boolean;
}

interface UpdateCalendarEventResponse {
  success: boolean;
  data: CalendarEvent;
}

// POST /api/calendar/availability-rules
interface CreateAvailabilityRuleRequest {
  ruleType: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  startDate?: string;
  endDate?: string;
  durationMinutes?: number;
  isAvailable: boolean;
  description?: string;
  recurrencePattern?: RecurrencePattern;
}

interface CreateAvailabilityRuleResponse {
  success: boolean;
  data: AvailabilityRule;
}

// GET /api/calendar/conflicts
interface GetCalendarConflictsResponse {
  success: boolean;
  data: CalendarConflict[];
}

// POST /api/calendar/conflicts/:conflictId/resolve
interface ResolveConflictRequest {
  action: 'move_event' | 'cancel_event' | 'adjust_buffer' | 'ignore';
  newStartTime?: string;
  newEndTime?: string;
  notes?: string;
}

interface ResolveConflictResponse {
  success: boolean;
  data: CalendarConflict;
}
```

## Frontend Components

```typescript
// CalendarIntegrationDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CalendarIntegrationDashboardProps {
  supplierId: string;
}

export const CalendarIntegrationDashboard: React.FC<CalendarIntegrationDashboardProps> = ({
  supplierId
}) => {
  const [configs, setConfigs] = useState<CalendarConfig[]>([]);
  const [conflicts, setConflicts] = useState<CalendarConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    loadCalendarConfigs();
    loadConflicts();
  }, [supplierId]);

  const loadCalendarConfigs = async () => {
    try {
      const response = await fetch('/api/calendar/configs');
      const data = await response.json();
      setConfigs(data.data);
    } catch (error) {
      console.error('Failed to load calendar configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConflicts = async () => {
    try {
      const response = await fetch('/api/calendar/conflicts');
      const data = await response.json();
      setConflicts(data.data);
    } catch (error) {
      console.error('Failed to load conflicts:', error);
    }
  };

  const syncCalendar = async (configId: string) => {
    setSyncing(configId);
    try {
      const response = await fetch(`/api/calendar/sync/${configId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncType: 'incremental' })
      });
      
      const data = await response.json();
      if (data.success) {
        await loadCalendarConfigs();
        await loadConflicts();
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(null);
    }
  };

  const connectNewCalendar = async (provider: string) => {
    try {
      const response = await fetch('/api/calendar/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          configuration: {
            syncInterval: 15,
            includeAttendees: true,
            includePrivateEvents: false,
            autoCreateWedSyncEvents: true,
            conflictResolution: 'manual'
          }
        })
      });

      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else if (data.success) {
        loadCalendarConfigs();
      }
    } catch (error) {
      console.error('Failed to connect calendar:', error);
    }
  };

  if (loading) return <div>Loading calendar integrations...</div>;

  return (
    <div className="space-y-6">
      {/* Conflicts Alert */}
      {conflicts.filter(c => c.resolutionStatus === 'unresolved').length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">
              {conflicts.filter(c => c.resolutionStatus === 'unresolved').length} Unresolved Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 mb-3">
              You have scheduling conflicts that need attention.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {/* Navigate to conflicts tab */}}
              className="border-orange-300 text-orange-700"
            >
              Review Conflicts
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="calendars" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendars">Connected Calendars</TabsTrigger>
          <TabsTrigger value="availability">Availability Rules</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="calendars">
          <CalendarConfigsView 
            configs={configs}
            syncing={syncing}
            onSync={syncCalendar}
            onConnect={connectNewCalendar}
            onRefresh={loadCalendarConfigs}
          />
        </TabsContent>

        <TabsContent value="availability">
          <AvailabilityRulesManager supplierId={supplierId} />
        </TabsContent>

        <TabsContent value="conflicts">
          <ConflictResolutionView 
            conflicts={conflicts}
            onResolve={loadConflicts}
          />
        </TabsContent>

        <TabsContent value="settings">
          <CalendarSettingsPanel supplierId={supplierId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// CalendarConfigsView.tsx
interface CalendarConfigsViewProps {
  configs: CalendarConfig[];
  syncing: string | null;
  onSync: (configId: string) => void;
  onConnect: (provider: string) => void;
  onRefresh: () => void;
}

export const CalendarConfigsView: React.FC<CalendarConfigsViewProps> = ({
  configs,
  syncing,
  onSync,
  onConnect,
  onRefresh
}) => {
  return (
    <div className="space-y-4">
      {/* Add New Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Connect Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button 
              onClick={() => onConnect('google')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              📅 Google Calendar
            </Button>
            <Button 
              onClick={() => onConnect('outlook')}
              className="bg-blue-700 hover:bg-blue-800"
            >
              📅 Outlook Calendar
            </Button>
            <Button 
              onClick={() => onConnect('apple')}
              className="bg-gray-800 hover:bg-gray-900"
            >
              📅 Apple Calendar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connected Calendars */}
      {configs.map((config) => (
        <Card key={config.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarProviderIcon provider={config.provider} />
                <div>
                  <p className="font-medium">{config.calendarName}</p>
                  <p className="text-sm text-gray-500 font-normal">
                    {config.provider.charAt(0).toUpperCase() + config.provider.slice(1)} Calendar
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {config.isPrimary && (
                  <Badge variant="default">Primary</Badge>
                )}
                <Badge variant={config.syncStatus === 'active' ? 'default' : 'destructive'}>
                  {config.syncStatus}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Sync Direction</p>
                  <p className="font-medium capitalize">{config.syncDirection}</p>
                </div>
                <div>
                  <p className="text-gray-500">Last Sync</p>
                  <p className="font-medium">
                    {config.lastSyncAt 
                      ? new Date(config.lastSyncAt).toLocaleString()
                      : 'Never'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Sync Interval</p>
                  <p className="font-medium">{config.configuration.syncInterval} minutes</p>
                </div>
              </div>

              {config.syncErrors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800 font-medium">Recent Errors:</p>
                  <ul className="text-sm text-red-700 mt-1">
                    {config.syncErrors.slice(0, 3).map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onSync(config.id)}
                  disabled={syncing === config.id}
                >
                  {syncing === config.id ? 'Syncing...' : 'Sync Now'}
                </Button>
                <Button size="sm" variant="outline">
                  Configure
                </Button>
                <Button size="sm" variant="outline">
                  Test Connection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {configs.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500 mb-4">No calendars connected yet</p>
            <p className="text-sm text-gray-400">
              Connect your calendar to manage availability and prevent double bookings
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// AvailabilityCalendar.tsx
interface AvailabilityCalendarProps {
  supplierId: string;
  selectedDate?: Date;
  onDateSelect: (date: Date) => void;
}

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  supplierId,
  selectedDate,
  onDateSelect
}) => {
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewDate, setViewDate] = useState(selectedDate || new Date());

  useEffect(() => {
    loadAvailability();
  }, [viewDate, supplierId]);

  const loadAvailability = async () => {
    setLoading(true);
    try {
      const startDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
      const endDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
      
      const response = await fetch(`/api/calendar/availability?${new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        workingHoursOnly: 'true'
      })}`);
      
      const data = await response.json();
      setAvailability(data.data.availableSlots);
    } catch (error) {
      console.error('Failed to load availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateAvailability = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return availability.filter(slot => 
      slot.startTime.startsWith(dateStr) && slot.isAvailable
    );
  };

  const renderCalendarDay = (date: Date) => {
    const dayAvailability = getDateAvailability(date);
    const isToday = date.toDateString() === new Date().toDateString();
    const isSelected = selectedDate?.toDateString() === date.toDateString();
    
    return (
      <button
        key={date.toISOString()}
        onClick={() => onDateSelect(date)}
        className={`
          relative w-full h-12 border rounded-lg text-sm
          ${isSelected ? 'bg-blue-100 border-blue-500 text-blue-900' : ''}
          ${isToday ? 'border-blue-300' : 'border-gray-200'}
          ${dayAvailability.length > 0 ? 'hover:bg-green-50' : 'hover:bg-red-50'}
        `}
      >
        <span className="font-medium">{date.getDate()}</span>
        <div className="absolute bottom-1 left-1 right-1 h-1 rounded">
          {dayAvailability.length > 0 ? (
            <div className="h-full bg-green-400 rounded"></div>
          ) : (
            <div className="h-full bg-red-400 rounded"></div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}
          >
            ←
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setViewDate(new Date())}
          >
            Today
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}
          >
            →
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {generateCalendarDays(viewDate).map(renderCalendarDay)}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-400 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-400 rounded"></div>
          <span>Busy</span>
        </div>
      </div>

      {loading && (
        <div className="text-center text-gray-500">
          Loading availability...
        </div>
      )}
    </div>
  );
};

// Helper function to generate calendar days
function generateCalendarDays(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) { // 6 weeks
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    days.push(day);
  }
  
  return days;
}
```

## Code Examples

### Calendar Service Implementation

```typescript
// lib/services/calendar-service.ts
import { google, Auth } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import { createClient } from '@supabase/supabase-js';

export class CalendarService {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async connectGoogleCalendar(supplierId: string, authCode: string): Promise<CalendarConfig> {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Exchange auth code for tokens
    const { tokens } = await oauth2Client.getAccessToken({ code: authCode });
    oauth2Client.setCredentials(tokens);

    // Get calendar list
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarList = await calendar.calendarList.list();
    const primaryCalendar = calendarList.data.items?.find(cal => cal.primary);

    if (!primaryCalendar) {
      throw new Error('No primary calendar found');
    }

    // Store configuration
    const config = await this.supabase
      .from('calendar_configs')
      .insert({
        supplier_id: supplierId,
        provider: 'google',
        provider_account_id: primaryCalendar.id,
        calendar_id: primaryCalendar.id,
        calendar_name: primaryCalendar.summary,
        is_primary: true,
        sync_direction: 'bidirectional',
        refresh_token_encrypted: await this.encryptToken(tokens.refresh_token),
        access_token_encrypted: await this.encryptToken(tokens.access_token),
        token_expires_at: new Date(tokens.expiry_date!).toISOString(),
        configuration: {
          syncInterval: 15,
          includeAttendees: true,
          includePrivateEvents: false,
          autoCreateWedSyncEvents: true,
          conflictResolution: 'manual'
        }
      })
      .select()
      .single();

    // Perform initial sync
    await this.syncCalendar(config.data.id, 'full');

    return config.data;
  }

  async syncCalendar(configId: string, syncType: 'full' | 'incremental'): Promise<any> {
    const startTime = Date.now();
    const syncLog = {
      calendar_config_id: configId,
      sync_type: syncType,
      sync_direction: 'inbound',
      events_processed: 0,
      events_created: 0,
      events_updated: 0,
      events_deleted: 0,
      conflicts_detected: 0
    };

    try {
      const config = await this.getCalendarConfig(configId);
      if (!config) throw new Error('Calendar config not found');

      let events: any[] = [];

      switch (config.provider) {
        case 'google':
          events = await this.syncGoogleCalendar(config, syncType);
          break;
        case 'outlook':
          events = await this.syncOutlookCalendar(config, syncType);
          break;
        default:
          throw new Error(`Unsupported provider: ${config.provider}`);
      }

      // Process events
      for (const event of events) {
        const existingEvent = await this.getEventByExternalId(config.id, event.id);
        
        if (existingEvent) {
          if (this.shouldUpdateEvent(existingEvent, event)) {
            await this.updateEvent(existingEvent.id, event);
            syncLog.events_updated++;
          }
        } else {
          await this.createEvent(config, event);
          syncLog.events_created++;
        }
        
        syncLog.events_processed++;
      }

      // Detect conflicts
      const conflicts = await this.detectConflicts(config.supplierId);
      syncLog.conflicts_detected = conflicts.length;

      // Update sync log
      syncLog.sync_duration_ms = Date.now() - startTime;
      await this.logSync({ ...syncLog, status: 'success' });

      // Update config last sync time
      await this.updateConfigLastSync(configId);

      return syncLog;

    } catch (error) {
      console.error('Calendar sync failed:', error);
      await this.logSync({
        ...syncLog,
        status: 'failed',
        error_details: { message: error.message, stack: error.stack },
        sync_duration_ms: Date.now() - startTime
      });
      throw error;
    }
  }

  private async syncGoogleCalendar(config: CalendarConfig, syncType: string): Promise<any[]> {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: await this.decryptToken(config.accessTokenEncrypted),
      refresh_token: await this.decryptToken(config.refreshTokenEncrypted)
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Get events from the last 30 days to 1 year ahead
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 30);
    const timeMax = new Date();
    timeMax.setFullYear(timeMax.getFullYear() + 1);

    const params: any = {
      calendarId: config.calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    };

    if (syncType === 'incremental' && config.lastSyncAt) {
      params.updatedMin = config.lastSyncAt;
    }

    const response = await calendar.events.list(params);
    return response.data.items || [];
  }

  private async syncOutlookCalendar(config: CalendarConfig, syncType: string): Promise<any[]> {
    // Initialize Microsoft Graph client
    const graphClient = Client.init({
      authProvider: async (done) => {
        const accessToken = await this.getValidAccessToken(config);
        done(null, accessToken);
      }
    });

    // Get events
    const events = await graphClient
      .api(`/me/calendars/${config.calendarId}/events`)
      .select('id,subject,body,start,end,location,attendees,isAllDay,showAs')
      .filter(`start/dateTime ge '${new Date().toISOString()}'`)
      .top(1000)
      .get();

    return events.value || [];
  }

  async getAvailability(
    supplierId: string, 
    startDate: Date, 
    endDate: Date, 
    duration?: number
  ): Promise<AvailabilitySlot[]> {
    // Get all events in the date range
    const events = await this.supabase
      .from('calendar_events')
      .select('*')
      .eq('supplier_id', supplierId)
      .gte('start_time', startDate.toISOString())
      .lte('end_time', endDate.toISOString())
      .order('start_time');

    // Get availability rules
    const rules = await this.supabase
      .from('availability_rules')
      .select('*')
      .eq('supplier_id', supplierId)
      .eq('is_active', true);

    const slots: AvailabilitySlot[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const daySlots = this.calculateDayAvailability(
        current,
        events.data || [],
        rules.data || [],
        duration
      );
      slots.push(...daySlots);
      current.setDate(current.getDate() + 1);
    }

    return slots;
  }

  private calculateDayAvailability(
    date: Date,
    events: CalendarEvent[],
    rules: AvailabilityRule[],
    duration?: number
  ): AvailabilitySlot[] {
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split('T')[0];

    // Get working hours for this day
    const workingHours = rules.find(rule => 
      rule.ruleType === 'working_hours' && 
      rule.dayOfWeek === dayOfWeek &&
      rule.isAvailable
    );

    if (!workingHours || !workingHours.startTime || !workingHours.endTime) {
      return []; // No working hours defined
    }

    // Get day's events
    const dayEvents = events.filter(event => 
      event.startTime.startsWith(dateStr) || event.endTime.startsWith(dateStr)
    );

    // Get buffer time rules
    const bufferRule = rules.find(rule => rule.ruleType === 'buffer_time');
    const bufferMinutes = bufferRule?.durationMinutes || 0;

    // Calculate available slots
    const slots: AvailabilitySlot[] = [];
    const workStart = this.parseTimeToMinutes(workingHours.startTime);
    const workEnd = this.parseTimeToMinutes(workingHours.endTime);
    const slotDuration = duration || 60; // Default 1 hour slots

    for (let minutes = workStart; minutes + slotDuration <= workEnd; minutes += slotDuration) {
      const slotStart = new Date(date);
      slotStart.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

      // Check for conflicts
      const hasConflict = dayEvents.some(event => {
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);
        return (slotStart < eventEnd && slotEnd > eventStart);
      });

      slots.push({
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        isAvailable: !hasConflict,
        conflicts: hasConflict ? ['existing_event'] : [],
        bufferBefore: bufferMinutes,
        bufferAfter: bufferMinutes
      });
    }

    return slots;
  }

  async detectConflicts(supplierId: string): Promise<CalendarConflict[]> {
    // Get all events for the supplier
    const events = await this.supabase
      .from('calendar_events')
      .select('*')
      .eq('supplier_id', supplierId)
      .gte('start_time', new Date().toISOString())
      .order('start_time');

    const conflicts: CalendarConflict[] = [];
    const eventList = events.data || [];

    // Check for overlapping events
    for (let i = 0; i < eventList.length; i++) {
      for (let j = i + 1; j < eventList.length; j++) {
        const event1 = eventList[i];
        const event2 = eventList[j];

        const start1 = new Date(event1.startTime);
        const end1 = new Date(event1.endTime);
        const start2 = new Date(event2.startTime);
        const end2 = new Date(event2.endTime);

        // Check for overlap
        if (start1 < end2 && start2 < end1) {
          const conflict = {
            supplier_id: supplierId,
            conflict_type: 'double_booking',
            source_event_id: event1.id,
            conflicting_event_id: event2.id,
            conflict_time_start: new Date(Math.max(start1.getTime(), start2.getTime())).toISOString(),
            conflict_time_end: new Date(Math.min(end1.getTime(), end2.getTime())).toISOString(),
            severity: this.calculateConflictSeverity(event1, event2),
            resolution_status: 'unresolved'
          };

          const { data } = await this.supabase
            .from('calendar_conflicts')
            .upsert(conflict)
            .select()
            .single();

          conflicts.push(data);
        }
      }
    }

    return conflicts;
  }

  private calculateConflictSeverity(event1: CalendarEvent, event2: CalendarEvent): string {
    // Determine severity based on event types and timing
    if (event1.isWedSyncCreated && event2.isWedSyncCreated) {
      return 'critical'; // Both are WedSync bookings
    }
    if (event1.isWedSyncCreated || event2.isWedSyncCreated) {
      return 'high'; // One is a WedSync booking
    }
    return 'medium'; // Both are external events
  }

  async createEvent(config: CalendarConfig, eventData: any): Promise<CalendarEvent> {
    // Create event in external calendar first
    let externalEventId: string;

    switch (config.provider) {
      case 'google':
        externalEventId = await this.createGoogleEvent(config, eventData);
        break;
      case 'outlook':
        externalEventId = await this.createOutlookEvent(config, eventData);
        break;
      default:
        throw new Error(`Cannot create events for provider: ${config.provider}`);
    }

    // Store in local database
    const { data } = await this.supabase
      .from('calendar_events')
      .insert({
        supplier_id: config.supplierId,
        calendar_config_id: config.id,
        external_event_id: externalEventId,
        title: eventData.title,
        description: eventData.description,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        location: eventData.location,
        is_wedsync_created: true,
        client_id: eventData.clientId
      })
      .select()
      .single();

    return data;
  }

  private async createGoogleEvent(config: CalendarConfig, eventData: any): Promise<string> {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: await this.decryptToken(config.accessTokenEncrypted),
      refresh_token: await this.decryptToken(config.refreshTokenEncrypted)
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = {
      summary: eventData.title,
      description: eventData.description,
      location: eventData.location,
      start: {
        dateTime: eventData.startTime,
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: eventData.endTime,
        timeZone: 'America/New_York'
      },
      attendees: eventData.attendees?.map((attendee: any) => ({
        email: attendee.email,
        displayName: attendee.name
      }))
    };

    const response = await calendar.events.insert({
      calendarId: config.calendarId,
      resource: event,
      sendUpdates: eventData.sendNotifications ? 'all' : 'none'
    });

    return response.data.id!;
  }

  private parseTimeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private async encryptToken(token: string): Promise<string> {
    // Implement token encryption
    // This should use your encryption service
    return Buffer.from(token).toString('base64'); // Simplified for example
  }

  private async decryptToken(encryptedToken: string): Promise<string> {
    // Implement token decryption
    // This should use your encryption service
    return Buffer.from(encryptedToken, 'base64').toString(); // Simplified for example
  }
}
```

## Test Requirements

```typescript
// __tests__/calendar-integration.test.ts
import { CalendarService } from '@/lib/services/calendar-service';

describe('Calendar Integration', () => {
  let calendarService: CalendarService;

  beforeEach(() => {
    calendarService = new CalendarService();
  });

  describe('Calendar Sync', () => {
    it('should sync Google Calendar events', async () => {
      const configId = 'test-config-id';
      const result = await calendarService.syncCalendar(configId, 'full');

      expect(result.eventsProcessed).toBeGreaterThan(0);
      expect(result.status).toBe('success');
    });

    it('should handle sync errors gracefully', async () => {
      const invalidConfigId = 'invalid-config';
      
      await expect(
        calendarService.syncCalendar(invalidConfigId, 'full')
      ).rejects.toThrow('Calendar config not found');
    });

    it('should detect and log conflicts during sync', async () => {
      const configId = 'test-config-id';
      
      // Mock overlapping events
      jest.spyOn(calendarService, 'detectConflicts').mockResolvedValue([
        {
          conflictType: 'double_booking',
          severity: 'high',
          resolutionStatus: 'unresolved'
        }
      ]);

      const result = await calendarService.syncCalendar(configId, 'full');
      expect(result.conflictsDetected).toBeGreaterThan(0);
    });
  });

  describe('Availability Calculation', () => {
    it('should calculate available time slots correctly', async () => {
      const supplierId = 'supplier-1';
      const startDate = new Date('2024-06-15');
      const endDate = new Date('2024-06-15');

      const availability = await calendarService.getAvailability(
        supplierId,
        startDate,
        endDate,
        60 // 1 hour slots
      );

      expect(availability).toBeInstanceOf(Array);
      expect(availability.every(slot => 
        slot.hasOwnProperty('startTime') && 
        slot.hasOwnProperty('endTime') && 
        slot.hasOwnProperty('isAvailable')
      )).toBe(true);
    });

    it('should respect working hours rules', async () => {
      const supplierId = 'supplier-1';
      const startDate = new Date('2024-06-15'); // Saturday

      // Mock working hours: Monday-Friday 9-5
      jest.spyOn(calendarService, 'getAvailabilityRules').mockResolvedValue([
        {
          ruleType: 'working_hours',
          dayOfWeek: 6, // Saturday
          isAvailable: false
        }
      ]);

      const availability = await calendarService.getAvailability(
        supplierId,
        startDate,
        startDate
      );

      expect(availability.filter(slot => slot.isAvailable)).toHaveLength(0);
    });

    it('should account for buffer time between events', async () => {
      const supplierId = 'supplier-1';
      const duration = 120; // 2 hours
      const bufferTime = 30; // 30 minutes

      const availability = await calendarService.getAvailability(
        supplierId,
        new Date('2024-06-15'),
        new Date('2024-06-15'),
        duration
      );

      // Verify slots account for buffer time
      availability.forEach(slot => {
        expect(slot.bufferBefore).toBeDefined();
        expect(slot.bufferAfter).toBeDefined();
      });
    });
  });

  describe('Conflict Detection', () => {
    it('should detect double bookings', async () => {
      const supplierId = 'supplier-1';

      // Mock overlapping events
      const mockEvents = [
        {
          id: '1',
          startTime: '2024-06-15T14:00:00Z',
          endTime: '2024-06-15T16:00:00Z',
          title: 'Wedding A'
        },
        {
          id: '2',
          startTime: '2024-06-15T15:00:00Z',
          endTime: '2024-06-15T17:00:00Z',
          title: 'Wedding B'
        }
      ];

      jest.spyOn(calendarService, 'getEvents').mockResolvedValue(mockEvents);

      const conflicts = await calendarService.detectConflicts(supplierId);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictType).toBe('double_booking');
      expect(conflicts[0].severity).toBeDefined();
    });

    it('should categorize conflict severity correctly', async () => {
      const weddingBookingConflict = {
        event1: { isWedSyncCreated: true, title: 'Wedding A' },
        event2: { isWedSyncCreated: true, title: 'Wedding B' }
      };

      const severity = calendarService.calculateConflictSeverity(
        weddingBookingConflict.event1,
        weddingBookingConflict.event2
      );

      expect(severity).toBe('critical');
    });
  });

  describe('Event Creation', () => {
    it('should create events in external calendar', async () => {
      const config = {
        id: 'config-1',
        provider: 'google',
        calendarId: 'primary',
        supplierId: 'supplier-1'
      };

      const eventData = {
        title: 'Wedding Photography Session',
        startTime: '2024-06-15T14:00:00Z',
        endTime: '2024-06-15T16:00:00Z',
        location: 'Central Park, NY',
        clientId: 'client-1'
      };

      const event = await calendarService.createEvent(config, eventData);

      expect(event.id).toBeDefined();
      expect(event.title).toBe(eventData.title);
      expect(event.isWedSyncCreated).toBe(true);
    });

    it('should handle event creation failures', async () => {
      const invalidConfig = {
        provider: 'unsupported_provider'
      };

      await expect(
        calendarService.createEvent(invalidConfig, {})
      ).rejects.toThrow('Cannot create events for provider');
    });
  });

  describe('Working Hours Management', () => {
    it('should save working hours correctly', async () => {
      const rule = {
        supplierId: 'supplier-1',
        ruleType: 'working_hours',
        dayOfWeek: 1, // Monday
        startTime: '09:00',
        endTime: '17:00',
        isAvailable: true
      };

      const savedRule = await calendarService.createAvailabilityRule(rule);

      expect(savedRule.id).toBeDefined();
      expect(savedRule.dayOfWeek).toBe(1);
      expect(savedRule.startTime).toBe('09:00');
    });

    it('should handle recurring availability blocks', async () => {
      const recurringRule = {
        supplierId: 'supplier-1',
        ruleType: 'recurring_block',
        recurrencePattern: {
          frequency: 'weekly',
          interval: 1,
          daysOfWeek: [1, 3, 5] // Monday, Wednesday, Friday
        },
        isAvailable: false,
        description: 'Editing days'
      };

      const rule = await calendarService.createAvailabilityRule(recurringRule);

      expect(rule.recurrencePattern).toBeDefined();
      expect(rule.recurrencePattern.frequency).toBe('weekly');
    });
  });
});
```

## Dependencies

### External APIs
- **Google Calendar API**: Google Calendar integration
- **Microsoft Graph API**: Outlook Calendar integration
- **Apple Calendar Server**: CalDAV protocol
- **iCal/CalDAV**: Generic calendar support

### Internal Dependencies
- **Supabase Database**: Configuration and event storage
- **OAuth Service**: Authentication handling
- **Encryption Service**: Secure token storage
- **Conflict Resolution Engine**: Automatic conflict handling

### Frontend Dependencies
- **FullCalendar**: Calendar visualization
- **React Big Calendar**: Alternative calendar component
- **Date-fns**: Date manipulation
- **React Hook Form**: Form management

## Effort Estimate

- **Database Schema**: 8 hours
- **Google Calendar Integration**: 16 hours
- **Outlook Calendar Integration**: 14 hours
- **Availability Calculation Engine**: 12 hours
- **Conflict Detection System**: 10 hours
- **Frontend Calendar Components**: 20 hours
- **Working Hours Management**: 8 hours
- **Sync Engine**: 12 hours
- **Testing**: 18 hours
- **Documentation**: 6 hours

**Total Estimated Effort**: 124 hours (15.5 days)

## Success Metrics

- 99.5% sync accuracy with external calendars
- Conflict detection within 5 minutes of occurrence
- 95% availability calculation accuracy
- Zero double bookings for WedSync events
- Sync completion within 30 seconds for incremental updates
- 90% user satisfaction with calendar features