-- WS-156 Task Creation System Extensions
-- Team B Implementation: Enhanced task creation with templates, security, and conflict detection
-- Revolutionary security and performance optimizations

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- PART 1: TASK TEMPLATES SYSTEM EXTENSIONS
-- =====================================================

-- Extend existing task_templates table with WS-156 requirements
ALTER TABLE task_templates 
ADD COLUMN IF NOT EXISTS priority task_priority DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS estimated_duration INTEGER, -- in minutes for templates
ADD COLUMN IF NOT EXISTS timeline_offset_days INTEGER DEFAULT 0, -- days before wedding
ADD COLUMN IF NOT EXISTS dependencies TEXT[] DEFAULT '{}', -- template IDs this depends on
ADD COLUMN IF NOT EXISTS vendor_types TEXT[] DEFAULT '{}', -- vendor types this applies to
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS success_rate NUMERIC(5,2) DEFAULT 0.00 CHECK (success_rate >= 0 AND success_rate <= 100);

-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_task_templates_organization_public 
ON task_templates(organization_id, is_public) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_task_templates_category_usage 
ON task_templates(category, usage_count DESC) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_task_templates_search 
ON task_templates USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- =====================================================
-- PART 2: ENHANCED WORKFLOW TASKS EXTENSIONS
-- =====================================================

-- Extend workflow_tasks with WS-156 requirements
ALTER TABLE workflow_tasks 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES task_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS dependencies TEXT[] DEFAULT '{}', -- task IDs this depends on
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_critical_path BOOLEAN DEFAULT false;

