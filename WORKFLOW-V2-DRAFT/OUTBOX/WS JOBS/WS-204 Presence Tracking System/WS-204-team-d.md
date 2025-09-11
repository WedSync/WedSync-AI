# WS-204-TEAM-D: Presence Tracking Performance Architecture
## Generated: 2025-01-20 | Development Manager Session | Feature: WS-204 Presence Tracking System

---

## 🎯 MISSION: HIGH-PERFORMANCE PRESENCE INFRASTRUCTURE

**Your mission as Team D (Performance/Infrastructure Specialists):** Build enterprise-grade presence tracking infrastructure that maintains sub-2-second status updates, supports 2000+ concurrent presence subscriptions during wedding season peaks, and delivers intelligent presence state management with Redis clustering, connection optimization, and real-time analytics.

**Impact:** Enables reliable presence awareness for large wedding businesses managing 100+ suppliers simultaneously, prevents presence system degradation during peak coordination hours (6-8pm), and provides sub-second presence updates ensuring immediate availability feedback for time-sensitive wedding coordination.

---

## 📋 EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

Before you can claim completion, you MUST provide concrete evidence:

### 🔍 MANDATORY FILE PROOF
```bash
# Run these exact commands and include output in your completion report:
ls -la $WS_ROOT/wedsync/src/lib/performance/presence/
ls -la $WS_ROOT/wedsync/src/lib/cache/presence-cache/
ls -la $WS_ROOT/wedsync/monitoring/presence-performance/
cat $WS_ROOT/wedsync/src/lib/performance/presence/presence-optimizer.ts | head -20
```

### 🧪 MANDATORY TEST VALIDATION
```bash
# All these commands MUST pass:
cd $WS_ROOT/wedsync && npm run typecheck
cd $WS_ROOT/wedsync && npm test -- --testPathPattern=performance
cd $WS_ROOT/wedsync && npm test -- --testPathPattern=presence-cache
cd $WS_ROOT/wedsync && npm run test:load -- presence-tracking
```

### 🎭 MANDATORY E2E PROOF
Your delivery MUST include Playwright test evidence showing:
- 2000+ concurrent presence subscriptions maintained
- Sub-2-second presence status update propagation
- Redis cluster handling presence data with 99%+ uptime
- Presence state consistency during network partitions
- Auto-scaling activation during wedding season traffic spikes

**NO EXCEPTIONS:** Without this evidence, your work is incomplete regardless of performance optimization quality.

---

## 🧠 ENHANCED SERENA MCP ACTIVATION

### 🤖 SERENA INTELLIGENCE SETUP
```bash
# MANDATORY: Activate Serena's performance pattern analysis
mcp__serena__activate_project("wedsync")
mcp__serena__get_symbols_overview("src/lib/performance/presence")
mcp__serena__find_symbol("PresenceOptimizer")
mcp__serena__write_memory("presence-performance", "High-performance presence tracking with Redis clustering and real-time optimization")
```

**Serena-Enhanced Performance Development:**
1. **Performance Pattern Analysis**: Analyze existing caching and optimization patterns
2. **Bottleneck Identification**: Use Serena to identify presence system performance bottlenecks
3. **Code Optimization**: Leverage semantic understanding for performance-critical presence paths
4. **Memory Management**: Optimize presence state lifecycle and garbage collection patterns

---

## 🧩 SEQUENTIAL THINKING ACTIVATION - PRESENCE PERFORMANCE ARCHITECTURE

```typescript
mcp__sequential_thinking__sequentialthinking({
  thought: "I need to design high-performance presence tracking infrastructure for wedding coordination at scale. Key performance challenges: 1) Real-time presence state management for 2000+ concurrent connections 2) Sub-2-second status update propagation across all subscribers 3) Redis clustering for presence data consistency and failover 4) Connection pool optimization for Supabase Realtime Presence 5) Memory-efficient presence state caching and cleanup. The wedding context adds complexity - peak usage during 6-8pm coordination hours, seasonal traffic spikes (10x during June), and requirement for immediate presence feedback during time-sensitive wedding communications.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 8
})

mcp__sequential_thinking__sequentialthinking({
  thought: "For the technical architecture, I need: 1) Redis cluster configuration with read replicas for presence state caching 2) Presence state optimizer managing memory allocation and cleanup 3) Connection pooling for efficient Supabase Realtime channel management 4) Auto-scaling triggers based on presence subscription count and update latency 5) Performance monitoring with real-time presence metrics dashboard. The system must handle ephemeral presence data (in-memory Supabase Presence) while maintaining performance for persistent data queries (last seen, settings).",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 8
})

mcp__sequential_thinking__sequentialthiving({
  thought: "For wedding-specific performance optimization: Peak usage patterns require preemptive scaling - 6pm surge when couples update details requires 2x capacity, weekend wedding coordination needs 5x normal presence subscriptions. Presence state should be optimized for wedding team contexts (10-15 suppliers per wedding) with efficient bulk operations. Geographic distribution matters - presence updates must be fast globally for destination wedding coordination. Cache warming strategies should anticipate wedding coordination patterns.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 8
})

// Continue structured analysis through monitoring, alerting, optimization strategies...
```

---

## 🔐 SECURITY REQUIREMENTS (TEAM D SPECIALIZATION)

