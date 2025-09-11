'use client';

/**
 * Sync Status Monitor Component
 * WS-343 - Team A - Round 1
 *
 * Real-time monitoring dashboard for CRM synchronization operations
 * Features: Live status updates, progress tracking, error handling, job management
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  Play,
  Pause,
  Square,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  TrendingUp,
  Database,
  Users,
  FileText,
  Eye,
  Download,
  Filter,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// UI Components (Untitled UI)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';

// Types
import type {
  SyncStatusMonitorProps,
  CRMSyncJob,
  SyncJobStatus,
  SyncLogEntry,
  SyncMetrics,
  SyncJobType,
  ConnectionStatus,
} from '@/types/crm';

// Utils
import { cn } from '@/lib/utils';

interface SyncFilters {
  status: SyncJobStatus[];
  jobType: SyncJobType[];
  integration: string[];
  dateRange: 'all' | 'today' | 'week' | 'month';
}

export function SyncStatusMonitor({
  integrationId,
  showAllIntegrations = false,
  autoRefresh = true,
  refreshInterval = 5000,
  className,
}: SyncStatusMonitorProps) {
  // State Management
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [filters, setFilters] = useState<SyncFilters>({
    status: [],
    jobType: [],
    integration: [],
    dateRange: 'today',
  });
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  // Data Fetching
  const {
    data: syncJobs = [],
    isLoading: jobsLoading,
    error: jobsError,
    refetch: refetchJobs,
  } = useQuery({
    queryKey: ['sync-jobs', integrationId, showAllIntegrations],
    queryFn: () => fetchSyncJobs(integrationId, showAllIntegrations),
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 1000,
  });

  const { data: syncMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['sync-metrics', integrationId],
    queryFn: () => fetchSyncMetrics(integrationId),
    refetchInterval: autoRefresh ? refreshInterval * 2 : false, // Refresh metrics less frequently
  });

  const { data: syncLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['sync-logs', selectedJobId],
    queryFn: () =>
      selectedJobId ? fetchSyncLogs(selectedJobId) : Promise.resolve([]),
    enabled: !!selectedJobId,
    refetchInterval: selectedJobId ? refreshInterval : false,
  });

  // Mutations for job control
  const controlJobMutation = useMutation({
    mutationFn: ({
      jobId,
      action,
    }: {
      jobId: string;
      action: 'pause' | 'resume' | 'cancel';
    }) => controlSyncJob(jobId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-jobs'] });
    },
  });

  const retryJobMutation = useMutation({
    mutationFn: (jobId: string) => retrySyncJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-jobs'] });
    },
  });

  // Filter and process jobs
  const filteredJobs = useMemo(() => {
    return syncJobs.filter((job) => {
      // Status filter
      if (
        filters.status.length > 0 &&
        !filters.status.includes(job.job_status)
      ) {
        return false;
      }

      // Job type filter
      if (
        filters.jobType.length > 0 &&
        !filters.jobType.includes(job.job_type)
      ) {
        return false;
      }

      // Integration filter (for all integrations view)
      if (showAllIntegrations && filters.integration.length > 0) {
        if (!filters.integration.includes(job.integration_id)) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const now = new Date();
        const jobDate = new Date(job.created_at);
        const daysDiff = Math.floor(
          (now.getTime() - jobDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        switch (filters.dateRange) {
          case 'today':
            if (daysDiff > 0) return false;
            break;
          case 'week':
            if (daysDiff > 7) return false;
            break;
          case 'month':
            if (daysDiff > 30) return false;
            break;
        }
      }

      return true;
    });
  }, [syncJobs, filters, showAllIntegrations]);

  // Calculate real-time statistics
  const jobStats = useMemo(() => {
    const stats = {
      total: filteredJobs.length,
      running: filteredJobs.filter((j) => j.job_status === 'running').length,
      completed: filteredJobs.filter((j) => j.job_status === 'completed')
        .length,
      failed: filteredJobs.filter((j) => j.job_status === 'failed').length,
      pending: filteredJobs.filter((j) => j.job_status === 'pending').length,
    };

    return stats;
  }, [filteredJobs]);

  // Event handlers
  const handleJobAction = useCallback(
    (jobId: string, action: 'pause' | 'resume' | 'cancel') => {
      controlJobMutation.mutate({ jobId, action });
    },
    [controlJobMutation],
  );

  const handleRetryJob = useCallback(
    (jobId: string) => {
      retryJobMutation.mutate(jobId);
    },
    [retryJobMutation],
  );

  const toggleJobExpansion = useCallback((jobId: string) => {
    setExpandedJobs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  }, []);

  const updateFilter = useCallback((key: keyof SyncFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  if (jobsLoading && syncJobs.length === 0) {
    return <SyncMonitorSkeleton className={className} />;
  }

  if (jobsError) {
    return (
      <Card className={cn('border-red-200', className)}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load sync status. Please check your connection and try
              again.
            </AlertDescription>
          </Alert>
          <Button
            className="mt-4"
            onClick={() => refetchJobs()}
            variant="outline"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Sync Monitor
          </h2>
          <p className="text-sm text-muted-foreground">
            {showAllIntegrations
              ? 'Monitor all CRM synchronization jobs across integrations'
              : 'Monitor synchronization jobs for this integration'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filters */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
              <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-xs">Status</DropdownMenuLabel>
              {(
                [
                  'pending',
                  'running',
                  'completed',
                  'failed',
                  'cancelled',
                ] as SyncJobStatus[]
              ).map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={filters.status.includes(status)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateFilter('status', [...filters.status, status]);
                    } else {
                      updateFilter(
                        'status',
                        filters.status.filter((s) => s !== status),
                      );
                    }
                  }}
                >
                  <StatusBadge status={status} className="mr-2" />
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchJobs()}
            disabled={jobsLoading}
          >
            <RefreshCw
              className={cn('mr-2 h-4 w-4', jobsLoading && 'animate-spin')}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        <StatsCard
          label="Total Jobs"
          value={jobStats.total}
          icon={FileText}
          color="blue"
        />
        <StatsCard
          label="Running"
          value={jobStats.running}
          icon={RefreshCw}
          color="blue"
          animate={jobStats.running > 0}
        />
        <StatsCard
          label="Completed"
          value={jobStats.completed}
          icon={CheckCircle}
          color="green"
        />
        <StatsCard
          label="Failed"
          value={jobStats.failed}
          icon={AlertTriangle}
          color="red"
        />
        <StatsCard
          label="Pending"
          value={jobStats.pending}
          icon={Clock}
          color="yellow"
        />
      </div>

      {/* Metrics Overview */}
      {syncMetrics && !metricsLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Sync Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-semibold">
                  {syncMetrics.records_synced_today.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Records Today</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold">
                  {Math.round(syncMetrics.average_sync_time_minutes)}m
                </p>
                <p className="text-xs text-muted-foreground">Avg Sync Time</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold">
                  {Math.round(syncMetrics.success_rate_percentage)}%
                </p>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold">
                  {syncMetrics.errors_last_24h}
                </p>
                <p className="text-xs text-muted-foreground">Errors (24h)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Jobs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No sync jobs found</p>
              <p className="text-xs">
                Jobs will appear here when synchronization starts
              </p>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <SyncJobCard
                key={job.id}
                job={job}
                isExpanded={expandedJobs.has(job.id)}
                onToggleExpanded={() => toggleJobExpansion(job.id)}
                onAction={handleJobAction}
                onRetry={handleRetryJob}
                onViewLogs={() => setSelectedJobId(job.id)}
                showIntegrationName={showAllIntegrations}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Logs Viewer Modal/Panel */}
      {selectedJobId && (
        <LogsViewer
          jobId={selectedJobId}
          logs={syncLogs}
          isLoading={logsLoading}
          onClose={() => setSelectedJobId(null)}
        />
      )}
    </div>
  );
}

