'use client';

// WS-332 Analytics Dashboard - Revenue Analytics Component
// Team A - Round 1 - Interactive revenue visualization and forecasting

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RevenueAnalyticsProps,
  RevenueData,
  RevenueSource,
  MonthlyRevenue,
  RevenueForecast,
  RevenueSegment,
  AnalyticsTimeframe,
} from '@/types/analytics';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

// Icons
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  PieChart,
  BarChart3,
  Target,
  Zap,
  Users,
  MapPin,
  Instagram,
  Globe,
  Mail,
  Phone,
  ArrowUp,
  ArrowDown,
  Minus,
  Eye,
  Download,
  Share,
  Filter,
} from 'lucide-react';

// Mock data - In production, this would come from the analytics data hook
const mockRevenueData: RevenueData = {
  totalRevenue: 145250.0,
  revenueGrowth: 23.5,
  averageWeddingValue: 3850.0,
  revenueBySource: [
    {
      source: 'direct_bookings',
      revenue: 87150.0,
      percentage: 60.0,
      growth: 18.2,
      conversionRate: 12.5,
    },
    {
      source: 'marketplace',
      revenue: 29050.0,
      percentage: 20.0,
      growth: 35.7,
      conversionRate: 8.3,
    },
    {
      source: 'referrals',
      revenue: 14525.0,
      percentage: 10.0,
      growth: 42.1,
      conversionRate: 25.8,
    },
    {
      source: 'social_media',
      revenue: 8715.0,
      percentage: 6.0,
      growth: 15.3,
      conversionRate: 4.2,
    },
    {
      source: 'website',
      revenue: 5810.0,
      percentage: 4.0,
      growth: 8.9,
      conversionRate: 3.1,
    },
  ],
  revenueByMonth: [
    {
      month: 'Jan',
      revenue: 8950.0,
      bookings: 3,
      averageValue: 2983.33,
      seasonalIndex: 0.6,
    },
    {
      month: 'Feb',
      revenue: 12400.0,
      bookings: 4,
      averageValue: 3100.0,
      seasonalIndex: 0.8,
    },
    {
      month: 'Mar',
      revenue: 18650.0,
      bookings: 5,
      averageValue: 3730.0,
      seasonalIndex: 1.2,
    },
    {
      month: 'Apr',
      revenue: 23100.0,
      bookings: 6,
      averageValue: 3850.0,
      seasonalIndex: 1.5,
    },
    {
      month: 'May',
      revenue: 26950.0,
      bookings: 7,
      averageValue: 3850.0,
      seasonalIndex: 1.7,
    },
    {
      month: 'Jun',
      revenue: 30800.0,
      bookings: 8,
      averageValue: 3850.0,
      seasonalIndex: 1.9,
    },
    {
      month: 'Jul',
      revenue: 27720.0,
      bookings: 9,
      averageValue: 3080.0,
      seasonalIndex: 1.8,
    },
    {
      month: 'Aug',
      revenue: 25410.0,
      bookings: 8,
      averageValue: 3176.25,
      seasonalIndex: 1.6,
    },
    {
      month: 'Sep',
      revenue: 23100.0,
      bookings: 6,
      averageValue: 3850.0,
      seasonalIndex: 1.4,
    },
    {
      month: 'Oct',
      revenue: 19250.0,
      bookings: 5,
      averageValue: 3850.0,
      seasonalIndex: 1.2,
    },
    {
      month: 'Nov',
      revenue: 11550.0,
      bookings: 3,
      averageValue: 3850.0,
      seasonalIndex: 0.7,
    },
    {
      month: 'Dec',
      revenue: 7365.0,
      bookings: 2,
      averageValue: 3682.5,
      seasonalIndex: 0.5,
    },
  ],
  revenueByService: [
    {
      serviceType: 'Wedding Photography',
      revenue: 98175.0,
      bookings: 32,
      averageValue: 3068.0,
      profitMargin: 65.0,
      growthRate: 25.2,
    },
    {
      serviceType: 'Engagement Shoots',
      revenue: 23260.0,
      bookings: 28,
      averageValue: 830.0,
      profitMargin: 70.0,
      growthRate: 18.7,
    },
    {
      serviceType: 'Wedding Albums',
      revenue: 15825.0,
      bookings: 22,
      averageValue: 719.3,
      profitMargin: 55.0,
      growthRate: 32.1,
    },
    {
      serviceType: 'Additional Hours',
      revenue: 7990.0,
      bookings: 18,
      averageValue: 443.89,
      profitMargin: 80.0,
      growthRate: 15.6,
    },
  ],
  forecastedRevenue: [
    {
      period: 'Next Month',
      predictedRevenue: 24850.0,
      confidenceInterval: { low: 19880.0, high: 29820.0 },
      factorsInfluencing: [
        {
          factor: 'Seasonal Demand',
          impact: 'positive',
          weightPercentage: 35.0,
          description: 'Spring wedding season increases bookings by 40%',
        },
        {
          factor: 'Marketing Campaign',
          impact: 'positive',
          weightPercentage: 25.0,
          description: 'Recent Instagram ads driving 15% more inquiries',
        },
        {
          factor: 'Price Increase',
          impact: 'negative',
          weightPercentage: 15.0,
          description: '5% price increase may reduce conversion by 8%',
        },
      ],
    },
    {
      period: 'Next Quarter',
      predictedRevenue: 78650.0,
      confidenceInterval: { low: 65552.5, high: 91747.5 },
      factorsInfluencing: [
        {
          factor: 'Peak Wedding Season',
          impact: 'positive',
          weightPercentage: 45.0,
          description: 'May-July peak season drives 60% of annual revenue',
        },
        {
          factor: 'Market Competition',
          impact: 'negative',
          weightPercentage: 20.0,
          description: '3 new competitors entered market with lower pricing',
        },
      ],
    },
  ],
};

