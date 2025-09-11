# WS-260 Database Optimization Engine - Team A Frontend Development

## 🎯 MISSION: Enterprise Database Performance Dashboard

**Business Impact**: Create a comprehensive frontend interface that enables wedding suppliers and platform administrators to monitor, analyze, and optimize database performance in real-time. This system will handle the massive scale requirements of wedding season (400% traffic spikes) with enterprise-grade visualization and control.

**Target Scale**: Support 1M+ concurrent users during peak wedding season with sub-second dashboard response times.

## 📋 TEAM A CORE DELIVERABLES

### 1. Performance Monitoring Dashboard
Create a sophisticated React-based database performance monitoring interface with real-time metrics visualization.

```typescript
// src/components/database/DatabasePerformanceDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

interface DatabaseMetrics {
  queryPerformance: QueryPerformanceData[];
  indexUtilization: IndexData[];
  connectionPool: ConnectionPoolData;
  slowQueries: SlowQueryData[];
  systemHealth: HealthMetrics;
  optimizationRecommendations: OptimizationRecommendation[];
}

interface QueryPerformanceData {
  query_hash: string;
  query_text: string;
  avg_duration: number;
  total_calls: number;
  rows_examined: number;
  optimization_score: number;
  wedding_context: 'booking' | 'vendor_search' | 'payment' | 'timeline' | 'guest_management';
}

export default function DatabasePerformanceDashboard() {
  const [metrics, setMetrics] = useState<DatabaseMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [weddingSeasonMode, setWeddingSeasonMode] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch(`/api/database/metrics?timeRange=${timeRange}&seasonMode=${weddingSeasonMode}`);
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch database metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange, weddingSeasonMode]);

  const getHealthStatus = (score: number) => {
    if (score >= 90) return { color: 'text-green-600', icon: CheckCircle, label: 'Excellent' };
    if (score >= 75) return { color: 'text-yellow-600', icon: TrendingUp, label: 'Good' };
    if (score >= 60) return { color: 'text-orange-600', icon: TrendingDown, label: 'Fair' };
    return { color: 'text-red-600', icon: AlertTriangle, label: 'Critical' };
  };

  if (loading) {
    return <DatabasePerformanceSkeleton />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database Performance Monitor</h1>
          <p className="text-muted-foreground mt-2">
            Real-time optimization for wedding season excellence
          </p>
        </div>
        <div className="flex gap-4">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border rounded-md"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={weddingSeasonMode}
              onChange={(e) => setWeddingSeasonMode(e.target.checked)}
            />
            Wedding Season Optimization
          </label>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Query Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{metrics?.systemHealth.avg_query_time}ms</span>
              <Badge variant={metrics?.systemHealth.avg_query_time < 50 ? 'default' : 'destructive'}>
                {metrics?.systemHealth.avg_query_time < 50 ? 'Optimal' : 'Needs Optimization'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Target: &lt;50ms for wedding bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Connection Pool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {metrics?.connectionPool.active_connections}/{metrics?.connectionPool.max_connections}
              </span>
              <Badge variant={
                (metrics?.connectionPool.active_connections / metrics?.connectionPool.max_connections) < 0.8 
                  ? 'default' : 'destructive'
              }>
                {Math.round((metrics?.connectionPool.active_connections / metrics?.connectionPool.max_connections) * 100)}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Wedding season capacity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Index Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{metrics?.systemHealth.index_hit_ratio}%</span>
              <Badge variant={metrics?.systemHealth.index_hit_ratio > 95 ? 'default' : 'destructive'}>
                {metrics?.systemHealth.index_hit_ratio > 95 ? 'Excellent' : 'Optimize'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Target: &gt;95% hit ratio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Wedding Season Readiness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{metrics?.systemHealth.season_readiness_score}/100</span>
              {(() => {
                const status = getHealthStatus(metrics?.systemHealth.season_readiness_score || 0);
                const Icon = status.icon;
                return (
                  <div className="flex items-center gap-1">
                    <Icon className={`h-4 w-4 ${status.color}`} />
                    <Badge variant={status.label === 'Excellent' ? 'default' : 'destructive'}>
                      {status.label}
                    </Badge>
                  </div>
                );
              })()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Peak traffic handling capability
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {metrics?.optimizationRecommendations
        .filter(rec => rec.priority === 'critical')
        .map((alert, index) => (
          <Alert key={index} variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Critical:</strong> {alert.description} 
              <br />
              <em>Wedding Impact:</em> {alert.wedding_business_impact}
            </AlertDescription>
          </Alert>
        ))
      }

      <Tabs defaultValue="queries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queries">Query Performance</TabsTrigger>
          <TabsTrigger value="indexes">Index Analysis</TabsTrigger>
          <TabsTrigger value="optimization">Recommendations</TabsTrigger>
          <TabsTrigger value="wedding-specific">Wedding Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="queries">
          <QueryPerformanceTable queries={metrics?.queryPerformance || []} />
        </TabsContent>

        <TabsContent value="indexes">
          <IndexAnalysisView indexes={metrics?.indexUtilization || []} />
        </TabsContent>

        <TabsContent value="optimization">
          <OptimizationRecommendations recommendations={metrics?.optimizationRecommendations || []} />
        </TabsContent>

        <TabsContent value="wedding-specific">
          <WeddingSpecificInsights metrics={metrics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Sub-components for each tab
function QueryPerformanceTable({ queries }: { queries: QueryPerformanceData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Query Performance Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {queries.map((query, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <code className="text-sm bg-gray-100 p-2 rounded block mb-2">
                    {query.query_text.substring(0, 100)}...
                  </code>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>Avg Duration: {query.avg_duration}ms</span>
                    <span>Calls: {query.total_calls.toLocaleString()}</span>
                    <span>Rows: {query.rows_examined.toLocaleString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={query.optimization_score > 80 ? 'default' : 'destructive'}>
                    Score: {query.optimization_score}/100
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    {query.wedding_context}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WeddingSpecificInsights({ metrics }: { metrics: DatabaseMetrics | null }) {
  const weddingSeasonInsights = [
    {
      metric: 'Booking Queries',
      performance: '45ms avg',
      impact: 'Critical for user experience',
      recommendation: 'Add composite index on (venue_id, date, status)'
    },
    {
      metric: 'Vendor Search',
      performance: '180ms avg',
      impact: 'Affects supplier discovery',
      recommendation: 'Implement full-text search optimization'
    },
    {
      metric: 'Payment Processing',
      performance: '25ms avg',
      impact: 'Revenue critical',
      recommendation: 'Already optimized'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wedding Industry Performance Insights</CardTitle>
        <p className="text-sm text-muted-foreground">
          Performance analysis specific to wedding business workflows
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {weddingSeasonInsights.map((insight, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium">{insight.metric}</h4>
                  <p className="text-sm text-muted-foreground">{insight.impact}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{insight.performance}</p>
                  <p className="text-sm text-blue-600">{insight.recommendation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 2. Query Optimization Interface
Build an interactive query analyzer and optimization recommendation system.

```typescript
// src/components/database/QueryOptimizer.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface QueryAnalysisResult {
  original_query: string;
  optimized_query: string;
  performance_improvement: number;
  execution_plan: ExecutionPlan;
  wedding_context_analysis: WeddingContextAnalysis;
  index_recommendations: IndexRecommendation[];
  cost_analysis: QueryCostAnalysis;
}

