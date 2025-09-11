-- WS-183 LTV Calculations Migration
-- Multi-model LTV prediction system with advanced financial analytics
-- Created: 2025-01-20

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =====================================================
-- CORE LTV CALCULATION TABLES
-- =====================================================

-- 1. Customer LTV calculations with model tracking
CREATE TABLE IF NOT EXISTS user_ltv (
    user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
    historical_ltv DECIMAL(12,2) NOT NULL DEFAULT 0,
    predicted_ltv DECIMAL(12,2),
    total_ltv DECIMAL(12,2),
    confidence_score DECIMAL(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    months_active INTEGER DEFAULT 0,
    last_payment_date DATE,
    churn_probability DECIMAL(5,4) CHECK (churn_probability >= 0 AND churn_probability <= 1),
    expansion_rate DECIMAL(5,4),
    cac DECIMAL(10,2),
    ltv_cac_ratio DECIMAL(7,2),
    payback_months INTEGER,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    model_version TEXT DEFAULT 'v2.1-ensemble',
    prediction_horizon_months INTEGER DEFAULT 24,
    risk_factors JSONB DEFAULT '[]',
    expansion_potential DECIMAL(5,4),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LTV segments for benchmark analysis
CREATE TABLE IF NOT EXISTS ltv_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    segment_type TEXT NOT NULL CHECK (segment_type IN ('vendor_type', 'plan', 'acquisition_channel', 'market_position')),
    segment_value TEXT NOT NULL,
    avg_ltv DECIMAL(12,2),
    median_ltv DECIMAL(12,2),
    p90_ltv DECIMAL(12,2),
    p10_ltv DECIMAL(12,2),
    user_count INTEGER DEFAULT 0,
    avg_tenure DECIMAL(7,2),
    confidence_score DECIMAL(5,4),
    sample_quality_score DECIMAL(5,4),
    last_calculated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Performance metrics
    retention_rate_12m DECIMAL(5,4),
    churn_rate DECIMAL(5,4),
    expansion_rate DECIMAL(5,4),
    
    -- Timestamps
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(segment_type, segment_value)
);

-- 3. Customer acquisition costs with multi-touch attribution
CREATE TABLE IF NOT EXISTS customer_acquisition_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    channel TEXT NOT NULL,
    campaign_id TEXT,
    marketing_spend DECIMAL(12,2) DEFAULT 0,
    operational_spend DECIMAL(12,2) DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    cac DECIMAL(10,2),
    attribution_model TEXT DEFAULT 'time_decay' CHECK (attribution_model IN ('first_touch', 'last_touch', 'linear', 'time_decay', 'position_based')),
    
    -- Quality metrics
    conversion_rate DECIMAL(7,4),
    quality_score DECIMAL(5,4),
    average_journey_length DECIMAL(5,2),
    average_time_to_purchase DECIMAL(7,2), -- days
    
    -- Performance trends
    month_over_month_change DECIMAL(7,4),
    quarter_over_quarter_change DECIMAL(7,4),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ADVANCED ATTRIBUTION AND LIFECYCLE TRACKING
-- =====================================================

-- 4. Customer lifecycle events for comprehensive tracking
CREATE TABLE IF NOT EXISTS customer_lifecycle_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('acquisition', 'conversion', 'expansion', 'contraction', 'churn', 'reactivation')),
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_value DECIMAL(12,2) DEFAULT 0,
    
    -- Attribution data
    channel VARCHAR(100),
    campaign_id VARCHAR(100),
    touchpoint_id VARCHAR(100),
    
    -- Context
    previous_tier VARCHAR(50),
    new_tier VARCHAR(50),
    churn_reason TEXT,
    reactivation_method TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_lifecycle_customer_type_time (customer_id, event_type, event_timestamp DESC),
    INDEX idx_lifecycle_channel_time (channel, event_timestamp DESC) WHERE event_type = 'acquisition'
);

