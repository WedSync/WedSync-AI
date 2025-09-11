-- User Feedback System Migration
-- Created: 2025-01-20
-- Feature: WS-236 User Feedback System
-- Team: Team A

-- Enable RLS and necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types for feedback system
CREATE TYPE feedback_type_enum AS ENUM (
  'bug_report',
  'feature_request', 
  'general_feedback',
  'support_request',
  'billing_inquiry',
  'wedding_day_issue',
  'vendor_complaint',
  'couple_complaint',
  'performance_issue'
);

CREATE TYPE feedback_priority_enum AS ENUM (
  'low',
  'medium', 
  'high',
  'critical',
  'wedding_day_urgent'
);

CREATE TYPE feedback_status_enum AS ENUM (
  'open',
  'in_progress',
  'resolved',
  'closed',
  'duplicate',
  'wont_fix'
);

CREATE TYPE feedback_source_enum AS ENUM (
  'web_app',
  'mobile_app',
  'email',
  'phone',
  'chat_widget',
  'admin_portal'
);

-- Main feedback submissions table
CREATE TABLE feedback_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Feedback content
    feedback_type feedback_type_enum NOT NULL,
    category TEXT,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    
    -- Classification
    priority feedback_priority_enum DEFAULT 'medium',
    status feedback_status_enum DEFAULT 'open',
    source feedback_source_enum DEFAULT 'web_app',
    
    -- Technical details
    browser_info JSONB DEFAULT '{}',
    device_info JSONB DEFAULT '{}',
    user_agent TEXT,
    page_url TEXT,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Wedding context (critical for wedding industry)
    wedding_date DATE,
    is_wedding_day_critical BOOLEAN DEFAULT FALSE,
    
    -- Assignment and tracking
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    internal_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT feedback_valid_priority CHECK (
        CASE 
            WHEN is_wedding_day_critical = TRUE 
            THEN priority IN ('critical', 'wedding_day_urgent')
            ELSE TRUE 
        END
    ),
    
    CONSTRAINT feedback_valid_resolution CHECK (
        CASE 
            WHEN status IN ('resolved', 'closed') 
            THEN resolved_at IS NOT NULL AND resolution_notes IS NOT NULL
            ELSE TRUE 
        END
    )
);

-- Feedback attachments table
CREATE TABLE feedback_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES feedback_submissions(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    
    -- Metadata
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 10485760), -- 10MB max
    CONSTRAINT valid_file_type CHECK (file_type ~ '^(image|video|audio|application|text)/.*$')
);

-- Feedback comments/responses table
CREATE TABLE feedback_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES feedback_submissions(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Response content
    response_text TEXT NOT NULL,
    response_type TEXT DEFAULT 'comment' CHECK (response_type IN ('comment', 'status_update', 'resolution', 'internal_note')),
    
    -- Author info
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    is_customer_visible BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Feedback categories table for organization-specific categories
CREATE TABLE feedback_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, name)
);

-- Feedback analytics table for tracking metrics
CREATE TABLE feedback_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Time period
    date_period DATE NOT NULL,
    period_type TEXT DEFAULT 'daily' CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    
    -- Metrics
    total_submissions INTEGER DEFAULT 0,
    open_count INTEGER DEFAULT 0,
    resolved_count INTEGER DEFAULT 0,
    average_resolution_time INTERVAL,
    satisfaction_score DECIMAL(3,2),
    
    -- By type
    bug_reports INTEGER DEFAULT 0,
    feature_requests INTEGER DEFAULT 0,
    support_requests INTEGER DEFAULT 0,
    
    -- By priority
    critical_count INTEGER DEFAULT 0,
    high_count INTEGER DEFAULT 0,
    medium_count INTEGER DEFAULT 0,
    low_count INTEGER DEFAULT 0,
    
    -- Wedding-specific metrics
    wedding_day_issues INTEGER DEFAULT 0,
    weekend_submissions INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, date_period, period_type)
);

