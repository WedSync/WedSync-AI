'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  Calculator,
  CreditCard,
  Repeat,
} from 'lucide-react';

interface RevenueMetricsProps {
  metrics: any;
  organizationId: string;
  timeRange: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function RevenueMetrics({
  metrics,
  organizationId,
  timeRange,
}: RevenueMetricsProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Calculate additional metrics
  const totalMonthlyRevenue =
    metrics.revenueChart?.reduce(
      (sum: number, month: any) => sum + month.revenue,
      0,
    ) || 0;
  const averageMonthlyRevenue =
    totalMonthlyRevenue / (metrics.revenueChart?.length || 1);
  const targetAchievement =
    metrics.revenueChart?.reduce(
      (sum: number, month: any) => sum + (month.revenue / month.target) * 100,
      0,
    ) / (metrics.revenueChart?.length || 1) || 0;

  // Revenue by vendor type (mock data based on wedding industry)
  const revenueByCategory = [
    { name: 'Photography', value: metrics.totalRevenue * 0.35, percentage: 35 },
    { name: 'Venues', value: metrics.totalRevenue * 0.25, percentage: 25 },
    { name: 'Catering', value: metrics.totalRevenue * 0.2, percentage: 20 },
    { name: 'Flowers', value: metrics.totalRevenue * 0.15, percentage: 15 },
    { name: 'Others', value: metrics.totalRevenue * 0.05, percentage: 5 },
  ];

  // MRR and ARR calculations
  const mrr = averageMonthlyRevenue;
  const arr = mrr * 12;
  const previousMrr = mrr / (1 + metrics.revenueGrowth / 100);
  const mrrGrowthRate = ((mrr - previousMrr) / previousMrr) * 100;

  return (
    <div className="space-y-6">
      {/* Revenue Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(averageMonthlyRevenue)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {metrics.revenueGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
              )}
              <span
                className={
                  metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }
              >
                {formatPercent(metrics.revenueGrowth)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Annual Run Rate
            </CardTitle>
            <Calculator className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(arr)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Based on current MRR trend
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Target Achievement
            </CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {targetAchievement.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Average target performance
            </div>
            <Badge
              variant={
                targetAchievement >= 100
                  ? 'default'
                  : targetAchievement >= 90
                    ? 'secondary'
                    : 'destructive'
              }
              className="mt-2"
            >
              {targetAchievement >= 100
                ? 'Exceeding'
                : targetAchievement >= 90
                  ? 'On Track'
                  : 'Behind'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Revenue Per Client
            </CardTitle>
            <CreditCard className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                metrics.activeClients > 0
                  ? metrics.totalRevenue / metrics.activeClients
                  : 0,
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Average client value
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend & Target Performance</CardTitle>
          <CardDescription>
            Monthly revenue performance compared to targets with seasonal
            wedding trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.revenueChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'revenue' ? 'Actual Revenue' : 'Target Revenue',
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8884d8"
                  strokeWidth={3}
                  name="Actual Revenue"
                  dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#82ca9d"
                  strokeDasharray="5 5"
                  name="Target Revenue"
                  dot={{ fill: '#82ca9d', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Peak Season Indicator */}
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center gap-2 text-amber-800">
              <TrendingUp size={16} />
              <span className="font-medium">Wedding Season Impact</span>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              Revenue typically increases{' '}
              {metrics.seasonalTrends?.averageLoadIncrease || 2.5}x during peak
              wedding months (May-September). Plan capacity and resources
              accordingly.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Vendor Category</CardTitle>
            <CardDescription>
              Wedding supplier revenue distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {revenueByCategory.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category breakdown */}
            <div className="mt-4 space-y-2">
              {revenueByCategory.map((category, index) => (
                <div
                  key={category.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                  <div className="text-sm text-right">
                    <div className="font-bold">
                      {formatCurrency(category.value)}
                    </div>
                    <div className="text-gray-500">{category.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Metrics Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Health Indicators</CardTitle>
            <CardDescription>
              Key financial metrics for executive decision making
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* MRR Growth */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-800">
                  MRR Growth Rate
                </p>
                <p className="text-xs text-green-600">
                  Month-over-month recurring revenue
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-800">
                  {formatPercent(mrrGrowthRate)}
                </p>
              </div>
            </div>

            {/* Peak Season Multiplier */}
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-purple-800">
                  Peak Season Boost
                </p>
                <p className="text-xs text-purple-600">
                  Revenue multiplier during wedding season
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-purple-800">
                  {metrics.peakSeasonLoad?.toFixed(1) || '2.5'}x
                </p>
              </div>
            </div>

            {/* Revenue Diversification */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Revenue Diversification
                </p>
                <p className="text-xs text-blue-600">
                  Category concentration risk
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="bg-white">
                  {revenueByCategory[0].percentage < 40
                    ? 'Well Diversified'
                    : 'Concentrated'}
                </Badge>
              </div>
            </div>

            {/* Average Deal Size */}
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-orange-800">
                  Avg Wedding Value
                </p>
                <p className="text-xs text-orange-600">
                  Revenue per wedding booking
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-orange-800">
                  {formatCurrency(
                    metrics.weddingBookings > 0
                      ? metrics.totalRevenue / metrics.weddingBookings
                      : 0,
                  )}
                </p>
              </div>
            </div>

            {/* System Health Impact */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Uptime Revenue Impact
                </p>
                <p className="text-xs text-gray-600">
                  Revenue protected by system reliability
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-800">
                  {formatCurrency(
                    metrics.totalRevenue * (metrics.uptime / 100),
                  )}
                </p>
                <p className="text-xs text-gray-600">
                  @{metrics.uptime}% uptime
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wedding Industry Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Wedding Industry Revenue Insights
          </CardTitle>
          <CardDescription>
            Revenue patterns specific to the wedding industry
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg">
              <h4 className="font-semibold text-pink-800">
                Peak Season Revenue
              </h4>
              <p className="text-2xl font-bold text-pink-900 mt-2">
                {formatCurrency(metrics.totalRevenue * 0.6)}
              </p>
              <p className="text-xs text-pink-600 mt-1">
                60% of annual revenue (May-Sep)
              </p>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
              <h4 className="font-semibold text-blue-800">
                Off-Season Revenue
              </h4>
              <p className="text-2xl font-bold text-blue-900 mt-2">
                {formatCurrency(metrics.totalRevenue * 0.4)}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                40% of annual revenue (Oct-Apr)
              </p>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
              <h4 className="font-semibold text-green-800">
                Average Wedding Value
              </h4>
              <p className="text-2xl font-bold text-green-900 mt-2">£15,000</p>
              <p className="text-xs text-green-600 mt-1">
                UK wedding industry average
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RevenueMetrics;
