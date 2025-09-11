'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  AuditSearchFilters,
  AuditAction,
  AuditResourceType,
  AuditRiskLevel,
} from '@/types/audit';

interface AuditLogFiltersProps {
  filters: AuditSearchFilters;
  onFiltersChange: (filters: AuditSearchFilters) => void;
  userOptions: Array<{ id: string; name: string; email: string }>;
  isLoading?: boolean;
  onSavePreset?: (name: string, filters: AuditSearchFilters) => void;
  onLoadPreset?: (filters: AuditSearchFilters) => void;
  savedPresets?: Array<{ name: string; filters: AuditSearchFilters }>;
}

interface DatePreset {
  label: string;
  value: string;
  getDateRange: () => { start: string; end: string };
}

const DATE_PRESETS: DatePreset[] = [
  {
    label: 'Today',
    value: 'today',
    getDateRange: () => {
      const today = new Date();
      const start = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      ).toISOString();
      const end = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1,
      ).toISOString();
      return { start, end };
    },
  },
  {
    label: 'Last 7 days',
    value: '7days',
    getDateRange: () => {
      const today = new Date();
      const start = new Date(
        today.getTime() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const end = today.toISOString();
      return { start, end };
    },
  },
  {
    label: 'Last 30 days',
    value: '30days',
    getDateRange: () => {
      const today = new Date();
      const start = new Date(
        today.getTime() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const end = today.toISOString();
      return { start, end };
    },
  },
  {
    label: 'This month',
    value: 'thismonth',
    getDateRange: () => {
      const today = new Date();
      const start = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      ).toISOString();
      const end = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        1,
      ).toISOString();
      return { start, end };
    },
  },
];

const QUICK_FILTERS = [
  {
    label: 'High Risk Only',
    filters: { risk_level: 'HIGH' as AuditRiskLevel },
  },
  {
    label: 'Failed Logins',
    filters: {
      action: 'LOGIN' as AuditAction,
      risk_level: 'HIGH' as AuditRiskLevel,
    },
  },
  {
    label: 'Guest Data Access',
    filters: { resource_type: 'GUEST' as AuditResourceType },
  },
  {
    label: 'Bulk Operations',
    filters: { action: 'BULK_OPERATION' as AuditAction },
  },
  {
    label: 'After Hours',
    filters: {
      /* This would need backend support for time-based filtering */
    },
  },
  {
    label: 'Admin Actions',
    filters: { action: 'ADMIN_ACCESS' as AuditAction },
  },
];

