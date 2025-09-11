-- WS-129: AI-Powered Floral Arrangement and Recommendation System
-- Comprehensive flower database with AI recommendations, seasonal tracking, and budget optimization

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Flower Database Tables

-- Core flower types and varieties
CREATE TABLE IF NOT EXISTS flowers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Basic Information
  common_name VARCHAR(100) NOT NULL,
  scientific_name VARCHAR(150),
  family VARCHAR(100),
  variety VARCHAR(100),
  
  -- Appearance
  primary_colors TEXT[] NOT NULL, -- ['white', 'pink', 'red', 'yellow', 'purple', 'orange', 'blue', 'green']
  secondary_colors TEXT[],
  size_category VARCHAR(20) NOT NULL, -- 'small', 'medium', 'large', 'extra_large'
  shape_category VARCHAR(30) NOT NULL, -- 'round', 'spike', 'spray', 'trumpet', 'star', 'bell'
  texture VARCHAR(30), -- 'smooth', 'ruffled', 'velvety', 'waxy', 'papery'
  fragrance_level INTEGER DEFAULT 0, -- 0-5 scale, 0=no fragrance, 5=very strong
  
  -- Seasonal Availability
  peak_season_start INTEGER NOT NULL, -- Month number (1-12)
  peak_season_end INTEGER NOT NULL,
  available_months INTEGER[] NOT NULL, -- Array of month numbers when available
  greenhouse_available BOOLEAN DEFAULT true,
  
  -- Growing Conditions
  growing_zones TEXT[], -- USDA hardiness zones
  difficulty_level VARCHAR(20) DEFAULT 'medium', -- 'easy', 'medium', 'difficult'
  
  -- Cost Information
  base_cost_per_stem DECIMAL(8, 2),
  seasonal_cost_multiplier DECIMAL(4, 2) DEFAULT 1.0,
  luxury_tier BOOLEAN DEFAULT false,
  
  -- Wedding Suitability
  bridal_bouquet_suitable BOOLEAN DEFAULT true,
  bridesmaid_bouquet_suitable BOOLEAN DEFAULT true,
  boutonniere_suitable BOOLEAN DEFAULT true,
  centerpiece_suitable BOOLEAN DEFAULT true,
  ceremony_decor_suitable BOOLEAN DEFAULT true,
  
  -- Style Associations
  style_tags TEXT[], -- ['romantic', 'rustic', 'modern', 'vintage', 'bohemian', 'classic', 'garden', 'tropical']
  theme_compatibility TEXT[], -- ['spring', 'summer', 'fall', 'winter', 'beach', 'garden', 'city', 'countryside']
  
  -- Care Instructions
  vase_life_days INTEGER, -- How long they last in arrangements
  requires_conditioning BOOLEAN DEFAULT false,
  care_instructions TEXT,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Arrangement Templates (AI-generated and curated)
CREATE TABLE IF NOT EXISTS floral_arrangement_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Template Information
  name VARCHAR(100) NOT NULL,
  description TEXT,
  arrangement_type VARCHAR(50) NOT NULL, -- 'bridal_bouquet', 'bridesmaid_bouquet', 'boutonniere', 'centerpiece', 'ceremony_arch', 'aisle_arrangements'
  
  -- Style & Theme
  style_category VARCHAR(30) NOT NULL, -- 'romantic', 'rustic', 'modern', 'vintage', 'bohemian', 'classic'
  season VARCHAR(20), -- 'spring', 'summer', 'fall', 'winter', 'any'
  color_scheme JSONB NOT NULL, -- {"primary": ["white", "blush"], "accent": ["green"], "notes": "soft romantic palette"}
  
  -- Composition
  focal_flowers TEXT[] NOT NULL, -- Primary flowers (20-30% of arrangement)
  secondary_flowers TEXT[], -- Supporting flowers (40-50%)
  filler_flowers TEXT[], -- Texture and volume (20-30%)
  greenery TEXT[], -- Foliage and greenery
  
  -- Sizing & Pricing
  estimated_stem_count JSONB, -- {"roses": 12, "eucalyptus": 8, "baby_breath": 6}
  size_category VARCHAR(20) NOT NULL, -- 'petite', 'standard', 'large', 'oversized'
  estimated_cost_range JSONB, -- {"min": 85.00, "max": 150.00, "currency": "USD"}
  labor_difficulty VARCHAR(20) DEFAULT 'medium', -- 'easy', 'medium', 'complex', 'expert'
  
  -- AI Metadata
  ai_generated BOOLEAN DEFAULT false,
  ai_confidence_score DECIMAL(4, 3), -- 0.000-1.000
  user_rating DECIMAL(3, 2), -- Average user rating 1.00-5.00
  usage_count INTEGER DEFAULT 0,
  
  -- Seasonal Adjustments
  seasonal_substitutions JSONB, -- Alternative flowers by season
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id)
);

