# WS-116: Directory Geographic Hierarchy - Technical Specification

## Feature Overview
A comprehensive geographic organization system for the wedding supplier directory, enabling location-based search, regional targeting, and hierarchical geographic management from country down to service radius level.

## User Stories

### Couples - Location-Based Vendor Discovery
**As a couple planning a wedding**, I want to find vendors who serve my specific location so I can book local services for our wedding day.

**Scenario**: Sarah and Michael are planning a wedding in Sonoma County, California, and need to find vendors who serve their specific area.

**User Journey**:
1. Sarah enters "Healdsburg, CA" as their wedding location
2. System shows vendors within 25-mile radius of Healdsburg
3. She filters by "Napa Valley region" to include wine country specialists
4. Views vendor profiles showing exact service areas and travel fees
5. Finds photographer who specializes in vineyard weddings and serves Sonoma/Napa
6. Books consultation knowing vendor is familiar with local venues and regulations

### Wedding Vendor - Service Area Management
**As a wedding photographer**, I want to define my service areas precisely so couples in my region can find me and I don't get inquiries from areas I don't serve.

**Scenario**: John, a wedding photographer based in Austin, wants to clearly define his service radius and preferred locations.

**User Journey**:
1. John accesses profile settings and navigates to Service Areas
2. Sets primary location: Austin, Texas
3. Defines 50-mile service radius around Austin (no travel fee)
4. Adds premium service areas: Houston (2-hour drive, $300 travel fee)
5. Sets exclusions: "Does not travel outside Texas"
6. System automatically categorizes him under Texas > Central Texas > Austin Metro
7. Profile appears in searches for Austin, Round Rock, Cedar Park, San Marcos
8. Receives qualified inquiries only from his defined service areas

## Database Schema

### Geographic Hierarchy Tables

```sql
-- Countries table
CREATE TABLE geographic_countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    iso_code_2 CHAR(2) NOT NULL UNIQUE, -- US, CA, UK, etc.
    iso_code_3 CHAR(3) NOT NULL UNIQUE, -- USA, CAN, GBR, etc.
    calling_code VARCHAR(10), -- +1, +44, etc.
    currency_code CHAR(3), -- USD, CAD, GBP, etc.
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- States/Provinces table
CREATE TABLE geographic_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID REFERENCES geographic_countries(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL, -- CA, TX, ON, BC, etc.
    type VARCHAR(20) DEFAULT 'state', -- 'state', 'province', 'territory'
    is_active BOOLEAN DEFAULT TRUE,
    timezone_primary VARCHAR(50), -- America/Los_Angeles
    timezone_secondary VARCHAR(50), -- For states spanning multiple timezones
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(country_id, code)
);

-- Metro areas/regions (major cities and surrounding areas)
CREATE TABLE geographic_metro_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID REFERENCES geographic_states(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    type VARCHAR(20) DEFAULT 'metro', -- 'metro', 'region', 'county'
    population INTEGER,
    center_latitude DECIMAL(10, 8),
    center_longitude DECIMAL(11, 8),
    radius_miles INTEGER DEFAULT 25, -- Default search radius
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(state_id, slug)
);

-- Cities and towns
CREATE TABLE geographic_cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID REFERENCES geographic_states(id) ON DELETE CASCADE,
    metro_area_id UUID REFERENCES geographic_metro_areas(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    population INTEGER,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    zip_codes TEXT[], -- Array of served ZIP codes
    is_active BOOLEAN DEFAULT TRUE,
    is_popular BOOLEAN DEFAULT FALSE, -- For highlighting popular wedding destinations
    wedding_venue_count INTEGER DEFAULT 0,
    supplier_count INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(state_id, slug)
);

-- Supplier service areas (many-to-many with geographic locations)
CREATE TABLE supplier_service_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES supplier_profiles(id) ON DELETE CASCADE,
    geographic_type VARCHAR(20) NOT NULL, -- 'city', 'metro', 'state', 'country'
    geographic_id UUID NOT NULL, -- References city, metro, state, or country ID
    is_primary BOOLEAN DEFAULT FALSE, -- Primary business location
    service_radius_miles INTEGER DEFAULT 25,
    travel_fee DECIMAL(8, 2) DEFAULT 0,
    min_booking_amount DECIMAL(10, 2), -- Minimum booking for this area
    notes TEXT, -- Special conditions or restrictions
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(supplier_id, geographic_type, geographic_id)
);

-- Popular wedding destinations
CREATE TABLE wedding_destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id UUID REFERENCES geographic_cities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- Display name (may differ from city name)
    description TEXT,
    category VARCHAR(50), -- 'beach', 'mountain', 'wine-country', 'historic', 'urban'
    season_peak VARCHAR(20), -- 'spring', 'summer', 'fall', 'winter', 'year-round'
    avg_wedding_cost DECIMAL(10, 2),
    venue_count INTEGER DEFAULT 0,
    photo_url TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geographic search optimization
CREATE TABLE geographic_search_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geographic_id UUID NOT NULL, -- Can reference any geographic table
    geographic_type VARCHAR(20) NOT NULL, -- 'city', 'metro', 'state', 'country'
    search_term VARCHAR(100) NOT NULL,
    search_weight INTEGER DEFAULT 1, -- Higher weight = higher search priority
    is_official BOOLEAN DEFAULT FALSE, -- Official name vs. nickname/alternate
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(geographic_id, geographic_type, search_term)
);
```

