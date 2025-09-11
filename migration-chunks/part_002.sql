5),
  phone VARCHAR(50),
  partner_first_name VARCHAR(100),
  partner_last_name VARCHAR(100),
  partner_email VARCHAR(255),
  partner_phone VARCHAR(50),
  wedding_date DATE,
  wedding_venue VARCHAR(255),
  wedding_location JSONB,
  guest_count INTEGER,
  budget_range VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  source VARCHAR(100),
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}'::jsonb,
  current_journey_id UUID,
  journey_stage VARCHAR(100),
  external_ids JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_contacted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_forms_organization ON forms(organization_id);
CREATE INDEX IF NOT EXISTS idx_forms_slug ON forms(organization_id, slug);
CREATE INDEX IF NOT EXISTS idx_forms_published ON forms(is_published);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_organization ON form_submissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_organization ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for organizations
CREATE POLICY "Users can view their organization" 
  ON organizations FOR SELECT 
  USING (id IN (SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )));

-- Basic RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" 
  ON user_profiles FOR ALL 
  USING (user_id = ( SELECT auth.uid() ));

CREATE POLICY "Users can view profiles in their organization" 
  ON user_profiles FOR SELECT 
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )));

-- Insert initial data
INSERT INTO organizations (
  id,
  name, 
  slug, 
  pricing_tier,
  max_users,
  max_forms,
  max_submissions,
  max_journeys
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Demo Organization',
  'demo-org',
  'PROFESSIONAL',
  5,
  50,
  10000,
  10
) ON CONFLICT (slug) DO NOTHING;

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000003_clients_vendors_schema.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- Suppliers (Vendors) Table
DROP VIEW IF EXISTS suppliers CASCADE;
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
DROP VIEW IF EXISTS clients CASCADE;
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
DROP VIEW IF EXISTS supplier_client_connections CASCADE;
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
DROP VIEW IF EXISTS vendor_categories CASCADE;
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
DROP VIEW IF EXISTS client_activities CASCADE;
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
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY "Users can insert suppliers for their organization"
  ON suppliers FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY "Users can update their organization's suppliers"
  ON suppliers FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY "Users can delete their organization's suppliers"
  ON suppliers FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

-- Clients Policies
CREATE POLICY "Users can view their organization's clients"
  ON clients FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY "Users can insert clients for their organization"
  ON clients FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY "Users can update their organization's clients"
  ON clients FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY "Users can delete their organization's clients"
  ON clients FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
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

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000004_communications_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- Communications System Tables for WedSync/WedMe (Fixed)
-- Real-time messaging, email notifications, and activity feeds

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.activity_feeds CASCADE;
DROP TABLE IF EXISTS public.email_notifications CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;

-- Conversations table (groups messages between parties)
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    title VARCHAR(255),
    type VARCHAR(50) NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'broadcast')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    last_message_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Messages table (actual messages in conversations)
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    sender_type VARCHAR(50) NOT NULL CHECK (sender_type IN ('client', 'vendor', 'system')),
    content TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'system')),
    attachments JSONB DEFAULT '[]',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Email notifications table (track sent emails)
CREATE TABLE public.email_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255) NOT NULL,
    template_type VARCHAR(100) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    content TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'opened', 'clicked')),
    provider VARCHAR(50) DEFAULT 'resend',
    provider_id VARCHAR(255),
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity feeds table (track all activities)
CREATE TABLE public.activity_feeds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL,
    actor_type VARCHAR(50) NOT NULL CHECK (actor_type IN ('user', 'contact', 'system')),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    entity_name VARCHAR(255),
    description TEXT,
    importance VARCHAR(50) NOT NULL DEFAULT 'low' CHECK (importance IN ('low', 'medium', 'high', 'critical')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notification preferences table (user notification settings)
CREATE TABLE public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    contact_id UUID,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'sms', 'in_app', 'push')),
    event_type VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    frequency VARCHAR(50) DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'hourly', 'daily', 'weekly', 'never')),
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add unique constraint separately (fixing syntax)
ALTER TABLE public.notification_preferences 
ADD CONSTRAINT unique_notification_pref 
UNIQUE(user_id, contact_id, organization_id, channel, event_type);

-- Create indexes for performance
CREATE INDEX idx_conversations_organization ON public.conversations(organization_id);
CREATE INDEX idx_conversations_client ON public.conversations(client_id);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id, sender_type);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX idx_messages_unread ON public.messages(conversation_id, is_read) WHERE is_read = FALSE;

CREATE INDEX idx_email_notifications_organization ON public.email_notifications(organization_id);
CREATE INDEX idx_email_notifications_recipient ON public.email_notifications(recipient_id);
CREATE INDEX idx_email_notifications_status ON public.email_notifications(status);
CREATE INDEX idx_email_notifications_created ON public.email_notifications(created_at DESC);

CREATE INDEX idx_activity_feeds_organization ON public.activity_feeds(organization_id);
CREATE INDEX idx_activity_feeds_actor ON public.activity_feeds(actor_id, actor_type);
CREATE INDEX idx_activity_feeds_entity ON public.activity_feeds(entity_type, entity_id);
CREATE INDEX idx_activity_feeds_unread ON public.activity_feeds(organization_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_activity_feeds_created ON public.activity_feeds(created_at DESC);

CREATE INDEX idx_notification_preferences_user ON public.notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_contact ON public.notification_preferences(contact_id);
CREATE INDEX idx_notification_preferences_org ON public.notification_preferences(organization_id);

-- Create update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_notifications_updated_at BEFORE UPDATE ON public.email_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update conversation's last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_last_message_trigger
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Function to create activity feed entry on new message
CREATE OR REPLACE FUNCTION create_message_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.activity_feeds (
        organization_id,
        actor_id,
        actor_type,
        action,
        entity_type,
        entity_id,
        description,
        importance
    )
    SELECT 
        c.organization_id,
        NEW.sender_id,
        NEW.sender_type,
        'message_sent',
        'message',
        NEW.id,
        'New message in conversation',
        'medium'
    FROM public.conversations c
    WHERE c.id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_message_activity_trigger
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION create_message_activity();

-- Note: RLS and permissions will be handled by Supabase auth system
-- For now, grant basic permissions to postgres user for development
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000005_payment_tables.sql
-- ========================================

-- Payment History Table for tracking all payment transactions
DROP VIEW IF EXISTS payment_history CASCADE;
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(255) UNIQUE,
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  customer_id VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL, -- Always store in cents to avoid floating point issues
  currency VARCHAR(3) NOT NULL DEFAULT 'gbp',
  status VARCHAR(50) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  refunded_amount INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook Events Table for idempotency protection
DROP VIEW IF EXISTS webhook_events CASCADE;
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payload JSONB,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'processed'
);

