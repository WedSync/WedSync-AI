-- =====================================================
-- WS-159: Enhanced Task Tracking System Migration
-- Extends existing workflow_tasks table with tracking capabilities
-- SECURITY: Includes Row Level Security policies
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add tracking columns to existing workflow_tasks table
ALTER TABLE workflow_tasks 
ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_progress_update TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS requires_photo_evidence BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Create task_progress_history table for detailed progress tracking
CREATE TABLE IF NOT EXISTS task_progress_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  progress_percentage INTEGER NOT NULL CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  recorded_by UUID NOT NULL REFERENCES team_members(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  milestone TEXT,
  estimated_completion TIMESTAMPTZ,
  blocking_issues TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create task_photo_evidence table for completion proof
CREATE TABLE IF NOT EXISTS task_photo_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  content_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES team_members(id),
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  is_completion_proof BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  verified_by UUID REFERENCES team_members(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend task_status_history table with automation tracking
ALTER TABLE task_status_history 
ADD COLUMN IF NOT EXISTS automated_change BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS photo_evidence_ids UUID[];

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_tracking_enabled ON workflow_tasks(tracking_enabled) WHERE tracking_enabled = true;
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_last_progress_update ON workflow_tasks(last_progress_update);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_requires_photo_evidence ON workflow_tasks(requires_photo_evidence) WHERE requires_photo_evidence = true;

CREATE INDEX IF NOT EXISTS idx_task_progress_history_task_id ON task_progress_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_history_recorded_at ON task_progress_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_task_progress_history_recorded_by ON task_progress_history(recorded_by);

CREATE INDEX IF NOT EXISTS idx_task_photo_evidence_task_id ON task_photo_evidence(task_id);
CREATE INDEX IF NOT EXISTS idx_task_photo_evidence_upload_date ON task_photo_evidence(upload_date);
CREATE INDEX IF NOT EXISTS idx_task_photo_evidence_completion_proof ON task_photo_evidence(is_completion_proof) WHERE is_completion_proof = true;
CREATE INDEX IF NOT EXISTS idx_task_photo_evidence_verification ON task_photo_evidence(verification_status);

-- Enhanced task status update function with progress tracking
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
    new_status TEXT,
    history_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_task_status TEXT;
    current_progress INTEGER;
    history_record_id UUID;
BEGIN
    -- Get current task status and progress
    SELECT status, progress_percentage 
    INTO current_task_status, current_progress
    FROM workflow_tasks 
    WHERE id = task_id_param;

    -- Check if task exists
    IF current_task_status IS NULL THEN
        RAISE EXCEPTION 'Task not found';
    END IF;

    -- Insert status history record
    INSERT INTO task_status_history (
        task_id,
        previous_status,
        new_status,
        updated_by,
        comment,
        progress_percentage,
        automated_change
    ) VALUES (
        task_id_param,
        current_task_status,
        new_status_param,
        updated_by_param,
        COALESCE(comment_param, 'Status updated via API'),
        COALESCE(progress_param, current_progress),
        false
    )
    RETURNING id INTO history_record_id;

    -- Update the task with new status and progress
    UPDATE workflow_tasks 
    SET 
        status = new_status_param,
        progress_percentage = COALESCE(progress_param, progress_percentage),
        updated_at = NOW(),
        last_progress_update = CASE 
            WHEN progress_param IS NOT NULL 
            THEN NOW() 
            ELSE last_progress_update 
        END,
        started_at = CASE 
            WHEN new_status_param = 'in_progress' AND current_task_status != 'in_progress' 
            THEN COALESCE(started_at, NOW())
            ELSE started_at 
        END,
        completed_at = CASE 
            WHEN new_status_param = 'completed' 
            THEN NOW() 
            ELSE NULL 
        END
    WHERE id = task_id_param;

    -- Return success with details
    RETURN QUERY SELECT TRUE, current_task_status, new_status_param, history_record_id;
END;
$$;

-- Function to calculate task completion analytics for a wedding
CREATE OR REPLACE FUNCTION get_wedding_task_analytics(wedding_id_param UUID)
RETURNS TABLE(
    total_tasks INTEGER,
    completed_tasks INTEGER,
    in_progress_tasks INTEGER,
    overdue_tasks INTEGER,
    completion_rate DECIMAL,
    average_completion_time INTERVAL,
    tasks_with_photo_evidence INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH task_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
            COUNT(*) FILTER (WHERE deadline < NOW() AND status NOT IN ('completed', 'cancelled')) as overdue,
            COUNT(*) FILTER (WHERE requires_photo_evidence = true) as needs_photos,
            AVG(CASE 
                WHEN status = 'completed' AND completed_at IS NOT NULL AND started_at IS NOT NULL
                THEN completed_at - started_at 
                ELSE NULL 
            END) as avg_completion_time
        FROM workflow_tasks 
        WHERE wedding_id = wedding_id_param AND tracking_enabled = true
    ),
    photo_stats AS (
        SELECT COUNT(DISTINCT wt.id) as tasks_with_photos
        FROM workflow_tasks wt
        INNER JOIN task_photo_evidence tpe ON wt.id = tpe.task_id
        WHERE wt.wedding_id = wedding_id_param 
        AND wt.tracking_enabled = true
        AND tpe.is_completion_proof = true
    )
    SELECT 
        ts.total::INTEGER,
        ts.completed::INTEGER,
        ts.in_progress::INTEGER,
        ts.overdue::INTEGER,
        CASE 
            WHEN ts.total > 0 
            THEN ROUND((ts.completed::DECIMAL / ts.total::DECIMAL) * 100, 2)
            ELSE 0::DECIMAL
        END as completion_rate,
        ts.avg_completion_time,
        ps.tasks_with_photos::INTEGER
    FROM task_stats ts, photo_stats ps;
END;
$$;

-- Function to identify bottleneck tasks (enhanced version)
CREATE OR REPLACE FUNCTION identify_bottleneck_tasks_enhanced(wedding_id_param UUID)
RETURNS TABLE(
    task_id UUID,
    task_title TEXT,
    current_status TEXT,
    progress_percentage INTEGER,
    days_in_current_status INTEGER,
    blocking_tasks_count INTEGER,
    priority TEXT,
    last_progress_update TIMESTAMPTZ,
    requires_attention BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH current_status_duration AS (
        SELECT 
            wt.id,
            wt.title,
            wt.status,
            wt.progress_percentage,
            wt.priority,
            wt.last_progress_update,
            COALESCE(
                EXTRACT(DAY FROM NOW() - MAX(tsh.created_at)),
                EXTRACT(DAY FROM NOW() - wt.created_at)
            )::INTEGER as days_in_status
        FROM workflow_tasks wt
        LEFT JOIN task_status_history tsh ON wt.id = tsh.task_id
        WHERE wt.wedding_id = wedding_id_param
        AND wt.tracking_enabled = true
        AND wt.status NOT IN ('completed', 'cancelled')
        GROUP BY wt.id, wt.title, wt.status, wt.progress_percentage, wt.priority, wt.created_at, wt.last_progress_update
    ),
    blocking_counts AS (
        SELECT 
            td.predecessor_task_id as task_id,
            COUNT(td.successor_task_id) as blocking_count
        FROM task_dependencies td
        JOIN workflow_tasks wt_prereq ON td.predecessor_task_id = wt_prereq.id
        JOIN workflow_tasks wt_dep ON td.successor_task_id = wt_dep.id
        WHERE wt_prereq.wedding_id = wedding_id_param
        AND wt_prereq.status NOT IN ('completed', 'cancelled')
        AND wt_dep.status = 'pending'
        GROUP BY td.predecessor_task_id
    )
    SELECT 
        csd.id,
        csd.title,
        csd.status,
        csd.progress_percentage,
        csd.days_in_status,
        COALESCE(bc.blocking_count, 0)::INTEGER,
        csd.priority,
        csd.last_progress_update,
        (csd.days_in_status > 3 OR 
         bc.blocking_count > 0 OR 
         (csd.progress_percentage < 25 AND csd.days_in_status > 2) OR
         (csd.last_progress_update IS NOT NULL AND csd.last_progress_update < NOW() - INTERVAL '48 hours'))::BOOLEAN
    FROM current_status_duration csd
    LEFT JOIN blocking_counts bc ON csd.id = bc.task_id
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

-- Function to validate photo evidence requirements
CREATE OR REPLACE FUNCTION validate_task_completion(task_id_param UUID)
RETURNS TABLE(
    can_complete BOOLEAN,
    missing_photo_evidence BOOLEAN,
    photo_count INTEGER,
    verification_pending INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    task_requires_photos BOOLEAN;
    photo_evidence_count INTEGER;
    pending_verification_count INTEGER;
BEGIN
    -- Check if task requires photo evidence
    SELECT requires_photo_evidence
    INTO task_requires_photos
    FROM workflow_tasks
    WHERE id = task_id_param;

    IF task_requires_photos IS NULL THEN
        RAISE EXCEPTION 'Task not found';
    END IF;

    -- Count photo evidence
    SELECT COUNT(*), COUNT(*) FILTER (WHERE verification_status = 'pending')
    INTO photo_evidence_count, pending_verification_count
    FROM task_photo_evidence
    WHERE task_id = task_id_param AND is_completion_proof = true;

    RETURN QUERY SELECT 
        (NOT task_requires_photos OR photo_evidence_count > 0)::BOOLEAN,
        (task_requires_photos AND photo_evidence_count = 0)::BOOLEAN,
        photo_evidence_count,
        pending_verification_count;
END;
$$;

-- Row Level Security Policies
ALTER TABLE task_progress_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_photo_evidence ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view progress history for tasks they have access to
CREATE POLICY "task_progress_history_access_policy" ON task_progress_history
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workflow_tasks wt
            JOIN team_members tm ON (
                tm.id = wt.assigned_to OR 
                tm.id = wt.created_by OR 
                tm.id = wt.assigned_by
            )
            WHERE wt.id = task_progress_history.task_id
            AND tm.user_id = ( SELECT auth.uid() )
        )
    );

-- Policy: Users can view photo evidence for tasks they have access to
CREATE POLICY "task_photo_evidence_access_policy" ON task_photo_evidence
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workflow_tasks wt
            JOIN team_members tm ON (
                tm.id = wt.assigned_to OR 
                tm.id = wt.created_by OR 
                tm.id = wt.assigned_by
            )
            WHERE wt.id = task_photo_evidence.task_id
            AND tm.user_id = ( SELECT auth.uid() )
        )
    );

