-- WS-167 Trial Management System Round 2 - Advanced Database Features
-- Enhanced analytics, automation, and performance optimization
-- Team D - Batch 20 - Round 2
-- =====================================================================

-- =============================================================================
-- SECTION 1: TRIAL LIFECYCLE MANAGEMENT FUNCTIONS
-- =============================================================================

-- Function to manage trial lifecycle transitions with business logic
CREATE OR REPLACE FUNCTION manage_trial_lifecycle(
  p_trial_id UUID,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_current_status TEXT;
  v_user_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_conversion_prob DECIMAL;
BEGIN
  -- Get current trial information
  SELECT 
    current_status, 
    user_id, 
    trial_expires_at,
    conversion_probability
  INTO 
    v_current_status, 
    v_user_id, 
    v_expires_at,
    v_conversion_prob
  FROM trial_tracking 
  WHERE id = p_trial_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Trial not found'
    );
  END IF;
  
  -- Execute action based on request
  CASE p_action
    WHEN 'extend' THEN
      -- Extend trial with intelligent logic
      UPDATE trial_tracking SET
        trial_expires_at = trial_expires_at + ((p_metadata->>'days')::INTEGER * INTERVAL '1 day'),
        trial_extended_at = NOW(),
        current_status = 'extended',
        previous_status = v_current_status,
        status_changed_at = NOW(),
        updated_at = NOW()
      WHERE id = p_trial_id;
      
      -- Log extension in activity
      INSERT INTO trial_activity (
        trial_id, user_id, feature_category, feature_name, 
        action_type, context_data
      ) VALUES (
        p_trial_id, v_user_id, 'automation', 'trial_extension',
        'configure', p_metadata
      );
      
    WHEN 'convert' THEN
      -- Convert trial to paid subscription
      UPDATE trial_tracking SET
        trial_converted_at = NOW(),
        current_status = 'converted',
        previous_status = v_current_status,
        status_changed_at = NOW(),
        conversion_probability = 100.00,
        updated_at = NOW()
      WHERE id = p_trial_id;
      
      -- Trigger subscription creation (placeholder for actual implementation)
      PERFORM create_subscription_from_trial(p_trial_id, p_metadata);
      
    WHEN 'pause' THEN
      -- Pause trial (e.g., for vacation mode)
      UPDATE trial_tracking SET
        current_status = 'paused',
        previous_status = v_current_status,
        status_changed_at = NOW(),
        updated_at = NOW()
      WHERE id = p_trial_id;
      
    WHEN 'resume' THEN
      -- Resume paused trial
      UPDATE trial_tracking SET
        current_status = v_previous_status,
        previous_status = 'paused',
        status_changed_at = NOW(),
        updated_at = NOW()
      WHERE id = p_trial_id AND current_status = 'paused';
      
    WHEN 'cancel' THEN
      -- Cancel trial
      UPDATE trial_tracking SET
        trial_cancelled_at = NOW(),
        current_status = 'cancelled',
        previous_status = v_current_status,
        status_changed_at = NOW(),
        updated_at = NOW()
      WHERE id = p_trial_id;
      
    ELSE
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Invalid action'
      );
  END CASE;
  
  -- Return success with updated trial information
  SELECT jsonb_build_object(
    'success', true,
    'trial_id', id,
    'previous_status', v_current_status,
    'new_status', current_status,
    'action_performed', p_action,
    'metadata', p_metadata
  ) INTO v_result
  FROM trial_tracking
  WHERE id = p_trial_id;
  
  RETURN v_result;
END;
$$;

-- =============================================================================
-- SECTION 2: CONVERSION PROBABILITY SCORING FUNCTION
-- =============================================================================

-- Advanced function to calculate trial conversion probability
CREATE OR REPLACE FUNCTION calculate_conversion_probability(p_trial_id UUID)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_score DECIMAL(5,2) := 0.00;
  v_engagement_score INTEGER;
  v_feature_adoption DECIMAL;
  v_days_active INTEGER;
  v_total_actions INTEGER;
  v_time_saved DECIMAL;
  v_emails_opened INTEGER;
  v_setup_progress DECIMAL;
