'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CoupleProfile,
  WeddingFile,
  VendorDiscovery,
  VendorProfile,
  VendorRecommendation,
  DiscoverySource,
  VendorCategory,
} from '@/types/wedme/file-management';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  discoverVendorsFromWeddingFiles,
  generateVendorRecommendations,
  calculateVendorCompatibility,
} from '@/lib/wedme/vendor-discovery-engine';
import {
  Search,
  Filter,
  Star,
  MapPin,
  Heart,
  Eye,
  Phone,
  Mail,
  Globe,
  Instagram,
  Camera,
  Music,
  Utensils,
  Flower,
  Car,
  Cake,
  Sparkles,
  TrendingUp,
  Users,
  Clock,
  DollarSign,
  CheckCircle,
  Bookmark,
  Share2,
  ArrowRight,
  Zap,
  Award,
} from 'lucide-react';

type DiscoveryMode = 'browse' | 'curated' | 'similar' | 'trending';
type SortBy = 'relevance' | 'rating' | 'distance' | 'price' | 'availability';

interface VendorDiscoveryEngineProps {
  couple: CoupleProfile;
  discoveredFiles: WeddingFile[];
  onVendorDiscovered: (vendor: VendorProfile) => void;
  className?: string;
}

const VendorDiscoveryEngine: React.FC<VendorDiscoveryEngineProps> = ({
  couple,
  discoveredFiles,
  onVendorDiscovered,
  className = '',
}) => {
  const [discoveryMode, setDiscoveryMode] = useState<DiscoveryMode>('curated');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    VendorCategory | 'all'
  >('all');
  const [sortBy, setSortBy] = useState<SortBy>('relevance');
  const [maxDistance, setMaxDistance] = useState([50]); // miles
  const [budgetRange, setBudgetRange] = useState([0, 10000]);
  const [savedVendors, setSavedVendors] = useState<VendorProfile[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(
    null,
  );
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Discover vendors from files
  const vendorDiscoveries = useMemo(() => {
    if (discoveredFiles.length === 0) return [];

    return discoverVendorsFromWeddingFiles(discoveredFiles, {
      coupleLocation: couple.weddingLocation,
      coupleStyle: couple.weddingStyle,
      budget: couple.budget,
      weddingDate: couple.weddingDate,
      preferences: couple.vendorPreferences,
    });
  }, [discoveredFiles, couple]);

  // Generate curated recommendations
  const vendorRecommendations = useMemo(() => {
    return generateVendorRecommendations(couple.preferences, {
      location: couple.weddingLocation,
      budget: couple.budget,
      style: couple.weddingStyle,
      weddingDate: couple.weddingDate,
      existingVendors: savedVendors,
    });
  }, [couple, savedVendors]);

  // Filter and sort vendors based on current settings
  const filteredVendors = useMemo(() => {
    let vendors = [...vendorDiscoveries];

    // Apply search filter
    if (searchQuery) {
      vendors = vendors.filter(
        (discovery) =>
          discovery.vendor.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          discovery.vendor.businessName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          discovery.vendor.specialties.some((s) =>
            s.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      vendors = vendors.filter(
        (discovery) => discovery.vendor.category === selectedCategory,
      );
    }

    // Apply distance filter (if location available)
    if (couple.weddingLocation) {
      vendors = vendors.filter((discovery) => {
        const distance = calculateDistance(
          couple.weddingLocation,
          discovery.vendor.location,
        );
        return distance <= maxDistance[0];
      });
    }

    // Apply budget filter
    vendors = vendors.filter((discovery) => {
      const pricing = discovery.pricingEstimate;
      if (!pricing) return true;
      return pricing.min >= budgetRange[0] && pricing.max <= budgetRange[1];
    });

    // Sort vendors
    vendors.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (
            b.vendor.reviews.reduce((sum, r) => sum + r.rating, 0) /
              b.vendor.reviews.length -
            a.vendor.reviews.reduce((sum, r) => sum + r.rating, 0) /
              a.vendor.reviews.length
          );
        case 'distance':
          if (couple.weddingLocation) {
            return (
              calculateDistance(couple.weddingLocation, a.vendor.location) -
              calculateDistance(couple.weddingLocation, b.vendor.location)
            );
          }
          return 0;
        case 'price':
          return (a.pricingEstimate?.min || 0) - (b.pricingEstimate?.min || 0);
        case 'availability':
          return a.availabilityStatus === 'available' ? -1 : 1;
        case 'relevance':
        default:
          return b.contextMatch - a.contextMatch;
      }
    });

    return vendors;
  }, [
    vendorDiscoveries,
    searchQuery,
    selectedCategory,
    maxDistance,
    budgetRange,
    sortBy,
    couple,
  ]);

  const handleVendorSave = useCallback((vendor: VendorProfile) => {
    setSavedVendors((prev) =>
      prev.some((v) => v.id === vendor.id)
        ? prev.filter((v) => v.id !== vendor.id)
        : [...prev, vendor],
    );
  }, []);

  const handleVendorContact = useCallback(
    async (vendor: VendorProfile) => {
      // In real implementation, this would open contact modal or redirect
      console.log('Contacting vendor:', vendor.name);

      // Track the contact action
      // await trackVendorContact(vendor.id, couple.id);

      onVendorDiscovered(vendor);
    },
    [onVendorDiscovered],
  );

  const handleFileView = useCallback((file: WeddingFile) => {
    // Open file in lightbox or viewer
    console.log('Viewing file:', file.id);
  }, []);

  // Vendor categories with icons
  const categoryIcons: Record<VendorCategory, any> = {
    photographer: Camera,
    videographer: Camera,
    venue: MapPin,
    caterer: Utensils,
    florist: Flower,
    dj: Music,
    band: Music,
    baker: Cake,
    transportation: Car,
    planner: Users,
    officiant: Heart,
    makeup: Sparkles,
    hair: Sparkles,
    dress: Heart,
    suit: Heart,
    jewelry: Sparkles,
    invitations: Mail,
    rentals: Users,
    lighting: Zap,
    security: Users,
  };

  return (
    <div
      className={`vendor-discovery-engine bg-gradient-to-br from-purple-50 via-white to-pink-50 min-h-screen ${className}`}
    >
      {/* Header */}
      <div className="bg-white border-b border-purple-100 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full">
                <Search className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Vendor Discovery
                </h1>
                <p className="text-gray-600">
                  {filteredVendors.length} amazing vendors discovered from{' '}
                  {discoveredFiles.length} wedding files
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="border-purple-200 hover:bg-purple-50"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>

              <Badge
                variant="secondary"
                className="bg-purple-100 text-purple-700"
              >
                {savedVendors.length} saved
              </Badge>
            </div>
          </div>

          {/* Search and Quick Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search vendors, specialties, or styles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-purple-200 focus:border-purple-400"
              />
            </div>

            <Select
              value={selectedCategory}
              onValueChange={(value: any) => setSelectedCategory(value)}
            >
              <SelectTrigger className="w-48 border-purple-200">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.keys(categoryIcons).map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(value: any) => setSortBy(value)}
            >
              <SelectTrigger className="w-40 border-purple-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="distance">Distance</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="availability">Availability</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-b border-purple-100"
          >
            <div className="container mx-auto px-4 py-4">
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Max Distance
                  </label>
                  <div className="px-2">
                    <Slider
                      value={maxDistance}
                      onValueChange={setMaxDistance}
                      max={200}
                      min={5}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>5 miles</span>
                      <span>{maxDistance[0]} miles</span>
                      <span>200 miles</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Budget Range
                  </label>
                  <div className="px-2">
                    <Slider
                      value={budgetRange}
                      onValueChange={setBudgetRange}
                      max={50000}
                      min={0}
                      step={500}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>${budgetRange[0].toLocaleString()}</span>
                      <span>${budgetRange[1].toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setMaxDistance([50]);
                      setBudgetRange([0, 10000]);
                      setSortBy('relevance');
                    }}
                    className="w-full border-purple-200 hover:bg-purple-50"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs
          value={discoveryMode}
          onValueChange={(value: any) => setDiscoveryMode(value)}
        >
          <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto mb-8">
            <TabsTrigger value="curated" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Curated
            </TabsTrigger>
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="similar" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Similar
            </TabsTrigger>
            <TabsTrigger value="trending" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Trending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="curated" className="space-y-6">
            <VendorDiscoveryGrid
              discoveries={filteredVendors}
              mode="curated"
              couple={couple}
              savedVendors={savedVendors}
              onVendorSave={handleVendorSave}
              onVendorContact={handleVendorContact}
              onFileView={handleFileView}
            />
          </TabsContent>

          <TabsContent value="browse" className="space-y-6">
            <VendorDiscoveryGrid
              discoveries={filteredVendors}
              mode="browse"
              couple={couple}
              savedVendors={savedVendors}
              onVendorSave={handleVendorSave}
              onVendorContact={handleVendorContact}
              onFileView={handleFileView}
            />
          </TabsContent>

          <TabsContent value="similar" className="space-y-6">
            <VendorDiscoveryGrid
              discoveries={filteredVendors.filter(
                (d) => d.similarityScore > 0.7,
              )}
              mode="similar"
              couple={couple}
              savedVendors={savedVendors}
              onVendorSave={handleVendorSave}
              onVendorContact={handleVendorContact}
              onFileView={handleFileView}
            />
          </TabsContent>

          <TabsContent value="trending" className="space-y-6">
            <VendorDiscoveryGrid
              discoveries={filteredVendors.filter(
                (d) =>
                  d.vendor.trendingStatus === 'hot' ||
                  d.vendor.trendingStatus === 'rising',
              )}
              mode="trending"
              couple={couple}
              savedVendors={savedVendors}
              onVendorSave={handleVendorSave}
              onVendorContact={handleVendorContact}
              onFileView={handleFileView}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Vendor Comparison Tool */}
      {savedVendors.length > 1 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-xl"
            onClick={() => {
              // Open comparison modal
            }}
          >
            <Users className="w-4 h-4 mr-2" />
            Compare {savedVendors.length} Vendors
          </Button>
        </div>
      )}
    </div>
  );
};

