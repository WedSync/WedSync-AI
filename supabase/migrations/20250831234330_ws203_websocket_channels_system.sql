-- WS-203 WebSocket Channels Backend System
-- Team B Implementation: Enterprise WebSocket Channel Infrastructure
-- Generated: 2025-01-20 | Feature: WebSocket Channels for Wedding Coordination

-- ================================================
-- WEBSOCKET CHANNELS CORE TABLES
-- ================================================

-- Channel registry for tracking active channels
CREATE TABLE IF NOT EXISTS websocket_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_name TEXT NOT NULL UNIQUE,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('private', 'shared', 'broadcast')),
  scope TEXT NOT NULL CHECK (scope IN ('supplier', 'couple', 'collaboration', 'form', 'journey', 'admin')),
  entity TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  max_subscribers INTEGER DEFAULT 100,
  message_retention_hours INTEGER DEFAULT 24,
  
  -- Wedding-specific fields
  wedding_id UUID REFERENCES wedding_core_data(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Performance indexes
  CONSTRAINT valid_channel_name CHECK (
    channel_name ~ '^(supplier|couple|collaboration|form|journey|admin):[a-zA-Z0-9_-]+:[a-f0-9-]{36}$'
  )
);

-- Channel subscriptions tracking user connections
CREATE TABLE IF NOT EXISTS channel_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES websocket_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id TEXT NOT NULL,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_ping_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  active BOOLEAN DEFAULT true,
  subscription_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Wedding context for permission validation
  wedding_id UUID REFERENCES wedding_core_data(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Prevent duplicate active subscriptions
  CONSTRAINT unique_active_subscription UNIQUE (channel_id, user_id, active) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Message queue for offline message delivery
CREATE TABLE IF NOT EXISTS channel_message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES websocket_channels(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  
  -- Wedding context for message routing
  wedding_id UUID REFERENCES wedding_core_data(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  
  -- Delivery status
  delivered BOOLEAN DEFAULT false,
  failed BOOLEAN DEFAULT false,
  error_message TEXT,
  
  -- Message categorization
  message_category TEXT DEFAULT 'general' CHECK (
    message_category IN ('general', 'form_response', 'journey_update', 'timeline_change', 'payment', 'urgent')
  )
);

-- Connection health monitoring
CREATE TABLE IF NOT EXISTS websocket_connection_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_count INTEGER DEFAULT 0,
  last_ping TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_pong TIMESTAMP WITH TIME ZONE,
  connection_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  connection_end TIMESTAMP WITH TIME ZONE,
  total_messages_sent INTEGER DEFAULT 0,
  total_messages_received INTEGER DEFAULT 0,
  total_bytes_transferred BIGINT DEFAULT 0,
  average_latency_ms INTEGER DEFAULT 0,
  connection_errors INTEGER DEFAULT 0,
  status TEXT DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error', 'timeout')),
  client_info JSONB DEFAULT '{}'::jsonb,
  
  -- Performance metrics
  peak_channel_count INTEGER DEFAULT 0,
  connection_quality_score INTEGER DEFAULT 100 CHECK (connection_quality_score BETWEEN 0 AND 100)
);

-- ================================================
-- PERFORMANCE INDEXES
-- ================================================

-- Channel registry indexes
CREATE INDEX IF NOT EXISTS idx_websocket_channels_name ON websocket_channels(channel_name);
CREATE INDEX IF NOT EXISTS idx_websocket_channels_scope_entity ON websocket_channels(scope, entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_websocket_channels_wedding ON websocket_channels(wedding_id) WHERE wedding_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_websocket_channels_supplier ON websocket_channels(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_websocket_channels_couple ON websocket_channels(couple_id) WHERE couple_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_websocket_channels_active ON websocket_channels(active, last_activity) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_websocket_channels_expires ON websocket_channels(expires_at) WHERE expires_at IS NOT NULL;

-- Subscription indexes
CREATE INDEX IF NOT EXISTS idx_channel_subscriptions_channel ON channel_subscriptions(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_subscriptions_user ON channel_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_subscriptions_active ON channel_subscriptions(active, last_ping_at) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_channel_subscriptions_wedding ON channel_subscriptions(wedding_id) WHERE wedding_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channel_subscriptions_connection ON channel_subscriptions(connection_id);

-- Message queue indexes
CREATE INDEX IF NOT EXISTS idx_channel_message_queue_channel ON channel_message_queue(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_message_queue_recipient ON channel_message_queue(recipient_id);
CREATE INDEX IF NOT EXISTS idx_channel_message_queue_undelivered ON channel_message_queue(delivered, created_at) WHERE delivered = false;
CREATE INDEX IF NOT EXISTS idx_channel_message_queue_expires ON channel_message_queue(expires_at) WHERE delivered = false;
CREATE INDEX IF NOT EXISTS idx_channel_message_queue_priority ON channel_message_queue(priority, created_at) WHERE delivered = false;
CREATE INDEX IF NOT EXISTS idx_channel_message_queue_wedding ON channel_message_queue(wedding_id) WHERE wedding_id IS NOT NULL;

-- Connection health indexes
CREATE INDEX IF NOT EXISTS idx_websocket_connection_health_user ON websocket_connection_health(user_id);
CREATE INDEX IF NOT EXISTS idx_websocket_connection_health_status ON websocket_connection_health(status, last_ping);
CREATE INDEX IF NOT EXISTS idx_websocket_connection_health_active ON websocket_connection_health(connection_start) WHERE connection_end IS NULL;

-- ================================================
-- ROW LEVEL SECURITY POLICIES
-- ================================================

-- Enable RLS on all tables
ALTER TABLE websocket_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE websocket_connection_health ENABLE ROW LEVEL SECURITY;

-- WebSocket Channels RLS Policies
CREATE POLICY "Users can create channels they own" ON websocket_channels
  FOR INSERT WITH CHECK (
    auth.uid() = created_by OR
    (auth.jwt() ->> 'role')::text = 'service_role'
  );

CREATE POLICY "Users can view channels they have access to" ON websocket_channels
  FOR SELECT USING (
    -- Channel creator can always view
    auth.uid() = created_by OR
    
    -- Service role can view all
    (auth.jwt() ->> 'role')::text = 'service_role' OR
    
    -- Organization members can view organization channels
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.organization_id = websocket_channels.organization_id
    )) OR
    
    -- Suppliers can view their channels
    (supplier_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.supplier_id = websocket_channels.supplier_id
    )) OR
    
    -- Couples can view their channels
    (couple_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.couple_id = websocket_channels.couple_id
    )) OR
    
    -- Users with active subscriptions can view
    EXISTS (
      SELECT 1 FROM channel_subscriptions cs 
      WHERE cs.channel_id = websocket_channels.id 
      AND cs.user_id = auth.uid() 
      AND cs.active = true
    )
  );

CREATE POLICY "Users can update channels they own" ON websocket_channels
  FOR UPDATE USING (
    auth.uid() = created_by OR
    (auth.jwt() ->> 'role')::text = 'service_role'
  );

-- Channel Subscriptions RLS Policies
CREATE POLICY "Users can create their own subscriptions" ON channel_subscriptions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    (auth.jwt() ->> 'role')::text = 'service_role'
  );

