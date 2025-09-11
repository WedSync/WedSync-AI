-- WedSync Master Migration File
-- Generated: 2025-08-22T22:50:41.507Z
-- This file contains ALL migrations with fixes applied

-- Disable foreign key checks for entire migration
SET session_replication_role = 'replica';

-- Create extensions first
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Create a system user first to avoid foreign key issues
DO $$
BEGIN
  -- Check if auth.users exists and create system user
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'auth') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, 
      encrypted_password, email_confirmed_at, 
      created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated', 
      'system@wedsync.local',
      crypt('systempassword123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;


-- ========================================
-- Migration: 025_sms_configuration_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- SMS Configuration System Migration
-- Extends email template patterns for SMS messaging
-- Migration: 025_sms_configuration_system.sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- SMS Templates Table (mirroring email_templates structure)
DROP VIEW IF EXISTS sms_templates CASCADE;
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) CHECK (category IN ('welcome', 'payment_reminder', 'meeting_confirmation', 'thank_you', 'client_communication', 'custom')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_count INTEGER DEFAULT 0,
  is_favorite BOOLEAN DEFAULT false,
  variables TEXT[] DEFAULT '{}',
  
  -- SMS-specific fields
  character_count INTEGER DEFAULT 0,
  segment_count INTEGER DEFAULT 1,
  character_limit INTEGER DEFAULT 160, -- Standard SMS limit
  
  -- Compliance fields
  opt_out_required BOOLEAN DEFAULT true,
  tcpa_compliant BOOLEAN DEFAULT false,
  consent_required BOOLEAN DEFAULT true,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  CONSTRAINT sms_templates_name_user_unique UNIQUE(name, user_id)
);

-- SMS Configuration Table (Twilio credentials)
DROP VIEW IF EXISTS sms_configurations CASCADE;
CREATE TABLE IF NOT EXISTS sms_configurations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Encrypted Twilio credentials (using Supabase Vault)
  account_sid_encrypted TEXT, -- Will store vault key reference
  auth_token_encrypted TEXT,  -- Will store vault key reference
  phone_number VARCHAR(20),   -- Twilio phone number
  
  -- Configuration settings
  is_active BOOLEAN DEFAULT false,
  webhook_url TEXT,
  status_callback_url TEXT,
  
  -- Compliance settings
  auto_opt_out BOOLEAN DEFAULT true,
  opt_out_keywords TEXT[] DEFAULT '{"STOP", "QUIT", "UNSUBSCRIBE", "END", "CANCEL"}',
  opt_in_keywords TEXT[] DEFAULT '{"START", "YES", "UNSTOP"}',
  
  -- Usage tracking
  monthly_limit INTEGER DEFAULT 1000,
  monthly_usage INTEGER DEFAULT 0,
  cost_per_message DECIMAL(6,4) DEFAULT 0.0075, -- $0.0075 per SMS
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT one_config_per_user UNIQUE(user_id)
);

