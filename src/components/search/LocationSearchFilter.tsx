'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card-untitled';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  MapPin,
  Navigation,
  Target,
  Search,
  X,
  Map,
  Locate,
  Globe,
  Building,
  Home,
  Car,
  Train,
  Plane,
  Clock,
  Compass,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface LocationData {
  city?: string;
  region?: string;
  radius?: number;
  coordinates?: [number, number];
  country?: string;
  postcode?: string;
  landmark?: string;
  travelMode?: 'driving' | 'walking' | 'transit';
}

interface LocationSearchFilterProps {
  location: LocationData;
  onChange: (location: LocationData) => void;
  className?: string;
  compact?: boolean;
  showMap?: boolean;
  allowCurrentLocation?: boolean;
}

interface LocationSuggestion {
  id: string;
  name: string;
  type: 'city' | 'region' | 'postcode' | 'landmark' | 'venue';
  fullName: string;
  coordinates: [number, number];
  region?: string;
  country: string;
  distance?: number;
  venueCount?: number;
}

const POPULAR_LOCATIONS: LocationSuggestion[] = [
  {
    id: 'london',
    name: 'London',
    type: 'city',
    fullName: 'London, England',
    coordinates: [51.5074, -0.1278],
    region: 'Greater London',
    country: 'United Kingdom',
    venueCount: 2456,
  },
  {
    id: 'birmingham',
    name: 'Birmingham',
    type: 'city',
    fullName: 'Birmingham, England',
    coordinates: [52.4862, -1.8904],
    region: 'West Midlands',
    country: 'United Kingdom',
    venueCount: 1234,
  },
  {
    id: 'manchester',
    name: 'Manchester',
    type: 'city',
    fullName: 'Manchester, England',
    coordinates: [53.4808, -2.2426],
    region: 'Greater Manchester',
    country: 'United Kingdom',
    venueCount: 987,
  },
  {
    id: 'leeds',
    name: 'Leeds',
    type: 'city',
    fullName: 'Leeds, England',
    coordinates: [53.8008, -1.5491],
    region: 'West Yorkshire',
    country: 'United Kingdom',
    venueCount: 756,
  },
  {
    id: 'bristol',
    name: 'Bristol',
    type: 'city',
    fullName: 'Bristol, England',
    coordinates: [51.4545, -2.5879],
    region: 'South West England',
    country: 'United Kingdom',
    venueCount: 634,
  },
  {
    id: 'edinburgh',
    name: 'Edinburgh',
    type: 'city',
    fullName: 'Edinburgh, Scotland',
    coordinates: [55.9533, -3.1883],
    region: 'Scotland',
    country: 'United Kingdom',
    venueCount: 587,
  },
  {
    id: 'glasgow',
    name: 'Glasgow',
    type: 'city',
    fullName: 'Glasgow, Scotland',
    coordinates: [55.8642, -4.2518],
    region: 'Scotland',
    country: 'United Kingdom',
    venueCount: 492,
  },
  {
    id: 'liverpool',
    name: 'Liverpool',
    type: 'city',
    fullName: 'Liverpool, England',
    coordinates: [53.4084, -2.9916],
    region: 'North West England',
    country: 'United Kingdom',
    venueCount: 423,
  },
];

const UK_REGIONS = [
  'Greater London',
  'West Midlands',
  'Greater Manchester',
  'West Yorkshire',
  'South West England',
  'Scotland',
  'Wales',
  'North West England',
  'South East England',
  'East of England',
  'Yorkshire and the Humber',
  'North East England',
  'East Midlands',
  'Northern Ireland',
];

const TRAVEL_MODES = [
  { value: 'driving', label: 'Driving', icon: <Car className="w-4 h-4" /> },
  {
    value: 'walking',
    label: 'Walking',
    icon: <Navigation className="w-4 h-4" />,
  },
  {
    value: 'transit',
    label: 'Public Transport',
    icon: <Train className="w-4 h-4" />,
  },
];

