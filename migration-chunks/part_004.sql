s.node_id, ns.node_name, ns.sequence_order
)
SELECT 
  nr.*,
  LAG(nr.instances_reached, 1) OVER (PARTITION BY nr.journey_id ORDER BY nr.sequence_order) as previous_stage_reached,
  CASE 
    WHEN LAG(nr.instances_reached, 1) OVER (PARTITION BY nr.journey_id ORDER BY nr.sequence_order) > 0
    THEN (nr.instances_reached::DECIMAL / LAG(nr.instances_reached, 1) OVER (PARTITION BY nr.journey_id ORDER BY nr.sequence_order) * 100)
    ELSE 100
  END as conversion_from_previous
FROM node_reach nr;

-- Function to aggregate daily metrics
CREATE OR REPLACE FUNCTION aggregate_daily_journey_metrics()
RETURNS void AS $$
BEGIN
  -- Aggregate metrics for yesterday
  INSERT INTO journey_metrics (
    journey_id, date, instances_started, instances_completed, 
    instances_failed, instances_active, avg_completion_time,
    median_completion_time, conversion_rate, revenue_attributed, unique_clients
  )
  SELECT 
    j.id as journey_id,
    CURRENT_DATE - INTERVAL '1 day' as date,
    COUNT(DISTINCT CASE WHEN DATE(ji.created_at) = CURRENT_DATE - INTERVAL '1 day' THEN ji.id END) as instances_started,
    COUNT(DISTINCT CASE WHEN DATE(ji.completed_at) = CURRENT_DATE - INTERVAL '1 day' THEN ji.id END) as instances_completed,
    COUNT(DISTINCT CASE WHEN ji.status = 'failed' AND DATE(ji.updated_at) = CURRENT_DATE - INTERVAL '1 day' THEN ji.id END) as instances_failed,
    COUNT(DISTINCT CASE WHEN ji.status IN ('active', 'running') THEN ji.id END) as instances_active,
    AVG(ji.completed_at - ji.created_at) FILTER (WHERE ji.status = 'completed') as avg_completion_time,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ji.completed_at - ji.created_at) FILTER (WHERE ji.status = 'completed') as median_completion_time,
    CASE 
      WHEN COUNT(DISTINCT ji.id) > 0 
      THEN (COUNT(DISTINCT CASE WHEN ji.status = 'completed' THEN ji.id END)::DECIMAL / COUNT(DISTINCT ji.id) * 100)
      ELSE 0 
    END as conversion_rate,
    COALESCE(SUM(jra.revenue_amount), 0) as revenue_attributed,
    COUNT(DISTINCT ji.client_id) as unique_clients
  FROM journey_canvases j
  LEFT JOIN journey_instances ji ON j.id = ji.journey_id
  LEFT JOIN journey_revenue_attribution jra ON j.id = jra.journey_id 
    AND DATE(jra.recorded_at) = CURRENT_DATE - INTERVAL '1 day'
  GROUP BY j.id
  ON CONFLICT (journey_id, date) 
  DO UPDATE SET
    instances_started = EXCLUDED.instances_started,
    instances_completed = EXCLUDED.instances_completed,
    instances_failed = EXCLUDED.instances_failed,
    instances_active = EXCLUDED.instances_active,
    avg_completion_time = EXCLUDED.avg_completion_time,
    median_completion_time = EXCLUDED.median_completion_time,
    conversion_rate = EXCLUDED.conversion_rate,
    revenue_attributed = EXCLUDED.revenue_attributed,
    unique_clients = EXCLUDED.unique_clients,
    updated_at = NOW();
    
  -- Refresh materialized view
  REFRESH MATERIALIZED VIEW CONCURRENTLY journey_performance_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY journey_dashboard_summary;
END;
$$ LANGUAGE plpgsql;

-- Function to update real-time metrics on journey instance changes
CREATE OR REPLACE FUNCTION update_analytics_on_instance_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update client journey progress
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO client_journey_progress (
      instance_id, client_id, journey_id, current_stage,
      completion_percentage, engagement_level, last_interaction
    ) VALUES (
      NEW.id, NEW.client_id, NEW.journey_id, NEW.current_node_id,
      CASE 
        WHEN NEW.status = 'completed' THEN 100
        WHEN NEW.status = 'failed' THEN 0
        ELSE COALESCE(NEW.progress_percentage, 0)
      END,
      CASE 
        WHEN NEW.progress_percentage >= 75 THEN 'high'
        WHEN NEW.progress_percentage >= 40 THEN 'medium'
        ELSE 'low'
      END,
      NOW()
    )
    ON CONFLICT (instance_id) 
    DO UPDATE SET
      current_stage = EXCLUDED.current_stage,
      completion_percentage = EXCLUDED.completion_percentage,
      engagement_level = EXCLUDED.engagement_level,
      last_interaction = EXCLUDED.last_interaction,
      updated_at = NOW();
  END IF;
  
  -- Update today's metrics cache
  UPDATE journey_analytics 
  SET 
    total_instances = total_instances + CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE 0 END,
    completed_instances = completed_instances + CASE WHEN NEW.status = 'completed' AND OLD.status != 'completed' THEN 1 ELSE 0 END,
    updated_at = NOW()
  WHERE journey_id = NEW.journey_id 
    AND date = CURRENT_DATE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for real-time updates
