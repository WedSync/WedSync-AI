-- WS-168: Customer Success Dashboard - Success Milestones Table
-- Team D - Round 1 - Success Milestones for tracking achievements

-- Create success_milestones table for tracking customer achievements and progress
CREATE TABLE success_milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Milestone Details
    milestone_type VARCHAR(50) NOT NULL, -- 'onboarding', 'first_form', 'guest_list_complete', 'vendor_booking', 'timeline_created', etc.
    milestone_category VARCHAR(30) NOT NULL, -- 'onboarding', 'planning', 'vendor_management', 'guest_management', 'communication'
    milestone_name VARCHAR(200) NOT NULL,
    milestone_description TEXT,
    
    -- Achievement Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'skipped'
    priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    
    -- Progress Tracking
    progress_percentage DECIMAL(5,2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    target_completion_date DATE,
    actual_completion_date DATE,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    
    -- Scoring Impact
    health_score_impact DECIMAL(5,2) DEFAULT 0, -- How much this milestone affects health score (+/- points)
    engagement_score_impact DECIMAL(5,2) DEFAULT 0,
    progress_score_impact DECIMAL(5,2) DEFAULT 0,
    
    -- Wedding Context
    wedding_date DATE,
    days_until_wedding INTEGER,
    is_critical_path BOOLEAN DEFAULT false, -- Is this milestone on the critical path to wedding success?
    
    -- Dependencies
    prerequisite_milestone_ids UUID[], -- Array of milestone IDs that must be completed first
    dependent_milestone_ids UUID[], -- Array of milestone IDs that depend on this one
    
    -- Automation and Triggers
    auto_generated BOOLEAN DEFAULT false, -- Was this milestone auto-created by the system?
    trigger_conditions JSONB DEFAULT '{}', -- Conditions that create this milestone
    completion_triggers JSONB DEFAULT '{}', -- Actions to trigger when completed
    
    -- Assignment and Responsibility
    assigned_user_id UUID REFERENCES user_profiles(id),
    assigned_team VARCHAR(50),
    requires_supplier_action BOOLEAN DEFAULT false,
    supplier_dependencies TEXT[],
    
    -- Metadata and Tracking
    milestone_version VARCHAR(10) DEFAULT 'v1.0',
    template_id UUID, -- Reference to milestone template if used
    custom_fields JSONB DEFAULT '{}',
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Validation constraints
    CONSTRAINT valid_completion_date CHECK (
        (status = 'completed' AND completed_at IS NOT NULL AND actual_completion_date IS NOT NULL) OR
        (status != 'completed')
    ),
    CONSTRAINT valid_progress CHECK (
        (status = 'completed' AND progress_percentage = 100) OR
        (status != 'completed' AND progress_percentage < 100)
    )
);

-- Create indexes for performance
CREATE INDEX idx_success_milestones_client_id ON success_milestones(client_id);
CREATE INDEX idx_success_milestones_organization_id ON success_milestones(organization_id);
CREATE INDEX idx_success_milestones_status ON success_milestones(status, priority);
CREATE INDEX idx_success_milestones_type_category ON success_milestones(milestone_type, milestone_category);
CREATE INDEX idx_success_milestones_completion_date ON success_milestones(target_completion_date, actual_completion_date);
CREATE INDEX idx_success_milestones_critical_path ON success_milestones(is_critical_path, wedding_date);
CREATE INDEX idx_success_milestones_assigned ON success_milestones(assigned_user_id, status);

-- Create composite indexes for dashboard queries
CREATE INDEX idx_success_milestones_dashboard_main ON success_milestones(organization_id, status, priority, target_completion_date);
CREATE INDEX idx_success_milestones_client_progress ON success_milestones(client_id, status, progress_percentage DESC);
CREATE INDEX idx_success_milestones_wedding_timeline ON success_milestones(wedding_date, days_until_wedding, is_critical_path);

-- Create GIN index for JSONB fields
CREATE INDEX idx_success_milestones_custom_fields ON success_milestones USING GIN (custom_fields);
CREATE INDEX idx_success_milestones_trigger_conditions ON success_milestones USING GIN (trigger_conditions);

