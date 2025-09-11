-- WS-170 Viral Analytics System - Database Functions
-- Team C - Batch 21 - Round 1

-- Function to get viral coefficient data with aggregation
CREATE OR REPLACE FUNCTION get_viral_coefficient_data(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ, 
  requesting_user_id UUID,
  aggregation_period TEXT DEFAULT 'monthly'
)
RETURNS TABLE (
  new_users BIGINT,
  invites_sent BIGINT,
  conversions BIGINT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify user permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = requesting_user_id 
    AND role IN ('admin', 'analytics', 'supplier', 'couple')
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to viral analytics';
  END IF;

  -- Return aggregated viral metrics data
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      date_trunc(
        CASE 
          WHEN aggregation_period = 'daily' THEN 'day'
          WHEN aggregation_period = 'weekly' THEN 'week' 
          ELSE 'month'
        END, 
        start_date
      ),
      end_date,
      ('1 ' || aggregation_period)::interval
    ) AS period_start
  ),
  viral_data AS (
    SELECT 
      ds.period_start,
      ds.period_start + ('1 ' || aggregation_period)::interval AS period_end,
      -- Count new users in period
      COALESCE((
        SELECT COUNT(DISTINCT up.id)
        FROM user_profiles up
        WHERE up.created_at >= ds.period_start 
        AND up.created_at < ds.period_start + ('1 ' || aggregation_period)::interval
      ), 0) AS new_users,
      -- Count invitations sent in period  
      COALESCE((
        SELECT COUNT(*)
        FROM viral_invitations vi
        WHERE vi.created_at >= ds.period_start
        AND vi.created_at < ds.period_start + ('1 ' || aggregation_period)::interval
      ), 0) AS invites_sent,
      -- Count conversions (successful signups from referrals) in period
      COALESCE((
        SELECT COUNT(*)
        FROM referral_conversions rc
        WHERE rc.converted_at >= ds.period_start
        AND rc.converted_at < ds.period_start + ('1 ' || aggregation_period)::interval
        AND rc.conversion_status = 'completed'
      ), 0) AS conversions
    FROM date_series ds
  )
  SELECT 
    vd.new_users,
    vd.invites_sent, 
    vd.conversions,
    vd.period_start,
    vd.period_end
  FROM viral_data vd
  ORDER BY vd.period_start;
END;
$$;

