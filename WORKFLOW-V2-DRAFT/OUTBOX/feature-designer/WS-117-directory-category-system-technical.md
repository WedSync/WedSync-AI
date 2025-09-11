# WS-117: Directory Category System - Technical Specification

## Feature Overview
**Feature ID:** WS-117  
**Feature Name:** Directory Category System  
**Team Assignment:** Team B (Backend)  
**Dependencies:** None  
**Status:** Technical Specification Complete  
**Priority:** Medium (Directory Foundation)

## User Stories with Wedding Context

### 🏷️ Story 1: Multi-Category Supplier Listing
**As a** luxury wedding photographer who also offers videography services  
**I want to** list my business under both "Photography - Fine Art" and "Videography - Cinematic" categories  
**So that** couples searching for either service can discover my comprehensive wedding documentation services  

**Wedding Context:** Many wedding suppliers offer multiple services (photographer/videographer, venue/catering, planner/coordinator) and need visibility across relevant categories to maximize bookings during competitive wedding seasons.

### 🎯 Story 2: Specialized Category Browsing
**As a** couple planning a rustic barn wedding  
**I want to** browse suppliers specifically in "Venues - Barns" and "Florals - Country Style" categories  
**So that I can** find vendors who specialize in my specific wedding aesthetic without sifting through irrelevant options  

**Wedding Context:** Wedding styles vary dramatically (luxury, rustic, beach, industrial, traditional) and couples need to find suppliers who align with their vision and have experience with their chosen aesthetic.

### 🔍 Story 3: Category-Based Search Filtering
**As a** wedding coordinator building a vendor team for a destination beach wedding  
**I want to** filter suppliers by "Venues - Beach", "Photography - Documentary", and "Music - Acoustic" categories  
**So that I can** quickly assemble a vendor team experienced with outdoor, coastal wedding environments  

**Wedding Context:** Different wedding venues require vendors with specific expertise - beach weddings need wind-resistant florals, outdoor ceremony specialists, and weather backup plans that certain vendor categories provide.

### 📊 Story 4: Category Performance Analytics
**As a** wedding venue owner listed under "Venues - Historic Buildings"  
**I want to** see analytics on how many couples browse my category vs. book from my category  
**So that I can** understand if I need to optimize my category selection or consider additional category listings  

**Wedding Context:** Suppliers need to understand which categories drive bookings vs. just visibility, especially since some couples search broadly ("venues") while others search specifically ("garden wedding venues").

### 🎨 Story 5: Style Tag Association
**As a** wedding florist specializing in modern minimalist designs  
**I want to** associate my listing with style tags like "Modern", "Minimalist", and "Geometric" within the "Florals" category  
**So that** couples with specific aesthetic preferences can find suppliers who match their design vision  

**Wedding Context:** Wedding aesthetics are highly visual and couples often search by style/mood (boho, classic, modern, rustic) rather than just service type, requiring a flexible tagging system beyond basic categories.

### 🏆 Story 6: Primary Category Business Logic
**As a** supplier who offers wedding planning, floral design, and day-of coordination  
**I want to** set "Planning - Full Service" as my primary category while maintaining secondary listings in other categories  
**So that** my business appears prominently in my main service area while remaining discoverable in related categories  

**Wedding Context:** Wedding suppliers often have a primary specialty that generates most revenue but offer complementary services, requiring category hierarchy that reflects business priorities and search behavior.

## Database Schema Design

