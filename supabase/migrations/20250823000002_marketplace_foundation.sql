-- WS-106 Marketplace Foundation Migration
-- Creating core marketplace template system for WedMe portal

-- Core marketplace template system
CREATE TABLE IF NOT EXISTS marketplace_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('form', 'email_sequence', 'journey_workflow', 'bundle')),
  category VARCHAR(50) NOT NULL, -- 'photography', 'catering', 'venue', 'planning', 'florals', 'music'
  subcategory VARCHAR(50), -- 'engagement_forms', 'contract_templates', 'timeline_builders'
  
  -- Pricing and access
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'GBP',
  minimum_tier VARCHAR(20) DEFAULT 'starter' CHECK (minimum_tier IN ('starter', 'professional', 'scale')),
  
  -- Content and preview
  template_data JSONB NOT NULL, -- Encrypted template content
  preview_data JSONB DEFAULT '{}', -- Public structure preview
  preview_images TEXT[] DEFAULT '{}', -- S3 URLs for screenshots
  demo_url TEXT, -- Live demo link if applicable
  
  -- Performance metrics
  install_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,4) DEFAULT 0.0000, -- views to purchases
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  rating_count INTEGER DEFAULT 0,
  
  -- Status and quality
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'active', 'suspended', 'rejected')),
  quality_score INTEGER DEFAULT 0, -- 0-100 internal quality rating
  review_notes TEXT,
  reviewed_by UUID REFERENCES suppliers(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Wedding industry context
  target_wedding_types TEXT[] DEFAULT '{}', -- 'luxury', 'budget', 'destination', 'intimate'
  target_price_range VARCHAR(50), -- '£2k-5k', '£5k-10k', '£10k-20k', '£20k+'
  seasonal_relevance TEXT[] DEFAULT '{}', -- 'spring', 'summer', 'fall', 'winter'
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  search_vector tsvector,
  featured BOOLEAN DEFAULT false,
  featured_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for marketplace templates
CREATE INDEX idx_marketplace_templates_status ON marketplace_templates(status, created_at DESC);
CREATE INDEX idx_marketplace_templates_category ON marketplace_templates(category, subcategory);
CREATE INDEX idx_marketplace_templates_tier ON marketplace_templates(minimum_tier, price_cents);
CREATE INDEX idx_marketplace_templates_performance ON marketplace_templates(install_count DESC, average_rating DESC);
CREATE INDEX idx_marketplace_templates_search ON marketplace_templates USING GIN (search_vector);
CREATE INDEX idx_marketplace_templates_supplier ON marketplace_templates(supplier_id, status);
CREATE INDEX idx_marketplace_templates_featured ON marketplace_templates(featured, featured_until DESC) WHERE featured = true;

-- Template purchases and installations
CREATE TABLE IF NOT EXISTS marketplace_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Transaction details
  price_paid_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  commission_cents INTEGER NOT NULL, -- Platform commission (30%)
  seller_payout_cents INTEGER NOT NULL, -- Amount paid to seller
  
  -- Payment processing
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  
  -- Installation tracking
  installed BOOLEAN DEFAULT false,
  installed_at TIMESTAMP WITH TIME ZONE,
  installation_data JSONB DEFAULT '{}', -- Track what was installed
  
  -- Refund and support
  refund_requested BOOLEAN DEFAULT false,
  refund_reason TEXT,
  refunded_at TIMESTAMP WITH TIME ZONE,
  refund_amount_cents INTEGER,
  
  -- Wedding context for analytics
  buyer_wedding_context JSONB DEFAULT '{}',
  purchase_source VARCHAR(50), -- 'search', 'featured', 'recommendation', 'creator_profile'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for marketplace purchases
CREATE INDEX idx_marketplace_purchases_template ON marketplace_purchases(template_id, created_at DESC);
CREATE INDEX idx_marketplace_purchases_buyer ON marketplace_purchases(buyer_id, created_at DESC);
CREATE INDEX idx_marketplace_purchases_seller ON marketplace_purchases(seller_id, payment_status, created_at DESC);
CREATE INDEX idx_marketplace_purchases_status ON marketplace_purchases(payment_status, installed);

-- Template ratings and reviews
CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES marketplace_purchases(id) ON DELETE CASCADE,
  
  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  review_text TEXT,
  pros TEXT[] DEFAULT '{}',
  cons TEXT[] DEFAULT '{}',
  
  -- Business impact data
  business_impact_rating INTEGER CHECK (business_impact_rating >= 1 AND business_impact_rating <= 5),
  estimated_revenue_increase_percent INTEGER, -- Reported by reviewer
  time_saved_hours INTEGER, -- Hours saved using this template
  
  -- Status and moderation
  status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'flagged', 'removed')),
  helpful_votes INTEGER DEFAULT 0,
  flagged_as_fake BOOLEAN DEFAULT false,
  
  -- Wedding context
  reviewer_wedding_context JSONB DEFAULT '{}', -- Vendor type, typical client price range
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, reviewer_id) -- One review per buyer per template
);

