# WS-225 Client Analytics - Technical Implementation Guide

## 🏗️ Architecture Overview

The WedSync Client Analytics system is built on a modern, scalable architecture designed to handle high-traffic wedding seasons while maintaining sub-200ms response times.

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Web    │    │   Analytics     │    │   Database      │
│   Dashboard     │◄──►│   API Layer     │◄──►│   (Supabase)    │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Real-time     │    │   Background    │    │   Performance   │
│   Updates       │    │   Processing    │    │   Monitoring    │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack
- **Frontend**: React 19.1.1 + Next.js 15.4.3
- **Backend**: Next.js API Routes + Supabase Edge Functions
- **Database**: PostgreSQL 15 (Supabase)
- **Real-time**: Supabase Realtime
- **Caching**: Redis + CDN
- **Charts**: Chart.js with React Chart.js 2
- **State Management**: Zustand + TanStack Query

## 📊 Core Components

### 1. ClientAnalyticsDashboard Component

**Location**: `/src/components/analytics/ClientAnalyticsDashboard.tsx`

#### Component Structure
```typescript
interface ClientAnalyticsDashboardProps {
  supplierId?: string;
  timeframe?: '7d' | '30d' | '90d';
  initialTab?: number;
  className?: string;
  onMetricsChange?: (metrics: AnalyticsMetrics) => void;
}

interface AnalyticsMetrics {
  totalClients: number;
  conversionRate: number;
  revenueAttribution: number;
  engagementScore: number;
}
```

#### Key Features Implemented

##### Mobile-First Design
```typescript
const isMobile = useMediaQuery('(max-width: 768px)');

// Mobile navigation using bottom tabs
const MobileNavigation = () => (
  <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-10">
    <div className="flex justify-around">
      {tabs.map((tab, index) => (
        <button
          key={tab.name}
          onClick={() => setActiveTab(index)}
          className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
            activeTab === index 
              ? 'text-purple-600 bg-purple-50' 
              : 'text-gray-500'
          }`}
        >
          <tab.icon className="h-5 w-5 mb-1" />
          <span className="text-xs font-medium">{tab.name}</span>
        </button>
      ))}
    </div>
  </div>
);
```

##### Performance Monitoring Hook
```typescript
const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>();

  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          setMetrics({
            loadTime: navEntry.loadEventEnd - navEntry.loadEventStart,
            domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
            timeToFirstByte: navEntry.responseStart - navEntry.requestStart,
            firstContentfulPaint: 0, // Set by separate observer
          });
        }
      });
    });

    observer.observe({ entryTypes: ['navigation', 'paint'] });
    return () => observer.disconnect();
  }, []);

  return metrics;
};
```

##### Analytics Caching System
```typescript
class AnalyticsCache {
  private cache: Map<string, CacheEntry>;
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.cache = new Map();
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Cleanup old entries
    this.cleanup();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
      }
    }
  }
}
```

### 2. Analytics API Layer

**Location**: `/src/app/api/analytics/dashboard/route.ts`

#### Core Functions

##### getJourneyOverview()
```typescript
async function getJourneyOverview(supabase: any, supplierId: string | null, timeframe: string) {
  // Use materialized view for performance
  let query = supabase
    .from('journey_performance_summary')
    .select('*')
  
  if (supplierId) {
    query = query.eq('supplier_id', supplierId)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  
  // Calculate aggregated metrics from materialized view
  const metrics = {
    total_journeys: data.length,
    total_instances: data.reduce((sum, j) => sum + (j.total_instances || 0), 0),
    avg_conversion_rate: data.reduce((sum, j) => sum + (j.completion_rate || 0), 0) / data.length,
    total_revenue: data.reduce((sum, j) => sum + parseFloat(j.revenue_30d || 0), 0),
    active_clients: data.reduce((sum, j) => sum + (j.active_instances || 0), 0),
    avg_engagement_score: calculateEngagementScore(data)
  }
  
  return metrics
}
```

##### getConversionFunnel()
```typescript
async function getConversionFunnel(supabase: any, supplierId: string | null, timeframe: string) {
  // Use optimized funnel analysis view
  let query = supabase
    .from('journey_funnel_analysis')
    .select(`
      journey_id,
      node_name,
      sequence_order,
      instances_reached,
      instances_completed,
      conversion_from_previous,
      journey_canvases!inner(supplier_id, name)
    `)
    .order('sequence_order')
    .limit(6) // Top 6 stages for funnel
  
  if (supplierId) {
    query = query.eq('journey_canvases.supplier_id', supplierId)
  }
  
  const { data: funnelData, error } = await query
  
  if (error) throw error
  
  if (funnelData && funnelData.length > 0) {
    const totalStarted = funnelData[0]?.instances_reached || 0
    
    return funnelData.map((stage, index) => ({
      name: stage.node_name || `Stage ${index + 1}`,
      value: stage.instances_reached || 0,
      percentage: totalStarted > 0 ? ((stage.instances_reached || 0) / totalStarted * 100) : 0,
      completion_rate: stage.instances_completed && stage.instances_reached 
        ? (stage.instances_completed / stage.instances_reached * 100) 
        : 0
    }))
  }
  
  // Fallback to progress-based funnel
  return generateProgressBasedFunnel(supabase, supplierId, timeframe)
}
```

##### Performance History with Fallback
```typescript
async function getPerformanceHistory(supabase: any, supplierId: string | null, timeframe: string) {
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  // Try optimized journey_metrics table first
  let query = supabase
    .from('journey_metrics')
    .select(`
      date,
      instances_started,
      instances_completed,
      instances_failed,
      instances_active,
      conversion_rate,
      revenue_attributed,
      unique_clients,
      journey_canvases!inner(supplier_id)
    `)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true })
  
  if (supplierId) {
    query = query.eq('journey_canvases.supplier_id', supplierId)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Performance history error:', error)
    // Fallback to journey_analytics if journey_metrics doesn't exist
    return getFallbackPerformanceHistory(supabase, supplierId, timeframe)
  }
  
  // Process and aggregate data...
  return processPerformanceData(data, days)
}
```

### 3. Database Schema

#### Core Tables

##### client_analytics_data
```sql
CREATE TABLE client_analytics_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  page_url TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  session_id VARCHAR(255),
  ip_address INET, -- Automatically anonymized
  user_agent TEXT, -- Sanitized to remove PII
  form_data JSONB, -- Encrypted sensitive fields
  metadata JSONB DEFAULT '{}',
  gdpr_consent_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_client_analytics_supplier_timestamp 
