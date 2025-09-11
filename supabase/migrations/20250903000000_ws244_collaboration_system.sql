-- WS-244 Real-Time Collaboration System Migration
-- Mobile-First Collaborative Editing for Wedding Documents
-- Team D - Mobile-First Real-Time Collaboration System

BEGIN;

-- Create collaborative documents table
CREATE TABLE IF NOT EXISTS collaborative_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('guest_list', 'vendor_selection', 'timeline', 'family_input')),
  content TEXT DEFAULT '',
  yjs_state TEXT, -- Base64 encoded Y.js document state
  version BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  last_edited_by UUID REFERENCES auth.users(id),
  
  -- Mobile optimization indexes
  CONSTRAINT collaborative_documents_title_length CHECK (LENGTH(title) <= 255),
  CONSTRAINT collaborative_documents_content_length CHECK (LENGTH(content) <= 50000)
);

-- Create collaborative document permissions table
CREATE TABLE IF NOT EXISTS collaborative_document_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES collaborative_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_read BOOLEAN DEFAULT TRUE,
  can_write BOOLEAN DEFAULT FALSE,
  can_share BOOLEAN DEFAULT FALSE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(document_id, user_id)
);

-- Create collaborative document sessions table (for real-time presence)
CREATE TABLE IF NOT EXISTS collaborative_document_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES collaborative_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  is_typing BOOLEAN DEFAULT FALSE,
  cursor_position INTEGER DEFAULT 0,
  device_info JSONB DEFAULT '{}',
  
  UNIQUE(document_id, user_id)
);

-- Create collaborative document history table (audit trail)
CREATE TABLE IF NOT EXISTS collaborative_document_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES collaborative_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'save', 'sync', 'delete', 'permission_change')),
  content_length INTEGER DEFAULT 0,
  operation_count INTEGER DEFAULT 0,
  has_yjs_state BOOLEAN DEFAULT FALSE,
  has_conflicts BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_collaborative_documents_wedding_id ON collaborative_documents(wedding_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_documents_type ON collaborative_documents(type);
CREATE INDEX IF NOT EXISTS idx_collaborative_documents_updated_at ON collaborative_documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaborative_documents_created_by ON collaborative_documents(created_by);

CREATE INDEX IF NOT EXISTS idx_collaborative_document_permissions_document_id ON collaborative_document_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_document_permissions_user_id ON collaborative_document_permissions(user_id);

CREATE INDEX IF NOT EXISTS idx_collaborative_document_sessions_document_id ON collaborative_document_sessions(document_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_document_sessions_user_id ON collaborative_document_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_document_sessions_last_active ON collaborative_document_sessions(last_active DESC);

CREATE INDEX IF NOT EXISTS idx_collaborative_document_history_document_id ON collaborative_document_history(document_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_document_history_user_id ON collaborative_document_history(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_document_history_timestamp ON collaborative_document_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_collaborative_document_history_action ON collaborative_document_history(action);

-- Create trigger functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_collaborative_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_collaborative_document_sessions_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER collaborative_documents_update_updated_at
  BEFORE UPDATE ON collaborative_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_collaborative_documents_updated_at();

CREATE TRIGGER collaborative_document_sessions_update_last_active
  BEFORE UPDATE ON collaborative_document_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_collaborative_document_sessions_last_active();

-- Row Level Security (RLS) Policies
ALTER TABLE collaborative_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_document_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_document_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_document_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collaborative_documents
CREATE POLICY "collaborative_documents_read_policy" ON collaborative_documents
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM collaborative_document_permissions 
      WHERE document_id = collaborative_documents.id AND can_read = TRUE
    ) OR
    auth.uid() IN (
      SELECT user_id FROM wedding_team_members 
      WHERE wedding_id = collaborative_documents.wedding_id
    ) OR
    auth.uid() = created_by
  );

CREATE POLICY "collaborative_documents_write_policy" ON collaborative_documents
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM collaborative_document_permissions 
      WHERE document_id = collaborative_documents.id AND can_write = TRUE
    ) OR
    auth.uid() IN (
      SELECT user_id FROM wedding_team_members 
      WHERE wedding_id = collaborative_documents.wedding_id AND role != 'viewer'
    ) OR
    auth.uid() = created_by
  );

