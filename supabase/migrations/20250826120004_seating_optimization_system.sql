-- WS-154 Seating Optimization System Migration
-- Created by Team B for seating arrangement optimization
-- This migration creates the complete seating management system

-- ==================================================
-- RECEPTION TABLES
-- ==================================================

CREATE TABLE IF NOT EXISTS reception_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  name VARCHAR(100),
  capacity INTEGER NOT NULL DEFAULT 8 CHECK (capacity > 0 AND capacity <= 20),
  table_shape VARCHAR(20) DEFAULT 'round' CHECK (table_shape IN ('round', 'rectangular', 'square', 'oval', 'hexagonal')),
  location_notes TEXT,
  special_requirements TEXT,
  accessibility_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique table numbers per couple
  CONSTRAINT unique_table_number_per_couple UNIQUE (couple_id, table_number)
);

-- Indexes for reception_tables
CREATE INDEX IF NOT EXISTS idx_reception_tables_couple_id ON reception_tables(couple_id);
CREATE INDEX IF NOT EXISTS idx_reception_tables_active ON reception_tables(couple_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_reception_tables_capacity ON reception_tables(couple_id, capacity);

-- ==================================================
-- GUEST RELATIONSHIPS
-- ==================================================

CREATE TABLE IF NOT EXISTS guest_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest1_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  guest2_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL DEFAULT 'acquaintances',
  seating_preference VARCHAR(50) NOT NULL DEFAULT 'neutral',
  relationship_strength INTEGER DEFAULT 0 CHECK (relationship_strength >= -10 AND relationship_strength <= 10),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure guest1_id < guest2_id for consistency and no self-relationships
  CONSTRAINT check_guest_order CHECK (guest1_id < guest2_id),
  CONSTRAINT unique_guest_relationship UNIQUE (guest1_id, guest2_id),
  
  -- Relationship type constraints
  CONSTRAINT valid_relationship_type CHECK (
    relationship_type IN (
      'family', 'close_family', 'extended_family',
      'close_friends', 'friends', 'acquaintances',
      'colleagues', 'business_partners',
      'avoid', 'conflict', 'ex_relationship'
    )
  ),
  
  -- Seating preference constraints
  CONSTRAINT valid_seating_preference CHECK (
    seating_preference IN (
      'must_sit_together', 'prefer_together', 'neutral',
      'prefer_apart', 'must_separate'
    )
  )
);

-- Indexes for guest_relationships
CREATE INDEX IF NOT EXISTS idx_guest_relationships_guest1 ON guest_relationships(guest1_id);
CREATE INDEX IF NOT EXISTS idx_guest_relationships_guest2 ON guest_relationships(guest2_id);
CREATE INDEX IF NOT EXISTS idx_guest_relationships_preference ON guest_relationships(seating_preference);
CREATE INDEX IF NOT EXISTS idx_guest_relationships_strength ON guest_relationships(relationship_strength);
CREATE INDEX IF NOT EXISTS idx_guest_relationships_active ON guest_relationships(is_active) WHERE is_active = true;

-- ==================================================
-- SEATING ARRANGEMENTS
-- ==================================================

