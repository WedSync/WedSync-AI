/**
 * WS-114: Marketplace Search Interface Component
 *
 * Advanced search component with natural language search, autocomplete suggestions,
 * and intelligent search features for the marketplace.
 *
 * Team B - Batch 9 - Round 1
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  X,
  Clock,
  Star,
  Bookmark,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// =====================================================================================
// INTERFACES
// =====================================================================================

interface SearchSuggestion {
  text: string;
  type: 'template' | 'category' | 'tag' | 'search_history';
  category?: string;
  result_count?: number;
  popularity_score?: number;
  highlighted?: string;
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

interface SearchInterfaceProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  onFiltersChange: (filters: SearchFilters) => void;
  initialQuery?: string;
  initialFilters?: SearchFilters;
  placeholder?: string;
  showSaveSearch?: boolean;
  isLoading?: boolean;
  className?: string;
}

interface RecentSearch {
  query: string;
  timestamp: string;
  resultCount: number;
}

// =====================================================================================
// MAIN COMPONENT
// =====================================================================================

export function MarketplaceSearchInterface({
  onSearch,
  onFiltersChange,
  initialQuery = '',
  initialFilters = {},
  placeholder = 'Search templates, categories, or wedding types...',
  showSaveSearch = true,
  isLoading = false,
  className = '',
}: SearchInterfaceProps) {
  // State management
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [appliedFilters, setAppliedFilters] =
    useState<SearchFilters>(initialFilters);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced query for suggestions
  const debouncedQuery = useDebounce(query, 300);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('marketplace_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load recent searches:', error);
      }
    }
  }, []);

  // Fetch suggestions when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2 && showSuggestions) {
      fetchSuggestions(debouncedQuery);
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery, showSuggestions]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // =====================================================================================
  // API FUNCTIONS
  // =====================================================================================

  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) return;

    setSuggestionLoading(true);
    try {
      const response = await fetch(
        `/api/marketplace/search/suggestions?q=${encodeURIComponent(searchQuery)}&limit=8`,
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuggestions(data.suggestions || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setSuggestionLoading(false);
    }
  }, []);

  // =====================================================================================
  // EVENT HANDLERS
  // =====================================================================================

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedSuggestionIndex(-1);

    if (value.length >= 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleInputFocus = () => {
    if (query.length >= 2) {
      setShowSuggestions(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    const visibleSuggestions = getVisibleSuggestions();

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < visibleSuggestions.length - 1 ? prev + 1 : prev,
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > -1 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (
          selectedSuggestionIndex >= 0 &&
          selectedSuggestionIndex < visibleSuggestions.length
        ) {
          selectSuggestion(visibleSuggestions[selectedSuggestionIndex]);
        } else {
          executeSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const selectSuggestion = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);

    // Update filters based on suggestion type
    let newFilters = { ...appliedFilters };
    if (suggestion.type === 'category' && suggestion.category) {
      newFilters.category = suggestion.category;
    }

    executeSearch(suggestion.text, newFilters);
  };

  const selectRecentSearch = (recent: RecentSearch) => {
    setQuery(recent.query);
    setShowSuggestions(false);
    executeSearch(recent.query);
  };

  const executeSearch = (searchQuery?: string, filters?: SearchFilters) => {
    const finalQuery = searchQuery || query;
    const finalFilters = filters || appliedFilters;

    // Save to recent searches
    saveToRecentSearches(finalQuery);

    // Call the search handler
    onSearch(finalQuery, finalFilters);
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setQuery('');
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  const removeFilter = (filterKey: keyof SearchFilters, value?: string) => {
    const newFilters = { ...appliedFilters };

    if (filterKey === 'tags' && value && newFilters.tags) {
      newFilters.tags = newFilters.tags.filter((tag) => tag !== value);
      if (newFilters.tags.length === 0) {
        delete newFilters.tags;
      }
    } else if (
      filterKey === 'weddingTypes' &&
      value &&
      newFilters.weddingTypes
    ) {
      newFilters.weddingTypes = newFilters.weddingTypes.filter(
        (type) => type !== value,
      );
      if (newFilters.weddingTypes.length === 0) {
        delete newFilters.weddingTypes;
      }
    } else {
      delete newFilters[filterKey];
    }

    setAppliedFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // =====================================================================================
  // UTILITY FUNCTIONS
  // =====================================================================================

  const saveToRecentSearches = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    const newSearch: RecentSearch = {
      query: searchQuery,
      timestamp: new Date().toISOString(),
      resultCount: 0, // Will be updated when results come back
    };

    const updated = [
      newSearch,
      ...recentSearches.filter((s) => s.query !== searchQuery),
    ].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem(
      'marketplace_recent_searches',
      JSON.stringify(updated),
    );
  };

  const getVisibleSuggestions = (): SearchSuggestion[] => {
    if (query.length < 2) {
      return [];
    }
    return suggestions;
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'template':
        return <Search className="w-4 h-4 text-blue-500" />;
      case 'category':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'tag':
        return <Badge className="w-4 h-4 text-purple-500" />;
      case 'search_history':
        return <Clock className="w-4 h-4 text-gray-500" />;
      default:
        return <Search className="w-4 h-4 text-gray-400" />;
    }
  };

  const getAppliedFiltersCount = () => {
    let count = 0;
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (key === 'tags' || key === 'weddingTypes') {
        count += (value as string[])?.length || 0;
      } else if (value !== undefined && value !== null && value !== '') {
        count += 1;
      }
    });
    return count;
  };

  // =====================================================================================
  // RENDER
  // =====================================================================================

  const visibleSuggestions = getVisibleSuggestions();
  const hasFilters = getAppliedFiltersCount() > 0;

  return (
    <div className={`relative w-full max-w-4xl mx-auto ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>

        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-12 py-3 text-lg border-2 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
          disabled={isLoading}
        />

        {/* Clear button */}
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        )}

        {/* Loading indicator */}
        {(isLoading || suggestionLoading) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <Loader2 className="h-5 w-5 text-purple-500 animate-spin" />
          </div>
        )}
      </div>

      {/* Applied Filters */}
      {hasFilters && (
        <div className="mt-3 flex flex-wrap gap-2">
          {appliedFilters.category && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Category: {appliedFilters.category}
              <button
                onClick={() => removeFilter('category')}
                className="ml-1 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {appliedFilters.tier && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Tier: {appliedFilters.tier}
              <button
                onClick={() => removeFilter('tier')}
                className="ml-1 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {appliedFilters.priceMin !== undefined && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Min Price: £{(appliedFilters.priceMin / 100).toFixed(2)}
              <button
                onClick={() => removeFilter('priceMin')}
                className="ml-1 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {appliedFilters.priceMax !== undefined && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Max Price: £{(appliedFilters.priceMax / 100).toFixed(2)}
              <button
                onClick={() => removeFilter('priceMax')}
                className="ml-1 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {appliedFilters.ratingMin !== undefined && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {appliedFilters.ratingMin}+ stars
              <button
                onClick={() => removeFilter('ratingMin')}
                className="ml-1 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {appliedFilters.tags?.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="flex items-center gap-1"
            >
              #{tag}
              <button
                onClick={() => removeFilter('tags', tag)}
                className="ml-1 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {appliedFilters.weddingTypes?.map((type) => (
            <Badge
              key={type}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {type}
              <button
                onClick={() => removeFilter('weddingTypes', type)}
                className="ml-1 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-96 overflow-y-auto"
        >
          {/* Recent Searches */}
          {query.length < 2 && recentSearches.length > 0 && (
            <div className="p-3 border-b border-gray-100">
              <div className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Searches
              </div>
              {recentSearches.slice(0, 5).map((recent, index) => (
                <button
                  key={index}
                  onClick={() => selectRecentSearch(recent)}
                  className="w-full text-left p-2 hover:bg-gray-50 rounded-lg flex items-center justify-between group"
                >
                  <span className="text-gray-700">{recent.query}</span>
                  {recent.resultCount > 0 && (
                    <span className="text-xs text-gray-500">
                      {recent.resultCount} results
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Live Suggestions */}
          {visibleSuggestions.length > 0 && (
            <div className="p-2">
              {visibleSuggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.text}`}
                  onClick={() => selectSuggestion(suggestion)}
                  className={`w-full text-left p-3 rounded-lg flex items-center gap-3 hover:bg-gray-50 ${
                    selectedSuggestionIndex === index
                      ? 'bg-purple-50 border-l-2 border-purple-500'
                      : ''
                  }`}
                >
                  {getSuggestionIcon(suggestion.type)}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-gray-900 truncate"
                      dangerouslySetInnerHTML={{
                        __html: suggestion.highlighted || suggestion.text,
                      }}
                    />
                    {suggestion.type === 'template' && suggestion.category && (
                      <div className="text-xs text-gray-500 capitalize">
                        {suggestion.category.replace('_', ' ')}
                      </div>
                    )}
                  </div>
                  {suggestion.result_count !== undefined && (
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {suggestion.result_count} result
                      {suggestion.result_count !== 1 ? 's' : ''}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* No Suggestions */}
          {query.length >= 2 &&
            visibleSuggestions.length === 0 &&
            !suggestionLoading && (
              <div className="p-6 text-center text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No suggestions found for "{query}"</p>
                <p className="text-sm mt-1">Press Enter to search anyway</p>
              </div>
            )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            onClick={() => executeSearch()}
            disabled={isLoading}
            className="px-6"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Search
          </Button>

          {hasFilters && (
            <Button
              variant="outline"
              onClick={() => {
                setAppliedFilters({});
                onFiltersChange({});
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {showSaveSearch && query.trim() && (
          <Button
            variant="ghost"
            size="sm"
            className="text-purple-600 hover:text-purple-700"
          >
            <Bookmark className="h-4 w-4 mr-1" />
            Save Search
          </Button>
        )}
      </div>
    </div>
  );
}
