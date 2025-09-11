-- WS-118: Directory Supplier Profile Creation System
-- Comprehensive supplier profiles with enhanced features

-- Directory Geographic Hierarchy (WS-116 dependency)
CREATE TABLE IF NOT EXISTS directory_geographic_areas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  parent_id UUID REFERENCES directory_geographic_areas(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- country, region, county, city, district
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  bounds JSONB, -- Geographic bounds for the area
  population INTEGER,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(slug, type)
);

-- Enhanced Supplier Profiles
CREATE TABLE IF NOT EXISTS directory_supplier_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Profile Status
  profile_status VARCHAR(50) DEFAULT 'draft', -- draft, pending_review, published, suspended
  completion_step INTEGER DEFAULT 1, -- Current step in creation wizard
  is_featured BOOLEAN DEFAULT false,
  featured_until DATE,
  
  -- Extended Business Information
  company_registration_number VARCHAR(100),
  vat_number VARCHAR(100),
  established_year INTEGER,
  legal_business_name VARCHAR(255),
  trading_name VARCHAR(255),
  business_structure VARCHAR(100), -- sole_trader, partnership, limited_company, etc.
  
  -- Service Details
  service_offerings JSONB DEFAULT '[]'::jsonb, -- Detailed service list with descriptions
  specializations TEXT[],
  languages_spoken TEXT[],
  service_areas UUID[] DEFAULT '{}', -- References to directory_geographic_areas
  travel_policy TEXT,
  
  -- Capacity & Availability
  max_events_per_day INTEGER DEFAULT 1,
  max_events_per_week INTEGER DEFAULT 5,
  advance_booking_days INTEGER DEFAULT 30, -- Minimum days notice required
  peak_season_months INTEGER[], -- Array of month numbers (1-12)
  availability_calendar JSONB DEFAULT '{}'::jsonb, -- Calendar data
  
  -- Pricing & Packages
  pricing_structure VARCHAR(50), -- hourly, package, custom
  hourly_rate DECIMAL(10, 2),
  minimum_spend DECIMAL(10, 2),
  packages JSONB DEFAULT '[]'::jsonb, -- Array of package objects
  payment_terms TEXT,
  deposit_percentage DECIMAL(5, 2),
  cancellation_policy TEXT,
  
  -- Media Gallery
  logo_url VARCHAR(500),
  cover_image_url VARCHAR(500),
  gallery_images JSONB DEFAULT '[]'::jsonb, -- Enhanced with categories and captions
  videos JSONB DEFAULT '[]'::jsonb, -- Video URLs with metadata
  virtual_tour_url VARCHAR(500),
  
  -- Awards & Credentials
  awards JSONB DEFAULT '[]'::jsonb,
  professional_associations TEXT[],
  accreditations JSONB DEFAULT '[]'::jsonb,
  insurance_details JSONB,
  
  -- Team Information
  team_members JSONB DEFAULT '[]'::jsonb, -- Team member profiles
  key_contact_name VARCHAR(255),
  key_contact_role VARCHAR(100),
  key_contact_email VARCHAR(255),
  key_contact_phone VARCHAR(50),
  
  -- Marketing & SEO
  unique_selling_points TEXT[],
  style_tags TEXT[],
  ideal_client_description TEXT,
  featured_weddings JSONB DEFAULT '[]'::jsonb,
  press_mentions JSONB DEFAULT '[]'::jsonb,
  
  -- Response Settings
  auto_response_enabled BOOLEAN DEFAULT false,
  auto_response_message TEXT,
  response_time_commitment VARCHAR(50), -- within_hour, within_day, within_2days
  preferred_contact_method VARCHAR(50), -- email, phone, whatsapp, platform
  
  -- Verification
  verification_status VARCHAR(50) DEFAULT 'unverified', -- unverified, pending, verified, rejected
  verification_documents JSONB DEFAULT '[]'::jsonb,
  verification_submitted_at TIMESTAMP WITH TIME ZONE,
  verification_completed_at TIMESTAMP WITH TIME ZONE,
  verification_notes TEXT,
  trust_score INTEGER DEFAULT 0, -- 0-100
  
  -- Analytics
  profile_views INTEGER DEFAULT 0,
  contact_clicks INTEGER DEFAULT 0,
  website_clicks INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5, 2),
  last_lead_received_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service Area Mappings
