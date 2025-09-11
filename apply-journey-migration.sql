-- Journey Execution System (Simplified for initial setup)

-- Drop existing objects
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

-- Create enums
CREATE TYPE journey_status AS ENUM ('draft', 'active', 'paused', 'archived', 'deleted');
CREATE TYPE journey_instance_state AS ENUM ('active', 'paused', 'completed', 'failed', 'cancelled');
CREATE TYPE journey_node_type AS ENUM ('start', 'end', 'action', 'condition', 'split', 'merge', 'wait', 'time_trigger', 'event_trigger');
CREATE TYPE journey_action_type AS ENUM ('send_email', 'send_sms', 'send_form', 'form_reminder', 'create_task', 'assign_task', 'webhook_call', 'update_field', 'add_tag', 'remove_tag', 'internal_note');
CREATE TYPE journey_node_status AS ENUM ('pending', 'scheduled', 'executing', 'completed', 'failed', 'skipped', 'cancelled');

-- Journey Templates
CREATE TABLE journey_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  vendor_type VARCHAR(100),
  is_public BOOLEAN DEFAULT false,
  template_data JSONB NOT NULL,
  preview_image_url TEXT,
  usage_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  tags TEXT[],
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Main Journeys Table
CREATE TABLE journeys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES journey_templates(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status journey_status DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  canvas_data JSONB NOT NULL,
  settings JSONB DEFAULT '{"timezone": "America/New_York", "businessHours": {"enabled": true, "start": "09:00", "end": "17:00", "days": ["mon", "tue", "wed", "thu", "fri"]}, "maxInstancesPerClient": 1, "allowReentry": false}'::jsonb,
  triggers JSONB DEFAULT '[]'::jsonb,
  stats JSONB DEFAULT '{"totalInstances": 0, "activeInstances": 0, "completedInstances": 0, "failedInstances": 0}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  last_modified_by UUID REFERENCES user_profiles(id),
  published_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE
);

-- Journey Nodes
CREATE TABLE journey_nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE,
  node_id VARCHAR(100) NOT NULL,
  node_type journey_node_type NOT NULL,
  action_type journey_action_type,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  position JSONB NOT NULL,
  config JSONB NOT NULL,
  validation_rules JSONB DEFAULT '[]'::jsonb,
  error_handling JSONB DEFAULT '{"retryCount": 3, "retryDelay": 3600, "onError": "continue"}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(journey_id, node_id)
);

-- Journey Instances
CREATE TABLE journey_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  state journey_instance_state DEFAULT 'active',
  current_node_id VARCHAR(100),
  context JSONB DEFAULT '{}'::jsonb,
  variables JSONB DEFAULT '{}'::jsonb,
  error_log JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paused_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_resume_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Journey Node Executions
CREATE TABLE journey_node_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID REFERENCES journey_instances(id) ON DELETE CASCADE,
  node_id VARCHAR(100) NOT NULL,
  status journey_node_status DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  input_data JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_journeys_vendor ON journeys(vendor_id);
CREATE INDEX idx_journeys_organization ON journeys(organization_id);
CREATE INDEX idx_journeys_status ON journeys(status);
CREATE INDEX idx_journey_nodes_journey ON journey_nodes(journey_id);
CREATE INDEX idx_journey_instances_journey ON journey_instances(journey_id);
CREATE INDEX idx_journey_instances_client ON journey_instances(client_id);
CREATE INDEX idx_journey_instances_state ON journey_instances(state);
CREATE INDEX idx_journey_node_executions_instance ON journey_node_executions(instance_id);
CREATE INDEX idx_journey_node_executions_status ON journey_node_executions(status);

-- Enable RLS
ALTER TABLE journey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_node_executions ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "journey_templates_public_read" ON journey_templates FOR SELECT USING (is_public = true);
CREATE POLICY "journeys_org_access" ON journeys FOR ALL USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "journey_nodes_org_access" ON journey_nodes FOR ALL USING (journey_id IN (SELECT id FROM journeys WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = (SELECT auth.uid()))));
CREATE POLICY "journey_instances_org_access" ON journey_instances FOR ALL USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "journey_node_executions_org_access" ON journey_node_executions FOR ALL USING (instance_id IN (SELECT id FROM journey_instances WHERE organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = (SELECT auth.uid()))));