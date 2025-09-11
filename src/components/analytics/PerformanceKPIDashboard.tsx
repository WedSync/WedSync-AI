'use client';

// WS-332 Analytics Dashboard - Performance KPI Dashboard Component
// Team A - Round 1 - Performance KPI tracking and monitoring

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PerformanceKPIDashboardProps,
  KPIMetric,
  KPIConfiguration,
  IndustryBenchmark,
} from '@/types/analytics';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Icons
import {
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Heart,
  Zap,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  Star,
  Calendar,
  BarChart3,
  Settings,
} from 'lucide-react';

// Mock KPI data
const mockKPIData: KPIMetric[] = [
  {
    id: 'revenue_growth',
    name: 'Revenue Growth',
    category: 'financial',
    currentValue: 23.5,
    previousValue: 18.2,
    target: 25.0,
    unit: '%',
    trend: 'up',
    performance: 'good',
  },
  {
    id: 'client_satisfaction',
    name: 'Client Satisfaction',
    category: 'customer',
    currentValue: 8.7,
    previousValue: 8.4,
    target: 9.0,
    unit: '/10',
    trend: 'up',
    performance: 'excellent',
  },
  {
    id: 'booking_conversion',
    name: 'Booking Conversion Rate',
    category: 'marketing',
    currentValue: 12.5,
    previousValue: 15.3,
    target: 15.0,
    unit: '%',
    trend: 'down',
    performance: 'below_average',
  },
  {
    id: 'avg_wedding_value',
    name: 'Average Wedding Value',
    category: 'financial',
    currentValue: 3850,
    previousValue: 3650,
    target: 4000,
    unit: '£',
    trend: 'up',
    performance: 'good',
  },
  {
    id: 'response_time',
    name: 'Average Response Time',
    category: 'operational',
    currentValue: 2.1,
    previousValue: 3.2,
    target: 2.0,
    unit: 'hours',
    trend: 'up',
    performance: 'good',
  },
  {
    id: 'referral_rate',
    name: 'Client Referral Rate',
    category: 'customer',
    currentValue: 45.2,
    previousValue: 42.8,
    target: 50.0,
    unit: '%',
    trend: 'up',
    performance: 'good',
  },
  {
    id: 'repeat_clients',
    name: 'Repeat Client Rate',
    category: 'customer',
    currentValue: 28.5,
    previousValue: 25.1,
    target: 35.0,
    unit: '%',
    trend: 'up',
    performance: 'average',
  },
  {
    id: 'portfolio_engagement',
    name: 'Portfolio Engagement',
    category: 'marketing',
    currentValue: 6.8,
    previousValue: 5.9,
    target: 8.0,
    unit: '%',
    trend: 'up',
    performance: 'good',
  },
];

const mockBenchmarks: IndustryBenchmark[] = [
  {
    kpiId: 'revenue_growth',
    industryAverage: 15.2,
    topQuartile: 28.5,
    yourPosition: 'top_25%',
    improvementPotential: 5.0,
  },
  {
    kpiId: 'client_satisfaction',
    industryAverage: 7.8,
    topQuartile: 8.5,
    yourPosition: 'top_10%',
    improvementPotential: 0.3,
  },
  {
    kpiId: 'booking_conversion',
    industryAverage: 14.5,
    topQuartile: 18.2,
    yourPosition: 'below_average',
    improvementPotential: 5.7,
  },
];

