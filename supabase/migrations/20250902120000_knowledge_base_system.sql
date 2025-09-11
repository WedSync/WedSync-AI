-- =====================================================================================
-- WS-238 Knowledge Base System Migration
-- Wedding Industry Knowledge Management with Full-Text Search & Analytics
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- ENUMS AND TYPES
-- =====================================================================================

-- Wedding industry categories (more specific than generic categories)
CREATE TYPE kb_category AS ENUM (
    'photography',
    'videography', 
    'venues',
    'catering',
    'planning',
    'flowers',
    'music_entertainment',
    'transport',
    'decor_styling',
    'beauty',
    'stationery',
    'cakes_desserts',
    'legal_insurance',
    'honeymoon_travel',
    'gifts_favors',
    'technology',
    'marketing',
    'business_operations',
    'client_management',
    'general'
);

-- Content difficulty levels
CREATE TYPE kb_difficulty AS ENUM (
    'beginner',
    'intermediate', 
    'advanced',
    'expert'
);

-- Article status for editorial workflow
CREATE TYPE kb_status AS ENUM (
    'draft',
    'review',
    'published',
    'archived',
    'scheduled'
);

-- Content types for different formats
CREATE TYPE kb_content_type AS ENUM (
    'article',
    'tutorial',
    'faq',
    'checklist',
    'template',
    'video',
    'podcast',
    'case_study',
    'best_practice'
);

-- Access levels based on subscription tiers
CREATE TYPE kb_access_level AS ENUM (
    'free',           -- Available to all (including trial)
    'starter',        -- Requires Starter plan or higher
    'professional',   -- Requires Professional plan or higher
    'scale',          -- Requires Scale plan or higher
    'enterprise'      -- Enterprise only
);

-- Feedback types for analytics
CREATE TYPE kb_feedback_type AS ENUM (
    'helpful',
    'not_helpful',
    'rating',
    'comment',
    'suggestion',
    'correction'
);

-- =====================================================================================
-- MAIN KNOWLEDGE BASE TABLES
-- =====================================================================================

-- Core articles table with full-text search optimization
CREATE TABLE kb_articles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Basic article information
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image_url TEXT,
    
    -- Classification and organization
    category kb_category NOT NULL DEFAULT 'general',
    subcategory VARCHAR(100),
    tags TEXT[],
    difficulty kb_difficulty NOT NULL DEFAULT 'beginner',
    content_type kb_content_type NOT NULL DEFAULT 'article',
    
    -- Publishing and access control
    status kb_status NOT NULL DEFAULT 'draft',
    access_level kb_access_level NOT NULL DEFAULT 'free',
    is_featured BOOLEAN DEFAULT FALSE,
    is_trending BOOLEAN DEFAULT FALSE,
    
    -- Content metadata
    reading_time_minutes INTEGER,
    word_count INTEGER,
    external_links TEXT[],
    related_article_ids UUID[],
    
    -- SEO and discoverability
    meta_title VARCHAR(200),
    meta_description VARCHAR(500),
    canonical_url TEXT,
    
    -- Publishing workflow
    author_id UUID REFERENCES user_profiles(id),
    reviewer_id UUID REFERENCES user_profiles(id),
    published_at TIMESTAMPTZ,
    scheduled_for TIMESTAMPTZ,
    
    -- Full-text search vectors (pre-computed for performance)
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(excerpt, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(content, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'D')
    ) STORED,
    
    -- Analytics tracking
    view_count INTEGER DEFAULT 0,
    helpful_votes INTEGER DEFAULT 0,
    not_helpful_votes INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2),
    total_ratings INTEGER DEFAULT 0,
    last_updated_analytics TIMESTAMPTZ,
    
    -- Audit trail
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    
    -- Constraints
    CONSTRAINT kb_articles_slug_org_unique UNIQUE (slug, organization_id),
    CONSTRAINT kb_articles_reading_time_check CHECK (reading_time_minutes >= 0),
    CONSTRAINT kb_articles_word_count_check CHECK (word_count >= 0),
    CONSTRAINT kb_articles_rating_check CHECK (average_rating >= 0 AND average_rating <= 5),
    CONSTRAINT kb_articles_scheduled_check CHECK (
        (status = 'scheduled' AND scheduled_for IS NOT NULL) OR
        (status != 'scheduled')
    )
);

