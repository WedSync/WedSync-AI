# WS-270: Infrastructure Monitoring System - Technical Specification

## Summary
A comprehensive infrastructure monitoring system for WedSync providing real-time server health monitoring, intelligent alerting, performance analytics, capacity planning, automated incident response, and proactive infrastructure optimization. This system ensures high availability and optimal performance of the wedding platform through advanced monitoring, predictive analytics, and automated remediation capabilities.

## Technical Requirements

### Core Functionality
- **Real-time Server Monitoring**: CPU, memory, disk, network, and application-level metrics collection with sub-minute granularity
- **Intelligent Alerting**: Machine learning-based anomaly detection with context-aware alerting and escalation management
- **Performance Analytics**: Historical trend analysis, performance benchmarking, and capacity forecasting
- **Service Discovery Integration**: Automatic discovery and monitoring of new services and infrastructure components
- **Automated Incident Response**: Self-healing capabilities with automated remediation workflows
- **Multi-environment Monitoring**: Unified monitoring across development, staging, and production environments
- **Business Impact Correlation**: Link infrastructure issues to business metrics and wedding operations

### Business Context
In the wedding industry, infrastructure downtime can ruin once-in-a-lifetime events. This monitoring system ensures WedSync's platform remains highly available during critical wedding moments, proactively identifies issues before they impact couples or vendors, and provides the reliability needed for managing thousands of concurrent wedding operations.

### User Stories

#### Wedding Platform Operations Team
> "When our infrastructure experiences issues during peak wedding season, I need immediate alerts with enough context to understand the business impact. The system should automatically attempt common fixes and provide clear escalation paths when human intervention is required. I need to see how infrastructure performance correlates with wedding booking success rates."

#### Development Teams
> "When deploying new features, I need confidence that our monitoring will catch performance degradations or resource leaks before they affect live weddings. The system should provide detailed metrics about how code changes impact infrastructure performance and automatically scale resources when needed."

#### Wedding Day Operations
> "During a wedding day with hundreds of active guests using our app, the monitoring system should ensure all services remain responsive. If issues arise, I need automated failover and immediate notifications so we can maintain seamless wedding coordination without technical interruptions."

## Database Schema