### Indexes for Performance

```sql
-- Geographic hierarchy indexes
CREATE INDEX idx_geographic_states_country ON geographic_states(country_id);
CREATE INDEX idx_geographic_metro_areas_state ON geographic_metro_areas(state_id);
CREATE INDEX idx_geographic_cities_state ON geographic_cities(state_id);
CREATE INDEX idx_geographic_cities_metro ON geographic_cities(metro_area_id);

-- Location-based search indexes
CREATE INDEX idx_geographic_cities_location ON geographic_cities USING GIST(
    ll_to_earth(latitude, longitude)
);
CREATE INDEX idx_geographic_metro_areas_location ON geographic_metro_areas USING GIST(
    ll_to_earth(center_latitude, center_longitude)
);

-- Supplier service area indexes
CREATE INDEX idx_supplier_service_areas_supplier ON supplier_service_areas(supplier_id);
CREATE INDEX idx_supplier_service_areas_geographic ON supplier_service_areas(geographic_type, geographic_id);
CREATE INDEX idx_supplier_service_areas_active ON supplier_service_areas(is_active, geographic_type);

-- Search optimization indexes
CREATE INDEX idx_geographic_search_terms_term ON geographic_search_terms(search_term);
CREATE INDEX idx_geographic_search_terms_geographic ON geographic_search_terms(geographic_type, geographic_id);

-- Full-text search for location names
CREATE INDEX idx_geographic_cities_search ON geographic_cities USING gin(
    to_tsvector('english', name || ' ' || COALESCE(array_to_string(zip_codes, ' '), ''))
);
```

### Row Level Security

```sql
-- Geographic data is publicly readable
ALTER TABLE geographic_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic_metro_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic_cities ENABLE ROW LEVEL SECURITY;

-- Public read access for geographic data
CREATE POLICY geographic_public_read ON geographic_countries FOR SELECT USING (is_active = true);
CREATE POLICY geographic_states_public_read ON geographic_states FOR SELECT USING (is_active = true);
CREATE POLICY geographic_metro_public_read ON geographic_metro_areas FOR SELECT USING (is_active = true);
CREATE POLICY geographic_cities_public_read ON geographic_cities FOR SELECT USING (is_active = true);

-- Suppliers can manage their own service areas
ALTER TABLE supplier_service_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY supplier_service_areas_own_access ON supplier_service_areas
    FOR ALL USING (
        supplier_id IN (
            SELECT id FROM supplier_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Admin access for geographic management
CREATE POLICY geographic_admin_write ON geographic_countries
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    );
```

## API Endpoints

### Geographic Hierarchy Management

```typescript
// Get geographic hierarchy
GET /api/geography/hierarchy?country=US&include_counts=true
interface GeographicHierarchyResponse {
  countries: {
    id: string;
    name: string;
    iso_code_2: string;
    states: {
      id: string;
      name: string;
      code: string;
      metro_areas: {
        id: string;
        name: string;
        slug: string;
        supplier_count: number;
        cities: {
          id: string;
          name: string;
          slug: string;
          supplier_count: number;
          is_popular: boolean;
        }[];
      }[];
    }[];
  }[];
}

// Search locations with autocomplete
GET /api/geography/search?q=san+francisco&limit=10
interface LocationSearchResponse {
  results: {
    id: string;
    name: string;
    full_name: string; // "San Francisco, CA, US"
    type: 'city' | 'metro' | 'state' | 'country';
    latitude?: number;
    longitude?: number;
    supplier_count: number;
    venue_count?: number;
    parent_names: string[]; // ["California", "United States"]
  }[];
  suggestions: string[]; // Alternative search terms
}

// Get suppliers by location
GET /api/geography/suppliers?location_id=abc123&location_type=city&radius=25&category=photography
interface LocationSuppliersResponse {
  location: {
    id: string;
    name: string;
    type: string;
    latitude: number;
    longitude: number;
  };
  suppliers: {
    id: string;
    business_name: string;
    category: string;
    distance_miles: number;
    travel_fee: number;
    min_booking_amount: number;
    rating: number;
    review_count: number;
    portfolio_preview: string[];
  }[];
  total_count: number;
  search_radius: number;
}

// Manage supplier service areas
POST /api/suppliers/[id]/service-areas
interface CreateServiceAreaRequest {
  geographic_type: 'city' | 'metro' | 'state';
  geographic_id: string;
  is_primary?: boolean;
  service_radius_miles?: number;
  travel_fee?: number;
  min_booking_amount?: number;
  notes?: string;
}

// Get popular wedding destinations
GET /api/geography/destinations?category=wine-country&season=summer
interface WeddingDestinationsResponse {
  destinations: {
    id: string;
    name: string;
    city: string;
    state: string;
    category: string;
    description: string;
    season_peak: string;
    avg_wedding_cost: number;
    venue_count: number;
    supplier_count: number;
    photo_url: string;
    coordinates: [number, number]; // [lat, lng]
  }[];
  filters: {
    categories: string[];
    seasons: string[];
    cost_ranges: { min: number; max: number; label: string; }[];
  };
}

// Reverse geocoding for coordinates
POST /api/geography/reverse-geocode
interface ReverseGeocodeRequest {
  latitude: number;
  longitude: number;
  radius_miles?: number;
}

interface ReverseGeocodeResponse {
  city: {
    id: string;
    name: string;
    state: string;
    country: string;
  };
  metro_area?: {
    id: string;
    name: string;
  };
  nearby_destinations: {
    name: string;
    distance_miles: number;
    category: string;
  }[];
}
```

