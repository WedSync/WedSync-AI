-- Create wedding_websites table
CREATE TABLE IF NOT EXISTS wedding_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  slug VARCHAR(255) UNIQUE NOT NULL,
  domain VARCHAR(255),
  is_published BOOLEAN DEFAULT false,
  is_password_protected BOOLEAN DEFAULT false,
  password_hash TEXT,
  template_id VARCHAR(100) DEFAULT 'default',
  custom_css TEXT,
  primary_language VARCHAR(10) DEFAULT 'en',
  supported_languages TEXT[] DEFAULT ARRAY['en'],
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords TEXT[],
  og_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Create website_content table
CREATE TABLE IF NOT EXISTS website_content (
  website_id UUID PRIMARY KEY REFERENCES wedding_websites(id) ON DELETE CASCADE,
  hero_title VARCHAR(255),
  hero_subtitle VARCHAR(255),
  hero_image TEXT,
  hero_date DATE,
  welcome_message TEXT,
  venue_name VARCHAR(255),
  venue_address TEXT,
  ceremony_time TIME,
  reception_time TIME,
  dress_code VARCHAR(100),
  additional_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create wedding_stories table
CREATE TABLE IF NOT EXISTS wedding_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES wedding_websites(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  date DATE,
  image_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create wedding_party_members table
CREATE TABLE IF NOT EXISTS wedding_party_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES wedding_websites(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('bridesmaid', 'groomsman', 'maid_of_honor', 'best_man', 'flower_girl', 'ring_bearer', 'other')),
  bio TEXT,
  image_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create registry_links table
CREATE TABLE IF NOT EXISTS registry_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES wedding_websites(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create travel_info table
CREATE TABLE IF NOT EXISTS travel_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES wedding_websites(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  address TEXT,
  map_url TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('accommodation', 'transportation', 'attraction', 'venue', 'other')),
  website_url TEXT,
  phone VARCHAR(50),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create website_translations table
CREATE TABLE IF NOT EXISTS website_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES wedding_websites(id) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL,
  field_key VARCHAR(255) NOT NULL,
  translation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(website_id, language_code, field_key)
);

-- Create website_themes table
CREATE TABLE IF NOT EXISTS website_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  preview_url TEXT,
  thumbnail_url TEXT,
  default_colors JSONB,
  default_fonts JSONB,
  features TEXT[],
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create website_analytics table
CREATE TABLE IF NOT EXISTS website_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES wedding_websites(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  average_time_on_page INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,2),
  top_referrers TEXT[],
  device_breakdown JSONB,
  location_breakdown JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(website_id, date)
);

-- Create indexes for better performance
CREATE INDEX idx_wedding_websites_client_id ON wedding_websites(client_id);
CREATE INDEX idx_wedding_websites_slug ON wedding_websites(slug);
CREATE INDEX idx_wedding_websites_is_published ON wedding_websites(is_published);
CREATE INDEX idx_wedding_stories_website_id ON wedding_stories(website_id);
CREATE INDEX idx_wedding_party_members_website_id ON wedding_party_members(website_id);
CREATE INDEX idx_registry_links_website_id ON registry_links(website_id);
CREATE INDEX idx_travel_info_website_id ON travel_info(website_id);
CREATE INDEX idx_website_translations_website_id ON website_translations(website_id);
CREATE INDEX idx_website_translations_language ON website_translations(language_code);
CREATE INDEX idx_website_analytics_website_id_date ON website_analytics(website_id, date);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wedding_websites_updated_at BEFORE UPDATE ON wedding_websites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_website_content_updated_at BEFORE UPDATE ON website_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wedding_stories_updated_at BEFORE UPDATE ON wedding_stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wedding_party_members_updated_at BEFORE UPDATE ON wedding_party_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registry_links_updated_at BEFORE UPDATE ON registry_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_travel_info_updated_at BEFORE UPDATE ON travel_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_website_translations_updated_at BEFORE UPDATE ON website_translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE wedding_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_party_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE registry_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_analytics ENABLE ROW LEVEL SECURITY;

-- Policies for wedding_websites
CREATE POLICY "Users can view their own wedding websites"
  ON wedding_websites FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Users can create their own wedding websites"
  ON wedding_websites FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update their own wedding websites"
  ON wedding_websites FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Users can delete their own wedding websites"
  ON wedding_websites FOR DELETE
  USING (auth.uid() = client_id);

-- Similar policies for other tables (website_content, wedding_stories, etc.)
CREATE POLICY "Users can manage website content"
  ON website_content FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wedding_websites
      WHERE wedding_websites.id = website_content.website_id
      AND wedding_websites.client_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage wedding stories"
  ON wedding_stories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wedding_websites
      WHERE wedding_websites.id = wedding_stories.website_id
      AND wedding_websites.client_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage wedding party members"
  ON wedding_party_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wedding_websites
      WHERE wedding_websites.id = wedding_party_members.website_id
      AND wedding_websites.client_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage registry links"
  ON registry_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wedding_websites
      WHERE wedding_websites.id = registry_links.website_id
      AND wedding_websites.client_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage travel info"
  ON travel_info FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wedding_websites
      WHERE wedding_websites.id = travel_info.website_id
      AND wedding_websites.client_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage translations"
  ON website_translations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wedding_websites
      WHERE wedding_websites.id = website_translations.website_id
      AND wedding_websites.client_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their website analytics"
  ON website_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wedding_websites
      WHERE wedding_websites.id = website_analytics.website_id
      AND wedding_websites.client_id = auth.uid()
    )
  );

-- Insert default themes
INSERT INTO website_themes (name, preview_url, thumbnail_url, default_colors, default_fonts, features, is_premium) VALUES
  ('Classic Elegance', '/themes/classic-preview.jpg', '/themes/classic-thumb.jpg', 
   '{"primary": "#4A5568", "secondary": "#718096", "accent": "#D69E2E", "text": "#2D3748", "background": "#FFFFFF"}',
   '{"heading": "Playfair Display", "body": "Open Sans"}',
   ARRAY['Elegant typography', 'Timeline layout', 'Photo gallery'],
   false),
  ('Modern Minimal', '/themes/modern-preview.jpg', '/themes/modern-thumb.jpg',
   '{"primary": "#000000", "secondary": "#4A5568", "accent": "#ED8936", "text": "#1A202C", "background": "#FFFFFF"}',
   '{"heading": "Montserrat", "body": "Lato"}',
   ARRAY['Clean design', 'Card layouts', 'Smooth animations'],
   false),
  ('Romantic Garden', '/themes/garden-preview.jpg', '/themes/garden-thumb.jpg',
   '{"primary": "#D53F8C", "secondary": "#B83280", "accent": "#97266D", "text": "#702459", "background": "#FFF5F7"}',
   '{"heading": "Dancing Script", "body": "Raleway"}',
   ARRAY['Floral elements', 'Soft colors', 'Love quotes'],
   true);