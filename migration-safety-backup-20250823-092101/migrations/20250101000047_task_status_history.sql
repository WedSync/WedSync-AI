-- =====================================================
-- WS-058: Task Delegation System - Status Management
-- Migration: 029_task_status_history.sql
-- =====================================================

-- Table for tracking task status changes
CREATE TABLE task_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    updated_by UUID NOT NULL REFERENCES team_members(id),
    comment TEXT NULL,
    progress_percentage INTEGER NULL CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_task_status_history_task_id ON task_status_history(task_id);
CREATE INDEX idx_task_status_history_created_at ON task_status_history(created_at);
CREATE INDEX idx_task_status_history_updated_by ON task_status_history(updated_by);

-- Function to update task status with history tracking
CREATE OR REPLACE FUNCTION update_task_status_with_history(
    task_id_param UUID,
    new_status_param TEXT,
    updated_by_param UUID,
    comment_param TEXT DEFAULT NULL,
    progress_param INTEGER DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    previous_status TEXT,
    new_status TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    current_task_status TEXT;
    current_progress INTEGER;
BEGIN
    -- Get current task status
    SELECT status, progress_percentage 
    INTO current_task_status, current_progress
    FROM workflow_tasks 
    WHERE id = task_id_param;

    -- Check if task exists
    IF current_task_status IS NULL THEN
        RAISE EXCEPTION 'Task not found';
    END IF;

    -- Don't create history record if status hasn't changed
    IF current_task_status = new_status_param AND 
       (progress_param IS NULL OR current_progress = progress_param) THEN
        RETURN QUERY SELECT TRUE, current_task_status, new_status_param;
        RETURN;
    END IF;

    -- Insert status history record
    INSERT INTO task_status_history (
        task_id,
        previous_status,
        new_status,
        updated_by,
        comment,
        progress_percentage
    ) VALUES (
        task_id_param,
        current_task_status,
        new_status_param,
        updated_by_param,
        comment_param,
        progress_param
    );

    -- Update the task
    UPDATE workflow_tasks 
    SET 
        status = new_status_param,
        progress_percentage = COALESCE(progress_param, progress_percentage),
        updated_at = NOW(),
        started_at = CASE 
            WHEN new_status_param = 'in_progress' AND current_task_status != 'in_progress' 
            THEN NOW() 
            ELSE started_at 
        END,
        completed_at = CASE 
            WHEN new_status_param = 'completed' 
            THEN NOW() 
            ELSE NULL 
        END
    WHERE id = task_id_param;

    -- Return success
    RETURN QUERY SELECT TRUE, current_task_status, new_status_param;
END;
$$;

-- Function to get task completion statistics
CREATE OR REPLACE FUNCTION get_task_completion_stats(wedding_id_param UUID)
RETURNS TABLE(
    total_tasks INTEGER,
    pending_tasks INTEGER,
    in_progress_tasks INTEGER,
    on_hold_tasks INTEGER,
    completed_tasks INTEGER,
    cancelled_tasks INTEGER,
    completion_rate DECIMAL,
    average_completion_time INTERVAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH task_counts AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
            COUNT(*) FILTER (WHERE status = 'on_hold') as on_hold,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
            AVG(CASE 
                WHEN status = 'completed' AND completed_at IS NOT NULL AND started_at IS NOT NULL
                THEN completed_at - started_at 
                ELSE NULL 
            END) as avg_completion_time
        FROM workflow_tasks 
        WHERE wedding_id = wedding_id_param
    )
    SELECT 
        total::INTEGER,
        pending::INTEGER,
        in_progress::INTEGER,
        on_hold::INTEGER,
        completed::INTEGER,
        cancelled::INTEGER,
        CASE 
            WHEN total > 0 
            THEN ROUND((completed::DECIMAL / total::DECIMAL) * 100, 2)
            ELSE 0::DECIMAL
        END as completion_rate,
        avg_completion_time
    FROM task_counts;
END;
$$;

-- Function to get status transition patterns
CREATE OR REPLACE FUNCTION get_status_transition_patterns(wedding_id_param UUID)
RETURNS TABLE(
    from_status TEXT,
    to_status TEXT,
    transition_count INTEGER,
    avg_time_in_status INTERVAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tsh.previous_status,
        tsh.new_status,
        COUNT(*)::INTEGER as transition_count,
        AVG(
            CASE 
                WHEN tsh.created_at IS NOT NULL AND prev_tsh.created_at IS NOT NULL
                THEN tsh.created_at - prev_tsh.created_at
                ELSE NULL
            END
        ) as avg_time_in_status
    FROM task_status_history tsh
    JOIN workflow_tasks wt ON tsh.task_id = wt.id
    LEFT JOIN task_status_history prev_tsh ON (
        prev_tsh.task_id = tsh.task_id AND 
        prev_tsh.created_at < tsh.created_at AND
        prev_tsh.new_status = tsh.previous_status
    )
    WHERE wt.wedding_id = wedding_id_param
    GROUP BY tsh.previous_status, tsh.new_status
    ORDER BY transition_count DESC;
END;
$$;

-- Function to identify bottleneck tasks
CREATE OR REPLACE FUNCTION identify_bottleneck_tasks(wedding_id_param UUID)
RETURNS TABLE(
    task_id UUID,
    task_title TEXT,
    current_status TEXT,
    days_in_current_status INTEGER,
    blocking_tasks_count INTEGER,
    priority TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH current_status_duration AS (
        SELECT 
            wt.id,
            wt.title,
            wt.status,
            wt.priority,
            COALESCE(
                EXTRACT(DAY FROM NOW() - MAX(tsh.created_at)),
                EXTRACT(DAY FROM NOW() - wt.created_at)
            )::INTEGER as days_in_status
        FROM workflow_tasks wt
        LEFT JOIN task_status_history tsh ON wt.id = tsh.task_id
        WHERE wt.wedding_id = wedding_id_param
        AND wt.status IN ('in_progress', 'on_hold')
        GROUP BY wt.id, wt.title, wt.status, wt.priority, wt.created_at
    ),
    blocking_counts AS (
        SELECT 
            td.prerequisite_task_id as task_id,
            COUNT(td.dependent_task_id) as blocking_count
        FROM task_dependencies td
        JOIN workflow_tasks wt_prereq ON td.prerequisite_task_id = wt_prereq.id
        JOIN workflow_tasks wt_dep ON td.dependent_task_id = wt_dep.id
        WHERE wt_prereq.wedding_id = wedding_id_param
        AND wt_prereq.status != 'completed'
        AND wt_dep.status = 'pending'
        AND td.dependency_type = 'blocks'
        GROUP BY td.prerequisite_task_id
    )
    SELECT 
        csd.id,
        csd.title,
        csd.status,
        csd.days_in_status,
        COALESCE(bc.blocking_count, 0)::INTEGER,
        csd.priority
    FROM current_status_duration csd
    LEFT JOIN blocking_counts bc ON csd.id = bc.task_id
    WHERE csd.days_in_status > 3 OR bc.blocking_count > 0
    ORDER BY 
        bc.blocking_count DESC NULLS LAST,
        csd.days_in_status DESC,
        CASE csd.priority 
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            ELSE 4
        END;
END;
$$;

-- Trigger to automatically log status changes
CREATE OR REPLACE FUNCTION auto_log_status_change_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO task_status_history (
            task_id,
            previous_status,
            new_status,
            updated_by,
            comment,
            progress_percentage
        ) VALUES (
            NEW.id,
            COALESCE(OLD.status, 'pending'),
            NEW.status,
            -- Try to get the updating user from the session or use a system user
            COALESCE(
                (SELECT id FROM team_members WHERE user_id = ( SELECT auth.uid() ) AND wedding_id = NEW.wedding_id LIMIT 1),
                NEW.created_by
            ),
            'Automatic status change',
            NEW.progress_percentage
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Only create trigger if not using the stored procedure
-- This provides a fallback for direct updates to the table
CREATE TRIGGER auto_status_history_trigger
    AFTER UPDATE OF status ON workflow_tasks
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION auto_log_status_change_trigger();

-- Function to get team productivity metrics
CREATE OR REPLACE FUNCTION get_team_productivity_metrics(wedding_id_param UUID)
RETURNS TABLE(
    team_member_id UUID,
    team_member_name TEXT,
    total_assigned_tasks INTEGER,
    completed_tasks INTEGER,
    in_progress_tasks INTEGER,
    overdue_tasks INTEGER,
    completion_rate DECIMAL,
    avg_completion_time INTERVAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tm.id,
        tm.name,
        COUNT(wt.id)::INTEGER as total_assigned,
        COUNT(*) FILTER (WHERE wt.status = 'completed')::INTEGER as completed,
        COUNT(*) FILTER (WHERE wt.status = 'in_progress')::INTEGER as in_progress,
        COUNT(*) FILTER (WHERE wt.deadline < NOW() AND wt.status != 'completed')::INTEGER as overdue,
        CASE 
            WHEN COUNT(wt.id) > 0 
            THEN ROUND((COUNT(*) FILTER (WHERE wt.status = 'completed')::DECIMAL / COUNT(wt.id)::DECIMAL) * 100, 2)
            ELSE 0::DECIMAL
        END as completion_rate,
        AVG(
            CASE 
                WHEN wt.status = 'completed' AND wt.completed_at IS NOT NULL AND wt.started_at IS NOT NULL
                THEN wt.completed_at - wt.started_at
                ELSE NULL
            END
        ) as avg_completion_time
    FROM team_members tm
    LEFT JOIN workflow_tasks wt ON tm.id = wt.assigned_to
    WHERE tm.wedding_id = wedding_id_param
    GROUP BY tm.id, tm.name
    ORDER BY completion_rate DESC, total_assigned DESC;
END;
$$;

-- Row Level Security policies
ALTER TABLE task_status_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view status history for tasks they have access to
CREATE POLICY task_status_history_access_policy ON task_status_history
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workflow_tasks wt
            JOIN team_members tm ON tm.wedding_id = wt.wedding_id
            WHERE wt.id = task_status_history.task_id
            AND tm.user_id = ( SELECT auth.uid() )
        )
    );

-- Grant permissions
GRANT SELECT, INSERT ON task_status_history TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Insert some sample status history for existing tasks
INSERT INTO task_status_history (task_id, previous_status, new_status, updated_by, comment)
SELECT 
    wt.id,
    'pending',
    wt.status,
    wt.created_by,
    'Initial status set during task creation'
FROM workflow_tasks wt
WHERE NOT EXISTS (
    SELECT 1 FROM task_status_history tsh 
    WHERE tsh.task_id = wt.id
)
ON CONFLICT DO NOTHING;