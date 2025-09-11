'use client';

import React from 'react';
import {
  Clock,
  MessageSquare,
  Calendar,
  FileText,
  User,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  type:
    | 'message'
    | 'task'
    | 'meeting'
    | 'document'
    | 'email'
    | 'call'
    | 'milestone';
  title: string;
  description: string;
  timestamp: string;
  user: {
    name: string;
    avatar?: string;
    initials: string;
  };
  client?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'completed' | 'pending' | 'in-progress' | 'overdue';
}

interface RecentActivityProps {
  activities: Activity[];
  className?: string;
  compact?: boolean;
  maxItems?: number;
}

export function RecentActivity({
  activities,
  className,
  compact = false,
  maxItems = compact ? 5 : 10,
}: RecentActivityProps) {
  const getActivityIcon = (type: Activity['type']) => {
    const iconClass = 'w-4 h-4';
    switch (type) {
      case 'message':
        return <MessageSquare className={iconClass} />;
      case 'task':
        return <CheckCircle className={iconClass} />;
      case 'meeting':
        return <Calendar className={iconClass} />;
      case 'document':
        return <FileText className={iconClass} />;
      case 'email':
        return <Mail className={iconClass} />;
      case 'call':
        return <Phone className={iconClass} />;
      case 'milestone':
        return <AlertCircle className={iconClass} />;
      default:
        return <Clock className={iconClass} />;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'message':
        return 'bg-blue-100 text-blue-600';
      case 'task':
        return 'bg-green-100 text-green-600';
      case 'meeting':
        return 'bg-purple-100 text-purple-600';
      case 'document':
        return 'bg-orange-100 text-orange-600';
      case 'email':
        return 'bg-gray-100 text-gray-600';
      case 'call':
        return 'bg-yellow-100 text-yellow-600';
      case 'milestone':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusColor = (status?: Activity['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'in-progress':
        return 'text-blue-600';
      case 'overdue':
        return 'text-red-600';
      case 'pending':
      default:
        return 'text-gray-600';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const displayedActivities = activities.slice(0, maxItems);

  if (compact) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-sm font-medium">
            <Clock className="w-4 h-4 mr-2" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {displayedActivities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div
                className={cn(
                  'inline-flex p-1.5 rounded-full',
                  getActivityColor(activity.type),
                )}
              >
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{activity.title}</p>
                <p className="text-xs text-gray-500 truncate">
                  {activity.description}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-400">
                    {formatTimestamp(activity.timestamp)}
                  </p>
                  {activity.status && (
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        getStatusColor(activity.status),
                      )}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
          {activities.length > maxItems && (
            <p className="text-xs text-gray-500 text-center py-1">
              +{activities.length - maxItems} more activities
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedActivities.map((activity, index) => (
              <div key={activity.id} className="relative">
                {index < displayedActivities.length - 1 && (
                  <div className="absolute left-6 top-12 w-px h-8 bg-gray-200" />
                )}

                <div className="flex items-start space-x-4">
                  <div
                    className={cn(
                      'inline-flex p-2 rounded-full',
                      getActivityColor(activity.type),
                    )}
                  >
                    {getActivityIcon(activity.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">
                          {activity.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {activity.description}
                        </p>

                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <div className="flex items-center">
                            <User className="w-3 h-3 mr-1" />
                            {activity.user.name}
                          </div>

                          {activity.client && (
                            <div className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {activity.client}
                            </div>
                          )}

                          <div>{formatTimestamp(activity.timestamp)}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-3">
                        {activity.status && (
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full',
                              getStatusColor(activity.status),
                            )}
                          />
                        )}

                        <Avatar className="w-8 h-8">
                          {activity.user.avatar ? (
                            <img
                              src={activity.user.avatar}
                              alt={activity.user.name}
                            />
                          ) : (
                            <div className="flex items-center justify-center bg-gray-200 text-gray-600 text-xs">
                              {activity.user.initials}
                            </div>
                          )}
                        </Avatar>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {activities.length > maxItems && (
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-gray-500">
                  +{activities.length - maxItems} more activities from the last
                  24 hours
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Default activities for demo
export const defaultRecentActivities: Activity[] = [
  {
    id: '1',
    type: 'task',
    title: 'Venue contract signed',
    description: 'Sarah & Mike - Grand Ballroom booking confirmed',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    user: { name: 'Emma Wilson', initials: 'EW' },
    client: 'Sarah & Mike',
    status: 'completed',
  },
  {
    id: '2',
    type: 'message',
    title: 'New message from bride',
    description: 'Question about floral arrangements timing',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    user: { name: 'Jennifer Chen', initials: 'JC' },
    client: 'Lisa & David',
    status: 'pending',
  },
  {
    id: '3',
    type: 'call',
    title: 'Vendor confirmation call',
    description: 'Photographer confirmed for Saturday wedding',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    user: { name: 'Michael Brown', initials: 'MB' },
    client: 'Anna & Tom',
    status: 'completed',
  },
];
