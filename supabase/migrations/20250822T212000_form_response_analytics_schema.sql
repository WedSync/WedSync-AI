-- WS-080: Form Response Analytics Schema
-- Date: 2025-08-22
-- Feature: Analytics dashboard for wedding form responses and guest data insights

-- Create analytics schema if not exists
CREATE SCHEMA IF NOT EXISTS analytics;

-- Response tracking table for form submissions
CREATE TABLE IF NOT EXISTS analytics.form_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    form_type TEXT NOT NULL CHECK (form_type IN ('rsvp', 'vendor', 'dietary', 'preference', 'general')),
    respondent_id UUID,
    respondent_type TEXT CHECK (respondent_type IN ('guest', 'vendor', 'couple', 'planner')),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    event_id UUID,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    response_time_seconds INTEGER, -- Time taken to complete form
    device_type TEXT,
    browser TEXT,
    ip_address INET,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guest demographic analytics table
CREATE TABLE IF NOT EXISTS analytics.guest_demographics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    guest_id UUID,
    age_group TEXT CHECK (age_group IN ('0-12', '13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+')),
    location_city TEXT,
    location_state TEXT,
    location_country TEXT,
    dietary_preference TEXT,
    accessibility_needs BOOLEAN DEFAULT FALSE,
    plus_one BOOLEAN DEFAULT FALSE,
    rsvp_status TEXT CHECK (rsvp_status IN ('pending', 'accepted', 'declined', 'maybe')),
    travel_distance_km NUMERIC,
    accommodation_needed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor completion tracking
CREATE TABLE IF NOT EXISTS analytics.vendor_completion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    form_id UUID NOT NULL,
    form_name TEXT NOT NULL,
    total_fields INTEGER NOT NULL DEFAULT 0,
    completed_fields INTEGER NOT NULL DEFAULT 0,
    completion_percentage NUMERIC(5,2) DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed', 'overdue')),
    due_date TIMESTAMPTZ,
    reminder_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Response rate metrics (aggregated daily)
CREATE TABLE IF NOT EXISTS analytics.response_rate_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    form_type TEXT NOT NULL,
    total_sent INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_started INTEGER DEFAULT 0,
    total_completed INTEGER DEFAULT 0,
    response_rate NUMERIC(5,2) DEFAULT 0,
    open_rate NUMERIC(5,2) DEFAULT 0,
    completion_rate NUMERIC(5,2) DEFAULT 0,
    avg_response_time_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, client_id, metric_date, form_type)
);

