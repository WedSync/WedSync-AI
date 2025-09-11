# WS-114: Marketplace Search Filters - Technical Specification

## Feature Overview
**Feature ID:** WS-114  
**Feature Name:** Marketplace Search Filters  
**Team Assignment:** Team A (Frontend) + Team B (Backend)  
**Dependencies:** WS-106 (Marketplace Foundation)  
**Status:** Technical Specification Complete  
**Priority:** High (Critical Path - User Discovery)

## User Stories with Wedding Context

### 🔍 Story 1: Advanced Search Discovery
**As a** wedding coordinator managing 15 luxury weddings this season  
**I want to** search for "luxury venue communication templates" with filters for price range ($50-200) and verified creators  
**So that I can** quickly find proven templates that match my high-end client expectations and budget constraints  

**Wedding Context:** During peak season (March-May), coordinators need to find specific template types fast. A luxury coordinator won't waste time browsing $10 basic templates when managing $50K+ budgets per wedding.

### 🏷️ Story 2: Vendor Type Specific Filtering  
**As a** destination wedding specialist searching the marketplace  
**I want to** filter templates by "destination wedding" vendor type and "travel coordination" features  
**So that I can** find templates specifically designed for complex international wedding logistics and vendor management  

**Wedding Context:** Destination wedding templates have unique requirements (timezone coordination, international vendor communication, travel guest management) that local wedding templates don't address.

### 💰 Story 3: Price Range and Value Filtering
**As a** budget-conscious wedding coordinator with startup couples  
**I want to** filter templates under $30 and sort by "best selling" to see proven affordable options  
**So that I can** provide professional service to budget clients without compromising on template quality  

**Wedding Context:** Budget coordinators (handling $5K-15K weddings) need different templates than luxury coordinators but still need professional quality to maintain their reputation.

### ⭐ Story 4: Quality and Rating Filtering
**As a** established wedding planner with 50+ weddings per year  
**I want to** filter for 4.5+ star rated templates from verified creators with preview demos  
**So that I can** maintain my reputation by only using templates proven successful by other professional coordinators  

**Wedding Context:** High-volume coordinators can't risk template failures during peak season. They need battle-tested templates with social proof from other professionals.

### 🎯 Story 5: Visual Template Browsing
**As a** visual-oriented wedding coordinator who needs to quickly assess templates  
**I want to** see thumbnail previews, interactive demos, and component counts in search results  
**So that I can** evaluate template suitability without opening each individual template page  

**Wedding Context:** Coordinators work visually when selecting templates - they need to see form layouts, email designs, and workflow structures at a glance to match their brand aesthetic and client expectations.

### 🔄 Story 6: Saved Searches and Preferences
**As a** wedding coordinator who regularly searches for seasonal template updates  
**I want to** save my search filters for "spring wedding client onboarding" and get notifications for new templates  
**So that I can** stay current with new template releases that match my specific seasonal business needs  

**Wedding Context:** Wedding business is highly seasonal - coordinators need different templates for spring garden party weddings vs winter intimate celebrations, and want to track new releases in their specialization areas.

## Database Schema Design

