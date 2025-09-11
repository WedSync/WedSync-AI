0,
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


-- ========================================
-- Migration: 20250822120001_document_storage_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- =====================================================
-- Document Storage System Migration
-- WS-068: Wedding Business Compliance Hub
-- =====================================================

-- Document Categories Table
CREATE TABLE public.document_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#3B82F6',
    sort_order INTEGER DEFAULT 0,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document Storage Table
CREATE TABLE public.business_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.document_categories(id) ON DELETE RESTRICT,
    
    -- File Information
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    
    -- Document Metadata
    title VARCHAR(255),
    description TEXT,
    tags TEXT[],
    
    -- Compliance & Expiry Tracking
    issued_date DATE,
    expiry_date DATE,
    expiry_warning_days INTEGER DEFAULT 30,
    is_compliance_required BOOLEAN DEFAULT false,
    compliance_status VARCHAR(20) DEFAULT 'valid' CHECK (compliance_status IN ('valid', 'expiring', 'expired', 'invalid')),
    
    -- Security & Access
    security_level VARCHAR(10) DEFAULT 'standard' CHECK (security_level IN ('low', 'standard', 'high', 'critical')),
    encryption_key_id UUID,
    virus_scan_status VARCHAR(20) DEFAULT 'pending' CHECK (virus_scan_status IN ('pending', 'clean', 'infected', 'failed')),
    virus_scan_date TIMESTAMP WITH TIME ZONE,
    
    -- Status & Audit
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    version INTEGER DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_expiry_date CHECK (expiry_date IS NULL OR expiry_date > issued_date),
    CONSTRAINT valid_file_size CHECK (file_size > 0)
);

-- Document Access Control Table
CREATE TABLE public.document_access_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.business_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Access Permissions
    access_level VARCHAR(20) NOT NULL CHECK (access_level IN ('view', 'download', 'share', 'manage')),
    granted_by UUID REFERENCES auth.users(id),
    
    -- Access Restrictions
    ip_restrictions TEXT[],
    time_restrictions JSONB, -- {"start_time": "09:00", "end_time": "17:00", "days": [1,2,3,4,5]}
    expires_at TIMESTAMP WITH TIME ZONE,
    max_downloads INTEGER,
    current_downloads INTEGER DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(document_id, user_id, access_level)
);

-- Document Sharing Links Table
CREATE TABLE public.document_sharing_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.business_documents(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Link Configuration
    link_token VARCHAR(64) NOT NULL UNIQUE,
    link_type VARCHAR(20) NOT NULL CHECK (link_type IN ('view', 'download', 'preview')),
    
    -- Security Settings
    password_hash VARCHAR(255),
    require_email BOOLEAN DEFAULT false,
    allowed_emails TEXT[],
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    
    -- Time Controls
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Performance Index
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Document Sharing Access Log Table
CREATE TABLE public.document_sharing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sharing_link_id UUID REFERENCES public.document_sharing_links(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.business_documents(id) ON DELETE CASCADE,
    
    -- Access Details
    accessed_by_email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    referer TEXT,
    
    -- Action Information
    action VARCHAR(20) NOT NULL CHECK (action IN ('view', 'download', 'preview')),
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    
    -- Metadata
    file_size_downloaded BIGINT,
    download_duration_ms INTEGER,
    
    -- Timestamp
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document Compliance Alerts Table
CREATE TABLE public.document_compliance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.business_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Alert Configuration
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('expiry_warning', 'expired', 'compliance_check', 'renewal_required')),
    trigger_days_before INTEGER, -- Days before expiry to trigger
    
    -- Alert Status
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    next_trigger_at TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0,
    
    -- Notification Settings
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document Version History Table
CREATE TABLE public.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.business_documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    
    -- Previous Version Data
    previous_filename VARCHAR(255),
    previous_file_path TEXT,
    previous_file_hash VARCHAR(64),
    
    -- Change Information
    change_reason TEXT,
    changed_by UUID REFERENCES auth.users(id),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(document_id, version_number)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Primary lookup indexes
CREATE INDEX idx_business_documents_user_id ON public.business_documents(user_id);
CREATE INDEX idx_business_documents_category_id ON public.business_documents(category_id);
CREATE INDEX idx_business_documents_status ON public.business_documents(status) WHERE status = 'active';

-- Compliance and expiry indexes
CREATE INDEX idx_business_documents_expiry_date ON public.business_documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_business_documents_compliance_status ON public.business_documents(compliance_status);
CREATE INDEX idx_business_documents_expiring ON public.business_documents(user_id, expiry_date) WHERE expiry_date IS NOT NULL AND status = 'active';

-- Security indexes
CREATE INDEX idx_business_documents_hash ON public.business_documents(file_hash);
CREATE INDEX idx_business_documents_virus_scan ON public.business_documents(virus_scan_status) WHERE virus_scan_status != 'clean';

-- Access control indexes
CREATE INDEX idx_document_access_control_document_id ON public.document_access_control(document_id);
CREATE INDEX idx_document_access_control_user_id ON public.document_access_control(user_id);
CREATE INDEX idx_document_access_control_expires ON public.document_access_control(expires_at) WHERE expires_at IS NOT NULL;

-- Sharing indexes
CREATE INDEX idx_document_sharing_links_token ON public.document_sharing_links(link_token);
CREATE INDEX idx_document_sharing_links_document_id ON public.document_sharing_links(document_id);
CREATE INDEX idx_document_sharing_links_active ON public.document_sharing_links(is_active, expires_at) WHERE is_active = true;

-- Alert indexes
CREATE INDEX idx_document_compliance_alerts_next_trigger ON public.document_compliance_alerts(next_trigger_at) WHERE is_active = true;
CREATE INDEX idx_document_compliance_alerts_user_document ON public.document_compliance_alerts(user_id, document_id);

-- Audit log indexes
CREATE INDEX idx_document_sharing_logs_document_id ON public.document_sharing_logs(document_id);
CREATE INDEX idx_document_sharing_logs_accessed_at ON public.document_sharing_logs(accessed_at);
CREATE INDEX idx_document_sharing_logs_ip ON public.document_sharing_logs(ip_address);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_sharing_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_sharing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Document Categories: Read-only for authenticated users
CREATE POLICY "Document categories are viewable by authenticated users" ON public.document_categories
    FOR SELECT USING (auth.role() = 'authenticated');

-- Business Documents: Full access for document owner
CREATE POLICY "Users can view their own documents" ON public.business_documents
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own documents" ON public.business_documents
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own documents" ON public.business_documents
    FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own documents" ON public.business_documents
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Document Access Control: Owner and granted users
CREATE POLICY "Users can manage access to their documents" ON public.document_access_control
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.business_documents 
            WHERE id = document_access_control.document_id 
            AND user_id = (SELECT auth.uid())
        ) 
        OR user_id = (SELECT auth.uid())
    );

