-- Dashboard Templates System Migration
-- WS-065 Team B Round 2 Implementation
-- Extends Round 1 booking system patterns for client dashboard customization

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Dashboard Template Categories
CREATE TYPE dashboard_template_category AS ENUM (
  'luxury', 
  'standard', 
  'budget', 
  'destination', 
  'traditional', 
  'modern',
  'venue_specific',
  'photographer',
  'planner',
  'caterer',
  'florist',
  'musician'
);

-- 2. Dashboard Section Types (Wedding-Specific)
CREATE TYPE dashboard_section_type AS ENUM (
  'welcome',
  'timeline',
  'budget_tracker',
  'vendor_portfolio',
  'guest_list',
  'task_manager',
  'gallery',
  'documents',
  'contracts',
  'payments',
  'communication',
  'booking_calendar',
  'notes',
  'activity_feed',
  'weather',
  'travel_info',
  'rsvp_manager',
  'seating_chart',
  'menu_planning',
  'music_playlist',
  'ceremony_details',
  'reception_details',
  'vendor_contacts',
  'emergency_contacts',
  'countdown',
  'inspiration_board',
  'checklist'
);

-- 3. Dashboard Templates Table
CREATE TABLE dashboard_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic Information (Pattern from booking_pages)
  supplier_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category dashboard_template_category NOT NULL,
  
  -- Template Configuration
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  
  -- Assignment Rules
  target_criteria JSONB NOT NULL DEFAULT '{}'::jsonb, -- Package, venue, budget criteria
  assignment_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Visual Customization (Pattern from booking_pages branding)
  brand_color VARCHAR(7) DEFAULT '#7F56D9',
  custom_css TEXT,
  logo_url TEXT,
  background_image_url TEXT,
  
  -- Performance Settings
  cache_duration_minutes INTEGER DEFAULT 5,
  priority_loading BOOLEAN DEFAULT false,
  
  -- Metadata
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT unique_supplier_template_name UNIQUE(supplier_id, name)
);

-- 4. Dashboard Template Sections (Pattern from meeting_types)
CREATE TABLE dashboard_template_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES dashboard_templates(id) ON DELETE CASCADE,
  
  -- Section Configuration
  section_type dashboard_section_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Layout & Position (Grid-based like booking builder)
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 6, -- 12-column grid system
  height INTEGER NOT NULL DEFAULT 4,
  
  -- Section Settings
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  
  -- Configuration (JSON for flexibility like questionnaire_questions)
  section_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  conditional_rules JSONB DEFAULT NULL, -- Show/hide based on conditions
  
  -- Responsive Settings
  mobile_config JSONB DEFAULT NULL,
  tablet_config JSONB DEFAULT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Client Template Assignments
CREATE TABLE client_template_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Assignment Details
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  template_id UUID REFERENCES dashboard_templates(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Assignment Metadata
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  assignment_reason TEXT, -- 'automatic', 'manual', 'client_preference'
  assignment_criteria JSONB, -- What criteria triggered this assignment
  
  -- Client-Specific Customizations
  custom_sections JSONB DEFAULT '[]'::jsonb, -- Client-specific section overrides
  custom_branding JSONB DEFAULT '{}'::jsonb, -- Client-specific branding
  custom_config JSONB DEFAULT '{}'::jsonb, -- Other client customizations
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_rendered_at TIMESTAMPTZ,
  
  -- Performance Tracking
  render_count INTEGER DEFAULT 0,
  avg_render_time_ms INTEGER,
  
  CONSTRAINT unique_client_assignment UNIQUE(client_id, supplier_id)
);

