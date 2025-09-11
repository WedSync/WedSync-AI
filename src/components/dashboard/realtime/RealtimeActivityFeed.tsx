'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRealtimeConnection } from '@/hooks/useRealtime';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import {
  MessageCircle,
  Mail,
  FileText,
  Calendar,
  CreditCard,
  User,
  CheckCircle,
  AlertCircle,
  Info,
  Bell,
  Eye,
  Pin,
  Filter,
  Search,
  RefreshCw,
  Loader2,
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  Image,
  Paperclip,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityFeedItem } from '@/types/realtime';

const activityIcons: Record<string, React.ComponentType<any>> = {
  message_sent: MessageCircle,
  email_sent: Mail,
  form_submitted: FileText,
  form_updated: FileText,
  booking_created: Calendar,
  booking_updated: Calendar,
  payment_received: CreditCard,
  payment_failed: AlertCircle,
  user_joined: User,
  user_left: User,
  document_signed: CheckCircle,
  document_uploaded: Paperclip,
  photo_shared: Image,
  milestone_reached: Star,
  budget_updated: DollarSign,
  vendor_assigned: Users,
  timeline_changed: Clock,
  alert: AlertCircle,
  info: Info,
};

const activityColors: Record<string, string> = {
  message_sent: 'bg-blue-100 text-blue-600',
  email_sent: 'bg-purple-100 text-purple-600',
  form_submitted: 'bg-green-100 text-green-600',
  form_updated: 'bg-yellow-100 text-yellow-600',
  booking_created: 'bg-indigo-100 text-indigo-600',
  booking_updated: 'bg-orange-100 text-orange-600',
  payment_received: 'bg-emerald-100 text-emerald-600',
  payment_failed: 'bg-red-100 text-red-600',
  user_joined: 'bg-cyan-100 text-cyan-600',
  user_left: 'bg-gray-100 text-gray-600',
  document_signed: 'bg-teal-100 text-teal-600',
  document_uploaded: 'bg-slate-100 text-slate-600',
  photo_shared: 'bg-pink-100 text-pink-600',
  milestone_reached: 'bg-amber-100 text-amber-600',
  budget_updated: 'bg-lime-100 text-lime-600',
  vendor_assigned: 'bg-violet-100 text-violet-600',
  timeline_changed: 'bg-rose-100 text-rose-600',
  alert: 'bg-red-100 text-red-600',
  info: 'bg-blue-100 text-blue-600',
};

interface RealtimeActivityFeedProps {
  organizationId: string;
  userId?: string;
  entityType?: 'client' | 'vendor' | 'form' | 'message' | 'booking' | 'payment';
  entityId?: string;
  maxItems?: number;
  showFilters?: boolean;
  showSearch?: boolean;
  showPinned?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  groupByDate?: boolean;
  className?: string;
}

