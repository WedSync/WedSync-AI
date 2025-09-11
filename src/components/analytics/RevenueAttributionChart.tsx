'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { useSearchParams } from 'next/navigation';
import { ChartSkeleton } from './Skeletons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign } from 'lucide-react';

const COLORS = [
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#ef4444',
];

export function RevenueAttributionChart() {
  const searchParams = useSearchParams();
  const timeframe = searchParams.get('timeframe') || '30d';
  const { data: analytics, isLoading } = useAnalyticsData(timeframe);

  if (isLoading || !analytics) return <ChartSkeleton />;

  // Prepare data for revenue by type pie chart
  const revenueByTypeData = Object.entries(analytics.revenue.by_type || {}).map(
    ([type, amount]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: amount,
      percentage: ((amount / analytics.revenue.total) * 100).toFixed(1),
    }),
  );

  // Prepare data for revenue by journey bar chart
  const revenueByJourneyData = Object.entries(
    analytics.revenue.by_journey || {},
  )
    .map(([journey, amount]) => ({
      name: journey.length > 20 ? journey.substring(0, 20) + '...' : journey,
      fullName: journey,
      revenue: amount,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5); // Top 5 journeys

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold">{label || payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            £
            {payload[0].value?.toLocaleString() ||
              payload[0].payload.revenue?.toLocaleString()}
          </p>
          {payload[0].payload.percentage && (
            <p className="text-xs text-muted-foreground">
              {payload[0].payload.percentage}% of total
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show label for small slices

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card
      data-testid="revenue-chart"
      className="transition-all hover:shadow-lg"
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue Attribution
          </CardTitle>
          <span className="text-2xl font-bold text-primary">
            £{analytics.revenue.total.toLocaleString()}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Revenue breakdown by type and journey
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="type" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="type">By Type</TabsTrigger>
            <TabsTrigger value="journey">By Journey</TabsTrigger>
          </TabsList>

          <TabsContent value="type" className="mt-4">
            <div data-testid="chart-container" className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueByTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {revenueByTypeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string, entry: any) => (
                      <span className="text-sm">
                        {value}: £{entry.payload.value.toLocaleString()}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="journey" className="mt-4">
            <div data-testid="chart-container" className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByJourneyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    labelFormatter={(label) => {
                      const journey = revenueByJourneyData.find(
                        (d) => d.name === label,
                      );
                      return journey?.fullName || label;
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#8b5cf6"
                    radius={[8, 8, 0, 0]}
                    animationDuration={800}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
