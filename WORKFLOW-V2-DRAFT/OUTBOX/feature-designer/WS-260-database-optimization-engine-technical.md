# WS-260: Database Optimization Engine Technical Specification

## Feature Overview
**Feature ID**: WS-260  
**Feature Name**: Database Optimization Engine  
**Category**: Infrastructure  
**Priority**: High  
**Complexity**: High  
**Estimated Effort**: 18 days  

### Purpose Statement
Implement automated database optimization engine that continuously monitors query performance, identifies bottlenecks, and applies intelligent optimizations to maintain optimal database performance as WedSync scales from hundreds to thousands of wedding suppliers.

### User Story
As a WedSync platform administrator, I want an automated database optimization system that continuously monitors and optimizes our database performance, so that our wedding coordination platform maintains fast response times and can scale efficiently without manual intervention as we grow to serve thousands of wedding suppliers and couples.

## Database Schema

### Core Tables

```sql
-- Database Performance Monitoring
CREATE TABLE database_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    database_name VARCHAR(100) NOT NULL,
    connection_count INTEGER NOT NULL,
    active_queries INTEGER NOT NULL,
    slow_queries INTEGER NOT NULL,
    cache_hit_ratio DECIMAL(5,2) NOT NULL,
    cpu_usage DECIMAL(5,2) NOT NULL,
    memory_usage DECIMAL(5,2) NOT NULL,
    disk_io_read BIGINT NOT NULL,
    disk_io_write BIGINT NOT NULL,
    lock_waits INTEGER NOT NULL,
    deadlocks INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Query Performance Analysis
CREATE TABLE query_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash VARCHAR(64) NOT NULL,
    query_text TEXT NOT NULL,
    table_name VARCHAR(100),
    operation_type query_operation_type NOT NULL,
    execution_count INTEGER NOT NULL DEFAULT 1,
    avg_execution_time DECIMAL(10,3) NOT NULL,
    min_execution_time DECIMAL(10,3) NOT NULL,
    max_execution_time DECIMAL(10,3) NOT NULL,
    total_execution_time DECIMAL(12,3) NOT NULL,
    rows_examined BIGINT,
    rows_returned BIGINT,
    temporary_tables INTEGER DEFAULT 0,
    full_table_scans INTEGER DEFAULT 0,
    index_usage JSONB,
    optimization_score INTEGER CHECK (optimization_score >= 0 AND optimization_score <= 100),
    last_executed TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(query_hash)
);

-- Index Analysis and Recommendations
CREATE TABLE index_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    index_name VARCHAR(100),
    column_names TEXT[] NOT NULL,
    index_type index_type_enum NOT NULL DEFAULT 'btree',
    size_bytes BIGINT,
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMPTZ,
    effectiveness_score INTEGER CHECK (effectiveness_score >= 0 AND effectiveness_score <= 100),
    recommendation recommendation_type NOT NULL,
    impact_estimate impact_level NOT NULL,
    cost_estimate DECIMAL(10,2),
    status index_status DEFAULT 'pending',
    applied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimization Actions and History
CREATE TABLE optimization_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type optimization_action_type NOT NULL,
    target_table VARCHAR(100),
    target_index VARCHAR(100),
    action_sql TEXT NOT NULL,
    reason TEXT NOT NULL,
    estimated_impact impact_level NOT NULL,
    estimated_duration INTERVAL,
    scheduled_for TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    execution_duration INTERVAL,
    status action_status DEFAULT 'scheduled',
    before_metrics JSONB,
    after_metrics JSONB,
    rollback_sql TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table Statistics and Growth Tracking
CREATE TABLE table_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    schema_name VARCHAR(100) NOT NULL DEFAULT 'public',
    row_count BIGINT NOT NULL,
    table_size_bytes BIGINT NOT NULL,
    index_size_bytes BIGINT NOT NULL,
    dead_tuples BIGINT DEFAULT 0,
    last_vacuum TIMESTAMPTZ,
    last_analyze TIMESTAMPTZ,
    growth_rate_daily DECIMAL(10,2),
    access_frequency INTEGER DEFAULT 0,
    maintenance_priority INTEGER CHECK (maintenance_priority >= 1 AND maintenance_priority <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(table_name, schema_name)
);

-- Performance Alerts Configuration
CREATE TABLE performance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_name VARCHAR(200) NOT NULL,
    alert_type alert_type_enum NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    threshold_value DECIMAL(10,3) NOT NULL,
    comparison_operator comparison_op NOT NULL,
    severity alert_severity NOT NULL,
    notification_channels TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    cooldown_minutes INTEGER DEFAULT 30,
    last_triggered TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Optimization Reports
CREATE TABLE optimization_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type report_type_enum NOT NULL,
    report_period INTERVAL NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    summary JSONB NOT NULL,
    recommendations JSONB NOT NULL,
    performance_trends JSONB,
    cost_analysis JSONB,
    next_review_date DATE,
    status report_status DEFAULT 'generated',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enums and Custom Types

```sql
-- Custom types for optimization engine
CREATE TYPE query_operation_type AS ENUM ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP');
CREATE TYPE index_type_enum AS ENUM ('btree', 'hash', 'gist', 'gin', 'brin', 'partial', 'unique');
CREATE TYPE recommendation_type AS ENUM ('create_index', 'drop_index', 'modify_index', 'partition_table', 'archive_data', 'optimize_query');
CREATE TYPE impact_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE optimization_action_type AS ENUM ('create_index', 'drop_index', 'vacuum', 'analyze', 'reindex', 'partition', 'archive');
CREATE TYPE action_status AS ENUM ('scheduled', 'running', 'completed', 'failed', 'cancelled', 'rolled_back');
CREATE TYPE index_status AS ENUM ('pending', 'approved', 'rejected', 'applied', 'monitoring');
CREATE TYPE alert_type_enum AS ENUM ('threshold', 'trend', 'anomaly', 'performance_degradation');
CREATE TYPE comparison_op AS ENUM ('>', '>=', '<', '<=', '=', '!=');
CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'error', 'critical');
CREATE TYPE report_type_enum AS ENUM ('daily', 'weekly', 'monthly', 'on_demand');
CREATE TYPE report_status AS ENUM ('generating', 'generated', 'reviewed', 'archived');
```

### Indexes for Performance

```sql
-- Performance monitoring indexes
CREATE INDEX idx_database_metrics_collected_at ON database_metrics(collected_at DESC);
CREATE INDEX idx_database_metrics_database_name ON database_metrics(database_name);

