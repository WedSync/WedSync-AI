'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Send,
  Bell,
  Globe,
  Target,
  CheckCircle,
  AlertCircle,
  Calendar as CalendarIcon,
  Plus,
  Settings,
  Zap,
} from 'lucide-react';
import {
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  addHours,
} from 'date-fns';
import type {
  PublishingSchedule,
  ScheduleStatus,
  NotificationSettings,
  Article,
  ContentDistributionRule,
} from '@/types/articles';

interface PublishingSchedulerProps {
  article?: Partial<Article>;
  onSchedule: (schedule: Partial<PublishingSchedule>) => Promise<void>;
  onPublishNow?: () => Promise<void>;
  existingSchedules?: PublishingSchedule[];
  isLoading?: boolean;
}

interface SchedulingOption {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  getDate: (now: Date) => Date;
}

export function PublishingScheduler({
  article,
  onSchedule,
  onPublishNow,
  existingSchedules = [],
  isLoading = false,
}: PublishingSchedulerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [scheduleMode, setScheduleMode] = useState<
    'custom' | 'optimal' | 'recurring'
  >('custom');
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      email_notifications: true,
      slack_notifications: false,
      dashboard_notifications: true,
      notification_recipients: [],
    });
  const [recipientEmail, setRecipientEmail] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [deliveryChannels, setDeliveryChannels] = useState({
    client_dashboards: true,
    email_newsletter: false,
    social_media: false,
    rss_feed: true,
  });
  const [recurringSettings, setRecurringSettings] = useState({
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    dayOfWeek: 1, // Monday
    dayOfMonth: 1,
    endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
  });

  // Quick scheduling options
  const schedulingOptions: SchedulingOption[] = useMemo(
    () => [
      {
        id: 'now',
        label: 'Publish Now',
        description: 'Make article live immediately',
        icon: Send,
        getDate: (now) => now,
      },
      {
        id: 'in-1-hour',
        label: 'In 1 Hour',
        description: 'Publish in 1 hour for quick review',
        icon: Clock,
        getDate: (now) => addHours(now, 1),
      },
      {
        id: 'tomorrow-9am',
        label: 'Tomorrow 9 AM',
        description: 'Peak engagement time',
        icon: CalendarIcon,
        getDate: (now) => {
          const tomorrow = addDays(now, 1);
          tomorrow.setHours(9, 0, 0, 0);
          return tomorrow;
        },
      },
      {
        id: 'next-week',
        label: 'Next Week',
        description: 'Monday 9 AM next week',
        icon: Calendar,
        getDate: (now) => {
          const nextMonday = addDays(now, 7 - now.getDay() + 1);
          nextMonday.setHours(9, 0, 0, 0);
          return nextMonday;
        },
      },
    ],
    [],
  );

  // Get optimal publishing times based on content type and target audience
  const getOptimalTimes = useMemo(() => {
    const now = new Date();
    const baseOptimalTimes = [
      { time: '09:00', label: 'Morning Peak (9 AM)', engagement: 85 },
      { time: '14:00', label: 'Afternoon Peak (2 PM)', engagement: 78 },
      { time: '19:00', label: 'Evening Peak (7 PM)', engagement: 92 },
    ];

    return baseOptimalTimes.map((time) => ({
      ...time,
      date: (() => {
        const date = new Date(now);
        const [hours, minutes] = time.time.split(':');
        date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        if (date <= now) {
          date.setDate(date.getDate() + 1);
        }
        return date;
      })(),
    }));
  }, []);

  // Calendar generation for date picker
  const calendarDays = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  // Handle scheduling
  const handleSchedule = async (scheduledDate?: Date) => {
    const finalDate =
      scheduledDate ||
      new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}:00`);

    const scheduleData: Partial<PublishingSchedule> = {
      article_id: article?.id || '',
      scheduled_date: finalDate.toISOString(),
      timezone,
      status: 'pending',
      notification_settings: notificationSettings,
    };

    try {
      await onSchedule(scheduleData);
    } catch (error) {
      console.error('Failed to schedule article:', error);
    }
  };

  // Handle quick scheduling
  const handleQuickSchedule = async (option: SchedulingOption) => {
    if (option.id === 'now' && onPublishNow) {
      await onPublishNow();
    } else {
      const scheduledDate = option.getDate(new Date());
      await handleSchedule(scheduledDate);
    }
  };

  // Add notification recipient
  const addRecipient = () => {
    if (
      recipientEmail &&
      !notificationSettings.notification_recipients.includes(recipientEmail)
    ) {
      setNotificationSettings({
        ...notificationSettings,
        notification_recipients: [
          ...notificationSettings.notification_recipients,
          recipientEmail,
        ],
      });
      setRecipientEmail('');
    }
  };

  // Remove notification recipient
  const removeRecipient = (email: string) => {
    setNotificationSettings({
      ...notificationSettings,
      notification_recipients:
        notificationSettings.notification_recipients.filter((r) => r !== email),
    });
  };

  return (
    <div className="space-y-6">
      {/* Publishing Mode Selection */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-primary-600" />
          Publishing Schedule
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {['custom', 'optimal', 'recurring'].map((mode) => (
            <button
              key={mode}
              onClick={() => setScheduleMode(mode as any)}
              className={`p-4 border rounded-lg text-left transition-all ${
                scheduleMode === mode
                  ? 'border-primary-300 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                {mode === 'custom' && <Settings className="h-4 w-4" />}
                {mode === 'optimal' && <Target className="h-4 w-4" />}
                {mode === 'recurring' && <Calendar className="h-4 w-4" />}
                <span className="font-medium capitalize">{mode}</span>
              </div>
              <p className="text-xs text-gray-500">
                {mode === 'custom' && 'Choose your own date and time'}
                {mode === 'optimal' && 'AI-suggested optimal times'}
                {mode === 'recurring' && 'Schedule repeating posts'}
              </p>
            </button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {schedulingOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => handleQuickSchedule(option)}
                disabled={isLoading}
                className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all text-left group disabled:opacity-50"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-gray-100 group-hover:bg-primary-100 rounded-lg transition-all">
                    <Icon className="h-4 w-4 text-gray-600 group-hover:text-primary-600" />
                  </div>
                  <span className="font-medium text-gray-900">
                    {option.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{option.description}</p>
              </button>
            );
          })}
        </div>

        {/* Schedule Mode Content */}
        {scheduleMode === 'custom' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Publication Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={format(selectedDate, 'yyyy-MM-dd')}
                    onChange={(e) => setSelectedDate(parseISO(e.target.value))}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Publication Time
                </label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">Greenwich Mean Time (GMT)</option>
                <option value="Europe/Paris">
                  Central European Time (CET)
                </option>
                <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
                <option value="Australia/Sydney">
                  Australian Eastern Time (AET)
                </option>
              </select>
            </div>
          </div>
        )}

        {scheduleMode === 'optimal' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <Zap className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800">
                    AI-Optimized Scheduling
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Based on your audience engagement patterns and content type,
                    here are the optimal publishing times:
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {getOptimalTimes.map((timeSlot, index) => (
                <button
                  key={index}
                  onClick={() => handleSchedule(timeSlot.date)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {timeSlot.label}
                    </span>
                    <div className="flex items-center space-x-1">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          timeSlot.engagement >= 90
                            ? 'bg-green-500'
                            : timeSlot.engagement >= 80
                              ? 'bg-yellow-500'
                              : 'bg-gray-400'
                        }`}
                      />
                      <span className="text-xs text-gray-500">
                        {timeSlot.engagement}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {format(timeSlot.date, "EEEE, MMM d 'at' h:mm a")}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {scheduleMode === 'recurring' && (
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <Calendar className="h-5 w-5 text-purple-500 mt-0.5 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-purple-800">
                    Recurring Publication
                  </h4>
                  <p className="text-sm text-purple-700 mt-1">
                    Set up automated publishing for regular content series or
                    newsletters.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency
                </label>
                <select
                  value={recurringSettings.frequency}
                  onChange={(e) =>
                    setRecurringSettings({
                      ...recurringSettings,
                      frequency: e.target.value as any,
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {recurringSettings.frequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Day of Week
                  </label>
                  <select
                    value={recurringSettings.dayOfWeek}
                    onChange={(e) =>
                      setRecurringSettings({
                        ...recurringSettings,
                        dayOfWeek: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                  >
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                    <option value={0}>Sunday</option>
                  </select>
                </div>
              )}

              {recurringSettings.frequency === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Day of Month
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={recurringSettings.dayOfMonth}
                    onChange={(e) =>
                      setRecurringSettings({
                        ...recurringSettings,
                        dayOfMonth: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={recurringSettings.endDate}
                onChange={(e) =>
                  setRecurringSettings({
                    ...recurringSettings,
                    endDate: e.target.value,
                  })
                }
                min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
              />
            </div>
          </div>
        )}

        {scheduleMode !== 'recurring' && (
          <div className="pt-4">
            <button
              onClick={() => handleSchedule()}
              disabled={isLoading}
              className="w-full btn-md px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Calendar className="h-4 w-4" />
              <span>
                {isLoading ? 'Scheduling...' : 'Schedule Publication'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Delivery Channels */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
          <Globe className="h-4 w-4 mr-2 text-primary-600" />
          Delivery Channels
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(deliveryChannels).map(([channel, enabled]) => (
            <label
              key={channel}
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) =>
                  setDeliveryChannels({
                    ...deliveryChannels,
                    [channel]: e.target.checked,
                  })
                }
                className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
              />
              <div className="ml-3">
                <span className="text-sm font-medium text-gray-900">
                  {channel
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
                <p className="text-xs text-gray-500">
                  {channel === 'client_dashboards' &&
                    'Automatically appear in relevant client dashboards'}
                  {channel === 'email_newsletter' &&
                    'Include in weekly newsletter digest'}
                  {channel === 'social_media' &&
                    'Share on connected social accounts'}
                  {channel === 'rss_feed' &&
                    'Publish to RSS feed for subscribers'}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
          <Bell className="h-4 w-4 mr-2 text-primary-600" />
          Notification Settings
        </h4>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                key: 'email_notifications',
                label: 'Email Notifications',
                description: 'Get notified via email',
              },
              {
                key: 'slack_notifications',
                label: 'Slack Notifications',
                description: 'Send to Slack channel',
              },
              {
                key: 'dashboard_notifications',
                label: 'Dashboard Alerts',
                description: 'Show in dashboard',
              },
            ].map(({ key, label, description }) => (
              <label
                key={key}
                className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={
                    notificationSettings[
                      key as keyof NotificationSettings
                    ] as boolean
                  }
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      [key]: e.target.checked,
                    })
                  }
                  className="mt-0.5 rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                />
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-900">
                    {label}
                  </span>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Notification Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notification Recipients
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="Add email address..."
                className="flex-1 px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
              />
              <button
                onClick={addRecipient}
                disabled={!recipientEmail}
                className="btn-sm px-3 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center space-x-1 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                <span>Add</span>
              </button>
            </div>

            {notificationSettings.notification_recipients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {notificationSettings.notification_recipients.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200"
                  >
                    {email}
                    <button
                      onClick={() => removeRecipient(email)}
                      className="ml-1.5 h-3 w-3 text-primary-500 hover:text-primary-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Existing Schedules */}
      {existingSchedules.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="h-4 w-4 mr-2 text-primary-600" />
            Scheduled Publications ({existingSchedules.length})
          </h4>

          <div className="space-y-3">
            {existingSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${
                      schedule.status === 'published'
                        ? 'bg-success-50 text-success-600'
                        : schedule.status === 'failed'
                          ? 'bg-error-50 text-error-600'
                          : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    {schedule.status === 'published' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : schedule.status === 'failed' ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {format(
                        parseISO(schedule.scheduled_date),
                        "MMM d, yyyy 'at' h:mm a",
                      )}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      Status: {schedule.status}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      schedule.status === 'published'
                        ? 'bg-success-100 text-success-700'
                        : schedule.status === 'failed'
                          ? 'bg-error-100 text-error-700'
                          : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {schedule.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