// Vendor Discovery Grid Component
interface VendorDiscoveryGridProps {
  discoveries: VendorDiscovery[];
  mode: DiscoveryMode;
  couple: CoupleProfile;
  savedVendors: VendorProfile[];
  onVendorSave: (vendor: VendorProfile) => void;
  onVendorContact: (vendor: VendorProfile) => void;
  onFileView: (file: WeddingFile) => void;
}

const VendorDiscoveryGrid: React.FC<VendorDiscoveryGridProps> = ({
  discoveries,
  mode,
  couple,
  savedVendors,
  onVendorSave,
  onVendorContact,
  onFileView,
}) => {
  if (discoveries.length === 0) {
    return (
      <div className="text-center py-12">
        <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">
          No Vendors Found
        </h3>
        <p className="text-gray-500">
          Try adjusting your filters or search terms to discover more vendors.
        </p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {discoveries.map((discovery, index) => (
        <VendorDiscoveryCard
          key={discovery.vendor.id}
          discovery={discovery}
          couple={couple}
          isSaved={savedVendors.some((v) => v.id === discovery.vendor.id)}
          onSave={() => onVendorSave(discovery.vendor)}
          onContact={() => onVendorContact(discovery.vendor)}
          onFileView={onFileView}
          index={index}
        />
      ))}
    </div>
  );
};

// Helper functions
const calculateDistance = (location1: any, location2: any): number => {
  // Simplified distance calculation - in real implementation would use proper geolocation
  const lat1 = location1.coordinates?.latitude || 0;
  const lon1 = location1.coordinates?.longitude || 0;
  const lat2 = location2.coordinates?.latitude || 0;
  const lon2 = location2.coordinates?.longitude || 0;

  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default VendorDiscoveryEngine;
