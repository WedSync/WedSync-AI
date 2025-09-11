-- WARNING: This migration references tables that may not exist: wedding_timelines, timeline_events, timeline_comments
-- Ensure these tables are created first

-- =====================================================
-- WEDDING TIMELINE BUILDER SYSTEM
-- =====================================================
-- Interactive timeline with drag-drop, vendor coordination, and real-time collaboration
-- Feature ID: WS-076
-- Created: 2025-01-22
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- For time range overlap detection

-- =====================================================
-- CORE TIMELINE TABLES
-- =====================================================

-- Wedding Timelines (main timeline container)
CREATE TABLE IF NOT EXISTS wedding_timelines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Basic Information
  name VARCHAR(255) NOT NULL,
  wedding_date DATE NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Europe/London',
  
  -- Timeline Settings
  start_time TIME DEFAULT '08:00',
  end_time TIME DEFAULT '23:00',
  buffer_time_minutes INTEGER DEFAULT 15, -- Default buffer between events
  
  -- Collaboration Settings
  allow_vendor_edits BOOLEAN DEFAULT false,
  require_approval BOOLEAN DEFAULT true,
  
  -- Version Control
  version INTEGER DEFAULT 1,
  published_version INTEGER,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- draft, review, approved, final
  
  -- Metadata
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timeline Events
CREATE TABLE IF NOT EXISTS timeline_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timeline_id UUID REFERENCES wedding_timelines(id) ON DELETE CASCADE,
  
  -- Event Information
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(100), -- ceremony, reception, photos, setup, breakdown, etc.
  category VARCHAR(100), -- preparation, ceremony, cocktails, reception, party
  
  -- Timing
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (end_time - start_time)) / 60
  ) STORED,
  
  -- Location
  location VARCHAR(255),
  location_details TEXT,
  coordinates POINT, -- For map integration
  
  -- Priority & Status
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, in-progress, completed, cancelled
  
  -- Dependencies
  depends_on UUID[], -- Array of event IDs this event depends on
  buffer_before_minutes INTEGER DEFAULT 0,
  buffer_after_minutes INTEGER DEFAULT 0,
  
  -- Flexibility
  is_locked BOOLEAN DEFAULT false, -- Cannot be moved by drag-drop
  is_flexible BOOLEAN DEFAULT false, -- Can be rescheduled if needed
  min_duration_minutes INTEGER,
  max_duration_minutes INTEGER,
  
  -- Weather & Conditions
  weather_dependent BOOLEAN DEFAULT false,
  backup_plan TEXT,
  
  -- Visual
  color VARCHAR(7), -- Hex color for timeline display
  icon VARCHAR(50), -- Icon identifier
  
  -- Ordering
  display_order INTEGER,
  layer INTEGER DEFAULT 0, -- For overlapping events (0 = main layer)
  
  -- Notes
  internal_notes TEXT, -- Only visible to planners
  vendor_notes TEXT, -- Visible to assigned vendors
  
  -- Metadata
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timeline Event Vendors (many-to-many)
CREATE TABLE IF NOT EXISTS timeline_event_vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES timeline_events(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Assignment Details
  role VARCHAR(100), -- primary, support, backup
  responsibilities TEXT,
  
  -- Timing
  arrival_time TIMESTAMP WITH TIME ZONE,
  departure_time TIMESTAMP WITH TIME ZONE,
  setup_time_minutes INTEGER DEFAULT 0,
  breakdown_time_minutes INTEGER DEFAULT 0,
  
  -- Status
  confirmation_status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, declined
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by UUID REFERENCES user_profiles(id),
  
  -- Notes
  vendor_notes TEXT,
  
  -- Metadata
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES user_profiles(id),
  
  UNIQUE(event_id, vendor_id)
);

