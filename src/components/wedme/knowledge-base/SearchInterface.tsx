'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  Clock,
  Bookmark,
  Tag,
  WifiOff,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArticleCard } from './ArticleCard';
import { debounce } from 'lodash-es';

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string[];
  estimatedReadTime: number;
  helpful: number;
  isOfflineAvailable: boolean;
  relevanceScore: number;
}

interface SearchSuggestion {
  query: string;
  category: string;
  popular: boolean;
}

interface SearchInterfaceProps {
  query: string;
  filters: string[];
  onClose: () => void;
  isOffline: boolean;
  coupleId?: string;
}

const popularSearches: SearchSuggestion[] = [
  { query: 'venue questions to ask', category: 'venue', popular: true },
  { query: 'wedding budget breakdown', category: 'budget', popular: true },
  { query: 'photography timeline', category: 'photography', popular: true },
  { query: 'what to wear to venue tour', category: 'planning', popular: false },
  { query: 'wedding cake alternatives', category: 'catering', popular: false },
  {
    query: 'backup plan for outdoor wedding',
    category: 'planning',
    popular: true,
  },
];

const weddingKeywords = {
  venue: [
    'venue',
    'location',
    'reception',
    'ceremony',
    'hall',
    'church',
    'outdoor',
  ],
  photography: [
    'photo',
    'picture',
    'photographer',
    'album',
    'engagement',
    'portraits',
  ],
  budget: [
    'budget',
    'cost',
    'price',
    'money',
    'expensive',
    'cheap',
    'save',
    'spending',
  ],
  timeline: [
    'timeline',
    'schedule',
    'when',
    'time',
    'planning',
    'months',
    'weeks',
  ],
  catering: [
    'food',
    'catering',
    'menu',
    'dinner',
    'cocktail',
    'appetizer',
    'cake',
  ],
  flowers: ['flower', 'bouquet', 'centerpiece', 'floral', 'bloom', 'petals'],
  music: ['music', 'DJ', 'band', 'song', 'dance', 'playlist', 'first dance'],
  guests: ['guest', 'invite', 'invitation', 'RSVP', 'plus one', 'seating'],
};

