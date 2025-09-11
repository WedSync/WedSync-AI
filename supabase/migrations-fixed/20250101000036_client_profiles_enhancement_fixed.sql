-- WS-032: Client Profiles Enhancement - Fixed version
-- Migration to enhance client profiles with full wedding details, documents, and activities

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add comprehensive wedding fields to clients table (one at a time)
DO $$
BEGIN
    -- Partner information
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'partner_email') THEN
        ALTER TABLE clients ADD COLUMN partner_email VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'partner_phone') THEN
        ALTER TABLE clients ADD COLUMN partner_phone VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'couple_photo_url') THEN
        ALTER TABLE clients ADD COLUMN couple_photo_url VARCHAR(500);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'anniversary_date') THEN
        ALTER TABLE clients ADD COLUMN anniversary_date DATE;
    END IF;
    
    -- Ceremony details
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'ceremony_venue_name') THEN
        ALTER TABLE clients ADD COLUMN ceremony_venue_name VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'ceremony_venue_address') THEN
        ALTER TABLE clients ADD COLUMN ceremony_venue_address TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'ceremony_time') THEN
        ALTER TABLE clients ADD COLUMN ceremony_time TIME;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'ceremony_type') THEN
        ALTER TABLE clients ADD COLUMN ceremony_type VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'officiant_name') THEN
        ALTER TABLE clients ADD COLUMN officiant_name VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'officiant_contact') THEN
        ALTER TABLE clients ADD COLUMN officiant_contact VARCHAR(255);
    END IF;
    
    -- Reception details
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'reception_venue_name') THEN
        ALTER TABLE clients ADD COLUMN reception_venue_name VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'reception_venue_address') THEN
        ALTER TABLE clients ADD COLUMN reception_venue_address TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'reception_time') THEN
        ALTER TABLE clients ADD COLUMN reception_time TIME;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'reception_style') THEN
        ALTER TABLE clients ADD COLUMN reception_style VARCHAR(100);
    END IF;
    
    -- Guest management
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'guest_count_estimated') THEN
        ALTER TABLE clients ADD COLUMN guest_count_estimated INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'guest_count_confirmed') THEN
        ALTER TABLE clients ADD COLUMN guest_count_confirmed INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'guest_count_children') THEN
        ALTER TABLE clients ADD COLUMN guest_count_children INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'plus_ones_allowed') THEN
        ALTER TABLE clients ADD COLUMN plus_ones_allowed BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'guest_list') THEN
        ALTER TABLE clients ADD COLUMN guest_list JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Budget tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'budget_total') THEN
        ALTER TABLE clients ADD COLUMN budget_total DECIMAL(12, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'budget_spent') THEN
        ALTER TABLE clients ADD COLUMN budget_spent DECIMAL(12, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'budget_categories') THEN
        ALTER TABLE clients ADD COLUMN budget_categories JSONB DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'payment_status') THEN
        ALTER TABLE clients ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending';
    END IF;
    
    -- Timeline & schedule
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'wedding_timeline') THEN
        ALTER TABLE clients ADD COLUMN wedding_timeline JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'key_milestones') THEN
        ALTER TABLE clients ADD COLUMN key_milestones JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'rehearsal_date') THEN
        ALTER TABLE clients ADD COLUMN rehearsal_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'rehearsal_time') THEN
        ALTER TABLE clients ADD COLUMN rehearsal_time TIME;
    END IF;
    
    -- Vendor assignments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'assigned_vendors') THEN
        ALTER TABLE clients ADD COLUMN assigned_vendors JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'preferred_vendors') THEN
        ALTER TABLE clients ADD COLUMN preferred_vendors JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Special requirements
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'dietary_requirements') THEN
        ALTER TABLE clients ADD COLUMN dietary_requirements JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'accessibility_needs') THEN
        ALTER TABLE clients ADD COLUMN accessibility_needs TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'cultural_requirements') THEN
        ALTER TABLE clients ADD COLUMN cultural_requirements TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'religious_requirements') THEN
        ALTER TABLE clients ADD COLUMN religious_requirements TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'special_requests') THEN
        ALTER TABLE clients ADD COLUMN special_requests TEXT;
    END IF;
    
    -- Theme & preferences
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'wedding_theme') THEN
        ALTER TABLE clients ADD COLUMN wedding_theme VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'color_scheme') THEN
        ALTER TABLE clients ADD COLUMN color_scheme JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'music_preferences') THEN
        ALTER TABLE clients ADD COLUMN music_preferences TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'photography_style') THEN
        ALTER TABLE clients ADD COLUMN photography_style VARCHAR(100);
    END IF;
    
    -- Communication preferences
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'preferred_contact_time') THEN
        ALTER TABLE clients ADD COLUMN preferred_contact_time VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'preferred_language') THEN
        ALTER TABLE clients ADD COLUMN preferred_language VARCHAR(50) DEFAULT 'en';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'communication_notes') THEN
        ALTER TABLE clients ADD COLUMN communication_notes TEXT;
    END IF;
    
    -- Metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'profile_completion_score') THEN
        ALTER TABLE clients ADD COLUMN profile_completion_score INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'last_profile_update') THEN
        ALTER TABLE clients ADD COLUMN last_profile_update TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'profile_verified') THEN
        ALTER TABLE clients ADD COLUMN profile_verified BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'verified_at') THEN
        ALTER TABLE clients ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'verified_by') THEN
        ALTER TABLE clients ADD COLUMN verified_by UUID REFERENCES users(id);
    END IF;
END
$$;

