-- Migration: 20250908120100_apm_performance_monitoring.sql
-- WS-339: Performance Monitoring System - APM Integration Focus
-- Renamed tables to avoid conflicts with existing performance tables
-- Comprehensive schema for APM, metrics, alerts, and service health monitoring

-- Create enums for type safety
DO $$ BEGIN
    CREATE TYPE apm_metric_type AS ENUM ('counter', 'gauge', 'histogram', 'summary', 'timer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE apm_provider AS ENUM ('datadog', 'newrelic', 'prometheus', 'grafana', 'custom', 'pingdom', 'uptime_robot');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical', 'emergency');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE comparison_operator AS ENUM ('gt', 'gte', 'lt', 'lte', 'eq', 'neq');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE service_status AS ENUM ('healthy', 'warning', 'critical', 'unknown', 'maintenance');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'slack', 'webhook', 'pagerduty');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- APM PERFORMANCE METRICS TABLE
-- High-frequency time-series data for APM integration
-- =============================================
CREATE TABLE apm_performance_metrics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Core metric data
    service_name text NOT NULL,
    metric_name text NOT NULL,
    metric_value numeric(15,6) NOT NULL,
    metric_type apm_metric_type NOT NULL DEFAULT 'gauge',
    unit text, -- e.g., 'ms', 'bytes', 'requests/sec', '%'
    
    -- Flexible tagging for filtering and grouping
    tags jsonb DEFAULT '{}',
    
    -- Wedding-specific context
    wedding_context jsonb DEFAULT '{}', -- { "wedding_date": "2025-06-15", "vendor_type": "photographer", "is_wedding_day": true }
    
    -- APM provider context
    apm_source apm_provider NOT NULL DEFAULT 'custom',
    external_id text, -- ID from the APM provider
    
    -- Time-series data
    timestamp timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- =============================================
-- APM CONFIGURATIONS TABLE
-- Store encrypted configs for different monitoring providers
-- =============================================
CREATE TABLE apm_configurations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Provider configuration
    provider apm_provider NOT NULL,
    name text NOT NULL, -- User-friendly name for this config
    
    -- Encrypted configuration data
    config jsonb NOT NULL, -- Encrypted API keys, endpoints, etc.
    
    -- Wedding-specific settings
    wedding_day_alerts_enabled boolean DEFAULT true,
    emergency_contact_override jsonb, -- Special contacts for wedding day emergencies
    
    -- Status and metadata
    is_active boolean DEFAULT true,
    last_health_check timestamptz,
    health_check_status service_status DEFAULT 'unknown',
    
    -- Audit fields
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    
    -- Constraints
    UNIQUE(organization_id, provider, name)
);

-- =============================================
-- APM PERFORMANCE ALERTS TABLE
-- Define alert rules with wedding-specific overrides
-- =============================================
CREATE TABLE apm_performance_alerts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Alert definition
    alert_name text NOT NULL,
    description text,
    metric_pattern text NOT NULL, -- Pattern to match metrics (e.g., "api.response_time.*")
    
    -- Threshold configuration
    threshold_value numeric(15,6) NOT NULL,
    comparison_operator comparison_operator NOT NULL DEFAULT 'gt',
    evaluation_window interval DEFAULT '5 minutes', -- Time window for evaluation
    
    -- Severity and handling
    severity alert_severity NOT NULL DEFAULT 'warning',
    notification_channels notification_channel[] DEFAULT ARRAY['email'],
    notification_config jsonb DEFAULT '{}', -- Channel-specific configs
    
    -- Wedding-specific overrides
    wedding_day_override boolean DEFAULT false,
    wedding_day_threshold_value numeric(15,6), -- Stricter thresholds for wedding days
    wedding_day_severity alert_severity, -- Escalated severity for wedding days
    
    -- Alert behavior
    is_active boolean DEFAULT true,
    cooldown_period interval DEFAULT '15 minutes', -- Prevent alert spam
    auto_resolve boolean DEFAULT true,
    
    -- Audit and tracking
    last_triggered_at timestamptz,
    trigger_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Constraints
    UNIQUE(organization_id, alert_name)
);