```sql
-- Enhanced template search index with wedding-specific fields
CREATE TABLE template_search_index (
    template_id UUID PRIMARY KEY REFERENCES marketplace_templates(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    creator_name TEXT NOT NULL,
    creator_verified BOOLEAN DEFAULT false,
    
    -- Wedding-specific categorization
    vendor_types TEXT[] NOT NULL, -- ['photographer', 'venue', 'catering', 'florist']
    wedding_types TEXT[] NOT NULL, -- ['luxury', 'destination', 'intimate', 'traditional']
    season_optimized TEXT[], -- ['spring', 'summer', 'fall', 'winter']
    complexity_level VARCHAR(20) DEFAULT 'intermediate', -- 'simple', 'intermediate', 'advanced'
    
    -- Search vectors for full-text search
    title_vector tsvector,
    description_vector tsvector,
    tags TEXT[] DEFAULT '{}',
    
    -- Pricing and quality metrics
    price_cents INTEGER NOT NULL,
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    
    -- Template characteristics
    component_count INTEGER DEFAULT 0,
    has_demo BOOLEAN DEFAULT false,
    has_screenshots BOOLEAN DEFAULT false,
    estimated_setup_minutes INTEGER, -- Time to implement template
    customizability_score INTEGER, -- 1-10 how customizable
    
    -- Marketplace metrics
    trending_score DECIMAL(5,2) DEFAULT 0, -- Algorithm-based trending score
    conversion_rate DECIMAL(4,3) DEFAULT 0, -- Views to purchases
    last_purchased_at TIMESTAMPTZ,
    
    -- Technical metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search performance indexes
CREATE INDEX idx_template_search_text ON template_search_index USING GIN(
    to_tsvector('english', title || ' ' || description)
);
CREATE INDEX idx_template_search_tags ON template_search_index USING GIN(tags);
CREATE INDEX idx_template_search_vendor_types ON template_search_index USING GIN(vendor_types);
CREATE INDEX idx_template_search_wedding_types ON template_search_index USING GIN(wedding_types);
CREATE INDEX idx_template_search_price ON template_search_index(price_cents);
CREATE INDEX idx_template_search_rating ON template_search_index(average_rating DESC);
CREATE INDEX idx_template_search_trending ON template_search_index(trending_score DESC);
CREATE INDEX idx_template_search_sales ON template_search_index(total_sales DESC);

-- User search history and preferences
CREATE TABLE user_search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    search_query TEXT,
    applied_filters JSONB NOT NULL DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    clicked_template_ids UUID[] DEFAULT '{}',
    purchased_template_ids UUID[] DEFAULT '{}',
    search_duration_seconds INTEGER, -- Time spent on search results
    wedding_season VARCHAR(20), -- Context: which season they're searching for
    search_intent VARCHAR(50), -- 'browsing', 'specific_need', 'comparison'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved searches for returning coordinators
CREATE TABLE saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    search_name VARCHAR(100) NOT NULL,
    search_query TEXT,
    filters JSONB NOT NULL DEFAULT '{}',
    notification_enabled BOOLEAN DEFAULT false,
    last_results_count INTEGER DEFAULT 0,
    search_frequency VARCHAR(20) DEFAULT 'manual', -- 'manual', 'weekly', 'monthly'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_run_at TIMESTAMPTZ
);

-- Template preview assets for visual search
CREATE TABLE template_previews (
    template_id UUID PRIMARY KEY REFERENCES marketplace_templates(id),
    thumbnail_url TEXT, -- 1200x630 preview image
    screenshot_urls TEXT[] DEFAULT '{}', -- Multiple screenshots
    demo_url TEXT, -- Interactive demo link
    video_preview_url TEXT, -- Short video preview
    color_palette JSONB, -- Dominant colors for visual filtering
    design_style VARCHAR(30), -- 'modern', 'classic', 'minimalist', 'luxury'
    mobile_optimized BOOLEAN DEFAULT false,
    accessibility_score INTEGER, -- 1-10 accessibility rating
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search analytics for optimization
CREATE TABLE search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_query TEXT,
    normalized_query TEXT, -- Cleaned/standardized version
    filters_used JSONB,
    results_count INTEGER,
    zero_results BOOLEAN DEFAULT false,
    avg_click_position DECIMAL(3,1), -- Which result position gets clicked
    conversion_rate DECIMAL(4,3), -- Searches leading to purchases
    wedding_season VARCHAR(20),
    search_date DATE DEFAULT CURRENT_DATE,
    total_searches INTEGER DEFAULT 1
);

-- Indexes for search history and analytics
CREATE INDEX idx_search_history_user_date ON user_search_history(user_id, created_at DESC);
CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX idx_search_analytics_query ON search_analytics(normalized_query);
CREATE INDEX idx_search_analytics_date ON search_analytics(search_date DESC);

-- RLS policies for user data protection
ALTER TABLE user_search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own search history" ON user_search_history
    FOR ALL USING (user_id = auth.uid());

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own saved searches" ON saved_searches
    FOR ALL USING (user_id = auth.uid());
```

## API Endpoints

### GET /api/marketplace/search
```typescript
interface MarketplaceSearchRequest {
  // Text search
  query?: string;
  
  // Filters
  filters: {
    vendorTypes?: ('photographer' | 'venue' | 'catering' | 'florist' | 'music' | 'flowers' | 'transportation')[];
    weddingTypes?: ('luxury' | 'destination' | 'intimate' | 'traditional' | 'elopement')[];
    priceRange?: { min: number; max: number }; // In cents
    rating?: { min: number }; // 1-5 stars
    complexity?: ('simple' | 'intermediate' | 'advanced')[];
    features?: ('demo' | 'screenshots' | 'video' | 'mobile_optimized' | 'verified_creator')[];
    seasonOptimized?: ('spring' | 'summer' | 'fall' | 'winter')[];
  };
  
  // Sorting and pagination
  sortBy?: 'relevance' | 'price_low_high' | 'price_high_low' | 'best_selling' | 'highest_rated' | 'newest' | 'trending';
  page?: number;
  limit?: number; // Max 50
  
  // Search context
  weddingContext?: {
    season?: string;
    budgetRange?: 'budget' | 'mid_range' | 'luxury';
    guestCount?: number;
    planningTimeline?: 'rushed' | 'normal' | 'extended';
  };
}

interface MarketplaceSearchResponse {
  templates: Array<{
    id: string;
    title: string;
    description: string;
    creator: {
      id: string;
      name: string;
      verified: boolean;
      avatar?: string;
    };
    pricing: {
      cents: number;
      currency: string;
      discounted?: { originalCents: number; discountPercent: number };
    };
    quality: {
      rating: number;
      reviewCount: number;
      salesCount: number;
    };
    preview: {
      thumbnailUrl: string;
      screenshotUrls: string[];
      demoUrl?: string;
      videoPreviewUrl?: string;
    };
    metadata: {
      vendorTypes: string[];
      weddingTypes: string[];
      complexity: string;
      estimatedSetupMinutes: number;
      componentCount: number;
      designStyle: string;
    };
    highlights: string[]; // Search term highlights
    trendingBadge?: boolean;
    newBadge?: boolean; // Released within 30 days
  }>;
  
  // Search metadata
  totalResults: number;
  searchTime: number; // milliseconds
  currentPage: number;
  totalPages: number;
  
  // Facet counts for filter UI
  facets: {
    vendorTypes: Record<string, number>;
    weddingTypes: Record<string, number>;
    priceRanges: Array<{ range: string; min: number; max: number; count: number }>;
    ratings: Record<string, number>; // '4-5': 150, '3-4': 75, etc.
    complexity: Record<string, number>;
    designStyles: Record<string, number>;
  };
  
  // Personalized recommendations
  recommendations?: {
    basedOnHistory: string[]; // Template IDs
    trending: string[]; // Currently trending templates
    seasonal: string[]; // Relevant to current/upcoming wedding season
  };
  
  // Search suggestions for query improvement
  suggestions?: {
    corrections?: string; // "Did you mean: luxury venue"
    related: string[]; // Related search terms
    filters: Array<{ name: string; value: string; count: number }>; // Suggested filters
  };
}
```

