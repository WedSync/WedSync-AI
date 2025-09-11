# 05-meeting-scheduler.md

## Overview

Automated meeting scheduling with client self-service booking and video conferencing integration.

## Booking Page Configuration

```
interface BookingPage {
  url: string // Custom slug
  title: string
  description: string
  meetingTypes: MeetingType[]
  availability: AvailabilityRules
  branding: BrandingConfig
}
```

## Meeting Types

```
interface MeetingType {
  name: 'consultation' | 'planning' | 'venue_visit' | 'custom'
  duration: number // minutes
  price?: number // Optional paid consultations
  location: {
    type: 'in_person' | 'phone' | 'video'
    details?: string // Address or video link
  }
  bufferBefore: number
  bufferAfter: number
}
```

## Scheduling Flow

1. Client selects meeting type
2. Available slots displayed
3. Client picks time
4. Form for additional info
5. Confirmation email sent
6. Calendar events created
7. Reminder sequence triggered

## Video Integration

```
// Auto-generate video links
const videoProviders = {
  zoom: generateZoomLink,
  googleMeet: generateMeetLink,
  teams: generateTeamsLink
}
```

## Smart Scheduling

- Time zone detection
- Daylight savings handling
- Holiday awareness
- Weather-based rescheduling

## Group Scheduling

- Multiple attendee coordination
- Voting on times
- Automatic consensus finding
- Round-robin assignment for team