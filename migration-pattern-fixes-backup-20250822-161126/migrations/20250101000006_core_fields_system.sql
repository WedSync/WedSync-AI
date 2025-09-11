-- Core Fields System Migration
-- This is THE key differentiator for WedSync - wedding vendors save 10+ hours per wedding
-- by having core wedding details auto-populate across ALL forms and vendors

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core Fields Definition Table
-- Stores the master list of all core fields that can be shared across vendors
CREATE TABLE IF NOT EXISTS core_fields_definitions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  field_key VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'bride_first_name', 'wedding_date'
  field_name VARCHAR(255) NOT NULL, -- Display name
  field_type VARCHAR(50) NOT NULL, -- text, email, tel, date, time, number, address
  category VARCHAR(100) NOT NULL, -- couple_info, wedding_details, venue_info, timeline
  description TEXT,
  validation_rules JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wedding Core Data Table
-- Stores the actual core field values for each wedding/couple
CREATE TABLE IF NOT EXISTS wedding_core_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wedding_id UUID UNIQUE NOT NULL, -- Links multiple vendors to same wedding
  
  -- Couple Information
  bride_first_name VARCHAR(100),
  bride_last_name VARCHAR(100),
  bride_email VARCHAR(255),
  bride_phone VARCHAR(50),
  groom_first_name VARCHAR(100),
  groom_last_name VARCHAR(100),
  groom_email VARCHAR(255),
  groom_phone VARCHAR(50),
  
  -- Wedding Details
  wedding_date DATE,
  ceremony_time TIME,
  reception_time TIME,
  guest_count INTEGER,
  adult_guests INTEGER,
  child_guests INTEGER,
  wedding_party_size INTEGER,
  
  -- Ceremony Venue
  ceremony_venue_name VARCHAR(255),
  ceremony_venue_address TEXT,
  ceremony_venue_city VARCHAR(100),
  ceremony_venue_postcode VARCHAR(20),
  ceremony_venue_phone VARCHAR(50),
  ceremony_venue_coordinator VARCHAR(255),
  ceremony_venue_coordinator_phone VARCHAR(50),
  
  -- Reception Venue (if different)
  reception_venue_name VARCHAR(255),
  reception_venue_address TEXT,
  reception_venue_city VARCHAR(100),
  reception_venue_postcode VARCHAR(20),
  reception_venue_phone VARCHAR(50),
  reception_venue_coordinator VARCHAR(255),
  reception_venue_coordinator_phone VARCHAR(50),
  
  -- Timeline Details
  getting_ready_time TIME,
  getting_ready_location TEXT,
  first_look_time TIME,
  first_look_location TEXT,
  cocktail_hour_time TIME,
  dinner_time TIME,
  first_dance_time TIME,
  parent_dances_time TIME,
  cake_cutting_time TIME,
  bouquet_toss_time TIME,
  last_dance_time TIME,
  send_off_time TIME,
  
  -- Additional Details
  wedding_theme VARCHAR(255),
  wedding_colors TEXT[],
  budget_range VARCHAR(50),
  planning_status VARCHAR(50) DEFAULT 'planning', -- planning, booked, completed
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor-Wedding Connections
-- Links vendors to weddings and controls what core fields they can access
CREATE TABLE IF NOT EXISTS vendor_wedding_connections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wedding_id UUID REFERENCES wedding_core_data(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  client_id UUID REFERENCES clients(id),
  
  -- Connection Details
  connection_type VARCHAR(50) DEFAULT 'vendor', -- vendor, planner, coordinator
  connection_status VARCHAR(50) DEFAULT 'active', -- active, inactive, completed
  is_primary_vendor BOOLEAN DEFAULT false, -- First vendor gets primary status
  
  -- Permissions
  can_read_core_fields BOOLEAN DEFAULT true,
  can_write_core_fields BOOLEAN DEFAULT false,
  allowed_field_categories TEXT[] DEFAULT ARRAY['couple_info', 'wedding_details', 'venue_info'],
  custom_field_permissions JSONB DEFAULT '{}'::jsonb,
  
  -- Sync Settings
  auto_sync_enabled BOOLEAN DEFAULT true,
  sync_frequency VARCHAR(50) DEFAULT 'realtime', -- realtime, hourly, daily, manual
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_errors JSONB DEFAULT '[]'::jsonb,
  
  -- Activity Tracking
  fields_accessed_count INTEGER DEFAULT 0,
  fields_updated_count INTEGER DEFAULT 0,
  last_access_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(wedding_id, organization_id)
);