```sql
-- Infrastructure Components and Assets
CREATE TABLE infrastructure_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_name TEXT NOT NULL UNIQUE,
    asset_type TEXT NOT NULL, -- 'server', 'database', 'load_balancer', 'container', 'service'
    asset_category TEXT NOT NULL, -- 'compute', 'storage', 'network', 'application'
    environment TEXT NOT NULL, -- 'development', 'staging', 'production'
    location TEXT, -- Data center, region, availability zone
    provider TEXT, -- 'aws', 'gcp', 'azure', 'on-premises'
    configuration JSONB DEFAULT '{}', -- Asset-specific configuration
    tags JSONB DEFAULT '[]', -- Asset tags for organization and filtering
    parent_asset_id UUID REFERENCES infrastructure_assets(id), -- For hierarchical relationships
    dependencies JSONB DEFAULT '[]', -- Asset dependencies
    monitoring_config JSONB DEFAULT '{}', -- Monitoring-specific configuration
    is_critical BOOLEAN DEFAULT false, -- Critical for wedding operations
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Monitoring Agents and Data Collectors
CREATE TABLE monitoring_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name TEXT NOT NULL UNIQUE,
    agent_type TEXT NOT NULL, -- 'system', 'application', 'synthetic', 'custom'
    asset_id UUID REFERENCES infrastructure_assets(id) ON DELETE CASCADE,
    agent_version TEXT NOT NULL,
    agent_config JSONB NOT NULL, -- Agent configuration parameters
    collection_interval INTEGER DEFAULT 60, -- Collection interval in seconds
    retention_days INTEGER DEFAULT 90, -- Data retention period
    compression_enabled BOOLEAN DEFAULT true,
    encryption_enabled BOOLEAN DEFAULT true,
    health_status TEXT DEFAULT 'unknown', -- 'healthy', 'degraded', 'failed', 'unknown'
    last_heartbeat TIMESTAMPTZ,
    metrics_collected INTEGER DEFAULT 0, -- Total metrics collected
    bytes_transmitted BIGINT DEFAULT 0, -- Total data transmitted
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Metrics Collection and Storage
CREATE TABLE infrastructure_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES infrastructure_assets(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES monitoring_agents(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    metric_type TEXT NOT NULL, -- 'gauge', 'counter', 'histogram', 'summary'
    metric_value NUMERIC NOT NULL,
    metric_unit TEXT, -- 'percent', 'bytes', 'seconds', 'requests/sec', etc.
    metric_labels JSONB DEFAULT '{}', -- Additional metric dimensions
    collection_timestamp TIMESTAMPTZ NOT NULL,
    collection_method TEXT DEFAULT 'agent', -- 'agent', 'push', 'pull', 'synthetic'
    data_quality_score NUMERIC DEFAULT 1.0, -- Quality score (0-1)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Time-series partitioning for metrics (example for daily partitions)
CREATE TABLE infrastructure_metrics_daily (
    LIKE infrastructure_metrics INCLUDING ALL
) PARTITION BY RANGE (collection_timestamp);

-- Alert Rules and Thresholds
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT NOT NULL UNIQUE,
    rule_description TEXT,
    asset_filter JSONB DEFAULT '{}', -- Filter for which assets this rule applies to
    metric_conditions JSONB NOT NULL, -- Metric conditions that trigger alerts
    severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    alert_type TEXT DEFAULT 'threshold', -- 'threshold', 'anomaly', 'composite', 'absence'
    evaluation_window INTEGER DEFAULT 300, -- Evaluation window in seconds
    evaluation_frequency INTEGER DEFAULT 60, -- How often to evaluate in seconds
    threshold_config JSONB DEFAULT '{}', -- Threshold configuration
    anomaly_config JSONB DEFAULT '{}', -- Anomaly detection configuration
    suppression_config JSONB DEFAULT '{}', -- Alert suppression settings
    escalation_policy_id UUID REFERENCES escalation_policies(id),
    notification_channels JSONB DEFAULT '[]', -- Notification channel configurations
    auto_resolve_timeout INTEGER, -- Auto-resolve timeout in seconds
    runbook_url TEXT, -- Link to remediation runbook
    business_impact TEXT, -- Description of business impact
    is_enabled BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Alert Instances and History
CREATE TABLE alert_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES infrastructure_assets(id),
    alert_key TEXT NOT NULL, -- Unique key for grouping related alerts
    alert_title TEXT NOT NULL,
    alert_description TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- 'open', 'acknowledged', 'resolved', 'suppressed'
    trigger_value NUMERIC, -- Value that triggered the alert
    threshold_value NUMERIC, -- Threshold that was crossed
    context_data JSONB DEFAULT '{}', -- Additional context and metrics
    first_triggered_at TIMESTAMPTZ NOT NULL,
    last_triggered_at TIMESTAMPTZ NOT NULL,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_type TEXT, -- 'manual', 'auto', 'timeout'
    resolution_notes TEXT,
    escalation_level INTEGER DEFAULT 0, -- Current escalation level
    notification_status JSONB DEFAULT '{}', -- Status of notifications sent
    impact_assessment JSONB DEFAULT '{}', -- Business impact assessment
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Escalation Policies and Procedures
CREATE TABLE escalation_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_name TEXT NOT NULL UNIQUE,
    policy_description TEXT,
    escalation_steps JSONB NOT NULL, -- Array of escalation step configurations
    business_hours JSONB DEFAULT '{}', -- Business hours configuration
    holiday_schedule JSONB DEFAULT '{}', -- Holiday schedule configuration
    repeat_escalation BOOLEAN DEFAULT false,
    repeat_interval INTEGER, -- Repeat interval in minutes
    max_escalations INTEGER, -- Maximum number of escalations
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Synthetic Monitoring and Health Checks
CREATE TABLE synthetic_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_name TEXT NOT NULL UNIQUE,
    check_type TEXT NOT NULL, -- 'http', 'dns', 'tcp', 'ping', 'ssl', 'api'
    target_url TEXT,
    target_host TEXT,
    target_port INTEGER,
    check_config JSONB NOT NULL, -- Check-specific configuration
    expected_response JSONB DEFAULT '{}', -- Expected response criteria
    check_frequency INTEGER DEFAULT 60, -- Check frequency in seconds
    timeout_seconds INTEGER DEFAULT 10,
    retry_attempts INTEGER DEFAULT 3,
    locations JSONB DEFAULT '[]', -- Check locations/regions
    alert_on_failure BOOLEAN DEFAULT true,
    failure_threshold INTEGER DEFAULT 1, -- Failures before alerting
    success_threshold INTEGER DEFAULT 1, -- Successes to clear alert
    business_impact_score INTEGER DEFAULT 1, -- Business impact (1-10)
    is_enabled BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Synthetic Check Results
CREATE TABLE synthetic_check_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_id UUID REFERENCES synthetic_checks(id) ON DELETE CASCADE,
    check_timestamp TIMESTAMPTZ NOT NULL,
    location TEXT,
    status TEXT NOT NULL, -- 'success', 'failure', 'timeout', 'error'
    response_time_ms INTEGER,
    status_code INTEGER, -- HTTP status code if applicable
    response_size_bytes INTEGER,
    error_message TEXT,
    response_headers JSONB,
    response_body_sample TEXT, -- Sample of response body
    certificate_info JSONB, -- SSL certificate information
    dns_info JSONB, -- DNS resolution information
    network_info JSONB, -- Network timing breakdown
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Performance Baselines and Anomaly Detection
CREATE TABLE performance_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES infrastructure_assets(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    baseline_type TEXT DEFAULT 'statistical', -- 'statistical', 'seasonal', 'trend', 'custom'
    time_period TEXT NOT NULL, -- 'hourly', 'daily', 'weekly', 'monthly'
    baseline_config JSONB NOT NULL, -- Baseline calculation configuration
    statistical_data JSONB NOT NULL, -- Baseline statistics (mean, std, percentiles)
    seasonal_patterns JSONB DEFAULT '{}', -- Seasonal pattern data
    confidence_interval NUMERIC DEFAULT 0.95, -- Confidence interval for anomaly detection
    last_calculated TIMESTAMPTZ NOT NULL,
    next_calculation TIMESTAMPTZ NOT NULL,
    calculation_frequency INTEGER DEFAULT 86400, -- Recalculation frequency in seconds
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(asset_id, metric_name, time_period)
);

-- Automated Remediation Actions
CREATE TABLE remediation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_name TEXT NOT NULL UNIQUE,
    action_type TEXT NOT NULL, -- 'script', 'api_call', 'restart_service', 'scale_resource', 'failover'
    action_config JSONB NOT NULL, -- Action-specific configuration
    target_assets JSONB DEFAULT '[]', -- Assets this action can be applied to
    prerequisites JSONB DEFAULT '[]', -- Prerequisites for running this action
    success_criteria JSONB DEFAULT '{}', -- Criteria to determine success
    rollback_action_id UUID REFERENCES remediation_actions(id), -- Rollback action
    execution_timeout INTEGER DEFAULT 300, -- Execution timeout in seconds
    cooldown_period INTEGER DEFAULT 900, -- Cooldown period between executions
    max_executions_per_hour INTEGER DEFAULT 5, -- Rate limiting
    approval_required BOOLEAN DEFAULT false, -- Requires manual approval
    risk_level TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
    business_impact TEXT, -- Description of business impact
    runbook_reference TEXT, -- Reference to detailed runbook
    is_enabled BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Remediation Execution History
CREATE TABLE remediation_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID REFERENCES remediation_actions(id) ON DELETE CASCADE,
    alert_instance_id UUID REFERENCES alert_instances(id),
    execution_trigger TEXT NOT NULL, -- 'alert', 'manual', 'scheduled', 'api'
    triggered_by UUID REFERENCES auth.users(id),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed', 'timeout', 'cancelled'
    exit_code INTEGER,
    execution_output TEXT,
    error_message TEXT,
    execution_context JSONB DEFAULT '{}', -- Execution context and parameters
    success_verification JSONB DEFAULT '{}', -- Success verification results
    rollback_executed BOOLEAN DEFAULT false,
    rollback_successful BOOLEAN,
    performance_impact JSONB DEFAULT '{}', -- Impact on system performance
    business_impact JSONB DEFAULT '{}', -- Impact on business operations
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Capacity Planning and Forecasting
CREATE TABLE capacity_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES infrastructure_assets(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    forecast_horizon_days INTEGER NOT NULL,
    forecast_algorithm TEXT DEFAULT 'linear', -- 'linear', 'seasonal', 'arima', 'ml'
    historical_data_points INTEGER NOT NULL, -- Number of data points used
    forecast_values JSONB NOT NULL, -- Array of forecasted values with timestamps
    confidence_intervals JSONB DEFAULT '{}', -- Confidence intervals for forecasts
    trend_analysis JSONB DEFAULT '{}', -- Trend analysis results
    seasonal_analysis JSONB DEFAULT '{}', -- Seasonal analysis results
    capacity_thresholds JSONB DEFAULT '{}', -- Capacity warning/critical thresholds
    recommendations JSONB DEFAULT '[]', -- Capacity recommendations
    accuracy_score NUMERIC, -- Forecast accuracy score
    model_metadata JSONB DEFAULT '{}', -- Model training metadata
    calculated_at TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Dashboard and Visualization Configs
CREATE TABLE monitoring_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_name TEXT NOT NULL UNIQUE,
    dashboard_type TEXT DEFAULT 'operational', -- 'operational', 'executive', 'custom'
    dashboard_config JSONB NOT NULL, -- Complete dashboard configuration
    widget_configs JSONB DEFAULT '[]', -- Array of widget configurations
    refresh_interval INTEGER DEFAULT 30, -- Auto-refresh interval in seconds
    access_control JSONB DEFAULT '{}', -- Access control settings
    tags JSONB DEFAULT '[]', -- Dashboard tags
    is_public BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Maintenance Windows and Planned Downtime
CREATE TABLE maintenance_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    window_name TEXT NOT NULL,
    description TEXT,
    affected_assets JSONB DEFAULT '[]', -- Assets affected by maintenance
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    recurrence_config JSONB, -- Recurring maintenance configuration
    maintenance_type TEXT DEFAULT 'planned', -- 'planned', 'emergency'
    impact_level TEXT DEFAULT 'low', -- 'low', 'medium', 'high'
    notification_config JSONB DEFAULT '{}', -- Notification settings
    alert_suppression BOOLEAN DEFAULT true, -- Suppress alerts during window
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'active', 'completed', 'cancelled'
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    completion_notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance optimization
CREATE INDEX idx_infrastructure_metrics_asset_time ON infrastructure_metrics(asset_id, collection_timestamp DESC);
CREATE INDEX idx_infrastructure_metrics_name_time ON infrastructure_metrics(metric_name, collection_timestamp DESC);
CREATE INDEX idx_alert_instances_status ON alert_instances(status);
CREATE INDEX idx_alert_instances_severity ON alert_instances(severity);
CREATE INDEX idx_alert_instances_triggered_at ON alert_instances(first_triggered_at DESC);
CREATE INDEX idx_synthetic_check_results_check_time ON synthetic_check_results(check_id, check_timestamp DESC);
CREATE INDEX idx_remediation_executions_started_at ON remediation_executions(started_at DESC);
CREATE INDEX idx_capacity_forecasts_asset_metric ON capacity_forecasts(asset_id, metric_name);

-- Row Level Security policies
ALTER TABLE infrastructure_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthetic_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE remediation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_dashboards ENABLE ROW LEVEL SECURITY;

-- RLS policies for operations and monitoring teams
CREATE POLICY "Operations team can manage infrastructure" ON infrastructure_assets
    FOR ALL USING (auth.jwt() ->> 'role' IN ('ops_engineer', 'sre', 'system_admin'));

CREATE POLICY "Monitoring team can manage alerts" ON alert_rules
    FOR ALL USING (auth.jwt() ->> 'role' IN ('ops_engineer', 'sre', 'system_admin', 'developer'));

CREATE POLICY "Users can view relevant alerts" ON alert_instances
    FOR SELECT USING (
        auth.jwt() ->> 'role' IN ('ops_engineer', 'sre', 'system_admin', 'developer') OR
        EXISTS (
            SELECT 1 FROM infrastructure_assets ia 
            WHERE ia.id = alert_instances.asset_id 
            AND ia.created_by = auth.uid()
        )
    );
```

