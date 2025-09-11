'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  FileText,
  FileSpreadsheet,
  Image,
  Clock,
  Check,
  X,
  AlertCircle,
  MoreVertical,
  Share2,
  Eye,
  Copy,
  Archive,
  User,
  Database,
  CloudDownload,
  SortAsc,
  SortDesc,
} from 'lucide-react';

import {
  ExportJob,
  ExportFormat,
  ExportStatus,
  WEDDING_COLORS,
  formatDate,
  formatFileSize,
  formatDuration,
} from '../types';

interface ExportManagerProps {
  exports: ExportJob[];
  onDownload: (exportJob: ExportJob) => void;
  onDelete: (exportId: string) => void;
  onRetry: (exportJob: ExportJob) => void;
  onShare: (exportJob: ExportJob) => void;
  onRefresh: () => void;
  onBatchExport?: () => void;
  className?: string;
}

const FORMAT_ICONS: Record<ExportFormat, any> = {
  pdf: FileText,
  excel: FileSpreadsheet,
  csv: FileSpreadsheet,
  png: Image,
  jpeg: Image,
};

const FORMAT_COLORS: Record<ExportFormat, string> = {
  pdf: '#ef4444',
  excel: '#10b981',
  csv: '#3b82f6',
  png: '#8b5cf6',
  jpeg: '#f59e0b',
};

const STATUS_COLORS: Record<ExportStatus, string> = {
  pending: 'text-gray-500 bg-gray-100',
  processing: 'text-blue-500 bg-blue-100',
  completed: 'text-green-500 bg-green-100',
  failed: 'text-red-500 bg-red-100',
};

const STATUS_ICONS: Record<ExportStatus, any> = {
  pending: Clock,
  processing: RefreshCw,
  completed: Check,
  failed: AlertCircle,
};

