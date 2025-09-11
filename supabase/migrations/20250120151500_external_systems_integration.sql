-- Migration: External Systems Integration
-- Add tables for tracking external product management tool integrations

-- Feature request external issues table
CREATE TABLE feature_request_external_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  external_system TEXT NOT NULL CHECK (external_system IN ('linear', 'github', 'jira')),
  external_id TEXT NOT NULL,
  external_url TEXT NOT NULL,
  status TEXT NOT NULL,
  assignee TEXT,
  labels TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(feature_request_id, external_system, external_id)
);

-- External system configurations
CREATE TABLE external_system_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  system_type TEXT NOT NULL CHECK (system_type IN ('linear', 'github', 'jira', 'slack')),
  config JSONB NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, system_type)
);

-- Sync history for tracking integration performance
CREATE TABLE external_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  external_system TEXT NOT NULL,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('create', 'update', 'status_sync')),
  success BOOLEAN NOT NULL,
  error_message TEXT,
  sync_duration_ms INTEGER,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook delivery logs
CREATE TABLE external_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system TEXT NOT NULL CHECK (source_system IN ('linear', 'github', 'jira')),
  webhook_id TEXT,
  payload JSONB NOT NULL,
  signature TEXT,
  processed BOOLEAN DEFAULT false,
  success BOOLEAN,
  error_message TEXT,
  processing_duration_ms INTEGER,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_external_issues_feature_request ON feature_request_external_issues(feature_request_id);
CREATE INDEX idx_external_issues_system ON feature_request_external_issues(external_system);
CREATE INDEX idx_external_issues_status ON feature_request_external_issues(status);
CREATE INDEX idx_external_issues_last_synced ON feature_request_external_issues(last_synced_at);

CREATE INDEX idx_external_configs_org ON external_system_configs(organization_id);
CREATE INDEX idx_external_configs_type ON external_system_configs(system_type);

CREATE INDEX idx_sync_history_feature_request ON external_sync_history(feature_request_id);
CREATE INDEX idx_sync_history_system ON external_sync_history(external_system);
CREATE INDEX idx_sync_history_synced_at ON external_sync_history(synced_at);

CREATE INDEX idx_webhook_logs_source ON external_webhook_logs(source_system);
CREATE INDEX idx_webhook_logs_processed ON external_webhook_logs(processed);
CREATE INDEX idx_webhook_logs_received_at ON external_webhook_logs(received_at);

-- Row Level Security (RLS)
ALTER TABLE feature_request_external_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_system_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Feature request external issues: Users can see issues for their feature requests or org admins
CREATE POLICY "Users can view external issues for their feature requests" ON feature_request_external_issues
  FOR SELECT USING (
    feature_request_id IN (
      SELECT id FROM feature_requests WHERE user_id = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN organizations o ON up.organization_id = o.id
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'owner')
      AND o.id IN (
        SELECT up2.organization_id FROM user_profiles up2
        JOIN feature_requests fr ON fr.user_id = up2.id
        WHERE fr.id = feature_request_external_issues.feature_request_id
      )
    )
  );

-- Only admins can insert/update/delete external issues
CREATE POLICY "Admins can manage external issues" ON feature_request_external_issues
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- External system configs: Only org admins can manage
CREATE POLICY "Org admins can manage system configs" ON external_system_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND organization_id = external_system_configs.organization_id
      AND role IN ('admin', 'owner')
    )
  );

-- Sync history: Users can view history for their feature requests
CREATE POLICY "Users can view sync history for their feature requests" ON external_sync_history
  FOR SELECT USING (
    feature_request_id IN (
      SELECT id FROM feature_requests WHERE user_id = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN organizations o ON up.organization_id = o.id
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'owner')
      AND o.id IN (
        SELECT up2.organization_id FROM user_profiles up2
        JOIN feature_requests fr ON fr.user_id = up2.id
        WHERE fr.id = external_sync_history.feature_request_id
      )
    )
  );

-- Only system can insert sync history
CREATE POLICY "System can insert sync history" ON external_sync_history
  FOR INSERT WITH CHECK (true);

-- Webhook logs: Only system and admins can access
CREATE POLICY "System and admins can access webhook logs" ON external_webhook_logs
  FOR ALL USING (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_external_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_external_config_timestamp_trigger
  BEFORE UPDATE ON external_system_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_external_config_timestamp();

-- Function to clean up old webhook logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM external_webhook_logs 
  WHERE received_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get external sync stats
CREATE OR REPLACE FUNCTION get_external_sync_stats(
  p_organization_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  system_type TEXT,
  total_syncs BIGINT,
  successful_syncs BIGINT,
  failed_syncs BIGINT,
  avg_duration_ms NUMERIC,
  last_sync_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    esh.external_system,
    COUNT(*) as total_syncs,
    COUNT(*) FILTER (WHERE esh.success = true) as successful_syncs,
    COUNT(*) FILTER (WHERE esh.success = false) as failed_syncs,
    AVG(esh.sync_duration_ms) as avg_duration_ms,
    MAX(esh.synced_at) as last_sync_at
  FROM external_sync_history esh
  JOIN feature_requests fr ON fr.id = esh.feature_request_id
  JOIN user_profiles up ON up.id = fr.user_id
  WHERE 
    (p_organization_id IS NULL OR up.organization_id = p_organization_id)
    AND esh.synced_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY esh.external_system
  ORDER BY total_syncs DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE feature_request_external_issues IS 'Links feature requests to external product management tool issues';
COMMENT ON TABLE external_system_configs IS 'Configuration for external system integrations per organization';
COMMENT ON TABLE external_sync_history IS 'History of sync operations with external systems';
COMMENT ON TABLE external_webhook_logs IS 'Log of webhooks received from external systems';

COMMENT ON FUNCTION cleanup_old_webhook_logs() IS 'Cleanup function to remove webhook logs older than 30 days';
COMMENT ON FUNCTION get_external_sync_stats(UUID, INTEGER) IS 'Get sync statistics for external systems by organization';