-- =============================================
-- APM SERVICE HEALTH STATUS TABLE
-- Track health of third-party services critical to wedding operations
-- =============================================
CREATE TABLE apm_service_health_status (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Service identification
    service_name text NOT NULL,
    service_type text, -- e.g., 'payment', 'email', 'storage', 'crm'
    endpoint_url text,
    
    -- Current health status
    status service_status NOT NULL DEFAULT 'unknown',
    last_check_at timestamptz DEFAULT now(),
    next_check_at timestamptz,
    
    -- Performance metrics
    response_time_ms numeric(10,3),
    error_rate numeric(5,4) DEFAULT 0, -- Error rate as decimal (0.0 to 1.0)
    availability_percentage numeric(5,2) DEFAULT 100.00,
    
    -- Wedding-specific flags
    wedding_critical boolean DEFAULT false, -- Critical for wedding day operations
    vendor_facing boolean DEFAULT false, -- Service is vendor-facing
    couple_facing boolean DEFAULT false, -- Service is couple-facing
    
    -- Health check configuration
    check_interval interval DEFAULT '1 minute',
    timeout_seconds integer DEFAULT 30,
    expected_status_code integer DEFAULT 200,
    
    -- Alert thresholds
    response_time_threshold_ms numeric(10,3) DEFAULT 5000,
    error_rate_threshold numeric(5,4) DEFAULT 0.05, -- 5% error rate threshold
    availability_threshold numeric(5,2) DEFAULT 99.00, -- 99% availability threshold
    
    -- Status history (for trend analysis)
    status_history jsonb DEFAULT '[]', -- Last 24 hours of status changes
    
    -- Metadata
    tags jsonb DEFAULT '{}',
    config jsonb DEFAULT '{}', -- Service-specific configuration
    
    -- Audit fields
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Constraints
    UNIQUE(organization_id, service_name)
);

-- =============================================
-- APM ALERT INCIDENTS TABLE
-- Track alert firing and resolution history
-- =============================================
CREATE TABLE apm_alert_incidents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    alert_id uuid NOT NULL REFERENCES apm_performance_alerts(id) ON DELETE CASCADE,
    
    -- Incident details
    triggered_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    status text NOT NULL DEFAULT 'firing', -- 'firing', 'resolved', 'acknowledged'
    
    -- Context when alert fired
    metric_value numeric(15,6) NOT NULL,
    threshold_value numeric(15,6) NOT NULL,
    severity alert_severity NOT NULL,
    
    -- Wedding context
    was_wedding_day boolean DEFAULT false,
    wedding_date date,
    affected_weddings jsonb DEFAULT '[]', -- Array of wedding IDs potentially affected
    
    -- Resolution tracking
    acknowledged_by uuid REFERENCES auth.users(id),
    acknowledged_at timestamptz,
    resolved_by uuid REFERENCES auth.users(id),
    resolution_notes text,
    
    -- Notification tracking
    notifications_sent jsonb DEFAULT '[]', -- Track which notifications were sent
    
    created_at timestamptz DEFAULT now()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- Optimized for time-series queries and high-frequency inserts
-- =============================================

-- APM Performance metrics indexes
CREATE INDEX idx_apm_performance_metrics_org_timestamp ON apm_performance_metrics(organization_id, timestamp DESC);
CREATE INDEX idx_apm_performance_metrics_service_metric ON apm_performance_metrics(service_name, metric_name, timestamp DESC);
CREATE INDEX idx_apm_performance_metrics_wedding_day ON apm_performance_metrics(organization_id, timestamp) 
    WHERE (wedding_context->>'is_wedding_day')::boolean = true;
CREATE INDEX idx_apm_performance_metrics_tags ON apm_performance_metrics USING GIN(tags);
CREATE INDEX idx_apm_performance_metrics_wedding_context ON apm_performance_metrics USING GIN(wedding_context);
CREATE INDEX idx_apm_performance_metrics_provider ON apm_performance_metrics(apm_source, timestamp DESC);

-- APM configurations indexes
CREATE INDEX idx_apm_configurations_org_active ON apm_configurations(organization_id, is_active);
CREATE INDEX idx_apm_configurations_provider ON apm_configurations(provider, is_active);

-- APM Performance alerts indexes
CREATE INDEX idx_apm_performance_alerts_org_active ON apm_performance_alerts(organization_id, is_active);
CREATE INDEX idx_apm_performance_alerts_severity ON apm_performance_alerts(severity, is_active);
CREATE INDEX idx_apm_performance_alerts_wedding_override ON apm_performance_alerts(organization_id) 
    WHERE wedding_day_override = true;

-- APM Service health status indexes
CREATE INDEX idx_apm_service_health_org_status ON apm_service_health_status(organization_id, status);
CREATE INDEX idx_apm_service_health_wedding_critical ON apm_service_health_status(organization_id, wedding_critical);
CREATE INDEX idx_apm_service_health_next_check ON apm_service_health_status(next_check_at) 
    WHERE status != 'maintenance';

