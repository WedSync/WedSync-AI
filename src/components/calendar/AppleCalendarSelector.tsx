'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Check,
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowUpDown,
  Clock,
  Users,
  Heart,
  Camera,
  MapPin,
  Settings,
  X,
} from 'lucide-react';

interface CalendarInfo {
  id: string;
  displayName: string;
  description?: string;
  color: string;
  permissions: 'read' | 'read-write';
  eventCount: number;
  lastSync?: Date;
  isSelected: boolean;
  syncDirection: 'bidirectional' | 'to-apple' | 'from-apple';
  calendarType: 'personal' | 'business' | 'shared' | 'wedding-specific';
}

interface AppleCalendarSelectorProps {
  availableCalendars: CalendarInfo[];
  selectedCalendars: string[];
  onCalendarToggle: (calendarId: string) => void;
  onCreateCalendar: (name: string, color: string) => void;
  onSyncDirectionChange: (
    calendarId: string,
    direction: CalendarInfo['syncDirection'],
  ) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const CALENDAR_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#6366f1',
];

const WEDDING_EVENT_TYPES = [
  {
    type: 'engagement',
    icon: Heart,
    label: 'Engagement Sessions',
    color: '#ec4899',
  },
  {
    type: 'ceremony',
    icon: Users,
    label: 'Wedding Ceremonies',
    color: '#10b981',
  },
  { type: 'reception', icon: MapPin, label: 'Receptions', color: '#3b82f6' },
  {
    type: 'photography',
    icon: Camera,
    label: 'Photo Sessions',
    color: '#f59e0b',
  },
];

