-- WS-342: Real-Time Wedding Collaboration - Data Conflicts Table
-- Team B Backend Development - Batch 1 Round 1
-- Description: Create data conflicts table for managing conflict resolution in real-time collaboration

-- Create data_conflicts table
CREATE TABLE data_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    conflict_type TEXT NOT NULL CHECK (conflict_type IN (
        'timeline_conflict', 'budget_conflict', 'vendor_assignment_conflict', 
        'guest_conflict', 'document_edit_conflict', 'permission_conflict',
        'data_synchronization_conflict', 'concurrent_edit_conflict'
    )),
    conflicting_operations JSONB NOT NULL DEFAULT '[]',
    affected_data JSONB NOT NULL DEFAULT '{}',
    conflict_metadata JSONB NOT NULL DEFAULT '{}',
    resolution_strategy TEXT CHECK (resolution_strategy IN (
        'last_writer_wins', 'merge_changes', 'priority_based', 
        'manual_review', 'wedding_hierarchy', 'auto_merge', 'user_choice'
    )),
    resolved_by UUID REFERENCES auth.users(id),
    resolution_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    is_resolved BOOLEAN DEFAULT false,
    severity INTEGER DEFAULT 1 CHECK (severity >= 1 AND severity <= 5),
    auto_resolvable BOOLEAN DEFAULT false,
    resolution_timeout TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour',
    
    -- Performance indexes
    INDEX idx_data_conflicts_wedding (wedding_id, is_resolved, created_at DESC),
    INDEX idx_data_conflicts_type (conflict_type, is_resolved, severity DESC),
    INDEX idx_data_conflicts_unresolved (is_resolved, severity DESC, created_at DESC) WHERE is_resolved = false,
    INDEX idx_data_conflicts_auto (auto_resolvable, is_resolved) WHERE auto_resolvable = true AND is_resolved = false,
    INDEX idx_data_conflicts_timeout (resolution_timeout, is_resolved) WHERE is_resolved = false
);

-- Add row level security
ALTER TABLE data_conflicts ENABLE ROW LEVEL SECURITY;