```sql
-- Hierarchical category structure with wedding industry taxonomy
CREATE TABLE wedding_supplier_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    
    -- Hierarchy structure
    parent_id UUID REFERENCES wedding_supplier_categories(id),
    hierarchy_path TEXT, -- Materialized path for efficient queries (e.g. 'venues.historic.churches')
    depth INTEGER NOT NULL DEFAULT 0,
    
    -- Display and organization
    display_order INTEGER DEFAULT 0,
    icon_name VARCHAR(50), -- Icon identifier for UI
    color_hex VARCHAR(7), -- Category brand color
    
    -- Wedding industry specific fields
    typical_budget_range VARCHAR(50), -- 'budget', 'mid_range', 'luxury', 'ultra_luxury'
    peak_season_demand BOOLEAN DEFAULT false, -- High demand during wedding season
    requires_booking_lead_time_weeks INTEGER, -- Typical advance booking needed
    
    -- Business rules
    max_suppliers_per_category INTEGER, -- Limit suppliers in exclusive categories
    requires_verification BOOLEAN DEFAULT false, -- Premium categories needing verification
    is_featured BOOLEAN DEFAULT false, -- Featured in main directory navigation
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supplier category assignments with business logic
CREATE TABLE supplier_category_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES wedding_supplier_categories(id),
    
    -- Assignment type and priority
    is_primary BOOLEAN DEFAULT false,
    assignment_priority INTEGER DEFAULT 1, -- 1=primary, 2-5=secondary priorities
    
    -- Wedding business context
    years_experience_in_category INTEGER,
    wedding_count_in_category INTEGER,
    specialization_notes TEXT,
    
    -- Verification and quality
    category_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES user_profiles(id),
    
    -- Performance tracking
    category_booking_rate DECIMAL(4,3), -- Bookings from this category view
    category_inquiry_rate DECIMAL(4,3), -- Inquiries from this category
    last_booking_from_category TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(supplier_id, category_id)
);

-- Style tags for aesthetic-based discovery
CREATE TABLE wedding_style_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    
    -- Visual properties
    color_hex VARCHAR(7),
    icon_name VARCHAR(50),
    sample_image_url TEXT,
    
    -- Category associations
    applicable_category_ids UUID[] DEFAULT '{}', -- Categories this style applies to
    
    -- Wedding industry context
    wedding_style_type VARCHAR(30), -- 'aesthetic', 'venue_style', 'color_palette', 'theme'
    season_popularity JSONB DEFAULT '{}', -- Which seasons this style is popular
    typical_budget_impact VARCHAR(20), -- 'budget_friendly', 'moderate', 'premium'
    
    -- Relationships and trends
    complementary_style_ids UUID[] DEFAULT '{}', -- Styles that pair well together
    trending_score DECIMAL(5,2) DEFAULT 0,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supplier style tag associations
CREATE TABLE supplier_style_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    style_tag_id UUID NOT NULL REFERENCES wedding_style_tags(id),
    category_id UUID NOT NULL REFERENCES wedding_supplier_categories(id),
    
    -- Assignment strength and context
    style_strength VARCHAR(20) DEFAULT 'moderate', -- 'primary', 'strong', 'moderate', 'occasional'
    portfolio_examples_count INTEGER DEFAULT 0,
    client_reviews_mentioning_style INTEGER DEFAULT 0,
    
    -- Business performance
    bookings_attributed_to_style INTEGER DEFAULT 0,
    style_premium_percentage DECIMAL(4,1) DEFAULT 0, -- Price premium for this style
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(supplier_id, style_tag_id, category_id)
);

-- Category search analytics
CREATE TABLE category_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES wedding_supplier_categories(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Search and discovery metrics
    total_views INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    search_appearances INTEGER DEFAULT 0,
    filter_selections INTEGER DEFAULT 0,
    
    -- Supplier interaction metrics
    supplier_profile_clicks INTEGER DEFAULT 0,
    contact_form_submissions INTEGER DEFAULT 0,
    booking_inquiries INTEGER DEFAULT 0,
    actual_bookings INTEGER DEFAULT 0,
    
    -- Wedding context metrics
    seasonal_search_weight DECIMAL(3,2) DEFAULT 1.0,
    avg_wedding_budget_range VARCHAR(50),
    top_wedding_styles VARCHAR(200)[], -- Most associated style searches
    
    PRIMARY KEY (category_id, date)
);

-- Efficient indexes for category operations
CREATE INDEX idx_categories_hierarchy_path ON wedding_supplier_categories 
    USING GIST (hierarchy_path gist_trgm_ops);
CREATE INDEX idx_categories_parent_order ON wedding_supplier_categories(parent_id, display_order);
CREATE INDEX idx_categories_active_featured ON wedding_supplier_categories(is_active, is_featured);

CREATE INDEX idx_supplier_categories_primary ON supplier_category_assignments(supplier_id) 
    WHERE is_primary = true;
CREATE INDEX idx_supplier_categories_category ON supplier_category_assignments(category_id, is_active);
CREATE INDEX idx_supplier_categories_priority ON supplier_category_assignments(supplier_id, assignment_priority);

CREATE INDEX idx_style_tags_category ON supplier_style_assignments(category_id, style_tag_id);
CREATE INDEX idx_style_tags_supplier ON supplier_style_assignments(supplier_id, style_strength);

-- Row Level Security
ALTER TABLE supplier_category_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suppliers can manage their own category assignments" ON supplier_category_assignments
    FOR ALL USING (supplier_id IN (
        SELECT id FROM suppliers WHERE user_id = auth.uid()
    ));

ALTER TABLE supplier_style_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suppliers can manage their own style assignments" ON supplier_style_assignments
    FOR ALL USING (supplier_id IN (
        SELECT id FROM suppliers WHERE user_id = auth.uid()
    ));
```

