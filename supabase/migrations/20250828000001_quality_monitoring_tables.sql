-- Quality Monitoring Tables Migration
-- Creates tables for storing quality metrics, alerts, and monitoring data
-- Supports advanced wedding-specific quality tracking

-- Create quality_metrics table
CREATE TABLE quality_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metric_name VARCHAR(100) NOT NULL,
    value NUMERIC NOT NULL,
    threshold NUMERIC,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'emergency')),
    environment VARCHAR(50) NOT NULL,
    feature VARCHAR(100) NOT NULL,
    user_type VARCHAR(50) NOT NULL,
    wedding_phase VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for efficient querying
    INDEX idx_quality_metrics_timestamp (timestamp),
    INDEX idx_quality_metrics_metric_name (metric_name),
    INDEX idx_quality_metrics_severity (severity),
    INDEX idx_quality_metrics_environment (environment),
    INDEX idx_quality_metrics_feature (feature),
    INDEX idx_quality_metrics_wedding_phase (wedding_phase),
    INDEX idx_quality_metrics_composite (metric_name, timestamp, environment)
);

-- Create quality_alerts table
CREATE TABLE quality_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metric_name VARCHAR(100) NOT NULL,
    value NUMERIC NOT NULL,
    threshold NUMERIC NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('warning', 'critical', 'emergency')),
    environment VARCHAR(50) NOT NULL,
    context JSONB NOT NULL DEFAULT '{}',
    business_impact VARCHAR(20) NOT NULL CHECK (business_impact IN ('low', 'medium', 'high', 'critical')),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    notification_channels JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for alert management
    INDEX idx_quality_alerts_timestamp (timestamp),
    INDEX idx_quality_alerts_rule_id (rule_id),
    INDEX idx_quality_alerts_severity (severity),
    INDEX idx_quality_alerts_environment (environment),
    INDEX idx_quality_alerts_business_impact (business_impact),
    INDEX idx_quality_alerts_unresolved (resolved) WHERE NOT resolved,
    INDEX idx_quality_alerts_unacknowledged (acknowledged) WHERE NOT acknowledged
);

-- Create quality_dashboards table (for saved dashboard configurations)
CREATE TABLE quality_dashboards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    config JSONB NOT NULL,
    created_by UUID NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    shared BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint for default dashboards per user
    UNIQUE(created_by, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Create quality_metric_definitions table (for metric metadata)
CREATE TABLE quality_metric_definitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    unit VARCHAR(20),
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('counter', 'gauge', 'histogram', 'timer')),
    category VARCHAR(50) NOT NULL,
    wedding_specific BOOLEAN DEFAULT FALSE,
    thresholds JSONB NOT NULL DEFAULT '{}', -- { "warning": 100, "critical": 200 }
    tags JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_metric_definitions_category (category),
    INDEX idx_metric_definitions_wedding_specific (wedding_specific),
    INDEX idx_metric_definitions_active (is_active)
);

-- Create alert_rules table (for configurable alerting)
CREATE TABLE alert_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    condition VARCHAR(20) NOT NULL CHECK (condition IN ('above', 'below', 'equals', 'not_equals')),
    threshold NUMERIC NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 60,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('warning', 'critical', 'emergency')),
    channels JSONB NOT NULL DEFAULT '[]', -- ["slack", "email", "pagerduty"]
    wedding_specific BOOLEAN DEFAULT FALSE,
    business_impact VARCHAR(20) NOT NULL CHECK (business_impact IN ('low', 'medium', 'high', 'critical')),
    environment VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key to metric definitions
    FOREIGN KEY (metric_name) REFERENCES quality_metric_definitions(metric_name),
    
    INDEX idx_alert_rules_metric_name (metric_name),
    INDEX idx_alert_rules_enabled (enabled),
    INDEX idx_alert_rules_environment (environment),
    INDEX idx_alert_rules_wedding_specific (wedding_specific)
);

