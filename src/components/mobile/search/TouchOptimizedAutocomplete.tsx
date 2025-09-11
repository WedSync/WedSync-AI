'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Clock, TrendingUp, X, Filter } from 'lucide-react';
import { SearchFilters } from '@/types/mobile-search';
import { cn } from '@/lib/utils';

interface AutocompleteSuggestion {
  id: string;
  text: string;
  type: 'vendor' | 'location' | 'service' | 'recent' | 'popular';
  category?: string;
  location?: string;
  metadata?: {
    vendorCount?: number;
    avgRating?: number;
    priceRange?: string;
  };
}

interface TouchOptimizedAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AutocompleteSuggestion) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  filters?: SearchFilters;
  userLocation?: { lat: number; lng: number };
  className?: string;
}

// Wedding vendor database for intelligent suggestions
const VENDOR_SUGGESTIONS = [
  // Photographers
  {
    category: 'photographer',
    services: [
      'wedding photography',
      'engagement photos',
      'bridal portraits',
      'photo booth',
    ],
  },
  // Venues
  {
    category: 'venue',
    services: [
      'wedding venues',
      'reception halls',
      'outdoor venues',
      'barn venues',
      'church venues',
    ],
  },
  // Florists
  {
    category: 'florist',
    services: [
      'wedding flowers',
      'bridal bouquet',
      'centerpieces',
      'ceremony flowers',
    ],
  },
  // Catering
  {
    category: 'catering',
    services: [
      'wedding catering',
      'buffet catering',
      'plated dinner',
      'cocktail hour',
    ],
  },
  // Music
  {
    category: 'music',
    services: ['wedding DJ', 'live band', 'ceremony music', 'reception music'],
  },
  // Planning
  {
    category: 'planning',
    services: [
      'wedding planner',
      'day-of coordinator',
      'full service planning',
    ],
  },
  // Transport
  {
    category: 'transport',
    services: ['wedding transport', 'bridal car', 'guest shuttle', 'limousine'],
  },
  // Beauty
  {
    category: 'beauty',
    services: [
      'bridal makeup',
      'wedding hair',
      'beauty services',
      'bridal trial',
    ],
  },
];

// UK locations for location-aware suggestions
const UK_LOCATIONS = [
  'London',
  'Birmingham',
  'Manchester',
  'Liverpool',
  'Leeds',
  'Sheffield',
  'Bristol',
  'Newcastle',
  'Nottingham',
  'Southampton',
  'Brighton',
  'Cardiff',
  'Edinburgh',
  'Glasgow',
  'Belfast',
  'Bath',
  'Oxford',
  'Cambridge',
  'York',
  'Canterbury',
];

