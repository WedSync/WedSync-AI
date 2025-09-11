-- Migration: WS-154 Seating Arrangements System Foundation
-- Team: E - Database Schema & Data Management
-- Date: 2025-08-26
-- Priority: P1 - Guest Management Core Feature
-- Optimized for 200+ guest weddings with complex relationships

-- ==================================================
-- RECEPTION TABLES
-- ==================================================

-- Physical tables at the wedding venue
CREATE TABLE IF NOT EXISTS reception_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  name VARCHAR(100), -- "Table 1", "Head Table", "Kids Table"
  capacity INTEGER NOT NULL CHECK (capacity > 0 AND capacity <= 20),
  table_shape VARCHAR(20) DEFAULT 'round' CHECK (table_shape IN ('round', 'rectangular', 'square', 'oval')),
  location_x DECIMAL(10,2), -- X coordinate for visual layout
  location_y DECIMAL(10,2), -- Y coordinate for visual layout
  rotation_angle INTEGER DEFAULT 0, -- 0-359 degrees for rectangular tables
  special_requirements TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique table numbers per couple
  UNIQUE(couple_id, table_number)
);

-- ==================================================
-- GUEST RELATIONSHIPS
-- ==================================================

-- Bidirectional relationships between guests
CREATE TABLE IF NOT EXISTS guest_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest1_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  guest2_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL CHECK (
    relationship_type IN (
      'spouse', 'partner', 'family_immediate', 'family_extended', 
      'close_friends', 'friends', 'colleagues', 'plus_one', 
      'child_parent', 'siblings', 'acquaintances'
    )
  ),
  seating_preference VARCHAR(30) NOT NULL DEFAULT 'neutral' CHECK (
    seating_preference IN (
      'must_sit_together', 'prefer_together', 'neutral', 
      'prefer_apart', 'must_separate', 'incompatible'
    )
  ),
  relationship_strength INTEGER DEFAULT 3 CHECK (relationship_strength BETWEEN 1 AND 5), -- 1=weakest, 5=strongest
  notes TEXT,
  created_by UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure guest1_id < guest2_id to prevent duplicate relationships
  CHECK (guest1_id < guest2_id),
  UNIQUE(guest1_id, guest2_id, relationship_type)
);

-- ==================================================
-- SEATING ARRANGEMENTS
-- ==================================================

-- Saved seating arrangement configurations
CREATE TABLE IF NOT EXISTS seating_arrangements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- "Version 1", "Final Layout", "Draft A"
  description TEXT,
  is_active BOOLEAN DEFAULT false, -- Only one arrangement can be active at a time
  optimization_score DECIMAL(10,2) DEFAULT 0.0, -- Calculated score based on relationship preferences
  created_by UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(couple_id, name)
);

-- ==================================================
-- SEATING ASSIGNMENTS
-- ==================================================

