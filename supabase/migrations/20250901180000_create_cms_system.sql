-- CMS System Migration - High Performance Content Management
-- WS-223: Content Management System with Mobile Optimization

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CMS Content Table
CREATE TABLE cms_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('page', 'blog', 'template', 'snippet')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    meta_title TEXT,
    meta_description TEXT,
    featured_image TEXT,
    tags TEXT[],
    author_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1,
    seo_score INTEGER,
    mobile_optimized BOOLEAN NOT NULL DEFAULT true,
    
    -- Performance optimization
    content_tsvector TSVECTOR,
    
    -- Constraints
    UNIQUE(organization_id, slug),
    CHECK (seo_score >= 0 AND seo_score <= 100)
);

-- CMS Media Table
CREATE TABLE cms_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size BIGINT NOT NULL,
    width INTEGER,
    height INTEGER,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    compressed_url TEXT,
    alt_text TEXT,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    compression_ratio DECIMAL(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Performance constraints
    CHECK (size > 0),
    CHECK (compression_ratio >= 0 AND compression_ratio <= 100)
);

-- CMS Cache Table
CREATE TABLE cms_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL,
    content_id UUID REFERENCES cms_content(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    hit_count INTEGER NOT NULL DEFAULT 0,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(organization_id, key),
    CHECK (hit_count >= 0)
);

-- CMS Performance Metrics Table
CREATE TABLE cms_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type TEXT NOT NULL CHECK (metric_type IN ('upload_time', 'compression_ratio', 'cache_hit_rate', 'load_time', 'mobile_score')),
    value DECIMAL(10,3) NOT NULL,
    metadata JSONB,
    content_id UUID REFERENCES cms_content(id) ON DELETE CASCADE,
    media_id UUID REFERENCES cms_media(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Performance constraints
    CHECK (value >= 0)
);

-- Performance Indexes
CREATE INDEX idx_cms_content_organization ON cms_content(organization_id);
CREATE INDEX idx_cms_content_slug ON cms_content(organization_id, slug);
CREATE INDEX idx_cms_content_status ON cms_content(status);
CREATE INDEX idx_cms_content_type ON cms_content(content_type);
CREATE INDEX idx_cms_content_published_at ON cms_content(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX idx_cms_content_mobile ON cms_content(mobile_optimized);
CREATE INDEX idx_cms_content_search ON cms_content USING gin(content_tsvector);
CREATE INDEX idx_cms_content_tags ON cms_content USING gin(tags);

CREATE INDEX idx_cms_media_organization ON cms_media(organization_id);
CREATE INDEX idx_cms_media_mime_type ON cms_media(mime_type);
CREATE INDEX idx_cms_media_size ON cms_media(size);
CREATE INDEX idx_cms_media_created_at ON cms_media(created_at);

CREATE INDEX idx_cms_cache_key ON cms_cache(organization_id, key);
CREATE INDEX idx_cms_cache_expires ON cms_cache(expires_at);
CREATE INDEX idx_cms_cache_content ON cms_cache(content_id) WHERE content_id IS NOT NULL;

CREATE INDEX idx_cms_performance_type ON cms_performance_metrics(metric_type);
CREATE INDEX idx_cms_performance_organization ON cms_performance_metrics(organization_id);
CREATE INDEX idx_cms_performance_created_at ON cms_performance_metrics(created_at);
CREATE INDEX idx_cms_performance_content ON cms_performance_metrics(content_id) WHERE content_id IS NOT NULL;
CREATE INDEX idx_cms_performance_media ON cms_performance_metrics(media_id) WHERE media_id IS NOT NULL;

-- Full-text search trigger for content
CREATE OR REPLACE FUNCTION update_cms_content_search()
RETURNS TRIGGER AS $$
BEGIN
    NEW.content_tsvector = to_tsvector('english', 
        COALESCE(NEW.title, '') || ' ' || 
        COALESCE(NEW.content, '') || ' ' || 
        COALESCE(NEW.meta_title, '') || ' ' || 
        COALESCE(NEW.meta_description, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cms_content_search_trigger
    BEFORE INSERT OR UPDATE ON cms_content
    FOR EACH ROW
    EXECUTE FUNCTION update_cms_content_search();

-- Updated timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cms_content_updated_at
    BEFORE UPDATE ON cms_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cms_media_updated_at
    BEFORE UPDATE ON cms_media
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cms_cache_updated_at
    BEFORE UPDATE ON cms_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Cache cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM cms_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Performance analytics functions
CREATE OR REPLACE FUNCTION get_cms_performance_summary(org_id UUID, metric_type_param TEXT DEFAULT NULL)
RETURNS TABLE (
    metric_type TEXT,
    avg_value DECIMAL,
    min_value DECIMAL,
    max_value DECIMAL,
    count_records BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.metric_type,
        AVG(m.value)::DECIMAL(10,3) as avg_value,
        MIN(m.value)::DECIMAL(10,3) as min_value,
        MAX(m.value)::DECIMAL(10,3) as max_value,
        COUNT(*)::BIGINT as count_records
    FROM cms_performance_metrics m
    WHERE m.organization_id = org_id
    AND (metric_type_param IS NULL OR m.metric_type = metric_type_param)
    AND m.created_at > NOW() - INTERVAL '30 days'
    GROUP BY m.metric_type
    ORDER BY m.metric_type;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS)
ALTER TABLE cms_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can access their organization's content" ON cms_content
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can access their organization's media" ON cms_media
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can access their organization's cache" ON cms_cache
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can access their organization's metrics" ON cms_performance_metrics
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Comments for documentation
COMMENT ON TABLE cms_content IS 'High-performance content storage with mobile optimization and full-text search';
COMMENT ON TABLE cms_media IS 'Optimized media storage with compression tracking and multiple format support';
COMMENT ON TABLE cms_cache IS 'Intelligent caching system for content delivery optimization';
COMMENT ON TABLE cms_performance_metrics IS 'Performance monitoring and analytics for CMS operations';

COMMENT ON COLUMN cms_content.mobile_optimized IS 'Indicates if content is optimized for mobile devices';
COMMENT ON COLUMN cms_content.content_tsvector IS 'Full-text search vector for fast content searching';
COMMENT ON COLUMN cms_media.compression_ratio IS 'Percentage reduction in file size after compression';
COMMENT ON COLUMN cms_cache.hit_count IS 'Number of times this cache entry has been accessed';
COMMENT ON COLUMN cms_performance_metrics.value IS 'Numeric value of the performance metric';