-- Timeline Conflicts
CREATE TABLE IF NOT EXISTS timeline_conflicts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timeline_id UUID REFERENCES wedding_timelines(id) ON DELETE CASCADE,
  
  -- Conflict Details
  conflict_type VARCHAR(50) NOT NULL, -- time_overlap, vendor_overlap, location_conflict, dependency_issue
  severity VARCHAR(20) DEFAULT 'warning', -- info, warning, error
  
  -- Events Involved
  event_id_1 UUID REFERENCES timeline_events(id) ON DELETE CASCADE,
  event_id_2 UUID REFERENCES timeline_events(id) ON DELETE CASCADE,
  
  -- Description
  description TEXT NOT NULL,
  suggestion TEXT,
  
  -- Resolution
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES user_profiles(id),
  resolution_notes TEXT,
  
  -- Auto-resolve Options
  can_auto_resolve BOOLEAN DEFAULT false,
  auto_resolution_action JSONB, -- Suggested automatic resolution
  
  -- Metadata
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timeline Templates (for reusable timelines)
CREATE TABLE IF NOT EXISTS timeline_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Template Information
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  
  -- Template Data
  template_events JSONB NOT NULL, -- Array of event templates
  default_duration_hours INTEGER DEFAULT 8,
  
  -- Usage
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- REAL-TIME COLLABORATION TABLES
-- =====================================================

-- Timeline Collaborators
CREATE TABLE IF NOT EXISTS timeline_collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timeline_id UUID REFERENCES wedding_timelines(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Permissions
  role VARCHAR(50) DEFAULT 'viewer', -- owner, editor, viewer
  can_edit BOOLEAN DEFAULT false,
  can_comment BOOLEAN DEFAULT true,
  can_share BOOLEAN DEFAULT false,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, invited, removed
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  -- Activity
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  is_currently_viewing BOOLEAN DEFAULT false,
  
  UNIQUE(timeline_id, user_id)
);

-- Timeline Activity Log
CREATE TABLE IF NOT EXISTS timeline_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timeline_id UUID REFERENCES wedding_timelines(id) ON DELETE CASCADE,
  
  -- Activity Details
  action VARCHAR(100) NOT NULL, -- created, updated, deleted, moved, assigned, commented
  entity_type VARCHAR(50), -- event, vendor, conflict, etc.
  entity_id UUID,
  
  -- Changes
  old_values JSONB,
  new_values JSONB,
  
  -- User
  user_id UUID REFERENCES user_profiles(id),
  user_name VARCHAR(255),
  user_role VARCHAR(50),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timeline Comments
CREATE TABLE IF NOT EXISTS timeline_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timeline_id UUID REFERENCES wedding_timelines(id) ON DELETE CASCADE,
  event_id UUID REFERENCES timeline_events(id) ON DELETE CASCADE,
  
  -- Comment
  comment TEXT NOT NULL,
  
  -- Threading
  parent_comment_id UUID REFERENCES timeline_comments(id) ON DELETE CASCADE,
  
  -- Status
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES user_profiles(id),
  
  -- User
  user_id UUID REFERENCES user_profiles(id),
  user_name VARCHAR(255),
  user_role VARCHAR(50),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Timeline Indexes
CREATE INDEX idx_wedding_timelines_org ON wedding_timelines(organization_id);
CREATE INDEX idx_wedding_timelines_client ON wedding_timelines(client_id);
CREATE INDEX idx_wedding_timelines_date ON wedding_timelines(wedding_date);
CREATE INDEX idx_wedding_timelines_status ON wedding_timelines(status);

-- Event Indexes
CREATE INDEX idx_timeline_events_timeline ON timeline_events(timeline_id);
CREATE INDEX idx_timeline_events_time ON timeline_events(start_time, end_time);
CREATE INDEX idx_timeline_events_status ON timeline_events(status);
CREATE INDEX idx_timeline_events_type ON timeline_events(event_type);

-- GiST index for time range overlaps
CREATE INDEX idx_timeline_events_time_range ON timeline_events 
  USING gist (timeline_id, tstzrange(start_time, end_time));

-- Vendor Assignment Indexes
CREATE INDEX idx_timeline_event_vendors_event ON timeline_event_vendors(event_id);
CREATE INDEX idx_timeline_event_vendors_vendor ON timeline_event_vendors(vendor_id);
CREATE INDEX idx_timeline_event_vendors_status ON timeline_event_vendors(confirmation_status);

-- Conflict Indexes
CREATE INDEX idx_timeline_conflicts_timeline ON timeline_conflicts(timeline_id);
CREATE INDEX idx_timeline_conflicts_unresolved ON timeline_conflicts(timeline_id, is_resolved) 
  WHERE is_resolved = false;

