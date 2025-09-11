# Calendar Integration API Reference
*WedSync Calendar API - Technical Documentation for Developers*

## 📋 Table of Contents
1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [OAuth Endpoints](#oauth-endpoints)
4. [Calendar Management](#calendar-management)
5. [Event Synchronization](#event-synchronization)
6. [Webhook Endpoints](#webhook-endpoints)
7. [Error Handling](#error-handling)
8. [SDKs and Libraries](#sdks-and-libraries)
9. [Testing](#testing)

---

## Authentication

All WedSync Calendar API endpoints require authentication using either session tokens (for web) or API keys (for server-to-server).

### Session-based Authentication
```http
Authorization: Bearer <session_token>
```

### API Key Authentication
```http
X-API-Key: <api_key>
X-Vendor-ID: <vendor_id>
```

### Getting API Credentials
1. Log into WedSync dashboard
2. Navigate to **Settings** → **API Access**
3. Generate new API key with calendar permissions

---

## Rate Limiting

API rate limits protect against abuse and ensure reliable service for all vendors:

| Plan Level | Requests/Minute | Burst Limit |
|------------|----------------|-------------|
| **Starter** | 100 | 200 |
| **Professional** | 500 | 1000 |
| **Scale** | 2000 | 4000 |
| **Enterprise** | 10000 | 20000 |

### Rate Limit Headers
```http
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 487
X-RateLimit-Reset: 1640995200
X-RateLimit-Retry-After: 60
```

### Rate Limit Exceeded Response
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "API rate limit exceeded",
    "retryAfter": 60,
    "limit": 500,
    "remaining": 0,
    "resetTime": "2024-06-15T14:30:00Z"
  }
}
```

---

## OAuth Endpoints

### Initiate OAuth Flow

Start OAuth authorization flow for calendar providers.

```http
POST /api/calendar/oauth/initiate
```

**Request Body:**
```json
{
  "provider": "google|outlook|apple",
  "scopes": ["calendar.events", "calendar.readonly"],
  "redirectUri": "https://your-app.com/oauth/callback",
  "state": "vendor_<vendor_id>_<random_string>"
}
```

**Response:**
```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/oauth/authorize?client_id=...",
  "state": "vendor_abc123_xyz789",
  "expiresAt": "2024-06-15T14:35:00Z"
}
```

**Supported Scopes:**

| Provider | Scope | Description |
|----------|-------|-------------|
| **Google** | `calendar.events` | Create/update calendar events |
| **Google** | `calendar.readonly` | Read calendar for conflicts |
| **Outlook** | `Calendars.ReadWrite` | Full calendar access |
| **Apple** | `calendar` | Calendar access via CalDAV |

### Handle OAuth Callback

Process OAuth authorization code and store tokens.

```http
POST /api/calendar/oauth/callback
```

**Request Body:**
```json
{
  "provider": "google",
  "code": "4/0AX4XfWjYm9...",
  "state": "vendor_abc123_xyz789",
  "redirectUri": "https://your-app.com/oauth/callback"
}
```

**Success Response:**
```json
{
  "success": true,
  "connectionId": "conn_1234567890",
  "provider": "google",
  "userEmail": "photographer@gmail.com",
  "calendarName": "Photography Business",
  "connectedAt": "2024-06-15T14:30:00Z",
  "permissions": ["calendar.events", "calendar.readonly"],
  "status": "active"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "OAUTH_ERROR",
  "message": "Authorization code is invalid or expired",
  "provider": "google",
  "errorCode": "invalid_grant"
}
```

### Refresh OAuth Token

Automatically refresh expired access tokens.

```http
POST /api/calendar/oauth/refresh
```

**Request Body:**
```json
{
  "connectionId": "conn_1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "ya29.new_token...",
  "expiresAt": "2024-06-15T15:30:00Z",
  "refreshed": true
}
```

---

## Calendar Management

### List Calendar Connections

Retrieve all connected calendar providers for a vendor.

```http
GET /api/calendar/connections
```

**Response:**
```json
{
  "success": true,
  "connections": [
    {
      "id": "conn_1234567890",
      "provider": "google",
      "userEmail": "photographer@gmail.com",
      "calendarName": "Photography Business",
      "status": "active",
      "lastSync": "2024-06-15T14:25:00Z",
      "permissions": ["calendar.events", "calendar.readonly"],
      "connectedAt": "2024-06-15T10:00:00Z"
    },
    {
      "id": "conn_0987654321",
      "provider": "outlook",
      "userEmail": "studio@outlook.com",
      "calendarName": "Wedding Studio",
      "status": "active",
      "lastSync": "2024-06-15T14:23:00Z",
      "permissions": ["Calendars.ReadWrite"],
      "connectedAt": "2024-06-14T16:30:00Z"
    }
  ],
  "total": 2
}
```

### Get Connection Status

Check the status of a specific calendar connection.

```http
GET /api/calendar/connections/{connectionId}
```

**Response:**
```json
{
  "success": true,
  "connection": {
    "id": "conn_1234567890",
    "provider": "google",
    "status": "active",
    "lastSync": "2024-06-15T14:25:00Z",
    "nextSync": "2024-06-15T14:30:00Z",
    "syncStatus": "up_to_date",
    "eventCount": 42,
    "lastError": null,
    "healthScore": 100
  }
}
```

**Connection Statuses:**
- `active`: Working normally
- `expired`: Tokens expired, refresh needed
- `error`: Sync errors, manual intervention required
- `disconnected`: User disconnected the calendar
- `rate_limited`: Temporarily rate limited by provider

### Update Connection Settings

Modify calendar connection preferences.

```http
PATCH /api/calendar/connections/{connectionId}
```

**Request Body:**
```json
{
  "autoSync": true,
  "syncDirection": "push|pull|bidirectional",
  "syncFrequency": "immediate|hourly|daily",
  "eventTypes": ["wedding", "consultation", "preparation"],
  "notifications": true,
  "conflictResolution": "warn|block|override"
}
```

### Disconnect Calendar

Remove calendar connection and revoke access.

```http
DELETE /api/calendar/connections/{connectionId}
```

**Response:**
```json
{
  "success": true,
  "message": "Calendar disconnected successfully",
  "revokedAt": "2024-06-15T14:30:00Z",
  "cleanupStatus": "completed"
}
```

---

## Event Synchronization

### Sync Wedding Timeline

Synchronize complete wedding timeline to calendar.

```http
POST /api/calendar/sync/timeline
```

**Request Body:**
```json
{
  "weddingId": "wedding_abc123",
  "connectionId": "conn_1234567890",
  "events": [
    {
      "id": "timeline_event_1",
      "title": "Johnson Wedding - Ceremony Photography",
      "description": "Wedding photography for Emma & James Johnson",
      "startTime": "2024-06-15T14:00:00Z",
      "endTime": "2024-06-15T15:00:00Z",
      "location": {
        "name": "Grand Hotel Ballroom",
        "address": "123 Wedding Lane, City, State 12345",
        "coordinates": {
          "latitude": 40.7128,
          "longitude": -74.0060
        }
      },
      "eventType": "wedding_ceremony",
      "priority": "high",
      "attendees": [
        {
          "email": "emma.johnson@example.com",
          "name": "Emma Johnson",
          "role": "bride"
        }
      ],
      "reminders": [
        { "method": "popup", "minutes": 60 },
        { "method": "email", "minutes": 1440 }
      ],
      "metadata": {
        "vendorType": "photographer",
        "packageType": "premium",
        "specialInstructions": "Bride prefers candid shots"
      }
    }
  ],
  "options": {
    "overwriteExisting": false,
    "createOnly": true,
    "batchSize": 10,
    "enableConflictDetection": true
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "syncId": "sync_xyz789",
  "status": "completed",
  "summary": {
    "totalEvents": 1,
    "successful": 1,
    "failed": 0,
    "skipped": 0,
    "conflicts": 0
  },
  "syncedEvents": [
    {
      "timelineEventId": "timeline_event_1",
      "calendarEventId": "google_event_abc123",
      "status": "synced",
      "syncedAt": "2024-06-15T14:30:00Z"
    }
  ],
  "completedAt": "2024-06-15T14:30:15Z",
  "duration": 15000
}
```

**Conflict Response:**
```json
{
  "success": true,
  "status": "completed_with_conflicts",
  "conflicts": [
    {
      "timelineEventId": "timeline_event_1",
      "conflictType": "time_overlap",
      "severity": "warning",
      "existingEvent": {
        "title": "Smith Wedding - Photography",
        "startTime": "2024-06-15T13:30:00Z",
        "endTime": "2024-06-15T15:30:00Z"
      },
      "overlapDuration": 3600,
      "resolutionOptions": [
        {
          "action": "adjust_time",
          "suggestedStartTime": "2024-06-15T15:30:00Z",
          "suggestedEndTime": "2024-06-15T16:30:00Z"
        },
        {
          "action": "split_time",
          "suggestedSlots": [
            {
              "startTime": "2024-06-15T13:00:00Z",
              "endTime": "2024-06-15T13:30:00Z"
            },
            {
              "startTime": "2024-06-15T15:30:00Z",
              "endTime": "2024-06-15T16:00:00Z"
            }
          ]
        }
      ]
    }
  ]
}
```

### Get Sync Status

Check the status of a timeline synchronization.

```http
GET /api/calendar/sync/{syncId}/status
```

**Response:**
```json
{
  "success": true,
  "sync": {
    "id": "sync_xyz789",
    "status": "in_progress|completed|failed",
    "progress": 75,
    "startedAt": "2024-06-15T14:30:00Z",
    "estimatedCompletion": "2024-06-15T14:31:00Z",
    "eventsProcessed": 15,
    "totalEvents": 20,
    "errors": [],
    "warnings": []
  }
}
```

### Update Single Event

Update a specific calendar event.

```http
PUT /api/calendar/events/{calendarEventId}
```

**Request Body:**
```json
{
  "title": "Updated Event Title",
  "startTime": "2024-06-15T15:00:00Z",
  "endTime": "2024-06-15T16:00:00Z",
  "description": "Updated description",
  "location": "Updated location",
  "updateCalendar": true,
  "notifyAttendees": false
}
```

### Delete Calendar Event

Remove event from calendar and WedSync.

```http
DELETE /api/calendar/events/{calendarEventId}
```

**Query Parameters:**
- `removeFromCalendar`: boolean (default: true)
- `notifyAttendees`: boolean (default: false)

---

## Webhook Endpoints

Webhooks allow real-time calendar updates from providers to WedSync.

### Google Calendar Webhook

Receives notifications when Google Calendar events change.

```http
POST /api/calendar/webhooks/google
```

**Headers:**
```
X-Goog-Channel-ID: webhook_channel_123
X-Goog-Channel-Token: verification_token_456
X-Goog-Resource-ID: resource_789
X-Goog-Resource-State: exists
X-Goog-Resource-URI: https://www.googleapis.com/calendar/v3/calendars/primary/events
X-Goog-Changed: properties
```

**Request Body:**
```json
{
  "kind": "api#channel",
  "id": "webhook_channel_123",
  "resourceId": "resource_789",
  "resourceUri": "https://www.googleapis.com/calendar/v3/calendars/primary/events",
  "token": "verification_token_456",
  "expiration": "1640995200000"
}
```

**Response:**
```json
{
  "success": true,
  "processed": true,
  "changedEvents": 3,
  "updatedTimelines": [
    {
      "timelineId": "timeline_abc123",
      "eventsUpdated": 2,
      "lastUpdated": "2024-06-15T14:30:00Z"
    }
  ],
  "propagatedToProviders": ["outlook"],
  "notificationsSent": 5
}
```

### Outlook Calendar Webhook

Receives Microsoft Graph webhook notifications.

```http
POST /api/calendar/webhooks/outlook
```

**Request Body:**
```json
{
  "subscriptionId": "webhook_subscription_456",
  "changeType": "created|updated|deleted",
  "resource": "/users/me/events/event_id_123",
  "resourceData": {
    "id": "event_id_123",
    "subject": "Updated Wedding Event",
    "start": {
      "dateTime": "2024-06-15T15:00:00Z",
      "timeZone": "UTC"
    },
    "end": {
      "dateTime": "2024-06-15T16:00:00Z",
      "timeZone": "UTC"
    }
  },
  "clientState": "client_verification_token"
}
```

### Webhook Security

All webhooks must include valid signatures for security:

#### Google Webhook Verification:
```javascript
const crypto = require('crypto');

function verifyGoogleWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

#### Outlook Webhook Verification:
```javascript
function verifyOutlookWebhook(payload, expectedClientState) {
  return payload.clientState === expectedClientState;
}
```

---

## Error Handling

### Error Response Format

All API errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Specific field that caused the error",
      "value": "The problematic value",
      "constraint": "What constraint was violated"
    },
    "timestamp": "2024-06-15T14:30:00Z",
    "requestId": "req_abc123",
    "documentation": "https://docs.wedsync.com/api/errors/ERROR_CODE"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Request body validation failed |
| `UNAUTHORIZED` | 401 | Authentication required or invalid |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource state conflict |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Calendar-Specific Errors

| Code | Description | Solution |
|------|-------------|----------|
| `OAUTH_TOKEN_EXPIRED` | Calendar access token expired | Refresh token or re-authorize |
| `OAUTH_TOKEN_REVOKED` | User revoked calendar access | Re-authorize calendar connection |
| `CALENDAR_NOT_FOUND` | Specified calendar doesn't exist | Verify calendar ID and permissions |
| `EVENT_CONFLICT` | Timeline conflicts with existing events | Resolve conflicts or override |
| `SYNC_IN_PROGRESS` | Another sync operation is running | Wait for completion or cancel |
| `PROVIDER_RATE_LIMITED` | Calendar provider rate limit hit | Retry after specified delay |
| `WEBHOOK_SIGNATURE_INVALID` | Webhook signature verification failed | Check webhook secret configuration |

### Error Handling Best Practices

#### Retry Logic:
```javascript
const retryableErrors = [
  'RATE_LIMIT_EXCEEDED',
  'PROVIDER_RATE_LIMITED',
  'INTERNAL_ERROR'
];

async function callWithRetry(apiCall, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      if (!retryableErrors.includes(error.code)) {
        throw error; // Don't retry non-retryable errors
      }
      
      if (attempt === maxRetries - 1) {
        throw error; // Max retries reached
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

#### Token Refresh:
```javascript
async function makeAuthenticatedRequest(url, options) {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (error.code === 'OAUTH_TOKEN_EXPIRED') {
      // Refresh token and retry
      const newToken = await refreshOAuthToken();
      options.headers.Authorization = `Bearer ${newToken}`;
      return await fetch(url, options);
    }
    throw error;
  }
}
```

---

## SDKs and Libraries

### Official SDKs

#### Node.js SDK
```bash
npm install @wedsync/calendar-api
```

```javascript
const { WedSyncCalendarAPI } = require('@wedsync/calendar-api');

const client = new WedSyncCalendarAPI({
  apiKey: 'your_api_key',
  vendorId: 'your_vendor_id',
  environment: 'production' // or 'sandbox'
});

// Connect Google Calendar
const connection = await client.oauth.initiate({
  provider: 'google',
  redirectUri: 'https://your-app.com/callback'
});

// Sync wedding timeline
const sync = await client.sync.timeline({
  weddingId: 'wedding_123',
  connectionId: connection.id,
  events: weddingEvents
});
```

#### Python SDK
```bash
pip install wedsync-calendar-api
```

```python
from wedsync_calendar import WedSyncCalendarAPI

client = WedSyncCalendarAPI(
    api_key="your_api_key",
    vendor_id="your_vendor_id",
    environment="production"
)

# Connect calendar
connection = client.oauth.initiate(
    provider="google",
    redirect_uri="https://your-app.com/callback"
)

# Sync timeline
sync_result = client.sync.timeline(
    wedding_id="wedding_123",
    connection_id=connection.id,
    events=wedding_events
)
```

### Third-Party Libraries

#### React Hooks
```bash
npm install @wedsync/react-calendar-hooks
```

```jsx
import { useCalendarConnection, useTimelineSync } from '@wedsync/react-calendar-hooks';

function CalendarIntegration() {
  const { connections, connect, disconnect } = useCalendarConnection();
  const { sync, syncing, progress } = useTimelineSync();

  const handleGoogleConnect = async () => {
    await connect('google', {
      redirectUri: window.location.origin + '/oauth/callback'
    });
  };

  const handleTimelineSync = async (weddingId, events) => {
    await sync({
      weddingId,
      connectionId: connections.google?.id,
      events
    });
  };

  return (
    <div>
      {!connections.google ? (
        <button onClick={handleGoogleConnect}>
          Connect Google Calendar
        </button>
      ) : (
        <div>
          <p>✓ Google Calendar Connected</p>
          <button 
            onClick={() => handleTimelineSync('wedding_123', events)}
            disabled={syncing}
          >
            {syncing ? `Syncing... ${progress}%` : 'Sync Timeline'}
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Testing

### Sandbox Environment

Use the sandbox environment for development and testing:

**Base URL:** `https://api-sandbox.wedsync.com`

#### Sandbox Features:
- ✅ All API endpoints available
- ✅ Mock calendar providers (no real OAuth required)
- ✅ Simulated webhook delivery
- ✅ Rate limiting disabled
- ✅ Test data automatically cleaned up

#### Test Credentials:
```json
{
  "apiKey": "sk_test_1234567890abcdef",
  "vendorId": "vendor_test_123",
  "webhookSecret": "whsec_test_abc123def456"
}
```

### Mock Calendar Providers

Sandbox includes mock providers for testing:

#### Mock Google Calendar:
```http
POST /api/calendar/oauth/test/google
```

**Request:**
```json
{
  "vendor_id": "vendor_test_123",
  "mock_scenario": "success|oauth_error|rate_limit|token_expired"
}
```

#### Mock Events:
```javascript
// Create mock wedding timeline
const mockEvents = [
  {
    id: 'mock_ceremony',
    title: 'Test Wedding - Ceremony',
    startTime: '2024-06-15T14:00:00Z',
    endTime: '2024-06-15T15:00:00Z',
    type: 'wedding_ceremony'
  },
  {
    id: 'mock_reception',
    title: 'Test Wedding - Reception',
    startTime: '2024-06-15T18:00:00Z',
    endTime: '2024-06-15T23:00:00Z',
    type: 'wedding_reception'
  }
];
```

### Integration Tests

Example integration test using Jest and the Node.js SDK:

```javascript
const { WedSyncCalendarAPI } = require('@wedsync/calendar-api');

describe('Calendar Integration Tests', () => {
  let client;

  beforeAll(() => {
    client = new WedSyncCalendarAPI({
      apiKey: process.env.WEDSYNC_TEST_API_KEY,
      vendorId: process.env.WEDSYNC_TEST_VENDOR_ID,
      environment: 'sandbox'
    });
  });

  test('should connect Google Calendar successfully', async () => {
    const connection = await client.oauth.initiate({
      provider: 'google',
      redirectUri: 'https://localhost:3000/callback'
    });

    expect(connection.success).toBe(true);
    expect(connection.provider).toBe('google');
    expect(connection.authUrl).toContain('accounts.google.com');
  });

  test('should sync wedding timeline', async () => {
    // First connect calendar
    const connection = await client.oauth.callback({
      provider: 'google',
      code: 'mock_oauth_code',
      state: 'vendor_test_123'
    });

    // Then sync timeline
    const sync = await client.sync.timeline({
      weddingId: 'test_wedding_123',
      connectionId: connection.connectionId,
      events: mockWeddingEvents
    });

    expect(sync.success).toBe(true);
    expect(sync.summary.successful).toBe(mockWeddingEvents.length);
    expect(sync.summary.failed).toBe(0);
  });

  test('should handle sync conflicts', async () => {
    // Create conflicting events
    const conflictingEvents = [
      {
        id: 'conflict_test',
        title: 'Conflicting Wedding',
        startTime: '2024-06-15T14:00:00Z', // Same time as existing
        endTime: '2024-06-15T15:00:00Z',
        type: 'wedding_ceremony'
      }
    ];

    const sync = await client.sync.timeline({
      weddingId: 'conflict_test_wedding',
      connectionId: existingConnectionId,
      events: conflictingEvents
    });

    expect(sync.success).toBe(true);
    expect(sync.conflicts).toHaveLength(1);
    expect(sync.conflicts[0].conflictType).toBe('time_overlap');
  });
});
```

### Webhook Testing

Test webhook endpoints using ngrok and the sandbox:

```bash
# Install ngrok for local webhook testing
npm install -g ngrok

# Expose local server
ngrok http 3000

# Use ngrok URL in webhook configuration
curl -X POST https://api-sandbox.wedsync.com/api/calendar/webhooks/test \
  -H "X-API-Key: sk_test_1234567890abcdef" \
  -d '{
    "provider": "google",
    "webhookUrl": "https://abc123.ngrok.io/webhook/calendar",
    "events": ["event.created", "event.updated", "event.deleted"]
  }'
```

---

## Support & Resources

### 📞 Developer Support
- **Email**: developers@wedsync.com
- **Discord**: [WedSync Developer Community](https://discord.gg/wedsync-dev)
- **Office Hours**: Tuesdays 2-4 PM EST

### 🔗 Additional Resources
- **API Status**: [status.wedsync.com](https://status.wedsync.com)
- **Changelog**: [changelog.wedsync.com](https://changelog.wedsync.com)
- **Postman Collection**: [Download API Collection](https://wedsync.com/api/postman)
- **OpenAPI Spec**: [Download OpenAPI 3.0 Spec](https://api.wedsync.com/openapi.json)

### 📚 Examples & Tutorials
- **Full Integration Example**: [GitHub Repository](https://github.com/wedsync/calendar-integration-example)
- **Webhook Implementation Guide**: [Tutorial](https://wedsync.com/docs/webhooks-guide)
- **OAuth Flow Examples**: [Multiple Languages](https://github.com/wedsync/oauth-examples)

---

*Last updated: September 8, 2025*
*API Version: 2.1.0*

**Questions?** Join our developer community or email developers@wedsync.com