## React Components

### Location Search and Selection

```typescript
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Search, Star, Filter, ArrowRight } from 'lucide-react';
import { debounce } from 'lodash';

interface LocationSearchProps {
  onLocationSelect: (location: LocationResult) => void;
  placeholder?: string;
  showPopularDestinations?: boolean;
  filterBySupplierCount?: boolean;
}

export function LocationSearch({
  onLocationSelect,
  placeholder = "Enter city, state, or ZIP code",
  showPopularDestinations = true,
  filterBySupplierCount = false
}: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [popularDestinations, setPopularDestinations] = useState<WeddingDestination[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search function
  const debouncedSearch = debounce(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: '10'
      });
      
      if (filterBySupplierCount) {
        params.append('min_suppliers', '1');
      }

      const response = await fetch(`/api/geography/search?${params}`);
      const data: LocationSearchResponse = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error('Location search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, 300);

  useEffect(() => {
    debouncedSearch(query);
    return () => debouncedSearch.cancel();
  }, [query]);

  useEffect(() => {
    if (showPopularDestinations) {
      loadPopularDestinations();
    }
  }, [showPopularDestinations]);

  const loadPopularDestinations = async () => {
    try {
      const response = await fetch('/api/geography/destinations?featured=true&limit=8');
      const data: WeddingDestinationsResponse = await response.json();
      setPopularDestinations(data.destinations);
    } catch (error) {
      console.error('Failed to load popular destinations:', error);
    }
  };

  const handleLocationSelect = (location: LocationResult) => {
    setQuery(location.full_name);
    setShowResults(false);
    onLocationSelect(location);
  };

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder={placeholder}
          className="pl-10 pr-4"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (query.length >= 2 || showPopularDestinations) && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-96 overflow-y-auto">
          <CardContent className="p-2">
            {/* Search Results */}
            {results.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-medium text-gray-500 px-2 py-1 uppercase tracking-wide">
                  Search Results
                </div>
                {results.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleLocationSelect(result)}
                    className="w-full text-left px-2 py-2 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{result.name}</div>
                          <div className="text-sm text-gray-500">
                            {result.parent_names.join(', ')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">
                          {result.supplier_count} vendors
                        </div>
                        {result.venue_count && (
                          <div className="text-xs text-gray-400">
                            {result.venue_count} venues
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Popular Wedding Destinations */}
            {showPopularDestinations && popularDestinations.length > 0 && query.length < 2 && (
              <div>
                <div className="text-xs font-medium text-gray-500 px-2 py-1 uppercase tracking-wide flex items-center">
                  <Star className="w-3 h-3 mr-1" />
                  Popular Wedding Destinations
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {popularDestinations.map((destination) => (
                    <button
                      key={destination.id}
                      onClick={() => handleLocationSelect({
                        id: destination.id,
                        name: destination.name,
                        full_name: `${destination.name}, ${destination.state}`,
                        type: 'city' as const,
                        supplier_count: destination.supplier_count,
                        venue_count: destination.venue_count,
                        parent_names: [destination.state, 'United States']
                      })}
                      className="text-left px-2 py-2 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                            <Star className="w-3 h-3 text-white" />
                          </div>
                          <div>
                            <div className="font-medium">{destination.name}</div>
                            <div className="text-sm text-gray-500">
                              {destination.city}, {destination.state}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="text-xs">
                            {destination.category}
                          </Badge>
                          <div className="text-xs text-gray-500 mt-1">
                            {destination.venue_count} venues
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {query.length >= 2 && results.length === 0 && !loading && (
              <div className="text-center py-4 text-gray-500">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <div className="text-sm">No locations found for "{query}"</div>
                <div className="text-xs text-gray-400 mt-1">
                  Try searching for a city, state, or ZIP code
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Click outside to close */}
      {showResults && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
}

// Geographic Hierarchy Browser Component
interface GeographicBrowserProps {
  onLocationSelect: (location: LocationResult) => void;
  selectedCountry?: string;
  showSupplierCounts?: boolean;
}

export function GeographicBrowser({ 
  onLocationSelect, 
  selectedCountry = 'US',
  showSupplierCounts = true 
}: GeographicBrowserProps) {
  const [hierarchy, setHierarchy] = useState<GeographicHierarchyResponse | null>(null);
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
  const [expandedMetros, setExpandedMetros] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHierarchy();
  }, [selectedCountry]);

  const loadHierarchy = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        country: selectedCountry,
        include_counts: showSupplierCounts.toString()
      });
      
      const response = await fetch(`/api/geography/hierarchy?${params}`);
      const data: GeographicHierarchyResponse = await response.json();
      setHierarchy(data);
    } catch (error) {
      console.error('Failed to load geographic hierarchy:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStateExpansion = (stateId: string) => {
    const newExpanded = new Set(expandedStates);
    if (newExpanded.has(stateId)) {
      newExpanded.delete(stateId);
    } else {
      newExpanded.add(stateId);
    }
    setExpandedStates(newExpanded);
  };

  const toggleMetroExpansion = (metroId: string) => {
    const newExpanded = new Set(expandedMetros);
    if (newExpanded.has(metroId)) {
      newExpanded.delete(metroId);
    } else {
      newExpanded.add(metroId);
    }
    setExpandedMetros(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!hierarchy) return null;

  return (
    <div className="max-h-96 overflow-y-auto">
      {hierarchy.countries.map(country => (
        <div key={country.id} className="space-y-2">
          {country.states.map(state => (
            <div key={state.id}>
              {/* State Level */}
              <button
                onClick={() => toggleStateExpansion(state.id)}
                className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-md text-left"
              >
                <div className="flex items-center space-x-2">
                  <ArrowRight 
                    className={`w-4 h-4 transition-transform ${
                      expandedStates.has(state.id) ? 'rotate-90' : ''
                    }`} 
                  />
                  <span className="font-medium">{state.name}</span>
                </div>
                {showSupplierCounts && (
                  <Badge variant="outline" className="text-xs">
                    {state.metro_areas.reduce((sum, metro) => sum + metro.supplier_count, 0)} vendors
                  </Badge>
                )}
              </button>

              {/* Metro Areas */}
              {expandedStates.has(state.id) && (
                <div className="ml-6 space-y-1">
                  {state.metro_areas.map(metro => (
                    <div key={metro.id}>
                      <button
                        onClick={() => toggleMetroExpansion(metro.id)}
                        className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-md text-left"
                      >
                        <div className="flex items-center space-x-2">
                          <ArrowRight 
                            className={`w-3 h-3 transition-transform ${
                              expandedMetros.has(metro.id) ? 'rotate-90' : ''
                            }`} 
                          />
                          <span>{metro.name}</span>
                        </div>
                        {showSupplierCounts && (
                          <Badge variant="outline" className="text-xs">
                            {metro.supplier_count} vendors
                          </Badge>
                        )}
                      </button>

                      {/* Cities */}
                      {expandedMetros.has(metro.id) && (
                        <div className="ml-6 space-y-1">
                          {metro.cities.map(city => (
                            <button
                              key={city.id}
                              onClick={() => onLocationSelect({
                                id: city.id,
                                name: city.name,
                                full_name: `${city.name}, ${state.code}`,
                                type: 'city',
                                supplier_count: city.supplier_count,
                                parent_names: [state.name, country.name]
                              })}
                              className="w-full flex items-center justify-between p-2 pl-8 hover:bg-blue-50 rounded-md text-left group"
                            >
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-3 h-3 text-gray-400 group-hover:text-blue-500" />
                                <span className="group-hover:text-blue-600">{city.name}</span>
                                {city.is_popular && (
                                  <Star className="w-3 h-3 text-yellow-500" />
                                )}
                              </div>
                              {showSupplierCounts && (
                                <Badge 
                                  variant={city.supplier_count > 0 ? "default" : "secondary"} 
                                  className="text-xs"
                                >
                                  {city.supplier_count}
                                </Badge>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

## Integration Services

### Geographic Data Service

```typescript
// lib/services/geographic-service.ts
import { createClient } from '@supabase/supabase-js';

