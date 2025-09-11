'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ClockIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface SearchSuggestion {
  id: string;
  title: string;
  type: 'article' | 'tutorial' | 'category' | 'tag';
  category?: string;
  description?: string;
  popularity?: number;
}

interface SearchFilter {
  categories: string[];
  difficulty: ('beginner' | 'intermediate' | 'advanced')[];
  contentType: ('article' | 'tutorial')[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  articleCount: number;
  subcategories?: Category[];
}

export interface IntelligentSearchBarProps {
  value: string;
  onSearch: (query: string, filters?: SearchFilter) => void;
  placeholder?: string;
  categories: Category[];
  recentSearches?: string[];
  isLoading?: boolean;
  className?: string;
  showFilters?: boolean;
  maxSuggestions?: number;
}

const searchTransition = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.15 },
};

export function IntelligentSearchBar({
  value,
  onSearch,
  placeholder = 'Search articles, tutorials, and guides...',
  categories,
  recentSearches = [],
  isLoading = false,
  className = '',
  showFilters = true,
  maxSuggestions = 8,
}: IntelligentSearchBarProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [filters, setFilters] = useState<SearchFilter>({
    categories: [],
    difficulty: [],
    contentType: [],
  });

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      setSelectedSuggestionIndex(-1);

      // Generate mock suggestions
      if (newValue.trim()) {
        const mockSuggestions: SearchSuggestion[] = [
          {
            id: '1',
            title: 'Getting started with client forms',
            type: 'article',
            category: 'Forms & Workflows',
            description:
              'Learn how to create and customize client intake forms',
            popularity: 95,
          },
          {
            id: '2',
            title: 'Client Management Tutorial',
            type: 'tutorial',
            category: 'Client Management',
            description: 'Complete guide to managing wedding clients',
            popularity: 87,
          },
        ]
          .filter((suggestion) =>
            suggestion.title.toLowerCase().includes(newValue.toLowerCase()),
          )
          .slice(0, maxSuggestions);

        setSuggestions(mockSuggestions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    },
    [maxSuggestions],
  );

  const handleSearch = useCallback(() => {
    const query = inputValue.trim();
    if (!query) return;

    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    onSearch(query, filters);
  }, [inputValue, filters, onSearch]);

  const handleClearInput = useCallback(() => {
    setInputValue('');
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSuggestionIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev,
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSuggestionIndex((prev) => (prev > -1 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedSuggestionIndex >= 0) {
            const suggestion = suggestions[selectedSuggestionIndex];
            setInputValue(suggestion.title);
            onSearch(suggestion.title, filters);
          } else {
            handleSearch();
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
          break;
      }
    },
    [
      showSuggestions,
      suggestions,
      selectedSuggestionIndex,
      filters,
      onSearch,
      handleSearch,
    ],
  );

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon
            className={`h-5 w-5 transition-colors duration-200 ${
              isLoading ? 'text-primary-500 animate-pulse' : 'text-gray-400'
            }`}
            aria-hidden="true"
          />
        </div>

        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search knowledge base"
          aria-expanded={showSuggestions}
          aria-autocomplete="list"
          aria-describedby="search-suggestions"
          className="block w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
          disabled={isLoading}
        />

        <div className="absolute inset-y-0 right-0 flex items-center">
          {inputValue && (
            <button
              onClick={handleClearInput}
              className="p-1 mr-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              aria-label="Clear search"
            >
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          {showFilters && (
            <button
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={`p-2 mr-1 text-gray-400 hover:text-gray-600 transition-colors duration-200 ${
                filters.categories.length > 0 ||
                filters.difficulty.length > 0 ||
                filters.contentType.length > 0
                  ? 'text-primary-600'
                  : ''
              }`}
              aria-label="Search filters"
            >
              <FunnelIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Search Suggestions */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            {...searchTransition}
            className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-1 max-h-80 overflow-y-auto"
            id="search-suggestions"
            role="listbox"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                onClick={() => {
                  setInputValue(suggestion.title);
                  onSearch(suggestion.title, filters);
                  setShowSuggestions(false);
                }}
                className={`w-full px-3 py-2.5 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors duration-150 ${
                  index === selectedSuggestionIndex
                    ? 'bg-primary-50 border-r-2 border-primary-600'
                    : ''
                }`}
                role="option"
                aria-selected={index === selectedSuggestionIndex}
              >
                <div className="flex items-start space-x-3">
                  <span className="text-lg mt-0.5" aria-hidden="true">
                    {suggestion.type === 'article'
                      ? '📄'
                      : suggestion.type === 'tutorial'
                        ? '🎓'
                        : suggestion.type === 'category'
                          ? '📁'
                          : '🏷️'}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {suggestion.title}
                      </p>

                      {suggestion.type !== 'article' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {suggestion.type}
                        </span>
                      )}
                    </div>

                    {suggestion.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {suggestion.description}
                      </p>
                    )}

                    {suggestion.category && (
                      <p className="text-xs text-primary-600 mt-0.5">
                        in {suggestion.category}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {inputValue.trim() && (
              <div className="border-t border-gray-100 px-3 py-2">
                <button
                  onClick={handleSearch}
                  className="w-full text-left text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Search for "{inputValue}"
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
