
                     ELSE -10.0 END + -- Availability bonus/penalty
                CASE WHEN ms.overdue_count = 0 THEN 10.0 ELSE -20.0 END + -- Overdue penalty
                (ms.completion_rate * 0.2) -- Completion rate bonus
            ) as confidence
        FROM member_suitability ms
    )
    SELECT 
        cc.id,
        cc.name,
        GREATEST(0, LEAST(100, ROUND(cc.confidence, 2))) as confidence_score,
        ROUND(cc.current_hours + (cc.active_task_count * 2.0) + (cc.overdue_count * 5.0), 2) as workload_score,
        cc.specialty_match
    FROM confidence_calculation cc
    WHERE cc.confidence > 0
    ORDER BY confidence DESC, cc.current_hours ASC
    LIMIT 5;
END;
$$;

-- View for team performance dashboard
CREATE OR REPLACE VIEW team_performance_dashboard AS
SELECT 
    tm.wedding_id,
    tm.id as team_member_id,
    tm.name as team_member_name,
    tm.role,
    tm.specialty,
    COUNT(wt.id) as total_tasks,
    COUNT(*) FILTER (WHERE wt.status = 'completed') as completed_tasks,
    COUNT(*) FILTER (WHERE wt.status IN ('pending', 'in_progress', 'on_hold')) as active_tasks,
    COUNT(*) FILTER (WHERE wt.deadline < NOW() AND wt.status != 'completed') as overdue_tasks,
    COALESCE(SUM(wt.estimated_hours), 0) as total_estimated_hours,
    ROUND(
        CASE 
            WHEN COUNT(wt.id) > 0 
            THEN (COUNT(*) FILTER (WHERE wt.status = 'completed')::DECIMAL / COUNT(wt.id)::DECIMAL) * 100
            ELSE 0 
        END, 
        2
    ) as completion_rate,
    ROUND(
        AVG(CASE 
            WHEN wt.status = 'completed' AND wt.completed_at IS NOT NULL AND wt.started_at IS NOT NULL
            THEN EXTRACT(DAY FROM wt.completed_at - wt.started_at)
            ELSE NULL 
        END), 
        2
    ) as avg_completion_days
FROM team_members tm
LEFT JOIN workflow_tasks wt ON tm.id = wt.assigned_to
GROUP BY tm.wedding_id, tm.id, tm.name, tm.role, tm.specialty;

-- Materialized view for workload metrics (refreshed periodically)
CREATE MATERIALIZED VIEW workload_metrics_cache AS
SELECT 
    tm.wedding_id,
    tm.id as team_member_id,
    tm.name as team_member_name,
    tm.role,
    tm.specialty,
    -- Current workload
    COUNT(*) FILTER (WHERE wt.status IN ('pending', 'in_progress', 'on_hold')) as active_tasks,
    COALESCE(SUM(CASE 
        WHEN wt.status IN ('pending', 'in_progress', 'on_hold') 
        THEN wt.estimated_hours 
        ELSE 0 
    END), 0) as remaining_hours,
    -- Capacity utilization
    ROUND(
        CASE 
            WHEN 40.0 > 0 
            THEN (COALESCE(SUM(CASE 
                WHEN wt.status IN ('pending', 'in_progress', 'on_hold') 
                THEN wt.estimated_hours 
                ELSE 0 
            END), 0) / 40.0) * 100
            ELSE 0 
        END, 
        2
    ) as capacity_utilization,
    -- Last updated
    NOW() as last_updated
FROM team_members tm
LEFT JOIN workflow_tasks wt ON tm.id = wt.assigned_to
GROUP BY tm.wedding_id, tm.id, tm.name, tm.role, tm.specialty;

-- Create index on materialized view
CREATE UNIQUE INDEX workload_metrics_cache_pkey ON workload_metrics_cache (wedding_id, team_member_id);

-- Function to refresh workload metrics cache
CREATE OR REPLACE FUNCTION refresh_workload_metrics_cache()
RETURNS VOID
LANGUAGE sql
AS $$
    REFRESH MATERIALIZED VIEW CONCURRENTLY workload_metrics_cache;
$$;

-- Grant permissions
GRANT SELECT ON team_performance_dashboard TO authenticated;
GRANT SELECT ON workload_metrics_cache TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_workload_metrics_cache() TO authenticated;

-- Create a trigger to refresh the cache when tasks are updated
CREATE OR REPLACE FUNCTION trigger_workload_cache_refresh()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Schedule cache refresh (in a real system, this would queue a background job)
    PERFORM pg_notify('workload_cache_refresh', NEW.wedding_id::TEXT);
    RETURN NEW;
END;
$$;

CREATE TRIGGER workload_cache_refresh_trigger
    AFTER INSERT OR UPDATE OR DELETE ON workflow_tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_workload_cache_refresh();

-- Initial data refresh
SELECT refresh_workload_metrics_cache();


-- ========================================
-- Migration: 20250101000049_task_collaboration_templates.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- Task Collaboration and Templates System
-- WS-058 Round 2: Enhanced task collaboration and template management features

-- =====================================================
-- PART 1: TASK COMMENTS AND DISCUSSIONS
-- =====================================================

