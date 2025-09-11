# Database Schema Documentation

## Core Design Principles
- **Multi-tenancy**: Row Level Security (RLS) for data isolation
- **Audit Trail**: All changes tracked with timestamps and user IDs
- **Soft Deletes**: Data archived rather than deleted
- **UUID Keys**: For security and distributed systems
- **JSONB Flexibility**: For variable/extensible data

## Primary Tables

### Users & Authentication

```sql
-- Users table (managed by Supabase Auth)
auth.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Extended user profiles
public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('supplier', 'couple', 'admin')),
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- Suppliers (wedding vendors)
public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  business_name TEXT NOT NULL,
  vendor_type TEXT NOT NULL, -- 'photographer', 'caterer', 'dj', etc.
  subscription_tier TEXT DEFAULT 'free', -- 'free', 'starter', 'professional', 'scale', 'enterprise'
  subscription_status TEXT DEFAULT 'active',
  phone TEXT,
  website TEXT,
  address JSONB,
  settings JSONB DEFAULT '{}',
  stripe_customer_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- Couples (wedding clients)
public.couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner1_user_id UUID REFERENCES auth.users(id),
  partner2_user_id UUID REFERENCES auth.users(id),
  partner1_name TEXT NOT NULL,
  partner2_name TEXT,
  wedding_date DATE,
  wedding_venue TEXT,
  guest_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
Core Fields System
sql-- Core fields that auto-populate across forms
public.core_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL, -- 'wedding_date', 'venue_name', 'guest_count', etc.
  field_value JSONB,
  field_type TEXT, -- 'date', 'text', 'number', 'address', etc.
  status TEXT DEFAULT 'pending', -- 'pending', 'partial', 'complete', 'not_applicable'
  last_updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(couple_id, field_key)
)

-- Index for fast lookups
CREATE INDEX idx_core_fields_couple ON core_fields(couple_id);
CREATE INDEX idx_core_fields_key ON core_fields(field_key);
Forms System
sql-- Form templates created by suppliers
public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  form_type TEXT, -- 'questionnaire', 'contract', 'checklist', etc.
  sections JSONB NOT NULL, -- Array of sections with fields
  settings JSONB DEFAULT '{}', -- Display settings, logic rules
  is_active BOOLEAN DEFAULT TRUE,
  is_template BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- Form sections structure in JSONB:
-- {
--   "sections": [
--     {
--       "id": "uuid",
--       "title": "Basic Information",
--       "order": 1,
--       "fields": [
--         {
--           "id": "uuid",
--           "type": "text|email|phone|date|select|checkbox|radio|file",
--           "label": "Field Label",
--           "placeholder": "Optional placeholder",
--           "required": true,
--           "core_field_key": "wedding_date", -- Links to core_fields
--           "validation": {}, -- Zod schema
--           "conditional_logic": {}, -- Show/hide rules
--           "options": [] -- For select/radio/checkbox
--         }
--       ]
--     }
--   ]
-- }

-- Form responses from clients
public.form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  response_data JSONB NOT NULL, -- Field values
  status TEXT DEFAULT 'draft', -- 'draft', 'submitted', 'reviewed'
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
Client Management
sql-- Supplier's clients (imported or added)
public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id), -- Linked if they join WedMe
  couple_names TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  wedding_date DATE,
  venue_name TEXT,
  guest_count INTEGER,
  notes TEXT,
  tags TEXT[], -- Array of tags for organization
  source TEXT, -- 'import', 'manual', 'wedme', 'api'
  status TEXT DEFAULT 'active', -- 'active', 'archived', 'completed'
  metadata JSONB DEFAULT '{}', -- Flexible additional data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- Many-to-many relationship for supplier-couple connections
public.supplier_couple_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'connected', 'declined'
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, couple_id)
)
Customer Journey System
sql-- Journey templates
public.customer_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  journey_data JSONB NOT NULL, -- Node-based journey structure
  is_active BOOLEAN DEFAULT TRUE,
  is_template BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- Journey instances for specific clients
public.journey_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID REFERENCES customer_journeys(id),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id),
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'completed'
  current_step INTEGER DEFAULT 0,
  step_data JSONB DEFAULT '{}', -- Progress tracking
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- Journey execution logs
public.journey_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES journey_instances(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  module_type TEXT, -- 'email', 'sms', 'form', 'task', etc.
  execution_data JSONB,
  status TEXT, -- 'pending', 'sent', 'completed', 'failed'
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
)
Communications
sql-- Email templates
public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  category TEXT, -- 'onboarding', 'reminder', 'thank_you', etc.
  variables JSONB DEFAULT '[]', -- Available merge tags
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- Communication logs
public.communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  client_id UUID REFERENCES clients(id),
  couple_id UUID REFERENCES couples(id),
  type TEXT NOT NULL, -- 'email', 'sms', 'whatsapp'
  template_id UUID REFERENCES email_templates(id),
  subject TEXT,
  content TEXT,
  status TEXT, -- 'sent', 'delivered', 'opened', 'clicked', 'failed'
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
)
Analytics & Activity
sql-- Client activity tracking
public.client_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id),
  activity_type TEXT NOT NULL, -- 'form_view', 'form_submit', 'email_open', etc.
  activity_data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Supplier analytics
public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Create index for time-based queries
CREATE INDEX idx_analytics_created ON analytics_events(created_at DESC);
Marketplace
sql-- Template marketplace
public.marketplace_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES suppliers(id),
  template_type TEXT NOT NULL, -- 'form', 'journey', 'email_sequence'
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  template_data JSONB NOT NULL,
  preview_images TEXT[],
  category TEXT,
  tags TEXT[],
  sales_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- Template purchases
public.marketplace_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES marketplace_templates(id),
  purchaser_id UUID REFERENCES suppliers(id),
  price_paid DECIMAL(10,2),
  stripe_payment_id TEXT,
  purchased_at TIMESTAMPTZ DEFAULT NOW()
)
Row Level Security Policies
sql-- Suppliers can only see their own data
CREATE POLICY suppliers_own_data ON suppliers
  FOR ALL USING (user_id = auth.uid());

-- Couples can only see their own data
CREATE POLICY couples_own_data ON couples
  FOR ALL USING (
    partner1_user_id = auth.uid() OR 
    partner2_user_id = auth.uid()
  );

-- Clients belong to suppliers
CREATE POLICY clients_supplier_access ON clients
  FOR ALL USING (
    supplier_id IN (
      SELECT id FROM suppliers WHERE user_id = auth.uid()
    )
  );

-- Core fields accessible by couple and connected suppliers
CREATE POLICY core_fields_access ON core_fields
  FOR SELECT USING (
    couple_id IN (
      SELECT id FROM couples 
      WHERE partner1_user_id = auth.uid() 
        OR partner2_user_id = auth.uid()
    )
    OR
    couple_id IN (
      SELECT couple_id FROM supplier_couple_connections
      WHERE supplier_id IN (
        SELECT id FROM suppliers WHERE user_id = auth.uid()
      )
      AND status = 'connected'
    )
  );
Indexes for Performance
sql-- Critical indexes for common queries
CREATE INDEX idx_suppliers_user ON suppliers(user_id);
CREATE INDEX idx_suppliers_type ON suppliers(vendor_type);
CREATE INDEX idx_clients_supplier ON clients(supplier_id);
CREATE INDEX idx_clients_wedding_date ON clients(wedding_date);
CREATE INDEX idx_forms_supplier ON forms(supplier_id);
CREATE INDEX idx_form_responses_form ON form_responses(form_id);
CREATE INDEX idx_form_responses_couple ON form_responses(couple_id);
CREATE INDEX idx_journeys_supplier ON customer_journeys(supplier_id);
CREATE INDEX idx_journey_instances_client ON journey_instances(client_id);
CREATE INDEX idx_communications_client ON communication_logs(client_id);

-- Full text search indexes
CREATE INDEX idx_clients_search ON clients USING gin(
  to_tsvector('english', couple_names || ' ' || COALESCE(email, '') || ' ' || COALESCE(venue_name, ''))
);
Migration Strategy
sql-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- Audit trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- Repeat for all tables with updated_at column
Data Integrity Rules

All monetary values stored as DECIMAL(10,2)
All timestamps stored as TIMESTAMPTZ
Phone numbers stored as TEXT with validation in application
Emails lowercase and trimmed before storage
UUIDs for all primary keys
Soft deletes via status fields rather than DELETE operations


This schema provides the complete database structure Claude Code needs to implement all features. Ready for the next document?