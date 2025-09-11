-- WS-131: Revenue Performance Monitoring & Alerting System Database Schema
-- Migration for performance metrics, alerts, and health monitoring

-- Performance metrics storage
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('counter', 'gauge', 'histogram', 'summary')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    labels JSONB DEFAULT '{}',
    threshold JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_time ON performance_metrics(metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_labels ON performance_metrics USING GIN(labels);

-- Alert rules configuration
CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    condition VARCHAR(10) NOT NULL CHECK (condition IN ('gt', 'lt', 'eq', 'gte', 'lte')),
    threshold DECIMAL(15,6) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'emergency')),
    cooldown_minutes INTEGER DEFAULT 5,
    notification_channels JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for alert rules
CREATE INDEX IF NOT EXISTS idx_alert_rules_metric_name ON alert_rules(metric_name);
CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON alert_rules(is_active);

-- Revenue alerts storage
CREATE TABLE IF NOT EXISTS revenue_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
    metric_name VARCHAR(255) NOT NULL,
    current_value DECIMAL(15,6) NOT NULL,
    threshold DECIMAL(15,6) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'emergency')),
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
    acknowledged_at TIMESTAMPTZ DEFAULT NULL,
    acknowledged_by UUID DEFAULT NULL,
    resolved_at TIMESTAMPTZ DEFAULT NULL,
    resolved_by UUID DEFAULT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for revenue alerts
CREATE INDEX IF NOT EXISTS idx_revenue_alerts_status ON revenue_alerts(status);
CREATE INDEX IF NOT EXISTS idx_revenue_alerts_severity ON revenue_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_revenue_alerts_timestamp ON revenue_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_alerts_metric ON revenue_alerts(metric_name);

-- System health snapshots
CREATE TABLE IF NOT EXISTS system_health_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    overall_status VARCHAR(20) NOT NULL CHECK (overall_status IN ('healthy', 'degraded', 'critical')),
    components JSONB NOT NULL,
    uptime_percentage DECIMAL(5,4) DEFAULT 99.0000,
    snapshot_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for system health
CREATE INDEX IF NOT EXISTS idx_system_health_snapshots_time ON system_health_snapshots(snapshot_time DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_snapshots_status ON system_health_snapshots(overall_status);

-- Component performance tracking
CREATE TABLE IF NOT EXISTS component_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'critical')),
    response_time_ms INTEGER NOT NULL,
    error_rate DECIMAL(5,4) DEFAULT 0.0000,
    last_error TEXT DEFAULT NULL,
    metrics JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for component performance