const RADIUS_OPTIONS = [
  { value: 5, label: '5 miles' },
  { value: 10, label: '10 miles' },
  { value: 15, label: '15 miles' },
  { value: 25, label: '25 miles' },
  { value: 50, label: '50 miles' },
  { value: 100, label: '100 miles' },
];

export function LocationSearchFilter({
  location,
  onChange,
  className,
  compact = false,
  showMap = false,
  allowCurrentLocation = true,
}: LocationSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState<
    [number, number] | null
  >(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Mock geocoding function - replace with real service
  const searchLocations = async (
    query: string,
  ): Promise<LocationSuggestion[]> => {
    if (!query || query.length < 2) return [];

    // Mock search - in real implementation, use Google Places API or similar
    const filtered = POPULAR_LOCATIONS.filter(
      (loc) =>
        loc.name.toLowerCase().includes(query.toLowerCase()) ||
        loc.fullName.toLowerCase().includes(query.toLowerCase()) ||
        loc.region?.toLowerCase().includes(query.toLowerCase()),
    );

    // Add mock postcode results
    if (/^[A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2}$/i.test(query)) {
      filtered.unshift({
        id: `postcode-${query}`,
        name: query.toUpperCase(),
        type: 'postcode',
        fullName: `${query.toUpperCase()}, UK`,
        coordinates: [
          51.5074 + (Math.random() - 0.5) * 0.1,
          -0.1278 + (Math.random() - 0.5) * 0.1,
        ],
        country: 'United Kingdom',
        venueCount: Math.floor(Math.random() * 50) + 10,
      });
    }

    return filtered.slice(0, 8);
  };

  // Handle search input change
  const handleSearchChange = async (value: string) => {
    setSearchQuery(value);

    if (value.length >= 2) {
      const results = await searchLocations(value);
      setSuggestions(results);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle location selection
  const handleLocationSelect = (suggestion: LocationSuggestion) => {
    setSearchQuery(suggestion.fullName);
    setShowSuggestions(false);

    onChange({
      ...location,
      city: suggestion.name,
      region: suggestion.region,
      coordinates: suggestion.coordinates,
      postcode: suggestion.type === 'postcode' ? suggestion.name : undefined,
    });
  };

  // Get user's current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];

        setCurrentUserLocation(coords);
        setSearchQuery('Current Location');

        onChange({
          ...location,
          city: 'Current Location',
          coordinates: coords,
          region: undefined,
          postcode: undefined,
        });

        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your location. Please search manually.');
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000, // 10 minutes
      },
    );
  };

  // Handle radius change
  const handleRadiusChange = (radius: number) => {
    onChange({
      ...location,
      radius,
    });
  };

  // Handle travel mode change
  const handleTravelModeChange = (
    travelMode: 'driving' | 'walking' | 'transit',
  ) => {
    onChange({
      ...location,
      travelMode,
    });
  };

  // Clear location
  const clearLocation = () => {
    setSearchQuery('');
    onChange({
      city: undefined,
      region: undefined,
      radius: undefined,
      coordinates: undefined,
      postcode: undefined,
      travelMode: 'driving',
    });
  };

  // Format current location display
  const getLocationDisplay = () => {
    if (location.city) {
      const parts = [location.city];
      if (location.region && location.region !== location.city) {
        parts.push(location.region);
      }
      return parts.join(', ');
    }
    return '';
  };

  return (
    <Card className={cn('space-y-4', className)}>
      <CardHeader className={cn('pb-3', compact && 'pb-2')}>
        <CardTitle
          className={cn(
            'text-base flex items-center space-x-2',
            compact && 'text-sm',
          )}
        >
          <MapPin className="w-4 h-4" />
          <span>Location</span>
          {location.city && (
            <Badge variant="secondary" className="text-xs">
              {location.radius ? `${location.radius}mi radius` : 'Selected'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Location Search */}
        <div className="relative">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              ref={inputRef}
              placeholder="Enter city, postcode, or location..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onBlur={() => {
                // Delay to allow click on suggestions
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              className="pl-10 pr-10"
            />

            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearLocation}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1 h-auto"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Location Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto">
              <CardContent className="p-0">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors border-b last:border-b-0"
                    onClick={() => handleLocationSelect(suggestion)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {suggestion.type === 'city' && (
                          <Building className="w-4 h-4 text-blue-500" />
                        )}
                        {suggestion.type === 'region' && (
                          <Globe className="w-4 h-4 text-green-500" />
                        )}
                        {suggestion.type === 'postcode' && (
                          <Home className="w-4 h-4 text-purple-500" />
                        )}
                        {suggestion.type === 'landmark' && (
                          <MapPin className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {suggestion.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {suggestion.fullName}
                        </div>
                      </div>
                    </div>
                    {suggestion.venueCount && (
                      <div className="text-xs text-gray-400">
                        {suggestion.venueCount} venues
                      </div>
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Current Location Button */}
        {allowCurrentLocation && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className="flex items-center space-x-2"
            >
              {isGettingLocation ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full" />
                  <span>Getting location...</span>
                </>
              ) : (
                <>
                  <Locate className="w-4 h-4" />
                  <span>Use Current Location</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* Popular Locations */}
        {!location.city && !compact && (
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Popular Locations
            </Label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_LOCATIONS.slice(0, 6).map((loc) => (
                <Button
                  key={loc.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleLocationSelect(loc)}
                  className="text-xs"
                >
                  {loc.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Current Selection */}
        {location.city && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">
                  {getLocationDisplay()}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearLocation}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {location.coordinates && (
              <div className="text-xs text-blue-700">
                Lat: {location.coordinates[0].toFixed(4)}, Lng:{' '}
                {location.coordinates[1].toFixed(4)}
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Distance/Radius Settings */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Search Radius</Label>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  Within {location.radius || 25} miles
                </span>
                <span className="text-xs text-gray-500">
                  {location.travelMode === 'driving' && '🚗 Driving'}
                  {location.travelMode === 'walking' && '🚶 Walking'}
                  {location.travelMode === 'transit' && '🚌 Transit'}
                </span>
              </div>

              <Slider
                value={[location.radius || 25]}
                onValueChange={([value]) => handleRadiusChange(value)}
                max={100}
                min={5}
                step={5}
                className="w-full"
              />

              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>5 miles</span>
                <span>100 miles</span>
              </div>
            </div>

            {/* Quick Radius Options */}
            <div className="flex flex-wrap gap-2">
              {RADIUS_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={
                    location.radius === option.value ? 'default' : 'outline'
                  }
                  size="sm"
                  onClick={() => handleRadiusChange(option.value)}
                  className="text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced Options */}
        <div>
          <Button
            variant="ghost"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 p-0 h-auto text-sm"
          >
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span>Advanced Options</span>
          </Button>

          {showAdvanced && (
            <div className="mt-3 space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Travel Method
                </Label>
                <div className="flex space-x-2">
                  {TRAVEL_MODES.map((mode) => (
                    <Button
                      key={mode.value}
                      variant={
                        location.travelMode === mode.value
                          ? 'default'
                          : 'outline'
                      }
                      size="sm"
                      onClick={() => handleTravelModeChange(mode.value as any)}
                      className="flex items-center space-x-2"
                    >
                      {mode.icon}
                      <span>{mode.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Region Filter */}
              <div>
                <Label htmlFor="region-select" className="text-sm font-medium">
                  Filter by Region (optional)
                </Label>
                <Select
                  value={location.region || ''}
                  onValueChange={(value) =>
                    onChange({
                      ...location,
                      region: value || undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any region</SelectItem>
                    {UK_REGIONS.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Map Placeholder */}
        {showMap && location.coordinates && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Map className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              Interactive map would be displayed here
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Showing {location.radius || 25} mile radius around {location.city}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LocationSearchFilter;