### 🚨 MANDATORY SECURITY IMPLEMENTATION

**ALL performance components must implement security patterns:**
```typescript
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { z } from 'zod';
import { rateLimitService } from '$WS_ROOT/wedsync/src/lib/rate-limiter';
import { performanceMonitor } from '$WS_ROOT/wedsync/src/lib/monitoring/presence-performance';

const presenceOptimizationSchema = z.object({
  connectionCount: z.number().min(1).max(5000),
  cacheTTL: z.number().min(60).max(3600),
  scaleTarget: z.number().min(1).max(20)
});

class SecurePresenceOptimizer {
  async optimizePresencePerformance(userId: string, config: PresenceOptimizationConfig) {
    // Rate limit: 10 optimization requests/minute per admin
    await rateLimitService.checkLimit(`presence_opt:${userId}`, 10, 60);
    
    // Performance monitoring for security anomalies
    performanceMonitor.trackOptimizationAttempt(userId, config);
    
    // Resource limits: Prevent performance-based DoS
    this.validateResourceLimits(config);
    
    // Security audit: Performance optimization attempts
    // Memory limits: Per-user presence subscription quotas
    // DoS protection: Connection rate limiting
  }
  
  private validateResourceLimits(config: PresenceOptimizationConfig): void {
    if (config.connectionCount > 2000) {
      throw new Error('Connection limit exceeded for security');
    }
    if (config.cacheTTL < 60) {
      throw new Error('Cache TTL too low - security risk');
    }
  }
}
```

### 🔒 TEAM D SECURITY CHECKLIST
- [ ] Connection rate limiting: 100 presence subscriptions/minute per user
- [ ] Resource quotas: Free tier (50 subscriptions), Paid tier (500 subscriptions)
- [ ] DoS protection: Presence subscription flood prevention
- [ ] Memory limits: Per-user presence cache allocation capping
- [ ] Performance monitoring for security anomaly detection
- [ ] Audit logging for all performance-critical operations
- [ ] Circuit breaker protection against performance attacks
- [ ] Auto-scaling limits to prevent cost-based attacks

---

## 💡 UI TECHNOLOGY REQUIREMENTS

### 🎨 DESIGN SYSTEM INTEGRATION
Use our premium component libraries for performance monitoring:

**Untitled UI Components (License: $247 - Premium):**
```typescript
// For presence performance dashboards and analytics
import { Card, Badge, Button, ProgressBar } from '@/components/untitled-ui';
import { MetricsChart, PerformanceGraph } from '@/components/untitled-ui/analytics';
```

**Magic UI Components (Free Tier):**
```typescript
// For real-time performance indicators
import { LiveMetric, PerformanceGauge, ConnectionCounter } from '@/components/magic-ui';
import { AnimatedNumber, RealTimeChart } from '@/components/magic-ui/data-visualization';
```

**Mandatory Navigation Integration:**
Every performance feature MUST integrate with navigation:
```typescript
// Add to: src/components/navigation/NavigationItems.tsx
{
  label: 'Presence Performance',
  href: '/admin/performance/presence',
  icon: 'activity',
  badge: performanceAlerts > 0 ? performanceAlerts : undefined
}
```

---

## 🔧 TEAM D PERFORMANCE SPECIALIZATION

### 🎯 YOUR CORE DELIVERABLES

**1. High-Performance Presence State Optimizer**
```typescript
// Required: /src/lib/performance/presence/presence-optimizer.ts
interface PresenceOptimizer {
  // Core optimization
  optimizePresenceConnections(): Promise<OptimizationResult>;
  managePresenceMemory(): Promise<MemoryOptimizationResult>;
  optimizeCacheStrategy(): Promise<CacheOptimizationResult>;
  
  // Scaling and load management
  scalePresenceInfrastructure(targetLoad: number): Promise<ScalingResult>;
  predictPresenceLoad(timeWindow: TimeWindow): Promise<LoadPrediction>;
  
  // Performance monitoring
  getPresencePerformanceMetrics(): Promise<PresencePerformanceMetrics>;
  detectPerformanceAnomalies(): Promise<PresenceAnomaly[]>;
  generateOptimizationRecommendations(): Promise<OptimizationRecommendation[]>;
}

interface PresencePerformanceMetrics {
  connectionCount: number;
  averageUpdateLatency: number;
  cacheHitRatio: number;
  memoryUsage: MemoryUsageStats;
  subscriptionThroughput: number;
  errorRate: number;
  scalingEvents: ScalingEvent[];
  peakConcurrentUsers: number;
}

interface OptimizationResult {
  connectionsOptimized: number;
  memoryFreed: number;
  latencyImprovement: number;
  cacheEfficiencyGain: number;
  recommendations: string[];
  nextOptimizationWindow: Date;
}

// Wedding-specific presence optimization
async function optimizeWeddingPresencePatterns(): Promise<void> {
  // Optimize for wedding coordination peak hours (6-8pm)
  const peakHours = [18, 19, 20];
  const currentHour = new Date().getHours();
  
  if (peakHours.includes(currentHour)) {
    // Pre-scale for coordination surge
    await this.scalePresenceInfrastructure(1.5); // 50% increase
    
    // Warm presence cache for active weddings
    const activeWeddings = await getActiveWeddings();
    await this.warmPresenceCacheForWeddings(activeWeddings);
    
    // Optimize connection pooling for burst traffic
    await this.optimizeConnectionPooling({ burstMode: true });
  }
}
```