-- Query performance indexes
CREATE INDEX idx_query_performance_hash ON query_performance(query_hash);
CREATE INDEX idx_query_performance_table ON query_performance(table_name);
CREATE INDEX idx_query_performance_avg_time ON query_performance(avg_execution_time DESC);
CREATE INDEX idx_query_performance_last_executed ON query_performance(last_executed DESC);

-- Index analysis indexes
CREATE INDEX idx_index_analysis_table ON index_analysis(table_name);
CREATE INDEX idx_index_analysis_recommendation ON index_analysis(recommendation);
CREATE INDEX idx_index_analysis_status ON index_analysis(status);

-- Optimization actions indexes
CREATE INDEX idx_optimization_actions_status ON optimization_actions(status);
CREATE INDEX idx_optimization_actions_scheduled ON optimization_actions(scheduled_for);
CREATE INDEX idx_optimization_actions_table ON optimization_actions(target_table);

-- Table statistics indexes
CREATE INDEX idx_table_statistics_table_name ON table_statistics(table_name);
CREATE INDEX idx_table_statistics_growth_rate ON table_statistics(growth_rate_daily DESC NULLS LAST);
CREATE INDEX idx_table_statistics_priority ON table_statistics(maintenance_priority);
```

## API Endpoints

### Database Metrics Collection

```typescript
// GET /api/database-optimization/metrics
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('timeRange') || '24h';
  const database = searchParams.get('database');

  try {
    const metrics = await supabase
      .from('database_metrics')
      .select('*')
      .gte('collected_at', getTimeRangeFilter(timeRange))
      .eq(database ? 'database_name' : 'id', database || '')
      .order('collected_at', { ascending: false });

    return NextResponse.json({
      success: true,
      data: metrics.data,
      summary: calculateMetricsSummary(metrics.data)
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch database metrics' 
    }, { status: 500 });
  }
}

// POST /api/database-optimization/collect-metrics
export async function POST() {
  try {
    const metrics = await DatabaseMonitoringService.collectCurrentMetrics();
    
    const { data, error } = await supabase
      .from('database_metrics')
      .insert([metrics]);

    if (error) throw error;

    // Check for alerts
    await AlertingService.checkPerformanceThresholds(metrics);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Metrics collection failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to collect metrics' 
    }, { status: 500 });
  }
}
```

### Query Performance Analysis

```typescript
// GET /api/database-optimization/queries/performance
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const sortBy = searchParams.get('sortBy') || 'avg_execution_time';
  const table = searchParams.get('table');

  try {
    let query = supabase
      .from('query_performance')
      .select('*')
      .order(sortBy, { ascending: false })
      .limit(limit);

    if (table) {
      query = query.eq('table_name', table);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      insights: await QueryAnalysisService.generateInsights(data)
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch query performance data' 
    }, { status: 500 });
  }
}

// POST /api/database-optimization/queries/analyze
export async function POST(request: Request) {
  const { query, context } = await request.json();

  try {
    const analysis = await QueryAnalysisService.analyzeQuery(query, context);
    
    // Store analysis results
    await supabase.from('query_performance').upsert([{
      query_hash: analysis.hash,
      query_text: query,
      table_name: analysis.primaryTable,
      operation_type: analysis.operationType,
      optimization_score: analysis.optimizationScore,
      avg_execution_time: analysis.avgExecutionTime,
      min_execution_time: analysis.minExecutionTime,
      max_execution_time: analysis.maxExecutionTime,
      total_execution_time: analysis.totalExecutionTime,
      index_usage: analysis.indexUsage,
      last_executed: new Date().toISOString()
    }], { onConflict: 'query_hash' });

    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Query analysis failed' 
    }, { status: 500 });
  }
}
```

### Index Optimization

```typescript
// GET /api/database-optimization/indexes/recommendations
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table');
  const status = searchParams.get('status') || 'pending';

  try {
    let query = supabase
      .from('index_analysis')
      .select('*')
      .eq('status', status)
      .order('effectiveness_score', { ascending: false });

    if (table) {
      query = query.eq('table_name', table);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      recommendations: data,
      summary: IndexOptimizationService.summarizeRecommendations(data)
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch index recommendations' 
    }, { status: 500 });
  }
}

