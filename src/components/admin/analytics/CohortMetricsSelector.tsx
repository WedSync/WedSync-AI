'use client';

import React from 'react';
import {
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  Users,
} from 'lucide-react';
import { CohortMetric, TimeRange } from '@/types/cohort-analysis';

interface CohortMetricsSelectorProps {
  selectedMetric: CohortMetric;
  onMetricChange: (metric: CohortMetric) => void;
  timeRangeOptions: TimeRange[];
  selectedTimeRange: number;
  onTimeRangeChange: (range: number) => void;
  onExport?: () => void;
  isLoading?: boolean;
  className?: string;
}

const CohortMetricsSelector: React.FC<CohortMetricsSelectorProps> = ({
  selectedMetric,
  onMetricChange,
  timeRangeOptions,
  selectedTimeRange,
  onTimeRangeChange,
  onExport,
  isLoading = false,
  className = '',
}) => {
  const metricOptions = [
    {
      id: 'retention' as CohortMetric,
      label: 'Retention Analysis',
      description: 'Track supplier retention rates by cohort',
      icon: Users,
      color: 'primary',
    },
    {
      id: 'revenue' as CohortMetric,
      label: 'Revenue Performance',
      description: 'Analyze revenue generation by cohort',
      icon: DollarSign,
      color: 'success',
    },
    {
      id: 'ltv' as CohortMetric,
      label: 'Lifetime Value',
      description: 'Calculate LTV progression by cohort',
      icon: TrendingUp,
      color: 'blue',
    },
  ];

  const getMetricButtonClass = (metric: CohortMetric, baseColor: string) => {
    const isSelected = selectedMetric === metric;

    if (baseColor === 'primary') {
      return isSelected
        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
        : 'bg-white text-primary-700 border-primary-200 hover:bg-primary-50 hover:border-primary-300';
    } else if (baseColor === 'success') {
      return isSelected
        ? 'bg-success-600 text-white border-success-600 shadow-sm'
        : 'bg-white text-success-700 border-success-200 hover:bg-success-50 hover:border-success-300';
    } else {
      return isSelected
        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
        : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50 hover:border-blue-300';
    }
  };

  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl p-6 shadow-xs ${className}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
        {/* Metric Selection */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
            Analysis Type
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {metricOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => onMetricChange(option.id)}
                  disabled={isLoading}
                  className={`
                    flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200
                    ${getMetricButtonClass(option.id, option.color)}
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    hover:shadow-md focus:outline-none focus:ring-4 focus:ring-primary-100
                  `}
                >
                  <Icon className="w-6 h-6 mb-2" />
                  <span className="font-medium text-sm text-center mb-1">
                    {option.label}
                  </span>
                  <span className="text-xs text-center opacity-75">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Range Selection */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-primary-600" />
            Analysis Period
          </h3>

          <div className="flex flex-wrap gap-2">
            {timeRangeOptions.map((range) => (
              <button
                key={range.months}
                onClick={() => onTimeRangeChange(range.months)}
                disabled={isLoading}
                className={`
                  px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200
                  ${
                    selectedTimeRange === range.months
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                  }
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  focus:outline-none focus:ring-4 focus:ring-primary-100
                `}
              >
                {range.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-600">
            {
              timeRangeOptions.find((r) => r.months === selectedTimeRange)
                ?.description
            }
          </p>
        </div>

        {/* Export Controls */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 flex items-center">
            <Download className="w-5 h-5 mr-2 text-primary-600" />
            Export Data
          </h3>

          <div className="flex flex-col space-y-2">
            {onExport && (
              <button
                onClick={onExport}
                disabled={isLoading}
                className={`
                  px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200
                  rounded-lg hover:bg-primary-100 hover:border-primary-300 transition-all duration-200
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  focus:outline-none focus:ring-4 focus:ring-primary-100
                  flex items-center justify-center
                `}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Analysis
              </button>
            )}

            <select
              className="
                px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg
                text-gray-700 focus:outline-none focus:ring-4 focus:ring-primary-100
                focus:border-primary-300 transition-all duration-200
              "
              disabled={isLoading}
            >
              <option value="executive">Executive Summary</option>
              <option value="detailed">Detailed Report</option>
              <option value="raw">Raw Data (CSV)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Current Selection Summary */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Currently viewing: <strong>{selectedMetric.toUpperCase()}</strong>{' '}
            analysis over <strong>{selectedTimeRange} months</strong>
          </span>

          {isLoading && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
              <span>Loading analysis...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CohortMetricsSelector;