**2. Redis Presence Cache Cluster Manager**
```typescript
// Required: /src/lib/cache/presence-cache/redis-cluster-manager.ts
interface PresenceCacheClusterManager {
  // Cluster management
  initializeRedisCluster(): Promise<void>;
  monitorClusterHealth(): Promise<ClusterHealthStatus>;
  handleNodeFailover(): Promise<FailoverResult>;
  
  // Presence-specific caching
  cachePresenceState(userId: string, state: PresenceState, ttl?: number): Promise<void>;
  getBulkPresenceFromCache(userIds: string[]): Promise<Record<string, PresenceState>>;
  invalidatePresenceCache(userId: string): Promise<void>;
  
  // Performance optimization
  optimizeCacheDistribution(): Promise<void>;
  rebalancePresenceData(): Promise<void>;
  cleanupStalePresenceData(): Promise<number>;
}

// Redis cluster configuration for presence tracking
const redisClusterConfig = {
  nodes: [
    { host: 'redis-presence-1', port: 6379 },
    { host: 'redis-presence-2', port: 6379 }, 
    { host: 'redis-presence-3', port: 6379 }
  ],
  options: {
    enableReadyCheck: false,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableOfflineQueue: false,
    lazyConnect: true
  },
  presenceConfig: {
    keyPrefix: 'presence:',
    defaultTTL: 300, // 5 minutes
    maxMemoryPolicy: 'allkeys-lru',
    maxConnections: 1000
  }
};

// Presence state caching with clustering
class PresenceRedisCluster {
  private cluster: Redis.Cluster;
  
  async cachePresenceState(userId: string, state: PresenceState, ttl = 300): Promise<void> {
    const key = `presence:user:${userId}`;
    const pipeline = this.cluster.pipeline();
    
    // Cache presence data with expiration
    pipeline.hset(key, {
      status: state.status,
      lastActivity: state.lastActivity,
      customStatus: state.customStatus || '',
      device: state.device || '',
      updatedAt: Date.now()
    });
    pipeline.expire(key, ttl);
    
    // Track presence in user set for bulk operations
    pipeline.sadd('presence:active:users', userId);
    pipeline.expire('presence:active:users', ttl + 60);
    
    await pipeline.exec();
  }
  
  async getBulkPresenceFromCache(userIds: string[]): Promise<Record<string, PresenceState>> {
    const pipeline = this.cluster.pipeline();
    const cacheKeys = userIds.map(id => `presence:user:${id}`);
    
    // Batch fetch presence data
    cacheKeys.forEach(key => pipeline.hgetall(key));
    
    const results = await pipeline.exec();
    const presenceData: Record<string, PresenceState> = {};
    
    results?.forEach((result, index) => {
      const [error, data] = result;
      if (!error && data && Object.keys(data).length > 0) {
        const userId = userIds[index];
        presenceData[userId] = {
          status: data.status as PresenceStatus,
          lastActivity: data.lastActivity,
          customStatus: data.customStatus || undefined,
          device: data.device || undefined,
          updatedAt: new Date(parseInt(data.updatedAt))
        };
      }
    });
    
    return presenceData;
  }
}
```

**3. Auto-Scaling Presence Infrastructure**
```typescript
// Required: /src/lib/performance/presence/auto-scaler.ts
interface PresenceAutoScaler {
  // Scaling triggers
  monitorPresenceLoad(): Promise<void>;
  triggerScaleUp(reason: ScalingTrigger, targetCapacity: number): Promise<void>;
  triggerScaleDown(reason: ScalingTrigger, targetCapacity: number): Promise<void>;
  
  // Wedding-specific scaling
  predictWeddingSeasonLoad(): Promise<SeasonalLoadPrediction>;
  preScaleForWeddingEvents(): Promise<void>;
  optimizeForCoordinationPeaks(): Promise<void>;
  
  // Scaling management
  getScalingHistory(): Promise<ScalingEvent[]>;
  validateScalingDecision(decision: ScalingDecision): Promise<boolean>;
}

enum PresenceScalingTrigger {
  HIGH_SUBSCRIPTION_COUNT = 'high_subscription_count',
  HIGH_UPDATE_LATENCY = 'high_update_latency',
  HIGH_MEMORY_USAGE = 'high_memory_usage',
  WEDDING_SEASON_PATTERN = 'wedding_season_pattern',
  COORDINATION_PEAK = 'coordination_peak'
}

// Wedding season auto-scaling logic
async function handleWeddingSeasonScaling(): Promise<void> {
  const currentMonth = new Date().getMonth();
  const weddingPeakMonths = [4, 5, 8, 9]; // May, June, September, October
  
  if (weddingPeakMonths.includes(currentMonth)) {
    const currentHour = new Date().getHours();
    const coordinationPeakHours = [17, 18, 19, 20]; // 5-8pm
    
    if (coordinationPeakHours.includes(currentHour)) {
      // Peak wedding season + coordination peak = maximum scaling
      await this.triggerScaleUp(
        PresenceScalingTrigger.COORDINATION_PEAK,
        await this.calculateOptimalCapacity() * 2
      );
      
      // Enable burst mode for presence connections
      await this.enableBurstMode();
      
      // Pre-warm cache for anticipated presence subscriptions
      await this.preWarmPresenceCache();
    }
  }
}

interface SeasonalLoadPrediction {
  expectedScalingFactor: number;
  peakHours: number[];
  recommendedCapacity: number;
  expectedDuration: number; // minutes
  confidence: number; // 0-1
  resourceRequirements: {
    memory: string;
    cpu: string; 
    connections: number;
  };
}
```

