# WS-269: Data Pipeline Automation System - Technical Specification

## Summary
A comprehensive data pipeline automation system for WedSync providing intelligent ETL operations, real-time data streaming, automated data quality monitoring, schema evolution management, and business intelligence pipeline orchestration. This system ensures reliable, scalable, and maintainable data flow across all wedding platform services while providing comprehensive data analytics and reporting capabilities.

## Technical Requirements

### Core Functionality
- **ETL Pipeline Orchestration**: Automated Extract, Transform, Load operations with dependency management and failure recovery
- **Real-time Data Streaming**: Event-driven data processing with Kafka/Redis streams for live wedding updates
- **Data Quality Monitoring**: Automated data validation, anomaly detection, and quality scoring with alerts
- **Schema Evolution Management**: Automatic schema migration, versioning, and backward compatibility handling
- **Business Intelligence Pipelines**: Automated report generation, KPI calculations, and dashboard data preparation
- **Data Lineage Tracking**: Complete data provenance tracking from source to destination with impact analysis
- **Multi-source Integration**: Seamless integration with databases, APIs, files, and external wedding services

### Business Context
In the wedding industry, data flows from multiple sources (venues, vendors, guests, payments) and must be processed reliably to provide real-time insights to couples and planners. This automation system ensures wedding data is always accurate, up-to-date, and properly transformed for analytics while handling the complex relationships between different wedding entities.

### User Stories

#### Wedding Data Analysts
> "When vendors update their availability or pricing, I need the system to automatically validate the data, transform it to our standard format, and update all relevant reports and dashboards. If there are data quality issues, the system should flag them for review while keeping the pipeline running with the best available data."

#### Wedding Platform Operations
> "During peak wedding season, our data pipelines need to process thousands of vendor updates, guest responses, and payment transactions per minute. The system should automatically scale processing capacity, maintain data consistency across all services, and provide real-time monitoring of pipeline health and performance."

#### Wedding Business Intelligence
> "I need automated daily reports showing booking trends, vendor performance metrics, and revenue analytics. The system should handle complex data transformations, join data from multiple sources, and deliver reports on schedule even when some data sources are temporarily unavailable."

## Database Schema