-- Document Sharing Links: Owner can manage
CREATE POLICY "Users can manage sharing links for their documents" ON public.document_sharing_links
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.business_documents 
            WHERE id = document_sharing_links.document_id 
            AND user_id = (SELECT auth.uid())
        )
    );

-- Document Sharing Logs: Owner can view
CREATE POLICY "Users can view sharing logs for their documents" ON public.document_sharing_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.business_documents 
            WHERE id = document_sharing_logs.document_id 
            AND user_id = (SELECT auth.uid())
        )
    );

-- Service role can insert logs
CREATE POLICY "Service can insert sharing logs" ON public.document_sharing_logs
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Document Compliance Alerts: Owner access
CREATE POLICY "Users can manage alerts for their documents" ON public.document_compliance_alerts
    FOR ALL USING ((SELECT auth.uid()) = user_id);

-- Document Versions: Owner access
CREATE POLICY "Users can view versions of their documents" ON public.document_versions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.business_documents 
            WHERE id = document_versions.document_id 
            AND user_id = (SELECT auth.uid())
        )
    );

-- =====================================================
-- TRIGGERS FOR AUTOMATION
-- =====================================================

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_categories_updated_at
    BEFORE UPDATE ON public.document_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_documents_updated_at
    BEFORE UPDATE ON public.business_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_compliance_alerts_updated_at
    BEFORE UPDATE ON public.document_compliance_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Compliance Status Auto-Update
CREATE OR REPLACE FUNCTION update_compliance_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update compliance status based on expiry date
    IF NEW.expiry_date IS NOT NULL THEN
        IF NEW.expiry_date < CURRENT_DATE THEN
            NEW.compliance_status = 'expired';
        ELSIF NEW.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN
            NEW.compliance_status = 'expiring';
        ELSE
            NEW.compliance_status = 'valid';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_compliance_status
    BEFORE INSERT OR UPDATE ON public.business_documents
    FOR EACH ROW EXECUTE FUNCTION update_compliance_status();

-- Alert Schedule Update
CREATE OR REPLACE FUNCTION schedule_compliance_alerts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update next trigger time for alerts
    IF NEW.expiry_date IS NOT NULL AND NEW.expiry_warning_days IS NOT NULL THEN
        UPDATE public.document_compliance_alerts
        SET next_trigger_at = NEW.expiry_date - INTERVAL '1 day' * NEW.expiry_warning_days
        WHERE document_id = NEW.id AND alert_type = 'expiry_warning' AND is_active = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER schedule_document_alerts
    AFTER INSERT OR UPDATE ON public.business_documents
    FOR EACH ROW EXECUTE FUNCTION schedule_compliance_alerts();

-- =====================================================
-- INITIAL DATA SEEDING
-- =====================================================

-- Default Document Categories
INSERT INTO public.document_categories (name, display_name, description, icon, color, sort_order, is_system) VALUES
    ('credentials_insurance', 'Credentials & Insurance', 'Professional liability insurance, public indemnity, and certifications', 'Shield', '#10B981', 1, true),
    ('certifications_licenses', 'Certifications & Licenses', 'Professional certifications, music licenses, and regulatory permits', 'Award', '#3B82F6', 2, true),
    ('contracts_agreements', 'Contracts & Agreements', 'Client contracts, vendor agreements, and legal documents', 'FileText', '#8B5CF6', 3, true),
    ('equipment_safety', 'Equipment & Safety', 'PAT testing certificates, equipment warranties, and safety documentation', 'Settings', '#F59E0B', 4, true),
    ('business_registration', 'Business Registration', 'Company registration, tax documents, and business permits', 'Building2', '#EF4444', 5, true),
    ('marketing_materials', 'Marketing Materials', 'Brochures, portfolios, and promotional documents', 'Image', '#EC4899', 6, true),
    ('financial_documents', 'Financial Documents', 'Invoices, receipts, and financial statements', 'CreditCard', '#06B6D4', 7, true),
    ('other', 'Other Documents', 'Miscellaneous business documents', 'FileQuestion', '#6B7280', 8, true);

