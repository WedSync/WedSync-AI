-- Meeting Scheduler System
-- WS-064: Meeting scheduler for existing wedding clients to book planning sessions
-- Created: 2025-01-22

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- BOOKING PAGES TABLE
-- =============================================
-- Supplier-configurable booking pages
CREATE TABLE IF NOT EXISTS booking_pages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Page Configuration
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  welcome_message TEXT,
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  advance_booking_days INTEGER DEFAULT 30, -- How far in advance clients can book
  min_notice_hours INTEGER DEFAULT 24, -- Minimum notice required
  buffer_time_minutes INTEGER DEFAULT 15, -- Buffer between meetings
  
  -- Branding
  brand_color VARCHAR(7) DEFAULT '#7F56D9', -- Primary color
  logo_url VARCHAR(500),
  custom_css TEXT,
  
  -- Notifications
  notification_emails TEXT[] DEFAULT '{}', -- Additional emails for notifications
  send_sms_reminders BOOLEAN DEFAULT true,
  reminder_hours_before INTEGER[] DEFAULT '{24, 2}', -- Hours before to send reminders
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- MEETING TYPES TABLE
-- =============================================
-- Different types of meetings that can be booked
CREATE TABLE IF NOT EXISTS meeting_types (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_page_id UUID REFERENCES booking_pages(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Type Configuration
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  color VARCHAR(7) DEFAULT '#7F56D9',
  
  -- Pricing (optional)
  is_paid BOOLEAN DEFAULT false,
  price DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'GBP',
  
  -- Meeting Details
  meeting_location VARCHAR(255), -- Office, Video Call, Client Location, etc.
  video_call_platform VARCHAR(50), -- Zoom, Teams, etc.
  preparation_time_minutes INTEGER DEFAULT 0,
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  max_bookings_per_day INTEGER,
  requires_questionnaire BOOLEAN DEFAULT false,
  questionnaire_questions JSONB DEFAULT '[]',
  
  -- Order for display
  sort_order INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- AVAILABILITY SCHEDULES TABLE
-- =============================================
-- Weekly availability patterns for suppliers
CREATE TABLE IF NOT EXISTS availability_schedules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_page_id UUID REFERENCES booking_pages(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Schedule Pattern
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Settings
  is_available BOOLEAN DEFAULT true,
  timezone VARCHAR(50) DEFAULT 'Europe/London',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent overlapping time slots
  CONSTRAINT unique_availability_slot UNIQUE (booking_page_id, day_of_week, start_time, end_time)
);

-- =============================================
-- AVAILABILITY EXCEPTIONS TABLE
-- =============================================
-- Specific date overrides (holidays, vacations, special hours)
CREATE TABLE IF NOT EXISTS availability_exceptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_page_id UUID REFERENCES booking_pages(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Exception Details
  exception_date DATE NOT NULL,
  exception_type VARCHAR(50) NOT NULL CHECK (exception_type IN ('unavailable', 'custom_hours')),
  reason VARCHAR(255),
  
  -- Custom Hours (if exception_type = 'custom_hours')
  start_time TIME,
  end_time TIME,
  
  -- Settings
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern VARCHAR(50), -- 'weekly', 'monthly', 'yearly'
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint for date and booking page
  UNIQUE(booking_page_id, exception_date)
);

-- =============================================
-- BOOKINGS TABLE
-- =============================================
-- Actual meeting bookings made by clients
CREATE TABLE IF NOT EXISTS meeting_bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_page_id UUID REFERENCES booking_pages(id) ON DELETE CASCADE,
  meeting_type_id UUID REFERENCES meeting_types(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Booking Details
  booking_reference VARCHAR(50) UNIQUE NOT NULL, -- Human-readable reference
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Europe/London',
  
  -- Client Information
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50),
  wedding_date DATE,
  guest_count INTEGER,
  
  -- Meeting Details
  meeting_location VARCHAR(255),
  video_call_link VARCHAR(500),
  video_call_platform VARCHAR(50),
  special_requirements TEXT,
  
  -- Questionnaire Responses
  questionnaire_responses JSONB DEFAULT '{}',
  
  -- Status Tracking
  status VARCHAR(50) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'cancelled', 'completed', 'no_show')),
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID, -- Reference to user who cancelled
  
  -- Reminders
  reminder_sent_24h BOOLEAN DEFAULT false,
  reminder_sent_2h BOOLEAN DEFAULT false,
  last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Payment (if applicable)
  is_paid BOOLEAN DEFAULT false,
  payment_amount DECIMAL(10, 2),
  payment_currency VARCHAR(3) DEFAULT 'GBP',
  payment_reference VARCHAR(255),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent double booking same time slot (simple unique constraint)
  CONSTRAINT unique_booking_slot UNIQUE (supplier_id, scheduled_at, duration_minutes)
);