// POST /api/database-optimization/indexes/apply
export async function POST(request: Request) {
  const { recommendationId, approved } = await request.json();

  try {
    if (!approved) {
      await supabase
        .from('index_analysis')
        .update({ status: 'rejected' })
        .eq('id', recommendationId);
      
      return NextResponse.json({ success: true, message: 'Recommendation rejected' });
    }

    const { data: recommendation } = await supabase
      .from('index_analysis')
      .select('*')
      .eq('id', recommendationId)
      .single();

    if (!recommendation) {
      return NextResponse.json({ 
        success: false, 
        error: 'Recommendation not found' 
      }, { status: 404 });
    }

    // Apply the optimization
    const result = await IndexOptimizationService.applyRecommendation(recommendation);
    
    // Update status
    await supabase
      .from('index_analysis')
      .update({ 
        status: 'applied', 
        applied_at: new Date().toISOString() 
      })
      .eq('id', recommendationId);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to apply index optimization' 
    }, { status: 500 });
  }
}
```

### Optimization Actions

```typescript
// POST /api/database-optimization/actions/schedule
export async function POST(request: Request) {
  const { 
    actionType, 
    targetTable, 
    targetIndex, 
    scheduledFor, 
    reason 
  } = await request.json();

  try {
    const action = await OptimizationActionService.scheduleAction({
      actionType,
      targetTable,
      targetIndex,
      scheduledFor: scheduledFor || new Date(),
      reason
    });

    const { data, error } = await supabase
      .from('optimization_actions')
      .insert([action]);

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to schedule optimization action' 
    }, { status: 500 });
  }
}

// GET /api/database-optimization/actions/status
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    let query = supabase
      .from('optimization_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      actions: data,
      summary: OptimizationActionService.getActionsSummary(data)
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch optimization actions' 
    }, { status: 500 });
  }
}
```

## React Components

### Database Optimization Dashboard

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Database, 
  Zap, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Settings
} from 'lucide-react';

interface DatabaseMetrics {
  id: string;
  collected_at: string;
  database_name: string;
  connection_count: number;
  active_queries: number;
  slow_queries: number;
  cache_hit_ratio: number;
  cpu_usage: number;
  memory_usage: number;
  lock_waits: number;
}

interface QueryPerformance {
  id: string;
  query_hash: string;
  query_text: string;
  table_name: string;
  avg_execution_time: number;
  execution_count: number;
  optimization_score: number;
  last_executed: string;
}

interface IndexRecommendation {
  id: string;
  table_name: string;
  column_names: string[];
  recommendation: string;
  impact_estimate: string;
  effectiveness_score: number;
  status: string;
}

const DatabaseOptimizationDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DatabaseMetrics[]>([]);
  const [queryPerformance, setQueryPerformance] = useState<QueryPerformance[]>([]);
  const [recommendations, setRecommendations] = useState<IndexRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');

  useEffect(() => {
    loadDashboardData();
  }, [selectedTimeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [metricsRes, queriesRes, recommendationsRes] = await Promise.all([
        fetch(`/api/database-optimization/metrics?timeRange=${selectedTimeRange}`),
        fetch('/api/database-optimization/queries/performance?limit=20'),
        fetch('/api/database-optimization/indexes/recommendations?status=pending')
      ]);

      const metricsData = await metricsRes.json();
      const queriesData = await queriesRes.json();
      const recommendationsData = await recommendationsRes.json();

      setMetrics(metricsData.data || []);
      setQueryPerformance(queriesData.data || []);
      setRecommendations(recommendationsData.recommendations || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMetricStatus = (value: number, type: string) => {
    switch (type) {
      case 'cpu':
        return value > 80 ? 'error' : value > 60 ? 'warning' : 'success';
      case 'cache_hit':
        return value < 85 ? 'error' : value < 95 ? 'warning' : 'success';
      case 'slow_queries':
        return value > 10 ? 'error' : value > 5 ? 'warning' : 'success';
      default:
        return 'success';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'success': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const applyRecommendation = async (recommendationId: string, approved: boolean) => {
    try {
      const response = await fetch('/api/database-optimization/indexes/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId, approved })
      });

      const result = await response.json();
      
      if (result.success) {
        await loadDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to apply recommendation:', error);
    }
  };

  const currentMetrics = metrics[0]; // Most recent metrics

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Database Optimization</h1>
          <p className="text-gray-600">Automated performance monitoring and optimization</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={selectedTimeRange} 
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <Button onClick={loadDashboardData} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">CPU Usage</p>
                <p className="text-2xl font-bold">{currentMetrics?.cpu_usage.toFixed(1)}%</p>
              </div>
              <div className={`w-3 h-3 rounded-full ${getStatusColor(getMetricStatus(currentMetrics?.cpu_usage || 0, 'cpu'))}`}></div>
            </div>
            <Progress 
              value={currentMetrics?.cpu_usage || 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cache Hit Ratio</p>
                <p className="text-2xl font-bold">{currentMetrics?.cache_hit_ratio.toFixed(1)}%</p>
              </div>
              <div className={`w-3 h-3 rounded-full ${getStatusColor(getMetricStatus(currentMetrics?.cache_hit_ratio || 0, 'cache_hit'))}`}></div>
            </div>
            <Progress 
              value={currentMetrics?.cache_hit_ratio || 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Connections</p>
                <p className="text-2xl font-bold">{currentMetrics?.connection_count || 0}</p>
              </div>
              <Database className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Slow Queries</p>
                <p className="text-2xl font-bold">{currentMetrics?.slow_queries || 0}</p>
              </div>
              <div className={`w-3 h-3 rounded-full ${getStatusColor(getMetricStatus(currentMetrics?.slow_queries || 0, 'slow_queries'))}`}></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.slice(-20).reverse()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="collected_at" 
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="cpu_usage" 
                stroke="#8884d8" 
                name="CPU Usage (%)"
              />
              <Line 
                type="monotone" 
                dataKey="memory_usage" 
                stroke="#82ca9d" 
                name="Memory Usage (%)"
              />
              <Line 
                type="monotone" 
                dataKey="cache_hit_ratio" 
                stroke="#ffc658" 
                name="Cache Hit Ratio (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Slow Queries Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Slow Query Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {queryPerformance.slice(0, 5).map((query) => (
                <div key={query.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                        {query.query_text.length > 100 
                          ? `${query.query_text.substring(0, 100)}...` 
                          : query.query_text
                        }
                      </p>
                    </div>
                    <Badge variant={query.optimization_score > 70 ? "default" : "destructive"}>
                      Score: {query.optimization_score}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Avg Time</p>
                      <p className="font-semibold">{query.avg_execution_time.toFixed(2)}ms</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Executions</p>
                      <p className="font-semibold">{query.execution_count}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Table</p>
                      <p className="font-semibold">{query.table_name || 'Multiple'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Index Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Optimization Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.slice(0, 5).map((rec) => (
                <div key={rec.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{rec.table_name}</p>
                      <p className="text-sm text-gray-600">
                        {rec.recommendation}: {rec.column_names.join(', ')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={
                        rec.impact_estimate === 'high' ? "default" : 
                        rec.impact_estimate === 'medium' ? "secondary" : "outline"
                      }>
                        {rec.impact_estimate} impact
                      </Badge>
                      <Badge variant="outline">
                        {rec.effectiveness_score}% effective
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button 
                      size="sm" 
                      onClick={() => applyRecommendation(rec.id, true)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Apply
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => applyRecommendation(rec.id, false)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
              
              {recommendations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No optimization recommendations at this time</p>
                  <p className="text-sm">Your database is performing well!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {currentMetrics && (
        currentMetrics.cpu_usage > 80 || 
        currentMetrics.cache_hit_ratio < 85 || 
        currentMetrics.slow_queries > 5
      ) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Performance issues detected. Check the metrics above and consider applying the optimization recommendations.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default DatabaseOptimizationDashboard;
```

