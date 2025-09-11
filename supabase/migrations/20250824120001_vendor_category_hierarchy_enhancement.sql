-- WS-117: Vendor Category Management System Enhancement
-- Add subcategories, enhanced search, and category attributes

-- Add category attributes table for flexible category properties
CREATE TABLE IF NOT EXISTS vendor_category_attributes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id UUID REFERENCES vendor_categories(id) ON DELETE CASCADE,
  attribute_name VARCHAR(100) NOT NULL,
  attribute_type VARCHAR(50) NOT NULL, -- text, number, boolean, select, multiselect
  is_required BOOLEAN DEFAULT false,
  options JSONB, -- For select/multiselect types
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, attribute_name)
);

-- Add search and filtering enhancements to vendor_categories
ALTER TABLE vendor_categories ADD COLUMN IF NOT EXISTS search_keywords TEXT[];
ALTER TABLE vendor_categories ADD COLUMN IF NOT EXISTS category_level INTEGER DEFAULT 1;
ALTER TABLE vendor_categories ADD COLUMN IF NOT EXISTS full_path TEXT; -- For breadcrumb navigation

-- Update category levels based on parent hierarchy
WITH RECURSIVE category_hierarchy AS (
  -- Base case: top-level categories (no parent)
  SELECT id, name, parent_id, 1 as level, name::TEXT as path
  FROM vendor_categories 
  WHERE parent_id IS NULL
  
  UNION ALL
  
  -- Recursive case: child categories
  SELECT vc.id, vc.name, vc.parent_id, ch.level + 1, ch.path || ' > ' || vc.name
  FROM vendor_categories vc
  JOIN category_hierarchy ch ON vc.parent_id = ch.id
)
UPDATE vendor_categories 
SET 
  category_level = ch.level,
  full_path = ch.path
FROM category_hierarchy ch 
WHERE vendor_categories.id = ch.id;

