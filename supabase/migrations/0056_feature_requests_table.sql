-- Feature Requests Management System
-- Migration: 0056_feature_requests_table.sql
-- Purpose: Create tables for AI-powered feature request management and analysis

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Feature Requests Table
CREATE TABLE IF NOT EXISTS feature_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL CHECK (LENGTH(title) >= 10),
    description TEXT NOT NULL CHECK (LENGTH(description) >= 20),
    category VARCHAR(50) CHECK (category IN (
        'forms', 'timeline', 'guest-management', 'payments', 
        'integration', 'mobile', 'analytics', 'communication'
    )),
    
    -- User and Organization Information
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_role VARCHAR(20) CHECK (user_role IN (
        'photographer', 'venue', 'planner', 'florist', 'caterer', 'couple', 'admin'
    )),
    
    -- Status and Priority
    status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN (
        'submitted', 'analyzing', 'analyzed', 'in_progress', 'completed', 
        'declined', 'merged', 'needs_clarification'
    )),
    priority_level VARCHAR(20) CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
    
    -- Impact and Effort Estimates
    expected_impact VARCHAR(20) DEFAULT 'medium' CHECK (expected_impact IN ('low', 'medium', 'high', 'critical')),
    estimated_effort VARCHAR(20) CHECK (estimated_effort IN ('trivial', 'small', 'medium', 'large', 'huge')),
    
    -- RICE Scoring
    rice_score DECIMAL(5,2) CHECK (rice_score >= 0 AND rice_score <= 100),
    rice_reach INTEGER CHECK (rice_reach >= 0),
    rice_impact INTEGER CHECK (rice_impact >= 0 AND rice_impact <= 10),
    rice_confidence DECIMAL(3,1) CHECK (rice_confidence >= 0 AND rice_confidence <= 100),
    rice_effort INTEGER CHECK (rice_effort >= 1 AND rice_effort <= 10),
    
    -- AI Analysis Results (stored as JSONB for flexibility)
    semantic_analysis JSONB,
    content_insights JSONB,
    recommendations JSONB,
    processing_metadata JSONB,
    
    -- Duplicate Detection
    duplicate_of UUID REFERENCES feature_requests(id),
    duplicate_likelihood DECIMAL(3,2) CHECK (duplicate_likelihood >= 0 AND duplicate_likelihood <= 1),
    similar_requests UUID[] DEFAULT '{}',
    
    -- Voting and Feedback
    votes_count INTEGER NOT NULL DEFAULT 0 CHECK (votes_count >= 0),
    comments_count INTEGER NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
    stakeholder_feedback JSONB DEFAULT '[]',
    
    -- Implementation Tracking
    assigned_to UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    declined_at TIMESTAMP WITH TIME ZONE,
    decline_reason TEXT,
    
    -- Analysis Timestamps
    analyzed_at TIMESTAMP WITH TIME ZONE,
    last_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    attachments TEXT[] DEFAULT '{}',
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CHECK (
        CASE WHEN status = 'completed' THEN completed_at IS NOT NULL ELSE TRUE END
    ),
    CHECK (
        CASE WHEN status = 'declined' THEN declined_at IS NOT NULL AND decline_reason IS NOT NULL ELSE TRUE END
    ),
    CHECK (
        CASE WHEN assigned_to IS NOT NULL THEN assigned_at IS NOT NULL ELSE TRUE END
    )
);

-- Feature Request Votes Table
CREATE TABLE IF NOT EXISTS feature_request_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
    weight INTEGER NOT NULL DEFAULT 1 CHECK (weight >= 0 AND weight <= 10), -- Weighted by tier/role
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(feature_request_id, user_id)
);

