'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  Circle,
  ArrowRight,
  Target,
  Clock,
  Star,
} from 'lucide-react';
import {
  activationService,
  ActivationStatus,
} from '@/lib/activation/activation-service';

interface FunnelStep {
  step: number;
  name: string;
  description: string;
  points: number;
  required: boolean;
  completed?: boolean;
  action_url?: string;
}

const DEFAULT_FUNNEL_STEPS: FunnelStep[] = [
  {
    step: 1,
    name: 'Account Created',
    description: 'Complete account registration',
    points: 10,
    required: true,
    action_url: '/onboarding',
  },
  {
    step: 2,
    name: 'Onboarding Completed',
    description: 'Finish initial setup wizard',
    points: 20,
    required: true,
    action_url: '/onboarding',
  },
  {
    step: 3,
    name: 'First Client Import',
    description: 'Add your existing clients to WedSync',
    points: 25,
    required: true,
    action_url: '/clients/import',
  },
  {
    step: 4,
    name: 'First Form Sent',
    description: 'Create and send your first form',
    points: 25,
    required: true,
    action_url: '/forms/create',
  },
  {
    step: 5,
    name: 'First Response Received',
    description: 'Client responds to a form',
    points: 15,
    required: false,
    action_url: '/forms',
  },
  {
    step: 6,
    name: 'Automation Setup',
    description: 'Create your first automation',
    points: 5,
    required: false,
    action_url: '/journeys',
  },
];

interface UserActivationProgressProps {
  userId?: string;
  showActions?: boolean;
  compact?: boolean;
}

export default function UserActivationProgress({
  userId,
  showActions = true,
  compact = false,
}: UserActivationProgressProps) {
  const [status, setStatus] = useState<ActivationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await activationService.getActivationStatus(userId);
      setStatus(data);
    } catch (err) {
      console.error('Error fetching activation status:', err);
      setError('Failed to load activation status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [userId]);

  if (loading) {
    return (
      <Card className={compact ? 'p-4' : ''}>
        <CardContent className={compact ? 'p-0' : 'p-6'}>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-8 bg-gray-200 dark:bg-gray-700 rounded"
                ></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !status) {
    return (
      <Card className={compact ? 'p-4' : ''}>
        <CardContent className={compact ? 'p-0' : 'p-6'}>
          <div className="text-center">
            <div className="text-red-500 mb-2">
              Failed to load activation progress
            </div>
            <Button size="sm" onClick={fetchStatus}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare steps with completion status
  const stepsWithStatus = DEFAULT_FUNNEL_STEPS.map((step) => ({
    ...step,
    completed: Array.isArray(status.completed_steps)
      ? status.completed_steps.includes(step.step)
      : false,
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'nearly_complete':
        return 'text-blue-600 dark:text-blue-400';
      case 'in_progress':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'at_risk':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Activated
          </Badge>
        );
      case 'nearly_complete':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Nearly Complete
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            In Progress
          </Badge>
        );
      case 'at_risk':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            At Risk
          </Badge>
        );
      default:
        return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  const nextStep = stepsWithStatus.find((step) => !step.completed);

  if (compact) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Activation Progress</h3>
            {getStatusBadge(status.status)}
          </div>

          <div className="space-y-2">
            <Progress value={status.progress_percentage} className="h-2" />
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>
                {status.completed_steps_count}/{status.total_steps} steps
                completed
              </span>
              <span className="font-semibold">
                {status.activation_score}/100 points
              </span>
            </div>
          </div>

          {nextStep && showActions && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                Next: {nextStep.name}
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                {nextStep.description}
              </div>
              {nextStep.action_url && (
                <Button size="sm" className="h-6 text-xs">
                  <ArrowRight className="h-3 w-3 mr-1" />
                  Continue
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Activation Progress
            </CardTitle>
            <CardDescription>
              Track your progress getting started with WedSync
            </CardDescription>
          </div>
          {getStatusBadge(status.status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <span
              className={`text-sm font-semibold ${getStatusColor(status.status)}`}
            >
              {status.progress_percentage}% Complete
            </span>
          </div>

          <Progress value={status.progress_percentage} className="h-3" />

          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              {status.completed_steps_count} of {status.total_steps} steps
              completed
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              {status.activation_score}/100 points
            </span>
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-4">
          <h4 className="font-semibold">Activation Steps</h4>

          {stepsWithStatus.map((step, index) => (
            <div
              key={step.step}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                step.completed
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : step.step === status.current_step + 1
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {step.completed ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h5
                    className={`font-medium ${
                      step.completed ? 'text-green-900 dark:text-green-200' : ''
                    }`}
                  >
                    {step.name}
                  </h5>
                  <Badge
                    variant={step.required ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {step.points} pts
                  </Badge>
                  {step.required && (
                    <Badge variant="outline" className="text-xs">
                      Required
                    </Badge>
                  )}
                </div>

                <p
                  className={`text-sm ${
                    step.completed
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {step.description}
                </p>

                {!step.completed &&
                  step.step === status.current_step + 1 &&
                  showActions &&
                  step.action_url && (
                    <Button size="sm" className="mt-2 h-7">
                      <ArrowRight className="h-3 w-3 mr-1" />
                      Start This Step
                    </Button>
                  )}
              </div>

              {step.completed && (
                <div className="flex-shrink-0 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Done
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Completion Message */}
        {status.status === 'completed' && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h4 className="font-semibold text-green-900 dark:text-green-200">
                Activation Complete!
              </h4>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              Congratulations! You've successfully activated your WedSync
              account and are ready to streamline your wedding business
              operations.
            </p>
          </div>
        )}

        {/* At Risk Warning */}
        {status.status === 'at_risk' && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-red-600 dark:text-red-400" />
              <h4 className="font-semibold text-red-900 dark:text-red-200">
                Need Help Getting Started?
              </h4>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 mb-3">
              It looks like you might need some assistance. Our team is here to
              help you get the most out of WedSync.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-100"
            >
              Get Support
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
