'use client';

import React, { useMemo, useState } from 'react';
import {
  CohortData,
  CohortMetric,
  CohortHeatmapCell,
} from '@/types/cohort-analysis';

interface CohortAnalysisHeatmapProps {
  cohortData: CohortData[];
  selectedMetric: CohortMetric;
  timeRange: number;
  onCohortSelect: (cohort: CohortData) => void;
  className?: string;
}

const CohortAnalysisHeatmap: React.FC<CohortAnalysisHeatmapProps> = ({
  cohortData,
  selectedMetric,
  timeRange,
  onCohortSelect,
  className = '',
}) => {
  const [hoveredCell, setHoveredCell] = useState<CohortHeatmapCell | null>(
    null,
  );

  // Transform cohort data into heatmap cells
  const heatmapData = useMemo(() => {
    const cells: CohortHeatmapCell[] = [];

    cohortData.forEach((cohort) => {
      const monthsToShow = Math.min(cohort.retention_rates.length, timeRange);

      for (let monthIndex = 0; monthIndex < monthsToShow; monthIndex++) {
        let value: number;
        let formattedValue: string;

        switch (selectedMetric) {
          case 'retention':
            value = cohort.retention_rates[monthIndex] || 0;
            formattedValue = `${(value * 100).toFixed(1)}%`;
            break;
          case 'revenue':
            value = cohort.revenue_progression[monthIndex] || 0;
            formattedValue = `$${(value / 1000).toFixed(1)}k`;
            break;
          case 'ltv':
            value = cohort.ltv_calculated / (monthIndex + 1);
            formattedValue = `$${(value / 1000).toFixed(1)}k`;
            break;
          default:
            value = 0;
            formattedValue = '0%';
        }

        // Color intensity calculation
        let colorIntensity: number;
        if (selectedMetric === 'retention') {
          colorIntensity = value; // 0-1 range
        } else {
          // Normalize revenue/LTV values
          const maxValue = Math.max(
            ...cohortData.map((c) =>
              selectedMetric === 'revenue'
                ? Math.max(...c.revenue_progression)
                : c.ltv_calculated,
            ),
          );
          colorIntensity = maxValue > 0 ? value / maxValue : 0;
        }

        cells.push({
          cohort_month: cohort.cohort_start,
          month_index: monthIndex,
          value,
          color_intensity: colorIntensity,
          formatted_value: formattedValue,
          tooltip_data: {
            cohort_start: cohort.cohort_start,
            month_label: `Month ${monthIndex + 1}`,
            metric_value: value,
            cohort_size: cohort.cohort_size,
            benchmark_comparison:
              colorIntensity > 0.8
                ? 'Above Average'
                : colorIntensity > 0.5
                  ? 'Average'
                  : 'Below Average',
          },
        });
      }
    });

    return cells;
  }, [cohortData, selectedMetric, timeRange]);

  // Get color class based on intensity and metric
  const getCellColorClass = (intensity: number): string => {
    if (intensity >= 0.8) {
      return 'bg-success-500 text-white';
    } else if (intensity >= 0.6) {
      return 'bg-success-300 text-success-900';
    } else if (intensity >= 0.4) {
      return 'bg-warning-300 text-warning-900';
    } else if (intensity >= 0.2) {
      return 'bg-warning-400 text-warning-900';
    } else {
      return 'bg-error-400 text-white';
    }
  };

  // Group cells by cohort for rendering
  const cohortGroups = useMemo(() => {
    const groups: { [key: string]: CohortHeatmapCell[] } = {};
    heatmapData.forEach((cell) => {
      if (!groups[cell.cohort_month]) {
        groups[cell.cohort_month] = [];
      }
      groups[cell.cohort_month].push(cell);
    });

    // Sort cohorts by date
    return Object.entries(groups).sort(
      ([a], [b]) => new Date(a).getTime() - new Date(b).getTime(),
    );
  }, [heatmapData]);

  const handleCellClick = (cohortMonth: string) => {
    const cohort = cohortData.find((c) => c.cohort_start === cohortMonth);
    if (cohort) {
      onCohortSelect(cohort);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Cohort Analysis Heatmap - {selectedMetric.toUpperCase()}
        </h3>
        <p className="text-sm text-gray-600">
          {selectedMetric === 'retention'
            ? 'Supplier retention rates by signup cohort and time period'
            : selectedMetric === 'revenue'
              ? 'Revenue performance by cohort over time'
              : 'Lifetime value analysis by cohort progression'}
        </p>
      </div>

      {/* Heatmap Container */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        {/* Month Headers */}
        <div
          className="grid gap-1 mb-4"
          style={{
            gridTemplateColumns: `140px repeat(${timeRange}, minmax(60px, 1fr))`,
          }}
        >
          <div className="text-sm font-medium text-gray-700 py-2">
            Cohort Start
          </div>
          {Array.from({ length: timeRange }, (_, i) => (
            <div
              key={i}
              className="text-xs font-medium text-gray-600 text-center py-2"
            >
              Month {i + 1}
            </div>
          ))}
        </div>

        {/* Heatmap Grid */}
        <div className="space-y-1">
          {cohortGroups.map(([cohortMonth, cells]) => (
            <div
              key={cohortMonth}
              className="grid gap-1"
              style={{
                gridTemplateColumns: `140px repeat(${timeRange}, minmax(60px, 1fr))`,
              }}
            >
              {/* Cohort Label */}
              <div className="text-sm font-medium text-gray-900 py-3 px-2 bg-gray-50 rounded-lg flex items-center">
                {new Date(cohortMonth).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}
              </div>

              {/* Heatmap Cells */}
              {cells
                .sort((a, b) => a.month_index - b.month_index)
                .map((cell) => (
                  <div
                    key={`${cell.cohort_month}-${cell.month_index}`}
                    className={`
                    h-12 rounded-lg cursor-pointer transition-all duration-200 
                    hover:scale-105 hover:shadow-md border border-transparent
                    flex items-center justify-center text-xs font-medium
                    ${getCellColorClass(cell.color_intensity)}
                  `}
                    onMouseEnter={() => setHoveredCell(cell)}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => handleCellClick(cell.cohort_month)}
                  >
                    {cell.formatted_value}
                  </div>
                ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Performance Legend
            </h4>
            <div className="flex items-center space-x-4 text-xs text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded bg-success-500"></div>
                <span>Excellent (80%+)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded bg-success-300"></div>
                <span>Good (60-80%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded bg-warning-300"></div>
                <span>Fair (40-60%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded bg-warning-400"></div>
                <span>Poor (20-40%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded bg-error-400"></div>
                <span>Critical (&lt;20%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <div
          className="absolute z-50 bg-gray-900 text-white p-3 rounded-lg shadow-xl text-xs whitespace-nowrap pointer-events-none"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -120%)',
          }}
        >
          <div className="space-y-1">
            <div className="font-medium">
              {hoveredCell.tooltip_data.cohort_start}
            </div>
            <div>{hoveredCell.tooltip_data.month_label}</div>
            <div>Value: {hoveredCell.formatted_value}</div>
            <div>
              Cohort Size:{' '}
              {hoveredCell.tooltip_data.cohort_size.toLocaleString()}
            </div>
            <div>
              Performance: {hoveredCell.tooltip_data.benchmark_comparison}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CohortAnalysisHeatmap;
