-- WARNING: This migration references tables that may not exist: rsvp_events, rsvp_invitations, rsvp_responses, rsvp_custom_questions
-- Ensure these tables are created first

-- RSVP Management System
-- Feature: WS-057 - Comprehensive RSVP management with automation and analytics

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- RSVP Events Table (weddings, parties, etc.)
CREATE TABLE IF NOT EXISTS rsvp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    event_name TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    venue_name TEXT,
    venue_address TEXT,
    max_guests INTEGER,
    rsvp_deadline DATE,
    allow_plus_ones BOOLEAN DEFAULT true,
    require_meal_selection BOOLEAN DEFAULT false,
    require_song_requests BOOLEAN DEFAULT false,
    custom_message TEXT,
    thank_you_message TEXT,
    reminder_settings JSONB DEFAULT '{"enabled": true, "days_before": [30, 14, 7, 3, 1]}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVP Custom Questions
CREATE TABLE IF NOT EXISTS rsvp_custom_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES rsvp_events(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('text', 'multiple_choice', 'checkbox', 'number', 'date')),
    required BOOLEAN DEFAULT false,
    options JSONB, -- For multiple choice/checkbox options
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVP Invitations
CREATE TABLE IF NOT EXISTS rsvp_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES rsvp_events(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    guest_email TEXT,
    guest_phone VARCHAR(20),
    invitation_code VARCHAR(10) UNIQUE DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8)),
    max_party_size INTEGER DEFAULT 1,
    is_vip BOOLEAN DEFAULT false,
    table_assignment VARCHAR(50),
    invitation_sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVP Responses
CREATE TABLE IF NOT EXISTS rsvp_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID NOT NULL REFERENCES rsvp_invitations(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES rsvp_events(id) ON DELETE CASCADE,
    response_status VARCHAR(20) NOT NULL CHECK (response_status IN ('attending', 'not_attending', 'maybe', 'waitlist')),
    party_size INTEGER DEFAULT 1,
    responded_at TIMESTAMPTZ DEFAULT NOW(),
    response_source VARCHAR(50) DEFAULT 'web', -- web, email, sms, phone
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVP Guest Details (for each person in party)
CREATE TABLE IF NOT EXISTS rsvp_guest_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES rsvp_responses(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    meal_preference VARCHAR(100),
    dietary_restrictions TEXT[],
    allergies TEXT[],
    song_request TEXT,
    special_needs TEXT,
    age_group VARCHAR(20) CHECK (age_group IN ('adult', 'teen', 'child', 'infant')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVP Custom Question Responses
CREATE TABLE IF NOT EXISTS rsvp_custom_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES rsvp_responses(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES rsvp_custom_questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    answer_json JSONB, -- For complex answers
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVP Reminders
CREATE TABLE IF NOT EXISTS rsvp_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES rsvp_events(id) ON DELETE CASCADE,
    invitation_id UUID REFERENCES rsvp_invitations(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('initial', 'followup', 'final', 'custom')),
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    delivery_method VARCHAR(20) CHECK (delivery_method IN ('email', 'sms', 'both')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVP Waitlist
CREATE TABLE IF NOT EXISTS rsvp_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES rsvp_events(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    guest_email TEXT,
    guest_phone VARCHAR(20),
    party_size INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 999,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    invited_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'invited', 'declined', 'expired'))
);

-- RSVP Analytics
CREATE TABLE IF NOT EXISTS rsvp_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES rsvp_events(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_invited INTEGER DEFAULT 0,
    total_responded INTEGER DEFAULT 0,
    total_attending INTEGER DEFAULT 0,
    total_not_attending INTEGER DEFAULT 0,
    total_maybe INTEGER DEFAULT 0,
    total_waitlist INTEGER DEFAULT 0,
    total_guests_confirmed INTEGER DEFAULT 0,
    response_rate DECIMAL(5,2),
    avg_party_size DECIMAL(4,2),
    meal_preferences JSONB,
    dietary_stats JSONB,
    age_distribution JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, date)
);

-- RSVP Change History
CREATE TABLE IF NOT EXISTS rsvp_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES rsvp_responses(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES user_profiles(id),
    change_type VARCHAR(50) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    change_reason TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal Options
CREATE TABLE IF NOT EXISTS rsvp_meal_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES rsvp_events(id) ON DELETE CASCADE,
    meal_name TEXT NOT NULL,
    meal_description TEXT,
    meal_type VARCHAR(50) CHECK (meal_type IN ('appetizer', 'main', 'dessert', 'kids', 'vegetarian', 'vegan')),
    max_quantity INTEGER,
    price DECIMAL(10,2),
    allergen_info TEXT[],
    display_order INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_rsvp_events_vendor_id ON rsvp_events(vendor_id);
CREATE INDEX idx_rsvp_events_event_date ON rsvp_events(event_date);
CREATE INDEX idx_rsvp_invitations_event_id ON rsvp_invitations(event_id);
CREATE INDEX idx_rsvp_invitations_code ON rsvp_invitations(invitation_code);
CREATE INDEX idx_rsvp_responses_invitation_id ON rsvp_responses(invitation_id);
CREATE INDEX idx_rsvp_responses_event_id ON rsvp_responses(event_id);
CREATE INDEX idx_rsvp_responses_status ON rsvp_responses(response_status);
CREATE INDEX idx_rsvp_reminders_scheduled ON rsvp_reminders(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_rsvp_waitlist_event_id ON rsvp_waitlist(event_id) WHERE status = 'waiting';
CREATE INDEX idx_rsvp_analytics_event_date ON rsvp_analytics(event_id, date);

-- Row Level Security
ALTER TABLE rsvp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_custom_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_guest_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_custom_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_meal_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Vendors can manage their RSVP events" ON rsvp_events
    FOR ALL USING (( SELECT auth.uid() ) = vendor_id);

CREATE POLICY "Vendors can view their invitations" ON rsvp_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rsvp_events 
            WHERE rsvp_events.id = rsvp_invitations.event_id 
            AND rsvp_events.vendor_id = ( SELECT auth.uid() )
        )
    );

CREATE POLICY "Public can submit RSVP with invitation code" ON rsvp_responses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM rsvp_invitations 
            WHERE rsvp_invitations.id = rsvp_responses.invitation_id
        )
    );

