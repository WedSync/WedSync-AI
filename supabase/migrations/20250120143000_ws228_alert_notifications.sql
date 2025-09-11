-- WS-228 Admin Alert System - Notification Infrastructure
-- Team C Integration: Email, Slack, SMS Notification Tables
-- Generated: 2025-01-20 14:30:00 UTC

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- ALERT NOTIFICATION CONFIGURATIONS
-- ================================================================

-- Admin notification configurations table
CREATE TABLE IF NOT EXISTS admin_notification_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'slack', 'sms', 'webhook', 'push')),
    priority TEXT[] NOT NULL DEFAULT '{}' CHECK (
        array_length(priority, 1) > 0 AND
        priority <@ ARRAY['critical', 'high', 'medium', 'low', 'info']::TEXT[]
    ),
    alert_types TEXT[] NOT NULL DEFAULT '{}' CHECK (array_length(alert_types, 1) > 0),
    enabled BOOLEAN NOT NULL DEFAULT true,
    settings JSONB NOT NULL DEFAULT '{}',
    quiet_hours JSONB DEFAULT NULL CHECK (
        quiet_hours IS NULL OR (
            quiet_hours ? 'start' AND 
            quiet_hours ? 'end' AND 
            quiet_hours ? 'timezone'
        )
    ),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique configuration per admin user and channel
    UNIQUE (admin_user_id, channel)
);

-- Indexes for admin_notification_configs
CREATE INDEX idx_admin_notification_configs_user_enabled ON admin_notification_configs(admin_user_id, enabled);
CREATE INDEX idx_admin_notification_configs_channel ON admin_notification_configs(channel);
CREATE INDEX idx_admin_notification_configs_priority ON admin_notification_configs USING GIN(priority);
CREATE INDEX idx_admin_notification_configs_alert_types ON admin_notification_configs USING GIN(alert_types);

-- ================================================================
-- ALERT NOTIFICATION DELIVERIES
-- ================================================================

-- Alert notification deliveries tracking
CREATE TABLE IF NOT EXISTS alert_notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL,  -- References alerts table (will be created by Team B)
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'slack', 'sms', 'webhook', 'push')),
    recipient TEXT NOT NULL, -- Email, phone number, Slack channel, etc.
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'retrying')
    ),
    sent_at TIMESTAMPTZ DEFAULT NULL,
    delivered_at TIMESTAMPTZ DEFAULT NULL,
    failure_reason TEXT DEFAULT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for alert_notification_deliveries
CREATE INDEX idx_alert_notification_deliveries_alert ON alert_notification_deliveries(alert_id);
CREATE INDEX idx_alert_notification_deliveries_status ON alert_notification_deliveries(status, created_at DESC);
CREATE INDEX idx_alert_notification_deliveries_channel_status ON alert_notification_deliveries(channel, status);
CREATE INDEX idx_alert_notification_deliveries_retry ON alert_notification_deliveries(retry_count, status) WHERE status = 'failed';

-- ================================================================
-- ALERT NOTIFICATION RETRIES
-- ================================================================

-- Alert notification retry queue
CREATE TABLE IF NOT EXISTS alert_notification_retries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'slack', 'sms', 'webhook', 'push')),
    recipient TEXT NOT NULL,
    retry_count INTEGER NOT NULL,
    retry_at TIMESTAMPTZ NOT NULL,
    task_data JSONB NOT NULL, -- Serialized DeliveryTask data
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for alert_notification_retries
CREATE INDEX idx_alert_notification_retries_retry_at ON alert_notification_retries(retry_at, processed) WHERE NOT processed;
CREATE INDEX idx_alert_notification_retries_alert ON alert_notification_retries(alert_id);
CREATE INDEX idx_alert_notification_retries_processed ON alert_notification_retries(processed, processed_at);

-- ================================================================
-- ALERT NOTIFICATION LOGS
-- ================================================================

-- Alert notification event logging
CREATE TABLE IF NOT EXISTS alert_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for alert_notification_logs
CREATE INDEX idx_alert_notification_logs_alert ON alert_notification_logs(alert_id, created_at DESC);
CREATE INDEX idx_alert_notification_logs_event_type ON alert_notification_logs(event_type, created_at DESC);
CREATE INDEX idx_alert_notification_logs_created_at ON alert_notification_logs(created_at DESC);

-- ================================================================
-- EMAIL SPECIFIC TABLES
-- ================================================================

-- Alert email templates
CREATE TABLE IF NOT EXISTS alert_email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low', 'info')),
    subject TEXT NOT NULL,
    html_template TEXT NOT NULL,
    text_template TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}', -- Template variable names
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (name, priority)
);