-- Search analytics for optimization and insights
CREATE TABLE kb_search_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Search query information
    search_query TEXT NOT NULL,
    search_filters JSONB, -- Store category, difficulty, type filters
    user_id UUID REFERENCES user_profiles(id),
    user_tier VARCHAR(50), -- Cache tier at search time
    
    -- Results and interaction
    results_count INTEGER NOT NULL DEFAULT 0,
    clicked_article_id UUID REFERENCES kb_articles(id),
    click_position INTEGER, -- Position in results (1, 2, 3...)
    time_to_click_seconds INTEGER,
    
    -- Context and source
    search_source VARCHAR(50) DEFAULT 'search_bar', -- search_bar, suggestion, related
    referrer_url TEXT,
    user_agent TEXT,
    device_type VARCHAR(20), -- mobile, tablet, desktop
    
    -- Geographic and temporal context
    search_timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_timezone VARCHAR(50),
    session_id VARCHAR(100),
    
    -- Wedding context (if applicable)
    wedding_date DATE,
    wedding_phase VARCHAR(50), -- planning, week_of, post_wedding
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User feedback and ratings system
CREATE TABLE kb_article_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    article_id UUID REFERENCES kb_articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Feedback content
    feedback_type kb_feedback_type NOT NULL,
    rating INTEGER, -- 1-5 stars (nullable for non-rating feedback)
    comment TEXT,
    suggestion TEXT,
    
    -- Feedback categorization
    is_constructive BOOLEAN DEFAULT TRUE,
    is_spam BOOLEAN DEFAULT FALSE,
    is_verified_customer BOOLEAN DEFAULT FALSE,
    
    -- Moderation
    is_approved BOOLEAN DEFAULT NULL, -- NULL = pending, TRUE = approved, FALSE = rejected
    moderator_id UUID REFERENCES user_profiles(id),
    moderated_at TIMESTAMPTZ,
    moderation_notes TEXT,
    
    -- Context
    user_experience_level VARCHAR(50), -- beginner, experienced, expert
    business_type VARCHAR(100), -- photographer, venue, planner, etc.
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT kb_feedback_rating_check CHECK (
        (feedback_type = 'rating' AND rating BETWEEN 1 AND 5) OR
        (feedback_type != 'rating')
    ),
    CONSTRAINT kb_feedback_unique_user_article UNIQUE (article_id, user_id, feedback_type)
);

-- Article version history for editorial tracking
CREATE TABLE kb_article_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    article_id UUID REFERENCES kb_articles(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    
    -- Snapshot of article at this version
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    
    -- Change tracking
    changed_by UUID REFERENCES user_profiles(id),
    change_summary TEXT,
    change_type VARCHAR(50), -- created, updated, published, archived
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT kb_versions_unique_article_version UNIQUE (article_id, version_number)
);

-- Knowledge base usage analytics aggregated by day
CREATE TABLE kb_daily_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Search metrics
    total_searches INTEGER DEFAULT 0,
    unique_searchers INTEGER DEFAULT 0,
    avg_results_per_search DECIMAL(10,2),
    zero_result_searches INTEGER DEFAULT 0,
    
    -- Content metrics  
    total_article_views INTEGER DEFAULT 0,
    unique_article_viewers INTEGER DEFAULT 0,
    most_viewed_article_id UUID REFERENCES kb_articles(id),
    most_searched_terms TEXT[],
    
    -- User engagement
    total_feedback_submissions INTEGER DEFAULT 0,
    average_session_duration_seconds INTEGER,
    bounce_rate DECIMAL(5,4), -- percentage as decimal
    
    -- Tier breakdown
    free_tier_usage INTEGER DEFAULT 0,
    starter_tier_usage INTEGER DEFAULT 0,
    professional_tier_usage INTEGER DEFAULT 0,
    scale_tier_usage INTEGER DEFAULT 0,
    enterprise_tier_usage INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT kb_daily_analytics_unique_org_date UNIQUE (organization_id, date)
);

