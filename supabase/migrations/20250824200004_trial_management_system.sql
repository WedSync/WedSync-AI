-- WS-132 Trial Management System Migration
-- 30-day trial system with milestone tracking and ROI calculation
-- Extends existing subscription system for trial-specific features

-- Trial Configurations Table
CREATE TABLE IF NOT EXISTS trial_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_type VARCHAR(50) NOT NULL CHECK (business_type IN (
    'wedding_planner', 'photographer', 'venue', 'florist', 'caterer', 
    'dj_band', 'videographer', 'coordinator', 'other'
  )),
  business_goals TEXT[] NOT NULL DEFAULT '{}',
  current_workflow_pain_points TEXT[] NOT NULL DEFAULT '{}',
  expected_time_savings_hours DECIMAL(8,2) NOT NULL DEFAULT 0,
  hourly_rate DECIMAL(8,2),
  trial_start TIMESTAMPTZ NOT NULL,
  trial_end TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'expired', 'converted', 'cancelled', 'suspended'
  )),
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one active trial per user
  CONSTRAINT unique_active_trial_per_user 
    EXCLUDE (user_id WITH =) WHERE (status = 'active')
);

-- Trial Feature Usage Tracking
CREATE TABLE IF NOT EXISTS trial_feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id UUID NOT NULL REFERENCES trial_configs(id) ON DELETE CASCADE,
  feature_key VARCHAR(100) NOT NULL,
  feature_name VARCHAR(200) NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 1,
  time_saved_minutes INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint for feature per trial
  CONSTRAINT unique_trial_feature UNIQUE (trial_id, feature_key)
);

-- Trial Milestones Tracking
CREATE TABLE IF NOT EXISTS trial_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id UUID NOT NULL REFERENCES trial_configs(id) ON DELETE CASCADE,
  milestone_type VARCHAR(50) NOT NULL CHECK (milestone_type IN (
    'first_client_connected', 'initial_journey_created', 'vendor_added',
    'guest_list_imported', 'timeline_created'
  )),
  milestone_name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  achieved BOOLEAN NOT NULL DEFAULT false,
  achieved_at TIMESTAMPTZ,
  time_to_achieve_hours DECIMAL(8,2),
  value_impact_score INTEGER NOT NULL DEFAULT 0 CHECK (value_impact_score BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint for milestone type per trial
  CONSTRAINT unique_trial_milestone UNIQUE (trial_id, milestone_type)
);