CREATE POLICY "collaborative_documents_insert_policy" ON collaborative_documents
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM wedding_team_members 
      WHERE wedding_id = collaborative_documents.wedding_id AND role IN ('owner', 'planner', 'editor')
    ) OR
    auth.uid() = created_by
  );

CREATE POLICY "collaborative_documents_delete_policy" ON collaborative_documents
  FOR DELETE USING (
    auth.uid() = created_by OR
    auth.uid() IN (
      SELECT user_id FROM wedding_team_members 
      WHERE wedding_id = collaborative_documents.wedding_id AND role = 'owner'
    )
  );

-- RLS Policies for collaborative_document_permissions
CREATE POLICY "collaborative_document_permissions_read_policy" ON collaborative_document_permissions
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT created_by FROM collaborative_documents 
      WHERE id = collaborative_document_permissions.document_id
    ) OR
    auth.uid() IN (
      SELECT user_id FROM wedding_team_members wt
      JOIN collaborative_documents cd ON cd.wedding_id = wt.wedding_id
      WHERE cd.id = collaborative_document_permissions.document_id AND wt.role IN ('owner', 'planner')
    )
  );

CREATE POLICY "collaborative_document_permissions_write_policy" ON collaborative_document_permissions
  FOR ALL USING (
    auth.uid() IN (
      SELECT created_by FROM collaborative_documents 
      WHERE id = collaborative_document_permissions.document_id
    ) OR
    auth.uid() IN (
      SELECT user_id FROM wedding_team_members wt
      JOIN collaborative_documents cd ON cd.wedding_id = wt.wedding_id
      WHERE cd.id = collaborative_document_permissions.document_id AND wt.role = 'owner'
    )
  );

-- RLS Policies for collaborative_document_sessions
CREATE POLICY "collaborative_document_sessions_read_policy" ON collaborative_document_sessions
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM collaborative_document_permissions 
      WHERE document_id = collaborative_document_sessions.document_id AND can_read = TRUE
    ) OR
    auth.uid() IN (
      SELECT user_id FROM wedding_team_members wt
      JOIN collaborative_documents cd ON cd.wedding_id = wt.wedding_id
      WHERE cd.id = collaborative_document_sessions.document_id
    )
  );

CREATE POLICY "collaborative_document_sessions_write_policy" ON collaborative_document_sessions
  FOR ALL USING (
    auth.uid() = user_id
  );

-- RLS Policies for collaborative_document_history
CREATE POLICY "collaborative_document_history_read_policy" ON collaborative_document_history
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM collaborative_document_permissions 
      WHERE document_id = collaborative_document_history.document_id AND can_read = TRUE
    ) OR
    auth.uid() IN (
      SELECT user_id FROM wedding_team_members wt
      JOIN collaborative_documents cd ON cd.wedding_id = wt.wedding_id
      WHERE cd.id = collaborative_document_history.document_id
    )
  );

