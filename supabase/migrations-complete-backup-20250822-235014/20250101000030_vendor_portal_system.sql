-- Vendor Portal System Migration
-- WS-006: Vendor Management - Coordination Portal & Performance Scoring

-- Vendor Performance Logs Table
CREATE TABLE IF NOT EXISTS vendor_performance_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Performance Metrics
  metric_type VARCHAR(100) NOT NULL, -- delivery_time, response_time, quality_rating, etc.
  metric_value DECIMAL(10, 2) NOT NULL,
  metric_unit VARCHAR(50), -- hours, rating, percentage, etc.
  
  -- Context
  wedding_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  measurement_date TIMESTAMP WITH TIME ZONE NOT NULL,
  measurement_period VARCHAR(50), -- daily, weekly, wedding_specific
  
  -- Metadata
  notes TEXT,
  recorded_by UUID REFERENCES user_profiles(id),
  source VARCHAR(100) DEFAULT 'manual', -- manual, automated, system
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor Performance Scores Table (Aggregated)
CREATE TABLE IF NOT EXISTS vendor_performance_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Performance Scores (0-100)
  overall_score DECIMAL(5, 2) DEFAULT 0,
  delivery_score DECIMAL(5, 2) DEFAULT 0,
  communication_score DECIMAL(5, 2) DEFAULT 0,
  quality_score DECIMAL(5, 2) DEFAULT 0,
  reliability_score DECIMAL(5, 2) DEFAULT 0,
  
  -- Key Metrics
  on_time_delivery_rate DECIMAL(5, 2) DEFAULT 0, -- percentage
  average_response_time DECIMAL(10, 2) DEFAULT 0, -- hours
  customer_satisfaction DECIMAL(3, 2) DEFAULT 0, -- 0-5 scale
  repeat_customer_rate DECIMAL(5, 2) DEFAULT 0, -- percentage
  recommendation_rate DECIMAL(5, 2) DEFAULT 0, -- percentage
  
  -- Business Metrics
  completed_weddings INTEGER DEFAULT 0,
  active_weddings INTEGER DEFAULT 0,
  total_revenue DECIMAL(15, 2) DEFAULT 0,
  average_project_value DECIMAL(10, 2) DEFAULT 0,
  
  -- Performance Trend
  performance_trend VARCHAR(20) DEFAULT 'stable', -- up, down, stable
  trend_percentage DECIMAL(5, 2) DEFAULT 0,
  
  -- Calculation Metadata
  calculation_period VARCHAR(50) NOT NULL, -- 1month, 3months, 6months, 1year, all_time
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- for caching
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(vendor_id, calculation_period)
);

-- Vendor Achievements Table
CREATE TABLE IF NOT EXISTS vendor_achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Achievement Details
  achievement_type VARCHAR(100) NOT NULL, -- top_rated, reliable_partner, customer_champion
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- star, clock, trophy, etc.
  
  -- Requirements
  requirement_met JSONB NOT NULL, -- criteria that was met
  threshold_value DECIMAL(10, 2),
  actual_value DECIMAL(10, 2),
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, revoked, expired
  earned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_date TIMESTAMP WITH TIME ZONE,
  
  -- Display
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  badge_color VARCHAR(7) DEFAULT '#10B981',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor Communications Table
CREATE TABLE IF NOT EXISTS vendor_communications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Communication Type
  communication_type VARCHAR(50) NOT NULL, -- direct_message, group_chat, notification, announcement
  
  -- Participants
  from_vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  to_vendor_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  to_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  group_id UUID, -- for group communications
  
  -- Message Content
  subject VARCHAR(500),
  message TEXT NOT NULL,
  message_format VARCHAR(20) DEFAULT 'text', -- text, html, markdown
  
  -- Priority and Status
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent, emergency
  status VARCHAR(50) DEFAULT 'sent', -- sent, delivered, read, replied, failed
  
  -- Wedding Context
  wedding_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  wedding_milestone VARCHAR(100),
  
  -- Attachments
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  sent_by UUID REFERENCES user_profiles(id),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  
  -- Threading
  parent_id UUID REFERENCES vendor_communications(id) ON DELETE CASCADE,
  thread_id UUID,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor Communication Groups Table
CREATE TABLE IF NOT EXISTS vendor_communication_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Group Details
  group_name VARCHAR(255) NOT NULL,
  group_type VARCHAR(50) DEFAULT 'wedding', -- wedding, category, custom
  description TEXT,
  
  -- Wedding Context
  wedding_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  allow_vendor_invite BOOLEAN DEFAULT false,
  auto_add_new_vendors BOOLEAN DEFAULT true,
  
  -- Metadata
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor Communication Group Members Table
CREATE TABLE IF NOT EXISTS vendor_communication_group_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES vendor_communication_groups(id) ON DELETE CASCADE,
  
  -- Member Details
  vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  member_role VARCHAR(50) DEFAULT 'member', -- admin, moderator, member
  
  -- Permissions
  can_send_messages BOOLEAN DEFAULT true,
  can_invite_members BOOLEAN DEFAULT false,
  can_remove_members BOOLEAN DEFAULT false,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, muted, removed
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(group_id, vendor_id)
);

