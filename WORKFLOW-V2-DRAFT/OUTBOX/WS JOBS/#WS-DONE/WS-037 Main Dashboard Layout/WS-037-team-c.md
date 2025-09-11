# TEAM C - ROUND 1: WS-037 - Main Dashboard Layout
## 2025-08-31 - Development Round 1

**YOUR MISSION:** Build robust real-time integration systems, intelligent caching layers, and third-party service connections for dashboard data synchronization
**FEATURE ID:** WS-037 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about real-time data consistency and resilient integration patterns for wedding professional workflows

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **INTEGRATION SERVICES EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/dashboard/
cat $WS_ROOT/wedsync/src/lib/integrations/dashboard/RealtimeSubscriptionManager.ts | head -30
ls -la $WS_ROOT/wedsync/src/lib/cache/
cat $WS_ROOT/wedsync/src/lib/cache/DashboardCacheManager.ts | head -20
```

2. **REAL-TIME SUBSCRIPTION PROOF:**
```bash
npm run test:realtime -- dashboard
# MUST show: "All dashboard real-time subscription tests passing"
```

3. **INTEGRATION RESILIENCE TESTING:**
```bash
npm run test:integration -- dashboard-resilience
# MUST show: "All dashboard integration resilience tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 🧭 CRITICAL: INTEGRATION ARCHITECTURE REQUIREMENTS (MANDATORY FOR INTEGRATION FEATURES)

**❌ FORBIDDEN: Fragile integrations without proper error handling and retry logic**
**✅ MANDATORY: All integrations must implement circuit breaker and resilience patterns**

### INTEGRATION ARCHITECTURE CHECKLIST
- [ ] Circuit breaker pattern for external service calls
- [ ] Exponential backoff retry logic with jitter
- [ ] Real-time subscription connection management and recovery
- [ ] Intelligent cache invalidation strategies
- [ ] Health check monitoring for all integration points
- [ ] Graceful degradation when services are unavailable
- [ ] Comprehensive error logging and alerting

### INTEGRATION RESILIENCE PATTERN:
```typescript
// File: $WS_ROOT/wedsync/src/lib/integrations/dashboard/DashboardIntegrationClient.ts
import { CircuitBreaker } from '$WS_ROOT/wedsync/src/lib/resilience/CircuitBreaker';
import { RetryManager } from '$WS_ROOT/wedsync/src/lib/resilience/RetryManager';

export class DashboardIntegrationClient {
  private circuitBreaker = new CircuitBreaker({
    threshold: 5,
    timeout: 30000,
    resetTimeout: 60000
  });
  
  private retryManager = new RetryManager({
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    jitter: true
  });
}
```

## 📚 STEP 1: ENHANCED DOCUMENTATION & INTEGRATION ANALYSIS (MANDATORY - 10 MINUTES!)

