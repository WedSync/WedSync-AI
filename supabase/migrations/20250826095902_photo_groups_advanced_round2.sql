-- ====================================================================
-- WS-153 Photo Groups Advanced Database Features - Round 2
-- ====================================================================
-- Feature: Advanced database functions, optimization, and real-time capabilities
-- Team: Team C
-- Batch: 14
-- Round: 2
-- Date: 2025-08-26
-- ====================================================================

-- First update the photo_groups table to include new fields needed for advanced functions
ALTER TABLE photo_groups 
ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ;

-- Update the column names to match specification
ALTER TABLE photo_groups 
RENAME COLUMN estimated_duration TO estimated_time_minutes;

-- Advanced conflict detection function
CREATE OR REPLACE FUNCTION detect_advanced_conflicts(
  p_couple_id UUID,
  p_group_id UUID DEFAULT NULL,
  p_start_time TIMESTAMPTZ DEFAULT NULL,
  p_end_time TIMESTAMPTZ DEFAULT NULL
) RETURNS TABLE (
  conflict_type VARCHAR(50),
  conflicting_groups UUID[],
  affected_guests UUID[],
  conflict_details JSONB,
  severity INTEGER,
  suggested_resolution TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conflict_record RECORD;
BEGIN
  -- Time overlap conflicts
  FOR conflict_record IN
    SELECT 
      pg1.id as group1_id,
      pg2.id as group2_id,
      array_agg(DISTINCT pgm1.guest_id) as shared_guests,
      pg1.scheduled_start,
      pg1.scheduled_end,
      pg2.scheduled_start as pg2_scheduled_start, 
      pg2.scheduled_end as pg2_scheduled_end
    FROM photo_groups pg1
    JOIN photo_group_members pgm1 ON pg1.id = pgm1.photo_group_id
    JOIN photo_group_members pgm2 ON pgm1.guest_id = pgm2.guest_id
    JOIN photo_groups pg2 ON pg2.id = pgm2.photo_group_id
    WHERE pg1.couple_id = p_couple_id
    AND pg2.couple_id = p_couple_id
    AND pg1.id < pg2.id  -- Avoid duplicates
    AND (p_group_id IS NULL OR pg1.id = p_group_id OR pg2.id = p_group_id)
    AND pg1.scheduled_start IS NOT NULL
    AND pg1.scheduled_end IS NOT NULL
    AND pg2.scheduled_start IS NOT NULL
    AND pg2.scheduled_end IS NOT NULL
    AND pg1.scheduled_start < pg2.scheduled_end
    AND pg2.scheduled_start < pg1.scheduled_end
    GROUP BY pg1.id, pg2.id, pg1.scheduled_start, pg1.scheduled_end, pg2.scheduled_start, pg2.scheduled_end
    HAVING count(DISTINCT pgm1.guest_id) > 0
  LOOP
    conflict_type := 'guest_time_overlap';
    conflicting_groups := ARRAY[conflict_record.group1_id, conflict_record.group2_id];
    affected_guests := conflict_record.shared_guests;
    
    conflict_details := jsonb_build_object(
      'overlap_start', GREATEST(conflict_record.scheduled_start, conflict_record.pg2_scheduled_start),
      'overlap_end', LEAST(conflict_record.scheduled_end, conflict_record.pg2_scheduled_end),
      'overlap_duration', LEAST(conflict_record.scheduled_end, conflict_record.pg2_scheduled_end) - 
                          GREATEST(conflict_record.scheduled_start, conflict_record.pg2_scheduled_start),
      'group1_details', jsonb_build_object('id', conflict_record.group1_id, 'start', conflict_record.scheduled_start, 'end', conflict_record.scheduled_end),
      'group2_details', jsonb_build_object('id', conflict_record.group2_id, 'start', conflict_record.pg2_scheduled_start, 'end', conflict_record.pg2_scheduled_end)
    );
    
    -- Calculate severity (1-10 scale)
    severity := CASE
      WHEN array_length(conflict_record.shared_guests, 1) > 5 THEN 9  -- High severity for many shared guests
      WHEN array_length(conflict_record.shared_guests, 1) > 2 THEN 6  -- Medium severity
      ELSE 3  -- Low severity for few shared guests
    END;
    
    suggested_resolution := CASE
      WHEN array_length(conflict_record.shared_guests, 1) = 1 THEN 
        'Consider removing the shared guest from one group or adjusting timing by 15 minutes'
      ELSE 
        'Significant overlap detected. Consider rescheduling one group or splitting into smaller groups'
    END;
    
    RETURN NEXT;
  END LOOP;

  -- Location conflicts (same location, overlapping times)
  FOR conflict_record IN
    SELECT 
      pg1.id as group1_id,
      pg2.id as group2_id,
      pg1.location_preference,
      pg1.scheduled_start,
      pg1.scheduled_end,
      pg2.scheduled_start as pg2_scheduled_start,
      pg2.scheduled_end as pg2_scheduled_end
    FROM photo_groups pg1
    JOIN photo_groups pg2 ON pg1.location_preference = pg2.location_preference
    WHERE pg1.couple_id = p_couple_id
    AND pg2.couple_id = p_couple_id
    AND pg1.id < pg2.id
    AND pg1.location_preference IS NOT NULL
    AND pg2.location_preference IS NOT NULL
    AND pg1.scheduled_start IS NOT NULL
    AND pg1.scheduled_end IS NOT NULL
    AND pg2.scheduled_start IS NOT NULL
    AND pg2.scheduled_end IS NOT NULL
    AND pg1.scheduled_start < pg2.scheduled_end
    AND pg2.scheduled_start < pg1.scheduled_end
  LOOP
    conflict_type := 'location_time_overlap';
    conflicting_groups := ARRAY[conflict_record.group1_id, conflict_record.group2_id];
    affected_guests := ARRAY[]::UUID[];  -- No specific guests affected
    
    conflict_details := jsonb_build_object(
      'location', conflict_record.location_preference,
      'overlap_start', GREATEST(conflict_record.scheduled_start, conflict_record.pg2_scheduled_start),
      'overlap_end', LEAST(conflict_record.scheduled_end, conflict_record.pg2_scheduled_end)
    );
    
    severity := 5;  -- Medium severity for location conflicts
    suggested_resolution := format('Two groups scheduled at "%s" have overlapping times. Consider different locations or timing.', conflict_record.location_preference);
    
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Optimize guest assignment function
CREATE OR REPLACE FUNCTION optimize_photo_group_scheduling(
  p_couple_id UUID,
  p_target_date DATE,
  p_available_hours INTEGER DEFAULT 8
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_groups INTEGER;
  total_duration INTEGER;
  optimization_result JSONB;
  suggested_schedule JSONB[];
  current_time TIME := '09:00:00';
  group_record RECORD;
BEGIN
  -- Get all unscheduled groups for the couple
  SELECT count(*), sum(COALESCE(estimated_time_minutes, 5))
  INTO total_groups, total_duration
  FROM photo_groups
  WHERE couple_id = p_couple_id
  AND (scheduled_start IS NULL OR DATE(scheduled_start) != p_target_date);
  
  -- Check if scheduling is feasible
  IF total_duration > (p_available_hours * 60) THEN
    optimization_result := jsonb_build_object(
      'feasible', false,
      'reason', 'Insufficient time: ' || total_duration || ' minutes needed, ' || (p_available_hours * 60) || ' minutes available',
      'suggestion', 'Consider splitting across multiple days or reducing group sizes'
    );
    RETURN optimization_result;
  END IF;
  
  -- Generate optimal schedule (priority-based)
  suggested_schedule := ARRAY[]::JSONB[];
  
  FOR group_record IN
    SELECT id, name, COALESCE(estimated_time_minutes, 5) as estimated_duration, priority, location_preference
    FROM photo_groups
    WHERE couple_id = p_couple_id
    AND (scheduled_start IS NULL OR DATE(scheduled_start) != p_target_date)
    ORDER BY priority DESC, estimated_time_minutes ASC
  LOOP
    suggested_schedule := suggested_schedule || jsonb_build_object(
      'group_id', group_record.id,
      'group_name', group_record.name,
      'suggested_start', current_time,
      'suggested_end', current_time + (group_record.estimated_duration || ' minutes')::INTERVAL,
      'location', group_record.location_preference,
      'priority', group_record.priority
    );
    
    -- Add buffer time between groups (5 minutes)
    current_time := current_time + (group_record.estimated_duration + 5 || ' minutes')::INTERVAL;
  END LOOP;
  
  optimization_result := jsonb_build_object(
    'feasible', true,
    'total_groups', total_groups,
    'total_duration_minutes', total_duration,
    'suggested_schedule', suggested_schedule,
    'end_time', current_time,
    'buffer_time_remaining', (p_available_hours * 60) - total_duration
  );
  
  RETURN optimization_result;
END;
$$;

-- Performance indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_groups_couple_scheduled 
ON photo_groups(couple_id, scheduled_start, scheduled_end) 
WHERE scheduled_start IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_groups_location_time 
ON photo_groups(location_preference, scheduled_start, scheduled_end) 
WHERE location_preference IS NOT NULL AND scheduled_start IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_group_members_guest 
ON photo_group_members(guest_id);

-- Composite index for conflict detection
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_groups_conflict_detection 
ON photo_groups(couple_id, scheduled_start, scheduled_end, priority) 
WHERE scheduled_start IS NOT NULL;

-- Real-time triggers for collaboration
CREATE OR REPLACE FUNCTION notify_photo_group_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Notify real-time subscribers of changes
  PERFORM pg_notify(
    'photo_group_changes',
    json_build_object(
      'operation', TG_OP,
      'couple_id', COALESCE(NEW.couple_id, OLD.couple_id),
      'group_id', COALESCE(NEW.id, OLD.id),
      'table', TG_TABLE_NAME,
      'timestamp', CURRENT_TIMESTAMP
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers for real-time updates
DROP TRIGGER IF EXISTS photo_groups_change_trigger ON photo_groups;
CREATE TRIGGER photo_groups_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON photo_groups
  FOR EACH ROW
  EXECUTE FUNCTION notify_photo_group_change();

DROP TRIGGER IF EXISTS photo_group_members_change_trigger ON photo_group_members;
CREATE TRIGGER photo_group_members_change_trigger
  AFTER INSERT OR DELETE ON photo_group_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_photo_group_change();

-- Advanced Row Level Security policies
DROP POLICY IF EXISTS "photo_groups_advanced_select" ON photo_groups;
CREATE POLICY "photo_groups_advanced_select" ON photo_groups
FOR SELECT TO authenticated
USING (
  -- Users can see their own couple's groups
  couple_id IN (
    SELECT c.id FROM clients c 
    WHERE c.user_id = auth.uid()
  )
  OR
  -- Photographers can see groups for couples they're working with
  couple_id IN (
    SELECT DISTINCT pg.couple_id FROM photo_groups pg
    JOIN contracts co ON co.client_id = pg.couple_id
    JOIN suppliers s ON s.id = co.supplier_id
    WHERE s.user_id = auth.uid() AND s.category = 'photography'
  )
);

-- Analytics view for performance monitoring
CREATE OR REPLACE VIEW photo_groups_analytics AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  count(*) as groups_created,
  avg(COALESCE(estimated_time_minutes, 5)) as avg_duration,
  count(CASE WHEN scheduled_start IS NOT NULL THEN 1 END) as scheduled_groups,
  count(DISTINCT couple_id) as active_couples
FROM photo_groups
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Performance monitoring function
CREATE OR REPLACE FUNCTION get_photo_groups_performance_metrics()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'total_groups', count(*),
    'scheduled_groups', count(CASE WHEN scheduled_start IS NOT NULL THEN 1 END),
    'avg_group_size', avg((
      SELECT count(*) FROM photo_group_members pgm WHERE pgm.photo_group_id = pg.id
    )),
    'conflicts_detected', (
      SELECT count(*) FROM detect_advanced_conflicts(pg.couple_id) dc WHERE dc.severity > 5
    ),
    'last_updated', CURRENT_TIMESTAMP
  )
  FROM photo_groups pg;
$$;

-- Efficient guest availability checking function
CREATE OR REPLACE FUNCTION check_guest_availability(
  p_guest_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_exclude_group_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conflicting_groups JSONB[];
  group_record RECORD;
BEGIN
  conflicting_groups := ARRAY[]::JSONB[];
  
  FOR group_record IN
    SELECT 
      pg.id,
      pg.name,
      pg.scheduled_start,
      pg.scheduled_end,
      pg.priority
    FROM photo_groups pg
    JOIN photo_group_members pgm ON pg.id = pgm.photo_group_id
    WHERE pgm.guest_id = p_guest_id
    AND pg.scheduled_start IS NOT NULL
    AND pg.scheduled_end IS NOT NULL
    AND pg.id != COALESCE(p_exclude_group_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND pg.scheduled_start < p_end_time
    AND pg.scheduled_end > p_start_time
  LOOP
    conflicting_groups := conflicting_groups || jsonb_build_object(
      'group_id', group_record.id,
      'group_name', group_record.name,
      'start_time', group_record.scheduled_start,
      'end_time', group_record.scheduled_end,
      'priority', group_record.priority
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'available', array_length(conflicting_groups, 1) = 0 OR conflicting_groups IS NULL,
    'conflicting_groups', conflicting_groups,
    'checked_period', jsonb_build_object(
      'start', p_start_time,
      'end', p_end_time
    )
  );
END;
$$;

-- Priority-based scheduling functions
CREATE OR REPLACE FUNCTION auto_schedule_groups_by_priority(
  p_couple_id UUID,
  p_target_date DATE,
  p_start_time TIME DEFAULT '09:00:00',
  p_available_hours INTEGER DEFAULT 8
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  scheduled_groups JSONB[];
  current_time TIMESTAMPTZ;
  group_record RECORD;
  schedule_conflicts INTEGER := 0;
  total_scheduled INTEGER := 0;
BEGIN
  scheduled_groups := ARRAY[]::JSONB[];
  current_time := (p_target_date || ' ' || p_start_time)::TIMESTAMPTZ;
  
  FOR group_record IN
    SELECT 
      id, 
      name, 
      COALESCE(estimated_time_minutes, 15) as duration,
      priority,
      location_preference
    FROM photo_groups
    WHERE couple_id = p_couple_id
    AND (scheduled_start IS NULL OR DATE(scheduled_start) != p_target_date)
    ORDER BY priority DESC, estimated_time_minutes ASC
  LOOP
    -- Check if we have enough time remaining
    IF current_time + (group_record.duration || ' minutes')::INTERVAL > 
       (p_target_date || ' ' || p_start_time)::TIMESTAMPTZ + (p_available_hours || ' hours')::INTERVAL THEN
      EXIT; -- Not enough time remaining
    END IF;
    
    -- Update the group with scheduled time
    UPDATE photo_groups
    SET 
      scheduled_start = current_time,
      scheduled_end = current_time + (group_record.duration || ' minutes')::INTERVAL
    WHERE id = group_record.id;
    
    scheduled_groups := scheduled_groups || jsonb_build_object(
      'group_id', group_record.id,
      'group_name', group_record.name,
      'scheduled_start', current_time,
      'scheduled_end', current_time + (group_record.duration || ' minutes')::INTERVAL,
      'duration_minutes', group_record.duration,
      'priority', group_record.priority,
      'location', group_record.location_preference
    );
    
    -- Move to next time slot (adding 5 minute buffer)
    current_time := current_time + (group_record.duration + 5 || ' minutes')::INTERVAL;
    total_scheduled := total_scheduled + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'scheduled_groups', scheduled_groups,
    'total_scheduled', total_scheduled,
    'schedule_conflicts', schedule_conflicts,
    'final_end_time', current_time,
    'target_date', p_target_date
  );
END;
$$;

-- Data integrity validation functions
CREATE OR REPLACE FUNCTION validate_photo_group_data()
RETURNS TABLE (
  validation_type VARCHAR(50),
  group_id UUID,
  group_name TEXT,
  issue_description TEXT,
  severity VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  group_record RECORD;
BEGIN
  -- Check for groups with no members
  FOR group_record IN
    SELECT pg.id, pg.name
    FROM photo_groups pg
    LEFT JOIN photo_group_members pgm ON pg.id = pgm.photo_group_id
    WHERE pgm.photo_group_id IS NULL
  LOOP
    validation_type := 'empty_group';
    group_id := group_record.id;
    group_name := group_record.name;
    issue_description := 'Photo group has no members assigned';
    severity := 'warning';
    RETURN NEXT;
  END LOOP;
  
  -- Check for groups with invalid time estimates
  FOR group_record IN
    SELECT id, name, estimated_time_minutes
    FROM photo_groups
    WHERE estimated_time_minutes IS NOT NULL 
    AND (estimated_time_minutes <= 0 OR estimated_time_minutes > 120)
  LOOP
    validation_type := 'invalid_duration';
    group_id := group_record.id;
    group_name := group_record.name;
    issue_description := 'Invalid estimated time: ' || group_record.estimated_time_minutes || ' minutes';
    severity := 'error';
    RETURN NEXT;
  END LOOP;
  
  -- Check for scheduling conflicts
  FOR group_record IN
    SELECT 
      pg1.id,
      pg1.name,
      count(*) as conflict_count
    FROM photo_groups pg1
    WHERE EXISTS (
      SELECT 1 FROM detect_advanced_conflicts(pg1.couple_id, pg1.id) dc WHERE dc.severity > 5
    )
    GROUP BY pg1.id, pg1.name
  LOOP
    validation_type := 'scheduling_conflict';
    group_id := group_record.id;
    group_name := group_record.name;
    issue_description := 'Group has ' || group_record.conflict_count || ' high-severity scheduling conflicts';
    severity := 'critical';
    RETURN NEXT;
  END LOOP;
END;
$$;

-- ====================================================================
-- COMMENTS AND DOCUMENTATION
-- ====================================================================

COMMENT ON FUNCTION detect_advanced_conflicts IS 'WS-153: Advanced conflict detection with multiple conflict types and severity levels';
COMMENT ON FUNCTION optimize_photo_group_scheduling IS 'WS-153: Intelligent scheduling optimization based on priority and availability';
COMMENT ON FUNCTION check_guest_availability IS 'WS-153: Efficient guest availability checking for scheduling';
COMMENT ON FUNCTION auto_schedule_groups_by_priority IS 'WS-153: Automated scheduling based on priority and time constraints';
COMMENT ON FUNCTION validate_photo_group_data IS 'WS-153: Data integrity validation for photo groups';
COMMENT ON FUNCTION notify_photo_group_change IS 'WS-153: Real-time notification trigger for photo group changes';
COMMENT ON FUNCTION get_photo_groups_performance_metrics IS 'WS-153: Performance monitoring and analytics for photo groups';

-- Enable RLS on photo_groups if not already enabled
ALTER TABLE photo_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_group_members ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions for trigger functions
GRANT EXECUTE ON FUNCTION notify_photo_group_change() TO authenticated;
GRANT EXECUTE ON FUNCTION detect_advanced_conflicts(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION optimize_photo_group_scheduling(UUID, DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_guest_availability(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_schedule_groups_by_priority(UUID, DATE, TIME, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_photo_group_data() TO authenticated;
GRANT EXECUTE ON FUNCTION get_photo_groups_performance_metrics() TO authenticated;

-- ====================================================================
-- END OF WS-153 ROUND 2 MIGRATION
-- ====================================================================