-- =============================================
-- Photography Library AI System Migration
-- Feature: WS-130 - AI-Powered Photography Library and Style Matching
-- Team: C, Batch: 10, Round: 1
-- =============================================

-- Extend existing photo system with AI-powered features

-- Create photography styles table for AI categorization
CREATE TABLE photography_styles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    characteristics JSONB, -- Style characteristics for AI matching
    example_prompts TEXT[], -- Sample prompts that match this style
    color_palettes JSONB, -- Common color schemes for this style
    typical_shots TEXT[], -- Common shot types for this style
    mood_keywords TEXT[], -- Keywords associated with this style's mood
    technical_specs JSONB, -- Typical camera settings, lighting, etc.
    popularity_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create shot list templates table for AI generation
CREATE TABLE shot_list_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(100) NOT NULL, -- 'wedding', 'engagement', 'portrait', etc.
    photography_style_id UUID REFERENCES photography_styles(id) ON DELETE SET NULL,
    shot_categories JSONB NOT NULL, -- Organized shot categories with descriptions
    estimated_duration_minutes INTEGER,
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
    equipment_requirements TEXT[],
    lighting_requirements TEXT[],
    location_requirements TEXT[],
    created_by UUID REFERENCES user_profiles(id),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create shot lists table for generated lists
CREATE TABLE shot_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID REFERENCES shot_list_templates(id) ON DELETE SET NULL,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE,
    venue_location VARCHAR(255),
    photography_style_id UUID REFERENCES photography_styles(id) ON DELETE SET NULL,
    
    -- AI Generated Content
    shots JSONB NOT NULL, -- Comprehensive list of shots with details
    ai_analysis JSONB, -- AI analysis that generated this list
    generation_criteria JSONB, -- Parameters used for AI generation
    estimated_timeline JSONB, -- Suggested shooting timeline
    
    -- Customization
    custom_shots JSONB, -- User-added custom shots
    excluded_shots TEXT[], -- Shot IDs to exclude
    priority_shots TEXT[], -- High priority shot IDs
    notes TEXT,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'approved', 'in_progress', 'completed'
    completion_percentage INTEGER DEFAULT 0,
    
    -- Collaboration
    shared_with_photographer_id UUID REFERENCES user_profiles(id),
    photographer_approved_at TIMESTAMPTZ,
    client_approved_at TIMESTAMPTZ,
    
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_status CHECK (status IN ('draft', 'approved', 'in_progress', 'completed'))
);

-- Create mood boards table for AI-powered mood board creation
CREATE TABLE mood_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    theme VARCHAR(255),
    color_palette JSONB, -- Primary colors and schemes
    photography_style_id UUID REFERENCES photography_styles(id) ON DELETE SET NULL,
    
    -- AI Generated Content
    inspiration_images JSONB, -- URLs and metadata for inspiration images
    style_keywords TEXT[],
    mood_descriptors TEXT[],
    ai_suggestions JSONB, -- AI-generated suggestions for improvement
    
    -- Layout and Design
    layout_type VARCHAR(50) DEFAULT 'grid', -- 'grid', 'collage', 'magazine', 'minimal'
    grid_configuration JSONB, -- Layout configuration
    
    -- Collaboration
    is_public BOOLEAN DEFAULT false,
    allow_client_feedback BOOLEAN DEFAULT true,
    feedback_collected JSONB, -- Client and vendor feedback
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft',
    version INTEGER DEFAULT 1,
    
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_mood_board_status CHECK (status IN ('draft', 'review', 'approved', 'archived'))
);

