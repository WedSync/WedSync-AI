'use client';

/**
 * WS-342 Collaboration Presence - Real-time User Activity Indicators
 * Team A - Frontend/UI Development - Presence System
 *
 * Real-time presence indicators showing who's online, active, and what
 * they're currently working on in the wedding collaboration workspace
 */

import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Collaborator,
  CollaboratorPresence,
  PresenceStatus,
  UserActivity,
  ActivityType,
} from '@/types/collaboration';

// Icons
import {
  Users,
  Eye,
  Edit,
  MessageCircle,
  Calendar,
  FileText,
  Camera,
  Heart,
  Zap,
  Clock,
  Wifi,
  WifiOff,
} from 'lucide-react';

// UI Components
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface CollaborationPresenceProps {
  weddingId: string;
  collaborators: Collaborator[];
  presenceData: CollaboratorPresence[];
  currentUserId: string;
  onPresenceUpdate?: (presence: Partial<CollaboratorPresence>) => void;
  showDetailedActivity?: boolean;
  compactMode?: boolean;
  maxVisible?: number;
  className?: string;
}

export function CollaborationPresence({
  weddingId,
  collaborators,
  presenceData,
  currentUserId,
  onPresenceUpdate,
  showDetailedActivity = false,
  compactMode = false,
  maxVisible = 8,
  className,
}: CollaborationPresenceProps) {
  const [expandedActivity, setExpandedActivity] = useState(false);

  // Combine collaborator data with presence data
  const enrichedPresence = useMemo(() => {
    return collaborators.map((collaborator) => {
      const presence = presenceData.find(
        (p) => p.userId === collaborator.id,
      ) || {
        userId: collaborator.id,
        weddingId,
        status: PresenceStatus.OFFLINE,
        lastSeen: new Date(),
        currentSection: null,
        activities: [],
      };

      return {
        collaborator,
        presence,
      };
    });
  }, [collaborators, presenceData, weddingId]);

  // Filter by online status and sort by activity
  const onlineUsers = useMemo(() => {
    return enrichedPresence
      .filter(({ presence }) => presence.status !== PresenceStatus.OFFLINE)
      .sort((a, b) => {
        // Sort by status priority (online > away > idle)
        const statusPriority = {
          [PresenceStatus.ONLINE]: 3,
          [PresenceStatus.AWAY]: 2,
          [PresenceStatus.IDLE]: 1,
          [PresenceStatus.OFFLINE]: 0,
        };

        return (
          statusPriority[b.presence.status] - statusPriority[a.presence.status]
        );
      });
  }, [enrichedPresence]);

  // Recent activities across all users
  const recentActivities = useMemo(() => {
    const allActivities: (UserActivity & { collaborator: Collaborator })[] = [];

    enrichedPresence.forEach(({ collaborator, presence }) => {
      if (presence.activities) {
        presence.activities.forEach((activity) => {
          allActivities.push({ ...activity, collaborator });
        });
      }
    });

    return allActivities
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 10);
  }, [enrichedPresence]);

  const getStatusColor = (status: PresenceStatus) => {
    switch (status) {
      case PresenceStatus.ONLINE:
        return 'bg-green-500';
      case PresenceStatus.AWAY:
        return 'bg-yellow-500';
      case PresenceStatus.IDLE:
        return 'bg-gray-400';
      case PresenceStatus.OFFLINE:
        return 'bg-gray-300';
      default:
        return 'bg-gray-300';
    }
  };

  const getActivityIcon = (activityType: ActivityType) => {
    switch (activityType) {
      case ActivityType.VIEWING:
        return <Eye className="w-3 h-3" />;
      case ActivityType.EDITING:
        return <Edit className="w-3 h-3" />;
      case ActivityType.COMMENTING:
        return <MessageCircle className="w-3 h-3" />;
      case ActivityType.UPLOADING:
        return <Camera className="w-3 h-3" />;
      case ActivityType.TIMELINE_UPDATE:
        return <Calendar className="w-3 h-3" />;
      case ActivityType.TASK_UPDATE:
        return <FileText className="w-3 h-3" />;
      default:
        return <Zap className="w-3 h-3" />;
    }
  };

  const getActivityDescription = (
    activity: UserActivity,
    collaboratorName: string,
  ) => {
    const timeAgo = getTimeAgo(activity.timestamp);

    switch (activity.type) {
      case ActivityType.VIEWING:
        return `${collaboratorName} is viewing ${activity.details?.section || 'content'} ${timeAgo}`;
      case ActivityType.EDITING:
        return `${collaboratorName} is editing ${activity.details?.item || 'content'} ${timeAgo}`;
      case ActivityType.COMMENTING:
        return `${collaboratorName} added a comment ${timeAgo}`;
      case ActivityType.UPLOADING:
        return `${collaboratorName} uploaded ${activity.details?.fileType || 'file'} ${timeAgo}`;
      case ActivityType.TIMELINE_UPDATE:
        return `${collaboratorName} updated timeline ${timeAgo}`;
      case ActivityType.TASK_UPDATE:
        return `${collaboratorName} updated task ${timeAgo}`;
      default:
        return `${collaboratorName} was active ${timeAgo}`;
    }
  };

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Compact mode - just avatars with status
  if (compactMode) {
    const visibleUsers = onlineUsers.slice(0, maxVisible);
    const remainingCount = Math.max(0, onlineUsers.length - maxVisible);

    return (
      <div className={cn('flex items-center space-x-1', className)}>
        {visibleUsers.map(({ collaborator, presence }) => (
          <TooltipProvider key={collaborator.id}>
            <Tooltip>
              <TooltipTrigger>
                <div className="relative">
                  <Avatar className="w-8 h-8 ring-2 ring-white">
                    <AvatarImage src={collaborator.avatar} />
                    <AvatarFallback className="text-xs">
                      {collaborator.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
                      getStatusColor(presence.status),
                    )}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <p className="font-medium">{collaborator.name}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {presence.status}
                  </p>
                  {presence.currentSection && (
                    <p className="text-xs">
                      Working on: {presence.currentSection}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}

        {remainingCount > 0 && (
          <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
            +{remainingCount}
          </div>
        )}

        {onlineUsers.length === 0 && (
          <div className="flex items-center text-gray-500">
            <WifiOff className="w-4 h-4 mr-1" />
            <span className="text-sm">No one online</span>
          </div>
        )}
      </div>
    );
  }

  // Full presence panel
  return (
    <div
      className={cn('collaboration-presence', className)}
      data-testid="collaboration-presence"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Online Now</h3>
          {onlineUsers.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {onlineUsers.length}
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-1 text-green-600">
          <Wifi className="w-4 h-4" />
          <span className="text-xs font-medium">Connected</span>
        </div>
      </div>

      {/* Online Users */}
      <div className="space-y-3 mb-6">
        {onlineUsers.map(({ collaborator, presence }) => {
          const isCurrentUser = collaborator.id === currentUserId;
          const latestActivity = presence.activities?.[0];

          return (
            <div key={collaborator.id} className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={collaborator.avatar} />
                  <AvatarFallback>
                    {collaborator.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white',
                    getStatusColor(presence.status),
                  )}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="font-medium text-gray-900 truncate">
                    {collaborator.name}
                    {isCurrentUser && (
                      <span className="text-xs text-gray-500 ml-1">(you)</span>
                    )}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs capitalize',
                      presence.status === PresenceStatus.ONLINE &&
                        'border-green-500 text-green-700',
                      presence.status === PresenceStatus.AWAY &&
                        'border-yellow-500 text-yellow-700',
                      presence.status === PresenceStatus.IDLE &&
                        'border-gray-500 text-gray-700',
                    )}
                  >
                    {presence.status}
                  </Badge>
                </div>

                {presence.currentSection && (
                  <div className="flex items-center space-x-1 mt-1">
                    <span className="text-xs text-gray-600">Working on:</span>
                    <span className="text-xs font-medium text-gray-900">
                      {presence.currentSection}
                    </span>
                  </div>
                )}

                {latestActivity && (
                  <div className="flex items-center space-x-1 mt-1 text-xs text-gray-500">
                    {getActivityIcon(latestActivity.type)}
                    <span>
                      {latestActivity.type === ActivityType.VIEWING &&
                        'Viewing'}
                      {latestActivity.type === ActivityType.EDITING &&
                        'Editing'}
                      {latestActivity.type === ActivityType.COMMENTING &&
                        'Commenting'}
                      {latestActivity.type === ActivityType.UPLOADING &&
                        'Uploading'}
                      {latestActivity.type === ActivityType.TIMELINE_UPDATE &&
                        'Timeline'}
                      {latestActivity.type === ActivityType.TASK_UPDATE &&
                        'Tasks'}
                    </span>
                    <span>•</span>
                    <span>{getTimeAgo(latestActivity.timestamp)}</span>
                  </div>
                )}
              </div>

              {collaborator.role && (
                <Badge variant="outline" className="text-xs">
                  {collaborator.role}
                </Badge>
              )}
            </div>
          );
        })}

        {onlineUsers.length === 0 && (
          <div className="text-center py-6">
            <WifiOff className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">
              No one else is online right now
            </p>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {showDetailedActivity && recentActivities.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Recent Activity</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedActivity(!expandedActivity)}
            >
              {expandedActivity ? 'Show Less' : 'Show All'}
            </Button>
          </div>

          <div className="space-y-2">
            {(expandedActivity
              ? recentActivities
              : recentActivities.slice(0, 3)
            ).map((activity, index) => (
              <div
                key={`${activity.collaborator.id}-${index}`}
                className="flex items-center space-x-2 text-sm"
              >
                <div className="text-gray-400">
                  {getActivityIcon(activity.type)}
                </div>
                <p className="text-gray-600 text-xs">
                  {getActivityDescription(activity, activity.collaborator.name)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Offline Users (if space allows) */}
      {!compactMode && enrichedPresence.length > onlineUsers.length && (
        <div className="mt-6 pt-4 border-t">
          <h4 className="font-medium text-gray-700 mb-3">Offline</h4>
          <div className="grid grid-cols-1 gap-2">
            {enrichedPresence
              .filter(
                ({ presence }) => presence.status === PresenceStatus.OFFLINE,
              )
              .slice(0, 3)
              .map(({ collaborator, presence }) => (
                <div
                  key={collaborator.id}
                  className="flex items-center space-x-2"
                >
                  <Avatar className="w-6 h-6 opacity-60">
                    <AvatarImage src={collaborator.avatar} />
                    <AvatarFallback className="text-xs">
                      {collaborator.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-500 truncate">
                    {collaborator.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {getTimeAgo(presence.lastSeen)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CollaborationPresence;
