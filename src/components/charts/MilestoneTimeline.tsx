'use client';

/**
 * WS-224: Progress Charts System - Milestone Timeline Component
 * Visual timeline showing wedding planning milestones with progress indicators
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
} from 'recharts';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  MapPin,
  Camera,
  Utensils,
  Music,
  Car,
  Flower,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WeddingMilestone, ProgressTimelineData } from '@/types/charts';

interface MilestoneTimelineProps {
  milestones: WeddingMilestone[];
  timeline: ProgressTimelineData[];
  weddingDate?: Date;
  className?: string;
}

export function MilestoneTimeline({
  milestones,
  timeline,
  weddingDate,
  className,
}: MilestoneTimelineProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'timeline' | 'gantt' | 'progress'>(
    'timeline',
  );

  // Get category icon
  const getCategoryIcon = (category: WeddingMilestone['category']) => {
    switch (category) {
      case 'venue':
        return MapPin;
      case 'photography':
        return Camera;
      case 'catering':
        return Utensils;
      case 'music':
        return Music;
      case 'transport':
        return Car;
      case 'flowers':
        return Flower;
      default:
        return Calendar;
    }
  };

  // Get status color and icon
  const getStatusInfo = (status: WeddingMilestone['status']) => {
    switch (status) {
      case 'completed':
        return {
          color: 'text-green-600 bg-green-100',
          icon: CheckCircle,
          badge: 'success' as const,
        };
      case 'in_progress':
        return {
          color: 'text-blue-600 bg-blue-100',
          icon: Clock,
          badge: 'default' as const,
        };
      case 'overdue':
        return {
          color: 'text-red-600 bg-red-100',
          icon: AlertTriangle,
          badge: 'destructive' as const,
        };
      default:
        return {
          color: 'text-gray-600 bg-gray-100',
          icon: Clock,
          badge: 'secondary' as const,
        };
    }
  };

  // Filter milestones by category
  const filteredMilestones =
    selectedCategory === 'all'
      ? milestones
      : milestones.filter((m) => m.category === selectedCategory);

  // Sort milestones by due date
  const sortedMilestones = [...filteredMilestones].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );

  // Get unique categories for filter
  const categories = Array.from(new Set(milestones.map((m) => m.category)));

  // Prepare timeline chart data
  const timelineChartData = timeline.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    milestones: item.milestonesCompleted,
    tasks: item.tasksCompleted,
    cumulativeMilestones: timeline
      .slice(0, timeline.indexOf(item) + 1)
      .reduce((sum, t) => sum + t.milestonesCompleted, 0),
  }));

  // Prepare Gantt chart data
  const ganttData = sortedMilestones.map((milestone, index) => {
    const now = new Date();
    const dueDate = new Date(milestone.dueDate);
    const daysFromNow = Math.ceil(
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      name: milestone.name,
      category: milestone.category,
      daysFromNow,
      progress: milestone.progress,
      status: milestone.status,
      priority: milestone.priority,
      index,
    };
  });

  // Calculate overall timeline progress
  const overallProgress =
    milestones.length > 0
      ? (milestones.filter((m) => m.status === 'completed').length /
          milestones.length) *
        100
      : 0;

  // Days until wedding
  const daysUntilWedding = weddingDate
    ? Math.ceil(
        (weddingDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
      )
    : 0;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Wedding Timeline</h3>
          <p className="text-sm text-muted-foreground">
            {daysUntilWedding > 0
              ? `${daysUntilWedding} days until wedding`
              : 'Wedding day!'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode selector */}
          <div className="flex rounded-lg border p-1">
            {['timeline', 'gantt', 'progress'].map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(mode as any)}
                className="capitalize"
              >
                {mode}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          All Categories
        </Button>
        {categories.map((category) => {
          const Icon = getCategoryIcon(category);
          return (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="capitalize"
            >
              <Icon className="h-3 w-3 mr-1" />
              {category}
            </Button>
          );
        })}
      </div>

      {/* Progress Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium">Overall Timeline Progress</p>
              <p className="text-2xl font-bold">
                {overallProgress.toFixed(0)}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {milestones.filter((m) => m.status === 'completed').length} of{' '}
                {milestones.length} milestones
              </p>
            </div>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </CardContent>
      </Card>

      {/* Timeline Views */}
      {viewMode === 'timeline' && (
        <Card>
          <CardHeader>
            <CardTitle>Milestone Progress Trend</CardTitle>
            <CardDescription>
              Milestone and task completion over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timelineChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="cumulativeMilestones"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                  name="Milestones Completed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {viewMode === 'gantt' && (
        <Card>
          <CardHeader>
            <CardTitle>Timeline Gantt View</CardTitle>
            <CardDescription>
              Milestone schedule and progress visualization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart data={ganttData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="daysFromNow"
                  name="Days from now"
                  label={{
                    value: 'Days from now',
                    position: 'insideBottom',
                    offset: -5,
                  }}
                />
                <YAxis
                  dataKey="index"
                  name="Milestone"
                  tick={false}
                  label={{
                    value: 'Milestones',
                    angle: -90,
                    position: 'insideLeft',
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-lg">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-sm text-gray-600 capitalize">
                            {data.category}
                          </p>
                          <p className="text-sm">Progress: {data.progress}%</p>
                          <p className="text-sm">
                            Due in {data.daysFromNow} days
                          </p>
                          <Badge
                            variant={getStatusInfo(data.status).badge}
                            size="sm"
                          >
                            {data.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter dataKey="progress" fill="#8884d8" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Milestone List with Progress */}
      {viewMode === 'progress' && (
        <div className="space-y-4">
          {sortedMilestones.map((milestone, index) => {
            const StatusIcon = getStatusInfo(milestone.status).icon;
            const IconComponent = getCategoryIcon(milestone.category);
            const daysUntilDue = Math.ceil(
              (new Date(milestone.dueDate).getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24),
            );

            return (
              <Card
                key={milestone.id}
                className={cn(
                  'transition-all duration-200 hover:shadow-md',
                  milestone.status === 'overdue' && 'border-red-200 bg-red-50',
                )}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Category Icon */}
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          getStatusInfo(milestone.status).color,
                        )}
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>

                      {/* Milestone Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{milestone.name}</h4>
                          <Badge
                            variant={getStatusInfo(milestone.status).badge}
                            size="sm"
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {milestone.status.replace('_', ' ')}
                          </Badge>
                          <Badge
                            variant="outline"
                            size="sm"
                            className="capitalize"
                          >
                            {milestone.priority}
                          </Badge>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">
                              Progress
                            </span>
                            <span className="font-medium">
                              {milestone.progress}%
                            </span>
                          </div>
                          <Progress
                            value={milestone.progress}
                            className="h-2"
                          />
                        </div>

                        {/* Due Date and Assignment */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due{' '}
                            {new Date(milestone.dueDate).toLocaleDateString()}
                          </span>
                          {daysUntilDue >= 0 ? (
                            <span
                              className={cn(
                                daysUntilDue <= 3 &&
                                  milestone.status !== 'completed' &&
                                  'text-red-600 font-medium',
                              )}
                            >
                              {daysUntilDue === 0
                                ? 'Due today'
                                : `${daysUntilDue} days remaining`}
                            </span>
                          ) : (
                            <span className="text-red-600 font-medium">
                              {Math.abs(daysUntilDue)} days overdue
                            </span>
                          )}
                          {milestone.assignedTo && (
                            <span>Assigned to {milestone.assignedTo}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cost Information */}
                    {(milestone.estimatedCost || milestone.actualCost) && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Budget</p>
                        {milestone.actualCost ? (
                          <p className="font-medium">
                            £{milestone.actualCost.toLocaleString()}
                          </p>
                        ) : (
                          <p className="font-medium">
                            £{milestone.estimatedCost?.toLocaleString()}
                          </p>
                        )}
                        {milestone.estimatedCost && milestone.actualCost && (
                          <p
                            className={cn(
                              'text-xs',
                              milestone.actualCost > milestone.estimatedCost
                                ? 'text-red-600'
                                : 'text-green-600',
                            )}
                          >
                            {milestone.actualCost > milestone.estimatedCost
                              ? '+'
                              : ''}
                            £
                            {(
                              milestone.actualCost - milestone.estimatedCost
                            ).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {filteredMilestones.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h4 className="font-medium text-gray-900 mb-2">
                No milestones found
              </h4>
              <p className="text-gray-600">
                {selectedCategory === 'all'
                  ? 'No milestones have been created yet.'
                  : `No milestones found for ${selectedCategory} category.`}
              </p>
              <Button variant="outline" className="mt-4">
                Add Milestone
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MilestoneTimeline;