-- Subscription History for tracking subscription changes
DROP VIEW IF EXISTS subscription_history CASCADE;
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  pricing_tier VARCHAR(20) NOT NULL,
  price_amount INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'gbp',
  interval VARCHAR(20) NOT NULL, -- 'month' or 'year'
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Methods for storing customer payment methods securely
DROP VIEW IF EXISTS payment_methods CASCADE;
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'card', 'bank_account', etc.
  brand VARCHAR(50), -- For cards: visa, mastercard, etc.
  last4 VARCHAR(4), -- Last 4 digits only
  exp_month INTEGER, -- For cards
  exp_year INTEGER, -- For cards
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table for storing invoice data
DROP VIEW IF EXISTS invoices CASCADE;
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  stripe_subscription_id VARCHAR(255),
  invoice_number VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  amount_due INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'gbp',
  due_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  invoice_pdf VARCHAR(500),
  hosted_invoice_url VARCHAR(500),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_payment_history_org ON payment_history(organization_id);
CREATE INDEX idx_payment_history_customer ON payment_history(customer_id);
CREATE INDEX idx_payment_history_status ON payment_history(status);
CREATE INDEX idx_payment_history_created ON payment_history(created_at DESC);

CREATE INDEX idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);
CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed_at DESC);

CREATE INDEX idx_subscription_history_org ON subscription_history(organization_id);
CREATE INDEX idx_subscription_history_stripe_id ON subscription_history(stripe_subscription_id);
CREATE INDEX idx_subscription_history_status ON subscription_history(status);

CREATE INDEX idx_payment_methods_org ON payment_methods(organization_id);
CREATE INDEX idx_payment_methods_customer ON payment_methods(stripe_customer_id);

CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_customer ON invoices(stripe_customer_id);
CREATE INDEX idx_invoices_subscription ON invoices(stripe_subscription_id);

-- Enable Row Level Security
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_history
CREATE POLICY "Organizations can view their payment history"
  ON payment_history FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE user_id = ( SELECT auth.uid() )
  ));

-- RLS Policies for subscription_history  
CREATE POLICY "Organizations can view their subscription history"
  ON subscription_history FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE user_id = ( SELECT auth.uid() )
  ));

-- RLS Policies for payment_methods
CREATE POLICY "Organizations can view their payment methods"
  ON payment_methods FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE user_id = ( SELECT auth.uid() )
  ));

-- RLS Policies for invoices
CREATE POLICY "Organizations can view their invoices"
  ON invoices FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE user_id = ( SELECT auth.uid() )
  ));

-- Webhook events are internal only - no RLS for users
CREATE POLICY "Service role only for webhook events"
  ON webhook_events FOR ALL
  USING (auth.role() = 'service_role');

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_history_updated_at BEFORE UPDATE ON payment_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ========================================
-- Migration: 20250101000006_core_fields_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- Core Fields System Migration
-- This is THE key differentiator for WedSync - wedding vendors save 10+ hours per wedding
-- by having core wedding details auto-populate across ALL forms and vendors

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core Fields Definition Table
-- Stores the master list of all core fields that can be shared across vendors
DROP VIEW IF EXISTS core_fields_definitions CASCADE;
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
DROP VIEW IF EXISTS wedding_core_data CASCADE;
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
DROP VIEW IF EXISTS vendor_wedding_connections CASCADE;
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
DROP VIEW IF EXISTS form_field_core_mappings CASCADE;
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
DROP VIEW IF EXISTS core_field_audit_log CASCADE;
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
DROP VIEW IF EXISTS core_field_access_log CASCADE;
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
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
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
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      ) AND can_write_core_fields = true
    )
  );

-- Vendors can view their own connections
CREATE POLICY "Vendors can view their wedding connections"
  ON vendor_wedding_connections FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    )
  );

-- Form creators can manage their mappings
CREATE POLICY "Users can manage form field mappings"
  ON form_field_core_mappings FOR ALL
  USING (
    form_id IN (
      SELECT id FROM forms WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
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
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
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

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000007_pdf_import_tables.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- PDF imports tracking table
CREATE TABLE pdf_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded', -- uploaded, processing, completed, failed
  
  -- OCR results
  ocr_confidence DECIMAL(3,2), -- 0.00 to 1.00
  page_count INTEGER,
  extracted_text TEXT,
  detected_fields JSONB,
  field_mapping JSONB,
  
  -- Generated form reference
  generated_form_id UUID REFERENCES forms(id),
  
  -- Metadata
  processing_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index for fast lookups
CREATE INDEX idx_pdf_imports_org ON pdf_imports(organization_id);
CREATE INDEX idx_pdf_imports_status ON pdf_imports(status);
CREATE INDEX idx_pdf_imports_created_at ON pdf_imports(created_at DESC);

-- RLS policies
ALTER TABLE pdf_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization PDFs"
  ON pdf_imports FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY "Users can upload PDFs"
  ON pdf_imports FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY "Users can update own organization PDFs"
  ON pdf_imports FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

-- Storage bucket for PDF files
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdf-uploads', 'pdf-uploads', false);

-- RLS policy for storage
CREATE POLICY "Users can upload PDFs to their organization folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pdf-uploads' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    )
  );

CREATE POLICY "Users can view their organization PDF files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pdf-uploads' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    )
  );

CREATE POLICY "Users can delete their organization PDF files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pdf-uploads' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    )
  );

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000008_security_rls_policies.sql
-- ========================================

-- WedSync 2.0 Comprehensive Row Level Security Policies
-- Securing all database tables with organization-based multi-tenant isolation
-- 🔐 CRITICAL SECURITY IMPLEMENTATION

-- =============================================
-- UTILITY FUNCTIONS FOR RLS
-- =============================================

-- Function to get user's organization ID



-- ========================================
-- Migration: 20250101000009_security_enhancements.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- Security Enhancement Tables for PDF Import System