## API Endpoints

### GET /api/directory/categories
```typescript
interface DirectoryCategoriesRequest {
  includeInactive?: boolean;
  depth?: number; // How many levels deep to return
  parentId?: string; // Get children of specific category
  featuredOnly?: boolean;
}

interface DirectoryCategoriesResponse {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    icon: string;
    colorHex: string;
    depth: number;
    hierarchyPath: string;
    
    // Business context
    supplierCount: number;
    typicalBudgetRange: string;
    peakSeasonDemand: boolean;
    requiredLeadTimeWeeks: number;
    
    // Hierarchy
    parentId?: string;
    children?: DirectoryCategoriesResponse['categories'];
    
    // Analytics
    monthlyViews: number;
    monthlyBookings: number;
    averageRating: number;
    
    // Style associations
    popularStyles: Array<{
      id: string;
      name: string;
      colorHex: string;
      popularityScore: number;
    }>;
  }>;
  
  // Metadata
  totalCategories: number;
  lastUpdated: string;
}
```

### POST /api/suppliers/{supplierId}/categories
```typescript
interface AssignSupplierCategoriesRequest {
  assignments: Array<{
    categoryId: string;
    isPrimary: boolean;
    priority: number; // 1-5, where 1 is primary
    yearsExperience?: number;
    weddingCount?: number;
    specializationNotes?: string;
    styleTagIds?: string[]; // Style tags for this category
  }>;
}

interface AssignSupplierCategoriesResponse {
  success: boolean;
  assignments: Array<{
    id: string;
    categoryId: string;
    categoryName: string;
    isPrimary: boolean;
    priority: number;
    requiresVerification: boolean;
    verificationStatus: 'pending' | 'approved' | 'rejected' | 'not_required';
  }>;
  warnings: string[]; // Business rule violations (non-blocking)
  errors: string[]; // Critical validation errors
}
```

