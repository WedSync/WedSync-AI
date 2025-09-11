-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations Table
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
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
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
  USING (id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()));

-- Basic RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" 
  ON user_profiles FOR ALL 
  USING (user_id = auth.uid());

CREATE POLICY "Users can view profiles in their organization" 
  ON user_profiles FOR SELECT 
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()));

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