```sql
-- Data Pipeline Definitions
CREATE TABLE data_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_name TEXT NOT NULL UNIQUE,
    pipeline_type TEXT NOT NULL, -- 'etl', 'streaming', 'reporting', 'sync'
    description TEXT,
    source_config JSONB NOT NULL, -- Source connection and query configuration
    destination_config JSONB NOT NULL, -- Destination connection and schema
    transformation_config JSONB DEFAULT '{}', -- Data transformation rules
    schedule_config JSONB DEFAULT '{}', -- Cron expressions, triggers, etc.
    retry_policy JSONB DEFAULT '{}', -- Retry configuration
    quality_checks JSONB DEFAULT '[]', -- Data quality validation rules
    alert_config JSONB DEFAULT '{}', -- Alert and notification settings
    tags JSONB DEFAULT '[]', -- Pipeline tags for organization
    is_active BOOLEAN DEFAULT true,
    is_paused BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pipeline Execution History
CREATE TABLE pipeline_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES data_pipelines(id) ON DELETE CASCADE,
    execution_id TEXT NOT NULL UNIQUE, -- Unique execution identifier
    execution_type TEXT NOT NULL, -- 'scheduled', 'manual', 'triggered', 'retry'
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
    records_processed INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_deleted INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    data_quality_score NUMERIC, -- Overall data quality score (0-100)
    execution_context JSONB DEFAULT '{}', -- Execution parameters and context
    performance_metrics JSONB DEFAULT '{}', -- Execution performance data
    error_details JSONB, -- Error information if failed
    logs_location TEXT, -- Location of detailed execution logs
    triggered_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Pipeline Steps and Transformations
CREATE TABLE pipeline_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES data_pipelines(id) ON DELETE CASCADE,
    step_name TEXT NOT NULL,
    step_type TEXT NOT NULL, -- 'extract', 'transform', 'load', 'validate', 'notify'
    step_order INTEGER NOT NULL,
    step_config JSONB NOT NULL, -- Step-specific configuration
    depends_on JSONB DEFAULT '[]', -- Dependencies on other steps
    parallel_execution BOOLEAN DEFAULT false,
    timeout_minutes INTEGER DEFAULT 60,
    retry_attempts INTEGER DEFAULT 3,
    critical BOOLEAN DEFAULT true, -- If false, failure doesn't stop pipeline
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(pipeline_id, step_name)
);

-- Step Execution Details
CREATE TABLE step_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_execution_id UUID REFERENCES pipeline_executions(id) ON DELETE CASCADE,
    step_id UUID REFERENCES pipeline_steps(id) ON DELETE CASCADE,
    step_execution_id TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'skipped'
    records_in INTEGER DEFAULT 0,
    records_out INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    memory_usage_mb INTEGER,
    cpu_usage_percent NUMERIC,
    input_data_sample JSONB, -- Sample of input data for debugging
    output_data_sample JSONB, -- Sample of output data for debugging
    transformation_stats JSONB DEFAULT '{}', -- Transformation statistics
    error_message TEXT,
    error_stack TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Data Quality Rules and Monitoring
CREATE TABLE data_quality_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT NOT NULL UNIQUE,
    rule_type TEXT NOT NULL, -- 'completeness', 'accuracy', 'consistency', 'validity', 'uniqueness'
    target_table TEXT NOT NULL,
    target_column TEXT,
    rule_expression TEXT NOT NULL, -- SQL or validation expression
    rule_config JSONB DEFAULT '{}', -- Rule-specific configuration
    severity TEXT DEFAULT 'warning', -- 'info', 'warning', 'error', 'critical'
    threshold_config JSONB DEFAULT '{}', -- Pass/fail thresholds
    alert_on_failure BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Data Quality Check Results
CREATE TABLE data_quality_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_execution_id UUID REFERENCES pipeline_executions(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES data_quality_rules(id) ON DELETE CASCADE,
    check_timestamp TIMESTAMPTZ NOT NULL,
    records_checked INTEGER NOT NULL,
    records_passed INTEGER NOT NULL,
    records_failed INTEGER NOT NULL,
    pass_rate NUMERIC NOT NULL, -- Percentage of records that passed
    quality_score NUMERIC NOT NULL, -- Quality score based on rule weight
    rule_result JSONB NOT NULL, -- Detailed rule evaluation results
    sample_failures JSONB DEFAULT '[]', -- Sample of failed records
    remediation_suggested TEXT, -- Suggested fixes for quality issues
    status TEXT DEFAULT 'completed', -- 'completed', 'failed', 'skipped'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Data Source Configurations
CREATE TABLE data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name TEXT NOT NULL UNIQUE,
    source_type TEXT NOT NULL, -- 'database', 'api', 'file', 'stream', 'webhook'
    connection_config JSONB NOT NULL, -- Connection parameters (encrypted)
    schema_config JSONB DEFAULT '{}', -- Expected data schema
    monitoring_config JSONB DEFAULT '{}', -- Health check and monitoring
    rate_limit_config JSONB DEFAULT '{}', -- Rate limiting configuration
    authentication_config JSONB DEFAULT '{}', -- Auth configuration
    is_active BOOLEAN DEFAULT true,
    health_status TEXT DEFAULT 'unknown', -- 'healthy', 'degraded', 'unhealthy', 'unknown'
    last_health_check TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Data Destinations Configuration
CREATE TABLE data_destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_name TEXT NOT NULL UNIQUE,
    destination_type TEXT NOT NULL, -- 'database', 'warehouse', 'api', 'file', 'stream'
    connection_config JSONB NOT NULL, -- Connection parameters (encrypted)
    schema_config JSONB DEFAULT '{}', -- Target schema configuration
    write_mode TEXT DEFAULT 'append', -- 'append', 'overwrite', 'upsert'
    partition_config JSONB DEFAULT '{}', -- Partitioning configuration
    indexing_config JSONB DEFAULT '{}', -- Index creation configuration
    backup_config JSONB DEFAULT '{}', -- Backup and retention settings
    is_active BOOLEAN DEFAULT true,
    health_status TEXT DEFAULT 'unknown',
    last_health_check TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Schema Evolution and Versioning
CREATE TABLE schema_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES data_sources(id),
    destination_id UUID REFERENCES data_destinations(id),
    version_number INTEGER NOT NULL,
    schema_definition JSONB NOT NULL, -- Complete schema definition
    schema_changes JSONB DEFAULT '[]', -- List of changes from previous version
    compatibility_mode TEXT DEFAULT 'backward', -- 'backward', 'forward', 'full', 'none'
    migration_script TEXT, -- SQL or script for schema migration
    validation_rules JSONB DEFAULT '[]', -- Schema validation rules
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    applied_at TIMESTAMPTZ,
    UNIQUE(source_id, destination_id, version_number)
);

-- Data Lineage Tracking
CREATE TABLE data_lineage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset TEXT NOT NULL,
    source_table TEXT,
    source_column TEXT,
    target_dataset TEXT NOT NULL,
    target_table TEXT,
    target_column TEXT,
    transformation_type TEXT, -- 'direct', 'aggregation', 'join', 'calculation', 'derived'
    transformation_logic TEXT, -- SQL or description of transformation
    pipeline_id UUID REFERENCES data_pipelines(id),
    confidence_score NUMERIC DEFAULT 1.0, -- Confidence in lineage accuracy (0-1)
    impact_analysis JSONB DEFAULT '{}', -- Impact of changes to this lineage
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Real-time Stream Processing
CREATE TABLE stream_processors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processor_name TEXT NOT NULL UNIQUE,
    stream_source TEXT NOT NULL, -- Kafka topic, Redis stream, etc.
    stream_destination TEXT NOT NULL,
    processing_logic JSONB NOT NULL, -- Stream processing configuration
    windowing_config JSONB DEFAULT '{}', -- Time/count window configuration
    state_management JSONB DEFAULT '{}', -- State store configuration
    error_handling JSONB DEFAULT '{}', -- Error handling strategy
    scaling_config JSONB DEFAULT '{}', -- Auto-scaling configuration
    monitoring_config JSONB DEFAULT '{}', -- Monitoring and alerting
    is_active BOOLEAN DEFAULT true,
    current_lag INTEGER DEFAULT 0, -- Current processing lag
    throughput_per_second INTEGER DEFAULT 0, -- Current throughput
    last_processed_offset TEXT, -- Last processed stream offset
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Business Intelligence Reports
CREATE TABLE bi_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_name TEXT NOT NULL UNIQUE,
    report_type TEXT NOT NULL, -- 'dashboard', 'scheduled', 'adhoc', 'alert'
    data_sources JSONB NOT NULL, -- Source tables and queries
    report_config JSONB NOT NULL, -- Report generation configuration
    schedule_config JSONB DEFAULT '{}', -- Report scheduling
    delivery_config JSONB DEFAULT '{}', -- Email, Slack, etc. delivery
    cache_config JSONB DEFAULT '{}', -- Report caching settings
    access_control JSONB DEFAULT '{}', -- Who can access this report
    is_active BOOLEAN DEFAULT true,
    last_generated TIMESTAMPTZ,
    generation_duration_ms INTEGER,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Alert and Notification Management
CREATE TABLE pipeline_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_name TEXT NOT NULL,
    alert_type TEXT NOT NULL, -- 'pipeline_failure', 'data_quality', 'performance', 'resource'
    conditions JSONB NOT NULL, -- Alert trigger conditions
    notification_channels JSONB DEFAULT '[]', -- Slack, email, webhook, etc.
    escalation_policy JSONB DEFAULT '{}', -- Alert escalation rules
    suppression_config JSONB DEFAULT '{}', -- Alert suppression settings
    severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    is_enabled BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Alert Instances and History
CREATE TABLE alert_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES pipeline_alerts(id) ON DELETE CASCADE,
    pipeline_execution_id UUID REFERENCES pipeline_executions(id),
    triggered_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    status TEXT DEFAULT 'open', -- 'open', 'acknowledged', 'resolved', 'suppressed'
    severity TEXT NOT NULL,
    alert_data JSONB NOT NULL, -- Context data that triggered the alert
    notification_status JSONB DEFAULT '{}', -- Status of notifications sent
    acknowledged_by UUID REFERENCES auth.users(id),
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance optimization
CREATE INDEX idx_pipeline_executions_pipeline_id ON pipeline_executions(pipeline_id);
CREATE INDEX idx_pipeline_executions_started_at ON pipeline_executions(started_at DESC);
CREATE INDEX idx_pipeline_executions_status ON pipeline_executions(status);
CREATE INDEX idx_step_executions_pipeline_execution ON step_executions(pipeline_execution_id);
CREATE INDEX idx_data_quality_checks_execution ON data_quality_checks(pipeline_execution_id);
CREATE INDEX idx_data_quality_checks_timestamp ON data_quality_checks(check_timestamp DESC);
CREATE INDEX idx_data_lineage_source ON data_lineage(source_dataset, source_table);
CREATE INDEX idx_data_lineage_target ON data_lineage(target_dataset, target_table);
CREATE INDEX idx_alert_instances_triggered ON alert_instances(triggered_at DESC);
CREATE INDEX idx_alert_instances_status ON alert_instances(status);

-- Row Level Security policies
ALTER TABLE data_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for data engineers and analysts
CREATE POLICY "Data engineers can manage pipelines" ON data_pipelines
    FOR ALL USING (auth.jwt() ->> 'role' IN ('data_engineer', 'system_admin'));

CREATE POLICY "Users can view their pipeline executions" ON pipeline_executions
    FOR SELECT USING (
        triggered_by = auth.uid() OR 
        auth.jwt() ->> 'role' IN ('data_engineer', 'system_admin')
    );

CREATE POLICY "Data analysts can read reports" ON bi_reports
    FOR SELECT USING (
        (access_control ->> 'public')::boolean = true OR
        auth.jwt() ->> 'role' IN ('data_analyst', 'data_engineer', 'system_admin')
    );
```

