-- =====================================================
-- JOURNEY EXECUTION SYSTEM
-- =====================================================
-- Complete journey automation system with state management,
-- scheduling, and execution tracking
-- Created: 2025-01-21
-- =====================================================

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS journey_node_executions CASCADE;
DROP TABLE IF EXISTS journey_instances CASCADE;
DROP TABLE IF EXISTS journey_nodes CASCADE;
DROP TABLE IF EXISTS journeys CASCADE;
DROP TABLE IF EXISTS journey_templates CASCADE;
DROP TYPE IF EXISTS journey_status CASCADE;
DROP TYPE IF EXISTS journey_instance_state CASCADE;
DROP TYPE IF EXISTS journey_node_type CASCADE;
DROP TYPE IF EXISTS journey_action_type CASCADE;
DROP TYPE IF EXISTS journey_node_status CASCADE;

-- =====================================================
-- ENUMS
-- =====================================================

-- Journey status enum
CREATE TYPE journey_status AS ENUM (
  'draft',
  'active',
  'paused',
  'archived',
  'deleted'
);

-- Journey instance state enum
CREATE TYPE journey_instance_state AS ENUM (
  'active',
  'paused',
  'completed',
  'failed',
  'cancelled'
);

-- Journey node types
CREATE TYPE journey_node_type AS ENUM (
  'start',
  'end',
  'action',
  'condition',
  'split',
  'merge',
  'wait',
  'time_trigger',
  'event_trigger'
);

-- Journey action types
CREATE TYPE journey_action_type AS ENUM (
  'send_email',
  'send_sms',
  'send_form',
  'form_reminder',
  'create_task',
  'assign_task',
  'webhook_call',
  'update_field',
  'add_tag',
  'remove_tag',
  'internal_note'
);

-- Journey node execution status
CREATE TYPE journey_node_status AS ENUM (
  'pending',
  'scheduled',
  'executing',
  'completed',
  'failed',
  'skipped',
  'cancelled'
);

-- =====================================================
-- JOURNEY TEMPLATES TABLE
-- =====================================================
CREATE TABLE journey_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  vendor_type VARCHAR(100),
  is_public BOOLEAN DEFAULT false,
  template_data JSONB NOT NULL, -- Full journey definition
  preview_image_url TEXT,
  usage_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  tags TEXT[],
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- JOURNEYS TABLE (Main Journey Definitions)
-- =====================================================
CREATE TABLE journeys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES journey_templates(id),
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status journey_status DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  
  -- Canvas Data (React Flow state)
  canvas_data JSONB NOT NULL, -- React Flow nodes, edges, viewport
  
  -- Configuration
  settings JSONB DEFAULT '{
    "timezone": "America/New_York",
    "businessHours": {
      "enabled": true,
      "start": "09:00",
      "end": "17:00",
      "days": ["mon", "tue", "wed", "thu", "fri"]
    },
    "maxInstancesPerClient": 1,
    "allowReentry": false,
    "entryConditions": [],
    "exitConditions": []
  }'::jsonb,
  
  -- Triggers
  triggers JSONB DEFAULT '[]'::jsonb, -- Array of trigger configurations
  
  -- Statistics
  stats JSONB DEFAULT '{
    "totalInstances": 0,
    "activeInstances": 0,
    "completedInstances": 0,
    "failedInstances": 0,
    "averageCompletionTime": 0,
    "conversionRate": 0
  }'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activated_at TIMESTAMP WITH TIME ZONE,
  deactivated_at TIMESTAMP WITH TIME ZONE,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- JOURNEY NODES TABLE (Individual Journey Steps)
-- =====================================================
CREATE TABLE journey_nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE,
  node_id VARCHAR(255) NOT NULL, -- React Flow node ID
  
  -- Node Definition
  type journey_node_type NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Position in canvas
  position_x DECIMAL(10,2),
  position_y DECIMAL(10,2),
  
  -- Node Configuration
  config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Node-specific configuration
  
  -- Action Details (for action nodes)
  action_type journey_action_type,
  action_config JSONB DEFAULT '{}'::jsonb,
  
  -- Condition Details (for condition nodes)
  conditions JSONB DEFAULT '[]'::jsonb,
  
  -- Wait/Delay Details
  delay_value INTEGER,
  delay_unit VARCHAR(20), -- minutes, hours, days, weeks
  
  -- Connections
  next_nodes TEXT[], -- Array of connected node IDs
  
  -- Statistics
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  average_duration_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(journey_id, node_id)
);