-- SMS Messages Log (for tracking and compliance)
DROP VIEW IF EXISTS sms_messages CASCADE;
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES sms_templates(id) ON DELETE SET NULL,
  
  -- Message details
  to_phone VARCHAR(20) NOT NULL,
  from_phone VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  character_count INTEGER NOT NULL,
  segment_count INTEGER NOT NULL,
  
  -- Twilio tracking
  message_sid VARCHAR(50) UNIQUE, -- Twilio message SID
  status VARCHAR(20) DEFAULT 'queued',
  delivery_status VARCHAR(20),
  error_code VARCHAR(10),
  error_message TEXT,
  
  -- Compliance tracking
  consent_given BOOLEAN DEFAULT false,
  opt_out_respected BOOLEAN DEFAULT true,
  tcpa_compliant BOOLEAN DEFAULT false,
  
  -- Cost tracking
  cost_charged DECIMAL(6,4),
  
  -- Timestamps
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Opt-out Management Table
DROP VIEW IF EXISTS sms_opt_outs CASCADE;
CREATE TABLE IF NOT EXISTS sms_opt_outs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  opted_out_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opt_out_method VARCHAR(20) DEFAULT 'sms' CHECK (opt_out_method IN ('sms', 'manual', 'api')),
  opt_out_message TEXT,
  
  -- Re-opt-in tracking
  opted_in_at TIMESTAMP WITH TIME ZONE,
  opt_in_method VARCHAR(20) CHECK (opt_in_method IN ('sms', 'manual', 'api')),
  
  -- Current status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_phone_per_user UNIQUE(user_id, phone_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_templates_user_id ON sms_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_category ON sms_templates(category);
CREATE INDEX IF NOT EXISTS idx_sms_templates_status ON sms_templates(status);
CREATE INDEX IF NOT EXISTS idx_sms_templates_created_at ON sms_templates(created_at);

CREATE INDEX IF NOT EXISTS idx_sms_messages_user_id ON sms_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_template_id ON sms_messages(template_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_to_phone ON sms_messages(to_phone);
CREATE INDEX IF NOT EXISTS idx_sms_messages_message_sid ON sms_messages(message_sid);
CREATE INDEX IF NOT EXISTS idx_sms_messages_sent_at ON sms_messages(sent_at);

CREATE INDEX IF NOT EXISTS idx_sms_opt_outs_user_phone ON sms_opt_outs(user_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_opt_outs_phone ON sms_opt_outs(phone_number);

-- Row Level Security (RLS) Policies
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_opt_outs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sms_templates
CREATE POLICY "Users can view own SMS templates" ON sms_templates
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own SMS templates" ON sms_templates
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id AND (SELECT auth.uid()) = created_by);

CREATE POLICY "Users can update own SMS templates" ON sms_templates
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own SMS templates" ON sms_templates
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- RLS Policies for sms_configurations
CREATE POLICY "Users can view own SMS config" ON sms_configurations
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can manage own SMS config" ON sms_configurations
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- RLS Policies for sms_messages
CREATE POLICY "Users can view own SMS messages" ON sms_messages
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own SMS messages" ON sms_messages
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- RLS Policies for sms_opt_outs
CREATE POLICY "Users can view own opt-outs" ON sms_opt_outs
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can manage own opt-outs" ON sms_opt_outs
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- Functions for business logic

-- Function to increment SMS template usage count
CREATE OR REPLACE FUNCTION increment_sms_template_usage(template_id UUID, user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE sms_templates 
  SET usage_count = usage_count + 1, updated_at = NOW()
  WHERE id = template_id AND sms_templates.user_id = increment_sms_template_usage.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate SMS character count and segments
CREATE OR REPLACE FUNCTION calculate_sms_metrics(content TEXT)
RETURNS JSON AS $$
DECLARE
  char_count INTEGER;
  segment_count INTEGER;
  has_unicode BOOLEAN;
BEGIN
  char_count := LENGTH(content);
  has_unicode := content ~ '[^\x00-\x7F]';
  
  -- Calculate segments based on character count and encoding
  IF has_unicode THEN
    -- Unicode SMS: 70 chars per segment, 67 for concatenated
    IF char_count <= 70 THEN
      segment_count := 1;
    ELSE
      segment_count := CEIL(char_count::DECIMAL / 67);
    END IF;
  ELSE
    -- GSM 7-bit: 160 chars per segment, 153 for concatenated
    IF char_count <= 160 THEN
      segment_count := 1;
    ELSE
      segment_count := CEIL(char_count::DECIMAL / 153);
    END IF;
  END IF;
  
  RETURN json_build_object(
    'character_count', char_count,
    'segment_count', segment_count,
    'has_unicode', has_unicode,
    'encoding', CASE WHEN has_unicode THEN 'UCS-2' ELSE 'GSM 7-bit' END
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if phone number is opted out
CREATE OR REPLACE FUNCTION is_phone_opted_out(user_id UUID, phone_number VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  opted_out BOOLEAN DEFAULT false;
BEGIN
  SELECT is_active INTO opted_out
  FROM sms_opt_outs
  WHERE sms_opt_outs.user_id = is_phone_opted_out.user_id
    AND sms_opt_outs.phone_number = is_phone_opted_out.phone_number
    AND is_active = true;
  
  RETURN COALESCE(opted_out, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update character/segment count on template save
CREATE OR REPLACE FUNCTION update_sms_template_metrics()
RETURNS TRIGGER AS $$
DECLARE
  metrics JSON;
BEGIN
  metrics := calculate_sms_metrics(NEW.content);
  
  NEW.character_count := (metrics->>'character_count')::INTEGER;
  NEW.segment_count := (metrics->>'segment_count')::INTEGER;
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sms_template_metrics
  BEFORE INSERT OR UPDATE ON sms_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_template_metrics();

-- Insert default SMS templates extending email patterns
INSERT INTO sms_templates (name, content, category, status, user_id, created_by, tcpa_compliant, metadata) 
SELECT 
  REPLACE(name, 'Email', 'SMS') as name,
  -- Convert email template to SMS format (strip HTML, shorten content)
  CASE 
    WHEN name = 'Welcome Vendor Onboarding' THEN 'Hi {{client_first_name}}! Welcome to {{vendor_name}}. We''re excited to help make your wedding perfect. Reply STOP to opt out.'
    WHEN name = 'Form Shared with Couple' THEN 'Hi {{client_first_name}}, {{vendor_name}} shared a form for you to complete: {{form_url}} Reply STOP to opt out.'
    WHEN name = 'Form Reminder' THEN 'Reminder: Please complete your {{vendor_name}} form by {{due_date}}: {{form_url}} Reply STOP to opt out.'
    WHEN name = 'Payment Reminder' THEN 'Payment reminder: ${{amount}} due {{due_date}} for {{vendor_name}}. Pay at {{payment_url}} Reply STOP to opt out.'
    WHEN name = 'Event Confirmation' THEN 'Confirmed! {{vendor_name}} on {{event_date}} at {{event_time}}, {{event_location}}. Reply STOP to opt out.'
    ELSE 'SMS: {{content}}. Reply STOP to opt out.'
  END as content,
  category,
  'draft' as status,
  NULL as user_id, -- Will be updated by actual user
  NULL as created_by,
  true as tcpa_compliant,
  jsonb_build_object(
    'description', 'Default SMS template based on ' || name,
    'source', 'email_template_migration',
    'compliance_notes', 'Includes STOP opt-out as required by TCPA'
  ) as metadata
FROM (
  VALUES 
    ('Welcome Vendor Onboarding', 'welcome'),
    ('Form Shared with Couple', 'client_communication'),
    ('Form Reminder', 'client_communication'), 
    ('Payment Reminder', 'payment_reminder'),
    ('Event Confirmation', 'meeting_confirmation')
) AS default_templates(name, category)
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON sms_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sms_configurations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sms_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sms_opt_outs TO authenticated;

GRANT EXECUTE ON FUNCTION increment_sms_template_usage(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_sms_metrics(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_phone_opted_out(UUID, VARCHAR) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE sms_templates IS 'SMS templates extending email template patterns';
COMMENT ON TABLE sms_configurations IS 'Twilio SMS configuration with encrypted credentials';
COMMENT ON TABLE sms_messages IS 'SMS message log for tracking and compliance';
COMMENT ON TABLE sms_opt_outs IS 'TCPA compliance opt-out management';

COMMENT ON FUNCTION calculate_sms_metrics(TEXT) IS 'Calculate character count and SMS segments';
COMMENT ON FUNCTION is_phone_opted_out(UUID, VARCHAR) IS 'Check if phone number has opted out';
COMMENT ON FUNCTION increment_sms_template_usage(UUID, UUID) IS 'Track template usage statistics';

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 026_budget_tracking_system.sql
-- ========================================

-- Migration: 026_budget_tracking_system.sql
-- Description: Comprehensive budget tracking system for WS-059
-- Author: Claude Code
-- Date: 2025-01-22

BEGIN;

-- =====================================================
-- BUDGET TRACKING SYSTEM SCHEMA
-- =====================================================

-- 1. Budget Categories Table
-- =====================================================
DROP VIEW IF EXISTS budget_categories CASCADE;
CREATE TABLE IF NOT EXISTS budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    allocated_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (allocated_amount >= 0),
    spent_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (spent_amount >= 0),
    remaining_amount DECIMAL(12,2) GENERATED ALWAYS AS (allocated_amount - spent_amount) STORED,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for UI
    icon VARCHAR(50) DEFAULT 'dollar-sign',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT budget_categories_name_user_unique UNIQUE(user_id, name),
    CONSTRAINT budget_categories_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT budget_categories_allocated_positive CHECK (allocated_amount >= 0),
    CONSTRAINT budget_categories_spent_positive CHECK (spent_amount >= 0)
);

-- 2. Budget Transactions Table
-- =====================================================
DROP VIEW IF EXISTS budget_transactions CASCADE;
CREATE TABLE IF NOT EXISTS budget_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES budget_categories(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount != 0),
    description TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type VARCHAR(20) NOT NULL DEFAULT 'expense' CHECK (transaction_type IN ('expense', 'income', 'transfer', 'refund')),
    payment_method VARCHAR(50),
    vendor_name VARCHAR(200),
    receipt_url TEXT,
    notes TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT budget_transactions_amount_not_zero CHECK (amount != 0),
    CONSTRAINT budget_transactions_date_reasonable CHECK (transaction_date >= '2020-01-01' AND transaction_date <= CURRENT_DATE + INTERVAL '1 year')
);

-- 3. Budget Receipts Table
-- =====================================================
DROP VIEW IF EXISTS budget_receipts CASCADE;
CREATE TABLE IF NOT EXISTS budget_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES budget_transactions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 10485760), -- Max 10MB
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT budget_receipts_mime_type_valid CHECK (
        mime_type IN ('image/jpeg', 'image/png', 'image/gif', 'application/pdf')
    ),
    CONSTRAINT budget_receipts_file_size_valid CHECK (file_size > 0 AND file_size <= 10485760)
);

-- Add indexes for performance
CREATE INDEX idx_budget_categories_user_id ON budget_categories(user_id);
CREATE INDEX idx_budget_categories_active ON budget_categories(is_active, user_id);
CREATE INDEX idx_budget_transactions_user_id ON budget_transactions(user_id);
CREATE INDEX idx_budget_transactions_category_id ON budget_transactions(category_id);
CREATE INDEX idx_budget_transactions_date ON budget_transactions(transaction_date DESC);
CREATE INDEX idx_budget_receipts_transaction_id ON budget_receipts(transaction_id);
CREATE INDEX idx_budget_receipts_user_id ON budget_receipts(user_id);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC CALCULATIONS
-- =====================================================

-- Function to update spent amounts
CREATE OR REPLACE FUNCTION update_budget_category_spent()
RETURNS TRIGGER AS $$
BEGIN
    -- Update spent amount for the affected category
    UPDATE budget_categories 
    SET 
        spent_amount = (
            SELECT COALESCE(SUM(ABS(amount)), 0)
            FROM budget_transactions 
            WHERE category_id = COALESCE(NEW.category_id, OLD.category_id)
            AND transaction_type = 'expense'
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.category_id, OLD.category_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for budget transactions
CREATE TRIGGER trigger_update_budget_spent
    AFTER INSERT OR UPDATE OR DELETE ON budget_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_budget_category_spent();

-- Function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER trigger_budget_categories_updated_at
    BEFORE UPDATE ON budget_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_budget_transactions_updated_at
    BEFORE UPDATE ON budget_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_receipts ENABLE ROW LEVEL SECURITY;

-- Budget Categories Policies
CREATE POLICY "Users can manage own budget categories" ON budget_categories
    FOR ALL USING (( SELECT auth.uid() ) = user_id);

-- Budget Transactions Policies
CREATE POLICY "Users can manage own budget transactions" ON budget_transactions
    FOR ALL USING (( SELECT auth.uid() ) = user_id);

-- Budget Receipts Policies
CREATE POLICY "Users can manage own budget receipts" ON budget_receipts
    FOR ALL USING (( SELECT auth.uid() ) = user_id);

COMMIT;


-- ========================================
-- Migration: 027_meeting_scheduler_system.sql
-- ========================================

-- Meeting Scheduler System
-- WS-064: Meeting scheduler for existing wedding clients to book planning sessions
-- Created: 2025-01-22

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- BOOKING PAGES TABLE
-- =============================================
-- Supplier-configurable booking pages
DROP VIEW IF EXISTS booking_pages CASCADE;
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
DROP VIEW IF EXISTS meeting_types CASCADE;
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
DROP VIEW IF EXISTS availability_schedules CASCADE;
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
DROP VIEW IF EXISTS availability_exceptions CASCADE;
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
DROP VIEW IF EXISTS meeting_bookings CASCADE;
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
DROP VIEW IF EXISTS calendar_integrations CASCADE;
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
DROP VIEW IF EXISTS booking_activity_log CASCADE;
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


-- ========================================
-- Migration: 028_dashboard_templates_system.sql
-- ========================================

-- Dashboard Templates System Migration
-- WS-065 Team B Round 2 Implementation
-- Extends Round 1 booking system patterns for client dashboard customization

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Dashboard Template Categories
CREATE TYPE dashboard_template_category AS ENUM (
  'luxury', 
  'standard', 
  'budget', 
  'destination', 
  'traditional', 
  'modern',
  'venue_specific',
  'photographer',
  'planner',
  'caterer',
  'florist',
  'musician'
);

-- 2. Dashboard Section Types (Wedding-Specific)
CREATE TYPE dashboard_section_type AS ENUM (
  'welcome',
  'timeline',
  'budget_tracker',
  'vendor_portfolio',
  'guest_list',
  'task_manager',
  'gallery',
  'documents',
  'contracts',
  'payments',
  'communication',
  'booking_calendar',
  'notes',
  'activity_feed',
  'weather',
  'travel_info',
  'rsvp_manager',
  'seating_chart',
  'menu_planning',
  'music_playlist',
  'ceremony_details',
  'reception_details',
  'vendor_contacts',
  'emergency_contacts',
  'countdown',
  'inspiration_board',
  'checklist'
);

-- 3. Dashboard Templates Table
CREATE TABLE dashboard_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic Information (Pattern from booking_pages)
  supplier_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category dashboard_template_category NOT NULL,
  
  -- Template Configuration
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  
  -- Assignment Rules
  target_criteria JSONB NOT NULL DEFAULT '{}'::jsonb, -- Package, venue, budget criteria
  assignment_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Visual Customization (Pattern from booking_pages branding)
  brand_color VARCHAR(7) DEFAULT '#7F56D9',
  custom_css TEXT,
  logo_url TEXT,
  background_image_url TEXT,
  
  -- Performance Settings
  cache_duration_minutes INTEGER DEFAULT 5,
  priority_loading BOOLEAN DEFAULT false,
  
  -- Metadata
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT unique_supplier_template_name UNIQUE(supplier_id, name)
);

-- 4. Dashboard Template Sections (Pattern from meeting_types)
CREATE TABLE dashboard_template_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES dashboard_templates(id) ON DELETE CASCADE,
  
  -- Section Configuration
  section_type dashboard_section_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Layout & Position (Grid-based like booking builder)
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 6, -- 12-column grid system
  height INTEGER NOT NULL DEFAULT 4,
  
  -- Section Settings
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  
  -- Configuration (JSON for flexibility like questionnaire_questions)
  section_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  conditional_rules JSONB DEFAULT NULL, -- Show/hide based on conditions
  
  -- Responsive Settings
  mobile_config JSONB DEFAULT NULL,
  tablet_config JSONB DEFAULT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Client Template Assignments
CREATE TABLE client_template_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Assignment Details
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  template_id UUID REFERENCES dashboard_templates(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Assignment Metadata
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  assignment_reason TEXT, -- 'automatic', 'manual', 'client_preference'
  assignment_criteria JSONB, -- What criteria triggered this assignment
  
  -- Client-Specific Customizations
  custom_sections JSONB DEFAULT '[]'::jsonb, -- Client-specific section overrides
  custom_branding JSONB DEFAULT '{}'::jsonb, -- Client-specific branding
  custom_config JSONB DEFAULT '{}'::jsonb, -- Other client customizations
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_rendered_at TIMESTAMPTZ,
  
  -- Performance Tracking
  render_count INTEGER DEFAULT 0,
  avg_render_time_ms INTEGER,
  
  CONSTRAINT unique_client_assignment UNIQUE(client_id, supplier_id)
);

-- 6. Template Assignment Rules (Pattern from booking availability)
CREATE TABLE template_assignment_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES dashboard_templates(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Rule Configuration
  rule_name VARCHAR(255) NOT NULL,
  rule_description TEXT,
  priority INTEGER DEFAULT 0, -- Higher number = higher priority
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Condition Configuration
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  /*
  Example conditions structure:
  [
    {
      "field": "budget_range",
      "operator": "equals",
      "value": "luxury",
      "weight": 1.0
    },
    {
      "field": "guest_count",
      "operator": "greater_than",
      "value": 100,
      "weight": 0.5
    },
    {
      "field": "venue_type",
      "operator": "in",
      "value": ["garden", "estate", "manor"],
      "weight": 0.3
    }
  ]
  */
  
  -- Assignment Actions
  actions JSONB NOT NULL DEFAULT '{}'::jsonb,
  /*
  Example actions structure:
  {
    "assign_template": true,
    "customize_sections": {
      "budget_tracker": {"show_premium_features": true},
      "vendor_portfolio": {"show_luxury_vendors": true}
    },
    "apply_branding": {
      "color_scheme": "luxury_gold"
    }
  }
  */
  
  -- Rule Metadata
  match_count INTEGER DEFAULT 0,
  last_matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Template Performance Metrics
CREATE TABLE template_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES dashboard_templates(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Performance Data
  render_time_ms INTEGER NOT NULL,
  cache_hit BOOLEAN DEFAULT false,
  sections_count INTEGER,
  data_load_time_ms INTEGER,
  
  -- User Interaction
  page_views INTEGER DEFAULT 1,
  bounce_rate DECIMAL(5,2),
  avg_session_duration INTEGER, -- seconds
  
  -- Error Tracking
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  
  -- Timestamp
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  date_bucket DATE DEFAULT CURRENT_DATE
);

-- 8. Template Section Library (Predefined Sections)
CREATE TABLE dashboard_section_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Section Definition
  section_type dashboard_section_type NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'planning', 'communication', 'financial', etc.
  
  -- Default Configuration
  default_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_width INTEGER DEFAULT 6,
  default_height INTEGER DEFAULT 4,
  
  -- Wedding Context
  wedding_stage VARCHAR(50)[], -- When this section is most relevant
  client_types dashboard_template_category[], -- Which client types use this
  
  -- Technical Requirements
  required_data_sources TEXT[], -- What data this section needs
  api_endpoints TEXT[], -- What endpoints this section calls
  permissions_required TEXT[], -- What permissions are needed
  
  -- UI/UX
  icon_name VARCHAR(50),
  preview_image_url TEXT,
  demo_data JSONB, -- Sample data for previews
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  
  -- Usage Analytics
  usage_count INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_section_type UNIQUE(section_type)
);

-- 9. Create Indexes for Performance

-- Template lookups
CREATE INDEX idx_dashboard_templates_supplier ON dashboard_templates(supplier_id);
CREATE INDEX idx_dashboard_templates_category ON dashboard_templates(category);
CREATE INDEX idx_dashboard_templates_active ON dashboard_templates(is_active) WHERE is_active = true;

-- Section queries
CREATE INDEX idx_template_sections_template ON dashboard_template_sections(template_id);
CREATE INDEX idx_template_sections_type ON dashboard_template_sections(section_type);
CREATE INDEX idx_template_sections_position ON dashboard_template_sections(template_id, sort_order);

-- Client assignments
CREATE INDEX idx_client_assignments_client ON client_template_assignments(client_id);
CREATE INDEX idx_client_assignments_template ON client_template_assignments(template_id);
CREATE INDEX idx_client_assignments_supplier ON client_template_assignments(supplier_id);
CREATE INDEX idx_client_assignments_active ON client_template_assignments(is_active) WHERE is_active = true;

-- Assignment rules
CREATE INDEX idx_assignment_rules_template ON template_assignment_rules(template_id);
CREATE INDEX idx_assignment_rules_priority ON template_assignment_rules(supplier_id, priority DESC);
CREATE INDEX idx_assignment_rules_active ON template_assignment_rules(is_active) WHERE is_active = true;

-- Performance metrics
CREATE INDEX idx_performance_template_date ON template_performance_metrics(template_id, date_bucket);
CREATE INDEX idx_performance_render_time ON template_performance_metrics(render_time_ms);

-- Section library
CREATE INDEX idx_section_library_type ON dashboard_section_library(section_type);
CREATE INDEX idx_section_library_category ON dashboard_section_library(category);
CREATE INDEX idx_section_library_active ON dashboard_section_library(is_active) WHERE is_active = true;

-- 10. Row Level Security Policies

-- Dashboard Templates - Supplier can only see their own
ALTER TABLE dashboard_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own dashboard templates"
  ON dashboard_templates FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = supplier_id);

CREATE POLICY "Users can create their own dashboard templates"
  ON dashboard_templates FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = supplier_id);

CREATE POLICY "Users can update their own dashboard templates"
  ON dashboard_templates FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = supplier_id)
  WITH CHECK ((SELECT auth.uid()) = supplier_id);

CREATE POLICY "Users can delete their own dashboard templates"
  ON dashboard_templates FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = supplier_id);

