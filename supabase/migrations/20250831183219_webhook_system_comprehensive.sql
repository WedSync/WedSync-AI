-- ================================================
-- WS-201: Comprehensive Webhook System Database Schema
-- Team B - Backend/API Implementation
-- Created: 2025-08-31
-- ================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- TABLE 1: WEBHOOK EVENT TYPES
-- Defines available webhook events for wedding industry
-- ================================================
CREATE TABLE webhook_event_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name TEXT NOT NULL UNIQUE,
    event_category TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    payload_schema JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_event_category CHECK (
        event_category IN ('client', 'form', 'journey', 'payment', 'wedding', 'system', 'integration')
    )
);

-- Insert standard wedding industry webhook events
INSERT INTO webhook_event_types (event_name, event_category, description, payload_schema) VALUES
('client.created', 'client', 'New client added to system', '{"client_id": "uuid", "supplier_id": "uuid", "client_data": "object"}'),
('client.updated', 'client', 'Client information updated', '{"client_id": "uuid", "supplier_id": "uuid", "changes": "object"}'),
('client.status_changed', 'client', 'Client status or stage changed', '{"client_id": "uuid", "old_status": "string", "new_status": "string"}'),
('form.submitted', 'form', 'Form submission received', '{"form_id": "uuid", "client_id": "uuid", "responses": "object"}'),
('form.completed', 'form', 'All form sections completed', '{"form_id": "uuid", "client_id": "uuid", "completion_data": "object"}'),
('journey.step_completed', 'journey', 'Journey step marked complete', '{"journey_id": "uuid", "step_id": "uuid", "client_id": "uuid"}'),
('journey.completed', 'journey', 'Entire journey completed', '{"journey_id": "uuid", "client_id": "uuid", "completion_date": "timestamp"}'),
('payment.received', 'payment', 'Payment successfully processed', '{"payment_id": "uuid", "amount": "number", "client_id": "uuid"}'),
('payment.failed', 'payment', 'Payment processing failed', '{"payment_id": "uuid", "error": "string", "client_id": "uuid"}'),
('wedding.date_changed', 'wedding', 'Wedding date updated', '{"client_id": "uuid", "old_date": "date", "new_date": "date"}'),
('wedding.venue_changed', 'wedding', 'Wedding venue updated', '{"client_id": "uuid", "old_venue": "string", "new_venue": "string"}'),
('system.backup_completed', 'system', 'System backup completed', '{"backup_id": "uuid", "size": "number", "duration": "number"}'),
('integration.sync_completed', 'integration', 'CRM sync completed', '{"integration_type": "string", "records_synced": "number", "duration": "number"}'),
('integration.sync_failed', 'integration', 'CRM sync failed', '{"integration_type": "string", "error": "string", "retry_count": "number"}');

-- ================================================
-- TABLE 2: WEBHOOK ENDPOINTS
-- Stores registered webhook endpoints per organization
-- ================================================
CREATE TABLE webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    endpoint_url TEXT NOT NULL,
    secret_key TEXT NOT NULL,
    description TEXT,
    integration_type TEXT DEFAULT 'custom',
    subscribed_events TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    business_critical BOOLEAN DEFAULT FALSE,
    rate_limit_per_minute INTEGER DEFAULT 60,
    timeout_seconds INTEGER DEFAULT 30,
    retry_count INTEGER DEFAULT 5,
    
    -- Configuration options
    headers JSONB DEFAULT '{}',
    auth_config JSONB DEFAULT '{}',
    validation_config JSONB DEFAULT '{}',
    
    -- Analytics and monitoring
    total_deliveries BIGINT DEFAULT 0,
    successful_deliveries BIGINT DEFAULT 0,
    failed_deliveries BIGINT DEFAULT 0,
    last_delivery_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    health_score DECIMAL(3,2) DEFAULT 1.00,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id),
    
    CONSTRAINT valid_integration_type CHECK (
        integration_type IN ('crm_integration', 'email_automation', 'booking_system', 'payment_system', 'analytics', 'custom')
    ),
    CONSTRAINT valid_url_https CHECK (endpoint_url LIKE 'https://%'),
    CONSTRAINT valid_timeout CHECK (timeout_seconds BETWEEN 5 AND 300),
    CONSTRAINT valid_retry_count CHECK (retry_count BETWEEN 0 AND 10),
    CONSTRAINT valid_rate_limit CHECK (rate_limit_per_minute BETWEEN 1 AND 1000)
);