CREATE POLICY "Vendors can view responses" ON rsvp_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM rsvp_events 
            WHERE rsvp_events.id = rsvp_responses.event_id 
            AND rsvp_events.vendor_id = ( SELECT auth.uid() )
        )
    );

-- Functions for automation

-- Function to calculate and update analytics
CREATE OR REPLACE FUNCTION update_rsvp_analytics(p_event_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO rsvp_analytics (
        event_id,
        date,
        total_invited,
        total_responded,
        total_attending,
        total_not_attending,
        total_maybe,
        total_waitlist,
        total_guests_confirmed,
        response_rate,
        avg_party_size,
        meal_preferences,
        dietary_stats,
        age_distribution
    )
    SELECT 
        p_event_id,
        CURRENT_DATE,
        (SELECT COUNT(*) FROM rsvp_invitations WHERE event_id = p_event_id),
        (SELECT COUNT(*) FROM rsvp_responses WHERE event_id = p_event_id),
        (SELECT COUNT(*) FROM rsvp_responses WHERE event_id = p_event_id AND response_status = 'attending'),
        (SELECT COUNT(*) FROM rsvp_responses WHERE event_id = p_event_id AND response_status = 'not_attending'),
        (SELECT COUNT(*) FROM rsvp_responses WHERE event_id = p_event_id AND response_status = 'maybe'),
        (SELECT COUNT(*) FROM rsvp_waitlist WHERE event_id = p_event_id AND status = 'waiting'),
        (SELECT COALESCE(SUM(party_size), 0) FROM rsvp_responses WHERE event_id = p_event_id AND response_status = 'attending'),
        CASE 
            WHEN (SELECT COUNT(*) FROM rsvp_invitations WHERE event_id = p_event_id) > 0
            THEN ((SELECT COUNT(*) FROM rsvp_responses WHERE event_id = p_event_id)::DECIMAL / 
                  (SELECT COUNT(*) FROM rsvp_invitations WHERE event_id = p_event_id)::DECIMAL * 100)
            ELSE 0
        END,
        (SELECT AVG(party_size) FROM rsvp_responses WHERE event_id = p_event_id AND response_status = 'attending'),
        (SELECT jsonb_object_agg(meal_preference, count) 
         FROM (SELECT meal_preference, COUNT(*) as count 
               FROM rsvp_guest_details gd 
               JOIN rsvp_responses r ON gd.response_id = r.id 
               WHERE r.event_id = p_event_id AND meal_preference IS NOT NULL
               GROUP BY meal_preference) t),
        (SELECT jsonb_object_agg(restriction, count)
         FROM (SELECT unnest(dietary_restrictions) as restriction, COUNT(*) as count
               FROM rsvp_guest_details gd
               JOIN rsvp_responses r ON gd.response_id = r.id
               WHERE r.event_id = p_event_id
               GROUP BY restriction) t),
        (SELECT jsonb_object_agg(age_group, count)
         FROM (SELECT age_group, COUNT(*) as count
               FROM rsvp_guest_details gd
               JOIN rsvp_responses r ON gd.response_id = r.id
               WHERE r.event_id = p_event_id AND age_group IS NOT NULL
               GROUP BY age_group) t)
    ON CONFLICT (event_id, date) 
    DO UPDATE SET
        total_invited = EXCLUDED.total_invited,
        total_responded = EXCLUDED.total_responded,
        total_attending = EXCLUDED.total_attending,
        total_not_attending = EXCLUDED.total_not_attending,
        total_maybe = EXCLUDED.total_maybe,
        total_waitlist = EXCLUDED.total_waitlist,
        total_guests_confirmed = EXCLUDED.total_guests_confirmed,
        response_rate = EXCLUDED.response_rate,
        avg_party_size = EXCLUDED.avg_party_size,
        meal_preferences = EXCLUDED.meal_preferences,
        dietary_stats = EXCLUDED.dietary_stats,
        age_distribution = EXCLUDED.age_distribution;
END;
$$ LANGUAGE plpgsql;

-- Function to schedule reminders
CREATE OR REPLACE FUNCTION schedule_rsvp_reminders(p_event_id UUID, p_invitation_id UUID DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    v_event RECORD;
    v_reminder_days INTEGER[];
    v_day INTEGER;
BEGIN
    SELECT * INTO v_event FROM rsvp_events WHERE id = p_event_id;
    
    IF v_event.reminder_settings->>'enabled' = 'true' THEN
        v_reminder_days := ARRAY(SELECT jsonb_array_elements_text(v_event.reminder_settings->'days_before')::INTEGER);
        
        FOREACH v_day IN ARRAY v_reminder_days LOOP
            IF p_invitation_id IS NULL THEN
                -- Schedule for all invitations
                INSERT INTO rsvp_reminders (event_id, invitation_id, reminder_type, scheduled_for, delivery_method)
                SELECT 
                    p_event_id,
                    i.id,
                    CASE 
                        WHEN v_day >= 30 THEN 'initial'
                        WHEN v_day >= 7 THEN 'followup'
                        ELSE 'final'
                    END,
                    v_event.event_date - INTERVAL '1 day' * v_day,
                    CASE 
                        WHEN i.guest_email IS NOT NULL AND i.guest_phone IS NOT NULL THEN 'both'
                        WHEN i.guest_email IS NOT NULL THEN 'email'
                        WHEN i.guest_phone IS NOT NULL THEN 'sms'
                    END
                FROM rsvp_invitations i
                WHERE i.event_id = p_event_id
                AND NOT EXISTS (
                    SELECT 1 FROM rsvp_reminders r 
                    WHERE r.invitation_id = i.id 
                    AND r.scheduled_for = v_event.event_date - INTERVAL '1 day' * v_day
                );
            ELSE
                -- Schedule for specific invitation
                INSERT INTO rsvp_reminders (event_id, invitation_id, reminder_type, scheduled_for, delivery_method)
                SELECT 
                    p_event_id,
                    p_invitation_id,
                    CASE 
                        WHEN v_day >= 30 THEN 'initial'
                        WHEN v_day >= 7 THEN 'followup'
                        ELSE 'final'
                    END,
                    v_event.event_date - INTERVAL '1 day' * v_day,
                    CASE 
                        WHEN i.guest_email IS NOT NULL AND i.guest_phone IS NOT NULL THEN 'both'
                        WHEN i.guest_email IS NOT NULL THEN 'email'
                        WHEN i.guest_phone IS NOT NULL THEN 'sms'
                    END
                FROM rsvp_invitations i
                WHERE i.id = p_invitation_id
                AND NOT EXISTS (
                    SELECT 1 FROM rsvp_reminders r 
                    WHERE r.invitation_id = p_invitation_id 
                    AND r.scheduled_for = v_event.event_date - INTERVAL '1 day' * v_day
                );
            END IF;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update analytics on response changes
CREATE OR REPLACE FUNCTION trigger_update_rsvp_analytics()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_rsvp_analytics(COALESCE(NEW.event_id, OLD.event_id));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analytics_on_response
AFTER INSERT OR UPDATE OR DELETE ON rsvp_responses
FOR EACH ROW EXECUTE FUNCTION trigger_update_rsvp_analytics();

-- Trigger to track changes
CREATE OR REPLACE FUNCTION trigger_track_rsvp_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO rsvp_change_history (
            response_id,
            changed_by,
            change_type,
            old_value,
            new_value
        ) VALUES (
            NEW.id,
            auth.uid(),
            'response_update',
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_rsvp_changes
AFTER UPDATE ON rsvp_responses
FOR EACH ROW EXECUTE FUNCTION trigger_track_rsvp_changes();

-- Function to process waitlist when space becomes available
CREATE OR REPLACE FUNCTION process_rsvp_waitlist(p_event_id UUID)
RETURNS VOID AS $$
DECLARE
    v_event RECORD;
    v_current_guests INTEGER;
    v_available_space INTEGER;
    v_waitlist RECORD;
BEGIN
    SELECT * INTO v_event FROM rsvp_events WHERE id = p_event_id;
    
    IF v_event.max_guests IS NOT NULL THEN
        SELECT COALESCE(SUM(party_size), 0) INTO v_current_guests
        FROM rsvp_responses 
        WHERE event_id = p_event_id AND response_status = 'attending';
        
        v_available_space := v_event.max_guests - v_current_guests;
        
        IF v_available_space > 0 THEN
            FOR v_waitlist IN 
                SELECT * FROM rsvp_waitlist 
                WHERE event_id = p_event_id 
                AND status = 'waiting'
                AND party_size <= v_available_space
                ORDER BY priority, added_at
                LIMIT 1
            LOOP
                -- Create invitation for waitlist guest
                INSERT INTO rsvp_invitations (
                    event_id,
                    guest_name,
                    guest_email,
                    guest_phone,
                    max_party_size
                ) VALUES (
                    p_event_id,
                    v_waitlist.guest_name,
                    v_waitlist.guest_email,
                    v_waitlist.guest_phone,
                    v_waitlist.party_size
                );
                
                -- Update waitlist status
                UPDATE rsvp_waitlist 
                SET status = 'invited', invited_at = NOW()
                WHERE id = v_waitlist.id;
                
                v_available_space := v_available_space - v_waitlist.party_size;
            END LOOP;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Updated timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rsvp_events_updated_at BEFORE UPDATE ON rsvp_events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rsvp_invitations_updated_at BEFORE UPDATE ON rsvp_invitations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rsvp_responses_updated_at BEFORE UPDATE ON rsvp_responses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();