## API Endpoints

### Infrastructure Asset Management
```typescript
// GET /api/monitoring/assets
interface GetInfrastructureAssetsResponse {
  assets: {
    id: string;
    asset_name: string;
    asset_type: string;
    asset_category: string;
    environment: string;
    location?: string;
    provider?: string;
    is_critical: boolean;
    is_active: boolean;
    health_status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    last_metric_timestamp?: string;
    active_alerts: number;
    dependencies: string[];
    created_at: string;
  }[];
  asset_summary: {
    total_assets: number;
    healthy_assets: number;
    degraded_assets: number;
    unhealthy_assets: number;
    critical_assets: number;
  };
  environment_breakdown: Record<string, number>;
  asset_type_breakdown: Record<string, number>;
}

// POST /api/monitoring/assets
interface CreateInfrastructureAssetRequest {
  asset_name: string;
  asset_type: 'server' | 'database' | 'load_balancer' | 'container' | 'service';
  asset_category: 'compute' | 'storage' | 'network' | 'application';
  environment: 'development' | 'staging' | 'production';
  location?: string;
  provider?: 'aws' | 'gcp' | 'azure' | 'on-premises';
  configuration?: Record<string, any>;
  tags?: string[];
  parent_asset_id?: string;
  dependencies?: string[];
  monitoring_config?: {
    collection_interval?: number;
    retention_days?: number;
    custom_metrics?: string[];
  };
  is_critical?: boolean;
}

// PUT /api/monitoring/assets/{asset_id}
interface UpdateInfrastructureAssetRequest extends Partial<CreateInfrastructureAssetRequest> {}

// GET /api/monitoring/assets/{asset_id}/metrics
interface GetAssetMetricsResponse {
  asset_info: {
    id: string;
    asset_name: string;
    asset_type: string;
    environment: string;
  };
  current_metrics: {
    cpu_usage_percent?: number;
    memory_usage_percent?: number;
    disk_usage_percent?: number;
    network_io_mbps?: number;
    response_time_ms?: number;
    error_rate_percent?: number;
    request_rate_per_second?: number;
    last_updated: string;
  };
  metric_history: {
    time_range: {
      from: string;
      to: string;
    };
    metrics: Record<string, Array<{
      timestamp: string;
      value: number;
    }>>;
  };
  performance_indicators: {
    availability_percentage: number;
    mean_response_time: number;
    error_budget_remaining: number;
    performance_score: number;
  };
}

// GET /api/monitoring/assets/{asset_id}/health
interface GetAssetHealthResponse {
  asset_id: string;
  overall_health: 'healthy' | 'degraded' | 'unhealthy';
  health_score: number; // 0-100
  health_factors: Array<{
    factor: string;
    status: 'healthy' | 'warning' | 'critical';
    value: number;
    threshold: number;
    impact_weight: number;
    description: string;
  }>;
  active_alerts: Array<{
    alert_id: string;
    severity: string;
    title: string;
    duration_minutes: number;
  }>;
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high';
    category: string;
    description: string;
    estimated_impact: string;
  }>;
  health_trend: Array<{
    timestamp: string;
    health_score: number;
  }>;
}
```

