-- WS-223 Content Management System - Team B
-- Migration: Content Management System with Rich Text, Media, Versioning, and Publishing
-- Created: 2025-01-30

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Content Categories Table
CREATE TABLE content_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES content_categories(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  color_hex TEXT DEFAULT '#6366f1',
  icon_name TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_category_slug_per_org UNIQUE(organization_id, slug)
);

-- Content Items Table (Main CMS Content)
CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN (
    'article', 'page', 'email_template', 'form_description', 
    'journey_step', 'newsletter', 'landing_page', 'blog_post',
    'faq', 'legal_document', 'privacy_policy', 'terms_of_service'
  )),
  
  -- Content Fields
  rich_content TEXT, -- HTML/Rich Text content
  plain_content TEXT, -- Plain text version
  excerpt TEXT, -- Short description/summary
  featured_image_url TEXT,
  
  -- Organization and Categorization
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES content_categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  
  -- Publishing Workflow
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'review', 'scheduled', 'published', 'archived'
  )),
  publish_at TIMESTAMPTZ,
  expire_at TIMESTAMPTZ,
  
  -- SEO and Metadata
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  meta_robots TEXT DEFAULT 'index,follow',
  canonical_url TEXT,
  
  -- Versioning
  version INTEGER DEFAULT 1,
  parent_content_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  is_template BOOLEAN DEFAULT FALSE,
  
  -- Analytics and Performance
  view_count INTEGER DEFAULT 0,
  engagement_score DECIMAL(5,2) DEFAULT 0.00,
  last_viewed_at TIMESTAMPTZ,
  
  -- Flexible metadata storage
  metadata JSONB DEFAULT '{}',
  
  -- Content Settings
  allow_comments BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  requires_auth BOOLEAN DEFAULT FALSE,
  access_level TEXT DEFAULT 'public' CHECK (access_level IN (
    'public', 'members', 'premium', 'private'
  )),
  
  -- Audit fields
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_content_slug_per_org UNIQUE(organization_id, slug),
  CONSTRAINT valid_publish_schedule CHECK (
    (status != 'scheduled' AND publish_at IS NULL) OR 
    (status = 'scheduled' AND publish_at IS NOT NULL)
  ),
  CONSTRAINT valid_expiry_date CHECK (
    expire_at IS NULL OR expire_at > publish_at
  )
);

-- Content Versions Table (Version History)
CREATE TABLE content_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  
  -- Versioned Content
  title TEXT NOT NULL,
  rich_content TEXT,
  plain_content TEXT,
  excerpt TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Version Info
  version_note TEXT,
  is_major_version BOOLEAN DEFAULT FALSE,
  change_summary JSONB DEFAULT '{}', -- Track what changed
  
  -- Size and Performance Metrics
  content_size_bytes INTEGER,
  word_count INTEGER,
  reading_time_minutes INTEGER,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_version_per_content UNIQUE(content_id, version_number)
);

-- Content Media Table (Rich Media Assets)
CREATE TABLE content_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  
  -- File Information
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_url TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  file_hash TEXT NOT NULL, -- For deduplication and integrity
  
  -- Media Type Classification
  media_type TEXT NOT NULL CHECK (media_type IN (
    'image', 'video', 'audio', 'document', 'other'
  )),
  
  -- Image-specific metadata
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  caption TEXT,
  
  -- Video/Audio metadata
  duration_seconds INTEGER,
  
  -- Organization and Security
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  security_scan_status TEXT DEFAULT 'pending' CHECK (security_scan_status IN (
    'pending', 'passed', 'failed', 'quarantined'
  )),
  scan_details JSONB DEFAULT '{}',
  
  -- Usage and Performance
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_optimized BOOLEAN DEFAULT FALSE,
  optimization_data JSONB DEFAULT '{}',
  
  -- Audit
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_file_hash_per_org UNIQUE(organization_id, file_hash)
);