-- APM Alert incidents indexes
CREATE INDEX idx_apm_alert_incidents_alert_triggered ON apm_alert_incidents(alert_id, triggered_at DESC);
CREATE INDEX idx_apm_alert_incidents_org_status ON apm_alert_incidents(organization_id, status);
CREATE INDEX idx_apm_alert_incidents_wedding_day ON apm_alert_incidents(organization_id, wedding_date) 
    WHERE was_wedding_day = true;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- Multi-tenant security for all tables
-- =============================================

-- Enable RLS
ALTER TABLE apm_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE apm_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE apm_performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE apm_service_health_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE apm_alert_incidents ENABLE ROW LEVEL SECURITY;

-- APM Performance metrics policies
CREATE POLICY "Users can view own organization apm performance metrics" ON apm_performance_metrics
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own organization apm performance metrics" ON apm_performance_metrics
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Service role can insert metrics for monitoring systems
CREATE POLICY "Service role can insert apm performance metrics" ON apm_performance_metrics
    FOR INSERT TO service_role USING (true);

-- APM configurations policies
CREATE POLICY "Users can manage own organization apm configs" ON apm_configurations
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- APM Performance alerts policies
CREATE POLICY "Users can manage own organization apm alerts" ON apm_performance_alerts
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- APM Service health status policies
CREATE POLICY "Users can view own organization apm service health" ON apm_service_health_status
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can update apm service health" ON apm_service_health_status
    FOR ALL TO service_role USING (true);

-- APM Alert incidents policies
CREATE POLICY "Users can view own organization apm alert incidents" ON apm_alert_incidents
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own organization apm alert incidents" ON apm_alert_incidents
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- =============================================
-- FUNCTIONS FOR AUTOMATED OPERATIONS
-- =============================================

-- Function to check if a date is a wedding day for an organization
CREATE OR REPLACE FUNCTION is_wedding_day_apm(org_id uuid, check_date date DEFAULT CURRENT_DATE)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM clients 
        WHERE organization_id = org_id 
        AND wedding_date = check_date
        AND deleted_at IS NULL
    );
$$;

