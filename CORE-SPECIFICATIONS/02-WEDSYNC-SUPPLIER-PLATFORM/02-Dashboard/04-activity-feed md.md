# 04-activity-feed.md

## Purpose

Real-time stream showing all client interactions and system events, providing suppliers instant visibility into engagement.

## Key Implementation Requirements

### Event Types to Track

```
interface ActivityEvent {
  // Communication Events
  - Email opened/clicked
  - SMS delivered/read
  - Form started/completed/abandoned
  
  // Platform Events  
  - Client dashboard login
  - Document downloaded
  - Meeting scheduled/rescheduled
  - Payment processed
  
  // Journey Events
  - Milestone reached
  - Automation triggered
  - Task completed
}
```

### Feed Display Rules

- **Chronological order**: Newest first
- **Grouping**: Batch similar events
- **Filtering**: By client, event type, date range
- **Pagination**: Load 20 items, infinite scroll

### Visual Design

- Icon-based event identification
- Color coding by event importance
- Relative timestamps ("2 hours ago")
- Client photo thumbnails
- Expandable details on click

### Real-time Architecture

- Supabase Realtime subscriptions
- Event deduplication logic
- Rate limiting for high-volume events
- Background sync for offline events

### Notification Integration

- Optional push notifications for key events
- Email digest summaries
- In-app notification badges
- Sound alerts for urgent items

## Critical Success Factors

- Sub-second event appearance
- No duplicate events
- Clear event attribution to clients
- Actionable insights from patterns