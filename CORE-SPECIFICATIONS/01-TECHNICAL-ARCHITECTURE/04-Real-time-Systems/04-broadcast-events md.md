# 04-broadcast-events.md

## Purpose

Implement system-wide event broadcasting for platform updates, notifications, and multi-user coordination.

## Broadcast Categories

### System Broadcasts

```
// Platform-wide announcements
- maintenance.scheduled
- maintenance.started
- maintenance.completed
- feature.released
- security.alert
```

### Business Broadcasts

```
// Supplier-specific events
- tier.upgraded
- tier.downgraded
- payment.required
- trial.ending
- usage.limit.approaching
```

### Collaboration Broadcasts

```
// Multi-user coordination
- form.locked (someone editing)
- journey.updated
- timeline.changed
- supplier.joined
- couple.connected
```

## Implementation Architecture

### Broadcast Hierarchy

```
1. Global (all users)
2. Segment (user type/tier)
3. Organization (team accounts)
4. Project (supplier-couple pair)
5. Individual (targeted user)
```

### Message Priority

- **Critical**: Security, payments, system down
- **High**: Feature changes, deadlines
- **Normal**: Updates, new content
- **Low**: Tips, suggestions, marketing

## Delivery Mechanisms

### Real-time Delivery

```
// Via Supabase Realtime
const channel = supabase
  .channel('broadcast:global')
  .on('broadcast', { event: '*' }, handleBroadcast)
  .subscribe()
```

### Fallback Delivery

- Store in notifications table if offline
- Email for critical broadcasts
- SMS for urgent payment issues
- Push notifications (mobile app)

## Broadcast Management

### Admin Controls

- Schedule broadcasts in advance
- Target by user segment
- A/B test message variations
- Track delivery and read rates

### User Controls

- Notification preferences by category
- Snooze non-critical broadcasts
- Unsubscribe from marketing
- Choose delivery channels

## Rate Limiting

### Broadcast Limits

- Global: Max 1 per hour
- Segment: Max 3 per day
- Individual: Max 10 per day
- Critical: No limits (use sparingly)

## Message Format

```json
{
  "id": "bcast_123",
  "type": "feature.released",
  "priority": "normal",
  "title": "New Feature: AI Form Builder",
  "message": "Create forms 10x faster...",
  "action": {
    "label": "Try Now",
    "url": "/forms/new"
  },
  "expires": "2024-12-31T23:59:59Z",
  "targeting": {
    "tiers": ["professional", "scale"],
    "userType": "supplier"
  }
}
```

## Critical Considerations

- Never broadcast sensitive user data
- Implement broadcast acknowledgment for critical messages
- Log all broadcasts for audit trail
- Test broadcasts on staging first
- Provide instant unsubscribe for non-critical messages