-- Vendor Timeline Access Table
CREATE TABLE IF NOT EXISTS vendor_timeline_access (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Access Permissions
  can_view_timeline BOOLEAN DEFAULT true,
  can_edit_timeline BOOLEAN DEFAULT false,
  can_add_milestones BOOLEAN DEFAULT false,
  can_complete_tasks BOOLEAN DEFAULT true,
  
  -- Scope of Access
  access_scope VARCHAR(50) DEFAULT 'assigned_tasks', -- full, assigned_tasks, view_only
  visible_milestone_types TEXT[], -- array of milestone types they can see
  
  -- Timeline Sections
  can_view_ceremony BOOLEAN DEFAULT true,
  can_view_reception BOOLEAN DEFAULT true,
  can_view_vendor_coordination BOOLEAN DEFAULT true,
  can_view_setup_breakdown BOOLEAN DEFAULT false,
  
  -- Restrictions
  restricted_fields TEXT[], -- fields they cannot see
  time_restrictions JSONB, -- when they can access (e.g., only during business hours)
  
  -- Audit
  granted_by UUID REFERENCES user_profiles(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(vendor_id, client_id)
);

-- Vendor Delivery Tracking Table
CREATE TABLE IF NOT EXISTS vendor_delivery_tracking (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Service Details
  service_type VARCHAR(100) NOT NULL, -- photography, catering, flowers, etc.
  service_description TEXT,
  deliverable_name VARCHAR(255) NOT NULL,
  
  -- Timeline
  scheduled_date TIMESTAMP WITH TIME ZONE,
  promised_delivery_date TIMESTAMP WITH TIME ZONE,
  actual_delivery_date TIMESTAMP WITH TIME ZONE,
  
  -- Status Tracking
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, delivered, completed, delayed, cancelled
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  
  -- Quality Metrics
  quality_score DECIMAL(3, 2), -- 0-5 rating
  on_time_delivery BOOLEAN,
  meets_specifications BOOLEAN,
  
  -- Client Feedback
  client_satisfaction DECIMAL(3, 2), -- 0-5 rating
  client_feedback TEXT,
  client_approved BOOLEAN DEFAULT false,
  client_approval_date TIMESTAMP WITH TIME ZONE,
  
  -- Vendor Updates
  vendor_notes TEXT,
  last_vendor_update TIMESTAMP WITH TIME ZONE,
  next_milestone VARCHAR(255),
  next_milestone_date TIMESTAMP WITH TIME ZONE,
  
  -- Issues and Resolution
  issues_reported TEXT,
  resolution_notes TEXT,
  escalated BOOLEAN DEFAULT false,
  escalated_at TIMESTAMP WITH TIME ZONE,
  escalated_to UUID REFERENCES user_profiles(id),
  
  -- Metadata
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor Feedback Collection Table
CREATE TABLE IF NOT EXISTS vendor_feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Feedback Context
  wedding_date DATE,
  service_category VARCHAR(100),
  feedback_type VARCHAR(50) DEFAULT 'post_wedding', -- pre_wedding, mid_service, post_wedding, follow_up
  
  -- Ratings (1-5 scale)
  overall_rating DECIMAL(3, 2) NOT NULL,
  communication_rating DECIMAL(3, 2),
  professionalism_rating DECIMAL(3, 2),
  quality_rating DECIMAL(3, 2),
  timeliness_rating DECIMAL(3, 2),
  value_rating DECIMAL(3, 2),
  
  -- Detailed Feedback
  what_went_well TEXT,
  areas_for_improvement TEXT,
  specific_comments TEXT,
  
  -- Recommendation
  would_recommend BOOLEAN,
  would_rebook BOOLEAN,
  likely_to_refer INTEGER CHECK (likely_to_refer >= 0 AND likely_to_refer <= 10), -- NPS score
  
  -- Response and Follow-up
  vendor_response TEXT,
  vendor_responded_at TIMESTAMP WITH TIME ZONE,
  follow_up_requested BOOLEAN DEFAULT false,
  follow_up_completed BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  
  -- Publication Permissions
  can_use_as_testimonial BOOLEAN DEFAULT false,
  can_use_on_website BOOLEAN DEFAULT false,
  can_share_publicly BOOLEAN DEFAULT false,
  
  -- Metadata
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  collection_method VARCHAR(50) DEFAULT 'form', -- form, email, phone, in_person
  collected_by UUID REFERENCES user_profiles(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_vendor_performance_logs_vendor ON vendor_performance_logs(vendor_id);
CREATE INDEX idx_vendor_performance_logs_metric ON vendor_performance_logs(metric_type);
CREATE INDEX idx_vendor_performance_logs_date ON vendor_performance_logs(measurement_date);
CREATE INDEX idx_vendor_performance_logs_wedding ON vendor_performance_logs(wedding_id);

CREATE INDEX idx_vendor_performance_scores_vendor ON vendor_performance_scores(vendor_id);
CREATE INDEX idx_vendor_performance_scores_period ON vendor_performance_scores(calculation_period);
CREATE INDEX idx_vendor_performance_scores_overall ON vendor_performance_scores(overall_score);

CREATE INDEX idx_vendor_achievements_vendor ON vendor_achievements(vendor_id);
CREATE INDEX idx_vendor_achievements_type ON vendor_achievements(achievement_type);
CREATE INDEX idx_vendor_achievements_status ON vendor_achievements(status);

CREATE INDEX idx_vendor_communications_from ON vendor_communications(from_vendor_id);
CREATE INDEX idx_vendor_communications_to_vendor ON vendor_communications(to_vendor_id);
CREATE INDEX idx_vendor_communications_to_client ON vendor_communications(to_client_id);
CREATE INDEX idx_vendor_communications_wedding ON vendor_communications(wedding_id);
CREATE INDEX idx_vendor_communications_type ON vendor_communications(communication_type);
CREATE INDEX idx_vendor_communications_status ON vendor_communications(status);
CREATE INDEX idx_vendor_communications_sent_at ON vendor_communications(sent_at);
CREATE INDEX idx_vendor_communications_thread ON vendor_communications(thread_id);

CREATE INDEX idx_vendor_communication_groups_wedding ON vendor_communication_groups(wedding_id);
CREATE INDEX idx_vendor_communication_groups_type ON vendor_communication_groups(group_type);

CREATE INDEX idx_vendor_timeline_access_vendor ON vendor_timeline_access(vendor_id);
CREATE INDEX idx_vendor_timeline_access_client ON vendor_timeline_access(client_id);

CREATE INDEX idx_vendor_delivery_tracking_vendor ON vendor_delivery_tracking(vendor_id);
CREATE INDEX idx_vendor_delivery_tracking_client ON vendor_delivery_tracking(client_id);
CREATE INDEX idx_vendor_delivery_tracking_status ON vendor_delivery_tracking(status);
CREATE INDEX idx_vendor_delivery_tracking_scheduled ON vendor_delivery_tracking(scheduled_date);
CREATE INDEX idx_vendor_delivery_tracking_delivery ON vendor_delivery_tracking(actual_delivery_date);

CREATE INDEX idx_vendor_feedback_vendor ON vendor_feedback(vendor_id);
CREATE INDEX idx_vendor_feedback_client ON vendor_feedback(client_id);
CREATE INDEX idx_vendor_feedback_rating ON vendor_feedback(overall_rating);
CREATE INDEX idx_vendor_feedback_submitted ON vendor_feedback(submitted_at);

-- Row Level Security Policies

-- Enable RLS on new tables
ALTER TABLE vendor_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_performance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_communication_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_communication_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_timeline_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Vendor Performance Logs
CREATE POLICY "Users can view their organization's vendor performance logs"
  ON vendor_performance_logs FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY "Users can insert performance logs for their organization"
  ON vendor_performance_logs FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

-- RLS Policies for Vendor Performance Scores
CREATE POLICY "Users can view their organization's vendor performance scores"
  ON vendor_performance_scores FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

-- RLS Policies for Vendor Communications
CREATE POLICY "Users can view vendor communications for their organization"
  ON vendor_communications FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY "Users can send vendor communications for their organization"
  ON vendor_communications FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

-- RLS Policies for Vendor Timeline Access
CREATE POLICY "Users can view vendor timeline access for their organization"
  ON vendor_timeline_access FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

-- RLS Policies for Vendor Delivery Tracking
CREATE POLICY "Users can view vendor delivery tracking for their organization"
  ON vendor_delivery_tracking FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY "Users can update vendor delivery tracking for their organization"
  ON vendor_delivery_tracking FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

-- RLS Policies for Vendor Feedback
CREATE POLICY "Users can view vendor feedback for their organization"
  ON vendor_feedback FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY "Users can manage vendor feedback for their organization"
  ON vendor_feedback FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

-- Insert default performance score calculation periods
INSERT INTO vendor_performance_scores (vendor_id, organization_id, calculation_period, expires_at)
SELECT 
  s.id,
  s.organization_id,
  period,
  NOW() + INTERVAL '1 day'
FROM suppliers s
CROSS JOIN (VALUES ('1month'), ('3months'), ('6months'), ('1year'), ('all_time')) AS periods(period)
WHERE s.is_published = true
ON CONFLICT (vendor_id, calculation_period) DO NOTHING;

-- Function to update vendor performance scores
CREATE OR REPLACE FUNCTION update_vendor_performance_scores()
RETURNS void AS $$
BEGIN
  -- This function would contain logic to calculate and update performance scores
  -- Implementation would involve complex calculations based on various metrics
  RAISE NOTICE 'Vendor performance scores update triggered';
END;
$$ LANGUAGE plpgsql;

-- Trigger to update performance scores when new logs are added
CREATE OR REPLACE FUNCTION trigger_update_performance_scores()
RETURNS TRIGGER AS $$
BEGIN
  -- Schedule performance score recalculation
  PERFORM pg_notify('update_performance_scores', NEW.vendor_id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vendor_performance_log_trigger
  AFTER INSERT ON vendor_performance_logs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_performance_scores();