-- WARNING: This migration references tables that may not exist: journey_executions
-- Ensure these tables are created first

-- Journey Builder Metrics & Analytics Tables - Team D Round 2
-- Enhanced analytics infrastructure for Journey Builder metrics
-- Integration with Team B execution engine events and performance data

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================================
-- JOURNEY ANALYTICS SCHEMA
-- ============================================================================

-- Journey Execution Analytics Table
CREATE TABLE IF NOT EXISTS journey_execution_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL,
    execution_id UUID REFERENCES journey_executions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL,
    -- Time-based metrics
    execution_start_time TIMESTAMPTZ NOT NULL,
    execution_end_time TIMESTAMPTZ,
    total_execution_duration_ms INTEGER,
    queue_wait_time_ms INTEGER DEFAULT 0,
    -- Node execution metrics
    total_nodes INTEGER NOT NULL DEFAULT 0,
    completed_nodes INTEGER NOT NULL DEFAULT 0,
    failed_nodes INTEGER NOT NULL DEFAULT 0,
    skipped_nodes INTEGER NOT NULL DEFAULT 0,
    retry_count INTEGER NOT NULL DEFAULT 0,
    -- Performance metrics
    avg_node_execution_time_ms NUMERIC(10,2) NOT NULL DEFAULT 0,
    max_node_execution_time_ms INTEGER DEFAULT 0,
    min_node_execution_time_ms INTEGER DEFAULT 0,
    -- Business metrics
    journey_completion_rate NUMERIC(5,4) NOT NULL DEFAULT 0, -- 0.0 to 1.0000
    error_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    -- Journey categorization
    journey_type TEXT,
    journey_priority INTEGER NOT NULL DEFAULT 5,
    participant_tier TEXT,
    wedding_date TIMESTAMPTZ,
    days_to_wedding INTEGER,
    -- System metrics
    memory_usage_bytes BIGINT DEFAULT 0,
    cpu_usage_percent NUMERIC(5,2) DEFAULT 0,
    -- Metadata
    organization_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Node Performance Analytics Table
CREATE TABLE IF NOT EXISTS node_performance_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL,
    execution_id UUID REFERENCES journey_executions(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    node_type TEXT NOT NULL,
    node_name TEXT NOT NULL,
    -- Execution details
    execution_order INTEGER NOT NULL,
    execution_start_time TIMESTAMPTZ NOT NULL,
    execution_end_time TIMESTAMPTZ,
    execution_duration_ms INTEGER NOT NULL,
    -- Status and results
    status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'timeout', 'skipped', 'retry')),
    retry_attempt INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    error_type TEXT,
    -- Performance metrics
    memory_delta_bytes BIGINT DEFAULT 0,
    cpu_time_ms INTEGER DEFAULT 0,
    network_requests INTEGER DEFAULT 0,
    database_queries INTEGER DEFAULT 0,
    -- Business context
    business_impact TEXT CHECK (business_impact IN ('low', 'medium', 'high', 'critical')),
    user_visible BOOLEAN NOT NULL DEFAULT false,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journey Performance Trends Table
CREATE TABLE IF NOT EXISTS journey_performance_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL,
    trend_date DATE NOT NULL,
    hour_of_day INTEGER CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
    -- Volume metrics
    total_executions INTEGER NOT NULL DEFAULT 0,
    successful_executions INTEGER NOT NULL DEFAULT 0,
    failed_executions INTEGER NOT NULL DEFAULT 0,
    -- Performance metrics
    avg_execution_time_ms NUMERIC(10,2) NOT NULL DEFAULT 0,
    p50_execution_time_ms INTEGER DEFAULT 0,
    p95_execution_time_ms INTEGER DEFAULT 0,
    p99_execution_time_ms INTEGER DEFAULT 0,
    -- Error analysis
    error_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    timeout_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    retry_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    -- Queue metrics
    avg_queue_wait_time_ms NUMERIC(10,2) DEFAULT 0,
    max_queue_depth INTEGER DEFAULT 0,
    -- Resource utilization
    avg_memory_usage_mb NUMERIC(10,2) DEFAULT 0,
    avg_cpu_usage_percent NUMERIC(5,2) DEFAULT 0,
    -- Business metrics
    wedding_execution_count INTEGER DEFAULT 0,
    urgent_execution_count INTEGER DEFAULT 0,
    vip_execution_count INTEGER DEFAULT 0,
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(journey_id, trend_date, hour_of_day)
);

