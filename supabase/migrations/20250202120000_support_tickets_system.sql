-- WS-235 Support Operations Ticket Management System Database Schema

-- Support ticket priorities enum
CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent', 'wedding_day');

-- Support ticket status enum  
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting_response', 'resolved', 'closed');

-- Support ticket categories enum
CREATE TYPE ticket_category AS ENUM (
  'technical_issue',
  'billing_question', 
  'feature_request',
  'wedding_day_emergency',
  'integration_problem',
  'data_issue',
  'account_access',
  'general_inquiry'
);

-- Main support tickets table
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(20) UNIQUE NOT NULL,
  
  -- User and organization context
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Wedding context for wedding day emergencies
  wedding_id UUID REFERENCES weddings(id) ON DELETE SET NULL,
  venue_name VARCHAR(255),
  wedding_date DATE,
  
  -- Ticket details
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category ticket_category NOT NULL DEFAULT 'general_inquiry',
  priority ticket_priority NOT NULL DEFAULT 'normal',
  status ticket_status NOT NULL DEFAULT 'open',
  
  -- Assignment and handling
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  
  -- Location context for mobile users
  user_location JSONB, -- {lat, lng, venue_name, address}
  device_info JSONB,   -- {platform, browser, is_mobile, is_pwa}
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  
  -- Search and indexing
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', title || ' ' || description || ' ' || COALESCE(venue_name, ''))
  ) STORED
);

-- Support ticket attachments
CREATE TABLE support_ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  
  -- File details
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  
  -- Mobile capture metadata
  captured_on_mobile BOOLEAN DEFAULT false,
  capture_metadata JSONB, -- {camera_used, location, timestamp}
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Support ticket comments/responses
CREATE TABLE support_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  
  -- Comment details
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- Internal notes vs customer-visible
  is_system_message BOOLEAN DEFAULT false, -- Automated system messages
  
  -- Voice notes support for mobile
  voice_note_url VARCHAR(500),
  voice_note_duration INTEGER, -- in seconds
  
  -- Author
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name VARCHAR(255) NOT NULL, -- Cached for display
  author_role VARCHAR(100), -- 'customer', 'support_agent', 'manager'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Support agent assignments and workload
CREATE TABLE support_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Agent details
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL DEFAULT 'agent', -- 'agent', 'senior_agent', 'manager'
  
  -- Availability
  is_active BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true,
  current_workload INTEGER DEFAULT 0,
  max_concurrent_tickets INTEGER DEFAULT 10,
  
  -- Specializations for wedding industry
  specializations TEXT[], -- ['technical', 'billing', 'wedding_day', 'integrations']
  
  -- Performance metrics
  average_response_time INTERVAL,
  resolution_rate DECIMAL(5,2),
  customer_satisfaction_score DECIMAL(3,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Ticket escalation rules and history
CREATE TABLE support_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  
  -- Escalation details
  escalated_from UUID REFERENCES support_agents(id) ON DELETE SET NULL,
  escalated_to UUID REFERENCES support_agents(id) ON DELETE SET NULL,
  escalation_reason TEXT NOT NULL,
  escalation_type VARCHAR(50) NOT NULL, -- 'manual', 'auto_sla', 'wedding_day', 'manager_request'
  
  -- Timestamps
  escalated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  resolved_at TIMESTAMPTZ
);

-- Wedding day emergency protocols
CREATE TABLE wedding_day_emergencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  
  -- Emergency details
  emergency_type VARCHAR(100) NOT NULL, -- 'venue_issue', 'vendor_no_show', 'tech_failure', 'weather'
  severity_level INTEGER NOT NULL CHECK (severity_level BETWEEN 1 AND 5), -- 1=minor, 5=catastrophic
  impact_assessment TEXT,
  
  -- Location and context
  venue_name VARCHAR(255) NOT NULL,
  venue_address TEXT,
  wedding_time TIME,
  guests_affected INTEGER,
  
  -- Response tracking
  first_response_time INTERVAL,
  resolution_time INTERVAL,
  
  -- Emergency contacts
  emergency_contacts JSONB, -- Array of {name, phone, role, relationship}
  
  -- Timestamps
  reported_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  resolved_at TIMESTAMPTZ,
  
  -- Post-incident
  post_incident_report TEXT,
  lessons_learned TEXT
);

-- Ticket SLA tracking
CREATE TABLE support_sla_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  
  -- SLA definitions based on priority
  priority ticket_priority NOT NULL,
  first_response_sla INTERVAL NOT NULL, -- How long until first response
  resolution_sla INTERVAL NOT NULL,     -- How long until resolution
  
  -- Actual performance
  first_response_at TIMESTAMPTZ,
  first_response_time INTERVAL GENERATED ALWAYS AS (first_response_at - created_at) STORED,
  resolved_at TIMESTAMPTZ,
  resolution_time INTERVAL GENERATED ALWAYS AS (resolved_at - created_at) STORED,
  
  -- SLA status
  first_response_sla_met BOOLEAN GENERATED ALWAYS AS (
    first_response_time IS NULL OR first_response_time <= first_response_sla
  ) STORED,
  resolution_sla_met BOOLEAN GENERATED ALWAYS AS (
    resolution_time IS NULL OR resolution_time <= resolution_sla
  ) STORED,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Push notifications for mobile users