**4. Real-Time Presence Performance Monitor**
```typescript
// Required: /src/lib/monitoring/presence-performance/performance-tracker.ts
interface PresencePerformanceTracker {
  // Real-time metrics
  trackPresenceUpdateLatency(userId: string, latency: number): void;
  trackConnectionCount(): void;
  trackCachePerformance(hitRatio: number, responseTime: number): void;
  trackMemoryUsage(component: string, usage: number): void;
  
  // Performance analysis
  generatePerformanceReport(): Promise<PresencePerformanceReport>;
  detectPerformanceRegressions(): Promise<PerformanceRegression[]>;
  alertOnThresholdBreach(metric: string, value: number, threshold: number): Promise<void>;
  
  // Wedding-specific monitoring
  trackWeddingCoordinationPatterns(): Promise<CoordinationPatternAnalysis>;
  monitorSeasonalPerformanceTrends(): Promise<SeasonalTrendAnalysis>;
}

interface PresencePerformanceReport {
  timestamp: Date;
  averageUpdateLatency: number;
  peakConcurrentConnections: number;
  cacheHitRatio: number;
  memoryUsageByComponent: Record<string, number>;
  errorRate: number;
  scalingEvents: ScalingEvent[];
  weddingCoordinationMetrics: {
    peakCoordinationHours: number[];
    averageTeamSize: number;
    coordinationEfficiency: number;
  };
  recommendations: PerformanceRecommendation[];
}

// Real-time performance monitoring with alerting
class PresencePerformanceMonitor {
  private metricsBuffer: PerformanceMetric[] = [];
  private alertThresholds = {
    updateLatency: 2000, // 2 seconds
    connectionCount: 2000,
    memoryUsage: 0.8, // 80%
    errorRate: 0.05 // 5%
  };
  
  async trackPresenceUpdateLatency(userId: string, latency: number): Promise<void> {
    // Store metric
    this.metricsBuffer.push({
      type: 'update_latency',
      userId,
      value: latency,
      timestamp: new Date()
    });
    
    // Check threshold
    if (latency > this.alertThresholds.updateLatency) {
      await this.alertOnThresholdBreach('update_latency', latency, this.alertThresholds.updateLatency);
    }
    
    // Flush metrics buffer periodically
    if (this.metricsBuffer.length >= 1000) {
      await this.flushMetricsBuffer();
    }
  }
  
  async alertOnThresholdBreach(metric: string, value: number, threshold: number): Promise<void> {
    const alert = {
      metric,
      value,
      threshold,
      timestamp: new Date(),
      severity: this.calculateSeverity(metric, value, threshold)
    };
    
    // Send to monitoring system
    await this.sendPerformanceAlert(alert);
    
    // Auto-remediation for critical alerts
    if (alert.severity === 'critical') {
      await this.attemptAutoRemediation(metric, value);
    }
  }
  
  private async attemptAutoRemediation(metric: string, value: number): Promise<void> {
    switch (metric) {
      case 'update_latency':
        if (value > 5000) { // 5 second latency is critical
          await this.scalePresenceInfrastructure(1.5);
          await this.clearPresenceCache();
        }
        break;
        
      case 'connection_count':
        if (value > 1800) { // Near connection limit
          await this.scalePresenceInfrastructure(1.3);
        }
        break;
        
      case 'memory_usage':
        if (value > 0.9) { // 90% memory usage
          await this.cleanupStalePresenceData();
          await this.optimizeMemoryUsage();
        }
        break;
    }
  }
}
```

**5. Wedding Season Performance Optimization Engine**
```typescript
// Required: /src/lib/performance/presence/wedding-season-optimizer.ts
interface WeddingSeasonPresenceOptimizer {
  // Seasonal optimization
  predictWeddingTrafficPatterns(month: number): Promise<TrafficPrediction>;
  preOptimizeForWeddingSeason(season: WeddingSeason): Promise<void>;
  optimizeForCoordinationPeaks(startHour: number, endHour: number): Promise<void>;
  
  // Pattern analysis
  analyzePresenceUsagePatterns(): Promise<UsagePatternAnalysis>;
  identifyCoordinationBottlenecks(): Promise<BottleneckAnalysis>;
  
  // Proactive optimization
  preWarmPresenceCaches(expectedUsers: string[]): Promise<void>;
  optimizeConnectionPools(): Promise<void>;
  configureSeasonalScaling(rules: SeasonalScalingRule[]): Promise<void>;
}

interface TrafficPrediction {
  expectedPresenceIncrease: number;
  peakCoordinationHours: number[];
  resourceRequirements: ResourceRequirement[];
  recommendedCacheSettings: CacheConfiguration;
  scalingRecommendations: ScalingRecommendation[];
}

interface WeddingSeasonOptimizationConfig {
  peakMonths: number[]; // [4, 5, 8, 9] for May, June, Sep, Oct
  coordinationPeakHours: number[]; // [17, 18, 19, 20] for 5-8pm
  expectedTrafficMultiplier: number; // 10x during peak season
  preScalingBuffer: number; // 20% buffer capacity
  cacheWarmingThreshold: number; // Start warming at 70% capacity
}

// Wedding season optimization strategies
async function implementSeasonalOptimizations(): Promise<void> {
  const currentMonth = new Date().getMonth();
  const config: WeddingSeasonOptimizationConfig = {
    peakMonths: [4, 5, 8, 9],
    coordinationPeakHours: [17, 18, 19, 20],
    expectedTrafficMultiplier: 10,
    preScalingBuffer: 0.2,
    cacheWarmingThreshold: 0.7
  };
  
  if (config.peakMonths.includes(currentMonth)) {
    // Peak wedding season optimizations
    await this.preScaleForWeddingSeason(config.expectedTrafficMultiplier);
    await this.optimizeCacheForWeddingData();
    await this.configurePresenceRoutingOptimization();
    
    // Daily coordination peak optimization
    const currentHour = new Date().getHours();
    if (config.coordinationPeakHours.includes(currentHour)) {
      await this.enableCoordinationPeakMode();
      await this.preWarmActiveWeddingPresenceData();
    }
  }
}
```

