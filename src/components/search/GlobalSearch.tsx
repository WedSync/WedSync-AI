'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAdvancedSearch } from '@/hooks/useAdvancedSearch';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card-untitled';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  Search,
  Filter,
  Clock,
  TrendingUp,
  Download,
  Save,
  X,
  Star,
  Users,
  Calendar,
  MapPin,
  DollarSign,
  Sparkles,
  History,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SearchResultCardProps {
  result: any;
  onSelect?: (result: any) => void;
}

function SearchResultCard({ result, onSelect }: SearchResultCardProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'client':
        return <Users className="w-4 h-4" />;
      case 'vendor':
        return <MapPin className="w-4 h-4" />;
      case 'booking':
        return <Calendar className="w-4 h-4" />;
      case 'form':
        return <Star className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'client':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'vendor':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'booking':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      case 'form':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow duration-200 border-l-4"
      style={{
        borderLeftColor:
          result.relevanceScore > 0.8
            ? '#10B981'
            : result.relevanceScore > 0.6
              ? '#F59E0B'
              : '#6B7280',
      }}
      onClick={() => onSelect?.(result)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={cn('text-xs', getTypeColor(result.type))}>
                {getTypeIcon(result.type)}
                <span className="ml-1 capitalize">{result.type}</span>
              </Badge>
              <div className="flex items-center">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'w-3 h-3',
                      i < Math.floor(result.relevanceScore * 5)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300',
                    )}
                  />
                ))}
              </div>
            </div>

            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {result.highlighted?.title ? (
                <span
                  dangerouslySetInnerHTML={{ __html: result.highlighted.title }}
                />
              ) : (
                result.title
              )}
            </h3>

            {result.subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {result.highlighted?.subtitle ? (
                  <span
                    dangerouslySetInnerHTML={{
                      __html: result.highlighted.subtitle,
                    }}
                  />
                ) : (
                  result.subtitle
                )}
              </p>
            )}

            {result.description && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">
                {result.highlighted?.description ? (
                  <span
                    dangerouslySetInnerHTML={{
                      __html: result.highlighted.description,
                    }}
                  />
                ) : (
                  result.description
                )}
              </p>
            )}

            {result.metadata && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(result.metadata)
                  .slice(0, 3)
                  .map(([key, value]) => (
                    <Badge key={key} variant="outline" className="text-xs">
                      {key}: {String(value)}
                    </Badge>
                  ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {Math.round(result.relevanceScore * 100)}% match
            </span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SearchFiltersProps {
  filters: any[];
  facets: any[];
  onAddFilter: (filter: any) => void;
  onRemoveFilter: (index: number) => void;
  onClearFilters: () => void;
}

function SearchFilters({
  filters,
  facets,
  onAddFilter,
  onRemoveFilter,
  onClearFilters,
}: SearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Filters & Facets
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          {/* Active Filters */}
          {filters.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active Filters
                </span>
                <Button variant="ghost" size="sm" onClick={onClearFilters}>
                  Clear All
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {filters.map((filter, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {filter.label}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 hover:bg-transparent"
                      onClick={() => onRemoveFilter(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Facets */}
          {facets.map((facet, facetIndex) => (
            <div key={facetIndex} className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {facet.label}
              </h4>
              <div className="space-y-1">
                {facet.values.map((value: any, valueIndex: number) => (
                  <div
                    key={valueIndex}
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-1 rounded"
                    onClick={() =>
                      onAddFilter({
                        field: facet.field,
                        operator: 'equals',
                        value: value.value,
                        label: `${facet.label}: ${value.label}`,
                      })
                    }
                  >
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {value.label}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {value.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

interface SavedSearchesProps {
  savedSearches: any[];
  onLoadSearch: (searchId: string) => void;
  onDeleteSearch: (searchId: string) => void;
}

function SavedSearches({
  savedSearches,
  onLoadSearch,
  onDeleteSearch,
}: SavedSearchesProps) {
  if (savedSearches.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Save className="w-4 h-4" />
          Saved Searches
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {savedSearches.slice(0, 5).map((search) => (
            <div
              key={search.id}
              className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
              onClick={() => onLoadSearch(search.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {search.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {search.query}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSearch(search.id);
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function GlobalSearch() {
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    searchQuery,
    results,
    suggestions,
    filters,
    facets,
    savedSearches,
    isLoading,
    error,
    totalResults,
    searchTime,
    setSearchQuery,
    addFilter,
    removeFilter,
    clearFilters,
    saveSearch,
    loadSavedSearch,
    deleteSavedSearch,
    exportResults,
    refreshSuggestions,
  } = useAdvancedSearch({
    debounceMs: 100,
    enableAISuggestions: true,
    fuzzyMatch: true,
    maxResults: 50,
    enableSavedSearches: true,
  });

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleSaveSearch = async () => {
    if (saveSearchName.trim()) {
      await saveSearch(saveSearchName.trim());
      setSaveSearchName('');
      setShowSaveDialog(false);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    setSearchQuery(suggestion.query);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Global Search
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Search across clients, vendors, bookings, forms, and journeys with
          AI-powered suggestions
        </p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search clients, venues, bookings, forms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-24 h-12 text-lg"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={refreshSuggestions}>
                <Sparkles className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search Suggestions */}
          {suggestions.length > 0 && searchQuery && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Suggestions
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion.type === 'ai' && (
                      <Sparkles className="w-4 h-4 text-purple-500" />
                    )}
                    {suggestion.type === 'history' && (
                      <History className="w-4 h-4 text-blue-500" />
                    )}
                    {suggestion.type === 'autocomplete' && (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    )}
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                      {suggestion.query}
                    </span>
                    {suggestion.confidence && (
                      <Badge variant="outline" className="text-xs">
                        {Math.round(suggestion.confidence * 100)}%
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Status & Actions */}
      {(results.length > 0 || isLoading) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isLoading
                ? 'Searching...'
                : `${totalResults.toLocaleString()} results found in ${searchTime}ms`}
            </p>
            {filters.length > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Filter className="w-3 h-3" />
                {filters.length} filter{filters.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Save className="w-4 h-4 mr-2" />
                  Save Search
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Search</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Search name..."
                    value={saveSearchName}
                    onChange={(e) => setSaveSearchName(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowSaveDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveSearch}>Save</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="sm"
              onClick={() => exportResults('csv')}
              disabled={results.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <SearchFilters
            filters={filters}
            facets={facets}
            onAddFilter={addFilter}
            onRemoveFilter={removeFilter}
            onClearFilters={clearFilters}
          />

          <SavedSearches
            savedSearches={savedSearches}
            onLoadSearch={loadSavedSearch}
            onDeleteSearch={deleteSavedSearch}
          />
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          {error && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
              <CardContent className="p-4">
                <p className="text-red-700 dark:text-red-300">
                  Search error: {error}
                </p>
              </CardContent>
            </Card>
          )}

          {isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 3 }, (_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && results.length === 0 && searchQuery && (
            <Card>
              <CardContent className="p-8 text-center">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No results found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Try adjusting your search terms or removing some filters
                </p>
              </CardContent>
            </Card>
          )}

          {!isLoading && results.length > 0 && (
            <div className="space-y-4">
              {results.map((result, index) => (
                <SearchResultCard
                  key={result.id || index}
                  result={result}
                  onSelect={setSelectedResult}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Result Detail Modal */}
      {selectedResult && (
        <Dialog
          open={!!selectedResult}
          onOpenChange={() => setSelectedResult(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedResult.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="capitalize">{selectedResult.type}</Badge>
                <Badge variant="outline">
                  {Math.round(selectedResult.relevanceScore * 100)}% match
                </Badge>
              </div>

              {selectedResult.description && (
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedResult.description}
                </p>
              )}

              {selectedResult.metadata && (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(selectedResult.metadata).map(
                    ([key, value]) => (
                      <div key={key}>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {key}
                        </dt>
                        <dd className="text-sm text-gray-900 dark:text-white">
                          {String(value)}
                        </dd>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
