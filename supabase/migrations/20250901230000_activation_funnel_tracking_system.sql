-- WS-231 Activation Funnel Tracking System
-- Migration: Create activation funnel tracking tables and functions
-- Team A Backend Implementation  
-- Created: 2025-09-01

-- Activation events table - stores all user activation events
CREATE TABLE IF NOT EXISTS activation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  properties JSONB DEFAULT '{}',
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activation funnel definitions - configurable funnel steps
CREATE TABLE IF NOT EXISTS activation_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL, -- Array of step objects with requirements
  is_active BOOLEAN DEFAULT true,
  target_completion_hours INTEGER DEFAULT 168, -- 1 week default
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User activation status - current progress for each user
CREATE TABLE IF NOT EXISTS user_activation_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  funnel_id UUID NOT NULL REFERENCES activation_funnels(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 0,
  completed_steps JSONB DEFAULT '[]',
  activation_score INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, funnel_id)
);

-- Funnel analytics - aggregated performance metrics
CREATE TABLE IF NOT EXISTS funnel_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES activation_funnels(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  users_entered INTEGER DEFAULT 0,
  users_completed INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0.00,
  avg_time_to_complete INTEGER, -- in hours
  drop_off_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(funnel_id, date, step_number)
);

-- Activation alerts - automated drop-off alerts
CREATE TABLE IF NOT EXISTS activation_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES activation_funnels(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('drop_off', 'slow_progress', 'stalled')),
  trigger_conditions JSONB NOT NULL,
  notification_channels JSONB DEFAULT '[]', -- email, slack, in-app
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User alert history - track which alerts were sent
CREATE TABLE IF NOT EXISTS user_alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_id UUID NOT NULL REFERENCES activation_alerts(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  channel TEXT NOT NULL,
  message_id TEXT,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

-- Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_activation_events_user ON activation_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activation_events_org ON activation_events(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activation_events_type ON activation_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activation_events_session ON activation_events(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activation_user ON user_activation_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activation_org ON user_activation_status(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_activation_funnel ON user_activation_status(funnel_id);
CREATE INDEX IF NOT EXISTS idx_user_activation_score ON user_activation_status(activation_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_activation_last_activity ON user_activation_status(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_funnel_analytics_funnel ON funnel_analytics(funnel_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_analytics_date ON funnel_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_analytics_conversion ON funnel_analytics(conversion_rate DESC);

CREATE INDEX IF NOT EXISTS idx_user_alert_history_user ON user_alert_history(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_alert_history_alert ON user_alert_history(alert_id, sent_at DESC);

-- Enable Row Level Security
ALTER TABLE activation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activation_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alert_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- activation_events policies
CREATE POLICY "Users can view their own activation events"
  ON activation_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activation events"
  ON activation_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Organization admins can view all events"
  ON activation_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.organization_id = activation_events.organization_id
      AND up.role IN ('admin', 'owner')
    )
  );

-- activation_funnels policies (admin only)
CREATE POLICY "Admins can manage funnels"
  ON activation_funnels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'owner', 'super_admin')
    )
  );

-- user_activation_status policies
CREATE POLICY "Users can view their own activation status"
  ON user_activation_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can update activation status"
  ON user_activation_status FOR ALL
  USING (true); -- Will be restricted via API authentication

CREATE POLICY "Organization admins can view all status"
  ON user_activation_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.organization_id = user_activation_status.organization_id
      AND up.role IN ('admin', 'owner')
    )
  );

-- funnel_analytics policies (admin only)
CREATE POLICY "Admins can view analytics"
  ON funnel_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'owner', 'super_admin')
    )
  );

-- activation_alerts policies (admin only)
CREATE POLICY "Admins can manage alerts"
  ON activation_alerts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'owner', 'super_admin')
    )
  );

-- user_alert_history policies
CREATE POLICY "Users can view their alert history"
  ON user_alert_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert alert history"
  ON user_alert_history FOR INSERT
  WITH CHECK (true); -- Will be restricted via API authentication

