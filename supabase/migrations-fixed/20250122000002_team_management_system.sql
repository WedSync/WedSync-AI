-- WARNING: This migration references tables that may not exist: teams
-- Ensure these tables are created first

-- Team Management System Migration
-- Created for WS-073: Team Management - Wedding Business Collaboration
-- Migration: 20250122000002

BEGIN;

-- ==============================================
-- TEAM ROLES ENUM
-- ==============================================

CREATE TYPE team_role AS ENUM (
    'owner',           -- Full access, billing, team management
    'senior_photographer', -- Full client management, forms, analytics
    'photographer',    -- Assigned client management only
    'coordinator',     -- Analytics and reporting only
    'viewer'           -- Read-only access
);

-- ==============================================
-- TEAMS TABLE
-- ==============================================

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Business metadata
    business_type TEXT DEFAULT 'photography',
    subscription_plan TEXT DEFAULT 'professional',
    max_team_members INTEGER DEFAULT 10,
    
    -- Settings
    settings JSONB DEFAULT '{
        "allow_invitations": true,
        "require_approval": true,
        "default_role": "viewer"
    }'::jsonb,
    
    CONSTRAINT teams_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 100)
);

-- ==============================================
-- TEAM MEMBERS TABLE
-- ==============================================

CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL, -- For invitations before user signup
    role team_role NOT NULL DEFAULT 'viewer',
    status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
    
    -- Invitation details
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    
    -- Access permissions
    permissions JSONB DEFAULT '{
        "clients": {"read": true, "write": false, "delete": false},
        "analytics": {"read": false, "write": false},
        "forms": {"read": false, "write": false, "delete": false},
        "billing": {"read": false, "write": false},
        "team": {"read": false, "write": false, "invite": false}
    }'::jsonb,
    
    -- Client assignments (for photographers)
    assigned_clients UUID[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(team_id, user_id),
    UNIQUE(team_id, email)
);

-- ==============================================
-- TEAM INVITATIONS TABLE
-- ==============================================

CREATE TABLE team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role team_role NOT NULL DEFAULT 'viewer',
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Invitation tokens
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES auth.users(id),
    
    -- Metadata
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(team_id, email)
);

-- ==============================================
-- TEAM PERMISSIONS TABLE
-- ==============================================

CREATE TABLE team_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role team_role NOT NULL,
    resource TEXT NOT NULL, -- 'clients', 'analytics', 'forms', 'billing', 'team'
    action TEXT NOT NULL,   -- 'read', 'write', 'delete', 'invite', 'manage'
    allowed BOOLEAN NOT NULL DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(role, resource, action)
);

-- ==============================================
-- TEAM ACTIVITY LOG
-- ==============================================

CREATE TABLE team_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    resource TEXT,
    resource_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Teams
CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_teams_created_at ON teams(created_at);

-- Team Members
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_email ON team_members(email);
CREATE INDEX idx_team_members_status ON team_members(status);
CREATE INDEX idx_team_members_role ON team_members(role);
CREATE INDEX idx_team_members_last_active ON team_members(last_active_at);

-- Team Invitations
CREATE INDEX idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_token ON team_invitations(token);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);
CREATE INDEX idx_team_invitations_expires_at ON team_invitations(expires_at);

-- Team Permissions
CREATE INDEX idx_team_permissions_role ON team_permissions(role);
CREATE INDEX idx_team_permissions_resource ON team_permissions(resource);

-- Team Activity Log
CREATE INDEX idx_team_activity_team_id ON team_activity_log(team_id);
CREATE INDEX idx_team_activity_user_id ON team_activity_log(user_id);
CREATE INDEX idx_team_activity_created_at ON team_activity_log(created_at);
CREATE INDEX idx_team_activity_action ON team_activity_log(action);

-- ==============================================
-- DEFAULT TEAM PERMISSIONS
-- ==============================================

INSERT INTO team_permissions (role, resource, action, allowed) VALUES
-- Owner permissions (full access)
('owner', 'clients', 'read', true),
('owner', 'clients', 'write', true),
('owner', 'clients', 'delete', true),
('owner', 'analytics', 'read', true),
('owner', 'analytics', 'write', true),
('owner', 'forms', 'read', true),
('owner', 'forms', 'write', true),
('owner', 'forms', 'delete', true),
('owner', 'billing', 'read', true),
('owner', 'billing', 'write', true),
('owner', 'team', 'read', true),
('owner', 'team', 'write', true),
('owner', 'team', 'invite', true),
('owner', 'team', 'manage', true),