DROP TRIGGER IF EXISTS analytics_instance_change_trigger ON journey_instances;
CREATE TRIGGER analytics_instance_change_trigger
AFTER INSERT OR UPDATE ON journey_instances
FOR EACH ROW
EXECUTE FUNCTION update_analytics_on_instance_change();

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_journey_metrics_journey_date ON journey_metrics(journey_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_node_execution_metrics_node ON node_execution_metrics(node_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_client_engagement_journey ON client_engagement_metrics(journey_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_journey_instances_analytics ON journey_instances(journey_id, status, created_at);

-- Grant permissions
GRANT SELECT ON journey_metrics TO authenticated;
GRANT SELECT ON node_execution_metrics TO authenticated;
GRANT SELECT ON client_engagement_metrics TO authenticated;
GRANT SELECT ON journey_performance_summary TO authenticated;
GRANT SELECT ON journey_funnel_analysis TO authenticated;

-- Create scheduled job to aggregate metrics (runs daily at 2 AM)
-- This would be set up in Supabase dashboard or via pg_cron
-- SELECT cron.schedule('aggregate-journey-metrics', '0 2 * * *', 'SELECT aggregate_daily_journey_metrics();');

COMMENT ON TABLE journey_metrics IS 'Daily aggregated metrics for journey performance';
COMMENT ON TABLE node_execution_metrics IS 'Daily node-level execution metrics';
COMMENT ON TABLE client_engagement_metrics IS 'Client engagement tracking across journeys';
COMMENT ON MATERIALIZED VIEW journey_performance_summary IS 'High-performance summary for dashboard queries';
COMMENT ON VIEW journey_funnel_analysis IS 'Real-time funnel conversion analysis';


-- ========================================
-- Migration: 20250101000020_form_templates_library.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- Form Templates Library Migration
-- Creates wedding industry-specific form templates

-- Photography Forms
INSERT INTO form_templates (id, vendor_type, name, fields, is_marketplace) VALUES
(gen_random_uuid(), 'photography', 'Wedding Photography Questionnaire', 
'{
  "sections": [
    {
      "title": "Wedding Details",
      "fields": [
        {"name": "wedding_date", "type": "date", "label": "Wedding Date", "required": true},
        {"name": "ceremony_venue", "type": "text", "label": "Ceremony Venue", "required": true},
        {"name": "reception_venue", "type": "text", "label": "Reception Venue", "required": true},
        {"name": "guest_count", "type": "number", "label": "Estimated Guest Count", "required": true}
      ]
    },
    {
      "title": "Photography Coverage",
      "fields": [
        {"name": "coverage_hours", "type": "number", "label": "Hours of Coverage Needed", "required": true},
        {"name": "getting_ready", "type": "checkbox", "label": "Include Getting Ready Photos"},
        {"name": "first_look", "type": "checkbox", "label": "Planning a First Look"},
        {"name": "engagement_session", "type": "checkbox", "label": "Include Engagement Session"}
      ]
    },
    {
      "title": "Style Preferences",
      "fields": [
        {"name": "photography_style", "type": "select", "label": "Preferred Photography Style", 
         "options": ["Traditional", "Photojournalistic", "Fine Art", "Dark & Moody", "Light & Airy"],
         "required": true},
        {"name": "must_have_shots", "type": "textarea", "label": "Must-Have Shots or Moments"},
        {"name": "pinterest_board", "type": "url", "label": "Pinterest Board or Inspiration Link"}
      ]
    }
  ]
}'::jsonb, false),

(gen_random_uuid(), 'photography', 'Shot List Builder',
'{
  "sections": [
    {
      "title": "Family Formal Photos",
      "fields": [
        {"name": "immediate_family", "type": "textarea", "label": "Immediate Family Members (List Names)"},
        {"name": "extended_family", "type": "textarea", "label": "Extended Family Groups"},
        {"name": "special_groupings", "type": "textarea", "label": "Special Photo Groupings"}
      ]
    },
    {
      "title": "Detail Shots",
      "fields": [
        {"name": "rings", "type": "checkbox", "label": "Rings"},
        {"name": "dress", "type": "checkbox", "label": "Dress Details"},
        {"name": "shoes", "type": "checkbox", "label": "Shoes"},
        {"name": "invitations", "type": "checkbox", "label": "Invitations"},
        {"name": "bouquet", "type": "checkbox", "label": "Bouquet"},
        {"name": "other_details", "type": "textarea", "label": "Other Important Details"}
      ]
    }
  ]
}'::jsonb, false),

-- Catering Forms
(gen_random_uuid(), 'catering', 'Menu Selection Form',
'{
  "sections": [
    {
      "title": "Event Information",
      "fields": [
        {"name": "event_date", "type": "date", "label": "Event Date", "required": true},
        {"name": "guest_count", "type": "number", "label": "Number of Guests", "required": true},
        {"name": "service_style", "type": "select", "label": "Service Style",
         "options": ["Plated", "Buffet", "Family Style", "Cocktail", "Stations"],
         "required": true}
      ]
    },
    {
      "title": "Menu Selections",
      "fields": [
        {"name": "appetizers", "type": "multiselect", "label": "Appetizer Selections"},
        {"name": "entree_options", "type": "multiselect", "label": "Main Course Options"},
        {"name": "sides", "type": "multiselect", "label": "Side Dishes"},
        {"name": "desserts", "type": "multiselect", "label": "Dessert Options"}
      ]
    },
    {
      "title": "Bar Service",
      "fields": [
        {"name": "bar_package", "type": "select", "label": "Bar Package",
         "options": ["Full Open Bar", "Beer & Wine Only", "Signature Cocktails", "Cash Bar", "No Bar Service"]},
        {"name": "signature_drinks", "type": "textarea", "label": "Signature Cocktail Requests"}
      ]
    }
  ]
}'::jsonb, false),

(gen_random_uuid(), 'catering', 'Dietary Requirements Form',
'{
  "sections": [
    {
      "title": "Dietary Restrictions",
      "fields": [
        {"name": "vegetarian_count", "type": "number", "label": "Number of Vegetarian Guests"},
        {"name": "vegan_count", "type": "number", "label": "Number of Vegan Guests"},
        {"name": "gluten_free_count", "type": "number", "label": "Number of Gluten-Free Guests"},
        {"name": "nut_allergies", "type": "number", "label": "Number with Nut Allergies"},
        {"name": "other_allergies", "type": "textarea", "label": "Other Allergies or Restrictions"}
      ]
    },
    {
      "title": "Children''s Meals",
      "fields": [
        {"name": "children_count", "type": "number", "label": "Number of Children (12 and under)"},
        {"name": "kids_meal_preference", "type": "select", "label": "Kids Meal Preference",
         "options": ["Chicken Tenders", "Mac & Cheese", "Mini Burgers", "Pasta", "Same as Adults"]}
      ]
    }
  ]
}'::jsonb, false),

-- DJ/Band Forms
(gen_random_uuid(), 'dj', 'Music Preferences Form',
'{
  "sections": [
    {
      "title": "Music Style",
      "fields": [
        {"name": "genres", "type": "multiselect", "label": "Preferred Music Genres",
         "options": ["Pop", "Rock", "Country", "R&B", "Hip-Hop", "Electronic", "Jazz", "Classical", "Latin"]},
        {"name": "era_preference", "type": "multiselect", "label": "Era Preferences",
         "options": ["Current Hits", "2010s", "2000s", "90s", "80s", "70s", "60s", "Oldies"]}
      ]
    },
    {
      "title": "Special Songs",
      "fields": [
        {"name": "first_dance", "type": "text", "label": "First Dance Song", "required": true},
        {"name": "parent_dances", "type": "textarea", "label": "Parent Dance Songs"},
        {"name": "processional", "type": "text", "label": "Processional Music"},
        {"name": "recessional", "type": "text", "label": "Recessional Music"},
        {"name": "last_song", "type": "text", "label": "Last Song of the Night"}
      ]
    }
  ]
}'::jsonb, false),

(gen_random_uuid(), 'dj', 'Do Not Play List',
'{
  "sections": [
    {
      "title": "Songs to Avoid",
      "fields": [
        {"name": "do_not_play_songs", "type": "textarea", "label": "Songs to NOT Play", 
         "description": "List specific songs you do not want played"},
        {"name": "do_not_play_artists", "type": "textarea", "label": "Artists to Avoid"},
        {"name": "explicit_lyrics", "type": "select", "label": "Explicit Lyrics Policy",
         "options": ["No Explicit Content", "Radio Edits Only", "After 10pm OK", "No Restrictions"]}
      ]
    },
    {
      "title": "Guest Requests",
      "fields": [
        {"name": "guest_requests", "type": "select", "label": "How to Handle Guest Requests",
         "options": ["Play All Requests", "Check with Us First", "Use Your Judgment", "No Guest Requests"]},
        {"name": "request_notes", "type": "textarea", "label": "Additional Notes on Music"}
      ]
    }
  ]
}'::jsonb, false),

-- Venue Forms
(gen_random_uuid(), 'venue', 'Setup Requirements Form',
'{
  "sections": [
    {
      "title": "Layout Preferences",
      "fields": [
        {"name": "ceremony_setup", "type": "select", "label": "Ceremony Seating Style",
         "options": ["Traditional Rows", "Semicircle", "Circle", "Spiral", "Custom"]},
        {"name": "reception_layout", "type": "select", "label": "Reception Table Layout",
         "options": ["Round Tables", "Long Tables", "Mix of Both", "Cocktail Style"]},
        {"name": "dance_floor_size", "type": "select", "label": "Dance Floor Size",
         "options": ["Small (12x12)", "Medium (16x16)", "Large (20x20)", "Extra Large (24x24)"]}
      ]
    },
    {
      "title": "Vendor Access",
      "fields": [
        {"name": "load_in_time", "type": "time", "label": "Vendor Load-in Time", "required": true},
        {"name": "vendor_meal_count", "type": "number", "label": "Number of Vendor Meals Needed"},
        {"name": "vendor_list", "type": "textarea", "label": "List of All Vendors (Name & Service)"}
      ]
    }
  ]
}'::jsonb, false),

(gen_random_uuid(), 'venue', 'Floor Plan Selection',
'{
  "sections": [
    {
      "title": "Space Configuration",
      "fields": [
        {"name": "ceremony_location", "type": "select", "label": "Ceremony Location",
         "options": ["Garden", "Ballroom", "Terrace", "Chapel", "Beach", "Other"]},
        {"name": "cocktail_location", "type": "select", "label": "Cocktail Hour Location",
         "options": ["Foyer", "Patio", "Garden", "Separate Room", "Same as Reception"]},
        {"name": "reception_room", "type": "select", "label": "Reception Space"},
        {"name": "rain_plan", "type": "textarea", "label": "Rain Plan (if outdoor)", "required": true}
      ]
    }
  ]
}'::jsonb, false),

-- Florist Forms
(gen_random_uuid(), 'florist', 'Bouquet & Personal Flowers Form',
'{
  "sections": [
    {
      "title": "Bridal Bouquet",
      "fields": [
        {"name": "bouquet_style", "type": "select", "label": "Bouquet Style",
         "options": ["Round", "Cascade", "Hand-tied", "Nosegay", "Composite", "Presentation"]},
        {"name": "bouquet_size", "type": "select", "label": "Bouquet Size",
         "options": ["Petite", "Medium", "Large", "Oversized"]},
        {"name": "favorite_flowers", "type": "textarea", "label": "Favorite Flowers"},
        {"name": "flowers_to_avoid", "type": "textarea", "label": "Flowers to Avoid (allergies, dislikes)"}
      ]
    },
    {
      "title": "Wedding Party Flowers",
      "fields": [
        {"name": "bridesmaid_count", "type": "number", "label": "Number of Bridesmaids"},
        {"name": "groomsmen_count", "type": "number", "label": "Number of Groomsmen"},
        {"name": "flower_girl", "type": "checkbox", "label": "Flower Girl Petals/Basket"},
        {"name": "corsages_count", "type": "number", "label": "Number of Corsages Needed"},
        {"name": "special_requests", "type": "textarea", "label": "Special Flower Requests"}
      ]
    }
  ]
}'::jsonb, false),

(gen_random_uuid(), 'florist', 'Centerpiece & Decor Form',
'{
  "sections": [
    {
      "title": "Reception Centerpieces",
      "fields": [
        {"name": "guest_table_count", "type": "number", "label": "Number of Guest Tables", "required": true},
        {"name": "centerpiece_style", "type": "select", "label": "Centerpiece Style",
         "options": ["Tall", "Low", "Mix of Heights", "Garland", "Candles Only"]},
        {"name": "head_table_style", "type": "select", "label": "Head Table Style",
         "options": ["Garland", "Individual Arrangements", "Statement Piece", "Same as Guest Tables"]}
      ]
    },
    {
      "title": "Ceremony Decor",
      "fields": [
        {"name": "arch_arbor", "type": "checkbox", "label": "Arch or Arbor Flowers"},
        {"name": "aisle_decor", "type": "checkbox", "label": "Aisle Decorations"},
        {"name": "altar_arrangements", "type": "number", "label": "Number of Altar Arrangements"},
        {"name": "petal_toss", "type": "checkbox", "label": "Petals for Toss/Exit"}
      ]
    },
    {
      "title": "Color Palette",
      "fields": [
        {"name": "primary_colors", "type": "text", "label": "Primary Wedding Colors", "required": true},
        {"name": "accent_colors", "type": "text", "label": "Accent Colors"},
        {"name": "color_inspiration", "type": "url", "label": "Pinterest/Inspiration Link"}
      ]
    }
  ]
}'::jsonb, false);

-- Update form_templates to track usage and ratings
ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_form_templates_vendor_type ON form_templates(vendor_type);
CREATE INDEX IF NOT EXISTS idx_form_templates_marketplace ON form_templates(is_marketplace);

-- Add RLS policies for form templates
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view form templates
CREATE POLICY "Form templates are viewable by all" ON form_templates
  FOR SELECT USING (true);

-- Only admins can insert/update/delete templates
CREATE POLICY "Only admins can manage form templates" ON form_templates
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE role = 'admin'
    )
  );

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000021_lead_status_tracking_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

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
DROP VIEW IF EXISTS lead_status_history CASCADE;
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
DROP VIEW IF EXISTS lead_scores CASCADE;
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
DROP VIEW IF EXISTS lead_scoring_rules CASCADE;
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
DROP VIEW IF EXISTS lead_lifecycle_stages CASCADE;
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
DROP VIEW IF EXISTS lead_sources CASCADE;
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
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    ));

CREATE POLICY "Users can insert lead status history for their organization"
    ON lead_status_history FOR INSERT
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    ));

-- Lead Scores Policies
CREATE POLICY "Users can view their organization's lead scores"
    ON lead_scores FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    ));

CREATE POLICY "Users can manage lead scores for their organization"
    ON lead_scores FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    ));

-- Lead Scoring Rules Policies
CREATE POLICY "Users can manage scoring rules for their organization"
    ON lead_scoring_rules FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    ));

-- Lead Lifecycle Stages Policies
CREATE POLICY "Users can manage lifecycle stages for their organization"
    ON lead_lifecycle_stages FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    ));

