-- WS-236: User Feedback System Database Schema
-- Team: Team B (Backend)
-- Created: 2025-01-20
-- Purpose: Comprehensive feedback collection, NPS tracking, sentiment analysis, and analytics

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core feedback sessions table
-- Tracks all feedback collection sessions with comprehensive metadata
CREATE TABLE feedback_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('nps', 'csat', 'ces', 'feature', 'onboarding', 'churn', 'general')),
  trigger_reason TEXT NOT NULL,
  trigger_context JSONB DEFAULT '{}'::jsonb,
  
  -- Session lifecycle timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ,
  
  -- User context at time of feedback
  user_type TEXT NOT NULL CHECK (user_type IN ('supplier', 'couple')),
  user_tier TEXT NOT NULL CHECK (user_tier IN ('free', 'starter', 'professional', 'scale', 'enterprise')),
  account_age_days INTEGER NOT NULL,
  engagement_score DECIMAL(3,2) DEFAULT 0.00,
  
  -- Device and environment context
  device_type TEXT,
  browser TEXT,
  user_agent TEXT,
  session_duration_seconds INTEGER DEFAULT 0,
  page_url TEXT,
  
  -- Completion metadata
  questions_total INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  completion_rate DECIMAL(3,2) DEFAULT 0.00,
  
  -- AI analysis results
  overall_sentiment DECIMAL(3,2), -- -1.0 to 1.0 scale
  satisfaction_category TEXT CHECK (satisfaction_category IN ('very_dissatisfied', 'dissatisfied', 'neutral', 'satisfied', 'very_satisfied')),
  processed_at TIMESTAMPTZ,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_completion CHECK (completed_at IS NULL OR completed_at >= started_at),
  CONSTRAINT valid_abandonment CHECK (abandoned_at IS NULL OR abandoned_at >= started_at),
  CONSTRAINT valid_engagement_score CHECK (engagement_score >= 0.00 AND engagement_score <= 1.00),
  CONSTRAINT valid_completion_rate CHECK (completion_rate >= 0.00 AND completion_rate <= 1.00)
);

-- Individual feedback responses table
-- Stores each response within a feedback session
CREATE TABLE feedback_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES feedback_sessions(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('nps', 'rating', 'text', 'choice', 'boolean')),
  
  -- Response values (only one should be populated based on question_type)
  nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  rating_value INTEGER CHECK (rating_value >= 1 AND rating_value <= 5),
  text_value TEXT,
  choice_value TEXT,
  boolean_value BOOLEAN,
  
  -- Response metadata
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  time_to_respond_seconds INTEGER DEFAULT 0,
  question_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT FALSE,
  
  -- AI analysis results for text responses
  sentiment_score DECIMAL(3,2), -- -1.0 to 1.0 for text responses
  keywords TEXT[],
  themes TEXT[],
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints - ensure only one response value is set
  CONSTRAINT single_response_value CHECK (
    (nps_score IS NOT NULL)::int + 
    (rating_value IS NOT NULL)::int + 
    (text_value IS NOT NULL)::int + 
    (choice_value IS NOT NULL)::int + 
    (boolean_value IS NOT NULL)::int = 1
  ),
  CONSTRAINT valid_time_to_respond CHECK (time_to_respond_seconds >= 0)
);

