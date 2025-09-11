-- WS-120 MRR Tracking Dashboard System
-- Migration for comprehensive MRR tracking, growth metrics, churn analysis, and cohort analytics

-- MRR Snapshots table for historical tracking
CREATE TABLE IF NOT EXISTS mrr_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  total_mrr DECIMAL(12,2) NOT NULL DEFAULT 0,
  new_mrr DECIMAL(12,2) NOT NULL DEFAULT 0,
  expansion_mrr DECIMAL(12,2) NOT NULL DEFAULT 0,
  contraction_mrr DECIMAL(12,2) NOT NULL DEFAULT 0,
  churned_mrr DECIMAL(12,2) NOT NULL DEFAULT 0,
  reactivation_mrr DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_new_mrr DECIMAL(12,2) NOT NULL DEFAULT 0,
  active_subscriptions INTEGER NOT NULL DEFAULT 0,
  new_subscriptions INTEGER NOT NULL DEFAULT 0,
  churned_subscriptions INTEGER NOT NULL DEFAULT 0,
  average_revenue_per_user DECIMAL(10,2) NOT NULL DEFAULT 0,
  customer_lifetime_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  churn_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  growth_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  quick_ratio DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(snapshot_date)
);

-- Customer Revenue Details for granular tracking
CREATE TABLE IF NOT EXISTS customer_revenue_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  mrr DECIMAL(10,2) NOT NULL DEFAULT 0,
  plan_name VARCHAR(100),
  plan_price DECIMAL(10,2),
  status VARCHAR(20) NOT NULL,
  subscription_start_date DATE,
  subscription_end_date DATE,
  churn_date DATE,
  is_churned BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  is_expansion BOOLEAN DEFAULT false,
  is_contraction BOOLEAN DEFAULT false,
  is_reactivation BOOLEAN DEFAULT false,
  previous_mrr DECIMAL(10,2),
  mrr_change DECIMAL(10,2),
  days_active INTEGER,
  lifetime_value DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- Cohort Analysis table
CREATE TABLE IF NOT EXISTS cohort_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_month DATE NOT NULL,
  analysis_month DATE NOT NULL,
  months_since_signup INTEGER NOT NULL,
  initial_customers INTEGER NOT NULL DEFAULT 0,
  retained_customers INTEGER NOT NULL DEFAULT 0,
  retention_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  initial_mrr DECIMAL(12,2) NOT NULL DEFAULT 0,
  retained_mrr DECIMAL(12,2) NOT NULL DEFAULT 0,
  revenue_retention_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  average_revenue_per_retained_user DECIMAL(10,2) NOT NULL DEFAULT 0,
  churned_customers INTEGER NOT NULL DEFAULT 0,
  churn_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cohort_month, analysis_month)
);

-- Revenue Segments for analysis
CREATE TABLE IF NOT EXISTS revenue_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_name VARCHAR(100) NOT NULL,
  segment_type VARCHAR(50) NOT NULL CHECK (segment_type IN ('plan', 'industry', 'size', 'geography', 'custom')),
  month DATE NOT NULL,
  customer_count INTEGER NOT NULL DEFAULT 0,
  total_mrr DECIMAL(12,2) NOT NULL DEFAULT 0,
  average_mrr DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_mrr DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_mrr DECIMAL(10,2) NOT NULL DEFAULT 0,
  growth_rate DECIMAL(5,2),
  churn_rate DECIMAL(5,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(segment_name, segment_type, month)
);

-- Churn Predictions for proactive management
CREATE TABLE IF NOT EXISTS churn_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prediction_date DATE NOT NULL,
  churn_probability DECIMAL(5,2) NOT NULL,
  risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_factors JSONB DEFAULT '[]',
  engagement_score DECIMAL(5,2),
  usage_trend VARCHAR(20) CHECK (usage_trend IN ('increasing', 'stable', 'decreasing', 'inactive')),
  last_login_days_ago INTEGER,
  support_tickets_count INTEGER,
  feature_adoption_rate DECIMAL(5,2),
  payment_failures_count INTEGER,
  recommended_actions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, prediction_date)
);

-- MRR Movement Log for audit trail
CREATE TABLE IF NOT EXISTS mrr_movement_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('new', 'expansion', 'contraction', 'churn', 'reactivation')),
  movement_date DATE NOT NULL,
  previous_mrr DECIMAL(10,2) NOT NULL DEFAULT 0,
  new_mrr DECIMAL(10,2) NOT NULL DEFAULT 0,
  mrr_change DECIMAL(10,2) NOT NULL,
  reason VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_mrr_snapshots_date ON mrr_snapshots(snapshot_date DESC);