// Statistics Card Component
interface StatsCardProps {
  label: string;
  value: number;
  icon: any;
  color: 'blue' | 'green' | 'red' | 'yellow';
  animate?: boolean;
}

function StatsCard({
  label,
  value,
  icon: Icon,
  color,
  animate,
}: StatsCardProps) {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-semibold">{value}</p>
          </div>
          <Icon
            className={cn(
              'h-6 w-6',
              colorClasses[color],
              animate && 'animate-spin',
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Status Badge Component
interface StatusBadgeProps {
  status: SyncJobStatus;
  className?: string;
}

function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
    running: { color: 'bg-blue-100 text-blue-800', label: 'Running' },
    completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
    failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
    cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' },
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant="secondary"
      className={cn(config.color, 'text-xs', className)}
    >
      {config.label}
    </Badge>
  );
}

// Sync Job Card Component
interface SyncJobCardProps {
  job: CRMSyncJob;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onAction: (jobId: string, action: 'pause' | 'resume' | 'cancel') => void;
  onRetry: (jobId: string) => void;
  onViewLogs: () => void;
  showIntegrationName?: boolean;
}

function SyncJobCard({
  job,
  isExpanded,
  onToggleExpanded,
  onAction,
  onRetry,
  onViewLogs,
  showIntegrationName,
}: SyncJobCardProps) {
  const progress = job.records_total
    ? (job.records_processed / job.records_total) * 100
    : 0;

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={job.job_status} />
            <Badge variant="outline" className="text-xs">
              {job.job_type.replace('_', ' ')}
            </Badge>
            {showIntegrationName && (
              <Badge variant="secondary" className="text-xs">
                {job.integration_name}
              </Badge>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">Started:</span>
              <span>{formatDistanceToNow(new Date(job.created_at))} ago</span>
            </div>

            {job.job_status === 'running' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span>
                    {job.records_processed} of {job.records_total || '?'}{' '}
                    records
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {job.error_message && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {job.error_message}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <Button variant="ghost" size="sm" onClick={onViewLogs}>
            <Eye className="h-4 w-4" />
          </Button>

          {job.job_status === 'running' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAction(job.id, 'pause')}
              >
                <Pause className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAction(job.id, 'cancel')}
              >
                <Square className="h-4 w-4" />
              </Button>
            </>
          )}

          {job.job_status === 'failed' && (
            <Button variant="ghost" size="sm" onClick={() => onRetry(job.id)}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={onToggleExpanded}>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <Collapsible open={isExpanded}>
        <CollapsibleContent className="space-y-3">
          <Separator />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Job Type</p>
              <p className="font-medium">{job.job_type.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Duration</p>
              <p className="font-medium">
                {job.completed_at
                  ? formatDistanceToNow(new Date(job.completed_at), {
                      includeSeconds: true,
                    })
                  : 'In progress'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Records Processed</p>
              <p className="font-medium">
                {job.records_processed.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Errors</p>
              <p className="font-medium text-red-600">{job.error_count || 0}</p>
            </div>
          </div>

          {job.sync_summary && (
            <div>
              <p className="text-muted-foreground text-sm mb-2">Summary</p>
              <div className="bg-gray-50 rounded p-3 text-sm">
                <pre className="whitespace-pre-wrap font-mono text-xs">
                  {JSON.stringify(job.sync_summary, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Logs Viewer Component
interface LogsViewerProps {
  jobId: string;
  logs: SyncLogEntry[];
  isLoading: boolean;
  onClose: () => void;
}

function LogsViewer({ jobId, logs, isLoading, onClose }: LogsViewerProps) {
  return (
    <Card className="border-2 border-blue-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Sync Logs - Job {jobId.slice(0, 8)}...
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No logs available for this job
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  'p-2 rounded text-sm font-mono',
                  log.log_level === 'error' &&
                    'bg-red-50 border-l-4 border-red-500',
                  log.log_level === 'warning' &&
                    'bg-yellow-50 border-l-4 border-yellow-500',
                  log.log_level === 'info' &&
                    'bg-blue-50 border-l-4 border-blue-500',
                  log.log_level === 'debug' &&
                    'bg-gray-50 border-l-4 border-gray-300',
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.created_at), 'HH:mm:ss')}
                  </span>
                  <span
                    className={cn(
                      'text-xs px-2 py-1 rounded uppercase font-semibold',
                      log.log_level === 'error' && 'bg-red-100 text-red-800',
                      log.log_level === 'warning' &&
                        'bg-yellow-100 text-yellow-800',
                      log.log_level === 'info' && 'bg-blue-100 text-blue-800',
                      log.log_level === 'debug' && 'bg-gray-100 text-gray-800',
                    )}
                  >
                    {log.log_level}
                  </span>
                  <span className="flex-1">{log.message}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Loading Skeleton
function SyncMonitorSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Mock API functions (to be replaced with actual API calls)
async function fetchSyncJobs(
  integrationId?: string,
  showAll = false,
): Promise<CRMSyncJob[]> {
  // This would be replaced with actual API call
  return [];
}

async function fetchSyncMetrics(integrationId?: string): Promise<SyncMetrics> {
  // This would be replaced with actual API call
  return {
    records_synced_today: 0,
    average_sync_time_minutes: 0,
    success_rate_percentage: 0,
    errors_last_24h: 0,
  };
}

async function fetchSyncLogs(jobId: string): Promise<SyncLogEntry[]> {
  // This would be replaced with actual API call
  return [];
}

async function controlSyncJob(
  jobId: string,
  action: 'pause' | 'resume' | 'cancel',
): Promise<void> {
  // This would be replaced with actual API call
}

async function retrySyncJob(jobId: string): Promise<void> {
  // This would be replaced with actual API call
}
