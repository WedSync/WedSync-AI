'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Filter,
  Calendar,
  Users,
  BarChart3,
  ArrowUpDown,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Camera,
  MapPin,
  Music,
  Flower,
  ChefHat,
  Video,
  UserPlus,
} from 'lucide-react';

import type { AnalyticsFilters } from '../../types/analytics';

export interface AnalyticsFiltersProps {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: Partial<AnalyticsFilters>) => void;
  availableVendorTypes: string[];
  className?: string;
}

// Utility function for class names
function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Vendor type configuration
const vendorTypeConfig = {
  photographer: {
    label: 'Photographers',
    icon: Camera,
    color: 'bg-blue-100 text-blue-700',
  },
  venue: {
    label: 'Venues',
    icon: MapPin,
    color: 'bg-green-100 text-green-700',
  },
  dj: { label: 'DJs', icon: Music, color: 'bg-purple-100 text-purple-700' },
  florist: {
    label: 'Florists',
    icon: Flower,
    color: 'bg-pink-100 text-pink-700',
  },
  caterer: {
    label: 'Caterers',
    icon: ChefHat,
    color: 'bg-orange-100 text-orange-700',
  },
  videographer: {
    label: 'Videographers',
    icon: Video,
    color: 'bg-red-100 text-red-700',
  },
  planner: {
    label: 'Planners',
    icon: UserPlus,
    color: 'bg-indigo-100 text-indigo-700',
  },
  other: { label: 'Other', icon: Users, color: 'bg-gray-100 text-gray-700' },
};

// Metrics available for filtering
const availableMetrics = [
  { key: 'responseTimeMinutes', label: 'Response Time' },
  { key: 'bookingSuccessRate', label: 'Booking Success Rate' },
  { key: 'customerSatisfactionScore', label: 'Customer Satisfaction' },
  { key: 'totalBookings', label: 'Total Bookings' },
  { key: 'totalRevenue', label: 'Total Revenue' },
  { key: 'averageRating', label: 'Average Rating' },
  { key: 'reliabilityScore', label: 'Reliability Score' },
  { key: 'repeatClientRate', label: 'Repeat Client Rate' },
  { key: 'onTimeDeliveryRate', label: 'On-Time Delivery' },
];

// Sort options
const sortOptions = [
  { key: 'vendorName', label: 'Vendor Name' },
  { key: 'responseTimeMinutes', label: 'Response Time' },
  { key: 'bookingSuccessRate', label: 'Booking Success Rate' },
  { key: 'customerSatisfactionScore', label: 'Customer Satisfaction' },
  { key: 'totalBookings', label: 'Total Bookings' },
  { key: 'totalRevenue', label: 'Total Revenue' },
  { key: 'averageRating', label: 'Average Rating' },
];

// Predefined date ranges
const dateRanges = [
  { key: 'last7days', label: 'Last 7 Days', days: 7 },
  { key: 'last30days', label: 'Last 30 Days', days: 30 },
  { key: 'last90days', label: 'Last 3 Months', days: 90 },
  { key: 'last6months', label: 'Last 6 Months', days: 180 },
  { key: 'lastyear', label: 'Last Year', days: 365 },
  { key: 'custom', label: 'Custom Range', days: 0 },
];