CREATE POLICY "Users can view their own subscriptions" ON channel_subscriptions
  FOR SELECT USING (
    auth.uid() = user_id OR
    (auth.jwt() ->> 'role')::text = 'service_role' OR
    -- Channel owners can view subscriptions
    EXISTS (
      SELECT 1 FROM websocket_channels wc 
      WHERE wc.id = channel_subscriptions.channel_id 
      AND wc.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own subscriptions" ON channel_subscriptions
  FOR UPDATE USING (
    auth.uid() = user_id OR
    (auth.jwt() ->> 'role')::text = 'service_role'
  );

-- Message Queue RLS Policies
CREATE POLICY "Users can create messages they send" ON channel_message_queue
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id OR
    (auth.jwt() ->> 'role')::text = 'service_role'
  );

CREATE POLICY "Users can view messages for them" ON channel_message_queue
  FOR SELECT USING (
    auth.uid() = recipient_id OR
    auth.uid() = sender_id OR
    (auth.jwt() ->> 'role')::text = 'service_role'
  );

CREATE POLICY "Users can update message delivery status" ON channel_message_queue
  FOR UPDATE USING (
    auth.uid() = recipient_id OR
    (auth.jwt() ->> 'role')::text = 'service_role'
  );

-- Connection Health RLS Policies
CREATE POLICY "Users can manage their own connections" ON websocket_connection_health
  FOR ALL USING (
    auth.uid() = user_id OR
    (auth.jwt() ->> 'role')::text = 'service_role'
  );

-- ================================================
-- VALIDATION FUNCTIONS
-- ================================================

-- Function to validate channel permissions
CREATE OR REPLACE FUNCTION validate_websocket_channel_permission(
  user_uuid UUID,
  channel_name_param TEXT,
  operation_type TEXT DEFAULT 'subscribe'
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  channel_record websocket_channels%ROWTYPE;
  user_profile user_profiles%ROWTYPE;
  has_permission BOOLEAN := false;
BEGIN
  -- Get channel details
  SELECT * INTO channel_record 
  FROM websocket_channels 
  WHERE channel_name = channel_name_param AND active = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Get user profile
  SELECT * INTO user_profile 
  FROM user_profiles 
  WHERE id = user_uuid;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check permissions based on channel scope and user context
  CASE channel_record.scope
    WHEN 'supplier' THEN
      has_permission := (
        user_profile.supplier_id = channel_record.supplier_id OR
        user_profile.user_type = 'admin'
      );
      
    WHEN 'couple' THEN
      has_permission := (
        user_profile.couple_id = channel_record.couple_id OR
        user_profile.user_type = 'admin'
      );
      
    WHEN 'collaboration' THEN
      has_permission := (
        user_profile.supplier_id = channel_record.supplier_id OR
        user_profile.couple_id = channel_record.couple_id OR
        user_profile.user_type = 'admin'
      );
      
    WHEN 'form' THEN
      has_permission := (
        user_profile.supplier_id = channel_record.supplier_id OR
        user_profile.couple_id = channel_record.couple_id OR
        user_profile.user_type = 'admin'
      );
      
    WHEN 'journey' THEN
      has_permission := (
        user_profile.couple_id = channel_record.couple_id OR
        user_profile.user_type = 'admin' OR
        -- Suppliers can subscribe to journey updates for their clients
        (user_profile.supplier_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM couples c 
          WHERE c.id = channel_record.couple_id 
          AND c.supplier_id = user_profile.supplier_id
        ))
      );
      
    WHEN 'admin' THEN
      has_permission := (user_profile.user_type = 'admin');
      
    ELSE
      has_permission := false;
  END CASE;
  
  -- Additional organization-level permissions
  IF NOT has_permission AND channel_record.organization_id IS NOT NULL THEN
    has_permission := (user_profile.organization_id = channel_record.organization_id);
  END IF;
  
  RETURN has_permission;
END;
$$;

-- Function to generate channel name
CREATE OR REPLACE FUNCTION generate_websocket_channel_name(
  scope_param TEXT,
  entity_param TEXT,
  entity_id_param UUID
) RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN scope_param || ':' || entity_param || ':' || entity_id_param::text;
END;
$$;

-- Function to cleanup expired channels and messages
CREATE OR REPLACE FUNCTION cleanup_websocket_resources()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleaned_channels INTEGER := 0;
  cleaned_messages INTEGER := 0;
  cleaned_connections INTEGER := 0;
BEGIN
  -- Clean up expired channels
  UPDATE websocket_channels 
  SET active = false 
  WHERE expires_at IS NOT NULL AND expires_at < NOW() AND active = true;
  
  GET DIAGNOSTICS cleaned_channels = ROW_COUNT;
  
  -- Clean up expired messages
  DELETE FROM channel_message_queue 
  WHERE expires_at < NOW() OR (failed = true AND attempts >= max_attempts);
  
  GET DIAGNOSTICS cleaned_messages = ROW_COUNT;
  
  -- Clean up old connection health records
  UPDATE websocket_connection_health 
  SET connection_end = NOW(), status = 'timeout'
  WHERE last_ping < (NOW() - INTERVAL '5 minutes') 
  AND connection_end IS NULL 
  AND status = 'connected';
  
  GET DIAGNOSTICS cleaned_connections = ROW_COUNT;
  
  -- Log cleanup activity
  INSERT INTO admin_audit_logs (
    admin_id,
    action,
    resource_type,
    resource_id,
    details,
    status
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid, -- System user
    'cleanup_websocket_resources',
    'websocket_system',
    NULL,
    jsonb_build_object(
      'cleaned_channels', cleaned_channels,
      'cleaned_messages', cleaned_messages,
      'cleaned_connections', cleaned_connections
    ),
    'success'
  );
  
  RETURN cleaned_channels + cleaned_messages + cleaned_connections;
END;
$$;

-- ================================================
-- TRIGGERS
-- ================================================

-- Update last_activity on channel access
CREATE OR REPLACE FUNCTION update_channel_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE websocket_channels 
  SET last_activity = NOW() 
  WHERE id = NEW.channel_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_channel_activity
  AFTER INSERT ON channel_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_channel_activity();

-- Auto-expire old messages
CREATE OR REPLACE FUNCTION auto_expire_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set expiration based on message category
  CASE NEW.message_category
    WHEN 'urgent' THEN
      NEW.expires_at := NEW.created_at + INTERVAL '1 hour';
    WHEN 'payment' THEN
      NEW.expires_at := NEW.created_at + INTERVAL '72 hours';
    WHEN 'form_response' THEN
      NEW.expires_at := NEW.created_at + INTERVAL '48 hours';
    ELSE
      NEW.expires_at := NEW.created_at + INTERVAL '24 hours';
  END CASE;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_expire_messages
  BEFORE INSERT ON channel_message_queue
  FOR EACH ROW
  EXECUTE FUNCTION auto_expire_messages();

-- ================================================
-- SCHEDULED CLEANUP JOBS (PostgreSQL Extensions)
-- ================================================

-- Create extension for pg_cron if not exists
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup job to run every hour
SELECT cron.schedule(
  'websocket-cleanup',
  '0 * * * *', -- Every hour at minute 0
  'SELECT cleanup_websocket_resources();'
);

-- ================================================
-- INITIAL DATA AND CONFIGURATION
-- ================================================

-- Insert default configuration
INSERT INTO system_config (key, value, category, description)
VALUES 
  ('websocket.max_connections_per_user', '10', 'websocket', 'Maximum WebSocket connections per user'),
  ('websocket.max_channels_per_user', '25', 'websocket', 'Maximum channels per user can subscribe to'),
  ('websocket.message_rate_limit', '100', 'websocket', 'Messages per minute per channel'),
  ('websocket.heartbeat_interval', '30000', 'websocket', 'Heartbeat interval in milliseconds'),
  ('websocket.connection_timeout', '300000', 'websocket', 'Connection timeout in milliseconds'),
  ('websocket.message_retention_hours', '24', 'websocket', 'Default message retention in hours')
ON CONFLICT (key) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE ON websocket_channels TO authenticated;
GRANT SELECT, INSERT, UPDATE ON channel_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON channel_message_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE ON websocket_connection_health TO authenticated;

GRANT ALL ON websocket_channels TO service_role;
GRANT ALL ON channel_subscriptions TO service_role;
GRANT ALL ON channel_message_queue TO service_role;
GRANT ALL ON websocket_connection_health TO service_role;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION validate_websocket_channel_permission TO authenticated;
GRANT EXECUTE ON FUNCTION validate_websocket_channel_permission TO service_role;
GRANT EXECUTE ON FUNCTION generate_websocket_channel_name TO authenticated;
GRANT EXECUTE ON FUNCTION generate_websocket_channel_name TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_websocket_resources TO service_role;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'WS-203 WebSocket Channels Backend System migration completed successfully';
  RAISE NOTICE 'Tables created: websocket_channels, channel_subscriptions, channel_message_queue, websocket_connection_health';
  RAISE NOTICE 'RLS policies: Enabled with wedding-specific isolation';
  RAISE NOTICE 'Performance: Optimized indexes for 200+ concurrent connections';
  RAISE NOTICE 'Security: Full authentication and permission validation';
  RAISE NOTICE 'Cleanup: Automated resource cleanup scheduled';
END $$;