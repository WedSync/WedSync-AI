/**
 * useGooglePlaces Hook
 * Core Google Places API integration for WedSync wedding venue and vendor discovery
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  UseGooglePlacesReturn,
  PlaceAutocompletePrediction,
  PlaceDetails,
  GooglePlace,
  NearbySearchRequest,
  AutocompleteResponse,
  PlaceDetailsResponse,
  NearbySearchResponse,
  PlaceCache,
  SearchCache,
} from '@/types/google-places';
import { GooglePlacesError } from '@/types/google-places';

// Cache configuration
const CACHE_TTL_AUTOCOMPLETE = 5 * 60 * 1000; // 5 minutes
const CACHE_TTL_PLACE_DETAILS = 30 * 60 * 1000; // 30 minutes
const CACHE_TTL_NEARBY = 10 * 60 * 1000; // 10 minutes
const DEBOUNCE_DELAY = 300; // 300ms debounce for autocomplete

// In-memory caches for performance
const autocompleteCache: SearchCache = {};
const placeDetailsCache: PlaceCache = {};
const nearbyCache: SearchCache = {};

/**
 * Custom hook for Google Places API integration
 * Provides autocomplete, place details, and nearby search functionality
 * Optimized for wedding venue and vendor discovery workflows
 */
export function useGooglePlaces(): UseGooglePlacesReturn {
  // Autocomplete state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [predictions, setPredictions] = useState<PlaceAutocompletePrediction[]>(
    [],
  );
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Place details state
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Nearby search state
  const [nearbyPlaces, setNearbyPlaces] = useState<GooglePlace[]>([]);
  const [isSearchingNearby, setIsSearchingNearby] = useState<boolean>(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);

  // Refs for cleanup and debouncing
  const debounceRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  /**
   * Cache utility functions
   */
  const isCacheValid = (timestamp: number, ttl: number): boolean => {
    return Date.now() - timestamp < ttl;
  };

  const getCachedAutocomplete = (
    query: string,
  ): PlaceAutocompletePrediction[] | null => {
    const cached = autocompleteCache[query];
    if (cached && isCacheValid(cached.timestamp, cached.ttl)) {
      return cached.data as PlaceAutocompletePrediction[];
    }
    return null;
  };

  const setCachedAutocomplete = (
    query: string,
    data: PlaceAutocompletePrediction[],
  ) => {
    autocompleteCache[query] = {
      data,
      timestamp: Date.now(),
      ttl: CACHE_TTL_AUTOCOMPLETE,
    };
  };

  const getCachedPlaceDetails = (placeId: string): PlaceDetails | null => {
    const cached = placeDetailsCache[placeId];
    if (cached && isCacheValid(cached.timestamp, cached.ttl)) {
      return cached.data;
    }
    return null;
  };

  const setCachedPlaceDetails = (placeId: string, data: PlaceDetails) => {
    placeDetailsCache[placeId] = {
      data,
      timestamp: Date.now(),
      ttl: CACHE_TTL_PLACE_DETAILS,
    };
  };

  /**
   * API call functions
   */
  const callAutocompleteAPI = async (
    query: string,
    signal: AbortSignal,
  ): Promise<PlaceAutocompletePrediction[]> => {
    try {
      const response = await fetch('/api/google-places/autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: query,
          types: ['establishment'], // Focus on businesses and venues
          components: 'country:us|country:ca|country:gb|country:au', // Wedding markets
          sessiontoken: crypto.randomUUID(), // For billing optimization
        }),
        signal,
      });

      if (!response.ok) {
        throw new GooglePlacesError(
          `Autocomplete API error: ${response.statusText}`,
          'API_ERROR',
          { status: response.status },
        );
      }

      const data: AutocompleteResponse = await response.json();

      if (data.status !== 'OK') {
        throw new GooglePlacesError(
          data.error_message || `API returned status: ${data.status}`,
          data.status,
        );
      }

      return data.predictions;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error; // Re-throw abort errors to handle them separately
      }

      if (error instanceof GooglePlacesError) {
        throw error;
      }

      throw new GooglePlacesError(
        'Failed to fetch autocomplete suggestions',
        'NETWORK_ERROR',
        { originalError: error },
      );
    }
  };

  const callPlaceDetailsAPI = async (
    placeId: string,
    signal: AbortSignal,
  ): Promise<PlaceDetails> => {
    try {
      const response = await fetch('/api/google-places/details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          place_id: placeId,
          fields: [
            'place_id',
            'name',
            'formatted_address',
            'formatted_phone_number',
            'international_phone_number',
            'website',
            'url',
            'geometry',
            'rating',
            'user_ratings_total',
            'price_level',
            'business_status',
            'opening_hours',
            'photos',
            'reviews',
            'types',
            'editorial_summary',
          ].join(','),
          sessiontoken: crypto.randomUUID(),
        }),
        signal,
      });

      if (!response.ok) {
        throw new GooglePlacesError(
          `Place Details API error: ${response.statusText}`,
          'API_ERROR',
          { status: response.status },
        );
      }

      const data: PlaceDetailsResponse = await response.json();

      if (data.status !== 'OK') {
        throw new GooglePlacesError(
          data.error_message || `API returned status: ${data.status}`,
          data.status,
        );
      }

      return data.result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }

      if (error instanceof GooglePlacesError) {
        throw error;
      }

      throw new GooglePlacesError(
        'Failed to fetch place details',
        'NETWORK_ERROR',
        { originalError: error },
      );
    }
  };

  const callNearbySearchAPI = async (
    request: NearbySearchRequest,
    signal: AbortSignal,
  ): Promise<GooglePlace[]> => {
    try {
      const response = await fetch('/api/google-places/nearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: `${request.location.lat},${request.location.lng}`,
          radius: request.radius,
          type: request.venue_type || request.vendor_type,
          keyword: request.keyword,
          minprice: request.price_level?.[0],
          maxprice: request.price_level?.[1],
          opennow: request.open_now,
        }),
        signal,
      });

      if (!response.ok) {
        throw new GooglePlacesError(
          `Nearby Search API error: ${response.statusText}`,
          'API_ERROR',
          { status: response.status },
        );
      }

      const data: NearbySearchResponse = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new GooglePlacesError(
          data.error_message || `API returned status: ${data.status}`,
          data.status,
        );
      }

      return data.results || [];
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }

      if (error instanceof GooglePlacesError) {
        throw error;
      }

      throw new GooglePlacesError(
        'Failed to search nearby places',
        'NETWORK_ERROR',
        { originalError: error },
      );
    }
  };

  /**
   * Debounced autocomplete search
   */
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setPredictions([]);
      setIsSearching(false);
      return;
    }

    // Check cache first
    const cached = getCachedAutocomplete(query.trim());
    if (cached) {
      setPredictions(cached);
      setIsSearching(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setIsSearching(true);
      setSearchError(null);

      const results = await callAutocompleteAPI(
        query.trim(),
        abortControllerRef.current.signal,
      );

      // Filter results for wedding-relevant places
      const weddingRelevantResults = results.filter((prediction) => {
        const types = prediction.types;
        const description = prediction.description.toLowerCase();

        // Include wedding venues, event spaces, restaurants, hotels, etc.
        return (
          types.some((type) =>
            [
              'wedding_venue',
              'banquet_hall',
              'restaurant',
              'lodging',
              'church',
              'park',
              'museum',
              'art_gallery',
              'establishment',
            ].includes(type),
          ) ||
          description.includes('wedding') ||
          description.includes('venue') ||
          description.includes('event') ||
          description.includes('banquet') ||
          description.includes('reception')
        );
      });

      setPredictions(weddingRelevantResults);
      setCachedAutocomplete(query.trim(), weddingRelevantResults);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Ignore abort errors
      }

      console.error('Autocomplete search error:', error);
      setSearchError(
        error instanceof GooglePlacesError
          ? error.message
          : 'Failed to search venues. Please try again.',
      );
      setPredictions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Debounced search effect
   */
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  /**
   * Get place details by place ID
   */
  const getPlaceDetails = useCallback(
    async (placeId: string): Promise<PlaceDetails | null> => {
      // Check cache first
      const cached = getCachedPlaceDetails(placeId);
      if (cached) {
        setPlaceDetails(cached);
        return cached;
      }

      try {
        setIsLoadingDetails(true);
        setDetailsError(null);

        const abortController = new AbortController();
        const details = await callPlaceDetailsAPI(
          placeId,
          abortController.signal,
        );

        setPlaceDetails(details);
        setCachedPlaceDetails(placeId, details);

        return details;
      } catch (error) {
        console.error('Place details error:', error);
        const errorMessage =
          error instanceof GooglePlacesError
            ? error.message
            : 'Failed to load venue details. Please try again.';

        setDetailsError(errorMessage);
        return null;
      } finally {
        setIsLoadingDetails(false);
      }
    },
    [],
  );

  /**
   * Search for nearby places
   */
  const searchNearby = useCallback(
    async (request: NearbySearchRequest): Promise<GooglePlace[]> => {
      const cacheKey = JSON.stringify(request);

      // Check cache first
      const cached = nearbyCache[cacheKey];
      if (cached && isCacheValid(cached.timestamp, CACHE_TTL_NEARBY)) {
        const results = cached.data as GooglePlace[];
        setNearbyPlaces(results);
        return results;
      }

      try {
        setIsSearchingNearby(true);
        setNearbyError(null);

        const abortController = new AbortController();
        const results = await callNearbySearchAPI(
          request,
          abortController.signal,
        );

        setNearbyPlaces(results);

        // Cache results
        nearbyCache[cacheKey] = {
          data: results,
          timestamp: Date.now(),
          ttl: CACHE_TTL_NEARBY,
        };

        return results;
      } catch (error) {
        console.error('Nearby search error:', error);
        const errorMessage =
          error instanceof GooglePlacesError
            ? error.message
            : 'Failed to find nearby venues. Please try again.';

        setNearbyError(errorMessage);
        return [];
      } finally {
        setIsSearchingNearby(false);
      }
    },
    [],
  );

  /**
   * Utility functions
   */
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setPredictions([]);
    setSearchError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const clearErrors = useCallback(() => {
    setSearchError(null);
    setDetailsError(null);
    setNearbyError(null);
  }, []);

  /**
   * Cleanup effect
   */
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // Autocomplete
    searchQuery,
    setSearchQuery,
    predictions,
    isSearching,
    searchError,

    // Place details
    getPlaceDetails,
    placeDetails,
    isLoadingDetails,
    detailsError,

    // Nearby search
    searchNearby,
    nearbyPlaces,
    isSearchingNearby,
    nearbyError,

    // Utilities
    clearSearch,
    clearErrors,
  };
}

export default useGooglePlaces;