-- RLS Policy - Admin access only
ALTER TABLE success_milestones ENABLE ROW LEVEL SECURITY;

-- Policy for organization members to view their milestones
CREATE POLICY "success_milestones_org_select" ON success_milestones
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Policy for organization admins to manage milestones
CREATE POLICY "success_milestones_org_admin_all" ON success_milestones
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

-- Policy for assigned users to update their milestones
CREATE POLICY "success_milestones_assigned_update" ON success_milestones
    FOR UPDATE
    USING (assigned_user_id = auth.uid());

-- Policy for system processes
CREATE POLICY "success_milestones_system_all" ON success_milestones
    FOR ALL
    USING (true); -- System processes can manage all milestones

-- Add trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_success_milestones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Auto-set completion timestamp when status changes to completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
        NEW.progress_percentage = 100;
        
        -- Set actual completion date if not already set
        IF NEW.actual_completion_date IS NULL THEN
            NEW.actual_completion_date = CURRENT_DATE;
        END IF;
    END IF;
    
    -- Auto-set started timestamp when status changes from pending
    IF NEW.status != 'pending' AND OLD.status = 'pending' AND NEW.started_at IS NULL THEN
        NEW.started_at = NOW();
    END IF;
    
    -- Calculate days until wedding if wedding_date is set
    IF NEW.wedding_date IS NOT NULL THEN
        NEW.days_until_wedding = (NEW.wedding_date - CURRENT_DATE);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_success_milestones_updated_at
    BEFORE UPDATE ON success_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_success_milestones_updated_at();

-- Add trigger for insert to set initial values
CREATE OR REPLACE FUNCTION set_success_milestones_initial_values()
RETURNS TRIGGER AS $$
BEGIN
    -- Set days until wedding if wedding_date is provided
    IF NEW.wedding_date IS NOT NULL THEN
        NEW.days_until_wedding = (NEW.wedding_date - CURRENT_DATE);
    END IF;
    
    -- Set started_at if status is not pending
    IF NEW.status != 'pending' AND NEW.started_at IS NULL THEN
        NEW.started_at = NOW();
    END IF;
    
    -- Set completion fields if status is completed
    IF NEW.status = 'completed' THEN
        NEW.completed_at = COALESCE(NEW.completed_at, NOW());
        NEW.progress_percentage = 100;
        IF NEW.actual_completion_date IS NULL THEN
            NEW.actual_completion_date = CURRENT_DATE;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_success_milestones_insert
    BEFORE INSERT ON success_milestones
    FOR EACH ROW
    EXECUTE FUNCTION set_success_milestones_initial_values();

-- Add comments for documentation
COMMENT ON TABLE success_milestones IS 'WS-168: Success milestones for tracking customer achievements and progress';
COMMENT ON COLUMN success_milestones.milestone_type IS 'Type of milestone (onboarding, first_form, guest_list_complete, etc.)';
COMMENT ON COLUMN success_milestones.health_score_impact IS 'How much this milestone affects overall health score (+/- points)';
COMMENT ON COLUMN success_milestones.is_critical_path IS 'Whether this milestone is on the critical path to wedding success';
COMMENT ON COLUMN success_milestones.prerequisite_milestone_ids IS 'Array of milestone IDs that must be completed before this one';
COMMENT ON COLUMN success_milestones.auto_generated IS 'Whether this milestone was automatically created by the system';
COMMENT ON COLUMN success_milestones.trigger_conditions IS 'JSON conditions that automatically create this milestone';

-- Create some default milestone templates (optional - can be populated later)
INSERT INTO success_milestones (
    client_id, organization_id, milestone_type, milestone_category, milestone_name, milestone_description,
    priority, health_score_impact, engagement_score_impact, progress_score_impact, is_critical_path, auto_generated
) 
SELECT 
    c.id, c.organization_id, 'onboarding_complete', 'onboarding', 'Complete Initial Onboarding', 
    'Finish setting up basic wedding details and profile information',
    'high', 15.0, 20.0, 25.0, true, true
FROM clients c 
WHERE NOT EXISTS (
    SELECT 1 FROM success_milestones sm 
    WHERE sm.client_id = c.id AND sm.milestone_type = 'onboarding_complete'
);