# 01-google-calendar.md

# Google Calendar Integration

## What to Build

Full integration with Google Calendar API for meeting scheduling, availability checking, and bidirectional event synchronization for wedding suppliers.

## Key Technical Requirements

### OAuth 2.0 Setup

```
// lib/integrations/google-calendar.ts
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  [process.env.GOOGLE](http://process.env.GOOGLE)_CLIENT_ID,
  [process.env.GOOGLE](http://process.env.GOOGLE)_CLIENT_SECRET,
  `${[process.env.NEXT](http://process.env.NEXT)_PUBLIC_APP_URL}/api/integrations/google/callback`
);

const SCOPES = [
  '[https://www.googleapis.com/auth/calendar](https://www.googleapis.com/auth/calendar)',
  '[https://www.googleapis.com/auth/calendar.events](https://www.googleapis.com/auth/calendar.events)',
  '[https://www.googleapis.com/auth/calendar.readonly](https://www.googleapis.com/auth/calendar.readonly)'
];

export { oauth2Client, SCOPES };
```

### Database Schema

```
-- Store Google Calendar credentials
CREATE TABLE google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  google_user_id TEXT UNIQUE,
  email TEXT,
  access_token TEXT ENCRYPTED,
  refresh_token TEXT ENCRYPTED,
  token_expiry TIMESTAMPTZ,
  calendar_id TEXT,
  calendar_name TEXT,
  sync_enabled BOOLEAN DEFAULT true,
  last_sync TIMESTAMPTZ,
  sync_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar events cache
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  google_event_id TEXT UNIQUE,
  title TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  location TEXT,
  description TEXT,
  attendees JSONB,
  is_wedding BOOLEAN DEFAULT false,
  client_id UUID REFERENCES clients(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Core Functions

### 1. Authorization Flow

```
// app/api/integrations/google/auth/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get('supplier_id');
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: supplierId // Pass supplier ID through OAuth flow
  });
  
  return NextResponse.redirect(authUrl);
}

// app/api/integrations/google/callback/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const supplierId = searchParams.get('state');
  
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  
  // Get user info
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  
  // Store credentials
  await supabase.from('google_calendar_connections').upsert({
    supplier_id: supplierId,
    google_user_id: [userInfo.data.id](http://userInfo.data.id),
    email: [userInfo.data.email](http://userInfo.data.email),
    access_token: encrypt(tokens.access_token),
    refresh_token: encrypt(tokens.refresh_token),
    token_expiry: new Date(tokens.expiry_date),
    calendar_id: [userInfo.data.email](http://userInfo.data.email) // Primary calendar
  });
  
  return NextResponse.redirect('/settings/integrations?connected=google');
}
```

### 2. Availability Checking

```
interface AvailabilityCheck {
  supplierId: string;
  date: Date;
  duration: number; // minutes
  workingHours?: { start: string; end: string };
}

export async function getAvailableSlots({
  supplierId,
  date,
  duration,
  workingHours = { start: '09:00', end: '18:00' }
}: AvailabilityCheck) {
  const auth = await getAuthClient(supplierId);
  const calendar = google.calendar({ version: 'v3', auth });
  
  const timeMin = new Date(date);
  timeMin.setHours(0, 0, 0, 0);
  
  const timeMax = new Date(date);
  timeMax.setHours(23, 59, 59, 999);
  
  // Get busy times
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: 'primary' }]
    }
  });
  
  const busySlots = [response.data](http://response.data).calendars.primary.busy || [];
  
  // Calculate free slots
  const slots = [];
  let currentTime = new Date(date);
  const [startHour, startMin] = workingHours.start.split(':');
  currentTime.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
  
  const endTime = new Date(date);
  const [endHour, endMin] = workingHours.end.split(':');
  endTime.setHours(parseInt(endHour), parseInt(endMin), 0, 0);
  
  while (currentTime < endTime) {
    const slotEnd = new Date(currentTime.getTime() + duration * 60000);
    
    // Check if slot overlaps with busy times
    const isAvailable = !busySlots.some(busy => {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);
      return (currentTime < busyEnd && slotEnd > busyStart);
    });
    
    if (isAvailable && slotEnd <= endTime) {
      slots.push({
        start: new Date(currentTime),
        end: slotEnd
      });
    }
    
    currentTime = new Date(currentTime.getTime() + 30 * 60000); // 30 min increments
  }
  
  return slots;
}
```

### 3. Event Creation

```
export async function createCalendarEvent({
  supplierId,
  clientId,
  title,
  startTime,
  endTime,
  location,
  description,
  attendees = [],
  sendNotifications = true
}: CreateEventParams) {
  const auth = await getAuthClient(supplierId);
  const calendar = google.calendar({ version: 'v3', auth });
  
  const event = {
    summary: title,
    location,
    description,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'Europe/London'
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'Europe/London'
    },
    attendees: [attendees.map](http://attendees.map)(email => ({ email })),
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 day
        { method: 'popup', minutes: 60 } // 1 hour
      ]
    },
    extendedProperties: {
      private: {
        wedsync_client_id: clientId,
        wedsync_supplier_id: supplierId
      }
    }
  };
  
  const response = await [calendar.events](http://calendar.events).insert({
    calendarId: 'primary',
    requestBody: event,
    sendNotifications
  });
  
  // Cache in local database
  await supabase.from('calendar_events').insert({
    supplier_id: supplierId,
    google_event_id: [response.data.id](http://response.data.id),
    title,
    start_time: startTime,
    end_time: endTime,
    location,
    description,
    attendees,
    client_id: clientId,
    is_wedding: title.toLowerCase().includes('wedding')
  });
  
  return [response.data](http://response.data);
}
```

### 4. Sync Service

```
export class GoogleCalendarSyncService {
  async syncEvents(supplierId: string) {
    const connection = await this.getConnection(supplierId);
    const auth = await this.getAuthClient(supplierId);
    const calendar = google.calendar({ version: 'v3', auth });
    
    try {
      // Use sync token for incremental sync
      const response = await [calendar.events](http://calendar.events).list({
        calendarId: 'primary',
        syncToken: connection.sync_token,
        maxResults: 250
      });
      
      // Process events
      for (const event of [response.data](http://response.data).items || []) {
        if (event.status === 'cancelled') {
          await this.deleteEvent([event.id](http://event.id));
        } else {
          await this.upsertEvent(supplierId, event);
        }
      }
      
      // Update sync token
      if ([response.data](http://response.data).nextSyncToken) {
        await supabase
          .from('google_calendar_connections')
          .update({
            sync_token: [response.data](http://response.data).nextSyncToken,
            last_sync: new Date()
          })
          .eq('supplier_id', supplierId);
      }
    } catch (error) {
      if (error.code === 410) {
        // Sync token expired, do full sync
        await this.fullSync(supplierId);
      }
      throw error;
    }
  }
}
```

## Critical Implementation Notes

1. **Token Refresh**: Implement automatic token refresh when access tokens expire
2. **Rate Limiting**: Google Calendar API quota is 1,000,000 queries/day but has per-user limits
3. **Webhook Alternative**: Use push notifications via Google Pub/Sub for real-time updates
4. **Time Zones**: Always handle timezone conversions properly
5. **Error Handling**: Implement exponential backoff for rate limit errors
6. **Privacy**: Only sync events marked as non-private
7. **Batch Operations**: Use batch API for multiple operations