-- Comments/discussions table for task collaboration
DROP VIEW IF EXISTS task_comments CASCADE;
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES team_members(id),
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}', -- Array of mentioned team member IDs
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES team_members(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  is_pinned BOOLEAN DEFAULT false,
  attachments JSONB[] DEFAULT '{}', -- File attachments with metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File attachments for tasks (enhanced)
DROP VIEW IF EXISTS task_attachments CASCADE;
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES team_members(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  description TEXT,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES team_members(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PART 2: TASK TEMPLATES SYSTEM
-- =====================================================

-- Template categories
CREATE TYPE template_category AS ENUM (
  'venue_setup', 'vendor_management', 'client_onboarding', 
  'timeline_planning', 'day_of_coordination', 'post_wedding',
  'emergency_procedures', 'seasonal_events', 'custom'
);

-- Task templates table
DROP VIEW IF EXISTS task_templates CASCADE;
CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category template_category NOT NULL,
  is_system_template BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES team_members(id),
  is_active BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  estimated_total_hours INTEGER,
  typical_timeline_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template tasks (individual tasks within a template)
DROP VIEW IF EXISTS template_tasks CASCADE;
CREATE TABLE IF NOT EXISTS template_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category task_category NOT NULL,
  priority task_priority NOT NULL DEFAULT 'medium',
  estimated_duration INTEGER NOT NULL DEFAULT 1, -- in hours
  buffer_time INTEGER DEFAULT 0,
  days_before_event INTEGER, -- Days before wedding date
  order_index INTEGER NOT NULL DEFAULT 0,
  default_assignee_role TEXT, -- Role that should handle this task
  specialties_required task_category[] DEFAULT '{}',
  notes TEXT,
  checklist_items TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template task dependencies
DROP VIEW IF EXISTS template_task_dependencies CASCADE;
CREATE TABLE IF NOT EXISTS template_task_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  predecessor_task_id UUID NOT NULL REFERENCES template_tasks(id) ON DELETE CASCADE,
  successor_task_id UUID NOT NULL REFERENCES template_tasks(id) ON DELETE CASCADE,
  dependency_type dependency_type NOT NULL DEFAULT 'finish_to_start',
  lag_time INTEGER DEFAULT 0,
  CONSTRAINT no_self_template_dependency CHECK (predecessor_task_id != successor_task_id)
);

-- Role-based assignment templates
DROP VIEW IF EXISTS role_assignment_templates CASCADE;
CREATE TABLE IF NOT EXISTS role_assignment_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  task_categories task_category[] DEFAULT '{}',
  priority_levels task_priority[] DEFAULT '{}',
  max_concurrent_tasks INTEGER DEFAULT 5,
  auto_assign BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timeline templates
DROP VIEW IF EXISTS timeline_templates CASCADE;
CREATE TABLE IF NOT EXISTS timeline_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  months_before_wedding INTEGER NOT NULL,
  template_id UUID REFERENCES task_templates(id) ON DELETE SET NULL,
  milestones JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES team_members(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Checklist generation templates
DROP VIEW IF EXISTS checklist_templates CASCADE;
CREATE TABLE IF NOT EXISTS checklist_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category template_category NOT NULL,
  items JSONB NOT NULL DEFAULT '[]', -- Array of checklist items with metadata
  is_system_template BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES team_members(id),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template usage tracking
DROP VIEW IF EXISTS template_usage CASCADE;
CREATE TABLE IF NOT EXISTS template_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES task_templates(id) ON DELETE SET NULL,
  checklist_template_id UUID REFERENCES checklist_templates(id) ON DELETE SET NULL,
  timeline_template_id UUID REFERENCES timeline_templates(id) ON DELETE SET NULL,
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  used_by UUID NOT NULL REFERENCES team_members(id),
  tasks_created INTEGER DEFAULT 0,
  tasks_modified INTEGER DEFAULT 0,
  effectiveness_score DECIMAL(3, 2), -- 0.00 to 1.00
  notes TEXT,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Comments indexes
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_author_id ON task_comments(author_id);
CREATE INDEX idx_task_comments_parent_id ON task_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_task_comments_created_at ON task_comments(created_at DESC);

-- Attachments indexes
CREATE INDEX idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX idx_task_attachments_comment_id ON task_attachments(comment_id) WHERE comment_id IS NOT NULL;

-- Templates indexes
CREATE INDEX idx_task_templates_category ON task_templates(category);
CREATE INDEX idx_task_templates_active ON task_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_template_tasks_template_id ON template_tasks(template_id);
CREATE INDEX idx_template_tasks_order ON template_tasks(template_id, order_index);
CREATE INDEX idx_timeline_templates_months ON timeline_templates(months_before_wedding);
CREATE INDEX idx_template_usage_wedding ON template_usage(wedding_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to notify mentioned users in comments
CREATE OR REPLACE FUNCTION notify_comment_mentions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mentions IS NOT NULL AND array_length(NEW.mentions, 1) > 0 THEN
    INSERT INTO task_notifications (
      task_id,
      recipient_id,
      notification_type,
      title,
      message,
      scheduled_for
    )
    SELECT 
      NEW.task_id,
      unnest(NEW.mentions),
      'status_change'::notification_type,
      'You were mentioned in a task comment',
      'You were mentioned in a comment on task: ' || 
        (SELECT title FROM workflow_tasks WHERE id = NEW.task_id),
      NOW()
    FROM unnest(NEW.mentions);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comment_mention_notification
AFTER INSERT ON task_comments
FOR EACH ROW
EXECUTE FUNCTION notify_comment_mentions();

-- Function to generate tasks from template
CREATE OR REPLACE FUNCTION generate_tasks_from_template(
  p_template_id UUID,
  p_wedding_id UUID,
  p_created_by UUID
)
RETURNS TABLE(task_id UUID) AS $$
DECLARE
  v_wedding_date DATE;
  v_task_mapping JSONB DEFAULT '{}';
  v_template_task RECORD;
  v_new_task_id UUID;
BEGIN
  -- Get wedding date
  SELECT wedding_date INTO v_wedding_date
  FROM weddings WHERE id = p_wedding_id;
  
  IF v_wedding_date IS NULL THEN
    RAISE EXCEPTION 'Wedding date is required to generate tasks from template';
  END IF;
  
  -- Create tasks from template
  FOR v_template_task IN 
    SELECT * FROM template_tasks 
    WHERE template_id = p_template_id 
    ORDER BY order_index
  LOOP
    -- Calculate task deadline based on days before event
    INSERT INTO workflow_tasks (
      title,
      description,
      wedding_id,
      category,
      priority,
      status,
      created_by,
      assigned_by,
      estimated_duration,
      buffer_time,
      deadline,
      notes
    ) VALUES (
      v_template_task.title,
      v_template_task.description,
      p_wedding_id,
      v_template_task.category,
      v_template_task.priority,
      'todo'::task_status,
      p_created_by,
      p_created_by,
      v_template_task.estimated_duration,
      v_template_task.buffer_time,
      v_wedding_date - (v_template_task.days_before_event || ' days')::INTERVAL,
      v_template_task.notes
    ) RETURNING id INTO v_new_task_id;
    
    -- Store mapping for dependencies
    v_task_mapping := v_task_mapping || 
      jsonb_build_object(v_template_task.id::TEXT, v_new_task_id::TEXT);
    
    -- Add checklist items if any
    IF v_template_task.checklist_items IS NOT NULL AND 
       array_length(v_template_task.checklist_items, 1) > 0 THEN
      UPDATE workflow_tasks 
      SET attachments = v_template_task.checklist_items
      WHERE id = v_new_task_id;
    END IF;
    
    -- Return the created task ID
    task_id := v_new_task_id;
    RETURN NEXT;
  END LOOP;
  
  -- Create dependencies
  INSERT INTO task_dependencies (
    predecessor_task_id,
    successor_task_id,
    dependency_type,
    lag_time
  )
  SELECT 
    (v_task_mapping->>ttd.predecessor_task_id::TEXT)::UUID,
    (v_task_mapping->>ttd.successor_task_id::TEXT)::UUID,
    ttd.dependency_type,
    ttd.lag_time
  FROM template_task_dependencies ttd
  WHERE ttd.template_id = p_template_id
    AND v_task_mapping ? ttd.predecessor_task_id::TEXT
    AND v_task_mapping ? ttd.successor_task_id::TEXT;
  
  -- Track template usage
  INSERT INTO template_usage (
    template_id,
    wedding_id,
    used_by,
    tasks_created
  ) VALUES (
    p_template_id,
    p_wedding_id,
    p_created_by,
    (SELECT COUNT(*) FROM template_tasks WHERE template_id = p_template_id)
  );
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to generate checklist from template
CREATE OR REPLACE FUNCTION generate_checklist_from_template(
  p_checklist_template_id UUID,
  p_task_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_checklist_items JSONB;
  v_existing_attachments TEXT[];
BEGIN
  -- Get checklist items from template
  SELECT items INTO v_checklist_items
  FROM checklist_templates
  WHERE id = p_checklist_template_id;
  
  IF v_checklist_items IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get existing attachments
  SELECT attachments INTO v_existing_attachments
  FROM workflow_tasks
  WHERE id = p_task_id;
  
  -- Merge checklist items with existing attachments
  UPDATE workflow_tasks
  SET attachments = array_cat(
    COALESCE(v_existing_attachments, '{}'),
    ARRAY(SELECT jsonb_array_elements_text(v_checklist_items))
  )
  WHERE id = p_task_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Update timestamp trigger for comments
CREATE TRIGGER update_task_comments_updated_at
BEFORE UPDATE ON task_comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Update timestamp trigger for templates
CREATE TRIGGER update_task_templates_updated_at
BEFORE UPDATE ON task_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_assignment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_usage ENABLE ROW LEVEL SECURITY;

-- Comments policies
CREATE POLICY "Users can view comments on their tasks" ON task_comments
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM workflow_tasks 
      WHERE wedding_id IN (
        SELECT wedding_id FROM wedding_team_members 
        WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can create comments on their tasks" ON task_comments
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT id FROM workflow_tasks 
      WHERE wedding_id IN (
        SELECT wedding_id FROM wedding_team_members 
        WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can update their own comments" ON task_comments
  FOR UPDATE USING (
    author_id IN (
      SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() )
    )
  );

-- Templates policies
CREATE POLICY "Users can view active templates" ON task_templates
  FOR SELECT USING (is_active = true OR created_by IN (
    SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY "Users can create templates" ON task_templates
  FOR INSERT WITH CHECK (
    created_by IN (
      SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() )
    )
  );

CREATE POLICY "Users can update their own templates" ON task_templates
  FOR UPDATE USING (
    created_by IN (
      SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() )
    )
  );

-- Similar policies for other tables...
CREATE POLICY "Users can view template tasks" ON template_tasks
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM task_templates 
      WHERE is_active = true OR created_by IN (
        SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

-- =====================================================
-- SEED DATA: System Templates
-- =====================================================

-- Insert system templates
INSERT INTO task_templates (name, description, category, is_system_template, created_by, estimated_total_hours, typical_timeline_days)
VALUES 
  ('Complete Wedding Planning', 'Full wedding planning timeline from engagement to honeymoon', 'timeline_planning', true, 
    (SELECT id FROM team_members LIMIT 1), 200, 365),
  ('Venue Setup Checklist', 'Standard venue setup and coordination tasks', 'venue_setup', true,
    (SELECT id FROM team_members LIMIT 1), 40, 30),
  ('Vendor Management', 'Vendor booking and coordination workflow', 'vendor_management', true,
    (SELECT id FROM team_members LIMIT 1), 60, 90),
  ('Day-of Coordination', 'Wedding day timeline and coordination tasks', 'day_of_coordination', true,
    (SELECT id FROM team_members LIMIT 1), 16, 1),
  ('Emergency Response Plan', 'Crisis management and backup procedures', 'emergency_procedures', true,
    (SELECT id FROM team_members LIMIT 1), 8, 7);

-- Add sample template tasks for "Day-of Coordination" template
WITH day_of_template AS (
  SELECT id FROM task_templates WHERE name = 'Day-of Coordination' LIMIT 1
)
INSERT INTO template_tasks (
  template_id, title, description, category, priority, 
  estimated_duration, days_before_event, order_index, 
  default_assignee_role, checklist_items
)
SELECT 
  (SELECT id FROM day_of_template),
  task_title,
  task_description,
  task_category,
  task_priority,
  duration,
  days_before,
  order_idx,
  assignee_role,
  checklist
FROM (
  VALUES
    ('Final venue walkthrough', 'Confirm all venue details and setup requirements', 
      'venue_management'::task_category, 'high'::task_priority, 2, 1, 1, 'coordinator',
      ARRAY['Confirm ceremony layout', 'Check reception setup', 'Verify vendor access times', 'Test AV equipment']),
    
    ('Vendor check-in calls', 'Contact all vendors to confirm arrival times', 
      'vendor_coordination'::task_category, 'critical'::task_priority, 3, 1, 2, 'coordinator',
      ARRAY['Call photographer', 'Confirm florist delivery', 'Check caterer timeline', 'Verify DJ/band setup']),
    
    ('Prepare emergency kit', 'Assemble day-of emergency supplies', 
      'logistics'::task_category, 'medium'::task_priority, 1, 2, 3, 'assistant',
      ARRAY['Sewing kit', 'Stain remover', 'First aid supplies', 'Extra copies of timeline']),
    
    ('Brief wedding party', 'Review timeline and responsibilities with wedding party', 
      'client_management'::task_category, 'high'::task_priority, 1, 0, 4, 'coordinator',
      ARRAY['Distribute timeline', 'Review processional order', 'Confirm photo locations', 'Answer questions']),
    
    ('Coordinate ceremony setup', 'Oversee ceremony space preparation', 
      'venue_management'::task_category, 'critical'::task_priority, 2, 0, 5, 'coordinator',
      ARRAY['Direct chair placement', 'Position ceremony arch', 'Set up guest book table', 'Place programs'])
) AS t(task_title, task_description, task_category, task_priority, duration, days_before, order_idx, assignee_role, checklist);

-- Add sample checklist templates
INSERT INTO checklist_templates (name, description, category, items, is_system_template, created_by)
VALUES 
  ('Photography Shot List', 'Essential wedding photos checklist', 'day_of_coordination',
    '[
      {"item": "Getting ready shots", "priority": "high"},
      {"item": "First look", "priority": "high"},
      {"item": "Ceremony wide shots", "priority": "critical"},
      {"item": "Ring exchange close-up", "priority": "critical"},
      {"item": "First kiss", "priority": "critical"},
      {"item": "Family portraits", "priority": "high"},
      {"item": "Wedding party photos", "priority": "medium"},
      {"item": "Couple portraits", "priority": "critical"},
      {"item": "Reception details", "priority": "medium"},
      {"item": "First dance", "priority": "high"},
      {"item": "Speeches and toasts", "priority": "high"},
      {"item": "Cake cutting", "priority": "high"},
      {"item": "Dance floor candids", "priority": "medium"},
      {"item": "Grand exit", "priority": "high"}
    ]'::JSONB,
    true,
    (SELECT id FROM team_members LIMIT 1)),
    
  ('Venue Setup Checklist', 'Complete venue preparation guide', 'venue_setup',
    '[
      {"item": "Confirm floor plan with venue", "priority": "critical"},
      {"item": "Mark ceremony seating arrangement", "priority": "high"},
      {"item": "Set up welcome table", "priority": "medium"},
      {"item": "Position gift table", "priority": "medium"},
      {"item": "Arrange cocktail hour space", "priority": "high"},
      {"item": "Verify reception table layout", "priority": "critical"},
      {"item": "Place table numbers and seating cards", "priority": "high"},
      {"item": "Set up sweetheart/head table", "priority": "critical"},
      {"item": "Position dance floor lighting", "priority": "medium"},
      {"item": "Arrange lounge area", "priority": "low"},
      {"item": "Set up bar stations", "priority": "high"},
      {"item": "Position cake table", "priority": "high"},
      {"item": "Arrange DJ/band area", "priority": "critical"},
      {"item": "Set up photo booth area", "priority": "medium"}
    ]'::JSONB,
    true,
    (SELECT id FROM team_members LIMIT 1));

-- Add timeline template
INSERT INTO timeline_templates (name, description, months_before_wedding, milestones, created_by)
VALUES 
  ('12-Month Wedding Planning Timeline', 'Complete month-by-month wedding planning guide', 12,
    '[
      {"month": 12, "tasks": ["Set budget", "Create guest list", "Choose wedding date", "Book venue"]},
      {"month": 11, "tasks": ["Book photographer/videographer", "Start dress shopping", "Register for gifts"]},
      {"month": 10, "tasks": ["Book caterer", "Book florist", "Book entertainment"]},
      {"month": 9, "tasks": ["Send save the dates", "Book officiant", "Start planning honeymoon"]},
      {"month": 8, "tasks": ["Order wedding dress", "Choose wedding party attire", "Book transportation"]},
      {"month": 7, "tasks": ["Register for remaining gifts", "Order invitations", "Plan ceremony"]},
      {"month": 6, "tasks": ["Book hair and makeup", "Finalize honeymoon", "Choose wedding rings"]},
      {"month": 5, "tasks": ["Send invitations", "Plan rehearsal dinner", "Order wedding cake"]},
      {"month": 4, "tasks": ["Shop for wedding party gifts", "Write vows", "Finalize ceremony details"]},
      {"month": 3, "tasks": ["Finalize reception details", "Have dress fitting", "Finalize flowers"]},
      {"month": 2, "tasks": ["Apply for marriage license", "Finalize seating chart", "Break in wedding shoes"]},
      {"month": 1, "tasks": ["Final venue walkthrough", "Confirm all vendors", "Pack for honeymoon"]}
    ]'::JSONB,
    (SELECT id FROM team_members LIMIT 1));

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant appropriate permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000050_seo_analytics_system.sql
-- ========================================

-- SEO Analytics System for Wedding Suppliers
-- Purpose: Track search rankings, organic traffic, and SEO performance
-- Feature ID: WS-049
-- Created: 2025-08-21

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search optimization

-- ============================================
-- CORE SEO TABLES
-- ============================================

-- SEO Keywords Tracking Table
DROP VIEW IF EXISTS seo_keywords CASCADE;
CREATE TABLE IF NOT EXISTS seo_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  keyword_type TEXT CHECK (keyword_type IN ('primary', 'secondary', 'long_tail', 'branded', 'local')),
  search_volume INTEGER,
  difficulty_score INTEGER CHECK (difficulty_score >= 0 AND difficulty_score <= 100),
  cpc_value DECIMAL(10,2),
  intent TEXT CHECK (intent IN ('informational', 'navigational', 'transactional', 'commercial')),
  location TEXT, -- For local SEO keywords
  is_tracked BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supplier_id, keyword, location)
);

-- Search Rankings History Table
DROP VIEW IF EXISTS seo_rankings CASCADE;
CREATE TABLE IF NOT EXISTS seo_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword_id UUID REFERENCES seo_keywords(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  url TEXT NOT NULL,
  page_title TEXT,
  meta_description TEXT,
  featured_snippet BOOLEAN DEFAULT false,
  search_engine TEXT DEFAULT 'google' CHECK (search_engine IN ('google', 'bing', 'yahoo')),
  device_type TEXT DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  location TEXT,
  tracked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX(keyword_id, tracked_at DESC),
  INDEX(supplier_id, tracked_at DESC),
  INDEX(position, tracked_at DESC)
);

-- Organic Traffic Data Table
DROP VIEW IF EXISTS seo_organic_traffic CASCADE;
CREATE TABLE IF NOT EXISTS seo_organic_traffic (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  pageviews INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,2) CHECK (bounce_rate >= 0 AND bounce_rate <= 100),
  avg_session_duration INTEGER, -- in seconds
  conversions INTEGER DEFAULT 0,
  conversion_value DECIMAL(10,2),
  landing_page TEXT,
  source TEXT DEFAULT 'organic',
  medium TEXT,
  device_category TEXT CHECK (device_category IN ('desktop', 'mobile', 'tablet')),
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supplier_id, page_url, date, device_category),
  INDEX(supplier_id, date DESC),
  INDEX(page_url, date DESC)
);