-- Feature Request Comments Table
CREATE TABLE IF NOT EXISTS feature_request_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES feature_request_comments(id) ON DELETE CASCADE,
    
    content TEXT NOT NULL CHECK (LENGTH(content) >= 1 AND LENGTH(content) <= 2000),
    comment_type VARCHAR(20) DEFAULT 'general' CHECK (comment_type IN (
        'general', 'clarification', 'support', 'concern', 'technical', 'business'
    )),
    
    -- Moderation
    is_internal BOOLEAN NOT NULL DEFAULT false,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    
    -- Reactions
    reactions JSONB DEFAULT '{}', -- {"thumbs_up": 5, "heart": 2, "confused": 1}
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP WITH TIME ZONE
);

-- Feature Request Analytics Table
CREATE TABLE IF NOT EXISTS feature_request_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
    
    -- Engagement Metrics
    views_count INTEGER NOT NULL DEFAULT 0,
    unique_viewers INTEGER NOT NULL DEFAULT 0,
    avg_time_spent_seconds INTEGER DEFAULT 0,
    
    -- Interaction Metrics
    clicks_count INTEGER NOT NULL DEFAULT 0,
    shares_count INTEGER NOT NULL DEFAULT 0,
    exports_count INTEGER NOT NULL DEFAULT 0,
    
    -- Conversion Metrics
    vote_conversion_rate DECIMAL(5,2), -- Viewers to voters
    comment_conversion_rate DECIMAL(5,2), -- Viewers to commenters
    
    -- Time-based Metrics
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    hour_of_day INTEGER CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
    
    -- Demographic Breakdown (aggregated for privacy)
    user_role_breakdown JSONB DEFAULT '{}', -- {"photographer": 15, "venue": 8, ...}
    tier_breakdown JSONB DEFAULT '{}', -- {"professional": 12, "scale": 3, ...}
    organization_size_breakdown JSONB DEFAULT '{}',
    
    -- Date tracking
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(feature_request_id, date)
);

-- Feature Request Categories Configuration
CREATE TABLE IF NOT EXISTS feature_request_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7), -- Hex color code
    
    -- Scoring weights for this category
    default_impact_weight DECIMAL(3,2) DEFAULT 1.0,
    seasonal_multipliers JSONB DEFAULT '{}', -- {"peak": 1.2, "shoulder": 1.0, "off": 0.8}
    
    -- Workflow settings
    requires_business_justification BOOLEAN DEFAULT false,
    auto_assign_to VARCHAR(20), -- Role to auto-assign
    
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_feature_requests_user_org ON feature_requests(user_id, organization_id);
CREATE INDEX idx_feature_requests_status ON feature_requests(status, created_at DESC);
CREATE INDEX idx_feature_requests_priority ON feature_requests(priority_level, rice_score DESC);
CREATE INDEX idx_feature_requests_category ON feature_requests(category, created_at DESC);
CREATE INDEX idx_feature_requests_rice_score ON feature_requests(rice_score DESC);
CREATE INDEX idx_feature_requests_votes ON feature_requests(votes_count DESC);
CREATE INDEX idx_feature_requests_created_at ON feature_requests(created_at DESC);
CREATE INDEX idx_feature_requests_analyzed_at ON feature_requests(analyzed_at DESC);
CREATE INDEX idx_feature_requests_assigned_to ON feature_requests(assigned_to, status);

-- Full-text search index
CREATE INDEX idx_feature_requests_search ON feature_requests USING GIN(
    to_tsvector('english', title || ' ' || description)
);

-- Votes indexes
CREATE INDEX idx_feature_request_votes_request ON feature_request_votes(feature_request_id, vote_type);
CREATE INDEX idx_feature_request_votes_user ON feature_request_votes(user_id, created_at DESC);

-- Comments indexes
CREATE INDEX idx_feature_request_comments_request ON feature_request_comments(feature_request_id, created_at DESC);
CREATE INDEX idx_feature_request_comments_user ON feature_request_comments(user_id, created_at DESC);
CREATE INDEX idx_feature_request_comments_parent ON feature_request_comments(parent_comment_id);

-- Analytics indexes
CREATE INDEX idx_feature_request_analytics_date ON feature_request_analytics(date DESC);
CREATE INDEX idx_feature_request_analytics_request_date ON feature_request_analytics(feature_request_id, date DESC);