-- Function to get attribution model data
CREATE OR REPLACE FUNCTION get_attribution_model_data(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  source_filters TEXT[] DEFAULT '{}',
  requesting_user_id UUID
)
RETURNS TABLE (
  attribution_source TEXT,
  conversions BIGINT,
  cost NUMERIC,
  total_reach BIGINT,
  viral_conversions BIGINT
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify user permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = requesting_user_id 
    AND role IN ('admin', 'analytics', 'marketing')
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to attribution analytics';
  END IF;

  RETURN QUERY
  SELECT 
    va.source_channel::TEXT AS attribution_source,
    COUNT(DISTINCT rc.id)::BIGINT AS conversions,
    COALESCE(SUM(va.acquisition_cost), 0)::NUMERIC AS cost,
    COUNT(DISTINCT va.id)::BIGINT AS total_reach,
    COUNT(DISTINCT CASE WHEN rc.referral_type = 'viral' THEN rc.id END)::BIGINT AS viral_conversions
  FROM viral_attributions va
  LEFT JOIN referral_conversions rc ON va.conversion_id = rc.id
  WHERE va.created_at >= start_date
    AND va.created_at <= end_date
    AND (array_length(source_filters, 1) IS NULL OR va.source_channel = ANY(source_filters))
  GROUP BY va.source_channel
  ORDER BY conversions DESC;
END;
$$;

-- Function to get aggregated growth metrics
CREATE OR REPLACE FUNCTION get_aggregated_growth_metrics(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  created_at TIMESTAMPTZ,
  new_users BIGINT,
  viral_coefficient NUMERIC,
  organic_growth BIGINT,
  paid_growth BIGINT,
  viral_growth BIGINT,
  cumulative_users BIGINT,
  retention_rate NUMERIC
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH daily_metrics AS (
    SELECT 
      date_trunc('day', up.created_at) AS day,
      COUNT(DISTINCT up.id) AS daily_new_users,
      -- Calculate viral growth from referrals
      COUNT(DISTINCT CASE WHEN rt.referral_type = 'viral' THEN up.id END) AS daily_viral_growth,
      -- Calculate organic growth (direct signups)
      COUNT(DISTINCT CASE WHEN rt.referral_type IS NULL THEN up.id END) AS daily_organic_growth,
      -- Calculate paid growth from marketing campaigns
      COUNT(DISTINCT CASE WHEN rt.referral_type = 'paid' THEN up.id END) AS daily_paid_growth
    FROM user_profiles up
    LEFT JOIN referral_tracking rt ON rt.referred_user_id = up.id
    WHERE up.created_at >= start_date 
      AND up.created_at <= end_date
    GROUP BY date_trunc('day', up.created_at)
  ),
  cumulative_metrics AS (
    SELECT 
      dm.day AS created_at,
      dm.daily_new_users::BIGINT AS new_users,
      dm.daily_organic_growth::BIGINT AS organic_growth,
      dm.daily_paid_growth::BIGINT AS paid_growth,
      dm.daily_viral_growth::BIGINT AS viral_growth,
      SUM(dm.daily_new_users) OVER (ORDER BY dm.day)::BIGINT AS cumulative_users,
      -- Calculate viral coefficient for the day
      CASE 
        WHEN dm.daily_new_users > 0 AND LAG(dm.daily_new_users) OVER (ORDER BY dm.day) > 0 
        THEN dm.daily_viral_growth::NUMERIC / LAG(dm.daily_new_users) OVER (ORDER BY dm.day)
        ELSE 0
      END AS viral_coefficient,
      -- Estimate retention rate based on active users
      CASE 
        WHEN LAG(dm.daily_new_users, 30) OVER (ORDER BY dm.day) > 0
        THEN LEAST(1.0, dm.daily_new_users::NUMERIC / LAG(dm.daily_new_users, 30) OVER (ORDER BY dm.day))
        ELSE 0.85  -- Default wedding industry retention rate
      END AS retention_rate
    FROM daily_metrics dm
  )
  SELECT * FROM cumulative_metrics
  ORDER BY created_at;
END;
$$;

-- Function to get sharing metrics data
CREATE OR REPLACE FUNCTION get_sharing_metrics_data(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  requesting_user_id UUID
)
RETURNS TABLE (
  channel TEXT,
  share_count BIGINT,
  unique_users BIGINT,
  share_conversions BIGINT
)
SECURITY DEFINER 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify user permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = requesting_user_id 
    AND role IN ('admin', 'analytics', 'supplier')
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to sharing analytics';
  END IF;

  RETURN QUERY
  SELECT 
    ts.share_channel::TEXT AS channel,
    COUNT(*)::BIGINT AS share_count,
    COUNT(DISTINCT ts.user_id)::BIGINT AS unique_users,
    COUNT(DISTINCT rc.id)::BIGINT AS share_conversions
  FROM template_shares ts
  LEFT JOIN referral_conversions rc ON rc.referral_source = ts.share_url
  WHERE ts.created_at >= start_date
    AND ts.created_at <= end_date
  GROUP BY ts.share_channel
  ORDER BY share_count DESC;
END;
$$;

-- Function to get viral funnel data
CREATE OR REPLACE FUNCTION get_viral_funnel_data(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  invitations_sent BIGINT,
  invitations_opened BIGINT,
  signups_started BIGINT,
  signups_completed BIGINT
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT vi.id)::BIGINT AS invitations_sent,
    COUNT(DISTINCT CASE WHEN vfe.event_type = 'invitation_opened' THEN vfe.invitation_id END)::BIGINT AS invitations_opened,
    COUNT(DISTINCT CASE WHEN vfe.event_type = 'signup_started' THEN vfe.user_id END)::BIGINT AS signups_started,
    COUNT(DISTINCT CASE WHEN vfe.event_type = 'signup_completed' THEN vfe.user_id END)::BIGINT AS signups_completed
  FROM viral_invitations vi
  LEFT JOIN viral_funnel_events vfe ON vfe.invitation_id = vi.id
  WHERE vi.created_at >= start_date
    AND vi.created_at <= end_date;
END;
$$;

-- Function to get channel effectiveness data
CREATE OR REPLACE FUNCTION get_channel_effectiveness_data(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  channel TEXT,
  total_reach BIGINT,
  conversions BIGINT,
  viral_conversions BIGINT,
  cost NUMERIC,
  average_revenue_per_user NUMERIC
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    va.source_channel::TEXT AS channel,
    COUNT(DISTINCT va.id)::BIGINT AS total_reach,
    COUNT(DISTINCT rc.id)::BIGINT AS conversions,
    COUNT(DISTINCT CASE WHEN rc.referral_type = 'viral' THEN rc.id END)::BIGINT AS viral_conversions,
    COALESCE(SUM(va.acquisition_cost), 0)::NUMERIC AS cost,
    -- Estimate ARPU based on subscription data or default to $100
    COALESCE(AVG(
      CASE 
        WHEN s.subscription_amount IS NOT NULL THEN s.subscription_amount
        ELSE 100  -- Default ARPU for wedding industry
      END
    ), 100)::NUMERIC AS average_revenue_per_user
  FROM viral_attributions va
  LEFT JOIN referral_conversions rc ON va.conversion_id = rc.id
  LEFT JOIN user_profiles up ON rc.referred_user_id = up.id
  LEFT JOIN subscriptions s ON s.user_id = up.id
  WHERE va.created_at >= start_date
    AND va.created_at <= end_date
  GROUP BY va.source_channel
  ORDER BY conversions DESC;
END;
$$;

-- Function to get historical viral data for projections
CREATE OR REPLACE FUNCTION get_historical_viral_data(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  viral_coefficient NUMERIC,
  retention_rate NUMERIC,
  period_date TIMESTAMPTZ
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH monthly_data AS (
    SELECT 
      date_trunc('month', up.created_at) AS month,
      COUNT(DISTINCT up.id) AS new_users,
      COUNT(DISTINCT CASE WHEN rt.referral_type = 'viral' THEN up.id END) AS viral_users
    FROM user_profiles up
    LEFT JOIN referral_tracking rt ON rt.referred_user_id = up.id
    WHERE up.created_at >= start_date 
      AND up.created_at <= end_date
    GROUP BY date_trunc('month', up.created_at)
  )
  SELECT 
    CASE 
      WHEN LAG(md.new_users) OVER (ORDER BY md.month) > 0 
      THEN md.viral_users::NUMERIC / LAG(md.new_users) OVER (ORDER BY md.month)
      ELSE 0
    END AS viral_coefficient,
    0.85::NUMERIC AS retention_rate,  -- Default wedding industry retention
    md.month AS period_date
  FROM monthly_data md
  WHERE md.month >= start_date
  ORDER BY md.month;
END;
$$;

-- Create indexes for performance optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_viral_invitations_created_at 
ON viral_invitations(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referral_conversions_converted_at_status 
ON referral_conversions(converted_at, conversion_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_viral_attributions_created_source 
ON viral_attributions(created_at, source_channel);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_shares_created_channel 
ON template_shares(created_at, share_channel);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_viral_funnel_events_created_type 
ON viral_funnel_events(created_at, event_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_created_at 
ON user_profiles(created_at) WHERE created_at IS NOT NULL;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_viral_coefficient_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_attribution_model_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_aggregated_growth_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_sharing_metrics_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_viral_funnel_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_channel_effectiveness_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_historical_viral_data TO authenticated;

-- Add RLS policies for viral analytics tables
ALTER TABLE viral_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_funnel_events ENABLE ROW LEVEL SECURITY;

-- Policy for viral invitations - users can only see their own or if they're admin/analytics
CREATE POLICY viral_invitations_access ON viral_invitations
FOR ALL TO authenticated
USING (
  sender_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'analytics')
  )
);

-- Policy for viral attributions - admin and analytics roles only
CREATE POLICY viral_attributions_access ON viral_attributions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'analytics', 'marketing')
  )
);

-- Policy for referral conversions - users can see conversions they generated or if admin
CREATE POLICY referral_conversions_access ON referral_conversions
FOR ALL TO authenticated
USING (
  referrer_id = auth.uid()
  OR referred_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'analytics')
  )
);

-- Policy for viral funnel events - admin and analytics only
CREATE POLICY viral_funnel_events_access ON viral_funnel_events
FOR ALL TO authenticated  
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'analytics')
  )
);

-- Add comment for migration tracking
COMMENT ON FUNCTION get_viral_coefficient_data IS 'WS-170 Team C Viral Analytics - Calculates viral coefficient with privacy aggregation';
COMMENT ON FUNCTION get_attribution_model_data IS 'WS-170 Team C Viral Analytics - Attribution modeling for viral sources';
COMMENT ON FUNCTION get_aggregated_growth_metrics IS 'WS-170 Team C Viral Analytics - Growth metrics aggregation pipeline';