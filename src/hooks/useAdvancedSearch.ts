'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import useSWR from 'swr';

interface SearchFilter {
  field: string;
  operator:
    | 'equals'
    | 'contains'
    | 'starts_with'
    | 'ends_with'
    | 'greater_than'
    | 'less_than'
    | 'in'
    | 'between';
  value: any;
  label: string;
}

interface SearchFacet {
  field: string;
  label: string;
  values: Array<{
    value: string;
    label: string;
    count: number;
  }>;
}

interface SearchResult {
  id: string;
  type: 'client' | 'vendor' | 'booking' | 'form' | 'journey';
  title: string;
  subtitle?: string;
  description?: string;
  metadata?: Record<string, any>;
  relevanceScore: number;
  highlighted?: Record<string, string>;
}

interface SearchSuggestion {
  query: string;
  type: 'ai' | 'history' | 'autocomplete';
  description?: string;
  confidence: number;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilter[];
  createdAt: string;
  lastUsed: string;
}

interface UseAdvancedSearchOptions {
  debounceMs?: number;
  enableAISuggestions?: boolean;
  fuzzyMatch?: boolean;
  maxResults?: number;
  searchTypes?: Array<'client' | 'vendor' | 'booking' | 'form' | 'journey'>;
  enableSavedSearches?: boolean;
}