-- NPS specific tracking table
-- Enhanced NPS survey tracking with wedding industry context
CREATE TABLE nps_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES feedback_sessions(id) ON DELETE SET NULL,
  
  -- Core NPS data
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  category TEXT NOT NULL CHECK (category IN ('detractor', 'passive', 'promoter')),
  feedback_text TEXT,
  
  -- Survey lifecycle
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  trigger_reason TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  
  -- Follow-up actions tracking
  follow_up_scheduled BOOLEAN DEFAULT FALSE,
  follow_up_completed BOOLEAN DEFAULT FALSE,
  follow_up_type TEXT CHECK (follow_up_type IN ('support_contact', 'thank_you_email', 'referral_invite', 'product_demo')),
  follow_up_scheduled_at TIMESTAMPTZ,
  follow_up_completed_at TIMESTAMPTZ,
  
  -- Wedding business context
  user_journey_stage TEXT CHECK (user_journey_stage IN ('onboarding', 'active', 'power_user', 'at_risk', 'churned')),
  recent_feature_usage JSONB DEFAULT '{}'::jsonb,
  recent_support_interactions INTEGER DEFAULT 0,
  vendor_type TEXT, -- For suppliers: photographer, planner, venue, etc.
  wedding_season_context TEXT CHECK (wedding_season_context IN ('peak', 'moderate', 'slow', 'off_season')),
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_completion CHECK (completed_at IS NULL OR completed_at >= triggered_at),
  CONSTRAINT valid_follow_up_schedule CHECK (
    (follow_up_scheduled = FALSE) OR 
    (follow_up_scheduled = TRUE AND follow_up_scheduled_at IS NOT NULL)
  )
);

-- Feature-specific feedback table
-- Detailed feedback collection for specific features with wedding context
CREATE TABLE feature_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES feedback_sessions(id) ON DELETE SET NULL,
  
  -- Feature identification
  feature_name TEXT NOT NULL,
  feature_version TEXT,
  usage_context TEXT,
  
  -- Multi-dimensional ratings
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  ease_of_use_rating INTEGER CHECK (ease_of_use_rating >= 1 AND ease_of_use_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
  
  -- Usage patterns
  usage_frequency TEXT CHECK (usage_frequency IN ('daily', 'weekly', 'monthly', 'rarely', 'first_time')),
  feature_discovery_method TEXT CHECK (feature_discovery_method IN ('tooltip', 'onboarding', 'exploration', 'support', 'documentation', 'other')),
  
  -- Detailed feedback
  liked_aspects TEXT,
  disliked_aspects TEXT,
  improvement_suggestions TEXT,
  missing_functionality TEXT,
  would_recommend BOOLEAN,
  
  -- Wedding industry specific context
  wedding_phase TEXT CHECK (wedding_phase IN ('planning', 'week_of', 'day_of', 'post_wedding')),
  vendor_type TEXT, -- For suppliers
  client_context TEXT, -- Additional wedding/client context
  business_impact_rating INTEGER CHECK (business_impact_rating >= 1 AND business_impact_rating <= 5),
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback triggers and rules configuration table
-- Configurable triggers for when to show feedback prompts
CREATE TABLE feedback_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_name TEXT UNIQUE NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('event', 'time', 'usage', 'milestone', 'behavior')),
  
  -- Trigger conditions
  event_name TEXT,
  condition_sql TEXT,
  condition_parameters JSONB DEFAULT '{}'::jsonb,
  
  -- Feedback configuration
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('nps', 'csat', 'ces', 'feature', 'onboarding', 'churn', 'general')),
  questions JSONB NOT NULL,
  sampling_rate DECIMAL(3,2) DEFAULT 1.00 CHECK (sampling_rate >= 0.00 AND sampling_rate <= 1.00),
  
  -- Rate limiting configuration
  min_days_between INTEGER DEFAULT 30,
  max_per_user_per_month INTEGER DEFAULT 2,
  
  -- User targeting
  target_user_types TEXT[] DEFAULT ARRAY['supplier', 'couple'],
  target_tiers TEXT[] DEFAULT ARRAY['free', 'starter', 'professional', 'scale', 'enterprise'],
  exclude_recent_feedback_days INTEGER DEFAULT 7,
  
  -- Wedding industry targeting
  target_vendor_types TEXT[], -- For supplier targeting
  target_wedding_phases TEXT[], -- For couples
  exclude_busy_seasons BOOLEAN DEFAULT FALSE,
  
  -- Status and metadata
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 5, -- 1-10 priority for multiple eligible triggers
  description TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 10),
  CONSTRAINT valid_max_per_month CHECK (max_per_user_per_month >= 0),
  CONSTRAINT valid_min_days CHECK (min_days_between >= 0)
);

