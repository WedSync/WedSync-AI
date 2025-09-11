'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Eye,
  Edit,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle,
  UserPlus,
  UserMinus,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Real-time collaboration types
interface CollaboratorPresence {
  user_id: string;
  name: string;
  email: string;
  avatar_url?: string;
  cursor_position?: { x: number; y: number };
  selected_guest?: string;
  selected_table?: string;
  last_action?: string;
  last_seen: string;
  status: 'active' | 'idle' | 'away';
  color: string;
}

interface SeatingAction {
  id: string;
  type: 'assign' | 'unassign' | 'move' | 'optimize' | 'template_apply';
  user_id: string;
  user_name: string;
  guest_id?: string;
  guest_name?: string;
  table_id?: string;
  table_name?: string;
  from_table_id?: string;
  from_table_name?: string;
  timestamp: string;
  data?: any;
}

interface ConflictResolution {
  id: string;
  conflict_type:
    | 'concurrent_assignment'
    | 'data_divergence'
    | 'optimization_conflict';
  user1_id: string;
  user1_name: string;
  user1_action: string;
  user2_id: string;
  user2_name: string;
  user2_action: string;
  guest_id?: string;
  table_id?: string;
  timestamp: string;
  resolved?: boolean;
  resolution_strategy?: 'latest_wins' | 'manual_merge' | 'user_choice';
}

interface RealtimeCollaborationManagerProps {
  weddingId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  guests: any[];
  tables: any[];
  onStateChange: (newState: { guests: any[]; tables: any[] }) => void;
  onConflictDetected: (conflict: ConflictResolution) => void;
  className?: string;
}

const COLLABORATOR_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#EC4899', // Pink
];

