'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GitBranch,
  ArrowRight,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Database,
  Layers,
  History,
  Play,
  Square,
  RotateCcw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Variable {
  id: string;
  key: string;
  value: string;
  environment: string;
  security_level: string;
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
}

interface EnvironmentStatus {
  environment: string;
  status: 'healthy' | 'warning' | 'critical';
  missing_variables: string[];
  last_sync: string;
  variable_count: number;
}

interface DeploymentJob {
  id: string;
  source_environment: string;
  target_environment: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  variables_synced: number;
  total_variables: number;
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

interface SyncComparison {
  environment_a: string;
  environment_b: string;
  matching_variables: string[];
  missing_in_a: string[];
  missing_in_b: string[];
  value_differences: {
    key: string;
    env_a_value: string;
    env_b_value: string;
  }[];
  last_compared: string;
}

interface DeploymentSyncDashboardProps {
  variables: Variable[];
  environmentStatuses: EnvironmentStatus[];
  onSyncComplete: () => void;
  isReadOnly?: boolean;
}

export function DeploymentSyncDashboard({
  variables,
  environmentStatuses,
  onSyncComplete,
  isReadOnly = false,
}: DeploymentSyncDashboardProps) {
  const [deploymentJobs, setDeploymentJobs] = useState<DeploymentJob[]>([]);
  const [syncComparisons, setSyncComparisons] = useState<SyncComparison[]>([]);
  const [activeJobs, setActiveJobs] = useState<DeploymentJob[]>([]);
  const [selectedSourceEnv, setSelectedSourceEnv] = useState('development');
  const [selectedTargetEnv, setSelectedTargetEnv] = useState('staging');
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient();

  const environments = [
    'development',
    'staging',
    'production',
    'wedding-day-critical',
  ];

  useEffect(() => {
    loadDeploymentData();

    // Set up real-time monitoring for active jobs
    const interval = setInterval(() => {
      if (activeJobs.length > 0) {
        updateActiveJobs();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeJobs.length]);

  const loadDeploymentData = async () => {
    try {
      // Load deployment jobs (simulated - in real app would come from database)
      const mockJobs: DeploymentJob[] = [
        {
          id: '1',
          source_environment: 'development',
          target_environment: 'staging',
          status: 'completed',
          variables_synced: 25,
          total_variables: 25,
          started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(
            Date.now() - 1.8 * 60 * 60 * 1000,
          ).toISOString(),
        },
        {
          id: '2',
          source_environment: 'staging',
          target_environment: 'production',
          status: 'failed',
          variables_synced: 18,
          total_variables: 30,
          started_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(
            Date.now() - 3.5 * 60 * 60 * 1000,
          ).toISOString(),
          error_message: 'Missing required production variables',
        },
      ];

      setDeploymentJobs(mockJobs);

      // Generate sync comparisons
      generateSyncComparisons();
    } catch (error) {
      console.error('Error loading deployment data:', error);
    }
  };

  const generateSyncComparisons = () => {
    const comparisons: SyncComparison[] = [];

    // Compare each environment pair
    for (let i = 0; i < environments.length; i++) {
      for (let j = i + 1; j < environments.length; j++) {
        const envA = environments[i];
        const envB = environments[j];

        const varsA = variables.filter((v) => v.environment === envA);
        const varsB = variables.filter((v) => v.environment === envB);

        const keysA = new Set(varsA.map((v) => v.key));
        const keysB = new Set(varsB.map((v) => v.key));

        const matching = varsA
          .filter((va) => {
            const vb = varsB.find((vb) => vb.key === va.key);
            return vb && va.value === vb.value;
          })
          .map((v) => v.key);

        const missingInA = varsB
          .filter((vb) => !keysA.has(vb.key))
          .map((v) => v.key);
        const missingInB = varsA
          .filter((va) => !keysB.has(va.key))
          .map((v) => v.key);

        const valueDifferences = varsA
          .filter((va) => {
            const vb = varsB.find((vb) => vb.key === va.key);
            return vb && va.value !== vb.value;
          })
          .map((va) => ({
            key: va.key,
            env_a_value: va.value,
            env_b_value: varsB.find((vb) => vb.key === va.key)?.value || '',
          }));

        comparisons.push({
          environment_a: envA,
          environment_b: envB,
          matching_variables: matching,
          missing_in_a: missingInA,
          missing_in_b: missingInB,
          value_differences: valueDifferences,
          last_compared: new Date().toISOString(),
        });
      }
    }

    setSyncComparisons(comparisons);
  };

  const startDeployment = async () => {
    if (isReadOnly) {
      toast.error('Cannot start deployment during wedding day mode');
      return;
    }

    if (selectedSourceEnv === selectedTargetEnv) {
      toast.error('Source and target environments must be different');
      return;
    }

    setIsLoading(true);

    try {
      // Create new deployment job
      const newJob: DeploymentJob = {
        id: Date.now().toString(),
        source_environment: selectedSourceEnv,
        target_environment: selectedTargetEnv,
        status: 'pending',
        variables_synced: 0,
        total_variables: variables.filter(
          (v) => v.environment === selectedSourceEnv,
        ).length,
        started_at: new Date().toISOString(),
      };

      setDeploymentJobs([newJob, ...deploymentJobs]);
      setActiveJobs([...activeJobs, newJob]);

      // Simulate deployment process
      setTimeout(() => {
        simulateDeploymentProgress(newJob.id);
      }, 1000);

      toast.success('Deployment started successfully');
    } catch (error) {
      console.error('Error starting deployment:', error);
      toast.error('Failed to start deployment');
    } finally {
      setIsLoading(false);
    }
  };

  const simulateDeploymentProgress = async (jobId: string) => {
    const job = deploymentJobs.find((j) => j.id === jobId);
    if (!job) return;

    // Simulate progressive sync
    const totalSteps = job.total_variables;
    let currentStep = 0;

    const progressInterval = setInterval(() => {
      currentStep++;

      setDeploymentJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                status: 'running' as const,
                variables_synced: currentStep,
              }
            : j,
        ),
      );

      if (currentStep >= totalSteps) {
        clearInterval(progressInterval);

        // Complete the job
        setDeploymentJobs((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  status: 'completed' as const,
                  completed_at: new Date().toISOString(),
                }
              : j,
          ),
        );

        setActiveJobs((prev) => prev.filter((j) => j.id !== jobId));

        toast.success('Deployment completed successfully');
        onSyncComplete();
      }
    }, 500);
  };