-- Row Level Security (RLS)
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_request_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_request_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_request_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Feature Requests
-- Users can see their own organization's requests + public requests
CREATE POLICY "feature_requests_select" ON feature_requests
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Users can create requests for their organization
CREATE POLICY "feature_requests_insert" ON feature_requests
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Users can update their own requests, admins can update any
CREATE POLICY "feature_requests_update" ON feature_requests
    FOR UPDATE USING (
        (user_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Only admins can delete requests
CREATE POLICY "feature_requests_delete" ON feature_requests
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- RLS Policies for Votes
CREATE POLICY "feature_request_votes_select" ON feature_request_votes
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

CREATE POLICY "feature_request_votes_insert" ON feature_request_votes
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "feature_request_votes_update" ON feature_request_votes
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "feature_request_votes_delete" ON feature_request_votes
    FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for Comments
CREATE POLICY "feature_request_comments_select" ON feature_request_comments
    FOR SELECT USING (
        NOT is_internal OR
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

CREATE POLICY "feature_request_comments_insert" ON feature_request_comments
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "feature_request_comments_update" ON feature_request_comments
    FOR UPDATE USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

CREATE POLICY "feature_request_comments_delete" ON feature_request_comments
    FOR DELETE USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- RLS Policies for Analytics (Admin only)
CREATE POLICY "feature_request_analytics_admin" ON feature_request_analytics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- RLS Policies for Categories (Read for all, write for admin)
CREATE POLICY "feature_request_categories_select" ON feature_request_categories
    FOR SELECT USING (active = true OR EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    ));

CREATE POLICY "feature_request_categories_admin_write" ON feature_request_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Functions and Triggers

-- Function to update votes count
CREATE OR REPLACE FUNCTION update_feature_request_votes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE feature_requests 
        SET votes_count = votes_count + 1 
        WHERE id = NEW.feature_request_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE feature_requests 
        SET votes_count = votes_count - 1 
        WHERE id = OLD.feature_request_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update comments count
CREATE OR REPLACE FUNCTION update_feature_request_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE feature_requests 
        SET comments_count = comments_count + 1 
        WHERE id = NEW.feature_request_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE feature_requests 
        SET comments_count = comments_count - 1 
        WHERE id = OLD.feature_request_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER feature_request_votes_count_trigger
    AFTER INSERT OR DELETE ON feature_request_votes
    FOR EACH ROW EXECUTE FUNCTION update_feature_request_votes_count();

CREATE TRIGGER feature_request_comments_count_trigger
    AFTER INSERT OR DELETE ON feature_request_comments
    FOR EACH ROW EXECUTE FUNCTION update_feature_request_comments_count();

CREATE TRIGGER feature_requests_updated_at
    BEFORE UPDATE ON feature_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER feature_request_comments_updated_at
    BEFORE UPDATE ON feature_request_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER feature_request_categories_updated_at
    BEFORE UPDATE ON feature_request_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO feature_request_categories (name, display_name, description, icon, color, default_impact_weight, seasonal_multipliers) VALUES
    ('forms', 'Forms & Data Collection', 'Custom forms, questionnaires, and data collection features', 'FileText', '#3b82f6', 1.2, '{"peak": 1.3, "shoulder": 1.1, "off": 0.9}'),
    ('timeline', 'Timeline Management', 'Wedding day timeline, scheduling, and event management', 'Calendar', '#ef4444', 1.5, '{"peak": 1.5, "shoulder": 1.2, "off": 1.0}'),
    ('guest-management', 'Guest Management', 'RSVP, guest lists, seating arrangements, and guest communication', 'Users', '#10b981', 1.3, '{"peak": 1.4, "shoulder": 1.2, "off": 1.0}'),
    ('payments', 'Payments & Billing', 'Payment processing, invoicing, and financial tracking', 'CreditCard', '#f59e0b', 1.1, '{"peak": 1.2, "shoulder": 1.1, "off": 1.0}'),
    ('integration', 'Integrations', 'Third-party integrations and API connections', 'Link', '#8b5cf6', 1.0, '{"peak": 1.0, "shoulder": 1.0, "off": 1.0}'),
    ('mobile', 'Mobile Experience', 'Mobile app features and responsive design improvements', 'Smartphone', '#ec4899', 1.4, '{"peak": 1.6, "shoulder": 1.3, "off": 1.1}'),
    ('analytics', 'Analytics & Reporting', 'Business intelligence, reporting, and performance metrics', 'BarChart', '#06b6d4', 0.8, '{"peak": 0.9, "shoulder": 0.8, "off": 0.7}'),
    ('communication', 'Communication', 'Messaging, notifications, and client communication tools', 'MessageSquare', '#84cc16', 1.2, '{"peak": 1.4, "shoulder": 1.2, "off": 1.0}')
ON CONFLICT (name) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE feature_requests IS 'AI-powered feature request management with semantic analysis and intelligent prioritization';
COMMENT ON TABLE feature_request_votes IS 'User voting system for feature requests with weighted scoring';
COMMENT ON TABLE feature_request_comments IS 'Threaded comments and discussions for feature requests';
COMMENT ON TABLE feature_request_analytics IS 'Analytics and engagement metrics for feature requests';
COMMENT ON TABLE feature_request_categories IS 'Configurable categories with wedding industry-specific weights';

COMMENT ON COLUMN feature_requests.semantic_analysis IS 'AI-generated semantic analysis including intent, entities, and duplicate detection';
COMMENT ON COLUMN feature_requests.content_insights IS 'AI-generated content analysis including sentiment, pain points, and stakeholder impact';
COMMENT ON COLUMN feature_requests.recommendations IS 'AI-generated recommendations for implementation priority and approach';
COMMENT ON COLUMN feature_requests.rice_score IS 'Calculated RICE score (0-100) for prioritization';
COMMENT ON COLUMN feature_requests.duplicate_likelihood IS 'AI-calculated likelihood (0-1) that this request is a duplicate';

-- Create views for common queries
CREATE VIEW feature_requests_with_stats AS
SELECT 
    fr.*,
    up.name as user_name,
    up.role as user_role,
    o.name as organization_name,
    o.tier as organization_tier,
    (
        SELECT COUNT(*) 
        FROM feature_request_votes frv 
        WHERE frv.feature_request_id = fr.id AND frv.vote_type = 'upvote'
    ) as upvotes,
    (
        SELECT COUNT(*) 
        FROM feature_request_votes frv 
        WHERE frv.feature_request_id = fr.id AND frv.vote_type = 'downvote'
    ) as downvotes,
    frc.display_name as category_display_name,
    frc.color as category_color
FROM feature_requests fr
LEFT JOIN user_profiles up ON fr.user_id = up.user_id
LEFT JOIN organizations o ON fr.organization_id = o.id
LEFT JOIN feature_request_categories frc ON fr.category = frc.name;

-- Create materialized view for analytics dashboard
CREATE MATERIALIZED VIEW feature_requests_analytics_summary AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    category,
    status,
    priority_level,
    COUNT(*) as request_count,
    AVG(rice_score) as avg_rice_score,
    AVG(votes_count) as avg_votes,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE status = 'declined') as declined_count,
    AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, CURRENT_TIMESTAMP) - created_at))/86400) as avg_days_to_completion
FROM feature_requests 
WHERE created_at >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY DATE_TRUNC('month', created_at), category, status, priority_level
ORDER BY month DESC, category, status, priority_level;

-- Create index on materialized view
CREATE INDEX idx_feature_requests_analytics_summary_month ON feature_requests_analytics_summary(month DESC);

-- Refresh materialized view daily
-- Note: This would typically be set up as a cron job or scheduled task
-- CREATE OR REPLACE FUNCTION refresh_feature_requests_analytics()
-- RETURNS void AS $$
-- BEGIN
--     REFRESH MATERIALIZED VIEW CONCURRENTLY feature_requests_analytics_summary;
-- END;
-- $$ LANGUAGE plpgsql;