-- Content Templates Table (Reusable Content Templates)
CREATE TABLE content_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL,
  
  -- Template Structure
  template_schema JSONB NOT NULL DEFAULT '{}', -- Field definitions
  default_content JSONB DEFAULT '{}', -- Default values
  
  -- Template Settings
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES content_categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  
  -- Usage and Performance
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_premium BOOLEAN DEFAULT FALSE,
  
  -- Template Status
  is_active BOOLEAN DEFAULT TRUE,
  is_system_template BOOLEAN DEFAULT FALSE, -- Built-in templates
  
  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_template_name_per_org UNIQUE(organization_id, name)
);

-- Content Search Index Table (Full-Text Search Optimization)
CREATE TABLE content_search_index (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Search Content
  search_vector tsvector,
  title_vector tsvector,
  content_vector tsvector,
  
  -- Search Metadata
  indexed_at TIMESTAMPTZ DEFAULT NOW(),
  last_search_at TIMESTAMPTZ,
  search_count INTEGER DEFAULT 0,
  
  CONSTRAINT unique_search_index_per_content UNIQUE(content_id)
);

-- Publishing Workflow Table (Content Approval Process)
CREATE TABLE content_workflow (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  
  -- Workflow Status
  workflow_status TEXT NOT NULL DEFAULT 'draft' CHECK (workflow_status IN (
    'draft', 'submitted', 'in_review', 'approved', 'rejected', 'published'
  )),
  
  -- Review Information
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Workflow Actions
  submission_note TEXT,
  review_note TEXT,
  rejection_reason TEXT,
  
  -- Workflow Timestamps
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_content_items_organization_id ON content_items(organization_id);
CREATE INDEX idx_content_items_status ON content_items(status);
CREATE INDEX idx_content_items_content_type ON content_items(content_type);
CREATE INDEX idx_content_items_category_id ON content_items(category_id);
CREATE INDEX idx_content_items_created_at ON content_items(created_at DESC);
CREATE INDEX idx_content_items_updated_at ON content_items(updated_at DESC);
CREATE INDEX idx_content_items_publish_at ON content_items(publish_at);
CREATE INDEX idx_content_items_tags ON content_items USING gin(tags);
CREATE INDEX idx_content_items_slug ON content_items(slug);

CREATE INDEX idx_content_versions_content_id ON content_versions(content_id);
CREATE INDEX idx_content_versions_version_number ON content_versions(content_id, version_number DESC);

CREATE INDEX idx_content_media_organization_id ON content_media(organization_id);
CREATE INDEX idx_content_media_content_id ON content_media(content_id);
CREATE INDEX idx_content_media_media_type ON content_media(media_type);
CREATE INDEX idx_content_media_security_scan_status ON content_media(security_scan_status);

CREATE INDEX idx_content_categories_organization_id ON content_categories(organization_id);
CREATE INDEX idx_content_categories_parent_id ON content_categories(parent_id);

CREATE INDEX idx_content_templates_organization_id ON content_templates(organization_id);
CREATE INDEX idx_content_templates_is_active ON content_templates(is_active);

CREATE INDEX idx_content_search_vector ON content_search_index USING gin(search_vector);
CREATE INDEX idx_content_search_title_vector ON content_search_index USING gin(title_vector);
CREATE INDEX idx_content_search_content_vector ON content_search_index USING gin(content_vector);
CREATE INDEX idx_content_search_organization_id ON content_search_index(organization_id);

CREATE INDEX idx_content_workflow_content_id ON content_workflow(content_id);
CREATE INDEX idx_content_workflow_status ON content_workflow(workflow_status);

-- Full-text search triggers
CREATE OR REPLACE FUNCTION update_content_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the search index when content changes
  INSERT INTO content_search_index (content_id, organization_id, search_vector, title_vector, content_vector)
  VALUES (
    NEW.id,
    NEW.organization_id,
    to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.plain_content, '') || ' ' || array_to_string(NEW.tags, ' ')),
    to_tsvector('english', COALESCE(NEW.title, '')),
    to_tsvector('english', COALESCE(NEW.plain_content, ''))
  )
  ON CONFLICT (content_id) DO UPDATE SET
    search_vector = EXCLUDED.search_vector,
    title_vector = EXCLUDED.title_vector,
    content_vector = EXCLUDED.content_vector,
    indexed_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_content_search_vector
  AFTER INSERT OR UPDATE OF title, plain_content, tags
  ON content_items
  FOR EACH ROW
  EXECUTE FUNCTION update_content_search_vector();