-- 6. Template Assignment Rules (Pattern from booking availability)
CREATE TABLE template_assignment_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES dashboard_templates(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Rule Configuration
  rule_name VARCHAR(255) NOT NULL,
  rule_description TEXT,
  priority INTEGER DEFAULT 0, -- Higher number = higher priority
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Condition Configuration
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  /*
  Example conditions structure:
  [
    {
      "field": "budget_range",
      "operator": "equals",
      "value": "luxury",
      "weight": 1.0
    },
    {
      "field": "guest_count",
      "operator": "greater_than",
      "value": 100,
      "weight": 0.5
    },
    {
      "field": "venue_type",
      "operator": "in",
      "value": ["garden", "estate", "manor"],
      "weight": 0.3
    }
  ]
  */
  
  -- Assignment Actions
  actions JSONB NOT NULL DEFAULT '{}'::jsonb,
  /*
  Example actions structure:
  {
    "assign_template": true,
    "customize_sections": {
      "budget_tracker": {"show_premium_features": true},
      "vendor_portfolio": {"show_luxury_vendors": true}
    },
    "apply_branding": {
      "color_scheme": "luxury_gold"
    }
  }
  */
  
  -- Rule Metadata
  match_count INTEGER DEFAULT 0,
  last_matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Template Performance Metrics
CREATE TABLE template_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES dashboard_templates(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Performance Data
  render_time_ms INTEGER NOT NULL,
  cache_hit BOOLEAN DEFAULT false,
  sections_count INTEGER,
  data_load_time_ms INTEGER,
  
  -- User Interaction
  page_views INTEGER DEFAULT 1,
  bounce_rate DECIMAL(5,2),
  avg_session_duration INTEGER, -- seconds
  
  -- Error Tracking
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  
  -- Timestamp
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  date_bucket DATE DEFAULT CURRENT_DATE
);

-- 8. Template Section Library (Predefined Sections)
CREATE TABLE dashboard_section_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Section Definition
  section_type dashboard_section_type NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'planning', 'communication', 'financial', etc.
  
  -- Default Configuration
  default_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_width INTEGER DEFAULT 6,
  default_height INTEGER DEFAULT 4,
  
  -- Wedding Context
  wedding_stage VARCHAR(50)[], -- When this section is most relevant
  client_types dashboard_template_category[], -- Which client types use this
  
  -- Technical Requirements
  required_data_sources TEXT[], -- What data this section needs
  api_endpoints TEXT[], -- What endpoints this section calls
  permissions_required TEXT[], -- What permissions are needed
  
  -- UI/UX
  icon_name VARCHAR(50),
  preview_image_url TEXT,
  demo_data JSONB, -- Sample data for previews
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  
  -- Usage Analytics
  usage_count INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_section_type UNIQUE(section_type)
);

-- 9. Create Indexes for Performance

-- Template lookups
CREATE INDEX idx_dashboard_templates_supplier ON dashboard_templates(supplier_id);
CREATE INDEX idx_dashboard_templates_category ON dashboard_templates(category);
CREATE INDEX idx_dashboard_templates_active ON dashboard_templates(is_active) WHERE is_active = true;

-- Section queries
CREATE INDEX idx_template_sections_template ON dashboard_template_sections(template_id);
CREATE INDEX idx_template_sections_type ON dashboard_template_sections(section_type);
CREATE INDEX idx_template_sections_position ON dashboard_template_sections(template_id, sort_order);

-- Client assignments
CREATE INDEX idx_client_assignments_client ON client_template_assignments(client_id);
CREATE INDEX idx_client_assignments_template ON client_template_assignments(template_id);
CREATE INDEX idx_client_assignments_supplier ON client_template_assignments(supplier_id);
CREATE INDEX idx_client_assignments_active ON client_template_assignments(is_active) WHERE is_active = true;

-- Assignment rules
CREATE INDEX idx_assignment_rules_template ON template_assignment_rules(template_id);
CREATE INDEX idx_assignment_rules_priority ON template_assignment_rules(supplier_id, priority DESC);
CREATE INDEX idx_assignment_rules_active ON template_assignment_rules(is_active) WHERE is_active = true;

-- Performance metrics
CREATE INDEX idx_performance_template_date ON template_performance_metrics(template_id, date_bucket);
CREATE INDEX idx_performance_render_time ON template_performance_metrics(render_time_ms);

-- Section library
CREATE INDEX idx_section_library_type ON dashboard_section_library(section_type);
CREATE INDEX idx_section_library_category ON dashboard_section_library(category);
CREATE INDEX idx_section_library_active ON dashboard_section_library(is_active) WHERE is_active = true;

-- 10. Row Level Security Policies