-- Function to update APM service health status
CREATE OR REPLACE FUNCTION update_apm_service_health_status(
    p_organization_id uuid,
    p_service_name text,
    p_status service_status,
    p_response_time_ms numeric DEFAULT NULL,
    p_error_rate numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_availability numeric;
    v_status_history jsonb;
    v_check_interval interval;
BEGIN
    -- Calculate availability based on error rate
    v_availability := CASE 
        WHEN p_error_rate IS NOT NULL THEN (1 - p_error_rate) * 100
        ELSE NULL
    END;
    
    -- Get current status history and add new entry
    SELECT status_history, check_interval INTO v_status_history, v_check_interval
    FROM apm_service_health_status
    WHERE organization_id = p_organization_id AND service_name = p_service_name;
    
    -- Default interval if no record exists
    v_check_interval := COALESCE(v_check_interval, '1 minute'::interval);
    
    -- Add new status entry to history (keep last 24 entries)
    v_status_history := COALESCE(v_status_history, '[]'::jsonb);
    v_status_history := v_status_history || jsonb_build_object(
        'timestamp', now(),
        'status', p_status,
        'response_time_ms', p_response_time_ms,
        'error_rate', p_error_rate
    );
    
    -- Keep only last 24 entries
    IF jsonb_array_length(v_status_history) > 24 THEN
        v_status_history := v_status_history #> '{1,}';
    END IF;
    
    -- Update or insert service health record
    INSERT INTO apm_service_health_status (
        organization_id, service_name, status, response_time_ms, 
        error_rate, availability_percentage, status_history, 
        last_check_at, next_check_at, updated_at
    )
    VALUES (
        p_organization_id, p_service_name, p_status, p_response_time_ms,
        p_error_rate, v_availability, v_status_history,
        now(), now() + v_check_interval, now()
    )
    ON CONFLICT (organization_id, service_name)
    DO UPDATE SET
        status = p_status,
        response_time_ms = COALESCE(p_response_time_ms, apm_service_health_status.response_time_ms),
        error_rate = COALESCE(p_error_rate, apm_service_health_status.error_rate),
        availability_percentage = COALESCE(v_availability, apm_service_health_status.availability_percentage),
        status_history = v_status_history,
        last_check_at = now(),
        next_check_at = now() + apm_service_health_status.check_interval,
        updated_at = now();
END;
$$;

-- Function to insert APM metrics from external providers
CREATE OR REPLACE FUNCTION insert_apm_metric(
    p_organization_id uuid,
    p_service_name text,
    p_metric_name text,
    p_metric_value numeric,
    p_metric_type apm_metric_type DEFAULT 'gauge',
    p_unit text DEFAULT NULL,
    p_tags jsonb DEFAULT '{}',
    p_apm_source apm_provider DEFAULT 'custom',
    p_wedding_context jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_metric_id uuid;
BEGIN
    INSERT INTO apm_performance_metrics (
        organization_id, service_name, metric_name, metric_value, 
        metric_type, unit, tags, apm_source, wedding_context, timestamp
    )
    VALUES (
        p_organization_id, p_service_name, p_metric_name, p_metric_value,
        p_metric_type, p_unit, p_tags, p_apm_source, p_wedding_context, now()
    )
    RETURNING id INTO v_metric_id;
    
    RETURN v_metric_id;
END;
$$;

-- =============================================
-- TRIGGERS FOR AUTOMATION
-- =============================================

-- Update timestamp on configuration changes
CREATE OR REPLACE FUNCTION update_updated_at_column_apm()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_apm_configurations_updated_at
    BEFORE UPDATE ON apm_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column_apm();

CREATE TRIGGER update_apm_performance_alerts_updated_at
    BEFORE UPDATE ON apm_performance_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column_apm();

CREATE TRIGGER update_apm_service_health_status_updated_at
    BEFORE UPDATE ON apm_service_health_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column_apm();

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- Wedding day APM metrics view
CREATE VIEW wedding_day_apm_metrics AS
SELECT 
    apm.*,
    c.wedding_date,
    c.partner_1_name || ' & ' || c.partner_2_name as couple_names,
    o.name as organization_name
FROM apm_performance_metrics apm
JOIN clients c ON c.organization_id = apm.organization_id
JOIN organizations o ON o.id = apm.organization_id
WHERE (apm.wedding_context->>'is_wedding_day')::boolean = true
    AND DATE(apm.timestamp) = c.wedding_date;

-- APM health dashboard view
CREATE VIEW apm_health_dashboard AS
SELECT 
    ashs.organization_id,
    o.name as organization_name,
    ashs.service_name,
    ashs.status,
    ashs.response_time_ms,
    ashs.error_rate,
    ashs.availability_percentage,
    ashs.wedding_critical,
    ashs.last_check_at,
    -- Recent metrics
    (
        SELECT avg(metric_value) 
        FROM apm_performance_metrics apm 
        WHERE apm.service_name = ashs.service_name 
        AND apm.organization_id = ashs.organization_id
        AND apm.metric_name = 'response_time'
        AND apm.timestamp > now() - interval '1 hour'
    ) as avg_response_time_1h,
    -- Active alerts count
    (
        SELECT count(*) 
        FROM apm_alert_incidents aai
        JOIN apm_performance_alerts apa ON apa.id = aai.alert_id
        WHERE apa.organization_id = ashs.organization_id
        AND aai.status = 'firing'
    ) as active_alerts_count
FROM apm_service_health_status ashs
JOIN organizations o ON o.id = ashs.organization_id;

-- =============================================
-- COMMENTS AND DOCUMENTATION
-- =============================================

COMMENT ON TABLE apm_performance_metrics IS 'High-frequency time-series data from APM providers for wedding vendor performance monitoring';
COMMENT ON TABLE apm_configurations IS 'Configuration for various APM providers with encrypted credentials';
COMMENT ON TABLE apm_performance_alerts IS 'Alert rules with wedding-day specific overrides and thresholds';
COMMENT ON TABLE apm_service_health_status IS 'Health monitoring for third-party services critical to wedding operations';
COMMENT ON TABLE apm_alert_incidents IS 'Historical record of alert firings and resolutions with wedding context';

COMMENT ON COLUMN apm_performance_metrics.wedding_context IS 'Wedding-specific context like wedding_date, vendor_type, is_wedding_day for filtering';
COMMENT ON COLUMN apm_performance_alerts.wedding_day_override IS 'Enable stricter monitoring thresholds on wedding days';
COMMENT ON COLUMN apm_service_health_status.wedding_critical IS 'Flag services that are critical for wedding day operations';

COMMENT ON VIEW wedding_day_apm_metrics IS 'APM performance metrics specifically for wedding days with couple context';
COMMENT ON VIEW apm_health_dashboard IS 'Comprehensive health dashboard combining service status and recent metrics';