CREATE INDEX idx_customer_revenue_month ON customer_revenue_details(month DESC);
CREATE INDEX idx_customer_revenue_user ON customer_revenue_details(user_id);
CREATE INDEX idx_cohort_analysis_cohort ON cohort_analysis(cohort_month);
CREATE INDEX idx_revenue_segments_month ON revenue_segments(month DESC);
CREATE INDEX idx_churn_predictions_user ON churn_predictions(user_id);
CREATE INDEX idx_churn_predictions_risk ON churn_predictions(risk_level);
CREATE INDEX idx_mrr_movement_date ON mrr_movement_log(movement_date DESC);
CREATE INDEX idx_mrr_movement_user ON mrr_movement_log(user_id);

-- Function to calculate MRR for a given date
CREATE OR REPLACE FUNCTION calculate_mrr_snapshot(snapshot_date DATE)
RETURNS void AS $$
DECLARE
  v_total_mrr DECIMAL(12,2);
  v_new_mrr DECIMAL(12,2);
  v_expansion_mrr DECIMAL(12,2);
  v_contraction_mrr DECIMAL(12,2);
  v_churned_mrr DECIMAL(12,2);
  v_reactivation_mrr DECIMAL(12,2);
  v_active_subs INTEGER;
  v_new_subs INTEGER;
  v_churned_subs INTEGER;
BEGIN
  -- Calculate total MRR from active subscriptions
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN sp.billing_interval = 'year' THEN sp.price / 12
        ELSE sp.price
      END
    ), 0),
    COUNT(*)
  INTO v_total_mrr, v_active_subs
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.status = 'active'
    AND us.current_period_start <= snapshot_date
    AND us.current_period_end >= snapshot_date;

  -- Calculate new MRR (subscriptions started this month)
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN sp.billing_interval = 'year' THEN sp.price / 12
        ELSE sp.price
      END
    ), 0),
    COUNT(*)
  INTO v_new_mrr, v_new_subs
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.status = 'active'
    AND DATE_TRUNC('month', us.created_at) = DATE_TRUNC('month', snapshot_date);

  -- Calculate churned MRR (subscriptions ended this month)
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN sp.billing_interval = 'year' THEN sp.price / 12
        ELSE sp.price
      END
    ), 0),
    COUNT(*)
  INTO v_churned_mrr, v_churned_subs
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.status IN ('canceled', 'past_due')
    AND DATE_TRUNC('month', us.canceled_at) = DATE_TRUNC('month', snapshot_date);

  -- Insert or update the snapshot
  INSERT INTO mrr_snapshots (
    snapshot_date,
    total_mrr,
    new_mrr,
    expansion_mrr,
    contraction_mrr,
    churned_mrr,
    reactivation_mrr,
    net_new_mrr,
    active_subscriptions,
    new_subscriptions,
    churned_subscriptions,
    average_revenue_per_user,
    churn_rate,
    growth_rate
  ) VALUES (
    snapshot_date,
    v_total_mrr,
    v_new_mrr,
    v_expansion_mrr,
    v_contraction_mrr,
    v_churned_mrr,
    v_reactivation_mrr,
    v_new_mrr - v_churned_mrr + v_expansion_mrr - v_contraction_mrr + v_reactivation_mrr,
    v_active_subs,
    v_new_subs,
    v_churned_subs,
    CASE WHEN v_active_subs > 0 THEN v_total_mrr / v_active_subs ELSE 0 END,
    CASE WHEN v_active_subs > 0 THEN (v_churned_subs::DECIMAL / v_active_subs) * 100 ELSE 0 END,
    CASE WHEN v_total_mrr > 0 THEN ((v_new_mrr - v_churned_mrr) / v_total_mrr) * 100 ELSE 0 END
  )
  ON CONFLICT (snapshot_date) 
  DO UPDATE SET
    total_mrr = EXCLUDED.total_mrr,
    new_mrr = EXCLUDED.new_mrr,
    active_subscriptions = EXCLUDED.active_subscriptions,
    new_subscriptions = EXCLUDED.new_subscriptions,
    churned_subscriptions = EXCLUDED.churned_subscriptions,
    average_revenue_per_user = EXCLUDED.average_revenue_per_user,
    churn_rate = EXCLUDED.churn_rate,
    growth_rate = EXCLUDED.growth_rate,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to generate cohort analysis