-- Dashboard Templates - Supplier can only see their own
ALTER TABLE dashboard_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own dashboard templates"
  ON dashboard_templates FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = supplier_id);

CREATE POLICY "Users can create their own dashboard templates"
  ON dashboard_templates FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = supplier_id);

CREATE POLICY "Users can update their own dashboard templates"
  ON dashboard_templates FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = supplier_id)
  WITH CHECK ((SELECT auth.uid()) = supplier_id);

CREATE POLICY "Users can delete their own dashboard templates"
  ON dashboard_templates FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = supplier_id);

-- Template Sections - Access through template ownership
ALTER TABLE dashboard_template_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sections of their templates"
  ON dashboard_template_sections FOR SELECT
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM dashboard_templates 
      WHERE supplier_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can manage sections of their templates"
  ON dashboard_template_sections FOR ALL
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM dashboard_templates 
      WHERE supplier_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT id FROM dashboard_templates 
      WHERE supplier_id = (SELECT auth.uid())
    )
  );

-- Client Template Assignments - Supplier can only see their assignments
ALTER TABLE client_template_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their client template assignments"
  ON client_template_assignments FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = supplier_id);

CREATE POLICY "Users can manage their client template assignments"
  ON client_template_assignments FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = supplier_id)
  WITH CHECK ((SELECT auth.uid()) = supplier_id);

-- Assignment Rules - Supplier owns their rules
ALTER TABLE template_assignment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their template assignment rules"
  ON template_assignment_rules FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = supplier_id)
  WITH CHECK ((SELECT auth.uid()) = supplier_id);

-- Performance Metrics - View access through template ownership
ALTER TABLE template_performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view performance metrics for their templates"
  ON template_performance_metrics FOR SELECT
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM dashboard_templates 
      WHERE supplier_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "System can insert performance metrics"
  ON template_performance_metrics FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Will be restricted by application logic

-- Section Library - Public read access, admin write
ALTER TABLE dashboard_section_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view section library"
  ON dashboard_section_library FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 11. Functions for Template Assignment Automation

-- Function to calculate template match score
CREATE OR REPLACE FUNCTION calculate_template_match_score(
  p_client_id UUID,
  p_template_id UUID
) RETURNS DECIMAL AS $$
DECLARE
  match_score DECIMAL := 0.0;
  rule_record RECORD;
  client_record RECORD;
  condition_record RECORD;
BEGIN
  -- Get client data
  SELECT * INTO client_record FROM clients WHERE id = p_client_id;
  
  IF NOT FOUND THEN
    RETURN 0.0;
  END IF;
  
  -- Get all active assignment rules for this template
  FOR rule_record IN
    SELECT * FROM template_assignment_rules 
    WHERE template_id = p_template_id 
    AND is_active = true 
    ORDER BY priority DESC
  LOOP
    -- Process each condition in the rule
    FOR condition_record IN
      SELECT * FROM jsonb_array_elements(rule_record.conditions)
    LOOP
      -- Add condition matching logic here
      -- This is simplified - in practice, you'd have more sophisticated matching
      IF condition_record->>'field' = 'budget_range' THEN
        IF client_record.budget_range = condition_record->>'value' THEN
          match_score := match_score + COALESCE((condition_record->>'weight')::DECIMAL, 1.0);
        END IF;
      END IF;
      
      -- Add more field matching logic as needed
    END LOOP;
  END LOOP;
  
  RETURN match_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-assign template to client
CREATE OR REPLACE FUNCTION auto_assign_template_to_client(
  p_client_id UUID,
  p_supplier_id UUID
) RETURNS UUID AS $$
DECLARE
  best_template_id UUID;
  best_score DECIMAL := 0.0;
  template_record RECORD;
  current_score DECIMAL;
