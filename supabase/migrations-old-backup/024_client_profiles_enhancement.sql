-- WS-032: Client Profiles Enhancement - Comprehensive Wedding Data & Activity Tracking
-- Migration to enhance client profiles with full wedding details, documents, and activities
-- Created: 2025-08-21
-- Priority: P1

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENHANCE CLIENTS TABLE WITH WEDDING DETAILS
-- =====================================================

-- Add comprehensive wedding fields to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS
  -- Enhanced couple information
  partner_email VARCHAR(255),
  partner_phone VARCHAR(50),
  couple_photo_url VARCHAR(500),
  anniversary_date DATE,
  
  -- Wedding ceremony details
  ceremony_venue_name VARCHAR(255),
  ceremony_venue_address TEXT,
  ceremony_time TIME,
  ceremony_type VARCHAR(100), -- religious, civil, outdoor, etc.
  officiant_name VARCHAR(255),
  officiant_contact VARCHAR(255),
  
  -- Reception details
  reception_venue_name VARCHAR(255),
  reception_venue_address TEXT,
  reception_time TIME,
  reception_style VARCHAR(100), -- formal, casual, cocktail, etc.
  
  -- Guest management
  guest_count_estimated INTEGER,
  guest_count_confirmed INTEGER,
  guest_count_children INTEGER,
  plus_ones_allowed BOOLEAN DEFAULT false,
  guest_list JSONB DEFAULT '[]'::jsonb, -- Structured guest data
  
  -- Budget tracking
  budget_total DECIMAL(12, 2),
  budget_spent DECIMAL(12, 2),
  budget_categories JSONB DEFAULT '{}'::jsonb, -- Category breakdowns
  payment_status VARCHAR(50) DEFAULT 'pending',
  
  -- Timeline & schedule
  wedding_timeline JSONB DEFAULT '[]'::jsonb, -- Array of timeline events
  key_milestones JSONB DEFAULT '[]'::jsonb, -- Important dates/deadlines
  rehearsal_date DATE,
  rehearsal_time TIME,
  
  -- Vendor assignments
  assigned_vendors JSONB DEFAULT '[]'::jsonb, -- Array of vendor IDs & roles
  preferred_vendors JSONB DEFAULT '[]'::jsonb,
  
  -- Special requirements
  dietary_requirements JSONB DEFAULT '[]'::jsonb, -- Guest dietary needs
  accessibility_needs TEXT,
  cultural_requirements TEXT,
  religious_requirements TEXT,
  special_requests TEXT,
  
  -- Theme & preferences
  wedding_theme VARCHAR(255),
  color_scheme JSONB DEFAULT '[]'::jsonb, -- Array of colors
  music_preferences TEXT,
  photography_style VARCHAR(100),
  
  -- Communication preferences
  preferred_contact_time VARCHAR(50), -- morning, afternoon, evening
  preferred_language VARCHAR(50) DEFAULT 'en',
  communication_notes TEXT,
  
  -- Metadata
  profile_completion_score INTEGER DEFAULT 0,
  last_profile_update TIMESTAMP WITH TIME ZONE,
  profile_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES user_profiles(id);

