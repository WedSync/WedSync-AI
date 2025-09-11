'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Map,
  List,
  MapPin,
  Filter,
  Navigation,
  Plus,
  Minus,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SearchResult, SearchFilters } from '@/types/mobile-search';
import { cn } from '@/lib/utils';

interface MapBasedVendorSearchProps {
  results: SearchResult[];
  filters: SearchFilters;
  userLocation?: { lat: number; lng: number };
  onResultSelect: (result: SearchResult) => void;
  onFiltersChange: (filters: SearchFilters) => void;
  className?: string;
}

interface MapMarker extends SearchResult {
  position: { lat: number; lng: number };
  clusterId?: string;
}

interface ClusterMarker {
  id: string;
  position: { lat: number; lng: number };
  count: number;
  results: SearchResult[];
}

export default function MapBasedVendorSearch({
  results,
  filters,
  userLocation,
  onResultSelect,
  onFiltersChange,
  className,
}: MapBasedVendorSearchProps) {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [mapCenter, setMapCenter] = useState(
    userLocation || { lat: 51.5074, lng: -0.1278 },
  ); // London default
  const [zoomLevel, setZoomLevel] = useState(12);
  const [selectedMarker, setSelectedMarker] = useState<SearchResult | null>(
    null,
  );
  const [clusters, setClusters] = useState<ClusterMarker[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  // Convert results to map markers
  const markers: MapMarker[] = results
    .filter((result) => result.location.coordinates)
    .map((result) => ({
      ...result,
      position: result.location.coordinates!,
    }));

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

  // Simple clustering algorithm for mobile optimization
  const clusterMarkers = useCallback((markers: MapMarker[], zoom: number) => {
    const clusters: ClusterMarker[] = [];
    const processed = new Set<string>();
    const clusterRadius = Math.max(50, 200 / zoom); // Smaller radius at higher zoom

    markers.forEach((marker) => {
      if (processed.has(marker.id)) return;

      const nearby = markers.filter((other) => {
        if (processed.has(other.id) || marker.id === other.id) return false;

        const distance = calculateDistance(marker.position, other.position);
        return distance < clusterRadius;
      });

      if (nearby.length > 0) {
        // Create cluster
        const clusterResults = [marker, ...nearby];
        const avgLat =
          clusterResults.reduce((sum, r) => sum + r.position.lat, 0) /
          clusterResults.length;
        const avgLng =
          clusterResults.reduce((sum, r) => sum + r.position.lng, 0) /
          clusterResults.length;

        clusters.push({
          id: `cluster-${marker.id}`,
          position: { lat: avgLat, lng: avgLng },
          count: clusterResults.length,
          results: clusterResults,
        });

        clusterResults.forEach((r) => processed.add(r.id));
      } else {
        // Single marker
        clusters.push({
          id: marker.id,
          position: marker.position,
          count: 1,
          results: [marker],
        });
        processed.add(marker.id);
      }
    });

    return clusters;
  }, []);

  // Calculate distance between two points
  const calculateDistance = (
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number },
  ) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
    const dLng = ((point2.lng - point1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((point1.lat * Math.PI) / 180) *
        Math.cos((point2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Update clusters when markers or zoom changes
  useEffect(() => {
    if (zoomLevel > 14) {
      // High zoom - show individual markers
      setClusters(
        markers.map((marker) => ({
          id: marker.id,
          position: marker.position,
          count: 1,
          results: [marker],
        })),
      );
    } else {
      // Lower zoom - cluster markers
      setClusters(clusterMarkers(markers, zoomLevel));
    }
  }, [markers, zoomLevel, clusterMarkers]);

  // Handle marker click
  const handleMarkerClick = useCallback(
    (cluster: ClusterMarker) => {
      triggerHapticFeedback('medium');

      if (cluster.count === 1) {
        setSelectedMarker(cluster.results[0]);
      } else {
        // Zoom in on cluster
        setMapCenter(cluster.position);
        setZoomLevel((prev) => Math.min(prev + 2, 18));
      }
    },
    [triggerHapticFeedback],
  );

  // Handle view mode toggle
  const toggleViewMode = useCallback(() => {
    triggerHapticFeedback('light');
    setViewMode((prev) => (prev === 'map' ? 'list' : 'map'));
  }, [triggerHapticFeedback]);

  // Handle zoom controls
  const handleZoom = useCallback(
    (direction: 'in' | 'out') => {
      triggerHapticFeedback('light');
      setZoomLevel((prev) => {
        const newZoom = direction === 'in' ? prev + 1 : prev - 1;
        return Math.max(8, Math.min(18, newZoom));
      });
    },
    [triggerHapticFeedback],
  );

  // Reset to user location
  const resetToUserLocation = useCallback(() => {
    if (userLocation) {
      triggerHapticFeedback('medium');
      setMapCenter(userLocation);
      setZoomLevel(14);
    }
  }, [userLocation, triggerHapticFeedback]);

  // Get category icon
  const getCategoryIcon = (category: string) => {
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

  // Get category color
  const getCategoryColor = (category: string) => {
    const colors = {
      photographer: 'bg-purple-500',
      venue: 'bg-blue-500',
      florist: 'bg-pink-500',
      catering: 'bg-orange-500',
      music: 'bg-green-500',
      planning: 'bg-indigo-500',
      transport: 'bg-yellow-500',
      beauty: 'bg-rose-500',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className={cn('relative h-full bg-gray-100', className)}>
      {/* Header Controls */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center gap-3">
        {/* View Mode Toggle */}
        <div className="flex bg-white rounded-2xl shadow-lg overflow-hidden">
          <button
            onClick={() => setViewMode('map')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
              viewMode === 'map'
                ? 'bg-rose-600 text-white'
                : 'text-gray-600 hover:bg-gray-50',
            )}
            style={{ minHeight: '40px' }}
          >
            <Map className="w-4 h-4" />
            Map
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
              viewMode === 'list'
                ? 'bg-rose-600 text-white'
                : 'text-gray-600 hover:bg-gray-50',
            )}
            style={{ minHeight: '40px' }}
          >
            <List className="w-4 h-4" />
            List
          </button>
        </div>

        {/* Filters Button */}
        <button
          onClick={() => setShowFilters(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-2xl shadow-lg hover:bg-gray-50 transition-colors"
          style={{ minHeight: '40px' }}
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filter</span>
          {(filters.category.length > 0 || filters.priceRange.length > 0) && (
            <span className="bg-rose-600 text-white text-xs px-1.5 py-0.5 rounded-full">
              {filters.category.length + filters.priceRange.length}
            </span>
          )}
        </button>
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="relative h-full">
          {/* Map Container */}
          <div
            ref={mapRef}
            className="h-full bg-gray-200 relative overflow-hidden"
          >
            {/* Simulated Map Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-100 via-blue-50 to-gray-100">
              {/* Grid Pattern */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: '50px 50px',
                }}
              />
            </div>

            {/* Vendor Markers */}
            {clusters.map((cluster) => {
              // Calculate marker position based on map bounds
              const x =
                ((cluster.position.lng - (mapCenter.lng - 0.01 * zoomLevel)) /
                  (0.02 * zoomLevel)) *
                100;
              const y =
                ((mapCenter.lat + 0.01 * zoomLevel - cluster.position.lat) /
                  (0.02 * zoomLevel)) *
                100;

              // Only show markers within bounds
              if (x < -10 || x > 110 || y < -10 || y > 110) return null;

              const isSelected =
                selectedMarker &&
                cluster.results.some((r) => r.id === selectedMarker.id);

              return (
                <motion.div
                  key={cluster.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute"
                  style={{
                    left: `${Math.max(0, Math.min(100, x))}%`,
                    top: `${Math.max(0, Math.min(100, y))}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onClick={() => handleMarkerClick(cluster)}
                >
                  {cluster.count > 1 ? (
                    // Cluster marker
                    <div className="relative">
                      <div className="w-12 h-12 bg-rose-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-sm">
                        {cluster.count}
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center text-xs">
                        +
                      </div>
                    </div>
                  ) : (
                    // Single vendor marker
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white text-lg transition-all',
                        getCategoryColor(cluster.results[0].category),
                        isSelected && 'ring-4 ring-rose-300 scale-125',
                      )}
                    >
                      {getCategoryIcon(cluster.results[0].category)}
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* User Location Marker */}
            {userLocation && (
              <div
                className="absolute w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"
                style={{
                  left: `${((userLocation.lng - (mapCenter.lng - 0.01 * zoomLevel)) / (0.02 * zoomLevel)) * 100}%`,
                  top: `${((mapCenter.lat + 0.01 * zoomLevel - userLocation.lat) / (0.02 * zoomLevel)) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping"></div>
              </div>
            )}
          </div>

          {/* Map Controls */}
          <div className="absolute right-4 top-20 z-20 flex flex-col gap-2">
            <button
              onClick={() => handleZoom('in')}
              className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleZoom('out')}
              className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Minus className="w-5 h-5" />
            </button>
            {userLocation && (
              <button
                onClick={resetToUserLocation}
                className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
              >
                <Navigation className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-4 left-4 right-4 z-20">
            <div className="bg-white rounded-2xl shadow-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    Found {results.length} vendors
                  </p>
                  <p className="text-xs text-gray-500">
                    Zoom: {zoomLevel}x • Showing {clusters.length} markers
                  </p>
                </div>
                <button
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors"
                  style={{ minHeight: '40px' }}
                >
                  View List
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="p-4 pt-20 h-full overflow-y-auto">
          <div className="space-y-4">
            {results.map((result) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border p-4 hover:shadow-md transition-shadow"
                onClick={() => onResultSelect(result)}
              >
                <div className="flex gap-4">
                  {/* Vendor Image */}
                  <div className="w-16 h-16 bg-gray-200 rounded-xl flex-shrink-0 overflow-hidden">
                    {result.images[0] ? (
                      <img
                        src={result.images[0]}
                        alt={result.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        {getCategoryIcon(result.category)}
                      </div>
                    )}
                  </div>

                  {/* Vendor Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {result.name}
                    </h3>
                    <p className="text-sm text-gray-600 capitalize mb-1">
                      {result.category.replace('-', ' ')}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>
                          {result.distance
                            ? `${result.distance.toFixed(1)}mi`
                            : result.location.city}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400">★</span>
                        <span>{result.rating}</span>
                      </div>
                    </div>
                  </div>

                  {/* Category Badge */}
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm',
                      getCategoryColor(result.category),
                    )}
                  >
                    {getCategoryIcon(result.category)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Marker Popup */}
      <AnimatePresence>
        {selectedMarker && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-4 left-4 right-4 z-30"
          >
            <div className="bg-white rounded-2xl shadow-xl p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedMarker.name}
                  </h3>
                  <p className="text-sm text-rose-600 capitalize">
                    {selectedMarker.category.replace('-', ' ')}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMarker(null)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400">★</span>
                    <span>{selectedMarker.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>
                      {selectedMarker.distance
                        ? `${selectedMarker.distance.toFixed(1)} miles`
                        : selectedMarker.location.city}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onResultSelect(selectedMarker)}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
