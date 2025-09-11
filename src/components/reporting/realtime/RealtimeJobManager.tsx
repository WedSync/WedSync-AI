'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Download,
  Filter,
  Search,
  MoreVertical,
  Calendar,
  User,
  BarChart3,
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
  Server,
  Database,
  Cpu,
} from 'lucide-react';

import {
  RealtimeReportJob,
  ReportGenerationStatus,
  ReportTemplate,
  WEDDING_COLORS,
  formatDate,
  formatDuration,
} from '../types';

interface RealtimeJobManagerProps {
  jobs: RealtimeReportJob[];
  onJobStart: (jobId: string) => void;
  onJobPause: (jobId: string) => void;
  onJobCancel: (jobId: string) => void;
  onJobDelete: (jobId: string) => void;
  onJobView: (job: RealtimeReportJob) => void;
  onJobDownload: (job: RealtimeReportJob) => void;
  onRefresh: () => void;
  systemStatus?: {
    activeJobs: number;
    queuedJobs: number;
    completedToday: number;
    averageGenerationTime: number;
    serverLoad: number;
    memoryUsage: number;
  };
  className?: string;
}

const STATUS_COLORS: Record<ReportGenerationStatus, string> = {
  pending: 'text-gray-500 bg-gray-100',
  running: 'text-blue-500 bg-blue-100',
  completed: 'text-green-500 bg-green-100',
  failed: 'text-red-500 bg-red-100',
  cancelled: 'text-yellow-500 bg-yellow-100',
};

const STATUS_ICONS: Record<ReportGenerationStatus, any> = {
  pending: Clock,
  running: RefreshCw,
  completed: CheckCircle,
  failed: AlertCircle,
  cancelled: Square,
};

