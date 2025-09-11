# WS-274 Mobile Optimization Framework - Team B Comprehensive Prompt
**Team B: Backend/API Development Specialists**

## 🎯 Your Mission: High-Performance Mobile API Architecture
You are the **Backend/API specialists** responsible for creating ultra-fast, mobile-optimized server architecture that delivers lightning-fast responses even on poor mobile connections. Your focus: **Sub-200ms API responses with intelligent caching and offline sync**.

## 📡 The Wedding Day Network Challenge
**Context**: It's Saturday morning at Ashridge House (rural Hertfordshire). The wedding coordinator James is trying to update the timeline via his phone, but the venue WiFi is down and he's on 2G mobile data. The bride is asking for updates every 30 seconds. **Your APIs must deliver critical data instantly or the entire wedding coordination falls apart.**

## 📋 EVIDENCE OF REALITY REQUIREMENTS (Non-Negotiable)
Before you claim completion, you MUST provide these files as proof:

### 🔍 Required Evidence Files:
1. **`/src/app/api/mobile/optimize/route.ts`** - Mobile-specific API optimization endpoint
2. **`/src/app/api/mobile/sync/route.ts`** - Offline sync and conflict resolution
3. **`/src/app/api/mobile/network-aware/route.ts`** - Network condition adaptive responses
4. **`/src/app/api/mobile/performance-metrics/route.ts`** - Performance tracking endpoint
5. **`/src/lib/api/mobile-optimization.ts`** - Core mobile API utilities
6. **`/src/lib/api/compression.ts`** - Response compression and minification
7. **`/src/lib/api/caching/mobile-cache.ts`** - Intelligent mobile caching layer
8. **`/src/lib/api/caching/redis-mobile.ts`** - Redis mobile optimization strategies
9. **`/src/lib/api/database/mobile-queries.ts`** - Mobile-optimized database queries
10. **`/src/lib/api/database/connection-pooling.ts`** - Database connection optimization
11. **`/src/lib/api/middleware/mobile-middleware.ts`** - Mobile request processing middleware
12. **`/src/lib/api/middleware/compression-middleware.ts`** - Response compression middleware
13. **`/src/lib/api/offline-sync/conflict-resolution.ts`** - Data conflict resolution engine
14. **`/src/lib/api/offline-sync/queue-manager.ts`** - Offline action queue management
15. **`/supabase/functions/mobile-optimization/index.ts`** - Edge function for mobile optimization

### 🗄️ Required Database Optimizations:
- **`/supabase/migrations/mobile_performance_indexes.sql`** - Mobile-specific database indexes
- **`/supabase/migrations/mobile_caching_tables.sql`** - Caching and sync tables
- **`/supabase/migrations/mobile_metrics_tables.sql`** - Performance tracking tables

### 🧪 Required Tests:
- **`/src/__tests__/api/mobile-performance.test.ts`**
- **`/src/__tests__/api/offline-sync.test.ts`**
- **`/src/__tests__/api/network-conditions.test.ts`**

## 🏗️ Core Architecture Requirements

### API Response Time Targets
```typescript
// Non-negotiable performance requirements
const MOBILE_PERFORMANCE_TARGETS = {
  criticalEndpoints: {
    '/api/timeline/current': 50,      // Current timeline status
    '/api/emergency/contacts': 50,    // Emergency vendor contacts
    '/api/notifications/critical': 100 // Critical wedding notifications
  },
  standardEndpoints: {
    '/api/timeline': 150,             // Full timeline
    '/api/vendors': 200,              // Vendor information
    '/api/guests': 200,               // Guest information
  },
  heavyEndpoints: {
    '/api/photos/gallery': 300,       // Photo galleries
    '/api/reports/export': 500,       // Report generation
    '/api/analytics': 300             // Analytics data
  }
};

// All response times in milliseconds
// Must be measured at p95 (95th percentile)
// Must account for database query time + serialization
```

### Mobile-Optimized API Design