const AppleCalendarSelector: React.FC<AppleCalendarSelectorProps> = ({
  availableCalendars,
  selectedCalendars,
  onCalendarToggle,
  onCreateCalendar,
  onSyncDirectionChange,
  isLoading = false,
  onRefresh,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState('');
  const [newCalendarColor, setNewCalendarColor] = useState(CALENDAR_COLORS[0]);

  const formatLastSync = (date?: Date) => {
    if (!date) return 'Never synced';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just synced';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getCalendarTypeIcon = (type: CalendarInfo['calendarType']) => {
    switch (type) {
      case 'personal':
        return Users;
      case 'business':
        return Settings;
      case 'shared':
        return Users;
      case 'wedding-specific':
        return Heart;
      default:
        return Calendar;
    }
  };

  const getCalendarTypeLabel = (type: CalendarInfo['calendarType']) => {
    switch (type) {
      case 'personal':
        return 'Personal';
      case 'business':
        return 'Business';
      case 'shared':
        return 'Shared';
      case 'wedding-specific':
        return 'Wedding';
      default:
        return 'Calendar';
    }
  };

  const getSyncDirectionLabel = (direction: CalendarInfo['syncDirection']) => {
    switch (direction) {
      case 'bidirectional':
        return 'Two-way sync';
      case 'to-apple':
        return 'WedSync → Apple';
      case 'from-apple':
        return 'Apple → WedSync';
      default:
        return 'Two-way sync';
    }
  };

  const handleCreateCalendar = () => {
    if (newCalendarName.trim()) {
      onCreateCalendar(newCalendarName.trim(), newCalendarColor);
      setNewCalendarName('');
      setShowCreateForm(false);
    }
  };

  const selectedCount = selectedCalendars.length;
  const totalEvents = availableCalendars.reduce(
    (sum, cal) => sum + cal.eventCount,
    0,
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600" />
              Apple Calendar Selection
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose which calendars to sync with your WedSync events
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                aria-label="Refresh calendars"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                />
              </button>
            )}
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Calendar
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{availableCalendars.length} calendars discovered</span>
          </div>
          <div className="flex items-center gap-1">
            <Check className="w-4 h-4" />
            <span>{selectedCount} selected for sync</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{totalEvents} total events</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-primary-600" />
            <span className="ml-3 text-gray-600">Discovering calendars...</span>
          </div>
        ) : availableCalendars.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Calendars Found
            </h3>
            <p className="text-gray-600 mb-4">
              We couldn't find any calendars in your Apple Calendar account.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
            >
              Create Your First Calendar
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableCalendars.map((calendar) => {
              const TypeIcon = getCalendarTypeIcon(calendar.calendarType);
              const isSelected = selectedCalendars.includes(calendar.id);

              return (
                <div
                  key={calendar.id}
                  className={`
                    relative p-4 border rounded-xl cursor-pointer transition-all duration-200
                    ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }
                  `}
                  onClick={() => onCalendarToggle(calendar.id)}
                >
                  {/* Selection Checkbox */}
                  <div className="absolute top-4 right-4">
                    <div
                      className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                      ${
                        isSelected
                          ? 'bg-primary-600 border-primary-600'
                          : 'border-gray-300 hover:border-gray-400'
                      }
                    `}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>

                  {/* Calendar Color Indicator */}
                  <div
                    className="w-4 h-4 rounded-full mb-3"
                    style={{ backgroundColor: calendar.color }}
                  />

                  {/* Calendar Info */}
                  <div className="pr-8 mb-3">
                    <h3 className="font-medium text-gray-900 mb-1 truncate">
                      {calendar.displayName}
                    </h3>
                    {calendar.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {calendar.description}
                      </p>
                    )}
                  </div>

                  {/* Calendar Type and Event Count */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <TypeIcon className="w-3 h-3" />
                      <span>{getCalendarTypeLabel(calendar.calendarType)}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {calendar.eventCount} events
                    </span>
                  </div>

                  {/* Permissions & Last Sync */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      {calendar.permissions === 'read-write' ? (
                        <Eye className="w-3 h-3 text-green-500" />
                      ) : (
                        <EyeOff className="w-3 h-3 text-gray-400" />
                      )}
                      <span
                        className={`
                        ${
                          calendar.permissions === 'read-write'
                            ? 'text-green-600'
                            : 'text-gray-500'
                        }
                      `}
                      >
                        {calendar.permissions === 'read-write'
                          ? 'Read & Write'
                          : 'Read Only'}
                      </span>
                    </div>
                    <span className="text-gray-500">
                      {formatLastSync(calendar.lastSync)}
                    </span>
                  </div>

                  {/* Sync Direction (for selected calendars) */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">
                          Sync Direction:
                        </span>
                        <select
                          value={calendar.syncDirection}
                          onChange={(e) => {
                            e.stopPropagation();
                            onSyncDirectionChange(
                              calendar.id,
                              e.target.value as CalendarInfo['syncDirection'],
                            );
                          }}
                          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white hover:bg-gray-50 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="bidirectional">Two-way sync</option>
                          <option value="to-apple">WedSync → Apple</option>
                          <option value="from-apple">Apple → WedSync</option>
                        </select>
                      </div>
                      <div className="mt-1">
                        <span className="text-xs text-gray-500">
                          {getSyncDirectionLabel(calendar.syncDirection)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Wedding Event Types Preview */}
      {selectedCount > 0 && (
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500" />
            Wedding Event Types Mapping
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            Events will be categorized and color-coded based on these types
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {WEDDING_EVENT_TYPES.map((eventType) => {
              const Icon = eventType.icon;
              return (
                <div
                  key={eventType.type}
                  className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 shadow-xs"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: eventType.color }}
                  />
                  <Icon className="w-4 h-4 text-gray-600" />
                  <span className="text-xs text-gray-700 font-medium">
                    {eventType.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Calendar Modal */}
      {showCreateForm && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreateForm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden transform transition-all duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Create New Calendar
                </h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Calendar Name*
                  </label>
                  <input
                    type="text"
                    value={newCalendarName}
                    onChange={(e) => setNewCalendarName(e.target.value)}
                    placeholder="e.g., Wedding Photography 2024"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Calendar Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CALENDAR_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewCalendarColor(color)}
                        className={`
                          w-8 h-8 rounded-full border-2 transition-all duration-200
                          ${
                            newCalendarColor === color
                              ? 'border-gray-900 scale-110'
                              : 'border-gray-300 hover:border-gray-400'
                          }
                        `}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Wedding Calendar Suggestion */}
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Heart className="w-4 h-4 text-rose-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-rose-900">
                        Wedding Calendar Tip
                      </p>
                      <p className="text-xs text-rose-800 mt-1">
                        Consider creating separate calendars for engagements,
                        weddings, and client meetings for better organization.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCalendar}
                  disabled={!newCalendarName.trim()}
                  className="px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  Create Calendar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppleCalendarSelector;