-- Insert subcategories for Photography
INSERT INTO vendor_categories (name, slug, parent_id, display_name, description, icon, sort_order, search_keywords) VALUES
  -- Photography subcategories
  ('wedding-photography', 'wedding-photography', (SELECT id FROM vendor_categories WHERE slug = 'photography'), 'Wedding Photography', 'Traditional wedding ceremony and reception photography', 'camera', 1, ARRAY['traditional', 'ceremony', 'reception', 'portraits']),
  ('engagement-photography', 'engagement-photography', (SELECT id FROM vendor_categories WHERE slug = 'photography'), 'Engagement Photography', 'Pre-wedding engagement photo sessions', 'heart', 2, ARRAY['engagement', 'pre-wedding', 'couples', 'portraits']),
  ('photobooth', 'photobooth', (SELECT id FROM vendor_categories WHERE slug = 'photography'), 'Photo Booth', 'Interactive photo booth rentals', 'camera-retro', 3, ARRAY['photobooth', 'interactive', 'props', 'instant']),
  ('drone-photography', 'drone-photography', (SELECT id FROM vendor_categories WHERE slug = 'photography'), 'Drone Photography', 'Aerial wedding photography and videography', 'plane', 4, ARRAY['drone', 'aerial', 'landscape', 'unique']),
  
  -- Videography subcategories  
  ('wedding-videography', 'wedding-videography', (SELECT id FROM vendor_categories WHERE slug = 'videography'), 'Wedding Videography', 'Traditional wedding ceremony and reception filming', 'video', 1, ARRAY['traditional', 'ceremony', 'reception', 'documentary']),
  ('cinematic-films', 'cinematic-films', (SELECT id FROM vendor_categories WHERE slug = 'videography'), 'Cinematic Films', 'Artistic cinematic wedding films', 'film', 2, ARRAY['cinematic', 'artistic', 'storytelling', 'film']),
  ('livestreaming', 'livestreaming', (SELECT id FROM vendor_categories WHERE slug = 'videography'), 'Live Streaming', 'Live streaming services for remote guests', 'broadcast-tower', 3, ARRAY['livestream', 'remote', 'virtual', 'broadcast']),
  
  -- Venue subcategories
  ('wedding-venues', 'wedding-venues', (SELECT id FROM vendor_categories WHERE slug = 'venue'), 'Wedding Venues', 'Traditional wedding ceremony and reception venues', 'building', 1, ARRAY['traditional', 'ceremony', 'reception', 'hall']),
  ('outdoor-venues', 'outdoor-venues', (SELECT id FROM vendor_categories WHERE slug = 'venue'), 'Outdoor Venues', 'Outdoor wedding locations and gardens', 'tree', 2, ARRAY['outdoor', 'garden', 'nature', 'rustic']),
  ('luxury-venues', 'luxury-venues', (SELECT id FROM vendor_categories WHERE slug = 'venue'), 'Luxury Venues', 'High-end luxury wedding venues', 'crown', 3, ARRAY['luxury', 'premium', 'upscale', 'exclusive']),
  ('unique-venues', 'unique-venues', (SELECT id FROM vendor_categories WHERE slug = 'venue'), 'Unique Venues', 'Non-traditional and unique wedding locations', 'star', 4, ARRAY['unique', 'alternative', 'unusual', 'creative']),
  
  -- Catering subcategories
  ('traditional-catering', 'traditional-catering', (SELECT id FROM vendor_categories WHERE slug = 'catering'), 'Traditional Catering', 'Formal sit-down wedding catering', 'utensils', 1, ARRAY['traditional', 'formal', 'sit-down', 'served']),
  ('buffet-catering', 'buffet-catering', (SELECT id FROM vendor_categories WHERE slug = 'catering'), 'Buffet Catering', 'Buffet-style wedding catering', 'hamburger', 2, ARRAY['buffet', 'self-service', 'variety', 'casual']),
  ('food-trucks', 'food-trucks', (SELECT id FROM vendor_categories WHERE slug = 'catering'), 'Food Trucks', 'Mobile food truck catering', 'truck', 3, ARRAY['food-truck', 'mobile', 'casual', 'street-food']),
  ('dietary-specialists', 'dietary-specialists', (SELECT id FROM vendor_categories WHERE slug = 'catering'), 'Dietary Specialists', 'Specialized dietary requirement catering', 'leaf', 4, ARRAY['dietary', 'vegan', 'vegetarian', 'gluten-free', 'allergies']),
  
  -- Music & Entertainment subcategories
  ('wedding-djs', 'wedding-djs', (SELECT id FROM vendor_categories WHERE slug = 'music'), 'Wedding DJs', 'Professional wedding disc jockeys', 'music', 1, ARRAY['dj', 'disc-jockey', 'music', 'dancing']),
  ('live-bands', 'live-bands', (SELECT id FROM vendor_categories WHERE slug = 'music'), 'Live Bands', 'Live musical bands for weddings', 'microphone', 2, ARRAY['live-band', 'musicians', 'performance', 'instruments']),
  ('acoustic-performers', 'acoustic-performers', (SELECT id FROM vendor_categories WHERE slug = 'music'), 'Acoustic Performers', 'Solo acoustic musicians and singers', 'guitar', 3, ARRAY['acoustic', 'solo', 'singer', 'guitarist']),
  ('specialty-entertainment', 'specialty-entertainment', (SELECT id FROM vendor_categories WHERE slug = 'music'), 'Specialty Entertainment', 'Unique entertainment acts and performers', 'theater-masks', 4, ARRAY['specialty', 'entertainment', 'performers', 'acts'])

ON CONFLICT (slug) DO NOTHING;

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_vendor_categories_parent_id ON vendor_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_vendor_categories_search_keywords ON vendor_categories USING GIN(search_keywords);
CREATE INDEX IF NOT EXISTS idx_vendor_categories_level_active ON vendor_categories(category_level, is_active);
CREATE INDEX IF NOT EXISTS idx_vendor_category_attributes_category_id ON vendor_category_attributes(category_id);

-- Enable Row Level Security for new tables
ALTER TABLE vendor_category_attributes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor_category_attributes
CREATE POLICY "vendor_category_attributes_select_policy"
  ON vendor_category_attributes FOR SELECT
  USING (true); -- Public read access

CREATE POLICY "vendor_category_attributes_insert_update_delete_policy"
  ON vendor_category_attributes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'super_admin')
    )
  );