### A. INTEGRATION PATTERNS ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Understand existing integration patterns
await mcp__serena__search_for_pattern("integration client circuit breaker retry");
await mcp__serena__find_symbol("CircuitBreaker RetryManager RealtimeManager", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/integrations/");
```

### B. REAL-TIME TECHNOLOGY REQUIREMENTS (MANDATORY FOR ALL INTEGRATION WORK)
```typescript
// CRITICAL: Load real-time and caching patterns
await mcp__ref__ref_search_documentation("Supabase realtime subscriptions client-side");
await mcp__ref__ref_search_documentation("Redis caching patterns Node.js");
await mcp__ref__ref_search_documentation("Circuit breaker pattern TypeScript");
await mcp__ref__ref_search_documentation("WebSocket reconnection strategies");
```

**🚨 CRITICAL INTEGRATION TECHNOLOGY STACK:**
- **Supabase Realtime**: Real-time subscriptions with automatic reconnection
- **Redis**: Intelligent caching with TTL and invalidation patterns
- **Circuit Breaker**: Resilience pattern for external service protection
- **WebSocket Manager**: Connection lifecycle and error recovery
- **Event Sourcing**: Dashboard event tracking and replay capabilities

**❌ DO NOT USE:**
- Direct database polling for real-time updates
- Synchronous external service calls without timeouts
- Caching without proper invalidation strategies

### C. REF MCP INTEGRATION DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to dashboard integrations
# Use Ref MCP to search for:
# - "Supabase realtime channels subscription management"
# - "Redis cache invalidation patterns best practices"
# - "WebSocket connection management React"
# - "Circuit breaker implementation TypeScript"
# - "Event sourcing patterns dashboard analytics"
# - "Exponential backoff retry algorithms"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR DASHBOARD INTEGRATION ARCHITECTURE

### Integration-Focused Sequential Thinking for Dashboard Systems

```typescript
// Complex dashboard integration architecture analysis
mcp__sequential-thinking__sequential_thinking({
  thought: "Dashboard integration architecture needs: real-time subscription manager for live activity feeds, intelligent cache manager with Redis for performance, circuit breaker integration for external services, WebSocket connection manager with auto-reconnection, event sourcing for dashboard analytics, and health monitoring for all integration points.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Real-time data flow complexity: Supabase subscriptions for database changes, WebSocket channels for multi-user dashboard updates, cache invalidation triggers, optimistic UI update coordination, connection state management during network issues, and data consistency guarantees during high load periods.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Caching strategy requirements: Multi-level caching (Redis + browser), intelligent invalidation based on data dependencies, cache warming strategies for dashboard metrics, TTL optimization for different data types, cache coherence across multiple dashboard instances, and fallback strategies when cache is unavailable.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration resilience patterns: Circuit breakers for external API calls, exponential backoff with jitter for retries, health checks for all services, graceful degradation when integrations fail, monitoring and alerting for integration health, and automatic recovery mechanisms for temporary failures.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding professional workflow requirements: Zero tolerance for data loss during wedding season, real-time notifications for urgent items, seamless offline-to-online synchronization, priority handling for time-sensitive updates, and integration resilience during high-traffic periods (Friday evenings, weekend mornings).",
  nextThoughtNeeded: true,
  thoughtNumber: 5,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Build connection managers with auto-recovery, implement multi-level caching with intelligent invalidation, create circuit breaker pattern for all external calls, set up comprehensive health monitoring, develop event sourcing for dashboard analytics, and ensure seamless integration with Team A frontend and Team B APIs.",
  nextThoughtNeeded: false,
  thoughtNumber: 6,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH INTEGRATION FOCUS

Launch these agents with comprehensive integration and resilience requirements:

1. **integration-specialist** --realtime-subscriptions --caching-strategies --circuit-breaker-patterns
   - Mission: Build robust integration patterns with comprehensive error handling
   
2. **performance-optimization-expert** --caching-optimization --realtime-performance --connection-management
   - Mission: Optimize real-time data flow and caching for maximum performance
   
3. **security-compliance-officer** --integration-security --realtime-authentication --cache-security
   - Mission: Ensure all integrations maintain security standards and data protection
   
4. **test-automation-architect** --integration-testing --realtime-testing --resilience-testing
   - Mission: Create comprehensive integration test suite with failure scenario coverage
   
5. **user-impact-analyzer** --integration-reliability --wedding-workflow-continuity --data-consistency
   - Mission: Ensure integrations support wedding professional workflow requirements
   
6. **documentation-chronicler** --integration-documentation --real-time-guides --troubleshooting-guides
   - Mission: Document all integration patterns with troubleshooting and monitoring guides

## 🎯 TECHNICAL SPECIFICATION

**Core Integration Requirements from WS-037:**
- Real-time subscription management with auto-reconnection
- Multi-level intelligent caching with Redis and browser cache
- Circuit breaker pattern for external service resilience
- WebSocket connection lifecycle management
- Event sourcing for dashboard analytics and audit trails
- Health monitoring and alerting for all integration points
- Graceful degradation and fallback strategies

## 🔌 INTEGRATION IMPLEMENTATION REQUIREMENTS

### Core Integration Components to Build:

**1. RealtimeSubscriptionManager.ts (Real-time Data Management)**
```typescript
import { createClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';

interface SubscriptionOptions {
  channel: string;
  event?: string;
  filter?: Record<string, any>;
  onData: (payload: any) => void;
  onError: (error: Error) => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
}

export class RealtimeSubscriptionManager extends EventEmitter {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  private subscriptions = new Map<string, any>();
  private reconnectAttempts = new Map<string, number>();
  private isConnected = false;
  
  async subscribe(id: string, options: SubscriptionOptions): Promise<void> {
    const channel = this.supabase.channel(options.channel, {
      config: {
        broadcast: { self: false },
        presence: { key: `dashboard-${id}` }
      }
    });
    
    channel
      .on('broadcast', { event: options.event }, options.onData)
      .on('presence', { event: 'sync' }, () => {
        this.emit('presence-sync', channel.presenceState());
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.subscriptions.set(id, channel);
          this.isConnected = true;
          this.emit('connected', id);
        } else if (status === 'CLOSED') {
          this.handleDisconnection(id, options);
        }
      });
  }
  
  private async handleDisconnection(id: string, options: SubscriptionOptions): Promise<void> {
    this.isConnected = false;
    this.emit('disconnected', id);
    
    if (!options.autoReconnect) return;
    
    const attempts = this.reconnectAttempts.get(id) || 0;
    if (attempts >= (options.maxReconnectAttempts || 5)) {
      this.emit('max-reconnect-attempts', id);
      return;
    }
    
    this.reconnectAttempts.set(id, attempts + 1);
    
    // Exponential backoff with jitter
    const delay = Math.min(1000 * Math.pow(2, attempts), 30000) + Math.random() * 1000;
    
    setTimeout(() => {
      this.subscribe(id, options);
    }, delay);
  }
  
  unsubscribe(id: string): void {
    const subscription = this.subscriptions.get(id);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(id);
      this.reconnectAttempts.delete(id);
    }
  }
  
  unsubscribeAll(): void {
    for (const [id] of this.subscriptions) {
      this.unsubscribe(id);
    }
  }
  
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
```

**2. DashboardCacheManager.ts (Intelligent Caching)**
```typescript
import { Redis } from 'ioredis';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
  version?: string; // Cache version for invalidation
  compress?: boolean; // Compress large payloads
}

interface CacheKey {
  namespace: string;
  supplierId: string;
  resource: string;
  params?: Record<string, any>;
}

export class DashboardCacheManager {
  private redis = new Redis(process.env.REDIS_URL!);
  private cachePrefix = 'dashboard:';
  
  async get<T>(key: CacheKey): Promise<T | null> {
    try {
      const cacheKey = this.buildCacheKey(key);
      const cached = await this.redis.get(cacheKey);
      
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      
      // Check cache version
      if (data._meta?.version !== key.params?.version) {
        await this.delete(key);
        return null;
      }
      
      return data.payload as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  async set<T>(key: CacheKey, data: T, options: CacheOptions = {}): Promise<void> {
    try {
      const cacheKey = this.buildCacheKey(key);
      const payload = {
        payload: data,
        _meta: {
          timestamp: Date.now(),
          version: options.version,
          tags: options.tags || []
        }
      };
      
      const serialized = JSON.stringify(payload);
      const ttl = options.ttl || 300; // Default 5 minutes
      
      await this.redis.setex(cacheKey, ttl, serialized);
      
      // Store tags for invalidation
      if (options.tags) {
        for (const tag of options.tags) {
          const tagKey = `${this.cachePrefix}tags:${tag}`;
          await this.redis.sadd(tagKey, cacheKey);
          await this.redis.expire(tagKey, ttl);
        }
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }
  
  async invalidateByTag(tag: string): Promise<void> {
    try {
      const tagKey = `${this.cachePrefix}tags:${tag}`;
      const keys = await this.redis.smembers(tagKey);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        await this.redis.del(tagKey);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
  
  async invalidateSupplier(supplierId: string): Promise<void> {
    try {
      const pattern = `${this.cachePrefix}${supplierId}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Supplier cache invalidation error:', error);
    }
  }
  
  async warmCache(supplierId: string, data: Record<string, any>): Promise<void> {
    const warmupTasks = [
      this.set(
        { namespace: 'dashboard', supplierId, resource: 'quick-actions' },
        data.quickActions,
        { ttl: 1800, tags: [`supplier:${supplierId}`, 'quick-actions'] }
      ),
      this.set(
        { namespace: 'dashboard', supplierId, resource: 'metrics' },
        data.metrics,
        { ttl: 300, tags: [`supplier:${supplierId}`, 'metrics'] }
      )
    ];
    
    await Promise.all(warmupTasks);
  }
  
  private buildCacheKey(key: CacheKey): string {
    const parts = [this.cachePrefix, key.supplierId, key.namespace, key.resource];
    
    if (key.params) {
      const paramString = Object.keys(key.params)
        .sort()
        .map(k => `${k}:${key.params![k]}`)
        .join('|');
      parts.push(paramString);
    }
    
    return parts.join(':');
  }
}
```

**3. DashboardCircuitBreaker.ts (Resilience Pattern)**
```typescript
interface CircuitBreakerOptions {
  threshold: number; // Failure threshold before opening
  timeout: number; // Time in open state before trying half-open
  resetTimeout: number; // Time to reset failure count
  monitor: (error: Error) => void; // Error monitoring callback
}

enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open'
}

export class DashboardCircuitBreaker {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime?: number;
  private successCount = 0;
  
  constructor(private options: CircuitBreakerOptions) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - operation not attempted');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failureCount = 0;
    this.lastFailureTime = undefined;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 3) { // Require 3 successes to fully close
        this.state = CircuitState.CLOSED;
      }
    }
  }
  
  private onFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.options.monitor(error);
    
    if (this.failureCount >= this.options.threshold) {
      this.state = CircuitState.OPEN;
    }
  }
  
  private shouldAttemptReset(): boolean {
    return (
      this.lastFailureTime !== undefined &&
      Date.now() - this.lastFailureTime >= this.options.timeout
    );
  }
  
  getState(): CircuitState {
    return this.state;
  }
  
  getMetrics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}
```

**4. DashboardEventSourcing.ts (Analytics & Audit)**
```typescript
interface DashboardEvent {
  eventId: string;
  supplierId: string;
  eventType: string;
  payload: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export class DashboardEventSourcing {
  private eventStore: DashboardEvent[] = [];
  private eventSubscribers = new Map<string, Array<(event: DashboardEvent) => void>>();
  
  async recordEvent(event: Omit<DashboardEvent, 'eventId' | 'timestamp'>): Promise<void> {
    const dashboardEvent: DashboardEvent = {
      ...event,
      eventId: crypto.randomUUID(),
      timestamp: new Date()
    };
    
    // Store event (in production, this would go to a database)
    this.eventStore.push(dashboardEvent);
    
    // Emit to subscribers
    const subscribers = this.eventSubscribers.get(event.eventType) || [];
    subscribers.forEach(callback => callback(dashboardEvent));
    
    // Store in persistent storage
    await this.persistEvent(dashboardEvent);
  }
  
  subscribe(eventType: string, callback: (event: DashboardEvent) => void): void {
    if (!this.eventSubscribers.has(eventType)) {
      this.eventSubscribers.set(eventType, []);
    }
    this.eventSubscribers.get(eventType)!.push(callback);
  }
  
  async getEventHistory(supplierId: string, eventTypes?: string[]): Promise<DashboardEvent[]> {
    return this.eventStore.filter(event => {
      if (event.supplierId !== supplierId) return false;
      if (eventTypes && !eventTypes.includes(event.eventType)) return false;
      return true;
    });
  }
  
  async replayEvents(supplierId: string, fromTimestamp: Date): Promise<DashboardEvent[]> {
    return this.eventStore.filter(event => 
      event.supplierId === supplierId && event.timestamp >= fromTimestamp
    );
  }
  
  private async persistEvent(event: DashboardEvent): Promise<void> {
    // In production, store in database
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      await supabase.from('dashboard_events').insert({
        event_id: event.eventId,
        supplier_id: event.supplierId,
        event_type: event.eventType,
        payload: event.payload,
        timestamp: event.timestamp.toISOString(),
        user_id: event.userId,
        session_id: event.sessionId
      });
    } catch (error) {
      console.error('Failed to persist dashboard event:', error);
    }
  }
}
```

**5. DashboardHealthMonitor.ts (Integration Health)**
```typescript
interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  lastChecked: Date;
  error?: string;
}

