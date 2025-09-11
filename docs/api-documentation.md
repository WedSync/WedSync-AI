# WedSync Broadcast Events System - API Documentation

## API Overview
RESTful API documentation for WedSync's Broadcast Events System, enabling wedding industry stakeholders to send, receive, and manage real-time communications across all platforms.

## Base Configuration
```
Base URL: https://api.wedsync.com/v1
Authentication: Bearer Token (JWT)
Content-Type: application/json
Rate Limits: 1000 requests/minute per organization
```

## Authentication

### JWT Token Structure
```typescript
interface WedSyncJWT {
  sub: string;              // User ID
  org_id: string;           // Organization ID  
  wedding_id?: string;      // Current wedding context
  role: 'coordinator' | 'vendor' | 'venue' | 'couple';
  permissions: string[];    // Granular permissions
  exp: number;             // Expiration timestamp
}
```

### Authentication Header
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Wedding-Context: wedding_12345  // Optional: Set specific wedding context
```

## Broadcast Messages API

### Send Broadcast Message
Create and send a broadcast message to wedding stakeholders.

```http
POST /broadcast/messages
```

#### Request Body
```typescript
interface BroadcastMessageRequest {
  wedding_id: string;
  title: string;
  content: string;
  priority: 'emergency' | 'high' | 'normal' | 'low';
  channels: ('email' | 'sms' | 'push' | 'slack')[];
  recipients: {
    recipient_type: 'all' | 'coordinators' | 'vendors' | 'couple' | 'family' | 'custom';
    recipient_ids?: string[];  // Required if recipient_type is 'custom'
  };
  schedule_at?: string;        // ISO 8601 timestamp for scheduled messages
  expires_at?: string;         // Message expiration time
  attachments?: {
    type: 'image' | 'document' | 'link';
    url: string;
    filename?: string;
  }[];
  metadata?: {
    venue_emergency?: boolean;
    timeline_change?: boolean;
    vendor_update?: boolean;
    [key: string]: any;
  };
}
```

#### Response
```typescript
interface BroadcastMessageResponse {
  message_id: string;
  status: 'sent' | 'scheduled' | 'queued';
  recipients_count: number;
  estimated_delivery: string; // ISO 8601 timestamp
  channels_used: string[];
  created_at: string;
  tracking_url: string;
}
```

#### Example Request
```bash
curl -X POST https://api.wedsync.com/v1/broadcast/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "wedding_id": "wedding_12345",
    "title": "Venue Update - Weather Contingency Plan",
    "content": "Due to weather forecast, we are activating the indoor ceremony backup plan. All stakeholders please confirm receipt.",
    "priority": "high",
    "channels": ["email", "sms", "slack"],
    "recipients": {
      "recipient_type": "all"
    },
    "metadata": {
      "venue_emergency": true,
      "requires_acknowledgment": true
    }
  }'
