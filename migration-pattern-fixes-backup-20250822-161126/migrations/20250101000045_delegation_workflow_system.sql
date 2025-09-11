-- Delegation Workflow System Migration
-- WS-058: Role-based delegation workflow with approval processes

-- Create enum types for roles and permissions
CREATE TYPE user_role AS ENUM (
  'admin', 'wedding_planner', 'senior_coordinator', 
  'coordinator', 'specialist', 'vendor', 'client'
);

CREATE TYPE delegation_type AS ENUM ('assignment', 'approval', 'review', 'collaboration');
CREATE TYPE delegation_status AS ENUM ('pending', 'approved', 'rejected', 'auto_approved');
CREATE TYPE workflow_type AS ENUM (
  'task_creation', 'task_assignment', 'deadline_change', 
  'priority_change', 'resource_allocation'
);
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Update team_members table to include role hierarchy
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS user_role user_role DEFAULT 'coordinator',
ADD COLUMN IF NOT EXISTS authority_level INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS reports_to UUID REFERENCES team_members(id),
ADD COLUMN IF NOT EXISTS can_delegate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_delegation_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS approval_authority TEXT[] DEFAULT '{}';

-- Team hierarchy table
CREATE TABLE team_hierarchy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES team_hierarchy(id),
  user_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'coordinator',
  level INTEGER NOT NULL DEFAULT 1,
  reports_to UUID REFERENCES team_members(id),
  can_approve_for UUID[] DEFAULT '{}',
  department TEXT,
  specializations TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Delegation requests table
CREATE TABLE delegation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES team_members(id),
  to_user_id UUID NOT NULL REFERENCES team_members(id),
  delegated_by UUID NOT NULL REFERENCES team_members(id),
  delegation_type delegation_type NOT NULL DEFAULT 'assignment',
  authority_level INTEGER NOT NULL DEFAULT 1,
  deadline TIMESTAMP WITH TIME ZONE,
  instructions TEXT,
  status delegation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  response_notes TEXT,
  auto_approved BOOLEAN DEFAULT false
);

-- Workflow approvals table
CREATE TABLE workflow_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_type workflow_type NOT NULL,
  entity_id UUID NOT NULL, -- Task ID, etc.
  requested_by UUID NOT NULL REFERENCES team_members(id),
  approver_id UUID NOT NULL REFERENCES team_members(id),
  status approval_status NOT NULL DEFAULT 'pending',
  request_data JSONB NOT NULL DEFAULT '{}',
  approval_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Role permissions table (for flexible permission management)
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role user_role NOT NULL,
  permission_name TEXT NOT NULL,
  permission_scope TEXT DEFAULT 'all', -- 'all', 'own', 'team', 'department'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, permission_name, permission_scope)
);

