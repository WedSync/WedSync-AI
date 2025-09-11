# 01-performance-metrics.md

## What to Build

Application performance monitoring dashboard tracking response times, throughput, resource utilization, and user experience metrics.

## Key Technical Requirements

### Performance Metrics Structure

```
interface PerformanceMetrics {
  response: {
    p50: number // Median response time
    p95: number // 95th percentile
    p99: number // 99th percentile
    average: number
  }
  throughput: {
    requestsPerSecond: number
    peakRPS: number
    totalRequests: number
  }
  resources: {
    cpuUsage: number
    memoryUsage: number
    diskIO: number
    networkBandwidth: number
  }
  availability: {
    uptime: number // Percentage
    incidents: number
    mttr: number // Mean time to recovery
  }
}

interface EndpointMetrics {
  endpoint: string
  method: string
  avgResponseTime: number
  requestCount: number
  errorRate: number
  apdex: number // Application Performance Index
}
```

### Performance Monitoring Implementation

```
class PerformanceMonitor {
  private metrics: Map<string, Metric[]> = new Map()
  
  async collectMetrics() {
    const metrics = await Promise.all([
      this.collectResponseMetrics(),
      this.collectThroughputMetrics(),
      this.collectResourceMetrics(),
      this.collectDatabaseMetrics()
    ])
    
    // Store in time series database
    await this.storeMetrics(metrics)
    
    // Check thresholds
    await this.checkPerformanceThresholds(metrics)
    
    return this.aggregateMetrics(metrics)
  }
  
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const start = process.hrtime.bigint()
      
      // Track request
      const requestId = generateId()
      req.requestId = requestId
      
      // Override res.end to capture metrics
      const originalEnd = res.end
      res.end = function(...args) {
        const duration = Number(process.hrtime.bigint() - start) / 1000000 // Convert to ms
        
        // Record metrics
        performanceMonitor.recordRequest({
          endpoint: req.route?.path || req.path,
          method: req.method,
          statusCode: res.statusCode,
          duration,
          requestId,
          timestamp: new Date()
        })
        
        originalEnd.apply(res, args)
      }
      
      next()
    }
  }
  
  private async collectResourceMetrics() {
    const usage = process.cpuUsage()
    const memory = process.memoryUsage()
    
    return {
      cpu: (usage.user + usage.system) / 1000000, // Convert to seconds
      memory: {
        heapUsed: memory.heapUsed / 1024 / 1024, // MB
        heapTotal: memory.heapTotal / 1024 / 1024,
        external: memory.external / 1024 / 1024,
        rss: memory.rss / 1024 / 1024
      },
      eventLoop: await this.measureEventLoopLag(),
      activeHandles: process._getActiveHandles().length,
      activeRequests: process._getActiveRequests().length
    }
  }
}
```

### Performance Dashboard Component

```
const PerformanceDashboard = () => {
  const [timeRange, setTimeRange] = useState('1h')
  const [view, setView] = useState<'overview' | 'endpoints' | 'resources'>('overview')
  const metrics = usePerformanceMetrics(timeRange)
  
  return (
    <div className="performance-dashboard">
      {/* Response Time Metrics */}
      <div className="response-metrics">
        <MetricCard
          title="P50 Response"
          value={`${metrics.response.p50}ms`}
          target="< 200ms"
          status={metrics.response.p50 < 200 ? 'good' : 'warning'}
        />
        <MetricCard
          title="P95 Response"
          value={`${metrics.response.p95}ms`}
          target="< 1000ms"
        />
        <MetricCard
          title="P99 Response"
          value={`${metrics.response.p99}ms`}
          target="< 2000ms"
        />
        <MetricCard
          title="Apdex Score"
          value={metrics.apdex.toFixed(2)}
          target="> 0.9"
        />
      </div>
      
      {/* Response Time Chart */}
      <ResponseTimeChart
        data={metrics.timeSeriesData}
        percentiles={['p50', 'p95', 'p99']}
        timeRange={timeRange}
      />
      
      {/* Endpoint Performance */}
      <EndpointPerformanceTable
        endpoints={metrics.endpoints}
        onEndpointClick={(endpoint) => showEndpointDetails(endpoint)}
      />
      
      {/* Resource Utilization */}
      <ResourceMonitor
        cpu={metrics.resources.cpu}
        memory={metrics.resources.memory}
        disk={metrics.resources.disk}
        network={[metrics.resources.network](http://metrics.resources.network)}
      />
    </div>
  )
}
```

### Web Vitals Tracking

```
class WebVitalsCollector {
  async collectVitals(sessionId: string) {
    return {
      // Core Web Vitals
      lcp: await this.getLargestContentfulPaint(), // Target < 2.5s
      fid: await this.getFirstInputDelay(), // Target < 100ms
      cls: await this.getCumulativeLayoutShift(), // Target < 0.1
      
      // Additional metrics
      ttfb: await this.getTimeToFirstByte(), // Target < 600ms
      fcp: await this.getFirstContentfulPaint(), // Target < 1.8s
      tti: await this.getTimeToInteractive(), // Target < 3.8s
      tbt: await this.getTotalBlockingTime() // Target < 300ms
    }
  }
  
  // Client-side collection script
  getCollectionScript() {
    return `
      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        sendMetric('lcp', lastEntry.renderTime || lastEntry.loadTime)
      }).observe({ entryTypes: ['largest-contentful-paint'] })
      
      // First Input Delay
      new PerformanceObserver((list) => {
        const entry = list.getEntries()[0]
        sendMetric('fid', entry.processingStart - entry.startTime)
      }).observe({ entryTypes: ['first-input'] })
      
      // Cumulative Layout Shift
      let cls = 0
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            cls += entry.value
          }
        }
        sendMetric('cls', cls)
      }).observe({ entryTypes: ['layout-shift'] })
    `
  }
}
```

## Critical Implementation Notes

- Use sampling for high-traffic endpoints (1-10%)
- Implement request correlation for distributed tracing
- Monitor both server and client-side performance
- Set up alerting for performance degradation
- Use CDN for static assets to improve performance
- Implement caching strategies at multiple levels

## Database Structure

```
-- Performance metrics time series
CREATE TABLE performance_metrics (
  timestamp TIMESTAMPTZ NOT NULL,
  endpoint TEXT,
  method TEXT,
  response_time_ms DECIMAL,
  status_code INTEGER,
  request_size INTEGER,
  response_size INTEGER,
  user_id UUID,
  session_id TEXT,
  request_id TEXT
) PARTITION BY RANGE (timestamp);

-- Create partitions for each day
CREATE TABLE performance_metrics_2024_01_01 
  PARTITION OF performance_metrics 
  FOR VALUES FROM ('2024-01-01') TO ('2024-01-02');

CREATE INDEX idx_perf_metrics_timestamp ON performance_metrics(timestamp DESC);
CREATE INDEX idx_perf_metrics_endpoint ON performance_metrics(endpoint, timestamp DESC);

-- Aggregated metrics
CREATE MATERIALIZED VIEW endpoint_metrics_hourly AS
  SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    endpoint,
    method,
    COUNT(*) as request_count,
    AVG(response_time_ms) as avg_response_time,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as p50,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) as p99,
    SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as error_rate
  FROM performance_metrics
  GROUP BY DATE_TRUNC('hour', timestamp), endpoint, method;

-- Web vitals
CREATE TABLE web_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  user_id UUID,
  page_url TEXT,
  lcp DECIMAL,
  fid DECIMAL,
  cls DECIMAL,
  ttfb DECIMAL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
```