'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  Search,
  Mic,
  MicOff,
  Filter,
  Clock,
  TrendingUp,
  X,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  SmartSearchProps,
  AutocompleteSuggestion,
  SearchConfig,
  KnowledgeArticle,
} from '@/types/knowledge-base';

/**
 * SmartSearch Component - Intelligent search with autocomplete and suggestions
 * Part of WS-210: AI Knowledge Base System
 *
 * Real Wedding Scenario:
 * A photographer searches "timeline for outdoor ceremony" and gets:
 * - Autocomplete suggestions as they type
 * - Recent searches
 * - Trending topics
 * - Voice search capability
 * - Smart filtering options
 */
export default function SmartSearch({
  placeholder = 'Search knowledge base...',
  onSearch,
  onSuggestionSelect,
  loading = false,
  suggestions = [],
  recent_searches = [],
  className,
  show_filters = true,
  enable_voice_search = true,
}: SmartSearchProps) {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [filters, setFilters] = useState<Partial<SearchConfig>>({});
  const [showFilters, setShowFilters] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Voice recognition setup
  useEffect(() => {
    if (enable_voice_search && 'webkitSpeechRecognition' in window) {
      recognitionRef.current = new (window as any).webkitSpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        handleSearch(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [enable_voice_search]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((searchQuery: string) => {
      if (searchQuery.trim()) {
        onSearch(searchQuery, filters);
      }
    }, 300),
    [onSearch, filters],
  );

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(true);

    if (value.trim()) {
      debouncedSearch(value);
    }
  };

  // Handle search execution
  const handleSearch = (searchQuery?: string) => {
    const searchTerm = searchQuery || query;
    if (searchTerm.trim()) {
      onSearch(searchTerm, filters);
      setShowSuggestions(false);
      setIsExpanded(false);

      // Add to recent searches (simulated)
      if (!recent_searches.includes(searchTerm)) {
        recent_searches.unshift(searchTerm);
        if (recent_searches.length > 5) {
          recent_searches.pop();
        }
      }
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: AutocompleteSuggestion) => {
    setQuery(suggestion.text);
    onSuggestionSelect(suggestion);
    handleSearch(suggestion.text);
  };

  // Handle voice search
  const handleVoiceSearch = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    } else if (isListening) {
      setIsListening(false);
      recognitionRef.current?.stop();
    }
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    setShowSuggestions(false);
    setIsExpanded(false);
    inputRef.current?.focus();
  };

  // Filter suggestions based on query
  const filteredSuggestions = useMemo(() => {
    if (!query.trim()) return [];
    return suggestions.filter((s) =>
      s.text.toLowerCase().includes(query.toLowerCase()),
    );
  }, [suggestions, query]);

  // Trending topics (mock data for demo)
  const trendingTopics = [
    'outdoor wedding timeline',
    'reception planning',
    'vendor coordination',
    'photography schedule',
    'catering requirements',
  ];

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('relative w-full', className)}>
      {/* Main Search Input */}
      <div className="relative">
        <div
          className={cn(
            'relative flex items-center transition-all duration-200',
            isExpanded ? 'shadow-lg ring-2 ring-blue-500/20' : 'shadow-sm',
          )}
        >
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />

          <Input
            ref={inputRef}
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              setIsExpanded(true);
              setShowSuggestions(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              } else if (e.key === 'Escape') {
                handleClear();
              }
            }}
            placeholder={placeholder}
            className={cn(
              'pl-10 pr-20 h-12 text-base',
              isExpanded && 'border-blue-300 bg-white',
            )}
            disabled={loading}
          />

          <div className="absolute right-3 flex items-center gap-2">
            {/* Voice Search Button */}
            {enable_voice_search && 'webkitSpeechRecognition' in window && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVoiceSearch}
                className={cn(
                  'h-8 w-8 p-0',
                  isListening && 'text-red-500 animate-pulse',
                )}
                disabled={loading}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Clear Button */}
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}

            {/* Filter Toggle */}
            {show_filters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'h-8 w-8 p-0',
                  showFilters && 'bg-blue-100 text-blue-700',
                )}
              >
                <Filter className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="absolute inset-x-0 top-full">
            <div className="h-1 bg-blue-200">
              <div className="h-full bg-blue-500 animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {/* Quick Filters */}
      {showFilters && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Category
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {[
                    'all',
                    'timeline',
                    'venue',
                    'photography',
                    'catering',
                    'florist',
                  ].map((category) => (
                    <Badge
                      key={category}
                      variant={
                        filters.category === category ? 'default' : 'outline'
                      }
                      className="cursor-pointer capitalize"
                      onClick={() =>
                        setFilters({ ...filters, category: category as any })
                      }
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Sort by
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {['relevance', 'date', 'views', 'likes'].map((sort) => (
                    <Badge
                      key={sort}
                      variant={filters.sort_by === sort ? 'default' : 'outline'}
                      className="cursor-pointer capitalize"
                      onClick={() =>
                        setFilters({ ...filters, sort_by: sort as any })
                      }
                    >
                      {sort}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && (isExpanded || query) && (
        <Card
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 z-40 mt-1 max-h-96 overflow-hidden"
        >
          <CardContent className="p-0">
            {/* Autocomplete Suggestions */}
            {filteredSuggestions.length > 0 && (
              <div className="p-2">
                <div className="text-xs font-medium text-muted-foreground mb-2 px-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Suggestions
                </div>
                {filteredSuggestions.slice(0, 5).map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer rounded-sm"
                  >
                    <Search className="h-3 w-3 text-muted-foreground" />
                    <span className="flex-1 text-sm">{suggestion.text}</span>
                    <Badge variant="outline" className="text-xs">
                      {suggestion.type}
                    </Badge>
                  </div>
                ))}
                <Separator className="my-2" />
              </div>
            )}

            {/* Recent Searches */}
            {recent_searches.length > 0 && !query && (
              <div className="p-2">
                <div className="text-xs font-medium text-muted-foreground mb-2 px-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Recent Searches
                </div>
                {recent_searches.slice(0, 3).map((search, index) => (
                  <div
                    key={index}
                    onClick={() => handleSearch(search)}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer rounded-sm"
                  >
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="flex-1 text-sm text-gray-700">
                      {search}
                    </span>
                  </div>
                ))}
                <Separator className="my-2" />
              </div>
            )}

            {/* Trending Topics */}
            {!query && (
              <div className="p-2">
                <div className="text-xs font-medium text-muted-foreground mb-2 px-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Trending Topics
                </div>
                {trendingTopics.map((topic, index) => (
                  <div
                    key={index}
                    onClick={() => handleSearch(topic)}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer rounded-sm"
                  >
                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                    <span className="flex-1 text-sm text-gray-700">
                      {topic}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* No Results */}
            {query && filteredSuggestions.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No suggestions found for "{query}"
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSearch()}
                  >
                    Search anyway
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
