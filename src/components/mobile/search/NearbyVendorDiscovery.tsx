'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Navigation,
  MapPin,
  Star,
  Clock,
  Phone,
  Heart,
  Share2,
  ChevronRight,
  Radar,
  Zap,
  Calendar,
  Camera,
  Building2,
  Flower,
  UtensilsCrossed,
  Music,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { SearchResult, SearchFilters } from '@/types/mobile-search';
import { cn } from '@/lib/utils';

interface NearbyVendorDiscoveryProps {
  userLocation?: { lat: number; lng: number };
  onVendorSelect: (vendor: SearchResult) => void;
  onLocationUpdate: (location: { lat: number; lng: number }) => void;
  className?: string;
}

interface DiscoveryVendor extends SearchResult {
  discoveryScore: number;
  lastActivity: number;
  isOnline: boolean;
  responseTime: string;
  completedBookings: number;
  specialOffers?: string[];
}

interface LocationRadius {
  value: number;
  label: string;
  description: string;
}

const LOCATION_RADII: LocationRadius[] = [
  { value: 1, label: '1 mile', description: 'Very close' },
  { value: 3, label: '3 miles', description: 'Walking distance' },
  { value: 5, label: '5 miles', description: 'Short drive' },
  { value: 10, label: '10 miles', description: 'Local area' },
  { value: 25, label: '25 miles', description: 'Extended area' },
];

