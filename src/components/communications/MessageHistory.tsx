'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { MessageHistoryProps, BulkMessageData } from '@/types/communications';
import {
  HistoryIcon,
  SearchIcon,
  FilterIcon,
  MoreVerticalIcon,
  EyeIcon,
  CopyIcon,
  Trash2Icon,
  CalendarIcon,
  MailIcon,
  SmartphoneIcon,
  MessageCircleIcon,
  UsersIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ActivityIcon,
} from 'lucide-react';

const STATUS_CONFIG = {
  draft: {
    icon: <ClockIcon className="w-4 h-4" />,
    label: 'Draft',
    color: 'text-gray-600 bg-gray-100',
  },
  scheduled: {
    icon: <CalendarIcon className="w-4 h-4" />,
    label: 'Scheduled',
    color: 'text-yellow-600 bg-yellow-100',
  },
  sending: {
    icon: <ActivityIcon className="w-4 h-4" />,
    label: 'Sending',
    color: 'text-blue-600 bg-blue-100',
  },
  sent: {
    icon: <CheckCircleIcon className="w-4 h-4" />,
    label: 'Sent',
    color: 'text-green-600 bg-green-100',
  },
  failed: {
    icon: <XCircleIcon className="w-4 h-4" />,
    label: 'Failed',
    color: 'text-red-600 bg-red-100',
  },
} as const;

const CHANNEL_ICONS = {
  email: <MailIcon className="w-4 h-4" />,
  sms: <SmartphoneIcon className="w-4 h-4" />,
  whatsapp: <MessageCircleIcon className="w-4 h-4" />,
} as const;

interface MessageHistoryFilters {
  search: string;
  status: 'all' | BulkMessageData['status'];
  channel: 'all' | 'email' | 'sms' | 'whatsapp';
  dateRange: 'all' | 'today' | 'week' | 'month';
}