-- =============================================
-- CALENDAR INTEGRATIONS TABLE
-- =============================================
-- External calendar sync configuration
CREATE TABLE IF NOT EXISTS calendar_integrations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  booking_page_id UUID REFERENCES booking_pages(id) ON DELETE CASCADE,
  
  -- Integration Details
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('google', 'outlook', 'apple')),
  calendar_id VARCHAR(255),
  calendar_name VARCHAR(255),
  
  -- Authentication
  access_token_encrypted TEXT, -- Encrypted OAuth token
  refresh_token_encrypted TEXT, -- Encrypted refresh token
  token_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Sync Settings
  is_active BOOLEAN DEFAULT true,
  sync_direction VARCHAR(50) DEFAULT 'bidirectional' CHECK (sync_direction IN ('push_only', 'pull_only', 'bidirectional')),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_errors JSONB DEFAULT '[]',
  
  -- Configuration
  sync_past_events BOOLEAN DEFAULT false,
  sync_future_months INTEGER DEFAULT 6,
  event_title_template VARCHAR(255) DEFAULT 'Meeting with {client_name}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One integration per provider per supplier
  UNIQUE(supplier_id, provider)
);

-- =============================================
-- BOOKING ACTIVITY LOG TABLE
-- =============================================
-- Track all booking-related activities for audit trail
CREATE TABLE IF NOT EXISTS booking_activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES meeting_bookings(id) ON DELETE CASCADE,
  
  -- Activity Details
  activity_type VARCHAR(100) NOT NULL,
  activity_description TEXT,
  old_values JSONB,
  new_values JSONB,
  
  -- Context
  performed_by UUID, -- User who performed the action
  performed_by_role VARCHAR(50), -- 'client', 'supplier', 'system'
  ip_address INET,
  user_agent TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Booking pages indexes