## API Endpoints

### Pipeline Management
```typescript
// GET /api/data-pipelines
interface GetPipelinesResponse {
  pipelines: {
    id: string;
    pipeline_name: string;
    pipeline_type: string;
    description: string;
    is_active: boolean;
    is_paused: boolean;
    last_execution: {
      execution_id: string;
      status: string;
      started_at: string;
      completed_at?: string;
      records_processed: number;
      data_quality_score?: number;
    } | null;
    next_scheduled_run?: string;
    success_rate_7d: number;
    avg_execution_time_minutes: number;
    created_at: string;
  }[];
  summary: {
    total_pipelines: number;
    active_pipelines: number;
    running_pipelines: number;
    failed_pipelines_24h: number;
  };
}

// POST /api/data-pipelines
interface CreatePipelineRequest {
  pipeline_name: string;
  pipeline_type: 'etl' | 'streaming' | 'reporting' | 'sync';
  description?: string;
  source_config: {
    source_id: string;
    query?: string;
    filters?: Record<string, any>;
    batch_size?: number;
  };
  destination_config: {
    destination_id: string;
    table_name: string;
    write_mode: 'append' | 'overwrite' | 'upsert';
    partition_by?: string[];
  };
  transformation_config?: {
    transformations: Array<{
      type: 'mapping' | 'aggregation' | 'filter' | 'enrichment';
      config: Record<string, any>;
    }>;
  };
  schedule_config?: {
    type: 'cron' | 'interval' | 'event';
    expression: string;
    timezone?: string;
  };
  quality_checks?: Array<{
    rule_id: string;
    threshold: number;
    action: 'warn' | 'fail' | 'skip';
  }>;
  alert_config?: {
    on_failure: boolean;
    on_quality_issues: boolean;
    notification_channels: string[];
  };
}

// PUT /api/data-pipelines/{pipeline_id}
interface UpdatePipelineRequest extends Partial<CreatePipelineRequest> {}

// POST /api/data-pipelines/{pipeline_id}/execute
interface ExecutePipelineRequest {
  execution_type?: 'manual' | 'retry';
  parameters?: Record<string, any>;
  dry_run?: boolean;
}

interface ExecutePipelineResponse {
  execution_id: string;
  pipeline_id: string;
  status: string;
  estimated_duration_minutes?: number;
  started_at: string;
}

// GET /api/data-pipelines/{pipeline_id}/executions
interface GetPipelineExecutionsResponse {
  executions: {
    id: string;
    execution_id: string;
    execution_type: string;
    started_at: string;
    completed_at?: string;
    status: string;
    records_processed: number;
    records_failed: number;
    data_quality_score?: number;
    duration_minutes?: number;
    triggered_by: string;
  }[];
  execution_stats: {
    total_executions: number;
    success_rate: number;
    avg_duration_minutes: number;
    total_records_processed: number;
  };
}

// GET /api/data-pipelines/{pipeline_id}/executions/{execution_id}/details
interface GetExecutionDetailsResponse {
  execution: {
    id: string;
    execution_id: string;
    pipeline_name: string;
    started_at: string;
    completed_at?: string;
    status: string;
    records_processed: number;
    data_quality_score?: number;
    performance_metrics: {
      total_duration_ms: number;
      extract_duration_ms: number;
      transform_duration_ms: number;
      load_duration_ms: number;
      peak_memory_usage_mb: number;
      avg_cpu_usage_percent: number;
    };
    error_details?: {
      error_type: string;
      error_message: string;
      failed_step: string;
      retry_count: number;
    };
  };
  steps: Array<{
    id: string;
    step_name: string;
    step_type: string;
    started_at?: string;
    completed_at?: string;
    status: string;
    records_in: number;
    records_out: number;
    processing_time_ms?: number;
    error_message?: string;
    transformation_stats?: Record<string, any>;
  }>;
  quality_checks: Array<{
    rule_name: string;
    rule_type: string;
    records_checked: number;
    records_passed: number;
    pass_rate: number;
    quality_score: number;
    status: string;
    sample_failures?: any[];
  }>;
}
```

