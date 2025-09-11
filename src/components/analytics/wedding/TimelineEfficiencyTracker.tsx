'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Target,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  Filter,
  PlayCircle,
  PauseCircle,
  Zap,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import dynamic from 'next/dynamic';
import { format, differenceInDays, isAfter, isBefore } from 'date-fns';

const ResponsiveContainer = dynamic(
  () =>
    import('recharts').then((mod) => ({ default: mod.ResponsiveContainer })),
  { ssr: false },
);
const LineChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.LineChart })),
  { ssr: false },
);
const BarChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.BarChart })),
  { ssr: false },
);
const GanttChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.BarChart })),
  { ssr: false },
);
const Line = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Line })),
  { ssr: false },
);
const Bar = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Bar })),
  { ssr: false },
);
const XAxis = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.XAxis })),
  { ssr: false },
);
const YAxis = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.YAxis })),
  { ssr: false },
);
const CartesianGrid = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.CartesianGrid })),
  { ssr: false },
);
const Tooltip = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Tooltip })),
  { ssr: false },
);
const Legend = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Legend })),
  { ssr: false },
);

import {
  TimelineMilestone,
  MilestoneCategory,
} from '@/lib/analytics/wedding-metrics';

interface TimelineEfficiencyTrackerProps {
  weddingId: string;
  weddingDate: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface MilestoneEfficiencyMetrics {
  overall_efficiency: number;
  total_milestones: number;
  completed_milestones: number;
  overdue_milestones: number;
  ahead_of_schedule: number;
  at_risk_milestones: number;
  average_completion_rate: number;
  projected_completion_date: string;
  critical_path_delay: number;
}

interface DependencyIssue {
  milestone_id: string;
  milestone_name: string;
  blocked_by: string[];
  blocking: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const MILESTONE_CATEGORY_COLORS: Record<MilestoneCategory, string> = {
  planning: '#3B82F6',
  vendor_selection: '#10B981',
  booking: '#F59E0B',
  design: '#EF4444',
  logistics: '#8B5CF6',
  legal: '#F97316',
  communication: '#06B6D4',
  rehearsal: '#84CC16',
  day_of: '#EC4899',
  post_wedding: '#6B7280',
};

const PRIORITY_COLORS = {
  low: '#6B7280',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#DC2626',
};

const TimelineEfficiencyTracker: React.FC<TimelineEfficiencyTrackerProps> = ({
  weddingId,
  weddingDate,
  autoRefresh = true,
  refreshInterval = 30,
}) => {
  const [milestones, setMilestones] = useState<TimelineMilestone[]>([]);
  const [metrics, setMetrics] = useState<MilestoneEfficiencyMetrics | null>(
    null,
  );
  const [dependencies, setDependencies] = useState<DependencyIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'timeline' | 'efficiency' | 'dependencies'>(
    'timeline',
  );
  const [filterCategory, setFilterCategory] = useState<
    MilestoneCategory | 'all'
  >('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Fetch timeline data
  const fetchTimelineData = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      setError(null);

      try {
        const [milestonesResponse, metricsResponse] = await Promise.all([
          fetch(
            `/api/analytics/wedding/${weddingId}?type=timeline&include_completed=true`,
          ),
          fetch(`/api/analytics/wedding/${weddingId}/timeline/efficiency`),
        ]);

        if (!milestonesResponse.ok || !metricsResponse.ok) {
          throw new Error('Failed to fetch timeline data');
        }

        const [milestonesResult, metricsResult] = await Promise.all([
          milestonesResponse.json(),
          metricsResponse.json(),
        ]);

        setMilestones(milestonesResult.data);
        setMetrics(metricsResult.data);

        // Analyze dependencies for issues
        const dependencyIssues = analyzeDependencies(milestonesResult.data);
        setDependencies(dependencyIssues);

        setLastUpdated(milestonesResult.timestamp);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [weddingId],
  );

  // Auto-refresh functionality
  useEffect(() => {
    fetchTimelineData();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(
        () => fetchTimelineData(false),
        refreshInterval * 1000,
      );
      return () => clearInterval(interval);
    }
  }, [fetchTimelineData, autoRefresh, refreshInterval]);

  // Analyze milestone dependencies for bottlenecks
  const analyzeDependencies = useCallback(
    (milestoneData: TimelineMilestone[]): DependencyIssue[] => {
      const issues: DependencyIssue[] = [];

      milestoneData.forEach((milestone) => {
        if (milestone.depends_on_milestone_ids.length > 0) {
          const blockedBy = milestone.depends_on_milestone_ids
            .map(
              (id) =>
                milestoneData.find((m) => m.id === id)?.milestone_name || id,
            )
            .filter((name) => name !== milestone.id);

          const blocking = milestone.blocks_milestone_ids
            .map(
              (id) =>
                milestoneData.find((m) => m.id === id)?.milestone_name || id,
            )
            .filter((name) => name !== milestone.id);

          let severity: DependencyIssue['severity'] = 'low';

          if (
            milestone.priority_level === 'critical' &&
            milestone.days_ahead_behind < -7
          ) {
            severity = 'critical';
          } else if (
            milestone.priority_level === 'high' &&
            milestone.days_ahead_behind < -3
          ) {
            severity = 'high';
          } else if (milestone.days_ahead_behind < -1) {
            severity = 'medium';
          }

          if (
            blockedBy.length > 0 ||
            blocking.length > 0 ||
            severity !== 'low'
          ) {
            issues.push({
              milestone_id: milestone.id,
              milestone_name: milestone.milestone_name,
              blocked_by: blockedBy,
              blocking: blocking,
              severity,
            });
          }
        }
      });

      return issues.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
    },
    [],
  );

  // Filter milestones based on selected criteria
  const filteredMilestones = useMemo(() => {
    let filtered = milestones;

    if (filterCategory !== 'all') {
      filtered = filtered.filter(
        (m) => m.milestone_category === filterCategory,
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((m) => m.milestone_status === filterStatus);
    }

    return filtered.sort(
      (a, b) =>
        new Date(a.target_completion_date).getTime() -
        new Date(b.target_completion_date).getTime(),
    );
  }, [milestones, filterCategory, filterStatus]);

  // Timeline progress chart data
  const timelineProgressData = useMemo(() => {
    const today = new Date();
    const weddingDay = new Date(weddingDate);

    // Group milestones by month
    const monthlyProgress = milestones.reduce(
      (acc, milestone) => {
        const month = format(
          new Date(milestone.target_completion_date),
          'yyyy-MM',
        );
        if (!acc[month]) {
          acc[month] = {
            month: format(
              new Date(milestone.target_completion_date),
              'MMM yyyy',
            ),
            planned: 0,
            completed: 0,
            overdue: 0,
            inProgress: 0,
          };
        }

        acc[month].planned++;
        if (milestone.is_completed) {
          acc[month].completed++;
        } else if (isAfter(today, new Date(milestone.target_completion_date))) {
          acc[month].overdue++;
        } else {
          acc[month].inProgress++;
        }

        return acc;
      },
      {} as Record<string, any>,
    );

    return Object.values(monthlyProgress);
  }, [milestones, weddingDate]);

  // Efficiency trend data
  const efficiencyTrendData = useMemo(() => {
    if (!milestones.length) return [];

    const sortedMilestones = [...milestones].sort(
      (a, b) =>
        new Date(a.target_completion_date).getTime() -
        new Date(b.target_completion_date).getTime(),
    );

    const cumulativeEfficiency = [];
    let completedCount = 0;
    let totalCount = 0;

    for (let i = 0; i < sortedMilestones.length; i++) {
      const milestone = sortedMilestones[i];
      totalCount++;

      if (milestone.is_completed) {
        completedCount++;
      }

      const efficiency =
        totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
      const onSchedule = milestone.days_ahead_behind >= 0 ? 1 : 0;

      cumulativeEfficiency.push({
        milestone: milestone.milestone_name.substring(0, 20) + '...',
        efficiency: Math.round(efficiency),
        onSchedule: onSchedule * 100,
        date: format(new Date(milestone.target_completion_date), 'MMM dd'),
      });
    }

    return cumulativeEfficiency;
  }, [milestones]);

  const getMilestoneStatusIcon = (milestone: TimelineMilestone) => {
    if (milestone.is_completed) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (milestone.milestone_status === 'overdue') {
      return <XCircle className="h-5 w-5 text-red-500" />;
    } else if (milestone.milestone_status === 'in_progress') {
      return <PlayCircle className="h-5 w-5 text-blue-500" />;
    } else if (milestone.milestone_status === 'on_hold') {
      return <PauseCircle className="h-5 w-5 text-yellow-500" />;
    } else {
      return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchTimelineData()}
          className="ml-2"
        >
          Retry
        </Button>
      </Alert>
    );
  }

  if (loading && !milestones.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading timeline data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="timeline-efficiency-tracker">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Timeline Efficiency Tracking
          </h2>
          <p className="text-muted-foreground">
            Monitor milestone progress, dependencies, and planning efficiency
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {new Date(lastUpdated).toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select value={view} onValueChange={(value: any) => setView(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="timeline">Timeline View</SelectItem>
              <SelectItem value="efficiency">Efficiency View</SelectItem>
              <SelectItem value="dependencies">Dependencies</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterCategory}
            onValueChange={(value: any) => setFilterCategory(value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="vendor_selection">Vendor Selection</SelectItem>
              <SelectItem value="booking">Booking</SelectItem>
              <SelectItem value="design">Design</SelectItem>
              <SelectItem value="logistics">Logistics</SelectItem>
              <SelectItem value="legal">Legal</SelectItem>
              <SelectItem value="communication">Communication</SelectItem>
              <SelectItem value="rehearsal">Rehearsal</SelectItem>
              <SelectItem value="day_of">Day Of</SelectItem>
              <SelectItem value="post_wedding">Post Wedding</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => fetchTimelineData()}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Efficiency Overview Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Overall Efficiency
              </CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.overall_efficiency}%
              </div>
              <Progress value={metrics.overall_efficiency} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.completed_milestones}/{metrics.total_milestones}
              </div>
              <p className="text-xs text-muted-foreground">
                {(
                  (metrics.completed_milestones / metrics.total_milestones) *
                  100
                ).toFixed(1)}
                % complete
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ahead of Schedule
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {metrics.ahead_of_schedule}
              </div>
              <p className="text-xs text-muted-foreground">milestones ahead</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">At Risk</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {metrics.at_risk_milestones}
              </div>
              <p className="text-xs text-muted-foreground">need attention</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Timeline Progress Charts */}
      {view === 'timeline' && (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Timeline Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timelineProgressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="completed"
                    stackId="a"
                    fill="#22C55E"
                    name="Completed"
                  />
                  <Bar
                    dataKey="inProgress"
                    stackId="a"
                    fill="#3B82F6"
                    name="In Progress"
                  />
                  <Bar
                    dataKey="overdue"
                    stackId="a"
                    fill="#EF4444"
                    name="Overdue"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Efficiency View */}
      {view === 'efficiency' && (
        <Card>
          <CardHeader>
            <CardTitle>Efficiency Trend Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={efficiencyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  formatter={(value: any, name: string) => [`${value}%`, name]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="efficiency"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  name="Cumulative Efficiency"
                />
                <Line
                  type="monotone"
                  dataKey="onSchedule"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="On Schedule %"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Dependencies View */}
      {view === 'dependencies' && (
        <Card>
          <CardHeader>
            <CardTitle>Dependency Issues & Bottlenecks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dependencies.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                  <h3 className="font-semibold mb-2">
                    No Dependency Issues Found
                  </h3>
                  <p>
                    All milestones appear to be on track with their
                    dependencies.
                  </p>
                </div>
              ) : (
                dependencies.map((issue) => (
                  <div
                    key={issue.milestone_id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">
                          {issue.milestone_name}
                        </h4>
                        <Badge
                          variant={
                            issue.severity === 'critical'
                              ? 'destructive'
                              : issue.severity === 'high'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {issue.severity.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1">
                        {issue.blocked_by.length > 0 && (
                          <p>
                            <strong>Blocked by:</strong>{' '}
                            {issue.blocked_by.join(', ')}
                          </p>
                        )}
                        {issue.blocking.length > 0 && (
                          <p>
                            <strong>Blocking:</strong>{' '}
                            {issue.blocking.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Milestone List */}
      <Card>
        <CardHeader>
          <CardTitle>Milestone Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredMilestones.map((milestone) => (
              <div
                key={milestone.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  {getMilestoneStatusIcon(milestone)}

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-semibold">
                        {milestone.milestone_name}
                      </h4>
                      <Badge
                        variant="outline"
                        style={{
                          borderColor:
                            MILESTONE_CATEGORY_COLORS[
                              milestone.milestone_category
                            ],
                          color:
                            MILESTONE_CATEGORY_COLORS[
                              milestone.milestone_category
                            ],
                        }}
                      >
                        {milestone.milestone_category}
                      </Badge>
                      <Badge
                        variant="outline"
                        style={{
                          borderColor:
                            PRIORITY_COLORS[milestone.priority_level],
                          color: PRIORITY_COLORS[milestone.priority_level],
                        }}
                      >
                        {milestone.priority_level}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Target:{' '}
                        {format(
                          new Date(milestone.target_completion_date),
                          'MMM dd, yyyy',
                        )}
                      </span>
                      {milestone.actual_completion_date && (
                        <span>
                          Completed:{' '}
                          {format(
                            new Date(milestone.actual_completion_date),
                            'MMM dd, yyyy',
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <Progress
                        value={milestone.completion_percentage}
                        className="w-20"
                      />
                      <span className="text-sm font-medium">
                        {milestone.completion_percentage}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-sm">
                      {milestone.days_ahead_behind > 0 ? (
                        <>
                          <ArrowUp className="h-3 w-3 text-green-500" />
                          <span className="text-green-600">
                            {milestone.days_ahead_behind} days ahead
                          </span>
                        </>
                      ) : milestone.days_ahead_behind < 0 ? (
                        <>
                          <ArrowDown className="h-3 w-3 text-red-500" />
                          <span className="text-red-600">
                            {Math.abs(milestone.days_ahead_behind)} days behind
                          </span>
                        </>
                      ) : (
                        <>
                          <ArrowRight className="h-3 w-3 text-blue-500" />
                          <span className="text-blue-600">On schedule</span>
                        </>
                      )}
                    </div>
                  </div>

                  <Badge className={getStatusColor(milestone.milestone_status)}>
                    {milestone.milestone_status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimelineEfficiencyTracker;
