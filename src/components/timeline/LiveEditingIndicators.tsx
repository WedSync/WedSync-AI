// =====================================================
// LIVE EDITING INDICATORS COMPONENT
// =====================================================
// Visual indicators for real-time collaborative editing
// Shows who's editing what in real-time
// Feature ID: WS-160 - Timeline Builder UI
// Created: 2025-01-20
// =====================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Edit3,
  Eye,
  User,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
} from 'lucide-react';
import type { TimelineEvent, RealtimePresence } from '@/types/timeline';
import { useTimelineCollaboration } from './TimelineCollaborationProvider';

// =====================================================
// COMPONENT TYPES
// =====================================================

interface LiveEditingIndicatorsProps {
  event: TimelineEvent;
  className?: string;
}

interface EditingBadgeProps {
  user: RealtimePresence;
  isEditing: boolean;
  className?: string;
}

interface ConflictIndicatorProps {
  event: TimelineEvent;
  conflictCount: number;
  onResolveConflict?: (eventId: string) => void;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function LiveEditingIndicators({
  event,
  className = '',
}: LiveEditingIndicatorsProps) {
  const {
    presenceData,
    activeUsers,
    updateSelectedEvent,
    updateEditingStatus,
    trackActivity,
  } = useTimelineCollaboration();

  // Find users interacting with this event
  const eventViewers = presenceData.filter(
    (user) => user.selected_event_id === event.id && !user.is_editing,
  );

  const eventEditors = presenceData.filter(
    (user) => user.selected_event_id === event.id && user.is_editing,
  );

  const hasActivity = eventViewers.length > 0 || eventEditors.length > 0;

  if (!hasActivity) return null;

  return (
    <div className={`absolute -top-2 -right-2 z-20 ${className}`}>
      <div className="flex items-center space-x-1">
        {/* Editing Indicators */}
        <AnimatePresence>
          {eventEditors.map((user) => (
            <EditingBadge key={user.user_id} user={user} isEditing={true} />
          ))}
        </AnimatePresence>

        {/* Viewing Indicators */}
        <AnimatePresence>
          {eventViewers.slice(0, 3).map((user) => (
            <EditingBadge key={user.user_id} user={user} isEditing={false} />
          ))}
        </AnimatePresence>

        {/* Overflow Indicator */}
        {eventViewers.length > 3 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="w-6 h-6 rounded-full bg-gray-500 text-white text-xs font-medium flex items-center justify-center shadow-sm"
          >
            +{eventViewers.length - 3}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// EDITING BADGE COMPONENT
// =====================================================

function EditingBadge({ user, isEditing, className = '' }: EditingBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setShowTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const badgeColor = isEditing
    ? 'bg-orange-500 text-white'
    : 'bg-blue-500 text-white';
  const icon = isEditing ? Edit3 : Eye;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`
        w-6 h-6 rounded-full ${badgeColor} shadow-sm
        flex items-center justify-center relative
        ${isEditing ? 'animate-pulse' : ''}
      `}
      >
        {user.user_avatar ? (
          <div className="w-full h-full rounded-full overflow-hidden">
            <img
              src={user.user_avatar}
              alt={user.user_name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <User className="w-3 h-3" />
        )}

        {/* Activity Indicator */}
        {isEditing && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white"
          />
        )}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50"
          >
            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
              <div className="flex items-center space-x-2">
                {React.createElement(icon, { className: 'w-3 h-3' })}
                <span>{user.user_name}</span>
                <span className="text-gray-400">•</span>
                <span
                  className={isEditing ? 'text-orange-300' : 'text-blue-300'}
                >
                  {isEditing ? 'Editing' : 'Viewing'}
                </span>
              </div>

              {/* Arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                <div className="border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// =====================================================
// LIVE ACTIVITY INDICATOR
// =====================================================

interface LiveActivityIndicatorProps {
  event: TimelineEvent;
  className?: string;
}

export function LiveActivityIndicator({
  event,
  className = '',
}: LiveActivityIndicatorProps) {
  const { presenceData } = useTimelineCollaboration();
  const [recentActivity, setRecentActivity] = useState<string | null>(null);

  // Check for recent activity on this event
  const hasRecentActivity = presenceData.some((user) => {
    if (user.selected_event_id !== event.id) return false;
    const lastActivity = new Date(user.last_activity).getTime();
    const now = Date.now();
    return now - lastActivity < 30000; // 30 seconds
  });

  const activityTypes = {
    editing: { icon: Edit3, color: 'text-orange-500', bg: 'bg-orange-100' },
    viewing: { icon: Eye, color: 'text-blue-500', bg: 'bg-blue-100' },
    commenting: {
      icon: MessageCircle,
      color: 'text-green-500',
      bg: 'bg-green-100',
    },
  };

  if (!hasRecentActivity) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className={`absolute top-2 right-2 ${className}`}
    >
      <div className="flex items-center space-x-1">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="w-2 h-2 bg-green-500 rounded-full"
        />

        <div className="bg-white rounded-full p-1 shadow-sm border border-gray-200">
          <Zap className="w-3 h-3 text-green-500" />
        </div>
      </div>
    </motion.div>
  );
}

// =====================================================
// CONFLICT RESOLUTION INDICATOR
// =====================================================

export function ConflictIndicator({
  event,
  conflictCount,
  onResolveConflict,
}: ConflictIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (conflictCount === 0) return null;

  return (
    <div className="absolute -top-1 -left-1 z-30">
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowDetails(!showDetails)}
        className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg relative"
      >
        <AlertTriangle className="w-3 h-3" />

        {conflictCount > 1 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {conflictCount}
          </span>
        )}

        {/* Pulsing ring for urgent conflicts */}
        <motion.div
          animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-red-500"
        />
      </motion.button>

      {/* Conflict Details Tooltip */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute top-full left-0 mt-2 z-50"
          >
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-48">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="font-medium text-gray-900">
                  {conflictCount} Conflict{conflictCount > 1 ? 's' : ''}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-3">
                This event has scheduling or resource conflicts that need
                attention.
              </p>

              {onResolveConflict && (
                <button
                  onClick={() => onResolveConflict(event.id)}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Resolve Conflicts
                </button>
              )}

              {/* Arrow */}
              <div className="absolute bottom-full left-4 transform -translate-x-1/2">
                <div className="border-4 border-transparent border-b-white"></div>
                <div className="border-4 border-transparent border-b-gray-200 -mt-1"></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =====================================================
// LIVE CHANGES INDICATOR
// =====================================================

interface LiveChangesIndicatorProps {
  event: TimelineEvent;
  lastUpdated?: string;
  className?: string;
}

export function LiveChangesIndicator({
  event,
  lastUpdated,
  className = '',
}: LiveChangesIndicatorProps) {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (lastUpdated) {
      setShowAnimation(true);
      const timer = setTimeout(() => setShowAnimation(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastUpdated]);

  if (!showAnimation) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className={`absolute top-2 left-2 ${className}`}
    >
      <div className="bg-green-500 text-white rounded-full p-1.5 shadow-sm">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        >
          <CheckCircle className="w-4 h-4" />
        </motion.div>
      </div>
    </motion.div>
  );
}

// =====================================================
// COMBINED INDICATORS WRAPPER
// =====================================================

interface TimelineEventIndicatorsProps {
  event: TimelineEvent;
  conflictCount?: number;
  lastUpdated?: string;
  onResolveConflict?: (eventId: string) => void;
  className?: string;
}

export function TimelineEventIndicators({
  event,
  conflictCount = 0,
  lastUpdated,
  onResolveConflict,
  className = '',
}: TimelineEventIndicatorsProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Live Editing Indicators */}
      <LiveEditingIndicators event={event} />

      {/* Activity Indicator */}
      <LiveActivityIndicator event={event} />

      {/* Conflict Indicator */}
      <ConflictIndicator
        event={event}
        conflictCount={conflictCount}
        onResolveConflict={onResolveConflict}
      />

      {/* Recent Changes */}
      <LiveChangesIndicator event={event} lastUpdated={lastUpdated} />
    </div>
  );
}