## Core Implementation

### Database Monitoring Service

```typescript
import { createClient } from '@supabase/supabase-js';

export class DatabaseMonitoringService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  async collectCurrentMetrics() {
    try {
      // Get database performance metrics
      const connectionStats = await this.getConnectionStats();
      const queryStats = await this.getQueryStats();
      const systemStats = await this.getSystemStats();

      const metrics = {
        database_name: 'wedsync-prod',
        connection_count: connectionStats.active_connections,
        active_queries: connectionStats.active_queries,
        slow_queries: queryStats.slow_query_count,
        cache_hit_ratio: systemStats.cache_hit_ratio,
        cpu_usage: systemStats.cpu_usage,
        memory_usage: systemStats.memory_usage,
        disk_io_read: systemStats.disk_io_read,
        disk_io_write: systemStats.disk_io_write,
        lock_waits: queryStats.lock_waits,
        deadlocks: queryStats.deadlocks
      };

      return metrics;
    } catch (error) {
      console.error('Failed to collect database metrics:', error);
      throw error;
    }
  }

  private async getConnectionStats() {
    const { data, error } = await this.supabase.rpc('get_connection_stats');
    if (error) throw error;
    return data;
  }

  private async getQueryStats() {
    const { data, error } = await this.supabase.rpc('get_query_stats');
    if (error) throw error;
    return data;
  }

  private async getSystemStats() {
    const { data, error } = await this.supabase.rpc('get_system_stats');
    if (error) throw error;
    return data;
  }

  async analyzeQueryPerformance(timeRange: string = '1h') {
    try {
      // Get slow queries from pg_stat_statements
      const { data: slowQueries, error } = await this.supabase.rpc(
        'analyze_slow_queries',
        { time_range: timeRange }
      );

      if (error) throw error;

      // Process and store query analysis
      for (const query of slowQueries) {
        await this.storeQueryAnalysis(query);
      }

      return slowQueries;
    } catch (error) {
      console.error('Query performance analysis failed:', error);
      throw error;
    }
  }

  private async storeQueryAnalysis(queryData: any) {
    const analysis = {
      query_hash: this.hashQuery(queryData.query),
      query_text: queryData.query,
      table_name: this.extractTableName(queryData.query),
      operation_type: this.getOperationType(queryData.query),
      avg_execution_time: queryData.mean_time,
      min_execution_time: queryData.min_time,
      max_execution_time: queryData.max_time,
      total_execution_time: queryData.total_time,
      execution_count: queryData.calls,
      rows_examined: queryData.rows,
      optimization_score: this.calculateOptimizationScore(queryData),
      last_executed: new Date().toISOString()
    };

    await this.supabase
      .from('query_performance')
      .upsert([analysis], { onConflict: 'query_hash' });
  }

  private hashQuery(query: string): string {
    // Simple hash function for query identification
    return require('crypto')
      .createHash('sha256')
      .update(query.replace(/\s+/g, ' ').toLowerCase())
      .digest('hex')
      .substring(0, 16);
  }

  private extractTableName(query: string): string | null {
    const match = query.match(/(?:FROM|UPDATE|INSERT INTO|DELETE FROM)\s+([a-zA-Z_]\w*)/i);
    return match ? match[1] : null;
  }

  private getOperationType(query: string): string {
    const trimmed = query.trim().toUpperCase();
    if (trimmed.startsWith('SELECT')) return 'SELECT';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    return 'SELECT';
  }

  private calculateOptimizationScore(queryData: any): number {
    // Calculate optimization score based on various factors
    let score = 100;
    
    // Penalty for slow execution time
    if (queryData.mean_time > 1000) score -= 30;
    else if (queryData.mean_time > 500) score -= 20;
    else if (queryData.mean_time > 100) score -= 10;
    
    // Penalty for high row examination ratio
    if (queryData.rows > 0 && queryData.calls > 0) {
      const avgRowsPerCall = queryData.rows / queryData.calls;
      if (avgRowsPerCall > 10000) score -= 25;
      else if (avgRowsPerCall > 1000) score -= 15;
      else if (avgRowsPerCall > 100) score -= 5;
    }
    
    // Penalty for high frequency with poor performance
    if (queryData.calls > 100 && queryData.mean_time > 100) score -= 20;
    
    return Math.max(0, Math.min(100, score));
  }
}

export const databaseMonitoring = new DatabaseMonitoringService();
```