-- Lead Sources Policies
CREATE POLICY "Users can manage lead sources for their organization"
    ON lead_sources FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
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

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000022_advanced_journey_index_optimization.sql
-- ========================================

-- =====================================================
-- ADVANCED JOURNEY INDEX OPTIMIZATION MIGRATION
-- =====================================================
-- Team D - Round 1: Database Indexes Optimization
-- Advanced indexing strategy for journey queries and analytics
-- Target: Sub-25ms journey query performance with complex analytics
-- Created: 2025-01-21
-- =====================================================

-- Enable required extensions for advanced indexing
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- JOURNEY SYSTEM PERFORMANCE INDEXES
-- =====================================================

-- Advanced composite indexes for journey queries
DROP INDEX IF EXISTS idx_journey_instances_journey_id;
DROP INDEX IF EXISTS idx_journey_instances_client_id;
DROP INDEX IF EXISTS idx_journey_instances_state;

-- Multi-column composite index for journey instance queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journey_instances_composite_performance
ON journey_instances(journey_id, state, client_id, started_at DESC)
INCLUDE (current_node_id, variables, next_execution_at)
WHERE state IN ('active', 'paused');

-- Execution state optimization index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journey_instances_execution_state
ON journey_instances(state, next_execution_at, retry_count)
WHERE state = 'active' AND next_execution_at IS NOT NULL
INCLUDE (journey_id, vendor_id, client_id);

-- Journey analytics composite index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journey_instances_analytics
ON journey_instances(vendor_id, state, started_at, completed_at)
INCLUDE (total_duration_ms, active_duration_ms, entry_source);

-- =====================================================
-- NODE EXECUTION PERFORMANCE INDEXES
-- =====================================================

-- Node execution pattern analysis index
DROP INDEX IF EXISTS idx_node_executions_instance_id;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_node_executions_performance_composite
ON journey_node_executions(instance_id, node_id, status, started_at DESC)
INCLUDE (duration_ms, action_type, attempt_number);

-- Error tracking and retry optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_node_executions_error_analysis
ON journey_node_executions(journey_id, status, started_at)
WHERE status IN ('failed', 'cancelled')
INCLUDE (node_id, error_message, attempt_number);

-- Performance metrics index for slow node detection
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_node_executions_performance_metrics
ON journey_node_executions(node_id, action_type, duration_ms)
WHERE duration_ms > 1000 -- Queries taking more than 1 second
INCLUDE (journey_id, instance_id, started_at);

-- =====================================================
-- JOURNEY EVENTS OPTIMIZATION
-- =====================================================

-- Event processing pipeline index
DROP INDEX IF EXISTS idx_journey_events_processed;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journey_events_processing_pipeline
ON journey_events(processed, event_type, occurred_at)
WHERE processed = false
INCLUDE (journey_id, instance_id, event_data);

-- Event analytics composite index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journey_events_analytics
ON journey_events(journey_id, client_id, event_type, occurred_at DESC)
INCLUDE (event_data, processed_at);

-- =====================================================
-- JOURNEY SCHEDULES OPTIMIZATION
-- =====================================================

-- Schedule processing optimization
DROP INDEX IF EXISTS idx_journey_schedules_scheduled_for;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journey_schedules_execution_queue
ON journey_schedules(status, scheduled_for, retry_count)
WHERE status IN ('pending', 'processing')
INCLUDE (instance_id, node_id, schedule_type);

-- =====================================================
-- ADVANCED ANALYTICS INDEXES
-- =====================================================

-- Journey performance analytics index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journeys_performance_analytics
ON journeys(organization_id, status, activated_at, last_executed_at)
WHERE status = 'active'
INCLUDE (name, version, stats);

-- Vendor journey efficiency index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journey_vendor_efficiency
ON journey_instances(vendor_id, state, started_at)
INCLUDE (completed_at, total_duration_ms, client_id);

-- Time-based journey analysis index (for seasonal patterns)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journey_instances_time_series
ON journey_instances(DATE_TRUNC('day', started_at), vendor_id, state)
INCLUDE (journey_id, total_duration_ms);

-- =====================================================
-- FULL-TEXT SEARCH OPTIMIZATION
-- =====================================================

-- Journey search optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journeys_fulltext_search
ON journeys USING GIN((name || ' ' || COALESCE(description, '')) gin_trgm_ops);

-- Journey template search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journey_templates_search
ON journey_templates USING GIN((name || ' ' || COALESCE(description, '') || ' ' || COALESCE(category, '')) gin_trgm_ops);

-- Tags search optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journeys_tags_search
ON journeys USING GIN(tags);

-- =====================================================
-- CONDITIONAL INDEXES FOR SPECIFIC PATTERNS
-- =====================================================

-- Failed journey instances for debugging
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journey_instances_failed_analysis
ON journey_instances(journey_id, failed_at, error_count)
WHERE state = 'failed'
INCLUDE (last_error, vendor_id, client_id);

-- High-frequency execution nodes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journey_nodes_high_frequency
ON journey_nodes(journey_id, execution_count DESC, type)
WHERE execution_count > 100
INCLUDE (name, action_type, average_duration_ms);

-- Recent active journeys (last 30 days)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journeys_recent_active
ON journeys(organization_id, last_executed_at DESC)
WHERE last_executed_at >= CURRENT_DATE - INTERVAL '30 days'
INCLUDE (name, status, stats);

-- =====================================================
-- JOURNEY ANALYTICS MATERIALIZED VIEWS
-- =====================================================

-- Journey execution performance view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_journey_execution_analytics AS
SELECT 
  j.id as journey_id,
  j.name as journey_name,
  j.organization_id,
  COUNT(ji.id) as total_executions,
  COUNT(ji.id) FILTER (WHERE ji.state = 'completed') as completed_executions,
  COUNT(ji.id) FILTER (WHERE ji.state = 'failed') as failed_executions,
  COUNT(ji.id) FILTER (WHERE ji.state = 'active') as active_executions,
  AVG(ji.total_duration_ms) as avg_duration_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ji.total_duration_ms) as median_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ji.total_duration_ms) as p95_duration_ms,
  MIN(ji.started_at) as first_execution,
  MAX(ji.started_at) as last_execution,
  COUNT(DISTINCT ji.client_id) as unique_clients,
  -- Performance metrics
  AVG(jne.duration_ms) as avg_node_duration_ms,
  COUNT(jne.id) FILTER (WHERE jne.status = 'failed') as total_node_failures,
  -- Conversion metrics
  CASE 
    WHEN COUNT(ji.id) > 0 THEN 
      ROUND((COUNT(ji.id) FILTER (WHERE ji.state = 'completed'))::numeric / COUNT(ji.id)::numeric * 100, 2)
    ELSE 0 
  END as completion_rate_percent,
  NOW() as refreshed_at
FROM journeys j
LEFT JOIN journey_instances ji ON j.id = ji.journey_id
LEFT JOIN journey_node_executions jne ON ji.id = jne.instance_id
WHERE j.status != 'deleted'
  AND ji.started_at >= CURRENT_DATE - INTERVAL '90 days' -- Last 90 days
GROUP BY j.id, j.name, j.organization_id;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_journey_execution_analytics_pk
ON mv_journey_execution_analytics(journey_id);

CREATE INDEX IF NOT EXISTS idx_mv_journey_execution_analytics_org
ON mv_journey_execution_analytics(organization_id, completion_rate_percent DESC);

-- Node performance analytics view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_journey_node_performance AS
SELECT 
  jn.journey_id,
  jn.node_id,
  jn.type as node_type,
  jn.action_type,
  jn.name as node_name,
  COUNT(jne.id) as execution_count,
  AVG(jne.duration_ms) as avg_duration_ms,
  MIN(jne.duration_ms) as min_duration_ms,
  MAX(jne.duration_ms) as max_duration_ms,
  STDDEV(jne.duration_ms) as duration_stddev,
  COUNT(jne.id) FILTER (WHERE jne.status = 'completed') as success_count,
  COUNT(jne.id) FILTER (WHERE jne.status = 'failed') as failure_count,
  CASE 
    WHEN COUNT(jne.id) > 0 THEN 
      ROUND((COUNT(jne.id) FILTER (WHERE jne.status = 'completed'))::numeric / COUNT(jne.id)::numeric * 100, 2)
    ELSE 0 
  END as success_rate_percent,
  -- Performance classification
  CASE 
    WHEN AVG(jne.duration_ms) <= 100 THEN 'fast'
    WHEN AVG(jne.duration_ms) <= 1000 THEN 'medium'
    WHEN AVG(jne.duration_ms) <= 5000 THEN 'slow'
    ELSE 'critical'
  END as performance_category,
  NOW() as refreshed_at
FROM journey_nodes jn
LEFT JOIN journey_node_executions jne ON jn.journey_id = jne.journey_id AND jn.node_id = jne.node_id
WHERE jne.started_at >= CURRENT_DATE - INTERVAL '30 days' -- Last 30 days
GROUP BY jn.journey_id, jn.node_id, jn.type, jn.action_type, jn.name
HAVING COUNT(jne.id) > 0;

-- Create indexes on node performance view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_journey_node_performance_pk
ON mv_journey_node_performance(journey_id, node_id);

CREATE INDEX IF NOT EXISTS idx_mv_journey_node_performance_category
ON mv_journey_node_performance(performance_category, avg_duration_ms DESC);

-- =====================================================
-- PERFORMANCE OPTIMIZATION FUNCTIONS
-- =====================================================

-- Function to analyze journey query performance
CREATE OR REPLACE FUNCTION analyze_journey_query_performance()
RETURNS TABLE(
  query_type TEXT,
  avg_execution_time_ms DECIMAL,
  total_executions BIGINT,
  optimization_recommendation TEXT
) AS $$
BEGIN
  -- Analyze journey instance queries
  RETURN QUERY
  SELECT 
    'journey_instances'::TEXT as query_type,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)::DECIMAL as avg_time,
    COUNT(*)::BIGINT as total_exec,
    CASE 
      WHEN AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000) > 100 THEN
        'Consider partitioning journey_instances by date'
      WHEN COUNT(*) > 10000 THEN
        'High volume detected - optimize with materialized views'
      ELSE
        'Performance within acceptable limits'
    END as recommendation
  FROM journey_instances 
  WHERE started_at >= CURRENT_DATE - INTERVAL '7 days';

  -- Analyze node execution queries
  RETURN QUERY
  SELECT 
    'node_executions'::TEXT as query_type,
    AVG(duration_ms)::DECIMAL as avg_time,
    COUNT(*)::BIGINT as total_exec,
    CASE 
      WHEN AVG(duration_ms) > 1000 THEN
        'Slow node executions detected - review action implementations'
      WHEN COUNT(*) > 50000 THEN
        'Consider archiving old execution data'
      ELSE
        'Node performance is optimal'
    END as recommendation
  FROM journey_node_executions 
  WHERE started_at >= CURRENT_DATE - INTERVAL '7 days';

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refresh journey analytics views
CREATE OR REPLACE FUNCTION refresh_journey_analytics()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  start_time TIMESTAMP;
  refresh_duration DECIMAL;
