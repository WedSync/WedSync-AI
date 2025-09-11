-- Migration: 20250130154500_create_app_store_system.sql
-- WS-187: Comprehensive App Store Management System
-- Author: Claude Code - Team B Backend Implementation
-- Created: 2025-01-30

BEGIN;

-- ============================================================================
-- ASSET MANAGEMENT TABLES
-- ============================================================================

-- Core asset management table for screenshots, icons, videos, and metadata
CREATE TABLE app_store_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('screenshot', 'icon', 'video', 'metadata')),
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('apple', 'google_play', 'microsoft', 'web')),
    version_number VARCHAR(20) NOT NULL,
    file_path TEXT,
    file_size INTEGER,
    mime_type VARCHAR(100),
    dimensions JSONB, -- {width: 1242, height: 2208}
    localization VARCHAR(10) DEFAULT 'en-US',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed', 'archived')),
    metadata JSONB, -- {title, description, keywords, etc}
    processing_config JSONB, -- Generation parameters
    quality_score DECIMAL(3,2), -- 0.00 to 1.00
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asset generation job tracking for automation status and processing history
CREATE TABLE asset_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('screenshot_generation', 'icon_optimization', 'metadata_update', 'bulk_processing')),
    platform VARCHAR(50) NOT NULL,
    status VARCHAR(30) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    total_assets INTEGER DEFAULT 0,
    processed_assets INTEGER DEFAULT 0,
    failed_assets INTEGER DEFAULT 0,
    job_config JSONB NOT NULL, -- Processing parameters
    error_log JSONB, -- Array of error messages
    processing_time_ms INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store submissions with approval tracking and error logging
CREATE TABLE store_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('apple', 'google_play', 'microsoft')),
    submission_type VARCHAR(30) NOT NULL CHECK (submission_type IN ('initial', 'update', 'metadata_only')),
    version_number VARCHAR(20) NOT NULL,
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'published')),
    submission_date TIMESTAMP WITH TIME ZONE,
    review_date TIMESTAMP WITH TIME ZONE,
    publication_date TIMESTAMP WITH TIME ZONE,
    store_id VARCHAR(100), -- Platform-specific submission ID
    asset_ids UUID[], -- Array of asset UUIDs
    submission_notes TEXT,
    reviewer_feedback JSONB, -- Store review feedback
    compliance_status JSONB, -- Compliance check results
    automated_checks JSONB, -- Automated validation results
    rejection_reasons TEXT[],
    estimated_review_time INTEGER, -- Hours
    priority_level INTEGER DEFAULT 5 CHECK (priority_level >= 1 AND priority_level <= 10),
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asset performance analytics with download conversion and engagement metrics
CREATE TABLE asset_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES app_store_assets(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    metric_date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    downloads INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,4), -- Click to download rate
    engagement_score DECIMAL(5,2), -- Custom engagement metric
    user_ratings JSONB, -- {average: 4.2, count: 150}
    user_feedback JSONB, -- Array of feedback comments
    a_b_test_group VARCHAR(50), -- For A/B testing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ANALYTICS AND PERFORMANCE TABLES
-- ============================================================================

-- Comprehensive app store metrics with downloads, conversions, and revenue tracking
CREATE TABLE app_store_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    metric_date DATE NOT NULL,
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('downloads', 'revenue', 'rankings', 'reviews', 'conversions')),
    total_downloads INTEGER DEFAULT 0,
    new_downloads INTEGER DEFAULT 0,
    update_downloads INTEGER DEFAULT 0,
    gross_revenue DECIMAL(12,2) DEFAULT 0,
    net_revenue DECIMAL(12,2) DEFAULT 0,
    refunds DECIMAL(12,2) DEFAULT 0,
    average_rating DECIMAL(3,2),
    rating_count INTEGER DEFAULT 0,
    search_ranking INTEGER,
    category_ranking INTEGER,
    conversion_rate DECIMAL(5,4),
    bounce_rate DECIMAL(5,4),
    session_duration INTEGER, -- seconds
    retention_rates JSONB, -- {day1: 0.8, day7: 0.6, day30: 0.4}
    geographical_data JSONB, -- Country-wise breakdown
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Keyword performance for search ranking and optimization analysis
CREATE TABLE keyword_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    search_volume INTEGER,
    ranking_position INTEGER,
    click_through_rate DECIMAL(5,4),
    conversion_rate DECIMAL(5,4),
    competition_level VARCHAR(20) CHECK (competition_level IN ('low', 'medium', 'high')),
    cost_per_click DECIMAL(8,4), -- For paid keywords
    difficulty_score INTEGER CHECK (difficulty_score >= 1 AND difficulty_score <= 100),
    trending_direction VARCHAR(20) CHECK (trending_direction IN ('up', 'down', 'stable')),
    related_keywords TEXT[],
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, platform, keyword)
);

