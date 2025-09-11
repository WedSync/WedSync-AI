'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
} from 'recharts';
import {
  Bot,
  Users,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Settings,
  Activity,
  Brain,
  Loader2,
  RefreshCw,
  Play,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface AutomatedAssignmentManagerProps {
  weddingId: string;
  availableTasks: {
    id: string;
    title: string;
    category: string;
    priority: string;
    assigned_to: string | null;
  }[];
  onRefresh?: () => void;
}

interface AssignmentAnalytics {
  total_assignments: number;
  automated_assignments: number;
  automation_rate: number;
  average_assignment_score: number;
  average_confidence: number;
  assignment_distribution: Record<string, number>;
}

interface AssignmentResult {
  task_id: string;
  assigned_to: string;
  assignment_score: number;
  assignment_reason: string;
  estimated_completion_date: string;
  confidence_level: number;
}

export default function AutomatedAssignmentManager({
  weddingId,
  availableTasks,
  onRefresh,
}: AutomatedAssignmentManagerProps) {
  const [analytics, setAnalytics] = useState<AssignmentAnalytics | null>(null);
  const [recentAssignments, setRecentAssignments] = useState<
    AssignmentResult[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [autoAssignMode, setAutoAssignMode] = useState<
    'all' | 'unassigned' | 'selected'
  >('unassigned');

  useEffect(() => {
    fetchAnalytics();
  }, [weddingId]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(
        `/api/tasks/automation?weddingId=${weddingId}&action=analytics`,
      );
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const handleAutomatedAssignment = async () => {
    if (!weddingId) return;

    setLoading(true);
    try {
      let taskIds: string[] = [];

      switch (autoAssignMode) {
        case 'all':
          taskIds = availableTasks.map((t) => t.id);
          break;
        case 'unassigned':
          taskIds = availableTasks
            .filter((t) => !t.assigned_to)
            .map((t) => t.id);
          break;
        case 'selected':
          taskIds = selectedTasks;
          break;
      }

      if (taskIds.length === 0) {
        toast({
          title: 'No Tasks Selected',
          description: 'Please select tasks to assign',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch('/api/tasks/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_tasks',
          weddingId,
          data: { taskIds },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRecentAssignments(data.assignments);
        await fetchAnalytics();

        toast({
          title: 'Assignment Complete',
          description: data.message,
        });

        if (onRefresh) onRefresh();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Assignment failed:', error);
      toast({
        title: 'Assignment Failed',
        description: 'Failed to assign tasks automatically',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRSVPTrigger = async (newCount: number, previousCount: number) => {
    setLoading(true);
    try {
      const response = await fetch('/api/tasks/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'handle_rsvp_threshold',
          weddingId,
          data: { newCount, previousCount },
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'RSVP Trigger Processed',
          description: data.message,
        });
        await fetchAnalytics();
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('RSVP trigger failed:', error);
      toast({
        title: 'Trigger Failed',
        description: 'Failed to process RSVP trigger',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const unassignedTasks = availableTasks.filter((t) => !t.assigned_to);
  const automationRate = analytics
    ? Math.round(analytics.automation_rate * 100)
    : 0;
  const avgScore = analytics
    ? Math.round(analytics.average_assignment_score * 100)
    : 0;
  const avgConfidence = analytics
    ? Math.round(analytics.average_confidence * 100)
    : 0;

  const workloadData = analytics?.assignment_distribution
    ? Object.entries(analytics.assignment_distribution).map(
        ([member, count]) => ({
          member: `Member ${member.slice(-4)}`,
          tasks: count,
        }),
      )
    : [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6">
      {/* Header with Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Automation Rate
            </CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{automationRate}%</div>
            <Progress value={automationRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgScore}/100</div>
            <Progress value={avgScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confidence</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgConfidence}%</div>
            <Progress value={avgConfidence} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unassignedTasks.length}</div>
            <p className="text-xs text-muted-foreground">tasks remaining</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Interface */}
      <Tabs defaultValue="assignment" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="assignment">Auto Assignment</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="triggers">Triggers</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="assignment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Automated Task Assignment
              </CardTitle>
              <CardDescription>
                Intelligently assign tasks based on team member specialties,
                workload, and availability
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Assignment Mode</label>
                  <Select
                    value={autoAssignMode}
                    onValueChange={(value: any) => setAutoAssignMode(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">
                        Unassigned Tasks Only ({unassignedTasks.length})
                      </SelectItem>
                      <SelectItem value="all">
                        All Tasks ({availableTasks.length})
                      </SelectItem>
                      <SelectItem value="selected">
                        Selected Tasks ({selectedTasks.length})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAutomatedAssignment}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Run Assignment
                  </Button>
                  <Button
                    variant="outline"
                    onClick={fetchAnalytics}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>

              {autoAssignMode === 'selected' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Tasks</label>
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-2">
                    {availableTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center space-x-2 p-1"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTasks([...selectedTasks, task.id]);
                            } else {
                              setSelectedTasks(
                                selectedTasks.filter((id) => id !== task.id),
                              );
                            }
                          }}
                        />
                        <span className="text-sm">{task.title}</span>
                        <Badge variant="outline">{task.category}</Badge>
                        {task.assigned_to && (
                          <Badge variant="secondary">Assigned</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recentAssignments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Recent Assignments</h4>
                  <div className="space-y-2">
                    {recentAssignments.map((assignment, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            Task {assignment.task_id.slice(-6)}
                          </p>
                          <p className="text-xs text-gray-600">
                            {assignment.assignment_reason}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">
                            Score:{' '}
                            {Math.round(assignment.assignment_score * 100)}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {Math.round(assignment.confidence_level * 100)}%
                            confidence
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Workload Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {workloadData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={workloadData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="member" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="tasks" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-40 text-gray-500">
                    No assignment data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assignment Quality</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Average Score</span>
                      <span className="text-sm font-medium">
                        {avgScore}/100
                      </span>
                    </div>
                    <Progress value={avgScore} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Confidence Level</span>
                      <span className="text-sm font-medium">
                        {avgConfidence}%
                      </span>
                    </div>
                    <Progress value={avgConfidence} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Automation Rate</span>
                      <span className="text-sm font-medium">
                        {automationRate}%
                      </span>
                    </div>
                    <Progress value={automationRate} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Assignment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {analytics?.total_assignments || 0}
                  </div>
                  <p className="text-sm text-gray-600">Total Assignments</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analytics?.automated_assignments || 0}
                  </div>
                  <p className="text-sm text-gray-600">Automated</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {availableTasks.length}
                  </div>
                  <p className="text-sm text-gray-600">Total Tasks</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {unassignedTasks.length}
                  </div>
                  <p className="text-sm text-gray-600">Unassigned</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="triggers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Automation Triggers
              </CardTitle>
              <CardDescription>
                Configure and test automation triggers for your wedding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      RSVP Threshold Trigger
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">
                      Test Sarah's example: 140 guests triggers extra chair
                      setup
                    </p>
                    <Button
                      onClick={() => handleRSVPTrigger(140, 135)}
                      disabled={loading}
                      className="w-full"
                    >
                      Test 140 Guest Trigger
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Date Proximity Trigger
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">
                      Activate day-of setup tasks when wedding is 1 day away
                    </p>
                    <Button
                      onClick={() => {
                        // Simulate date proximity trigger
                        toast({
                          title: 'Trigger Simulation',
                          description:
                            'Date proximity trigger would activate day-of setup tasks',
                        });
                      }}
                      disabled={loading}
                      variant="outline"
                      className="w-full"
                    >
                      Simulate Day-Of Trigger
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Trigger History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="text-sm font-medium">RSVP Count: 140</p>
                        <p className="text-xs text-gray-600">
                          Triggered extra chair setup task
                        </p>
                      </div>
                      <Badge variant="outline">2 hours ago</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="text-sm font-medium">
                          Vendor Status: Confirmed
                        </p>
                        <p className="text-xs text-gray-600">
                          Applied vendor coordination template
                        </p>
                      </div>
                      <Badge variant="outline">1 day ago</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Assignment Settings
              </CardTitle>
              <CardDescription>
                Configure automation behavior and assignment rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Assignment Algorithm
                </label>
                <Select defaultValue="intelligent">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intelligent">
                      Intelligent Scoring (Recommended)
                    </SelectItem>
                    <SelectItem value="round_robin">Round Robin</SelectItem>
                    <SelectItem value="workload_balanced">
                      Workload Balanced
                    </SelectItem>
                    <SelectItem value="specialty_first">
                      Specialty First
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Confidence Threshold
                </label>
                <Select defaultValue="60">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50% - More assignments</SelectItem>
                    <SelectItem value="60">60% - Balanced</SelectItem>
                    <SelectItem value="70">70% - Conservative</SelectItem>
                    <SelectItem value="80">
                      80% - High confidence only
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Auto-assignment Triggers
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked />
                    <span className="text-sm">RSVP count changes</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked />
                    <span className="text-sm">Date proximity triggers</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked />
                    <span className="text-sm">Vendor status changes</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" />
                    <span className="text-sm">Guest category updates</span>
                  </label>
                </div>
              </div>

              <div className="pt-4">
                <Button className="w-full">Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
