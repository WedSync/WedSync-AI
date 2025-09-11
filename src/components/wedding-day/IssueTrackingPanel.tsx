'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  MessageSquare,
  Phone,
  ArrowUp,
  Flag,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit3,
  Trash2,
  UserCheck,
  Timer,
  AlertCircle,
  Info,
  Zap,
  Bug,
  Wrench,
  Cloud,
  Wifi,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import type { WeddingDayIssue } from '@/types/wedding-day';

const severityConfig = {
  low: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Info,
    bgColor: 'bg-blue-50',
  },
  medium: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: AlertCircle,
    bgColor: 'bg-yellow-50',
  },
  high: {
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: AlertTriangle,
    bgColor: 'bg-orange-50',
  },
  critical: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: Zap,
    bgColor: 'bg-red-50',
  },
};

const statusConfig = {
  open: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertTriangle,
  },
  'in-progress': {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Clock,
  },
  resolved: {
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle2,
  },
  escalated: {
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: ArrowUp,
  },
};

const categoryIcons = {
  vendor: User,
  timeline: Clock,
  weather: Cloud,
  technical: Wifi,
  logistics: Package,
  other: AlertTriangle,
};

interface IssueTrackingPanelProps {
  issues: WeddingDayIssue[];
  onIssueCreate: (
    issue: Omit<WeddingDayIssue, 'id' | 'created_at' | 'updated_at'>,
  ) => void;
  onIssueUpdate: (issueId: string, update: Partial<WeddingDayIssue>) => void;
  className?: string;
}

