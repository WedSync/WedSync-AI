-- Migration: WS-005 Tagging System
-- Team E Round 3: Complete tagging system with client associations
-- Date: 2025-01-21

-- Create tags table for organizing clients
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name varchar(50) NOT NULL,
  description text,
  color varchar(20) NOT NULL DEFAULT 'blue',
  category varchar(20) NOT NULL DEFAULT 'custom',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Constraints
  CONSTRAINT tags_name_length CHECK (length(name) >= 1 AND length(name) <= 50),
  CONSTRAINT tags_description_length CHECK (description IS NULL OR length(description) <= 200),
  CONSTRAINT tags_color_valid CHECK (color IN (
    'gray', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 
    'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 
    'pink', 'rose'
  )),
  CONSTRAINT tags_category_valid CHECK (category IN (
    'relationship', 'venue', 'season', 'style', 'service', 'priority', 'custom'
  )),
  
  -- Unique constraint for tag names within organization
  UNIQUE(organization_id, name)
);

-- Create client_tags junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS client_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamp with time zone DEFAULT now(),
  
  -- Prevent duplicate assignments
  UNIQUE(client_id, tag_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tags_organization_id ON tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON tags(created_at);

CREATE INDEX IF NOT EXISTS idx_client_tags_client_id ON client_tags(client_id);
CREATE INDEX IF NOT EXISTS idx_client_tags_tag_id ON client_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_client_tags_assigned_at ON client_tags(assigned_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tags_org_category ON tags(organization_id, category);
CREATE INDEX IF NOT EXISTS idx_client_tags_client_assigned ON client_tags(client_id, assigned_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tags table
CREATE POLICY "Users can view tags in their organization" ON tags
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tags in their organization" ON tags
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tags in their organization" ON tags
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tags in their organization" ON tags
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for client_tags table
CREATE POLICY "Users can view client tags in their organization" ON client_tags
  FOR SELECT USING (
    client_id IN (
      SELECT id 
      FROM clients 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can assign tags to clients in their organization" ON client_tags
  FOR INSERT WITH CHECK (
    client_id IN (
      SELECT id 
      FROM clients 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
      )
    )
    AND tag_id IN (
      SELECT id 
      FROM tags 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can remove tags from clients in their organization" ON client_tags
  FOR DELETE USING (
    client_id IN (
      SELECT id 
      FROM clients 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Create function to update tag updated_at timestamp
CREATE OR REPLACE FUNCTION update_tag_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tag timestamp updates
CREATE TRIGGER trigger_update_tag_timestamp
  BEFORE UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_timestamp();

-- Create function to get tag usage count
CREATE OR REPLACE FUNCTION get_tag_usage_count(tag_uuid uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM client_tags
    WHERE tag_id = tag_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for tag statistics
CREATE OR REPLACE VIEW tag_statistics AS
SELECT 
  t.id,
  t.organization_id,
  t.name,
  t.description,
  t.color,
  t.category,
  t.created_at,
  t.updated_at,
  COALESCE(ct.usage_count, 0) as usage_count
FROM tags t
LEFT JOIN (
  SELECT 
    tag_id, 
    COUNT(*) as usage_count
  FROM client_tags
  GROUP BY tag_id
) ct ON t.id = ct.tag_id;

-- Grant permissions on the view
GRANT SELECT ON tag_statistics TO authenticated;

-- Create function to get clients by tags
CREATE OR REPLACE FUNCTION get_clients_by_tags(
  org_id uuid,
  tag_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  client_id uuid,
  client_name text,
  tag_count bigint
) AS $$
BEGIN
  IF tag_ids IS NULL OR array_length(tag_ids, 1) = 0 THEN
    -- Return all clients if no tags specified
    RETURN QUERY
    SELECT 
      c.id as client_id,
      COALESCE(c.first_name || ' ' || c.last_name, 'Unnamed Client') as client_name,
      0::bigint as tag_count
    FROM clients c
    WHERE c.organization_id = org_id;
  ELSE
    -- Return clients that have ALL specified tags
    RETURN QUERY
    SELECT 
      c.id as client_id,
      COALESCE(c.first_name || ' ' || c.last_name, 'Unnamed Client') as client_name,
      COUNT(ct.tag_id) as tag_count
    FROM clients c
    INNER JOIN client_tags ct ON c.id = ct.client_id
    WHERE c.organization_id = org_id
      AND ct.tag_id = ANY(tag_ids)
    GROUP BY c.id, c.first_name, c.last_name
    HAVING COUNT(ct.tag_id) = array_length(tag_ids, 1);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_clients_by_tags TO authenticated;

-- Insert default tag categories (optional sample data)
-- Organizations can customize these or create their own
INSERT INTO tags (organization_id, name, description, color, category, created_by)
SELECT 
  o.id as organization_id,
  sample_tags.name,
  sample_tags.description,
  sample_tags.color,
  sample_tags.category,
  NULL as created_by
FROM organizations o
CROSS JOIN (
  VALUES 
    ('VIP Client', 'High-value client requiring premium service', 'blue', 'relationship'),
    ('Referral', 'Client referred by existing customer', 'green', 'relationship'),
    ('Outdoor Wedding', 'Wedding ceremony and/or reception outdoors', 'emerald', 'venue'),
    ('Indoor Wedding', 'Wedding ceremony and/or reception indoors', 'cyan', 'venue'),
    ('Destination', 'Wedding at a destination location', 'purple', 'venue'),
    ('Spring', 'Wedding scheduled for spring season', 'lime', 'season'),
    ('Summer', 'Wedding scheduled for summer season', 'amber', 'season'),
    ('Fall', 'Wedding scheduled for fall season', 'orange', 'season'),
    ('Winter', 'Wedding scheduled for winter season', 'sky', 'season'),
    ('Modern', 'Contemporary wedding style', 'indigo', 'style'),
    ('Traditional', 'Classic wedding style', 'rose', 'style'),
    ('Rustic', 'Rustic/country wedding style', 'yellow', 'style'),
    ('Elegant', 'Upscale elegant wedding style', 'violet', 'style'),
    ('Full Day', 'Complete wedding day coverage', 'teal', 'service'),
    ('Half Day', 'Partial wedding day coverage', 'pink', 'service'),
    ('Elopement', 'Small intimate wedding ceremony', 'fuchsia', 'service')
) AS sample_tags(name, description, color, category)
ON CONFLICT (organization_id, name) DO NOTHING;

-- Create notification triggers for tag operations
CREATE OR REPLACE FUNCTION notify_tag_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify when tags are assigned or removed
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_notify(
      'tag_assigned',
      json_build_object(
        'client_id', NEW.client_id,
        'tag_id', NEW.tag_id,
        'assigned_by', NEW.assigned_by,
        'assigned_at', NEW.assigned_at
      )::text
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM pg_notify(
      'tag_removed',
      json_build_object(
        'client_id', OLD.client_id,
        'tag_id', OLD.tag_id
      )::text
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for tag change notifications
CREATE TRIGGER trigger_notify_tag_changes
  AFTER INSERT OR DELETE ON client_tags
  FOR EACH ROW
  EXECUTE FUNCTION notify_tag_changes();

-- Add comments for documentation
COMMENT ON TABLE tags IS 'Tags for organizing and categorizing clients';
COMMENT ON TABLE client_tags IS 'Junction table linking clients to their assigned tags';
COMMENT ON COLUMN tags.color IS 'UI color for tag display (must be one of predefined colors)';
COMMENT ON COLUMN tags.category IS 'Tag category for organization (relationship, venue, season, etc.)';
COMMENT ON FUNCTION get_tag_usage_count IS 'Returns the number of clients using a specific tag';
COMMENT ON VIEW tag_statistics IS 'Comprehensive tag statistics including usage counts';
COMMENT ON FUNCTION get_clients_by_tags IS 'Filters clients by one or more tags (AND logic)';

-- Performance optimization: Analyze tables after migration
ANALYZE tags;
ANALYZE client_tags;