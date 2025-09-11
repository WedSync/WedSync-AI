'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-untitled';
import { Card } from '@/components/ui/card-untitled';
import {
  Clock,
  Mail,
  Phone,
  Calendar,
  FileText,
  UserPlus,
  Edit,
  CheckCircle,
  Star,
  MessageCircle,
  Upload,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { useRealtimeMessages } from '@/lib/supabase/realtime';

interface Activity {
  id: string;
  activity_type: string;
  activity_title: string;
  activity_description?: string;
  performed_by_name?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  clientId: string;
  activities: Activity[];
  onActivityAdd?: (activity: Activity) => void;
}

const activityIcons = {
  client_created: UserPlus,
  client_updated: Edit,
  status_changed: CheckCircle,
  email_sent: Mail,
  sms_sent: Phone,
  call_logged: Phone,
  meeting_scheduled: Calendar,
  note_added: FileText,
  document_uploaded: Upload,
  priority_changed: Star,
  package_selected: CheckCircle,
  payment_received: CheckCircle,
  wedme_connected: CheckCircle,
  message_sent: MessageCircle,
  profile_viewed: Clock,
  default: Clock,
} as const;

const activityColors = {
  client_created: 'text-green-600 bg-green-50 border-green-200',
  client_updated: 'text-blue-600 bg-blue-50 border-blue-200',
  status_changed: 'text-purple-600 bg-purple-50 border-purple-200',
  email_sent: 'text-blue-600 bg-blue-50 border-blue-200',
  sms_sent: 'text-green-600 bg-green-50 border-green-200',
  call_logged: 'text-orange-600 bg-orange-50 border-orange-200',
  meeting_scheduled: 'text-purple-600 bg-purple-50 border-purple-200',
  note_added: 'text-gray-600 bg-gray-50 border-gray-200',
  document_uploaded: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  priority_changed: 'text-amber-600 bg-amber-50 border-amber-200',
  package_selected: 'text-green-600 bg-green-50 border-green-200',
  payment_received: 'text-green-600 bg-green-50 border-green-200',
  wedme_connected: 'text-green-600 bg-green-50 border-green-200',
  message_sent: 'text-blue-600 bg-blue-50 border-blue-200',
  profile_viewed: 'text-gray-600 bg-gray-50 border-gray-200',
  default: 'text-gray-600 bg-gray-50 border-gray-200',
} as const;

export default function ActivityFeed({
  clientId,
  activities,
  onActivityAdd,
}: ActivityFeedProps) {
  const [sortedActivities, setSortedActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Set up realtime updates for client activities
  const { messages } = useRealtimeMessages(`client_activities:${clientId}`);

  useEffect(() => {
    // Sort activities by date (newest first)
    const sorted = [...activities].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    setSortedActivities(sorted);
  }, [activities]);

  // Handle realtime activity updates
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage && onActivityAdd) {
        // Convert realtime message to activity format
        const newActivity: Activity = {
          id: latestMessage.id,
          activity_type: latestMessage.message_type || 'message_sent',
          activity_title:
            latestMessage.content?.substring(0, 50) || 'New message',
          activity_description: latestMessage.content,
          performed_by_name: latestMessage.sender_name,
          created_at: latestMessage.sent_at || latestMessage.created_at,
          metadata: latestMessage.metadata,
        };
        onActivityAdd(newActivity);
      }
    }
  }, [messages, onActivityAdd]);

  const refreshActivities = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/clients/${clientId}/activities`);
      if (!response.ok) throw new Error('Failed to fetch activities');
      const data = await response.json();
      setSortedActivities(
        data.sort(
          (a: Activity, b: Activity) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      );
    } catch (error) {
      console.error('Error refreshing activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredActivities =
    filterType === 'all'
      ? sortedActivities
      : sortedActivities.filter(
          (activity) => activity.activity_type === filterType,
        );

  const activityTypes = Array.from(
    new Set(activities.map((a) => a.activity_type)),
  );

  const getActivityIcon = (type: string) => {
    const IconComponent =
      activityIcons[type as keyof typeof activityIcons] ||
      activityIcons.default;
    return IconComponent;
  };

  const getActivityColor = (type: string) => {
    return (
      activityColors[type as keyof typeof activityColors] ||
      activityColors.default
    );
  };

  const formatActivityTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours =
      Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return format(date, 'h:mm a');
    } else if (diffInHours < 168) {
      // 7 days
      return format(date, 'EEE h:mm a');
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  return (
    <div className="space-y-4" data-testid="activity-feed">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshActivities}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="p-4 border border-gray-200">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filterType === 'all'
                  ? 'bg-primary-100 text-primary-700 border border-primary-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              All Activities
            </button>
            {activityTypes.map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  filterType === type
                    ? 'bg-primary-100 text-primary-700 border border-primary-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                {type
                  .replace('_', ' ')
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Activity List */}
      <div className="space-y-3">
        {filteredActivities.length === 0 ? (
          <Card className="p-8 text-center border border-gray-200">
            <Clock className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No activity yet
            </h3>
            <p className="text-gray-500">
              {filterType === 'all'
                ? 'Client activity will appear here as it happens'
                : `No ${filterType.replace('_', ' ')} activities found`}
            </p>
          </Card>
        ) : (
          filteredActivities.map((activity, index) => {
            const Icon = getActivityIcon(activity.activity_type);
            const colorClass = getActivityColor(activity.activity_type);

            return (
              <div key={activity.id} className="flex gap-4">
                {/* Timeline Line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${colorClass}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {index < filteredActivities.length - 1 && (
                    <div className="w-0.5 h-6 bg-gray-200 mt-2" />
                  )}
                </div>

                {/* Activity Content */}
                <div className="flex-1 min-w-0">
                  <Card className="p-4 border border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 mb-1">
                          {activity.activity_title}
                        </h4>
                        {activity.activity_description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {activity.activity_description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{formatActivityTime(activity.created_at)}</span>
                          {activity.performed_by_name && (
                            <span>by {activity.performed_by_name}</span>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {activity.activity_type.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      {/* Activity Metadata */}
                      {activity.metadata && (
                        <div className="flex-shrink-0 text-right">
                          {activity.metadata.status && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                activity.metadata.status === 'success'
                                  ? 'text-green-600 border-green-200'
                                  : activity.metadata.status === 'failed'
                                    ? 'text-red-600 border-red-200'
                                    : 'text-gray-600 border-gray-200'
                              }`}
                            >
                              {activity.metadata.status}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Load More */}
      {filteredActivities.length >= 10 && (
        <div className="text-center pt-4">
          <Button
            variant="outline"
            onClick={refreshActivities}
            disabled={isLoading}
          >
            Load More Activities
          </Button>
        </div>
      )}
    </div>
  );
}