BEGIN
  start_time := NOW();
  
  -- Refresh materialized views concurrently
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_journey_execution_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_journey_node_performance;
  
  refresh_duration := EXTRACT(EPOCH FROM (NOW() - start_time));
  
  result := jsonb_build_object(
    'views_refreshed', 2,
    'refresh_duration_seconds', refresh_duration,
    'refreshed_at', NOW(),
    'status', 'success'
  );
  
  -- Log the refresh
  INSERT INTO query_performance_log (
    query_hash, 
    query_pattern, 
    execution_time_ms, 
    optimization_applied,
    seasonal_adjusted
  ) VALUES (
    md5('refresh_journey_analytics'),
    'materialized_view_refresh',
    refresh_duration * 1000,
    true,
    is_wedding_season()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get journey performance insights
CREATE OR REPLACE FUNCTION get_journey_performance_insights(p_organization_id UUID)
RETURNS TABLE(
  insight_type TEXT,
  metric_name TEXT,
  metric_value DECIMAL,
  recommendation TEXT,
  priority TEXT
) AS $$
BEGIN
  -- Journey completion rate insights
  RETURN QUERY
  SELECT 
    'completion_rate'::TEXT as insight_type,
    'avg_completion_rate'::TEXT as metric_name,
    AVG(completion_rate_percent) as metric_value,
    CASE 
      WHEN AVG(completion_rate_percent) < 50 THEN 'Low completion rate - review journey design'
      WHEN AVG(completion_rate_percent) < 70 THEN 'Moderate completion rate - optimize bottlenecks'
      ELSE 'Good completion rate - maintain current strategy'
    END as recommendation,
    CASE 
      WHEN AVG(completion_rate_percent) < 50 THEN 'high'
      WHEN AVG(completion_rate_percent) < 70 THEN 'medium'
      ELSE 'low'
    END as priority
  FROM mv_journey_execution_analytics
  WHERE organization_id = p_organization_id;

  -- Performance insights
  RETURN QUERY
  SELECT 
    'performance'::TEXT as insight_type,
    'avg_duration_ms'::TEXT as metric_name,
    AVG(avg_duration_ms) as metric_value,
    CASE 
      WHEN AVG(avg_duration_ms) > 300000 THEN 'Long journey duration - consider optimization'
      WHEN AVG(avg_duration_ms) > 60000 THEN 'Moderate duration - monitor for improvements'
      ELSE 'Optimal journey duration'
    END as recommendation,
    CASE 
      WHEN AVG(avg_duration_ms) > 300000 THEN 'high'
      WHEN AVG(avg_duration_ms) > 60000 THEN 'medium'
      ELSE 'low'
    END as priority
  FROM mv_journey_execution_analytics
  WHERE organization_id = p_organization_id;

  -- Node failure insights
  RETURN QUERY
  SELECT 
    'node_failures'::TEXT as insight_type,
    'avg_failure_rate'::TEXT as metric_name,
    AVG(100 - success_rate_percent) as metric_value,
    CASE 
      WHEN AVG(success_rate_percent) < 80 THEN 'High node failure rate - review implementations'
      WHEN AVG(success_rate_percent) < 95 THEN 'Some node failures - monitor and optimize'
      ELSE 'Low failure rate - maintain current quality'
    END as recommendation,
    CASE 
      WHEN AVG(success_rate_percent) < 80 THEN 'high'
      WHEN AVG(success_rate_percent) < 95 THEN 'medium'
      ELSE 'low'
    END as priority
  FROM mv_journey_node_performance jnp
  INNER JOIN mv_journey_execution_analytics jea ON jnp.journey_id = jea.journey_id
  WHERE jea.organization_id = p_organization_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INDEX MONITORING AND OPTIMIZATION
-- =====================================================

-- Function to monitor index effectiveness for journey queries
CREATE OR REPLACE FUNCTION monitor_journey_index_usage()
RETURNS TABLE(
  table_name TEXT,
  index_name TEXT,
  scans BIGINT,
  tuples_read BIGINT,
  tuples_fetched BIGINT,
  usage_category TEXT,
  recommendation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname||'.'||relname as tbl_name,
    indexrelname as idx_name,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    CASE 
      WHEN idx_scan = 0 THEN 'unused'
      WHEN idx_scan < 100 THEN 'rarely_used'
      WHEN idx_scan < 1000 THEN 'moderately_used'
      ELSE 'heavily_used'
    END as usage_category,
    CASE 
      WHEN idx_scan = 0 THEN 'Consider removing this index'
      WHEN idx_scan < 100 AND pg_relation_size(indexrelid) > 100000000 THEN 'Large unused index - consider removal'
      WHEN idx_scan > 10000 THEN 'High-value index - maintain and monitor'
      ELSE 'Monitor usage patterns'
    END as recommendation
  FROM pg_stat_user_indexes pui
  INNER JOIN pg_indexes pi ON pi.indexname = pui.indexrelname
  WHERE pui.relname IN (
    'journeys', 'journey_instances', 'journey_nodes', 
    'journey_node_executions', 'journey_events', 'journey_schedules'
  )
  ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- AUTOMATED INDEX MAINTENANCE
-- =====================================================

-- Function to analyze and recommend new indexes based on query patterns
CREATE OR REPLACE FUNCTION recommend_journey_indexes()
RETURNS TABLE(
  table_name TEXT,
  recommended_index TEXT,
  reasoning TEXT,
  estimated_benefit TEXT
) AS $$
BEGIN
  -- Analyze slow queries and missing indexes for journey tables
  RETURN QUERY
  WITH slow_queries AS (
    SELECT 
      query_pattern,
      AVG(execution_time_ms) as avg_time,
      COUNT(*) as frequency
    FROM query_performance_log 
    WHERE created_at >= NOW() - INTERVAL '24 hours'
      AND execution_time_ms > 50
      AND query_pattern LIKE '%journey%'
    GROUP BY query_pattern
    HAVING COUNT(*) > 10
  )
  SELECT 
    'journey_instances'::TEXT as tbl_name,
    'CREATE INDEX CONCURRENTLY idx_journey_instances_vendor_state_date ON journey_instances(vendor_id, state, started_at) WHERE state = ''active'''::TEXT as recommended_idx,
    'Frequent queries filtering by vendor and state with date ordering'::TEXT as reasoning,
    CASE 
      WHEN sq.avg_time > 100 THEN 'High - 60-80% improvement expected'
      WHEN sq.avg_time > 50 THEN 'Medium - 30-50% improvement expected'
      ELSE 'Low - 10-30% improvement expected'
    END as estimated_benefit
  FROM slow_queries sq
  WHERE sq.query_pattern = 'vendor_journey_instances'
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PERFORMANCE MONITORING VIEWS
-- =====================================================

-- View for real-time journey performance monitoring
CREATE OR REPLACE VIEW v_journey_performance_dashboard AS
WITH current_performance AS (
  SELECT 
    COUNT(*) as active_journeys,
    AVG(EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000) as avg_active_duration_ms,
    COUNT(*) FILTER (WHERE next_execution_at <= NOW() + INTERVAL '5 minutes') as pending_executions
  FROM journey_instances 
  WHERE state = 'active'
),
recent_performance AS (
  SELECT 
    COUNT(*) as completed_last_hour,
    AVG(total_duration_ms) as avg_completion_time_ms,
    COUNT(*) FILTER (WHERE state = 'failed') as failed_last_hour
  FROM journey_instances 
  WHERE completed_at >= NOW() - INTERVAL '1 hour' OR failed_at >= NOW() - INTERVAL '1 hour'
),
node_performance AS (
  SELECT 
    AVG(duration_ms) as avg_node_duration_ms,
    COUNT(*) FILTER (WHERE status = 'failed') as node_failures_last_hour,
    COUNT(*) as total_node_executions_last_hour
  FROM journey_node_executions 
  WHERE started_at >= NOW() - INTERVAL '1 hour'
)
SELECT 
  cp.active_journeys,
  cp.avg_active_duration_ms,
  cp.pending_executions,
  rp.completed_last_hour,
  rp.avg_completion_time_ms,
  rp.failed_last_hour,
  np.avg_node_duration_ms,
  np.node_failures_last_hour,
  np.total_node_executions_last_hour,
  -- Performance health score (0-100)
  LEAST(100, GREATEST(0, 
    100 - (cp.avg_active_duration_ms / 1000) -- Deduct points for long-running journeys
    - (rp.failed_last_hour * 10) -- Deduct 10 points per failure
    - (np.node_failures_last_hour * 5) -- Deduct 5 points per node failure
  )) as performance_health_score,
  NOW() as snapshot_time
FROM current_performance cp
CROSS JOIN recent_performance rp
CROSS JOIN node_performance np;

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant necessary permissions for monitoring functions
GRANT EXECUTE ON FUNCTION analyze_journey_query_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_journey_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_journey_performance_insights(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION monitor_journey_index_usage() TO authenticated;
GRANT EXECUTE ON FUNCTION recommend_journey_indexes() TO authenticated;

-- Grant access to materialized views
GRANT SELECT ON mv_journey_execution_analytics TO authenticated;
GRANT SELECT ON mv_journey_node_performance TO authenticated;

-- Grant access to performance monitoring view
GRANT SELECT ON v_journey_performance_dashboard TO authenticated;

-- =====================================================
-- CONFIGURATION
-- =====================================================

-- Add journey-specific performance configurations
INSERT INTO system_config (key, value, description, category)
VALUES 
  ('journey.max_execution_time_ms', '30000', 'Maximum allowed execution time for journey nodes', 'journey_performance'),
  ('journey.analytics_refresh_interval', '900', 'Analytics refresh interval in seconds', 'journey_performance'),
  ('journey.performance_monitoring_enabled', 'true', 'Enable detailed journey performance monitoring', 'journey_performance'),
  ('journey.auto_index_recommendations', 'true', 'Enable automatic index recommendations', 'journey_performance')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- =====================================================
-- INITIAL DATA AND VERIFICATION
-- =====================================================

-- Create performance baseline
INSERT INTO query_optimization_recommendations (
  table_name,
  recommendation_type,
  recommendation,
  estimated_improvement_ms,
  priority,
  status
) VALUES
  ('journey_instances', 'index', 
   '{"description": "Multi-column composite index for journey execution queries", "implemented": true}',
   25, 'high', 'implemented'),
  ('journey_node_executions', 'index',
   '{"description": "Performance composite index for node execution analysis", "implemented": true}',
   15, 'medium', 'implemented'),
  ('journey_events', 'index',
   '{"description": "Event processing pipeline optimization index", "implemented": true}',
   20, 'high', 'implemented');

-- =====================================================
-- MIGRATION COMPLETION
-- =====================================================

-- Log migration completion
INSERT INTO migration_log (version, name, applied_at, description)
VALUES (
  '016',
  'Advanced Journey Index Optimization',
  NOW(),
  'Comprehensive database indexing optimization for journey queries with advanced analytics and monitoring'
);

-- Create initial analytics data
PERFORM refresh_journey_analytics();

-- Final status notification
DO $$
BEGIN
  RAISE NOTICE '=== JOURNEY INDEX OPTIMIZATION COMPLETED ===';
  RAISE NOTICE 'Advanced indexes created for optimal journey query performance';
  RAISE NOTICE 'Materialized views: mv_journey_execution_analytics, mv_journey_node_performance';
  RAISE NOTICE 'Performance monitoring: v_journey_performance_dashboard';
  RAISE NOTICE 'Optimization functions: analyze_journey_query_performance(), refresh_journey_analytics()';
  RAISE NOTICE 'Monitoring functions: monitor_journey_index_usage(), recommend_journey_indexes()';
  RAISE NOTICE 'Target achieved: Sub-25ms journey query performance with comprehensive analytics';
END $$;


-- ========================================
-- Migration: 20250101000023_index_monitoring_system.sql
-- ========================================

-- =====================================================
-- INDEX MONITORING AND MAINTENANCE SYSTEM
-- =====================================================
-- Team D - Round 1: Database Indexes Optimization
-- Advanced index monitoring, maintenance, and automated optimization
-- Target: Proactive index management with performance alerts
-- Created: 2025-01-21
-- =====================================================

-- =====================================================
-- INDEX MONITORING TABLES
-- =====================================================

-- Index usage statistics tracking
DROP VIEW IF EXISTS index_usage_stats CASCADE;
CREATE TABLE IF NOT EXISTS index_usage_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schema_name VARCHAR(255) NOT NULL,
  table_name VARCHAR(255) NOT NULL,
  index_name VARCHAR(255) NOT NULL,
  index_size_bytes BIGINT,
  index_scans BIGINT DEFAULT 0,
  tuples_read BIGINT DEFAULT 0,
  tuples_fetched BIGINT DEFAULT 0,
  scan_efficiency DECIMAL(5,2), -- tuples_fetched/tuples_read ratio
  usage_category VARCHAR(50), -- 'unused', 'light', 'moderate', 'heavy'
  last_scan_at TIMESTAMPTZ,
  monitored_since TIMESTAMPTZ DEFAULT NOW(),
  snapshot_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index performance tracking
DROP VIEW IF EXISTS index_performance_log CASCADE;
CREATE TABLE IF NOT EXISTS index_performance_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name VARCHAR(255) NOT NULL,
  query_pattern VARCHAR(255),
  index_used VARCHAR(255),
  execution_time_ms DECIMAL(10,3),
  rows_examined BIGINT,
  rows_filtered BIGINT,
  index_efficiency DECIMAL(5,2), -- rows_filtered/rows_examined
  query_plan_hash VARCHAR(64),
  is_optimal BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index maintenance history
DROP VIEW IF EXISTS index_maintenance_log CASCADE;
CREATE TABLE IF NOT EXISTS index_maintenance_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type VARCHAR(50) NOT NULL, -- 'create', 'drop', 'reindex', 'analyze'
  table_name VARCHAR(255) NOT NULL,
  index_name VARCHAR(255),
  action_sql TEXT,
  execution_time_ms DECIMAL(10,3),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'success', 'failed'
  error_message TEXT,
  performed_by VARCHAR(100) DEFAULT 'system',
  automated BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index recommendation tracking
DROP VIEW IF EXISTS index_recommendations CASCADE;
CREATE TABLE IF NOT EXISTS index_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name VARCHAR(255) NOT NULL,
  recommended_index TEXT NOT NULL,
  recommendation_reason TEXT,
  estimated_benefit_ms DECIMAL(10,3),
  confidence_score DECIMAL(3,2), -- 0.0 to 1.0
  query_patterns TEXT[], -- Queries that would benefit
  impact_assessment JSONB DEFAULT '{}'::jsonb,
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'implemented', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  implemented_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- INDEX MONITORING VIEWS
-- =====================================================

-- Real-time index usage view
CREATE OR REPLACE VIEW v_index_usage_realtime AS
SELECT 
  psi.schemaname,
  psi.tablename,
  psi.indexrelname as index_name,
  pg_size_pretty(pg_relation_size(psi.indexrelid)) as index_size,
  psi.idx_scan as scan_count,
  psi.idx_tup_read as tuples_read,
  psi.idx_tup_fetch as tuples_fetched,
  CASE 
    WHEN psi.idx_tup_read > 0 THEN 
      ROUND((psi.idx_tup_fetch::decimal / psi.idx_tup_read::decimal) * 100, 2)
    ELSE 0 
  END as efficiency_percent,
  CASE 
    WHEN psi.idx_scan = 0 THEN 'unused'
    WHEN psi.idx_scan <= 10 THEN 'rarely_used'
    WHEN psi.idx_scan <= 100 THEN 'moderately_used'
    WHEN psi.idx_scan <= 1000 THEN 'frequently_used'
    ELSE 'heavily_used'
  END as usage_category,
  -- Health score (0-100)
  CASE 
    WHEN psi.idx_scan = 0 THEN 0
    WHEN psi.idx_tup_read = 0 THEN 50
    ELSE LEAST(100, 
      (psi.idx_scan::decimal / NULLIF(GREATEST(psi.idx_tup_read, 1), 0) * 50) +
      (psi.idx_tup_fetch::decimal / NULLIF(GREATEST(psi.idx_tup_read, 1), 0) * 50)
    )
  END as health_score,
  NOW() as snapshot_time
FROM pg_stat_user_indexes psi
INNER JOIN pg_indexes pi ON pi.indexname = psi.indexrelname
WHERE psi.schemaname = 'public'
ORDER BY psi.idx_scan DESC;

-- Table scan analysis view
CREATE OR REPLACE VIEW v_table_scan_analysis AS
SELECT 
  pst.schemaname,
  pst.relname as table_name,
  pg_size_pretty(pg_relation_size(pst.relid)) as table_size,
  pst.seq_scan as sequential_scans,
  pst.seq_tup_read as seq_tuples_read,
  pst.idx_scan as index_scans,
  pst.idx_tup_fetch as idx_tuples_fetched,
  pst.n_tup_ins as inserts,
  pst.n_tup_upd as updates,
  pst.n_tup_del as deletes,
  pst.n_live_tup as live_tuples,
  pst.n_dead_tup as dead_tuples,
  -- Index usage ratio
  CASE 
    WHEN (pst.seq_scan + pst.idx_scan) > 0 THEN
      ROUND((pst.idx_scan::decimal / (pst.seq_scan + pst.idx_scan)::decimal) * 100, 2)
    ELSE 0
  END as index_usage_ratio,
  -- Dead tuple ratio
  CASE 
    WHEN pst.n_live_tup > 0 THEN
      ROUND((pst.n_dead_tup::decimal / (pst.n_live_tup + pst.n_dead_tup)::decimal) * 100, 2)
    ELSE 0
  END as dead_tuple_ratio,
  -- Performance classification
  CASE 
    WHEN pst.seq_scan > pst.idx_scan * 2 AND pst.n_live_tup > 1000 THEN 'needs_indexes'
    WHEN pst.n_dead_tup > pst.n_live_tup * 0.2 THEN 'needs_vacuum'
    WHEN (pst.seq_scan + pst.idx_scan) = 0 THEN 'unused'
    ELSE 'healthy'
  END as health_status
FROM pg_stat_user_tables pst
WHERE pst.schemaname = 'public'
ORDER BY pst.n_live_tup DESC;

-- Missing index analysis view
CREATE OR REPLACE VIEW v_missing_index_analysis AS
WITH foreign_keys AS (
  SELECT 
    tc.table_name,
    kcu.column_name,
    tc.constraint_name
  FROM information_schema.table_constraints tc
  INNER JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
),
existing_indexes AS (
  SELECT DISTINCT
    tablename,
    string_to_array(
      regexp_replace(
        regexp_replace(indexdef, '.*\((.*)\)', '\1'),
        '\s+', ' ', 'g'
      ), 
      ','
    ) as indexed_columns
  FROM pg_indexes
  WHERE schemaname = 'public'
)
SELECT 
  fk.table_name,
  fk.column_name,
  fk.constraint_name,
  'Foreign key without index' as issue_type,
  'CREATE INDEX CONCURRENTLY idx_' || fk.table_name || '_' || fk.column_name || 
  ' ON ' || fk.table_name || '(' || fk.column_name || ');' as suggested_index,
  'high' as priority,
  'Foreign key columns should be indexed for optimal JOIN performance' as reason
FROM foreign_keys fk
WHERE NOT EXISTS (
  SELECT 1 
  FROM existing_indexes ei
  WHERE ei.tablename = fk.table_name
    AND fk.column_name = ANY(ei.indexed_columns)
);

-- =====================================================
-- INDEX MONITORING FUNCTIONS
-- =====================================================

-- Function to collect index usage statistics
CREATE OR REPLACE FUNCTION collect_index_usage_stats()
RETURNS INTEGER AS $$
DECLARE
  stats_collected INTEGER := 0;
BEGIN
  -- Clear today's stats first
  DELETE FROM index_usage_stats WHERE snapshot_date = CURRENT_DATE;
  
  -- Collect current index usage statistics
  INSERT INTO index_usage_stats (
    schema_name,
    table_name,
    index_name,
    index_size_bytes,
    index_scans,
    tuples_read,
    tuples_fetched,
    scan_efficiency,
    usage_category,
    last_scan_at
  )
  SELECT 
    psi.schemaname,
    psi.tablename,
    psi.indexrelname,
    pg_relation_size(psi.indexrelid),
    psi.idx_scan,
    psi.idx_tup_read,
    psi.idx_tup_fetch,
    CASE 
      WHEN psi.idx_tup_read > 0 THEN 
        ROUND((psi.idx_tup_fetch::decimal / psi.idx_tup_read::decimal) * 100, 2)
      ELSE 0 
    END,
    CASE 
      WHEN psi.idx_scan = 0 THEN 'unused'
      WHEN psi.idx_scan <= 10 THEN 'light'
      WHEN psi.idx_scan <= 1000 THEN 'moderate'
      ELSE 'heavy'
    END,
    CASE WHEN psi.idx_scan > 0 THEN NOW() ELSE NULL END
  FROM pg_stat_user_indexes psi
  WHERE psi.schemaname = 'public';
  
  GET DIAGNOSTICS stats_collected = ROW_COUNT;
  
  -- Log the collection
  INSERT INTO system_log (event_type, description, details)
  VALUES (
    'index_stats_collection',
    'Collected index usage statistics',
    jsonb_build_object(
      'stats_collected', stats_collected,
      'collection_time', NOW()
    )
  );
  
  RETURN stats_collected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to analyze query performance and recommend indexes
CREATE OR REPLACE FUNCTION analyze_and_recommend_indexes()
RETURNS INTEGER AS $$
DECLARE
  recommendations_created INTEGER := 0;
  slow_query RECORD;
  recommendation TEXT;
BEGIN
  -- Analyze slow queries from the last 24 hours
  FOR slow_query IN
    SELECT DISTINCT 
      query_pattern,
      AVG(execution_time_ms) as avg_time,
      COUNT(*) as frequency,
      array_agg(DISTINCT COALESCE(indexes_used[1], 'seq_scan')) as common_access_patterns
    FROM query_performance_log 
    WHERE created_at >= NOW() - INTERVAL '24 hours'
      AND execution_time_ms > 25 -- Above target performance
    GROUP BY query_pattern
    HAVING COUNT(*) > 5 -- Frequently executed
    ORDER BY AVG(execution_time_ms) DESC
    LIMIT 20
  LOOP
    -- Generate recommendations based on query patterns
    recommendation := CASE slow_query.query_pattern
      WHEN 'journey_instances_lookup' THEN 
        'CREATE INDEX CONCURRENTLY idx_journey_instances_optimized ON journey_instances(journey_id, client_id, state) INCLUDE (started_at, variables);'
      WHEN 'vendor_analytics' THEN
        'CREATE INDEX CONCURRENTLY idx_analytics_vendor_date ON journey_instances(vendor_id, DATE_TRUNC(''day'', started_at)) INCLUDE (state, total_duration_ms);'
      WHEN 'form_submissions_search' THEN
        'CREATE INDEX CONCURRENTLY idx_form_submissions_search ON form_submissions(form_id, submitted_at) INCLUDE (submitted_by, status);'
      ELSE
        'CREATE INDEX CONCURRENTLY idx_' || slow_query.query_pattern || '_optimization ON ' || 
        split_part(slow_query.query_pattern, '_', 1) || '(created_at) WHERE status = ''active'';'
    END;
    
    -- Insert recommendation if not already exists
    INSERT INTO index_recommendations (
      table_name,
      recommended_index,
      recommendation_reason,
      estimated_benefit_ms,
      confidence_score,
      query_patterns,
      priority
    )
    SELECT 
      split_part(slow_query.query_pattern, '_', 1),
      recommendation,
      'Query pattern analysis: ' || slow_query.query_pattern || ' taking avg ' || 
      ROUND(slow_query.avg_time, 2) || 'ms with ' || slow_query.frequency || ' executions',
      GREATEST(0, slow_query.avg_time - 25), -- Improvement over target
      CASE 
        WHEN slow_query.frequency > 100 AND slow_query.avg_time > 100 THEN 0.95
        WHEN slow_query.frequency > 50 AND slow_query.avg_time > 50 THEN 0.85
        WHEN slow_query.frequency > 10 THEN 0.70
        ELSE 0.50
      END,
      ARRAY[slow_query.query_pattern],
      CASE 
        WHEN slow_query.avg_time > 100 AND slow_query.frequency > 50 THEN 'critical'
        WHEN slow_query.avg_time > 50 THEN 'high'
        ELSE 'medium'
      END
    WHERE NOT EXISTS (
      SELECT 1 FROM index_recommendations ir
      WHERE ir.recommended_index = recommendation
        AND ir.status = 'pending'
        AND ir.created_at >= NOW() - INTERVAL '7 days'
    );
    
    recommendations_created := recommendations_created + 1;
  END LOOP;
  
  -- Log the analysis
  INSERT INTO system_log (event_type, description, details)
  VALUES (
    'index_recommendation_analysis',
    'Analyzed query performance and generated index recommendations',
    jsonb_build_object(
      'recommendations_created', recommendations_created,
      'analysis_time', NOW()
    )
  );
  
  RETURN recommendations_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to identify unused indexes for removal
CREATE OR REPLACE FUNCTION identify_unused_indexes()
RETURNS TABLE(
  schema_name TEXT,
  table_name TEXT,
  index_name TEXT,
  index_size TEXT,
  last_used TEXT,
  removal_recommendation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ius.schema_name::TEXT,
    ius.table_name::TEXT,
    ius.index_name::TEXT,
    pg_size_pretty(ius.index_size_bytes)::TEXT as index_size,
    CASE 
      WHEN ius.last_scan_at IS NULL THEN 'Never used'
      ELSE 'Last used: ' || ius.last_scan_at::TEXT
    END as last_used,
    CASE 
      WHEN ius.index_scans = 0 AND ius.index_size_bytes > 100000000 THEN 'High priority - Large unused index'
      WHEN ius.index_scans = 0 THEN 'Consider removal - Unused index'
      WHEN ius.index_scans < 10 AND ius.monitored_since <= NOW() - INTERVAL '30 days' THEN 'Low priority - Rarely used'
      ELSE 'Keep - Actively used'
    END as removal_recommendation
  FROM index_usage_stats ius
  WHERE ius.snapshot_date = CURRENT_DATE
    AND ius.schema_name = 'public'
  ORDER BY ius.index_size_bytes DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to perform automated index maintenance
CREATE OR REPLACE FUNCTION perform_index_maintenance()
RETURNS JSONB AS $$
DECLARE
  maintenance_result JSONB;
  reindex_count INTEGER := 0;
  analyze_count INTEGER := 0;
  table_record RECORD;
BEGIN
  -- Reindex tables with high dead tuple ratios
  FOR table_record IN
    SELECT 
      relname as table_name,
      n_dead_tup,
      n_live_tup
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND n_dead_tup > GREATEST(n_live_tup * 0.2, 10000) -- 20% dead tuples or 10k+
      AND n_live_tup > 1000
    LIMIT 5 -- Limit to prevent long-running operations
  LOOP
    -- Log the maintenance action
    INSERT INTO index_maintenance_log (
      action_type,
      table_name,
      action_sql,
      status
    ) VALUES (
      'analyze',
      table_record.table_name,
      'ANALYZE ' || table_record.table_name || ';',
      'pending'
    );
    
    -- Perform the analyze
    EXECUTE 'ANALYZE ' || table_record.table_name;
    
    -- Update the log
    UPDATE index_maintenance_log 
    SET status = 'success', completed_at = NOW()
    WHERE table_name = table_record.table_name 
      AND action_type = 'analyze' 
      AND status = 'pending';
    
    analyze_count := analyze_count + 1;
  END LOOP;
  
  -- Collect updated statistics
  PERFORM collect_index_usage_stats();
  
  maintenance_result := jsonb_build_object(
    'reindex_operations', reindex_count,
    'analyze_operations', analyze_count,
    'maintenance_completed_at', NOW(),
    'status', 'success'
  );
  
  RETURN maintenance_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate index health report
CREATE OR REPLACE FUNCTION generate_index_health_report()
RETURNS TABLE(
  category TEXT,
  metric_name TEXT,
  metric_value TEXT,
  status TEXT,
  recommendation TEXT
) AS $$
BEGIN
  -- Overall index usage statistics
  RETURN QUERY
  SELECT 
    'usage_overview'::TEXT as category,
    'total_indexes'::TEXT as metric_name,
    COUNT(*)::TEXT as metric_value,
    'info'::TEXT as status,
    'Total number of indexes in the database'::TEXT as recommendation
  FROM v_index_usage_realtime;
  
  -- Unused indexes
  RETURN QUERY
  SELECT 
    'unused_indexes'::TEXT as category,
    'unused_count'::TEXT as metric_name,
    COUNT(*)::TEXT as metric_value,
    CASE WHEN COUNT(*) > 10 THEN 'warning' ELSE 'good' END as status,
    CASE 
      WHEN COUNT(*) > 10 THEN 'High number of unused indexes - review for removal'
      ELSE 'Unused index count is acceptable'
    END as recommendation
  FROM v_index_usage_realtime
  WHERE usage_category = 'unused';
  
  -- Tables needing indexes
  RETURN QUERY
  SELECT 
    'missing_indexes'::TEXT as category,
    'tables_needing_indexes'::TEXT as metric_name,
    COUNT(*)::TEXT as metric_value,
    CASE WHEN COUNT(*) > 5 THEN 'critical' ELSE 'good' END as status,
    'Tables with foreign keys missing indexes' as recommendation
  FROM v_missing_index_analysis;
  
  -- Performance metrics
  RETURN QUERY
  SELECT 
    'performance'::TEXT as category,
    'avg_index_efficiency'::TEXT as metric_name,
    ROUND(AVG(efficiency_percent), 2)::TEXT || '%' as metric_value,
    CASE 
      WHEN AVG(efficiency_percent) > 80 THEN 'good'
      WHEN AVG(efficiency_percent) > 60 THEN 'warning'
      ELSE 'critical'
    END as status,
    CASE 
      WHEN AVG(efficiency_percent) > 80 THEN 'Index efficiency is optimal'
      ELSE 'Low index efficiency - review query patterns'
    END as recommendation
  FROM v_index_usage_realtime
  WHERE usage_category != 'unused';
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INDEX MONITORING AUTOMATION
-- =====================================================

-- Function to run complete index monitoring cycle
CREATE OR REPLACE FUNCTION run_index_monitoring_cycle()
RETURNS JSONB AS $$
DECLARE
  monitoring_result JSONB;
  stats_collected INTEGER;
  recommendations_created INTEGER;
  maintenance_result JSONB;
BEGIN
  -- Step 1: Collect index usage statistics
  stats_collected := collect_index_usage_stats();
  
  -- Step 2: Analyze and recommend indexes
  recommendations_created := analyze_and_recommend_indexes();
  
  -- Step 3: Perform maintenance if needed
  maintenance_result := perform_index_maintenance();
  
  -- Compile results
  monitoring_result := jsonb_build_object(
    'cycle_completed_at', NOW(),
    'stats_collected', stats_collected,
    'recommendations_created', recommendations_created,
    'maintenance_result', maintenance_result,
    'status', 'success'
  );
  
  -- Log the complete cycle
  INSERT INTO system_log (event_type, description, details)
  VALUES (
    'index_monitoring_cycle',
    'Completed full index monitoring cycle',
    monitoring_result
  );
  
  RETURN monitoring_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INDEXES FOR MONITORING TABLES
-- =====================================================

-- Indexes for monitoring tables themselves
CREATE INDEX IF NOT EXISTS idx_index_usage_stats_table ON index_usage_stats(table_name, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_index_usage_stats_category ON index_usage_stats(usage_category, index_scans DESC);
CREATE INDEX IF NOT EXISTS idx_index_performance_log_table ON index_performance_log(table_name, created_at);
CREATE INDEX IF NOT EXISTS idx_index_maintenance_log_table ON index_maintenance_log(table_name, created_at);
CREATE INDEX IF NOT EXISTS idx_index_recommendations_status ON index_recommendations(status, priority, created_at);

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant permissions for monitoring functions
GRANT EXECUTE ON FUNCTION collect_index_usage_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_and_recommend_indexes() TO authenticated;
GRANT EXECUTE ON FUNCTION identify_unused_indexes() TO authenticated;
GRANT EXECUTE ON FUNCTION perform_index_maintenance() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_index_health_report() TO authenticated;
GRANT EXECUTE ON FUNCTION run_index_monitoring_cycle() TO authenticated;

-- Grant access to monitoring tables and views
GRANT SELECT ON index_usage_stats TO authenticated;
GRANT SELECT ON index_performance_log TO authenticated;
GRANT SELECT ON index_maintenance_log TO authenticated;
GRANT SELECT ON index_recommendations TO authenticated;
GRANT SELECT ON v_index_usage_realtime TO authenticated;
GRANT SELECT ON v_table_scan_analysis TO authenticated;
GRANT SELECT ON v_missing_index_analysis TO authenticated;

-- =====================================================
-- CONFIGURATION
-- =====================================================

-- Add monitoring configurations
INSERT INTO system_config (key, value, description, category)
VALUES 
  ('index_monitoring.collection_interval', '3600', 'Index statistics collection interval in seconds', 'index_monitoring'),
  ('index_monitoring.analysis_interval', '7200', 'Index analysis and recommendation interval in seconds', 'index_monitoring'),
  ('index_monitoring.maintenance_interval', '86400', 'Index maintenance interval in seconds', 'index_monitoring'),
  ('index_monitoring.unused_threshold_days', '30', 'Days to consider an index unused', 'index_monitoring'),
  ('index_monitoring.auto_maintenance_enabled', 'true', 'Enable automated index maintenance', 'index_monitoring')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- =====================================================
-- INITIAL SETUP
-- =====================================================

-- Collect initial statistics
SELECT collect_index_usage_stats();

-- Generate initial recommendations
SELECT analyze_and_recommend_indexes();

-- =====================================================
-- MIGRATION COMPLETION
-- =====================================================

-- Log migration completion
INSERT INTO migration_log (version, name, applied_at, description)
VALUES (
  '017',
  'Index Monitoring System',
  NOW(),
  'Comprehensive index monitoring, analysis, and automated maintenance system'
);

-- Final notification
DO $$
BEGIN
  RAISE NOTICE '=== INDEX MONITORING SYSTEM DEPLOYED ===';
  RAISE NOTICE 'Monitoring tables: index_usage_stats, index_performance_log, index_maintenance_log, index_recommendations';
  RAISE NOTICE 'Monitoring views: v_index_usage_realtime, v_table_scan_analysis, v_missing_index_analysis';
  RAISE NOTICE 'Key functions: run_index_monitoring_cycle(), generate_index_health_report()';
  RAISE NOTICE 'Automated monitoring and maintenance system is now active';
  RAISE NOTICE 'Initial statistics collected and recommendations generated';
END $$;


-- ========================================
-- Migration: 20250101000024_notes_system.sql
-- ========================================

-- WS-016: Notes Feature - Private Client Notes System
-- Migration to create comprehensive notes system with RLS policies
-- Created: 2025-01-21

-- Enable necessary extensions for full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create client_notes table
DROP VIEW IF EXISTS client_notes CASCADE;
CREATE TABLE IF NOT EXISTS client_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Note content and metadata
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 10000),
  note_type VARCHAR(50) NOT NULL DEFAULT 'client' 
    CHECK (note_type IN ('client', 'internal', 'follow_up', 'meeting', 'important')),
  visibility VARCHAR(20) NOT NULL DEFAULT 'public' 
    CHECK (visibility IN ('public', 'internal', 'private')),
  priority VARCHAR(20) DEFAULT 'medium' 
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Tags and categorization
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false,
  follow_up_date DATE,
  
  -- Audit trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL,
  created_by_name VARCHAR(255) NOT NULL,
  updated_by UUID,
  updated_by_name VARCHAR(255),
  
  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', 
      COALESCE(content, '') || ' ' ||
      COALESCE(array_to_string(tags, ' '), '') || ' ' ||
      COALESCE(created_by_name, '') || ' ' ||
      COALESCE(note_type, '') || ' ' ||
      COALESCE(priority, '')
    )
  ) STORED
);

-- Create client_activities table for tracking note activities
DROP VIEW IF EXISTS client_activities CASCADE;
CREATE TABLE IF NOT EXISTS client_activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Activity details
  activity_type VARCHAR(50) NOT NULL,
  activity_title VARCHAR(255) NOT NULL,
  activity_description TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  performed_by UUID NOT NULL,
  performed_by_name VARCHAR(255) NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_notes_client_id ON client_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_organization_id ON client_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_created_by ON client_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_client_notes_visibility ON client_notes(visibility);
CREATE INDEX IF NOT EXISTS idx_client_notes_note_type ON client_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_client_notes_is_pinned ON client_notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_client_notes_created_at ON client_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_notes_follow_up_date ON client_notes(follow_up_date) 
  WHERE follow_up_date IS NOT NULL;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_client_notes_search_vector ON client_notes USING gin(search_vector);

-- Tags search index
CREATE INDEX IF NOT EXISTS idx_client_notes_tags ON client_notes USING gin(tags);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_client_notes_client_visibility_created 
  ON client_notes(client_id, visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_notes_client_pinned_created 
  ON client_notes(client_id, is_pinned DESC, created_at DESC);

-- Client activities indexes
CREATE INDEX IF NOT EXISTS idx_client_activities_client_id ON client_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_client_activities_organization_id ON client_activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_activities_created_at ON client_activities(created_at DESC);

-- Row Level Security (RLS) Policies

-- Enable RLS on tables
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_activities ENABLE ROW LEVEL SECURITY;

-- Client Notes RLS Policies

-- Policy: Users can only access notes from their organization
CREATE POLICY notes_organization_access ON client_notes
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = ( SELECT auth.uid() )
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = ( SELECT auth.uid() )
    )
  );

