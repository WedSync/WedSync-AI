# 03-apple-calendar.md

# Apple Calendar (iCloud) Integration

## What to Build

Integration with Apple Calendar via CalDAV protocol for calendar synchronization and iCloud calendar support.

## Key Technical Requirements

### CalDAV Protocol Implementation

```
# Environment variables
APPLE_CALDAV_SERVER=[https://caldav.icloud.com](https://caldav.icloud.com)
APPLE_CALENDAR_PORT=443
```

### Package Installation

```
npm install tsdav # TypeScript CalDAV client
npm install ical.js # iCalendar parsing
npm install uuid # For calendar object UIDs
```

### Database Schema

```
-- Apple Calendar connections
CREATE TABLE apple_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  apple_id TEXT,
  email TEXT,
  username TEXT NOT NULL,
  password TEXT ENCRYPTED, -- App-specific password
  principal_url TEXT,
  calendar_url TEXT,
  calendar_name TEXT,
  ctag TEXT, -- For sync detection
  sync_token TEXT,
  last_sync TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Core Implementation

### 1. CalDAV Client Setup

```
// lib/integrations/apple-calendar/caldav-client.ts
import { createDAVClient, DAVClient } from 'tsdav';

export async function getAppleCalendarClient(
  username: string,
  password: string
): Promise<DAVClient> {
  const client = new DAVClient({
    serverUrl: [process.env.APPLE](http://process.env.APPLE)_CALDAV_SERVER!,
    credentials: {
      username,
      password: decrypt(password) // App-specific password
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav'
  });
  
  await client.login();
  return client;
}

// Helper to validate app-specific password
export async function validateAppleCredentials(
  username: string,
  password: string
): Promise<boolean> {
  try {
    const client = await getAppleCalendarClient(username, password);
    await client.fetchPrincipalUrl();
    return true;
  } catch (error) {
    return false;
  }
}
```

### 2. Connection Setup

```
// app/api/integrations/apple/connect/route.ts
export async function POST(req: Request) {
  const { username, password, supplierId } = await req.json();
  
  // Validate credentials
  const isValid = await validateAppleCredentials(username, password);
  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid credentials. Please use an app-specific password.' },
      { status: 401 }
    );
  }
  
  // Get calendar information
  const client = await getAppleCalendarClient(username, password);
  const principal = await client.fetchPrincipalUrl();
  const calendars = await client.fetchCalendars();
  
  // Find primary calendar
  const primaryCalendar = calendars.find(cal => 
    cal.displayName === 'Calendar' || cal.components?.includes('VEVENT')
  );
  
  if (!primaryCalendar) {
    return NextResponse.json(
      { error: 'No calendar found' },
      { status: 404 }
    );
  }
  
  // Store connection
  await supabase.from('apple_calendar_connections').upsert({
    supplier_id: supplierId,
    email: username,
    username,
    password: encrypt(password),
    principal_url: principal.principalUrl,
    calendar_url: primaryCalendar.url,
    calendar_name: primaryCalendar.displayName,
    ctag: primaryCalendar.ctag
  });
  
  return NextResponse.json({ success: true });
}
```

### 3. Calendar Operations

```
// services/apple-calendar-service.ts
import ICAL from 'ical.js';
import { v4 as uuidv4 } from 'uuid';

export class AppleCalendarService {
  private async getClient(supplierId: string): Promise<DAVClient> {
    const connection = await this.getConnection(supplierId);
    return getAppleCalendarClient(connection.username, connection.password);
  }
  
