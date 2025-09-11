-- Advanced Section Configuration System
-- WS-066: Team B Round 3 - Timeline-based visibility and intelligent content rules

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Section visibility rules table
CREATE TABLE section_visibility_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    section_id UUID NOT NULL, -- References dashboard_template_sections
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('timeline', 'package', 'form_state', 'custom', 'milestone_completed', 'client_metadata')),
    condition_field VARCHAR(100) NOT NULL,
    operator VARCHAR(20) NOT NULL CHECK (operator IN ('equals', 'not_equals', 'greater_than', 'less_than', 'between', 'in', 'not_in', 'contains', 'exists')),
    condition_value JSONB,
    logic_operator VARCHAR(3) CHECK (logic_operator IN ('and', 'or')),
    description TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    cache_duration_minutes INTEGER DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_section_visibility_rules_section (section_id),
    INDEX idx_section_visibility_rules_supplier (supplier_id),
    INDEX idx_section_visibility_rules_type (rule_type),
    INDEX idx_section_visibility_rules_active (is_active),
    INDEX idx_section_visibility_rules_priority (priority)
);

-- Content configuration for sections
CREATE TABLE section_content_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    section_id UUID NOT NULL,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('form', 'document', 'image', 'text', 'link', 'video', 'checklist', 'countdown')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_data JSONB NOT NULL DEFAULT '{}',
    
    -- Metadata configuration
    priority INTEGER NOT NULL DEFAULT 0,
    timeline_dependency VARCHAR(50),
    form_dependency VARCHAR(100),
    package_dependency JSONB, -- Array of package levels
    milestone_dependency JSONB, -- Array of milestone IDs
    is_required BOOLEAN NOT NULL DEFAULT false,
    auto_hide_on_complete BOOLEAN NOT NULL DEFAULT false,
    estimated_time_minutes INTEGER,
    tags JSONB DEFAULT '[]',
    
    -- Styling configuration
    theme VARCHAR(20) DEFAULT 'default' CHECK (theme IN ('default', 'featured', 'minimal', 'card')),
    color_scheme VARCHAR(20) DEFAULT 'primary' CHECK (color_scheme IN ('primary', 'secondary', 'success', 'warning', 'error')),
    size VARCHAR(10) DEFAULT 'md' CHECK (size IN ('sm', 'md', 'lg', 'xl')),
    animation VARCHAR(20) DEFAULT 'none' CHECK (animation IN ('none', 'fade', 'slide', 'scale', 'bounce')),
    
    -- Visibility conditions
    show_when VARCHAR(20) DEFAULT 'always' CHECK (show_when IN ('always', 'timeline', 'form_complete', 'milestone', 'custom')),
    hide_when VARCHAR(20) DEFAULT 'never' CHECK (hide_when IN ('never', 'complete', 'expired', 'superseded')),
    custom_logic TEXT,
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_section_content_config_section (section_id),
    INDEX idx_section_content_config_supplier (supplier_id),
    INDEX idx_section_content_config_type (content_type),
    INDEX idx_section_content_config_priority (priority),
    INDEX idx_section_content_config_timeline (timeline_dependency),
    INDEX idx_section_content_config_form (form_dependency)
);

-- Section styling and interaction configuration
CREATE TABLE section_style_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    section_id UUID NOT NULL,
    
    -- Visual styling
    theme VARCHAR(20) DEFAULT 'default' CHECK (theme IN ('default', 'minimal', 'card', 'feature')),
    animation VARCHAR(20) DEFAULT 'none' CHECK (animation IN ('none', 'fade', 'slide', 'scale')),
    border_style VARCHAR(20) DEFAULT 'none' CHECK (border_style IN ('none', 'solid', 'dashed', 'gradient')),
    shadow_level VARCHAR(10) DEFAULT 'none' CHECK (shadow_level IN ('none', 'sm', 'md', 'lg', 'xl')),
    corner_radius VARCHAR(10) DEFAULT 'md' CHECK (corner_radius IN ('none', 'sm', 'md', 'lg', 'xl', 'full')),
    
    -- Color customization
    background_color VARCHAR(7), -- Hex color
    text_color VARCHAR(7),
    accent_color VARCHAR(7),
    border_color VARCHAR(7),
    
    -- Mobile configuration
    mobile_hidden BOOLEAN NOT NULL DEFAULT false,
    mobile_collapsible BOOLEAN NOT NULL DEFAULT false,
    mobile_priority_order INTEGER DEFAULT 0,
    
    -- Notifications
    notify_on_show BOOLEAN NOT NULL DEFAULT false,
    notify_on_hide BOOLEAN NOT NULL DEFAULT false,
    notify_on_content_change BOOLEAN NOT NULL DEFAULT false,
    
    -- Interaction settings
    allow_user_collapse BOOLEAN NOT NULL DEFAULT true,
    allow_user_reorder BOOLEAN NOT NULL DEFAULT false,
    auto_refresh_interval_minutes INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_section_style_config_section (section_id),
    INDEX idx_section_style_config_supplier (supplier_id),
    INDEX idx_section_style_config_mobile_priority (mobile_priority_order)
);