-- ================================================
-- TABLE 3: WEBHOOK DELIVERIES
-- Tracks all webhook delivery attempts and status
-- ================================================
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    webhook_endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Event details
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    signature TEXT NOT NULL,
    
    -- Delivery status and tracking
    status TEXT NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Attempt tracking
    attempt_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,
    next_retry_at TIMESTAMPTZ,
    
    -- Response tracking
    response_status INTEGER,
    response_body TEXT,
    response_headers JSONB,
    response_time_ms INTEGER,
    
    -- Error tracking
    error_message TEXT,
    error_code TEXT,
    error_details JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT valid_status CHECK (
        status IN ('pending', 'processing', 'delivered', 'failed', 'permanently_failed', 'retrying')
    ),
    CONSTRAINT valid_priority CHECK (priority BETWEEN 1 AND 10),
    CONSTRAINT valid_max_retries CHECK (max_retries BETWEEN 0 AND 10)
);

-- ================================================
-- TABLE 4: WEBHOOK DELIVERY QUEUE
-- Optimized queue table for processing webhook deliveries
-- ================================================
CREATE TABLE webhook_delivery_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES webhook_deliveries(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Queue management
    status TEXT NOT NULL DEFAULT 'queued',
    priority INTEGER DEFAULT 5,
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    
    -- Processing tracking
    processing_started_at TIMESTAMPTZ,
    processing_node TEXT,
    lock_expires_at TIMESTAMPTZ,
    
    -- Retry management
    retry_delay_seconds INTEGER DEFAULT 60,
    max_processing_time_seconds INTEGER DEFAULT 300,
    
    -- Metadata
    queue_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_queue_status CHECK (
        status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')
    ),
    CONSTRAINT valid_queue_priority CHECK (priority BETWEEN 1 AND 10),
    CONSTRAINT valid_retry_delay CHECK (retry_delay_seconds BETWEEN 1 AND 3600)
);

-- ================================================
-- TABLE 5: WEBHOOK DEAD LETTER QUEUE
-- Stores permanently failed webhook deliveries for review
-- ================================================
CREATE TABLE webhook_dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_delivery_id UUID NOT NULL,
    webhook_endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Original delivery information
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    signature TEXT NOT NULL,
    
    -- Failure information
    failure_reason TEXT NOT NULL,
    final_error_message TEXT,
    final_error_code TEXT,
    total_attempts INTEGER NOT NULL,
    first_attempt_at TIMESTAMPTZ NOT NULL,
    final_attempt_at TIMESTAMPTZ NOT NULL,
    
    -- Administrative fields
    status TEXT DEFAULT 'review_required',
    admin_notes TEXT,
    resolution_action TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES user_profiles(id),
    
    -- Metadata
    failure_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_dlq_status CHECK (
        status IN ('review_required', 'under_review', 'resolved', 'requeued', 'discarded')
    )
);

-- ================================================
-- TABLE 6: WEBHOOK SECURITY EVENTS
-- Logs security incidents and suspicious webhook activity
-- ================================================
CREATE TABLE webhook_security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    webhook_endpoint_id UUID REFERENCES webhook_endpoints(id) ON DELETE SET NULL,
    
    -- Security event details
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    
    -- Request details
    source_ip INET,
    user_agent TEXT,
    request_headers JSONB,
    
    -- Security check results
    signature_valid BOOLEAN,
    timestamp_valid BOOLEAN,
    rate_limit_exceeded BOOLEAN,
    
    -- Response details
    action_taken TEXT,
    blocked BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    security_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_security_event_type CHECK (
        event_type IN ('invalid_signature', 'expired_timestamp', 'rate_limit_exceeded', 'suspicious_activity', 'unauthorized_access', 'malformed_request')
    ),
    CONSTRAINT valid_severity CHECK (
        severity IN ('low', 'medium', 'high', 'critical')
    )
);