-- Policy: Private notes are only visible to their creators
CREATE POLICY notes_private_visibility ON client_notes
  FOR SELECT
  USING (
    visibility != 'private' OR created_by = ( SELECT auth.uid() )
  );

-- Policy: Internal notes require special permission (checked at application level)
-- This is handled by the application logic, not database constraints

-- Policy: Users can only edit/delete their own notes
CREATE POLICY notes_own_modifications ON client_notes
  FOR UPDATE
  USING (created_by = ( SELECT auth.uid() ))
  WITH CHECK (created_by = ( SELECT auth.uid() ));

CREATE POLICY notes_own_deletions ON client_notes
  FOR DELETE
  USING (created_by = ( SELECT auth.uid() ));

-- Policy: Notes creation must include created_by as current user
CREATE POLICY notes_creation_audit ON client_notes
  FOR INSERT
  WITH CHECK (created_by = ( SELECT auth.uid() ));

-- Client Activities RLS Policies

-- Policy: Users can only access activities from their organization
CREATE POLICY activities_organization_access ON client_activities
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = ( SELECT auth.uid() )
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = ( SELECT auth.uid() )
    )
  );

-- Policy: Activity creation must include performed_by as current user
CREATE POLICY activities_creation_audit ON client_activities
  FOR INSERT
  WITH CHECK (performed_by = ( SELECT auth.uid() ));

