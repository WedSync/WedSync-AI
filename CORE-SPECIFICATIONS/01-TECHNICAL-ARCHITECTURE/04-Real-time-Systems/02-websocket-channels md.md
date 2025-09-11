# 02-websocket-channels.md

## Purpose

Define channel structure for real-time communication between suppliers and couples using Supabase Realtime.

## Channel Structure

### Channel Naming Convention

```
// Pattern: {scope}:{entity}:{id}
- supplier:dashboard:{supplier_id}
- couple:dashboard:{couple_id} 
- form:responses:{form_id}
- journey:progress:{journey_id}
- collaboration:{supplier_id}:{couple_id}
```

### Channel Types

### Private Channels

- **User-specific**: Only accessible by authenticated user
- **Examples**: Personal dashboards, private messages
- **Auth**: Row Level Security enforced

### Shared Channels

- **Collaboration**: Supplier-couple shared workspace
- **Team channels**: Multiple team members (Scale+ tier)
- **Auth**: Junction table permissions

### Broadcast Channels

- **System announcements**: Platform-wide updates
- **Public updates**: Directory changes, new features
- **Auth**: Read-only for all authenticated users

## Event Types

### Form Events

```
form:updated - Form structure changed
form:response:new - New submission
form:response:updated - Submission edited
form:field:completed - Single field completed
```

### Journey Events

```
journey:step:completed - Step finished
journey:email:sent - Email delivered
journey:email:opened - Email opened
journey:task:due - Task reminder
```

### Collaboration Events

```
user:typing - Show typing indicator
user:online - Presence update
document:saved - Auto-save triggered
comment:added - New comment on item
```

## Implementation Strategy

### Connection Management

- Single WebSocket per user session
- Auto-reconnect with exponential backoff
- Heartbeat every 30 seconds
- Max 10 channels per connection

### Message Queuing

- Buffer messages during disconnection
- Replay last 100 messages on reconnect
- Dedupe by message ID
- TTL: 5 minutes for buffered messages

## Performance Optimization

### Subscription Limits

- Free tier: 3 concurrent channels
- Paid tiers: 10 concurrent channels
- Rate limit: 100 messages/minute per channel
- Payload size: Max 64KB per message

## Critical Considerations

- Always validate permissions before broadcasting
- Implement presence for collaboration features
- Use database triggers for critical events
- Batch updates within 100ms windows
- Monitor channel subscription counts