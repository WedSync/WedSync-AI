# WS-261: Load Testing Framework Technical Specification

## Feature Overview
**Feature ID**: WS-261  
**Feature Name**: Load Testing Framework  
**Category**: Infrastructure  
**Priority**: High  
**Complexity**: High  
**Estimated Effort**: 16 days  

### Purpose Statement
Implement comprehensive load testing framework that validates WedSync platform performance under realistic wedding season traffic patterns, identifies bottlenecks before they impact users, and ensures the platform can scale smoothly from hundreds to thousands of concurrent wedding suppliers and couples.

### User Story
As a WedSync platform engineer, I want an automated load testing framework that simulates realistic wedding coordination workflows and traffic patterns, so that I can identify performance bottlenecks, validate system capacity, and ensure our platform maintains excellent user experience during peak wedding seasons when thousands of couples and suppliers are actively planning weddings.

## Database Schema

### Core Tables

```sql
-- Load Test Configurations
CREATE TABLE load_test_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    test_type load_test_type NOT NULL,
    scenario_config JSONB NOT NULL,
    load_pattern JSONB NOT NULL,
    duration_minutes INTEGER NOT NULL,
    max_virtual_users INTEGER NOT NULL,
    ramp_up_duration_minutes INTEGER DEFAULT 5,
    ramp_down_duration_minutes INTEGER DEFAULT 2,
    target_endpoints TEXT[] NOT NULL DEFAULT '{}',
    success_criteria JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Load Test Executions
CREATE TABLE load_test_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    configuration_id UUID REFERENCES load_test_configurations(id) ON DELETE CASCADE,
    execution_name VARCHAR(200) NOT NULL,
    status execution_status DEFAULT 'scheduled',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    avg_response_time DECIMAL(10,3),
    min_response_time DECIMAL(10,3),
    max_response_time DECIMAL(10,3),
    p95_response_time DECIMAL(10,3),
    p99_response_time DECIMAL(10,3),
    throughput_rps DECIMAL(10,3),
    error_rate DECIMAL(5,2),
    peak_memory_usage BIGINT,
    peak_cpu_usage DECIMAL(5,2),
    concurrent_users_peak INTEGER,
    success_criteria_met BOOLEAN,
    summary JSONB,
    error_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Metrics Time Series
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES load_test_executions(id) ON DELETE CASCADE,
    timestamp_offset INTEGER NOT NULL, -- Seconds from test start
    virtual_users INTEGER NOT NULL,
    requests_per_second DECIMAL(10,3) NOT NULL,
    avg_response_time DECIMAL(10,3) NOT NULL,
    error_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    cpu_usage DECIMAL(5,2),
    memory_usage BIGINT,
    database_connections INTEGER,
    queue_length INTEGER,
    cache_hit_ratio DECIMAL(5,2),
    collected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Endpoint Performance Details
CREATE TABLE endpoint_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES load_test_executions(id) ON DELETE CASCADE,
    endpoint_path VARCHAR(500) NOT NULL,
    http_method http_method_type NOT NULL,
    total_requests INTEGER NOT NULL DEFAULT 0,
    successful_requests INTEGER NOT NULL DEFAULT 0,
    failed_requests INTEGER NOT NULL DEFAULT 0,
    avg_response_time DECIMAL(10,3) NOT NULL,
    min_response_time DECIMAL(10,3) NOT NULL,
    max_response_time DECIMAL(10,3) NOT NULL,
    p50_response_time DECIMAL(10,3),
    p95_response_time DECIMAL(10,3),
    p99_response_time DECIMAL(10,3),
    error_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    throughput_rps DECIMAL(10,3) NOT NULL,
    status_code_distribution JSONB,
    error_types JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Load Test Scenarios
CREATE TABLE load_test_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    scenario_type scenario_type_enum NOT NULL,
    user_journey JSONB NOT NULL,
    data_templates JSONB NOT NULL DEFAULT '{}',
    weight INTEGER DEFAULT 1 CHECK (weight >= 1 AND weight <= 100),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Benchmarks
CREATE TABLE performance_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    benchmark_name VARCHAR(200) NOT NULL,
    endpoint_path VARCHAR(500),
    http_method http_method_type,
    target_response_time DECIMAL(10,3) NOT NULL,
    target_throughput DECIMAL(10,3),
    max_error_rate DECIMAL(5,2) DEFAULT 1.0,
    benchmark_type benchmark_type_enum NOT NULL,
    environment VARCHAR(50) NOT NULL DEFAULT 'production',
    is_active BOOLEAN DEFAULT true,
    last_validated_at TIMESTAMPTZ,
    validation_status benchmark_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(benchmark_name, environment)
);

-- Load Test Reports
CREATE TABLE load_test_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES load_test_executions(id) ON DELETE CASCADE,
    report_type report_type_enum NOT NULL DEFAULT 'summary',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    report_data JSONB NOT NULL,
    insights JSONB,
    recommendations JSONB,
    performance_grade performance_grade_enum,
    bottlenecks_identified TEXT[],
    next_steps TEXT[],
    report_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Load Test Alerts
CREATE TABLE load_test_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES load_test_executions(id) ON DELETE CASCADE,
    alert_type alert_type_enum NOT NULL,
    severity alert_severity NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    threshold_value DECIMAL(10,3) NOT NULL,
    actual_value DECIMAL(10,3) NOT NULL,
    message TEXT NOT NULL,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    status alert_status_enum DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enums and Custom Types

```sql
-- Custom types for load testing framework
CREATE TYPE load_test_type AS ENUM ('spike', 'load', 'stress', 'volume', 'endurance', 'smoke');
CREATE TYPE execution_status AS ENUM ('scheduled', 'running', 'completed', 'failed', 'cancelled', 'paused');
CREATE TYPE http_method_type AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD');
CREATE TYPE scenario_type_enum AS ENUM ('wedding_planning', 'supplier_management', 'guest_coordination', 'payment_processing', 'communication', 'reporting');
CREATE TYPE benchmark_type_enum AS ENUM ('response_time', 'throughput', 'concurrent_users', 'resource_usage');
CREATE TYPE benchmark_status AS ENUM ('pending', 'passed', 'failed', 'warning');
CREATE TYPE report_type_enum AS ENUM ('summary', 'detailed', 'trend_analysis', 'comparison');
CREATE TYPE performance_grade_enum AS ENUM ('A', 'B', 'C', 'D', 'F');
CREATE TYPE alert_type_enum AS ENUM ('threshold_exceeded', 'performance_degradation', 'error_spike', 'resource_exhaustion');
CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE alert_status_enum AS ENUM ('active', 'acknowledged', 'resolved', 'suppressed');
```

### Indexes for Performance

```sql
-- Load test execution indexes
CREATE INDEX idx_load_test_executions_status ON load_test_executions(status);
CREATE INDEX idx_load_test_executions_started_at ON load_test_executions(started_at DESC);
CREATE INDEX idx_load_test_executions_config_id ON load_test_executions(configuration_id);

