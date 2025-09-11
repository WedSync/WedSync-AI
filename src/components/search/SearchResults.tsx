'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card-untitled';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Grid,
  List,
  Star,
  MapPin,
  Clock,
  Verified,
  Sparkles,
  Heart,
  Share2,
  Phone,
  Mail,
  ExternalLink,
  Filter,
  SortAsc,
  SortDesc,
  Eye,
  MessageSquare,
  Calendar,
  Camera,
  Music,
  Flower,
  Car,
  Building,
  Utensils,
  Users,
  Award,
  TrendingUp,
} from 'lucide-react';

export interface SearchResult {
  id: string;
  type: 'vendor' | 'service' | 'venue' | 'package';
  title: string;
  description: string;
  category: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  location: string;
  distance?: number;
  image?: string;
  featured: boolean;
  verified: boolean;
  availability?: string;
  tags: string[];
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  portfolio?: {
    imageCount?: number;
    videoCount?: number;
  };
  responseTime?: string;
  bookingOptions?: string[];
}

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

interface SearchResultsProps {
  results: SearchResult[];
  isLoading?: boolean;
  filters: SearchFiltersState;
  onFiltersChange: (filters: SearchFiltersState) => void;
  onResultSelect: (result: SearchResult) => void;
  className?: string;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  showFilters?: boolean;
}

const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    Photography: <Camera className="w-4 h-4" />,
    Videography: <Camera className="w-4 h-4" />,
    Venues: <Building className="w-4 h-4" />,
    Venue: <Building className="w-4 h-4" />,
    Catering: <Utensils className="w-4 h-4" />,
    Florists: <Flower className="w-4 h-4" />,
    'Music & DJ': <Music className="w-4 h-4" />,
    Transport: <Car className="w-4 h-4" />,
    Entertainment: <Users className="w-4 h-4" />,
  };
  return iconMap[category] || <Star className="w-4 h-4" />;
};

const SORT_OPTIONS = [
  {
    value: 'relevance',
    label: 'Most Relevant',
    icon: <TrendingUp className="w-4 h-4" />,
  },
  {
    value: 'rating',
    label: 'Highest Rated',
    icon: <Star className="w-4 h-4" />,
  },
  {
    value: 'price_asc',
    label: 'Price: Low to High',
    icon: <SortAsc className="w-4 h-4" />,
  },
  {
    value: 'price_desc',
    label: 'Price: High to Low',
    icon: <SortDesc className="w-4 h-4" />,
  },
  {
    value: 'distance',
    label: 'Nearest First',
    icon: <MapPin className="w-4 h-4" />,
  },
  {
    value: 'recent',
    label: 'Recently Added',
    icon: <Clock className="w-4 h-4" />,
  },
];

