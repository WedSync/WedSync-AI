-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- Suppliers (Vendors) Table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic Information
  business_name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  business_type VARCHAR(100), -- Photography, Videography, Venue, Catering, etc.
  primary_category VARCHAR(100) NOT NULL,
  secondary_categories TEXT[], -- Array of additional categories
  
  -- Contact Information
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  website VARCHAR(255),
  
  -- Location Information
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  county VARCHAR(100),
  country VARCHAR(100) DEFAULT 'UK',
  postcode VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  service_radius_miles INTEGER DEFAULT 50,
  nationwide_coverage BOOLEAN DEFAULT false,
  
  -- Business Details
  description TEXT,
  about_us TEXT,
  years_in_business INTEGER,
  team_size INTEGER,
  
  -- Pricing Information
  price_range VARCHAR(50), -- £, ££, £££, ££££
  starting_price DECIMAL(10, 2),
  payment_methods TEXT[],
  
  -- Social & Portfolio
  instagram_handle VARCHAR(100),
  facebook_url VARCHAR(255),
  pinterest_url VARCHAR(255),
  portfolio_images JSONB DEFAULT '[]'::jsonb, -- Array of image URLs with metadata
  featured_image VARCHAR(500),
  
  -- Verification & Quality
  is_verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMP WITH TIME ZONE,
  insurance_verified BOOLEAN DEFAULT false,
  certifications JSONB DEFAULT '[]'::jsonb,
  
  -- Reviews & Ratings
  average_rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  response_time_hours INTEGER,
  response_rate DECIMAL(5, 2),
  
  -- Marketplace
  is_marketplace_vendor BOOLEAN DEFAULT false,
  commission_rate DECIMAL(5, 2) DEFAULT 30.00,
  total_sales INTEGER DEFAULT 0,
  
  -- Profile Completion
  profile_completion_score INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  
  -- Metadata
  tags TEXT[],
  seo_title VARCHAR(255),
  seo_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE
);

-- Clients Table (Supplier's Clients)
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic Information
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  partner_first_name VARCHAR(100),
  partner_last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  
  -- Wedding Details
  wedding_date DATE,
  venue_name VARCHAR(255),
  venue_address TEXT,
  guest_count INTEGER,
  budget_range VARCHAR(50),
  
  -- Status & Stage
  status VARCHAR(50) DEFAULT 'lead', -- lead, booked, completed, archived
  booking_stage VARCHAR(100), -- inquiry, quote_sent, meeting_scheduled, contract_sent, booked
  lead_source VARCHAR(100),
  lead_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  booking_date TIMESTAMP WITH TIME ZONE,
  
  -- Package & Pricing
  package_name VARCHAR(255),
  package_price DECIMAL(10, 2),
  deposit_amount DECIMAL(10, 2),
  balance_due DECIMAL(10, 2),
  payment_schedule JSONB DEFAULT '[]'::jsonb,
  
  -- Journey & Communication
  current_journey_id UUID,
  journey_stage VARCHAR(100),
  last_contact_date TIMESTAMP WITH TIME ZONE,
  next_action_date TIMESTAMP WITH TIME ZONE,
  next_action_type VARCHAR(100),
  
  -- WedMe Connection
  is_wedme_connected BOOLEAN DEFAULT false,
  wedme_couple_id UUID,
  wedme_invite_sent_at TIMESTAMP WITH TIME ZONE,
  wedme_connected_at TIMESTAMP WITH TIME ZONE,
  
  -- Forms & Documents
  form_responses JSONB DEFAULT '{}'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  contracts JSONB DEFAULT '[]'::jsonb,
  
  -- Notes & Activity
  notes TEXT,
  internal_notes TEXT,
  activity_log JSONB DEFAULT '[]'::jsonb,
  
  -- Tags & Organization
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}'::jsonb,
  
  -- Import Information
  import_source VARCHAR(100), -- manual, csv, honeybook, dubsado, etc.
  import_id VARCHAR(255), -- External system ID
  import_date TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  last_modified_by UUID REFERENCES user_profiles(id)
);

-- Supplier-Client Connections (Many-to-Many)
CREATE TABLE IF NOT EXISTS supplier_client_connections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Connection Details
  connection_type VARCHAR(50) DEFAULT 'primary', -- primary, secondary, referral
  connection_status VARCHAR(50) DEFAULT 'active', -- active, paused, completed
  
  -- Relationship Metadata
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Permissions
  can_view_core_fields BOOLEAN DEFAULT true,
  can_edit_core_fields BOOLEAN DEFAULT false,
  shared_fields TEXT[],
  
  -- Activity
  last_interaction_at TIMESTAMP WITH TIME ZONE,
  interaction_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(supplier_id, client_id)
);

-- Vendor Categories Reference Table
CREATE TABLE IF NOT EXISTS vendor_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  parent_id UUID REFERENCES vendor_categories(id),
  
  -- Display Information
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7),
  
  -- Ordering & Visibility
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- SEO
  seo_title VARCHAR(255),
  seo_description TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client Activity Log Table