-- Seasonal Flower Availability Calendar
CREATE TABLE IF NOT EXISTS seasonal_flower_availability (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  flower_id UUID REFERENCES flowers(id) ON DELETE CASCADE,
  
  -- Geographic Region
  region VARCHAR(50) NOT NULL, -- 'northeast', 'southeast', 'midwest', 'southwest', 'west', 'northwest'
  country_code VARCHAR(3) DEFAULT 'USA',
  
  -- Availability Windows
  month INTEGER NOT NULL, -- 1-12
  week_in_month INTEGER, -- 1-4, NULL for entire month
  availability_status VARCHAR(20) NOT NULL, -- 'peak', 'available', 'limited', 'unavailable'
  
  -- Cost Factors
  cost_multiplier DECIMAL(4, 2) DEFAULT 1.0,
  import_required BOOLEAN DEFAULT false,
  local_greenhouse_available BOOLEAN DEFAULT false,
  
  -- Quality Factors
  quality_rating INTEGER DEFAULT 5, -- 1-5 scale
  notes TEXT,
  
  -- Updates
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(flower_id, region, month, week_in_month)
);

-- Wedding Theme Profiles (AI-driven style matching)
CREATE TABLE IF NOT EXISTS wedding_theme_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Theme Information
  theme_name VARCHAR(100) NOT NULL,
  style_category VARCHAR(30) NOT NULL,
  season_preference VARCHAR(20),
  
  -- Color Palette
  primary_colors TEXT[] NOT NULL,
  secondary_colors TEXT[],
  accent_colors TEXT[],
  avoid_colors TEXT[],
  
  -- Floral Preferences
  preferred_flower_families TEXT[], -- ['roses', 'peonies', 'wildflowers', 'tropicals']
  avoided_flower_types TEXT[],
  texture_preferences TEXT[], -- ['soft', 'structured', 'wild', 'garden']
  
  -- Style Characteristics
  formality_level VARCHAR(20) NOT NULL, -- 'casual', 'semi_formal', 'formal', 'black_tie'
  arrangement_style VARCHAR(30) NOT NULL, -- 'loose_garden', 'structured_formal', 'cascading', 'compact_round'
  
  -- Budget Considerations
  budget_tier VARCHAR(20) NOT NULL, -- 'economy', 'standard', 'premium', 'luxury'
  cost_per_arrangement_range JSONB, -- Price guidance for different arrangement types
  
  -- Metadata
  popularity_score DECIMAL(4, 3) DEFAULT 0.500,
  is_trending BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client Floral Preferences (linked to clients table)