export default function TouchOptimizedAutocomplete({
  value,
  onChange,
  onSelect,
  onSearch,
  placeholder = 'Search wedding vendors...',
  filters,
  userLocation,
  className,
}: TouchOptimizedAutocompleteProps) {
  const [isActive, setIsActive] = useState(false);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load recent and popular searches
  useEffect(() => {
    const stored = localStorage.getItem('wedsync_recent_searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load recent searches:', error);
      }
    }

    const popular = localStorage.getItem('wedsync_popular_searches');
    if (popular) {
      try {
        setPopularSearches(JSON.parse(popular));
      } catch (error) {
        setPopularSearches([
          'wedding photographers',
          'venues near me',
          'wedding florists',
          'budget wedding services',
          'outdoor venues',
        ]);
      }
    } else {
      setPopularSearches([
        'wedding photographers',
        'venues near me',
        'wedding florists',
        'budget wedding services',
        'outdoor venues',
      ]);
    }
  }, []);

  // Trigger haptic feedback
  const triggerHapticFeedback = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'light') => {
      if ('vibrate' in navigator) {
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [50],
        };
        navigator.vibrate(patterns[type]);
      }
    },
    [],
  );

  // Generate intelligent suggestions based on input
  const generateSuggestions = useCallback(
    (input: string): AutocompleteSuggestion[] => {
      if (!input.trim()) {
        // No input - show recent and popular searches
        const recentSuggestions: AutocompleteSuggestion[] = recentSearches
          .slice(0, 3)
          .map((search, index) => ({
            id: `recent-${index}`,
            text: search,
            type: 'recent',
          }));

        const popularSuggestions: AutocompleteSuggestion[] = popularSearches
          .slice(0, 4)
          .map((search, index) => ({
            id: `popular-${index}`,
            text: search,
            type: 'popular',
          }));

        return [...recentSuggestions, ...popularSuggestions];
      }

      const suggestions: AutocompleteSuggestion[] = [];
      const query = input.toLowerCase().trim();

      // 1. Vendor-specific suggestions
      VENDOR_SUGGESTIONS.forEach((vendor) => {
        vendor.services.forEach((service) => {
          if (service.toLowerCase().includes(query)) {
            suggestions.push({
              id: `vendor-${vendor.category}-${service}`,
              text: service,
              type: 'service',
              category: vendor.category,
              metadata: {
                vendorCount: Math.floor(Math.random() * 50) + 10, // Simulate vendor count
                avgRating: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10,
              },
            });
          }
        });
      });

      // 2. Location-aware suggestions
      if (query.includes('near') || query.includes('in ')) {
        UK_LOCATIONS.forEach((location) => {
          if (
            location
              .toLowerCase()
              .includes(query.replace(/near|in /g, '').trim())
          ) {
            suggestions.push({
              id: `location-${location}`,
              text: `wedding vendors in ${location}`,
              type: 'location',
              location: location,
              metadata: {
                vendorCount: Math.floor(Math.random() * 100) + 20,
              },
            });
          }
        });
      }

      // 3. Category-based suggestions
      const categories = [
        'photographer',
        'venue',
        'florist',
        'catering',
        'music',
        'planning',
      ];
      categories.forEach((category) => {
        if (category.includes(query) || query.includes(category)) {
          suggestions.push({
            id: `category-${category}`,
            text: `wedding ${category}s`,
            type: 'service',
            category: category,
            metadata: {
              vendorCount: Math.floor(Math.random() * 200) + 50,
              avgRating: Math.round((Math.random() * 1 + 4) * 10) / 10,
            },
          });
        }
      });

      // 4. Budget-related suggestions
      if (
        query.includes('budget') ||
        query.includes('cheap') ||
        query.includes('affordable')
      ) {
        suggestions.push({
          id: 'budget-vendors',
          text: 'budget wedding vendors',
          type: 'service',
          metadata: {
            vendorCount: 45,
            priceRange: '£0-£500',
          },
        });
      }

      // 5. "Near me" suggestions
      if (userLocation && (query.includes('near me') || query === 'near')) {
        suggestions.push({
          id: 'near-me',
          text: 'wedding vendors near me',
          type: 'location',
          metadata: {
            vendorCount: Math.floor(Math.random() * 30) + 10,
          },
        });
      }

      // 6. Fuzzy matching with recent searches
      recentSearches.forEach((recent, index) => {
        if (
          recent.toLowerCase().includes(query) &&
          recent.toLowerCase() !== query
        ) {
          suggestions.push({
            id: `recent-match-${index}`,
            text: recent,
            type: 'recent',
          });
        }
      });

      // Remove duplicates and sort by relevance
      const uniqueSuggestions = suggestions.filter(
        (suggestion, index, self) =>
          index === self.findIndex((s) => s.text === suggestion.text),
      );

      // Sort by relevance (exact matches first, then by type)
      const sorted = uniqueSuggestions.sort((a, b) => {
        const aExact = a.text.toLowerCase() === query ? 0 : 1;
        const bExact = b.text.toLowerCase() === query ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;

        const typeOrder = {
          recent: 0,
          service: 1,
          vendor: 2,
          location: 3,
          popular: 4,
        };
        return typeOrder[a.type] - typeOrder[b.type];
      });

      return sorted.slice(0, 8); // Limit to 8 suggestions for mobile
    },
    [recentSearches, popularSearches, userLocation],
  );

  // Update suggestions when input changes
  useEffect(() => {
    const newSuggestions = generateSuggestions(value);
    setSuggestions(newSuggestions);
    setSelectedIndex(-1);
  }, [value, generateSuggestions]);

  // Handle input change
  const handleInputChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
    },
    [onChange],
  );

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(
    (suggestion: AutocompleteSuggestion) => {
      triggerHapticFeedback('medium');
      onChange(suggestion.text);
      onSelect(suggestion);
      setIsActive(false);

      // Add to recent searches
      const updated = [
        suggestion.text,
        ...recentSearches.filter((s) => s !== suggestion.text),
      ].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('wedsync_recent_searches', JSON.stringify(updated));
    },
    [onChange, onSelect, recentSearches, triggerHapticFeedback],
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isActive || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev,
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > -1 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) {
            handleSuggestionSelect(suggestions[selectedIndex]);
          } else {
            onSearch(value);
            setIsActive(false);
          }
          break;
        case 'Escape':
          setIsActive(false);
          inputRef.current?.blur();
          break;
      }
    },
    [
      isActive,
      suggestions,
      selectedIndex,
      handleSuggestionSelect,
      value,
      onSearch,
    ],
  );

  // Scroll selected suggestion into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsActive(false);
      }
    };

    if (isActive) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isActive]);

  // Get suggestion icon
  const getSuggestionIcon = (suggestion: AutocompleteSuggestion) => {
    switch (suggestion.type) {
      case 'recent':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'popular':
        return <TrendingUp className="w-4 h-4 text-orange-500" />;
      case 'location':
        return <MapPin className="w-4 h-4 text-blue-500" />;
      default:
        return <Search className="w-4 h-4 text-gray-400" />;
    }
  };

  // Get category icon
  const getCategoryIcon = (category?: string) => {
    if (!category) return null;

    const icons = {
      photographer: '📸',
      venue: '🏰',
      florist: '💐',
      catering: '🍽️',
      music: '🎵',
      planning: '📋',
      transport: '🚗',
      beauty: '💄',
    };
    return icons[category as keyof typeof icons] || '💼';
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Input Field */}
      <div
        className={cn(
          'relative flex items-center bg-white rounded-2xl border transition-all duration-200',
          isActive
            ? 'shadow-lg border-rose-300 ring-2 ring-rose-100'
            : 'shadow-sm border-gray-200',
        )}
      >
        <div className="flex items-center px-4 py-3 flex-1">
          <Search className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setIsActive(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 text-base text-gray-900 placeholder-gray-500 bg-transparent outline-none"
            style={{ minHeight: '48px' }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />

          {value && (
            <button
              onClick={() => {
                onChange('');
                triggerHapticFeedback('light');
              }}
              className="ml-2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              style={{ minHeight: '40px', minWidth: '40px' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Indicator */}
        {filters &&
          Object.values(filters).some((v) =>
            Array.isArray(v)
              ? v.length > 0
              : typeof v === 'object' && v !== null
                ? Object.values(v).some((vv) => vv !== null && vv !== undefined)
                : v !== null && v !== undefined,
          ) && (
            <div className="px-3">
              <div className="w-6 h-6 bg-rose-600 rounded-full flex items-center justify-center">
                <Filter className="w-3 h-3 text-white" />
              </div>
            </div>
          )}
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {isActive && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 max-h-80 overflow-y-auto"
          >
            <div className="py-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  ref={(el) => (suggestionRefs.current[index] = el)}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                    selectedIndex === index
                      ? 'bg-rose-50 text-rose-900'
                      : 'text-gray-900 hover:bg-gray-50',
                  )}
                  style={{ minHeight: '56px' }}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {getSuggestionIcon(suggestion)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {suggestion.text}
                      </span>
                      {suggestion.category && (
                        <span className="text-lg flex-shrink-0">
                          {getCategoryIcon(suggestion.category)}
                        </span>
                      )}
                    </div>

                    {/* Metadata */}
                    {suggestion.metadata && (
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {suggestion.metadata.vendorCount && (
                          <span>{suggestion.metadata.vendorCount} vendors</span>
                        )}
                        {suggestion.metadata.avgRating && (
                          <span className="flex items-center gap-1">
                            <span className="text-yellow-400">★</span>
                            {suggestion.metadata.avgRating}
                          </span>
                        )}
                        {suggestion.metadata.priceRange && (
                          <span>{suggestion.metadata.priceRange}</span>
                        )}
                        {suggestion.location && (
                          <span>{suggestion.location}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Type Badge */}
                  <div className="flex-shrink-0">
                    {suggestion.type === 'recent' && (
                      <span className="text-xs text-gray-400">Recent</span>
                    )}
                    {suggestion.type === 'popular' && (
                      <span className="text-xs text-orange-500">Popular</span>
                    )}
                    {suggestion.type === 'location' && (
                      <span className="text-xs text-blue-500">Location</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-500 text-center">
                Press Enter to search • Use ↑↓ to navigate
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No suggestions state */}
      {isActive && value && suggestions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 z-50"
        >
          <div className="px-4 py-6 text-center">
            <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">No suggestions found</p>
            <button
              onClick={() => {
                onSearch(value);
                setIsActive(false);
              }}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors"
              style={{ minHeight: '36px' }}
            >
              Search for "{value}"
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