### Alert Management
```typescript
// GET /api/monitoring/alerts/rules
interface GetAlertRulesResponse {
  rules: {
    id: string;
    rule_name: string;
    rule_description?: string;
    severity: string;
    alert_type: string;
    is_enabled: boolean;
    asset_filter: Record<string, any>;
    evaluation_frequency: number;
    escalation_policy_name?: string;
    recent_triggers: number;
    last_triggered?: string;
    created_at: string;
  }[];
  rule_summary: {
    total_rules: number;
    enabled_rules: number;
    rules_by_severity: Record<string, number>;
    rules_triggered_24h: number;
  };
}

// POST /api/monitoring/alerts/rules
interface CreateAlertRuleRequest {
  rule_name: string;
  rule_description?: string;
  asset_filter: {
    asset_types?: string[];
    environments?: string[];
    tags?: Record<string, string>;
    asset_names?: string[];
  };
  metric_conditions: Array<{
    metric_name: string;
    operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne';
    threshold: number;
    aggregation: 'avg' | 'max' | 'min' | 'sum' | 'count';
    time_window: number; // seconds
  }>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  alert_type?: 'threshold' | 'anomaly' | 'composite' | 'absence';
  evaluation_frequency?: number; // seconds
  threshold_config?: {
    consecutive_breaches?: number;
    recovery_threshold?: number;
  };
  anomaly_config?: {
    sensitivity: 'low' | 'medium' | 'high';
    direction: 'both' | 'up' | 'down';
    baseline_days: number;
  };
  suppression_config?: {
    suppression_period?: number; // seconds
    maintenance_windows?: boolean;
  };
  escalation_policy_id?: string;
  notification_channels: Array<{
    type: 'email' | 'slack' | 'pagerduty' | 'webhook';
    config: Record<string, any>;
  }>;
  auto_resolve_timeout?: number; // seconds
  runbook_url?: string;
  business_impact?: string;
}

// GET /api/monitoring/alerts/instances
interface GetAlertInstancesResponse {
  alerts: {
    id: string;
    alert_title: string;
    severity: string;
    status: string;
    asset_name: string;
    environment: string;
    trigger_value?: number;
    threshold_value?: number;
    duration_minutes: number;
    first_triggered_at: string;
    acknowledged_at?: string;
    acknowledged_by?: string;
    escalation_level: number;
    business_impact?: string;
  }[];
  alert_summary: {
    total_alerts: number;
    open_alerts: number;
    critical_alerts: number;
    acknowledged_alerts: number;
    avg_resolution_time_minutes?: number;
  };
  alert_trends: Array<{
    timestamp: string;
    alert_count: number;
    critical_count: number;
  }>;
}

// POST /api/monitoring/alerts/instances/{alert_id}/acknowledge
interface AcknowledgeAlertRequest {
  acknowledgment_note?: string;
  estimated_resolution_time?: number; // minutes
}

// POST /api/monitoring/alerts/instances/{alert_id}/resolve
interface ResolveAlertRequest {
  resolution_type: 'manual' | 'auto' | 'timeout';
  resolution_notes: string;
  root_cause?: string;
  remediation_applied?: string;
}

// GET /api/monitoring/alerts/analytics
interface GetAlertAnalyticsResponse {
  alert_statistics: {
    total_alerts_30d: number;
    avg_alerts_per_day: number;
    mean_time_to_acknowledge: number; // minutes
    mean_time_to_resolve: number; // minutes
    escalation_rate: number; // percentage
    false_positive_rate: number; // percentage
  };
  top_alerting_assets: Array<{
    asset_name: string;
    alert_count: number;
    critical_alerts: number;
    avg_resolution_time: number;
  }>;
  alert_patterns: Array<{
    pattern_type: string;
    description: string;
    frequency: number;
    impact_score: number;
    suggested_action: string;
  }>;
  noise_analysis: {
    noisy_rules: Array<{
      rule_name: string;
      trigger_frequency: number;
      resolution_rate: number;
      recommendation: string;
    }>;
    alert_storms: Array<{
      timestamp: string;
      duration_minutes: number;
      alert_count: number;
      affected_assets: number;
    }>;
  };
}
```

### Synthetic Monitoring
```typescript
// GET /api/monitoring/synthetic/checks
interface GetSyntheticChecksResponse {
  checks: {
    id: string;
    check_name: string;
    check_type: string;
    target_url?: string;
    target_host?: string;
    check_frequency: number;
    is_enabled: boolean;
    current_status: 'up' | 'down' | 'degraded';
    uptime_percentage: number;
    avg_response_time_ms: number;
    last_check: string;
    failure_count_24h: number;
    business_impact_score: number;
  }[];
  check_summary: {
    total_checks: number;
    healthy_checks: number;
    failing_checks: number;
    overall_uptime: number;
    avg_response_time: number;
  };
}

// POST /api/monitoring/synthetic/checks
interface CreateSyntheticCheckRequest {
  check_name: string;
  check_type: 'http' | 'dns' | 'tcp' | 'ping' | 'ssl' | 'api';
  target_url?: string;
  target_host?: string;
  target_port?: number;
  check_config: {
    // HTTP specific
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: string;
    follow_redirects?: boolean;
    // Expected response
    expected_status_codes?: number[];
    expected_content?: string;
    expected_response_time_ms?: number;
    // SSL specific
    certificate_days_warning?: number;
    // DNS specific
    dns_record_type?: string;
    expected_ip?: string;
  };
  check_frequency?: number; // seconds
  timeout_seconds?: number;
  retry_attempts?: number;
  locations?: string[]; // Check locations
  alert_on_failure?: boolean;
  failure_threshold?: number;
  success_threshold?: number;
  business_impact_score?: number; // 1-10
}

// GET /api/monitoring/synthetic/checks/{check_id}/results
interface GetSyntheticCheckResultsResponse {
  check_info: {
    id: string;
    check_name: string;
    check_type: string;
    target: string;
  };
  current_status: {
    status: 'up' | 'down' | 'degraded';
    response_time_ms?: number;
    status_code?: number;
    last_success: string;
    last_failure?: string;
    consecutive_failures: number;
  };
  performance_metrics: {
    uptime_percentage: number;
    avg_response_time_ms: number;
    p95_response_time_ms: number;
    total_checks: number;
    failed_checks: number;
    timeout_rate: number;
  };
  result_history: Array<{
    timestamp: string;
    status: string;
    response_time_ms?: number;
    status_code?: number;
    location?: string;
    error_message?: string;
  }>;
  availability_by_location: Array<{
    location: string;
    uptime_percentage: number;
    avg_response_time_ms: number;
  }>;
}

// POST /api/monitoring/synthetic/checks/{check_id}/test
interface TestSyntheticCheckResponse {
  test_timestamp: string;
  status: 'success' | 'failure';
  response_time_ms?: number;
  status_code?: number;
  response_headers?: Record<string, string>;
  response_body_preview?: string;
  error_message?: string;
  network_timing?: {
    dns_lookup_ms: number;
    connection_ms: number;
    tls_handshake_ms: number;
    first_byte_ms: number;
    download_ms: number;
  };
}
```

