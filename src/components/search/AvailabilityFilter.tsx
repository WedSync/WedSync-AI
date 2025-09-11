'use client';

import React, { useState, useMemo } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Clock,
  Sun,
  Cloud,
  Star,
  Heart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  AlertCircle,
  CheckCircle2,
  X,
  CalendarDays,
  CalendarCheck,
  CalendarX,
  Timer,
  Zap,
  Info,
} from 'lucide-react';

interface AvailabilityData {
  startDate?: Date;
  endDate?: Date;
  flexible?: boolean;
  preferredDays?: string[];
  avoidHolidays?: boolean;
  seasonPreference?: 'spring' | 'summer' | 'autumn' | 'winter' | 'any';
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'any';
  minNotice?: number; // days
}

interface AvailabilityFilterProps {
  availability: AvailabilityData;
  onChange: (availability: AvailabilityData) => void;
  className?: string;
  compact?: boolean;
  showSeasonalInsights?: boolean;
  showPricingInsights?: boolean;
}

interface SeasonData {
  season: string;
  months: string[];
  popularity: 'high' | 'medium' | 'low';
  priceMultiplier: number;
  weatherRisk: 'low' | 'medium' | 'high';
  advantages: string[];
  considerations: string[];
}

interface DateSuggestion {
  id: string;
  name: string;
  dateRange: [Date, Date] | Date;
  description: string;
  popularity: 'high' | 'medium' | 'low';
  savings?: string;
  risk?: string;
}

const DAYS_OF_WEEK = [
  { id: 'monday', name: 'Monday', short: 'Mon', savings: '30-40%' },
  { id: 'tuesday', name: 'Tuesday', short: 'Tue', savings: '25-35%' },
  { id: 'wednesday', name: 'Wednesday', short: 'Wed', savings: '20-30%' },
  { id: 'thursday', name: 'Thursday', short: 'Thu', savings: '15-25%' },
  { id: 'friday', name: 'Friday', short: 'Fri', savings: '5-15%' },
  { id: 'saturday', name: 'Saturday', short: 'Sat', savings: 'Premium' },
  { id: 'sunday', name: 'Sunday', short: 'Sun', savings: '10-20%' },
];

const SEASONS: SeasonData[] = [
  {
    season: 'spring',
    months: ['March', 'April', 'May'],
    popularity: 'high',
    priceMultiplier: 1.2,
    weatherRisk: 'medium',
    advantages: ['Beautiful blooms', 'Mild weather', 'Fresh start symbolism'],
    considerations: [
      'Unpredictable weather',
      'Higher demand',
      'Limited outdoor backup',
    ],
  },
  {
    season: 'summer',
    months: ['June', 'July', 'August'],
    popularity: 'high',
    priceMultiplier: 1.4,
    weatherRisk: 'low',
    advantages: [
      'Reliable weather',
      'Long daylight',
      'Outdoor ceremonies',
      'Holiday atmosphere',
    ],
    considerations: [
      'Peak pricing',
      'High demand',
      'Heat considerations',
      'Vendor availability',
    ],
  },
  {
    season: 'autumn',
    months: ['September', 'October', 'November'],
    popularity: 'medium',
    priceMultiplier: 1.1,
    weatherRisk: 'medium',
    advantages: [
      'Beautiful colors',
      'Comfortable weather',
      'Good availability',
      'Harvest themes',
    ],
    considerations: [
      'Weather variability',
      'Earlier sunset',
      'School schedules',
    ],
  },
  {
    season: 'winter',
    months: ['December', 'January', 'February'],
    popularity: 'low',
    priceMultiplier: 0.8,
    weatherRisk: 'high',
    advantages: [
      'Significant savings',
      'Intimate atmosphere',
      'Holiday decorations',
      'Cozy venues',
    ],
    considerations: [
      'Weather challenges',
      'Limited daylight',
      'Holiday conflicts',
      'Guest travel',
    ],
  },
];

const TIME_OF_DAY_OPTIONS = [
  {
    id: 'morning',
    name: 'Morning (9am-12pm)',
    savings: '20-30%',
    description: 'Brunch reception style',
  },
  {
    id: 'afternoon',
    name: 'Afternoon (12pm-6pm)',
    savings: '10-20%',
    description: 'Lunch or tea reception',
  },
  {
    id: 'evening',
    name: 'Evening (6pm+)',
    savings: 'Standard',
    description: 'Traditional dinner reception',
  },
];

// Generate some date suggestions
const generateDateSuggestions = (): DateSuggestion[] => {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  return [
    {
      id: 'next-3-months',
      name: 'Next 3 Months',
      dateRange: [new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)],
      description: 'Short-notice bookings with significant savings',
      popularity: 'low',
      savings: 'Up to 40% off',
    },
    {
      id: 'off-season-winter',
      name: 'Winter Months',
      dateRange: [new Date(nextYear, 0, 1), new Date(nextYear, 2, 31)],
      description: 'Intimate winter celebrations',
      popularity: 'low',
      savings: 'Up to 35% off',
    },
    {
      id: 'spring-shoulder',
      name: 'Early Spring',
      dateRange: [new Date(nextYear, 2, 1), new Date(nextYear, 3, 30)],
      description: 'Beautiful blooms, moderate pricing',
      popularity: 'medium',
    },
    {
      id: 'peak-summer',
      name: 'Peak Summer',
      dateRange: [new Date(nextYear, 5, 1), new Date(nextYear, 7, 31)],
      description: 'Perfect weather, premium pricing',
      popularity: 'high',
      risk: 'Premium rates',
    },
    {
      id: 'autumn-colors',
      name: 'Autumn Colors',
      dateRange: [new Date(nextYear, 8, 15), new Date(nextYear, 10, 15)],
      description: 'Stunning foliage, good availability',
      popularity: 'medium',
    },
  ];
};

export function AvailabilityFilter({
  availability,
  onChange,
  className,
  compact = false,
  showSeasonalInsights = true,
  showPricingInsights = true,
}: AvailabilityFilterProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const dateSuggestions = useMemo(() => generateDateSuggestions(), []);

  // Helper functions
  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const parseDate = (dateString: string) => {
    return dateString ? new Date(dateString) : undefined;
  };

  // Handle changes
  const handleStartDateChange = (dateString: string) => {
    onChange({
      ...availability,
      startDate: parseDate(dateString),
    });
  };

  const handleEndDateChange = (dateString: string) => {
    onChange({
      ...availability,
      endDate: parseDate(dateString),
    });
  };

  const handleFlexibleChange = (flexible: boolean) => {
    onChange({
      ...availability,
      flexible,
    });
  };

  const handlePreferredDaysChange = (day: string) => {
    const current = availability.preferredDays || [];
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];

    onChange({
      ...availability,
      preferredDays: updated,
    });
  };

  const handleSeasonChange = (season: string) => {
    onChange({
      ...availability,
      seasonPreference: season === 'any' ? 'any' : (season as any),
    });
  };

  const handleTimeOfDayChange = (timeOfDay: string) => {
    onChange({
      ...availability,
      timeOfDay: timeOfDay === 'any' ? 'any' : (timeOfDay as any),
    });
  };

  const handleDateSuggestionSelect = (suggestion: DateSuggestion) => {
    if (Array.isArray(suggestion.dateRange)) {
      onChange({
        ...availability,
        startDate: suggestion.dateRange[0],
        endDate: suggestion.dateRange[1],
      });
    } else {
      onChange({
        ...availability,
        startDate: suggestion.dateRange,
        endDate: undefined,
      });
    }
  };

  // Clear availability
  const clearAvailability = () => {
    onChange({
      startDate: undefined,
      endDate: undefined,
      flexible: false,
      preferredDays: [],
      seasonPreference: 'any',
      timeOfDay: 'any',
      avoidHolidays: false,
      minNotice: undefined,
    });
  };

  // Get current season data
  const currentSeason =
    availability.seasonPreference && availability.seasonPreference !== 'any'
      ? SEASONS.find((s) => s.season === availability.seasonPreference)
      : null;

  // Get current time of day data
  const currentTimeOfDay =
    availability.timeOfDay && availability.timeOfDay !== 'any'
      ? TIME_OF_DAY_OPTIONS.find((t) => t.id === availability.timeOfDay)
      : null;

  // Check if any availability filters are set
  const hasAvailabilityFilters = () => {
    return !!(
      availability.startDate ||
      availability.endDate ||
      availability.preferredDays?.length ||
      (availability.seasonPreference &&
        availability.seasonPreference !== 'any') ||
      (availability.timeOfDay && availability.timeOfDay !== 'any')
    );
  };

  return (
    <Card className={cn('space-y-4', className)}>
      <CardHeader className={cn('pb-3', compact && 'pb-2')}>
        <div className="flex items-center justify-between">
          <CardTitle
            className={cn(
              'text-base flex items-center space-x-2',
              compact && 'text-sm',
            )}
          >
            <Calendar className="w-4 h-4" />
            <span>Availability</span>
            {hasAvailabilityFilters() && (
              <Badge variant="secondary" className="text-xs">
                Filters Active
              </Badge>
            )}
          </CardTitle>

          {hasAvailabilityFilters() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAvailability}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Date Range */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Wedding Date Range</Label>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date" className="text-sm">
                From
              </Label>
              <Input
                id="start-date"
                type="date"
                value={formatDate(availability.startDate)}
                onChange={(e) => handleStartDateChange(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="end-date" className="text-sm">
                To
              </Label>
              <Input
                id="end-date"
                type="date"
                value={formatDate(availability.endDate)}
                onChange={(e) => handleEndDateChange(e.target.value)}
                min={
                  availability.startDate
                    ? formatDate(availability.startDate)
                    : new Date().toISOString().split('T')[0]
                }
              />
            </div>
          </div>

          {/* Flexible Dates Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="flexible-dates"
              checked={availability.flexible || false}
              onCheckedChange={handleFlexibleChange}
            />
            <Label htmlFor="flexible-dates" className="text-sm">
              I'm flexible with dates (see more options)
            </Label>
          </div>
        </div>

        {/* Date Suggestions */}
        {!compact && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Quick Date Suggestions
            </Label>
            <div className="grid grid-cols-1 gap-2">
              {dateSuggestions.map((suggestion) => (
                <Button
                  key={suggestion.id}
                  variant="outline"
                  onClick={() => handleDateSuggestionSelect(suggestion)}
                  className="h-auto p-3 flex items-center justify-between text-left"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm">
                        {suggestion.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-xs',
                          suggestion.popularity === 'high' &&
                            'bg-red-100 text-red-800',
                          suggestion.popularity === 'medium' &&
                            'bg-yellow-100 text-yellow-800',
                          suggestion.popularity === 'low' &&
                            'bg-green-100 text-green-800',
                        )}
                      >
                        {suggestion.popularity} demand
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600">
                      {suggestion.description}
                    </div>
                  </div>

                  <div className="ml-4">
                    {suggestion.savings && (
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800 text-xs"
                      >
                        {suggestion.savings}
                      </Badge>
                    )}
                    {suggestion.risk && (
                      <Badge
                        variant="secondary"
                        className="bg-red-100 text-red-800 text-xs"
                      >
                        {suggestion.risk}
                      </Badge>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Preferred Days of Week */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Preferred Days of Week</Label>
          <div className="grid grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected =
                availability.preferredDays?.includes(day.id) || false;
              const isWeekend = day.id === 'saturday' || day.id === 'sunday';

              return (
                <Button
                  key={day.id}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePreferredDaysChange(day.id)}
                  className={cn(
                    'h-16 flex flex-col items-center justify-center text-xs',
                    isWeekend && !isSelected && 'border-orange-300',
                    isSelected && isWeekend && 'bg-orange-600',
                  )}
                >
                  <span className="font-medium">{day.short}</span>
                  <span className="text-xs opacity-75">
                    {day.id === 'saturday' ? 'Peak' : day.savings}
                  </span>
                </Button>
              );
            })}
          </div>

          {availability.preferredDays?.length > 0 && (
            <div className="text-sm text-gray-600">
              {availability.preferredDays.includes('saturday') ? (
                <span className="text-orange-600">
                  ⚠️ Weekend pricing applies
                </span>
              ) : (
                <span className="text-green-600">
                  ✓ Weekday savings available
                </span>
              )}
            </div>
          )}
        </div>

        {/* Season and Time Preferences */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="season" className="text-sm font-medium">
              Preferred Season
            </Label>
            <Select
              value={availability.seasonPreference || 'any'}
              onValueChange={handleSeasonChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Season</SelectItem>
                {SEASONS.map((season) => (
                  <SelectItem key={season.season} value={season.season}>
                    {season.season.charAt(0).toUpperCase() +
                      season.season.slice(1)}
                    ({season.months.join(', ')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="time-of-day" className="text-sm font-medium">
              Time of Day
            </Label>
            <Select
              value={availability.timeOfDay || 'any'}
              onValueChange={handleTimeOfDayChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Time</SelectItem>
                {TIME_OF_DAY_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Options */}
        <div>
          <Button
            variant="ghost"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 p-0 h-auto text-sm"
          >
            <Calendar className="w-4 h-4" />
            <span>Advanced Availability Options</span>
          </Button>

          {showAdvanced && (
            <div className="mt-3 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="avoid-holidays"
                    checked={availability.avoidHolidays || false}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...availability,
                        avoidHolidays: checked,
                      })
                    }
                  />
                  <Label htmlFor="avoid-holidays" className="text-sm">
                    Avoid major holidays
                  </Label>
                </div>

                <div>
                  <Label htmlFor="min-notice" className="text-sm">
                    Minimum notice required (days)
                  </Label>
                  <Input
                    id="min-notice"
                    type="number"
                    placeholder="30"
                    value={availability.minNotice || ''}
                    onChange={(e) =>
                      onChange({
                        ...availability,
                        minNotice: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Current Selection Summary */}
        {hasAvailabilityFilters() && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Your Availability Preferences
              </Label>

              <div className="space-y-2">
                {(availability.startDate || availability.endDate) && (
                  <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
                    <CalendarCheck className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">
                      {availability.startDate && availability.endDate
                        ? `${availability.startDate.toLocaleDateString()} - ${availability.endDate.toLocaleDateString()}`
                        : availability.startDate
                          ? `From ${availability.startDate.toLocaleDateString()}`
                          : `Until ${availability.endDate?.toLocaleDateString()}`}
                    </span>
                  </div>
                )}

                {availability.preferredDays?.length > 0 && (
                  <div className="flex items-center space-x-2 p-2 bg-green-50 rounded">
                    <CalendarDays className="w-4 h-4 text-green-600" />
                    <span className="text-sm">
                      Preferred:{' '}
                      {availability.preferredDays
                        .map(
                          (day) => DAYS_OF_WEEK.find((d) => d.id === day)?.name,
                        )
                        .join(', ')}
                    </span>
                  </div>
                )}

                {currentSeason && (
                  <div className="flex items-center space-x-2 p-2 bg-purple-50 rounded">
                    <Sun className="w-4 h-4 text-purple-600" />
                    <span className="text-sm">
                      {currentSeason.season.charAt(0).toUpperCase() +
                        currentSeason.season.slice(1)}{' '}
                      season
                    </span>
                  </div>
                )}

                {currentTimeOfDay && (
                  <div className="flex items-center space-x-2 p-2 bg-orange-50 rounded">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-sm">{currentTimeOfDay.name}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Seasonal Insights */}
        {showSeasonalInsights && currentSeason && !compact && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">
                  {currentSeason.season.charAt(0).toUpperCase() +
                    currentSeason.season.slice(1)}{' '}
                  Season Insights
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-600 mb-1">Popularity</div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      currentSeason.popularity === 'high' &&
                        'bg-red-100 text-red-800',
                      currentSeason.popularity === 'medium' &&
                        'bg-yellow-100 text-yellow-800',
                      currentSeason.popularity === 'low' &&
                        'bg-green-100 text-green-800',
                    )}
                  >
                    {currentSeason.popularity}
                  </Badge>
                </div>

                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-600 mb-1">Pricing</div>
                  <div className="font-medium text-sm">
                    {currentSeason.priceMultiplier > 1 ? '+' : ''}
                    {((currentSeason.priceMultiplier - 1) * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-600 mb-1">Weather Risk</div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      currentSeason.weatherRisk === 'high' &&
                        'bg-red-100 text-red-800',
                      currentSeason.weatherRisk === 'medium' &&
                        'bg-yellow-100 text-yellow-800',
                      currentSeason.weatherRisk === 'low' &&
                        'bg-green-100 text-green-800',
                    )}
                  >
                    {currentSeason.weatherRisk}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="text-sm font-medium text-green-700 mb-1">
                    Advantages:
                  </div>
                  <ul className="text-sm text-green-600 space-y-1">
                    {currentSeason.advantages.map((advantage, index) => (
                      <li key={index}>• {advantage}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-sm font-medium text-orange-700 mb-1">
                    Considerations:
                  </div>
                  <ul className="text-sm text-orange-600 space-y-1">
                    {currentSeason.considerations.map(
                      (consideration, index) => (
                        <li key={index}>• {consideration}</li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Pricing Insights */}
        {showPricingInsights &&
          (currentTimeOfDay || availability.preferredDays?.length) &&
          !compact && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Potential Savings</span>
                </div>

                <div className="space-y-2">
                  {currentTimeOfDay &&
                    currentTimeOfDay.savings !== 'Standard' && (
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <span className="text-sm">
                          {currentTimeOfDay.name}:
                        </span>
                        <Badge className="bg-green-100 text-green-800">
                          {currentTimeOfDay.savings} savings
                        </Badge>
                      </div>
                    )}

                  {availability.preferredDays?.some(
                    (day) => day !== 'saturday',
                  ) && (
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm">Weekday bookings:</span>
                      <Badge className="bg-green-100 text-green-800">
                        Up to 40% savings
                      </Badge>
                    </div>
                  )}

                  {currentSeason && currentSeason.priceMultiplier < 1 && (
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm">Off-season booking:</span>
                      <Badge className="bg-green-100 text-green-800">
                        {((1 - currentSeason.priceMultiplier) * 100).toFixed(0)}
                        % savings
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
      </CardContent>
    </Card>
  );
}

export default AvailabilityFilter;