CREATE TABLE support_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification details
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(100) NOT NULL, -- 'new_comment', 'status_change', 'escalation', 'wedding_day_alert'
  
  -- Delivery tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  -- Push notification data
  push_payload JSONB, -- Platform-specific push data
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_organization_id ON support_tickets(organization_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX idx_support_tickets_wedding_date ON support_tickets(wedding_date) WHERE wedding_date IS NOT NULL;
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_support_tickets_search_vector ON support_tickets USING GIN(search_vector);

CREATE INDEX idx_support_ticket_comments_ticket_id ON support_ticket_comments(ticket_id);
CREATE INDEX idx_support_ticket_comments_created_at ON support_ticket_comments(created_at DESC);

CREATE INDEX idx_support_ticket_attachments_ticket_id ON support_ticket_attachments(ticket_id);

CREATE INDEX idx_wedding_day_emergencies_wedding_id ON wedding_day_emergencies(wedding_id);
CREATE INDEX idx_wedding_day_emergencies_reported_at ON wedding_day_emergencies(reported_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_support_tickets_updated_at 
    BEFORE UPDATE ON support_tickets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_ticket_comments_updated_at 
    BEFORE UPDATE ON support_ticket_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    ticket_num TEXT;
    counter INTEGER;
BEGIN
    -- Generate ticket number: WS-YYYYMMDD-NNNN
    SELECT COUNT(*) + 1 INTO counter 
    FROM support_tickets 
    WHERE DATE(created_at) = CURRENT_DATE;
    
    ticket_num := 'WS-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
    
    RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION auto_generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ticket_number IS NULL THEN
        NEW.ticket_number = generate_ticket_number();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_ticket_number_trigger
    BEFORE INSERT ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION auto_generate_ticket_number();

-- Function to auto-assign tickets based on workload and specialization
CREATE OR REPLACE FUNCTION auto_assign_ticket()
RETURNS TRIGGER AS $$
DECLARE
    agent_id UUID;
BEGIN
    -- Skip auto-assignment for wedding day emergencies (manual assignment required)
    IF NEW.priority = 'wedding_day' THEN
        RETURN NEW;
    END IF;
    
    -- Find available agent with lowest workload and matching specialization
    SELECT sa.user_id INTO agent_id
    FROM support_agents sa
    WHERE sa.is_active = true 
      AND sa.is_available = true
      AND sa.current_workload < sa.max_concurrent_tickets
      AND (NEW.category::text = ANY(sa.specializations) OR 'general' = ANY(sa.specializations))
    ORDER BY sa.current_workload ASC, RANDOM()
    LIMIT 1;
    
    IF agent_id IS NOT NULL THEN
        NEW.assigned_to = agent_id;
        NEW.assigned_at = now();
        
        -- Update agent workload
        UPDATE support_agents 
        SET current_workload = current_workload + 1 
        WHERE user_id = agent_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER auto_assign_ticket_trigger
    BEFORE INSERT ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION auto_assign_ticket();

-- Row Level Security (RLS) policies
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_day_emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_notifications ENABLE ROW LEVEL SECURITY;

-- Users can see their own tickets
CREATE POLICY "Users can view own tickets" ON support_tickets
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create tickets
CREATE POLICY "Users can create tickets" ON support_tickets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own tickets (limited fields)
CREATE POLICY "Users can update own tickets" ON support_tickets
    FOR UPDATE USING (auth.uid() = user_id);

-- Support agents can see assigned tickets
CREATE POLICY "Agents can view assigned tickets" ON support_tickets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM support_agents 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Support agents can update tickets
CREATE POLICY "Agents can update tickets" ON support_tickets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM support_agents 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Comments are visible to ticket participants
CREATE POLICY "Ticket participants can view comments" ON support_ticket_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM support_tickets st 
            WHERE st.id = ticket_id 
            AND (st.user_id = auth.uid() OR st.assigned_to = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM support_agents 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Users and agents can add comments
CREATE POLICY "Participants can add comments" ON support_ticket_comments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM support_tickets st 
            WHERE st.id = ticket_id 
            AND (st.user_id = auth.uid() OR st.assigned_to = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM support_agents 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON support_tickets TO authenticated;
GRANT ALL ON support_ticket_comments TO authenticated;
GRANT ALL ON support_ticket_attachments TO authenticated;
GRANT SELECT ON support_agents TO authenticated;
GRANT ALL ON wedding_day_emergencies TO authenticated;
GRANT ALL ON support_notifications TO authenticated;
GRANT ALL ON support_sla_tracking TO authenticated;
GRANT ALL ON support_escalations TO authenticated;

-- Insert default SLA rules
INSERT INTO support_sla_tracking (ticket_id, priority, first_response_sla, resolution_sla)
SELECT 
    id,
    priority,
    CASE priority
        WHEN 'wedding_day' THEN INTERVAL '5 minutes'
        WHEN 'urgent' THEN INTERVAL '1 hour'
        WHEN 'high' THEN INTERVAL '4 hours'
        WHEN 'normal' THEN INTERVAL '24 hours'
        WHEN 'low' THEN INTERVAL '48 hours'
    END,
    CASE priority
        WHEN 'wedding_day' THEN INTERVAL '1 hour'
        WHEN 'urgent' THEN INTERVAL '8 hours'
        WHEN 'high' THEN INTERVAL '24 hours'
        WHEN 'normal' THEN INTERVAL '72 hours'
        WHEN 'low' THEN INTERVAL '168 hours'
    END
FROM support_tickets
ON CONFLICT DO NOTHING;