-- =============================================
-- Photo Gallery System Migration
-- Feature: WS-079 - Photo Gallery & Sharing
-- Team: C, Batch: 6, Round: 1
-- =============================================

-- Create photo storage buckets table for organizing photos
CREATE TABLE photo_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    bucket_type VARCHAR(50) NOT NULL DEFAULT 'general', -- 'engagement', 'venue', 'styling', 'general'
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES user_profiles(id),
    CONSTRAINT valid_bucket_type CHECK (bucket_type IN ('engagement', 'venue', 'styling', 'general', 'portfolio'))
);

-- Create photo albums table for categorizing photos within buckets
CREATE TABLE photo_albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    bucket_id UUID REFERENCES photo_buckets(id) ON DELETE CASCADE,
    cover_photo_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    event_date DATE,
    location VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES user_profiles(id)
);

-- Create photos table for individual photos
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID REFERENCES photo_albums(id) ON DELETE CASCADE,
    bucket_id UUID REFERENCES photo_buckets(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- File information
    filename VARCHAR(500) NOT NULL,
    original_filename VARCHAR(500),
    file_path TEXT NOT NULL, -- Supabase storage path
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    
    -- Optimization data
    thumbnail_path TEXT, -- Small thumbnail (150x150)
    preview_path TEXT,   -- Medium preview (800x600)
    optimized_path TEXT, -- Optimized full size
    compression_ratio DECIMAL(5,2), -- Percentage compressed
    
    -- Photo metadata
    title VARCHAR(500),
    description TEXT,
    alt_text VARCHAR(500),
    photographer_credit VARCHAR(255),
    taken_at TIMESTAMPTZ,
    location VARCHAR(255),
    
    -- Organization
    sort_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    approval_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    
    -- Tracking
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    uploaded_by UUID REFERENCES user_profiles(id),
    approved_by UUID REFERENCES user_profiles(id),
    
    CONSTRAINT valid_approval_status CHECK (approval_status IN ('pending', 'approved', 'rejected'))
);

-- Create photo sharing permissions table for vendor-specific access
CREATE TABLE photo_sharing_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    album_id UUID REFERENCES photo_albums(id) ON DELETE CASCADE,
    bucket_id UUID REFERENCES photo_buckets(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Permission details
    shared_with_user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    shared_with_vendor_type VARCHAR(100), -- 'photographer', 'florist', 'venue', 'caterer', etc.
    permission_level VARCHAR(50) NOT NULL DEFAULT 'view', -- 'view', 'download', 'edit', 'share'
    
    -- Access control
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    can_reshare BOOLEAN DEFAULT false,
    
    -- Tracking
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    shared_by UUID REFERENCES user_profiles(id),
    
    CONSTRAINT valid_permission_level CHECK (permission_level IN ('view', 'download', 'edit', 'share')),
    CONSTRAINT valid_vendor_type CHECK (shared_with_vendor_type IN (
        'photographer', 'videographer', 'florist', 'venue', 'caterer', 
        'dj', 'band', 'officiant', 'planner', 'decorator', 'baker', 'other'
    ))
);

-- Create photo tags table for categorization
CREATE TABLE photo_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1', -- Hex color code
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES user_profiles(id)
);

-- Create photo_tag_assignments junction table
CREATE TABLE photo_tag_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES photo_tags(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    assigned_by UUID REFERENCES user_profiles(id),
    UNIQUE(photo_id, tag_id)
);

-- Create photo comments table for collaboration
CREATE TABLE photo_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    parent_comment_id UUID REFERENCES photo_comments(id) ON DELETE CASCADE,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create photo access logs for security tracking
CREATE TABLE photo_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'view', 'download', 'share', 'upload', 'delete'
    ip_address INET,
    user_agent TEXT,
    accessed_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_action CHECK (action IN ('view', 'download', 'share', 'upload', 'delete', 'edit'))
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Bucket indexes
CREATE INDEX idx_photo_buckets_client_id ON photo_buckets(client_id);
CREATE INDEX idx_photo_buckets_vendor_id ON photo_buckets(vendor_id);
CREATE INDEX idx_photo_buckets_organization_id ON photo_buckets(organization_id);
CREATE INDEX idx_photo_buckets_type ON photo_buckets(bucket_type);