-- Create photographer profiles table for matching algorithm
CREATE TABLE photographer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Basic Information
    business_name VARCHAR(255),
    bio TEXT,
    years_experience INTEGER,
    location VARCHAR(255),
    service_radius_miles INTEGER,
    
    -- Specializations
    photography_styles UUID[] DEFAULT '{}', -- Array of photography_style IDs
    specialties TEXT[], -- 'wedding', 'portrait', 'commercial', 'events', etc.
    equipment_owned TEXT[],
    certifications TEXT[],
    
    -- Portfolio
    featured_portfolio_ids UUID[], -- Array of portfolio IDs
    portfolio_url TEXT,
    instagram_handle VARCHAR(100),
    website_url TEXT,
    
    -- Pricing and Availability
    base_package_price DECIMAL(10, 2),
    hourly_rate DECIMAL(10, 2),
    travel_fee DECIMAL(10, 2),
    availability_calendar JSONB, -- Available dates and times
    booking_lead_time_days INTEGER DEFAULT 30,
    
    -- Reviews and Ratings
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    total_weddings INTEGER DEFAULT 0,
    
    -- AI Matching Data
    style_compatibility_scores JSONB, -- Computed compatibility with different styles
    performance_metrics JSONB, -- Response time, delivery speed, etc.
    client_satisfaction_score DECIMAL(3, 2) DEFAULT 0.00,
    
    -- Status
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    verification_date TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create photographer matching results table for AI algorithm output
CREATE TABLE photographer_matching_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    photographer_id UUID REFERENCES photographer_profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Matching criteria used
    search_criteria JSONB NOT NULL,
    matching_algorithm_version VARCHAR(50) NOT NULL,
    
    -- Scoring details
    overall_match_score DECIMAL(5, 2) NOT NULL, -- 0.00 to 100.00
    style_match_score DECIMAL(5, 2) NOT NULL,
    location_match_score DECIMAL(5, 2) NOT NULL,
    price_match_score DECIMAL(5, 2) NOT NULL,
    availability_match_score DECIMAL(5, 2) NOT NULL,
    experience_match_score DECIMAL(5, 2) NOT NULL,
    
    -- Detailed analysis
    match_reasons TEXT[],
    potential_concerns TEXT[],
    ai_recommendation TEXT,
    confidence_level DECIMAL(3, 2) NOT NULL, -- 0.00 to 1.00
    
    -- Status tracking
    is_contacted BOOLEAN DEFAULT false,
    contacted_at TIMESTAMPTZ,
    response_received BOOLEAN DEFAULT false,
    response_received_at TIMESTAMPTZ,
    booking_status VARCHAR(50) DEFAULT 'pending',
    
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_booking_status CHECK (booking_status IN ('pending', 'contacted', 'quoted', 'booked', 'declined'))
);

-- Create portfolio galleries table for display
CREATE TABLE portfolio_galleries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photographer_id UUID REFERENCES photographer_profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    gallery_type VARCHAR(100) NOT NULL, -- 'wedding', 'engagement', 'portrait', 'commercial'
    photography_style_id UUID REFERENCES photography_styles(id) ON DELETE SET NULL,
    
    -- Organization
    cover_image_url TEXT,
    image_urls TEXT[] NOT NULL,
    image_metadata JSONB, -- Alt text, captions, technical details
    sort_order INTEGER DEFAULT 0,
    
    -- Event details (for wedding galleries)
    event_date DATE,
    venue_name VARCHAR(255),
    couple_names VARCHAR(255),
    guest_count INTEGER,
    
    -- Visibility and sharing
    is_public BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    client_permission_granted BOOLEAN DEFAULT false,
    password_protected BOOLEAN DEFAULT false,
    access_password VARCHAR(255),
    
    -- Analytics
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- AI Analysis
    ai_style_analysis JSONB, -- AI-determined style characteristics
    quality_score DECIMAL(3, 2), -- AI-determined quality rating
    diversity_score DECIMAL(3, 2), -- How diverse the shots are
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create photo style analysis table for AI categorization results
CREATE TABLE photo_style_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    photography_style_id UUID REFERENCES photography_styles(id) ON DELETE CASCADE,
    
    -- AI Analysis Results
    confidence_score DECIMAL(5, 2) NOT NULL, -- 0.00 to 100.00
    style_elements_detected JSONB, -- Specific elements that indicate this style
    color_analysis JSONB, -- Color palette analysis
    composition_analysis JSONB, -- Rule of thirds, leading lines, etc.
    lighting_analysis JSONB, -- Natural, artificial, mood, etc.
    subject_analysis JSONB, -- People, objects, settings detected
    
    -- Technical metadata
    model_version VARCHAR(50) NOT NULL,
    processing_time_ms INTEGER,
    analysis_date TIMESTAMPTZ DEFAULT now(),
    
    -- Human validation
    human_verified BOOLEAN DEFAULT false,
    human_rating DECIMAL(3, 2), -- Human expert rating of accuracy
    verification_notes TEXT,
    verified_by UUID REFERENCES user_profiles(id),
    verified_at TIMESTAMPTZ
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Photography styles indexes
CREATE INDEX idx_photography_styles_name ON photography_styles(name);
CREATE INDEX idx_photography_styles_popularity ON photography_styles(popularity_score DESC);

