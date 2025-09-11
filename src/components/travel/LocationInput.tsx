'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/untitled-ui';
import { Location } from '@/types/travel';
import { MapPin, Search } from 'lucide-react';

interface LocationInputProps {
  value: Location;
  onChange: (location: Location) => void;
  placeholder?: string;
  disabled?: boolean;
}

interface PlaceResult {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export function LocationInput({
  value,
  onChange,
  placeholder = 'Enter address...',
  disabled = false,
}: LocationInputProps) {
  const [inputValue, setInputValue] = useState(value.address || '');
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google?.maps?.places) {
      // Google Places API is available
    }
  }, []);

  const searchPlaces = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      // Use Google Places API Text Search (fallback to geocoding if Places not available)
      const response = await fetch(
        `/api/places/search?q=${encodeURIComponent(query)}`,
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.predictions || []);
      } else {
        // Fallback to simple geocoding
        await geocodeAddress(query);
      }
    } catch (error) {
      console.warn('Places search failed, using geocoding fallback');
      await geocodeAddress(query);
    } finally {
      setIsLoading(false);
    }
  };

  const geocodeAddress = async (address: string) => {
    try {
      const response = await fetch(
        `/api/geocode?address=${encodeURIComponent(address)}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          const location = result.geometry.location;

          setSuggestions([
            {
              place_id: result.place_id || 'geocoded',
              description: result.formatted_address,
              structured_formatting: {
                main_text: result.formatted_address,
                secondary_text: '',
              },
            },
          ]);
        }
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowSuggestions(true);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce search
    timeoutRef.current = setTimeout(() => {
      searchPlaces(newValue);
    }, 300);
  };

  const selectSuggestion = async (suggestion: PlaceResult) => {
    setInputValue(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);

    try {
      // Get detailed place information
      const response = await fetch(
        `/api/places/details?place_id=${suggestion.place_id}`,
      );

      if (response.ok) {
        const data = await response.json();
        const location = data.result.geometry.location;

        onChange({
          lat: location.lat,
          lng: location.lng,
          address: suggestion.description,
          name: suggestion.structured_formatting.main_text,
        });
      } else {
        // Fallback: use geocoding
        const geocodeResponse = await fetch(
          `/api/geocode?address=${encodeURIComponent(suggestion.description)}`,
        );
        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json();
          if (geocodeData.results && geocodeData.results.length > 0) {
            const result = geocodeData.results[0];
            const location = result.geometry.location;

            onChange({
              lat: location.lat,
              lng: location.lng,
              address: suggestion.description,
              name: suggestion.structured_formatting.main_text,
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to get place details:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && suggestions.length > 0) {
      e.preventDefault();
      selectSuggestion(suggestions[0]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay hiding suggestions to allow clicks
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          ) : (
            <MapPin className="w-4 h-4 text-gray-400" />
          )}
        </div>

        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
        />

        {inputValue && !showSuggestions && (
          <button
            type="button"
            onClick={() => setShowSuggestions(true)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <Search className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => selectSuggestion(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
            >
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {suggestion.structured_formatting.main_text}
                  </p>
                  {suggestion.structured_formatting.secondary_text && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {suggestion.structured_formatting.secondary_text}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
