# Real-Time Collaboration Technical Documentation

## Architecture Overview

### Y.js and Operational Transform Implementation

WedSync uses **Y.js** (Yjs) as the foundation for conflict-free collaborative editing. Y.js implements **Conflict-free Replicated Data Types (CRDTs)** which ensure that all users eventually converge to the same document state, regardless of network conditions or edit order.

**Key Components:**
```typescript
// Document Structure
const doc = new Y.Doc()
const weddingForm = doc.getMap('weddingForm')     // Key-value data
const timeline = doc.getArray('timeline')         // Ordered lists  
const notes = doc.getText('notes')               // Rich text content

// WebSocket Provider
const provider = new WebsocketProvider(
  'wss://api.wedsync.com/collaboration',
  'wedding-session-123',
  doc
)

// Persistence Layer
const persistence = new IndexeddbPersistence('wedding-local', doc)
```

### WebSocket Infrastructure and Scaling

**Connection Architecture:**
- **Primary WebSocket**: Real-time document synchronization
- **Fallback HTTP**: Long polling for restricted networks  
- **Connection Pooling**: Efficient resource utilization
- **Auto-reconnection**: Seamless recovery from network issues

**Scaling Strategy:**
```typescript
// Load Balancer Configuration
const loadBalancer = {
  algorithm: 'consistent-hashing', // Users stick to same server
  healthCheck: '/ws-health',
  maxConnections: 1000,           // Per server instance
  gracefulShutdown: 30000        // 30 second graceful shutdown
}

// Horizontal Scaling
const clusterConfig = {
  serverInstances: 'auto-scale',   // Based on connection count
  redisCluster: 'shared-state',    // Cross-server synchronization
  databaseConnections: 'pooled'    // Efficient DB access
}
```

### Document Synchronization Protocols

**Operational Transform Flow:**
1. **Local Edit**: User makes change, applied immediately to local document
2. **Operation Generation**: Y.js creates operation describing the change  
3. **Vector Clock**: Operation tagged with logical timestamp
4. **Broadcast**: Operation sent to all connected clients via WebSocket
5. **Transform**: Remote clients transform operation against concurrent edits
6. **Apply**: Transformed operation applied to remote documents
7. **Convergence**: All documents eventually reach identical state

**Conflict Resolution Algorithm:**
```typescript
// Conflict Resolution Example
interface Operation {
  type: 'insert' | 'delete' | 'retain'
  position: number
  content?: string
  length?: number
  userId: string
  vectorClock: VectorClock
}

function transformOperations(localOp: Operation, remoteOp: Operation): Operation {
  if (localOp.position <= remoteOp.position) {
    // Local operation comes first, adjust remote position
    return {
      ...remoteOp,
      position: remoteOp.position + (localOp.content?.length || -localOp.length!)
    }
  } else {
    // Remote operation comes first, apply as-is
    return remoteOp
  }
}
```

## API Reference

### Collaboration Endpoints and WebSocket Messages

**REST API Endpoints:**

```typescript
// Session Management
POST   /api/collaboration/sessions
GET    /api/collaboration/sessions/:id
DELETE /api/collaboration/sessions/:id
POST   /api/collaboration/sessions/:id/invite

// Document Operations  
GET    /api/collaboration/documents/:sessionId
POST   /api/collaboration/documents/:sessionId/restore
GET    /api/collaboration/documents/:sessionId/history

// Analytics
GET    /api/collaboration/analytics/:organizationId
```

**WebSocket Message Types:**

```typescript
// Connection Events
interface JoinEvent {
  type: 'join'
  sessionId: string  
  userId: string
  metadata: UserMetadata
}

// Document Operations
interface DocumentOperation {
  type: 'operation'
  sessionId: string
  operation: Y.UpdateV2  // Y.js binary operation
  origin: string         // User ID who made change
}

// Presence Updates
interface PresenceUpdate {
  type: 'presence'
  sessionId: string
  userId: string
  cursor?: CursorPosition
  selection?: SelectionRange
  isTyping?: boolean
}

// Awareness (User Status)
interface AwarenessUpdate {
  type: 'awareness'  
  users: Array<{
    userId: string
    userName: string
    cursor: CursorPosition
    lastSeen: timestamp
  }>
}
```

### Y.js Operation Formats and Validation

