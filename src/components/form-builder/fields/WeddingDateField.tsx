'use client';

import React, { useState } from 'react';
import {
  Calendar,
  CalendarDays,
  AlertCircle,
  Heart,
  Clock,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WeddingFormField } from '@/types/form-builder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WeddingDateFieldProps {
  field: WeddingFormField;
  value?: {
    date?: Date;
    time?: string;
    ceremony_time?: string;
    reception_time?: string;
    timezone?: string;
    is_flexible?: boolean;
    backup_dates?: Date[];
  };
  error?: string;
  onChange: (value: any) => void;
  disabled?: boolean;
}

/**
 * WeddingDateField - Specialized date picker for wedding dates
 *
 * Features:
 * - Wedding-optimized date selection (weekends highlighted)
 * - Ceremony and reception time selection
 * - Timezone support for destination weddings
 * - Flexible date options and backup dates
 * - Season and day-of-week pricing context
 * - Photography golden hour calculations
 */
export function WeddingDateField({
  field,
  value = {},
  error,
  onChange,
  disabled = false,
}: WeddingDateFieldProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Wedding seasons for context
  const getWeddingSeason = (date: Date) => {
    const month = date.getMonth();
    if (month >= 2 && month <= 4)
      return { name: 'Spring', icon: '🌸', popularity: 'High' };
    if (month >= 5 && month <= 7)
      return { name: 'Summer', icon: '☀️', popularity: 'Peak' };
    if (month >= 8 && month <= 10)
      return { name: 'Fall', icon: '🍂', popularity: 'High' };
    return { name: 'Winter', icon: '❄️', popularity: 'Low' };
  };

  // Get wedding day context
  const getWeddingDayInfo = (date: Date) => {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const season = getWeddingSeason(date);

    return {
      dayName,
      isWeekend,
      season,
      pricing: isWeekend ? 'Premium' : 'Standard',
      availability: isWeekend ? 'Limited' : 'Good',
    };
  };

  // Calculate golden hour times for photography
  const getGoldenHourInfo = (date: Date) => {
    // Simplified golden hour calculation (would use proper sunrise/sunset API in production)
    const month = date.getMonth();
    const isWinter = month >= 11 || month <= 1;
    const isSummer = month >= 5 && month <= 7;

    if (isWinter) {
      return {
        sunrise: '7:30 AM',
        sunset: '5:30 PM',
        goldenHour: '4:30 PM - 5:30 PM',
      };
    } else if (isSummer) {
      return {
        sunrise: '6:00 AM',
        sunset: '8:00 PM',
        goldenHour: '7:00 PM - 8:00 PM',
      };
    }
    return {
      sunrise: '6:30 AM',
      sunset: '6:30 PM',
      goldenHour: '5:30 PM - 6:30 PM',
    };
  };

  // Handle date changes
  const handleDateChange = (newDate: Date | undefined) => {
    onChange({
      ...value,
      date: newDate,
    });
    setIsCalendarOpen(false);
  };

  // Handle other field changes
  const handleFieldChange = (field: string, newValue: any) => {
    onChange({
      ...value,
      [field]: newValue,
    });
  };

  const dayInfo = value.date ? getWeddingDayInfo(value.date) : null;
  const goldenHour = value.date ? getGoldenHourInfo(value.date) : null;

  return (
    <div className="space-y-4">
      {/* Field Label */}
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-rose-500" />
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
        <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-lg">
          <p className="text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <Heart className="w-4 h-4" />
            {field.weddingContext.helpText}
          </p>
        </div>
      )}

      {/* Date Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Primary Date Picker */}
        <Card className="p-4">
          <Label className="text-sm font-medium mb-3 block">Wedding Date</Label>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !value.date && 'text-muted-foreground',
                  error && 'border-red-500',
                )}
                disabled={disabled}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                {value.date ? (
                  value.date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                ) : (
                  <span>Select wedding date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={value.date}
                onSelect={handleDateChange}
                disabled={(date) => date < new Date() || disabled}
                modifiers={{
                  weekend: (date) => date.getDay() === 0 || date.getDay() === 6,
                }}
                modifiersStyles={{
                  weekend: {
                    backgroundColor: 'rgb(254 242 242)',
                    color: 'rgb(190 18 60)',
                    fontWeight: '600',
                  },
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </Card>

        {/* Wedding Day Context */}
        {dayInfo && (
          <Card className="p-4">
            <Label className="text-sm font-medium mb-3 block">
              Wedding Day Details
            </Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Day of Week
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={dayInfo.isWeekend ? 'default' : 'secondary'}>
                    {dayInfo.dayName}
                  </Badge>
                  {dayInfo.isWeekend && <span className="text-xs">💍</span>}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Season
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{dayInfo.season.icon}</span>
                  <Badge variant="outline">{dayInfo.season.name}</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Pricing Tier
                </span>
                <Badge
                  variant={
                    dayInfo.pricing === 'Premium' ? 'default' : 'secondary'
                  }
                >
                  {dayInfo.pricing}
                </Badge>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Time Selection */}
      {value.date && (
        <Card className="p-4">
          <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Wedding Timeline
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                Ceremony Time
              </Label>
              <Select
                value={value.ceremony_time || ''}
                onValueChange={(time) =>
                  handleFieldChange('ceremony_time', time)
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10:00">10:00 AM</SelectItem>
                  <SelectItem value="11:00">11:00 AM</SelectItem>
                  <SelectItem value="12:00">12:00 PM</SelectItem>
                  <SelectItem value="13:00">1:00 PM</SelectItem>
                  <SelectItem value="14:00">2:00 PM</SelectItem>
                  <SelectItem value="15:00">3:00 PM</SelectItem>
                  <SelectItem value="16:00">4:00 PM</SelectItem>
                  <SelectItem value="17:00">5:00 PM</SelectItem>
                  <SelectItem value="18:00">6:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                Reception Time
              </Label>
              <Select
                value={value.reception_time || ''}
                onValueChange={(time) =>
                  handleFieldChange('reception_time', time)
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="17:00">5:00 PM</SelectItem>
                  <SelectItem value="18:00">6:00 PM</SelectItem>
                  <SelectItem value="19:00">7:00 PM</SelectItem>
                  <SelectItem value="20:00">8:00 PM</SelectItem>
                  <SelectItem value="21:00">9:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                Timezone
              </Label>
              <Select
                value={value.timezone || ''}
                onValueChange={(tz) => handleFieldChange('timezone', tz)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EST">Eastern Time</SelectItem>
                  <SelectItem value="CST">Central Time</SelectItem>
                  <SelectItem value="MST">Mountain Time</SelectItem>
                  <SelectItem value="PST">Pacific Time</SelectItem>
                  <SelectItem value="GMT">Greenwich Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Photography Golden Hour Information */}
      {value.date && goldenHour && (
        <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
          <Label className="text-sm font-medium mb-3 block flex items-center gap-2 text-amber-700 dark:text-amber-300">
            📸 Photography Golden Hour
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Sunrise:</span>
              <div className="font-medium text-amber-700 dark:text-amber-300">
                {goldenHour.sunrise}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Sunset:</span>
              <div className="font-medium text-amber-700 dark:text-amber-300">
                {goldenHour.sunset}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                Golden Hour:
              </span>
              <div className="font-medium text-amber-700 dark:text-amber-300">
                {goldenHour.goldenHour}
              </div>
            </div>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            💡 Plan portraits during golden hour for the most flattering natural
            lighting
          </p>
        </Card>
      )}

      {/* Date Flexibility Options */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            id={`${field.id}-flexible`}
            checked={value.is_flexible || false}
            onChange={(e) => handleFieldChange('is_flexible', e.target.checked)}
            disabled={disabled}
            className="rounded text-rose-600 focus:ring-rose-500"
          />
          <Label
            htmlFor={`${field.id}-flexible`}
            className="text-sm cursor-pointer"
          >
            I'm flexible with my wedding date
          </Label>
        </div>

        {value.is_flexible && (
          <div className="space-y-2 pl-6 border-l-2 border-rose-200 dark:border-rose-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Being flexible with your date can help secure better pricing and
              availability with vendors.
            </p>
            <div className="text-xs text-rose-600 dark:text-rose-400">
              💝 Flexible couples save an average of 15% on wedding costs
            </div>
          </div>
        )}
      </Card>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Wedding Date Tips */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <Heart className="w-4 h-4" />
          Wedding Date Tips
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Saturday weddings are most popular but also most expensive</li>
          <li>• Friday or Sunday weddings can save 20-30% on venue costs</li>
          <li>
            • Off-season dates (Nov-Mar) offer better pricing and availability
          </li>
          <li>• Book 12-18 months in advance for peak season dates</li>
        </ul>
      </div>
    </div>
  );
}

export default WeddingDateField;
