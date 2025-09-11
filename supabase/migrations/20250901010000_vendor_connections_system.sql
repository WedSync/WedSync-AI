-- WS-214 Vendor Connections System Migration
-- Team A: VendorConnectionHub, NetworkingInterface, CollaborationTools

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vendor Connection Requests Table
-- Tracks connection requests between vendors
CREATE TABLE IF NOT EXISTS vendor_connection_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  from_vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  to_vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Business names for quick access (denormalized for performance)
  from_business_name VARCHAR(255) NOT NULL,
  to_business_name VARCHAR(255) NOT NULL,
  
  -- Request details
  message TEXT DEFAULT 'I would like to connect with you for potential collaboration opportunities.',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  category VARCHAR(100), -- Category of the requesting vendor
  
  -- Response tracking
  responded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(from_vendor_id, to_vendor_id, status) DEFERRABLE INITIALLY DEFERRED,
  CHECK (from_vendor_id != to_vendor_id)
);

-- Vendor Connections Table  
-- Tracks established connections between vendors (bidirectional)
CREATE TABLE IF NOT EXISTS vendor_connections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  connected_vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Connection details
  status VARCHAR(20) DEFAULT 'accepted' CHECK (status IN ('accepted', 'blocked', 'inactive')),
  connection_type VARCHAR(20) DEFAULT 'mutual' CHECK (connection_type IN ('mutual', 'follower', 'blocked')),
  connection_strength INTEGER DEFAULT 1, -- 1-5 scale based on interactions
  
  -- Connection analytics
  total_interactions INTEGER DEFAULT 0,
  shared_projects_count INTEGER DEFAULT 0,
  referrals_sent INTEGER DEFAULT 0,
  referrals_received INTEGER DEFAULT 0,
  last_interaction_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(vendor_id, connected_vendor_id),
  CHECK (vendor_id != connected_vendor_id)
);

-- Networking Recommendations Table
-- Stores AI-generated networking recommendations for vendors
CREATE TABLE IF NOT EXISTS vendor_networking_recommendations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  recommended_vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Recommendation details
  recommendation_reason TEXT NOT NULL,
  recommendation_score INTEGER NOT NULL CHECK (recommendation_score >= 0 AND recommendation_score <= 100),
  recommendation_type VARCHAR(50) DEFAULT 'general' CHECK (recommendation_type IN (
    'general', 'location_based', 'category_complementary', 'rating_similar', 
    'mutual_connections', 'shared_clients', 'collaboration_opportunity'
  )),
  
  -- Analytics factors
  mutual_connections_count INTEGER DEFAULT 0,
  shared_clients_count INTEGER DEFAULT 0,
  geographic_overlap BOOLEAN DEFAULT FALSE,
  complementary_services BOOLEAN DEFAULT FALSE,
  similar_rating_tier BOOLEAN DEFAULT FALSE,
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'connected', 'dismissed', 'expired')),
  viewed_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(vendor_id, recommended_vendor_id),
  CHECK (vendor_id != recommended_vendor_id)
);

-- Referral Opportunities Table
-- Manages referral opportunities shared within the vendor network
CREATE TABLE IF NOT EXISTS vendor_referral_opportunities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  posted_by_vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Client/wedding details
  client_name VARCHAR(255) NOT NULL,
  wedding_date DATE NOT NULL,
  venue_name VARCHAR(255),
  venue_location VARCHAR(255) NOT NULL,
  guest_count INTEGER,
  budget_range VARCHAR(50),
  description TEXT,
  
  -- Service requirements
  services_needed TEXT[] NOT NULL, -- Array of service categories needed
  special_requirements TEXT,
  
  -- Referral details
  referral_fee_percentage DECIMAL(5,2) CHECK (referral_fee_percentage >= 0 AND referral_fee_percentage <= 50),
  referral_fee_amount DECIMAL(10,2),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Status and timeline
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'filled', 'expired', 'cancelled')),
  applications_count INTEGER DEFAULT 0,
  max_applications INTEGER DEFAULT 5,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Visibility and targeting
  visibility VARCHAR(20) DEFAULT 'network' CHECK (visibility IN ('public', 'network', 'connections_only')),
  target_categories TEXT[], -- Specific vendor categories to target
  target_locations TEXT[], -- Specific locations to target
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referral Applications Table
-- Tracks vendor applications for referral opportunities
CREATE TABLE IF NOT EXISTS vendor_referral_applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  opportunity_id UUID REFERENCES vendor_referral_opportunities(id) ON DELETE CASCADE,
  applicant_vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Application details
  cover_message TEXT,
  proposed_price DECIMAL(10,2),
  availability_confirmed BOOLEAN DEFAULT FALSE,
  portfolio_samples TEXT[], -- Array of portfolio image URLs
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn')),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  response_message TEXT,
  
  -- Timestamps
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(opportunity_id, applicant_vendor_id)
);