### Query Analysis Service

```typescript
export class QueryAnalysisService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  async analyzeQuery(query: string, context?: any) {
    try {
      // Parse query structure
      const structure = this.parseQueryStructure(query);
      
      // Analyze execution plan
      const executionPlan = await this.getExecutionPlan(query);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(structure, executionPlan);
      
      // Calculate optimization score
      const optimizationScore = this.calculateOptimizationScore(structure, executionPlan);

      return {
        hash: this.hashQuery(query),
        structure,
        executionPlan,
        recommendations,
        optimizationScore,
        primaryTable: structure.tables[0] || null,
        operationType: structure.operation,
        avgExecutionTime: executionPlan?.actualTime || 0,
        minExecutionTime: executionPlan?.actualTime || 0,
        maxExecutionTime: executionPlan?.actualTime || 0,
        totalExecutionTime: executionPlan?.actualTime || 0,
        indexUsage: executionPlan?.indexUsage || {}
      };
    } catch (error) {
      console.error('Query analysis failed:', error);
      throw error;
    }
  }

  private parseQueryStructure(query: string) {
    const structure = {
      operation: this.getOperationType(query),
      tables: this.extractTables(query),
      columns: this.extractColumns(query),
      whereConditions: this.extractWhereConditions(query),
      joins: this.extractJoins(query),
      orderBy: this.extractOrderBy(query),
      groupBy: this.extractGroupBy(query),
      subqueries: this.hasSubqueries(query)
    };
    
    return structure;
  }

  private async getExecutionPlan(query: string) {
    try {
      const { data, error } = await this.supabase.rpc('explain_analyze_query', {
        query_text: query
      });
      
      if (error) throw error;
      
      return this.parseExecutionPlan(data);
    } catch (error) {
      console.warn('Could not get execution plan:', error);
      return null;
    }
  }

  private parseExecutionPlan(planData: any) {
    // Parse PostgreSQL execution plan
    const plan = {
      actualTime: 0,
      planningTime: 0,
      executionTime: 0,
      indexUsage: {},
      scanTypes: [],
      joinTypes: [],
      sortOperations: 0,
      tempFilesUsed: 0
    };

    // Extract relevant metrics from execution plan
    if (planData && Array.isArray(planData)) {
      planData.forEach(line => {
        if (typeof line === 'string') {
          // Parse execution time
          const timeMatch = line.match(/actual time=(\d+\.?\d*)/);
          if (timeMatch) {
            plan.actualTime = Math.max(plan.actualTime, parseFloat(timeMatch[1]));
          }
          
          // Check for index usage
          if (line.includes('Index Scan')) {
            const indexMatch = line.match(/Index Scan using (\w+)/);
            if (indexMatch) {
              plan.indexUsage[indexMatch[1]] = true;
            }
          }
          
          // Check for table scans
          if (line.includes('Seq Scan')) {
            plan.scanTypes.push('sequential');
          }
          
          // Check for sorts
          if (line.includes('Sort')) {
            plan.sortOperations++;
          }
        }
      });
    }

    return plan;
  }

  async generateRecommendations(structure: any, executionPlan: any) {
    const recommendations = [];

    // Check for missing indexes on WHERE conditions
    if (structure.whereConditions.length > 0) {
      for (const condition of structure.whereConditions) {
        const hasIndex = await this.checkIndexExists(structure.tables[0], condition.column);
        if (!hasIndex && condition.operator === '=') {
          recommendations.push({
            type: 'create_index',
            table: structure.tables[0],
            columns: [condition.column],
            reason: `Equality condition on ${condition.column} would benefit from an index`,
            impact: 'medium'
          });
        }
      }
    }

    // Check for composite index opportunities
    if (structure.whereConditions.length > 1) {
      const columns = structure.whereConditions.map(c => c.column);
      recommendations.push({
        type: 'create_index',
        table: structure.tables[0],
        columns: columns,
        reason: 'Multiple WHERE conditions could benefit from composite index',
        impact: 'high'
      });
    }

    // Check for ORDER BY optimization
    if (structure.orderBy.length > 0 && executionPlan?.sortOperations > 0) {
      recommendations.push({
        type: 'create_index',
        table: structure.tables[0],
        columns: structure.orderBy,
        reason: 'ORDER BY clause is causing expensive sort operations',
        impact: 'medium'
      });
    }

    return recommendations;
  }

  private async checkIndexExists(table: string, column: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('check_index_exists', {
        table_name: table,
        column_name: column
      });
      
      return !error && data;
    } catch {
      return false;
    }
  }

  private extractTables(query: string): string[] {
    const tables = [];
    const fromMatch = query.match(/FROM\s+([^WHERE|ORDER|GROUP|LIMIT]+)/i);
    if (fromMatch) {
      const tableSection = fromMatch[1];
      const tableMatches = tableSection.match(/\b([a-zA-Z_]\w*)\b/g);
      if (tableMatches) {
        tables.push(...tableMatches.filter(t => 
          !['JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER'].includes(t.toUpperCase())
        ));
      }
    }
    return Array.from(new Set(tables));
  }

  private extractColumns(query: string): string[] {
    const selectMatch = query.match(/SELECT\s+(.*?)\s+FROM/is);
    if (!selectMatch) return [];
    
    const selectClause = selectMatch[1];
    if (selectClause.trim() === '*') return ['*'];
    
    return selectClause
      .split(',')
      .map(col => col.trim().replace(/.*\s+as\s+/i, ''))
      .filter(col => col && !col.includes('('));
  }

  private extractWhereConditions(query: string): Array<{column: string, operator: string, value: any}> {
    const conditions = [];
    const whereMatch = query.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+GROUP|\s+LIMIT|$)/is);
    
    if (whereMatch) {
      const whereClause = whereMatch[1];
      // Simple parsing - could be enhanced with proper SQL parser
      const conditionMatches = whereClause.match(/(\w+)\s*(=|!=|<|>|<=|>=|LIKE|IN)\s*([^AND|OR]+)/gi);
      
      if (conditionMatches) {
        conditionMatches.forEach(match => {
          const parts = match.match(/(\w+)\s*(=|!=|<|>|<=|>=|LIKE|IN)\s*(.+)/i);
          if (parts) {
            conditions.push({
              column: parts[1],
              operator: parts[2],
              value: parts[3].trim()
            });
          }
        });
      }
    }
    
    return conditions;
  }

  private extractJoins(query: string): string[] {
    const joins = [];
    const joinMatches = query.match(/(INNER|LEFT|RIGHT|FULL)\s+JOIN/gi);
    if (joinMatches) {
      joins.push(...joinMatches.map(j => j.toUpperCase()));
    }
    return joins;
  }

  private extractOrderBy(query: string): string[] {
    const orderMatch = query.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|$)/is);
    if (!orderMatch) return [];
    
    return orderMatch[1]
      .split(',')
      .map(col => col.trim().replace(/\s+(ASC|DESC)$/i, ''))
      .filter(col => col);
  }

  private extractGroupBy(query: string): string[] {
    const groupMatch = query.match(/GROUP\s+BY\s+(.+?)(?:\s+HAVING|\s+ORDER|\s+LIMIT|$)/is);
    if (!groupMatch) return [];
    
    return groupMatch[1]
      .split(',')
      .map(col => col.trim())
      .filter(col => col);
  }

  private hasSubqueries(query: string): boolean {
    return /\(\s*SELECT/i.test(query);
  }

  private getOperationType(query: string): string {
    const trimmed = query.trim().toUpperCase();
    if (trimmed.startsWith('SELECT')) return 'SELECT';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    return 'SELECT';
  }

  private hashQuery(query: string): string {
    return require('crypto')
      .createHash('sha256')
      .update(query.replace(/\s+/g, ' ').toLowerCase())
      .digest('hex')
      .substring(0, 16);
  }

  private calculateOptimizationScore(structure: any, executionPlan: any): number {
    let score = 100;
    
    // Deduct for sequential scans
    if (executionPlan?.scanTypes.includes('sequential')) score -= 20;
    
    // Deduct for expensive sorts
    if (executionPlan?.sortOperations > 0) score -= 15;
    
    // Deduct for missing indexes on WHERE conditions
    score -= structure.whereConditions.length * 10;
    
    // Deduct for complex joins without proper indexing
    score -= structure.joins.length * 5;
    
    // Deduct for subqueries
    if (structure.subqueries) score -= 15;
    
    return Math.max(0, Math.min(100, score));
  }

  async generateInsights(queryData: any[]) {
    const insights = {
      totalQueries: queryData.length,
      avgOptimizationScore: 0,
      slowestQueries: [],
      recommendationSummary: {
        indexRecommendations: 0,
        queryRecommendations: 0,
        tableRecommendations: 0
      }
    };

    if (queryData.length > 0) {
      insights.avgOptimizationScore = queryData.reduce((sum, q) => sum + q.optimization_score, 0) / queryData.length;
      insights.slowestQueries = queryData
        .sort((a, b) => b.avg_execution_time - a.avg_execution_time)
        .slice(0, 5);
    }

    return insights;
  }
}

export const queryAnalysis = new QueryAnalysisService();
```

