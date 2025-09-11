-- WS-119: Portfolio Management System
-- Comprehensive portfolio management for wedding suppliers
-- Team B Batch 9 Round 2

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Portfolio Projects Table
CREATE TABLE IF NOT EXISTS portfolio_projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(100), -- wedding, engagement, corporate, etc.
    event_date DATE,
    location VARCHAR(255),
    client_name VARCHAR(255), -- for display purposes (e.g., "Sarah & John")
    featured BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'published', -- draft, published, archived
    cover_image_id UUID, -- references portfolio_media
    view_count INTEGER DEFAULT 0,
    tags TEXT[], -- array of tags
    metadata JSONB DEFAULT '{}', -- flexible metadata storage
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE(vendor_id, slug)
);

-- Portfolio Media Table (images, videos)
CREATE TABLE IF NOT EXISTS portfolio_media (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    media_type VARCHAR(50) NOT NULL, -- image, video, panorama
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    title VARCHAR(255),
    caption TEXT,
    alt_text VARCHAR(255),
    file_size BIGINT, -- in bytes
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- for videos, in seconds
    mime_type VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    is_cover BOOLEAN DEFAULT false,
    tags TEXT[],
    metadata JSONB DEFAULT '{}', -- EXIF data, video metadata, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

-- Portfolio Testimonials Table
CREATE TABLE IF NOT EXISTS portfolio_testimonials (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES portfolio_projects(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL,
    client_role VARCHAR(100), -- bride, groom, parent, etc.
    testimonial_text TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    avatar_url TEXT,
    event_date DATE,
    featured BOOLEAN DEFAULT false,
    verified BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

-- Portfolio Gallery Layouts Table
CREATE TABLE IF NOT EXISTS portfolio_gallery_layouts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    layout_type VARCHAR(50) NOT NULL, -- grid, masonry, carousel, slideshow, timeline
    configuration JSONB NOT NULL DEFAULT '{}', -- layout-specific settings
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

-- Portfolio Collections (for grouping projects)
CREATE TABLE IF NOT EXISTS portfolio_collections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE(vendor_id, slug)
);

-- Portfolio Project Collections Junction Table
CREATE TABLE IF NOT EXISTS portfolio_project_collections (
    project_id UUID NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES portfolio_collections(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (project_id, collection_id)
);

-- Portfolio Analytics Table
CREATE TABLE IF NOT EXISTS portfolio_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    project_id UUID REFERENCES portfolio_projects(id) ON DELETE CASCADE,
    media_id UUID REFERENCES portfolio_media(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- view, click, share, download
    visitor_id VARCHAR(255), -- anonymous visitor tracking
    referrer TEXT,
    user_agent TEXT,
    ip_hash VARCHAR(64), -- hashed IP for privacy
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

-- Portfolio Settings Table
CREATE TABLE IF NOT EXISTS portfolio_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    watermark_enabled BOOLEAN DEFAULT false,
    watermark_text VARCHAR(255),
    watermark_logo_url TEXT,
    watermark_position VARCHAR(50), -- top-left, top-right, bottom-left, bottom-right, center
    watermark_opacity DECIMAL(3,2) DEFAULT 0.5,
    download_enabled BOOLEAN DEFAULT false,
    right_click_disabled BOOLEAN DEFAULT false,
    social_sharing_enabled BOOLEAN DEFAULT true,
    lazy_loading_enabled BOOLEAN DEFAULT true,
    image_optimization_enabled BOOLEAN DEFAULT true,
    max_upload_size_mb INTEGER DEFAULT 50,
    allowed_file_types TEXT[] DEFAULT ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'],
    cdn_enabled BOOLEAN DEFAULT false,
    cdn_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE(vendor_id)
);

-- Indexes for performance
CREATE INDEX idx_portfolio_projects_vendor_id ON portfolio_projects(vendor_id);
CREATE INDEX idx_portfolio_projects_status ON portfolio_projects(status);
CREATE INDEX idx_portfolio_projects_featured ON portfolio_projects(featured);
CREATE INDEX idx_portfolio_projects_event_date ON portfolio_projects(event_date);
CREATE INDEX idx_portfolio_projects_tags ON portfolio_projects USING GIN (tags);

CREATE INDEX idx_portfolio_media_project_id ON portfolio_media(project_id);
CREATE INDEX idx_portfolio_media_vendor_id ON portfolio_media(vendor_id);
CREATE INDEX idx_portfolio_media_media_type ON portfolio_media(media_type);
CREATE INDEX idx_portfolio_media_display_order ON portfolio_media(display_order);

CREATE INDEX idx_portfolio_testimonials_vendor_id ON portfolio_testimonials(vendor_id);
CREATE INDEX idx_portfolio_testimonials_project_id ON portfolio_testimonials(project_id);
CREATE INDEX idx_portfolio_testimonials_featured ON portfolio_testimonials(featured);

CREATE INDEX idx_portfolio_analytics_vendor_id ON portfolio_analytics(vendor_id);
CREATE INDEX idx_portfolio_analytics_project_id ON portfolio_analytics(project_id);
CREATE INDEX idx_portfolio_analytics_event_type ON portfolio_analytics(event_type);
CREATE INDEX idx_portfolio_analytics_created_at ON portfolio_analytics(created_at);

-- Row Level Security (RLS)
ALTER TABLE portfolio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_gallery_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_project_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portfolio_projects
CREATE POLICY "Users can view published portfolio projects"
    ON portfolio_projects FOR SELECT
    USING (status = 'published' OR auth.uid() IN (
        SELECT user_id FROM user_profiles WHERE organization_id = portfolio_projects.organization_id
    ));

CREATE POLICY "Organization members can manage their portfolio projects"
    ON portfolio_projects FOR ALL
    USING (auth.uid() IN (
        SELECT user_id FROM user_profiles WHERE organization_id = portfolio_projects.organization_id
    ));

-- RLS Policies for portfolio_media
CREATE POLICY "Users can view portfolio media"
    ON portfolio_media FOR SELECT
    USING (
        project_id IN (SELECT id FROM portfolio_projects WHERE status = 'published')
        OR auth.uid() IN (
            SELECT user_id FROM user_profiles WHERE organization_id = portfolio_media.organization_id
        )
    );

CREATE POLICY "Organization members can manage their portfolio media"
    ON portfolio_media FOR ALL
    USING (auth.uid() IN (
        SELECT user_id FROM user_profiles WHERE organization_id = portfolio_media.organization_id
    ));

-- RLS Policies for portfolio_testimonials
CREATE POLICY "Users can view testimonials"
    ON portfolio_testimonials FOR SELECT
    USING (true);

CREATE POLICY "Organization members can manage their testimonials"
    ON portfolio_testimonials FOR ALL
    USING (auth.uid() IN (
        SELECT user_id FROM user_profiles WHERE organization_id = portfolio_testimonials.organization_id
    ));

-- RLS Policies for portfolio_gallery_layouts
CREATE POLICY "Organization members can manage their gallery layouts"
    ON portfolio_gallery_layouts FOR ALL
    USING (auth.uid() IN (
        SELECT user_id FROM user_profiles WHERE organization_id = portfolio_gallery_layouts.organization_id
    ));

-- RLS Policies for portfolio_collections
CREATE POLICY "Users can view public collections"
    ON portfolio_collections FOR SELECT
    USING (is_public = true OR auth.uid() IN (
        SELECT user_id FROM user_profiles WHERE organization_id = portfolio_collections.organization_id
    ));

CREATE POLICY "Organization members can manage their collections"
    ON portfolio_collections FOR ALL
    USING (auth.uid() IN (
        SELECT user_id FROM user_profiles WHERE organization_id = portfolio_collections.organization_id
    ));

-- RLS Policies for portfolio_analytics
CREATE POLICY "Organization members can view their analytics"
    ON portfolio_analytics FOR SELECT
    USING (auth.uid() IN (
        SELECT user_id FROM user_profiles WHERE organization_id = portfolio_analytics.organization_id
    ));

CREATE POLICY "System can insert analytics"
    ON portfolio_analytics FOR INSERT
    USING (true);

-- RLS Policies for portfolio_settings
CREATE POLICY "Organization members can manage their portfolio settings"
    ON portfolio_settings FOR ALL
    USING (auth.uid() IN (
        SELECT user_id FROM user_profiles WHERE organization_id = portfolio_settings.organization_id
    ));

-- Functions for portfolio management

-- Function to generate slug from title
CREATE OR REPLACE FUNCTION generate_portfolio_slug(title TEXT, vendor_id UUID)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Generate base slug from title
    base_slug := lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    
    final_slug := base_slug;
    
    -- Check for uniqueness and add counter if needed
    WHILE EXISTS (SELECT 1 FROM portfolio_projects WHERE slug = final_slug AND portfolio_projects.vendor_id = generate_portfolio_slug.vendor_id) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to track portfolio views
CREATE OR REPLACE FUNCTION track_portfolio_view(
    p_vendor_id UUID,
    p_project_id UUID DEFAULT NULL,
    p_media_id UUID DEFAULT NULL,
    p_visitor_id VARCHAR DEFAULT NULL,
    p_referrer TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Insert analytics record
    INSERT INTO portfolio_analytics (
        vendor_id,
        project_id,
        media_id,
        event_type,
        visitor_id,
        referrer,
        organization_id
    )
    SELECT 
        p_vendor_id,
        p_project_id,
        p_media_id,
        'view',
        p_visitor_id,
        p_referrer,
        organization_id
    FROM vendors
    WHERE id = p_vendor_id;
    
    -- Update view count if project_id is provided
    IF p_project_id IS NOT NULL THEN
        UPDATE portfolio_projects
        SET view_count = view_count + 1
        WHERE id = p_project_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get portfolio statistics
CREATE OR REPLACE FUNCTION get_portfolio_stats(p_vendor_id UUID)
RETURNS TABLE (
    total_projects BIGINT,
    total_media BIGINT,
    total_views BIGINT,
    total_testimonials BIGINT,
    avg_rating NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT pp.id) as total_projects,
        COUNT(DISTINCT pm.id) as total_media,
        COALESCE(SUM(pp.view_count), 0) as total_views,
        COUNT(DISTINCT pt.id) as total_testimonials,
        AVG(pt.rating)::NUMERIC(3,2) as avg_rating
    FROM vendors v
    LEFT JOIN portfolio_projects pp ON v.id = pp.vendor_id
    LEFT JOIN portfolio_media pm ON v.id = pm.vendor_id
    LEFT JOIN portfolio_testimonials pt ON v.id = pt.vendor_id
    WHERE v.id = p_vendor_id
    GROUP BY v.id;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_portfolio_projects_updated_at
    BEFORE UPDATE ON portfolio_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_media_updated_at
    BEFORE UPDATE ON portfolio_media
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_testimonials_updated_at
    BEFORE UPDATE ON portfolio_testimonials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_gallery_layouts_updated_at
    BEFORE UPDATE ON portfolio_gallery_layouts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_collections_updated_at
    BEFORE UPDATE ON portfolio_collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_settings_updated_at
    BEFORE UPDATE ON portfolio_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();