interface AdvancedSearchState {
  query: string;
  results: SearchResult[];
  suggestions: SearchSuggestion[];
  filters: SearchFilter[];
  facets: SearchFacet[];
  savedSearches: SavedSearch[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  totalResults: number;
  searchTime: number;
  setSearchQuery: (query: string) => void;
  addFilter: (filter: SearchFilter) => void;
  removeFilter: (index: number) => void;
  clearFilters: () => void;
  saveSearch: (name: string) => Promise<void>;
  loadSavedSearch: (searchId: string) => void;
  deleteSavedSearch: (searchId: string) => void;
  exportResults: (format: 'csv' | 'json' | 'pdf') => Promise<void>;
  refreshSuggestions: () => void;
}

// Fuzzy matching algorithm using Levenshtein distance
function fuzzyMatch(query: string, target: string, threshold = 0.6): number {
  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();

  if (targetLower.includes(queryLower)) return 1.0;

  const distance = levenshteinDistance(queryLower, targetLower);
  const maxLength = Math.max(queryLower.length, targetLower.length);
  const similarity = 1 - distance / maxLength;

  return similarity >= threshold ? similarity : 0;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // insertion
        matrix[j - 1][i] + 1, // deletion
        matrix[j - 1][i - 1] + cost, // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

// AI-powered search suggestions using pattern matching
function generateAISuggestions(
  query: string,
  searchHistory: string[],
): SearchSuggestion[] {
  const suggestions: SearchSuggestion[] = [];

  // Wedding-specific suggestion patterns
  const weddingPatterns = [
    {
      pattern: /venue|location/i,
      suggestions: ['venues in [location]', 'outdoor venues', 'indoor venues'],
    },
    {
      pattern: /budget|price|cost/i,
      suggestions: [
        'budget under $5000',
        'price range $1000-3000',
        'cost comparison',
      ],
    },
    {
      pattern: /date|when|schedule/i,
      suggestions: [
        'available dates',
        'weekend availability',
        'seasonal pricing',
      ],
    },
    {
      pattern: /photo|camera|picture/i,
      suggestions: ['photographers', 'photo packages', 'engagement photos'],
    },
    {
      pattern: /flower|bouquet|decoration/i,
      suggestions: [
        'floral arrangements',
        'seasonal flowers',
        'bouquet styles',
      ],
    },
    {
      pattern: /dress|attire|outfit/i,
      suggestions: ['wedding dresses', 'formal attire', 'dress alterations'],
    },
    {
      pattern: /music|band|dj/i,
      suggestions: ['wedding bands', 'DJ services', 'ceremony music'],
    },
    {
      pattern: /cake|dessert|catering/i,
      suggestions: ['wedding cakes', 'catering options', 'dessert tables'],
    },
  ];

  weddingPatterns.forEach(({ pattern, suggestions: patternSuggestions }) => {
    if (pattern.test(query)) {
      patternSuggestions.forEach((suggestion) => {
        suggestions.push({
          query: suggestion,
          type: 'ai',
          description: 'AI suggestion based on wedding industry patterns',
          confidence: 0.8,
        });
      });
    }
  });

  // Historical search suggestions
  const relevantHistory = searchHistory
    .filter((h) => h.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 3);

  relevantHistory.forEach((historyQuery) => {
    suggestions.push({
      query: historyQuery,
      type: 'history',
      description: 'From your search history',
      confidence: 0.9,
    });
  });

  return suggestions.slice(0, 5);
}

export function useAdvancedSearch({
  debounceMs = 100,
  enableAISuggestions = true,
  fuzzyMatch: enableFuzzyMatch = true,
  maxResults = 50,
  searchTypes = ['client', 'vendor', 'booking', 'form', 'journey'],
  enableSavedSearches = true,
}: UseAdvancedSearchOptions = {}): AdvancedSearchState {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilter[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [facets, setFacets] = useState<SearchFacet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState(0);

  const supabase = await createClient();
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const searchStartTimeRef = useRef<number>();

  // Build search parameters for SWR
  const searchParams = {
    q: searchQuery,
    filters: JSON.stringify(filters),
    types: searchTypes.join(','),
    fuzzy: enableFuzzyMatch,
    limit: maxResults,
  };

  const shouldSearch = searchQuery.length >= 2;
  const searchKey = shouldSearch
    ? ['/api/search/advanced', searchParams]
    : null;

  // Main search with SWR
  const { data: searchData, isLoading } = useSWR(
    searchKey,
    async ([url, params]) => {
      searchStartTimeRef.current = Date.now();

      const queryString = new URLSearchParams(params as any).toString();
      const response = await fetch(`${url}?${queryString}`);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const result = await response.json();
      setSearchTime(Date.now() - (searchStartTimeRef.current || 0));

      return result;
    },
    {
      dedupingInterval: 1000,
      errorRetryCount: 2,
      onError: (err) => setError(err.message),
    },
  );

  const results = searchData?.results || [];
  const totalResults = searchData?.total || 0;

  // Load saved searches
  useEffect(() => {
    if (enableSavedSearches) {
      loadSavedSearches();
    }
  }, [enableSavedSearches]);

  // Generate AI suggestions when query changes
  useEffect(() => {
    if (!enableAISuggestions || !searchQuery) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      const aiSuggestions = generateAISuggestions(searchQuery, searchHistory);
      setSuggestions(aiSuggestions);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, enableAISuggestions, searchHistory, debounceMs]);

  // Load search facets when results change
  useEffect(() => {
    if (results.length > 0) {
      generateFacets(results);
    }
  }, [results]);

  const loadSavedSearches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .order('last_used', { ascending: false });

      if (error) throw error;
      setSavedSearches(data || []);
    } catch (err) {
      console.error('Failed to load saved searches:', err);
    }
  }, [supabase]);