-- Competitor Analysis Table
DROP VIEW IF EXISTS seo_competitors CASCADE;
CREATE TABLE IF NOT EXISTS seo_competitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  competitor_domain TEXT NOT NULL,
  competitor_name TEXT,
  overlap_score DECIMAL(5,2) CHECK (overlap_score >= 0 AND overlap_score <= 100),
  domain_authority INTEGER CHECK (domain_authority >= 0 AND domain_authority <= 100),
  organic_traffic_estimate INTEGER,
  top_keywords_count INTEGER,
  backlinks_count INTEGER,
  is_tracked BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supplier_id, competitor_domain)
);

-- Competitor Rankings Comparison Table
DROP VIEW IF EXISTS seo_competitor_rankings CASCADE;
CREATE TABLE IF NOT EXISTS seo_competitor_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword_id UUID REFERENCES seo_keywords(id) ON DELETE CASCADE,
  competitor_id UUID REFERENCES seo_competitors(id) ON DELETE CASCADE,
  position INTEGER CHECK (position >= 0),
  url TEXT,
  tracked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX(keyword_id, tracked_at DESC),
  INDEX(competitor_id, tracked_at DESC)
);

-- Technical SEO Audits Table
DROP VIEW IF EXISTS seo_technical_audits CASCADE;
CREATE TABLE IF NOT EXISTS seo_technical_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  audit_type TEXT CHECK (audit_type IN ('full', 'performance', 'mobile', 'security', 'accessibility')),
  score INTEGER CHECK (score >= 0 AND score <= 100),
  issues JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  performance_metrics JSONB DEFAULT '{}', -- LCP, FID, CLS, etc.
  crawl_stats JSONB DEFAULT '{}',
  audit_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX(supplier_id, audit_date DESC)
);

-- Local SEO Performance Table
DROP VIEW IF EXISTS seo_local_performance CASCADE;
CREATE TABLE IF NOT EXISTS seo_local_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  google_my_business_id TEXT,
  visibility_score INTEGER CHECK (visibility_score >= 0 AND visibility_score <= 100),
  reviews_count INTEGER DEFAULT 0,
  average_rating DECIMAL(2,1) CHECK (average_rating >= 0 AND average_rating <= 5),
  local_pack_position INTEGER,
  map_views INTEGER DEFAULT 0,
  direction_requests INTEGER DEFAULT 0,
  phone_calls INTEGER DEFAULT 0,
  website_clicks INTEGER DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supplier_id, location, date),
  INDEX(supplier_id, date DESC)
);

-- Content Performance Table
DROP VIEW IF EXISTS seo_content_performance CASCADE;
CREATE TABLE IF NOT EXISTS seo_content_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  content_type TEXT CHECK (content_type IN ('blog', 'landing', 'service', 'gallery', 'testimonial', 'faq')),
  word_count INTEGER,
  readability_score INTEGER CHECK (readability_score >= 0 AND readability_score <= 100),
  keyword_density DECIMAL(5,2),
  internal_links INTEGER DEFAULT 0,
  external_links INTEGER DEFAULT 0,
  images_count INTEGER DEFAULT 0,
  avg_time_on_page INTEGER, -- in seconds
  social_shares INTEGER DEFAULT 0,
  backlinks_gained INTEGER DEFAULT 0,
  published_date DATE,
  last_updated DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX(supplier_id, published_date DESC)
);

-- Backlinks Tracking Table
DROP VIEW IF EXISTS seo_backlinks CASCADE;
CREATE TABLE IF NOT EXISTS seo_backlinks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  source_domain TEXT NOT NULL,
  target_url TEXT NOT NULL,
  anchor_text TEXT,
  link_type TEXT CHECK (link_type IN ('dofollow', 'nofollow', 'sponsored', 'ugc')),
  domain_authority INTEGER CHECK (domain_authority >= 0 AND domain_authority <= 100),
  first_seen DATE,
  last_checked DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX(supplier_id, domain_authority DESC),
  INDEX(target_url, created_at DESC)
);

-- ============================================
-- MATERIALIZED VIEWS FOR DASHBOARD
-- ============================================

-- SEO Overview Dashboard View
CREATE MATERIALIZED VIEW seo_dashboard_overview AS
WITH ranking_summary AS (
  SELECT 
    supplier_id,
    COUNT(DISTINCT keyword_id) as tracked_keywords,
    COUNT(CASE WHEN position <= 3 THEN 1 END) as top3_rankings,
    COUNT(CASE WHEN position <= 10 THEN 1 END) as top10_rankings,
    AVG(position) as avg_position,
    COUNT(CASE WHEN featured_snippet = true THEN 1 END) as featured_snippets
  FROM seo_rankings
  WHERE tracked_at >= NOW() - INTERVAL '1 day'
  GROUP BY supplier_id
),
traffic_summary AS (
  SELECT
    supplier_id,
    SUM(sessions) as total_sessions,
    SUM(users) as total_users,
    SUM(conversions) as total_conversions,
    AVG(bounce_rate) as avg_bounce_rate,
    SUM(conversion_value) as total_revenue
  FROM seo_organic_traffic
  WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY supplier_id
),
technical_summary AS (
  SELECT
    supplier_id,
    AVG(score) as avg_technical_score,
    COUNT(*) as audits_performed
  FROM seo_technical_audits
  WHERE audit_date >= NOW() - INTERVAL '30 days'
  GROUP BY supplier_id
)
SELECT
  s.id as supplier_id,
  s.business_name,
  COALESCE(rs.tracked_keywords, 0) as tracked_keywords,
  COALESCE(rs.top3_rankings, 0) as top3_rankings,
  COALESCE(rs.top10_rankings, 0) as top10_rankings,
  COALESCE(rs.avg_position, 0) as avg_position,
  COALESCE(rs.featured_snippets, 0) as featured_snippets,
  COALESCE(ts.total_sessions, 0) as organic_sessions_30d,
  COALESCE(ts.total_users, 0) as organic_users_30d,
  COALESCE(ts.total_conversions, 0) as conversions_30d,
  COALESCE(ts.avg_bounce_rate, 0) as avg_bounce_rate,
  COALESCE(ts.total_revenue, 0) as revenue_attributed,
  COALESCE(tech.avg_technical_score, 0) as technical_health_score,
  NOW() as last_refreshed
FROM suppliers s
LEFT JOIN ranking_summary rs ON s.id = rs.supplier_id
LEFT JOIN traffic_summary ts ON s.id = ts.supplier_id
LEFT JOIN technical_summary tech ON s.id = tech.supplier_id;

-- Create indexes for materialized view
CREATE UNIQUE INDEX idx_seo_dashboard_supplier ON seo_dashboard_overview(supplier_id);
CREATE INDEX idx_seo_dashboard_rankings ON seo_dashboard_overview(top10_rankings DESC);

-- Keyword Performance Trends View
CREATE MATERIALIZED VIEW seo_keyword_trends AS
SELECT
  k.id as keyword_id,
  k.supplier_id,
  k.keyword,
  k.search_volume,
  k.difficulty_score,
  r.position as current_position,
  r.url as ranking_url,
  r.featured_snippet,
  LAG(r.position, 1) OVER (PARTITION BY k.id ORDER BY r.tracked_at) as previous_position,
  r.position - LAG(r.position, 1) OVER (PARTITION BY k.id ORDER BY r.tracked_at) as position_change,
  r.tracked_at
FROM seo_keywords k
JOIN seo_rankings r ON k.id = r.keyword_id
WHERE r.tracked_at >= NOW() - INTERVAL '30 days'
ORDER BY k.supplier_id, k.search_volume DESC, r.tracked_at DESC;

-- Create indexes for keyword trends
CREATE INDEX idx_keyword_trends_supplier ON seo_keyword_trends(supplier_id);
CREATE INDEX idx_keyword_trends_change ON seo_keyword_trends(position_change);

