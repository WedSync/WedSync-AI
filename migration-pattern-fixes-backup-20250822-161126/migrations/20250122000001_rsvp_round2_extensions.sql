-- RSVP Round 2 Extensions
-- Feature: WS-057 Round 2 - Advanced Features & Analytics
-- Building on Round 1 foundation with escalation, analytics, and waitlist

-- Enable additional extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- RSVP Reminder Escalation Tracking
-- Extends the existing reminder system with escalation logic
CREATE TABLE IF NOT EXISTS rsvp_reminder_escalation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES rsvp_events(id) ON DELETE CASCADE,
    invitation_id UUID NOT NULL REFERENCES rsvp_invitations(id) ON DELETE CASCADE,
    escalation_level INTEGER DEFAULT 1, -- 1=email, 2=sms, 3=both, 4=personal
    last_escalation_at TIMESTAMPTZ,
    total_reminders_sent INTEGER DEFAULT 0,
    response_deadline TIMESTAMPTZ,
    is_escalation_active BOOLEAN DEFAULT true,
    escalation_settings JSONB DEFAULT '{"max_escalations": 4, "escalation_delay_hours": 48}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVP Analytics Predictions
-- Advanced analytics with ML-style pattern recognition
CREATE TABLE IF NOT EXISTS rsvp_analytics_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES rsvp_events(id) ON DELETE CASCADE,
    prediction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    predicted_final_attendance INTEGER,
    prediction_confidence DECIMAL(5,2), -- 0-100 confidence percentage
    factors_json JSONB, -- Factors affecting prediction
    historical_patterns JSONB, -- Similar event patterns
    response_velocity DECIMAL(8,4), -- Responses per day
    time_to_event_days INTEGER,
    weather_factor DECIMAL(3,2), -- If available
    holiday_factor DECIMAL(3,2), -- Event on/near holiday
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, prediction_date)
);

-- RSVP Plus-One Relationships
-- Track plus-ones and household relationships
CREATE TABLE IF NOT EXISTS rsvp_plus_one_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    primary_invitation_id UUID NOT NULL REFERENCES rsvp_invitations(id) ON DELETE CASCADE,
    plus_one_name TEXT NOT NULL,
    plus_one_email TEXT,
    plus_one_phone VARCHAR(20),
    relationship_type VARCHAR(50) DEFAULT 'partner', -- partner, spouse, date, friend, family
    dietary_restrictions TEXT[],
    meal_preference VARCHAR(100),
    age_group VARCHAR(20) CHECK (age_group IN ('adult', 'teen', 'child', 'infant')),
    special_needs TEXT,
    is_confirmed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVP Household Management
-- Group related invitations for family tracking
CREATE TABLE IF NOT EXISTS rsvp_households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES rsvp_events(id) ON DELETE CASCADE,
    household_name TEXT NOT NULL,
    primary_contact_invitation_id UUID REFERENCES rsvp_invitations(id),
    total_expected_guests INTEGER DEFAULT 1,
    household_notes TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state VARCHAR(10),
    zip_code VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link invitations to households
CREATE TABLE IF NOT EXISTS rsvp_invitation_households (
    invitation_id UUID REFERENCES rsvp_invitations(id) ON DELETE CASCADE,
    household_id UUID REFERENCES rsvp_households(id) ON DELETE CASCADE,
    role_in_household VARCHAR(50) DEFAULT 'member', -- primary, member, child, guest
    PRIMARY KEY (invitation_id, household_id)
);