-- Collaboration Indexes
CREATE INDEX idx_timeline_collaborators_timeline ON timeline_collaborators(timeline_id);
CREATE INDEX idx_timeline_collaborators_user ON timeline_collaborators(user_id);
CREATE INDEX idx_timeline_collaborators_active ON timeline_collaborators(timeline_id, status) 
  WHERE status = 'active';

-- Activity Log Indexes
CREATE INDEX idx_timeline_activity_log_timeline ON timeline_activity_log(timeline_id);
CREATE INDEX idx_timeline_activity_log_created ON timeline_activity_log(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE wedding_timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_event_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_comments ENABLE ROW LEVEL SECURITY;

-- Timeline Policies
CREATE POLICY "Users can view timelines they collaborate on" ON wedding_timelines
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM timeline_collaborators 
      WHERE timeline_id = wedding_timelines.id AND status = 'active'
    )
    OR organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can edit timelines they have permission for" ON wedding_timelines
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM timeline_collaborators 
      WHERE timeline_id = wedding_timelines.id 
        AND status = 'active' 
        AND can_edit = true
    )
    OR auth.uid() = created_by
  );

-- Event Policies
CREATE POLICY "Users can view events for their timelines" ON timeline_events
  FOR SELECT
  USING (
    timeline_id IN (
      SELECT id FROM wedding_timelines 
      WHERE auth.uid() IN (
        SELECT user_id FROM timeline_collaborators 
        WHERE timeline_id = wedding_timelines.id AND status = 'active'
      )
    )
  );