-- Shot list templates indexes
CREATE INDEX idx_shot_list_templates_event_type ON shot_list_templates(event_type);
CREATE INDEX idx_shot_list_templates_style_id ON shot_list_templates(photography_style_id);
CREATE INDEX idx_shot_list_templates_public ON shot_list_templates(is_public);
CREATE INDEX idx_shot_list_templates_organization_id ON shot_list_templates(organization_id);

-- Shot lists indexes
CREATE INDEX idx_shot_lists_client_id ON shot_lists(client_id);
CREATE INDEX idx_shot_lists_organization_id ON shot_lists(organization_id);
CREATE INDEX idx_shot_lists_status ON shot_lists(status);
CREATE INDEX idx_shot_lists_event_date ON shot_lists(event_date);
CREATE INDEX idx_shot_lists_photographer_id ON shot_lists(shared_with_photographer_id);

-- Mood boards indexes
CREATE INDEX idx_mood_boards_client_id ON mood_boards(client_id);
CREATE INDEX idx_mood_boards_organization_id ON mood_boards(organization_id);
CREATE INDEX idx_mood_boards_style_id ON mood_boards(photography_style_id);
CREATE INDEX idx_mood_boards_status ON mood_boards(status);
CREATE INDEX idx_mood_boards_public ON mood_boards(is_public);

-- Photographer profiles indexes
CREATE INDEX idx_photographer_profiles_user_id ON photographer_profiles(user_id);
CREATE INDEX idx_photographer_profiles_organization_id ON photographer_profiles(organization_id);
CREATE INDEX idx_photographer_profiles_location ON photographer_profiles(location);
CREATE INDEX idx_photographer_profiles_rating ON photographer_profiles(average_rating DESC);
CREATE INDEX idx_photographer_profiles_active ON photographer_profiles(is_active);
CREATE INDEX idx_photographer_profiles_verified ON photographer_profiles(is_verified);
CREATE INDEX idx_photographer_profiles_styles ON photographer_profiles USING GIN(photography_styles);

-- Photographer matching results indexes
CREATE INDEX idx_photographer_matching_results_client_id ON photographer_matching_results(client_id);
CREATE INDEX idx_photographer_matching_results_photographer_id ON photographer_matching_results(photographer_id);
CREATE INDEX idx_photographer_matching_results_match_score ON photographer_matching_results(overall_match_score DESC);
CREATE INDEX idx_photographer_matching_results_booking_status ON photographer_matching_results(booking_status);

-- Portfolio galleries indexes
CREATE INDEX idx_portfolio_galleries_photographer_id ON portfolio_galleries(photographer_id);
CREATE INDEX idx_portfolio_galleries_type ON portfolio_galleries(gallery_type);
CREATE INDEX idx_portfolio_galleries_style_id ON portfolio_galleries(photography_style_id);
CREATE INDEX idx_portfolio_galleries_public ON portfolio_galleries(is_public);
CREATE INDEX idx_portfolio_galleries_featured ON portfolio_galleries(is_featured);
CREATE INDEX idx_portfolio_galleries_event_date ON portfolio_galleries(event_date);

