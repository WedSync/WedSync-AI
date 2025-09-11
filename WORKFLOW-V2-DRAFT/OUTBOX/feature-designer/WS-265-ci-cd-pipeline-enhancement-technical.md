# WS-265: CI/CD Pipeline Enhancement Technical Specification

## Feature Overview
**Feature ID**: WS-265  
**Feature Name**: CI/CD Pipeline Enhancement  
**Category**: Infrastructure  
**Priority**: High  
**Complexity**: High  
**Estimated Effort**: 18 days  

### Purpose Statement
Implement advanced CI/CD pipeline enhancements that provide automated testing, intelligent deployment strategies, comprehensive quality gates, and seamless integration workflows, ensuring WedSync platform maintains high code quality, rapid deployment cycles, and zero-downtime releases while scaling to serve thousands of wedding suppliers and couples.

### User Story
As a WedSync platform developer, I want an enhanced CI/CD pipeline that automatically tests, validates, and deploys code changes with intelligent quality gates, progressive deployment strategies, and comprehensive monitoring, so that our development team can ship features rapidly and safely while maintaining platform reliability for couples planning their weddings and suppliers managing their businesses.

## Database Schema

### Core Tables

```sql
-- Pipeline Configurations
CREATE TABLE pipeline_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_name VARCHAR(200) NOT NULL UNIQUE,
    pipeline_type pipeline_type_enum NOT NULL,
    repository_url VARCHAR(500) NOT NULL,
    branch_patterns TEXT[] DEFAULT '{"main", "develop", "feature/*", "hotfix/*"}',
    trigger_events TEXT[] DEFAULT '{"push", "pull_request", "schedule"}',
    build_configuration JSONB NOT NULL,
    test_configuration JSONB NOT NULL DEFAULT '{}',
    deployment_configuration JSONB NOT NULL DEFAULT '{}',
    quality_gates JSONB NOT NULL DEFAULT '{}',
    notification_config JSONB NOT NULL DEFAULT '{}',
    environment_promotions JSONB DEFAULT '{}',
    rollback_strategy JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline Executions
CREATE TABLE pipeline_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES pipeline_configurations(id) ON DELETE CASCADE,
    execution_number INTEGER NOT NULL,
    commit_sha VARCHAR(40) NOT NULL,
    commit_message TEXT,
    commit_author VARCHAR(200),
    branch_name VARCHAR(200) NOT NULL,
    trigger_event trigger_event_enum NOT NULL,
    trigger_user UUID REFERENCES auth.users(id),
    status execution_status DEFAULT 'queued',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    stages_total INTEGER DEFAULT 0,
    stages_completed INTEGER DEFAULT 0,
    stages_failed INTEGER DEFAULT 0,
    artifacts_generated INTEGER DEFAULT 0,
    test_results_summary JSONB DEFAULT '{}',
    quality_gate_results JSONB DEFAULT '{}',
    deployment_results JSONB DEFAULT '{}',
    error_details JSONB,
    execution_log JSONB DEFAULT '{}',
    resource_usage JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline Stages
CREATE TABLE pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES pipeline_executions(id) ON DELETE CASCADE,
    stage_name VARCHAR(200) NOT NULL,
    stage_type stage_type_enum NOT NULL,
    stage_order INTEGER NOT NULL,
    depends_on TEXT[] DEFAULT '{}',
    parallel_group VARCHAR(50),
    stage_config JSONB NOT NULL DEFAULT '{}',
    status stage_status DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 2,
    output_artifacts TEXT[] DEFAULT '{}',
    stage_logs JSONB DEFAULT '{}',
    metrics JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test Results
CREATE TABLE test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES pipeline_executions(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    test_suite VARCHAR(200) NOT NULL,
    test_type test_type_enum NOT NULL,
    total_tests INTEGER NOT NULL DEFAULT 0,
    passed_tests INTEGER NOT NULL DEFAULT 0,
    failed_tests INTEGER NOT NULL DEFAULT 0,
    skipped_tests INTEGER NOT NULL DEFAULT 0,
    test_duration_seconds INTEGER,
    coverage_percentage DECIMAL(5,2),
    coverage_details JSONB DEFAULT '{}',
    test_files TEXT[] DEFAULT '{}',
    failed_test_details JSONB DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}',
    flaky_tests TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality Gate Evaluations
CREATE TABLE quality_gate_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES pipeline_executions(id) ON DELETE CASCADE,
    gate_name VARCHAR(200) NOT NULL,
    gate_type gate_type_enum NOT NULL,
    threshold_config JSONB NOT NULL,
    actual_value DECIMAL(10,4),
    threshold_value DECIMAL(10,4),
    comparison_operator comparison_operator_enum NOT NULL,
    status gate_status DEFAULT 'pending',
    evaluated_at TIMESTAMPTZ,
    evaluation_details JSONB DEFAULT '{}',
    blocker BOOLEAN DEFAULT false,
    override_reason TEXT,
    overridden_by UUID REFERENCES auth.users(id),
    overridden_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deployment Environments
CREATE TABLE deployment_environments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment_name VARCHAR(100) NOT NULL UNIQUE,
    environment_type environment_type_enum NOT NULL,
    deployment_url VARCHAR(500),
    infrastructure_config JSONB NOT NULL DEFAULT '{}',
    environment_variables JSONB DEFAULT '{}',
    resource_limits JSONB DEFAULT '{}',
    monitoring_config JSONB DEFAULT '{}',
    approval_required BOOLEAN DEFAULT false,
    auto_promote_from TEXT[],
    rollback_enabled BOOLEAN DEFAULT true,
    health_check_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deployments
CREATE TABLE deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES pipeline_executions(id) ON DELETE CASCADE,
    environment_id UUID REFERENCES deployment_environments(id),
    deployment_strategy deployment_strategy_enum NOT NULL DEFAULT 'rolling',
    version VARCHAR(100) NOT NULL,
    artifact_url VARCHAR(500),
    status deployment_status DEFAULT 'initiated',
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    rollback_triggered BOOLEAN DEFAULT false,
    rollback_reason TEXT,
    rollback_completed_at TIMESTAMPTZ,
    health_check_passed BOOLEAN,
    smoke_tests_passed BOOLEAN,
    traffic_percentage INTEGER DEFAULT 100,
    previous_version VARCHAR(100),
    deployment_logs JSONB DEFAULT '{}',
    metrics JSONB DEFAULT '{}',
    deployed_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Build Artifacts
CREATE TABLE build_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES pipeline_executions(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    artifact_name VARCHAR(200) NOT NULL,
    artifact_type artifact_type_enum NOT NULL,
    artifact_path VARCHAR(500) NOT NULL,
    artifact_size_bytes BIGINT,
    artifact_checksum VARCHAR(128),
    storage_location VARCHAR(500),
    storage_provider VARCHAR(50) DEFAULT 'local',
    expiry_date TIMESTAMPTZ,
    download_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline Metrics
CREATE TABLE pipeline_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL,
    pipeline_id UUID REFERENCES pipeline_configurations(id),
    total_executions INTEGER DEFAULT 0,
    successful_executions INTEGER DEFAULT 0,
    failed_executions INTEGER DEFAULT 0,
    average_duration_minutes DECIMAL(10,2),
    median_duration_minutes DECIMAL(10,2),
    success_rate DECIMAL(5,2),
    total_deployments INTEGER DEFAULT 0,
    successful_deployments INTEGER DEFAULT 0,
    rollback_count INTEGER DEFAULT 0,
    mean_time_to_recovery_minutes DECIMAL(10,2),
    lead_time_minutes DECIMAL(10,2),
    deployment_frequency DECIMAL(5,2),
    change_failure_rate DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(metric_date, pipeline_id)
);

-- Pipeline Approvals
CREATE TABLE pipeline_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES pipeline_executions(id) ON DELETE CASCADE,
    environment_id UUID REFERENCES deployment_environments(id),
    approval_type approval_type_enum NOT NULL,
    status approval_status DEFAULT 'pending',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    requested_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    rejected_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    approval_notes TEXT,
    auto_approved BOOLEAN DEFAULT false,
    approval_criteria JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enums and Custom Types

```sql
-- Custom types for CI/CD pipeline enhancement
CREATE TYPE pipeline_type_enum AS ENUM ('build', 'test', 'deploy', 'full_cicd', 'release');
CREATE TYPE trigger_event_enum AS ENUM ('push', 'pull_request', 'schedule', 'manual', 'tag', 'webhook');
CREATE TYPE execution_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'timeout');
CREATE TYPE stage_type_enum AS ENUM ('build', 'test', 'security_scan', 'quality_check', 'deploy', 'notification', 'cleanup');
CREATE TYPE stage_status AS ENUM ('pending', 'running', 'succeeded', 'failed', 'cancelled', 'skipped');
CREATE TYPE test_type_enum AS ENUM ('unit', 'integration', 'e2e', 'performance', 'security', 'accessibility', 'visual');
CREATE TYPE gate_type_enum AS ENUM ('test_coverage', 'code_quality', 'security_scan', 'performance', 'accessibility', 'custom');
CREATE TYPE gate_status AS ENUM ('pending', 'passed', 'failed', 'overridden');
CREATE TYPE comparison_operator_enum AS ENUM ('>', '>=', '<', '<=', '=', '!=');
CREATE TYPE environment_type_enum AS ENUM ('development', 'staging', 'uat', 'production', 'preview', 'hotfix');
CREATE TYPE deployment_strategy_enum AS ENUM ('rolling', 'blue_green', 'canary', 'recreate', 'a_b_testing');
CREATE TYPE deployment_status AS ENUM ('initiated', 'deploying', 'deployed', 'failed', 'rolled_back', 'health_check_failed');
CREATE TYPE artifact_type_enum AS ENUM ('docker_image', 'npm_package', 'zip_archive', 'executable', 'static_files', 'test_report');
CREATE TYPE approval_type_enum AS ENUM ('manual', 'automated', 'conditional');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'expired', 'auto_approved');
```

### Indexes for Performance

```sql
-- Pipeline execution indexes
CREATE INDEX idx_pipeline_executions_pipeline_id ON pipeline_executions(pipeline_id);
CREATE INDEX idx_pipeline_executions_status ON pipeline_executions(status);
CREATE INDEX idx_pipeline_executions_started_at ON pipeline_executions(started_at DESC);
CREATE INDEX idx_pipeline_executions_branch ON pipeline_executions(branch_name);
CREATE INDEX idx_pipeline_executions_commit_sha ON pipeline_executions(commit_sha);