-- ============================================
-- FUNCTIONS FOR SEO ANALYTICS
-- ============================================

-- Function to calculate SEO visibility score
CREATE OR REPLACE FUNCTION calculate_seo_visibility_score(p_supplier_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_ranking_score INTEGER;
  v_traffic_score INTEGER;
  v_technical_score INTEGER;
  v_content_score INTEGER;
BEGIN
  -- Calculate ranking component (40% weight)
  SELECT 
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE LEAST(100, (
        COUNT(CASE WHEN position <= 3 THEN 1 END) * 10 +
        COUNT(CASE WHEN position BETWEEN 4 AND 10 THEN 1 END) * 5 +
        COUNT(CASE WHEN position BETWEEN 11 AND 20 THEN 1 END) * 2
      ))
    END INTO v_ranking_score
  FROM seo_rankings
  WHERE supplier_id = p_supplier_id
    AND tracked_at >= NOW() - INTERVAL '7 days';
  
  -- Calculate traffic component (30% weight)
  SELECT
    CASE
      WHEN SUM(sessions) = 0 THEN 0
      ELSE LEAST(100, (SUM(sessions) / 100) + (SUM(conversions) * 10))
    END INTO v_traffic_score
  FROM seo_organic_traffic
  WHERE supplier_id = p_supplier_id
    AND date >= CURRENT_DATE - INTERVAL '30 days';
  
  -- Get technical score (20% weight)
  SELECT COALESCE(AVG(score), 50) INTO v_technical_score
  FROM seo_technical_audits
  WHERE supplier_id = p_supplier_id
    AND audit_date >= NOW() - INTERVAL '30 days';
  
  -- Calculate content score (10% weight)
  SELECT 
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE LEAST(100, AVG(readability_score))
    END INTO v_content_score
  FROM seo_content_performance
  WHERE supplier_id = p_supplier_id;
  
  -- Calculate weighted total
  v_score := (
    (COALESCE(v_ranking_score, 0) * 0.4) +
    (COALESCE(v_traffic_score, 0) * 0.3) +
    (COALESCE(v_technical_score, 0) * 0.2) +
    (COALESCE(v_content_score, 0) * 0.1)
  )::INTEGER;
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Function to detect SEO opportunities
CREATE OR REPLACE FUNCTION detect_seo_opportunities(p_supplier_id UUID)
RETURNS TABLE(
  opportunity_type TEXT,
  priority TEXT,
  description TEXT,
  potential_impact INTEGER,
  recommended_action TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- High-value keywords with poor rankings
  SELECT 
    'keyword_opportunity'::TEXT,
    'high'::TEXT,
    CONCAT('Keyword "', k.keyword, '" has high volume but ranks #', r.position)::TEXT,
    k.search_volume::INTEGER,
    'Optimize content and build links for this keyword'::TEXT
  FROM seo_keywords k
  JOIN seo_rankings r ON k.id = r.keyword_id
  WHERE k.supplier_id = p_supplier_id
    AND k.search_volume > 500
    AND r.position > 10
    AND r.tracked_at >= NOW() - INTERVAL '1 day'
  
  UNION ALL
  
  -- Pages with high bounce rate
  SELECT
    'bounce_rate_issue'::TEXT,
    'medium'::TEXT,
    CONCAT('Page ', page_url, ' has ', bounce_rate, '% bounce rate')::TEXT,
    sessions::INTEGER,
    'Improve page content and user experience'::TEXT
  FROM seo_organic_traffic
  WHERE supplier_id = p_supplier_id
    AND bounce_rate > 70
    AND sessions > 100
    AND date >= CURRENT_DATE - INTERVAL '30 days'
  
  UNION ALL
  
  -- Technical SEO issues
  SELECT
    'technical_issue'::TEXT,
    'high'::TEXT,
    CONCAT('Technical audit score is ', score, '/100')::TEXT,
    (100 - score)::INTEGER,
    'Address critical technical SEO issues'::TEXT
  FROM seo_technical_audits
  WHERE supplier_id = p_supplier_id
    AND score < 70
    AND audit_date >= NOW() - INTERVAL '7 days'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS FOR REAL-TIME UPDATES
-- ============================================

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_seo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seo_keywords_timestamp
  BEFORE UPDATE ON seo_keywords
  FOR EACH ROW
  EXECUTE FUNCTION update_seo_updated_at();

CREATE TRIGGER update_seo_competitors_timestamp
  BEFORE UPDATE ON seo_competitors
  FOR EACH ROW
  EXECUTE FUNCTION update_seo_updated_at();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all SEO tables
ALTER TABLE seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_organic_traffic ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_competitor_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_technical_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_local_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_content_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_backlinks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suppliers to access their own data
CREATE POLICY seo_keywords_supplier_policy ON seo_keywords
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY seo_rankings_supplier_policy ON seo_rankings
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY seo_organic_traffic_supplier_policy ON seo_organic_traffic
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY seo_competitors_supplier_policy ON seo_competitors
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY seo_technical_audits_supplier_policy ON seo_technical_audits
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY seo_local_performance_supplier_policy ON seo_local_performance
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY seo_content_performance_supplier_policy ON seo_content_performance
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY seo_backlinks_supplier_policy ON seo_backlinks
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = ( SELECT auth.uid() )
  ));

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Composite indexes for common queries
CREATE INDEX idx_seo_rankings_recent ON seo_rankings(supplier_id, tracked_at DESC) WHERE tracked_at >= NOW() - INTERVAL '30 days';
CREATE INDEX idx_seo_traffic_recent ON seo_organic_traffic(supplier_id, date DESC) WHERE date >= CURRENT_DATE - INTERVAL '30 days';
CREATE INDEX idx_seo_keywords_tracked ON seo_keywords(supplier_id, is_tracked) WHERE is_tracked = true;
CREATE INDEX idx_seo_competitors_active ON seo_competitors(supplier_id, is_tracked) WHERE is_tracked = true;

-- Text search indexes
CREATE INDEX idx_seo_keywords_search ON seo_keywords USING gin(keyword gin_trgm_ops);
CREATE INDEX idx_seo_content_url ON seo_content_performance USING gin(page_url gin_trgm_ops);

-- ============================================
-- SCHEDULED REFRESH FOR MATERIALIZED VIEWS
-- ============================================

-- Function to refresh SEO materialized views
CREATE OR REPLACE FUNCTION refresh_seo_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY seo_dashboard_overview;
  REFRESH MATERIALIZED VIEW CONCURRENTLY seo_keyword_trends;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh (to be called by cron job or Supabase Edge Function)
-- Run every hour for dashboard overview, every 6 hours for trends


-- ========================================
-- Migration: 20250120000001_journey_execution_engine.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- Journey Execution Engine Database Schema
-- Enhanced journey execution system with scheduling, recovery, and performance tracking

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Journey Executions Table (Enhanced)
DROP VIEW IF EXISTS journey_executions CASCADE;
CREATE TABLE IF NOT EXISTS journey_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id UUID NOT NULL,
    participant_id UUID NOT NULL,
    participant_data JSONB NOT NULL DEFAULT '{}',
    current_node_id TEXT,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'paused', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    next_execution_at TIMESTAMPTZ,
    execution_history JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    performance_metrics JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scheduled Executions Table
DROP VIEW IF EXISTS scheduled_executions CASCADE;
CREATE TABLE IF NOT EXISTS scheduled_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL REFERENCES journey_executions(id) ON DELETE CASCADE,
    journey_id UUID NOT NULL,
    participant_id UUID NOT NULL,
    node_id TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    priority INTEGER NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    data JSONB NOT NULL DEFAULT '{}',
    executed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journey Execution Logs Table