-- Insert default activation funnel
INSERT INTO activation_funnels (name, description, steps) VALUES (
  'Wedding Vendor Activation',
  'Standard activation funnel for wedding vendors on WedSync',
  '[
    {
      "step": 1,
      "name": "Account Created",
      "event_type": "signup_completed",
      "points": 10,
      "required": true,
      "description": "User completes account registration"
    },
    {
      "step": 2,
      "name": "Onboarding Completed", 
      "event_type": "onboarding_completed",
      "points": 20,
      "required": true,
      "description": "User finishes initial setup wizard"
    },
    {
      "step": 3,
      "name": "First Client Import",
      "event_type": "client_imported",
      "points": 25,
      "required": true,
      "description": "User imports their first client data"
    },
    {
      "step": 4,
      "name": "First Form Sent",
      "event_type": "form_sent",
      "points": 25,
      "required": true,
      "description": "User sends their first form to a client"
    },
    {
      "step": 5,
      "name": "First Response Received",
      "event_type": "response_received",
      "points": 15,
      "required": false,
      "description": "Client responds to a form"
    },
    {
      "step": 6,
      "name": "Automation Setup",
      "event_type": "automation_created",
      "points": 5,
      "required": false,
      "description": "User creates their first automation"
    }
  ]'::jsonb
);