### POST /api/marketplace/search/save
```typescript
interface SaveSearchRequest {
  searchName: string;
  query?: string;
  filters: Record<string, any>;
  notificationEnabled?: boolean;
  searchFrequency?: 'manual' | 'weekly' | 'monthly';
}

interface SaveSearchResponse {
  searchId: string;
  message: string;
}
```

### GET /api/marketplace/search/suggestions
```typescript
interface SearchSuggestionsRequest {
  query: string; // Partial query
  limit?: number; // Default 10
}

interface SearchSuggestionsResponse {
  suggestions: Array<{
    text: string;
    type: 'template' | 'category' | 'creator' | 'feature';
    count?: number; // Number of results this would return
    icon?: string;
  }>;
}
```

## Frontend Components

### MarketplaceSearchInterface Component
```typescript
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { debounce } from 'lodash';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Star, Eye, ShoppingCart, Heart, Grid, List } from 'lucide-react';

interface MarketplaceSearchInterfaceProps {
  initialQuery?: string;
  initialFilters?: Record<string, any>;
}

export function MarketplaceSearchInterface({ initialQuery = '', initialFilters = {} }: MarketplaceSearchInterfaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Search state
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [filters, setFilters] = useState({
    vendorTypes: [],
    weddingTypes: [],
    priceRange: { min: 0, max: 500 },
    rating: { min: 0 },
    complexity: [],
    features: [],
    seasonOptimized: [],
    ...initialFilters
  });
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search query
  const debouncedSetQuery = useCallback(
    debounce((value: string) => setDebouncedQuery(value), 300),
    []
  );

  useEffect(() => {
    debouncedSetQuery(query);
  }, [query, debouncedSetQuery]);

  // Search query
  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['marketplace-search', debouncedQuery, filters, sortBy, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(debouncedQuery && { query: debouncedQuery }),
        sortBy,
        page: currentPage.toString(),
        limit: '20'
      });

      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
          params.append(`filters[${key}]`, JSON.stringify(value));
        } else if (typeof value === 'object' && value !== null) {
          params.append(`filters[${key}]`, JSON.stringify(value));
        }
      });

      const response = await fetch(`/api/marketplace/search?${params}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    keepPreviousData: true
  });

  // Search suggestions for autocomplete
  const { data: suggestions } = useQuery({
    queryKey: ['search-suggestions', query],
    queryFn: async () => {
      if (query.length < 2) return { suggestions: [] };
      const response = await fetch(`/api/marketplace/search/suggestions?query=${encodeURIComponent(query)}`);
      if (!response.ok) return { suggestions: [] };
      return response.json();
    },
    enabled: query.length >= 2
  });

  const handleFilterChange = useCallback((filterType: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      vendorTypes: [],
      weddingTypes: [],
      priceRange: { min: 0, max: 500 },
      rating: { min: 0 },
      complexity: [],
      features: [],
      seasonOptimized: []
    });
  }, []);

  const saveSearch = useCallback(async () => {
    if (!debouncedQuery && Object.values(filters).every(v => 
      Array.isArray(v) ? v.length === 0 : v === 0 || (typeof v === 'object' && Object.values(v).every(val => val === 0))
    )) return;

    const searchName = prompt('Name this search:');
    if (!searchName) return;

    try {
      await fetch('/api/marketplace/search/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchName,
          query: debouncedQuery,
          filters,
          notificationEnabled: false
        })
      });
      alert('Search saved successfully!');
    } catch (error) {
      alert('Failed to save search. Please try again.');
    }
  }, [debouncedQuery, filters]);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">Search failed. Please try again.</p>
          <Button onClick={() => window.location.reload()}>Refresh</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Search Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search templates... (e.g., 'luxury venue forms', 'RSVP tracking')"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-4 py-2 text-lg"
            />
            
            {/* Search Suggestions Dropdown */}
            {suggestions?.suggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md mt-1 shadow-lg">
                {suggestions.suggestions.map((suggestion: any, idx: number) => (
                  <button
                    key={idx}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                    onClick={() => {
                      setQuery(suggestion.text);
                      setDebouncedQuery(suggestion.text);
                    }}
                  >
                    <span className="text-gray-500">{suggestion.type}</span>
                    <span>{suggestion.text}</span>
                    {suggestion.count && <span className="text-gray-400 ml-auto">({suggestion.count})</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v > 0) && (
                <Badge variant="secondary" className="ml-2">Active</Badge>
              )}
            </Button>
            
            <Button variant="outline" onClick={saveSearch}>
              <Heart className="h-4 w-4 mr-2" />
              Save Search
            </Button>
            
            <Select value={viewMode} onValueChange={(value: 'grid' | 'list') => setViewMode(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid"><Grid className="h-4 w-4" /></SelectItem>
                <SelectItem value="list"><List className="h-4 w-4" /></SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters Display */}
        {Object.entries(filters).some(([_, value]) => Array.isArray(value) ? value.length > 0 : value > 0) && (
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-gray-600">Active filters:</span>
            {filters.vendorTypes?.map((type: string) => (
              <Badge key={type} variant="secondary" className="flex items-center gap-1">
                {type}
                <button 
                  onClick={() => handleFilterChange('vendorTypes', filters.vendorTypes.filter((t: string) => t !== type))}
                  className="ml-1 hover:text-red-600"
                >×</button>
              </Badge>
            ))}
            {filters.priceRange.max < 500 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                ${filters.priceRange.min} - ${filters.priceRange.max}
                <button onClick={() => handleFilterChange('priceRange', { min: 0, max: 500 })}>×</button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-600">
              Clear all
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters Panel */}
        {showFilters && (
          <div className="lg:w-64 flex-shrink-0">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium mb-2">Price Range</label>
                  <Slider
                    value={[filters.priceRange.min, filters.priceRange.max]}
                    onValueChange={([min, max]) => handleFilterChange('priceRange', { min, max })}
                    max={500}
                    step={10}
                    className="mb-2"
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>${filters.priceRange.min}</span>
                    <span>${filters.priceRange.max}</span>
                  </div>
                </div>

                {/* Vendor Types */}
                <div>
                  <label className="block text-sm font-medium mb-3">Vendor Types</label>
                  <div className="space-y-2">
                    {['photographer', 'venue', 'catering', 'florist', 'music', 'transportation'].map(type => (
                      <div key={type} className="flex items-center">
                        <Checkbox
                          id={type}
                          checked={filters.vendorTypes.includes(type)}
                          onCheckedChange={(checked) => {
                            const newTypes = checked 
                              ? [...filters.vendorTypes, type]
                              : filters.vendorTypes.filter((t: string) => t !== type);
                            handleFilterChange('vendorTypes', newTypes);
                          }}
                        />
                        <label htmlFor={type} className="ml-2 text-sm capitalize">
                          {type}
                          {searchResults?.facets.vendorTypes[type] && (
                            <span className="text-gray-400 ml-1">({searchResults.facets.vendorTypes[type]})</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Wedding Types */}
                <div>
                  <label className="block text-sm font-medium mb-3">Wedding Types</label>
                  <div className="space-y-2">
                    {['luxury', 'destination', 'intimate', 'traditional', 'elopement'].map(type => (
                      <div key={type} className="flex items-center">
                        <Checkbox
                          id={`wedding-${type}`}
                          checked={filters.weddingTypes.includes(type)}
                          onCheckedChange={(checked) => {
                            const newTypes = checked 
                              ? [...filters.weddingTypes, type]
                              : filters.weddingTypes.filter((t: string) => t !== type);
                            handleFilterChange('weddingTypes', newTypes);
                          }}
                        />
                        <label htmlFor={`wedding-${type}`} className="ml-2 text-sm capitalize">
                          {type}
                          {searchResults?.facets.weddingTypes[type] && (
                            <span className="text-gray-400 ml-1">({searchResults.facets.weddingTypes[type]})</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rating Filter */}
                <div>
                  <label className="block text-sm font-medium mb-3">Minimum Rating</label>
                  <div className="space-y-2">
                    {[4, 3, 2, 1].map(rating => (
                      <div key={rating} className="flex items-center">
                        <input
                          type="radio"
                          id={`rating-${rating}`}
                          name="rating"
                          checked={filters.rating.min === rating}
                          onChange={() => handleFilterChange('rating', { min: rating })}
                          className="mr-2"
                        />
                        <label htmlFor={`rating-${rating}`} className="flex items-center text-sm">
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star 
                                key={idx} 
                                className={`h-3 w-3 ${idx < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                          <span className="ml-2">& up</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Features */}
                <div>
                  <label className="block text-sm font-medium mb-3">Features</label>
                  <div className="space-y-2">
                    {['demo', 'screenshots', 'video', 'mobile_optimized', 'verified_creator'].map(feature => (
                      <div key={feature} className="flex items-center">
                        <Checkbox
                          id={feature}
                          checked={filters.features.includes(feature)}
                          onCheckedChange={(checked) => {
                            const newFeatures = checked 
                              ? [...filters.features, feature]
                              : filters.features.filter((f: string) => f !== feature);
                            handleFilterChange('features', newFeatures);
                          }}
                        />
                        <label htmlFor={feature} className="ml-2 text-sm">
                          {feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Results Section */}
        <div className="flex-1">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">
                {isLoading ? 'Searching...' : `${searchResults?.totalResults || 0} templates found`}
              </h2>
              {searchResults?.searchTime && (
                <span className="text-sm text-gray-500">
                  ({searchResults.searchTime}ms)
                </span>
              )}
            </div>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Most Relevant</SelectItem>
                <SelectItem value="price_low_high">Price: Low to High</SelectItem>
                <SelectItem value="price_high_low">Price: High to Low</SelectItem>
                <SelectItem value="best_selling">Best Selling</SelectItem>
                <SelectItem value="highest_rated">Highest Rated</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="trending">Trending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Suggestions */}
          {searchResults?.suggestions && (
            <Card className="mb-6 bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                {searchResults.suggestions.corrections && (
                  <p className="text-sm mb-2">
                    Did you mean: <button 
                      className="text-blue-600 underline"
                      onClick={() => setQuery(searchResults.suggestions.corrections)}
                    >
                      {searchResults.suggestions.corrections}
                    </button>?
                  </p>
                )}
                {searchResults.suggestions.related.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-600">Related searches: </span>
                    {searchResults.suggestions.related.slice(0, 3).map((term: string, idx: number) => (
                      <button 
                        key={idx}
                        className="text-blue-600 text-sm underline mr-3"
                        onClick={() => setQuery(term)}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Card key={idx} className="animate-pulse">
                  <div className="aspect-video bg-gray-200 rounded-t-lg"></div>
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="flex justify-between">
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Results Grid */}
          {searchResults && searchResults.templates.length > 0 && (
            <>
              <div className={viewMode === 'grid' ? 
                "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : 
                "space-y-4"
              }>
                {searchResults.templates.map((template: any) => (
                  <Card key={template.id} className="group hover:shadow-lg transition-shadow">
                    {viewMode === 'grid' ? (
                      <>
                        <div className="relative aspect-video overflow-hidden rounded-t-lg">
                          <img 
                            src={template.preview.thumbnailUrl} 
                            alt={template.title}
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                          />
                          {template.trendingBadge && (
                            <Badge className="absolute top-2 left-2 bg-orange-500">Trending</Badge>
                          )}
                          {template.newBadge && (
                            <Badge className="absolute top-2 right-2 bg-green-500">New</Badge>
                          )}
                          {template.preview.demoUrl && (
                            <Button 
                              size="sm" 
                              variant="secondary"
                              className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Demo
                            </Button>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-lg line-clamp-2 flex-1">
                              {template.title}
                            </h3>
                            <div className="text-right ml-2">
                              <div className="font-bold text-lg">
                                {formatPrice(template.pricing.cents)}
                              </div>
                              {template.pricing.discounted && (
                                <div className="text-sm text-gray-500 line-through">
                                  {formatPrice(template.pricing.discounted.originalCents)}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {template.description}
                          </p>
                          
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-400 fill-current" />
                              <span className="text-sm font-medium">{template.quality.rating}</span>
                              <span className="text-sm text-gray-500">({template.quality.reviewCount})</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <ShoppingCart className="h-3 w-3" />
                                {template.quality.salesCount}
                              </span>
                              <span>{template.metadata.estimatedSetupMinutes}min setup</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1 mb-3">
                            {template.metadata.vendorTypes.slice(0, 2).map((type: string) => (
                              <Badge key={type} variant="outline" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                            <Badge variant="outline" className="text-xs">
                              {template.metadata.complexity}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                            <span>by</span>
                            <span className="font-medium">{template.creator.name}</span>
                            {template.creator.verified && (
                              <Badge variant="secondary" className="text-xs">Verified</Badge>
                            )}
                          </div>

                          <Button className="w-full">
                            View Template
                          </Button>
                        </CardContent>
                      </>
                    ) : (
                      // List view
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <img 
                            src={template.preview.thumbnailUrl} 
                            alt={template.title}
                            className="w-32 h-20 object-cover rounded flex-shrink-0"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-semibold text-lg">{template.title}</h3>
                              <div className="font-bold text-lg">
                                {formatPrice(template.pricing.cents)}
                              </div>
                            </div>
                            <p className="text-gray-600 text-sm mb-2">{template.description}</p>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                <span>{template.quality.rating} ({template.quality.reviewCount})</span>
                              </div>
                              <span>{template.quality.salesCount} sales</span>
                              <span>by {template.creator.name}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {searchResults.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <Button 
                    variant="outline" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    Previous
                  </Button>
                  
                  {Array.from({ length: Math.min(5, searchResults.totalPages) }, (_, idx) => {
                    const page = idx + 1;
                    const isCurrentPage = page === currentPage;
                    
                    return (
                      <Button
                        key={page}
                        variant={isCurrentPage ? "default" : "outline"}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                  
                  <Button 
                    variant="outline" 
                    disabled={currentPage === searchResults.totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}

          {/* No Results */}
          {searchResults && searchResults.templates.length === 0 && !isLoading && (
            <Card className="p-8 text-center">
              <h3 className="text-lg font-semibold mb-2">No templates found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search query or filters to find more results.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Suggestions:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Try broader search terms like "venue" instead of "luxury venue forms"</li>
                  <li>• Remove some filters to see more results</li>
                  <li>• Check for spelling mistakes in your search</li>
                </ul>
              </div>
              <Button onClick={clearFilters} className="mt-4">
                Clear All Filters
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default MarketplaceSearchInterface;
```

## Integration Services

### Search Service Implementation
```typescript
// lib/services/marketplace-search-service.ts
import { createClient } from '@/lib/supabase/client';

interface SearchFilters {
  vendorTypes?: string[];
  weddingTypes?: string[];
  priceRange?: { min: number; max: number };
  rating?: { min: number };
  complexity?: string[];
  features?: string[];
  seasonOptimized?: string[];
}

interface SearchOptions {
  query?: string;
  filters: SearchFilters;
  sortBy?: string;
  page?: number;
  limit?: number;
  userId?: string; // For personalization
}

class MarketplaceSearchService {
  private supabase = createClient();

  async searchTemplates(options: SearchOptions) {
    const {
      query,
      filters,
      sortBy = 'relevance',
      page = 1,
      limit = 20,
      userId
    } = options;

    // Build base query
    let queryBuilder = this.supabase
      .from('template_search_index')
      .select(`
        template_id,
        title,
        description,
        creator_name,
        creator_verified,
        vendor_types,
        wedding_types,
        price_cents,
        average_rating,
        total_reviews,
        total_sales,
        has_demo,
        has_screenshots,
        estimated_setup_minutes,
        component_count,
        trending_score,
        created_at
      `);

    // Apply text search
    if (query) {
      // Use PostgreSQL full-text search
      queryBuilder = queryBuilder.textSearch('title_vector', query.split(' ').map(term => 
        `${term}:*`
      ).join(' | '));
    }

    // Apply filters
    if (filters.vendorTypes?.length) {
      queryBuilder = queryBuilder.overlaps('vendor_types', filters.vendorTypes);
    }
    
    if (filters.weddingTypes?.length) {
      queryBuilder = queryBuilder.overlaps('wedding_types', filters.weddingTypes);
    }

    if (filters.priceRange) {
      queryBuilder = queryBuilder
        .gte('price_cents', filters.priceRange.min * 100)
        .lte('price_cents', filters.priceRange.max * 100);
    }

    if (filters.rating?.min) {
      queryBuilder = queryBuilder.gte('average_rating', filters.rating.min);
    }

    if (filters.features?.includes('demo')) {
      queryBuilder = queryBuilder.eq('has_demo', true);
    }

    if (filters.features?.includes('screenshots')) {
      queryBuilder = queryBuilder.eq('has_screenshots', true);
    }

    if (filters.features?.includes('verified_creator')) {
      queryBuilder = queryBuilder.eq('creator_verified', true);
    }

    // Apply sorting
    switch (sortBy) {
      case 'price_low_high':
        queryBuilder = queryBuilder.order('price_cents', { ascending: true });
        break;
      case 'price_high_low':
        queryBuilder = queryBuilder.order('price_cents', { ascending: false });
        break;
      case 'best_selling':
        queryBuilder = queryBuilder.order('total_sales', { ascending: false });
        break;
      case 'highest_rated':
        queryBuilder = queryBuilder
          .order('average_rating', { ascending: false })
          .order('total_reviews', { ascending: false });
        break;
      case 'newest':
        queryBuilder = queryBuilder.order('created_at', { ascending: false });
        break;
      case 'trending':
        queryBuilder = queryBuilder.order('trending_score', { ascending: false });
        break;
      case 'relevance':
      default:
        if (query) {
          // Boost by multiple factors for relevance
          queryBuilder = queryBuilder.order('trending_score', { ascending: false });
        } else {
          queryBuilder = queryBuilder.order('total_sales', { ascending: false });
        }
        break;
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder = queryBuilder.range(offset, offset + limit - 1);

    const startTime = Date.now();
    const { data: templates, error, count } = await queryBuilder;
    const searchTime = Date.now() - startTime;

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    // Track search analytics
    if (userId) {
      await this.trackSearchAnalytics({
        userId,
        query,
        filters,
        resultsCount: count || 0,
        searchTime
      });
    }

    // Get facet counts for filters
    const facets = await this.getFacetCounts(query, filters);

    // Get personalized recommendations if user is logged in
    const recommendations = userId ? await this.getPersonalizedRecommendations(userId) : undefined;

    return {
      templates: templates || [],
      totalResults: count || 0,
      currentPage: page,
      totalPages: Math.ceil((count || 0) / limit),
      searchTime,
      facets,
      recommendations
    };
  }

  private async getFacetCounts(query?: string, currentFilters: SearchFilters = {}) {
    // Get counts for each filter option
    const facetQueries = [];

    // Vendor types facet
    facetQueries.push(
      this.supabase
        .rpc('get_vendor_type_facets', { 
          search_query: query,
          current_filters: currentFilters 
        })
    );

    // Wedding types facet  
    facetQueries.push(
      this.supabase
        .rpc('get_wedding_type_facets', {
          search_query: query,
          current_filters: currentFilters
        })
    );

    // Price range facet
    facetQueries.push(
      this.supabase
        .rpc('get_price_range_facets', {
          search_query: query,
          current_filters: currentFilters
        })
    );

    const [vendorTypes, weddingTypes, priceRanges] = await Promise.all(facetQueries);

    return {
      vendorTypes: this.formatFacetResults(vendorTypes.data),
      weddingTypes: this.formatFacetResults(weddingTypes.data),
      priceRanges: priceRanges.data || [],
      ratings: {
        '4-5': 0,
        '3-4': 0,
        '2-3': 0,
        '1-2': 0
      }
    };
  }

  private formatFacetResults(data: any[]): Record<string, number> {
    if (!data) return {};
    return data.reduce((acc, item) => {
      acc[item.value] = item.count;
      return acc;
    }, {});
  }

  private async trackSearchAnalytics(params: {
    userId: string;
    query?: string;
    filters: SearchFilters;
    resultsCount: number;
    searchTime: number;
  }) {
    try {
      await this.supabase
        .from('user_search_history')
        .insert([{
          user_id: params.userId,
          search_query: params.query,
          applied_filters: params.filters,
          results_count: params.resultsCount,
          search_duration_seconds: Math.round(params.searchTime / 1000),
          wedding_season: this.getCurrentWeddingSeason(),
          search_intent: this.inferSearchIntent(params.query, params.filters)
        }]);
    } catch (error) {
      console.error('Failed to track search analytics:', error);
      // Don't throw - analytics shouldn't break search
    }
  }

  private getCurrentWeddingSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private inferSearchIntent(query?: string, filters?: SearchFilters): string {
    if (!query && (!filters || Object.keys(filters).length === 0)) {
      return 'browsing';
    }
    
    if (query && query.length > 20) {
      return 'specific_need';
    }

    return 'comparison';
  }

  private async getPersonalizedRecommendations(userId: string) {
    // Get user's search history and purchase history
    const { data: searchHistory } = await this.supabase
      .from('user_search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!searchHistory?.length) return undefined;

    // Extract common vendor types and wedding types from search history
    const commonVendorTypes = this.extractCommonValues(
      searchHistory.flatMap(h => h.applied_filters?.vendorTypes || [])
    );

    const commonWeddingTypes = this.extractCommonValues(
      searchHistory.flatMap(h => h.applied_filters?.weddingTypes || [])
    );

    // Get recommendations based on user patterns
    const { data: basedOnHistory } = await this.supabase
      .from('template_search_index')
      .select('template_id')
      .overlaps('vendor_types', commonVendorTypes)
      .overlaps('wedding_types', commonWeddingTypes)
      .order('total_sales', { ascending: false })
      .limit(5);

    // Get currently trending templates
    const { data: trending } = await this.supabase
      .from('template_search_index')
      .select('template_id')
      .order('trending_score', { ascending: false })
      .limit(5);

    // Get seasonal recommendations
    const currentSeason = this.getCurrentWeddingSeason();
    const { data: seasonal } = await this.supabase
      .from('template_search_index')
      .select('template_id')
      .contains('season_optimized', [currentSeason])
      .order('average_rating', { ascending: false })
      .limit(5);

    return {
      basedOnHistory: basedOnHistory?.map(t => t.template_id) || [],
      trending: trending?.map(t => t.template_id) || [],
      seasonal: seasonal?.map(t => t.template_id) || []
    };
  }

  private extractCommonValues(values: string[]): string[] {
    const counts = values.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([val]) => val);
  }

  async getSuggestions(query: string): Promise<any[]> {
    if (query.length < 2) return [];

    // Get template titles that match the query
    const { data: templateSuggestions } = await this.supabase
      .from('template_search_index')
      .select('title')
      .textSearch('title_vector', `${query}:*`)
      .limit(5);

    // Get popular search terms from analytics
    const { data: popularSearches } = await this.supabase
      .from('search_analytics')
      .select('normalized_query, total_searches')
      .ilike('normalized_query', `%${query}%`)
      .order('total_searches', { ascending: false })
      .limit(3);

    const suggestions = [];

    // Add template suggestions
    templateSuggestions?.forEach(template => {
      suggestions.push({
        text: template.title,
        type: 'template',
        icon: 'template'
      });
    });

    // Add popular search suggestions
    popularSearches?.forEach(search => {
      suggestions.push({
        text: search.normalized_query,
        type: 'popular',
        count: search.total_searches,
        icon: 'search'
      });
    });

    return suggestions.slice(0, 8);
  }
}

export const marketplaceSearchService = new MarketplaceSearchService();
```

## PostgreSQL/Supabase MCP Integration

```sql
-- Function to get vendor type facets with counts
CREATE OR REPLACE FUNCTION get_vendor_type_facets(
  search_query TEXT DEFAULT NULL,
  current_filters JSONB DEFAULT '{}'
)
RETURNS TABLE(value TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    unnest(vendor_types) as value,
    COUNT(*) as count
  FROM template_search_index tsi
  WHERE (
    search_query IS NULL OR 
    to_tsvector('english', tsi.title || ' ' || tsi.description) @@ plainto_tsquery('english', search_query)
  )
  AND (
    (current_filters->>'weddingTypes' IS NULL) OR
    tsi.wedding_types && ARRAY(SELECT jsonb_array_elements_text(current_filters->'weddingTypes'))
  )
  AND (
    (current_filters->>'priceRange' IS NULL) OR
    (tsi.price_cents >= COALESCE((current_filters->'priceRange'->>'min')::INTEGER, 0) * 100 AND
     tsi.price_cents <= COALESCE((current_filters->'priceRange'->>'max')::INTEGER, 10000) * 100)
  )
  GROUP BY unnest(vendor_types)
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate trending scores (called periodically via MCP)
CREATE OR REPLACE FUNCTION update_trending_scores() RETURNS VOID AS $$
BEGIN
  UPDATE template_search_index SET trending_score = (
    -- Weight recent sales heavily
    COALESCE(
      (SELECT COUNT(*) 
       FROM creator_analytics_events cae 
       WHERE cae.template_id = template_search_index.template_id 
         AND cae.event_type = 'purchase' 
         AND cae.created_at >= NOW() - INTERVAL '7 days'
      ) * 10, 0
    ) +
    -- Weight recent views
    COALESCE(
      (SELECT COUNT(*) 
       FROM creator_analytics_events cae 
       WHERE cae.template_id = template_search_index.template_id 
         AND cae.event_type = 'view' 
         AND cae.created_at >= NOW() - INTERVAL '7 days'
      ) * 0.1, 0
    ) +
    -- Weight overall rating
    COALESCE(average_rating * 5, 0) +
    -- Weight total sales with decay
    COALESCE(total_sales * 0.1, 0)
  );
END;
$$ LANGUAGE plpgsql;

-- Function to update search index when templates change
CREATE OR REPLACE FUNCTION refresh_template_search_index() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM template_search_index WHERE template_id = OLD.id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
    INSERT INTO template_search_index (
      template_id, title, description, creator_name, creator_verified,
      vendor_types, wedding_types, price_cents, title_vector, description_vector
    )
    VALUES (
      NEW.id, NEW.title, NEW.description, 
      (SELECT name FROM user_profiles WHERE id = NEW.creator_id),
      (SELECT verified FROM user_profiles WHERE id = NEW.creator_id),
      NEW.vendor_types, NEW.wedding_types, NEW.price_cents,
      to_tsvector('english', NEW.title),
      to_tsvector('english', NEW.description)
    )
    ON CONFLICT (template_id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      creator_name = EXCLUDED.creator_name,
      creator_verified = EXCLUDED.creator_verified,
      vendor_types = EXCLUDED.vendor_types,
      wedding_types = EXCLUDED.wedding_types,
      price_cents = EXCLUDED.price_cents,
      title_vector = EXCLUDED.title_vector,
      description_vector = EXCLUDED.description_vector,
      updated_at = NOW();
    
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to keep search index up to date
CREATE TRIGGER template_search_index_trigger
    AFTER INSERT OR UPDATE OR DELETE ON marketplace_templates
    FOR EACH ROW EXECUTE FUNCTION refresh_template_search_index();

-- View for search analytics dashboard (accessed via MCP)
CREATE OR REPLACE VIEW search_analytics_summary AS
SELECT 
  sa.search_date,
  COUNT(*) as total_searches,
  AVG(sa.results_count) as avg_results_count,
  COUNT(*) FILTER (WHERE sa.zero_results) as zero_result_searches,
  AVG(sa.conversion_rate) as avg_conversion_rate,
  sa.wedding_season,
  array_agg(DISTINCT sa.normalized_query ORDER BY sa.total_searches DESC) as top_queries
FROM search_analytics sa
GROUP BY sa.search_date, sa.wedding_season
ORDER BY sa.search_date DESC;
```

## Testing Requirements

### Unit Tests
```typescript
// __tests__/marketplace-search.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { marketplaceSearchService } from '@/lib/services/marketplace-search-service';

describe('MarketplaceSearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should search templates with text query', async () => {
    const results = await marketplaceSearchService.searchTemplates({
      query: 'venue forms',
      filters: {},
      sortBy: 'relevance'
    });

    expect(results).toHaveProperty('templates');
    expect(results).toHaveProperty('totalResults');
    expect(results).toHaveProperty('facets');
    expect(results.templates).toBeInstanceOf(Array);
  });

  it('should apply vendor type filters correctly', async () => {
    const results = await marketplaceSearchService.searchTemplates({
      filters: {
        vendorTypes: ['photographer', 'venue']
      }
    });

    expect(results.templates).toBeInstanceOf(Array);
    results.templates.forEach((template: any) => {
      expect(template.vendor_types).toEqual(
        expect.arrayContaining(['photographer', 'venue'])
      );
    });
  });

  it('should return search suggestions for partial queries', async () => {
    const suggestions = await marketplaceSearchService.getSuggestions('ven');

    expect(suggestions).toBeInstanceOf(Array);
    suggestions.forEach((suggestion: any) => {
      expect(suggestion).toHaveProperty('text');
      expect(suggestion).toHaveProperty('type');
    });
  });
});
```

### Integration Tests
```typescript
// __tests__/integration/search-flow.test.ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Search Integration Flow', () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  it('should complete full search and filtering workflow', async () => {
    // Insert test templates
    const { data: templates } = await supabase
      .from('marketplace_templates')
      .insert([
        {
          id: 'template-1',
          title: 'Luxury Venue Contact Forms',
          description: 'Professional forms for high-end venues',
          vendor_types: ['venue'],
          wedding_types: ['luxury'],
          price_cents: 5000
        },
        {
          id: 'template-2', 
          title: 'Photography Booking System',
          description: 'Complete booking workflow for photographers',
          vendor_types: ['photographer'],
          wedding_types: ['traditional'],
          price_cents: 3500
        }
      ])
      .select();

    // Test search with text query
    const searchResults = await fetch('/api/marketplace/search?' + new URLSearchParams({
      query: 'luxury venue',
      sortBy: 'relevance'
    }));
    
    const results = await searchResults.json();
    
    expect(results.templates).toHaveLength(1);
    expect(results.templates[0].title).toContain('Luxury Venue');

    // Test filtering
    const filteredResults = await fetch('/api/marketplace/search?' + new URLSearchParams({
      'filters[vendorTypes]': JSON.stringify(['photographer']),
      sortBy: 'price_low_high'
    }));
    
    const filtered = await filteredResults.json();
    
    expect(filtered.templates).toHaveLength(1);
    expect(filtered.templates[0].title).toContain('Photography');
  });
});
```

## Acceptance Criteria

### ✅ Advanced Search Functionality
- [ ] Users can search templates using natural language queries
- [ ] Search supports fuzzy matching and handles typos gracefully
- [ ] Search highlights relevant terms in results
- [ ] Search suggestions appear as user types (2+ characters)
- [ ] Search performance under 500ms for typical queries

### ✅ Comprehensive Filtering System
- [ ] Price range slider with histogram showing distribution
- [ ] Vendor type multi-select with wedding industry categories
- [ ] Wedding type filtering (luxury, destination, intimate, etc.)
- [ ] Rating filter with star display and review counts
- [ ] Feature filters (demo, screenshots, verified creator)
- [ ] Seasonal optimization filtering for wedding seasons

### ✅ Visual Search Experience  
- [ ] Grid and list view modes for search results
- [ ] High-quality thumbnail previews for all templates
- [ ] Interactive demo links where available
- [ ] Template metadata display (setup time, complexity, components)
- [ ] Creator information with verification badges
- [ ] Trending and new template badges

### ✅ Search Intelligence & Personalization
- [ ] Faceted search with result counts for each filter option
- [ ] Smart suggestions based on search context
- [ ] Personalized recommendations based on search history
- [ ] Saved searches with optional notifications
- [ ] Search analytics tracking for optimization
- [ ] Wedding season context consideration

### ✅ Performance & Scalability
- [ ] Full-text search using PostgreSQL tsvector indexes
- [ ] Facet counting optimized with database functions
- [ ] Search result caching for popular queries
- [ ] Progressive image loading for search results
- [ ] Database indexes optimized for common filter combinations
- [ ] Search analytics aggregation for insights

**MCP Integration Requirements:**
- [ ] PostgreSQL MCP enables complex search queries and analytics
- [ ] Trending score calculation via stored procedures
- [ ] Search index maintenance through database triggers
- [ ] Facet counting through optimized database functions
- [ ] Search analytics aggregation for performance insights

---

**Estimated Development Time:** 2-3 weeks  
**Team Requirement:** Frontend + Backend developers with search experience  
**External Dependencies:** PostgreSQL full-text search, image CDN for previews  
**Success Metrics:** Search usage rates, filter adoption, zero-result search reduction, conversion from search to purchase