-- Performance metrics indexes
CREATE INDEX idx_performance_metrics_execution_id ON performance_metrics(execution_id);
CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(execution_id, timestamp_offset);

-- Endpoint performance indexes
CREATE INDEX idx_endpoint_performance_execution_id ON endpoint_performance(execution_id);
CREATE INDEX idx_endpoint_performance_endpoint ON endpoint_performance(endpoint_path);
CREATE INDEX idx_endpoint_performance_response_time ON endpoint_performance(avg_response_time DESC);

-- Load test scenarios indexes
CREATE INDEX idx_load_test_scenarios_type ON load_test_scenarios(scenario_type);
CREATE INDEX idx_load_test_scenarios_active ON load_test_scenarios(is_active) WHERE is_active = true;

-- Performance benchmarks indexes
CREATE INDEX idx_performance_benchmarks_endpoint ON performance_benchmarks(endpoint_path);
CREATE INDEX idx_performance_benchmarks_status ON performance_benchmarks(validation_status);
CREATE INDEX idx_performance_benchmarks_environment ON performance_benchmarks(environment);

-- Load test alerts indexes
CREATE INDEX idx_load_test_alerts_execution_id ON load_test_alerts(execution_id);
CREATE INDEX idx_load_test_alerts_status ON load_test_alerts(status);
CREATE INDEX idx_load_test_alerts_severity ON load_test_alerts(severity);
```

## API Endpoints

### Load Test Configuration Management

```typescript
// GET /api/load-testing/configurations
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const testType = searchParams.get('testType');
  const active = searchParams.get('active') !== 'false';

  try {
    let query = supabase
      .from('load_test_configurations')
      .select('*')
      .eq('is_active', active)
      .order('created_at', { ascending: false });

    if (testType) {
      query = query.eq('test_type', testType);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      configurations: data,
      summary: LoadTestService.summarizeConfigurations(data)
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch load test configurations' 
    }, { status: 500 });
  }
}

// POST /api/load-testing/configurations
export async function POST(request: Request) {
  const configuration = await request.json();

  try {
    // Validate configuration
    const validatedConfig = await LoadTestService.validateConfiguration(configuration);
    
    const { data, error } = await supabase
      .from('load_test_configurations')
      .insert([{
        ...validatedConfig,
        created_by: request.user?.id
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, configuration: data });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create load test configuration' 
    }, { status: 500 });
  }
}
```

### Load Test Execution

```typescript
// POST /api/load-testing/execute
export async function POST(request: Request) {
  const { configurationId, executionName } = await request.json();

  try {
    // Get configuration
    const { data: config, error: configError } = await supabase
      .from('load_test_configurations')
      .select('*')
      .eq('id', configurationId)
      .single();

    if (configError || !config) {
      return NextResponse.json({ 
        success: false, 
        error: 'Configuration not found' 
      }, { status: 404 });
    }

    // Create execution record
    const execution = await LoadTestService.createExecution(config, executionName);
    
    // Start load test in background
    LoadTestRunner.startTest(execution.id, config);

    return NextResponse.json({ 
      success: true, 
      execution: execution,
      message: 'Load test started successfully' 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to start load test' 
    }, { status: 500 });
  }
}

// GET /api/load-testing/executions/{executionId}/status
export async function GET(request: Request, { params }: { params: { executionId: string } }) {
  try {
    const { data: execution, error } = await supabase
      .from('load_test_executions')
      .select('*')
      .eq('id', params.executionId)
      .single();

    if (error || !execution) {
      return NextResponse.json({ 
        success: false, 
        error: 'Execution not found' 
      }, { status: 404 });
    }

    // Get real-time metrics if test is running
    let currentMetrics = null;
    if (execution.status === 'running') {
      currentMetrics = await LoadTestService.getCurrentMetrics(params.executionId);
    }

    return NextResponse.json({
      success: true,
      execution,
      currentMetrics,
      progress: LoadTestService.calculateProgress(execution)
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch execution status' 
    }, { status: 500 });
  }
}

// POST /api/load-testing/executions/{executionId}/stop
export async function POST(request: Request, { params }: { params: { executionId: string } }) {
  try {
    const stopped = await LoadTestRunner.stopTest(params.executionId);
    
    if (!stopped) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to stop load test' 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Load test stopped successfully' 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to stop load test' 
    }, { status: 500 });
  }
}
```

### Performance Analytics

```typescript
// GET /api/load-testing/executions/{executionId}/metrics
export async function GET(request: Request, { params }: { params: { executionId: string } }) {
  const { searchParams } = new URL(request.url);
  const granularity = searchParams.get('granularity') || 'minute';

  try {
    const { data: metrics, error } = await supabase
      .from('performance_metrics')
      .select('*')
      .eq('execution_id', params.executionId)
      .order('timestamp_offset');

    if (error) throw error;

    const aggregatedMetrics = LoadTestAnalytics.aggregateMetrics(metrics, granularity);
    const insights = await LoadTestAnalytics.generateInsights(metrics);

    return NextResponse.json({
      success: true,
      metrics: aggregatedMetrics,
      insights,
      summary: LoadTestAnalytics.calculateSummary(metrics)
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch performance metrics' 
    }, { status: 500 });
  }
}