#### 1. Intelligent Response Compression
```typescript
interface MobileCompressionConfig {
  algorithm: 'gzip' | 'brotli' | 'deflate';
  compressionLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  minSizeThreshold: number;    // Only compress responses > 1KB
  contentTypeFilters: string[];
  adaptiveCompression: boolean; // Adjust based on device capabilities
}

// Advanced compression for mobile responses
export class MobileCompressionService {
  async compressResponse(
    data: any, 
    networkSpeed: 'slow-2g' | '2g' | '3g' | '4g',
    deviceCapability: 'low' | 'medium' | 'high'
  ): Promise<CompressedResponse> {
    // Network-aware compression
    if (networkSpeed === 'slow-2g' || networkSpeed === '2g') {
      // Ultra-aggressive compression for slow networks
      return this.ultraCompress(data);
    }
    
    // Device capability aware compression
    if (deviceCapability === 'low') {
      // Lighter compression to save CPU on low-end devices
      return this.lightCompress(data);
    }
    
    return this.standardCompress(data);
  }
}
```

#### 2. Network-Aware Response Adaptation
```typescript
interface NetworkAwareResponse {
  full: any;           // Complete data for good connections
  minimal: any;        // Essential data only for poor connections
  critical: any;       // Absolute minimum for emergency situations
  offline: any;        // Cached data for offline scenarios
}

export class NetworkAwareAPI {
  async adaptResponse(
    request: MobileRequest,
    data: any
  ): Promise<NetworkAwareResponse> {
    const connectionSpeed = request.headers['x-connection-speed'];
    const dataMode = request.headers['x-save-data'];
    
    // Honor user's data saving preference
    if (dataMode === 'on') {
      return this.createMinimalResponse(data);
    }
    
    // Adapt based on connection speed
    switch (connectionSpeed) {
      case 'slow-2g':
      case '2g':
        return this.createCriticalResponse(data);
      case '3g':
        return this.createMinimalResponse(data);
      case '4g':
      case 'wifi':
        return this.createFullResponse(data);
      default:
        return this.createMinimalResponse(data); // Safe default
    }
  }
}
```

### Wedding-Specific Mobile API Patterns

#### Timeline API Optimization
```typescript
// Wedding timeline must be lightning fast on mobile
export class MobileTimelineAPI {
  async getCurrentTimelineStatus(weddingId: string): Promise<TimelineStatus> {
    // Ultra-fast query using materialized views
    const cached = await this.redis.get(`timeline:current:${weddingId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Single optimized query for current status
    const result = await this.db.query(`
      SELECT 
        current_event,
        next_event,
        time_remaining,
        critical_alerts,
        coordinator_notes
      FROM wedding_timeline_materialized 
      WHERE wedding_id = $1 
      AND is_current = true
    `, [weddingId]);
    
    // Cache for 30 seconds (timeline changes frequently)
    await this.redis.setex(`timeline:current:${weddingId}`, 30, JSON.stringify(result));
    
    return result;
  }
  
  async getFullTimeline(weddingId: string, networkSpeed: string): Promise<Timeline> {
    // Adaptive timeline detail based on network
    if (networkSpeed === 'slow-2g' || networkSpeed === '2g') {
      return this.getEssentialTimeline(weddingId);
    }
    return this.getFullTimelineWithDetails(weddingId);
  }
}
```

#### Vendor Communication API
```typescript
// Vendor chat must work reliably on poor connections
export class MobileVendorAPI {
  async sendMessage(message: VendorMessage): Promise<MessageResponse> {
    // Immediate optimistic response for better UX
    const optimisticId = `temp_${Date.now()}`;
    
    // Queue message for processing
    await this.messageQueue.add('send-vendor-message', {
      ...message,
      optimisticId,
      timestamp: new Date(),
      priority: message.isUrgent ? 'critical' : 'normal'
    });
    
    return {
      id: optimisticId,
      status: 'queued',
      willRetry: true,
      estimatedDelivery: this.calculateDeliveryTime(message.priority)
    };
  }
  
