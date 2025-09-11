'use client';

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  MapPin,
  Search,
  Star,
  Users,
  Car,
  Wine,
  Utensils,
  Camera,
  Music,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Heart,
  Phone,
  Mail,
  Globe,
  Calendar,
  Pound,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock venue data (in real app would come from API/database)
const MOCK_VENUES = [
  {
    id: '1',
    name: 'The Grand Manor House',
    type: 'Historic Manor',
    location: 'Cotswolds, Oxfordshire',
    address: 'Manor House Lane, Chipping Norton, OX7 5NH',
    capacity: { min: 50, max: 180 },
    priceRange: { min: 4000, max: 8000 },
    rating: 4.8,
    reviewCount: 127,
    features: [
      'Garden Ceremony',
      'Licensed Bar',
      'Bridal Suite',
      'Parking',
      'Catering Kitchen',
      'Dance Floor',
    ],
    images: ['/venues/manor1.jpg', '/venues/manor2.jpg'],
    description:
      'A stunning Cotswold stone manor house set in 12 acres of landscaped gardens...',
    contact: {
      phone: '01608 123456',
      email: 'events@grandmanor.co.uk',
      website: 'www.grandmanorweddings.co.uk',
    },
    availability: ['2025-06-15', '2025-07-20', '2025-08-10'],
    ceremonies: ['Civil Ceremony', 'Blessing', 'Outdoor Ceremony'],
    catering: ['In-house', 'Approved Suppliers'],
    accommodation: true,
  },
  {
    id: '2',
    name: 'Riverside Barn',
    type: 'Rustic Barn',
    location: 'Surrey',
    address: 'Mill Lane, Dorking, Surrey, RH5 4EW',
    capacity: { min: 40, max: 120 },
    priceRange: { min: 2500, max: 5000 },
    rating: 4.6,
    reviewCount: 89,
    features: [
      'Riverside Setting',
      'Rustic Charm',
      'Exclusive Use',
      'Parking',
      'Getting Ready Space',
    ],
    images: ['/venues/barn1.jpg', '/venues/barn2.jpg'],
    description:
      'A beautifully restored barn with original oak beams and riverside views...',
    contact: {
      phone: '01306 987654',
      email: 'hello@riversidebarn.co.uk',
      website: 'www.riversidebarnweddings.co.uk',
    },
    availability: ['2025-05-18', '2025-09-12', '2025-10-05'],
    ceremonies: ['Blessing', 'Outdoor Ceremony'],
    catering: ['Approved Suppliers Only'],
    accommodation: false,
  },
  {
    id: '3',
    name: 'City Rooftop Gardens',
    type: 'Modern Venue',
    location: 'London',
    address: '25 Skyline Building, London, EC2A 4DP',
    capacity: { min: 30, max: 90 },
    priceRange: { min: 5000, max: 12000 },
    rating: 4.9,
    reviewCount: 156,
    features: [
      'City Views',
      'Rooftop Garden',
      'Modern Facilities',
      'Licensed Bar',
      'Climate Control',
    ],
    images: ['/venues/rooftop1.jpg', '/venues/rooftop2.jpg'],
    description:
      'Stunning rooftop venue with panoramic city views and contemporary style...',
    contact: {
      phone: '020 7123 4567',
      email: 'events@cityrooftop.london',
      website: 'www.cityrooftopgardens.london',
    },
    availability: ['2025-04-12', '2025-08-22', '2025-11-15'],
    ceremonies: ['Civil Ceremony', 'Blessing'],
    catering: ['In-house', 'Approved Suppliers'],
    accommodation: false,
  },
];

// Venue selection schema
const venueSelectionSchema = z.object({
  selectedVenueId: z.string().min(1, 'Please select a venue'),
  ceremonyType: z.string().optional(),
  guestCount: z.coerce
    .number()
    .min(1, 'Guest count is required')
    .max(500, 'Maximum 500 guests'),
  budget: z.coerce.number().min(100, 'Budget must be at least £100'),
  preferredDates: z
    .array(z.string())
    .min(1, 'Select at least one preferred date'),
  additionalRequirements: z.string().optional(),
  cateringPreference: z.string().optional(),
  needsAccommodation: z.boolean().default(false),
  accessibilityRequirements: z.string().optional(),
  contactNotes: z.string().optional(),
});

