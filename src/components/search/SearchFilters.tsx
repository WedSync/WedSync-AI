'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card-untitled';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Star,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Clock,
  Award,
  Verified,
  Sparkles,
  Tag,
} from 'lucide-react';

interface SearchFiltersState {
  query: string;
  vendorCategories: string[];
  location: {
    city?: string;
    region?: string;
    radius?: number;
    coordinates?: [number, number];
  };
  priceRange: {
    min?: number;
    max?: number;
    currency: string;
  };
  availability: {
    startDate?: Date;
    endDate?: Date;
    flexible?: boolean;
  };
  reviewScore: {
    minRating?: number;
    minReviews?: number;
  };
  sortBy:
    | 'relevance'
    | 'price_asc'
    | 'price_desc'
    | 'rating'
    | 'distance'
    | 'recent';
  advancedFilters: Record<string, any>;
}

interface SearchFiltersProps {
  filters: SearchFiltersState;
  onChange: (key: keyof SearchFiltersState, value: any) => void;
  onAdvancedChange: (key: string, value: any) => void;
  className?: string;
  compact?: boolean;
}

interface FilterSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
}

const VENDOR_CATEGORIES = [
  'Photography',
  'Videography',
  'Venues',
  'Catering',
  'Florists',
  'Music & DJ',
  'Wedding Cake',
  'Bridal Wear',
  'Menswear',
  'Hair & Makeup',
  'Transport',
  'Entertainment',
  'Stationery',
  'Decorations',
  'Jewellery',
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'distance', label: 'Nearest First' },
  { value: 'recent', label: 'Recently Added' },
];

const BUDGET_RANGES = [
  { value: [0, 500], label: 'Under £500' },
  { value: [500, 1000], label: '£500 - £1,000' },
  { value: [1000, 2500], label: '£1,000 - £2,500' },
  { value: [2500, 5000], label: '£2,500 - £5,000' },
  { value: [5000, 10000], label: '£5,000 - £10,000' },
  { value: [10000, null], label: '£10,000+' },
];