BEGIN
  -- Get base metrics
  SELECT 
    engagement_score,
    feature_adoption_score,
    setup_progress,
    EXTRACT(DAY FROM (NOW() - trial_started_at))::INTEGER
  INTO 
    v_engagement_score,
    v_feature_adoption,
    v_setup_progress,
    v_days_active
  FROM trial_tracking
  WHERE id = p_trial_id;
  
  -- Calculate activity metrics
  SELECT 
    COUNT(DISTINCT activity_date),
    SUM(action_count),
    SUM(estimated_time_saved_minutes)
  INTO 
    v_days_active,
    v_total_actions,
    v_time_saved
  FROM trial_activity
  WHERE trial_id = p_trial_id;
  
  -- Calculate email engagement
  SELECT COUNT(*)
  INTO v_emails_opened
  FROM trial_email_schedule
  WHERE trial_id = p_trial_id
    AND opened_at IS NOT NULL;
  
  -- Weighted scoring algorithm
  -- Base score from engagement (30%)
  v_score := v_score + (COALESCE(v_engagement_score, 0) * 0.3);
  
  -- Feature adoption (25%)
  v_score := v_score + (COALESCE(v_feature_adoption, 0) * 0.25);
  
  -- Setup completion (15%)
  v_score := v_score + (COALESCE(v_setup_progress, 0) * 0.15);
  
  -- Activity frequency (15%)
  IF v_days_active > 0 THEN
    v_score := v_score + (LEAST(v_days_active * 5, 15));
  END IF;
  
  -- Time saved value (10%)
  IF v_time_saved > 60 THEN
    v_score := v_score + 10;
  ELSIF v_time_saved > 30 THEN
    v_score := v_score + 7;
  ELSIF v_time_saved > 10 THEN
    v_score := v_score + 5;
  END IF;
  
  -- Email engagement (5%)
  IF v_emails_opened > 3 THEN
    v_score := v_score + 5;
  ELSIF v_emails_opened > 0 THEN
    v_score := v_score + 3;
  END IF;
  
  -- Ensure score is within bounds
  v_score := LEAST(GREATEST(v_score, 0.00), 100.00);
  
  -- Update the trial tracking record
  UPDATE trial_tracking
  SET 
    conversion_probability = v_score,
    updated_at = NOW()
  WHERE id = p_trial_id;
  
  RETURN v_score;
END;
$$;

-- =============================================================================
-- SECTION 3: TRIAL ANALYTICS AGGREGATION FUNCTIONS
-- =============================================================================