-- Enhanced Analytics Materialized View
-- High-performance analytics for dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS rsvp_analytics_summary AS
SELECT 
    e.id as event_id,
    e.event_name,
    e.event_date,
    e.max_guests,
    e.vendor_id,
    COUNT(DISTINCT i.id) as total_invited,
    COUNT(DISTINCT r.id) as total_responded,
    COUNT(DISTINCT CASE WHEN r.response_status = 'attending' THEN r.id END) as total_attending,
    COUNT(DISTINCT CASE WHEN r.response_status = 'not_attending' THEN r.id END) as total_not_attending,
    COUNT(DISTINCT CASE WHEN r.response_status = 'maybe' THEN r.id END) as total_maybe,
    COALESCE(SUM(CASE WHEN r.response_status = 'attending' THEN r.party_size ELSE 0 END), 0) as total_guests_confirmed,
    ROUND(
        CASE 
            WHEN COUNT(DISTINCT i.id) > 0 
            THEN (COUNT(DISTINCT r.id)::DECIMAL / COUNT(DISTINCT i.id)::DECIMAL * 100)
            ELSE 0 
        END, 2
    ) as response_rate_percentage,
    ROUND(
        CASE 
            WHEN COUNT(DISTINCT CASE WHEN r.response_status = 'attending' THEN r.id END) > 0
            THEN AVG(CASE WHEN r.response_status = 'attending' THEN r.party_size END)
            ELSE 0
        END, 2
    ) as avg_party_size,
    COUNT(DISTINCT w.id) as waitlist_count,
    COUNT(DISTINCT plus.id) as plus_ones_count,
    CURRENT_TIMESTAMP as last_updated
FROM rsvp_events e
LEFT JOIN rsvp_invitations i ON e.id = i.event_id
LEFT JOIN rsvp_responses r ON i.id = r.invitation_id
LEFT JOIN rsvp_waitlist w ON e.id = w.event_id AND w.status = 'waiting'
LEFT JOIN rsvp_plus_one_relationships plus ON i.id = plus.primary_invitation_id
GROUP BY e.id, e.event_name, e.event_date, e.max_guests, e.vendor_id;

-- RSVP Vendor Export Templates
-- Pre-configured export formats for vendors
CREATE TABLE IF NOT EXISTS rsvp_vendor_export_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_name TEXT NOT NULL,
    export_format VARCHAR(20) NOT NULL CHECK (export_format IN ('csv', 'excel', 'json', 'pdf')),
    column_mapping JSONB NOT NULL, -- Maps internal fields to vendor requirements
    filter_settings JSONB, -- What data to include/exclude
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVP Export History
-- Track generated exports for audit
CREATE TABLE IF NOT EXISTS rsvp_export_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES rsvp_events(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    export_type VARCHAR(50) NOT NULL,
    file_format VARCHAR(20) NOT NULL,
    file_path TEXT,
    file_size_bytes INTEGER,
    records_exported INTEGER,
    export_settings JSONB,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Performance Indexes for Round 2
CREATE INDEX IF NOT EXISTS idx_rsvp_escalation_event_id ON rsvp_reminder_escalation(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_escalation_deadline ON rsvp_reminder_escalation(response_deadline) WHERE is_escalation_active = true;
CREATE INDEX IF NOT EXISTS idx_rsvp_predictions_event_date ON rsvp_analytics_predictions(event_id, prediction_date);
CREATE INDEX IF NOT EXISTS idx_rsvp_plus_ones_invitation ON rsvp_plus_one_relationships(primary_invitation_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_households_event ON rsvp_households(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_export_history_vendor ON rsvp_export_history(vendor_id, generated_at);

-- Refresh the materialized view automatically
CREATE UNIQUE INDEX IF NOT EXISTS idx_rsvp_analytics_summary_event ON rsvp_analytics_summary(event_id);

-- RLS Policies for Round 2 Tables
ALTER TABLE rsvp_reminder_escalation ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_analytics_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_plus_one_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_households ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_invitation_households ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_vendor_export_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_export_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Vendors can manage escalation tracking" ON rsvp_reminder_escalation
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rsvp_events 
            WHERE rsvp_events.id = rsvp_reminder_escalation.event_id 
            AND rsvp_events.vendor_id = auth.uid()
        )
    );

CREATE POLICY "Vendors can view analytics predictions" ON rsvp_analytics_predictions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rsvp_events 
            WHERE rsvp_events.id = rsvp_analytics_predictions.event_id 
            AND rsvp_events.vendor_id = auth.uid()
        )
    );