-- Policy: Users can insert progress history for tasks they're assigned to
CREATE POLICY "task_progress_history_insert_policy" ON task_progress_history
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workflow_tasks wt
            JOIN team_members tm ON tm.id = wt.assigned_to
            WHERE wt.id = task_progress_history.task_id
            AND tm.user_id = ( SELECT auth.uid() )
            AND tm.id = task_progress_history.recorded_by
        )
    );

-- Policy: Users can upload photo evidence for tasks they're assigned to
CREATE POLICY "task_photo_evidence_insert_policy" ON task_photo_evidence
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workflow_tasks wt
            JOIN team_members tm ON tm.id = wt.assigned_to
            WHERE wt.id = task_photo_evidence.task_id
            AND tm.user_id = ( SELECT auth.uid() )
            AND tm.id = task_photo_evidence.uploaded_by
        )
    );

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON task_progress_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON task_photo_evidence TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create triggers for automatic timestamping
CREATE OR REPLACE FUNCTION update_last_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE workflow_tasks 
    SET last_progress_update = NOW()
    WHERE id = NEW.task_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_progress_update when progress history is inserted
DROP TRIGGER IF EXISTS trigger_update_last_progress ON task_progress_history;
CREATE TRIGGER trigger_update_last_progress
    AFTER INSERT ON task_progress_history
    FOR EACH ROW
    EXECUTE FUNCTION update_last_progress_timestamp();

