-- WS-167 Trial Management System - Database Schema & Data Models
-- Enhanced trial tracking with comprehensive lifecycle and activity monitoring
-- Integrates with existing trial system for advanced analytics and email automation

-- =============================================================================
-- TABLE: trial_tracking - Core trial lifecycle data
-- =============================================================================

CREATE TABLE IF NOT EXISTS trial_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Trial identification and timing
  trial_type VARCHAR(20) NOT NULL DEFAULT 'standard' 
    CHECK (trial_type IN ('standard', 'extended', 'premium', 'enterprise')),
  trial_duration_days INTEGER NOT NULL DEFAULT 30 
    CHECK (trial_duration_days BETWEEN 7 AND 90),
  
  -- Trial lifecycle timestamps
  trial_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trial_expires_at TIMESTAMPTZ NOT NULL,
  trial_extended_at TIMESTAMPTZ,
  trial_converted_at TIMESTAMPTZ,
  trial_cancelled_at TIMESTAMPTZ,
  
  -- Trial status and progression
  current_status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (current_status IN ('active', 'paused', 'expired', 'converted', 'cancelled', 'extended')),
  previous_status VARCHAR(20),
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Business context for personalization
  business_type VARCHAR(50) NOT NULL
    CHECK (business_type IN (
      'wedding_planner', 'photographer', 'videographer', 'venue', 'florist', 
      'caterer', 'dj_musician', 'coordinator', 'baker', 'decorator', 'other'
    )),
  business_size VARCHAR(20) NOT NULL DEFAULT 'small'
    CHECK (business_size IN ('solo', 'small', 'medium', 'large', 'enterprise')),
  annual_wedding_count INTEGER CHECK (annual_wedding_count >= 0),
  
  -- Trial progress and engagement metrics
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,
  setup_progress DECIMAL(5,2) NOT NULL DEFAULT 0.00 
    CHECK (setup_progress >= 0 AND setup_progress <= 100),
  feature_adoption_score DECIMAL(5,2) NOT NULL DEFAULT 0.00
    CHECK (feature_adoption_score >= 0 AND feature_adoption_score <= 100),
  
  -- Conversion prediction and scoring
  conversion_probability DECIMAL(5,2) DEFAULT 0.00
    CHECK (conversion_probability >= 0 AND conversion_probability <= 100),
  engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  days_since_last_login INTEGER DEFAULT 0 CHECK (days_since_last_login >= 0),
  
  -- Trial source and attribution
  referral_source VARCHAR(100),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  marketing_channel VARCHAR(50),
  
  -- System fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT trial_tracking_dates_valid 
    CHECK (trial_expires_at > trial_started_at),
  CONSTRAINT trial_tracking_extended_dates_valid 
    CHECK (trial_extended_at IS NULL OR trial_extended_at >= trial_started_at),
  CONSTRAINT trial_tracking_converted_dates_valid 
    CHECK (trial_converted_at IS NULL OR trial_converted_at >= trial_started_at),
  
  -- Unique constraint - one active trial per user at a time
  CONSTRAINT unique_active_trial_per_user 
    EXCLUDE (user_id WITH =) WHERE (current_status IN ('active', 'extended', 'paused'))
);

-- =============================================================================
-- TABLE: trial_activity - Daily activity metrics and behavior tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS trial_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id UUID NOT NULL REFERENCES trial_tracking(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Activity date and session information
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  session_start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_end_at TIMESTAMPTZ,
  session_duration_minutes INTEGER DEFAULT 0 CHECK (session_duration_minutes >= 0),
  
  -- Feature usage tracking
  feature_category VARCHAR(50) NOT NULL
    CHECK (feature_category IN (
      'client_management', 'journey_builder', 'communications', 'guest_management',
      'vendor_management', 'timeline_planning', 'document_management', 'analytics',
      'billing', 'settings', 'mobile_app', 'integrations', 'templates', 'automation'
    )),
  feature_name VARCHAR(100) NOT NULL,
  feature_key VARCHAR(100) NOT NULL,
  
  -- Usage metrics
  action_type VARCHAR(30) NOT NULL DEFAULT 'view'
    CHECK (action_type IN (
      'view', 'create', 'edit', 'delete', 'share', 'export', 'import', 
      'send', 'schedule', 'automate', 'analyze', 'configure'
    )),
  action_count INTEGER NOT NULL DEFAULT 1 CHECK (action_count > 0),
  time_spent_seconds INTEGER DEFAULT 0 CHECK (time_spent_seconds >= 0),
  
  -- Value and impact tracking
  estimated_time_saved_minutes DECIMAL(8,2) DEFAULT 0.00 
    CHECK (estimated_time_saved_minutes >= 0),
  value_score INTEGER DEFAULT 1 CHECK (value_score BETWEEN 1 AND 10),
  complexity_score INTEGER DEFAULT 1 CHECK (complexity_score BETWEEN 1 AND 5),
  
  -- Context and metadata
  page_url TEXT,
  user_agent TEXT,
  device_type VARCHAR(20) DEFAULT 'desktop'
    CHECK (device_type IN ('desktop', 'tablet', 'mobile', 'unknown')),
  browser VARCHAR(50),
  operating_system VARCHAR(50),
  
  -- Additional context data
  context_data JSONB DEFAULT '{}',
  error_occurred BOOLEAN DEFAULT false,
  error_details JSONB,
  
  -- Performance metrics
  page_load_time_ms INTEGER CHECK (page_load_time_ms >= 0),
  api_response_time_ms INTEGER CHECK (api_response_time_ms >= 0),
  
  -- System fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT trial_activity_session_valid 
    CHECK (session_end_at IS NULL OR session_end_at >= session_start_at),
  CONSTRAINT trial_activity_date_not_future 
    CHECK (activity_date <= CURRENT_DATE + INTERVAL '1 day')
);

