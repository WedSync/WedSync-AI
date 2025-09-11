-- WS-116: Geographic Organization System for Directory
-- Comprehensive geographic hierarchy for location-based vendor discovery

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis" CASCADE;

-- Countries table
CREATE TABLE IF NOT EXISTS countries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code VARCHAR(2) UNIQUE NOT NULL, -- ISO 3166-1 alpha-2
  name VARCHAR(255) NOT NULL,
  name_long VARCHAR(255),
  continent VARCHAR(100),
  currency_code VARCHAR(3),
  phone_code VARCHAR(10),
  bounds GEOMETRY(POLYGON, 4326),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- States/Provinces table  
CREATE TABLE IF NOT EXISTS states (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
  code VARCHAR(10) NOT NULL, -- State/Province code
  name VARCHAR(255) NOT NULL,
  name_long VARCHAR(255),
  type VARCHAR(50) DEFAULT 'state', -- state, province, region, etc
  bounds GEOMETRY(POLYGON, 4326),
  centroid GEOMETRY(POINT, 4326),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(country_id, code)
);

-- Cities table
CREATE TABLE IF NOT EXISTS cities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
  state_id UUID REFERENCES states(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  ascii_name VARCHAR(255),
  alternate_names TEXT[], -- Array of alternate names
  location GEOMETRY(POINT, 4326) NOT NULL,
  population INTEGER,
  elevation INTEGER,
  timezone VARCHAR(100),
  feature_class VARCHAR(50), -- city, town, village, etc
  admin_level INTEGER DEFAULT 4, -- Administrative level
  postcode_prefixes TEXT[], -- Array of postcode prefixes for this city
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Regions/Districts table (sub-city areas)
CREATE TABLE IF NOT EXISTS regions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'region', -- district, borough, suburb, etc
  location GEOMETRY(POINT, 4326),
  bounds GEOMETRY(POLYGON, 4326),
  postcode_prefixes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Postcodes/ZIP codes table
CREATE TABLE IF NOT EXISTS postcodes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
  state_id UUID REFERENCES states(id) ON DELETE SET NULL,
  city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
  region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
  code VARCHAR(20) NOT NULL,
  formatted_code VARCHAR(20), -- Properly formatted version
  location GEOMETRY(POINT, 4326) NOT NULL,
  bounds GEOMETRY(POLYGON, 4326),
  area_km2 DECIMAL(10, 4),
  population INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(country_id, code)
);

