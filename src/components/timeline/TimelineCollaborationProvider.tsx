// =====================================================
// TIMELINE COLLABORATION PROVIDER
// =====================================================
// Real-time collaboration features for timeline editing
// Includes cursor tracking, presence awareness, and live updates
// Feature ID: WS-160 - Timeline Builder UI
// Created: 2025-01-20
// =====================================================

'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useRef,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MessageCircle, Eye, Edit3, Users } from 'lucide-react';
import type {
  TimelineEvent,
  RealtimePresence,
  RealtimeUpdate,
  TimelineComment,
} from '@/types/timeline';
import { useTimelineRealtime } from '@/hooks/useTimelineRealtime';

// =====================================================
// COLLABORATION CONTEXT TYPES
// =====================================================

interface CollaborationContextType {
  // Presence & Users
  presenceData: RealtimePresence[];
  currentUser?: RealtimePresence;
  activeUsers: RealtimePresence[];
  isConnected: boolean;
  connectionError: string | null;

  // Cursor & Selection
  updateCursorPosition: (position: { x: number; y: number }) => void;
  updateSelectedEvent: (eventId?: string) => void;
  updateEditingStatus: (isEditing: boolean, eventId?: string) => void;

  // Live Updates
  sendUpdate: (update: Partial<RealtimeUpdate>) => void;
  subscribeToUpdates: (
    callback: (update: RealtimeUpdate) => void,
  ) => () => void;

  // Comments & Feedback
  addComment: (eventId: string, comment: string, parentId?: string) => void;
  resolveComment: (commentId: string) => void;

  // Conflict Resolution
  resolveConflict: (
    conflictId: string,
    resolution: 'accept' | 'reject',
    data?: any,
  ) => void;

  // Activity Tracking
  trackActivity: (action: string, details?: any) => void;
}

interface CollaborationProviderProps {
  timelineId: string;
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  children: React.ReactNode;
}

interface CursorPosition {
  x: number;
  y: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: number;
}

// =====================================================
// COLLABORATION CONTEXT
// =====================================================

const CollaborationContext = createContext<CollaborationContextType | null>(
  null,
);

export const useTimelineCollaboration = () => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error(
      'useTimelineCollaboration must be used within TimelineCollaborationProvider',
    );
  }
  return context;
};

// =====================================================
// MAIN PROVIDER COMPONENT
// =====================================================

