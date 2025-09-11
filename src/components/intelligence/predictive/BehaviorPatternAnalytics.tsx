// WS-055: Behavior Pattern Analytics Component
// Analyzes and displays client behavior patterns for strategic insights

'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
} from 'lucide-react';

import type { BehaviorPattern } from '@/lib/ml/prediction/types';

interface BehaviorPatternAnalyticsProps {
  patterns: BehaviorPattern[];
  clientData: { client_id: string }[];
  detailed?: boolean;
}

interface PatternSummary {
  totalPatterns: number;
  mostCommonPattern: string;
  avgConfidence: number;
  successRate: number;
  revenueImpact: number;
}

interface PatternInsight {
  pattern_type: string;
  count: number;
  avgConfidence: number;
  avgBookingProbability: number;
  avgTimeline: number;
  successRate: number;
  recommendedActions: string[];
}

export function BehaviorPatternAnalytics({
  patterns,
  clientData,
  detailed = false,
}: BehaviorPatternAnalyticsProps) {
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<
    'overview' | 'patterns' | 'insights'
  >('overview');

  // Calculate pattern insights
  const patternInsights = useMemo((): PatternInsight[] => {
    if (!patterns.length) return [];

    const patternGroups = patterns.reduce(
      (acc, pattern) => {
        if (!acc[pattern.pattern_type]) {
          acc[pattern.pattern_type] = [];
        }
        acc[pattern.pattern_type].push(pattern);
        return acc;
      },
      {} as Record<string, BehaviorPattern[]>,
    );

    return Object.entries(patternGroups)
      .map(([type, groupPatterns]) => {
        const avgConfidence =
          groupPatterns.reduce((sum, p) => sum + p.confidence, 0) /
          groupPatterns.length;
        const avgBookingProbability =
          groupPatterns.reduce(
            (sum, p) => sum + p.typical_outcomes.booking_probability,
            0,
          ) / groupPatterns.length;
        const avgTimeline =
          groupPatterns.reduce(
            (sum, p) => sum + p.typical_outcomes.average_timeline_to_booking,
            0,
          ) / groupPatterns.length;
        const avgSuccessRate =
          groupPatterns.reduce(
            (sum, p) => sum + p.typical_outcomes.success_rate,
            0,
          ) / groupPatterns.length;

        // Get most common recommended actions
        const actionCounts = groupPatterns
          .flatMap((p) => p.recommended_actions)
          .reduce(
            (acc, action) => {
              acc[action] = (acc[action] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          );

        const topActions = Object.entries(actionCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([action]) => action);

        return {
          pattern_type: type,
          count: groupPatterns.length,
          avgConfidence,
          avgBookingProbability,
          avgTimeline,
          successRate: avgSuccessRate,
          recommendedActions: topActions,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [patterns]);

  // Calculate summary metrics
  const summary = useMemo((): PatternSummary => {
    if (!patterns.length) {
      return {
        totalPatterns: 0,
        mostCommonPattern: 'None',
        avgConfidence: 0,
        successRate: 0,
        revenueImpact: 0,
      };
    }

    const avgConfidence =
      patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    const avgSuccessRate =
      patterns.reduce((sum, p) => sum + p.typical_outcomes.success_rate, 0) /
      patterns.length;
    const mostCommon = patternInsights[0]?.pattern_type || 'None';

    // Estimate revenue impact based on pattern success rates
    const revenueImpact = patterns.reduce((sum, p) => {
      return sum + p.typical_outcomes.booking_probability * 15000; // Avg wedding value
    }, 0);

    return {
      totalPatterns: patterns.length,
      mostCommonPattern: mostCommon,
      avgConfidence,
      successRate: avgSuccessRate,
      revenueImpact,
    };
  }, [patterns, patternInsights]);

  const getPatternIcon = (patternType: string) => {
    switch (patternType) {
      case 'booking_ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'price_shopping':
        return <DollarSign className="h-4 w-4 text-yellow-500" />;
      case 'early_researcher':
        return <Brain className="h-4 w-4 text-blue-500" />;
      case 'urgent_seeker':
        return <Zap className="h-4 w-4 text-orange-500" />;
      case 'churn_risk':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'high_value':
        return <Target className="h-4 w-4 text-purple-500" />;
      default:
        return <Users className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPatternColor = (patternType: string) => {
    switch (patternType) {
      case 'booking_ready':
        return 'bg-green-500';
      case 'price_shopping':
        return 'bg-yellow-500';
      case 'early_researcher':
        return 'bg-blue-500';
      case 'urgent_seeker':
        return 'bg-orange-500';
      case 'churn_risk':
        return 'bg-red-500';
      case 'high_value':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8)
      return <Badge className="bg-green-100 text-green-800">High</Badge>;
    if (confidence >= 0.6)
      return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
    return <Badge className="bg-red-100 text-red-800">Low</Badge>;
  };

  if (!detailed) {
    return (
      <div className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Patterns Found
              </span>
            </div>
            <p className="text-2xl font-bold">{summary.totalPatterns}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Success Rate
              </span>
            </div>
            <p className="text-2xl font-bold">
              {(summary.successRate * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Top Patterns */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Top Behavior Patterns</h4>
          <div className="space-y-2">
            {patternInsights.slice(0, 3).map((insight) => (
              <div
                key={insight.pattern_type}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  {getPatternIcon(insight.pattern_type)}
                  <span className="text-sm capitalize">
                    {insight.pattern_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{insight.count}</span>
                  <Progress
                    value={
                      (insight.count / Math.max(1, summary.totalPatterns)) * 100
                    }
                    className="w-16 h-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Brain className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">
                  Total Patterns
                </span>
              </div>
              <p className="text-2xl font-bold">{summary.totalPatterns}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">
                  Avg Confidence
                </span>
              </div>
              <p className="text-2xl font-bold">
                {(summary.avgConfidence * 100).toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">
                  Success Rate
                </span>
              </div>
              <p className="text-2xl font-bold">
                {(summary.successRate * 100).toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">
                  Revenue Impact
                </span>
              </div>
              <p className="text-2xl font-bold">
                ${(summary.revenueImpact / 1000).toFixed(0)}K
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Selector */}
      <div className="flex items-center space-x-2">
        <Button
          variant={viewMode === 'overview' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('overview')}
        >
          <Brain className="h-4 w-4 mr-1" />
          Overview
        </Button>
        <Button
          variant={viewMode === 'patterns' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('patterns')}
        >
          <Users className="h-4 w-4 mr-1" />
          Patterns
        </Button>
        <Button
          variant={viewMode === 'insights' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('insights')}
        >
          <Target className="h-4 w-4 mr-1" />
          Insights
        </Button>
      </div>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Pattern Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {patternInsights.map((insight) => (
                  <div key={insight.pattern_type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getPatternIcon(insight.pattern_type)}
                        <span className="font-medium capitalize">
                          {insight.pattern_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">
                          {insight.count}
                        </span>
                        {getConfidenceBadge(insight.avgConfidence)}
                      </div>
                    </div>
                    <Progress
                      value={
                        (insight.count / Math.max(1, summary.totalPatterns)) *
                        100
                      }
                      className="h-2"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {(
                          (insight.count / Math.max(1, summary.totalPatterns)) *
                          100
                        ).toFixed(1)}
                        % of total
                      </span>
                      <span>
                        {(insight.avgBookingProbability * 100).toFixed(0)}%
                        booking rate
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {patternInsights.map((insight) => (
                  <div
                    key={insight.pattern_type}
                    className="p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-2 mb-3">
                      {getPatternIcon(insight.pattern_type)}
                      <h4 className="font-medium capitalize">
                        {insight.pattern_type.replace(/_/g, ' ')}
                      </h4>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Booking Rate</p>
                        <p className="font-medium text-lg">
                          {(insight.avgBookingProbability * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Timeline</p>
                        <p className="font-medium text-lg">
                          {insight.avgTimeline}d
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Success</p>
                        <p className="font-medium text-lg">
                          {(insight.successRate * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Patterns Mode */}
      {viewMode === 'patterns' && (
        <Card>
          <CardHeader>
            <CardTitle>Individual Behavior Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {patterns.length === 0 ? (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No behavior patterns detected
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {patterns
                    .sort((a, b) => b.confidence - a.confidence)
                    .slice(0, 20)
                    .map((pattern) => (
                      <div
                        key={pattern.pattern_id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedPattern === pattern.pattern_id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() =>
                          setSelectedPattern(
                            selectedPattern === pattern.pattern_id
                              ? null
                              : pattern.pattern_id,
                          )
                        }
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-3 h-8 rounded-full ${getPatternColor(pattern.pattern_type)}`}
                            ></div>
                            <div>
                              <h4 className="font-medium capitalize">
                                {pattern.pattern_type.replace(/_/g, ' ')}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Client {pattern.pattern_id.split('-').pop()}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-lg font-bold">
                              {(pattern.confidence * 100).toFixed(0)}%
                            </p>
                            <p className="text-xs text-muted-foreground">
                              confidence
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              Booking Rate:
                            </span>
                            <p className="font-medium">
                              {(
                                pattern.typical_outcomes.booking_probability *
                                100
                              ).toFixed(0)}
                              %
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Timeline:
                            </span>
                            <p className="font-medium">
                              {
                                pattern.typical_outcomes
                                  .average_timeline_to_booking
                              }{' '}
                              days
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Signals:
                            </span>
                            <p className="font-medium">
                              {pattern.signals.length}
                            </p>
                          </div>
                        </div>

                        {selectedPattern === pattern.pattern_id && (
                          <div className="mt-4 pt-4 border-t space-y-3">
                            <div>
                              <h5 className="text-sm font-medium mb-2">
                                Recommended Actions:
                              </h5>
                              <div className="flex flex-wrap gap-1">
                                {pattern.recommended_actions.map(
                                  (action, index) => (
                                    <Badge
                                      key={index}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {action}
                                    </Badge>
                                  ),
                                )}
                              </div>
                            </div>

                            <div>
                              <h5 className="text-sm font-medium mb-2">
                                Pattern Signals:
                              </h5>
                              <div className="space-y-1">
                                {pattern.signals.map((signal, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between text-sm"
                                  >
                                    <span className="capitalize">
                                      {signal.signal_type.replace(/_/g, ' ')}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {signal.strength}/10
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights Mode */}
      {viewMode === 'insights' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Strategic Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {patternInsights.map((insight) => (
                  <div
                    key={insight.pattern_type}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      {getPatternIcon(insight.pattern_type)}
                      <h4 className="font-medium capitalize">
                        {insight.pattern_type.replace(/_/g, ' ')}
                      </h4>
                      <Badge>{insight.count}</Badge>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">
                            Booking Probability
                          </p>
                          <p className="text-xl font-bold">
                            {(insight.avgBookingProbability * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg Timeline</p>
                          <p className="text-xl font-bold">
                            {insight.avgTimeline}d
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Top Actions:
                        </p>
                        <div className="space-y-1">
                          {insight.recommendedActions
                            .slice(0, 3)
                            .map((action, index) => (
                              <div
                                key={index}
                                className="flex items-center space-x-2"
                              >
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <span className="text-sm">{action}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
