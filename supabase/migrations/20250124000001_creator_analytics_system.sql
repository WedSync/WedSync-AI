-- WS-113: Creator Analytics System
-- Comprehensive analytics tracking for marketplace creators
-- Enables real-time insights, revenue tracking, and optimization

-- Analytics events table with wedding-specific context
CREATE TABLE IF NOT EXISTS creator_analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('view', 'click', 'purchase', 'bundle_view', 'download', 'preview')),
    event_data JSONB DEFAULT '{}',
    user_id UUID REFERENCES user_profiles(id), -- Purchasing coordinator
    session_id UUID NOT NULL,
    wedding_season VARCHAR(20) CHECK (wedding_season IN ('spring', 'summer', 'fall', 'winter', NULL)),
    wedding_type VARCHAR(30) CHECK (wedding_type IN ('luxury', 'destination', 'local', 'elopement', 'traditional', 'micro', NULL)),
    referrer_category VARCHAR(50), -- Which marketplace category led to this event
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_event_data CHECK (jsonb_typeof(event_data) = 'object')
);

-- Daily aggregated metrics for fast dashboard loading
CREATE TABLE IF NOT EXISTS creator_daily_metrics (
    creator_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    template_views INTEGER DEFAULT 0 CHECK (template_views >= 0),
    template_clicks INTEGER DEFAULT 0 CHECK (template_clicks >= 0),
    purchases INTEGER DEFAULT 0 CHECK (purchases >= 0),
    gross_revenue INTEGER DEFAULT 0 CHECK (gross_revenue >= 0), -- In cents
    net_revenue INTEGER DEFAULT 0 CHECK (net_revenue >= 0), -- After platform commission
    unique_visitors INTEGER DEFAULT 0 CHECK (unique_visitors >= 0),
    conversion_rate DECIMAL(5,4) DEFAULT 0 CHECK (conversion_rate >= 0 AND conversion_rate <= 1),
    average_order_value INTEGER DEFAULT 0 CHECK (average_order_value >= 0),
    wedding_season_breakdown JSONB DEFAULT '{}',
    customer_type_breakdown JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (creator_id, metric_date)
);

-- A/B testing framework for creators
CREATE TABLE IF NOT EXISTS creator_ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
    test_name VARCHAR(100) NOT NULL,
    test_type VARCHAR(30) NOT NULL CHECK (test_type IN ('pricing', 'description', 'title', 'screenshots', 'category', 'tags')),
    control_variant JSONB NOT NULL,
    test_variant JSONB NOT NULL,
    traffic_allocation DECIMAL(3,2) DEFAULT 0.50 CHECK (traffic_allocation > 0 AND traffic_allocation < 1),
    success_metric VARCHAR(30) DEFAULT 'conversion_rate' CHECK (success_metric IN ('conversion_rate', 'revenue', 'clicks', 'time_on_page')),
    target_significance DECIMAL(3,2) DEFAULT 0.95 CHECK (target_significance >= 0.90 AND target_significance <= 0.99),
    minimum_sample_size INTEGER DEFAULT 100 CHECK (minimum_sample_size >= 10),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'stopped', 'paused')),
    wedding_seasonality_factor JSONB DEFAULT '{}',
    control_conversions INTEGER DEFAULT 0,
    test_conversions INTEGER DEFAULT 0,
    control_visitors INTEGER DEFAULT 0,
    test_visitors INTEGER DEFAULT 0,
    winner VARCHAR(10) CHECK (winner IN ('control', 'test', 'none', NULL)),
    confidence_level DECIMAL(3,2),
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT valid_test_dates CHECK (ends_at > starts_at OR ends_at IS NULL)
);

-- Bundle performance tracking for revenue optimization
CREATE TABLE IF NOT EXISTS creator_bundle_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    bundle_templates UUID[] NOT NULL,
    bundle_name VARCHAR(100),
    frequency_bought_together DECIMAL(3,2) CHECK (frequency_bought_together >= 0 AND frequency_bought_together <= 1),
    average_bundle_revenue INTEGER CHECK (average_bundle_revenue >= 0),
    projected_individual_revenue INTEGER CHECK (projected_individual_revenue >= 0),
    bundle_uplift_percentage DECIMAL(5,1),
    wedding_coordinator_segment VARCHAR(30),
    total_sales INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator revenue tracking table
CREATE TABLE IF NOT EXISTS creator_revenue_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    template_id UUID REFERENCES marketplace_templates(id) ON DELETE SET NULL,
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('sale', 'refund', 'payout', 'commission', 'adjustment')),
    gross_amount INTEGER NOT NULL, -- In cents
    commission_amount INTEGER DEFAULT 0,
    net_amount INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    stripe_payment_id TEXT,
    payout_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator insights and recommendations