-- Competitor analysis with market positioning and feature comparison
CREATE TABLE competitor_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    competitor_name VARCHAR(255) NOT NULL,
    competitor_app_id VARCHAR(255), -- Platform-specific app ID
    platform VARCHAR(50) NOT NULL,
    analysis_date DATE NOT NULL,
    market_position INTEGER, -- Ranking in category
    download_estimates JSONB, -- {daily: 1000, monthly: 30000}
    revenue_estimates JSONB, -- {daily: 500, monthly: 15000}
    rating_analysis JSONB, -- {average: 4.1, count: 2500, recent_trend: 'up'}
    feature_comparison JSONB, -- Feature matrix comparison
    pricing_analysis JSONB, -- Pricing tiers and strategies
    marketing_keywords TEXT[], -- Keywords they rank for
    asset_analysis JSONB, -- Screenshot and icon analysis
    user_acquisition_channels JSONB, -- Traffic sources
    strengths TEXT[],
    weaknesses TEXT[],
    opportunities TEXT[],
    threats TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User acquisition funnel tracking from store discovery to account registration
CREATE TABLE user_acquisition_funnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    funnel_date DATE NOT NULL,
    traffic_source VARCHAR(100) NOT NULL, -- 'organic_search', 'paid_ads', 'social', etc.
    campaign_id VARCHAR(255), -- Marketing campaign identifier
    stage VARCHAR(50) NOT NULL CHECK (stage IN ('impression', 'click', 'store_visit', 'download', 'install', 'registration', 'first_use', 'retention')),
    user_count INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,4), -- Rate to next stage
    cost_per_acquisition DECIMAL(8,2),
    lifetime_value DECIMAL(10,2),
    cohort_group VARCHAR(50), -- For cohort analysis
    user_attributes JSONB, -- Demographics and characteristics
    device_info JSONB, -- Device and OS information
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- OPTIMIZATION AND COMPLIANCE TABLES
-- ============================================================================

-- Metadata versions for A/B testing store descriptions and keyword optimization
CREATE TABLE metadata_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    version_number VARCHAR(20) NOT NULL,
    version_type VARCHAR(30) DEFAULT 'standard' CHECK (version_type IN ('standard', 'a_b_test', 'seasonal', 'localized')),
    app_title VARCHAR(255),
    app_subtitle VARCHAR(255),
    app_description TEXT,
    keywords TEXT[],
    promotional_text TEXT,
    release_notes TEXT,
    localization VARCHAR(10) DEFAULT 'en-US',
    a_b_test_group VARCHAR(50), -- For A/B testing
    test_parameters JSONB, -- A/B test configuration
    performance_metrics JSONB, -- Test results
    is_active BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    activation_date TIMESTAMP WITH TIME ZONE,
    deactivation_date TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES user_profiles(id),
    approved_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance checks with policy validation and automated requirement verification
CREATE TABLE compliance_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    check_type VARCHAR(50) NOT NULL CHECK (check_type IN ('automated', 'manual', 'policy_review', 'security_scan')),
    platform VARCHAR(50) NOT NULL,
    target_id UUID, -- Asset ID or submission ID
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('asset', 'submission', 'metadata')),
    policy_category VARCHAR(100) NOT NULL, -- 'content_policy', 'privacy', 'security', etc.
    check_status VARCHAR(30) DEFAULT 'pending' CHECK (check_status IN ('pending', 'passed', 'failed', 'warning', 'manual_review')),
    severity_level VARCHAR(20) CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
    check_results JSONB NOT NULL, -- Detailed results
    violations JSONB, -- Specific violations found
    recommendations TEXT[],
    auto_fixable BOOLEAN DEFAULT FALSE,
    fix_applied BOOLEAN DEFAULT FALSE,
    reviewer_notes TEXT,
    check_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_date TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submission history with approval workflows and rejection reason tracking
