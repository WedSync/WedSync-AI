'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Filter,
  RefreshCw,
  Settings,
  Search,
  Download,
  Heart,
  Clock,
  Star,
  DollarSign,
} from 'lucide-react';

import type {
  VendorPerformanceMetrics,
  AnalyticsDashboardData,
  ScoreCardConfig,
} from '../../types/analytics';
import type { AnalyticsFilters } from '../../types/analytics';

// Import child components
import PerformanceCharts from './PerformanceCharts';
import VendorScoreCard from './VendorScoreCard';
import BenchmarkingInterface from './BenchmarkingInterface';
import AnalyticsFiltersComponent from './AnalyticsFilters';

export interface VendorAnalyticsDashboardProps {
  vendorMetrics: VendorPerformanceMetrics[];
  dashboardData: AnalyticsDashboardData;
  onRefresh?: () => Promise<void>;
  onFilterChange?: (filters: AnalyticsFilters) => void;
  onExportData?: (format: 'csv' | 'pdf') => void;
  className?: string;
}

// Utility function for class names (similar to existing pattern)
function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}

const VendorAnalyticsDashboard: React.FC<VendorAnalyticsDashboardProps> = ({
  vendorMetrics,
  dashboardData,
  onRefresh,
  onFilterChange,
  onExportData,
  className,
}) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'performance' | 'comparison'
  >('overview');

  // Filter state
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
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

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (isLoading || !onRefresh) return;

    setIsLoading(true);
    try {
      await onRefresh();
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, onRefresh]);

  // Handle filter changes
  const handleFilterChange = useCallback(
    (newFilters: Partial<AnalyticsFilters>) => {
      const updatedFilters = { ...filters, ...newFilters };
      setFilters(updatedFilters);
      onFilterChange?.(updatedFilters);
    },
    [filters, onFilterChange],
  );

  // Filtered and sorted vendor metrics
  const filteredVendors = useMemo(() => {
    let filtered = vendorMetrics;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (vendor) =>
          vendor.vendorName.toLowerCase().includes(query) ||
          vendor.vendorType.toLowerCase().includes(query),
      );
    }

    // Apply vendor type filter
    if (filters.vendorTypes.length > 0) {
      filtered = filtered.filter((vendor) =>
        filters.vendorTypes.includes(vendor.vendorType),
      );
    }

    // Apply minimum bookings filter
    if (filters.minBookings > 0) {
      filtered = filtered.filter(
        (vendor) => vendor.totalBookings >= filters.minBookings,
      );
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      const aValue = a[filters.sortBy];
      const bValue = b[filters.sortBy];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return filters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [vendorMetrics, searchQuery, filters]);

  // Calculate overview stats
  const overviewStats = useMemo((): ScoreCardConfig[] => {
    const activeVendors = vendorMetrics.filter((v) => v.isActive).length;
    const avgResponseTime =
      vendorMetrics.reduce((sum, v) => sum + v.responseTimeMinutes, 0) /
        vendorMetrics.length || 0;
    const avgBookingRate =
      vendorMetrics.reduce((sum, v) => sum + v.bookingSuccessRate, 0) /
        vendorMetrics.length || 0;
    const avgSatisfaction =
      vendorMetrics.reduce((sum, v) => sum + v.customerSatisfactionScore, 0) /
        vendorMetrics.length || 0;
    const totalRevenue = vendorMetrics.reduce(
      (sum, v) => sum + v.totalRevenue,
      0,
    );

    return [
      {
        title: 'Active Vendors',
        value: activeVendors,
        format: 'number',
        color: 'blue',
        icon: 'Users',
        trend: {
          direction: 'up',
          value: 8.2,
          period: 'vs last month',
        },
      },
      {
        title: 'Avg Response Time',
        value: Math.round(avgResponseTime),
        format: 'time',
        color:
          avgResponseTime < 120
            ? 'green'
            : avgResponseTime < 240
              ? 'yellow'
              : 'red',
        icon: 'Clock',
        trend: {
          direction: avgResponseTime < 120 ? 'down' : 'up',
          value: 12.5,
          period: 'minutes',
        },
      },
      {
        title: 'Booking Success Rate',
        value: Math.round(avgBookingRate * 100),
        maxValue: 100,
        format: 'percentage',
        color:
          avgBookingRate > 0.7
            ? 'green'
            : avgBookingRate > 0.5
              ? 'yellow'
              : 'red',
        icon: 'Calendar',
        trend: {
          direction: 'up',
          value: 5.4,
          period: '%',
        },
      },
      {
        title: 'Customer Satisfaction',
        value: avgSatisfaction,
        maxValue: 5,
        format: 'decimal',
        color:
          avgSatisfaction > 4.5
            ? 'green'
            : avgSatisfaction > 3.5
              ? 'yellow'
              : 'red',
        icon: 'Heart',
        trend: {
          direction: 'up',
          value: 0.3,
          period: 'points',
        },
      },
      {
        title: 'Total Revenue',
        value: totalRevenue,
        format: 'currency',
        color: 'green',
        icon: 'DollarSign',
        trend: {
          direction: 'up',
          value: 23.1,
          period: '% growth',
        },
      },
      {
        title: 'Average Rating',
        value:
          vendorMetrics.reduce((sum, v) => sum + v.averageRating, 0) /
            vendorMetrics.length || 0,
        maxValue: 5,
        format: 'decimal',
        color: 'yellow',
        icon: 'Star',
      },
    ];
  }, [vendorMetrics]);

  return (
    <div className={cn('w-full max-w-7xl mx-auto p-4 space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="w-8 h-8 text-blue-600 mr-3" />
            Vendor Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            Track performance metrics and insights for wedding vendors
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className={cn(
              'p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors',
              isLoading && 'opacity-50 cursor-not-allowed',
            )}
          >
            <RefreshCw className={cn('w-5 h-5', isLoading && 'animate-spin')} />
          </button>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'p-2 rounded-lg border transition-colors',
              showFilters
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'border-gray-200 hover:bg-gray-50',
            )}
          >
            <Filter className="w-5 h-5" />
          </button>

          {/* Export Button */}
          <button
            onClick={() => onExportData?.('csv')}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-5 h-5" />
          </button>

          {/* Settings Button */}
          <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search vendors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <AnalyticsFiltersComponent
              filters={filters}
              onFiltersChange={handleFilterChange}
              availableVendorTypes={Array.from(
                new Set(vendorMetrics.map((v) => v.vendorType)),
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'performance', label: 'Performance', icon: TrendingUp },
            { key: 'comparison', label: 'Comparison', icon: Users },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={cn(
                'flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Overview Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {overviewStats.map((stat, index) => (
                  <VendorScoreCard key={index} config={stat} />
                ))}
              </div>

              {/* Performance Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PerformanceCharts
                  data={filteredVendors}
                  type="responseTime"
                  title="Response Time Trends"
                />
                <PerformanceCharts
                  data={filteredVendors}
                  type="bookingSuccess"
                  title="Booking Success Rates"
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'performance' && (
            <motion.div
              key="performance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <PerformanceCharts
                data={filteredVendors}
                type="comprehensive"
                title="Comprehensive Performance Analysis"
                interactive={true}
              />
            </motion.div>
          )}

          {activeTab === 'comparison' && (
            <motion.div
              key="comparison"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <BenchmarkingInterface
                vendors={filteredVendors}
                selectedVendors={selectedVendors}
                onVendorSelect={setSelectedVendors}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VendorAnalyticsDashboard;
