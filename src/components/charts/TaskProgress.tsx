'use client';

/**
 * WS-224: Progress Charts System - Task Progress Component
 * Task completion visualization with multiple chart types
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/untitled-ui/progress';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Target,
  Calendar,
  User,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  TaskProgress as TaskProgressType,
  WeddingMilestone,
  WeddingMetrics,
} from '@/types/charts';

interface TaskProgressProps {
  tasks: TaskProgressType[];
  milestones: WeddingMilestone[];
  weddingMetrics: WeddingMetrics | null;
  className?: string;
}

export function TaskProgress({
  tasks,
  milestones,
  weddingMetrics,
  className,
}: TaskProgressProps) {
  const [selectedView, setSelectedView] = useState<
    'overview' | 'trends' | 'breakdown' | 'deadlines'
  >('overview');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Calculate task statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const overdueTasks = tasks.filter(
    (t) => !t.completed && t.dueDate && new Date(t.dueDate) < new Date(),
  ).length;
  const completionRate =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Get unique categories
  const categories = Array.from(new Set(tasks.map((t) => t.category)));

  // Filter tasks by category
  const filteredTasks =
    selectedCategory === 'all'
      ? tasks
      : tasks.filter((t) => t.category === selectedCategory);

  // Task completion by category
  const categoryData = categories.map((category) => {
    const categoryTasks = tasks.filter((t) => t.category === category);
    const completed = categoryTasks.filter((t) => t.completed).length;
    const total = categoryTasks.length;

    return {
      name: category,
      completed,
      pending: total - completed,
      total,
      percentage: total > 0 ? (completed / total) * 100 : 0,
    };
  });

  // Priority distribution
  const priorityData = [
    {
      name: 'High',
      value: tasks.filter((t) => t.priority === 'high').length,
      color: '#dc2626',
      completed: tasks.filter((t) => t.priority === 'high' && t.completed)
        .length,
    },
    {
      name: 'Medium',
      value: tasks.filter((t) => t.priority === 'medium').length,
      color: '#ca8a04',
      completed: tasks.filter((t) => t.priority === 'medium' && t.completed)
        .length,
    },
    {
      name: 'Low',
      value: tasks.filter((t) => t.priority === 'low').length,
      color: '#16a34a',
      completed: tasks.filter((t) => t.priority === 'low' && t.completed)
        .length,
    },
  ].filter((item) => item.value > 0);

  // Weekly completion trend
  const getWeeklyTrend = () => {
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - 7 * (7 - i));
      return {
        week: date.toISOString().split('T')[0],
        start: new Date(date),
        end: new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000),
      };
    });

    return weeks
      .map(({ week, start, end }) => {
        const weekTasks = tasks.filter(
          (task) =>
            task.completedAt &&
            new Date(task.completedAt) >= start &&
            new Date(task.completedAt) < end,
        );

        return {
          week: `Week ${Math.floor((new Date().getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))} ago`,
          completed: weekTasks.length,
          date: start.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
        };
      })
      .reverse();
  };

  const weeklyTrendData = getWeeklyTrend();

  // Upcoming deadlines
  const upcomingDeadlines = tasks
    .filter((t) => !t.completed && t.dueDate)
    .sort(
      (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
    )
    .slice(0, 10);

  // Task velocity (tasks completed per day over last 30 days)
  const getTaskVelocity = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTasks = tasks.filter(
      (task) => task.completedAt && new Date(task.completedAt) >= thirtyDaysAgo,
    );

    return recentTasks.length / 30;
  };

  const taskVelocity = getTaskVelocity();

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with view controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Task Progress Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Track and analyze task completion across your wedding planning
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-1">
            {['overview', 'trends', 'breakdown', 'deadlines'].map((view) => (
              <Button
                key={view}
                variant={selectedView === view ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedView(view as any)}
                className="capitalize"
              >
                {view}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Task Completion
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completionRate.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {completedTasks} of {totalTasks} tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            {overdueTasks > 0 ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                overdueTasks > 0 ? 'text-red-600' : 'text-green-600',
              )}
            >
              {overdueTasks}
            </div>
            <p className="text-xs text-muted-foreground">
              {overdueTasks === 0 ? 'All on track' : 'Need attention'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Daily Velocity
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskVelocity.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Tasks per day (30d avg)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Time to Wedding
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {weddingMetrics?.daysRemaining || 0}
            </div>
            <p className="text-xs text-muted-foreground">Days remaining</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          All Categories
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className="capitalize"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* View Content */}
      {selectedView === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Completion by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Completion by Category</CardTitle>
              <CardDescription>
                Task completion rates across different categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryData.map((category) => (
                  <div key={category.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium capitalize">
                        {category.name}
                      </span>
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

          {/* Priority Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Priority Distribution</CardTitle>
              <CardDescription>
                Task breakdown by priority level
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
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as any;
                        return (
                          <div className="bg-white p-2 border rounded shadow">
                            <p className="font-medium">{data.name} Priority</p>
                            <p className="text-sm">Total: {data.value}</p>
                            <p className="text-sm">
                              Completed: {data.completed}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedView === 'trends' && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Completion Trend</CardTitle>
            <CardDescription>
              Tasks completed per week over the last 8 weeks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="completed"
                  fill="#22c55e"
                  name="Tasks Completed"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {selectedView === 'breakdown' && (
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>
              Detailed view of task completion by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="completed"
                  stackId="a"
                  fill="#22c55e"
                  name="Completed"
                />
                <Bar
                  dataKey="pending"
                  stackId="a"
                  fill="#e5e7eb"
                  name="Pending"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {selectedView === 'deadlines' && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Tasks with approaching due dates</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length > 0 ? (
              <div className="space-y-4">
                {upcomingDeadlines.map((task) => {
                  const daysUntilDue = task.dueDate
                    ? Math.ceil(
                        (new Date(task.dueDate).getTime() -
                          new Date().getTime()) /
                          (1000 * 60 * 60 * 24),
                      )
                    : 0;
                  const isOverdue = daysUntilDue < 0;
                  const isUrgent = daysUntilDue <= 3 && daysUntilDue >= 0;

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-lg border',
                        isOverdue && 'border-red-200 bg-red-50',
                        isUrgent && 'border-yellow-200 bg-yellow-50',
                      )}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{task.title}</h4>
                          <Badge
                            variant="outline"
                            size="sm"
                            className={cn(
                              'capitalize',
                              getPriorityColor(task.priority),
                            )}
                          >
                            {task.priority}
                          </Badge>
                          <Badge
                            variant="outline"
                            size="sm"
                            className="capitalize"
                          >
                            {task.category}
                          </Badge>
                        </div>

                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {task.assignedTo && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {task.assignedTo}
                            </span>
                          )}
                          {task.tags && task.tags.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {task.tags.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {task.dueDate &&
                            new Date(task.dueDate).toLocaleDateString()}
                        </p>
                        <p
                          className={cn(
                            'text-xs',
                            isOverdue && 'text-red-600 font-medium',
                            isUrgent && 'text-yellow-600 font-medium',
                          )}
                        >
                          {isOverdue
                            ? `${Math.abs(daysUntilDue)} days overdue`
                            : daysUntilDue === 0
                              ? 'Due today'
                              : `${daysUntilDue} days left`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h4 className="font-medium text-gray-900 mb-2">
                  All caught up!
                </h4>
                <p className="text-gray-600">
                  No upcoming task deadlines to worry about.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TaskProgress;