### Capacity Planning and Forecasting
```typescript
// GET /api/monitoring/capacity/forecasts
interface GetCapacityForecastsResponse {
  forecasts: Array<{
    id: string;
    asset_name: string;
    metric_name: string;
    forecast_horizon_days: number;
    current_value: number;
    forecasted_peak: number;
    capacity_threshold: number;
    utilization_trend: 'increasing' | 'stable' | 'decreasing';
    days_until_threshold: number | null;
    confidence_score: number;
    last_calculated: string;
  }>;
  capacity_alerts: Array<{
    asset_name: string;
    metric_name: string;
    alert_type: 'approaching_capacity' | 'rapid_growth' | 'anomaly';
    severity: 'warning' | 'critical';
    projected_date: string;
    recommendation: string;
  }>;
  growth_analysis: {
    fastest_growing_assets: Array<{
      asset_name: string;
      metric_name: string;
      growth_rate_percent: number;
      time_period: string;
    }>;
    resource_optimization_opportunities: Array<{
      asset_name: string;
      resource_type: string;
      current_utilization: number;
      optimization_potential: string;
      estimated_savings: string;
    }>;
  };
}

// POST /api/monitoring/capacity/forecasts
interface CreateCapacityForecastRequest {
  asset_id: string;
  metric_name: string;
  forecast_horizon_days: number;
  forecast_algorithm?: 'linear' | 'seasonal' | 'arima' | 'ml';
  capacity_thresholds: {
    warning_threshold: number;
    critical_threshold: number;
    maximum_capacity: number;
  };
  seasonal_factors?: {
    weekly_pattern: boolean;
    monthly_pattern: boolean;
    holiday_adjustments: boolean;
  };
  business_context?: {
    expected_events: Array<{
      event_name: string;
      date: string;
      expected_impact: number; // multiplier
    }>;
    growth_assumptions: {
      user_growth_rate?: number;
      transaction_growth_rate?: number;
    };
  };
}

// GET /api/monitoring/capacity/recommendations
interface GetCapacityRecommendationsResponse {
  immediate_actions: Array<{
    priority: 'high' | 'medium' | 'low';
    asset_name: string;
    resource_type: string;
    current_status: string;
    recommended_action: string;
    business_impact: string;
    implementation_effort: 'low' | 'medium' | 'high';
    estimated_cost: string;
    timeline: string;
  }>;
  optimization_opportunities: Array<{
    opportunity_type: 'rightsizing' | 'consolidation' | 'scheduling' | 'technology_upgrade';
    description: string;
    affected_assets: string[];
    potential_savings: {
      cost_savings: string;
      performance_improvement: string;
      efficiency_gain: string;
    };
    implementation_plan: string;
  }>;
  capacity_planning: {
    budget_requirements: Array<{
      time_period: string;
      resource_category: string;
      estimated_cost: string;
      business_justification: string;
    }>;
    scaling_timeline: Array<{
      milestone: string;
      target_date: string;
      required_capacity: Record<string, number>;
      dependencies: string[];
    }>;
  };
}
```

### Automated Remediation
```typescript
// GET /api/monitoring/remediation/actions
interface GetRemediationActionsResponse {
  actions: {
    id: string;
    action_name: string;
    action_type: string;
    target_assets: string[];
    risk_level: string;
    approval_required: boolean;
    execution_count_24h: number;
    success_rate: number;
    avg_execution_time_seconds: number;
    last_executed?: string;
    is_enabled: boolean;
    created_at: string;
  }[];
  action_statistics: {
    total_actions: number;
    enabled_actions: number;
    executions_24h: number;
    success_rate_24h: number;
    actions_by_risk_level: Record<string, number>;
  };
}

// POST /api/monitoring/remediation/actions
interface CreateRemediationActionRequest {
  action_name: string;
  action_type: 'script' | 'api_call' | 'restart_service' | 'scale_resource' | 'failover';
  action_config: {
    // Script execution
    script_path?: string;
    script_args?: string[];
    working_directory?: string;
    environment_variables?: Record<string, string>;
    // API call
    api_endpoint?: string;
    http_method?: string;
    headers?: Record<string, string>;
    request_body?: string;
    // Service management
    service_name?: string;
    service_action?: 'restart' | 'start' | 'stop';
    // Resource scaling
    resource_type?: string;
    scaling_action?: 'scale_up' | 'scale_down' | 'scale_to';
    target_capacity?: number;
  };
  target_assets: string[];
  prerequisites?: Array<{
    type: 'metric_condition' | 'service_status' | 'time_constraint';
    condition: Record<string, any>;
  }>;
  success_criteria: Array<{
    metric_name: string;
    operator: string;
    expected_value: number;
    timeout_seconds: number;
  }>;
  rollback_action_id?: string;
  execution_timeout?: number; // seconds
  cooldown_period?: number; // seconds
  max_executions_per_hour?: number;
  approval_required?: boolean;
  risk_level: 'low' | 'medium' | 'high';
  business_impact?: string;
  runbook_reference?: string;
}

// GET /api/monitoring/remediation/executions
interface GetRemediationExecutionsResponse {
  executions: {
    id: string;
    action_name: string;
    execution_trigger: string;
    asset_name?: string;
    started_at: string;
    completed_at?: string;
    status: string;
    duration_seconds?: number;
    success_verification: boolean;
    business_impact?: Record<string, any>;
    triggered_by?: string;
  }[];
  execution_summary: {
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    avg_execution_time_seconds: number;
    success_rate_7d: number;
  };
  execution_trends: Array<{
    date: string;
    total_executions: number;
    successful_executions: number;
  }>;
}

// POST /api/monitoring/remediation/actions/{action_id}/execute
interface ExecuteRemediationActionRequest {
  execution_trigger: 'manual' | 'alert' | 'scheduled';
  alert_instance_id?: string;
  target_asset_id?: string;
  execution_context?: Record<string, any>;
  force_execution?: boolean; // Skip cooldown and rate limiting
  dry_run?: boolean; // Test execution without making changes
}

interface ExecuteRemediationActionResponse {
  execution_id: string;
  action_name: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  estimated_completion_time?: string;
  execution_context: Record<string, any>;
}
```

