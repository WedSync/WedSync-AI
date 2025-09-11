'use client';

import { useState, useEffect } from 'react';
import { useRealtimeActivityFeed } from '@/lib/supabase/realtime';
import { Database } from '@/types/database';
import { formatDistanceToNow, format, isToday } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import { clsx } from 'clsx';

type ActivityFeed = Database['public']['Tables']['activity_feeds']['Row'] & {
  actor?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
};

interface ActivityFeedProps {
  organizationId: string;
  userId?: string;
  entityType?: 'client' | 'vendor' | 'form' | 'message' | 'booking' | 'payment';
  entityId?: string;
  className?: string;
  maxItems?: number;
  showFilters?: boolean;
}

const activityIcons = {
  message_sent: MessageCircle,
  email_sent: Mail,
  form_submitted: FileText,
  form_updated: FileText,
  booking_created: Calendar,
  booking_updated: Calendar,
  payment_received: CreditCard,
  payment_failed: AlertCircle,
  client_created: User,
  client_updated: User,
  vendor_created: User,
  vendor_updated: User,
  system_notification: Bell,
  default: Info,
};

const activityColors = {
  message_sent: 'text-blue-600',
  email_sent: 'text-green-600',
  form_submitted: 'text-purple-600',
  form_updated: 'text-purple-500',
  booking_created: 'text-indigo-600',
  booking_updated: 'text-indigo-500',
  payment_received: 'text-emerald-600',
  payment_failed: 'text-red-600',
  client_created: 'text-blue-500',
  client_updated: 'text-blue-400',
  vendor_created: 'text-orange-500',
  vendor_updated: 'text-orange-400',
  system_notification: 'text-gray-600',
  default: 'text-gray-500',
};

export function ActivityFeed({
  organizationId,
  userId,
  entityType,
  entityId,
  className = '',
  maxItems = 50,
  showFilters = false,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // Use realtime hook
  const { activities: realtimeActivities, markAsRead } =
    useRealtimeActivityFeed(organizationId, userId);

  // Load initial activities
  useEffect(() => {
    async function loadActivities() {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          organization_id: organizationId,
          limit: maxItems.toString(),
        });

        if (userId) params.append('user_id', userId);
        if (entityType) params.append('entity_type', entityType);
        if (entityId) params.append('entity_id', entityId);

        const response = await fetch(
          `/api/communications/activity-feed?${params}`,
        );

        if (!response.ok) {
          throw new Error('Failed to load activity feed');
        }

        const data = await response.json();
        setActivities(data.activities || []);
      } catch (error) {
        console.error('Error loading activity feed:', error);
      } finally {
        setLoading(false);
      }
    }

    loadActivities();
  }, [organizationId, userId, entityType, entityId, maxItems]);

  // Update activities when realtime data changes
  useEffect(() => {
    if (realtimeActivities.length > 0) {
      setActivities(realtimeActivities.slice(0, maxItems));
    }
  }, [realtimeActivities, maxItems]);

  const handleMarkAsRead = async (activityId: string) => {
    if (!userId) return;

    try {
      await markAsRead(activityId);

      // Also call API to update server
      await fetch(
        `/api/communications/activity-feed?id=${activityId}&action=mark_read`,
        {
          method: 'PATCH',
        },
      );

      // Update local state
      setActivities((prev) =>
        prev.map((activity) =>
          activity.id === activityId
            ? { ...activity, read_by: [...(activity.read_by || []), userId] }
            : activity,
        ),
      );
    } catch (error) {
      console.error('Error marking activity as read:', error);
    }
  };

  const isUnread = (activity: ActivityFeed) => {
    if (!userId) return false;
    return !(activity.read_by || []).includes(userId);
  };

  const getActivityIcon = (activityType: string) => {
    const IconComponent =
      activityIcons[activityType as keyof typeof activityIcons] ||
      activityIcons.default;
    return IconComponent;
  };

  const getActivityColor = (activityType: string) => {
    return (
      activityColors[activityType as keyof typeof activityColors] ||
      activityColors.default
    );
  };

  const filteredActivities = activities.filter((activity) => {
    if (showUnreadOnly && !isUnread(activity)) return false;
    if (filter === 'all') return true;
    return activity.activity_type.includes(filter);
  });

  const formatActivityTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else {
      return format(date, 'MMM d, yyyy');
    }
  };

  if (loading) {
    return (
      <div className={clsx('space-y-4', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse flex items-start space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Filters */}
      {showFilters && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">All Activities</option>
              <option value="message">Messages</option>
              <option value="email">Emails</option>
              <option value="form">Forms</option>
              <option value="booking">Bookings</option>
              <option value="payment">Payments</option>
            </select>

            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="mr-2"
              />
              Unread only
            </label>
          </div>

          <div className="text-sm text-gray-500">
            {filteredActivities.length} activities
          </div>
        </div>
      )}

      {/* Activity List */}
      {filteredActivities.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No activities yet
          </h3>
          <p className="text-gray-500">
            Activity will appear here as things happen in your organization
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredActivities.map((activity) => {
            const Icon = getActivityIcon(activity.activity_type);
            const colorClass = getActivityColor(activity.activity_type);
            const unread = isUnread(activity);

            return (
              <div
                key={activity.id}
                className={clsx(
                  'flex items-start space-x-3 p-4 rounded-lg border transition-colors',
                  unread
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white border-gray-200 hover:bg-gray-50',
                )}
              >
                <div
                  className={clsx(
                    'flex-shrink-0 p-2 rounded-full',
                    activity.color ? `bg-${activity.color}-100` : 'bg-gray-100',
                  )}
                >
                  <Icon className={clsx('w-4 h-4', colorClass)} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4
                        className={clsx(
                          'text-sm',
                          unread
                            ? 'font-semibold text-gray-900'
                            : 'font-medium text-gray-700',
                        )}
                      >
                        {activity.title}
                      </h4>

                      {activity.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {activity.description}
                        </p>
                      )}

                      <div className="flex items-center space-x-2 mt-2">
                        {activity.actor && (
                          <div className="flex items-center space-x-1">
                            <Avatar className="w-5 h-5">
                              {activity.actor.display_name
                                .charAt(0)
                                .toUpperCase()}
                            </Avatar>
                            <span className="text-xs text-gray-500">
                              {activity.actor.display_name}
                            </span>
                          </div>
                        )}

                        <span className="text-xs text-gray-500">
                          {formatActivityTime(activity.created_at)}
                        </span>

                        {activity.entity_type && (
                          <Badge size="sm" color="gray">
                            {activity.entity_type}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {unread && userId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsRead(activity.id)}
                        className="text-xs"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Mark read
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