-- Alert thresholds for low response rates
CREATE TABLE IF NOT EXISTS analytics.alert_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('response_rate', 'vendor_delay', 'guest_rsvp')),
    threshold_value NUMERIC NOT NULL,
    comparison_operator TEXT CHECK (comparison_operator IN ('<', '>', '<=', '>=', '=')),
    notification_channels JSONB DEFAULT '["email", "in_app"]',
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts history
CREATE TABLE IF NOT EXISTS analytics.alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_threshold_id UUID REFERENCES analytics.alert_thresholds(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    actual_value NUMERIC NOT NULL,
    threshold_value NUMERIC NOT NULL,
    message TEXT,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_form_responses_org_client ON analytics.form_responses(organization_id, client_id);
CREATE INDEX idx_form_responses_submitted_at ON analytics.form_responses(submitted_at);
CREATE INDEX idx_form_responses_form_type ON analytics.form_responses(form_type);
CREATE INDEX idx_guest_demographics_org_client ON analytics.guest_demographics(organization_id, client_id);
CREATE INDEX idx_guest_demographics_rsvp_status ON analytics.guest_demographics(rsvp_status);
CREATE INDEX idx_vendor_completion_org ON analytics.vendor_completion(organization_id);
CREATE INDEX idx_vendor_completion_status ON analytics.vendor_completion(status);
CREATE INDEX idx_response_rate_metrics_date ON analytics.response_rate_metrics(metric_date);
CREATE INDEX idx_response_rate_metrics_org_client ON analytics.response_rate_metrics(organization_id, client_id);
CREATE INDEX idx_alert_history_created_at ON analytics.alert_history(created_at);

-- Aggregation functions
CREATE OR REPLACE FUNCTION analytics.calculate_response_rate(
    p_organization_id UUID,
    p_client_id UUID DEFAULT NULL,
    p_form_type TEXT DEFAULT NULL,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    form_type TEXT,
    total_sent BIGINT,
    total_completed BIGINT,
    response_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fr.form_type,
        COUNT(DISTINCT fr.respondent_id) AS total_sent,
        COUNT(DISTINCT CASE WHEN fr.submitted_at IS NOT NULL THEN fr.respondent_id END) AS total_completed,
        ROUND(
            CASE 
                WHEN COUNT(DISTINCT fr.respondent_id) > 0 
                THEN (COUNT(DISTINCT CASE WHEN fr.submitted_at IS NOT NULL THEN fr.respondent_id END)::NUMERIC / 
                      COUNT(DISTINCT fr.respondent_id)::NUMERIC) * 100
                ELSE 0
            END, 2
        ) AS response_rate
    FROM analytics.form_responses fr
    WHERE fr.organization_id = p_organization_id
        AND (p_client_id IS NULL OR fr.client_id = p_client_id)
        AND (p_form_type IS NULL OR fr.form_type = p_form_type)
        AND fr.created_at::DATE BETWEEN p_start_date AND p_end_date
    GROUP BY fr.form_type;
END;
$$ LANGUAGE plpgsql;

-- Guest demographics aggregation
CREATE OR REPLACE FUNCTION analytics.aggregate_guest_demographics(
    p_organization_id UUID,
    p_client_id UUID DEFAULT NULL
)
RETURNS TABLE (
    age_group TEXT,
    count BIGINT,
    dietary_preferences JSONB,
    avg_travel_distance NUMERIC,
    accommodation_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gd.age_group,
        COUNT(*) AS count,
        jsonb_object_agg(COALESCE(gd.dietary_preference, 'none'), COUNT(*)) AS dietary_preferences,
        ROUND(AVG(gd.travel_distance_km), 2) AS avg_travel_distance,
        ROUND((COUNT(CASE WHEN gd.accommodation_needed THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2) AS accommodation_percentage
    FROM analytics.guest_demographics gd
    WHERE gd.organization_id = p_organization_id
        AND (p_client_id IS NULL OR gd.client_id = p_client_id)
    GROUP BY gd.age_group;
END;
$$ LANGUAGE plpgsql;

-- Vendor completion status aggregation
CREATE OR REPLACE FUNCTION analytics.vendor_completion_status(
    p_organization_id UUID
)
RETURNS TABLE (
    vendor_id UUID,
    vendor_name TEXT,
    total_forms BIGINT,
    completed_forms BIGINT,
    in_progress_forms BIGINT,
    overdue_forms BIGINT,
    avg_completion_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id AS vendor_id,
        v.business_name AS vendor_name,
        COUNT(vc.id) AS total_forms,
        COUNT(CASE WHEN vc.status = 'completed' THEN 1 END) AS completed_forms,
        COUNT(CASE WHEN vc.status = 'in_progress' THEN 1 END) AS in_progress_forms,
        COUNT(CASE WHEN vc.status = 'overdue' THEN 1 END) AS overdue_forms,
        ROUND(AVG(vc.completion_percentage), 2) AS avg_completion_percentage
    FROM public.vendors v
    LEFT JOIN analytics.vendor_completion vc ON v.id = vc.vendor_id
    WHERE v.organization_id = p_organization_id
    GROUP BY v.id, v.business_name;
END;
$$ LANGUAGE plpgsql;

-- Real-time alert check function
CREATE OR REPLACE FUNCTION analytics.check_alert_thresholds()
RETURNS TRIGGER AS $$
DECLARE
    v_threshold RECORD;
    v_actual_value NUMERIC;
    v_should_alert BOOLEAN;
BEGIN
    -- Check all active thresholds
    FOR v_threshold IN 
        SELECT * FROM analytics.alert_thresholds 
        WHERE organization_id = NEW.organization_id 
        AND is_active = TRUE
    LOOP
        v_should_alert := FALSE;
        
        -- Check response rate alerts
        IF v_threshold.alert_type = 'response_rate' THEN
            SELECT response_rate INTO v_actual_value
            FROM analytics.response_rate_metrics
            WHERE organization_id = NEW.organization_id
            AND metric_date = CURRENT_DATE
            ORDER BY created_at DESC
            LIMIT 1;
            
            v_should_alert := CASE v_threshold.comparison_operator
                WHEN '<' THEN v_actual_value < v_threshold.threshold_value
                WHEN '>' THEN v_actual_value > v_threshold.threshold_value
                WHEN '<=' THEN v_actual_value <= v_threshold.threshold_value
                WHEN '>=' THEN v_actual_value >= v_threshold.threshold_value
                WHEN '=' THEN v_actual_value = v_threshold.threshold_value
                ELSE FALSE
            END;
        END IF;
        
        -- Create alert if threshold exceeded
        IF v_should_alert THEN
            INSERT INTO analytics.alert_history (
                alert_threshold_id,
                organization_id,
                alert_type,
                actual_value,
                threshold_value,
                message,
                severity
            ) VALUES (
                v_threshold.id,
                NEW.organization_id,
                v_threshold.alert_type,
                v_actual_value,
                v_threshold.threshold_value,
                'Alert: ' || v_threshold.alert_type || ' threshold exceeded',
                CASE 
                    WHEN v_actual_value < v_threshold.threshold_value * 0.5 THEN 'critical'
                    WHEN v_actual_value < v_threshold.threshold_value * 0.7 THEN 'high'
                    WHEN v_actual_value < v_threshold.threshold_value * 0.9 THEN 'medium'
                    ELSE 'low'
                END
            );
            
            -- Update last triggered timestamp
            UPDATE analytics.alert_thresholds
            SET last_triggered_at = NOW()
            WHERE id = v_threshold.id;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for alert checking
CREATE TRIGGER check_alerts_on_metrics_update
    AFTER INSERT OR UPDATE ON analytics.response_rate_metrics
    FOR EACH ROW
    EXECUTE FUNCTION analytics.check_alert_thresholds();

-- Row Level Security
ALTER TABLE analytics.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.guest_demographics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.vendor_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.response_rate_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.alert_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.alert_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their organization's form responses" ON analytics.form_responses
    FOR SELECT USING (
        organization_id IN (
            SELECT op.organization_id FROM public.organization_permissions op
            WHERE op.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their organization's guest demographics" ON analytics.guest_demographics
    FOR SELECT USING (
        organization_id IN (
            SELECT op.organization_id FROM public.organization_permissions op
            WHERE op.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their organization's vendor completion" ON analytics.vendor_completion
    FOR SELECT USING (
        organization_id IN (
            SELECT op.organization_id FROM public.organization_permissions op
            WHERE op.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their organization's response rate metrics" ON analytics.response_rate_metrics
    FOR SELECT USING (
        organization_id IN (
            SELECT op.organization_id FROM public.organization_permissions op
            WHERE op.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their organization's alert thresholds" ON analytics.alert_thresholds
    FOR ALL USING (
        organization_id IN (
            SELECT op.organization_id FROM public.organization_permissions op
            WHERE op.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their organization's alert history" ON analytics.alert_history
    FOR SELECT USING (
        organization_id IN (
            SELECT op.organization_id FROM public.organization_permissions op
            WHERE op.user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT USAGE ON SCHEMA analytics TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA analytics TO authenticated;