-- Create quality_incidents table (for tracking quality incidents)
CREATE TABLE quality_incidents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('minor', 'major', 'critical')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')) DEFAULT 'investigating',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    affected_features JSONB DEFAULT '[]',
    wedding_impact_level VARCHAR(20) CHECK (wedding_impact_level IN ('none', 'low', 'medium', 'high', 'critical')),
    affected_wedding_count INTEGER DEFAULT 0,
    root_cause TEXT,
    resolution_summary TEXT,
    assigned_to UUID,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_quality_incidents_status (status),
    INDEX idx_quality_incidents_severity (severity),
    INDEX idx_quality_incidents_started_at (started_at),
    INDEX idx_quality_incidents_wedding_impact (wedding_impact_level),
    INDEX idx_quality_incidents_assigned_to (assigned_to)
);

-- Create incident_alerts table (linking alerts to incidents)
CREATE TABLE incident_alerts (
    incident_id UUID NOT NULL REFERENCES quality_incidents(id) ON DELETE CASCADE,
    alert_id UUID NOT NULL REFERENCES quality_alerts(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (incident_id, alert_id)
);

-- Insert default metric definitions for wedding platform
INSERT INTO quality_metric_definitions (metric_name, display_name, description, unit, metric_type, category, wedding_specific, thresholds) VALUES
-- Performance metrics
('rsvp_response_time', 'RSVP Response Time', 'Time taken to process RSVP submissions', 'ms', 'timer', 'performance', true, '{"warning": 500, "critical": 1000}'),
('photo_upload_time', 'Photo Upload Time', 'Time taken to upload wedding photos', 'ms', 'timer', 'performance', true, '{"warning": 3000, "critical": 8000}'),
('timeline_load_time', 'Timeline Load Time', 'Time taken to load wedding timeline', 'ms', 'timer', 'performance', true, '{"warning": 800, "critical": 2000}'),
('vendor_search_time', 'Vendor Search Time', 'Time taken to search for vendors', 'ms', 'timer', 'performance', true, '{"warning": 1200, "critical": 3000}'),
('guest_management_time', 'Guest Management Time', 'Time taken for guest management operations', 'ms', 'timer', 'performance', true, '{"warning": 600, "critical": 1500}'),

-- Error rates
('rsvp_error_rate', 'RSVP Error Rate', 'Percentage of failed RSVP submissions', '%', 'gauge', 'errors', true, '{"warning": 1, "critical": 5}'),
('photo_upload_failure_rate', 'Photo Upload Failure Rate', 'Percentage of failed photo uploads', '%', 'gauge', 'errors', true, '{"warning": 2, "critical": 8}'),
('payment_failure_rate', 'Payment Failure Rate', 'Percentage of failed payment processing', '%', 'gauge', 'errors', false, '{"warning": 0.5, "critical": 2}'),
('email_delivery_failure_rate', 'Email Delivery Failure Rate', 'Percentage of failed email deliveries', '%', 'gauge', 'errors', false, '{"warning": 1, "critical": 5}'),

-- Core Web Vitals
('core_web_vitals_lcp', 'Largest Contentful Paint', 'Core Web Vitals - LCP', 'ms', 'gauge', 'web_vitals', false, '{"warning": 2500, "critical": 4000}'),
('core_web_vitals_fid', 'First Input Delay', 'Core Web Vitals - FID', 'ms', 'gauge', 'web_vitals', false, '{"warning": 100, "critical": 300}'),
('core_web_vitals_cls', 'Cumulative Layout Shift', 'Core Web Vitals - CLS', '', 'gauge', 'web_vitals', false, '{"warning": 0.1, "critical": 0.25}'),

-- Business metrics
('wedding_completion_rate', 'Wedding Completion Rate', 'Percentage of weddings successfully completed', '%', 'gauge', 'business', true, '{"warning": 95, "critical": 90}'),
('vendor_booking_success_rate', 'Vendor Booking Success Rate', 'Percentage of successful vendor bookings', '%', 'gauge', 'business', true, '{"warning": 98, "critical": 95}'),
('guest_satisfaction_score', 'Guest Satisfaction Score', 'Average guest satisfaction rating', '/5', 'gauge', 'business', true, '{"warning": 4.5, "critical": 4.0}'),

-- Wedding day critical metrics
('day_of_availability', 'Wedding Day Availability', 'System availability during wedding days', '%', 'gauge', 'availability', true, '{"warning": 99.5, "critical": 99.0}'),
('real_time_sync_delay', 'Real-time Sync Delay', 'Delay in real-time synchronization', 'ms', 'gauge', 'performance', true, '{"warning": 500, "critical": 2000}'),
('notification_delivery_time', 'Notification Delivery Time', 'Time taken to deliver notifications', 's', 'timer', 'performance', false, '{"warning": 30, "critical": 120}'),

-- System health
('monitoring_failure_rate', 'Monitoring Failure Rate', 'Rate of monitoring system failures', '%', 'gauge', 'system', false, '{"warning": 0.1, "critical": 1.0}');

-- Insert default alert rules for critical wedding metrics
INSERT INTO alert_rules (name, metric_name, condition, threshold, duration_seconds, severity, channels, wedding_specific, business_impact, environment, created_by) VALUES
('RSVP Critical Response Time', 'rsvp_response_time', 'above', 1000, 60, 'critical', '["slack", "pagerduty"]', true, 'high', 'production', '00000000-0000-0000-0000-000000000000'),
('Photo Upload Failure Critical', 'photo_upload_failure_rate', 'above', 8, 300, 'critical', '["slack", "email"]', true, 'critical', 'production', '00000000-0000-0000-0000-000000000000'),
('Wedding Day Availability Emergency', 'day_of_availability', 'below', 99.0, 30, 'emergency', '["slack", "pagerduty", "sms"]', true, 'critical', 'production', '00000000-0000-0000-0000-000000000000'),
('Payment Failure Critical', 'payment_failure_rate', 'above', 2, 180, 'critical', '["slack", "email", "pagerduty"]', false, 'critical', 'production', '00000000-0000-0000-0000-000000000000'),
('Guest Satisfaction Critical', 'guest_satisfaction_score', 'below', 4.0, 1800, 'critical', '["slack", "email"]', true, 'critical', 'production', '00000000-0000-0000-0000-000000000000');

-- Create function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_quality_dashboards_updated_at BEFORE UPDATE ON quality_dashboards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quality_metric_definitions_updated_at BEFORE UPDATE ON quality_metric_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON alert_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quality_incidents_updated_at BEFORE UPDATE ON quality_incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries

-- View for active alerts
CREATE VIEW active_alerts AS
SELECT 
    qa.*,
    qmd.display_name,
    qmd.category,
    qmd.wedding_specific
FROM quality_alerts qa
JOIN quality_metric_definitions qmd ON qa.metric_name = qmd.metric_name
WHERE NOT qa.resolved;

-- View for quality metrics summary (last hour)
CREATE VIEW recent_quality_metrics AS
SELECT 
    qm.*,
    qmd.display_name,
    qmd.unit,
    qmd.category,
    qmd.wedding_specific
FROM quality_metrics qm
JOIN quality_metric_definitions qmd ON qm.metric_name = qmd.metric_name
WHERE qm.timestamp >= NOW() - INTERVAL '1 hour';

-- View for wedding-specific metrics
CREATE VIEW wedding_quality_metrics AS
SELECT 
    qm.*,
    qmd.display_name,
    qmd.unit,
    qmd.thresholds
FROM quality_metrics qm
JOIN quality_metric_definitions qmd ON qm.metric_name = qmd.metric_name
WHERE qmd.wedding_specific = true;

-- View for system health summary
CREATE VIEW system_health_summary AS
SELECT 
    environment,
    COUNT(*) as total_metrics,
    COUNT(*) FILTER (WHERE severity IN ('critical', 'emergency')) as critical_metrics,
    AVG(CASE WHEN metric_name = 'day_of_availability' THEN value END) as availability,
    AVG(CASE WHEN metric_name = 'rsvp_response_time' THEN value END) as avg_rsvp_time,
    AVG(CASE WHEN metric_name = 'photo_upload_time' THEN value END) as avg_photo_time
FROM quality_metrics qm
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY environment;

-- Enable Row Level Security (RLS) for user-specific data
ALTER TABLE quality_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_incidents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (assuming auth.uid() function exists for user identification)
CREATE POLICY "Users can view their own dashboards" ON quality_dashboards FOR SELECT USING (created_by = auth.uid() OR shared = true);
CREATE POLICY "Users can manage their own dashboards" ON quality_dashboards FOR ALL USING (created_by = auth.uid());

CREATE POLICY "Users can view alert rules they created" ON alert_rules FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Users can manage alert rules they created" ON alert_rules FOR ALL USING (created_by = auth.uid());

CREATE POLICY "Users can view incidents they created or are assigned to" ON quality_incidents FOR SELECT USING (created_by = auth.uid() OR assigned_to = auth.uid());
CREATE POLICY "Users can manage incidents they created" ON quality_incidents FOR ALL USING (created_by = auth.uid());

-- Grant appropriate permissions
GRANT SELECT ON quality_metrics TO authenticated;
GRANT SELECT ON quality_alerts TO authenticated;
GRANT SELECT ON quality_metric_definitions TO authenticated;
GRANT ALL ON quality_dashboards TO authenticated;
GRANT ALL ON alert_rules TO authenticated;
GRANT ALL ON quality_incidents TO authenticated;
GRANT ALL ON incident_alerts TO authenticated;

-- Grant access to views
GRANT SELECT ON active_alerts TO authenticated;
GRANT SELECT ON recent_quality_metrics TO authenticated;
GRANT SELECT ON wedding_quality_metrics TO authenticated;
GRANT SELECT ON system_health_summary TO authenticated;

-- Create indexes for performance optimization
CREATE INDEX CONCURRENTLY idx_quality_metrics_timestamp_desc ON quality_metrics (timestamp DESC);
CREATE INDEX CONCURRENTLY idx_quality_metrics_environment_timestamp ON quality_metrics (environment, timestamp DESC);
CREATE INDEX CONCURRENTLY idx_quality_alerts_severity_timestamp ON quality_alerts (severity, timestamp DESC);

-- Comment on tables and important columns
COMMENT ON TABLE quality_metrics IS 'Stores all quality metrics collected from the wedding platform';
COMMENT ON TABLE quality_alerts IS 'Stores alerts triggered by quality threshold violations';
COMMENT ON TABLE quality_dashboards IS 'User-defined dashboard configurations for quality monitoring';
COMMENT ON TABLE quality_metric_definitions IS 'Metadata and configuration for all quality metrics';
COMMENT ON TABLE alert_rules IS 'Configurable rules for triggering quality alerts';
COMMENT ON TABLE quality_incidents IS 'Quality incidents and their resolution tracking';

COMMENT ON COLUMN quality_metrics.wedding_phase IS 'Wedding planning phase: planning, preparation, day-of, post-wedding';
COMMENT ON COLUMN quality_alerts.business_impact IS 'Business impact level of the alert';
COMMENT ON COLUMN quality_metric_definitions.thresholds IS 'JSON object with warning and critical threshold values';
COMMENT ON COLUMN alert_rules.channels IS 'JSON array of notification channels: slack, email, pagerduty, sms';

-- Create a function to clean up old metrics (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_quality_metrics()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM quality_metrics 
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO quality_metrics (metric_name, value, threshold, severity, environment, feature, user_type, metadata)
    VALUES ('cleanup_old_metrics', deleted_count, 1000, 'info', 'system', 'maintenance', 'system', 
            jsonb_build_object('cleanup_date', NOW(), 'deleted_records', deleted_count));
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup function (if pg_cron extension is available)
-- SELECT cron.schedule('cleanup-quality-metrics', '0 2 * * *', 'SELECT cleanup_old_quality_metrics();');