-- Individual guest-to-table-to-seat assignments
CREATE TABLE IF NOT EXISTS seating_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_id UUID NOT NULL REFERENCES seating_arrangements(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES reception_tables(id) ON DELETE CASCADE,
  seat_number INTEGER, -- 1, 2, 3, etc. around the table (clockwise from 12 o'clock)
  seat_position VARCHAR(20), -- 'head', 'foot', 'side' for rectangular tables
  assigned_by UUID REFERENCES clients(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One guest per seat per arrangement
  UNIQUE(arrangement_id, table_id, seat_number),
  -- One guest per arrangement (can't be seated twice)
  UNIQUE(arrangement_id, guest_id)
);

-- ==================================================
-- SEATING OPTIMIZATION RULES
-- ==================================================

-- Configurable rules for automatic seating optimization
CREATE TABLE IF NOT EXISTS seating_optimization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rule_name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50) NOT NULL CHECK (
    rule_type IN (
      'age_grouping', 'family_grouping', 'relationship_proximity',
      'table_balance', 'special_needs', 'custom'
    )
  ),
  rule_config JSONB NOT NULL DEFAULT '{}', -- Flexible configuration for different rule types
  weight DECIMAL(5,2) DEFAULT 1.0 CHECK (weight >= 0), -- Importance weight in optimization
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================
-- RELATIONSHIP ACCESS AUDIT LOG
-- ==================================================

-- Security: Track access to sensitive relationship data
CREATE TABLE IF NOT EXISTS relationship_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  relationship_id UUID REFERENCES guest_relationships(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  access_type VARCHAR(50) NOT NULL, -- 'view', 'create', 'update', 'delete'
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================
-- PERFORMANCE INDEXES
-- ==================================================

-- Reception Tables Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reception_tables_couple_id 
  ON reception_tables(couple_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reception_tables_active 
  ON reception_tables(couple_id, is_active) WHERE is_active = true;

-- Guest Relationships Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guest_relationships_guest1 
  ON guest_relationships(guest1_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guest_relationships_guest2 
  ON guest_relationships(guest2_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guest_relationships_preference 
  ON guest_relationships(seating_preference) 
  WHERE seating_preference IN ('must_sit_together', 'must_separate', 'incompatible');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guest_relationships_strength 
  ON guest_relationships(relationship_strength, seating_preference);

-- Composite index for conflict detection queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_relationships_conflict_detection 
  ON guest_relationships(guest1_id, guest2_id, seating_preference, relationship_strength) 
  WHERE seating_preference IN ('must_separate', 'incompatible');

-- Seating Arrangements Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seating_arrangements_couple_id 
  ON seating_arrangements(couple_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seating_arrangements_active 
  ON seating_arrangements(couple_id, is_active) WHERE is_active = true;

-- Seating Assignments Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seating_assignments_arrangement 
  ON seating_assignments(arrangement_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seating_assignments_guest 
  ON seating_assignments(guest_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seating_assignments_table 
  ON seating_assignments(table_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seating_assignments_lookup 
  ON seating_assignments(arrangement_id, table_id, guest_id);

-- Audit Log Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_relationship_access_log_couple 
  ON relationship_access_log(couple_id, accessed_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_relationship_access_log_time 
  ON relationship_access_log(accessed_at DESC);

-- ==================================================
-- ROW LEVEL SECURITY POLICIES
-- ==================================================

-- Enable RLS on all tables
ALTER TABLE reception_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE seating_arrangements ENABLE ROW LEVEL SECURITY;
ALTER TABLE seating_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE seating_optimization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_access_log ENABLE ROW LEVEL SECURITY;

-- Reception Tables Policies
CREATE POLICY "Couples can manage their reception tables" ON reception_tables
  FOR ALL USING (couple_id = auth.uid()::uuid);

-- Guest Relationships Policies  
CREATE POLICY "Couples can manage guest relationships" ON guest_relationships
  FOR ALL USING (created_by = auth.uid()::uuid);

CREATE POLICY "Couples can view relationships involving their guests" ON guest_relationships
  FOR SELECT USING (
    guest1_id IN (
      SELECT id FROM guests WHERE couple_id = auth.uid()::uuid
    ) OR 
    guest2_id IN (
      SELECT id FROM guests WHERE couple_id = auth.uid()::uuid
    )
  );

-- Seating Arrangements Policies
CREATE POLICY "Couples can manage their seating arrangements" ON seating_arrangements
  FOR ALL USING (couple_id = auth.uid()::uuid);

-- Seating Assignments Policies
CREATE POLICY "Couples can manage seating assignments" ON seating_assignments
  FOR ALL USING (
    arrangement_id IN (
      SELECT id FROM seating_arrangements WHERE couple_id = auth.uid()::uuid
    )
  );

-- Optimization Rules Policies
CREATE POLICY "Couples can manage their optimization rules" ON seating_optimization_rules
  FOR ALL USING (couple_id = auth.uid()::uuid);

-- Audit Log Policies
CREATE POLICY "Couples can view their audit logs" ON relationship_access_log
  FOR SELECT USING (couple_id = auth.uid()::uuid);

-- ==================================================
-- TRIGGER FUNCTIONS
-- ==================================================

-- Function to ensure only one active arrangement per couple
CREATE OR REPLACE FUNCTION ensure_single_active_arrangement()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this arrangement to active, deactivate all others
  IF NEW.is_active = true AND OLD.is_active = false THEN
    UPDATE seating_arrangements 
    SET is_active = false, updated_at = NOW()
    WHERE couple_id = NEW.couple_id 
      AND id != NEW.id 
      AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_active_arrangement
  BEFORE UPDATE ON seating_arrangements
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_arrangement();

-- Function to automatically create bidirectional relationships
CREATE OR REPLACE FUNCTION create_bidirectional_relationship()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure guest1_id < guest2_id
  IF NEW.guest1_id > NEW.guest2_id THEN
    -- Swap the IDs
    NEW := (
      NEW.id, NEW.guest2_id, NEW.guest1_id, NEW.relationship_type,
      NEW.seating_preference, NEW.relationship_strength, NEW.notes,
      NEW.created_by, NEW.created_at, NEW.updated_at
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bidirectional_relationship
  BEFORE INSERT OR UPDATE ON guest_relationships
  FOR EACH ROW
  EXECUTE FUNCTION create_bidirectional_relationship();

-- Function to update table updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER trigger_update_reception_tables_updated_at
  BEFORE UPDATE ON reception_tables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_guest_relationships_updated_at
  BEFORE UPDATE ON guest_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_seating_arrangements_updated_at
  BEFORE UPDATE ON seating_arrangements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_seating_assignments_updated_at
  BEFORE UPDATE ON seating_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==================================================
-- SEATING OPTIMIZATION FUNCTIONS
-- ==================================================

-- Calculate seating arrangement score
CREATE OR REPLACE FUNCTION calculate_seating_score(p_arrangement_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_total_score DECIMAL(10,2) := 0;
  v_relationship RECORD;
  v_weight_multiplier DECIMAL(5,2);
BEGIN
  -- Loop through all relationships for guests in this arrangement
  FOR v_relationship IN 
    SELECT 
      gr.seating_preference,
      gr.relationship_strength,
      gr.relationship_type,
      CASE 
        WHEN sa1.table_id = sa2.table_id THEN 'same_table'
        ELSE 'different_table'
      END as seating_status
    FROM guest_relationships gr
    JOIN seating_assignments sa1 ON gr.guest1_id = sa1.guest_id
    JOIN seating_assignments sa2 ON gr.guest2_id = sa2.guest_id
    WHERE sa1.arrangement_id = p_arrangement_id 
      AND sa2.arrangement_id = p_arrangement_id
  LOOP
    -- Weight multiplier based on relationship strength (1-5)
    v_weight_multiplier := v_relationship.relationship_strength * 0.2;
    
    -- Calculate score based on preference vs actual seating
    CASE v_relationship.seating_preference
      WHEN 'must_sit_together' THEN
        IF v_relationship.seating_status = 'same_table' THEN
          v_total_score := v_total_score + (50 * v_weight_multiplier);
        ELSE
          v_total_score := v_total_score - (100 * v_weight_multiplier);
        END IF;
      WHEN 'prefer_together' THEN
        IF v_relationship.seating_status = 'same_table' THEN
          v_total_score := v_total_score + (25 * v_weight_multiplier);
        ELSE
          v_total_score := v_total_score - (10 * v_weight_multiplier);
        END IF;
      WHEN 'must_separate' THEN
        IF v_relationship.seating_status = 'different_table' THEN
          v_total_score := v_total_score + (40 * v_weight_multiplier);
        ELSE
          v_total_score := v_total_score - (80 * v_weight_multiplier);
        END IF;
      WHEN 'prefer_apart' THEN
        IF v_relationship.seating_status = 'different_table' THEN
          v_total_score := v_total_score + (15 * v_weight_multiplier);
        ELSE
          v_total_score := v_total_score - (5 * v_weight_multiplier);
        END IF;
      WHEN 'incompatible' THEN
        IF v_relationship.seating_status = 'different_table' THEN
          v_total_score := v_total_score + (60 * v_weight_multiplier);
        ELSE
          v_total_score := v_total_score - (120 * v_weight_multiplier);
        END IF;
      -- 'neutral' adds no score
    END CASE;
  END LOOP;
  
  RETURN v_total_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate seating arrangement for conflicts
CREATE OR REPLACE FUNCTION validate_seating_arrangement(
  p_arrangement_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '{"valid": true, "errors": [], "warnings": []}'::jsonb;
  v_conflict RECORD;
  v_capacity_issue RECORD;
  v_errors JSONB := '[]'::jsonb;
  v_warnings JSONB := '[]'::jsonb;
BEGIN
  -- Check for relationship conflicts (must_separate at same table)
  FOR v_conflict IN 
    SELECT 
      g1.first_name || ' ' || g1.last_name as guest1_name,
      g2.first_name || ' ' || g2.last_name as guest2_name,
      rt.name as table_name,
      gr.seating_preference,
      gr.relationship_type
    FROM guest_relationships gr
    JOIN seating_assignments sa1 ON gr.guest1_id = sa1.guest_id
    JOIN seating_assignments sa2 ON gr.guest2_id = sa2.guest_id
    JOIN guests g1 ON gr.guest1_id = g1.id
    JOIN guests g2 ON gr.guest2_id = g2.id
    JOIN reception_tables rt ON sa1.table_id = rt.id
    WHERE sa1.arrangement_id = p_arrangement_id 
      AND sa2.arrangement_id = p_arrangement_id
      AND sa1.table_id = sa2.table_id
      AND gr.seating_preference IN ('must_separate', 'incompatible')
  LOOP
    v_errors := v_errors || jsonb_build_object(
      'type', 'relationship_conflict',
      'severity', 'error',
      'message', v_conflict.guest1_name || ' and ' || v_conflict.guest2_name || 
                ' should not sit together at ' || v_conflict.table_name,
      'relationship_type', v_conflict.relationship_type,
      'preference', v_conflict.seating_preference
    );
  END LOOP;
  
  -- Check for table capacity issues
  FOR v_capacity_issue IN 
    SELECT 
      rt.name as table_name,
      rt.capacity,
      COUNT(sa.guest_id) as assigned_count
    FROM reception_tables rt
    LEFT JOIN seating_assignments sa ON rt.id = sa.table_id AND sa.arrangement_id = p_arrangement_id
    GROUP BY rt.id, rt.name, rt.capacity
    HAVING COUNT(sa.guest_id) > rt.capacity
  LOOP
    v_errors := v_errors || jsonb_build_object(
      'type', 'capacity_exceeded',
      'severity', 'error',
      'message', v_capacity_issue.table_name || ' has ' || 
                v_capacity_issue.assigned_count || ' guests but capacity is ' || 
                v_capacity_issue.capacity,
      'table', v_capacity_issue.table_name,
      'capacity', v_capacity_issue.capacity,
      'assigned', v_capacity_issue.assigned_count
    );
  END LOOP;
  
  -- Update result
  IF jsonb_array_length(v_errors) > 0 THEN
    v_result := jsonb_set(v_result, '{valid}', 'false');
    v_result := jsonb_set(v_result, '{errors}', v_errors);
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get relationship conflicts for optimization
CREATE OR REPLACE FUNCTION get_relationship_conflicts(p_couple_id UUID)
RETURNS TABLE (
  guest1_id UUID,
  guest2_id UUID,
  guest1_name TEXT,
  guest2_name TEXT,
  relationship_type VARCHAR(50),
  seating_preference VARCHAR(30),
  relationship_strength INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gr.guest1_id,
    gr.guest2_id,
    (g1.first_name || ' ' || g1.last_name) as guest1_name,
    (g2.first_name || ' ' || g2.last_name) as guest2_name,
    gr.relationship_type,
    gr.seating_preference,
    gr.relationship_strength
  FROM guest_relationships gr
  JOIN guests g1 ON gr.guest1_id = g1.id
  JOIN guests g2 ON gr.guest2_id = g2.id
  WHERE g1.couple_id = p_couple_id
    AND g2.couple_id = p_couple_id
    AND gr.seating_preference != 'neutral'
  ORDER BY gr.relationship_strength DESC, gr.seating_preference;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================
-- MATERIALIZED VIEW FOR PERFORMANCE
-- ==================================================

-- Optimized view for seating queries with 200+ guests
CREATE MATERIALIZED VIEW IF NOT EXISTS seating_optimization_view AS
SELECT 
  c.id as couple_id,
  g.id as guest_id,
  g.first_name || ' ' || g.last_name as guest_name,
  g.category,
  g.side,
  g.age_group,
  g.rsvp_status,
  -- Aggregate relationship preferences
  array_agg(
    CASE WHEN gr.seating_preference = 'must_sit_together' 
    THEN gr.guest2_id END
  ) FILTER (WHERE gr.seating_preference = 'must_sit_together') as must_sit_together,
  array_agg(
    CASE WHEN gr.seating_preference = 'prefer_together' 
    THEN gr.guest2_id END
  ) FILTER (WHERE gr.seating_preference = 'prefer_together') as prefer_together,
  array_agg(
    CASE WHEN gr.seating_preference IN ('must_separate', 'incompatible') 
    THEN gr.guest2_id END
  ) FILTER (WHERE gr.seating_preference IN ('must_separate', 'incompatible')) as avoid_seating_with
FROM clients c
JOIN guests g ON c.id = g.couple_id
LEFT JOIN guest_relationships gr ON g.id = gr.guest1_id
WHERE g.rsvp_status IN ('attending', 'pending')
GROUP BY c.id, g.id, g.first_name, g.last_name, g.category, g.side, g.age_group, g.rsvp_status;

-- Index the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_seating_optimization_view_guest 
  ON seating_optimization_view(guest_id);
CREATE INDEX IF NOT EXISTS idx_seating_optimization_view_couple 
  ON seating_optimization_view(couple_id);
CREATE INDEX IF NOT EXISTS idx_seating_optimization_view_category 
  ON seating_optimization_view(couple_id, category);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_seating_optimization_view()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY seating_optimization_view;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to refresh view when relevant data changes
CREATE OR REPLACE FUNCTION trigger_refresh_seating_view()
RETURNS TRIGGER AS $$
BEGIN
  -- Use pg_notify to trigger async refresh
  PERFORM pg_notify('refresh_seating_view', '');
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-refresh
CREATE TRIGGER trigger_refresh_on_guest_change
  AFTER INSERT OR UPDATE OR DELETE ON guests
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_seating_view();

CREATE TRIGGER trigger_refresh_on_relationship_change
  AFTER INSERT OR UPDATE OR DELETE ON guest_relationships
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_seating_view();

-- ==================================================
-- SAMPLE DATA FOR TESTING
-- ==================================================

-- Insert default optimization rules
INSERT INTO seating_optimization_rules (couple_id, rule_name, rule_type, rule_config, weight) 
SELECT 
  id as couple_id,
  'Family Grouping',
  'family_grouping',
  '{"prefer_family_together": true, "max_family_per_table": 8}'::jsonb,
  2.0
FROM clients
WHERE NOT EXISTS (
  SELECT 1 FROM seating_optimization_rules 
  WHERE couple_id = clients.id AND rule_name = 'Family Grouping'
);

-- ==================================================
-- PERFORMANCE MONITORING
-- ==================================================

-- View to monitor seating query performance
CREATE OR REPLACE VIEW seating_performance_stats AS
SELECT 
  schemaname,
  tablename,
  attname as column_name,
  n_distinct,
  most_common_vals,
  most_common_freqs,
  correlation
FROM pg_stats 
WHERE schemaname = 'public' 
  AND tablename IN ('reception_tables', 'guest_relationships', 'seating_arrangements', 'seating_assignments')
ORDER BY tablename, attname;

-- Migration complete
-- Tables created: reception_tables, guest_relationships, seating_arrangements, seating_assignments, seating_optimization_rules, relationship_access_log
-- Indexes created: 13 optimized indexes for performance
-- Functions created: 6 stored functions for seating logic
-- Triggers created: 8 triggers for data integrity
-- Policies created: 7 RLS policies for security
-- Views created: 2 views for performance monitoring and optimization