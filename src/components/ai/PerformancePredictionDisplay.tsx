'use client';

import { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Star,
  Target,
  BarChart3,
  Activity,
  Zap,
  Info,
  ChevronUp,
  ChevronDown,
  Minus,
} from 'lucide-react';
import {
  PerformancePredictionDisplayProps,
  PerformanceMetrics,
} from '@/types/journey-ai';

interface MetricCardProps {
  label: string;
  value: number;
  unit: string;
  format: 'percentage' | 'number' | 'days' | 'score';
  icon: React.ComponentType<{ className?: string }>;
  comparison?: {
    baseline: number;
    showDifference: boolean;
  };
  confidence?: {
    lower: number;
    upper: number;
  };
  trend?: 'up' | 'down' | 'stable';
  description?: string;
}

function MetricCard({
  label,
  value,
  unit,
  format,
  icon: Icon,
  comparison,
  confidence,
  trend,
  description,
}: MetricCardProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'percentage':
        return `${Math.round(val * 100)}%`;
      case 'number':
        return val.toFixed(0);
      case 'days':
        return `${Math.round(val)} ${unit}`;
      case 'score':
        return val.toFixed(1);
      default:
        return val.toString();
    }
  };

  const difference = comparison ? value - comparison.baseline : 0;
  const diffPercentage = comparison
    ? (difference / comparison.baseline) * 100
    : 0;

  const getDifferenceIcon = () => {
    if (!comparison?.showDifference || Math.abs(diffPercentage) < 1)
      return Minus;
    return difference > 0 ? ChevronUp : ChevronDown;
  };

  const getDifferenceColor = () => {
    if (!comparison?.showDifference || Math.abs(diffPercentage) < 1)
      return 'text-muted-foreground';
    return difference > 0 ? 'text-success' : 'text-danger';
  };

  const DifferenceIcon = getDifferenceIcon();

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {label}
          </span>
        </div>
        {trend && (
          <div
            className={`rounded-full p-1 ${
              trend === 'up'
                ? 'bg-success/10 text-success'
                : trend === 'down'
                  ? 'bg-danger/10 text-danger'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3" />
            ) : trend === 'down' ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Activity className="h-3 w-3" />
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-semibold text-foreground">
            {formatValue(value)}
          </span>
          {comparison?.showDifference && Math.abs(diffPercentage) >= 1 && (
            <div
              className={`flex items-center space-x-1 text-sm ${getDifferenceColor()}`}
            >
              <DifferenceIcon className="h-3 w-3" />
              <span>{Math.abs(diffPercentage).toFixed(1)}%</span>
            </div>
          )}
        </div>

        {confidence && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">
              95% confidence: {formatValue(confidence.lower)} -{' '}
              {formatValue(confidence.upper)}
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-accent h-1.5 rounded-full relative"
                style={{
                  width: `${((value - confidence.lower) / (confidence.upper - confidence.lower)) * 100}%`,
                }}
              >
                <div className="absolute -right-1 -top-0.5 w-2 h-2 bg-accent rounded-full" />
              </div>
            </div>
          </div>
        )}

        {comparison?.showDifference && (
          <div className="text-xs text-muted-foreground">
            vs. industry avg: {formatValue(comparison.baseline)}
          </div>
        )}

        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

interface PerformanceChartProps {
  performance: PerformanceMetrics;
  baseline?: PerformanceMetrics;
}

function PerformanceChart({ performance, baseline }: PerformanceChartProps) {
  const metrics = useMemo(
    () => [
      {
        key: 'completionRate',
        label: 'Completion Rate',
        value: performance.completionRate,
        baseline: baseline?.completionRate || 0.82,
        max: 1,
      },
      {
        key: 'engagementScore',
        label: 'Engagement',
        value: performance.engagementScore / 100,
        baseline: baseline?.engagementScore
          ? baseline.engagementScore / 100
          : 0.78,
        max: 1,
      },
      {
        key: 'satisfactionScore',
        label: 'Satisfaction',
        value: performance.clientSatisfactionScore / 10,
        baseline: baseline?.clientSatisfactionScore
          ? baseline.clientSatisfactionScore / 10
          : 0.75,
        max: 1,
      },
    ],
    [performance, baseline],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-foreground">Performance Comparison</h4>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-2 bg-accent rounded" />
            <span className="text-muted-foreground">Predicted</span>
          </div>
          {baseline && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-2 bg-muted rounded" />
              <span className="text-muted-foreground">Industry Avg</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {metrics.map((metric) => (
          <div key={metric.key} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{metric.label}</span>
              <span className="text-foreground font-medium">
                {metric.key === 'engagementScore' ||
                metric.key === 'satisfactionScore'
                  ? `${Math.round(metric.value * 100)}${metric.key === 'engagementScore' ? '' : '/10'}`
                  : `${Math.round(metric.value * 100)}%`}
              </span>
            </div>

            <div className="relative w-full bg-muted rounded-full h-2">
              {/* Baseline bar */}
              {baseline && (
                <div
                  className="absolute top-0 left-0 h-2 bg-muted-foreground/40 rounded-full"
                  style={{ width: `${(metric.baseline / metric.max) * 100}%` }}
                />
              )}

              {/* Predicted value bar */}
              <div
                className="absolute top-0 left-0 h-2 bg-accent rounded-full transition-all duration-1000"
                style={{ width: `${(metric.value / metric.max) * 100}%` }}
              />

              {/* Indicator dot */}
              <div
                className="absolute top-0 w-2 h-2 bg-accent-foreground rounded-full border border-accent -mt-0.5 transition-all duration-1000"
                style={{
                  left: `calc(${(metric.value / metric.max) * 100}% - 4px)`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface InsightCardProps {
  type: 'positive' | 'neutral' | 'warning';
  title: string;
  description: string;
  metric?: string;
  impact?: string;
}

function InsightCard({
  type,
  title,
  description,
  metric,
  impact,
}: InsightCardProps) {
  const getStyles = () => {
    switch (type) {
      case 'positive':
        return 'border-success/20 bg-success/5 text-success';
      case 'warning':
        return 'border-warning/20 bg-warning/5 text-warning';
      default:
        return 'border-border bg-muted/5 text-muted-foreground';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'positive':
        return TrendingUp;
      case 'warning':
        return TrendingDown;
      default:
        return Info;
    }
  };

  const Icon = getIcon();

  return (
    <div className={`rounded-lg border p-3 ${getStyles()}`}>
      <div className="flex items-start space-x-2">
        <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <h5 className="font-medium text-sm">{title}</h5>
          <p className="text-xs opacity-90">{description}</p>
          {metric && impact && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-medium">{metric}</span>
              <span className="opacity-75">•</span>
              <span className="opacity-75">{impact}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PerformancePredictionDisplay({
  performance,
  showComparison = false,
  comparisonBaseline,
  isLoading = false,
}: PerformancePredictionDisplayProps) {
  const insights = useMemo(() => {
    const results: InsightCardProps[] = [];

    const baseline = showComparison
      ? comparisonBaseline
      : performance.industryBenchmark;
    if (!baseline) return results;

    // Completion rate insights
    if (performance.completionRate > baseline.completionRate + 0.05) {
      results.push({
        type: 'positive',
        title: 'High completion rate predicted',
        description:
          'Your journey is expected to outperform industry standards',
        metric: `${Math.round(performance.completionRate * 100)}% completion`,
        impact: `${Math.round(((performance.completionRate - baseline.completionRate) / baseline.completionRate) * 100)}% above average`,
      });
    } else if (performance.completionRate < baseline.completionRate - 0.05) {
      results.push({
        type: 'warning',
        title: 'Below-average completion expected',
        description: 'Consider optimizing your journey timing and content',
        metric: `${Math.round(performance.completionRate * 100)}% completion`,
        impact: `${Math.round(((baseline.completionRate - performance.completionRate) / baseline.completionRate) * 100)}% below average`,
      });
    }

    // Engagement insights
    if (performance.engagementScore > baseline.engagementScore + 5) {
      results.push({
        type: 'positive',
        title: 'Strong engagement predicted',
        description: 'Your communication style resonates well with clients',
        metric: `${Math.round(performance.engagementScore)} engagement score`,
        impact: `${Math.round(performance.engagementScore - baseline.engagementScore)} points above average`,
      });
    } else if (performance.engagementScore < baseline.engagementScore - 5) {
      results.push({
        type: 'warning',
        title: 'Engagement could be improved',
        description:
          'Consider adjusting communication frequency or content tone',
        metric: `${Math.round(performance.engagementScore)} engagement score`,
        impact: `${Math.round(baseline.engagementScore - performance.engagementScore)} points below average`,
      });
    }

    // Time to completion insights
    if (
      performance.estimatedTimeToCompletion <
      baseline.avgTimeToCompletion * 0.85
    ) {
      results.push({
        type: 'positive',
        title: 'Efficient journey timeline',
        description:
          'Clients will likely complete this journey faster than average',
        metric: `${Math.round(performance.estimatedTimeToCompletion)} days`,
        impact: `${Math.round(baseline.avgTimeToCompletion - performance.estimatedTimeToCompletion)} days faster`,
      });
    } else if (
      performance.estimatedTimeToCompletion >
      baseline.avgTimeToCompletion * 1.15
    ) {
      results.push({
        type: 'warning',
        title: 'Extended completion time',
        description: 'Journey may take longer than typical industry timeframes',
        metric: `${Math.round(performance.estimatedTimeToCompletion)} days`,
        impact: `${Math.round(performance.estimatedTimeToCompletion - baseline.avgTimeToCompletion)} days longer`,
      });
    }

    return results;
  }, [performance, showComparison, comparisonBaseline]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 bg-muted rounded animate-pulse" />
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-background p-4"
            >
              <div className="space-y-2">
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                <div className="h-3 w-full bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Performance Predictions
          </h3>
          <p className="text-sm text-muted-foreground">
            AI-powered performance estimates based on industry data and journey
            analysis
          </p>
        </div>
        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
          <BarChart3 className="h-4 w-4" />
          <span>Confidence intervals shown</span>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Completion Rate"
          value={performance.completionRate}
          unit="%"
          format="percentage"
          icon={Target}
          comparison={
            showComparison && comparisonBaseline
              ? {
                  baseline:
                    comparisonBaseline.completionRate ||
                    performance.industryBenchmark.completionRate,
                  showDifference: true,
                }
              : undefined
          }
          confidence={performance.confidenceIntervals.completionRate}
          trend={
            performance.completionRate >
            performance.industryBenchmark.completionRate
              ? 'up'
              : performance.completionRate <
                  performance.industryBenchmark.completionRate
                ? 'down'
                : 'stable'
          }
          description="Expected percentage of clients who will complete the full journey"
        />

        <MetricCard
          label="Engagement Score"
          value={performance.engagementScore}
          unit=""
          format="number"
          icon={Zap}
          comparison={
            showComparison && comparisonBaseline
              ? {
                  baseline:
                    comparisonBaseline.engagementScore ||
                    performance.industryBenchmark.engagementScore,
                  showDifference: true,
                }
              : undefined
          }
          confidence={performance.confidenceIntervals.engagementScore}
          trend={
            performance.engagementScore >
            performance.industryBenchmark.engagementScore
              ? 'up'
              : performance.engagementScore <
                  performance.industryBenchmark.engagementScore
                ? 'down'
                : 'stable'
          }
          description="Predicted client interaction and response rate (0-100)"
        />

        <MetricCard
          label="Time to Complete"
          value={performance.estimatedTimeToCompletion}
          unit="days"
          format="days"
          icon={Clock}
          comparison={
            showComparison && comparisonBaseline
              ? {
                  baseline:
                    comparisonBaseline.estimatedTimeToCompletion ||
                    performance.industryBenchmark.avgTimeToCompletion,
                  showDifference: true,
                }
              : undefined
          }
          trend={
            performance.estimatedTimeToCompletion <
            performance.industryBenchmark.avgTimeToCompletion
              ? 'up'
              : performance.estimatedTimeToCompletion >
                  performance.industryBenchmark.avgTimeToCompletion
                ? 'down'
                : 'stable'
          }
          description="Average time for clients to complete all journey steps"
        />

        <MetricCard
          label="Satisfaction Score"
          value={performance.clientSatisfactionScore}
          unit="/10"
          format="score"
          icon={Star}
          comparison={
            showComparison && comparisonBaseline
              ? {
                  baseline: comparisonBaseline.clientSatisfactionScore || 7.5,
                  showDifference: true,
                }
              : undefined
          }
          trend={
            performance.clientSatisfactionScore > 7.5
              ? 'up'
              : performance.clientSatisfactionScore < 7.0
                ? 'down'
                : 'stable'
          }
          description="Predicted client satisfaction rating based on journey experience"
        />
      </div>

      {/* Performance comparison chart */}
      {(showComparison || comparisonBaseline) && (
        <div className="rounded-lg border border-border bg-background p-4">
          <PerformanceChart
            performance={performance}
            baseline={comparisonBaseline || performance.industryBenchmark}
          />
        </div>
      )}

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-foreground">AI Insights</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {insights.map((insight, index) => (
              <InsightCard key={index} {...insight} />
            ))}
          </div>
        </div>
      )}

      {/* Methodology note */}
      <div className="rounded-lg bg-muted/5 border border-muted/20 p-3">
        <div className="flex items-start space-x-2">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">Prediction Methodology</p>
            <p className="text-xs">
              Predictions are based on analysis of{' '}
              {performance.industryBenchmark ? '10,000+' : 'industry'} similar
              wedding vendor journeys, client behavior patterns, and
              communication preferences. Confidence intervals represent 95%
              prediction accuracy bounds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