-- Indexes for marketplace reviews
CREATE INDEX idx_marketplace_reviews_template ON marketplace_reviews(template_id, status, rating DESC);
CREATE INDEX idx_marketplace_reviews_reviewer ON marketplace_reviews(reviewer_id, created_at DESC);

-- Template categories and tags system
CREATE TABLE IF NOT EXISTS marketplace_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon_name VARCHAR(50), -- For UI icons
  parent_id UUID REFERENCES marketplace_categories(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  template_count INTEGER DEFAULT 0, -- Cached count
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for marketplace categories
CREATE INDEX idx_marketplace_categories_parent ON marketplace_categories(parent_id, sort_order);
CREATE INDEX idx_marketplace_categories_active ON marketplace_categories(is_active, template_count DESC);

-- Wedding-specific marketplace analytics
CREATE TABLE IF NOT EXISTS marketplace_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL, -- 'view', 'click', 'purchase', 'install', 'review'
  template_id UUID REFERENCES marketplace_templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  
  -- Event details
  event_data JSONB DEFAULT '{}',
  conversion_funnel_step VARCHAR(50), -- For tracking conversion paths
  
  -- Wedding business context
  user_vendor_type VARCHAR(50),
  user_tier VARCHAR(20),
  user_typical_wedding_budget VARCHAR(50),
  seasonal_context VARCHAR(20), -- 'peak', 'shoulder', 'off_season'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for marketplace analytics
CREATE INDEX idx_marketplace_analytics_template ON marketplace_analytics_events(template_id, event_type, created_at DESC);
CREATE INDEX idx_marketplace_analytics_user ON marketplace_analytics_events(user_id, created_at DESC);
CREATE INDEX idx_marketplace_analytics_funnel ON marketplace_analytics_events(template_id, conversion_funnel_step, created_at);

-- Functions for marketplace operations
CREATE OR REPLACE FUNCTION increment_template_installs(template_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE marketplace_templates 
  SET install_count = install_count + 1
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_template_views(template_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE marketplace_templates 
  SET view_count = view_count + 1
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update template ratings
CREATE OR REPLACE FUNCTION update_template_rating(template_id UUID)
RETURNS VOID AS $$
DECLARE
  new_average DECIMAL(3,2);
  new_count INTEGER;
BEGIN
  SELECT 
    COALESCE(AVG(rating), 0.00),
    COUNT(*)
  INTO new_average, new_count
  FROM marketplace_reviews
  WHERE template_id = template_id AND status = 'published';
  
  UPDATE marketplace_templates
  SET 
    average_rating = new_average,
    rating_count = new_count
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update search vector
CREATE OR REPLACE FUNCTION update_marketplace_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', 
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(array_to_string(NEW.tags, ' '), '') || ' ' ||
    COALESCE(NEW.category, '') || ' ' ||
    COALESCE(NEW.subcategory, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_marketplace_templates_search_vector
BEFORE INSERT OR UPDATE ON marketplace_templates
FOR EACH ROW
EXECUTE FUNCTION update_marketplace_search_vector();

-- Trigger to update template rating when review is added/updated
CREATE OR REPLACE FUNCTION trigger_update_template_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_template_rating(NEW.template_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_template_rating(OLD.template_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER marketplace_reviews_rating_update
AFTER INSERT OR UPDATE OR DELETE ON marketplace_reviews
FOR EACH ROW
EXECUTE FUNCTION trigger_update_template_rating();

-- Insert initial categories
INSERT INTO marketplace_categories (name, slug, description, icon_name, sort_order, is_active) VALUES
('Photography', 'photography', 'Client intake forms, contracts, workflow templates', 'camera', 1, true),
('Catering', 'catering', 'Menu planning, dietary requirements, service agreements', 'utensils', 2, true),
('Venues', 'venue', 'Booking forms, site visit questionnaires, contracts', 'building', 3, true),
('Planning', 'planning', 'Timelines, checklists, coordination templates', 'clipboard', 4, true),
('Florals', 'florals', 'Design briefs, order forms, delivery schedules', 'flower', 5, true),
('Music & DJ', 'music', 'Playlist requests, equipment checklists, contracts', 'music', 6, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample templates for development
INSERT INTO marketplace_templates (
  supplier_id, 
  title, 
  description, 
  template_type, 
  category, 
  subcategory, 
  price_cents, 
  currency, 
  minimum_tier, 
  template_data, 
  preview_data, 
  preview_images, 
  install_count, 
  average_rating, 
  rating_count, 
  status, 
  target_wedding_types, 
  target_price_range, 
  tags, 
  featured
) VALUES (
  (SELECT id FROM suppliers LIMIT 1), -- Use first supplier as sample creator
  'Luxury Photography Client Intake Suite',
  'Complete intake system that generates £340k+ annually with 73% conversion rate. Includes client questionnaire, style preferences, timeline coordination, and contract templates.',
  'form',
  'photography',
  'client_intake',
  4700,
  'GBP',
  'professional',
  '{"form_fields": [{"type": "text", "label": "Client Name"}, {"type": "email", "label": "Email"}]}',
  '{"fields_count": 24, "sections": ["Contact Info", "Wedding Details", "Style Preferences", "Timeline"]}',
  ARRAY['/api/placeholder/400/250', '/api/placeholder/400/251'],
  234,
  4.9,
  87,
  'active',
  ARRAY['luxury', 'destination'],
  '£10k-20k+',
  ARRAY['high-conversion', 'luxury', 'client-intake'],
  true
);

-- Enable RLS
ALTER TABLE marketplace_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketplace templates (public read, creator write)
CREATE POLICY "Templates are viewable by everyone" ON marketplace_templates
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can create their own templates" ON marketplace_templates
  FOR INSERT WITH CHECK (auth.uid()::text = supplier_id::text);

CREATE POLICY "Users can update their own templates" ON marketplace_templates
  FOR UPDATE USING (auth.uid()::text = supplier_id::text);

-- RLS Policies for purchases (buyer and seller access)
CREATE POLICY "Users can view their purchases" ON marketplace_purchases
  FOR SELECT USING (
    auth.uid()::text = buyer_id::text OR 
    auth.uid()::text = seller_id::text
  );

CREATE POLICY "Users can create purchases" ON marketplace_purchases
  FOR INSERT WITH CHECK (auth.uid()::text = buyer_id::text);

-- RLS Policies for reviews (public read, buyer write)
CREATE POLICY "Reviews are viewable by everyone" ON marketplace_reviews
  FOR SELECT USING (status = 'published');

CREATE POLICY "Buyers can create reviews" ON marketplace_reviews
  FOR INSERT WITH CHECK (
    auth.uid()::text = reviewer_id::text AND
    EXISTS (
      SELECT 1 FROM marketplace_purchases 
      WHERE id = purchase_id AND buyer_id = reviewer_id::text AND payment_status = 'completed'
    )
  );

-- RLS Policies for categories (public read)
CREATE POLICY "Categories are viewable by everyone" ON marketplace_categories
  FOR SELECT USING (is_active = true);

-- RLS Policies for analytics (own data only)
CREATE POLICY "Users can view their own analytics" ON marketplace_analytics_events
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create analytics events" ON marketplace_analytics_events
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Performance optimization: Create materialized view for marketplace summary
CREATE MATERIALIZED VIEW IF NOT EXISTS marketplace_summary AS
SELECT 
  mt.category,
  COUNT(*) as template_count,
  AVG(mt.price_cents) as avg_price_cents,
  SUM(mt.install_count) as total_installs,
  AVG(mt.average_rating) as category_rating
FROM marketplace_templates mt
WHERE mt.status = 'active'
GROUP BY mt.category;

CREATE INDEX idx_marketplace_summary_category ON marketplace_summary(category);

-- Refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_marketplace_summary()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY marketplace_summary;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON marketplace_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON marketplace_purchases TO authenticated;
GRANT SELECT, INSERT, UPDATE ON marketplace_reviews TO authenticated;
GRANT SELECT ON marketplace_categories TO authenticated;
GRANT SELECT, INSERT ON marketplace_analytics_events TO authenticated;
GRANT SELECT ON marketplace_summary TO authenticated;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;