-- 5. Subscription revenue tracking with granular details
CREATE TABLE IF NOT EXISTS subscription_revenue (
    revenue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    subscription_id UUID,
    revenue_date DATE NOT NULL,
    
    -- Revenue metrics
    mrr_amount DECIMAL(12,2) NOT NULL,
    arr_amount DECIMAL(12,2) NOT NULL,
    net_revenue DECIMAL(12,2) GENERATED ALWAYS AS (mrr_amount - COALESCE(discount_amount, 0)) STORED,
    
    -- Plan details
    plan_tier VARCHAR(50),
    billing_cycle INTEGER DEFAULT 1, -- months
    discount_amount DECIMAL(12,2) DEFAULT 0,
    discount_reason TEXT,
    
    -- Cohort analysis
    cohort_month DATE,
    months_since_acquisition INTEGER,
    
    -- Revenue type classification
    revenue_type VARCHAR(30) DEFAULT 'recurring' CHECK (revenue_type IN ('recurring', 'expansion', 'one_time', 'usage_based')),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_subscription_revenue_customer_date (customer_id, revenue_date DESC),
    INDEX idx_subscription_revenue_cohort (cohort_month, revenue_date),
    INDEX idx_subscription_revenue_covering (revenue_date DESC) INCLUDE (customer_id, net_revenue, plan_tier)
);

-- 6. Marketing attribution with sophisticated tracking
CREATE TABLE IF NOT EXISTS marketing_attribution (
    attribution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    touchpoint_id VARCHAR(100) NOT NULL,
    
    -- Touchpoint details
    channel VARCHAR(100) NOT NULL,
    campaign_id VARCHAR(100),
    ad_group_id VARCHAR(100),
    keyword TEXT,
    creative_id VARCHAR(100),
    
    -- Timing
    touchpoint_timestamp TIMESTAMPTZ NOT NULL,
    conversion_timestamp TIMESTAMPTZ,
    
    -- Attribution weights
    attribution_weight DECIMAL(7,4) DEFAULT 1.0,
    time_decay_factor DECIMAL(7,4),
    position_weight DECIMAL(7,4),
    
    -- Journey context
    position_in_journey INTEGER DEFAULT 1,
    total_journey_length INTEGER DEFAULT 1,
    time_since_previous_touch INTERVAL,
    
    -- Costs and value
    cost_per_touchpoint DECIMAL(10,2) DEFAULT 0,
    attributed_revenue DECIMAL(12,2) DEFAULT 0,
    
    -- Quality metrics
    interaction_type VARCHAR(50) DEFAULT 'view', -- 'view', 'click', 'engagement', 'conversion'
    engagement_score DECIMAL(5,2),
    
    -- Metadata
    device_type VARCHAR(50),
    browser VARCHAR(50),
    location_country VARCHAR(2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_attribution_customer_journey (customer_id, touchpoint_timestamp, position_in_journey),
    INDEX idx_attribution_channel_conversion (channel, conversion_timestamp) WHERE conversion_timestamp IS NOT NULL,
    INDEX idx_attribution_campaign_performance (campaign_id, conversion_timestamp DESC) WHERE campaign_id IS NOT NULL
);

-- =====================================================
-- PREDICTION MODELS AND VALIDATION
-- =====================================================

-- 7. LTV prediction models metadata
CREATE TABLE IF NOT EXISTS ltv_prediction_models (
    model_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(20) NOT NULL,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('historical', 'cohort_based', 'probabilistic', 'ml_regression', 'ensemble')),
    
    -- Model configuration
    parameters JSONB DEFAULT '{}',
    feature_importance JSONB DEFAULT '{}',
    training_data_period DATERANGE,
    
    -- Performance metrics
    accuracy_score DECIMAL(7,4),
    rmse DECIMAL(12,2),
    mae DECIMAL(12,2),
    confidence_interval_95 DECIMAL(7,4),
    
    -- Validation results
    cross_validation_score DECIMAL(7,4),
    training_samples INTEGER,
    validation_samples INTEGER,
    
    -- Model lifecycle
    training_date DATE,
    last_prediction_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    performance_threshold DECIMAL(7,4) DEFAULT 0.75,
    
    -- Metadata
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(model_name, model_version)
);

