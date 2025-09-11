-- Migration: Guest Management System (WS-056)
-- Date: 2025-08-22
-- Features: Guest list builder with households, import tracking, and bulk operations

-- Households table
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  primary_contact_id UUID,
  address JSONB NOT NULL DEFAULT '{}',
  invitation_sent BOOLEAN DEFAULT FALSE,
  invitation_sent_date TIMESTAMP WITH TIME ZONE,
  total_members INTEGER DEFAULT 1,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  infants INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guests table
CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address JSONB DEFAULT '{}',
  category VARCHAR(20) NOT NULL DEFAULT 'family' CHECK (category IN ('family', 'friends', 'work', 'other')),
  side VARCHAR(20) NOT NULL DEFAULT 'mutual' CHECK (side IN ('partner1', 'partner2', 'mutual')),
  plus_one BOOLEAN DEFAULT FALSE,
  plus_one_name VARCHAR(100),
  age_group VARCHAR(20) DEFAULT 'adult' CHECK (age_group IN ('adult', 'child', 'infant')),
  table_number INTEGER,
  helper_role VARCHAR(50),
  dietary_restrictions TEXT,
  special_needs TEXT,
  rsvp_status VARCHAR(20) DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'attending', 'declined', 'maybe')),
  rsvp_date TIMESTAMP WITH TIME ZONE,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guest Import Sessions table
CREATE TABLE IF NOT EXISTS guest_import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  import_type VARCHAR(30) NOT NULL CHECK (import_type IN ('csv', 'google_contacts', 'manual', 'excel')),
  file_name VARCHAR(255),
  original_file_name VARCHAR(255),
  file_size INTEGER,
  total_rows INTEGER,
  processed_rows INTEGER DEFAULT 0,
  successful_imports INTEGER DEFAULT 0,
  failed_imports INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'cancelled')),
  error_log JSONB DEFAULT '[]',
  mapping_config JSONB DEFAULT '{}',
  performance_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Guest Import History (for rollback functionality)
CREATE TABLE IF NOT EXISTS guest_import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_session_id UUID NOT NULL REFERENCES guest_import_sessions(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'skipped', 'error')),
  original_data JSONB,
  processed_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for primary_contact_id after guests table is created
ALTER TABLE households
ADD CONSTRAINT fk_households_primary_contact_id 
FOREIGN KEY (primary_contact_id) REFERENCES guests(id) ON DELETE SET NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_guests_couple_id ON guests(couple_id);
CREATE INDEX IF NOT EXISTS idx_guests_household_id ON guests(household_id);
CREATE INDEX IF NOT EXISTS idx_guests_category ON guests(category);
CREATE INDEX IF NOT EXISTS idx_guests_rsvp_status ON guests(rsvp_status);
CREATE INDEX IF NOT EXISTS idx_guests_age_group ON guests(age_group);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guests_tags ON guests USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_guests_full_name ON guests(first_name, last_name);

CREATE INDEX IF NOT EXISTS idx_households_couple_id ON households(couple_id);
CREATE INDEX IF NOT EXISTS idx_households_primary_contact_id ON households(primary_contact_id);

CREATE INDEX IF NOT EXISTS idx_import_sessions_couple_id ON guest_import_sessions(couple_id);
CREATE INDEX IF NOT EXISTS idx_import_sessions_status ON guest_import_sessions(status);
CREATE INDEX IF NOT EXISTS idx_import_sessions_created_at ON guest_import_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_import_history_session_id ON guest_import_history(import_session_id);
CREATE INDEX IF NOT EXISTS idx_import_history_guest_id ON guest_import_history(guest_id);

-- Full-text search index for guests
CREATE INDEX IF NOT EXISTS idx_guests_fulltext 
ON guests USING GIN (to_tsvector('english', first_name || ' ' || last_name || ' ' || COALESCE(email, '') || ' ' || COALESCE(notes, '')));

-- RLS policies for security
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_import_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_import_history ENABLE ROW LEVEL SECURITY;

-- Function for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comment for migration tracking
COMMENT ON TABLE guests IS 'Guest list management for wedding couples - WS-056';
COMMENT ON TABLE households IS 'Household groupings for guest management - WS-056';
COMMENT ON TABLE guest_import_sessions IS 'Import session tracking with rollback capability - WS-056';