const ExportCard = ({
  exportJob,
  onDownload,
  onDelete,
  onRetry,
  onShare,
}: {
  exportJob: ExportJob;
  onDownload: () => void;
  onDelete: () => void;
  onRetry: () => void;
  onShare: () => void;
}) => {
  const [showActions, setShowActions] = useState(false);

  const FormatIcon = FORMAT_ICONS[exportJob.format];
  const StatusIcon = STATUS_ICONS[exportJob.status];

  const isProcessing = exportJob.status === 'processing';
  const isCompleted = exportJob.status === 'completed';
  const hasFailed = exportJob.status === 'failed';

  const getElapsedTime = () => {
    if (!exportJob.startedAt) return null;
    const end = exportJob.completedAt || new Date();
    return Math.floor((end.getTime() - exportJob.startedAt.getTime()) / 1000);
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
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="p-2 rounded-lg text-white flex-shrink-0"
            style={{ backgroundColor: FORMAT_COLORS[exportJob.format] }}
          >
            <FormatIcon className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">
              {exportJob.fileName ||
                `${exportJob.templateName || 'Report'}.${exportJob.format}`}
            </h4>
            <p className="text-sm text-gray-600 line-clamp-1">
              {exportJob.templateName} • {exportJob.format.toUpperCase()}
            </p>

            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{exportJob.createdBy || 'System'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(exportJob.createdAt)}</span>
              </div>
              {exportJob.fileSize && (
                <div className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  <span>{formatFileSize(exportJob.fileSize)}</span>
                </div>
              )}
              {elapsedTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDuration(elapsedTime)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[exportJob.status]}`}
          >
            <StatusIcon
              className={`h-3 w-3 inline mr-1 ${isProcessing ? 'animate-spin' : ''}`}
            />
            {exportJob.status}
          </div>

          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar for Processing */}
      {isProcessing && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>{exportJob.currentStep || 'Processing...'}</span>
            <span>{exportJob.progress?.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <motion.div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{
                width: `${Math.min(Math.max(exportJob.progress || 0, 0), 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {hasFailed && exportJob.error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
            <span className="text-red-700">{exportJob.error}</span>
          </div>
        </div>
      )}

      {/* Export Details */}
      {exportJob.options && Object.keys(exportJob.options).length > 0 && (
        <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
          <div className="text-xs text-gray-600 mb-1">Export Options:</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(exportJob.options)
              .slice(0, 3)
              .map(([key, value], idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs"
                >
                  {key}: {String(value)}
                </span>
              ))}
            {Object.keys(exportJob.options).length > 3 && (
              <span className="text-xs text-gray-500">
                +{Object.keys(exportJob.options).length - 3} more
              </span>
            )}
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
              {isCompleted && (
                <>
                  <button
                    onClick={onDownload}
                    className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </button>

                  <button
                    onClick={onShare}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                  >
                    <Share2 className="h-3 w-3" />
                    Share
                  </button>
                </>
              )}

              {hasFailed && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs hover:bg-yellow-200 transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </button>
              )}

              {isCompleted && (
                <button
                  onClick={() => {
                    /* TODO: Implement preview */
                  }}
                  className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200 transition-colors"
                >
                  <Eye className="h-3 w-3" />
                  Preview
                </button>
              )}

              <button
                onClick={() => {
                  /* TODO: Implement duplicate */
                }}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors"
              >
                <Copy className="h-3 w-3" />
                Duplicate
              </button>

              <button
                onClick={onDelete}
                className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors ml-auto"
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

const ExportStats = ({ exports }: { exports: ExportJob[] }) => {
  const stats = useMemo(() => {
    const totalSize = exports
      .filter((e) => e.fileSize && e.status === 'completed')
      .reduce((sum, e) => sum + (e.fileSize || 0), 0);

    const completedToday = exports.filter((e) => {
      const today = new Date();
      const exportDate = new Date(e.createdAt);
      return (
        exportDate.toDateString() === today.toDateString() &&
        e.status === 'completed'
      );
    }).length;

    const averageTime =
      exports
        .filter((e) => e.startedAt && e.completedAt && e.status === 'completed')
        .reduce((acc, e, _, arr) => {
          const duration = e.completedAt!.getTime() - e.startedAt!.getTime();
          return acc + duration / arr.length;
        }, 0) / 1000;

    const statusCounts = exports.reduce(
      (counts, e) => {
        counts[e.status] = (counts[e.status] || 0) + 1;
        return counts;
      },
      {} as Record<ExportStatus, number>,
    );

    return {
      total: exports.length,
      completed: statusCounts.completed || 0,
      processing: statusCounts.processing || 0,
      failed: statusCounts.failed || 0,
      totalSize,
      completedToday,
      averageTime: Math.round(averageTime),
    };
  }, [exports]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-medium text-gray-900 mb-4">Export Statistics</h3>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <div className="text-lg font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-500">Total Exports</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="h-4 w-4 text-green-600" />
            </div>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {stats.completed}
          </div>
          <div className="text-xs text-gray-500">Completed</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Database className="h-4 w-4 text-purple-600" />
            </div>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {formatFileSize(stats.totalSize)}
          </div>
          <div className="text-xs text-gray-500">Total Size</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {stats.averageTime ? formatDuration(stats.averageTime) : '--'}
          </div>
          <div className="text-xs text-gray-500">Avg. Time</div>
        </div>
      </div>

      {stats.processing > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
            <span className="text-sm text-blue-800">
              {stats.processing} export{stats.processing !== 1 ? 's' : ''}{' '}
              currently processing
            </span>
          </div>
        </div>
      )}

      {stats.failed > 0 && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-800">
              {stats.failed} export{stats.failed !== 1 ? 's' : ''} failed
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export const ExportManager: React.FC<ExportManagerProps> = ({
  exports,
  onDownload,
  onDelete,
  onRetry,
  onShare,
  onRefresh,
  onBatchExport,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExportStatus | 'all'>('all');
  const [formatFilter, setFormatFilter] = useState<ExportFormat | 'all'>('all');
  const [dateRange, setDateRange] = useState<
    'all' | 'today' | 'week' | 'month'
  >('all');
  const [sortBy, setSortBy] = useState<'created' | 'name' | 'size'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedExports, setSelectedExports] = useState<string[]>([]);

  const filteredAndSortedExports = useMemo(() => {
    let filtered = exports;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (exp) =>
          (exp.fileName && exp.fileName.toLowerCase().includes(query)) ||
          (exp.templateName &&
            exp.templateName.toLowerCase().includes(query)) ||
          (exp.createdBy && exp.createdBy.toLowerCase().includes(query)),
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((exp) => exp.status === statusFilter);
    }

    // Apply format filter
    if (formatFilter !== 'all') {
      filtered = filtered.filter((exp) => exp.format === formatFilter);
    }

    // Apply date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();

      switch (dateRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(
        (exp) => new Date(exp.createdAt) >= cutoffDate,
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = (a.fileName || '').localeCompare(b.fileName || '');
          break;
        case 'created':
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'size':
          comparison = (a.fileSize || 0) - (b.fileSize || 0);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [
    exports,
    searchQuery,
    statusFilter,
    formatFilter,
    dateRange,
    sortBy,
    sortOrder,
  ]);

  const statusCounts = useMemo(() => {
    return exports.reduce(
      (counts, exp) => {
        counts[exp.status] = (counts[exp.status] || 0) + 1;
        return counts;
      },
      {} as Record<ExportStatus, number>,
    );
  }, [exports]);

  const formatCounts = useMemo(() => {
    return exports.reduce(
      (counts, exp) => {
        counts[exp.format] = (counts[exp.format] || 0) + 1;
        return counts;
      },
      {} as Record<ExportFormat, number>,
    );
  }, [exports]);

  const handleBulkAction = useCallback(
    (action: 'download' | 'delete' | 'archive') => {
      const selectedJobs = exports.filter((exp) =>
        selectedExports.includes(exp.id),
      );

      switch (action) {
        case 'download':
          selectedJobs.forEach((job) => {
            if (job.status === 'completed') {
              onDownload(job);
            }
          });
          break;
        case 'delete':
          selectedExports.forEach((id) => onDelete(id));
          setSelectedExports([]);
          break;
        case 'archive':
          // TODO: Implement archive functionality
          console.log('Archive:', selectedExports);
          break;
      }
    },
    [selectedExports, exports, onDownload, onDelete],
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Export History</h2>
          <p className="text-gray-600">
            Manage and download your exported reports
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onBatchExport && (
            <button
              onClick={onBatchExport}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              <CloudDownload className="h-4 w-4" />
              Batch Export
            </button>
          )}

          <button
            onClick={onRefresh}
            className="flex items-center gap-2 bg-wedding-primary text-white px-4 py-2 rounded-md hover:bg-wedding-primary/90 transition-colors font-medium"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics */}
      <ExportStats exports={exports} />

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search exports by name, template, or creator..."
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
                <option value="all">All Status ({exports.length})</option>
                <option value="completed">
                  Completed ({statusCounts.completed || 0})
                </option>
                <option value="processing">
                  Processing ({statusCounts.processing || 0})
                </option>
                <option value="failed">
                  Failed ({statusCounts.failed || 0})
                </option>
                <option value="pending">
                  Pending ({statusCounts.pending || 0})
                </option>
              </select>
            </div>

            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value="all">All Formats</option>
              <option value="pdf">PDF ({formatCounts.pdf || 0})</option>
              <option value="excel">Excel ({formatCounts.excel || 0})</option>
              <option value="csv">CSV ({formatCounts.csv || 0})</option>
              <option value="png">PNG ({formatCounts.png || 0})</option>
              <option value="jpeg">JPEG ({formatCounts.jpeg || 0})</option>
            </select>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
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
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="size-desc">Largest First</option>
              <option value="size-asc">Smallest First</option>
            </select>

            <button
              onClick={() =>
                setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
              }
              className="p-1 text-gray-600 hover:text-gray-900 rounded"
            >
              {sortOrder === 'asc' ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedExports.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm text-blue-700">
              {selectedExports.length} export
              {selectedExports.length !== 1 ? 's' : ''} selected
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkAction('download')}
                className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
              >
                Download All
              </button>
              <button
                onClick={() => handleBulkAction('archive')}
                className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors"
              >
                Archive
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedExports([])}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {filteredAndSortedExports.length} of {exports.length} exports
        </span>

        <button
          onClick={() => {
            setSearchQuery('');
            setStatusFilter('all');
            setFormatFilter('all');
            setDateRange('all');
          }}
          className="text-wedding-primary hover:text-wedding-primary/80 font-medium"
        >
          Clear all filters
        </button>
      </div>

      {/* Exports List */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredAndSortedExports.length > 0 ? (
            filteredAndSortedExports.map((exportJob) => (
              <ExportCard
                key={exportJob.id}
                exportJob={exportJob}
                onDownload={() => onDownload(exportJob)}
                onDelete={() => onDelete(exportJob.id)}
                onRetry={() => onRetry(exportJob)}
                onShare={() => onShare(exportJob)}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-white rounded-lg border border-gray-200"
            >
              <div className="text-gray-400 mb-4">
                <Download className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No exports found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery ||
                statusFilter !== 'all' ||
                formatFilter !== 'all' ||
                dateRange !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No exports have been created yet.'}
              </p>
              {(searchQuery ||
                statusFilter !== 'all' ||
                formatFilter !== 'all' ||
                dateRange !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setFormatFilter('all');
                    setDateRange('all');
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

export default ExportManager;