### Data Quality Management
```typescript
// GET /api/data-quality/rules
interface GetQualityRulesResponse {
  rules: {
    id: string;
    rule_name: string;
    rule_type: string;
    target_table: string;
    target_column?: string;
    severity: string;
    is_active: boolean;
    recent_results: {
      pass_rate: number;
      quality_score: number;
      last_check: string;
    };
    created_at: string;
  }[];
  rule_summary: {
    total_rules: number;
    active_rules: number;
    rules_by_type: Record<string, number>;
    avg_quality_score: number;
  };
}

// POST /api/data-quality/rules
interface CreateQualityRuleRequest {
  rule_name: string;
  rule_type: 'completeness' | 'accuracy' | 'consistency' | 'validity' | 'uniqueness';
  target_table: string;
  target_column?: string;
  rule_expression: string;
  rule_config?: {
    parameters?: Record<string, any>;
    custom_logic?: string;
  };
  severity: 'info' | 'warning' | 'error' | 'critical';
  threshold_config: {
    pass_threshold: number; // Minimum pass rate to consider rule passed
    quality_weight: number; // Weight in overall quality score calculation
  };
  alert_on_failure: boolean;
}

// POST /api/data-quality/rules/{rule_id}/execute
interface ExecuteQualityRuleRequest {
  target_execution_id?: string; // Execute for specific pipeline execution
  sample_size?: number; // Number of records to check (for large datasets)
}

interface ExecuteQualityRuleResponse {
  check_id: string;
  rule_name: string;
  records_checked: number;
  records_passed: number;
  records_failed: number;
  pass_rate: number;
  quality_score: number;
  execution_time_ms: number;
  sample_failures: any[];
  remediation_suggestions: string[];
}

// GET /api/data-quality/dashboard
interface GetQualityDashboardResponse {
  overview: {
    overall_quality_score: number;
    total_checks_24h: number;
    failed_checks_24h: number;
    quality_trend: Array<{
      date: string;
      quality_score: number;
    }>;
  };
  top_quality_issues: Array<{
    table_name: string;
    rule_name: string;
    issue_type: string;
    failure_rate: number;
    impact_score: number;
    last_occurrence: string;
  }>;
  quality_by_source: Array<{
    source_name: string;
    quality_score: number;
    check_count: number;
    issue_count: number;
  }>;
  improvement_recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    description: string;
    estimated_impact: number;
    implementation_effort: string;
  }>;
}
```

### Data Lineage and Impact Analysis
```typescript
// GET /api/data-lineage/dataset/{dataset_name}
interface GetDataLineageResponse {
  dataset_info: {
    dataset_name: string;
    table_count: number;
    last_updated: string;
    data_freshness_score: number;
  };
  upstream_dependencies: Array<{
    source_dataset: string;
    source_table: string;
    transformation_type: string;
    pipeline_name: string;
    confidence_score: number;
    last_updated: string;
  }>;
  downstream_dependencies: Array<{
    target_dataset: string;
    target_table: string;
    transformation_type: string;
    pipeline_name: string;
    confidence_score: number;
    consumers: string[];
  }>;
  lineage_graph: {
    nodes: Array<{
      id: string;
      name: string;
      type: 'source' | 'transformation' | 'destination';
      dataset: string;
      table?: string;
      metadata: Record<string, any>;
    }>;
    edges: Array<{
      source: string;
      target: string;
      transformation: string;
      pipeline: string;
      confidence: number;
    }>;
  };
}

// POST /api/data-lineage/impact-analysis
interface ImpactAnalysisRequest {
  change_type: 'schema_change' | 'data_change' | 'source_removal' | 'transformation_change';
  affected_entities: Array<{
    type: 'dataset' | 'table' | 'column';
    name: string;
    change_details: Record<string, any>;
  }>;
  analysis_scope: 'immediate' | 'full_downstream' | 'full_upstream';
}

interface ImpactAnalysisResponse {
  analysis_id: string;
  impact_summary: {
    total_affected_pipelines: number;
    total_affected_datasets: number;
    total_affected_reports: number;
    critical_impacts: number;
    estimated_remediation_hours: number;
  };
  affected_pipelines: Array<{
    pipeline_name: string;
    impact_type: 'breaking' | 'degrading' | 'informational';
    impact_description: string;
    remediation_effort: 'low' | 'medium' | 'high';
    suggested_actions: string[];
  }>;
  affected_reports: Array<{
    report_name: string;
    impact_severity: 'low' | 'medium' | 'high' | 'critical';
    affected_metrics: string[];
    business_impact: string;
  }>;
  migration_plan: {
    phases: Array<{
      phase_name: string;
      duration_estimate: string;
      tasks: string[];
      dependencies: string[];
    }>;
    rollback_strategy: string;
    testing_requirements: string[];
  };
}
```

