-- =====================================================
-- JOURNEY CANVAS ENHANCEMENT
-- =====================================================
-- WS-043: Journey Canvas Technical Implementation
-- Adds canvas-specific tables and enhances existing journey system
-- Created: 2025-08-21
-- =====================================================

-- Add canvas-specific columns to existing journeys table
ALTER TABLE journeys 
ADD COLUMN IF NOT EXISTS canvas_position JSONB DEFAULT '{"x": 0, "y": 0}'::jsonb,
ADD COLUMN IF NOT EXISTS canvas_zoom DECIMAL(3,2) DEFAULT 1.0;

-- Create journey_connections table for canvas node connections
CREATE TABLE IF NOT EXISTS journey_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE,
  source_node_id UUID REFERENCES journey_nodes(id) ON DELETE CASCADE,
  target_node_id UUID REFERENCES journey_nodes(id) ON DELETE CASCADE,
  connection_type TEXT DEFAULT 'default',
  condition_config JSONB DEFAULT '{}',
  style_config JSONB DEFAULT '{}', -- Canvas-specific styling
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create journey_executions table for tracking (alternative name for instances)
CREATE TABLE IF NOT EXISTS journey_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  current_node_id UUID REFERENCES journey_nodes(id),
  status TEXT CHECK (status IN ('active', 'completed', 'paused', 'failed')) DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Create journey_scheduled_actions table for scheduled tasks
CREATE TABLE IF NOT EXISTS journey_scheduled_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES journey_executions(id) ON DELETE CASCADE,
  node_id UUID REFERENCES journey_nodes(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'email', 'sms', 'form', 'reminder'
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('pending', 'executed', 'failed', 'cancelled')) DEFAULT 'pending',
  attempt_count INTEGER DEFAULT 0,
  result JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update journey_nodes to include canvas-specific fields