type VenueSelectionForm = z.infer<typeof venueSelectionSchema>;

interface VenueSelectorProps {
  onSelect: (data: VenueSelectionForm & { venue: any }) => void;
  initialFilters?: {
    location?: string;
    maxGuests?: number;
    budget?: number;
    venueType?: string;
  };
  className?: string;
}

interface VenueFilters {
  location: string;
  venueType: string;
  minCapacity: number;
  maxBudget: number;
  features: string[];
  ceremonyTypes: string[];
}

export function VenueSelector({
  onSelect,
  initialFilters = {},
  className,
}: VenueSelectorProps) {
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [filters, setFilters] = useState<VenueFilters>({
    location: initialFilters.location || '',
    venueType: '',
    minCapacity: initialFilters.maxGuests || 0,
    maxBudget: initialFilters.budget || 15000,
    features: [],
    ceremonyTypes: [],
  });

  const form = useForm<VenueSelectionForm>({
    resolver: zodResolver(venueSelectionSchema),
    defaultValues: {
      selectedVenueId: '',
      ceremonyType: '',
      guestCount: initialFilters.maxGuests || 80,
      budget: initialFilters.budget || 6000,
      preferredDates: [],
      additionalRequirements: '',
      cateringPreference: '',
      needsAccommodation: false,
      accessibilityRequirements: '',
      contactNotes: '',
    },
    mode: 'onChange',
  });

  // Filter venues based on search and filters
  const filteredVenues = useMemo(() => {
    let venues = MOCK_VENUES;

    // Search filter
    if (searchQuery) {
      venues = venues.filter(
        (venue) =>
          venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          venue.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          venue.type.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Capacity filter
    if (filters.minCapacity > 0) {
      venues = venues.filter(
        (venue) => venue.capacity.max >= filters.minCapacity,
      );
    }

    // Budget filter
    if (filters.maxBudget > 0) {
      venues = venues.filter(
        (venue) => venue.priceRange.min <= filters.maxBudget,
      );
    }

    // Location filter
    if (filters.location) {
      venues = venues.filter((venue) =>
        venue.location.toLowerCase().includes(filters.location.toLowerCase()),
      );
    }

    // Venue type filter
    if (filters.venueType) {
      venues = venues.filter((venue) => venue.type === filters.venueType);
    }

    // Features filter
    if (filters.features.length > 0) {
      venues = venues.filter((venue) =>
        filters.features.every((feature) => venue.features.includes(feature)),
      );
    }

    return venues;
  }, [searchQuery, filters]);

  const handleVenueSelect = (venue: any) => {
    setSelectedVenue(venue);
    form.setValue('selectedVenueId', venue.id);
  };

  const handleSubmit = form.handleSubmit((data) => {
    if (selectedVenue) {
      onSelect({ ...data, venue: selectedVenue });
    }
  });

  const toggleFeatureFilter = (feature: string) => {
    setFilters((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const clearFilters = () => {
    setFilters({
      location: '',
      venueType: '',
      minCapacity: 0,
      maxBudget: 15000,
      features: [],
      ceremonyTypes: [],
    });
    setSearchQuery('');
  };

  return (
    <div className={cn('max-w-7xl mx-auto p-6', className)}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Choose Your Perfect Venue
        </h1>
        <p className="text-lg text-gray-600">
          Find the ideal location for your special day
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-purple-600 hover:text-purple-700"
                >
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search */}
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search venues..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Location
                </label>
                <Input
                  placeholder="e.g., Cotswolds, London..."
                  value={filters.location}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Venue Type */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Venue Type
                </label>
                <Select
                  value={filters.venueType}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, venueType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any type</SelectItem>
                    <SelectItem value="Historic Manor">
                      Historic Manor
                    </SelectItem>
                    <SelectItem value="Rustic Barn">Rustic Barn</SelectItem>
                    <SelectItem value="Modern Venue">Modern Venue</SelectItem>
                    <SelectItem value="Hotel">Hotel</SelectItem>
                    <SelectItem value="Castle">Castle</SelectItem>
                    <SelectItem value="Garden Venue">Garden Venue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Guest Capacity */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Min Capacity: {filters.minCapacity} guests
                </label>
                <input
                  type="range"
                  min="0"
                  max="300"
                  value={filters.minCapacity}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      minCapacity: parseInt(e.target.value),
                    }))
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Budget Range */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Max Budget: £{filters.maxBudget.toLocaleString()}
                </label>
                <input
                  type="range"
                  min="1000"
                  max="15000"
                  step="500"
                  value={filters.maxBudget}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      maxBudget: parseInt(e.target.value),
                    }))
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Features */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Features
                </label>
                <div className="space-y-2">
                  {[
                    'Licensed Bar',
                    'Garden Ceremony',
                    'Parking',
                    'Accommodation',
                    'Catering Kitchen',
                    'Dance Floor',
                    'Bridal Suite',
                  ].map((feature) => (
                    <div key={feature} className="flex items-center space-x-2">
                      <Checkbox
                        id={feature}
                        checked={filters.features.includes(feature)}
                        onCheckedChange={() => toggleFeatureFilter(feature)}
                      />
                      <label
                        htmlFor={feature}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {feature}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="text-sm text-gray-600">
                <p>
                  <strong>{filteredVenues.length}</strong> venues match your
                  criteria
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Venue Results */}
        <div className="lg:col-span-2">
          <div className="space-y-6">
            {filteredVenues.map((venue) => (
              <Card
                key={venue.id}
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:shadow-lg border-2',
                  selectedVenue?.id === venue.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-transparent hover:border-purple-200',
                )}
                onClick={() => handleVenueSelect(venue)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {venue.name}
                        </h3>
                        {selectedVenue?.id === venue.id && (
                          <CheckCircle2 className="w-6 h-6 text-purple-600" />
                        )}
                      </div>
                      <p className="text-gray-600 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {venue.location}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 mb-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="font-medium">{venue.rating}</span>
                        <span className="text-gray-500 text-sm">
                          ({venue.reviewCount})
                        </span>
                      </div>
                      <Badge variant="secondary">{venue.type}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>
                        {venue.capacity.min}-{venue.capacity.max} guests
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Pound className="w-4 h-4" />
                      <span>
                        £{venue.priceRange.min.toLocaleString()} - £
                        {venue.priceRange.max.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{venue.contact.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{venue.availability.length} dates available</span>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-4">{venue.description}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {venue.features.slice(0, 6).map((feature) => (
                      <Badge
                        key={feature}
                        variant="outline"
                        className="text-xs"
                      >
                        {feature}
                      </Badge>
                    ))}
                    {venue.features.length > 6 && (
                      <Badge variant="outline" className="text-xs">
                        +{venue.features.length - 6} more
                      </Badge>
                    )}
                  </div>

                  {selectedVenue?.id === venue.id && (
                    <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <Form {...form}>
                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="guestCount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Guest Count</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={venue.capacity.min}
                                      max={venue.capacity.max}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Capacity: {venue.capacity.min}-
                                    {venue.capacity.max} guests
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="budget"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Budget</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                        £
                                      </span>
                                      <Input
                                        type="number"
                                        min={venue.priceRange.min}
                                        className="pl-8"
                                        {...field}
                                      />
                                    </div>
                                  </FormControl>
                                  <FormDescription>
                                    Venue range: £
                                    {venue.priceRange.min.toLocaleString()} - £
                                    {venue.priceRange.max.toLocaleString()}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="ceremonyType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ceremony Type</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select ceremony type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {venue.ceremonies.map(
                                        (ceremony: string) => (
                                          <SelectItem
                                            key={ceremony}
                                            value={ceremony}
                                          >
                                            {ceremony}
                                          </SelectItem>
                                        ),
                                      )}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="cateringPreference"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Catering Preference</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select catering option" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {venue.catering.map((option: string) => (
                                        <SelectItem key={option} value={option}>
                                          {option}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="additionalRequirements"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Additional Requirements</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Any special requirements or questions about this venue..."
                                    className="min-h-[80px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex items-center justify-between pt-4 border-t border-purple-200">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setSelectedVenue(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              Select This Venue
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {filteredVenues.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No venues found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Try adjusting your filters to see more results
                  </p>
                  <Button onClick={clearFilters} variant="outline">
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
