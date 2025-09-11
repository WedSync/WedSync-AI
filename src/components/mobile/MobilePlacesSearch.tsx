'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  MapPin,
  Search,
  Filter,
  Heart,
  Star,
  Phone,
  Globe,
  Navigation,
  Clock,
  Users,
  DollarSign,
  Camera,
  Route,
  Wifi,
  WifiOff,
  RefreshCcw,
  Settings,
  BookmarkPlus,
  Map,
} from 'lucide-react';
import VenueDiscoveryPWA, {
  VenueComparison,
  GeolocationPosition,
} from '../../lib/mobile/venue-discovery-pwa';
import { VenuePlace } from '../../lib/performance/places-cache-optimizer';

interface MobilePlacesSearchProps {
  onVenueSelect?: (venue: VenuePlace) => void;
  onComparisionUpdate?: (comparisons: VenueComparison[]) => void;
  initialLocation?: string;
  maxResults?: number;
  className?: string;
}

interface SearchFilters {
  radius: number;
  capacity?: number;
  priceLevel?: number;
  weddingType: 'ceremony' | 'reception' | 'both' | 'any';
  amenities: string[];
  rating?: number;
}

interface SearchState {
  query: string;
  loading: boolean;
  results: VenuePlace[];
  error: string | null;
  filters: SearchFilters;
  showFilters: boolean;
  selectedVenue: VenuePlace | null;
  offline: boolean;
  gpsEnabled: boolean;
  currentLocation: GeolocationPosition | null;
}

