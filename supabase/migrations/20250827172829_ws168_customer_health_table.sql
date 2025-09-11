-- WS-168: Customer Success Dashboard - Customer Health Table
-- Team D - Round 1 - Customer Health Metrics and Scoring

-- Create customer_health table for tracking health scoring data
CREATE TABLE customer_health (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Core Health Metrics
    overall_health_score DECIMAL(5,2) NOT NULL DEFAULT 50.0 CHECK (overall_health_score >= 0 AND overall_health_score <= 100),
    engagement_score DECIMAL(5,2) NOT NULL DEFAULT 50.0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
    progress_score DECIMAL(5,2) NOT NULL DEFAULT 50.0 CHECK (progress_score >= 0 AND progress_score <= 100),
    satisfaction_score DECIMAL(5,2) CHECK (satisfaction_score >= 0 AND satisfaction_score <= 100),
    churn_risk_score DECIMAL(5,2) NOT NULL DEFAULT 50.0 CHECK (churn_risk_score >= 0 AND churn_risk_score <= 100),
    
    -- Engagement Metrics
    last_login_at TIMESTAMPTZ,
    total_logins INTEGER DEFAULT 0 CHECK (total_logins >= 0),
    days_since_last_activity INTEGER DEFAULT 0 CHECK (days_since_last_activity >= 0),
    session_duration_avg_minutes DECIMAL(10,2) DEFAULT 0 CHECK (session_duration_avg_minutes >= 0),
    
    -- Feature Usage Tracking
    features_used JSONB DEFAULT '{}', -- {"feature_name": usage_count}
    form_completion_rate DECIMAL(5,2) DEFAULT 0 CHECK (form_completion_rate >= 0 AND form_completion_rate <= 100),
    task_completion_rate DECIMAL(5,2) DEFAULT 0 CHECK (task_completion_rate >= 0 AND task_completion_rate <= 100),
    
    -- Communication Health
    messages_sent INTEGER DEFAULT 0 CHECK (messages_sent >= 0),
    messages_received INTEGER DEFAULT 0 CHECK (messages_received >= 0),
    response_rate DECIMAL(5,2) DEFAULT 0 CHECK (response_rate >= 0 AND response_rate <= 100),
    
    -- Progress Indicators
    wedding_progress_percentage DECIMAL(5,2) DEFAULT 0 CHECK (wedding_progress_percentage >= 0 AND wedding_progress_percentage <= 100),
    milestones_completed INTEGER DEFAULT 0 CHECK (milestones_completed >= 0),
    overdue_tasks INTEGER DEFAULT 0 CHECK (overdue_tasks >= 0),
    
    -- Risk Factors
    support_tickets_count INTEGER DEFAULT 0 CHECK (support_tickets_count >= 0),
    payment_issues_count INTEGER DEFAULT 0 CHECK (payment_issues_count >= 0),
    billing_status VARCHAR(20) DEFAULT 'active',
    
    -- Metadata
    score_calculation_version VARCHAR(10) DEFAULT 'v1.0',
    factors_considered JSONB DEFAULT '{}',
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_customer_health_client_id ON customer_health(client_id);
CREATE INDEX idx_customer_health_organization_id ON customer_health(organization_id);
CREATE INDEX idx_customer_health_overall_score ON customer_health(overall_health_score DESC);
CREATE INDEX idx_customer_health_churn_risk ON customer_health(churn_risk_score DESC);
CREATE INDEX idx_customer_health_calculated_at ON customer_health(calculated_at DESC);
CREATE INDEX idx_customer_health_engagement ON customer_health(engagement_score DESC, last_login_at DESC);

-- Create composite index for dashboard queries
CREATE INDEX idx_customer_health_dashboard_main ON customer_health(organization_id, overall_health_score DESC, calculated_at DESC);

-- Add foreign key indexes for join performance
CREATE INDEX idx_customer_health_client_org ON customer_health(client_id, organization_id);

-- RLS Policy - Admin access only (to be enabled when RLS is activated)
ALTER TABLE customer_health ENABLE ROW LEVEL SECURITY;

-- Policy for organization admins to view their customer health data
CREATE POLICY "customer_health_org_admin_select" ON customer_health
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

-- Policy for organization admins to update customer health data
CREATE POLICY "customer_health_org_admin_update" ON customer_health
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

-- Policy for system to insert/update health calculations
CREATE POLICY "customer_health_system_insert" ON customer_health
    FOR INSERT
    WITH CHECK (true); -- System processes can insert

CREATE POLICY "customer_health_system_update" ON customer_health  
    FOR UPDATE
    USING (true); -- System processes can update

-- Add trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_health_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_customer_health_updated_at
    BEFORE UPDATE ON customer_health
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_health_updated_at();

-- Add comments for documentation
COMMENT ON TABLE customer_health IS 'WS-168: Customer health metrics and scoring for success dashboard';
COMMENT ON COLUMN customer_health.overall_health_score IS 'Composite health score (0-100) calculated from all metrics';
COMMENT ON COLUMN customer_health.engagement_score IS 'User engagement score based on login frequency and activity';
COMMENT ON COLUMN customer_health.progress_score IS 'Wedding planning progress score based on completed milestones';
COMMENT ON COLUMN customer_health.churn_risk_score IS 'Risk of customer churning (0=low risk, 100=high risk)';
COMMENT ON COLUMN customer_health.features_used IS 'JSON object tracking feature usage counts';
COMMENT ON COLUMN customer_health.factors_considered IS 'JSON object documenting which factors were used in score calculation';