# 06-wedding-day-module.md

## Purpose

Specialized dashboard module that appears 48 hours before any wedding, providing critical day-of information and logistics.

## Key Implementation Requirements

### Activation Rules

- Appears automatically 48 hours before wedding
- Replaces standard widgets on wedding day
- Multiple wedding handling for same day
- Timezone-aware calculations

### Core Information Display

```
interface WeddingDayData {
  // Logistics
  venue: Address & ContactInfo
  travelTime: GoogleMapsCalculation
  departureTime: TimeWithBuffer
  parkingInstructions: string
  
  // Schedule
  timeline: TimelineEvent[]
  currentEvent: HighlightedStatus
  nextEvent: CountdownTimer
  
  // Contacts
  coupleContacts: QuickDial[]
  venueCoordinator: ContactCard
  vendorTeam: SupplierList
  emergencyContacts: PriorityList
}
```

### Travel Intelligence

- Real-time traffic integration
- Alternative route suggestions
- Weather impact on travel time
- Historical venue traffic patterns

### Day-of Features

- Checklist with progress tracking
- Quick photo reference (shot list)
- Weather updates every 30 minutes
- Emergency vendor substitutes list

### Multi-Wedding Support

- Timeline conflict detection
- Travel time between venues
- Staggered reminder system
- Team member assignment display

## Critical Success Factors

- Zero-friction access to critical info
- Works offline once loaded
- Large touch targets for mobile use
- Print-friendly backup version