-- Template Sections - Access through template ownership
ALTER TABLE dashboard_template_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sections of their templates"
  ON dashboard_template_sections FOR SELECT
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM dashboard_templates 
      WHERE supplier_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can manage sections of their templates"
  ON dashboard_template_sections FOR ALL
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM dashboard_templates 
      WHERE supplier_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT id FROM dashboard_templates 
      WHERE supplier_id = (SELECT auth.uid())
    )
  );

-- Client Template Assignments - Supplier can only see their assignments
ALTER TABLE client_template_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their client template assignments"
  ON client_template_assignments FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = supplier_id);

CREATE POLICY "Users can manage their client template assignments"
  ON client_template_assignments FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = supplier_id)
  WITH CHECK ((SELECT auth.uid()) = supplier_id);

-- Assignment Rules - Supplier owns their rules
ALTER TABLE template_assignment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their template assignment rules"
  ON template_assignment_rules FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = supplier_id)
  WITH CHECK ((SELECT auth.uid()) = supplier_id);

-- Performance Metrics - View access through template ownership
ALTER TABLE template_performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view performance metrics for their templates"
  ON template_performance_metrics FOR SELECT
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM dashboard_templates 
      WHERE supplier_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "System can insert performance metrics"
  ON template_performance_metrics FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Will be restricted by application logic