-- Networking Events Table
-- Manages virtual and in-person networking events
CREATE TABLE IF NOT EXISTS vendor_networking_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Event details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('virtual', 'in_person', 'hybrid')),
  
  -- Date and location
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  location VARCHAR(255), -- Required for in_person and hybrid events
  virtual_link VARCHAR(500), -- Required for virtual and hybrid events
  
  -- Organization details
  organizer VARCHAR(255) NOT NULL,
  organizer_contact VARCHAR(255),
  
  -- Attendee management
  max_attendees INTEGER DEFAULT 50,
  current_attendees INTEGER DEFAULT 0,
  registration_fee DECIMAL(8,2) DEFAULT 0,
  registration_deadline TIMESTAMP WITH TIME ZONE,
  
  -- Targeting
  target_categories TEXT[], -- Specific vendor categories
  target_experience_levels TEXT[], -- e.g., 'beginner', 'intermediate', 'expert'
  networking_focus TEXT[], -- e.g., 'collaboration', 'referrals', 'education'
  
  -- Status
  status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('draft', 'upcoming', 'ongoing', 'completed', 'cancelled')),
  
  -- Analytics
  networking_score INTEGER DEFAULT 0, -- Quality rating of networking potential
  follow_up_connections INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event Registrations Table
-- Tracks vendor registrations for networking events
CREATE TABLE IF NOT EXISTS vendor_event_registrations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES vendor_networking_events(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Registration details
  registration_status VARCHAR(20) DEFAULT 'registered' CHECK (registration_status IN (
    'registered', 'waitlisted', 'confirmed', 'attended', 'no_show', 'cancelled'
  )),
  special_interests TEXT, -- What the vendor hopes to gain from the event
  willing_to_mentor BOOLEAN DEFAULT FALSE,
  seeking_mentorship BOOLEAN DEFAULT FALSE,
  
  -- Payment tracking (if applicable)
  payment_status VARCHAR(20) DEFAULT 'not_required' CHECK (payment_status IN (
    'not_required', 'pending', 'paid', 'refunded'
  )),
  payment_amount DECIMAL(8,2),
  
  -- Event interaction tracking
  attended BOOLEAN DEFAULT FALSE,
  connections_made INTEGER DEFAULT 0,
  follow_up_messages_sent INTEGER DEFAULT 0,
  
  -- Timestamps
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(event_id, vendor_id)
);

-- Collaborative Projects Table
-- Manages joint projects between connected vendors
CREATE TABLE IF NOT EXISTS vendor_collaborative_projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  lead_vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Project details
  project_name VARCHAR(255) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  wedding_date DATE,
  venue_name VARCHAR(255),
  venue_location VARCHAR(255),
  
  -- Project management
  project_status VARCHAR(20) DEFAULT 'planning' CHECK (project_status IN (
    'planning', 'active', 'completed', 'cancelled', 'on_hold'
  )),
  total_budget DECIMAL(12,2),
  shared_budget DECIMAL(12,2), -- Budget allocated for shared expenses
  
  -- Collaboration settings
  revenue_sharing_model VARCHAR(20) DEFAULT 'percentage' CHECK (revenue_sharing_model IN (
    'percentage', 'fixed_amount', 'equal_split', 'lead_managed'
  )),
  shared_expenses_handling VARCHAR(20) DEFAULT 'proportional' CHECK (shared_expenses_handling IN (
    'proportional', 'equal', 'lead_pays', 'separate'
  )),
  
  -- Project tracking
  shared_tasks_count INTEGER DEFAULT 0,
  completed_tasks_count INTEGER DEFAULT 0,
  shared_documents_count INTEGER DEFAULT 0,
  total_messages_count INTEGER DEFAULT 0,
  
  -- Timeline
  project_start_date DATE,
  project_end_date DATE,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project Collaborators Table