  async getEvents(supplierId: string, startDate: Date, endDate: Date) {
    const client = await this.getClient(supplierId);
    const connection = await this.getConnection(supplierId);
    
    const events = await client.fetchCalendarObjects({
      calendar: { url: connection.calendar_url },
      timeRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    });
    
    return [events.map](http://events.map)(event => this.parseICalEvent([event.data](http://event.data)));
  }
  
  async createEvent({
    supplierId,
    title,
    startTime,
    endTime,
    location,
    description,
    attendees = []
  }: CreateEventParams) {
    const client = await this.getClient(supplierId);
    const connection = await this.getConnection(supplierId);
    
    // Create iCalendar event
    const vcalendar = new ICAL.Component(['vcalendar', [], []]);
    vcalendar.updatePropertyWithValue('prodid', '-//WedSync//EN');
    vcalendar.updatePropertyWithValue('version', '2.0');
    
    const vevent = new ICAL.Component('vevent');
    const uid = `${uuidv4()}@[wedsync.app](http://wedsync.app)`;
    
    vevent.updatePropertyWithValue('uid', uid);
    vevent.updatePropertyWithValue('summary', title);
    vevent.updatePropertyWithValue('dtstart', ICAL.Time.fromJSDate(startTime));
    vevent.updatePropertyWithValue('dtend', ICAL.Time.fromJSDate(endTime));
    
    if (location) {
      vevent.updatePropertyWithValue('location', location);
    }
    
    if (description) {
      vevent.updatePropertyWithValue('description', description);
    }
    
    // Add attendees
    attendees.forEach(email => {
      const attendee = new [ICAL.Property](http://ICAL.Property)('attendee');
      attendee.setParameter('role', 'REQ-PARTICIPANT');
      attendee.setParameter('partstat', 'NEEDS-ACTION');
      attendee.setParameter('rsvp', 'TRUE');
      attendee.setValue(`mailto:${email}`);
      vevent.addProperty(attendee);
    });
    
    vcalendar.addSubcomponent(vevent);
    
    // Create event on server
    const response = await client.createCalendarObject({
      calendar: { url: connection.calendar_url },
      filename: `${uid}.ics`,
      iCalString: vcalendar.toString()
    });
    
    return { uid, etag: response.etag };
  }
  
  async updateEvent(supplierId: string, eventId: string, updates: any) {
    const client = await this.getClient(supplierId);
    const connection = await this.getConnection(supplierId);
    
    // Fetch existing event
    const existingEvent = await client.fetchCalendarObject({
      calendar: { url: connection.calendar_url },
      objectUrl: `${connection.calendar_url}/${eventId}.ics`
    });
    
    // Parse and update
    const ical = ICAL.parse([existingEvent.data](http://existingEvent.data));
    const vcalendar = new ICAL.Component(ical);
    const vevent = vcalendar.getFirstSubcomponent('vevent');
    
    // Apply updates
    if (updates.title) {
      vevent.updatePropertyWithValue('summary', updates.title);
    }
    if (updates.startTime) {
      vevent.updatePropertyWithValue('dtstart', ICAL.Time.fromJSDate(updates.startTime));
    }
    if (updates.endTime) {
      vevent.updatePropertyWithValue('dtend', ICAL.Time.fromJSDate(updates.endTime));
    }
    
    // Update on server
    await client.updateCalendarObject({
      calendarObject: {
        url: `${connection.calendar_url}/${eventId}.ics`,
        etag: existingEvent.etag
      },
      iCalString: vcalendar.toString()
    });
  }
  
  async syncCalendar(supplierId: string) {
    const client = await this.getClient(supplierId);
    const connection = await this.getConnection(supplierId);
    
    // Check if calendar changed using ctag
    const calendars = await client.fetchCalendars();
    const currentCalendar = calendars.find(cal => cal.url === connection.calendar_url);
    
    if (currentCalendar?.ctag === connection.ctag) {
      // No changes
      return { changed: false };
    }
    
    // Fetch changed events using sync-token if available
    let events;
    if (connection.sync_token) {
      events = await client.syncCalendarObjects({
        calendar: { url: connection.calendar_url },
        syncToken: connection.sync_token
      });
    } else {
      // Initial sync - get all events
      events = await client.fetchCalendarObjects({
        calendar: { url: connection.calendar_url }
      });
    }
    
    // Process events
    for (const event of events) {
      await this.processCalendarEvent(supplierId, event);
    }
    
    // Update sync state
    await supabase
      .from('apple_calendar_connections')
      .update({
        ctag: currentCalendar?.ctag,
        sync_token: events.syncToken,
        last_sync: new Date()
      })
      .eq('supplier_id', supplierId);
    
    return { changed: true, eventCount: events.length };
  }
  
  private parseICalEvent(icalString: string) {
    const jcal = ICAL.parse(icalString);
    const vcalendar = new ICAL.Component(jcal);
    const vevent = vcalendar.getFirstSubcomponent('vevent');
    
    return {
      uid: vevent.getFirstPropertyValue('uid'),
      title: vevent.getFirstPropertyValue('summary'),
      startTime: vevent.getFirstPropertyValue('dtstart').toJSDate(),
      endTime: vevent.getFirstPropertyValue('dtend').toJSDate(),
      location: vevent.getFirstPropertyValue('location'),
      description: vevent.getFirstPropertyValue('description'),
      attendees: vevent.getAllProperties('attendee').map(att => 
        att.getFirstValue().replace('mailto:', '')
      )
    };
  }
}
```

### 4. Availability Checking

```
async function checkAvailability(
  supplierId: string,
  date: Date,
  duration: number
) {
  const service = new AppleCalendarService();
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  
  const events = await service.getEvents(supplierId, dayStart, dayEnd);
  
  // Calculate free slots
  const busySlots = [events.map](http://events.map)(event => ({
    start: new Date(event.startTime),
    end: new Date(event.endTime)
  }));
  
  const availableSlots = [];
  let currentTime = new Date(date);
  currentTime.setHours(9, 0, 0, 0); // Start at 9 AM
  
  const endTime = new Date(date);
  endTime.setHours(18, 0, 0, 0); // End at 6 PM
  
  while (currentTime < endTime) {
    const slotEnd = new Date(currentTime.getTime() + duration * 60000);
    
    const isAvailable = !busySlots.some(busy => 
      (currentTime < busy.end && slotEnd > busy.start)
    );
    
    if (isAvailable && slotEnd <= endTime) {
      availableSlots.push({
        start: new Date(currentTime),
        end: slotEnd
      });
    }
    
    currentTime.setMinutes(currentTime.getMinutes() + 30);
  }
  
  return availableSlots;
}
```

## Critical Implementation Notes

1. **App-Specific Password**: Regular passwords won't work with 2FA enabled
2. **CalDAV Limitations**: No push notifications, must poll for changes
3. **Sync Strategy**: Use ctag/etag for efficient change detection
4. **Time Zones**: iCloud uses floating time by default, specify zones
5. **Rate Limiting**: Apple may throttle excessive requests
6. **Error Handling**: Handle network errors and authentication failures
7. **Privacy**: Only sync events user explicitly allows