export function RealtimeCollaborationManager({
  weddingId,
  userId,
  userName,
  userEmail,
  userAvatar,
  guests,
  tables,
  onStateChange,
  onConflictDetected,
  className,
}: RealtimeCollaborationManagerProps) {
  const [collaborators, setCollaborators] = useState<
    Record<string, CollaboratorPresence>
  >({});
  const [recentActions, setRecentActions] = useState<SeatingAction[]>([]);
  const [conflicts, setConflicts] = useState<ConflictResolution[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('connecting');

  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastActionRef = useRef<string>('');
  const cursorPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const supabase = createClient();
  const { toast } = useToast();

  // Get collaborator color
  const getCollaboratorColor = useCallback((userId: string) => {
    const index = parseInt(userId.slice(-1), 16) % COLLABORATOR_COLORS.length;
    return COLLABORATOR_COLORS[index];
  }, []);

  // Initialize real-time connection
  useEffect(() => {
    const channel = supabase
      .channel(`seating_collaboration_${weddingId}`)
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState() as RealtimePresenceState;
        const collaborators: Record<string, CollaboratorPresence> = {};

        Object.entries(presenceState).forEach(([key, presence]) => {
          const user = presence[0] as CollaboratorPresence;
          if (user.user_id !== userId) {
            collaborators[user.user_id] = {
              ...user,
              color: getCollaboratorColor(user.user_id),
            };
          }
        });

        setCollaborators(collaborators);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const newUser = newPresences[0] as CollaboratorPresence;
        if (newUser.user_id !== userId) {
          setCollaborators((prev) => ({
            ...prev,
            [newUser.user_id]: {
              ...newUser,
              color: getCollaboratorColor(newUser.user_id),
            },
          }));

          toast({
            title: 'User Joined',
            description: `${newUser.name} joined the seating collaboration`,
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const leftUser = leftPresences[0] as CollaboratorPresence;
        setCollaborators((prev) => {
          const updated = { ...prev };
          delete updated[leftUser.user_id];
          return updated;
        });

        toast({
          title: 'User Left',
          description: `${leftUser.name} left the collaboration`,
        });
      })
      .on('broadcast', { event: 'seating_action' }, ({ payload }) => {
        const action = payload as SeatingAction;
        if (action.user_id !== userId) {
          handleRemoteAction(action);
        }
      })
      .on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
        const { user_id, x, y } = payload;
        if (user_id !== userId) {
          setCollaborators((prev) => ({
            ...prev,
            [user_id]: {
              ...prev[user_id],
              cursor_position: { x, y },
            },
          }));
        }
      })
      .on('broadcast', { event: 'conflict_detected' }, ({ payload }) => {
        const conflict = payload as ConflictResolution;
        setConflicts((prev) => [...prev, conflict]);
        onConflictDetected(conflict);
      });

    channel.subscribe(async (status) => {
      setConnectionStatus(status === 'SUBSCRIBED' ? 'connected' : 'connecting');
      setIsConnected(status === 'SUBSCRIBED');

      if (status === 'SUBSCRIBED') {
        // Track user presence
        await channel.track({
          user_id: userId,
          name: userName,
          email: userEmail,
          avatar_url: userAvatar,
          last_seen: new Date().toISOString(),
          status: 'active',
          color: getCollaboratorColor(userId),
        });
      }
    });

    channelRef.current = channel;

    // Track cursor movement
    const handleMouseMove = (e: MouseEvent) => {
      cursorPositionRef.current = { x: e.clientX, y: e.clientY };

      // Throttle cursor updates
      clearTimeout(cursorUpdateTimeout);
      cursorUpdateTimeout = setTimeout(() => {
        channel.send({
          type: 'broadcast',
          event: 'cursor_move',
          payload: {
            user_id: userId,
            x: e.clientX,
            y: e.clientY,
          },
        });
      }, 100);
    };

    let cursorUpdateTimeout: NodeJS.Timeout;
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(cursorUpdateTimeout);
      channel.unsubscribe();
    };
  }, [
    weddingId,
    userId,
    userName,
    userEmail,
    userAvatar,
    getCollaboratorColor,
    onConflictDetected,
    toast,
  ]);

  // Handle remote actions from other users
  const handleRemoteAction = useCallback(
    (action: SeatingAction) => {
      setRecentActions((prev) => [action, ...prev.slice(0, 9)]);

      // Check for conflicts
      if (
        lastActionRef.current &&
        Date.now() - new Date(lastActionRef.current).getTime() < 1000 &&
        action.guest_id
      ) {
        // Potential conflict detected
        const conflict: ConflictResolution = {
          id: `conflict_${Date.now()}`,
          conflict_type: 'concurrent_assignment',
          user1_id: userId,
          user1_name: userName,
          user1_action: 'guest assignment',
          user2_id: action.user_id,
          user2_name: action.user_name,
          user2_action: action.type,
          guest_id: action.guest_id,
          table_id: action.table_id,
          timestamp: new Date().toISOString(),
          resolved: false,
        };

        channelRef.current?.send({
          type: 'broadcast',
          event: 'conflict_detected',
          payload: conflict,
        });
      }

      // Apply remote changes (simplified - in real implementation, would need more sophisticated merging)
      toast({
        title: 'Collaboration Update',
        description: `${action.user_name} ${getActionDescription(action)}`,
      });
    },
    [userId, userName, toast],
  );

  // Broadcast local action to other users
  const broadcastAction = useCallback(
    (
      action: Omit<SeatingAction, 'id' | 'user_id' | 'user_name' | 'timestamp'>,
    ) => {
      const fullAction: SeatingAction = {
        ...action,
        id: `action_${Date.now()}`,
        user_id: userId,
        user_name: userName,
        timestamp: new Date().toISOString(),
      };

      lastActionRef.current = fullAction.timestamp;
      setRecentActions((prev) => [fullAction, ...prev.slice(0, 9)]);

      channelRef.current?.send({
        type: 'broadcast',
        event: 'seating_action',
        payload: fullAction,
      });
    },
    [userId, userName],
  );

  // Get action description for display
  const getActionDescription = useCallback((action: SeatingAction) => {
    switch (action.type) {
      case 'assign':
        return `assigned ${action.guest_name} to ${action.table_name}`;
      case 'unassign':
        return `unassigned ${action.guest_name}`;
      case 'move':
        return `moved ${action.guest_name} from ${action.from_table_name} to ${action.table_name}`;
      case 'optimize':
        return 'ran seating optimization';
      case 'template_apply':
        return 'applied a table template';
      default:
        return 'made a change';
    }
  }, []);

  // Update user presence status
  const updatePresenceStatus = useCallback(
    (status: 'active' | 'idle' | 'away') => {
      channelRef.current?.track({
        user_id: userId,
        name: userName,
        email: userEmail,
        avatar_url: userAvatar,
        last_seen: new Date().toISOString(),
        status,
        color: getCollaboratorColor(userId),
      });
    },
    [userId, userName, userEmail, userAvatar, getCollaboratorColor],
  );

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      updatePresenceStatus(document.hidden ? 'away' : 'active');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [updatePresenceStatus]);

  // Activity timeout for idle status
  useEffect(() => {
    let idleTimeout: NodeJS.Timeout;

    const resetIdleTimer = () => {
      clearTimeout(idleTimeout);
      updatePresenceStatus('active');

      idleTimeout = setTimeout(() => {
        updatePresenceStatus('idle');
      }, 300000); // 5 minutes
    };

    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
    ];
    events.forEach((event) => {
      document.addEventListener(event, resetIdleTimer);
    });

    resetIdleTimer();

    return () => {
      clearTimeout(idleTimeout);
      events.forEach((event) => {
        document.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [updatePresenceStatus]);

  const collaboratorCount = Object.keys(collaborators).length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span className="text-sm">
            {connectionStatus === 'connected'
              ? 'Connected'
              : connectionStatus === 'connecting'
                ? 'Connecting...'
                : 'Disconnected'}
          </span>
        </div>

        <Badge variant="outline">
          <Users className="h-3 w-3 mr-1" />
          {collaboratorCount + 1} active
        </Badge>
      </div>

      {/* Active Collaborators */}
      {collaboratorCount > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Active Collaborators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.values(collaborators).map((collaborator) => (
                <motion.div
                  key={collaborator.user_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center space-x-3"
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={collaborator.avatar_url} />
                      <AvatarFallback
                        style={{ backgroundColor: collaborator.color }}
                      >
                        {collaborator.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        'absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white',
                        collaborator.status === 'active'
                          ? 'bg-green-500'
                          : collaborator.status === 'idle'
                            ? 'bg-yellow-500'
                            : 'bg-gray-400',
                      )}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {collaborator.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {collaborator.last_action || 'Viewing seating chart'}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {collaborator.status === 'active' ? (
                      <Eye className="h-3 w-3 text-green-500" />
                    ) : collaborator.status === 'idle' ? (
                      <Clock className="h-3 w-3 text-yellow-500" />
                    ) : (
                      <UserMinus className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <AnimatePresence>
              {recentActions.map((action) => {
                const isOwnAction = action.user_id === userId;

                return (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={cn(
                      'flex items-start space-x-3 p-2 rounded-lg text-sm',
                      isOwnAction ? 'bg-blue-50' : 'bg-muted',
                    )}
                  >
                    <Avatar className="h-6 w-6 mt-0.5">
                      <AvatarFallback className="text-xs">
                        {action.user_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="truncate">
                        <span className="font-medium">{action.user_name}</span>{' '}
                        <span className="text-muted-foreground">
                          {getActionDescription(action)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(action.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {recentActions.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No recent activity
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conflicts */}
      {conflicts.filter((c) => !c.resolved).length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 text-orange-500" />
              Collaboration Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {conflicts
                .filter((c) => !c.resolved)
                .map((conflict) => (
                  <div
                    key={conflict.id}
                    className="p-3 bg-white rounded-lg border border-orange-200"
                  >
                    <div className="text-sm font-medium mb-1">
                      Concurrent Edit Detected
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                      {conflict.user1_name} and {conflict.user2_name} both made
                      changes
                      {conflict.guest_id && ' to the same guest'}
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Handle conflict resolution
                          setConflicts((prev) =>
                            prev.map((c) =>
                              c.id === conflict.id
                                ? {
                                    ...c,
                                    resolved: true,
                                    resolution_strategy: 'latest_wins',
                                  }
                                : c,
                            ),
                          );
                        }}
                      >
                        Keep Latest
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Handle manual resolution
                          setConflicts((prev) =>
                            prev.map((c) =>
                              c.id === conflict.id
                                ? {
                                    ...c,
                                    resolved: true,
                                    resolution_strategy: 'manual_merge',
                                  }
                                : c,
                            ),
                          );
                        }}
                      >
                        Manual Merge
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Remote Cursors Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {Object.values(collaborators).map(
          (collaborator) =>
            collaborator.cursor_position && (
              <motion.div
                key={collaborator.user_id}
                className="absolute"
                style={{
                  left: collaborator.cursor_position.x,
                  top: collaborator.cursor_position.y,
                  transform: 'translate(-2px, -2px)',
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
              >
                <div
                  className="w-4 h-4 rotate-12"
                  style={{ color: collaborator.color }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.33 24l4.25-10.17 10.17-4.25-14.42 14.42z" />
                  </svg>
                </div>
                <div
                  className="mt-1 px-2 py-1 text-xs text-white rounded shadow-lg whitespace-nowrap"
                  style={{ backgroundColor: collaborator.color }}
                >
                  {collaborator.name}
                </div>
              </motion.div>
            ),
        )}
      </div>
    </div>
  );
}