---

## 💒 WEDDING INDUSTRY CONTEXT

### 🤝 REAL WEDDING SCENARIOS FOR TEAM D

**Scenario 1: Wedding Season Performance Scaling**
- June wedding season: 2000+ concurrent presence subscriptions
- Performance infrastructure auto-scales 5x normal capacity  
- Sub-2-second presence updates maintained during peak coordination hours
- Redis clustering prevents single points of failure during critical wedding weekends
- Memory optimization ensures system stability during sustained high load

**Scenario 2: Large Wedding Business Coordination**
- Photography business with 50+ photographers and 200+ active weddings
- Presence optimization handles bulk presence queries for team management
- Cache warming strategies prevent cold-start delays during shift changes
- Connection pooling optimizes resources for high-volume presence subscriptions
- Performance monitoring identifies bottlenecks before they impact coordination

**Scenario 3: Peak Coordination Hour Performance**
- 6-8pm daily surge: 5x normal presence activity during couple update hours
- Auto-scaling triggers 2x capacity increase before performance degradation
- Presence state optimization maintains consistency across geographic regions
- Memory management prevents cache eviction during peak presence updates
- Real-time monitoring ensures sub-2-second response times maintained

### 🔗 WEDDING WORKFLOW PERFORMANCE PATTERNS

**Wedding Coordination Traffic Patterns:**
```typescript
const weddingPresencePatterns = {
  seasonalMultipliers: {
    january: 0.3,   // Slow season
    february: 0.4,  // Valentine's planning
    march: 0.6,     // Spring preparation
    april: 0.8,     // Pre-peak planning
    may: 2.0,       // Peak season start
    june: 3.0,      // Peak wedding month
    july: 2.2,      // Summer weddings
    august: 1.8,    // Late summer
    september: 2.5, // Fall peak
    october: 2.0,   // Fall season
    november: 0.7,  // Post-peak
    december: 0.5   // Holiday season
  },
  
  dailyPatterns: {
    coordinationPeak: [17, 18, 19, 20], // 5-8pm couples update details
    planningHours: [9, 10, 11, 14, 15, 16], // Business hours
    lowActivity: [0, 1, 2, 3, 4, 5, 6, 7], // Overnight
    weekendSpikes: [10, 11, 12, 13] // Weekend coordination
  },
  
  businessTypePatterns: {
    photography: { avgPresenceTime: 180, peakConcurrent: 50 }, // 3 hours avg
    venues: { avgPresenceTime: 120, peakConcurrent: 20 },     // 2 hours avg
    planning: { avgPresenceTime: 300, peakConcurrent: 100 }   // 5 hours avg
  }
};
```

**Performance Optimization for Wedding Context:**
```typescript
// Wedding-specific presence performance optimization
function optimizeForWeddingCoordination(): PresenceOptimizationStrategy {
  return {
    // Cache wedding team presence together for locality
    cacheStrategy: 'wedding_team_locality',
    
    // Pre-warm cache for active weddings during coordination hours
    preWarmingRules: [
      { trigger: 'hour_16', action: 'warm_active_wedding_presence' },
      { trigger: 'weekend', action: 'warm_venue_coordination_data' }
    ],
    
    // Scale based on wedding-specific metrics
    scalingTriggers: [
      { metric: 'wedding_team_connections', threshold: 500, scaleFactor: 1.5 },
      { metric: 'coordination_hour_peak', threshold: '17:00', scaleFactor: 2.0 }
    ],
    
    // Memory optimization for wedding data access patterns
    memoryOptimization: {
      presenceDataTTL: 300, // 5 minutes for active coordination
      teamDataPrefetch: true,
      vendorLocationCaching: true
    }
  };
}
```

---

## 🚀 PERFORMANCE REQUIREMENTS

### ⚡ TEAM D PERFORMANCE STANDARDS

**Core Performance Targets:**
- Presence update propagation: < 2 seconds (95th percentile)
- Concurrent presence subscriptions: 2000+ with stable performance
- Cache hit ratio: >95% for presence data queries
- Memory usage: < 80% during peak load
- Connection establishment time: < 500ms

