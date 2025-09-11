-- SEO Analytics System (Fixed)
-- Feature: WS-069 - Comprehensive SEO tracking and optimization

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- SEO Keywords tracking
CREATE TABLE IF NOT EXISTS seo_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    category VARCHAR(100), -- 'wedding', 'photography', 'venue', etc.
    target_url TEXT,
    search_volume INTEGER,
    difficulty_score INTEGER CHECK (difficulty_score >= 1 AND difficulty_score <= 100),
    current_rank INTEGER,
    target_rank INTEGER,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, keyword)
);

-- SEO Keyword Rankings History
CREATE TABLE IF NOT EXISTS seo_keyword_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword_id UUID NOT NULL REFERENCES seo_keywords(id) ON DELETE CASCADE,
    rank_position INTEGER,
    search_engine VARCHAR(50) DEFAULT 'google', -- 'google', 'bing', 'yahoo'
    location VARCHAR(100), -- Geographic location for ranking
    device_type VARCHAR(20) DEFAULT 'desktop', -- 'desktop', 'mobile'
    url TEXT, -- URL that ranked for this keyword
    check_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(keyword_id, search_engine, location, device_type, check_date)
);

-- Website Pages SEO Analysis
CREATE TABLE IF NOT EXISTS seo_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    page_title TEXT,
    meta_description TEXT,
    h1_tag TEXT,
    page_type VARCHAR(50), -- 'homepage', 'service', 'blog', 'gallery', etc.
    
    -- SEO Metrics
    title_length INTEGER,
    meta_description_length INTEGER,
    word_count INTEGER,
    internal_links_count INTEGER,
    external_links_count INTEGER,
    image_count INTEGER,
    images_with_alt INTEGER,
    
    -- Performance Metrics
    page_speed_score INTEGER CHECK (page_speed_score >= 1 AND page_speed_score <= 100),
    mobile_friendly_score INTEGER CHECK (mobile_friendly_score >= 1 AND mobile_friendly_score <= 100),
    
    -- SEO Issues
    seo_issues JSONB DEFAULT '[]', -- Array of SEO issues found
    
    last_crawled_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, url)
);

-- Backlinks tracking
CREATE TABLE IF NOT EXISTS seo_backlinks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source_domain TEXT NOT NULL,
    source_url TEXT NOT NULL,
    target_url TEXT NOT NULL,
    
    -- Link attributes
    anchor_text TEXT,
    link_type VARCHAR(20) DEFAULT 'dofollow' CHECK (link_type IN ('dofollow', 'nofollow')),
    domain_authority INTEGER CHECK (domain_authority >= 1 AND domain_authority <= 100),
    page_authority INTEGER CHECK (page_authority >= 1 AND page_authority <= 100),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'lost', 'broken')),
    first_found DATE NOT NULL DEFAULT CURRENT_DATE,
    last_checked DATE NOT NULL DEFAULT CURRENT_DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_url, target_url)
);

-- Competitor Analysis
CREATE TABLE IF NOT EXISTS seo_competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    competitor_domain TEXT NOT NULL,
    competitor_name TEXT,
    industry_category VARCHAR(100),
    
    -- Metrics
    domain_authority INTEGER,
    estimated_traffic INTEGER,
    backlinks_count INTEGER,
    referring_domains INTEGER,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, competitor_domain)
);

-- Competitor Keywords (keywords competitors rank for)
CREATE TABLE IF NOT EXISTS seo_competitor_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_id UUID NOT NULL REFERENCES seo_competitors(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    rank_position INTEGER,
    search_volume INTEGER,
    difficulty_score INTEGER,
    estimated_traffic INTEGER,
    url TEXT, -- URL that ranks for this keyword
    
    check_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(competitor_id, keyword, check_date)
);

-- SEO Reports and Recommendations
CREATE TABLE IF NOT EXISTS seo_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL, -- 'weekly', 'monthly', 'audit', 'custom'
    report_title TEXT NOT NULL,
    
    -- Report data
    report_period_start DATE,
    report_period_end DATE,
    metrics JSONB DEFAULT '{}', -- Key metrics for the period
    recommendations JSONB DEFAULT '[]', -- Array of recommendations
    improvements JSONB DEFAULT '[]', -- Array of improvements made
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'sent')),
    generated_at TIMESTAMPTZ,
    sent_to TEXT[], -- Email addresses report was sent to
    
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Google Search Console Integration Data
CREATE TABLE IF NOT EXISTS seo_search_console_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Search Console metrics
    date DATE NOT NULL,
    query TEXT NOT NULL, -- Search query
    page TEXT NOT NULL, -- Landing page
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    ctr DECIMAL(5,4) DEFAULT 0, -- Click-through rate
    position DECIMAL(5,2) DEFAULT 0, -- Average position
    
    -- Dimensions
    country VARCHAR(3), -- Country code
    device VARCHAR(20), -- 'desktop', 'mobile', 'tablet'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, date, query, page, country, device)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_seo_keywords_organization_id ON seo_keywords(organization_id);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_keyword ON seo_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_is_active ON seo_keywords(is_active);