-- Section Library - Public read access, admin write
ALTER TABLE dashboard_section_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view section library"
  ON dashboard_section_library FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 11. Functions for Template Assignment Automation

-- Function to calculate template match score
CREATE OR REPLACE FUNCTION calculate_template_match_score(
  p_client_id UUID,
  p_template_id UUID
) RETURNS DECIMAL AS $$
DECLARE
  match_score DECIMAL := 0.0;
  rule_record RECORD;
  client_record RECORD;
  condition_record RECORD;
BEGIN
  -- Get client data
  SELECT * INTO client_record FROM clients WHERE id = p_client_id;
  
  IF NOT FOUND THEN
    RETURN 0.0;
  END IF;
  
  -- Get all active assignment rules for this template
  FOR rule_record IN
    SELECT * FROM template_assignment_rules 
    WHERE template_id = p_template_id 
    AND is_active = true 
    ORDER BY priority DESC
  LOOP
    -- Process each condition in the rule
    FOR condition_record IN
      SELECT * FROM jsonb_array_elements(rule_record.conditions)
    LOOP
      -- Add condition matching logic here
      -- This is simplified - in practice, you'd have more sophisticated matching
      IF condition_record->>'field' = 'budget_range' THEN
        IF client_record.budget_range = condition_record->>'value' THEN
          match_score := match_score + COALESCE((condition_record->>'weight')::DECIMAL, 1.0);
        END IF;
      END IF;
      
      -- Add more field matching logic as needed
    END LOOP;
  END LOOP;
  
  RETURN match_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-assign template to client
CREATE OR REPLACE FUNCTION auto_assign_template_to_client(
  p_client_id UUID,
  p_supplier_id UUID
) RETURNS UUID AS $$
DECLARE
  best_template_id UUID;
  best_score DECIMAL := 0.0;
  template_record RECORD;
  current_score DECIMAL;
BEGIN
  -- Find the best matching template
  FOR template_record IN
    SELECT id FROM dashboard_templates 
    WHERE supplier_id = p_supplier_id 
    AND is_active = true
  LOOP
    current_score := calculate_template_match_score(p_client_id, template_record.id);
    
    IF current_score > best_score THEN
      best_score := current_score;
      best_template_id := template_record.id;
    END IF;
  END LOOP;
  
  -- Assign the best template if we found one
  IF best_template_id IS NOT NULL THEN
    INSERT INTO client_template_assignments (
      client_id, 
      template_id, 
      supplier_id,
      assignment_reason,
      assignment_criteria
    ) VALUES (
      p_client_id, 
      best_template_id, 
      p_supplier_id,
      'automatic',
      jsonb_build_object('match_score', best_score)
    )
    ON CONFLICT (client_id, supplier_id) 
    DO UPDATE SET 
      template_id = best_template_id,
      assigned_at = NOW(),
      assignment_reason = 'automatic',
      assignment_criteria = jsonb_build_object('match_score', best_score),
      is_active = true;
  END IF;
  
  RETURN best_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Triggers for Automatic Template Assignment

