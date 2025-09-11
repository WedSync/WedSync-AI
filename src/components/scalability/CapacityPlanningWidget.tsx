'use client';

import React, { useState, useMemo } from 'react';
import { ScalingMetrics, CapacityProjection } from '@/types/scalability';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  Calendar,
  DollarSign,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Target,
  Zap,
  Clock,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

interface CapacityPlanningWidgetProps {
  historicalData?: ScalingMetrics;
  projections: CapacityProjection[];
  weddingSeasonForecast: any[];
  onCapacityAdjust: (adjustment: any) => void;
}

export const CapacityPlanningWidget: React.FC<CapacityPlanningWidgetProps> = ({
  historicalData,
  projections,
  weddingSeasonForecast,
  onCapacityAdjust,
}) => {
  const [timeHorizon, setTimeHorizon] = useState<'1w' | '1m' | '3m' | '6m'>(
    '1m',
  );
  const [viewMode, setViewMode] = useState<'capacity' | 'cost' | 'utilization'>(
    'capacity',
  );
  const [selectedServices, setSelectedServices] = useState<string[]>(['all']);

  // Generate mock capacity planning data
  const capacityData = useMemo(() => {
    const now = new Date();
    const periods =
      timeHorizon === '1w'
        ? 7
        : timeHorizon === '1m'
          ? 30
          : timeHorizon === '3m'
            ? 90
            : 180;

    return Array.from({ length: periods }, (_, i) => {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const isSaturday = date.getDay() === 6;
      const isWeddingSeason = date.getMonth() >= 4 && date.getMonth() <= 9; // May-Oct

      const baseCapacity = 20;
      const seasonalMultiplier = isWeddingSeason ? 1.5 : 1.0;
      const weekendMultiplier = isSaturday ? 2.0 : 1.0;
      const randomVariation = 0.8 + Math.random() * 0.4;

      const projectedDemand = Math.round(
        baseCapacity * seasonalMultiplier * weekendMultiplier * randomVariation,
      );
      const recommendedCapacity = Math.ceil(projectedDemand * 1.2); // 20% buffer
      const currentCapacity = 25;

      return {
        date: date.toISOString().split('T')[0],
        dateLabel: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        projectedDemand,
        recommendedCapacity,
        currentCapacity,
        estimatedCost: recommendedCapacity * 15, // $15 per instance per day
        utilizationRate: (projectedDemand / currentCapacity) * 100,
        isSaturday,
        isWeddingSeason,
        weddingEvents: isSaturday
          ? Math.floor(Math.random() * 20 + 5)
          : Math.floor(Math.random() * 5),
      };
    });
  }, [timeHorizon]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalProjectedDemand = capacityData.reduce(
      (sum, day) => sum + day.projectedDemand,
      0,
    );
    const totalRecommendedCapacity = capacityData.reduce(
      (sum, day) => sum + day.recommendedCapacity,
      0,
    );
    const totalEstimatedCost = capacityData.reduce(
      (sum, day) => sum + day.estimatedCost,
      0,
    );
    const avgUtilization =
      capacityData.reduce((sum, day) => sum + day.utilizationRate, 0) /
      capacityData.length;
    const peakDemand = Math.max(
      ...capacityData.map((day) => day.projectedDemand),
    );
    const totalWeddingEvents = capacityData.reduce(
      (sum, day) => sum + day.weddingEvents,
      0,
    );

    return {
      totalProjectedDemand,
      totalRecommendedCapacity,
      totalEstimatedCost,
      avgUtilization,
      peakDemand,
      totalWeddingEvents,
      capacityGap: totalRecommendedCapacity - 25 * capacityData.length, // Current capacity baseline
      saturdayPeaks: capacityData.filter((day) => day.isSaturday).length,
    };
  }, [capacityData]);

  // Capacity recommendations
  const recommendations = useMemo(() => {
    const recommendations = [];

    if (summaryMetrics.capacityGap > 0) {
      recommendations.push({
        type: 'scale_up',
        priority: 'high',
        title: 'Increase Base Capacity',
        description: `Recommend increasing base capacity by ${Math.round(summaryMetrics.capacityGap / capacityData.length)} instances`,
        impact: `Reduces peak utilization by ~${Math.round((summaryMetrics.capacityGap / capacityData.length / 25) * 100)}%`,
        cost: `+$${Math.round((summaryMetrics.capacityGap * 15) / capacityData.length)}/day`,
      });
    }

    if (summaryMetrics.saturdayPeaks > 0) {
      recommendations.push({
        type: 'schedule',
        priority: 'medium',
        title: 'Pre-scale for Saturdays',
        description: `Set up automated pre-scaling for ${summaryMetrics.saturdayPeaks} upcoming Saturdays`,
        impact: 'Prevents Saturday wedding day performance issues',
        cost: `$${Math.round(summaryMetrics.saturdayPeaks * 100)}/month estimated`,
      });
    }

    if (summaryMetrics.avgUtilization > 80) {
      recommendations.push({
        type: 'optimize',
        priority: 'high',
        title: 'Optimize High Utilization',
        description: `Average utilization is ${summaryMetrics.avgUtilization.toFixed(1)}% - consider performance optimization`,
        impact: 'Could reduce capacity needs by 10-15%',
        cost: 'Development time investment',
      });
    }

    return recommendations;
  }, [summaryMetrics, capacityData]);

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'scale_up':
        return <TrendingUp className="w-4 h-4" />;
      case 'schedule':
        return <Calendar className="w-4 h-4" />;
      case 'optimize':
        return <Zap className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card className="capacity-planning-widget">
      <div className="widget-header p-6 pb-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Capacity Planning & Forecasting
          </h3>

          <div className="header-controls flex items-center space-x-4">
            {/* Time Horizon Selector */}
            <div className="time-horizon-selector flex items-center bg-gray-100 rounded-lg p-1">
              {[
                { key: '1w', label: '1 Week' },
                { key: '1m', label: '1 Month' },
                { key: '3m', label: '3 Months' },
                { key: '6m', label: '6 Months' },
              ].map((period) => (
                <Button
                  key={period.key}
                  variant={timeHorizon === period.key ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeHorizon(period.key as any)}
                  className="px-3 py-1 text-xs"
                >
                  {period.label}
                </Button>
              ))}
            </div>

            {/* View Mode Selector */}
            <div className="view-mode-selector flex items-center bg-gray-100 rounded-lg p-1">
              {[
                {
                  key: 'capacity',
                  label: 'Capacity',
                  icon: <BarChart3 className="w-3 h-3" />,
                },
                {
                  key: 'cost',
                  label: 'Cost',
                  icon: <DollarSign className="w-3 h-3" />,
                },
                {
                  key: 'utilization',
                  label: 'Utilization',
                  icon: <Activity className="w-3 h-3" />,
                },
              ].map((mode) => (
                <Button
                  key={mode.key}
                  variant={viewMode === mode.key ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode(mode.key as any)}
                  className="px-2 py-1 text-xs"
                >
                  {mode.icon}
                  <span className="ml-1">{mode.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="summary-metrics grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="metric-card bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {summaryMetrics.peakDemand}
            </div>
            <div className="text-sm text-blue-700">Peak Demand</div>
          </div>
          <div className="metric-card bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              $
              {(
                summaryMetrics.totalEstimatedCost / capacityData.length
              ).toFixed(0)}
            </div>
            <div className="text-sm text-green-700">Avg Daily Cost</div>
          </div>
          <div className="metric-card bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {summaryMetrics.avgUtilization.toFixed(1)}%
            </div>
            <div className="text-sm text-purple-700">Avg Utilization</div>
          </div>
          <div className="metric-card bg-orange-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {summaryMetrics.totalWeddingEvents}
            </div>
            <div className="text-sm text-orange-700">Wedding Events</div>
          </div>
        </div>
      </div>

      <div className="widget-content p-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Capacity Chart */}
          <div className="xl:col-span-2">
            <div className="capacity-chart">
              <h4 className="text-base font-medium text-gray-900 mb-4">
                {viewMode === 'capacity' && 'Capacity Planning Forecast'}
                {viewMode === 'cost' && 'Cost Projection'}
                {viewMode === 'utilization' && 'Utilization Forecast'}
              </h4>

              <div className="chart-container h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {viewMode === 'capacity' ? (
                    <AreaChart
                      data={capacityData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="dateLabel"
                        stroke="#64748b"
                        fontSize={12}
                      />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                      <Legend />

                      <Area
                        type="monotone"
                        dataKey="currentCapacity"
                        stackId="1"
                        stroke="#6b7280"
                        fill="#f3f4f6"
                        name="Current Capacity"
                      />
                      <Area
                        type="monotone"
                        dataKey="projectedDemand"
                        stackId="2"
                        stroke="#3b82f6"
                        fill="#dbeafe"
                        name="Projected Demand"
                      />
                      <Line
                        type="monotone"
                        dataKey="recommendedCapacity"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        name="Recommended Capacity"
                      />
                    </AreaChart>
                  ) : viewMode === 'cost' ? (
                    <BarChart
                      data={capacityData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="dateLabel"
                        stroke="#64748b"
                        fontSize={12}
                      />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                        }}
                        formatter={(value) => [`$${value}`, 'Estimated Cost']}
                      />
                      <Bar
                        dataKey="estimatedCost"
                        fill="#10b981"
                        name="Daily Cost"
                      />
                    </BarChart>
                  ) : (
                    <LineChart
                      data={capacityData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="dateLabel"
                        stroke="#64748b"
                        fontSize={12}
                      />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                        }}
                        formatter={(value) => [
                          `${value.toFixed(1)}%`,
                          'Utilization',
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="utilizationRate"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        name="Utilization Rate"
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="capacity-recommendations">
            <h4 className="text-base font-medium text-gray-900 mb-4">
              Capacity Recommendations
            </h4>

            {recommendations.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Current capacity planning looks optimal. No immediate actions
                  required.
                </p>
              </div>
            ) : (
              <div className="recommendations-list space-y-4">
                {recommendations.map((recommendation, index) => (
                  <Card
                    key={index}
                    className={`recommendation-card border-l-4 ${getPriorityColor(recommendation.priority)}`}
                  >
                    <div className="p-4">
                      <div className="flex items-start space-x-3">
                        <div
                          className={`recommendation-icon p-2 rounded-lg ${getPriorityColor(recommendation.priority)}`}
                        >
                          {getRecommendationIcon(recommendation.type)}
                        </div>

                        <div className="recommendation-content flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h5 className="font-medium text-gray-900">
                              {recommendation.title}
                            </h5>
                            <Badge
                              className={getPriorityColor(
                                recommendation.priority,
                              )}
                            >
                              {recommendation.priority.toUpperCase()}
                            </Badge>
                          </div>

                          <p className="text-sm text-gray-700 mb-2">
                            {recommendation.description}
                          </p>

                          <div className="recommendation-details space-y-1">
                            <div className="flex items-center space-x-1 text-xs">
                              <TrendingUp className="w-3 h-3 text-green-500" />
                              <span className="text-gray-600">Impact:</span>
                              <span className="text-green-700">
                                {recommendation.impact}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 text-xs">
                              <DollarSign className="w-3 h-3 text-blue-500" />
                              <span className="text-gray-600">Cost:</span>
                              <span className="text-blue-700">
                                {recommendation.cost}
                              </span>
                            </div>
                          </div>

                          <div className="recommendation-actions mt-3">
                            <Button
                              size="sm"
                              onClick={() =>
                                onCapacityAdjust({
                                  type: recommendation.type,
                                  recommendation,
                                })
                              }
                              className="text-xs"
                            >
                              Apply Recommendation
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Wedding Season Planning */}
        <div className="wedding-season-planning mt-8 p-6 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center space-x-3 mb-4">
            <Calendar className="w-5 h-5 text-purple-600" />
            <h4 className="text-base font-medium text-purple-900">
              Wedding Season Planning
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="season-metric">
              <div className="text-2xl font-bold text-purple-700">
                {capacityData.filter((day) => day.isWeddingSeason).length}
              </div>
              <div className="text-sm text-purple-600">Wedding Season Days</div>
            </div>

            <div className="season-metric">
              <div className="text-2xl font-bold text-purple-700">
                {summaryMetrics.saturdayPeaks}
              </div>
              <div className="text-sm text-purple-600">Peak Saturdays</div>
            </div>

            <div className="season-metric">
              <div className="text-2xl font-bold text-purple-700">2.1x</div>
              <div className="text-sm text-purple-600">Peak Multiplier</div>
            </div>
          </div>

          <div className="season-planning-actions mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCapacityAdjust({ type: 'wedding_season_prep' })}
              className="mr-2"
            >
              <Calendar className="w-4 h-4 mr-1" />
              Plan Wedding Season
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onCapacityAdjust({ type: 'saturday_scaling' })}
            >
              <Clock className="w-4 h-4 mr-1" />
              Configure Saturday Auto-scaling
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CapacityPlanningWidget;