### GET /api/directory/categories/{slug}/suppliers
```typescript
interface CategorySuppliersRequest {
  categorySlug: string;
  styles?: string[]; // Filter by style tag slugs
  budgetRange?: 'budget' | 'mid_range' | 'luxury' | 'ultra_luxury';
  location?: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
  sortBy?: 'relevance' | 'rating' | 'popularity' | 'price_low_high' | 'price_high_low' | 'distance';
  verifiedOnly?: boolean;
  page?: number;
  limit?: number;
}

interface CategorySuppliersResponse {
  suppliers: Array<{
    id: string;
    businessName: string;
    slug: string;
    description: string;
    profileImageUrl: string;
    
    // Category context
    categoryAssignment: {
      isPrimary: boolean;
      priority: number;
      yearsExperience: number;
      weddingCount: number;
      specialization: string;
      verified: boolean;
    };
    
    // Style associations for this category
    styles: Array<{
      id: string;
      name: string;
      strength: 'primary' | 'strong' | 'moderate';
      portfolioCount: number;
    }>;
    
    // Business metrics
    rating: number;
    reviewCount: number;
    bookingRate: number;
    responseTime: string;
    
    // Pricing and availability
    startingPrice?: number;
    currency: string;
    availableForBooking: boolean;
    nextAvailability?: string;
    
    // Location
    city: string;
    state: string;
    country: string;
    serviceRadius: number;
    distance?: number; // If location filter applied
    
    // Wedding context
    specialties: string[];
    weddingStylesServed: string[];
    typicalWeddingSize: string;
    peakSeason: string[];
  }>;
  
  // Filter options based on current results
  availableFilters: {
    styles: Array<{
      id: string;
      name: string;
      count: number;
      colorHex: string;
    }>;
    budgetRanges: Array<{
      range: string;
      count: number;
      priceRange: { min: number; max: number };
    }>;
    locations: Array<{
      city: string;
      state: string;
      count: number;
    }>;
    specialties: Array<{
      name: string;
      count: number;
    }>;
  };
  
  // Pagination and metadata
  pagination: {
    currentPage: number;
    totalPages: number;
    totalSuppliers: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  
  // Category context
  category: {
    id: string;
    name: string;
    description: string;
    supplierCount: number;
    avgBookingRate: number;
    popularStyles: string[];
  };
}
```

### GET /api/directory/style-tags
```typescript
interface StyleTagsRequest {
  categoryId?: string; // Filter to specific category
  weddingStyleType?: 'aesthetic' | 'venue_style' | 'color_palette' | 'theme';
  trending?: boolean; // Only trending styles
}

interface StyleTagsResponse {
  styleTags: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    colorHex: string;
    iconName: string;
    sampleImageUrl: string;
    
    // Category associations
    applicableCategories: Array<{
      id: string;
      name: string;
      supplierCount: number; // Suppliers in this category with this style
    }>;
    
    // Wedding context
    styleType: string;
    seasonPopularity: {
      spring: number;
      summer: number;
      fall: number;
      winter: number;
    };
    budgetImpact: string;
    
    // Trends and relationships
    trendingScore: number;
    totalSuppliers: number;
    complementaryStyles: Array<{
      id: string;
      name: string;
      relationshipStrength: number;
    }>;
    
    // Analytics
    monthlySearches: number;
    monthlyBookings: number;
    conversionRate: number;
  }>;
  
  // Style combinations suggestions
  popularCombinations: Array<{
    styles: string[]; // Style tag IDs
    styleNames: string[];
    combinationName: string; // e.g., "Modern Rustic", "Boho Luxury"
    popularityScore: number;
    supplierCount: number;
  }>;
}
```

## Frontend Components

### CategoryBrowser Component
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, Users, TrendingUp, Star } from 'lucide-react';

interface CategoryBrowserProps {
  onCategorySelect: (categoryId: string, categorySlug: string) => void;
  selectedCategoryId?: string;
}