**Operation Types:**
```typescript
// Text Operations
interface TextInsert {
  retain?: number      // Skip n characters
  insert: string       // Insert text at position
  attributes?: object  // Formatting (bold, italic, etc.)
}

interface TextDelete {  
  retain?: number      // Skip n characters
  delete: number       // Delete n characters
}

// Map Operations (Key-Value)
interface MapSet {
  key: string
  value: any
  oldValue?: any
}

interface MapDelete {
  key: string
  oldValue: any
}

// Array Operations (Ordered Lists)
interface ArrayInsert {
  index: number
  content: any[]
}

interface ArrayDelete {
  index: number
  length: number
  content: any[]      // Deleted items for undo
}
```

**Validation Rules:**
```typescript
// Operation Validation
function validateOperation(op: Operation, doc: Y.Doc): ValidationResult {
  const checks = [
    validatePositionBounds(op, doc),    // Position within document
    validatePermissions(op.userId),     // User has edit rights  
    validateContentSafety(op.content),  // No malicious content
    validateRateLimit(op.userId),       // Not exceeding rate limit
    validateDocumentSize(doc, op)       // Won't exceed size limit
  ]
  
  return checks.every(check => check.valid) 
    ? { valid: true }
    : { valid: false, errors: checks.filter(c => !c.valid) }
}
```

### Error Codes and Conflict Resolution

**Error Response Format:**
```typescript
interface CollaborationError {
  code: string
  message: string
  details?: any
  timestamp: string
  sessionId?: string
  userId?: string
}
```

**Common Error Codes:**
- `SESSION_NOT_FOUND`: Collaboration session doesn't exist
- `PERMISSION_DENIED`: User lacks required permissions  
- `DOCUMENT_LOCKED`: Document locked by another operation
- `OPERATION_CONFLICT`: Unable to apply operation due to conflicts
- `CONNECTION_LOST`: WebSocket connection interrupted
- `SYNC_FAILED`: Failed to synchronize with server state
- `RATE_LIMITED`: Too many operations in short time period
- `DOCUMENT_TOO_LARGE`: Document exceeds maximum size limit

## Testing Strategy

### Multi-User Testing Scenarios

**Test Environment Setup:**
```typescript
// Test Harness for Multi-User Scenarios  
class CollaborationTestHarness {
  async createUser(userId: string): Promise<CollaborationClient> {
    const doc = new Y.Doc()
    const provider = new WebsocketProvider(TEST_WS_URL, sessionId, doc)
    return { doc, provider, userId }
  }

  async simulateNetworkPartition(userId: string, durationMs: number) {
    const client = this.clients.get(userId)
    client.provider.disconnect()
    setTimeout(() => client.provider.connect(), durationMs)
  }

  async waitForSync(userIds: string[]): Promise<void> {
    // Wait until all users have identical document state
  }
}
```

**Wedding Industry Test Scenarios:**
```typescript
// Vendor Coordination Test
describe('Vendor Timeline Coordination', () => {
  it('handles concurrent vendor timeline updates', async () => {
    const photographer = await harness.createUser('photographer')
    const caterer = await harness.createUser('caterer')  
    const coordinator = await harness.createUser('coordinator')

    // All vendors update timeline simultaneously
    photographer.timeline.push({ time: '14:00', task: 'Setup equipment' })
    caterer.timeline.push({ time: '16:00', task: 'Service begins' })
    coordinator.timeline.push({ time: '15:00', task: 'Ceremony starts' })

    await harness.waitForSync(['photographer', 'caterer', 'coordinator'])
    
    // Verify all updates present and timeline sorted by time
    expect(photographer.timeline).toEqual(caterer.timeline)
    expect(timeline.isSortedByTime()).toBe(true)
  })
})
```

### Performance Benchmarking

**Key Performance Metrics:**
- **Operation Latency**: Time from local edit to remote application
- **Sync Time**: Time to achieve document consistency across all users
- **Memory Usage**: RAM consumption during collaborative sessions
- **Network Usage**: Bandwidth consumed by collaboration protocol
- **Battery Impact**: Power consumption on mobile devices