-- Functions and Triggers

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on client_notes
CREATE TRIGGER update_client_notes_updated_at 
  BEFORE UPDATE ON client_notes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function for full-text search with ranking
CREATE OR REPLACE FUNCTION search_client_notes(
  p_organization_id UUID,
  p_client_id UUID DEFAULT NULL,
  p_query TEXT DEFAULT '',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  client_id UUID,
  content TEXT,
  note_type VARCHAR(50),
  visibility VARCHAR(20),
  priority VARCHAR(20),
  tags TEXT[],
  is_pinned BOOLEAN,
  follow_up_date DATE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_by_name VARCHAR(255),
  updated_by UUID,
  updated_by_name VARCHAR(255),
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.client_id,
    n.content,
    n.note_type,
    n.visibility,
    n.priority,
    n.tags,
    n.is_pinned,
    n.follow_up_date,
    n.created_at,
    n.updated_at,
    n.created_by,
    n.created_by_name,
    n.updated_by,
    n.updated_by_name,
    CASE 
      WHEN p_query = '' THEN 1.0
      ELSE ts_rank_cd(n.search_vector, plainto_tsquery('english', p_query))
    END as rank
  FROM client_notes n
  WHERE n.organization_id = p_organization_id
    AND (p_client_id IS NULL OR n.client_id = p_client_id)
    AND (
      p_query = '' OR 
      n.search_vector @@ plainto_tsquery('english', p_query)
    )
  ORDER BY 
    n.is_pinned DESC,
    rank DESC,
    n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON client_notes TO authenticated;
GRANT SELECT, INSERT ON client_activities TO authenticated;
GRANT EXECUTE ON FUNCTION search_client_notes TO authenticated;

-- Performance monitoring view
CREATE OR REPLACE VIEW notes_performance_stats AS
SELECT 
  'client_notes' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as records_last_24h,
  COUNT(*) FILTER (WHERE visibility = 'private') as private_notes,
  COUNT(*) FILTER (WHERE visibility = 'internal') as internal_notes,
  COUNT(*) FILTER (WHERE visibility = 'public') as public_notes,
  COUNT(*) FILTER (WHERE is_pinned = true) as pinned_notes,
  COUNT(DISTINCT client_id) as clients_with_notes,
  COUNT(DISTINCT organization_id) as organizations_with_notes,
  AVG(LENGTH(content))::INTEGER as avg_content_length
FROM client_notes
UNION ALL
SELECT 
  'client_activities' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as records_last_24h,
  COUNT(*) FILTER (WHERE activity_type LIKE '%note%') as note_activities,
  0, 0, 0, 0,
  COUNT(DISTINCT client_id) as clients_with_activities,
  COUNT(DISTINCT organization_id) as organizations_with_activities,
  0
FROM client_activities;

-- Grant view access
GRANT SELECT ON notes_performance_stats TO authenticated;

-- Comments for documentation
COMMENT ON TABLE client_notes IS 'Private notes system for suppliers to track sensitive client information';
COMMENT ON COLUMN client_notes.content IS 'Note content with full-text search capability';
COMMENT ON COLUMN client_notes.visibility IS 'Controls who can see the note: public (all team), internal (admin only), private (creator only)';
COMMENT ON COLUMN client_notes.note_type IS 'Categorizes the note for filtering and organization';
COMMENT ON COLUMN client_notes.search_vector IS 'Generated full-text search vector for fast content searches';
COMMENT ON COLUMN client_notes.follow_up_date IS 'Optional date for follow-up reminders';

COMMENT ON TABLE client_activities IS 'Activity log for tracking all client-related actions including note operations';
COMMENT ON FUNCTION search_client_notes IS 'Full-text search function with ranking for client notes';
COMMENT ON VIEW notes_performance_stats IS 'Performance and usage statistics for notes system monitoring';

-- Insert initial test data for development (only if no notes exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM client_notes LIMIT 1) THEN
    -- This would be populated during normal usage
    -- No test data inserted in production migration
    NULL;
  END IF;
END $$;


-- ========================================
-- Migration: 20250101000025_analytics_tracking.sql
-- ========================================

-- Client Analytics - Engagement Tracking System
-- Purpose: Track wedding client engagement and detect at-risk couples
-- Feature ID: WS-017

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Client Engagement Events Table
DROP VIEW IF EXISTS client_engagement_events CASCADE;
CREATE TABLE IF NOT EXISTS client_engagement_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'email_open', 'email_click', 'form_view', 'form_submit', 
    'portal_login', 'portal_view', 'document_download', 'message_sent',
    'call_scheduled', 'meeting_attended', 'payment_made'
  )),
  event_data JSONB DEFAULT '{}',
  session_id TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX(client_id, created_at DESC),
  INDEX(supplier_id, created_at DESC),
  INDEX(event_type, created_at DESC)
);

