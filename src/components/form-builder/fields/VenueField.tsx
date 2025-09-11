'use client';

import React, { useState } from 'react';
import {
  MapPin,
  Building,
  Camera,
  Users,
  Car,
  Wifi,
  Music,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WeddingFormField } from '@/types/form-builder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VenueFieldProps {
  field: WeddingFormField;
  value?: {
    ceremony_venue?: {
      name?: string;
      address?: string;
      venue_type?: string;
      contact_person?: string;
      contact_phone?: string;
      contact_email?: string;
    };
    reception_venue?: {
      name?: string;
      address?: string;
      venue_type?: string;
      contact_person?: string;
      contact_phone?: string;
      contact_email?: string;
    };
    same_venue?: boolean;
    venue_features?: string[];
    guest_capacity?: number;
    parking_available?: boolean;
    accessibility_features?: string[];
    venue_restrictions?: string;
    backup_venue?: string;
    venue_coordinator?: {
      name?: string;
      phone?: string;
      email?: string;
    };
  };
  error?: string;
  onChange: (value: any) => void;
  disabled?: boolean;
}

/**
 * VenueField - Specialized venue information component
 *
 * Features:
 * - Separate ceremony and reception venue details
 * - Venue type categorization (church, garden, ballroom, etc.)
 * - Venue features and amenities tracking
 * - Contact information management
 * - Accessibility and parking considerations
 * - Photography-friendly venue assessments
 * - Venue restrictions and requirements
 */