-- Function to get comprehensive trial analytics
CREATE OR REPLACE FUNCTION get_trial_analytics(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE,
  p_business_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  metric_date DATE,
  total_trials_started INTEGER,
  total_conversions INTEGER,
  conversion_rate DECIMAL(5,2),
  avg_days_to_convert DECIMAL(10,2),
  total_time_saved_hours DECIMAL(10,2),
  avg_engagement_score DECIMAL(10,2),
  top_features_used JSONB,
  trial_status_breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH daily_metrics AS (
    SELECT 
      DATE(t.trial_started_at) AS trial_date,
      COUNT(*) AS trials_started,
      COUNT(CASE WHEN t.current_status = 'converted' THEN 1 END) AS conversions,
      AVG(t.engagement_score) AS avg_engagement,
      AVG(EXTRACT(EPOCH FROM (t.trial_converted_at - t.trial_started_at)) / 86400) AS days_to_convert,
      jsonb_object_agg(
        t.current_status, 
        COUNT(*) 
      ) FILTER (WHERE t.current_status IS NOT NULL) AS status_breakdown
    FROM trial_tracking t
    WHERE DATE(t.trial_started_at) BETWEEN p_start_date AND p_end_date
      AND (p_business_type IS NULL OR t.business_type = p_business_type)
    GROUP BY DATE(t.trial_started_at)
  ),
  activity_metrics AS (
    SELECT 
      a.activity_date,
      SUM(a.estimated_time_saved_minutes) / 60.0 AS time_saved_hours,
      jsonb_object_agg(
        a.feature_category,
        SUM(a.action_count)
      ) FILTER (WHERE a.feature_category IS NOT NULL) AS feature_usage
    FROM trial_activity a
    WHERE a.activity_date BETWEEN p_start_date AND p_end_date
    GROUP BY a.activity_date
  )
  SELECT 
    dm.trial_date,
    dm.trials_started::INTEGER,
    dm.conversions::INTEGER,
    ROUND(
      CASE 
        WHEN dm.trials_started > 0 
        THEN (dm.conversions::DECIMAL / dm.trials_started) * 100
        ELSE 0
      END, 2
    ) AS conversion_rate,
    ROUND(dm.days_to_convert, 2),
    ROUND(COALESCE(am.time_saved_hours, 0), 2),
    ROUND(dm.avg_engagement, 2),
    am.feature_usage,
    dm.status_breakdown
  FROM daily_metrics dm
  LEFT JOIN activity_metrics am ON dm.trial_date = am.activity_date
  ORDER BY dm.trial_date DESC;
END;
$$;

-- =============================================================================
-- SECTION 4: MATERIALIZED VIEWS FOR PERFORMANCE
-- =============================================================================

-- Materialized view for trial conversion metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS trial_conversion_metrics AS
SELECT 
  DATE_TRUNC('week', t.trial_started_at) AS week,
  t.business_type,
  t.business_size,
  COUNT(*) AS trials_started,
  COUNT(CASE WHEN t.current_status = 'converted' THEN 1 END) AS conversions,
  ROUND(
    COUNT(CASE WHEN t.current_status = 'converted' THEN 1 END)::DECIMAL / 
    NULLIF(COUNT(*), 0) * 100, 2
  ) AS conversion_rate,
  AVG(t.conversion_probability) AS avg_conversion_probability,
  AVG(t.engagement_score) AS avg_engagement_score,
  AVG(t.feature_adoption_score) AS avg_feature_adoption,
  AVG(EXTRACT(EPOCH FROM (t.trial_converted_at - t.trial_started_at)) / 86400) AS avg_days_to_convert,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.engagement_score) AS median_engagement_score,
  jsonb_object_agg(
    t.referral_source,
    COUNT(*)
  ) FILTER (WHERE t.referral_source IS NOT NULL) AS referral_breakdown,
  COUNT(DISTINCT t.user_id) AS unique_users
FROM trial_tracking t
WHERE t.trial_started_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('week', t.trial_started_at), t.business_type, t.business_size
ORDER BY week DESC;

-- Create indexes on the materialized view
CREATE INDEX idx_trial_conv_metrics_week ON trial_conversion_metrics (week DESC);
CREATE INDEX idx_trial_conv_metrics_type ON trial_conversion_metrics (business_type);
CREATE INDEX idx_trial_conv_metrics_size ON trial_conversion_metrics (business_size);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_trial_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY trial_conversion_metrics;
  
  -- Log refresh
  INSERT INTO system_logs (
    log_type, 
    log_message, 
    created_at
  ) VALUES (
    'materialized_view_refresh',
    'Trial conversion metrics refreshed',
    NOW()
  );
END;
$$;

-- =============================================================================
-- SECTION 5: COHORT ANALYSIS FUNCTIONS
-- =============================================================================