  async getMessageHistory(
    vendorId: string, 
    limit: number = 50,
    networkSpeed: string
  ): Promise<MessageHistory> {
    // Network-aware message loading
    const messageLimit = networkSpeed === 'slow-2g' ? 10 : limit;
    
    // Only essential fields for poor connections
    const fields = networkSpeed === 'slow-2g' || networkSpeed === '2g'
      ? 'id, sender_id, message_text, timestamp'
      : '*';
    
    return this.db.query(`
      SELECT ${fields}
      FROM vendor_messages 
      WHERE vendor_id = $1 
      ORDER BY timestamp DESC 
      LIMIT $2
    `, [vendorId, messageLimit]);
  }
}
```

## 🚀 Caching & Performance Optimization

### Multi-Layer Caching Strategy
```typescript
// Implement sophisticated caching for mobile performance
export class MobileCachingService {
  private redisClient: Redis;
  private memoryCache: Map<string, CacheEntry>;
  private edgeCache: EdgeCacheManager;
  
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    // Layer 1: Memory cache (fastest)
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult && !this.isExpired(memoryResult)) {
      return memoryResult.data as T;
    }
    
    // Layer 2: Redis cache (fast)
    const redisResult = await this.redisClient.get(key);
    if (redisResult) {
      const data = JSON.parse(redisResult);
      // Populate memory cache for next request
      this.memoryCache.set(key, {
        data,
        timestamp: Date.now(),
        ttl: options?.ttl || 300
      });
      return data as T;
    }
    
    // Layer 3: Edge cache (CDN level)
    const edgeResult = await this.edgeCache.get(key);
    if (edgeResult) {
      // Populate both memory and Redis
      await this.set(key, edgeResult, options);
      return edgeResult as T;
    }
    
    return null;
  }
  
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const ttl = options?.ttl || 300;
    const serialized = JSON.stringify(value);
    
    // Set in all cache layers
    this.memoryCache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl
    });
    
    await this.redisClient.setex(key, ttl, serialized);
    
    if (options?.edgeCache) {
      await this.edgeCache.set(key, value, ttl);
    }
  }
}
```

### Database Optimization for Mobile

#### Mobile-Optimized Queries
```sql
-- Materialized views for instant mobile responses
CREATE MATERIALIZED VIEW wedding_timeline_mobile AS
SELECT 
  w.id as wedding_id,
  w.wedding_date,
  t.current_event,
  t.next_event,
  t.time_remaining,
  t.critical_alerts,
  array_agg(
    json_build_object(
      'id', e.id,
      'time', e.scheduled_time,
      'title', e.title,
      'status', e.status
    ) ORDER BY e.scheduled_time
  ) FILTER (WHERE e.scheduled_time >= NOW() - interval '1 hour') as upcoming_events
FROM weddings w
JOIN wedding_timelines t ON w.id = t.wedding_id
LEFT JOIN timeline_events e ON t.id = e.timeline_id
WHERE w.wedding_date = CURRENT_DATE
GROUP BY w.id, w.wedding_date, t.current_event, t.next_event, t.time_remaining, t.critical_alerts;

-- Refresh every 30 seconds
CREATE OR REPLACE FUNCTION refresh_wedding_timeline_mobile()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY wedding_timeline_mobile;
END;
$$ LANGUAGE plpgsql;

-- Mobile-specific indexes for lightning queries
CREATE INDEX CONCURRENTLY idx_wedding_timeline_mobile_date 
ON wedding_timeline_mobile (wedding_date);

CREATE INDEX CONCURRENTLY idx_vendor_messages_mobile 
ON vendor_messages (vendor_id, timestamp DESC) 
INCLUDE (sender_id, message_text, is_read);
```

#### Connection Pooling Optimization
```typescript
// Optimize database connections for mobile load patterns
export class MobileDatabasePool {
  private pool: Pool;
  
  constructor() {
    this.pool = new Pool({
      // Mobile-optimized connection settings
      max: 50,                    // Maximum connections
      min: 10,                    // Minimum connections
      acquireTimeoutMillis: 2000, // Fast timeout for mobile
      createTimeoutMillis: 3000,  // Connection creation timeout
      destroyTimeoutMillis: 5000, // Connection destruction timeout
      idleTimeoutMillis: 30000,   // Close idle connections quickly
      reapIntervalMillis: 1000,   // Check for idle connections
      createRetryIntervalMillis: 200, // Retry connection creation
      
      // Mobile-specific query optimization
      statement_timeout: 5000,    // 5 second query timeout
      query_timeout: 3000,        // 3 second individual query timeout
      
      // Connection validation for reliability
      validate: (client) => {
        return client.query('SELECT 1').then(() => true).catch(() => false);
      }
    });
  }
  
  async executeQuery<T>(
    query: string, 
    params: any[], 
    options?: QueryOptions
  ): Promise<T> {
    const start = Date.now();
    const client = await this.pool.connect();
    
    try {
      // Set mobile-specific query parameters
      if (options?.mobileOptimized) {
        await client.query('SET work_mem = "4MB"');
        await client.query('SET random_page_cost = 1.1');
      }
      
      const result = await client.query(query, params);
      
      // Log slow queries for optimization
      const duration = Date.now() - start;
      if (duration > 100) {
        console.warn(`Slow mobile query: ${duration}ms`, { query, params });
      }
      
      return result.rows as T;
    } finally {
      client.release();
    }
  }
}
```

## 📱 Offline Sync & Conflict Resolution

### Offline Action Queue
```typescript
// Handle offline actions and sync when connection restored
export class OfflineActionQueue {
  private queue: OfflineAction[] = [];
  private isProcessing = false;
  