export function VenueField({
  field,
  value = {},
  error,
  onChange,
  disabled = false,
}: VenueFieldProps) {
  const [activeTab, setActiveTab] = useState('ceremony');

  // Common venue types
  const venueTypes = [
    {
      value: 'church',
      label: '⛪ Church/Chapel',
      photography: 'Limited flash, natural light',
    },
    {
      value: 'garden',
      label: '🌳 Garden/Outdoor',
      photography: 'Weather dependent, golden hour',
    },
    {
      value: 'ballroom',
      label: '🏛️ Ballroom/Hotel',
      photography: 'Controlled lighting, spacious',
    },
    {
      value: 'beach',
      label: '🏖️ Beach/Waterfront',
      photography: 'Wind considerations, sunset shots',
    },
    {
      value: 'barn',
      label: '🏚️ Barn/Rustic',
      photography: 'Dim lighting, rustic charm',
    },
    {
      value: 'winery',
      label: '🍇 Winery/Vineyard',
      photography: 'Scenic backgrounds, golden hour',
    },
    {
      value: 'mansion',
      label: '🏰 Historic/Mansion',
      photography: 'Elegant architecture, varied lighting',
    },
    {
      value: 'restaurant',
      label: '🍽️ Restaurant/Private Dining',
      photography: 'Intimate setting, ambient light',
    },
    {
      value: 'park',
      label: '🌲 Park/Public Space',
      photography: 'Natural light, permit required',
    },
    {
      value: 'rooftop',
      label: '🏢 Rooftop/Urban',
      photography: 'City views, wind considerations',
    },
  ];

  // Common venue features
  const venueFeatures = [
    'Bridal Suite',
    "Groom's Suite",
    'Kitchen Facilities',
    'Bar Service',
    'Dance Floor',
    'Stage/Platform',
    'Sound System',
    'Lighting System',
    'Air Conditioning',
    'Heating',
    'Restrooms',
    'Coat Check',
    'Garden/Outdoor Space',
    'Ceremony Space',
    'Cocktail Area',
    'Photo Opportunities',
  ];

  // Accessibility features
  const accessibilityFeatures = [
    'Wheelchair Accessible',
    'Accessible Parking',
    'Accessible Restrooms',
    'Elevator Access',
    'Ramp Access',
    'Wide Doorways',
    'Accessible Seating',
    'Sign Language Interpreter Available',
    'Hearing Loop System',
  ];

  // Handle field changes
  const handleFieldChange = (section: string, field: string, newValue: any) => {
    onChange({
      ...value,
      [section]: {
        ...value[section as keyof typeof value],
        [field]: newValue,
      },
    });
  };

  // Handle same venue toggle
  const handleSameVenueChange = (isSame: boolean) => {
    if (isSame) {
      onChange({
        ...value,
        same_venue: true,
        reception_venue: { ...value.ceremony_venue },
      });
    } else {
      onChange({
        ...value,
        same_venue: false,
        reception_venue: {},
      });
    }
  };

  // Handle array field changes (features, accessibility)
  const handleArrayFieldChange = (
    fieldName: string,
    item: string,
    checked: boolean,
  ) => {
    const currentArray =
      (value[fieldName as keyof typeof value] as string[]) || [];
    if (checked) {
      onChange({
        ...value,
        [fieldName]: [...currentArray, item],
      });
    } else {
      onChange({
        ...value,
        [fieldName]: currentArray.filter((i) => i !== item),
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Field Label */}
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-blue-500" />
        <Label className="text-base font-medium">
          {field.label}
          {field.validation?.required && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </Label>
      </div>

      {/* Field Description */}
      {field.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {field.description}
        </p>
      )}

      {/* Wedding Context Help */}
      {field.weddingContext?.helpText && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <Building className="w-4 h-4" />
            {field.weddingContext.helpText}
          </p>
        </div>
      )}

      {/* Same Venue Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium">
              Same location for ceremony and reception?
            </Label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Many venues offer both ceremony and reception spaces
            </p>
          </div>
          <Switch
            checked={value.same_venue || false}
            onCheckedChange={handleSameVenueChange}
            disabled={disabled}
          />
        </div>
      </Card>

      {/* Venue Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ceremony" className="flex items-center gap-2">
            ⛪ Ceremony
          </TabsTrigger>
          <TabsTrigger value="reception" className="flex items-center gap-2">
            🎉 Reception
          </TabsTrigger>
        </TabsList>

        {/* Ceremony Venue Tab */}
        <TabsContent value="ceremony" className="space-y-4 mt-4">
          <Card className="p-4">
            <Label className="text-sm font-medium mb-3 block">
              Ceremony Venue Details
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                  Venue Name
                </Label>
                <Input
                  value={value.ceremony_venue?.name || ''}
                  onChange={(e) =>
                    handleFieldChange('ceremony_venue', 'name', e.target.value)
                  }
                  placeholder="St. Mary's Church"
                  disabled={disabled}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                  Venue Type
                </Label>
                <Select
                  value={value.ceremony_venue?.venue_type || ''}
                  onValueChange={(type) =>
                    handleFieldChange('ceremony_venue', 'venue_type', type)
                  }
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select venue type" />
                  </SelectTrigger>
                  <SelectContent>
                    {venueTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex flex-col">
                          <span>{type.label}</span>
                          <span className="text-xs text-gray-500">
                            📸 {type.photography}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4">
              <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                Address
              </Label>
              <Textarea
                value={value.ceremony_venue?.address || ''}
                onChange={(e) =>
                  handleFieldChange('ceremony_venue', 'address', e.target.value)
                }
                placeholder="123 Wedding Lane, City, State 12345"
                rows={2}
                disabled={disabled}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                  Contact Person
                </Label>
                <Input
                  value={value.ceremony_venue?.contact_person || ''}
                  onChange={(e) =>
                    handleFieldChange(
                      'ceremony_venue',
                      'contact_person',
                      e.target.value,
                    )
                  }
                  placeholder="Event Coordinator"
                  disabled={disabled}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                  Phone
                </Label>
                <Input
                  type="tel"
                  value={value.ceremony_venue?.contact_phone || ''}
                  onChange={(e) =>
                    handleFieldChange(
                      'ceremony_venue',
                      'contact_phone',
                      e.target.value,
                    )
                  }
                  placeholder="(555) 123-4567"
                  disabled={disabled}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                  Email
                </Label>
                <Input
                  type="email"
                  value={value.ceremony_venue?.contact_email || ''}
                  onChange={(e) =>
                    handleFieldChange(
                      'ceremony_venue',
                      'contact_email',
                      e.target.value,
                    )
                  }
                  placeholder="events@venue.com"
                  disabled={disabled}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Reception Venue Tab */}
        <TabsContent value="reception" className="space-y-4 mt-4">
          {value.same_venue ? (
            <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <Building className="w-4 h-4" />
                <span className="font-medium">Same as ceremony venue</span>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Reception details will match ceremony venue information
              </p>
            </Card>
          ) : (
            <Card className="p-4">
              <Label className="text-sm font-medium mb-3 block">
                Reception Venue Details
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                    Venue Name
                  </Label>
                  <Input
                    value={value.reception_venue?.name || ''}
                    onChange={(e) =>
                      handleFieldChange(
                        'reception_venue',
                        'name',
                        e.target.value,
                      )
                    }
                    placeholder="Grand Ballroom Hotel"
                    disabled={disabled}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                    Venue Type
                  </Label>
                  <Select
                    value={value.reception_venue?.venue_type || ''}
                    onValueChange={(type) =>
                      handleFieldChange('reception_venue', 'venue_type', type)
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select venue type" />
                    </SelectTrigger>
                    <SelectContent>
                      {venueTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex flex-col">
                            <span>{type.label}</span>
                            <span className="text-xs text-gray-500">
                              📸 {type.photography}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4">
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                  Address
                </Label>
                <Textarea
                  value={value.reception_venue?.address || ''}
                  onChange={(e) =>
                    handleFieldChange(
                      'reception_venue',
                      'address',
                      e.target.value,
                    )
                  }
                  placeholder="456 Reception Road, City, State 12345"
                  rows={2}
                  disabled={disabled}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                    Contact Person
                  </Label>
                  <Input
                    value={value.reception_venue?.contact_person || ''}
                    onChange={(e) =>
                      handleFieldChange(
                        'reception_venue',
                        'contact_person',
                        e.target.value,
                      )
                    }
                    placeholder="Banquet Manager"
                    disabled={disabled}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                    Phone
                  </Label>
                  <Input
                    type="tel"
                    value={value.reception_venue?.contact_phone || ''}
                    onChange={(e) =>
                      handleFieldChange(
                        'reception_venue',
                        'contact_phone',
                        e.target.value,
                      )
                    }
                    placeholder="(555) 987-6543"
                    disabled={disabled}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                    Email
                  </Label>
                  <Input
                    type="email"
                    value={value.reception_venue?.contact_email || ''}
                    onChange={(e) =>
                      handleFieldChange(
                        'reception_venue',
                        'contact_email',
                        e.target.value,
                      )
                    }
                    placeholder="banquets@hotel.com"
                    disabled={disabled}
                  />
                </div>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Venue Features */}
      <Card className="p-4">
        <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
          <Building className="w-4 h-4" />
          Venue Features & Amenities
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {venueFeatures.map((feature) => (
            <label
              key={feature}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <input
                type="checkbox"
                checked={(value.venue_features || []).includes(feature)}
                onChange={(e) =>
                  handleArrayFieldChange(
                    'venue_features',
                    feature,
                    e.target.checked,
                  )
                }
                disabled={disabled}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs">{feature}</span>
            </label>
          ))}
        </div>
      </Card>

      {/* Capacity and Logistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
            <Users className="w-4 h-4" />
            Guest Capacity
          </Label>
          <Input
            type="number"
            value={value.guest_capacity || ''}
            onChange={(e) =>
              onChange({
                ...value,
                guest_capacity: parseInt(e.target.value) || 0,
              })
            }
            placeholder="150"
            disabled={disabled}
          />
        </Card>

        <Card className="p-4">
          <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
            <Car className="w-4 h-4" />
            Parking Available
          </Label>
          <div className="flex items-center gap-2 mt-2">
            <Switch
              checked={value.parking_available || false}
              onCheckedChange={(checked) =>
                onChange({ ...value, parking_available: checked })
              }
              disabled={disabled}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {value.parking_available
                ? 'Yes, parking available'
                : 'No parking or limited'}
            </span>
          </div>
        </Card>
      </div>

      {/* Accessibility Features */}
      <Card className="p-4">
        <Label className="text-sm font-medium mb-3 block">
          Accessibility Features
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {accessibilityFeatures.map((feature) => (
            <label
              key={feature}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <input
                type="checkbox"
                checked={(value.accessibility_features || []).includes(feature)}
                onChange={(e) =>
                  handleArrayFieldChange(
                    'accessibility_features',
                    feature,
                    e.target.checked,
                  )
                }
                disabled={disabled}
                className="rounded text-green-600 focus:ring-green-500"
              />
              <span className="text-xs">{feature}</span>
            </label>
          ))}
        </div>
      </Card>

      {/* Venue Restrictions */}
      <Card className="p-4">
        <Label className="text-sm font-medium mb-3 block">
          Venue Restrictions & Requirements
        </Label>
        <Textarea
          value={value.venue_restrictions || ''}
          onChange={(e) =>
            onChange({ ...value, venue_restrictions: e.target.value })
          }
          placeholder="No outside catering, music must end by 10 PM, no confetti or rice, etc."
          rows={3}
          disabled={disabled}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Include any rules, restrictions, or special requirements from the
          venue
        </p>
      </Card>

      {/* Photography Tips */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
          <Camera className="w-4 h-4" />
          Photography Considerations
        </h4>
        <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
          <li>
            • Outdoor venues: Consider weather backup plans and lighting
            conditions
          </li>
          <li>
            • Indoor venues: Check flash photography restrictions and available
            lighting
          </li>
          <li>
            • Historic venues: May have photography restrictions or require
            permits
          </li>
          <li>
            • Religious venues: Often have specific photography guidelines
            during ceremonies
          </li>
          <li>
            • Scout the venue beforehand to identify the best photo locations
          </li>
        </ul>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}

export default VenueField;
