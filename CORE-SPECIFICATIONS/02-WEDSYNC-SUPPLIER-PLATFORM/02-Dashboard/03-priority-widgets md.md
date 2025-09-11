# 03-priority-widgets.md

## Purpose

Dynamic dashboard widgets that surface the most important information based on context and urgency.

## Key Implementation Requirements

### Widget Types

### Today's Tasks Widget

- Forms due today (sorted by deadline)
- Scheduled meetings with join links
- Journey milestones triggering today
- Manual tasks marked for today

### Client Activity Widget

- Recent form submissions
- Email opens and link clicks
- Dashboard logins by couples
- Journey progression updates

### Wedding Countdown Widget

- Next wedding date/time/location
- Travel time calculation with traffic
- Weather forecast integration
- Key contacts quick dial

### Performance Metrics Widget

- Weekly stats comparison
- Form completion rates
- Client satisfaction scores
- Response time averages

### Priority Algorithm

```
// Factors determining widget prominence:
1. Temporal urgency (due today > due this week)
2. Client value (high-tier packages prioritized)
3. Completion impact (blocking other tasks)
4. Historical engagement patterns
```

### Widget States

- **Expanded**: Full information display
- **Collapsed**: Summary only
- **Alert**: Red border for urgent items
- **Completed**: Greyed out with strikethrough

### Real-time Updates

- WebSocket subscriptions for live data
- Optimistic UI updates
- Conflict resolution for concurrent edits
- Offline queue for actions

## Critical Success Factors

- Instant visibility of urgent items
- No critical information below fold
- Clear visual hierarchy
- One-click actions from widgets