CREATE TABLE IF NOT EXISTS client_floral_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Wedding Details
  wedding_season VARCHAR(20),
  wedding_style VARCHAR(30),
  venue_type VARCHAR(50),
  guest_count INTEGER,
  
  -- Color Preferences
  preferred_colors TEXT[],
  avoid_colors TEXT[],
  color_inspiration_images TEXT[], -- URLs to inspiration images
  
  -- Floral Preferences
  favorite_flowers TEXT[],
  disliked_flowers TEXT[],
  allergies TEXT[],
  fragrance_sensitivity BOOLEAN DEFAULT false,
  
  -- Budget
  total_floral_budget DECIMAL(10, 2),
  budget_breakdown JSONB, -- Allocation per arrangement type
  budget_flexibility VARCHAR(20) DEFAULT 'moderate', -- 'strict', 'moderate', 'flexible'
  
  -- Requirements
  must_have_arrangements TEXT[] NOT NULL, -- ['bridal_bouquet', 'bridesmaid_bouquets', 'centerpieces']
  arrangement_quantities JSONB, -- Specific quantities for each type
  
  -- AI Recommendations
  ai_recommendations JSONB, -- Cached AI-generated recommendations
  last_recommendation_generated TIMESTAMP WITH TIME ZONE,
  recommendation_feedback JSONB, -- User feedback on recommendations
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor Floral Specialties (extends suppliers table)
CREATE TABLE IF NOT EXISTS vendor_floral_specialties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Specialization
  specialty_types TEXT[] NOT NULL, -- ['bridal_bouquets', 'centerpieces', 'ceremony_decor', 'exotic_flowers']
  signature_styles TEXT[], -- Florist's signature styles
  featured_flowers TEXT[], -- Flowers this vendor specializes in
  
  -- Capabilities
  custom_arrangements BOOLEAN DEFAULT true,
  delivery_available BOOLEAN DEFAULT true,
  setup_services BOOLEAN DEFAULT false,
  consultation_available BOOLEAN DEFAULT true,
  
  -- Inventory & Sourcing
  local_flower_sources TEXT[], -- Local farms and suppliers
  international_sourcing BOOLEAN DEFAULT false,
  greenhouse_partnership BOOLEAN DEFAULT false,
  seasonal_specialty BOOLEAN DEFAULT false,
  
  -- Portfolio
  portfolio_arrangements JSONB, -- Array of arrangement examples with images
  style_portfolio JSONB, -- Examples categorized by style
  
  -- Pricing Structure
  pricing_model VARCHAR(30) DEFAULT 'per_arrangement', -- 'per_arrangement', 'per_stem', 'package_deal'
  minimum_order_value DECIMAL(8, 2),
  rush_order_available BOOLEAN DEFAULT false,
  rush_order_fee_percentage DECIMAL(5, 2),
  
  -- Service Area
  delivery_radius_miles INTEGER DEFAULT 25,
  setup_radius_miles INTEGER DEFAULT 15,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Recommendation History and Learning
CREATE TABLE IF NOT EXISTS floral_ai_recommendations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Recommendation Context
  recommendation_type VARCHAR(50) NOT NULL, -- 'initial', 'budget_optimized', 'seasonal_alternative', 'style_refined'
  wedding_date DATE,
  wedding_style VARCHAR(30),
  season VARCHAR(20),
  
  -- Input Parameters
  budget_total DECIMAL(10, 2),
  preferred_colors TEXT[],
  arrangement_requirements JSONB,
  
  -- AI Output
  recommended_arrangements JSONB NOT NULL, -- Complete arrangement recommendations
  confidence_scores JSONB, -- Confidence per recommendation
  reasoning JSONB, -- AI reasoning and explanation
  
  -- Alternative Options
  budget_alternatives JSONB, -- Lower cost options
  premium_alternatives JSONB, -- Higher end options
  seasonal_alternatives JSONB, -- In-season alternatives
  
  -- User Interaction
  user_feedback VARCHAR(20), -- 'loved', 'liked', 'neutral', 'disliked', 'rejected'
  feedback_details JSONB,
  selected_arrangements JSONB, -- Which arrangements were actually chosen
  
  -- Learning Data
  conversion_rate DECIMAL(5, 4), -- How often recommendations are accepted
  accuracy_score DECIMAL(4, 3), -- Post-wedding feedback accuracy
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comprehensive indexes for performance
CREATE INDEX IF NOT EXISTS idx_flowers_colors ON flowers USING GIN(primary_colors);
CREATE INDEX IF NOT EXISTS idx_flowers_season ON flowers(peak_season_start, peak_season_end);
CREATE INDEX IF NOT EXISTS idx_flowers_cost ON flowers(base_cost_per_stem);
CREATE INDEX IF NOT EXISTS idx_flowers_style_tags ON flowers USING GIN(style_tags);
CREATE INDEX IF NOT EXISTS idx_flowers_theme_compatibility ON flowers USING GIN(theme_compatibility);

