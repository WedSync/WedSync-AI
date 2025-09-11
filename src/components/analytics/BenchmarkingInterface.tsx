'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  X,
  BarChart3,
  TrendingUp,
  Star,
  Clock,
  Calendar,
  DollarSign,
  Search,
  ArrowUpDown,
  Target,
  Award,
  Zap,
} from 'lucide-react';

import type {
  VendorPerformanceMetrics,
  VendorComparison,
  MetricKey,
} from '../../types/analytics';

import VendorScoreCard from './VendorScoreCard';

export interface BenchmarkingInterfaceProps {
  vendors: VendorPerformanceMetrics[];
  selectedVendors: string[];
  onVendorSelect: (vendorIds: string[]) => void;
  maxComparisons?: number;
  className?: string;
}

// Utility function for class names
function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Metrics configuration for comparison
const comparisonMetrics: Array<{
  key: MetricKey;
  label: string;
  format: 'percentage' | 'decimal' | 'currency' | 'number' | 'time';
  icon: React.ElementType;
  description: string;
  higherIsBetter: boolean;
}> = [
  {
    key: 'responseTimeMinutes',
    label: 'Response Time',
    format: 'time',
    icon: Clock,
    description: 'Average time to respond to client inquiries',
    higherIsBetter: false,
  },
  {
    key: 'bookingSuccessRate',
    label: 'Booking Success Rate',
    format: 'percentage',
    icon: Target,
    description: 'Percentage of inquiries that result in bookings',
    higherIsBetter: true,
  },
  {
    key: 'customerSatisfactionScore',
    label: 'Customer Satisfaction',
    format: 'decimal',
    icon: Star,
    description: 'Average customer satisfaction rating (1-5)',
    higherIsBetter: true,
  },
  {
    key: 'totalBookings',
    label: 'Total Bookings',
    format: 'number',
    icon: Calendar,
    description: 'Total number of wedding bookings',
    higherIsBetter: true,
  },
  {
    key: 'totalRevenue',
    label: 'Total Revenue',
    format: 'currency',
    icon: DollarSign,
    description: 'Total revenue generated',
    higherIsBetter: true,
  },
  {
    key: 'reliabilityScore',
    label: 'Reliability Score',
    format: 'number',
    icon: Award,
    description: 'Reliability score based on delivery and communication',
    higherIsBetter: true,
  },
  {
    key: 'averageRating',
    label: 'Average Rating',
    format: 'decimal',
    icon: Star,
    description: 'Average client rating (1-5 stars)',
    higherIsBetter: true,
  },
];

