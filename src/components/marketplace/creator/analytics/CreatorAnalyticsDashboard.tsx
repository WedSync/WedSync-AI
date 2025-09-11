'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-untitled';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  ShoppingCart,
  Users,
  Download,
  RefreshCw,
  AlertCircle,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import InsightsPanel from './InsightsPanel';
import ABTestManager from './ABTestManager';
import RevenueChart from './RevenueChart';
import TemplatePerformanceTable from './TemplatePerformanceTable';

interface CreatorAnalyticsDashboardProps {
  creatorId?: string;
}

const COLORS = {
  spring: '#10B981',
  summer: '#F59E0B',
  fall: '#EF4444',
  winter: '#3B82F6',
};

export default function CreatorAnalyticsDashboard({
  creatorId,
}: CreatorAnalyticsDashboardProps) {
  const [timeframe, setTimeframe] = useState<
    'today' | 'week' | 'month' | 'quarter'
  >('month');
  const [selectedSeason, setSelectedSeason] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  const {
    data: analytics,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['creator-analytics', creatorId, timeframe, selectedSeason],
    queryFn: async () => {
      const params = new URLSearchParams({
        timeframe,
        ...(selectedSeason !== 'all' && { weddingSeasons: selectedSeason }),
      });
      const response = await fetch(
        `/api/marketplace/creator/analytics/dashboard?${params}`,
      );
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const { data: insights } = useQuery({
    queryKey: ['creator-insights', creatorId],
    queryFn: async () => {
      const response = await fetch(
        `/api/marketplace/creator/analytics/insights`,
      );
      if (!response.ok) throw new Error('Failed to fetch insights');
      return response.json();
    },
    refetchInterval: 30 * 60 * 1000, // Refresh every 30 minutes
  });

  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        format,
        type: 'overview',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      });

      const response = await fetch(
        `/api/marketplace/creator/analytics/export?${params}`,
      );

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${timeframe}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        if (format === 'json') {
          const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json',
          });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `analytics-${timeframe}-${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else if (format === 'pdf') {
          // Handle PDF generation (would need a PDF library like jsPDF)
          console.log('PDF export data:', data);
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-yellow-600">
            <AlertCircle className="h-5 w-5" />
            <p>
              No analytics data available. Start by adding templates to the
              marketplace.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Creator Analytics
          </h1>
          <p className="text-muted-foreground">
            Track performance and optimize your templates
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={timeframe}
            onValueChange={(value: any) => setTimeframe(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedSeason} onValueChange={setSelectedSeason}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Seasons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seasons</SelectItem>
              <SelectItem value="spring">Spring Weddings</SelectItem>
              <SelectItem value="summer">Summer Weddings</SelectItem>
              <SelectItem value="fall">Fall Weddings</SelectItem>
              <SelectItem value="winter">Winter Weddings</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.overview.totalSales}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.overview.totalSales > 120 ? (
                <span className="text-green-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />+
                  {analytics.overview.totalSales - 120} from last {timeframe}
                </span>
              ) : (
                <span>No change from last {timeframe}</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.overview.totalNetRevenue / 100)}
            </div>
            <p className="text-xs text-muted-foreground">
              After marketplace fees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(analytics.overview.conversionRate)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {analytics.competitorBenchmarks?.yourPerformanceVsAvg
                ?.conversionRate > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  <span className="text-green-600">
                    +
                    {Math.abs(
                      analytics.competitorBenchmarks.yourPerformanceVsAvg
                        .conversionRate,
                    ).toFixed(1)}
                    % vs avg
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                  <span className="text-red-600">
                    {Math.abs(
                      analytics.competitorBenchmarks?.yourPerformanceVsAvg
                        ?.conversionRate || 0,
                    ).toFixed(1)}
                    % vs avg
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Category Rank</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              #{analytics.overview.rankInCategory}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {analytics.overview.rankImprovement > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  <span className="text-green-600">
                    +{analytics.overview.rankImprovement} positions
                  </span>
                </>
              ) : analytics.overview.rankImprovement < 0 ? (
                <>
                  <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                  <span className="text-red-600">
                    {analytics.overview.rankImprovement} positions
                  </span>
                </>
              ) : (
                'No change'
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="ab-tests">A/B Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Revenue Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>
                Daily revenue and conversion performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.timeSeries.daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    formatter={(value: any, name: string) => [
                      name === 'revenue' ? formatCurrency(value / 100) : value,
                      name === 'revenue' ? 'Revenue' : 'Purchases',
                    ]}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                    name="Revenue"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="purchases"
                    stroke="#82ca9d"
                    name="Purchases"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Seasonal Performance */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Wedding Season Performance</CardTitle>
                <CardDescription>
                  Revenue distribution by season
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(
                        analytics.timeSeries.seasonalTrends,
                      ).map(([season, data]: [string, any]) => ({
                        name: season.charAt(0).toUpperCase() + season.slice(1),
                        value: data.avgRevenue,
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.keys(analytics.timeSeries.seasonalTrends).map(
                        (season, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[season as keyof typeof COLORS]}
                          />
                        ),
                      )}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => formatCurrency(value / 100)}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Segments</CardTitle>
                <CardDescription>Breakdown by wedding type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={Object.entries(
                      analytics.customerInsights?.coordinatorTypes || {},
                    ).map(([type, data]: [string, any]) => ({
                      type: type.charAt(0).toUpperCase() + type.slice(1),
                      count: data.count,
                      avgSpend: data.avgSpend / 100,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: any) => formatCurrency(value)}
                    />
                    <Bar dataKey="avgSpend" fill="#8884d8" name="Avg Spend" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue">
          <RevenueChart data={analytics} timeframe={timeframe} />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatePerformanceTable templates={analytics.topTemplates} />
        </TabsContent>

        <TabsContent value="insights">
          <InsightsPanel insights={insights} />
        </TabsContent>

        <TabsContent value="ab-tests">
          <ABTestManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Utility functions (formatCurrency and formatPercentage are imported from @/lib/utils)