ALTER TABLE journey_nodes 
ADD COLUMN IF NOT EXISTS canvas_position JSONB DEFAULT '{"x": 0, "y": 0}'::jsonb,
ADD COLUMN IF NOT EXISTS canvas_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS timeline_config JSONB DEFAULT '{}'; -- For timeline anchor configuration

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_journey_connections_journey_id ON journey_connections(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_connections_source_node ON journey_connections(source_node_id);
CREATE INDEX IF NOT EXISTS idx_journey_connections_target_node ON journey_connections(target_node_id);

CREATE INDEX IF NOT EXISTS idx_journey_executions_journey_id ON journey_executions(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_executions_client_id ON journey_executions(client_id);
CREATE INDEX IF NOT EXISTS idx_journey_executions_status ON journey_executions(status);

CREATE INDEX IF NOT EXISTS idx_journey_scheduled_actions_scheduled_for ON journey_scheduled_actions(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_journey_scheduled_actions_status ON journey_scheduled_actions(status);
CREATE INDEX IF NOT EXISTS idx_journey_scheduled_actions_execution_id ON journey_scheduled_actions(execution_id);

-- Enable RLS on new tables
ALTER TABLE journey_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_scheduled_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for journey_connections
CREATE POLICY "Users can view connections for their journeys"
  ON journey_connections FOR SELECT
  USING (
    journey_id IN (
      SELECT id FROM journeys 
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles 
        WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can manage connections for their journeys"
  ON journey_connections FOR ALL
  USING (
    journey_id IN (
      SELECT id FROM journeys 
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles 
        WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

-- RLS Policies for journey_executions
CREATE POLICY "Users can view executions for their journeys"
  ON journey_executions FOR SELECT
  USING (
    journey_id IN (
      SELECT id FROM journeys 
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles 
        WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can manage executions for their journeys"
  ON journey_executions FOR ALL
  USING (
    journey_id IN (
      SELECT id FROM journeys 
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles 
        WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

-- RLS Policies for journey_scheduled_actions
CREATE POLICY "Users can view scheduled actions for their executions"
  ON journey_scheduled_actions FOR SELECT
  USING (
    execution_id IN (
      SELECT je.id FROM journey_executions je
      JOIN journeys j ON j.id = je.journey_id
      WHERE j.organization_id = (
        SELECT organization_id FROM user_profiles 
        WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "System can manage scheduled actions"
  ON journey_scheduled_actions FOR ALL
  WITH CHECK (true); -- System processes scheduled actions

-- Create function to validate journey canvas
CREATE OR REPLACE FUNCTION validate_journey_canvas(
  p_journey_id UUID,
  p_nodes JSONB,
  p_connections JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_errors TEXT[] := '{}';
  v_warnings TEXT[] := '{}';
  v_start_nodes INTEGER;
  v_end_nodes INTEGER;
  v_orphaned_nodes INTEGER;
BEGIN
  -- Check for start nodes
  SELECT COUNT(*) INTO v_start_nodes
  FROM jsonb_array_elements(p_nodes) AS node
  WHERE node->>'type' = 'start';
  
  IF v_start_nodes = 0 THEN
    v_errors := array_append(v_errors, 'Journey must have at least one start node');
  END IF;
  
  IF v_start_nodes > 1 THEN
    v_warnings := array_append(v_warnings, 'Multiple start nodes detected');
  END IF;
  
  -- Check for end nodes
  SELECT COUNT(*) INTO v_end_nodes
  FROM jsonb_array_elements(p_nodes) AS node
  WHERE node->>'type' = 'end';
  
  IF v_end_nodes = 0 THEN
    v_warnings := array_append(v_warnings, 'Journey should have at least one end node');
  END IF;
  
  -- Return validation result
  RETURN jsonb_build_object(
    'isValid', array_length(v_errors, 1) IS NULL OR array_length(v_errors, 1) = 0,
    'errors', to_jsonb(v_errors),
    'warnings', to_jsonb(v_warnings)
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to save canvas state
CREATE OR REPLACE FUNCTION save_journey_canvas(
  p_journey_id UUID,
  p_canvas_data JSONB,
  p_nodes JSONB,
  p_connections JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  v_node JSONB;
  v_connection JSONB;
BEGIN
  -- Update journey canvas data
  UPDATE journeys 
  SET 
    canvas_data = p_canvas_data,
    updated_at = NOW()
  WHERE id = p_journey_id;
  
  -- Clear existing nodes and connections
  DELETE FROM journey_connections WHERE journey_id = p_journey_id;
  DELETE FROM journey_nodes WHERE journey_id = p_journey_id;
  
  -- Insert nodes
  FOR v_node IN SELECT * FROM jsonb_array_elements(p_nodes)
  LOOP
    INSERT INTO journey_nodes (
      journey_id,
      node_id,
      type,
      name,
      canvas_position,
      config,
      timeline_config
    ) VALUES (
      p_journey_id,
      v_node->>'id',
      (v_node->>'type')::journey_node_type,
      COALESCE(v_node->>'name', v_node->>'label', 'Untitled Node'),
      COALESCE(v_node->'position', '{"x": 0, "y": 0}'::jsonb),
      COALESCE(v_node->'data', '{}'::jsonb),
      COALESCE(v_node->'timelineConfig', '{}'::jsonb)
    );
  END LOOP;
  
  -- Insert connections
  FOR v_connection IN SELECT * FROM jsonb_array_elements(p_connections)
  LOOP
    INSERT INTO journey_connections (
      journey_id,
      source_node_id,
      target_node_id,
      connection_type,
      condition_config
    ) VALUES (
      p_journey_id,
      (SELECT id FROM journey_nodes WHERE journey_id = p_journey_id AND node_id = (v_connection->>'source')),
      (SELECT id FROM journey_nodes WHERE journey_id = p_journey_id AND node_id = (v_connection->>'target')),
      COALESCE(v_connection->>'type', 'default'),
      COALESCE(v_connection->'conditionConfig', '{}'::jsonb)
    );
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON journey_connections TO authenticated;
GRANT ALL ON journey_executions TO authenticated;
GRANT ALL ON journey_scheduled_actions TO authenticated;
GRANT EXECUTE ON FUNCTION validate_journey_canvas(UUID, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION save_journey_canvas(UUID, JSONB, JSONB, JSONB) TO authenticated;

-- Comments
COMMENT ON TABLE journey_connections IS 'Canvas connections between journey nodes for WS-043';
COMMENT ON TABLE journey_executions IS 'Journey execution tracking for canvas workflows';
COMMENT ON TABLE journey_scheduled_actions IS 'Scheduled actions for timeline-based nodes';
COMMENT ON FUNCTION validate_journey_canvas IS 'Validates journey canvas structure and connections';
COMMENT ON FUNCTION save_journey_canvas IS 'Saves complete canvas state including nodes and connections';

-- =====================================================
-- END OF MIGRATION
-- =====================================================