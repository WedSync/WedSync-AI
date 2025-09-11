'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card-untitled';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Search,
  Clock,
  TrendingUp,
  MapPin,
  Star,
  Users,
  Camera,
  Music,
  Flower,
  Car,
  Building,
  Utensils,
  Heart,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'query' | 'category' | 'location' | 'vendor' | 'recent' | 'trending';
  category?: string;
  location?: string;
  popularity?: number;
  resultCount?: number;
  icon?: React.ReactNode;
  subtitle?: string;
}

interface SearchSuggestionsProps {
  suggestions: string[] | SearchSuggestion[];
  onSelect: (suggestion: string | SearchSuggestion) => void;
  recentSearches?: string[];
  className?: string;
  maxSuggestions?: number;
  showPopular?: boolean;
  showRecent?: boolean;
  isLoading?: boolean;
}

const TRENDING_SEARCHES = [
  'Wedding photographers London',
  'Outdoor wedding venues',
  'Vintage wedding decorations',
  'Wedding cake makers',
  'Live wedding bands',
  'Bridal makeup artists',
];

const POPULAR_CATEGORIES = [
  { name: 'Photography', icon: <Camera className="w-4 h-4" />, count: '1,234' },
  { name: 'Venues', icon: <Building className="w-4 h-4" />, count: '892' },
  { name: 'Music & DJ', icon: <Music className="w-4 h-4" />, count: '756' },
  { name: 'Florists', icon: <Flower className="w-4 h-4" />, count: '645' },
  { name: 'Catering', icon: <Utensils className="w-4 h-4" />, count: '523' },
  { name: 'Transport', icon: <Car className="w-4 h-4" />, count: '387' },
];

const POPULAR_LOCATIONS = [
  { name: 'London', count: '2,456' },
  { name: 'Birmingham', count: '1,234' },
  { name: 'Manchester', count: '987' },
  { name: 'Leeds', count: '756' },
  { name: 'Bristol', count: '634' },
  { name: 'Edinburgh', count: '587' },
];

function getCategoryIcon(category: string): React.ReactNode {
  const iconMap: Record<string, React.ReactNode> = {
    Photography: <Camera className="w-4 h-4" />,
    Videography: <Camera className="w-4 h-4" />,
    Venues: <Building className="w-4 h-4" />,
    Catering: <Utensils className="w-4 h-4" />,
    Florists: <Flower className="w-4 h-4" />,
    'Music & DJ': <Music className="w-4 h-4" />,
    Transport: <Car className="w-4 h-4" />,
    Entertainment: <Users className="w-4 h-4" />,
  };
  return iconMap[category] || <Search className="w-4 h-4" />;
}

function formatSuggestionFromString(suggestion: string): SearchSuggestion {
  // Simple heuristic to categorize string suggestions
  const lowerSuggestion = suggestion.toLowerCase();

  let type: SearchSuggestion['type'] = 'query';
  let category: string | undefined;
  let icon: React.ReactNode = <Search className="w-4 h-4" />;

  if (
    lowerSuggestion.includes('photographer') ||
    lowerSuggestion.includes('photography')
  ) {
    type = 'category';
    category = 'Photography';
    icon = <Camera className="w-4 h-4" />;
  } else if (
    lowerSuggestion.includes('venue') ||
    lowerSuggestion.includes('hall')
  ) {
    type = 'category';
    category = 'Venues';
    icon = <Building className="w-4 h-4" />;
  } else if (
    lowerSuggestion.includes('dj') ||
    lowerSuggestion.includes('music') ||
    lowerSuggestion.includes('band')
  ) {
    type = 'category';
    category = 'Music & DJ';
    icon = <Music className="w-4 h-4" />;
  } else if (
    lowerSuggestion.includes('florist') ||
    lowerSuggestion.includes('flower')
  ) {
    type = 'category';
    category = 'Florists';
    icon = <Flower className="w-4 h-4" />;
  } else if (
    lowerSuggestion.includes('catering') ||
    lowerSuggestion.includes('food')
  ) {
    type = 'category';
    category = 'Catering';
    icon = <Utensils className="w-4 h-4" />;
  } else if (
    lowerSuggestion.match(
      /london|birmingham|manchester|leeds|bristol|edinburgh|in\s+/,
    )
  ) {
    type = 'location';
    icon = <MapPin className="w-4 h-4" />;
  }

  return {
    id: suggestion,
    text: suggestion,
    type,
    category,
    icon,
    resultCount: Math.floor(Math.random() * 1000) + 50, // Mock result count
  };
}