export function TimelineCollaborationProvider({
  timelineId,
  currentUserId = 'current_user',
  currentUserName = 'Current User',
  currentUserAvatar,
  children,
}: CollaborationProviderProps) {
  // =====================================================
  // STATE & REFS
  // =====================================================

  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(
    new Map(),
  );
  const [comments, setComments] = useState<TimelineComment[]>([]);
  const [activityLog, setActivityLog] = useState<RealtimeUpdate[]>([]);

  const cursorUpdateTimeoutRef = useRef<NodeJS.Timeout>();
  const lastCursorPositionRef = useRef<{ x: number; y: number } | null>(null);

  // =====================================================
  // REALTIME HOOK INTEGRATION
  // =====================================================

  const {
    presenceData,
    sendUpdate,
    subscribeToUpdates,
    isConnected,
    connectionError,
  } = useTimelineRealtime(timelineId);

  // =====================================================
  // COMPUTED VALUES
  // =====================================================

  const currentUser = presenceData.find((p) => p.user_id === currentUserId);
  const activeUsers = presenceData.filter(
    (p) =>
      p.user_id !== currentUserId &&
      Date.now() - new Date(p.last_activity).getTime() < 300000, // 5 minutes
  );

  // =====================================================
  // CURSOR & PRESENCE MANAGEMENT
  // =====================================================

  const updateCursorPosition = useCallback(
    (position: { x: number; y: number }) => {
      lastCursorPositionRef.current = position;

      // Throttle cursor updates to avoid spam
      if (cursorUpdateTimeoutRef.current) {
        clearTimeout(cursorUpdateTimeoutRef.current);
      }

      cursorUpdateTimeoutRef.current = setTimeout(() => {
        if (lastCursorPositionRef.current) {
          // Update local cursor immediately for responsiveness
          setCursors(
            (prev) =>
              new Map(
                prev.set(currentUserId, {
                  x: position.x,
                  y: position.y,
                  userId: currentUserId,
                  userName: currentUserName,
                  userAvatar: currentUserAvatar,
                  timestamp: Date.now(),
                }),
              ),
          );

          // Send to other users
          sendUpdate({
            type: 'cursor_move',
            payload: {
              cursor_position: position,
              user_id: currentUserId,
              user_name: currentUserName,
              user_avatar: currentUserAvatar,
            },
          });
        }
      }, 50); // 50ms throttle for smooth cursor movement
    },
    [currentUserId, currentUserName, currentUserAvatar, sendUpdate],
  );

  const updateSelectedEvent = useCallback(
    (eventId?: string) => {
      sendUpdate({
        type: 'event_select',
        payload: {
          selected_event_id: eventId,
          user_id: currentUserId,
          user_name: currentUserName,
        },
      });
    },
    [currentUserId, currentUserName, sendUpdate],
  );

  const updateEditingStatus = useCallback(
    (isEditing: boolean, eventId?: string) => {
      sendUpdate({
        type: 'editing_status',
        payload: {
          is_editing: isEditing,
          selected_event_id: eventId,
          user_id: currentUserId,
          user_name: currentUserName,
        },
      });
    },
    [currentUserId, currentUserName, sendUpdate],
  );

  // =====================================================
  // COMMENTS MANAGEMENT
  // =====================================================

  const addComment = useCallback(
    (eventId: string, comment: string, parentId?: string) => {
      const newComment: Partial<TimelineComment> = {
        timeline_id: timelineId,
        event_id: eventId,
        comment,
        parent_comment_id: parentId,
        user_id: currentUserId,
        user_name: currentUserName,
        is_resolved: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      sendUpdate({
        type: 'comment_added',
        payload: newComment,
      });

      // Update local state optimistically
      setComments((prev) => [...prev, newComment as TimelineComment]);
    },
    [timelineId, currentUserId, currentUserName, sendUpdate],
  );

  const resolveComment = useCallback(
    (commentId: string) => {
      sendUpdate({
        type: 'comment_resolved',
        payload: {
          comment_id: commentId,
          resolved_by: currentUserId,
          resolved_at: new Date().toISOString(),
        },
      });

      // Update local state
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                is_resolved: true,
                resolved_by: currentUserId,
                resolved_at: new Date().toISOString(),
              }
            : comment,
        ),
      );
    },
    [currentUserId, sendUpdate],
  );

  // =====================================================
  // CONFLICT RESOLUTION
  // =====================================================

  const resolveConflict = useCallback(
    (conflictId: string, resolution: 'accept' | 'reject', data?: any) => {
      sendUpdate({
        type: 'conflict_resolved',
        payload: {
          conflict_id: conflictId,
          resolution,
          resolution_data: data,
          resolved_by: currentUserId,
          resolved_at: new Date().toISOString(),
        },
      });

      trackActivity('conflict_resolved', { conflictId, resolution });
    },
    [currentUserId, sendUpdate],
  );

  // =====================================================
  // ACTIVITY TRACKING
  // =====================================================

  const trackActivity = useCallback(
    (action: string, details?: any) => {
      const activity: RealtimeUpdate = {
        type: 'activity_logged',
        payload: {
          action,
          details,
          user_id: currentUserId,
          user_name: currentUserName,
          timestamp: new Date().toISOString(),
        },
        user_id: currentUserId,
        timestamp: new Date().toISOString(),
      };

      setActivityLog((prev) => [activity, ...prev.slice(0, 49)]); // Keep last 50 activities
      sendUpdate(activity);
    },
    [currentUserId, currentUserName, sendUpdate],
  );

  // =====================================================
  // REALTIME UPDATE HANDLING
  // =====================================================

  useEffect(() => {
    const unsubscribe = subscribeToUpdates((update: RealtimeUpdate) => {
      switch (update.type) {
        case 'cursor_move':
          if (
            update.user_id !== currentUserId &&
            update.payload.cursor_position
          ) {
            setCursors(
              (prev) =>
                new Map(
                  prev.set(update.user_id, {
                    x: update.payload.cursor_position.x,
                    y: update.payload.cursor_position.y,
                    userId: update.user_id,
                    userName: update.payload.user_name || 'Unknown User',
                    userAvatar: update.payload.user_avatar,
                    timestamp: Date.now(),
                  }),
                ),
            );
          }
          break;

        case 'comment_added':
          if (update.user_id !== currentUserId) {
            setComments((prev) => [...prev, update.payload as TimelineComment]);
          }
          break;

        case 'comment_resolved':
          if (update.user_id !== currentUserId) {
            setComments((prev) =>
              prev.map((comment) =>
                comment.id === update.payload.comment_id
                  ? { ...comment, is_resolved: true, ...update.payload }
                  : comment,
              ),
            );
          }
          break;

        case 'activity_logged':
          if (update.user_id !== currentUserId) {
            setActivityLog((prev) => [update, ...prev.slice(0, 49)]);
          }
          break;
      }
    });

    return unsubscribe;
  }, [subscribeToUpdates, currentUserId]);

  // =====================================================
  // CURSOR CLEANUP
  // =====================================================

  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        const updated = new Map(prev);
        for (const [userId, cursor] of updated) {
          if (now - cursor.timestamp > 10000) {
            // Remove cursors older than 10s
            updated.delete(userId);
          }
        }
        return updated;
      });
    }, 5000);

    return () => clearInterval(cleanup);
  }, []);

  // =====================================================
  // CONTEXT VALUE
  // =====================================================

  const contextValue: CollaborationContextType = {
    presenceData,
    currentUser,
    activeUsers,
    isConnected,
    connectionError,
    updateCursorPosition,
    updateSelectedEvent,
    updateEditingStatus,
    sendUpdate,
    subscribeToUpdates,
    addComment,
    resolveComment,
    resolveConflict,
    trackActivity,
  };

  return (
    <CollaborationContext.Provider value={contextValue}>
      <div className="relative">
        {children}

        {/* Render Cursors */}
        <CursorOverlay cursors={Array.from(cursors.values())} />

        {/* Collaboration Status Bar */}
        <CollaborationStatusBar
          activeUsers={activeUsers}
          isConnected={isConnected}
          connectionError={connectionError}
        />
      </div>
    </CollaborationContext.Provider>
  );
}

