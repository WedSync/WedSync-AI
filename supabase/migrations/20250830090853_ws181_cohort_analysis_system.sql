-- WS-181: Cohort Analysis System Database Migration
-- Team B Round 1 Implementation
-- Date: 2025-01-20

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create cohort analysis schema
CREATE SCHEMA IF NOT EXISTS cohort_analysis;

-- 1. COHORT DEFINITIONS TABLE
-- Stores flexible segmentation criteria for different cohort types
CREATE TABLE cohort_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cohort_type VARCHAR(50) NOT NULL CHECK (cohort_type IN (
        'supplier_performance', 'client_engagement', 'revenue_growth', 
        'feature_adoption', 'retention_analysis', 'conversion_funnel'
    )),
    
    -- Flexible criteria stored as JSONB for complex segmentation
    segmentation_criteria JSONB NOT NULL DEFAULT '{}',
    
    -- Time-based cohort configuration
    time_window_type VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (time_window_type IN ('monthly', 'quarterly', 'weekly', 'custom')),
    time_window_duration INTERVAL NOT NULL DEFAULT '30 days',
    
    -- Analysis configuration
    metrics_to_track TEXT[] NOT NULL DEFAULT ARRAY['retention', 'engagement'],
    benchmark_metrics TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Automation settings
    auto_refresh_enabled BOOLEAN DEFAULT true,
    refresh_frequency VARCHAR(20) DEFAULT 'daily' CHECK (refresh_frequency IN ('hourly', 'daily', 'weekly', 'monthly')),
    
    -- Status and metadata
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Performance optimization
    last_calculated_at TIMESTAMPTZ,
    calculation_duration_ms INTEGER
);

-- 2. COHORT METRICS TABLE
-- Stores calculated metrics for each cohort over time
CREATE TABLE cohort_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_definition_id UUID NOT NULL REFERENCES cohort_definitions(id) ON DELETE CASCADE,
    
    -- Cohort identification
    cohort_period DATE NOT NULL, -- The period this cohort represents (e.g., 2024-01-01 for Jan 2024)
    cohort_size INTEGER NOT NULL DEFAULT 0,
    
    -- Time-series tracking
    measurement_period DATE NOT NULL, -- When this measurement was taken
    period_offset_days INTEGER NOT NULL DEFAULT 0, -- Days since cohort start (0, 30, 60, etc.)
    
    -- Flexible metrics storage
    metric_values JSONB NOT NULL DEFAULT '{}', -- All calculated metrics as key-value pairs
    
    -- Performance indicators
    retention_rate DECIMAL(5,4) CHECK (retention_rate >= 0 AND retention_rate <= 1),
    conversion_rate DECIMAL(5,4) CHECK (conversion_rate >= 0 AND conversion_rate <= 1),
    revenue_per_entity DECIMAL(12,2) DEFAULT 0,
    activity_score DECIMAL(8,4) DEFAULT 0,
    
    -- Statistical measures
    confidence_interval JSONB DEFAULT '{}',
    sample_size INTEGER DEFAULT 0,
    
    -- Data quality indicators
    data_completeness_score DECIMAL(3,2) DEFAULT 1.0 CHECK (data_completeness_score >= 0 AND data_completeness_score <= 1),
    calculation_method VARCHAR(50) DEFAULT 'standard',
    
    -- Timestamps
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(cohort_definition_id, cohort_period, measurement_period)
);