-- Trigger to auto-assign template when client is created
CREATE OR REPLACE FUNCTION trigger_auto_assign_template()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-assign for new clients (INSERT) or when key fields change (UPDATE)
  IF TG_OP = 'INSERT' OR (
    TG_OP = 'UPDATE' AND (
      OLD.budget_range IS DISTINCT FROM NEW.budget_range OR
      OLD.guest_count IS DISTINCT FROM NEW.guest_count OR
      OLD.venue_type IS DISTINCT FROM NEW.venue_type OR
      OLD.wedding_style IS DISTINCT FROM NEW.wedding_style
    )
  ) THEN
    -- Auto-assign template (async via background job would be better in production)
    PERFORM auto_assign_template_to_client(NEW.id, NEW.supplier_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER clients_auto_assign_template
  AFTER INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_assign_template();

-- 13. Materialized View for Template Performance Dashboard

CREATE MATERIALIZED VIEW dashboard_template_analytics AS
WITH template_stats AS (
  SELECT 
    dt.id,
    dt.name,
    dt.category,
    dt.supplier_id,
    COUNT(DISTINCT cta.client_id) as clients_count,
    COUNT(DISTINCT tpm.id) as render_count,
    AVG(tpm.render_time_ms) as avg_render_time,
    MAX(tpm.measured_at) as last_used_at,
    dt.usage_count,
    dt.created_at
  FROM dashboard_templates dt
  LEFT JOIN client_template_assignments cta ON dt.id = cta.template_id AND cta.is_active = true
  LEFT JOIN template_performance_metrics tpm ON dt.id = tpm.template_id
  WHERE dt.is_active = true
  GROUP BY dt.id, dt.name, dt.category, dt.supplier_id, dt.usage_count, dt.created_at
)
SELECT 
  *,
  CASE 
    WHEN clients_count > 50 THEN 'high_usage'
    WHEN clients_count > 10 THEN 'medium_usage'
    ELSE 'low_usage'
  END as usage_category,
  CASE 
    WHEN avg_render_time < 200 THEN 'fast'
    WHEN avg_render_time < 500 THEN 'medium'
    ELSE 'slow'
  END as performance_category
FROM template_stats;

-- Create index on materialized view
CREATE INDEX idx_template_analytics_supplier ON dashboard_template_analytics(supplier_id);
CREATE INDEX idx_template_analytics_category ON dashboard_template_analytics(category);

-- 14. Refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_template_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW dashboard_template_analytics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Insert default section library data
INSERT INTO dashboard_section_library (
  section_type, name, description, category, default_config, default_width, default_height,
  wedding_stage, client_types, icon_name, is_active
) VALUES 
-- Essential Sections
('welcome', 'Welcome Message', 'Personalized welcome message for clients', 'communication', 
  '{"message": "Welcome to your wedding dashboard!", "show_countdown": true}', 12, 3, 
  ARRAY['inquiry', 'planning', 'booked'], ARRAY['luxury', 'standard', 'budget'], 'heart', true),

('timeline', 'Wedding Timeline', 'Visual timeline of wedding planning milestones', 'planning',
  '{"view": "gantt", "show_milestones": true, "color_coding": true}', 12, 6,
  ARRAY['planning', 'booked'], ARRAY['luxury', 'standard'], 'calendar', true),

('budget_tracker', 'Budget Tracker', 'Comprehensive wedding budget management', 'financial',
  '{"currency": "GBP", "categories": "wedding_standard", "show_charts": true}', 8, 5,
  ARRAY['inquiry', 'planning', 'booked'], ARRAY['luxury', 'standard', 'budget'], 'pound-sterling', true),

('vendor_portfolio', 'Vendor Portfolio', 'Showcase of recommended wedding vendors', 'vendors',
  '{"display": "grid", "show_ratings": true, "filter_by_budget": true}', 12, 8,
  ARRAY['inquiry', 'planning'], ARRAY['luxury', 'standard'], 'users', true),

('guest_list', 'Guest Management', 'Complete guest list and RSVP tracking', 'planning',
  '{"show_dietary": true, "show_plus_ones": true, "export_formats": ["csv", "pdf"]}', 10, 6,
  ARRAY['planning', 'booked'], ARRAY['luxury', 'standard', 'budget'], 'user-group', true),

-- Communication Sections  
('task_manager', 'Task Manager', 'Wedding planning task lists and assignments', 'planning',
  '{"view": "kanban", "assign_to_vendors": true, "deadline_alerts": true}', 8, 6,
  ARRAY['planning', 'booked'], ARRAY['luxury', 'standard'], 'check-square', true),

('communication', 'Message Center', 'Centralized communication hub', 'communication',
  '{"show_vendor_messages": true, "auto_notifications": true}', 6, 4,
  ARRAY['inquiry', 'planning', 'booked'], ARRAY['luxury', 'standard', 'budget'], 'message-circle', true),

-- Visual & Experience Sections
('gallery', 'Photo Gallery', 'Wedding inspiration and vendor portfolios', 'visual',
  '{"layout": "masonry", "categories": ["venue", "flowers", "catering"], "upload_enabled": true}', 8, 6,
  ARRAY['inquiry', 'planning'], ARRAY['luxury', 'standard'], 'image', true),

('documents', 'Document Library', 'Contracts, invoices, and important documents', 'planning',
  '{"folders": ["contracts", "invoices", "inspiration"], "version_control": true}', 6, 4,
  ARRAY['planning', 'booked'], ARRAY['luxury', 'standard', 'budget'], 'file-text', true),

-- Advanced Sections (Premium)
('seating_chart', 'Seating Planner', 'Interactive wedding seating arrangement', 'planning',
  '{"table_shapes": ["round", "rectangle"], "drag_drop": true, "dietary_alerts": true}', 12, 8,
  ARRAY['planning', 'booked'], ARRAY['luxury'], 'users', true),

('weather', 'Weather Forecast', 'Weather information for wedding venue', 'logistics',
  '{"days_ahead": 14, "backup_plans": true, "alerts_enabled": true}', 4, 3,
  ARRAY['booked'], ARRAY['luxury', 'standard', 'budget'], 'cloud', true);

-- 16. Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER dashboard_templates_updated_at 
  BEFORE UPDATE ON dashboard_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER dashboard_template_sections_updated_at 
  BEFORE UPDATE ON dashboard_template_sections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER template_assignment_rules_updated_at 
  BEFORE UPDATE ON template_assignment_rules 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER dashboard_section_library_updated_at 
  BEFORE UPDATE ON dashboard_section_library 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 17. Comments for documentation
COMMENT ON TABLE dashboard_templates IS 'Main template definitions for client dashboard customization';
COMMENT ON TABLE dashboard_template_sections IS 'Individual sections that make up dashboard templates';
COMMENT ON TABLE client_template_assignments IS 'Assignment of templates to specific clients with customizations';
COMMENT ON TABLE template_assignment_rules IS 'Automated rules for assigning templates based on client characteristics';
COMMENT ON TABLE template_performance_metrics IS 'Performance tracking for template rendering and usage';
COMMENT ON TABLE dashboard_section_library IS 'Library of predefined dashboard sections available for templates';

COMMENT ON FUNCTION calculate_template_match_score IS 'Calculates how well a template matches a client based on assignment rules';
COMMENT ON FUNCTION auto_assign_template_to_client IS 'Automatically assigns the best matching template to a client';

-- Migration complete
SELECT 'Dashboard Templates System migration completed successfully' as result;


-- ========================================
-- Migration: 035_api_key_management_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- 035_api_key_management_system.sql
-- Complete API Key Management System for Third-Party Integrations
-- WS-072: Platform Integration with Secure API Key Management

-- Drop existing tables if they exist
DROP TABLE IF EXISTS api_key_usage CASCADE;
DROP TABLE IF EXISTS api_key_scopes CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS api_scopes CASCADE;
DROP TABLE IF EXISTS api_rate_limits CASCADE;
DROP TABLE IF EXISTS api_integration_logs CASCADE;

-- Create API scopes table (defines available permissions)
CREATE TABLE api_scopes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scope VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create API keys table
CREATE TABLE api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL, -- First 10 chars for identification
    key_hash TEXT NOT NULL, -- Hashed API key
    description TEXT,
    integration_type VARCHAR(100), -- e.g., 'zapier', 'hubspot', 'custom'
    last_used_at TIMESTAMPTZ,
    last_used_ip INET,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    rate_limit_per_day INTEGER DEFAULT 10000,
    allowed_ips INET[], -- IP whitelist (optional)
    allowed_origins TEXT[], -- CORS origins (optional)
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT,
    
    CONSTRAINT unique_user_name UNIQUE(user_id, name)
);

-- Create API key scopes junction table
CREATE TABLE api_key_scopes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    scope_id UUID NOT NULL REFERENCES api_scopes(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT unique_key_scope UNIQUE(api_key_id, scope_id)
);

-- Create API key usage tracking table
CREATE TABLE api_key_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    ip_address INET,
    user_agent TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rate limiting table
CREATE TABLE api_rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    window_type VARCHAR(20) NOT NULL, -- 'minute', 'hour', 'day'
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER DEFAULT 0,
    last_request_at TIMESTAMPTZ,
    
    CONSTRAINT unique_key_window UNIQUE(api_key_id, window_type, window_start)
);

-- Create integration logs table for monitoring
CREATE TABLE api_integration_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    integration_type VARCHAR(100),
    event_type VARCHAR(100), -- 'webhook_sent', 'data_synced', 'error', etc.
    event_status VARCHAR(50), -- 'success', 'failed', 'pending'
    event_data JSONB DEFAULT '{}',
    error_details TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default API scopes
INSERT INTO api_scopes (scope, resource, action, description) VALUES
    -- Client scopes
    ('read:clients', 'clients', 'read', 'Read client information'),
    ('write:clients', 'clients', 'write', 'Create and update clients'),
    ('delete:clients', 'clients', 'delete', 'Delete clients'),
    
    -- Form scopes
    ('read:forms', 'forms', 'read', 'Read form responses'),
    ('write:forms', 'forms', 'write', 'Submit form responses'),
    
    -- Journey scopes
    ('read:journeys', 'journeys', 'read', 'Read journey data'),
    ('write:journeys', 'journeys', 'write', 'Update journey progress'),
    
    -- Vendor scopes
    ('read:vendors', 'vendors', 'read', 'Read vendor information'),
    ('write:vendors', 'vendors', 'write', 'Update vendor information'),
    
    -- Guest scopes
    ('read:guests', 'guests', 'read', 'Read guest lists'),
    ('write:guests', 'guests', 'write', 'Update guest information'),
    
    -- RSVP scopes
    ('read:rsvps', 'rsvps', 'read', 'Read RSVP responses'),
    ('write:rsvps', 'rsvps', 'write', 'Submit RSVP responses'),
    
    -- Analytics scopes
    ('read:analytics', 'analytics', 'read', 'Read analytics data'),
    
    -- Webhook scopes
    ('manage:webhooks', 'webhooks', 'manage', 'Manage webhook configurations'),
    
    -- Admin scopes
    ('admin:all', '*', '*', 'Full administrative access');