-- Auto-update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_content_items_updated_at
  BEFORE UPDATE ON content_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_content_categories_updated_at
  BEFORE UPDATE ON content_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_content_media_updated_at
  BEFORE UPDATE ON content_media
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_content_templates_updated_at
  BEFORE UPDATE ON content_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_content_workflow_updated_at
  BEFORE UPDATE ON content_workflow
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_workflow ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_categories
CREATE POLICY "Users can view their organization's content categories"
  ON content_categories FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage their organization's content categories"
  ON content_categories FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

-- RLS Policies for content_items
CREATE POLICY "Users can view their organization's content"
  ON content_items FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ) AND 
    (status = 'published' OR created_by = auth.uid() OR 
     organization_id IN (
       SELECT organization_id FROM user_profiles 
       WHERE id = auth.uid() AND role IN ('admin', 'editor')
     ))
  );

CREATE POLICY "Users can create content for their organization"
  ON content_items FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their own content or if admin/editor"
  ON content_items FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ) AND 
    (created_by = auth.uid() OR 
     organization_id IN (
       SELECT organization_id FROM user_profiles 
       WHERE id = auth.uid() AND role IN ('admin', 'editor')
     ))
  );

-- RLS Policies for content_versions
CREATE POLICY "Users can view versions of accessible content"
  ON content_versions FOR SELECT
  USING (content_id IN (
    SELECT id FROM content_items WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can create versions for accessible content"
  ON content_versions FOR INSERT
  WITH CHECK (content_id IN (
    SELECT id FROM content_items WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

-- RLS Policies for content_media
CREATE POLICY "Users can view their organization's content media"
  ON content_media FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage their organization's content media"
  ON content_media FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

-- RLS Policies for content_templates
CREATE POLICY "Users can view their organization's content templates"
  ON content_templates FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ) OR is_system_template = true);

CREATE POLICY "Users can manage their organization's content templates"
  ON content_templates FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ) AND is_system_template = false);

-- RLS Policies for content_search_index
CREATE POLICY "Users can view search index for their organization's content"
  ON content_search_index FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "System can manage search index"
  ON content_search_index FOR ALL
  USING (true); -- System-level operations

