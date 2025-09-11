-- WS-131: Payment Error Handling & Recovery System Database Schema
-- Migration for payment error tracking, recovery mechanisms, and automated workflows

-- Payment errors tracking table
CREATE TABLE IF NOT EXISTS payment_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_type VARCHAR(50) NOT NULL CHECK (error_type IN (
        'card_error', 'api_error', 'authentication_error', 'rate_limit_error', 
        'validation_error', 'network_error', 'unknown_error'
    )),
    error_code VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    decline_code VARCHAR(50) DEFAULT NULL,
    payment_intent_id VARCHAR(100) DEFAULT NULL,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    amount INTEGER DEFAULT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    payment_method_id VARCHAR(100) DEFAULT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    recoverable BOOLEAN DEFAULT FALSE,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMPTZ DEFAULT NULL,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'failed')),
    resolved_at TIMESTAMPTZ DEFAULT NULL,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payment errors
CREATE INDEX IF NOT EXISTS idx_payment_errors_status ON payment_errors(status);
CREATE INDEX IF NOT EXISTS idx_payment_errors_severity ON payment_errors(severity);
CREATE INDEX IF NOT EXISTS idx_payment_errors_user_id ON payment_errors(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_errors_subscription_id ON payment_errors(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_errors_error_code ON payment_errors(error_code);
CREATE INDEX IF NOT EXISTS idx_payment_errors_timestamp ON payment_errors(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_payment_errors_retry_at ON payment_errors(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- Payment recovery attempts tracking
CREATE TABLE IF NOT EXISTS payment_recovery_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_id UUID REFERENCES payment_errors(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'retry', 'update_payment_method', 'contact_customer', 
        'suspend_subscription', 'manual_review'
    )),
    attempt_number INTEGER NOT NULL,
    success BOOLEAN DEFAULT FALSE,
    action_taken VARCHAR(100) NOT NULL,
    customer_notified BOOLEAN DEFAULT FALSE,
    admin_alerted BOOLEAN DEFAULT FALSE,
    error_resolved BOOLEAN DEFAULT FALSE,
    execution_time_ms INTEGER DEFAULT NULL,
    next_scheduled_at TIMESTAMPTZ DEFAULT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for recovery attempts
CREATE INDEX IF NOT EXISTS idx_recovery_attempts_error_id ON payment_recovery_attempts(error_id);
CREATE INDEX IF NOT EXISTS idx_recovery_attempts_action_type ON payment_recovery_attempts(action_type);
CREATE INDEX IF NOT EXISTS idx_recovery_attempts_success ON payment_recovery_attempts(success);
CREATE INDEX IF NOT EXISTS idx_recovery_attempts_scheduled ON payment_recovery_attempts(next_scheduled_at) WHERE next_scheduled_at IS NOT NULL;

-- Critical payment errors requiring immediate attention
CREATE TABLE IF NOT EXISTS critical_payment_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_error JSONB NOT NULL,
    context JSONB NOT NULL,
    recovery_error JSONB DEFAULT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'requires_immediate_attention' CHECK (status IN (
        'requires_immediate_attention', 'under_investigation', 'resolved'
    )),
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolution_notes TEXT DEFAULT NULL,
    resolved_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for critical errors
CREATE INDEX IF NOT EXISTS idx_critical_errors_status ON critical_payment_errors(status);
CREATE INDEX IF NOT EXISTS idx_critical_errors_timestamp ON critical_payment_errors(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_critical_errors_assigned ON critical_payment_errors(assigned_to);

-- Payment method update requests
CREATE TABLE IF NOT EXISTS payment_method_update_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    error_id UUID REFERENCES payment_errors(id) ON DELETE SET NULL,
    stripe_setup_intent_id VARCHAR(100) NOT NULL,
    client_secret TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'completed', 'failed', 'expired'
    )),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ DEFAULT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    reminder_sent_at TIMESTAMPTZ DEFAULT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payment method updates
CREATE INDEX IF NOT EXISTS idx_payment_method_updates_user ON payment_method_update_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_method_updates_status ON payment_method_update_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_method_updates_expires ON payment_method_update_requests(expires_at) WHERE status = 'pending';

-- Support tickets generated from payment errors
CREATE TABLE IF NOT EXISTS payment_support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(20) UNIQUE NOT NULL DEFAULT 'PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('payment_ticket_seq')::TEXT, 4, '0'),
    error_id UUID REFERENCES payment_errors(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category VARCHAR(50) DEFAULT 'payment_failure' CHECK (category IN (
        'payment_failure', 'subscription_issue', 'billing_question', 'refund_request'
    )),
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN (
        'open', 'in_progress', 'waiting_customer', 'resolved', 'closed'
    )),
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolution TEXT DEFAULT NULL,
    customer_satisfaction INTEGER DEFAULT NULL CHECK (customer_satisfaction BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ DEFAULT NULL
);

-- Create sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS payment_ticket_seq START 1;

-- Indexes for support tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON payment_support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON payment_support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON payment_support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON payment_support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON payment_support_tickets(created_at DESC);

-- Payment error patterns for ML analysis
CREATE TABLE IF NOT EXISTS payment_error_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_name VARCHAR(100) NOT NULL,
    error_codes TEXT[] NOT NULL,
    conditions JSONB NOT NULL,
    frequency_threshold INTEGER DEFAULT 5,
    time_window_hours INTEGER DEFAULT 24,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    auto_actions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for error patterns
CREATE INDEX IF NOT EXISTS idx_error_patterns_active ON payment_error_patterns(is_active);
CREATE INDEX IF NOT EXISTS idx_error_patterns_severity ON payment_error_patterns(severity);

-- Payment error notifications log
CREATE TABLE IF NOT EXISTS payment_error_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_id UUID REFERENCES payment_errors(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'customer_email', 'admin_email', 'sms', 'push_notification', 'slack_alert', 'webhook'
    )),
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255) DEFAULT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'sent', 'delivered', 'failed', 'bounced'
    )),
    sent_at TIMESTAMPTZ DEFAULT NULL,
    delivered_at TIMESTAMPTZ DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_error_notifications_error_id ON payment_error_notifications(error_id);