const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  filters,
  onFiltersChange,
  availableVendorTypes,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);

  // Handle date range change
  const handleDateRangeChange = useCallback(
    (rangeKey: string) => {
      if (rangeKey === 'custom') {
        setShowCustomDateRange(true);
        return;
      }

      const range = dateRanges.find((r) => r.key === rangeKey);
      if (range && range.days > 0) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - range.days);

        onFiltersChange({
          dateRange: {
            start: startDate,
            end: endDate,
          },
        });
        setShowCustomDateRange(false);
      }
    },
    [onFiltersChange],
  );

  // Handle custom date range
  const handleCustomDateChange = useCallback(
    (field: 'start' | 'end', value: string) => {
      if (!value) return;

      const date = new Date(value);
      onFiltersChange({
        dateRange: {
          ...filters.dateRange,
          [field]: date,
        },
      });
    },
    [filters.dateRange, onFiltersChange],
  );

  // Handle vendor type toggle
  const handleVendorTypeToggle = useCallback(
    (vendorType: string) => {
      const currentTypes = filters.vendorTypes;
      const isSelected = currentTypes.includes(vendorType);

      onFiltersChange({
        vendorTypes: isSelected
          ? currentTypes.filter((type) => type !== vendorType)
          : [...currentTypes, vendorType],
      });
    },
    [filters.vendorTypes, onFiltersChange],
  );

  // Handle metrics toggle
  const handleMetricToggle = useCallback(
    (metricKey: string) => {
      const currentMetrics = filters.metrics;
      const isSelected = currentMetrics.includes(metricKey);

      onFiltersChange({
        metrics: isSelected
          ? currentMetrics.filter((metric) => metric !== metricKey)
          : [...currentMetrics, metricKey],
      });
    },
    [filters.metrics, onFiltersChange],
  );

  // Reset filters
  const handleReset = useCallback(() => {
    onFiltersChange({
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      vendorTypes: [],
      metrics: [
        'responseTimeMinutes',
        'bookingSuccessRate',
        'customerSatisfactionScore',
      ],
      minBookings: 0,
      sortBy: 'totalBookings',
      sortOrder: 'desc',
      searchQuery: '',
    });
  }, [onFiltersChange]);

  // Get selected date range label
  const getSelectedDateRangeLabel = useCallback(() => {
    const { start, end } = filters.dateRange;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const range = dateRanges.find((r) => r.days === diffDays);
    return range ? range.label : 'Custom Range';
  }, [filters.dateRange]);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={cn('bg-white border border-gray-200 rounded-lg', className)}
    >
      {/* Filter Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>

          {/* Active Filters Count */}
          {(filters.vendorTypes.length > 0 ||
            filters.metrics.length !== 3 ||
            filters.minBookings > 0) && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
              {filters.vendorTypes.length +
                (filters.metrics.length !== 3 ? 1 : 0) +
                (filters.minBookings > 0 ? 1 : 0)}{' '}
              active
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Reset Filters"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Quick Filters (Always Visible) */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Date Range
            </label>
            <select
              value={getSelectedDateRangeLabel()}
              onChange={(e) =>
                handleDateRangeChange(
                  dateRanges.find((r) => r.label === e.target.value)?.key ||
                    'last30days',
                )
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {dateRanges.map((range) => (
                <option key={range.key} value={range.label}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ArrowUpDown className="w-4 h-4 inline mr-2" />
              Sort By
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) =>
                onFiltersChange({ sortBy: e.target.value as any })
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {sortOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Order
            </label>
            <select
              value={filters.sortOrder}
              onChange={(e) =>
                onFiltersChange({ sortOrder: e.target.value as 'asc' | 'desc' })
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="desc">High to Low</option>
              <option value="asc">Low to High</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range */}
        {showCustomDateRange && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.dateRange.start.toISOString().split('T')[0]}
                onChange={(e) =>
                  handleCustomDateChange('start', e.target.value)
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.dateRange.end.toISOString().split('T')[0]}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Advanced Filters (Expandable) */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border-t border-gray-200 p-4 space-y-6"
        >
          {/* Vendor Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Users className="w-4 h-4 inline mr-2" />
              Vendor Types
            </label>
            <div className="flex flex-wrap gap-2">
              {availableVendorTypes.map((vendorType) => {
                const config =
                  vendorTypeConfig[
                    vendorType as keyof typeof vendorTypeConfig
                  ] || vendorTypeConfig.other;
                const isSelected = filters.vendorTypes.includes(vendorType);
                const IconComponent = config.icon;

                return (
                  <button
                    key={vendorType}
                    onClick={() => handleVendorTypeToggle(vendorType)}
                    className={cn(
                      'flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium transition-all border-2',
                      isSelected
                        ? `${config.color} border-current`
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
                    )}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="capitalize">{vendorType}</span>
                    {isSelected && <X className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Metrics */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Metrics to Display
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableMetrics.map((metric) => {
                const isSelected = filters.metrics.includes(metric.key);

                return (
                  <label
                    key={metric.key}
                    className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleMetricToggle(metric.key)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      {metric.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Minimum Bookings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Bookings
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={filters.minBookings}
                onChange={(e) =>
                  onFiltersChange({ minBookings: parseInt(e.target.value) })
                }
                className="flex-1"
              />
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium min-w-[60px] text-center">
                {filters.minBookings}+
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0</span>
              <span>50+</span>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AnalyticsFilters;