export class DashboardHealthMonitor {
  private healthChecks = new Map<string, HealthCheck>();
  private monitoringInterval?: NodeJS.Timeout;
  
  startMonitoring(intervalMs: number = 60000): void {
    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
    }, intervalMs);
  }
  
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
  
  private async performHealthChecks(): Promise<void> {
    const checks = [
      this.checkDatabase(),
      this.checkRedisCache(),
      this.checkRealtimeConnection(),
      this.checkExternalAPIs()
    ];
    
    await Promise.allSettled(checks);
  }
  
  private async checkDatabase(): Promise<void> {
    const startTime = Date.now();
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      await supabase.from('suppliers').select('id').limit(1);
      
      this.healthChecks.set('database', {
        name: 'Database',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date()
      });
    } catch (error) {
      this.healthChecks.set('database', {
        name: 'Database',
        status: 'unhealthy',
        lastChecked: new Date(),
        error: (error as Error).message
      });
    }
  }
  
  private async checkRedisCache(): Promise<void> {
    const startTime = Date.now();
    try {
      const redis = new Redis(process.env.REDIS_URL!);
      await redis.ping();
      redis.disconnect();
      
      this.healthChecks.set('redis', {
        name: 'Redis Cache',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date()
      });
    } catch (error) {
      this.healthChecks.set('redis', {
        name: 'Redis Cache',
        status: 'unhealthy',
        lastChecked: new Date(),
        error: (error as Error).message
      });
    }
  }
  
  getHealthStatus(): Record<string, HealthCheck> {
    return Object.fromEntries(this.healthChecks);
  }
  
  getOverallHealth(): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Array.from(this.healthChecks.values()).map(check => check.status);
    
    if (statuses.every(status => status === 'healthy')) return 'healthy';
    if (statuses.some(status => status === 'unhealthy')) return 'unhealthy';
    return 'degraded';
  }
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