-- Service areas for suppliers
CREATE TABLE IF NOT EXISTS supplier_service_areas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Geographic coverage
  service_type VARCHAR(50) DEFAULT 'radius', -- radius, polygon, regions, nationwide
  service_radius_km INTEGER,
  service_polygon GEOMETRY(POLYGON, 4326),
  nationwide_coverage BOOLEAN DEFAULT false,
  international_coverage BOOLEAN DEFAULT false,
  
  -- Specific location coverage
  countries UUID[] DEFAULT '{}', -- Array of country IDs
  states UUID[] DEFAULT '{}', -- Array of state IDs  
  cities UUID[] DEFAULT '{}', -- Array of city IDs
  regions UUID[] DEFAULT '{}', -- Array of region IDs
  postcodes UUID[] DEFAULT '{}', -- Array of postcode IDs
  
  -- Additional service details
  travel_time_max_minutes INTEGER, -- Maximum travel time from base location
  additional_travel_cost DECIMAL(10, 2) DEFAULT 0, -- Cost per mile/km for travel
  minimum_booking_value DECIMAL(10, 2), -- Minimum booking for this area
  
  -- Priority and preferences
  is_primary_area BOOLEAN DEFAULT false,
  priority_level INTEGER DEFAULT 1, -- 1 = highest priority
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Location-based search cache for performance
CREATE TABLE IF NOT EXISTS location_search_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Search parameters
  search_location GEOMETRY(POINT, 4326) NOT NULL,
  radius_km INTEGER NOT NULL,
  category VARCHAR(100),
  subcategories TEXT[],
  
  -- Cached results
  supplier_ids UUID[] NOT NULL,
  result_count INTEGER NOT NULL,
  average_distance_km DECIMAL(8, 2),
  
  -- Cache metadata
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Geographic search analytics
CREATE TABLE IF NOT EXISTS geographic_search_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Search details
  search_location GEOMETRY(POINT, 4326),
  search_address TEXT,
  radius_km INTEGER,
  category VARCHAR(100),
  
  -- Results
  results_found INTEGER,
  user_id UUID, -- References auth.users if available
  session_id VARCHAR(255),
  
  -- Performance metrics
  search_time_ms INTEGER,
  
  -- Geographic breakdown
  city_id UUID REFERENCES cities(id),
  state_id UUID REFERENCES states(id),
  country_id UUID REFERENCES countries(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Popular locations for wedding venues/services
CREATE TABLE IF NOT EXISTS wedding_location_hotspots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Location details
  name VARCHAR(255) NOT NULL,
  location GEOMETRY(POINT, 4326) NOT NULL,
  city_id UUID REFERENCES cities(id),
  state_id UUID REFERENCES states(id),
  country_id UUID REFERENCES countries(id),
  
  -- Wedding metrics
  weddings_per_year INTEGER DEFAULT 0,
  average_guest_count INTEGER,
  average_budget_range VARCHAR(50),
  peak_season_months INTEGER[], -- Array of months (1-12)
  
  -- Supplier availability
  total_suppliers INTEGER DEFAULT 0,
  suppliers_by_category JSONB DEFAULT '{}'::jsonb,
  average_booking_lead_time_days INTEGER,
  
  -- Demand metrics
  search_volume INTEGER DEFAULT 0,
  competition_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for optimal query performance
CREATE INDEX idx_countries_code ON countries(code);
CREATE INDEX idx_countries_name ON countries USING gin(name gin_trgm_ops);

CREATE INDEX idx_states_country_code ON states(country_id, code);
CREATE INDEX idx_states_name ON states USING gin(name gin_trgm_ops);
CREATE INDEX idx_states_bounds_gist ON states USING gist(bounds);
CREATE INDEX idx_states_centroid_gist ON states USING gist(centroid);

CREATE INDEX idx_cities_location_gist ON cities USING gist(location);
CREATE INDEX idx_cities_name ON cities USING gin(name gin_trgm_ops);
CREATE INDEX idx_cities_population ON cities(population DESC);
CREATE INDEX idx_cities_country_state ON cities(country_id, state_id);
CREATE INDEX idx_cities_postcodes ON cities USING gin(postcode_prefixes);

CREATE INDEX idx_regions_city ON regions(city_id);
CREATE INDEX idx_regions_location_gist ON regions USING gist(location);
CREATE INDEX idx_regions_bounds_gist ON regions USING gist(bounds);

CREATE INDEX idx_postcodes_code ON postcodes(country_id, code);
CREATE INDEX idx_postcodes_location_gist ON postcodes USING gist(location);
CREATE INDEX idx_postcodes_city ON postcodes(city_id);

CREATE INDEX idx_supplier_service_areas_supplier ON supplier_service_areas(supplier_id);
CREATE INDEX idx_supplier_service_areas_type ON supplier_service_areas(service_type);
CREATE INDEX idx_supplier_service_areas_polygon_gist ON supplier_service_areas USING gist(service_polygon);
CREATE INDEX idx_supplier_service_areas_radius ON supplier_service_areas(service_radius_km);
CREATE INDEX idx_supplier_service_areas_countries ON supplier_service_areas USING gin(countries);
CREATE INDEX idx_supplier_service_areas_cities ON supplier_service_areas USING gin(cities);

CREATE INDEX idx_location_search_cache_key ON location_search_cache(cache_key);
CREATE INDEX idx_location_search_cache_expires ON location_search_cache(expires_at);
CREATE INDEX idx_location_search_cache_location_gist ON location_search_cache USING gist(search_location);

CREATE INDEX idx_geographic_search_location_gist ON geographic_search_analytics USING gist(search_location);
CREATE INDEX idx_geographic_search_created ON geographic_search_analytics(created_at DESC);
CREATE INDEX idx_geographic_search_category ON geographic_search_analytics(category);

CREATE INDEX idx_wedding_hotspots_location_gist ON wedding_location_hotspots USING gist(location);
CREATE INDEX idx_wedding_hotspots_city ON wedding_location_hotspots(city_id);
CREATE INDEX idx_wedding_hotspots_weddings ON wedding_location_hotspots(weddings_per_year DESC);

-- Update suppliers table with foreign key relationships to geographic hierarchy
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES countries(id),
ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES states(id), 
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id),
ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id),
ADD COLUMN IF NOT EXISTS postcode_id UUID REFERENCES postcodes(id);

