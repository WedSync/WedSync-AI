-- =====================================================
-- WS-058: Task Delegation System - Deadline Tracking
-- Migration: 028_deadline_tracking_system.sql
-- =====================================================

-- Table for automated deadline alerts
CREATE TABLE deadline_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('reminder', 'warning', 'overdue', 'escalation')),
    alert_time TIMESTAMPTZ NOT NULL,
    triggered_at TIMESTAMPTZ NULL,
    message TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for task notifications
CREATE TABLE task_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('email', 'in_app', 'sms')),
    urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'read')),
    sent_at TIMESTAMPTZ NULL,
    read_at TIMESTAMPTZ NULL,
    error_message TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_deadline_alerts_task_id ON deadline_alerts(task_id);
CREATE INDEX idx_deadline_alerts_alert_time ON deadline_alerts(alert_time) WHERE triggered_at IS NULL;
CREATE INDEX idx_deadline_alerts_triggered ON deadline_alerts(triggered_at);

CREATE INDEX idx_task_notifications_recipient ON task_notifications(recipient_id);
CREATE INDEX idx_task_notifications_task_id ON task_notifications(task_id);
CREATE INDEX idx_task_notifications_status ON task_notifications(status);
CREATE INDEX idx_task_notifications_urgency ON task_notifications(urgency);

-- Function to trigger deadline alerts automatically
CREATE OR REPLACE FUNCTION process_deadline_alerts()
RETURNS TABLE(
    alert_id UUID,
    task_title TEXT,
    assignee_name TEXT,
    alert_message TEXT,
    alert_priority TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Process pending alerts that are due
    RETURN QUERY
    WITH triggered_alerts AS (
        UPDATE deadline_alerts 
        SET triggered_at = NOW(),
            updated_at = NOW()
        WHERE triggered_at IS NULL 
        AND alert_time <= NOW()
        RETURNING id, task_id, message, priority
    )
    SELECT 
        ta.id,
        wt.title,
        tm.name,
        ta.message,
        ta.priority
    FROM triggered_alerts ta
    JOIN workflow_tasks wt ON ta.task_id = wt.id
    LEFT JOIN team_members tm ON wt.assigned_to = tm.id;
END;
$$;

-- Function to get deadline metrics for a wedding
CREATE OR REPLACE FUNCTION get_deadline_metrics(wedding_id_param UUID)
RETURNS TABLE(
    total_tasks INTEGER,
    upcoming_deadlines INTEGER,
    overdue_tasks INTEGER,
    completed_tasks INTEGER,
    critical_overdue INTEGER,
    average_completion_time INTERVAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH task_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE deadline > NOW() AND status != 'completed') as upcoming,
            COUNT(*) FILTER (WHERE deadline < NOW() AND status != 'completed') as overdue,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE deadline < NOW() AND status != 'completed' AND priority = 'critical') as critical_overdue,
            AVG(CASE 
                WHEN status = 'completed' AND completed_at IS NOT NULL 
                THEN completed_at - created_at 
                ELSE NULL 
            END) as avg_completion
        FROM workflow_tasks 
        WHERE wedding_id = wedding_id_param
        AND deadline IS NOT NULL
    )
    SELECT 
        total::INTEGER,
        upcoming::INTEGER,
        overdue::INTEGER,
        completed::INTEGER,
        critical_overdue::INTEGER,
        avg_completion
    FROM task_stats;
END;
$$;

