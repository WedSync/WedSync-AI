-- WS-202: Supabase Realtime Integration - Backend Database Schema
-- Created: 2025-01-20
-- Description: Complete realtime subscription management system for wedding industry

-- Enable realtime for critical tables (REPLICA IDENTITY FULL for WALRUS)
-- This enables Supabase Realtime to track all changes to these tables

-- Form responses - suppliers need realtime updates when couples submit forms
ALTER TABLE IF EXISTS form_responses REPLICA IDENTITY FULL;

-- Journey progress - suppliers track milestone completion in realtime
ALTER TABLE IF EXISTS journey_progress REPLICA IDENTITY FULL;

-- Core fields - couples see realtime updates to wedding details
ALTER TABLE IF EXISTS core_fields REPLICA IDENTITY FULL;

-- Client communications - realtime messaging between suppliers and couples
ALTER TABLE IF EXISTS client_communications REPLICA IDENTITY FULL;

-- Supplier profiles - realtime updates to supplier information
ALTER TABLE IF EXISTS suppliers REPLICA IDENTITY FULL;

-- Couple profiles - realtime updates to couple information  
ALTER TABLE IF EXISTS couples REPLICA IDENTITY FULL;

-- Client profiles - realtime updates to client information
ALTER TABLE IF EXISTS clients REPLICA IDENTITY FULL;

-- Wedding details - critical wedding information updates
ALTER TABLE IF EXISTS wedding_details REPLICA IDENTITY FULL;

-- Notifications - instant notification delivery
ALTER TABLE IF EXISTS notifications REPLICA IDENTITY FULL;

-- Task assignments - realtime task delegation and completion
ALTER TABLE IF EXISTS task_assignments REPLICA IDENTITY FULL;

-- =======================
-- REALTIME TRACKING TABLES
-- =======================

-- Track active realtime subscriptions for connection monitoring
CREATE TABLE IF NOT EXISTS realtime_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL, -- 'form-responses', 'journey-progress', etc.
  table_name TEXT NOT NULL,   -- actual table being monitored
  filter_params JSONB NOT NULL DEFAULT '{}', -- filter criteria as JSON
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_ping_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate subscriptions
  UNIQUE(user_id, channel_name, table_name, filter_params)
);

-- Track all realtime activity for audit and monitoring
CREATE TABLE IF NOT EXISTS realtime_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL, -- unique channel identifier
  event_type TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  payload JSONB,            -- event payload for debugging
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Additional context
  table_name TEXT,
  record_id UUID,
  session_id TEXT
);

-- =======================
-- PERFORMANCE INDEXES
-- =======================

-- Subscription tracking indexes
CREATE INDEX IF NOT EXISTS idx_realtime_subs_user_active 
  ON realtime_subscriptions(user_id) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_realtime_subs_channel 
  ON realtime_subscriptions(channel_name);

CREATE INDEX IF NOT EXISTS idx_realtime_subs_last_ping 
  ON realtime_subscriptions(last_ping_at) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_realtime_subs_table 
  ON realtime_subscriptions(table_name);

-- Activity log indexes  
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_timestamp 
  ON realtime_activity_logs(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_channel 
  ON realtime_activity_logs(channel_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type 
  ON realtime_activity_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp 
  ON realtime_activity_logs(timestamp DESC);

-- Cleanup index for old activity logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_cleanup 
  ON realtime_activity_logs(timestamp) WHERE timestamp < NOW() - INTERVAL '30 days';

-- =======================
-- ROW LEVEL SECURITY (RLS)
-- =======================

-- Enable RLS on realtime tracking tables
ALTER TABLE realtime_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for realtime_subscriptions
CREATE POLICY "Users can manage their own subscriptions" 
  ON realtime_subscriptions
  FOR ALL 
  USING (auth.uid() = user_id);

-- RLS Policies for realtime_activity_logs
CREATE POLICY "Users can view their own activity logs" 
  ON realtime_activity_logs
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Admin access policy for monitoring
CREATE POLICY "Admins can view all subscription data" 
  ON realtime_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can view all activity logs" 
  ON realtime_activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.user_type = 'admin'
    )
  );