-- Wedding milestone tracking
CREATE TABLE wedding_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    milestone_key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    days_from_wedding INTEGER NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('early', 'planning', 'details', 'final', 'wedding', 'post')),
    suggested_actions JSONB DEFAULT '[]',
    forms_to_trigger JSONB DEFAULT '[]',
    content_to_reveal JSONB DEFAULT '[]',
    is_system_milestone BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_wedding_milestones_key (milestone_key),
    INDEX idx_wedding_milestones_days (days_from_wedding),
    INDEX idx_wedding_milestones_category (category)
);

-- Client milestone completion tracking
CREATE TABLE client_milestone_completion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL, -- References clients table
    milestone_key VARCHAR(50) NOT NULL REFERENCES wedding_milestones(milestone_key),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_by UUID, -- References users or suppliers
    notes TEXT,
    auto_completed BOOLEAN NOT NULL DEFAULT false,
    
    -- Unique constraint to prevent duplicate completions
    UNIQUE(client_id, milestone_key),
    
    -- Indexes
    INDEX idx_client_milestone_completion_client (client_id),
    INDEX idx_client_milestone_completion_milestone (milestone_key),
    INDEX idx_client_milestone_completion_date (completed_at)
);

-- Section visibility cache for performance
CREATE TABLE section_visibility_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL,
    section_id UUID NOT NULL,
    is_visible BOOLEAN NOT NULL,
    visibility_reason TEXT,
    matched_rules JSONB DEFAULT '[]',
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    context_hash VARCHAR(64) NOT NULL, -- Hash of client context for cache invalidation
    
    -- Unique constraint for cache entries
    UNIQUE(client_id, section_id, context_hash),
    
    -- Indexes
    INDEX idx_section_visibility_cache_client (client_id),
    INDEX idx_section_visibility_cache_section (section_id),
    INDEX idx_section_visibility_cache_expires (expires_at),
    INDEX idx_section_visibility_cache_hash (context_hash)
);

-- Insert default wedding milestones
INSERT INTO wedding_milestones (milestone_key, name, description, days_from_wedding, category, suggested_actions, forms_to_trigger, content_to_reveal) VALUES
('12_months_before', '12+ Months Before', 'Early planning phase - setting the foundation', -365, 'early', 
 '["Set budget", "Create vision board", "Research venues"]', 
 '["wedding_vision", "initial_budget"]', 
 '["planning_guide", "inspiration_gallery"]'),

('9_months_before', '9 Months Before', 'Venue and vendor selection', -270, 'early', 
 '["Book venue", "Research vendors", "Send save-the-dates"]', 
 '["venue_requirements", "vendor_preferences"]', 
 '["vendor_directory", "venue_checklist"]'),

('6_months_before', '6 Months Before', 'Detailed planning and bookings', -180, 'planning', 
 '["Book major vendors", "Order invitations", "Plan menu"]', 
 '["catering_choices", "photography_style", "music_preferences"]', 
 '["menu_planner", "invitation_designer", "timeline_builder"]'),

('3_months_before', '3 Months Before', 'Finalizing details and logistics', -90, 'details', 
 '["Finalize guest list", "Order flowers", "Plan seating"]', 
 '["final_guest_list", "seating_preferences", "special_requests"]', 
 '["seating_chart", "day_of_timeline", "vendor_contacts"]'),