-- 8. LTV prediction results with detailed breakdown
CREATE TABLE IF NOT EXISTS customer_ltv_calculations (
    calculation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    model_id UUID REFERENCES ltv_prediction_models(model_id),
    calculation_date DATE NOT NULL,
    
    -- LTV predictions
    historical_ltv DECIMAL(12,2) DEFAULT 0,
    predicted_ltv_12m DECIMAL(12,2),
    predicted_ltv_24m DECIMAL(12,2),
    predicted_ltv_36m DECIMAL(12,2),
    
    -- Model outputs
    confidence_score DECIMAL(7,4),
    prediction_interval_lower DECIMAL(12,2),
    prediction_interval_upper DECIMAL(12,2),
    
    -- Segmentation
    segment VARCHAR(100),
    cohort_month DATE,
    acquisition_channel VARCHAR(100),
    plan_tier VARCHAR(50),
    
    -- Risk assessment
    churn_probability DECIMAL(7,4),
    days_to_churn INTEGER,
    expansion_probability DECIMAL(7,4),
    
    -- Financial metrics
    cac DECIMAL(10,2),
    ltv_cac_ratio DECIMAL(7,2),
    payback_period_months INTEGER,
    
    -- Model breakdown (for ensemble models)
    model_predictions JSONB DEFAULT '{}',
    contributing_factors JSONB DEFAULT '[]',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(customer_id, model_id, calculation_date),
    INDEX idx_ltv_calculations_customer_date (customer_id, calculation_date DESC),
    INDEX idx_ltv_calculations_segment (segment, predicted_ltv_24m DESC),
    INDEX idx_ltv_calculations_cohort (cohort_month, acquisition_channel)
);

-- =====================================================
-- PERFORMANCE MONITORING AND AUDIT
-- =====================================================

-- 9. Financial audit log for compliance and tracking
CREATE TABLE IF NOT EXISTS financial_audit_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id),
    action VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100),
    resource_type VARCHAR(50),
    
    -- Request details
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    
    -- Results
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    execution_time_ms INTEGER,
    
    -- Timestamps
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_audit_user_action (user_id, action, timestamp DESC),
    INDEX idx_audit_resource (resource_type, resource_id, timestamp DESC)
);

-- 10. Batch processing jobs for large operations
CREATE TABLE IF NOT EXISTS batch_processing_jobs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id VARCHAR(100) UNIQUE NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES user_profiles(id),
    
    -- Job status
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    
    -- Job data
    job_data JSONB DEFAULT '{}',
    results JSONB,
    error_details JSONB,
    
    -- Performance metrics
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    execution_time_seconds INTEGER,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_batch_jobs_user_status (user_id, status, created_at DESC),
    INDEX idx_batch_jobs_type_status (job_type, status, created_at DESC)
);

-- =====================================================
-- INDEXES FOR OPTIMAL PERFORMANCE
-- =====================================================

-- Core LTV table indexes
CREATE INDEX IF NOT EXISTS idx_user_ltv_calculated 
    ON user_ltv(calculated_at DESC, confidence_score DESC) 
    WHERE confidence_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_ltv_performance 
    ON user_ltv(ltv_cac_ratio DESC, total_ltv DESC) 
    WHERE ltv_cac_ratio > 0;

-- Segment analysis indexes
CREATE INDEX IF NOT EXISTS idx_ltv_segments_type_value 
    ON ltv_segments(segment_type, segment_value, avg_ltv DESC);

-- CAC analysis indexes
CREATE INDEX IF NOT EXISTS idx_cac_channel_period 
    ON customer_acquisition_costs(channel, period_start DESC, cac ASC);

-- Time-series performance indexes
CREATE INDEX IF NOT EXISTS idx_revenue_time_series 
    ON subscription_revenue(revenue_date DESC, plan_tier) 
    INCLUDE (customer_id, net_revenue);

-- Model performance indexes
CREATE INDEX IF NOT EXISTS idx_models_active_performance 
    ON ltv_prediction_models(is_active, accuracy_score DESC, training_date DESC) 
    WHERE is_active = TRUE;

-- =====================================================
-- TRIGGERS FOR DATA CONSISTENCY
-- =====================================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_user_ltv_updated_at 
    BEFORE UPDATE ON user_ltv 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cac_updated_at 
    BEFORE UPDATE ON customer_acquisition_costs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ltv_calculations_updated_at 
    BEFORE UPDATE ON customer_ltv_calculations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prediction_models_updated_at 
    BEFORE UPDATE ON ltv_prediction_models 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batch_jobs_updated_at 
    BEFORE UPDATE ON batch_processing_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on sensitive financial tables
ALTER TABLE user_ltv ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_ltv_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_ltv
CREATE POLICY "Users can view own LTV data"
    ON user_ltv FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all LTV data"
    ON user_ltv FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'executive')
        )
    );

-- RLS policies for financial calculations
CREATE POLICY "Users can view own calculations"
    ON customer_ltv_calculations FOR SELECT
    USING (customer_id = auth.uid());

