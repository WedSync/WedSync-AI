'use client';

/**
 * WS-244 Real-Time Collaboration System - PresenceIndicator
 * Team A - Real-time User Presence Display
 *
 * Shows active collaborators with avatars, names, and online status
 * Untitled UI design with smooth animations and mobile responsiveness
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Eye,
  Edit3,
  MessageCircle,
  Crown,
  MoreHorizontal,
} from 'lucide-react';
import {
  PresenceIndicatorProps,
  CollaboratorInfo,
  DocumentPermissions,
} from '@/types/collaboration';

/**
 * PresenceIndicator - Real-time user presence display
 *
 * Features:
 * - Avatar stack with online indicators
 * - Hover tooltips with user details
 * - Permission badges (admin, editor, viewer)
 * - Mobile-responsive layout (375px minimum)
 * - Animated entrance/exit transitions
 * - Overflow handling for many users
 */
export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  users = [],
  currentUser,
  showCursors = true,
  showAvatars = true,
  maxDisplayCount = 5,
  size = 'medium',
  className = '',
  onUserClick,
  showPermissions = true,
  showTooltips = true,
}) => {
  const [hoveredUser, setHoveredUser] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter out offline users and current user
  const activeUsers = users.filter(
    (user) => user.isOnline && user.userId !== currentUser?.id,
  );

  const displayUsers = isExpanded
    ? activeUsers
    : activeUsers.slice(0, maxDisplayCount);
  const hiddenCount = Math.max(0, activeUsers.length - maxDisplayCount);

  // Size configurations
  const sizeConfig = {
    small: {
      avatar: 'w-6 h-6',
      text: 'text-xs',
      padding: 'p-2',
      spacing: '-ml-2',
    },
    medium: {
      avatar: 'w-8 h-8',
      text: 'text-sm',
      padding: 'p-3',
      spacing: '-ml-2',
    },
    large: {
      avatar: 'w-10 h-10',
      text: 'text-base',
      padding: 'p-4',
      spacing: '-ml-3',
    },
  };

  const config = sizeConfig[size];

  // Permission icon mapping
  const getPermissionIcon = (permissions: DocumentPermissions) => {
    if (permissions.admin)
      return <Crown className="w-3 h-3 text-warning-600" />;
    if (permissions.write)
      return <Edit3 className="w-3 h-3 text-primary-600" />;
    if (permissions.comment)
      return <MessageCircle className="w-3 h-3 text-blue-600" />;
    return <Eye className="w-3 h-3 text-gray-500" />;
  };

  // Permission label mapping
  const getPermissionLabel = (permissions: DocumentPermissions) => {
    if (permissions.admin) return 'Admin';
    if (permissions.write) return 'Editor';
    if (permissions.comment) return 'Commenter';
    return 'Viewer';
  };

  // Generate user initials for avatar fallback
  const getUserInitials = (name: string, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  // Generate consistent color for user (based on user ID)
  const getUserColor = (userId: string) => {
    const colors = [
      'bg-primary-500',
      'bg-blue-500',
      'bg-success-500',
      'bg-warning-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-cyan-500',
    ];
    const hash = userId
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (activeUsers.length === 0) {
    return (
      <div className={`flex items-center ${config.padding} ${className}`}>
        <div className="flex items-center space-x-2 text-gray-500">
          <Users className="w-4 h-4" />
          <span className={`${config.text} font-medium`}>Only you</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center ${config.padding} ${className}`}
    >
      {/* Avatar Stack */}
      <div className="flex items-center">
        {displayUsers.map((user, index) => (
          <div
            key={user.userId}
            className={`relative ${config.spacing} first:ml-0`}
            style={{ zIndex: displayUsers.length - index }}
            onMouseEnter={() => showTooltips && setHoveredUser(user.userId)}
            onMouseLeave={() => setHoveredUser(null)}
            onClick={() => onUserClick?.(user)}
          >
            {/* Avatar */}
            <div
              className={`
              ${config.avatar} rounded-full border-2 border-white cursor-pointer
              transform transition-all duration-200 hover:scale-110 hover:z-50
              ${onUserClick ? 'cursor-pointer' : ''}
            `}
            >
              {showAvatars && user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className={`${config.avatar} rounded-full object-cover`}
                />
              ) : (
                <div
                  className={`
                  ${config.avatar} rounded-full flex items-center justify-center text-white font-semibold
                  ${getUserColor(user.userId)}
                `}
                >
                  <span className="text-xs">
                    {getUserInitials(user.name, user.email)}
                  </span>
                </div>
              )}

              {/* Online Indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success-500 rounded-full border-2 border-white" />

              {/* Permission Badge */}
              {showPermissions && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border border-gray-200 flex items-center justify-center">
                  {getPermissionIcon(user.permissions)}
                </div>
              )}
            </div>

            {/* Cursor Indicator (if user is actively editing) */}
            {showCursors && user.cursor && (
              <div
                className="absolute -top-1 -left-1 w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: user.cursor.color || '#9E77ED' }}
              />
            )}

            {/* Tooltip */}
            {showTooltips && hoveredUser === user.userId && (
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 z-50">
                <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap shadow-lg">
                  <div className="flex items-center space-x-2">
                    <span>{user.name || user.email}</span>
                    {showPermissions && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-300">
                          {getPermissionLabel(user.permissions)}
                        </span>
                      </>
                    )}
                  </div>
                  {user.cursor && (
                    <div className="text-gray-400 text-xs mt-1">
                      Currently editing
                    </div>
                  )}
                  {/* Tooltip Arrow */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Overflow Indicator */}
        {hiddenCount > 0 && !isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className={`
              ${config.avatar} ${config.spacing} rounded-full border-2 border-white bg-gray-100 hover:bg-gray-200
              flex items-center justify-center text-gray-600 font-semibold transition-all duration-200
              hover:scale-110 cursor-pointer
            `}
            aria-label={`Show ${hiddenCount} more collaborators`}
          >
            <span className="text-xs">+{hiddenCount}</span>
          </button>
        )}

        {/* Collapse Button */}
        {isExpanded && hiddenCount > 0 && (
          <button
            onClick={() => setIsExpanded(false)}
            className={`
              ${config.avatar} ${config.spacing} rounded-full border-2 border-white bg-gray-100 hover:bg-gray-200
              flex items-center justify-center text-gray-600 transition-all duration-200
              hover:scale-110 cursor-pointer
            `}
            aria-label="Show fewer collaborators"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* User Count */}
      <div className="ml-3 flex items-center space-x-2">
        <Users className="w-4 h-4 text-gray-500" />
        <span className={`${config.text} font-medium text-gray-700`}>
          {activeUsers.length} online
        </span>
      </div>

      {/* Mobile: Show active editors count */}
      <div className="ml-2 sm:hidden">
        {activeUsers.filter((user) => user.cursor).length > 0 && (
          <div className="flex items-center space-x-1">
            <Edit3 className="w-3 h-3 text-primary-600" />
            <span className="text-xs font-medium text-primary-600">
              {activeUsers.filter((user) => user.cursor).length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * PresenceIndicatorSimple - Minimal presence indicator for tight spaces
 */
export const PresenceIndicatorSimple: React.FC<{
  userCount: number;
  activeEditors: number;
  className?: string;
}> = ({ userCount, activeEditors, className = '' }) => {
  if (userCount === 0) return null;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Online Dot */}
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
        <span className="text-xs font-medium text-gray-600">{userCount}</span>
      </div>

      {/* Active Editors */}
      {activeEditors > 0 && (
        <>
          <span className="text-gray-400">•</span>
          <div className="flex items-center space-x-1">
            <Edit3 className="w-3 h-3 text-primary-600" />
            <span className="text-xs font-medium text-primary-600">
              {activeEditors}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default PresenceIndicator;