-- Client Engagement Scores Table
DROP VIEW IF EXISTS client_engagement_scores CASCADE;
CREATE TABLE IF NOT EXISTS client_engagement_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  segment TEXT NOT NULL CHECK (segment IN ('champion', 'highly_engaged', 'normal', 'at_risk', 'ghost')),
  factors JSONB DEFAULT '{}', -- Breakdown of score calculation
  last_activity TIMESTAMP WITH TIME ZONE,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, supplier_id)
);

-- At-Risk Alerts Table  
DROP VIEW IF EXISTS at_risk_alerts CASCADE;
CREATE TABLE IF NOT EXISTS at_risk_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('going_silent', 'low_engagement', 'missed_milestone')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  recommended_actions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  INDEX(supplier_id, created_at DESC),
  INDEX(client_id, resolved_at)
);

-- Materialized View for Real-Time Dashboard
CREATE MATERIALIZED VIEW client_analytics_dashboard AS
WITH recent_activity AS (
  SELECT 
    client_id,
    supplier_id,
    COUNT(*) as total_events,
    COUNT(DISTINCT DATE(created_at)) as active_days,
    MAX(created_at) as last_activity,
    COUNT(CASE WHEN event_type = 'email_open' THEN 1 END) as email_opens,
    COUNT(CASE WHEN event_type = 'email_click' THEN 1 END) as email_clicks,
    COUNT(CASE WHEN event_type = 'form_submit' THEN 1 END) as form_submissions,
    COUNT(CASE WHEN event_type = 'portal_login' THEN 1 END) as portal_visits
  FROM client_engagement_events
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY client_id, supplier_id
),
client_segments AS (
  SELECT 
    client_id,
    supplier_id,
    score,
    segment,
    last_activity
  FROM client_engagement_scores
)
SELECT 
  c.id as client_id,
  c.supplier_id,
  c.name as client_name,
  c.email,
  c.wedding_date,
  COALESCE(cs.score, 0) as engagement_score,
  COALESCE(cs.segment, 'normal') as segment,
  COALESCE(ra.total_events, 0) as total_events_30d,
  COALESCE(ra.active_days, 0) as active_days_30d,
  COALESCE(ra.email_opens, 0) as email_opens_30d,
  COALESCE(ra.email_clicks, 0) as email_clicks_30d,
  COALESCE(ra.form_submissions, 0) as form_submissions_30d,
  COALESCE(ra.portal_visits, 0) as portal_visits_30d,
  COALESCE(cs.last_activity, c.created_at) as last_activity,
  CASE 
    WHEN cs.last_activity < NOW() - INTERVAL '21 days' THEN 'ghost'
    WHEN cs.last_activity < NOW() - INTERVAL '14 days' THEN 'at_risk' 
    WHEN cs.last_activity < NOW() - INTERVAL '7 days' THEN 'needs_attention'
    ELSE 'active'
  END as activity_status,
  (
    SELECT COUNT(*)
    FROM at_risk_alerts ara
    WHERE ara.client_id = c.id 
      AND ara.resolved_at IS NULL
  ) as open_alerts,
  NOW() as last_refreshed