-- Daily aggregated feedback analytics table
-- Pre-calculated metrics for dashboard performance
CREATE TABLE feedback_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  
  -- NPS metrics
  nps_score DECIMAL(5,2),
  nps_responses INTEGER DEFAULT 0,
  promoters_count INTEGER DEFAULT 0,
  passives_count INTEGER DEFAULT 0,
  detractors_count INTEGER DEFAULT 0,
  
  -- CSAT metrics
  csat_avg DECIMAL(3,2),
  csat_responses INTEGER DEFAULT 0,
  
  -- CES (Customer Effort Score) metrics
  ces_avg DECIMAL(3,2),
  ces_responses INTEGER DEFAULT 0,
  
  -- Sentiment analysis aggregates
  sentiment_avg DECIMAL(3,2),
  sentiment_positive INTEGER DEFAULT 0,
  sentiment_neutral INTEGER DEFAULT 0,
  sentiment_negative INTEGER DEFAULT 0,
  
  -- Response and completion metrics
  surveys_triggered INTEGER DEFAULT 0,
  surveys_completed INTEGER DEFAULT 0,
  surveys_abandoned INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0.00,
  avg_response_time_seconds DECIMAL(8,2),
  
  -- Segmentation metrics
  metrics_by_user_type JSONB DEFAULT '{}'::jsonb,
  metrics_by_tier JSONB DEFAULT '{}'::jsonb,
  metrics_by_feature JSONB DEFAULT '{}'::jsonb,
  metrics_by_vendor_type JSONB DEFAULT '{}'::jsonb,
  
  -- Trend analysis (vs previous period)
  nps_trend DECIMAL(5,2),
  csat_trend DECIMAL(5,2),
  sentiment_trend DECIMAL(5,2),
  volume_trend DECIMAL(5,2),
  
  -- Action items and insights
  top_issues JSONB DEFAULT '[]'::jsonb,
  improvement_opportunities JSONB DEFAULT '[]'::jsonb,
  positive_themes JSONB DEFAULT '[]'::jsonb,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(date)
);

-- Follow-up actions table
-- Track automated and manual follow-up actions based on feedback
CREATE TABLE feedback_follow_up_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES feedback_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'support_ticket', 'email_followup', 'referral_invite', 
    'feature_request', 'thank_you_note', 'improvement_survey',
    'retention_outreach', 'success_celebration'
  )),
  action_status TEXT DEFAULT 'pending' CHECK (action_status IN ('pending', 'in_progress', 'completed', 'cancelled', 'failed')),
  
  -- Trigger conditions
  trigger_sentiment_threshold DECIMAL(3,2),
  trigger_nps_score INTEGER,
  trigger_category TEXT,
  
  -- Action configuration
  action_config JSONB DEFAULT '{}'::jsonb,
  scheduled_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Results tracking
  execution_result TEXT,
  user_response TEXT,
  follow_up_successful BOOLEAN,
  
  -- Wedding context
  wedding_priority BOOLEAN DEFAULT FALSE, -- High priority for wedding-critical feedback
  vendor_escalation_needed BOOLEAN DEFAULT FALSE,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Performance indexes for optimal query performance
-- Session queries
CREATE INDEX idx_feedback_sessions_user_type ON feedback_sessions(user_id, session_type, started_at DESC);
CREATE INDEX idx_feedback_sessions_completion ON feedback_sessions(completed_at, completion_rate) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_feedback_sessions_user_tier ON feedback_sessions(user_tier, user_type, started_at DESC);
CREATE INDEX idx_feedback_sessions_sentiment ON feedback_sessions(overall_sentiment, satisfaction_category) WHERE overall_sentiment IS NOT NULL;

-- Response queries
CREATE INDEX idx_feedback_responses_session ON feedback_responses(session_id, question_order, responded_at);
CREATE INDEX idx_feedback_responses_type ON feedback_responses(question_type, sentiment_score) WHERE sentiment_score IS NOT NULL;

