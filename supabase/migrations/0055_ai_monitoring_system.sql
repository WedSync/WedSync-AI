-- AI Performance Monitoring and Alerting System
-- Migration: 0055_ai_monitoring_system.sql
-- Purpose: Create tables for AI performance metrics, alerts, and monitoring configuration

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- AI Performance Metrics Table
CREATE TABLE IF NOT EXISTS ai_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    component VARCHAR(50) NOT NULL CHECK (component IN ('semantic-analyzer', 'rice-scorer', 'content-pipeline', 'predictive-engine')),
    operation VARCHAR(100) NOT NULL,
    duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
    success BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    input_size INTEGER CHECK (input_size >= 0),
    output_size INTEGER CHECK (output_size >= 0),
    tokens_used INTEGER CHECK (tokens_used >= 0),
    cost_cents INTEGER CHECK (cost_cents >= 0),
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('free', 'starter', 'professional', 'scale', 'enterprise')),
    user_id UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_ai_metrics_component_created (component, created_at DESC),
    INDEX idx_ai_metrics_organization_created (organization_id, created_at DESC),
    INDEX idx_ai_metrics_success_created (success, created_at DESC),
    INDEX idx_ai_metrics_cost_created (cost_cents, created_at DESC)
);

-- Alert Configurations Table
CREATE TABLE IF NOT EXISTS ai_alert_configs (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    component VARCHAR(50) NOT NULL,
    metric VARCHAR(50) NOT NULL CHECK (metric IN ('response_time', 'error_rate', 'success_rate', 'cost', 'token_usage')),
    threshold_value DECIMAL(10,2) NOT NULL,
    comparison VARCHAR(20) NOT NULL CHECK (comparison IN ('greater_than', 'less_than', 'equals')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    notification_channels TEXT[] NOT NULL DEFAULT '{"database"}',
    cooldown_minutes INTEGER NOT NULL DEFAULT 15 CHECK (cooldown_minutes >= 0),
    conditions JSONB NOT NULL DEFAULT '{"time_window_minutes": 5, "min_samples": 1, "consecutive_breaches": 1}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_ai_alert_configs_component_enabled (component, enabled),
    INDEX idx_ai_alert_configs_severity_enabled (severity, enabled)
);

-- Alert Notifications Table
CREATE TABLE IF NOT EXISTS ai_alert_notifications (
    id VARCHAR(100) PRIMARY KEY,
    config_id VARCHAR(100) NOT NULL REFERENCES ai_alert_configs(id) ON DELETE CASCADE,
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    message TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_ai_alerts_config_triggered (config_id, triggered_at DESC),
    INDEX idx_ai_alerts_severity_triggered (severity, triggered_at DESC),
    INDEX idx_ai_alerts_resolved (resolved_at DESC NULLS FIRST),
    INDEX idx_ai_alerts_acknowledged (acknowledged, acknowledged_at DESC)
);

-- System Alerts Table (for general system alerts)
CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    component VARCHAR(100),
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_system_alerts_type_created (type, created_at DESC),
    INDEX idx_system_alerts_severity_created (severity, created_at DESC),
    INDEX idx_system_alerts_resolved (resolved, created_at DESC)
);

-- AI Component Status Table (for real-time health tracking)
CREATE TABLE IF NOT EXISTS ai_component_status (
    component VARCHAR(50) PRIMARY KEY CHECK (component IN ('semantic-analyzer', 'rice-scorer', 'content-pipeline', 'predictive-engine')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'warning', 'critical', 'down')),
    last_check_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_success_at TIMESTAMP WITH TIME ZONE,
    last_failure_at TIMESTAMP WITH TIME ZONE,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    metrics JSONB DEFAULT '{}',
    issues TEXT[] DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Index
    INDEX idx_ai_component_status_updated (status, updated_at DESC)
);

-- Wedding Day Performance Tracking Table
CREATE TABLE IF NOT EXISTS wedding_day_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    component VARCHAR(50) NOT NULL,
    total_requests INTEGER NOT NULL DEFAULT 0,
    successful_requests INTEGER NOT NULL DEFAULT 0,
    avg_response_time_ms DECIMAL(10,2),
    max_response_time_ms INTEGER,
    total_cost_cents INTEGER NOT NULL DEFAULT 0,
    total_tokens_used INTEGER NOT NULL DEFAULT 0,
    critical_incidents INTEGER NOT NULL DEFAULT 0,
    warning_incidents INTEGER NOT NULL DEFAULT 0,
    uptime_percentage DECIMAL(5,2) DEFAULT 100.00,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(date, component),
    CHECK (uptime_percentage >= 0 AND uptime_percentage <= 100),
    CHECK (successful_requests <= total_requests),
    
    -- Indexes
    INDEX idx_wedding_day_performance_date (date DESC),
    INDEX idx_wedding_day_performance_component_date (component, date DESC)
);