CREATE TABLE IF NOT EXISTS client_activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Activity Details
  activity_type VARCHAR(100) NOT NULL, -- email_sent, form_completed, payment_received, etc.
  activity_title VARCHAR(255),
  activity_description TEXT,
  
  -- Related Entities
  related_entity_type VARCHAR(50), -- form, journey, email, document
  related_entity_id UUID,
  
  -- User Information
  performed_by UUID REFERENCES user_profiles(id),
  performed_by_name VARCHAR(255),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_suppliers_organization ON suppliers(organization_id);
CREATE INDEX idx_suppliers_slug ON suppliers(slug);
CREATE INDEX idx_suppliers_category ON suppliers(primary_category);
CREATE INDEX idx_suppliers_location ON suppliers(city, county, country);
CREATE INDEX idx_suppliers_published ON suppliers(is_published);

CREATE INDEX idx_clients_organization ON clients(organization_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_wedding_date ON clients(wedding_date);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_wedme ON clients(is_wedme_connected);

CREATE INDEX idx_supplier_client_supplier ON supplier_client_connections(supplier_id);
CREATE INDEX idx_supplier_client_client ON supplier_client_connections(client_id);

CREATE INDEX idx_client_activities_client ON client_activities(client_id);
CREATE INDEX idx_client_activities_type ON client_activities(activity_type);
CREATE INDEX idx_client_activities_date ON client_activities(created_at);

-- Full Text Search Indexes
CREATE INDEX idx_suppliers_search ON suppliers USING gin(
  to_tsvector('english', 
    COALESCE(business_name, '') || ' ' || 
    COALESCE(description, '') || ' ' || 
    COALESCE(city, '') || ' ' ||
    array_to_string(tags, ' ')
  )
);

CREATE INDEX idx_clients_search ON clients USING gin(
  to_tsvector('english',
    COALESCE(first_name, '') || ' ' ||
    COALESCE(last_name, '') || ' ' ||
    COALESCE(partner_first_name, '') || ' ' ||
    COALESCE(partner_last_name, '') || ' ' ||
    COALESCE(email, '') || ' ' ||
    COALESCE(venue_name, '')
  )
);

-- Row Level Security Policies

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_client_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_activities ENABLE ROW LEVEL SECURITY;

-- Suppliers Policies
CREATE POLICY "Users can view their organization's suppliers"
  ON suppliers FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert suppliers for their organization"
  ON suppliers FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their organization's suppliers"
  ON suppliers FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their organization's suppliers"
  ON suppliers FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  ));

-- Clients Policies
CREATE POLICY "Users can view their organization's clients"
  ON clients FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert clients for their organization"
  ON clients FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their organization's clients"
  ON clients FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their organization's clients"
  ON clients FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  ));

-- Public vendor categories (everyone can read)
CREATE POLICY "Anyone can view vendor categories"
  ON vendor_categories FOR SELECT
  TO public
  USING (is_active = true);

-- Insert default vendor categories
INSERT INTO vendor_categories (name, slug, display_name, description, icon, sort_order) VALUES
  ('photography', 'photography', 'Photography', 'Professional wedding photographers', 'camera', 1),
  ('videography', 'videography', 'Videography', 'Wedding videographers and cinematographers', 'video', 2),
  ('venue', 'venue', 'Venues', 'Wedding venues and reception locations', 'building', 3),
  ('catering', 'catering', 'Catering', 'Wedding caterers and food services', 'utensils', 4),
  ('florist', 'florist', 'Floristry', 'Wedding florists and floral designers', 'flower', 5),
  ('music', 'music', 'Music & Entertainment', 'DJs, bands, and entertainers', 'music', 6),
  ('beauty', 'beauty', 'Hair & Makeup', 'Hair stylists and makeup artists', 'sparkles', 7),
  ('planning', 'planning', 'Planning & Coordination', 'Wedding planners and coordinators', 'clipboard', 8),
  ('attire', 'attire', 'Attire', 'Wedding dresses, suits, and accessories', 'shirt', 9),
  ('transport', 'transport', 'Transport', 'Wedding cars and transportation', 'car', 10),
  ('cake', 'cake', 'Cakes & Desserts', 'Wedding cakes and dessert tables', 'cake', 11),
  ('stationery', 'stationery', 'Stationery', 'Invitations and wedding stationery', 'envelope', 12),
  ('decor', 'decor', 'Decor & Styling', 'Wedding decorators and stylists', 'paint-brush', 13),
  ('jewellery', 'jewellery', 'Jewellery', 'Wedding rings and jewellery', 'gem', 14),
  ('favors', 'favors', 'Favors & Gifts', 'Wedding favors and guest gifts', 'gift', 15)
ON CONFLICT (slug) DO NOTHING;