-- Function to calculate activation score
CREATE OR REPLACE FUNCTION calculate_activation_score(
  p_user_id UUID,
  p_funnel_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_funnel_steps JSONB;
  v_step JSONB;
  v_completed_events INTEGER;
BEGIN
  -- Get funnel steps
  SELECT steps INTO v_funnel_steps 
  FROM activation_funnels 
  WHERE id = p_funnel_id;
  
  -- Loop through each step and check if user completed it
  FOR v_step IN SELECT * FROM jsonb_array_elements(v_funnel_steps)
  LOOP
    SELECT COUNT(*) INTO v_completed_events
    FROM activation_events 
    WHERE user_id = p_user_id 
    AND event_type = (v_step->>'event_type')
    AND created_at >= NOW() - INTERVAL '30 days'; -- Only count recent events
    
    IF v_completed_events > 0 THEN
      v_score := v_score + COALESCE((v_step->>'points')::INTEGER, 0);
    END IF;
  END LOOP;
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user activation status
CREATE OR REPLACE FUNCTION update_user_activation_status(
  p_user_id UUID,
  p_organization_id UUID
) RETURNS VOID AS $$
DECLARE
  v_funnel_id UUID;
  v_score INTEGER;
  v_current_step INTEGER := 0;
  v_completed_steps JSONB := '[]'::jsonb;
  v_funnel_steps JSONB;
  v_step JSONB;
  v_step_number INTEGER;
  v_completed_events INTEGER;
BEGIN
  -- Get active funnel
  SELECT id, steps INTO v_funnel_id, v_funnel_steps
  FROM activation_funnels 
  WHERE is_active = true 
  LIMIT 1;
  
  -- Calculate current score
  v_score := calculate_activation_score(p_user_id, v_funnel_id);
  
  -- Determine current step and completed steps
  FOR v_step IN SELECT * FROM jsonb_array_elements(v_funnel_steps)
  LOOP
    v_step_number := (v_step->>'step')::INTEGER;
    
    SELECT COUNT(*) INTO v_completed_events
    FROM activation_events 
    WHERE user_id = p_user_id 
    AND event_type = (v_step->>'event_type')
    AND created_at >= NOW() - INTERVAL '30 days';
    
    IF v_completed_events > 0 THEN
      v_completed_steps := v_completed_steps || to_jsonb(v_step_number);
      IF v_step_number > v_current_step THEN
        v_current_step := v_step_number;
      END IF;
    END IF;
  END LOOP;
  
  -- Insert or update user activation status
  INSERT INTO user_activation_status (
    user_id, 
    organization_id, 
    funnel_id, 
    current_step, 
    completed_steps, 
    activation_score,
    last_activity_at,
    completed_at
  ) VALUES (
    p_user_id,
    p_organization_id,
    v_funnel_id,
    v_current_step,
    v_completed_steps,
    v_score,
    NOW(),
    CASE WHEN v_score >= 100 THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, funnel_id) 
  DO UPDATE SET
    current_step = EXCLUDED.current_step,
    completed_steps = EXCLUDED.completed_steps,
    activation_score = EXCLUDED.activation_score,
    last_activity_at = EXCLUDED.last_activity_at,
    completed_at = EXCLUDED.completed_at,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update activation status when events are inserted
CREATE OR REPLACE FUNCTION trigger_update_activation_status()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_user_activation_status(NEW.user_id, NEW.organization_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_activation_status_trigger
  AFTER INSERT ON activation_events
  FOR EACH ROW EXECUTE FUNCTION trigger_update_activation_status();

-- Function to generate daily analytics
CREATE OR REPLACE FUNCTION generate_daily_funnel_analytics(p_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
  v_funnel_id UUID;
  v_funnel_steps JSONB;
  v_step JSONB;
  v_step_number INTEGER;
  v_step_name TEXT;
  v_users_entered INTEGER;
  v_users_completed INTEGER;
  v_conversion_rate DECIMAL;
BEGIN
  -- Get active funnel
  SELECT id, steps INTO v_funnel_id, v_funnel_steps
  FROM activation_funnels 
  WHERE is_active = true 
  LIMIT 1;
  
  -- Process each funnel step
  FOR v_step IN SELECT * FROM jsonb_array_elements(v_funnel_steps)
  LOOP
    v_step_number := (v_step->>'step')::INTEGER;
    v_step_name := v_step->>'name';
    
    -- Count users who entered this step
    SELECT COUNT(DISTINCT ae.user_id) INTO v_users_entered
    FROM activation_events ae
    WHERE ae.event_type = (v_step->>'event_type')
    AND ae.created_at::date <= p_date;
    
    -- Count users who completed this step on this date
    SELECT COUNT(DISTINCT ae.user_id) INTO v_users_completed
    FROM activation_events ae
    WHERE ae.event_type = (v_step->>'event_type')
    AND ae.created_at::date = p_date;
    
    -- Calculate conversion rate
    IF v_users_entered > 0 THEN
      v_conversion_rate := (v_users_completed::DECIMAL / v_users_entered::DECIMAL) * 100;
    ELSE
      v_conversion_rate := 0;
    END IF;
    
    -- Insert or update analytics record
    INSERT INTO funnel_analytics (
      funnel_id,
      date,
      step_number,
      step_name,
      users_entered,
      users_completed,
      conversion_rate
    ) VALUES (
      v_funnel_id,
      p_date,
      v_step_number,
      v_step_name,
      v_users_entered,
      v_users_completed,
      v_conversion_rate
    )
    ON CONFLICT (funnel_id, date, step_number)
    DO UPDATE SET
      users_entered = EXCLUDED.users_entered,
      users_completed = EXCLUDED.users_completed,
      conversion_rate = EXCLUDED.conversion_rate,
      updated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE activation_events IS 'Stores all user activation events for funnel tracking';
COMMENT ON TABLE activation_funnels IS 'Defines activation funnel steps and scoring configuration';
COMMENT ON TABLE user_activation_status IS 'Tracks current activation progress for each user';
COMMENT ON TABLE funnel_analytics IS 'Aggregated daily analytics for funnel performance';
COMMENT ON TABLE activation_alerts IS 'Configuration for automated drop-off alerts';
COMMENT ON TABLE user_alert_history IS 'History of alerts sent to users';

COMMENT ON FUNCTION calculate_activation_score IS 'Calculates activation score for a user based on completed events';
COMMENT ON FUNCTION update_user_activation_status IS 'Updates user activation status after events';
COMMENT ON FUNCTION generate_daily_funnel_analytics IS 'Generates daily funnel analytics data';