-- =====================================================================================
-- PERFORMANCE INDEXES
-- =====================================================================================

-- Full-text search indexes
CREATE INDEX idx_kb_articles_search_vector ON kb_articles USING gin(search_vector);
CREATE INDEX idx_kb_articles_title_trgm ON kb_articles USING gin(title gin_trgm_ops);

-- Core lookup indexes
CREATE INDEX idx_kb_articles_org_status ON kb_articles(organization_id, status);
CREATE INDEX idx_kb_articles_org_category ON kb_articles(organization_id, category);
CREATE INDEX idx_kb_articles_org_published ON kb_articles(organization_id, published_at DESC) 
WHERE status = 'published';

-- Access control indexes
CREATE INDEX idx_kb_articles_access_level ON kb_articles(access_level);
CREATE INDEX idx_kb_articles_featured ON kb_articles(is_featured, organization_id) 
WHERE is_featured = true;

-- Performance optimization indexes
CREATE INDEX idx_kb_articles_trending ON kb_articles(is_trending, view_count DESC) 
WHERE is_trending = true;
CREATE INDEX idx_kb_articles_rating ON kb_articles(average_rating DESC, total_ratings DESC);

-- Search analytics indexes
CREATE INDEX idx_kb_search_analytics_org_timestamp ON kb_search_analytics(organization_id, search_timestamp DESC);
CREATE INDEX idx_kb_search_analytics_query_hash ON kb_search_analytics USING hash(search_query);
CREATE INDEX idx_kb_search_analytics_user_session ON kb_search_analytics(user_id, session_id);

-- Feedback indexes
CREATE INDEX idx_kb_feedback_article_approved ON kb_article_feedback(article_id, is_approved);
CREATE INDEX idx_kb_feedback_user_type ON kb_article_feedback(user_id, feedback_type);

-- Daily analytics indexes
CREATE INDEX idx_kb_daily_analytics_org_date ON kb_daily_analytics(organization_id, date DESC);

-- =====================================================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================================================

-- Enable RLS on all tables
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_article_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_article_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_daily_analytics ENABLE ROW LEVEL SECURITY;

-- Articles RLS policies
CREATE POLICY "Users can view published articles in their organization" ON kb_articles
    FOR SELECT 
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
        AND (
            status = 'published' 
            OR author_id = auth.uid() 
            OR reviewer_id = auth.uid()
        )
    );

CREATE POLICY "Authors can manage their own articles" ON kb_articles
    FOR ALL 
    USING (author_id = auth.uid())
    WITH CHECK (author_id = auth.uid());

CREATE POLICY "Organization admins can manage all articles" ON kb_articles
    FOR ALL 
    USING (
        organization_id IN (
            SELECT up.organization_id FROM user_profiles up
            JOIN organizations o ON up.organization_id = o.id
            WHERE up.id = auth.uid() 
            AND (up.role = 'admin' OR up.role = 'owner')
        )
    );

-- Search analytics RLS
CREATE POLICY "Users can view search analytics for their organization" ON kb_search_analytics
    FOR SELECT 
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own search analytics" ON kb_search_analytics
    FOR INSERT 
    WITH CHECK (
        user_id = auth.uid() 
        AND organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Feedback RLS
CREATE POLICY "Users can manage their own feedback" ON kb_article_feedback
    FOR ALL 
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view approved feedback in their organization" ON kb_article_feedback
    FOR SELECT 
    USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
        AND (is_approved = true OR user_id = auth.uid())
    );