-- Album indexes  
CREATE INDEX idx_photo_albums_bucket_id ON photo_albums(bucket_id);
CREATE INDEX idx_photo_albums_event_date ON photo_albums(event_date);
CREATE INDEX idx_photo_albums_featured ON photo_albums(is_featured);

-- Photo indexes
CREATE INDEX idx_photos_album_id ON photos(album_id);
CREATE INDEX idx_photos_bucket_id ON photos(bucket_id);
CREATE INDEX idx_photos_organization_id ON photos(organization_id);
CREATE INDEX idx_photos_uploaded_by ON photos(uploaded_by);
CREATE INDEX idx_photos_approval_status ON photos(approval_status);
CREATE INDEX idx_photos_featured ON photos(is_featured);
CREATE INDEX idx_photos_taken_at ON photos(taken_at);
CREATE INDEX idx_photos_created_at ON photos(created_at);

-- Permission indexes
CREATE INDEX idx_photo_sharing_permissions_photo_id ON photo_sharing_permissions(photo_id);
CREATE INDEX idx_photo_sharing_permissions_user_id ON photo_sharing_permissions(shared_with_user_id);
CREATE INDEX idx_photo_sharing_permissions_vendor_type ON photo_sharing_permissions(shared_with_vendor_type);
CREATE INDEX idx_photo_sharing_permissions_active ON photo_sharing_permissions(is_active);
CREATE INDEX idx_photo_sharing_permissions_expires_at ON photo_sharing_permissions(expires_at);

-- Tag indexes
CREATE INDEX idx_photo_tags_organization_id ON photo_tags(organization_id);
CREATE INDEX idx_photo_tag_assignments_photo_id ON photo_tag_assignments(photo_id);
CREATE INDEX idx_photo_tag_assignments_tag_id ON photo_tag_assignments(tag_id);

-- Comment indexes
CREATE INDEX idx_photo_comments_photo_id ON photo_comments(photo_id);
CREATE INDEX idx_photo_comments_author_id ON photo_comments(author_id);
CREATE INDEX idx_photo_comments_parent_id ON photo_comments(parent_comment_id);

-- Access log indexes  
CREATE INDEX idx_photo_access_logs_photo_id ON photo_access_logs(photo_id);
CREATE INDEX idx_photo_access_logs_user_id ON photo_access_logs(user_id);
CREATE INDEX idx_photo_access_logs_action ON photo_access_logs(action);
CREATE INDEX idx_photo_access_logs_accessed_at ON photo_access_logs(accessed_at);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE photo_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_sharing_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_access_logs ENABLE ROW LEVEL SECURITY;

-- Photo buckets policies
CREATE POLICY "Users can view buckets in their organization" ON photo_buckets
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create buckets in their organization" ON photo_buckets
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update buckets they created or are admin" ON photo_buckets
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND organization_id = photo_buckets.organization_id
            AND role IN ('admin', 'owner')
        )
    );

-- Photos policies
CREATE POLICY "Users can view photos in their organization or shared with them" ON photos
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        ) OR
        id IN (
            SELECT photo_id FROM photo_sharing_permissions 
            WHERE shared_with_user_id = auth.uid() 
            AND is_active = true 
            AND (expires_at IS NULL OR expires_at > now())
        )
    );

CREATE POLICY "Users can insert photos in their organization" ON photos
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own photos or approved photos in organization" ON photos
    FOR UPDATE USING (
        uploaded_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND organization_id = photos.organization_id
            AND role IN ('admin', 'owner')
        )
    );

-- Photo sharing permissions policies
CREATE POLICY "Users can view sharing permissions for their photos or organization" ON photo_sharing_permissions
    FOR SELECT USING (
        shared_with_user_id = auth.uid() OR
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create sharing permissions for their organization" ON photo_sharing_permissions
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Photo comments policies
CREATE POLICY "Users can view comments on photos they can access" ON photo_comments
    FOR SELECT USING (
        photo_id IN (
            SELECT id FROM photos 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE id = auth.uid()
            ) OR
            id IN (
                SELECT photo_id FROM photo_sharing_permissions 
                WHERE shared_with_user_id = auth.uid() 
                AND is_active = true
            )
        )
    );