-- AI Budget Tracking Table
CREATE TABLE IF NOT EXISTS ai_budget_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    month_year DATE NOT NULL, -- First day of the month
    budget_limit_cents INTEGER NOT NULL CHECK (budget_limit_cents > 0),
    current_spend_cents INTEGER NOT NULL DEFAULT 0 CHECK (current_spend_cents >= 0),
    projected_spend_cents INTEGER DEFAULT 0,
    alert_threshold_percentage INTEGER DEFAULT 80 CHECK (alert_threshold_percentage BETWEEN 1 AND 100),
    budget_exceeded_at TIMESTAMP WITH TIME ZONE,
    notifications_sent JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(organization_id, month_year),
    
    -- Indexes
    INDEX idx_ai_budget_org_month (organization_id, month_year DESC),
    INDEX idx_ai_budget_exceeded (budget_exceeded_at DESC NULLS LAST)
);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE ai_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_alert_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_alert_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_component_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_day_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_budget_tracking ENABLE ROW LEVEL SECURITY;

-- AI Performance Metrics Policies
CREATE POLICY "ai_performance_metrics_select" ON ai_performance_metrics
    FOR SELECT USING (
        auth.role() = 'service_role' OR
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

CREATE POLICY "ai_performance_metrics_insert" ON ai_performance_metrics
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Alert Configs Policies (Admin only)
CREATE POLICY "ai_alert_configs_admin" ON ai_alert_configs
    FOR ALL USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Alert Notifications Policies (Admin only)
CREATE POLICY "ai_alert_notifications_admin" ON ai_alert_notifications
    FOR ALL USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- System Alerts Policies (Admin only)
CREATE POLICY "system_alerts_admin" ON system_alerts
    FOR ALL USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Component Status Policies (Read-only for admins)
CREATE POLICY "ai_component_status_select" ON ai_component_status
    FOR SELECT USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

CREATE POLICY "ai_component_status_update" ON ai_component_status
    FOR UPDATE USING (auth.role() = 'service_role');

-- Wedding Day Performance Policies (Admin only)
CREATE POLICY "wedding_day_performance_admin" ON wedding_day_performance
    FOR ALL USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Budget Tracking Policies
CREATE POLICY "ai_budget_tracking_select" ON ai_budget_tracking
    FOR SELECT USING (
        auth.role() = 'service_role' OR
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

CREATE POLICY "ai_budget_tracking_insert" ON ai_budget_tracking
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

CREATE POLICY "ai_budget_tracking_update" ON ai_budget_tracking
    FOR UPDATE USING (
        auth.role() = 'service_role' OR
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Functions for automated monitoring

-- Function to update component status
CREATE OR REPLACE FUNCTION update_ai_component_status(
    p_component VARCHAR(50),
    p_status VARCHAR(20),
    p_metrics JSONB DEFAULT '{}',
    p_issues TEXT[] DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO ai_component_status (
        component, status, last_check_at, metrics, issues, updated_at
    ) VALUES (
        p_component, p_status, CURRENT_TIMESTAMP, p_metrics, p_issues, CURRENT_TIMESTAMP
    )
    ON CONFLICT (component) 
    DO UPDATE SET
        status = EXCLUDED.status,
        last_check_at = EXCLUDED.last_check_at,
        metrics = EXCLUDED.metrics,
        issues = EXCLUDED.issues,
        updated_at = EXCLUDED.updated_at,
        consecutive_failures = CASE 
            WHEN EXCLUDED.status IN ('critical', 'down') 
            THEN ai_component_status.consecutive_failures + 1
            ELSE 0
        END,
        last_success_at = CASE 
            WHEN EXCLUDED.status = 'healthy' 
            THEN CURRENT_TIMESTAMP
            ELSE ai_component_status.last_success_at
        END,
        last_failure_at = CASE 
            WHEN EXCLUDED.status IN ('critical', 'down') 
            THEN CURRENT_TIMESTAMP
            ELSE ai_component_status.last_failure_at
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to aggregate wedding day performance
CREATE OR REPLACE FUNCTION aggregate_wedding_day_performance()
RETURNS VOID AS $$
DECLARE
    r RECORD;
    wedding_date DATE;
BEGIN
    -- Get yesterday's date (or current date if it's Sunday, for Saturday weddings)
    wedding_date := CASE 
        WHEN EXTRACT(DOW FROM CURRENT_DATE) = 0 THEN CURRENT_DATE - INTERVAL '1 day' -- Sunday, get Saturday
        ELSE CURRENT_DATE - INTERVAL '1 day' -- Any other day, get previous day
    END;
    
    -- Only process if it's a Saturday (wedding day)
    IF EXTRACT(DOW FROM wedding_date) = 6 THEN
        -- Aggregate metrics for each component
        FOR r IN 
            SELECT 
                component,
                COUNT(*) as total_requests,
                COUNT(CASE WHEN success THEN 1 END) as successful_requests,
                AVG(CASE WHEN success THEN duration_ms END) as avg_response_time_ms,
                MAX(duration_ms) as max_response_time_ms,
                SUM(COALESCE(cost_cents, 0)) as total_cost_cents,
                SUM(COALESCE(tokens_used, 0)) as total_tokens_used
            FROM ai_performance_metrics 
            WHERE DATE(created_at) = wedding_date
            GROUP BY component
        LOOP
            -- Insert or update wedding day performance record
            INSERT INTO wedding_day_performance (
                date, component, total_requests, successful_requests,
                avg_response_time_ms, max_response_time_ms, 
                total_cost_cents, total_tokens_used,
                uptime_percentage
            ) VALUES (
                wedding_date, r.component, r.total_requests, r.successful_requests,
                r.avg_response_time_ms, r.max_response_time_ms,
                r.total_cost_cents, r.total_tokens_used,
                CASE WHEN r.total_requests > 0 
                     THEN (r.successful_requests::DECIMAL / r.total_requests * 100)
                     ELSE 100.00 
                END
            )
            ON CONFLICT (date, component)
            DO UPDATE SET
                total_requests = EXCLUDED.total_requests,
                successful_requests = EXCLUDED.successful_requests,
                avg_response_time_ms = EXCLUDED.avg_response_time_ms,
                max_response_time_ms = EXCLUDED.max_response_time_ms,
                total_cost_cents = EXCLUDED.total_cost_cents,
                total_tokens_used = EXCLUDED.total_tokens_used,
                uptime_percentage = EXCLUDED.uptime_percentage;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update budget tracking
CREATE OR REPLACE FUNCTION update_ai_budget_tracking()
RETURNS VOID AS $$
DECLARE
    r RECORD;
    current_month DATE;
BEGIN
    current_month := date_trunc('month', CURRENT_DATE)::DATE;
    
    -- Update budget tracking for each organization
    FOR r IN
        SELECT 
            organization_id,
            SUM(COALESCE(cost_cents, 0)) as month_spend
        FROM ai_performance_metrics
        WHERE DATE_TRUNC('month', created_at) = current_month
          AND organization_id IS NOT NULL
        GROUP BY organization_id
    LOOP
        -- Update current spend
        UPDATE ai_budget_tracking
        SET 
            current_spend_cents = r.month_spend,
            updated_at = CURRENT_TIMESTAMP,
            budget_exceeded_at = CASE 
                WHEN r.month_spend > budget_limit_cents AND budget_exceeded_at IS NULL
                THEN CURRENT_TIMESTAMP
                ELSE budget_exceeded_at
            END
        WHERE organization_id = r.organization_id 
          AND month_year = current_month;
        
        -- Insert if doesn't exist (with default budget)
        IF NOT FOUND THEN
            INSERT INTO ai_budget_tracking (
                organization_id, month_year, budget_limit_cents, current_spend_cents
            ) VALUES (
                r.organization_id, current_month, 10000, r.month_spend -- Default $100 budget
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize default component status
INSERT INTO ai_component_status (component, status, last_check_at) VALUES
    ('semantic-analyzer', 'healthy', CURRENT_TIMESTAMP),
    ('rice-scorer', 'healthy', CURRENT_TIMESTAMP),
    ('content-pipeline', 'healthy', CURRENT_TIMESTAMP),
    ('predictive-engine', 'healthy', CURRENT_TIMESTAMP)
ON CONFLICT (component) DO NOTHING;

-- Create scheduled jobs for automated monitoring (if pg_cron is available)
-- Note: These would typically be set up by the system administrator

-- Add comments for documentation
COMMENT ON TABLE ai_performance_metrics IS 'Records performance metrics for all AI components';
COMMENT ON TABLE ai_alert_configs IS 'Configuration for AI performance alerts';
COMMENT ON TABLE ai_alert_notifications IS 'Active and historical alert notifications';
COMMENT ON TABLE system_alerts IS 'General system alerts and incidents';
COMMENT ON TABLE ai_component_status IS 'Real-time health status of AI components';
COMMENT ON TABLE wedding_day_performance IS 'Special tracking for Saturday (wedding day) performance';
COMMENT ON TABLE ai_budget_tracking IS 'Monthly budget tracking and cost controls for AI usage';

COMMENT ON FUNCTION update_ai_component_status IS 'Updates the health status of an AI component';
COMMENT ON FUNCTION aggregate_wedding_day_performance IS 'Daily aggregation of wedding day performance metrics';
COMMENT ON FUNCTION update_ai_budget_tracking IS 'Updates monthly budget tracking for organizations';