CREATE INDEX IF NOT EXISTS idx_seo_keyword_rankings_keyword_id ON seo_keyword_rankings(keyword_id);
CREATE INDEX IF NOT EXISTS idx_seo_keyword_rankings_check_date ON seo_keyword_rankings(check_date);
CREATE INDEX IF NOT EXISTS idx_seo_keyword_rankings_search_engine ON seo_keyword_rankings(search_engine);

CREATE INDEX IF NOT EXISTS idx_seo_pages_organization_id ON seo_pages(organization_id);
CREATE INDEX IF NOT EXISTS idx_seo_pages_url ON seo_pages(url);
CREATE INDEX IF NOT EXISTS idx_seo_pages_page_type ON seo_pages(page_type);

CREATE INDEX IF NOT EXISTS idx_seo_backlinks_organization_id ON seo_backlinks(organization_id);
CREATE INDEX IF NOT EXISTS idx_seo_backlinks_source_domain ON seo_backlinks(source_domain);
CREATE INDEX IF NOT EXISTS idx_seo_backlinks_status ON seo_backlinks(status);

CREATE INDEX IF NOT EXISTS idx_seo_competitors_organization_id ON seo_competitors(organization_id);
CREATE INDEX IF NOT EXISTS idx_seo_competitor_keywords_competitor_id ON seo_competitor_keywords(competitor_id);
CREATE INDEX IF NOT EXISTS idx_seo_competitor_keywords_check_date ON seo_competitor_keywords(check_date);

CREATE INDEX IF NOT EXISTS idx_seo_reports_organization_id ON seo_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_seo_reports_report_type ON seo_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_seo_reports_status ON seo_reports(status);

CREATE INDEX IF NOT EXISTS idx_seo_search_console_organization_id ON seo_search_console_data(organization_id);
CREATE INDEX IF NOT EXISTS idx_seo_search_console_date ON seo_search_console_data(date);
CREATE INDEX IF NOT EXISTS idx_seo_search_console_query ON seo_search_console_data(query);