**Wedding Season Scaling Targets:**
```typescript
const weddingSeasonPerformanceTargets = {
  // Baseline performance
  baseline: {
    concurrentConnections: 400,
    updateLatency: '1.5 seconds',
    cacheHitRatio: 0.95,
    memoryUsage: '60%'
  },
  
  // Wedding season peak (10x traffic)
  weddingSeasonPeak: {
    concurrentConnections: 2000,
    updateLatency: '2 seconds', // Slight degradation acceptable
    cacheHitRatio: 0.93, // Maintained with cache optimization
    memoryUsage: '80%', // Peak acceptable usage
    autoScalingLatency: '30 seconds'
  },
  
  // Coordination peak hours (additional 2x surge)
  coordinationPeak: {
    concurrentConnections: 5000,
    updateLatency: '2 seconds', // Must maintain
    cacheHitRatio: 0.90, // Acceptable during extreme peak
    memoryUsage: '85%', // Maximum acceptable
    burstCapacity: '5 minutes'
  }
};
```

**Resource Optimization Specifications:**
```typescript
const resourceOptimizationTargets = {
  memory: {
    presenceStateCache: '< 100MB per 1000 users',
    connectionMetadata: '< 50MB per 1000 connections',
    garbageCollection: '< 50ms pause time',
    memoryLeakPrevention: 'zero tolerance'
  },
  
  cpu: {
    presenceProcessing: '< 30% during normal load',
    cacheOperations: '< 10% overhead',
    scalingDecisions: '< 5% overhead',
    monitoring: '< 2% overhead'
  },
  
  network: {
    presenceUpdateBandwidth: '< 10KB per update',
    bulkQueryOptimization: '< 100KB per 100 users',
    connectionOverhead: '< 1KB per connection',
    compressionRatio: '> 60%'
  }
};
```

---

## 🧪 TESTING REQUIREMENTS

### ✅ MANDATORY TEST COVERAGE (>90%)

**Performance Unit Tests:**
```typescript
describe('PresenceOptimizer', () => {
  it('maintains sub-2-second update latency under load', async () => {
    const optimizer = new PresenceOptimizer();
    const startTime = Date.now();
    
    // Simulate 1000 concurrent presence updates
    const updates = Array.from({length: 1000}, (_, i) => 
      optimizer.updatePresence(`user-${i}`, { status: 'online' })
    );
    
    await Promise.all(updates);
    const totalLatency = Date.now() - startTime;
    const averageLatency = totalLatency / updates.length;
    
    expect(averageLatency).toBeLessThan(2000); // Sub-2-second target
  });

  it('scales presence infrastructure based on load', async () => {
    const autoScaler = new PresenceAutoScaler();
    
    // Simulate high connection count
    await autoScaler.monitorPresenceLoad();
    mockConnectionCount(1800); // Near limit of 2000
    
    // Should trigger scale-up
    const scalingEvents = await autoScaler.getScalingHistory();
    expect(scalingEvents).toContainEqual(
      expect.objectContaining({
        trigger: PresenceScalingTrigger.HIGH_SUBSCRIPTION_COUNT,
        action: 'scale_up'
      })
    );
  });

  it('optimizes cache performance for wedding team queries', async () => {
    const cacheManager = new PresenceCacheClusterManager();
    
    // Pre-warm cache with wedding team data
    const weddingTeam = Array.from({length: 15}, (_, i) => `supplier-${i}`);
    await cacheManager.preWarmWeddingTeamCache('wedding-123', weddingTeam);
    
    // Query team presence - should have high cache hit ratio
    const startTime = Date.now();
    const presence = await cacheManager.getBulkPresenceFromCache(weddingTeam);
    const queryTime = Date.now() - startTime;
    
    expect(Object.keys(presence)).toHaveLength(weddingTeam.length);
    expect(queryTime).toBeLessThan(100); // Fast cache retrieval
  });
});
```

**Load Testing:**
```typescript
describe('Presence Performance Load Tests', () => {
  it('handles wedding season traffic spikes', async () => {
    const loadTestConfig = {
      concurrentUsers: 2000,
      duration: '10 minutes',
      presenceUpdateRate: '1 per second per user',
      pattern: 'wedding_season_peak'
    };
    
    const results = await runPresenceLoadTest(loadTestConfig);
    
    expect(results.averageLatency).toBeLessThan(2000);
    expect(results.errorRate).toBeLessThan(0.01);
    expect(results.scalingEventsTriggered).toBeGreaterThan(0);
    expect(results.cacheHitRatio).toBeGreaterThan(0.90);
  });

  it('maintains performance during coordination peak hours', async () => {
    // Simulate 6-8pm coordination surge
    const peakTestConfig = {
      baseUsers: 1000,
      surgeMultiplier: 2,
      surgeDuration: '2 hours',
      updatePattern: 'coordination_peak'
    };
    
    const results = await runCoordinationPeakTest(peakTestConfig);
    
    // Performance should be maintained during surge
    expect(results.peakLatency).toBeLessThan(2500);
    expect(results.memoryUsage).toBeLessThan(0.85);
    expect(results.connectionStability).toBeGreaterThan(0.99);
  });
});
```

