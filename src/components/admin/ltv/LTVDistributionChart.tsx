'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart,
  TrendingUp,
  TrendingDown,
  Layers,
  Target,
  AlertCircle,
  Info,
  Users,
  DollarSign,
  Activity,
  Filter,
  Eye,
  EyeOff,
  Download,
  Settings,
} from 'lucide-react';
import {
  LTVDistributionData,
  PercentileData,
  OutlierAnalysis,
  SegmentDistribution,
  LTVSegment,
} from '@/types/ltv-analytics';

interface LTVDistributionChartProps {
  ltvDistribution: LTVDistributionData;
  percentiles: PercentileData[];
  outliers: OutlierAnalysis;
  segmentBreakdown: SegmentDistribution[];
  selectedSegments?: string[];
  showOutliers?: boolean;
  showPercentiles?: boolean;
  onSegmentToggle?: (segmentId: string) => void;
  onOutlierClick?: (customerId: string) => void;
  onExport?: () => void;
}

interface HistogramBarProps {
  range: string;
  count: number;
  percentage: number;
  cumulativePercentage: number;
  maxCount: number;
  segmentData?: Array<{
    segmentName: string;
    count: number;
    color: string;
  }>;
  showSegments: boolean;
}

const HistogramBar: React.FC<HistogramBarProps> = ({
  range,
  count,
  percentage,
  cumulativePercentage,
  maxCount,
  segmentData = [],
  showSegments,
}) => {
  const height = (count / maxCount) * 200; // Max height of 200px

  return (
    <div className="flex flex-col items-center group">
      {/* Bar */}
      <div
        className="w-12 bg-primary-500 hover:bg-primary-600 transition-colors duration-200 rounded-t relative flex flex-col justify-end"
        style={{ height: `${height}px`, minHeight: '2px' }}
      >
        {/* Segment breakdown */}
        {showSegments && segmentData.length > 0 && (
          <div className="absolute inset-0 flex flex-col justify-end">
            {segmentData.map((segment, index) => {
              const segmentHeight = (segment.count / count) * height;
              return (
                <div
                  key={segment.segmentName}
                  className="transition-opacity duration-200"
                  style={{
                    height: `${segmentHeight}px`,
                    backgroundColor: segment.color,
                    opacity: 0.8,
                  }}
                  title={`${segment.segmentName}: ${segment.count} (${((segment.count / count) * 100).toFixed(1)}%)`}
                />
              );
            })}
          </div>
        )}

        {/* Tooltip */}
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          <div>{range}</div>
          <div>
            {count} customers ({percentage.toFixed(1)}%)
          </div>
          <div>Cumulative: {cumulativePercentage.toFixed(1)}%</div>
        </div>
      </div>

      {/* Label */}
      <div className="mt-2 text-xs text-gray-600 transform rotate-45 origin-top-left w-16 text-center">
        {range}
      </div>
    </div>
  );
};

interface PercentileIndicatorProps {
  percentiles: PercentileData[];
  distributionData: LTVDistributionData;
}

const PercentileIndicator: React.FC<PercentileIndicatorProps> = ({
  percentiles,
  distributionData,
}) => {
  const getPercentilePosition = (value: number) => {
    const maxValue = Math.max(
      ...distributionData.distribution.map((d) =>
        parseInt(
          d.range.split('-')[1]?.replace('$', '').replace(',', '') || '0',
        ),
      ),
    );
    return (value / maxValue) * 100;
  };

  return (
    <div className="relative h-8 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg mb-4">
      <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-success-200 via-warning-200 to-error-200 rounded-t-lg" />

      {percentiles.map((percentile) => (
        <div
          key={percentile.percentile}
          className="absolute top-0 h-full flex flex-col items-center"
          style={{ left: `${getPercentilePosition(percentile.value)}%` }}
        >
          <div className="w-px h-full bg-gray-600" />
          <div className="absolute -top-8 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            P{percentile.percentile}: ${percentile.value.toLocaleString()}
          </div>
          <div className="absolute -bottom-6 text-xs text-gray-600">
            {percentile.customerCount}
          </div>
        </div>
      ))}
    </div>
  );
};

interface StatisticsCardProps {
  title: string;
  statistics: {
    mean: number;
    median: number;
    mode: number;
    standardDeviation: number;
    skewness: number;
    kurtosis: number;
  };
}