-- Create policies for data conflicts
CREATE POLICY "Users can view conflicts for weddings they have access to" ON data_conflicts
    FOR SELECT USING (
        wedding_id IN (
            SELECT w.id FROM weddings w
            LEFT JOIN wedding_team wt ON w.id = wt.wedding_id
            WHERE w.couple_user_id = auth.uid() 
               OR w.partner_user_id = auth.uid()
               OR wt.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can resolve conflicts for weddings they have access to" ON data_conflicts
    FOR UPDATE USING (
        wedding_id IN (
            SELECT w.id FROM weddings w
            LEFT JOIN wedding_team wt ON w.id = wt.wedding_id
            WHERE w.couple_user_id = auth.uid() 
               OR w.partner_user_id = auth.uid()
               OR wt.user_id = auth.uid()
        )
    );

-- Create function to create a conflict
CREATE OR REPLACE FUNCTION create_data_conflict(
    p_wedding_id UUID,
    p_conflict_type TEXT,
    p_conflicting_operations JSONB,
    p_affected_data JSONB DEFAULT '{}',
    p_metadata JSONB DEFAULT '{}',
    p_severity INTEGER DEFAULT 1,
    p_auto_resolvable BOOLEAN DEFAULT false
)
RETURNS data_conflicts AS $$
DECLARE
    result data_conflicts;
    timeout_interval INTERVAL;
BEGIN
    -- Determine timeout based on severity
    timeout_interval := CASE 
        WHEN p_severity >= 4 THEN INTERVAL '15 minutes'
        WHEN p_severity >= 3 THEN INTERVAL '30 minutes'
        WHEN p_severity >= 2 THEN INTERVAL '1 hour'
        ELSE INTERVAL '4 hours'
    END;
    
    INSERT INTO data_conflicts (
        wedding_id,
        conflict_type,
        conflicting_operations,
        affected_data,
        conflict_metadata,
        severity,
        auto_resolvable,
        resolution_timeout
    )
    VALUES (
        p_wedding_id,
        p_conflict_type,
        p_conflicting_operations,
        p_affected_data,
        p_metadata,
        p_severity,
        p_auto_resolvable,
        NOW() + timeout_interval
    )
    RETURNING * INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to resolve a conflict
CREATE OR REPLACE FUNCTION resolve_data_conflict(
    p_conflict_id UUID,
    p_resolved_by UUID,
    p_resolution_strategy TEXT,
    p_resolution_data JSONB DEFAULT '{}'
)
RETURNS boolean AS $$
DECLARE
    conflict_record data_conflicts;
BEGIN
    -- Get the conflict record
    SELECT * INTO conflict_record 
    FROM data_conflicts 
    WHERE id = p_conflict_id AND is_resolved = false;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Update the conflict as resolved
    UPDATE data_conflicts 
    SET 
        is_resolved = true,
        resolved_at = NOW(),
        resolved_by = p_resolved_by,
        resolution_strategy = p_resolution_strategy,
        resolution_data = p_resolution_data
    WHERE id = p_conflict_id;
    
    -- Log the resolution event
    INSERT INTO collaboration_events (
        wedding_id,
        user_id,
        event_type,
        event_data
    )
    VALUES (
        conflict_record.wedding_id,
        p_resolved_by,
        'conflict_resolved',
        jsonb_build_object(
            'conflict_id', p_conflict_id,
            'conflict_type', conflict_record.conflict_type,
            'resolution_strategy', p_resolution_strategy,
            'resolution_time', NOW()
        )
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get unresolved conflicts
CREATE OR REPLACE FUNCTION get_unresolved_conflicts(
    p_wedding_id UUID,
    p_include_auto BOOLEAN DEFAULT true
)
RETURNS TABLE (
    conflict_id UUID,
    conflict_type TEXT,
    severity INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    resolution_timeout TIMESTAMP WITH TIME ZONE,
    auto_resolvable BOOLEAN,
    affected_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.id,
        dc.conflict_type,
        dc.severity,
        dc.created_at,
        dc.resolution_timeout,
        dc.auto_resolvable,
        dc.affected_data
    FROM data_conflicts dc
    WHERE dc.wedding_id = p_wedding_id
      AND dc.is_resolved = false
      AND (p_include_auto OR dc.auto_resolvable = false)
    ORDER BY dc.severity DESC, dc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to auto-resolve conflicts
CREATE OR REPLACE FUNCTION auto_resolve_conflicts()
RETURNS INTEGER AS $$
DECLARE
    conflict_record data_conflicts;
    resolved_count INTEGER := 0;
BEGIN
    FOR conflict_record IN 
        SELECT * FROM data_conflicts 
        WHERE is_resolved = false 
          AND auto_resolvable = true
          AND created_at < NOW() - INTERVAL '5 minutes'
    LOOP
        -- Attempt auto-resolution based on conflict type
        IF conflict_record.conflict_type = 'timeline_conflict' THEN
            PERFORM resolve_data_conflict(
                conflict_record.id,
                NULL, -- System resolution
                'last_writer_wins',
                jsonb_build_object('auto_resolved', true, 'strategy', 'last_writer_wins')
            );
            resolved_count := resolved_count + 1;
            
        ELSIF conflict_record.conflict_type = 'document_edit_conflict' THEN
            PERFORM resolve_data_conflict(
                conflict_record.id,
                NULL,
                'merge_changes',
                jsonb_build_object('auto_resolved', true, 'strategy', 'merge_changes')
            );
            resolved_count := resolved_count + 1;
            
        ELSIF conflict_record.conflict_type = 'data_synchronization_conflict' THEN
            PERFORM resolve_data_conflict(
                conflict_record.id,
                NULL,
                'priority_based',
                jsonb_build_object('auto_resolved', true, 'strategy', 'priority_based')
            );
            resolved_count := resolved_count + 1;
        END IF;
    END LOOP;
    
    RETURN resolved_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to escalate timed-out conflicts
CREATE OR REPLACE FUNCTION escalate_timed_out_conflicts()
RETURNS INTEGER AS $$
DECLARE
    escalated_count INTEGER := 0;
BEGIN
    UPDATE data_conflicts 
    SET 
        severity = LEAST(severity + 1, 5),
        resolution_timeout = NOW() + INTERVAL '30 minutes',
        conflict_metadata = conflict_metadata || jsonb_build_object(
            'escalated_at', NOW(),
            'escalation_reason', 'timeout'
        )
    WHERE is_resolved = false 
      AND resolution_timeout < NOW()
      AND severity < 5;
    
    GET DIAGNOSTICS escalated_count = ROW_COUNT;
    
    -- Create high-priority events for escalated conflicts
    INSERT INTO collaboration_events (wedding_id, user_id, event_type, event_data, priority)
    SELECT 
        dc.wedding_id,
        dc.resolved_by,
        'conflict_escalated',
        jsonb_build_object(
            'conflict_id', dc.id,
            'conflict_type', dc.conflict_type,
            'new_severity', dc.severity,
            'escalated_at', NOW()
        ),
        8 -- High priority
    FROM data_conflicts dc
    WHERE dc.is_resolved = false 
      AND dc.resolution_timeout >= NOW() - INTERVAL '5 minutes'
      AND dc.severity >= 4;
    
    RETURN escalated_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get conflict statistics
CREATE OR REPLACE FUNCTION get_conflict_statistics(
    p_wedding_id UUID,
    p_time_range INTERVAL DEFAULT INTERVAL '24 hours'
)
RETURNS TABLE (
    conflict_type TEXT,
    total_conflicts BIGINT,
    resolved_conflicts BIGINT,
    auto_resolved_conflicts BIGINT,
    avg_resolution_time INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.conflict_type,
        COUNT(*) as total_conflicts,
        COUNT(*) FILTER (WHERE dc.is_resolved) as resolved_conflicts,
        COUNT(*) FILTER (WHERE dc.is_resolved AND dc.resolution_data->>'auto_resolved' = 'true') as auto_resolved_conflicts,
        AVG(dc.resolved_at - dc.created_at) FILTER (WHERE dc.is_resolved) as avg_resolution_time
    FROM data_conflicts dc
    WHERE dc.wedding_id = p_wedding_id
      AND dc.created_at >= NOW() - p_time_range
    GROUP BY dc.conflict_type
    ORDER BY total_conflicts DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE data_conflicts IS 'Manages data conflicts in real-time wedding collaboration';
COMMENT ON COLUMN data_conflicts.conflict_type IS 'Type of data conflict that occurred';
COMMENT ON COLUMN data_conflicts.conflicting_operations IS 'JSON array of conflicting operations';
COMMENT ON COLUMN data_conflicts.severity IS 'Conflict severity level (1=low, 5=critical)';
COMMENT ON COLUMN data_conflicts.auto_resolvable IS 'Whether conflict can be automatically resolved';
COMMENT ON COLUMN data_conflicts.resolution_timeout IS 'When conflict should be escalated if unresolved';
COMMENT ON FUNCTION create_data_conflict IS 'Creates a new data conflict record';
COMMENT ON FUNCTION resolve_data_conflict IS 'Resolves a data conflict with specified strategy';
COMMENT ON FUNCTION auto_resolve_conflicts IS 'Automatically resolves resolvable conflicts';
COMMENT ON FUNCTION escalate_timed_out_conflicts IS 'Escalates conflicts that have timed out';