CREATE POLICY "Users can create comments on photos they can access" ON photo_comments
    FOR INSERT WITH CHECK (
        author_id = auth.uid() AND
        photo_id IN (
            SELECT id FROM photos 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE id = auth.uid()
            ) OR
            id IN (
                SELECT photo_id FROM photo_sharing_permissions 
                WHERE shared_with_user_id = auth.uid() 
                AND is_active = true
            )
        )
    );

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to relevant tables
CREATE TRIGGER update_photo_buckets_updated_at BEFORE UPDATE ON photo_buckets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photo_albums_updated_at BEFORE UPDATE ON photo_albums 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON photos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photo_sharing_permissions_updated_at BEFORE UPDATE ON photo_sharing_permissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photo_comments_updated_at BEFORE UPDATE ON photo_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log photo access
CREATE OR REPLACE FUNCTION log_photo_access(
    p_photo_id UUID,
    p_action VARCHAR(50),
    p_user_id UUID DEFAULT auth.uid(),
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO photo_access_logs (photo_id, user_id, action, ip_address, user_agent, organization_id)
    SELECT p_photo_id, p_user_id, p_action, p_ip_address, p_user_agent, p.organization_id
    FROM photos p WHERE p.id = p_photo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update tag usage count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE photo_tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE photo_tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tag_usage_on_assignment AFTER INSERT OR DELETE ON photo_tag_assignments
    FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default photo tags
INSERT INTO photo_tags (name, description, color) VALUES
('engagement', 'Engagement photos and sessions', '#ff6b9d'),
('venue', 'Venue and location photos', '#4ecdc4'),
('styling', 'Hair, makeup, and styling photos', '#ffe66d'),
('flowers', 'Floral arrangements and bouquets', '#a8e6cf'),
('food', 'Catering and food photos', '#ffb3ba'),
('decor', 'Decorations and setup photos', '#c7ceea'),
('portraits', 'Portrait and family photos', '#ffd93d'),
('ceremony', 'Wedding ceremony photos', '#6bcf7f'),
('reception', 'Reception and party photos', '#ff8b94'),
('details', 'Rings, dress, and detail shots', '#b8b8ff');

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for photos with sharing info
CREATE VIEW photos_with_sharing AS
SELECT 
    p.*,
    pb.name as bucket_name,
    pa.name as album_name,
    array_agg(DISTINCT pt.name) FILTER (WHERE pt.name IS NOT NULL) as tags,
    array_agg(DISTINCT psp.shared_with_vendor_type) FILTER (WHERE psp.shared_with_vendor_type IS NOT NULL) as shared_with_vendor_types,
    COUNT(DISTINCT pc.id) as comment_count
FROM photos p
LEFT JOIN photo_buckets pb ON p.bucket_id = pb.id
LEFT JOIN photo_albums pa ON p.album_id = pa.id
LEFT JOIN photo_tag_assignments pta ON p.id = pta.photo_id
LEFT JOIN photo_tags pt ON pta.tag_id = pt.id
LEFT JOIN photo_sharing_permissions psp ON p.id = psp.photo_id AND psp.is_active = true
LEFT JOIN photo_comments pc ON p.id = pc.photo_id
GROUP BY p.id, pb.name, pa.name;

-- =============================================
-- SUPABASE STORAGE SETUP
-- =============================================

-- Create storage bucket for photos (this would typically be done via Supabase dashboard)
-- The bucket will be created programmatically in the application

COMMENT ON TABLE photo_buckets IS 'Organizational containers for photo albums';
COMMENT ON TABLE photo_albums IS 'Collections of photos within buckets';
COMMENT ON TABLE photos IS 'Individual photo files with metadata and optimization paths';
COMMENT ON TABLE photo_sharing_permissions IS 'Vendor-specific access control for photo sharing';
COMMENT ON TABLE photo_tags IS 'Reusable tags for photo categorization';
COMMENT ON TABLE photo_tag_assignments IS 'Many-to-many relationship between photos and tags';
COMMENT ON TABLE photo_comments IS 'Collaboration comments on photos';
COMMENT ON TABLE photo_access_logs IS 'Security audit trail for photo access';