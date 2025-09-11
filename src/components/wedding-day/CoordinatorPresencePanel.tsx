'use client';

import { useState, useMemo } from 'react';
import {
  Users,
  User,
  Crown,
  Shield,
  MessageCircle,
  Phone,
  MapPin,
  Clock,
  Wifi,
  WifiOff,
  UserCheck,
  UserX,
  MoreVertical,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface OnlineUser {
  user_id: string;
  coordinatorName?: string;
  role?: string;
  status?: string;
  view?: string;
  online_at?: string;
  metadata?: Record<string, any>;
}

const roleIcons = {
  lead: Crown,
  assistant: Shield,
  vendor_liaison: Users,
  emergency: Phone,
  default: User,
};

const roleColors = {
  lead: 'bg-purple-100 text-purple-800 border-purple-200',
  assistant: 'bg-blue-100 text-blue-800 border-blue-200',
  vendor_liaison: 'bg-green-100 text-green-800 border-green-200',
  emergency: 'bg-red-100 text-red-800 border-red-200',
  default: 'bg-gray-100 text-gray-800 border-gray-200',
};

const statusColors = {
  active: 'bg-green-500',
  busy: 'bg-yellow-500',
  unavailable: 'bg-red-500',
  offline: 'bg-gray-500',
};

interface CoordinatorPresencePanelProps {
  onlineUsers: Record<string, OnlineUser[]>;
  currentUser: string;
  className?: string;
}

export function CoordinatorPresencePanel({
  onlineUsers,
  currentUser,
  className,
}: CoordinatorPresencePanelProps) {
  const [showAll, setShowAll] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // Process and sort users
  const processedUsers = useMemo(() => {
    const allUsers: (OnlineUser & { isOnline: boolean; lastSeen: Date })[] = [];

    // Add online users
    Object.entries(onlineUsers).forEach(([userId, presences]) => {
      if (presences && presences.length > 0) {
        const latestPresence = presences[0]; // Most recent presence
        allUsers.push({
          ...latestPresence,
          user_id: userId,
          isOnline: true,
          lastSeen: new Date(latestPresence.online_at || Date.now()),
        });
      }
    });

    // Sort by role priority, then by online status, then by last seen
    return allUsers.sort((a, b) => {
      const roleOrder = {
        lead: 0,
        assistant: 1,
        vendor_liaison: 2,
        emergency: 3,
        default: 4,
      };
      const aRole = roleOrder[a.role as keyof typeof roleOrder] ?? 4;
      const bRole = roleOrder[b.role as keyof typeof roleOrder] ?? 4;

      if (aRole !== bRole) return aRole - bRole;
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return b.lastSeen.getTime() - a.lastSeen.getTime();
    });
  }, [onlineUsers]);

  const onlineCount = processedUsers.filter((u) => u.isOnline).length;
  const displayUsers = showAll ? processedUsers : processedUsers.slice(0, 5);

  const handleUserAction = (
    userId: string,
    action: 'message' | 'call' | 'locate',
  ) => {
    console.log(`${action} user ${userId}`);
    // Implement user actions (messaging, calling, locating)
  };

  return (
    <div className={cn('bg-white rounded-lg shadow', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-medium text-gray-900">Team Status</h3>
            <span className="text-sm text-gray-500">
              ({onlineCount} online)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600 font-medium">
                CONNECTED
              </span>
            </div>
          </div>
        </div>

        {/* Online Status Indicators */}
        <div className="flex items-center gap-1 mt-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-600">
            {onlineCount} coordinator{onlineCount !== 1 ? 's' : ''} active
          </span>
        </div>
      </div>

      {/* Users List */}
      <div className="divide-y">
        {displayUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <UserX className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">No coordinators online</p>
          </div>
        ) : (
          displayUsers.map((user) => (
            <UserCard
              key={user.user_id}
              user={user}
              isCurrentUser={user.user_id === currentUser}
              onAction={handleUserAction}
              onSelect={() =>
                setSelectedUser(
                  selectedUser === user.user_id ? null : user.user_id,
                )
              }
              isSelected={selectedUser === user.user_id}
            />
          ))
        )}
      </div>

      {/* Show More/Less */}
      {processedUsers.length > 5 && (
        <div className="p-3 border-t bg-gray-50">
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {showAll ? 'Show Less' : `Show ${processedUsers.length - 5} More`}
          </button>
        </div>
      )}

      {/* Quick Actions Bar */}
      {onlineCount > 1 && (
        <div className="p-3 border-t bg-gray-50">
          <div className="flex gap-2">
            <button className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border rounded hover:bg-gray-50 transition-colors">
              <MessageCircle className="w-3 h-3" />
              Broadcast
            </button>
            <button className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border rounded hover:bg-gray-50 transition-colors">
              <Phone className="w-3 h-3" />
              Conference
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface UserCardProps {
  user: OnlineUser & { isOnline: boolean; lastSeen: Date };
  isCurrentUser: boolean;
  onAction: (userId: string, action: 'message' | 'call' | 'locate') => void;
  onSelect: () => void;
  isSelected: boolean;
}

function UserCard({
  user,
  isCurrentUser,
  onAction,
  onSelect,
  isSelected,
}: UserCardProps) {
  const [showActions, setShowActions] = useState(false);

  const RoleIcon =
    roleIcons[user.role as keyof typeof roleIcons] || roleIcons.default;
  const roleColorClass =
    roleColors[user.role as keyof typeof roleColors] || roleColors.default;
  const statusColor =
    statusColors[user.status as keyof typeof statusColors] ||
    statusColors.offline;

  const getUserDisplayName = () => {
    if (isCurrentUser) return 'You';
    return user.coordinatorName || `Coordinator ${user.user_id.slice(-4)}`;
  };

  return (
    <div
      className={cn(
        'p-4 hover:bg-gray-50 transition-colors cursor-pointer',
        isCurrentUser && 'bg-blue-50/50',
        isSelected && 'bg-gray-100',
      )}
    >
      <div className="flex items-start justify-between" onClick={onSelect}>
        <div className="flex items-start gap-3 flex-1">
          {/* User Avatar with Status */}
          <div className="relative">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <RoleIcon className="w-5 h-5 text-gray-600" />
            </div>
            {/* Online Status Indicator */}
            <div
              className={cn(
                'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white',
                statusColor,
                user.isOnline && 'animate-pulse',
              )}
              title={user.status || (user.isOnline ? 'Online' : 'Offline')}
            />
          </div>

          <div className="flex-1 min-w-0">
            {/* Name and Role */}
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-gray-900">
                {getUserDisplayName()}
              </h4>

              {user.role && (
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                    roleColorClass,
                  )}
                >
                  {user.role.replace('_', ' ').toUpperCase()}
                </span>
              )}

              {isCurrentUser && (
                <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  YOU
                </span>
              )}
            </div>

            {/* Status and Activity */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                {user.isOnline ? (
                  <>
                    <Wifi className="w-3 h-3 text-green-600" />
                    <span className="text-green-600 font-medium">Online</span>
                    {user.view && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{user.view} view</span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-gray-500" />
                    <span>
                      Last seen{' '}
                      {formatDistanceToNow(user.lastSeen, { addSuffix: true })}
                    </span>
                  </>
                )}
              </div>

              {/* Current Location/Status */}
              {user.metadata?.location && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="w-3 h-3" />
                  <span>{user.metadata.location}</span>
                </div>
              )}

              {user.status && user.status !== 'active' && (
                <div className="flex items-center gap-1 text-xs">
                  <div className={cn('w-2 h-2 rounded-full', statusColor)} />
                  <span className="capitalize text-gray-600">
                    {user.status}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Menu */}
        {!isCurrentUser && (
          <div className="flex items-center gap-1 ml-2">
            {user.isOnline && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(user.user_id, 'message');
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                  title="Send message"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(user.user_id, 'call');
                  }}
                  className="p-1 text-gray-400 hover:text-green-600 rounded transition-colors"
                  title="Call"
                >
                  <Phone className="w-4 h-4" />
                </button>
              </>
            )}

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowActions(!showActions);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showActions && (
                <div className="absolute right-0 top-8 z-10 w-40 bg-white rounded-lg shadow-lg border py-1">
                  {user.isOnline ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAction(user.user_id, 'message');
                          setShowActions(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Send Message
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAction(user.user_id, 'call');
                          setShowActions(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Phone className="w-4 h-4" />
                        Call
                      </button>
                      {user.metadata?.location && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAction(user.user_id, 'locate');
                            setShowActions(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <MapPin className="w-4 h-4" />
                          Show Location
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      User is offline
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {isSelected && (
        <div className="mt-3 pt-3 border-t space-y-2">
          {user.metadata &&
            Object.entries(user.metadata).map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-gray-500 capitalize">
                  {key.replace('_', ' ')}:
                </span>
                <span className="text-gray-900">{String(value)}</span>
              </div>
            ))}

          {user.view && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Current View:</span>
              <span className="text-gray-900 capitalize">{user.view}</span>
            </div>
          )}

          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Last Activity:</span>
            <span className="text-gray-900">
              {formatDistanceToNow(user.lastSeen, { addSuffix: true })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