-- CLIENT DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS client_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(100) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  version_number INTEGER DEFAULT 1,
  is_latest BOOLEAN DEFAULT true,
  parent_document_id UUID REFERENCES client_documents(id),
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  is_confidential BOOLEAN DEFAULT false,
  encryption_key_id VARCHAR(255),
  access_level VARCHAR(50) DEFAULT 'team',
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_by_name VARCHAR(255) NOT NULL,
  modified_at TIMESTAMP WITH TIME ZONE,
  modified_by UUID REFERENCES users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_signed BOOLEAN DEFAULT false,
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_by JSONB DEFAULT '[]'::jsonb,
  search_content TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- CLIENT COMMUNICATIONS TABLE
CREATE TABLE IF NOT EXISTS client_communications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  communication_type VARCHAR(50) NOT NULL,
  direction VARCHAR(20) NOT NULL,
  subject VARCHAR(500),
  content TEXT,
  summary TEXT,
  from_user UUID REFERENCES users(id),
  from_email VARCHAR(255),
  from_name VARCHAR(255),
  to_email VARCHAR(255),
  to_name VARCHAR(255),
  cc_emails TEXT[],
  communication_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER,
  location VARCHAR(255),
  meeting_type VARCHAR(50),
  response_required BOOLEAN DEFAULT false,
  response_due_date DATE,
  response_status VARCHAR(50),
  response_time_hours INTEGER,
  attachments JSONB DEFAULT '[]'::jsonb,
  recording_url VARCHAR(500),
  meeting_notes_url VARCHAR(500),
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  follow_up_notes TEXT,
  follow_up_completed BOOLEAN DEFAULT false,
  sentiment VARCHAR(20),
  importance VARCHAR(20) DEFAULT 'normal',
  external_id VARCHAR(255),
  source_system VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- CLIENT MILESTONES TABLE
CREATE TABLE IF NOT EXISTS client_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  milestone_name VARCHAR(255) NOT NULL,
  milestone_type VARCHAR(100) NOT NULL,
  description TEXT,
  target_date DATE NOT NULL,
  completed_date DATE,
  is_completed BOOLEAN DEFAULT false,
  depends_on UUID[] DEFAULT '{}',
  blocks UUID[] DEFAULT '{}',
  reminder_days_before INTEGER[] DEFAULT '{30, 14, 7, 1}',
  reminder_sent_dates TIMESTAMP WITH TIME ZONE[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  completed_by UUID REFERENCES users(id)
);

-- Add activity tracking columns to client_activities if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_activities') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_activities' AND column_name = 'activity_category') THEN
            ALTER TABLE client_activities ADD COLUMN activity_category VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_activities' AND column_name = 'activity_severity') THEN
            ALTER TABLE client_activities ADD COLUMN activity_severity VARCHAR(20) DEFAULT 'info';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_activities' AND column_name = 'is_automated') THEN
            ALTER TABLE client_activities ADD COLUMN is_automated BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_activities' AND column_name = 'is_client_visible') THEN
            ALTER TABLE client_activities ADD COLUMN is_client_visible BOOLEAN DEFAULT false;
        END IF;
    END IF;
END
$$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_wedding_date_range 
  ON clients(wedding_date) 
  WHERE wedding_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_status_date 
  ON clients(status, wedding_date);

CREATE INDEX IF NOT EXISTS idx_clients_budget_range 
  ON clients(budget_total) 
  WHERE budget_total IS NOT NULL;

-- Document indexes
CREATE INDEX IF NOT EXISTS idx_client_documents_client 
  ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_type 
  ON client_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_client_documents_uploaded 
  ON client_documents(uploaded_at DESC);

-- Communication indexes
CREATE INDEX IF NOT EXISTS idx_client_communications_client 
  ON client_communications(client_id);
CREATE INDEX IF NOT EXISTS idx_client_communications_date 
  ON client_communications(communication_date DESC);

-- Milestone indexes
CREATE INDEX IF NOT EXISTS idx_client_milestones_client 
  ON client_milestones(client_id);

-- Enable RLS on new tables
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies using auth.uid() directly
CREATE POLICY "client_documents_org_access" ON client_documents
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "client_communications_org_access" ON client_communications
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "client_milestones_org_access" ON client_milestones
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Function to calculate profile completion score
CREATE OR REPLACE FUNCTION calculate_profile_completion_score(client_id UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  client_record RECORD;
BEGIN
  SELECT * INTO client_record FROM clients WHERE id = client_id;
  
  -- Basic information (30 points)
  IF client_record.first_name IS NOT NULL THEN score := score + 5; END IF;
  IF client_record.last_name IS NOT NULL THEN score := score + 5; END IF;
  IF client_record.email IS NOT NULL THEN score := score + 5; END IF;
  IF client_record.phone IS NOT NULL THEN score := score + 5; END IF;
  IF client_record.partner_first_name IS NOT NULL THEN score := score + 5; END IF;
  IF client_record.partner_email IS NOT NULL THEN score := score + 5; END IF;
  
  -- Wedding details (40 points)
  IF client_record.wedding_date IS NOT NULL THEN score := score + 10; END IF;
  IF client_record.ceremony_venue_name IS NOT NULL THEN score := score + 10; END IF;
  IF client_record.guest_count_estimated IS NOT NULL THEN score := score + 10; END IF;
  IF client_record.budget_total IS NOT NULL THEN score := score + 10; END IF;
  
  -- Additional information (30 points)
  IF client_record.wedding_theme IS NOT NULL THEN score := score + 10; END IF;
  IF jsonb_array_length(client_record.wedding_timeline) > 0 THEN score := score + 10; END IF;
  IF jsonb_array_length(client_record.assigned_vendors) > 0 THEN score := score + 10; END IF;
  
  RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON client_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_communications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_milestones TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_profile_completion_score TO authenticated;