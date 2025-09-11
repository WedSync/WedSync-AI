# 04-ical-feeds.md

# iCal Feed Integration

## What to Build

Generate and consume iCal feeds for universal calendar integration, allowing suppliers to share calendars and import from any iCal-compatible source.

## Key Technical Requirements

### Database Schema

```
-- iCal feed configurations
CREATE TABLE ical_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  feed_name TEXT NOT NULL,
  feed_url TEXT UNIQUE,
  feed_token TEXT UNIQUE DEFAULT gen_random_uuid(),
  feed_type TEXT, -- 'export' or 'import'
  include_client_names BOOLEAN DEFAULT true,
  include_locations BOOLEAN DEFAULT true,
  include_descriptions BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  last_accessed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- External calendar subscriptions
CREATE TABLE ical_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  feed_url TEXT NOT NULL,
  feed_name TEXT,
  sync_frequency INTEGER DEFAULT 60, -- minutes
  last_sync TIMESTAMPTZ,
  last_etag TEXT,
  last_modified TEXT,
  is_active BOOLEAN DEFAULT true,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### iCal Generation Service

```
// services/ical-service.ts
import ical, { ICalCalendarMethod } from 'ical-generator';
import { createHash } from 'crypto';

export class ICalService {
  async generateFeed(supplierId: string, token: string): Promise<string> {
    // Verify token
    const feed = await this.getFeedByToken(token);
    if (!feed || feed.supplier_id !== supplierId) {
      throw new Error('Invalid feed token');
    }
    
    // Create calendar
    const calendar = ical({
      name: `${feed.feed_name} - WedSync`,
      description: 'Wedding bookings and appointments',
      timezone: 'Europe/London',
      prodId: {
        company: 'WedSync',
        product: 'Calendar Feed',
        language: 'EN'
      },
      method: ICalCalendarMethod.PUBLISH
    });
    
    // Get events
    const events = await this.getSupplierEvents(supplierId);
    
    // Add events to calendar
    for (const event of events) {
      const icalEvent = calendar.createEvent({
        id: [event.id](http://event.id),
        start: event.start_time,
        end: event.end_time,
        summary: this.formatEventTitle(event, feed),
        description: feed.include_descriptions ? event.description : undefined,
        location: feed.include_locations ? event.location : undefined,
        url: `${[process.env.NEXT](http://process.env.NEXT)_PUBLIC_APP_URL}/events/${[event.id](http://event.id)}`,
        organizer: {
          name: event.supplier_name,
          email: event.supplier_email
        },
        attendees: event.attendees?.map(email => ({ email })),
        categories: [event.type], // wedding, meeting, consultation
        status: event.status, // confirmed, tentative, cancelled
        busyStatus: 'BUSY',
        created: event.created_at,
        lastModified: event.updated_at
      });
      
      // Add custom properties
      icalEvent.x('X-WEDSYNC-CLIENT-ID', event.client_id);
      icalEvent.x('X-WEDSYNC-EVENT-TYPE', event.type);
    }
    
    // Update last accessed
    await this.updateFeedAccess([feed.id](http://feed.id));
    
    return calendar.toString();
  }
  
  private formatEventTitle(event: any, feed: any): string {
    if (!feed.include_client_names) {
      return `${event.type} Booking`;
    }
    return `${event.client_names} - ${event.type}`;
  }
}
```

### iCal Feed Endpoint

```
// app/api/calendar/feed/[token]/route.ts
export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const icalService = new ICalService();
    const feed = await icalService.getFeedByToken(params.token);
    
    if (!feed) {
      return new Response('Feed not found', { status: 404 });
    }
    
    const icalContent = await icalService.generateFeed(
      feed.supplier_id,
      params.token
    );
    
    // Set caching headers
    const etag = createHash('md5').update(icalContent).digest('hex');
    
    return new Response(icalContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="calendar.ics"`,
        'Cache-Control': 'private, max-age=300', // 5 minutes
        'ETag': etag,
        'Last-Modified': new Date().toUTCString()
      }
    });
  } catch (error) {
    return new Response('Error generating calendar', { status: 500 });
  }
}
```

### iCal Subscription Consumer

```
// services/ical-subscription-service.ts
import ICAL from 'ical.js';
import fetch from 'node-fetch';

export class ICalSubscriptionService {
  async syncSubscription(subscriptionId: string) {
    const subscription = await this.getSubscription(subscriptionId);
    
    try {
      // Fetch with conditional headers
      const headers: any = {};
      if (subscription.last_etag) {
        headers['If-None-Match'] = subscription.last_etag;
      }
      if (subscription.last_modified) {
        headers['If-Modified-Since'] = subscription.last_modified;
      }
      
      const response = await fetch(subscription.feed_url, { headers });
      
      // Check if not modified
      if (response.status === 304) {
        await this.updateSyncTime(subscriptionId);
        return { updated: false };
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const icalText = await response.text();
      const events = this.parseICalFeed(icalText);
      
      // Process events
      await this.processExternalEvents(subscription.supplier_id, events);
      
      // Update subscription metadata
      await supabase
        .from('ical_subscriptions')
        .update({
          last_sync: new Date(),
          last_etag: response.headers.get('etag'),
          last_modified: response.headers.get('last-modified'),
          error_count: 0,
          last_error: null
        })
        .eq('id', subscriptionId);
      
      return { updated: true, eventCount: events.length };
      
    } catch (error) {
      await this.handleSyncError(subscriptionId, error);
      throw error;
    }
  }
  
  private parseICalFeed(icalText: string): ParsedEvent[] {
    const jcal = ICAL.parse(icalText);
    const comp = new ICAL.Component(jcal);
    const events = comp.getAllSubcomponents('vevent');
    
    return [events.map](http://events.map)(vevent => {
      const event = new ICAL.Event(vevent);
      
      return {
        uid: event.uid,
        summary: event.summary,
        startDate: event.startDate.toJSDate(),
        endDate: event.endDate.toJSDate(),
        location: event.location,
        description: event.description,
        organizer: event.organizer,
        attendees: event.attendees,
        isRecurring: event.isRecurring(),
        recurrenceRule: event.component.getFirstPropertyValue('rrule')
      };
    });
  }
  
  private async processExternalEvents(
    supplierId: string,
    events: ParsedEvent[]
  ) {
    for (const event of events) {
      // Check for conflicts
      const conflicts = await this.checkConflicts(supplierId, event);
      
      if (conflicts.length > 0) {
        // Mark as tentative or notify
        await this.handleConflict(supplierId, event, conflicts);
      } else {
        // Import as blocked time
        await this.importAsBlockedTime(supplierId, event);
      }
    }
  }
  
  async scheduleAllSyncs() {
    const subscriptions = await supabase
      .from('ical_subscriptions')
      .select('*')
      .eq('is_active', true);
    
    for (const sub of [subscriptions.data](http://subscriptions.data) || []) {
      const nextSync = new Date(sub.last_sync || 0);
      nextSync.setMinutes(nextSync.getMinutes() + sub.sync_frequency);
      
      if (nextSync <= new Date()) {
        await this.syncSubscription([sub.id](http://sub.id));
      }
    }
  }
}
```

### Feed Management UI

```
// components/calendar/feed-manager.tsx
export function FeedManager({ supplierId }: { supplierId: string }) {
  const [feeds, setFeeds] = useState<ICalFeed[]>([]);
  
  const createFeed = async () => {
    const feed = await fetch('/api/calendar/feeds', {
      method: 'POST',
      body: JSON.stringify({
        supplier_id: supplierId,
        feed_name: 'My Wedding Bookings',
        include_client_names: true,
        include_locations: true
      })
    }).then(r => r.json());
    
    setFeeds([...feeds, feed]);
  };
  
  const copyFeedUrl = (feed: ICalFeed) => {
    const url = `${window.location.origin}/api/calendar/feed/${feed.feed_token}`;
    navigator.clipboard.writeText(url);
    toast.success('Feed URL copied!');
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3>Calendar Feeds</h3>
        <Button onClick={createFeed}>Create Feed</Button>
      </div>
      
      {[feeds.map](http://feeds.map)(feed => (
        <div key={[feed.id](http://feed.id)} className="border rounded p-4">
          <div className="flex justify-between">
            <div>
              <h4>{feed.feed_name}</h4>
              <p className="text-sm text-gray-500">
                Last accessed: {feed.last_accessed || 'Never'}
              </p>
            </div>
            <div className="space-x-2">
              <Button onClick={() => copyFeedUrl(feed)}>
                Copy URL
              </Button>
              <Button variant="outline">
                Settings
              </Button>
            </div>
          </div>
          
          <div className="mt-2 text-xs">
            <code className="bg-gray-100 px-2 py-1 rounded">
              webcal://{[window.location.host](http://window.location.host)}/api/calendar/feed/{feed.feed_token}
            </code>
          </div>
        </div>
      ))}
      
      <div className="mt-8">
        <h3>Subscribe to External Calendars</h3>
        <SubscriptionForm onAdd={handleAddSubscription} />
      </div>
    </div>
  );
}
```

### Recurring Events Support

```
function expandRecurringEvent(event: any, rrule: string, rangeStart: Date, rangeEnd: Date) {
  const rule = ICAL.Recur.fromString(rrule);
  const iterator = rule.iterator(ICAL.Time.fromJSDate(event.startDate));
  
  const occurrences = [];
  let next;
  
  while ((next = [iterator.next](http://iterator.next)())) {
    const occurrenceStart = next.toJSDate();
    
    if (occurrenceStart > rangeEnd) break;
    if (occurrenceStart < rangeStart) continue;
    
    const duration = event.endDate - event.startDate;
    const occurrenceEnd = new Date(occurrenceStart.getTime() + duration);
    
    occurrences.push({
      ...event,
      startDate: occurrenceStart,
      endDate: occurrenceEnd,
      uid: `${event.uid}-${occurrenceStart.getTime()}`
    });
  }
  
  return occurrences;
}
```

## Critical Implementation Notes

1. **Security**: Use random tokens, never expose internal IDs
2. **Privacy**: Allow control over what information is shared
3. **Caching**: Implement ETags to reduce bandwidth
4. **Time Zones**: Always include timezone information
5. **Compatibility**: Test with major calendar apps (Google, Outlook, Apple)
6. **Rate Limiting**: Prevent abuse of public feeds
7. **Error Handling**: Gracefully handle malformed iCal data