CREATE INDEX IF NOT EXISTS idx_component_performance_name_time ON component_performance(component_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_component_performance_status ON component_performance(status);

-- Payment processing metrics (enhanced)
CREATE TABLE IF NOT EXISTS payment_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID DEFAULT NULL,
    subscription_id UUID DEFAULT NULL,
    organization_id UUID DEFAULT NULL,
    success BOOLEAN NOT NULL,
    amount_cents INTEGER NOT NULL,
    processing_time_ms INTEGER NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    error_code VARCHAR(100) DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    gateway_response JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payment performance
CREATE INDEX IF NOT EXISTS idx_payment_performance_timestamp ON payment_performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_payment_performance_success ON payment_performance_metrics(success);
CREATE INDEX IF NOT EXISTS idx_payment_performance_subscription ON payment_performance_metrics(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_performance_organization ON payment_performance_metrics(organization_id);

-- Database query performance tracking
CREATE TABLE IF NOT EXISTS database_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_type VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) DEFAULT NULL,
    execution_time_ms INTEGER NOT NULL,
    rows_affected INTEGER DEFAULT 0,
    cache_hit BOOLEAN DEFAULT FALSE,
    query_hash VARCHAR(64) DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for database performance
CREATE INDEX IF NOT EXISTS idx_database_performance_type_time ON database_performance_metrics(query_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_database_performance_execution_time ON database_performance_metrics(execution_time_ms);
CREATE INDEX IF NOT EXISTS idx_database_performance_cache ON database_performance_metrics(cache_hit);

-- API endpoint performance tracking
CREATE TABLE IF NOT EXISTS api_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    user_id UUID DEFAULT NULL,
    organization_id UUID DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    ip_address INET DEFAULT NULL,
    request_size_bytes INTEGER DEFAULT NULL,
    response_size_bytes INTEGER DEFAULT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for API performance
CREATE INDEX IF NOT EXISTS idx_api_performance_endpoint_time ON api_performance_metrics(endpoint, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_performance_status ON api_performance_metrics(status_code);
CREATE INDEX IF NOT EXISTS idx_api_performance_response_time ON api_performance_metrics(response_time_ms);
CREATE INDEX IF NOT EXISTS idx_api_performance_user ON api_performance_metrics(user_id);

-- Revenue reconciliation tracking
CREATE TABLE IF NOT EXISTS revenue_reconciliation_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    expected_revenue_cents INTEGER NOT NULL,
    actual_revenue_cents INTEGER NOT NULL,
    discrepancy_cents INTEGER GENERATED ALWAYS AS (actual_revenue_cents - expected_revenue_cents) STORED,
    accuracy DECIMAL(8,6) GENERATED ALWAYS AS (
        CASE 
            WHEN expected_revenue_cents = 0 THEN 1.0
            ELSE GREATEST(0, 1.0 - ABS(actual_revenue_cents - expected_revenue_cents)::DECIMAL / expected_revenue_cents)
        END
    ) STORED,
    total_transactions INTEGER NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for revenue reconciliation
CREATE INDEX IF NOT EXISTS idx_revenue_reconciliation_period ON revenue_reconciliation_metrics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_revenue_reconciliation_accuracy ON revenue_reconciliation_metrics(accuracy);
CREATE INDEX IF NOT EXISTS idx_revenue_reconciliation_processed ON revenue_reconciliation_metrics(processed_at DESC);

-- Notification log for alerts
CREATE TABLE IF NOT EXISTS alert_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES revenue_alerts(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
    sent_at TIMESTAMPTZ DEFAULT NULL,
    delivered_at TIMESTAMPTZ DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    notification_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for alert notifications
CREATE INDEX IF NOT EXISTS idx_alert_notifications_alert ON alert_notifications(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_status ON alert_notifications(status);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_channel ON alert_notifications(channel);

-- Performance summary views for faster queries
CREATE OR REPLACE VIEW performance_summary AS
SELECT 
    metric_name,
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as data_points,
    AVG(metric_value) as avg_value,
    MIN(metric_value) as min_value,
    MAX(metric_value) as max_value,
    STDDEV(metric_value) as stddev_value
FROM performance_metrics 
GROUP BY metric_name, DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;

-- System health summary view
CREATE OR REPLACE VIEW system_health_summary AS
SELECT 
    DATE_TRUNC('hour', snapshot_time) as hour,
    COUNT(*) as total_snapshots,
    COUNT(CASE WHEN overall_status = 'healthy' THEN 1 END) as healthy_snapshots,
    COUNT(CASE WHEN overall_status = 'degraded' THEN 1 END) as degraded_snapshots,
    COUNT(CASE WHEN overall_status = 'critical' THEN 1 END) as critical_snapshots,
    AVG(uptime_percentage) as avg_uptime
FROM system_health_snapshots
GROUP BY DATE_TRUNC('hour', snapshot_time)
ORDER BY hour DESC;

-- Alert summary view
CREATE OR REPLACE VIEW alert_summary AS
SELECT 
    DATE_TRUNC('day', timestamp) as day,
    severity,
    status,
    COUNT(*) as alert_count,
    AVG(EXTRACT(EPOCH FROM COALESCE(resolved_at, NOW()) - timestamp) / 60) as avg_resolution_minutes
FROM revenue_alerts
GROUP BY DATE_TRUNC('day', timestamp), severity, status
ORDER BY day DESC;

-- Payment success rate view (last 24 hours)
CREATE OR REPLACE VIEW payment_success_rate_24h AS
WITH hourly_stats AS (
    SELECT 
        DATE_TRUNC('hour', timestamp) as hour,
        COUNT(*) as total_payments,
        COUNT(CASE WHEN success THEN 1 END) as successful_payments
    FROM payment_performance_metrics 
    WHERE timestamp >= NOW() - INTERVAL '24 hours'
    GROUP BY DATE_TRUNC('hour', timestamp)
)
SELECT 
    hour,
    total_payments,
    successful_payments,
    CASE 
        WHEN total_payments > 0 THEN successful_payments::DECIMAL / total_payments
        ELSE 0
    END as success_rate
FROM hourly_stats
ORDER BY hour DESC;

-- Functions for automated cleanup of old data
CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics()
RETURNS void AS $$
BEGIN
    -- Keep last 30 days of detailed metrics
    DELETE FROM performance_metrics 
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    -- Keep last 90 days of alerts
    DELETE FROM revenue_alerts 
    WHERE timestamp < NOW() - INTERVAL '90 days' AND status = 'resolved';
    
    -- Keep last 7 days of system health snapshots
    DELETE FROM system_health_snapshots 
    WHERE snapshot_time < NOW() - INTERVAL '7 days';
    
    -- Keep last 90 days of payment metrics
    DELETE FROM payment_performance_metrics 
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    -- Keep last 30 days of database performance metrics
    DELETE FROM database_performance_metrics 
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    -- Keep last 30 days of API performance metrics
    DELETE FROM api_performance_metrics 
    WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run daily at 2 AM (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-performance-metrics', '0 2 * * *', 'SELECT cleanup_old_performance_metrics();');

-- Row Level Security (RLS) policies
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_reconciliation_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin access
CREATE POLICY "Admin full access to performance_metrics" ON performance_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'system')
        )
    );

CREATE POLICY "Admin full access to alert_rules" ON alert_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'system')
        )
    );