// GET /api/load-testing/executions/{executionId}/endpoints
export async function GET(request: Request, { params }: { params: { executionId: string } }) {
  try {
    const { data: endpoints, error } = await supabase
      .from('endpoint_performance')
      .select('*')
      .eq('execution_id', params.executionId)
      .order('avg_response_time', { ascending: false });

    if (error) throw error;

    const analysis = LoadTestAnalytics.analyzeEndpointPerformance(endpoints);

    return NextResponse.json({
      success: true,
      endpoints,
      analysis,
      slowestEndpoints: endpoints.slice(0, 10),
      errorProneEndpoints: endpoints.filter(e => e.error_rate > 1)
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch endpoint performance' 
    }, { status: 500 });
  }
}
```

### Benchmarks and Comparisons

```typescript
// GET /api/load-testing/benchmarks
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const environment = searchParams.get('environment') || 'production';
  const benchmarkType = searchParams.get('benchmarkType');

  try {
    let query = supabase
      .from('performance_benchmarks')
      .select('*')
      .eq('environment', environment)
      .eq('is_active', true)
      .order('benchmark_name');

    if (benchmarkType) {
      query = query.eq('benchmark_type', benchmarkType);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      benchmarks: data,
      summary: BenchmarkService.summarizeBenchmarks(data)
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch benchmarks' 
    }, { status: 500 });
  }
}

// POST /api/load-testing/benchmarks/validate
export async function POST(request: Request) {
  const { executionId, benchmarkIds } = await request.json();

  try {
    const validation = await BenchmarkService.validateAgainstBenchmarks(
      executionId, 
      benchmarkIds
    );

    return NextResponse.json({
      success: true,
      validation,
      passed: validation.every(v => v.status === 'passed'),
      summary: BenchmarkService.summarizeValidation(validation)
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to validate benchmarks' 
    }, { status: 500 });
  }
}