ON client_analytics_data(supplier_id, timestamp DESC);

CREATE INDEX idx_client_analytics_event_type 
ON client_analytics_data(event_type);

CREATE INDEX idx_client_analytics_session 
ON client_analytics_data(session_id);
```

##### journey_instances
```sql
CREATE TABLE journey_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES journey_canvases(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  current_node_id UUID,
  conversion_value DECIMAL(10,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance queries
CREATE INDEX idx_journey_instances_supplier_status 
ON journey_instances(supplier_id, status, started_at DESC);
```

##### Performance Views
```sql
-- Materialized view for performance
CREATE MATERIALIZED VIEW journey_performance_summary AS
SELECT 
  supplier_id,
  DATE_TRUNC('day', started_at) as date,
  COUNT(*) as total_instances,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_instances,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_instances,
  AVG(CASE WHEN completed_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (completed_at - started_at))/3600 
    ELSE NULL END) as avg_completion_hours,
  SUM(COALESCE(conversion_value, 0)) as revenue_30d,
  COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / 
    NULLIF(COUNT(*), 0) * 100 as completion_rate
FROM journey_instances 
WHERE started_at >= NOW() - INTERVAL '90 days'
GROUP BY supplier_id, DATE_TRUNC('day', started_at);

-- Refresh policy
CREATE UNIQUE INDEX ON journey_performance_summary (supplier_id, date);
REFRESH MATERIALIZED VIEW CONCURRENTLY journey_performance_summary;
```

## 🔒 Security Implementation

### Row Level Security (RLS)
```sql
-- Enable RLS on all analytics tables
ALTER TABLE client_analytics_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_instances ENABLE ROW LEVEL SECURITY;

-- Policy: Suppliers can only access their own data
CREATE POLICY supplier_analytics_access ON client_analytics_data
  FOR ALL USING (supplier_id = auth.jwt() ->> 'supplier_id'::text);

CREATE POLICY supplier_journey_access ON journey_instances
  FOR ALL USING (supplier_id = auth.jwt() ->> 'supplier_id'::text);

-- Admin access policy
CREATE POLICY admin_full_access ON client_analytics_data
  FOR ALL USING (auth.jwt() ->> 'role'::text = 'admin');
```

### Data Anonymization
```typescript
function anonymizeAnalyticsData(data: any): any {
  return {
    ...data,
    ip_address: anonymizeIP(data.ip_address),
    user_agent: sanitizeUserAgent(data.user_agent),
    form_data: encryptSensitiveFields(data.form_data)
  }
}

function anonymizeIP(ip: string): string {
  if (!ip) return null
  const parts = ip.split('.')
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0` // Remove last octet
  }
  return ip
}

function sanitizeUserAgent(userAgent: string): string {
  if (!userAgent) return null
  
  // Remove potential PII while preserving analytics value
  return userAgent
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b\d{10,}\b/g, '[PHONE]')
    .substring(0, 500) // Limit length
}
```

### GDPR/CCPA Compliance
```typescript
// Automatic data retention enforcement
async function enforceDataRetention() {
  const retentionDays = await getRetentionPolicy('analytics')
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
  
  // Soft delete old analytics data
  const { error } = await supabase
    .from('client_analytics_data')
    .update({ 
      deleted_at: new Date().toISOString(),
      anonymized: true 
    })
    .lt('created_at', cutoffDate.toISOString())
    .is('deleted_at', null)
  
  if (error) {
    console.error('Data retention enforcement failed:', error)
    throw error
  }
}

// Right to be forgotten implementation
async function deleteClientData(clientId: string, reason: string) {
  const deletionId = uuidv4()
  
  // Log the deletion request
  await supabase.from('gdpr_deletion_log').insert({
    id: deletionId,
    client_id: clientId,
    deletion_reason: reason,
    requested_at: new Date().toISOString(),
    status: 'processing'
  })
  
  try {
    // Delete from all analytics tables
    await Promise.all([
      supabase.from('client_analytics_data').delete().eq('client_id', clientId),
      supabase.from('journey_instances').delete().eq('client_id', clientId),
      supabase.from('client_interactions').delete().eq('client_id', clientId)
    ])
    
    // Update deletion log
    await supabase
      .from('gdpr_deletion_log')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', deletionId)
      
  } catch (error) {
    await supabase
      .from('gdpr_deletion_log')
      .update({ 
        status: 'failed',
        error_message: error.message
      })
      .eq('id', deletionId)
    throw error
  }
}
```

## 📈 Performance Optimization

### Caching Strategy
```typescript
// Multi-layer caching implementation
class AnalyticsDataManager {
  private memoryCache: AnalyticsCache
  private redisCache: Redis
  
  constructor() {
    this.memoryCache = new AnalyticsCache()
    this.redisCache = new Redis(process.env.REDIS_URL)
  }
  
  async getAnalyticsData(key: string, fetcher: () => Promise<any>): Promise<any> {
    // Layer 1: Memory cache (fastest)
    let data = this.memoryCache.get(key)
    if (data) return data
    
    // Layer 2: Redis cache (fast)
    const redisData = await this.redisCache.get(key)
    if (redisData) {
      data = JSON.parse(redisData)
      this.memoryCache.set(key, data)
      return data
    }
    
    // Layer 3: Database fetch (slowest)
    data = await fetcher()
    
    // Store in both caches
    this.memoryCache.set(key, data)
    await this.redisCache.setex(key, 300, JSON.stringify(data)) // 5 min TTL
    
    return data
  }
}
```

### Query Optimization
```sql
-- Optimized query for dashboard overview
WITH supplier_metrics AS (
  SELECT 
    supplier_id,
    COUNT(DISTINCT client_id) as total_clients,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_clients,
    AVG(CASE WHEN conversion_value > 0 THEN conversion_value END) as avg_deal_size
  FROM journey_instances 
  WHERE supplier_id = $1
    AND created_at >= NOW() - INTERVAL '90 days'
  GROUP BY supplier_id
),
engagement_metrics AS (
  SELECT 
    supplier_id,
    COUNT(*) as total_events,
    COUNT(DISTINCT session_id) as unique_sessions,
    AVG(EXTRACT(EPOCH FROM (
      MAX(timestamp) - MIN(timestamp)
    ))) as avg_session_duration
  FROM client_analytics_data
  WHERE supplier_id = $1
    AND timestamp >= NOW() - INTERVAL '30 days'
  GROUP BY supplier_id
)
SELECT 
  sm.*,
  em.total_events,
  em.unique_sessions,
  em.avg_session_duration
FROM supplier_metrics sm
LEFT JOIN engagement_metrics em ON sm.supplier_id = em.supplier_id;
```

### Real-time Updates
```typescript
// Supabase real-time subscription
function useRealtimeAnalytics(supplierId: string) {
  const [metrics, setMetrics] = useState<AnalyticsMetrics>()
  
  useEffect(() => {
    const subscription = supabase
      .channel('analytics-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'client_analytics_data',
        filter: `supplier_id=eq.${supplierId}`
      }, (payload) => {
        // Update metrics in real-time
        setMetrics(prev => updateMetricsWithNewEvent(prev, payload.new))
      })
      .subscribe()
    
    return () => {
      subscription.unsubscribe()
    }
  }, [supplierId])
  
  return metrics
}
```

## 🧪 Testing Implementation

### Unit Tests
```typescript
// Example test for analytics functions
describe('Analytics Dashboard', () => {
  test('calculates conversion rate correctly', () => {
    const testData = [
      { status: 'completed', conversion_value: 5000 },
      { status: 'active', conversion_value: 0 },
      { status: 'completed', conversion_value: 7500 },
      { status: 'dropped', conversion_value: 0 }
    ]
    
    const result = calculateConversionRate(testData)
    expect(result).toBe(50) // 2 completed out of 4 total
  })
  
  test('handles empty data gracefully', () => {
    const result = calculateConversionRate([])
    expect(result).toBe(0)
  })
})
```

### Integration Tests
```typescript
describe('Analytics API Integration', () => {
  test('dashboard endpoint returns correct structure', async () => {
    const response = await fetch('/api/analytics/dashboard?supplier_id=test-supplier')
    const data = await response.json()
    
    expect(data).toHaveProperty('overview')
    expect(data).toHaveProperty('funnel')
    expect(data).toHaveProperty('revenue')
    expect(data).toHaveProperty('performance_history')
    expect(data.overview).toHaveProperty('total_journeys')
    expect(data.overview).toHaveProperty('avg_conversion_rate')
  })
})
```

### Performance Tests
```typescript
describe('Analytics Performance', () => {
  test('dashboard loads within 200ms', async () => {
    const startTime = performance.now()
    
    await fetch('/api/analytics/dashboard?supplier_id=test-supplier')
    
    const endTime = performance.now()
    const loadTime = endTime - startTime
    
    expect(loadTime).toBeLessThan(200)
  })
})
```

## 🚀 Deployment & Monitoring

### Environment Configuration
```typescript
// Environment-specific configuration
const analyticsConfig = {
  development: {
    cacheEnabled: false,
    logLevel: 'debug',
    realtimeEnabled: true,
    performanceTracking: true
  },
  production: {
    cacheEnabled: true,
    logLevel: 'error',
    realtimeEnabled: true,
    performanceTracking: true,
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100 // per IP
    }
  }
}
```

### Health Checks
```typescript
// Analytics system health endpoint
export async function GET() {
  const healthCheck = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {}
  }
  
  try {
    // Database connectivity
    const { data, error } = await supabase
      .from('client_analytics_data')
      .select('id')
      .limit(1)
    
    healthCheck.checks.database = error ? 'unhealthy' : 'healthy'
    
    // Cache connectivity
    const cacheTest = await redis.ping()
    healthCheck.checks.cache = cacheTest === 'PONG' ? 'healthy' : 'unhealthy'
    
    // API response time
    const startTime = Date.now()
    await fetch('/api/analytics/dashboard?health_check=true')
    const responseTime = Date.now() - startTime
    
    healthCheck.checks.api_performance = {
      status: responseTime < 200 ? 'healthy' : 'degraded',
      response_time: responseTime
    }
    
  } catch (error) {
    healthCheck.status = 'unhealthy'
    healthCheck.error = error.message
  }
  
  return Response.json(healthCheck)
}
```

### Monitoring & Alerting
```typescript
// Performance monitoring middleware
function performanceMonitoringMiddleware(req: Request, res: Response, next: Function) {
  const startTime = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - startTime
    
    // Log slow queries
    if (duration > 1000) {
      console.warn(`Slow analytics query: ${req.url} took ${duration}ms`)
    }
    
    // Track metrics
    trackMetric('analytics.api.response_time', duration, {
      endpoint: req.url,
      method: req.method,
      status: res.statusCode
    })
  })
  
  next()
}
```

## 📋 Maintenance & Updates

### Database Maintenance
```sql
-- Weekly maintenance tasks
-- 1. Refresh materialized views
REFRESH MATERIALIZED VIEW CONCURRENTLY journey_performance_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_aggregations;

-- 2. Update table statistics
ANALYZE client_analytics_data;
ANALYZE journey_instances;

-- 3. Cleanup old sessions
DELETE FROM analytics_sessions 
WHERE created_at < NOW() - INTERVAL '30 days';

-- 4. Archive old data
INSERT INTO client_analytics_archive 
SELECT * FROM client_analytics_data 
WHERE created_at < NOW() - INTERVAL '2 years';

DELETE FROM client_analytics_data 
WHERE created_at < NOW() - INTERVAL '2 years';
```

### Code Updates
```typescript
// Version-aware API responses
export async function GET(request: NextRequest) {
  const apiVersion = request.headers.get('API-Version') || '2.1.0'
  
  switch (apiVersion) {
    case '2.0.0':
      return handleV2Request(request)
    case '2.1.0':
    default:
      return handleLatestRequest(request)
  }
}
```

This technical implementation guide provides comprehensive coverage of the WS-225 Client Analytics system architecture, implementation details, security measures, and operational considerations for developers and DevOps teams.