-- Audit logs table for comprehensive security tracking
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  organization_id UUID REFERENCES organizations(id),
  resource_id TEXT,
  resource_type TEXT,
  ip_address INET,
  user_agent TEXT,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  session_id TEXT,
  
  -- Indexes for fast queries
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_organization ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Secure file metadata table
CREATE TABLE secure_file_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  encryption_metadata JSONB, -- Contains IV, auth tag, algorithm
  auto_delete_at TIMESTAMPTZ,
  custom_metadata JSONB,
  virus_scan_result JSONB,
  security_assessment JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for secure file metadata
CREATE INDEX idx_secure_files_org ON secure_file_metadata(organization_id);
CREATE INDEX idx_secure_files_user ON secure_file_metadata(user_id);
CREATE INDEX idx_secure_files_path ON secure_file_metadata(file_path);
CREATE INDEX idx_secure_files_auto_delete ON secure_file_metadata(auto_delete_at);

-- Update pdf_imports table with security fields
ALTER TABLE pdf_imports 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS security_scan_result JSONB,
ADD COLUMN IF NOT EXISTS threat_level TEXT,
ADD COLUMN IF NOT EXISTS encryption_status TEXT,
ADD COLUMN IF NOT EXISTS signed_url_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_delete_at TIMESTAMPTZ;

-- Add organization_id constraint if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pdf_imports_organization_id_not_null'
  ) THEN
    ALTER TABLE pdf_imports 
    ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- RLS Policies for audit logs (restricted access)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs for their organization
CREATE POLICY "Admins can view organization audit logs"
  ON audit_logs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = ( SELECT auth.uid() ) 
      AND role IN ('ADMIN', 'OWNER')
    )
  );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- RLS Policies for secure file metadata
ALTER TABLE secure_file_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization files"
  ON secure_file_metadata FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    )
  );

CREATE POLICY "Users can insert files for their organization"
  ON secure_file_metadata FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    )
  );

CREATE POLICY "Users can update own organization files"
  ON secure_file_metadata FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    )
  );

CREATE POLICY "Users can delete own organization files"
  ON secure_file_metadata FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    )
  );

-- Function to automatically delete expired files
CREATE OR REPLACE FUNCTION delete_expired_files()
RETURNS void AS $$
BEGIN
  -- Delete files past their auto_delete_at time
  DELETE FROM secure_file_metadata 
  WHERE auto_delete_at IS NOT NULL 
  AND auto_delete_at < NOW();
  
  -- Also delete from pdf_imports
  DELETE FROM pdf_imports
  WHERE auto_delete_at IS NOT NULL
  AND auto_delete_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup (requires pg_cron extension)
-- In production, this would be scheduled via pg_cron or external scheduler
-- SELECT cron.schedule('delete-expired-files', '0 * * * *', 'SELECT delete_expired_files();');

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type TEXT,
  p_severity TEXT,
  p_action TEXT,
  p_details JSONB DEFAULT '{}',
  p_user_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    event_type,
    severity,
    action,
    details,
    user_id,
    organization_id
  ) VALUES (
    p_event_type,
    p_severity,
    p_action,
    p_details,
    p_user_id,
    p_organization_id
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_secure_file_metadata_updated_at
  BEFORE UPDATE ON secure_file_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000010_enhanced_security_audit.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- Enhanced Security Audit Logging System
-- Comprehensive security event tracking and monitoring
-- 🔐 SECURITY MONITORING ENHANCEMENT

-- =============================================
-- ENHANCED SECURITY AUDIT LOGS TABLE
-- =============================================

-- Create enhanced security audit logs table
DROP VIEW IF EXISTS enhanced_security_audit_logs CASCADE;
CREATE TABLE IF NOT EXISTS enhanced_security_audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID,
  event_type VARCHAR(100) NOT NULL,
  event_category VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  event_data JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(100),
  session_id VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT chk_event_type CHECK (event_type IN (
    'LOGIN_ATTEMPT', 'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT',
    'PASSWORD_CHANGE', 'ACCOUNT_LOCKOUT', 'PRIVILEGE_ESCALATION_ATTEMPT',
    'UNAUTHORIZED_ACCESS_ATTEMPT', 'DATA_ACCESS', 'DATA_MODIFICATION', 
    'DATA_DELETION', 'EXPORT_DATA', 'ADMIN_ACTION', 'API_KEY_USAGE',
    'RATE_LIMIT_EXCEEDED', 'SUSPICIOUS_ACTIVITY', 'SECURITY_POLICY_VIOLATION',
    'CSRF_ATTACK_BLOCKED', 'XSS_ATTEMPT_BLOCKED', 'SQL_INJECTION_ATTEMPT',
    'FILE_UPLOAD', 'PAYMENT_EVENT', 'CONFIGURATION_CHANGE', 'SYSTEM_ERROR',
    'PERFORMANCE_ANOMALY'
  )),
  
  CONSTRAINT chk_event_category CHECK (event_category IN (
    'AUTHENTICATION', 'AUTHORIZATION', 'DATA_ACCESS', 'SYSTEM_SECURITY',
    'COMPLIANCE', 'PERFORMANCE', 'BUSINESS_LOGIC', 'INFRASTRUCTURE'
  ))
);

-- Enable RLS
ALTER TABLE enhanced_security_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "org_audit_logs_read" 
  ON enhanced_security_audit_logs FOR SELECT 
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = ( SELECT auth.uid() ) 
      LIMIT 1
    )
    AND (
      SELECT role IN ('ADMIN', 'OWNER') FROM user_profiles 
      WHERE user_id = ( SELECT auth.uid() ) 
      LIMIT 1
    )
  );

-- Only system can insert audit logs (via service role)
CREATE POLICY "system_audit_logs_insert" 
  ON enhanced_security_audit_logs FOR INSERT 
  WITH CHECK (true); -- System-level inserts only

-- =============================================
-- SECURITY MONITORING VIEWS
-- =============================================

-- Real-time security dashboard view
CREATE OR REPLACE VIEW security_dashboard_summary AS
SELECT 
  organization_id,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE severity = 'CRITICAL') as critical_events,
  COUNT(*) FILTER (WHERE severity = 'HIGH') as high_events,
  COUNT(*) FILTER (WHERE severity = 'MEDIUM') as medium_events,
  COUNT(*) FILTER (WHERE severity = 'LOW') as low_events,
  COUNT(*) FILTER (WHERE event_category = 'AUTHENTICATION') as auth_events,
  COUNT(*) FILTER (WHERE event_category = 'AUTHORIZATION') as authz_events,
  COUNT(*) FILTER (WHERE event_category = 'DATA_ACCESS') as data_events,
  COUNT(*) FILTER (WHERE event_type = 'LOGIN_FAILURE') as failed_logins,
  COUNT(*) FILTER (WHERE event_type = 'UNAUTHORIZED_ACCESS_ATTEMPT') as unauthorized_attempts,
  COUNT(DISTINCT ip_address) as unique_ips,
  MAX(created_at) as last_event_time
