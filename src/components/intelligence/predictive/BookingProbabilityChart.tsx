// WS-055: Booking Probability Chart Component
// Visualizes booking predictions and probability distributions

'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  TrendingUp,
  Target,
  Clock,
  Users,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

import type { BookingPrediction } from '@/lib/ml/prediction/types';

interface BookingProbabilityChartProps {
  predictions: BookingPrediction[];
  timeRange: '24h' | '7d' | '30d' | '90d';
  detailed?: boolean;
}

interface ProbabilityBucket {
  range: string;
  count: number;
  percentage: number;
  avgConfidence: number;
  totalRevenue: number;
}

interface ChartMetrics {
  totalPredictions: number;
  avgProbability: number;
  highProbabilityCount: number;
  lowProbabilityCount: number;
  avgConfidence: number;
  projectedRevenue: number;
}

export function BookingProbabilityChart({
  predictions,
  timeRange,
  detailed = false,
}: BookingProbabilityChartProps) {
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<
    'distribution' | 'timeline' | 'factors'
  >('distribution');

  // Calculate probability distribution buckets
  const probabilityBuckets = useMemo((): ProbabilityBucket[] => {
    if (!predictions.length) return [];

    const buckets = [
      { range: '90-100%', min: 0.9, max: 1.0 },
      { range: '80-89%', min: 0.8, max: 0.89 },
      { range: '70-79%', min: 0.7, max: 0.79 },
      { range: '60-69%', min: 0.6, max: 0.69 },
      { range: '50-59%', min: 0.5, max: 0.59 },
      { range: '40-49%', min: 0.4, max: 0.49 },
      { range: '30-39%', min: 0.3, max: 0.39 },
      { range: '20-29%', min: 0.2, max: 0.29 },
      { range: '10-19%', min: 0.1, max: 0.19 },
      { range: '0-9%', min: 0.0, max: 0.09 },
    ];

    return buckets
      .map((bucket) => {
        const bucketPredictions = predictions.filter(
          (p) => p.probability >= bucket.min && p.probability <= bucket.max,
        );

        const avgConfidence =
          bucketPredictions.length > 0
            ? bucketPredictions.reduce((sum, p) => sum + p.confidence, 0) /
              bucketPredictions.length
            : 0;

        return {
          range: bucket.range,
          count: bucketPredictions.length,
          percentage: (bucketPredictions.length / predictions.length) * 100,
          avgConfidence,
          totalRevenue:
            (bucketPredictions.length * 15000 * (bucket.min + bucket.max)) / 2, // Estimated revenue
        };
      })
      .filter((bucket) => bucket.count > 0);
  }, [predictions]);

  // Calculate summary metrics
  const metrics = useMemo((): ChartMetrics => {
    if (!predictions.length) {
      return {
        totalPredictions: 0,
        avgProbability: 0,
        highProbabilityCount: 0,
        lowProbabilityCount: 0,
        avgConfidence: 0,
        projectedRevenue: 0,
      };
    }

    const totalProbability = predictions.reduce(
      (sum, p) => sum + p.probability,
      0,
    );
    const totalConfidence = predictions.reduce(
      (sum, p) => sum + p.confidence,
      0,
    );
    const projectedRevenue = predictions.reduce(
      (sum, p) => sum + p.probability * 15000,
      0,
    );

    return {
      totalPredictions: predictions.length,
      avgProbability: (totalProbability / predictions.length) * 100,
      highProbabilityCount: predictions.filter((p) => p.probability >= 0.7)
        .length,
      lowProbabilityCount: predictions.filter((p) => p.probability < 0.3)
        .length,
      avgConfidence: totalConfidence / predictions.length,
      projectedRevenue,
    };
  }, [predictions]);

  const getBucketColor = (range: string) => {
    if (range.startsWith('90') || range.startsWith('80')) return 'bg-green-500';
    if (range.startsWith('70') || range.startsWith('60')) return 'bg-blue-500';
    if (range.startsWith('50') || range.startsWith('40'))
      return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!detailed) {
    return (
      <div className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Avg Probability
              </span>
            </div>
            <p className="text-2xl font-bold">
              {metrics.avgProbability.toFixed(1)}%
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                High Probability
              </span>
            </div>
            <p className="text-2xl font-bold">{metrics.highProbabilityCount}</p>
          </div>
        </div>

        {/* Mini Distribution Chart */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Probability Distribution</h4>
          <div className="space-y-2">
            {probabilityBuckets.slice(0, 5).map((bucket) => (
              <div key={bucket.range} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{bucket.range}</span>
                  <span className="text-sm font-medium">{bucket.count}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Progress value={bucket.percentage} className="flex-1 h-2" />
                  <span className="text-xs text-muted-foreground w-10">
                    {bucket.percentage.toFixed(0)}%
                  </span>
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
      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">
                  Total Predictions
                </span>
              </div>
              <p className="text-2xl font-bold">{metrics.totalPredictions}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">
                  Avg Probability
                </span>
              </div>
              <p className="text-2xl font-bold">
                {metrics.avgProbability.toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">
                  High Probability
                </span>
              </div>
              <p className="text-2xl font-bold">
                {metrics.highProbabilityCount}
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
                  Projected Revenue
                </span>
              </div>
              <p className="text-2xl font-bold">
                ${(metrics.projectedRevenue / 1000).toFixed(0)}K
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Selector */}
      <div className="flex items-center space-x-2">
        <Button
          variant={viewMode === 'distribution' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('distribution')}
        >
          <BarChart3 className="h-4 w-4 mr-1" />
          Distribution
        </Button>
        <Button
          variant={viewMode === 'timeline' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('timeline')}
        >
          <Clock className="h-4 w-4 mr-1" />
          Timeline
        </Button>
        <Button
          variant={viewMode === 'factors' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('factors')}
        >
          <Target className="h-4 w-4 mr-1" />
          Factors
        </Button>
      </div>

      {/* Distribution View */}
      {viewMode === 'distribution' && (
        <Card>
          <CardHeader>
            <CardTitle>Booking Probability Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {probabilityBuckets.map((bucket) => (
                <div
                  key={bucket.range}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedBucket === bucket.range
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() =>
                    setSelectedBucket(
                      selectedBucket === bucket.range ? null : bucket.range,
                    )
                  }
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-4 h-4 rounded-full ${getBucketColor(bucket.range)}`}
                      ></div>
                      <span className="font-medium">{bucket.range}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{bucket.count}</p>
                      <p className="text-sm text-muted-foreground">clients</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Progress value={bucket.percentage} className="h-3" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {bucket.percentage.toFixed(1)}% of total
                      </span>
                      <span
                        className={`font-medium ${getConfidenceColor(bucket.avgConfidence)}`}
                      >
                        {(bucket.avgConfidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                  </div>

                  {selectedBucket === bucket.range && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Projected Revenue:
                          </span>
                          <p className="font-medium">
                            ${(bucket.totalRevenue / 1000).toFixed(0)}K
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Avg Confidence:
                          </span>
                          <p className="font-medium">
                            {(bucket.avgConfidence * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <Card>
          <CardHeader>
            <CardTitle>Prediction Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {predictions.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No predictions available for {timeRange}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {predictions
                    .sort(
                      (a, b) =>
                        new Date(b.prediction_date).getTime() -
                        new Date(a.prediction_date).getTime(),
                    )
                    .slice(0, 10)
                    .map((prediction) => (
                      <div
                        key={prediction.client_id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              prediction.probability >= 0.7
                                ? 'bg-green-500'
                                : prediction.probability >= 0.5
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            }`}
                          ></div>
                          <div>
                            <p className="font-medium">
                              Client {prediction.client_id.slice(-8)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(
                                prediction.prediction_date,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xl font-bold">
                            {(prediction.probability * 100).toFixed(1)}%
                          </p>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {(prediction.confidence * 100).toFixed(0)}%
                              confidence
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Factors View */}
      {viewMode === 'factors' && (
        <Card>
          <CardHeader>
            <CardTitle>Key Prediction Factors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {predictions.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No factor analysis available
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from(
                    predictions
                      .flatMap((p) => p.factors)
                      .reduce((acc, factor) => {
                        const existing = acc.get(factor.factor_type);
                        if (existing) {
                          existing.count += 1;
                          existing.avgImpact =
                            (existing.avgImpact + factor.impact_score) / 2;
                        } else {
                          acc.set(factor.factor_type, {
                            count: 1,
                            avgImpact: factor.impact_score,
                            description: factor.description,
                          });
                        }
                        return acc;
                      }, new Map()),
                  )
                    .sort(([, a], [, b]) => b.avgImpact - a.avgImpact)
                    .slice(0, 6)
                    .map(([type, data]) => (
                      <div key={type} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium capitalize">
                            {type.replace(/_/g, ' ')}
                          </h4>
                          <Badge
                            variant={
                              data.avgImpact > 0 ? 'default' : 'destructive'
                            }
                            className="text-xs"
                          >
                            {data.avgImpact > 0 ? '+' : ''}
                            {data.avgImpact.toFixed(1)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {data.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Found in {data.count} prediction
                          {data.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Alert */}
      {metrics.avgProbability < 40 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">
                  Low Booking Probability Alert
                </h4>
                <p className="text-sm text-yellow-700">
                  Average booking probability is{' '}
                  {metrics.avgProbability.toFixed(1)}%. Consider focusing on
                  high-intent clients and improving engagement strategies.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