const BenchmarkingInterface: React.FC<BenchmarkingInterfaceProps> = ({
  vendors,
  selectedVendors,
  onVendorSelect,
  maxComparisons = 4,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>([
    'responseTimeMinutes',
    'bookingSuccessRate',
    'customerSatisfactionScore',
    'totalRevenue',
  ]);
  const [sortBy, setSortBy] = useState<MetricKey>('totalBookings');

  // Filter vendors based on search
  const filteredVendors = useMemo(() => {
    if (!searchQuery.trim()) return vendors;

    const query = searchQuery.toLowerCase();
    return vendors.filter(
      (vendor) =>
        vendor.vendorName.toLowerCase().includes(query) ||
        vendor.vendorType.toLowerCase().includes(query),
    );
  }, [vendors, searchQuery]);

  // Get selected vendor data
  const selectedVendorData = useMemo(() => {
    return selectedVendors
      .map((id) => vendors.find((v) => v.vendorId === id))
      .filter(Boolean) as VendorPerformanceMetrics[];
  }, [selectedVendors, vendors]);

  // Industry averages for comparison
  const industryAverages = useMemo(() => {
    if (vendors.length === 0) return {};

    return comparisonMetrics.reduce(
      (averages, metric) => {
        const values = vendors
          .map((v) => v[metric.key] as number)
          .filter((v) => typeof v === 'number' && v > 0);

        if (values.length > 0) {
          averages[metric.key] =
            values.reduce((sum, val) => sum + val, 0) / values.length;
        }

        return averages;
      },
      {} as Record<MetricKey, number>,
    );
  }, [vendors]);

  // Handle vendor selection
  const handleVendorToggle = useCallback(
    (vendorId: string) => {
      const isSelected = selectedVendors.includes(vendorId);

      if (isSelected) {
        onVendorSelect(selectedVendors.filter((id) => id !== vendorId));
      } else if (selectedVendors.length < maxComparisons) {
        onVendorSelect([...selectedVendors, vendorId]);
      }
    },
    [selectedVendors, onVendorSelect, maxComparisons],
  );

  // Handle metric selection
  const handleMetricToggle = useCallback((metricKey: MetricKey) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricKey)
        ? prev.filter((m) => m !== metricKey)
        : [...prev, metricKey],
    );
  }, []);

  // Format metric value
  const formatMetricValue = useCallback((value: number, format: string) => {
    switch (format) {
      case 'percentage':
        return `${Math.round(value * 100)}%`;
      case 'decimal':
        return value.toFixed(1);
      case 'currency':
        return new Intl.NumberFormat('en-GB', {
          style: 'currency',
          currency: 'GBP',
          minimumFractionDigits: 0,
        }).format(value);
      case 'time':
        return `${Math.round(value)}min`;
      default:
        return value.toLocaleString();
    }
  }, []);

  // Get performance color
  const getPerformanceColor = useCallback(
    (value: number, metric: (typeof comparisonMetrics)[0], average: number) => {
      const isAboveAverage = metric.higherIsBetter
        ? value > average
        : value < average;

      const ratio = metric.higherIsBetter ? value / average : average / value;

      if (ratio > 1.2) return 'text-green-600 bg-green-50';
      if (ratio > 1.1) return 'text-green-500 bg-green-25';
      if (ratio > 0.9) return 'text-blue-600 bg-blue-50';
      if (ratio > 0.8) return 'text-yellow-600 bg-yellow-50';
      return 'text-red-600 bg-red-50';
    },
    [],
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Users className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Vendor Comparison
            </h2>
            <p className="text-sm text-gray-600">
              Compare up to {maxComparisons} vendors side-by-side
            </p>
          </div>
        </div>

        {/* Selected Vendors Count */}
        <div className="flex items-center space-x-2">
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {selectedVendors.length} / {maxComparisons} Selected
          </div>
        </div>
      </div>

      {/* Vendor Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Select Vendors to Compare
        </h3>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Vendor Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-60 overflow-y-auto">
          {filteredVendors.map((vendor) => {
            const isSelected = selectedVendors.includes(vendor.vendorId);
            const canSelect =
              selectedVendors.length < maxComparisons || isSelected;

            return (
              <motion.button
                key={vendor.vendorId}
                onClick={() => canSelect && handleVendorToggle(vendor.vendorId)}
                className={cn(
                  'p-3 border-2 rounded-lg text-left transition-all',
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : canSelect
                      ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50',
                )}
                disabled={!canSelect}
                whileHover={canSelect ? { scale: 1.02 } : {}}
                whileTap={canSelect ? { scale: 0.98 } : {}}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {vendor.vendorName}
                    </div>
                    <div className="text-sm text-gray-600 capitalize">
                      {vendor.vendorType}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="ml-2 flex-shrink-0">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <X className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                  <span>{Math.round(vendor.responseTimeMinutes)}min</span>
                  <span>{Math.round(vendor.bookingSuccessRate * 100)}%</span>
                  <span>★ {vendor.customerSatisfactionScore.toFixed(1)}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Metric Selection */}
      {selectedVendors.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Choose Metrics to Compare
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {comparisonMetrics.map((metric) => {
              const isSelected = selectedMetrics.includes(metric.key);
              const IconComponent = metric.icon;

              return (
                <button
                  key={metric.key}
                  onClick={() => handleMetricToggle(metric.key)}
                  className={cn(
                    'p-3 border-2 rounded-lg text-left transition-all',
                    isSelected
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                  )}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <IconComponent
                      className={cn(
                        'w-4 h-4',
                        isSelected ? 'text-green-600' : 'text-gray-500',
                      )}
                    />
                    <span
                      className={cn(
                        'font-medium text-sm',
                        isSelected ? 'text-green-900' : 'text-gray-700',
                      )}
                    >
                      {metric.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{metric.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison Table */}
      {selectedVendorData.length > 0 && selectedMetrics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-lg overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Performance Comparison
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Comparing {selectedVendorData.length} vendors across{' '}
              {selectedMetrics.length} metrics
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Metric
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Industry Average
                  </th>
                  {selectedVendorData.map((vendor) => (
                    <th
                      key={vendor.vendorId}
                      className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900">
                          {vendor.vendorName}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {vendor.vendorType}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedMetrics.map((metricKey) => {
                  const metric = comparisonMetrics.find(
                    (m) => m.key === metricKey,
                  );
                  if (!metric) return null;

                  const average = industryAverages[metricKey] || 0;
                  const IconComponent = metric.icon;

                  return (
                    <tr key={metricKey} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <IconComponent className="w-5 h-5 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {metric.label}
                            </div>
                            <div className="text-xs text-gray-500">
                              {metric.higherIsBetter
                                ? 'Higher is better'
                                : 'Lower is better'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full inline-block">
                          {formatMetricValue(average, metric.format)}
                        </div>
                      </td>

                      {selectedVendorData.map((vendor) => {
                        const value = vendor[metricKey] as number;
                        const colorClass = getPerformanceColor(
                          value,
                          metric,
                          average,
                        );

                        return (
                          <td
                            key={vendor.vendorId}
                            className="px-6 py-4 whitespace-nowrap text-center"
                          >
                            <div
                              className={cn(
                                'text-sm font-medium px-3 py-1 rounded-full inline-block',
                                colorClass,
                              )}
                            >
                              {formatMetricValue(value, metric.format)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {selectedVendors.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Vendors Selected
          </h3>
          <p className="text-gray-600">
            Select vendors from the list above to start comparing their
            performance metrics.
          </p>
        </div>
      )}
    </div>
  );
};

export default BenchmarkingInterface;