CREATE TABLE IF NOT EXISTS seating_arrangements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  is_finalized BOOLEAN DEFAULT false,
  optimization_score DECIMAL(5,2) DEFAULT 0.00 CHECK (optimization_score >= 0),
  algorithm_version VARCHAR(50) DEFAULT '1.0',
  optimization_settings JSONB DEFAULT '{}',
  performance_metrics JSONB DEFAULT '{}',
  conflict_summary JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  finalized_by UUID REFERENCES clients(id),
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Only one active arrangement per couple
  CONSTRAINT unique_active_arrangement UNIQUE (couple_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Partial index for active arrangements only
CREATE UNIQUE INDEX IF NOT EXISTS idx_seating_arrangements_active_unique 
  ON seating_arrangements(couple_id) 
  WHERE is_active = true;

-- Other indexes for seating_arrangements
CREATE INDEX IF NOT EXISTS idx_seating_arrangements_couple_id ON seating_arrangements(couple_id);
CREATE INDEX IF NOT EXISTS idx_seating_arrangements_score ON seating_arrangements(optimization_score DESC);
CREATE INDEX IF NOT EXISTS idx_seating_arrangements_created ON seating_arrangements(couple_id, created_at DESC);

-- ==================================================
-- SEATING ASSIGNMENTS
-- ==================================================

CREATE TABLE IF NOT EXISTS seating_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_id UUID NOT NULL REFERENCES seating_arrangements(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES reception_tables(id) ON DELETE CASCADE,
  seat_number INTEGER CHECK (seat_number > 0 AND seat_number <= 20),
  seat_position VARCHAR(50), -- 'head', 'foot', 'side', 'corner', etc.
  assignment_reason TEXT, -- Why this guest was placed here
  confidence_score DECIMAL(3,2) DEFAULT 1.00 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  notes TEXT,
  assigned_by VARCHAR(50) DEFAULT 'algorithm',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraints
  CONSTRAINT unique_guest_per_arrangement UNIQUE (arrangement_id, guest_id),
  CONSTRAINT unique_seat_per_table UNIQUE (arrangement_id, table_id, seat_number) DEFERRABLE INITIALLY DEFERRED,
  
  -- Assignment type constraints
  CONSTRAINT valid_assignment_type CHECK (
    assigned_by IN ('algorithm', 'manual', 'hybrid', 'imported')
  )
);

-- Indexes for seating_assignments
CREATE INDEX IF NOT EXISTS idx_seating_assignments_arrangement ON seating_assignments(arrangement_id);
CREATE INDEX IF NOT EXISTS idx_seating_assignments_guest ON seating_assignments(guest_id);
CREATE INDEX IF NOT EXISTS idx_seating_assignments_table ON seating_assignments(table_id);
CREATE INDEX IF NOT EXISTS idx_seating_assignments_confidence ON seating_assignments(confidence_score DESC);

-- ==================================================
-- SEATING VALIDATION LOGS
-- ==================================================

CREATE TABLE IF NOT EXISTS seating_validation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  arrangement_id UUID REFERENCES seating_arrangements(id) ON DELETE CASCADE,
  validation_type VARCHAR(50) NOT NULL,
  conflicts_found INTEGER DEFAULT 0,
  conflict_details JSONB DEFAULT '[]',
  table_assignments JSONB DEFAULT '[]',
  validation_settings JSONB DEFAULT '{}',
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for seating_validation_logs
CREATE INDEX IF NOT EXISTS idx_validation_logs_couple ON seating_validation_logs(couple_id);
CREATE INDEX IF NOT EXISTS idx_validation_logs_arrangement ON seating_validation_logs(arrangement_id);
CREATE INDEX IF NOT EXISTS idx_validation_logs_type ON seating_validation_logs(validation_type);
CREATE INDEX IF NOT EXISTS idx_validation_logs_created ON seating_validation_logs(created_at DESC);

-- ==================================================
-- SEATING OPTIMIZATION RULES (Optional Configuration)
-- ==================================================

CREATE TABLE IF NOT EXISTS seating_optimization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rule_name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  rule_priority INTEGER DEFAULT 5 CHECK (rule_priority >= 1 AND rule_priority <= 10),
  rule_weight DECIMAL(3,2) DEFAULT 1.00 CHECK (rule_weight >= 0 AND rule_weight <= 2),
  rule_parameters JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Rule type constraints
  CONSTRAINT valid_rule_type CHECK (
    rule_type IN (
      'relationship_priority', 'age_grouping', 'dietary_consideration',
      'accessibility_requirement', 'cultural_preference', 'custom'
    )
  )
);

-- Indexes for seating_optimization_rules
CREATE INDEX IF NOT EXISTS idx_optimization_rules_couple ON seating_optimization_rules(couple_id);
CREATE INDEX IF NOT EXISTS idx_optimization_rules_type ON seating_optimization_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_optimization_rules_priority ON seating_optimization_rules(rule_priority DESC);

-- ==================================================
-- MATERIALIZED VIEW FOR OPTIMIZATION PERFORMANCE
-- ==================================================