-- NPS queries
CREATE INDEX idx_nps_surveys_score_date ON nps_surveys(score, completed_at DESC) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_nps_surveys_user_recent ON nps_surveys(user_id, triggered_at DESC);
CREATE INDEX idx_nps_surveys_category ON nps_surveys(category, vendor_type, completed_at DESC);
CREATE INDEX idx_nps_surveys_follow_up ON nps_surveys(follow_up_scheduled, follow_up_completed) WHERE follow_up_scheduled = TRUE;

-- Feature feedback queries
CREATE INDEX idx_feature_feedback_feature ON feature_feedback(feature_name, satisfaction_rating, created_at DESC);
CREATE INDEX idx_feature_feedback_vendor ON feature_feedback(vendor_type, wedding_phase, satisfaction_rating);
CREATE INDEX idx_feature_feedback_ratings ON feature_feedback(satisfaction_rating, ease_of_use_rating, value_rating);

-- Trigger queries
CREATE INDEX idx_feedback_triggers_active ON feedback_triggers(is_active, trigger_type, priority DESC) WHERE is_active = TRUE;
CREATE INDEX idx_feedback_triggers_targeting ON feedback_triggers(target_user_types, target_tiers) WHERE is_active = TRUE;

-- Analytics queries
CREATE INDEX idx_feedback_analytics_date ON feedback_analytics_daily(date DESC);

-- Follow-up action queries
CREATE INDEX idx_feedback_follow_up_status ON feedback_follow_up_actions(action_status, scheduled_at) WHERE action_status != 'completed';
CREATE INDEX idx_feedback_follow_up_user ON feedback_follow_up_actions(user_id, action_type, created_at DESC);

-- GIN indexes for JSONB fields for complex queries
CREATE INDEX idx_feedback_sessions_context ON feedback_sessions USING GIN(trigger_context);
CREATE INDEX idx_feedback_responses_keywords ON feedback_responses USING GIN(keywords);
CREATE INDEX idx_feedback_responses_themes ON feedback_responses USING GIN(themes);
CREATE INDEX idx_nps_surveys_usage ON nps_surveys USING GIN(recent_feature_usage);
CREATE INDEX idx_feedback_triggers_params ON feedback_triggers USING GIN(condition_parameters);
CREATE INDEX idx_feedback_analytics_segments ON feedback_analytics_daily USING GIN(metrics_by_user_type);

-- Full-text search indexes for text content analysis
CREATE INDEX idx_feedback_text_search ON feedback_responses USING GIN(to_tsvector('english', text_value)) WHERE text_value IS NOT NULL;
CREATE INDEX idx_nps_feedback_search ON nps_surveys USING GIN(to_tsvector('english', feedback_text)) WHERE feedback_text IS NOT NULL;

-- Utility functions for feedback analysis
CREATE OR REPLACE FUNCTION calculate_nps_score(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE,
  user_type_filter TEXT DEFAULT NULL,
  vendor_type_filter TEXT DEFAULT NULL
) RETURNS TABLE(
  nps_score DECIMAL(5,2),
  total_responses INTEGER,
  promoters INTEGER,
  passives INTEGER,
  detractors INTEGER,
  response_rate DECIMAL(5,2)
) AS $$
DECLARE
  total_surveys INTEGER;
  triggered_surveys INTEGER;