-- Photo style analyses indexes
CREATE INDEX idx_photo_style_analyses_photo_id ON photo_style_analyses(photo_id);
CREATE INDEX idx_photo_style_analyses_style_id ON photo_style_analyses(photography_style_id);
CREATE INDEX idx_photo_style_analyses_confidence ON photo_style_analyses(confidence_score DESC);
CREATE INDEX idx_photo_style_analyses_verified ON photo_style_analyses(human_verified);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all new tables
ALTER TABLE photography_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shot_list_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shot_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE photographer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE photographer_matching_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_style_analyses ENABLE ROW LEVEL SECURITY;

-- Photography styles policies (public read access)
CREATE POLICY "Anyone can view photography styles" ON photography_styles
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage photography styles" ON photography_styles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

-- Shot list templates policies
CREATE POLICY "Users can view public templates or their organization's templates" ON shot_list_templates
    FOR SELECT USING (
        is_public = true OR
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create templates in their organization" ON shot_list_templates
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Shot lists policies
CREATE POLICY "Users can view shot lists in their organization" ON shot_lists
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create shot lists in their organization" ON shot_lists
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their shot lists" ON shot_lists
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND organization_id = shot_lists.organization_id
            AND role IN ('admin', 'owner')
        )
    );

-- Mood boards policies
CREATE POLICY "Users can view public mood boards or their organization's boards" ON mood_boards
    FOR SELECT USING (
        is_public = true OR
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create mood boards in their organization" ON mood_boards
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Photographer profiles policies
CREATE POLICY "Anyone can view active photographer profiles" ON photographer_profiles
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can manage their own photographer profile" ON photographer_profiles
    FOR ALL USING (user_id = auth.uid());

-- Portfolio galleries policies
CREATE POLICY "Anyone can view public portfolio galleries" ON portfolio_galleries
    FOR SELECT USING (is_public = true);

CREATE POLICY "Photographers can manage their own galleries" ON portfolio_galleries
    FOR ALL USING (
        photographer_id IN (
            SELECT id FROM photographer_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_photography_styles_updated_at BEFORE UPDATE ON photography_styles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shot_list_templates_updated_at BEFORE UPDATE ON shot_list_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shot_lists_updated_at BEFORE UPDATE ON shot_lists 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mood_boards_updated_at BEFORE UPDATE ON mood_boards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photographer_profiles_updated_at BEFORE UPDATE ON photographer_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_galleries_updated_at BEFORE UPDATE ON portfolio_galleries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate photographer match score
CREATE OR REPLACE FUNCTION calculate_photographer_match_score(
    p_photographer_id UUID,
    p_search_criteria JSONB
) RETURNS DECIMAL AS $$
DECLARE
    style_score DECIMAL := 0;
    location_score DECIMAL := 0;
    price_score DECIMAL := 0;
    experience_score DECIMAL := 0;
    availability_score DECIMAL := 0;
    overall_score DECIMAL := 0;
    photographer_record photographer_profiles;
BEGIN
    -- Get photographer record
    SELECT * INTO photographer_record 
    FROM photographer_profiles 
    WHERE id = p_photographer_id;
    
    IF photographer_record IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Calculate style compatibility score (0-20 points)
    IF p_search_criteria->>'preferred_style' IS NOT NULL THEN
        IF photographer_record.photography_styles @> ARRAY[p_search_criteria->>'preferred_style']::UUID[] THEN
            style_score := 20;
        ELSE
            style_score := 10; -- Partial match
        END IF;
    ELSE
        style_score := 15; -- Neutral if no preference
    END IF;
    
    -- Calculate location score (0-20 points)
    IF p_search_criteria->>'location' IS NOT NULL THEN
        -- Simplified distance calculation (in real implementation would use proper geo calculations)
        location_score := 20; -- Assuming good match for demo
    ELSE
        location_score := 15;
    END IF;
    
    -- Calculate price score (0-20 points)
    IF p_search_criteria->>'budget_max' IS NOT NULL THEN
        IF photographer_record.base_package_price <= (p_search_criteria->>'budget_max')::DECIMAL THEN
            price_score := 20;
        ELSE
            price_score := 5;
        END IF;
    ELSE
        price_score := 15;
    END IF;
    
    -- Calculate experience score (0-20 points)
    experience_score := LEAST(photographer_record.years_experience * 2, 20);
    
    -- Calculate availability score (0-20 points)
    availability_score := 18; -- Simplified for demo
    
    -- Calculate overall score
    overall_score := style_score + location_score + price_score + experience_score + availability_score;
    
    RETURN overall_score;
END;
$$ LANGUAGE plpgsql;

-- Function to update template usage count
CREATE OR REPLACE FUNCTION update_template_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.template_id IS NOT NULL THEN
        UPDATE shot_list_templates 
        SET usage_count = usage_count + 1 
        WHERE id = NEW.template_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_template_usage_on_shot_list_creation AFTER INSERT ON shot_lists
    FOR EACH ROW EXECUTE FUNCTION update_template_usage_count();

-- Function to update photographer ratings
CREATE OR REPLACE FUNCTION update_photographer_ratings()
RETURNS TRIGGER AS $$
BEGIN
    -- This would be called when reviews are added/updated
    -- Simplified implementation for demo
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default photography styles
INSERT INTO photography_styles (name, description, characteristics, mood_keywords, typical_shots) VALUES
('Classic Traditional', 'Timeless, formal wedding photography with traditional poses and compositions', 
 '{"formality": "high", "poses": "traditional", "lighting": "even", "composition": "centered"}',
 ARRAY['elegant', 'formal', 'timeless', 'traditional', 'classic'],
 ARRAY['ceremony processional', 'first kiss', 'family portraits', 'couple portraits']),

('Photojournalistic', 'Documentary-style photography capturing candid moments and emotions naturally',
 '{"spontaneity": "high", "posing": "minimal", "storytelling": "narrative", "editing": "natural"}',
 ARRAY['candid', 'natural', 'storytelling', 'emotional', 'authentic'],
 ARRAY['getting ready candids', 'ceremony reactions', 'reception dancing', 'emotional moments']),

('Fine Art', 'Artistic, creative photography with emphasis on composition, lighting, and creative vision',
 '{"artistry": "high", "creativity": "high", "composition": "artistic", "editing": "stylized"}',
 ARRAY['artistic', 'creative', 'dramatic', 'romantic', 'sophisticated'],
 ARRAY['dramatic portraits', 'artistic details', 'creative compositions', 'styled shoots']),

('Modern Contemporary', 'Clean, contemporary style with modern editing techniques and fresh perspectives',
 '{"style": "contemporary", "editing": "clean", "trends": "current", "technology": "modern"}',
 ARRAY['modern', 'fresh', 'clean', 'stylish', 'contemporary'],
 ARRAY['lifestyle portraits', 'architectural shots', 'modern details', 'urban settings']),

('Romantic Dreamy', 'Soft, romantic style with dreamy lighting and ethereal quality',
 '{"mood": "romantic", "lighting": "soft", "editing": "dreamy", "colors": "pastel"}',
 ARRAY['romantic', 'dreamy', 'soft', 'ethereal', 'intimate'],
 ARRAY['golden hour portraits', 'soft light ceremony', 'romantic details', 'intimate moments']),

('Bold Dramatic', 'High-contrast, dramatic photography with bold compositions and striking visuals',
 '{"contrast": "high", "drama": "high", "lighting": "dramatic", "composition": "bold"}',
 ARRAY['bold', 'dramatic', 'striking', 'powerful', 'intense'],
 ARRAY['dramatic lighting', 'bold portraits', 'striking ceremonies', 'high contrast details']);

-- Insert default shot list templates
INSERT INTO shot_list_templates (name, description, event_type, shot_categories, estimated_duration_minutes, difficulty_level, equipment_requirements) VALUES
('Complete Wedding Day', 'Comprehensive shot list covering entire wedding day from preparation to reception',
 'wedding',
 '{
   "preparation": {
     "shots": ["dress hanging", "shoes and accessories", "bride getting ready", "makeup application", "hair styling", "bridesmaids preparation", "groom preparation", "groomsmen getting ready", "detail shots of rings", "bouquet and flowers"],
     "duration": 120,
     "priority": "high"
   },
   "ceremony": {
     "shots": ["venue setup", "guest arrival", "processional", "exchange of vows", "ring exchange", "first kiss", "recessional", "family portraits", "wedding party portraits"],
     "duration": 90,
     "priority": "critical"
   },
   "reception": {
     "shots": ["venue decoration", "cocktail hour", "first dance", "speeches", "cake cutting", "dancing", "bouquet toss", "farewell send-off"],
     "duration": 240,
     "priority": "high"
   }
 }',
 450, 3, ARRAY['DSLR cameras', 'prime lenses', 'zoom lenses', 'flash equipment', 'tripod']),

('Engagement Session', 'Romantic engagement photography session shot list',
 'engagement', 
 '{
   "portraits": {
     "shots": ["couple walking", "close-up portraits", "ring detail shots", "sitting poses", "laughing candids", "kiss shots", "environmental portraits"],
     "duration": 90,
     "priority": "high"
   },
   "location": {
     "shots": ["scenic backgrounds", "urban settings", "meaningful locations", "seasonal elements", "architectural features"],
     "duration": 60,
     "priority": "medium"
   }
 }',
 150, 2, ARRAY['DSLR camera', 'portrait lens', 'reflector']);

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for photographer search with scores
CREATE VIEW photographer_search_view AS
SELECT 
    pp.*,
    array_agg(DISTINCT ps.name) FILTER (WHERE ps.name IS NOT NULL) as style_names,
    COUNT(DISTINCT pg.id) as portfolio_count,
    AVG(pg.quality_score) as avg_portfolio_quality
FROM photographer_profiles pp
LEFT JOIN photography_styles ps ON ps.id = ANY(pp.photography_styles)
LEFT JOIN portfolio_galleries pg ON pg.photographer_id = pp.id AND pg.is_public = true
WHERE pp.is_active = true
GROUP BY pp.id;

-- View for shot lists with template info
CREATE VIEW shot_lists_with_templates AS
SELECT 
    sl.*,
    slt.name as template_name,
    ps.name as photography_style_name,
    c.name as client_name
FROM shot_lists sl
LEFT JOIN shot_list_templates slt ON sl.template_id = slt.id
LEFT JOIN photography_styles ps ON sl.photography_style_id = ps.id
LEFT JOIN clients c ON sl.client_id = c.id;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE photography_styles IS 'Catalog of photography styles for AI matching and categorization';
COMMENT ON TABLE shot_list_templates IS 'Reusable templates for generating comprehensive shot lists';
COMMENT ON TABLE shot_lists IS 'AI-generated and customizable shot lists for photography sessions';
COMMENT ON TABLE mood_boards IS 'Visual mood boards for photography style inspiration and planning';
COMMENT ON TABLE photographer_profiles IS 'Detailed photographer profiles for matching algorithm';
COMMENT ON TABLE photographer_matching_results IS 'AI algorithm results for photographer-client matching';
COMMENT ON TABLE portfolio_galleries IS 'Photographer portfolio galleries with AI style analysis';
COMMENT ON TABLE photo_style_analyses IS 'AI analysis results for photo style categorization';