  async queueAction(action: OfflineAction): Promise<void> {
    // Add timestamp and conflict resolution metadata
    const queuedAction: QueuedAction = {
      ...action,
      id: generateUUID(),
      queuedAt: new Date(),
      attempts: 0,
      lastAttempt: null,
      conflictResolution: action.conflictResolution || 'last-write-wins'
    };
    
    this.queue.push(queuedAction);
    
    // Persist queue to local storage
    await this.persistQueue();
    
    // Try to process immediately if online
    if (navigator.onLine) {
      this.processQueue();
    }
  }
  
  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      for (const action of [...this.queue]) {
        try {
          const result = await this.processAction(action);
          
          if (result.success) {
            // Remove from queue
            this.queue = this.queue.filter(a => a.id !== action.id);
          } else if (result.conflict) {
            // Handle conflict resolution
            await this.handleConflict(action, result.conflictData);
          } else {
            // Retry with exponential backoff
            action.attempts++;
            action.lastAttempt = new Date();
            
            if (action.attempts >= 5) {
              // Move to dead letter queue
              await this.moveToDeadLetter(action);
              this.queue = this.queue.filter(a => a.id !== action.id);
            }
          }
        } catch (error) {
          console.error('Failed to process queued action:', error);
          action.attempts++;
        }
      }
      
      await this.persistQueue();
    } finally {
      this.isProcessing = false;
    }
  }
  
  private async handleConflict(
    action: QueuedAction, 
    serverData: any
  ): Promise<void> {
    switch (action.conflictResolution) {
      case 'last-write-wins':
        // Override server data with local changes
        await this.forceUpdate(action);
        break;
        
      case 'server-wins':
        // Discard local changes, keep server data
        this.queue = this.queue.filter(a => a.id !== action.id);
        break;
        
      case 'merge':
        // Attempt to merge changes
        const merged = await this.mergeChanges(action.data, serverData);
        action.data = merged;
        await this.processAction(action);
        break;
        
      case 'user-choice':
        // Present conflict to user for resolution
        await this.presentConflictToUser(action, serverData);
        break;
    }
  }
}
```

### Real-time Sync with WebSockets
```typescript
// WebSocket connection optimized for mobile networks
export class MobileWebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private pingInterval: NodeJS.Timeout | null = null;
  
  async connect(): Promise<void> {
    try {
      // Use secure WebSocket with compression
      this.ws = new WebSocket('wss://api.wedsync.com/mobile-sync', {
        compression: 'permessage-deflate',
        maxPayload: 16 * 1024 * 1024, // 16MB max payload
        pingTimeout: 30000,            // 30 second ping timeout
        pongTimeout: 5000,             // 5 second pong timeout
      });
      
      this.ws.onopen = () => {
        console.log('Mobile WebSocket connected');
        this.reconnectAttempts = 0;
        this.startPingInterval();
        
        // Send mobile client info
        this.send({
          type: 'client-info',
          data: {
            userAgent: navigator.userAgent,
            connection: navigator.connection?.effectiveType,
            platform: 'mobile-web'
          }
        });
      };
      
      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };
      
      this.ws.onclose = () => {
        this.stopPingInterval();
        this.handleReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('Mobile WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.handleReconnect();
    }
  }
  
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max WebSocket reconnect attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    
    // Exponential backoff with jitter
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      30000 // Max 30 second delay
    );
    
    setTimeout(() => {
      if (!navigator.onLine) {
        // Wait for network to come back online
        window.addEventListener('online', () => this.connect(), { once: true });
      } else {
        this.connect();
      }
    }, delay);
  }
}
```

## 🔐 Security & Performance

### Mobile-Specific Security Middleware
```typescript
// Security middleware optimized for mobile constraints
export class MobileSecurityMiddleware {
  async validateRequest(req: Request): Promise<ValidationResult> {
    // Lightweight validation for mobile performance
    const results = await Promise.all([
      this.validateAuthToken(req),
      this.checkRateLimit(req),
      this.validateDeviceFingerprint(req),
      this.detectSuspiciousActivity(req)
    ]);
    
    return {
      isValid: results.every(r => r.valid),
      errors: results.flatMap(r => r.errors || []),
      warnings: results.flatMap(r => r.warnings || [])
    };
  }
  