-- Function to get category hierarchy with subcategories
CREATE OR REPLACE FUNCTION get_category_hierarchy()
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  slug VARCHAR,
  display_name VARCHAR,
  description TEXT,
  icon VARCHAR,
  parent_id UUID,
  category_level INTEGER,
  full_path TEXT,
  subcategories JSONB
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE category_tree AS (
    -- Get all top-level categories
    SELECT 
      vc.id, vc.name, vc.slug, vc.display_name, vc.description, vc.icon,
      vc.parent_id, vc.category_level, vc.full_path,
      '[]'::jsonb as subcategories,
      1 as depth
    FROM vendor_categories vc
    WHERE vc.parent_id IS NULL AND vc.is_active = true
    
    UNION ALL
    
    -- Get subcategories
    SELECT 
      vc.id, vc.name, vc.slug, vc.display_name, vc.description, vc.icon,
      vc.parent_id, vc.category_level, vc.full_path,
      '[]'::jsonb as subcategories,
      ct.depth + 1
    FROM vendor_categories vc
    JOIN category_tree ct ON vc.parent_id = ct.id
    WHERE vc.is_active = true AND ct.depth < 5 -- Prevent infinite recursion
  )
  SELECT DISTINCT
    ct.id, ct.name, ct.slug, ct.display_name, ct.description, ct.icon,
    ct.parent_id, ct.category_level, ct.full_path,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', sub.id,
            'name', sub.name,
            'slug', sub.slug,
            'display_name', sub.display_name,
            'description', sub.description,
            'icon', sub.icon,
            'sort_order', sub.sort_order
          ) ORDER BY sub.sort_order
        )
        FROM vendor_categories sub 
        WHERE sub.parent_id = ct.id AND sub.is_active = true
      ), 
      '[]'::jsonb
    ) as subcategories
  FROM category_tree ct
  WHERE ct.parent_id IS NULL -- Only return top-level categories with their subcategories nested
  ORDER BY ct.id;
END;
$$;

-- Function to search categories by keywords
CREATE OR REPLACE FUNCTION search_vendor_categories(search_term TEXT)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  slug VARCHAR,
  display_name VARCHAR,
  description TEXT,
  icon VARCHAR,
  parent_id UUID,
  category_level INTEGER,
  full_path TEXT,
  relevance_score FLOAT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vc.id, vc.name, vc.slug, vc.display_name, vc.description, vc.icon,
    vc.parent_id, vc.category_level, vc.full_path,
    (
      -- Calculate relevance score based on different field matches
      CASE WHEN vc.name ILIKE '%' || search_term || '%' THEN 10.0 ELSE 0.0 END +
      CASE WHEN vc.display_name ILIKE '%' || search_term || '%' THEN 8.0 ELSE 0.0 END +
      CASE WHEN vc.description ILIKE '%' || search_term || '%' THEN 5.0 ELSE 0.0 END +
      CASE WHEN EXISTS(SELECT 1 FROM unnest(vc.search_keywords) kw WHERE kw ILIKE '%' || search_term || '%') THEN 7.0 ELSE 0.0 END
    ) as relevance_score
  FROM vendor_categories vc
  WHERE vc.is_active = true
  AND (
    vc.name ILIKE '%' || search_term || '%'
    OR vc.display_name ILIKE '%' || search_term || '%'
    OR vc.description ILIKE '%' || search_term || '%'
    OR EXISTS(SELECT 1 FROM unnest(vc.search_keywords) kw WHERE kw ILIKE '%' || search_term || '%')
  )
  ORDER BY relevance_score DESC, vc.sort_order;
END;
$$;

-- Update the category levels and paths for new subcategories
WITH RECURSIVE category_hierarchy AS (
  -- Base case: top-level categories (no parent)
  SELECT id, name, parent_id, 1 as level, name::TEXT as path
  FROM vendor_categories 
  WHERE parent_id IS NULL
  
  UNION ALL
  
  -- Recursive case: child categories
  SELECT vc.id, vc.name, vc.parent_id, ch.level + 1, ch.path || ' > ' || vc.name
  FROM vendor_categories vc
  JOIN category_hierarchy ch ON vc.parent_id = ch.id
)
UPDATE vendor_categories 
SET 
  category_level = ch.level,
  full_path = ch.path
FROM category_hierarchy ch 
WHERE vendor_categories.id = ch.id;