**Auto-Scaling Validation:**
```typescript
describe('Presence Auto-Scaling', () => {
  it('triggers proactive scaling for wedding season patterns', async () => {
    const scaler = new PresenceAutoScaler();
    
    // Mock June wedding season (month 5)
    mockCurrentDate(new Date(2024, 5, 15, 17, 30)); // June 15, 5:30pm
    
    await scaler.handleWeddingSeasonScaling();
    
    const scalingHistory = await scaler.getScalingHistory();
    expect(scalingHistory).toContainEqual(
      expect.objectContaining({
        trigger: PresenceScalingTrigger.WEDDING_SEASON_PATTERN,
        targetCapacity: expect.any(Number),
        proactive: true
      })
    );
  });

  it('scales down gracefully after peak periods', async () => {
    const scaler = new PresenceAutoScaler();
    
    // Mock post-peak period (9pm)
    mockCurrentDate(new Date(2024, 5, 15, 21, 0));
    mockLowConnectionCount(200);
    
    await scaler.evaluateScaleDown();
    
    const scalingEvents = await scaler.getScalingHistory();
    const scaleDownEvent = scalingEvents.find(e => e.action === 'scale_down');
    expect(scaleDownEvent).toBeDefined();
    expect(scaleDownEvent?.gradual).toBe(true); // Gradual scale-down
  });
});
```

---

## 📚 MCP INTEGRATION WORKFLOWS

### 🔧 REQUIRED MCP OPERATIONS

**Ref MCP - Performance Documentation Research:**
```typescript
await mcp__Ref__ref_search_documentation("Redis cluster configuration best practices");
await mcp__Ref__ref_search_documentation("Node.js performance optimization patterns");  
await mcp__Ref__ref_search_documentation("Supabase Realtime Presence scaling");
await mcp__Ref__ref_search_documentation("auto-scaling algorithms Node.js");
```

**Supabase MCP - Performance Monitoring:**
```typescript
await mcp__supabase__get_logs("realtime"); // Check presence performance logs
await mcp__supabase__execute_sql("SELECT COUNT(*) FROM presence_activity_logs WHERE timestamp > NOW() - INTERVAL '1 hour'");
await mcp__supabase__get_advisors("performance"); // Get performance recommendations
```

### 🎯 AGENT COORDINATION REQUIRED

Launch specialized agents for comprehensive performance development:

```typescript
// 1. Performance task coordination
await Task({
  description: "Coordinate presence performance tasks",
  prompt: `You are the task-tracker-coordinator for WS-204 Team D presence tracking performance development.
  Break down the performance implementation into optimization algorithms, caching strategies, auto-scaling systems, and monitoring infrastructure tasks.
  Track dependencies between Redis clustering, connection optimization, and performance monitoring components.`,
  subagent_type: "task-tracker-coordinator"
});

// 2. Performance optimization specialist  
await Task({
  description: "Presence performance optimization",
  prompt: `You are the performance-optimization-expert for WS-204 presence tracking performance.
  Design high-performance presence infrastructure supporting 2000+ concurrent subscriptions with sub-2-second update propagation.
  Implement Redis clustering for presence state management with automated failover and data consistency.
  Create auto-scaling algorithms optimized for wedding season traffic patterns and coordination peak hours.
  Focus on memory optimization, connection pooling, and cache efficiency for wedding team coordination workflows.`,
  subagent_type: "performance-optimization-expert"
});

// 3. Infrastructure architecture specialist
await Task({
  description: "Presence infrastructure scaling",
  prompt: `You are the cloud-infrastructure-architect for WS-204 presence infrastructure.
  Design auto-scaling infrastructure handling 10x traffic increases during wedding season peaks.
  Implement Redis cluster configuration with read replicas and automated failover for presence data.
  Create monitoring and alerting systems for presence performance metrics and anomaly detection.
  Ensure 99.9% uptime SLA with graceful degradation patterns during extreme load.`,
  subagent_type: "cloud-infrastructure-architect"
});

// 4. Performance monitoring specialist
await Task({
  description: "Presence performance monitoring",
  prompt: `You are the devops-sre-engineer for WS-204 presence performance monitoring.
  Create comprehensive performance monitoring tracking presence update latency, connection counts, and resource usage.
  Implement real-time alerting for performance threshold breaches with automatic remediation.
  Design performance analytics dashboard showing wedding coordination patterns and optimization opportunities.
  Create performance regression detection preventing degradation in presence system responsiveness.`,
  subagent_type: "devops-sre-engineer"
});

// 5. Performance testing architect
await Task({
  description: "Performance testing strategy",
  prompt: `You are the test-automation-architect for WS-204 presence performance testing.
  Create comprehensive load testing suite simulating wedding season traffic patterns and coordination peaks.
  Design performance regression tests ensuring sub-2-second presence update latency maintained.
  Implement auto-scaling validation tests for traffic spike handling and resource optimization.
  Create wedding-specific performance scenarios testing multi-team coordination under load.`,
  subagent_type: "test-automation-architect"
});
```

---

## 🎖️ COMPLETION CRITERIA

### ✅ DEFINITION OF DONE