-- Create indexes for performance
CREATE INDEX idx_feedback_submissions_org_id ON feedback_submissions(organization_id);
CREATE INDEX idx_feedback_submissions_user_id ON feedback_submissions(user_id);
CREATE INDEX idx_feedback_submissions_status ON feedback_submissions(status);
CREATE INDEX idx_feedback_submissions_priority ON feedback_submissions(priority);
CREATE INDEX idx_feedback_submissions_type ON feedback_submissions(feedback_type);
CREATE INDEX idx_feedback_submissions_created_at ON feedback_submissions(created_at);
CREATE INDEX idx_feedback_submissions_wedding_critical ON feedback_submissions(is_wedding_day_critical, created_at) WHERE is_wedding_day_critical = TRUE;
CREATE INDEX idx_feedback_submissions_open_status ON feedback_submissions(status, priority, created_at) WHERE status IN ('open', 'in_progress');

CREATE INDEX idx_feedback_attachments_feedback_id ON feedback_attachments(feedback_id);
CREATE INDEX idx_feedback_responses_feedback_id ON feedback_responses(feedback_id);
CREATE INDEX idx_feedback_categories_org_id ON feedback_categories(organization_id, is_active);
CREATE INDEX idx_feedback_analytics_org_period ON feedback_analytics(organization_id, date_period, period_type);

