'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  SearchIcon,
  FilterIcon,
  BookOpenIcon,
  ClockIcon,
  TagIcon,
  TrendingUpIcon,
  MicIcon,
  MicOffIcon,
  XIcon,
  ChevronDownIcon,
  RefreshCwIcon,
  StarIcon,
  BookmarkIcon,
  ShareIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import {
  useHapticFeedback,
  PullToRefresh,
  BottomSheet,
  SwipeableCard,
} from '@/components/mobile/MobileEnhancedFeatures';

// Types
interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  summary: string;
  category: KnowledgeCategory;
  tags: string[];
  relevanceScore: number;
  readTime: string;
  lastUpdated: string;
  viewCount: number;
  isFavorite: boolean;
  isBookmarked: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  author?: string;
  rating?: number;
}

interface KnowledgeCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  articleCount: number;
}

interface SearchFilters {
  category?: string;
  difficulty?: string[];
  tags?: string[];
  dateRange?: 'day' | 'week' | 'month' | 'year';
  sortBy: 'relevance' | 'date' | 'popularity' | 'rating';
}

interface SearchSuggestion {
  query: string;
  category: string;
  count: number;
}

interface MobileKnowledgeSearchProps {
  onArticleSelect: (article: KnowledgeArticle) => void;
  initialQuery?: string;
  categories?: KnowledgeCategory[];
  className?: string;
}

// Mock data for demonstration
const MOCK_CATEGORIES: KnowledgeCategory[] = [
  {
    id: 'photography',
    name: 'Photography Tips',
    icon: '📸',
    color: 'bg-blue-100 text-blue-700',
    articleCount: 145,
  },
  {
    id: 'business',
    name: 'Business Guide',
    icon: '💼',
    color: 'bg-green-100 text-green-700',
    articleCount: 89,
  },
  {
    id: 'wedding-day',
    name: 'Wedding Day',
    icon: '💒',
    color: 'bg-pink-100 text-pink-700',
    articleCount: 67,
  },
  {
    id: 'client-relations',
    name: 'Client Relations',
    icon: '🤝',
    color: 'bg-purple-100 text-purple-700',
    articleCount: 54,
  },
  {
    id: 'technical',
    name: 'Technical Setup',
    icon: '⚙️',
    color: 'bg-orange-100 text-orange-700',
    articleCount: 32,
  },
  {
    id: 'marketing',
    name: 'Marketing',
    icon: '📈',
    color: 'bg-indigo-100 text-indigo-700',
    articleCount: 78,
  },
];

const MOCK_SUGGESTIONS: SearchSuggestion[] = [
  { query: 'wedding timeline planning', category: 'wedding-day', count: 23 },
  {
    query: 'client communication templates',
    category: 'client-relations',
    count: 18,
  },
  { query: 'pricing strategy guide', category: 'business', count: 31 },
  { query: 'backup equipment checklist', category: 'technical', count: 12 },
  { query: 'social media marketing', category: 'marketing', count: 27 },
];

// Voice recognition hook for search
function useVoiceSearch() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    if (
      !('webkitSpeechRecognition' in window) &&
      !('SpeechRecognition' in window)
    ) {
      console.warn('Speech recognition not supported');
      return false;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();

    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      setIsListening(true);
    };

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      let confidence = 0;

      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
          confidence = event.results[i][0].confidence;
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript);
        setConfidence(confidence);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
    return true;
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setConfidence(0);
  }, []);

  return {
    isListening,
    transcript,
    confidence,
    startListening,
    stopListening,
    clearTranscript,
    isSupported:
      'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
  };
}