CREATE TABLE submission_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES store_submissions(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('created', 'submitted', 'approved', 'rejected', 'published', 'updated', 'withdrawn')),
    status_change VARCHAR(100), -- 'draft -> submitted'
    actor_type VARCHAR(30) CHECK (actor_type IN ('user', 'system', 'store_reviewer')),
    actor_id VARCHAR(255), -- User ID or system identifier
    action_details JSONB, -- Specific action information
    automated_action BOOLEAN DEFAULT FALSE,
    rejection_category VARCHAR(100), -- Category of rejection
    resolution_time_hours INTEGER, -- Time to resolve from previous status
    workflow_stage VARCHAR(50), -- Current workflow stage
    approval_level VARCHAR(50), -- Approval hierarchy level
    notes TEXT,
    action_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance benchmarks for optimization targets and improvement measurement
CREATE TABLE performance_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    benchmark_type VARCHAR(50) NOT NULL CHECK (benchmark_type IN ('download_rate', 'conversion_rate', 'rating_score', 'revenue_target', 'retention_rate')),
    platform VARCHAR(50) NOT NULL,
    category VARCHAR(100), -- App store category
    target_value DECIMAL(12,4) NOT NULL,
    current_value DECIMAL(12,4),
    baseline_value DECIMAL(12,4), -- Starting point
    measurement_period VARCHAR(20) DEFAULT 'monthly' CHECK (measurement_period IN ('daily', 'weekly', 'monthly', 'quarterly')),
    benchmark_date DATE NOT NULL,
    performance_status VARCHAR(20) CHECK (performance_status IN ('above_target', 'on_target', 'below_target', 'critical')),
    improvement_percentage DECIMAL(5,2), -- % change from baseline
    industry_percentile INTEGER CHECK (industry_percentile >= 1 AND industry_percentile <= 100),
    optimization_actions JSONB, -- Recommended or taken actions
    next_review_date DATE,
    alert_threshold DECIMAL(12,4), -- Threshold for alerts
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Asset Management Indexes
CREATE INDEX idx_app_store_assets_org_platform ON app_store_assets(organization_id, platform);
CREATE INDEX idx_app_store_assets_type_status ON app_store_assets(asset_type, status);
CREATE INDEX idx_app_store_assets_version ON app_store_assets(version_number, created_at DESC);

CREATE INDEX idx_asset_generation_jobs_status ON asset_generation_jobs(status, created_at DESC);
CREATE INDEX idx_asset_generation_jobs_org_type ON asset_generation_jobs(organization_id, job_type);

CREATE INDEX idx_store_submissions_org_platform ON store_submissions(organization_id, platform);
CREATE INDEX idx_store_submissions_status_date ON store_submissions(status, submission_date DESC);
CREATE INDEX idx_store_submissions_version ON store_submissions(version_number, created_at DESC);

CREATE INDEX idx_asset_performance_asset_date ON asset_performance(asset_id, metric_date DESC);
CREATE INDEX idx_asset_performance_org_platform ON asset_performance(organization_id, platform);

-- Analytics Indexes
CREATE INDEX idx_app_store_metrics_org_date ON app_store_metrics(organization_id, metric_date DESC);
CREATE INDEX idx_app_store_metrics_platform_type ON app_store_metrics(platform, metric_type);

CREATE INDEX idx_keyword_performance_org_platform ON keyword_performance(organization_id, platform);
CREATE INDEX idx_keyword_performance_keyword ON keyword_performance(keyword, ranking_position);

CREATE INDEX idx_competitor_analysis_org_date ON competitor_analysis(organization_id, analysis_date DESC);
CREATE INDEX idx_competitor_analysis_competitor ON competitor_analysis(competitor_name, platform);