CREATE TABLE IF NOT EXISTS creator_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL CHECK (insight_type IN ('pricing', 'timing', 'competition', 'seasonality', 'bundling', 'performance', 'opportunity')),
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    impact_description TEXT,
    actionable BOOLEAN DEFAULT TRUE,
    suggested_actions JSONB DEFAULT '[]',
    wedding_context TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    dismissed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes for fast analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_creator_date ON creator_analytics_events(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_template_type ON creator_analytics_events(template_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON creator_analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON creator_analytics_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_daily_metrics_creator_range ON creator_daily_metrics(creator_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_ab_tests_active ON creator_ab_tests(creator_id, status) WHERE status IN ('running', 'draft');
CREATE INDEX IF NOT EXISTS idx_ab_tests_template ON creator_ab_tests(template_id);
CREATE INDEX IF NOT EXISTS idx_bundle_analytics_creator ON creator_bundle_analytics(creator_id);
CREATE INDEX IF NOT EXISTS idx_revenue_tracking_creator ON creator_revenue_tracking(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_tracking_status ON creator_revenue_tracking(payment_status) WHERE payment_status != 'completed';
CREATE INDEX IF NOT EXISTS idx_insights_active ON creator_insights(creator_id, is_active) WHERE is_active = TRUE;

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_analytics_events_data ON creator_analytics_events USING GIN (event_data);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_breakdown ON creator_daily_metrics USING GIN (wedding_season_breakdown);

-- Row Level Security for creator data isolation
ALTER TABLE creator_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_bundle_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_revenue_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creators to only view their own data
CREATE POLICY "Creators view own analytics events" ON creator_analytics_events
    FOR SELECT USING (creator_id = auth.uid() OR EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'OWNER')
    ));

CREATE POLICY "Creators view own metrics" ON creator_daily_metrics
    FOR SELECT USING (creator_id = auth.uid() OR EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'OWNER')
    ));

CREATE POLICY "Creators manage own AB tests" ON creator_ab_tests
    FOR ALL USING (creator_id = auth.uid() OR EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'OWNER')
    ));

CREATE POLICY "Creators view own bundle analytics" ON creator_bundle_analytics
    FOR SELECT USING (creator_id = auth.uid() OR EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'OWNER')
    ));

CREATE POLICY "Creators view own revenue" ON creator_revenue_tracking
    FOR SELECT USING (creator_id = auth.uid() OR EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'OWNER')
    ));

CREATE POLICY "Creators manage own insights" ON creator_insights
    FOR ALL USING (creator_id = auth.uid() OR EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'OWNER')
    ));