-- Tracks vendors participating in collaborative projects
CREATE TABLE IF NOT EXISTS project_collaborators (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES vendor_collaborative_projects(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Collaboration role
  collaboration_role VARCHAR(100), -- e.g., 'photographer', 'coordinator', 'florist'
  role_description TEXT,
  is_lead BOOLEAN DEFAULT FALSE,
  
  -- Financial details
  revenue_share_percentage DECIMAL(5,2) DEFAULT 0,
  fixed_payment_amount DECIMAL(10,2),
  expense_responsibility DECIMAL(5,2) DEFAULT 0, -- Percentage of shared expenses
  
  -- Status and permissions
  invitation_status VARCHAR(20) DEFAULT 'invited' CHECK (invitation_status IN (
    'invited', 'accepted', 'declined', 'removed'
  )),
  permissions JSONB DEFAULT '{"view": true, "edit": false, "admin": false}',
  
  -- Participation tracking
  tasks_assigned INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  documents_uploaded INTEGER DEFAULT 0,
  last_active_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(project_id, vendor_id)
);

-- Project Shared Tasks Table
-- Manages tasks within collaborative projects
CREATE TABLE IF NOT EXISTS project_shared_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES vendor_collaborative_projects(id) ON DELETE CASCADE,
  created_by_vendor_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  assigned_to_vendor_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  
  -- Task details
  task_title VARCHAR(255) NOT NULL,
  task_description TEXT,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Status and timeline
  task_status VARCHAR(20) DEFAULT 'todo' CHECK (task_status IN ('todo', 'in_progress', 'review', 'completed', 'cancelled')),
  due_date TIMESTAMP WITH TIME ZONE,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  
  -- Task relationships
  dependencies TEXT[], -- Array of task IDs that must be completed first
  tags TEXT[], -- Flexible tagging system
  
  -- Collaboration tracking
  comments_count INTEGER DEFAULT 0,
  attachments_count INTEGER DEFAULT 0,
  completion_percentage INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project Messages Table
-- Handles communication within collaborative projects
CREATE TABLE IF NOT EXISTS project_collaboration_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES vendor_collaborative_projects(id) ON DELETE CASCADE,
  sender_vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Message content
  message_content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN (
    'text', 'task_update', 'document_share', 'system', 'announcement'
  )),
  
  -- Message targeting
  recipient_vendor_ids UUID[], -- Specific recipients, NULL for all project members
  is_broadcast BOOLEAN DEFAULT TRUE, -- Whether visible to all project members
  
  -- Message properties
  is_pinned BOOLEAN DEFAULT FALSE,
  is_urgent BOOLEAN DEFAULT FALSE,
  thread_parent_id UUID REFERENCES project_collaboration_messages(id) ON DELETE SET NULL,
  
  -- Attachments and references
  attachments JSONB DEFAULT '[]', -- Array of attachment metadata
  referenced_task_id UUID REFERENCES project_shared_tasks(id) ON DELETE SET NULL,
  referenced_document_id UUID, -- References to shared documents
  
  -- Status tracking
  read_by_vendor_ids UUID[] DEFAULT '{}', -- Array of vendor IDs who have read the message
  
  -- Timestamps
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Project Shared Documents Table
-- Manages document sharing within collaborative projects
CREATE TABLE IF NOT EXISTS project_shared_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES vendor_collaborative_projects(id) ON DELETE CASCADE,
  uploaded_by_vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Document details
  document_title VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size BIGINT NOT NULL,
  file_url TEXT NOT NULL,
  
  -- Document metadata
  document_category VARCHAR(100), -- e.g., 'contract', 'timeline', 'inspiration', 'invoice'
  description TEXT,
  tags TEXT[],
  
  -- Version control
  version_number INTEGER DEFAULT 1,
  parent_document_id UUID REFERENCES project_shared_documents(id) ON DELETE SET NULL,
  is_latest_version BOOLEAN DEFAULT TRUE,
  
  -- Access control
  access_level VARCHAR(20) DEFAULT 'view' CHECK (access_level IN ('view', 'comment', 'edit', 'admin')),
  allowed_vendor_ids UUID[], -- NULL means all project members can access
  
  -- Usage tracking
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE -- Optional expiration
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vendor_connection_requests_to_vendor ON vendor_connection_requests(to_vendor_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_vendor_connection_requests_from_vendor ON vendor_connection_requests(from_vendor_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_vendor_connections_vendor_id ON vendor_connections(vendor_id) WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_vendor_connections_connected_vendor_id ON vendor_connections(connected_vendor_id) WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_networking_recommendations_vendor_id ON vendor_networking_recommendations(vendor_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_referral_opportunities_services ON vendor_referral_opportunities USING gin(services_needed) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_referral_opportunities_location ON vendor_referral_opportunities(venue_location) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_networking_events_date ON vendor_networking_events(event_date) WHERE status = 'upcoming';
CREATE INDEX IF NOT EXISTS idx_collaborative_projects_lead_vendor ON vendor_collaborative_projects(lead_vendor_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_vendor_id ON project_collaborators(vendor_id) WHERE invitation_status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned_to ON project_shared_tasks(assigned_to_vendor_id) WHERE task_status IN ('todo', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_project_messages_project_id ON project_collaboration_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_shared_documents(project_id);

-- Create RLS (Row Level Security) policies
ALTER TABLE vendor_connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_networking_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_referral_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_referral_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_networking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_collaborative_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_shared_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_collaboration_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_shared_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for vendor_connection_requests
CREATE POLICY "Vendors can view their own connection requests" ON vendor_connection_requests
  FOR SELECT USING (from_vendor_id = auth.uid() OR to_vendor_id = auth.uid());

CREATE POLICY "Vendors can create connection requests" ON vendor_connection_requests
  FOR INSERT WITH CHECK (from_vendor_id = auth.uid());

CREATE POLICY "Vendors can update requests they received" ON vendor_connection_requests
  FOR UPDATE USING (to_vendor_id = auth.uid());

-- RLS policies for vendor_connections  
CREATE POLICY "Vendors can view their own connections" ON vendor_connections
  FOR SELECT USING (vendor_id = auth.uid() OR connected_vendor_id = auth.uid());

-- RLS policies for networking recommendations
CREATE POLICY "Vendors can view their own recommendations" ON vendor_networking_recommendations
  FOR SELECT USING (vendor_id = auth.uid());

-- RLS policies for collaborative projects
CREATE POLICY "Vendors can view projects they're involved in" ON vendor_collaborative_projects
  FOR SELECT USING (
    lead_vendor_id = auth.uid() OR 
    id IN (SELECT project_id FROM project_collaborators WHERE vendor_id = auth.uid() AND invitation_status = 'accepted')
  );

-- Add trigger to auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to relevant tables
CREATE TRIGGER update_vendor_connection_requests_updated_at BEFORE UPDATE ON vendor_connection_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_connections_updated_at BEFORE UPDATE ON vendor_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_networking_recommendations_updated_at BEFORE UPDATE ON vendor_networking_recommendations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_referral_opportunities_updated_at BEFORE UPDATE ON vendor_referral_opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_referral_applications_updated_at BEFORE UPDATE ON vendor_referral_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_networking_events_updated_at BEFORE UPDATE ON vendor_networking_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_event_registrations_updated_at BEFORE UPDATE ON vendor_event_registrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_collaborative_projects_updated_at BEFORE UPDATE ON vendor_collaborative_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_collaborators_updated_at BEFORE UPDATE ON project_collaborators FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_shared_tasks_updated_at BEFORE UPDATE ON project_shared_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_shared_documents_updated_at BEFORE UPDATE ON project_shared_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add helpful functions for the networking system
CREATE OR REPLACE FUNCTION increment_vendor_connections(vendor_id UUID)
RETURNS VOID AS $$
BEGIN
  -- This function can be used to update vendor statistics
  -- Implementation depends on specific vendor stats table structure
  NULL;
END;
$$ LANGUAGE plpgsql;

-- Add sample data for development/testing (optional - remove for production)
-- INSERT INTO vendor_networking_events (title, description, event_type, event_date, organizer, target_categories) VALUES 
-- ('Wedding Photographer Network Meetup', 'Monthly virtual meetup for wedding photographers to share tips and network', 'virtual', NOW() + INTERVAL '7 days', 'WedSync Team', ARRAY['Photography']),
-- ('Multi-Vendor Wedding Showcase Planning', 'Collaborative planning session for upcoming wedding showcase event', 'hybrid', NOW() + INTERVAL '14 days', 'Wedding Industry Association', ARRAY['Photography', 'Videography', 'Florist', 'Venue']);

-- WS-214 Vendor Connections System Migration Complete
-- Components: VendorConnectionHub, NetworkingInterface, CollaborationTools