CREATE INDEX idx_user_acquisition_org_date ON user_acquisition_funnel(organization_id, funnel_date DESC);
CREATE INDEX idx_user_acquisition_source_stage ON user_acquisition_funnel(traffic_source, stage);

-- Optimization Indexes
CREATE INDEX idx_metadata_versions_org_active ON metadata_versions(organization_id, is_active);
CREATE INDEX idx_metadata_versions_ab_test ON metadata_versions(a_b_test_group, performance_metrics);

CREATE INDEX idx_compliance_checks_target ON compliance_checks(target_id, target_type);
CREATE INDEX idx_compliance_checks_status_severity ON compliance_checks(check_status, severity_level);

CREATE INDEX idx_submission_history_submission ON submission_history(submission_id, action_date DESC);
CREATE INDEX idx_submission_history_action_type ON submission_history(action_type, action_date DESC);

CREATE INDEX idx_performance_benchmarks_org_type ON performance_benchmarks(organization_id, benchmark_type);
CREATE INDEX idx_performance_benchmarks_status ON performance_benchmarks(performance_status, next_review_date);

-- Composite indexes for complex queries
CREATE INDEX idx_assets_platform_version_status ON app_store_assets(platform, version_number, status) WHERE status IN ('ready', 'processing');
CREATE INDEX idx_metrics_date_type_platform ON app_store_metrics(metric_date DESC, metric_type, platform);
CREATE INDEX idx_funnel_cohort_stage ON user_acquisition_funnel(cohort_group, stage, funnel_date DESC);

-- ============================================================================
-- DATABASE FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to calculate conversion rates
CREATE OR REPLACE FUNCTION calculate_conversion_rate(clicks INTEGER, downloads INTEGER)
RETURNS DECIMAL(5,4) AS $$
BEGIN
    IF clicks IS NULL OR clicks = 0 THEN
        RETURN 0;
    END IF;
    RETURN ROUND((downloads::DECIMAL / clicks::DECIMAL), 4);
END;
$$ LANGUAGE plpgsql;

-- Function to update asset performance metrics
CREATE OR REPLACE FUNCTION update_asset_performance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update conversion rate when clicks or downloads change
    NEW.conversion_rate := calculate_conversion_rate(NEW.clicks, NEW.downloads);
    
    -- Calculate engagement score (custom metric)
    NEW.engagement_score := COALESCE(
        (NEW.clicks::DECIMAL / NULLIF(NEW.impressions, 0) * 100 + 
         NEW.downloads::DECIMAL / NULLIF(NEW.clicks, 0) * 100) / 2, 
        0
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for asset performance calculations
CREATE TRIGGER trigger_update_asset_performance
    BEFORE INSERT OR UPDATE ON asset_performance
    FOR EACH ROW EXECUTE FUNCTION update_asset_performance();

-- Function to track submission workflow changes
CREATE OR REPLACE FUNCTION track_submission_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track status changes
    IF OLD IS NULL OR OLD.status != NEW.status THEN
        INSERT INTO submission_history (
            submission_id,
            organization_id,
            action_type,
            status_change,
            actor_type,
            automated_action,
            resolution_time_hours
        ) VALUES (
            NEW.id,
            NEW.organization_id,
            CASE 
                WHEN NEW.status = 'submitted' THEN 'submitted'
                WHEN NEW.status = 'approved' THEN 'approved'
                WHEN NEW.status = 'rejected' THEN 'rejected'
                WHEN NEW.status = 'published' THEN 'published'
                ELSE 'updated'
            END,
            CASE 
                WHEN OLD IS NOT NULL THEN OLD.status || ' -> ' || NEW.status
                ELSE 'created -> ' || NEW.status
            END,
            'system',
            true,
            CASE 
                WHEN OLD IS NOT NULL THEN 
                    EXTRACT(EPOCH FROM (NOW() - OLD.updated_at)) / 3600
                ELSE NULL
            END
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for submission tracking
CREATE TRIGGER trigger_track_submission_changes
    AFTER INSERT OR UPDATE ON store_submissions
    FOR EACH ROW EXECUTE FUNCTION track_submission_changes();

-- Function to update benchmark performance status
CREATE OR REPLACE FUNCTION update_benchmark_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update performance status based on target vs current value
    IF NEW.current_value >= NEW.target_value THEN
        NEW.performance_status := 'above_target';
    ELSIF NEW.current_value >= (NEW.target_value * 0.9) THEN
        NEW.performance_status := 'on_target';
    ELSIF NEW.current_value >= (NEW.target_value * 0.7) THEN
        NEW.performance_status := 'below_target';
    ELSE
        NEW.performance_status := 'critical';
    END IF;
    
    -- Calculate improvement percentage
    IF NEW.baseline_value > 0 THEN
        NEW.improvement_percentage := ROUND(
            ((NEW.current_value - NEW.baseline_value) / NEW.baseline_value * 100)::DECIMAL, 
            2
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for benchmark status updates
CREATE TRIGGER trigger_update_benchmark_status
    BEFORE INSERT OR UPDATE ON performance_benchmarks
    FOR EACH ROW EXECUTE FUNCTION update_benchmark_status();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE app_store_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_store_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_acquisition_funnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_benchmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization-based access
CREATE POLICY "Users can access their organization's app store assets"
    ON app_store_assets FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE id = auth.uid()
    ));

CREATE POLICY "Users can access their organization's asset jobs"
    ON asset_generation_jobs FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE id = auth.uid()
    ));

