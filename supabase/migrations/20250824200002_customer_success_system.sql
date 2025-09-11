-- WS-133: Customer Success System Database Schema
-- Comprehensive customer success platform for user onboarding, retention, and success metrics tracking

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customer Success Configurations Table
CREATE TABLE customer_success_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  onboarding_flow_id VARCHAR(255) NOT NULL,
  current_stage VARCHAR(50) NOT NULL DEFAULT 'welcome' CHECK (current_stage IN ('welcome', 'setup', 'first_use', 'advanced', 'mastery', 'success')),
  completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  health_score INTEGER NOT NULL DEFAULT 50 CHECK (health_score >= 0 AND health_score <= 100),
  success_milestones_achieved INTEGER NOT NULL DEFAULT 0,
  engagement_level VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (engagement_level IN ('low', 'medium', 'high', 'champion')),
  at_risk_score INTEGER NOT NULL DEFAULT 0 CHECK (at_risk_score >= 0 AND at_risk_score <= 100),
  next_milestone_due TIMESTAMP WITH TIME ZONE,
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Health Score History Table
CREATE TABLE health_score_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  overall_health_score INTEGER NOT NULL CHECK (overall_health_score >= 0 AND overall_health_score <= 100),
  onboarding_completion INTEGER NOT NULL CHECK (onboarding_completion >= 0 AND onboarding_completion <= 100),
  feature_adoption_breadth INTEGER NOT NULL CHECK (feature_adoption_breadth >= 0 AND feature_adoption_breadth <= 100),
  feature_adoption_depth INTEGER NOT NULL CHECK (feature_adoption_depth >= 0 AND feature_adoption_depth <= 100),
  engagement_frequency INTEGER NOT NULL CHECK (engagement_frequency >= 0 AND engagement_frequency <= 100),
  engagement_quality INTEGER NOT NULL CHECK (engagement_quality >= 0 AND engagement_quality <= 100),
  success_milestone_progress INTEGER NOT NULL CHECK (success_milestone_progress >= 0 AND success_milestone_progress <= 100),
  support_interaction_quality INTEGER NOT NULL CHECK (support_interaction_quality >= 0 AND support_interaction_quality <= 100),
  platform_value_realization INTEGER NOT NULL CHECK (platform_value_realization >= 0 AND platform_value_realization <= 100),
  retention_indicators INTEGER NOT NULL CHECK (retention_indicators >= 0 AND retention_indicators <= 100),
  growth_trajectory INTEGER NOT NULL CHECK (growth_trajectory >= 0 AND growth_trajectory <= 100),
  churn_risk_score INTEGER NOT NULL DEFAULT 0 CHECK (churn_risk_score >= 0 AND churn_risk_score <= 100),
  risk_level VARCHAR(20) NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Customer Health Scores Table (Current State)
