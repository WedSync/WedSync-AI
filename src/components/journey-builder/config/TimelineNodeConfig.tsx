'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  Repeat,
  AlertTriangle,
  CheckCircle,
  Target,
} from 'lucide-react';

interface TimelineNodeConfigProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

const eventTypes = [
  {
    value: 'milestone',
    label: 'Milestone',
    icon: <Target className="h-3 w-3" />,
    description: 'Important milestone in the journey',
  },
  {
    value: 'reminder',
    label: 'Reminder',
    icon: <Clock className="h-3 w-3" />,
    description: 'Automated reminder for client or vendor',
  },
  {
    value: 'deadline',
    label: 'Deadline',
    icon: <AlertTriangle className="h-3 w-3" />,
    description: 'Critical deadline that must be met',
  },
  {
    value: 'celebration',
    label: 'Celebration',
    icon: <CheckCircle className="h-3 w-3" />,
    description: 'Celebration or achievement point',
  },
];

const weddingMilestones = [
  { value: 'booking', label: 'Initial Booking', offset: -365 },
  { value: 'contract', label: 'Contract Signed', offset: -300 },
  { value: 'engagement', label: 'Engagement Session', offset: -180 },
  { value: 'final-meeting', label: 'Final Meeting', offset: -7 },
  { value: 'wedding-day', label: 'Wedding Day', offset: 0 },
  { value: 'gallery-delivery', label: 'Gallery Delivery', offset: 14 },
  { value: 'album-delivery', label: 'Album Delivery', offset: 90 },
];

export function TimelineNodeConfig({
  config,
  onChange,
}: TimelineNodeConfigProps) {
  const handleFieldChange = (field: string, value: any) => {
    onChange({ [field]: value });
  };

  const handlePresetSelect = (preset: any) => {
    onChange({
      eventType: 'milestone',
      daysOffset: preset.offset,
      label: preset.label,
      anchorDate: 'wedding_date',
    });
  };

  return (
    <div className="space-y-4">
      {/* Event Type */}
      <div>
        <label className="text-sm font-medium text-foreground block mb-2">
          Event Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {eventTypes.map((type) => (
            <Button
              key={type.value}
              variant={config.eventType === type.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFieldChange('eventType', type.value)}
              className="flex items-center space-x-1 h-auto py-2"
            >
              <div className="flex flex-col items-center space-y-1">
                {type.icon}
                <span className="text-xs">{type.label}</span>
              </div>
            </Button>
          ))}
        </div>
        {config.eventType && (
          <p className="text-xs text-muted-foreground mt-1">
            {eventTypes.find((t) => t.value === config.eventType)?.description}
          </p>
        )}
      </div>

      {/* Date Configuration */}
      <div>
        <label className="text-sm font-medium text-foreground block mb-2">
          Date Configuration
        </label>

        <div className="space-y-3">
          {/* Date Type Selection */}
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="specific-date"
              name="dateType"
              checked={config.dateType === 'specific' || !config.dateType}
              onChange={() => handleFieldChange('dateType', 'specific')}
            />
            <label htmlFor="specific-date" className="text-sm">
              Specific Date
            </label>
          </div>

          {config.dateType === 'specific' && (
            <input
              type="date"
              value={config.date || ''}
              onChange={(e) => handleFieldChange('date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-background text-foreground text-sm"
            />
          )}

          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="relative-date"
              name="dateType"
              checked={config.dateType === 'relative'}
              onChange={() => handleFieldChange('dateType', 'relative')}
            />
            <label htmlFor="relative-date" className="text-sm">
              Relative to Wedding Date
            </label>
          </div>

          {config.dateType === 'relative' && (
            <div className="space-y-2 ml-6">
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={config.daysOffset || 0}
                  onChange={(e) =>
                    handleFieldChange(
                      'daysOffset',
                      parseInt(e.target.value) || 0,
                    )
                  }
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span className="text-sm">days</span>
                <select
                  value={config.daysOffset >= 0 ? 'after' : 'before'}
                  onChange={(e) => {
                    const current = Math.abs(config.daysOffset || 0);
                    handleFieldChange(
                      'daysOffset',
                      e.target.value === 'before' ? -current : current,
                    );
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="before">before</option>
                  <option value="after">after</option>
                </select>
                <span className="text-sm">wedding date</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Presets */}
      <div>
        <label className="text-sm font-medium text-foreground block mb-2">
          Wedding Milestone Presets
        </label>
        <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
          {weddingMilestones.map((milestone) => (
            <Button
              key={milestone.value}
              variant="ghost"
              size="sm"
              onClick={() => handlePresetSelect(milestone)}
              className="justify-between text-xs h-8"
            >
              <span>{milestone.label}</span>
              <Badge variant="outline" className="text-xs">
                {milestone.offset === 0
                  ? 'Wedding Day'
                  : milestone.offset > 0
                    ? `+${milestone.offset}d`
                    : `${milestone.offset}d`}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Recurring Options */}
      <div>
        <label className="text-sm font-medium text-foreground block mb-2">
          Recurrence (Optional)
        </label>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.recurring || false}
              onChange={(e) => handleFieldChange('recurring', e.target.checked)}
              className="rounded border-gray-300"
            />
            <Repeat className="h-4 w-4" />
            <span className="text-sm">Make this a recurring event</span>
          </label>

          {config.recurring && (
            <div className="ml-6 space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm">Repeat every</span>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={config.recurringInterval || 1}
                  onChange={(e) =>
                    handleFieldChange(
                      'recurringInterval',
                      parseInt(e.target.value) || 1,
                    )
                  }
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <select
                  value={config.recurringUnit || 'days'}
                  onChange={(e) =>
                    handleFieldChange('recurringUnit', e.target.value)
                  }
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                  <option value="months">months</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Business Hours Respect */}
      <div>
        <label className="text-sm font-medium text-foreground block mb-2">
          Timing Options
        </label>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.respectBusinessHours || false}
              onChange={(e) =>
                handleFieldChange('respectBusinessHours', e.target.checked)
              }
              className="rounded border-gray-300"
            />
            <Clock className="h-4 w-4" />
            <span className="text-sm">Respect business hours</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.skipWeekends || false}
              onChange={(e) =>
                handleFieldChange('skipWeekends', e.target.checked)
              }
              className="rounded border-gray-300"
            />
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Skip weekends</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.skipHolidays || false}
              onChange={(e) =>
                handleFieldChange('skipHolidays', e.target.checked)
              }
              className="rounded border-gray-300"
            />
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Skip holidays</span>
          </label>
        </div>
      </div>

      {/* Configuration Preview */}
      {(config.dateType || config.eventType) && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Timeline Preview</h4>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Type: {config.eventType || 'milestone'}</p>
            {config.dateType === 'specific' && config.date && (
              <p>Date: {new Date(config.date).toLocaleDateString()}</p>
            )}
            {config.dateType === 'relative' && (
              <p>
                Timing: {Math.abs(config.daysOffset || 0)} days{' '}
                {(config.daysOffset || 0) >= 0 ? 'after' : 'before'} wedding
                date
              </p>
            )}
            {config.recurring && (
              <p>
                Repeats: Every {config.recurringInterval || 1}{' '}
                {config.recurringUnit || 'days'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