-- =====================================================
-- HELPFUL VIEWS FOR DEVELOPMENT
-- =====================================================

-- Documents with category information
CREATE VIEW public.documents_with_categories AS
SELECT 
    d.*,
    c.display_name as category_name,
    c.icon as category_icon,
    c.color as category_color
FROM public.business_documents d
JOIN public.document_categories c ON d.category_id = c.id
WHERE d.status = 'active';

-- Expiring documents view
CREATE VIEW public.expiring_documents AS
SELECT 
    d.*,
    c.display_name as category_name,
    (d.expiry_date - CURRENT_DATE) as days_until_expiry
FROM public.business_documents d
JOIN public.document_categories c ON d.category_id = c.id
WHERE d.status = 'active' 
    AND d.expiry_date IS NOT NULL 
    AND d.expiry_date <= CURRENT_DATE + INTERVAL '60 days'
ORDER BY d.expiry_date ASC;

-- Document statistics view
CREATE VIEW public.document_statistics AS
SELECT 
    user_id,
    COUNT(*) as total_documents,
    COUNT(CASE WHEN expiry_date IS NOT NULL THEN 1 END) as documents_with_expiry,
    COUNT(CASE WHEN compliance_status = 'expired' THEN 1 END) as expired_documents,
    COUNT(CASE WHEN compliance_status = 'expiring' THEN 1 END) as expiring_documents,
    SUM(file_size) as total_storage_used,
    MAX(created_at) as last_upload_date
FROM public.business_documents
WHERE status = 'active'
GROUP BY user_id;

-- =====================================================
-- GRANTS FOR PROPER PERMISSIONS
-- =====================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant permissions on tables
GRANT ALL ON public.document_categories TO authenticated;
GRANT ALL ON public.business_documents TO authenticated;
GRANT ALL ON public.document_access_control TO authenticated;
GRANT ALL ON public.document_sharing_links TO authenticated;
GRANT ALL ON public.document_sharing_logs TO service_role;
GRANT SELECT ON public.document_sharing_logs TO authenticated;
GRANT ALL ON public.document_compliance_alerts TO authenticated;
GRANT ALL ON public.document_versions TO authenticated;

-- Grant permissions on views
GRANT SELECT ON public.documents_with_categories TO authenticated;
GRANT SELECT ON public.expiring_documents TO authenticated;
GRANT SELECT ON public.document_statistics TO authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.document_categories IS 'Categorizes business documents for better organization and compliance tracking';
COMMENT ON TABLE public.business_documents IS 'Main table storing wedding business compliance documents with expiry tracking';
COMMENT ON TABLE public.document_access_control IS 'Controls who can access specific documents with granular permissions';
COMMENT ON TABLE public.document_sharing_links IS 'Secure temporary links for document sharing with external parties';
COMMENT ON TABLE public.document_sharing_logs IS 'Audit trail of all document sharing activities';
COMMENT ON TABLE public.document_compliance_alerts IS 'Automated alerts for document expiry and compliance requirements';
COMMENT ON TABLE public.document_versions IS 'Version history tracking for document updates and changes';

COMMENT ON COLUMN public.business_documents.compliance_status IS 'Auto-calculated based on expiry_date: valid, expiring (30 days), expired, invalid';
COMMENT ON COLUMN public.business_documents.security_level IS 'Determines encryption and access requirements: low, standard, high, critical';
COMMENT ON COLUMN public.business_documents.file_hash IS 'SHA-256 hash for integrity verification and duplicate detection';
COMMENT ON COLUMN public.document_access_control.time_restrictions IS 'JSON object defining time-based access rules';
COMMENT ON COLUMN public.document_sharing_links.link_token IS 'Cryptographically secure token for accessing shared documents';

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250822150001_complete_content_management_integration.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- =====================================================
-- COMPLETE CONTENT MANAGEMENT SYSTEM INTEGRATION
-- Team C Final Integration: Rounds 1, 2, and 3
-- WS-069: Article Creation Educational Content System
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ROUND 1: BRANDING CONFIGURATION TABLES
-- =====================================================

-- Branding configurations for white-label content
DROP VIEW IF EXISTS branding_configs CASCADE;
CREATE TABLE IF NOT EXISTS branding_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Logo configuration
    logo_primary TEXT,
    logo_favicon TEXT,
    logo_email_header TEXT,
    
    -- Color system
    color_primary VARCHAR(7) NOT NULL DEFAULT '#9E77ED',
    color_secondary VARCHAR(7) NOT NULL DEFAULT '#6941C6',
    color_accent VARCHAR(7) NOT NULL DEFAULT '#D6BBFB',
    color_background VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
    color_text VARCHAR(7) NOT NULL DEFAULT '#101828',
    color_success VARCHAR(7) NOT NULL DEFAULT '#12B76A',
    color_warning VARCHAR(7) NOT NULL DEFAULT '#F79009',
    color_error VARCHAR(7) NOT NULL DEFAULT '#F04438',
    
    -- Typography system
    typography_heading_font VARCHAR(100) NOT NULL DEFAULT 'Inter',
    typography_body_font VARCHAR(100) NOT NULL DEFAULT 'Inter',
    typography_base_font_size INTEGER NOT NULL DEFAULT 16,
    
    -- Custom CSS
    custom_css TEXT,
    
    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one active branding config per user
    UNIQUE(user_id, is_active) WHERE is_active = true
);

