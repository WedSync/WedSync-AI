-- Migration: Error Handling System Tables
-- WS-198 Team C Integration Architect Implementation

-- Integration error logging table
CREATE TABLE integration_errors (
    error_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    service_type TEXT NOT NULL CHECK (service_type IN ('payment', 'email', 'sms', 'calendar', 'vendor_api', 'storage', 'webhook')),
    endpoint TEXT,
    request_id TEXT,
    wedding_id UUID REFERENCES weddings(id),
    wedding_date DATE,
    vendor_type TEXT,
    criticality_level TEXT NOT NULL CHECK (criticality_level IN ('low', 'medium', 'high', 'wedding_day_critical')),
    retry_attempt INTEGER DEFAULT 0,
    last_success_at TIMESTAMPTZ,
    http_status INTEGER,
    error_code TEXT,
    response_time INTEGER, -- milliseconds
    error_message TEXT NOT NULL,
    error_stack TEXT,
    error_context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Circuit breaker events tracking
CREATE TABLE circuit_breaker_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('open', 'half_open', 'close')),
    previous_state TEXT,
    failure_count INTEGER,
    success_count INTEGER,
    error_rate DECIMAL(5,2),
    response_time_p95 INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook failure tracking
CREATE TABLE webhook_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id TEXT NOT NULL,
    source TEXT NOT NULL, -- 'stripe', 'vendor_system', etc.
    webhook_payload JSONB NOT NULL,
    error_type TEXT NOT NULL CHECK (error_type IN ('signature_verification_failed', 'processing_timeout', 'invalid_payload', 'unknown_error')),
    error_message TEXT NOT NULL,
    error_severity TEXT NOT NULL CHECK (error_severity IN ('low', 'medium', 'high')),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    dlq_timestamp TIMESTAMPTZ,
    wedding_context JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service health metrics
CREATE TABLE service_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    service_type TEXT NOT NULL,
    uptime_percentage DECIMAL(5,2),
    success_rate_24h DECIMAL(5,2),
    avg_response_time INTEGER, -- milliseconds
    p95_response_time INTEGER,
    last_failure_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    failure_count_1h INTEGER DEFAULT 0,
    success_count_1h INTEGER DEFAULT 0,
    circuit_breaker_state TEXT DEFAULT 'closed',
    health_status TEXT DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
    metadata JSONB,
    measured_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integration fallback usage tracking
CREATE TABLE integration_fallback_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    service_type TEXT NOT NULL,
    fallback_type TEXT NOT NULL CHECK (fallback_type IN ('alternative_service', 'cached_data', 'graceful_degradation', 'manual_override')),
    fallback_triggered_by TEXT, -- Original error type
    alternative_service_used TEXT,
    cache_hit BOOLEAN,
    cache_age_seconds INTEGER,
    success BOOLEAN NOT NULL,
    response_time INTEGER,
    wedding_context JSONB,
    business_impact TEXT,
    user_experience_impact TEXT CHECK (user_experience_impact IN ('none', 'minimal', 'moderate', 'significant')),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook retry queue (for scheduled retries)
CREATE TABLE webhook_retry_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_failure_id UUID NOT NULL REFERENCES webhook_failures(id),
    webhook_payload JSONB NOT NULL,
    retry_attempt INTEGER NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    processing_result TEXT CHECK (processing_result IN ('success', 'failed', 'timeout')),
    next_retry_scheduled_for TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dead letter queue for webhook failures that exceeded retry limits
CREATE TABLE webhook_dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_failure_id UUID NOT NULL REFERENCES webhook_failures(id),
    webhook_payload JSONB NOT NULL,
    original_error TEXT NOT NULL,
    total_retry_attempts INTEGER NOT NULL,
    last_attempt_at TIMESTAMPTZ NOT NULL,
    requires_manual_intervention BOOLEAN DEFAULT TRUE,
    manual_intervention_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    resolution_method TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integration alerts for operations team
CREATE TABLE integration_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL CHECK (alert_type IN ('service_down', 'high_error_rate', 'webhook_failure', 'circuit_breaker_open', 'fallback_activated')),
    service_name TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    alert_data JSONB,
    wedding_impact BOOLEAN DEFAULT FALSE,
    wedding_date DATE,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    resolution_notes TEXT,
    escalated BOOLEAN DEFAULT FALSE,
    escalated_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_integration_errors_service_name ON integration_errors(service_name);
CREATE INDEX idx_integration_errors_service_type ON integration_errors(service_type);
CREATE INDEX idx_integration_errors_wedding_id ON integration_errors(wedding_id);
CREATE INDEX idx_integration_errors_created_at ON integration_errors(created_at);
CREATE INDEX idx_integration_errors_criticality ON integration_errors(criticality_level);

CREATE INDEX idx_circuit_breaker_events_service ON circuit_breaker_events(service_name);
CREATE INDEX idx_circuit_breaker_events_created_at ON circuit_breaker_events(created_at);

CREATE INDEX idx_webhook_failures_source ON webhook_failures(source);
CREATE INDEX idx_webhook_failures_error_type ON webhook_failures(error_type);
CREATE INDEX idx_webhook_failures_created_at ON webhook_failures(created_at);

CREATE INDEX idx_service_health_metrics_service ON service_health_metrics(service_name);
CREATE INDEX idx_service_health_metrics_measured_at ON service_health_metrics(measured_at);

CREATE INDEX idx_integration_fallback_usage_service ON integration_fallback_usage(service_name);
CREATE INDEX idx_integration_fallback_usage_type ON integration_fallback_usage(fallback_type);
CREATE INDEX idx_integration_fallback_usage_created_at ON integration_fallback_usage(created_at);

CREATE INDEX idx_webhook_retry_queue_scheduled ON webhook_retry_queue(scheduled_for);
CREATE INDEX idx_webhook_retry_queue_processing ON webhook_retry_queue(processing_started_at);

CREATE INDEX idx_integration_alerts_severity ON integration_alerts(severity);
CREATE INDEX idx_integration_alerts_created_at ON integration_alerts(created_at);
CREATE INDEX idx_integration_alerts_unresolved ON integration_alerts(resolved_at) WHERE resolved_at IS NULL;

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_integration_errors_updated_at 
    BEFORE UPDATE ON integration_errors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_failures_updated_at 
    BEFORE UPDATE ON webhook_failures 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_alerts_updated_at 
    BEFORE UPDATE ON integration_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE integration_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuit_breaker_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_fallback_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_retry_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_dead_letter_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_alerts ENABLE ROW LEVEL SECURITY;

-- Service role can access all error tracking data
CREATE POLICY "Service role can manage integration errors" ON integration_errors
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage circuit breaker events" ON circuit_breaker_events
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage webhook failures" ON webhook_failures
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage service health metrics" ON service_health_metrics
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage integration fallback usage" ON integration_fallback_usage
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage webhook retry queue" ON webhook_retry_queue
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage webhook dead letter queue" ON webhook_dead_letter_queue
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage integration alerts" ON integration_alerts
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Admin users can view error data for monitoring
CREATE POLICY "Admins can view integration errors" ON integration_errors
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can view service health metrics" ON service_health_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can view integration alerts" ON integration_alerts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );