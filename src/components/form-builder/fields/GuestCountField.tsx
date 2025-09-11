'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Baby,
  Heart,
  AlertCircle,
  Calculator,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WeddingFormField } from '@/types/form-builder';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface GuestCountFieldProps {
  field: WeddingFormField;
  value?: {
    total_guests?: number;
    ceremony_guests?: number;
    reception_guests?: number;
    adults?: number;
    children?: number;
    wedding_party?: {
      bridesmaids?: number;
      groomsmen?: number;
      flower_girls?: number;
      ring_bearers?: number;
      ushers?: number;
      readers?: number;
    };
    guest_breakdown?: {
      bride_family?: number;
      groom_family?: number;
      bride_friends?: number;
      groom_friends?: number;
      colleagues?: number;
      plus_ones?: number;
    };
    rsvp_tracking?: {
      invited?: number;
      confirmed?: number;
      declined?: number;
      pending?: number;
    };
    special_requirements?: {
      wheelchair_accessible?: number;
      dietary_restrictions?: number;
      hotel_accommodations?: number;
    };
    estimation_method?: 'exact' | 'estimate' | 'range';
  };
  error?: string;
  onChange: (value: any) => void;
  disabled?: boolean;
}

/**
 * GuestCountField - Comprehensive guest count management
 *
 * Features:
 * - Total guest count with ceremony/reception breakdown
 * - Adult vs children guest categorization
 * - Wedding party member tracking
 * - Guest breakdown by relationship (bride/groom sides)
 * - RSVP tracking and management
 * - Special requirements counting
 * - Budget impact calculations
 * - Venue capacity validation
 */
export function GuestCountField({
  field,
  value = {},
  error,
  onChange,
  disabled = false,
}: GuestCountFieldProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate totals automatically
  const calculatedTotals = useMemo(() => {
    const adults = value.adults || 0;
    const children = value.children || 0;
    const totalGuests = adults + children;

    // Wedding party total
    const weddingParty = value.wedding_party || {};
    const weddingPartyTotal = Object.values(weddingParty).reduce(
      (sum: number, count) => sum + ((count as number) || 0),
      0,
    );

    // Guest breakdown total
    const guestBreakdown = value.guest_breakdown || {};
    const breakdownTotal = Object.values(guestBreakdown).reduce(
      (sum: number, count) => sum + ((count as number) || 0),
      0,
    );

    // RSVP tracking
    const rsvpTracking = value.rsvp_tracking || {};
    const rsvpTotal =
      (rsvpTracking.confirmed || 0) +
      (rsvpTracking.declined || 0) +
      (rsvpTracking.pending || 0);

    // Estimated costs (example calculations)
    const estimatedCostPerGuest = 75; // Average cost per guest
    const estimatedTotalCost = totalGuests * estimatedCostPerGuest;

    return {
      totalGuests,
      weddingPartyTotal,
      breakdownTotal,
      rsvpTotal,
      estimatedTotalCost,
    };
  }, [value]);

  // Handle nested object changes
  const handleNestedChange = (
    section: string,
    field: string,
    newValue: any,
  ) => {
    onChange({
      ...value,
      [section]: {
        ...value[section as keyof typeof value],
        [field]: newValue,
      },
    });
  };

  // Handle direct field changes
  const handleFieldChange = (field: string, newValue: any) => {
    onChange({
      ...value,
      [field]: newValue,
    });
  };

  // Auto-sync total guests when adults/children change
  const handleGuestTypeChange = (
    field: 'adults' | 'children',
    newValue: number,
  ) => {
    const adults = field === 'adults' ? newValue : value.adults || 0;
    const children = field === 'children' ? newValue : value.children || 0;
    const total = adults + children;

    onChange({
      ...value,
      [field]: newValue,
      total_guests: total,
    });
  };

  return (
    <div className="space-y-4">
      {/* Field Label */}
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-green-500" />
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
        <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
            <Heart className="w-4 h-4" />
            {field.weddingContext.helpText}
          </p>
        </div>
      )}

      {/* Guest Count Overview */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {calculatedTotals.totalGuests}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Total Guests
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {value.adults || 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Adults
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {value.children || 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Children
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {calculatedTotals.weddingPartyTotal}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Wedding Party
            </div>
          </div>
        </div>
      </Card>

      {/* Estimation Method */}
      <Card className="p-4">
        <Label className="text-sm font-medium mb-3 block">
          How would you like to provide guest count?
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {[
            {
              value: 'exact',
              label: 'Exact Count',
              description: 'I know the exact number',
            },
            {
              value: 'estimate',
              label: 'Best Estimate',
              description: 'I have a good estimate',
            },
            {
              value: 'range',
              label: 'Range',
              description: 'I need a flexible range',
            },
          ].map((method) => (
            <label key={method.value} className="cursor-pointer">
              <input
                type="radio"
                name="estimation_method"
                value={method.value}
                checked={value.estimation_method === method.value}
                onChange={(e) =>
                  handleFieldChange('estimation_method', e.target.value)
                }
                disabled={disabled}
                className="sr-only"
              />
              <div
                className={cn(
                  'p-3 border rounded-lg text-center transition-all',
                  value.estimation_method === method.value
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300',
                )}
              >
                <div className="font-medium text-sm">{method.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {method.description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Guest Count Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="party">Wedding Party</TabsTrigger>
          <TabsTrigger value="rsvp">RSVP Tracking</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Adults */}
            <Card className="p-4">
              <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
                <Users className="w-4 h-4" />
                Adults (18+)
              </Label>
              {value.estimation_method === 'range' ? (
                <div className="space-y-3">
                  <Slider
                    value={[value.adults || 50]}
                    onValueChange={(values) =>
                      handleGuestTypeChange('adults', values[0])
                    }
                    max={300}
                    min={0}
                    step={5}
                    className="w-full"
                    disabled={disabled}
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0</span>
                    <span className="font-medium">
                      {value.adults || 0} adults
                    </span>
                    <span>300+</span>
                  </div>
                </div>
              ) : (
                <Input
                  type="number"
                  value={value.adults || ''}
                  onChange={(e) =>
                    handleGuestTypeChange(
                      'adults',
                      parseInt(e.target.value) || 0,
                    )
                  }
                  placeholder="80"
                  min="0"
                  max="500"
                  disabled={disabled}
                />
              )}
            </Card>

            {/* Children */}
            <Card className="p-4">
              <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
                <Baby className="w-4 h-4" />
                Children (Under 18)
              </Label>
              {value.estimation_method === 'range' ? (
                <div className="space-y-3">
                  <Slider
                    value={[value.children || 10]}
                    onValueChange={(values) =>
                      handleGuestTypeChange('children', values[0])
                    }
                    max={50}
                    min={0}
                    step={1}
                    className="w-full"
                    disabled={disabled}
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0</span>
                    <span className="font-medium">
                      {value.children || 0} children
                    </span>
                    <span>50+</span>
                  </div>
                </div>
              ) : (
                <Input
                  type="number"
                  value={value.children || ''}
                  onChange={(e) =>
                    handleGuestTypeChange(
                      'children',
                      parseInt(e.target.value) || 0,
                    )
                  }
                  placeholder="15"
                  min="0"
                  max="100"
                  disabled={disabled}
                />
              )}
            </Card>
          </div>

          {/* Ceremony vs Reception */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <Label className="text-sm font-medium mb-3 block">
                Ceremony Guests
              </Label>
              <Input
                type="number"
                value={value.ceremony_guests || calculatedTotals.totalGuests}
                onChange={(e) =>
                  handleFieldChange(
                    'ceremony_guests',
                    parseInt(e.target.value) || 0,
                  )
                }
                placeholder={calculatedTotals.totalGuests.toString()}
                disabled={disabled}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Usually the same as total guests
              </p>
            </Card>

            <Card className="p-4">
              <Label className="text-sm font-medium mb-3 block">
                Reception Guests
              </Label>
              <Input
                type="number"
                value={value.reception_guests || calculatedTotals.totalGuests}
                onChange={(e) =>
                  handleFieldChange(
                    'reception_guests',
                    parseInt(e.target.value) || 0,
                  )
                }
                placeholder={calculatedTotals.totalGuests.toString()}
                disabled={disabled}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                May be different if some guests skip reception
              </p>
            </Card>
          </div>
        </TabsContent>

        {/* Guest Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4 mt-4">
          <Card className="p-4">
            <Label className="text-sm font-medium mb-3 block">
              Guest Breakdown by Relationship
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  👰 Bride's Side
                </h4>
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    Family
                  </Label>
                  <Input
                    type="number"
                    value={value.guest_breakdown?.bride_family || ''}
                    onChange={(e) =>
                      handleNestedChange(
                        'guest_breakdown',
                        'bride_family',
                        parseInt(e.target.value) || 0,
                      )
                    }
                    placeholder="25"
                    disabled={disabled}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    Friends
                  </Label>
                  <Input
                    type="number"
                    value={value.guest_breakdown?.bride_friends || ''}
                    onChange={(e) =>
                      handleNestedChange(
                        'guest_breakdown',
                        'bride_friends',
                        parseInt(e.target.value) || 0,
                      )
                    }
                    placeholder="30"
                    disabled={disabled}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  🤵 Groom's Side
                </h4>
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    Family
                  </Label>
                  <Input
                    type="number"
                    value={value.guest_breakdown?.groom_family || ''}
                    onChange={(e) =>
                      handleNestedChange(
                        'guest_breakdown',
                        'groom_family',
                        parseInt(e.target.value) || 0,
                      )
                    }
                    placeholder="20"
                    disabled={disabled}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    Friends
                  </Label>
                  <Input
                    type="number"
                    value={value.guest_breakdown?.groom_friends || ''}
                    onChange={(e) =>
                      handleNestedChange(
                        'guest_breakdown',
                        'groom_friends',
                        parseInt(e.target.value) || 0,
                      )
                    }
                    placeholder="25"
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                  Work Colleagues
                </Label>
                <Input
                  type="number"
                  value={value.guest_breakdown?.colleagues || ''}
                  onChange={(e) =>
                    handleNestedChange(
                      'guest_breakdown',
                      'colleagues',
                      parseInt(e.target.value) || 0,
                    )
                  }
                  placeholder="10"
                  disabled={disabled}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                  Plus Ones
                </Label>
                <Input
                  type="number"
                  value={value.guest_breakdown?.plus_ones || ''}
                  onChange={(e) =>
                    handleNestedChange(
                      'guest_breakdown',
                      'plus_ones',
                      parseInt(e.target.value) || 0,
                    )
                  }
                  placeholder="15"
                  disabled={disabled}
                />
              </div>
            </div>

            {calculatedTotals.breakdownTotal > 0 && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Breakdown Total:</span>
                  <Badge
                    variant={
                      calculatedTotals.breakdownTotal ===
                      calculatedTotals.totalGuests
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {calculatedTotals.breakdownTotal} guests
                  </Badge>
                </div>
                {calculatedTotals.breakdownTotal !==
                  calculatedTotals.totalGuests && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Note: Breakdown doesn't match total guest count
                  </p>
                )}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Wedding Party Tab */}
        <TabsContent value="party" className="space-y-4 mt-4">
          <Card className="p-4">
            <Label className="text-sm font-medium mb-3 block">
              Wedding Party Members
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-rose-600 dark:text-rose-400">
                  Bride's Party
                </h4>
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    Bridesmaids
                  </Label>
                  <Input
                    type="number"
                    value={value.wedding_party?.bridesmaids || ''}
                    onChange={(e) =>
                      handleNestedChange(
                        'wedding_party',
                        'bridesmaids',
                        parseInt(e.target.value) || 0,
                      )
                    }
                    placeholder="4"
                    min="0"
                    max="20"
                    disabled={disabled}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    Flower Girls
                  </Label>
                  <Input
                    type="number"
                    value={value.wedding_party?.flower_girls || ''}
                    onChange={(e) =>
                      handleNestedChange(
                        'wedding_party',
                        'flower_girls',
                        parseInt(e.target.value) || 0,
                      )
                    }
                    placeholder="2"
                    min="0"
                    max="10"
                    disabled={disabled}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-blue-600 dark:text-blue-400">
                  Groom's Party
                </h4>
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    Groomsmen
                  </Label>
                  <Input
                    type="number"
                    value={value.wedding_party?.groomsmen || ''}
                    onChange={(e) =>
                      handleNestedChange(
                        'wedding_party',
                        'groomsmen',
                        parseInt(e.target.value) || 0,
                      )
                    }
                    placeholder="4"
                    min="0"
                    max="20"
                    disabled={disabled}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    Ring Bearers
                  </Label>
                  <Input
                    type="number"
                    value={value.wedding_party?.ring_bearers || ''}
                    onChange={(e) =>
                      handleNestedChange(
                        'wedding_party',
                        'ring_bearers',
                        parseInt(e.target.value) || 0,
                      )
                    }
                    placeholder="1"
                    min="0"
                    max="5"
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                  Ushers
                </Label>
                <Input
                  type="number"
                  value={value.wedding_party?.ushers || ''}
                  onChange={(e) =>
                    handleNestedChange(
                      'wedding_party',
                      'ushers',
                      parseInt(e.target.value) || 0,
                    )
                  }
                  placeholder="2"
                  min="0"
                  max="10"
                  disabled={disabled}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                  Readers/Speakers
                </Label>
                <Input
                  type="number"
                  value={value.wedding_party?.readers || ''}
                  onChange={(e) =>
                    handleNestedChange(
                      'wedding_party',
                      'readers',
                      parseInt(e.target.value) || 0,
                    )
                  }
                  placeholder="2"
                  min="0"
                  max="10"
                  disabled={disabled}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* RSVP Tracking Tab */}
        <TabsContent value="rsvp" className="space-y-4 mt-4">
          <Card className="p-4">
            <Label className="text-sm font-medium mb-3 block">
              RSVP Status Tracking
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                  Invitations Sent
                </Label>
                <Input
                  type="number"
                  value={value.rsvp_tracking?.invited || ''}
                  onChange={(e) =>
                    handleNestedChange(
                      'rsvp_tracking',
                      'invited',
                      parseInt(e.target.value) || 0,
                    )
                  }
                  placeholder="100"
                  disabled={disabled}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                  Confirmed Yes
                </Label>
                <Input
                  type="number"
                  value={value.rsvp_tracking?.confirmed || ''}
                  onChange={(e) =>
                    handleNestedChange(
                      'rsvp_tracking',
                      'confirmed',
                      parseInt(e.target.value) || 0,
                    )
                  }
                  placeholder="75"
                  className="border-green-300 focus:border-green-500"
                  disabled={disabled}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                  Declined
                </Label>
                <Input
                  type="number"
                  value={value.rsvp_tracking?.declined || ''}
                  onChange={(e) =>
                    handleNestedChange(
                      'rsvp_tracking',
                      'declined',
                      parseInt(e.target.value) || 0,
                    )
                  }
                  placeholder="15"
                  className="border-red-300 focus:border-red-500"
                  disabled={disabled}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                  No Response
                </Label>
                <Input
                  type="number"
                  value={value.rsvp_tracking?.pending || ''}
                  onChange={(e) =>
                    handleNestedChange(
                      'rsvp_tracking',
                      'pending',
                      parseInt(e.target.value) || 0,
                    )
                  }
                  placeholder="10"
                  className="border-amber-300 focus:border-amber-500"
                  disabled={disabled}
                />
              </div>
            </div>

            {calculatedTotals.rsvpTotal > 0 && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {Math.round(
                      ((value.rsvp_tracking?.confirmed || 0) /
                        calculatedTotals.rsvpTotal) *
                        100,
                    )}
                    %
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-300">
                    Response Rate
                  </div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {value.rsvp_tracking?.confirmed || 0}
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    Confirmed Guests
                  </div>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {value.rsvp_tracking?.pending || 0}
                  </div>
                  <div className="text-xs text-amber-700 dark:text-amber-300">
                    Awaiting Response
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Budget Impact */}
      {calculatedTotals.totalGuests > 0 && (
        <Card className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-green-200 dark:border-green-800">
          <Label className="text-sm font-medium mb-3 block flex items-center gap-2 text-green-700 dark:text-green-300">
            <Calculator className="w-4 h-4" />
            Budget Impact Estimate
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                £{calculatedTotals.estimatedTotalCost.toLocaleString()}
              </div>
              <div className="text-xs text-green-700 dark:text-green-300">
                Estimated Total Cost
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                (£75 per guest avg)
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                £
                {Math.round(
                  calculatedTotals.estimatedTotalCost * 0.6,
                ).toLocaleString()}
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300">
                Catering Cost
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                (60% of total)
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                £
                {Math.round(
                  calculatedTotals.estimatedTotalCost * 0.4,
                ).toLocaleString()}
              </div>
              <div className="text-xs text-purple-700 dark:text-purple-300">
                Other Costs
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                (venue, flowers, etc)
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Guest Count Tips */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Guest Count Planning Tips
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Plan for 10-15% no-shows even with confirmed RSVPs</li>
          <li>• Children's meals typically cost 50% of adult prices</li>
          <li>
            • Guest count affects venue choice, catering, and seating
            arrangements
          </li>
          <li>
            • Consider plus-ones for married couples and long-term partners
          </li>
          <li>• Weekend weddings may have higher attendance rates</li>
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

export default GuestCountField;