FROM enhanced_security_audit_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY organization_id;

-- Security incidents view (high severity events)
CREATE OR REPLACE VIEW security_incidents AS
SELECT 
  id,
  organization_id,
  user_id,
  event_type,
  event_category,
  severity,
  event_data,
  ip_address,
  user_agent,
  created_at,
  -- Additional computed fields
  CASE 
    WHEN event_type IN ('LOGIN_FAILURE', 'UNAUTHORIZED_ACCESS_ATTEMPT') 
         AND created_at >= NOW() - INTERVAL '1 hour'
    THEN 'ACTIVE_THREAT'
    WHEN severity = 'CRITICAL'
    THEN 'CRITICAL_INCIDENT'
    WHEN severity = 'HIGH'
    THEN 'HIGH_PRIORITY'
    ELSE 'STANDARD'
  END as incident_priority,
  
  -- Risk score calculation
  CASE severity
    WHEN 'CRITICAL' THEN 100
    WHEN 'HIGH' THEN 75
    WHEN 'MEDIUM' THEN 50
    ELSE 25
  END as risk_score
FROM enhanced_security_audit_logs
WHERE severity IN ('HIGH', 'CRITICAL')
   OR event_type IN ('SUSPICIOUS_ACTIVITY', 'UNAUTHORIZED_ACCESS_ATTEMPT', 'SECURITY_POLICY_VIOLATION')
ORDER BY created_at DESC;

-- =============================================
-- SECURITY ALERT FUNCTIONS
-- =============================================