-- Create indexes for performance
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);
CREATE INDEX idx_api_key_usage_api_key_id ON api_key_usage(api_key_id);
CREATE INDEX idx_api_key_usage_created_at ON api_key_usage(created_at);
CREATE INDEX idx_api_rate_limits_lookup ON api_rate_limits(api_key_id, window_type, window_start);
CREATE INDEX idx_api_integration_logs_api_key_id ON api_integration_logs(api_key_id);
CREATE INDEX idx_api_integration_logs_created_at ON api_integration_logs(created_at);

-- Create function to check API key rate limits
CREATE OR REPLACE FUNCTION check_api_rate_limit(
    p_api_key_id UUID,
    p_current_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE(
    minute_limit_ok BOOLEAN,
    hour_limit_ok BOOLEAN,
    day_limit_ok BOOLEAN,
    minute_remaining INTEGER,
    hour_remaining INTEGER,
    day_remaining INTEGER
) AS $$
DECLARE
    v_key_record RECORD;
    v_minute_count INTEGER;
    v_hour_count INTEGER;
    v_day_count INTEGER;
BEGIN
    -- Get API key limits
    SELECT * INTO v_key_record FROM api_keys WHERE id = p_api_key_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, false, false, 0, 0, 0;
        RETURN;
    END IF;
    
    -- Count requests in last minute
    SELECT COALESCE(SUM(request_count), 0) INTO v_minute_count
    FROM api_rate_limits
    WHERE api_key_id = p_api_key_id
        AND window_type = 'minute'
        AND window_start >= p_current_time - INTERVAL '1 minute';
    
    -- Count requests in last hour
    SELECT COALESCE(SUM(request_count), 0) INTO v_hour_count
    FROM api_rate_limits
    WHERE api_key_id = p_api_key_id
        AND window_type = 'hour'
        AND window_start >= p_current_time - INTERVAL '1 hour';
    
    -- Count requests in last day
    SELECT COALESCE(SUM(request_count), 0) INTO v_day_count
    FROM api_rate_limits
    WHERE api_key_id = p_api_key_id
        AND window_type = 'day'
        AND window_start >= p_current_time - INTERVAL '1 day';
    
    RETURN QUERY SELECT
        v_minute_count < v_key_record.rate_limit_per_minute,
        v_hour_count < v_key_record.rate_limit_per_hour,
        v_day_count < v_key_record.rate_limit_per_day,
        GREATEST(0, v_key_record.rate_limit_per_minute - v_minute_count),
        GREATEST(0, v_key_record.rate_limit_per_hour - v_hour_count),
        GREATEST(0, v_key_record.rate_limit_per_day - v_day_count);
END;
$$ LANGUAGE plpgsql;

-- Create function to increment rate limit counters
CREATE OR REPLACE FUNCTION increment_api_rate_limit(
    p_api_key_id UUID,
    p_current_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS VOID AS $$
BEGIN
    -- Update minute window
    INSERT INTO api_rate_limits (api_key_id, window_type, window_start, request_count, last_request_at)
    VALUES (
        p_api_key_id,
        'minute',
        date_trunc('minute', p_current_time),
        1,
        p_current_time
    )
    ON CONFLICT (api_key_id, window_type, window_start)
    DO UPDATE SET
        request_count = api_rate_limits.request_count + 1,
        last_request_at = p_current_time;
    
    -- Update hour window
    INSERT INTO api_rate_limits (api_key_id, window_type, window_start, request_count, last_request_at)
    VALUES (
        p_api_key_id,
        'hour',
        date_trunc('hour', p_current_time),
        1,
        p_current_time
    )
    ON CONFLICT (api_key_id, window_type, window_start)
    DO UPDATE SET
        request_count = api_rate_limits.request_count + 1,
        last_request_at = p_current_time;
    
    -- Update day window
    INSERT INTO api_rate_limits (api_key_id, window_type, window_start, request_count, last_request_at)
    VALUES (
        p_api_key_id,
        'day',
        date_trunc('day', p_current_time),
        1,
        p_current_time
    )
    ON CONFLICT (api_key_id, window_type, window_start)
    DO UPDATE SET
        request_count = api_rate_limits.request_count + 1,
        last_request_at = p_current_time;
    
    -- Update last used timestamp on API key
    UPDATE api_keys
    SET last_used_at = p_current_time
    WHERE id = p_api_key_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get API key analytics
CREATE OR REPLACE FUNCTION get_api_key_analytics(
    p_api_key_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE(
    total_requests BIGINT,
    successful_requests BIGINT,
    failed_requests BIGINT,
    avg_response_time_ms NUMERIC,
    total_data_transferred_mb NUMERIC,
    unique_endpoints BIGINT,
    most_used_endpoint TEXT,
    error_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH usage_stats AS (
        SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status_code BETWEEN 200 AND 299) AS successful,
            COUNT(*) FILTER (WHERE status_code >= 400) AS failed,
            AVG(response_time_ms) AS avg_response_time,
            SUM(request_size_bytes + COALESCE(response_size_bytes, 0)) / 1048576.0 AS data_mb,
            COUNT(DISTINCT endpoint) AS unique_endpoints
        FROM api_key_usage
        WHERE api_key_id = p_api_key_id
            AND created_at BETWEEN p_start_date AND p_end_date
    ),
    top_endpoint AS (
        SELECT endpoint
        FROM api_key_usage
        WHERE api_key_id = p_api_key_id
            AND created_at BETWEEN p_start_date AND p_end_date
        GROUP BY endpoint
        ORDER BY COUNT(*) DESC
        LIMIT 1
    )
    SELECT
        usage_stats.total,
        usage_stats.successful,
        usage_stats.failed,
        ROUND(usage_stats.avg_response_time, 2),
        ROUND(usage_stats.data_mb, 2),
        usage_stats.unique_endpoints,
        top_endpoint.endpoint,
        CASE 
            WHEN usage_stats.total > 0 
            THEN ROUND((usage_stats.failed::NUMERIC / usage_stats.total) * 100, 2)
            ELSE 0
        END AS error_rate
    FROM usage_stats
    CROSS JOIN top_endpoint;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_integration_logs ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own API keys
CREATE POLICY "Users can view own API keys"
    ON api_keys FOR SELECT
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create own API keys"
    ON api_keys FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own API keys"
    ON api_keys FOR UPDATE
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own API keys"
    ON api_keys FOR DELETE
    USING ((SELECT auth.uid()) = user_id);

-- Users can view scopes for their API keys
CREATE POLICY "Users can view own API key scopes"
    ON api_key_scopes FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM api_keys
        WHERE api_keys.id = api_key_scopes.api_key_id
        AND api_keys.user_id = (SELECT auth.uid())
    ));

-- Users can view usage for their API keys
CREATE POLICY "Users can view own API key usage"
    ON api_key_usage FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM api_keys
        WHERE api_keys.id = api_key_usage.api_key_id
        AND api_keys.user_id = (SELECT auth.uid())
    ));

-- Users can view rate limits for their API keys
CREATE POLICY "Users can view own API rate limits"
    ON api_rate_limits FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM api_keys
        WHERE api_keys.id = api_rate_limits.api_key_id
        AND api_keys.user_id = (SELECT auth.uid())
    ));

-- Users can view integration logs for their API keys
CREATE POLICY "Users can view own integration logs"
    ON api_integration_logs FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM api_keys
        WHERE api_keys.id = api_integration_logs.api_key_id
        AND api_keys.user_id = (SELECT auth.uid())
    ));