CREATE INDEX IF NOT EXISTS idx_booking_pages_supplier_id ON booking_pages(supplier_id);
CREATE INDEX IF NOT EXISTS idx_booking_pages_active ON booking_pages(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_booking_pages_slug ON booking_pages(slug);

-- Meeting types indexes
CREATE INDEX IF NOT EXISTS idx_meeting_types_booking_page_id ON meeting_types(booking_page_id);
CREATE INDEX IF NOT EXISTS idx_meeting_types_active ON meeting_types(is_active) WHERE is_active = true;

-- Availability schedules indexes
CREATE INDEX IF NOT EXISTS idx_availability_schedules_booking_page ON availability_schedules(booking_page_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_availability_schedules_supplier ON availability_schedules(supplier_id, day_of_week);

-- Availability exceptions indexes
CREATE INDEX IF NOT EXISTS idx_availability_exceptions_booking_page ON availability_exceptions(booking_page_id);
CREATE INDEX IF NOT EXISTS idx_availability_exceptions_date ON availability_exceptions(exception_date);

-- Meeting bookings indexes  
CREATE INDEX IF NOT EXISTS idx_meeting_bookings_supplier_id ON meeting_bookings(supplier_id);
CREATE INDEX IF NOT EXISTS idx_meeting_bookings_client_id ON meeting_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_meeting_bookings_scheduled_at ON meeting_bookings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meeting_bookings_status ON meeting_bookings(status);
CREATE INDEX IF NOT EXISTS idx_meeting_bookings_date_range ON meeting_bookings(supplier_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meeting_bookings_reference ON meeting_bookings(booking_reference);

-- Calendar integrations indexes
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_supplier ON calendar_integrations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_active ON calendar_integrations(is_active) WHERE is_active = true;

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_booking_activity_log_booking_id ON booking_activity_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_activity_log_created_at ON booking_activity_log(created_at);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE booking_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_activity_log ENABLE ROW LEVEL SECURITY;

-- Booking pages policies
CREATE POLICY "Users can view booking pages from their organization" ON booking_pages
  FOR SELECT USING (organization_id = current_setting('app.current_organization_id')::uuid);

CREATE POLICY "Suppliers can manage their own booking pages" ON booking_pages
  FOR ALL USING (supplier_id = current_setting('app.current_supplier_id')::uuid);

-- Meeting types policies  
CREATE POLICY "Users can view meeting types from their organization" ON meeting_types
  FOR SELECT USING (supplier_id IN (
    SELECT id FROM suppliers WHERE organization_id = current_setting('app.current_organization_id')::uuid
  ));

CREATE POLICY "Suppliers can manage their own meeting types" ON meeting_types
  FOR ALL USING (supplier_id = current_setting('app.current_supplier_id')::uuid);

-- Availability schedules policies
CREATE POLICY "Users can view availability from their organization" ON availability_schedules
  FOR SELECT USING (supplier_id IN (
    SELECT id FROM suppliers WHERE organization_id = current_setting('app.current_organization_id')::uuid
  ));

CREATE POLICY "Suppliers can manage their own availability" ON availability_schedules
  FOR ALL USING (supplier_id = current_setting('app.current_supplier_id')::uuid);

-- Availability exceptions policies
CREATE POLICY "Users can view exceptions from their organization" ON availability_exceptions
  FOR SELECT USING (supplier_id IN (
    SELECT id FROM suppliers WHERE organization_id = current_setting('app.current_organization_id')::uuid
  ));

CREATE POLICY "Suppliers can manage their own exceptions" ON availability_exceptions
  FOR ALL USING (supplier_id = current_setting('app.current_supplier_id')::uuid);

-- Meeting bookings policies
CREATE POLICY "Users can view bookings from their organization" ON meeting_bookings
  FOR SELECT USING (organization_id = current_setting('app.current_organization_id')::uuid);

CREATE POLICY "Suppliers can manage bookings for their services" ON meeting_bookings
  FOR ALL USING (supplier_id = current_setting('app.current_supplier_id')::uuid);

CREATE POLICY "Clients can view their own bookings" ON meeting_bookings
  FOR SELECT USING (client_id = current_setting('app.current_client_id')::uuid);

-- Calendar integrations policies  
CREATE POLICY "Suppliers can manage their own calendar integrations" ON calendar_integrations
  FOR ALL USING (supplier_id = current_setting('app.current_supplier_id')::uuid);

-- Activity log policies
CREATE POLICY "Users can view activity logs for their organization bookings" ON booking_activity_log
  FOR SELECT USING (booking_id IN (
    SELECT id FROM meeting_bookings WHERE organization_id = current_setting('app.current_organization_id')::uuid
  ));

-- =============================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- =============================================

-- Function to generate unique booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Avoid confusing chars
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, (random() * length(chars))::integer + 1, 1);
  END LOOP;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM meeting_bookings WHERE booking_reference = result) LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, (random() * length(chars))::integer + 1, 1);
    END LOOP;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to check availability for a time slot