-- =====================================================
-- ROUND 2: DOCUMENT STORAGE INTEGRATION
-- =====================================================

-- Document categories (already exists, but ensure consistency)
DROP VIEW IF EXISTS document_categories CASCADE;
CREATE TABLE IF NOT EXISTS document_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#6B7280',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default document categories for article attachments
INSERT INTO document_categories (name, slug, description, icon, color, sort_order)
VALUES 
    ('Article Resources', 'article-resources', 'Documents and media for article content', 'FileText', '#3B82F6', 10),
    ('Brand Assets', 'brand-assets', 'Logos, images, and branding materials', 'Image', '#8B5CF6', 20),
    ('Educational Materials', 'educational-materials', 'Guides, checklists, and educational content', 'BookOpen', '#10B981', 30)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- ROUND 3: ARTICLE CREATION SYSTEM
-- =====================================================

-- Article categories
DROP VIEW IF EXISTS article_categories CASCADE;
CREATE TABLE IF NOT EXISTS article_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6B7280',
    icon VARCHAR(50) DEFAULT 'BookOpen',
    sort_order INTEGER NOT NULL DEFAULT 0,
    article_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default article categories
INSERT INTO article_categories (name, slug, description, color, icon, sort_order)
VALUES 
    ('Planning Guides', 'planning-guides', 'Comprehensive wedding planning guides', '#3B82F6', 'Calendar', 10),
    ('Vendor Selection', 'vendor-selection', 'Tips for choosing wedding vendors', '#8B5CF6', 'Users', 20),
    ('Style & Design', 'style-design', 'Wedding style and design inspiration', '#EC4899', 'Palette', 30),
    ('Budget Tips', 'budget-tips', 'Wedding budget planning and saving tips', '#10B981', 'DollarSign', 40),
    ('Timeline & Logistics', 'timeline-logistics', 'Wedding timeline and logistics planning', '#F59E0B', 'Clock', 50),
    ('Seasonal Content', 'seasonal-content', 'Season-specific wedding content', '#06B6D4', 'Sun', 60)
ON CONFLICT (slug) DO NOTHING;

-- Articles table with complete integration
DROP VIEW IF EXISTS articles CASCADE;
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic article information
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    content JSONB NOT NULL, -- Tiptap JSON content
    content_html TEXT NOT NULL, -- Rendered HTML content
    excerpt TEXT,
    featured_image_url TEXT,
    
    -- Article status and publishing
    status VARCHAR(20) NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'review', 'scheduled', 'published', 'archived')),
    published_at TIMESTAMP WITH TIME ZONE,
    scheduled_publish_at TIMESTAMP WITH TIME ZONE,
    last_published_at TIMESTAMP WITH TIME ZONE,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    reading_time_minutes INTEGER NOT NULL DEFAULT 1,
    
    -- SEO optimization
    seo_title VARCHAR(60),
    seo_description VARCHAR(160),
    seo_keywords TEXT[], -- Array of keywords
    seo_score INTEGER NOT NULL DEFAULT 0 CHECK (seo_score >= 0 AND seo_score <= 100),
    meta_image_url TEXT,
    
    -- Categorization and tagging
    category_ids UUID[] NOT NULL DEFAULT '{}',
    tags TEXT[] NOT NULL DEFAULT '{}',
    
    -- Distribution targeting
    target_wedding_types TEXT[] NOT NULL DEFAULT '{}',
    target_client_segments TEXT[] NOT NULL DEFAULT '{}',
    
    -- Analytics and engagement
    view_count INTEGER NOT NULL DEFAULT 0,
    engagement_score INTEGER NOT NULL DEFAULT 0,
    shares_count INTEGER NOT NULL DEFAULT 0,
    average_read_time NUMERIC(10,2) NOT NULL DEFAULT 0,
    bounce_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    
    -- Integration with Rounds 1 & 2
    branding_config_id UUID REFERENCES branding_configs(id) ON DELETE SET NULL,
    attached_documents UUID[] NOT NULL DEFAULT '{}', -- References to business_documents
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, slug),
    CONSTRAINT valid_seo_title_length CHECK (char_length(seo_title) <= 60),
    CONSTRAINT valid_seo_description_length CHECK (char_length(seo_description) <= 160)
);

-- Content distribution rules
DROP VIEW IF EXISTS content_distribution_rules CASCADE;
CREATE TABLE IF NOT EXISTS content_distribution_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    
    -- Rule configuration
    condition_type VARCHAR(50) NOT NULL 
        CHECK (condition_type IN ('wedding_month', 'wedding_season', 'budget_range', 
                                  'guest_count', 'venue_type', 'planning_stage', 
                                  'client_tags', 'vendor_category')),
    condition_value TEXT NOT NULL, -- JSON string for complex conditions
    priority INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Article document associations (Round 2 integration)
DROP VIEW IF EXISTS article_document_associations CASCADE;
CREATE TABLE IF NOT EXISTS article_document_associations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES business_documents(id) ON DELETE CASCADE,
    
    -- Display configuration
    display_name VARCHAR(200) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(article_id, document_id)
);

