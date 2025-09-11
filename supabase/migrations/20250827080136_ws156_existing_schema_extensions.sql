-- WS-156 Task Creation System Extensions (Existing Schema Compatible)
-- Team B Implementation: Extends existing tasks and task_templates tables for WS-156 features
-- Compatible with current database structure

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- PART 1: EXTEND EXISTING TASK_TEMPLATES TABLE
-- =====================================================

-- Add WS-156 specific columns to existing task_templates table
ALTER TABLE task_templates 
ADD COLUMN IF NOT EXISTS timeline_offset_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS vendor_types TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS success_rate NUMERIC(5,2) DEFAULT 0.00;

-- Add indexes for performance optimization on task_templates
CREATE INDEX IF NOT EXISTS idx_task_templates_organization_active 
ON task_templates(organization_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_task_templates_usage_count 
ON task_templates(usage_count DESC) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_task_templates_search 
ON task_templates USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- =====================================================
-- PART 2: EXTEND EXISTING TASKS TABLE  
-- =====================================================

-- Add WS-156 specific columns to existing tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS buffer_time NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_critical_path BOOLEAN DEFAULT false;

-- Add performance indexes for task operations
CREATE INDEX IF NOT EXISTS idx_tasks_client_status 
ON tasks(client_id, status) WHERE status IN ('pending', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_tasks_due_date_priority 
ON tasks(due_date, priority) WHERE status != 'completed';

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_due 
ON tasks(assigned_to, due_date) WHERE status IN ('pending', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_tasks_template 
ON tasks(template_id) WHERE template_id IS NOT NULL;

-- =====================================================
-- PART 3: SECURITY AND AUDIT SYSTEM
-- =====================================================

-- Task audit log for comprehensive security tracking
CREATE TABLE IF NOT EXISTS task_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_task_audit_client 
ON task_audit_log(client_id, created_at DESC) WHERE client_id IS NOT NULL;

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
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_task_conflicts_client_unresolved 
ON task_conflicts(client_id, is_resolved, severity DESC);

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
  SET usage_count = COALESCE(usage_count, 0) + 1,
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
  FROM tasks 
  WHERE template_id = calculate_template_success_rate.template_id;
  
  -- Count completed tasks
  SELECT COUNT(*) INTO completed_tasks
  FROM tasks 
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

-- Function to detect task timing conflicts (adapted for existing schema)
CREATE OR REPLACE FUNCTION detect_task_conflicts(
  p_client_id UUID,
  p_task_due_date TIMESTAMP WITH TIME ZONE,
  p_estimated_hours NUMERIC, -- in hours
  p_buffer_hours NUMERIC DEFAULT 0, -- in hours
  p_exclude_task_id UUID DEFAULT NULL
)
RETURNS TABLE(
  conflicting_task_id UUID,
  conflict_type TEXT,
  severity TEXT,
  overlap_hours NUMERIC
) AS $$
DECLARE
  task_start TIMESTAMP WITH TIME ZONE;
  task_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate task time window
  task_end := p_task_due_date;
  task_start := task_end - (p_estimated_hours || ' hours')::INTERVAL - (p_buffer_hours || ' hours')::INTERVAL;
  
  -- Find overlapping tasks
  RETURN QUERY
  SELECT 
    t.id as conflicting_task_id,
    'overlap'::TEXT as conflict_type,
    CASE 
      WHEN t.priority = 'critical' THEN 'critical'::TEXT
      WHEN t.priority = 'high' THEN 'high'::TEXT
      ELSE 'medium'::TEXT
    END as severity,
    GREATEST(
      EXTRACT(EPOCH FROM (
        LEAST(task_end, t.due_date) - 
        GREATEST(task_start, t.due_date - (COALESCE(t.estimated_hours, 1) || ' hours')::INTERVAL)
      ))::NUMERIC / 3600,
      0
    ) as overlap_hours
  FROM tasks t
  WHERE t.client_id = p_client_id
    AND t.status IN ('pending', 'in_progress', 'assigned')
    AND (p_exclude_task_id IS NULL OR t.id != p_exclude_task_id)
    AND t.due_date IS NOT NULL
    AND (
      -- Check for time overlap
      (task_start, task_end) OVERLAPS (
        t.due_date - (COALESCE(t.estimated_hours, 1) || ' hours')::INTERVAL,
        t.due_date
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

-- RLS policy for task_audit_log (organization members)
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
      (SELECT role FROM user_profiles WHERE user_id = auth.uid()) IN ('organization_admin', 'admin')
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
    -- Users can access conflicts for clients in their organization
    client_id IN (
      SELECT c.id FROM clients c
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
  COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'completed') as overdue_tasks,
  AVG(estimated_hours) as avg_estimated_hours,
  AVG(CASE 
    WHEN completed_at IS NOT NULL AND started_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (completed_at - started_at))/3600 
  END) as avg_actual_hours
FROM tasks
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- View for template usage analytics
CREATE OR REPLACE VIEW template_usage_analytics AS
SELECT 
  tt.id,
  tt.title,
  tt.category_id,
  tt.usage_count,
  tt.success_rate,
  COUNT(t.id) as total_tasks_generated,
  COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
  COUNT(t.id) FILTER (WHERE t.due_date < NOW() AND t.status != 'completed') as overdue_tasks,
  AVG(t.estimated_hours) as avg_task_hours
FROM task_templates tt
LEFT JOIN tasks t ON t.template_id = tt.id
WHERE tt.is_active = true
GROUP BY tt.id, tt.title, tt.category_id, tt.usage_count, tt.success_rate
ORDER BY COALESCE(tt.usage_count, 0) DESC;

-- View for security monitoring
CREATE OR REPLACE VIEW task_security_summary AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_operations,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_operations,
  COUNT(*) FILTER (WHERE severity = 'high') as high_severity_operations,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT client_id) as unique_clients
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

-- Create trigger on tasks table
DROP TRIGGER IF EXISTS trigger_update_template_success_rate ON tasks;
CREATE TRIGGER trigger_update_template_success_rate
  AFTER INSERT OR UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_template_success_rate_trigger();

-- Trigger to automatically detect conflicts on task creation/update
CREATE OR REPLACE FUNCTION detect_conflicts_trigger()
RETURNS TRIGGER AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Only check for conflicts on INSERT or due_date/estimated_hours changes
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
    OLD.due_date != NEW.due_date OR 
    OLD.estimated_hours != NEW.estimated_hours OR
    OLD.buffer_time != NEW.buffer_time
  )) THEN
    
    -- Only check if we have required fields
    IF NEW.client_id IS NOT NULL AND NEW.due_date IS NOT NULL THEN
      -- Check for conflicts
      SELECT COUNT(*) INTO conflict_count
      FROM detect_task_conflicts(
        NEW.client_id,
        NEW.due_date,
        COALESCE(NEW.estimated_hours, 1),
        COALESCE(NEW.buffer_time, 0),
        NEW.id
      );
      
      -- Create conflict record if conflicts found
      IF conflict_count > 0 THEN
        INSERT INTO task_conflicts (
          client_id,
          conflict_type,
          severity,
          conflicting_tasks,
          actual_buffer,
          required_buffer
        )
        SELECT 
          NEW.client_id,
          'overlap',
          'medium', -- Default severity, can be updated by application logic
          ARRAY[NEW.id, dt.conflicting_task_id],
          COALESCE(NEW.buffer_time, 0) * 60, -- Convert to minutes
          (dt.overlap_hours * 60 + 30)::INTEGER -- Suggested additional buffer in minutes
        FROM detect_task_conflicts(
          NEW.client_id,
          NEW.due_date,
          COALESCE(NEW.estimated_hours, 1),
          COALESCE(NEW.buffer_time, 0),
          NEW.id
        ) dt
        ON CONFLICT DO NOTHING; -- Avoid duplicate conflicts
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create conflict detection trigger
DROP TRIGGER IF EXISTS trigger_detect_conflicts ON tasks;
CREATE TRIGGER trigger_detect_conflicts
  AFTER INSERT OR UPDATE OF due_date, estimated_hours, buffer_time ON tasks
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
-- PART 10: MIGRATION COMPLETION LOG
-- =====================================================

-- Analyze tables for query optimization
ANALYZE task_templates;
ANALYZE tasks;
ANALYZE task_audit_log;
ANALYZE task_conflicts;

-- Create statistics for better query planning
CREATE STATISTICS IF NOT EXISTS task_templates_correlation_stats 
ON organization_id, category_id, is_active FROM task_templates;

CREATE STATISTICS IF NOT EXISTS tasks_correlation_stats 
ON client_id, status, due_date FROM tasks;

-- Log successful migration completion
DO $$
BEGIN
  -- Create a record of this migration
  INSERT INTO task_audit_log (
    user_id, action, resource_type, severity, metadata
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'migration_ws156_existing_schema_completed',
    'task',
    'low',
    json_build_object(
      'migration_file', '20250827080136_ws156_existing_schema_extensions.sql',
      'features_added', ARRAY[
        'task_templates_usage_tracking',
        'tasks_buffer_time_critical_path',
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
      ],
      'schema_compatibility', 'existing_tasks_and_task_templates_tables'
    )
  );
  
  RAISE NOTICE 'WS-156 Task Creation System Extensions (Existing Schema Compatible) migration completed successfully';
END $$;