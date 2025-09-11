'use client';

/**
 * WS-224: Progress Charts System - Overview Component
 * High-level wedding planning progress overview with key metrics
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/untitled-ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  Target,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  ProgressOverview as ProgressOverviewType,
  WeddingMilestone,
  TaskProgress,
  WeddingMetrics,
  ProgressAlerts,
} from '@/types/charts';

interface ProgressOverviewProps {
  overview: ProgressOverviewType | null;
  milestones: WeddingMilestone[];
  tasks: TaskProgress[];
  weddingMetrics: WeddingMetrics | null;
  alerts: ProgressAlerts | null;
  className?: string;
}

export function ProgressOverview({
  overview,
  milestones,
  tasks,
  weddingMetrics,
  alerts,
  className,
}: ProgressOverviewProps) {
  // Calculate milestone completion by category
  const milestonesByCategory = milestones.reduce(
    (acc, milestone) => {
      if (!acc[milestone.category]) {
        acc[milestone.category] = { total: 0, completed: 0 };
      }
      acc[milestone.category].total++;
      if (milestone.status === 'completed') {
        acc[milestone.category].completed++;
      }
      return acc;
    },
    {} as Record<string, { total: number; completed: number }>,
  );

  const categoryData = Object.entries(milestonesByCategory).map(
    ([category, data]) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      completed: data.completed,
      total: data.total,
      percentage: data.total > 0 ? (data.completed / data.total) * 100 : 0,
      remaining: data.total - data.completed,
    }),
  );

  // Task completion trend (last 7 days)
  const getTaskTrend = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    return last7Days.map((dateStr) => {
      const completedTasks = tasks.filter(
        (task) =>
          task.completedAt &&
          task.completedAt.toISOString().split('T')[0] === dateStr,
      );

      return {
        date: new Date(dateStr).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        completed: completedTasks.length,
        cumulative: tasks.filter(
          (task) =>
            task.completedAt && new Date(task.completedAt) <= new Date(dateStr),
        ).length,
      };
    });
  };

  const taskTrendData = getTaskTrend();

  // Priority distribution
  const priorityData = [
    {
      name: 'Critical',
      value: milestones.filter((m) => m.priority === 'critical').length,
      color: '#dc2626',
    },
    {
      name: 'High',
      value: milestones.filter((m) => m.priority === 'high').length,
      color: '#ea580c',
    },
    {
      name: 'Medium',
      value: milestones.filter((m) => m.priority === 'medium').length,
      color: '#ca8a04',
    },
    {
      name: 'Low',
      value: milestones.filter((m) => m.priority === 'low').length,
      color: '#16a34a',
    },
  ].filter((item) => item.value > 0);

  // Wedding planning phase indicator
  const getPhaseColor = (phase: WeddingMetrics['planningPhase']) => {
    switch (phase) {
      case 'early':
        return 'bg-blue-500';
      case 'middle':
        return 'bg-yellow-500';
      case 'final':
        return 'bg-orange-500';
      case 'week_of':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPhaseLabel = (phase: WeddingMetrics['planningPhase']) => {
    switch (phase) {
      case 'early':
        return 'Early Planning';
      case 'middle':
        return 'Main Planning';
      case 'final':
        return 'Final Preparations';
      case 'week_of':
        return 'Wedding Week';
      default:
        return 'Planning';
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Wedding Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Planning Phase
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-3 h-3 rounded-full',
                  getPhaseColor(weddingMetrics?.planningPhase || 'early'),
                )}
              />
              <span className="text-lg font-semibold">
                {getPhaseLabel(weddingMetrics?.planningPhase || 'early')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {weddingMetrics?.daysRemaining} days remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Venue Status</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {weddingMetrics?.venueBooked ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Clock className="h-4 w-4 text-orange-500" />
              )}
              <span className="text-lg font-semibold">
                {weddingMetrics?.venueBooked ? 'Booked' : 'Pending'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {weddingMetrics?.venueBooked
                ? 'Venue confirmed'
                : 'Needs booking'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Guest Count</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {weddingMetrics?.guestCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Expected attendees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stress Level</CardTitle>
            {weddingMetrics?.stressLevel === 'high' ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : weddingMetrics?.stressLevel === 'medium' ? (
              <Clock className="h-4 w-4 text-yellow-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <Badge
              variant={
                weddingMetrics?.stressLevel === 'high'
                  ? 'destructive'
                  : weddingMetrics?.stressLevel === 'medium'
                    ? 'warning'
                    : 'success'
              }
            >
              {weddingMetrics?.stressLevel || 'low'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              Based on current issues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress by Category */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Progress by Category</CardTitle>
            <CardDescription>
              Completion status of different wedding planning areas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryData.map((category) => (
                <div key={category.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-muted-foreground">
                      {category.completed}/{category.total} (
                      {category.percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <Progress value={category.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
            <CardDescription>
              Breakdown of milestones by priority level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Task Completion Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Task Completion</CardTitle>
          <CardDescription>
            Task completion trend over the last 7 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={taskTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
                name="Tasks Completed"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Progress Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Category Completion Overview</CardTitle>
          <CardDescription>
            Visual comparison of progress across all categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 'dataMax']} />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#22c55e" name="Completed" />
              <Bar dataKey="remaining" fill="#e5e7eb" name="Remaining" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Upcoming Deadlines Alert */}
      {alerts?.upcomingDeadlines && alerts.upcomingDeadlines.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <Clock className="h-5 w-5" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.upcomingDeadlines.slice(0, 5).map((milestone) => (
                <div
                  key={milestone.id}
                  className="flex items-center justify-between py-2 border-b border-orange-200 last:border-0"
                >
                  <div>
                    <p className="font-medium text-orange-900">
                      {milestone.name}
                    </p>
                    <p className="text-sm text-orange-700">
                      {milestone.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-orange-900">
                      {new Date(milestone.dueDate).toLocaleDateString()}
                    </p>
                    <Badge
                      variant="outline"
                      size="sm"
                      className="text-orange-700 border-orange-300"
                    >
                      {milestone.priority}
                    </Badge>
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

export default ProgressOverview;
