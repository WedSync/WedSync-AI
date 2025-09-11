/**
 * @fileoverview Review Performance Charts Component
 * WS-047: Review Collection System Analytics Dashboard & Testing Framework
 *
 * High-performance chart components for review analytics
 * Features: Canvas-based rendering, real-time updates, responsive design
 */

'use client';

import React, { memo, useCallback, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, PieChart, Calendar } from 'lucide-react';
import { AnalyticsPerformanceMonitor } from '@/lib/performance/analytics-monitor';

interface ChartDataset {
  label: string;
  data: number[];
  borderColor?: string;
  backgroundColor?: string | string[];
  yAxisID?: string;
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

interface ReviewPerformanceChartsProps {
  trends: ChartData;
  distribution: ChartData;
  sources: ChartData;
  loading?: boolean;
  className?: string;
}

export const ReviewPerformanceCharts = memo<ReviewPerformanceChartsProps>(
  ({ trends, distribution, sources, loading = false, className = '' }) => {
    const monitor = useMemo(
      () => AnalyticsPerformanceMonitor.getInstance(),
      [],
    );

    if (loading) {
      return <ChartsSkeleton className={className} />;
    }

    return (
      <div
        className={`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 ${className}`}
        data-testid="performance-charts"
      >
        {/* Trends Over Time Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Review Trends
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Last 30 days
            </Badge>
          </CardHeader>
          <CardContent>
            <TrendsChart
              data={trends}
              onRenderComplete={(time) =>
                monitor.measureChartRender('trends', performance.now() - time)
              }
            />
          </CardContent>
        </Card>

        {/* Rating Distribution Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Rating Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionChart
              data={distribution}
              onRenderComplete={(time) =>
                monitor.measureChartRender(
                  'distribution',
                  performance.now() - time,
                )
              }
            />
          </CardContent>
        </Card>

        {/* Review Sources Chart */}
        <Card className="lg:col-span-1 xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Review Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SourcesChart
              data={sources}
              onRenderComplete={(time) =>
                monitor.measureChartRender('sources', performance.now() - time)
              }
            />
          </CardContent>
        </Card>

        {/* Timeline Summary */}
        <Card className="lg:col-span-2 xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PerformanceSummary
              trends={trends}
              distribution={distribution}
              sources={sources}
            />
          </CardContent>
        </Card>
      </div>
    );
  },
);

ReviewPerformanceCharts.displayName = 'ReviewPerformanceCharts';

// Trends Chart Component (Line Chart)
const TrendsChart = memo<{
  data: ChartData;
  onRenderComplete?: (renderTime: number) => void;
}>(({ data, onRenderComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderStartTime = useRef<number>(0);

  const chartData = useMemo(() => {
    if (!data.labels.length || !data.datasets.length) return null;

    // Process and normalize data for better visualization
    const reviewDataset = data.datasets.find((d) =>
      d.label.toLowerCase().includes('review'),
    );
    const ratingDataset = data.datasets.find((d) =>
      d.label.toLowerCase().includes('rating'),
    );

    if (!reviewDataset) return null;

    return {
      labels: data.labels,
      reviewData: reviewDataset.data,
      ratingData: ratingDataset?.data || [],
      maxReviews: Math.max(...reviewDataset.data),
      minRating: ratingDataset ? Math.min(...ratingDataset.data) : 0,
      maxRating: ratingDataset ? Math.max(...ratingDataset.data) : 5,
    };
  }, [data]);

  const renderChart = useCallback(() => {
    if (!chartData || !canvasRef.current) return;

    renderStartTime.current = performance.now();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI support
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    const padding = 40;
    const chartWidth = rect.width - 2 * padding;
    const chartHeight = rect.height - 2 * padding;

    // Draw grid
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i / 5) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }

    // Vertical grid lines
    const stepX = chartWidth / (chartData.labels.length - 1);
    for (let i = 0; i < chartData.labels.length; i++) {
      const x = padding + i * stepX;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + chartHeight);
      ctx.stroke();
    }

    // Draw review count line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    chartData.reviewData.forEach((value, index) => {
      const x = padding + index * stepX;
      const y =
        padding + chartHeight - (value / chartData.maxReviews) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw rating line (if available)
    if (chartData.ratingData.length > 0) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();

      chartData.ratingData.forEach((value, index) => {
        const x = padding + index * stepX;
        const normalizedValue =
          (value - chartData.minRating) /
          (chartData.maxRating - chartData.minRating);
        const y = padding + chartHeight - normalizedValue * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    }

    // Draw data points
    ctx.fillStyle = '#3b82f6';
    chartData.reviewData.forEach((value, index) => {
      const x = padding + index * stepX;
      const y =
        padding + chartHeight - (value / chartData.maxReviews) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Y-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 5; i++) {
      const value = (chartData.maxReviews / 5) * (5 - i);
      const y = padding + (i / 5) * chartHeight;
      ctx.fillText(Math.round(value).toString(), padding - 10, y + 3);
    }

    // X-axis labels
    ctx.textAlign = 'center';
    chartData.labels.forEach((label, index) => {
      const x = padding + index * stepX;
      ctx.fillText(label, x, rect.height - 10);
    });

    const renderTime = performance.now() - renderStartTime.current;
    onRenderComplete?.(renderTime);
  }, [chartData, onRenderComplete]);

  useEffect(() => {
    renderChart();
  }, [renderChart]);

  useEffect(() => {
    const handleResize = () => requestAnimationFrame(renderChart);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderChart]);

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No trend data available
      </div>
    );
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full h-64"
        style={{ width: '100%', height: '256px' }}
        data-testid="trends-chart"
      />

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-blue-500"></div>
          <span>Reviews</span>
        </div>
        {chartData.ratingData.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-green-500"></div>
            <span>Rating</span>
          </div>
        )}
      </div>
    </div>
  );
});