CREATE POLICY "Users can access their organization's store submissions"
    ON store_submissions FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE id = auth.uid()
    ));

CREATE POLICY "Users can access their organization's asset performance"
    ON asset_performance FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE id = auth.uid()
    ));

CREATE POLICY "Users can access their organization's app store metrics"
    ON app_store_metrics FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE id = auth.uid()
    ));

CREATE POLICY "Users can access their organization's keyword performance"
    ON keyword_performance FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE id = auth.uid()
    ));

CREATE POLICY "Users can access their organization's competitor analysis"
    ON competitor_analysis FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE id = auth.uid()
    ));

CREATE POLICY "Users can access their organization's acquisition funnel"
    ON user_acquisition_funnel FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE id = auth.uid()
    ));

CREATE POLICY "Users can access their organization's metadata versions"
    ON metadata_versions FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE id = auth.uid()
    ));

CREATE POLICY "Users can access their organization's compliance checks"
    ON compliance_checks FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE id = auth.uid()
    ));

CREATE POLICY "Users can access their organization's submission history"
    ON submission_history FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE id = auth.uid()
    ));

CREATE POLICY "Users can access their organization's performance benchmarks"
    ON performance_benchmarks FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE id = auth.uid()
    ));

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Insert default performance benchmarks for wedding planning industry
INSERT INTO performance_benchmarks (
    organization_id,
    benchmark_type,
    platform,
    category,
    target_value,
    baseline_value,
    measurement_period,
    alert_threshold,
    created_by
) SELECT 
    o.id,
    'download_rate',
    'apple',
    'Lifestyle',
    1000.0000, -- Target 1000 downloads per month
    0.0000,
    'monthly',
    500.0000, -- Alert if below 500
    (SELECT id FROM user_profiles WHERE organization_id = o.id LIMIT 1)
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM performance_benchmarks pb 
    WHERE pb.organization_id = o.id 
    AND pb.benchmark_type = 'download_rate'
) LIMIT 10; -- Limit to prevent large insertions

COMMIT;

-- ============================================================================
-- MIGRATION VALIDATION
-- ============================================================================

-- Verify all tables were created
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'app_store_assets', 'asset_generation_jobs', 'store_submissions', 
        'asset_performance', 'app_store_metrics', 'keyword_performance',
        'competitor_analysis', 'user_acquisition_funnel', 'metadata_versions',
        'compliance_checks', 'submission_history', 'performance_benchmarks'
    );
    
    IF table_count < 12 THEN
        RAISE EXCEPTION 'Migration failed: Expected 12 tables, found %', table_count;
    END IF;
    
    RAISE NOTICE 'WS-187 App Store System migration completed successfully. Created % tables.', table_count;
END $$;