  const generateFacets = useCallback((searchResults: SearchResult[]) => {
    const facetMap = new Map<string, Map<string, number>>();

    searchResults.forEach((result) => {
      // Type facet
      const typeKey = 'type';
      if (!facetMap.has(typeKey)) {
        facetMap.set(typeKey, new Map());
      }
      const typeMap = facetMap.get(typeKey)!;
      typeMap.set(result.type, (typeMap.get(result.type) || 0) + 1);

      // Metadata facets
      if (result.metadata) {
        Object.entries(result.metadata).forEach(([key, value]) => {
          if (typeof value === 'string' && value.length < 50) {
            if (!facetMap.has(key)) {
              facetMap.set(key, new Map());
            }
            const facetValues = facetMap.get(key)!;
            facetValues.set(value, (facetValues.get(value) || 0) + 1);
          }
        });
      }
    });

    const newFacets: SearchFacet[] = [];
    facetMap.forEach((values, field) => {
      const valueEntries: Array<[string, number]> = [];
      values.forEach((count, value) => {
        valueEntries.push([value, count]);
      });
      const sortedValues = valueEntries
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([value, count]) => ({
          value,
          label: value.charAt(0).toUpperCase() + value.slice(1),
          count,
        }));

      newFacets.push({
        field,
        label: field.charAt(0).toUpperCase() + field.slice(1),
        values: sortedValues,
      });
    });

    setFacets(newFacets);
  }, []);

  const addFilter = useCallback((filter: SearchFilter) => {
    setFilters((prev) => [...prev, filter]);
  }, []);

  const removeFilter = useCallback((index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters([]);
  }, []);

  const saveSearch = useCallback(
    async (name: string) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const searchData = {
          user_id: user.id,
          name,
          query: searchQuery,
          filters: JSON.stringify(filters),
          created_at: new Date().toISOString(),
          last_used: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('saved_searches')
          .insert(searchData)
          .select()
          .single();

        if (error) throw error;

        setSavedSearches((prev) => [data, ...prev]);
      } catch (err) {
        console.error('Failed to save search:', err);
        setError('Failed to save search');
      }
    },
    [searchQuery, filters, supabase],
  );

  const loadSavedSearch = useCallback(
    (searchId: string) => {
      const savedSearch = savedSearches.find((s) => s.id === searchId);
      if (savedSearch) {
        setSearchQuery(savedSearch.query);
        setFilters(JSON.parse(savedSearch.filters));

        // Update last used timestamp
        supabase
          .from('saved_searches')
          .update({ last_used: new Date().toISOString() })
          .eq('id', searchId)
          .then(() => loadSavedSearches());
      }
    },
    [savedSearches, supabase],
  );

  const deleteSavedSearch = useCallback(
    async (searchId: string) => {
      try {
        const { error } = await supabase
          .from('saved_searches')
          .delete()
          .eq('id', searchId);

        if (error) throw error;

        setSavedSearches((prev) => prev.filter((s) => s.id !== searchId));
      } catch (err) {
        console.error('Failed to delete saved search:', err);
        setError('Failed to delete saved search');
      }
    },
    [supabase],
  );

  const exportResults = useCallback(
    async (format: 'csv' | 'json' | 'pdf') => {
      try {
        const response = await fetch('/api/search/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            results,
            format,
            query: searchQuery,
            filters,
          }),
        });

        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `search-results.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Failed to export results:', err);
        setError('Failed to export results');
      }
    },
    [results, searchQuery, filters],
  );

  const refreshSuggestions = useCallback(() => {
    if (enableAISuggestions && searchQuery) {
      const aiSuggestions = generateAISuggestions(searchQuery, searchHistory);
      setSuggestions(aiSuggestions);
    }
  }, [searchQuery, enableAISuggestions, searchHistory]);

  // Update search history
  const handleSearchQueryChange = useCallback((query: string) => {
    setSearchQuery(query);
    setError(null);

    if (query.length >= 2) {
      setSearchHistory((prev) => {
        const newHistory = [query, ...prev.filter((h) => h !== query)];
        return newHistory.slice(0, 20); // Keep last 20 searches
      });
    }
  }, []);

  return {
    query: searchQuery,
    results,
    suggestions,
    filters,
    facets,
    savedSearches,
    isLoading,
    error,
    searchQuery,
    totalResults,
    searchTime,
    setSearchQuery: handleSearchQueryChange,
    addFilter,
    removeFilter,
    clearFilters,
    saveSearch,
    loadSavedSearch,
    deleteSavedSearch,
    exportResults,
    refreshSuggestions,
  };
}