BEGIN
  -- Get survey counts
  SELECT 
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL),
    COUNT(*) FILTER (WHERE ns.score >= 9),
    COUNT(*) FILTER (WHERE ns.score >= 7 AND ns.score <= 8),
    COUNT(*) FILTER (WHERE ns.score <= 6),
    COUNT(*)
  FROM nps_surveys ns
  WHERE ns.triggered_at::DATE BETWEEN start_date AND end_date
    AND (user_type_filter IS NULL OR EXISTS (
      SELECT 1 FROM feedback_sessions fs 
      WHERE fs.id = ns.session_id AND fs.user_type = user_type_filter
    ))
    AND (vendor_type_filter IS NULL OR ns.vendor_type = vendor_type_filter)
  INTO total_responses, promoters, passives, detractors, triggered_surveys;

  -- Calculate NPS score
  IF total_responses > 0 THEN
    nps_score := ROUND(((promoters::DECIMAL - detractors::DECIMAL) / total_responses::DECIMAL) * 100, 2);
    response_rate := ROUND((total_responses::DECIMAL / triggered_surveys::DECIMAL) * 100, 2);
  ELSE
    nps_score := NULL;
    response_rate := 0.00;
  END IF;

  RETURN QUERY SELECT 
    calculate_nps_score.nps_score,
    calculate_nps_score.total_responses,
    calculate_nps_score.promoters,
    calculate_nps_score.passives,
    calculate_nps_score.detractors,
    calculate_nps_score.response_rate;
END;
$$ LANGUAGE plpgsql;

-- Function to get feedback eligibility for a user
CREATE OR REPLACE FUNCTION check_feedback_eligibility(
  target_user_id UUID,
  feedback_type_param TEXT
) RETURNS TABLE(
  eligible BOOLEAN,
  reason TEXT,
  next_eligible_date TIMESTAMPTZ,
  recent_feedback_count INTEGER
) AS $$
DECLARE
  user_account_age INTEGER;
  recent_feedback INTEGER;
  last_feedback_date TIMESTAMPTZ;
  min_days_between INTEGER;
  max_per_month INTEGER;
  monthly_feedback INTEGER;
BEGIN
  -- Get user account age in days
  SELECT DATE_PART('day', NOW() - au.created_at)::INTEGER
  FROM auth.users au
  WHERE au.id = target_user_id
  INTO user_account_age;

  -- Check for recent feedback in last 7 days
  SELECT COUNT(*)
  FROM feedback_sessions fs
  WHERE fs.user_id = target_user_id 
    AND fs.started_at >= NOW() - INTERVAL '7 days'
  INTO recent_feedback;

  -- Check monthly feedback count
  SELECT COUNT(*)
  FROM feedback_sessions fs
  WHERE fs.user_id = target_user_id 
    AND fs.started_at >= DATE_TRUNC('month', NOW())
    AND fs.session_type = feedback_type_param
  INTO monthly_feedback;

  -- Get trigger configuration limits
  SELECT 
    COALESCE(ft.min_days_between, 30),
    COALESCE(ft.max_per_user_per_month, 2)
  FROM feedback_triggers ft
  WHERE ft.feedback_type = feedback_type_param 
    AND ft.is_active = TRUE
  ORDER BY ft.priority DESC
  LIMIT 1
  INTO min_days_between, max_per_month;

  -- Get last feedback date for this type
  SELECT MAX(fs.started_at)
  FROM feedback_sessions fs
  WHERE fs.user_id = target_user_id 
    AND fs.session_type = feedback_type_param
  INTO last_feedback_date;

  -- Determine eligibility
  IF user_account_age < 3 THEN
    eligible := FALSE;
    reason := 'account_too_new';
    next_eligible_date := (SELECT created_at + INTERVAL '3 days' FROM auth.users WHERE id = target_user_id);
  ELSIF recent_feedback >= 2 THEN
    eligible := FALSE;
    reason := 'feedback_fatigue';
    next_eligible_date := NOW() + INTERVAL '7 days';
  ELSIF monthly_feedback >= max_per_month THEN
    eligible := FALSE;
    reason := 'monthly_limit_reached';
    next_eligible_date := DATE_TRUNC('month', NOW()) + INTERVAL '1 month';
  ELSIF last_feedback_date IS NOT NULL AND last_feedback_date >= NOW() - INTERVAL '1 day' * min_days_between THEN
    eligible := FALSE;
    reason := 'too_recent';
    next_eligible_date := last_feedback_date + INTERVAL '1 day' * min_days_between;
  ELSE
    eligible := TRUE;
    reason := 'eligible';
    next_eligible_date := NULL;
  END IF;

  recent_feedback_count := recent_feedback;

  RETURN QUERY SELECT 
    check_feedback_eligibility.eligible,
    check_feedback_eligibility.reason,
    check_feedback_eligibility.next_eligible_date,
    check_feedback_eligibility.recent_feedback_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update feedback session completion rates
