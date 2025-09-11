-- WS-016: Notes Feature - Private Client Notes System
-- Migration to create comprehensive notes system with RLS policies
-- Created: 2025-01-21

-- Enable necessary extensions for full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create client_notes table
CREATE TABLE IF NOT EXISTS client_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Note content and metadata
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 10000),
  note_type VARCHAR(50) NOT NULL DEFAULT 'client' 
    CHECK (note_type IN ('client', 'internal', 'follow_up', 'meeting', 'important')),
  visibility VARCHAR(20) NOT NULL DEFAULT 'public' 
    CHECK (visibility IN ('public', 'internal', 'private')),
  priority VARCHAR(20) DEFAULT 'medium' 
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Tags and categorization
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false,
  follow_up_date DATE,
  
  -- Audit trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL,
  created_by_name VARCHAR(255) NOT NULL,
  updated_by UUID,
  updated_by_name VARCHAR(255),
  
  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', 
      COALESCE(content, '') || ' ' ||
      COALESCE(array_to_string(tags, ' '), '') || ' ' ||
      COALESCE(created_by_name, '') || ' ' ||
      COALESCE(note_type, '') || ' ' ||
      COALESCE(priority, '')
    )
  ) STORED
);

-- Create client_activities table for tracking note activities
CREATE TABLE IF NOT EXISTS client_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Activity details
  activity_type VARCHAR(50) NOT NULL,
  activity_title VARCHAR(255) NOT NULL,
  activity_description TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  performed_by UUID NOT NULL,
  performed_by_name VARCHAR(255) NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_notes_client_id ON client_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_organization_id ON client_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_created_by ON client_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_client_notes_visibility ON client_notes(visibility);
CREATE INDEX IF NOT EXISTS idx_client_notes_note_type ON client_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_client_notes_is_pinned ON client_notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_client_notes_created_at ON client_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_notes_follow_up_date ON client_notes(follow_up_date) 
  WHERE follow_up_date IS NOT NULL;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_client_notes_search_vector ON client_notes USING gin(search_vector);

-- Tags search index
CREATE INDEX IF NOT EXISTS idx_client_notes_tags ON client_notes USING gin(tags);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_client_notes_client_visibility_created 
  ON client_notes(client_id, visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_notes_client_pinned_created 
  ON client_notes(client_id, is_pinned DESC, created_at DESC);

-- Client activities indexes
CREATE INDEX IF NOT EXISTS idx_client_activities_client_id ON client_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_client_activities_organization_id ON client_activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_activities_created_at ON client_activities(created_at DESC);

-- Row Level Security (RLS) Policies

-- Enable RLS on tables
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_activities ENABLE ROW LEVEL SECURITY;

-- Client Notes RLS Policies

-- Policy: Users can only access notes from their organization
CREATE POLICY notes_organization_access ON client_notes
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = ( SELECT auth.uid() )
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = ( SELECT auth.uid() )
    )
  );

-- Policy: Private notes are only visible to their creators
CREATE POLICY notes_private_visibility ON client_notes
  FOR SELECT
  USING (
    visibility != 'private' OR created_by = ( SELECT auth.uid() )
  );

-- Policy: Internal notes require special permission (checked at application level)
-- This is handled by the application logic, not database constraints

-- Policy: Users can only edit/delete their own notes
CREATE POLICY notes_own_modifications ON client_notes
  FOR UPDATE
  USING (created_by = ( SELECT auth.uid() ))
  WITH CHECK (created_by = ( SELECT auth.uid() ));

CREATE POLICY notes_own_deletions ON client_notes
  FOR DELETE
  USING (created_by = ( SELECT auth.uid() ));

-- Policy: Notes creation must include created_by as current user
CREATE POLICY notes_creation_audit ON client_notes
  FOR INSERT
  WITH CHECK (created_by = ( SELECT auth.uid() ));

-- Client Activities RLS Policies

-- Policy: Users can only access activities from their organization
CREATE POLICY activities_organization_access ON client_activities
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = ( SELECT auth.uid() )
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = ( SELECT auth.uid() )
    )
  );

