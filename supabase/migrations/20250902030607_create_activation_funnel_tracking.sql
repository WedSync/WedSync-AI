-- WS-231: Activation Funnel Tracking System
-- Create tables for tracking user activation events and funnel stages

-- User activation events tracking table
CREATE TABLE user_activation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('supplier', 'couple')),
  event_name TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT,
  
  -- Add constraints
  CONSTRAINT valid_event_names CHECK (
    event_name IN (
      'email_verified',
      'profile_completed', 
      'form_created',
      'client_added',
      'journey_started',
      'wedding_date_set',
      'venue_added',
      'guest_list_started'
    )
  )
);

-- Activation funnel stages configuration table
CREATE TABLE activation_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type TEXT NOT NULL CHECK (user_type IN ('supplier', 'couple')),
  stage_order INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  stage_description TEXT,
  required_events TEXT[] NOT NULL,
  min_events INTEGER DEFAULT 1,
  max_timeframe_days INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate stages per user type
  UNIQUE(user_type, stage_order),
  UNIQUE(user_type, stage_name)
);

-- Create indexes for optimal query performance
CREATE INDEX idx_activation_events_user_time ON user_activation_events(user_id, created_at DESC);
CREATE INDEX idx_activation_events_type_event ON user_activation_events(user_type, event_name, created_at);
CREATE INDEX idx_activation_events_session ON user_activation_events(session_id, created_at);
CREATE INDEX idx_activation_stages_user_type ON activation_stages(user_type, stage_order);

-- Add RLS (Row Level Security) policies
ALTER TABLE user_activation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_stages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_activation_events
CREATE POLICY "Users can view their own activation events" ON user_activation_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert activation events" ON user_activation_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all activation events" ON user_activation_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for activation_stages
CREATE POLICY "Anyone can read activation stages" ON activation_stages
  FOR SELECT USING (true);

CREATE POLICY "Only admins can modify activation stages" ON activation_stages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Insert default activation stages for suppliers
INSERT INTO activation_stages (user_type, stage_order, stage_name, stage_description, required_events, min_events, max_timeframe_days) VALUES
('supplier', 1, 'Email Verification', 'User has verified their email address', ARRAY['email_verified'], 1, 1),
('supplier', 2, 'Profile Completion', 'User has completed their supplier profile', ARRAY['profile_completed'], 1, 7),
('supplier', 3, 'First Form Created', 'User has created their first form', ARRAY['form_created'], 1, 7),
('supplier', 4, 'Client Addition', 'User has added their first client', ARRAY['client_added'], 1, 7),
('supplier', 5, 'Journey Activation', 'User has started their first customer journey', ARRAY['journey_started'], 1, 14);

-- Insert default activation stages for couples
INSERT INTO activation_stages (user_type, stage_order, stage_name, stage_description, required_events, min_events, max_timeframe_days) VALUES
('couple', 1, 'Email Verification', 'Couple has verified their email address', ARRAY['email_verified'], 1, 1),
('couple', 2, 'Wedding Date Set', 'Couple has set their wedding date', ARRAY['wedding_date_set'], 1, 3),
('couple', 3, 'Venue Added', 'Couple has added their wedding venue', ARRAY['venue_added'], 1, 7),
('couple', 4, 'Guest List Started', 'Couple has started building their guest list', ARRAY['guest_list_started'], 1, 14);

-- Create a function to calculate activation funnel data
CREATE OR REPLACE FUNCTION calculate_activation_funnel(
  user_type_param TEXT,
  start_date_param TIMESTAMPTZ,
  end_date_param TIMESTAMPTZ
)
RETURNS TABLE (
  stage_name TEXT,
  stage_order INTEGER,
  description TEXT,
  user_count BIGINT,
  conversion_rate NUMERIC,
  avg_hours_to_reach NUMERIC,
  overall_conversion NUMERIC
) AS $$
DECLARE
  total_signups BIGINT;
BEGIN
  -- Get total signups for the period
  SELECT COUNT(*) INTO total_signups
  FROM users u
  JOIN user_profiles up ON u.id = up.user_id
  WHERE up.user_type = user_type_param
    AND u.created_at BETWEEN start_date_param AND end_date_param;

  -- Return funnel data for each stage
  RETURN QUERY
  WITH stage_completions AS (
    SELECT 
      s.stage_name,
      s.stage_order,
      s.stage_description as description,
      COUNT(DISTINCT u.id) as users_completed,
      AVG(EXTRACT(EPOCH FROM (uae.created_at - u.created_at))/3600) as avg_hours
    FROM activation_stages s
    CROSS JOIN users u
    JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN user_activation_events uae ON u.id = uae.user_id 
      AND uae.event_name = ANY(s.required_events)
      AND uae.created_at <= u.created_at + (s.max_timeframe_days * INTERVAL '1 day')
    WHERE s.user_type = user_type_param
      AND up.user_type = user_type_param
      AND u.created_at BETWEEN start_date_param AND end_date_param
    GROUP BY s.stage_name, s.stage_order, s.stage_description
  )
  SELECT 
    sc.stage_name,
    sc.stage_order,
    sc.description,
    sc.users_completed as user_count,
    CASE 
      WHEN total_signups > 0 THEN ROUND((sc.users_completed::NUMERIC / total_signups) * 100, 2)
      ELSE 0 
    END as conversion_rate,
    COALESCE(sc.avg_hours, 0) as avg_hours_to_reach,
    CASE 
      WHEN total_signups > 0 THEN ROUND((sc.users_completed::NUMERIC / total_signups) * 100, 2)
      ELSE 0 
    END as overall_conversion
  FROM stage_completions sc
  ORDER BY sc.stage_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at timestamp on activation_stages
CREATE OR REPLACE FUNCTION update_activation_stages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_activation_stages_updated_at
  BEFORE UPDATE ON activation_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_activation_stages_updated_at();

-- Add users.activated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'activated_at'
  ) THEN
    ALTER TABLE users ADD COLUMN activated_at TIMESTAMPTZ NULL;
    CREATE INDEX idx_users_activated_at ON users(activated_at);
  END IF;
END $$;

-- Create a view for easy activation metrics querying
CREATE OR REPLACE VIEW activation_metrics AS
SELECT 
  up.user_type,
  COUNT(*) as total_users,
  COUNT(u.activated_at) as activated_users,
  ROUND(
    CASE 
      WHEN COUNT(*) > 0 THEN (COUNT(u.activated_at)::NUMERIC / COUNT(*)) * 100 
      ELSE 0 
    END, 2
  ) as activation_rate,
  AVG(
    CASE 
      WHEN u.activated_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (u.activated_at - u.created_at))/86400 
      ELSE NULL 
    END
  ) as avg_days_to_activation
FROM users u
JOIN user_profiles up ON u.id = up.user_id
WHERE u.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY up.user_type;

COMMENT ON TABLE user_activation_events IS 'Tracks individual user activation events for funnel analysis';
COMMENT ON TABLE activation_stages IS 'Defines activation stages and criteria for different user types';
COMMENT ON FUNCTION calculate_activation_funnel IS 'Calculates activation funnel metrics for a given user type and date range';
COMMENT ON VIEW activation_metrics IS 'Provides quick activation rate metrics for the last 30 days';