// =====================================================
// CURSOR OVERLAY COMPONENT
// =====================================================

interface CursorOverlayProps {
  cursors: CursorPosition[];
}

function CursorOverlay({ cursors }: CursorOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      <AnimatePresence>
        {cursors.map((cursor) => (
          <motion.div
            key={cursor.userId}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: cursor.x,
              y: cursor.y,
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute transform -translate-x-1 -translate-y-1"
          >
            {/* Cursor */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              className="drop-shadow-lg"
            >
              <path
                d="M2 2l16 6-6 2-2 6z"
                fill="#3B82F6"
                stroke="white"
                strokeWidth="1"
              />
            </svg>

            {/* User Info */}
            <div className="absolute top-5 left-5 px-2 py-1 bg-blue-600 text-white text-xs rounded-md whitespace-nowrap shadow-lg">
              <div className="flex items-center space-x-1">
                {cursor.userAvatar ? (
                  <img
                    src={cursor.userAvatar}
                    alt={cursor.userName}
                    className="w-4 h-4 rounded-full"
                  />
                ) : (
                  <User className="w-3 h-3" />
                )}
                <span>{cursor.userName}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// =====================================================
// COLLABORATION STATUS BAR
// =====================================================

interface CollaborationStatusBarProps {
  activeUsers: RealtimePresence[];
  isConnected: boolean;
  connectionError: string | null;
}

function CollaborationStatusBar({
  activeUsers,
  isConnected,
  connectionError,
}: CollaborationStatusBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isConnected && !connectionError) return null;

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-4 right-4 z-50"
    >
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        {/* Main Status Bar */}
        <div
          className="flex items-center space-x-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div
            className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
          />

          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">
              {activeUsers.length}{' '}
              {activeUsers.length === 1 ? 'person' : 'people'} editing
            </span>
          </div>

          {/* Active User Avatars */}
          <div className="flex -space-x-1">
            {activeUsers.slice(0, 3).map((user) => (
              <div
                key={user.user_id}
                className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-700 overflow-hidden"
                title={user.user_name}
              >
                {user.user_avatar ? (
                  <img
                    src={user.user_avatar}
                    alt={user.user_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user.user_name.charAt(0).toUpperCase()
                )}
              </div>
            ))}
            {activeUsers.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-gray-500 border-2 border-white flex items-center justify-center text-xs font-medium text-white">
                +{activeUsers.length - 3}
              </div>
            )}
          </div>
        </div>

        {/* Expanded Panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-200"
            >
              <div className="px-4 py-3 space-y-3">
                {/* Connection Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Connection</span>
                  <span
                    className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>

                {connectionError && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {connectionError}
                  </div>
                )}

                {/* Active Users List */}
                {activeUsers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Currently Editing
                    </h4>
                    <div className="space-y-2">
                      {activeUsers.map((user) => (
                        <div
                          key={user.user_id}
                          className="flex items-center space-x-2"
                        >
                          <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-700 overflow-hidden">
                            {user.user_avatar ? (
                              <img
                                src={user.user_avatar}
                                alt={user.user_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              user.user_name.charAt(0).toUpperCase()
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {user.user_name}
                            </p>
                            {user.is_editing && user.selected_event_id && (
                              <p className="text-xs text-gray-500 flex items-center">
                                <Edit3 className="w-3 h-3 mr-1" />
                                Editing event
                              </p>
                            )}
                          </div>

                          <div
                            className={`w-2 h-2 rounded-full ${user.is_editing ? 'bg-orange-500' : 'bg-green-500'}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