-- This view pre-calculates guest relationships and table data for fast optimization
CREATE MATERIALIZED VIEW IF NOT EXISTS seating_optimization_view AS
SELECT 
  g.id as guest_id,
  g.couple_id,
  g.first_name,
  g.last_name,
  g.category,
  g.side,
  g.age_group,
  g.household_id,
  g.plus_one,
  g.dietary_restrictions,
  g.special_needs,
  
  -- Aggregate relationship data
  COALESCE(
    json_agg(
      json_build_object(
        'related_guest_id', CASE 
          WHEN gr.guest1_id = g.id THEN gr.guest2_id 
          ELSE gr.guest1_id 
        END,
        'relationship_type', gr.relationship_type,
        'seating_preference', gr.seating_preference,
        'relationship_strength', gr.relationship_strength
      ) ORDER BY gr.relationship_strength DESC
    ) FILTER (WHERE gr.id IS NOT NULL),
    '[]'::json
  ) as relationships,
  
  -- Count of total relationships
  COUNT(gr.id) as relationship_count,
  
  -- Average relationship strength
  ROUND(AVG(gr.relationship_strength), 2) as avg_relationship_strength,
  
  -- Flags for optimization
  (g.age_group = 'child') as is_child,
  (g.special_needs IS NOT NULL) as has_special_needs,
  (g.dietary_restrictions IS NOT NULL) as has_dietary_restrictions,
  (g.plus_one = true) as has_plus_one

FROM guests g
LEFT JOIN guest_relationships gr ON (
  (gr.guest1_id = g.id OR gr.guest2_id = g.id) 
  AND gr.is_active = true
)
WHERE g.rsvp_status = 'attending'
GROUP BY 
  g.id, g.couple_id, g.first_name, g.last_name, g.category, 
  g.side, g.age_group, g.household_id, g.plus_one, 
  g.dietary_restrictions, g.special_needs;

-- Index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_seating_optimization_view_guest 
  ON seating_optimization_view(guest_id);
CREATE INDEX IF NOT EXISTS idx_seating_optimization_view_couple 
  ON seating_optimization_view(couple_id);

-- ==================================================
-- FUNCTIONS FOR SEATING OPTIMIZATION
-- ==================================================

-- Function to refresh the optimization view
CREATE OR REPLACE FUNCTION refresh_seating_optimization_view()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY seating_optimization_view;
$$;