export default function NearbyVendorDiscovery({
  userLocation,
  onVendorSelect,
  onLocationUpdate,
  className,
}: NearbyVendorDiscoveryProps) {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredVendors, setDiscoveredVendors] = useState<DiscoveryVendor[]>(
    [],
  );
  const [selectedRadius, setSelectedRadius] = useState(5);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [lastDiscoveryTime, setLastDiscoveryTime] = useState<number | null>(
    null,
  );
  const [savedVendors, setSavedVendors] = useState<Set<string>>(new Set());
  const [discoveryMode, setDiscoveryMode] = useState<'auto' | 'manual'>(
    'manual',
  );
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

  const discoveryIntervalRef = useRef<NodeJS.Timeout>();

  // Wedding vendor categories with discovery weights
  const categories = [
    {
      id: 'photographer',
      label: 'Photography',
      icon: Camera,
      color: 'bg-purple-500',
      weight: 1.2,
    },
    {
      id: 'venue',
      label: 'Venues',
      icon: Building2,
      color: 'bg-blue-500',
      weight: 1.1,
    },
    {
      id: 'florist',
      label: 'Florists',
      icon: Flower,
      color: 'bg-pink-500',
      weight: 1.0,
    },
    {
      id: 'catering',
      label: 'Catering',
      icon: UtensilsCrossed,
      color: 'bg-orange-500',
      weight: 1.0,
    },
    {
      id: 'music',
      label: 'Music',
      icon: Music,
      color: 'bg-green-500',
      weight: 0.9,
    },
    {
      id: 'beauty',
      label: 'Beauty',
      icon: Sparkles,
      color: 'bg-rose-500',
      weight: 0.8,
    },
  ];

  // Load saved vendors from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('wedsync_saved_vendors');
    if (saved) {
      try {
        setSavedVendors(new Set(JSON.parse(saved)));
      } catch (error) {
        console.error('Failed to load saved vendors:', error);
      }
    }
  }, []);

  // Trigger haptic feedback
  const triggerHapticFeedback = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'medium') => {
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

  // Calculate discovery score based on multiple factors
  const calculateDiscoveryScore = useCallback(
    (vendor: SearchResult, userLoc: { lat: number; lng: number }) => {
      let score = 0;

      // Distance factor (closer = higher score)
      if (vendor.location.coordinates) {
        const distance = calculateDistance(
          userLoc,
          vendor.location.coordinates,
        );
        score += Math.max(0, 100 - distance * 10);
      }

      // Rating factor
      score += vendor.rating * 15;

      // Review count factor (more reviews = more reliable)
      score += Math.min(vendor.reviewCount * 0.5, 20);

      // Featured/verified bonus
      if (vendor.featured) score += 15;
      if (vendor.verified) score += 10;

      // Category weight (based on popularity)
      const categoryWeight =
        categories.find((cat) => cat.id === vendor.category)?.weight || 1;
      score *= categoryWeight;

      // Availability bonus (assume available vendors score higher)
      if (vendor.availability.length > 0) score += 10;

      // Randomize slightly for discovery variety
      score += Math.random() * 10;

      return Math.round(score);
    },
    [],
  );

  // Calculate distance between two points
  const calculateDistance = (
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number },
  ) => {
    const R = 3959; // Earth's radius in miles
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

  // Generate mock nearby vendors for discovery
  const generateNearbyVendors = useCallback(
    (
      location: { lat: number; lng: number },
      radius: number,
    ): DiscoveryVendor[] => {
      const vendors: DiscoveryVendor[] = [];
      const vendorNames = {
        photographer: [
          'Capture Moments',
          'Perfect Shot Studio',
          'Eternal Images',
          'Golden Hour Photography',
        ],
        venue: [
          'Grand Manor',
          'Riverside Gardens',
          'Historic Castle',
          'Modern Event Space',
        ],
        florist: [
          'Bloom & Blossom',
          'Petal Perfect',
          'Garden Dreams',
          'Flower Power',
        ],
        catering: [
          'Delicious Delights',
          'Gourmet Gatherings',
          'Feast & Celebration',
          'Culinary Creations',
        ],
        music: [
          'Wedding Beats',
          'Harmony Entertainment',
          'Live & Love Music',
          'Sound Waves',
        ],
        beauty: [
          'Bridal Beauty',
          'Glow & Glamour',
          'Perfect Look Studio',
          'Style & Grace',
        ],
      };

      const specialOffers = [
        'Free engagement session',
        '20% off second photographer',
        'Complimentary consultation',
        'Package deals available',
        'Off-season discounts',
        'Early bird pricing',
      ];

      // Generate vendors for selected categories (or all if none selected)
      const categoriesToGenerate =
        selectedCategories.length > 0
          ? selectedCategories
          : categories.map((c) => c.id);

      categoriesToGenerate.forEach((categoryId) => {
        const category = categories.find((c) => c.id === categoryId);
        if (!category) return;

        const namesForCategory = vendorNames[
          categoryId as keyof typeof vendorNames
        ] || ['Local Vendor'];

        // Generate 2-4 vendors per category
        const vendorCount = Math.floor(Math.random() * 3) + 2;

        for (let i = 0; i < vendorCount; i++) {
          // Generate random coordinates within radius
          const angle = Math.random() * 2 * Math.PI;
          const distance = Math.random() * radius;
          const deltaLat = (distance / 69) * Math.cos(angle);
          const deltaLng =
            ((distance / 69) * Math.sin(angle)) /
            Math.cos((location.lat * Math.PI) / 180);

          const vendorLocation = {
            lat: location.lat + deltaLat,
            lng: location.lng + deltaLng,
          };

          const vendor: SearchResult = {
            id: `${categoryId}-${i}-${Date.now()}`,
            name: namesForCategory[i % namesForCategory.length],
            category: categoryId as any,
            location: {
              address: `${Math.floor(Math.random() * 999) + 1} Wedding Street`,
              city: ['London', 'Birmingham', 'Manchester', 'Leeds'][
                Math.floor(Math.random() * 4)
              ],
              postcode: `SW${Math.floor(Math.random() * 9) + 1}${String.fromCharCode(65 + Math.floor(Math.random() * 26))} ${Math.floor(Math.random() * 9) + 1}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
              coordinates: vendorLocation,
            },
            distance: calculateDistance(location, vendorLocation),
            rating: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10,
            reviewCount: Math.floor(Math.random() * 200) + 10,
            priceRange: ['budget', 'mid-range', 'premium', 'luxury'][
              Math.floor(Math.random() * 4)
            ] as any,
            availability: [
              new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000),
            ],
            images: [
              `https://picsum.photos/400/300?random=${Math.floor(Math.random() * 1000)}`,
            ],
            featured: Math.random() > 0.7,
            verified: Math.random() > 0.5,
          };

          const discoveryVendor: DiscoveryVendor = {
            ...vendor,
            discoveryScore: calculateDiscoveryScore(vendor, location),
            lastActivity: Date.now() - Math.random() * 24 * 60 * 60 * 1000, // Within last 24 hours
            isOnline: Math.random() > 0.3,
            responseTime: ['< 1 hour', '< 2 hours', '< 4 hours', 'Same day'][
              Math.floor(Math.random() * 4)
            ],
            completedBookings: Math.floor(Math.random() * 50) + 5,
            specialOffers:
              Math.random() > 0.6
                ? [
                    specialOffers[
                      Math.floor(Math.random() * specialOffers.length)
                    ],
                  ]
                : undefined,
          };

          vendors.push(discoveryVendor);
        }
      });

      // Sort by discovery score
      return vendors.sort((a, b) => b.discoveryScore - a.discoveryScore);
    },
    [
      selectedCategories,
      calculateDistance,
      calculateDiscoveryScore,
      categories,
    ],
  );

  // Start vendor discovery
  const startDiscovery = useCallback(async () => {
    if (!userLocation) {
      // Request location permission
      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000,
            });
          },
        );

        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setLocationAccuracy(position.coords.accuracy);
        onLocationUpdate(newLocation);
        performDiscovery(newLocation);
      } catch (error) {
        console.error('Failed to get location:', error);
        // Use default location (London) for demo
        const defaultLocation = { lat: 51.5074, lng: -0.1278 };
        performDiscovery(defaultLocation);
      }
    } else {
      performDiscovery(userLocation);
    }
  }, [userLocation, onLocationUpdate, selectedRadius, selectedCategories]);

  // Perform the actual discovery
  const performDiscovery = useCallback(
    (location: { lat: number; lng: number }) => {
      setIsDiscovering(true);
      triggerHapticFeedback('heavy');

      // Simulate discovery process
      setTimeout(() => {
        const vendors = generateNearbyVendors(location, selectedRadius);
        setDiscoveredVendors(vendors);
        setLastDiscoveryTime(Date.now());
        setIsDiscovering(false);
        triggerHapticFeedback('medium');
      }, 2000);
    },
    [selectedRadius, generateNearbyVendors, triggerHapticFeedback],
  );

  // Toggle category selection
  const toggleCategory = useCallback(
    (categoryId: string) => {
      triggerHapticFeedback('light');
      setSelectedCategories((prev) =>
        prev.includes(categoryId)
          ? prev.filter((id) => id !== categoryId)
          : [...prev, categoryId],
      );
    },
    [triggerHapticFeedback],
  );

  // Handle save vendor
  const handleSaveVendor = useCallback(
    (vendorId: string) => {
      const newSaved = new Set(savedVendors);
      if (savedVendors.has(vendorId)) {
        newSaved.delete(vendorId);
      } else {
        newSaved.add(vendorId);
      }
      setSavedVendors(newSaved);
      localStorage.setItem(
        'wedsync_saved_vendors',
        JSON.stringify([...newSaved]),
      );
      triggerHapticFeedback('light');
    },
    [savedVendors, triggerHapticFeedback],
  );

  // Auto-discovery mode
  useEffect(() => {
    if (discoveryMode === 'auto' && userLocation) {
      discoveryIntervalRef.current = setInterval(() => {
        performDiscovery(userLocation);
      }, 30000); // Every 30 seconds

      return () => {
        if (discoveryIntervalRef.current) {
          clearInterval(discoveryIntervalRef.current);
        }
      };
    }
  }, [discoveryMode, userLocation, performDiscovery]);

  // Get category icon
  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.icon || Building2;
  };

  // Get category color
  const getCategoryColor = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.color || 'bg-gray-500';
  };

  return (
    <div className={cn('h-full flex flex-col bg-gray-50', className)}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-purple-600 rounded-full flex items-center justify-center">
              <Radar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Discover Nearby
              </h1>
              <p className="text-sm text-gray-600">
                Find wedding vendors around you
              </p>
            </div>
          </div>

          {/* Discovery Controls */}
          <div className="space-y-4">
            {/* Radius Selection */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Search Distance
              </p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {LOCATION_RADII.map((radius) => (
                  <button
                    key={radius.value}
                    onClick={() => {
                      setSelectedRadius(radius.value);
                      triggerHapticFeedback('light');
                    }}
                    className={cn(
                      'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
                      selectedRadius === radius.value
                        ? 'bg-rose-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                    )}
                    style={{ minHeight: '36px' }}
                  >
                    {radius.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Selection */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Vendor Types{' '}
                {selectedCategories.length > 0 &&
                  `(${selectedCategories.length})`}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((category) => {
                  const IconComponent = category.icon;
                  const isSelected = selectedCategories.includes(category.id);

                  return (
                    <button
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all',
                        isSelected
                          ? 'border-rose-300 bg-rose-50'
                          : 'border-gray-200 bg-white hover:border-gray-300',
                      )}
                      style={{ minHeight: '72px' }}
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-white',
                          category.color,
                        )}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span
                        className={cn(
                          'text-xs font-medium',
                          isSelected ? 'text-rose-700' : 'text-gray-700',
                        )}
                      >
                        {category.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discovery Button */}
      <div className="p-4 bg-white border-b border-gray-200">
        <button
          onClick={startDiscovery}
          disabled={isDiscovering}
          className={cn(
            'w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold transition-all',
            isDiscovering
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-rose-600 to-purple-600 text-white hover:from-rose-700 hover:to-purple-700 shadow-lg',
          )}
          style={{ minHeight: '56px' }}
        >
          {isDiscovering ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Discovering vendors...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Start Discovery
            </>
          )}
        </button>

        {/* Last Discovery Info */}
        {lastDiscoveryTime && !isDiscovering && (
          <p className="text-xs text-gray-500 text-center mt-2">
            Last discovery: {new Date(lastDiscoveryTime).toLocaleTimeString()}
            {locationAccuracy &&
              ` • Accuracy: ${Math.round(locationAccuracy)}m`}
          </p>
        )}
      </div>

      {/* Discovered Vendors */}
      <div className="flex-1 overflow-y-auto">
        {isDiscovering && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 bg-gradient-to-br from-rose-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Radar className="w-8 h-8 text-white" />
              </motion.div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Discovering Vendors
              </h3>
              <p className="text-gray-600 text-sm">
                Scanning {selectedRadius} mile radius for wedding
                professionals...
              </p>
            </div>
          </div>
        )}

        {!isDiscovering && discoveredVendors.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Navigation className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ready to Discover
              </h3>
              <p className="text-gray-600 text-sm">
                Tap "Start Discovery" to find wedding vendors near you
              </p>
            </div>
          </div>
        )}

        {!isDiscovering && discoveredVendors.length > 0 && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Found {discoveredVendors.length} vendors
              </h2>
              <span className="text-sm text-gray-500">
                Within {selectedRadius} mile{selectedRadius !== 1 ? 's' : ''}
              </span>
            </div>

            {discoveredVendors.map((vendor, index) => {
              const IconComponent = getCategoryIcon(vendor.category);
              const categoryColor = getCategoryColor(vendor.category);
              const isSaved = savedVendors.has(vendor.id);

              return (
                <motion.div
                  key={vendor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-4">
                    {/* Vendor Image */}
                    <div className="w-16 h-16 bg-gray-200 rounded-xl flex-shrink-0 overflow-hidden">
                      {vendor.images[0] ? (
                        <img
                          src={vendor.images[0]}
                          alt={vendor.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className={cn(
                            'w-full h-full flex items-center justify-center text-white',
                            categoryColor,
                          )}
                        >
                          <IconComponent className="w-8 h-8" />
                        </div>
                      )}
                    </div>

                    {/* Vendor Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate mb-1">
                            {vendor.name}
                          </h3>
                          <p className="text-sm text-gray-600 capitalize">
                            {vendor.category.replace('-', ' ')}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 ml-2">
                          {vendor.isOnline && (
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                          <button
                            onClick={() => handleSaveVendor(vendor.id)}
                            className={cn(
                              'p-2 rounded-full transition-colors',
                              isSaved
                                ? 'bg-rose-100 text-rose-600'
                                : 'bg-gray-100 text-gray-400 hover:text-rose-600 hover:bg-rose-50',
                            )}
                            style={{ minHeight: '32px', minWidth: '32px' }}
                          >
                            <Heart
                              className={cn(
                                'w-4 h-4',
                                isSaved && 'fill-current',
                              )}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-current" />
                          <span>{vendor.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{vendor.distance?.toFixed(1)}mi</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{vendor.responseTime}</span>
                        </div>
                      </div>

                      {/* Special Offers */}
                      {vendor.specialOffers && (
                        <div className="mb-3">
                          {vendor.specialOffers.map((offer, idx) => (
                            <span
                              key={idx}
                              className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium"
                            >
                              🎉 {offer}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => onVendorSelect(vendor)}
                          className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors"
                          style={{ minHeight: '36px' }}
                        >
                          View Details
                        </button>
                        <button
                          className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                          style={{ minHeight: '36px', minWidth: '36px' }}
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                        <button
                          className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                          style={{ minHeight: '36px', minWidth: '36px' }}
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