CREATE TABLE IF NOT EXISTS directory_supplier_service_areas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_profile_id UUID REFERENCES directory_supplier_profiles(id) ON DELETE CASCADE,
  geographic_area_id UUID REFERENCES directory_geographic_areas(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  additional_fee DECIMAL(10, 2), -- Extra charges for this area
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supplier_profile_id, geographic_area_id)
);

-- Supplier Documents (for verification)
CREATE TABLE IF NOT EXISTS directory_supplier_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_profile_id UUID REFERENCES directory_supplier_profiles(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL, -- insurance, license, certification, registration
  document_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  expiry_date DATE,
  verification_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  verified_by UUID REFERENCES user_profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  is_public BOOLEAN DEFAULT false, -- Whether to show on public profile
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supplier Certifications & Badges
CREATE TABLE IF NOT EXISTS directory_supplier_badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_profile_id UUID REFERENCES directory_supplier_profiles(id) ON DELETE CASCADE,
  badge_type VARCHAR(100) NOT NULL, -- verified, premium, top_rated, eco_friendly, etc.
  badge_name VARCHAR(255) NOT NULL,
  badge_icon VARCHAR(100),
  description TEXT,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0
);

-- Profile Completion Tracking
CREATE TABLE IF NOT EXISTS directory_profile_completion (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_profile_id UUID REFERENCES directory_supplier_profiles(id) ON DELETE CASCADE,
  section_name VARCHAR(100) NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completion_percentage INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supplier_profile_id, section_name)
);