-- ================================================
-- TABLE 7: WEBHOOK ANALYTICS
-- Stores performance metrics and usage analytics
-- ================================================
CREATE TABLE webhook_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    webhook_endpoint_id UUID REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    
    -- Time period for metrics
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    period_type TEXT NOT NULL,
    
    -- Delivery metrics
    total_deliveries INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    failed_deliveries INTEGER DEFAULT 0,
    permanently_failed_deliveries INTEGER DEFAULT 0,
    
    -- Performance metrics
    avg_response_time_ms DECIMAL(10,2),
    p95_response_time_ms DECIMAL(10,2),
    min_response_time_ms INTEGER,
    max_response_time_ms INTEGER,
    
    -- Reliability metrics
    success_rate DECIMAL(5,2),
    failure_rate DECIMAL(5,2),
    avg_retry_count DECIMAL(5,2),
    
    -- Security metrics
    security_events INTEGER DEFAULT 0,
    blocked_requests INTEGER DEFAULT 0,
    
    -- Business metrics
    business_critical_deliveries INTEGER DEFAULT 0,
    wedding_day_deliveries INTEGER DEFAULT 0,
    
    -- Metadata
    analytics_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_period_type CHECK (
        period_type IN ('hourly', 'daily', 'weekly', 'monthly')
    ),
    CONSTRAINT valid_period_order CHECK (period_end > period_start)
);

-- ================================================
-- INDEXES FOR PERFORMANCE
-- Optimized for high-volume webhook processing
-- ================================================

-- Webhook endpoints indexes
CREATE INDEX idx_webhook_endpoints_org_active ON webhook_endpoints(organization_id, is_active);
CREATE INDEX idx_webhook_endpoints_integration ON webhook_endpoints(integration_type, is_active);
CREATE INDEX idx_webhook_endpoints_health ON webhook_endpoints(health_score DESC, last_success_at DESC);