CREATE TABLE customer_health_scores (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  component_scores JSONB NOT NULL DEFAULT '{}',
  trend VARCHAR(20) NOT NULL DEFAULT 'stable' CHECK (trend IN ('improving', 'stable', 'declining', 'volatile')),
  risk_factors JSONB NOT NULL DEFAULT '[]',
  improvement_recommendations JSONB NOT NULL DEFAULT '[]',
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Milestone Definitions Table
CREATE TABLE milestone_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  milestone_type VARCHAR(50) NOT NULL CHECK (milestone_type IN ('onboarding', 'feature_adoption', 'engagement', 'business_growth', 'expertise', 'collaboration', 'optimization', 'innovation')),
  milestone_category VARCHAR(50) NOT NULL CHECK (milestone_category IN ('getting_started', 'core_features', 'advanced_features', 'integration', 'workflow_optimization', 'team_collaboration', 'business_growth', 'platform_mastery')),
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  success_criteria JSONB NOT NULL DEFAULT '[]',
  business_value TEXT NOT NULL,
  user_benefit TEXT NOT NULL,
  celebration_message TEXT NOT NULL,
  points_value INTEGER NOT NULL DEFAULT 0 CHECK (points_value >= 0),
  difficulty_level VARCHAR(20) NOT NULL DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  estimated_time_hours DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  prerequisites JSONB NOT NULL DEFAULT '[]',
  follow_up_milestones JSONB NOT NULL DEFAULT '[]',
  auto_tracking BOOLEAN NOT NULL DEFAULT false,
  tracking_events JSONB NOT NULL DEFAULT '[]',
  reward_config JSONB DEFAULT NULL,
  user_type VARCHAR(50) NOT NULL DEFAULT 'all',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Success Milestones Table (User-specific instances)
CREATE TABLE success_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  milestone_definition_id UUID REFERENCES milestone_definitions(id) ON DELETE CASCADE,
  milestone_name VARCHAR(255) NOT NULL,
  milestone_type VARCHAR(50) NOT NULL,
  milestone_category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  success_criteria JSONB NOT NULL DEFAULT '[]',
  points_value INTEGER NOT NULL DEFAULT 0,
  business_impact TEXT,
  celebration_message TEXT,
  achieved BOOLEAN NOT NULL DEFAULT false,
  achieved_at TIMESTAMP WITH TIME ZONE,
  time_to_achieve_hours DECIMAL(8,2),
  next_suggested_milestone VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User Milestones Table (Enhanced tracking)
CREATE TABLE user_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  milestone_definition_id UUID NOT NULL REFERENCES milestone_definitions(id) ON DELETE CASCADE,
  milestone_name VARCHAR(255) NOT NULL,
  milestone_type VARCHAR(50) NOT NULL,
  milestone_category VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'available', 'in_progress', 'completed', 'failed', 'expired', 'locked')),
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  current_step INTEGER NOT NULL DEFAULT 0,
  total_steps INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_to_complete_hours DECIMAL(8,2),
  completion_method VARCHAR(20) NOT NULL DEFAULT 'automatic' CHECK (completion_method IN ('automatic', 'manual', 'verified')),
  evidence_data JSONB DEFAULT '{}',
  celebration_shown BOOLEAN NOT NULL DEFAULT false,
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
  feedback TEXT,
  next_suggested_milestones JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, milestone_definition_id)
);

-- Milestone Progress Tracking Table
CREATE TABLE milestone_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES user_milestones(id) ON DELETE CASCADE,
  step_name VARCHAR(255) NOT NULL,
  step_order INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  evidence_type VARCHAR(50) CHECK (evidence_type IN ('action', 'data', 'verification', 'time_based')),
  evidence_value JSONB DEFAULT '{}',
  auto_detected BOOLEAN NOT NULL DEFAULT false,
  manual_verification_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(milestone_id, step_name)
);

-- Milestone Events Table
CREATE TABLE milestone_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES user_milestones(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trigger Definitions Table
CREATE TABLE trigger_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  trigger_category VARCHAR(50) NOT NULL CHECK (trigger_category IN ('onboarding', 'feature_adoption', 'engagement_recovery', 'milestone_celebration', 'at_risk_intervention', 'success_expansion', 'retention_focus', 'feedback_collection')),
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('welcome_sequence', 'progress_nudge', 'feature_highlight', 'milestone_reward', 'check_in', 'intervention', 'celebration', 'education', 'feedback_request')),
  conditions JSONB NOT NULL DEFAULT '[]',
  actions JSONB NOT NULL DEFAULT '[]',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  frequency_limit JSONB DEFAULT '{}',
  target_audience JSONB DEFAULT '{}',
  a_b_test_config JSONB DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  effectiveness_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User Trigger Instances Table
CREATE TABLE user_trigger_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  trigger_definition_id UUID NOT NULL REFERENCES trigger_definitions(id) ON DELETE CASCADE,
  trigger_name VARCHAR(255) NOT NULL,
  trigger_category VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'triggered', 'in_progress', 'completed', 'failed', 'cancelled', 'expired')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  triggered_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  condition_data JSONB NOT NULL DEFAULT '{}',
  action_results JSONB NOT NULL DEFAULT '[]',
  user_response JSONB DEFAULT NULL,
  effectiveness_score INTEGER CHECK (effectiveness_score >= 0 AND effectiveness_score <= 100),
  next_trigger_eligible_at TIMESTAMP WITH TIME ZONE,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Engagement Triggers Table (Legacy compatibility)