CREATE OR REPLACE FUNCTION check_availability(
  p_supplier_id UUID,
  p_booking_page_id UUID,
  p_scheduled_at TIMESTAMP WITH TIME ZONE,
  p_duration_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_day_of_week INTEGER;
  v_start_time TIME;
  v_end_time TIME;
  v_timezone TEXT;
  v_local_time TIMESTAMP;
  v_has_schedule BOOLEAN := false;
  v_has_exception BOOLEAN := false;
BEGIN
  -- Convert to supplier's timezone and extract components
  SELECT timezone INTO v_timezone FROM availability_schedules 
  WHERE booking_page_id = p_booking_page_id 
  LIMIT 1;
  
  v_timezone := COALESCE(v_timezone, 'Europe/London');
  v_local_time := p_scheduled_at AT TIME ZONE v_timezone;
  v_day_of_week := EXTRACT(DOW FROM v_local_time);
  v_start_time := v_local_time::TIME;
  v_end_time := (v_local_time + (p_duration_minutes || ' minutes')::INTERVAL)::TIME;
  
  -- Check for exceptions first
  SELECT true INTO v_has_exception FROM availability_exceptions
  WHERE booking_page_id = p_booking_page_id
    AND exception_date = v_local_time::DATE
    AND exception_type = 'unavailable';
  
  IF v_has_exception THEN
    RETURN false;
  END IF;
  
  -- Check regular availability schedule
  SELECT true INTO v_has_schedule FROM availability_schedules
  WHERE booking_page_id = p_booking_page_id
    AND day_of_week = v_day_of_week
    AND start_time <= v_start_time
    AND end_time >= v_end_time
    AND is_available = true;
  
  IF NOT v_has_schedule THEN
    RETURN false;
  END IF;
  
  -- Check for existing bookings (no conflicts)
  IF EXISTS (
    SELECT 1 FROM meeting_bookings
    WHERE supplier_id = p_supplier_id
      AND status IN ('confirmed', 'pending')
      AND tsrange(scheduled_at, scheduled_at + (duration_minutes || ' minutes')::interval)
          && tsrange(p_scheduled_at, p_scheduled_at + (p_duration_minutes || ' minutes')::interval)
  ) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to update booking activity log
CREATE OR REPLACE FUNCTION log_booking_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO booking_activity_log (
      booking_id, activity_type, activity_description, new_values
    ) VALUES (
      NEW.id, 'booking_created', 'New booking created', to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO booking_activity_log (
      booking_id, activity_type, activity_description, old_values, new_values
    ) VALUES (
      NEW.id, 'booking_updated', 'Booking updated', to_jsonb(OLD), to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for activity logging
CREATE TRIGGER meeting_bookings_activity_log
  AFTER INSERT OR UPDATE ON meeting_bookings
  FOR EACH ROW EXECUTE FUNCTION log_booking_activity();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_booking_pages_updated_at BEFORE UPDATE ON booking_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_types_updated_at BEFORE UPDATE ON meeting_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_schedules_updated_at BEFORE UPDATE ON availability_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_exceptions_updated_at BEFORE UPDATE ON availability_exceptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_bookings_updated_at BEFORE UPDATE ON meeting_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_integrations_updated_at BEFORE UPDATE ON calendar_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INITIAL DATA / SEED EXAMPLES
-- =============================================

-- Note: Seed data would be inserted via separate seed scripts
-- This migration focuses on schema creation only

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE booking_pages IS 'Supplier-configurable booking pages for client meeting scheduling';
COMMENT ON TABLE meeting_types IS 'Different types of meetings that can be booked (consultation, planning, etc.)';
COMMENT ON TABLE availability_schedules IS 'Weekly recurring availability patterns for suppliers';
COMMENT ON TABLE availability_exceptions IS 'Specific date overrides for holidays, vacations, or special hours';
COMMENT ON TABLE meeting_bookings IS 'Actual meeting bookings made by clients';
COMMENT ON TABLE calendar_integrations IS 'External calendar sync configuration (Google, Outlook, etc.)';
COMMENT ON TABLE booking_activity_log IS 'Audit trail for all booking-related activities';

COMMENT ON FUNCTION generate_booking_reference() IS 'Generates unique 8-character booking reference codes';
COMMENT ON FUNCTION check_availability(UUID, UUID, TIMESTAMP WITH TIME ZONE, INTEGER) IS 'Checks if a time slot is available for booking';
COMMENT ON FUNCTION log_booking_activity() IS 'Trigger function to automatically log booking changes';
COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to automatically update updated_at timestamps';