CREATE INDEX IF NOT EXISTS idx_error_notifications_status ON payment_error_notifications(status);
CREATE INDEX IF NOT EXISTS idx_error_notifications_type ON payment_error_notifications(notification_type);

-- Subscription suspension log
CREATE TABLE IF NOT EXISTS subscription_suspensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    error_id UUID REFERENCES payment_errors(id) ON DELETE SET NULL,
    reason VARCHAR(100) NOT NULL,
    suspended_at TIMESTAMPTZ DEFAULT NOW(),
    suspended_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reactivated_at TIMESTAMPTZ DEFAULT NULL,
    reactivated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    grace_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    feature_limitations JSONB DEFAULT '{}',
    notes TEXT DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'reactivated', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for suspensions
CREATE INDEX IF NOT EXISTS idx_suspensions_subscription ON subscription_suspensions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_suspensions_status ON subscription_suspensions(status);
CREATE INDEX IF NOT EXISTS idx_suspensions_grace_period ON subscription_suspensions(grace_period_end) WHERE status = 'active';

-- Views for monitoring and reporting

-- Payment error summary view
CREATE OR REPLACE VIEW payment_error_summary AS
SELECT 
    DATE_TRUNC('day', timestamp) as error_date,
    error_type,
    error_code,
    severity,
    COUNT(*) as error_count,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
    COUNT(CASE WHEN recoverable THEN 1 END) as recoverable_count,
    AVG(retry_count) as avg_retry_count,
    SUM(amount) as total_failed_amount
FROM payment_errors 
GROUP BY DATE_TRUNC('day', timestamp), error_type, error_code, severity
ORDER BY error_date DESC, error_count DESC;

-- Recovery success rate view
CREATE OR REPLACE VIEW recovery_success_rate AS
SELECT 
    action_type,
    COUNT(*) as total_attempts,
    COUNT(CASE WHEN success THEN 1 END) as successful_attempts,
    CASE 
        WHEN COUNT(*) > 0 THEN ROUND((COUNT(CASE WHEN success THEN 1 END) * 100.0 / COUNT(*)), 2)
        ELSE 0
    END as success_rate_percentage,
    AVG(execution_time_ms) as avg_execution_time
FROM payment_recovery_attempts
GROUP BY action_type
ORDER BY success_rate_percentage DESC;

-- Critical errors requiring attention view
CREATE OR REPLACE VIEW critical_errors_dashboard AS
SELECT 
    cpe.id,
    cpe.timestamp,
    cpe.status,
    cpe.assigned_to,
    up.full_name as assigned_to_name,
    EXTRACT(EPOCH FROM (NOW() - cpe.timestamp)) / 3600 as hours_since_error,
    (cpe.original_error->>'error_code') as error_code,
    (cpe.original_error->>'error_message') as error_message
FROM critical_payment_errors cpe
LEFT JOIN user_profiles up ON up.user_id = cpe.assigned_to
WHERE cpe.status != 'resolved'
ORDER BY cpe.timestamp DESC;

-- Functions for automated error handling

-- Function to automatically retry eligible payments
CREATE OR REPLACE FUNCTION retry_eligible_payment_errors()
RETURNS void AS $$
BEGIN
    UPDATE payment_errors 
    SET status = 'in_progress',
        retry_count = retry_count + 1,
        next_retry_at = NULL,
        updated_at = NOW()
    WHERE status = 'open'
    AND recoverable = true
    AND retry_count < max_retries
    AND next_retry_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to mark old payment method update requests as expired
