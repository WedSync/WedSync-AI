-- WS-205 Broadcast Events System Migration
-- Team B Backend Infrastructure Implementation
-- Database schema for comprehensive broadcast management with wedding context

-- Enable RLS and create types
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Custom types for broadcast system
DO $$ BEGIN
  CREATE TYPE broadcast_type AS ENUM (
    'maintenance.scheduled', 'maintenance.started', 'maintenance.completed',
    'feature.released', 'security.alert',
    'tier.upgraded', 'tier.downgraded', 'payment.required',
    'trial.ending', 'usage.limit.approaching',
    'form.locked', 'journey.updated', 'timeline.changed',
    'supplier.joined', 'couple.connected', 'wedding.cancelled',
    'wedding.emergency', 'coordinator.handoff'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE broadcast_priority AS ENUM ('critical', 'high', 'normal', 'low');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE broadcast_status AS ENUM ('pending', 'sent', 'cancelled', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_channel AS ENUM ('realtime', 'email', 'sms', 'push', 'in_app');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'bounced');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Main broadcasts table with wedding context support
CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type broadcast_type NOT NULL,
  priority broadcast_priority NOT NULL DEFAULT 'normal',
  title TEXT NOT NULL CHECK (length(title) <= 200),
  message TEXT NOT NULL CHECK (length(message) <= 1000),
  action_label TEXT CHECK (length(action_label) <= 50),
  action_url TEXT CHECK (action_url ~ '^https?://.*' OR action_url ~ '^/.*'),
  expires_at TIMESTAMP WITH TIME ZONE,
  targeting JSONB DEFAULT '{}'::jsonb,
  wedding_context JSONB DEFAULT '{}'::jsonb, -- Wedding-specific context
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status broadcast_status DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Wedding industry constraints
  CONSTRAINT valid_wedding_context CHECK (
    wedding_context ? 'weddingId' OR 
    wedding_context = '{}'::jsonb
  ),
  CONSTRAINT valid_targeting CHECK (
    targeting ? 'segments' OR 
    targeting ? 'userIds' OR 
    targeting ? 'roles' OR
    targeting ? 'tiers' OR
    targeting = '{}'::jsonb
  ),
  CONSTRAINT scheduled_in_future CHECK (
    scheduled_for >= created_at OR status != 'pending'
  )
);

-- Delivery tracking with wedding context privacy
CREATE TABLE IF NOT EXISTS broadcast_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  delivery_channel delivery_channel NOT NULL,
  delivery_status delivery_status DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  wedding_context_match BOOLEAN DEFAULT false, -- Whether user had access to wedding context
  
  UNIQUE(broadcast_id, user_id, delivery_channel),
  
  -- Performance constraints
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= 5),
  CONSTRAINT valid_timestamps CHECK (
    (read_at IS NULL OR read_at >= delivered_at) AND
    (acknowledged_at IS NULL OR acknowledged_at >= delivered_at)
  )
);

-- User preferences with wedding role context
CREATE TABLE IF NOT EXISTS broadcast_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  system_broadcasts BOOLEAN DEFAULT true,
  business_broadcasts BOOLEAN DEFAULT true,
  collaboration_broadcasts BOOLEAN DEFAULT true,
  wedding_broadcasts BOOLEAN DEFAULT true, -- Wedding-specific broadcasts
  critical_only BOOLEAN DEFAULT false,
  delivery_channels JSONB DEFAULT '["realtime", "in_app"]'::jsonb,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT DEFAULT 'UTC',
  role_preferences JSONB DEFAULT '{}'::jsonb, -- Role-specific settings
  wedding_filters JSONB DEFAULT '{}'::jsonb, -- Wedding-specific filters
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Validation constraints
  CONSTRAINT valid_delivery_channels CHECK (
    jsonb_typeof(delivery_channels) = 'array'
  ),
  CONSTRAINT valid_timezone CHECK (
    timezone ~ '^[A-Za-z_/]+$'
  ),
  CONSTRAINT valid_quiet_hours CHECK (
    (quiet_hours_start IS NULL AND quiet_hours_end IS NULL) OR
    (quiet_hours_start IS NOT NULL AND quiet_hours_end IS NOT NULL)
  )
);

-- Audience segments for targeted broadcasting
CREATE TABLE IF NOT EXISTS broadcast_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (length(name) <= 100),
  description TEXT CHECK (length(description) <= 500),
  criteria JSONB NOT NULL,
  user_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Wedding industry segments validation
  CONSTRAINT valid_criteria CHECK (
    criteria ? 'roles' OR 
    criteria ? 'tiers' OR 
    criteria ? 'weddingStatus' OR
    criteria ? 'userType'
  )
);