- [ ] Real-time subscription manager with auto-reconnection
- [ ] Multi-level cache manager with intelligent invalidation
- [ ] Circuit breaker implementation for external services
- [ ] Event sourcing system for dashboard analytics
- [ ] Health monitoring for all integration points
- [ ] WebSocket connection lifecycle management
- [ ] Graceful degradation and fallback strategies
- [ ] Comprehensive integration testing with failure scenarios

## 🎭 PLAYWRIGHT TESTING REQUIREMENTS

```typescript
// 1. REAL-TIME SUBSCRIPTION TESTING
test('Real-time dashboard updates work correctly', async ({ page, context }) => {
  await page.goto('/dashboard');
  
  // Monitor real-time updates
  const updatePromise = page.waitForFunction(
    () => window.realtimeUpdateReceived,
    { timeout: 10000 }
  );
  
  // Trigger update from another context
  const page2 = await context.newPage();
  await page2.goto('/clients/new');
  await page2.fill('[data-testid="client-name"]', 'Test Client');
  await page2.click('[data-testid="save-client"]');
  
  // Verify real-time update received
  await updatePromise;
  await expect(page.locator('[data-testid="activity-feed"]')).toContainText('Test Client');
});

// 2. CACHE INTEGRATION TESTING
test('Dashboard caching improves load times', async ({ page }) => {
  // First load (cache miss)
  const start1 = Date.now();
  await page.goto('/dashboard');
  await page.waitForSelector('[data-testid="dashboard-loaded"]');
  const firstLoadTime = Date.now() - start1;
  
  // Second load (cache hit)
  const start2 = Date.now();
  await page.reload();
  await page.waitForSelector('[data-testid="dashboard-loaded"]');
  const secondLoadTime = Date.now() - start2;
  
  // Cache should improve load time by at least 30%
  expect(secondLoadTime).toBeLessThan(firstLoadTime * 0.7);
});

// 3. CIRCUIT BREAKER TESTING
test('Circuit breaker prevents cascade failures', async ({ page }) => {
  // Simulate service failure
  await page.route('/api/external/service', route => {
    route.abort('failed');
  });
  
  await page.goto('/dashboard');
  
  // Should gracefully degrade
  await expect(page.locator('[data-testid="service-degraded-notice"]')).toBeVisible();
  await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
});

// 4. CONNECTION RECOVERY TESTING
test('Dashboard recovers from network interruptions', async ({ page, context }) => {
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
  
  // Simulate network interruption
  await context.setOffline(true);
  await expect(page.locator('[data-testid="connection-status"]')).toContainText('Disconnected');
  
  // Restore network
  await context.setOffline(false);
  await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
  
  // Verify real-time functionality restored
  await expect(page.locator('[data-testid="realtime-indicator"]')).toHaveClass(/connected/);
});

// 5. PERFORMANCE INTEGRATION TESTING
test('Dashboard maintains performance under load', async ({ page }) => {
  // Measure performance metrics
  await page.goto('/dashboard');
  
  const performanceMetrics = await page.evaluate(() => {
    return JSON.stringify({
      loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
      domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime
    });
  });
  
  const metrics = JSON.parse(performanceMetrics);
  expect(metrics.loadTime).toBeLessThan(3000); // < 3s load time
  expect(metrics.domContentLoaded).toBeLessThan(2000); // < 2s DOM ready
});
```