export function CategoryBrowser({ onCategorySelect, selectedCategoryId }: CategoryBrowserProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedBudgetRange, setSelectedBudgetRange] = useState<string>('all');

  const { data: categories, isLoading } = useQuery({
    queryKey: ['directory-categories'],
    queryFn: async () => {
      const response = await fetch('/api/directory/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  const { data: styleTags } = useQuery({
    queryKey: ['directory-style-tags'],
    queryFn: async () => {
      const response = await fetch('/api/directory/style-tags?trending=true');
      if (!response.ok) throw new Error('Failed to fetch style tags');
      return response.json();
    }
  });

  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const renderCategoryTree = (cats: any[], depth = 0) => {
    return cats.map((category) => (
      <div key={category.id} className={`${depth > 0 ? 'ml-6' : ''} mb-2`}>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedCategoryId === category.id ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => onCategorySelect(category.id, category.slug)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {category.icon && (
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-semibold"
                    style={{ backgroundColor: category.colorHex }}
                  >
                    {category.icon}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg">{category.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                  
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {category.supplierCount} suppliers
                    </span>
                    
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {category.averageRating.toFixed(1)} avg rating
                    </span>
                    
                    {category.peakSeasonDemand && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Peak Demand
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-1">
                  {category.typicalBudgetRange.replace('_', ' ').toUpperCase()}
                </div>
                <div className="text-xs text-gray-400">
                  {category.requiredLeadTimeWeeks}+ weeks lead time
                </div>
                
                {category.children && category.children.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCategoryExpansion(category.id);
                    }}
                    className="mt-2"
                  >
                    <ChevronRight 
                      className={`h-4 w-4 transition-transform ${
                        expandedCategories.has(category.id) ? 'rotate-90' : ''
                      }`} 
                    />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Popular Styles for this category */}
            {category.popularStyles.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500 mb-2">Popular Styles:</div>
                <div className="flex flex-wrap gap-1">
                  {category.popularStyles.slice(0, 4).map((style: any) => (
                    <Badge 
                      key={style.id}
                      variant="outline" 
                      className="text-xs"
                      style={{ borderColor: style.colorHex, color: style.colorHex }}
                    >
                      {style.name}
                    </Badge>
                  ))}
                  {category.popularStyles.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{category.popularStyles.length - 4} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Render subcategories if expanded */}
        {category.children && 
         category.children.length > 0 && 
         expandedCategories.has(category.id) && (
          <div className="mt-2">
            {renderCategoryTree(category.children, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Budget Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Browse by Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedBudgetRange} onValueChange={setSelectedBudgetRange}>
            <SelectTrigger>
              <SelectValue placeholder="Select budget range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Budget Ranges</SelectItem>
              <SelectItem value="budget">Budget Friendly</SelectItem>
              <SelectItem value="mid_range">Mid Range</SelectItem>
              <SelectItem value="luxury">Luxury</SelectItem>
              <SelectItem value="ultra_luxury">Ultra Luxury</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Trending Styles */}
      {styleTags && styleTags.styleTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trending Styles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {styleTags.styleTags.slice(0, 6).map((style: any) => (
                <div 
                  key={style.id}
                  className="flex items-center gap-2 p-2 rounded-lg border hover:bg-gray-50 cursor-pointer"
                  style={{ borderColor: style.colorHex + '30' }}
                >
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: style.colorHex }}
                  ></div>
                  <span className="text-sm font-medium">{style.name}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {style.totalSuppliers}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Tree */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold mb-4">Wedding Supplier Categories</h2>
        {categories && renderCategoryTree(categories.categories)}
      </div>
    </div>
  );
}

export default CategoryBrowser;
```

## Integration Services

### Category Service Implementation
```typescript
// lib/services/category-service.ts
import { createClient } from '@/lib/supabase/client';

interface CategoryAssignment {
  categoryId: string;
  isPrimary: boolean;
  priority: number;
  yearsExperience?: number;
  weddingCount?: number;
  specializationNotes?: string;
  styleTagIds?: string[];
}

class CategoryService {
  private supabase = createClient();

  async getDirectoryCategories(options: {
    includeInactive?: boolean;
    depth?: number;
    parentId?: string;
    featuredOnly?: boolean;
  } = {}) {
    let query = this.supabase
      .from('wedding_supplier_categories')
      .select(`
        *,
        children:wedding_supplier_categories!parent_id(*),
        supplier_count:supplier_category_assignments(count),
        popular_styles:wedding_style_tags(*)
      `);

    if (!options.includeInactive) {
      query = query.eq('is_active', true);
    }

    if (options.featuredOnly) {
      query = query.eq('is_featured', true);
    }

    if (options.parentId) {
      query = query.eq('parent_id', options.parentId);
    } else {
      query = query.is('parent_id', null); // Root categories only
    }

    query = query.order('display_order');

    const { data: categories, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    // Build hierarchical structure with analytics
    return this.enrichCategoriesWithAnalytics(categories || []);
  }

  async assignSupplierCategories(supplierId: string, assignments: CategoryAssignment[]) {
    // Validate business rules
    await this.validateCategoryAssignments(supplierId, assignments);

    // Ensure only one primary category
    const primaryAssignments = assignments.filter(a => a.isPrimary);
    if (primaryAssignments.length > 1) {
      throw new Error('A supplier can have only one primary category');
    }

    if (primaryAssignments.length === 0) {
      throw new Error('A supplier must have one primary category');
    }

    // Maximum 3 total categories per supplier
    if (assignments.length > 3) {
      throw new Error('A supplier can be assigned to maximum 3 categories');
    }

    // Clear existing assignments
    await this.supabase
      .from('supplier_category_assignments')
      .delete()
      .eq('supplier_id', supplierId);

    // Create new assignments
    const assignmentData = assignments.map(assignment => ({
      supplier_id: supplierId,
      category_id: assignment.categoryId,
      is_primary: assignment.isPrimary,
      assignment_priority: assignment.priority,
      years_experience_in_category: assignment.yearsExperience,
      wedding_count_in_category: assignment.weddingCount,
      specialization_notes: assignment.specializationNotes,
      created_at: new Date().toISOString()
    }));

    const { data: createdAssignments, error } = await this.supabase
      .from('supplier_category_assignments')
      .insert(assignmentData)
      .select(`
        *,
        category:wedding_supplier_categories(*)
      `);

    if (error) {
      throw new Error(`Failed to assign categories: ${error.message}`);
    }

    // Handle style tag assignments
    for (const assignment of assignments) {
      if (assignment.styleTagIds && assignment.styleTagIds.length > 0) {
        await this.assignSupplierStyleTags(
          supplierId, 
          assignment.categoryId, 
          assignment.styleTagIds
        );
      }
    }

    return createdAssignments;
  }

  async getCategorySuppliers(categorySlug: string, filters: {
    styles?: string[];
    budgetRange?: string;
    location?: { latitude: number; longitude: number; radiusKm: number };
    sortBy?: string;
    verifiedOnly?: boolean;
    page?: number;
    limit?: number;
  } = {}) {
    const { page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    // Get category details
    const { data: category } = await this.supabase
      .from('wedding_supplier_categories')
      .select('*')
      .eq('slug', categorySlug)
      .single();

    if (!category) {
      throw new Error('Category not found');
    }

    // Build supplier query with filters
    let query = this.supabase
      .from('supplier_category_assignments')
      .select(`
        *,
        supplier:suppliers(
          *,
          user:user_profiles(*),
          reviews:supplier_reviews(rating),
          style_assignments:supplier_style_assignments(
            *,
            style_tag:wedding_style_tags(*)
          )
        ),
        category:wedding_supplier_categories(*)
      `)
      .eq('category_id', category.id)
      .eq('is_active', true);

    if (filters.verifiedOnly) {
      query = query.eq('category_verified', true);
    }

    // Apply style filters
    if (filters.styles && filters.styles.length > 0) {
      // This would need a more complex query joining style assignments
      // For now, we'll filter in post-processing
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'rating':
        // Would need to calculate average rating
        break;
      case 'popularity':
        query = query.order('category_booking_rate', { ascending: false });
        break;
      case 'price_low_high':
        // Would need to join pricing data
        break;
      default:
        query = query.order('assignment_priority');
    }

    query = query.range(offset, offset + limit - 1);

    const { data: assignments, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch category suppliers: ${error.message}`);
    }

    // Process and enrich supplier data
    const suppliers = (assignments || []).map(assignment => this.enrichSupplierData(assignment));

    // Get available filters based on current results
    const availableFilters = await this.getAvailableFilters(category.id, suppliers);

    return {
      suppliers,
      availableFilters,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil((count || 0) / limit),
        totalSuppliers: count || 0,
        hasNextPage: page * limit < (count || 0),
        hasPreviousPage: page > 1
      },
      category: {
        id: category.id,
        name: category.name,
        description: category.description,
        supplierCount: count || 0,
        avgBookingRate: 0, // Would calculate from analytics
        popularStyles: [] // Would fetch from style analytics
      }
    };
  }

  private async validateCategoryAssignments(supplierId: string, assignments: CategoryAssignment[]) {
    // Check if categories exist and are active
    const categoryIds = assignments.map(a => a.categoryId);
    const { data: categories } = await this.supabase
      .from('wedding_supplier_categories')
      .select('id, name, max_suppliers_per_category, requires_verification')
      .in('id', categoryIds)
      .eq('is_active', true);

    if (!categories || categories.length !== assignments.length) {
      throw new Error('Some specified categories are invalid or inactive');
    }

    // Check category capacity limits
    for (const category of categories) {
      if (category.max_suppliers_per_category) {
        const { count } = await this.supabase
          .from('supplier_category_assignments')
          .select('*', { count: 'exact' })
          .eq('category_id', category.id)
          .eq('is_active', true);

        if ((count || 0) >= category.max_suppliers_per_category) {
          throw new Error(`Category "${category.name}" has reached its supplier limit`);
        }
      }
    }
  }

  private async assignSupplierStyleTags(
    supplierId: string, 
    categoryId: string, 
    styleTagIds: string[]
  ) {
    // Clear existing style assignments for this category
    await this.supabase
      .from('supplier_style_assignments')
      .delete()
      .eq('supplier_id', supplierId)
      .eq('category_id', categoryId);

    // Create new style assignments
    const styleAssignments = styleTagIds.map(styleTagId => ({
      supplier_id: supplierId,
      category_id: categoryId,
      style_tag_id: styleTagId,
      style_strength: 'moderate', // Default, could be specified
      created_at: new Date().toISOString()
    }));

    const { error } = await this.supabase
      .from('supplier_style_assignments')
      .insert(styleAssignments);

    if (error) {
      console.error('Failed to assign style tags:', error);
    }
  }

  private async enrichCategoriesWithAnalytics(categories: any[]) {
    // Add analytics data to categories
    for (const category of categories) {
      // Get supplier count
      const { count: supplierCount } = await this.supabase
        .from('supplier_category_assignments')
        .select('*', { count: 'exact' })
        .eq('category_id', category.id)
        .eq('is_active', true);

      category.supplierCount = supplierCount || 0;

      // Get average rating (would be calculated from supplier reviews)
      category.averageRating = 4.2; // Placeholder

      // Get monthly analytics
      const { data: analytics } = await this.supabase
        .from('category_analytics')
        .select('*')
        .eq('category_id', category.id)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .single();

      category.monthlyViews = analytics?.total_views || 0;
      category.monthlyBookings = analytics?.actual_bookings || 0;

      // Get popular styles for this category
      const { data: popularStyles } = await this.supabase
        .from('supplier_style_assignments')
        .select(`
          style_tag:wedding_style_tags(*),
          count(*)
        `)
        .eq('category_id', category.id)
        .group('style_tag_id')
        .order('count', { ascending: false })
        .limit(5);

      category.popularStyles = popularStyles?.map(ps => ({
        ...ps.style_tag,
        popularityScore: ps.count
      })) || [];
    }

    return { categories, totalCategories: categories.length, lastUpdated: new Date().toISOString() };
  }

  private enrichSupplierData(assignment: any) {
    const supplier = assignment.supplier;
    
    return {
      id: supplier.id,
      businessName: supplier.business_name,
      slug: supplier.slug,
      description: supplier.description,
      profileImageUrl: supplier.profile_image_url,
      
      categoryAssignment: {
        isPrimary: assignment.is_primary,
        priority: assignment.assignment_priority,
        yearsExperience: assignment.years_experience_in_category || 0,
        weddingCount: assignment.wedding_count_in_category || 0,
        specialization: assignment.specialization_notes || '',
        verified: assignment.category_verified
      },
      
      styles: supplier.style_assignments?.map((sa: any) => ({
        id: sa.style_tag.id,
        name: sa.style_tag.name,
        strength: sa.style_strength,
        portfolioCount: sa.portfolio_examples_count || 0
      })) || [],
      
      rating: this.calculateAverageRating(supplier.reviews || []),
      reviewCount: supplier.reviews?.length || 0,
      bookingRate: assignment.category_booking_rate || 0,
      responseTime: '2 hours', // Placeholder
      
      startingPrice: supplier.starting_price_cents ? supplier.starting_price_cents / 100 : null,
      currency: 'USD',
      availableForBooking: supplier.accepting_bookings,
      nextAvailability: supplier.next_availability,
      
      city: supplier.city,
      state: supplier.state,
      country: supplier.country,
      serviceRadius: supplier.service_radius_km || 50,
      
      specialties: supplier.specialties || [],
      weddingStylesServed: [], // Would derive from style assignments
      typicalWeddingSize: supplier.typical_wedding_size || 'All sizes',
      peakSeason: supplier.peak_seasons || []
    };
  }

  private calculateAverageRating(reviews: any[]): number {
    if (!reviews.length) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return Number((sum / reviews.length).toFixed(1));
  }

  private async getAvailableFilters(categoryId: string, suppliers: any[]) {
    // Generate filter options based on current supplier set
    return {
      styles: [],
      budgetRanges: [],
      locations: [],
      specialties: []
    };
  }
}

export const categoryService = new CategoryService();
```

## Testing Requirements

### Unit Tests
```typescript
// __tests__/category-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categoryService } from '@/lib/services/category-service';

describe('CategoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch directory categories hierarchically', async () => {
    const categories = await categoryService.getDirectoryCategories();
    
    expect(categories).toHaveProperty('categories');
    expect(categories.categories).toBeInstanceOf(Array);
    expect(categories).toHaveProperty('totalCategories');
  });

  it('should validate category assignments correctly', async () => {
    const assignments = [
      {
        categoryId: 'cat-1',
        isPrimary: true,
        priority: 1
      },
      {
        categoryId: 'cat-2',
        isPrimary: false,
        priority: 2
      }
    ];

    await expect(
      categoryService.assignSupplierCategories('supplier-1', assignments)
    ).resolves.not.toThrow();
  });

  it('should reject multiple primary categories', async () => {
    const assignments = [
      {
        categoryId: 'cat-1',
        isPrimary: true,
        priority: 1
      },
      {
        categoryId: 'cat-2',
        isPrimary: true,
        priority: 2
      }
    ];

    await expect(
      categoryService.assignSupplierCategories('supplier-1', assignments)
    ).rejects.toThrow('only one primary category');
  });
});
```

## Acceptance Criteria

### ✅ Hierarchical Category Structure
- [ ] Categories organized in parent-child hierarchy (venues > barns > rustic barns)
- [ ] Each category displays supplier count, average rating, and typical budget range
- [ ] Category icons and colors provide visual organization
- [ ] Featured categories highlighted in main directory navigation
- [ ] Category depth limited to 3 levels maximum

### ✅ Multi-Category Supplier Assignment
- [ ] Suppliers can be assigned to maximum 3 categories
- [ ] One primary category required, others are secondary
- [ ] Priority ordering determines display prominence
- [ ] Years experience and wedding count tracked per category
- [ ] Category verification for premium placements

### ✅ Style Tag System
- [ ] Style tags associated with specific categories
- [ ] Suppliers can claim multiple styles per category
- [ ] Style strength levels (primary, strong, moderate)
- [ ] Portfolio examples count tracked per style
- [ ] Trending styles highlighted in UI

### ✅ Category-Based Search & Filtering
- [ ] Suppliers filterable by category, style, budget range
- [ ] Location-based filtering with service radius
- [ ] Sort options include rating, popularity, price, distance
- [ ] Filter counts updated based on current result set
- [ ] Available filters generated dynamically

### ✅ Analytics & Business Intelligence
- [ ] Category view counts and booking rates tracked
- [ ] Popular style combinations identified
- [ ] Seasonal demand patterns recognized
- [ ] Supplier performance analytics per category
- [ ] Category capacity limits enforced

**MCP Integration Requirements:**
- [ ] PostgreSQL MCP enables complex category hierarchy queries
- [ ] Category analytics aggregation via database functions
- [ ] Style tag relationship analysis through SQL
- [ ] Supplier filtering optimized with database indexes
- [ ] Category performance metrics calculated efficiently

---

**Estimated Development Time:** 2-3 weeks  
**Team Requirement:** Backend team with taxonomy and search experience  
**External Dependencies:** None (internal directory system)  
**Success Metrics:** Category usage rates, supplier discovery rates, filter adoption, booking conversion by category