export function SearchResults({
  results,
  isLoading = false,
  filters,
  onFiltersChange,
  onResultSelect,
  className,
  viewMode = 'grid',
  onViewModeChange,
  showFilters = true,
}: SearchResultsProps) {
  const [savedResults, setSavedResults] = useState<Set<string>>(new Set());
  const [currentViewMode, setCurrentViewMode] = useState<'grid' | 'list'>(
    viewMode,
  );

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setCurrentViewMode(mode);
    onViewModeChange?.(mode);
  };

  const handleSortChange = (sortBy: string) => {
    onFiltersChange({
      ...filters,
      sortBy: sortBy as SearchFiltersState['sortBy'],
    });
  };

  const toggleSaved = (resultId: string) => {
    const newSaved = new Set(savedResults);
    if (newSaved.has(resultId)) {
      newSaved.delete(resultId);
    } else {
      newSaved.add(resultId);
    }
    setSavedResults(newSaved);
  };

  // Sort results based on current sort option
  const sortedResults = useMemo(() => {
    const sorted = [...results];

    switch (filters.sortBy) {
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'price_asc':
        return sorted.sort((a, b) => {
          const aPrice = parseFloat(
            a.priceRange.replace(/[£,]/g, '').split(' - ')[0],
          );
          const bPrice = parseFloat(
            b.priceRange.replace(/[£,]/g, '').split(' - ')[0],
          );
          return aPrice - bPrice;
        });
      case 'price_desc':
        return sorted.sort((a, b) => {
          const aPrice = parseFloat(
            a.priceRange.replace(/[£,]/g, '').split(' - ')[1] || '0',
          );
          const bPrice = parseFloat(
            b.priceRange.replace(/[£,]/g, '').split(' - ')[1] || '0',
          );
          return bPrice - aPrice;
        });
      case 'distance':
        return sorted.sort((a, b) => (a.distance || 999) - (b.distance || 999));
      case 'recent':
        return sorted.sort(() => Math.random() - 0.5); // Mock recent sorting
      default:
        // Relevance: featured first, then by rating
        return sorted.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return b.rating - a.rating;
        });
    }
  }, [results, filters.sortBy]);

  const ResultCard = ({
    result,
    compact = false,
  }: {
    result: SearchResult;
    compact?: boolean;
  }) => (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]',
        result.featured && 'ring-2 ring-yellow-200',
      )}
    >
      <CardContent className={cn('p-4', compact && 'p-3')}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {result.image && (
              <div
                className={cn(
                  'flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden',
                  compact ? 'w-12 h-12' : 'w-16 h-16',
                )}
              >
                <img
                  src={result.image}
                  alt={result.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-vendor.jpg';
                  }}
                />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                {getCategoryIcon(result.category)}
                <h3
                  className={cn(
                    'font-semibold text-gray-900 truncate',
                    compact ? 'text-sm' : 'text-base',
                  )}
                >
                  {result.title}
                </h3>
                {result.verified && (
                  <Verified className="w-4 h-4 text-blue-500 flex-shrink-0" />
                )}
                {result.featured && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-yellow-100 text-yellow-800"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                )}
              </div>

              <p
                className={cn(
                  'text-gray-600 mb-2',
                  compact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2',
                )}
              >
                {result.description}
              </p>

              {/* Rating and Reviews */}
              <div className="flex items-center space-x-4 mb-2">
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span
                    className={cn(
                      'font-medium',
                      compact ? 'text-xs' : 'text-sm',
                    )}
                  >
                    {result.rating}
                  </span>
                  <span
                    className={cn(
                      'text-gray-500',
                      compact ? 'text-xs' : 'text-sm',
                    )}
                  >
                    ({result.reviewCount} reviews)
                  </span>
                </div>

                {result.distance && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {result.distance}mi away
                    </span>
                  </div>
                )}
              </div>

              {/* Location and Price */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'text-gray-600',
                    compact ? 'text-xs' : 'text-sm',
                  )}
                >
                  {result.location}
                </span>
                <span
                  className={cn(
                    'font-semibold text-gray-900',
                    compact ? 'text-xs' : 'text-sm',
                  )}
                >
                  {result.priceRange}
                </span>
              </div>

              {/* Availability */}
              {result.availability && (
                <div className="flex items-center space-x-1 mt-2">
                  <Calendar className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-600">
                    {result.availability}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col space-y-2 ml-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleSaved(result.id);
              }}
              className={cn(
                'p-2 h-auto',
                savedResults.has(result.id) ? 'text-red-500' : 'text-gray-400',
              )}
            >
              <Heart
                className={cn(
                  'w-4 h-4',
                  savedResults.has(result.id) && 'fill-current',
                )}
              />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                // Handle share
              }}
              className="p-2 h-auto text-gray-400 hover:text-gray-600"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tags */}
        {result.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {result.tags.slice(0, compact ? 2 : 4).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {result.tags.length > (compact ? 2 : 4) && (
              <Badge variant="outline" className="text-xs text-gray-500">
                +{result.tags.length - (compact ? 2 : 4)} more
              </Badge>
            )}
          </div>
        )}

        {/* Contact Options */}
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onResultSelect(result);
            }}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>

          {result.contactInfo?.phone && (
            <Button variant="outline" size="sm" className="px-3">
              <Phone className="w-4 h-4" />
            </Button>
          )}

          {result.contactInfo?.email && (
            <Button variant="outline" size="sm" className="px-3">
              <Mail className="w-4 h-4" />
            </Button>
          )}

          <Button variant="outline" size="sm" className="px-3">
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>

        {/* Response Time */}
        {result.responseTime && (
          <div className="flex items-center space-x-1 mt-2 pt-2 border-t">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">
              Usually responds within {result.responseTime}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const ListItem = ({ result }: { result: SearchResult }) => (
    <Card className="cursor-pointer transition-all duration-200 hover:shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          {result.image && (
            <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-gray-100 overflow-hidden">
              <img
                src={result.image}
                alt={result.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-vendor.jpg';
                }}
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getCategoryIcon(result.category)}
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {result.title}
                </h3>
                {result.verified && (
                  <Verified className="w-4 h-4 text-blue-500" />
                )}
                {result.featured && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-yellow-100 text-yellow-800"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                )}
              </div>

              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900">
                  {result.priceRange}
                </div>
                {result.distance && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {result.distance}mi away
                    </span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-gray-600 mb-3 line-clamp-2">
              {result.description}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{result.rating}</span>
                  <span className="text-gray-500">({result.reviewCount})</span>
                </div>
                <span className="text-gray-600">{result.location}</span>
                {result.availability && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-green-500" />
                    <span className="text-sm text-green-600">
                      {result.availability}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSaved(result.id);
                  }}
                  className={
                    savedResults.has(result.id)
                      ? 'text-red-500'
                      : 'text-gray-400'
                  }
                >
                  <Heart
                    className={cn(
                      'w-4 h-4',
                      savedResults.has(result.id) && 'fill-current',
                    )}
                  />
                </Button>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResultSelect(result);
                  }}
                >
                  View Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full mx-auto mb-4" />
            <p className="text-gray-500">Searching for wedding vendors...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {results.length > 0
              ? `${results.length} results found`
              : 'No results found'}
          </h2>
          {filters.query && (
            <p className="text-sm text-gray-600">for "{filters.query}"</p>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Sort Options */}
          <Select value={filters.sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center space-x-2">
                    {option.icon}
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border">
            <Button
              variant={currentViewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('grid')}
              className="rounded-r-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={currentViewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* No Results */}
      {results.length === 0 && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No results found
            </h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search criteria or filters
            </p>
            <Button
              variant="outline"
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  query: '',
                  vendorCategories: [],
                  location: { currency: 'GBP' },
                  priceRange: { currency: 'GBP' },
                  availability: {},
                  reviewScore: {},
                  advancedFilters: {},
                })
              }
            >
              Clear all filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results Grid/List */}
      {results.length > 0 && (
        <div
          className={cn(
            currentViewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4',
          )}
        >
          {sortedResults.map((result) => (
            <div key={result.id} onClick={() => onResultSelect(result)}>
              {currentViewMode === 'grid' ? (
                <ResultCard result={result} />
              ) : (
                <ListItem result={result} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchResults;