-- Create cleanup function for old data
CREATE OR REPLACE FUNCTION cleanup_old_api_data()
RETURNS VOID AS $$
BEGIN
    -- Delete usage data older than 90 days
    DELETE FROM api_key_usage
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Delete rate limit data older than 7 days
    DELETE FROM api_rate_limits
    WHERE window_start < NOW() - INTERVAL '7 days';
    
    -- Delete integration logs older than 30 days
    DELETE FROM api_integration_logs
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Add comments for documentation
COMMENT ON TABLE api_keys IS 'Stores API keys for third-party integrations';
COMMENT ON TABLE api_scopes IS 'Defines available API permission scopes';
COMMENT ON TABLE api_key_scopes IS 'Maps API keys to their granted scopes';
COMMENT ON TABLE api_key_usage IS 'Tracks API key usage for analytics';
COMMENT ON TABLE api_rate_limits IS 'Manages rate limiting per API key';
COMMENT ON TABLE api_integration_logs IS 'Logs integration events for monitoring';

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 038_couple_signup_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- WS-075: Couple Signup System with OAuth and Invitation Linking
-- Date: 2025-08-22
-- Purpose: Complete couple onboarding system with OAuth integration and supplier linking

-- Create couples table for complete couple profiles
DROP VIEW IF EXISTS public CASCADE;
CREATE TABLE IF NOT EXISTS public.couples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    wedding_date DATE,
    venue_name TEXT,
    venue_address TEXT,
    guest_count INTEGER,
    budget DECIMAL(10,2),
    invitation_token UUID UNIQUE,
    supplier_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_progress JSONB DEFAULT '{"steps_completed": 0, "total_steps": 5, "current_step": "account_creation"}'::JSONB,
    wedding_style TEXT,
    wedding_theme TEXT,
    partner_first_name TEXT,
    partner_last_name TEXT,
    partner_email TEXT,
    partner_phone TEXT,
    primary_contact_preference TEXT DEFAULT 'email',
    notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create OAuth accounts tracking table
CREATE TABLE IF NOT EXISTS public.oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'apple', 'facebook')),
    provider_user_id TEXT NOT NULL,
    provider_email TEXT,
    provider_name TEXT,
    provider_picture TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

-- Create invitation links table for tracking supplier invitations
CREATE TABLE IF NOT EXISTS public.invitation_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token UUID UNIQUE DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
    couple_email TEXT NOT NULL,
    couple_name TEXT,
    wedding_date DATE,
    venue_name TEXT,
    prefilled_data JSONB DEFAULT '{}'::JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    accepted_at TIMESTAMPTZ,
    accepted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create onboarding steps tracking table
CREATE TABLE IF NOT EXISTS public.onboarding_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    step_name TEXT NOT NULL,
    step_order INTEGER NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    data JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(couple_id, step_name)
);

-- Create couple preferences table
CREATE TABLE IF NOT EXISTS public.couple_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE UNIQUE,
    language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'America/New_York',
    currency TEXT DEFAULT 'USD',
    date_format TEXT DEFAULT 'MM/DD/YYYY',
    communication_preferences JSONB DEFAULT '{
        "email_frequency": "weekly",
        "sms_enabled": false,
        "push_enabled": true,
        "marketing_emails": true,
        "reminder_emails": true
    }'::JSONB,
    dashboard_settings JSONB DEFAULT '{
        "default_view": "timeline",
        "show_budget_widget": true,
        "show_guest_widget": true,
        "show_tasks_widget": true
    }'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create couple-vendor relationships table
CREATE TABLE IF NOT EXISTS public.couple_vendor_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
    relationship_type TEXT DEFAULT 'client' CHECK (relationship_type IN ('client', 'lead', 'inquiry', 'past_client')),
    connected_via TEXT CHECK (connected_via IN ('invitation', 'direct_signup', 'referral', 'marketplace')),
    invitation_link_id UUID REFERENCES public.invitation_links(id) ON DELETE SET NULL,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(couple_id, vendor_id)
);

-- Create signup analytics table
CREATE TABLE IF NOT EXISTS public.signup_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    signup_method TEXT CHECK (signup_method IN ('email', 'google', 'apple', 'facebook', 'invitation')),
    referral_source TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    device_type TEXT,
    browser TEXT,
    ip_address INET,
    country TEXT,
    time_to_complete_seconds INTEGER,
    abandoned_at_step TEXT,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_couples_user_id ON public.couples(user_id);