CREATE OR REPLACE FUNCTION update_session_completion_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- Update completion rate when responses are added
  UPDATE feedback_sessions 
  SET 
    questions_answered = (
      SELECT COUNT(*) 
      FROM feedback_responses 
      WHERE session_id = NEW.session_id
    ),
    completion_rate = CASE 
      WHEN questions_total > 0 THEN 
        (SELECT COUNT(*)::DECIMAL / questions_total FROM feedback_responses WHERE session_id = NEW.session_id)
      ELSE 0.00
    END,
    updated_at = NOW()
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_completion
  AFTER INSERT ON feedback_responses
  FOR EACH ROW EXECUTE FUNCTION update_session_completion_rate();

-- Trigger to automatically categorize NPS scores
CREATE OR REPLACE FUNCTION categorize_nps_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.category := CASE 
    WHEN NEW.score >= 9 THEN 'promoter'
    WHEN NEW.score >= 7 THEN 'passive'
    ELSE 'detractor'
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_categorize_nps
  BEFORE INSERT OR UPDATE ON nps_surveys
  FOR EACH ROW EXECUTE FUNCTION categorize_nps_score();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_feedback_sessions_updated_at 
  BEFORE UPDATE ON feedback_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nps_surveys_updated_at 
  BEFORE UPDATE ON nps_surveys 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_feedback_updated_at 
  BEFORE UPDATE ON feature_feedback 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_triggers_updated_at 
  BEFORE UPDATE ON feedback_triggers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_analytics_updated_at 
  BEFORE UPDATE ON feedback_analytics_daily 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_follow_up_actions_updated_at 
  BEFORE UPDATE ON feedback_follow_up_actions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE feedback_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_follow_up_actions ENABLE ROW LEVEL SECURITY;

-- Policies for feedback_sessions
CREATE POLICY "Users can view their own feedback sessions" ON feedback_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own feedback sessions" ON feedback_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback sessions" ON feedback_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Admin access to all feedback data
CREATE POLICY "Admins can view all feedback sessions" ON feedback_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.user_type = 'admin'
    )
  );

-- Policies for feedback_responses
CREATE POLICY "Users can view their own feedback responses" ON feedback_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM feedback_sessions fs
      WHERE fs.id = session_id AND fs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create responses to their own feedback sessions" ON feedback_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM feedback_sessions fs
      WHERE fs.id = session_id AND fs.user_id = auth.uid()
    )
  );

-- Admin access to responses
CREATE POLICY "Admins can view all feedback responses" ON feedback_responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.user_type = 'admin'
    )
  );

-- Policies for nps_surveys
CREATE POLICY "Users can view their own NPS surveys" ON nps_surveys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own NPS surveys" ON nps_surveys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own NPS surveys" ON nps_surveys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all NPS surveys" ON nps_surveys
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.user_type = 'admin'
    )
  );

-- Policies for feature_feedback
CREATE POLICY "Users can view their own feature feedback" ON feature_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own feature feedback" ON feature_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all feature feedback" ON feature_feedback
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.user_type = 'admin'
    )
  );

-- Admin-only policies for configuration tables
CREATE POLICY "Only admins can manage feedback triggers" ON feedback_triggers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.user_type = 'admin'
    )
  );

CREATE POLICY "Only admins can view analytics" ON feedback_analytics_daily
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can manage follow-up actions" ON feedback_follow_up_actions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.user_type = 'admin'
    )
  );