**Code Implementation (All MUST exist):**
- [ ] `/src/lib/performance/presence/presence-optimizer.ts` - Core performance optimization service
- [ ] `/src/lib/cache/presence-cache/redis-cluster-manager.ts` - Redis clustering for presence data
- [ ] `/src/lib/performance/presence/auto-scaler.ts` - Traffic-based auto-scaling system
- [ ] `/src/lib/monitoring/presence-performance/performance-tracker.ts` - Real-time monitoring
- [ ] `/src/lib/performance/presence/wedding-season-optimizer.ts` - Seasonal optimization
- [ ] `/monitoring/presence-performance/dashboard.tsx` - Performance analytics dashboard
- [ ] `/scripts/load-test-presence.ts` - Automated performance testing

**Performance Validation:**
- [ ] Sub-2-second presence update propagation (95th percentile)
- [ ] 2000+ concurrent presence subscriptions supported
- [ ] >95% cache hit ratio for presence queries
- [ ] Auto-scaling triggers working within 30 seconds
- [ ] <80% memory usage during peak load

**Scalability Validation:**
- [ ] 10x traffic scaling capability proven through load testing
- [ ] Wedding season traffic patterns handled without degradation
- [ ] Coordination peak hour performance maintained
- [ ] Gradual scale-down preventing resource waste

**Monitoring & Alerting:**
- [ ] Real-time performance dashboard operational
- [ ] Performance anomaly detection and alerting active
- [ ] Auto-remediation for critical performance issues
- [ ] Wedding-specific performance analytics available

**Infrastructure Reliability:**
- [ ] Redis cluster failover tested and validated
- [ ] Connection pooling optimization verified
- [ ] Memory leak prevention mechanisms working
- [ ] Performance regression prevention active

---

## 📖 DOCUMENTATION REQUIREMENTS

### 📝 MANDATORY DOCUMENTATION

Create comprehensive performance architecture documentation:

**Performance Architecture Guide:**
```markdown
# Presence Tracking Performance Architecture

## System Overview
High-performance presence infrastructure supporting 2000+ concurrent connections with sub-2-second update propagation and wedding season auto-scaling.

## Redis Cluster Configuration
- 3-node cluster with read replicas
- Presence data TTL: 5 minutes
- Automatic failover with data consistency
- Memory optimization: allkeys-lru eviction policy

## Auto-Scaling Strategy
- Baseline capacity: 500 concurrent connections
- Wedding season scaling: 10x traffic capability
- Coordination peak scaling: Additional 2x surge capacity
- Scaling triggers: Connection count, latency, memory usage

## Performance Targets
- Update propagation: < 2 seconds (95th percentile)
- Cache hit ratio: > 95%
- Memory usage: < 80% during peak load
- Auto-scaling response: < 30 seconds
```

**Wedding Season Performance Guide:**
```markdown
# Wedding Season Performance Optimization

## Seasonal Traffic Patterns
- Peak months: May (2x), June (3x), September (2.5x), October (2x)
- Daily peaks: 5-8pm coordination hours (2x surge)
- Weekend spikes: Saturday/Sunday coordination (1.5x)

## Pre-Scaling Strategy
- Proactive scaling 1 hour before predicted peaks
- Cache warming for active wedding data
- Connection pool optimization for burst traffic
- Memory pre-allocation preventing allocation delays

## Performance Monitoring
- Real-time presence update latency tracking
- Connection count monitoring with threshold alerts
- Memory usage optimization with automatic cleanup
- Wedding coordination pattern analysis for optimization
```

---

## 💼 WEDDING BUSINESS IMPACT

### 📊 SUCCESS METRICS

**Performance Reliability Improvements:**
- Sub-2-second presence updates enable immediate availability feedback
- 2000+ connection capacity supports largest wedding businesses during peak season
- 99.9% uptime ensures critical coordination never fails during weddings
- Auto-scaling prevents performance degradation during coordination surges

**Resource Efficiency Gains:**
- Intelligent caching reduces database load by 80%
- Auto-scaling optimizes costs while maintaining performance
- Memory optimization prevents system crashes during peak usage
- Connection pooling maximizes resource utilization efficiency

**Wedding Coordination Enhancement:**
- Peak hour performance optimization ensures reliable 6-8pm coordination
- Wedding season scaling handles 10x traffic increases seamlessly
- Team presence queries optimized for wedding coordination workflows
- Real-time performance monitoring enables proactive optimization

---

**🎯 TEAM D SUCCESS DEFINITION:**
You've succeeded when the presence tracking system maintains sub-2-second update propagation for 2000+ concurrent users during wedding season peaks, auto-scales seamlessly during coordination surges, and provides 99.9% uptime reliability ensuring wedding coordination never fails due to performance issues.

---

**🚨 FINAL REMINDER - EVIDENCE REQUIRED:**
Your completion report MUST include:
1. File existence proof (`ls -la` output)
2. TypeScript compilation success (`npm run typecheck`)
3. All tests passing (`npm test` + load tests)
4. Load testing results demonstrating 2000+ connection capability
5. Auto-scaling validation showing traffic spike handling
6. Performance benchmarks confirming sub-2-second update propagation

**No exceptions. Evidence-based delivery only.**

---

*Generated by WedSync Development Manager*  
*Feature: WS-204 Presence Tracking System*  
*Team: D (Performance/Infrastructure Specialists)*  
*Scope: High-performance presence infrastructure with auto-scaling*  
*Standards: Evidence-based completion with load testing validation*