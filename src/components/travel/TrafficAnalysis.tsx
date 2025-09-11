'use client';

import React from 'react';
import { Card, Badge, Progress } from '@/components/untitled-ui';
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  Clock,
  BarChart3,
  Info,
} from 'lucide-react';
import { TravelRoute } from '@/types/travel';

interface TrafficAnalysisProps {
  route: TravelRoute;
}

export function TrafficAnalysis({ route }: TrafficAnalysisProps) {
  // Calculate traffic statistics
  const totalSegments = route.segments.length;
  const heavyTrafficSegments = route.segments.filter(
    (s) => s.traffic.severity === 'heavy',
  ).length;
  const moderateTrafficSegments = route.segments.filter(
    (s) => s.traffic.severity === 'moderate',
  ).length;
  const lightTrafficSegments = route.segments.filter(
    (s) => s.traffic.severity === 'light',
  ).length;

  const totalDelay = route.segments.reduce(
    (sum, segment) => sum + segment.traffic.currentDelay,
    0,
  );
  const averageDelay =
    totalSegments > 0 ? Math.round(totalDelay / totalSegments) : 0;

  const trafficScore = Math.max(
    0,
    Math.min(
      100,
      100 -
        (heavyTrafficSegments * 40 +
          moderateTrafficSegments * 20 +
          totalDelay * 2),
    ),
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return { color: 'text-green-600', bg: 'bg-green-500' };
    if (score >= 60) return { color: 'text-yellow-600', bg: 'bg-yellow-500' };
    if (score >= 40) return { color: 'text-orange-600', bg: 'bg-orange-500' };
    return { color: 'text-red-600', bg: 'bg-red-500' };
  };

  const scoreColor = getScoreColor(trafficScore);

  const getTrafficIcon = (severity: string) => {
    switch (severity) {
      case 'heavy':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'moderate':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'light':
        return <Activity className="w-4 h-4 text-green-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRecommendations = () => {
    const recommendations = [];

    if (heavyTrafficSegments > 0) {
      recommendations.push({
        type: 'warning',
        icon: AlertTriangle,
        color: 'text-red-600',
        title: 'Heavy Traffic Alert',
        message: `${heavyTrafficSegments} segment(s) have heavy traffic. Consider alternative departure times.`,
      });
    }

    if (totalDelay > 20) {
      recommendations.push({
        type: 'info',
        icon: Clock,
        color: 'text-blue-600',
        title: 'High Delay Expected',
        message: `Current traffic adds ${totalDelay} minutes to your journey. Leave earlier if possible.`,
      });
    }

    if (trafficScore < 50) {
      recommendations.push({
        type: 'suggestion',
        icon: TrendingUp,
        color: 'text-purple-600',
        title: 'Route Optimization',
        message:
          'Consider using route optimization to find alternative paths with better traffic conditions.',
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'success',
        icon: Activity,
        color: 'text-green-600',
        title: 'Good Traffic Conditions',
        message: 'Current traffic conditions are favorable for your journey.',
      });
    }

    return recommendations;
  };

  const recommendations = getRecommendations();

  return (
    <div className="space-y-4">
      {/* Traffic Score */}
      <Card className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">
                Traffic Analysis
              </h4>
              <p className="text-sm text-gray-500">
                Current conditions assessment
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Traffic Score */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-2">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${trafficScore}, 100`}
                  className={
                    scoreColor.bg.replace('bg-', 'text-') + ' opacity-20'
                  }
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${trafficScore}, 100`}
                  className={scoreColor.bg.replace('bg-', 'text-')}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-lg font-bold ${scoreColor.color}`}>
                  {trafficScore}
                </span>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Traffic Score
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {trafficScore >= 80
                ? 'Excellent'
                : trafficScore >= 60
                  ? 'Good'
                  : trafficScore >= 40
                    ? 'Fair'
                    : 'Poor'}
            </p>
          </div>

          {/* Traffic Breakdown */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center w-8 h-8 mx-auto rounded-full bg-green-50 dark:bg-green-900/20 mb-2">
                <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {lightTrafficSegments}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Light Traffic
              </p>
            </div>

            <div>
              <div className="flex items-center justify-center w-8 h-8 mx-auto rounded-full bg-yellow-50 dark:bg-yellow-900/20 mb-2">
                <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {moderateTrafficSegments}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Moderate Traffic
              </p>
            </div>

            <div>
              <div className="flex items-center justify-center w-8 h-8 mx-auto rounded-full bg-red-50 dark:bg-red-900/20 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {heavyTrafficSegments}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Heavy Traffic
              </p>
            </div>
          </div>

          {/* Average Delay */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Average Delay per Segment
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {averageDelay} minutes
              </span>
            </div>
            <Progress
              value={Math.min(100, (averageDelay / 30) * 100)}
              className="h-2"
            />
          </div>
        </div>
      </Card>

      {/* Detailed Segment Analysis */}
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-gray-600" />
          <h4 className="font-medium text-gray-900 dark:text-white">
            Segment-by-Segment Analysis
          </h4>
        </div>

        <div className="space-y-3">
          {route.segments.map((segment, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-2">
                {getTrafficIcon(segment.traffic.severity)}
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Segment {index + 1}
                </span>
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {segment.traffic.description}
                  </span>
                  <div className="flex items-center gap-2">
                    {segment.traffic.currentDelay > 0 && (
                      <Badge
                        variant="outline"
                        className="text-xs text-red-600 border-red-200"
                      >
                        +{segment.traffic.currentDelay}m
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        segment.traffic.severity === 'light'
                          ? 'text-green-600 border-green-200'
                          : segment.traffic.severity === 'moderate'
                            ? 'text-yellow-600 border-yellow-200'
                            : 'text-red-600 border-red-200'
                      }`}
                    >
                      {segment.traffic.severity}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recommendations */}
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Info className="w-5 h-5 text-gray-600" />
          <h4 className="font-medium text-gray-900 dark:text-white">
            Traffic Recommendations
          </h4>
        </div>

        <div className="space-y-3">
          {recommendations.map((recommendation, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <div className={`mt-0.5 ${recommendation.color}`}>
                <recommendation.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {recommendation.title}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {recommendation.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