export default function QueryOptimizer() {
  const [query, setQuery] = useState('');
  const [analysis, setAnalysis] = useState<QueryAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const analyzeQuery = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/database/analyze-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          context: 'wedding_platform',
          optimization_level: 'aggressive'
        })
      });
      
      const result = await response.json();
      setAnalysis(result);
    } catch (error) {
      console.error('Query analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SQL Query Optimizer</CardTitle>
          <p className="text-sm text-muted-foreground">
            Analyze and optimize queries for wedding season performance
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Paste your SQL query here for wedding-optimized analysis..."
            className="min-h-[200px] font-mono"
          />
          <Button 
            onClick={analyzeQuery} 
            disabled={!query.trim() || loading}
            className="w-full"
          >
            {loading ? 'Analyzing Wedding Performance...' : 'Optimize for Wedding Season'}
          </Button>
        </CardContent>
      </Card>

      {analysis && (
        <Tabs defaultValue="optimization" className="space-y-4">
          <TabsList>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
            <TabsTrigger value="execution-plan">Execution Plan</TabsTrigger>
            <TabsTrigger value="indexes">Index Recommendations</TabsTrigger>
            <TabsTrigger value="wedding-context">Wedding Context</TabsTrigger>
          </TabsList>

          <TabsContent value="optimization">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Query Optimization Results
                  <Badge variant="default">
                    {analysis.performance_improvement}% faster
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Original Query</h4>
                    <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                      {analysis.original_query}
                    </pre>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Optimized Query</h4>
                    <pre className="bg-green-100 p-4 rounded text-sm overflow-x-auto">
                      {analysis.optimized_query}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wedding-context">
            <WeddingContextAnalysisView analysis={analysis.wedding_context_analysis} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
```

### 3. Mobile Performance Dashboard
Create a responsive mobile interface for real-time database monitoring during high-traffic wedding events.

```typescript
// src/components/database/MobileDatabaseMonitor.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCcw, Zap, TrendingUp, AlertTriangle } from 'lucide-react';

export default function MobileDatabaseMonitor() {
  const [metrics, setMetrics] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshMetrics = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/database/mobile-metrics');
      const data = await response.json();
      setMetrics(data);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshMetrics();
    const interval = setInterval(refreshMetrics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      {/* Header with refresh */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">DB Monitor</h1>
        <button 
          onClick={refreshMetrics}
          className={`p-2 rounded-full ${refreshing ? 'animate-spin' : ''}`}
          disabled={refreshing}
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Critical Alerts */}
      {metrics?.criticalAlerts?.map((alert: any, index: number) => (
        <Alert key={index} variant="destructive" className="text-xs">
          <AlertTriangle className="h-3 w-3" />
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      ))}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Avg Query</p>
              <p className="text-lg font-bold">{metrics?.avgQueryTime}ms</p>
            </div>
            <Zap className={`h-4 w-4 ${metrics?.avgQueryTime < 50 ? 'text-green-500' : 'text-red-500'}`} />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Connections</p>
              <p className="text-lg font-bold">{metrics?.activeConnections}</p>
            </div>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </div>
        </Card>

        <Card className="p-3 col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Wedding Season Status</p>
              <p className="text-sm font-medium">{metrics?.seasonStatus}</p>
            </div>
            <Badge variant={metrics?.seasonReadiness > 80 ? 'default' : 'destructive'}>
              {metrics?.seasonReadiness}%
            </Badge>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <button className="p-2 text-xs bg-blue-100 text-blue-700 rounded">
            Optimize Now
          </button>
          <button className="p-2 text-xs bg-green-100 text-green-700 rounded">
            Scale Up
          </button>
        </div>
      </div>
    </div>
  );
}
```

## 📊 WEDDING BUSINESS CONTEXT INTEGRATION

### Key Wedding Industry Considerations:
- **Seasonal Traffic**: Interface must handle 400% traffic spikes during wedding season (May-October)
- **Critical Queries**: Booking confirmations, vendor searches, payment processing must be sub-50ms
- **Regional Variations**: Support for different wedding traditions affecting database load patterns
- **Vendor Dependencies**: Real-time monitoring of supplier-related database operations

### Performance Targets:
- Dashboard load time: <2 seconds
- Real-time updates: 30-second intervals
- Mobile responsiveness: 100% compatibility
- Wedding season readiness: 95%+ optimization score

## 🧪 TESTING STRATEGY

### 1. Performance Testing
```typescript
// src/tests/database-dashboard.performance.test.ts
import { test, expect } from '@playwright/test';

test.describe('Database Performance Dashboard', () => {
  test('loads within 2 seconds during wedding season simulation', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/admin/database-performance');
    await page.waitForSelector('[data-testid="performance-metrics"]');
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);
  });

  test('handles real-time updates without performance degradation', async ({ page }) => {
    await page.goto('/admin/database-performance');
    
    // Simulate 10 minutes of updates
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(30000); // 30-second intervals
      const memoryUsage = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
      expect(memoryUsage).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    }
  });
});
```

### 2. Wedding Season Load Testing
```typescript
// Test scenarios for peak wedding booking periods
const weddingSeasonScenarios = [
  'Saturday morning booking rush (9am-11am)',
  'Vendor search peak (1pm-3pm)',
  'Payment processing surge (evening)',
  'Timeline updates during events'
];
```

## 🚀 DEPLOYMENT & SCALABILITY

### Frontend Deployment Configuration:
- **CDN Integration**: Global content delivery for dashboard assets
- **Progressive Loading**: Lazy load dashboard sections for faster initial load
- **Offline Capability**: Cache critical metrics for offline viewing
- **Auto-scaling**: Handle dashboard traffic spikes during database optimization events

### Performance Monitoring:
- Track dashboard render times
- Monitor API response times for metrics endpoints
- Wedding season specific performance benchmarks
- Mobile device performance optimization

This comprehensive frontend implementation provides wedding industry professionals with enterprise-grade database performance monitoring, specifically optimized for the unique challenges of wedding season traffic patterns and supplier ecosystem requirements.