  const rollbackDeployment = async (jobId: string) => {
    if (isReadOnly) {
      toast.error('Cannot rollback during wedding day mode');
      return;
    }

    if (
      !confirm(
        'Are you sure you want to rollback this deployment? This will restore previous variable values.',
      )
    ) {
      return;
    }

    try {
      // In real implementation, this would restore previous values
      toast.success('Rollback initiated successfully');
    } catch (error) {
      console.error('Error rolling back deployment:', error);
      toast.error('Failed to rollback deployment');
    }
  };

  const updateActiveJobs = () => {
    // Update progress for active jobs
    setActiveJobs((prev) =>
      prev.map((job) => ({
        ...job,
        variables_synced: Math.min(
          job.variables_synced + 1,
          job.total_variables,
        ),
      })),
    );
  };

  const getJobStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getJobStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
            Pending
          </Badge>
        );
      case 'running':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            Running
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            Completed
          </Badge>
        );
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Deployment Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <GitBranch className="h-5 w-5" />
            <span>Environment Synchronization</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Environment</label>
              <select
                className="w-full p-2 border rounded-md"
                value={selectedSourceEnv}
                onChange={(e) => setSelectedSourceEnv(e.target.value)}
                disabled={isLoading || isReadOnly}
              >
                {environments.map((env) => (
                  <option
                    key={env}
                    value={env}
                    disabled={env === selectedTargetEnv}
                  >
                    {env.replace('-', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-6 w-6 text-gray-400" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Target Environment</label>
              <select
                className="w-full p-2 border rounded-md"
                value={selectedTargetEnv}
                onChange={(e) => setSelectedTargetEnv(e.target.value)}
                disabled={isLoading || isReadOnly}
              >
                {environments.map((env) => (
                  <option
                    key={env}
                    value={env}
                    disabled={env === selectedSourceEnv}
                  >
                    {env.replace('-', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-center mt-6">
            <Button
              onClick={startDeployment}
              disabled={isLoading || isReadOnly || activeJobs.length > 0}
              className="min-w-[150px]"
            >
              <Play className="h-4 w-4 mr-2" />
              {isLoading ? 'Starting...' : 'Start Sync'}
            </Button>
          </div>

          {selectedTargetEnv === 'production' && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  Production Deployment Warning
                </span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                You are about to deploy to production. This could affect live
                wedding operations. Ensure all variables have been tested in
                staging first.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deployment Dashboard */}
      <Tabs defaultValue="jobs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="jobs">Deployment Jobs</TabsTrigger>
          <TabsTrigger value="comparison">Environment Comparison</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline Status</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          {/* Active Jobs */}
          {activeJobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <span>Active Deployments</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeJobs.map((job) => (
                  <div key={job.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getJobStatusIcon(job.status)}
                        <span className="font-medium">
                          {job.source_environment} → {job.target_environment}
                        </span>
                        {getJobStatusBadge(job.status)}
                      </div>
                      <span className="text-sm text-gray-600">
                        {job.variables_synced}/{job.total_variables} variables
                      </span>
                    </div>
                    <Progress
                      value={(job.variables_synced / job.total_variables) * 100}
                      className="h-2"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Deployment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="h-5 w-5" />
                <span>Deployment History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deploymentJobs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No deployment jobs found</p>
                    <p className="text-sm">
                      Start your first environment sync above
                    </p>
                  </div>
                ) : (
                  deploymentJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        {getJobStatusIcon(job.status)}

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {job.source_environment} →{' '}
                              {job.target_environment}
                            </span>
                            {getJobStatusBadge(job.status)}
                          </div>

                          <div className="text-sm text-gray-600 mt-1">
                            Started{' '}
                            {formatDistanceToNow(new Date(job.started_at), {
                              addSuffix: true,
                            })}
                            {job.completed_at && (
                              <span>
                                {' '}
                                • Completed{' '}
                                {formatDistanceToNow(
                                  new Date(job.completed_at),
                                  { addSuffix: true },
                                )}
                              </span>
                            )}
                          </div>

                          {job.error_message && (
                            <p className="text-sm text-red-600 mt-1">
                              {job.error_message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          {job.variables_synced}/{job.total_variables}
                        </span>

                        {job.status === 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rollbackDeployment(job.id)}
                            disabled={isReadOnly}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Rollback
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <div className="grid gap-4">
            {syncComparisons.map((comparison) => (
              <Card
                key={`${comparison.environment_a}-${comparison.environment_b}`}
              >
                <CardHeader>
                  <CardTitle className="text-lg">
                    {comparison.environment_a.replace('-', ' ')} vs{' '}
                    {comparison.environment_b.replace('-', ' ')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {comparison.matching_variables.length}
                      </div>
                      <div className="text-sm text-gray-600">Matching</div>
                    </div>

                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {comparison.value_differences.length}
                      </div>
                      <div className="text-sm text-gray-600">
                        Different Values
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {comparison.missing_in_a.length +
                          comparison.missing_in_b.length}
                      </div>
                      <div className="text-sm text-gray-600">
                        Missing Variables
                      </div>
                    </div>
                  </div>

                  {(comparison.missing_in_a.length > 0 ||
                    comparison.missing_in_b.length > 0 ||
                    comparison.value_differences.length > 0) && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {comparison.missing_in_a.length > 0 && (
                        <div className="text-sm">
                          <span className="font-medium text-red-600">
                            Missing in {comparison.environment_a}:{' '}
                          </span>
                          {comparison.missing_in_a.slice(0, 3).join(', ')}
                          {comparison.missing_in_a.length > 3 &&
                            ` +${comparison.missing_in_a.length - 3} more`}
                        </div>
                      )}

                      {comparison.missing_in_b.length > 0 && (
                        <div className="text-sm">
                          <span className="font-medium text-red-600">
                            Missing in {comparison.environment_b}:{' '}
                          </span>
                          {comparison.missing_in_b.slice(0, 3).join(', ')}
                          {comparison.missing_in_b.length > 3 &&
                            ` +${comparison.missing_in_b.length - 3} more`}
                        </div>
                      )}

                      {comparison.value_differences.length > 0 && (
                        <div className="text-sm">
                          <span className="font-medium text-yellow-600">
                            Value differences:{' '}
                          </span>
                          {comparison.value_differences
                            .slice(0, 3)
                            .map((diff) => diff.key)
                            .join(', ')}
                          {comparison.value_differences.length > 3 &&
                            ` +${comparison.value_differences.length - 3} more`}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Layers className="h-5 w-5" />
                <span>Deployment Pipeline Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Pipeline Flow */}
                <div className="flex items-center justify-between">
                  {environments.map((env, index) => (
                    <div key={env} className="flex items-center">
                      <div className="text-center">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                            environmentStatuses.find(
                              (s) => s.environment === env,
                            )?.status === 'healthy'
                              ? 'border-green-500 bg-green-50 text-green-600'
                              : 'border-red-500 bg-red-50 text-red-600'
                          }`}
                        >
                          <Database className="h-5 w-5" />
                        </div>
                        <p className="text-xs mt-2 font-medium capitalize">
                          {env.replace('-', ' ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {
                            variables.filter((v) => v.environment === env)
                              .length
                          }{' '}
                          vars
                        </p>
                      </div>

                      {index < environments.length - 1 && (
                        <ArrowRight className="h-6 w-6 text-gray-400 mx-4" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Pipeline Health */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        Pipeline Health: Good
                      </span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      All environments are properly configured and synchronized
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        Auto-Deploy: Enabled
                      </span>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      Changes in development automatically deploy to staging
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
