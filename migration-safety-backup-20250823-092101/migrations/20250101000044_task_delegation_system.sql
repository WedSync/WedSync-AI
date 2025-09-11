-- Task Delegation System Migration
-- WS-058: Comprehensive task delegation system for efficient workflow management

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'completed', 'blocked', 'cancelled');
CREATE TYPE task_category AS ENUM (
  'venue_management', 'vendor_coordination', 'client_management', 'logistics',
  'design', 'photography', 'catering', 'florals', 'music', 'transportation'
);
CREATE TYPE dependency_type AS ENUM ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish');
CREATE TYPE notification_type AS ENUM ('assignment', 'deadline_reminder', 'status_change', 'dependency_update');

-- Team members table (extends existing user profiles)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'coordinator',
  specialties task_category[] DEFAULT '{}',
  available_hours_per_week INTEGER DEFAULT 40,
  timezone TEXT DEFAULT 'UTC',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow tasks table
CREATE TABLE workflow_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  category task_category NOT NULL,
  priority task_priority NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'todo',
  assigned_to UUID REFERENCES team_members(id) ON DELETE SET NULL,
  assigned_by UUID NOT NULL REFERENCES team_members(id),
  created_by UUID NOT NULL REFERENCES team_members(id),
  estimated_duration INTEGER NOT NULL DEFAULT 1, -- in hours
  buffer_time INTEGER DEFAULT 0, -- in hours
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE,
  completion_date TIMESTAMP WITH TIME ZONE,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  is_critical_path BOOLEAN DEFAULT false,
  notes TEXT,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task dependencies table
CREATE TABLE task_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  predecessor_task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  successor_task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  dependency_type dependency_type NOT NULL DEFAULT 'finish_to_start',
  lag_time INTEGER DEFAULT 0, -- in hours
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT no_self_dependency CHECK (predecessor_task_id != successor_task_id),
  CONSTRAINT unique_dependency UNIQUE (predecessor_task_id, successor_task_id)
);

-- Task assignments table (for multiple assignees)
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES team_members(id),
  role TEXT DEFAULT 'assignee',
  is_primary BOOLEAN DEFAULT true,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_primary_assignment UNIQUE (task_id, is_primary) WHERE is_primary = true
);

-- Task notifications table
CREATE TABLE task_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workload metrics table
CREATE TABLE workload_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_tasks INTEGER DEFAULT 0,
  overdue_tasks INTEGER DEFAULT 0,
  upcoming_deadlines INTEGER DEFAULT 0,
  capacity_utilization DECIMAL(5,2) DEFAULT 0.0,
  weekly_hours_scheduled DECIMAL(5,2) DEFAULT 0.0,
  efficiency_score DECIMAL(5,2) DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_member_date UNIQUE (team_member_id, date)
);

-- Create indexes for performance
CREATE INDEX idx_workflow_tasks_wedding_id ON workflow_tasks(wedding_id);
CREATE INDEX idx_workflow_tasks_assigned_to ON workflow_tasks(assigned_to);
CREATE INDEX idx_workflow_tasks_status ON workflow_tasks(status);
CREATE INDEX idx_workflow_tasks_deadline ON workflow_tasks(deadline);
CREATE INDEX idx_workflow_tasks_category ON workflow_tasks(category);
CREATE INDEX idx_workflow_tasks_priority ON workflow_tasks(priority);
CREATE INDEX idx_workflow_tasks_critical_path ON workflow_tasks(is_critical_path);
CREATE INDEX idx_task_dependencies_predecessor ON task_dependencies(predecessor_task_id);
CREATE INDEX idx_task_dependencies_successor ON task_dependencies(successor_task_id);
CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_assigned_to ON task_assignments(assigned_to);
CREATE INDEX idx_task_notifications_recipient ON task_notifications(recipient_id);
CREATE INDEX idx_task_notifications_unread ON task_notifications(recipient_id, is_read);
CREATE INDEX idx_workload_metrics_member_date ON workload_metrics(team_member_id, date);