CREATE TABLE engagement_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  trigger_type VARCHAR(50) NOT NULL,
  trigger_condition JSONB NOT NULL DEFAULT '{}',
  action_type VARCHAR(50) NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'triggered', 'completed', 'paused')),
  last_triggered TIMESTAMP WITH TIME ZONE,
  next_trigger_due TIMESTAMP WITH TIME ZONE,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  success_rate DECIMAL(5,2) NOT NULL DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trigger Response Analytics Table
CREATE TABLE trigger_response_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger_instance_id UUID NOT NULL REFERENCES user_trigger_instances(id) ON DELETE CASCADE,
  response_type VARCHAR(20) NOT NULL CHECK (response_type IN ('positive', 'negative', 'neutral', 'no_response')),
  response_time_minutes INTEGER,
  interaction_data JSONB DEFAULT '{}',
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Customer Success Events Table
CREATE TABLE customer_success_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Onboarding Workflows Table
CREATE TABLE onboarding_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  user_type VARCHAR(50) NOT NULL,
  stages JSONB NOT NULL DEFAULT '[]',
  success_criteria JSONB NOT NULL DEFAULT '{}',
  automation_rules JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_customer_success_configs_user_id ON customer_success_configs(user_id);
CREATE INDEX idx_customer_success_configs_org_id ON customer_success_configs(organization_id);
CREATE INDEX idx_customer_success_configs_health_score ON customer_success_configs(health_score);
CREATE INDEX idx_customer_success_configs_at_risk ON customer_success_configs(at_risk_score) WHERE at_risk_score > 70;

CREATE INDEX idx_health_score_history_user_id ON health_score_history(user_id);
CREATE INDEX idx_health_score_history_calculated_at ON health_score_history(calculated_at);
CREATE INDEX idx_health_score_history_overall_score ON health_score_history(overall_health_score);

CREATE INDEX idx_customer_health_scores_overall_score ON customer_health_scores(overall_score);
CREATE INDEX idx_customer_health_scores_trend ON customer_health_scores(trend);

CREATE INDEX idx_success_milestones_user_id ON success_milestones(user_id);
CREATE INDEX idx_success_milestones_achieved ON success_milestones(achieved);
CREATE INDEX idx_success_milestones_type ON success_milestones(milestone_type);
CREATE INDEX idx_success_milestones_achieved_at ON success_milestones(achieved_at);

CREATE INDEX idx_user_milestones_user_id ON user_milestones(user_id);
CREATE INDEX idx_user_milestones_status ON user_milestones(status);
CREATE INDEX idx_user_milestones_category ON user_milestones(milestone_category);
CREATE INDEX idx_user_milestones_completed_at ON user_milestones(completed_at);

CREATE INDEX idx_milestone_progress_milestone_id ON milestone_progress(milestone_id);
CREATE INDEX idx_milestone_progress_completed ON milestone_progress(completed);

CREATE INDEX idx_milestone_events_user_id ON milestone_events(user_id);
CREATE INDEX idx_milestone_events_event_type ON milestone_events(event_type);
CREATE INDEX idx_milestone_events_created_at ON milestone_events(created_at);

CREATE INDEX idx_trigger_definitions_active ON trigger_definitions(is_active) WHERE is_active = true;
CREATE INDEX idx_trigger_definitions_category ON trigger_definitions(trigger_category);
CREATE INDEX idx_trigger_definitions_type ON trigger_definitions(trigger_type);

