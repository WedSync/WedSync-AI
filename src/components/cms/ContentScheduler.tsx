'use client';

import React, { useState, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Send,
  CalendarDays,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw,
  Eye,
  Edit3,
  Trash2,
  Plus,
  Filter,
  Search,
} from 'lucide-react';
import { ContentItem, ContentSchedule, ContentStatus } from '@/types/cms';
import { cn } from '@/lib/utils';

// Content Scheduler Component for Wedding Suppliers
// WS-223 Team A - Round 1
// Publishing workflow with scheduling and approval system

interface ScheduleItemProps {
  item: ContentItem;
  schedule?: ContentSchedule;
  onEdit: (item: ContentItem) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onSchedule: (id: string, date: string) => void;
  onPreview: (item: ContentItem) => void;
}

const ScheduleItem: React.FC<ScheduleItemProps> = ({
  item,
  schedule,
  onEdit,
  onDelete,
  onPublish,
  onSchedule,
  onPreview,
}) => {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const getStatusIcon = (status: ContentStatus) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'draft':
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
      case 'archived':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ContentStatus) => {
    const baseClasses =
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (status) {
      case 'published':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'scheduled':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'draft':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case 'archived':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const handleSchedule = () => {
    if (scheduleDate && scheduleTime) {
      const scheduledDateTime = `${scheduleDate}T${scheduleTime}:00.000Z`;
      onSchedule(item.id, scheduledDateTime);
      setShowScheduleModal(false);
      setScheduleDate('');
      setScheduleTime('');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              {getStatusIcon(item.status)}
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {item.title || 'Untitled Content'}
              </h3>
              <span className={getStatusBadge(item.status)}>{item.status}</span>
            </div>

            <p className="text-sm text-gray-600 mb-3">
              Type:{' '}
              {item.type
                .replace('_', ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase())}
            </p>

            {item.plain_text && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                {item.plain_text.substring(0, 150)}
                {item.plain_text.length > 150 ? '...' : ''}
              </p>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Created: {formatDate(item.created_at)}</span>
              {item.published_at && (
                <span>Published: {formatDate(item.published_at)}</span>
              )}
              {item.scheduled_at && (
                <span>Scheduled: {formatDate(item.scheduled_at)}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPreview(item)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Preview"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={() => onEdit(item)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          {item.status === 'draft' && (
            <>
              <button
                onClick={() => onPublish(item.id)}
                className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all duration-200 flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Publish Now
              </button>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all duration-200 flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Schedule
              </button>
            </>
          )}

          {item.status === 'scheduled' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-blue-600 font-medium">
                Scheduled for {formatDate(item.scheduled_at!)}
              </span>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="px-3 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
              >
                Reschedule
              </button>
            </div>
          )}

          {item.status === 'published' && (
            <span className="text-sm text-green-600 font-medium">
              Published {formatDate(item.published_at!)}
            </span>
          )}

          {schedule && schedule.status === 'failed' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600 font-medium">
                Publishing failed
              </span>
              <button
                onClick={() => onPublish(item.id)}
                className="px-3 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl max-w-md w-full mx-4 shadow-xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Schedule Content
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Publish Date
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Publish Time
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                  />
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedule}
                disabled={!scheduleDate || !scheduleTime}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all duration-200"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface ContentSchedulerProps {
  items?: ContentItem[];
  schedules?: ContentSchedule[];
  onEdit?: (item: ContentItem) => void;
  onDelete?: (id: string) => void;
  onPublish?: (id: string) => void;
  onSchedule?: (id: string, date: string) => void;
  onPreview?: (item: ContentItem) => void;
  className?: string;
}

export const ContentScheduler: React.FC<ContentSchedulerProps> = ({
  items = [],
  schedules = [],
  onEdit = () => {},
  onDelete = () => {},
  onPublish = () => {},
  onSchedule = () => {},
  onPreview = () => {},
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>(
    'all',
  );
  const [sortBy, setSortBy] = useState<'created' | 'scheduled' | 'published'>(
    'created',
  );

  // Mock data for demonstration
  const mockItems: ContentItem[] =
    items.length > 0
      ? items
      : [
          {
            id: '1',
            organization_id: 'org1',
            title: 'Welcome Message for Spring Weddings',
            body: {},
            plain_text:
              'Welcome to our wedding photography service! We specialize in capturing the magic of spring weddings...',
            status: 'draft',
            type: 'welcome_message',
            media_urls: [],
            created_by: 'user1',
            created_at: '2025-01-30T10:00:00Z',
            updated_at: '2025-01-30T10:00:00Z',
            version: 1,
            is_template: false,
          },
          {
            id: '2',
            organization_id: 'org1',
            title: 'Service Package Descriptions',
            body: {},
            plain_text:
              'Our comprehensive wedding photography packages include engagement sessions, wedding day coverage, and delivery of edited images...',
            status: 'scheduled',
            type: 'service_description',
            media_urls: [],
            scheduled_at: '2025-02-01T09:00:00Z',
            created_by: 'user1',
            created_at: '2025-01-29T15:00:00Z',
            updated_at: '2025-01-29T15:00:00Z',
            version: 1,
            is_template: false,
          },
          {
            id: '3',
            organization_id: 'org1',
            title: 'Client Testimonials Page',
            body: {},
            plain_text:
              'Read what our happy couples have to say about their wedding photography experience...',
            status: 'published',
            type: 'page_content',
            media_urls: [],
            published_at: '2025-01-28T12:00:00Z',
            created_by: 'user1',
            created_at: '2025-01-28T10:00:00Z',
            updated_at: '2025-01-28T10:00:00Z',
            version: 1,
            is_template: false,
          },
        ];

  const filteredItems = mockItems.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(query) ||
        item.plain_text?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'scheduled':
        return (
          new Date(b.scheduled_at || '').getTime() -
          new Date(a.scheduled_at || '').getTime()
        );
      case 'published':
        return (
          new Date(b.published_at || '').getTime() -
          new Date(a.published_at || '').getTime()
        );
      default:
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  });

  const statusCounts = mockItems.reduce(
    (counts, item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
      return counts;
    },
    {} as Record<ContentStatus, number>,
  );

  return (
    <div className={cn('bg-gray-50', className)}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Content Scheduler
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your content publishing workflow and schedule posts
            </p>
          </div>
          <button className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all duration-200 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Content
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Draft', count: statusCounts.draft || 0, color: 'gray' },
            {
              label: 'Scheduled',
              count: statusCounts.scheduled || 0,
              color: 'blue',
            },
            {
              label: 'Published',
              count: statusCounts.published || 0,
              color: 'green',
            },
            {
              label: 'Archived',
              count: statusCounts.archived || 0,
              color: 'red',
            },
          ].map(({ label, count, color }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{count}</div>
              <div className="text-sm text-gray-600">{label}</div>
            </div>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ContentStatus | 'all')
            }
            className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'created' | 'scheduled' | 'published')
            }
            className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
          >
            <option value="created">Sort by Created</option>
            <option value="scheduled">Sort by Scheduled</option>
            <option value="published">Sort by Published</option>
          </select>
        </div>
      </div>

      {/* Content List */}
      <div className="p-6">
        {sortedItems.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No content found
            </h3>
            <p className="text-gray-600">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first piece of content to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedItems.map((item) => (
              <ScheduleItem
                key={item.id}
                item={item}
                schedule={schedules.find((s) => s.content_id === item.id)}
                onEdit={onEdit}
                onDelete={onDelete}
                onPublish={onPublish}
                onSchedule={onSchedule}
                onPreview={onPreview}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentScheduler;