-- Insert default feedback triggers for common scenarios
INSERT INTO feedback_triggers (trigger_name, trigger_type, feedback_type, questions, description, priority) VALUES
  ('post_onboarding_nps', 'milestone', 'nps', '[
    {
      "key": "nps_score",
      "type": "nps",
      "text": "How likely are you to recommend WedSync to a friend or colleague?",
      "required": true,
      "order": 1
    },
    {
      "key": "nps_feedback",
      "type": "text",
      "text": "What''s the main reason for your score?",
      "required": false,
      "order": 2,
      "dependsOn": "nps_score"
    }
  ]'::jsonb, 'NPS survey after successful onboarding completion', 9),
  
  ('form_builder_usage_feedback', 'usage', 'feature', '[
    {
      "key": "feature_satisfaction",
      "type": "rating",
      "text": "How satisfied are you with the form builder?",
      "scale": 5,
      "required": true,
      "order": 1
    },
    {
      "key": "feature_ease",
      "type": "rating", 
      "text": "How easy is the form builder to use?",
      "scale": 5,
      "required": true,
      "order": 2
    },
    {
      "key": "improvement_suggestions",
      "type": "text",
      "text": "Any suggestions for improving the form builder?",
      "required": false,
      "order": 3
    }
  ]'::jsonb, 'Feature feedback for form builder after 5+ uses', 7),
  
  ('quarterly_satisfaction', 'time', 'nps', '[
    {
      "key": "nps_score",
      "type": "nps", 
      "text": "How likely are you to recommend WedSync to other wedding professionals?",
      "required": true,
      "order": 1
    },
    {
      "key": "business_impact",
      "type": "text",
      "text": "How has WedSync impacted your wedding business this quarter?",
      "required": false,
      "order": 2
    },
    {
      "key": "feature_priorities", 
      "type": "choice",
      "text": "What should we focus on improving next?",
      "choices": ["Form builder", "Client communication", "Analytics", "Mobile app", "Integrations", "Other"],
      "required": false,
      "order": 3
    }
  ]'::jsonb, 'Quarterly NPS survey for active users', 8),
  
  ('support_resolution_csat', 'event', 'csat', '[
    {
      "key": "support_satisfaction",
      "type": "rating",
      "text": "How satisfied were you with the support you received?",
      "scale": 5,
      "required": true,
      "order": 1
    },
    {
      "key": "resolution_speed",
      "type": "rating",
      "text": "How would you rate the speed of resolution?",
      "scale": 5, 
      "required": true,
      "order": 2
    },
    {
      "key": "support_feedback",
      "type": "text",
      "text": "Any additional feedback about your support experience?",
      "required": false,
      "order": 3
    }
  ]'::jsonb, 'CSAT survey after support ticket resolution', 6);

-- Create initial analytics entry for current date
INSERT INTO feedback_analytics_daily (date) VALUES (CURRENT_DATE)
ON CONFLICT (date) DO NOTHING;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE feedback_sessions IS 'Core feedback collection sessions with comprehensive wedding industry metadata';
COMMENT ON TABLE feedback_responses IS 'Individual responses within feedback sessions with AI sentiment analysis';
COMMENT ON TABLE nps_surveys IS 'NPS-specific tracking with wedding business context and follow-up workflows';
COMMENT ON TABLE feature_feedback IS 'Feature-specific feedback with usage patterns and improvement suggestions';
COMMENT ON TABLE feedback_triggers IS 'Configurable triggers for automated feedback collection';
COMMENT ON TABLE feedback_analytics_daily IS 'Pre-calculated daily analytics for dashboard performance';
COMMENT ON TABLE feedback_follow_up_actions IS 'Automated follow-up actions based on feedback sentiment and type';

COMMENT ON FUNCTION calculate_nps_score IS 'Calculates NPS score with segmentation for date ranges';
COMMENT ON FUNCTION check_feedback_eligibility IS 'Checks if user is eligible for feedback based on rate limits and history';

-- Success notification
DO $$
BEGIN
  RAISE NOTICE 'WS-236 User Feedback System migration completed successfully';
  RAISE NOTICE 'Created % tables with comprehensive RLS policies', 7;
  RAISE NOTICE 'Added % default feedback triggers for common scenarios', 4;
  RAISE NOTICE 'Feedback system ready for implementation';
END $$;