-- =============================================================================
-- TABLE: trial_email_schedule - Email automation and campaign management
-- =============================================================================

CREATE TABLE IF NOT EXISTS trial_email_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id UUID NOT NULL REFERENCES trial_tracking(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Email campaign information
  campaign_type VARCHAR(30) NOT NULL
    CHECK (campaign_type IN (
      'welcome_series', 'onboarding', 'feature_introduction', 'engagement',
      'milestone_celebration', 'conversion', 'retention', 'win_back',
      'educational', 'promotional', 'reminder', 'survey'
    )),
  campaign_name VARCHAR(200) NOT NULL,
  email_sequence_position INTEGER NOT NULL DEFAULT 1 CHECK (email_sequence_position > 0),
  
  -- Email template and content
  template_id VARCHAR(100) NOT NULL,
  template_name VARCHAR(200) NOT NULL,
  subject_line VARCHAR(300) NOT NULL,
  email_content_preview TEXT,
  personalization_data JSONB DEFAULT '{}',
  
  -- Scheduling information
  trigger_type VARCHAR(30) NOT NULL DEFAULT 'time_based'
    CHECK (trigger_type IN (
      'time_based', 'event_based', 'behavior_based', 'milestone_based',
      'engagement_based', 'conversion_based', 'manual'
    )),
  trigger_condition JSONB DEFAULT '{}',
  
  -- Timing configuration
  days_after_trial_start INTEGER DEFAULT 0 CHECK (days_after_trial_start >= 0),
  hours_after_trigger INTEGER DEFAULT 0 CHECK (hours_after_trigger >= 0),
  optimal_send_time TIME DEFAULT '10:00:00',
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Scheduling status and timestamps
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  
  -- Email status and delivery
  email_status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
    CHECK (email_status IN (
      'scheduled', 'queued', 'sending', 'sent', 'delivered', 'bounced',
      'failed', 'cancelled', 'skipped', 'paused'
    )),
  delivery_status VARCHAR(20) DEFAULT 'pending'
    CHECK (delivery_status IN (
      'pending', 'delivered', 'soft_bounce', 'hard_bounce', 'spam', 'rejected'
    )),
  
  -- Engagement metrics
  open_count INTEGER DEFAULT 0 CHECK (open_count >= 0),
  click_count INTEGER DEFAULT 0 CHECK (click_count >= 0),
  reply_count INTEGER DEFAULT 0 CHECK (reply_count >= 0),
  forward_count INTEGER DEFAULT 0 CHECK (forward_count >= 0),
  
  -- A/B testing and optimization
  variant_id VARCHAR(50),
  test_group VARCHAR(20) DEFAULT 'control'
    CHECK (test_group IN ('control', 'variant_a', 'variant_b', 'variant_c')),
  conversion_attributed BOOLEAN DEFAULT false,
  conversion_value DECIMAL(10,2) DEFAULT 0.00,
  
  -- Segmentation and targeting
  recipient_segment VARCHAR(100),
  send_conditions JSONB DEFAULT '{}',
  exclusion_rules JSONB DEFAULT '{}',
  
  -- Priority and importance
  priority_level INTEGER DEFAULT 5 CHECK (priority_level BETWEEN 1 AND 10),
  business_impact_score INTEGER DEFAULT 5 CHECK (business_impact_score BETWEEN 1 AND 10),
  
  -- Email provider integration
  email_provider VARCHAR(50) DEFAULT 'internal',
  external_message_id VARCHAR(200),
  provider_response JSONB,
  
  -- System fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT trial_email_schedule_dates_valid 
    CHECK (delivered_at IS NULL OR delivered_at >= sent_at),
  CONSTRAINT trial_email_schedule_engagement_valid 
    CHECK (opened_at IS NULL OR sent_at IS NOT NULL),
  CONSTRAINT trial_email_schedule_clicks_valid 
    CHECK (clicked_at IS NULL OR opened_at IS NOT NULL),
    
  -- Unique constraint for sequence position per campaign
  CONSTRAINT unique_sequence_position_per_campaign
    UNIQUE (trial_id, campaign_type, email_sequence_position)
);

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- trial_tracking indexes
CREATE INDEX IF NOT EXISTS idx_trial_tracking_user_id ON trial_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_tracking_supplier_id ON trial_tracking(supplier_id);
CREATE INDEX IF NOT EXISTS idx_trial_tracking_status ON trial_tracking(current_status);
CREATE INDEX IF NOT EXISTS idx_trial_tracking_business_type ON trial_tracking(business_type);
CREATE INDEX IF NOT EXISTS idx_trial_tracking_expires_at ON trial_tracking(trial_expires_at);
CREATE INDEX IF NOT EXISTS idx_trial_tracking_started_at ON trial_tracking(trial_started_at);
CREATE INDEX IF NOT EXISTS idx_trial_tracking_last_activity ON trial_tracking(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_trial_tracking_conversion_prob ON trial_tracking(conversion_probability DESC);

-- trial_activity indexes
CREATE INDEX IF NOT EXISTS idx_trial_activity_trial_id ON trial_activity(trial_id);
CREATE INDEX IF NOT EXISTS idx_trial_activity_user_id ON trial_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_activity_date ON trial_activity(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_trial_activity_feature ON trial_activity(feature_category, feature_key);
CREATE INDEX IF NOT EXISTS idx_trial_activity_session ON trial_activity(session_id);
CREATE INDEX IF NOT EXISTS idx_trial_activity_value_score ON trial_activity(value_score DESC);
CREATE INDEX IF NOT EXISTS idx_trial_activity_time_saved ON trial_activity(estimated_time_saved_minutes DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_trial_activity_user_date ON trial_activity(user_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_trial_activity_trial_feature ON trial_activity(trial_id, feature_category, activity_date DESC);

-- trial_email_schedule indexes
CREATE INDEX IF NOT EXISTS idx_trial_email_schedule_trial_id ON trial_email_schedule(trial_id);
CREATE INDEX IF NOT EXISTS idx_trial_email_schedule_user_id ON trial_email_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_email_schedule_campaign ON trial_email_schedule(campaign_type);
CREATE INDEX IF NOT EXISTS idx_trial_email_schedule_status ON trial_email_schedule(email_status);
CREATE INDEX IF NOT EXISTS idx_trial_email_schedule_scheduled ON trial_email_schedule(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_trial_email_schedule_sent ON trial_email_schedule(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_trial_email_schedule_delivery ON trial_email_schedule(delivery_status);
CREATE INDEX IF NOT EXISTS idx_trial_email_schedule_engagement ON trial_email_schedule(open_count DESC, click_count DESC);

-- Composite indexes for email automation
CREATE INDEX IF NOT EXISTS idx_trial_email_schedule_active ON trial_email_schedule(email_status, scheduled_for)
  WHERE email_status IN ('scheduled', 'queued');

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE trial_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_email_schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trial_tracking
CREATE POLICY "Users can view own trial tracking" ON trial_tracking
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trial tracking" ON trial_tracking
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trial tracking" ON trial_tracking
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access trial tracking" ON trial_tracking
  FOR ALL TO service_role 
  USING (true);

-- RLS Policies for trial_activity
CREATE POLICY "Users can view own trial activity" ON trial_activity
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trial activity" ON trial_activity
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access trial activity" ON trial_activity
  FOR ALL TO service_role 
  USING (true);

-- RLS Policies for trial_email_schedule
CREATE POLICY "Users can view own trial emails" ON trial_email_schedule
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access trial emails" ON trial_email_schedule
  FOR ALL TO service_role 
  USING (true);

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT COLUMNS
-- =============================================================================

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_trial_tracking_updated_at 
  BEFORE UPDATE ON trial_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trial_email_schedule_updated_at 
  BEFORE UPDATE ON trial_email_schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABLE COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE trial_tracking IS 'WS-167: Core trial lifecycle data with comprehensive tracking of trial progression, business context, and conversion metrics';
COMMENT ON TABLE trial_activity IS 'WS-167: Daily activity metrics and detailed behavior tracking for trial users with feature usage analytics';
COMMENT ON TABLE trial_email_schedule IS 'WS-167: Email automation and campaign management for trial engagement and conversion optimization';

-- Key column comments
COMMENT ON COLUMN trial_tracking.conversion_probability IS 'AI-calculated probability of trial conversion based on usage patterns and engagement metrics';
COMMENT ON COLUMN trial_tracking.feature_adoption_score IS 'Percentage score of feature adoption across all available trial features';
COMMENT ON COLUMN trial_activity.estimated_time_saved_minutes IS 'Estimated time savings from using this feature, used for ROI calculations';
COMMENT ON COLUMN trial_activity.value_score IS 'Business value score (1-10) for this specific activity';
COMMENT ON COLUMN trial_email_schedule.business_impact_score IS 'Expected business impact score (1-10) for this email communication';
COMMENT ON COLUMN trial_email_schedule.optimal_send_time IS 'AI-optimized send time based on user engagement patterns';

-- =============================================================================
-- INITIAL DATA SETUP
-- =============================================================================

-- Insert default email campaign templates (these would typically be managed by the TrialEmailService)
-- This provides the foundation for automated email sequences

-- Note: Actual template insertion would be handled by the application service layer
-- to maintain proper separation of concerns and allow for dynamic template management

-- End of WS-167 Trial Management System Migration