-- Functions for critical path calculation
CREATE OR REPLACE FUNCTION calculate_critical_path(wedding_uuid UUID)
RETURNS TABLE (
  task_id UUID,
  is_critical BOOLEAN,
  earliest_start TIMESTAMP WITH TIME ZONE,
  latest_start TIMESTAMP WITH TIME ZONE,
  slack_time INTERVAL
) AS $$
BEGIN
  -- Simplified critical path calculation
  -- In production, this would be a more complex algorithm
  RETURN QUERY
  WITH RECURSIVE task_paths AS (
    -- Base case: tasks with no dependencies
    SELECT 
      t.id,
      t.deadline - (t.estimated_duration + t.buffer_time) * INTERVAL '1 hour' as earliest_start,
      0 as depth
    FROM workflow_tasks t
    WHERE t.wedding_id = wedding_uuid
      AND NOT EXISTS (
        SELECT 1 FROM task_dependencies td 
        WHERE td.successor_task_id = t.id
      )
    
    UNION ALL
    
    -- Recursive case: tasks with dependencies
    SELECT 
      t.id,
      GREATEST(
        tp.earliest_start + (pt.estimated_duration + pt.buffer_time + td.lag_time) * INTERVAL '1 hour',
        t.deadline - (t.estimated_duration + t.buffer_time) * INTERVAL '1 hour'
      ),
      tp.depth + 1
    FROM workflow_tasks t
    JOIN task_dependencies td ON td.successor_task_id = t.id
    JOIN workflow_tasks pt ON pt.id = td.predecessor_task_id
    JOIN task_paths tp ON tp.task_id = pt.id
    WHERE t.wedding_id = wedding_uuid
  )
  SELECT 
    tp.task_id,
    (tp.earliest_start = t.deadline - (t.estimated_duration + t.buffer_time) * INTERVAL '1 hour') as is_critical,
    tp.earliest_start,
    t.deadline - (t.estimated_duration + t.buffer_time) * INTERVAL '1 hour' as latest_start,
    (t.deadline - (t.estimated_duration + t.buffer_time) * INTERVAL '1 hour' - tp.earliest_start) as slack_time
  FROM task_paths tp
  JOIN workflow_tasks t ON t.id = tp.task_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update workload metrics
CREATE OR REPLACE FUNCTION update_workload_metrics(member_uuid UUID)
RETURNS VOID AS $$
DECLARE
  current_tasks_count INTEGER;
  overdue_count INTEGER;
  upcoming_count INTEGER;
  total_hours DECIMAL;
  available_hours DECIMAL;
  utilization DECIMAL;
BEGIN
  -- Calculate current metrics
  SELECT COUNT(*) INTO current_tasks_count
  FROM workflow_tasks
  WHERE assigned_to = member_uuid AND status IN ('todo', 'in_progress');
  
  SELECT COUNT(*) INTO overdue_count
  FROM workflow_tasks
  WHERE assigned_to = member_uuid 
    AND deadline < NOW() 
    AND status NOT IN ('completed', 'cancelled');
  
  SELECT COUNT(*) INTO upcoming_count
  FROM workflow_tasks
  WHERE assigned_to = member_uuid 
    AND deadline BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    AND status NOT IN ('completed', 'cancelled');
  
  SELECT COALESCE(SUM(estimated_duration), 0) INTO total_hours
  FROM workflow_tasks
  WHERE assigned_to = member_uuid 
    AND status IN ('todo', 'in_progress')
    AND deadline BETWEEN NOW() AND NOW() + INTERVAL '7 days';
  
  SELECT available_hours_per_week INTO available_hours
  FROM team_members
  WHERE id = member_uuid;
  
  utilization := CASE WHEN available_hours > 0 THEN (total_hours / available_hours) * 100 ELSE 0 END;
  
  -- Insert or update metrics
  INSERT INTO workload_metrics (
    team_member_id, current_tasks, overdue_tasks, upcoming_deadlines,
    capacity_utilization, weekly_hours_scheduled
  ) VALUES (
    member_uuid, current_tasks_count, overdue_count, upcoming_count,
    utilization, total_hours
  )
  ON CONFLICT (team_member_id, date)
  DO UPDATE SET
    current_tasks = EXCLUDED.current_tasks,
    overdue_tasks = EXCLUDED.overdue_tasks,
    upcoming_deadlines = EXCLUDED.upcoming_deadlines,
    capacity_utilization = EXCLUDED.capacity_utilization,
    weekly_hours_scheduled = EXCLUDED.weekly_hours_scheduled;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update workload metrics on task changes