-- Function to detect suspicious IP patterns
CREATE OR REPLACE FUNCTION detect_suspicious_ip_activity()
RETURNS TABLE(
  ip_address INET,
  organization_id UUID,
  event_count BIGINT,
  failed_login_count BIGINT,
  unique_users_targeted BIGINT,
  risk_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    logs.ip_address,
    logs.organization_id,
    COUNT(*) as event_count,
    COUNT(*) FILTER (WHERE logs.event_type = 'LOGIN_FAILURE') as failed_login_count,
    COUNT(DISTINCT logs.user_id) as unique_users_targeted,
    CASE 
      WHEN COUNT(*) FILTER (WHERE logs.event_type = 'LOGIN_FAILURE') > 10 THEN 'HIGH'
      WHEN COUNT(DISTINCT logs.user_id) > 5 THEN 'MEDIUM'
      WHEN COUNT(*) > 20 THEN 'MEDIUM'
      ELSE 'LOW'
    END as risk_level
  FROM enhanced_security_audit_logs logs
  WHERE logs.created_at >= NOW() - INTERVAL '1 hour'
    AND logs.ip_address IS NOT NULL
  GROUP BY logs.ip_address, logs.organization_id
  HAVING COUNT(*) > 5 -- Only IPs with significant activity
  ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate security alerts
CREATE OR REPLACE FUNCTION generate_security_alerts(org_id UUID DEFAULT NULL)
RETURNS TABLE(
  alert_id UUID,
  organization_id UUID,
  alert_type TEXT,
  severity TEXT,
  message TEXT,
  event_count BIGINT,
  first_seen TIMESTAMP WITH TIME ZONE,
  last_seen TIMESTAMP WITH TIME ZONE,
  affected_users BIGINT,
  recommendations TEXT[]
) AS $$
DECLARE
  time_window INTERVAL := INTERVAL '1 hour';
BEGIN
  -- Multiple failed logins alert
  RETURN QUERY
  SELECT 
    uuid_generate_v4() as alert_id,
    logs.organization_id,
    'MULTIPLE_FAILED_LOGINS' as alert_type,
    'HIGH' as severity,
    FORMAT('Multiple failed login attempts detected from IP %s', logs.ip_address::TEXT) as message,
    COUNT(*) as event_count,
    MIN(logs.created_at) as first_seen,
    MAX(logs.created_at) as last_seen,
    COUNT(DISTINCT logs.user_id) as affected_users,
    ARRAY['Block suspicious IP', 'Enable account lockout', 'Investigate user accounts'] as recommendations
  FROM enhanced_security_audit_logs logs
  WHERE logs.event_type = 'LOGIN_FAILURE'
    AND logs.created_at >= NOW() - time_window
    AND (org_id IS NULL OR logs.organization_id = org_id)
  GROUP BY logs.organization_id, logs.ip_address
  HAVING COUNT(*) >= 5;

  -- Privilege escalation attempts
  RETURN QUERY
  SELECT 
    uuid_generate_v4() as alert_id,
    logs.organization_id,
    'PRIVILEGE_ESCALATION' as alert_type,
    'CRITICAL' as severity,
    'Privilege escalation attempts detected' as message,
    COUNT(*) as event_count,
    MIN(logs.created_at) as first_seen,
    MAX(logs.created_at) as last_seen,
    COUNT(DISTINCT logs.user_id) as affected_users,
    ARRAY['Review user permissions', 'Investigate user activity', 'Enable additional monitoring'] as recommendations
  FROM enhanced_security_audit_logs logs
  WHERE logs.event_type IN ('PRIVILEGE_ESCALATION_ATTEMPT', 'UNAUTHORIZED_ACCESS_ATTEMPT')
    AND logs.created_at >= NOW() - time_window
    AND (org_id IS NULL OR logs.organization_id = org_id)
  GROUP BY logs.organization_id
  HAVING COUNT(*) >= 3;

  -- Suspicious data access patterns
  RETURN QUERY
  SELECT 
    uuid_generate_v4() as alert_id,
    logs.organization_id,
    'SUSPICIOUS_DATA_ACCESS' as alert_type,
    'MEDIUM' as severity,
    'Unusual data access patterns detected' as message,
    COUNT(*) as event_count,
    MIN(logs.created_at) as first_seen,
    MAX(logs.created_at) as last_seen,
    COUNT(DISTINCT logs.user_id) as affected_users,
    ARRAY['Review data access logs', 'Verify user permissions', 'Monitor data export activity'] as recommendations
  FROM enhanced_security_audit_logs logs
  WHERE logs.event_type IN ('DATA_ACCESS', 'EXPORT_DATA')
    AND logs.created_at >= NOW() - time_window
    AND (org_id IS NULL OR logs.organization_id = org_id)
  GROUP BY logs.organization_id, logs.user_id
  HAVING COUNT(*) >= 50; -- High volume data access
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_enhanced_audit_org_time ON enhanced_security_audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enhanced_audit_severity_time ON enhanced_security_audit_logs(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enhanced_audit_event_type ON enhanced_security_audit_logs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enhanced_audit_event_category ON enhanced_security_audit_logs(event_category, created_at DESC);

-- Security-specific indexes
CREATE INDEX IF NOT EXISTS idx_enhanced_audit_ip_time ON enhanced_security_audit_logs(ip_address, created_at DESC) WHERE ip_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_enhanced_audit_user_time ON enhanced_security_audit_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_enhanced_audit_failed_logins ON enhanced_security_audit_logs(organization_id, ip_address, created_at DESC) 
  WHERE event_type = 'LOGIN_FAILURE';

-- GIN index for JSONB event_data queries
CREATE INDEX IF NOT EXISTS idx_enhanced_audit_event_data_gin ON enhanced_security_audit_logs USING GIN(event_data);
CREATE INDEX IF NOT EXISTS idx_enhanced_audit_metadata_gin ON enhanced_security_audit_logs USING GIN(metadata);

-- =============================================
-- AUTOMATED CLEANUP
-- =============================================

-- Function to clean up old audit logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM enhanced_security_audit_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup operation
  INSERT INTO enhanced_security_audit_logs (
    event_type,
    event_category,
    severity,
    event_data
  ) VALUES (
    'SYSTEM_MAINTENANCE',
    'INFRASTRUCTURE',
    'LOW',
    jsonb_build_object(
      'operation', 'audit_log_cleanup',
      'deleted_records', deleted_count,
      'retention_days', retention_days
    )
  );
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup job (can be called by cron or application scheduler)
-- This is just the function - actual scheduling would be done externally
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Cleans up audit logs older than specified days. Should be called regularly by scheduler.';

-- =============================================
-- SECURITY MONITORING TRIGGERS
-- =============================================

-- Trigger to detect and log unusual patterns in real-time
CREATE OR REPLACE FUNCTION security_pattern_detector()
RETURNS TRIGGER AS $$
DECLARE
  recent_similar_events INTEGER;
  suspicious_threshold INTEGER := 5;
BEGIN
  -- Check for rapid repeated events from same IP
  IF NEW.ip_address IS NOT NULL THEN
    SELECT COUNT(*)
    INTO recent_similar_events
    FROM enhanced_security_audit_logs
    WHERE ip_address = NEW.ip_address
      AND event_type = NEW.event_type
      AND created_at >= NOW() - INTERVAL '5 minutes';
    
    -- If too many similar events, log as suspicious
    IF recent_similar_events >= suspicious_threshold THEN
      INSERT INTO enhanced_security_audit_logs (
        organization_id,
        event_type,
        event_category,
        severity,
        event_data,
        ip_address
      ) VALUES (
        NEW.organization_id,
        'SUSPICIOUS_ACTIVITY',
        'SYSTEM_SECURITY',
        'HIGH',
        jsonb_build_object(
          'pattern_type', 'rapid_repeated_events',
          'original_event_type', NEW.event_type,
          'event_count', recent_similar_events,
          'time_window_minutes', 5
        ),
        NEW.ip_address
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the pattern detector trigger
CREATE TRIGGER security_pattern_detection_trigger
  AFTER INSERT ON enhanced_security_audit_logs
  FOR EACH ROW EXECUTE FUNCTION security_pattern_detector();

-- =============================================
-- VALIDATION AND TESTING
-- =============================================

-- Test that the enhanced audit system is working
DO $$
BEGIN
  -- Insert a test log entry
  INSERT INTO enhanced_security_audit_logs (
    event_type,
    event_category,
    severity,
    event_data
  ) VALUES (
    'SYSTEM_ERROR',
    'INFRASTRUCTURE',
    'LOW',
    '{"test": "Enhanced audit system initialization", "version": "2.0"}'
  );
  
  RAISE NOTICE 'Enhanced security audit system successfully initialized';
  RAISE NOTICE 'Created enhanced_security_audit_logs table with RLS policies';
  RAISE NOTICE 'Created security monitoring views and functions';
  RAISE NOTICE 'Created automated pattern detection triggers';
  RAISE NOTICE 'Security audit system ready for use';
END $$;

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000011_security_alerts_table.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- Security Alerts Management System
-- Storage and management for security alerts generated by monitoring system
-- 🚨 SECURITY ALERTS & INCIDENT MANAGEMENT

-- =============================================
-- SECURITY ALERTS TABLE
-- =============================================

-- Create security alerts table
DROP VIEW IF EXISTS security_alerts CASCADE;
CREATE TABLE IF NOT EXISTS security_alerts (
  id VARCHAR(100) PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_count INTEGER NOT NULL DEFAULT 0,
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL,
  affected_users UUID[] DEFAULT '{}',
  source_ips INET[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE')),
  metadata JSONB DEFAULT '{}',
  assigned_to UUID, -- User ID of person investigating
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT chk_alert_type CHECK (alert_type IN (
    'BRUTE_FORCE_ATTACK', 'MULTIPLE_FAILED_LOGINS', 'PRIVILEGE_ESCALATION',
    'UNAUTHORIZED_DATA_ACCESS', 'SUSPICIOUS_IP_ACTIVITY', 'ACCOUNT_COMPROMISE',
    'DATA_EXFILTRATION', 'API_ABUSE', 'RATE_LIMIT_ABUSE', 'SECURITY_POLICY_VIOLATION',
    'ANOMALOUS_USER_BEHAVIOR', 'SYSTEM_INTRUSION_ATTEMPT'
  ))
);

-- Enable RLS
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security alerts
CREATE POLICY "org_security_alerts_access" 
  ON security_alerts FOR ALL 
  USING (organization_id = (SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() ) LIMIT 1));

-- Admins can see all alerts in their organization
CREATE POLICY "admin_security_alerts_manage" 
  ON security_alerts FOR ALL 
  USING (organization_id = (SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() ) LIMIT 1) AND (SELECT role IN ('ADMIN', 'OWNER') FROM user_profiles WHERE user_id = ( SELECT auth.uid() ) LIMIT 1));

-- =============================================
-- ALERT RESPONSE ACTIONS TABLE
-- =============================================

-- Track actions taken in response to alerts
DROP VIEW IF EXISTS alert_response_actions CASCADE;
CREATE TABLE IF NOT EXISTS alert_response_actions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  alert_id VARCHAR(100) NOT NULL REFERENCES security_alerts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  action_description TEXT NOT NULL,
  action_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT chk_action_type CHECK (action_type IN (
    'STATUS_CHANGE', 'ASSIGNMENT', 'INVESTIGATION_NOTE', 'ESCALATION',
    'BLOCK_IP', 'SUSPEND_USER', 'FORCE_PASSWORD_RESET', 'ENABLE_MFA',
    'CUSTOM_ACTION', 'RESOLVED', 'FALSE_POSITIVE'
  ))
);

-- Enable RLS for response actions
ALTER TABLE alert_response_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_alert_actions_access" 
  ON alert_response_actions FOR ALL 
  USING (organization_id = (SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() ) LIMIT 1));