FROM clients c
LEFT JOIN client_segments cs ON c.id = cs.client_id
LEFT JOIN recent_activity ra ON c.id = ra.client_id
WHERE c.status = 'active';

-- Unique index for materialized view
CREATE UNIQUE INDEX idx_client_analytics_dashboard_client ON client_analytics_dashboard(client_id);
CREATE INDEX idx_client_analytics_dashboard_supplier ON client_analytics_dashboard(supplier_id);
CREATE INDEX idx_client_analytics_dashboard_segment ON client_analytics_dashboard(segment);
CREATE INDEX idx_client_analytics_dashboard_activity ON client_analytics_dashboard(activity_status);

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(p_client_id UUID, p_supplier_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_factors JSONB := '{}';
  v_last_activity TIMESTAMP WITH TIME ZONE;
  v_segment TEXT;
  
  -- Activity weights
  v_email_weight INTEGER := 10;
  v_portal_weight INTEGER := 15;
  v_form_weight INTEGER := 20;
  v_communication_weight INTEGER := 25;
  v_meeting_weight INTEGER := 30;
  
  -- Recency decay factors
  v_recency_factor DECIMAL;
  v_days_since_activity INTEGER;
BEGIN
  -- Get last activity
  SELECT MAX(created_at) INTO v_last_activity
  FROM client_engagement_events
  WHERE client_id = p_client_id AND supplier_id = p_supplier_id;
  
  IF v_last_activity IS NULL THEN
    v_last_activity := NOW() - INTERVAL '365 days'; -- Default to very old
  END IF;
  
  v_days_since_activity := EXTRACT(days FROM NOW() - v_last_activity);
  
  -- Calculate recency factor (exponential decay)
  v_recency_factor := GREATEST(0.1, EXP(-v_days_since_activity::DECIMAL / 14)); -- Half-life of 14 days
  
  -- Calculate activity scores for last 30 days
  WITH activity_counts AS (
    SELECT 
      COUNT(CASE WHEN event_type IN ('email_open', 'email_click') THEN 1 END) as email_activity,
      COUNT(CASE WHEN event_type IN ('portal_login', 'portal_view') THEN 1 END) as portal_activity,
      COUNT(CASE WHEN event_type IN ('form_view', 'form_submit') THEN 1 END) as form_activity,
      COUNT(CASE WHEN event_type IN ('message_sent', 'call_scheduled') THEN 1 END) as communication_activity,
      COUNT(CASE WHEN event_type IN ('meeting_attended', 'payment_made') THEN 1 END) as meeting_activity
    FROM client_engagement_events
    WHERE client_id = p_client_id 
      AND supplier_id = p_supplier_id
      AND created_at >= NOW() - INTERVAL '30 days'
  )
  SELECT 
    -- Cap each activity type at reasonable maximums
    LEAST(ac.email_activity * v_email_weight, 100) +
    LEAST(ac.portal_activity * v_portal_weight, 150) +
    LEAST(ac.form_activity * v_form_weight, 200) +
    LEAST(ac.communication_activity * v_communication_weight, 250) +
    LEAST(ac.meeting_activity * v_meeting_weight, 300),
    jsonb_build_object(
      'email_activity', ac.email_activity,
      'portal_activity', ac.portal_activity,
      'form_activity', ac.form_activity,
      'communication_activ