```

#### Example Response
```json
{
  "message_id": "msg_67890",
  "status": "sent",
  "recipients_count": 23,
  "estimated_delivery": "2024-06-15T14:02:00Z",
  "channels_used": ["email", "sms", "slack"],
  "created_at": "2024-06-15T14:00:00Z",
  "tracking_url": "https://app.wedsync.com/messages/msg_67890/tracking"
}
```

### Get Message Status
Retrieve delivery status and engagement metrics for a broadcast message.

```http
GET /broadcast/messages/{message_id}/status
```

#### Response
```typescript
interface MessageStatusResponse {
  message_id: string;
  overall_status: 'delivering' | 'delivered' | 'failed' | 'expired';
  sent_at: string;
  delivery_summary: {
    total_recipients: number;
    delivered: number;
    failed: number;
    pending: number;
    bounced: number;
  };
  engagement_metrics: {
    opened: number;
    clicked: number;
    acknowledged: number;
    replied: number;
  };
  channel_breakdown: {
    channel: string;
    sent: number;
    delivered: number;
    failed: number;
    engagement_rate: number;
  }[];
  recipient_details: {
    recipient_id: string;
    recipient_name: string;
    channels: {
      channel: string;
      status: 'sent' | 'delivered' | 'bounced' | 'failed';
      delivered_at?: string;
      opened_at?: string;
      acknowledged_at?: string;
    }[];
  }[];
}
```

### List Broadcast Messages
Retrieve broadcast messages for a wedding with filtering and pagination.

```http
GET /broadcast/messages?wedding_id={wedding_id}&limit=50&offset=0
```

#### Query Parameters
- `wedding_id` (required): Wedding identifier
- `limit` (optional): Number of messages per page (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `priority` (optional): Filter by message priority
- `channel` (optional): Filter by communication channel
- `date_from` (optional): Filter messages from date (ISO 8601)
- `date_to` (optional): Filter messages to date (ISO 8601)
- `status` (optional): Filter by delivery status

#### Response
```typescript
interface MessageListResponse {
  messages: {
    message_id: string;
    title: string;
    priority: string;
    status: string;
    recipients_count: number;
    created_at: string;
    channels_used: string[];
    sender: {
      user_id: string;
      name: string;
      role: string;
    };
  }[];
  pagination: {
    total_count: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}
```

## Recipients Management API

### Get Wedding Recipients
Retrieve all potential message recipients for a wedding.

```http
GET /broadcast/weddings/{wedding_id}/recipients
```

#### Response
```typescript
interface RecipientsResponse {
  wedding_id: string;
  recipient_groups: {
    group_name: 'coordinators' | 'vendors' | 'couple' | 'family' | 'venue_staff';
    recipients: {
      recipient_id: string;
      name: string;
      role: string;
      contact_methods: {
        email?: string;
        phone?: string;
        slack_user_id?: string;
      };
      preferences: {
        email_enabled: boolean;
        sms_enabled: boolean;
        push_enabled: boolean;
        slack_enabled: boolean;
        emergency_only: boolean;
      };
      last_seen: string;
      timezone: string;
    }[];
  }[];
  total_recipients: number;
}
```

### Update Recipient Preferences
Update communication preferences for a wedding stakeholder.

```http
PATCH /broadcast/recipients/{recipient_id}/preferences
```

#### Request Body
```typescript
interface RecipientPreferencesUpdate {
  email_enabled?: boolean;
  sms_enabled?: boolean;
  push_enabled?: boolean;
  slack_enabled?: boolean;
  emergency_only?: boolean;
  quiet_hours?: {
    enabled: boolean;
    start_time: string; // "22:00"
    end_time: string;   // "08:00"
    timezone: string;
  };
  preferred_language?: 'en' | 'es' | 'fr' | 'de';
}
```

## Emergency Protocols API

### Trigger Emergency Alert
Activate emergency broadcasting protocol with highest priority delivery.

```http
POST /broadcast/emergency
```

#### Request Body
```typescript
interface EmergencyAlertRequest {
  wedding_id: string;
  emergency_type: 'venue_issue' | 'weather' | 'vendor_emergency' | 'medical' | 'security' | 'other';
  title: string;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  coordinator_contact: {
    name: string;
    phone: string;
    email: string;
  };
  backup_plan?: string;
  estimated_resolution?: string; // ISO 8601 timestamp
  follow_up_schedule?: string[]; // Array of ISO 8601 timestamps
  required_acknowledgments: boolean;
}
```

#### Response
```typescript
interface EmergencyAlertResponse {
  alert_id: string;
  broadcast_message_id: string;
  status: 'activated' | 'escalated';
  recipients_notified: number;
  acknowledgments_required: number;
  estimated_full_delivery: string;
  escalation_timeline: {
    level: number;
    trigger_time: string;
    actions: string[];
  }[];
}
```

### Get Emergency Status
Monitor emergency alert progress and acknowledgments.

```http
GET /broadcast/emergency/{alert_id}/status
```

## Templates API

### List Message Templates
Retrieve available message templates for wedding communications.

```http
GET /broadcast/templates?category=venue&language=en
```

#### Response
```typescript
interface TemplatesResponse {
  templates: {
    template_id: string;
    name: string;
    category: 'venue' | 'timeline' | 'vendor' | 'emergency' | 'general';
    subject: string;
    content_preview: string;
    variables: {
      name: string;
      type: 'string' | 'date' | 'number' | 'boolean';
      required: boolean;
      description: string;
    }[];
    supported_channels: string[];
    language: string;
  }[];
}
```

### Create Custom Template
Create a custom message template for organization use.

```http
POST /broadcast/templates
```

#### Request Body
```typescript
interface CreateTemplateRequest {
  name: string;
  category: string;
  subject: string;
  email_content?: string;
  sms_content?: string;
  slack_content?: string;
  variables: {
    name: string;
    type: 'string' | 'date' | 'number' | 'boolean';
    required: boolean;
    description: string;
    default_value?: any;
  }[];
  organization_only: boolean;
}
```

## Analytics & Reporting API

### Get Communication Analytics
Retrieve communication effectiveness metrics for a wedding.

```http
GET /broadcast/analytics/weddings/{wedding_id}?period=30d
```

#### Response
```typescript
interface CommunicationAnalytics {
  wedding_id: string;
  period: {
    start_date: string;
    end_date: string;
  };
  summary: {
    total_messages: number;
    total_recipients_reached: number;
    average_delivery_time: number; // seconds
    overall_engagement_rate: number;
    emergency_alerts: number;
  };
  channel_performance: {
    channel: string;
    messages_sent: number;
    delivery_rate: number;
    engagement_rate: number;
    average_response_time: number;
  }[];
  peak_usage_times: {
    hour: number;
    message_count: number;
    engagement_rate: number;
  }[];
  recipient_engagement: {
    recipient_id: string;
    name: string;
    messages_received: number;
    engagement_score: number;
    preferred_channel: string;
    response_time_avg: number;
  }[];
}
```

## WebSocket Real-time Updates

### Connection Endpoint
```
WSS: wss://api.wedsync.com/v1/broadcast/ws
```

### Authentication
```javascript
const websocket = new WebSocket('wss://api.wedsync.com/v1/broadcast/ws', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});
```

### Message Types

#### Subscribe to Wedding Events
```typescript
interface SubscriptionMessage {
  type: 'subscribe';
  wedding_id: string;
  event_types: ('new_message' | 'delivery_update' | 'emergency_alert' | 'acknowledgment')[];
}
```

#### Real-time Message Delivery Updates
```typescript
interface DeliveryUpdateEvent {
  type: 'delivery_update';
  message_id: string;
  recipient_id: string;
  channel: string;
  status: 'sent' | 'delivered' | 'failed' | 'bounced';
  timestamp: string;
}
```

#### Emergency Alert Broadcast
```typescript
interface EmergencyAlertEvent {
  type: 'emergency_alert';
  alert_id: string;
  wedding_id: string;
  severity: 'critical' | 'major' | 'minor';
  title: string;
  description: string;
  coordinator_contact: ContactInfo;
  acknowledgment_required: boolean;
  expires_at?: string;
}
```

## Error Handling

### Error Response Format
```typescript
interface APIError {
  error: {
    code: string;
    message: string;
    details?: {
      field: string;
      issue: string;
    }[];
    request_id: string;
    timestamp: string;
  };
}
```

### Common Error Codes

#### Authentication Errors
- `AUTH_001`: Invalid or expired JWT token
- `AUTH_002`: Insufficient permissions for resource
- `AUTH_003`: Wedding context not accessible

#### Validation Errors
- `VAL_001`: Required field missing
- `VAL_002`: Invalid field format
- `VAL_003`: Recipient limit exceeded

#### Business Logic Errors
- `BIZ_001`: Wedding not found or archived
- `BIZ_002`: Recipients not available for wedding
- `BIZ_003`: Message quota exceeded for billing tier

#### Rate Limiting
- `RATE_001`: Too many requests per minute
- `RATE_002`: Daily quota exceeded
- `RATE_003`: Emergency protocol cooldown active

#### Integration Errors
- `INT_001`: Email service temporarily unavailable
- `INT_002`: SMS service rate limit exceeded
- `INT_003`: External service authentication failed

### Error Handling Best Practices
```typescript
// Retry logic for transient failures
async function sendBroadcastWithRetry(messageData: BroadcastMessageRequest, retries = 3): Promise<BroadcastMessageResponse> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await sendBroadcastMessage(messageData);
    } catch (error) {
      if (error.code === 'INT_001' && attempt < retries) {
        // Wait with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw error;
    }
  }
}
```

## SDK Examples

### JavaScript/TypeScript SDK
```typescript
import { WedSyncBroadcastClient } from '@wedsync/broadcast-sdk';