-- 3. COHORT INSIGHTS TABLE
-- Stores automated business intelligence and analysis results
CREATE TABLE cohort_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_definition_id UUID REFERENCES cohort_definitions(id) ON DELETE CASCADE,
    
    -- Insight classification
    insight_type VARCHAR(50) NOT NULL CHECK (insight_type IN (
        'trend', 'anomaly', 'recommendation', 'alert', 'opportunity', 'risk'
    )),
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('critical', 'warning', 'info', 'positive')),
    
    -- Insight content
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Data supporting the insight
    supporting_data JSONB DEFAULT '{}',
    affected_periods DATE[] DEFAULT ARRAY[]::DATE[],
    
    -- Actionable recommendations
    recommendations JSONB DEFAULT '{}',
    estimated_impact JSONB DEFAULT '{}',
    
    -- AI/ML analysis metadata
    analysis_algorithm VARCHAR(100),
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    -- Insight lifecycle
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'acting', 'resolved', 'dismissed')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- 4. COHORT BASELINE TABLE
-- Stores benchmark data for performance comparison
CREATE TABLE cohort_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_definition_id UUID NOT NULL REFERENCES cohort_definitions(id) ON DELETE CASCADE,
    
    -- Baseline identification
    baseline_type VARCHAR(50) NOT NULL CHECK (baseline_type IN ('historical_average', 'industry_benchmark', 'target_goal', 'updated_benchmark')),
    baseline_name VARCHAR(255) NOT NULL,
    
    -- Time period for baseline calculation
    baseline_period_start DATE NOT NULL,
    baseline_period_end DATE NOT NULL,
    
    -- Baseline metrics
    baseline_values JSONB NOT NULL DEFAULT '{}',
    sample_size INTEGER DEFAULT 0,
    
    -- Statistical properties
    standard_deviation JSONB DEFAULT '{}',
    percentiles JSONB DEFAULT '{}',
    
    -- Metadata
    calculation_method TEXT,
    data_sources TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(cohort_definition_id, baseline_type, baseline_name)
);

-- 5. Performance optimization indexes
-- Primary indexes for fast lookups
CREATE INDEX idx_cohort_definitions_type_status ON cohort_definitions(cohort_type, status);
CREATE INDEX idx_cohort_definitions_created_at ON cohort_definitions(created_at DESC);
CREATE INDEX idx_cohort_definitions_refresh ON cohort_definitions(auto_refresh_enabled, last_calculated_at) 
    WHERE status = 'active';

-- Cohort metrics performance indexes
CREATE INDEX idx_cohort_metrics_definition_period ON cohort_metrics(cohort_definition_id, cohort_period);
CREATE INDEX idx_cohort_metrics_measurement_offset ON cohort_metrics(measurement_period, period_offset_days);
CREATE INDEX idx_cohort_metrics_retention ON cohort_metrics(retention_rate) WHERE retention_rate IS NOT NULL;

-- Time-series analysis indexes  
CREATE INDEX idx_cohort_metrics_time_series ON cohort_metrics(cohort_definition_id, cohort_period, period_offset_days);
CREATE INDEX idx_cohort_metrics_calculated_at ON cohort_metrics(calculated_at DESC);

-- JSONB indexes for flexible querying
CREATE INDEX idx_cohort_definitions_criteria ON cohort_definitions USING GIN (segmentation_criteria);
CREATE INDEX idx_cohort_metrics_values ON cohort_metrics USING GIN (metric_values);
CREATE INDEX idx_cohort_insights_data ON cohort_insights USING GIN (supporting_data);

-- Insights and baseline indexes
CREATE INDEX idx_cohort_insights_type_severity ON cohort_insights(insight_type, severity, status);
CREATE INDEX idx_cohort_insights_created ON cohort_insights(created_at DESC) WHERE status = 'new';
CREATE INDEX idx_cohort_baselines_active ON cohort_baselines(cohort_definition_id, is_active) WHERE is_active = true;

-- Composite indexes for common query patterns
CREATE INDEX idx_cohort_performance_analysis ON cohort_metrics(
    cohort_definition_id, 
    measurement_period, 
    retention_rate, 
    revenue_per_entity
) WHERE data_completeness_score > 0.8;

-- Partial indexes for active data
CREATE INDEX idx_active_cohorts_metrics ON cohort_metrics(cohort_definition_id, calculated_at DESC)
    WHERE calculated_at > NOW() - INTERVAL '90 days';