const JobCard = ({
  job,
  onStart,
  onPause,
  onCancel,
  onDelete,
  onView,
  onDownload,
}: {
  job: RealtimeReportJob;
  onStart: () => void;
  onPause: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onView: () => void;
  onDownload: () => void;
}) => {
  const [showActions, setShowActions] = useState(false);

  const StatusIcon = STATUS_ICONS[job.status];
  const isRunning = job.status === 'running';
  const isCompleted = job.status === 'completed';
  const hasFailed = job.status === 'failed';
  const isPaused = job.status === 'pending' && job.progress > 0;

  const getElapsedTime = () => {
    if (!job.startedAt) return null;
    const end = job.completedAt || new Date();
    return Math.floor((end.getTime() - job.startedAt.getTime()) / 1000);
  };

  const elapsedTime = getElapsedTime();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${STATUS_COLORS[job.status]}`}>
            <StatusIcon
              className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">
              {job.template.name}
            </h4>
            <p className="text-sm text-gray-600 line-clamp-2">
              {job.template.description || 'Custom report generation'}
            </p>

            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{job.createdBy || 'System'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(job.createdAt)}</span>
              </div>
              {elapsedTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDuration(elapsedTime)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[job.status]}`}
          >
            {job.status}
          </span>

          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span>{job.progress.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className={`h-full transition-all duration-500 ${
              isCompleted
                ? 'bg-green-500'
                : hasFailed
                  ? 'bg-red-500'
                  : isRunning
                    ? 'bg-blue-500'
                    : 'bg-gray-400'
            }`}
            style={{ width: `${Math.min(Math.max(job.progress, 0), 100)}%` }}
          />
        </div>
      </div>

      {/* Current Step */}
      {job.currentStep && (
        <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-blue-500" />
            <span className="text-gray-700">{job.currentStep}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {hasFailed && job.errorMessage && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3 w-3 text-red-500" />
            <span className="text-red-700">{job.errorMessage}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-3 border-t border-gray-100"
          >
            <div className="flex items-center gap-2">
              {isRunning ? (
                <button
                  onClick={onPause}
                  className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs hover:bg-yellow-200 transition-colors"
                >
                  <Pause className="h-3 w-3" />
                  Pause
                </button>
              ) : isPaused ? (
                <button
                  onClick={onStart}
                  className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors"
                >
                  <Play className="h-3 w-3" />
                  Resume
                </button>
              ) : job.status === 'pending' ? (
                <button
                  onClick={onStart}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                >
                  <Play className="h-3 w-3" />
                  Start
                </button>
              ) : null}

              {(isRunning || isPaused) && (
                <button
                  onClick={onCancel}
                  className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
                >
                  <Square className="h-3 w-3" />
                  Cancel
                </button>
              )}

              {isCompleted && (
                <>
                  <button
                    onClick={onView}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </button>
                  <button
                    onClick={onDownload}
                    className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </button>
                </>
              )}

              <button
                onClick={onDelete}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors ml-auto"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const SystemStatusCard = ({
  status,
}: {
  status: NonNullable<RealtimeJobManagerProps['systemStatus']>;
}) => {
  const getLoadColor = (load: number) => {
    if (load < 50) return 'text-green-500 bg-green-100';
    if (load < 80) return 'text-yellow-500 bg-yellow-100';
    return 'text-red-500 bg-red-100';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900">System Status</h3>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-sm text-green-600">Operational</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {status.activeJobs}
          </div>
          <div className="text-xs text-gray-500">Active Jobs</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {status.queuedJobs}
          </div>
          <div className="text-xs text-gray-500">Queued</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {status.completedToday}
          </div>
          <div className="text-xs text-gray-500">Completed Today</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Zap className="h-4 w-4 text-purple-600" />
            </div>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {formatDuration(status.averageGenerationTime)}
          </div>
          <div className="text-xs text-gray-500">Avg. Time</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Server className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-600">Server Load</span>
              </div>
              <span className="text-xs font-medium">{status.serverLoad}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  status.serverLoad < 50
                    ? 'bg-green-500'
                    : status.serverLoad < 80
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${status.serverLoad}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Database className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-600">Memory</span>
              </div>
              <span className="text-xs font-medium">{status.memoryUsage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  status.memoryUsage < 50
                    ? 'bg-green-500'
                    : status.memoryUsage < 80
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${status.memoryUsage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RealtimeJobManager: React.FC<RealtimeJobManagerProps> = ({
  jobs,
  onJobStart,
  onJobPause,
  onJobCancel,
  onJobDelete,
  onJobView,
  onJobDownload,
  onRefresh,
  systemStatus,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    ReportGenerationStatus | 'all'
  >('all');
  const [sortBy, setSortBy] = useState<'created' | 'updated' | 'name'>(
    'created',
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredAndSortedJobs = useMemo(() => {
    let filtered = jobs;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.template.name.toLowerCase().includes(query) ||
          job.template.description?.toLowerCase().includes(query) ||
          job.createdBy?.toLowerCase().includes(query),
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((job) => job.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.template.name.localeCompare(b.template.name);
          break;
        case 'created':
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updated':
          const aUpdated = a.updatedAt || a.createdAt;
          const bUpdated = b.updatedAt || b.createdAt;
          comparison =
            new Date(aUpdated).getTime() - new Date(bUpdated).getTime();
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [jobs, searchQuery, statusFilter, sortBy, sortOrder]);

  const statusCounts = useMemo(() => {
    return jobs.reduce(
      (counts, job) => {
        counts[job.status] = (counts[job.status] || 0) + 1;
        return counts;
      },
      {} as Record<ReportGenerationStatus, number>,
    );
  }, [jobs]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Report Generation Jobs
          </h2>
          <p className="text-gray-600">
            Monitor and manage real-time report generation
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-2 bg-wedding-primary text-white px-4 py-2 rounded-md hover:bg-wedding-primary/90 transition-colors font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* System Status */}
      {systemStatus && <SystemStatusCard status={systemStatus} />}

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs by name, description, or creator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary focus:border-transparent"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1"
              >
                <option value="all">All Status ({jobs.length})</option>
                <option value="pending">
                  Pending ({statusCounts.pending || 0})
                </option>
                <option value="running">
                  Running ({statusCounts.running || 0})
                </option>
                <option value="completed">
                  Completed ({statusCounts.completed || 0})
                </option>
                <option value="failed">
                  Failed ({statusCounts.failed || 0})
                </option>
                <option value="cancelled">
                  Cancelled ({statusCounts.cancelled || 0})
                </option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as any);
                  setSortOrder(order as any);
                }}
                className="text-sm border border-gray-300 rounded-md px-2 py-1"
              >
                <option value="created-desc">Newest First</option>
                <option value="created-asc">Oldest First</option>
                <option value="updated-desc">Recently Updated</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            Showing {filteredAndSortedJobs.length} of {jobs.length} jobs
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredAndSortedJobs.length > 0 ? (
            filteredAndSortedJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onStart={() => onJobStart(job.id)}
                onPause={() => onJobPause(job.id)}
                onCancel={() => onJobCancel(job.id)}
                onDelete={() => onJobDelete(job.id)}
                onView={() => onJobView(job)}
                onDownload={() => onJobDownload(job)}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-white rounded-lg border border-gray-200"
            >
              <div className="text-gray-400 mb-4">
                <BarChart3 className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No jobs found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No report generation jobs have been created yet.'}
              </p>
              {(searchQuery || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="text-wedding-primary hover:text-wedding-primary/80 font-medium"
                >
                  Clear filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RealtimeJobManager;