interface LocationDistance {
  location: LocationResult;
  distance_miles: number;
}

export class GeographicService {
  private supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

  async searchLocations(query: string, options: {
    limit?: number;
    minSuppliers?: number;
    types?: string[];
  } = {}): Promise<LocationSearchResponse> {
    const { limit = 10, minSuppliers, types } = options;
    
    let queryBuilder = this.supabase
      .from('geographic_cities')
      .select(`
        id,
        name,
        slug,
        latitude,
        longitude,
        supplier_count,
        wedding_venue_count,
        geographic_states!inner(name, code, geographic_countries!inner(name))
      `)
      .ilike('name', `%${query}%`)
      .eq('is_active', true)
      .order('supplier_count', { ascending: false })
      .limit(limit);

    if (minSuppliers) {
      queryBuilder = queryBuilder.gte('supplier_count', minSuppliers);
    }

    const { data: cities, error } = await queryBuilder;

    if (error) {
      console.error('Location search error:', error);
      return { results: [], suggestions: [] };
    }

    const results: LocationResult[] = (cities || []).map(city => ({
      id: city.id,
      name: city.name,
      full_name: `${city.name}, ${city.geographic_states.code}`,
      type: 'city',
      latitude: city.latitude,
      longitude: city.longitude,
      supplier_count: city.supplier_count,
      venue_count: city.wedding_venue_count,
      parent_names: [city.geographic_states.name, city.geographic_states.geographic_countries.name]
    }));

    // Generate search suggestions
    const suggestions = await this.generateSearchSuggestions(query);

    return { results, suggestions };
  }