CREATE POLICY "Financial team access to calculations"
    ON customer_ltv_calculations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND (role IN ('admin', 'executive') 
                 OR 'financial:read' = ANY(permissions))
        )
    );

-- RLS policies for audit logs
CREATE POLICY "Users can view own audit logs"
    ON financial_audit_log FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all audit logs"
    ON financial_audit_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- =====================================================
-- INITIAL DATA AND CONFIGURATION
-- =====================================================

-- Insert default prediction models
INSERT INTO ltv_prediction_models (
    model_name, model_version, model_type, parameters, accuracy_score, is_active
) VALUES 
    ('Historical Average', 'v1.0', 'historical', '{"lookback_months": 12}', 0.75, true),
    ('Cohort Based', 'v1.2', 'cohort_based', '{"cohort_window": "monthly", "min_cohort_size": 10}', 0.82, true),
    ('ML Regression', 'v2.1', 'ml_regression', '{"features": ["revenue_trend", "engagement", "plan_tier"], "algorithm": "ensemble"}', 0.87, true),
    ('Bayesian Probabilistic', 'v1.0', 'probabilistic', '{"prior_mean": 1800, "prior_variance": 400000}', 0.78, true),
    ('Ensemble Model', 'v2.1', 'ensemble', '{"models": ["cohort", "ml", "probabilistic"], "weights": [0.4, 0.3, 0.3]}', 0.89, true)
ON CONFLICT (model_name, model_version) DO NOTHING;

-- Insert default segments for benchmarking
INSERT INTO ltv_segments (segment_type, segment_value, avg_ltv, median_ltv, user_count) VALUES
    ('vendor_type', 'photographer', 2200.00, 1800.00, 0),
    ('vendor_type', 'venue', 3500.00, 2800.00, 0),
    ('vendor_type', 'caterer', 2800.00, 2200.00, 0),
    ('vendor_type', 'florist', 1600.00, 1200.00, 0),
    ('vendor_type', 'dj', 1400.00, 1100.00, 0),
    ('plan', 'basic', 800.00, 600.00, 0),
    ('plan', 'premium', 2400.00, 2000.00, 0),
    ('plan', 'enterprise', 5200.00, 4500.00, 0),
    ('acquisition_channel', 'organic', 2100.00, 1700.00, 0),
    ('acquisition_channel', 'paid_search', 1800.00, 1400.00, 0),
    ('acquisition_channel', 'social', 1600.00, 1200.00, 0),
    ('acquisition_channel', 'referral', 2800.00, 2300.00, 0)
ON CONFLICT (segment_type, segment_value) DO NOTHING;

-- =====================================================
-- PERFORMANCE OPTIMIZATION FUNCTIONS
-- =====================================================

-- Function to refresh LTV segment calculations
CREATE OR REPLACE FUNCTION refresh_ltv_segments()
RETURNS void AS $$
BEGIN
    -- Update segment averages based on current data
    WITH segment_stats AS (
        SELECT 
            up.business_type as segment_value,
            'vendor_type' as segment_type,
            AVG(cltv.predicted_ltv_24m) as avg_ltv,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cltv.predicted_ltv_24m) as median_ltv,
            PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY cltv.predicted_ltv_24m) as p90_ltv,
            PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY cltv.predicted_ltv_24m) as p10_ltv,
            COUNT(*) as user_count,
            AVG(EXTRACT(EPOCH FROM (NOW() - up.created_at)) / (30.44 * 24 * 3600)) as avg_tenure
        FROM user_profiles up
        JOIN customer_ltv_calculations cltv ON up.id = cltv.customer_id
        WHERE cltv.predicted_ltv_24m IS NOT NULL
        GROUP BY up.business_type
    )
    UPDATE ltv_segments ls
    SET 
        avg_ltv = ss.avg_ltv,
        median_ltv = ss.median_ltv,
        p90_ltv = ss.p90_ltv,
        p10_ltv = ss.p10_ltv,
        user_count = ss.user_count,
        avg_tenure = ss.avg_tenure,
        last_calculated = NOW()
    FROM segment_stats ss
    WHERE ls.segment_type = ss.segment_type 
    AND ls.segment_value = ss.segment_value;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate LTV quality score