## React Components

### Infrastructure Monitoring Dashboard
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
  Server, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  TrendingUp,
  Shield,
  Zap,
  Database,
  Network,
  RotateCcw,
  Settings,
  Eye,
  Play,
  Pause
} from 'lucide-react';

interface InfrastructureAsset {
  id: string;
  asset_name: string;
  asset_type: string;
  asset_category: string;
  environment: string;
  health_status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  active_alerts: number;
  is_critical: boolean;
  last_metric_timestamp?: string;
}

interface AlertInstance {
  id: string;
  alert_title: string;
  severity: string;
  status: string;
  asset_name: string;
  environment: string;
  duration_minutes: number;
  first_triggered_at: string;
  escalation_level: number;
}

const InfrastructureMonitoringDashboard: React.FC = () => {
  const [assets, setAssets] = useState<InfrastructureAsset[]>([]);
  const [alerts, setAlerts] = useState<AlertInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('all');

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [selectedEnvironment]);

  const loadDashboardData = async () => {
    try {
      const [assetsRes, alertsRes] = await Promise.all([
        fetch(`/api/monitoring/assets${selectedEnvironment !== 'all' ? `?environment=${selectedEnvironment}` : ''}`),
        fetch('/api/monitoring/alerts/instances?status=open')
      ]);

      if (!assetsRes.ok || !alertsRes.ok) {
        throw new Error('Failed to load monitoring data');
      }

      const [assetsData, alertsData] = await Promise.all([
        assetsRes.json(),
        alertsRes.json()
      ]);

      setAssets(assetsData.assets);
      setAlerts(alertsData.alerts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-red-400';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
    return `${(minutes / 1440).toFixed(1)}d`;
  };

  const getAssetIcon = (assetType: string) => {
    switch (assetType) {
      case 'server': return Server;
      case 'database': return Database;
      case 'load_balancer': return Network;
      case 'container': return Activity;
      case 'service': return Zap;
      default: return Server;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  const healthyAssets = assets.filter(a => a.health_status === 'healthy').length;
  const degradedAssets = assets.filter(a => a.health_status === 'degraded').length;
  const unhealthyAssets = assets.filter(a => a.health_status === 'unhealthy').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const highAlerts = alerts.filter(a => a.severity === 'high').length;

  const systemHealthPercentage = assets.length > 0 ? (healthyAssets / assets.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Infrastructure Monitoring</h1>
          <p className="text-gray-600 mt-1">
            Real-time monitoring of servers, services, and infrastructure health
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedEnvironment}
            onChange={(e) => setSelectedEnvironment(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Environments</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>
          <Button onClick={loadDashboardData} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Refresh
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

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <CheckCircle className={`h-4 w-4 ${systemHealthPercentage >= 90 ? 'text-green-600' : systemHealthPercentage >= 70 ? 'text-yellow-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${systemHealthPercentage >= 90 ? 'text-green-600' : systemHealthPercentage >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
              {systemHealthPercentage.toFixed(1)}%
            </div>
            <Progress value={systemHealthPercentage} className="mt-2" />
            <p className="text-xs text-gray-600 mt-1">
              {healthyAssets}/{assets.length} assets healthy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{alerts.length}</div>
            <p className="text-xs text-gray-600">
              {criticalAlerts} critical, {highAlerts} high
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Infrastructure Assets</CardTitle>
            <Server className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{assets.length}</div>
            <p className="text-xs text-gray-600">
              {assets.filter(a => a.is_critical).length} critical assets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues</CardTitle>
            <Shield className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {degradedAssets + unhealthyAssets}
            </div>
            <p className="text-xs text-gray-600">
              {unhealthyAssets} unhealthy, {degradedAssets} degraded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="synthetic">Synthetic Checks</TabsTrigger>
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
          <TabsTrigger value="remediation">Remediation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6">
            {/* Critical Alerts */}
            {alerts.filter(a => a.severity === 'critical').length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Critical Alerts
                  </CardTitle>
                  <CardDescription>Alerts requiring immediate attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {alerts
                      .filter(a => a.severity === 'critical')
                      .slice(0, 5)
                      .map((alert) => (
                        <div key={alert.id} className="flex items-center justify-between p-3 bg-red-50 border-l-4 border-red-500 rounded">
                          <div className="flex items-center gap-3">
                            <Badge className={`${getSeverityColor(alert.severity)} text-white`}>
                              {alert.severity.toUpperCase()}
                            </Badge>
                            <div>
                              <div className="font-semibold">{alert.alert_title}</div>
                              <div className="text-sm text-gray-600">
                                {alert.asset_name} • {alert.environment}
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <div className="font-medium">
                              {formatDuration(alert.duration_minutes)}
                            </div>
                            <div className="text-gray-600">
                              Level {alert.escalation_level}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Asset Health Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Asset Health Status</CardTitle>
                <CardDescription>Current health status of all monitored assets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {['production', 'staging', 'development']
                    .filter(env => selectedEnvironment === 'all' || selectedEnvironment === env)
                    .map((environment) => {
                      const envAssets = assets.filter(a => a.environment === environment);
                      const envHealthy = envAssets.filter(a => a.health_status === 'healthy').length;
                      const envTotal = envAssets.length;
                      const envHealthPercentage = envTotal > 0 ? (envHealthy / envTotal) * 100 : 0;

                      return (
                        <div key={environment} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="capitalize font-semibold">{environment}</div>
                            <Badge variant="outline">{envTotal} assets</Badge>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-32">
                              <Progress value={envHealthPercentage} />
                            </div>
                            <div className={`font-medium ${envHealthPercentage >= 90 ? 'text-green-600' : envHealthPercentage >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {envHealthPercentage.toFixed(0)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <div className="grid gap-4">
            {assets.map((asset) => {
              const IconComponent = getAssetIcon(asset.asset_type);
              return (
                <Card key={asset.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <IconComponent className="w-5 h-5" />
                        <div>
                          <CardTitle className="text-lg">{asset.asset_name}</CardTitle>
                          <CardDescription>
                            {asset.asset_type} • {asset.asset_category} • {asset.environment}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getHealthStatusColor(asset.health_status)} border-current`} variant="outline">
                          {asset.health_status}
                        </Badge>
                        {asset.is_critical && (
                          <Badge variant="destructive">Critical</Badge>
                        )}
                        {asset.active_alerts > 0 && (
                          <Badge className="bg-red-500 text-white">
                            {asset.active_alerts} alerts
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Health Status</label>
                        <div className={`font-medium ${getHealthStatusColor(asset.health_status)}`}>
                          {asset.health_status?.toUpperCase() || 'UNKNOWN'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Active Alerts</label>
                        <div className="font-medium">{asset.active_alerts}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Environment</label>
                        <div className="font-medium capitalize">{asset.environment}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Last Updated</label>
                        <div className="text-sm">
                          {asset.last_metric_timestamp ? 
                            new Date(asset.last_metric_timestamp).toLocaleString() : 
                            'No data'
                          }
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-1" />
                        View Metrics
                      </Button>
                      <Button size="sm" variant="outline">
                        <Activity className="w-4 h-4 mr-1" />
                        Health Check
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="w-4 h-4 mr-1" />
                        Configure
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Alert management interface coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="synthetic">
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Synthetic monitoring dashboard coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="capacity">
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Capacity planning interface coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="remediation">
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Automated remediation management coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InfrastructureMonitoringDashboard;
```

## Integration Requirements

### MCP Server Usage
- **PostgreSQL MCP**: Execute monitoring queries, metrics storage, and alert rule management
- **Supabase MCP**: Manage real-time monitoring data, alert notifications, and system health tracking
- **Browser MCP**: Test monitoring dashboards, validate alert workflows, and verify system health displays
- **Ref MCP**: Access monitoring best practices, observability patterns, and infrastructure management documentation

### Navigation Integration
```typescript
// Add to src/lib/navigation/navigationConfig.ts
{
  id: 'infrastructure-monitoring',
  label: 'Infrastructure',
  href: '/admin/monitoring',
  icon: 'Activity',
  roles: ['ops_engineer', 'sre', 'system_admin'],
  subItems: [
    {
      id: 'monitoring-overview',
      label: 'Overview',
      href: '/admin/monitoring/overview',
      icon: 'BarChart3'
    },
    {
      id: 'infrastructure-assets',
      label: 'Assets',
      href: '/admin/monitoring/assets',
      icon: 'Server'
    },
    {
      id: 'alert-management',
      label: 'Alerts',
      href: '/admin/monitoring/alerts',
      icon: 'AlertTriangle'
    },
    {
      id: 'synthetic-monitoring',
      label: 'Synthetic Checks',
      href: '/admin/monitoring/synthetic',
      icon: 'Clock'
    },
    {
      id: 'capacity-planning',
      label: 'Capacity Planning',
      href: '/admin/monitoring/capacity',
      icon: 'TrendingUp'
    },
    {
      id: 'automated-remediation',
      label: 'Auto Remediation',
      href: '/admin/monitoring/remediation',
      icon: 'Shield'
    }
  ]
}
```

## Testing Strategy

### Unit Testing
```typescript
// __tests__/MonitoringService.test.ts
import { MonitoringService } from '@/lib/monitoring/MonitoringService';

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;

  beforeEach(() => {
    monitoringService = new MonitoringService();
  });

  test('should register infrastructure asset with monitoring', async () => {
    const asset = {
      asset_name: 'web-server-01',
      asset_type: 'server' as const,
      asset_category: 'compute' as const,
      environment: 'production' as const,
      location: 'us-east-1a',
      provider: 'aws' as const,
      is_critical: true,
      monitoring_config: {
        collection_interval: 30,
        retention_days: 90
      }
    };

    const result = await monitoringService.registerAsset(asset);
    expect(result.assetId).toBeDefined();
  });

  test('should create alert rule with thresholds', async () => {
    const alertRule = {
      rule_name: 'high-cpu-usage',
      asset_filter: {
        asset_types: ['server'],
        environments: ['production']
      },
      metric_conditions: [{
        metric_name: 'cpu_usage_percent',
        operator: 'gt' as const,
        threshold: 80,
        aggregation: 'avg' as const,
        time_window: 300
      }],
      severity: 'high' as const,
      evaluation_frequency: 60,
      notification_channels: [{
        type: 'email' as const,
        config: { recipients: ['ops@wedsync.com'] }
      }]
    };

    const result = await monitoringService.createAlertRule(alertRule);
    expect(result.ruleId).toBeDefined();
  });

  test('should detect anomalies in metrics', async () => {
    const metrics = Array.from({ length: 100 }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 60000),
      value: 50 + Math.random() * 10 // Normal range 50-60
    }));

    // Add anomaly
    metrics.push({
      timestamp: new Date(),
      value: 95 // Anomalous value
    });

    const anomalies = await monitoringService.detectAnomalies(metrics, {
      sensitivity: 'medium',
      baseline_days: 7
    });

    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].value).toBe(95);
  });
});
```

### Integration Testing with Browser MCP
```typescript
// __tests__/integration/monitoring-dashboard.test.ts
import { mcp_playwright } from '@/lib/testing/mcp-helpers';

describe('Infrastructure Monitoring Dashboard', () => {
  test('should display system health overview', async () => {
    await mcp_playwright.browser_navigate({ 
      url: 'http://localhost:3000/admin/monitoring' 
    });

    const snapshot = await mcp_playwright.browser_snapshot();
    expect(snapshot).toContain('System Health');
    expect(snapshot).toContain('Active Alerts');
    expect(snapshot).toContain('Infrastructure Assets');
  });

  test('should show asset health details', async () => {
    await mcp_playwright.browser_navigate({ 
      url: 'http://localhost:3000/admin/monitoring/assets' 
    });

    // Click on an asset for details
    await mcp_playwright.browser_click({
      element: 'View Metrics button',
      ref: '[data-testid="view-metrics-btn"]'
    });

    // Verify metrics display
    await mcp_playwright.browser_wait_for({ text: 'CPU Usage' });
    
    const screenshot = await mcp_playwright.browser_take_screenshot({
      filename: 'asset-metrics-view.png'
    });
  });

  test('should handle alert acknowledgment', async () => {
    await mcp_playwright.browser_navigate({ 
      url: 'http://localhost:3000/admin/monitoring/alerts' 
    });

    // Acknowledge an alert
    await mcp_playwright.browser_click({
      element: 'Acknowledge alert button',
      ref: '[data-testid="acknowledge-alert-btn"]'
    });

    await mcp_playwright.browser_fill_form({
      fields: [{
        name: 'Acknowledgment Note',
        type: 'textbox',
        ref: '[data-testid="ack-note"]',
        value: 'Investigating high CPU usage on web server'
      }]
    });

    await mcp_playwright.browser_click({
      element: 'Submit acknowledgment',
      ref: '[data-testid="submit-ack"]'
    });

    // Verify acknowledgment
    await mcp_playwright.browser_wait_for({ text: 'Alert acknowledged' });
  });
});
```

### Performance Testing
```typescript
// __tests__/performance/monitoring-performance.test.ts
describe('Monitoring System Performance', () => {
  test('should handle high volume metrics ingestion', async () => {
    const monitoringService = new MonitoringService();
    
    // Simulate 1000 concurrent metric submissions
    const metricPromises = Array(1000).fill(null).map((_, i) =>
      monitoringService.submitMetric({
        asset_id: `asset-${i % 10}`, // 10 different assets
        metric_name: 'cpu_usage_percent',
        metric_value: Math.random() * 100,
        collection_timestamp: new Date()
      })
    );

    const startTime = Date.now();
    const results = await Promise.all(metricPromises);
    const processingTime = Date.now() - startTime;

    expect(results.every(r => r.success)).toBe(true);
    expect(processingTime).toBeLessThan(10000); // Under 10 seconds
  });

  test('should maintain alert evaluation performance', async () => {
    const alertService = new AlertService();
    
    // Create 100 alert rules
    const alertRules = Array(100).fill(null).map((_, i) => ({
      rule_name: `test-rule-${i}`,
      metric_conditions: [{
        metric_name: 'response_time_ms',
        operator: 'gt' as const,
        threshold: 1000,
        aggregation: 'avg' as const,
        time_window: 300
      }],
      severity: 'medium' as const,
      evaluation_frequency: 60
    }));

    const startTime = Date.now();
    
    // Evaluate all rules
    const evaluationResults = await Promise.all(
      alertRules.map(rule => alertService.evaluateAlertRule(rule))
    );
    
    const evaluationTime = Date.now() - startTime;
    
    expect(evaluationResults.length).toBe(100);
    expect(evaluationTime).toBeLessThan(5000); // Under 5 seconds
  });
});
```

## Security Considerations

### Access Control and Authentication
- **Role-based monitoring access**: Granular permissions for infrastructure monitoring and alerting
- **Secure metric collection**: Encrypted communication between monitoring agents and servers
- **Alert notification security**: Secure delivery of sensitive alert information
- **Audit logging**: Complete audit trail of all monitoring configuration changes

### Data Protection
- **Metric data encryption**: Encryption at rest and in transit for all monitoring data
- **Sensitive data filtering**: Automatic detection and filtering of sensitive information in logs
- **Access logging**: Detailed logging of all monitoring data access and queries
- **Data retention policies**: Automated data lifecycle management and secure deletion

## Performance Optimization

### Metrics Collection Optimization
- **Intelligent sampling**: Adaptive sampling rates based on system load and change rates
- **Data compression**: Efficient compression algorithms for metric storage and transmission
- **Batch processing**: Optimized batch processing of metrics to reduce overhead
- **Edge processing**: Local processing and aggregation at monitoring agents

### Alert Processing Optimization
- **Rule optimization**: Automatic optimization of alert rule queries and conditions
- **Intelligent suppression**: Smart alert suppression to reduce noise and alert fatigue
- **Escalation efficiency**: Efficient escalation processing with minimal latency
- **Notification batching**: Intelligent batching of notifications to reduce spam

## Business Impact

### Wedding Platform Reliability
- **99.9% uptime**: Proactive monitoring ensuring high availability during critical wedding events
- **Rapid issue detection**: Sub-minute detection of issues affecting wedding operations
- **Automated recovery**: Self-healing capabilities for common infrastructure issues
- **Business impact correlation**: Direct correlation between infrastructure health and wedding success metrics

### Operational Excellence
- **Reduced MTTR**: 60% reduction in mean time to resolution through automated alerting and remediation
- **Proactive capacity planning**: Predictive scaling to handle wedding season traffic spikes
- **Cost optimization**: Intelligent resource utilization tracking and optimization recommendations
- **Compliance reporting**: Automated compliance reporting for wedding data protection regulations

## Maintenance and Monitoring

### Automated Operations
- **Self-monitoring**: The monitoring system monitors itself for health and performance
- **Automatic scaling**: Dynamic scaling of monitoring infrastructure based on load
- **Data lifecycle management**: Automated archival and deletion of old monitoring data
- **Health checks**: Continuous health checks of all monitoring components

### Performance Monitoring
- **Monitoring metrics**: Performance metrics for the monitoring system itself
- **Alert effectiveness**: Tracking of alert accuracy, noise levels, and resolution times
- **Capacity utilization**: Monitoring system resource usage and optimization opportunities
- **Business metrics correlation**: Tracking correlation between infrastructure metrics and business KPIs

## Documentation

### Monitoring Documentation
- **Runbook automation**: Automated generation of troubleshooting runbooks from alert patterns
- **Metric documentation**: Auto-generated documentation of all collected metrics
- **Alert playbooks**: Standardized response procedures for common alert scenarios
- **Capacity planning guides**: Data-driven capacity planning documentation and recommendations

### Operational Documentation
- **Incident response procedures**: Detailed procedures for handling infrastructure incidents
- **Escalation procedures**: Clear escalation paths and contact information
- **Maintenance procedures**: Standard procedures for system maintenance and updates
- **Performance optimization guides**: Guidelines for optimizing monitoring system performance

## Effort Estimation

### Development: 18-24 days
- **Database design and setup**: 3 days
- **Core monitoring engine**: 5 days
- **Alert management system**: 4 days
- **Synthetic monitoring**: 2 days
- **Automated remediation**: 3 days
- **API endpoints development**: 2 days
- **React dashboard components**: 3-5 days

### Testing: 10-14 days
- **Unit tests for monitoring service**: 4 days
- **Integration tests with infrastructure**: 3 days
- **Performance and load testing**: 2 days
- **Browser MCP dashboard testing**: 1-2 days
- **Alert and remediation testing**: 2-3 days

### Documentation and Deployment: 5-7 days
- **Monitoring documentation**: 2 days
- **Operational runbooks**: 2 days
- **Production deployment and configuration**: 1-3 days

**Total Estimated Effort: 33-45 days**

This comprehensive Infrastructure Monitoring System provides WedSync with enterprise-grade monitoring capabilities, ensuring high availability, optimal performance, and proactive issue resolution for the wedding platform while providing complete visibility into system health and performance.