-- Senior Photographer permissions
('senior_photographer', 'clients', 'read', true),
('senior_photographer', 'clients', 'write', true),
('senior_photographer', 'clients', 'delete', false),
('senior_photographer', 'analytics', 'read', true),
('senior_photographer', 'analytics', 'write', false),
('senior_photographer', 'forms', 'read', true),
('senior_photographer', 'forms', 'write', true),
('senior_photographer', 'forms', 'delete', false),
('senior_photographer', 'billing', 'read', false),
('senior_photographer', 'billing', 'write', false),
('senior_photographer', 'team', 'read', true),
('senior_photographer', 'team', 'write', false),
('senior_photographer', 'team', 'invite', false),
('senior_photographer', 'team', 'manage', false),

-- Photographer permissions (limited to assigned clients)
('photographer', 'clients', 'read', true),
('photographer', 'clients', 'write', true),
('photographer', 'clients', 'delete', false),
('photographer', 'analytics', 'read', false),
('photographer', 'analytics', 'write', false),
('photographer', 'forms', 'read', true),
('photographer', 'forms', 'write', true),
('photographer', 'forms', 'delete', false),
('photographer', 'billing', 'read', false),
('photographer', 'billing', 'write', false),
('photographer', 'team', 'read', true),
('photographer', 'team', 'write', false),
('photographer', 'team', 'invite', false),
('photographer', 'team', 'manage', false),

-- Coordinator permissions (analytics focus)
('coordinator', 'clients', 'read', true),
('coordinator', 'clients', 'write', false),
('coordinator', 'clients', 'delete', false),
('coordinator', 'analytics', 'read', true),
('coordinator', 'analytics', 'write', false),
('coordinator', 'forms', 'read', true),
('coordinator', 'forms', 'write', false),
('coordinator', 'forms', 'delete', false),
('coordinator', 'billing', 'read', false),
('coordinator', 'billing', 'write', false),
('coordinator', 'team', 'read', true),
('coordinator', 'team', 'write', false),
('coordinator', 'team', 'invite', false),
('coordinator', 'team', 'manage', false),

-- Viewer permissions (read-only)
('viewer', 'clients', 'read', true),
('viewer', 'clients', 'write', false),
('viewer', 'clients', 'delete', false),
('viewer', 'analytics', 'read', false),
('viewer', 'analytics', 'write', false),
('viewer', 'forms', 'read', true),
('viewer', 'forms', 'write', false),
('viewer', 'forms', 'delete', false),
('viewer', 'billing', 'read', false),
('viewer', 'billing', 'write', false),
('viewer', 'team', 'read', true),
('viewer', 'team', 'write', false),
('viewer', 'team', 'invite', false),
('viewer', 'team', 'manage', false);

-- ==============================================
-- ROW LEVEL SECURITY POLICIES
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_activity_log ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Users can view teams they own or are members of" ON teams
    FOR SELECT USING (
        owner_id = ( SELECT auth.uid() ) OR
        id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = ( SELECT auth.uid() ) AND status = 'active'
        )
    );

CREATE POLICY "Only team owners can create teams" ON teams
    FOR INSERT WITH CHECK (owner_id = ( SELECT auth.uid() ));

CREATE POLICY "Only team owners can update their teams" ON teams
    FOR UPDATE USING (owner_id = ( SELECT auth.uid() ));

CREATE POLICY "Only team owners can delete their teams" ON teams
    FOR DELETE USING (owner_id = ( SELECT auth.uid() ));

-- Team members policies
CREATE POLICY "Users can view team members of their teams" ON team_members
    FOR SELECT USING (
        team_id IN (
            SELECT id FROM teams WHERE owner_id = ( SELECT auth.uid() )
            UNION
            SELECT team_id FROM team_members WHERE user_id = ( SELECT auth.uid() ) AND status = 'active'
        )
    );

