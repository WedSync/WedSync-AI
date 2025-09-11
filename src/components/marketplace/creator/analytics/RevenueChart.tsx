'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
  Legend,
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react';

interface RevenueChartProps {
  data: any;
  timeframe: string;
}

export default function RevenueChart({ data, timeframe }: RevenueChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value / 100);
  };

  const calculateGrowth = () => {
    if (!data?.timeSeries?.daily || data.timeSeries.daily.length < 2) return 0;
    const recent = data.timeSeries.daily.slice(-7);
    const previous = data.timeSeries.daily.slice(-14, -7);

    const recentRevenue = recent.reduce(
      (sum: number, d: any) => sum + (d.revenue || 0),
      0,
    );
    const previousRevenue = previous.reduce(
      (sum: number, d: any) => sum + (d.revenue || 0),
      0,
    );

    if (previousRevenue === 0) return 100;
    return ((recentRevenue - previousRevenue) / previousRevenue) * 100;
  };

  const growth = calculateGrowth();

  // Calculate MRR (Monthly Recurring Revenue) estimate
  const calculateMRR = () => {
    if (!data?.timeSeries?.daily) return 0;
    const last30Days = data.timeSeries.daily.slice(-30);
    return last30Days.reduce(
      (sum: number, d: any) => sum + (d.revenue || 0),
      0,
    );
  };

  const mrr = calculateMRR();

  // Revenue breakdown by template category
  const getCategoryBreakdown = () => {
    if (!data?.topTemplates) return [];

    const categoryMap = new Map<string, number>();
    data.topTemplates.forEach((template: any) => {
      const category = template.category || 'Other';
      const current = categoryMap.get(category) || 0;
      categoryMap.set(category, current + (template.revenue || 0));
    });

    return Array.from(categoryMap.entries()).map(([category, revenue]) => ({
      category,
      revenue,
    }));
  };

  const categoryBreakdown = getCategoryBreakdown();

  // Commission vs Net Revenue comparison
  const revenueComparison =
    data?.timeSeries?.daily?.map((day: any) => ({
      date: day.date,
      gross: day.revenue || 0,
      net: Math.round((day.revenue || 0) * 0.7), // Assuming 30% commission
      commission: Math.round((day.revenue || 0) * 0.3),
    })) || [];

  return (
    <div className="space-y-6">
      {/* Revenue Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.overview?.totalGrossRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Before marketplace commission
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
              {formatCurrency(data?.overview?.totalNetRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              After 30% commission
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            {growth > 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${growth > 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {growth > 0 ? '+' : ''}
              {growth.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              vs previous {timeframe}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trends">Revenue Trends</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="projections">Projections</TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Over Time</CardTitle>
              <CardDescription>Gross vs Net revenue comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={revenueComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis
                    tickFormatter={(value) => `$${(value / 100).toFixed(0)}`}
                  />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="gross"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                    name="Gross Revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="commission"
                    stackId="2"
                    stroke="#ffc658"
                    fill="#ffc658"
                    fillOpacity={0.6}
                    name="Commission"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Category</CardTitle>
                <CardDescription>
                  Which template categories generate most revenue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => `$${(value / 100).toFixed(0)}`}
                    />
                    <YAxis dataKey="category" type="category" />
                    <Tooltip
                      formatter={(value: any) => formatCurrency(value)}
                    />
                    <Bar dataKey="revenue" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Revenue Templates</CardTitle>
                <CardDescription>
                  Your best performing templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.topTemplates
                    ?.slice(0, 5)
                    .map((template: any, idx: number) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="w-6 h-6 rounded-full p-0 flex items-center justify-center"
                          >
                            {idx + 1}
                          </Badge>
                          <div>
                            <p className="font-medium text-sm">
                              {template.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {template.category}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(template.revenue)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {template.purchases} sales
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projections">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Projections</CardTitle>
              <CardDescription>
                Estimated earnings based on current performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Estimated MRR
                  </p>
                  <p className="text-2xl font-bold">{formatCurrency(mrr)}</p>
                  <p className="text-xs text-muted-foreground">
                    Based on last 30 days
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Quarterly Projection
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(mrr * 3)}
                  </p>
                  <p className="text-xs text-muted-foreground">Next 3 months</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Annual Projection
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(mrr * 12)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Next 12 months
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      Peak Season Opportunity
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Wedding season (May-October) typically sees 40% higher
                      sales. Consider launching new templates 60 days before
                      peak season for maximum impact.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