-- Real-time Performance Dashboard Table
CREATE TABLE IF NOT EXISTS journey_realtime_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Current system state
    active_executions INTEGER NOT NULL DEFAULT 0,
    queue_depth INTEGER NOT NULL DEFAULT 0,
    processing_rate NUMERIC(8,2) NOT NULL DEFAULT 0, -- executions per minute
    -- Performance indicators
    avg_execution_time_last_5min NUMERIC(10,2) DEFAULT 0,
    error_rate_last_5min NUMERIC(5,4) DEFAULT 0,
    timeout_rate_last_5min NUMERIC(5,4) DEFAULT 0,
    -- Resource metrics
    memory_usage_mb NUMERIC(10,2) DEFAULT 0,
    cpu_usage_percent NUMERIC(5,2) DEFAULT 0,
    disk_io_mb_per_sec NUMERIC(10,2) DEFAULT 0,
    -- Journey-specific metrics
    journey_metrics JSONB DEFAULT '{}', -- Per-journey breakdown
    node_type_metrics JSONB DEFAULT '{}', -- Per-node-type performance
    -- Health indicators
    system_health_score NUMERIC(3,2) DEFAULT 1.0, -- 0.0 to 1.0
    alerts_active INTEGER DEFAULT 0,
    circuit_breakers_open INTEGER DEFAULT 0,
    -- TTL for cleanup (keep only last 24 hours)
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

-- Journey Error Analytics Table
CREATE TABLE IF NOT EXISTS journey_error_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL,
    execution_id UUID REFERENCES journey_executions(id) ON DELETE SET NULL,
    node_id TEXT,
    node_type TEXT,
    -- Error details
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    error_code TEXT,
    -- Context
    participant_id UUID,
    participant_data JSONB DEFAULT '{}',
    execution_context JSONB DEFAULT '{}',
    -- Classification
    error_severity TEXT NOT NULL CHECK (error_severity IN ('low', 'medium', 'high', 'critical')),
    error_category TEXT, -- 'timeout', 'network', 'validation', 'business_rule', etc.
    recoverable BOOLEAN NOT NULL DEFAULT true,
    -- Resolution tracking
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolution_time TIMESTAMPTZ,
    resolution_method TEXT,
    resolution_notes TEXT,
    -- Frequency tracking
    occurrence_count INTEGER NOT NULL DEFAULT 1,
    first_occurrence TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_occurrence TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Impact assessment
    user_impact BOOLEAN NOT NULL DEFAULT false,
    business_impact TEXT CHECK (business_impact IN ('low', 'medium', 'high', 'critical')),
    revenue_impact_usd NUMERIC(12,2) DEFAULT 0,
    -- Metadata
    organization_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Business Intelligence Aggregations Table
CREATE TABLE IF NOT EXISTS journey_business_intelligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date_dimension DATE NOT NULL,
    journey_id UUID,
    organization_id UUID NOT NULL,
    -- Execution volume
    total_executions INTEGER NOT NULL DEFAULT 0,
    successful_executions INTEGER NOT NULL DEFAULT 0,
    failed_executions INTEGER NOT NULL DEFAULT 0,
    -- Time-based analysis
    avg_execution_time_minutes NUMERIC(8,2) DEFAULT 0,
    total_execution_time_hours NUMERIC(10,2) DEFAULT 0,
    -- Business metrics
    weddings_processed INTEGER DEFAULT 0,
    leads_converted INTEGER DEFAULT 0,
    revenue_generated_usd NUMERIC(12,2) DEFAULT 0,
    cost_per_execution_usd NUMERIC(8,2) DEFAULT 0,
    -- Efficiency metrics
    automation_rate NUMERIC(5,4) DEFAULT 0, -- Percentage of fully automated executions
    manual_intervention_rate NUMERIC(5,4) DEFAULT 0,
    sla_compliance_rate NUMERIC(5,4) DEFAULT 0,
    -- Quality metrics
    customer_satisfaction_score NUMERIC(3,2) DEFAULT 0,
    error_impact_score NUMERIC(5,2) DEFAULT 0,
    -- Predictive indicators
    trend_direction TEXT CHECK (trend_direction IN ('improving', 'stable', 'degrading')),
    predicted_volume_next_day INTEGER DEFAULT 0,
    capacity_utilization NUMERIC(5,4) DEFAULT 0,
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(date_dimension, journey_id, organization_id)
);

