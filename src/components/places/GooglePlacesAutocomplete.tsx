/**
 * GooglePlacesAutocomplete Component
 * Real-time venue search with debouncing for WedSync wedding planning
 * Uses Untitled UI design system with mobile-first responsive design
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, Clock, X, ChevronDown } from 'lucide-react';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';
import type {
  GooglePlacesAutocompleteProps,
  PlaceAutocompletePrediction,
  PlaceDetails,
} from '@/types/google-places';

// Recent searches storage key
const RECENT_SEARCHES_KEY = 'wedsync_recent_venue_searches';
const MAX_RECENT_SEARCHES = 5;

/**
 * GooglePlacesAutocomplete Component
 * Wedding venue search with autocomplete suggestions
 */
export function GooglePlacesAutocomplete({
  value = '',
  onChange,
  onSelect,
  placeholder = 'Search for wedding venues, restaurants, or event spaces...',
  filters,
  showRecentSearches = true,
  className = '',
  disabled = false,
  required = false,
  error,
  'aria-label': ariaLabel,
}: GooglePlacesAutocompleteProps) {
  // Hooks
  const {
    searchQuery,
    setSearchQuery,
    predictions,
    isSearching,
    searchError,
    getPlaceDetails,
    isLoadingDetails,
    clearSearch,
  } = useGooglePlaces();

  // Local state
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<
    PlaceAutocompletePrediction[]
  >([]);
  const [internalValue, setInternalValue] = useState(value);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  /**
   * Load recent searches from localStorage
   */
  const loadRecentSearches = useCallback(() => {
    if (!showRecentSearches || typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentSearches(
          Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT_SEARCHES) : [],
        );
      }
    } catch (error) {
      console.warn('Failed to load recent searches:', error);
    }
  }, [showRecentSearches]);

  /**
   * Save search to recent searches
   */
  const saveToRecentSearches = useCallback(
    (prediction: PlaceAutocompletePrediction) => {
      if (!showRecentSearches || typeof window === 'undefined') return;

      try {
        const existing = recentSearches.filter(
          (item) => item.place_id !== prediction.place_id,
        );
        const updated = [prediction, ...existing].slice(0, MAX_RECENT_SEARCHES);

        setRecentSearches(updated);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn('Failed to save recent search:', error);
      }
    },
    [recentSearches, showRecentSearches],
  );

  /**
   * Clear recent searches
   */
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    }
  }, []);

  /**
   * Handle input value change
   */
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      setInternalValue(newValue);
      setSearchQuery(newValue);
      setSelectedIndex(-1);

      if (newValue.trim()) {
        setIsOpen(true);
      }

      onChange?.(null); // Clear selection when typing
    },
    [setSearchQuery, onChange],
  );

  /**
   * Handle prediction selection
   */
  const handleSelectPrediction = useCallback(
    async (prediction: PlaceAutocompletePrediction) => {
      setInternalValue(prediction.description);
      setIsOpen(false);
      setSelectedIndex(-1);

      // Save to recent searches
      saveToRecentSearches(prediction);

      // Notify parent of selection
      onChange?.(prediction);

      // Get place details if callback provided
      if (onSelect) {
        try {
          const details = await getPlaceDetails(prediction.place_id);
          if (details) {
            onSelect(details);
          }
        } catch (error) {
          console.error('Failed to get place details:', error);
        }
      }
    },
    [onChange, onSelect, getPlaceDetails, saveToRecentSearches],
  );

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const availableOptions = searchQuery.trim()
        ? predictions
        : recentSearches;
      const maxIndex = availableOptions.length - 1;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex((prev) => (prev < maxIndex ? prev + 1 : prev));
          setIsOpen(true);
          break;

        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;

        case 'Enter':
          event.preventDefault();
          if (selectedIndex >= 0 && availableOptions[selectedIndex]) {
            handleSelectPrediction(availableOptions[selectedIndex]);
          }
          break;

        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;

        case 'Tab':
          setIsOpen(false);
          setSelectedIndex(-1);
          break;
      }
    },
    [
      searchQuery,
      predictions,
      recentSearches,
      selectedIndex,
      handleSelectPrediction,
    ],
  );

  /**
   * Handle input focus
   */
  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  /**
   * Handle input blur (with delay for click handling)
   */
  const handleBlur = useCallback(() => {
    // Delay to allow for option clicks
    setTimeout(() => {
      setIsOpen(false);
      setSelectedIndex(-1);
    }, 150);
  }, []);

  /**
   * Handle clear button
   */
  const handleClear = useCallback(() => {
    setInternalValue('');
    setSearchQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    onChange?.(null);
    inputRef.current?.focus();
  }, [setSearchQuery, onChange]);

  /**
   * Load recent searches on mount
   */
  useEffect(() => {
    loadRecentSearches();
  }, [loadRecentSearches]);

  /**
   * Sync external value changes
   */
  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value);
      setSearchQuery(value);
    }
  }, [value, internalValue, setSearchQuery]);

  /**
   * Click outside handler
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine what to show in dropdown
  const showingPredictions = searchQuery.trim() && predictions.length > 0;
  const showingRecent =
    !searchQuery.trim() && recentSearches.length > 0 && showRecentSearches;
  const showingOptions = showingPredictions || showingRecent;
  const currentOptions = showingPredictions ? predictions : recentSearches;

  // Error state
  const hasError = Boolean(error || searchError);
  const errorMessage = error || searchError;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Input Container */}
      <div className="relative">
        {/* Search Icon */}
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <Search size={20} />
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={internalValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-label={ariaLabel || placeholder}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-activedescendant={
            selectedIndex >= 0 ? `prediction-${selectedIndex}` : undefined
          }
          className={`
            w-full pl-12 pr-12 py-2.5
            bg-white border rounded-lg
            text-gray-900 placeholder-gray-500
            shadow-xs
            focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
            transition-all duration-200
            ${
              hasError
                ? 'border-error-300 focus:border-error-300 focus:ring-error-100'
                : 'border-gray-300'
            }
            ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}
            text-sm leading-6
          `}
        />

        {/* Loading Spinner or Clear Button */}
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
          {isSearching || isLoadingDetails ? (
            <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
          ) : internalValue ? (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          ) : (
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          )}
        </div>
      </div>

      {/* Error Message */}
      {hasError && (
        <p className="mt-2 text-sm text-error-600" role="alert">
          {errorMessage}
        </p>
      )}

      {/* Dropdown */}
      {isOpen && showingOptions && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {/* Recent Searches Header */}
          {showingRecent && (
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-gray-100">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <Clock size={14} />
                Recent Searches
              </div>
              <button
                onClick={clearRecentSearches}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {/* Options List */}
          <ul ref={listRef} role="listbox" className="py-1">
            {currentOptions.map((prediction, index) => (
              <li
                key={prediction.place_id}
                role="option"
                aria-selected={index === selectedIndex}
              >
                <button
                  id={`prediction-${index}`}
                  onClick={() => handleSelectPrediction(prediction)}
                  className={`
                    w-full text-left px-3.5 py-2.5 hover:bg-gray-50 transition-colors
                    flex items-start gap-3
                    ${index === selectedIndex ? 'bg-primary-50' : ''}
                  `}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    <MapPin
                      size={16}
                      className={`
                        ${showingRecent ? 'text-gray-400' : 'text-primary-600'}
                      `}
                    />
                  </div>

                  {/* Text Content */}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {prediction.structured_formatting.main_text}
                    </div>
                    {prediction.structured_formatting.secondary_text && (
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {prediction.structured_formatting.secondary_text}
                      </div>
                    )}

                    {/* Wedding relevance indicators */}
                    {prediction.types.some((type) =>
                      [
                        'wedding_venue',
                        'banquet_hall',
                        'church',
                        'park',
                      ].includes(type),
                    ) && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200">
                          Wedding Venue
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {/* No Results */}
          {searchQuery.trim() && predictions.length === 0 && !isSearching && (
            <div className="px-3.5 py-6 text-center text-sm text-gray-500">
              <MapPin size={24} className="mx-auto mb-2 text-gray-300" />
              <p>No venues found for "{searchQuery}"</p>
              <p className="text-xs mt-1">
                Try searching for a city, venue name, or address
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GooglePlacesAutocomplete;
