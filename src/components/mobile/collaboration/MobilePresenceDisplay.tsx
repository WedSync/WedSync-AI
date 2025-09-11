'use client';

/**
 * MobilePresenceDisplay - Mobile-optimized user presence for collaborative editing
 * WS-244 Team D - Mobile-First Real-Time Collaboration System
 *
 * Features:
 * - Compact avatar display optimized for mobile screens
 * - Real-time presence indicators with smooth animations
 * - Touch-friendly user interactions and tooltips
 * - Collaborative cursor position indicators
 * - Wedding-specific user role badges (couple, family, planner, etc.)
 * - Responsive overflow handling with "show more" functionality
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  User,
  Crown,
  Heart,
  Calendar,
  Users,
  ChevronRight,
  ChevronDown,
  Dot,
  Clock,
} from 'lucide-react';

interface CollaborationUser {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  role?: 'couple' | 'family' | 'planner' | 'vendor' | 'admin';
  isActive: boolean;
  lastSeen: Date;
  cursor?: {
    line: number;
    column: number;
  } | null;
  isTyping?: boolean;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
}

interface MobilePresenceDisplayProps {
  users: CollaborationUser[];
  currentUserId?: string;
  maxVisible?: number;
  showCursors?: boolean;
  showRoles?: boolean;
  compact?: boolean;
  onUserClick?: (user: CollaborationUser) => void;
  className?: string;
}

// Wedding-specific role configurations
const roleConfig = {
  couple: {
    icon: Heart,
    label: 'Couple',
    color: 'text-primary-600',
    bgColor: 'bg-primary-50',
    borderColor: 'border-primary-200',
  },
  family: {
    icon: Users,
    label: 'Family',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  planner: {
    icon: Calendar,
    label: 'Planner',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  vendor: {
    icon: Crown,
    label: 'Vendor',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  admin: {
    icon: Crown,
    label: 'Admin',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
};

export function MobilePresenceDisplay({
  users = [],
  currentUserId,
  maxVisible = 5,
  showCursors = true,
  showRoles = true,
  compact = false,
  onUserClick,
  className,
}: MobilePresenceDisplayProps) {
  const [showAll, setShowAll] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Filter and sort users
  const { activeUsers, inactiveUsers, currentUser } = useMemo(() => {
    const current = users.find((u) => u.id === currentUserId);
    const others = users.filter((u) => u.id !== currentUserId);
    const active = others.filter((u) => u.isActive);
    const inactive = others.filter((u) => !u.isActive);

    return {
      activeUsers: active.sort((a, b) => {
        // Sort by role importance, then by last activity
        const roleOrder = ['couple', 'planner', 'family', 'vendor', 'admin'];
        const aRole = roleOrder.indexOf(a.role || 'admin');
        const bRole = roleOrder.indexOf(b.role || 'admin');

        if (aRole !== bRole) return aRole - bRole;
        return b.lastSeen.getTime() - a.lastSeen.getTime();
      }),
      inactiveUsers: inactive.sort(
        (a, b) => b.lastSeen.getTime() - a.lastSeen.getTime(),
      ),
      currentUser: current,
    };
  }, [users, currentUserId]);

  // Calculate display users
  const displayUsers = useMemo(() => {
    const allUsers = [...activeUsers, ...inactiveUsers];
    return showAll ? allUsers : allUsers.slice(0, maxVisible);
  }, [activeUsers, inactiveUsers, showAll, maxVisible]);

  const hiddenCount = Math.max(
    0,
    activeUsers.length + inactiveUsers.length - maxVisible,
  );

  // Handle user interaction
  const handleUserClick = useCallback(
    (user: CollaborationUser) => {
      if (compact) {
        setExpandedUser(expandedUser === user.id ? null : user.id);
      }
      onUserClick?.(user);
    },
    [compact, expandedUser, onUserClick],
  );

  // Format last seen time
  const formatLastSeen = useCallback((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  }, []);

  // Render user avatar with presence indicator
  const renderUserAvatar = useCallback(
    (user: CollaborationUser, size: 'sm' | 'md' | 'lg' = 'md') => {
      const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
      };

      const textSizes = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      };

      const roleInfo = user.role ? roleConfig[user.role] : null;
      const RoleIcon = roleInfo?.icon;

      return (
        <div className="relative">
          <div
            className={cn(
              'relative rounded-full overflow-hidden border-2 transition-all duration-200',
              sizeClasses[size],
              user.isActive
                ? 'border-success-400 shadow-sm'
                : 'border-gray-300',
              user.isTyping && 'ring-2 ring-primary-400 ring-offset-1',
            )}
            style={{ borderColor: user.isActive ? user.color : undefined }}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div
                className={cn(
                  'w-full h-full flex items-center justify-center text-white font-semibold',
                  textSizes[size],
                )}
                style={{ backgroundColor: user.color }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Online status indicator */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
              user.isActive ? 'bg-success-500' : 'bg-gray-400',
            )}
          />

          {/* Role badge */}
          {showRoles && roleInfo && RoleIcon && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                'absolute -top-1 -right-1 w-5 h-5 rounded-full border border-white',
                'flex items-center justify-center',
                roleInfo.bgColor,
                roleInfo.borderColor,
              )}
            >
              <RoleIcon className={cn('w-2.5 h-2.5', roleInfo.color)} />
            </motion.div>
          )}

          {/* Typing indicator */}
          {user.isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -bottom-6 left-1/2 transform -translate-x-1/2"
            >
              <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap">
                typing...
              </div>
            </motion.div>
          )}
        </div>
      );
    },
    [showRoles],
  );

  // Render compact user list
  const renderCompactView = () => (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {displayUsers.slice(0, 3).map((user) => (
          <motion.button
            key={user.id}
            onClick={() => handleUserClick(user)}
            className="relative"
            whileTap={{ scale: 0.95 }}
            data-testid={`user-avatar-${user.id}`}
          >
            {renderUserAvatar(user, 'sm')}
          </motion.button>
        ))}
      </div>

      {hiddenCount > 0 && (
        <motion.button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          whileTap={{ scale: 0.95 }}
        >
          {showAll ? (
            <>
              Show less
              <ChevronDown className="w-3 h-3" />
            </>
          ) : (
            <>
              +{hiddenCount} more
              <ChevronRight className="w-3 h-3" />
            </>
          )}
        </motion.button>
      )}
    </div>
  );

  // Render expanded user list
  const renderExpandedView = () => (
    <div className="space-y-2">
      {/* Active users */}
      {activeUsers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Dot className="w-4 h-4 text-success-500" />
            <span className="text-xs font-medium text-success-600">
              Active ({activeUsers.length})
            </span>
          </div>
          <div className="space-y-1">
            {activeUsers.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg transition-colors',
                  'hover:bg-gray-50 cursor-pointer',
                )}
                onClick={() => handleUserClick(user)}
                data-testid={`user-item-${user.id}`}
              >
                {renderUserAvatar(user)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">
                      {user.name}
                    </span>
                    {user.role && (
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded-full text-xs font-medium',
                          roleConfig[user.role]?.bgColor,
                          roleConfig[user.role]?.color,
                        )}
                      >
                        {roleConfig[user.role]?.label}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {user.deviceType && (
                      <span className="capitalize">{user.deviceType}</span>
                    )}
                    {showCursors && user.cursor && (
                      <span>Line {user.cursor.line + 1}</span>
                    )}
                    <span>Last seen {formatLastSeen(user.lastSeen)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Inactive users */}
      {inactiveUsers.length > 0 && activeUsers.length > 0 && (
        <div className="border-t border-gray-100 pt-2">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">
              Recently active ({inactiveUsers.length})
            </span>
          </div>
          <div className="space-y-1">
            {inactiveUsers.slice(0, showAll ? undefined : 3).map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg transition-colors opacity-75',
                  'hover:bg-gray-50 hover:opacity-100 cursor-pointer',
                )}
                onClick={() => handleUserClick(user)}
                data-testid={`user-item-${user.id}`}
              >
                {renderUserAvatar(user, 'sm')}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700 truncate">
                      {user.name}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Last seen {formatLastSeen(user.lastSeen)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {!showAll && inactiveUsers.length > 3 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full mt-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Show {inactiveUsers.length - 3} more
            </button>
          )}
        </div>
      )}
    </div>
  );

  // Don't render if no users
  if (users.length === 0) return null;

  return (
    <div
      className={cn(
        'mobile-presence-display',
        compact
          ? 'bg-transparent'
          : 'bg-white border border-gray-200 rounded-xl p-3',
        className,
      )}
      data-testid="mobile-presence-display"
    >
      {/* Header (non-compact only) */}
      {!compact && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-600" />
            <span className="font-medium text-gray-900">
              Active in document
            </span>
          </div>

          {users.length > maxVisible && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              {showAll ? 'Show less' : 'Show all'}
            </button>
          )}
        </div>
      )}

      {/* User list */}
      <div>{compact ? renderCompactView() : renderExpandedView()}</div>

      {/* Current user indicator (non-compact only) */}
      {!compact && currentUser && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>You are:</span>
            <div className="flex items-center gap-2">
              {renderUserAvatar(currentUser, 'sm')}
              <span className="font-medium text-gray-700">
                {currentUser.name}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