-- Indexes for alert_email_templates
CREATE INDEX idx_alert_email_templates_priority_active ON alert_email_templates(priority, is_active);
CREATE INDEX idx_alert_email_templates_name ON alert_email_templates(name);

-- ================================================================
-- ALERT TYPES CONFIGURATION
-- ================================================================

-- Alert types configuration
CREATE TABLE IF NOT EXISTS alert_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    default_priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (
        default_priority IN ('critical', 'high', 'medium', 'low', 'info')
    ),
    category VARCHAR(50) NOT NULL DEFAULT 'System',
    is_user_configurable BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    escalation_rules JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for alert_types
CREATE INDEX idx_alert_types_category_active ON alert_types(category, is_active);
CREATE INDEX idx_alert_types_priority ON alert_types(default_priority);
CREATE INDEX idx_alert_types_configurable ON alert_types(is_user_configurable, is_active);

-- Insert default alert types
INSERT INTO alert_types (type, name, description, default_priority, category, is_user_configurable) VALUES
-- System Health
('system_health', 'System Health', 'API response times, error rates, database connections', 'high', 'System', true),
('performance', 'Performance Issues', 'Slow queries, high memory usage, timeout errors', 'medium', 'System', true),
('infrastructure', 'Infrastructure', 'Server outages, DNS issues, CDN problems', 'critical', 'Infrastructure', true),
('backup_failures', 'Backup Failures', 'Failed backups, sync issues, data integrity problems', 'high', 'Infrastructure', true),

-- Business Metrics
('business_metrics', 'Business Metrics', 'Unusual churn rates, activation patterns, revenue changes', 'medium', 'Business', true),
('payment_failures', 'Payment Failures', 'Failed payments, subscription downgrades, billing issues', 'high', 'Business', true),

-- Security
('security', 'Security Alerts', 'Suspicious login attempts, unusual access patterns', 'high', 'Security', false),
('data_breach', 'Data Breach Detection', 'Potential data breaches or unauthorized access', 'critical', 'Security', false),

-- Wedding Day Specific
('wedding_day_issues', 'Wedding Day Issues', 'Critical issues during active weddings', 'critical', 'Wedding', false),
('vendor_conflicts', 'Vendor Conflicts', 'Double bookings, vendor disputes, timeline conflicts', 'high', 'Wedding', true),

-- Integration & External
('integration_failures', 'Integration Failures', 'Third-party service outages, API failures', 'high', 'Integration', true),
('email_delivery', 'Email Delivery Issues', 'Email bounces, delivery failures, reputation issues', 'medium', 'Communication', true),

-- Test & Development
('test', 'Test Notifications', 'Test alerts for configuration verification', 'low', 'Development', true)
ON CONFLICT (type) DO NOTHING;

-- ================================================================
-- ADMIN CONFIGURATION LOGS
-- ================================================================

-- Admin configuration change logging
CREATE TABLE IF NOT EXISTS admin_config_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    resource_id TEXT, -- Channel name, config ID, etc.
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for admin_config_logs
CREATE INDEX idx_admin_config_logs_user_action ON admin_config_logs(admin_user_id, action, created_at DESC);
CREATE INDEX idx_admin_config_logs_resource ON admin_config_logs(resource, created_at DESC);
CREATE INDEX idx_admin_config_logs_created_at ON admin_config_logs(created_at DESC);

-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

-- Enable RLS on all tables
ALTER TABLE admin_notification_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_notification_retries ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_config_logs ENABLE ROW LEVEL SECURITY;