-- Trial Events for Analytics and Audit Trail
CREATE TABLE IF NOT EXISTS trial_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_id UUID NOT NULL REFERENCES trial_configs(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_trial_configs_user_id ON trial_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_configs_status ON trial_configs(status);
CREATE INDEX IF NOT EXISTS idx_trial_configs_trial_end ON trial_configs(trial_end);
CREATE INDEX IF NOT EXISTS idx_trial_configs_business_type ON trial_configs(business_type);

CREATE INDEX IF NOT EXISTS idx_trial_feature_usage_trial_id ON trial_feature_usage(trial_id);
CREATE INDEX IF NOT EXISTS idx_trial_feature_usage_feature_key ON trial_feature_usage(feature_key);
CREATE INDEX IF NOT EXISTS idx_trial_feature_usage_last_used ON trial_feature_usage(last_used_at DESC);

CREATE INDEX IF NOT EXISTS idx_trial_milestones_trial_id ON trial_milestones(trial_id);
CREATE INDEX IF NOT EXISTS idx_trial_milestones_type ON trial_milestones(milestone_type);
CREATE INDEX IF NOT EXISTS idx_trial_milestones_achieved ON trial_milestones(achieved);
CREATE INDEX IF NOT EXISTS idx_trial_milestones_achieved_at ON trial_milestones(achieved_at DESC);

CREATE INDEX IF NOT EXISTS idx_trial_events_user_id ON trial_events(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_events_trial_id ON trial_events(trial_id);
CREATE INDEX IF NOT EXISTS idx_trial_events_type ON trial_events(event_type);
CREATE INDEX IF NOT EXISTS idx_trial_events_created_at ON trial_events(created_at DESC);

-- Enable RLS on all trial tables
ALTER TABLE trial_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Trial Configs
CREATE POLICY "Users can view own trial configs" ON trial_configs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trial configs" ON trial_configs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trial configs" ON trial_configs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role full access trial configs" ON trial_configs
  FOR ALL TO service_role USING (true);

-- RLS Policies for Trial Feature Usage
CREATE POLICY "Users can view own trial feature usage" ON trial_feature_usage
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM trial_configs 
      WHERE trial_configs.id = trial_feature_usage.trial_id 
      AND trial_configs.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access trial feature usage" ON trial_feature_usage
  FOR ALL TO service_role USING (true);

-- RLS Policies for Trial Milestones
CREATE POLICY "Users can view own trial milestones" ON trial_milestones
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM trial_configs 
      WHERE trial_configs.id = trial_milestones.trial_id 
      AND trial_configs.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access trial milestones" ON trial_milestones
  FOR ALL TO service_role USING (true);

-- RLS Policies for Trial Events
CREATE POLICY "Users can view own trial events" ON trial_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role full access trial events" ON trial_events
  FOR ALL TO service_role USING (true);

-- Triggers for updated_at columns
CREATE TRIGGER update_trial_configs_updated_at 
  BEFORE UPDATE ON trial_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment feature usage count
CREATE OR REPLACE FUNCTION increment_feature_usage(
  p_trial_id UUID,
  p_feature_key TEXT,
  p_time_saved INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE trial_feature_usage 
  SET usage_count = usage_count + 1,
      time_saved_minutes = time_saved_minutes + p_time_saved,
      last_used_at = NOW()
  WHERE trial_id = p_trial_id AND feature_key = p_feature_key;
  
  -- If no row was updated, the upsert in the application will handle insertion
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trial ROI summary
CREATE OR REPLACE FUNCTION get_trial_roi_summary(p_trial_id UUID)
RETURNS TABLE (
  total_time_saved_hours DECIMAL,
  features_used_count INTEGER,
  milestones_achieved_count INTEGER,
  estimated_savings DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH feature_stats AS (
    SELECT 
      COALESCE(SUM(time_saved_minutes), 0)::DECIMAL / 60 as time_saved,
      COUNT(*)::INTEGER as features_count
    FROM trial_feature_usage
    WHERE trial_id = p_trial_id
  ),
  milestone_stats AS (
    SELECT COUNT(*)::INTEGER as milestones_count
    FROM trial_milestones
    WHERE trial_id = p_trial_id AND achieved = true
  ),
  trial_info AS (
    SELECT COALESCE(hourly_rate, 50) as rate
    FROM trial_configs
    WHERE id = p_trial_id
  )
  SELECT 
    fs.time_saved,
    fs.features_count,
    ms.milestones_count,
    fs.time_saved * ti.rate as estimated_savings
  FROM feature_stats fs, milestone_stats ms, trial_info ti;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if trial is expired
CREATE OR REPLACE FUNCTION is_trial_expired(p_trial_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trial_configs
    WHERE id = p_trial_id 
    AND trial_end < NOW()
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-expire trials (for scheduled job)
CREATE OR REPLACE FUNCTION expire_old_trials()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE trial_configs 
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'active' 
    AND trial_end < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Log expiration events
  INSERT INTO trial_events (user_id, trial_id, event_type, event_data)
  SELECT 
    user_id, 
    id, 
    'trial_auto_expired',
    jsonb_build_object('expired_at', NOW())
  FROM trial_configs 
  WHERE status = 'expired' 
    AND updated_at >= NOW() - INTERVAL '1 minute';
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active trial summary for dashboard
CREATE OR REPLACE FUNCTION get_user_trial_summary(p_user_id UUID)
RETURNS TABLE (
  trial_id UUID,
  days_remaining INTEGER,
  progress_percentage DECIMAL,
  milestones_achieved INTEGER,
  features_used INTEGER,
  estimated_savings DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.id,
    GREATEST(0, EXTRACT(DAY FROM tc.trial_end - NOW())::INTEGER),
    LEAST(100, (EXTRACT(DAY FROM NOW() - tc.trial_start) / 30.0 * 100)::DECIMAL),
    (SELECT COUNT(*)::INTEGER FROM trial_milestones WHERE trial_id = tc.id AND achieved = true),
    (SELECT COUNT(*)::INTEGER FROM trial_feature_usage WHERE trial_id = tc.id),
    (SELECT COALESCE(SUM(time_saved_minutes), 0)::DECIMAL / 60 * COALESCE(tc.hourly_rate, 50) 
     FROM trial_feature_usage WHERE trial_id = tc.id)
  FROM trial_configs tc
  WHERE tc.user_id = p_user_id 
    AND tc.status = 'active'
  ORDER BY tc.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create scheduled job for auto-expiring trials (requires pg_cron extension)
-- This would typically be set up separately in production:
-- SELECT cron.schedule('expire-trials', '0 */6 * * *', 'SELECT expire_old_trials();');

-- Table comments for documentation
COMMENT ON TABLE trial_configs IS 'Trial configurations with business context and timeline';
COMMENT ON TABLE trial_feature_usage IS 'Feature usage tracking with time savings for ROI calculation';
COMMENT ON TABLE trial_milestones IS 'Milestone achievements during trial period';
COMMENT ON TABLE trial_events IS 'Audit trail of all trial-related events and analytics';

-- Column comments for key fields
COMMENT ON COLUMN trial_configs.expected_time_savings_hours IS 'Expected weekly time savings based on business assessment';
COMMENT ON COLUMN trial_configs.hourly_rate IS 'User-provided hourly rate for ROI calculations';
COMMENT ON COLUMN trial_feature_usage.time_saved_minutes IS 'Cumulative time saved through feature usage';
COMMENT ON COLUMN trial_milestones.value_impact_score IS 'Business impact score (1-10) for ROI weighting';
COMMENT ON COLUMN trial_milestones.time_to_achieve_hours IS 'Time taken to achieve milestone for onboarding optimization';

-- Insert default milestone templates for new trials
-- These will be created programmatically by the TrialService