DROP VIEW IF EXISTS journey_execution_logs CASCADE;
CREATE TABLE IF NOT EXISTS journey_execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id UUID NOT NULL,
    instance_id UUID REFERENCES journey_executions(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    step_name TEXT NOT NULL,
    step_type TEXT NOT NULL,
    status TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journey Performance Metrics Table
DROP VIEW IF EXISTS journey_performance_metrics CASCADE;
CREATE TABLE IF NOT EXISTS journey_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metric_type TEXT NOT NULL,
    value NUMERIC NOT NULL,
    labels JSONB NOT NULL DEFAULT '{}',
    journey_id UUID,
    node_id TEXT,
    user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journey Alert Rules Table
DROP VIEW IF EXISTS journey_alert_rules CASCADE;
CREATE TABLE IF NOT EXISTS journey_alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    condition TEXT NOT NULL CHECK (condition IN ('gt', 'gte', 'lt', 'lte', 'eq')),
    threshold NUMERIC NOT NULL,
    window_minutes INTEGER NOT NULL DEFAULT 5,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journey Alerts Table
DROP VIEW IF EXISTS journey_alerts CASCADE;
CREATE TABLE IF NOT EXISTS journey_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES journey_alert_rules(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    threshold NUMERIC NOT NULL,
    actual_value NUMERIC NOT NULL,
    severity TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    journey_id UUID,
    node_id TEXT,
    user_id UUID,
    acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Manual Intervention Tasks Table
DROP VIEW IF EXISTS manual_intervention_tasks CASCADE;
CREATE TABLE IF NOT EXISTS manual_intervention_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL DEFAULT 'manual_intervention_required',
    priority TEXT NOT NULL DEFAULT 'high' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    journey_id UUID NOT NULL,
    execution_id UUID REFERENCES journey_executions(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    participant_id UUID NOT NULL,
    wedding_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    assigned_to UUID,
    due_date TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    completed_by UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Escalations Table
DROP VIEW IF EXISTS escalations CASCADE;
CREATE TABLE IF NOT EXISTS escalations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id UUID NOT NULL,
    execution_id UUID REFERENCES journey_executions(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    participant_id UUID NOT NULL,
    wedding_date TIMESTAMPTZ,
    failure_reason TEXT NOT NULL,
    business_impact TEXT NOT NULL DEFAULT 'medium' CHECK (business_impact IN ('low', 'medium', 'high', 'critical')),
    escalated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'in_progress', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'high' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    assigned_to UUID,
    resolution TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Wedding Timeline Milestones Table
DROP VIEW IF EXISTS wedding_timeline_milestones CASCADE;
CREATE TABLE IF NOT EXISTS wedding_timeline_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id UUID NOT NULL,
    execution_id UUID REFERENCES journey_executions(id) ON DELETE CASCADE,
    milestone_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    scheduled_date TIMESTAMPTZ NOT NULL,
    actual_date TIMESTAMPTZ,
    days_before_wedding INTEGER NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('planning', 'confirmation', 'final_details', 'post_wedding')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'delayed', 'cancelled')),
    dependencies TEXT[] NOT NULL DEFAULT '{}',
    vendor_type TEXT,
    business_days_only BOOLEAN NOT NULL DEFAULT false,
    allow_weekends BOOLEAN NOT NULL DEFAULT true,
    buffer_time_minutes INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journey Recovery Patterns Table
DROP VIEW IF EXISTS journey_recovery_patterns CASCADE;
CREATE TABLE IF NOT EXISTS journey_recovery_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_type TEXT NOT NULL,
    error_type TEXT NOT NULL,
    frequency INTEGER NOT NULL DEFAULT 1,
    success_rate NUMERIC NOT NULL DEFAULT 0.0 CHECK (success_rate >= 0.0 AND success_rate <= 1.0),
    average_recovery_time INTEGER NOT NULL DEFAULT 0, -- milliseconds
    last_occurrence TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(node_type, error_type)
);

-- Journey Circuit Breakers Table
DROP VIEW IF EXISTS journey_circuit_breakers CASCADE;
CREATE TABLE IF NOT EXISTS journey_circuit_breakers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_type TEXT NOT NULL UNIQUE,
    state TEXT NOT NULL DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half-open')),
    failure_count INTEGER NOT NULL DEFAULT 0,
    failure_threshold INTEGER NOT NULL DEFAULT 5,
    last_failure_time TIMESTAMPTZ,
    next_attempt_time TIMESTAMPTZ,
    timeout_ms INTEGER NOT NULL DEFAULT 60000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Performance Optimization

-- Journey Executions Indexes
CREATE INDEX IF NOT EXISTS idx_journey_executions_journey_participant ON journey_executions(journey_id, participant_id);
CREATE INDEX IF NOT EXISTS idx_journey_executions_status ON journey_executions(status);
CREATE INDEX IF NOT EXISTS idx_journey_executions_next_execution ON journey_executions(next_execution_at) WHERE next_execution_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journey_executions_created_at ON journey_executions(created_at);

-- Scheduled Executions Indexes (Critical for 5-minute processing)
CREATE INDEX IF NOT EXISTS idx_scheduled_executions_queue_priority ON scheduled_executions(scheduled_for, priority, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_executions_status ON scheduled_executions(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_executions_execution_id ON scheduled_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_executions_journey_participant ON scheduled_executions(journey_id, participant_id);

-- Performance Metrics Indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON journey_performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON journey_performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_journey ON journey_performance_metrics(journey_id) WHERE journey_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_timestamp ON journey_performance_metrics(metric_type, timestamp);

-- Execution Logs Indexes
CREATE INDEX IF NOT EXISTS idx_execution_logs_journey_timestamp ON journey_execution_logs(journey_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_execution_logs_instance ON journey_execution_logs(instance_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_step_status ON journey_execution_logs(step_type, status);

-- Timeline Milestones Indexes
CREATE INDEX IF NOT EXISTS idx_timeline_milestones_execution ON wedding_timeline_milestones(execution_id);
CREATE INDEX IF NOT EXISTS idx_timeline_milestones_scheduled_date ON wedding_timeline_milestones(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_timeline_milestones_category_priority ON wedding_timeline_milestones(category, priority);

-- Manual Tasks and Escalations Indexes
CREATE INDEX IF NOT EXISTS idx_manual_tasks_status_priority ON manual_intervention_tasks(status, priority);
CREATE INDEX IF NOT EXISTS idx_manual_tasks_due_date ON manual_intervention_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_escalations_status_priority ON escalations(status, priority);
CREATE INDEX IF NOT EXISTS idx_escalations_business_impact ON escalations(business_impact);

-- Recovery Pattern Indexes
CREATE INDEX IF NOT EXISTS idx_recovery_patterns_node_type ON journey_recovery_patterns(node_type);
CREATE INDEX IF NOT EXISTS idx_recovery_patterns_last_occurrence ON journey_recovery_patterns(last_occurrence);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE journey_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_intervention_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_timeline_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Journey Executions (Organization-based access)
CREATE POLICY "journey_executions_select" ON journey_executions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

CREATE POLICY "journey_executions_insert" ON journey_executions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

CREATE POLICY "journey_executions_update" ON journey_executions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

-- Similar policies for scheduled_executions
CREATE POLICY "scheduled_executions_select" ON scheduled_executions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

CREATE POLICY "scheduled_executions_insert" ON scheduled_executions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

CREATE POLICY "scheduled_executions_update" ON scheduled_executions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

-- Execution logs policies
CREATE POLICY "execution_logs_select" ON journey_execution_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

CREATE POLICY "execution_logs_insert" ON journey_execution_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

-- Performance metrics policies (system access)
CREATE POLICY "performance_metrics_select" ON journey_performance_metrics
    FOR SELECT USING (
        CASE 
            WHEN journey_id IS NOT NULL THEN
                EXISTS (
                    SELECT 1 FROM journeys j 
                    WHERE j.id = journey_id 
                    AND j.organization_id = auth.jwt() ->> 'organization_id'
                )
            ELSE true -- System-wide metrics
        END
    );

-- Manual intervention and escalations (organization-based)
CREATE POLICY "manual_tasks_select" ON manual_intervention_tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

CREATE POLICY "escalations_select" ON escalations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

-- Timeline milestones policies
CREATE POLICY "timeline_milestones_select" ON wedding_timeline_milestones
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

-- Functions and Triggers for Automated Maintenance

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_journey_executions_updated_at 
    BEFORE UPDATE ON journey_executions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_executions_updated_at 
    BEFORE UPDATE ON scheduled_executions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_rules_updated_at 
    BEFORE UPDATE ON journey_alert_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manual_tasks_updated_at 
    BEFORE UPDATE ON manual_intervention_tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escalations_updated_at 
    BEFORE UPDATE ON escalations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timeline_milestones_updated_at 
    BEFORE UPDATE ON wedding_timeline_milestones 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recovery_patterns_updated_at 
    BEFORE UPDATE ON journey_recovery_patterns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_circuit_breakers_updated_at 
    BEFORE UPDATE ON journey_circuit_breakers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old execution logs
CREATE OR REPLACE FUNCTION cleanup_old_execution_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM journey_execution_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    DELETE FROM journey_performance_metrics 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Clean up completed scheduled executions older than 7 days
    DELETE FROM scheduled_executions 
    WHERE status IN ('completed', 'failed', 'cancelled') 
    AND updated_at < NOW() - INTERVAL '7 days';
END;
$$ language 'plpgsql';

-- Function to calculate journey execution statistics
CREATE OR REPLACE FUNCTION get_journey_execution_stats(journey_uuid UUID)
RETURNS TABLE (
    total_executions BIGINT,
    active_executions BIGINT,
    completed_executions BIGINT,
    failed_executions BIGINT,
    average_completion_time NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE status = 'running') as active_executions,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_executions,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_executions,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FILTER (WHERE completed_at IS NOT NULL) as average_completion_time
    FROM journey_executions 
    WHERE journey_id = journey_uuid;
END;
$$ language 'plpgsql';

-- Function to get queue depth and processing metrics
CREATE OR REPLACE FUNCTION get_scheduler_metrics()
RETURNS TABLE (
    queue_depth BIGINT,
    processing_count BIGINT,
    avg_processing_time NUMERIC,
    error_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as queue_depth,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) FILTER (WHERE status IN ('completed', 'failed')) as avg_processing_time,
        (COUNT(*) FILTER (WHERE status = 'failed')::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'failed')), 0)) as error_rate
    FROM scheduled_executions 
    WHERE created_at > NOW() - INTERVAL '1 hour';
END;
$$ language 'plpgsql';

-- Schedule automated cleanup using pg_cron (if available)
-- SELECT cron.schedule('cleanup-journey-logs', '0 2 * * *', 'SELECT cleanup_old_execution_logs();');

-- Initial Alert Rules for Performance Monitoring
INSERT INTO journey_alert_rules (name, metric_type, condition, threshold, window_minutes, severity) 
VALUES 
    ('High Node Execution Time', 'execution_time', 'gt', 1500, 5, 'high'),
    ('High Queue Depth', 'queue_depth', 'gt', 800, 2, 'medium'),
    ('High Error Rate', 'error_count', 'gt', 10, 5, 'critical'),
    ('Memory Usage Alert', 'memory_heap_used', 'gt', 400, 5, 'medium')
ON CONFLICT DO NOTHING;

-- Comments for Documentation
COMMENT ON TABLE journey_executions IS 'Enhanced journey execution instances with performance tracking';
COMMENT ON TABLE scheduled_executions IS 'Queue for scheduled journey node executions with 5-minute processing';
COMMENT ON TABLE journey_execution_logs IS 'Detailed logs of all journey execution steps';
COMMENT ON TABLE journey_performance_metrics IS 'Real-time performance metrics for monitoring';
COMMENT ON TABLE journey_alert_rules IS 'Configuration for automated performance alerts';
COMMENT ON TABLE manual_intervention_tasks IS 'Tasks requiring manual intervention in journey execution';
COMMENT ON TABLE escalations IS 'Failed executions requiring management attention';
COMMENT ON TABLE wedding_timeline_milestones IS 'Wedding-specific timeline milestones and scheduling';
COMMENT ON TABLE journey_recovery_patterns IS 'Machine learning patterns for intelligent recovery';
COMMENT ON TABLE journey_circuit_breakers IS 'Circuit breaker states for failing services';

-- Grant necessary permissions (adjust based on your role structure)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250121000001_journey_metrics_analytics.sql
-- ========================================

-- Journey Builder Metrics & Analytics Tables - Team D Round 2
-- Enhanced analytics infrastructure for Journey Builder metrics
-- Integration with Team B execution engine events and performance data

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================================
-- JOURNEY ANALYTICS SCHEMA
-- ============================================================================

-- Journey Execution Analytics Table
DROP VIEW IF EXISTS journey_execution_analytics CASCADE;
CREATE TABLE IF NOT EXISTS journey_execution_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id UUID NOT NULL,
    execution_id UUID REFERENCES journey_executions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL,
    -- Time-based metrics
    execution_start_time TIMESTAMPTZ NOT NULL,
    execution_end_time TIMESTAMPTZ,
    total_execution_duration_ms INTEGER,
    queue_wait_time_ms INTEGER DEFAULT 0,
    -- Node execution metrics
    total_nodes INTEGER NOT NULL DEFAULT 0,
    completed_nodes INTEGER NOT NULL DEFAULT 0,
    failed_nodes INTEGER NOT NULL DEFAULT 0,
    skipped_nodes INTEGER NOT NULL DEFAULT 0,
    retry_count INTEGER NOT NULL DEFAULT 0,
    -- Performance metrics
    avg_node_execution_time_ms NUMERIC(10,2) NOT NULL DEFAULT 0,
    max_node_execution_time_ms INTEGER DEFAULT 0,
    min_node_execution_time_ms INTEGER DEFAULT 0,
    -- Business metrics
    journey_completion_rate NUMERIC(5,4) NOT NULL DEFAULT 0, -- 0.0 to 1.0000
    error_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    -- Journey categorization
    journey_type TEXT,
    journey_priority INTEGER NOT NULL DEFAULT 5,
    participant_tier TEXT,
    wedding_date TIMESTAMPTZ,
    days_to_wedding INTEGER,
    -- System metrics
    memory_usage_bytes BIGINT DEFAULT 0,
    cpu_usage_percent NUMERIC(5,2) DEFAULT 0,
    -- Metadata
    organization_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Node Performance Analytics Table
DROP VIEW IF EXISTS node_performance_analytics CASCADE;
CREATE TABLE IF NOT EXISTS node_performance_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id UUID NOT NULL,
    execution_id UUID REFERENCES journey_executions(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    node_type TEXT NOT NULL,
    node_name TEXT NOT NULL,
    -- Execution details
    execution_order INTEGER NOT NULL,
    execution_start_time TIMESTAMPTZ NOT NULL,
    execution_end_time TIMESTAMPTZ,
    execution_duration_ms INTEGER NOT NULL,
    -- Status and results
    status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'timeout', 'skipped', 'retry')),
    retry_attempt INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    error_type TEXT,
    -- Performance metrics
    memory_delta_bytes BIGINT DEFAULT 0,
    cpu_time_ms INTEGER DEFAULT 0,
    network_requests INTEGER DEFAULT 0,
    database_queries INTEGER DEFAULT 0,
    -- Business context
    business_impact TEXT CHECK (business_impact IN ('low', 'medium', 'high', 'critical')),
    user_visible BOOLEAN NOT NULL DEFAULT false,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journey Performance Trends Table
DROP VIEW IF EXISTS journey_performance_trends CASCADE;
CREATE TABLE IF NOT EXISTS journey_performance_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id UUID NOT NULL,
    trend_date DATE NOT NULL,
    hour_of_day INTEGER CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
    -- Volume metrics
    total_executions INTEGER NOT NULL DEFAULT 0,
    successful_executions INTEGER NOT NULL DEFAULT 0,
    failed_executions INTEGER NOT NULL DEFAULT 0,
    -- Performance metrics
    avg_execution_time_ms NUMERIC(10,2) NOT NULL DEFAULT 0,
    p50_execution_time_ms INTEGER DEFAULT 0,
    p95_execution_time_ms INTEGER DEFAULT 0,
    p99_execution_time_ms INTEGER DEFAULT 0,
    -- Error analysis
    error_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    timeout_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    retry_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    -- Queue metrics
    avg_queue_wait_time_ms NUMERIC(10,2) DEFAULT 0,
    max_queue_depth INTEGER DEFAULT 0,
    -- Resource utilization
    avg_memory_usage_mb NUMERIC(10,2) DEFAULT 0,
    avg_cpu_usage_percent NUMERIC(5,2) DEFAULT 0,
    -- Business metrics
    wedding_execution_count INTEGER DEFAULT 0,
    urgent_execution_count INTEGER DEFAULT 0,
    vip_execution_count INTEGER DEFAULT 0,
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(journey_id, trend_date, hour_of_day)
);

-- Real-time Performance Dashboard Table
DROP VIEW IF EXISTS journey_realtime_metrics CASCADE;
CREATE TABLE IF NOT EXISTS journey_realtime_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Current system state
    active_executions INTEGER NOT NULL DEFAULT 0,
    queue_depth INTEGER NOT NULL DEFAULT 0,
    processing_rate NUMERIC(8,2) NOT NULL DEFAULT 0, -- executions per minute
    -- Performance indicators
    avg_execution_time_last_5min NUMERIC(10,2) DEFAULT 0,
    error_rate_last_5min NUMERIC(5,4) DEFAULT 0,
    timeout_rate_last_5min NUMERIC(5,4) DEFAULT 0,
    -- Resource metrics
    memory_usage_mb NUMERIC(10,2) DEFAULT 0,
    cpu_usage_percent NUMERIC(5,2) DEFAULT 0,
    disk_io_mb_per_sec NUMERIC(10,2) DEFAULT 0,
    -- Journey-specific metrics
    journey_metrics JSONB DEFAULT '{}', -- Per-journey breakdown
    node_type_metrics JSONB DEFAULT '{}', -- Per-node-type performance
    -- Health indicators
    system_health_score NUMERIC(3,2) DEFAULT 1.0, -- 0.0 to 1.0
    alerts_active INTEGER DEFAULT 0,
    circuit_breakers_open INTEGER DEFAULT 0,
    -- TTL for cleanup (keep only last 24 hours)
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

-- Journey Error Analytics Table
DROP VIEW IF EXISTS journey_error_analytics CASCADE;
CREATE TABLE IF NOT EXISTS journey_error_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id UUID NOT NULL,
    execution_id UUID REFERENCES journey_executions(id) ON DELETE SET NULL,
    node_id TEXT,
    node_type TEXT,
    -- Error details
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    error_code TEXT,
    -- Context
    participant_id UUID,
    participant_data JSONB DEFAULT '{}',
    execution_context JSONB DEFAULT '{}',
    -- Classification
    error_severity TEXT NOT NULL CHECK (error_severity IN ('low', 'medium', 'high', 'critical')),
    error_category TEXT, -- 'timeout', 'network', 'validation', 'business_rule', etc.
    recoverable BOOLEAN NOT NULL DEFAULT true,
    -- Resolution tracking
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolution_time TIMESTAMPTZ,
    resolution_method TEXT,
    resolution_notes TEXT,
    -- Frequency tracking
    occurrence_count INTEGER NOT NULL DEFAULT 1,
    first_occurrence TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_occurrence TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Impact assessment
    user_impact BOOLEAN NOT NULL DEFAULT false,
    business_impact TEXT CHECK (business_impact IN ('low', 'medium', 'high', 'critical')),
    revenue_impact_usd NUMERIC(12,2) DEFAULT 0,
    -- Metadata
    organization_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Business Intelligence Aggregations Table
DROP VIEW IF EXISTS journey_business_intelligence CASCADE;
CREATE TABLE IF NOT EXISTS journey_business_intelligence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date_dimension DATE NOT NULL,
    journey_id UUID,
    organization_id UUID NOT NULL,
    -- Execution volume
    total_executions INTEGER NOT NULL DEFAULT 0,
    successful_executions INTEGER NOT NULL DEFAULT 0,
    failed_executions INTEGER NOT NULL DEFAULT 0,
    -- Time-based analysis
    avg_execution_time_minutes NUMERIC(8,2) DEFAULT 0,
    total_execution_time_hours NUMERIC(10,2) DEFAULT 0,
    -- Business metrics
    weddings_processed INTEGER DEFAULT 0,
    leads_converted INTEGER DEFAULT 0,
    revenue_generated_usd NUMERIC(12,2) DEFAULT 0,
    cost_per_execution_usd NUMERIC(8,2) DEFAULT 0,
    -- Efficiency metrics
    automation_rate NUMERIC(5,4) DEFAULT 0, -- Percentage of fully automated executions
    manual_intervention_rate NUMERIC(5,4) DEFAULT 0,
    sla_compliance_rate NUMERIC(5,4) DEFAULT 0,
    -- Quality metrics
    customer_satisfaction_score NUMERIC(3,2) DEFAULT 0,
    error_impact_score NUMERIC(5,2) DEFAULT 0,
    -- Predictive indicators
    trend_direction TEXT CHECK (trend_direction IN ('improving', 'stable', 'degrading')),
    predicted_volume_next_day INTEGER DEFAULT 0,
    capacity_utilization NUMERIC(5,4) DEFAULT 0,
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(date_dimension, journey_id, organization_id)
);