-- 6. Row Level Security (RLS) policies
ALTER TABLE cohort_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_baselines ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read cohort definitions
CREATE POLICY "Users can view cohort definitions" ON cohort_definitions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for authenticated users to create cohort definitions
CREATE POLICY "Users can create cohort definitions" ON cohort_definitions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

-- Policy for cohort creators to update their definitions
CREATE POLICY "Users can update own cohort definitions" ON cohort_definitions
    FOR UPDATE USING (auth.uid() = created_by);

-- Policy for cohort metrics access
CREATE POLICY "Users can view cohort metrics" ON cohort_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cohort_definitions cd 
            WHERE cd.id = cohort_metrics.cohort_definition_id 
            AND (cd.created_by = auth.uid() OR auth.role() = 'service_role')
        )
    );

-- Policy for cohort insights access
CREATE POLICY "Users can view cohort insights" ON cohort_insights
    FOR SELECT USING (
        cohort_definition_id IS NULL OR
        EXISTS (
            SELECT 1 FROM cohort_definitions cd 
            WHERE cd.id = cohort_insights.cohort_definition_id 
            AND (cd.created_by = auth.uid() OR auth.role() = 'service_role')
        )
    );

-- Policy for cohort baselines access
CREATE POLICY "Users can view cohort baselines" ON cohort_baselines
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cohort_definitions cd 
            WHERE cd.id = cohort_baselines.cohort_definition_id 
            AND (cd.created_by = auth.uid() OR auth.role() = 'service_role')
        )
    );

-- Service role policies for full access
CREATE POLICY "Service role full access cohort definitions" ON cohort_definitions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access cohort metrics" ON cohort_metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access cohort insights" ON cohort_insights
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access cohort baselines" ON cohort_baselines
    FOR ALL USING (auth.role() = 'service_role');

-- 7. Database functions for cohort analysis

-- Function to get wedding season from date
CREATE OR REPLACE FUNCTION get_wedding_season(input_date DATE)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT CASE 
        WHEN EXTRACT(MONTH FROM input_date) IN (3, 4, 5) THEN 'Spring'
        WHEN EXTRACT(MONTH FROM input_date) IN (6, 7, 8) THEN 'Summer'
        WHEN EXTRACT(MONTH FROM input_date) IN (9, 10, 11) THEN 'Fall'
        ELSE 'Winter'
    END;
$$;