-- ============================================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ============================================================================

-- Journey Execution Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_journey_execution_analytics_journey_time 
    ON journey_execution_analytics(journey_id, execution_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_journey_execution_analytics_participant 
    ON journey_execution_analytics(participant_id, execution_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_journey_execution_analytics_org_time 
    ON journey_execution_analytics(organization_id, execution_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_journey_execution_analytics_completion_rate 
    ON journey_execution_analytics(journey_completion_rate) WHERE journey_completion_rate < 0.9;
CREATE INDEX IF NOT EXISTS idx_journey_execution_analytics_wedding_date 
    ON journey_execution_analytics(wedding_date) WHERE wedding_date IS NOT NULL;

-- Node Performance Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_node_performance_analytics_journey_node 
    ON node_performance_analytics(journey_id, node_id, execution_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_node_performance_analytics_type_status 
    ON node_performance_analytics(node_type, status, execution_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_node_performance_analytics_duration 
    ON node_performance_analytics(execution_duration_ms DESC) WHERE status = 'success';
CREATE INDEX IF NOT EXISTS idx_node_performance_analytics_failures 
    ON node_performance_analytics(node_type, error_type, execution_start_time DESC) WHERE status = 'failure';

-- Journey Performance Trends Indexes
CREATE INDEX IF NOT EXISTS idx_journey_performance_trends_journey_date 
    ON journey_performance_trends(journey_id, trend_date DESC, hour_of_day);
CREATE INDEX IF NOT EXISTS idx_journey_performance_trends_date_hour 
    ON journey_performance_trends(trend_date DESC, hour_of_day);
CREATE INDEX IF NOT EXISTS idx_journey_performance_trends_error_rate 
    ON journey_performance_trends(error_rate DESC) WHERE error_rate > 0.05;

-- Real-time Metrics Indexes
CREATE INDEX IF NOT EXISTS idx_journey_realtime_metrics_timestamp 
    ON journey_realtime_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_journey_realtime_metrics_health 
    ON journey_realtime_metrics(system_health_score ASC) WHERE system_health_score < 0.8;
CREATE INDEX IF NOT EXISTS idx_journey_realtime_metrics_expires 
    ON journey_realtime_metrics(expires_at);

-- Error Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_journey_error_analytics_journey_time 
    ON journey_error_analytics(journey_id, last_occurrence DESC);
CREATE INDEX IF NOT EXISTS idx_journey_error_analytics_type_severity 
    ON journey_error_analytics(error_type, error_severity, last_occurrence DESC);
CREATE INDEX IF NOT EXISTS idx_journey_error_analytics_unresolved 
    ON journey_error_analytics(resolved, error_severity, last_occurrence DESC) WHERE NOT resolved;
CREATE INDEX IF NOT EXISTS idx_journey_error_analytics_frequency 
    ON journey_error_analytics(occurrence_count DESC, last_occurrence DESC) WHERE occurrence_count > 5;

-- Business Intelligence Indexes
CREATE INDEX IF NOT EXISTS idx_journey_business_intelligence_date_org 
    ON journey_business_intelligence(date_dimension DESC, organization_id);
CREATE INDEX IF NOT EXISTS idx_journey_business_intelligence_journey_date 
    ON journey_business_intelligence(journey_id, date_dimension DESC);
CREATE INDEX IF NOT EXISTS idx_journey_business_intelligence_revenue 
    ON journey_business_intelligence(revenue_generated_usd DESC) WHERE revenue_generated_usd > 0;

-- ============================================================================
-- DATA AGGREGATION VIEWS
-- ============================================================================

-- Journey Performance Summary View
CREATE OR REPLACE VIEW journey_performance_summary AS
SELECT 
    j.id as journey_id,
    j.name as journey_name,
    j.organization_id,
    -- Volume metrics (last 30 days)
    COUNT(jea.id) as total_executions_30d,
    COUNT(jea.id) FILTER (WHERE jea.journey_completion_rate = 1.0) as successful_executions_30d,
    COUNT(jea.id) FILTER (WHERE jea.journey_completion_rate < 1.0) as failed_executions_30d,
    -- Performance metrics
    ROUND(AVG(jea.total_execution_duration_ms), 2) as avg_execution_time_ms,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY jea.total_execution_duration_ms), 2) as p50_execution_time_ms,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY jea.total_execution_duration_ms), 2) as p95_execution_time_ms,
    -- Quality metrics
    ROUND(AVG(jea.journey_completion_rate), 4) as avg_completion_rate,
    ROUND(AVG(jea.error_rate), 4) as avg_error_rate,
    ROUND(AVG(jea.queue_wait_time_ms), 2) as avg_queue_wait_time_ms,
    -- Business metrics
    COUNT(jea.id) FILTER (WHERE jea.wedding_date IS NOT NULL) as wedding_executions_30d,
    COUNT(jea.id) FILTER (WHERE jea.days_to_wedding <= 7) as urgent_executions_30d,
    COUNT(jea.id) FILTER (WHERE jea.participant_tier IN ('VIP', 'PREMIUM')) as vip_executions_30d,
    -- Latest execution
    MAX(jea.execution_start_time) as last_execution_time,
    -- Health indicators
    CASE 
        WHEN AVG(jea.journey_completion_rate) > 0.95 AND AVG(jea.error_rate) < 0.05 THEN 'excellent'
        WHEN AVG(jea.journey_completion_rate) > 0.85 AND AVG(jea.error_rate) < 0.10 THEN 'good'
        WHEN AVG(jea.journey_completion_rate) > 0.70 AND AVG(jea.error_rate) < 0.20 THEN 'fair'
        ELSE 'poor'
    END as health_status
FROM journeys j
LEFT JOIN journey_execution_analytics jea ON j.id = jea.journey_id 
    AND jea.execution_start_time >= NOW() - INTERVAL '30 days'
WHERE j.is_active = true
GROUP BY j.id, j.name, j.organization_id;

-- Node Performance Insights View
CREATE OR REPLACE VIEW node_performance_insights AS
SELECT 
    node_type,
    node_id,
    -- Volume metrics
    COUNT(*) as total_executions,
    COUNT(*) FILTER (WHERE status = 'success') as successful_executions,
    COUNT(*) FILTER (WHERE status = 'failure') as failed_executions,
    COUNT(*) FILTER (WHERE status = 'timeout') as timeout_executions,
    COUNT(*) FILTER (WHERE retry_attempt > 0) as retry_executions,
    -- Performance metrics
    ROUND(AVG(execution_duration_ms), 2) as avg_execution_time_ms,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY execution_duration_ms), 2) as p50_execution_time_ms,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_duration_ms), 2) as p95_execution_time_ms,
    MAX(execution_duration_ms) as max_execution_time_ms,
    MIN(execution_duration_ms) as min_execution_time_ms,
    -- Error analysis
    ROUND(COUNT(*) FILTER (WHERE status = 'failure')::NUMERIC / NULLIF(COUNT(*), 0), 4) as error_rate,
    ROUND(COUNT(*) FILTER (WHERE status = 'timeout')::NUMERIC / NULLIF(COUNT(*), 0), 4) as timeout_rate,
    ROUND(COUNT(*) FILTER (WHERE retry_attempt > 0)::NUMERIC / NULLIF(COUNT(*), 0), 4) as retry_rate,
    -- Most common error
    (SELECT error_type FROM node_performance_analytics npa2 
     WHERE npa2.node_type = npa.node_type AND npa2.status = 'failure' AND npa2.error_type IS NOT NULL
     GROUP BY error_type ORDER BY COUNT(*) DESC LIMIT 1) as most_common_error,
    -- Resource metrics
    ROUND(AVG(memory_delta_bytes) / 1024.0 / 1024.0, 2) as avg_memory_delta_mb,
    ROUND(AVG(cpu_time_ms), 2) as avg_cpu_time_ms,
    -- Business impact
    COUNT(*) FILTER (WHERE business_impact = 'critical') as critical_impact_executions,
    COUNT(*) FILTER (WHERE user_visible = true) as user_visible_executions,
    -- Time analysis
    MAX(execution_start_time) as last_execution_time,
    MIN(execution_start_time) as first_execution_time