## MCP Server Usage

The Database Optimization Engine will utilize these MCP servers:

### PostgreSQL MCP
- **Execute optimization queries**: Apply index recommendations and schema changes
- **Monitor database performance**: Collect real-time metrics from pg_stat_* views
- **Analyze query patterns**: Use pg_stat_statements for query performance analysis
- **Validate optimizations**: Verify that applied changes improve performance

### Supabase MCP
- **Branch testing**: Create development branches to test optimizations safely
- **Migration management**: Apply database optimizations through controlled migrations
- **Log analysis**: Monitor Supabase logs for performance issues and errors
- **Configuration updates**: Adjust database settings and connection parameters

### Filesystem MCP
- **Configuration management**: Store and manage optimization configuration files
- **Report generation**: Create detailed performance reports and recommendations
- **Backup verification**: Ensure optimization scripts are backed up properly
- **Log file management**: Archive and rotate optimization logs

### Browser MCP
- **Dashboard testing**: Verify that optimization dashboard renders correctly
- **Performance validation**: Test that UI responds quickly after optimizations
- **Alert testing**: Verify that performance alerts display properly
- **Report viewing**: Test that optimization reports are accessible and readable

## Navigation Integration

### Main Navigation Updates

The Database Optimization Engine will be integrated into the WedSync navigation structure:

```typescript
// Add to main navigation menu
{
  id: 'database-optimization',
  label: 'Database Optimization',
  icon: Database,
  href: '/dashboard/database-optimization',
  permission: 'admin',
  badge: hasPerformanceIssues ? { text: 'Issues', variant: 'destructive' } : undefined
}

// Add to admin navigation submenu
{
  id: 'admin-performance',
  label: 'Performance',
  items: [
    {
      id: 'database-optimization',
      label: 'Database Optimization',
      href: '/dashboard/database-optimization',
      icon: Database
    },
    {
      id: 'query-analysis',
      label: 'Query Analysis',
      href: '/dashboard/database-optimization/queries',
      icon: Activity
    },
    {
      id: 'index-recommendations',
      label: 'Index Recommendations',
      href: '/dashboard/database-optimization/indexes',
      icon: Zap
    }
  ]
}
```

### Breadcrumb Integration

```typescript
const breadcrumbMap = {
  '/dashboard/database-optimization': [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Database Optimization', href: '/dashboard/database-optimization' }
  ],
  '/dashboard/database-optimization/queries': [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Database Optimization', href: '/dashboard/database-optimization' },
    { label: 'Query Analysis', href: '/dashboard/database-optimization/queries' }
  ],
  '/dashboard/database-optimization/indexes': [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Database Optimization', href: '/dashboard/database-optimization' },
    { label: 'Index Recommendations', href: '/dashboard/database-optimization/indexes' }
  ]
}
```

### Quick Actions Integration

```typescript
// Add to global quick actions
{
  id: 'check-performance',
  label: 'Check Database Performance',
  icon: Activity,
  href: '/dashboard/database-optimization',
  shortcut: 'P',
  category: 'admin'
},
{
  id: 'analyze-slow-queries',
  label: 'Analyze Slow Queries',
  icon: Zap,
  href: '/dashboard/database-optimization/queries',
  shortcut: 'Q',
  category: 'admin'
}
```

## Testing Requirements

### Unit Tests