-- Function to validate seating arrangement
CREATE OR REPLACE FUNCTION validate_seating_arrangement(p_arrangement_id UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  conflict_count INTEGER,
  conflicts JSONB,
  warnings JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  arrangement_exists BOOLEAN;
  total_conflicts INTEGER := 0;
  conflict_details JSONB := '[]'::jsonb;
  warning_details JSONB := '[]'::jsonb;
BEGIN
  -- Check if arrangement exists
  SELECT EXISTS(SELECT 1 FROM seating_arrangements WHERE id = p_arrangement_id)
  INTO arrangement_exists;
  
  IF NOT arrangement_exists THEN
    RAISE EXCEPTION 'Seating arrangement not found: %', p_arrangement_id;
  END IF;
  
  -- Check for relationship conflicts
  WITH relationship_conflicts AS (
    SELECT 
      sa1.guest_id as guest1_id,
      sa2.guest_id as guest2_id,
      gr.relationship_type,
      gr.seating_preference,
      gr.relationship_strength,
      sa1.table_id
    FROM seating_assignments sa1
    JOIN seating_assignments sa2 ON sa1.table_id = sa2.table_id 
      AND sa1.arrangement_id = sa2.arrangement_id
      AND sa1.guest_id < sa2.guest_id
    JOIN guest_relationships gr ON (
      (gr.guest1_id = sa1.guest_id AND gr.guest2_id = sa2.guest_id)
      OR (gr.guest1_id = sa2.guest_id AND gr.guest2_id = sa1.guest_id)
    )
    WHERE sa1.arrangement_id = p_arrangement_id
      AND gr.seating_preference = 'must_separate'
      AND gr.is_active = true
  )
  SELECT 
    COUNT(*),
    COALESCE(json_agg(
      json_build_object(
        'type', 'relationship_conflict',
        'severity', 'high',
        'guest1_id', guest1_id,
        'guest2_id', guest2_id,
        'table_id', table_id,
        'reason', 'Guests marked as "must_separate" are at the same table'
      )
    ), '[]'::json)
  INTO total_conflicts, conflict_details
  FROM relationship_conflicts;
  
  -- Check for capacity violations
  WITH capacity_violations AS (
    SELECT 
      rt.id as table_id,
      rt.table_number,
      rt.capacity,
      COUNT(sa.guest_id) as assigned_count
    FROM reception_tables rt
    JOIN seating_assignments sa ON sa.table_id = rt.id
    WHERE sa.arrangement_id = p_arrangement_id
    GROUP BY rt.id, rt.table_number, rt.capacity
    HAVING COUNT(sa.guest_id) > rt.capacity
  )
  SELECT 
    total_conflicts + COUNT(*),
    conflict_details || COALESCE(json_agg(
      json_build_object(
        'type', 'capacity_violation',
        'severity', 'high',
        'table_id', table_id,
        'table_number', table_number,
        'capacity', capacity,
        'assigned_count', assigned_count,
        'reason', 'Table exceeds capacity'
      )
    ), '[]'::json)
  INTO total_conflicts, conflict_details
  FROM capacity_violations;
  
  -- Return results
  RETURN QUERY SELECT 
    (total_conflicts = 0),
    total_conflicts,
    conflict_details,
    warning_details;
END;
$$;

-- Function to calculate seating optimization score
CREATE OR REPLACE FUNCTION calculate_seating_score(p_arrangement_id UUID)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_score DECIMAL(5,2) := 0;
  relationship_score DECIMAL(5,2) := 0;
  capacity_penalty DECIMAL(5,2) := 0;
  pair_count INTEGER := 0;
BEGIN
  -- Calculate relationship satisfaction score
  WITH table_relationships AS (
    SELECT 
      gr.relationship_strength,
      gr.seating_preference,
      CASE 
        WHEN gr.seating_preference = 'must_sit_together' THEN 10
        WHEN gr.seating_preference = 'prefer_together' THEN 5
        WHEN gr.seating_preference = 'neutral' THEN 1
        WHEN gr.seating_preference = 'prefer_apart' THEN -5
        WHEN gr.seating_preference = 'must_separate' THEN -10
        ELSE 0
      END as preference_weight
    FROM seating_assignments sa1
    JOIN seating_assignments sa2 ON sa1.table_id = sa2.table_id 
      AND sa1.arrangement_id = sa2.arrangement_id
      AND sa1.guest_id < sa2.guest_id
    JOIN guest_relationships gr ON (
      (gr.guest1_id = sa1.guest_id AND gr.guest2_id = sa2.guest_id)
      OR (gr.guest1_id = sa2.guest_id AND gr.guest2_id = sa1.guest_id)
    )
    WHERE sa1.arrangement_id = p_arrangement_id
      AND gr.is_active = true
  )
  SELECT 
    COALESCE(AVG(relationship_strength * preference_weight), 0),
    COUNT(*)
  INTO relationship_score, pair_count
  FROM table_relationships;
  
  -- Calculate capacity utilization penalty
  WITH capacity_utilization AS (
    SELECT 
      rt.capacity,
      COUNT(sa.guest_id) as assigned_count,
      (COUNT(sa.guest_id)::DECIMAL / rt.capacity) as utilization
    FROM reception_tables rt
    JOIN seating_assignments sa ON sa.table_id = rt.id
    WHERE sa.arrangement_id = p_arrangement_id
    GROUP BY rt.id, rt.capacity
  )
  SELECT 
    COALESCE(AVG(
      CASE 
        WHEN utilization > 1.0 THEN (utilization - 1.0) * -20
        WHEN utilization < 0.5 THEN (0.5 - utilization) * -5
        ELSE 0
      END
    ), 0)
  INTO capacity_penalty
  FROM capacity_utilization;
  
  -- Combine scores
  total_score := relationship_score + capacity_penalty;
  
  -- Normalize to 0-10 scale
  total_score := GREATEST(0, LEAST(10, (total_score + 5) * 0.5));
  
  RETURN total_score;
END;
$$;

-- Function to get relationship conflicts for a couple
CREATE OR REPLACE FUNCTION get_relationship_conflicts(p_couple_id UUID)
RETURNS TABLE (
  guest1_id UUID,
  guest2_id UUID,
  guest1_name TEXT,
  guest2_name TEXT,
  relationship_type VARCHAR,
  seating_preference VARCHAR,
  relationship_strength INTEGER,
  conflict_severity VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gr.guest1_id,
    gr.guest2_id,
    CONCAT(g1.first_name, ' ', g1.last_name) as guest1_name,
    CONCAT(g2.first_name, ' ', g2.last_name) as guest2_name,
    gr.relationship_type,
    gr.seating_preference,
    gr.relationship_strength,
    CASE 
      WHEN gr.seating_preference = 'must_separate' AND gr.relationship_strength < -5 THEN 'high'
      WHEN gr.seating_preference = 'must_separate' THEN 'medium'
      WHEN gr.relationship_strength < -3 THEN 'medium'
      ELSE 'low'
    END as conflict_severity
  FROM guest_relationships gr
  JOIN guests g1 ON g1.id = gr.guest1_id
  JOIN guests g2 ON g2.id = gr.guest2_id
  WHERE gr.created_by = p_couple_id
    AND gr.is_active = true
    AND (
      gr.seating_preference IN ('must_separate', 'prefer_apart')
      OR gr.relationship_strength < 0
    )
    AND g1.rsvp_status = 'attending'
    AND g2.rsvp_status = 'attending'
  ORDER BY 
    CASE 
      WHEN gr.seating_preference = 'must_separate' THEN 1
      WHEN gr.relationship_strength < -5 THEN 2
      ELSE 3
    END,
    gr.relationship_strength ASC;
END;
$$;

-- ==================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==================================================

-- Enable RLS on all seating tables
ALTER TABLE reception_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE seating_arrangements ENABLE ROW LEVEL SECURITY;
ALTER TABLE seating_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE seating_validation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE seating_optimization_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reception_tables
CREATE POLICY "Users can view their organization's reception tables" ON reception_tables
  FOR SELECT USING (
    couple_id IN (
      SELECT c.id FROM clients c
      JOIN user_profiles up ON up.organization_id = c.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their organization's reception tables" ON reception_tables
  FOR ALL USING (
    couple_id IN (
      SELECT c.id FROM clients c
      JOIN user_profiles up ON up.organization_id = c.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

-- RLS Policies for guest_relationships
CREATE POLICY "Users can view their organization's guest relationships" ON guest_relationships
  FOR SELECT USING (
    created_by IN (
      SELECT c.id FROM clients c
      JOIN user_profiles up ON up.organization_id = c.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their organization's guest relationships" ON guest_relationships
  FOR ALL USING (
    created_by IN (
      SELECT c.id FROM clients c
      JOIN user_profiles up ON up.organization_id = c.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

-- RLS Policies for seating_arrangements
CREATE POLICY "Users can view their organization's seating arrangements" ON seating_arrangements
  FOR SELECT USING (
    couple_id IN (
      SELECT c.id FROM clients c
      JOIN user_profiles up ON up.organization_id = c.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their organization's seating arrangements" ON seating_arrangements
  FOR ALL USING (
    couple_id IN (
      SELECT c.id FROM clients c
      JOIN user_profiles up ON up.organization_id = c.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

-- RLS Policies for seating_assignments
CREATE POLICY "Users can view their organization's seating assignments" ON seating_assignments
  FOR SELECT USING (
    arrangement_id IN (
      SELECT sa.id FROM seating_arrangements sa
      JOIN clients c ON c.id = sa.couple_id
      JOIN user_profiles up ON up.organization_id = c.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their organization's seating assignments" ON seating_assignments
  FOR ALL USING (
    arrangement_id IN (
      SELECT sa.id FROM seating_arrangements sa
      JOIN clients c ON c.id = sa.couple_id
      JOIN user_profiles up ON up.organization_id = c.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

-- RLS Policies for seating_validation_logs
CREATE POLICY "Users can view their organization's validation logs" ON seating_validation_logs
  FOR SELECT USING (
    couple_id IN (
      SELECT c.id FROM clients c
      JOIN user_profiles up ON up.organization_id = c.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create validation logs for their organization" ON seating_validation_logs
  FOR INSERT WITH CHECK (
    couple_id IN (
      SELECT c.id FROM clients c
      JOIN user_profiles up ON up.organization_id = c.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

-- RLS Policies for seating_optimization_rules
CREATE POLICY "Users can view their organization's optimization rules" ON seating_optimization_rules
  FOR SELECT USING (
    couple_id IN (
      SELECT c.id FROM clients c
      JOIN user_profiles up ON up.organization_id = c.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their organization's optimization rules" ON seating_optimization_rules
  FOR ALL USING (
    couple_id IN (
      SELECT c.id FROM clients c
      JOIN user_profiles up ON up.organization_id = c.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

-- ==================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ==================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to all tables with updated_at
CREATE TRIGGER update_reception_tables_updated_at BEFORE UPDATE ON reception_tables
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_guest_relationships_updated_at BEFORE UPDATE ON guest_relationships
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_seating_arrangements_updated_at BEFORE UPDATE ON seating_arrangements
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_optimization_rules_updated_at BEFORE UPDATE ON seating_optimization_rules
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Trigger to refresh materialized view after relationship changes
CREATE OR REPLACE FUNCTION refresh_optimization_view_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Schedule a refresh of the materialized view
  -- In a real implementation, this might use a job queue
  PERFORM pg_notify('refresh_optimization_view', TG_TABLE_NAME);
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER refresh_view_on_relationship_change
  AFTER INSERT OR UPDATE OR DELETE ON guest_relationships
  FOR EACH ROW EXECUTE PROCEDURE refresh_optimization_view_trigger();

CREATE TRIGGER refresh_view_on_guest_change
  AFTER UPDATE ON guests
  FOR EACH ROW 
  WHEN (OLD.rsvp_status IS DISTINCT FROM NEW.rsvp_status)
  EXECUTE PROCEDURE refresh_optimization_view_trigger();

-- ==================================================
-- INITIAL DATA AND CONSTRAINTS
-- ==================================================

-- Add check constraints to existing tables if needed
DO $$
BEGIN
  -- Add table_number constraint to guests table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'guests_table_number_positive'
  ) THEN
    ALTER TABLE guests ADD CONSTRAINT guests_table_number_positive 
      CHECK (table_number IS NULL OR table_number > 0);
  END IF;
END $$;

-- ==================================================
-- PERFORMANCE OPTIMIZATION SETTINGS
-- ==================================================

-- Set statistics targets for better query planning
ALTER TABLE reception_tables ALTER COLUMN couple_id SET STATISTICS 1000;
ALTER TABLE guest_relationships ALTER COLUMN guest1_id SET STATISTICS 1000;
ALTER TABLE guest_relationships ALTER COLUMN guest2_id SET STATISTICS 1000;
ALTER TABLE seating_assignments ALTER COLUMN arrangement_id SET STATISTICS 1000;

-- ==================================================
-- COMMENTS FOR DOCUMENTATION
-- ==================================================

COMMENT ON TABLE reception_tables IS 'Wedding reception table configurations for seating optimization';
COMMENT ON TABLE guest_relationships IS 'Relationships between guests for seating algorithm optimization';
COMMENT ON TABLE seating_arrangements IS 'Complete seating arrangements with optimization scores';
COMMENT ON TABLE seating_assignments IS 'Individual guest-to-table assignments within arrangements';
COMMENT ON TABLE seating_validation_logs IS 'Audit log for seating validation and conflict detection';
COMMENT ON TABLE seating_optimization_rules IS 'Custom optimization rules per couple';

COMMENT ON FUNCTION validate_seating_arrangement(UUID) IS 'Validates a seating arrangement and returns conflicts';
COMMENT ON FUNCTION calculate_seating_score(UUID) IS 'Calculates optimization score for a seating arrangement';
COMMENT ON FUNCTION get_relationship_conflicts(UUID) IS 'Returns all relationship conflicts for a couple';

-- ==================================================
-- GRANT PERMISSIONS
-- ==================================================

-- Grant necessary permissions to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant read permissions to authenticated users (controlled by RLS)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION validate_seating_arrangement(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_seating_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_relationship_conflicts(UUID) TO authenticated;