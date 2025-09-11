'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Settings,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimelineAnchorConfig {
  anchor_type: 'booking_date' | 'wedding_date' | 'fixed_date' | 'relative_date';
  offset: {
    value: number;
    unit: 'days' | 'weeks' | 'months';
    direction: 'before' | 'after';
  };
  business_hours?: {
    enabled: boolean;
    start: string; // "09:00"
    end: string; // "17:00"
  };
  skip_weekends: boolean;
  timezone: string;
  fixed_date?: string;
}

export interface TimelineAnchorProps {
  position: { x: number; y: number };
  anchorType: 'booking_date' | 'wedding_date' | 'fixed_date' | 'relative_date';
  config: TimelineAnchorConfig;
  onConfigChange: (config: TimelineAnchorConfig) => void;
  sampleDates?: {
    wedding_date: string;
    booking_date: string;
  };
  className?: string;
}

export function TimelineAnchor({
  position,
  anchorType,
  config,
  onConfigChange,
  sampleDates = {
    wedding_date: '2024-09-15',
    booking_date: '2024-03-15',
  },
  className,
}: TimelineAnchorProps) {
  const [calculatedDate, setCalculatedDate] = useState<Date | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Calculate the execution date based on current configuration
  useEffect(() => {
    try {
      const result = calculateExecutionDate(
        config,
        new Date(sampleDates.wedding_date),
        new Date(sampleDates.booking_date),
        config.fixed_date ? new Date(config.fixed_date) : undefined,
      );
      setCalculatedDate(result);
      setValidationError(null);
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : 'Calculation error',
      );
      setCalculatedDate(null);
    }
  }, [config, sampleDates]);

  const handleConfigUpdate = (updates: Partial<TimelineAnchorConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getAnchorDisplayName = (anchor: string): string => {
    return anchor.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div
      className={cn(
        'absolute bg-white border-2 border-indigo-300 rounded-lg shadow-lg min-w-48',
        className,
      )}
      style={{
        left: position.x,
        top: position.y,
        zIndex: 10,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-t-lg border-b">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span className="font-medium text-indigo-900 text-sm">
            Timeline Anchor
          </span>
        </div>
        <button
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className="p-1 hover:bg-indigo-100 rounded"
        >
          <Settings className="w-4 h-4 text-indigo-600" />
        </button>
      </div>

      {/* Main Content */}
      <div className="p-3">
        {/* Anchor Type Display */}
        <div className="mb-3">
          <div className="text-xs text-gray-600 mb-1">Anchor</div>
          <div className="font-medium text-sm text-gray-900">
            {getAnchorDisplayName(config.anchor_type)}
          </div>
        </div>

        {/* Offset Display */}
        <div className="mb-3">
          <div className="text-xs text-gray-600 mb-1">Timing</div>
          <div className="font-medium text-sm text-gray-900">
            {config.offset.value} {config.offset.unit} {config.offset.direction}
          </div>
        </div>

        {/* Calculated Date Display */}
        <div className="mb-3 p-2 bg-gray-50 rounded border">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3 h-3 text-gray-500" />
            <span className="text-xs text-gray-600">Calculated Execution</span>
          </div>
          {validationError ? (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs">{validationError}</span>
            </div>
          ) : calculatedDate ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs">{formatDate(calculatedDate)}</span>
            </div>
          ) : (
            <span className="text-xs text-gray-500">Calculating...</span>
          )}
        </div>

        {/* Configuration Panel */}
        {isConfigOpen && (
          <div className="border-t pt-3 mt-3 space-y-3">
            {/* Anchor Type */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Anchor Type
              </label>
              <select
                value={config.anchor_type}
                onChange={(e) =>
                  handleConfigUpdate({
                    anchor_type: e.target
                      .value as TimelineAnchorConfig['anchor_type'],
                  })
                }
                className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-indigo-500"
              >
                <option value="booking_date">Booking Date</option>
                <option value="wedding_date">Wedding Date</option>
                <option value="fixed_date">Fixed Date</option>
                <option value="relative_date">Relative Date</option>
              </select>
            </div>

            {/* Fixed Date Input */}
            {config.anchor_type === 'fixed_date' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Fixed Date
                </label>
                <input
                  type="datetime-local"
                  value={config.fixed_date || ''}
                  onChange={(e) =>
                    handleConfigUpdate({ fixed_date: e.target.value })
                  }
                  className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Offset Configuration */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Value
                </label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={config.offset.value}
                  onChange={(e) =>
                    handleConfigUpdate({
                      offset: {
                        ...config.offset,
                        value: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <select
                  value={config.offset.unit}
                  onChange={(e) =>
                    handleConfigUpdate({
                      offset: {
                        ...config.offset,
                        unit: e.target.value as 'days' | 'weeks' | 'months',
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Direction
                </label>
                <select
                  value={config.offset.direction}
                  onChange={(e) =>
                    handleConfigUpdate({
                      offset: {
                        ...config.offset,
                        direction: e.target.value as 'before' | 'after',
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="before">Before</option>
                  <option value="after">After</option>
                </select>
              </div>
            </div>

            {/* Business Hours */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-2">
                <input
                  type="checkbox"
                  checked={config.business_hours?.enabled || false}
                  onChange={(e) =>
                    handleConfigUpdate({
                      business_hours: {
                        ...config.business_hours,
                        enabled: e.target.checked,
                        start: config.business_hours?.start || '09:00',
                        end: config.business_hours?.end || '17:00',
                      },
                    })
                  }
                  className="w-3 h-3"
                />
                Business Hours
              </label>
              {config.business_hours?.enabled && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Start
                    </label>
                    <input
                      type="time"
                      value={config.business_hours.start}
                      onChange={(e) =>
                        handleConfigUpdate({
                          business_hours: {
                            ...config.business_hours,
                            start: e.target.value,
                          },
                        })
                      }
                      className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      End
                    </label>
                    <input
                      type="time"
                      value={config.business_hours.end}
                      onChange={(e) =>
                        handleConfigUpdate({
                          business_hours: {
                            ...config.business_hours,
                            end: e.target.value,
                          },
                        })
                      }
                      className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Skip Weekends */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={config.skip_weekends}
                  onChange={(e) =>
                    handleConfigUpdate({ skip_weekends: e.target.checked })
                  }
                  className="w-3 h-3"
                />
                Skip Weekends
              </label>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <select
                value={config.timezone}
                onChange={(e) =>
                  handleConfigUpdate({ timezone: e.target.value })
                }
                className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-indigo-500"
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Timeline calculation function (matches the API implementation)
export function calculateExecutionDate(
  config: TimelineAnchorConfig,
  weddingDate: Date,
  bookingDate: Date,
  fixedDate?: Date,
): Date {
  let anchor: Date;

  switch (config.anchor_type) {
    case 'wedding_date':
      anchor = weddingDate;
      break;
    case 'booking_date':
      anchor = bookingDate;
      break;
    case 'fixed_date':
      anchor = fixedDate || new Date();
      break;
    default:
      throw new Error(`Unsupported anchor type: ${config.anchor_type}`);
  }

  // Calculate offset
  let targetDate = new Date(anchor);
  const offsetValue =
    config.offset.direction === 'before'
      ? -Math.abs(config.offset.value)
      : Math.abs(config.offset.value);

  switch (config.offset.unit) {
    case 'days':
      targetDate.setDate(targetDate.getDate() + offsetValue);
      break;
    case 'weeks':
      targetDate.setDate(targetDate.getDate() + offsetValue * 7);
      break;
    case 'months':
      targetDate.setMonth(targetDate.getMonth() + offsetValue);
      break;
    default:
      throw new Error(`Unsupported offset unit: ${config.offset.unit}`);
  }

  // Apply business day constraints
  if (
    config.skip_weekends &&
    (targetDate.getDay() === 0 || targetDate.getDay() === 6)
  ) {
    // Move to next Monday
    const daysToAdd = targetDate.getDay() === 0 ? 1 : 2; // Sunday -> Monday, Saturday -> Monday
    targetDate.setDate(targetDate.getDate() + daysToAdd);
  }

  // Apply business hours
  if (config.business_hours?.enabled) {
    const [startHour, startMinute] = config.business_hours.start
      .split(':')
      .map(Number);
    targetDate.setHours(startHour, startMinute, 0, 0);
  }

  return targetDate;
}

// Validation function for timeline configuration
export function validateTimelineConfig(config: TimelineAnchorConfig): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate offset values
  if (config.offset.value < 0) {
    errors.push('Offset value must be positive');
  }

  if (config.offset.value > 365 && config.offset.unit === 'days') {
    warnings.push('Offset of more than 365 days may be excessive');
  }

  // Validate business hours
  if (config.business_hours?.enabled) {
    const { start, end } = config.business_hours;

    if (!start.match(/^\d{2}:\d{2}$/)) {
      errors.push('Invalid start time format. Use HH:MM');
    }

    if (!end.match(/^\d{2}:\d{2}$/)) {
      errors.push('Invalid end time format. Use HH:MM');
    }

    if (start >= end) {
      errors.push('Start time must be before end time');
    }
  }

  // Validate fixed date
  if (config.anchor_type === 'fixed_date' && !config.fixed_date) {
    errors.push('Fixed date is required when using fixed date anchor');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export default TimelineAnchor;
