// WS-055: Historical Insights Component
// Displays historical analysis and trends for business intelligence

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Users,
  Target,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Download,
} from 'lucide-react';

import { HistoricalAnalyzer } from '@/lib/ml/prediction/historical-analyzer';
import type {
  HistoricalAnalytics,
  SeasonalPattern,
  ChurnPattern,
} from '@/lib/ml/prediction/types';

interface HistoricalInsightsProps {
  periodDays?: number;
  autoRefresh?: boolean;
}

export function HistoricalInsights({
  periodDays = 90,
  autoRefresh = false,
}: HistoricalInsightsProps) {
  const [analytics, setAnalytics] = useState<HistoricalAnalytics | null>(null);
  const [seasonalPatterns, setSeasonalPatterns] = useState<SeasonalPattern[]>(
    [],
  );
  const [churnPatterns, setChurnPatterns] = useState<ChurnPattern[]>([]);
  const [conversionInsights, setConversionInsights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('overview');

  const analyzer = new HistoricalAnalyzer();

  useEffect(() => {
    loadHistoricalData();

    if (autoRefresh) {
      const interval = setInterval(loadHistoricalData, 30 * 60 * 1000); // Refresh every 30 minutes
      return () => clearInterval(interval);
    }
  }, [periodDays, autoRefresh]);

  const loadHistoricalData = async () => {
    setIsLoading(true);
    try {
      const [analyticsData, seasonalData, churnData, insightsData] =
        await Promise.all([
          analyzer.analyzeHistoricalPerformance(periodDays),
          analyzer.identifySeasonalPatterns(2),
          analyzer.analyzeChurnPatterns(180),
          analyzer.generateConversionInsights(60),
        ]);

      setAnalytics(analyticsData);
      setSeasonalPatterns(seasonalData);
      setChurnPatterns(churnData);
      setConversionInsights(insightsData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load historical data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = () => {
    if (!analytics) return;

    const exportData = {
      analytics,
      seasonalPatterns,
      churnPatterns,
      conversionInsights,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historical-insights-${periodDays}d-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const getSeasonIcon = (season: string) => {
    switch (season) {
      case 'spring':
        return '🌸';
      case 'summer':
        return '☀️';
      case 'fall':
        return '🍂';
      case 'winter':
        return '❄️';
      default:
        return '📅';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading && !analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Analyzing historical data...
          </p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No historical data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Historical Insights</h2>
          <p className="text-muted-foreground">
            Analysis of {periodDays} days • {analytics.total_clients} clients
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            Updated {lastUpdated.toLocaleTimeString()}
          </Badge>
          <Button variant="outline" size="sm" onClick={loadHistoricalData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {(
                    analytics.conversion_metrics.overall_booking_rate * 100
                  ).toFixed(1)}
                  %
                </p>
                <p className="text-xs text-muted-foreground">
                  Overall Conversion
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {analytics.behavior_insights.avg_time_to_booking}d
                </p>
                <p className="text-xs text-muted-foreground">
                  Avg Time to Booking
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{analytics.total_clients}</p>
                <p className="text-xs text-muted-foreground">Total Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">
                  {(
                    analytics.model_performance.prediction_accuracy_trend.slice(
                      -1,
                    )[0] * 100
                  ).toFixed(1)}
                  %
                </p>
                <p className="text-xs text-muted-foreground">Model Accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Different Views */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
          <TabsTrigger value="seasonal">Seasonal</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conversion Rate Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Conversion Rate Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        24h Questionnaire Completion
                      </span>
                      <span className="font-medium">
                        {(
                          analytics.conversion_metrics.by_questionnaire_timing
                            .within_24h * 100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        analytics.conversion_metrics.by_questionnaire_timing
                          .within_24h * 100
                      }
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        48h Questionnaire Completion
                      </span>
                      <span className="font-medium">
                        {(
                          analytics.conversion_metrics.by_questionnaire_timing
                            .within_48h * 100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        analytics.conversion_metrics.by_questionnaire_timing
                          .within_48h * 100
                      }
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">After 1 Week</span>
                      <span className="font-medium">
                        {(
                          analytics.conversion_metrics.by_questionnaire_timing
                            .after_week * 100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        analytics.conversion_metrics.by_questionnaire_timing
                          .after_week * 100
                      }
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Model Performance Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Model Performance Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Accuracy</p>
                      <p className="text-lg font-bold">
                        {(
                          analytics.model_performance.prediction_accuracy_trend.slice(
                            -1,
                          )[0] * 100
                        ).toFixed(1)}
                        %
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">False Positive</p>
                      <p className="text-lg font-bold">
                        {(
                          analytics.model_performance.false_positive_rate * 100
                        ).toFixed(1)}
                        %
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Model Drift</p>
                      <p className="text-lg font-bold">
                        {(
                          analytics.model_performance.model_drift_score * 100
                        ).toFixed(1)}
                        %
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Weekly Accuracy Trend
                    </p>
                    <div className="flex items-end space-x-1 h-20">
                      {analytics.model_performance.prediction_accuracy_trend.map(
                        (accuracy, index) => (
                          <div
                            key={index}
                            className="bg-primary rounded-t flex-1"
                            style={{ height: `${accuracy * 100}%` }}
                            title={`Week ${index + 1}: ${(accuracy * 100).toFixed(1)}%`}
                          />
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Churn Patterns */}
          <Card>
            <CardHeader>
              <CardTitle>Common Churn Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {churnPatterns.map((pattern, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{pattern.pattern_name}</h4>
                      <Badge variant="outline">
                        {(pattern.frequency * 100).toFixed(0)}% frequency
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">
                          Early Indicators:
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          {pattern.early_indicators.map((indicator, i) => (
                            <li key={i} className="text-xs">
                              {indicator}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Intervention Success:
                        </span>
                        <span className="font-medium">
                          {(pattern.intervention_success_rate * 100).toFixed(0)}
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion" className="space-y-4">
          {conversionInsights && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Conversion Factors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {conversionInsights.topConversionFactors.map(
                        (factor: string, index: number) => (
                          <div
                            key={index}
                            className="flex items-center space-x-3"
                          >
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                              <span className="text-green-600 text-sm font-bold">
                                {index + 1}
                              </span>
                            </div>
                            <span className="text-sm">{factor}</span>
                          </div>
                        ),
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Conversion Bottlenecks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {conversionInsights.conversionBottlenecks.map(
                        (bottleneck: string, index: number) => (
                          <div
                            key={index}
                            className="flex items-center space-x-3"
                          >
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            <span className="text-sm">{bottleneck}</span>
                          </div>
                        ),
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Benchmark Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Optimal Questionnaire Time
                      </p>
                      <p className="text-2xl font-bold">
                        {conversionInsights.benchmarkMetrics.optimal_questionnaire_completion_hours.toFixed(
                          1,
                        )}
                        h
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Target Response Time
                      </p>
                      <p className="text-2xl font-bold">
                        {conversionInsights.benchmarkMetrics.target_response_time_hours.toFixed(
                          1,
                        )}
                        h
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Ideal Vendor Inquiries
                      </p>
                      <p className="text-2xl font-bold">
                        {
                          conversionInsights.benchmarkMetrics
                            .ideal_vendor_inquiries
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Min Interactions
                      </p>
                      <p className="text-2xl font-bold">
                        {
                          conversionInsights.benchmarkMetrics
                            .minimum_interaction_threshold
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recommended Improvements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {conversionInsights.recommendedImprovements.map(
                      (improvement: string, index: number) => (
                        <div key={index} className="flex items-start space-x-3">
                          <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5" />
                          <span className="text-sm">{improvement}</span>
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="seasonal" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {seasonalPatterns.map((pattern) => (
              <Card key={pattern.season}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>{getSeasonIcon(pattern.season)}</span>
                    <span className="capitalize">{pattern.season}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Booking Rate Multiplier
                        </p>
                        <p className="text-xl font-bold">
                          {pattern.booking_rate_multiplier.toFixed(2)}x
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Typical Timeline
                        </p>
                        <p className="text-xl font-bold">
                          {pattern.typical_timeline_days} days
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Characteristics:
                      </p>
                      <div className="space-y-1">
                        {pattern.behavior_characteristics.map(
                          (characteristic, index) => (
                            <div
                              key={index}
                              className="flex items-center space-x-2"
                            >
                              <div className="w-2 h-2 rounded-full bg-primary"></div>
                              <span className="text-sm">{characteristic}</span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Predictive Factors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analytics.behavior_insights.most_predictive_factors.map(
                  (factor, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <span className="font-medium capitalize">
                          {factor.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key Insights Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">
                    ✅ What's Working Well
                  </h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>
                      • 24-hour questionnaire completion drives{' '}
                      {(
                        analytics.conversion_metrics.by_questionnaire_timing
                          .within_24h * 100
                      ).toFixed(0)}
                      % booking rate
                    </li>
                    <li>
                      • High engagement clients show{' '}
                      {(
                        analytics.conversion_metrics.by_engagement_level.high *
                        100
                      ).toFixed(0)}
                      % conversion rate
                    </li>
                    <li>
                      • Model accuracy maintaining{' '}
                      {(
                        analytics.model_performance.prediction_accuracy_trend.slice(
                          -1,
                        )[0] * 100
                      ).toFixed(1)}
                      % performance
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-medium text-orange-800 mb-2">
                    ⚠️ Areas for Improvement
                  </h4>
                  <ul className="text-sm text-orange-700 space-y-1">
                    <li>
                      • Delayed questionnaire completion reduces booking rate to{' '}
                      {(
                        analytics.conversion_metrics.by_questionnaire_timing
                          .after_week * 100
                      ).toFixed(0)}
                      %
                    </li>
                    <li>
                      • {analytics.model_performance.false_positive_rate * 100}%
                      false positive rate in predictions
                    </li>
                    <li>
                      • Churn patterns show consistent early warning indicators
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">
                    💡 Strategic Recommendations
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>
                      • Focus on 24-hour questionnaire completion incentives
                    </li>
                    <li>• Implement early churn intervention strategies</li>
                    <li>
                      • Optimize response time targets based on seasonal
                      patterns
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
