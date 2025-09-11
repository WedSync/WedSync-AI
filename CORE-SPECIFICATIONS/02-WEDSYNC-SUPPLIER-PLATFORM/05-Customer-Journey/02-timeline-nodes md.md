# 02-timeline-nodes.md

## Overview

Core building blocks that define when journey modules execute based on wedding timeline or fixed dates.

## Node Configuration

### Timing Types

```
interface TimelineNode {
  referencePoint: 'wedding_date' | 'booking_date' | 'fixed_date'
  offset: {
    value: number
    unit: 'days' | 'weeks' | 'months'
    direction: 'before' | 'after'
  }
  timeOfDay: string // '09:00', '14:30'
  timezone: 'client_local' | 'supplier_local' | 'utc'
}
```

### Common Timeline Points

- **6 months before**: Initial planning
- **3 months before**: Detailed coordination
- **6 weeks before**: Final preparations
- **1 week before**: Last checks
- **Day of**: Real-time coordination
- **1 week after**: Thank you & reviews
- **1 month after**: Albums & referrals

## Smart Scheduling Rules

### Business Logic

- Skip weekends for non-urgent comms
- Avoid holidays (configurable list)
- Respect supplier business hours
- Account for venue/timezone differences

### Collision Detection

```
// Prevent module overlap
if (existingModuleAt(calculatedTime)) {
  return findNextAvailableSlot(calculatedTime)
}
```

## Visual Representation

- Timeline nodes appear as vertical markers
- Color coding by proximity (red=urgent, green=future)
- Expandable to show attached modules
- Drag to adjust timing
- Lock option for critical dates

## Dynamic Adjustments

- Auto-adjust when wedding date changes
- Cascade updates to dependent nodes
- Preserve relative spacing
- Alert on conflicts