-- ============================================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ============================================================================

-- Journey Execution Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_journey_execution_analytics_journey_time 
    ON journey_execution_analytics(journey_id, execution_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_journey_execution_analytics_participant 
    ON journey_execution_analytics(participant_id, execution_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_journey_execution_analytics_org_time 
    ON journey_execution_analytics(organization_id, execution_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_journey_execution_analytics_completion_rate 
    ON journey_execution_analytics(journey_completion_rate) WHERE journey_completion_rate < 0.9;
CREATE INDEX IF NOT EXISTS idx_journey_execution_analytics_wedding_date 
    ON journey_execution_analytics(wedding_date) WHERE wedding_date IS NOT NULL;

-- Node Performance Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_node_performance_analytics_journey_node 
    ON node_performance_analytics(journey_id, node_id, execution_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_node_performance_analytics_type_status 
    ON node_performance_analytics(node_type, status, execution_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_node_performance_analytics_duration 
    ON node_performance_analytics(execution_duration_ms DESC) WHERE status = 'success';
CREATE INDEX IF NOT EXISTS idx_node_performance_analytics_failures 
    ON node_performance_analytics(node_type, error_type, execution_start_time DESC) WHERE status = 'failure';

-- Journey Performance Trends Indexes
CREATE INDEX IF NOT EXISTS idx_journey_performance_trends_journey_date 
    ON journey_performance_trends(journey_id, trend_date DESC, hour_of_day);
CREATE INDEX IF NOT EXISTS idx_journey_performance_trends_date_hour 
    ON journey_performance_trends(trend_date DESC, hour_of_day);
CREATE INDEX IF NOT EXISTS idx_journey_performance_trends_error_rate 
    ON journey_performance_trends(error_rate DESC) WHERE error_rate > 0.05;

-- Real-time Metrics Indexes
CREATE INDEX IF NOT EXISTS idx_journey_realtime_metrics_timestamp 
    ON journey_realtime_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_journey_realtime_metrics_health 
    ON journey_realtime_metrics(system_health_score ASC) WHERE system_health_score < 0.8;
CREATE INDEX IF NOT EXISTS idx_journey_realtime_metrics_expires 
    ON journey_realtime_metrics(expires_at);

-- Error Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_journey_error_analytics_journey_time 
    ON journey_error_analytics(journey_id, last_occurrence DESC);
CREATE INDEX IF NOT EXISTS idx_journey_error_analytics_type_severity 
    ON journey_error_analytics(error_type, error_severity, last_occurrence DESC);
CREATE INDEX IF NOT EXISTS idx_journey_error_analytics_unresolved 
    ON journey_error_analytics(resolved, error_severity, last_occurrence DESC) WHERE NOT resolved;
CREATE INDEX IF NOT EXISTS idx_journey_error_analytics_frequency 
    ON journey_error_analytics(occurrence_count DESC, last_occurrence DESC) WHERE occurrence_count > 5;

-- Business Intelligence Indexes
CREATE INDEX IF NOT EXISTS idx_journey_business_intelligence_date_org 
    ON journey_business_intelligence(date_dimension DESC, organization_id);
CREATE INDEX IF NOT EXISTS idx_journey_business_intelligence_journey_date 
    ON journey_business_intelligence(journey_id, date_dimension DESC);
CREATE INDEX IF NOT EXISTS idx_journey_business_intelligence_revenue 
    ON journey_business_intelligence(revenue_generated_usd DESC) WHERE revenue_generated_usd > 0;

-- ============================================================================
-- DATA AGGREGATION VIEWS
-- ============================================================================

-- Journey Performance Summary View
CREATE OR REPLACE VIEW journey_performance_summary AS
SELECT 
    j.id as journey_id,
    j.name as journey_name,
    j.organization_id,
    -- Volume metrics (last 30 days)
    COUNT(jea.id) as total_executions_30d,
    COUNT(jea.id) FILTER (WHERE jea.journey_completion_rate = 1.0) as successful_executions_30d,
    COUNT(jea.id) FILTER (WHERE jea.journey_completion_rate < 1.0) as failed_executions_30d,
    -- Performance metrics
    ROUND(AVG(jea.total_execution_duration_ms), 2) as avg_execution_time_ms,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY jea.total_execution_duration_ms), 2) as p50_execution_time_ms,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY jea.total_execution_duration_ms), 2) as p95_execution_time_ms,
    -- Quality metrics
    ROUND(AVG(jea.journey_completion_rate), 4) as avg_completion_rate,
    ROUND(AVG(jea.error_rate), 4) as avg_error_rate,
    ROUND(AVG(jea.queue_wait_time_ms), 2) as avg_queue_wait_time_ms,
    -- Business metrics
    COUNT(jea.id) FILTER (WHERE jea.wedding_date IS NOT NULL) as wedding_executions_30d,
    COUNT(jea.id) FILTER (WHERE jea.days_to_wedding <= 7) as urgent_executions_30d,
    COUNT(jea.id) FILTER (WHERE jea.participant_tier IN ('VIP', 'PREMIUM')) as vip_executions_30d,
    -- Latest execution
    MAX(jea.execution_start_time) as last_execution_time,
    -- Health indicators
    CASE 
        WHEN AVG(jea.journey_completion_rate) > 0.95 AND AVG(jea.error_rate) < 0.05 THEN 'excellent'
        WHEN AVG(jea.journey_completion_rate) > 0.85 AND AVG(jea.error_rate) < 0.10 THEN 'good'
        WHEN AVG(jea.journey_completion_rate) > 0.70 AND AVG(jea.error_rate) < 0.20 THEN 'fair'
        ELSE 'poor'
    END as health_status
FROM journeys j
LEFT JOIN journey_execution_analytics jea ON j.id = jea.journey_id 
    AND jea.execution_start_time >= NOW() - INTERVAL '30 days'
WHERE j.is_active = true
GROUP BY j.id, j.name, j.organization_id;

-- Node Performance Insights View
CREATE OR REPLACE VIEW node_performance_insights AS
SELECT 
    node_type,
    node_id,
    -- Volume metrics
    COUNT(*) as total_executions,
    COUNT(*) FILTER (WHERE status = 'success') as successful_executions,
    COUNT(*) FILTER (WHERE status = 'failure') as failed_executions,
    COUNT(*) FILTER (WHERE status = 'timeout') as timeout_executions,
    COUNT(*) FILTER (WHERE retry_attempt > 0) as retry_executions,
    -- Performance metrics
    ROUND(AVG(execution_duration_ms), 2) as avg_execution_time_ms,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY execution_duration_ms), 2) as p50_execution_time_ms,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_duration_ms), 2) as p95_execution_time_ms,
    MAX(execution_duration_ms) as max_execution_time_ms,
    MIN(execution_duration_ms) as min_execution_time_ms,
    -- Error analysis
    ROUND(COUNT(*) FILTER (WHERE status = 'failure')::NUMERIC / NULLIF(COUNT(*), 0), 4) as error_rate,
    ROUND(COUNT(*) FILTER (WHERE status = 'timeout')::NUMERIC / NULLIF(COUNT(*), 0), 4) as timeout_rate,
    ROUND(COUNT(*) FILTER (WHERE retry_attempt > 0)::NUMERIC / NULLIF(COUNT(*), 0), 4) as retry_rate,
    -- Most common error
    (SELECT error_type FROM node_performance_analytics npa2 
     WHERE npa2.node_type = npa.node_type AND npa2.status = 'failure' AND npa2.error_type IS NOT NULL
     GROUP BY error_type ORDER BY COUNT(*) DESC LIMIT 1) as most_common_error,
    -- Resource metrics
    ROUND(AVG(memory_delta_bytes) / 1024.0 / 1024.0, 2) as avg_memory_delta_mb,
    ROUND(AVG(cpu_time_ms), 2) as avg_cpu_time_ms,
    -- Business impact
    COUNT(*) FILTER (WHERE business_impact = 'critical') as critical_impact_executions,
    COUNT(*) FILTER (WHERE user_visible = true) as user_visible_executions,
    -- Time analysis
    MAX(execution_start_time) as last_execution_time,
    MIN(execution_start_time) as first_execution_time