TrendsChart.displayName = 'TrendsChart';

// Distribution Chart Component (Bar Chart)
const DistributionChart = memo<{
  data: ChartData;
  onRenderComplete?: (renderTime: number) => void;
}>(({ data, onRenderComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const chartData = useMemo(() => {
    if (!data.labels.length || !data.datasets.length) return null;

    const dataset = data.datasets[0];
    const total = dataset.data.reduce((sum, val) => sum + val, 0);

    return {
      labels: data.labels,
      values: dataset.data,
      percentages: dataset.data.map((val) =>
        total > 0 ? (val / total) * 100 : 0,
      ),
      colors: (dataset.backgroundColor as string[]) || [
        '#10b981',
        '#3b82f6',
        '#eab308',
        '#f97316',
        '#ef4444',
      ],
      total,
    };
  }, [data]);

  const renderChart = useCallback(() => {
    if (!chartData || !canvasRef.current) return;

    const startTime = performance.now();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);

    const padding = 40;
    const chartWidth = rect.width - 2 * padding;
    const chartHeight = rect.height - 2 * padding;
    const barWidth = (chartWidth / chartData.labels.length) * 0.8;
    const barSpacing = (chartWidth / chartData.labels.length) * 0.2;
    const maxValue = Math.max(...chartData.values);

    // Draw bars
    chartData.values.forEach((value, index) => {
      const x = padding + index * (barWidth + barSpacing);
      const barHeight = maxValue > 0 ? (value / maxValue) * chartHeight : 0;
      const y = padding + chartHeight - barHeight;

      ctx.fillStyle = chartData.colors[index] || '#6b7280';
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 4);
      ctx.fill();

      // Value labels on top of bars
      ctx.fillStyle = '#374151';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(value.toString(), x + barWidth / 2, y - 5);

      // Rating labels at bottom
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px sans-serif';
      ctx.fillText(chartData.labels[index], x + barWidth / 2, rect.height - 10);
    });

    const renderTime = performance.now() - startTime;
    onRenderComplete?.(renderTime);
  }, [chartData, onRenderComplete]);

  useEffect(() => {
    renderChart();
  }, [renderChart]);

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No distribution data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        className="w-full h-48"
        style={{ width: '100%', height: '192px' }}
        data-testid="distribution-chart"
      />

      {/* Distribution Summary */}
      <div className="space-y-2">
        {chartData.labels.map((label, index) => (
          <div
            key={label}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: chartData.colors[index] }}
              />
              <span>{label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{chartData.values[index]}</span>
              <span className="text-muted-foreground">
                ({chartData.percentages[index].toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

DistributionChart.displayName = 'DistributionChart';

// Sources Chart Component (Pie Chart)
const SourcesChart = memo<{
  data: ChartData;
  onRenderComplete?: (renderTime: number) => void;
}>(({ data, onRenderComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const chartData = useMemo(() => {
    if (!data.labels.length || !data.datasets.length) return null;

    const dataset = data.datasets[0];
    const total = dataset.data.reduce((sum, val) => sum + val, 0);

    return {
      labels: data.labels,
      values: dataset.data,
      percentages: dataset.data.map((val) =>
        total > 0 ? (val / total) * 100 : 0,
      ),
      colors: (dataset.backgroundColor as string[]) || [
        '#8b5cf6',
        '#06b6d4',
        '#84cc16',
        '#f59e0b',
        '#ef4444',
      ],
      total,
    };
  }, [data]);

  const renderChart = useCallback(() => {
    if (!chartData || !canvasRef.current) return;

    const startTime = performance.now();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    let currentAngle = -Math.PI / 2; // Start at top

    chartData.values.forEach((value, index) => {
      if (value === 0) return;

      const percentage = chartData.percentages[index];
      const sliceAngle = (percentage / 100) * 2 * Math.PI;

      ctx.fillStyle = chartData.colors[index];
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(
        centerX,
        centerY,
        radius,
        currentAngle,
        currentAngle + sliceAngle,
      );
      ctx.closePath();
      ctx.fill();

      // Draw slice border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      currentAngle += sliceAngle;
    });

    const renderTime = performance.now() - startTime;
    onRenderComplete?.(renderTime);
  }, [chartData, onRenderComplete]);

  useEffect(() => {
    renderChart();
  }, [renderChart]);

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No sources data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        className="w-full h-48"
        style={{ width: '100%', height: '192px' }}
        data-testid="sources-chart"
      />

      {/* Sources Legend */}
      <div className="space-y-2">
        {chartData.labels.map((label, index) => (
          <div
            key={label}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: chartData.colors[index] }}
              />
              <span className="truncate">{label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{chartData.values[index]}</span>
              <span className="text-muted-foreground">
                ({chartData.percentages[index].toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

SourcesChart.displayName = 'SourcesChart';

// Performance Summary Component
const PerformanceSummary = memo<{
  trends: ChartData;
  distribution: ChartData;
  sources: ChartData;
}>(({ trends, distribution, sources }) => {
  const summary = useMemo(() => {
    // Calculate key insights from the data
    const reviewTrend = trends.datasets[0]?.data || [];
    const ratings = distribution.datasets[0]?.data || [];
    const sourceCounts = sources.datasets[0]?.data || [];

    const totalReviews = reviewTrend.reduce((sum, val) => sum + val, 0);
    const latestReviews = reviewTrend[reviewTrend.length - 1] || 0;
    const previousReviews = reviewTrend[reviewTrend.length - 2] || 0;
    const growthRate =
      previousReviews > 0
        ? ((latestReviews - previousReviews) / previousReviews) * 100
        : 0;

    const totalRatings = ratings.reduce((sum, val) => sum + val, 0);
    const weightedRating =
      ratings.reduce((sum, count, index) => sum + count * (index + 1), 0) /
      totalRatings;

    const topSource =
      sources.labels[sourceCounts.indexOf(Math.max(...sourceCounts))];
    const topSourceCount = Math.max(...sourceCounts);

    return {
      totalReviews,
      growthRate,
      weightedRating,
      topSource,
      topSourceCount,
    };
  }, [trends, distribution, sources]);

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      data-testid="performance-summary"
    >
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">
          {summary.totalReviews.toLocaleString()}
        </div>
        <div className="text-sm text-muted-foreground">Total Reviews</div>
      </div>

      <div className="text-center">
        <div
          className={`text-2xl font-bold ${summary.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}
        >
          {summary.growthRate >= 0 ? '+' : ''}
          {summary.growthRate.toFixed(1)}%
        </div>
        <div className="text-sm text-muted-foreground">Growth Rate</div>
      </div>

      <div className="text-center">
        <div className="text-2xl font-bold text-yellow-600">
          {summary.weightedRating.toFixed(1)}/5
        </div>
        <div className="text-sm text-muted-foreground">Avg Rating</div>
      </div>

      <div className="text-center">
        <div className="text-lg font-bold text-purple-600 truncate">
          {summary.topSource}
        </div>
        <div className="text-sm text-muted-foreground">
          Top Source ({summary.topSourceCount})
        </div>
      </div>
    </div>
  );
});

PerformanceSummary.displayName = 'PerformanceSummary';

// Loading skeleton for charts
const ChartsSkeleton = memo<{ className?: string }>(({ className = '' }) => (
  <div
    className={`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 ${className}`}
    data-testid="charts-skeleton"
  >
    {/* Trends chart skeleton */}
    <Card className="lg:col-span-2">
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>

    {/* Distribution chart skeleton */}
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-36" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-48 w-full mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Sources chart skeleton */}
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-48 w-full mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Performance summary skeleton */}
    <Card className="lg:col-span-2 xl:col-span-2">
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-8 w-16 mx-auto mb-2" />
              <Skeleton className="h-4 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
));

ChartsSkeleton.displayName = 'ChartsSkeleton';

export default ReviewPerformanceCharts;