CREATE OR REPLACE FUNCTION generate_cohort_analysis(analysis_date DATE)
RETURNS void AS $$
DECLARE
  cohort_record RECORD;
  analysis_record RECORD;
BEGIN
  -- Loop through each cohort month
  FOR cohort_record IN 
    SELECT DISTINCT DATE_TRUNC('month', created_at)::DATE as cohort_month
    FROM user_subscriptions
    WHERE created_at <= analysis_date
  LOOP
    -- Analyze retention for each month since cohort start
    FOR analysis_record IN
      SELECT 
        cohort_record.cohort_month,
        DATE_TRUNC('month', generate_series(
          cohort_record.cohort_month,
          analysis_date,
          '1 month'::interval
        ))::DATE as analysis_month
    LOOP
      INSERT INTO cohort_analysis (
        cohort_month,
        analysis_month,
        months_since_signup,
        initial_customers,
        retained_customers,
        retention_rate,
        initial_mrr,
        retained_mrr,
        revenue_retention_rate
      )
      SELECT
        cohort_record.cohort_month,
        analysis_record.analysis_month,
        EXTRACT(MONTH FROM AGE(analysis_record.analysis_month, cohort_record.cohort_month))::INTEGER,
        COUNT(DISTINCT us1.user_id),
        COUNT(DISTINCT us2.user_id),
        CASE 
          WHEN COUNT(DISTINCT us1.user_id) > 0 
          THEN (COUNT(DISTINCT us2.user_id)::DECIMAL / COUNT(DISTINCT us1.user_id)) * 100
          ELSE 0
        END,
        COALESCE(SUM(
          CASE 
            WHEN sp1.billing_interval = 'year' THEN sp1.price / 12
            ELSE sp1.price
          END
        ), 0),
        COALESCE(SUM(
          CASE 
            WHEN sp2.billing_interval = 'year' THEN sp2.price / 12
            ELSE sp2.price
          END
        ), 0),
        CASE 
          WHEN COALESCE(SUM(
            CASE 
              WHEN sp1.billing_interval = 'year' THEN sp1.price / 12
              ELSE sp1.price
            END
          ), 0) > 0
          THEN (COALESCE(SUM(
            CASE 
              WHEN sp2.billing_interval = 'year' THEN sp2.price / 12
              ELSE sp2.price
            END
          ), 0) / COALESCE(SUM(
            CASE 
              WHEN sp1.billing_interval = 'year' THEN sp1.price / 12
              ELSE sp1.price
            END
          ), 0)) * 100
          ELSE 0
        END
      FROM user_subscriptions us1
      LEFT JOIN subscription_plans sp1 ON us1.plan_id = sp1.id
      LEFT JOIN user_subscriptions us2 ON us1.user_id = us2.user_id
        AND us2.status = 'active'
        AND DATE_TRUNC('month', us2.current_period_start) <= analysis_record.analysis_month
        AND DATE_TRUNC('month', us2.current_period_end) >= analysis_record.analysis_month
      LEFT JOIN subscription_plans sp2 ON us2.plan_id = sp2.id
      WHERE DATE_TRUNC('month', us1.created_at) = cohort_record.cohort_month
      ON CONFLICT (cohort_month, analysis_month) 
      DO UPDATE SET
        retained_customers = EXCLUDED.retained_customers,
        retention_rate = EXCLUDED.retention_rate,
        retained_mrr = EXCLUDED.retained_mrr,
        revenue_retention_rate = EXCLUDED.revenue_retention_rate,
        updated_at = NOW();
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE mrr_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_revenue_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mrr_movement_log ENABLE ROW LEVEL SECURITY;

-- Admin access to all MRR data
CREATE POLICY "Admins can view all MRR data" ON mrr_snapshots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all customer revenue" ON customer_revenue_details
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all cohort analysis" ON cohort_analysis
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all revenue segments" ON revenue_segments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all churn predictions" ON churn_predictions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all MRR movements" ON mrr_movement_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Scheduled job to calculate daily MRR snapshots (to be run via cron)
-- This would be scheduled via Supabase dashboard or external cron service
-- SELECT calculate_mrr_snapshot(CURRENT_DATE);
-- SELECT generate_cohort_analysis(CURRENT_DATE);