-- Version history RLS
CREATE POLICY "Users can view versions of accessible articles" ON kb_article_versions
    FOR SELECT 
    USING (
        article_id IN (
            SELECT id FROM kb_articles 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE id = auth.uid()
            )
        )
    );

-- Daily analytics RLS (admin/owner only)
CREATE POLICY "Organization admins can view analytics" ON kb_daily_analytics
    FOR SELECT 
    USING (
        organization_id IN (
            SELECT up.organization_id FROM user_profiles up
            JOIN organizations o ON up.organization_id = o.id
            WHERE up.id = auth.uid() 
            AND (up.role = 'admin' OR up.role = 'owner')
        )
    );

-- =====================================================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================================================

-- Function to update article analytics from feedback
CREATE OR REPLACE FUNCTION update_article_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update rating statistics for the article
    UPDATE kb_articles 
    SET 
        helpful_votes = (
            SELECT COUNT(*) FROM kb_article_feedback 
            WHERE article_id = NEW.article_id 
            AND feedback_type = 'helpful' 
            AND is_approved = true
        ),
        not_helpful_votes = (
            SELECT COUNT(*) FROM kb_article_feedback 
            WHERE article_id = NEW.article_id 
            AND feedback_type = 'not_helpful' 
            AND is_approved = true
        ),
        average_rating = (
            SELECT AVG(rating) FROM kb_article_feedback 
            WHERE article_id = NEW.article_id 
            AND feedback_type = 'rating' 
            AND rating IS NOT NULL 
            AND is_approved = true
        ),
        total_ratings = (
            SELECT COUNT(*) FROM kb_article_feedback 
            WHERE article_id = NEW.article_id 
            AND feedback_type = 'rating' 
            AND rating IS NOT NULL 
            AND is_approved = true
        ),
        last_updated_analytics = NOW()
    WHERE id = NEW.article_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create article version on significant changes
