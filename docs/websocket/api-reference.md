# WebSocket API Reference

## RealtimeSubscriptionManager Class

The main interface for WebSocket operations in WedSync. Provides methods for subscribing to real-time updates, managing connections, and handling wedding-specific communication workflows.

### Constructor

```typescript
const realtimeManager = RealtimeSubscriptionManager.getInstance()
```

Returns the singleton instance of the RealtimeSubscriptionManager.

### Core Methods

#### subscribe()

Creates a new WebSocket subscription for real-time updates.

```typescript
async subscribe(params: EnhancedRealtimeSubscriptionParams): Promise<SubscriptionResult>
```

**Parameters:**

```typescript
interface EnhancedRealtimeSubscriptionParams {
  organizationId: string;     // Required: Organization boundary for security
  userId: string;            // Required: User permission scope  
  channelName: string;       // Required: Unique channel identifier
  channelType: WeddingChannelType; // Required: Channel type for routing
  weddingId?: string;        // Optional: Wedding-specific isolation
  tableFilter?: string;      // Optional: Database table to monitor
  eventFilter?: string;      // Optional: Specific event types (INSERT, UPDATE, DELETE)
  callback?: (payload: any) => void; // Optional: Message handler function
}
```

**Returns:**

```typescript
interface SubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  error?: string;
  reconnectAttempts?: number;
}
```

**Example Usage:**

```typescript
// Photographer dashboard subscription
const result = await realtimeManager.subscribe({
  organizationId: 'org_photographer_123',
  userId: 'user_photographer_456', 
  channelName: `supplier:dashboard:user_photographer_456`,
  channelType: 'supplier_dashboard',
  weddingId: 'wedding_smith_2025_06_15',
  callback: (payload) => {
    console.log('Real-time update:', payload);
  }
});

if (result.success) {
  console.log('Subscription created:', result.subscriptionId);
}
```

#### unsubscribe()

Removes an active WebSocket subscription.

```typescript
async unsubscribe(subscriptionId: string): Promise<boolean>
```

**Parameters:**
- `subscriptionId`: The ID returned from `subscribe()` method

**Returns:**
- `boolean`: True if successfully unsubscribed, false otherwise

**Example:**

```typescript
const unsubscribed = await realtimeManager.unsubscribe('sub_12345');
console.log('Unsubscribed:', unsubscribed);
```

#### getActiveSubscriptions()

Returns all active WebSocket subscriptions for debugging and monitoring.

```typescript
getActiveSubscriptions(): ActiveSubscription[]
```

**Returns:**

```typescript
interface ActiveSubscription {
  id: string;
  channelName: string;
  channelType: WeddingChannelType;
  organizationId: string;
  userId: string;
  weddingId?: string;
  connectedAt: Date;
  lastActivity: Date;
  messageCount: number;
}
```

**Example:**

```typescript
const active = realtimeManager.getActiveSubscriptions();
console.log('Active connections:', active.length);
```

### Wedding-Specific Methods

#### subscribeToFormResponses()

Specialized subscription for form response updates in wedding workflows.

```typescript
async subscribeToFormResponses(params: {
  organizationId: string;
  userId: string;
  weddingId: string;
  formId?: string;
  callback: (response: FormResponse) => void;
}): Promise<SubscriptionResult>
```

**Example:**

```typescript
await realtimeManager.subscribeToFormResponses({
  organizationId: 'org_photographer_123',
  userId: 'user_photographer_456',
  weddingId: 'wedding_smith_2025_06_15',
  callback: (response) => {
    // Handle new form submission
    updateDashboard(response);
  }
});
```

#### subscribeToWeddingUpdates()

Comprehensive wedding coordination updates including timeline changes, vendor updates, and guest responses.

```typescript
async subscribeToWeddingUpdates(params: {
  organizationId: string;
  userId: string;
  weddingId: string;
  updateTypes?: WeddingUpdateType[];
  callback: (update: WeddingUpdate) => void;
}): Promise<SubscriptionResult>
```

**WeddingUpdateType Options:**
- `timeline_change`: Wedding schedule modifications
- `vendor_update`: Supplier status changes
- `guest_rsvp`: RSVP responses and changes
- `payment_status`: Payment and invoice updates
- `document_upload`: New photos/documents
- `communication`: Messages and notifications

**Example:**

```typescript
await realtimeManager.subscribeToWeddingUpdates({
  organizationId: 'org_venue_789',
  userId: 'user_coordinator_012',
  weddingId: 'wedding_smith_2025_06_15',
  updateTypes: ['timeline_change', 'vendor_update'],
  callback: (update) => {
    if (update.type === 'timeline_change') {
      // Update venue coordination dashboard
      refreshVenueSchedule(update.data);
    }
  }
});
```

#### subscribeToGuestRSVPs()

Real-time guest RSVP and seating management for large weddings.

```typescript
async subscribeToGuestRSVPs(params: {
  organizationId: string;
  userId: string;
  weddingId: string;
  callback: (rsvp: GuestRSVP) => void;
}): Promise<SubscriptionResult>
```

**Example:**

```typescript
await realtimeManager.subscribeToGuestRSVPs({
  organizationId: 'org_planner_345',
  userId: 'user_planner_678',
  weddingId: 'wedding_smith_2025_06_15',
  callback: (rsvp) => {
    // Update guest count and seating charts
    updateGuestCount(rsvp.attending);
    if (rsvp.dietary_requirements) {
      notifyCaterer(rsvp);
    }
  }
});
```

### Channel Types Reference

#### WeddingChannelType Enum

