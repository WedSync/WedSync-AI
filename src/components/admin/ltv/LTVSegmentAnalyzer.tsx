'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  ArrowUpDown,
  CheckSquare,
  Square,
  Filter,
  Download,
  AlertTriangle,
  Info,
  Target,
  Zap,
} from 'lucide-react';
import {
  LTVSegment,
  LTVSegmentAnalysis,
  SegmentDistribution,
} from '@/types/ltv-analytics';

interface LTVSegmentAnalyzerProps {
  segments: LTVSegment[];
  selectedSegments: string[];
  comparisonMode: 'absolute' | 'relative' | 'trends';
  distributionData?: SegmentDistribution[];
  onSegmentSelect: (segments: string[]) => void;
  onComparisonModeChange: (mode: 'absolute' | 'relative' | 'trends') => void;
  onExport?: (selectedSegments: string[]) => void;
}

interface SegmentCardProps {
  segment: LTVSegment;
  isSelected: boolean;
  onToggle: () => void;
  comparisonMode: 'absolute' | 'relative' | 'trends';
  baselineSegment?: LTVSegment;
}

const SegmentCard: React.FC<SegmentCardProps> = ({
  segment,
  isSelected,
  onToggle,
  comparisonMode,
  baselineSegment,
}) => {
  const getPerformanceIndicator = (segment: LTVSegment) => {
    if (segment.ltvCacRatio >= 10)
      return { color: 'text-success-600', label: 'Excellent' };
    if (segment.ltvCacRatio >= 5)
      return { color: 'text-blue-600', label: 'Good' };
    if (segment.ltvCacRatio >= 3)
      return { color: 'text-warning-600', label: 'Average' };
    return { color: 'text-error-600', label: 'Poor' };
  };

  const performance = getPerformanceIndicator(segment);

  const relativeChange = baselineSegment
    ? ((segment.averageLTV - baselineSegment.averageLTV) /
        baselineSegment.averageLTV) *
      100
    : 0;

  return (
    <div
      className={`relative border rounded-xl p-6 cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-primary-300 bg-primary-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
      onClick={onToggle}
    >
      {/* Selection Indicator */}
      <div className="absolute top-4 right-4">
        {isSelected ? (
          <CheckSquare className="h-5 w-5 text-primary-600" />
        ) : (
          <Square className="h-5 w-5 text-gray-400" />
        )}
      </div>

      {/* Segment Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">{segment.name}</h3>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              segment.type === 'vendor_type'
                ? 'bg-blue-100 text-blue-800'
                : segment.type === 'plan_tier'
                  ? 'bg-purple-100 text-purple-800'
                  : segment.type === 'acquisition_channel'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
            }`}
          >
            {segment.type.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          <span>{segment.customerCount.toLocaleString()} customers</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Average LTV</span>
          <div className="text-right">
            <span className="font-semibold text-gray-900">
              ${segment.averageLTV.toLocaleString()}
            </span>
            {comparisonMode === 'relative' && baselineSegment && (
              <div
                className={`text-xs ${relativeChange >= 0 ? 'text-success-600' : 'text-error-600'}`}
              >
                {relativeChange >= 0 ? '+' : ''}
                {relativeChange.toFixed(1)}%
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">LTV:CAC Ratio</span>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-900">
              {segment.ltvCacRatio.toFixed(1)}:1
            </span>
            <span className={`text-xs font-medium ${performance.color}`}>
              {performance.label}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Payback Period</span>
          <span className="font-semibold text-gray-900">
            {segment.paybackPeriod.toFixed(1)} mo
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Churn Rate</span>
          <span className="font-semibold text-gray-900">
            {segment.churnRate.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Confidence Interval */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Confidence Interval ({segment.confidenceInterval.confidence}%)
          </span>
          <span>
            ${segment.confidenceInterval.lower.toLocaleString()} - $
            {segment.confidenceInterval.upper.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

interface ComparisonTableProps {
  selectedSegments: LTVSegment[];
  comparisonMode: 'absolute' | 'relative' | 'trends';
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({
  selectedSegments,
  comparisonMode,
}) => {
  const baselineSegment = selectedSegments[0];

  const metrics = [
    {
      key: 'averageLTV',
      label: 'Average LTV',
      format: (value: number) => `$${value.toLocaleString()}`,
    },
    {
      key: 'customerCount',
      label: 'Customer Count',
      format: (value: number) => value.toLocaleString(),
    },
    {
      key: 'totalRevenue',
      label: 'Total Revenue',
      format: (value: number) => `$${value.toLocaleString()}`,
    },
    {
      key: 'ltvCacRatio',
      label: 'LTV:CAC Ratio',
      format: (value: number) => `${value.toFixed(1)}:1`,
    },
    {
      key: 'paybackPeriod',
      label: 'Payback Period',
      format: (value: number) => `${value.toFixed(1)} mo`,
    },
    {
      key: 'churnRate',
      label: 'Churn Rate',
      format: (value: number) => `${value.toFixed(1)}%`,
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Segment Comparison</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Metric
              </th>
              {selectedSegments.map((segment, index) => (
                <th
                  key={segment.id}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {segment.name}
                  {index === 0 && comparisonMode === 'relative' && (
                    <span className="ml-2 text-blue-600">(Baseline)</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {metrics.map((metric, metricIndex) => (
              <tr
                key={metric.key}
                className={metricIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {metric.label}
                </td>
                {selectedSegments.map((segment, segmentIndex) => {
                  const value = segment[
                    metric.key as keyof LTVSegment
                  ] as number;
                  const formattedValue = metric.format(value);

                  let relativeChange = 0;
                  if (
                    comparisonMode === 'relative' &&
                    segmentIndex > 0 &&
                    baselineSegment
                  ) {
                    const baseValue = baselineSegment[
                      metric.key as keyof LTVSegment
                    ] as number;
                    relativeChange = ((value - baseValue) / baseValue) * 100;
                  }

                  return (
                    <td
                      key={segment.id}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    >
                      <div>
                        {formattedValue}
                        {comparisonMode === 'relative' && segmentIndex > 0 && (
                          <div
                            className={`text-xs font-medium ${
                              relativeChange >= 0
                                ? 'text-success-600'
                                : 'text-error-600'
                            }`}
                          >
                            {relativeChange >= 0 ? '+' : ''}
                            {relativeChange.toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface StatisticalInsightsProps {
  selectedSegments: LTVSegment[];
}

const StatisticalInsights: React.FC<StatisticalInsightsProps> = ({
  selectedSegments,
}) => {
  const insights = useMemo(() => {
    if (selectedSegments.length < 2) return [];

    const insights: Array<{
      type: 'success' | 'warning' | 'info' | 'error';
      icon: React.ReactNode;
      title: string;
      description: string;
    }> = [];

    // Best performer
    const bestSegment = selectedSegments.reduce((best, current) =>
      current.ltvCacRatio > best.ltvCacRatio ? current : best,
    );

    insights.push({
      type: 'success',
      icon: <Target className="h-5 w-5" />,
      title: 'Top Performer',
      description: `${bestSegment.name} leads with ${bestSegment.ltvCacRatio.toFixed(1)}:1 LTV:CAC ratio`,
    });

    // Significant differences
    const ltvValues = selectedSegments.map((s) => s.averageLTV);
    const maxLtv = Math.max(...ltvValues);
    const minLtv = Math.min(...ltvValues);
    const difference = ((maxLtv - minLtv) / minLtv) * 100;

    if (difference > 50) {
      insights.push({
        type: 'warning',
        icon: <AlertTriangle className="h-5 w-5" />,
        title: 'High Variance',
        description: `${difference.toFixed(0)}% difference between highest and lowest LTV segments`,
      });
    }

    // Underperforming segments
    const poorSegments = selectedSegments.filter((s) => s.ltvCacRatio < 3);
    if (poorSegments.length > 0) {
      insights.push({
        type: 'error',
        icon: <TrendingUp className="h-5 w-5" />,
        title: 'Optimization Opportunity',
        description: `${poorSegments.length} segment(s) below 3:1 LTV:CAC threshold need attention`,
      });
    }

    // High confidence segments
    const highConfidenceSegments = selectedSegments.filter(
      (s) => s.confidenceInterval.confidence >= 95,
    );
    if (highConfidenceSegments.length > 0) {
      insights.push({
        type: 'info',
        icon: <Zap className="h-5 w-5" />,
        title: 'High Confidence Data',
        description: `${highConfidenceSegments.length} segment(s) have 95%+ confidence intervals`,
      });
    }

    return insights;
  }, [selectedSegments]);

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Statistical Insights</h3>
      <div className="space-y-4">
        {insights.map((insight, index) => {
          const colors = {
            success: 'bg-success-50 border-success-200 text-success-700',
            warning: 'bg-warning-50 border-warning-200 text-warning-700',
            info: 'bg-blue-50 border-blue-200 text-blue-700',
            error: 'bg-error-50 border-error-200 text-error-700',
          };

          return (
            <div
              key={index}
              className={`p-4 rounded-lg border ${colors[insight.type]}`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">{insight.icon}</div>
                <div>
                  <h4 className="font-medium text-sm mb-1">{insight.title}</h4>
                  <p className="text-sm">{insight.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const LTVSegmentAnalyzer: React.FC<LTVSegmentAnalyzerProps> = ({
  segments,
  selectedSegments,
  comparisonMode,
  distributionData,
  onSegmentSelect,
  onComparisonModeChange,
  onExport,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<
    'ltv' | 'ratio' | 'customers' | 'revenue'
  >('ltv');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter and sort segments
  const filteredSegments = useMemo(() => {
    let filtered = segments;

    if (filterType !== 'all') {
      filtered = filtered.filter((segment) => segment.type === filterType);
    }

    return filtered.sort((a, b) => {
      let aValue: number, bValue: number;

      switch (sortBy) {
        case 'ltv':
          aValue = a.averageLTV;
          bValue = b.averageLTV;
          break;
        case 'ratio':
          aValue = a.ltvCacRatio;
          bValue = b.ltvCacRatio;
          break;
        case 'customers':
          aValue = a.customerCount;
          bValue = b.customerCount;
          break;
        case 'revenue':
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
          break;
        default:
          aValue = a.averageLTV;
          bValue = b.averageLTV;
      }

      return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
    });
  }, [segments, filterType, sortBy, sortDirection]);

  const selectedSegmentObjects = useMemo(() => {
    return segments.filter((segment) => selectedSegments.includes(segment.id));
  }, [segments, selectedSegments]);

  const handleSegmentToggle = (segmentId: string) => {
    const newSelection = selectedSegments.includes(segmentId)
      ? selectedSegments.filter((id) => id !== segmentId)
      : [...selectedSegments, segmentId];
    onSegmentSelect(newSelection);
  };

  const handleSelectAll = () => {
    onSegmentSelect(filteredSegments.map((s) => s.id));
  };

  const handleClearAll = () => {
    onSegmentSelect([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Segment Analysis
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Compare LTV performance across customer segments
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Comparison Mode Toggle */}
          <div className="flex items-center bg-gray-50 rounded-lg p-1">
            {(['absolute', 'relative', 'trends'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onComparisonModeChange(mode)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 capitalize ${
                  comparisonMode === mode
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Export Button */}
          {onExport && selectedSegments.length > 0 && (
            <button
              onClick={() => onExport(selectedSegments)}
              className="inline-flex items-center px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4">
          {/* Filter by Type */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
          >
            <option value="all">All Types</option>
            <option value="vendor_type">Vendor Type</option>
            <option value="plan_tier">Plan Tier</option>
            <option value="acquisition_channel">Acquisition Channel</option>
            <option value="geographic">Geographic</option>
          </select>

          {/* Sort Controls */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
          >
            <option value="ltv">Sort by LTV</option>
            <option value="ratio">Sort by LTV:CAC</option>
            <option value="customers">Sort by Customers</option>
            <option value="revenue">Sort by Revenue</option>
          </select>

          <button
            onClick={() =>
              setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
            }
            className="p-2.5 bg-white border border-gray-300 rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100"
          >
            <ArrowUpDown
              className={`h-4 w-4 text-gray-500 ${sortDirection === 'desc' ? 'rotate-180' : ''} transition-transform duration-200`}
            />
          </button>
        </div>

        {/* Selection Controls */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            {selectedSegments.length} of {filteredSegments.length} selected
          </span>
          <button
            onClick={handleSelectAll}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Select All
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={handleClearAll}
            className="text-sm text-gray-600 hover:text-gray-700 font-medium"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Segment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSegments.map((segment) => (
          <SegmentCard
            key={segment.id}
            segment={segment}
            isSelected={selectedSegments.includes(segment.id)}
            onToggle={() => handleSegmentToggle(segment.id)}
            comparisonMode={comparisonMode}
            baselineSegment={selectedSegmentObjects[0]}
          />
        ))}
      </div>

      {/* Comparison Table */}
      {selectedSegmentObjects.length > 1 && (
        <ComparisonTable
          selectedSegments={selectedSegmentObjects}
          comparisonMode={comparisonMode}
        />
      )}

      {/* Statistical Insights */}
      {selectedSegmentObjects.length > 1 && (
        <StatisticalInsights selectedSegments={selectedSegmentObjects} />
      )}
    </div>
  );
};

export default LTVSegmentAnalyzer;