  private async checkRateLimit(req: Request): Promise<ValidationResult> {
    const clientId = this.extractClientId(req);
    const key = `mobile_rate_limit:${clientId}`;
    
    // More lenient rate limiting for mobile due to reconnection patterns
    const limit = 100; // 100 requests per minute
    const window = 60; // 1 minute window
    
    const current = await this.redis.get(key);
    if (current && parseInt(current) > limit) {
      return {
        valid: false,
        errors: ['Rate limit exceeded'],
        retryAfter: 60
      };
    }
    
    await this.redis.incr(key);
    await this.redis.expire(key, window);
    
    return { valid: true };
  }
  
  private async validateDeviceFingerprint(req: Request): Promise<ValidationResult> {
    // Lightweight device validation
    const fingerprint = req.headers['x-device-fingerprint'];
    const userAgent = req.headers['user-agent'];
    
    if (!fingerprint || !userAgent) {
      return {
        valid: true, // Don't fail, but log for monitoring
        warnings: ['Missing device identification']
      };
    }
    
    // Check against known malicious patterns
    const isSuspicious = await this.checkSuspiciousDevice(fingerprint, userAgent);
    
    return {
      valid: !isSuspicious,
      errors: isSuspicious ? ['Suspicious device detected'] : [],
      warnings: []
    };
  }
}
```

### API Response Compression
```typescript
// Advanced compression for mobile responses
export class MobileCompressionMiddleware {
  async compressResponse(
    data: any, 
    acceptedEncodings: string[],
    clientHints: ClientHints
  ): Promise<CompressedResponse> {
    // Choose optimal compression based on client capabilities
    let algorithm = 'gzip'; // Safe default
    
    if (acceptedEncodings.includes('br') && clientHints.cpuClass !== 'low') {
      algorithm = 'brotli'; // Best compression, but CPU intensive
    } else if (acceptedEncodings.includes('gzip')) {
      algorithm = 'gzip';   // Good compression, fast
    } else if (acceptedEncodings.includes('deflate')) {
      algorithm = 'deflate'; // Basic compression
    }
    
    // Adjust compression level based on device capability
    const compressionLevel = this.getCompressionLevel(clientHints);
    
    const compressed = await this.compress(data, algorithm, compressionLevel);
    
    return {
      data: compressed,
      algorithm,
      originalSize: Buffer.byteLength(JSON.stringify(data)),
      compressedSize: compressed.length,
      compressionRatio: compressed.length / Buffer.byteLength(JSON.stringify(data))
    };
  }
  
  private getCompressionLevel(clientHints: ClientHints): number {
    // Balance compression ratio vs CPU usage
    if (clientHints.cpuClass === 'low' || clientHints.batteryLevel < 0.2) {
      return 3; // Fast compression to save CPU/battery
    } else if (clientHints.networkSpeed === 'slow-2g' || clientHints.networkSpeed === '2g') {
      return 9; // Maximum compression for slow networks
    } else {
      return 6; // Balanced compression
    }
  }
}
```

## 📊 Performance Monitoring & Analytics

### Mobile Performance Tracking
```typescript
// Track and analyze mobile API performance
export class MobilePerformanceTracker {
  async trackAPICall(
    endpoint: string,
    duration: number,
    responseSize: number,
    networkCondition: string,
    deviceInfo: DeviceInfo
  ): Promise<void> {
    const metrics = {
      endpoint,
      duration,
      responseSize,
      networkCondition,
      deviceInfo,
      timestamp: new Date(),
      isSlowQuery: duration > 200,
      isLargeResponse: responseSize > 100 * 1024, // >100KB
      userAgent: deviceInfo.userAgent,
      connectionType: deviceInfo.connectionType
    };
    
    // Store in time-series database for analysis
    await this.timeSeriesDB.insert('mobile_api_metrics', metrics);
    
    // Real-time alerting for performance issues
    if (duration > 500) {
      await this.alertManager.send({
        type: 'slow-api',
        severity: 'warning',
        message: `Slow API response: ${endpoint} took ${duration}ms`,
        metadata: metrics
      });
    }
    
    // Aggregate metrics for dashboard
    await this.updateAggregates(endpoint, duration, responseSize);
  }
  