CREATE POLICY "Vendors can manage plus-one relationships" ON rsvp_plus_one_relationships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rsvp_invitations i
            JOIN rsvp_events e ON i.event_id = e.id
            WHERE i.id = rsvp_plus_one_relationships.primary_invitation_id 
            AND e.vendor_id = auth.uid()
        )
    );

CREATE POLICY "Vendors can manage households" ON rsvp_households
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rsvp_events 
            WHERE rsvp_events.id = rsvp_households.event_id 
            AND rsvp_events.vendor_id = auth.uid()
        )
    );

CREATE POLICY "Vendors can manage export templates" ON rsvp_vendor_export_templates
    FOR ALL USING (auth.uid() = vendor_id);

CREATE POLICY "Vendors can view export history" ON rsvp_export_history
    FOR ALL USING (auth.uid() = vendor_id);

-- Advanced Functions for Round 2

-- Function to calculate attendance prediction with confidence
CREATE OR REPLACE FUNCTION calculate_attendance_prediction(p_event_id UUID)
RETURNS TABLE(
    predicted_attendance INTEGER,
    confidence_percentage DECIMAL(5,2),
    factors JSONB
) AS $$
DECLARE
    v_event RECORD;
    v_total_invited INTEGER;
    v_total_responded INTEGER;
    v_total_attending INTEGER;
    v_days_to_event INTEGER;
    v_response_velocity DECIMAL;
    v_prediction INTEGER;
    v_confidence DECIMAL;
    v_factors JSONB;
BEGIN
    -- Get event details
    SELECT * INTO v_event FROM rsvp_events WHERE id = p_event_id;
    
    -- Get current statistics
    SELECT 
        COUNT(DISTINCT i.id),
        COUNT(DISTINCT r.id),
        COUNT(DISTINCT CASE WHEN r.response_status = 'attending' THEN r.id END)
    INTO v_total_invited, v_total_responded, v_total_attending
    FROM rsvp_invitations i
    LEFT JOIN rsvp_responses r ON i.id = r.invitation_id
    WHERE i.event_id = p_event_id;
    
    -- Calculate days to event
    v_days_to_event := EXTRACT(days FROM (v_event.event_date - CURRENT_DATE));
    
    -- Calculate response velocity (responses per day)
    v_response_velocity := CASE 
        WHEN v_total_responded > 0 AND EXTRACT(days FROM (CURRENT_DATE - v_event.created_at::DATE)) > 0
        THEN v_total_responded::DECIMAL / EXTRACT(days FROM (CURRENT_DATE - v_event.created_at::DATE))
        ELSE 0
    END;
    
    -- Prediction algorithm
    IF v_days_to_event > 30 THEN
        -- Early prediction based on typical patterns
        v_prediction := ROUND(v_total_invited * 0.72); -- 72% typical attendance
        v_confidence := 45.0;
    ELSIF v_days_to_event > 14 THEN
        -- Mid-range prediction with some responses
        v_prediction := v_total_attending + ROUND((v_total_invited - v_total_responded) * 0.65);
        v_confidence := 65.0 + (v_total_responded::DECIMAL / v_total_invited * 20);
    ELSIF v_days_to_event > 7 THEN
        -- Late prediction with most responses
        v_prediction := v_total_attending + ROUND((v_total_invited - v_total_responded) * 0.45);
        v_confidence := 75.0 + (v_total_responded::DECIMAL / v_total_invited * 20);
    ELSE
        -- Final week - high confidence
        v_prediction := v_total_attending + ROUND((v_total_invited - v_total_responded) * 0.25);
        v_confidence := 85.0 + (v_total_responded::DECIMAL / v_total_invited * 15);
    END IF;
    
    -- Build factors JSON
    v_factors := jsonb_build_object(
        'total_invited', v_total_invited,
        'total_responded', v_total_responded,
        'total_attending', v_total_attending,
        'response_rate', ROUND(v_total_responded::DECIMAL / v_total_invited * 100, 2),
        'days_to_event', v_days_to_event,
        'response_velocity', v_response_velocity,
        'prediction_method', CASE 
            WHEN v_days_to_event > 30 THEN 'early_statistical'
            WHEN v_days_to_event > 14 THEN 'mid_range_hybrid'
            WHEN v_days_to_event > 7 THEN 'late_response_based'
            ELSE 'final_week_conservative'
        END
    );
    
    RETURN QUERY SELECT v_prediction, v_confidence, v_factors;