export function SearchFilters({
  filters,
  onChange,
  onAdvancedChange,
  className,
  compact = false,
}: SearchFiltersProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['general', 'categories']),
  );

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleCategoryToggle = (category: string) => {
    const currentCategories = filters.vendorCategories;
    const updatedCategories = currentCategories.includes(category)
      ? currentCategories.filter((c) => c !== category)
      : [...currentCategories, category];
    onChange('vendorCategories', updatedCategories);
  };

  const handleBudgetRangeSelect = (range: [number, number | null]) => {
    onChange('priceRange', {
      ...filters.priceRange,
      min: range[0],
      max: range[1],
    });
  };

  const FilterSection = ({
    id,
    title,
    icon,
    children,
    badge,
  }: {
    id: string;
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    badge?: number;
  }) => {
    const isExpanded = expandedSections.has(id);

    return (
      <div className="border rounded-lg">
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto"
          onClick={() => toggleSection(id)}
        >
          <div className="flex items-center space-x-2">
            {icon}
            <span className="font-medium">{title}</span>
            {badge && badge > 0 && (
              <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                {badge}
              </Badge>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>

        {isExpanded && <div className="p-4 pt-0 border-t">{children}</div>}
      </div>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Sort Options */}
      <FilterSection
        id="general"
        title="Sort & Display"
        icon={<Filter className="w-4 h-4" />}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="sortBy">Sort Results By</Label>
            <Select
              value={filters.sortBy}
              onValueChange={(value) => onChange('sortBy', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="verified-only"
              checked={filters.advancedFilters.verifiedOnly || false}
              onCheckedChange={(checked) =>
                onAdvancedChange('verifiedOnly', checked)
              }
            />
            <Label
              htmlFor="verified-only"
              className="flex items-center space-x-1"
            >
              <Verified className="w-4 h-4" />
              <span>Verified vendors only</span>
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="featured-only"
              checked={filters.advancedFilters.featuredOnly || false}
              onCheckedChange={(checked) =>
                onAdvancedChange('featuredOnly', checked)
              }
            />
            <Label
              htmlFor="featured-only"
              className="flex items-center space-x-1"
            >
              <Sparkles className="w-4 h-4" />
              <span>Featured listings only</span>
            </Label>
          </div>
        </div>
      </FilterSection>

      {/* Category Filters */}
      <FilterSection
        id="categories"
        title="Vendor Categories"
        icon={<Tag className="w-4 h-4" />}
        badge={filters.vendorCategories.length}
      >
        <div className="grid grid-cols-2 gap-2">
          {VENDOR_CATEGORIES.map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={`category-${category}`}
                checked={filters.vendorCategories.includes(category)}
                onCheckedChange={() => handleCategoryToggle(category)}
              />
              <Label
                htmlFor={`category-${category}`}
                className="text-sm cursor-pointer"
              >
                {category}
              </Label>
            </div>
          ))}
        </div>

        {filters.vendorCategories.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex flex-wrap gap-2">
              {filters.vendorCategories.map((category) => (
                <Badge
                  key={category}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {category}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-500"
                    onClick={() => handleCategoryToggle(category)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </FilterSection>

      {/* Budget Range */}
      <FilterSection
        id="budget"
        title="Budget Range"
        icon={<DollarSign className="w-4 h-4" />}
        badge={filters.priceRange.min || filters.priceRange.max ? 1 : 0}
      >
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-gray-600 mb-2 block">
              Quick Budget Ranges
            </Label>
            <div className="grid grid-cols-1 gap-2">
              {BUDGET_RANGES.map((range, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className={cn(
                    'justify-start',
                    filters.priceRange.min === range.value[0] &&
                      filters.priceRange.max === range.value[1] &&
                      'bg-primary/10 border-primary',
                  )}
                  onClick={() => handleBudgetRangeSelect(range.value)}
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min-price">Min Price (£)</Label>
              <Input
                id="min-price"
                type="number"
                placeholder="0"
                value={filters.priceRange.min || ''}
                onChange={(e) =>
                  onChange('priceRange', {
                    ...filters.priceRange,
                    min: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="max-price">Max Price (£)</Label>
              <Input
                id="max-price"
                type="number"
                placeholder="No limit"
                value={filters.priceRange.max || ''}
                onChange={(e) =>
                  onChange('priceRange', {
                    ...filters.priceRange,
                    max: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              />
            </div>
          </div>
        </div>
      </FilterSection>

      {/* Rating & Reviews */}
      <FilterSection
        id="rating"
        title="Rating & Reviews"
        icon={<Star className="w-4 h-4" />}
        badge={filters.reviewScore.minRating ? 1 : 0}
      >
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-gray-600 mb-2 block">
              Minimum Rating: {filters.reviewScore.minRating || 0} stars
            </Label>
            <Slider
              value={[filters.reviewScore.minRating || 0]}
              onValueChange={([value]) =>
                onChange('reviewScore', {
                  ...filters.reviewScore,
                  minRating: value,
                })
              }
              max={5}
              min={0}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0 stars</span>
              <span>5 stars</span>
            </div>
          </div>

          <div>
            <Label htmlFor="min-reviews">Minimum number of reviews</Label>
            <Input
              id="min-reviews"
              type="number"
              placeholder="0"
              value={filters.reviewScore.minReviews || ''}
              onChange={(e) =>
                onChange('reviewScore', {
                  ...filters.reviewScore,
                  minReviews: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                })
              }
            />
          </div>
        </div>
      </FilterSection>

      {/* Availability */}
      <FilterSection
        id="availability"
        title="Availability"
        icon={<Calendar className="w-4 h-4" />}
        badge={filters.availability.startDate ? 1 : 0}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">Available from</Label>
              <Input
                id="start-date"
                type="date"
                value={
                  filters.availability.startDate?.toISOString().split('T')[0] ||
                  ''
                }
                onChange={(e) =>
                  onChange('availability', {
                    ...filters.availability,
                    startDate: e.target.value
                      ? new Date(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="end-date">Available until</Label>
              <Input
                id="end-date"
                type="date"
                value={
                  filters.availability.endDate?.toISOString().split('T')[0] ||
                  ''
                }
                onChange={(e) =>
                  onChange('availability', {
                    ...filters.availability,
                    endDate: e.target.value
                      ? new Date(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="flexible-dates"
              checked={filters.availability.flexible || false}
              onCheckedChange={(checked) =>
                onChange('availability', {
                  ...filters.availability,
                  flexible: checked,
                })
              }
            />
            <Label htmlFor="flexible-dates">I'm flexible with dates</Label>
          </div>
        </div>
      </FilterSection>

      {/* Advanced Options */}
      <FilterSection
        id="advanced"
        title="Advanced Options"
        icon={<Settings className="w-4 h-4" />}
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="instant-book"
              checked={filters.advancedFilters.instantBooking || false}
              onCheckedChange={(checked) =>
                onAdvancedChange('instantBooking', checked)
              }
            />
            <Label htmlFor="instant-book">Instant booking available</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="free-consultation"
              checked={filters.advancedFilters.freeConsultation || false}
              onCheckedChange={(checked) =>
                onAdvancedChange('freeConsultation', checked)
              }
            />
            <Label htmlFor="free-consultation">Free consultation offered</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="covid-safe"
              checked={filters.advancedFilters.covidSafe || false}
              onCheckedChange={(checked) =>
                onAdvancedChange('covidSafe', checked)
              }
            />
            <Label htmlFor="covid-safe">COVID-safe practices</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="lgbtq-friendly"
              checked={filters.advancedFilters.lgbtqFriendly || false}
              onCheckedChange={(checked) =>
                onAdvancedChange('lgbtqFriendly', checked)
              }
            />
            <Label htmlFor="lgbtq-friendly">LGBTQ+ friendly</Label>
          </div>

          <div>
            <Label htmlFor="max-travel-distance">
              Maximum travel distance (miles)
            </Label>
            <Input
              id="max-travel-distance"
              type="number"
              placeholder="50"
              value={filters.advancedFilters.maxTravelDistance || ''}
              onChange={(e) =>
                onAdvancedChange(
                  'maxTravelDistance',
                  e.target.value ? parseInt(e.target.value) : undefined,
                )
              }
            />
          </div>
        </div>
      </FilterSection>
    </div>
  );
}

export default SearchFilters;