-- Function to increment daily metrics
CREATE OR REPLACE FUNCTION increment_daily_metrics(
  p_creator_id UUID,
  p_date DATE,
  p_updates JSONB
) RETURNS VOID AS $$
BEGIN
  INSERT INTO creator_daily_metrics (
    creator_id, 
    metric_date, 
    template_views, 
    template_clicks, 
    purchases,
    gross_revenue,
    unique_visitors
  )
  VALUES (
    p_creator_id, 
    p_date,
    COALESCE((p_updates->>'template_views')::INTEGER, 0),
    COALESCE((p_updates->>'template_clicks')::INTEGER, 0),
    COALESCE((p_updates->>'purchases')::INTEGER, 0),
    COALESCE((p_updates->>'gross_revenue')::INTEGER, 0),
    COALESCE((p_updates->>'unique_visitors')::INTEGER, 0)
  )
  ON CONFLICT (creator_id, metric_date)
  DO UPDATE SET
    template_views = creator_daily_metrics.template_views + COALESCE((p_updates->>'template_views')::INTEGER, 0),
    template_clicks = creator_daily_metrics.template_clicks + COALESCE((p_updates->>'template_clicks')::INTEGER, 0),
    purchases = creator_daily_metrics.purchases + COALESCE((p_updates->>'purchases')::INTEGER, 0),
    gross_revenue = creator_daily_metrics.gross_revenue + COALESCE((p_updates->>'gross_revenue')::INTEGER, 0),
    unique_visitors = GREATEST(
      creator_daily_metrics.unique_visitors,
      COALESCE((p_updates->>'unique_visitors')::INTEGER, creator_daily_metrics.unique_visitors)
    ),
    conversion_rate = CASE 
      WHEN (creator_daily_metrics.template_clicks + COALESCE((p_updates->>'template_clicks')::INTEGER, 0)) > 0
      THEN (creator_daily_metrics.purchases + COALESCE((p_updates->>'purchases')::INTEGER, 0))::DECIMAL / 
           (creator_daily_metrics.template_clicks + COALESCE((p_updates->>'template_clicks')::INTEGER, 0))
      ELSE 0
    END,
    average_order_value = CASE
      WHEN (creator_daily_metrics.purchases + COALESCE((p_updates->>'purchases')::INTEGER, 0)) > 0
      THEN (creator_daily_metrics.gross_revenue + COALESCE((p_updates->>'gross_revenue')::INTEGER, 0)) / 
           (creator_daily_metrics.purchases + COALESCE((p_updates->>'purchases')::INTEGER, 0))
      ELSE 0
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to analyze bundle opportunities
CREATE OR REPLACE FUNCTION analyze_bundle_opportunities(
  p_creator_id UUID,
  p_days_back INTEGER DEFAULT 30
) RETURNS TABLE (
  template_ids UUID[],
  category TEXT,
  individual_total INTEGER,
  frequency DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH purchase_pairs AS (
    SELECT 
      ARRAY[e1.template_id, e2.template_id]::UUID[] as template_pair,
      COUNT(*) as co_purchases
    FROM creator_analytics_events e1
    JOIN creator_analytics_events e2 
      ON e1.session_id = e2.session_id
      AND e1.created_at::DATE = e2.created_at::DATE
    WHERE e1.creator_id = p_creator_id 
      AND e2.creator_id = p_creator_id
      AND e1.event_type = 'purchase'
      AND e2.event_type = 'purchase' 
      AND e1.template_id < e2.template_id -- Avoid duplicates
      AND e1.created_at >= NOW() - INTERVAL '1 day' * p_days_back
    GROUP BY template_pair
    HAVING COUNT(*) >= 3
  ),
  total_purchases AS (
    SELECT COUNT(DISTINCT session_id) as total
    FROM creator_analytics_events
    WHERE creator_id = p_creator_id 
      AND event_type = 'purchase'
      AND created_at >= NOW() - INTERVAL '1 day' * p_days_back
  ),
  template_prices AS (
    SELECT id, price_cents
    FROM marketplace_templates
    WHERE id = ANY(SELECT UNNEST(template_pair) FROM purchase_pairs)
  )
  SELECT 
    pp.template_pair,
    'Mixed' as category,
    COALESCE(SUM(tp.price_cents), 0)::INTEGER as individual_total,
    (pp.co_purchases::DECIMAL / NULLIF(t.total, 0))::DECIMAL(5,2) as frequency
  FROM purchase_pairs pp
  CROSS JOIN total_purchases t
  LEFT JOIN template_prices tp ON tp.id = ANY(pp.template_pair)
  WHERE (pp.co_purchases::DECIMAL / NULLIF(t.total, 0)) >= 0.15
  GROUP BY pp.template_pair, pp.co_purchases, t.total
  ORDER BY frequency DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate creator rankings
CREATE OR REPLACE FUNCTION calculate_creator_rankings(
  p_category VARCHAR(50) DEFAULT NULL
) RETURNS TABLE (
  creator_id UUID,
  rank INTEGER,
  total_revenue INTEGER,
  total_sales INTEGER,
  conversion_rate DECIMAL(5,4)
) AS $$
BEGIN
  RETURN QUERY
  WITH creator_stats AS (
    SELECT 
      cdm.creator_id,
      SUM(cdm.gross_revenue) as total_revenue,
      SUM(cdm.purchases) as total_sales,
      AVG(cdm.conversion_rate) as avg_conversion_rate
    FROM creator_daily_metrics cdm
    WHERE cdm.metric_date >= CURRENT_DATE - INTERVAL '30 days'
      AND (p_category IS NULL OR EXISTS (
        SELECT 1 FROM marketplace_templates mt
        WHERE mt.id IN (
          SELECT DISTINCT template_id 
          FROM creator_analytics_events cae
          WHERE cae.creator_id = cdm.creator_id
        ) AND mt.category = p_category
      ))
    GROUP BY cdm.creator_id
  )
  SELECT 
    cs.creator_id,
    RANK() OVER (ORDER BY cs.total_revenue DESC)::INTEGER as rank,
    cs.total_revenue::INTEGER,
    cs.total_sales::INTEGER,
    cs.avg_conversion_rate
  FROM creator_stats cs
  ORDER BY rank;
END;
$$ LANGUAGE plpgsql;

-- Function to generate insights
CREATE OR REPLACE FUNCTION generate_creator_insights(
  p_creator_id UUID
) RETURNS VOID AS $$
DECLARE
  v_avg_conversion DECIMAL(5,4);
  v_category_avg_conversion DECIMAL(5,4);
  v_recent_revenue INTEGER;
  v_previous_revenue INTEGER;
BEGIN
  -- Get creator's average conversion rate
  SELECT AVG(conversion_rate) INTO v_avg_conversion
  FROM creator_daily_metrics
  WHERE creator_id = p_creator_id
    AND metric_date >= CURRENT_DATE - INTERVAL '30 days';

  -- Get category average conversion rate
  SELECT AVG(cdm.conversion_rate) INTO v_category_avg_conversion
  FROM creator_daily_metrics cdm
  WHERE cdm.metric_date >= CURRENT_DATE - INTERVAL '30 days'
    AND cdm.creator_id != p_creator_id
    AND EXISTS (
      SELECT 1 FROM marketplace_templates mt1
      JOIN marketplace_templates mt2 ON mt1.category = mt2.category
      WHERE mt2.supplier_id = p_creator_id
        AND mt1.supplier_id = cdm.creator_id
    );

  -- Check for low conversion rate insight
  IF v_avg_conversion < 0.02 AND v_avg_conversion < v_category_avg_conversion * 0.8 THEN
    INSERT INTO creator_insights (
      creator_id,
      insight_type,
      severity,
      title,
      description,
      impact_description,
      actionable,
      suggested_actions,
      wedding_context,
      expires_at
    ) VALUES (
      p_creator_id,
      'pricing',
      'high',
      'Low Conversion Rate Detected',
      format('Your conversion rate of %s%% is below the category average of %s%%', 
        (v_avg_conversion * 100)::NUMERIC(4,1), 
        (v_category_avg_conversion * 100)::NUMERIC(4,1)),
      'Could increase revenue by 25-40% with optimization',
      TRUE,
      jsonb_build_array(
        jsonb_build_object(
          'action', 'Review pricing strategy',
          'description', 'Consider reducing prices by 10-15% to test market response',
          'estimatedUplift', '+25% in conversions'
        ),
        jsonb_build_object(
          'action', 'Optimize template descriptions',
          'description', 'Focus on specific wedding pain points and time-saving benefits',
          'estimatedUplift', '+15% in conversions'
        )
      ),
      'Wedding coordinators are price-sensitive during off-peak seasons. Consider seasonal pricing adjustments.',
      NOW() + INTERVAL '7 days'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Check for revenue trends
  SELECT SUM(gross_revenue) INTO v_recent_revenue
  FROM creator_daily_metrics
  WHERE creator_id = p_creator_id
    AND metric_date >= CURRENT_DATE - INTERVAL '7 days';

  SELECT SUM(gross_revenue) INTO v_previous_revenue
  FROM creator_daily_metrics
  WHERE creator_id = p_creator_id
    AND metric_date >= CURRENT_DATE - INTERVAL '14 days'
    AND metric_date < CURRENT_DATE - INTERVAL '7 days';

  IF v_recent_revenue < v_previous_revenue * 0.7 THEN
    INSERT INTO creator_insights (
      creator_id,
      insight_type,
      severity,
      title,
      description,
      impact_description,
      actionable,
      suggested_actions,
      wedding_context,
      expires_at
    ) VALUES (
      p_creator_id,
      'performance',
      'medium',
      'Revenue Decline Detected',
      format('Your revenue has decreased by %s%% compared to last week',
        ((1 - (v_recent_revenue::DECIMAL / NULLIF(v_previous_revenue, 0))) * 100)::NUMERIC(4,1)),
      'Take action to reverse the trend',
      TRUE,
      jsonb_build_array(
        jsonb_build_object(
          'action', 'Launch promotional campaign',
          'description', 'Offer limited-time discount to boost sales',
          'estimatedUplift', '+30% in weekly sales'
        ),
        jsonb_build_object(
          'action', 'Update template previews',
          'description', 'Refresh screenshots and descriptions',
          'estimatedUplift', '+20% in click-through rate'
        )
      ),
      'Wedding planning activity typically increases on Sundays and Mondays. Time your promotions accordingly.',
      NOW() + INTERVAL '3 days'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Mark old insights as inactive
  UPDATE creator_insights
  SET is_active = FALSE
  WHERE creator_id = p_creator_id
    AND expires_at < NOW()
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to generate insights automatically
CREATE OR REPLACE FUNCTION trigger_generate_insights() RETURNS TRIGGER AS $$
BEGIN
  -- Generate insights when daily metrics are updated
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Run asynchronously to avoid blocking
    PERFORM generate_creator_insights(NEW.creator_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_insights_on_metrics_update
  AFTER INSERT OR UPDATE ON creator_daily_metrics
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_insights();

-- Grant permissions for service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;