export default function AuditLogFilters({
  filters,
  onFiltersChange,
  userOptions = [],
  isLoading = false,
  onSavePreset,
  onLoadPreset,
  savedPresets = [],
}: AuditLogFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedDatePreset, setSelectedDatePreset] = useState('');
  const [presetName, setPresetName] = useState('');
  const [showPresetInput, setShowPresetInput] = useState(false);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.user_id) count++;
    if (filters.action) count++;
    if (filters.resource_type) count++;
    if (filters.risk_level) count++;
    if (filters.date_range) count++;
    if (filters.ip_address) count++;
    if (filters.wedding_id) count++;
    if (filters.organization_id) count++;
    return count;
  }, [filters]);

  // Filter user options based on search
  const filteredUserOptions = useMemo(() => {
    if (!userSearch) return userOptions.slice(0, 10); // Limit initial results
    return userOptions
      .filter(
        (user) =>
          user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
          user.email.toLowerCase().includes(userSearch.toLowerCase()),
      )
      .slice(0, 20);
  }, [userOptions, userSearch]);

  const handleFilterChange = useCallback(
    (key: keyof AuditSearchFilters, value: any) => {
      onFiltersChange({
        ...filters,
        [key]: value || undefined, // Remove empty values
      });
    },
    [filters, onFiltersChange],
  );

  const handleDatePresetChange = useCallback(
    (presetValue: string) => {
      setSelectedDatePreset(presetValue);
      if (presetValue === 'custom') {
        // Keep existing date range or clear it
        return;
      }

      const preset = DATE_PRESETS.find((p) => p.value === presetValue);
      if (preset) {
        const dateRange = preset.getDateRange();
        handleFilterChange('date_range', dateRange);
      }
    },
    [handleFilterChange],
  );

  const handleQuickFilter = useCallback(
    (quickFilters: Partial<AuditSearchFilters>) => {
      onFiltersChange({
        ...filters,
        ...quickFilters,
      });
    },
    [filters, onFiltersChange],
  );

  const handleClearFilters = useCallback(() => {
    onFiltersChange({});
    setSelectedDatePreset('');
    setUserSearch('');
  }, [onFiltersChange]);

  const handleSavePreset = useCallback(() => {
    if (presetName.trim() && onSavePreset) {
      onSavePreset(presetName.trim(), filters);
      setPresetName('');
      setShowPresetInput(false);
    }
  }, [presetName, filters, onSavePreset]);

  const handleLoadPreset = useCallback(
    (preset: { filters: AuditSearchFilters }) => {
      if (onLoadPreset) {
        onLoadPreset(preset.filters);
      }
    },
    [onLoadPreset],
  );

  const formatDateForInput = (date: string) => {
    return new Date(date).toISOString().split('T')[0];
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Filter Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Audit Log Filters
            </h3>
            {activeFilterCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                {activeFilterCount} active
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
            {activeFilterCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Quick Filters (Always Visible) */}
        <div className="flex flex-wrap gap-2 mt-4">
          {QUICK_FILTERS.map((quickFilter) => (
            <Button
              key={quickFilter.label}
              variant="outline"
              size="sm"
              onClick={() => handleQuickFilter(quickFilter.filters)}
              className="text-xs"
            >
              {quickFilter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Expanded Filter Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Date Range */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Date Range
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              {DATE_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={
                    selectedDatePreset === preset.value ? 'default' : 'outline'
                  }
                  size="sm"
                  onClick={() => handleDatePresetChange(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
              <Button
                variant={
                  selectedDatePreset === 'custom' ? 'default' : 'outline'
                }
                size="sm"
                onClick={() => handleDatePresetChange('custom')}
              >
                Custom
              </Button>
            </div>

            {(selectedDatePreset === 'custom' || filters.date_range) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={
                      filters.date_range?.start
                        ? formatDateForInput(filters.date_range.start)
                        : ''
                    }
                    onChange={(e) =>
                      handleFilterChange('date_range', {
                        ...filters.date_range,
                        start: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : undefined,
                        end: filters.date_range?.end,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={
                      filters.date_range?.end
                        ? formatDateForInput(filters.date_range.end)
                        : ''
                    }
                    onChange={(e) =>
                      handleFilterChange('date_range', {
                        start: filters.date_range?.start,
                        end: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            )}
          </div>

          {/* User Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              User
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              {userSearch && filteredUserOptions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredUserOptions.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        handleFilterChange('user_id', user.id);
                        setUserSearch(user.name || user.email);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
                    >
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {filters.user_id && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Selected:{' '}
                {userOptions.find((u) => u.id === filters.user_id)?.name ||
                  filters.user_id}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    handleFilterChange('user_id', undefined);
                    setUserSearch('');
                  }}
                  className="ml-2 h-auto p-1 text-red-600 hover:text-red-800"
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          {/* Dropdowns Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Action Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Action
              </label>
              <select
                value={filters.action || ''}
                onChange={(e) =>
                  handleFilterChange('action', e.target.value as AuditAction)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="READ">Read</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="EXPORT">Export</option>
                <option value="BULK_OPERATION">Bulk Operation</option>
                <option value="PERMISSION_CHANGE">Permission Change</option>
                <option value="ADMIN_ACCESS">Admin Access</option>
              </select>
            </div>

            {/* Resource Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Resource Type
              </label>
              <select
                value={filters.resource_type || ''}
                onChange={(e) =>
                  handleFilterChange(
                    'resource_type',
                    e.target.value as AuditResourceType,
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Resources</option>
                <option value="USER">User</option>
                <option value="WEDDING">Wedding</option>
                <option value="GUEST">Guest</option>
                <option value="VENDOR">Vendor</option>
                <option value="TASK">Task</option>
                <option value="BUDGET">Budget</option>
                <option value="TIMELINE">Timeline</option>
                <option value="PHOTO">Photo</option>
                <option value="DOCUMENT">Document</option>
                <option value="SYSTEM">System</option>
              </select>
            </div>

            {/* Risk Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Risk Level
              </label>
              <select
                value={filters.risk_level || ''}
                onChange={(e) =>
                  handleFilterChange(
                    'risk_level',
                    e.target.value as AuditRiskLevel,
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Risk Levels</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {/* IP Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                IP Address
              </label>
              <input
                type="text"
                placeholder="192.168.1.1"
                value={filters.ip_address || ''}
                onChange={(e) =>
                  handleFilterChange('ip_address', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Wedding & Organization */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Wedding ID
              </label>
              <input
                type="text"
                placeholder="Enter wedding ID"
                value={filters.wedding_id || ''}
                onChange={(e) =>
                  handleFilterChange('wedding_id', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Organization ID
              </label>
              <input
                type="text"
                placeholder="Enter organization ID"
                value={filters.organization_id || ''}
                onChange={(e) =>
                  handleFilterChange('organization_id', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Filter Presets */}
          {(onSavePreset || savedPresets.length > 0) && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Filter Presets
                </h4>
                {onSavePreset && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPresetInput(!showPresetInput)}
                  >
                    Save Current Filters
                  </Button>
                )}
              </div>

              {showPresetInput && (
                <div className="flex items-center space-x-2 mb-3">
                  <input
                    type="text"
                    placeholder="Preset name"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <Button
                    size="sm"
                    onClick={handleSavePreset}
                    disabled={!presetName.trim()}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPresetInput(false);
                      setPresetName('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {savedPresets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {savedPresets.map((preset, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleLoadPreset(preset)}
                      className="text-xs"
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
