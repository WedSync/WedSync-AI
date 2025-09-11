-- WS-221: Branding Customization - Database Schema
-- Team C - Brand theme synchronization and asset management system

-- Enable RLS for all tables
SET row_security = on;

-- Create brand_themes table
CREATE TABLE IF NOT EXISTS brand_themes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  primary_color VARCHAR(7) NOT NULL,
  secondary_color VARCHAR(7) NOT NULL,
  accent_color VARCHAR(7) NOT NULL,
  background_color VARCHAR(7) NOT NULL,
  text_color VARCHAR(7) NOT NULL,
  logo_url TEXT,
  favicon_url TEXT,
  font_family VARCHAR(100) NOT NULL DEFAULT 'Inter, sans-serif',
  border_radius INTEGER NOT NULL DEFAULT 8,
  custom_css TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create brand_assets table
CREATE TABLE IF NOT EXISTS brand_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('logo', 'favicon', 'background', 'icon', 'custom')),
  name VARCHAR(255) NOT NULL,
  original_url TEXT NOT NULL,
  optimized_url TEXT,
  thumbnail_url TEXT,
  size BIGINT NOT NULL,
  dimensions JSONB,
  format VARCHAR(50) NOT NULL,
  is_optimized BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create brand_health_checks table
CREATE TABLE IF NOT EXISTS brand_health_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  overall_health VARCHAR(20) NOT NULL CHECK (overall_health IN ('healthy', 'warning', 'critical')),
  last_checked TIMESTAMPTZ NOT NULL,
  metrics JSONB NOT NULL,
  issues_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create brand_health_issues table
CREATE TABLE IF NOT EXISTS brand_health_issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  issue_id VARCHAR(100) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('asset_unavailable', 'slow_loading', 'invalid_format', 'security_concern', 'accessibility_violation')),
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  affected_assets JSONB NOT NULL DEFAULT '[]'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create system_alerts table (if not exists)
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_brand_themes_organization_id ON brand_themes(organization_id);
CREATE INDEX IF NOT EXISTS idx_brand_themes_is_active ON brand_themes(is_active);
CREATE INDEX IF NOT EXISTS idx_brand_assets_organization_id ON brand_assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_brand_assets_type ON brand_assets(type);
CREATE INDEX IF NOT EXISTS idx_brand_health_checks_organization_id ON brand_health_checks(organization_id);
CREATE INDEX IF NOT EXISTS idx_brand_health_checks_created_at ON brand_health_checks(created_at);
CREATE INDEX IF NOT EXISTS idx_brand_health_issues_organization_id ON brand_health_issues(organization_id);
CREATE INDEX IF NOT EXISTS idx_brand_health_issues_resolved ON brand_health_issues(resolved);
CREATE INDEX IF NOT EXISTS idx_system_alerts_organization_id ON system_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_system_alerts_acknowledged ON system_alerts(acknowledged);

-- Create unique constraint to ensure only one active theme per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_themes_unique_active 
ON brand_themes(organization_id) 
WHERE is_active = true;

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_brand_themes_updated_at 
BEFORE UPDATE ON brand_themes 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_brand_assets_updated_at 
BEFORE UPDATE ON brand_assets 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- brand_themes policies
ALTER TABLE brand_themes ENABLE ROW LEVEL SECURITY;

-- Users can only access themes for organizations they belong to
CREATE OR REPLACE POLICY "Users can view brand themes for their organizations" 
ON brand_themes FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE OR REPLACE POLICY "Users can insert brand themes for their organizations" 
ON brand_themes FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE OR REPLACE POLICY "Users can update brand themes for their organizations" 
ON brand_themes FOR UPDATE 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE OR REPLACE POLICY "Users can delete brand themes for their organizations" 
ON brand_themes FOR DELETE 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- brand_assets policies
ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE POLICY "Users can view brand assets for their organizations" 
ON brand_assets FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE OR REPLACE POLICY "Users can insert brand assets for their organizations" 
ON brand_assets FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE OR REPLACE POLICY "Users can update brand assets for their organizations" 
ON brand_assets FOR UPDATE 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE OR REPLACE POLICY "Users can delete brand assets for their organizations" 
ON brand_assets FOR DELETE 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- brand_health_checks policies (read-only for users)
ALTER TABLE brand_health_checks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE POLICY "Users can view brand health checks for their organizations" 
ON brand_health_checks FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- System can insert health checks (service role)
CREATE OR REPLACE POLICY "Service role can insert brand health checks" 
ON brand_health_checks FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- brand_health_issues policies
ALTER TABLE brand_health_issues ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE POLICY "Users can view brand health issues for their organizations" 
ON brand_health_issues FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Users can update issues (to mark as resolved)
CREATE OR REPLACE POLICY "Users can update brand health issues for their organizations" 
ON brand_health_issues FOR UPDATE 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- System can insert health issues (service role)
CREATE OR REPLACE POLICY "Service role can insert brand health issues" 
ON brand_health_issues FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- system_alerts policies
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE POLICY "Users can view system alerts for their organizations" 
ON system_alerts FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE OR REPLACE POLICY "Users can update system alerts for their organizations" 
ON system_alerts FOR UPDATE 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- System can insert alerts (service role)
CREATE OR REPLACE POLICY "Service role can insert system alerts" 
ON system_alerts FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- Create storage bucket for brand assets (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for brand assets bucket
CREATE OR REPLACE POLICY "Users can view brand assets" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'brand-assets');

CREATE OR REPLACE POLICY "Users can upload brand assets for their organization" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'brand-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE OR REPLACE POLICY "Users can update brand assets for their organization" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'brand-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE OR REPLACE POLICY "Users can delete brand assets for their organization" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'brand-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT ALL ON brand_themes TO authenticated;
GRANT ALL ON brand_assets TO authenticated;
GRANT SELECT ON brand_health_checks TO authenticated;
GRANT SELECT, UPDATE ON brand_health_issues TO authenticated;
GRANT SELECT, UPDATE ON system_alerts TO authenticated;

-- Add helpful comments
COMMENT ON TABLE brand_themes IS 'Stores brand theme configurations for organizations';
COMMENT ON TABLE brand_assets IS 'Stores brand assets (logos, icons, etc.) with optimization metadata';
COMMENT ON TABLE brand_health_checks IS 'Stores periodic health check results for brand assets';
COMMENT ON TABLE brand_health_issues IS 'Stores specific health issues detected during monitoring';
COMMENT ON TABLE system_alerts IS 'Stores system-wide alerts including brand health alerts';

-- Insert default brand theme colors for new organizations (via trigger)
CREATE OR REPLACE FUNCTION create_default_brand_theme()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO brand_themes (
    organization_id,
    name,
    primary_color,
    secondary_color,
    accent_color,
    background_color,
    text_color,
    font_family,
    border_radius,
    is_active
  ) VALUES (
    NEW.id,
    'Default Theme',
    '#3B82F6',
    '#64748B',
    '#F59E0B',
    '#FFFFFF',
    '#1F2937',
    'Inter, sans-serif',
    8,
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to organizations table (if it exists)
CREATE OR REPLACE TRIGGER create_default_brand_theme_trigger
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_default_brand_theme();

COMMIT;