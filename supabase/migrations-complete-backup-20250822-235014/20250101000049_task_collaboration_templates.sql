-- Task Collaboration and Templates System
-- WS-058 Round 2: Enhanced task collaboration and template management features

-- =====================================================
-- PART 1: TASK COMMENTS AND DISCUSSIONS
-- =====================================================

-- Comments/discussions table for task collaboration
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