export function MessageHistory({
  couple_id,
  messages,
  onMessageSelect,
  onDeleteMessage,
  onDuplicateMessage,
  className,
}: MessageHistoryProps) {
  const [filters, setFilters] = useState<MessageHistoryFilters>({
    search: '',
    status: 'all',
    channel: 'all',
    dateRange: 'all',
  });
  const [sortBy, setSortBy] = useState<
    'created_at' | 'sent_at' | 'recipient_count'
  >('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(
    new Set(),
  );
  const [showFilters, setShowFilters] = useState(false);

  const filteredAndSortedMessages = useMemo(() => {
    let filtered = messages.filter((message) => {
      // Search filter
      if (filters.search.trim()) {
        const search = filters.search.toLowerCase();
        if (
          !message.message_content.subject?.toLowerCase().includes(search) &&
          !message.message_content.html_content
            .toLowerCase()
            .includes(search) &&
          !message.message_content.text_content.toLowerCase().includes(search)
        ) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== 'all' && message.status !== filters.status) {
        return false;
      }

      // Channel filter
      if (
        filters.channel !== 'all' &&
        !message.delivery_options.channels.includes(filters.channel)
      ) {
        return false;
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const messageDate = new Date(message.created_at || Date.now());
        const now = new Date();
        const dayStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );

        switch (filters.dateRange) {
          case 'today':
            if (messageDate < dayStart) return false;
            break;
          case 'week':
            const weekStart = new Date(dayStart);
            weekStart.setDate(weekStart.getDate() - 7);
            if (messageDate < weekStart) return false;
            break;
          case 'month':
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            if (messageDate < monthStart) return false;
            break;
        }
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'created_at':
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
          break;
        case 'sent_at':
          aValue = a.sent_at ? new Date(a.sent_at) : new Date(0);
          bValue = b.sent_at ? new Date(b.sent_at) : new Date(0);
          break;
        case 'recipient_count':
          aValue = a.recipient_ids.length;
          bValue = b.recipient_ids.length;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [messages, filters, sortBy, sortOrder]);

  const handleFilterChange = useCallback(
    <K extends keyof MessageHistoryFilters>(
      key: K,
      value: MessageHistoryFilters[K],
    ) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSort = useCallback(
    (field: typeof sortBy) => {
      if (sortBy === field) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(field);
        setSortOrder('desc');
      }
    },
    [sortBy],
  );

  const handleSelectMessage = useCallback((messageId: string) => {
    setSelectedMessages((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(messageId)) {
        newSelected.delete(messageId);
      } else {
        newSelected.add(messageId);
      }
      return newSelected;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedMessages.size === filteredAndSortedMessages.length) {
      setSelectedMessages(new Set());
    } else {
      setSelectedMessages(
        new Set(filteredAndSortedMessages.map((m) => m.id).filter(Boolean)),
      );
    }
  }, [selectedMessages.size, filteredAndSortedMessages]);

  const handleBulkDelete = useCallback(() => {
    if (
      selectedMessages.size > 0 &&
      confirm(`Delete ${selectedMessages.size} selected messages?`)
    ) {
      selectedMessages.forEach((messageId) => onDeleteMessage(messageId));
      setSelectedMessages(new Set());
    }
  }, [selectedMessages, onDeleteMessage]);

  const getMessageStats = useCallback((message: BulkMessageData) => {
    const stats = message.delivery_stats;
    const totalSent = stats.email.sent + stats.sms.sent + stats.whatsapp.sent;
    const totalDelivered =
      stats.email.delivered + stats.sms.delivered + stats.whatsapp.delivered;
    const totalFailed =
      stats.email.failed + stats.sms.failed + stats.whatsapp.failed;

    return { totalSent, totalDelivered, totalFailed };
  }, []);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-primary-100 p-2 rounded-lg">
            <HistoryIcon className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Message History
            </h2>
            <p className="text-sm text-gray-600">
              {filteredAndSortedMessages.length} of {messages.length} messages
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {selectedMessages.size > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {selectedMessages.size} selected
              </span>
              <button
                onClick={handleBulkDelete}
                className="flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors duration-200"
              >
                <Trash2Icon className="w-4 h-4 mr-2" />
                Delete
              </button>
            </div>
          )}

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
              showFilters
                ? 'bg-primary-100 text-primary-700'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
            )}
          >
            <FilterIcon className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Messages
              </label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search subject or content..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  handleFilterChange('status', e.target.value as any)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="sending">Sending</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Channel Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Channel
              </label>
              <select
                value={filters.channel}
                onChange={(e) =>
                  handleFilterChange('channel', e.target.value as any)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Channels</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) =>
                  handleFilterChange('dateRange', e.target.value as any)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(filters.search ||
            filters.status !== 'all' ||
            filters.channel !== 'all' ||
            filters.dateRange !== 'all') && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() =>
                  setFilters({
                    search: '',
                    status: 'all',
                    channel: 'all',
                    dateRange: 'all',
                  })
                }
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Messages List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {filteredAndSortedMessages.length > 0 ? (
          <>
            {/* Table Header */}
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={
                    selectedMessages.size ===
                      filteredAndSortedMessages.length &&
                    filteredAndSortedMessages.length > 0
                  }
                  onChange={handleSelectAll}
                  className="mr-4 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <div className="flex-1 grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="col-span-4">
                    <button
                      onClick={() => handleSort('created_at')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>Message</span>
                      {sortBy === 'created_at' && (
                        <span className="text-primary-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </div>
                  <div className="col-span-2">
                    <button
                      onClick={() => handleSort('recipient_count')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>Recipients</span>
                      {sortBy === 'recipient_count' && (
                        <span className="text-primary-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </div>
                  <div className="col-span-2">Channels</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1">Stats</div>
                  <div className="col-span-1">Actions</div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="divide-y divide-gray-200">
              {filteredAndSortedMessages.map((message) => {
                const isSelected = selectedMessages.has(message.id || '');
                const statusConfig = STATUS_CONFIG[message.status];
                const stats = getMessageStats(message);

                return (
                  <div
                    key={message.id}
                    className={cn(
                      'px-6 py-4 hover:bg-gray-50 transition-colors duration-200',
                      isSelected && 'bg-blue-50',
                    )}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectMessage(message.id || '')}
                        className="mr-4 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />

                      <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                        {/* Message Info */}
                        <div className="col-span-4">
                          <div className="space-y-1">
                            <h4 className="font-medium text-gray-900 truncate">
                              {message.message_content.subject || 'No subject'}
                            </h4>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {message.message_content.text_content.substring(
                                0,
                                120,
                              )}
                              ...
                            </p>
                            <div className="text-xs text-gray-500">
                              {message.created_at
                                ? new Date(
                                    message.created_at,
                                  ).toLocaleDateString()
                                : 'Draft'}
                            </div>
                          </div>
                        </div>

                        {/* Recipients */}
                        <div className="col-span-2">
                          <div className="flex items-center space-x-1">
                            <UsersIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {message.recipient_ids.length}
                            </span>
                          </div>
                        </div>

                        {/* Channels */}
                        <div className="col-span-2">
                          <div className="flex items-center space-x-1">
                            {message.delivery_options.channels.map(
                              (channel) => (
                                <span key={channel} className="text-gray-400">
                                  {CHANNEL_ICONS[channel]}
                                </span>
                              ),
                            )}
                          </div>
                        </div>

                        {/* Status */}
                        <div className="col-span-2">
                          <span
                            className={cn(
                              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                              statusConfig.color,
                            )}
                          >
                            {statusConfig.icon}
                            <span className="ml-1">{statusConfig.label}</span>
                          </span>
                        </div>

                        {/* Stats */}
                        <div className="col-span-1">
                          {message.status === 'sent' ? (
                            <div className="text-xs space-y-1">
                              <div className="text-green-600">
                                ✓ {stats.totalDelivered}
                              </div>
                              {stats.totalFailed > 0 && (
                                <div className="text-red-600">
                                  ✗ {stats.totalFailed}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="col-span-1">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => onMessageSelect(message)}
                              className="text-gray-400 hover:text-primary-600 transition-colors"
                              title="View Details"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => onDuplicateMessage(message)}
                              className="text-gray-400 hover:text-blue-600 transition-colors"
                              title="Duplicate"
                            >
                              <CopyIcon className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                if (confirm('Delete this message?')) {
                                  onDeleteMessage(message.id || '');
                                }
                              }}
                              className="text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2Icon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="px-6 py-12 text-center">
            <HistoryIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No messages found
            </h3>
            <p className="text-gray-600 mb-4">
              {messages.length === 0
                ? "You haven't sent any messages yet."
                : 'No messages match your current filters.'}
            </p>
            {messages.length === 0 ? (
              <button
                onClick={() => {
                  /* Navigate to create new message */
                }}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm rounded-lg transition-colors duration-200"
              >
                Send Your First Message
              </button>
            ) : (
              <button
                onClick={() =>
                  setFilters({
                    search: '',
                    status: 'all',
                    channel: 'all',
                    dateRange: 'all',
                  })
                }
                className="text-primary-600 hover:text-primary-700 font-medium text-sm"
              >
                Clear filters to see all messages
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