END;
$$ LANGUAGE plpgsql;

-- Function to process reminder escalation
CREATE OR REPLACE FUNCTION process_reminder_escalation(p_event_id UUID)
RETURNS TABLE(
    escalated_count INTEGER,
    notifications_sent INTEGER
) AS $$
DECLARE
    v_escalation RECORD;
    v_escalated_count INTEGER := 0;
    v_notifications_sent INTEGER := 0;
BEGIN
    -- Find escalations that need processing
    FOR v_escalation IN
        SELECT 
            re.*,
            i.guest_name,
            i.guest_email,
            i.guest_phone,
            e.event_name,
            e.event_date
        FROM rsvp_reminder_escalation re
        JOIN rsvp_invitations i ON re.invitation_id = i.id
        JOIN rsvp_events e ON re.event_id = e.id
        LEFT JOIN rsvp_responses r ON i.id = r.invitation_id
        WHERE re.event_id = p_event_id
        AND re.is_escalation_active = true
        AND r.id IS NULL -- No response yet
        AND (
            re.last_escalation_at IS NULL OR 
            re.last_escalation_at < NOW() - INTERVAL '48 hours'
        )
        AND re.total_reminders_sent < (re.escalation_settings->>'max_escalations')::INTEGER
    LOOP
        -- Update escalation level and tracking
        UPDATE rsvp_reminder_escalation 
        SET 
            escalation_level = LEAST(escalation_level + 1, 4),
            last_escalation_at = NOW(),
            total_reminders_sent = total_reminders_sent + 1,
            updated_at = NOW()
        WHERE id = v_escalation.id;
        
        -- Create appropriate reminder based on escalation level
        INSERT INTO rsvp_reminders (
            event_id,
            invitation_id,
            reminder_type,
            scheduled_for,
            delivery_method,
            status
        ) VALUES (
            v_escalation.event_id,
            v_escalation.invitation_id,
            CASE 
                WHEN v_escalation.escalation_level = 1 THEN 'followup'
                WHEN v_escalation.escalation_level = 2 THEN 'followup'
                WHEN v_escalation.escalation_level = 3 THEN 'final'
                ELSE 'custom'
            END,
            NOW(),
            CASE 
                WHEN v_escalation.escalation_level = 1 THEN 'email'
                WHEN v_escalation.escalation_level = 2 THEN 'sms'
                ELSE 'both'
            END,
            'pending'
        );
        
        v_escalated_count := v_escalated_count + 1;
        v_notifications_sent := v_notifications_sent + 1;
    END LOOP;
    
    RETURN QUERY SELECT v_escalated_count, v_notifications_sent;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh analytics summary
CREATE OR REPLACE FUNCTION refresh_rsvp_analytics_summary()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY rsvp_analytics_summary;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION trigger_refresh_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Refresh in background to avoid blocking
    PERFORM pg_notify('refresh_analytics', NEW.event_id::TEXT);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for response changes
CREATE TRIGGER refresh_analytics_on_response_change
AFTER INSERT OR UPDATE OR DELETE ON rsvp_responses
FOR EACH ROW EXECUTE FUNCTION trigger_refresh_analytics();

-- Updated timestamp triggers for Round 2 tables
CREATE TRIGGER update_escalation_updated_at BEFORE UPDATE ON rsvp_reminder_escalation
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plus_one_updated_at BEFORE UPDATE ON rsvp_plus_one_relationships
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_export_templates_updated_at BEFORE UPDATE ON rsvp_vendor_export_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();