'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  MapPin,
  Search,
  Loader2,
  Star,
  Phone,
  Globe,
  Navigation,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { VenueInfo } from '@/lib/validations/wedding-basics';
import { CachedVenue } from '@/types/venue';

interface VenueAutocompleteProps {
  value: VenueInfo;
  onChange: (venue: VenueInfo) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function VenueAutocomplete({
  value,
  onChange,
  placeholder = 'Search for venues...',
  disabled = false,
}: VenueAutocompleteProps) {
  const [query, setQuery] = useState(value.name || '');
  const [venues, setVenues] = useState<CachedVenue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Get user's current location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
        },
        { timeout: 10000, enableHighAccuracy: false, maximumAge: 300000 }, // Cache for 5 minutes
      );
    }
  }, []);

  // Debounced venue search
  const searchVenues = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 3) {
        setVenues([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setHasSearched(true);

      try {
        const searchParams = new URLSearchParams();
        searchParams.set('query', searchQuery);

        // Include user location if available
        if (userLocation) {
          searchParams.set('lat', userLocation.lat.toString());
          searchParams.set('lng', userLocation.lng.toString());
          searchParams.set('radius', '50000'); // 50km radius
        }

        const response = await fetch('/api/placeholder');

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Search failed: ${response.status}`,
          );
        }

        const data = await response.json();
        setVenues(data.venues || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Venue search error:', error);
        setError(error instanceof Error ? error.message : 'Search failed');
        setVenues([]);
      } finally {
        setIsLoading(false);
      }
    },
    [userLocation],
  );

  // Handle input changes with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If user is typing a custom venue (not selecting from suggestions)
    if (newQuery !== value.name) {
      onChange({
        name: newQuery,
        address: newQuery || '', // Use name as address for custom entries
      });
    }

    // Set new search timeout
    if (newQuery.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        searchVenues(newQuery.trim());
      }, 500); // 500ms debounce
    } else {
      setVenues([]);
      setShowSuggestions(false);
      setHasSearched(false);
    }
  };

  // Handle venue selection
  const handleVenueSelect = (venue: CachedVenue) => {
    setQuery(venue.name);
    setShowSuggestions(false);
    setVenues([]);

    onChange({
      name: venue.name,
      placeId: venue.place_id,
      address: venue.address,
      coordinates: venue.location,
    });

    // Focus back to input for accessibility
    inputRef.current?.focus();
  };

  // Handle manual search trigger
  const handleSearch = () => {
    if (query.trim().length >= 3) {
      searchVenues(query.trim());
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (venues.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Handle input blur (with delay to allow selection)
  const handleInputBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!showSuggestions && query.trim().length >= 3) {
        handleSearch();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="pl-10 pr-10"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleSearch}
          disabled={disabled || isLoading || query.length < 3}
        >
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 flex items-center text-sm text-red-600">
          <AlertCircle className="w-4 h-4 mr-1" />
          {error}
        </div>
      )}

      {/* Current Selection Display */}
      {value.name && value.address && value.name !== query && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-medium text-blue-900">{value.name}</p>
              <p className="text-sm text-blue-700">{value.address}</p>
              {value.coordinates && (
                <p className="text-xs text-blue-600 mt-1">
                  📍 {value.coordinates.lat.toFixed(4)},{' '}
                  {value.coordinates.lng.toFixed(4)}
                </p>
              )}
            </div>
            <Badge variant="secondary" className="text-xs">
              Selected
            </Badge>
          </div>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && venues.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 max-h-96 overflow-hidden shadow-lg">
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto" ref={suggestionsRef}>
              {venues.map((venue, index) => (
                <button
                  key={venue.place_id || index}
                  type="button"
                  onClick={() => handleVenueSelect(venue)}
                  className="w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-1">
                        <Building2 className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                        <p className="font-medium text-gray-900 truncate">
                          {venue.name}
                        </p>
                      </div>

                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {venue.address}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {venue.rating && (
                          <div className="flex items-center">
                            <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                            <span>{venue.rating}</span>
                          </div>
                        )}

                        {venue.price_level && (
                          <div className="flex items-center">
                            <span>{'£'.repeat(venue.price_level)}</span>
                          </div>
                        )}

                        {venue.phone && (
                          <div className="flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            <span className="truncate max-w-[100px]">
                              {venue.phone}
                            </span>
                          </div>
                        )}

                        {venue.website && (
                          <div className="flex items-center">
                            <Globe className="w-3 h-3 mr-1" />
                            <span>Website</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-3 flex-shrink-0">
                      {venue.venue_type && (
                        <Badge variant="outline" className="text-xs">
                          {venue.venue_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results Message */}
      {showSuggestions &&
        hasSearched &&
        venues.length === 0 &&
        !isLoading &&
        !error && (
          <Card className="absolute z-50 w-full mt-1 shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="flex flex-col items-center space-y-2">
                <MapPin className="w-8 h-8 text-gray-400" />
                <p className="text-sm text-gray-600">
                  No venues found for "{query}"
                </p>
                <p className="text-xs text-gray-500">
                  Try a different search term or enter a custom venue name
                </p>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Helper Text */}
      <div className="mt-2 space-y-1">
        <p className="text-xs text-gray-500">
          Start typing to search venues, or enter a custom location
        </p>
        {userLocation && (
          <p className="text-xs text-green-600 flex items-center">
            <Navigation className="w-3 h-3 mr-1" />
            Searching near your location for better results
          </p>
        )}
      </div>
    </div>
  );
}