-- Function to execute cohort analysis queries safely
CREATE OR REPLACE FUNCTION execute_cohort_analysis(
    query TEXT,
    params JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
BEGIN
    start_time := clock_timestamp();
    
    -- Basic query validation (prevent dangerous operations)
    IF query ~* '\b(DROP|DELETE|UPDATE|INSERT|CREATE|ALTER|TRUNCATE)\b' THEN
        RAISE EXCEPTION 'Only SELECT queries are allowed in cohort analysis';
    END IF;
    
    -- Execute the query and return results as JSONB
    EXECUTE format('SELECT json_agg(t) FROM (%s) t', query) INTO result;
    
    end_time := clock_timestamp();
    
    -- Log performance metrics
    INSERT INTO cohort_insights (
        insight_type,
        severity,
        title,
        description,
        supporting_data
    ) VALUES (
        'alert',
        'info',
        'Query Execution',
        'Cohort analysis query executed successfully',
        jsonb_build_object(
            'execution_time_ms', EXTRACT(MILLISECONDS FROM (end_time - start_time)),
            'query_length', LENGTH(query),
            'result_count', COALESCE(jsonb_array_length(result), 0)
        )
    );
    
    RETURN COALESCE(result, '[]'::JSONB);
EXCEPTION
    WHEN OTHERS THEN
        -- Log error
        INSERT INTO cohort_insights (
            insight_type,
            severity,
            title,
            description,
            supporting_data
        ) VALUES (
            'alert',
            'critical',
            'Query Execution Failed',
            'Cohort analysis query execution failed: ' || SQLERRM,
            jsonb_build_object(
                'query', LEFT(query, 500),
                'error', SQLERRM,
                'sqlstate', SQLSTATE
            )
        );
        
        RAISE;
END;
$$;

-- Function to refresh cohort metrics automatically
CREATE OR REPLACE FUNCTION refresh_cohort_metrics()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    cohort_record RECORD;
    refresh_count INTEGER := 0;
BEGIN
    -- Find cohorts that need refreshing
    FOR cohort_record IN 
        SELECT id, name, cohort_type, last_calculated_at, refresh_frequency
        FROM cohort_definitions 
        WHERE auto_refresh_enabled = true 
          AND status = 'active'
          AND (
              last_calculated_at IS NULL OR
              (refresh_frequency = 'hourly' AND last_calculated_at < NOW() - INTERVAL '1 hour') OR
              (refresh_frequency = 'daily' AND last_calculated_at < NOW() - INTERVAL '1 day') OR
              (refresh_frequency = 'weekly' AND last_calculated_at < NOW() - INTERVAL '1 week')
          )
    LOOP
        -- Update last calculated timestamp
        UPDATE cohort_definitions 
        SET last_calculated_at = NOW()
        WHERE id = cohort_record.id;
        
        refresh_count := refresh_count + 1;
        
        -- Log the refresh
        INSERT INTO cohort_insights (
            cohort_definition_id,
            insight_type,
            severity,
            title,
            description
        ) VALUES (
            cohort_record.id,
            'alert',
            'info',
            'Cohort Refresh Scheduled',
            format('Cohort "%s" scheduled for automatic refresh', cohort_record.name)
        );
    END LOOP;
    
    RETURN refresh_count;
END;
$$;

-- 8. Triggers for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cohort_definitions_updated_at 
    BEFORE UPDATE ON cohort_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cohort_baselines_updated_at 
    BEFORE UPDATE ON cohort_baselines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Comments for documentation
COMMENT ON TABLE cohort_definitions IS 'Defines cohort analysis configurations with flexible segmentation criteria';
COMMENT ON TABLE cohort_metrics IS 'Stores time-series cohort performance metrics and calculations';
COMMENT ON TABLE cohort_insights IS 'Contains automated business intelligence insights generated from cohort analysis';
COMMENT ON TABLE cohort_baselines IS 'Benchmark data for comparing cohort performance against targets';

COMMENT ON COLUMN cohort_definitions.segmentation_criteria IS 'JSONB field storing flexible cohort segmentation rules';
COMMENT ON COLUMN cohort_metrics.metric_values IS 'JSONB field containing all calculated metrics for the cohort period';
COMMENT ON COLUMN cohort_insights.confidence_score IS 'Statistical confidence level for the generated insight (0.0 to 1.0)';

-- 10. Initial data
-- Insert default cohort types for wedding industry
INSERT INTO cohort_definitions (
    name,
    description,
    cohort_type,
    segmentation_criteria,
    metrics_to_track,
    status
) VALUES 
(
    'Supplier Retention Analysis',
    'Monthly cohort analysis of wedding supplier retention patterns',
    'supplier_performance',
    '{"business_types": ["photographer", "venue", "catering"], "signup_source": "platform"}',
    ARRAY['retention', 'engagement', 'revenue'],
    'active'
),
(
    'Client Engagement Tracking',
    'Wedding client engagement and booking conversion analysis',
    'client_engagement',
    '{"wedding_date_range": "next_12_months", "budget_tier": "premium"}',
    ARRAY['engagement', 'conversion', 'satisfaction'],
    'active'
),
(
    'Revenue Growth Analysis',
    'Quarterly revenue growth patterns by supplier cohorts',
    'revenue_growth',
    '{"revenue_tier": "high_value", "geographic_region": "all"}',
    ARRAY['revenue', 'retention', 'expansion'],
    'active'
) ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Refresh statistics for query optimization
ANALYZE cohort_definitions;
ANALYZE cohort_metrics;  
ANALYZE cohort_insights;
ANALYZE cohort_baselines;

-- Success message
SELECT 'WS-181 Cohort Analysis System migration completed successfully' as status;