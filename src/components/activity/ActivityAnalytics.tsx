'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
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
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity as ActivityIcon,
  Users,
  Clock,
  Calendar,
  FileText,
  MessageCircle,
  CreditCard,
  Download,
  RefreshCw,
} from 'lucide-react';
import { ActivityFeed as ActivityFeedType } from '@/types/communications';
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  isAfter,
  isBefore,
} from 'date-fns';

interface ActivityAnalyticsProps {
  activities: ActivityFeedType[];
  organizationId: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  onExport?: (data: object) => void;
}

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ElementType;
}

interface ChartData {
  date: string;
  total: number;
  clients: number;
  vendors: number;
  system: number;
  [key: string]: number;
}

const COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7c7c',
  '#8dd1e1',
  '#d084d0',
];

const ENTITY_TYPE_COLORS = {
  client: '#3b82f6',
  vendor: '#10b981',
  form: '#8b5cf6',
  message: '#f59e0b',
  booking: '#ef4444',
  payment: '#06b6d4',
};

export function ActivityAnalytics({
  activities,
  organizationId,
  isLoading = false,
  onRefresh,
  onExport,
}: ActivityAnalyticsProps) {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedTab, setSelectedTab] = useState('overview');

  // Filter activities by date range
  const filteredActivities = useMemo(() => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const cutoffDate = startOfDay(subDays(new Date(), days));

    return activities.filter((activity) =>
      isAfter(new Date(activity.created_at), cutoffDate),
    );
  }, [activities, dateRange]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const yesterday = subDays(now, 1);
    const lastWeek = subDays(now, 7);

    const todayActivities = filteredActivities.filter((a) =>
      isAfter(new Date(a.created_at), startOfDay(now)),
    );

    const yesterdayActivities = activities.filter((a) => {
      const date = new Date(a.created_at);
      return (
        isAfter(date, startOfDay(yesterday)) &&
        isBefore(date, endOfDay(yesterday))
      );
    });

    const lastWeekActivities = activities.filter(
      (a) =>
        isAfter(new Date(a.created_at), lastWeek) &&
        isBefore(new Date(a.created_at), subDays(now, 1)),
    );

    const thisWeekActivities = filteredActivities.filter((a) =>
      isAfter(new Date(a.created_at), subDays(now, 7)),
    );

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const totalActivities = filteredActivities.length;
    const uniqueActors = new Set(
      filteredActivities.map((a) => a.actor_id).filter(Boolean),
    ).size;
    const avgPerDay =
      totalActivities /
      (dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90);
    const unreadCount = filteredActivities.filter(
      (a) => !a.read_by?.length,
    ).length;

    return [
      {
        title: 'Total Activities',
        value: totalActivities,
        change: calculateChange(totalActivities, lastWeekActivities.length),
        changeType:
          totalActivities >= lastWeekActivities.length
            ? 'increase'
            : 'decrease',
        icon: ActivityIcon,
      },
      {
        title: 'Active Users',
        value: uniqueActors,
        change: calculateChange(
          uniqueActors,
          new Set(lastWeekActivities.map((a) => a.actor_id).filter(Boolean))
            .size,
        ),
        changeType: 'increase',
        icon: Users,
      },
      {
        title: 'Daily Average',
        value: avgPerDay.toFixed(1),
        change: calculateChange(
          todayActivities.length,
          yesterdayActivities.length,
        ),
        changeType:
          todayActivities.length >= yesterdayActivities.length
            ? 'increase'
            : 'decrease',
        icon: Clock,
      },
      {
        title: 'Unread Items',
        value: unreadCount,
        change: 0,
        changeType: 'neutral',
        icon: FileText,
      },
    ] as MetricCard[];
  }, [filteredActivities, activities, dateRange]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const data: ChartData[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dayActivities = filteredActivities.filter((activity) => {
        const activityDate = new Date(activity.created_at);
        return (
          isAfter(activityDate, dayStart) && isBefore(activityDate, dayEnd)
        );
      });

      const actorTypes = dayActivities.reduce(
        (acc, activity) => {
          acc[activity.actor_type] = (acc[activity.actor_type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      data.push({
        date: format(date, dateRange === '7d' ? 'EEE' : 'MMM dd'),
        total: dayActivities.length,
        clients: actorTypes.client || 0,
        vendors: actorTypes.vendor || 0,
        system: actorTypes.system || 0,
        ...actorTypes,
      });
    }

    return data;
  }, [filteredActivities, dateRange]);

  // Activity type distribution
  const activityTypeData = useMemo(() => {
    const types = filteredActivities.reduce(
      (acc, activity) => {
        acc[activity.activity_type] = (acc[activity.activity_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(types)
      .map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 activity types
  }, [filteredActivities]);

  // Entity type distribution
  const entityTypeData = useMemo(() => {
    const types = filteredActivities.reduce(
      (acc, activity) => {
        acc[activity.entity_type] = (acc[activity.entity_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(types).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color:
        ENTITY_TYPE_COLORS[name as keyof typeof ENTITY_TYPE_COLORS] ||
        '#6b7280',
    }));
  }, [filteredActivities]);

  // Peak hours analysis
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: format(new Date().setHours(i, 0, 0, 0), 'ha'),
      count: 0,
    }));

    filteredActivities.forEach((activity) => {
      const hour = new Date(activity.created_at).getHours();
      hours[hour].count++;
    });

    return hours;
  }, [filteredActivities]);

  const handleExport = () => {
    const exportData = {
      summary: metrics,
      timeSeriesData: chartData,
      activityTypes: activityTypeData,
      entityTypes: entityTypeData,
      hourlyDistribution: hourlyData,
      generatedAt: new Date().toISOString(),
      dateRange,
      totalActivities: filteredActivities.length,
    };

    onExport?.(exportData);
  };

  const MetricCard = ({ metric }: { metric: MetricCard }) => {
    const Icon = metric.icon;
    const isPositive = metric.changeType === 'increase';
    const isNegative = metric.changeType === 'decrease';

    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{metric.title}</p>
            <p className="text-2xl font-bold">{metric.value}</p>
          </div>
          <Icon className="w-8 h-8 text-gray-400" />
        </div>

        {metric.change !== 0 && (
          <div className="flex items-center mt-2">
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            ) : isNegative ? (
              <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
            ) : null}
            <span
              className={`text-sm ${
                isPositive
                  ? 'text-green-600'
                  : isNegative
                    ? 'text-red-600'
                    : 'text-gray-600'
              }`}
            >
              {Math.abs(metric.change).toFixed(1)}% vs last period
            </span>
          </div>
        )}
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Activity Analytics</h2>
          <p className="text-gray-600">
            Insights from {filteredActivities.length} activities in the last{' '}
            {dateRange}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex rounded-lg border">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <Button
                key={range}
                size="sm"
                variant={dateRange === range ? 'default' : 'ghost'}
                onClick={() => setDateRange(range)}
                className="rounded-none first:rounded-l-lg last:rounded-r-lg"
              >
                {range}
              </Button>
            ))}
          </div>

          {onRefresh && (
            <Button size="sm" variant="outline" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}

          {onExport && (
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <MetricCard key={index} metric={metric} />
        ))}
      </div>

      {/* Charts */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="types">Types</TabsTrigger>
          <TabsTrigger value="timing">Timing</TabsTrigger>
          <TabsTrigger value="actors">Actors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Activity Timeline</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Activity Types</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={activityTypeData}
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
                    {activityTypeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Entity Types</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={entityTypeData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {entityTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timing" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Activity by Hour</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="actors" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Activity by Actor Type
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="clients"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                />
                <Area
                  type="monotone"
                  dataKey="vendors"
                  stackId="1"
                  stroke="#10b981"
                  fill="#10b981"
                />
                <Area
                  type="monotone"
                  dataKey="system"
                  stackId="1"
                  stroke="#6b7280"
                  fill="#6b7280"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