  async getPerformanceInsights(timeRange: TimeRange): Promise<PerformanceInsights> {
    const insights = await this.timeSeriesDB.query(`
      SELECT 
        endpoint,
        AVG(duration) as avg_duration,
        PERCENTILE(duration, 95) as p95_duration,
        AVG(response_size) as avg_response_size,
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE is_slow_query) as slow_queries,
        network_condition,
        device_info->>'platform' as platform
      FROM mobile_api_metrics 
      WHERE timestamp >= $1 AND timestamp <= $2
      GROUP BY endpoint, network_condition, platform
      ORDER BY p95_duration DESC
    `, [timeRange.start, timeRange.end]);
    
    return {
      slowestEndpoints: insights.slice(0, 10),
      networkBreakdown: this.aggregateByNetwork(insights),
      platformBreakdown: this.aggregateByPlatform(insights),
      recommendations: await this.generateOptimizationRecommendations(insights)
    };
  }
}
```

## 🧪 Testing Requirements

### API Performance Testing
```typescript
describe('Mobile API Performance', () => {
  describe('Critical Endpoints', () => {
    it('should respond to timeline queries within 50ms', async () => {
      const start = performance.now();
      const response = await fetch('/api/timeline/current?weddingId=123');
      const end = performance.now();
      
      expect(end - start).toBeLessThan(50);
      expect(response.ok).toBe(true);
    });
    
    it('should handle 1000 concurrent mobile requests', async () => {
      // Simulate 1000 mobile clients hitting API simultaneously
      const promises = Array.from({ length: 1000 }, (_, i) => 
        fetch('/api/timeline/current', {
          headers: {
            'X-Client-Type': 'mobile',
            'X-Connection-Speed': '3g',
            'X-Device-Id': `mobile-${i}`
          }
        })
      );
      
      const responses = await Promise.all(promises);
      const failedResponses = responses.filter(r => !r.ok);
      
      expect(failedResponses.length).toBe(0);
    });
  });
  
  describe('Network Conditions', () => {
    it('should adapt responses for slow connections', async () => {
      const response = await fetch('/api/vendors', {
        headers: {
          'X-Connection-Speed': 'slow-2g',
          'X-Save-Data': 'on'
        }
      });
      
      const data = await response.json();
      
      // Should return minimal data for slow connections
      expect(data.vendors.length).toBeLessThanOrEqual(10);
      expect(data.vendors[0]).not.toHaveProperty('full_description');
      expect(response.headers.get('content-encoding')).toBe('br');
    });
  });
  
  describe('Offline Sync', () => {
    it('should queue actions when offline', async () => {
      // Simulate offline condition
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      const action = {
        type: 'UPDATE_TIMELINE',
        data: { eventId: '123', status: 'completed' }
      };
      
      await offlineQueue.queueAction(action);
      
      expect(offlineQueue.getQueueLength()).toBe(1);
    });
    
    it('should sync queued actions when back online', async () => {
      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      
      // Trigger online event
      window.dispatchEvent(new Event('online'));
      
      // Wait for sync to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(offlineQueue.getQueueLength()).toBe(0);
    });
  });
});
```

## 🎯 Success Criteria

### Performance Benchmarks
- **API Response Time (p95)**: <200ms for all endpoints
- **Critical Endpoints (p95)**: <50ms (timeline, emergency contacts)
- **Database Query Time (p95)**: <25ms
- **Cache Hit Rate**: >85% for frequent queries
- **Offline Sync Success Rate**: >99.5%
- **WebSocket Reconnection Time**: <2 seconds

### Scalability Targets
- **Concurrent Mobile Users**: 5,000+ simultaneous
- **API Requests per Second**: 10,000+ RPS
- **Database Connections**: Efficient pooling with <50 connections
- **Memory Usage**: <512MB per API instance
- **CPU Usage**: <70% under normal load

### Reliability Requirements
- **API Uptime**: 99.95% (especially on Saturdays)
- **Error Rate**: <0.1% for all endpoints
- **Data Consistency**: 100% (no lost wedding data)
- **Conflict Resolution**: 100% automated resolution rate

Your mobile-optimized API architecture will be the invisible backbone that ensures every wedding runs smoothly, even when network conditions are challenging. Every bride, groom, and wedding vendor depends on your lightning-fast, bulletproof implementation.

**Remember**: Wedding days don't have second chances. Your API must be flawless from the moment it goes live. 💍⚡