FROM node_performance_analytics npa
WHERE execution_start_time >= NOW() - INTERVAL '7 days'
GROUP BY node_type, node_id
ORDER BY total_executions DESC, error_rate DESC;

-- Real-time System Health Dashboard View
CREATE OR REPLACE VIEW system_health_dashboard AS
SELECT 
    -- Current state (most recent metrics)
    (SELECT active_executions FROM journey_realtime_metrics 
     ORDER BY timestamp DESC LIMIT 1) as current_active_executions,
    (SELECT queue_depth FROM journey_realtime_metrics 
     ORDER BY timestamp DESC LIMIT 1) as current_queue_depth,
    (SELECT processing_rate FROM journey_realtime_metrics 
     ORDER BY timestamp DESC LIMIT 1) as current_processing_rate,
    (SELECT system_health_score FROM journey_realtime_metrics 
     ORDER BY timestamp DESC LIMIT 1) as current_health_score,
    -- Performance indicators (last hour average)
    (SELECT ROUND(AVG(avg_execution_time_last_5min), 2) 
     FROM journey_realtime_metrics 
     WHERE timestamp >= NOW() - INTERVAL '1 hour') as avg_execution_time_1h,
    (SELECT ROUND(AVG(error_rate_last_5min), 4) 
     FROM journey_realtime_metrics 
     WHERE timestamp >= NOW() - INTERVAL '1 hour') as avg_error_rate_1h,
    -- Resource utilization (current)
    (SELECT memory_usage_mb FROM journey_realtime_metrics 
     ORDER BY timestamp DESC LIMIT 1) as current_memory_usage_mb,
    (SELECT cpu_usage_percent FROM journey_realtime_metrics 
     ORDER BY timestamp DESC LIMIT 1) as current_cpu_usage_percent,
    -- Alert status
    (SELECT alerts_active FROM journey_realtime_metrics 
     ORDER BY timestamp DESC LIMIT 1) as active_alerts,
    (SELECT circuit_breakers_open FROM journey_realtime_metrics 
     ORDER BY timestamp DESC LIMIT 1) as circuit_breakers_open,
    -- Trends (last 4 hours)
    (SELECT CASE 
        WHEN CORR(EXTRACT(EPOCH FROM timestamp), processing_rate) > 0.3 THEN 'increasing'
        WHEN CORR(EXTRACT(EPOCH FROM timestamp), processing_rate) < -0.3 THEN 'decreasing'
        ELSE 'stable'
     END FROM journey_realtime_metrics 
     WHERE timestamp >= NOW() - INTERVAL '4 hours') as processing_rate_trend,
    (SELECT CASE 
        WHEN CORR(EXTRACT(EPOCH FROM timestamp), error_rate_last_5min) > 0.3 THEN 'increasing'
        WHEN CORR(EXTRACT(EPOCH FROM timestamp), error_rate_last_5min) < -0.3 THEN 'decreasing'
        ELSE 'stable'
     END FROM journey_realtime_metrics 
     WHERE timestamp >= NOW() - INTERVAL '4 hours') as error_rate_trend,
    -- Capacity indicators
    (SELECT ROUND(AVG(queue_depth), 0) 
     FROM journey_realtime_metrics 
     WHERE timestamp >= NOW() - INTERVAL '1 hour') as avg_queue_depth_1h,
    (SELECT MAX(queue_depth) 
     FROM journey_realtime_metrics 
     WHERE timestamp >= NOW() - INTERVAL '1 hour') as max_queue_depth_1h;