### Stream Processing Management
```typescript
// GET /api/data-streams/processors
interface GetStreamProcessorsResponse {
  processors: {
    id: string;
    processor_name: string;
    stream_source: string;
    stream_destination: string;
    is_active: boolean;
    current_lag: number;
    throughput_per_second: number;
    health_status: 'healthy' | 'degraded' | 'unhealthy';
    last_processed_offset: string;
    uptime_percentage: number;
    error_rate: number;
    created_at: string;
  }[];
  stream_summary: {
    total_processors: number;
    active_processors: number;
    total_throughput_per_second: number;
    avg_lag_seconds: number;
  };
}

// POST /api/data-streams/processors
interface CreateStreamProcessorRequest {
  processor_name: string;
  stream_source: string;
  stream_destination: string;
  processing_logic: {
    transformations: Array<{
      type: 'filter' | 'map' | 'aggregate' | 'enrich';
      config: Record<string, any>;
    }>;
    custom_code?: string; // For complex transformations
  };
  windowing_config?: {
    type: 'tumbling' | 'sliding' | 'session';
    size_seconds: number;
    advance_seconds?: number; // For sliding windows
    session_timeout_seconds?: number; // For session windows
  };
  scaling_config: {
    min_instances: number;
    max_instances: number;
    scale_up_threshold: number; // Lag threshold for scaling up
    scale_down_threshold: number;
  };
  error_handling: {
    strategy: 'retry' | 'dlq' | 'skip';
    max_retries?: number;
    dlq_topic?: string;
  };
}

// GET /api/data-streams/processors/{processor_id}/metrics
interface GetStreamProcessorMetricsResponse {
  current_metrics: {
    throughput_per_second: number;
    current_lag_seconds: number;
    error_rate_5min: number;
    cpu_usage_percent: number;
    memory_usage_mb: number;
    active_instances: number;
  };
  historical_metrics: {
    throughput: Array<{
      timestamp: string;
      messages_per_second: number;
    }>;
    lag: Array<{
      timestamp: string;
      lag_seconds: number;
    }>;
    errors: Array<{
      timestamp: string;
      error_count: number;
      error_rate: number;
    }>;
  };
  performance_analysis: {
    bottlenecks: Array<{
      component: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      suggested_action: string;
    }>;
    scaling_recommendations: Array<{
      metric: string;
      current_value: number;
      recommended_action: string;
      expected_improvement: string;
    }>;
  };
}
```

### Business Intelligence and Reporting
```typescript
// GET /api/bi-reports
interface GetBIReportsResponse {
  reports: {
    id: string;
    report_name: string;
    report_type: string;
    is_active: boolean;
    last_generated: string | null;
    generation_duration_ms: number | null;
    schedule_config: {
      type: string;
      expression: string;
      next_run?: string;
    } | null;
    access_level: 'public' | 'restricted' | 'private';
    created_at: string;
  }[];
  report_statistics: {
    total_reports: number;
    active_reports: number;
    reports_generated_24h: number;
    avg_generation_time_ms: number;
  };
}

// POST /api/bi-reports
interface CreateBIReportRequest {
  report_name: string;
  report_type: 'dashboard' | 'scheduled' | 'adhoc' | 'alert';
  data_sources: Array<{
    source_type: 'table' | 'query' | 'api';
    source_config: {
      table_name?: string;
      query?: string;
      api_endpoint?: string;
    };
    refresh_strategy: 'realtime' | 'scheduled' | 'manual';
  }>;
  report_config: {
    format: 'html' | 'pdf' | 'excel' | 'json';
    visualizations: Array<{
      type: 'table' | 'chart' | 'metric' | 'text';
      title: string;
      data_source: string;
      config: Record<string, any>;
    }>;
    filters?: Array<{
      column: string;
      operator: string;
      value: any;
      user_configurable: boolean;
    }>;
  };
  schedule_config?: {
    type: 'cron' | 'interval';
    expression: string;
    timezone: string;
  };
  delivery_config?: {
    channels: Array<{
      type: 'email' | 'slack' | 'webhook';
      config: Record<string, any>;
    }>;
    conditions?: Array<{
      metric: string;
      operator: string;
      value: any;
    }>;
  };
  access_control: {
    public: boolean;
    allowed_roles?: string[];
    allowed_users?: string[];
  };
  cache_config?: {
    enabled: boolean;
    ttl_minutes: number;
    cache_key_strategy: 'simple' | 'parameterized';
  };
}

// POST /api/bi-reports/{report_id}/generate
interface GenerateReportRequest {
  parameters?: Record<string, any>;
  format?: 'html' | 'pdf' | 'excel' | 'json';
  delivery_channels?: string[];
  cache_bypass?: boolean;
}

interface GenerateReportResponse {
  generation_id: string;
  report_id: string;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  estimated_completion_time?: string;
  download_url?: string; // Available when completed
  delivery_status?: Record<string, any>;
}

// GET /api/bi-reports/analytics
interface GetReportAnalyticsResponse {
  usage_statistics: {
    most_accessed_reports: Array<{
      report_name: string;
      access_count: number;
      unique_users: number;
    }>;
    report_generation_trends: Array<{
      date: string;
      reports_generated: number;
      avg_generation_time: number;
    }>;
    user_engagement: {
      total_unique_users: number;
      avg_reports_per_user: number;
      most_active_users: Array<{
        user_id: string;
        report_count: number;
      }>;
    };
  };
  performance_metrics: {
    avg_generation_time_by_type: Record<string, number>;
    cache_hit_rate: number;
    failed_generation_rate: number;
    resource_utilization: {
      avg_cpu_usage: number;
      avg_memory_usage: number;
      peak_concurrent_generations: number;
    };
  };
  optimization_insights: Array<{
    category: 'performance' | 'usage' | 'cost';
    insight: string;
    potential_impact: string;
    recommended_action: string;
  }>;
}
```

## React Components

