-- Team Management System (Fixed)
-- Feature: WS-068 - Comprehensive team collaboration and management

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Team Roles and Permissions
CREATE TABLE IF NOT EXISTS team_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}', -- Permission set: {'clients': ['read', 'write'], 'tasks': ['read']}
    is_default BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, role_name)
);

-- Team Members (extends user_profiles with team-specific info)
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role_id UUID REFERENCES team_roles(id) ON DELETE SET NULL,
    
    -- Member details
    display_name VARCHAR(255),
    title VARCHAR(100), -- Job title
    department VARCHAR(100),
    hire_date DATE,
    hourly_rate DECIMAL(8,2),
    skills TEXT[],
    specializations TEXT[],
    
    -- Availability and workload
    weekly_hours INTEGER DEFAULT 40,
    availability_schedule JSONB DEFAULT '{}', -- Weekly schedule
    current_workload_percentage INTEGER DEFAULT 0,
    max_concurrent_tasks INTEGER DEFAULT 5,
    
    -- Contact and preferences
    phone VARCHAR(20),
    emergency_contact JSONB DEFAULT '{}',
    notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}',
    language_preference VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Teams/Groups within organization
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    team_type VARCHAR(50) DEFAULT 'project' CHECK (team_type IN ('project', 'department', 'skill_based', 'client_based')),
    manager_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
    
    -- Team settings
    max_members INTEGER,
    is_public BOOLEAN DEFAULT true, -- Can other org members see this team
    requires_approval BOOLEAN DEFAULT false, -- Manager approval for joining
    
    -- Communication settings
    default_communication_channel VARCHAR(100), -- Slack channel, email group, etc.
    meeting_schedule JSONB DEFAULT '{}', -- Regular meeting schedule
    
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES team_members(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- Team Memberships
CREATE TABLE IF NOT EXISTS team_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    role_in_team VARCHAR(50) DEFAULT 'member' CHECK (role_in_team IN ('member', 'lead', 'coordinator', 'observer')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    invited_by UUID REFERENCES team_members(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(team_id, member_id)
);

-- Performance Reviews and Evaluations
CREATE TABLE IF NOT EXISTS performance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    
    -- Review details
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    review_type VARCHAR(50) DEFAULT 'annual' CHECK (review_type IN ('annual', 'quarterly', 'project_based', 'probation')),
    
    -- Ratings and feedback
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    goals_achievement_rating INTEGER CHECK (goals_achievement_rating >= 1 AND goals_achievement_rating <= 5),
    teamwork_rating INTEGER CHECK (teamwork_rating >= 1 AND teamwork_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    
    -- Comments
    strengths TEXT,
    areas_for_improvement TEXT,
    goals_for_next_period TEXT,
    reviewer_comments TEXT,
    reviewee_self_assessment TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved', 'completed')),
    due_date DATE,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time Off/Leave Requests
CREATE TABLE IF NOT EXISTS time_off_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    
    -- Request details
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('vacation', 'sick', 'personal', 'bereavement', 'maternity', 'paternity', 'unpaid')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(3,1), -- Can be half days
    reason TEXT,
    
    -- Approval workflow
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
    approved_by UUID REFERENCES team_members(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    
    -- Coverage
    coverage_arranged BOOLEAN DEFAULT false,
    coverage_notes TEXT,
    backup_assigned UUID REFERENCES team_members(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Activity Log
CREATE TABLE IF NOT EXISTS team_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
    target_id UUID, -- Generic ID for any target (member, team, etc.)
    target_type VARCHAR(50), -- 'member', 'team', 'role', etc.
    
    action VARCHAR(100) NOT NULL, -- 'member_added', 'role_changed', 'task_assigned', etc.
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_roles_organization_id ON team_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_organization_id ON team_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role_id ON team_members(role_id);
CREATE INDEX IF NOT EXISTS idx_team_members_is_active ON team_members(is_active);

CREATE INDEX IF NOT EXISTS idx_teams_organization_id ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_manager_id ON teams(manager_id);
CREATE INDEX IF NOT EXISTS idx_teams_is_active ON teams(is_active);

CREATE INDEX IF NOT EXISTS idx_team_memberships_team_id ON team_memberships(team_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_member_id ON team_memberships(member_id);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewee_id ON performance_reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer_id ON performance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON performance_reviews(status);

CREATE INDEX IF NOT EXISTS idx_time_off_requests_member_id ON time_off_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_status ON time_off_requests(status);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_dates ON time_off_requests(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_team_activity_log_organization_id ON team_activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_log_actor_id ON team_activity_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_log_created_at ON team_activity_log(created_at);

-- Enable RLS
ALTER TABLE team_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organization members can view team roles" ON team_roles
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM team_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage team roles" ON team_roles
    FOR ALL USING (
        organization_id IN (
            SELECT tm.organization_id FROM team_members tm
            JOIN team_roles tr ON tr.id = tm.role_id
            WHERE tm.user_id = auth.uid() AND tr.is_admin = true
        )
    );

CREATE POLICY "Organization members can view team members" ON team_members
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM team_members WHERE user_id = auth.uid()
        ) OR user_id = auth.uid()
    );

CREATE POLICY "Users can update their own team profile" ON team_members
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can manage team members" ON team_members
    FOR ALL USING (
        organization_id IN (
            SELECT tm.organization_id FROM team_members tm
            JOIN team_roles tr ON tr.id = tm.role_id
            WHERE tm.user_id = auth.uid() AND tr.is_admin = true
        )
    );

-- Functions for team management (simplified to avoid complex logic)

-- Function to calculate team member workload
CREATE OR REPLACE FUNCTION calculate_member_workload(p_member_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_workload INTEGER := 0;
    v_max_hours INTEGER;
BEGIN
    -- Get member's weekly hours
    SELECT weekly_hours INTO v_max_hours
    FROM team_members
    WHERE id = p_member_id;
    
    -- Simple calculation based on active tasks
    SELECT COUNT(*) * 10 INTO v_workload -- Assume 10% per active task
    FROM tasks t
    JOIN team_members tm ON tm.user_id = t.assigned_to
    WHERE tm.id = p_member_id
    AND t.status IN ('assigned', 'in_progress');
    
    -- Return as percentage (capped at 100%)
    RETURN LEAST(100, v_workload);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get team statistics
CREATE OR REPLACE FUNCTION get_team_stats(p_team_id UUID)
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'total_members', COUNT(tm.*),
        'active_members', COUNT(tm.*) FILTER (WHERE tm.is_active = true)
    ) INTO stats
    FROM team_memberships tm
    WHERE tm.team_id = p_team_id AND tm.is_active = true;
    
    RETURN COALESCE(stats, '{"total_members": 0, "active_members": 0}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log team activity
CREATE OR REPLACE FUNCTION log_team_activity(
    p_organization_id UUID,
    p_actor_id UUID,
    p_target_id UUID,
    p_target_type VARCHAR(50),
    p_action VARCHAR(100),
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
BEGIN
    INSERT INTO team_activity_log (
        organization_id,
        actor_id,
        target_id,
        target_type,
        action,
        description,
        metadata
    ) VALUES (
        p_organization_id,
        p_actor_id,
        p_target_id,
        p_target_type,
        p_action,
        p_description,
        p_metadata
    ) RETURNING id INTO v_activity_id;
    
    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Standard update triggers
CREATE TRIGGER update_team_roles_updated_at BEFORE UPDATE ON team_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_reviews_updated_at BEFORE UPDATE ON performance_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_off_requests_updated_at BEFORE UPDATE ON time_off_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON team_roles TO authenticated;
GRANT ALL ON team_members TO authenticated;
GRANT ALL ON teams TO authenticated;
GRANT ALL ON team_memberships TO authenticated;
GRANT ALL ON performance_reviews TO authenticated;
GRANT ALL ON time_off_requests TO authenticated;
GRANT ALL ON team_activity_log TO authenticated;

GRANT EXECUTE ON FUNCTION calculate_member_workload(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION log_team_activity(UUID, UUID, UUID, VARCHAR, VARCHAR, TEXT, JSONB) TO authenticated;

-- Comments
COMMENT ON TABLE team_roles IS 'Role definitions with permissions for team members';
COMMENT ON TABLE team_members IS 'Extended team member profiles with skills and availability';
COMMENT ON TABLE teams IS 'Team/group organization within companies';
COMMENT ON TABLE team_memberships IS 'Many-to-many relationship between teams and members';
COMMENT ON TABLE performance_reviews IS 'Performance evaluation and review system';
COMMENT ON TABLE time_off_requests IS 'Leave and time-off request management';
COMMENT ON TABLE team_activity_log IS 'Audit trail for team management activities';