CREATE OR REPLACE FUNCTION calculate_ltv_quality_score(
    p_customer_id UUID,
    p_predicted_ltv DECIMAL,
    p_confidence DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    v_quality_score DECIMAL := 0;
    v_data_completeness DECIMAL;
    v_model_agreement DECIMAL;
BEGIN
    -- Calculate data completeness (0-1 scale)
    SELECT 
        CASE 
            WHEN COUNT(*) >= 12 THEN 1.0 -- 12+ months of data
            WHEN COUNT(*) >= 6 THEN 0.8  -- 6+ months
            WHEN COUNT(*) >= 3 THEN 0.6  -- 3+ months
            ELSE 0.4
        END
    INTO v_data_completeness
    FROM subscription_revenue
    WHERE customer_id = p_customer_id;
    
    -- Calculate model agreement (simplified)
    v_model_agreement := COALESCE(p_confidence, 0.5);
    
    -- Combine factors
    v_quality_score := (v_data_completeness * 0.6 + v_model_agreement * 0.4);
    
    RETURN GREATEST(0.1, LEAST(1.0, v_quality_score));
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MAINTENANCE AND MONITORING
-- =====================================================

-- Create maintenance function for cleaning old data
CREATE OR REPLACE FUNCTION cleanup_old_financial_data(months_to_keep INTEGER DEFAULT 36)
RETURNS void AS $$
BEGIN
    -- Clean old audit logs (keep last 12 months)
    DELETE FROM financial_audit_log 
    WHERE timestamp < NOW() - (months_to_keep / 3 || ' months')::INTERVAL;
    
    -- Clean old batch job results (keep last 6 months)
    DELETE FROM batch_processing_jobs 
    WHERE completed_at < NOW() - (months_to_keep / 6 || ' months')::INTERVAL
    AND status IN ('completed', 'failed');
    
    -- Clean old model versions (keep last 5 versions per type)
    WITH ranked_models AS (
        SELECT model_id, 
               ROW_NUMBER() OVER (PARTITION BY model_type ORDER BY created_at DESC) as rn
        FROM ltv_prediction_models
        WHERE is_active = false
    )
    DELETE FROM ltv_prediction_models 
    WHERE model_id IN (
        SELECT model_id FROM ranked_models WHERE rn > 5
    );
    
    RAISE NOTICE 'Financial data cleanup completed';
END;
$$ LANGUAGE plpgsql;

-- Schedule weekly maintenance (requires pg_cron extension)
-- SELECT cron.schedule('financial-data-cleanup', '0 2 * * 1', 'SELECT cleanup_old_financial_data(36);');

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE user_ltv IS 'Core LTV calculations and metrics for each customer with ensemble model predictions';
COMMENT ON TABLE ltv_segments IS 'Benchmark segments for LTV analysis and performance comparison';
COMMENT ON TABLE customer_acquisition_costs IS 'Multi-touch attribution CAC tracking with seasonal adjustments';
COMMENT ON TABLE customer_lifecycle_events IS 'Comprehensive customer journey and lifecycle event tracking';
COMMENT ON TABLE subscription_revenue IS 'Granular subscription revenue tracking for LTV calculation accuracy';
COMMENT ON TABLE marketing_attribution IS 'Sophisticated multi-touch attribution with journey analysis';
COMMENT ON TABLE ltv_prediction_models IS 'Model metadata and performance tracking for prediction accuracy';
COMMENT ON TABLE customer_ltv_calculations IS 'Detailed LTV predictions with model breakdown and confidence intervals';
COMMENT ON TABLE financial_audit_log IS 'Comprehensive audit trail for all financial data access and calculations';
COMMENT ON TABLE batch_processing_jobs IS 'Large-scale batch processing job tracking and management';

COMMENT ON FUNCTION refresh_ltv_segments() IS 'Updates segment benchmark data based on current customer LTV calculations';
COMMENT ON FUNCTION calculate_ltv_quality_score(UUID, DECIMAL, DECIMAL) IS 'Calculates data quality score for LTV predictions';
COMMENT ON FUNCTION cleanup_old_financial_data(INTEGER) IS 'Maintenance function to clean old financial data and logs';

-- =====================================================
-- MIGRATION COMPLETION LOG
-- =====================================================

INSERT INTO schema_migrations (version, name, applied_at) 
VALUES ('20250120000000', 'WS-183-ltv-calculations', NOW())
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();

-- Migration complete
SELECT 'WS-183 LTV Calculations migration completed successfully' as status;