-- Form Field Core Mappings
-- Maps form fields to core fields for auto-population
CREATE TABLE IF NOT EXISTS form_field_core_mappings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  form_field_id VARCHAR(255) NOT NULL, -- The field ID within the form JSON
  core_field_key VARCHAR(100) REFERENCES core_fields_definitions(field_key),
  
  -- Mapping Configuration
  mapping_type VARCHAR(50) DEFAULT 'auto', -- auto, manual, suggested
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00 for auto-detected mappings
  is_verified BOOLEAN DEFAULT false,
  sync_direction VARCHAR(50) DEFAULT 'bidirectional', -- read_only, write_only, bidirectional
  
  -- Override Settings
  use_custom_label BOOLEAN DEFAULT false,
  custom_label VARCHAR(255),
  transform_function TEXT, -- Optional JS/SQL function to transform data
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  
  UNIQUE(form_id, form_field_id)
);

-- Core Field Updates Audit Log
-- Tracks all changes to core fields for transparency
CREATE TABLE IF NOT EXISTS core_field_audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wedding_id UUID REFERENCES wedding_core_data(id) ON DELETE CASCADE,
  field_key VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_by_organization UUID REFERENCES organizations(id),
  changed_by_user UUID REFERENCES user_profiles(id),
  change_source VARCHAR(100), -- form_submission, manual_edit, api_update, import
  source_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Core Field Access Log
