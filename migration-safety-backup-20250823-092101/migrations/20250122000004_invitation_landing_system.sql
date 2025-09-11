-- Migration: 20250122000004_invitation_landing_system.sql
-- Feature: WS-074 - Invitation Landing - Couple Onboarding Interface
-- Description: Invitation landing page system with supplier branding and conversion tracking

-- Invitation Codes table - Core invitation system
CREATE TABLE IF NOT EXISTS invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  supplier_type VARCHAR(50) NOT NULL, -- photographer, planner, venue, etc
  
  -- Branding and customization
  supplier_name VARCHAR(255) NOT NULL,
  supplier_logo_url TEXT,
  supplier_brand_color VARCHAR(7) DEFAULT '#000000', -- hex color
  
  -- Personalization 
  couple_names VARCHAR(255), -- "John & Jane" or null for generic
  wedding_date DATE,
  personalized_message TEXT,
  
  -- Configuration
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER, -- null for unlimited
  current_uses INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invitation Visits table - Track every click/visit
CREATE TABLE IF NOT EXISTS invitation_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_code_id UUID NOT NULL REFERENCES invitation_codes(id),
  
  -- Visit tracking
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  
  -- Geographic data
  country VARCHAR(2),
  region VARCHAR(100),
  city VARCHAR(100),
  
  -- Device info
  device_type VARCHAR(20), -- mobile, desktop, tablet
  browser VARCHAR(50),
  os VARCHAR(50),
  
  -- Session info
  session_id VARCHAR(255),
  visit_duration INTEGER, -- seconds spent on page
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invitation Conversions table - Track successful signups
CREATE TABLE IF NOT EXISTS invitation_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_code_id UUID NOT NULL REFERENCES invitation_codes(id),
  visit_id UUID REFERENCES invitation_visits(id),
  
  -- User information
  converted_user_id UUID, -- will be set after user created
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  
  -- OAuth provider used
  oauth_provider VARCHAR(20), -- google, apple, email
  
  -- Conversion tracking
  time_to_convert INTEGER, -- seconds from visit to conversion
  funnel_step VARCHAR(50) DEFAULT 'signup_completed',
  
  -- Marketing attribution
  attributed_utm_source VARCHAR(100),
  attributed_utm_medium VARCHAR(100),
  attributed_utm_campaign VARCHAR(100),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supplier Invitation Settings table - Per-supplier customization
CREATE TABLE IF NOT EXISTS supplier_invitation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) UNIQUE,
  
  -- Default branding
  default_brand_color VARCHAR(7) DEFAULT '#000000',
  default_logo_url TEXT,
  
  -- Messaging templates
  welcome_message_template TEXT DEFAULT 'Welcome! Your wedding planner has set up your dashboard.',
  value_proposition TEXT DEFAULT 'Never fill the same form twice. Everything in one place.',
  call_to_action TEXT DEFAULT 'Start Planning Your Wedding',
  
  -- Features to highlight
  featured_benefits JSONB DEFAULT '[]', -- ["Guest Management", "Timeline Builder", etc.]
  
  -- Conversion tracking settings  
  google_analytics_id VARCHAR(50),
  facebook_pixel_id VARCHAR(50),
  conversion_webhook_url TEXT,
  
  -- A/B testing
  enable_ab_testing BOOLEAN DEFAULT FALSE,
  variant_weights JSONB DEFAULT '{"A": 50, "B": 50}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_supplier ON invitation_codes(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_active ON invitation_codes(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_invitation_visits_code ON invitation_visits(invitation_code_id);
CREATE INDEX IF NOT EXISTS idx_invitation_visits_created ON invitation_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_invitation_visits_session ON invitation_visits(session_id);

CREATE INDEX IF NOT EXISTS idx_invitation_conversions_code ON invitation_conversions(invitation_code_id);
CREATE INDEX IF NOT EXISTS idx_invitation_conversions_email ON invitation_conversions(email);
CREATE INDEX IF NOT EXISTS idx_invitation_conversions_created ON invitation_conversions(created_at);

-- Row Level Security (RLS) policies

-- Invitation Codes - suppliers can only see their own
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers can manage their invitation codes" 
ON invitation_codes FOR ALL
USING (
  auth.uid() IN (
    SELECT user_id FROM suppliers WHERE id = invitation_codes.supplier_id
  )
);