export function IssueTrackingPanel({
  issues,
  onIssueCreate,
  onIssueUpdate,
  className,
}: IssueTrackingPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<WeddingDayIssue | null>(
    null,
  );

  // Filter issues
  const filteredIssues = issues
    .filter((issue) => {
      const matchesSearch =
        issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSeverity =
        severityFilter === 'all' || issue.severity === severityFilter;
      const matchesStatus =
        statusFilter === 'all' || issue.status === statusFilter;
      const matchesCategory =
        categoryFilter === 'all' || issue.category === categoryFilter;

      return (
        matchesSearch && matchesSeverity && matchesStatus && matchesCategory
      );
    })
    .sort((a, b) => {
      // Sort by severity (critical first), then by creation time (newest first)
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const aSeverity = severityOrder[a.severity];
      const bSeverity = severityOrder[b.severity];

      if (aSeverity !== bSeverity) {
        return aSeverity - bSeverity;
      }

      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

  // Issue stats
  const stats = {
    total: issues.length,
    open: issues.filter((i) => i.status === 'open').length,
    inProgress: issues.filter((i) => i.status === 'in-progress').length,
    resolved: issues.filter((i) => i.status === 'resolved').length,
    critical: issues.filter(
      (i) => i.severity === 'critical' && i.status !== 'resolved',
    ).length,
  };

  return (
    <div className={cn('bg-white rounded-lg shadow', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-medium text-gray-900">
              Issue Tracking
            </h3>
            <span className="text-sm text-gray-500">
              ({stats.total} total, {stats.open + stats.inProgress} active)
            </span>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Report Issue
          </button>
        </div>

        {/* Issue Stats */}
        <div className="flex flex-wrap gap-2 mt-3">
          <div className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
            Open: {stats.open}
          </div>
          <div className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            In Progress: {stats.inProgress}
          </div>
          <div className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            Resolved: {stats.resolved}
          </div>
          {stats.critical > 0 && (
            <div className="inline-flex items-center px-2 py-1 bg-red-200 text-red-900 rounded-full text-xs font-medium animate-pulse">
              <Zap className="w-3 h-3 mr-1" />
              Critical: {stats.critical}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search issues..."
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="escalated">Escalated</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Categories</option>
              <option value="vendor">Vendor</option>
              <option value="timeline">Timeline</option>
              <option value="weather">Weather</option>
              <option value="technical">Technical</option>
              <option value="logistics">Logistics</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredIssues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <CheckCircle2 className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">
              {searchQuery ||
              severityFilter !== 'all' ||
              statusFilter !== 'all' ||
              categoryFilter !== 'all'
                ? 'No issues match your filters'
                : 'No issues reported yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onUpdate={(update) => onIssueUpdate(issue.id, update)}
                onSelect={() => setSelectedIssue(issue)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Issue Modal */}
      {showCreateModal && (
        <CreateIssueModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(issue) => {
            onIssueCreate(issue);
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Issue Detail Modal */}
      {selectedIssue && (
        <IssueDetailModal
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onUpdate={(update) => {
            onIssueUpdate(selectedIssue.id, update);
            setSelectedIssue(null);
          }}
        />
      )}
    </div>
  );
}

interface IssueCardProps {
  issue: WeddingDayIssue;
  onUpdate: (update: Partial<WeddingDayIssue>) => void;
  onSelect: () => void;
}

function IssueCard({ issue, onUpdate, onSelect }: IssueCardProps) {
  const [showActions, setShowActions] = useState(false);

  const SeverityIcon = severityConfig[issue.severity].icon;
  const StatusIcon = statusConfig[issue.status].icon;
  const CategoryIcon = categoryIcons[issue.category];

  const isUrgent = issue.severity === 'critical' && issue.status !== 'resolved';
  const isOverdue =
    issue.estimatedResolutionTime &&
    new Date() > new Date(Date.now() + issue.estimatedResolutionTime * 60000);

  return (
    <div
      className={cn(
        'p-4 hover:bg-gray-50 cursor-pointer transition-colors',
        severityConfig[issue.severity].bgColor,
        isUrgent && 'border-l-4 border-l-red-500',
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {/* Issue Icon */}
          <div
            className={cn(
              'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
              severityConfig[issue.severity].color,
            )}
          >
            <SeverityIcon className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title and Status */}
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-gray-900">{issue.title}</h4>

              <div
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                  statusConfig[issue.status].color,
                )}
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {issue.status.replace('-', ' ').toUpperCase()}
              </div>

              <div
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                  severityConfig[issue.severity].color,
                )}
              >
                {issue.severity.toUpperCase()}
              </div>

              {isOverdue && (
                <div className="inline-flex items-center px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                  <Timer className="w-3 h-3 mr-1" />
                  OVERDUE
                </div>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {issue.description}
            </p>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <CategoryIcon className="w-3 h-3" />
                <span className="capitalize">{issue.category}</span>
              </div>

              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>
                  Created{' '}
                  {formatDistanceToNow(new Date(issue.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              {issue.assignedTo && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>Assigned to {issue.assignedTo}</span>
                </div>
              )}

              {issue.estimatedResolutionTime && (
                <div className="flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  <span>ETA: {issue.estimatedResolutionTime}min</span>
                </div>
              )}
            </div>

            {/* Resolution */}
            {issue.resolution && (
              <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                <strong className="text-green-800">Resolution:</strong>
                <span className="text-green-700 ml-1">{issue.resolution}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          {/* Quick Actions */}
          {issue.status === 'open' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({ status: 'in-progress' });
              }}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 transition-colors"
            >
              <UserCheck className="w-3 h-3 mr-1" />
              Take
            </button>
          )}

          {issue.status === 'in-progress' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({
                  status: 'resolved',
                  resolved_at: new Date().toISOString(),
                });
              }}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Resolve
            </button>
          )}

          {/* More Actions */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showActions && (
              <div className="absolute right-0 top-8 z-10 w-48 bg-white rounded-lg shadow-lg border py-1">
                {issue.status !== 'in-progress' &&
                  issue.status !== 'resolved' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdate({ status: 'in-progress' });
                        setShowActions(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Start Working
                    </button>
                  )}

                {issue.status !== 'resolved' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate({
                        status: 'resolved',
                        resolved_at: new Date().toISOString(),
                      });
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    Mark Resolved
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate({
                      status: 'escalated',
                      escalation_level: (issue.escalation_level || 0) + 1,
                    });
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  Escalate Issue
                </button>

                <div className="border-t my-1" />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-gray-50"
                >
                  View Details
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface CreateIssueModalProps {
  onClose: () => void;
  onCreate: (
    issue: Omit<WeddingDayIssue, 'id' | 'created_at' | 'updated_at'>,
  ) => void;
}

function CreateIssueModal({ onClose, onCreate }: CreateIssueModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium' as WeddingDayIssue['severity'],
    category: 'other' as WeddingDayIssue['category'],
    estimatedResolutionTime: 30,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) return;

    onCreate({
      title: formData.title,
      description: formData.description,
      severity: formData.severity,
      category: formData.category,
      status: 'open',
      reportedBy: 'current-user', // Should be actual user ID
      estimatedResolutionTime: formData.estimatedResolutionTime,
      escalation_level: 0,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Report New Issue
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Brief description of the issue"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Detailed description of the issue..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity
              </label>
              <select
                value={formData.severity}
                onChange={(e) =>
                  setFormData({ ...formData, severity: e.target.value as any })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as any })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="vendor">Vendor</option>
                <option value="timeline">Timeline</option>
                <option value="weather">Weather</option>
                <option value="technical">Technical</option>
                <option value="logistics">Logistics</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Resolution Time (minutes)
            </label>
            <input
              type="number"
              min="5"
              max="480"
              value={formData.estimatedResolutionTime}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  estimatedResolutionTime: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Report Issue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface IssueDetailModalProps {
  issue: WeddingDayIssue;
  onClose: () => void;
  onUpdate: (update: Partial<WeddingDayIssue>) => void;
}

function IssueDetailModal({ issue, onClose, onUpdate }: IssueDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h3 className="text-xl font-medium text-gray-900">
                {issue.title}
              </h3>
              <div className="flex items-center gap-2 mt-2">
                <div
                  className={cn(
                    'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
                    statusConfig[issue.status].color,
                  )}
                >
                  {issue.status.replace('-', ' ').toUpperCase()}
                </div>
                <div
                  className={cn(
                    'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
                    severityConfig[issue.severity].color,
                  )}
                >
                  {issue.severity.toUpperCase()}
                </div>
                <div className="text-sm text-gray-500 capitalize">
                  {issue.category}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Description
              </h4>
              <p className="text-gray-600">{issue.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Reported
                </h4>
                <p className="text-gray-600">
                  {format(new Date(issue.created_at), 'MMM d, yyyy HH:mm')}
                </p>
                <p className="text-xs text-gray-500">by {issue.reportedBy}</p>
              </div>

              {issue.assignedTo && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Assigned To
                  </h4>
                  <p className="text-gray-600">{issue.assignedTo}</p>
                </div>
              )}

              {issue.estimatedResolutionTime && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Est. Resolution
                  </h4>
                  <p className="text-gray-600">
                    {issue.estimatedResolutionTime} minutes
                  </p>
                </div>
              )}

              {issue.resolved_at && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Resolved
                  </h4>
                  <p className="text-gray-600">
                    {format(new Date(issue.resolved_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
              )}
            </div>

            {issue.resolution && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Resolution
                </h4>
                <p className="text-gray-600">{issue.resolution}</p>
              </div>
            )}

            {issue.escalation_level > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Escalation Level
                </h4>
                <p className="text-yellow-600 font-medium">
                  Level {issue.escalation_level}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
            {issue.status !== 'resolved' && (
              <button
                onClick={() =>
                  onUpdate({
                    status: 'resolved',
                    resolved_at: new Date().toISOString(),
                  })
                }
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                Mark Resolved
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