-- Tracks which vendors access which fields (for privacy/compliance)
CREATE TABLE IF NOT EXISTS core_field_access_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wedding_id UUID REFERENCES wedding_core_data(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES user_profiles(id),
  fields_accessed TEXT[],
  access_type VARCHAR(50), -- read, write, export
  access_context VARCHAR(100), -- form_view, form_submission, report, export
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Core Field Definitions
INSERT INTO core_fields_definitions (field_key, field_name, field_type, category, description, sort_order) VALUES
  -- Couple Information
  ('bride_first_name', 'Bride First Name', 'text', 'couple_info', 'First name of the bride', 1),
  ('bride_last_name', 'Bride Last Name', 'text', 'couple_info', 'Last name of the bride', 2),
  ('bride_email', 'Bride Email', 'email', 'couple_info', 'Email address of the bride', 3),
  ('bride_phone', 'Bride Phone', 'tel', 'couple_info', 'Phone number of the bride', 4),
  ('groom_first_name', 'Groom First Name', 'text', 'couple_info', 'First name of the groom', 5),
  ('groom_last_name', 'Groom Last Name', 'text', 'couple_info', 'Last name of the groom', 6),
  ('groom_email', 'Groom Email', 'email', 'couple_info', 'Email address of the groom', 7),
  ('groom_phone', 'Groom Phone', 'tel', 'couple_info', 'Phone number of the groom', 8),
  
  -- Wedding Details
  ('wedding_date', 'Wedding Date', 'date', 'wedding_details', 'Date of the wedding ceremony', 10),
  ('ceremony_time', 'Ceremony Time', 'time', 'wedding_details', 'Start time of the ceremony', 11),
  ('reception_time', 'Reception Time', 'time', 'wedding_details', 'Start time of the reception', 12),
  ('guest_count', 'Total Guest Count', 'number', 'wedding_details', 'Total number of expected guests', 13),
  ('adult_guests', 'Adult Guests', 'number', 'wedding_details', 'Number of adult guests', 14),
  ('child_guests', 'Child Guests', 'number', 'wedding_details', 'Number of child guests', 15),
  ('wedding_party_size', 'Wedding Party Size', 'number', 'wedding_details', 'Number of people in wedding party', 16),
  
  -- Ceremony Venue
  ('ceremony_venue_name', 'Ceremony Venue Name', 'text', 'venue_info', 'Name of the ceremony venue', 20),
  ('ceremony_venue_address', 'Ceremony Venue Address', 'address', 'venue_info', 'Full address of ceremony venue', 21),
  ('ceremony_venue_city', 'Ceremony Venue City', 'text', 'venue_info', 'City of ceremony venue', 22),
  ('ceremony_venue_postcode', 'Ceremony Venue Postcode', 'text', 'venue_info', 'Postcode of ceremony venue', 23),
  ('ceremony_venue_coordinator', 'Ceremony Venue Coordinator', 'text', 'venue_info', 'Name of venue coordinator', 24),
  
  -- Reception Venue
  ('reception_venue_name', 'Reception Venue Name', 'text', 'venue_info', 'Name of the reception venue', 30),
  ('reception_venue_address', 'Reception Venue Address', 'address', 'venue_info', 'Full address of reception venue', 31),
  ('reception_venue_city', 'Reception Venue City', 'text', 'venue_info', 'City of reception venue', 32),
  ('reception_venue_postcode', 'Reception Venue Postcode', 'text', 'venue_info', 'Postcode of reception venue', 33),
  ('reception_venue_coordinator', 'Reception Venue Coordinator', 'text', 'venue_info', 'Name of venue coordinator', 34),
  
  -- Timeline
  ('getting_ready_time', 'Getting Ready Time', 'time', 'timeline', 'Time to start getting ready', 40),
  ('getting_ready_location', 'Getting Ready Location', 'text', 'timeline', 'Location for getting ready', 41),
  ('first_look_time', 'First Look Time', 'time', 'timeline', 'Time for first look photos', 42),
  ('first_look_location', 'First Look Location', 'text', 'timeline', 'Location for first look', 43),
  ('cocktail_hour_time', 'Cocktail Hour Time', 'time', 'timeline', 'Start time of cocktail hour', 44),
  ('dinner_time', 'Dinner Time', 'time', 'timeline', 'Start time of dinner service', 45),
  ('first_dance_time', 'First Dance Time', 'time', 'timeline', 'Time for first dance', 46),
  ('cake_cutting_time', 'Cake Cutting Time', 'time', 'timeline', 'Time for cake cutting', 47),
  ('send_off_time', 'Send Off Time', 'time', 'timeline', 'Time for couple send off', 48)
ON CONFLICT (field_key) DO NOTHING;

-- Create indexes for performance
CREATE INDEX idx_wedding_core_data_wedding_id ON wedding_core_data(wedding_id);
CREATE INDEX idx_wedding_core_data_wedding_date ON wedding_core_data(wedding_date);
CREATE INDEX idx_vendor_wedding_wedding ON vendor_wedding_connections(wedding_id);
CREATE INDEX idx_vendor_wedding_org ON vendor_wedding_connections(organization_id);
CREATE INDEX idx_form_field_mappings_form ON form_field_core_mappings(form_id);
CREATE INDEX idx_form_field_mappings_core ON form_field_core_mappings(core_field_key);
CREATE INDEX idx_core_audit_wedding ON core_field_audit_log(wedding_id);
CREATE INDEX idx_core_audit_date ON core_field_audit_log(created_at);
CREATE INDEX idx_core_access_wedding ON core_field_access_log(wedding_id);
CREATE INDEX idx_core_access_org ON core_field_access_log(organization_id);

-- Enable Row Level Security
ALTER TABLE core_fields_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_core_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_wedding_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_field_core_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_field_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_field_access_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Everyone can read core field definitions
CREATE POLICY "Public can view core field definitions"
  ON core_fields_definitions FOR SELECT
  TO public
  USING (is_active = true);

-- Vendors can only access wedding data they're connected to
CREATE POLICY "Vendors can view connected wedding data"
  ON wedding_core_data FOR SELECT
  USING (
    id IN (
      SELECT wedding_id FROM vendor_wedding_connections
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
      ) AND can_read_core_fields = true
    )
  );