CREATE INDEX IF NOT EXISTS idx_couples_partner_user_id ON public.couples(partner_user_id);
CREATE INDEX IF NOT EXISTS idx_couples_supplier_id ON public.couples(supplier_id);
CREATE INDEX IF NOT EXISTS idx_couples_invitation_token ON public.couples(invitation_token);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON public.oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON public.oauth_accounts(provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_invitation_links_token ON public.invitation_links(token);
CREATE INDEX IF NOT EXISTS idx_invitation_links_supplier_id ON public.invitation_links(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invitation_links_status ON public.invitation_links(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_couple_id ON public.onboarding_steps(couple_id);
CREATE INDEX IF NOT EXISTS idx_couple_vendor_relationships_couple_id ON public.couple_vendor_relationships(couple_id);
CREATE INDEX IF NOT EXISTS idx_couple_vendor_relationships_vendor_id ON public.couple_vendor_relationships(vendor_id);
CREATE INDEX IF NOT EXISTS idx_signup_analytics_user_id ON public.signup_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_signup_analytics_signup_method ON public.signup_analytics(signup_method);

-- Enable RLS
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_vendor_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for couples
CREATE POLICY "Users can view their own couple profile" ON public.couples
    FOR SELECT USING (auth.uid() IN (user_id, partner_user_id));

CREATE POLICY "Users can update their own couple profile" ON public.couples
    FOR UPDATE USING (auth.uid() IN (user_id, partner_user_id));

CREATE POLICY "Users can create couple profile" ON public.couples
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- RLS Policies for oauth_accounts
CREATE POLICY "Users can view their own OAuth accounts" ON public.oauth_accounts
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can manage their own OAuth accounts" ON public.oauth_accounts
    FOR ALL USING ((SELECT auth.uid()) = user_id);

-- RLS Policies for invitation_links
CREATE POLICY "Suppliers can view their invitation links" ON public.invitation_links
    FOR SELECT USING (
        supplier_id IN (
            SELECT id FROM public.vendors WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Public can view invitation by token" ON public.invitation_links
    FOR SELECT USING (true);

CREATE POLICY "Suppliers can create invitation links" ON public.invitation_links
    FOR INSERT WITH CHECK (
        supplier_id IN (
            SELECT id FROM public.vendors WHERE user_id = (SELECT auth.uid())
        )
    );

-- RLS Policies for onboarding_steps
CREATE POLICY "Users can view their onboarding steps" ON public.onboarding_steps
    FOR SELECT USING (
        couple_id IN (
            SELECT id FROM public.couples WHERE auth.uid() IN (user_id, partner_user_id)
        )
    );

CREATE POLICY "Users can update their onboarding steps" ON public.onboarding_steps
    FOR UPDATE USING (
        couple_id IN (
            SELECT id FROM public.couples WHERE auth.uid() IN (user_id, partner_user_id)
        )
    );

-- RLS Policies for couple_preferences
CREATE POLICY "Users can manage their preferences" ON public.couple_preferences
    FOR ALL USING (
        couple_id IN (
            SELECT id FROM public.couples WHERE auth.uid() IN (user_id, partner_user_id)
        )
    );

-- RLS Policies for couple_vendor_relationships
CREATE POLICY "Couples can view their vendor relationships" ON public.couple_vendor_relationships
    FOR SELECT USING (
        couple_id IN (
            SELECT id FROM public.couples WHERE auth.uid() IN (user_id, partner_user_id)
        ) OR
        vendor_id IN (
            SELECT id FROM public.vendors WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Couples and vendors can create relationships" ON public.couple_vendor_relationships
    FOR INSERT WITH CHECK (
        couple_id IN (
            SELECT id FROM public.couples WHERE auth.uid() IN (user_id, partner_user_id)
        ) OR
        vendor_id IN (
            SELECT id FROM public.vendors WHERE user_id = (SELECT auth.uid())
        )
    );

-- RLS Policies for signup_analytics
CREATE POLICY "System can write signup analytics" ON public.signup_analytics
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view signup analytics" ON public.signup_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    );

-- Helper functions for signup flow
CREATE OR REPLACE FUNCTION public.create_couple_from_invitation(
    p_user_id UUID,
    p_invitation_token UUID
) RETURNS UUID AS $$
DECLARE
    v_couple_id UUID;
    v_invitation RECORD;
BEGIN
    -- Get invitation details
    SELECT * INTO v_invitation
    FROM public.invitation_links
    WHERE token = p_invitation_token AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invitation';
    END IF;
    
    -- Create couple profile with prefilled data
    INSERT INTO public.couples (
        user_id,
        invitation_token,
        supplier_id,
        wedding_date,
        venue_name,
        onboarding_progress
    ) VALUES (
        p_user_id,
        p_invitation_token,
        v_invitation.supplier_id,
        v_invitation.wedding_date,
        v_invitation.venue_name,
        jsonb_build_object(
            'steps_completed', 1,
            'total_steps', 5,
            'current_step', 'basic_info'
        )
    ) RETURNING id INTO v_couple_id;
    
    -- Create vendor relationship
    INSERT INTO public.couple_vendor_relationships (
        couple_id,
        vendor_id,
        relationship_type,
        connected_via,
        invitation_link_id
    ) VALUES (
        v_couple_id,
        v_invitation.supplier_id,
        'client',
        'invitation',
        v_invitation.id
    );
    
    -- Update invitation status
    UPDATE public.invitation_links
    SET status = 'accepted',
        accepted_at = NOW(),
        accepted_by_user_id = p_user_id
    WHERE id = v_invitation.id;
    
    -- Create default preferences
    INSERT INTO public.couple_preferences (couple_id)
    VALUES (v_couple_id);
    
    -- Track initial onboarding step
    INSERT INTO public.onboarding_steps (
        couple_id,
        step_name,
        step_order,
        completed,
        completed_at
    ) VALUES (
        v_couple_id,
        'account_creation',
        1,
        true,
        NOW()
    );
    
    RETURN v_couple_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track onboarding progress
CREATE OR REPLACE FUNCTION public.update_onboarding_progress(
    p_couple_id UUID,
    p_step_name TEXT,
    p_step_data JSONB DEFAULT '{}'::JSONB
) RETURNS JSONB AS $$
DECLARE
    v_progress JSONB;
    v_completed_steps INTEGER;
    v_total_steps INTEGER := 5;
BEGIN
    -- Mark step as completed
    INSERT INTO public.onboarding_steps (
        couple_id,
        step_name,
        step_order,
        completed,
        completed_at,
        data
    ) VALUES (
        p_couple_id,
        p_step_name,
        CASE p_step_name
            WHEN 'account_creation' THEN 1
            WHEN 'basic_info' THEN 2
            WHEN 'partner_info' THEN 3
            WHEN 'vendor_connection' THEN 4
            WHEN 'preferences' THEN 5
            ELSE 6
        END,
        true,
        NOW(),
        p_step_data
    ) ON CONFLICT (couple_id, step_name) DO UPDATE
    SET completed = true,
        completed_at = NOW(),
        data = p_step_data;
    
    -- Count completed steps
    SELECT COUNT(*) INTO v_completed_steps
    FROM public.onboarding_steps
    WHERE couple_id = p_couple_id AND completed = true;
    
    -- Update progress
    v_progress := jsonb_build_object(
        'steps_completed', v_completed_steps,
        'total_steps', v_total_steps,
        'current_step', p_step_name,
        'percentage', (v_completed_steps::FLOAT / v_total_steps * 100)::INTEGER
    );
    
    -- Update couple record
    UPDATE public.couples
    SET onboarding_progress = v_progress,
        onboarding_completed = (v_completed_steps >= v_total_steps)
    WHERE id = p_couple_id;
    
    RETURN v_progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_couples_updated_at
    BEFORE UPDATE ON public.couples
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_oauth_accounts_updated_at
    BEFORE UPDATE ON public.oauth_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_invitation_links_updated_at
    BEFORE UPDATE ON public.invitation_links
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_couple_preferences_updated_at
    BEFORE UPDATE ON public.couple_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Grant permissions
GRANT ALL ON public.couples TO authenticated;
GRANT ALL ON public.oauth_accounts TO authenticated;
GRANT ALL ON public.invitation_links TO authenticated;
GRANT ALL ON public.onboarding_steps TO authenticated;
GRANT ALL ON public.couple_preferences TO authenticated;
GRANT ALL ON public.couple_vendor_relationships TO authenticated;
GRANT INSERT ON public.signup_analytics TO authenticated;
GRANT SELECT ON public.signup_analytics TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.couples IS 'WS-075: Complete couple profiles with wedding details and onboarding tracking';
COMMENT ON TABLE public.oauth_accounts IS 'WS-075: OAuth provider accounts linked to users';
COMMENT ON TABLE public.invitation_links IS 'WS-075: Supplier invitation links for couple onboarding';
COMMENT ON TABLE public.onboarding_steps IS 'WS-075: Tracking individual onboarding steps completion';
COMMENT ON TABLE public.couple_preferences IS 'WS-075: Couple preferences and settings';
COMMENT ON TABLE public.couple_vendor_relationships IS 'WS-075: Relationships between couples and vendors';
COMMENT ON TABLE public.signup_analytics IS 'WS-075: Analytics tracking for signup funnel';

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000002_base_schema.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations Table
DROP VIEW IF EXISTS organizations CASCADE;
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  domain VARCHAR(255),
  pricing_tier VARCHAR(20) DEFAULT 'FREE' CHECK (pricing_tier IN ('FREE', 'STARTER', 'PROFESSIONAL', 'SCALE', 'ENTERPRISE')),
  max_users INTEGER DEFAULT 1,
  max_forms INTEGER DEFAULT 1,
  max_submissions INTEGER DEFAULT 100,
  max_journeys INTEGER DEFAULT 1,
  max_sms_credits INTEGER DEFAULT 0,
  logo_url VARCHAR(500),
  primary_color VARCHAR(7) DEFAULT '#7c3aed',
  secondary_color VARCHAR(7) DEFAULT '#db2777',
  settings JSONB DEFAULT '{}'::jsonb,
  features JSONB DEFAULT '{}'::jsonb,
  billing_email VARCHAR(255),
  billing_address JSONB,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  subscription_status VARCHAR(50),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Profiles Table
DROP VIEW IF EXISTS user_profiles CASCADE;
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  role VARCHAR(20) DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  full_name VARCHAR(255) GENERATED ALWAYS AS (COALESCE(first_name || ' ' || last_name, first_name, last_name, '')) STORED,
  avatar_url VARCHAR(500),
  phone VARCHAR(50),
  timezone VARCHAR(100) DEFAULT 'UTC',
  preferences JSONB DEFAULT '{}'::jsonb,
  notification_settings JSONB DEFAULT '{
    "email": true,
    "push": true,
    "sms": false,
    "marketing": true
  }'::jsonb,
  last_active_at TIMESTAMP WITH TIME ZONE,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forms Table
DROP VIEW IF EXISTS forms CASCADE;
CREATE TABLE IF NOT EXISTS forms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(255) NOT NULL,
  fields JSONB DEFAULT '[]'::jsonb,
  sections JSONB DEFAULT '[]'::jsonb,
  logic JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  theme_config JSONB DEFAULT '{}'::jsonb,
  notification_settings JSONB DEFAULT '{}'::jsonb,
  is_published BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_template BOOLEAN DEFAULT false,
  embed_enabled BOOLEAN DEFAULT true,
  embed_code TEXT,
  allowed_domains TEXT[],
  view_count INTEGER DEFAULT 0,
  submission_count INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2),
  created_by UUID REFERENCES user_profiles(id),
  tags TEXT[],
  category VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(organization_id, slug)
);

-- Form Submissions Table
DROP VIEW IF EXISTS form_submissions CASCADE;
CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  files JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  device_info JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'processed', 'archived')),
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  notes TEXT,
  internal_notes TEXT,
  contact_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contacts Table (Legacy - will be replaced by clients)
DROP VIEW IF EXISTS contacts CASCADE;
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(25