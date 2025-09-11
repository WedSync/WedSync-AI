-- Lead Status Tracking System Enhancement
-- Extends existing client management with comprehensive lead tracking

-- Enhanced Lead Status Types
DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM (
        'new',
        'contacted',
        'qualified',
        'quoted',
        'proposal_sent',
        'negotiating',
        'won',
        'lost',
        'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lead_priority AS ENUM (
        'low',
        'medium', 
        'high',
        'urgent'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Lead Status History Table for tracking progression
CREATE TABLE IF NOT EXISTS lead_status_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Status Change Details
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Change Metadata
    changed_by UUID REFERENCES user_profiles(id),
    change_reason VARCHAR(255),
    notes TEXT,
    
    -- Time tracking
    time_in_previous_status_hours INTEGER,
    
    -- Automation flags
    is_automated_change BOOLEAN DEFAULT false,
    automation_trigger VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead Scoring Table
CREATE TABLE IF NOT EXISTS lead_scores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Core Scoring Components
    demographic_score INTEGER DEFAULT 0, -- 0-25 points
    behavioral_score INTEGER DEFAULT 0,  -- 0-25 points
    engagement_score INTEGER DEFAULT 0,  -- 0-25 points
    fit_score INTEGER DEFAULT 0,         -- 0-25 points
    
    -- Calculated Total Score
    total_score INTEGER DEFAULT 0, -- 0-100
    score_grade VARCHAR(2) DEFAULT 'F', -- A+, A, B, C, D, F
    
    -- Scoring Factors Detail
    scoring_factors JSONB DEFAULT '{}'::jsonb,
    
    -- Score History
    previous_score INTEGER,
    score_trend VARCHAR(10), -- 'up', 'down', 'stable'
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Quality Indicators
    is_qualified_lead BOOLEAN DEFAULT false,
    qualification_date TIMESTAMP WITH TIME ZONE,
    disqualification_reason VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead Activity Scoring Rules
CREATE TABLE IF NOT EXISTS lead_scoring_rules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Rule Definition
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- activity, demographic, behavioral, time_based
    
    -- Trigger Conditions
    trigger_event VARCHAR(100), -- form_completed, email_opened, website_visited
    trigger_conditions JSONB DEFAULT '{}'::jsonb,
    
    -- Scoring
    score_change INTEGER NOT NULL, -- can be negative
    max_score_per_period INTEGER,
    reset_period_days INTEGER,
    
    -- Rule Status
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    
    -- Metadata
    description TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead Lifecycle Stages
CREATE TABLE IF NOT EXISTS lead_lifecycle_stages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Stage Definition
    stage_name VARCHAR(100) NOT NULL,
    stage_order INTEGER NOT NULL,
    stage_color VARCHAR(7) DEFAULT '#6B7280',
    
    -- Stage Behavior
    is_active BOOLEAN DEFAULT true,
    auto_progress_conditions JSONB DEFAULT '{}'::jsonb,
    required_actions TEXT[],
    
    -- Time Tracking
    target_duration_days INTEGER,
    max_duration_days INTEGER,
    
    -- Notifications
    reminder_days INTEGER[],
    escalation_days INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, stage_order)
);

-- Lead Source Attribution
CREATE TABLE IF NOT EXISTS lead_sources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Source Details
    source_name VARCHAR(100) NOT NULL,
    source_category VARCHAR(50), -- website, social, referral, advertising, event
    source_medium VARCHAR(50),   -- organic, paid, email, social
    source_campaign VARCHAR(100),
    
    -- Tracking
    utm_source VARCHAR(100),
    utm_medium VARCHAR(50),
    utm_campaign VARCHAR(100),
    utm_term VARCHAR(100),
    utm_content VARCHAR(100),
    
    -- Performance Metrics
    total_leads INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    average_deal_value DECIMAL(10,2),
    
    -- Cost Tracking
    cost_per_lead DECIMAL(10,2),
    monthly_spend DECIMAL(10,2),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, source_name)
);

-- Enhanced Clients Table Modifications
-- Add new columns to existing clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lead_grade VARCHAR(2) DEFAULT 'F',
ADD COLUMN IF NOT EXISTS lead_priority lead_priority DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS lifecycle_stage VARCHAR(100),
ADD COLUMN IF NOT EXISTS qualification_status VARCHAR(50) DEFAULT 'unqualified',
ADD COLUMN IF NOT EXISTS qualification_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES user_profiles(id),
ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS expected_close_date DATE,
ADD COLUMN IF NOT EXISTS probability_to_close INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_value DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS actual_value DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS days_in_pipeline INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS touch_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_touch_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lead_source_id UUID REFERENCES lead_sources(id);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_lead_status_history_client ON lead_status_history(client_id);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_organization ON lead_status_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_date ON lead_status_history(status_changed_at);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_status ON lead_status_history(new_status);