-- Analytics for broadcast effectiveness
CREATE TABLE IF NOT EXISTS broadcast_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  total_targeted INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_read INTEGER DEFAULT 0,
  total_acknowledged INTEGER DEFAULT 0,
  total_action_clicked INTEGER DEFAULT 0,
  avg_time_to_read INTERVAL,
  delivery_rate DECIMAL(5,4), -- Percentage as decimal
  engagement_rate DECIMAL(5,4),
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Performance analytics constraints
  CONSTRAINT valid_counts CHECK (
    total_targeted >= 0 AND
    total_delivered <= total_targeted AND
    total_read <= total_delivered AND
    total_acknowledged <= total_read AND
    total_action_clicked <= total_read
  ),
  CONSTRAINT valid_rates CHECK (
    delivery_rate >= 0 AND delivery_rate <= 1 AND
    engagement_rate >= 0 AND engagement_rate <= 1
  ),
  
  UNIQUE(broadcast_id, calculated_at::date)
);

-- Rate limiting for broadcast sending
CREATE TABLE IF NOT EXISTS broadcast_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broadcast_type TEXT NOT NULL,
  sent_count INTEGER DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  window_duration INTERVAL DEFAULT '1 hour'::interval,
  max_per_window INTEGER DEFAULT 10,
  
  UNIQUE(user_id, broadcast_type, window_start)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_broadcasts_scheduled ON broadcasts(scheduled_for) 
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_broadcasts_type ON broadcasts(type);
CREATE INDEX IF NOT EXISTS idx_broadcasts_priority ON broadcasts(priority);
CREATE INDEX IF NOT EXISTS idx_broadcasts_wedding_context ON broadcasts 
  USING GIN(wedding_context) WHERE wedding_context != '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_deliveries_user_unread ON broadcast_deliveries(user_id, delivered_at DESC) 
  WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON broadcast_deliveries(delivery_status, retry_count)
  WHERE delivery_status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_preferences_user ON broadcast_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_segments_active ON broadcast_segments(is_active, updated_at);

-- Row Level Security Policies
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_analytics ENABLE ROW LEVEL SECURITY;

-- Broadcasts: Only admins can create, users can read their targeted broadcasts
CREATE POLICY "Admin can manage broadcasts" ON broadcasts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

CREATE POLICY "Users can read targeted broadcasts" ON broadcasts
  FOR SELECT USING (
    -- Global broadcasts
    targeting = '{}'::jsonb OR
    -- User-specific targeting
    targeting ? 'userIds' AND auth.uid()::text = ANY(
      SELECT jsonb_array_elements_text(targeting->'userIds')
    ) OR
    -- Role-based targeting
    targeting ? 'roles' AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() 
        AND up.role = ANY(
          SELECT jsonb_array_elements_text(targeting->'roles')
        )
    ) OR
    -- Wedding context targeting
    targeting ? 'weddingIds' AND EXISTS (
      SELECT 1 FROM wedding_team wt
      WHERE wt.user_id = auth.uid()
        AND wt.wedding_id::text = ANY(
          SELECT jsonb_array_elements_text(targeting->'weddingIds')
        )
    )
  );

-- Deliveries: Users can only see their own deliveries
CREATE POLICY "Users can manage their deliveries" ON broadcast_deliveries
  FOR ALL USING (user_id = auth.uid());

-- Preferences: Users can only manage their own preferences
CREATE POLICY "Users can manage their preferences" ON broadcast_preferences
  FOR ALL USING (user_id = auth.uid());

-- Segments: Admin read, coordinator limited read
CREATE POLICY "Admin can manage segments" ON broadcast_segments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Coordinators can read segments" ON broadcast_segments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

-- Analytics: Admin and coordinators only
CREATE POLICY "Admin can view analytics" ON broadcast_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

-- Function to clean up expired broadcasts
CREATE OR REPLACE FUNCTION cleanup_expired_broadcasts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM broadcasts 
  WHERE expires_at < NOW() 
    AND status = 'sent'
    AND created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update segment user counts
CREATE OR REPLACE FUNCTION update_segment_counts()
RETURNS void AS $$
DECLARE
  seg RECORD;
  count INTEGER;