### Data Pipeline Management Dashboard
```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Database, 
  GitBranch, 
  BarChart3, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Eye,
  Download
} from 'lucide-react';

interface Pipeline {
  id: string;
  pipeline_name: string;
  pipeline_type: string;
  description: string;
  is_active: boolean;
  is_paused: boolean;
  last_execution: {
    execution_id: string;
    status: string;
    started_at: string;
    completed_at?: string;
    records_processed: number;
    data_quality_score?: number;
  } | null;
  next_scheduled_run?: string;
  success_rate_7d: number;
  avg_execution_time_minutes: number;
}

interface QualityOverview {
  overall_quality_score: number;
  total_checks_24h: number;
  failed_checks_24h: number;
  quality_trend: Array<{
    date: string;
    quality_score: number;
  }>;
}

const DataPipelineDashboard: React.FC = () => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [qualityOverview, setQualityOverview] = useState<QualityOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [pipelinesRes, qualityRes] = await Promise.all([
        fetch('/api/data-pipelines'),
        fetch('/api/data-quality/dashboard')
      ]);

      if (!pipelinesRes.ok || !qualityRes.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const [pipelinesData, qualityData] = await Promise.all([
        pipelinesRes.json(),
        qualityRes.json()
      ]);

      setPipelines(pipelinesData.pipelines);
      setQualityOverview(qualityData.overview);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePipelineAction = async (pipelineId: string, action: 'pause' | 'resume' | 'execute') => {
    try {
      let endpoint = '';
      let method = 'POST';
      let body = {};

      switch (action) {
        case 'pause':
          endpoint = `/api/data-pipelines/${pipelineId}`;
          method = 'PUT';
          body = { is_paused: true };
          break;
        case 'resume':
          endpoint = `/api/data-pipelines/${pipelineId}`;
          method = 'PUT';
          body = { is_paused: false };
          break;
        case 'execute':
          endpoint = `/api/data-pipelines/${pipelineId}/execute`;
          body = { execution_type: 'manual' };
          break;
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} pipeline`);
      }

      await loadDashboardData(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} pipeline`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'running': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      case 'cancelled': return 'text-gray-600';
      default: return 'text-gray-500';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'running': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes.toFixed(0)}m`;
    return `${(minutes / 60).toFixed(1)}h`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading pipeline data...</p>
        </div>
      </div>
    );
  }

  const runningPipelines = pipelines.filter(p => p.last_execution?.status === 'running').length;
  const failedPipelines = pipelines.filter(p => p.last_execution?.status === 'failed').length;
  const avgSuccessRate = pipelines.reduce((sum, p) => sum + p.success_rate_7d, 0) / pipelines.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Data Pipeline Management</h1>
          <p className="text-gray-600 mt-1">
            Monitor and manage ETL pipelines, data quality, and processing workflows
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={loadDashboardData} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Database className="w-4 h-4 mr-2" />
            Create Pipeline
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pipelines</CardTitle>
            <Database className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{pipelines.length}</div>
            <p className="text-xs text-gray-600">
              {pipelines.filter(p => p.is_active).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running Now</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{runningPipelines}</div>
            <p className="text-xs text-gray-600">
              {failedPipelines} failed recently
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {avgSuccessRate.toFixed(1)}%
            </div>
            <Progress value={avgSuccessRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
            <CheckCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {qualityOverview ? `${qualityOverview.overall_quality_score.toFixed(0)}%` : 'N/A'}
            </div>
            <p className="text-xs text-gray-600">
              {qualityOverview ? `${qualityOverview.failed_checks_24h} issues today` : 'Loading...'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
          <TabsTrigger value="quality">Data Quality</TabsTrigger>
          <TabsTrigger value="streams">Streaming</TabsTrigger>
          <TabsTrigger value="lineage">Lineage</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6">
            {/* Recent Pipeline Executions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Pipeline Activity</CardTitle>
                <CardDescription>Latest pipeline executions and their status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pipelines
                    .filter(p => p.last_execution)
                    .sort((a, b) => 
                      new Date(b.last_execution!.started_at).getTime() - 
                      new Date(a.last_execution!.started_at).getTime()
                    )
                    .slice(0, 10)
                    .map((pipeline) => (
                      <div key={pipeline.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge className={`${getStatusBadgeColor(pipeline.last_execution!.status)} text-white`}>
                            {pipeline.last_execution!.status}
                          </Badge>
                          <div>
                            <div className="font-semibold">{pipeline.pipeline_name}</div>
                            <div className="text-sm text-gray-600">
                              {formatNumber(pipeline.last_execution!.records_processed)} records
                              {pipeline.last_execution!.data_quality_score && 
                                ` • ${pipeline.last_execution!.data_quality_score.toFixed(0)}% quality`
                              }
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div>{new Date(pipeline.last_execution!.started_at).toLocaleString()}</div>
                          {pipeline.last_execution!.completed_at && (
                            <div className="text-gray-600">
                              {formatDuration(
                                (new Date(pipeline.last_execution!.completed_at).getTime() - 
                                 new Date(pipeline.last_execution!.started_at).getTime()) / 60000
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pipelines" className="space-y-4">
          <div className="grid gap-4">
            {pipelines.map((pipeline) => (
              <Card key={pipeline.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{pipeline.pipeline_name}</CardTitle>
                      <CardDescription>{pipeline.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {pipeline.pipeline_type}
                      </Badge>
                      {pipeline.is_paused && (
                        <Badge variant="destructive">Paused</Badge>
                      )}
                      {!pipeline.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Last Status</label>
                      <div className={`font-medium ${getStatusColor(pipeline.last_execution?.status || 'unknown')}`}>
                        {pipeline.last_execution?.status?.toUpperCase() || 'NEVER RUN'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Success Rate (7d)</label>
                      <div className="font-medium">{pipeline.success_rate_7d.toFixed(1)}%</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Avg Duration</label>
                      <div className="font-medium">
                        {formatDuration(pipeline.avg_execution_time_minutes)}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Next Run</label>
                      <div className="text-sm">
                        {pipeline.next_scheduled_run ? 
                          new Date(pipeline.next_scheduled_run).toLocaleString() : 
                          'Manual only'
                        }
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-1" />
                      Details
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handlePipelineAction(pipeline.id, 'execute')}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Run Now
                    </Button>
                    {pipeline.is_paused ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handlePipelineAction(pipeline.id, 'resume')}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Resume
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handlePipelineAction(pipeline.id, 'pause')}
                      >
                        <Pause className="w-4 h-4 mr-1" />
                        Pause
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <Settings className="w-4 h-4 mr-1" />
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="quality">
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Data quality monitoring dashboard coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="streams">
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Real-time streaming pipeline management coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="lineage">
          <div className="text-center py-12">
            <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Data lineage and impact analysis coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Business intelligence reports management coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataPipelineDashboard;
```

## Integration Requirements

### MCP Server Usage
- **PostgreSQL MCP**: Execute pipeline configuration queries, execution history analysis, and data quality monitoring
- **Supabase MCP**: Manage real-time pipeline status, data streaming, and notification systems
- **Browser MCP**: Test data pipeline dashboards, validate report generation, and monitor execution workflows
- **Ref MCP**: Access data engineering best practices, ETL patterns, and modern data stack documentation

### Navigation Integration
```typescript
// Add to src/lib/navigation/navigationConfig.ts
{
  id: 'data-pipelines',
  label: 'Data Pipelines',
  href: '/admin/data-pipelines',
  icon: 'Database',
  roles: ['data_engineer', 'data_analyst', 'system_admin'],
  subItems: [
    {
      id: 'pipeline-overview',
      label: 'Pipeline Overview',
      href: '/admin/data-pipelines/overview',
      icon: 'BarChart3'
    },
    {
      id: 'pipeline-management',
      label: 'Pipeline Management',
      href: '/admin/data-pipelines/pipelines',
      icon: 'Settings'
    },
    {
      id: 'data-quality',
      label: 'Data Quality',
      href: '/admin/data-pipelines/quality',
      icon: 'CheckCircle'
    },
    {
      id: 'stream-processing',
      label: 'Stream Processing',
      href: '/admin/data-pipelines/streams',
      icon: 'Activity'
    },
    {
      id: 'data-lineage',
      label: 'Data Lineage',
      href: '/admin/data-pipelines/lineage',
      icon: 'GitBranch'
    },
    {
      id: 'bi-reports',
      label: 'BI Reports',
      href: '/admin/data-pipelines/reports',
      icon: 'BarChart3'
    }
  ]
}
```

## Testing Strategy

### Unit Testing
```typescript
// __tests__/DataPipelineService.test.ts
import { DataPipelineService } from '@/lib/data-pipelines/DataPipelineService';

describe('DataPipelineService', () => {
  let pipelineService: DataPipelineService;

  beforeEach(() => {
    pipelineService = new DataPipelineService();
  });

  test('should create ETL pipeline with transformations', async () => {
    const pipelineConfig = {
      pipeline_name: 'wedding-booking-etl',
      pipeline_type: 'etl' as const,
      description: 'Process wedding booking data',
      source_config: {
        source_id: 'wedding-api-db',
        query: 'SELECT * FROM bookings WHERE updated_at > :last_run',
        batch_size: 1000
      },
      destination_config: {
        destination_id: 'analytics-warehouse',
        table_name: 'fact_bookings',
        write_mode: 'upsert' as const
      },
      transformation_config: {
        transformations: [
          {
            type: 'mapping' as const,
            config: {
              mappings: {
                'booking_id': 'id',
                'venue_name': 'venue.name',
                'wedding_date': 'event_date'
              }
            }
          }
        ]
      },
      schedule_config: {
        type: 'cron',
        expression: '0 */4 * * *', // Every 4 hours
        timezone: 'UTC'
      }
    };

    const result = await pipelineService.createPipeline(pipelineConfig);
    expect(result.pipelineId).toBeDefined();
  });

  test('should execute pipeline and track quality metrics', async () => {
    const executionResult = await pipelineService.executePipeline('test-pipeline-id', {
      execution_type: 'manual',
      parameters: { start_date: '2024-01-01' }
    });

    expect(executionResult.execution_id).toBeDefined();
    expect(executionResult.status).toBe('running');

    // Wait for execution to complete (in real test, mock this)
    const finalStatus = await pipelineService.getExecutionStatus(executionResult.execution_id);
    expect(['completed', 'failed']).toContain(finalStatus.status);
  });

  test('should validate data quality rules', async () => {
    const qualityRule = {
      rule_name: 'venue-booking-completeness',
      rule_type: 'completeness' as const,
      target_table: 'wedding_bookings',
      target_column: 'venue_id',
      rule_expression: 'venue_id IS NOT NULL',
      severity: 'error' as const,
      threshold_config: {
        pass_threshold: 95,
        quality_weight: 0.8
      }
    };

    const result = await pipelineService.executeQualityRule(qualityRule);
    expect(result.quality_score).toBeGreaterThanOrEqual(0);
    expect(result.quality_score).toBeLessThanOrEqual(100);
  });
});
```

### Integration Testing with Browser MCP
```typescript
// __tests__/integration/data-pipeline-dashboard.test.ts
import { mcp_playwright } from '@/lib/testing/mcp-helpers';