-- Function for cohort retention analysis
CREATE OR REPLACE FUNCTION get_trial_cohort_retention(
  p_cohort_months INTEGER DEFAULT 6
)
RETURNS TABLE (
  cohort_month DATE,
  cohort_size INTEGER,
  month_0_retained INTEGER,
  month_1_retained INTEGER,
  month_2_retained INTEGER,
  month_3_retained INTEGER,
  retention_rate_m1 DECIMAL(5,2),
  retention_rate_m2 DECIMAL(5,2),
  retention_rate_m3 DECIMAL(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH cohorts AS (
    SELECT 
      DATE_TRUNC('month', trial_started_at) AS cohort_month,
      user_id,
      trial_started_at
    FROM trial_tracking
    WHERE trial_started_at >= CURRENT_DATE - (p_cohort_months * INTERVAL '1 month')
  ),
  cohort_activity AS (
    SELECT 
      c.cohort_month,
      c.user_id,
      DATE_TRUNC('month', a.activity_date) AS activity_month,
      COUNT(*) AS actions
    FROM cohorts c
    LEFT JOIN trial_activity a ON c.user_id = a.user_id
    GROUP BY c.cohort_month, c.user_id, DATE_TRUNC('month', a.activity_date)
  )
  SELECT 
    ca.cohort_month,
    COUNT(DISTINCT ca.user_id)::INTEGER AS cohort_size,
    COUNT(DISTINCT CASE 
      WHEN ca.activity_month = ca.cohort_month 
      THEN ca.user_id 
    END)::INTEGER AS month_0,
    COUNT(DISTINCT CASE 
      WHEN ca.activity_month = ca.cohort_month + INTERVAL '1 month' 
      THEN ca.user_id 
    END)::INTEGER AS month_1,
    COUNT(DISTINCT CASE 
      WHEN ca.activity_month = ca.cohort_month + INTERVAL '2 months' 
      THEN ca.user_id 
    END)::INTEGER AS month_2,
    COUNT(DISTINCT CASE 
      WHEN ca.activity_month = ca.cohort_month + INTERVAL '3 months' 
      THEN ca.user_id 
    END)::INTEGER AS month_3,
    ROUND(
      COUNT(DISTINCT CASE 
        WHEN ca.activity_month = ca.cohort_month + INTERVAL '1 month' 
        THEN ca.user_id 
      END)::DECIMAL / NULLIF(COUNT(DISTINCT ca.user_id), 0) * 100, 2
    ) AS retention_m1,
    ROUND(
      COUNT(DISTINCT CASE 
        WHEN ca.activity_month = ca.cohort_month + INTERVAL '2 months' 
        THEN ca.user_id 
      END)::DECIMAL / NULLIF(COUNT(DISTINCT ca.user_id), 0) * 100, 2
    ) AS retention_m2,
    ROUND(
      COUNT(DISTINCT CASE 
        WHEN ca.activity_month = ca.cohort_month + INTERVAL '3 months' 
        THEN ca.user_id 
      END)::DECIMAL / NULLIF(COUNT(DISTINCT ca.user_id), 0) * 100, 2
    ) AS retention_m3
  FROM cohort_activity ca
  GROUP BY ca.cohort_month
  ORDER BY ca.cohort_month DESC;
END;
$$;

-- =============================================================================
-- SECTION 6: AUTOMATED TRIGGERS FOR TRIAL MANAGEMENT
-- =============================================================================

-- Trigger function for automatic trial expiration handling
CREATE OR REPLACE FUNCTION handle_trial_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if trial is expiring soon (within 3 days)
  IF NEW.trial_expires_at <= NOW() + INTERVAL '3 days' 
     AND OLD.trial_expires_at > NOW() + INTERVAL '3 days' 
     AND NEW.current_status = 'active' THEN
    
    -- Schedule expiration warning email
    INSERT INTO trial_email_schedule (
      trial_id,
      user_id,
      campaign_type,
      campaign_name,
      template_id,
      template_name,
      subject_line,
      trigger_type,
      scheduled_for,
      priority_level
    ) VALUES (
      NEW.id,
      NEW.user_id,
      'reminder',
      'Trial Expiration Warning',
      'trial_expiring_3_days',
      'Trial Expiring in 3 Days',
      'Your WedSync trial expires in 3 days - Don''t lose your progress!',
      'time_based',
      NOW(),
      9
    );
    
    -- Update engagement score for high-value trials
    IF NEW.conversion_probability > 75 THEN
      NEW.engagement_score = NEW.engagement_score + 10;
    END IF;
  END IF;
  
  -- Auto-expire trials that have passed expiration date
  IF NEW.trial_expires_at <= NOW() AND OLD.current_status = 'active' THEN
    NEW.current_status = 'expired';
    NEW.previous_status = OLD.current_status;
    NEW.status_changed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER trial_expiration_trigger
  BEFORE UPDATE ON trial_tracking
  FOR EACH ROW
  EXECUTE FUNCTION handle_trial_expiration();

-- Trigger function for activity-based engagement scoring
CREATE OR REPLACE FUNCTION update_engagement_on_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_engagement_increase INTEGER := 0;
  v_current_engagement INTEGER;
BEGIN
  -- Calculate engagement increase based on action
  CASE NEW.action_type
    WHEN 'create' THEN v_engagement_increase := 5;
    WHEN 'automate' THEN v_engagement_increase := 8;
    WHEN 'share' THEN v_engagement_increase := 6;
    WHEN 'analyze' THEN v_engagement_increase := 4;
    WHEN 'configure' THEN v_engagement_increase := 3;
    ELSE v_engagement_increase := 2;
  END CASE;
  
  -- Bonus for high-value features
  IF NEW.feature_category IN ('journey_builder', 'automation', 'analytics') THEN
    v_engagement_increase := v_engagement_increase * 2;
  END IF;
  
  -- Update trial tracking engagement score
  UPDATE trial_tracking
  SET 
    engagement_score = LEAST(engagement_score + v_engagement_increase, 100),
    last_activity_at = NOW(),
    days_since_last_login = 0,
    updated_at = NOW()
  WHERE id = NEW.trial_id;
  
  -- Recalculate conversion probability if significant activity
  IF v_engagement_increase > 5 THEN
    PERFORM calculate_conversion_probability(NEW.trial_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER activity_engagement_trigger
  AFTER INSERT ON trial_activity
  FOR EACH ROW
  EXECUTE FUNCTION update_engagement_on_activity();

-- =============================================================================
-- SECTION 7: TRIAL EMAIL AUTOMATION FUNCTIONS
-- =============================================================================

-- Function to intelligently schedule trial emails
CREATE OR REPLACE FUNCTION schedule_trial_emails(
  p_trial_id UUID,
  p_campaign_type TEXT DEFAULT 'onboarding'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_emails_scheduled INTEGER := 0;
  v_user_id UUID;
  v_business_type TEXT;
  v_trial_duration INTEGER;
  r_email RECORD;
BEGIN
  -- Get trial information
  SELECT 
    user_id, 
    business_type, 
    trial_duration_days
  INTO 
    v_user_id, 
    v_business_type, 
    v_trial_duration
  FROM trial_tracking
  WHERE id = p_trial_id;
  
  -- Define email schedule based on campaign type
  IF p_campaign_type = 'onboarding' THEN
    -- Day 0: Welcome email
    INSERT INTO trial_email_schedule (
      trial_id, user_id, campaign_type, campaign_name,
      template_id, subject_line, days_after_trial_start,
      scheduled_for, priority_level
    ) VALUES (
      p_trial_id, v_user_id, 'welcome_series', 'Welcome to WedSync',
      'welcome_' || v_business_type, 'Welcome to WedSync - Let''s Get Started!',
      0, NOW(), 10
    );
    v_emails_scheduled := v_emails_scheduled + 1;
    
    -- Day 1: Feature introduction
    INSERT INTO trial_email_schedule (
      trial_id, user_id, campaign_type, campaign_name,
      template_id, subject_line, days_after_trial_start,
      scheduled_for, priority_level
    ) VALUES (
      p_trial_id, v_user_id, 'feature_introduction', 'Key Features',
      'features_day1', 'Discover the Top 5 Features That Save You Hours',
      1, NOW() + INTERVAL '1 day', 8
    );
    v_emails_scheduled := v_emails_scheduled + 1;
    
    -- Day 3: Success story
    INSERT INTO trial_email_schedule (
      trial_id, user_id, campaign_type, campaign_name,
      template_id, subject_line, days_after_trial_start,
      scheduled_for, priority_level
    ) VALUES (
      p_trial_id, v_user_id, 'educational', 'Success Story',
      'success_story_' || v_business_type, 
      'How Sarah Saved 10 Hours Per Wedding with WedSync',
      3, NOW() + INTERVAL '3 days', 7
    );
    v_emails_scheduled := v_emails_scheduled + 1;
    
    -- Day 7: Milestone check-in
    INSERT INTO trial_email_schedule (
      trial_id, user_id, campaign_type, campaign_name,
      template_id, subject_line, days_after_trial_start,
      scheduled_for, priority_level
    ) VALUES (
      p_trial_id, v_user_id, 'milestone_celebration', 'Week 1 Progress',
      'week1_milestone', 'You''re Off to a Great Start! 🎉',
      7, NOW() + INTERVAL '7 days', 8
    );
    v_emails_scheduled := v_emails_scheduled + 1;
    
    -- Day 14: Mid-trial review
    INSERT INTO trial_email_schedule (
      trial_id, user_id, campaign_type, campaign_name,
      template_id, subject_line, days_after_trial_start,
      scheduled_for, priority_level
    ) VALUES (
      p_trial_id, v_user_id, 'engagement', 'Mid-Trial Review',
      'midtrial_review', 'Halfway There! Here''s What You''ve Accomplished',
      14, NOW() + INTERVAL '14 days', 7
    );
    v_emails_scheduled := v_emails_scheduled + 1;
    
    -- Day 25: Conversion offer
    INSERT INTO trial_email_schedule (
      trial_id, user_id, campaign_type, campaign_name,
      template_id, subject_line, days_after_trial_start,
      scheduled_for, priority_level
    ) VALUES (
      p_trial_id, v_user_id, 'conversion', 'Special Offer',
      'conversion_offer', 'Exclusive Offer: Save 20% When You Upgrade Today',
      25, NOW() + INTERVAL '25 days', 10
    );
    v_emails_scheduled := v_emails_scheduled + 1;
    
    -- Day 29: Final reminder
    INSERT INTO trial_email_schedule (
      trial_id, user_id, campaign_type, campaign_name,
      template_id, subject_line, days_after_trial_start,
      scheduled_for, priority_level
    ) VALUES (
      p_trial_id, v_user_id, 'reminder', 'Trial Ending',
      'trial_ending', 'Your Trial Ends Tomorrow - Don''t Lose Your Data!',
      29, NOW() + INTERVAL '29 days', 10
    );
    v_emails_scheduled := v_emails_scheduled + 1;
  END IF;
  
  RETURN v_emails_scheduled;
END;
$$;

-- =============================================================================
-- SECTION 8: TRIAL VALUE CALCULATION FUNCTIONS
-- =============================================================================

-- Function to calculate trial lifetime value (LTV)
CREATE OR REPLACE FUNCTION calculate_trial_ltv(p_trial_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_time_saved_total DECIMAL;
  v_features_used INTEGER;
  v_engagement_days INTEGER;
  v_estimated_value DECIMAL;
  v_business_type TEXT;
  v_annual_weddings INTEGER;
BEGIN
  -- Get trial business context
  SELECT 
    business_type,
    annual_wedding_count
  INTO 
    v_business_type,
    v_annual_weddings
  FROM trial_tracking
  WHERE id = p_trial_id;
  
  -- Calculate total time saved
  SELECT 
    SUM(estimated_time_saved_minutes) / 60.0
  INTO v_time_saved_total
  FROM trial_activity
  WHERE trial_id = p_trial_id;
  
  -- Count unique features used
  SELECT 
    COUNT(DISTINCT feature_key)
  INTO v_features_used
  FROM trial_activity
  WHERE trial_id = p_trial_id;
  
  -- Count engagement days
  SELECT 
    COUNT(DISTINCT activity_date)
  INTO v_engagement_days
  FROM trial_activity
  WHERE trial_id = p_trial_id;
  
  -- Calculate estimated value based on business type and usage
  v_estimated_value := 0;
  
  -- Base value from time saved (assuming $50/hour value)
  v_estimated_value := v_estimated_value + (COALESCE(v_time_saved_total, 0) * 50);
  
  -- Project annual value based on wedding volume
  IF v_annual_weddings > 0 THEN
    v_estimated_value := v_estimated_value * (v_annual_weddings / 12.0); -- Monthly value
  END IF;
  
  -- Feature adoption multiplier
  IF v_features_used > 10 THEN
    v_estimated_value := v_estimated_value * 1.5;
  ELSIF v_features_used > 5 THEN
    v_estimated_value := v_estimated_value * 1.2;
  END IF;
  
  -- Build result JSON
  v_result := jsonb_build_object(
    'trial_id', p_trial_id,
    'time_saved_hours', ROUND(COALESCE(v_time_saved_total, 0), 2),
    'features_adopted', v_features_used,
    'engagement_days', v_engagement_days,
    'estimated_monthly_value', ROUND(v_estimated_value, 2),
    'estimated_annual_value', ROUND(v_estimated_value * 12, 2),
    'business_type', v_business_type,
    'annual_weddings', v_annual_weddings,
    'value_per_wedding', ROUND(
      CASE 
        WHEN v_annual_weddings > 0 
        THEN (v_estimated_value * 12) / v_annual_weddings
        ELSE 0
      END, 2
    )
  );
  
  RETURN v_result;
END;
$$;

-- =============================================================================
-- SECTION 9: PERFORMANCE INDEXES FOR ADVANCED QUERIES
-- =============================================================================

-- Additional performance indexes for advanced features
CREATE INDEX IF NOT EXISTS idx_trial_tracking_conversion_prob 
  ON trial_tracking (conversion_probability DESC) 
  WHERE current_status = 'active';

CREATE INDEX IF NOT EXISTS idx_trial_tracking_engagement_high 
  ON trial_tracking (engagement_score DESC) 
  WHERE engagement_score > 50;

CREATE INDEX IF NOT EXISTS idx_trial_activity_value 
  ON trial_activity (estimated_time_saved_minutes DESC) 
  WHERE estimated_time_saved_minutes > 0;

CREATE INDEX IF NOT EXISTS idx_trial_email_schedule_priority 
  ON trial_email_schedule (priority_level DESC, scheduled_for ASC) 
  WHERE email_status = 'scheduled';

-- Composite index for analytics queries
CREATE INDEX IF NOT EXISTS idx_trial_analytics_composite 
  ON trial_tracking (business_type, trial_started_at DESC, current_status);

-- =============================================================================
-- SECTION 10: SCHEDULED JOBS FOR AUTOMATION
-- =============================================================================

-- Function to process expired trials daily
CREATE OR REPLACE FUNCTION process_expired_trials()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_processed INTEGER := 0;
BEGIN
  -- Update all expired trials
  UPDATE trial_tracking
  SET 
    current_status = 'expired',
    previous_status = current_status,
    status_changed_at = NOW(),
    updated_at = NOW()
  WHERE 
    trial_expires_at <= NOW()
    AND current_status IN ('active', 'extended')
    AND trial_converted_at IS NULL;
  
  GET DIAGNOSTICS v_processed = ROW_COUNT;
  
  -- Log processing
  IF v_processed > 0 THEN
    INSERT INTO system_logs (
      log_type, 
      log_message, 
      created_at
    ) VALUES (
      'trial_expiration',
      format('Processed %s expired trials', v_processed),
      NOW()
    );
  END IF;
  
  RETURN v_processed;
END;
$$;

-- Function to send daily email batch
CREATE OR REPLACE FUNCTION process_scheduled_emails()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sent INTEGER := 0;
  r_email RECORD;
BEGIN
  -- Process all scheduled emails for today
  FOR r_email IN 
    SELECT id, trial_id, user_id, template_id
    FROM trial_email_schedule
    WHERE email_status = 'scheduled'
      AND scheduled_for <= NOW()
      AND scheduled_for >= NOW() - INTERVAL '1 day'
    ORDER BY priority_level DESC, scheduled_for ASC
    LIMIT 100
  LOOP
    -- Mark as queued for sending
    UPDATE trial_email_schedule
    SET 
      email_status = 'queued',
      updated_at = NOW()
    WHERE id = r_email.id;
    
    v_sent := v_sent + 1;
    
    -- Here you would integrate with actual email service
    -- PERFORM send_email_via_service(r_email.id);
  END LOOP;
  
  RETURN v_sent;
END;
$$;

-- =============================================================================
-- SECTION 11: DATA VALIDATION AND TESTING FUNCTIONS
-- =============================================================================

-- Function to validate trial data integrity
CREATE OR REPLACE FUNCTION validate_trial_data()
RETURNS TABLE (
  check_name TEXT,
  check_status TEXT,
  issue_count INTEGER,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check for orphaned trial activities
  RETURN QUERY
  SELECT 
    'Orphaned Activities'::TEXT,
    CASE 
      WHEN COUNT(*) > 0 THEN 'FAIL' 
      ELSE 'PASS' 
    END::TEXT,
    COUNT(*)::INTEGER,
    jsonb_agg(a.id) AS details
  FROM trial_activity a
  LEFT JOIN trial_tracking t ON a.trial_id = t.id
  WHERE t.id IS NULL;
  
  -- Check for invalid date relationships
  RETURN QUERY
  SELECT 
    'Invalid Date Relationships'::TEXT,
    CASE 
      WHEN COUNT(*) > 0 THEN 'FAIL' 
      ELSE 'PASS' 
    END::TEXT,
    COUNT(*)::INTEGER,
    jsonb_agg(id) AS details
  FROM trial_tracking
  WHERE trial_expires_at <= trial_started_at
    OR (trial_converted_at IS NOT NULL AND trial_converted_at < trial_started_at)
    OR (trial_extended_at IS NOT NULL AND trial_extended_at < trial_started_at);
  
  -- Check for invalid status transitions
  RETURN QUERY
  SELECT 
    'Invalid Status Transitions'::TEXT,
    CASE 
      WHEN COUNT(*) > 0 THEN 'FAIL' 
      ELSE 'PASS' 
    END::TEXT,
    COUNT(*)::INTEGER,
    jsonb_agg(id) AS details
  FROM trial_tracking
  WHERE 
    (current_status = 'converted' AND trial_converted_at IS NULL)
    OR (current_status = 'cancelled' AND trial_cancelled_at IS NULL)
    OR (current_status = 'extended' AND trial_extended_at IS NULL);
  
  -- Check for missing email schedules
  RETURN QUERY
  SELECT 
    'Missing Email Schedules'::TEXT,
    CASE 
      WHEN COUNT(*) > 0 THEN 'WARNING' 
      ELSE 'PASS' 
    END::TEXT,
    COUNT(*)::INTEGER,
    jsonb_agg(t.id) AS details
  FROM trial_tracking t
  LEFT JOIN trial_email_schedule e ON t.id = e.trial_id
  WHERE t.current_status = 'active'
    AND e.id IS NULL;
  
  -- Check engagement score consistency
  RETURN QUERY
  SELECT 
    'Engagement Score Anomalies'::TEXT,
    CASE 
      WHEN COUNT(*) > 0 THEN 'WARNING' 
      ELSE 'PASS' 
    END::TEXT,
    COUNT(*)::INTEGER,
    jsonb_agg(id) AS details
  FROM trial_tracking
  WHERE engagement_score > 100
    OR engagement_score < 0
    OR (engagement_score > 80 AND conversion_probability < 20);
END;
$$;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON FUNCTION manage_trial_lifecycle IS 'Core function for managing trial state transitions with comprehensive business logic';
COMMENT ON FUNCTION calculate_conversion_probability IS 'Machine learning-ready function for calculating trial conversion probability based on multiple engagement factors';
COMMENT ON FUNCTION get_trial_analytics IS 'Comprehensive analytics function for trial performance reporting and insights';
COMMENT ON FUNCTION get_trial_cohort_retention IS 'Cohort analysis function for understanding trial retention patterns';
COMMENT ON FUNCTION schedule_trial_emails IS 'Intelligent email scheduling system for trial nurture campaigns';
COMMENT ON FUNCTION calculate_trial_ltv IS 'Calculate estimated lifetime value of trial users based on usage patterns';
COMMENT ON FUNCTION process_expired_trials IS 'Daily job to process and update expired trials';
COMMENT ON FUNCTION validate_trial_data IS 'Data integrity validation function for testing and quality assurance';

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION manage_trial_lifecycle TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_conversion_probability TO authenticated;
GRANT EXECUTE ON FUNCTION get_trial_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_trial_cohort_retention TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_trial_ltv TO authenticated;

-- Grant select on materialized view
GRANT SELECT ON trial_conversion_metrics TO authenticated;

-- Service role permissions for automation functions
GRANT EXECUTE ON FUNCTION process_expired_trials TO service_role;
GRANT EXECUTE ON FUNCTION process_scheduled_emails TO service_role;
GRANT EXECUTE ON FUNCTION refresh_trial_materialized_views TO service_role;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================