-- =====================================================
-- JOURNEY INSTANCES TABLE (Active Journey Executions)
-- =====================================================
CREATE TABLE journey_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- State Management
  state journey_instance_state DEFAULT 'active',
  current_node_id VARCHAR(255),
  current_step INTEGER DEFAULT 0,
  
  -- Runtime Variables
  variables JSONB DEFAULT '{}'::jsonb, -- Runtime data and context
  
  -- Entry Information
  entry_source VARCHAR(100), -- manual, trigger, api, import
  entry_trigger VARCHAR(255), -- Specific trigger that started
  entry_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Execution Control
  next_execution_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Path Tracking
  execution_path TEXT[], -- Array of executed node IDs
  branching_history JSONB DEFAULT '[]'::jsonb, -- Decision points
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paused_at TIMESTAMP WITH TIME ZONE,
  resumed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  
  -- Error Tracking
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  
  -- Performance Metrics
  total_duration_ms INTEGER,
  active_duration_ms INTEGER,
  
  -- Metadata
  tags TEXT[],
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- JOURNEY NODE EXECUTIONS TABLE (Execution History)
-- =====================================================
CREATE TABLE journey_node_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID REFERENCES journey_instances(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE,
  node_id VARCHAR(255) NOT NULL,
  
  -- Execution Details
  status journey_node_status NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  
  -- Timing
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  
  -- Input/Output
  input_data JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  
  -- Action Results (for action nodes)
  action_type journey_action_type,
  action_result JSONB DEFAULT '{}'::jsonb,
  
  -- Condition Results (for condition nodes)
  condition_evaluated BOOLEAN,
  condition_result BOOLEAN,
  condition_details JSONB DEFAULT '{}'::jsonb,
  
  -- Error Information
  error_message TEXT,
  error_details JSONB DEFAULT '{}'::jsonb,
  
  -- External References
  external_id VARCHAR(255), -- Email ID, SMS ID, Task ID, etc.
  external_type VARCHAR(100), -- email, sms, task, webhook, etc.
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- JOURNEY EVENTS TABLE (Event Tracking)
-- =====================================================
CREATE TABLE journey_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES journey_instances(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Event Details
  event_type VARCHAR(100) NOT NULL, -- email_opened, link_clicked, form_submitted, etc.
  event_source VARCHAR(100), -- system, webhook, api, manual
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Processing
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  processing_result JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- JOURNEY SCHEDULES TABLE (Scheduled Executions)
-- =====================================================
CREATE TABLE journey_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID REFERENCES journey_instances(id) ON DELETE CASCADE,
  node_id VARCHAR(255) NOT NULL,
  
  -- Schedule Details
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  schedule_type VARCHAR(50), -- delay, time_based, recurring
  
  -- Processing Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Retry Information
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  
  -- Error Tracking
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Journeys indexes
CREATE INDEX idx_journeys_vendor_id ON journeys(vendor_id);
CREATE INDEX idx_journeys_organization_id ON journeys(organization_id);
CREATE INDEX idx_journeys_status ON journeys(status) WHERE status = 'active';
CREATE INDEX idx_journeys_activated_at ON journeys(activated_at);
CREATE INDEX idx_journeys_tags ON journeys USING GIN(tags);

-- Journey nodes indexes
CREATE INDEX idx_journey_nodes_journey_id ON journey_nodes(journey_id);
CREATE INDEX idx_journey_nodes_type ON journey_nodes(type);
CREATE INDEX idx_journey_nodes_action_type ON journey_nodes(action_type);

-- Journey instances indexes
CREATE INDEX idx_journey_instances_journey_id ON journey_instances(journey_id);
CREATE INDEX idx_journey_instances_client_id ON journey_instances(client_id);
CREATE INDEX idx_journey_instances_vendor_id ON journey_instances(vendor_id);
CREATE INDEX idx_journey_instances_state ON journey_instances(state);
CREATE INDEX idx_journey_instances_next_execution ON journey_instances(next_execution_at) 
  WHERE state = 'active' AND next_execution_at IS NOT NULL;
CREATE INDEX idx_journey_instances_started_at ON journey_instances(started_at);

-- Journey node executions indexes
CREATE INDEX idx_node_executions_instance_id ON journey_node_executions(instance_id);
CREATE INDEX idx_node_executions_journey_id ON journey_node_executions(journey_id);
CREATE INDEX idx_node_executions_status ON journey_node_executions(status);
CREATE INDEX idx_node_executions_scheduled_at ON journey_node_executions(scheduled_at);
CREATE INDEX idx_node_executions_external_id ON journey_node_executions(external_id);

-- Journey events indexes
CREATE INDEX idx_journey_events_journey_id ON journey_events(journey_id);
CREATE INDEX idx_journey_events_instance_id ON journey_events(instance_id);
CREATE INDEX idx_journey_events_client_id ON journey_events(client_id);
CREATE INDEX idx_journey_events_type ON journey_events(event_type);
CREATE INDEX idx_journey_events_processed ON journey_events(processed, occurred_at);

-- Journey schedules indexes
CREATE INDEX idx_journey_schedules_instance_id ON journey_schedules(instance_id);
CREATE INDEX idx_journey_schedules_scheduled_for ON journey_schedules(scheduled_for) 
  WHERE status = 'pending';
CREATE INDEX idx_journey_schedules_status ON journey_schedules(status);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE journey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_node_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_schedules ENABLE ROW LEVEL SECURITY;

-- Journey Templates Policies
CREATE POLICY "Public templates are viewable by all"
  ON journey_templates FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view their organization's templates"
  ON journey_templates FOR SELECT
  USING (
    created_by IN (
      SELECT id FROM user_profiles 
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their own templates"
  ON journey_templates FOR ALL
  USING (created_by = auth.uid());

-- Journeys Policies
CREATE POLICY "Users can view journeys in their organization"
  ON journeys FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage journeys in their organization"
  ON journeys FOR ALL
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Journey Nodes Policies (inherit from journeys)
CREATE POLICY "Users can view nodes for their journeys"
  ON journey_nodes FOR SELECT
  USING (
    journey_id IN (
      SELECT id FROM journeys 
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage nodes for their journeys"
  ON journey_nodes FOR ALL
  USING (
    journey_id IN (
      SELECT id FROM journeys 
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Journey Instances Policies
CREATE POLICY "Users can view instances for their vendors"
  ON journey_instances FOR SELECT
  USING (
    vendor_id IN (
      SELECT id FROM vendors 
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage instances for their vendors"
  ON journey_instances FOR ALL
  USING (
    vendor_id IN (
      SELECT id FROM vendors 
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Journey Node Executions Policies
CREATE POLICY "Users can view executions for their journeys"
  ON journey_node_executions FOR SELECT
  USING (
    journey_id IN (
      SELECT id FROM journeys 
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Journey Events Policies
CREATE POLICY "Users can view events for their journeys"
  ON journey_events FOR SELECT
  USING (
    journey_id IN (
      SELECT id FROM journeys 
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can create journey events"
  ON journey_events FOR INSERT
  WITH CHECK (true); -- Events can be created by webhooks/system

-- Journey Schedules Policies
CREATE POLICY "Users can view schedules for their instances"
  ON journey_schedules FOR SELECT
  USING (
    instance_id IN (
      SELECT id FROM journey_instances 
      WHERE vendor_id IN (
        SELECT id FROM vendors 
        WHERE organization_id = (
          SELECT organization_id FROM user_profiles 
          WHERE user_id = auth.uid()
        )
      )
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update journey statistics
CREATE OR REPLACE FUNCTION update_journey_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE journeys
  SET stats = jsonb_build_object(
    'totalInstances', (SELECT COUNT(*) FROM journey_instances WHERE journey_id = NEW.journey_id),
    'activeInstances', (SELECT COUNT(*) FROM journey_instances WHERE journey_id = NEW.journey_id AND state = 'active'),
    'completedInstances', (SELECT COUNT(*) FROM journey_instances WHERE journey_id = NEW.journey_id AND state = 'completed'),
    'failedInstances', (SELECT COUNT(*) FROM journey_instances WHERE journey_id = NEW.journey_id AND state = 'failed'),
    'averageCompletionTime', (
      SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at)))
      FROM journey_instances 
      WHERE journey_id = NEW.journey_id AND completed_at IS NOT NULL
    ),
    'conversionRate', (
      SELECT 
        CASE 
          WHEN COUNT(*) > 0 THEN 
            (COUNT(*) FILTER (WHERE state = 'completed'))::float / COUNT(*)::float * 100
          ELSE 0
        END
      FROM journey_instances 
      WHERE journey_id = NEW.journey_id
    )
  ),
  last_executed_at = NOW()
  WHERE id = NEW.journey_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update journey stats
CREATE TRIGGER update_journey_stats_trigger
AFTER INSERT OR UPDATE ON journey_instances
FOR EACH ROW
EXECUTE FUNCTION update_journey_stats();

-- Function to update node execution statistics
CREATE OR REPLACE FUNCTION update_node_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE journey_nodes
  SET 
    execution_count = execution_count + 1,
    success_count = success_count + CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
    failure_count = failure_count + CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
    average_duration_ms = (
      SELECT AVG(duration_ms)
      FROM journey_node_executions
      WHERE journey_id = NEW.journey_id AND node_id = NEW.node_id
    )
  WHERE journey_id = NEW.journey_id AND node_id = NEW.node_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update node stats
CREATE TRIGGER update_node_stats_trigger
AFTER INSERT ON journey_node_executions
FOR EACH ROW
EXECUTE FUNCTION update_node_stats();

-- Function to get next scheduled executions
CREATE OR REPLACE FUNCTION get_pending_journey_executions(
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  instance_id UUID,
  journey_id UUID,
  vendor_id UUID,
  client_id UUID,
  current_node_id VARCHAR(255),
  variables JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ji.id,
    ji.journey_id,
    ji.vendor_id,
    ji.client_id,
    ji.current_node_id,
    ji.variables
  FROM journey_instances ji
  WHERE ji.state = 'active'
    AND ji.next_execution_at IS NOT NULL
    AND ji.next_execution_at <= NOW()
  ORDER BY ji.next_execution_at
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to process scheduled journey tasks
CREATE OR REPLACE FUNCTION process_scheduled_journeys()
RETURNS INTEGER AS $$
DECLARE
  v_processed_count INTEGER := 0;
  v_schedule RECORD;
BEGIN
  -- Process pending schedules
  FOR v_schedule IN 
    SELECT * FROM journey_schedules
    WHERE status = 'pending' 
      AND scheduled_for <= NOW()
    ORDER BY scheduled_for
    LIMIT 100
  LOOP
    -- Mark as processing
    UPDATE journey_schedules 
    SET status = 'processing', processed_at = NOW()
    WHERE id = v_schedule.id;
    
    -- Update instance to trigger execution
    UPDATE journey_instances
    SET next_execution_at = NOW()
    WHERE id = v_schedule.instance_id;
    
    v_processed_count := v_processed_count + 1;
  END LOOP;
  
  RETURN v_processed_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DATA - Sample Journey Templates
-- =====================================================

INSERT INTO journey_templates (name, description, category, vendor_type, is_public, template_data) VALUES
(
  'Photography Engagement Journey',
  'Complete workflow for wedding photographers from booking to delivery',
  'Photography',
  'photographer',
  true,
  '{
    "nodes": [
      {"id": "start", "type": "start", "name": "Journey Start"},
      {"id": "welcome", "type": "action", "name": "Send Welcome Email", "actionType": "send_email"},
      {"id": "contract", "type": "action", "name": "Send Contract", "actionType": "send_form"},
      {"id": "wait1", "type": "wait", "name": "Wait 3 Days", "delay": 3, "unit": "days"},
      {"id": "reminder", "type": "action", "name": "Contract Reminder", "actionType": "send_email"},
      {"id": "end", "type": "end", "name": "Journey Complete"}
    ],
    "edges": [
      {"source": "start", "target": "welcome"},
      {"source": "welcome", "target": "contract"},
      {"source": "contract", "target": "wait1"},
      {"source": "wait1", "target": "reminder"},
      {"source": "reminder", "target": "end"}
    ]
  }'::jsonb
),
(
  'DJ/Band Booking Journey',
  'Music vendor workflow from inquiry to event',
  'Music',
  'dj_band',
  true,
  '{
    "nodes": [
      {"id": "start", "type": "start", "name": "Journey Start"},
      {"id": "welcome", "type": "action", "name": "Welcome Message", "actionType": "send_sms"},
      {"id": "preferences", "type": "action", "name": "Music Preferences Form", "actionType": "send_form"},
      {"id": "timeline", "type": "action", "name": "Timeline Planning", "actionType": "send_email"},
      {"id": "end", "type": "end", "name": "Journey Complete"}
    ],
    "edges": [
      {"source": "start", "target": "welcome"},
      {"source": "welcome", "target": "preferences"},
      {"source": "preferences", "target": "timeline"},
      {"source": "timeline", "target": "end"}
    ]
  }'::jsonb
);

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE journeys IS 'Main journey definitions with workflow automation';
COMMENT ON TABLE journey_instances IS 'Active journey executions for individual clients';
COMMENT ON TABLE journey_node_executions IS 'Detailed execution history for each node';
COMMENT ON TABLE journey_events IS 'Event tracking for journey triggers and interactions';
COMMENT ON TABLE journey_schedules IS 'Scheduled future executions for time-based nodes';

-- =====================================================
-- END OF MIGRATION
-- =====================================================