**Performance Test Suite:**
```typescript
// Load Testing with Multiple Users
describe('Performance Under Load', () => {
  it('maintains <50ms latency with 50 concurrent users', async () => {
    const users = await Promise.all(
      Array(50).fill(0).map((_, i) => harness.createUser(`user-${i}`))
    )

    const latencies = []
    
    // Each user makes 10 operations
    for (const user of users) {
      for (let i = 0; i < 10; i++) {
        const start = performance.now()
        user.doc.getText().insert(0, `Edit ${i} `)
        await harness.waitForSync([user.userId])
        latencies.push(performance.now() - start)
      }
    }

    const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length
    const p95Latency = latencies.sort()[Math.floor(latencies.length * 0.95)]
    
    expect(avgLatency).toBeLessThan(25)  // Average < 25ms
    expect(p95Latency).toBeLessThan(50)  // P95 < 50ms
  })
})
```

### Security Validation for Collaborative Data

**Security Test Categories:**
1. **Authentication Testing**: Verify only authenticated users can join sessions
2. **Authorization Testing**: Ensure users can only edit permitted documents  
3. **Input Validation**: Test malicious content injection prevention
4. **Session Isolation**: Verify cross-session data leakage prevention
5. **Rate Limiting**: Confirm operation rate limits are enforced

**Security Test Examples:**
```typescript
// Input Sanitization Test
describe('Security Validation', () => {
  it('prevents XSS injection through collaborative edits', async () => {
    const maliciousUser = await harness.createUser('hacker')
    const legitimateUser = await harness.createUser('vendor')

    const maliciousScript = '<script>alert("XSS")</script>'
    maliciousUser.doc.getText().insert(0, maliciousScript)

    await harness.waitForSync(['hacker', 'vendor'])

    // Content should be sanitized
    const sanitizedContent = legitimateUser.doc.getText().toString()
    expect(sanitizedContent).not.toContain('<script>')
    expect(sanitizedContent).toContain('&lt;script&gt;') // HTML encoded
  })

  it('enforces session-level permissions', async () => {
    const unauthorizedUser = await harness.createUser('unauthorized')
    
    // Attempt to join session without permission
    expect(() => {
      unauthorizedUser.provider.connect('private-wedding-session')
    }).toThrow('PERMISSION_DENIED')
  })
})
```

## Production Deployment

### Scaling Configuration

**Server Configuration:**
```typescript
// Production WebSocket Server
const server = new WebSocketServer({
  port: process.env.WS_PORT || 8080,
  maxConnections: 1000,
  pingInterval: 30000,      // 30s heartbeat
  pongTimeout: 5000,        // 5s pong timeout
  compression: true,        // Enable compression
  
  // Redis adapter for horizontal scaling
  adapter: new RedisAdapter({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  })
})
```

**Database Optimization:**
```sql
-- Indexes for collaboration queries
CREATE INDEX CONCURRENTLY idx_collaboration_sessions_active 
ON collaboration_sessions (is_active, created_at) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY idx_document_edits_session_time
ON document_edits (session_id, timestamp DESC);

-- Partitioning for large edit history
CREATE TABLE document_edits_2024 PARTITION OF document_edits
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### Monitoring and Alerting

**Health Check Endpoints:**
```typescript
// Health monitoring
app.get('/health/collaboration', async (req, res) => {
  const health = {
    status: 'healthy',
    activeConnections: getConnectionCount(),
    averageLatency: await getAverageLatency(),
    errorRate: getErrorRate(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString()
  }
  
  const isHealthy = (
    health.activeConnections < MAX_CONNECTIONS &&
    health.averageLatency < 100 &&
    health.errorRate < 0.01
  )
  
  res.status(isHealthy ? 200 : 503).json(health)
})
```

**Alerts and Notifications:**
```typescript
// Critical alerts
const alerts = {
  highLatency: { threshold: 200, severity: 'warning' },
  connectionLimit: { threshold: 900, severity: 'critical' },  
  errorSpike: { threshold: 0.05, severity: 'warning' },
  memoryLeak: { threshold: '2GB', severity: 'critical' }
}

// Wedding day monitoring
if (isWeddingDay()) {
  alerts.highLatency.threshold = 50      // Stricter on wedding days
  alerts.errorSpike.threshold = 0.001    // Zero tolerance for errors
}
```

This technical documentation provides comprehensive guidance for implementing, testing, and maintaining the WS-244 Real-Time Collaboration System in production environments.