export function SearchInterface({
  query: initialQuery,
  filters,
  onClose,
  isOffline,
  coupleId,
}: SearchInterfaceProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] =
    useState<SearchSuggestion[]>(popularSearches);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<string[]>(filters);

  // Load search history on mount
  useEffect(() => {
    const history = localStorage.getItem('wedme-search-history');
    if (history) {
      setSearchHistory(JSON.parse(history).slice(0, 5)); // Keep last 5 searches
    }
  }, []);

  // Debounced search function
  const debouncedSearch = useMemo(
    () =>
      debounce(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
          setResults([]);
          return;
        }

        setLoading(true);

        try {
          const searchParams = new URLSearchParams({
            q: searchQuery,
            filters: selectedFilters.join(','),
            coupleId: coupleId || '',
            offline: isOffline.toString(),
          });

          const endpoint = isOffline
            ? '/api/wedme/knowledge/offline-search'
            : '/api/wedme/knowledge/search';

          const response = await fetch(`${endpoint}?${searchParams}`);

          if (!response.ok) {
            throw new Error('Search failed');
          }

          const data = await response.json();
          setResults(data.results || []);

          // Update suggestions based on results
          if (data.suggestions) {
            setSuggestions((prev) =>
              [
                ...data.suggestions,
                ...prev.filter(
                  (s) =>
                    !data.suggestions.find(
                      (ns: SearchSuggestion) => ns.query === s.query,
                    ),
                ),
              ].slice(0, 6),
            );
          }

          // Save to search history
          if (searchQuery.length > 2) {
            const newHistory = [
              searchQuery,
              ...searchHistory.filter((h) => h !== searchQuery),
            ].slice(0, 5);

            setSearchHistory(newHistory);
            localStorage.setItem(
              'wedme-search-history',
              JSON.stringify(newHistory),
            );
          }
        } catch (error) {
          console.error('Search error:', error);

          if (isOffline) {
            // Fallback to cached search results
            const cachedResults = await searchOfflineContent(searchQuery);
            setResults(cachedResults);
          }
        } finally {
          setLoading(false);
        }
      }, 300),
    [selectedFilters, coupleId, isOffline, searchHistory],
  );

  // Trigger search when query changes
  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  // Offline content search fallback
  const searchOfflineContent = async (
    searchQuery: string,
  ): Promise<SearchResult[]> => {
    // This would search through cached IndexedDB content
    try {
      const offlineResults = await window.indexedDB.open(
        'wedme-offline-content',
      );
      // Implement offline search logic here
      return [];
    } catch (error) {
      return [];
    }
  };

  // Categorize query for better suggestions
  const categorizeQuery = (searchQuery: string): string => {
    const lowerQuery = searchQuery.toLowerCase();

    for (const [category, keywords] of Object.entries(weddingKeywords)) {
      if (keywords.some((keyword) => lowerQuery.includes(keyword))) {
        return category;
      }
    }

    return 'general';
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
  };

  const handleFilterToggle = (filter: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter],
    );
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  const queryCategory = categorizeQuery(query);
  const hasResults = results.length > 0;
  const showSuggestions = !query || (!hasResults && !loading);

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex items-center space-x-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-rose-400 w-4 h-4" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search wedding help..."
            className="w-full pl-10 pr-10 py-3 rounded-full bg-white border border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 focus:outline-none"
            autoFocus
            style={{ minHeight: '48px' }}
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-rose-100"
              style={{ minWidth: '32px', minHeight: '32px' }}
            >
              <X className="w-4 h-4 text-rose-500" />
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-3 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors"
          style={{ minWidth: '48px', minHeight: '48px' }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Active Filters */}
      {selectedFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedFilters.map((filter) => (
            <motion.button
              key={filter}
              onClick={() => handleFilterToggle(filter)}
              className="flex items-center px-3 py-1 bg-rose-500 text-white rounded-full text-sm"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Tag className="w-3 h-3 mr-1" />
              {filter}
              <X className="w-3 h-3 ml-1" />
            </motion.button>
          ))}
        </div>
      )}

      {/* Offline Indicator */}
      {isOffline && (
        <motion.div
          className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <WifiOff className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-700">
            Searching offline content only
          </span>
        </motion.div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full"
          />
          <span className="ml-3 text-rose-600">Searching...</span>
        </div>
      )}

      {/* Search Results */}
      <AnimatePresence mode="wait">
        {hasResults && !loading && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-rose-900">
                Search Results
              </h3>
              <span className="text-sm text-rose-600">
                {results.length} article{results.length !== 1 ? 's' : ''} found
              </span>
            </div>

            <div className="space-y-3">
              {results.map((article, index) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ArticleCard
                    article={{
                      ...article,
                      content: article.excerpt,
                      tags: article.tags,
                      weddingTimelineTags: [],
                      helpful: article.helpful,
                      createdAt: new Date().toISOString(),
                    }}
                    compact={false}
                    showOfflineStatus={isOffline}
                    highlightQuery={query}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* No Results State */}
        {!hasResults && !loading && query && (
          <motion.div
            key="no-results"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center py-8"
          >
            <Sparkles className="w-12 h-12 text-rose-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-rose-900 mb-2">
              No articles found for "{query}"
            </h3>
            <p className="text-rose-600 mb-4">
              Try different keywords or browse our categories
            </p>

            {/* Related suggestions */}
            <div className="space-y-2">
              <p className="text-sm text-rose-700 font-medium">
                Try searching for:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions
                  .filter((s) => s.category === queryCategory || s.popular)
                  .slice(0, 3)
                  .map((suggestion) => (
                    <button
                      key={suggestion.query}
                      onClick={() => handleSuggestionClick(suggestion.query)}
                      className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-sm hover:bg-rose-200 transition-colors"
                      style={{ minHeight: '32px' }}
                    >
                      "{suggestion.query}"
                    </button>
                  ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Search Suggestions */}
        {showSuggestions && (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Recent Searches */}
            {searchHistory.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-rose-900 mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Recent Searches
                </h3>
                <div className="space-y-2">
                  {searchHistory.map((search) => (
                    <button
                      key={search}
                      onClick={() => handleSuggestionClick(search)}
                      className="w-full text-left p-3 bg-white rounded-lg border border-rose-100 hover:border-rose-200 transition-colors"
                      style={{ minHeight: '48px' }}
                    >
                      <span className="text-rose-800">{search}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Searches */}
            <div>
              <h3 className="text-sm font-semibold text-rose-900 mb-3 flex items-center">
                <Sparkles className="w-4 h-4 mr-2" />
                Popular Searches
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {suggestions.slice(0, 6).map((suggestion) => (
                  <motion.button
                    key={suggestion.query}
                    onClick={() => handleSuggestionClick(suggestion.query)}
                    className="text-left p-3 bg-white rounded-lg border border-rose-100 hover:border-rose-200 transition-colors group"
                    style={{ minHeight: '48px' }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-rose-800 group-hover:text-rose-900">
                        {suggestion.query}
                      </span>
                      {suggestion.popular && (
                        <span className="px-2 py-1 bg-rose-100 text-rose-600 text-xs rounded-full">
                          Popular
                        </span>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Quick Tips */}
            <motion.div
              className="p-4 bg-blue-50 rounded-lg border border-blue-100"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="font-semibold text-blue-900 mb-2">
                💡 Search Tips
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Try specific terms like "venue contract questions"</li>
                <li>• Use wedding phase filters for relevant results</li>
                <li>• Voice search works great for quick questions!</li>
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