('1_month_before', '1 Month Before', 'Final preparations and confirmations', -30, 'final', 
 '["Confirm final details", "Prepare emergency kit", "Final fittings"]', 
 '["final_headcount", "special_dietary", "timeline_confirmation"]', 
 '["final_checklist", "emergency_contacts", "day_of_guide"]'),

('1_week_before', '1 Week Before', 'Final week countdown', -7, 'final', 
 '["Rehearsal", "Final venue check", "Delegate responsibilities"]', 
 '["rehearsal_attendance", "final_requests"]', 
 '["countdown_timer", "final_week_checklist", "relaxation_tips"]'),

('wedding_day', 'Wedding Day', 'Your special day!', 0, 'wedding', 
 '["Enjoy your day!", "Follow timeline", "Trust your team"]', 
 '[]', 
 '["day_of_timeline", "emergency_contacts", "celebration_guide"]'),

('1_week_after', '1 Week After', 'Post-wedding follow-up', 7, 'post', 
 '["Thank you notes", "Preserve bouquet", "Share photos"]', 
 '[]', 
 '["thank_you_templates", "photo_sharing", "preservation_guide"]'),

('1_month_after', '1 Month After', 'Settling into married life', 30, 'post', 
 '["Change name documents", "Update accounts", "Plan honeymoon"]', 
 '[]', 
 '["name_change_checklist", "newlywed_guide", "anniversary_planning"]');

-- Add foreign key relationships to existing tables
-- Note: This assumes dashboard_template_sections table exists from Round 2

-- Add section configuration reference to dashboard_template_sections
ALTER TABLE dashboard_template_sections 
ADD COLUMN visibility_rules_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN content_config_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN style_config_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN last_config_update TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes on the new columns
CREATE INDEX idx_dashboard_template_sections_visibility_enabled ON dashboard_template_sections(visibility_rules_enabled);
CREATE INDEX idx_dashboard_template_sections_content_enabled ON dashboard_template_sections(content_config_enabled);
CREATE INDEX idx_dashboard_template_sections_config_update ON dashboard_template_sections(last_config_update);

-- Functions for automated milestone management

-- Function to automatically mark milestones as completed based on timeline
CREATE OR REPLACE FUNCTION auto_complete_timeline_milestones()
RETURNS TRIGGER AS $$
DECLARE
    milestone_record RECORD;
    days_until_wedding INTEGER;
BEGIN
    -- Calculate days until wedding
    IF NEW.wedding_date IS NOT NULL THEN
        days_until_wedding := NEW.wedding_date - CURRENT_DATE;
        
        -- Loop through milestones and auto-complete passed ones
        FOR milestone_record IN 
            SELECT milestone_key, days_from_wedding 
            FROM wedding_milestones 
            WHERE days_from_wedding <= -days_until_wedding
              AND is_system_milestone = true
        LOOP
            -- Insert milestone completion if not already completed
            INSERT INTO client_milestone_completion (client_id, milestone_key, auto_completed)
            VALUES (NEW.id, milestone_record.milestone_key, true)
            ON CONFLICT (client_id, milestone_key) DO NOTHING;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-complete milestones when client wedding date is set/updated
-- CREATE TRIGGER trigger_auto_complete_milestones
--     AFTER INSERT OR UPDATE OF wedding_date ON clients
--     FOR EACH ROW
--     WHEN (NEW.wedding_date IS NOT NULL)
--     EXECUTE FUNCTION auto_complete_timeline_milestones();

