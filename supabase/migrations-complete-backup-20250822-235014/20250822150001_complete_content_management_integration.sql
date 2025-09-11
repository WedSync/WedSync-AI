-- =====================================================
-- COMPLETE CONTENT MANAGEMENT SYSTEM INTEGRATION
-- Team C Final Integration: Rounds 1, 2, and 3
-- WS-069: Article Creation Educational Content System
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ROUND 1: BRANDING CONFIGURATION TABLES
-- =====================================================

-- Branding configurations for white-label content
CREATE TABLE IF NOT EXISTS branding_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Logo configuration
    logo_primary TEXT,
    logo_favicon TEXT,
    logo_email_header TEXT,
    
    -- Color system
    color_primary VARCHAR(7) NOT NULL DEFAULT '#9E77ED',
    color_secondary VARCHAR(7) NOT NULL DEFAULT '#6941C6',
    color_accent VARCHAR(7) NOT NULL DEFAULT '#D6BBFB',
    color_background VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
    color_text VARCHAR(7) NOT NULL DEFAULT '#101828',
    color_success VARCHAR(7) NOT NULL DEFAULT '#12B76A',
    color_warning VARCHAR(7) NOT NULL DEFAULT '#F79009',
    color_error VARCHAR(7) NOT NULL DEFAULT '#F04438',
    
    -- Typography system
    typography_heading_font VARCHAR(100) NOT NULL DEFAULT 'Inter',
    typography_body_font VARCHAR(100) NOT NULL DEFAULT 'Inter',
    typography_base_font_size INTEGER NOT NULL DEFAULT 16,
    
    -- Custom CSS
    custom_css TEXT,
    
    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one active branding config per user
    UNIQUE(user_id, is_active) WHERE is_active = true
);

-- =====================================================
-- ROUND 2: DOCUMENT STORAGE INTEGRATION
-- =====================================================

-- Document categories (already exists, but ensure consistency)
CREATE TABLE IF NOT EXISTS document_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#6B7280',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default document categories for article attachments
INSERT INTO document_categories (name, slug, description, icon, color, sort_order)
VALUES 
    ('Article Resources', 'article-resources', 'Documents and media for article content', 'FileText', '#3B82F6', 10),
    ('Brand Assets', 'brand-assets', 'Logos, images, and branding materials', 'Image', '#8B5CF6', 20),
    ('Educational Materials', 'educational-materials', 'Guides, checklists, and educational content', 'BookOpen', '#10B981', 30)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- ROUND 3: ARTICLE CREATION SYSTEM
-- =====================================================

-- Article categories
CREATE TABLE IF NOT EXISTS article_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6B7280',
    icon VARCHAR(50) DEFAULT 'BookOpen',
    sort_order INTEGER NOT NULL DEFAULT 0,
    article_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default article categories
INSERT INTO article_categories (name, slug, description, color, icon, sort_order)
VALUES 
    ('Planning Guides', 'planning-guides', 'Comprehensive wedding planning guides', '#3B82F6', 'Calendar', 10),
    ('Vendor Selection', 'vendor-selection', 'Tips for choosing wedding vendors', '#8B5CF6', 'Users', 20),
    ('Style & Design', 'style-design', 'Wedding style and design inspiration', '#EC4899', 'Palette', 30),
    ('Budget Tips', 'budget-tips', 'Wedding budget planning and saving tips', '#10B981', 'DollarSign', 40),
    ('Timeline & Logistics', 'timeline-logistics', 'Wedding timeline and logistics planning', '#F59E0B', 'Clock', 50),
    ('Seasonal Content', 'seasonal-content', 'Season-specific wedding content', '#06B6D4', 'Sun', 60)
ON CONFLICT (slug) DO NOTHING;

-- Articles table with complete integration
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic article information
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    content JSONB NOT NULL, -- Tiptap JSON content
    content_html TEXT NOT NULL, -- Rendered HTML content
    excerpt TEXT,
    featured_image_url TEXT,
    
    -- Article status and publishing
    status VARCHAR(20) NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'review', 'scheduled', 'published', 'archived')),
    published_at TIMESTAMP WITH TIME ZONE,
    scheduled_publish_at TIMESTAMP WITH TIME ZONE,
    last_published_at TIMESTAMP WITH TIME ZONE,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    reading_time_minutes INTEGER NOT NULL DEFAULT 1,
    
    -- SEO optimization
    seo_title VARCHAR(60),
    seo_description VARCHAR(160),
    seo_keywords TEXT[], -- Array of keywords
    seo_score INTEGER NOT NULL DEFAULT 0 CHECK (seo_score >= 0 AND seo_score <= 100),
    meta_image_url TEXT,
    
    -- Categorization and tagging
    category_ids UUID[] NOT NULL DEFAULT '{}',
    tags TEXT[] NOT NULL DEFAULT '{}',
    
    -- Distribution targeting
    target_wedding_types TEXT[] NOT NULL DEFAULT '{}',
    target_client_segments TEXT[] NOT NULL DEFAULT '{}',
    
    -- Analytics and engagement
    view_count INTEGER NOT NULL DEFAULT 0,
    engagement_score INTEGER NOT NULL DEFAULT 0,
    shares_count INTEGER NOT NULL DEFAULT 0,
    average_read_time NUMERIC(10,2) NOT NULL DEFAULT 0,
    bounce_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    
    -- Integration with Rounds 1 & 2
    branding_config_id UUID REFERENCES branding_configs(id) ON DELETE SET NULL,
    attached_documents UUID[] NOT NULL DEFAULT '{}', -- References to business_documents
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, slug),
    CONSTRAINT valid_seo_title_length CHECK (char_length(seo_title) <= 60),
    CONSTRAINT valid_seo_description_length CHECK (char_length(seo_description) <= 160)
);