-- Pipeline stage indexes
CREATE INDEX idx_pipeline_stages_execution_id ON pipeline_stages(execution_id);
CREATE INDEX idx_pipeline_stages_status ON pipeline_stages(status);
CREATE INDEX idx_pipeline_stages_order ON pipeline_stages(execution_id, stage_order);

-- Test results indexes
CREATE INDEX idx_test_results_execution_id ON test_results(execution_id);
CREATE INDEX idx_test_results_test_type ON test_results(test_type);
CREATE INDEX idx_test_results_coverage ON test_results(coverage_percentage DESC NULLS LAST);

-- Quality gate evaluation indexes
CREATE INDEX idx_quality_gate_evaluations_execution_id ON quality_gate_evaluations(execution_id);
CREATE INDEX idx_quality_gate_evaluations_status ON quality_gate_evaluations(status);
CREATE INDEX idx_quality_gate_evaluations_gate_type ON quality_gate_evaluations(gate_type);

-- Deployment indexes
CREATE INDEX idx_deployments_execution_id ON deployments(execution_id);
CREATE INDEX idx_deployments_environment_id ON deployments(environment_id);
CREATE INDEX idx_deployments_status ON deployments(status);
CREATE INDEX idx_deployments_initiated_at ON deployments(initiated_at DESC);

-- Build artifact indexes
CREATE INDEX idx_build_artifacts_execution_id ON build_artifacts(execution_id);
CREATE INDEX idx_build_artifacts_type ON build_artifacts(artifact_type);
CREATE INDEX idx_build_artifacts_created_at ON build_artifacts(created_at DESC);

-- Pipeline metrics indexes
CREATE INDEX idx_pipeline_metrics_date ON pipeline_metrics(metric_date DESC);
CREATE INDEX idx_pipeline_metrics_pipeline_id ON pipeline_metrics(pipeline_id);

-- Pipeline approval indexes
CREATE INDEX idx_pipeline_approvals_execution_id ON pipeline_approvals(execution_id);
CREATE INDEX idx_pipeline_approvals_status ON pipeline_approvals(status);
CREATE INDEX idx_pipeline_approvals_environment_id ON pipeline_approvals(environment_id);
```

## API Endpoints

### Pipeline Management

```typescript
// GET /api/ci-cd/pipelines
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const active = searchParams.get('active') !== 'false';
  const pipelineType = searchParams.get('pipelineType');

  try {
    let query = supabase
      .from('pipeline_configurations')
      .select('*')
      .eq('is_active', active)
      .order('created_at', { ascending: false });

    if (pipelineType) {
      query = query.eq('pipeline_type', pipelineType);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      pipelines: data,
      summary: PipelineService.summarizePipelines(data)
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch pipelines' 
    }, { status: 500 });
  }
}