// GET /api/load-testing/compare
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const executionIds = searchParams.get('executionIds')?.split(',') || [];

  if (executionIds.length < 2) {
    return NextResponse.json({ 
      success: false, 
      error: 'At least 2 executions required for comparison' 
    }, { status: 400 });
  }

  try {
    const comparison = await LoadTestComparison.compareExecutions(executionIds);
    
    return NextResponse.json({
      success: true,
      comparison,
      insights: LoadTestComparison.generateComparisonInsights(comparison)
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to compare executions' 
    }, { status: 500 });
  }
}
```

## React Components

### Load Testing Dashboard

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Play, 
  Pause, 
  Square, 
  Activity, 
  Clock, 
  Users, 
  AlertTriangle, 
  TrendingUp,
  Target,
  Settings,
  BarChart3
} from 'lucide-react';

interface LoadTestConfiguration {
  id: string;
  name: string;
  test_type: string;
  max_virtual_users: number;
  duration_minutes: number;
  description: string;
}

interface LoadTestExecution {
  id: string;
  execution_name: string;
  status: string;
  started_at: string;
  duration_seconds: number;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time: number;
  throughput_rps: number;
  error_rate: number;
  concurrent_users_peak: number;
  success_criteria_met: boolean;
}

interface PerformanceMetrics {
  timestamp_offset: number;
  virtual_users: number;
  requests_per_second: number;
  avg_response_time: number;
  error_rate: number;
  cpu_usage: number;
  memory_usage: number;
}

const LoadTestingDashboard: React.FC = () => {
  const [configurations, setConfigurations] = useState<LoadTestConfiguration[]>([]);
  const [executions, setExecutions] = useState<LoadTestExecution[]>([]);
  const [currentExecution, setCurrentExecution] = useState<LoadTestExecution | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const [testRunning, setTestRunning] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time updates for running tests
    const interval = setInterval(() => {
      if (testRunning && currentExecution) {
        updateExecutionStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [testRunning, currentExecution]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [configsRes, executionsRes] = await Promise.all([
        fetch('/api/load-testing/configurations'),
        fetch('/api/load-testing/executions?limit=10')
      ]);

      const configsData = await configsRes.json();
      const executionsData = await executionsRes.json();

      setConfigurations(configsData.configurations || []);
      setExecutions(executionsData.executions || []);
      
      // Check for running tests
      const runningTest = executionsData.executions?.find(e => e.status === 'running');
      if (runningTest) {
        setCurrentExecution(runningTest);
        setTestRunning(true);
        loadPerformanceMetrics(runningTest.id);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateExecutionStatus = async () => {
    if (!currentExecution) return;

    try {
      const response = await fetch(`/api/load-testing/executions/${currentExecution.id}/status`);
      const data = await response.json();
      
      if (data.success) {
        setCurrentExecution(data.execution);
        if (data.execution.status !== 'running') {
          setTestRunning(false);
        }
        
        if (data.currentMetrics) {
          setPerformanceMetrics(prev => [...prev, data.currentMetrics]);
        }
      }
    } catch (error) {
      console.error('Failed to update execution status:', error);
    }
  };

  const loadPerformanceMetrics = async (executionId: string) => {
    try {
      const response = await fetch(`/api/load-testing/executions/${executionId}/metrics`);
      const data = await response.json();
      
      if (data.success) {
        setPerformanceMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
    }
  };

  const startLoadTest = async () => {
    if (!selectedConfig) return;

    try {
      const response = await fetch('/api/load-testing/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configurationId: selectedConfig,
          executionName: `Test ${new Date().toLocaleString()}`
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setCurrentExecution(data.execution);
        setTestRunning(true);
        setPerformanceMetrics([]);
        await loadDashboardData();
      }
    } catch (error) {
      console.error('Failed to start load test:', error);
    }
  };

  const stopLoadTest = async () => {
    if (!currentExecution) return;

    try {
      const response = await fetch(`/api/load-testing/executions/${currentExecution.id}/stop`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.success) {
        setTestRunning(false);
        await loadDashboardData();
      }
    } catch (error) {
      console.error('Failed to stop load test:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-yellow-500';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'running': return 'default';
      case 'completed': return 'default';
      case 'failed': return 'destructive';
      case 'cancelled': return 'secondary';
      default: return 'outline';
    }
  };

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
          <h1 className="text-3xl font-bold">Load Testing Framework</h1>
          <p className="text-gray-600">Performance testing and capacity validation</p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedConfig} onValueChange={setSelectedConfig}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select test configuration" />
            </SelectTrigger>
            <SelectContent>
              {configurations.map((config) => (
                <SelectItem key={config.id} value={config.id}>
                  {config.name} ({config.test_type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {testRunning ? (
            <Button onClick={stopLoadTest} variant="destructive">
              <Square className="h-4 w-4 mr-2" />
              Stop Test
            </Button>
          ) : (
            <Button onClick={startLoadTest} disabled={!selectedConfig}>
              <Play className="h-4 w-4 mr-2" />
              Start Test
            </Button>
          )}
        </div>
      </div>

      {/* Current Test Status */}
      {currentExecution && (
        <Alert className={testRunning ? "border-blue-500 bg-blue-50" : ""}>
          <Activity className="h-4 w-4" />
          <AlertDescription>
            <div className="flex justify-between items-center">
              <div>
                <strong>{currentExecution.execution_name}</strong>
                <span className="ml-2">
                  <Badge variant={getStatusBadgeVariant(currentExecution.status)}>
                    {currentExecution.status}
                  </Badge>
                </span>
              </div>
              {testRunning && (
                <div className="text-sm text-gray-600">
                  Duration: {Math.floor((currentExecution.duration_seconds || 0) / 60)}m {(currentExecution.duration_seconds || 0) % 60}s
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Cards */}
      {currentExecution && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold">{currentExecution.total_requests.toLocaleString()}</p>
                </div>
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-green-600">{currentExecution.successful_requests.toLocaleString()} success</span>
                <span className="text-red-600 ml-2">{currentExecution.failed_requests.toLocaleString()} failed</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                  <p className="text-2xl font-bold">{currentExecution.avg_response_time?.toFixed(0)}ms</p>
                </div>
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div className="mt-2">
                <Progress 
                  value={Math.min((currentExecution.avg_response_time / 1000) * 100, 100)} 
                  className="h-2" 
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Throughput</p>
                  <p className="text-2xl font-bold">{currentExecution.throughput_rps?.toFixed(1)} RPS</p>
                </div>
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="mt-2">
                <Progress 
                  value={Math.min((currentExecution.throughput_rps / 100) * 100, 100)} 
                  className="h-2" 
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Error Rate</p>
                  <p className="text-2xl font-bold">{currentExecution.error_rate?.toFixed(2)}%</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  (currentExecution.error_rate || 0) > 5 ? 'bg-red-500' : 
                  (currentExecution.error_rate || 0) > 1 ? 'bg-yellow-500' : 'bg-green-500'
                }`}></div>
              </div>
              <div className="mt-2">
                <Progress 
                  value={Math.min((currentExecution.error_rate || 0) * 10, 100)} 
                  className="h-2" 
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Charts */}
      {performanceMetrics.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Response Time & Throughput
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp_offset" 
                    tickFormatter={(value) => `${Math.floor(value / 60)}m`}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="avg_response_time" 
                    stroke="#8884d8" 
                    name="Response Time (ms)"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="requests_per_second" 
                    stroke="#82ca9d" 
                    name="Throughput (RPS)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Virtual Users & Error Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp_offset" 
                    tickFormatter={(value) => `${Math.floor(value / 60)}m`}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="virtual_users" 
                    stroke="#ffc658" 
                    name="Virtual Users"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="error_rate" 
                    stroke="#ff7300" 
                    name="Error Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Test Executions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Recent Test Executions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {executions.map((execution) => (
              <div key={execution.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{execution.execution_name}</h3>
                      <Badge variant={getStatusBadgeVariant(execution.status)}>
                        {execution.status}
                      </Badge>
                      {execution.success_criteria_met !== null && (
                        <Badge variant={execution.success_criteria_met ? "default" : "destructive"}>
                          {execution.success_criteria_met ? "Passed" : "Failed"}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Duration</p>
                        <p className="font-semibold">
                          {Math.floor((execution.duration_seconds || 0) / 60)}m {(execution.duration_seconds || 0) % 60}s
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Requests</p>
                        <p className="font-semibold">{execution.total_requests?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Avg Response</p>
                        <p className="font-semibold">{execution.avg_response_time?.toFixed(0)}ms</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Error Rate</p>
                        <p className="font-semibold">{execution.error_rate?.toFixed(2)}%</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(`/dashboard/load-testing/executions/${execution.id}`, '_blank')}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {executions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Target className="h-12 w-12 mx-auto mb-4" />
                <p>No load tests executed yet</p>
                <p className="text-sm">Select a configuration and start your first test</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoadTestingDashboard;
```

## Core Implementation

### Load Test Service

```typescript
export class LoadTestService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  async validateConfiguration(config: any) {
    // Validate test configuration
    const validated = {
      name: config.name || 'Unnamed Test',
      description: config.description || '',
      test_type: this.validateTestType(config.test_type),
      scenario_config: this.validateScenarioConfig(config.scenario_config),
      load_pattern: this.validateLoadPattern(config.load_pattern),
      duration_minutes: Math.max(1, Math.min(config.duration_minutes || 10, 120)),
      max_virtual_users: Math.max(1, Math.min(config.max_virtual_users || 100, 1000)),
      ramp_up_duration_minutes: Math.max(1, config.ramp_up_duration_minutes || 5),
      ramp_down_duration_minutes: Math.max(1, config.ramp_down_duration_minutes || 2),
      target_endpoints: config.target_endpoints || [],
      success_criteria: this.validateSuccessCriteria(config.success_criteria)
    };

    return validated;
  }

  private validateTestType(testType: string): string {
    const validTypes = ['spike', 'load', 'stress', 'volume', 'endurance', 'smoke'];
    return validTypes.includes(testType) ? testType : 'load';
  }

  private validateScenarioConfig(config: any): any {
    return {
      scenarios: config.scenarios || [],
      weights: config.weights || {},
      data_generation: config.data_generation || {},
      think_time: Math.max(0, Math.min(config.think_time || 1, 10))
    };
  }

  private validateLoadPattern(pattern: any): any {
    return {
      type: pattern.type || 'linear',
      stages: pattern.stages || [],
      peak_duration_minutes: Math.max(1, pattern.peak_duration_minutes || 5),
      base_load_percentage: Math.max(10, Math.min(pattern.base_load_percentage || 20, 100))
    };
  }

  private validateSuccessCriteria(criteria: any): any {
    return {
      max_avg_response_time: criteria.max_avg_response_time || 1000,
      max_error_rate: Math.max(0, Math.min(criteria.max_error_rate || 5, 50)),
      min_throughput: criteria.min_throughput || 0,
      max_p95_response_time: criteria.max_p95_response_time || 2000
    };
  }

  async createExecution(config: any, executionName: string) {
    const execution = {
      configuration_id: config.id,
      execution_name: executionName,
      status: 'scheduled',
      total_requests: 0,
      successful_requests: 0,
      failed_requests: 0
    };

    const { data, error } = await this.supabase
      .from('load_test_executions')
      .insert([execution])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCurrentMetrics(executionId: string) {
    try {
      // Get latest metrics for the execution
      const { data: metrics, error } = await this.supabase
        .from('performance_metrics')
        .select('*')
        .eq('execution_id', executionId)
        .order('timestamp_offset', { ascending: false })
        .limit(1)
        .single();

      if (error) return null;
      return metrics;
    } catch (error) {
      return null;
    }
  }

  calculateProgress(execution: any) {
    if (!execution.started_at) return 0;
    
    const startTime = new Date(execution.started_at).getTime();
    const now = Date.now();
    const elapsed = (now - startTime) / 1000; // seconds
    const durationSeconds = execution.duration_minutes * 60;
    
    return Math.min(100, (elapsed / durationSeconds) * 100);
  }

  summarizeConfigurations(configurations: any[]) {
    return {
      total: configurations.length,
      byType: configurations.reduce((acc, config) => {
        acc[config.test_type] = (acc[config.test_type] || 0) + 1;
        return acc;
      }, {}),
      activeCount: configurations.filter(c => c.is_active).length
    };
  }
}

export const loadTestService = new LoadTestService();
```

### Load Test Runner

```typescript
import k6 from 'k6';
import { check } from 'k6';
import http from 'k6/http';

export class LoadTestRunner {
  private static runningTests = new Map<string, any>();

  static async startTest(executionId: string, config: any) {
    try {
      // Mark execution as running
      await supabase
        .from('load_test_executions')
        .update({ 
          status: 'running', 
          started_at: new Date().toISOString() 
        })
        .eq('id', executionId);

      // Generate k6 script
      const k6Script = this.generateK6Script(executionId, config);
      
      // Start k6 test process
      const testProcess = this.runK6Test(k6Script, executionId);
      
      this.runningTests.set(executionId, testProcess);
      
      // Monitor test progress
      this.monitorTestProgress(executionId, config);
      
      return true;
    } catch (error) {
      console.error('Failed to start load test:', error);
      
      // Mark execution as failed
      await supabase
        .from('load_test_executions')
        .update({ status: 'failed' })
        .eq('id', executionId);
      
      return false;
    }
  }

  static async stopTest(executionId: string): Promise<boolean> {
    const testProcess = this.runningTests.get(executionId);
    
    if (testProcess) {
      try {
        testProcess.kill('SIGTERM');
        this.runningTests.delete(executionId);
        
        // Mark execution as cancelled
        await supabase
          .from('load_test_executions')
          .update({ 
            status: 'cancelled',
            completed_at: new Date().toISOString()
          })
          .eq('id', executionId);
        
        return true;
      } catch (error) {
        console.error('Failed to stop load test:', error);
        return false;
      }
    }
    
    return false;
  }

  private static generateK6Script(executionId: string, config: any): string {
    const scenarios = this.buildScenarios(config.scenario_config);
    const loadPattern = this.buildLoadPattern(config.load_pattern, config.max_virtual_users);
    
    return `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export let options = {
  scenarios: ${JSON.stringify(loadPattern, null, 2)},
  thresholds: {
    'http_req_duration': ['p(95)<${config.success_criteria.max_p95_response_time}'],
    'http_req_failed': ['rate<${config.success_criteria.max_error_rate / 100}'],
    'errors': ['rate<${config.success_criteria.max_error_rate / 100}']
  }
};

const BASE_URL = '${process.env.NEXT_PUBLIC_APP_URL}';

${scenarios}

export default function() {
  const scenario = selectScenario();
  const result = executeScenario(scenario);
  
  // Record metrics
  recordMetrics('${executionId}', result);
  
  // Think time between requests
  sleep(${config.scenario_config.think_time || 1});
}

function selectScenario() {
  const scenarios = [
    ${config.scenario_config.scenarios.map(s => `'${s.name}'`).join(', ')}
  ];
  return scenarios[Math.floor(Math.random() * scenarios.length)];
}

function executeScenario(scenarioName) {
  switch(scenarioName) {
    ${config.scenario_config.scenarios.map(s => this.generateScenarioFunction(s)).join('\n')}
    default:
      return executeWeddingPlanningScenario();
  }
}

function recordMetrics(executionId, result) {
  // Send metrics to WedSync backend
  const metricsData = {
    execution_id: executionId,
    timestamp_offset: Math.floor((Date.now() - __ENV.TEST_START_TIME) / 1000),
    virtual_users: __VU,
    requests_per_second: result.requests_per_second || 0,
    avg_response_time: result.avg_response_time || 0,
    error_rate: result.error_rate || 0,
    cpu_usage: result.cpu_usage || 0,
    memory_usage: result.memory_usage || 0
  };
  
  const metricsResponse = http.post(BASE_URL + '/api/load-testing/metrics', JSON.stringify(metricsData), {
    headers: { 'Content-Type': 'application/json' }
  });
}

${this.generateBasicScenarios()}
`;
  }

  private static buildLoadPattern(pattern: any, maxUsers: number): any {
    const scenarios = {};
    
    switch (pattern.type) {
      case 'linear':
        scenarios['main_load'] = {
          executor: 'ramping-vus',
          startVUs: 1,
          stages: [
            { duration: '2m', target: Math.floor(maxUsers * 0.1) },
            { duration: '5m', target: Math.floor(maxUsers * 0.5) },
            { duration: '10m', target: maxUsers },
            { duration: '5m', target: Math.floor(maxUsers * 0.5) },
            { duration: '2m', target: 0 }
          ]
        };
        break;
        
      case 'spike':
        scenarios['spike_load'] = {
          executor: 'ramping-vus',
          startVUs: 1,
          stages: [
            { duration: '1m', target: Math.floor(maxUsers * 0.1) },
            { duration: '30s', target: maxUsers },
            { duration: '5m', target: maxUsers },
            { duration: '30s', target: Math.floor(maxUsers * 0.1) },
            { duration: '1m', target: 0 }
          ]
        };
        break;
        
      default:
        scenarios['constant_load'] = {
          executor: 'constant-vus',
          vus: maxUsers,
          duration: '10m'
        };
    }
    
    return scenarios;
  }

  private static generateScenarioFunction(scenario: any): string {
    return `
    case '${scenario.name}':
      return execute${scenario.name.replace(/[^a-zA-Z0-9]/g, '')}Scenario();`;
  }

  private static generateBasicScenarios(): string {
    return `
function executeWeddingPlanningScenario() {
  // Simulate wedding planning workflow
  const results = { requests_per_second: 0, avg_response_time: 0, error_rate: 0 };
  
  // Login
  const loginRes = http.post(BASE_URL + '/api/auth/signin', {
    email: 'test@example.com',
    password: 'testpass'
  });
  
  results.requests_per_second += 1;
  results.avg_response_time += loginRes.timings.duration;
  
  check(loginRes, {
    'login successful': (r) => r.status === 200
  }) || (results.error_rate += 1);
  
  if (loginRes.status === 200) {
    // Get wedding data
    const weddingRes = http.get(BASE_URL + '/api/weddings');
    results.requests_per_second += 1;
    results.avg_response_time += weddingRes.timings.duration;
    
    check(weddingRes, {
      'wedding data retrieved': (r) => r.status === 200
    }) || (results.error_rate += 1);
    
    // Update wedding details
    const updateRes = http.put(BASE_URL + '/api/weddings/1', {
      name: 'Test Wedding ' + Math.random(),
      date: '2024-12-01',
      venue: 'Test Venue'
    });
    
    results.requests_per_second += 1;
    results.avg_response_time += updateRes.timings.duration;
    
    check(updateRes, {
      'wedding updated': (r) => r.status === 200
    }) || (results.error_rate += 1);
  }
  
  results.avg_response_time = results.avg_response_time / results.requests_per_second;
  results.error_rate = (results.error_rate / results.requests_per_second) * 100;
  
  return results;
}

function executeSupplierManagementScenario() {
  // Simulate supplier management workflow
  const results = { requests_per_second: 0, avg_response_time: 0, error_rate: 0 };
  
  // Get suppliers list
  const suppliersRes = http.get(BASE_URL + '/api/suppliers');
  results.requests_per_second += 1;
  results.avg_response_time += suppliersRes.timings.duration;
  
  check(suppliersRes, {
    'suppliers retrieved': (r) => r.status === 200
  }) || (results.error_rate += 1);
  
  // Search suppliers
  const searchRes = http.get(BASE_URL + '/api/suppliers/search?q=photographer');
  results.requests_per_second += 1;
  results.avg_response_time += searchRes.timings.duration;
  
  check(searchRes, {
    'supplier search successful': (r) => r.status === 200
  }) || (results.error_rate += 1);
  
  results.avg_response_time = results.avg_response_time / results.requests_per_second;
  results.error_rate = (results.error_rate / results.requests_per_second) * 100;
  
  return results;
}
`;
  }

  private static runK6Test(script: string, executionId: string): any {
    const { spawn } = require('child_process');
    
    // Write script to temporary file
    const fs = require('fs');
    const path = require('path');
    const tempFile = path.join('/tmp', `k6-test-${executionId}.js`);
    
    fs.writeFileSync(tempFile, script);
    
    // Run k6 test
    const k6Process = spawn('k6', ['run', tempFile], {
      env: {
        ...process.env,
        TEST_START_TIME: Date.now().toString()
      }
    });
    
    k6Process.on('close', (code) => {
      this.handleTestCompletion(executionId, code);
      // Clean up temp file
      fs.unlinkSync(tempFile);
    });
    
    return k6Process;
  }

  private static async monitorTestProgress(executionId: string, config: any) {
    const monitorInterval = setInterval(async () => {
      try {
        const { data: execution } = await supabase
          .from('load_test_executions')
          .select('status')
          .eq('id', executionId)
          .single();
        
        if (!execution || execution.status !== 'running') {
          clearInterval(monitorInterval);
          return;
        }
        
        // Collect additional system metrics if needed
        await this.collectSystemMetrics(executionId);
        
      } catch (error) {
        console.error('Test monitoring error:', error);
      }
    }, 5000); // Every 5 seconds
    
    // Clean up after max duration
    setTimeout(() => {
      clearInterval(monitorInterval);
    }, (config.duration_minutes + 10) * 60 * 1000);
  }

  private static async collectSystemMetrics(executionId: string) {
    // Collect system-level metrics
    const os = require('os');
    
    const metrics = {
      cpu_usage: (1 - os.loadavg()[0] / os.cpus().length) * 100,
      memory_usage: (os.totalmem() - os.freemem()) / os.totalmem() * 100,
      // Additional metrics could be collected here
    };
    
    // Store metrics in database
    await supabase.from('performance_metrics').insert([{
      execution_id: executionId,
      timestamp_offset: Math.floor(Date.now() / 1000),
      cpu_usage: metrics.cpu_usage,
      memory_usage: metrics.memory_usage,
      virtual_users: 0, // Will be updated by k6 script
      requests_per_second: 0, // Will be updated by k6 script
      avg_response_time: 0, // Will be updated by k6 script
      error_rate: 0 // Will be updated by k6 script
    }]);
  }

  private static async handleTestCompletion(executionId: string, exitCode: number) {
    try {
      this.runningTests.delete(executionId);
      
      const status = exitCode === 0 ? 'completed' : 'failed';
      const completedAt = new Date().toISOString();
      
      // Calculate final metrics
      const finalMetrics = await this.calculateFinalMetrics(executionId);
      
      // Update execution record
      await supabase
        .from('load_test_executions')
        .update({
          status,
          completed_at: completedAt,
          ...finalMetrics
        })
        .eq('id', executionId);
      
      // Generate test report
      await LoadTestReports.generateReport(executionId);
      
    } catch (error) {
      console.error('Error handling test completion:', error);
    }
  }

  private static async calculateFinalMetrics(executionId: string) {
    try {
      const { data: metrics } = await supabase
        .from('performance_metrics')
        .select('*')
        .eq('execution_id', executionId);
      
      if (!metrics || metrics.length === 0) {
        return {
          total_requests: 0,
          successful_requests: 0,
          failed_requests: 0,
          avg_response_time: 0,
          throughput_rps: 0,
          error_rate: 0
        };
      }
      
      const totalRequests = metrics.reduce((sum, m) => sum + (m.requests_per_second * 5), 0); // 5-second intervals
      const avgResponseTime = metrics.reduce((sum, m) => sum + m.avg_response_time, 0) / metrics.length;
      const avgErrorRate = metrics.reduce((sum, m) => sum + m.error_rate, 0) / metrics.length;
      const avgThroughput = metrics.reduce((sum, m) => sum + m.requests_per_second, 0) / metrics.length;
      
      const successfulRequests = totalRequests * (1 - avgErrorRate / 100);
      const failedRequests = totalRequests - successfulRequests;
      
      return {
        total_requests: Math.round(totalRequests),
        successful_requests: Math.round(successfulRequests),
        failed_requests: Math.round(failedRequests),
        avg_response_time: Math.round(avgResponseTime * 100) / 100,
        throughput_rps: Math.round(avgThroughput * 100) / 100,
        error_rate: Math.round(avgErrorRate * 100) / 100
      };
    } catch (error) {
      console.error('Error calculating final metrics:', error);
      return {};
    }
  }
}
```

## MCP Server Usage

The Load Testing Framework will utilize these MCP servers:

### Playwright MCP
- **UI load testing**: Automate browser-based load testing scenarios
- **Visual validation**: Capture screenshots during load tests to verify UI integrity
- **User journey simulation**: Execute realistic user workflows during load tests
- **Performance monitoring**: Monitor client-side performance metrics during tests

### PostgreSQL MCP
- **Database performance testing**: Monitor database performance under load
- **Query analysis**: Identify slow queries during load tests
- **Connection monitoring**: Track database connection usage during high load
- **Data integrity verification**: Ensure data remains consistent under load

### Supabase MCP
- **Branch testing**: Test load scenarios on development branches safely
- **Real-time monitoring**: Monitor Supabase real-time performance under load
- **Edge function testing**: Test serverless function performance under load
- **Log analysis**: Analyze Supabase logs during and after load tests

### Filesystem MCP
- **Test result storage**: Store detailed load test results and reports
- **Configuration management**: Manage k6 test scripts and configurations
- **Log file management**: Handle test execution logs and artifacts
- **Report generation**: Create and store comprehensive test reports

## Navigation Integration

### Main Navigation Updates

The Load Testing Framework will be integrated into the WedSync navigation structure:

```typescript
// Add to admin navigation menu
{
  id: 'load-testing',
  label: 'Load Testing',
  icon: Activity,
  href: '/dashboard/load-testing',
  permission: 'admin',
  badge: hasRunningTests ? { text: 'Running', variant: 'default' } : undefined
}

// Add to performance submenu
{
  id: 'admin-performance',
  label: 'Performance',
  items: [
    {
      id: 'load-testing-dashboard',
      label: 'Load Testing',
      href: '/dashboard/load-testing',
      icon: Activity
    },
    {
      id: 'test-configurations',
      label: 'Test Configurations',
      href: '/dashboard/load-testing/configurations',
      icon: Settings
    },
    {
      id: 'test-results',
      label: 'Test Results',
      href: '/dashboard/load-testing/results',
      icon: BarChart3
    },
    {
      id: 'performance-benchmarks',
      label: 'Benchmarks',
      href: '/dashboard/load-testing/benchmarks',
      icon: Target
    }
  ]
}
```

### Breadcrumb Integration

```typescript
const breadcrumbMap = {
  '/dashboard/load-testing': [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Load Testing', href: '/dashboard/load-testing' }
  ],
  '/dashboard/load-testing/configurations': [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Load Testing', href: '/dashboard/load-testing' },
    { label: 'Configurations', href: '/dashboard/load-testing/configurations' }
  ],
  '/dashboard/load-testing/results': [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Load Testing', href: '/dashboard/load-testing' },
    { label: 'Results', href: '/dashboard/load-testing/results' }
  ]
}
```

### Quick Actions Integration

```typescript
// Add to global quick actions
{
  id: 'run-load-test',
  label: 'Run Load Test',
  icon: Play,
  href: '/dashboard/load-testing',
  shortcut: 'L',
  category: 'admin'
},
{
  id: 'view-test-results',
  label: 'View Test Results',
  icon: BarChart3,
  href: '/dashboard/load-testing/results',
  shortcut: 'R',
  category: 'admin'
}
```

## Testing Requirements

### Unit Tests

```typescript
// Load Test Service Tests
describe('LoadTestService', () => {
  test('should validate test configuration', async () => {
    const config = {
      name: 'Test Load Test',
      test_type: 'load',
      max_virtual_users: 100,
      duration_minutes: 10,
      scenario_config: { scenarios: [] },
      load_pattern: { type: 'linear' },
      success_criteria: { max_error_rate: 5 }
    };
    
    const validated = await loadTestService.validateConfiguration(config);
    expect(validated.name).toBe('Test Load Test');
    expect(validated.max_virtual_users).toBe(100);
  });

  test('should create execution record', async () => {
    const config = { id: 'test-config-id' };
    const execution = await loadTestService.createExecution(config, 'Test Execution');
    expect(execution).toHaveProperty('id');
    expect(execution.configuration_id).toBe('test-config-id');
  });
});

// Load Test Runner Tests
describe('LoadTestRunner', () => {
  test('should generate k6 script', () => {
    const config = {
      scenario_config: { scenarios: [], think_time: 1 },
      load_pattern: { type: 'linear' },
      max_virtual_users: 50,
      success_criteria: { max_error_rate: 5, max_p95_response_time: 2000 }
    };
    
    const script = LoadTestRunner.generateK6Script('test-id', config);
    expect(script).toContain('import http from \'k6/http\'');
    expect(script).toContain('export let options');
  });
});
```

### Integration Tests

```typescript
// API Endpoint Tests
describe('Load Testing API', () => {
  test('POST /api/load-testing/execute', async () => {
    const response = await fetch('/api/load-testing/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        configurationId: 'test-config-id',
        executionName: 'Integration Test'
      })
    });
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.execution).toHaveProperty('id');
  });

  test('GET /api/load-testing/executions/{id}/status', async () => {
    const response = await fetch('/api/load-testing/executions/test-id/status');
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.execution).toHaveProperty('status');
  });
});
```

### Browser Tests

```typescript
// Dashboard Component Tests
describe('LoadTestingDashboard', () => {
  test('should display test configurations', async () => {
    const { page } = await setupBrowserTest('/dashboard/load-testing');
    
    await page.waitForSelector('[data-testid="test-configurations"]');
    
    const configSelect = await page.$('select[data-testid="config-select"]');
    expect(configSelect).toBeTruthy();
  });

  test('should start load test', async () => {
    const { page } = await setupBrowserTest('/dashboard/load-testing');
    
    // Select configuration
    await page.selectOption('[data-testid="config-select"]', 'test-config-id');
    
    // Start test
    await page.click('[data-testid="start-test-button"]');
    
    // Verify test started
    await page.waitForSelector('[data-testid="test-running-alert"]');
  });

  test('should display real-time metrics', async () => {
    const { page } = await setupBrowserTest('/dashboard/load-testing');
    
    // Wait for metrics to load
    await page.waitForSelector('[data-testid="metrics-cards"]');
    
    // Verify metrics are displayed
    const responseTimeCard = await page.$('[data-testid="response-time-card"]');
    expect(responseTimeCard).toBeTruthy();
    
    const throughputCard = await page.$('[data-testid="throughput-card"]');
    expect(throughputCard).toBeTruthy();
  });
});
```

### Performance Tests

```typescript
// Load Test Framework Performance
describe('Load Test Framework Performance', () => {
  test('should handle multiple concurrent test configurations', async () => {
    const promises = [];
    
    for (let i = 0; i < 10; i++) {
      promises.push(
        fetch('/api/load-testing/configurations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Test Config ${i}`,
            test_type: 'smoke',
            max_virtual_users: 10,
            duration_minutes: 1
          })
        })
      );
    }
    
    const responses = await Promise.all(promises);
    expect(responses.every(r => r.ok)).toBe(true);
  });

  test('should efficiently store metrics during load tests', async () => {
    const startTime = Date.now();
    const promises = [];
    
    // Simulate storing 1000 metrics points
    for (let i = 0; i < 1000; i++) {
      promises.push(
        supabase.from('performance_metrics').insert([{
          execution_id: 'test-execution-id',
          timestamp_offset: i,
          virtual_users: Math.floor(Math.random() * 100),
          requests_per_second: Math.random() * 50,
          avg_response_time: Math.random() * 1000,
          error_rate: Math.random() * 5
        }])
      );
    }
    
    await Promise.all(promises);
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(30000); // 30 seconds max
  });
});
```

## Security Considerations

- **Access Control**: Only admin users can create and run load tests
- **Resource Limits**: Tests are limited in duration and virtual user count to prevent abuse
- **Environment Isolation**: Load tests run in isolated environments to prevent impact on production
- **API Rate Limiting**: Load testing endpoints are rate-limited to prevent system overload
- **Data Sanitization**: All test configurations are validated and sanitized before execution
- **Audit Logging**: All load testing activities are logged for security review
- **Test Isolation**: Each test execution is isolated to prevent interference between tests

## Accessibility Features

- **WCAG 2.1 AA Compliance**: All dashboard components meet accessibility standards
- **Screen Reader Support**: Proper ARIA labels and semantic HTML structure
- **Keyboard Navigation**: Full keyboard navigation support for all interactive elements
- **High Contrast Mode**: Dashboard adapts to high contrast display preferences
- **Focus Management**: Clear visual focus indicators and logical tab order
- **Alternative Text**: Charts and graphs include text alternatives for screen readers
- **Responsive Design**: Dashboard works effectively on all screen sizes and orientations

This comprehensive Load Testing Framework provides automated performance validation, realistic traffic simulation, and detailed performance analysis to ensure WedSync maintains excellent performance and reliability as it scales to serve thousands of wedding suppliers and couples during peak wedding seasons.