const MobilePlacesSearch: React.FC<MobilePlacesSearchProps> = ({
  onVenueSelect,
  onComparisionUpdate,
  initialLocation = '',
  maxResults = 20,
  className = '',
}) => {
  const venueDiscovery = useRef<VenueDiscoveryPWA>();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null,
  );

  const [state, setState] = useState<SearchState>({
    query: initialLocation,
    loading: false,
    results: [],
    error: null,
    filters: {
      radius: 25,
      weddingType: 'both',
      amenities: [],
    },
    showFilters: false,
    selectedVenue: null,
    offline: !navigator.onLine,
    gpsEnabled: 'geolocation' in navigator,
    currentLocation: null,
  });

  // Initialize venue discovery PWA
  useEffect(() => {
    venueDiscovery.current = new VenueDiscoveryPWA();

    const handleOnline = () =>
      setState((prev) => ({ ...prev, offline: false }));
    const handleOffline = () =>
      setState((prev) => ({ ...prev, offline: true }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      venueDiscovery.current?.cleanup();
    };
  }, []);

  // Auto-search when query or filters change
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (state.query.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        searchVenues();
      }, 300); // Debounce search
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [state.query, state.filters]);

  // Search venues with current filters
  const searchVenues = useCallback(async () => {
    if (!venueDiscovery.current || !state.query.trim()) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const results = await venueDiscovery.current.searchVenues(state.query, {
        radius: state.filters.radius,
        capacity: state.filters.capacity,
        priceLevel: state.filters.priceLevel,
        weddingType:
          state.filters.weddingType === 'any'
            ? undefined
            : state.filters.weddingType,
        amenities: state.filters.amenities,
      });

      // Limit results for mobile performance
      const limitedResults = results.slice(0, maxResults);

      setState((prev) => ({
        ...prev,
        results: limitedResults,
        loading: false,
      }));
    } catch (error) {
      console.error('Search error:', error);
      setState((prev) => ({
        ...prev,
        error: state.offline
          ? 'Offline mode - showing cached results only'
          : 'Search failed. Please try again.',
        loading: false,
      }));
    }
  }, [state.query, state.filters, maxResults, state.offline]);

  // Search nearby venues using GPS
  const searchNearby = useCallback(async () => {
    if (!venueDiscovery.current) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const nearbyVenues = await venueDiscovery.current.discoverNearbyVenues(
        state.filters.radius,
      );

      setState((prev) => ({
        ...prev,
        results: nearbyVenues.slice(0, maxResults),
        loading: false,
        query: 'Near me',
      }));
    } catch (error) {
      console.error('Nearby search error:', error);
      setState((prev) => ({
        ...prev,
        error: 'Location not available. Please enable GPS or search manually.',
        loading: false,
      }));
    }
  }, [state.filters.radius, maxResults]);

  // Add venue to comparison list
  const addToComparison = useCallback(
    async (venue: VenuePlace) => {
      if (!venueDiscovery.current) return;

      try {
        await venueDiscovery.current.addToComparison(venue.placeId, {
          notes: '',
          rating: 0,
          photos: [],
          visited: false,
          pros: [],
          cons: [],
          capacity: venue.capacity || 0,
          estimatedCost: 0,
          contactAttempts: [],
        });

        // Update parent component
        const comparisons = venueDiscovery.current.getComparisons();
        onComparisionUpdate?.(comparisons);

        // Show success feedback
        showToast('Added to comparison list');
      } catch (error) {
        console.error('Failed to add to comparison:', error);
        showToast('Failed to add venue', 'error');
      }
    },
    [onComparisionUpdate],
  );

  // Contact venue (phone, website, etc.)
  const contactVenue = useCallback(
    async (venue: VenuePlace, type: 'phone' | 'website' | 'email') => {
      if (!venueDiscovery.current) return;

      const contactInfo = venue.contactInfo;
      let action = '';

      switch (type) {
        case 'phone':
          if (contactInfo.phone) {
            window.open(`tel:${contactInfo.phone}`);
            action = contactInfo.phone;
          }
          break;
        case 'website':
          if (contactInfo.website) {
            window.open(contactInfo.website, '_blank');
            action = contactInfo.website;
          }
          break;
        case 'email':
          if (contactInfo.email) {
            window.open(`mailto:${contactInfo.email}`);
            action = contactInfo.email;
          }
          break;
      }

      if (action) {
        await venueDiscovery.current.recordContactAttempt(
          venue.placeId,
          type,
          true,
          `Contacted via ${type}: ${action}`,
        );
      }
    },
    [],
  );

  // Handle touch gestures for mobile interaction
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, venue: VenuePlace) => {
      setTouchStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      });
    },
    [],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent, venue: VenuePlace) => {
      if (!touchStart) return;

      const touchEnd = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
      };

      const deltaX = touchEnd.x - touchStart.x;
      const deltaY = touchEnd.y - touchStart.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // If it's a tap (not a swipe)
      if (distance < 10) {
        onVenueSelect?.(venue);
      }
      // If it's a swipe right
      else if (deltaX > 50 && Math.abs(deltaY) < 50) {
        addToComparison(venue);
      }

      setTouchStart(null);
    },
    [touchStart, onVenueSelect, addToComparison],
  );

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
    }));
  }, []);

  // Format venue distance
  const formatDistance = useCallback(
    (venue: VenuePlace): string => {
      if (!state.currentLocation) return '';

      const distance = calculateDistance(
        state.currentLocation.latitude,
        state.currentLocation.longitude,
        venue.coordinates.lat,
        venue.coordinates.lng,
      );

      return distance < 1
        ? `${Math.round(distance * 1000)}m away`
        : `${distance.toFixed(1)}km away`;
    },
    [state.currentLocation],
  );

  // Calculate distance between two points
  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Show toast notification
  const showToast = (
    message: string,
    type: 'success' | 'error' = 'success',
  ) => {
    // Implementation would depend on your toast system
    console.log(`Toast (${type}):`, message);
  };

  // Format price level
  const formatPriceLevel = (level: number): string => {
    return '£'.repeat(Math.max(1, Math.min(4, level)));
  };

  // Get wedding type badges
  const getWeddingTypeBadges = (
    weddingInfo: VenuePlace['weddingInfo'],
  ): string[] => {
    if (!weddingInfo) return [];

    const badges: string[] = [];
    if (weddingInfo.ceremonies) badges.push('Ceremony');
    if (weddingInfo.receptions) badges.push('Reception');
    if (weddingInfo.catering) badges.push('Catering');
    return badges;
  };

  // Memoized filtered results for performance
  const filteredResults = useMemo(() => {
    return state.results.filter((venue) => {
      if (state.filters.rating && venue.rating < state.filters.rating) {
        return false;
      }
      return true;
    });
  }, [state.results, state.filters.rating]);

  return (
    <div className={`mobile-places-search ${className}`}>
      {/* Header with status indicators */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Find Venues</h2>
        <div className="flex items-center space-x-2">
          {state.offline ? (
            <WifiOff className="w-5 h-5 text-red-500" />
          ) : (
            <Wifi className="w-5 h-5 text-green-500" />
          )}
          {state.gpsEnabled && <Navigation className="w-5 h-5 text-blue-500" />}
        </div>
      </div>

      {/* Search input */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={state.query}
            onChange={(e) =>
              setState((prev) => ({ ...prev, query: e.target.value }))
            }
            placeholder="Search venues, locations..."
            className="w-full pl-10 pr-12 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() =>
              setState((prev) => ({ ...prev, showFilters: !prev.showFilters }))
            }
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Quick action buttons */}
        <div className="flex space-x-2 mt-3">
          <button
            onClick={searchNearby}
            disabled={!state.gpsEnabled || state.loading}
            className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
          >
            <Navigation className="w-4 h-4 mr-1" />
            Nearby
          </button>
          <button
            onClick={searchVenues}
            disabled={state.loading}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCcw
              className={`w-4 h-4 mr-1 ${state.loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {state.showFilters && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="space-y-4">
            {/* Radius filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search radius: {state.filters.radius}km
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={state.filters.radius}
                onChange={(e) =>
                  updateFilters({ radius: parseInt(e.target.value) })
                }
                className="w-full"
              />
            </div>

            {/* Wedding type filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wedding type
              </label>
              <select
                value={state.filters.weddingType}
                onChange={(e) =>
                  updateFilters({
                    weddingType: e.target.value as SearchFilters['weddingType'],
                  })
                }
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="any">Any</option>
                <option value="ceremony">Ceremony only</option>
                <option value="reception">Reception only</option>
                <option value="both">Both ceremony & reception</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {state.error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{state.error}</p>
        </div>
      )}

      {/* Loading indicator */}
      {state.loading && (
        <div className="p-4 text-center">
          <div className="inline-flex items-center">
            <RefreshCcw className="w-5 h-5 mr-2 animate-spin text-blue-500" />
            <span className="text-gray-600">Searching venues...</span>
          </div>
        </div>
      )}

      {/* Results list */}
      <div className="flex-1 overflow-y-auto">
        {filteredResults.length === 0 && !state.loading ? (
          <div className="p-8 text-center">
            <MapPin className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No venues found
            </h3>
            <p className="text-gray-500">
              Try adjusting your search criteria or location.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredResults.map((venue) => (
              <div
                key={venue.placeId}
                className="p-4 bg-white hover:bg-gray-50 touch-manipulation"
                onTouchStart={(e) => handleTouchStart(e, venue)}
                onTouchEnd={(e) => handleTouchEnd(e, venue)}
              >
                {/* Venue header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {venue.name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {venue.address}
                    </p>
                    {state.currentLocation && (
                      <p className="text-xs text-blue-600 mt-1">
                        {formatDistance(venue)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => addToComparison(venue)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <BookmarkPlus className="w-5 h-5" />
                  </button>
                </div>

                {/* Venue details */}
                <div className="flex items-center space-x-4 mb-3">
                  {venue.rating > 0 && (
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="ml-1 text-sm text-gray-600">
                        {venue.rating.toFixed(1)}
                      </span>
                    </div>
                  )}

                  {venue.priceLevel > 0 && (
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="ml-1 text-sm text-gray-600">
                        {formatPriceLevel(venue.priceLevel)}
                      </span>
                    </div>
                  )}

                  {venue.capacity && (
                    <div className="flex items-center">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span className="ml-1 text-sm text-gray-600">
                        {venue.capacity}
                      </span>
                    </div>
                  )}
                </div>

                {/* Wedding type badges */}
                {venue.weddingInfo && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {getWeddingTypeBadges(venue.weddingInfo).map((badge) => (
                      <span
                        key={badge}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex space-x-2">
                  {venue.contactInfo.phone && (
                    <button
                      onClick={() => contactVenue(venue, 'phone')}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100"
                    >
                      <Phone className="w-4 h-4 mr-1" />
                      Call
                    </button>
                  )}

                  {venue.contactInfo.website && (
                    <button
                      onClick={() => contactVenue(venue, 'website')}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                    >
                      <Globe className="w-4 h-4 mr-1" />
                      Website
                    </button>
                  )}

                  <button
                    onClick={() =>
                      window.open(
                        `https://maps.google.com/maps?q=${venue.coordinates.lat},${venue.coordinates.lng}`,
                        '_blank',
                      )
                    }
                    className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <Map className="w-4 h-4 mr-1" />
                    Directions
                  </button>
                </div>

                {/* Swipe hint */}
                <div className="mt-2 text-xs text-gray-400 text-center">
                  Swipe right to add to comparison
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom instruction */}
      <div className="p-3 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          {state.offline ? (
            <span className="text-red-600">
              Offline mode - Showing cached venues only
            </span>
          ) : (
            'Tap to view details • Swipe right to compare • Use filters to narrow results'
          )}
        </p>
      </div>
    </div>
  );
};

export default MobilePlacesSearch;