-- =====================================================
-- CLIENT DOCUMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS client_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Document information
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(100) NOT NULL, -- contract, invoice, photo, permit, etc.
  file_path VARCHAR(500) NOT NULL, -- Supabase storage path
  file_size INTEGER NOT NULL, -- Size in bytes
  mime_type VARCHAR(100) NOT NULL,
  
  -- Version control
  version_number INTEGER DEFAULT 1,
  is_latest BOOLEAN DEFAULT true,
  parent_document_id UUID REFERENCES client_documents(id),
  
  -- Document metadata
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  category VARCHAR(100), -- legal, financial, design, etc.
  status VARCHAR(50) DEFAULT 'active', -- active, archived, deleted
  
  -- Security & privacy
  is_confidential BOOLEAN DEFAULT false,
  encryption_key_id VARCHAR(255), -- For sensitive documents
  access_level VARCHAR(50) DEFAULT 'team', -- owner, team, client
  
  -- Timestamps & audit
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID NOT NULL REFERENCES user_profiles(id),
  uploaded_by_name VARCHAR(255) NOT NULL,
  modified_at TIMESTAMP WITH TIME ZONE,
  modified_by UUID REFERENCES user_profiles(id),
  expires_at TIMESTAMP WITH TIME ZONE, -- For temporary documents
  
  -- Document properties
  is_signed BOOLEAN DEFAULT false,
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_by JSONB DEFAULT '[]'::jsonb, -- Array of signatory info
  
  -- Search
  search_content TEXT, -- Extracted text for search
  metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- CLIENT COMMUNICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS client_communications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Communication details
  communication_type VARCHAR(50) NOT NULL, -- email, phone, meeting, text, video_call
  direction VARCHAR(20) NOT NULL, -- inbound, outbound
  subject VARCHAR(500),
  content TEXT,
  summary TEXT, -- Brief summary for quick review
  
  -- Participants
  from_user UUID REFERENCES user_profiles(id),
  from_email VARCHAR(255),
  from_name VARCHAR(255),
  to_email VARCHAR(255),
  to_name VARCHAR(255),
  cc_emails TEXT[], -- Array of CC recipients
  
  -- Communication metadata
  communication_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER, -- For calls/meetings
  location VARCHAR(255), -- For in-person meetings
  meeting_type VARCHAR(50), -- initial_consultation, planning, venue_visit, etc.
  
  -- Response tracking
  response_required BOOLEAN DEFAULT false,
  response_due_date DATE,
  response_status VARCHAR(50), -- pending, responded, no_response_needed
  response_time_hours INTEGER, -- Time to respond in hours
  
  -- Attachments & links
  attachments JSONB DEFAULT '[]'::jsonb, -- Array of document IDs
  recording_url VARCHAR(500), -- For recorded calls
  meeting_notes_url VARCHAR(500),
  
  -- Follow-up
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  follow_up_notes TEXT,
  follow_up_completed BOOLEAN DEFAULT false,
  
  -- Sentiment & importance
  sentiment VARCHAR(20), -- positive, neutral, negative, urgent
  importance VARCHAR(20) DEFAULT 'normal', -- low, normal, high, critical
  
  -- Integration
  external_id VARCHAR(255), -- ID from email system, CRM, etc.
  source_system VARCHAR(100), -- manual, email_integration, phone_system
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- CLIENT MILESTONES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS client_milestones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Milestone details
  milestone_name VARCHAR(255) NOT NULL,
  milestone_type VARCHAR(100) NOT NULL, -- booking, payment, planning, delivery
  description TEXT,
  
  -- Timing
  target_date DATE NOT NULL,
  completed_date DATE,
  is_completed BOOLEAN DEFAULT false,
  
  -- Dependencies
  depends_on UUID[] DEFAULT '{}', -- Array of milestone IDs
  blocks UUID[] DEFAULT '{}', -- Milestones this blocks
  
  -- Notification settings
  reminder_days_before INTEGER[] DEFAULT '{30, 14, 7, 1}',
  reminder_sent_dates TIMESTAMP WITH TIME ZONE[],
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  completed_by UUID REFERENCES user_profiles(id)
);

-- =====================================================
-- ENHANCED ACTIVITY TRACKING
-- =====================================================

-- Add more activity type support
ALTER TABLE client_activities ADD COLUMN IF NOT EXISTS
  activity_category VARCHAR(50), -- communication, document, payment, milestone, etc.
  activity_severity VARCHAR(20) DEFAULT 'info', -- info, warning, error, success
  is_automated BOOLEAN DEFAULT false,
  is_client_visible BOOLEAN DEFAULT false;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Client profile search indexes
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
CREATE INDEX IF NOT EXISTS idx_client_documents_latest 
  ON client_documents(client_id, is_latest) 
  WHERE is_latest = true;

-- Communication indexes
CREATE INDEX IF NOT EXISTS idx_client_communications_client 
  ON client_communications(client_id);
CREATE INDEX IF NOT EXISTS idx_client_communications_date 
  ON client_communications(communication_date DESC);
CREATE INDEX IF NOT EXISTS idx_client_communications_type 
  ON client_communications(communication_type);
CREATE INDEX IF NOT EXISTS idx_client_communications_follow_up 
  ON client_communications(follow_up_date) 
  WHERE follow_up_required = true AND follow_up_completed = false;

-- Milestone indexes
CREATE INDEX IF NOT EXISTS idx_client_milestones_client 
  ON client_milestones(client_id);
CREATE INDEX IF NOT EXISTS idx_client_milestones_target 
  ON client_milestones(target_date) 
  WHERE is_completed = false;

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_clients_full_search ON clients USING gin(
  to_tsvector('english',
    COALESCE(first_name, '') || ' ' ||
    COALESCE(last_name, '') || ' ' ||
    COALESCE(partner_first_name, '') || ' ' ||
    COALESCE(partner_last_name, '') || ' ' ||
    COALESCE(email, '') || ' ' ||
    COALESCE(partner_email, '') || ' ' ||
    COALESCE(venue_name, '') || ' ' ||
    COALESCE(ceremony_venue_name, '') || ' ' ||
    COALESCE(reception_venue_name, '') || ' ' ||
    COALESCE(wedding_theme, '')
  )
);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_milestones ENABLE ROW LEVEL SECURITY;