-- Business Performance Dashboard View
CREATE OR REPLACE VIEW business_performance_dashboard AS
SELECT 
    organization_id,
    -- Daily metrics (today vs yesterday)
    COALESCE(SUM(total_executions) FILTER (WHERE date_dimension = CURRENT_DATE), 0) as executions_today,
    COALESCE(SUM(total_executions) FILTER (WHERE date_dimension = CURRENT_DATE - 1), 0) as executions_yesterday,
    COALESCE(SUM(successful_executions) FILTER (WHERE date_dimension = CURRENT_DATE), 0) as successful_today,
    COALESCE(SUM(failed_executions) FILTER (WHERE date_dimension = CURRENT_DATE), 0) as failed_today,
    -- Success rate comparison
    ROUND(COALESCE(
        SUM(successful_executions) FILTER (WHERE date_dimension = CURRENT_DATE)::NUMERIC / 
        NULLIF(SUM(total_executions) FILTER (WHERE date_dimension = CURRENT_DATE), 0), 0
    ), 4) as success_rate_today,
    ROUND(COALESCE(
        SUM(successful_executions) FILTER (WHERE date_dimension = CURRENT_DATE - 1)::NUMERIC / 
        NULLIF(SUM(total_executions) FILTER (WHERE date_dimension = CURRENT_DATE - 1), 0), 0
    ), 4) as success_rate_yesterday,
    -- Business metrics
    COALESCE(SUM(weddings_processed) FILTER (WHERE date_dimension >= CURRENT_DATE - 6), 0) as weddings_processed_7d,
    COALESCE(SUM(leads_converted) FILTER (WHERE date_dimension >= CURRENT_DATE - 6), 0) as leads_converted_7d,
    COALESCE(SUM(revenue_generated_usd) FILTER (WHERE date_dimension >= CURRENT_DATE - 6), 0) as revenue_7d,
    -- Efficiency metrics (last 7 days)
    ROUND(AVG(automation_rate) FILTER (WHERE date_dimension >= CURRENT_DATE - 6), 4) as avg_automation_rate_7d,
    ROUND(AVG(sla_compliance_rate) FILTER (WHERE date_dimension >= CURRENT_DATE - 6), 4) as avg_sla_compliance_7d,
    ROUND(AVG(customer_satisfaction_score) FILTER (WHERE date_dimension >= CURRENT_DATE - 6), 2) as avg_satisfaction_7d,
    -- Performance trends
    (SELECT trend_direction FROM journey_business_intelligence jbi2 
     WHERE jbi2.organization_id = jbi.organization_id 
     AND date_dimension = CURRENT_DATE - 1 LIMIT 1) as performance_trend,
    -- Capacity planning
    ROUND(AVG(capacity_utilization) FILTER (WHERE date_dimension >= CURRENT_DATE - 6), 4) as avg_capacity_utilization_7d,
    MAX(predicted_volume_next_day) as predicted_volume_tomorrow