// POST /api/ci-cd/pipelines
export async function POST(request: Request) {
  const pipelineConfig = await request.json();

  try {
    // Validate pipeline configuration
    const validatedConfig = await PipelineService.validateConfiguration(pipelineConfig);
    
    const { data, error } = await supabase
      .from('pipeline_configurations')
      .insert([{
        ...validatedConfig,
        created_by: request.user?.id
      }])
      .select()
      .single();

    if (error) throw error;

    // Initialize webhook configuration
    await WebhookService.setupPipelineWebhooks(data.id, data.repository_url);

    return NextResponse.json({ success: true, pipeline: data });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create pipeline' 
    }, { status: 500 });
  }
}
```

### Pipeline Execution

```typescript
// POST /api/ci-cd/pipelines/{pipelineId}/execute
export async function POST(request: Request, { params }: { params: { pipelineId: string } }) {
  const { branch, commitSha, triggerEvent } = await request.json();

  try {
    // Get pipeline configuration
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipeline_configurations')
      .select('*')
      .eq('id', params.pipelineId)
      .single();

    if (pipelineError || !pipeline) {
      return NextResponse.json({ 
        success: false, 
        error: 'Pipeline not found' 
      }, { status: 404 });
    }

    // Validate execution criteria
    const validation = await PipelineService.validateExecution(pipeline, branch, triggerEvent);
    if (!validation.valid) {
      return NextResponse.json({ 
        success: false, 
        error: validation.reason 
      }, { status: 400 });
    }

    // Create execution record
    const execution = await PipelineService.createExecution({
      pipelineId: params.pipelineId,
      branch,
      commitSha,
      triggerEvent,
      triggerUser: request.user?.id
    });

    // Start pipeline execution
    PipelineRunner.startExecution(execution.id, pipeline);

    return NextResponse.json({ 
      success: true, 
      execution,
      message: 'Pipeline execution started successfully' 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to start pipeline execution' 
    }, { status: 500 });
  }
}

// GET /api/ci-cd/executions/{executionId}/status
export async function GET(request: Request, { params }: { params: { executionId: string } }) {
  try {
    const [execution, stages, currentStage] = await Promise.all([
      PipelineService.getExecution(params.executionId),
      PipelineService.getExecutionStages(params.executionId),
      PipelineService.getCurrentStage(params.executionId)
    ]);

    if (!execution) {
      return NextResponse.json({ 
        success: false, 
        error: 'Execution not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      execution,
      stages,
      currentStage,
      progress: PipelineService.calculateProgress(stages),
      logs: execution.status === 'running' ? await LogService.getRecentLogs(params.executionId) : null
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch execution status' 
    }, { status: 500 });
  }
}

// POST /api/ci-cd/executions/{executionId}/cancel
export async function POST(request: Request, { params }: { params: { executionId: string } }) {
  try {
    const cancelled = await PipelineRunner.cancelExecution(params.executionId);
    
    if (!cancelled) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to cancel execution' 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Pipeline execution cancelled successfully' 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to cancel execution' 
    }, { status: 500 });
  }
}
```

### Quality Gates

```typescript
// GET /api/ci-cd/executions/{executionId}/quality-gates
export async function GET(request: Request, { params }: { params: { executionId: string } }) {
  try {
    const { data: evaluations, error } = await supabase
      .from('quality_gate_evaluations')
      .select('*')
      .eq('execution_id', params.executionId)
      .order('created_at');

    if (error) throw error;

    const summary = QualityGateService.summarizeEvaluations(evaluations);

    return NextResponse.json({
      success: true,
      evaluations,
      summary,
      allPassed: evaluations.every(e => e.status === 'passed' || e.status === 'overridden'),
      blockers: evaluations.filter(e => e.status === 'failed' && e.blocker)
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch quality gate results' 
    }, { status: 500 });
  }
}

// POST /api/ci-cd/quality-gates/{evaluationId}/override
export async function POST(request: Request, { params }: { params: { evaluationId: string } }) {
  const { reason } = await request.json();

  try {
    const { data, error } = await supabase
      .from('quality_gate_evaluations')
      .update({
        status: 'overridden',
        override_reason: reason,
        overridden_by: request.user?.id,
        overridden_at: new Date().toISOString()
      })
      .eq('id', params.evaluationId)
      .select()
      .single();

    if (error) throw error;

    // Log quality gate override
    await AuditLogger.logQualityGateOverride(params.evaluationId, reason, request.user?.id);

    return NextResponse.json({ success: true, evaluation: data });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to override quality gate' 
    }, { status: 500 });
  }
}
```

### Deployment Management

```typescript
// GET /api/ci-cd/deployments
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const environmentId = searchParams.get('environmentId');
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    let query = supabase
      .from('deployments')
      .select('*, environment:deployment_environments(environment_name), execution:pipeline_executions(commit_sha, branch_name)')
      .order('initiated_at', { ascending: false })
      .limit(limit);

    if (environmentId) {
      query = query.eq('environment_id', environmentId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      deployments: data,
      summary: DeploymentService.summarizeDeployments(data)
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch deployments' 
    }, { status: 500 });
  }
}

// POST /api/ci-cd/deployments/{deploymentId}/rollback
export async function POST(request: Request, { params }: { params: { deploymentId: string } }) {
  const { reason } = await request.json();

  try {
    const rollback = await DeploymentService.initiateRollback({
      deploymentId: params.deploymentId,
      reason,
      initiatedBy: request.user?.id
    });

    return NextResponse.json({ 
      success: true, 
      rollback,
      message: 'Rollback initiated successfully' 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to initiate rollback' 
    }, { status: 500 });
  }
}
```

### Metrics and Analytics

```typescript
// GET /api/ci-cd/metrics
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pipelineId = searchParams.get('pipelineId');
  const timeRange = searchParams.get('timeRange') || '30d';

  try {
    const metrics = await MetricsService.getPipelineMetrics({
      pipelineId,
      timeRange
    });

    const trends = await MetricsService.calculateTrends(metrics);
    const insights = await MetricsService.generateInsights(metrics);

    return NextResponse.json({
      success: true,
      metrics,
      trends,
      insights,
      summary: MetricsService.summarizeMetrics(metrics)
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch pipeline metrics' 
    }, { status: 500 });
  }
}