FROM node_performance_analytics npa
WHERE execution_start_time >= NOW() - INTERVAL '7 days'
GROUP BY node_type, node_id
ORDER BY total_executions DESC, error_rate DESC;

-- Real-time System Health Dashboard View
CREATE OR REPLACE VIEW system_health_dashboard AS
SELECT 
    -- Current state (most recent metrics)
    (SELECT active_executions FROM journey_realtime_metrics 
     ORDER BY timestamp DESC LIMIT 1) as current_active_executions,
    (SELECT queue_depth FROM journey_realtime_metrics 
     ORDER BY timestamp DESC LIMIT 1) as current_queue_depth,
    (SELECT processing_rate FROM journey_realtime_metrics 
     ORDER BY timestamp DESC LIMIT 1) as current_processing_rate,
    (SELECT system_health_score FROM journey_realtime_metrics 
     ORDER BY timestamp DESC LIMIT 1) as current_health_score,
    -- Performance indicators (last hour average)
    (SELECT ROUND(AVG(avg_execution_time_last_5min), 2) 
     FROM journey_realtime_metrics 
     WHERE timestamp >= NOW() - INTERVAL '1 hour') as avg_execution_time_1h,
    (SELECT ROUND(AVG(error_rate_last_5min), 4) 
     FROM journey_realtime_metrics 
     WHERE timestamp >= NOW() - INTERVAL '1 hour') as avg_error_rate_1h,
    -- Resource utilization (current)
    (SELECT memory_usage_mb FROM journey_realtime_metrics 
     ORDER BY timestamp DESC LIMIT 1) as current_memory_usage_mb,
    (SELECT cpu_usage_percent FROM journey_realtime_metrics 
     ORDER BY timestamp DESC LIMIT 1) as current_cpu_usage_percent,
    -- Alert status
    (SELECT alerts_active FROM journey_realtime_metrics 
     ORDER BY timestamp DESC LIMIT 1) as active_alerts,
    (SELECT circuit_breakers_open FROM journey_realtime_metrics 
     ORDER BY timestamp DESC LIMIT 1) as circuit_breakers_open,
    -- Trends (last 4 hours)
    (SELECT CASE 
        WHEN CORR(EXTRACT(EPOCH FROM timestamp), processing_rate) > 0.3 THEN 'increasing'
        WHEN CORR(EXTRACT(EPOCH FROM timestamp), processing_rate) < -0.3 THEN 'decreasing'
        ELSE 'stable'
     END FROM journey_realtime_metrics 
     WHERE timestamp >= NOW() - INTERVAL '4 hours') as processing_rate_trend,
    (SELECT CASE 
        WHEN CORR(EXTRACT(EPOCH FROM timestamp), error_rate_last_5min) > 0.3 THEN 'increasing'
        WHEN CORR(EXTRACT(EPOCH FROM timestamp), error_rate_last_5min) < -0.3 THEN 'decreasing'
        ELSE 'stable'
     END FROM journey_realtime_metrics 
     WHERE timestamp >= NOW() - INTERVAL '4 hours') as error_rate_trend,
    -- Capacity indicators
    (SELECT ROUND(AVG(queue_depth), 0) 
     FROM journey_realtime_metrics 
     WHERE timestamp >= NOW() - INTERVAL '1 hour') as avg_queue_depth_1h,
    (SELECT MAX(queue_depth) 
     FROM journey_realtime_metrics 
     WHERE timestamp >= NOW() - INTERVAL '1 hour') as max_queue_depth_1h;

-- Business Performance Dashboard View
CREATE OR REPLACE VIEW business_performance_dashboard AS
SELECT 
    organization_id,
    -- Daily metrics (today vs yesterday)
    COALESCE(SUM(total_executions) FILTER (WHERE date_dimension = CURRENT_DATE), 0) as executions_today,
    COALESCE(SUM(total_executions) FILTER (WHERE date_dimension = CURRENT_DATE - 1), 0) as executions_yesterday,
    COALESCE(SUM(successful_executions) FILTER (WHERE date_dimension = CURRENT_DATE), 0) as successful_today,
    COALESCE(SUM(failed_executions) FILTER (WHERE date_dimension = CURRENT_DATE), 0) as failed_today,
    -- Success rate comparison
    ROUND(COALESCE(
        SUM(successful_executions) FILTER (WHERE date_dimension = CURRENT_DATE)::NUMERIC / 
        NULLIF(SUM(total_executions) FILTER (WHERE date_dimension = CURRENT_DATE), 0), 0
    ), 4) as success_rate_today,
    ROUND(COALESCE(
        SUM(successful_executions) FILTER (WHERE date_dimension = CURRENT_DATE - 1)::NUMERIC / 
        NULLIF(SUM(total_executions) FILTER (WHERE date_dimension = CURRENT_DATE - 1), 0), 0
    ), 4) as success_rate_yesterday,
    -- Business metrics
    COALESCE(SUM(weddings_processed) FILTER (WHERE date_dimension >= CURRENT_DATE - 6), 0) as weddings_processed_7d,
    COALESCE(SUM(leads_converted) FILTER (WHERE date_dimension >= CURRENT_DATE - 6), 0) as leads_converted_7d,
    COALESCE(SUM(revenue_generated_usd) FILTER (WHERE date_dimension >= CURRENT_DATE - 6), 0) as revenue_7d,
    -- Efficiency metrics (last 7 days)
    ROUND(AVG(automation_rate) FILTER (WHERE date_dimension >= CURRENT_DATE - 6), 4) as avg_automation_rate_7d,
    ROUND(AVG(sla_compliance_rate) FILTER (WHERE date_dimension >= CURRENT_DATE - 6), 4) as avg_sla_compliance_7d,
    ROUND(AVG(customer_satisfaction_score) FILTER (WHERE date_dimension >= CURRENT_DATE - 6), 2) as avg_satisfaction_7d,
    -- Performance trends
    (SELECT trend_direction FROM journey_business_intelligence jbi2 
     WHERE jbi2.organization_id = jbi.organization_id 
     AND date_dimension = CURRENT_DATE - 1 LIMIT 1) as performance_trend,
    -- Capacity planning
    ROUND(AVG(capacity_utilization) FILTER (WHERE date_dimension >= CURRENT_DATE - 6), 4) as avg_capacity_utilization_7d,
    MAX(predicted_volume_next_day) as predicted_volume_tomorrow
FROM journey_business_intelligence jbi
WHERE date_dimension >= CURRENT_DATE - 7
GROUP BY organization_id;

-- ============================================================================
-- AUTOMATED FUNCTIONS FOR ANALYTICS
-- ============================================================================