-- RLS Policies for content_workflow
CREATE POLICY "Users can view workflow for accessible content"
  ON content_workflow FOR SELECT
  USING (content_id IN (
    SELECT id FROM content_items WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage workflow for accessible content"
  ON content_workflow FOR ALL
  USING (content_id IN (
    SELECT id FROM content_items WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

-- Insert some default content categories
INSERT INTO content_categories (name, slug, description, color_hex, icon_name, sort_order, is_active, organization_id) VALUES
  ('General', 'general', 'General content and pages', '#6366f1', 'document', 1, true, '00000000-0000-0000-0000-000000000000'),
  ('Wedding Planning', 'wedding-planning', 'Wedding planning guides and resources', '#ec4899', 'heart', 2, true, '00000000-0000-0000-0000-000000000000'),
  ('Vendor Resources', 'vendor-resources', 'Resources for wedding vendors', '#10b981', 'briefcase', 3, true, '00000000-0000-0000-0000-000000000000'),
  ('Client Communication', 'client-communication', 'Templates for client communication', '#f59e0b', 'mail', 4, true, '00000000-0000-0000-0000-000000000000'),
  ('Legal & Compliance', 'legal-compliance', 'Legal documents and compliance materials', '#dc2626', 'shield', 5, true, '00000000-0000-0000-0000-000000000000')
ON CONFLICT DO NOTHING;

-- Insert some default content templates
INSERT INTO content_templates (name, description, content_type, template_schema, default_content, is_system_template, organization_id) VALUES
  (
    'Welcome Email Template',
    'Standard welcome email template for new clients',
    'email_template',
    '{"fields": [{"name": "client_name", "type": "text", "required": true}, {"name": "vendor_name", "type": "text", "required": true}, {"name": "services", "type": "array", "required": false}]}',
    '{"subject": "Welcome to {{vendor_name}}!", "content": "Dear {{client_name}},\n\nWelcome to our wedding services! We are excited to be part of your special day.\n\nBest regards,\n{{vendor_name}} Team"}',
    true,
    '00000000-0000-0000-0000-000000000000'
  ),
  (
    'Wedding Planning Checklist',
    'Comprehensive wedding planning checklist template',
    'article',
    '{"fields": [{"name": "timeline", "type": "select", "options": ["6_months", "9_months", "12_months"]}, {"name": "budget_range", "type": "select", "options": ["under_10k", "10k_25k", "25k_50k", "over_50k"]}]}',
    '{"title": "Wedding Planning Checklist", "content": "<h2>Your Wedding Planning Journey</h2><p>Planning a wedding can be overwhelming, but with the right checklist, you can stay organized and enjoy the process.</p>"}',
    true,
    '00000000-0000-0000-0000-000000000000'
  )
ON CONFLICT DO NOTHING;

-- Create stored procedure for content publishing
CREATE OR REPLACE FUNCTION publish_content(content_uuid UUID, publish_datetime TIMESTAMPTZ DEFAULT NOW())
RETURNS BOOLEAN AS $$
DECLARE
  content_record RECORD;
BEGIN
  -- Get content record
  SELECT * INTO content_record FROM content_items WHERE id = content_uuid;
  
  IF content_record IS NULL THEN
    RAISE EXCEPTION 'Content not found';
  END IF;
  
  -- Update content status and publish timestamp
  UPDATE content_items 
  SET 
    status = 'published',
    publish_at = publish_datetime,
    updated_at = NOW()
  WHERE id = content_uuid;
  
  -- Update workflow status
  INSERT INTO content_workflow (content_id, workflow_status, published_at)
  VALUES (content_uuid, 'published', publish_datetime)
  ON CONFLICT (content_id) DO UPDATE SET
    workflow_status = 'published',
    published_at = publish_datetime,
    updated_at = NOW();
    
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create stored procedure for content search
CREATE OR REPLACE FUNCTION search_content(
  org_uuid UUID,
  search_query TEXT,
  content_types TEXT[] DEFAULT NULL,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  slug TEXT,
  content_type TEXT,
  excerpt TEXT,
  rank REAL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.id,
    ci.title,
    ci.slug,
    ci.content_type,
    ci.excerpt,
    ts_rank(csi.search_vector, plainto_tsquery('english', search_query)) as rank,
    ci.created_at,
    ci.updated_at
  FROM content_items ci
  JOIN content_search_index csi ON ci.id = csi.content_id
  WHERE 
    ci.organization_id = org_uuid
    AND ci.status = 'published'
    AND (content_types IS NULL OR ci.content_type = ANY(content_types))
    AND csi.search_vector @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC, ci.updated_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE content_categories IS 'Hierarchical categorization system for content organization';
COMMENT ON TABLE content_items IS 'Main content storage with versioning, workflow, and rich metadata';
COMMENT ON TABLE content_versions IS 'Complete version history for content items with change tracking';
COMMENT ON TABLE content_media IS 'Secure media asset management with optimization and security scanning';
COMMENT ON TABLE content_templates IS 'Reusable content templates with schema definition';
COMMENT ON TABLE content_search_index IS 'Full-text search optimization with PostgreSQL tsvector';
COMMENT ON TABLE content_workflow IS 'Content approval and publishing workflow management';

-- Migration complete
SELECT 'WS-223 Content Management System migration completed successfully' AS status;