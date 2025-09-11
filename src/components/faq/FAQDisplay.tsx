'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Camera,
  CreditCard,
  MapPin,
  Package,
  Cloud,
  Shield,
  FileText,
  Star,
  Filter,
  X,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import { faqService } from '@/lib/services/faqService';
import type {
  FaqDisplayProps,
  FaqSearchRequest,
  FaqSearchResponse,
  FaqSearchResult,
} from '@/types/faq';
import { WEDDING_FAQ_CATEGORIES } from '@/types/faq';
import DOMPurify from 'isomorphic-dompurify';

// Category icon mapping
const CATEGORY_ICONS = {
  'booking-pricing': CreditCard,
  'timeline-delivery': Clock,
  'photography-process': Camera,
  'wedding-day-logistics': MapPin,
  'packages-addons': Package,
  'weather-backup': Cloud,
  'image-rights': Shield,
  'payment-contracts': FileText,
};

export function FAQDisplay({
  supplier_id,
  client_id,
  featured_only = false,
  category_filter,
  search_placeholder = 'Search FAQs...',
  max_results = 10,
}: FaqDisplayProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    category_filter || null,
  );
  const [searchResults, setSearchResults] = useState<FaqSearchResult[]>([]);
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string; slug: string; count: number }>
  >([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [searchDuration, setSearchDuration] = useState<number>(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<Set<string>>(
    new Set(),
  );

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Perform search when debounced query or category changes
  useEffect(() => {
    if (debouncedQuery.trim() || selectedCategory) {
      performSearch();
    } else {
      setSearchResults([]);
      setSuggestions([]);
      setHasSearched(false);
    }
  }, [debouncedQuery, selectedCategory]);

  const loadCategories = async () => {
    try {
      const categoriesData = await faqService.getFaqCategories(supplier_id);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const performSearch = useCallback(async () => {
    if (!debouncedQuery.trim() && !selectedCategory) return;

    setLoading(true);
    try {
      const searchRequest: FaqSearchRequest = {
        query: debouncedQuery,
        category_id: selectedCategory || undefined,
        limit: max_results,
        offset: 0,
        include_categories: !categories.length,
      };

      const response: FaqSearchResponse =
        await faqService.searchFaqs(searchRequest);

      setSearchResults(response.results);
      setSuggestions(response.suggestions || []);
      setSearchDuration(response.search_duration_ms);

      if (response.categories && !categories.length) {
        setCategories(response.categories);
      }

      setHasSearched(true);

      // Track search analytics if there's a query
      if (debouncedQuery.trim()) {
        // Analytics tracking will be handled by the service layer
      }
    } catch (error) {
      console.error('Error searching FAQs:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [
    debouncedQuery,
    selectedCategory,
    max_results,
    categories.length,
    supplier_id,
  ]);

  const handleFaqClick = async (faq: FaqSearchResult) => {
    // Toggle expanded state
    setExpandedFaq(expandedFaq === faq.id ? null : faq.id);

    // Track view analytics
    try {
      await faqService.trackAnalytics({
        faq_item_id: faq.id,
        event_type: 'view',
        search_query: searchQuery || undefined,
        user_session_id: generateSessionId(),
        metadata: {
          category: selectedCategory,
          client_id: client_id,
        },
      });
    } catch (error) {
      console.error('Error tracking FAQ view:', error);
    }
  };

  const handleFeedback = async (faq: FaqSearchResult, isHelpful: boolean) => {
    try {
      await faqService.submitFeedback({
        faq_item_id: faq.id,
        is_helpful: isHelpful,
        user_session_id: generateSessionId(),
      });

      // Track analytics
      await faqService.trackAnalytics({
        faq_item_id: faq.id,
        event_type: isHelpful ? 'helpful' : 'not_helpful',
        user_session_id: generateSessionId(),
        metadata: {
          client_id: client_id,
        },
      });

      setFeedbackSubmitted((prev) => new Set([...prev, faq.id]));
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setDebouncedQuery(suggestion);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setSelectedCategory(null);
    setSearchResults([]);
    setSuggestions([]);
    setHasSearched(false);
    setExpandedFaq(null);
  };

  const generateSessionId = () => {
    return `faq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const featuredFaqs = useMemo(
    () => searchResults.filter((faq) => faq.is_featured),
    [searchResults],
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-display-sm font-semibold text-gray-900">
          Frequently Asked Questions
        </h2>
        <p className="mt-2 text-md text-gray-600">
          Find answers to common questions about your wedding photography
        </p>
      </div>

      {/* Search Interface */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <div className="space-y-4">
          {/* Main Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={search_placeholder}
              className="
                w-full pl-12 pr-12 py-4
                bg-white border border-gray-300
                rounded-xl text-base
                text-gray-900 placeholder-gray-500
                shadow-sm
                focus:outline-none focus:ring-4 focus:ring-primary-100
                focus:border-primary-300
                transition-all duration-200
              "
            />
            {(searchQuery || selectedCategory) && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 flex items-center pr-4"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
              </button>
            )}
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                inline-flex items-center gap-2 px-3 py-1.5
                border rounded-lg text-sm font-medium
                transition-colors duration-200
                ${
                  showFilters
                    ? 'bg-primary-50 border-primary-200 text-primary-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <Filter className="w-4 h-4" />
              Categories
            </button>

            {selectedCategory && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-100 text-primary-700 text-sm font-medium rounded-lg border border-primary-200">
                {WEDDING_FAQ_CATEGORIES.find(
                  (cat) => cat.slug === selectedCategory,
                )?.name || selectedCategory}
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-primary-500 hover:text-primary-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          {/* Expanded Category Filters */}
          {showFilters && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex flex-wrap gap-2">
                {WEDDING_FAQ_CATEGORIES.map((category) => {
                  const Icon =
                    CATEGORY_ICONS[
                      category.slug as keyof typeof CATEGORY_ICONS
                    ];
                  const isSelected = selectedCategory === category.slug;
                  const categoryData = categories.find(
                    (cat) => cat.slug === category.slug,
                  );

                  return (
                    <button
                      key={category.slug}
                      onClick={() =>
                        setSelectedCategory(isSelected ? null : category.slug)
                      }
                      className={`
                        inline-flex items-center gap-2 px-3 py-2
                        border rounded-lg text-sm font-medium
                        transition-colors duration-200
                        ${
                          isSelected
                            ? 'bg-primary-100 border-primary-200 text-primary-700'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      {Icon && <Icon className="w-4 h-4" />}
                      {category.name}
                      {categoryData && categoryData.count > 0 && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                          {categoryData.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search Suggestions */}
          {suggestions.length > 0 && searchQuery.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Suggested searches:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-sm text-gray-600">Searching FAQs...</p>
        </div>
      )}

      {/* Featured FAQs */}
      {!hasSearched && featured_only && featuredFaqs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-warning-500 fill-current" />
            <h3 className="text-lg font-semibold text-gray-900">
              Featured Questions
            </h3>
          </div>
          <div className="space-y-4">
            {featuredFaqs.map((faq) => (
              <FAQItem
                key={faq.id}
                faq={faq}
                isExpanded={expandedFaq === faq.id}
                onToggle={() => handleFaqClick(faq)}
                onFeedback={(isHelpful) => handleFeedback(faq, isHelpful)}
                feedbackSubmitted={feedbackSubmitted.has(faq.id)}
                highlightTerms={searchQuery ? [searchQuery] : []}
              />
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {hasSearched && (
        <div className="space-y-4">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {searchResults.length > 0
                  ? `Found ${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`
                  : 'No results found'}
              </h3>
              {searchDuration > 0 && (
                <span className="text-sm text-gray-500">
                  ({searchDuration}ms)
                </span>
              )}
            </div>
          </div>

          {/* Results List */}
          {searchResults.length > 0 ? (
            <div className="space-y-4">
              {searchResults.map((faq) => (
                <FAQItem
                  key={faq.id}
                  faq={faq}
                  isExpanded={expandedFaq === faq.id}
                  onToggle={() => handleFaqClick(faq)}
                  onFeedback={(isHelpful) => handleFeedback(faq, isHelpful)}
                  feedbackSubmitted={feedbackSubmitted.has(faq.id)}
                  highlightTerms={
                    searchQuery
                      ? searchQuery.split(' ').filter((term) => term.length > 2)
                      : []
                  }
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No FAQs found
              </h3>
              <p className="text-gray-500 mb-4">
                Try adjusting your search terms or browse by category
              </p>
              {suggestions.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Try these searches:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-3 py-1 bg-primary-50 hover:bg-primary-100 text-primary-700 text-sm rounded-full transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Popular Categories (when no search) */}
      {!hasSearched && !featured_only && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Browse by Category
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {WEDDING_FAQ_CATEGORIES.map((category) => {
              const Icon =
                CATEGORY_ICONS[category.slug as keyof typeof CATEGORY_ICONS];
              const categoryData = categories.find(
                (cat) => cat.slug === category.slug,
              );

              return (
                <button
                  key={category.slug}
                  onClick={() => setSelectedCategory(category.slug)}
                  className="
                    p-4 text-left
                    bg-white border border-gray-200 hover:border-primary-300
                    rounded-xl shadow-xs hover:shadow-sm
                    transition-all duration-200
                    group
                  "
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary-50 rounded-lg group-hover:bg-primary-100 transition-colors">
                      {Icon && <Icon className="w-5 h-5 text-primary-600" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 group-hover:text-primary-900 transition-colors">
                        {category.name}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                        {category.description}
                      </p>
                      {categoryData && categoryData.count > 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                          {categoryData.count} FAQ
                          {categoryData.count !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Individual FAQ Item Component
function FAQItem({
  faq,
  isExpanded,
  onToggle,
  onFeedback,
  feedbackSubmitted,
  highlightTerms = [],
}: {
  faq: FaqSearchResult;
  isExpanded: boolean;
  onToggle: () => void;
  onFeedback: (isHelpful: boolean) => void;
  feedbackSubmitted: boolean;
  highlightTerms: string[];
}) {
  const highlightText = (text: string, terms: string[]) => {
    if (!terms.length) return DOMPurify.sanitize(text);

    // First sanitize the input text to prevent XSS
    let highlightedText = DOMPurify.sanitize(text);

    terms.forEach((term) => {
      if (term.length > 2) {
        // Escape the search term to prevent regex injection
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        highlightedText = highlightedText.replace(
          regex,
          '<mark class="bg-yellow-200 px-1 py-0.5 rounded">$1</mark>',
        );
      }
    });

    // Sanitize again to ensure only safe HTML (mark tags) remain
    return DOMPurify.sanitize(highlightedText, {
      ALLOWED_TAGS: ['mark'],
      ALLOWED_ATTR: ['class'],
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xs hover:shadow-sm transition-all duration-200">
      <button
        onClick={onToggle}
        className="w-full p-6 text-left focus:outline-none focus:ring-4 focus:ring-primary-100 rounded-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-2">
              {faq.category_name && (
                <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                  {faq.category_name}
                </span>
              )}
              {faq.is_featured && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-warning-50 text-warning-700 text-xs font-medium rounded-full border border-warning-200">
                  <Star className="w-3 h-3 fill-current" />
                  Featured
                </span>
              )}
            </div>

            <h3 className="text-base font-semibold text-gray-900 mb-2">
              <span
                dangerouslySetInnerHTML={{
                  __html: faq.highlighted_question
                    ? DOMPurify.sanitize(faq.highlighted_question, {
                        ALLOWED_TAGS: ['mark'],
                        ALLOWED_ATTR: ['class'],
                      })
                    : highlightText(faq.question, highlightTerms),
                }}
              />
            </h3>

            {(faq.summary || !isExpanded) && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {faq.summary || faq.answer.substring(0, 120) + '...'}
              </p>
            )}

            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {faq.view_count} views
              </span>
              {faq.help_score > 0 && (
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" />
                  {faq.help_score} helpful
                </span>
              )}
            </div>
          </div>

          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 px-6 pb-6">
          <div className="pt-6">
            <div className="prose prose-gray max-w-none">
              <div
                className="text-gray-700 leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: faq.highlighted_answer
                    ? DOMPurify.sanitize(faq.highlighted_answer, {
                        ALLOWED_TAGS: ['mark'],
                        ALLOWED_ATTR: ['class'],
                      })
                    : highlightText(faq.answer, highlightTerms),
                }}
              />
            </div>

            {faq.tags && faq.tags.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-600">
                    Related:
                  </span>
                  {faq.tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback Section */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  Was this helpful?
                </p>

                {feedbackSubmitted ? (
                  <span className="text-sm text-success-600 font-medium">
                    Thank you for your feedback!
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFeedback(true);
                      }}
                      className="
                        inline-flex items-center gap-1 px-3 py-1.5
                        bg-white border border-gray-300
                        text-gray-700 text-sm font-medium
                        rounded-lg hover:bg-gray-50
                        transition-colors
                      "
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Yes
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFeedback(false);
                      }}
                      className="
                        inline-flex items-center gap-1 px-3 py-1.5
                        bg-white border border-gray-300
                        text-gray-700 text-sm font-medium
                        rounded-lg hover:bg-gray-50
                        transition-colors
                      "
                    >
                      <ThumbsDown className="w-4 h-4" />
                      No
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