-- =======================
-- CLEANUP FUNCTIONS
-- =======================

-- Function to cleanup inactive subscriptions (called by connection monitor)
CREATE OR REPLACE FUNCTION cleanup_inactive_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  cleanup_count INTEGER;
BEGIN
  -- Mark subscriptions inactive if no ping for 5 minutes
  UPDATE realtime_subscriptions 
  SET active = false 
  WHERE active = true 
  AND last_ping_at < NOW() - INTERVAL '5 minutes';
  
  -- Delete inactive subscriptions older than 1 hour
  DELETE FROM realtime_subscriptions 
  WHERE active = false 
  AND last_ping_at < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old activity logs (called by scheduled job)
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs()
RETURNS INTEGER AS $$
DECLARE
  cleanup_count INTEGER;
BEGIN
  -- Delete activity logs older than 30 days
  DELETE FROM realtime_activity_logs 
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- MONITORING FUNCTIONS
-- =======================

-- Function to get realtime connection statistics
CREATE OR REPLACE FUNCTION get_realtime_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'active_connections', (
      SELECT COUNT(*) 
      FROM realtime_subscriptions 
      WHERE active = true
    ),
    'total_channels', (
      SELECT COUNT(DISTINCT channel_name) 
      FROM realtime_subscriptions 
      WHERE active = true
    ),
    'messages_today', (
      SELECT COUNT(*) 
      FROM realtime_activity_logs 
      WHERE timestamp > CURRENT_DATE
    ),
    'peak_connections_today', (
      SELECT MAX(daily_count.count) 
      FROM (
        SELECT COUNT(*) as count
        FROM realtime_subscriptions 
        WHERE DATE(created_at) = CURRENT_DATE
        GROUP BY DATE_TRUNC('hour', created_at)
      ) as daily_count
    ),
    'channels_by_type', (
      SELECT json_object_agg(channel_name, count) 
      FROM (
        SELECT channel_name, COUNT(*) as count
        FROM realtime_subscriptions 
        WHERE active = true
        GROUP BY channel_name
      ) as channel_counts
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- WEDDING INDUSTRY SPECIFIC FUNCTIONS
-- =======================

-- Function to get user's allowed channels based on their role
CREATE OR REPLACE FUNCTION get_user_allowed_channels(user_uuid UUID)
RETURNS TEXT[] AS $$
DECLARE
  user_type TEXT;
  supplier_id UUID;
  couple_id UUID;
  allowed_channels TEXT[];
BEGIN
  -- Get user profile information
  SELECT up.user_type, up.supplier_id, up.couple_id
  INTO user_type, supplier_id, couple_id
  FROM user_profiles up
  WHERE up.id = user_uuid;
  
  -- Return channels based on user type
  CASE user_type
    WHEN 'supplier' THEN
      allowed_channels := ARRAY['form-responses', 'journey-progress', 'client-communications', 'notifications'];
    WHEN 'couple' THEN
      allowed_channels := ARRAY['core-fields', 'client-communications', 'notifications'];
    WHEN 'admin' THEN
      allowed_channels := ARRAY['form-responses', 'journey-progress', 'core-fields', 'client-communications', 'notifications'];
    ELSE
      allowed_channels := ARRAY[]::TEXT[];
  END CASE;
  
  RETURN allowed_channels;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate channel permissions
CREATE OR REPLACE FUNCTION validate_channel_permission(
  user_uuid UUID, 
  channel_name TEXT, 
  filter_params JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  user_type TEXT;
  supplier_id UUID;
  couple_id UUID;
  is_valid BOOLEAN := false;
BEGIN
  -- Get user profile information
  SELECT up.user_type, up.supplier_id, up.couple_id
  INTO user_type, supplier_id, couple_id
  FROM user_profiles up
  WHERE up.id = user_uuid;
  
  -- Validate permission based on channel and user type
  CASE channel_name
    WHEN 'form-responses' THEN
      -- Only suppliers can subscribe to form responses for their own data
      is_valid := (user_type = 'supplier' AND 
                   filter_params->>'supplier_id' = supplier_id::TEXT) OR
                  (user_type = 'admin');
                  
    WHEN 'journey-progress' THEN
      -- Only suppliers can subscribe to journey progress for their own data
      is_valid := (user_type = 'supplier' AND 
                   filter_params->>'supplier_id' = supplier_id::TEXT) OR
                  (user_type = 'admin');
                  
    WHEN 'core-fields' THEN
      -- Only couples can subscribe to core fields for their own wedding
      is_valid := (user_type = 'couple' AND 
                   filter_params->>'couple_id' = couple_id::TEXT) OR
                  (user_type = 'admin');
                  
    WHEN 'client-communications' THEN
      -- Both suppliers and couples can subscribe to communications involving them
      is_valid := (user_type = 'supplier' AND 
                   filter_params->>'supplier_id' = supplier_id::TEXT) OR
                  (user_type = 'couple' AND 
                   filter_params->>'couple_id' = couple_id::TEXT) OR
                  (user_type = 'admin');
                  
    WHEN 'notifications' THEN
      -- Users can subscribe to their own notifications
      is_valid := (filter_params->>'user_id' = user_uuid::TEXT) OR
                  (user_type = 'admin');
                  
    ELSE
      -- Unknown channel
      is_valid := false;
  END CASE;
  
  RETURN is_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- SCHEDULED CLEANUP JOBS
-- =======================

-- Create extension for scheduled jobs if not exists
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup jobs (runs every 5 minutes)
-- Note: This requires superuser permissions and may need to be run manually
-- SELECT cron.schedule('realtime-cleanup', '*/5 * * * *', 'SELECT cleanup_inactive_subscriptions();');
-- SELECT cron.schedule('activity-logs-cleanup', '0 2 * * *', 'SELECT cleanup_old_activity_logs();');

-- =======================
-- GRANTS AND PERMISSIONS
-- =======================

-- Grant permissions for service role
GRANT ALL ON realtime_subscriptions TO service_role;
GRANT ALL ON realtime_activity_logs TO service_role;

-- Grant execution permissions on functions
GRANT EXECUTE ON FUNCTION cleanup_inactive_subscriptions() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_activity_logs() TO service_role;
GRANT EXECUTE ON FUNCTION get_realtime_stats() TO service_role;
GRANT EXECUTE ON FUNCTION get_user_allowed_channels(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION validate_channel_permission(UUID, TEXT, JSONB) TO service_role;

-- Grant select permissions for authenticated users on their own data
GRANT SELECT ON realtime_subscriptions TO authenticated;
GRANT SELECT ON realtime_activity_logs TO authenticated;

-- =======================
-- COMMENTS FOR DOCUMENTATION
-- =======================

COMMENT ON TABLE realtime_subscriptions IS 'Tracks active realtime subscriptions for connection monitoring and cleanup';
COMMENT ON TABLE realtime_activity_logs IS 'Audit log of all realtime events for monitoring and debugging';

COMMENT ON FUNCTION cleanup_inactive_subscriptions() IS 'Cleans up inactive realtime subscriptions to prevent resource leaks';
COMMENT ON FUNCTION cleanup_old_activity_logs() IS 'Removes old activity logs to manage database size';
COMMENT ON FUNCTION get_realtime_stats() IS 'Returns comprehensive realtime connection statistics';
COMMENT ON FUNCTION get_user_allowed_channels(UUID) IS 'Returns list of channels a user is authorized to access';
COMMENT ON FUNCTION validate_channel_permission(UUID, TEXT, JSONB) IS 'Validates if user has permission to subscribe to a specific channel with given filters';

-- Migration completed successfully
SELECT 'Realtime subscription system migration completed successfully' as result;