export function MobileKnowledgeSearch({
  onArticleSelect,
  initialQuery = '',
  categories = MOCK_CATEGORIES,
  className,
}: MobileKnowledgeSearchProps) {
  const { toast } = useToast();
  const haptic = useHapticFeedback();
  const voice = useVoiceSearch();

  // State
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<KnowledgeArticle[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'relevance',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const TOUCH_TARGET_SIZE = 48;

  // Debounced search
  const debouncedSearch = useCallback((searchQuery: string) => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Mock search function - replace with real API
  const performSearch = useCallback(
    async (searchQuery: string) => {
      setIsSearching(true);
      haptic.light();

      try {
        // Mock API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Mock search results based on query
        const mockResults: KnowledgeArticle[] = [
          {
            id: '1',
            title: 'Complete Wedding Day Timeline Planning Guide',
            content:
              'A comprehensive guide to planning the perfect wedding day timeline...',
            summary:
              'Learn how to create detailed wedding timelines that keep everyone on schedule.',
            category:
              categories.find((c) => c.id === 'wedding-day') || categories[0],
            tags: ['timeline', 'planning', 'wedding-day', 'schedule'],
            relevanceScore: 0.95,
            readTime: '8 min read',
            lastUpdated: '2024-01-15',
            viewCount: 1245,
            isFavorite: false,
            isBookmarked: true,
            difficulty: 'intermediate',
            author: 'Sarah Johnson',
            rating: 4.8,
          },
          {
            id: '2',
            title: 'Essential Client Communication Templates',
            content:
              'Professional email templates for every stage of client interaction...',
            summary:
              'Ready-to-use email templates that maintain professionalism.',
            category:
              categories.find((c) => c.id === 'client-relations') ||
              categories[0],
            tags: ['communication', 'templates', 'emails', 'client-management'],
            relevanceScore: 0.87,
            readTime: '5 min read',
            lastUpdated: '2024-01-20',
            viewCount: 892,
            isFavorite: true,
            isBookmarked: false,
            difficulty: 'beginner',
            author: 'Mike Chen',
            rating: 4.6,
          },
          {
            id: '3',
            title: 'Wedding Photography Equipment Backup Strategy',
            content:
              'How to prepare backup equipment and handle technical failures...',
            summary: 'Essential backup strategies for wedding photographers.',
            category:
              categories.find((c) => c.id === 'technical') || categories[0],
            tags: ['equipment', 'backup', 'technical', 'preparation'],
            relevanceScore: 0.75,
            readTime: '12 min read',
            lastUpdated: '2024-01-18',
            viewCount: 567,
            isFavorite: false,
            isBookmarked: false,
            difficulty: 'advanced',
            author: 'Alex Rivera',
            rating: 4.9,
          },
        ];

        // Filter results based on query and filters
        let filteredResults = mockResults.filter(
          (article) =>
            article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.tags.some((tag) =>
              tag.toLowerCase().includes(searchQuery.toLowerCase()),
            ),
        );

        // Apply filters
        if (filters.category) {
          filteredResults = filteredResults.filter(
            (article) => article.category.id === filters.category,
          );
        }

        if (filters.difficulty && filters.difficulty.length > 0) {
          filteredResults = filteredResults.filter((article) =>
            filters.difficulty!.includes(article.difficulty),
          );
        }

        // Sort results
        switch (filters.sortBy) {
          case 'date':
            filteredResults.sort(
              (a, b) =>
                new Date(b.lastUpdated).getTime() -
                new Date(a.lastUpdated).getTime(),
            );
            break;
          case 'popularity':
            filteredResults.sort((a, b) => b.viewCount - a.viewCount);
            break;
          case 'rating':
            filteredResults.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            break;
          default: // relevance
            filteredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
        }

        setSearchResults(filteredResults);

        // Add to search history
        if (searchQuery.trim() && !searchHistory.includes(searchQuery)) {
          setSearchHistory((prev) => [searchQuery, ...prev.slice(0, 4)]);
        }
      } catch (error) {
        console.error('Search failed:', error);
        toast({
          title: 'Search failed',
          description: 'Please check your connection and try again',
          variant: 'destructive',
        });
        haptic.error();
      } finally {
        setIsSearching(false);
      }
    },
    [filters, haptic, toast, categories, searchHistory],
  );

  // Handle voice input
  useEffect(() => {
    if (voice.transcript && voice.confidence > 0.7) {
      setQuery(voice.transcript);
      voice.clearTranscript();
    }
  }, [voice.transcript, voice.confidence, voice]);

  // Handle search query changes
  useEffect(() => {
    const cleanup = debouncedSearch(query);
    return cleanup;
  }, [query, debouncedSearch]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    if (query.trim()) {
      await performSearch(query);
    }
  }, [query, performSearch]);

  // Category selection
  const handleCategorySelect = useCallback(
    (categoryId: string) => {
      haptic.light();
      setActiveCategory(activeCategory === categoryId ? null : categoryId);
      setFilters((prev) => ({
        ...prev,
        category: activeCategory === categoryId ? undefined : categoryId,
      }));
    },
    [activeCategory, haptic],
  );

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setSearchResults([]);
    setActiveCategory(null);
    haptic.light();
    searchInputRef.current?.focus();
  }, [haptic]);

  // Handle article selection
  const handleArticleSelect = useCallback(
    (article: KnowledgeArticle) => {
      haptic.medium();
      onArticleSelect(article);
      toast({
        title: 'Article opened',
        description: article.title,
      });
    },
    [haptic, onArticleSelect, toast],
  );

  // Toggle article bookmark
  const toggleBookmark = useCallback(
    (articleId: string) => {
      haptic.light();
      setSearchResults((prev) =>
        prev.map((article) =>
          article.id === articleId
            ? { ...article, isBookmarked: !article.isBookmarked }
            : article,
        ),
      );
    },
    [haptic],
  );

  // Popular searches or suggestions
  const showSuggestions = useMemo(() => {
    return !query.trim() && searchResults.length === 0;
  }, [query, searchResults]);

  return (
    <div
      className={cn('mobile-knowledge-search bg-white min-h-screen', className)}
    >
      <PullToRefresh
        onRefresh={handleRefresh}
        disabled={isSearching}
        className="h-full"
      >
        {/* Header with Search */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-20">
          <div className="p-4">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search knowledge base..."
                className={cn(
                  'w-full pl-12 pr-20 py-3 border border-gray-300 rounded-lg',
                  'text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                  `min-h-[${TOUCH_TARGET_SIZE}px]`,
                )}
              />
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                {voice.isSupported && (
                  <button
                    onClick={
                      voice.isListening
                        ? voice.stopListening
                        : voice.startListening
                    }
                    className={cn(
                      'p-2 rounded-full transition-all active:scale-95',
                      voice.isListening
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-600',
                      `min-w-[${TOUCH_TARGET_SIZE - 16}px] min-h-[${TOUCH_TARGET_SIZE - 16}px]`,
                    )}
                  >
                    {voice.isListening ? (
                      <MicIcon className="w-4 h-4" />
                    ) : (
                      <MicOffIcon className="w-4 h-4" />
                    )}
                  </button>
                )}

                <button
                  onClick={() => setShowFilters(true)}
                  className={cn(
                    'p-2 rounded-full bg-gray-100 text-gray-600 transition-all active:scale-95',
                    `min-w-[${TOUCH_TARGET_SIZE - 16}px] min-h-[${TOUCH_TARGET_SIZE - 16}px]`,
                  )}
                >
                  <FilterIcon className="w-4 h-4" />
                </button>

                {query && (
                  <button
                    onClick={clearSearch}
                    className={cn(
                      'p-2 rounded-full bg-gray-100 text-gray-600 transition-all active:scale-95',
                      `min-w-[${TOUCH_TARGET_SIZE - 16}px] min-h-[${TOUCH_TARGET_SIZE - 16}px]`,
                    )}
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Voice listening indicator */}
            {voice.isListening && (
              <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-800 flex items-center">
                  <MicIcon className="w-4 h-4 mr-2 animate-pulse" />
                  Listening... Speak your search query
                </p>
              </div>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="px-4 pb-4">
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                  className={cn(
                    'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95',
                    'flex items-center space-x-2 whitespace-nowrap',
                    activeCategory === category.id
                      ? category.color
                      : 'bg-gray-100 text-gray-700',
                    `min-h-[${TOUCH_TARGET_SIZE - 8}px]`,
                  )}
                >
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                  <span className="text-xs opacity-75">
                    ({category.articleCount})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Loading State */}
          {isSearching && (
            <div className="flex items-center justify-center py-8">
              <RefreshCwIcon className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Searching...</span>
            </div>
          )}

          {/* Search Results */}
          {!isSearching && searchResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {searchResults.length} Result
                  {searchResults.length !== 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-gray-500">
                  Sorted by {filters.sortBy}
                </p>
              </div>

              {searchResults.map((article) => (
                <SwipeableCard
                  key={article.id}
                  onSwipeLeft={() => toggleBookmark(article.id)}
                  onSwipeRight={() => handleArticleSelect(article)}
                  leftAction={{
                    icon: article.isBookmarked ? BookmarkIcon : BookmarkIcon,
                    color: article.isBookmarked
                      ? 'text-blue-600'
                      : 'text-gray-400',
                    label: article.isBookmarked
                      ? 'Remove bookmark'
                      : 'Bookmark',
                  }}
                  rightAction={{
                    icon: BookOpenIcon,
                    color: 'text-green-600',
                    label: 'Open article',
                  }}
                  className="bg-white border border-gray-200 rounded-lg p-4"
                >
                  <div
                    onClick={() => handleArticleSelect(article)}
                    className="space-y-3 cursor-pointer"
                  >
                    {/* Article Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-4">
                        <h4 className="font-semibold text-gray-900 line-clamp-2">
                          {article.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {article.summary}
                        </p>
                      </div>
                      {article.rating && (
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <StarIcon className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium">
                            {article.rating}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Article Meta */}
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div
                        className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          article.category.color,
                        )}
                      >
                        {article.category.icon} {article.category.name}
                      </div>
                      <span className="flex items-center">
                        <ClockIcon className="w-3 h-3 mr-1" />
                        {article.readTime}
                      </span>
                      <span className="flex items-center">
                        <TrendingUpIcon className="w-3 h-3 mr-1" />
                        {article.viewCount} views
                      </span>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {article.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                      {article.tags.length > 3 && (
                        <span className="text-xs text-gray-400">
                          +{article.tags.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Difficulty Badge */}
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          article.difficulty === 'beginner' &&
                            'bg-green-100 text-green-700',
                          article.difficulty === 'intermediate' &&
                            'bg-yellow-100 text-yellow-700',
                          article.difficulty === 'advanced' &&
                            'bg-red-100 text-red-700',
                        )}
                      >
                        {article.difficulty}
                      </span>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(article.id);
                          }}
                          className="p-1"
                        >
                          <BookmarkIcon
                            className={cn(
                              'w-4 h-4',
                              article.isBookmarked
                                ? 'text-blue-600 fill-current'
                                : 'text-gray-400',
                            )}
                          />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            haptic.light();
                            // Share functionality
                          }}
                          className="p-1"
                        >
                          <ShareIcon className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </SwipeableCard>
              ))}
            </div>
          )}

          {/* No Results */}
          {!isSearching && query.trim() && searchResults.length === 0 && (
            <div className="text-center py-8">
              <BookOpenIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No articles found
              </h3>
              <p className="text-gray-600 mb-4">
                Try different keywords or remove some filters
              </p>
              <button
                onClick={clearSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
              >
                Clear search
              </button>
            </div>
          )}

          {/* Suggestions */}
          {showSuggestions && (
            <div className="space-y-6">
              {/* Popular Searches */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Popular searches</h3>
                <div className="grid grid-cols-1 gap-3">
                  {MOCK_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion.query}
                      onClick={() => setQuery(suggestion.query)}
                      className={cn(
                        'flex items-center justify-between p-4 bg-gray-50 rounded-lg',
                        'transition-all active:scale-95',
                        `min-h-[${TOUCH_TARGET_SIZE}px]`,
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <TrendingUpIcon className="w-5 h-5 text-gray-400" />
                        <div className="text-left">
                          <p className="font-medium text-gray-900">
                            {suggestion.query}
                          </p>
                          <p className="text-xs text-gray-500">
                            {
                              categories.find(
                                (c) => c.id === suggestion.category,
                              )?.name
                            }
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-gray-400">
                        {suggestion.count} articles
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent Searches */}
              {searchHistory.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Recent searches
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => setQuery(search)}
                        className="px-3 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-medium"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filters Bottom Sheet */}
        <BottomSheet
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          snapPoints={[0.6, 0.9]}
        >
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Search Filters</h2>

            <div className="space-y-6">
              {/* Sort By */}
              <div>
                <h3 className="font-medium mb-3">Sort by</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(['relevance', 'date', 'popularity', 'rating'] as const).map(
                    (sort) => (
                      <button
                        key={sort}
                        onClick={() => {
                          setFilters((prev) => ({ ...prev, sortBy: sort }));
                          haptic.light();
                        }}
                        className={cn(
                          'p-3 rounded-lg border text-center font-medium transition-all active:scale-95',
                          filters.sortBy === sort
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-700 border-gray-300',
                          `min-h-[${TOUCH_TARGET_SIZE}px]`,
                        )}
                      >
                        {sort.charAt(0).toUpperCase() + sort.slice(1)}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Difficulty Filter */}
              <div>
                <h3 className="font-medium mb-3">Difficulty</h3>
                <div className="grid grid-cols-3 gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as const).map(
                    (level) => (
                      <button
                        key={level}
                        onClick={() => {
                          setFilters((prev) => ({
                            ...prev,
                            difficulty: prev.difficulty?.includes(level)
                              ? prev.difficulty.filter((d) => d !== level)
                              : [...(prev.difficulty || []), level],
                          }));
                          haptic.light();
                        }}
                        className={cn(
                          'p-3 rounded-lg border text-center font-medium transition-all active:scale-95',
                          filters.difficulty?.includes(level)
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-700 border-gray-300',
                          `min-h-[${TOUCH_TARGET_SIZE}px]`,
                        )}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Clear Filters */}
              <button
                onClick={() => {
                  setFilters({ sortBy: 'relevance' });
                  setActiveCategory(null);
                  haptic.medium();
                  setShowFilters(false);
                }}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium"
              >
                Clear all filters
              </button>
            </div>
          </div>
        </BottomSheet>
      </PullToRefresh>
    </div>
  );
}
