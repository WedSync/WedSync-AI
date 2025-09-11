'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Heart,
  DollarSign,
  Clock,
  Target,
  Zap,
  BarChart3,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Filter,
  Eye,
  MousePointer,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Types for analytics data
interface WeddingMetric {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  changePercent: number;
  category: 'engagement' | 'conversion' | 'revenue' | 'satisfaction';
  target?: number;
  unit: 'number' | 'percentage' | 'currency' | 'days';
}

interface UserBehaviorData {
  timestamp: string;
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgSessionDuration: number;
  conversionRate: number;
}

interface FeatureAdoptionData {
  feature: string;
  adoptionRate: number;
  usageGrowth: number;
  category: string;
  color: string;
}

interface WeddingJourneyStage {
  stage: string;
  users: number;
  conversionRate: number;
  avgTimeSpent: number;
  dropoffRate: number;
  color: string;
}

interface RealTimeEvent {
  id: string;
  type: 'user_action' | 'conversion' | 'error' | 'milestone';
  description: string;
  timestamp: string;
  value?: number;
  userId?: string;
  location?: string;
}

export default function RealTimeAnalyticsDashboard() {
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>(
    '24h',
  );
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'engagement' | 'conversion' | 'revenue'
  >('all');

  // Analytics data state
  const [weddingMetrics, setWeddingMetrics] = useState<WeddingMetric[]>([]);
  const [userBehavior, setUserBehavior] = useState<UserBehaviorData[]>([]);
  const [featureAdoption, setFeatureAdoption] = useState<FeatureAdoptionData[]>(
    [],
  );
  const [journeyStages, setJourneyStages] = useState<WeddingJourneyStage[]>([]);
  const [realtimeEvents, setRealtimeEvents] = useState<RealTimeEvent[]>([]);

  // Load analytics data
  useEffect(() => {
    const loadAnalyticsData = async () => {
      setIsLoading(true);
      try {
        // Load all dashboard data in parallel
        const [metricsRes, behaviorRes, adoptionRes, journeyRes, eventsRes] =
          await Promise.all([
            fetch(
              `/api/analytics/dashboard/metrics?range=${timeRange}&category=${selectedCategory}`,
            ),
            fetch(`/api/analytics/dashboard/behavior?range=${timeRange}`),
            fetch(`/api/analytics/dashboard/features?range=${timeRange}`),
            fetch(`/api/analytics/dashboard/journey?range=${timeRange}`),
            fetch(`/api/analytics/dashboard/realtime?range=${timeRange}`),
          ]);

        if (metricsRes.ok) {
          const metrics = await metricsRes.json();
          setWeddingMetrics(metrics.data || generateMockMetrics());
        }

        if (behaviorRes.ok) {
          const behavior = await behaviorRes.json();
          setUserBehavior(behavior.data || generateMockBehavior());
        }

        if (adoptionRes.ok) {
          const adoption = await adoptionRes.json();
          setFeatureAdoption(adoption.data || generateMockAdoption());
        }

        if (journeyRes.ok) {
          const journey = await journeyRes.json();
          setJourneyStages(journey.data || generateMockJourney());
        }

        if (eventsRes.ok) {
          const events = await eventsRes.json();
          setRealtimeEvents(events.data || generateMockEvents());
        }
      } catch (error) {
        console.error('Failed to load analytics data:', error);
        // Load mock data on error
        setWeddingMetrics(generateMockMetrics());
        setUserBehavior(generateMockBehavior());
        setFeatureAdoption(generateMockAdoption());
        setJourneyStages(generateMockJourney());
        setRealtimeEvents(generateMockEvents());
      } finally {
        setIsLoading(false);
        setLastUpdated(new Date());
      }
    };

    loadAnalyticsData();
  }, [timeRange, selectedCategory]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLastUpdated(new Date());
      // Refresh data every 30 seconds
      // In a real implementation, this would fetch incremental updates
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Computed values
  const totalActiveUsers = useMemo(() => {
    return userBehavior.reduce((sum, data) => sum + data.uniqueVisitors, 0);
  }, [userBehavior]);

  const avgConversionRate = useMemo(() => {
    return (
      userBehavior.reduce((sum, data) => sum + data.conversionRate, 0) /
      userBehavior.length
    );
  }, [userBehavior]);

  // Filter metrics by category
  const filteredMetrics = useMemo(() => {
    if (selectedCategory === 'all') return weddingMetrics;
    return weddingMetrics.filter(
      (metric) => metric.category === selectedCategory,
    );
  }, [weddingMetrics, selectedCategory]);

  // Chart colors
  const chartColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  const handleRefresh = () => {
    setLastUpdated(new Date());
    window.location.reload(); // Simple refresh for demo
  };

  const handleExport = () => {
    // Export dashboard data as JSON
    const dashboardData = {
      metrics: weddingMetrics,
      userBehavior,
      featureAdoption,
      journeyStages,
      realtimeEvents,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(dashboardData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-dashboard-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-64 bg-gray-100 animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Real-Time Analytics</h1>
          <p className="text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Range Filter */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All Categories</option>
            <option value="engagement">Engagement</option>
            <option value="conversion">Conversion</option>
            <option value="revenue">Revenue</option>
          </select>

          {/* Auto-refresh toggle */}
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="w-4 h-4 mr-2" />
            Auto-refresh
          </Button>

          {/* Manual refresh */}
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>

          {/* Export */}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredMetrics.slice(0, 4).map((metric) => (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {metric.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-2xl font-bold">
                        {formatMetricValue(metric.value, metric.unit)}
                      </p>
                      <Badge
                        variant={
                          metric.trend === 'up'
                            ? 'default'
                            : metric.trend === 'down'
                              ? 'destructive'
                              : 'secondary'
                        }
                        className="text-xs"
                      >
                        {metric.trend === 'up' && (
                          <ArrowUpRight className="w-3 h-3 mr-1" />
                        )}
                        {metric.trend === 'down' && (
                          <ArrowDownRight className="w-3 h-3 mr-1" />
                        )}
                        {Math.abs(metric.changePercent).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'p-2 rounded-full',
                      metric.category === 'engagement' &&
                        'bg-blue-100 text-blue-600',
                      metric.category === 'conversion' &&
                        'bg-green-100 text-green-600',
                      metric.category === 'revenue' &&
                        'bg-yellow-100 text-yellow-600',
                      metric.category === 'satisfaction' &&
                        'bg-purple-100 text-purple-600',
                    )}
                  >
                    {getMetricIcon(metric.category)}
                  </div>
                </div>
                {metric.target && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress to target</span>
                      <span>
                        {((metric.value / metric.target) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={cn(
                          'h-2 rounded-full transition-all duration-300',
                          metric.value / metric.target >= 1
                            ? 'bg-green-500'
                            : 'bg-blue-500',
                        )}
                        style={{
                          width: `${Math.min((metric.value / metric.target) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Behavior</TabsTrigger>
          <TabsTrigger value="features">Feature Adoption</TabsTrigger>
          <TabsTrigger value="journey">Wedding Journey</TabsTrigger>
          <TabsTrigger value="realtime">Real-Time</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Behavior Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  User Activity Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={userBehavior}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString()
                      }
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(label) =>
                        new Date(label).toLocaleString()
                      }
                      formatter={(value, name) => [value, name]}
                    />
                    <Area
                      type="monotone"
                      dataKey="pageViews"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="uniqueVisitors"
                      stackId="1"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Conversion Funnel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Wedding Planning Funnel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={journeyStages}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="stage"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="users" fill="#8884d8" />
                    <Bar dataKey="conversionRate" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Behavior Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>User Engagement Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={userBehavior}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString()
                      }
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(label) =>
                        new Date(label).toLocaleString()
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="pageViews"
                      stroke="#8884d8"
                      strokeWidth={2}
                      name="Page Views"
                    />
                    <Line
                      type="monotone"
                      dataKey="uniqueVisitors"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      name="Unique Visitors"
                    />
                    <Line
                      type="monotone"
                      dataKey="conversionRate"
                      stroke="#ffc658"
                      strokeWidth={2}
                      name="Conversion Rate %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Active Users
                  </span>
                  <span className="font-semibold">
                    {totalActiveUsers.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Avg Conversion Rate
                  </span>
                  <span className="font-semibold">
                    {avgConversionRate.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Avg Session Duration
                  </span>
                  <span className="font-semibold">
                    {Math.round(
                      userBehavior.reduce(
                        (sum, d) => sum + d.avgSessionDuration,
                        0,
                      ) / userBehavior.length,
                    )}
                    s
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Bounce Rate
                  </span>
                  <span className="font-semibold">
                    {(
                      userBehavior.reduce((sum, d) => sum + d.bounceRate, 0) /
                      userBehavior.length
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Feature Adoption Tab */}
        <TabsContent value="features" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Feature Adoption Rates</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={featureAdoption} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="feature" type="category" width={120} />
                    <Tooltip
                      formatter={(value) => [`${value}%`, 'Adoption Rate']}
                    />
                    <Bar dataKey="adoptionRate" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Usage Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Tooltip />
                    <Pie
                      data={featureAdoption}
                      dataKey="usageGrowth"
                      nameKey="feature"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {featureAdoption.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Wedding Journey Tab */}
        <TabsContent value="journey" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Wedding Planning Journey Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {journeyStages.map((stage, index) => (
                  <Card key={stage.stage}>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div
                          className={cn(
                            'w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold',
                            `bg-${stage.color}-500`,
                          )}
                        >
                          {index + 1}
                        </div>
                        <h3 className="font-semibold text-sm mb-1">
                          {stage.stage}
                        </h3>
                        <p className="text-2xl font-bold text-primary">
                          {stage.users}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {stage.conversionRate}% conversion
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {stage.avgTimeSpent}d avg time
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={journeyStages}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Real-Time Tab */}
        <TabsContent value="realtime" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Live Activity Feed
                <Badge variant="secondary" className="ml-2">
                  {realtimeEvents.length} events
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-400 overflow-y-auto">
                <AnimatePresence>
                  {realtimeEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full',
                            event.type === 'user_action' && 'bg-blue-500',
                            event.type === 'conversion' && 'bg-green-500',
                            event.type === 'error' && 'bg-red-500',
                            event.type === 'milestone' && 'bg-yellow-500',
                          )}
                        />
                        <div>
                          <p className="text-sm font-medium">
                            {event.description}
                          </p>
                          {event.location && (
                            <p className="text-xs text-muted-foreground">
                              {event.location}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </p>
                        {event.value && (
                          <p className="text-sm font-semibold">
                            ${event.value.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper functions
function formatMetricValue(
  value: number,
  unit: 'number' | 'percentage' | 'currency' | 'days',
): string {
  switch (unit) {
    case 'currency':
      return `$${value.toLocaleString()}`;
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'days':
      return `${value}d`;
    default:
      return value.toLocaleString();
  }
}

function getMetricIcon(category: string) {
  switch (category) {
    case 'engagement':
      return <Heart className="w-5 h-5" />;
    case 'conversion':
      return <Target className="w-5 h-5" />;
    case 'revenue':
      return <DollarSign className="w-5 h-5" />;
    case 'satisfaction':
      return <Users className="w-5 h-5" />;
    default:
      return <BarChart3 className="w-5 h-5" />;
  }
}

// Mock data generators (replace with real API calls)
function generateMockMetrics(): WeddingMetric[] {
  return [
    {
      id: '1',
      name: 'Active Couples',
      value: 1247,
      previousValue: 1180,
      trend: 'up',
      change: 67,
      changePercent: 5.7,
      category: 'engagement',
      target: 1500,
      unit: 'number',
    },
    {
      id: '2',
      name: 'Booking Conversion',
      value: 23.4,
      previousValue: 21.8,
      trend: 'up',
      change: 1.6,
      changePercent: 7.3,
      category: 'conversion',
      target: 25,
      unit: 'percentage',
    },
    {
      id: '3',
      name: 'Monthly Revenue',
      value: 142500,
      previousValue: 138200,
      trend: 'up',
      change: 4300,
      changePercent: 3.1,
      category: 'revenue',
      target: 150000,
      unit: 'currency',
    },
    {
      id: '4',
      name: 'Avg Planning Time',
      value: 184,
      previousValue: 192,
      trend: 'down',
      change: -8,
      changePercent: 4.2,
      category: 'satisfaction',
      unit: 'days',
    },
  ];
}

function generateMockBehavior(): UserBehaviorData[] {
  const data = [];
  for (let i = 0; i < 30; i++) {
    data.push({
      timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      pageViews: Math.floor(Math.random() * 2000) + 1000,
      uniqueVisitors: Math.floor(Math.random() * 800) + 400,
      bounceRate: Math.random() * 30 + 20,
      avgSessionDuration: Math.random() * 300 + 180,
      conversionRate: Math.random() * 15 + 10,
    });
  }
  return data.reverse();
}

function generateMockAdoption(): FeatureAdoptionData[] {
  return [
    {
      feature: 'Guest List',
      adoptionRate: 89.2,
      usageGrowth: 12.4,
      category: 'core',
      color: '#8884d8',
    },
    {
      feature: 'Vendor Search',
      adoptionRate: 76.8,
      usageGrowth: 23.1,
      category: 'discovery',
      color: '#82ca9d',
    },
    {
      feature: 'Budget Tracker',
      adoptionRate: 68.5,
      usageGrowth: 18.7,
      category: 'planning',
      color: '#ffc658',
    },
    {
      feature: 'Timeline',
      adoptionRate: 54.2,
      usageGrowth: 31.2,
      category: 'planning',
      color: '#ff7c7c',
    },
    {
      feature: 'RSVP System',
      adoptionRate: 91.3,
      usageGrowth: 8.9,
      category: 'core',
      color: '#8dd1e1',
    },
  ];
}

function generateMockJourney(): WeddingJourneyStage[] {
  return [
    {
      stage: 'Discovery',
      users: 1000,
      conversionRate: 85,
      avgTimeSpent: 3,
      dropoffRate: 15,
      color: 'blue',
    },
    {
      stage: 'Planning',
      users: 850,
      conversionRate: 78,
      avgTimeSpent: 45,
      dropoffRate: 22,
      color: 'green',
    },
    {
      stage: 'Booking',
      users: 663,
      conversionRate: 65,
      avgTimeSpent: 12,
      dropoffRate: 35,
      color: 'yellow',
    },
    {
      stage: 'Execution',
      users: 431,
      conversionRate: 92,
      avgTimeSpent: 7,
      dropoffRate: 8,
      color: 'purple',
    },
  ];
}

function generateMockEvents(): RealTimeEvent[] {
  const events = [];
  for (let i = 0; i < 20; i++) {
    events.push({
      id: `event-${i}`,
      type: ['user_action', 'conversion', 'milestone'][
        Math.floor(Math.random() * 3)
      ] as any,
      description: [
        'New couple signed up from Instagram',
        'Wedding booked for June 2024',
        'Vendor contract signed',
        'Guest list updated',
        'Payment completed',
        'RSVP response received',
      ][Math.floor(Math.random() * 6)],
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      value:
        Math.random() > 0.5
          ? Math.floor(Math.random() * 5000) + 500
          : undefined,
      location: ['New York', 'Los Angeles', 'Chicago', 'Miami'][
        Math.floor(Math.random() * 4)
      ],
    });
  }
  return events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}