-- Webhook deliveries indexes (critical for queue processing)
CREATE INDEX idx_webhook_deliveries_status_scheduled ON webhook_deliveries(status, scheduled_at) WHERE status IN ('pending', 'retrying');
CREATE INDEX idx_webhook_deliveries_endpoint_status ON webhook_deliveries(webhook_endpoint_id, status);
CREATE INDEX idx_webhook_deliveries_org_created ON webhook_deliveries(organization_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_event_type ON webhook_deliveries(event_type, created_at DESC);
CREATE INDEX idx_webhook_deliveries_priority_scheduled ON webhook_deliveries(priority DESC, scheduled_at ASC) WHERE status IN ('pending', 'retrying');

-- Delivery queue indexes (optimized for processing)
CREATE INDEX idx_webhook_delivery_queue_processing ON webhook_delivery_queue(status, priority DESC, scheduled_for ASC) WHERE status = 'queued';
CREATE INDEX idx_webhook_delivery_queue_org_status ON webhook_delivery_queue(organization_id, status);
CREATE INDEX idx_webhook_delivery_queue_cleanup ON webhook_delivery_queue(created_at) WHERE status IN ('completed', 'failed');

-- Dead letter queue indexes
CREATE INDEX idx_webhook_dlq_status_created ON webhook_dead_letter_queue(status, created_at DESC);
CREATE INDEX idx_webhook_dlq_org_status ON webhook_dead_letter_queue(organization_id, status);
CREATE INDEX idx_webhook_dlq_endpoint ON webhook_dead_letter_queue(webhook_endpoint_id, created_at DESC);

-- Security events indexes
CREATE INDEX idx_webhook_security_events_org_severity ON webhook_security_events(organization_id, severity, created_at DESC);
CREATE INDEX idx_webhook_security_events_endpoint ON webhook_security_events(webhook_endpoint_id, created_at DESC);
CREATE INDEX idx_webhook_security_events_blocked ON webhook_security_events(blocked, created_at DESC) WHERE blocked = TRUE;

-- Analytics indexes
CREATE INDEX idx_webhook_analytics_org_period ON webhook_analytics(organization_id, period_type, period_start DESC);
CREATE INDEX idx_webhook_analytics_endpoint_period ON webhook_analytics(webhook_endpoint_id, period_type, period_start DESC);

-- ================================================
-- ROW LEVEL SECURITY POLICIES
-- Multi-tenant security for webhook system
-- ================================================

-- Enable RLS on all tables
ALTER TABLE webhook_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_delivery_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_dead_letter_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_analytics ENABLE ROW LEVEL SECURITY;

-- Webhook event types - read-only for authenticated users
CREATE POLICY "webhook_event_types_read_policy" ON webhook_event_types
    FOR SELECT USING (auth.role() = 'authenticated');

-- Webhook endpoints - organizations can manage their own
CREATE POLICY "webhook_endpoints_policy" ON webhook_endpoints
    FOR ALL USING (
        organization_id = (auth.jwt() ->> 'organization_id')::UUID
        OR auth.role() = 'service_role'
    );

-- Webhook deliveries - organizations can view their own
CREATE POLICY "webhook_deliveries_policy" ON webhook_deliveries
    FOR ALL USING (
        organization_id = (auth.jwt() ->> 'organization_id')::UUID
        OR auth.role() = 'service_role'
    );

-- Delivery queue - service role and organization access
CREATE POLICY "webhook_delivery_queue_policy" ON webhook_delivery_queue
    FOR ALL USING (
        organization_id = (auth.jwt() ->> 'organization_id')::UUID
        OR auth.role() = 'service_role'
    );

-- Dead letter queue - organizations can view their failures
CREATE POLICY "webhook_dlq_policy" ON webhook_dead_letter_queue
    FOR ALL USING (
        organization_id = (auth.jwt() ->> 'organization_id')::UUID
        OR auth.role() = 'service_role'
    );

-- Security events - organizations can view their security events
CREATE POLICY "webhook_security_events_policy" ON webhook_security_events
    FOR ALL USING (
        organization_id = (auth.jwt() ->> 'organization_id')::UUID
        OR auth.role() = 'service_role'
    );

-- Analytics - organizations can view their analytics
CREATE POLICY "webhook_analytics_policy" ON webhook_analytics
    FOR ALL USING (
        organization_id = (auth.jwt() ->> 'organization_id')::UUID
        OR auth.role() = 'service_role'
    );

-- ================================================
-- FUNCTIONS AND TRIGGERS
-- Automated webhook system management
-- ================================================

-- Function to update webhook endpoint statistics
CREATE OR REPLACE FUNCTION update_webhook_endpoint_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update endpoint statistics based on delivery status
        UPDATE webhook_endpoints 
        SET 
            total_deliveries = total_deliveries + CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE 0 END,
            successful_deliveries = successful_deliveries + CASE WHEN NEW.status = 'delivered' THEN 1 ELSE 0 END,
            failed_deliveries = failed_deliveries + CASE WHEN NEW.status IN ('failed', 'permanently_failed') THEN 1 ELSE 0 END,
            last_delivery_at = CASE WHEN NEW.status != 'pending' THEN NEW.completed_at ELSE last_delivery_at END,
            last_success_at = CASE WHEN NEW.status = 'delivered' THEN NEW.completed_at ELSE last_success_at END,
            last_failure_at = CASE WHEN NEW.status IN ('failed', 'permanently_failed') THEN NEW.completed_at ELSE last_failure_at END,
            health_score = CASE 
                WHEN total_deliveries > 0 THEN 
                    ROUND((successful_deliveries::DECIMAL / total_deliveries::DECIMAL), 2)
                ELSE 1.00
            END,
            updated_at = NOW()
        WHERE id = NEW.webhook_endpoint_id;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for webhook endpoint statistics
CREATE TRIGGER webhook_delivery_stats_trigger
    AFTER INSERT OR UPDATE OF status ON webhook_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_endpoint_stats();

-- Function to automatically queue webhook deliveries
CREATE OR REPLACE FUNCTION queue_webhook_delivery()
RETURNS TRIGGER AS $$
BEGIN
    -- Add new deliveries to the processing queue
    INSERT INTO webhook_delivery_queue (
        delivery_id,
        organization_id,
        priority,
        scheduled_for,
        retry_delay_seconds
    ) VALUES (
        NEW.id,
        NEW.organization_id,
        NEW.priority,
        NEW.scheduled_at,
        CASE NEW.attempt_count
            WHEN 0 THEN 0  -- First attempt immediate
            WHEN 1 THEN 60 -- 1 minute
            WHEN 2 THEN 120 -- 2 minutes
            WHEN 3 THEN 240 -- 4 minutes
            WHEN 4 THEN 480 -- 8 minutes
            ELSE 960 -- 16 minutes
        END
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically queue deliveries
CREATE TRIGGER webhook_delivery_queue_trigger
    AFTER INSERT ON webhook_deliveries
    FOR EACH ROW
    WHEN (NEW.status IN ('pending', 'retrying'))
    EXECUTE FUNCTION queue_webhook_delivery();

-- Function to clean up old webhook data
CREATE OR REPLACE FUNCTION cleanup_old_webhook_data()
RETURNS void AS $$
BEGIN
    -- Delete old completed deliveries (>30 days)
    DELETE FROM webhook_deliveries 
    WHERE status IN ('delivered', 'permanently_failed') 
    AND completed_at < NOW() - INTERVAL '30 days';
    
    -- Delete old queue entries (>7 days)
    DELETE FROM webhook_delivery_queue 
    WHERE status IN ('completed', 'failed') 
    AND created_at < NOW() - INTERVAL '7 days';
    
    -- Delete old security events (>90 days) except critical ones
    DELETE FROM webhook_security_events 
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND severity != 'critical';
    
    -- Delete old analytics data (>1 year) except monthly summaries
    DELETE FROM webhook_analytics 
    WHERE created_at < NOW() - INTERVAL '1 year'
    AND period_type != 'monthly';
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- COMMENTS AND DOCUMENTATION
-- ================================================

COMMENT ON TABLE webhook_event_types IS 'Defines available webhook events for the wedding industry with payload schemas';
COMMENT ON TABLE webhook_endpoints IS 'Stores registered webhook endpoints per organization with configuration and analytics';
COMMENT ON TABLE webhook_deliveries IS 'Tracks all webhook delivery attempts with comprehensive status and error tracking';
COMMENT ON TABLE webhook_delivery_queue IS 'Optimized queue table for processing webhook deliveries with priority support';
COMMENT ON TABLE webhook_dead_letter_queue IS 'Stores permanently failed webhook deliveries for administrative review';
COMMENT ON TABLE webhook_security_events IS 'Logs security incidents and suspicious webhook activity for monitoring';
COMMENT ON TABLE webhook_analytics IS 'Stores performance metrics and usage analytics for webhook endpoints';

COMMENT ON FUNCTION update_webhook_endpoint_stats() IS 'Automatically updates webhook endpoint statistics when deliveries complete';
COMMENT ON FUNCTION queue_webhook_delivery() IS 'Automatically queues new webhook deliveries with exponential backoff scheduling';
COMMENT ON FUNCTION cleanup_old_webhook_data() IS 'Cleans up old webhook data to maintain database performance';

-- ================================================
-- INITIAL DATA AND CONFIGURATION
-- ================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Success message
SELECT 'WS-201 Webhook System Database Schema created successfully!' as result;