-- Public read access for active invitation codes (needed for landing page)
CREATE POLICY "Public can view active invitation codes"
ON invitation_codes FOR SELECT
USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

-- Invitation Visits - suppliers can see visits to their codes
ALTER TABLE invitation_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers can view visits to their codes"
ON invitation_visits FOR SELECT
USING (
  invitation_code_id IN (
    SELECT id FROM invitation_codes 
    WHERE supplier_id IN (
      SELECT id FROM suppliers WHERE user_id = auth.uid()
    )
  )
);

-- Public insert for tracking visits
CREATE POLICY "Anyone can record visits"
ON invitation_visits FOR INSERT
WITH CHECK (TRUE);

-- Invitation Conversions - suppliers can see conversions from their codes
ALTER TABLE invitation_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers can view their conversions"
ON invitation_conversions FOR SELECT
USING (
  invitation_code_id IN (
    SELECT id FROM invitation_codes 
    WHERE supplier_id IN (
      SELECT id FROM suppliers WHERE user_id = auth.uid()
    )
  )
);

-- Public insert for tracking conversions
CREATE POLICY "Anyone can record conversions"
ON invitation_conversions FOR INSERT
WITH CHECK (TRUE);

-- Supplier Settings - suppliers can manage their own settings
ALTER TABLE supplier_invitation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers can manage their invitation settings"
ON supplier_invitation_settings FOR ALL
USING (
  supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = auth.uid()
  )
);

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_invitation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invitation_codes_updated_at
  BEFORE UPDATE ON invitation_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_invitation_updated_at();

CREATE TRIGGER supplier_invitation_settings_updated_at  
  BEFORE UPDATE ON supplier_invitation_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_invitation_updated_at();

-- Create analytics view for easy reporting
CREATE OR REPLACE VIEW invitation_analytics AS
SELECT 
  ic.id as invitation_code_id,
  ic.code,
  ic.supplier_id,
  ic.supplier_name,
  ic.supplier_type,
  ic.couple_names,
  ic.wedding_date,
  ic.created_at as code_created_at,
  
  -- Visit metrics
  COUNT(DISTINCT iv.id) as total_visits,
  COUNT(DISTINCT iv.session_id) as unique_sessions,
  COUNT(DISTINCT CASE WHEN iv.device_type = 'mobile' THEN iv.id END) as mobile_visits,
  COUNT(DISTINCT CASE WHEN iv.device_type = 'desktop' THEN iv.id END) as desktop_visits,
  
  -- Conversion metrics
  COUNT(DISTINCT ico.id) as total_conversions,
  ROUND(
    CASE 
      WHEN COUNT(DISTINCT iv.id) > 0 
      THEN COUNT(DISTINCT ico.id)::decimal / COUNT(DISTINCT iv.id) * 100 
      ELSE 0 
    END, 2
  ) as conversion_rate,
  
  -- Recent activity
  MAX(iv.created_at) as last_visit,
  MAX(ico.created_at) as last_conversion

FROM invitation_codes ic
LEFT JOIN invitation_visits iv ON ic.id = iv.invitation_code_id
LEFT JOIN invitation_conversions ico ON ic.id = ico.invitation_code_id
GROUP BY ic.id, ic.code, ic.supplier_id, ic.supplier_name, ic.supplier_type, 
         ic.couple_names, ic.wedding_date, ic.created_at;

-- Sample data for testing (optional - only in development)
-- This will be removed in production deployments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM suppliers LIMIT 1) THEN
    -- Insert sample invitation code if suppliers exist
    INSERT INTO invitation_codes (
      code, supplier_id, supplier_type, supplier_name, 
      couple_names, wedding_date, personalized_message
    ) 
    SELECT 
      'DEMO' || EXTRACT(EPOCH FROM NOW())::integer,
      id,
      'photographer',
      'Demo Photography Studio',
      'John & Jane',
      CURRENT_DATE + INTERVAL '6 months',
      'Welcome to your wedding dashboard! Everything you need in one place.'
    FROM suppliers 
    LIMIT 1
    ON CONFLICT (code) DO NOTHING;
  END IF;
END $$;