export function RealtimeActivityFeed({
  organizationId,
  userId,
  entityType,
  entityId,
  maxItems = 50,
  showFilters = true,
  showSearch = true,
  showPinned = true,
  autoRefresh = true,
  refreshInterval = 30000,
  groupByDate = true,
  className,
}: RealtimeActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<
    ActivityFeedItem[]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const autoRefreshRef = useRef<NodeJS.Timeout>();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hasNewActivities, setHasNewActivities] = useState(false);

  // Set up realtime connection
  const { isConnected, connectionState, send } = useRealtimeConnection(
    `activity-${organizationId}`,
    {
      onMessage: handleRealtimeActivity,
      onConnect: () => console.log('Activity feed connected'),
      onDisconnect: () => console.log('Activity feed disconnected'),
    },
  );

  // Handle incoming realtime activities
  function handleRealtimeActivity(payload: any) {
    const { type, data } = payload;

    if (type === 'activity') {
      const newActivity: ActivityFeedItem = {
        ...data,
        timestamp: data.timestamp || Date.now(),
      };

      setActivities((prev) => {
        // Add new activity at the beginning
        const updated = [newActivity, ...prev];
        // Keep only maxItems
        return updated.slice(0, maxItems);
      });

      setLastUpdate(Date.now());
      setHasNewActivities(true);

      // Auto-scroll to top if user is at top
      if (scrollContainerRef.current?.scrollTop === 0) {
        setTimeout(() => {
          scrollContainerRef.current?.scrollTo({
            top: 0,
            behavior: 'smooth',
          });
        }, 100);
      }
    }
  }

  // Filter activities based on search and type filters
  useEffect(() => {
    let filtered = [...activities];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (activity) =>
          activity.title.toLowerCase().includes(query) ||
          activity.description?.toLowerCase().includes(query) ||
          activity.userName?.toLowerCase().includes(query),
      );
    }

    // Apply type filters
    if (selectedTypes.length > 0) {
      filtered = filtered.filter((activity) =>
        selectedTypes.includes(activity.type),
      );
    }

    // Apply entity filters
    if (entityType && entityId) {
      filtered = filtered.filter(
        (activity) =>
          activity.metadata?.entityType === entityType &&
          activity.metadata?.entityId === entityId,
      );
    }

    setFilteredActivities(filtered);
  }, [activities, searchQuery, selectedTypes, entityType, entityId]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    autoRefreshRef.current = setInterval(() => {
      // Force re-render to update relative times
      setLastUpdate(Date.now());
    }, refreshInterval);

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [autoRefresh, refreshInterval]);

  // Group activities by date
  const groupedActivities = useCallback(() => {
    if (!groupByDate) return { all: filteredActivities };

    const groups: Record<string, ActivityFeedItem[]> = {};

    filteredActivities.forEach((activity) => {
      let groupKey: string;

      if (isToday(activity.timestamp)) {
        groupKey = 'Today';
      } else if (isYesterday(activity.timestamp)) {
        groupKey = 'Yesterday';
      } else {
        groupKey = format(activity.timestamp, 'MMMM d, yyyy');
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(activity);
    });

    return groups;
  }, [filteredActivities, groupByDate]);

  // Mark activity as read
  const markAsRead = useCallback(
    (activityId: string) => {
      setActivities((prev) =>
        prev.map((activity) =>
          activity.id === activityId ? { ...activity, isRead: true } : activity,
        ),
      );

      // Send read status to server
      send({
        type: 'activity_read',
        data: { activityId, userId },
      });
    },
    [send, userId],
  );

  // Pin/unpin activity
  const togglePin = useCallback(
    (activityId: string) => {
      setActivities((prev) =>
        prev.map((activity) =>
          activity.id === activityId
            ? { ...activity, isPinned: !activity.isPinned }
            : activity,
        ),
      );

      // Send pin status to server
      const activity = activities.find((a) => a.id === activityId);
      send({
        type: 'activity_pin',
        data: {
          activityId,
          isPinned: !activity?.isPinned,
          userId,
        },
      });
    },
    [activities, send, userId],
  );

  // Get activity type options for filter
  const activityTypes = Array.from(
    new Set(activities.map((a) => a.type)),
  ).sort();

  // Load new activities indicator
  const loadNewActivities = useCallback(() => {
    scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    setHasNewActivities(false);
  }, []);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-white">
        {/* Search and Filters */}
        {(showSearch || showFilters) && (
          <div className="p-4 space-y-3">
            {showSearch && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search activities..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {showFilters && activityTypes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600 py-1">Filter:</span>
                {activityTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedTypes((prev) =>
                        prev.includes(type)
                          ? prev.filter((t) => t !== type)
                          : [...prev, type],
                      );
                    }}
                    className={cn(
                      'px-3 py-1 text-xs rounded-full border transition-colors',
                      selectedTypes.includes(type)
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400',
                    )}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
                {selectedTypes.length > 0 && (
                  <button
                    onClick={() => setSelectedTypes([])}
                    className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Connection Status */}
        <div className="px-4 py-2 bg-gray-50 border-t flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {connectionState === 'connected' ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-gray-600">Live</span>
              </>
            ) : connectionState === 'reconnecting' ? (
              <>
                <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />
                <span className="text-gray-600">Reconnecting...</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-gray-600">Offline</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              Last update:{' '}
              {formatDistanceToNow(lastUpdate, { addSuffix: true })}
            </span>
            <button
              onClick={() => setLastUpdate(Date.now())}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3 h-3 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* New Activities Indicator */}
      {hasNewActivities && (
        <button
          onClick={loadNewActivities}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-blue-500 text-white text-sm rounded-full shadow-lg hover:bg-blue-600 transition-colors animate-fadeIn"
        >
          <TrendingUp className="w-4 h-4 inline mr-2" />
          New activities
        </button>
      )}

      {/* Activities List */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Bell className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium">No activities yet</p>
            <p className="text-sm mt-1">
              Activities will appear here as they happen
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {/* Pinned Activities */}
            {showPinned && (
              <>
                {filteredActivities
                  .filter((a) => a.isPinned)
                  .map((activity) => (
                    <ActivityItem
                      key={activity.id}
                      activity={activity}
                      onRead={markAsRead}
                      onTogglePin={togglePin}
                      isPinned
                    />
                  ))}
                {filteredActivities.some((a) => a.isPinned) && (
                  <div className="h-2 bg-gray-100" />
                )}
              </>
            )}

            {/* Grouped Activities */}
            {Object.entries(groupedActivities()).map(([date, items]) => (
              <div key={date}>
                {groupByDate && date !== 'all' && (
                  <div className="px-4 py-2 bg-gray-50 sticky top-0 z-5">
                    <span className="text-sm font-medium text-gray-700">
                      {date}
                    </span>
                  </div>
                )}
                {items
                  .filter((a) => !a.isPinned || !showPinned)
                  .map((activity) => (
                    <ActivityItem
                      key={activity.id}
                      activity={activity}
                      onRead={markAsRead}
                      onTogglePin={togglePin}
                    />
                  ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ActivityItemProps {
  activity: ActivityFeedItem;
  onRead: (id: string) => void;
  onTogglePin: (id: string) => void;
  isPinned?: boolean;
}

function ActivityItem({
  activity,
  onRead,
  onTogglePin,
  isPinned,
}: ActivityItemProps) {
  const Icon = activityIcons[activity.type] || Bell;
  const colorClass =
    activityColors[activity.type] || 'bg-gray-100 text-gray-600';

  return (
    <div
      className={cn(
        'px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer group',
        !activity.isRead && 'bg-blue-50/50',
        isPinned && 'bg-yellow-50/50',
      )}
      onClick={() => !activity.isRead && onRead(activity.id)}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
            colorClass,
          )}
        >
          <Icon className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {activity.title}
              </p>
              {activity.description && (
                <p className="text-sm text-gray-600 mt-0.5">
                  {activity.description}
                </p>
              )}
              {activity.userName && (
                <p className="text-xs text-gray-500 mt-1">
                  by {activity.userName}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(activity.id);
                }}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title={isPinned ? 'Unpin' : 'Pin'}
              >
                <Pin
                  className={cn(
                    'w-3 h-3',
                    activity.isPinned
                      ? 'text-yellow-600 fill-current'
                      : 'text-gray-400',
                  )}
                />
              </button>
              {!activity.isRead && (
                <div
                  className="w-2 h-2 bg-blue-500 rounded-full"
                  title="Unread"
                />
              )}
            </div>
          </div>

          {/* Timestamp */}
          <p className="text-xs text-gray-400 mt-1">
            {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );
}
