-- WS-217 Outlook Calendar Integration Migration
-- Team B - Backend/API Implementation
-- Created: 2025-01-20

-- Integration tokens storage (encrypted)
CREATE TABLE IF NOT EXISTS integration_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL,
  encrypted_tokens TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_user_integration UNIQUE(user_id, integration_type)
);

-- OAuth state management for secure authentication flow
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  state VARCHAR(64) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL,
  return_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Integration connection status and preferences
CREATE TABLE IF NOT EXISTS integration_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL,
  is_connected BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_settings JSONB DEFAULT '{}',
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_user_integration_type UNIQUE(user_id, integration_type)
);

-- Webhook subscription management for real-time updates
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL,
  subscription_id VARCHAR(255) NOT NULL UNIQUE,
  client_state VARCHAR(32) NOT NULL,
  callback_url TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  resource_path TEXT,
  change_types VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Synced calendar events with wedding context
CREATE TABLE IF NOT EXISTS synced_calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL,
  external_event_id VARCHAR(255) NOT NULL,
  event_data JSONB NOT NULL,
  wedding_context JSONB,
  event_type VARCHAR(50),
  event_date TIMESTAMP WITH TIME ZONE,
  is_wedding_day BOOLEAN DEFAULT FALSE,
  priority VARCHAR(20) DEFAULT 'medium',
  conflict_status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_user_external_event UNIQUE(user_id, integration_type, external_event_id)
);

-- Sync operations tracking for monitoring and debugging
CREATE TABLE IF NOT EXISTS sync_operations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL,
  sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN ('initial', 'incremental', 'full')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  result_data JSONB,
  error_message TEXT,
  events_processed INTEGER DEFAULT 0,
  events_created INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  events_deleted INTEGER DEFAULT 0,
  conflicts_detected INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Integration sync activity logs
CREATE TABLE IF NOT EXISTS integration_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL,
  activity VARCHAR(100) NOT NULL,
  activity_data JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'error', 'warning')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automation rules for integration triggers
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_name VARCHAR(100) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL,
  trigger_conditions JSONB DEFAULT '{}',
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate limiting for API endpoints
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(100) NOT NULL,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_rate_limit_key UNIQUE(key)
);

-- Audit logs for security and compliance
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  resource_details JSONB,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_integration_tokens_user_type 
  ON integration_tokens(user_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_tokens_expires 
  ON integration_tokens(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_oauth_states_state 
  ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires 
  ON oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_type 
  ON oauth_states(user_id, integration_type);

CREATE INDEX IF NOT EXISTS idx_integration_connections_user_type 
  ON integration_connections(user_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_connections_connected 
  ON integration_connections(is_connected) WHERE is_connected = TRUE;

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_user_type 
  ON webhook_subscriptions(user_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_expires 
  ON webhook_subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_subscription 
  ON webhook_subscriptions(subscription_id);

CREATE INDEX IF NOT EXISTS idx_synced_events_user_type 
  ON synced_calendar_events(user_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_synced_events_external_id 
  ON synced_calendar_events(external_event_id);
CREATE INDEX IF NOT EXISTS idx_synced_events_date 
  ON synced_calendar_events(user_id, event_date);
CREATE INDEX IF NOT EXISTS idx_synced_events_wedding_day 
  ON synced_calendar_events(user_id, is_wedding_day) WHERE is_wedding_day = TRUE;
CREATE INDEX IF NOT EXISTS idx_synced_events_priority 
  ON synced_calendar_events(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_synced_events_type 
  ON synced_calendar_events(user_id, event_type);

CREATE INDEX IF NOT EXISTS idx_sync_operations_user_type 
  ON sync_operations(user_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_sync_operations_status 
  ON sync_operations(status);
CREATE INDEX IF NOT EXISTS idx_sync_operations_created 
  ON sync_operations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_logs_user_created 
  ON integration_sync_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_activity 
  ON integration_sync_logs(activity);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status 
  ON integration_sync_logs(status);

CREATE INDEX IF NOT EXISTS idx_automation_rules_user_trigger 
  ON automation_rules(user_id, trigger_type, is_active);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_created 
  ON rate_limits(key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action 
  ON audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created 
  ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource 
  ON audit_logs(resource_type, resource_id);

-- Row Level Security (RLS) Policies
ALTER TABLE integration_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own integration data
CREATE POLICY "Users can manage their integration tokens" 
  ON integration_tokens FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their OAuth states" 
  ON oauth_states FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their integration connections" 
  ON integration_connections FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their webhook subscriptions" 
  ON webhook_subscriptions FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can access their synced calendar events" 
  ON synced_calendar_events FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can access their sync operations" 
  ON sync_operations FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their integration logs" 
  ON integration_sync_logs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their automation rules" 
  ON automation_rules FOR ALL 
  USING (auth.uid() = user_id);

-- Rate limits can be read/updated by service but not by regular users
CREATE POLICY "Service can manage rate limits" 
  ON rate_limits FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Audit logs can be inserted by anyone but only read by admins
CREATE POLICY "Anyone can insert audit logs" 
  ON audit_logs FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can view their own audit logs" 
  ON audit_logs FOR SELECT 
  USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');

-- Functions for maintenance and cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM oauth_states WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_expired_webhook_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM webhook_subscriptions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL '1 hour';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_old_sync_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM integration_sync_logs 
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_integration_tokens_updated_at 
  BEFORE UPDATE ON integration_tokens 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_connections_updated_at 
  BEFORE UPDATE ON integration_connections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_subscriptions_updated_at 
  BEFORE UPDATE ON webhook_subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_synced_calendar_events_updated_at 
  BEFORE UPDATE ON synced_calendar_events 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_rules_updated_at 
  BEFORE UPDATE ON automation_rules 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE integration_tokens IS 'Encrypted OAuth tokens for third-party integrations';
COMMENT ON TABLE oauth_states IS 'Temporary states for OAuth authentication flows';
COMMENT ON TABLE integration_connections IS 'Connection status and preferences for integrations';
COMMENT ON TABLE webhook_subscriptions IS 'Active webhook subscriptions for real-time updates';
COMMENT ON TABLE synced_calendar_events IS 'Calendar events synchronized from external systems with wedding context';
COMMENT ON TABLE sync_operations IS 'History of sync operations for monitoring and debugging';
COMMENT ON TABLE integration_sync_logs IS 'Detailed activity logs for integration operations';
COMMENT ON TABLE automation_rules IS 'User-defined automation rules triggered by integration events';
COMMENT ON TABLE rate_limits IS 'Rate limiting counters for API endpoints';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for security and compliance';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON integration_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON oauth_states TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON integration_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON webhook_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON synced_calendar_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sync_operations TO authenticated;
GRANT SELECT, INSERT ON integration_sync_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON automation_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rate_limits TO authenticated;
GRANT SELECT, INSERT ON audit_logs TO authenticated;

-- Grant sequence usage for UUID generation
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Migration completion notice
DO $$
BEGIN
  RAISE NOTICE 'WS-217 Outlook Calendar Integration migration completed successfully';
  RAISE NOTICE 'Created tables: integration_tokens, oauth_states, integration_connections, webhook_subscriptions, synced_calendar_events, sync_operations, integration_sync_logs, automation_rules, rate_limits, audit_logs';
  RAISE NOTICE 'Created indexes: 16 performance indexes for query optimization';
  RAISE NOTICE 'Created RLS policies: 10 row-level security policies for data protection';
  RAISE NOTICE 'Created functions: 4 cleanup functions for maintenance';
  RAISE NOTICE 'Created triggers: 5 automatic timestamp update triggers';
END $$;