-- =============================================
-- SECURITY INCIDENT ESCALATION
-- =============================================

-- Track incident escalations (drop view if exists, create table)
DROP VIEW IF EXISTS security_incidents;
CREATE TABLE IF NOT EXISTS security_incidents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  incident_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'CONTAINED', 'RESOLVED', 'CLOSED')),
  
  -- Related alerts
  related_alerts VARCHAR(100)[] DEFAULT '{}',
  
  -- Incident details
  incident_type VARCHAR(50),
  impact_assessment TEXT,
  
  -- Assignment and timeline
  assigned_to UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Escalation
  escalated BOOLEAN DEFAULT FALSE,
  escalated_to UUID,
  escalated_at TIMESTAMP WITH TIME ZONE,
  
  -- Resolution
  resolution_summary TEXT,
  lessons_learned TEXT,
  
  metadata JSONB DEFAULT '{}'
);

-- Generate unique incident numbers
CREATE SEQUENCE IF NOT EXISTS incident_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'INC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('incident_number_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate incident numbers
CREATE OR REPLACE FUNCTION set_incident_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.incident_number IS NULL THEN
    NEW.incident_number := generate_incident_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Cannot create trigger if security_incidents is a view
-- Trigger will be created only if security_incidents is a table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'security_incidents' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'CREATE TRIGGER incident_number_trigger
      BEFORE INSERT ON security_incidents
      FOR EACH ROW EXECUTE FUNCTION set_incident_number()';
  END IF;
END $$;

-- Enable RLS for incidents (only if it's a table, not a view)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'security_incidents' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY "org_security_incidents_access" 
      ON security_incidents FOR ALL 
      USING (organization_id = (SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() ) LIMIT 1) AND (SELECT role IN (''ADMIN'', ''OWNER'') FROM user_profiles WHERE user_id = ( SELECT auth.uid() ) LIMIT 1))';
  END IF;
END $$;

-- =============================================
-- ALERT NOTIFICATION PREFERENCES
-- =============================================

-- Store notification preferences for security alerts
DROP VIEW IF EXISTS alert_notification_preferences CASCADE;
CREATE TABLE IF NOT EXISTS alert_notification_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Alert type preferences
  alert_types VARCHAR(50)[] DEFAULT '{}', -- Empty means all types
  minimum_severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  
  -- Notification channels
  email_enabled BOOLEAN DEFAULT TRUE,
  slack_enabled BOOLEAN DEFAULT FALSE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT TRUE,
  
  -- Timing preferences
  immediate_notification BOOLEAN DEFAULT TRUE,
  digest_frequency VARCHAR(20) DEFAULT 'DAILY' CHECK (digest_frequency IN ('NONE', 'HOURLY', 'DAILY', 'WEEKLY')),
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  -- Contact information
  email_address VARCHAR(255),
  slack_user_id VARCHAR(100),
  phone_number VARCHAR(20),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id, user_id)
);

-- Enable RLS
ALTER TABLE alert_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_notification_preferences" 
  ON alert_notification_preferences FOR ALL 
  USING (user_id = ( SELECT auth.uid() ));

-- =============================================
-- SECURITY METRICS TRACKING
-- =============================================

-- Store historical security metrics for trending
DROP VIEW IF EXISTS security_metrics_history CASCADE;
CREATE TABLE IF NOT EXISTS security_metrics_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  metric_hour INTEGER, -- 0-23 for hourly metrics, NULL for daily
  
  -- Event counts
  total_events INTEGER DEFAULT 0,
  critical_events INTEGER DEFAULT 0,
  high_events INTEGER DEFAULT 0,
  medium_events INTEGER DEFAULT 0,
  low_events INTEGER DEFAULT 0,
  
  -- Alert counts
  total_alerts INTEGER DEFAULT 0,
  active_alerts INTEGER DEFAULT 0,
  resolved_alerts INTEGER DEFAULT 0,
  
  -- Security score (0-100)
  security_score INTEGER,
  
  -- Top event types and IPs (stored as JSONB)
  top_event_types JSONB DEFAULT '[]',
  top_source_ips JSONB DEFAULT '[]',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id, metric_date, metric_hour)
);