CREATE POLICY "Users can edit events with permission" ON timeline_events
  FOR ALL
  USING (
    timeline_id IN (
      SELECT id FROM wedding_timelines 
      WHERE auth.uid() IN (
        SELECT user_id FROM timeline_collaborators 
        WHERE timeline_id = wedding_timelines.id 
          AND status = 'active' 
          AND can_edit = true
      )
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to detect timeline conflicts
CREATE OR REPLACE FUNCTION detect_timeline_conflicts(p_timeline_id UUID)
RETURNS TABLE (
  conflict_type VARCHAR,
  event_1_id UUID,
  event_2_id UUID,
  description TEXT
) AS $$
BEGIN
  -- Check for time overlaps
  RETURN QUERY
  SELECT 
    'time_overlap'::VARCHAR,
    e1.id,
    e2.id,
    format('Events "%s" and "%s" overlap in time', e1.title, e2.title)
  FROM timeline_events e1
  JOIN timeline_events e2 ON e1.timeline_id = e2.timeline_id
  WHERE e1.timeline_id = p_timeline_id
    AND e1.id < e2.id
    AND tstzrange(e1.start_time, e1.end_time) && tstzrange(e2.start_time, e2.end_time)
    AND e1.layer = e2.layer;

  -- Check for vendor conflicts
  RETURN QUERY
  SELECT 
    'vendor_overlap'::VARCHAR,
    ev1.event_id,
    ev2.event_id,
    format('Vendor %s is assigned to overlapping events', ev1.vendor_id::text)
  FROM timeline_event_vendors ev1
  JOIN timeline_event_vendors ev2 ON ev1.vendor_id = ev2.vendor_id
  JOIN timeline_events e1 ON ev1.event_id = e1.id
  JOIN timeline_events e2 ON ev2.event_id = e2.id
  WHERE e1.timeline_id = p_timeline_id
    AND e1.id != e2.id
    AND tstzrange(e1.start_time, e1.end_time) && tstzrange(e2.start_time, e2.end_time)
    AND ev1.confirmation_status = 'confirmed'
    AND ev2.confirmation_status = 'confirmed';
END;
$$ LANGUAGE plpgsql;

-- Function to calculate timeline statistics
CREATE OR REPLACE FUNCTION get_timeline_statistics(p_timeline_id UUID)
RETURNS TABLE (
  total_events INTEGER,
  confirmed_events INTEGER,
  total_vendors INTEGER,
  confirmed_vendors INTEGER,
  total_duration_hours NUMERIC,
  unresolved_conflicts INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT e.id)::INTEGER as total_events,
    COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'confirmed')::INTEGER as confirmed_events,
    COUNT(DISTINCT ev.vendor_id)::INTEGER as total_vendors,
    COUNT(DISTINCT ev.vendor_id) FILTER (WHERE ev.confirmation_status = 'confirmed')::INTEGER as confirmed_vendors,
    ROUND(SUM(DISTINCT e.duration_minutes) / 60.0, 2) as total_duration_hours,
    (SELECT COUNT(*)::INTEGER FROM timeline_conflicts WHERE timeline_id = p_timeline_id AND is_resolved = false) as unresolved_conflicts
  FROM timeline_events e
  LEFT JOIN timeline_event_vendors ev ON e.id = ev.event_id
  WHERE e.timeline_id = p_timeline_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timeline updated_at
CREATE OR REPLACE FUNCTION update_timeline_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE wedding_timelines 
  SET updated_at = NOW()
  WHERE id = NEW.timeline_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER timeline_events_update_timeline
  AFTER INSERT OR UPDATE OR DELETE ON timeline_events
  FOR EACH ROW
  EXECUTE FUNCTION update_timeline_timestamp();

-- Trigger to log timeline activity
CREATE OR REPLACE FUNCTION log_timeline_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline_activity_log (
    timeline_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    user_id
  ) VALUES (
    COALESCE(NEW.timeline_id, OLD.timeline_id),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN TG_OP = 'UPDATE' THEN 'updated'
      WHEN TG_OP = 'DELETE' THEN 'deleted'
    END,
    'event',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER timeline_events_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON timeline_events
  FOR EACH ROW
  EXECUTE FUNCTION log_timeline_activity();

-- =====================================================
-- SAMPLE DATA FOR TEMPLATES
-- =====================================================

-- Insert sample timeline templates
INSERT INTO timeline_templates (name, description, category, template_events, is_public) VALUES
('Traditional Wedding Day', 'Classic wedding day timeline with ceremony and reception', 'traditional', 
  '[
    {"title": "Hair & Makeup", "duration": 120, "event_type": "preparation", "offset": 0},
    {"title": "Photography - Getting Ready", "duration": 90, "event_type": "photos", "offset": 60},
    {"title": "First Look", "duration": 30, "event_type": "photos", "offset": 180},
    {"title": "Wedding Party Photos", "duration": 60, "event_type": "photos", "offset": 210},
    {"title": "Guest Arrival", "duration": 30, "event_type": "ceremony", "offset": 270},
    {"title": "Ceremony", "duration": 30, "event_type": "ceremony", "offset": 300},
    {"title": "Cocktail Hour", "duration": 60, "event_type": "cocktails", "offset": 330},
    {"title": "Reception Entrance", "duration": 15, "event_type": "reception", "offset": 390},
    {"title": "Dinner Service", "duration": 90, "event_type": "reception", "offset": 405},
    {"title": "Speeches & Toasts", "duration": 30, "event_type": "reception", "offset": 495},
    {"title": "First Dance", "duration": 10, "event_type": "reception", "offset": 525},
    {"title": "Dancing & Party", "duration": 180, "event_type": "party", "offset": 535}
  ]'::jsonb, true),
('Intimate Garden Wedding', 'Small outdoor wedding timeline', 'intimate',
  '[
    {"title": "Venue Setup", "duration": 60, "event_type": "setup", "offset": 0},
    {"title": "Floral Delivery & Setup", "duration": 45, "event_type": "setup", "offset": 30},
    {"title": "Couple Preparation", "duration": 90, "event_type": "preparation", "offset": 90},
    {"title": "Guest Arrival & Welcome Drinks", "duration": 30, "event_type": "ceremony", "offset": 180},
    {"title": "Garden Ceremony", "duration": 20, "event_type": "ceremony", "offset": 210},
    {"title": "Group Photos", "duration": 30, "event_type": "photos", "offset": 230},
    {"title": "Garden Party & Lunch", "duration": 150, "event_type": "reception", "offset": 260}
  ]'::jsonb, true);

-- =====================================================
-- PERMISSIONS FOR REALTIME
-- =====================================================

-- Grant permissions for realtime subscriptions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Enable realtime for timeline events
ALTER PUBLICATION supabase_realtime ADD TABLE timeline_events;
ALTER PUBLICATION supabase_realtime ADD TABLE timeline_event_vendors;
ALTER PUBLICATION supabase_realtime ADD TABLE timeline_conflicts;
ALTER PUBLICATION supabase_realtime ADD TABLE timeline_comments;