```typescript
// Database Monitoring Service Tests
describe('DatabaseMonitoringService', () => {
  test('should collect current metrics successfully', async () => {
    const metrics = await databaseMonitoring.collectCurrentMetrics();
    expect(metrics).toHaveProperty('cpu_usage');
    expect(metrics).toHaveProperty('memory_usage');
    expect(metrics).toHaveProperty('cache_hit_ratio');
  });

  test('should analyze query performance', async () => {
    const analysis = await databaseMonitoring.analyzeQueryPerformance('1h');
    expect(Array.isArray(analysis)).toBe(true);
  });
});

// Query Analysis Service Tests
describe('QueryAnalysisService', () => {
  test('should analyze simple SELECT query', async () => {
    const query = 'SELECT * FROM weddings WHERE status = $1';
    const analysis = await queryAnalysis.analyzeQuery(query);
    expect(analysis).toHaveProperty('optimizationScore');
    expect(analysis).toHaveProperty('recommendations');
  });

  test('should generate index recommendations', async () => {
    const structure = {
      tables: ['weddings'],
      whereConditions: [{ column: 'status', operator: '=', value: '$1' }]
    };
    const recommendations = await queryAnalysis.generateRecommendations(structure, null);
    expect(recommendations.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
// API Endpoint Tests
describe('Database Optimization API', () => {
  test('GET /api/database-optimization/metrics', async () => {
    const response = await fetch('/api/database-optimization/metrics?timeRange=1h');
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  test('POST /api/database-optimization/queries/analyze', async () => {
    const response = await fetch('/api/database-optimization/queries/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'SELECT * FROM weddings WHERE venue_id = $1',
        context: { table: 'weddings' }
      })
    });
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.analysis).toHaveProperty('optimizationScore');
  });
});
```

### Browser Tests

```typescript
// Dashboard Component Tests
describe('DatabaseOptimizationDashboard', () => {
  test('should render metrics cards', async () => {
    const { page } = await setupBrowserTest('/dashboard/database-optimization');
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="metrics-cards"]');
    
    // Verify key metrics are displayed
    const cpuUsage = await page.textContent('[data-testid="cpu-usage"]');
    expect(cpuUsage).toMatch(/\d+\.\d+%/);
    
    const cacheHitRatio = await page.textContent('[data-testid="cache-hit-ratio"]');
    expect(cacheHitRatio).toMatch(/\d+\.\d+%/);
  });

  test('should display performance chart', async () => {
    const { page } = await setupBrowserTest('/dashboard/database-optimization');
    
    // Wait for chart to render
    await page.waitForSelector('.recharts-wrapper');
    
    // Verify chart elements are present
    const chartLines = await page.$$('.recharts-line');
    expect(chartLines.length).toBeGreaterThan(0);
  });

  test('should handle recommendation approval', async () => {
    const { page } = await setupBrowserTest('/dashboard/database-optimization');
    
    // Wait for recommendations to load
    await page.waitForSelector('[data-testid="recommendations"]');
    
    // Click apply button on first recommendation
    const applyButton = await page.$('[data-testid="apply-recommendation"]:first-child');
    if (applyButton) {
      await applyButton.click();
      
      // Verify success message or status update
      await page.waitForSelector('[data-testid="success-message"]');
    }
  });
});
```

### Performance Tests

```typescript
// Load Testing for Optimization Engine
describe('Database Optimization Performance', () => {
  test('should handle metrics collection under load', async () => {
    const startTime = Date.now();
    const promises = [];
    
    // Simulate 100 concurrent metrics collection requests
    for (let i = 0; i < 100; i++) {
      promises.push(
        fetch('/api/database-optimization/collect-metrics', { method: 'POST' })
      );
    }
    
    const responses = await Promise.all(promises);
    const endTime = Date.now();
    
    // All requests should succeed within reasonable time
    expect(responses.every(r => r.ok)).toBe(true);
    expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max
  });

  test('should optimize query analysis performance', async () => {
    const complexQuery = `
      SELECT w.*, v.name as venue_name, COUNT(g.id) as guest_count
      FROM weddings w
      LEFT JOIN venues v ON w.venue_id = v.id
      LEFT JOIN guests g ON w.id = g.wedding_id
      WHERE w.date BETWEEN $1 AND $2
      GROUP BY w.id, v.name
      ORDER BY w.date DESC
      LIMIT 50
    `;
    
    const startTime = Date.now();
    const analysis = await queryAnalysis.analyzeQuery(complexQuery);
    const endTime = Date.now();
    
    expect(analysis).toHaveProperty('optimizationScore');
    expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
  });
});
```

## Security Considerations

- **Access Control**: Only admin users can access optimization features
- **Query Safety**: All optimization actions are validated before execution
- **Audit Logging**: All optimization activities are logged for security review
- **Rate Limiting**: API endpoints are rate-limited to prevent abuse
- **SQL Injection Prevention**: All queries are parameterized and validated
- **Resource Limits**: Optimization actions have execution time limits
- **Rollback Capability**: All optimizations can be rolled back if needed

## Accessibility Features

- **WCAG 2.1 AA Compliance**: All dashboard components meet accessibility standards
- **Screen Reader Support**: Proper ARIA labels and semantic HTML structure
- **Keyboard Navigation**: Full keyboard navigation support for all interactive elements
- **High Contrast Mode**: Dashboard adapts to high contrast display preferences
- **Focus Management**: Clear visual focus indicators and logical tab order
- **Alternative Text**: Charts and graphs include text alternatives
- **Responsive Design**: Dashboard works on all screen sizes and orientations

This comprehensive Database Optimization Engine provides automated performance monitoring, intelligent optimization recommendations, and proactive issue resolution to ensure WedSync maintains optimal database performance as it scales to serve thousands of wedding suppliers and couples efficiently.