-- Migration: Guest Management Enhancements (WS-151, WS-152, WS-153)
-- Date: 2025-08-25
-- Features: Enhanced dietary management, photo groups, and improved import capabilities

-- WS-152: Enhanced Dietary Requirements Management
-- Add severity levels and detailed tracking for dietary restrictions
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS dietary_severity VARCHAR(20) CHECK (dietary_severity IN ('mild', 'moderate', 'severe', 'life_threatening')),
ADD COLUMN IF NOT EXISTS dietary_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS dietary_evidence_url TEXT,
ADD COLUMN IF NOT EXISTS allergy_list TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS allergy_details JSONB DEFAULT '{}';

-- Create dietary requirements table for detailed tracking
CREATE TABLE IF NOT EXISTS dietary_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  requirement_type VARCHAR(50) NOT NULL CHECK (requirement_type IN (
    'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'nut_free', 
    'shellfish_free', 'kosher', 'halal', 'diabetic', 'low_sodium', 'other'
  )),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe', 'life_threatening')),
  notes TEXT,
  medical_documentation_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WS-153: Photo Groups Management
-- Create photo groups table
CREATE TABLE IF NOT EXISTS photo_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  photo_type VARCHAR(50) CHECK (photo_type IN ('family', 'friends', 'bridal_party', 'groomsmen', 'bridesmaids', 'children', 'special', 'formal', 'candid')),
  priority INTEGER DEFAULT 0,
  estimated_time_minutes INTEGER DEFAULT 5,
  location VARCHAR(200),
  timeline_slot VARCHAR(100),
  photographer_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Photo group assignments (many-to-many relationship)
CREATE TABLE IF NOT EXISTS photo_group_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_group_id UUID NOT NULL REFERENCES photo_groups(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  position_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(photo_group_id, guest_id)
);

-- WS-151: Enhanced Import Capabilities
-- Add import mapping templates
CREATE TABLE IF NOT EXISTS import_mapping_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  mapping_config JSONB NOT NULL,
  source_type VARCHAR(30) CHECK (source_type IN ('csv', 'excel', 'google_contacts')),
  is_default BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Import performance tracking for 500+ guests
ALTER TABLE guest_import_sessions
ADD COLUMN IF NOT EXISTS batch_processing BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS batch_size INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS processing_speed_per_second DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS memory_usage_mb DECIMAL(10,2);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dietary_requirements_guest_id ON dietary_requirements(guest_id);
CREATE INDEX IF NOT EXISTS idx_dietary_requirements_type ON dietary_requirements(requirement_type);
CREATE INDEX IF NOT EXISTS idx_dietary_requirements_severity ON dietary_requirements(severity);

CREATE INDEX IF NOT EXISTS idx_photo_groups_couple_id ON photo_groups(couple_id);
CREATE INDEX IF NOT EXISTS idx_photo_groups_priority ON photo_groups(priority);
CREATE INDEX IF NOT EXISTS idx_photo_groups_timeline_slot ON photo_groups(timeline_slot);

CREATE INDEX IF NOT EXISTS idx_photo_group_assignments_group_id ON photo_group_assignments(photo_group_id);
CREATE INDEX IF NOT EXISTS idx_photo_group_assignments_guest_id ON photo_group_assignments(guest_id);

CREATE INDEX IF NOT EXISTS idx_import_templates_org_id ON import_mapping_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_import_templates_default ON import_mapping_templates(is_default) WHERE is_default = TRUE;

-- Enable RLS
ALTER TABLE dietary_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_group_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_mapping_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dietary requirements
CREATE POLICY "Users can view dietary requirements for their guests"
  ON dietary_requirements FOR SELECT
  USING (
    guest_id IN (
      SELECT g.id FROM guests g
      JOIN clients c ON g.couple_id = c.id
      JOIN user_profiles up ON c.organization_id = up.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage dietary requirements for their guests"
  ON dietary_requirements FOR ALL
  USING (
    guest_id IN (
      SELECT g.id FROM guests g
      JOIN clients c ON g.couple_id = c.id
      JOIN user_profiles up ON c.organization_id = up.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

-- RLS Policies for photo groups
CREATE POLICY "Users can view photo groups for their couples"
  ON photo_groups FOR SELECT
  USING (
    couple_id IN (
      SELECT c.id FROM clients c
      JOIN user_profiles up ON c.organization_id = up.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage photo groups for their couples"
  ON photo_groups FOR ALL
  USING (
    couple_id IN (
      SELECT c.id FROM clients c
      JOIN user_profiles up ON c.organization_id = up.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

-- RLS Policies for photo group assignments
CREATE POLICY "Users can view photo group assignments"
  ON photo_group_assignments FOR SELECT
  USING (
    photo_group_id IN (
      SELECT pg.id FROM photo_groups pg
      JOIN clients c ON pg.couple_id = c.id
      JOIN user_profiles up ON c.organization_id = up.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage photo group assignments"
  ON photo_group_assignments FOR ALL
  USING (
    photo_group_id IN (
      SELECT pg.id FROM photo_groups pg
      JOIN clients c ON pg.couple_id = c.id
      JOIN user_profiles up ON c.organization_id = up.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

-- RLS Policies for import templates
CREATE POLICY "Users can view import templates for their organization"
  ON import_mapping_templates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage import templates for their organization"
  ON import_mapping_templates FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Functions for real-time updates
CREATE OR REPLACE FUNCTION notify_guest_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'guest_updates',
    json_build_object(
      'action', TG_OP,
      'couple_id', NEW.couple_id,
      'guest_id', NEW.id,
      'timestamp', NOW()
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_guest_update
AFTER INSERT OR UPDATE OR DELETE ON guests
FOR EACH ROW EXECUTE FUNCTION notify_guest_update();

CREATE TRIGGER trigger_notify_dietary_update
AFTER INSERT OR UPDATE OR DELETE ON dietary_requirements
FOR EACH ROW EXECUTE FUNCTION notify_guest_update();

CREATE TRIGGER trigger_notify_photo_group_update
AFTER INSERT OR UPDATE OR DELETE ON photo_groups
FOR EACH ROW EXECUTE FUNCTION notify_guest_update();

-- Update triggers for updated_at
CREATE TRIGGER update_dietary_requirements_updated_at 
BEFORE UPDATE ON dietary_requirements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photo_groups_updated_at 
BEFORE UPDATE ON photo_groups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_import_templates_updated_at 
BEFORE UPDATE ON import_mapping_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for migration tracking
COMMENT ON TABLE dietary_requirements IS 'Enhanced dietary tracking with severity levels - WS-152';
COMMENT ON TABLE photo_groups IS 'Photo group management for wedding photography - WS-153';
COMMENT ON TABLE photo_group_assignments IS 'Guest assignments to photo groups - WS-153';
COMMENT ON TABLE import_mapping_templates IS 'Reusable import mapping templates - WS-151';