export function PerformanceKPIDashboard({
  vendorId,
  kpiConfiguration,
  alertSettings,
  onKPIConfigUpdate,
}: PerformanceKPIDashboardProps) {
  // State Management
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'list' | 'gauges'>(
    'cards',
  );
  const [showBenchmarks, setShowBenchmarks] = useState(true);
  const [showTrends, setShowTrends] = useState(true);

  // Memoized calculations
  const filteredKPIs = useMemo(() => {
    if (selectedCategory === 'all') return mockKPIData;
    return mockKPIData.filter((kpi) => kpi.category === selectedCategory);
  }, [selectedCategory]);

  const overallPerformance = useMemo(() => {
    const performanceScores = {
      excellent: 5,
      good: 4,
      average: 3,
      below_average: 2,
      poor: 1,
    };

    const totalScore = mockKPIData.reduce(
      (sum, kpi) => sum + performanceScores[kpi.performance],
      0,
    );
    const maxScore = mockKPIData.length * 5;
    return Math.round((totalScore / maxScore) * 100);
  }, []);

  const categoryStats = useMemo(() => {
    const categories = ['financial', 'customer', 'marketing', 'operational'];
    return categories.map((category) => {
      const categoryKPIs = mockKPIData.filter(
        (kpi) => kpi.category === category,
      );
      const avgPerformance =
        categoryKPIs.reduce((sum, kpi) => {
          const performanceScores = {
            excellent: 5,
            good: 4,
            average: 3,
            below_average: 2,
            poor: 1,
          };
          return sum + performanceScores[kpi.performance];
        }, 0) / categoryKPIs.length;

      return {
        category,
        count: categoryKPIs.length,
        avgPerformance: avgPerformance * 20, // Convert to percentage
        improving: categoryKPIs.filter((kpi) => kpi.trend === 'up').length,
      };
    });
  }, []);

  const criticalKPIs = useMemo(() => {
    return mockKPIData.filter(
      (kpi) =>
        kpi.performance === 'below_average' || kpi.performance === 'poor',
    );
  }, []);

  // Get KPI icon
  const getKPIIcon = useCallback((kpiId: string, category: string) => {
    const iconMap: Record<string, any> = {
      revenue_growth: DollarSign,
      client_satisfaction: Heart,
      booking_conversion: Target,
      avg_wedding_value: DollarSign,
      response_time: Clock,
      referral_rate: Users,
      repeat_clients: Users,
      portfolio_engagement: Star,
      // Category fallbacks
      financial: DollarSign,
      customer: Heart,
      marketing: Target,
      operational: Settings,
      growth: TrendingUp,
    };
    return iconMap[kpiId] || iconMap[category] || BarChart3;
  }, []);

  // Get performance color
  const getPerformanceColor = useCallback((performance: string) => {
    const colorMap = {
      excellent: 'text-green-600',
      good: 'text-blue-600',
      average: 'text-yellow-600',
      below_average: 'text-orange-600',
      poor: 'text-red-600',
    };
    return colorMap[performance as keyof typeof colorMap] || 'text-gray-600';
  }, []);

  // Format KPI value
  const formatKPIValue = useCallback((value: number, unit: string) => {
    if (unit === '£') {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        maximumFractionDigits: 0,
      }).format(value);
    }
    if (unit === '%') {
      return `${value.toFixed(1)}%`;
    }
    if (unit === '/10') {
      return `${value.toFixed(1)}/10`;
    }
    if (unit === 'hours') {
      return `${value.toFixed(1)}h`;
    }
    return `${value.toLocaleString()}`;
  }, []);

  // Get category label
  const getCategoryLabel = useCallback((category: string) => {
    const labelMap = {
      financial: 'Financial',
      customer: 'Customer',
      marketing: 'Marketing',
      operational: 'Operational',
      growth: 'Growth',
    };
    return labelMap[category as keyof typeof labelMap] || category;
  }, []);

  return (
    <div className="performance-kpi-dashboard space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Overall Performance */}
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Overall Performance
              </CardTitle>
              <Award className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {overallPerformance}%
            </div>
            <div className="text-sm text-slate-500 mt-2">Across all KPIs</div>
            <div className="mt-3">
              <Progress value={overallPerformance} className="h-2" />
            </div>
          </CardContent>
          <div
            className={`absolute bottom-0 left-0 right-0 h-1 ${
              overallPerformance >= 80
                ? 'bg-green-500'
                : overallPerformance >= 60
                  ? 'bg-blue-500'
                  : overallPerformance >= 40
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
            }`}
          />
        </Card>

        {/* Improving KPIs */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Improving KPIs
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {mockKPIData.filter((kpi) => kpi.trend === 'up').length}
            </div>
            <div className="text-sm text-slate-500 mt-2">
              of {mockKPIData.length} total KPIs
            </div>
          </CardContent>
        </Card>

        {/* Critical KPIs */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Needs Attention
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {criticalKPIs.length}
            </div>
            <div className="text-sm text-slate-500 mt-2">KPIs below target</div>
          </CardContent>
        </Card>

        {/* Top Performer */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Top Performer
              </CardTitle>
              <Star className="h-4 w-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Client Satisfaction
            </div>
            <div className="text-sm text-slate-500 mt-1">
              8.7/10 (Excellent)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Dashboard Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Category:
            </span>
            <div className="flex rounded-md border border-slate-200 dark:border-slate-700">
              {['all', 'financial', 'customer', 'marketing', 'operational'].map(
                (category) => (
                  <Button
                    key={category}
                    variant={
                      selectedCategory === category ? 'default' : 'ghost'
                    }
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className={`rounded-none first:rounded-l-md last:rounded-r-md ${
                      selectedCategory !== category
                        ? 'border-r border-slate-200 dark:border-slate-700'
                        : ''
                    }`}
                  >
                    {category === 'all' ? 'All' : getCategoryLabel(category)}
                  </Button>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-md border border-slate-200 dark:border-slate-700">
            {(['cards', 'list', 'gauges'] as const).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(mode)}
                className="rounded-none first:rounded-l-md last:rounded-r-md"
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Button>
            ))}
          </div>

          {/* Toggle Options */}
          <Button
            variant={showBenchmarks ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowBenchmarks(!showBenchmarks)}
          >
            Benchmarks
          </Button>

          <Button
            variant={showTrends ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowTrends(!showTrends)}
          >
            Trends
          </Button>
        </div>
      </div>

      {/* KPI Display */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredKPIs.map((kpi, index) => {
            const IconComponent = getKPIIcon(kpi.id, kpi.category);
            const benchmark = mockBenchmarks.find((b) => b.kpiId === kpi.id);
            const targetProgress =
              kpi.target > 0 ? (kpi.currentValue / kpi.target) * 100 : 0;

            return (
              <motion.div
                key={kpi.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                          <IconComponent className="h-4 w-4 text-slate-600" />
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(kpi.category)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {kpi.trend === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : kpi.trend === 'down' ? (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                        <Badge
                          variant={
                            kpi.performance === 'excellent'
                              ? 'default'
                              : kpi.performance === 'good'
                                ? 'secondary'
                                : kpi.performance === 'average'
                                  ? 'outline'
                                  : kpi.performance === 'below_average'
                                    ? 'destructive'
                                    : 'destructive'
                          }
                          className="text-xs"
                        >
                          {kpi.performance.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-1">
                          {kpi.name}
                        </h4>
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`text-2xl font-bold ${getPerformanceColor(kpi.performance)}`}
                          >
                            {formatKPIValue(kpi.currentValue, kpi.unit)}
                          </span>
                          {showTrends && (
                            <span className="text-sm text-slate-500">
                              vs {formatKPIValue(kpi.previousValue, kpi.unit)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Target Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">
                            Target: {formatKPIValue(kpi.target, kpi.unit)}
                          </span>
                          <span className="font-medium">
                            {Math.round(targetProgress)}%
                          </span>
                        </div>
                        <Progress value={targetProgress} className="h-2" />
                      </div>

                      {/* Industry Benchmark */}
                      {showBenchmarks && benchmark && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                          <div className="text-xs text-slate-500 mb-1">
                            Industry Position:
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge
                              variant={
                                benchmark.yourPosition === 'top_10%'
                                  ? 'default'
                                  : benchmark.yourPosition === 'top_25%'
                                    ? 'secondary'
                                    : 'outline'
                              }
                              className="text-xs"
                            >
                              {benchmark.yourPosition
                                .replace('_', ' ')
                                .toUpperCase()}
                            </Badge>
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              Avg:{' '}
                              {formatKPIValue(
                                benchmark.industryAverage,
                                kpi.unit,
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {viewMode === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle>KPI Performance List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredKPIs.map((kpi, index) => {
                const IconComponent = getKPIIcon(kpi.id, kpi.category);
                const benchmark = mockBenchmarks.find(
                  (b) => b.kpiId === kpi.id,
                );
                const targetProgress =
                  kpi.target > 0 ? (kpi.currentValue / kpi.target) * 100 : 0;

                return (
                  <motion.div
                    key={kpi.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                        <IconComponent className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                          {kpi.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {getCategoryLabel(kpi.category)}
                          </Badge>
                          {showBenchmarks && benchmark && (
                            <Badge
                              variant={
                                benchmark.yourPosition === 'top_10%'
                                  ? 'default'
                                  : benchmark.yourPosition === 'top_25%'
                                    ? 'secondary'
                                    : 'outline'
                              }
                              className="text-xs"
                            >
                              {benchmark.yourPosition
                                .replace('_', ' ')
                                .toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xl font-bold ${getPerformanceColor(kpi.performance)}`}
                        >
                          {formatKPIValue(kpi.currentValue, kpi.unit)}
                        </span>
                        {kpi.trend === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : kpi.trend === 'down' ? (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        ) : null}
                      </div>
                      <div className="text-sm text-slate-500">
                        Target: {formatKPIValue(kpi.target, kpi.unit)} (
                        {Math.round(targetProgress)}%)
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'gauges' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredKPIs.map((kpi, index) => {
            const targetProgress =
              kpi.target > 0
                ? Math.min((kpi.currentValue / kpi.target) * 100, 100)
                : 0;

            return (
              <motion.div
                key={kpi.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-sm">{kpi.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative w-32 h-32 mx-auto">
                      {/* Gauge visualization placeholder */}
                      <div className="absolute inset-0 rounded-full border-8 border-slate-200 dark:border-slate-700" />
                      <div
                        className={`absolute inset-0 rounded-full border-8 border-transparent ${
                          kpi.performance === 'excellent'
                            ? 'border-t-green-500 border-r-green-500'
                            : kpi.performance === 'good'
                              ? 'border-t-blue-500 border-r-blue-500'
                              : kpi.performance === 'average'
                                ? 'border-t-yellow-500'
                                : 'border-t-red-500'
                        }`}
                        style={{
                          transform: `rotate(${(targetProgress / 100) * 180}deg)`,
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {formatKPIValue(kpi.currentValue, kpi.unit)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {Math.round(targetProgress)}% of target
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Critical KPIs Alert */}
      <AnimatePresence>
        {criticalKPIs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <CardTitle className="text-red-800 dark:text-red-200">
                    KPIs Requiring Attention
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {criticalKPIs.map((kpi) => (
                    <div
                      key={kpi.id}
                      className="flex items-center justify-between p-2 rounded bg-white dark:bg-red-900/30"
                    >
                      <span className="text-red-800 dark:text-red-200 font-medium">
                        {kpi.name}
                      </span>
                      <div className="text-right">
                        <span className="text-red-700 dark:text-red-300">
                          {formatKPIValue(kpi.currentValue, kpi.unit)}
                        </span>
                        <span className="text-red-600 dark:text-red-400 text-sm ml-2">
                          (Target: {formatKPIValue(kpi.target, kpi.unit)})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