-- Vendors can update wedding data if they have permission
CREATE POLICY "Vendors can update connected wedding data"
  ON wedding_core_data FOR UPDATE
  USING (
    id IN (
      SELECT wedding_id FROM vendor_wedding_connections
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
      ) AND can_write_core_fields = true
    )
  );

-- Vendors can view their own connections
CREATE POLICY "Vendors can view their wedding connections"
  ON vendor_wedding_connections FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Form creators can manage their mappings
CREATE POLICY "Users can manage form field mappings"
  ON form_field_core_mappings FOR ALL
  USING (
    form_id IN (
      SELECT id FROM forms WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Audit logs are append-only and viewable by connected vendors
CREATE POLICY "Vendors can view audit logs for connected weddings"
  ON core_field_audit_log FOR SELECT
  USING (
    wedding_id IN (
      SELECT wedding_id FROM vendor_wedding_connections
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can insert audit logs"
  ON core_field_audit_log FOR INSERT
  WITH CHECK (true);

-- Access logs are append-only
CREATE POLICY "System can insert access logs"
  ON core_field_access_log FOR INSERT
  WITH CHECK (true);

-- Function to auto-sync core fields when form is submitted
CREATE OR REPLACE FUNCTION sync_core_fields_from_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_wedding_id UUID;
  v_mapping RECORD;
  v_old_value TEXT;
  v_new_value TEXT;
BEGIN
  -- Get wedding_id from the client connection
  SELECT w.wedding_id INTO v_wedding_id
  FROM vendor_wedding_connections w
  WHERE w.client_id = NEW.contact_id
    AND w.organization_id = NEW.organization_id
  LIMIT 1;
  
  IF v_wedding_id IS NOT NULL THEN
    -- Process each mapped field
    FOR v_mapping IN 
      SELECT m.* FROM form_field_core_mappings m
      WHERE m.form_id = NEW.form_id
        AND m.sync_direction IN ('write_only', 'bidirectional')
    LOOP
      -- Extract the new value from submission data
      v_new_value := NEW.data->>v_mapping.form_field_id;
      
      IF v_new_value IS NOT NULL THEN
        -- Get current value for audit log
        EXECUTE format('SELECT %I FROM wedding_core_data WHERE id = $1', v_mapping.core_field_key)
        INTO v_old_value
        USING v_wedding_id;
        
        -- Update the core field
        EXECUTE format('UPDATE wedding_core_data SET %I = $1, updated_at = NOW() WHERE id = $2', 
                      v_mapping.core_field_key)
        USING v_new_value, v_wedding_id;
        
        -- Create audit log entry
        INSERT INTO core_field_audit_log (
          wedding_id, field_key, old_value, new_value,
          changed_by_organization, change_source, source_details
        ) VALUES (
          v_wedding_id, v_mapping.core_field_key, v_old_value, v_new_value,
          NEW.organization_id, 'form_submission', 
          jsonb_build_object('form_id', NEW.form_id, 'submission_id', NEW.id)
        );
      END IF;
    END LOOP;
    
    -- Update last_synced_at
    UPDATE wedding_core_data 
    SET last_synced_at = NOW() 
    WHERE id = v_wedding_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-sync
CREATE TRIGGER sync_core_fields_on_submission
AFTER INSERT OR UPDATE ON form_submissions
FOR EACH ROW
EXECUTE FUNCTION sync_core_fields_from_submission();

-- Function to populate form with core fields
CREATE OR REPLACE FUNCTION get_core_fields_for_form(p_form_id UUID, p_wedding_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '{}'::jsonb;
  v_mapping RECORD;
  v_value TEXT;
BEGIN
  -- Check if user has permission to read core fields
  IF NOT EXISTS (
    SELECT 1 FROM vendor_wedding_connections
    WHERE wedding_id = p_wedding_id
      AND organization_id = (SELECT organization_id FROM forms WHERE id = p_form_id)
      AND can_read_core_fields = true
  ) THEN
    RETURN v_result;
  END IF;
  
  -- Get all mapped fields and their values
  FOR v_mapping IN 
    SELECT m.form_field_id, m.core_field_key 
    FROM form_field_core_mappings m
    WHERE m.form_id = p_form_id
      AND m.sync_direction IN ('read_only', 'bidirectional')
  LOOP
    -- Get the core field value
    EXECUTE format('SELECT %I::text FROM wedding_core_data WHERE id = $1', v_mapping.core_field_key)
    INTO v_value
    USING p_wedding_id;
    
    IF v_value IS NOT NULL THEN
      v_result := v_result || jsonb_build_object(v_mapping.form_field_id, v_value);
    END IF;
  END LOOP;
  
  -- Log access
  INSERT INTO core_field_access_log (
    wedding_id, organization_id, user_id, 
    fields_accessed, access_type, access_context
  ) VALUES (
    p_wedding_id,
    (SELECT organization_id FROM forms WHERE id = p_form_id),
    auth.uid(),
    ARRAY(SELECT core_field_key FROM form_field_core_mappings WHERE form_id = p_form_id),
    'read',
    'form_view'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to detect core field from label (for PDF import)
CREATE OR REPLACE FUNCTION detect_core_field_from_label(p_label TEXT)
RETURNS TABLE(field_key VARCHAR, confidence DECIMAL) AS $$
BEGIN
  RETURN QUERY
  WITH label_analysis AS (
    SELECT 
      cfd.field_key,
      CASE
        -- Exact match
        WHEN LOWER(TRIM(p_label)) = LOWER(cfd.field_name) THEN 1.00
        -- Contains field name
        WHEN LOWER(p_label) LIKE '%' || LOWER(cfd.field_name) || '%' THEN 0.90
        -- Common variations
        WHEN LOWER(p_label) SIMILAR TO '%(bride|her)%name%' AND cfd.field_key LIKE 'bride_%name' THEN 0.85
        WHEN LOWER(p_label) SIMILAR TO '%(groom|his)%name%' AND cfd.field_key LIKE 'groom_%name' THEN 0.85
        WHEN LOWER(p_label) SIMILAR TO '%wedding%date%' AND cfd.field_key = 'wedding_date' THEN 0.95
        WHEN LOWER(p_label) SIMILAR TO '%ceremony%time%' AND cfd.field_key = 'ceremony_time' THEN 0.90
        WHEN LOWER(p_label) SIMILAR TO '%venue%' AND cfd.field_key LIKE '%venue_name' THEN 0.80
        WHEN LOWER(p_label) SIMILAR TO '%guest%count%' AND cfd.field_key = 'guest_count' THEN 0.90
        WHEN LOWER(p_label) SIMILAR TO '%email%' AND cfd.field_type = 'email' THEN 0.75
        WHEN LOWER(p_label) SIMILAR TO '%phone%' AND cfd.field_type = 'tel' THEN 0.75
        ELSE 0.00
      END as confidence_score
    FROM core_fields_definitions cfd
    WHERE is_active = true
  )
  SELECT 
    field_key::VARCHAR,
    confidence_score::DECIMAL
  FROM label_analysis
  WHERE confidence_score > 0.70
  ORDER BY confidence_score DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create a demo wedding for testing
INSERT INTO wedding_core_data (
  wedding_id,
  bride_first_name, bride_last_name, bride_email,
  groom_first_name, groom_last_name, groom_email,
  wedding_date, ceremony_time, guest_count,
  ceremony_venue_name, ceremony_venue_city
) VALUES (
  'demo-wedding-001'::uuid,
  'Emma', 'Johnson', 'emma@example.com',
  'James', 'Smith', 'james@example.com',
  '2025-06-15', '14:00', 150,
  'Rosewood Manor', 'London'
) ON CONFLICT (wedding_id) DO NOTHING;