-- Create indexes on new supplier geographic foreign keys
CREATE INDEX IF NOT EXISTS idx_suppliers_location_gist ON suppliers USING gist(ST_MakePoint(longitude, latitude));
CREATE INDEX IF NOT EXISTS idx_suppliers_service_radius ON suppliers(service_radius_miles);
CREATE INDEX IF NOT EXISTS idx_suppliers_country ON suppliers(country_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_state ON suppliers(state_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_city ON suppliers(city_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_postcode ON suppliers(postcode_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_category_location ON suppliers(primary_category, city_id);

-- Insert initial data for UK (default country)
INSERT INTO countries (code, name, name_long, continent, currency_code, phone_code) 
VALUES ('GB', 'United Kingdom', 'United Kingdom of Great Britain and Northern Ireland', 'Europe', 'GBP', '+44')
ON CONFLICT (code) DO NOTHING;

-- Function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance_km(lat1 DECIMAL, lng1 DECIMAL, lat2 DECIMAL, lng2 DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
  RETURN ST_Distance(
    ST_SetSRID(ST_MakePoint(lng1, lat1), 4326)::geography,
    ST_SetSRID(ST_MakePoint(lng2, lat2), 4326)::geography
  ) / 1000; -- Convert to kilometers
END;
$$ LANGUAGE plpgsql;

-- Function to find suppliers within radius of location
CREATE OR REPLACE FUNCTION find_suppliers_in_radius(
  search_lat DECIMAL,
  search_lng DECIMAL, 
  radius_km INTEGER DEFAULT 50,
  category TEXT DEFAULT NULL
)
RETURNS TABLE(
  supplier_id UUID,
  business_name VARCHAR,
  distance_km DECIMAL,
  latitude DECIMAL,
  longitude DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as supplier_id,
    s.business_name,
    calculate_distance_km(search_lat, search_lng, s.latitude, s.longitude) as distance_km,
    s.latitude,
    s.longitude
  FROM suppliers s
  WHERE 
    s.latitude IS NOT NULL 
    AND s.longitude IS NOT NULL
    AND s.is_published = true
    AND calculate_distance_km(search_lat, search_lng, s.latitude, s.longitude) <= radius_km
    AND (category IS NULL OR s.primary_category = category)
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to check if supplier serves location
CREATE OR REPLACE FUNCTION supplier_serves_location(
  p_supplier_id UUID,
  p_lat DECIMAL,
  p_lng DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
  service_area RECORD;
  location_point GEOMETRY;
BEGIN
  -- Create point from coordinates
  location_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
  
  -- Check all service areas for this supplier
  FOR service_area IN 
    SELECT * FROM supplier_service_areas 
    WHERE supplier_id = p_supplier_id 
  LOOP
    -- Check nationwide coverage
    IF service_area.nationwide_coverage THEN
      RETURN TRUE;
    END IF;
    
    -- Check radius coverage
    IF service_area.service_type = 'radius' AND service_area.service_radius_km IS NOT NULL THEN
      -- Get supplier location
      DECLARE supplier_location GEOMETRY;
      BEGIN
        SELECT ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) 
        INTO supplier_location 
        FROM suppliers 
        WHERE id = p_supplier_id;
        
        IF ST_DWithin(supplier_location::geography, location_point::geography, service_area.service_radius_km * 1000) THEN
          RETURN TRUE;
        END IF;
      END;
    END IF;
    
    -- Check polygon coverage
    IF service_area.service_type = 'polygon' AND service_area.service_polygon IS NOT NULL THEN
      IF ST_Contains(service_area.service_polygon, location_point) THEN
        RETURN TRUE;
      END IF;
    END IF;
  END LOOP;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update supplier geographic relationships when location changes
CREATE OR REPLACE FUNCTION update_supplier_geographic_relationships()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if latitude and longitude are set
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    -- Find matching postcode first (most specific)
    SELECT id INTO NEW.postcode_id
    FROM postcodes p
    WHERE ST_DWithin(
      p.location::geography,
      ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography,
      1000 -- Within 1km of postcode center
    )
    ORDER BY ST_Distance(
      p.location::geography,
      ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography
    )
    LIMIT 1;
    
    -- Find matching city
    SELECT c.id, c.state_id, c.country_id 
    INTO NEW.city_id, NEW.state_id, NEW.country_id
    FROM cities c
    WHERE ST_DWithin(
      c.location::geography,
      ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography,
      25000 -- Within 25km of city center
    )
    ORDER BY ST_Distance(
      c.location::geography,
      ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography
    )
    LIMIT 1;
    
    -- If no city found, try to match by state bounds
    IF NEW.state_id IS NULL THEN
      SELECT s.id, s.country_id
      INTO NEW.state_id, NEW.country_id
      FROM states s
      WHERE s.bounds IS NOT NULL 
        AND ST_Contains(s.bounds, ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326))
      LIMIT 1;
    END IF;
    
    -- If still no country, default to UK for now
    IF NEW.country_id IS NULL THEN
      SELECT id INTO NEW.country_id FROM countries WHERE code = 'GB';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on suppliers table
DROP TRIGGER IF EXISTS trg_supplier_geographic_update ON suppliers;
CREATE TRIGGER trg_supplier_geographic_update
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_geographic_relationships();

-- Add RLS policies for geographic tables
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE postcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_location_hotspots ENABLE ROW LEVEL SECURITY;

-- Public read access for geographic reference data
CREATE POLICY "Geographic data public read" ON countries FOR SELECT USING (true);
CREATE POLICY "Geographic data public read" ON states FOR SELECT USING (true);
CREATE POLICY "Geographic data public read" ON cities FOR SELECT USING (true);
CREATE POLICY "Geographic data public read" ON regions FOR SELECT USING (true);
CREATE POLICY "Geographic data public read" ON postcodes FOR SELECT USING (true);
CREATE POLICY "Wedding hotspots public read" ON wedding_location_hotspots FOR SELECT USING (true);

-- Supplier service areas - suppliers can manage their own
CREATE POLICY "Supplier service areas owner access" ON supplier_service_areas
FOR ALL USING (
  supplier_id IN (
    SELECT id FROM suppliers WHERE organization_id = auth.jwt() ->> 'organization_id'
  )
);

-- Public read access for published supplier service areas
CREATE POLICY "Supplier service areas public read" ON supplier_service_areas
FOR SELECT USING (
  supplier_id IN (
    SELECT id FROM suppliers WHERE is_published = true
  )
);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all geographic tables
CREATE TRIGGER set_timestamp_countries BEFORE UPDATE ON countries FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_states BEFORE UPDATE ON states FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_cities BEFORE UPDATE ON cities FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_regions BEFORE UPDATE ON regions FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_postcodes BEFORE UPDATE ON postcodes FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_supplier_service_areas BEFORE UPDATE ON supplier_service_areas FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_wedding_hotspots BEFORE UPDATE ON wedding_location_hotspots FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();