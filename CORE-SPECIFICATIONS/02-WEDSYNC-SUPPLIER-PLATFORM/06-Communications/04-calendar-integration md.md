# 04-calendar-integration.md

## Overview

Multi-calendar sync system for availability management and meeting scheduling.

## Supported Calendars

```
interface CalendarProvider {
  type: 'google' | 'outlook' | 'apple' | 'ical'
  authMethod: 'oauth' | 'api_key' | 'ical_url'
  syncDirection: 'read' | 'write' | 'bidirectional'
  refreshInterval: number // minutes
}
```

## Google Calendar Integration

```
// OAuth setup
const googleAuth = new google.auth.OAuth2(
  clientId,
  clientSecret,
  redirectUrl
)

// Event creation
const event = {
  summary: 'Wedding Planning Meeting',
  location: 'Zoom',
  start: { dateTime: startTime },
  end: { dateTime: endTime },
  attendees: [{ email: clientEmail }],
  reminders: { useDefault: false, overrides: [...] }
}
```

## Availability Management

- Working hours configuration
- Buffer time between appointments
- Blocked dates/times
- Recurring availability patterns

## Conflict Detection

```
// Check for conflicts
function hasConflict(proposedTime: TimeSlot): boolean {
  return existingEvents.some(event => 
    overlaps(event, proposedTime)
  )
}
```

## Event Sync

- Real-time updates via webhooks
- Batch sync every 15 minutes
- Conflict resolution rules
- Deletion handling

## Multi-Calendar Views

- Unified availability across calendars
- Color coding by calendar
- Team calendar aggregation
- Public booking page generation