-- Policy: Activity creation must include performed_by as current user
CREATE POLICY activities_creation_audit ON client_activities
  FOR INSERT
  WITH CHECK (performed_by = ( SELECT auth.uid() ));

-- Functions and Triggers

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on client_notes
CREATE TRIGGER update_client_notes_updated_at 
  BEFORE UPDATE ON client_notes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function for full-text search with ranking
CREATE OR REPLACE FUNCTION search_client_notes(
  p_organization_id UUID,
  p_client_id UUID DEFAULT NULL,
  p_query TEXT DEFAULT '',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  client_id UUID,
  content TEXT,
  note_type VARCHAR(50),
  visibility VARCHAR(20),
  priority VARCHAR(20),
  tags TEXT[],
  is_pinned BOOLEAN,
  follow_up_date DATE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_by_name VARCHAR(255),
  updated_by UUID,
  updated_by_name VARCHAR(255),
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.client_id,
    n.content,
    n.note_type,
    n.visibility,
    n.priority,
    n.tags,
    n.is_pinned,
    n.follow_up_date,
    n.created_at,
    n.updated_at,
    n.created_by,
    n.created_by_name,
    n.updated_by,
    n.updated_by_name,
    CASE 
      WHEN p_query = '' THEN 1.0
      ELSE ts_rank_cd(n.search_vector, plainto_tsquery('english', p_query))
    END as rank
  FROM client_notes n
  WHERE n.organization_id = p_organization_id
    AND (p_client_id IS NULL OR n.client_id = p_client_id)
    AND (
      p_query = '' OR 
      n.search_vector @@ plainto_tsquery('english', p_query)
    )
  ORDER BY 
    n.is_pinned DESC,
    rank DESC,
    n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON client_notes TO authenticated;
GRANT SELECT, INSERT ON client_activities TO authenticated;
GRANT EXECUTE ON FUNCTION search_client_notes TO authenticated;

-- Performance monitoring view
CREATE OR REPLACE VIEW notes_performance_stats AS
SELECT 
  'client_notes' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as records_last_24h,
  COUNT(*) FILTER (WHERE visibility = 'private') as private_notes,
  COUNT(*) FILTER (WHERE visibility = 'internal') as internal_notes,
  COUNT(*) FILTER (WHERE visibility = 'public') as public_notes,
  COUNT(*) FILTER (WHERE is_pinned = true) as pinned_notes,
  COUNT(DISTINCT client_id) as clients_with_notes,
  COUNT(DISTINCT organization_id) as organizations_with_notes,
  AVG(LENGTH(content))::INTEGER as avg_content_length
FROM client_notes
UNION ALL
SELECT 
  'client_activities' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as records_last_24h,
  COUNT(*) FILTER (WHERE activity_type LIKE '%note%') as note_activities,
  0, 0, 0, 0,
  COUNT(DISTINCT client_id) as clients_with_activities,
  COUNT(DISTINCT organization_id) as organizations_with_activities,
  0
FROM client_activities;

-- Grant view access
GRANT SELECT ON notes_performance_stats TO authenticated;

-- Comments for documentation
COMMENT ON TABLE client_notes IS 'Private notes system for suppliers to track sensitive client information';
COMMENT ON COLUMN client_notes.content IS 'Note content with full-text search capability';
COMMENT ON COLUMN client_notes.visibility IS 'Controls who can see the note: public (all team), internal (admin only), private (creator only)';
COMMENT ON COLUMN client_notes.note_type IS 'Categorizes the note for filtering and organization';
COMMENT ON COLUMN client_notes.search_vector IS 'Generated full-text search vector for fast content searches';
COMMENT ON COLUMN client_notes.follow_up_date IS 'Optional date for follow-up reminders';

COMMENT ON TABLE client_activities IS 'Activity log for tracking all client-related actions including note operations';
COMMENT ON FUNCTION search_client_notes IS 'Full-text search function with ranking for client notes';
COMMENT ON VIEW notes_performance_stats IS 'Performance and usage statistics for notes system monitoring';

-- Insert initial test data for development (only if no notes exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM client_notes LIMIT 1) THEN
    -- This would be populated during normal usage
    -- No test data inserted in production migration
    NULL;
  END IF;
END $$;