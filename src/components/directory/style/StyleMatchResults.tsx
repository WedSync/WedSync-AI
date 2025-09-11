'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MapPin,
  Star,
  ExternalLink,
  Filter,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { StylePreferences } from '@/types/style-matching';

interface Venue {
  id: string;
  name: string;
  type: string;
  location: string;
  images: string[];
  rating: number;
  reviewCount: number;
  priceRange: string;
  capacity: { min: number; max: number };
  styleMatch: number;
  features: string[];
  description: string;
}

interface Vendor {
  id: string;
  name: string;
  category: string;
  specialty: string;
  location: string;
  image: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  styleMatch: number;
  description: string;
}

interface StyleMatchResultsProps {
  preferences: StylePreferences;
  onComplete: () => void;
}

const SAMPLE_VENUES: Venue[] = [
  {
    id: '1',
    name: 'Garden Estate Manor',
    type: 'Historic Estate',
    location: 'Napa Valley, CA',
    images: ['/images/venues/garden-estate-1.jpg'],
    rating: 4.8,
    reviewCount: 124,
    priceRange: '$$$',
    capacity: { min: 50, max: 200 },
    styleMatch: 96,
    features: [
      'Garden Ceremony',
      'Historic Architecture',
      'Wine Country Views',
    ],
    description:
      'A stunning historic estate surrounded by lush gardens and vineyard views',
  },
];

const SAMPLE_VENDORS: Vendor[] = [
  {
    id: '1',
    name: 'Elegant Arrangements',
    category: 'Florist',
    specialty: 'Garden Style Florals',
    location: 'Napa Valley, CA',
    image: '/images/vendors/elegant-florist.jpg',
    rating: 4.9,
    reviewCount: 87,
    priceRange: '$$$',
    styleMatch: 94,
    description: 'Specializing in romantic, garden-inspired floral designs',
  },
];

export function StyleMatchResults({
  preferences,
  onComplete,
}: StyleMatchResultsProps) {
  const [activeTab, setActiveTab] = useState('venues');
  const [searchTerm, setSearchTerm] = useState('');
  const [savedItems, setSavedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const filteredVenues = useMemo(() => {
    return SAMPLE_VENUES.filter(
      (venue) =>
        venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.location.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [searchTerm]);

  const filteredVendors = useMemo(() => {
    return SAMPLE_VENDORS.filter(
      (vendor) =>
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.category.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [searchTerm]);

  const toggleSaved = useCallback((itemId: string) => {
    setSavedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-200 rounded-full animate-spin border-t-purple-600" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Heart className="h-6 w-6 text-purple-600" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-gray-900">
            Finding Your Perfect Matches
          </h3>
          <p className="text-gray-600">
            Analyzing thousands of venues and vendors...
          </p>
        </div>
      </div>
    );
  }

  const VenueCard = ({ venue }: { venue: Venue }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-all">
        <div className="relative">
          <div
            className="h-48 bg-cover bg-center bg-gray-200"
            style={{ backgroundImage: `url(${venue.images[0]})` }}
          />
          <div className="absolute top-3 left-3">
            <Badge className="bg-green-600 font-semibold">
              {venue.styleMatch}% Match
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 bg-white/90 hover:bg-white"
            onClick={() => toggleSaved(venue.id)}
          >
            <Heart
              className={cn(
                'h-4 w-4',
                savedItems.includes(venue.id)
                  ? 'fill-red-500 text-red-500'
                  : 'text-gray-600',
              )}
            />
          </Button>
        </div>

        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{venue.name}</CardTitle>
              <p className="text-sm text-gray-600 flex items-center space-x-1">
                <MapPin className="h-3 w-3" />
                <span>{venue.location}</span>
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{venue.rating}</span>
                <span className="text-sm text-gray-500">
                  ({venue.reviewCount})
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-700">
                {venue.priceRange}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">{venue.description}</p>

          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Capacity:</span>{' '}
              {venue.capacity.min}-{venue.capacity.max} guests
            </div>
            <div className="flex flex-wrap gap-1">
              {venue.features.slice(0, 3).map((feature) => (
                <Badge key={feature} variant="secondary" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex space-x-2">
            <Button size="sm" className="flex-1">
              View Details
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const VendorCard = ({ vendor }: { vendor: Vendor }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-all">
        <div className="relative">
          <div
            className="h-40 bg-cover bg-center bg-gray-200"
            style={{ backgroundImage: `url(${vendor.image})` }}
          />
          <div className="absolute top-3 left-3">
            <Badge className="bg-green-600 font-semibold">
              {vendor.styleMatch}% Match
            </Badge>
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-lg">{vendor.name}</h3>
            <p className="text-sm text-purple-600 font-medium">
              {vendor.category}
            </p>
            <p className="text-sm text-gray-600">{vendor.specialty}</p>
          </div>

          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center space-x-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{vendor.rating}</span>
              <span className="text-gray-500">({vendor.reviewCount})</span>
            </div>
            <span className="font-semibold text-gray-700">
              {vendor.priceRange}
            </span>
          </div>

          <p className="text-sm text-gray-600">{vendor.description}</p>

          <div className="flex space-x-2">
            <Button size="sm" className="flex-1">
              View Portfolio
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="text-2xl font-bold text-gray-900">
            Your Curated Matches
          </h3>
          <p className="text-gray-600">
            Based on your style preferences and color palette
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center space-x-8 text-center"
        >
          <div>
            <p className="text-2xl font-bold text-purple-600">
              {filteredVenues.length}
            </p>
            <p className="text-sm text-gray-600">Venues Found</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">
              {filteredVendors.length}
            </p>
            <p className="text-sm text-gray-600">Vendors Found</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">95%</p>
            <p className="text-sm text-gray-600">Avg Match</p>
          </div>
        </motion.div>
      </div>

      {/* Search */}
      <div className="flex justify-center">
        <Input
          placeholder="Search venues and vendors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Results */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="venues" className="flex items-center space-x-2">
            <span>Venues</span>
            <Badge variant="secondary">{filteredVenues.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="vendors" className="flex items-center space-x-2">
            <span>Vendors</span>
            <Badge variant="secondary">{filteredVendors.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="venues" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredVenues.map((venue) => (
                <VenueCard key={venue.id} venue={venue} />
              ))}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredVendors.map((vendor) => (
                <VendorCard key={vendor.id} vendor={vendor} />
              ))}
            </AnimatePresence>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default StyleMatchResults;