-- Article analytics tracking
DROP VIEW IF EXISTS article_analytics CASCADE;
CREATE TABLE IF NOT EXISTS article_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    
    -- Date and basic metrics
    date DATE NOT NULL,
    views INTEGER NOT NULL DEFAULT 0,
    unique_views INTEGER NOT NULL DEFAULT 0,
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,
    scroll_depth_percentage INTEGER NOT NULL DEFAULT 0,
    shares INTEGER NOT NULL DEFAULT 0,
    
    -- Engagement events (JSON)
    engagement_events JSONB NOT NULL DEFAULT '[]',
    
    -- Traffic sources (JSON)
    traffic_sources JSONB NOT NULL DEFAULT '[]',
    
    -- Device and geographic breakdown (JSON)
    device_breakdown JSONB NOT NULL DEFAULT '{}',
    geographic_data JSONB NOT NULL DEFAULT '[]',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(article_id, date)
);

-- Publishing schedule
DROP VIEW IF EXISTS publishing_schedules CASCADE;
CREATE TABLE IF NOT EXISTS publishing_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    
    -- Schedule configuration
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'published', 'failed', 'cancelled')),
    
    -- Notification settings (JSON)
    notification_settings JSONB NOT NULL DEFAULT '{}',
    
    -- Execution tracking
    execution_attempts INTEGER NOT NULL DEFAULT 0,
    last_execution_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Article indexes
CREATE INDEX IF NOT EXISTS idx_articles_user_id ON articles(user_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_articles_category_ids ON articles USING GIN(category_ids);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_articles_target_wedding_types ON articles USING GIN(target_wedding_types);
CREATE INDEX IF NOT EXISTS idx_articles_branding_config ON articles(branding_config_id);
CREATE INDEX IF NOT EXISTS idx_articles_attached_documents ON articles USING GIN(attached_documents);

-- Distribution rules indexes
CREATE INDEX IF NOT EXISTS idx_distribution_rules_article_id ON content_distribution_rules(article_id);
CREATE INDEX IF NOT EXISTS idx_distribution_rules_condition_type ON content_distribution_rules(condition_type);
CREATE INDEX IF NOT EXISTS idx_distribution_rules_active ON content_distribution_rules(is_active) WHERE is_active = true;

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_article_analytics_article_date ON article_analytics(article_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_article_analytics_date ON article_analytics(date DESC);

-- Document associations indexes
CREATE INDEX IF NOT EXISTS idx_article_documents_article_id ON article_document_associations(article_id);
CREATE INDEX IF NOT EXISTS idx_article_documents_document_id ON article_document_associations(document_id);

-- Branding configs indexes
CREATE INDEX IF NOT EXISTS idx_branding_configs_user_id ON branding_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_branding_configs_active ON branding_configs(is_active) WHERE is_active = true;

-- Publishing schedules indexes
CREATE INDEX IF NOT EXISTS idx_publishing_schedules_article_id ON publishing_schedules(article_id);
CREATE INDEX IF NOT EXISTS idx_publishing_schedules_scheduled_date ON publishing_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_publishing_schedules_status ON publishing_schedules(status);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE branding_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_distribution_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_document_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE publishing_schedules ENABLE ROW LEVEL SECURITY;

-- Branding configs policies
CREATE POLICY "Users can view their own branding configs" ON branding_configs
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own branding configs" ON branding_configs
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own branding configs" ON branding_configs
    FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own branding configs" ON branding_configs
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Articles policies
CREATE POLICY "Users can view their own articles" ON articles
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view published articles" ON articles
    FOR SELECT USING (status = 'published');

CREATE POLICY "Users can insert their own articles" ON articles
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own articles" ON articles
    FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own articles" ON articles
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Distribution rules policies
CREATE POLICY "Users can manage distribution rules for their articles" ON content_distribution_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM articles 
            WHERE articles.id = content_distribution_rules.article_id 
            AND articles.user_id = (SELECT auth.uid())
        )
    );

-- Article document associations policies
CREATE POLICY "Users can manage document associations for their articles" ON article_document_associations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM articles 
            WHERE articles.id = article_document_associations.article_id 
            AND articles.user_id = (SELECT auth.uid())
        )
    );

-- Article analytics policies
CREATE POLICY "Users can view analytics for their articles" ON article_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM articles 
            WHERE articles.id = article_analytics.article_id 
            AND articles.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "System can insert analytics data" ON article_analytics
    FOR INSERT WITH CHECK (true); -- Allow system to insert analytics

-- Publishing schedules policies
CREATE POLICY "Users can manage publishing schedules for their articles" ON publishing_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM articles 
            WHERE articles.id = publishing_schedules.article_id 
            AND articles.user_id = (SELECT auth.uid())
        )
    );

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update article category count
CREATE OR REPLACE FUNCTION update_article_category_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update count for old categories
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        UPDATE article_categories 
        SET article_count = (
            SELECT COUNT(*) 
            FROM articles 
            WHERE OLD.id = ANY(category_ids) 
            AND status = 'published'
        )
        WHERE id = ANY(OLD.category_ids);
    END IF;

    -- Update count for new categories
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE article_categories 
        SET article_count = (
            SELECT COUNT(*) 
            FROM articles 
            WHERE NEW.id = ANY(category_ids) 
            AND status = 'published'
        )
        WHERE id = ANY(NEW.category_ids);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for article category count updates
DROP TRIGGER IF EXISTS trigger_update_article_category_count ON articles;
CREATE TRIGGER trigger_update_article_category_count
    AFTER INSERT OR UPDATE OR DELETE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_article_category_count();