-- Enable RLS
ALTER TABLE seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_keyword_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_backlinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_competitor_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_search_console_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organization members can manage SEO keywords" ON seo_keywords
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Organization members can view keyword rankings" ON seo_keyword_rankings
    FOR SELECT USING (
        keyword_id IN (
            SELECT id FROM seo_keywords 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Organization members can manage SEO pages" ON seo_pages
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Organization members can manage backlinks" ON seo_backlinks
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Organization members can manage competitors" ON seo_competitors
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Organization members can view competitor keywords" ON seo_competitor_keywords
    FOR SELECT USING (
        competitor_id IN (
            SELECT id FROM seo_competitors 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Organization members can manage SEO reports" ON seo_reports
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Organization members can view search console data" ON seo_search_console_data
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- Functions for SEO analytics (Fixed to use CASE statements instead of FILTER)

-- Function to calculate SEO score for a page
CREATE OR REPLACE FUNCTION calculate_seo_score(p_page_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 100;
    v_page RECORD;
BEGIN
    SELECT * INTO v_page FROM seo_pages WHERE id = p_page_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Deduct points for SEO issues
    IF v_page.title_length IS NULL OR v_page.title_length < 30 OR v_page.title_length > 60 THEN
        v_score := v_score - 15;
    END IF;
    
    IF v_page.meta_description_length IS NULL OR v_page.meta_description_length < 120 OR v_page.meta_description_length > 160 THEN
        v_score := v_score - 10;
    END IF;
    
    IF v_page.h1_tag IS NULL OR LENGTH(v_page.h1_tag) < 10 THEN
        v_score := v_score - 10;
    END IF;
    
    IF v_page.word_count IS NULL OR v_page.word_count < 300 THEN
        v_score := v_score - 15;
    END IF;
    
    IF v_page.images_with_alt IS NULL OR (v_page.image_count > 0 AND v_page.images_with_alt < v_page.image_count) THEN
        v_score := v_score - 10;
    END IF;
    
    IF v_page.page_speed_score IS NOT NULL AND v_page.page_speed_score < 70 THEN
        v_score := v_score - 20;
    END IF;
    
    IF v_page.mobile_friendly_score IS NOT NULL AND v_page.mobile_friendly_score < 80 THEN
        v_score := v_score - 10;
    END IF;
    
    RETURN GREATEST(0, v_score);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get SEO analytics summary (Fixed FILTER syntax)
CREATE OR REPLACE FUNCTION get_seo_analytics_summary(p_organization_id UUID, p_period_days INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
    summary JSON;
    date_from DATE := CURRENT_DATE - INTERVAL '1 day' * p_period_days;
BEGIN
    SELECT json_build_object(
        'total_keywords', COUNT(DISTINCT sk.id),
        'ranking_keywords', COUNT(DISTINCT CASE WHEN sk.current_rank IS NOT NULL AND sk.current_rank <= 100 THEN sk.id END),
        'top_10_keywords', COUNT(DISTINCT CASE WHEN sk.current_rank IS NOT NULL AND sk.current_rank <= 10 THEN sk.id END),
        'avg_ranking', ROUND(AVG(CASE WHEN sk.current_rank IS NOT NULL THEN sk.current_rank END), 2),
        'total_backlinks', COUNT(DISTINCT CASE WHEN sb.status = 'active' THEN sb.id END),
        'total_pages_analyzed', COUNT(DISTINCT sp.id),
        'avg_page_speed', ROUND(AVG(CASE WHEN sp.page_speed_score IS NOT NULL THEN sp.page_speed_score END), 2),
        'search_console_clicks', COALESCE(SUM(CASE WHEN ssc.date >= date_from THEN ssc.clicks ELSE 0 END), 0),
        'search_console_impressions', COALESCE(SUM(CASE WHEN ssc.date >= date_from THEN ssc.impressions ELSE 0 END), 0),
        'avg_ctr', ROUND(AVG(CASE WHEN ssc.date >= date_from AND ssc.ctr > 0 THEN ssc.ctr END) * 100, 2)
    ) INTO summary
    FROM seo_keywords sk
    LEFT JOIN seo_backlinks sb ON sb.organization_id = sk.organization_id
    LEFT JOIN seo_pages sp ON sp.organization_id = sk.organization_id
    LEFT JOIN seo_search_console_data ssc ON ssc.organization_id = sk.organization_id
    WHERE sk.organization_id = p_organization_id AND sk.is_active = true;
    
    RETURN summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track keyword ranking changes
CREATE OR REPLACE FUNCTION track_keyword_ranking_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Log significant ranking changes
    IF OLD.current_rank IS DISTINCT FROM NEW.current_rank THEN
        -- Update the keyword rankings history
        INSERT INTO seo_keyword_rankings (keyword_id, rank_position, check_date)
        VALUES (NEW.id, NEW.current_rank, CURRENT_DATE)
        ON CONFLICT (keyword_id, search_engine, location, device_type, check_date)
        DO UPDATE SET rank_position = NEW.current_rank;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_seo_keyword_ranking_changes
    AFTER UPDATE ON seo_keywords
    FOR EACH ROW
    EXECUTE FUNCTION track_keyword_ranking_change();

-- Standard update triggers
CREATE TRIGGER update_seo_keywords_updated_at BEFORE UPDATE ON seo_keywords
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_pages_updated_at BEFORE UPDATE ON seo_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_backlinks_updated_at BEFORE UPDATE ON seo_backlinks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_competitors_updated_at BEFORE UPDATE ON seo_competitors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_reports_updated_at BEFORE UPDATE ON seo_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON seo_keywords TO authenticated;
GRANT ALL ON seo_keyword_rankings TO authenticated;
GRANT ALL ON seo_pages TO authenticated;
GRANT ALL ON seo_backlinks TO authenticated;
GRANT ALL ON seo_competitors TO authenticated;
GRANT ALL ON seo_competitor_keywords TO authenticated;
GRANT ALL ON seo_reports TO authenticated;
GRANT SELECT ON seo_search_console_data TO authenticated;

GRANT EXECUTE ON FUNCTION calculate_seo_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_seo_analytics_summary(UUID, INTEGER) TO authenticated;

-- Comments
COMMENT ON TABLE seo_keywords IS 'SEO keyword tracking and ranking monitoring';
COMMENT ON TABLE seo_keyword_rankings IS 'Historical ranking data for tracked keywords';
COMMENT ON TABLE seo_pages IS 'Website pages SEO analysis and optimization tracking';
COMMENT ON TABLE seo_backlinks IS 'Backlink profile monitoring and analysis';
COMMENT ON TABLE seo_competitors IS 'Competitor analysis and monitoring';
COMMENT ON TABLE seo_reports IS 'SEO reports and recommendations generation';
COMMENT ON TABLE seo_search_console_data IS 'Google Search Console integration data';