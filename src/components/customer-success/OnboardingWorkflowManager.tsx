/**
 * WS-133: Onboarding Workflow Automation Manager
 * Enhanced workflow management with intelligent automation and personalization
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  PlayCircle,
  PauseCircle,
  StopCircle,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  Target,
  Users,
  Settings,
  ArrowRight,
  BarChart3,
  MessageSquare,
  Calendar,
} from 'lucide-react';

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  type: 'action' | 'tutorial' | 'form' | 'verification' | 'integration';
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  estimatedMinutes: number;
  required: boolean;
  automationTrigger?: string;
  dependencies: string[];
  successCriteria: string[];
  helpResources: {
    type: 'video' | 'article' | 'tutorial' | 'documentation';
    title: string;
    url: string;
    duration: number;
  }[];
  completedAt?: Date;
  attempts: number;
  lastAttemptAt?: Date;
}

interface OnboardingStage {
  id: string;
  name: string;
  title: string;
  description: string;
  order: number;
  tasks: OnboardingTask[];
  completionCriteria: string[];
  estimatedTimeMinutes: number;
  successWeight: number;
  autoAdvance: boolean;
  status: 'locked' | 'available' | 'in_progress' | 'completed' | 'skipped';
  completedAt?: Date;
  triggers: {
    type: 'time_based' | 'action_based' | 'score_based';
    config: Record<string, any>;
  }[];
}

interface OnboardingWorkflow {
  id: string;
  name: string;
  description: string;
  userType: 'wedding_planner' | 'supplier' | 'couple' | 'admin';
  stages: OnboardingStage[];
  currentStageId?: string;
  completionPercentage: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletionDate?: Date;
  isActive: boolean;
}

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  triggerEvent: string;
  conditions: {
    field: string;
    operator:
      | 'equals'
      | 'not_equals'
      | 'greater_than'
      | 'less_than'
      | 'contains';
    value: any;
  }[];
  actions: {
    type:
      | 'send_email'
      | 'create_notification'
      | 'assign_task'
      | 'update_status'
      | 'trigger_webhook';
    config: Record<string, any>;
    delayMinutes?: number;
  }[];
  isActive: boolean;
  executionCount: number;
  lastExecuted?: Date;
}

interface WorkflowAnalytics {
  totalUsers: number;
  completionRate: number;
  averageCompletionTimeHours: number;
  dropoffStages: {
    stageName: string;
    dropoffRate: number;
    commonExitPoints: string[];
  }[];
  timeToComplete: {
    stage: string;
    averageHours: number;
    median: number;
    p90: number;
  }[];
  automationPerformance: {
    ruleName: string;
    triggerCount: number;
    successRate: number;
    averageResponseTime: number;
  }[];
}

const OnboardingWorkflowManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [workflow, setWorkflow] = useState<OnboardingWorkflow | null>(null);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [analytics, setAnalytics] = useState<WorkflowAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkflowData();
  }, []);

  const loadWorkflowData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load current user's workflow
      const workflowResponse = await fetch(
        '/api/customer-success/onboarding/workflow',
      );
      const automationResponse = await fetch(
        '/api/customer-success/onboarding/automation-rules',
      );
      const analyticsResponse = await fetch(
        '/api/customer-success/onboarding/analytics',
      );

      if (!workflowResponse.ok) {
        throw new Error('Failed to load workflow data');
      }

      const workflowData = await workflowResponse.json();
      const automationData = await automationResponse.json();
      const analyticsData = await analyticsResponse.json();

      setWorkflow(workflowData.data);
      setAutomationRules(automationData.data || []);
      setAnalytics(analyticsData.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load workflow data',
      );
      console.error('Workflow loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskAction = useCallback(
    async (taskId: string, action: 'start' | 'complete' | 'skip') => {
      try {
        const response = await fetch('/api/customer-success/onboarding/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, action }),
        });

        if (!response.ok) {
          throw new Error('Failed to update task');
        }

        // Refresh workflow data
        await loadWorkflowData();
      } catch (err) {
        console.error('Task action error:', err);
        setError(err instanceof Error ? err.message : 'Failed to update task');
      }
    },
    [],
  );

  const handleStageAction = useCallback(
    async (stageId: string, action: 'start' | 'complete' | 'skip') => {
      try {
        const response = await fetch(
          '/api/customer-success/onboarding/stages',
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stageId, action }),
          },
        );

        if (!response.ok) {
          throw new Error('Failed to update stage');
        }

        await loadWorkflowData();
      } catch (err) {
        console.error('Stage action error:', err);
        setError(err instanceof Error ? err.message : 'Failed to update stage');
      }
    },
    [],
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'skipped':
        return 'bg-gray-100 text-gray-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'skipped':
        return <StopCircle className="h-4 w-4 text-gray-600" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading onboarding workflow...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}. Please refresh the page or contact support if the problem
          persists.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Onboarding Workflow
          </h1>
          <p className="text-gray-600 mt-1">
            {workflow?.name} - {workflow?.completionPercentage.toFixed(0)}%
            Complete
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge className={getStatusColor(workflow?.status || 'not_started')}>
            {workflow?.status?.replace('_', ' ').toUpperCase()}
          </Badge>
          <Button onClick={loadWorkflowData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Overall Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Completion Progress</span>
                <span>{workflow?.completionPercentage.toFixed(1)}%</span>
              </div>
              <Progress
                value={workflow?.completionPercentage || 0}
                className="h-3"
              />
            </div>

            {workflow?.estimatedCompletionDate && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  Estimated completion:{' '}
                  {new Date(
                    workflow.estimatedCompletionDate,
                  ).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Workflow</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6">
            {workflow?.stages.map((stage, index) => (
              <Card
                key={stage.id}
                className={`${stage.status === 'in_progress' ? 'ring-2 ring-blue-500' : ''}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {getStatusIcon(stage.status)}
                          {stage.title}
                        </CardTitle>
                        <CardDescription>{stage.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(stage.status)}>
                        {stage.status.replace('_', ' ')}
                      </Badge>
                      {stage.status === 'available' && (
                        <Button
                          size="sm"
                          onClick={() => handleStageAction(stage.id, 'start')}
                        >
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {/* Stage Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Stage Progress</span>
                        <span>
                          {Math.round(
                            (stage.tasks.filter((t) => t.status === 'completed')
                              .length /
                              stage.tasks.length) *
                              100,
                          )}
                          %
                        </span>
                      </div>
                      <Progress
                        value={
                          (stage.tasks.filter((t) => t.status === 'completed')
                            .length /
                            stage.tasks.length) *
                          100
                        }
                        className="h-2"
                      />
                    </div>

                    {/* Tasks */}
                    <div className="space-y-2">
                      {stage.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {getStatusIcon(task.status)}
                            <div>
                              <p className="font-medium text-sm">
                                {task.title}
                              </p>
                              <p className="text-xs text-gray-600">
                                {task.estimatedMinutes}min • {task.type}
                                {task.required && (
                                  <span className="ml-2 text-red-600">
                                    *Required
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={getStatusColor(task.status)}
                              variant="secondary"
                            >
                              {task.status}
                            </Badge>
                            {task.status === 'pending' &&
                              stage.status === 'in_progress' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleTaskAction(task.id, 'start')
                                  }
                                >
                                  Start
                                </Button>
                              )}
                            {task.status === 'in_progress' && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleTaskAction(task.id, 'complete')
                                }
                              >
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Estimated Time */}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>~{stage.estimatedTimeMinutes}min</span>
                      </div>
                      {stage.completedAt && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>
                            Completed{' '}
                            {new Date(stage.completedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Automation Rules
              </CardTitle>
              <CardDescription>
                Automated triggers and actions to enhance the onboarding
                experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {automationRules.map((rule) => (
                  <div key={rule.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-medium">{rule.name}</h3>
                        <p className="text-sm text-gray-600">
                          {rule.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={rule.isActive ? 'default' : 'secondary'}
                        >
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Trigger Event</p>
                        <p className="font-medium">{rule.triggerEvent}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Executions</p>
                        <p className="font-medium">{rule.executionCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Actions</p>
                        <p className="font-medium">
                          {rule.actions.length} configured
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Users
                  </CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.totalUsers}
                  </div>
                  <p className="text-xs text-gray-600">In onboarding</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Completion Rate
                  </CardTitle>
                  <Target className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.completionRate.toFixed(1)}%
                  </div>
                  <Progress value={analytics.completionRate} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg. Time
                  </CardTitle>
                  <Clock className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.averageCompletionTimeHours.toFixed(1)}h
                  </div>
                  <p className="text-xs text-gray-600">To complete</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Drop-off Points
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.dropoffStages.length}
                  </div>
                  <p className="text-xs text-gray-600">Identified</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Detailed Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Drop-off Analysis</CardTitle>
                <CardDescription>
                  Stages where users commonly exit the onboarding
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.dropoffStages.map((stage, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center"
                    >
                      <span className="text-sm font-medium">
                        {stage.stageName}
                      </span>
                      <div className="flex items-center gap-2">
                        <Progress value={stage.dropoffRate} className="w-20" />
                        <span className="text-xs text-red-600">
                          {stage.dropoffRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Automation Performance</CardTitle>
                <CardDescription>
                  Success rates of automated triggers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.automationPerformance.map((automation, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center"
                    >
                      <span className="text-sm font-medium">
                        {automation.ruleName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">
                          {automation.triggerCount} triggers
                        </span>
                        <Progress
                          value={automation.successRate}
                          className="w-16"
                        />
                        <span className="text-xs text-green-600">
                          {automation.successRate.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Workflow Settings
              </CardTitle>
              <CardDescription>
                Configure your onboarding experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <MessageSquare className="h-4 w-4" />
                  <AlertDescription>
                    Settings panel would allow users to customize notification
                    preferences, automation rules, and workflow personalization
                    options.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OnboardingWorkflowManager;