const client = new WedSyncBroadcastClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.wedsync.com/v1'
});

// Send emergency alert
const emergencyAlert = await client.emergency.trigger({
  wedding_id: 'wedding_12345',
  emergency_type: 'venue_issue',
  title: 'Power Outage at Venue',
  description: 'Backup power activated. Ceremony will proceed as planned.',
  severity: 'major',
  coordinator_contact: {
    name: 'Sarah Johnson',
    phone: '+1-555-0123',
    email: 'sarah@weddingcoord.com'
  }
});

// Monitor delivery status
const status = await client.messages.getStatus(emergencyAlert.broadcast_message_id);
console.log(`Delivered to ${status.delivery_summary.delivered} of ${status.delivery_summary.total_recipients} recipients`);
```

### Python SDK
```python
from wedsync_sdk import BroadcastClient

client = BroadcastClient(api_key='your-api-key')

# Send scheduled reminder
message_response = client.messages.send({
    'wedding_id': 'wedding_12345',
    'title': '24 Hour Wedding Reminder',
    'content': 'Your wedding is tomorrow! Final details attached.',
    'priority': 'high',
    'channels': ['email', 'sms'],
    'recipients': {'recipient_type': 'all'},
    'schedule_at': '2024-06-14T18:00:00Z'
})

print(f"Message scheduled: {message_response['message_id']}")
```

## Rate Limits & Quotas

### Rate Limits by Tier
- **Free**: 100 messages/day, 10 requests/minute
- **Starter**: 1,000 messages/day, 60 requests/minute  
- **Professional**: 10,000 messages/day, 300 requests/minute
- **Scale**: 50,000 messages/day, 1,000 requests/minute
- **Enterprise**: Unlimited messages, 5,000 requests/minute

### Emergency Override
Emergency alerts bypass rate limits and quotas but require justification for audit purposes.

---

**API Version**: v1.0  
**Last Updated**: January 2025  
**Support**: api-support@wedsync.com  
**Status Page**: https://status.wedsync.com