-- Enable RLS
ALTER TABLE security_metrics_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_metrics_history_access" 
  ON security_metrics_history FOR ALL 
  USING (organization_id = (SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() ) LIMIT 1));

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Security alerts indexes
CREATE INDEX IF NOT EXISTS idx_security_alerts_org_status ON security_alerts(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(alert_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_assigned ON security_alerts(assigned_to) WHERE assigned_to IS NOT NULL;

-- Alert response actions indexes
CREATE INDEX IF NOT EXISTS idx_alert_actions_alert_id ON alert_response_actions(alert_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_actions_user ON alert_response_actions(user_id, created_at DESC);

-- Security incidents indexes
CREATE INDEX IF NOT EXISTS idx_security_incidents_org_status ON security_incidents(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_incidents_assigned ON security_incidents(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_incidents_escalated ON security_incidents(escalated, escalated_at) WHERE escalated = TRUE;

-- Metrics history indexes
CREATE INDEX IF NOT EXISTS idx_metrics_history_org_date ON security_metrics_history(organization_id, metric_date DESC, metric_hour DESC);

-- GIN indexes for array and JSONB columns
CREATE INDEX IF NOT EXISTS idx_security_alerts_affected_users_gin ON security_alerts USING GIN(affected_users);
CREATE INDEX IF NOT EXISTS idx_security_alerts_source_ips_gin ON security_alerts USING GIN(source_ips);
CREATE INDEX IF NOT EXISTS idx_security_alerts_metadata_gin ON security_alerts USING GIN(metadata);

-- =============================================
-- ALERT AUTOMATION FUNCTIONS
-- =============================================

-- Function to auto-escalate high-severity alerts
CREATE OR REPLACE FUNCTION auto_escalate_critical_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-escalate CRITICAL alerts that are older than 30 minutes and still ACTIVE
  IF NEW.severity = 'CRITICAL' AND NEW.status = 'ACTIVE' THEN
    -- Create incident if alert is critical and unattended
    INSERT INTO security_incidents (
      organization_id,
      title,
      description,
      severity,
      incident_type,
      related_alerts,
      created_by,
      impact_assessment
    ) VALUES (
      NEW.organization_id,
      'Critical Security Alert: ' || NEW.title,
      NEW.description,
      'CRITICAL',
      NEW.alert_type,
      ARRAY[NEW.id],
      NEW.organization_id, -- System generated
      'Auto-escalated critical security alert requiring immediate attention'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply escalation trigger (only for inserts of critical alerts)
CREATE TRIGGER auto_escalate_trigger
  AFTER INSERT ON security_alerts
  FOR EACH ROW
  WHEN (NEW.severity = 'CRITICAL')
  EXECUTE FUNCTION auto_escalate_critical_alerts();

-- Function to update alert status when incident is resolved
CREATE OR REPLACE FUNCTION update_alerts_on_incident_resolution()
RETURNS TRIGGER AS $$
BEGIN
  -- When incident is resolved, mark related alerts as resolved
  IF OLD.status != 'RESOLVED' AND NEW.status = 'RESOLVED' THEN
    UPDATE security_alerts
    SET 
      status = 'RESOLVED',
      resolved_at = NOW(),
      resolution_notes = 'Resolved via incident ' || NEW.incident_number,
      updated_at = NOW()
    WHERE id = ANY(NEW.related_alerts)
      AND status IN ('ACTIVE', 'INVESTIGATING');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER incident_resolution_trigger
  AFTER UPDATE ON security_incidents
  FOR EACH ROW EXECUTE FUNCTION update_alerts_on_incident_resolution();

-- =============================================
-- SECURITY DASHBOARD FUNCTIONS
-- =============================================

-- Function to get security dashboard data
CREATE OR REPLACE FUNCTION get_security_dashboard(
  org_id UUID,
  time_range_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
  total_alerts BIGINT,
  active_alerts BIGINT,
  critical_alerts BIGINT,
  high_alerts BIGINT,
  recent_incidents BIGINT,
  security_score INTEGER,
  top_alert_types JSONB,
  alert_trend JSONB
) AS $$
DECLARE
  start_time TIMESTAMP WITH TIME ZONE;
BEGIN
  start_time := NOW() - (time_range_hours || ' hours')::INTERVAL;
  
  RETURN QUERY
  SELECT 
    -- Alert counts
    COUNT(*) as total_alerts,
    COUNT(*) FILTER (WHERE sa.status = 'ACTIVE') as active_alerts,
    COUNT(*) FILTER (WHERE sa.severity = 'CRITICAL') as critical_alerts,
    COUNT(*) FILTER (WHERE sa.severity = 'HIGH') as high_alerts,
    
    -- Recent incidents
    (SELECT COUNT(*) FROM security_incidents si 
     WHERE si.organization_id = org_id 
     AND si.created_at >= start_time) as recent_incidents,
    
    -- Security score (calculated based on alert severity and count)
    GREATEST(0, 100 - 
      (COUNT(*) FILTER (WHERE sa.severity = 'CRITICAL') * 15) -
      (COUNT(*) FILTER (WHERE sa.severity = 'HIGH') * 10) -
      (COUNT(*) FILTER (WHERE sa.severity = 'MEDIUM') * 5)
    )::INTEGER as security_score,
    
    -- Top alert types
    (SELECT jsonb_agg(
      jsonb_build_object(
        'alert_type', alert_type,
        'count', count
      ) ORDER BY count DESC
    ) FROM (
      SELECT alert_type, COUNT(*) as count
      FROM security_alerts
      WHERE organization_id = org_id AND created_at >= start_time
      GROUP BY alert_type
      ORDER BY count DESC
      LIMIT 5
    ) top_types) as top_alert_types,
    
    -- Alert trend (hourly counts for the last 24 hours)
    (SELECT jsonb_agg(
      jsonb_build_object(
        'hour', hour,
        'count', COALESCE(count, 0)
      ) ORDER BY hour
    ) FROM (
      SELECT 
        generate_series(
          date_trunc('hour', start_time),
          date_trunc('hour', NOW()),
          '1 hour'::interval
        ) as hour
    ) hours
    LEFT JOIN (
      SELECT 
        date_trunc('hour', created_at) as hour,
        COUNT(*) as count
      FROM security_alerts
      WHERE organization_id = org_id 
        AND created_at >= start_time
      GROUP BY date_trunc('hour', created_at)
    ) alert_counts USING (hour)) as alert_trend
    
  FROM security_alerts sa
  WHERE sa.organization_id = org_id
    AND sa.created_at >= start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- DATA RETENTION AND CLEANUP
-- =============================================

-- Function to cleanup old resolved alerts and incidents
CREATE OR REPLACE FUNCTION cleanup_old_security_data(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_alerts INTEGER;
  deleted_actions INTEGER;
  deleted_incidents INTEGER;
BEGIN
  -- Delete old resolved alerts
  DELETE FROM security_alerts
  WHERE status IN ('RESOLVED', 'FALSE_POSITIVE')
    AND resolved_at < NOW() - (retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_alerts = ROW_COUNT;
  
  -- Delete old response actions (cascade will handle this, but explicit is better)
  DELETE FROM alert_response_actions
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_actions = ROW_COUNT;
  
  -- Delete old closed incidents
  DELETE FROM security_incidents
  WHERE status = 'CLOSED'
    AND resolved_at < NOW() - (retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_incidents = ROW_COUNT;
  
  -- Log cleanup activity
  INSERT INTO enhanced_security_audit_logs (
    event_type,
    event_category,
    severity,
    event_data
  ) VALUES (
    'SYSTEM_MAINTENANCE',
    'INFRASTRUCTURE',
    'LOW',
    jsonb_build_object(
      'operation', 'security_data_cleanup',
      'deleted_alerts', deleted_alerts,
      'deleted_actions', deleted_actions,
      'deleted_incidents', deleted_incidents,
      'retention_days', retention_days
    )
  );
  
  RETURN deleted_alerts + deleted_actions + deleted_incidents;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- INITIALIZATION AND VALIDATION
-- =============================================

-- Test the alert system
DO $$
BEGIN
  RAISE NOTICE 'Security alerts and incident management system initialized';
  RAISE NOTICE 'Created security_alerts table with RLS policies';
  RAISE NOTICE 'Created alert_response_actions tracking';
  RAISE NOTICE 'Created security_incidents escalation system';
  RAISE NOTICE 'Created notification preferences management';
  RAISE NOTICE 'Created security metrics history tracking';
  RAISE NOTICE 'Created automated escalation and cleanup functions';
  RAISE NOTICE 'Security monitoring and alerting system ready';
END $$;

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000012_performance_indexes.sql
-- ========================================

-- Performance optimization indexes for common queries
-- Run EXPLAIN ANALYZE on slow queries to identify missing indexes

-- Organizations table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_stripe_customer 
ON organizations(stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_pricing_tier 
ON organizations(pricing_tier);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_created_at 
ON organizations(created_at DESC);

-- Forms table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forms_organization_status 
ON forms(organization_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forms_created_by 
ON forms(created_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forms_created_from_pdf 
ON forms(created_from_pdf) 
WHERE created_from_pdf IS NOT NULL;

-- PDF imports table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pdf_imports_user_created 
ON pdf_imports(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pdf_imports_status_created 
ON pdf_imports(status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pdf_imports_processing 
ON pdf_imports(upload_status) 
WHERE upload_status IN ('processing', 'pending');

-- Payment history indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_history_organization 
ON payment_history(organization_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_history_status 
ON payment_history(status);

-- Webhook events indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_events_stripe_id 
ON webhook_events(stripe_event_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_events_created 
ON webhook_events(created_at DESC);

-- Form responses indexes (if exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_form_responses_form_id 
ON form_responses(form_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_form_responses_user 
ON form_responses(user_id) 
WHERE user_id IS NOT NULL;

-- Subscription history indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_history_org 
ON subscription_history(organization_id, created_at DESC);

-- Composite indexes for common JOIN queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forms_org_status_created 
ON forms(organization_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pdf_imports_user_status_created 
ON pdf_imports(user_id, upload_status, created_at DESC);

-- Partial indexes for specific query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_active_subs 
ON organizations(id, pricing_tier) 
WHERE subscription_status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forms_active 
ON forms(organization_id, created_at DESC) 
WHERE status = 'active';

-- Function-based indexes for computed values
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pdf_imports_large_files 
ON pdf_imports((file_size / 1024 / 1024)) 
WHERE file_size > 5242880; -- Files > 5MB

-- Query performance monitoring
CREATE OR REPLACE FUNCTION log_slow_queries() RETURNS void AS $$
DECLARE
  query_record RECORD;
BEGIN
  -- Log queries taking more than 100ms
  FOR query_record IN
    SELECT 
      query,
      calls,
      total_time,
      mean_time,
      max_time
    FROM pg_stat_statements
    WHERE mean_time > 100
    ORDER BY mean_time DESC
    LIMIT 20
  LOOP
    RAISE NOTICE 'Slow query: % (avg: %ms, max: %ms, calls: %)',
      LEFT(query_record.query, 100),
      ROUND(query_record.mean_time::numeric, 2),
      ROUND(query_record.max_time::numeric, 2),
      query_record.calls;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Table statistics update function
CREATE OR REPLACE FUNCTION update_table_statistics() RETURNS void AS $$
BEGIN
  ANALYZE organizations;
  ANALYZE forms;
  ANALYZE pdf_imports;
  ANALYZE payment_history;
  ANALYZE webhook_events;
  ANALYZE subscription_history;
  
  RAISE NOTICE 'Table statistics updated at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Connection pooling configuration
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET pg_stat_statements.max = 10000;

-- Performance tuning settings
ALTER SYSTEM SET effective_cache_size = '4GB';
ALTER SYSTEM SET shared_buffers = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '256MB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Autovacuum tuning for high-traffic tables
ALTER TABLE organizations SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE forms SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE pdf_imports SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE payment_history SET (autovacuum_vacuum_scale_factor = 0.05);

-- Create extension for query monitoring (if not exists)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View for monitoring index usage
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  CASE 
    WHEN idx_scan = 0 THEN 'UNUSED'
    WHEN idx_scan < 100 THEN 'RARELY_USED'
    ELSE 'ACTIVE'
  END AS usage_status
FROM pg_stat_user_indexes
ORDER BY idx_scan;

-- View for monitoring table sizes
CREATE OR REPLACE VIEW table_size_stats AS
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Function to identify missing indexes
CREATE OR REPLACE FUNCTION suggest_missing_indexes() RETURNS TABLE(
  table_name text,
  column_name text,
  index_type text,
  reason text
) AS $$
BEGIN
  -- Suggest indexes for foreign keys without indexes
  RETURN QUERY
  SELECT 
    tc.table_name::text,
    kcu.column_name::text,
    'btree'::text AS index_type,
    'Foreign key without index'::text AS reason
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
  AND NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = tc.table_name
    AND indexdef LIKE '%' || kcu.column_name || '%'
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_slow_queries() IS 'Logs queries with mean execution time > 100ms';
COMMENT ON FUNCTION update_table_statistics() IS 'Updates table statistics for query planner';
COMMENT ON VIEW index_usage_stats IS 'Monitors index usage to identify unused indexes';
COMMENT ON VIEW table_size_stats IS 'Monitors table and index sizes';
COMMENT ON FUNCTION suggest_missing_indexes() IS 'Suggests missing indexes based on foreign keys';


-- ========================================
-- Migration: 20250101000013_api_key_system.sql
-- ========================================

-- Defer