CREATE POLICY "Only team owners and admins can manage team members" ON team_members
    FOR ALL USING (
        team_id IN (
            SELECT id FROM teams WHERE owner_id = ( SELECT auth.uid() )
        )
    );

-- Team invitations policies
CREATE POLICY "Users can view invitations for their teams" ON team_invitations
    FOR SELECT USING (
        team_id IN (
            SELECT id FROM teams WHERE owner_id = ( SELECT auth.uid() )
        ) OR
        email = auth.email()
    );

CREATE POLICY "Only team owners can create invitations" ON team_invitations
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT id FROM teams WHERE owner_id = ( SELECT auth.uid() )
        )
    );

CREATE POLICY "Only team owners can update invitations" ON team_invitations
    FOR UPDATE USING (
        team_id IN (
            SELECT id FROM teams WHERE owner_id = ( SELECT auth.uid() )
        )
    );

-- Team permissions are public (read-only reference data)
CREATE POLICY "Team permissions are readable by all authenticated users" ON team_permissions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Team activity log policies
CREATE POLICY "Users can view activity logs for their teams" ON team_activity_log
    FOR SELECT USING (
        team_id IN (
            SELECT id FROM teams WHERE owner_id = ( SELECT auth.uid() )
            UNION
            SELECT team_id FROM team_members WHERE user_id = ( SELECT auth.uid() ) AND status = 'active'
        )
    );

CREATE POLICY "System can insert activity logs" ON team_activity_log
    FOR INSERT WITH CHECK (true);

-- ==============================================
-- TRIGGERS FOR UPDATED_AT
-- ==============================================

-- Teams
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_invitations_updated_at BEFORE UPDATE ON team_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- FUNCTIONS FOR TEAM MANAGEMENT
-- ==============================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION has_team_permission(
    p_team_id UUID,
    p_user_id UUID,
    p_resource TEXT,
    p_action TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    user_role team_role;
    permission_granted BOOLEAN := false;
BEGIN
    -- Get user's role in the team
    SELECT role INTO user_role
    FROM team_members
    WHERE team_id = p_team_id 
    AND user_id = p_user_id 
    AND status = 'active';
    
    -- If user is not a team member, check if they're the team owner
    IF user_role IS NULL THEN
        SELECT 'owner' INTO user_role
        FROM teams
        WHERE id = p_team_id AND owner_id = p_user_id;
    END IF;
    
    -- If still no role found, return false
    IF user_role IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check permission
    SELECT allowed INTO permission_granted
    FROM team_permissions
    WHERE role = user_role
    AND resource = p_resource
    AND action = p_action;
    
    RETURN COALESCE(permission_granted, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log team activity
CREATE OR REPLACE FUNCTION log_team_activity(
    p_team_id UUID,
    p_user_id UUID,
    p_action TEXT,
    p_resource TEXT DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO team_activity_log (
        team_id, user_id, action, resource, resource_id, details
    ) VALUES (
        p_team_id, p_user_id, p_action, p_resource, p_resource_id, p_details
    ) RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept team invitation
CREATE OR REPLACE FUNCTION accept_team_invitation(
    p_token TEXT,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    invitation RECORD;
    member_id UUID;
    result JSONB;
BEGIN
    -- Get invitation details
    SELECT * INTO invitation
    FROM team_invitations
    WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid or expired invitation'
        );
    END IF;
    
    -- Check if user email matches invitation
    IF invitation.email != (SELECT email FROM auth.users WHERE id = p_user_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Email mismatch'
        );
    END IF;
    
    -- Create team member record
    INSERT INTO team_members (
        team_id, user_id, email, role, status, invited_by, accepted_at
    ) VALUES (
        invitation.team_id, p_user_id, invitation.email, 
        invitation.role, 'active', invitation.invited_by, NOW()
    ) RETURNING id INTO member_id;
    
    -- Update invitation status
    UPDATE team_invitations 
    SET status = 'accepted', accepted_at = NOW(), accepted_by = p_user_id
    WHERE id = invitation.id;
    
    -- Log activity
    PERFORM log_team_activity(
        invitation.team_id, p_user_id, 'invitation_accepted',
        'team_member', member_id,
        jsonb_build_object('role', invitation.role)
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'team_id', invitation.team_id,
        'member_id', member_id,
        'role', invitation.role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;