CREATE OR REPLACE FUNCTION trigger_update_workload()
RETURNS TRIGGER AS $$
BEGIN
  -- Update metrics for old assignee if changed
  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    IF OLD.assigned_to IS NOT NULL THEN
      PERFORM update_workload_metrics(OLD.assigned_to);
    END IF;
  END IF;
  
  -- Update metrics for current assignee
  IF NEW.assigned_to IS NOT NULL THEN
    PERFORM update_workload_metrics(NEW.assigned_to);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_tasks_workload_update
  AFTER INSERT OR UPDATE OF assigned_to, status, deadline, estimated_duration
  ON workflow_tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_workload();

-- Function to create automatic notifications
CREATE OR REPLACE FUNCTION create_task_notification(
  task_uuid UUID,
  recipient_uuid UUID,
  notif_type notification_type,
  notif_title TEXT,
  notif_message TEXT,
  schedule_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO task_notifications (
    task_id, recipient_id, notification_type, title, message, scheduled_for
  ) VALUES (
    task_uuid, recipient_uuid, notif_type, notif_title, notif_message, schedule_time
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic notifications on task assignment
CREATE OR REPLACE FUNCTION trigger_task_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Assignment notification
  IF TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL THEN
    PERFORM create_task_notification(
      NEW.id,
      NEW.assigned_to,
      'assignment',
      'New Task Assigned: ' || NEW.title,
      'You have been assigned a new task: ' || NEW.title || '. Deadline: ' || NEW.deadline::TEXT
    );
  END IF;
  
  -- Status change notification
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.assigned_by != NEW.assigned_to THEN
      PERFORM create_task_notification(
        NEW.id,
        NEW.assigned_by,
        'status_change',
        'Task Status Updated: ' || NEW.title,
        'Task "' || NEW.title || '" status changed from ' || OLD.status || ' to ' || NEW.status
      );
    END IF;
  END IF;
  
  -- Deadline reminder (1 day before)
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.deadline IS DISTINCT FROM NEW.deadline) THEN
    IF NEW.assigned_to IS NOT NULL AND NEW.status NOT IN ('completed', 'cancelled') THEN
      PERFORM create_task_notification(
        NEW.id,
        NEW.assigned_to,
        'deadline_reminder',
        'Deadline Reminder: ' || NEW.title,
        'Reminder: Task "' || NEW.title || '" is due on ' || NEW.deadline::TEXT,
        NEW.deadline - INTERVAL '1 day'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_tasks_notifications
  AFTER INSERT OR UPDATE OF assigned_to, status, deadline
  ON workflow_tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_task_notifications();

-- Row Level Security (RLS) policies
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE workload_metrics ENABLE ROW LEVEL SECURITY;

-- Team members can see all team members in their organization
CREATE POLICY "Team members visibility" ON team_members
  FOR SELECT USING (true); -- Simplified for demo - in production, add organization filtering

-- Users can view tasks they're involved with
CREATE POLICY "Task access" ON workflow_tasks
  FOR SELECT USING (
    assigned_to IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() )) OR
    created_by IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() )) OR
    assigned_by IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() ))
  );

-- Users can create tasks
CREATE POLICY "Task creation" ON workflow_tasks
  FOR INSERT WITH CHECK (
    created_by IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() ))
  );

-- Users can update tasks they're assigned to or created
CREATE POLICY "Task updates" ON workflow_tasks
  FOR UPDATE USING (
    assigned_to IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() )) OR
    created_by IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() )) OR
    assigned_by IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() ))
  );

-- Dependency access follows task access
CREATE POLICY "Dependency access" ON task_dependencies
  FOR SELECT USING (
    predecessor_task_id IN (SELECT id FROM workflow_tasks) OR
    successor_task_id IN (SELECT id FROM workflow_tasks)
  );

-- Assignment access
CREATE POLICY "Assignment access" ON task_assignments
  FOR SELECT USING (
    assigned_to IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() )) OR
    assigned_by IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() ))
  );

-- Notification access
CREATE POLICY "Notification access" ON task_notifications
  FOR SELECT USING (
    recipient_id IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() ))
  );

-- Workload metrics access
CREATE POLICY "Workload access" ON workload_metrics
  FOR SELECT USING (
    team_member_id IN (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() )) OR
    EXISTS (SELECT 1 FROM team_members WHERE user_id = ( SELECT auth.uid() ) AND role IN ('admin', 'manager'))
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create initial wedding planner roles
INSERT INTO team_members (user_id, name, email, role, specialties) VALUES
(auth.uid(), 'System Administrator', 'admin@wedsync.com', 'admin', ARRAY['venue_management', 'vendor_coordination']::task_category[])
ON CONFLICT DO NOTHING;