-- Row Level Security (RLS) Policies
ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feedback_submissions
CREATE POLICY "Users can view their organization's feedback" ON feedback_submissions
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert feedback for their organization" ON feedback_submissions
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can update feedback" ON feedback_submissions
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- RLS Policies for feedback_attachments
CREATE POLICY "Users can view attachments for their org feedback" ON feedback_attachments
    FOR SELECT USING (
        feedback_id IN (
            SELECT id FROM feedback_submissions 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert attachments for their org feedback" ON feedback_attachments
    FOR INSERT WITH CHECK (
        feedback_id IN (
            SELECT id FROM feedback_submissions 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

-- RLS Policies for feedback_responses
CREATE POLICY "Users can view responses for their org feedback" ON feedback_responses
    FOR SELECT USING (
        feedback_id IN (
            SELECT id FROM feedback_submissions 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid()
            )
        ) AND (
            NOT is_internal OR 
            EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
            )
        )
    );

CREATE POLICY "Admins can insert responses" ON feedback_responses
    FOR INSERT WITH CHECK (
        feedback_id IN (
            SELECT id FROM feedback_submissions 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
            )
        )
    );

-- RLS Policies for feedback_categories
CREATE POLICY "Users can view their org categories" ON feedback_categories
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage categories" ON feedback_categories
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- RLS Policies for feedback_analytics  
CREATE POLICY "Admins can view analytics" ON feedback_analytics
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_feedback_submissions_updated_at
    BEFORE UPDATE ON feedback_submissions
    FOR EACH ROW EXECUTE FUNCTION update_feedback_updated_at();

CREATE TRIGGER update_feedback_responses_updated_at
    BEFORE UPDATE ON feedback_responses
    FOR EACH ROW EXECUTE FUNCTION update_feedback_updated_at();

CREATE TRIGGER update_feedback_categories_updated_at
    BEFORE UPDATE ON feedback_categories
    FOR EACH ROW EXECUTE FUNCTION update_feedback_updated_at();

-- Function to auto-update analytics
CREATE OR REPLACE FUNCTION update_feedback_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update daily analytics for the organization
    INSERT INTO feedback_analytics (
        organization_id, 
        date_period, 
        period_type,
        total_submissions,
        open_count,
        resolved_count,
        bug_reports,
        feature_requests,
        support_requests,
        critical_count,
        high_count,
        medium_count,
        low_count,
        wedding_day_issues
    )
    SELECT 
        COALESCE(NEW.organization_id, OLD.organization_id),
        CURRENT_DATE,
        'daily',
        COUNT(*) FILTER (WHERE status != 'deleted'),
        COUNT(*) FILTER (WHERE status IN ('open', 'in_progress')),
        COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')),
        COUNT(*) FILTER (WHERE feedback_type = 'bug_report'),
        COUNT(*) FILTER (WHERE feedback_type = 'feature_request'),
        COUNT(*) FILTER (WHERE feedback_type = 'support_request'),
        COUNT(*) FILTER (WHERE priority = 'critical'),
        COUNT(*) FILTER (WHERE priority = 'high'),
        COUNT(*) FILTER (WHERE priority = 'medium'),
        COUNT(*) FILTER (WHERE priority = 'low'),
        COUNT(*) FILTER (WHERE is_wedding_day_critical = TRUE)
    FROM feedback_submissions 
    WHERE organization_id = COALESCE(NEW.organization_id, OLD.organization_id)
        AND DATE(created_at) = CURRENT_DATE
        AND deleted_at IS NULL
    ON CONFLICT (organization_id, date_period, period_type) 
    DO UPDATE SET
        total_submissions = EXCLUDED.total_submissions,
        open_count = EXCLUDED.open_count,
        resolved_count = EXCLUDED.resolved_count,
        bug_reports = EXCLUDED.bug_reports,
        feature_requests = EXCLUDED.feature_requests,
        support_requests = EXCLUDED.support_requests,
        critical_count = EXCLUDED.critical_count,
        high_count = EXCLUDED.high_count,
        medium_count = EXCLUDED.medium_count,
        low_count = EXCLUDED.low_count,
        wedding_day_issues = EXCLUDED.wedding_day_issues,
        updated_at = NOW();
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for analytics updates
CREATE TRIGGER update_feedback_analytics_on_insert
    AFTER INSERT ON feedback_submissions
    FOR EACH ROW EXECUTE FUNCTION update_feedback_analytics();

CREATE TRIGGER update_feedback_analytics_on_update
    AFTER UPDATE ON feedback_submissions
    FOR EACH ROW EXECUTE FUNCTION update_feedback_analytics();

-- Insert default feedback categories for all organizations
INSERT INTO feedback_categories (organization_id, name, description, color, sort_order)
SELECT 
    id as organization_id,
    category_name,
    category_desc,
    category_color,
    category_order
FROM organizations,
(VALUES 
    ('Bug Report', 'Technical issues and software bugs', '#EF4444', 1),
    ('Feature Request', 'Suggestions for new features or improvements', '#3B82F6', 2),
    ('General Feedback', 'General comments and suggestions', '#8B5CF6', 3),
    ('Support Request', 'Help with using the platform', '#10B981', 4),
    ('Billing Inquiry', 'Questions about billing and subscriptions', '#F59E0B', 5),
    ('Wedding Day Issue', 'Critical issues during wedding events', '#DC2626', 6)
) AS default_categories(category_name, category_desc, category_color, category_order)
ON CONFLICT (organization_id, name) DO NOTHING;

-- Create notification function for critical feedback
CREATE OR REPLACE FUNCTION notify_critical_feedback()
RETURNS TRIGGER AS $$
BEGIN
    -- Send notification for critical feedback
    IF NEW.priority IN ('critical', 'wedding_day_urgent') OR NEW.is_wedding_day_critical = TRUE THEN
        -- Insert notification for admins (implementation depends on existing notification system)
        INSERT INTO notifications (
            organization_id,
            user_id,
            type,
            title,
            message,
            metadata,
            created_at
        )
        SELECT 
            NEW.organization_id,
            user_id,
            'critical_feedback',
            'Critical Feedback Received',
            'A critical feedback submission requires immediate attention: ' || NEW.subject,
            jsonb_build_object(
                'feedback_id', NEW.id,
                'priority', NEW.priority,
                'feedback_type', NEW.feedback_type,
                'is_wedding_day_critical', NEW.is_wedding_day_critical
            ),
            NOW()
        FROM user_profiles 
        WHERE organization_id = NEW.organization_id 
            AND role IN ('admin', 'owner')
            AND user_id IS NOT NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for critical feedback notifications
CREATE TRIGGER notify_critical_feedback_trigger
    AFTER INSERT ON feedback_submissions
    FOR EACH ROW EXECUTE FUNCTION notify_critical_feedback();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;