CREATE INDEX IF NOT EXISTS idx_lead_scores_client ON lead_scores(client_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_organization ON lead_scores(organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_total_score ON lead_scores(total_score);
CREATE INDEX IF NOT EXISTS idx_lead_scores_grade ON lead_scores(score_grade);
CREATE INDEX IF NOT EXISTS idx_lead_scores_qualified ON lead_scores(is_qualified_lead);

CREATE INDEX IF NOT EXISTS idx_clients_lead_score ON clients(lead_score);
CREATE INDEX IF NOT EXISTS idx_clients_lead_grade ON clients(lead_grade);
CREATE INDEX IF NOT EXISTS idx_clients_priority ON clients(lead_priority);
CREATE INDEX IF NOT EXISTS idx_clients_lifecycle_stage ON clients(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_to ON clients(assigned_to);
CREATE INDEX IF NOT EXISTS idx_clients_follow_up ON clients(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_clients_source ON clients(lead_source_id);

-- Row Level Security Policies
ALTER TABLE lead_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_lifecycle_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;

-- Lead Status History Policies
CREATE POLICY "Users can view their organization's lead status history"
    ON lead_status_history FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert lead status history for their organization"
    ON lead_status_history FOR INSERT
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    ));

-- Lead Scores Policies
CREATE POLICY "Users can view their organization's lead scores"
    ON lead_scores FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can manage lead scores for their organization"
    ON lead_scores FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    ));

-- Lead Scoring Rules Policies
CREATE POLICY "Users can manage scoring rules for their organization"
    ON lead_scoring_rules FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    ));

-- Lead Lifecycle Stages Policies
CREATE POLICY "Users can manage lifecycle stages for their organization"
    ON lead_lifecycle_stages FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    ));

-- Lead Sources Policies
CREATE POLICY "Users can manage lead sources for their organization"
    ON lead_sources FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    ));

-- Functions for Lead Management

