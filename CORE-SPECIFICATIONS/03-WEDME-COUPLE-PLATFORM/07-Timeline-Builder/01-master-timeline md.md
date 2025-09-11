# 01-master-timeline.md

## What to Build

Interactive timeline builder where couples create their complete wedding day schedule from preparation to send-off, with smart time calculations.

## Key Technical Requirements

### Timeline Data Model

```
interface MasterTimeline {
  id: string;
  couple_id: string;
  wedding_date: Date;
  timezone: string;
  events: {
    id: string;
    title: string;
    category: 'prep' | 'ceremony' | 'cocktail' | 'reception' | 'party';
    start_time: string; // '14:00'
    duration: number; // minutes
    location: string;
    notes?: string;
    supplier_assignments: string[];
    helper_assignments: string[];
    guest_visibility: boolean;
  }[];
  sunset_time?: string; // For photo planning
  buffer_time: number; // Minutes between events
}
```

### UI Components

- Drag-and-drop timeline blocks
- Time validation (no overlaps)
- Auto-calculate end times
- Visual timeline with hour markers
- Category color coding
- Print-friendly view
- Template library (Church wedding, Beach wedding, etc.)

## Critical Implementation Notes

- Import from venue's standard timeline
- Suggest timing based on guest count
- Weather/sunset API integration
- Conflict detection between events
- Mobile swipe to reorder events

## Timeline Calculations

```
const validateTimeline = (events: TimelineEvent[]) => {
  const conflicts = [];
  events.forEach((event, i) => {
    const endTime = addMinutes(event.start_time, event.duration);
    const nextEvent = events[i + 1];
    if (nextEvent && endTime > nextEvent.start_time) {
      conflicts.push({ event, nextEvent, overlap: diffMinutes(endTime, nextEvent.start_time) });
    }
  });
  return conflicts;
};
```