BEGIN
  -- Find the best matching template
  FOR template_record IN
    SELECT id FROM dashboard_templates 
    WHERE supplier_id = p_supplier_id 
    AND is_active = true
  LOOP
    current_score := calculate_template_match_score(p_client_id, template_record.id);
    
    IF current_score > best_score THEN
      best_score := current_score;
      best_template_id := template_record.id;
    END IF;
  END LOOP;
  
  -- Assign the best template if we found one
  IF best_template_id IS NOT NULL THEN
    INSERT INTO client_template_assignments (
      client_id, 
      template_id, 
      supplier_id,
      assignment_reason,
      assignment_criteria
    ) VALUES (
      p_client_id, 
      best_template_id, 
      p_supplier_id,
      'automatic',
      jsonb_build_object('match_score', best_score)
    )
    ON CONFLICT (client_id, supplier_id) 
    DO UPDATE SET 
      template_id = best_template_id,
      assigned_at = NOW(),
      assignment_reason = 'automatic',
      assignment_criteria = jsonb_build_object('match_score', best_score),
      is_active = true;
  END IF;
  
  RETURN best_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Triggers for Automatic Template Assignment

-- Trigger to auto-assign template when client is created
CREATE OR REPLACE FUNCTION trigger_auto_assign_template()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-assign for new clients (INSERT) or when key fields change (UPDATE)
  IF TG_OP = 'INSERT' OR (
    TG_OP = 'UPDATE' AND (
      OLD.budget_range IS DISTINCT FROM NEW.budget_range OR
      OLD.guest_count IS DISTINCT FROM NEW.guest_count OR
      OLD.venue_type IS DISTINCT FROM NEW.venue_type OR
      OLD.wedding_style IS DISTINCT FROM NEW.wedding_style
    )
  ) THEN
    -- Auto-assign template (async via background job would be better in production)
    PERFORM auto_assign_template_to_client(NEW.id, NEW.supplier_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER clients_auto_assign_template
  AFTER INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_assign_template();

-- 13. Materialized View for Template Performance Dashboard

CREATE MATERIALIZED VIEW dashboard_template_analytics AS
WITH template_stats AS (
  SELECT 
    dt.id,
    dt.name,
    dt.category,
    dt.supplier_id,
    COUNT(DISTINCT cta.client_id) as clients_count,
    COUNT(DISTINCT tpm.id) as render_count,
    AVG(tpm.render_time_ms) as avg_render_time,
    MAX(tpm.measured_at) as last_used_at,
    dt.usage_count,
    dt.created_at
  FROM dashboard_templates dt
  LEFT JOIN client_template_assignments cta ON dt.id = cta.template_id AND cta.is_active = true
  LEFT JOIN template_performance_metrics tpm ON dt.id = tpm.template_id
  WHERE dt.is_active = true
  GROUP BY dt.id, dt.name, dt.category, dt.supplier_id, dt.usage_count, dt.created_at
)
SELECT 
  *,
  CASE 
    WHEN clients_count > 50 THEN 'high_usage'
    WHEN clients_count > 10 THEN 'medium_usage'
    ELSE 'low_usage'
  END as usage_category,
  CASE 
    WHEN avg_render_time < 200 THEN 'fast'
    WHEN avg_render_time < 500 THEN 'medium'
    ELSE 'slow'
  END as performance_category
FROM template_stats;

-- Create index on materialized view
CREATE INDEX idx_template_analytics_supplier ON dashboard_template_analytics(supplier_id);
CREATE INDEX idx_template_analytics_category ON dashboard_template_analytics(category);

-- 14. Refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_template_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW dashboard_template_analytics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Insert default section library data
INSERT INTO dashboard_section_library (
  section_type, name, description, category, default_config, default_width, default_height,
  wedding_stage, client_types, icon_name, is_active
) VALUES 
-- Essential Sections
('welcome', 'Welcome Message', 'Personalized welcome message for clients', 'communication', 
  '{"message": "Welcome to your wedding dashboard!", "show_countdown": true}', 12, 3, 
  ARRAY['inquiry', 'planning', 'booked'], ARRAY['luxury', 'standard', 'budget'], 'heart', true),

('timeline', 'Wedding Timeline', 'Visual timeline of wedding planning milestones', 'planning',
  '{"view": "gantt", "show_milestones": true, "color_coding": true}', 12, 6,
  ARRAY['planning', 'booked'], ARRAY['luxury', 'standard'], 'calendar', true),

('budget_tracker', 'Budget Tracker', 'Comprehensive wedding budget management', 'financial',
  '{"currency": "GBP", "categories": "wedding_standard", "show_charts": true}', 8, 5,
  ARRAY['inquiry', 'planning', 'booked'], ARRAY['luxury', 'standard', 'budget'], 'pound-sterling', true),

('vendor_portfolio', 'Vendor Portfolio', 'Showcase of recommended wedding vendors', 'vendors',
  '{"display": "grid", "show_ratings": true, "filter_by_budget": true}', 12, 8,
  ARRAY['inquiry', 'planning'], ARRAY['luxury', 'standard'], 'users', true),

('guest_list', 'Guest Management', 'Complete guest list and RSVP tracking', 'planning',
  '{"show_dietary": true, "show_plus_ones": true, "export_formats": ["csv", "pdf"]}', 10, 6,
  ARRAY['planning', 'booked'], ARRAY['luxury', 'standard', 'budget'], 'user-group', true),

-- Communication Sections  
('task_manager', 'Task Manager', 'Wedding planning task lists and assignments', 'planning',
  '{"view": "kanban", "assign_to_vendors": true, "deadline_alerts": true}', 8, 6,
  ARRAY['planning', 'booked'], ARRAY['luxury', 'standard'], 'check-square', true),

('communication', 'Message Center', 'Centralized communication hub', 'communication',
  '{"show_vendor_messages": true, "auto_notifications": true}', 6, 4,
  ARRAY['inquiry', 'planning', 'booked'], ARRAY['luxury', 'standard', 'budget'], 'message-circle', true),

-- Visual & Experience Sections
('gallery', 'Photo Gallery', 'Wedding inspiration and vendor portfolios', 'visual',
  '{"layout": "masonry", "categories": ["venue", "flowers", "catering"], "upload_enabled": true}', 8, 6,
  ARRAY['inquiry', 'planning'], ARRAY['luxury', 'standard'], 'image', true),

('documents', 'Document Library', 'Contracts, invoices, and important documents', 'planning',
  '{"folders": ["contracts", "invoices", "inspiration"], "version_control": true}', 6, 4,
  ARRAY['planning', 'booked'], ARRAY['luxury', 'standard', 'budget'], 'file-text', true),

-- Advanced Sections (Premium)
('seating_chart', 'Seating Planner', 'Interactive wedding seating arrangement', 'planning',
  '{"table_shapes": ["round", "rectangle"], "drag_drop": true, "dietary_alerts": true}', 12, 8,
  ARRAY['planning', 'booked'], ARRAY['luxury'], 'users', true),

('weather', 'Weather Forecast', 'Weather information for wedding venue', 'logistics',
  '{"days_ahead": 14, "backup_plans": true, "alerts_enabled": true}', 4, 3,
  ARRAY['booked'], ARRAY['luxury', 'standard', 'budget'], 'cloud', true);

-- 16. Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER dashboard_templates_updated_at 
  BEFORE UPDATE ON dashboard_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER dashboard_template_sections_updated_at 
  BEFORE UPDATE ON dashboard_template_sections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER template_assignment_rules_updated_at 
  BEFORE UPDATE ON template_assignment_rules 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER dashboard_section_library_updated_at 
  BEFORE UPDATE ON dashboard_section_library 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 17. Comments for documentation
COMMENT ON TABLE dashboard_templates IS 'Main template definitions for client dashboard customization';
COMMENT ON TABLE dashboard_template_sections IS 'Individual sections that make up dashboard templates';
COMMENT ON TABLE client_template_assignments IS 'Assignment of templates to specific clients with customizations';
COMMENT ON TABLE template_assignment_rules IS 'Automated rules for assigning templates based on client characteristics';
COMMENT ON TABLE template_performance_metrics IS 'Performance tracking for template rendering and usage';
COMMENT ON TABLE dashboard_section_library IS 'Library of predefined dashboard sections available for templates';

COMMENT ON FUNCTION calculate_template_match_score IS 'Calculates how well a template matches a client based on assignment rules';
COMMENT ON FUNCTION auto_assign_template_to_client IS 'Automatically assigns the best matching template to a client';

-- Migration complete
SELECT 'Dashboard Templates System migration completed successfully' as result;