-- Function to calculate critical path for task dependencies
CREATE OR REPLACE FUNCTION calculate_critical_path(wedding_id_param UUID)
RETURNS TABLE(
    task_id UUID,
    task_title TEXT,
    earliest_start TIMESTAMPTZ,
    latest_finish TIMESTAMPTZ,
    slack_time INTERVAL,
    is_critical BOOLEAN
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Simplified critical path calculation
    -- In a real implementation, this would use proper CPM algorithms
    RETURN QUERY
    WITH RECURSIVE task_hierarchy AS (
        -- Base case: tasks with no dependencies
        SELECT 
            t.id,
            t.title,
            t.created_at as earliest_start,
            t.deadline as latest_finish,
            CASE 
                WHEN t.deadline IS NOT NULL 
                THEN t.deadline - t.created_at 
                ELSE INTERVAL '0'
            END as slack_time,
            0 as depth
        FROM workflow_tasks t
        WHERE t.wedding_id = wedding_id_param
        AND NOT EXISTS (
            SELECT 1 FROM task_dependencies td 
            WHERE td.dependent_task_id = t.id
        )
        
        UNION ALL
        
        -- Recursive case: tasks that depend on others
        SELECT 
            t.id,
            t.title,
            GREATEST(th.earliest_start + INTERVAL '1 day', t.created_at) as earliest_start,
            t.deadline as latest_finish,
            CASE 
                WHEN t.deadline IS NOT NULL 
                THEN t.deadline - GREATEST(th.earliest_start + INTERVAL '1 day', t.created_at)
                ELSE INTERVAL '0'
            END as slack_time,
            th.depth + 1
        FROM workflow_tasks t
        JOIN task_dependencies td ON t.id = td.dependent_task_id
        JOIN task_hierarchy th ON td.prerequisite_task_id = th.id
        WHERE t.wedding_id = wedding_id_param
        AND th.depth < 10 -- Prevent infinite recursion
    )
    SELECT 
        th.id,
        th.title,
        th.earliest_start,
        th.latest_finish,
        th.slack_time,
        (th.slack_time <= INTERVAL '0' OR th.slack_time <= INTERVAL '1 day') as is_critical
    FROM task_hierarchy th
    ORDER BY th.earliest_start, th.slack_time;
END;
$$;

-- Function to automatically escalate overdue critical tasks
CREATE OR REPLACE FUNCTION escalate_overdue_tasks()
RETURNS TABLE(
    task_id UUID,
    task_title TEXT,
    assignee_name TEXT,
    days_overdue INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Create escalation notifications for critical overdue tasks
    INSERT INTO task_notifications (
        recipient_id,
        task_id,
        message,
        type,
        urgency,
        status
    )
    SELECT 
        supervisor.user_id,
        wt.id,
        'ESCALATION: Critical task "' || wt.title || '" is ' || 
        EXTRACT(DAY FROM NOW() - wt.deadline)::INTEGER || ' days overdue',
        'email',
        'critical',
        'pending'
    FROM workflow_tasks wt
    JOIN team_members tm ON wt.assigned_to = tm.id
    JOIN team_members supervisor ON supervisor.wedding_id = tm.wedding_id
    WHERE wt.deadline < NOW() - INTERVAL '4 hours'
    AND wt.status != 'completed'
    AND wt.priority = 'critical'
    AND supervisor.role IN ('admin', 'manager', 'coordinator')
    AND NOT EXISTS (
        SELECT 1 FROM task_notifications tn 
        WHERE tn.task_id = wt.id 
        AND tn.urgency = 'critical'
        AND tn.created_at > NOW() - INTERVAL '24 hours'
    );

    -- Return escalated tasks
    RETURN QUERY
    SELECT 
        wt.id,
        wt.title,
        tm.name,
        EXTRACT(DAY FROM NOW() - wt.deadline)::INTEGER
    FROM workflow_tasks wt
    LEFT JOIN team_members tm ON wt.assigned_to = tm.id
    WHERE wt.deadline < NOW()
    AND wt.status != 'completed'
    AND wt.priority = 'critical'
    ORDER BY wt.deadline;
END;
$$;

-- Trigger to update deadline alerts when task deadline changes
CREATE OR REPLACE FUNCTION update_deadline_alerts_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- If deadline changed, delete old alerts and create new ones
    IF OLD.deadline IS DISTINCT FROM NEW.deadline AND NEW.deadline IS NOT NULL THEN
        -- Delete pending alerts for this task
        DELETE FROM deadline_alerts 
        WHERE task_id = NEW.id 
        AND triggered_at IS NULL;
        
        -- The application layer will handle creating new alerts
        -- This prevents complex logic in the database trigger
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER deadline_change_trigger
    AFTER UPDATE OF deadline ON workflow_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_deadline_alerts_trigger();

-- Trigger to automatically update task status based on dependencies
CREATE OR REPLACE FUNCTION check_dependency_completion_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- When a task is completed, check if any dependent tasks can now start
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE workflow_tasks 
        SET status = 'in_progress',
            started_at = NOW(),
            updated_at = NOW()
        WHERE id IN (
            SELECT td.dependent_task_id
            FROM task_dependencies td
            WHERE td.prerequisite_task_id = NEW.id
            AND td.dependency_type = 'blocks'
        )
        AND status = 'pending'
        AND NOT EXISTS (
            -- Check that all other blocking dependencies are completed
            SELECT 1 FROM task_dependencies td2
            JOIN workflow_tasks wt2 ON td2.prerequisite_task_id = wt2.id
            WHERE td2.dependent_task_id = workflow_tasks.id
            AND td2.dependency_type = 'blocks'
            AND wt2.status != 'completed'
            AND wt2.id != NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER dependency_completion_trigger
    AFTER UPDATE OF status ON workflow_tasks
    FOR EACH ROW
    EXECUTE FUNCTION check_dependency_completion_trigger();

-- Row Level Security (RLS) policies
ALTER TABLE deadline_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_notifications ENABLE ROW LEVEL SECURITY;

-- Policy for deadline_alerts: Users can view alerts for tasks they have access to
CREATE POLICY deadline_alerts_access_policy ON deadline_alerts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workflow_tasks wt
            JOIN team_members tm ON tm.wedding_id = wt.wedding_id
            WHERE wt.id = deadline_alerts.task_id
            AND tm.user_id = ( SELECT auth.uid() )
        )
    );

-- Policy for task_notifications: Users can view their own notifications
CREATE POLICY task_notifications_recipient_policy ON task_notifications
    FOR ALL
    USING (recipient_id = ( SELECT auth.uid() ));

-- Policy for task_notifications: Task creators and assignees can view task notifications
CREATE POLICY task_notifications_task_access_policy ON task_notifications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workflow_tasks wt
            JOIN team_members tm ON tm.user_id = ( SELECT auth.uid() )
            WHERE wt.id = task_notifications.task_id
            AND (wt.assigned_to = tm.id OR wt.created_by = tm.id)
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON deadline_alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON task_notifications TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create notification processing job (would be handled by background job in production)
COMMENT ON FUNCTION process_deadline_alerts() IS 'Function to be called by cron job every 15 minutes to process pending deadline alerts';
COMMENT ON FUNCTION escalate_overdue_tasks() IS 'Function to be called daily to escalate overdue critical tasks';

-- Insert initial test data for demonstration
INSERT INTO deadline_alerts (task_id, alert_type, alert_time, message, priority)
SELECT 
    id,
    'reminder',
    deadline - INTERVAL '2 days',
    'Task due in 2 days',
    CASE priority
        WHEN 'critical' THEN 'critical'
        WHEN 'high' THEN 'high'
        ELSE 'medium'
    END
FROM workflow_tasks 
WHERE deadline > NOW() + INTERVAL '2 days'
ON CONFLICT DO NOTHING;