-- Update existing tasks to enable tracking by default
UPDATE workflow_tasks 
SET tracking_enabled = true,
    last_progress_update = updated_at
WHERE tracking_enabled IS NULL;

-- Create initial progress history for existing tasks with progress > 0
INSERT INTO task_progress_history (task_id, progress_percentage, recorded_by, recorded_at, notes)
SELECT 
    wt.id,
    wt.progress_percentage,
    wt.created_by,
    wt.updated_at,
    'Initial progress recorded during migration'
FROM workflow_tasks wt
WHERE wt.progress_percentage > 0
AND NOT EXISTS (
    SELECT 1 FROM task_progress_history tph 
    WHERE tph.task_id = wt.id
)
ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE task_progress_history IS 'WS-159: Detailed progress tracking for wedding tasks with timeline analysis';
COMMENT ON TABLE task_photo_evidence IS 'WS-159: Photo evidence storage for task completion verification';
COMMENT ON FUNCTION update_task_status_with_history IS 'WS-159: Enhanced task status updates with automatic progress tracking';
COMMENT ON FUNCTION get_wedding_task_analytics IS 'WS-159: Comprehensive wedding task completion analytics';
COMMENT ON FUNCTION identify_bottleneck_tasks_enhanced IS 'WS-159: Advanced bottleneck detection with progress stagnation analysis';
COMMENT ON FUNCTION validate_task_completion IS 'WS-159: Task completion validation with photo evidence requirements';

-- Migration completed successfully
INSERT INTO migration_log (migration_name, applied_at, description) 
VALUES (
    '20250827130000_ws159_enhanced_task_tracking',
    NOW(),
    'WS-159: Enhanced task tracking system with progress history, photo evidence, and analytics'
) ON CONFLICT DO NOTHING;