-- Content distribution rules
CREATE TABLE IF NOT EXISTS content_distribution_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    
    -- Rule configuration
    condition_type VARCHAR(50) NOT NULL 
        CHECK (condition_type IN ('wedding_month', 'wedding_season', 'budget_range', 
                                  'guest_count', 'venue_type', 'planning_stage', 
                                  'client_tags', 'vendor_category')),
    condition_value TEXT NOT NULL, -- JSON string for complex conditions
    priority INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Article document associations (Round 2 integration)
CREATE TABLE IF NOT EXISTS article_document_associations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES business_documents(id) ON DELETE CASCADE,
    
    -- Display configuration
    display_name VARCHAR(200) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(article_id, document_id)
);

-- Article analytics tracking
CREATE TABLE IF NOT EXISTS article_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    
    -- Date and basic metrics
    date DATE NOT NULL,
    views INTEGER NOT NULL DEFAULT 0,
    unique_views INTEGER NOT NULL DEFAULT 0,
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,
    scroll_depth_percentage INTEGER NOT NULL DEFAULT 0,
    shares INTEGER NOT NULL DEFAULT 0,
    
    -- Engagement events (JSON)
    engagement_events JSONB NOT NULL DEFAULT '[]',
    
    -- Traffic sources (JSON)
    traffic_sources JSONB NOT NULL DEFAULT '[]',
    
    -- Device and geographic breakdown (JSON)
    device_breakdown JSONB NOT NULL DEFAULT '{}',
    geographic_data JSONB NOT NULL DEFAULT '[]',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(article_id, date)
);

-- Publishing schedule
CREATE TABLE IF NOT EXISTS publishing_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    
    -- Schedule configuration
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'published', 'failed', 'cancelled')),
    
    -- Notification settings (JSON)
    notification_settings JSONB NOT NULL DEFAULT '{}',
    
    -- Execution tracking
    execution_attempts INTEGER NOT NULL DEFAULT 0,
    last_execution_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Article indexes
CREATE INDEX IF NOT EXISTS idx_articles_user_id ON articles(user_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_articles_category_ids ON articles USING GIN(category_ids);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_articles_target_wedding_types ON articles USING GIN(target_wedding_types);
CREATE INDEX IF NOT EXISTS idx_articles_branding_config ON articles(branding_config_id);
CREATE INDEX IF NOT EXISTS idx_articles_attached_documents ON articles USING GIN(attached_documents);

-- Distribution rules indexes
CREATE INDEX IF NOT EXISTS idx_distribution_rules_article_id ON content_distribution_rules(article_id);
CREATE INDEX IF NOT EXISTS idx_distribution_rules_condition_type ON content_distribution_rules(condition_type);
CREATE INDEX IF NOT EXISTS idx_distribution_rules_active ON content_distribution_rules(is_active) WHERE is_active = true;

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_article_analytics_article_date ON article_analytics(article_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_article_analytics_date ON article_analytics(date DESC);

-- Document associations indexes
CREATE INDEX IF NOT EXISTS idx_article_documents_article_id ON article_document_associations(article_id);
CREATE INDEX IF NOT EXISTS idx_article_documents_document_id ON article_document_associations(document_id);

-- Branding configs indexes
CREATE INDEX IF NOT EXISTS idx_branding_configs_user_id ON branding_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_branding_configs_active ON branding_configs(is_active) WHERE is_active = true;

-- Publishing schedules indexes
CREATE INDEX IF NOT EXISTS idx_publishing_schedules_article_id ON publishing_schedules(article_id);
CREATE INDEX IF NOT EXISTS idx_publishing_schedules_scheduled_date ON publishing_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_publishing_schedules_status ON publishing_schedules(status);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE branding_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_distribution_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_document_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE publishing_schedules ENABLE ROW LEVEL SECURITY;

-- Branding configs policies
CREATE POLICY "Users can view their own branding configs" ON branding_configs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own branding configs" ON branding_configs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own branding configs" ON branding_configs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own branding configs" ON branding_configs
    FOR DELETE USING (auth.uid() = user_id);

-- Articles policies
CREATE POLICY "Users can view their own articles" ON articles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view published articles" ON articles
    FOR SELECT USING (status = 'published');

CREATE POLICY "Users can insert their own articles" ON articles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own articles" ON articles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own articles" ON articles
    FOR DELETE USING (auth.uid() = user_id);

-- Distribution rules policies
CREATE POLICY "Users can manage distribution rules for their articles" ON content_distribution_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM articles 
            WHERE articles.id = content_distribution_rules.article_id 
            AND articles.user_id = auth.uid()
        )
    );