-- SEO Metadata
CREATE TABLE IF NOT EXISTS directory_supplier_seo (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_profile_id UUID REFERENCES directory_supplier_profiles(id) ON DELETE CASCADE,
  page_title VARCHAR(255),
  meta_description TEXT,
  meta_keywords TEXT[],
  og_title VARCHAR(255),
  og_description TEXT,
  og_image VARCHAR(500),
  canonical_url VARCHAR(500),
  schema_markup JSONB,
  sitemap_priority DECIMAL(2, 1) DEFAULT 0.5,
  sitemap_frequency VARCHAR(50) DEFAULT 'weekly',
  custom_slug VARCHAR(255) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_directory_geographic_areas_parent ON directory_geographic_areas(parent_id);
CREATE INDEX idx_directory_geographic_areas_type ON directory_geographic_areas(type);
CREATE INDEX idx_directory_geographic_areas_slug ON directory_geographic_areas(slug);

CREATE INDEX idx_directory_supplier_profiles_status ON directory_supplier_profiles(profile_status);
CREATE INDEX idx_directory_supplier_profiles_featured ON directory_supplier_profiles(is_featured, featured_until);
CREATE INDEX idx_directory_supplier_profiles_verification ON directory_supplier_profiles(verification_status);
CREATE INDEX idx_directory_supplier_profiles_organization ON directory_supplier_profiles(organization_id);

CREATE INDEX idx_directory_supplier_service_areas_profile ON directory_supplier_service_areas(supplier_profile_id);
CREATE INDEX idx_directory_supplier_service_areas_geo ON directory_supplier_service_areas(geographic_area_id);

CREATE INDEX idx_directory_supplier_documents_profile ON directory_supplier_documents(supplier_profile_id);
CREATE INDEX idx_directory_supplier_documents_type ON directory_supplier_documents(document_type);

CREATE INDEX idx_directory_supplier_badges_profile ON directory_supplier_badges(supplier_profile_id);
CREATE INDEX idx_directory_supplier_badges_type ON directory_supplier_badges(badge_type);

CREATE INDEX idx_directory_supplier_seo_profile ON directory_supplier_seo(supplier_profile_id);
CREATE INDEX idx_directory_supplier_seo_slug ON directory_supplier_seo(custom_slug);

-- Enable Row Level Security
ALTER TABLE directory_geographic_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_supplier_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_supplier_service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_supplier_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_supplier_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_profile_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_supplier_seo ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Geographic Areas (public read)
CREATE POLICY "Geographic areas are viewable by all"
  ON directory_geographic_areas FOR SELECT
  USING (is_active = true);

CREATE POLICY "Geographic areas manageable by admins"
  ON directory_geographic_areas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for Supplier Profiles
CREATE POLICY "Published profiles are viewable by all"
  ON directory_supplier_profiles FOR SELECT
  USING (profile_status = 'published');

CREATE POLICY "Suppliers can view own profiles"
  ON directory_supplier_profiles FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Suppliers can manage own profiles"
  ON directory_supplier_profiles FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for Service Areas
CREATE POLICY "Service areas viewable with profiles"
  ON directory_supplier_service_areas FOR SELECT
  USING (
    supplier_profile_id IN (
      SELECT id FROM directory_supplier_profiles WHERE profile_status = 'published'
    )
  );

CREATE POLICY "Suppliers manage own service areas"
  ON directory_supplier_service_areas FOR ALL
  USING (
    supplier_profile_id IN (
      SELECT id FROM directory_supplier_profiles
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS Policies for Documents
CREATE POLICY "Public documents are viewable"
  ON directory_supplier_documents FOR SELECT
  USING (is_public = true);

CREATE POLICY "Suppliers manage own documents"
  ON directory_supplier_documents FOR ALL
  USING (
    supplier_profile_id IN (
      SELECT id FROM directory_supplier_profiles
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS Policies for Badges
CREATE POLICY "Badges are publicly viewable"
  ON directory_supplier_badges FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage badges"
  ON directory_supplier_badges FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for Profile Completion
CREATE POLICY "Suppliers view own completion"
  ON directory_profile_completion FOR SELECT
  USING (
    supplier_profile_id IN (
      SELECT id FROM directory_supplier_profiles
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Suppliers manage own completion"
  ON directory_profile_completion FOR ALL
  USING (
    supplier_profile_id IN (
      SELECT id FROM directory_supplier_profiles
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS Policies for SEO
CREATE POLICY "SEO data viewable with published profiles"
  ON directory_supplier_seo FOR SELECT
  USING (
    supplier_profile_id IN (
      SELECT id FROM directory_supplier_profiles WHERE profile_status = 'published'
    )
  );

CREATE POLICY "Suppliers manage own SEO"
  ON directory_supplier_seo FOR ALL
  USING (
    supplier_profile_id IN (
      SELECT id FROM directory_supplier_profiles
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Function to calculate profile completion
CREATE OR REPLACE FUNCTION calculate_profile_completion(profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  completion_score INTEGER := 0;
  profile_record RECORD;
BEGIN
  SELECT * INTO profile_record FROM directory_supplier_profiles WHERE id = profile_id;
  
  -- Basic information (20%)
  IF profile_record.legal_business_name IS NOT NULL THEN completion_score := completion_score + 5; END IF;
  IF profile_record.company_registration_number IS NOT NULL THEN completion_score := completion_score + 5; END IF;
  IF profile_record.established_year IS NOT NULL THEN completion_score := completion_score + 5; END IF;
  IF profile_record.business_structure IS NOT NULL THEN completion_score := completion_score + 5; END IF;
  
  -- Service details (20%)
  IF jsonb_array_length(profile_record.service_offerings) > 0 THEN completion_score := completion_score + 10; END IF;
  IF array_length(profile_record.specializations, 1) > 0 THEN completion_score := completion_score + 10; END IF;
  
  -- Media (20%)
  IF profile_record.logo_url IS NOT NULL THEN completion_score := completion_score + 5; END IF;
  IF profile_record.cover_image_url IS NOT NULL THEN completion_score := completion_score + 5; END IF;
  IF jsonb_array_length(profile_record.gallery_images) > 0 THEN completion_score := completion_score + 10; END IF;
  
  -- Pricing (15%)
  IF profile_record.pricing_structure IS NOT NULL THEN completion_score := completion_score + 5; END IF;
  IF profile_record.minimum_spend IS NOT NULL THEN completion_score := completion_score + 5; END IF;
  IF jsonb_array_length(profile_record.packages) > 0 THEN completion_score := completion_score + 5; END IF;
  
  -- Team & Contact (15%)
  IF profile_record.key_contact_name IS NOT NULL THEN completion_score := completion_score + 5; END IF;
  IF profile_record.key_contact_email IS NOT NULL THEN completion_score := completion_score + 5; END IF;
  IF jsonb_array_length(profile_record.team_members) > 0 THEN completion_score := completion_score + 5; END IF;
  
  -- Verification (10%)
  IF profile_record.verification_status = 'verified' THEN completion_score := completion_score + 10; END IF;
  
  RETURN completion_score;
END;
$$ LANGUAGE plpgsql;

-- Function to generate SEO-friendly slug
CREATE OR REPLACE FUNCTION generate_supplier_slug(business_name TEXT, location TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Create base slug from business name and location
  base_slug := lower(regexp_replace(business_name || '-' || location, '[^a-z0-9-]', '-', 'g'));
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Check for uniqueness and add counter if needed
  WHILE EXISTS(SELECT 1 FROM directory_supplier_seo WHERE custom_slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update profile completion on changes
CREATE OR REPLACE FUNCTION update_profile_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Update completion score
  UPDATE suppliers 
  SET profile_completion_score = calculate_profile_completion(NEW.id)
  WHERE id = NEW.supplier_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_profile_completion
AFTER INSERT OR UPDATE ON directory_supplier_profiles
FOR EACH ROW
EXECUTE FUNCTION update_profile_completion();

-- Insert some initial geographic areas for UK
INSERT INTO directory_geographic_areas (type, name, slug, display_name, parent_id, sort_order) VALUES
  ('country', 'United Kingdom', 'uk', 'United Kingdom', NULL, 1),
  ('region', 'England', 'england', 'England', (SELECT id FROM directory_geographic_areas WHERE slug = 'uk'), 1),
  ('region', 'Scotland', 'scotland', 'Scotland', (SELECT id FROM directory_geographic_areas WHERE slug = 'uk'), 2),
  ('region', 'Wales', 'wales', 'Wales', (SELECT id FROM directory_geographic_areas WHERE slug = 'uk'), 3),
  ('region', 'Northern Ireland', 'northern-ireland', 'Northern Ireland', (SELECT id FROM directory_geographic_areas WHERE slug = 'uk'), 4)
ON CONFLICT (slug, type) DO NOTHING;

-- Insert major cities
INSERT INTO directory_geographic_areas (type, name, slug, display_name, parent_id, sort_order) VALUES
  ('city', 'London', 'london', 'London', (SELECT id FROM directory_geographic_areas WHERE slug = 'england'), 1),
  ('city', 'Manchester', 'manchester', 'Manchester', (SELECT id FROM directory_geographic_areas WHERE slug = 'england'), 2),
  ('city', 'Birmingham', 'birmingham', 'Birmingham', (SELECT id FROM directory_geographic_areas WHERE slug = 'england'), 3),
  ('city', 'Edinburgh', 'edinburgh', 'Edinburgh', (SELECT id FROM directory_geographic_areas WHERE slug = 'scotland'), 1),
  ('city', 'Glasgow', 'glasgow', 'Glasgow', (SELECT id FROM directory_geographic_areas WHERE slug = 'scotland'), 2),
  ('city', 'Cardiff', 'cardiff', 'Cardiff', (SELECT id FROM directory_geographic_areas WHERE slug = 'wales'), 1),
  ('city', 'Belfast', 'belfast', 'Belfast', (SELECT id FROM directory_geographic_areas WHERE slug = 'northern-ireland'), 1)
ON CONFLICT (slug, type) DO NOTHING;