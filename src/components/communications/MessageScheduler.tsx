'use client';

import { useState, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ScheduledMessageOptions {
  send_at?: Date;
  recurring?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
    interval?: number;
    end_date?: Date;
    days_of_week?: number[];
    day_of_month?: number;
  };
  timezone: string;
  retry_on_failure?: {
    enabled: boolean;
    max_attempts: number;
    retry_interval: number;
  };
  quiet_hours?: {
    enabled: boolean;
    start: string;
    end: string;
    reschedule_to: 'next_available' | 'cancel';
  };
}

interface MessageSchedulerProps {
  value: ScheduledMessageOptions;
  onChange: (options: ScheduledMessageOptions) => void;
  onSchedule?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function MessageScheduler({
  value,
  onChange,
  onSchedule,
  isLoading,
  className,
}: MessageSchedulerProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleDateChange = (date: string) => {
    const newDate = new Date(date);
    onChange({
      ...value,
      send_at: newDate,
    });
  };

  const handleTimeChange = (time: string) => {
    if (!value.send_at) return;
    const [hours, minutes] = time.split(':');
    const newDate = new Date(value.send_at);
    newDate.setHours(parseInt(hours), parseInt(minutes));
    onChange({
      ...value,
      send_at: newDate,
    });
  };

  const handleRecurringToggle = (enabled: boolean) => {
    onChange({
      ...value,
      recurring: {
        enabled,
        frequency: 'weekly',
        interval: 1,
        ...value.recurring,
      },
    });
  };

  const handleFrequencyChange = (
    frequency: ScheduledMessageOptions['recurring']['frequency'],
  ) => {
    onChange({
      ...value,
      recurring: {
        ...value.recurring,
        frequency,
        enabled: true,
      },
    });
  };

  const handleQuietHoursToggle = (enabled: boolean) => {
    onChange({
      ...value,
      quiet_hours: {
        enabled,
        start: '22:00',
        end: '09:00',
        reschedule_to: 'next_available',
        ...value.quiet_hours,
      },
    });
  };

  const handleRetryToggle = (enabled: boolean) => {
    onChange({
      ...value,
      retry_on_failure: {
        enabled,
        max_attempts: 3,
        retry_interval: 60,
        ...value.retry_on_failure,
      },
    });
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Message Scheduling
        </CardTitle>
        <CardDescription>
          Schedule your message for optimal delivery timing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Scheduling */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="send-date">Send Date</Label>
            <Input
              id="send-date"
              type="date"
              value={value.send_at ? format(value.send_at, 'yyyy-MM-dd') : ''}
              onChange={(e) => handleDateChange(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="send-time">Send Time</Label>
            <Input
              id="send-time"
              type="time"
              value={value.send_at ? format(value.send_at, 'HH:mm') : ''}
              onChange={(e) => handleTimeChange(e.target.value)}
            />
          </div>
        </div>

        {/* Timezone Selection */}
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select
            value={value.timezone || 'UTC'}
            onValueChange={(tz) => onChange({ ...value, timezone: tz })}
          >
            <SelectTrigger id="timezone">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UTC">UTC</SelectItem>
              <SelectItem value="America/New_York">Eastern Time</SelectItem>
              <SelectItem value="America/Chicago">Central Time</SelectItem>
              <SelectItem value="America/Denver">Mountain Time</SelectItem>
              <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
              <SelectItem value="Europe/London">London</SelectItem>
              <SelectItem value="Europe/Paris">Paris</SelectItem>
              <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Recurring Messages */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="recurring">Recurring Message</Label>
              <p className="text-sm text-muted-foreground">
                Send this message on a regular schedule
              </p>
            </div>
            <Switch
              id="recurring"
              checked={value.recurring?.enabled || false}
              onCheckedChange={handleRecurringToggle}
            />
          </div>

          {value.recurring?.enabled && (
            <div className="ml-6 space-y-4 border-l-2 pl-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={value.recurring.frequency}
                    onValueChange={handleFrequencyChange}
                  >
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval">Interval</Label>
                  <Input
                    id="interval"
                    type="number"
                    min="1"
                    value={value.recurring.interval || 1}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        recurring: {
                          ...value.recurring,
                          interval: parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">End Date (Optional)</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={
                    value.recurring.end_date
                      ? format(value.recurring.end_date, 'yyyy-MM-dd')
                      : ''
                  }
                  onChange={(e) =>
                    onChange({
                      ...value,
                      recurring: {
                        ...value.recurring,
                        end_date: e.target.value
                          ? new Date(e.target.value)
                          : undefined,
                      },
                    })
                  }
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
            </div>
          )}
        </div>

        {/* Advanced Options */}
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm font-medium"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </Button>

          {showAdvanced && (
            <div className="space-y-4">
              {/* Quiet Hours */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="quiet-hours">Respect Quiet Hours</Label>
                    <p className="text-sm text-muted-foreground">
                      Avoid sending during specified hours
                    </p>
                  </div>
                  <Switch
                    id="quiet-hours"
                    checked={value.quiet_hours?.enabled || false}
                    onCheckedChange={handleQuietHoursToggle}
                  />
                </div>

                {value.quiet_hours?.enabled && (
                  <div className="ml-6 space-y-4 border-l-2 pl-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quiet-start">Start Time</Label>
                        <Input
                          id="quiet-start"
                          type="time"
                          value={value.quiet_hours.start}
                          onChange={(e) =>
                            onChange({
                              ...value,
                              quiet_hours: {
                                ...value.quiet_hours,
                                start: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quiet-end">End Time</Label>
                        <Input
                          id="quiet-end"
                          type="time"
                          value={value.quiet_hours.end}
                          onChange={(e) =>
                            onChange({
                              ...value,
                              quiet_hours: {
                                ...value.quiet_hours,
                                end: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reschedule">If in quiet hours</Label>
                      <Select
                        value={value.quiet_hours.reschedule_to}
                        onValueChange={(val) =>
                          onChange({
                            ...value,
                            quiet_hours: {
                              ...value.quiet_hours,
                              reschedule_to: val as 'next_available' | 'cancel',
                            },
                          })
                        }
                      >
                        <SelectTrigger id="reschedule">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="next_available">
                            Reschedule to next available time
                          </SelectItem>
                          <SelectItem value="cancel">Cancel sending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Retry on Failure */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="retry">Retry on Failure</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically retry failed deliveries
                    </p>
                  </div>
                  <Switch
                    id="retry"
                    checked={value.retry_on_failure?.enabled || false}
                    onCheckedChange={handleRetryToggle}
                  />
                </div>

                {value.retry_on_failure?.enabled && (
                  <div className="ml-6 space-y-4 border-l-2 pl-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="max-attempts">Max Attempts</Label>
                        <Input
                          id="max-attempts"
                          type="number"
                          min="1"
                          max="10"
                          value={value.retry_on_failure.max_attempts}
                          onChange={(e) =>
                            onChange({
                              ...value,
                              retry_on_failure: {
                                ...value.retry_on_failure,
                                max_attempts: parseInt(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="retry-interval">
                          Retry Interval (minutes)
                        </Label>
                        <Input
                          id="retry-interval"
                          type="number"
                          min="1"
                          value={value.retry_on_failure.retry_interval}
                          onChange={(e) =>
                            onChange({
                              ...value,
                              retry_on_failure: {
                                ...value.retry_on_failure,
                                retry_interval: parseInt(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Schedule Button */}
        {onSchedule && (
          <Button
            onClick={onSchedule}
            disabled={!value.send_at || isLoading}
            className="w-full"
          >
            <Calendar className="mr-2 h-4 w-4" />
            {isLoading ? 'Scheduling...' : 'Schedule Message'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