  async getLocationHierarchy(countryCode: string = 'US'): Promise<GeographicHierarchyResponse> {
    const { data, error } = await this.supabase
      .from('geographic_countries')
      .select(`
        id,
        name,
        iso_code_2,
        geographic_states!inner(
          id,
          name,
          code,
          geographic_metro_areas(
            id,
            name,
            slug,
            geographic_cities(
              id,
              name,
              slug,
              supplier_count,
              is_popular
            )
          )
        )
      `)
      .eq('iso_code_2', countryCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Hierarchy fetch error:', error);
      return { countries: [] };
    }

    // Transform data to match response interface
    const countries = [{
      id: data.id,
      name: data.name,
      iso_code_2: data.iso_code_2,
      states: data.geographic_states.map(state => ({
        id: state.id,
        name: state.name,
        code: state.code,
        metro_areas: state.geographic_metro_areas.map(metro => ({
          id: metro.id,
          name: metro.name,
          slug: metro.slug,
          supplier_count: metro.geographic_cities.reduce((sum, city) => sum + city.supplier_count, 0),
          cities: metro.geographic_cities.map(city => ({
            id: city.id,
            name: city.name,
            slug: city.slug,
            supplier_count: city.supplier_count,
            is_popular: city.is_popular
          }))
        }))
      }))
    }];

    return { countries };
  }

