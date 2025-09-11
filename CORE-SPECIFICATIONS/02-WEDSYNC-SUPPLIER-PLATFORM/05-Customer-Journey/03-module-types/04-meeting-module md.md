# 04-meeting-module.md

## Overview

Automated meeting scheduling with calendar integration and video conferencing setup.

## Configuration

```
interface MeetingModule {
  type: 'meeting_request'
  config: {
    meetingType: 'consultation' | 'planning' | 'review'
    duration: number // minutes
    format: 'in_person' | 'video' | 'phone'
    availabilityWindow: DateRange
    location?: string
    videoProvider?: 'zoom' | 'google_meet' | 'teams'
    includeAgenda: boolean
    sendReminders: boolean
  }
}
```

## Scheduling Flow

1. Send availability options
2. Client selects time slot
3. Calendar event creation
4. Confirmation emails
5. Reminder sequence

## Calendar Integration

```
// Check availability
const availableSlots = await checkCalendar({
  duration: meeting.duration,
  between: meeting.availabilityWindow,
  excludeWeekends: true
})
```

## Video Setup

- Auto-generate meeting links
- Include in calendar invites
- Test link functionality
- Backup phone option

## Preparation

- Attach relevant documents
- Include agenda items
- Share previous notes
- Set discussion topics

## Follow-up

- Meeting notes capture
- Action items tracking
- Next steps automation
- Recording links (if applicable)