CREATE POLICY "Admin full access to revenue_alerts" ON revenue_alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'system')
        )
    );

-- Similar policies for other tables...
CREATE POLICY "Admin access to system_health_snapshots" ON system_health_snapshots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'system')
        )
    );

CREATE POLICY "Admin access to component_performance" ON component_performance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'system')
        )
    );

-- Organization-level access for organization owners
CREATE POLICY "Organization access to payment_performance_metrics" ON payment_performance_metrics
    FOR SELECT USING (
        organization_id IN (
            SELECT o.id FROM organizations o
            JOIN user_profiles up ON up.organization_id = o.id
            WHERE up.user_id = auth.uid()
            AND up.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Organization access to api_performance_metrics" ON api_performance_metrics
    FOR SELECT USING (
        organization_id IN (
            SELECT o.id FROM organizations o
            JOIN user_profiles up ON up.organization_id = o.id
            WHERE up.user_id = auth.uid()
            AND up.role IN ('admin', 'owner')
        )
        OR user_id = auth.uid()
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE performance_metrics IS 'Stores all performance metrics for the revenue system';
COMMENT ON TABLE alert_rules IS 'Configuration for automatic alerting rules';
COMMENT ON TABLE revenue_alerts IS 'Generated alerts from the monitoring system';
COMMENT ON TABLE system_health_snapshots IS 'Periodic snapshots of overall system health';
COMMENT ON TABLE payment_performance_metrics IS 'Detailed metrics for payment processing performance';
COMMENT ON TABLE revenue_reconciliation_metrics IS 'Revenue reconciliation accuracy tracking';

COMMENT ON VIEW performance_summary IS 'Hourly aggregated performance metrics for faster queries';
COMMENT ON VIEW system_health_summary IS 'Hourly system health statistics';
COMMENT ON VIEW alert_summary IS 'Daily alert statistics by severity and status';
COMMENT ON VIEW payment_success_rate_24h IS 'Payment success rate over the last 24 hours by hour';