CREATE POLICY "collaborative_document_history_insert_policy" ON collaborative_document_history
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Create wedding-specific default documents function
CREATE OR REPLACE FUNCTION create_default_collaborative_documents(wedding_id UUID, user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Create default guest list document
  INSERT INTO collaborative_documents (wedding_id, title, type, content, created_by)
  VALUES (
    wedding_id,
    'Guest List',
    'guest_list',
    'Guest List - Your Wedding' || CHR(10) || CHR(10) || '1. Add your guests below...' || CHR(10) || '2. Include RSVP status and dietary requirements' || CHR(10) || '3. Assign table numbers when ready',
    user_id
  );
  
  -- Create default timeline document
  INSERT INTO collaborative_documents (wedding_id, title, type, content, created_by)
  VALUES (
    wedding_id,
    'Wedding Timeline',
    'timeline',
    'Wedding Day Timeline' || CHR(10) || CHR(10) || '9:00 AM - Getting ready begins' || CHR(10) || '1:00 PM - Photography session' || CHR(10) || '3:00 PM - Ceremony' || CHR(10) || '4:00 PM - Cocktail hour' || CHR(10) || '6:00 PM - Reception dinner',
    user_id
  );
  
  -- Create default vendor selection document
  INSERT INTO collaborative_documents (wedding_id, title, type, content, created_by)
  VALUES (
    wedding_id,
    'Vendor Selection',
    'vendor_selection',
    'Vendor Selection - Your Wedding' || CHR(10) || CHR(10) || 'Photography:' || CHR(10) || '- Option 1: [Vendor Name] (£[Price])' || CHR(10) || CHR(10) || 'Catering:' || CHR(10) || '- Option 1: [Vendor Name] (£[Price])' || CHR(10) || CHR(10) || 'Venue:' || CHR(10) || '- Option 1: [Venue Name] (£[Price])',
    user_id
  );
  
  -- Create default family input document
  INSERT INTO collaborative_documents (wedding_id, title, type, content, created_by)
  VALUES (
    wedding_id,
    'Family Input',
    'family_input',
    'Family Input - Your Wedding' || CHR(10) || CHR(10) || 'Dietary Requirements:' || CHR(10) || '- [Name]: [Dietary needs]' || CHR(10) || CHR(10) || 'Special Requests:' || CHR(10) || '- [Request description]' || CHR(10) || CHR(10) || 'Music Requests:' || CHR(10) || '- [Song] by [Artist]',
    user_id
  );
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old sessions (mobile optimization)
CREATE OR REPLACE FUNCTION cleanup_old_collaborative_sessions()
RETURNS VOID AS $$
BEGIN
  -- Remove sessions older than 24 hours
  DELETE FROM collaborative_document_sessions 
  WHERE last_active < NOW() - INTERVAL '24 hours';
  
  -- Remove old history entries older than 30 days (keep audit trail manageable)
  DELETE FROM collaborative_document_history 
  WHERE timestamp < NOW() - INTERVAL '30 days' AND action NOT IN ('create', 'delete');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get document collaborator summary (mobile-optimized)
CREATE OR REPLACE FUNCTION get_document_collaborators(doc_id UUID)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_avatar TEXT,
  role TEXT,
  is_active BOOLEAN,
  last_active TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.user_id,
    COALESCE(p.full_name, 'Unknown User') as user_name,
    p.avatar_url as user_avatar,
    COALESCE(tm.role, 'viewer') as role,
    (s.last_active > NOW() - INTERVAL '5 minutes') as is_active,
    s.last_active
  FROM collaborative_document_sessions s
  LEFT JOIN user_profiles p ON p.user_id = s.user_id
  LEFT JOIN collaborative_documents cd ON cd.id = s.document_id
  LEFT JOIN wedding_team_members tm ON tm.user_id = s.user_id AND tm.wedding_id = cd.wedding_id
  WHERE s.document_id = doc_id
  ORDER BY s.last_active DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample collaborative documents for existing weddings (optional)
-- This is commented out as it should only run if needed
/*
INSERT INTO collaborative_documents (wedding_id, title, type, content, created_by)
SELECT 
  w.id,
  'Guest List',
  'guest_list',
  'Guest List - ' || w.couple_names || CHR(10) || CHR(10) || 'Add your guests below...',
  w.primary_contact_id
FROM weddings w
WHERE NOT EXISTS (
  SELECT 1 FROM collaborative_documents cd 
  WHERE cd.wedding_id = w.id AND cd.type = 'guest_list'
)
LIMIT 10; -- Limit to prevent overwhelming the system
*/

-- Grant necessary permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON collaborative_documents TO authenticated;
GRANT ALL ON collaborative_document_permissions TO authenticated;
GRANT ALL ON collaborative_document_sessions TO authenticated;
GRANT ALL ON collaborative_document_history TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION create_default_collaborative_documents(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_collaborative_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_document_collaborators(UUID) TO authenticated;

COMMIT;