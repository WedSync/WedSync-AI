# 06-webhook-endpoints.md

## Purpose

Enable real-time event notifications to external systems and internal services for critical platform events.

## Webhook Architecture

### Event Types

```
// Critical events to expose
- client.created
- client.invited
- form.submitted
- form.completed
- journey.started
- journey.completed
- payment.succeeded
- payment.failed
- supplier.upgraded
- couple.connected
```

### Webhook Payload Structure

```json
{
  "id": "evt_unique_id",
  "type": "form.submitted",
  "created": "2024-01-15T10:00:00Z",
  "data": {
    "object": { /* event specific data */ }
  },
  "api_version": "v1"
}
```

## Security Implementation

### Webhook Signing

- HMAC-SHA256 signatures for verification
- Rotating secrets with overlap period
- Timestamp validation (5-minute window)

### Retry Logic

- Exponential backoff: 1, 2, 4, 8, 16 minutes
- Max 5 retry attempts
- Dead letter queue for failed webhooks
- Manual replay capability

## Endpoint Management

### Registration System

- URL validation with test payload
- Event type subscription selection
- Active/inactive status toggle
- Multiple endpoints per account

### Monitoring

- Success/failure rates per endpoint
- Average response time tracking
- Automatic disable after 10 consecutive failures
- Alert on high failure rates

## Implementation Details

### Queue System

- Use Supabase Edge Functions for delivery
- Batch events where possible
- Priority queue for critical events
- Dedupe within 1-minute window

## Critical Considerations

- Never include sensitive data in webhooks
- Always use HTTPS endpoints
- Implement idempotency keys
- Rate limit webhook deliveries (100/min per endpoint)
- Provide webhook testing tools in dashboard