interface ChartMode {
  type: 'line' | 'bar' | 'area';
  period: 'monthly' | 'quarterly' | 'yearly';
  comparison: boolean;
}

export function RevenueAnalytics({
  vendorId,
  timeframe,
  comparisonPeriod,
  onDrillDown,
}: RevenueAnalyticsProps) {
  // State Management
  const [revenueData, setRevenueData] = useState<RevenueData>(mockRevenueData);
  const [chartMode, setChartMode] = useState<ChartMode>({
    type: 'line',
    period: 'monthly',
    comparison: false,
  });
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [showForecast, setShowForecast] = useState(true);

  // Memoized calculations
  const totalGrowth = useMemo(() => {
    return revenueData.revenueGrowth;
  }, [revenueData.revenueGrowth]);

  const topPerformingSource = useMemo(() => {
    return revenueData.revenueBySource.sort((a, b) => b.revenue - a.revenue)[0];
  }, [revenueData.revenueBySource]);

  const bestGrowthSource = useMemo(() => {
    return revenueData.revenueBySource.sort((a, b) => b.growth - a.growth)[0];
  }, [revenueData.revenueBySource]);

  const seasonalInsights = useMemo(() => {
    const monthlyData = revenueData.revenueByMonth;
    const avgIndex =
      monthlyData.reduce((sum, month) => sum + month.seasonalIndex, 0) /
      monthlyData.length;
    const peakMonths = monthlyData.filter(
      (month) => month.seasonalIndex > avgIndex * 1.3,
    );
    const lowMonths = monthlyData.filter(
      (month) => month.seasonalIndex < avgIndex * 0.7,
    );

    return {
      peakMonths: peakMonths.map((m) => m.month),
      lowMonths: lowMonths.map((m) => m.month),
      seasonalVariation:
        Math.max(...monthlyData.map((m) => m.seasonalIndex)) -
        Math.min(...monthlyData.map((m) => m.seasonalIndex)),
    };
  }, [revenueData.revenueByMonth]);

  // Revenue source icon mapping
  const getSourceIcon = useCallback((source: string) => {
    const iconMap = {
      direct_bookings: Users,
      marketplace: Globe,
      referrals: Users,
      social_media: Instagram,
      website: Globe,
    };
    return iconMap[source as keyof typeof iconMap] || Globe;
  }, []);

  // Revenue source color mapping
  const getSourceColor = useCallback((source: string) => {
    const colorMap = {
      direct_bookings: 'bg-blue-500',
      marketplace: 'bg-green-500',
      referrals: 'bg-purple-500',
      social_media: 'bg-pink-500',
      website: 'bg-orange-500',
    };
    return colorMap[source as keyof typeof colorMap] || 'bg-gray-500';
  }, []);

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  }, []);

  // Format percentage
  const formatPercentage = useCallback((value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  }, []);

  // Handle segment drill-down
  const handleSegmentClick = useCallback(
    (segment: RevenueSegment) => {
      setSelectedSegment(segment.name);
      onDrillDown(segment);
    },
    [onDrillDown],
  );

  return (
    <div className="revenue-analytics space-y-6">
      {/* Revenue Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(revenueData.totalRevenue)}
              </div>
              <div className="flex items-center mt-2">
                {totalGrowth >= 0 ? (
                  <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span
                  className={`text-sm font-medium ${
                    totalGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatPercentage(totalGrowth)}
                </span>
                <span className="text-sm text-slate-500 ml-1">
                  vs last period
                </span>
              </div>
            </CardContent>
            <div
              className={`absolute bottom-0 left-0 right-0 h-1 ${
                totalGrowth >= 0 ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
          </Card>
        </motion.div>

        {/* Average Wedding Value */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Avg Wedding Value
                </CardTitle>
                <Target className="h-4 w-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(revenueData.averageWeddingValue)}
              </div>
              <div className="text-sm text-slate-500 mt-2">
                Based on{' '}
                {revenueData.revenueByMonth.reduce(
                  (sum, month) => sum + month.bookings,
                  0,
                )}{' '}
                weddings
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Best Performing Source */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Top Revenue Source
                </CardTitle>
                <Zap className="h-4 w-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                {React.createElement(
                  getSourceIcon(topPerformingSource.source),
                  {
                    className: 'h-5 w-5 text-blue-600',
                  },
                )}
                <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {topPerformingSource.source
                    .replace('_', ' ')
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {formatCurrency(topPerformingSource.revenue)} (
                {topPerformingSource.percentage}%)
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Fastest Growing Source */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Fastest Growing
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                {React.createElement(getSourceIcon(bestGrowthSource.source), {
                  className: 'h-5 w-5 text-green-600',
                })}
                <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {bestGrowthSource.source
                    .replace('_', ' ')
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              </div>
              <div className="text-sm text-green-600 font-medium">
                {formatPercentage(bestGrowthSource.growth)} growth
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Revenue Analytics Tabs */}
      <Tabs defaultValue="trends" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="trends">Revenue Trends</TabsTrigger>
            <TabsTrigger value="sources">Revenue Sources</TabsTrigger>
            <TabsTrigger value="services">Service Breakdown</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
            <TabsTrigger value="insights">Wedding Insights</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Select
              value={chartMode.type}
              onValueChange={(value: any) =>
                setChartMode((prev) => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="area">Area Chart</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Revenue Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Monthly Revenue Trends</CardTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Revenue performance over the selected period
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    <Calendar className="h-3 w-3 mr-1" />
                    {timeframe.replace('_', ' ').toUpperCase()}
                  </Badge>
                  {comparisonPeriod && (
                    <Badge variant="secondary">
                      vs {comparisonPeriod.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Chart placeholder - In production, use a charting library like Recharts */}
              <div className="h-64 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600 dark:text-slate-400">
                    Revenue trend chart would be rendered here
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Showing data for {revenueData.revenueByMonth.length} months
                  </p>
                </div>
              </div>

              {/* Monthly Data Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
                {revenueData.revenueByMonth.slice(-6).map((month, index) => (
                  <motion.div
                    key={month.month}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800"
                  >
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {month.month}
                    </div>
                    <div className="text-lg font-bold text-blue-600 mt-1">
                      {formatCurrency(month.revenue)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {month.bookings} bookings
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1 mt-2">
                      <div
                        className="bg-blue-600 h-1 rounded-full"
                        style={{ width: `${month.seasonalIndex * 50}%` }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Seasonal Pattern Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Seasonal Wedding Patterns</CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Understanding your business seasonality for better planning
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    {seasonalInsights.peakMonths.join(', ')}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Peak Wedding Months
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Plan marketing campaigns and capacity for these months
                  </p>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 mb-2">
                    {seasonalInsights.lowMonths.join(', ')}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Low Season Months
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Focus on engagement shoots and other services
                  </p>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-2">
                    {seasonalInsights.seasonalVariation.toFixed(1)}x
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Seasonal Variation
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Peak to low season revenue ratio
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Sources Tab */}
        <TabsContent value="sources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Source Breakdown</CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Understand where your wedding bookings are coming from
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {revenueData.revenueBySource.map((source, index) => {
                  const IconComponent = getSourceIcon(source.source);
                  const colorClass = getSourceColor(source.source);

                  return (
                    <motion.div
                      key={source.source}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      onClick={() =>
                        handleSegmentClick({
                          name: source.source,
                          value: source.revenue,
                          percentage: source.percentage,
                          trend: source.growth >= 0 ? 'up' : 'down',
                        })
                      }
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-lg ${colorClass.replace('bg-', 'bg-').replace('-500', '-100')} text-white`}
                        >
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {source.source
                              .replace('_', ' ')
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </div>
                          <div className="text-sm text-slate-500">
                            {source.conversionRate}% conversion rate
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(source.revenue)}
                        </div>
                        <div className="text-sm text-slate-500">
                          {source.percentage}% of total
                        </div>
                        <div className="flex items-center justify-end mt-1">
                          {source.growth >= 0 ? (
                            <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-red-500 mr-1" />
                          )}
                          <span
                            className={`text-xs ${
                              source.growth >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {formatPercentage(source.growth)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Revenue Source Performance */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Best Converters</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {revenueData.revenueBySource
                      .sort((a, b) => b.conversionRate - a.conversionRate)
                      .slice(0, 3)
                      .map((source, index) => (
                        <div
                          key={source.source}
                          className="flex items-center justify-between py-2"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${getSourceColor(source.source)}`}
                            />
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {source.source
                                .replace('_', ' ')
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </span>
                          </div>
                          <Badge variant="secondary">
                            {source.conversionRate}%
                          </Badge>
                        </div>
                      ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Fastest Growing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {revenueData.revenueBySource
                      .sort((a, b) => b.growth - a.growth)
                      .slice(0, 3)
                      .map((source, index) => (
                        <div
                          key={source.source}
                          className="flex items-center justify-between py-2"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${getSourceColor(source.source)}`}
                            />
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {source.source
                                .replace('_', ' ')
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </span>
                          </div>
                          <Badge
                            variant={
                              source.growth >= 0 ? 'default' : 'destructive'
                            }
                          >
                            {formatPercentage(source.growth)}
                          </Badge>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Breakdown Tab */}
        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Service Type</CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Performance analysis of your different wedding services
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {revenueData.revenueByService.map((service, index) => (
                  <motion.div
                    key={service.serviceType}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-slate-900 dark:text-slate-100">
                          {service.serviceType}
                        </h4>
                        <p className="text-sm text-slate-500">
                          {service.bookings} bookings • {service.profitMargin}%
                          profit margin
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(service.revenue)}
                        </div>
                        <div className="text-sm text-slate-500">
                          {formatCurrency(service.averageValue)} avg
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <Progress
                          value={service.profitMargin}
                          className="h-2"
                        />
                        <div className="text-xs text-slate-500 mt-1">
                          Profit Margin: {service.profitMargin}%
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {service.growthRate >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span
                          className={`text-sm font-medium ${
                            service.growthRate >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {formatPercentage(service.growthRate)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forecast Tab */}
        <TabsContent value="forecast" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Revenue Forecast</CardTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Predictive analysis based on historical data and market
                    trends
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowForecast(!showForecast)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showForecast ? 'Hide' : 'Show'} Details
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {revenueData.forecastedRevenue.map((forecast, index) => (
                  <motion.div
                    key={forecast.period}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.2 }}
                    className="p-6 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {forecast.period}
                      </h4>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(forecast.predictedRevenue)}
                        </div>
                        <div className="text-sm text-slate-500">
                          {formatCurrency(forecast.confidenceInterval.low)} -{' '}
                          {formatCurrency(forecast.confidenceInterval.high)}
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {showForecast && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3"
                        >
                          <h5 className="font-medium text-slate-700 dark:text-slate-300">
                            Key Influencing Factors:
                          </h5>
                          {forecast.factorsInfluencing.map(
                            (factor, factorIndex) => (
                              <div
                                key={factorIndex}
                                className="flex items-center justify-between p-3 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-3 h-3 rounded-full ${
                                      factor.impact === 'positive'
                                        ? 'bg-green-500'
                                        : factor.impact === 'negative'
                                          ? 'bg-red-500'
                                          : 'bg-gray-500'
                                    }`}
                                  />
                                  <div>
                                    <div className="font-medium text-slate-900 dark:text-slate-100">
                                      {factor.factor}
                                    </div>
                                    <div className="text-sm text-slate-600 dark:text-slate-400">
                                      {factor.description}
                                    </div>
                                  </div>
                                </div>
                                <Badge
                                  variant={
                                    factor.impact === 'positive'
                                      ? 'default'
                                      : factor.impact === 'negative'
                                        ? 'destructive'
                                        : 'secondary'
                                  }
                                >
                                  {factor.weightPercentage}% weight
                                </Badge>
                              </div>
                            ),
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wedding Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Revenue Optimization Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                  <div>
                    <div className="font-medium text-green-800 dark:text-green-200">
                      Focus on Referrals
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300">
                      Your referral conversion rate is 25.8% - highest among all
                      sources
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                  <div>
                    <div className="font-medium text-blue-800 dark:text-blue-200">
                      Peak Season Pricing
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      Consider premium pricing during May-July peak wedding
                      season
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <div className="w-2 h-2 rounded-full bg-orange-500 mt-2" />
                  <div>
                    <div className="font-medium text-orange-800 dark:text-orange-200">
                      Marketplace Growth
                    </div>
                    <div className="text-sm text-orange-700 dark:text-orange-300">
                      Marketplace revenue growing 35.7% - invest more in this
                      channel
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Wedding Industry Benchmarks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                      Your Avg Wedding Value
                    </span>
                    <span className="font-medium">
                      {formatCurrency(revenueData.averageWeddingValue)}
                    </span>
                  </div>
                  <Progress value={75} className="h-2" />
                  <div className="text-xs text-slate-500">
                    75th percentile for wedding photographers
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                      Revenue Growth
                    </span>
                    <span className="font-medium">
                      {formatPercentage(revenueData.revenueGrowth)}
                    </span>
                  </div>
                  <Progress value={85} className="h-2" />
                  <div className="text-xs text-slate-500">
                    Above industry average (18.5%)
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                      Referral Rate
                    </span>
                    <span className="font-medium">25.8%</span>
                  </div>
                  <Progress value={90} className="h-2" />
                  <div className="text-xs text-slate-500">
                    Excellent - industry avg is 15%
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
