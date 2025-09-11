# 01-journey-canvas.md

## Overview

Node-based visual builder for creating automated customer journeys with drag-and-drop simplicity.

## Canvas Architecture

### Layout

- **Horizontal timeline**: Left to right flow
- **Swim lanes**: Parallel paths for A/B tests
- **Zoom controls**: 25% to 200% view
- **Mini-map**: Navigation for large journeys

### Node Types

```
interface JourneyNode {
  id: string
  type: 'timeline' | 'module' | 'condition' | 'split'
  position: { x: number, y: number }
  data: NodeData
  connections: Connection[]
}
```

## Timeline Anchors

### Reference Points

- **Booking date**: Journey start
- **Wedding date**: Primary anchor
- **Fixed dates**: Specific calendar dates
- **Relative dates**: "X days before/after"

### Smart Scheduling

```
// Skip weekends for business communications
if (skipWeekends && isWeekend(calculatedDate)) {
  return nextBusinessDay(calculatedDate)
}

// Respect business hours
if (scheduledTime < businessHours.start) {
  return businessHours.start
}
```

## Module Library

### Drag Sources

- **Communication**: Email, SMS, WhatsApp
- **Data Collection**: Forms, surveys
- **Scheduling**: Meeting requests
- **Content**: Info cards, documents
- **Engagement**: Reviews, referrals

### Drop Behavior

- Snap to timeline grid
- Auto-connect to nearest node
- Validation on drop (tier restrictions)
- Multi-select for bulk operations

## Visual Feedback

### Journey State

- **Draft**: Dotted lines, muted colors
- **Active**: Solid lines, full colors
- **Paused**: Yellow warning indicators
- **Completed**: Green checkmarks

### Execution Visualization

- Live progress indicators
- Success/failure badges
- Client avatars moving through journey
- Bottleneck highlighting

## Canvas Controls

- Save/Autosave every 30 seconds
- Version history with restore
- Clone journey for reuse
- Export/Import JSON structure
- Test mode with dummy data