FROM journey_business_intelligence jbi
WHERE date_dimension >= CURRENT_DATE - 7
GROUP BY organization_id;

-- ============================================================================
-- AUTOMATED FUNCTIONS FOR ANALYTICS
-- ============================================================================

-- Function to aggregate daily performance trends
CREATE OR REPLACE FUNCTION aggregate_daily_performance_trends()
RETURNS void AS $$
BEGIN
    INSERT INTO journey_performance_trends (
        journey_id, trend_date, hour_of_day,
        total_executions, successful_executions, failed_executions,
        avg_execution_time_ms, p50_execution_time_ms, p95_execution_time_ms, p99_execution_time_ms,
        error_rate, timeout_rate, retry_rate,
        avg_queue_wait_time_ms, max_queue_depth,
        avg_memory_usage_mb, avg_cpu_usage_percent,
        wedding_execution_count, urgent_execution_count, vip_execution_count
    )
    SELECT 
        jea.journey_id,
        jea.execution_start_time::date as trend_date,
        EXTRACT(HOUR FROM jea.execution_start_time) as hour_of_day,
        -- Volume metrics
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE journey_completion_rate = 1.0) as successful_executions,
        COUNT(*) FILTER (WHERE journey_completion_rate < 1.0) as failed_executions,
        -- Performance metrics
        ROUND(AVG(total_execution_duration_ms), 2) as avg_execution_time_ms,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_execution_duration_ms), 2) as p50_execution_time_ms,
        ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_execution_duration_ms), 2) as p95_execution_time_ms,
        ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY total_execution_duration_ms), 2) as p99_execution_time_ms,
        -- Error rates
        ROUND(AVG(error_rate), 4) as error_rate,
        ROUND(COUNT(*) FILTER (WHERE total_execution_duration_ms > (
            SELECT avg_execution_time_ms * 3 FROM journey_performance_summary WHERE journey_id = jea.journey_id
        ))::NUMERIC / COUNT(*), 4) as timeout_rate,
        ROUND(AVG(retry_count), 4) as retry_rate,
        -- Queue metrics
        ROUND(AVG(queue_wait_time_ms), 2) as avg_queue_wait_time_ms,
        MAX(queue_wait_time_ms) / 1000 as max_queue_depth, -- Approximation
        -- Resource metrics
        ROUND(AVG(memory_usage_bytes) / 1024.0 / 1024.0, 2) as avg_memory_usage_mb,
        ROUND(AVG(cpu_usage_percent), 2) as avg_cpu_usage_percent,
        -- Business metrics
        COUNT(*) FILTER (WHERE wedding_date IS NOT NULL) as wedding_execution_count,
        COUNT(*) FILTER (WHERE days_to_wedding <= 7) as urgent_execution_count,
        COUNT(*) FILTER (WHERE participant_tier IN ('VIP', 'PREMIUM')) as vip_execution_count
    FROM journey_execution_analytics jea
    WHERE jea.execution_start_time >= CURRENT_DATE - 1
      AND jea.execution_start_time < CURRENT_DATE
      AND NOT EXISTS (
          SELECT 1 FROM journey_performance_trends jpt 
          WHERE jpt.journey_id = jea.journey_id 
            AND jpt.trend_date = jea.execution_start_time::date
            AND jpt.hour_of_day = EXTRACT(HOUR FROM jea.execution_start_time)
      )
    GROUP BY jea.journey_id, jea.execution_start_time::date, EXTRACT(HOUR FROM jea.execution_start_time);
    
    -- Update existing trend records
    UPDATE journey_performance_trends SET updated_at = NOW() 
    WHERE trend_date = CURRENT_DATE - 1;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate real-time system metrics