## 💾 WHERE TO SAVE YOUR WORK

- **Integration Services**: `$WS_ROOT/wedsync/src/lib/integrations/dashboard/`
  - `RealtimeSubscriptionManager.ts`
  - `DashboardIntegrationClient.ts`
  - `DashboardEventSourcing.ts`
  - `DashboardHealthMonitor.ts`
- **Cache Manager**: `$WS_ROOT/wedsync/src/lib/cache/`
  - `DashboardCacheManager.ts`
- **Resilience Patterns**: `$WS_ROOT/wedsync/src/lib/resilience/`
  - `DashboardCircuitBreaker.ts`
  - `RetryManager.ts`
- **Integration Tests**: `$WS_ROOT/wedsync/tests/integration/dashboard/`
- **Types**: `$WS_ROOT/wedsync/src/types/integrations.ts`

## 🏁 COMPLETION CHECKLIST

### Integration Implementation:
- [ ] Real-time subscription manager with auto-reconnection
- [ ] Multi-level cache manager with intelligent invalidation strategies
- [ ] Circuit breaker pattern for all external service calls
- [ ] Event sourcing system for dashboard analytics
- [ ] Health monitoring with automated alerting
- [ ] Comprehensive error handling and recovery mechanisms

### Resilience & Performance:
- [ ] Integration testing with failure scenario coverage
- [ ] Performance optimization for real-time data flows
- [ ] Graceful degradation when services are unavailable
- [ ] Cache warming strategies for optimal performance
- [ ] Connection recovery mechanisms tested and verified

### Integration Points:
- [ ] Seamless integration with Team A frontend subscriptions
- [ ] Backend API support for Team B dashboard endpoints
- [ ] Mobile optimization coordination with Team D
- [ ] Comprehensive test data and scenarios for Team E

### Evidence Package:
- [ ] Integration architecture documentation
- [ ] Real-time subscription flow diagrams
- [ ] Caching strategy documentation
- [ ] Health monitoring dashboard
- [ ] Performance benchmark results with load testing

---

**EXECUTE IMMEDIATELY - This is a comprehensive integration prompt with full resilience patterns!**