-- Function to calculate lead score
CREATE OR REPLACE FUNCTION calculate_lead_score(client_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_score INTEGER := 0;
    demographic_score INTEGER := 0;
    behavioral_score INTEGER := 0;
    engagement_score INTEGER := 0;
    fit_score INTEGER := 0;
    client_record RECORD;
    org_id UUID;
BEGIN
    -- Get client and organization info
    SELECT * INTO client_record FROM clients WHERE id = client_uuid;
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    org_id := client_record.organization_id;
    
    -- Demographic Scoring (0-25 points)
    -- Wedding date proximity (0-10)
    IF client_record.wedding_date IS NOT NULL THEN
        CASE 
            WHEN client_record.wedding_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '6 months' THEN
                demographic_score := demographic_score + 10;
            WHEN client_record.wedding_date BETWEEN CURRENT_DATE + INTERVAL '6 months' AND CURRENT_DATE + INTERVAL '12 months' THEN
                demographic_score := demographic_score + 8;
            WHEN client_record.wedding_date BETWEEN CURRENT_DATE + INTERVAL '12 months' AND CURRENT_DATE + INTERVAL '18 months' THEN
                demographic_score := demographic_score + 6;
            ELSE
                demographic_score := demographic_score + 3;
        END CASE;
    END IF;
    
    -- Budget match (0-10)
    IF client_record.budget_range IS NOT NULL THEN
        demographic_score := demographic_score + 8; -- Assume good match for having budget
    END IF;
    
    -- Complete profile (0-5)
    IF client_record.email IS NOT NULL AND client_record.phone IS NOT NULL 
       AND client_record.venue_name IS NOT NULL THEN
        demographic_score := demographic_score + 5;
    END IF;
    
    -- Behavioral Scoring (0-25 points)
    -- Form completions, email opens, website visits would go here
    behavioral_score := LEAST(client_record.touch_count * 2, 25);
    
    -- Engagement Scoring (0-25 points)
    -- Recent activity (0-15)
    IF client_record.last_touch_date > CURRENT_DATE - INTERVAL '7 days' THEN
        engagement_score := engagement_score + 15;
    ELSIF client_record.last_touch_date > CURRENT_DATE - INTERVAL '30 days' THEN
        engagement_score := engagement_score + 10;
    ELSIF client_record.last_touch_date > CURRENT_DATE - INTERVAL '90 days' THEN
        engagement_score := engagement_score + 5;
    END IF;
    
    -- Response rate (0-10)
    engagement_score := engagement_score + LEAST(client_record.engagement_score / 10, 10);
    
    -- Fit Scoring (0-25 points)
    -- Lead source quality
    IF client_record.lead_source = 'referral' THEN
        fit_score := fit_score + 20;
    ELSIF client_record.lead_source = 'website' THEN
        fit_score := fit_score + 15;
    ELSIF client_record.lead_source = 'social_media' THEN
        fit_score := fit_score + 10;
    ELSE
        fit_score := fit_score + 5;
    END IF;
    
    -- Location match (0-5)
    IF client_record.venue_name IS NOT NULL THEN
        fit_score := fit_score + 5;
    END IF;
    
    -- Calculate total
    total_score := LEAST(demographic_score + behavioral_score + engagement_score + fit_score, 100);
    
    -- Update lead_scores table
    INSERT INTO lead_scores (
        client_id, organization_id, demographic_score, behavioral_score, 
        engagement_score, fit_score, total_score, score_grade,
        scoring_factors, last_calculated_at
    ) VALUES (
        client_uuid, org_id, demographic_score, behavioral_score,
        engagement_score, fit_score, total_score,
        CASE 
            WHEN total_score >= 90 THEN 'A+'
            WHEN total_score >= 80 THEN 'A'
            WHEN total_score >= 70 THEN 'B'
            WHEN total_score >= 60 THEN 'C'
            WHEN total_score >= 50 THEN 'D'
            ELSE 'F'
        END,
        jsonb_build_object(
            'demographic', demographic_score,
            'behavioral', behavioral_score,
            'engagement', engagement_score,
            'fit', fit_score,
            'calculated_at', NOW()
        ),
        NOW()
    ) ON CONFLICT (client_id) DO UPDATE SET
        demographic_score = EXCLUDED.demographic_score,
        behavioral_score = EXCLUDED.behavioral_score,
        engagement_score = EXCLUDED.engagement_score,
        fit_score = EXCLUDED.fit_score,
        previous_score = lead_scores.total_score,
        total_score = EXCLUDED.total_score,
        score_grade = EXCLUDED.score_grade,
        score_trend = CASE 
            WHEN EXCLUDED.total_score > lead_scores.total_score THEN 'up'
            WHEN EXCLUDED.total_score < lead_scores.total_score THEN 'down'
            ELSE 'stable'
        END,
        scoring_factors = EXCLUDED.scoring_factors,
        last_calculated_at = NOW(),
        updated_at = NOW();
    
    -- Update client record
    UPDATE clients SET 
        lead_score = total_score,
        lead_grade = CASE 
            WHEN total_score >= 90 THEN 'A+'
            WHEN total_score >= 80 THEN 'A'
            WHEN total_score >= 70 THEN 'B'
            WHEN total_score >= 60 THEN 'C'
            WHEN total_score >= 50 THEN 'D'
            ELSE 'F'
        END,
        updated_at = NOW()
    WHERE id = client_uuid;
    
    RETURN total_score;
END;
$$;

-- Function to update lead status with history tracking
CREATE OR REPLACE FUNCTION update_lead_status(
    client_uuid UUID, 
    new_status VARCHAR(50), 
    change_reason VARCHAR(255) DEFAULT NULL,
    notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_status VARCHAR(50);
    org_id UUID;
    user_id UUID;
    time_in_status INTEGER;
BEGIN
    -- Get current user
    SELECT auth.uid() INTO user_id;
    
    -- Get current status and organization
    SELECT status, organization_id INTO current_status, org_id 
    FROM clients WHERE id = client_uuid;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate time in current status
    SELECT EXTRACT(EPOCH FROM (NOW() - updated_at))/3600 INTO time_in_status
    FROM clients WHERE id = client_uuid;
    
    -- Insert status history record
    INSERT INTO lead_status_history (
        client_id, organization_id, previous_status, new_status,
        changed_by, change_reason, notes, time_in_previous_status_hours
    ) VALUES (
        client_uuid, org_id, current_status, new_status,
        user_id, change_reason, notes, time_in_status::INTEGER
    );
    
    -- Update client status
    UPDATE clients SET 
        status = new_status,
        updated_at = NOW(),
        last_modified_by = user_id
    WHERE id = client_uuid;
    
    -- Recalculate lead score
    PERFORM calculate_lead_score(client_uuid);
    
    RETURN TRUE;
END;
$$;

-- Insert default lifecycle stages
INSERT INTO lead_lifecycle_stages (organization_id, stage_name, stage_order, stage_color, target_duration_days) 
SELECT 
    o.id as organization_id,
    stage_name,
    stage_order,
    stage_color,
    target_duration_days
FROM organizations o, (
    VALUES 
        ('New Lead', 1, '#EF4444', 1),
        ('Contacted', 2, '#F59E0B', 3),  
        ('Qualified', 3, '#3B82F6', 7),
        ('Proposal Sent', 4, '#8B5CF6', 5),
        ('Negotiating', 5, '#EC4899', 10),
        ('Won', 6, '#10B981', NULL),
        ('Lost', 7, '#6B7280', NULL)
) AS stages(stage_name, stage_order, stage_color, target_duration_days);

-- Insert default lead sources
INSERT INTO lead_sources (organization_id, source_name, source_category)
SELECT 
    o.id as organization_id,
    source_name,
    source_category
FROM organizations o, (
    VALUES 
        ('Website', 'website'),
        ('Social Media', 'social'),
        ('Referral', 'referral'),
        ('Google Ads', 'advertising'),
        ('Wedding Show', 'event'),
        ('Email Marketing', 'email'),
        ('Directory Listing', 'website'),
        ('Word of Mouth', 'referral')
) AS sources(source_name, source_category);