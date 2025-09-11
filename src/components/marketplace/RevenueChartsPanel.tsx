'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  DollarSign,
  Award,
} from 'lucide-react';
import { useState } from 'react';

interface MonthlyTrend {
  month: string;
  revenue: number;
  commissions: number;
  creatorEarnings: number;
}

interface CategoryBreakdown {
  category: string;
  revenue: number;
  percentage: number;
}

interface TopTemplate {
  id: string;
  title: string;
  revenue: number;
  sales: number;
  creator: string;
}

interface Props {
  monthlyTrends: MonthlyTrend[];
  categoryBreakdown: CategoryBreakdown[];
  topTemplates: TopTemplate[];
}

export function RevenueChartsPanel({
  monthlyTrends,
  categoryBreakdown,
  topTemplates,
}: Props) {
  const [chartView, setChartView] = useState('revenue');

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
    }).format(value / 100);
  };

  const formatCurrencyShort = (value: number): string => {
    const amount = value / 100;
    if (amount >= 1000000) return `£${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `£${(amount / 1000).toFixed(1)}K`;
    return `£${amount.toFixed(0)}`;
  };

  // Colors for charts
  const colors = {
    revenue: '#3B82F6',
    commissions: '#EF4444',
    creatorEarnings: '#10B981',
    categories: [
      '#3B82F6',
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#8B5CF6',
      '#06B6D4',
    ],
  };

  // Transform data for revenue trend chart
  const revenueChartData = monthlyTrends.map((trend) => ({
    ...trend,
    revenueDisplay: trend.revenue / 100,
    commissionsDisplay: trend.commissions / 100,
    creatorEarningsDisplay: trend.creatorEarnings / 100,
  }));

  // Transform data for category pie chart
  const categoryChartData = categoryBreakdown.map((category, index) => ({
    ...category,
    fill: colors.categories[index % colors.categories.length],
  }));

  // Transform data for template performance
  const templateChartData = topTemplates.map((template) => ({
    name:
      template.title.length > 25
        ? `${template.title.substring(0, 25)}...`
        : template.title,
    revenue: template.revenue / 100,
    sales: template.sales,
    creator: template.creator,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value * 100)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{data.category}</p>
          <p style={{ color: data.fill }}>
            Revenue: {formatCurrency(data.revenue)}
          </p>
          <p className="text-sm text-gray-600">
            {data.percentage.toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Revenue Trends Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Revenue Trends
                  </CardTitle>
                  <CardDescription>
                    Monthly marketplace revenue breakdown
                  </CardDescription>
                </div>
                <Select value={chartView} onValueChange={setChartView}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="breakdown">Breakdown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {chartView === 'revenue' ? (
                    <LineChart data={revenueChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={formatCurrencyShort} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="revenueDisplay"
                        stroke={colors.revenue}
                        strokeWidth={3}
                        name="Total Revenue"
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={revenueChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={formatCurrencyShort} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="creatorEarningsDisplay"
                        stackId="a"
                        fill={colors.creatorEarnings}
                        name="Creator Earnings"
                      />
                      <Bar
                        dataKey="commissionsDisplay"
                        stackId="a"
                        fill={colors.commissions}
                        name="Platform Commission"
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Revenue by Category
            </CardTitle>
            <CardDescription>Template category performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    dataKey="revenue"
                    nameKey="category"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {categoryChartData.map((category, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.fill }}
                    />
                    <span>{category.category}</span>
                  </div>
                  <span className="font-medium">
                    {category.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Template Performance and Top Creators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top Performing Templates
            </CardTitle>
            <CardDescription>
              Revenue leaders in the marketplace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={templateChartData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={formatCurrencyShort} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      formatCurrency(value * 100),
                      'Revenue',
                    ]}
                    labelFormatter={(label) => `Template: ${label}`}
                  />
                  <Bar
                    dataKey="revenue"
                    fill={colors.revenue}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Metrics Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue Insights
            </CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Month over Month Growth */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Month-over-Month Growth
                </span>
                <Badge
                  variant="default"
                  className="bg-green-100 text-green-800"
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +12.3%
                </Badge>
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  monthlyTrends[monthlyTrends.length - 1]?.revenue || 0,
                )}
              </div>
              <div className="text-sm text-gray-500">Current month revenue</div>
            </div>

            {/* Average Template Performance */}
            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-lg font-bold">
                    {formatCurrency(
                      topTemplates.reduce((sum, t) => sum + t.revenue, 0) /
                        topTemplates.length,
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    Avg Template Revenue
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold">
                    {Math.round(
                      topTemplates.reduce((sum, t) => sum + t.sales, 0) /
                        topTemplates.length,
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    Avg Sales per Template
                  </div>
                </div>
              </div>
            </div>

            {/* Top Category Performance */}
            <div className="pt-4 border-t">
              <div className="text-sm font-medium mb-2">
                Best Performing Category
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">
                    {categoryBreakdown[0]?.category}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatCurrency(categoryBreakdown[0]?.revenue)} revenue
                  </div>
                </div>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Award className="w-3 h-3" />#{1}
                </Badge>
              </div>
            </div>

            {/* Commission Efficiency */}
            <div className="pt-4 border-t">
              <div className="text-sm font-medium mb-2">
                Commission Efficiency
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Platform Revenue</span>
                  <span>
                    {formatCurrency(
                      monthlyTrends[monthlyTrends.length - 1]?.commissions || 0,
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Creator Payouts</span>
                  <span>
                    {formatCurrency(
                      monthlyTrends[monthlyTrends.length - 1]
                        ?.creatorEarnings || 0,
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-medium pt-2 border-t">
                  <span>Platform Share</span>
                  <span>
                    {(
                      ((monthlyTrends[monthlyTrends.length - 1]?.commissions ||
                        0) /
                        (monthlyTrends[monthlyTrends.length - 1]?.revenue ||
                          1)) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