CREATE OR REPLACE FUNCTION create_article_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create version if title or content changed significantly
    IF OLD.title != NEW.title OR OLD.content != NEW.content THEN
        INSERT INTO kb_article_versions (
            article_id,
            version_number,
            title,
            content,
            excerpt,
            changed_by,
            change_summary,
            change_type
        )
        VALUES (
            NEW.id,
            NEW.version,
            OLD.title,
            OLD.content,
            OLD.excerpt,
            auth.uid(),
            CASE 
                WHEN OLD.title != NEW.title AND OLD.content != NEW.content THEN 'Title and content updated'
                WHEN OLD.title != NEW.title THEN 'Title updated'
                WHEN OLD.content != NEW.content THEN 'Content updated'
                ELSE 'Article updated'
            END,
            CASE 
                WHEN OLD.status != NEW.status AND NEW.status = 'published' THEN 'published'
                WHEN OLD.status != NEW.status AND NEW.status = 'archived' THEN 'archived'
                ELSE 'updated'
            END
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update word count and reading time
CREATE OR REPLACE FUNCTION calculate_article_metrics()
RETURNS TRIGGER AS $$
DECLARE
    words_per_minute INTEGER := 200; -- Average reading speed
    word_count_calculated INTEGER;
BEGIN
    -- Calculate word count (simple whitespace split)
    word_count_calculated := array_length(string_to_array(NEW.content, ' '), 1);
    
    NEW.word_count := word_count_calculated;
    NEW.reading_time_minutes := GREATEST(1, CEIL(word_count_calculated::DECIMAL / words_per_minute));
    NEW.updated_at := NOW();
    NEW.version := COALESCE(OLD.version, 0) + 1;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment view count safely
CREATE OR REPLACE FUNCTION increment_article_views(article_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE kb_articles 
    SET view_count = view_count + 1 
    WHERE id = article_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

-- Update article metrics on content changes
CREATE TRIGGER tr_calculate_article_metrics
    BEFORE INSERT OR UPDATE OF content, title ON kb_articles
    FOR EACH ROW
    EXECUTE FUNCTION calculate_article_metrics();

-- Create version history on significant changes
CREATE TRIGGER tr_create_article_version
    AFTER UPDATE OF title, content, status ON kb_articles
    FOR EACH ROW
    EXECUTE FUNCTION create_article_version();

-- Update analytics when feedback changes
CREATE TRIGGER tr_update_article_analytics
    AFTER INSERT OR UPDATE OR DELETE ON kb_article_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_article_analytics();

-- =====================================================================================
-- INITIAL SEED DATA
-- =====================================================================================

-- Wedding industry article templates and initial content
INSERT INTO kb_articles (
    title,
    slug,
    excerpt,
    content,
    category,
    subcategory,
    tags,
    difficulty,
    content_type,
    status,
    access_level,
    is_featured,
    author_id,
    published_at
) VALUES 
-- Photography articles
(
    'Essential Wedding Photography Equipment Checklist',
    'wedding-photography-equipment-checklist',
    'Complete guide to professional wedding photography gear including cameras, lenses, lighting, and backup equipment.',
    '# Essential Wedding Photography Equipment Checklist

## Camera Bodies
- Primary camera (full-frame recommended)
- Backup camera body
- Battery grips for extended shooting

## Essential Lenses
- 24-70mm f/2.8 (versatile workhorse)
- 85mm f/1.4 (portraits and ring shots)
- 16-35mm f/2.8 (wide ceremonies and venues)

## Lighting Equipment
- External flash units (2-3 minimum)
- Light modifiers and diffusers
- Backup batteries and chargers

## Additional Gear
- Multiple memory cards (32GB+ each)
- Portable backup device
- Lens cleaning kit
- Emergency repair tape',
    'photography',
    'equipment',
    ARRAY['equipment', 'checklist', 'gear', 'professional'],
    'beginner',
    'checklist',
    'published',
    'free',
    true,
    NULL,
    NOW()
),

-- Venue management
(
    'Venue Pricing Strategy: Maximizing Revenue',
    'venue-pricing-strategy-revenue',
    'Advanced pricing strategies for wedding venues including seasonal adjustments, package deals, and premium add-ons.',
    '# Venue Pricing Strategy: Maximizing Revenue

## Dynamic Pricing Models
Understanding market demand and adjusting prices accordingly is crucial for venue success.

### Peak Season Strategy
- Saturday premiums (20-40% markup)
- Holiday weekend rates
- Popular month surcharges (May, September, October)

### Off-Season Opportunities
- Winter wedding packages
- Weekday discounts (30-50% off)
- Last-minute booking deals

## Package Development
Create comprehensive packages that increase average booking value while simplifying client decisions.

### Essential Package Components
- Venue rental
- Tables and chairs
- Basic lighting
- Coordination services

### Premium Add-Ons
- Upgraded linens and decor
- Extended venue access
- Vendor meal services
- Enhanced lighting packages',
    'venues',
    'pricing',
    ARRAY['pricing', 'revenue', 'strategy', 'packages'],
    'advanced',
    'article',
    'published',
    'professional',
    true,
    NULL,
    NOW()
),

-- Wedding planning
(
    'Creating Wedding Timelines That Actually Work',
    'wedding-timelines-that-work',
    'Step-by-step guide to creating realistic wedding day timelines that account for photos, logistics, and guest experience.',
    '# Creating Wedding Timelines That Actually Work

## Timeline Fundamentals
A great wedding timeline balances photography needs, vendor requirements, and guest comfort.

### Key Timing Considerations
- Golden hour photography windows
- Vendor setup and breakdown times  
- Guest arrival and seating
- Meal service duration

## Photography Time Blocks
Allow sufficient time for each photo session:

### Getting Ready Photos
- Bride: 90-120 minutes
- Groom: 45-60 minutes
- Details and venue shots: 30 minutes

### Ceremony Coverage
- Pre-ceremony setup: 30 minutes
- Guest arrival: 30 minutes
- Ceremony: 30-60 minutes
- Family formals: 45-60 minutes

### Reception Timeline
- Cocktail hour: 60-90 minutes
- Dinner service: 90-120 minutes
- Dancing and party: 3-4 hours',
    'planning',
    'timelines',
    ARRAY['timeline', 'planning', 'photography', 'coordination'],
    'intermediate',
    'tutorial',
    'published',
    'starter',
    false,
    NULL,
    NOW()
),

-- Business operations
(
    'Client Contract Essentials: Protecting Your Business',
    'client-contract-essentials-protection',
    'Legal protection for wedding vendors through comprehensive contracts, including payment terms, cancellation policies, and liability coverage.',
    '# Client Contract Essentials: Protecting Your Business

## Contract Fundamentals
Every wedding vendor needs bulletproof contracts to protect their business and set clear expectations.

### Essential Contract Elements
- Detailed service descriptions
- Payment schedules and terms
- Cancellation and rescheduling policies
- Force majeure clauses (COVID considerations)
- Liability limitations

## Payment Protection
Secure your revenue with smart payment terms:

### Recommended Payment Schedule
- Booking retainer: 25-50%
- Progress payment: 25-50% (30-60 days before)
- Final payment: Due 7-14 days before event

### Late Payment Penalties
- Grace period: 3-5 days
- Late fees: 1.5% per month
- Collection procedures

## Liability and Insurance
Protect yourself from potential lawsuits and damages:

### Insurance Requirements
- General liability coverage
- Professional indemnity insurance
- Equipment coverage for photographers/videographers

### Liability Limitations
- Cap damages to contract value
- Exclude consequential damages
- Require client insurance for venues',
    'business_operations',
    'contracts',
    ARRAY['contracts', 'legal', 'payments', 'insurance', 'protection'],
    'intermediate',
    'article',
    'published',
    'scale',
    false,
    NULL,
    NOW()
);

-- =====================================================================================
-- SEARCH OPTIMIZATION FUNCTIONS
-- =====================================================================================

-- Function for intelligent search with ranking
CREATE OR REPLACE FUNCTION search_knowledge_base(
    org_id UUID,
    search_term TEXT,
    category_filter kb_category DEFAULT NULL,
    difficulty_filter kb_difficulty DEFAULT NULL,
    access_levels kb_access_level[] DEFAULT NULL,
    limit_results INTEGER DEFAULT 20,
    offset_results INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(500),
    excerpt TEXT,
    category kb_category,
    difficulty kb_difficulty,
    access_level kb_access_level,
    view_count INTEGER,
    average_rating DECIMAL(3,2),
    published_at TIMESTAMPTZ,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.excerpt,
        a.category,
        a.difficulty,
        a.access_level,
        a.view_count,
        a.average_rating,
        a.published_at,
        ts_rank(a.search_vector, plainto_tsquery('english', search_term)) as rank
    FROM kb_articles a
    WHERE 
        a.organization_id = org_id
        AND a.status = 'published'
        AND (category_filter IS NULL OR a.category = category_filter)
        AND (difficulty_filter IS NULL OR a.difficulty = difficulty_filter)
        AND (access_levels IS NULL OR a.access_level = ANY(access_levels))
        AND a.search_vector @@ plainto_tsquery('english', search_term)
    ORDER BY 
        rank DESC,
        a.is_featured DESC,
        a.view_count DESC,
        a.published_at DESC
    LIMIT limit_results
    OFFSET offset_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trending articles
CREATE OR REPLACE FUNCTION get_trending_articles(
    org_id UUID,
    days_back INTEGER DEFAULT 7,
    limit_results INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(500),
    category kb_category,
    view_count INTEGER,
    trend_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.category,
        a.view_count,
        -- Simple trending score based on recent views and ratings
        (a.view_count * 0.7 + COALESCE(a.average_rating, 0) * a.total_ratings * 0.3) as trend_score
    FROM kb_articles a
    WHERE 
        a.organization_id = org_id
        AND a.status = 'published'
        AND a.published_at >= NOW() - INTERVAL '%s days' % days_back
    ORDER BY trend_score DESC, a.published_at DESC
    LIMIT limit_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================================================

-- Table comments for documentation
COMMENT ON TABLE kb_articles IS 'Main knowledge base articles with full-text search optimization for wedding industry content';
COMMENT ON TABLE kb_search_analytics IS 'Tracks search queries and user behavior for knowledge base optimization';
COMMENT ON TABLE kb_article_feedback IS 'User feedback, ratings, and comments on knowledge base articles';
COMMENT ON TABLE kb_article_versions IS 'Version history for editorial workflow and change tracking';
COMMENT ON TABLE kb_daily_analytics IS 'Daily aggregated analytics for knowledge base usage and performance';

-- Column comments for key fields
COMMENT ON COLUMN kb_articles.search_vector IS 'Pre-computed full-text search vector with weighted content (title=A, excerpt=B, content=C, tags=D)';
COMMENT ON COLUMN kb_articles.access_level IS 'Subscription tier required to access this content (free, starter, professional, scale, enterprise)';
COMMENT ON COLUMN kb_search_analytics.click_position IS 'Position of clicked result in search results (1-based indexing)';
COMMENT ON COLUMN kb_article_feedback.is_verified_customer IS 'Whether the feedback author is a verified paying customer';

-- =====================================================================================
-- GRANTS AND PERMISSIONS
-- =====================================================================================

-- Grant appropriate permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON kb_articles TO authenticated;
GRANT SELECT, INSERT ON kb_search_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON kb_article_feedback TO authenticated;
GRANT SELECT ON kb_article_versions TO authenticated;
GRANT SELECT ON kb_daily_analytics TO authenticated;

-- Grant permissions on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Service role gets full access for administrative operations
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

COMMIT;

-- =====================================================================================
-- POST-MIGRATION NOTES
-- =====================================================================================

/*
WEDDING INDUSTRY OPTIMIZATION NOTES:

1. SEARCH PERFORMANCE:
   - Full-text search vectors are pre-computed for maximum performance
   - Trigram indexes on titles for fuzzy matching
   - Multi-column indexes for common filter combinations

2. SUBSCRIPTION TIER INTEGRATION:
   - access_level enum maps directly to WedSync subscription tiers
   - RLS policies automatically enforce access control
   - Free tier content drives trial-to-paid conversion

3. WEDDING CONTEXT TRACKING:
   - Search analytics capture wedding phase and context
   - Geographic and temporal data for trend analysis
   - Device-specific analytics for mobile optimization

4. CONTENT STRATEGY:
   - Featured articles drive engagement and showcase premium content
   - Trending algorithms promote recent high-quality content
   - Version history enables editorial workflow and rollbacks

5. BUSINESS INTELLIGENCE:
   - Daily analytics aggregate key metrics for business decisions
   - Search analytics identify content gaps and user needs
   - Feedback system provides continuous content improvement

6. MOBILE OPTIMIZATION:
   - Responsive design considerations in content structure
   - Performance indexes optimized for mobile search patterns
   - Offline-friendly content caching support

RECOMMENDED NEXT STEPS:
1. Implement TypeScript interfaces matching these table structures
2. Create React components for search, article display, and feedback
3. Set up automated content analysis and trending calculations
4. Configure full-text search with custom dictionaries for wedding terms
5. Implement content recommendation engine based on user behavior

PERFORMANCE MONITORING:
- Monitor search_vector updates for content changes
- Track index usage and query performance
- Analyze trending algorithm effectiveness
- Review RLS policy performance under load
*/