-- Function to update article updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
CREATE TRIGGER trigger_articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_branding_configs_updated_at
    BEFORE UPDATE ON branding_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_publishing_schedules_updated_at
    BEFORE UPDATE ON publishing_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS FOR COMPLEX QUERIES
-- =====================================================

-- View for articles with complete data
CREATE OR REPLACE VIEW articles_with_details AS
SELECT 
    a.*,
    bc.color_primary as brand_primary_color,
    bc.color_secondary as brand_secondary_color,
    bc.logo_primary as brand_logo,
    
    -- Category information
    (
        SELECT array_agg(ac.name ORDER BY ac.sort_order)
        FROM article_categories ac
        WHERE ac.id = ANY(a.category_ids)
    ) as category_names,
    
    -- Document count
    (
        SELECT COUNT(*)
        FROM article_document_associations ada
        WHERE ada.article_id = a.id
    ) as attached_documents_count,
    
    -- Analytics summary
    (
        SELECT 
            json_build_object(
                'total_views', COALESCE(SUM(aa.views), 0),
                'total_unique_views', COALESCE(SUM(aa.unique_views), 0),
                'avg_time_spent', COALESCE(AVG(aa.time_spent_seconds), 0),
                'total_shares', COALESCE(SUM(aa.shares), 0)
            )
        FROM article_analytics aa
        WHERE aa.article_id = a.id
        AND aa.date >= CURRENT_DATE - INTERVAL '30 days'
    ) as analytics_30d

FROM articles a
LEFT JOIN branding_configs bc ON a.branding_config_id = bc.id;

-- =====================================================
-- FINAL CONFIGURATION
-- =====================================================

-- Grant necessary permissions
GRANT SELECT ON article_categories TO authenticated;
GRANT ALL ON branding_configs TO authenticated;
GRANT ALL ON articles TO authenticated;
GRANT ALL ON content_distribution_rules TO authenticated;
GRANT ALL ON article_document_associations TO authenticated;
GRANT SELECT, INSERT ON article_analytics TO authenticated;
GRANT ALL ON publishing_schedules TO authenticated;
GRANT SELECT ON articles_with_details TO authenticated;

-- Create completion marker
INSERT INTO migration_status (migration_name, status, completed_at)
VALUES ('20250822150001_complete_content_management_integration', 'completed', NOW())
ON CONFLICT (migration_name) DO UPDATE SET 
    status = 'completed',
    completed_at = NOW();

-- =====================================================
-- MIGRATION COMPLETE
-- Team C Content Management System Integration Ready
-- Rounds 1, 2, and 3 Successfully Integrated
-- =====================================================

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250822222055_photo_gallery_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- =============================================
-- Photo Gallery System Migration
-- Feature: WS-079 - Photo Gallery & Sharing
-- Team: C, Batch: 6, Round: 1
-- =============================================

-- Create photo storage buckets table for organizing photos
CREATE TABLE photo_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    bucket_type VARCHAR(50) NOT NULL DEFAULT 'general', -- 'engagement', 'venue', 'styling', 'general'
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES user_profiles(id),
    CONSTRAINT valid_bucket_type CHECK (bucket_type IN ('engagement', 'venue', 'styling', 'general', 'portfolio'))
);

-- Create photo albums table for categorizing photos within buckets
CREATE TABLE photo_albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    bucket_id UUID REFERENCES photo_buckets(id) ON DELETE CASCADE,
    cover_photo_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    event_date DATE,
    location VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES user_profiles(id)
);

-- Create photos table for individual photos
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID REFERENCES photo_albums(id) ON DELETE CASCADE,
    bucket_id UUID REFERENCES photo_buckets(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- File information
    filename VARCHAR(500) NOT NULL,
    original_filename VARCHAR(500),
    file_path TEXT NOT NULL, -- Supabase storage path
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    
    -- Optimization data
    thumbnail_path TEXT, -- Small thumbnail (150x150)
    preview_path TEXT,   -- Medium preview (800x600)
    optimized_path TEXT, -- Optimized full size
    compression_ratio DECIMAL(5,2), -- Percentage compressed
    
    -- Photo metadata
    title VARCHAR(500),
    description TEXT,
    alt_text VARCHAR(500),
    photographer_credit VARCHAR(255),
    taken_at TIMESTAMPTZ,
    location VARCHAR(255),
    
    -- Organization
    sort_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    approval_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    
    -- Tracking
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    uploaded_by UUID REFERENCES user_profiles(id),
    approved_by UUID REFERENCES user_profiles(id),
    
    CONSTRAINT valid_approval_status CHECK (approval_status IN ('pending', 'approved', 'rejected'))
);

-- Create photo sharing permissions table for vendor-specific access
CREATE TABLE photo_sharing_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    album_id UUID REFERENCES photo_albums(id) ON DELETE CASCADE,
    bucket_id UUID REFERENCES photo_buckets(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Permission details
    shared_with_user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    shared_with_vendor_type VARCHAR(100), -- 'photographer', 'florist', 'venue', 'caterer', etc.
    permission_level VARCHAR(50) NOT NULL DEFAULT 'view', -- 'view', 'download', 'edit', 'share'
    
    -- Access control
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    can_reshare BOOLEAN DEFAULT false,
    
    -- Tracking
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    shared_by UUID REFERENCES user_profiles(id),
    
    CONSTRAINT valid_permission_level CHECK (permission_level IN ('view', 'download', 'edit', 'share')),
    CONSTRAINT valid_vendor_type CHECK (shared_with_vendor_type IN (
        'photographer', 'videographer', 'florist', 'venue', 'caterer', 
        'dj', 'band', 'officiant', 'planner', 'decorator', 'baker', 'other'
    ))
);