CREATE OR REPLACE FUNCTION update_realtime_metrics()
RETURNS void AS $$
DECLARE
    active_count integer;
    queue_count integer;
    current_processing_rate numeric;
    current_error_rate numeric;
    current_health_score numeric;
BEGIN
    -- Get current system state
    SELECT COUNT(*) INTO active_count FROM journey_executions WHERE status = 'running';
    SELECT COUNT(*) INTO queue_count FROM scheduled_executions WHERE status = 'pending';
    
    -- Calculate processing rate (executions per minute over last 5 minutes)
    SELECT COUNT(*)::numeric / 5.0 INTO current_processing_rate
    FROM journey_execution_analytics 
    WHERE execution_start_time >= NOW() - INTERVAL '5 minutes';
    
    -- Calculate error rate over last 5 minutes
    SELECT COALESCE(AVG(error_rate), 0) INTO current_error_rate
    FROM journey_execution_analytics 
    WHERE execution_start_time >= NOW() - INTERVAL '5 minutes';
    
    -- Calculate health score (weighted composite score)
    current_health_score := GREATEST(0.0, LEAST(1.0, 
        1.0 - (current_error_rate * 2.0) - 
        (CASE WHEN queue_count > 500 THEN 0.3 ELSE 0.0 END) -
        (CASE WHEN active_count > 40 THEN 0.2 ELSE 0.0 END)
    ));
    
    -- Insert real-time metrics
    INSERT INTO journey_realtime_metrics (
        active_executions,
        queue_depth,
        processing_rate,
        avg_execution_time_last_5min,
        error_rate_last_5min,
        timeout_rate_last_5min,
        system_health_score
    )
    SELECT 
        active_count,
        queue_count,
        current_processing_rate,
        COALESCE((SELECT AVG(total_execution_duration_ms) FROM journey_execution_analytics 
                 WHERE execution_start_time >= NOW() - INTERVAL '5 minutes'), 0),
        current_error_rate,
        COALESCE((SELECT COUNT(*)::numeric / NULLIF(COUNT(*), 0) FROM node_performance_analytics 
                 WHERE execution_start_time >= NOW() - INTERVAL '5 minutes' AND status = 'timeout'), 0),
        current_health_score;
        
    -- Clean up old real-time metrics
    DELETE FROM journey_realtime_metrics WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update business intelligence aggregations