CREATE INDEX IF NOT EXISTS idx_arrangement_templates_type ON floral_arrangement_templates(arrangement_type);
CREATE INDEX IF NOT EXISTS idx_arrangement_templates_style ON floral_arrangement_templates(style_category);
CREATE INDEX IF NOT EXISTS idx_arrangement_templates_season ON floral_arrangement_templates(season);
CREATE INDEX IF NOT EXISTS idx_arrangement_templates_ai ON floral_arrangement_templates(ai_generated, ai_confidence_score);

CREATE INDEX IF NOT EXISTS idx_seasonal_availability_flower ON seasonal_flower_availability(flower_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_availability_region_month ON seasonal_flower_availability(region, month);

CREATE INDEX IF NOT EXISTS idx_theme_profiles_style ON wedding_theme_profiles(style_category);
CREATE INDEX IF NOT EXISTS idx_theme_profiles_budget ON wedding_theme_profiles(budget_tier);

CREATE INDEX IF NOT EXISTS idx_client_floral_prefs_client ON client_floral_preferences(client_id);
CREATE INDEX IF NOT EXISTS idx_client_floral_prefs_org ON client_floral_preferences(organization_id);

CREATE INDEX IF NOT EXISTS idx_vendor_specialties_supplier ON vendor_floral_specialties(supplier_id);
CREATE INDEX IF NOT EXISTS idx_vendor_specialties_types ON vendor_floral_specialties USING GIN(specialty_types);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_client ON floral_ai_recommendations(client_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_date ON floral_ai_recommendations(created_at);

-- Enable Row Level Security
ALTER TABLE flowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE floral_arrangement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_flower_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_theme_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_floral_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_floral_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE floral_ai_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Flowers - Public read access for reference data
CREATE POLICY "flowers_public_read" ON flowers FOR SELECT USING (is_active = true);
CREATE POLICY "flowers_admin_all" ON flowers FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Arrangement Templates - Public read, authenticated create
CREATE POLICY "templates_public_read" ON floral_arrangement_templates FOR SELECT USING (true);
CREATE POLICY "templates_authenticated_create" ON floral_arrangement_templates FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "templates_creator_update" ON floral_arrangement_templates FOR UPDATE USING (created_by = auth.uid());

-- Seasonal Availability - Public read access
CREATE POLICY "seasonal_availability_public_read" ON seasonal_flower_availability FOR SELECT USING (true);
CREATE POLICY "seasonal_availability_admin_all" ON seasonal_flower_availability FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Theme Profiles - Public read access
CREATE POLICY "theme_profiles_public_read" ON wedding_theme_profiles FOR SELECT USING (true);
CREATE POLICY "theme_profiles_admin_all" ON wedding_theme_profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Client Preferences - Organization scoped
CREATE POLICY "client_floral_prefs_org_access" ON client_floral_preferences FOR ALL USING (
  organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
);

-- Vendor Specialties - Organization scoped
CREATE POLICY "vendor_specialties_org_access" ON vendor_floral_specialties FOR ALL USING (
  supplier_id IN (
    SELECT id FROM suppliers WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
);

-- AI Recommendations - Organization scoped
CREATE POLICY "ai_recommendations_org_access" ON floral_ai_recommendations FOR ALL USING (
  organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
);

-- Insert Popular Flower Data
INSERT INTO flowers (common_name, scientific_name, family, primary_colors, secondary_colors, size_category, shape_category, texture, fragrance_level, peak_season_start, peak_season_end, available_months, base_cost_per_stem, bridal_bouquet_suitable, bridesmaid_bouquet_suitable, boutonniere_suitable, centerpiece_suitable, ceremony_decor_suitable, style_tags, theme_compatibility, vase_life_days) VALUES

-- Roses
('Garden Rose', 'Rosa gallica', 'Rosaceae', ARRAY['white', 'pink', 'red', 'yellow', 'purple'], ARRAY['cream', 'peach', 'coral'], 'medium', 'round', 'velvety', 4, 5, 10, ARRAY[1,2,3,4,5,6,7,8,9,10,11,12], 3.50, true, true, true, true, true, ARRAY['romantic', 'classic', 'vintage', 'garden'], ARRAY['spring', 'summer', 'fall', 'winter', 'garden', 'countryside'], 7),

('Spray Rose', 'Rosa multiflora', 'Rosaceae', ARRAY['white', 'pink', 'yellow', 'red'], ARRAY['cream', 'peach'], 'small', 'round', 'smooth', 3, 4, 11, ARRAY[1,2,3,4,5,6,7,8,9,10,11,12], 2.25, true, true, true, true, true, ARRAY['romantic', 'classic', 'rustic'], ARRAY['spring', 'summer', 'fall', 'winter'], 5),

-- Peonies
('Peony', 'Paeonia lactiflora', 'Paeoniaceae', ARRAY['white', 'pink', 'red'], ARRAY['coral', 'cream'], 'large', 'round', 'ruffled', 5, 4, 6, ARRAY[4,5,6], 8.50, true, true, false, true, true, ARRAY['romantic', 'garden', 'vintage', 'bohemian'], ARRAY['spring', 'summer', 'garden'], 5),

-- Hydrangeas
('Hydrangea', 'Hydrangea macrophylla', 'Hydrangeaceae', ARRAY['white', 'blue', 'pink', 'purple'], ARRAY['green', 'cream'], 'large', 'round', 'papery', 1, 6, 9, ARRAY[6,7,8,9], 4.75, false, true, false, true, true, ARRAY['rustic', 'garden', 'vintage'], ARRAY['summer', 'fall', 'garden', 'countryside'], 8),

-- Eucalyptus (Greenery)
('Silver Dollar Eucalyptus', 'Eucalyptus cinerea', 'Myrtaceae', ARRAY['green'], ARRAY['silver', 'gray'], 'medium', 'round', 'waxy', 3, 1, 12, ARRAY[1,2,3,4,5,6,7,8,9,10,11,12], 2.00, true, true, true, true, true, ARRAY['modern', 'rustic', 'bohemian'], ARRAY['spring', 'summer', 'fall', 'winter'], 14),

-- Baby's Breath
('Baby''s Breath', 'Gypsophila paniculata', 'Caryophyllaceae', ARRAY['white'], ARRAY['pink'], 'small', 'spray', 'delicate', 1, 5, 9, ARRAY[1,2,3,4,5,6,7,8,9,10,11,12], 1.50, true, true, true, true, true, ARRAY['romantic', 'classic', 'vintage'], ARRAY['spring', 'summer', 'fall', 'winter'], 10),

-- Ranunculus
('Ranunculus', 'Ranunculus asiaticus', 'Ranunculaceae', ARRAY['white', 'pink', 'yellow', 'orange', 'red'], ARRAY['cream', 'peach'], 'medium', 'round', 'ruffled', 2, 2, 5, ARRAY[1,2,3,4,5], 3.25, true, true, true, true, true, ARRAY['romantic', 'vintage', 'garden'], ARRAY['spring', 'garden'], 6),

-- Sunflowers
('Sunflower', 'Helianthus annuus', 'Asteraceae', ARRAY['yellow'], ARRAY['orange', 'brown'], 'large', 'round', 'textured', 1, 7, 9, ARRAY[6,7,8,9], 2.75, false, true, false, true, true, ARRAY['rustic', 'bohemian', 'garden'], ARRAY['summer', 'fall', 'countryside'], 7),

-- Lavender
('Lavender', 'Lavandula angustifolia', 'Lamiaceae', ARRAY['purple'], ARRAY['blue'], 'small', 'spike', 'textured', 5, 6, 8, ARRAY[6,7,8], 3.00, false, true, true, true, true, ARRAY['rustic', 'bohemian', 'garden', 'vintage'], ARRAY['summer', 'garden', 'countryside'], 10),

-- Orchids
('Phalaenopsis Orchid', 'Phalaenopsis amabilis', 'Orchidaceae', ARRAY['white', 'pink', 'purple'], ARRAY['yellow', 'green'], 'medium', 'trumpet', 'waxy', 2, 1, 12, ARRAY[1,2,3,4,5,6,7,8,9,10,11,12], 12.00, true, true, true, true, true, ARRAY['modern', 'tropical', 'classic'], ARRAY['spring', 'summer', 'fall', 'winter', 'beach', 'city'], 14);

-- Insert Wedding Theme Profiles
INSERT INTO wedding_theme_profiles (theme_name, style_category, season_preference, primary_colors, secondary_colors, accent_colors, formality_level, arrangement_style, budget_tier, cost_per_arrangement_range, popularity_score) VALUES

('Romantic Garden', 'romantic', 'spring', ARRAY['white', 'blush'], ARRAY['pink', 'cream'], ARRAY['green'], 'semi_formal', 'loose_garden', 'standard', '{"bridal_bouquet": {"min": 120, "max": 200}, "bridesmaid_bouquet": {"min": 60, "max": 100}, "centerpiece": {"min": 85, "max": 150}}'::jsonb, 0.850),

('Rustic Chic', 'rustic', 'fall', ARRAY['cream', 'orange'], ARRAY['burgundy', 'brown'], ARRAY['gold'], 'casual', 'loose_garden', 'standard', '{"bridal_bouquet": {"min": 100, "max": 175}, "bridesmaid_bouquet": {"min": 50, "max": 85}, "centerpiece": {"min": 65, "max": 120}}'::jsonb, 0.780),

('Modern Minimalist', 'modern', 'any', ARRAY['white', 'green'], ARRAY['gray'], ARRAY['black'], 'formal', 'structured_formal', 'premium', '{"bridal_bouquet": {"min": 150, "max": 250}, "bridesmaid_bouquet": {"min": 75, "max": 125}, "centerpiece": {"min": 100, "max": 180}}'::jsonb, 0.720),

('Vintage Romance', 'vintage', 'summer', ARRAY['dusty_pink', 'cream'], ARRAY['mauve', 'sage'], ARRAY['gold'], 'semi_formal', 'cascading', 'premium', '{"bridal_bouquet": {"min": 140, "max": 220}, "bridesmaid_bouquet": {"min": 70, "max": 110}, "centerpiece": {"min": 90, "max": 160}}'::jsonb, 0.690),

('Bohemian Wildflower', 'bohemian', 'summer', ARRAY['wildflower_mix'], ARRAY['purple', 'yellow'], ARRAY['orange'], 'casual', 'loose_garden', 'economy', '{"bridal_bouquet": {"min": 80, "max": 140}, "bridesmaid_bouquet": {"min": 40, "max": 75}, "centerpiece": {"min": 50, "max": 95}}'::jsonb, 0.650);

-- Functions for AI Recommendations

-- Function to get seasonal flower recommendations
CREATE OR REPLACE FUNCTION get_seasonal_flower_recommendations(
  target_season VARCHAR(20),
  region VARCHAR(50) DEFAULT 'northeast',
  budget_tier VARCHAR(20) DEFAULT 'standard'
)
RETURNS TABLE (
  flower_id UUID,
  common_name VARCHAR,
  colors TEXT[],
  cost_per_stem DECIMAL,
  availability_score DECIMAL,
  style_compatibility TEXT[]
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.common_name,
    f.primary_colors,
    CASE 
      WHEN sfa.cost_multiplier IS NOT NULL THEN f.base_cost_per_stem * sfa.cost_multiplier
      ELSE f.base_cost_per_stem
    END as cost_per_stem,
    CASE 
      WHEN sfa.availability_status = 'peak' THEN 1.0
      WHEN sfa.availability_status = 'available' THEN 0.8
      WHEN sfa.availability_status = 'limited' THEN 0.5
      ELSE 0.2
    END as availability_score,
    f.style_tags
  FROM flowers f
  LEFT JOIN seasonal_flower_availability sfa ON f.id = sfa.flower_id 
    AND sfa.region = region
    AND EXTRACT(MONTH FROM CURRENT_DATE) = sfa.month
  WHERE f.is_active = true
    AND (target_season = 'any' OR target_season = ANY(f.theme_compatibility))
    AND CASE budget_tier
      WHEN 'economy' THEN f.base_cost_per_stem <= 4.00
      WHEN 'standard' THEN f.base_cost_per_stem <= 7.00
      WHEN 'premium' THEN f.base_cost_per_stem <= 12.00
      ELSE true
    END
  ORDER BY availability_score DESC, f.base_cost_per_stem ASC;
END;
$$;

-- Function to calculate arrangement cost estimate
CREATE OR REPLACE FUNCTION calculate_arrangement_cost(
  template_id UUID,
  region VARCHAR(50) DEFAULT 'northeast',
  wedding_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)
)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  template_data RECORD;
  cost_breakdown JSONB := '{}'::jsonb;
  total_cost DECIMAL := 0.00;
  flower_cost DECIMAL;
  stem_count INTEGER;
  flower_name TEXT;
BEGIN
  -- Get template data
  SELECT * INTO template_data 
  FROM floral_arrangement_templates 
  WHERE id = template_id;
  
  IF NOT FOUND THEN
    RETURN '{"error": "Template not found"}'::jsonb;
  END IF;
  
  -- Calculate costs for each flower type in the template
  FOR flower_name, stem_count IN 
    SELECT key, value::integer 
    FROM jsonb_each_text(template_data.estimated_stem_count)
  LOOP
    -- Get flower cost with seasonal adjustment
    SELECT 
      COALESCE(f.base_cost_per_stem * COALESCE(sfa.cost_multiplier, 1.0), f.base_cost_per_stem) 
    INTO flower_cost
    FROM flowers f
    LEFT JOIN seasonal_flower_availability sfa ON f.id = sfa.flower_id 
      AND sfa.region = region 
      AND sfa.month = wedding_month
    WHERE f.common_name ILIKE flower_name
    LIMIT 1;
    
    IF flower_cost IS NOT NULL THEN
      total_cost := total_cost + (flower_cost * stem_count);
      cost_breakdown := cost_breakdown || jsonb_build_object(
        flower_name, 
        jsonb_build_object(
          'stem_count', stem_count,
          'cost_per_stem', flower_cost,
          'total_cost', flower_cost * stem_count
        )
      );
    END IF;
  END LOOP;
  
  -- Add labor cost (typically 40-60% of material cost)
  total_cost := total_cost * 1.5;
  
  RETURN jsonb_build_object(
    'material_cost', total_cost / 1.5,
    'labor_cost', total_cost - (total_cost / 1.5),
    'total_cost', total_cost,
    'cost_breakdown', cost_breakdown,
    'calculated_at', NOW()
  );
END;
$$;

-- Function to generate AI recommendations (placeholder for AI integration)
CREATE OR REPLACE FUNCTION generate_floral_ai_recommendations(
  client_id_param UUID,
  wedding_style VARCHAR(30) DEFAULT NULL,
  budget_total DECIMAL(10, 2) DEFAULT NULL,
  preferred_colors TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  client_data RECORD;
  preferences_data RECORD;
  recommendations JSONB := '[]'::jsonb;
  arrangement_types TEXT[] := ARRAY['bridal_bouquet', 'bridesmaid_bouquet', 'centerpiece', 'ceremony_arch'];
  arrangement_type TEXT;
  template_rec RECORD;
BEGIN
  -- Get client information
  SELECT * INTO client_data FROM clients WHERE id = client_id_param;
  
  -- Get existing preferences if any
  SELECT * INTO preferences_data 
  FROM client_floral_preferences 
  WHERE client_id = client_id_param;
  
  -- Use provided parameters or fall back to stored preferences
  wedding_style := COALESCE(wedding_style, preferences_data.wedding_style, 'romantic');
  budget_total := COALESCE(budget_total, preferences_data.total_floral_budget, 800.00);
  
  IF array_length(preferred_colors, 1) IS NULL THEN
    preferred_colors := COALESCE(preferences_data.preferred_colors, ARRAY['white', 'pink']);
  END IF;
  
  -- Generate recommendations for each arrangement type
  FOREACH arrangement_type IN ARRAY arrangement_types
  LOOP
    -- Find matching templates
    SELECT 
      fat.id,
      fat.name,
      fat.description,
      fat.color_scheme,
      fat.estimated_cost_range,
      fat.ai_confidence_score
    INTO template_rec
    FROM floral_arrangement_templates fat
    WHERE fat.arrangement_type = arrangement_type
      AND fat.style_category = wedding_style
      AND (
        fat.color_scheme->>'primary' @> jsonb_build_array(preferred_colors[1])::jsonb
        OR preferred_colors && ARRAY(SELECT jsonb_array_elements_text(fat.color_scheme->'primary'))
      )
    ORDER BY fat.user_rating DESC, fat.usage_count DESC
    LIMIT 1;
    
    IF FOUND THEN
      recommendations := recommendations || jsonb_build_array(
        jsonb_build_object(
          'arrangement_type', arrangement_type,
          'template_id', template_rec.id,
          'template_name', template_rec.name,
          'description', template_rec.description,
          'color_scheme', template_rec.color_scheme,
          'estimated_cost', template_rec.estimated_cost_range,
          'confidence_score', COALESCE(template_rec.ai_confidence_score, 0.750),
          'reasoning', jsonb_build_object(
            'style_match', wedding_style,
            'color_match', preferred_colors,
            'budget_fit', budget_total
          )
        )
      );
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'client_id', client_id_param,
    'recommendations', recommendations,
    'total_estimated_cost', budget_total * 0.85, -- Leave 15% buffer
    'generated_at', NOW(),
    'parameters', jsonb_build_object(
      'style', wedding_style,
      'budget', budget_total,
      'colors', preferred_colors
    )
  );
END;
$$;

-- Update vendor categories to include floral subcategories
INSERT INTO vendor_categories (name, slug, parent_id, display_name, description, icon, sort_order, search_keywords) VALUES
  -- Floristry subcategories
  ('bridal-floristry', 'bridal-floristry', (SELECT id FROM vendor_categories WHERE slug = 'florist'), 'Bridal Floristry', 'Specialized bridal bouquet and floral design', 'flower', 1, ARRAY['bridal', 'bouquet', 'bride', 'wedding-day']),
  ('event-floristry', 'event-floristry', (SELECT id FROM vendor_categories WHERE slug = 'florist'), 'Event Floristry', 'Ceremony and reception floral arrangements', 'flower-2', 2, ARRAY['ceremony', 'reception', 'centerpieces', 'arrangements']),
  ('seasonal-floristry', 'seasonal-floristry', (SELECT id FROM vendor_categories WHERE slug = 'florist'), 'Seasonal Specialists', 'Seasonal flower specialists and local sourcing', 'leaf', 3, ARRAY['seasonal', 'local', 'fresh', 'garden']),
  ('luxury-floristry', 'luxury-floristry', (SELECT id FROM vendor_categories WHERE slug = 'florist'), 'Luxury Floristry', 'High-end luxury floral design services', 'crown', 4, ARRAY['luxury', 'premium', 'exclusive', 'designer'])
ON CONFLICT (slug) DO NOTHING;

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_floral_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all floral tables
CREATE TRIGGER update_flowers_updated_at BEFORE UPDATE ON flowers FOR EACH ROW EXECUTE FUNCTION update_floral_updated_at();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON floral_arrangement_templates FOR EACH ROW EXECUTE FUNCTION update_floral_updated_at();
CREATE TRIGGER update_client_prefs_updated_at BEFORE UPDATE ON client_floral_preferences FOR EACH ROW EXECUTE FUNCTION update_floral_updated_at();
CREATE TRIGGER update_vendor_specialties_updated_at BEFORE UPDATE ON vendor_floral_specialties FOR EACH ROW EXECUTE FUNCTION update_floral_updated_at();