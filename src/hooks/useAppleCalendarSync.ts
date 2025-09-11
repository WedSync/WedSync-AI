'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  CalDAVCredentials,
  CalendarInfo,
  SyncStatus,
  ConflictInfo,
  CalendarEvent,
  SyncSettings,
} from '@/types/apple-calendar';

interface UseAppleCalendarSyncOptions {
  autoSync?: boolean;
  syncInterval?: number; // in minutes
  onError?: (error: string) => void;
  onSyncComplete?: (status: SyncStatus) => void;
  onConflictDetected?: (conflicts: ConflictInfo[]) => void;
}

interface CalDAVConnection {
  url: string;
  credentials: CalDAVCredentials;
  headers: Record<string, string>;
  lastActivity: Date;
}

interface CalDAVDiscoveryResult {
  calendars: CalendarInfo[];
  principalUrl?: string;
  calendarHomeUrl?: string;
  serverCapabilities: string[];
}

export const useAppleCalendarSync = (
  options: UseAppleCalendarSyncOptions = {},
) => {
  const {
    autoSync = false,
    syncInterval = 15,
    onError,
    onSyncComplete,
    onConflictDetected,
  } = options;

  // State management
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState<CalDAVCredentials | null>(
    null,
  );
  const [connection, setConnection] = useState<CalDAVConnection | null>(null);
  const [discoveredCalendars, setDiscoveredCalendars] = useState<
    CalendarInfo[]
  >([]);
  const [selectedCalendars, setSelectedCalendars] = useState<CalendarInfo[]>(
    [],
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConnected: false,
    calendarsDiscovered: 0,
    eventsProcessed: 0,
    conflictsFound: 0,
    errorCount: 0,
  });
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    syncDirection: 'bidirectional',
    eventTypes: ['client_meeting', 'wedding_ceremony', 'wedding_reception'],
    syncFrequency: 'realtime',
    notifications: {
      syncComplete: true,
      conflictsFound: true,
      errors: true,
      deviceTypes: ['iPhone', 'iPad', 'Mac'],
    },
    autoResolveConflicts: false,
    businessHoursOnly: true,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for intervals and cleanup
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // CalDAV Discovery and Authentication
  const discoverCalDAVEndpoints = useCallback(
    async (appleId: string): Promise<string> => {
      // Apple iCloud CalDAV server discovery
      const iCloudServers = [
        'https://caldav.icloud.com/',
        `https://p${Math.floor(Math.random() * 70) + 1}-caldav.icloud.com/`,
      ];

      for (const server of iCloudServers) {
        try {
          const response = await fetch(`${server}.well-known/caldav`, {
            method: 'PROPFIND',
            headers: {
              'Content-Type': 'application/xml',
              Depth: '0',
            },
          });

          if (response.status === 401) {
            // 401 means server exists but needs auth
            return server;
          }
        } catch (error) {
          console.warn(`CalDAV discovery failed for ${server}:`, error);
        }
      }

      return 'https://caldav.icloud.com/';
    },
    [],
  );

  const authenticate = useCallback(
    async (authCredentials: CalDAVCredentials): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      abortControllerRef.current = new AbortController();

      try {
        let serverUrl = authCredentials.serverUrl;

        // Auto-discover if using iCloud
        if (!authCredentials.isCustomServer) {
          serverUrl = await discoverCalDAVEndpoints(authCredentials.appleId);
        }

        // Test connection with PROPFIND on principal URL
        const principalUrl = `${serverUrl}${authCredentials.appleId}/`;
        const authHeader = btoa(
          `${authCredentials.appleId}:${authCredentials.appPassword}`,
        );

        const response = await fetch(principalUrl, {
          method: 'PROPFIND',
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/xml',
            Depth: '0',
          },
          body: `<?xml version="1.0" encoding="utf-8"?>
        <propfind xmlns="DAV:">
          <prop>
            <current-user-principal/>
            <calendar-home-set xmlns="urn:ietf:params:xml:ns:caldav"/>
          </prop>
        </propfind>`,
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              'Invalid Apple ID or app-specific password. Please check your credentials.',
            );
          } else if (response.status === 403) {
            throw new Error(
              'Access denied. Please ensure you have generated an app-specific password.',
            );
          } else {
            throw new Error(
              `CalDAV server error: ${response.status} ${response.statusText}`,
            );
          }
        }

        // Store connection details
        const newConnection: CalDAVConnection = {
          url: serverUrl,
          credentials: { ...authCredentials, serverUrl },
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/xml',
          },
          lastActivity: new Date(),
        };

        setConnection(newConnection);
        setCredentials({ ...authCredentials, serverUrl });
        setIsAuthenticated(true);
        setSyncStatus((prev) => ({ ...prev, isConnected: true }));

        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Authentication failed';
        setError(errorMessage);
        onError?.(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [discoverCalDAVEndpoints, onError],
  );

  // Calendar Discovery
  const discoverCalendars = useCallback(async (): Promise<CalendarInfo[]> => {
    if (!connection) {
      throw new Error('Not authenticated');
    }

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      // Get calendar home set
      const calendarHomeUrl = `${connection.url}${connection.credentials.appleId}/calendars/`;

      const response = await fetch(calendarHomeUrl, {
        method: 'PROPFIND',
        headers: {
          ...connection.headers,
          Depth: '1',
        },
        body: `<?xml version="1.0" encoding="utf-8"?>
        <propfind xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:A="http://apple.com/ns/ical/">
          <prop>
            <displayname/>
            <C:calendar-description/>
            <resourcetype/>
            <C:supported-calendar-component-set/>
            <A:calendar-color/>
            <getctag/>
          </prop>
        </propfind>`,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Calendar discovery failed: ${response.status}`);
      }

      const xmlText = await response.text();
      const calendars = parseCalendarDiscoveryResponse(
        xmlText,
        calendarHomeUrl,
      );

      setDiscoveredCalendars(calendars);
      setSyncStatus((prev) => ({
        ...prev,
        calendarsDiscovered: calendars.length,
      }));

      return calendars;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Calendar discovery failed';
      setError(errorMessage);
      onError?.(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [connection, onError]);

  // Parse CalDAV XML responses
  const parseCalendarDiscoveryResponse = useCallback(
    (xmlText: string, baseUrl: string): CalendarInfo[] => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const responses = xmlDoc.querySelectorAll('response');
      const calendars: CalendarInfo[] = [];

      responses.forEach((response, index) => {
        const href = response.querySelector('href')?.textContent;
        const displayName = response.querySelector('displayname')?.textContent;
        const resourceType = response.querySelector('resourcetype');
        const isCalendar = resourceType?.querySelector('calendar') !== null;

        if (isCalendar && href && displayName) {
          const calendarId = href.replace(baseUrl, '').replace('/', '');
          const color =
            response.querySelector('calendar-color')?.textContent || '#3B82F6';
          const ctag = response.querySelector('getctag')?.textContent || '';
          const description =
            response.querySelector('calendar-description')?.textContent || '';

          calendars.push({
            id: calendarId,
            name: displayName,
            color: color
              .replace('rgb(', '#')
              .replace(')', '')
              .replace(/,/g, ''),
            description,
            isReadOnly: false, // Apple calendars are typically writable
            supportedComponents: ['VEVENT'], // Default to events
            ctag,
          });
        }
      });

      return calendars;
    },
    [],
  );

  // Event Synchronization
  const syncEvents = useCallback(async (): Promise<void> => {
    if (!connection || selectedCalendars.length === 0) {
      throw new Error('No calendars selected for sync');
    }

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      setSyncStatus((prev) => ({
        ...prev,
        syncProgress: 0,
        currentOperation: 'Starting sync...',
      }));

      const totalCalendars = selectedCalendars.length;
      let processedEvents = 0;
      const detectedConflicts: ConflictInfo[] = [];

      for (let i = 0; i < selectedCalendars.length; i++) {
        const calendar = selectedCalendars[i];

        setSyncStatus((prev) => ({
          ...prev,
          syncProgress: (i / totalCalendars) * 100,
          currentOperation: `Syncing ${calendar.name}...`,
        }));

        // Get events from calendar
        const events = await fetchCalendarEvents(calendar);
        processedEvents += events.length;

        // Check for conflicts
        const conflicts = detectConflicts(events);
        detectedConflicts.push(...conflicts);

        // Small delay to prevent overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      setConflicts(detectedConflicts);
      setSyncStatus((prev) => ({
        ...prev,
        syncProgress: 100,
        currentOperation: 'Sync completed',
        lastSync: new Date(),
        eventsProcessed: processedEvents,
        conflictsFound: detectedConflicts.length,
      }));

      if (detectedConflicts.length > 0) {
        onConflictDetected?.(detectedConflicts);
      }

      onSyncComplete?.(syncStatus);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Sync failed';
      setError(errorMessage);
      setSyncStatus((prev) => ({ ...prev, errorCount: prev.errorCount + 1 }));
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [
    connection,
    selectedCalendars,
    syncStatus,
    onConflictDetected,
    onSyncComplete,
    onError,
  ]);

  // Fetch events from specific calendar
  const fetchCalendarEvents = useCallback(
    async (calendar: CalendarInfo): Promise<CalendarEvent[]> => {
      if (!connection) return [];

      const calendarUrl = `${connection.url}${connection.credentials.appleId}/calendars/${calendar.id}/`;

      const response = await fetch(calendarUrl, {
        method: 'REPORT',
        headers: {
          ...connection.headers,
          Depth: '1',
        },
        body: `<?xml version="1.0" encoding="utf-8"?>
      <C:calendar-query xmlns:C="urn:ietf:params:xml:ns:caldav">
        <D:prop xmlns:D="DAV:">
          <D:getetag/>
          <C:calendar-data/>
        </D:prop>
        <C:filter>
          <C:comp-filter name="VCALENDAR">
            <C:comp-filter name="VEVENT">
              <C:time-range start="${new Date().toISOString().split('T')[0].replace(/-/g, '')}T000000Z"/>
            </C:comp-filter>
          </C:comp-filter>
        </C:filter>
      </C:calendar-query>`,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch events from ${calendar.name}`);
      }

      const xmlText = await response.text();
      return parseCalendarEvents(xmlText);
    },
    [connection],
  );

  // Parse iCalendar events from CalDAV response
  const parseCalendarEvents = useCallback(
    (xmlText: string): CalendarEvent[] => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const responses = xmlDoc.querySelectorAll('response');
      const events: CalendarEvent[] = [];

      responses.forEach((response) => {
        const calendarData =
          response.querySelector('calendar-data')?.textContent;
        const etag = response.querySelector('getetag')?.textContent;

        if (calendarData) {
          const parsedEvents = parseICalendarData(calendarData, etag || '');
          events.push(...parsedEvents);
        }
      });

      return events;
    },
    [],
  );

  // Parse iCalendar (RFC 5545) format
  const parseICalendarData = useCallback(
    (icalData: string, etag: string): CalendarEvent[] => {
      const events: CalendarEvent[] = [];
      const lines = icalData.split(/\r\n|\n|\r/);
      let currentEvent: Partial<CalendarEvent> | null = null;

      for (const line of lines) {
        const [property, ...valueParts] = line.split(':');
        const value = valueParts.join(':');

        switch (property) {
          case 'BEGIN':
            if (value === 'VEVENT') {
              currentEvent = { etag };
            }
            break;
          case 'END':
            if (value === 'VEVENT' && currentEvent) {
              if (
                currentEvent.id &&
                currentEvent.title &&
                currentEvent.startTime &&
                currentEvent.endTime
              ) {
                events.push({
                  ...currentEvent,
                  eventType: classifyEventType(currentEvent.title),
                  priority: 'medium',
                  lastModified: new Date(),
                } as CalendarEvent);
              }
              currentEvent = null;
            }
            break;
          case 'UID':
            if (currentEvent) currentEvent.id = value;
            break;
          case 'SUMMARY':
            if (currentEvent) currentEvent.title = value;
            break;
          case 'DTSTART':
            if (currentEvent) currentEvent.startTime = parseICalDate(value);
            break;
          case 'DTEND':
            if (currentEvent) currentEvent.endTime = parseICalDate(value);
            break;
          case 'LOCATION':
            if (currentEvent) currentEvent.location = value;
            break;
          case 'DESCRIPTION':
            if (currentEvent) currentEvent.description = value;
            break;
        }
      }

      return events;
    },
    [],
  );

  // Parse iCalendar date format
  const parseICalDate = useCallback((dateString: string): Date => {
    // Handle YYYYMMDDTHHMMSSZ format
    if (dateString.endsWith('Z')) {
      const year = parseInt(dateString.substr(0, 4));
      const month = parseInt(dateString.substr(4, 2)) - 1;
      const day = parseInt(dateString.substr(6, 2));
      const hour = parseInt(dateString.substr(9, 2));
      const minute = parseInt(dateString.substr(11, 2));
      const second = parseInt(dateString.substr(13, 2));
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    }

    // Fallback to Date constructor
    return new Date(dateString);
  }, []);

  // Classify event type based on title keywords
  const classifyEventType = useCallback(
    (title: string): CalendarEvent['eventType'] => {
      const titleLower = title.toLowerCase();

      if (titleLower.includes('wedding') || titleLower.includes('ceremony'))
        return 'wedding_ceremony';
      if (titleLower.includes('reception')) return 'wedding_reception';
      if (titleLower.includes('engagement') || titleLower.includes('shoot'))
        return 'engagement_shoot';
      if (titleLower.includes('rehearsal')) return 'rehearsal';
      if (titleLower.includes('venue') || titleLower.includes('site visit'))
        return 'venue_visit';
      if (titleLower.includes('vendor') || titleLower.includes('supplier'))
        return 'vendor_meeting';
      if (titleLower.includes('deadline') || titleLower.includes('due'))
        return 'deadline';
      if (titleLower.includes('task')) return 'task_due';

      return 'client_meeting'; // Default
    },
    [],
  );

  // Detect scheduling conflicts
  const detectConflicts = useCallback(
    (events: CalendarEvent[]): ConflictInfo[] => {
      const conflicts: ConflictInfo[] = [];

      for (let i = 0; i < events.length; i++) {
        for (let j = i + 1; j < events.length; j++) {
          const event1 = events[i];
          const event2 = events[j];

          // Check for time overlap
          if (
            event1.startTime < event2.endTime &&
            event2.startTime < event1.endTime
          ) {
            conflicts.push({
              id: `conflict-${event1.id}-${event2.id}`,
              type: 'time_overlap',
              severity: determineConflictSeverity(event1, event2),
              localEvent: event1,
              remoteEvent: event2,
              suggestedResolution: 'manual',
              weddingImpact: assessWeddingImpact(event1, event2),
            });
          }
        }
      }

      return conflicts;
    },
    [],
  );

  // Determine conflict severity
  const determineConflictSeverity = useCallback(
    (
      event1: CalendarEvent,
      event2: CalendarEvent,
    ): ConflictInfo['severity'] => {
      if (
        event1.eventType === 'wedding_ceremony' ||
        event2.eventType === 'wedding_ceremony'
      ) {
        return 'critical';
      }
      if (event1.priority === 'high' || event2.priority === 'high') {
        return 'high';
      }
      return 'medium';
    },
    [],
  );

  // Assess wedding impact
  const assessWeddingImpact = useCallback(
    (
      event1: CalendarEvent,
      event2: CalendarEvent,
    ): ConflictInfo['weddingImpact'] => {
      const weddingEvents = [
        'wedding_ceremony',
        'wedding_reception',
        'rehearsal',
      ];

      if (
        weddingEvents.includes(event1.eventType) ||
        weddingEvents.includes(event2.eventType)
      ) {
        return 'critical';
      }
      if (
        event1.eventType === 'venue_visit' ||
        event2.eventType === 'venue_visit'
      ) {
        return 'major';
      }
      return 'minor';
    },
    [],
  );

  // Auto-sync setup
  useEffect(() => {
    if (autoSync && isAuthenticated && selectedCalendars.length > 0) {
      syncIntervalRef.current = setInterval(
        () => {
          syncEvents().catch(console.error);
        },
        syncInterval * 60 * 1000,
      );

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
      };
    }
  }, [
    autoSync,
    isAuthenticated,
    selectedCalendars.length,
    syncInterval,
    syncEvents,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    setIsAuthenticated(false);
    setCredentials(null);
    setConnection(null);
    setDiscoveredCalendars([]);
    setSelectedCalendars([]);
    setConflicts([]);
    setSyncStatus({
      isConnected: false,
      calendarsDiscovered: 0,
      eventsProcessed: 0,
      conflictsFound: 0,
      errorCount: 0,
    });
    setError(null);

    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }
  }, []);

  return {
    // State
    isAuthenticated,
    credentials,
    discoveredCalendars,
    selectedCalendars,
    syncStatus,
    conflicts,
    syncSettings,
    isLoading,
    error,

    // Actions
    authenticate,
    discoverCalendars,
    syncEvents,
    disconnect,
    setSelectedCalendars,
    setSyncSettings,
    setError,
  };
};
