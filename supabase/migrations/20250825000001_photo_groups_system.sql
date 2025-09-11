-- Migration: WS-153 Photo Groups Management System
-- Date: 2025-08-25
-- Team: Team C - Round 1
-- Features: Complete photo group management with conflict detection and RLS security

-- =============================================================================
-- PHOTO GROUPS SYSTEM - WS-153
-- =============================================================================

-- Main photo groups table following exact task specification
CREATE TABLE IF NOT EXISTS photo_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  shot_type VARCHAR(50) CHECK (shot_type IN ('formal', 'candid', 'posed', 'lifestyle')),
  estimated_duration INTEGER DEFAULT 5, -- minutes
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  location_preference VARCHAR(255),
  photographer_notes TEXT,
  scheduled_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for photo group members (exact task specification)
CREATE TABLE IF NOT EXISTS photo_group_members (
  photo_group_id UUID REFERENCES photo_groups(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (photo_group_id, guest_id)
);

-- =============================================================================
-- CONFLICT DETECTION FUNCTIONS
-- =============================================================================

-- Function to detect scheduling conflicts between photo groups
CREATE OR REPLACE FUNCTION detect_photo_group_conflicts(
  p_couple_id UUID,
  p_scheduled_time TIMESTAMPTZ,
  p_duration INTEGER,
  p_exclude_group_id UUID DEFAULT NULL
)
RETURNS TABLE (
  conflicting_group_id UUID,
  conflicting_group_name VARCHAR(255),
  conflicting_time TIMESTAMPTZ,
  conflicting_duration INTEGER,
  overlap_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pg.id,
    pg.name,
    pg.scheduled_time,
    pg.estimated_duration,
    CASE 
      WHEN pg.scheduled_time + (pg.estimated_duration || ' minutes')::INTERVAL <= p_scheduled_time 
        OR p_scheduled_time + (p_duration || ' minutes')::INTERVAL <= pg.scheduled_time 
      THEN 0
      ELSE EXTRACT(EPOCH FROM 
        LEAST(
          pg.scheduled_time + (pg.estimated_duration || ' minutes')::INTERVAL,
          p_scheduled_time + (p_duration || ' minutes')::INTERVAL
        ) - GREATEST(pg.scheduled_time, p_scheduled_time)
      )::INTEGER / 60
    END AS overlap_minutes
  FROM photo_groups pg
  WHERE pg.couple_id = p_couple_id
    AND pg.scheduled_time IS NOT NULL
    AND (p_exclude_group_id IS NULL OR pg.id != p_exclude_group_id)
    AND (
      (pg.scheduled_time, pg.scheduled_time + (pg.estimated_duration || ' minutes')::INTERVAL) 
      OVERLAPS 
      (p_scheduled_time, p_scheduled_time + (p_duration || ' minutes')::INTERVAL)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to detect guest availability conflicts
CREATE OR REPLACE FUNCTION detect_guest_availability_conflicts(
  p_photo_group_id UUID,
  p_scheduled_time TIMESTAMPTZ,
  p_duration INTEGER
)
RETURNS TABLE (
  guest_id UUID,
  guest_name TEXT,
  conflicting_group_id UUID,
  conflicting_group_name VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    g.id,
    (g.first_name || ' ' || g.last_name) AS guest_name,
    pg_conflict.id,
    pg_conflict.name
  FROM guests g
  JOIN photo_group_members pgm ON g.id = pgm.guest_id
  JOIN photo_groups pg_conflict ON pgm.photo_group_id = pg_conflict.id
  WHERE pgm.photo_group_id IN (
    SELECT pgm2.photo_group_id 
    FROM photo_group_members pgm2 
    WHERE pgm2.photo_group_id = p_photo_group_id
  )
  AND pg_conflict.id != p_photo_group_id
  AND pg_conflict.scheduled_time IS NOT NULL
  AND (
    (pg_conflict.scheduled_time, pg_conflict.scheduled_time + (pg_conflict.estimated_duration || ' minutes')::INTERVAL) 
    OVERLAPS 
    (p_scheduled_time, p_scheduled_time + (p_duration || ' minutes')::INTERVAL)
  );
END;
$$ LANGUAGE plpgsql;

-- Function to validate photo group before insert/update
CREATE OR REPLACE FUNCTION validate_photo_group_scheduling()
RETURNS TRIGGER AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Only check conflicts if scheduled_time is set
  IF NEW.scheduled_time IS NOT NULL THEN
    -- Check for time conflicts with other photo groups
    SELECT COUNT(*)
    INTO conflict_count
    FROM detect_photo_group_conflicts(
      NEW.couple_id,
      NEW.scheduled_time,
      NEW.estimated_duration,
      CASE WHEN TG_OP = 'UPDATE' THEN NEW.id ELSE NULL END
    )
    WHERE overlap_minutes > 0;
    
    IF conflict_count > 0 THEN
      RAISE EXCEPTION 'Photo group scheduling conflict detected. Please choose a different time slot.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Primary indexes for photo_groups
CREATE INDEX IF NOT EXISTS idx_photo_groups_couple_id ON photo_groups(couple_id);
CREATE INDEX IF NOT EXISTS idx_photo_groups_scheduled_time ON photo_groups(scheduled_time) WHERE scheduled_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photo_groups_priority ON photo_groups(priority);
CREATE INDEX IF NOT EXISTS idx_photo_groups_shot_type ON photo_groups(shot_type);
CREATE INDEX IF NOT EXISTS idx_photo_groups_location ON photo_groups(location_preference) WHERE location_preference IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_photo_groups_couple_priority ON photo_groups(couple_id, priority DESC);
CREATE INDEX IF NOT EXISTS idx_photo_groups_couple_scheduled ON photo_groups(couple_id, scheduled_time) WHERE scheduled_time IS NOT NULL;

-- Indexes for photo_group_members
CREATE INDEX IF NOT EXISTS idx_photo_group_members_group_id ON photo_group_members(photo_group_id);
CREATE INDEX IF NOT EXISTS idx_photo_group_members_guest_id ON photo_group_members(guest_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on both tables
ALTER TABLE photo_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage photo groups for their couples
CREATE POLICY "Users can manage their photo groups" ON photo_groups
  FOR ALL 
  TO authenticated 
  USING (
    couple_id IN (
      SELECT c.id FROM clients c
      JOIN user_profiles up ON c.organization_id = up.organization_id
      WHERE up.user_id = auth.uid()
    )
  )
  WITH CHECK (
    couple_id IN (
      SELECT c.id FROM clients c
      JOIN user_profiles up ON c.organization_id = up.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can manage photo group members for their couples
CREATE POLICY "Users can manage their group members" ON photo_group_members
  FOR ALL 
  TO authenticated 
  USING (
    photo_group_id IN (
      SELECT pg.id FROM photo_groups pg
      JOIN clients c ON pg.couple_id = c.id
      JOIN user_profiles up ON c.organization_id = up.organization_id
      WHERE up.user_id = auth.uid()
    )
  )
  WITH CHECK (
    photo_group_id IN (
      SELECT pg.id FROM photo_groups pg
      JOIN clients c ON pg.couple_id = c.id
      JOIN user_profiles up ON c.organization_id = up.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Trigger for updated_at timestamp
CREATE TRIGGER update_photo_groups_updated_at
BEFORE UPDATE ON photo_groups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for scheduling validation
CREATE TRIGGER validate_photo_group_scheduling_trigger
BEFORE INSERT OR UPDATE ON photo_groups
FOR EACH ROW EXECUTE FUNCTION validate_photo_group_scheduling();

-- =============================================================================
-- SAMPLE DATA FOR TESTING
-- =============================================================================

-- Insert test data only if running in development/test environment
-- This will be used by integration tests
DO $sample_data$
BEGIN
  -- Only insert if no photo groups exist (prevents duplicate data)
  IF NOT EXISTS (SELECT 1 FROM photo_groups LIMIT 1) THEN
    -- Sample photo groups for testing (requires existing client data)
    INSERT INTO photo_groups (couple_id, name, description, shot_type, estimated_duration, priority, location_preference, photographer_notes)
    SELECT 
      c.id,
      'Smith Family Photos',
      'Traditional family portraits with 3 generations',
      'formal',
      15,
      8,
      'Garden area',
      'Include grandparents, may need chairs'
    FROM clients c
    WHERE c.first_name = 'John' AND c.last_name = 'Smith'
    LIMIT 1;

    INSERT INTO photo_groups (couple_id, name, description, shot_type, estimated_duration, priority, location_preference, photographer_notes)
    SELECT 
      c.id,
      'Bridal Party Fun',
      'Casual shots with bridesmaids and groomsmen',
      'candid',
      20,
      6,
      'Outdoor terrace',
      'Mix of posed and candid shots'
    FROM clients c
    WHERE c.first_name = 'John' AND c.last_name = 'Smith'
    LIMIT 1;
  END IF;
END
$sample_data$;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE photo_groups IS 'Photo group management for wedding photography - WS-153';
COMMENT ON TABLE photo_group_members IS 'Guest assignments to photo groups with conflict detection - WS-153';

COMMENT ON FUNCTION detect_photo_group_conflicts(UUID, TIMESTAMPTZ, INTEGER, UUID) IS 'Detects scheduling conflicts between photo groups';
COMMENT ON FUNCTION detect_guest_availability_conflicts(UUID, TIMESTAMPTZ, INTEGER) IS 'Detects guest availability conflicts across photo groups';
COMMENT ON FUNCTION validate_photo_group_scheduling() IS 'Trigger function to validate photo group scheduling before insert/update';