-- Function to invalidate visibility cache when client context changes
CREATE OR REPLACE FUNCTION invalidate_visibility_cache()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete cached visibility results for this client
    DELETE FROM section_visibility_cache 
    WHERE client_id = COALESCE(NEW.id, OLD.id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to invalidate cache on client changes
-- CREATE TRIGGER trigger_invalidate_visibility_cache
--     AFTER UPDATE ON clients
--     FOR EACH ROW
--     EXECUTE FUNCTION invalidate_visibility_cache();

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_visibility_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM section_visibility_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update section configuration timestamps
CREATE OR REPLACE FUNCTION update_section_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Update the parent section's config update timestamp
    UPDATE dashboard_template_sections 
    SET last_config_update = NOW()
    WHERE id = NEW.section_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating configuration timestamps
CREATE TRIGGER trigger_update_visibility_rules_timestamp
    BEFORE UPDATE ON section_visibility_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_section_config_timestamp();

CREATE TRIGGER trigger_update_content_config_timestamp
    BEFORE UPDATE ON section_content_config
    FOR EACH ROW
    EXECUTE FUNCTION update_section_config_timestamp();

CREATE TRIGGER trigger_update_style_config_timestamp
    BEFORE UPDATE ON section_style_config
    FOR EACH ROW
    EXECUTE FUNCTION update_section_config_timestamp();

-- Row Level Security Policies

-- Section visibility rules - suppliers can only manage their own rules
ALTER TABLE section_visibility_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY section_visibility_rules_supplier_access ON section_visibility_rules
    FOR ALL USING (
        supplier_id = auth.jwt() ->> 'supplier_id'::text
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- Section content config - suppliers can only manage their own content
ALTER TABLE section_content_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY section_content_config_supplier_access ON section_content_config
    FOR ALL USING (
        supplier_id = auth.jwt() ->> 'supplier_id'::text
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- Section style config - suppliers can only manage their own styling
ALTER TABLE section_style_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY section_style_config_supplier_access ON section_style_config
    FOR ALL USING (
        supplier_id = auth.jwt() ->> 'supplier_id'::text
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- Wedding milestones - read-only for suppliers, admin can manage
ALTER TABLE wedding_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY wedding_milestones_read_access ON wedding_milestones
    FOR SELECT USING (true); -- All authenticated users can read milestones

CREATE POLICY wedding_milestones_admin_access ON wedding_milestones
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Client milestone completion - suppliers can manage for their clients
ALTER TABLE client_milestone_completion ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_milestone_completion_supplier_access ON client_milestone_completion
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM clients c 
            WHERE c.id = client_milestone_completion.client_id 
            AND c.supplier_id = auth.jwt() ->> 'supplier_id'::text
        )
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- Visibility cache - suppliers can access cache for their clients
ALTER TABLE section_visibility_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY section_visibility_cache_supplier_access ON section_visibility_cache
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM clients c 
            WHERE c.id = section_visibility_cache.client_id 
            AND c.supplier_id = auth.jwt() ->> 'supplier_id'::text
        )
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- Create indexes for performance optimization
CREATE INDEX CONCURRENTLY idx_section_visibility_rules_composite 
ON section_visibility_rules (section_id, is_active, priority);

CREATE INDEX CONCURRENTLY idx_section_content_config_composite 
ON section_content_config (section_id, is_active, priority);

CREATE INDEX CONCURRENTLY idx_section_visibility_cache_lookup 
ON section_visibility_cache (client_id, section_id, expires_at);

-- Comments for documentation
COMMENT ON TABLE section_visibility_rules IS 'Timeline-based and intelligent visibility rules for dashboard sections';
COMMENT ON TABLE section_content_config IS 'Content configuration and management for dashboard sections with wedding-specific logic';
COMMENT ON TABLE section_style_config IS 'Visual styling and interaction configuration for dashboard sections';
COMMENT ON TABLE wedding_milestones IS 'System-defined wedding planning milestones for timeline-based triggers';
COMMENT ON TABLE client_milestone_completion IS 'Tracking of milestone completion for individual clients';
COMMENT ON TABLE section_visibility_cache IS 'Performance cache for section visibility calculations';

COMMENT ON FUNCTION auto_complete_timeline_milestones() IS 'Automatically marks timeline milestones as completed when clients pass the milestone dates';
COMMENT ON FUNCTION invalidate_visibility_cache() IS 'Invalidates visibility cache when client context changes';
COMMENT ON FUNCTION cleanup_expired_visibility_cache() IS 'Maintenance function to clean up expired cache entries';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON section_visibility_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON section_content_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON section_style_config TO authenticated;
GRANT SELECT ON wedding_milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_milestone_completion TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON section_visibility_cache TO authenticated;

-- Migration complete
SELECT 'Advanced section configuration system created successfully' as status;