const StatisticsCard: React.FC<StatisticsCardProps> = ({
  title,
  statistics,
}) => {
  const getSkewnessLabel = (skewness: number) => {
    if (skewness > 1)
      return { label: 'Highly Right-skewed', color: 'text-error-600' };
    if (skewness > 0.5)
      return { label: 'Moderately Right-skewed', color: 'text-warning-600' };
    if (skewness < -1)
      return { label: 'Highly Left-skewed', color: 'text-blue-600' };
    if (skewness < -0.5)
      return { label: 'Moderately Left-skewed', color: 'text-blue-600' };
    return { label: 'Nearly Normal', color: 'text-success-600' };
  };

  const getKurtosisLabel = (kurtosis: number) => {
    if (kurtosis > 3) return { label: 'Heavy-tailed', color: 'text-error-600' };
    if (kurtosis < 3) return { label: 'Light-tailed', color: 'text-blue-600' };
    return { label: 'Normal-tailed', color: 'text-success-600' };
  };

  const skewnessInfo = getSkewnessLabel(statistics.skewness);
  const kurtosisInfo = getKurtosisLabel(statistics.kurtosis);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-2xl font-bold text-gray-900">
            ${statistics.mean.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Mean</div>
        </div>

        <div>
          <div className="text-2xl font-bold text-gray-900">
            ${statistics.median.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Median</div>
        </div>

        <div>
          <div className="text-2xl font-bold text-gray-900">
            ${statistics.mode.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Mode</div>
        </div>

        <div>
          <div className="text-2xl font-bold text-gray-900">
            ${statistics.standardDeviation.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Std Dev</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Distribution Shape</span>
          <span className={`text-sm font-medium ${skewnessInfo.color}`}>
            {skewnessInfo.label}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Tail Weight</span>
          <span className={`text-sm font-medium ${kurtosisInfo.color}`}>
            {kurtosisInfo.label}
          </span>
        </div>
      </div>
    </div>
  );
};

interface OutlierAnalysisProps {
  outliers: OutlierAnalysis;
  onOutlierClick?: (customerId: string) => void;
}

const OutlierAnalysisCard: React.FC<OutlierAnalysisProps> = ({
  outliers,
  onOutlierClick,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Outlier Analysis</h3>
        <AlertCircle className="h-5 w-5 text-warning-500" />
      </div>

      {/* Impact Summary */}
      <div className="bg-gradient-to-r from-warning-50 to-orange-50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900">
            Revenue Impact
          </span>
          <span className="text-lg font-bold text-warning-700">
            {outliers.outlierImpact.percentageOfTotal.toFixed(1)}%
          </span>
        </div>
        <div className="text-xs text-gray-600">
          Outliers contribute $
          {outliers.outlierImpact.revenueContribution.toLocaleString()} to total
          revenue
        </div>
      </div>

      {/* High Value Outliers */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
          <TrendingUp className="h-4 w-4 mr-2 text-success-600" />
          High Value Outliers ({outliers.highValueOutliers.length})
        </h4>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {outliers.highValueOutliers.slice(0, 5).map((outlier) => (
            <div
              key={outlier.customerId}
              className="flex items-center justify-between p-2 bg-success-50 rounded text-sm cursor-pointer hover:bg-success-100"
              onClick={() => onOutlierClick?.(outlier.customerId)}
            >
              <div>
                <span className="font-medium">
                  Customer {outlier.customerId.slice(-6)}
                </span>
                <span className="text-gray-600 ml-2">{outlier.segment}</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-success-700">
                  ${outlier.ltv.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  Z-Score: {outlier.zScore.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Low Value Outliers */}
      <div>
        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
          <TrendingDown className="h-4 w-4 mr-2 text-error-600" />
          Low Value Outliers ({outliers.lowValueOutliers.length})
        </h4>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {outliers.lowValueOutliers.slice(0, 5).map((outlier) => (
            <div
              key={outlier.customerId}
              className="flex items-center justify-between p-2 bg-error-50 rounded text-sm cursor-pointer hover:bg-error-100"
              onClick={() => onOutlierClick?.(outlier.customerId)}
            >
              <div>
                <span className="font-medium">
                  Customer {outlier.customerId.slice(-6)}
                </span>
                <span className="text-gray-600 ml-2">{outlier.segment}</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-error-700">
                  ${outlier.ltv.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  Z-Score: {outlier.zScore.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface SegmentOverlayControlsProps {
  segments: SegmentDistribution[];
  selectedSegments: string[];
  onSegmentToggle: (segmentId: string) => void;
}

const SegmentOverlayControls: React.FC<SegmentOverlayControlsProps> = ({
  segments,
  selectedSegments,
  onSegmentToggle,
}) => {
  const segmentColors = [
    '#8B5CF6',
    '#06B6D4',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5A2B',
    '#EC4899',
    '#6B7280',
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h4 className="font-medium text-gray-900 mb-3">Segment Overlay</h4>
      <div className="grid grid-cols-2 gap-2">
        {segments.map((segment, index) => (
          <label
            key={segment.segmentId}
            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
          >
            <input
              type="checkbox"
              checked={selectedSegments.includes(segment.segmentId)}
              onChange={() => onSegmentToggle(segment.segmentId)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: segmentColors[index % segmentColors.length],
              }}
            />
            <span className="text-sm text-gray-700">{segment.segmentName}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export const LTVDistributionChart: React.FC<LTVDistributionChartProps> = ({
  ltvDistribution,
  percentiles,
  outliers,
  segmentBreakdown,
  selectedSegments = [],
  showOutliers = true,
  showPercentiles = true,
  onSegmentToggle,
  onOutlierClick,
  onExport,
}) => {
  const [showSegmentOverlay, setShowSegmentOverlay] = useState(false);
  const [viewMode, setViewMode] = useState<'count' | 'percentage'>('count');

  const maxCount = Math.max(
    ...ltvDistribution.distribution.map((d) => d.count),
  );

  // Prepare segment data for histogram bars
  const enhancedDistribution = useMemo(() => {
    const segmentColors = [
      '#8B5CF6',
      '#06B6D4',
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#8B5A2B',
      '#EC4899',
      '#6B7280',
    ];

    return ltvDistribution.distribution.map((item) => {
      const segmentData = segmentBreakdown
        .filter((segment) => selectedSegments.includes(segment.segmentId))
        .map((segment, index) => {
          // Find corresponding range in segment distribution
          const segmentRangeData = segment.distribution.distribution.find(
            (d) => d.range === item.range,
          );
          return {
            segmentName: segment.segmentName,
            count: segmentRangeData?.count || 0,
            color: segmentColors[index % segmentColors.length],
          };
        })
        .filter((s) => s.count > 0);

      return {
        ...item,
        segmentData,
      };
    });
  }, [ltvDistribution.distribution, segmentBreakdown, selectedSegments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            LTV Distribution Analysis
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Customer lifetime value distribution with statistical analysis
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('count')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                viewMode === 'count'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Count
            </button>
            <button
              onClick={() => setViewMode('percentage')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                viewMode === 'percentage'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Percentage
            </button>
          </div>

          {/* Toggle Controls */}
          <button
            onClick={() => setShowSegmentOverlay(!showSegmentOverlay)}
            className={`inline-flex items-center px-4 py-2.5 border rounded-lg shadow-xs transition-all duration-200 ${
              showSegmentOverlay
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Layers className="h-4 w-4 mr-2" />
            Segments
          </button>

          {/* Export */}
          {onExport && (
            <button
              onClick={onExport}
              className="inline-flex items-center px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-xs hover:shadow-sm transition-all duration-200"
            >
              <Download className="h-4 w-4 mr-2 text-gray-500" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Percentile Indicators */}
      {showPercentiles && (
        <div>
          <h3 className="font-medium text-gray-900 mb-3">
            Percentile Distribution
          </h3>
          <PercentileIndicator
            percentiles={percentiles}
            distributionData={ltvDistribution}
          />
        </div>
      )}

      {/* Main Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-900">Customer Distribution</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>
                {ltvDistribution.totalCustomers.toLocaleString()} customers
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Target className="h-4 w-4" />
              <span>
                Mean: ${ltvDistribution.statistics.mean.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Histogram */}
        <div
          className="flex items-end justify-center space-x-1 mb-8"
          style={{ height: '240px' }}
        >
          {enhancedDistribution.map((item) => (
            <HistogramBar
              key={item.range}
              range={item.range}
              count={viewMode === 'count' ? item.count : item.percentage}
              percentage={item.percentage}
              cumulativePercentage={item.cumulativePercentage}
              maxCount={viewMode === 'count' ? maxCount : 100}
              segmentData={item.segmentData}
              showSegments={showSegmentOverlay && selectedSegments.length > 0}
            />
          ))}
        </div>

        {/* Y-axis label */}
        <div className="text-center text-sm text-gray-600">LTV Range</div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statistics */}
        <StatisticsCard
          title="Distribution Statistics"
          statistics={ltvDistribution.statistics}
        />

        {/* Segment Controls */}
        {onSegmentToggle && (
          <SegmentOverlayControls
            segments={segmentBreakdown}
            selectedSegments={selectedSegments}
            onSegmentToggle={onSegmentToggle}
          />
        )}

        {/* Outlier Analysis */}
        <OutlierAnalysisCard
          outliers={outliers}
          onOutlierClick={onOutlierClick}
        />
      </div>
    </div>
  );
};

export default LTVDistributionChart;