-- Client Documents RLS
CREATE POLICY "client_documents_org_access" ON client_documents
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Client Communications RLS
CREATE POLICY "client_communications_org_access" ON client_communications
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Client Milestones RLS
CREATE POLICY "client_milestones_org_access" ON client_milestones
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS FOR DATA MANAGEMENT
-- =====================================================

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

-- Function to track activity
CREATE OR REPLACE FUNCTION track_client_activity(
  p_client_id UUID,
  p_organization_id UUID,
  p_activity_type VARCHAR(100),
  p_activity_title VARCHAR(255),
  p_activity_description TEXT,
  p_performed_by UUID,
  p_performed_by_name VARCHAR(255),
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO client_activities (
    client_id,
    organization_id,
    activity_type,
    activity_title,
    activity_description,
    performed_by,
    performed_by_name,
    metadata,
    is_automated,
    created_at
  ) VALUES (
    p_client_id,
    p_organization_id,
    p_activity_type,
    p_activity_title,
    p_activity_description,
    p_performed_by,
    p_performed_by_name,
    p_metadata,
    false,
    NOW()
  ) RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update profile completion score
CREATE OR REPLACE FUNCTION update_profile_completion_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profile_completion_score := calculate_profile_completion_score(NEW.id);
  NEW.last_profile_update := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_profile_completion
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_completion_trigger();

-- Trigger to track document uploads
CREATE OR REPLACE FUNCTION track_document_upload_trigger()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM track_client_activity(
    NEW.client_id,
    NEW.organization_id,
    'document_uploaded',
    'Document uploaded: ' || NEW.document_name,
    'Document type: ' || NEW.document_type || ', Size: ' || (NEW.file_size / 1024)::INTEGER || 'KB',
    NEW.uploaded_by,
    NEW.uploaded_by_name,
    jsonb_build_object('document_id', NEW.id, 'document_type', NEW.document_type)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_document_upload
  AFTER INSERT ON client_documents
  FOR EACH ROW
  EXECUTE FUNCTION track_document_upload_trigger();

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON client_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_communications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_milestones TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_profile_completion_score TO authenticated;
GRANT EXECUTE ON FUNCTION track_client_activity TO authenticated;

-- =====================================================
-- PERFORMANCE MONITORING
-- =====================================================

-- Create view for monitoring client profile completeness
CREATE OR REPLACE VIEW client_profile_stats AS
SELECT 
  organization_id,
  COUNT(*) as total_clients,
  AVG(profile_completion_score)::INTEGER as avg_completion_score,
  COUNT(*) FILTER (WHERE profile_completion_score >= 80) as well_completed_profiles,
  COUNT(*) FILTER (WHERE profile_completion_score < 50) as incomplete_profiles,
  COUNT(*) FILTER (WHERE wedding_date >= CURRENT_DATE) as upcoming_weddings,
  COUNT(*) FILTER (WHERE wedding_date < CURRENT_DATE) as past_weddings,
  COUNT(DISTINCT client_id) FILTER (WHERE EXISTS (
    SELECT 1 FROM client_documents WHERE client_documents.client_id = clients.id
  )) as clients_with_documents,
  COUNT(DISTINCT client_id) FILTER (WHERE EXISTS (
    SELECT 1 FROM client_communications WHERE client_communications.client_id = clients.id
  )) as clients_with_communications
FROM clients
GROUP BY organization_id;

GRANT SELECT ON client_profile_stats TO authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE client_documents IS 'Stores all client-related documents with version control and security features';
COMMENT ON TABLE client_communications IS 'Tracks all communications with clients including emails, calls, and meetings';
COMMENT ON TABLE client_milestones IS 'Manages important milestones and deadlines for each wedding';
COMMENT ON COLUMN clients.profile_completion_score IS 'Automatically calculated score (0-100) indicating profile completeness';
COMMENT ON COLUMN clients.guest_list IS 'JSONB array of guest objects with name, email, dietary requirements, etc.';
COMMENT ON COLUMN clients.wedding_timeline IS 'JSONB array of timeline events with time, description, and responsible party';
COMMENT ON FUNCTION calculate_profile_completion_score IS 'Calculates profile completion percentage based on filled fields';
COMMENT ON FUNCTION track_client_activity IS 'Records activity in the client activity log for audit and timeline';