-- Create photo tags table for categorization
CREATE TABLE photo_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1', -- Hex color code
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES user_profiles(id)
);

-- Create photo_tag_assignments junction table
CREATE TABLE photo_tag_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES photo_tags(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    assigned_by UUID REFERENCES user_profiles(id),
    UNIQUE(photo_id, tag_id)
);

-- Create photo comments table for collaboration
CREATE TABLE photo_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    parent_comment_id UUID REFERENCES photo_comments(id) ON DELETE CASCADE,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create photo access logs for security tracking
CREATE TABLE photo_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'view', 'download', 'share', 'upload', 'delete'
    ip_address INET,
    user_agent TEXT,
    accessed_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_action CHECK (action IN ('view', 'download', 'share', 'upload', 'delete', 'edit'))
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Bucket indexes
CREATE INDEX idx_photo_buckets_client_id ON photo_buckets(client_id);
CREATE INDEX idx_photo_buckets_vendor_id ON photo_buckets(vendor_id);
CREATE INDEX idx_photo_buckets_organization_id ON photo_buckets(organization_id);
CREATE INDEX idx_photo_buckets_type ON photo_buckets(bucket_type);

-- Album indexes  
CREATE INDEX idx_photo_albums_bucket_id ON photo_albums(bucket_id);
CREATE INDEX idx_photo_albums_event_date ON photo_albums(event_date);
CREATE INDEX idx_photo_albums_featured ON photo_albums(is_featured);

-- Photo indexes
CREATE INDEX idx_photos_album_id ON photos(album_id);
CREATE INDEX idx_photos_bucket_id ON photos(bucket_id);
CREATE INDEX idx_photos_organization_id ON photos(organization_id);
CREATE INDEX idx_photos_uploaded_by ON photos(uploaded_by);
CREATE INDEX idx_photos_approval_status ON photos(approval_status);
CREATE INDEX idx_photos_featured ON photos(is_featured);
CREATE INDEX idx_photos_taken_at ON photos(taken_at);
CREATE INDEX idx_photos_created_at ON photos(created_at);

-- Permission indexes
CREATE INDEX idx_photo_sharing_permissions_photo_id ON photo_sharing_permissions(photo_id);
CREATE INDEX idx_photo_sharing_permissions_user_id ON photo_sharing_permissions(shared_with_user_id);
CREATE INDEX idx_photo_sharing_permissions_vendor_type ON photo_sharing_permissions(shared_with_vendor_type);
CREATE INDEX idx_photo_sharing_permissions_active ON photo_sharing_permissions(is_active);
CREATE INDEX idx_photo_sharing_permissions_expires_at ON photo_sharing_permissions(expires_at);

-- Tag indexes
CREATE INDEX idx_photo_tags_organization_id ON photo_tags(organization_id);
CREATE INDEX idx_photo_tag_assignments_photo_id ON photo_tag_assignments(photo_id);
CREATE INDEX idx_photo_tag_assignments_tag_id ON photo_tag_assignments(tag_id);

-- Comment indexes
CREATE INDEX idx_photo_comments_photo_id ON photo_comments(photo_id);
CREATE INDEX idx_photo_comments_author_id ON photo_comments(author_id);
CREATE INDEX idx_photo_comments_parent_id ON photo_comments(parent_comment_id);

-- Access log indexes  
CREATE INDEX idx_photo_access_logs_photo_id ON photo_access_logs(photo_id);
CREATE INDEX idx_photo_access_logs_user_id ON photo_access_logs(user_id);
CREATE INDEX idx_photo_access_logs_action ON photo_access_logs(action);
CREATE INDEX idx_photo_access_logs_accessed_at ON photo_access_logs(accessed_at);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE photo_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_sharing_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_access_logs ENABLE ROW LEVEL SECURITY;

-- Photo buckets policies
CREATE POLICY "Users can view buckets in their organization" ON photo_buckets
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can create buckets in their organization" ON photo_buckets
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can update buckets they created or are admin" ON photo_buckets
    FOR UPDATE USING (
        created_by = (SELECT auth.uid()) OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = (SELECT auth.uid()) 
            AND organization_id = photo_buckets.organization_id
            AND role IN ('admin', 'owner')
        )
    );

-- Photos policies
CREATE POLICY "Users can view photos in their organization or shared with them" ON photos
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = (SELECT auth.uid())
        ) OR
        id IN (
            SELECT photo_id FROM photo_sharing_permissions 
            WHERE shared_with_user_id = (SELECT auth.uid()) 
            AND is_active = true 
            AND (expires_at IS NULL OR expires_at > now())
        )
    );

CREATE POLICY "Users can insert photos in their organization" ON photos
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can update their own photos or approved photos in organization" ON photos
    FOR UPDATE USING (
        uploaded_by = (SELECT auth.uid()) OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = (SELECT auth.uid()) 
            AND organization_id = photos.organization_id
            AND role IN ('admin', 'owner')
        )
    );