-- Admin notification configs policies
CREATE POLICY "Admin users can manage their own notification configs"
    ON admin_notification_configs
    FOR ALL
    USING (
        auth.uid()::text IN (
            SELECT id::text FROM admin_users 
            WHERE id = admin_notification_configs.admin_user_id
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Super admins can view all notification configs"
    ON admin_notification_configs
    FOR SELECT
    USING (
        auth.uid()::text IN (
            SELECT id::text FROM admin_users 
            WHERE role = 'super_admin'
        )
    );

-- Alert notification deliveries policies (admin read-only)
CREATE POLICY "Admin users can view notification deliveries"
    ON alert_notification_deliveries
    FOR SELECT
    USING (
        auth.uid()::text IN (
            SELECT id::text FROM admin_users 
            WHERE role IN ('admin', 'super_admin')
        )
    );

-- Service role can insert/update deliveries (for background processing)
CREATE POLICY "Service role can manage notification deliveries"
    ON alert_notification_deliveries
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Alert notification retries policies (service role only)
CREATE POLICY "Service role can manage notification retries"
    ON alert_notification_retries
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Alert notification logs policies (admin read, service write)
CREATE POLICY "Admin users can view notification logs"
    ON alert_notification_logs
    FOR SELECT
    USING (
        auth.uid()::text IN (
            SELECT id::text FROM admin_users 
            WHERE role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Service role can insert notification logs"
    ON alert_notification_logs
    FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Alert email templates policies
CREATE POLICY "Admin users can manage email templates"
    ON alert_email_templates
    FOR ALL
    USING (
        auth.uid()::text IN (
            SELECT id::text FROM admin_users 
            WHERE role IN ('admin', 'super_admin')
        )
    );

-- Alert types policies (read-only for admins, manage for super admins)
CREATE POLICY "Admin users can view alert types"
    ON alert_types
    FOR SELECT
    USING (
        auth.uid()::text IN (
            SELECT id::text FROM admin_users 
            WHERE role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Super admins can manage alert types"
    ON alert_types
    FOR ALL
    USING (
        auth.uid()::text IN (
            SELECT id::text FROM admin_users 
            WHERE role = 'super_admin'
        )
    );

-- Admin config logs policies
CREATE POLICY "Admin users can view their own config logs"
    ON admin_config_logs
    FOR SELECT
    USING (
        auth.uid()::text IN (
            SELECT id::text FROM admin_users 
            WHERE id = admin_config_logs.admin_user_id
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Super admins can view all config logs"
    ON admin_config_logs
    FOR SELECT
    USING (
        auth.uid()::text IN (
            SELECT id::text FROM admin_users 
            WHERE role = 'super_admin'
        )
    );

CREATE POLICY "Service role can insert config logs"
    ON admin_config_logs
    FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ================================================================
-- FUNCTIONS AND TRIGGERS
-- ================================================================

-- Update updated_at timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_admin_notification_configs_updated_at 
    BEFORE UPDATE ON admin_notification_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_notification_deliveries_updated_at 
    BEFORE UPDATE ON alert_notification_deliveries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_email_templates_updated_at 
    BEFORE UPDATE ON alert_email_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_types_updated_at 
    BEFORE UPDATE ON alert_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- NOTIFICATION STATISTICS VIEWS
-- ================================================================

-- View for notification delivery statistics
CREATE OR REPLACE VIEW notification_delivery_stats AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    channel,
    status,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (COALESCE(delivered_at, updated_at) - created_at))) as avg_delivery_time_seconds
FROM alert_notification_deliveries
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), channel, status
ORDER BY date DESC, channel, status;

-- View for alert type coverage
CREATE OR REPLACE VIEW alert_type_coverage AS
SELECT 
    at.type,
    at.name,
    at.category,
    at.default_priority,
    COUNT(DISTINCT anc.admin_user_id) as configured_admin_count,
    ARRAY_AGG(DISTINCT anc.channel) FILTER (WHERE anc.enabled = true) as active_channels
FROM alert_types at
LEFT JOIN admin_notification_configs anc ON at.type = ANY(anc.alert_types)
WHERE at.is_active = true
GROUP BY at.type, at.name, at.category, at.default_priority
ORDER BY at.category, at.name;

-- View for admin notification summary
CREATE OR REPLACE VIEW admin_notification_summary AS
SELECT 
    au.id as admin_user_id,
    au.email,
    au.name,
    COUNT(anc.id) as total_configs,
    COUNT(anc.id) FILTER (WHERE anc.enabled = true) as enabled_configs,
    ARRAY_AGG(anc.channel) FILTER (WHERE anc.enabled = true) as active_channels,
    MAX(anc.updated_at) as last_config_update
FROM admin_users au
LEFT JOIN admin_notification_configs anc ON au.id = anc.admin_user_id
WHERE au.role IN ('admin', 'super_admin')
GROUP BY au.id, au.email, au.name
ORDER BY au.name;

-- ================================================================
-- PERFORMANCE OPTIMIZATION
-- ================================================================

-- Partial indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_deliveries_failed_retry 
    ON alert_notification_deliveries(alert_id, channel, retry_count, created_at DESC) 
    WHERE status IN ('failed', 'retrying');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_retries_pending 
    ON alert_notification_retries(retry_at ASC) 
    WHERE NOT processed;

-- ================================================================
-- INITIAL DATA SETUP
-- ================================================================

-- Insert default admin notification configurations template
-- This will be used by the NotificationConfigManager to set up new admin users
INSERT INTO alert_email_templates (name, priority, subject, html_template, text_template, variables) VALUES
('admin_alert_critical', 'critical', '🚨 CRITICAL: {alert_title}', 
'<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:#dc3545;color:white;padding:20px;text-align:center"><h1>🚨 CRITICAL ALERT</h1><h2>{alert_title}</h2></div><div style="padding:20px"><p><strong>Message:</strong> {alert_message}</p><p><strong>Time:</strong> {alert_timestamp}</p><p><strong>Alert ID:</strong> {alert_id}</p><div style="text-align:center;margin:30px 0"><a href="{acknowledge_url}" style="background:#007bff;color:white;padding:15px 30px;text-decoration:none;border-radius:5px">Acknowledge Alert</a></div></div></body></html>',
'CRITICAL ALERT: {alert_title}\n\n{alert_message}\n\nTime: {alert_timestamp}\nAlert ID: {alert_id}\n\nAcknowledge: {acknowledge_url}',
ARRAY['alert_title', 'alert_message', 'alert_timestamp', 'alert_id', 'acknowledge_url']
),

('admin_alert_high', 'high', '⚠️ HIGH: {alert_title}', 
'<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:#fd7e14;color:white;padding:20px;text-align:center"><h1>⚠️ HIGH PRIORITY ALERT</h1><h2>{alert_title}</h2></div><div style="padding:20px"><p><strong>Message:</strong> {alert_message}</p><p><strong>Time:</strong> {alert_timestamp}</p><p><strong>Alert ID:</strong> {alert_id}</p><div style="text-align:center;margin:30px 0"><a href="{acknowledge_url}" style="background:#007bff;color:white;padding:15px 30px;text-decoration:none;border-radius:5px">Acknowledge Alert</a></div></div></body></html>',
'HIGH PRIORITY ALERT: {alert_title}\n\n{alert_message}\n\nTime: {alert_timestamp}\nAlert ID: {alert_id}\n\nAcknowledge: {acknowledge_url}',
ARRAY['alert_title', 'alert_message', 'alert_timestamp', 'alert_id', 'acknowledge_url']
),

('admin_alert_medium', 'medium', '🔔 MEDIUM: {alert_title}', 
'<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:#ffc107;color:black;padding:20px;text-align:center"><h1>🔔 ALERT</h1><h2>{alert_title}</h2></div><div style="padding:20px"><p><strong>Message:</strong> {alert_message}</p><p><strong>Time:</strong> {alert_timestamp}</p><p><strong>Alert ID:</strong> {alert_id}</p><div style="text-align:center;margin:30px 0"><a href="{acknowledge_url}" style="background:#007bff;color:white;padding:15px 30px;text-decoration:none;border-radius:5px">View Alert</a></div></div></body></html>',
'ALERT: {alert_title}\n\n{alert_message}\n\nTime: {alert_timestamp}\nAlert ID: {alert_id}\n\nView: {acknowledge_url}',
ARRAY['alert_title', 'alert_message', 'alert_timestamp', 'alert_id', 'acknowledge_url']
)
ON CONFLICT (name, priority) DO NOTHING;

-- ================================================================
-- MONITORING AND MAINTENANCE
-- ================================================================

-- Function to clean old notification logs (call via cron job)
CREATE OR REPLACE FUNCTION cleanup_old_notification_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete logs older than 90 days
    DELETE FROM alert_notification_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete old deliveries (keep for 30 days)
    DELETE FROM alert_notification_deliveries 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Delete processed retries older than 7 days
    DELETE FROM alert_notification_retries 
    WHERE processed = true AND processed_at < NOW() - INTERVAL '7 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE admin_notification_configs IS 'Configuration for admin user notification preferences per channel';
COMMENT ON TABLE alert_notification_deliveries IS 'Tracking of individual notification delivery attempts';
COMMENT ON TABLE alert_notification_retries IS 'Retry queue for failed notification deliveries';
COMMENT ON TABLE alert_notification_logs IS 'Event logs for notification system debugging and metrics';
COMMENT ON TABLE alert_email_templates IS 'Email templates for different alert priorities';
COMMENT ON TABLE alert_types IS 'Available alert types and their default configurations';
COMMENT ON TABLE admin_config_logs IS 'Audit trail for notification configuration changes';

COMMENT ON FUNCTION cleanup_old_notification_logs() IS 'Maintenance function to clean old logs and deliveries - call via cron job';

-- Migration completed successfully
SELECT 'WS-228 Alert Notification Infrastructure migration completed successfully' as status;