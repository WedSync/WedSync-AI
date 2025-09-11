/**
 * WS-114: Marketplace Filter Sidebar Component
 *
 * Multi-faceted filtering UI with dynamic filter options, price range sliders,
 * category filters, ratings, tags, and wedding types.
 *
 * Team B - Batch 9 - Round 1
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Star,
  DollarSign,
  Filter,
  X,
  Loader2,
  Hash,
  Crown,
  Calendar,
  Camera,
  Utensils,
  Building,
  Clipboard,
  Flower,
  Music,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

// =====================================================================================
// INTERFACES
// =====================================================================================

interface FacetItem {
  value: string;
  label: string;
  count: number;
  percentage?: number;
}

interface PriceRangeFacet {
  min: number;
  max: number;
  label: string;
  count: number;
  percentage?: number;
}

interface FacetsData {
  categories: FacetItem[];
  subcategories: FacetItem[];
  tiers: FacetItem[];
  priceRanges: PriceRangeFacet[];
  ratings: FacetItem[];
  tags: FacetItem[];
  weddingTypes: FacetItem[];
  priceStats: {
    min: number;
    max: number;
    avg: number;
    median: number;
  };
  ratingStats: {
    min: number;
    max: number;
    avg: number;
    distribution: { [rating: string]: number };
  };
}

interface SearchFilters {
  category?: string;
  subcategory?: string;
  priceMin?: number;
  priceMax?: number;
  ratingMin?: number;
  tier?: string;
  tags?: string[];
  weddingTypes?: string[];
}

interface FilterSidebarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  searchQuery: string;
  isLoading?: boolean;
  className?: string;
}

interface FilterSectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  count?: number;
}

// =====================================================================================
// SUB-COMPONENTS
// =====================================================================================

function FilterSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
  count,
}: FilterSectionProps) {
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-medium text-gray-900">{title}</span>
          {count !== undefined && count > 0 && (
            <Badge variant="secondary" className="text-xs">
              {count}
            </Badge>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function FacetList({
  items,
  selectedValue,
  onSelect,
  showCount = true,
  multiSelect = false,
  selectedValues = [],
}: {
  items: FacetItem[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  showCount?: boolean;
  multiSelect?: boolean;
  selectedValues?: string[];
}) {
  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {items.map((item) => {
        const isSelected = multiSelect
          ? selectedValues.includes(item.value)
          : selectedValue === item.value;

        return (
          <div
            key={item.value}
            className="flex items-center justify-between py-1"
          >
            <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
              {multiSelect ? (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onSelect(item.value)}
                />
              ) : (
                <input
                  type="radio"
                  checked={isSelected}
                  onChange={() => onSelect(item.value)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
              )}
              <span
                className={`text-sm truncate ${isSelected ? 'font-medium text-purple-600' : 'text-gray-700'}`}
              >
                {item.label}
              </span>
            </label>
            {showCount && (
              <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                {item.count.toLocaleString()}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PriceRangeSlider({
  min,
  max,
  value,
  onChange,
  formatValue,
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatValue: (value: number) => string;
}) {
  return (
    <div className="space-y-4">
      <Slider
        value={value}
        onValueChange={onChange}
        min={min}
        max={max}
        step={Math.max(1, Math.floor((max - min) / 100))}
        className="w-full"
      />
      <div className="flex justify-between text-sm text-gray-600">
        <span>{formatValue(value[0])}</span>
        <span>{formatValue(value[1])}</span>
      </div>
    </div>
  );
}

// =====================================================================================
// MAIN COMPONENT
// =====================================================================================

export function MarketplaceFilterSidebar({
  filters,
  onFiltersChange,
  searchQuery,
  isLoading = false,
  className = '',
}: FilterSidebarProps) {
  // State for collapsible sections
  const [openSections, setOpenSections] = useState({
    categories: true,
    price: true,
    ratings: true,
    tiers: false,
    tags: false,
    weddingTypes: false,
  });

  // Facets data
  const [facetsData, setFacetsData] = useState<FacetsData | null>(null);
  const [facetsLoading, setFacetsLoading] = useState(false);

  // Price range state
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);

  // =====================================================================================
  // EFFECTS
  // =====================================================================================

  // Load facets data when filters or search query changes
  useEffect(() => {
    loadFacets();
  }, [searchQuery, filters.category, filters.tier]);

  // Update price range when facets data loads
  useEffect(() => {
    if (facetsData?.priceStats) {
      const newMin = filters.priceMin ?? facetsData.priceStats.min;
      const newMax = filters.priceMax ?? facetsData.priceStats.max;
      setPriceRange([newMin, newMax]);
    }
  }, [facetsData, filters.priceMin, filters.priceMax]);

  // =====================================================================================
  // API FUNCTIONS
  // =====================================================================================

  const loadFacets = useCallback(async () => {
    setFacetsLoading(true);
    try {
      const params = new URLSearchParams();

      if (searchQuery) params.append('q', searchQuery);
      if (filters.category) params.append('category', filters.category);
      if (filters.subcategory)
        params.append('subcategory', filters.subcategory);
      if (filters.tier) params.append('tier', filters.tier);
      if (filters.priceMin !== undefined)
        params.append('price_min', filters.priceMin.toString());
      if (filters.priceMax !== undefined)
        params.append('price_max', filters.priceMax.toString());
      if (filters.ratingMin !== undefined)
        params.append('rating_min', filters.ratingMin.toString());
      if (filters.tags?.length) params.append('tags', filters.tags.join(','));
      if (filters.weddingTypes?.length)
        params.append('wedding_types', filters.weddingTypes.join(','));

      const response = await fetch(`/api/marketplace/search/facets?${params}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFacetsData(data.facets);
        }
      }
    } catch (error) {
      console.error('Failed to load facets:', error);
    } finally {
      setFacetsLoading(false);
    }
  }, [searchQuery, filters]);

  // =====================================================================================
  // EVENT HANDLERS
  // =====================================================================================

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const updateFilters = (updates: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const clearFilters = () => {
    onFiltersChange({});
    setPriceRange([
      facetsData?.priceStats.min || 0,
      facetsData?.priceStats.max || 10000,
    ]);
  };

  const handleCategorySelect = (category: string) => {
    const newCategory = filters.category === category ? undefined : category;
    updateFilters({
      category: newCategory,
      subcategory: undefined, // Clear subcategory when category changes
    });
  };

  const handleSubcategorySelect = (subcategory: string) => {
    const newSubcategory =
      filters.subcategory === subcategory ? undefined : subcategory;
    updateFilters({ subcategory: newSubcategory });
  };

  const handleTierSelect = (tier: string) => {
    const newTier = filters.tier === tier ? undefined : tier;
    updateFilters({ tier: newTier });
  };

  const handleRatingSelect = (rating: string) => {
    const ratingValue = parseFloat(rating);
    const newRating =
      filters.ratingMin === ratingValue ? undefined : ratingValue;
    updateFilters({ ratingMin: newRating });
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];

    updateFilters({ tags: newTags.length > 0 ? newTags : undefined });
  };

  const handleWeddingTypeToggle = (type: string) => {
    const currentTypes = filters.weddingTypes || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];

    updateFilters({ weddingTypes: newTypes.length > 0 ? newTypes : undefined });
  };

  const handlePriceRangeChange = (value: [number, number]) => {
    setPriceRange(value);
  };

  const handlePriceRangeCommit = () => {
    updateFilters({
      priceMin:
        priceRange[0] > (facetsData?.priceStats.min || 0)
          ? priceRange[0]
          : undefined,
      priceMax:
        priceRange[1] < (facetsData?.priceStats.max || 10000)
          ? priceRange[1]
          : undefined,
    });
  };

  // =====================================================================================
  // UTILITY FUNCTIONS
  // =====================================================================================

  const formatPrice = (cents: number): string => {
    const pounds = cents / 100;
    return pounds >= 1000
      ? `£${(pounds / 1000).toFixed(1)}k`
      : `£${pounds.toFixed(0)}`;
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      photography: <Camera className="h-4 w-4" />,
      catering: <Utensils className="h-4 w-4" />,
      venue: <Building className="h-4 w-4" />,
      planning: <Clipboard className="h-4 w-4" />,
      florals: <Flower className="h-4 w-4" />,
      music: <Music className="h-4 w-4" />,
    };
    return icons[category] || <Filter className="h-4 w-4" />;
  };

  const getAppliedFiltersCount = (): number => {
    let count = 0;
    if (filters.category) count++;
    if (filters.subcategory) count++;
    if (filters.tier) count++;
    if (filters.priceMin !== undefined || filters.priceMax !== undefined)
      count++;
    if (filters.ratingMin !== undefined) count++;
    if (filters.tags?.length) count += filters.tags.length;
    if (filters.weddingTypes?.length) count += filters.weddingTypes.length;
    return count;
  };

  // =====================================================================================
  // RENDER
  // =====================================================================================

  const appliedFiltersCount = getAppliedFiltersCount();

  return (
    <div className={`w-80 bg-white border-r border-gray-200 ${className}`}>
      <ScrollArea className="h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
              {appliedFiltersCount > 0 && (
                <Badge variant="secondary">{appliedFiltersCount}</Badge>
              )}
            </h3>
            {appliedFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-purple-600 hover:text-purple-700"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        {facetsLoading && (
          <div className="p-4 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            <span className="ml-2 text-gray-500">Loading filters...</span>
          </div>
        )}

        {/* Categories */}
        {facetsData?.categories && facetsData.categories.length > 0 && (
          <FilterSection
            title="Categories"
            icon={<Filter className="h-4 w-4 text-purple-500" />}
            isOpen={openSections.categories}
            onToggle={() => toggleSection('categories')}
            count={filters.category ? 1 : 0}
          >
            <FacetList
              items={facetsData.categories}
              selectedValue={filters.category}
              onSelect={handleCategorySelect}
            />
          </FilterSection>
        )}

        {/* Subcategories - only show if category is selected */}
        {facetsData?.subcategories &&
          facetsData.subcategories.length > 0 &&
          filters.category && (
            <FilterSection
              title="Subcategories"
              icon={getCategoryIcon(filters.category)}
              isOpen={openSections.categories}
              onToggle={() => toggleSection('categories')}
              count={filters.subcategory ? 1 : 0}
            >
              <FacetList
                items={facetsData.subcategories}
                selectedValue={filters.subcategory}
                onSelect={handleSubcategorySelect}
              />
            </FilterSection>
          )}

        {/* Price Range */}
        {facetsData?.priceStats && (
          <FilterSection
            title="Price Range"
            icon={<DollarSign className="h-4 w-4 text-green-500" />}
            isOpen={openSections.price}
            onToggle={() => toggleSection('price')}
            count={
              filters.priceMin !== undefined || filters.priceMax !== undefined
                ? 1
                : 0
            }
          >
            <div className="space-y-4">
              <PriceRangeSlider
                min={facetsData.priceStats.min}
                max={facetsData.priceStats.max}
                value={priceRange}
                onChange={handlePriceRangeChange}
                formatValue={formatPrice}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handlePriceRangeCommit}
                className="w-full"
              >
                Apply Price Filter
              </Button>

              {/* Quick price ranges */}
              {facetsData.priceRanges && facetsData.priceRanges.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 mb-2">Quick ranges:</p>
                  {facetsData.priceRanges.map((range) => (
                    <button
                      key={range.label}
                      onClick={() => {
                        setPriceRange([
                          range.min,
                          range.max === Infinity
                            ? facetsData.priceStats.max
                            : range.max,
                        ]);
                        setTimeout(handlePriceRangeCommit, 100);
                      }}
                      className="w-full text-left text-xs p-2 rounded hover:bg-gray-50 flex justify-between"
                    >
                      <span>{range.label}</span>
                      <span className="text-gray-500">{range.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FilterSection>
        )}

        {/* Ratings */}
        {facetsData?.ratings && facetsData.ratings.length > 0 && (
          <FilterSection
            title="Rating"
            icon={<Star className="h-4 w-4 text-yellow-500" />}
            isOpen={openSections.ratings}
            onToggle={() => toggleSection('ratings')}
            count={filters.ratingMin !== undefined ? 1 : 0}
          >
            <FacetList
              items={facetsData.ratings.map((rating) => ({
                ...rating,
                label: (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span>{rating.label}</span>
                  </div>
                ),
              }))}
              selectedValue={filters.ratingMin?.toString()}
              onSelect={handleRatingSelect}
            />
          </FilterSection>
        )}

        {/* Tiers */}
        {facetsData?.tiers && facetsData.tiers.length > 0 && (
          <FilterSection
            title="Subscription Tier"
            icon={<Crown className="h-4 w-4 text-orange-500" />}
            isOpen={openSections.tiers}
            onToggle={() => toggleSection('tiers')}
            count={filters.tier ? 1 : 0}
          >
            <FacetList
              items={facetsData.tiers}
              selectedValue={filters.tier}
              onSelect={handleTierSelect}
            />
          </FilterSection>
        )}

        {/* Tags */}
        {facetsData?.tags && facetsData.tags.length > 0 && (
          <FilterSection
            title="Tags"
            icon={<Hash className="h-4 w-4 text-blue-500" />}
            isOpen={openSections.tags}
            onToggle={() => toggleSection('tags')}
            count={filters.tags?.length || 0}
          >
            <FacetList
              items={facetsData.tags}
              selectedValues={filters.tags || []}
              onSelect={handleTagToggle}
              multiSelect={true}
            />
          </FilterSection>
        )}

        {/* Wedding Types */}
        {facetsData?.weddingTypes && facetsData.weddingTypes.length > 0 && (
          <FilterSection
            title="Wedding Types"
            icon={<Calendar className="h-4 w-4 text-pink-500" />}
            isOpen={openSections.weddingTypes}
            onToggle={() => toggleSection('weddingTypes')}
            count={filters.weddingTypes?.length || 0}
          >
            <FacetList
              items={facetsData.weddingTypes}
              selectedValues={filters.weddingTypes || []}
              onSelect={handleWeddingTypeToggle}
              multiSelect={true}
            />
          </FilterSection>
        )}

        {/* Results Summary */}
        {facetsData && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              <p>
                Found in{' '}
                {facetsData.categories.reduce((sum, cat) => sum + cat.count, 0)}{' '}
                templates
              </p>
              {facetsData.priceStats && (
                <p className="mt-1">
                  Average price: {formatPrice(facetsData.priceStats.avg)}
                </p>
              )}
              {facetsData.ratingStats && (
                <p className="mt-1">
                  Average rating: {facetsData.ratingStats.avg.toFixed(1)} stars
                </p>
              )}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