describe('Data Pipeline Dashboard', () => {
  test('should display pipeline execution status', async () => {
    await mcp_playwright.browser_navigate({ 
      url: 'http://localhost:3000/admin/data-pipelines' 
    });

    const snapshot = await mcp_playwright.browser_snapshot();
    expect(snapshot).toContain('Total Pipelines');
    expect(snapshot).toContain('Running Now');
    expect(snapshot).toContain('Success Rate');
  });

  test('should allow pipeline execution', async () => {
    await mcp_playwright.browser_navigate({ 
      url: 'http://localhost:3000/admin/data-pipelines/pipelines' 
    });

    // Execute a pipeline
    await mcp_playwright.browser_click({
      element: 'Run Now button for test pipeline',
      ref: '[data-testid="execute-pipeline-btn"]'
    });

    // Verify execution started
    await mcp_playwright.browser_wait_for({ text: 'Pipeline execution started' });
    
    const screenshot = await mcp_playwright.browser_take_screenshot({
      filename: 'pipeline-execution-started.png'
    });
  });

  test('should show data quality metrics', async () => {
    await mcp_playwright.browser_navigate({ 
      url: 'http://localhost:3000/admin/data-pipelines/quality' 
    });

    const snapshot = await mcp_playwright.browser_snapshot();
    expect(snapshot).toContain('Data Quality');
    expect(snapshot).toContain('quality_score');
  });
});
```

### Performance Testing
```typescript
// __tests__/performance/pipeline-load-test.test.ts
describe('Pipeline Performance', () => {
  test('should handle concurrent pipeline executions', async () => {
    const pipelineService = new DataPipelineService();
    
    // Create multiple pipeline executions
    const executions = await Promise.all(
      Array(20).fill(null).map((_, i) =>
        pipelineService.executePipeline(`test-pipeline-${i}`, {
          execution_type: 'manual',
          parameters: { batch_id: i }
        })
      )
    );

    expect(executions.length).toBe(20);
    expect(executions.every(e => e.execution_id)).toBe(true);

    // Monitor execution performance
    const completionTimes: number[] = [];
    
    for (const execution of executions) {
      const startTime = Date.now();
      
      // Poll for completion
      let status = 'running';
      while (status === 'running') {
        const result = await pipelineService.getExecutionStatus(execution.execution_id);
        status = result.status;
        
        if (status === 'running') {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      completionTimes.push(Date.now() - startTime);
    }

    const avgCompletionTime = completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length;
    expect(avgCompletionTime).toBeLessThan(30000); // Under 30 seconds average
  });

  test('should maintain throughput under data quality load', async () => {
    const qualityService = new DataQualityService();
    
    // Execute multiple quality checks concurrently
    const qualityChecks = Array(50).fill(null).map((_, i) => ({
      rule_name: `performance-test-rule-${i}`,
      rule_type: 'completeness' as const,
      target_table: 'test_table',
      target_column: 'test_column',
      rule_expression: 'test_column IS NOT NULL',
      severity: 'warning' as const,
      threshold_config: { pass_threshold: 90, quality_weight: 1.0 }
    }));

    const startTime = Date.now();
    
    const results = await Promise.all(
      qualityChecks.map(rule => qualityService.executeQualityRule(rule))
    );
    
    const totalTime = Date.now() - startTime;
    const throughput = results.length / (totalTime / 1000); // Checks per second

    expect(throughput).toBeGreaterThan(5); // At least 5 checks per second
    expect(results.every(r => r.quality_score >= 0)).toBe(true);
  });
});
```

## Security Considerations

### Data Access Control
- **Role-based pipeline access**: Fine-grained permissions for pipeline creation, execution, and monitoring
- **Data source authentication**: Secure credential management for database and API connections
- **Audit logging**: Complete audit trail of all pipeline operations and data access
- **Data masking**: Automatic PII detection and masking in logs and error messages

### Pipeline Security
- **Secure transformations**: Sandboxed execution environment for custom transformation code
- **Input validation**: Comprehensive validation of pipeline configurations and data inputs
- **Resource limits**: CPU, memory, and execution time limits to prevent resource abuse
- **Network security**: Encrypted connections and network isolation for data transfers

## Performance Optimization

### Pipeline Execution Optimization
- **Parallel processing**: Automatic parallelization of independent pipeline steps
- **Resource scaling**: Dynamic resource allocation based on data volume and complexity
- **Caching strategies**: Intelligent caching of intermediate results and transformations
- **Connection pooling**: Efficient database connection management and reuse

### Data Quality Optimization
- **Sampling strategies**: Smart sampling for large dataset quality checks
- **Incremental validation**: Only validate changed data since last execution
- **Rule optimization**: Automatic optimization of quality rule expressions
- **Batch processing**: Efficient batch processing of quality checks

## Business Impact

### Wedding Data Insights
- **Real-time analytics**: Live wedding booking trends, vendor performance, and guest analytics
- **Predictive insights**: Forecasting wedding demand, seasonal trends, and resource needs
- **Quality assurance**: Ensuring wedding data accuracy for critical decision making
- **Vendor intelligence**: Automated vendor performance tracking and recommendation systems

### Operational Excellence
- **Automated reporting**: Scheduled delivery of key business metrics and KPIs
- **Data governance**: Comprehensive data lineage and impact analysis for compliance
- **Cost optimization**: Intelligent resource management and cost tracking
- **Scalability**: Automatic scaling during peak wedding seasons

## Maintenance and Monitoring

### Automated Operations
- **Health monitoring**: Continuous monitoring of pipeline health and data freshness
- **Auto-recovery**: Automatic retry and recovery mechanisms for failed pipelines
- **Resource management**: Dynamic scaling and resource optimization
- **Alert management**: Intelligent alerting with escalation and suppression policies

### Performance Monitoring
- **Execution metrics**: Detailed performance metrics and bottleneck identification
- **Quality trends**: Historical data quality trends and improvement tracking
- **Cost analysis**: Pipeline cost analysis and optimization recommendations
- **Capacity planning**: Predictive capacity planning based on usage patterns

## Documentation

### Pipeline Documentation
- **Auto-generated docs**: Automatic documentation generation from pipeline configurations
- **Data dictionaries**: Comprehensive data schema and transformation documentation
- **Integration guides**: Step-by-step guides for new data source integrations
- **Best practices**: Data pipeline design patterns and optimization guidelines

### Operational Documentation
- **Monitoring runbooks**: Pipeline monitoring and troubleshooting procedures
- **Incident response**: Data quality incident response and resolution procedures
- **Backup and recovery**: Data backup and disaster recovery procedures
- **Performance tuning**: Pipeline performance optimization and tuning guides

## Effort Estimation

### Development: 22-28 days
- **Database design and setup**: 3 days
- **Core pipeline orchestration engine**: 6 days
- **Data quality monitoring system**: 4 days
- **Stream processing integration**: 3 days
- **Business intelligence reporting**: 3 days
- **API endpoints development**: 2 days
- **React dashboard components**: 3-4 days

### Testing: 12-16 days
- **Unit tests for pipeline service**: 5 days
- **Integration tests with data sources**: 4 days
- **Performance and load testing**: 2 days
- **Browser MCP dashboard testing**: 1-2 days
- **End-to-end pipeline testing**: 2-3 days

### Documentation and Deployment: 6-8 days
- **Pipeline documentation**: 2 days
- **Operational documentation**: 2 days
- **Integration guides**: 1 day
- **Production deployment and configuration**: 2-3 days

**Total Estimated Effort: 40-52 days**

This comprehensive Data Pipeline Automation System provides WedSync with enterprise-grade data processing capabilities, ensuring reliable, scalable, and high-quality data flows across all wedding platform services while providing comprehensive analytics and business intelligence capabilities.