BEGIN
  FOR seg IN SELECT id, criteria FROM broadcast_segments WHERE is_active = true
  LOOP
    -- Count users matching segment criteria
    SELECT COUNT(*) INTO count
    FROM user_profiles up
    WHERE (
      -- Role-based criteria
      (seg.criteria ? 'roles' AND up.role = ANY(
        SELECT jsonb_array_elements_text(seg.criteria->'roles')
      )) OR
      -- Tier-based criteria  
      (seg.criteria ? 'tiers' AND up.subscription_tier = ANY(
        SELECT jsonb_array_elements_text(seg.criteria->'tiers')
      )) OR
      -- Wedding status criteria
      (seg.criteria ? 'weddingStatus' AND EXISTS (
        SELECT 1 FROM weddings w
        JOIN wedding_team wt ON w.id = wt.wedding_id
        WHERE wt.user_id = up.user_id
          AND w.status = ANY(
            SELECT jsonb_array_elements_text(seg.criteria->'weddingStatus')
          )
      ))
    );
    
    UPDATE broadcast_segments 
    SET user_count = count, updated_at = NOW()
    WHERE id = seg.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for analytics increment
CREATE OR REPLACE FUNCTION increment_broadcast_stat(
  broadcast_id UUID,
  stat_name TEXT
) RETURNS void AS $$
BEGIN
  INSERT INTO broadcast_analytics (
    broadcast_id, 
    calculated_at
  ) VALUES (
    increment_broadcast_stat.broadcast_id,
    NOW()
  )
  ON CONFLICT (broadcast_id, calculated_at::date) DO NOTHING;
  
  -- Update the specific statistic
  CASE stat_name
    WHEN 'read' THEN
      UPDATE broadcast_analytics 
      SET total_read = total_read + 1 
      WHERE broadcast_analytics.broadcast_id = increment_broadcast_stat.broadcast_id;
    WHEN 'acknowledged' THEN
      UPDATE broadcast_analytics 
      SET total_acknowledged = total_acknowledged + 1 
      WHERE broadcast_analytics.broadcast_id = increment_broadcast_stat.broadcast_id;
    WHEN 'action_clicked' THEN
      UPDATE broadcast_analytics 
      SET total_action_clicked = total_action_clicked + 1 
      WHERE broadcast_analytics.broadcast_id = increment_broadcast_stat.broadcast_id;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update analytics on delivery changes
CREATE OR REPLACE FUNCTION update_broadcast_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update analytics when delivery status changes
  IF TG_OP = 'UPDATE' AND OLD.delivery_status != NEW.delivery_status THEN
    INSERT INTO broadcast_analytics (
      broadcast_id, 
      total_delivered, 
      calculated_at
    )
    SELECT 
      NEW.broadcast_id,
      COUNT(*) FILTER (WHERE delivery_status = 'delivered'),
      NOW()
    FROM broadcast_deliveries
    WHERE broadcast_id = NEW.broadcast_id
    ON CONFLICT (broadcast_id, calculated_at::date)
    DO UPDATE SET
      total_delivered = EXCLUDED.total_delivered,
      calculated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_broadcast_analytics
  AFTER UPDATE ON broadcast_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_broadcast_analytics();

-- Initial segments for wedding industry
INSERT INTO broadcast_segments (name, description, criteria) VALUES
  (
    'Wedding Coordinators',
    'Professional wedding coordinators managing multiple events',
    '{"roles": ["coordinator"], "userType": "supplier"}'
  ),
  (
    'Wedding Photographers',
    'Photography professionals serving wedding clients',
    '{"roles": ["photographer"], "userType": "supplier"}'
  ),
  (
    'Active Couples',
    'Couples with weddings in the next 12 months',
    '{"userType": "couple", "weddingStatus": ["planning", "confirmed"]}'
  ),
  (
    'Premium Users',
    'Users with professional or enterprise tier subscriptions',
    '{"tiers": ["professional", "enterprise"]}'
  )
ON CONFLICT (name) DO NOTHING;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON broadcasts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON broadcast_deliveries TO authenticated;
GRANT ALL ON broadcast_preferences TO authenticated;
GRANT SELECT ON broadcast_segments TO authenticated;
GRANT SELECT ON broadcast_analytics TO authenticated;

-- Grant function execution
GRANT EXECUTE ON FUNCTION cleanup_expired_broadcasts() TO service_role;
GRANT EXECUTE ON FUNCTION update_segment_counts() TO service_role;
GRANT EXECUTE ON FUNCTION increment_broadcast_stat(UUID, TEXT) TO authenticated;