'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  RefreshCw,
  Users,
  Target,
  AlertTriangle,
  TrendingUp,
  Calendar,
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
} from 'recharts';
import { activationService } from '@/lib/activation/activation-service';

interface FunnelStep {
  step_number: number;
  step_name: string;
  total_entered: number;
  total_completed: number;
  avg_conversion_rate: number;
  dates: Array<{
    date: string;
    users_entered: number;
    users_completed: number;
    conversion_rate: number;
  }>;
}

interface ActivationAnalytics {
  overview: {
    total_users: number;
    completed_users: number;
    completion_rate: number;
    at_risk_users: number;
    active_users: number;
    period_days: number;
  };
  funnel_steps: FunnelStep[];
  daily_metrics: Array<{
    date: string;
    total_new_users: number;
    total_completions: number;
    total_events: number;
  }>;
  recent_drop_offs: Array<{
    user_id: string;
    current_step: number;
    activation_score: number;
    last_activity_at: string;
    user_profiles: {
      email: string;
      first_name: string;
      last_name: string;
    };
  }>;
}

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884D8',
  '#82CA9D',
];

export default function ActivationFunnelDashboard() {
  const [analytics, setAnalytics] = useState<ActivationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async (days: number = 30) => {
    try {
      setLoading(true);
      setError(null);

      const data = await activationService.getFunnelAnalytics({ days });
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Generate fresh analytics for today
      await activationService.generateAnalytics();
      // Refetch the data
      await fetchAnalytics(parseInt(selectedPeriod));
    } catch (err) {
      console.error('Error refreshing analytics:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(parseInt(selectedPeriod));
  }, [selectedPeriod]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Activation Funnel</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track user activation and engagement
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Error Loading Analytics
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <Button onClick={() => fetchAnalytics(parseInt(selectedPeriod))}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { overview, funnel_steps, daily_metrics, recent_drop_offs } = analytics;

  // Prepare funnel visualization data
  const funnelData = funnel_steps.map((step) => ({
    name: step.step_name,
    users: step.total_entered,
    completed: step.total_completed,
    conversion: step.avg_conversion_rate,
    step: step.step_number,
  }));

  // Prepare daily trend data
  const dailyTrendData = daily_metrics.slice(-14).map((day) => ({
    date: new Date(day.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    newUsers: day.total_new_users,
    completions: day.total_completions,
    events: day.total_events,
  }));

  // Distribution data for pie chart
  const distributionData = [
    { name: 'Completed', value: overview.completed_users, color: '#22c55e' },
    { name: 'Active', value: overview.active_users, color: '#3b82f6' },
    { name: 'At Risk', value: overview.at_risk_users, color: '#f59e0b' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activation Funnel Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track how users activate and engage with WedSync
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.total_users.toLocaleString()}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Last {overview.period_days} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.completed_users.toLocaleString()}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Progress
                value={overview.completion_rate}
                className="flex-1 h-2"
              />
              <span className="text-xs font-medium">
                {overview.completion_rate.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              At Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {overview.at_risk_users.toLocaleString()}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Score &lt; 30 points
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {overview.active_users.toLocaleString()}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Progressing normally
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>Activation Funnel</CardTitle>
            <CardDescription>
              Users at each step of the activation process
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={funnelData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [
                    typeof value === 'number' ? value.toLocaleString() : value,
                    name === 'users'
                      ? 'Users Entered'
                      : name === 'completed'
                        ? 'Users Completed'
                        : name,
                  ]}
                />
                <Bar dataKey="users" fill="#3b82f6" name="users" />
                <Bar dataKey="completed" fill="#22c55e" name="completed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
            <CardDescription>Current status of all users</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [
                    typeof value === 'number' ? value.toLocaleString() : value,
                    'Users',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              {distributionData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Activation Trends</CardTitle>
          <CardDescription>New users and completions over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={dailyTrendData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="newUsers"
                stroke="#3b82f6"
                name="New Users"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="completions"
                stroke="#22c55e"
                name="Completions"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Drop-offs */}
      {recent_drop_offs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Recent Drop-offs
            </CardTitle>
            <CardDescription>
              Users who haven't been active in the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recent_drop_offs.slice(0, 10).map((user, index) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {user.user_profiles.first_name}{' '}
                      {user.user_profiles.last_name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {user.user_profiles.email}
                    </div>
                  </div>
                  <div className="text-center">
                    <Badge
                      variant={
                        user.activation_score < 20 ? 'destructive' : 'secondary'
                      }
                    >
                      Step {user.current_step}
                    </Badge>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Score: {user.activation_score}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Last active
                    </div>
                    <div className="text-sm font-medium">
                      {new Date(user.last_activity_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