-- User-specific permission overrides
CREATE TABLE user_permission_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  permission_name TEXT NOT NULL,
  permission_scope TEXT DEFAULT 'all',
  granted BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID NOT NULL REFERENCES team_members(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_team_hierarchy_user_id ON team_hierarchy(user_id);
CREATE INDEX idx_team_hierarchy_parent_id ON team_hierarchy(parent_id);
CREATE INDEX idx_team_hierarchy_reports_to ON team_hierarchy(reports_to);
CREATE INDEX idx_delegation_requests_task_id ON delegation_requests(task_id);
CREATE INDEX idx_delegation_requests_from_user ON delegation_requests(from_user_id);
CREATE INDEX idx_delegation_requests_to_user ON delegation_requests(to_user_id);
CREATE INDEX idx_delegation_requests_status ON delegation_requests(status);
CREATE INDEX idx_workflow_approvals_approver ON workflow_approvals(approver_id);
CREATE INDEX idx_workflow_approvals_requested_by ON workflow_approvals(requested_by);
CREATE INDEX idx_workflow_approvals_status ON workflow_approvals(status);
CREATE INDEX idx_role_permissions_role ON role_permissions(role);
CREATE INDEX idx_user_permission_overrides_user ON user_permission_overrides(user_id);

-- Insert default role permissions
INSERT INTO role_permissions (role, permission_name, permission_scope) VALUES
-- Admin permissions
('admin', 'create_tasks', 'all'),
('admin', 'edit_tasks', 'all'),
('admin', 'delete_tasks', 'all'),
('admin', 'assign_tasks', 'all'),
('admin', 'view_all_tasks', 'all'),
('admin', 'manage_team', 'all'),
('admin', 'view_team_workload', 'all'),
('admin', 'assign_team_members', 'all'),
('admin', 'manage_workflows', 'all'),
('admin', 'approve_delegations', 'all'),
('admin', 'override_assignments', 'all'),
('admin', 'manage_vendors', 'all'),
('admin', 'assign_vendor_tasks', 'all'),
('admin', 'view_client_tasks', 'all'),
('admin', 'approve_client_requests', 'all'),
('admin', 'manage_settings', 'all'),
('admin', 'view_analytics', 'all'),
('admin', 'export_data', 'all'),

-- Wedding Planner permissions
('wedding_planner', 'create_tasks', 'all'),
('wedding_planner', 'edit_tasks', 'all'),
('wedding_planner', 'delete_tasks', 'all'),
('wedding_planner', 'assign_tasks', 'all'),
('wedding_planner', 'view_all_tasks', 'all'),
('wedding_planner', 'manage_team', 'team'),
('wedding_planner', 'view_team_workload', 'all'),
('wedding_planner', 'assign_team_members', 'team'),
('wedding_planner', 'manage_workflows', 'team'),
('wedding_planner', 'approve_delegations', 'team'),
('wedding_planner', 'override_assignments', 'team'),
('wedding_planner', 'manage_vendors', 'all'),
('wedding_planner', 'assign_vendor_tasks', 'all'),
('wedding_planner', 'view_client_tasks', 'all'),
('wedding_planner', 'approve_client_requests', 'all'),
('wedding_planner', 'view_analytics', 'all'),
('wedding_planner', 'export_data', 'team'),

-- Senior Coordinator permissions
('senior_coordinator', 'create_tasks', 'team'),
('senior_coordinator', 'edit_tasks', 'team'),
('senior_coordinator', 'assign_tasks', 'team'),
('senior_coordinator', 'view_all_tasks', 'team'),
('senior_coordinator', 'view_team_workload', 'team'),
('senior_coordinator', 'assign_team_members', 'team'),
('senior_coordinator', 'approve_delegations', 'team'),
('senior_coordinator', 'assign_vendor_tasks', 'team'),
('senior_coordinator', 'view_client_tasks', 'team'),
('senior_coordinator', 'view_analytics', 'team'),

-- Coordinator permissions
('coordinator', 'create_tasks', 'own'),
('coordinator', 'edit_tasks', 'own'),
('coordinator', 'assign_tasks', 'own'),
('coordinator', 'view_all_tasks', 'team'),
('coordinator', 'assign_vendor_tasks', 'own'),
('coordinator', 'view_client_tasks', 'own'),

-- Specialist permissions
('specialist', 'create_tasks', 'own'),
('specialist', 'edit_tasks', 'own'),
('specialist', 'view_client_tasks', 'own'),

-- Vendor permissions
('vendor', 'edit_tasks', 'own'),
('vendor', 'view_client_tasks', 'own'),

-- Client permissions
('client', 'view_client_tasks', 'own'),
('client', 'approve_client_requests', 'own');

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
  user_uuid UUID,
  permission_name TEXT,
  scope_context TEXT DEFAULT 'all'
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_val user_role;
  has_permission BOOLEAN := false;
  override_permission BOOLEAN;
BEGIN
  -- Get user role
  SELECT tm.user_role INTO user_role_val
  FROM team_members tm
  WHERE tm.id = user_uuid;
  
  IF user_role_val IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check for user-specific overrides first
  SELECT upo.granted INTO override_permission
  FROM user_permission_overrides upo
  WHERE upo.user_id = user_uuid 
    AND upo.permission_name = permission_name
    AND (upo.expires_at IS NULL OR upo.expires_at > NOW())
  ORDER BY upo.created_at DESC
  LIMIT 1;
  
  IF override_permission IS NOT NULL THEN
    RETURN override_permission;
  END IF;
  
  -- Check role-based permissions
  SELECT EXISTS(
    SELECT 1 FROM role_permissions rp
    WHERE rp.role = user_role_val
      AND rp.permission_name = permission_name
      AND (rp.permission_scope = 'all' OR rp.permission_scope = scope_context)
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$$ LANGUAGE plpgsql;

-- Function to check delegation authority
CREATE OR REPLACE FUNCTION can_delegate_to_user(
  delegator_id UUID,
  delegatee_id UUID,
  delegation_level INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  delegator_level INTEGER;
  delegatee_level INTEGER;
  max_delegation INTEGER;
  can_delegate BOOLEAN;
BEGIN
  -- Get delegator info
  SELECT tm.authority_level, tm.can_delegate, tm.max_delegation_level
  INTO delegator_level, can_delegate, max_delegation
  FROM team_members tm
  WHERE tm.id = delegator_id;
  
  -- Get delegatee level
  SELECT tm.authority_level INTO delegatee_level
  FROM team_members tm
  WHERE tm.id = delegatee_id;
  
  -- Check if delegation is allowed
  IF NOT can_delegate THEN
    RETURN false;
  END IF;
  
  -- Check if delegation level is within limits
  IF delegation_level > max_delegation THEN
    RETURN false;
  END IF;
  
  -- Check if delegator has higher authority than delegatee
  IF delegator_level <= delegatee_level THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-approve delegations based on rules
CREATE OR REPLACE FUNCTION process_delegation_auto_approval()
RETURNS TRIGGER AS $$
DECLARE
  delegator_level INTEGER;
  delegatee_level INTEGER;
  authority_diff INTEGER;
BEGIN
  -- Get authority levels
  SELECT tm.authority_level INTO delegator_level
  FROM team_members tm WHERE tm.id = NEW.delegated_by;
  
  SELECT tm.authority_level INTO delegatee_level
  FROM team_members tm WHERE tm.id = NEW.to_user_id;
  
  authority_diff := delegator_level - delegatee_level;
  
  -- Auto-approve if authority difference is significant (>20 levels)
  -- or if it's a low-level delegation
  IF authority_diff >= 20 OR NEW.authority_level <= 2 THEN
    NEW.status := 'auto_approved';
    NEW.auto_approved := true;
    NEW.responded_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delegation_auto_approval
  BEFORE INSERT ON delegation_requests
  FOR EACH ROW
  EXECUTE FUNCTION process_delegation_auto_approval();

-- Function to create approval workflow for high-level changes
CREATE OR REPLACE FUNCTION create_workflow_approval(
  workflow_type_val workflow_type,
  entity_id_val UUID,
  requested_by_val UUID,
  request_data_val JSONB
)
RETURNS UUID AS $$
DECLARE
  approval_id UUID;
  approver_id UUID;
  user_level INTEGER;
  required_level INTEGER := 70; -- Default approval level
BEGIN
  -- Get user's authority level
  SELECT tm.authority_level INTO user_level
  FROM team_members tm WHERE tm.id = requested_by_val;
  
  -- Determine required approval level based on workflow type
  CASE workflow_type_val
    WHEN 'deadline_change' THEN required_level := 50;
    WHEN 'priority_change' THEN required_level := 60;
    WHEN 'resource_allocation' THEN required_level := 70;
    WHEN 'task_assignment' THEN required_level := 40;
    ELSE required_level := 70;
  END CASE;
  
  -- If user has sufficient authority, auto-approve
  IF user_level >= required_level THEN
    RETURN NULL; -- No approval needed
  END IF;
  
  -- Find appropriate approver
  SELECT tm.id INTO approver_id
  FROM team_members tm
  WHERE tm.authority_level >= required_level
    AND tm.id != requested_by_val
  ORDER BY tm.authority_level ASC
  LIMIT 1;
  
  IF approver_id IS NULL THEN
    RAISE EXCEPTION 'No suitable approver found';
  END IF;
  
  -- Create approval request
  INSERT INTO workflow_approvals (
    workflow_type, entity_id, requested_by, approver_id, request_data
  ) VALUES (
    workflow_type_val, entity_id_val, requested_by_val, approver_id, request_data_val
  ) RETURNING id INTO approval_id;
  
  RETURN approval_id;
END;
$$ LANGUAGE plpgsql;

-- Function to handle task assignment delegation
CREATE OR REPLACE FUNCTION delegate_task_assignment(
  task_uuid UUID,
  from_user_uuid UUID,
  to_user_uuid UUID,
  delegated_by_uuid UUID,
  delegation_type_val delegation_type DEFAULT 'assignment',
  instructions_val TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  delegation_id UUID;
  can_delegate BOOLEAN;
BEGIN
  -- Check if delegation is allowed
  SELECT can_delegate_to_user(delegated_by_uuid, to_user_uuid, 1) INTO can_delegate;
  
  IF NOT can_delegate THEN
    RAISE EXCEPTION 'User does not have authority to delegate to target user';
  END IF;
  
  -- Create delegation request
  INSERT INTO delegation_requests (
    task_id, from_user_id, to_user_id, delegated_by, 
    delegation_type, instructions
  ) VALUES (
    task_uuid, from_user_uuid, to_user_uuid, delegated_by_uuid,
    delegation_type_val, instructions_val
  ) RETURNING id INTO delegation_id;
  
  -- Create notification
  PERFORM create_task_notification(
    task_uuid,
    to_user_uuid,
    'assignment',
    'Task Delegated to You',
    'A task has been delegated to you by ' || 
    (SELECT name FROM team_members WHERE id = delegated_by_uuid)
  );
  
  RETURN delegation_id;
END;
$$ LANGUAGE plpgsql;

-- Update RLS policies for new tables
ALTER TABLE team_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- Team hierarchy access
CREATE POLICY "Team hierarchy access" ON team_hierarchy
  FOR SELECT USING (
    user_id IN (SELECT id FROM team_members WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM team_members WHERE user_id = auth.uid() AND user_role IN ('admin', 'wedding_planner'))
  );

-- Delegation requests access
CREATE POLICY "Delegation requests access" ON delegation_requests
  FOR SELECT USING (
    from_user_id IN (SELECT id FROM team_members WHERE user_id = auth.uid()) OR
    to_user_id IN (SELECT id FROM team_members WHERE user_id = auth.uid()) OR
    delegated_by IN (SELECT id FROM team_members WHERE user_id = auth.uid())
  );

-- Workflow approvals access
CREATE POLICY "Workflow approvals access" ON workflow_approvals
  FOR SELECT USING (
    requested_by IN (SELECT id FROM team_members WHERE user_id = auth.uid()) OR
    approver_id IN (SELECT id FROM team_members WHERE user_id = auth.uid())
  );

-- Role permissions (read-only for most users)
CREATE POLICY "Role permissions read" ON role_permissions
  FOR SELECT USING (true);

-- User permission overrides
CREATE POLICY "User permission overrides access" ON user_permission_overrides
  FOR SELECT USING (
    user_id IN (SELECT id FROM team_members WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM team_members WHERE user_id = auth.uid() AND user_role IN ('admin', 'wedding_planner'))
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON delegation_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON workflow_approvals TO authenticated;
GRANT SELECT ON role_permissions TO authenticated;
GRANT SELECT ON user_permission_overrides TO authenticated;
GRANT SELECT, INSERT, UPDATE ON team_hierarchy TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;