-- Article document associations policies
CREATE POLICY "Users can manage document associations for their articles" ON article_document_associations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM articles 
            WHERE articles.id = article_document_associations.article_id 
            AND articles.user_id = auth.uid()
        )
    );

-- Article analytics policies
CREATE POLICY "Users can view analytics for their articles" ON article_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM articles 
            WHERE articles.id = article_analytics.article_id 
            AND articles.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert analytics data" ON article_analytics
    FOR INSERT WITH CHECK (true); -- Allow system to insert analytics

-- Publishing schedules policies
CREATE POLICY "Users can manage publishing schedules for their articles" ON publishing_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM articles 
            WHERE articles.id = publishing_schedules.article_id 
            AND articles.user_id = auth.uid()
        )
    );

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update article category count
CREATE OR REPLACE FUNCTION update_article_category_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update count for old categories
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        UPDATE article_categories 
        SET article_count = (
            SELECT COUNT(*) 
            FROM articles 
            WHERE OLD.id = ANY(category_ids) 
            AND status = 'published'
        )
        WHERE id = ANY(OLD.category_ids);
    END IF;

    -- Update count for new categories
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE article_categories 
        SET article_count = (
            SELECT COUNT(*) 
            FROM articles 
            WHERE NEW.id = ANY(category_ids) 
            AND status = 'published'
        )
        WHERE id = ANY(NEW.category_ids);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for article category count updates
DROP TRIGGER IF EXISTS trigger_update_article_category_count ON articles;
CREATE TRIGGER trigger_update_article_category_count
    AFTER INSERT OR UPDATE OR DELETE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_article_category_count();

-- Function to update article updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
CREATE TRIGGER trigger_articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_branding_configs_updated_at
    BEFORE UPDATE ON branding_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_publishing_schedules_updated_at
    BEFORE UPDATE ON publishing_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS FOR COMPLEX QUERIES
-- =====================================================

-- View for articles with complete data
CREATE OR REPLACE VIEW articles_with_details AS
SELECT 
    a.*,
    bc.color_primary as brand_primary_color,
    bc.color_secondary as brand_secondary_color,
    bc.logo_primary as brand_logo,
    
    -- Category information
    (
        SELECT array_agg(ac.name ORDER BY ac.sort_order)
        FROM article_categories ac
        WHERE ac.id = ANY(a.category_ids)
    ) as category_names,
    
    -- Document count
    (
        SELECT COUNT(*)
        FROM article_document_associations ada
        WHERE ada.article_id = a.id
    ) as attached_documents_count,
    
    -- Analytics summary
    (
        SELECT 
            json_build_object(
                'total_views', COALESCE(SUM(aa.views), 0),
                'total_unique_views', COALESCE(SUM(aa.unique_views), 0),
                'avg_time_spent', COALESCE(AVG(aa.time_spent_seconds), 0),
                'total_shares', COALESCE(SUM(aa.shares), 0)
            )
        FROM article_analytics aa
        WHERE aa.article_id = a.id
        AND aa.date >= CURRENT_DATE - INTERVAL '30 days'
    ) as analytics_30d

FROM articles a
LEFT JOIN branding_configs bc ON a.branding_config_id = bc.id;

-- =====================================================
-- FINAL CONFIGURATION
-- =====================================================

-- Grant necessary permissions
GRANT SELECT ON article_categories TO authenticated;
GRANT ALL ON branding_configs TO authenticated;
GRANT ALL ON articles TO authenticated;
GRANT ALL ON content_distribution_rules TO authenticated;
GRANT ALL ON article_document_associations TO authenticated;
GRANT SELECT, INSERT ON article_analytics TO authenticated;
GRANT ALL ON publishing_schedules TO authenticated;
GRANT SELECT ON articles_with_details TO authenticated;

-- Create completion marker
INSERT INTO migration_status (migration_name, status, completed_at)
VALUES ('20250822150001_complete_content_management_integration', 'completed', NOW())
ON CONFLICT (migration_name) DO UPDATE SET 
    status = 'completed',
    completed_at = NOW();

-- =====================================================
-- MIGRATION COMPLETE
-- Team C Content Management System Integration Ready
-- Rounds 1, 2, and 3 Successfully Integrated
-- =====================================================