```typescript
enum WeddingChannelType {
  supplier_dashboard = 'supplier_dashboard',
  couple_portal = 'couple_portal',
  venue_coordination = 'venue_coordination',
  guest_rsvp = 'guest_rsvp',
  form_responses = 'form_responses',
  notifications = 'notifications',
  emergency_broadcast = 'emergency_broadcast',
  payment_updates = 'payment_updates',
  document_sharing = 'document_sharing'
}
```

### Message Payload Structures

#### FormResponse Payload

```typescript
interface FormResponsePayload {
  id: string;
  form_id: string;
  wedding_id: string;
  organization_id: string;
  client_id: string;
  response_data: Record<string, any>;
  submitted_at: string;
  status: 'pending' | 'processed' | 'completed';
}
```

#### WeddingUpdate Payload

```typescript
interface WeddingUpdatePayload {
  id: string;
  wedding_id: string;
  organization_id: string;
  update_type: WeddingUpdateType;
  data: Record<string, any>;
  updated_by: string;
  updated_at: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}
```

#### GuestRSVP Payload

```typescript
interface GuestRSVPPayload {
  id: string;
  wedding_id: string;
  guest_id: string;
  attending: boolean;
  guest_count: number;
  dietary_requirements?: string;
  special_requests?: string;
  rsvp_date: string;
  contact_method: 'email' | 'phone' | 'website';
}
```

### Error Handling

#### Error Types

```typescript
enum WebSocketErrorType {
  CONNECTION_FAILED = 'connection_failed',
  AUTHENTICATION_ERROR = 'authentication_error',
  PERMISSION_DENIED = 'permission_denied',
  INVALID_CHANNEL = 'invalid_channel',
  MESSAGE_TIMEOUT = 'message_timeout',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  NETWORK_INTERRUPTED = 'network_interrupted'
}
```

#### Error Response Structure

```typescript
interface WebSocketError {
  type: WebSocketErrorType;
  message: string;
  code: number;
  details?: Record<string, any>;
  retryable: boolean;
  suggested_action: string;
}
```

### Connection Management

#### Connection Status

```typescript
enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting', 
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}
```

#### getConnectionStatus()

Returns the current connection status for monitoring.

```typescript
getConnectionStatus(): ConnectionStatus
```

#### Connection Events

The manager emits events for connection state changes:

```typescript
// Listen for connection events
realtimeManager.on('connected', (event) => {
  console.log('WebSocket connected:', event);
});

realtimeManager.on('disconnected', (event) => {
  console.log('WebSocket disconnected:', event);
});

realtimeManager.on('error', (error) => {
  console.error('WebSocket error:', error);
});

realtimeManager.on('message', (payload) => {
  console.log('Message received:', payload);
});
```

### Performance Configuration

#### Connection Limits

```typescript
interface PerformanceConfig {
  maxConcurrentConnections: 500;     // Maximum concurrent WebSocket connections
  channelSwitchTimeout: 200;         // Target channel switch time (ms)
  messageDeliveryTimeout: 500;       // Maximum message delivery time (ms)
  reconnectAttempts: 5;              // Maximum reconnection attempts
  reconnectDelay: 1000;              // Initial reconnect delay (ms)
  heartbeatInterval: 30000;          // Ping interval (ms)
  maxMessageQueue: 1000;             // Offline message queue size
}
```

### Rate Limiting

#### Default Limits

```typescript
interface RateLimits {
  messagesPerMinute: 60;       // Per-user message rate limit
  subscriptionsPerUser: 10;    // Maximum subscriptions per user
  channelSwitchesPerMinute: 30; // Channel switching rate limit
  bulkOperationsPerHour: 100;  // Bulk operations (imports, exports)
}
```

### Security Headers

All WebSocket connections include security headers:

```typescript
interface SecurityHeaders {
  'X-Organization-Id': string;   // Organization isolation
  'X-User-Id': string;          // User authentication
  'X-Wedding-Context': string;   // Wedding-specific permissions
  'X-Client-Version': string;    // Client version for compatibility
  'X-Request-Id': string;       // Request tracing
}
```

### Integration Examples

#### Photography CRM Integration

```typescript
// Subscribe to CRM webhook data
await realtimeManager.subscribe({
  organizationId: 'org_photographer_123',
  userId: 'user_photographer_456',
  channelName: 'crm:webhooks:photography',
  channelType: 'form_responses',
  callback: (payload) => {
    // Handle CRM booking confirmations
    if (payload.event_type === 'booking_confirmed') {
      createWeddingProject(payload.data);
    }
  }
});
```

#### Venue Coordination

```typescript
// Multi-room venue coordination
const venueRooms = ['ceremony', 'reception', 'bridal_suite'];

for (const room of venueRooms) {
  await realtimeManager.subscribe({
    organizationId: 'org_venue_789',
    userId: 'user_coordinator_012',
    channelName: `venue:${room}:coordination`,
    channelType: 'venue_coordination',
    callback: (update) => {
      updateRoomStatus(room, update);
    }
  });
}
```

### Mobile Optimization

#### Reduced Payload Mode

For mobile clients with limited bandwidth:

```typescript
await realtimeManager.subscribe({
  organizationId: 'org_photographer_123',
  userId: 'user_photographer_456',
  channelName: 'supplier:dashboard:mobile',
  channelType: 'supplier_dashboard',
  options: {
    reducedPayload: true,      // Minimize message size
    compressionEnabled: true,   // Enable message compression
    batchMessages: true        // Batch multiple updates
  }
});
```

This API reference provides comprehensive documentation for all WebSocket functionality in WedSync's wedding coordination platform.