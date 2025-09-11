# 03-presence-tracking.md

## Purpose

Show real-time user activity status for enhanced collaboration between suppliers and couples.

## Presence States

### User Status Types

```
type PresenceStatus = 
  | 'online'     // Active in last 2 minutes
  | 'idle'       // Active in last 10 minutes
  | 'away'       // No activity for 10+ minutes
  | 'offline'    // Disconnected
  | 'busy'       // In meeting/call (manual)
```

### Activity Indicators

```
type Activity = {
  status: PresenceStatus
  lastSeen: timestamp
  currentPage?: string  // What they're viewing
  isTyping?: boolean    // For forms/messages
  device?: 'desktop' | 'mobile' | 'tablet'
}
```

## Implementation Details

### Presence Tracking Events

- **Page navigation**: Update currentPage
- **Mouse movement**: Reset idle timer
- **Keyboard activity**: Mark as typing
- **Window focus/blur**: Update online/away
- **Mobile app background**: Mark as away

### Storage Strategy

```
-- Use Supabase Realtime Presence
-- No database persistence (in-memory only)
-- Clear on disconnect
-- 2-minute timeout for stale presence
```

## UI Components

### Presence Indicators

- Green dot: Online/active
- Yellow dot: Idle
- Gray dot: Away/offline
- Red dot: Busy/do not disturb

### Where to Show Presence

- Client list (suppliers see couple status)
- Form responses (real-time collaboration)
- Chat/comments (typing indicators)
- Team dashboard (Scale+ tiers)

## Privacy Controls

### Visibility Settings

- **Always visible**: Team members (same organization)
- **During collaboration**: Active supplier-couple pairs
- **Never visible**: Competitors, other couples
- **Optional**: Can disable in privacy settings

### Data Retention

- Presence data: Not persisted
- Last seen: Store for 7 days
- Activity logs: 30 days (Enterprise only)

## Performance Optimization

### Batching Updates

- Debounce presence updates (2-second minimum)
- Batch multiple users in single broadcast
- Only send changes, not full state
- Limit to 50 presence subscriptions

## Critical Considerations

- Respect user privacy preferences
- Handle timezone differences gracefully
- Clear presence on logout/timeout
- Don't show presence for inactive accounts
- Provide 'appear offline' option for users