-- Add performance indexes for task operations
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_wedding_status 
ON workflow_tasks(wedding_id, status) WHERE status IN ('todo', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_deadline_priority 
ON workflow_tasks(deadline, priority) WHERE status != 'completed';

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assigned_deadline 
ON workflow_tasks(assigned_to, deadline) WHERE status IN ('todo', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_template 
ON workflow_tasks(template_id) WHERE template_id IS NOT NULL;

-- =====================================================
-- PART 3: TASK SECURITY AND AUDIT SYSTEM
-- =====================================================

-- Task audit log for comprehensive security tracking
CREATE TABLE IF NOT EXISTS task_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  wedding_id UUID REFERENCES weddings(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('task', 'task_template', 'dependency')),
  resource_id UUID,
  data_snapshot JSONB,
  result_snapshot JSONB,
  ip_address INET,
  user_agent TEXT,
  request_id UUID,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log indexes for security monitoring
CREATE INDEX IF NOT EXISTS idx_task_audit_user_action 
ON task_audit_log(user_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_audit_resource 
ON task_audit_log(resource_type, resource_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_audit_severity 
ON task_audit_log(severity, created_at DESC) WHERE severity IN ('high', 'critical');

CREATE INDEX IF NOT EXISTS idx_task_audit_wedding 
ON task_audit_log(wedding_id, created_at DESC) WHERE wedding_id IS NOT NULL;

-- Security alerts table for real-time monitoring
CREATE TABLE IF NOT EXISTS task_security_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID REFERENCES auth.users(id),
  resource_id UUID,
  details JSONB NOT NULL DEFAULT '{}',
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security alerts indexes
CREATE INDEX IF NOT EXISTS idx_task_security_alerts_unresolved 
ON task_security_alerts(severity, created_at DESC) WHERE is_resolved = false;

CREATE INDEX IF NOT EXISTS idx_task_security_alerts_user 
ON task_security_alerts(user_id, created_at DESC);

-- =====================================================
-- PART 4: TASK CONFLICT DETECTION SYSTEM
-- =====================================================

-- Task conflicts tracking for timing optimization
CREATE TABLE IF NOT EXISTS task_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('overlap', 'buffer_violation', 'critical_path_conflict', 'resource_conflict')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  conflicting_tasks UUID[] NOT NULL DEFAULT '{}',
  proposed_resolution JSONB,
  actual_buffer INTEGER, -- in minutes
  required_buffer INTEGER, -- in minutes
  impact_assessment JSONB,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_applied JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task conflicts indexes
CREATE INDEX IF NOT EXISTS idx_task_conflicts_wedding_unresolved 
ON task_conflicts(wedding_id, is_resolved, severity DESC);

CREATE INDEX IF NOT EXISTS idx_task_conflicts_tasks 
ON task_conflicts USING gin(conflicting_tasks);

-- =====================================================
-- PART 5: PERFORMANCE OPTIMIZATION FUNCTIONS
-- =====================================================

-- Function to increment template usage atomically
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE task_templates 
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate task success rate for templates
CREATE OR REPLACE FUNCTION calculate_template_success_rate(template_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  success_rate NUMERIC;
BEGIN
  -- Count total tasks created from this template
  SELECT COUNT(*) INTO total_tasks
  FROM workflow_tasks 
  WHERE template_id = calculate_template_success_rate.template_id;
  
  -- Count completed tasks
  SELECT COUNT(*) INTO completed_tasks
  FROM workflow_tasks 
  WHERE template_id = calculate_template_success_rate.template_id 
    AND status = 'completed';
  
  -- Calculate success rate
  IF total_tasks > 0 THEN
    success_rate := (completed_tasks::NUMERIC / total_tasks::NUMERIC) * 100;
  ELSE
    success_rate := 0;
  END IF;
  
  -- Update the template with new success rate
  UPDATE task_templates 
  SET success_rate = calculate_template_success_rate.success_rate,
      updated_at = NOW()
  WHERE id = template_id;
  
  RETURN success_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect task timing conflicts
CREATE OR REPLACE FUNCTION detect_task_conflicts(
  p_wedding_id UUID,
  p_task_deadline TIMESTAMP WITH TIME ZONE,
  p_estimated_duration INTEGER, -- in hours
  p_buffer_time INTEGER DEFAULT 0, -- in hours
  p_exclude_task_id UUID DEFAULT NULL
)
RETURNS TABLE(
  conflicting_task_id UUID,
  conflict_type TEXT,
  severity TEXT,
  overlap_minutes INTEGER
) AS $$
DECLARE
  task_start TIMESTAMP WITH TIME ZONE;
  task_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate task time window
  task_end := p_task_deadline;
  task_start := task_end - (p_estimated_duration || ' hours')::INTERVAL - (p_buffer_time || ' hours')::INTERVAL;
  
  -- Find overlapping tasks
  RETURN QUERY
  SELECT 
    wt.id as conflicting_task_id,
    'overlap'::TEXT as conflict_type,
    CASE 
      WHEN wt.priority = 'critical' THEN 'critical'::TEXT
      WHEN wt.priority = 'high' THEN 'high'::TEXT
      ELSE 'medium'::TEXT
    END as severity,
    GREATEST(
      EXTRACT(EPOCH FROM (
        LEAST(task_end, wt.deadline) - 
        GREATEST(task_start, wt.deadline - (wt.estimated_duration || ' hours')::INTERVAL)
      ))::INTEGER / 60,
      0
    ) as overlap_minutes
  FROM workflow_tasks wt
  WHERE wt.wedding_id = p_wedding_id
    AND wt.status IN ('todo', 'in_progress')
    AND (p_exclude_task_id IS NULL OR wt.id != p_exclude_task_id)
    AND (
      -- Check for time overlap
      (task_start, task_end) OVERLAPS (
        wt.deadline - (wt.estimated_duration || ' hours')::INTERVAL,
        wt.deadline
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 6: ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE task_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_conflicts ENABLE ROW LEVEL SECURITY;

-- RLS policy for task_audit_log (admins and organization members)
CREATE POLICY task_audit_log_access_policy ON task_audit_log
  FOR SELECT 
  USING (
    -- Admin users can see all
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'admin'
    OR
    -- Organization members can see their organization's logs
    user_id IN (
      SELECT u.id FROM auth.users u 
      JOIN user_profiles up ON up.user_id = u.id 
      WHERE up.organization_id = (
        SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- RLS policy for task_security_alerts
CREATE POLICY task_security_alerts_access_policy ON task_security_alerts
  FOR ALL
  USING (
    -- Admin users can manage all alerts
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'admin'
    OR
    -- Organization admins can see their organization's alerts
    (
      (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'organization_admin'
      AND user_id IN (
        SELECT u.id FROM auth.users u 
        JOIN user_profiles up ON up.user_id = u.id 
        WHERE up.organization_id = (
          SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
        )
      )
    )
  );

-- RLS policy for task_conflicts
CREATE POLICY task_conflicts_access_policy ON task_conflicts
  FOR ALL
  USING (
    -- Users can access conflicts for weddings they have access to
    wedding_id IN (
      SELECT w.id FROM weddings w
      JOIN clients c ON c.wedding_id = w.id
      JOIN user_profiles up ON up.organization_id = c.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

-- =====================================================
-- PART 7: PERFORMANCE MONITORING VIEWS
-- =====================================================

-- View for task performance metrics
CREATE OR REPLACE VIEW task_performance_metrics AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as tasks_created,
  COUNT(*) FILTER (WHERE status = 'completed') as tasks_completed,
  COUNT(*) FILTER (WHERE deadline < NOW() AND status != 'completed') as overdue_tasks,
  AVG(estimated_duration) as avg_estimated_duration,
  AVG(CASE 
    WHEN completion_date IS NOT NULL AND start_date IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (completion_date - start_date))/3600 
  END) as avg_actual_duration
FROM workflow_tasks
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- View for template usage analytics
CREATE OR REPLACE VIEW template_usage_analytics AS
SELECT 
  tt.id,
  tt.name,
  tt.category,
  tt.usage_count,
  tt.success_rate,
  COUNT(wt.id) as total_tasks_generated,
  COUNT(wt.id) FILTER (WHERE wt.status = 'completed') as completed_tasks,
  COUNT(wt.id) FILTER (WHERE wt.deadline < NOW() AND wt.status != 'completed') as overdue_tasks,
  AVG(wt.estimated_duration) as avg_task_duration
FROM task_templates tt
LEFT JOIN workflow_tasks wt ON wt.template_id = tt.id
WHERE tt.is_active = true
GROUP BY tt.id, tt.name, tt.category, tt.usage_count, tt.success_rate
ORDER BY tt.usage_count DESC;

-- View for security monitoring
CREATE OR REPLACE VIEW task_security_summary AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_operations,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_operations,
  COUNT(*) FILTER (WHERE severity = 'high') as high_severity_operations,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT wedding_id) as unique_weddings
FROM task_audit_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- =====================================================
-- PART 8: TRIGGERS FOR AUTOMATED MAINTENANCE
-- =====================================================

-- Trigger to update template success rates automatically
CREATE OR REPLACE FUNCTION update_template_success_rate_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if status changed to 'completed' or from 'completed'
  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) OR TG_OP = 'INSERT' THEN
    -- Update success rate if template_id exists
    IF NEW.template_id IS NOT NULL THEN
      PERFORM calculate_template_success_rate(NEW.template_id);
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on workflow_tasks
DROP TRIGGER IF EXISTS trigger_update_template_success_rate ON workflow_tasks;
CREATE TRIGGER trigger_update_template_success_rate
  AFTER INSERT OR UPDATE OF status ON workflow_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_template_success_rate_trigger();

-- Trigger to automatically detect conflicts on task creation/update
CREATE OR REPLACE FUNCTION detect_conflicts_trigger()
RETURNS TRIGGER AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Only check for conflicts on INSERT or deadline/duration changes
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
    OLD.deadline != NEW.deadline OR 
    OLD.estimated_duration != NEW.estimated_duration OR
    OLD.buffer_time != NEW.buffer_time
  )) THEN
    
    -- Check for conflicts
    SELECT COUNT(*) INTO conflict_count
    FROM detect_task_conflicts(
      NEW.wedding_id,
      NEW.deadline,
      NEW.estimated_duration,
      COALESCE(NEW.buffer_time, 0),
      NEW.id
    );
    
    -- Create conflict record if conflicts found
    IF conflict_count > 0 THEN
      INSERT INTO task_conflicts (
        wedding_id,
        conflict_type,
        severity,
        conflicting_tasks,
        actual_buffer,
        required_buffer
      )
      SELECT 
        NEW.wedding_id,
        'overlap',
        'medium', -- Default severity, can be updated by application logic
        ARRAY[NEW.id, dt.conflicting_task_id],
        COALESCE(NEW.buffer_time, 0) * 60, -- Convert to minutes
        (dt.overlap_minutes + 30) -- Suggested additional buffer
      FROM detect_task_conflicts(
        NEW.wedding_id,
        NEW.deadline,
        NEW.estimated_duration,
        COALESCE(NEW.buffer_time, 0),
        NEW.id
      ) dt
      ON CONFLICT DO NOTHING; -- Avoid duplicate conflicts
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create conflict detection trigger
DROP TRIGGER IF EXISTS trigger_detect_conflicts ON workflow_tasks;
CREATE TRIGGER trigger_detect_conflicts
  AFTER INSERT OR UPDATE OF deadline, estimated_duration, buffer_time ON workflow_tasks
  FOR EACH ROW
  EXECUTE FUNCTION detect_conflicts_trigger();

-- =====================================================
-- PART 9: DATA CLEANUP AND MAINTENANCE
-- =====================================================

-- Function to clean up old audit logs (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_task_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM task_audit_log 
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND severity NOT IN ('high', 'critical');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup operation
  INSERT INTO task_audit_log (
    user_id, action, resource_type, severity, metadata
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', -- System user
    'cleanup_audit_logs',
    'task',
    'low',
    json_build_object('deleted_count', deleted_count)
  );
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 10: INITIAL DATA SEEDING
-- =====================================================

-- Insert default system templates (if they don't exist)
INSERT INTO task_templates (
  name, description, category, priority, estimated_duration, timeline_offset_days,
  dependencies, vendor_types, organization_id, is_public, created_by
) VALUES 
  -- Venue management templates
  (
    'Venue Site Visit and Assessment',
    'Comprehensive venue evaluation including capacity, layout, accessibility, and logistical requirements',
    'venue_setup',
    'high',
    180, -- 3 hours in minutes
    60, -- 60 days before wedding
    '{}',
    '{"venue"}',
    NULL, -- Public template
    true,
    '00000000-0000-0000-0000-000000000000' -- System user
  ),
  (
    'Vendor Contract Review and Negotiation',
    'Review vendor contracts, negotiate terms, and ensure compliance with requirements',
    'vendor_management',
    'high',
    120, -- 2 hours
    45, -- 45 days before
    '{}',
    '{"catering", "photography", "florist", "music"}',
    NULL,
    true,
    '00000000-0000-0000-0000-000000000000'
  ),
  (
    'Final Timeline Confirmation',
    'Confirm all timing details with vendors and create detailed day-of timeline',
    'timeline_planning',
    'critical',
    90, -- 1.5 hours
    7, -- 1 week before
    '{}',
    '{}',
    NULL,
    true,
    '00000000-0000-0000-0000-000000000000'
  )
ON CONFLICT (name) DO NOTHING; -- Avoid duplicates if migration runs multiple times

-- =====================================================
-- PART 11: PERFORMANCE VALIDATION
-- =====================================================

-- Analyze tables for query optimization
ANALYZE task_templates;
ANALYZE workflow_tasks;
ANALYZE task_audit_log;
ANALYZE task_conflicts;

-- Create statistics for better query planning
CREATE STATISTICS IF NOT EXISTS task_templates_correlation_stats 
ON organization_id, category, is_public FROM task_templates;

CREATE STATISTICS IF NOT EXISTS workflow_tasks_correlation_stats 
ON wedding_id, status, deadline FROM workflow_tasks;

-- =====================================================
-- MIGRATION COMPLETION LOG
-- =====================================================

-- Log successful migration completion
DO $$
BEGIN
  -- Create a record of this migration
  INSERT INTO task_audit_log (
    user_id, action, resource_type, severity, metadata
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'migration_ws156_completed',
    'task',
    'low',
    json_build_object(
      'migration_file', '20250827075628_ws156_task_creation_system_extensions.sql',
      'features_added', ARRAY[
        'task_templates_extensions',
        'workflow_tasks_extensions', 
        'security_audit_system',
        'conflict_detection_system',
        'performance_optimization',
        'rls_policies',
        'monitoring_views',
        'automated_triggers'
      ],
      'tables_created', ARRAY[
        'task_audit_log',
        'task_security_alerts', 
        'task_conflicts'
      ],
      'functions_created', ARRAY[
        'increment_template_usage',
        'calculate_template_success_rate',
        'detect_task_conflicts',
        'cleanup_task_audit_logs'
      ]
    )
  );
  
  RAISE NOTICE 'WS-156 Task Creation System Extensions migration completed successfully';
END $$;