export function SearchSuggestions({
  suggestions,
  onSelect,
  recentSearches = [],
  className,
  maxSuggestions = 8,
  showPopular = true,
  showRecent = true,
  isLoading = false,
}: SearchSuggestionsProps) {
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Format suggestions to unified structure
  const formattedSuggestions: SearchSuggestion[] = suggestions
    .map((s) => (typeof s === 'string' ? formatSuggestionFromString(s) : s))
    .slice(0, maxSuggestions);

  const recentSuggestions: SearchSuggestion[] = recentSearches
    .slice(0, 5)
    .map((search) => ({
      id: `recent-${search}`,
      text: search,
      type: 'recent',
      icon: <Clock className="w-4 h-4" />,
    }));

  const trendingSuggestions: SearchSuggestion[] = TRENDING_SEARCHES.slice(
    0,
    6,
  ).map((search) => ({
    id: `trending-${search}`,
    text: search,
    type: 'trending',
    icon: <TrendingUp className="w-4 h-4" />,
    popularity: Math.floor(Math.random() * 100) + 50,
  }));

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHoveredIndex((prev) =>
          prev < formattedSuggestions.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHoveredIndex((prev) =>
          prev > 0 ? prev - 1 : formattedSuggestions.length - 1,
        );
      } else if (e.key === 'Enter' && hoveredIndex >= 0) {
        e.preventDefault();
        onSelect(formattedSuggestions[hoveredIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [formattedSuggestions, hoveredIndex, onSelect]);

  const SuggestionItem = ({
    suggestion,
    index,
    onClick,
  }: {
    suggestion: SearchSuggestion;
    index: number;
    onClick: () => void;
  }) => (
    <button
      className={cn(
        'w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors',
        hoveredIndex === index && 'bg-gray-50',
      )}
      onClick={onClick}
      onMouseEnter={() => setHoveredIndex(index)}
    >
      <div className="flex items-center space-x-3">
        <div
          className={cn(
            'flex-shrink-0',
            suggestion.type === 'recent' && 'text-gray-400',
            suggestion.type === 'trending' && 'text-orange-500',
            suggestion.type === 'category' && 'text-blue-500',
            suggestion.type === 'location' && 'text-green-500',
          )}
        >
          {suggestion.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {suggestion.text}
          </div>
          {suggestion.subtitle && (
            <div className="text-xs text-gray-500 truncate">
              {suggestion.subtitle}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2 flex-shrink-0">
        {suggestion.resultCount && (
          <span className="text-xs text-gray-400">
            {suggestion.resultCount} results
          </span>
        )}
        {suggestion.type === 'trending' && suggestion.popularity && (
          <Badge variant="secondary" className="text-xs">
            +{suggestion.popularity}%
          </Badge>
        )}
        <ChevronRight className="w-3 h-3 text-gray-400" />
      </div>
    </button>
  );

  if (isLoading) {
    return (
      <Card
        className={cn('absolute top-full left-0 right-0 z-50 mt-1', className)}
      >
        <CardContent className="p-3">
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
            <span className="text-sm">Searching...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAnySuggestions =
    formattedSuggestions.length > 0 ||
    (showRecent && recentSuggestions.length > 0) ||
    (showPopular && trendingSuggestions.length > 0);

  if (!hasAnySuggestions) {
    return null;
  }

  return (
    <Card
      ref={suggestionsRef}
      className={cn(
        'absolute top-full left-0 right-0 z-50 mt-1 max-h-96 overflow-y-auto',
        className,
      )}
    >
      <CardContent className="p-0">
        {/* Main Suggestions */}
        {formattedSuggestions.length > 0 && (
          <div>
            {formattedSuggestions.map((suggestion, index) => (
              <SuggestionItem
                key={suggestion.id}
                suggestion={suggestion}
                index={index}
                onClick={() => onSelect(suggestion)}
              />
            ))}
          </div>
        )}

        {/* Recent Searches */}
        {showRecent &&
          recentSuggestions.length > 0 &&
          formattedSuggestions.length > 0 && <Separator />}

        {showRecent && recentSuggestions.length > 0 && (
          <div>
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
              Recent Searches
            </div>
            {recentSuggestions.map((suggestion, index) => (
              <SuggestionItem
                key={suggestion.id}
                suggestion={suggestion}
                index={formattedSuggestions.length + index}
                onClick={() => onSelect(suggestion)}
              />
            ))}
          </div>
        )}

        {/* Popular Categories & Trending */}
        {showPopular && formattedSuggestions.length === 0 && (
          <>
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                Popular Categories
              </div>
              {POPULAR_CATEGORIES.slice(0, 6).map((category, index) => (
                <button
                  key={category.name}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
                  onClick={() =>
                    onSelect({
                      id: `category-${category.name}`,
                      text: category.name,
                      type: 'category',
                      category: category.name,
                      icon: category.icon,
                      resultCount: parseInt(category.count.replace(',', '')),
                    })
                  }
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-blue-500 flex-shrink-0">
                      {category.icon}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {category.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">
                      {category.count} vendors
                    </span>
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>

            <Separator />

            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                Popular Locations
              </div>
              {POPULAR_LOCATIONS.slice(0, 4).map((location) => (
                <button
                  key={location.name}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
                  onClick={() =>
                    onSelect({
                      id: `location-${location.name}`,
                      text: `Wedding vendors in ${location.name}`,
                      type: 'location',
                      location: location.name,
                      icon: <MapPin className="w-4 h-4" />,
                      resultCount: parseInt(location.count.replace(',', '')),
                    })
                  }
                >
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900">
                      {location.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">
                      {location.count} vendors
                    </span>
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>

            <Separator />

            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 flex items-center space-x-1">
                <TrendingUp className="w-3 h-3" />
                <span>Trending Searches</span>
              </div>
              {trendingSuggestions.slice(0, 4).map((suggestion) => (
                <button
                  key={suggestion.id}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => onSelect(suggestion)}
                >
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900">
                      {suggestion.text}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      +{suggestion.popularity}%
                    </Badge>
                    <ArrowUpRight className="w-3 h-3 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default SearchSuggestions;