// GET /api/ci-cd/analytics/dashboard
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('timeRange') || '7d';

  try {
    const [
      executionMetrics,
      deploymentMetrics,
      qualityMetrics,
      performanceMetrics,
      recentActivity
    ] = await Promise.all([
      MetricsService.getExecutionMetrics(timeRange),
      MetricsService.getDeploymentMetrics(timeRange),
      MetricsService.getQualityMetrics(timeRange),
      MetricsService.getPerformanceMetrics(timeRange),
      ActivityService.getRecentActivity(20)
    ]);

    const dashboard = {
      executionMetrics,
      deploymentMetrics,
      qualityMetrics,
      performanceMetrics,
      recentActivity,
      dora: MetricsService.calculateDORAMetrics(timeRange),
      healthScore: MetricsService.calculateHealthScore({
        executionMetrics,
        deploymentMetrics,
        qualityMetrics
      })
    };

    return NextResponse.json({ success: true, dashboard });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch analytics dashboard' 
    }, { status: 500 });
  }
}
```

## React Components

### CI/CD Dashboard

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar,
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  GitBranch, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  Zap,
  Target,
  Activity,
  Settings,
  AlertTriangle,
  Download
} from 'lucide-react';

interface PipelineDashboard {
  executionMetrics: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    averageDuration: number;
    trends: Array<{
      date: string;
      executions: number;
      success_rate: number;
      avg_duration: number;
    }>;
  };
  deploymentMetrics: {
    totalDeployments: number;
    successfulDeployments: number;
    rollbacks: number;
    deploymentFrequency: number;
    leadTime: number;
    trends: Array<{
      date: string;
      deployments: number;
      rollbacks: number;
    }>;
  };
  qualityMetrics: {
    averageCoverage: number;
    codeQualityScore: number;
    securityIssues: number;
    qualityTrends: Array<{
      date: string;
      coverage: number;
      quality_score: number;
    }>;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    status: string;
    timestamp: string;
    user: string;
    duration?: number;
  }>;
  dora: {
    deploymentFrequency: number;
    leadTimeForChanges: number;
    changeFailureRate: number;
    meanTimeToRecovery: number;
  };
  healthScore: number;
}

const CICDDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<PipelineDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, [selectedTimeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ci-cd/analytics/dashboard?timeRange=${selectedTimeRange}`);
      const data = await response.json();
      
      if (data.success) {
        setDashboard(data.dashboard);
      }
    } catch (error) {
      console.error('Failed to load CI/CD dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded': return 'text-green-600 bg-green-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'running': return 'text-blue-600 bg-blue-50';
      case 'cancelled': return 'text-gray-600 bg-gray-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running': return <Activity className="h-4 w-4 text-blue-600" />;
      case 'cancelled': return <Pause className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dashboard) {
    return <div>Failed to load CI/CD dashboard</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">CI/CD Pipeline Dashboard</h1>
          <p className="text-gray-600">Continuous integration and deployment monitoring</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Pipeline Health:</span>
            <span className={`font-bold text-lg ${getHealthColor(dashboard.healthScore)}`}>
              {dashboard.healthScore}%
            </span>
          </div>
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadDashboardData}>
            Refresh
          </Button>
        </div>
      </div>

      {/* DORA Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Deployment Frequency</p>
                <p className="text-2xl font-bold">{dashboard.dora.deploymentFrequency}</p>
                <p className="text-xs text-gray-500">deployments/day</p>
              </div>
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Lead Time</p>
                <p className="text-2xl font-bold">{Math.round(dashboard.dora.leadTimeForChanges / 60)}h</p>
                <p className="text-xs text-gray-500">commit to deploy</p>
              </div>
              <Clock className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Change Failure Rate</p>
                <p className="text-2xl font-bold">{dashboard.dora.changeFailureRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">of deployments</p>
              </div>
              <Target className="h-6 w-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">MTTR</p>
                <p className="text-2xl font-bold">{Math.round(dashboard.dora.meanTimeToRecovery / 60)}h</p>
                <p className="text-xs text-gray-500">mean time to recovery</p>
              </div>
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {['overview', 'executions', 'deployments', 'quality'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Execution Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Execution Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboard.executionMetrics.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="executions" 
                    stroke="#8884d8" 
                    name="Executions"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="success_rate" 
                    stroke="#82ca9d" 
                    name="Success Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quality Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Quality Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">Test Coverage</span>
                    <span className="text-sm text-gray-600">
                      {dashboard.qualityMetrics.averageCoverage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={dashboard.qualityMetrics.averageCoverage} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">Code Quality Score</span>
                    <span className="text-sm text-gray-600">
                      {dashboard.qualityMetrics.codeQualityScore.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={dashboard.qualityMetrics.codeQualityScore} className="h-2" />
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dashboard.qualityMetrics.qualityTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="coverage" 
                    stackId="1"
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    name="Coverage"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="quality_score" 
                    stackId="2"
                    stroke="#82ca9d" 
                    fill="#82ca9d" 
                    name="Quality Score"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Recent Pipeline Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboard.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(activity.status)}
                  <div>
                    <p className="font-semibold">{activity.title}</p>
                    <p className="text-sm text-gray-600">
                      {activity.type} by {activity.user}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(activity.status)}>
                    {activity.status}
                  </Badge>
                  {activity.duration && (
                    <span className="text-sm text-gray-600">
                      {Math.round(activity.duration / 60)}m
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            {dashboard.recentActivity.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4" />
                <p>No recent pipeline activity</p>
                <p className="text-sm">Pipeline executions will appear here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-4 flex-wrap">
        <Button onClick={() => window.open('/dashboard/ci-cd/pipelines', '_blank')}>
          <GitBranch className="h-4 w-4 mr-2" />
          Manage Pipelines
        </Button>
        <Button variant="outline" onClick={() => window.open('/dashboard/ci-cd/executions', '_blank')}>
          <Play className="h-4 w-4 mr-2" />
          Recent Executions
        </Button>
        <Button variant="outline" onClick={() => window.open('/dashboard/ci-cd/deployments', '_blank')}>
          <Zap className="h-4 w-4 mr-2" />
          Deployments
        </Button>
        <Button variant="outline" onClick={() => window.open('/dashboard/ci-cd/quality', '_blank')}>
          <Target className="h-4 w-4 mr-2" />
          Quality Gates
        </Button>
        <Button variant="outline" onClick={() => window.open('/dashboard/ci-cd/environments', '_blank')}>
          <Settings className="h-4 w-4 mr-2" />
          Environments
        </Button>
      </div>
    </div>
  );
};

export default CICDDashboard;
```

## Core Implementation

### Pipeline Service

```typescript
export class PipelineService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  async validateConfiguration(config: any) {
    const validated = {
      pipeline_name: config.pipelineName || 'Unnamed Pipeline',
      pipeline_type: this.validatePipelineType(config.pipelineType),
      repository_url: this.validateRepositoryUrl(config.repositoryUrl),
      branch_patterns: config.branchPatterns || ['main', 'develop', 'feature/*'],
      trigger_events: config.triggerEvents || ['push', 'pull_request'],
      build_configuration: this.validateBuildConfig(config.buildConfiguration),
      test_configuration: this.validateTestConfig(config.testConfiguration || {}),
      deployment_configuration: this.validateDeploymentConfig(config.deploymentConfiguration || {}),
      quality_gates: this.validateQualityGates(config.qualityGates || {}),
      notification_config: config.notificationConfig || {},
      environment_promotions: config.environmentPromotions || {},
      rollback_strategy: config.rollbackStrategy || {}
    };

    return validated;
  }

  private validatePipelineType(type: string): string {
    const validTypes = ['build', 'test', 'deploy', 'full_cicd', 'release'];
    return validTypes.includes(type) ? type : 'full_cicd';
  }

  private validateRepositoryUrl(url: string): string {
    if (!url) throw new Error('Repository URL is required');
    if (!url.match(/^https?:\/\/.+/)) throw new Error('Invalid repository URL format');
    return url;
  }

  private validateBuildConfig(config: any) {
    return {
      buildTool: config.buildTool || 'npm',
      buildCommand: config.buildCommand || 'npm run build',
      outputDirectory: config.outputDirectory || 'dist',
      nodeVersion: config.nodeVersion || '18',
      environmentVariables: config.environmentVariables || {},
      dockerConfig: config.dockerConfig || null,
      artifacts: config.artifacts || []
    };
  }

  private validateTestConfig(config: any) {
    return {
      testCommand: config.testCommand || 'npm test',
      coverageThreshold: Math.max(0, Math.min(config.coverageThreshold || 80, 100)),
      testTypes: config.testTypes || ['unit', 'integration'],
      parallelExecution: config.parallelExecution !== false,
      maxRetries: Math.max(0, Math.min(config.maxRetries || 2, 5)),
      timeout: Math.max(300, Math.min(config.timeout || 1800, 7200)) // 5min to 2h
    };
  }

  private validateDeploymentConfig(config: any) {
    return {
      strategy: config.strategy || 'rolling',
      environments: config.environments || [],
      healthChecks: config.healthChecks || [],
      rollbackEnabled: config.rollbackEnabled !== false,
      approvalRequired: config.approvalRequired || false,
      maxRollbackVersions: Math.max(1, Math.min(config.maxRollbackVersions || 5, 20))
    };
  }

  private validateQualityGates(gates: any) {
    const validatedGates = {};
    
    for (const [gateName, gateConfig] of Object.entries(gates)) {
      validatedGates[gateName] = {
        type: gateConfig.type || 'test_coverage',
        threshold: gateConfig.threshold || 80,
        operator: gateConfig.operator || '>=',
        blocker: gateConfig.blocker !== false,
        overridable: gateConfig.overridable !== false
      };
    }
    
    return validatedGates;
  }

  async validateExecution(pipeline: any, branch: string, triggerEvent: string) {
    // Check if branch matches patterns
    const branchMatches = pipeline.branch_patterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(branch);
      }
      return pattern === branch;
    });

    if (!branchMatches) {
      return { valid: false, reason: `Branch ${branch} does not match pipeline patterns` };
    }

    // Check if trigger event is allowed
    if (!pipeline.trigger_events.includes(triggerEvent)) {
      return { valid: false, reason: `Trigger event ${triggerEvent} is not allowed for this pipeline` };
    }

    // Check for concurrent executions limit
    const activeExecutions = await this.getActiveExecutions(pipeline.id);
    if (activeExecutions.length >= 5) { // Max 5 concurrent executions
      return { valid: false, reason: 'Maximum concurrent executions reached' };
    }

    return { valid: true };
  }

  async createExecution(executionData: any) {
    const executionNumber = await this.getNextExecutionNumber(executionData.pipelineId);
    
    const execution = {
      pipeline_id: executionData.pipelineId,
      execution_number: executionNumber,
      commit_sha: executionData.commitSha,
      commit_message: executionData.commitMessage || '',
      commit_author: executionData.commitAuthor || '',
      branch_name: executionData.branch,
      trigger_event: executionData.triggerEvent,
      trigger_user: executionData.triggerUser,
      status: 'queued'
    };

    const { data, error } = await this.supabase
      .from('pipeline_executions')
      .insert([execution])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private async getNextExecutionNumber(pipelineId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('pipeline_executions')
      .select('execution_number')
      .eq('pipeline_id', pipelineId)
      .order('execution_number', { ascending: false })
      .limit(1);

    if (error) throw error;
    return (data[0]?.execution_number || 0) + 1;
  }

  async getActiveExecutions(pipelineId?: string) {
    let query = this.supabase
      .from('pipeline_executions')
      .select('*')
      .in('status', ['queued', 'running']);

    if (pipelineId) {
      query = query.eq('pipeline_id', pipelineId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getExecution(executionId: string) {
    const { data, error } = await this.supabase
      .from('pipeline_executions')
      .select('*, pipeline:pipeline_configurations(*)')
      .eq('id', executionId)
      .single();

    if (error) throw error;
    return data;
  }

  async getExecutionStages(executionId: string) {
    const { data, error } = await this.supabase
      .from('pipeline_stages')
      .select('*')
      .eq('execution_id', executionId)
      .order('stage_order');

    if (error) throw error;
    return data;
  }

  async getCurrentStage(executionId: string) {
    const { data, error } = await this.supabase
      .from('pipeline_stages')
      .select('*')
      .eq('execution_id', executionId)
      .eq('status', 'running')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  calculateProgress(stages: any[]): number {
    if (stages.length === 0) return 0;
    
    const completedStages = stages.filter(s => s.status === 'succeeded').length;
    return (completedStages / stages.length) * 100;
  }

  summarizePipelines(pipelines: any[]) {
    return {
      total: pipelines.length,
      active: pipelines.filter(p => p.is_active).length,
      byType: pipelines.reduce((acc, p) => {
        acc[p.pipeline_type] = (acc[p.pipeline_type] || 0) + 1;
        return acc;
      }, {}),
      averageExecutionsPerDay: this.calculateAverageExecutions(pipelines)
    };
  }

  private calculateAverageExecutions(pipelines: any[]): number {
    // This would typically query execution history
    // For now, return a placeholder calculation
    return pipelines.length * 2.5; // Rough estimate
  }
}

export const pipelineService = new PipelineService();
```

### Pipeline Runner

```typescript
export class PipelineRunner {
  static async startExecution(executionId: string, pipeline: any) {
    try {
      // Mark execution as running
      await supabase
        .from('pipeline_executions')
        .update({ 
          status: 'running', 
          started_at: new Date().toISOString() 
        })
        .eq('id', executionId);

      // Create pipeline stages based on configuration
      const stages = await this.createPipelineStages(executionId, pipeline);
      
      // Execute stages
      await this.executeStages(executionId, stages);

    } catch (error) {
      console.error('Pipeline execution failed:', error);
      
      await supabase
        .from('pipeline_executions')
        .update({ 
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_details: { error: error.message }
        })
        .eq('id', executionId);
    }
  }

  private static async createPipelineStages(executionId: string, pipeline: any) {
    const stages = [];
    let stageOrder = 1;

    // Build stage
    if (pipeline.build_configuration) {
      stages.push({
        execution_id: executionId,
        stage_name: 'Build',
        stage_type: 'build',
        stage_order: stageOrder++,
        stage_config: pipeline.build_configuration
      });
    }

    // Test stages
    if (pipeline.test_configuration && pipeline.test_configuration.testTypes) {
      for (const testType of pipeline.test_configuration.testTypes) {
        stages.push({
          execution_id: executionId,
          stage_name: `${testType.charAt(0).toUpperCase() + testType.slice(1)} Tests`,
          stage_type: 'test',
          stage_order: stageOrder++,
          depends_on: ['Build'],
          parallel_group: 'tests',
          stage_config: {
            ...pipeline.test_configuration,
            testType
          }
        });
      }
    }

    // Quality gates
    if (pipeline.quality_gates && Object.keys(pipeline.quality_gates).length > 0) {
      stages.push({
        execution_id: executionId,
        stage_name: 'Quality Gates',
        stage_type: 'quality_check',
        stage_order: stageOrder++,
        depends_on: ['Build'],
        stage_config: { gates: pipeline.quality_gates }
      });
    }

    // Security scan
    stages.push({
      execution_id: executionId,
      stage_name: 'Security Scan',
      stage_type: 'security_scan',
      stage_order: stageOrder++,
      depends_on: ['Build'],
      parallel_group: 'scans',
      stage_config: { scanTypes: ['dependency', 'static_analysis'] }
    });

    // Deployment stages
    if (pipeline.deployment_configuration && pipeline.deployment_configuration.environments) {
      for (const env of pipeline.deployment_configuration.environments) {
        stages.push({
          execution_id: executionId,
          stage_name: `Deploy to ${env.name}`,
          stage_type: 'deploy',
          stage_order: stageOrder++,
          depends_on: ['Quality Gates'],
          stage_config: {
            ...pipeline.deployment_configuration,
            environment: env
          }
        });
      }
    }

    // Insert stages into database
    for (const stage of stages) {
      await supabase.from('pipeline_stages').insert([stage]);
    }

    return stages;
  }

  private static async executeStages(executionId: string, stages: any[]) {
    const stageGroups = this.groupStagesByDependencies(stages);
    
    for (const group of stageGroups) {
      if (group.parallel) {
        // Execute parallel stages concurrently
        await Promise.all(
          group.stages.map(stage => this.executeStage(executionId, stage))
        );
      } else {
        // Execute sequential stages
        for (const stage of group.stages) {
          await this.executeStage(executionId, stage);
        }
      }
    }

    // Update execution status
    await this.finalizeExecution(executionId);
  }

  private static groupStagesByDependencies(stages: any[]) {
    // Group stages that can run in parallel
    const groups = [];
    const processedStages = new Set();
    
    while (processedStages.size < stages.length) {
      const availableStages = stages.filter(stage => 
        !processedStages.has(stage.stage_name) &&
        (!stage.depends_on || stage.depends_on.every(dep => processedStages.has(dep)))
      );
      
      if (availableStages.length === 0) {
        throw new Error('Circular dependency detected in pipeline stages');
      }
      
      // Group by parallel_group
      const parallelGroups = new Map();
      const sequentialStages = [];
      
      for (const stage of availableStages) {
        if (stage.parallel_group) {
          if (!parallelGroups.has(stage.parallel_group)) {
            parallelGroups.set(stage.parallel_group, []);
          }
          parallelGroups.get(stage.parallel_group).push(stage);
        } else {
          sequentialStages.push(stage);
        }
        processedStages.add(stage.stage_name);
      }
      
      // Add sequential stages
      for (const stage of sequentialStages) {
        groups.push({ parallel: false, stages: [stage] });
      }
      
      // Add parallel groups
      for (const [groupName, groupStages] of parallelGroups) {
        groups.push({ parallel: true, stages: groupStages });
      }
    }
    
    return groups;
  }

  private static async executeStage(executionId: string, stage: any) {
    // Update stage status to running
    await supabase
      .from('pipeline_stages')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('execution_id', executionId)
      .eq('stage_name', stage.stage_name);

    try {
      let result;

      switch (stage.stage_type) {
        case 'build':
          result = await this.executeBuildStage(stage.stage_config);
          break;
        case 'test':
          result = await this.executeTestStage(stage.stage_config);
          break;
        case 'security_scan':
          result = await this.executeSecurityScan(stage.stage_config);
          break;
        case 'quality_check':
          result = await this.executeQualityCheck(executionId, stage.stage_config);
          break;
        case 'deploy':
          result = await this.executeDeployment(executionId, stage.stage_config);
          break;
        default:
          throw new Error(`Unsupported stage type: ${stage.stage_type}`);
      }

      // Update stage status to succeeded
      await supabase
        .from('pipeline_stages')
        .update({ 
          status: 'succeeded',
          completed_at: new Date().toISOString(),
          stage_logs: result.logs,
          metrics: result.metrics,
          output_artifacts: result.artifacts || []
        })
        .eq('execution_id', executionId)
        .eq('stage_name', stage.stage_name);

    } catch (error) {
      console.error(`Stage execution failed: ${stage.stage_name}`, error);
      
      // Handle retry logic
      const shouldRetry = await this.handleStageRetry(executionId, stage, error);
      
      if (!shouldRetry) {
        await supabase
          .from('pipeline_stages')
          .update({ 
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error.message
          })
          .eq('execution_id', executionId)
          .eq('stage_name', stage.stage_name);

        throw error; // Re-throw to stop execution
      }
    }
  }

  private static async executeBuildStage(config: any) {
    // Execute build commands
    const buildResult = await BuildExecutor.execute({
      buildTool: config.buildTool,
      buildCommand: config.buildCommand,
      outputDirectory: config.outputDirectory,
      environmentVariables: config.environmentVariables
    });

    // Generate artifacts
    const artifacts = await ArtifactManager.createBuildArtifacts(buildResult);

    return {
      logs: buildResult.logs,
      metrics: {
        buildTime: buildResult.duration,
        artifactSize: artifacts.reduce((sum, a) => sum + a.size, 0),
        buildTools: [config.buildTool]
      },
      artifacts: artifacts.map(a => a.path)
    };
  }

  private static async executeTestStage(config: any) {
    // Execute tests
    const testResult = await TestExecutor.execute({
      testCommand: config.testCommand,
      testType: config.testType,
      coverageThreshold: config.coverageThreshold,
      timeout: config.timeout
    });

    return {
      logs: testResult.logs,
      metrics: {
        testDuration: testResult.duration,
        totalTests: testResult.totalTests,
        passedTests: testResult.passedTests,
        failedTests: testResult.failedTests,
        coverage: testResult.coverage
      },
      artifacts: testResult.reports
    };
  }

  private static async executeSecurityScan(config: any) {
    // Execute security scans
    const scanResults = await SecurityScanner.scan(config.scanTypes);

    return {
      logs: scanResults.logs,
      metrics: {
        vulnerabilities: scanResults.vulnerabilities.length,
        criticalVulns: scanResults.vulnerabilities.filter(v => v.severity === 'critical').length,
        scanDuration: scanResults.duration
      },
      artifacts: scanResults.reports
    };
  }

  private static async executeQualityCheck(executionId: string, config: any) {
    // Execute quality gates
    const results = await QualityGateService.evaluate(executionId, config.gates);

    return {
      logs: results.logs,
      metrics: {
        gatesPassed: results.passed,
        gatesFailed: results.failed,
        overallScore: results.score
      },
      artifacts: []
    };
  }

  private static async executeDeployment(executionId: string, config: any) {
    // Execute deployment
    const deployResult = await DeploymentService.deploy({
      executionId,
      environment: config.environment,
      strategy: config.strategy,
      artifacts: config.artifacts
    });

    return {
      logs: deployResult.logs,
      metrics: {
        deploymentTime: deployResult.duration,
        healthChecksPassed: deployResult.healthChecksPassed,
        rollbackTriggered: deployResult.rollbackTriggered
      },
      artifacts: []
    };
  }

  private static async handleStageRetry(executionId: string, stage: any, error: any) {
    // Get current retry count
    const { data: stageData } = await supabase
      .from('pipeline_stages')
      .select('retry_count, max_retries')
      .eq('execution_id', executionId)
      .eq('stage_name', stage.stage_name)
      .single();

    if (!stageData) return false;

    const canRetry = stageData.retry_count < stageData.max_retries;

    if (canRetry) {
      // Increment retry count and retry
      await supabase
        .from('pipeline_stages')
        .update({ retry_count: stageData.retry_count + 1 })
        .eq('execution_id', executionId)
        .eq('stage_name', stage.stage_name);

      // Wait before retry (exponential backoff)
      const delayMs = Math.pow(2, stageData.retry_count) * 1000;
      await new Promise(resolve => setTimeout(resolve, delayMs));

      return true;
    }

    return false;
  }

  private static async finalizeExecution(executionId: string) {
    // Check if all stages completed successfully
    const { data: stages } = await supabase
      .from('pipeline_stages')
      .select('status, duration_seconds')
      .eq('execution_id', executionId);

    const allSucceeded = stages?.every(stage => stage.status === 'succeeded');
    const anyFailed = stages?.some(stage => stage.status === 'failed');

    const status = anyFailed ? 'failed' : allSucceeded ? 'succeeded' : 'running';
    const totalDuration = stages?.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) || 0;

    await supabase
      .from('pipeline_executions')
      .update({ 
        status,
        completed_at: status !== 'running' ? new Date().toISOString() : null,
        duration_seconds: totalDuration,
        stages_total: stages?.length || 0,
        stages_completed: stages?.filter(s => s.status === 'succeeded').length || 0,
        stages_failed: stages?.filter(s => s.status === 'failed').length || 0
      })
      .eq('id', executionId);

    // Send notifications
    await NotificationService.sendPipelineCompletion(executionId, status);
  }

  static async cancelExecution(executionId: string): Promise<boolean> {
    try {
      // Update execution status
      await supabase
        .from('pipeline_executions')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', executionId);

      // Cancel running stages
      await supabase
        .from('pipeline_stages')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('execution_id', executionId)
        .eq('status', 'running');

      return true;
    } catch (error) {
      console.error('Failed to cancel execution:', error);
      return false;
    }
  }
}
```

## MCP Server Usage

The CI/CD Pipeline Enhancement will utilize these MCP servers:

### GitHub MCP (via CLI)
- **Repository integration**: Clone repositories and fetch commit information
- **Webhook management**: Set up and manage GitHub webhooks for pipeline triggers
- **Status updates**: Update GitHub commit statuses and PR checks
- **Release management**: Create and manage GitHub releases

### PostgreSQL MCP
- **Pipeline data storage**: Store pipeline configurations, executions, and results
- **Performance monitoring**: Monitor database performance during CI/CD operations
- **Data integrity**: Ensure pipeline data consistency and integrity
- **Metrics analysis**: Analyze pipeline performance and trends

### Supabase MCP
- **Real-time updates**: Provide real-time pipeline status updates
- **User management**: Handle user authentication and authorization
- **Edge functions**: Deploy and manage Supabase Edge Functions
- **Configuration management**: Manage environment-specific configurations

### Playwright MCP
- **End-to-end testing**: Execute comprehensive E2E tests during pipeline runs
- **Visual regression testing**: Perform visual comparison tests
- **Cross-browser testing**: Validate applications across multiple browsers
- **Performance testing**: Monitor application performance during testing

### Filesystem MCP
- **Artifact management**: Handle build artifacts and test reports
- **Configuration files**: Manage pipeline configuration files
- **Log management**: Store and retrieve pipeline execution logs
- **Dependency caching**: Cache dependencies for faster builds

## Navigation Integration

### Main Navigation Updates

The CI/CD Pipeline Enhancement will be integrated into the WedSync navigation structure:

```typescript
// Add to developer navigation menu
{
  id: 'ci-cd',
  label: 'CI/CD',
  icon: GitBranch,
  href: '/dashboard/ci-cd',
  permission: 'developer',
  badge: hasFailedPipelines ? { text: 'Issues', variant: 'destructive' } : undefined
}

// Add to development submenu
{
  id: 'dev-tools',
  label: 'Development Tools',
  items: [
    {
      id: 'ci-cd-dashboard',
      label: 'CI/CD Dashboard',
      href: '/dashboard/ci-cd',
      icon: GitBranch
    },
    {
      id: 'pipeline-management',
      label: 'Pipeline Management',
      href: '/dashboard/ci-cd/pipelines',
      icon: Settings
    },
    {
      id: 'execution-history',
      label: 'Execution History',
      href: '/dashboard/ci-cd/executions',
      icon: Activity
    },
    {
      id: 'deployment-management',
      label: 'Deployments',
      href: '/dashboard/ci-cd/deployments',
      icon: Zap
    },
    {
      id: 'quality-gates',
      label: 'Quality Gates',
      href: '/dashboard/ci-cd/quality',
      icon: Target
    },
    {
      id: 'environment-management',
      label: 'Environments',
      href: '/dashboard/ci-cd/environments',
      icon: Server
    }
  ]
}
```

### Breadcrumb Integration

```typescript
const breadcrumbMap = {
  '/dashboard/ci-cd': [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'CI/CD', href: '/dashboard/ci-cd' }
  ],
  '/dashboard/ci-cd/pipelines': [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'CI/CD', href: '/dashboard/ci-cd' },
    { label: 'Pipelines', href: '/dashboard/ci-cd/pipelines' }
  ],
  '/dashboard/ci-cd/executions': [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'CI/CD', href: '/dashboard/ci-cd' },
    { label: 'Executions', href: '/dashboard/ci-cd/executions' }
  ]
}
```

### Quick Actions Integration

```typescript
// Add to global quick actions
{
  id: 'trigger-pipeline',
  label: 'Trigger Pipeline',
  icon: Play,
  href: '/dashboard/ci-cd/pipelines',
  shortcut: 'P',
  category: 'developer'
},
{
  id: 'view-deployments',
  label: 'View Deployments',
  icon: Zap,
  href: '/dashboard/ci-cd/deployments',
  shortcut: 'D',
  category: 'developer'
}
```

## Testing Requirements

### Unit Tests

```typescript
// Pipeline Service Tests
describe('PipelineService', () => {
  test('should validate pipeline configuration', async () => {
    const config = {
      pipelineName: 'Test Pipeline',
      pipelineType: 'full_cicd',
      repositoryUrl: 'https://github.com/test/repo.git',
      buildConfiguration: { buildTool: 'npm' }
    };
    
    const validated = await pipelineService.validateConfiguration(config);
    expect(validated.pipeline_name).toBe('Test Pipeline');
    expect(validated.pipeline_type).toBe('full_cicd');
  });

  test('should create execution with sequential number', async () => {
    const execution = await pipelineService.createExecution({
      pipelineId: 'test-pipeline-id',
      branch: 'main',
      commitSha: 'abc123',
      triggerEvent: 'push'
    });
    
    expect(execution).toHaveProperty('id');
    expect(execution.execution_number).toBeGreaterThan(0);
  });
});

// Pipeline Runner Tests
describe('PipelineRunner', () => {
  test('should group stages by dependencies correctly', () => {
    const stages = [
      { stage_name: 'Build', depends_on: [] },
      { stage_name: 'Test', depends_on: ['Build'], parallel_group: 'tests' },
      { stage_name: 'Lint', depends_on: ['Build'], parallel_group: 'tests' }
    ];
    
    const groups = PipelineRunner.groupStagesByDependencies(stages);
    expect(groups).toHaveLength(2);
    expect(groups[1].parallel).toBe(true);
  });
});
```

### Integration Tests

```typescript
// API Endpoint Tests
describe('CI/CD API', () => {
  test('POST /api/ci-cd/pipelines/{id}/execute', async () => {
    const response = await fetch('/api/ci-cd/pipelines/test-id/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branch: 'main',
        commitSha: 'abc123',
        triggerEvent: 'manual'
      })
    });
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.execution).toHaveProperty('id');
  });

  test('GET /api/ci-cd/executions/{id}/status', async () => {
    const response = await fetch('/api/ci-cd/executions/test-execution-id/status');
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.execution).toHaveProperty('status');
  });
});
```

### Browser Tests

```typescript
// Dashboard Component Tests
describe('CICDDashboard', () => {
  test('should display DORA metrics', async () => {
    const { page } = await setupBrowserTest('/dashboard/ci-cd');
    
    await page.waitForSelector('[data-testid="dora-metrics"]');
    
    const deploymentFreq = await page.textContent('[data-testid="deployment-frequency"]');
    expect(deploymentFreq).toMatch(/\d+/);
    
    const leadTime = await page.textContent('[data-testid="lead-time"]');
    expect(leadTime).toMatch(/\d+h/);
  });

  test('should show recent pipeline activity', async () => {
    const { page } = await setupBrowserTest('/dashboard/ci-cd');
    
    await page.waitForSelector('[data-testid="recent-activity"]');
    
    const activities = await page.$$('[data-testid="pipeline-activity"]');
    expect(activities.length).toBeGreaterThanOrEqual(0);
  });

  test('should display execution trends chart', async () => {
    const { page } = await setupBrowserTest('/dashboard/ci-cd');
    
    await page.waitForSelector('.recharts-wrapper');
    
    const chart = await page.$('.recharts-line-chart');
    expect(chart).toBeTruthy();
  });
});
```

### Pipeline Tests

```typescript
// CI/CD Pipeline Tests
describe('Pipeline Execution', () => {
  test('should execute build stage successfully', async () => {
    const config = {
      buildTool: 'npm',
      buildCommand: 'npm run build',
      outputDirectory: 'dist'
    };
    
    const result = await PipelineRunner.executeBuildStage(config);
    expect(result.logs).toBeTruthy();
    expect(result.metrics.buildTime).toBeGreaterThan(0);
  });

  test('should handle stage retry on failure', async () => {
    const mockStage = {
      stage_name: 'Test Stage',
      max_retries: 2
    };
    
    const shouldRetry = await PipelineRunner.handleStageRetry('exec-id', mockStage, new Error('Test error'));
    expect(typeof shouldRetry).toBe('boolean');
  });

  test('should calculate execution progress correctly', () => {
    const stages = [
      { status: 'succeeded' },
      { status: 'succeeded' },
      { status: 'running' },
      { status: 'pending' }
    ];
    
    const progress = pipelineService.calculateProgress(stages);
    expect(progress).toBe(50); // 2 out of 4 completed
  });
});
```

## Security Considerations

- **Access Control**: Pipeline access restricted to authorized developers and administrators
- **Secure Storage**: Pipeline configurations and secrets stored securely with encryption
- **Audit Logging**: All pipeline activities logged with full audit trails
- **Branch Protection**: Critical branches protected with required status checks
- **Approval Gates**: Sensitive deployments require manual approval
- **Secret Management**: Environment secrets managed securely and rotated regularly
- **Container Security**: Docker images scanned for vulnerabilities before deployment

## Accessibility Features

- **WCAG 2.1 AA Compliance**: All dashboard components meet accessibility standards
- **Screen Reader Support**: Proper ARIA labels and semantic HTML structure
- **Keyboard Navigation**: Full keyboard navigation support for all interactive elements
- **High Contrast Mode**: Dashboard adapts to high contrast display preferences
- **Focus Management**: Clear visual focus indicators and logical tab order
- **Alternative Text**: Charts and status indicators include text alternatives
- **Responsive Design**: Dashboard works effectively on all screen sizes and orientations

This comprehensive CI/CD Pipeline Enhancement provides automated testing, intelligent deployment strategies, comprehensive quality gates, and seamless integration workflows to ensure WedSync platform maintains high code quality, rapid deployment cycles, and zero-downtime releases while scaling effectively.