CREATE INDEX idx_user_trigger_instances_user_id ON user_trigger_instances(user_id);
CREATE INDEX idx_user_trigger_instances_status ON user_trigger_instances(status);
CREATE INDEX idx_user_trigger_instances_scheduled_for ON user_trigger_instances(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_user_trigger_instances_triggered_at ON user_trigger_instances(triggered_at);

CREATE INDEX idx_engagement_triggers_user_id ON engagement_triggers(user_id);
CREATE INDEX idx_engagement_triggers_status ON engagement_triggers(status);
CREATE INDEX idx_engagement_triggers_next_trigger_due ON engagement_triggers(next_trigger_due);

CREATE INDEX idx_trigger_response_analytics_trigger_instance_id ON trigger_response_analytics(trigger_instance_id);
CREATE INDEX idx_trigger_response_analytics_response_type ON trigger_response_analytics(response_type);

CREATE INDEX idx_customer_success_events_user_id ON customer_success_events(user_id);
CREATE INDEX idx_customer_success_events_event_type ON customer_success_events(event_type);
CREATE INDEX idx_customer_success_events_created_at ON customer_success_events(created_at);

CREATE INDEX idx_onboarding_workflows_user_type ON onboarding_workflows(user_type);
CREATE INDEX idx_onboarding_workflows_active ON onboarding_workflows(is_active) WHERE is_active = true;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_customer_success_configs_updated_at BEFORE UPDATE ON customer_success_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_milestone_definitions_updated_at BEFORE UPDATE ON milestone_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_milestones_updated_at BEFORE UPDATE ON user_milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trigger_definitions_updated_at BEFORE UPDATE ON trigger_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_trigger_instances_updated_at BEFORE UPDATE ON user_trigger_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_engagement_triggers_updated_at BEFORE UPDATE ON engagement_triggers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_onboarding_workflows_updated_at BEFORE UPDATE ON onboarding_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create stored procedures for common operations

-- Function to increment milestone count
CREATE OR REPLACE FUNCTION increment_customer_milestone_count(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE customer_success_configs 
  SET success_milestones_achieved = success_milestones_achieved + 1,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate health score components
CREATE OR REPLACE FUNCTION calculate_user_health_score(p_user_id UUID)
RETURNS TABLE(
  onboarding_score INTEGER,
  feature_adoption_score INTEGER,
  engagement_score INTEGER,
  milestone_score INTEGER,
  overall_score INTEGER
) AS $$
DECLARE
  config_record RECORD;
  milestone_count INTEGER;
  engagement_avg DECIMAL;
BEGIN
  -- Get customer success config
  SELECT * INTO config_record 
  FROM customer_success_configs 
  WHERE user_id = p_user_id;

  -- Calculate milestone score
  SELECT COUNT(*) INTO milestone_count
  FROM success_milestones
  WHERE user_id = p_user_id AND achieved = true;

  -- Calculate engagement score (simplified)
  SELECT COALESCE(AVG(score), 50) INTO engagement_avg
  FROM client_engagement_scores
  WHERE client_id = p_user_id;

  -- Return calculated scores
  RETURN QUERY SELECT 
    config_record.completion_percentage as onboarding_score,
    LEAST(milestone_count * 10, 100) as feature_adoption_score,
    engagement_avg::INTEGER as engagement_score,
    LEAST(milestone_count * 15, 100) as milestone_score,
    ((config_record.completion_percentage * 0.3) + 
     (LEAST(milestone_count * 10, 100) * 0.25) + 
     (engagement_avg * 0.25) + 
     (LEAST(milestone_count * 15, 100) * 0.2))::INTEGER as overall_score;
END;
$$ LANGUAGE plpgsql;

-- Function to get at-risk users
CREATE OR REPLACE FUNCTION get_at_risk_users(p_organization_id UUID DEFAULT NULL)
RETURNS TABLE(
  user_id UUID,
  health_score INTEGER,
  at_risk_score INTEGER,
  last_activity TIMESTAMP WITH TIME ZONE,
  risk_factors TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    csc.user_id,
    csc.health_score,
    csc.at_risk_score,
    csc.last_activity,
    ARRAY['Low health score', 'Inactive'] as risk_factors
  FROM customer_success_configs csc
  WHERE (p_organization_id IS NULL OR csc.organization_id = p_organization_id)
    AND (csc.health_score < 60 OR csc.at_risk_score > 70)
  ORDER BY csc.at_risk_score DESC, csc.health_score ASC;
END;
$$ LANGUAGE plpgsql;

-- Insert default milestone definitions
INSERT INTO milestone_definitions (
  milestone_type, milestone_category, name, description, success_criteria,
  business_value, user_benefit, celebration_message, points_value, 
  difficulty_level, estimated_time_hours, auto_tracking, tracking_events, user_type
) VALUES 
(
  'onboarding', 'getting_started', 'Complete Profile Setup',
  'Set up your complete profile with all necessary information',
  '[{"criteria_type": "data", "description": "Profile is 100% complete", "target_value": 100, "measurement_method": "profile_completion_percentage", "auto_trackable": true, "weight": 0.6}, {"criteria_type": "action", "description": "Avatar uploaded", "measurement_method": "avatar_exists", "auto_trackable": true, "weight": 0.4}]',
  'Higher user engagement and personalized experience',
  'Unlock all platform features and personalization',
  '🎉 Welcome to WedSync! Your profile is now complete and ready to go!',
  100, 'beginner', 0.5, true, '["profile_updated", "avatar_uploaded"]', 'all'
),
(
  'feature_adoption', 'core_features', 'Create First Project',
  'Create your first wedding project or client in the system',
  '[{"criteria_type": "action", "description": "Project created with basic details", "measurement_method": "project_count", "target_value": 1, "auto_trackable": true, "weight": 1.0}]',
  'User begins active platform usage',
  'Start organizing your wedding projects efficiently',
  '🚀 Fantastic! Your first project is ready. You are on your way to wedding success!',
  200, 'beginner', 1.0, true, '["project_created"]', 'all'
),
(
  'feature_adoption', 'core_features', 'Add First Client',
  'Add your first wedding client to start managing their journey',
  '[{"criteria_type": "action", "description": "Client added with wedding date", "measurement_method": "client_count", "target_value": 1, "auto_trackable": true, "weight": 0.8}, {"criteria_type": "data", "description": "Wedding date is set", "measurement_method": "wedding_date_set", "auto_trackable": true, "weight": 0.2}]',
  'Platform value realization begins',
  'Start managing your first wedding client professionally',
  '💍 Excellent! Your client management journey has begun!',
  250, 'beginner', 1.5, true, '["client_created"]', 'wedding_planner'
),
(
  'engagement', 'getting_started', 'Complete First Week',
  'Stay active for your first week on the platform',
  '[{"criteria_type": "time", "description": "7 days of activity", "target_value": 7, "measurement_method": "days_active", "auto_trackable": true, "weight": 0.7}, {"criteria_type": "metric", "description": "Multiple feature usage", "measurement_method": "features_used_count", "target_value": 3, "auto_trackable": true, "weight": 0.3}]',
  'Increased retention likelihood',
  'Build momentum and establish platform habits',
  '🌟 One week down! You are building great momentum!',
  150, 'beginner', 168.0, true, '["daily_activity", "feature_used"]', 'all'
);

-- Insert default trigger definitions  
INSERT INTO trigger_definitions (
  name, description, trigger_category, trigger_type, conditions, actions, 
  priority, frequency_limit, target_audience, is_active
) VALUES
(
  'Welcome Sequence',
  'Welcome new users and guide them through initial setup',
  'onboarding', 'welcome_sequence',
  '[{"condition_type": "behavior_based", "field_path": "user_data.created_at", "operator": "less_than", "value": "24h", "weight": 1.0, "is_required": true}]',
  '[{"action_id": "welcome_email", "action_type": "email", "action_config": {"template": "welcome_onboarding", "personalization": true}, "delay_minutes": 5}]',
  'high', '{"max_per_user": 1}', '{"user_types": ["all"]}', true
),
(
  'Progress Check-in',
  'Check in with users who have stalled in onboarding',
  'onboarding', 'progress_nudge', 
  '[{"condition_type": "time_based", "field_path": "user_data.last_activity", "operator": "greater_than", "value": "3d", "weight": 1.0, "is_required": true}, {"condition_type": "score_based", "field_path": "user_data.completion_percentage", "operator": "less_than", "value": 50, "weight": 0.8, "is_required": false}]',
  '[{"action_id": "progress_notification", "action_type": "in_app_notification", "action_config": {"message": "Need help getting started? We are here to help!", "action_button": "Get Help", "action_url": "/help/onboarding"}, "delay_minutes": 0}]',
  'medium', '{"max_per_week": 1, "min_hours_between": 72}', '{"health_score_range": {"min": 0, "max": 60}}', true
),
(
  'Milestone Celebration',
  'Celebrate user milestone achievements',
  'milestone_celebration', 'celebration',
  '[{"condition_type": "milestone_based", "field_path": "event_data.milestone_achieved", "operator": "exists", "value": true, "weight": 1.0, "is_required": true}]',
  '[{"action_id": "celebration_animation", "action_type": "celebration_animation", "action_config": {"animation": "confetti", "sound": true}, "delay_minutes": 0}, {"action_id": "celebration_email", "action_type": "email", "action_config": {"template": "milestone_celebration", "personalization": true}, "delay_minutes": 10}]',
  'high', '{"max_per_day": 5}', '{"user_types": ["all"]}', true
);

-- Insert default onboarding workflow
INSERT INTO onboarding_workflows (
  name, description, user_type, stages, success_criteria, automation_rules
) VALUES (
  'Wedding Planner Onboarding',
  'Comprehensive onboarding flow for wedding planning professionals',
  'wedding_planner',
  '[{"stage_name": "welcome", "title": "Welcome to WedSync", "description": "Get started with your account setup", "tasks": ["complete_profile", "upload_avatar"], "estimated_time_minutes": 15}, {"stage_name": "setup", "title": "Initial Setup", "description": "Configure your workspace and preferences", "tasks": ["business_profile", "service_setup"], "estimated_time_minutes": 30}, {"stage_name": "first_use", "title": "Create Your First Project", "description": "Set up your first wedding project", "tasks": ["create_project", "add_client"], "estimated_time_minutes": 20}]',
  '{"completion_threshold_percentage": 90, "required_milestones": ["profile_setup", "first_project"], "time_limit_days": 14}',
  '[{"rule_name": "auto_progress", "trigger_event": "task_completed", "conditions": [{"field": "completion_percentage", "operator": "greater_than", "value": 80}], "actions": [{"action_type": "advance_stage"}]}]'
);

-- Create RLS policies
ALTER TABLE customer_success_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE success_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trigger_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_success_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_success_configs
CREATE POLICY "Users can view own success config" ON customer_success_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own success config" ON customer_success_configs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all configs" ON customer_success_configs FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for health_score_history
CREATE POLICY "Users can view own health history" ON health_score_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all health history" ON health_score_history FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for success_milestones  
CREATE POLICY "Users can view own milestones" ON success_milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own milestones" ON success_milestones FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all milestones" ON success_milestones FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for user_milestones
CREATE POLICY "Users can view own user milestones" ON user_milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own user milestones" ON user_milestones FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all user milestones" ON user_milestones FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for milestone_progress
CREATE POLICY "Users can view own milestone progress" ON milestone_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own milestone progress" ON milestone_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all milestone progress" ON milestone_progress FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for user_trigger_instances
CREATE POLICY "Users can view own trigger instances" ON user_trigger_instances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all trigger instances" ON user_trigger_instances FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for engagement_triggers
CREATE POLICY "Users can view own engagement triggers" ON engagement_triggers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all engagement triggers" ON engagement_triggers FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for customer_success_events
CREATE POLICY "Users can view own success events" ON customer_success_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all success events" ON customer_success_events FOR ALL USING (auth.role() = 'service_role');

-- Add helpful comments
COMMENT ON TABLE customer_success_configs IS 'Core customer success configuration and tracking for each user';
COMMENT ON TABLE health_score_history IS 'Historical health score data for trend analysis';
COMMENT ON TABLE customer_health_scores IS 'Current health scores with detailed component breakdown';
COMMENT ON TABLE milestone_definitions IS 'Reusable milestone definitions for different user types';
COMMENT ON TABLE success_milestones IS 'Legacy milestone tracking (kept for compatibility)';
COMMENT ON TABLE user_milestones IS 'Enhanced user-specific milestone instances with detailed tracking';
COMMENT ON TABLE milestone_progress IS 'Step-by-step progress tracking within milestones';
COMMENT ON TABLE trigger_definitions IS 'Configurable engagement trigger definitions';
COMMENT ON TABLE user_trigger_instances IS 'User-specific trigger executions and results';
COMMENT ON TABLE engagement_triggers IS 'Legacy trigger system (kept for compatibility)';
COMMENT ON TABLE customer_success_events IS 'Event tracking for customer success analytics';
COMMENT ON TABLE onboarding_workflows IS 'Structured onboarding workflows for different user types';