CREATE OR REPLACE FUNCTION expire_payment_method_requests()
RETURNS void AS $$
BEGIN
    UPDATE payment_method_update_requests
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'pending'
    AND expires_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to detect payment error patterns
CREATE OR REPLACE FUNCTION detect_error_patterns()
RETURNS TABLE(pattern_name VARCHAR, error_count BIGINT, should_alert BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    WITH recent_errors AS (
        SELECT error_code, COUNT(*) as error_count
        FROM payment_errors 
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY error_code
    ),
    pattern_matches AS (
        SELECT 
            pep.pattern_name,
            re.error_count,
            pep.frequency_threshold,
            (re.error_count >= pep.frequency_threshold) as should_alert
        FROM payment_error_patterns pep
        JOIN recent_errors re ON re.error_code = ANY(pep.error_codes)
        WHERE pep.is_active = true
    )
    SELECT pm.pattern_name, pm.error_count, pm.should_alert
    FROM pattern_matches pm
    ORDER BY pm.error_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate payment error metrics
CREATE OR REPLACE FUNCTION calculate_payment_error_metrics(
    start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
    end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
    total_errors BIGINT,
    critical_errors BIGINT,
    recovery_success_rate DECIMAL,
    avg_resolution_time_hours DECIMAL,
    top_error_code TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH error_stats AS (
        SELECT 
            COUNT(*) as total_errors,
            COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_errors,
            CASE 
                WHEN COUNT(CASE WHEN status = 'resolved' THEN 1 END) > 0 
                THEN ROUND((COUNT(CASE WHEN status = 'resolved' THEN 1 END) * 100.0 / COUNT(*)), 2)
                ELSE 0
            END as recovery_success_rate,
            AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - timestamp)) / 3600) as avg_resolution_time_hours
        FROM payment_errors 
        WHERE timestamp BETWEEN start_date AND end_date
    ),
    top_error AS (
        SELECT error_code
        FROM payment_errors 
        WHERE timestamp BETWEEN start_date AND end_date
        GROUP BY error_code
        ORDER BY COUNT(*) DESC
        LIMIT 1
    )
    SELECT 
        es.total_errors,
        es.critical_errors,
        es.recovery_success_rate,
        ROUND(es.avg_resolution_time_hours, 2) as avg_resolution_time_hours,
        te.error_code as top_error_code
    FROM error_stats es
    CROSS JOIN top_error te;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic updates

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to relevant tables
CREATE TRIGGER update_payment_errors_updated_at 
    BEFORE UPDATE ON payment_errors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_support_tickets_updated_at 
    BEFORE UPDATE ON payment_support_tickets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_error_patterns_updated_at 
    BEFORE UPDATE ON payment_error_patterns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE payment_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_recovery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE critical_payment_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_method_update_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_error_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_error_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_suspensions ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin access
CREATE POLICY "Admin full access to payment_errors" ON payment_errors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'system')
        )
    );

-- User access to their own payment errors
CREATE POLICY "User access to own payment_errors" ON payment_errors
    FOR SELECT USING (user_id = auth.uid());

-- Similar policies for other tables
CREATE POLICY "Admin access to payment_recovery_attempts" ON payment_recovery_attempts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'system')
        )
    );

CREATE POLICY "Admin access to critical_payment_errors" ON critical_payment_errors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'system')
        )
    );

CREATE POLICY "User access to own payment_method_updates" ON payment_method_update_requests
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "User access to own support_tickets" ON payment_support_tickets
    FOR SELECT USING (user_id = auth.uid());

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE payment_errors IS 'Comprehensive tracking of payment failures and errors';
COMMENT ON TABLE payment_recovery_attempts IS 'Log of automated and manual recovery attempts for failed payments';
COMMENT ON TABLE critical_payment_errors IS 'Critical errors requiring immediate human intervention';
COMMENT ON TABLE payment_method_update_requests IS 'Customer requests to update payment methods after failures';
COMMENT ON TABLE payment_support_tickets IS 'Support tickets generated from payment issues';
COMMENT ON TABLE payment_error_patterns IS 'Configurable patterns for detecting systematic payment issues';
COMMENT ON TABLE subscription_suspensions IS 'Log of subscription suspensions due to payment failures';

COMMENT ON VIEW payment_error_summary IS 'Daily summary of payment errors by type and severity';
COMMENT ON VIEW recovery_success_rate IS 'Success rates of different recovery strategies';
COMMENT ON VIEW critical_errors_dashboard IS 'Dashboard view for critical errors requiring attention';

COMMENT ON FUNCTION retry_eligible_payment_errors() IS 'Automatically retry payments that are eligible for retry';
COMMENT ON FUNCTION detect_error_patterns() IS 'Detect patterns in payment errors that may indicate systematic issues';
COMMENT ON FUNCTION calculate_payment_error_metrics(TIMESTAMPTZ, TIMESTAMPTZ) IS 'Calculate key metrics about payment errors over a time period';