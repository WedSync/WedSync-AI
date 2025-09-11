'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Camera,
  Building2,
  Flower,
  UtensilsCrossed,
  Music,
  Calendar,
  Car,
  Sparkles,
  MapPin,
  Clock,
  Heart,
  Star,
  Navigation,
  TrendingUp,
} from 'lucide-react';
import { SearchFilters } from '@/types/mobile-search';
import { cn } from '@/lib/utils';

interface QuickSearchActionsProps {
  onQuickSearch: (query: string, filters?: Partial<SearchFilters>) => void;
  userLocation?: { lat: number; lng: number };
  className?: string;
}

interface QuickAction {
  id: string;
  label: string;
  query: string;
  icon: React.ComponentType<any>;
  color: string;
  category?: string;
  popular?: boolean;
  filters?: Partial<SearchFilters>;
}

interface RecentLocation {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number };
  lastUsed: number;
}

export default function QuickSearchActions({
  onQuickSearch,
  userLocation,
  className,
}: QuickSearchActionsProps) {
  const [recentLocations, setRecentLocations] = useState<RecentLocation[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);

  // Load recent locations and trending searches
  useEffect(() => {
    // Load recent locations from localStorage
    const storedLocations = localStorage.getItem('wedsync_recent_locations');
    if (storedLocations) {
      try {
        setRecentLocations(JSON.parse(storedLocations));
      } catch (error) {
        console.error('Failed to load recent locations:', error);
      }
    }

    // Load trending searches from localStorage or API
    const storedTrending = localStorage.getItem('wedsync_trending_searches');
    if (storedTrending) {
      try {
        setTrendingSearches(JSON.parse(storedTrending));
      } catch (error) {
        // Fallback trending searches
        setTrendingSearches([
          'wedding photographers',
          'venues near me',
          'wedding florists',
          'budget photographers',
          'outdoor venues',
        ]);
      }
    } else {
      setTrendingSearches([
        'wedding photographers',
        'venues near me',
        'wedding florists',
        'budget photographers',
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

  // Save location to recent locations
  const saveRecentLocation = useCallback(
    (name: string, coordinates: { lat: number; lng: number }) => {
      const newLocation: RecentLocation = {
        id: `loc_${Date.now()}`,
        name,
        coordinates,
        lastUsed: Date.now(),
      };

      const updatedLocations = [
        newLocation,
        ...recentLocations.filter(
          (loc) =>
            Math.abs(loc.coordinates.lat - coordinates.lat) > 0.001 ||
            Math.abs(loc.coordinates.lng - coordinates.lng) > 0.001,
        ),
      ].slice(0, 5); // Keep only last 5 locations

      setRecentLocations(updatedLocations);
      localStorage.setItem(
        'wedsync_recent_locations',
        JSON.stringify(updatedLocations),
      );
    },
    [recentLocations],
  );

  // Handle quick search
  const handleQuickSearch = useCallback(
    (action: QuickAction) => {
      triggerHapticFeedback('medium');
      onQuickSearch(action.query, action.filters);
    },
    [onQuickSearch, triggerHapticFeedback],
  );

  // Handle "near me" search
  const handleNearMeSearch = useCallback(
    (category?: string) => {
      triggerHapticFeedback('medium');

      const query = category
        ? `${category} near me`
        : 'wedding vendors near me';
      const filters: Partial<SearchFilters> = {
        location: {
          radius: 10,
          coordinates: userLocation,
        },
        ...(category && { category: [category] }),
      };

      onQuickSearch(query, filters);

      // Save current location if available
      if (userLocation) {
        saveRecentLocation('Current Location', userLocation);
      }
    },
    [userLocation, onQuickSearch, triggerHapticFeedback, saveRecentLocation],
  );

  // Handle location-based search
  const handleLocationSearch = useCallback(
    (location: RecentLocation) => {
      triggerHapticFeedback('light');

      const filters: Partial<SearchFilters> = {
        location: {
          radius: 15,
          coordinates: location.coordinates,
        },
      };

      onQuickSearch(`wedding vendors near ${location.name}`, filters);
    },
    [onQuickSearch, triggerHapticFeedback],
  );

  // Handle trending search
  const handleTrendingSearch = useCallback(
    (searchTerm: string) => {
      triggerHapticFeedback('light');
      onQuickSearch(searchTerm);
    },
    [onQuickSearch, triggerHapticFeedback],
  );

  // Quick action definitions
  const quickActions: QuickAction[] = [
    {
      id: 'photographers',
      label: 'Photographers',
      query: 'wedding photographers',
      icon: Camera,
      color: 'bg-purple-500',
      category: 'photographer',
      popular: true,
      filters: { category: ['photographer'] },
    },
    {
      id: 'venues',
      label: 'Venues',
      query: 'wedding venues',
      icon: Building2,
      color: 'bg-blue-500',
      category: 'venue',
      popular: true,
      filters: { category: ['venue'] },
    },
    {
      id: 'florists',
      label: 'Florists',
      query: 'wedding florists',
      icon: Flower,
      color: 'bg-pink-500',
      category: 'florist',
      popular: true,
      filters: { category: ['florist'] },
    },
    {
      id: 'catering',
      label: 'Catering',
      query: 'wedding catering',
      icon: UtensilsCrossed,
      color: 'bg-orange-500',
      category: 'catering',
      popular: true,
      filters: { category: ['catering'] },
    },
    {
      id: 'music',
      label: 'Music & DJ',
      query: 'wedding music DJ',
      icon: Music,
      color: 'bg-green-500',
      category: 'music',
      filters: { category: ['music'] },
    },
    {
      id: 'planning',
      label: 'Planners',
      query: 'wedding planners',
      icon: Calendar,
      color: 'bg-indigo-500',
      category: 'planning',
      filters: { category: ['planning'] },
    },
    {
      id: 'transport',
      label: 'Transport',
      query: 'wedding transport',
      icon: Car,
      color: 'bg-yellow-500',
      category: 'transport',
      filters: { category: ['transport'] },
    },
    {
      id: 'beauty',
      label: 'Beauty',
      query: 'wedding beauty hair makeup',
      icon: Sparkles,
      color: 'bg-rose-500',
      category: 'beauty',
      filters: { category: ['beauty'] },
    },
  ];

  // Get popular actions (first 4)
  const popularActions = quickActions.filter((action) => action.popular);
  const otherActions = quickActions.filter((action) => !action.popular);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Near Me Actions */}
      {userLocation && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-600" />
            Near You
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleNearMeSearch()}
              className="flex items-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-2xl hover:bg-blue-100 transition-colors"
              style={{ minHeight: '64px' }}
            >
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">All Vendors</p>
                <p className="text-xs opacity-75">Near your location</p>
              </div>
            </button>

            <button
              onClick={() => handleNearMeSearch('photographer')}
              className="flex items-center gap-3 p-4 bg-purple-50 text-purple-700 rounded-2xl hover:bg-purple-100 transition-colors"
              style={{ minHeight: '64px' }}
            >
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white">
                <Camera className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">Photographers</p>
                <p className="text-xs opacity-75">Near you</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Popular Categories */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          Popular
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {popularActions.map((action) => {
            const IconComponent = action.icon;
            return (
              <motion.button
                key={action.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleQuickSearch(action)}
                className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                style={{ minHeight: '64px' }}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-white',
                    action.color,
                  )}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm text-gray-900">
                    {action.label}
                  </p>
                  <p className="text-xs text-gray-500">Find & compare</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* All Categories */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          All Categories
        </h3>

        <div className="grid grid-cols-4 gap-3">
          {otherActions.map((action) => {
            const IconComponent = action.icon;
            return (
              <motion.button
                key={action.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleQuickSearch(action)}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                style={{ minHeight: '80px' }}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-white',
                    action.color,
                  )}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-gray-900 text-center leading-tight">
                  {action.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Trending Searches */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          Trending
        </h3>

        <div className="flex flex-wrap gap-2">
          {trendingSearches.map((search, index) => (
            <motion.button
              key={`trending-${index}`}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleTrendingSearch(search)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
              style={{ minHeight: '36px' }}
            >
              {search}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Recent Locations */}
      {recentLocations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            Recent Locations
          </h3>

          <div className="space-y-2">
            {recentLocations.map((location) => (
              <button
                key={location.id}
                onClick={() => handleLocationSearch(location)}
                className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left"
                style={{ minHeight: '52px' }}
              >
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {location.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(location.lastUsed).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Filters */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Filters
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onQuickSearch('top rated vendors', { rating: 4.5 })}
            className="flex items-center gap-3 p-4 bg-yellow-50 text-yellow-700 rounded-2xl hover:bg-yellow-100 transition-colors"
            style={{ minHeight: '64px' }}
          >
            <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white">
              <Star className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">Top Rated</p>
              <p className="text-xs opacity-75">4.5+ stars</p>
            </div>
          </button>

          <button
            onClick={() =>
              onQuickSearch('verified vendors', { features: ['verified'] })
            }
            className="flex items-center gap-3 p-4 bg-green-50 text-green-700 rounded-2xl hover:bg-green-100 transition-colors"
            style={{ minHeight: '64px' }}
          >
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
              <Heart className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">Verified</p>
              <p className="text-xs opacity-75">Trusted vendors</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