-- Function to aggregate daily performance trends
CREATE OR REPLACE FUNCTION aggregate_daily_performance_trends()
RETURNS void AS $$
BEGIN
    INSERT INTO journey_performance_trends (
        journey_id, trend_date, hour_of_day,
        total_executions, successful_executions, failed_executions,
        avg_execution_time_ms, p50_execution_time_ms, p95_execution_time_ms, p99_execution_time_ms,
        error_rate, timeout_rate, retry_rate,
        avg_queue_wait_time_ms, max_queue_depth,
        avg_memory_usage_mb, avg_cpu_usage_percent,
        wedding_execution_count, urgent_execution_count, vip_execution_count
    )
    SELECT 
        jea.journey_id,
        jea.execution_start_time::date as trend_date,
        EXTRACT(HOUR FROM jea.execution_start_time) as hour_of_day,
        -- Volume metrics
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE journey_completion_rate = 1.0) as successful_executions,
        COUNT(*) FILTER (WHERE journey_completion_rate < 1.0) as failed_executions,
        -- Performance metrics
        ROUND(AVG(total_execution_duration_ms), 2) as avg_execution_time_ms,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_execution_duration_ms), 2) as p50_execution_time_ms,
        ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_execution_duration_ms), 2) as p95_execution_time_ms,
        ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY total_execution_duration_ms), 2) as p99_execution_time_ms,
        -- Error rates
        ROUND(AVG(error_rate), 4) as error_rate,
        ROUND(COUNT(*) FILTER (WHERE total_execution_duration_ms > (
            SELECT avg_execution_time_ms * 3 FROM journey_performance_summary WHERE journey_id = jea.journey_id
        ))::NUMERIC / COUNT(*), 4) as timeout_rate,
        ROUND(AVG(retry_count), 4) as retry_rate,
        -- Queue metrics
        ROUND(AVG(queue_wait_time_ms), 2) as avg_queue_wait_time_ms,
        MAX(queue_wait_time_ms) / 1000 as max_queue_depth, -- Approximation
        -- Resource metrics
        ROUND(AVG(memory_usage_bytes) / 1024.0 / 1024.0, 2) as avg_memory_usage_mb,
        ROUND(AVG(cpu_usage_percent), 2) as avg_cpu_usage_percent,
        -- Business metrics
        COUNT(*) FILTER (WHERE wedding_date IS NOT NULL) as wedding_execution_count,
        COUNT(*) FILTER (WHERE days_to_wedding <= 7) as urgent_execution_count,
        COUNT(*) FILTER (WHERE participant_tier IN ('VIP', 'PREMIUM')) as vip_execution_count
    FROM journey_execution_analytics jea
    WHERE jea.execution_start_time >= CURRENT_DATE - 1
      AND jea.execution_start_time < CURRENT_DATE
      AND NOT EXISTS (
          SELECT 1 FROM journey_performance_trends jpt 
          WHERE jpt.journey_id = jea.journey_id 
            AND jpt.trend_date = jea.execution_start_time::date
            AND jpt.hour_of_day = EXTRACT(HOUR FROM jea.execution_start_time)
      )
    GROUP BY jea.journey_id, jea.execution_start_time::date, EXTRACT(HOUR FROM jea.execution_start_time);
    
    -- Update existing trend records
    UPDATE journey_performance_trends SET updated_at = NOW() 
    WHERE trend_date = CURRENT_DATE - 1;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate real-time system metrics
CREATE OR REPLACE FUNCTION update_realtime_metrics()
RETURNS void AS $$
DECLARE
    active_count integer;
    queue_count integer;
    current_processing_rate numeric;
    current_error_rate numeric;
    current_health_score numeric;
BEGIN
    -- Get current system state
    SELECT COUNT(*) INTO active_count FROM journey_executions WHERE status = 'running';
    SELECT COUNT(*) INTO queue_count FROM scheduled_executions WHERE status = 'pending';
    
    -- Calculate processing rate (executions per minute over last 5 minutes)
    SELECT COUNT(*)::numeric / 5.0 INTO current_processing_rate
    FROM journey_execution_analytics 
    WHERE execution_start_time >= NOW() - INTERVAL '5 minutes';
    
    -- Calculate error rate over last 5 minutes
    SELECT COALESCE(AVG(error_rate), 0) INTO current_error_rate
    FROM journey_execution_analytics 
    WHERE execution_start_time >= NOW() - INTERVAL '5 minutes';
    
    -- Calculate health score (weighted composite score)
    current_health_score := GREATEST(0.0, LEAST(1.0, 
        1.0 - (current_error_rate * 2.0) - 
        (CASE WHEN queue_count > 500 THEN 0.3 ELSE 0.0 END) -
        (CASE WHEN active_count > 40 THEN 0.2 ELSE 0.0 END)
    ));
    
    -- Insert real-time metrics
    INSERT INTO journey_realtime_metrics (
        active_executions,
        queue_depth,
        processing_rate,
        avg_execution_time_last_5min,
        error_rate_last_5min,
        timeout_rate_last_5min,
        system_health_score
    )
    SELECT 
        active_count,
        queue_count,
        current_processing_rate,
        COALESCE((SELECT AVG(total_execution_duration_ms) FROM journey_execution_analytics 
                 WHERE execution_start_time >= NOW() - INTERVAL '5 minutes'), 0),
        current_error_rate,
        COALESCE((SELECT COUNT(*)::numeric / NULLIF(COUNT(*), 0) FROM node_performance_analytics 
                 WHERE execution_start_time >= NOW() - INTERVAL '5 minutes' AND status = 'timeout'), 0),
        current_health_score;
        
    -- Clean up old real-time metrics
    DELETE FROM journey_realtime_metrics WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update business intelligence aggregations
CREATE OR REPLACE FUNCTION update_business_intelligence()
RETURNS void AS $$
BEGIN
    INSERT INTO journey_business_intelligence (
        date_dimension, journey_id, organization_id,
        total_executions, successful_executions, failed_executions,
        avg_execution_time_minutes, total_execution_time_hours,
        weddings_processed, leads_converted,
        automation_rate, manual_intervention_rate, sla_compliance_rate
    )
    SELECT 
        jea.execution_start_time::date as date_dimension,
        jea.journey_id,
        jea.organization_id,
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE journey_completion_rate = 1.0) as successful_executions,
        COUNT(*) FILTER (WHERE journey_completion_rate < 1.0) as failed_executions,
        ROUND(AVG(total_execution_duration_ms) / 60000.0, 2) as avg_execution_time_minutes,
        ROUND(SUM(total_execution_duration_ms) / 3600000.0, 2) as total_execution_time_hours,
        COUNT(*) FILTER (WHERE wedding_date IS NOT NULL) as weddings_processed,
        COUNT(*) FILTER (WHERE journey_completion_rate = 1.0 AND wedding_date IS NOT NULL) as leads_converted,
        ROUND(COUNT(*) FILTER (WHERE retry_count = 0)::numeric / COUNT(*), 4) as automation_rate,
        ROUND((SELECT COUNT(*)::numeric FROM manual_intervention_tasks mit 
               WHERE mit.created_at::date = jea.execution_start_time::date) / COUNT(*), 4) as manual_intervention_rate,
        ROUND(COUNT(*) FILTER (WHERE total_execution_duration_ms <= 300000)::numeric / COUNT(*), 4) as sla_compliance_rate
    FROM journey_execution_analytics jea
    WHERE jea.execution_start_time >= CURRENT_DATE - 1
      AND jea.execution_start_time < CURRENT_DATE
    GROUP BY jea.execution_start_time::date, jea.journey_id, jea.organization_id
    ON CONFLICT (date_dimension, journey_id, organization_id) 
    DO UPDATE SET 
        total_executions = EXCLUDED.total_executions,
        successful_executions = EXCLUDED.successful_executions,
        failed_executions = EXCLUDED.failed_executions,
        avg_execution_time_minutes = EXCLUDED.avg_execution_time_minutes,
        total_execution_time_hours = EXCLUDED.total_execution_time_hours,
        weddings_processed = EXCLUDED.weddings_processed,
        leads_converted = EXCLUDED.leads_converted,
        automation_rate = EXCLUDED.automation_rate,
        manual_intervention_rate = EXCLUDED.manual_intervention_rate,
        sla_compliance_rate = EXCLUDED.sla_compliance_rate,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on analytics tables
ALTER TABLE journey_execution_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_performance_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_realtime_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_error_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_business_intelligence ENABLE ROW LEVEL SECURITY;

-- RLS Policies (organization-based access)
CREATE POLICY "analytics_org_access" ON journey_execution_analytics
    FOR ALL USING (organization_id = auth.jwt() ->> 'organization_id');

CREATE POLICY "node_analytics_org_access" ON node_performance_analytics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM journey_execution_analytics jea 
            WHERE jea.execution_id = node_performance_analytics.execution_id 
            AND jea.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

CREATE POLICY "trends_org_access" ON journey_performance_trends
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_performance_trends.journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

CREATE POLICY "realtime_system_access" ON journey_realtime_metrics
    FOR SELECT USING (true); -- System-wide metrics, read-only for all authenticated users

CREATE POLICY "error_analytics_org_access" ON journey_error_analytics
    FOR ALL USING (organization_id = auth.jwt() ->> 'organization_id');

CREATE POLICY "business_intelligence_org_access" ON journey_business_intelligence
    FOR ALL USING (organization_id = auth.jwt() ->> 'organization_id');

-- ============================================================================
-- AUTOMATED TRIGGERS AND SCHEDULING
-- ============================================================================

-- Trigger to update updated_at timestamps
CREATE TRIGGER update_journey_execution_analytics_updated_at 
    BEFORE UPDATE ON journey_execution_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journey_performance_trends_updated_at 
    BEFORE UPDATE ON journey_performance_trends 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journey_error_analytics_updated_at 
    BEFORE UPDATE ON journey_error_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journey_business_intelligence_updated_at 
    BEFORE UPDATE ON journey_business_intelligence 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE journey_execution_analytics IS 'Comprehensive analytics for journey execution performance and business metrics';
COMMENT ON TABLE node_performance_analytics IS 'Detailed performance analytics for individual journey nodes';
COMMENT ON TABLE journey_performance_trends IS 'Time-series performance trends for capacity planning and optimization';
COMMENT ON TABLE journey_realtime_metrics IS 'Real-time system performance dashboard metrics';
COMMENT ON TABLE journey_error_analytics IS 'Error tracking and analysis for proactive issue resolution';
COMMENT ON TABLE journey_business_intelligence IS 'Business intelligence aggregations for executive reporting';

COMMENT ON VIEW journey_performance_summary IS 'Executive summary of journey performance across all key metrics';
COMMENT ON VIEW node_performance_insights IS 'Detailed node performance analysis for optimization decisions';
COMMENT ON VIEW system_health_dashboard IS 'Real-time system health monitoring dashboard';
COMMENT ON VIEW business_performance_dashboard IS 'Business performance KPIs and trends';

COMMENT ON FUNCTION aggregate_daily_performance_trends() IS 'Aggregates daily performance data for trend analysis';
COMMENT ON FUNCTION update_realtime_metrics() IS 'Updates real-time system metrics for monitoring dashboard';
COMMENT ON FUNCTION update_business_intelligence() IS 'Updates business intelligence aggregations for reporting';


-- ========================================
-- Migration: 20250121000002_analytics_query_optimization.sql
-- ========================================

-- Analytics Query Optimization - Team D Round 2
-- Advanced query optimization for Journey Builder analytics reporting
-- High-performance indexes and materialized views for real-time dashboards

-- ============================================================================
-- ADVANCED PERFORMANCE INDEXES
-- ========================================