  async findSuppliersInLocation(
    locationId: string,
    locationType: string,
    options: {
      radius?: number;
      category?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<LocationSuppliersResponse> {
    const { radius = 25, category, limit = 20, offset = 0 } = options;

    // Get location details first
    const location = await this.getLocationDetails(locationId, locationType);
    if (!location) {
      throw new Error('Location not found');
    }

    // Find suppliers serving this location
    let queryBuilder = this.supabase
      .from('supplier_service_areas')
      .select(`
        supplier_id,
        service_radius_miles,
        travel_fee,
        min_booking_amount,
        supplier_profiles!inner(
          id,
          business_name,
          category,
          rating,
          review_count,
          portfolio_images(url)
        )
      `)
      .eq('geographic_type', locationType)
      .eq('geographic_id', locationId)
      .eq('is_active', true)
      .range(offset, offset + limit - 1);

    if (category) {
      queryBuilder = queryBuilder.eq('supplier_profiles.category', category);
    }

    const { data: serviceAreas, error } = await queryBuilder;

    if (error) {
      console.error('Suppliers fetch error:', error);
      return {
        location,
        suppliers: [],
        total_count: 0,
        search_radius: radius
      };
    }

    // Transform to response format
    const suppliers = (serviceAreas || []).map(area => ({
      id: area.supplier_profiles.id,
      business_name: area.supplier_profiles.business_name,
      category: area.supplier_profiles.category,
      distance_miles: 0, // Exact location match
      travel_fee: area.travel_fee,
      min_booking_amount: area.min_booking_amount,
      rating: area.supplier_profiles.rating,
      review_count: area.supplier_profiles.review_count,
      portfolio_preview: area.supplier_profiles.portfolio_images.slice(0, 3).map(img => img.url)
    }));

    // Get total count for pagination
    const { count } = await this.supabase
      .from('supplier_service_areas')
      .select('*', { count: 'exact', head: true })
      .eq('geographic_type', locationType)
      .eq('geographic_id', locationId)
      .eq('is_active', true);

    return {
      location,
      suppliers,
      total_count: count || 0,
      search_radius: radius
    };
  }

  async getWeddingDestinations(filters: {
    category?: string;
    season?: string;
    featured?: boolean;
    limit?: number;
  } = {}): Promise<WeddingDestinationsResponse> {
    const { category, season, featured, limit = 12 } = filters;

    let queryBuilder = this.supabase
      .from('wedding_destinations')
      .select(`
        id,
        name,
        description,
        category,
        season_peak,
        avg_wedding_cost,
        venue_count,
        photo_url,
        is_featured,
        geographic_cities!inner(
          name,
          geographic_states!inner(name, code)
        )
      `)
      .order('display_order')
      .order('venue_count', { ascending: false })
      .limit(limit);

    if (category) {
      queryBuilder = queryBuilder.eq('category', category);
    }
    if (season) {
      queryBuilder = queryBuilder.eq('season_peak', season);
    }
    if (featured) {
      queryBuilder = queryBuilder.eq('is_featured', true);
    }

    const { data: destinations, error } = await queryBuilder;

    if (error) {
      console.error('Destinations fetch error:', error);
      return { destinations: [], filters: { categories: [], seasons: [], cost_ranges: [] } };
    }

    const transformedDestinations = (destinations || []).map(dest => ({
      id: dest.id,
      name: dest.name,
      city: dest.geographic_cities.name,
      state: dest.geographic_cities.geographic_states.name,
      category: dest.category,
      description: dest.description,
      season_peak: dest.season_peak,
      avg_wedding_cost: dest.avg_wedding_cost,
      venue_count: dest.venue_count,
      supplier_count: 0, // Would need to calculate
      photo_url: dest.photo_url,
      coordinates: [0, 0] as [number, number] // Would get from city
    }));

    // Get filter options
    const filters_data = await this.getDestinationFilters();

    return {
      destinations: transformedDestinations,
      filters: filters_data
    };
  }

  async reverseGeocode(
    latitude: number,
    longitude: number,
    radiusMiles: number = 25
  ): Promise<ReverseGeocodeResponse> {
    // Find nearest city
    const { data: nearestCity } = await this.supabase
      .rpc('find_nearest_city', {
        search_lat: latitude,
        search_lng: longitude,
        search_radius_miles: radiusMiles
      })
      .single();

    if (!nearestCity) {
      throw new Error('No city found for coordinates');
    }

    // Get nearby destinations
    const { data: destinations } = await this.supabase
      .rpc('find_nearby_destinations', {
        search_lat: latitude,
        search_lng: longitude,
        max_distance_miles: 50
      })
      .limit(5);

    return {
      city: {
        id: nearestCity.id,
        name: nearestCity.name,
        state: nearestCity.state_name,
        country: nearestCity.country_name
      },
      metro_area: nearestCity.metro_area ? {
        id: nearestCity.metro_area_id,
        name: nearestCity.metro_area_name
      } : undefined,
      nearby_destinations: (destinations || []).map(dest => ({
        name: dest.name,
        distance_miles: dest.distance_miles,
        category: dest.category
      }))
    };
  }

  private async getLocationDetails(locationId: string, locationType: string) {
    // Implementation to get location details based on type
    const table = `geographic_${locationType === 'city' ? 'cities' : `${locationType}s`}`;
    
    const { data, error } = await this.supabase
      .from(table)
      .select('id, name, latitude, longitude')
      .eq('id', locationId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      type: locationType,
      latitude: data.latitude,
      longitude: data.longitude
    };
  }

  private async generateSearchSuggestions(query: string): Promise<string[]> {
    const { data } = await this.supabase
      .from('geographic_search_terms')
      .select('search_term')
      .ilike('search_term', `%${query}%`)
      .limit(5);

    return (data || []).map(item => item.search_term);
  }

  private async getDestinationFilters() {
    const [categories, seasons] = await Promise.all([
      this.supabase
        .from('wedding_destinations')
        .select('category')
        .not('category', 'is', null),
      this.supabase
        .from('wedding_destinations')
        .select('season_peak')
        .not('season_peak', 'is', null)
    ]);

    return {
      categories: [...new Set(categories.data?.map(c => c.category) || [])],
      seasons: [...new Set(seasons.data?.map(s => s.season_peak) || [])],
      cost_ranges: [
        { min: 0, max: 15000, label: 'Under $15k' },
        { min: 15000, max: 30000, label: '$15k - $30k' },
        { min: 30000, max: 50000, label: '$30k - $50k' },
        { min: 50000, max: 100000, label: '$50k+' }
      ]
    };
  }
}
```

## MCP Integration

### Geographic Database Operations

```typescript
// For MCP server integration - geographic operations
export const geographicMCPOperations = {
  // Popular wedding location analysis
  async getPopularWeddingLocations() {
    return `
      SELECT 
        gc.name as city,
        gs.name as state,
        gc.supplier_count,
        gc.wedding_venue_count,
        wd.category as destination_type,
        wd.season_peak,
        wd.avg_wedding_cost,
        COUNT(ssa.supplier_id) as serving_suppliers
      FROM geographic_cities gc
      JOIN geographic_states gs ON gc.state_id = gs.id
      LEFT JOIN wedding_destinations wd ON gc.id = wd.city_id
      LEFT JOIN supplier_service_areas ssa ON ssa.geographic_id = gc.id AND ssa.geographic_type = 'city'
      WHERE gc.is_popular = true
        OR gc.wedding_venue_count > 5
        OR gc.supplier_count > 10
      GROUP BY gc.id, gc.name, gs.name, gc.supplier_count, gc.wedding_venue_count, 
               wd.category, wd.season_peak, wd.avg_wedding_cost
      ORDER BY gc.supplier_count DESC, gc.wedding_venue_count DESC
      LIMIT 20;
    `;
  },

  // Supplier geographic coverage analysis
  async getSupplierGeographicCoverage() {
    return `
      WITH supplier_coverage AS (
        SELECT 
          sp.id,
          sp.business_name,
          sp.category,
          COUNT(ssa.geographic_id) as locations_served,
          STRING_AGG(
            CASE ssa.geographic_type
              WHEN 'city' THEN gc.name
              WHEN 'metro' THEN gm.name
              WHEN 'state' THEN gs.name
            END, ', ' ORDER BY ssa.service_radius_miles DESC
          ) as service_areas,
          AVG(ssa.service_radius_miles) as avg_service_radius,
          SUM(ssa.travel_fee) as total_travel_fees
        FROM supplier_profiles sp
        JOIN supplier_service_areas ssa ON sp.id = ssa.supplier_id
        LEFT JOIN geographic_cities gc ON ssa.geographic_type = 'city' AND ssa.geographic_id = gc.id
        LEFT JOIN geographic_metro_areas gm ON ssa.geographic_type = 'metro' AND ssa.geographic_id = gm.id
        LEFT JOIN geographic_states gs ON ssa.geographic_type = 'state' AND ssa.geographic_id = gs.id
        WHERE ssa.is_active = true
        GROUP BY sp.id, sp.business_name, sp.category
      )
      SELECT 
        *,
        CASE 
          WHEN locations_served >= 10 THEN 'Wide Coverage'
          WHEN locations_served >= 5 THEN 'Regional'
          WHEN locations_served >= 2 THEN 'Multi-location'
          ELSE 'Local'
        END as coverage_type
      FROM supplier_coverage
      ORDER BY locations_served DESC, avg_service_radius DESC;
    `;
  },

  // Market opportunity analysis by geography
  async getGeographicMarketOpportunities() {
    return `
      SELECT 
        gs.name as state,
        gm.name as metro_area,
        COUNT(DISTINCT gc.id) as cities_count,
        SUM(gc.wedding_venue_count) as total_venues,
        SUM(gc.supplier_count) as total_suppliers,
        ROUND(
          SUM(gc.wedding_venue_count)::DECIMAL / NULLIF(SUM(gc.supplier_count), 0), 2
        ) as venue_to_supplier_ratio,
        CASE 
          WHEN SUM(gc.wedding_venue_count) > SUM(gc.supplier_count) * 2 THEN 'High Demand'
          WHEN SUM(gc.wedding_venue_count) > SUM(gc.supplier_count) THEN 'Growing Market'
          WHEN SUM(gc.supplier_count) > SUM(gc.wedding_venue_count) * 2 THEN 'Saturated'
          ELSE 'Balanced'
        END as market_condition
      FROM geographic_states gs
      JOIN geographic_metro_areas gm ON gs.id = gm.state_id
      JOIN geographic_cities gc ON gm.id = gc.metro_area_id
      WHERE gc.is_active = true
        AND gs.country_id = (SELECT id FROM geographic_countries WHERE iso_code_2 = 'US')
      GROUP BY gs.id, gs.name, gm.id, gm.name
      HAVING SUM(gc.wedding_venue_count) > 0 OR SUM(gc.supplier_count) > 0
      ORDER BY venue_to_supplier_ratio DESC, total_venues DESC;
    `;
  }
};
```

## Testing Requirements

### Unit Tests

```typescript
// __tests__/geographic-service.test.ts
import { GeographicService } from '@/lib/services/geographic-service';

describe('GeographicService', () => {
  let geographicService: GeographicService;

  beforeEach(() => {
    geographicService = new GeographicService();
  });

  test('should search locations with autocomplete', async () => {
    const results = await geographicService.searchLocations('San Francisco', { limit: 5 });
    
    expect(results.results).toHaveLength(5);
    expect(results.results[0]).toHaveProperty('name');
    expect(results.results[0]).toHaveProperty('full_name');
    expect(results.results[0]).toHaveProperty('supplier_count');
    expect(results.suggestions).toBeInstanceOf(Array);
  });

  test('should get location hierarchy for country', async () => {
    const hierarchy = await geographicService.getLocationHierarchy('US');
    
    expect(hierarchy.countries).toHaveLength(1);
    expect(hierarchy.countries[0].iso_code_2).toBe('US');
    expect(hierarchy.countries[0].states).toBeInstanceOf(Array);
  });

  test('should find suppliers in location', async () => {
    const locationSuppliers = await geographicService.findSuppliersInLocation(
      'city-123',
      'city',
      { category: 'photography', limit: 10 }
    );

    expect(locationSuppliers).toHaveProperty('location');
    expect(locationSuppliers).toHaveProperty('suppliers');
    expect(locationSuppliers).toHaveProperty('total_count');
    expect(locationSuppliers.suppliers).toBeInstanceOf(Array);
  });

  test('should reverse geocode coordinates', async () => {
    const result = await geographicService.reverseGeocode(37.7749, -122.4194, 25);
    
    expect(result).toHaveProperty('city');
    expect(result.city).toHaveProperty('name');
    expect(result.city).toHaveProperty('state');
    expect(result.nearby_destinations).toBeInstanceOf(Array);
  });

  test('should get wedding destinations with filters', async () => {
    const destinations = await geographicService.getWeddingDestinations({
      category: 'wine-country',
      featured: true,
      limit: 5
    });

    expect(destinations.destinations).toHaveLength(5);
    expect(destinations.destinations[0]).toHaveProperty('category');
    expect(destinations.filters).toHaveProperty('categories');
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/geographic-search.test.ts
import { test, expect } from '@playwright/test';

test('location search works with autocomplete', async ({ page }) => {
  await page.goto('/');
  
  // Type location query
  await page.fill('[data-testid=location-search]', 'San Fran');
  
  // Wait for autocomplete results
  await expect(page.locator('[data-testid=search-results]')).toBeVisible();
  await expect(page.locator('[data-testid=search-result-item]')).toHaveCount(5, { timeout: 5000 });
  
  // Click on first result
  await page.click('[data-testid=search-result-item]:first-child');
  
  // Verify selection
  await expect(page.locator('[data-testid=location-search]')).toHaveValue(/San Francisco/);
});

test('geographic hierarchy browser works', async ({ page }) => {
  await page.goto('/directory/browse');
  
  // Expand California
  await page.click('[data-testid=state-california]');
  await expect(page.locator('[data-testid=metro-bay-area]')).toBeVisible();
  
  // Expand Bay Area
  await page.click('[data-testid=metro-bay-area]');
  await expect(page.locator('[data-testid=city-san-francisco]')).toBeVisible();
  
  // Click on San Francisco
  await page.click('[data-testid=city-san-francisco]');
  
  // Should navigate to San Francisco suppliers page
  await expect(page.url()).toContain('/directory/san-francisco');
  await expect(page.locator('h1')).toHaveText(/Wedding Vendors in San Francisco/);
});

test('popular destinations display correctly', async ({ page }) => {
  await page.goto('/directory');
  
  await expect(page.locator('[data-testid=popular-destinations]')).toBeVisible();
  await expect(page.locator('[data-testid=destination-card]')).toHaveCount(8);
  
  // Check destination details
  const firstDestination = page.locator('[data-testid=destination-card]:first-child');
  await expect(firstDestination.locator('[data-testid=destination-name]')).toBeVisible();
  await expect(firstDestination.locator('[data-testid=destination-category]')).toBeVisible();
  await expect(firstDestination.locator('[data-testid=venue-count]')).toBeVisible();
});
```

## Acceptance Criteria

### Core Functionality
- ✅ Hierarchical geographic organization (Country → State → Metro → City)
- ✅ Location search with autocomplete and suggestions
- ✅ Service area management for suppliers with radius and travel fees
- ✅ Popular wedding destination highlighting
- ✅ Reverse geocoding for coordinate-based location detection
- ✅ Geographic filtering and browsing interface

### Search Performance
- ✅ Location search returns results in <500ms
- ✅ Autocomplete suggestions appear within 300ms of typing
- ✅ Geographic hierarchy loads in <2 seconds
- ✅ Distance calculations optimized with spatial indexes
- ✅ Full-text search supports partial matching and typos

### User Experience
- ✅ Intuitive location selection with typeahead
- ✅ Clear geographic hierarchy browsing
- ✅ Mobile-responsive location search
- ✅ Visual indicators for popular destinations
- ✅ Service area visualization on maps

### Business Requirements
- ✅ Support for international expansion (country-based structure)
- ✅ Wedding destination categorization and promotion
- ✅ Supplier coverage analysis and gap identification
- ✅ Market opportunity identification by region
- ✅ Geographic performance metrics and analytics

---

**Completion Status**: ✅ Ready for Development
**Estimated Development Time**: 2-3 weeks
**Dependencies**: Mapping service integration, location data seeding
**Business Value**: Foundation for location-based search and supplier discovery - critical for marketplace functionality and user experience