CREATE OR REPLACE FUNCTION update_business_intelligence()
RETURNS void AS $$
BEGIN
    INSERT INTO journey_business_intelligence (
        date_dimension, journey_id, organization_id,
        total_executions, successful_executions, failed_executions,
        avg_execution_time_minutes, total_execution_time_hours,
        weddings_processed, leads_converted,
        automation_rate, manual_intervention_rate, sla_compliance_rate
    )
    SELECT 
        jea.execution_start_time::date as date_dimension,
        jea.journey_id,
        jea.organization_id,
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE journey_completion_rate = 1.0) as successful_executions,
        COUNT(*) FILTER (WHERE journey_completion_rate < 1.0) as failed_executions,
        ROUND(AVG(total_execution_duration_ms) / 60000.0, 2) as avg_execution_time_minutes,
        ROUND(SUM(total_execution_duration_ms) / 3600000.0, 2) as total_execution_time_hours,
        COUNT(*) FILTER (WHERE wedding_date IS NOT NULL) as weddings_processed,
        COUNT(*) FILTER (WHERE journey_completion_rate = 1.0 AND wedding_date IS NOT NULL) as leads_converted,
        ROUND(COUNT(*) FILTER (WHERE retry_count = 0)::numeric / COUNT(*), 4) as automation_rate,
        ROUND((SELECT COUNT(*)::numeric FROM manual_intervention_tasks mit 
               WHERE mit.created_at::date = jea.execution_start_time::date) / COUNT(*), 4) as manual_intervention_rate,
        ROUND(COUNT(*) FILTER (WHERE total_execution_duration_ms <= 300000)::numeric / COUNT(*), 4) as sla_compliance_rate
    FROM journey_execution_analytics jea
    WHERE jea.execution_start_time >= CURRENT_DATE - 1
      AND jea.execution_start_time < CURRENT_DATE
    GROUP BY jea.execution_start_time::date, jea.journey_id, jea.organization_id
    ON CONFLICT (date_dimension, journey_id, organization_id) 
    DO UPDATE SET 
        total_executions = EXCLUDED.total_executions,
        successful_executions = EXCLUDED.successful_executions,
        failed_executions = EXCLUDED.failed_executions,
        avg_execution_time_minutes = EXCLUDED.avg_execution_time_minutes,
        total_execution_time_hours = EXCLUDED.total_execution_time_hours,
        weddings_processed = EXCLUDED.weddings_processed,
        leads_converted = EXCLUDED.leads_converted,
        automation_rate = EXCLUDED.automation_rate,
        manual_intervention_rate = EXCLUDED.manual_intervention_rate,
        sla_compliance_rate = EXCLUDED.sla_compliance_rate,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on analytics tables
ALTER TABLE journey_execution_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_performance_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_realtime_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_error_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_business_intelligence ENABLE ROW LEVEL SECURITY;

-- RLS Policies (organization-based access)
CREATE POLICY "analytics_org_access" ON journey_execution_analytics
    FOR ALL USING (organization_id = auth.jwt() ->> 'organization_id');

CREATE POLICY "node_analytics_org_access" ON node_performance_analytics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM journey_execution_analytics jea 
            WHERE jea.execution_id = node_performance_analytics.execution_id 
            AND jea.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

CREATE POLICY "trends_org_access" ON journey_performance_trends
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_performance_trends.journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

CREATE POLICY "realtime_system_access" ON journey_realtime_metrics
    FOR SELECT USING (true); -- System-wide metrics, read-only for all authenticated users

CREATE POLICY "error_analytics_org_access" ON journey_error_analytics
    FOR ALL USING (organization_id = auth.jwt() ->> 'organization_id');

CREATE POLICY "business_intelligence_org_access" ON journey_business_intelligence
    FOR ALL USING (organization_id = auth.jwt() ->> 'organization_id');

-- ============================================================================
-- AUTOMATED TRIGGERS AND SCHEDULING
-- ============================================================================

-- Trigger to update updated_at timestamps
CREATE TRIGGER update_journey_execution_analytics_updated_at 
    BEFORE UPDATE ON journey_execution_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journey_performance_trends_updated_at 
    BEFORE UPDATE ON journey_performance_trends 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journey_error_analytics_updated_at 
    BEFORE UPDATE ON journey_error_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journey_business_intelligence_updated_at 
    BEFORE UPDATE ON journey_business_intelligence 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE journey_execution_analytics IS 'Comprehensive analytics for journey execution performance and business metrics';
COMMENT ON TABLE node_performance_analytics IS 'Detailed performance analytics for individual journey nodes';
COMMENT ON TABLE journey_performance_trends IS 'Time-series performance trends for capacity planning and optimization';
COMMENT ON TABLE journey_realtime_metrics IS 'Real-time system performance dashboard metrics';
COMMENT ON TABLE journey_error_analytics IS 'Error tracking and analysis for proactive issue resolution';
COMMENT ON TABLE journey_business_intelligence IS 'Business intelligence aggregations for executive reporting';

COMMENT ON VIEW journey_performance_summary IS 'Executive summary of journey performance across all key metrics';
COMMENT ON VIEW node_performance_insights IS 'Detailed node performance analysis for optimization decisions';
COMMENT ON VIEW system_health_dashboard IS 'Real-time system health monitoring dashboard';
COMMENT ON VIEW business_performance_dashboard IS 'Business performance KPIs and trends';

COMMENT ON FUNCTION aggregate_daily_performance_trends() IS 'Aggregates daily performance data for trend analysis';
COMMENT ON FUNCTION update_realtime_metrics() IS 'Updates real-time system metrics for monitoring dashboard';
COMMENT ON FUNCTION update_business_intelligence() IS 'Updates business intelligence aggregations for reporting';