'use client';

// WS-195: Conversion Funnel Visualization Component
// Visual representation of referral and conversion funnel with wedding industry context

import React, { useMemo } from 'react';
import { ReferralFunnelData, ChartProps } from '@/types/business-metrics';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  UserPlus,
  UserCheck,
  TrendingUp,
  Heart,
  ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversionFunnelVizProps extends Omit<ChartProps, 'data'> {
  data: ReferralFunnelData[];
  weddingSeasonHighlight?: boolean;
}

/**
 * Conversion Funnel Visualization Component
 * Interactive funnel chart for wedding marketplace referral analysis
 * Features:
 * - Visual funnel representation with conversion rates
 * - Wedding season highlighting for seasonal impact
 * - Stage-by-stage breakdown with drop-off analysis
 * - Interactive stage selection for detailed insights
 * - Responsive design for various screen sizes
 */
export function ConversionFunnelViz({
  data,
  height = 400,
  showLegend = true,
  interactive = false,
  weddingSeasonHighlight = false,
}: ConversionFunnelVizProps) {
  // Calculate funnel metrics
  const funnelMetrics = useMemo(() => {
    if (!data.length)
      return { totalDropOff: 0, overallConversion: 0, stages: [] };

    const sortedData = [...data].sort((a, b) => b.count - a.count);
    const totalStart = sortedData[0]?.count || 0;
    const totalEnd = sortedData[sortedData.length - 1]?.count || 0;
    const overallConversion =
      totalStart > 0 ? (totalEnd / totalStart) * 100 : 0;

    const stages = sortedData.map((stage, index) => {
      const previousStage = sortedData[index - 1];
      const dropOffFromPrevious = previousStage
        ? ((previousStage.count - stage.count) / previousStage.count) * 100
        : 0;

      return {
        ...stage,
        widthPercentage: (stage.count / totalStart) * 100,
        dropOffFromPrevious,
      };
    });

    return {
      totalDropOff: ((totalStart - totalEnd) / totalStart) * 100,
      overallConversion,
      stages,
      totalStart,
      totalEnd,
    };
  }, [data]);

  // Get stage icon
  const getStageIcon = (stage: string) => {
    const stageLower = stage.toLowerCase();
    if (stageLower.includes('invited') || stageLower.includes('referred'))
      return <Users className="w-4 h-4" />;
    if (stageLower.includes('visited') || stageLower.includes('clicked'))
      return <UserPlus className="w-4 h-4" />;
    if (stageLower.includes('signed') || stageLower.includes('registered'))
      return <UserCheck className="w-4 h-4" />;
    if (stageLower.includes('activated') || stageLower.includes('converted'))
      return <TrendingUp className="w-4 h-4" />;
    return <Users className="w-4 h-4" />;
  };

  // Get stage color based on conversion rate
  const getStageColor = (
    conversionRate: number,
    weddingBoost: boolean = false,
  ) => {
    const baseColors =
      conversionRate >= 20
        ? 'from-green-400 to-green-600'
        : conversionRate >= 15
          ? 'from-blue-400 to-blue-600'
          : conversionRate >= 10
            ? 'from-yellow-400 to-yellow-600'
            : 'from-red-400 to-red-600';

    return weddingBoost && weddingSeasonHighlight
      ? 'from-pink-400 to-pink-600'
      : baseColors;
  };

  // Get text color for stage
  const getTextColor = (
    conversionRate: number,
    weddingBoost: boolean = false,
  ) => {
    if (weddingBoost && weddingSeasonHighlight) return 'text-pink-700';

    if (conversionRate >= 20) return 'text-green-700';
    if (conversionRate >= 15) return 'text-blue-700';
    if (conversionRate >= 10) return 'text-yellow-700';
    return 'text-red-700';
  };

  if (!funnelMetrics.stages.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No funnel data available</p>
          <p className="text-sm">
            Referral data will appear once traffic begins
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      {/* Funnel Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Conversion Funnel
          </h3>
          <p className="text-sm text-gray-600">
            Wedding marketplace referral journey analysis
          </p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {funnelMetrics.overallConversion.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Overall Conversion</div>
        </div>
      </div>

      {/* Wedding Season Banner */}
      {weddingSeasonHighlight && (
        <div className="mb-4 p-3 bg-pink-50 border border-pink-200 rounded-lg">
          <div className="flex items-center gap-2 text-pink-800">
            <Heart className="w-4 h-4" />
            <span className="text-sm font-medium">
              Peak Wedding Season - Enhanced viral amplification active
            </span>
          </div>
        </div>
      )}

      {/* Funnel Visualization */}
      <div className="relative">
        <div className="space-y-4">
          {funnelMetrics.stages.map((stage, index) => {
            const isWeddingBoosted =
              stage.weddingSeasonImpact && weddingSeasonHighlight;
            const stageColor = getStageColor(
              stage.conversionRate,
              isWeddingBoosted,
            );
            const textColor = getTextColor(
              stage.conversionRate,
              isWeddingBoosted,
            );

            return (
              <div key={stage.stage} className="relative">
                {/* Funnel Stage */}
                <div
                  className={cn(
                    'relative mx-auto transition-all duration-300',
                    interactive &&
                      'hover:shadow-lg hover:scale-105 cursor-pointer',
                  )}
                  style={{
                    width: `${Math.max(stage.widthPercentage, 20)}%`,
                    height: '80px',
                    clipPath:
                      index === funnelMetrics.stages.length - 1
                        ? 'polygon(0 0, 100% 0, 90% 100%, 10% 100%)'
                        : 'polygon(0 0, 100% 0, 85% 100%, 15% 100%)',
                  }}
                >
                  <div
                    className={cn('w-full h-full bg-gradient-to-r', stageColor)}
                  />

                  {/* Stage Content */}
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        {getStageIcon(stage.stage)}
                        <span className="font-medium text-sm capitalize">
                          {stage.stage.replace('_', ' ')}
                        </span>
                        {isWeddingBoosted && (
                          <Heart className="w-3 h-3 text-pink-200" />
                        )}
                      </div>
                      <div className="text-lg font-bold">
                        {stage.count.toLocaleString()}
                      </div>
                      <div className="text-xs opacity-90">
                        {stage.conversionRate.toFixed(1)}% conversion
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stage Details */}
                <div className="mt-2 text-center">
                  <div className={cn('font-medium', textColor)}>
                    {stage.stage.replace('_', ' ').charAt(0).toUpperCase() +
                      stage.stage.replace('_', ' ').slice(1)}
                  </div>

                  {stage.dropOffFromPrevious > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {stage.dropOffFromPrevious.toFixed(1)}% drop-off from
                      previous stage
                    </div>
                  )}

                  {stage.dropOffReason && (
                    <div className="text-xs text-gray-500 italic mt-1">
                      {stage.dropOffReason}
                    </div>
                  )}

                  {isWeddingBoosted && (
                    <Badge className="mt-1 bg-pink-100 text-pink-800 text-xs">
                      Wedding Season Boost
                    </Badge>
                  )}
                </div>

                {/* Arrow Between Stages */}
                {index < funnelMetrics.stages.length - 1 && (
                  <div className="flex justify-center my-2">
                    <ArrowDown className="w-5 h-5 text-gray-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Funnel Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-900">
            {funnelMetrics.totalStart.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total Referred</div>
        </div>

        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-900">
            {funnelMetrics.totalEnd.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Final Conversions</div>
        </div>

        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-red-600">
            {funnelMetrics.totalDropOff.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Total Drop-off</div>
        </div>

        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-blue-600">
            {funnelMetrics.overallConversion.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Success Rate</div>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-green-600 rounded" />
            <span>Excellent (≥20%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-blue-600 rounded" />
            <span>Good (15-19%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded" />
            <span>Average (10-14%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-red-400 to-red-600 rounded" />
            <span>Poor (&lt;10%)</span>
          </div>
          {weddingSeasonHighlight && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-pink-400 to-pink-600 rounded" />
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                Wedding Season
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ConversionFunnelViz;