-- Photo sharing permissions policies
CREATE POLICY "Users can view sharing permissions for their photos or organization" ON photo_sharing_permissions
    FOR SELECT USING (
        shared_with_user_id = (SELECT auth.uid()) OR
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can create sharing permissions for their organization" ON photo_sharing_permissions
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = (SELECT auth.uid())
        )
    );

-- Photo comments policies
CREATE POLICY "Users can view comments on photos they can access" ON photo_comments
    FOR SELECT USING (
        photo_id IN (
            SELECT id FROM photos 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE id = (SELECT auth.uid())
            ) OR
            id IN (
                SELECT photo_id FROM photo_sharing_permissions 
                WHERE shared_with_user_id = (SELECT auth.uid()) 
                AND is_active = true
            )
        )
    );

CREATE POLICY "Users can create comments on photos they can access" ON photo_comments
    FOR INSERT WITH CHECK (
        author_id = (SELECT auth.uid()) AND
        photo_id IN (
            SELECT id FROM photos 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE id = (SELECT auth.uid())
            ) OR
            id IN (
                SELECT photo_id FROM photo_sharing_permissions 
                WHERE shared_with_user_id = (SELECT auth.uid()) 
                AND is_active = true
            )
        )
    );

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to relevant tables
CREATE TRIGGER update_photo_buckets_updated_at BEFORE UPDATE ON photo_buckets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photo_albums_updated_at BEFORE UPDATE ON photo_albums 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON photos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photo_sharing_permissions_updated_at BEFORE UPDATE ON photo_sharing_permissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photo_comments_updated_at BEFORE UPDATE ON photo_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log photo access
CREATE OR REPLACE FUNCTION log_photo_access(
    p_photo_id UUID,
    p_action VARCHAR(50),
    p_user_id UUID DEFAULT auth.uid(),
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO photo_access_logs (photo_id, user_id, action, ip_address, user_agent, organization_id)
    SELECT p_photo_id, p_user_id, p_action, p_ip_address, p_user_agent, p.organization_id
    FROM photos p WHERE p.id = p_photo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update tag usage count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE photo_tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE photo_tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tag_usage_on_assignment AFTER INSERT OR DELETE ON photo_tag_assignments
    FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default photo tags
INSERT INTO photo_tags (name, description, color) VALUES
('engagement', 'Engagement photos and sessions', '#ff6b9d'),
('venue', 'Venue and location photos', '#4ecdc4'),
('styling', 'Hair, makeup, and styling photos', '#ffe66d'),
('flowers', 'Floral arrangements and bouquets', '#a8e6cf'),
('food', 'Catering and food photos', '#ffb3ba'),
('decor', 'Decorations and setup photos', '#c7ceea'),
('portraits', 'Portrait and family photos', '#ffd93d'),
('ceremony', 'Wedding ceremony photos', '#6bcf7f'),
('reception', 'Reception and party photos', '#ff8b94'),
('details', 'Rings, dress, and detail shots', '#b8b8ff');

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for photos with sharing info
CREATE VIEW photos_with_sharing AS
SELECT 
    p.*,
    pb.name as bucket_name,
    pa.name as album_name,
    array_agg(DISTINCT pt.name) FILTER (WHERE pt.name IS NOT NULL) as tags,
    array_agg(DISTINCT psp.shared_with_vendor_type) FILTER (WHERE psp.shared_with_vendor_type IS NOT NULL) as shared_with_vendor_types,
    COUNT(DISTINCT pc.id) as comment_count
FROM photos p
LEFT JOIN photo_buckets pb ON p.bucket_id = pb.id
LEFT JOIN photo_albums pa ON p.album_id = pa.id
LEFT JOIN photo_tag_assignments pta ON p.id = pta.photo_id
LEFT JOIN photo_tags pt ON pta.tag_id = pt.id
LEFT JOIN photo_sharing_permissions psp ON p.id = psp.photo_id AND psp.is_active = true
LEFT JOIN photo_comments pc ON p.id = pc.photo_id
GROUP BY p.id, pb.name, pa.name;

-- =============================================
-- SUPABASE STORAGE SETUP
-- =============================================

-- Create storage bucket for photos (this would typically be done via Supabase dashboard)
-- The bucket will be created programmatically in the application

COMMENT ON TABLE photo_buckets IS 'Organizational containers for photo albums';
COMMENT ON TABLE photo_albums IS 'Collections of photos within buckets';
COMMENT ON TABLE photos IS 'Individual photo files with metadata and optimization paths';
COMMENT ON TABLE photo_sharing_permissions IS 'Vendor-specific access control for photo sharing';
COMMENT ON TABLE photo_tags IS 'Reusable tags for photo categorization';
COMMENT ON TABLE photo_tag_assignments IS 'Many-to-many relationship between photos and tags';
COMMENT ON TABLE photo_comments IS 'Collaboration comments on photos';
COMMENT ON TABLE photo_access_logs IS 'Security audit trail for photo access';

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250822T205536_temp_migration.sql
-- ========================================

DROP VIEW IF EXISTS migration_test_v2 CASCADE;
CREATE TABLE IF NOT EXISTS migration_test_v2 (id SERIAL PRIMARY KEY, test_name TEXT, created_at TIMESTAMP DEFAULT NOW());


-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- Final verification
DO $$
BEGIN
  RAISE NOTICE 'All migrations completed successfully!';
END $$;
