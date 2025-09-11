'use client';

/**
 * WS-342 Real-Time Wedding Collaboration Hub - Main Interface
 * Team A - Frontend/UI Development - Central Collaboration Command Center
 *
 * Central hub for all wedding collaboration activities including timeline management,
 * vendor coordination, task management, chat, and planning board collaboration
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useRealTimeCollaboration } from '@/hooks/collaboration/useRealTimeCollaboration';
import {
  Collaborator,
  CollaborationAction,
  CollaboratorInvitation,
  CollaborationSection,
  PresenceData,
  ActivityItem,
  CollaborationConflict,
  CollaborationUpdate,
  WeddingVendor,
  WeddingTask,
  User,
} from '@/types/collaboration';

// Icons
import {
  Users,
  UserPlus,
  Calendar,
  Building,
  CheckSquare,
  MessageCircle,
  Layout,
  Wifi,
  WifiOff,
  Bell,
  AlertTriangle,
  Clock,
  Activity,
  Settings,
  X,
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Collaboration Components (to be created)
import { LiveWeddingTimeline } from './LiveWeddingTimeline';
import { VendorCoordinationPanel } from './VendorCoordinationPanel';
import { LiveTaskManagement } from './LiveTaskManagement';
import { WeddingPartyChat } from './WeddingPartyChat';
import { SharedWeddingBoard } from './SharedWeddingBoard';
import { CollaborationPresence } from './CollaborationPresence';

export interface RealTimeCollaborationHubProps {
  weddingId: string;
  currentUser: User;
  collaborators: Collaborator[];
  onCollaborationAction: (action: CollaborationAction) => void;
  onInviteCollaborator: (invitation: CollaboratorInvitation) => void;
  realTimeUpdates: boolean;
  className?: string;
}

interface CollaborationTabProps {
  id: CollaborationSection;
  label: string;
  active: boolean;
  onClick: (id: CollaborationSection) => void;
  notificationCount?: number;
  icon: React.ReactNode;
  disabled?: boolean;
}

interface ActiveCollaboratorsProps {
  collaborators: Collaborator[];
  presenceData: { [userId: string]: PresenceData };
  maxVisible?: number;
}

interface ConnectionStatusProps {
  isConnected: boolean;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  className?: string;
}

interface CollaborationSidebarProps {
  activeCollaborators: Collaborator[];
  recentActivity: ActivityItem[];
  upcomingDeadlines: any[];
  conflictAlerts: CollaborationConflict[];
  onActivityClick?: (activity: ActivityItem) => void;
  onConflictResolve?: (conflict: CollaborationConflict) => void;
}

interface NotificationBadgeProps {
  count: number;
  variant?: 'default' | 'destructive' | 'secondary' | 'outline';
  className?: string;
}

/**
 * Real-Time Collaboration Hub - Main Component
 */
export function RealTimeCollaborationHub({
  weddingId,
  currentUser,
  collaborators,
  onCollaborationAction,
  onInviteCollaborator,
  realTimeUpdates,
  className,
}: RealTimeCollaborationHubProps) {
  // Real-time collaboration hook
  const {
    isConnected,
    connectionQuality,
    activeUsers,
    recentActivity,
    conflicts,
    presenceData,
    sendUpdate,
    subscribeToUpdates,
    updatePresence,
    error,
    clearError,
  } = useRealTimeCollaboration(weddingId, {
    autoConnect: true,
    enablePresence: true,
    enableConflictResolution: true,
  });

  // Local state
  const [activeSection, setActiveSection] =
    useState<CollaborationSection>('timeline');
  const [notifications, setNotifications] = useState<{
    [key in CollaborationSection]?: number;
  }>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToUpdates((update: CollaborationUpdate) => {
      handleRealTimeUpdate(update);
    });

    return unsubscribe;
  }, [subscribeToUpdates]);

  // Update presence when section changes
  useEffect(() => {
    updatePresence({
      currentSection: activeSection,
      lastActivity: new Date(),
      status: 'online',
    });
  }, [activeSection, updatePresence]);

  // Handle real-time updates
  const handleRealTimeUpdate = useCallback(
    (update: CollaborationUpdate) => {
      switch (update.type) {
        case 'UPDATE':
          if (update.entityType === 'TIMELINE_ITEM') {
            onCollaborationAction({
              type: 'timeline_updated',
              data: update.data,
              timestamp: update.timestamp,
            });

            // Add notification if not on timeline tab
            if (activeSection !== 'timeline') {
              setNotifications((prev) => ({
                ...prev,
                timeline: (prev.timeline || 0) + 1,
              }));
            }
          }
          break;

        case 'CREATE':
          if (update.entityType === 'TASK') {
            onCollaborationAction({
              type: 'task_created',
              data: update.data,
              timestamp: update.timestamp,
            });

            if (activeSection !== 'tasks') {
              setNotifications((prev) => ({
                ...prev,
                tasks: (prev.tasks || 0) + 1,
              }));
            }
          }
          break;

        case 'PRESENCE_UPDATE':
          // Handled by the hook automatically
          break;

        default:
          console.log('Unhandled collaboration update:', update);
      }
    },
    [activeSection, onCollaborationAction],
  );

  // Calculate notification counts
  const getNotificationCount = useCallback(
    (section: CollaborationSection): number => {
      let count = notifications[section] || 0;

      // Add conflict notifications
      if (
        section === 'timeline' &&
        conflicts.some((c) => c.type.includes('TIMELINE'))
      ) {
        count += conflicts.filter((c) => c.type.includes('TIMELINE')).length;
      }

      return count;
    },
    [notifications, conflicts],
  );

  // Get active collaborators from presence data
  const activeCollaborators = useMemo(() => {
    return collaborators.filter(
      (c) => presenceData[c.userId]?.status === 'online',
    );
  }, [collaborators, presenceData]);

  // Handle section changes
  const handleSectionChange = useCallback((section: CollaborationSection) => {
    setActiveSection(section);

    // Clear notifications for the active section
    setNotifications((prev) => ({ ...prev, [section]: 0 }));
  }, []);

  // Handle invite collaborator
  const handleInviteCollaborator = useCallback(() => {
    onInviteCollaborator({
      type: 'vendor',
      weddingId,
      permissions: {
        read: true,
        write: true,
        admin: false,
        share: false,
        comment: true,
        manageVendors: false,
        manageTimeline: true,
        manageBudget: false,
        manageGuests: false,
        viewPrivateInfo: false,
      },
    } as CollaboratorInvitation);
  }, [onInviteCollaborator, weddingId]);

  // Mock data helpers (to be replaced with real data)
  const getWeddingVendors = useCallback(
    (weddingId: string): WeddingVendor[] => {
      return []; // Will be populated from props or API
    },
    [],
  );

  const getWeddingTasks = useCallback((weddingId: string): WeddingTask[] => {
    return []; // Will be populated from props or API
  }, []);

  const getUpcomingDeadlines = useCallback((weddingId: string) => {
    return []; // Will be populated from real data
  }, []);

  const getConflictAlerts = useCallback(
    (weddingId: string) => {
      return conflicts;
    },
    [conflicts],
  );

  return (
    <TooltipProvider>
      <div
        className={cn(
          'real-time-collaboration-hub min-h-screen bg-gray-50',
          className,
        )}
      >
        {/* Collaboration Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Users className="w-6 h-6 text-purple-600" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Wedding Collaboration
                </h1>
              </div>
              <ConnectionStatus
                isConnected={isConnected}
                quality={connectionQuality}
              />
            </div>

            <div className="flex items-center space-x-4">
              <ActiveCollaborators
                collaborators={activeCollaborators}
                presenceData={presenceData}
                maxVisible={5}
              />
              <Button
                onClick={handleInviteCollaborator}
                className="bg-purple-600 text-white hover:bg-purple-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Collaborator
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Collaboration Error</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                {error.message}
                <Button variant="outline" size="sm" onClick={clearError}>
                  <X className="w-3 h-3" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Collaboration Navigation */}
          <div className="mt-4 flex space-x-1">
            <CollaborationTab
              id="timeline"
              label="Live Timeline"
              active={activeSection === 'timeline'}
              onClick={handleSectionChange}
              notificationCount={getNotificationCount('timeline')}
              icon={<Calendar className="w-4 h-4" />}
            />
            <CollaborationTab
              id="vendors"
              label="Vendor Coordination"
              active={activeSection === 'vendors'}
              onClick={handleSectionChange}
              notificationCount={getNotificationCount('vendors')}
              icon={<Building className="w-4 h-4" />}
            />
            <CollaborationTab
              id="tasks"
              label="Shared Tasks"
              active={activeSection === 'tasks'}
              onClick={handleSectionChange}
              notificationCount={getNotificationCount('tasks')}
              icon={<CheckSquare className="w-4 h-4" />}
            />
            <CollaborationTab
              id="chat"
              label="Wedding Party Chat"
              active={activeSection === 'chat'}
              onClick={handleSectionChange}
              notificationCount={getNotificationCount('chat')}
              icon={<MessageCircle className="w-4 h-4" />}
            />
            <CollaborationTab
              id="board"
              label="Planning Board"
              active={activeSection === 'board'}
              onClick={handleSectionChange}
              notificationCount={getNotificationCount('board')}
              icon={<Layout className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Main Collaboration Content */}
        <div className="flex-1 flex">
          {/* Primary Collaboration Area */}
          <div className="flex-1 p-6">
            {activeSection === 'timeline' && (
              <LiveWeddingTimeline
                weddingId={weddingId}
                collaborators={collaborators}
                onTimelineUpdate={(update) =>
                  sendUpdate('timeline_update', update)
                }
                realTimeMode={realTimeUpdates}
                data-testid="live-timeline"
              />
            )}

            {activeSection === 'vendors' && (
              <VendorCoordinationPanel
                weddingId={weddingId}
                vendors={getWeddingVendors(weddingId)}
                onVendorUpdate={(update) => sendUpdate('vendor_update', update)}
                collaborationMode="real_time"
                data-testid="vendor-coordination-panel"
              />
            )}

            {activeSection === 'tasks' && (
              <LiveTaskManagement
                weddingId={weddingId}
                tasks={getWeddingTasks(weddingId)}
                assignees={collaborators}
                onTaskUpdate={(update) => sendUpdate('task_update', update)}
                conflictResolution="automatic"
                data-testid="task-management"
              />
            )}

            {activeSection === 'chat' && (
              <WeddingPartyChat
                weddingId={weddingId}
                participants={collaborators}
                onMessage={(message) => sendUpdate('chat_message', message)}
                supportedMedia={['text', 'image', 'voice', 'video']}
                data-testid="wedding-party-chat"
              />
            )}

            {activeSection === 'board' && (
              <SharedWeddingBoard
                weddingId={weddingId}
                collaborators={collaborators}
                onBoardUpdate={(update) => sendUpdate('board_update', update)}
                boardType="kanban"
                data-testid="shared-wedding-board"
              />
            )}
          </div>

          {/* Collaboration Sidebar */}
          {!sidebarCollapsed && (
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
              <CollaborationSidebar
                activeCollaborators={activeCollaborators}
                recentActivity={recentActivity}
                upcomingDeadlines={getUpcomingDeadlines(weddingId)}
                conflictAlerts={getConflictAlerts(weddingId)}
              />
            </div>
          )}
        </div>

        {/* Floating Presence Indicators */}
        <CollaborationPresence
          activeUsers={activeUsers}
          presenceData={presenceData}
          currentSection={activeSection}
        />
      </div>
    </TooltipProvider>
  );
}

/**
 * Collaboration Tab Component
 */
function CollaborationTab({
  id,
  label,
  active,
  onClick,
  notificationCount = 0,
  icon,
  disabled = false,
}: CollaborationTabProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={cn(
            'relative px-4 py-2 rounded-lg font-medium text-sm transition-colors',
            'flex items-center space-x-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            active
              ? 'bg-purple-100 text-purple-700 border border-purple-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
          )}
          onClick={() => !disabled && onClick(id)}
          disabled={disabled}
        >
          {icon}
          <span>{label}</span>
          {notificationCount > 0 && (
            <NotificationBadge count={notificationCount} />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{disabled ? 'Coming soon' : `Switch to ${label}`}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Active Collaborators Display
 */
function ActiveCollaborators({
  collaborators,
  presenceData,
  maxVisible = 5,
}: ActiveCollaboratorsProps) {
  const activeCollaborators = collaborators.filter(
    (c) => presenceData[c.userId]?.status === 'online',
  );

  const visibleCollaborators = activeCollaborators.slice(0, maxVisible);
  const remainingCount = Math.max(0, activeCollaborators.length - maxVisible);

  return (
    <div className="flex items-center space-x-2">
      <div className="flex -space-x-2">
        {visibleCollaborators.map((collaborator) => (
          <Tooltip key={collaborator.id}>
            <TooltipTrigger asChild>
              <div className="relative">
                <img
                  className="w-8 h-8 rounded-full border-2 border-white"
                  src={
                    collaborator.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(collaborator.name)}`
                  }
                  alt={collaborator.name}
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {collaborator.name} - {collaborator.role}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
        {remainingCount > 0 && (
          <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
            +{remainingCount}
          </div>
        )}
      </div>
      <span className="text-sm text-gray-600">
        {activeCollaborators.length} active
      </span>
    </div>
  );
}

/**
 * Connection Status Indicator
 */
function ConnectionStatus({
  isConnected,
  quality,
  className,
}: ConnectionStatusProps) {
  const getStatusColor = () => {
    if (!isConnected) return 'text-red-500';
    switch (quality) {
      case 'excellent':
        return 'text-green-500';
      case 'good':
        return 'text-green-400';
      case 'fair':
        return 'text-yellow-500';
      case 'poor':
        return 'text-red-400';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    return isConnected ? (
      <Wifi className="w-4 h-4" />
    ) : (
      <WifiOff className="w-4 h-4" />
    );
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex items-center space-x-1',
            getStatusColor(),
            className,
          )}
        >
          {getStatusIcon()}
          <span className="text-xs font-medium">
            {isConnected ? quality : 'disconnected'}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Connection: {isConnected ? `${quality} quality` : 'disconnected'}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Notification Badge
 */
function NotificationBadge({
  count,
  variant = 'destructive',
  className,
}: NotificationBadgeProps) {
  return (
    <Badge
      variant={variant}
      className={cn(
        'absolute -top-1 -right-1 w-5 h-5 text-xs rounded-full flex items-center justify-center p-0',
        className,
      )}
    >
      {count > 9 ? '9+' : count}
    </Badge>
  );
}

/**
 * Collaboration Sidebar
 */
function CollaborationSidebar({
  activeCollaborators,
  recentActivity,
  upcomingDeadlines,
  conflictAlerts,
  onActivityClick,
  onConflictResolve,
}: CollaborationSidebarProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Active Collaborators */}
      <div className="p-4 border-b">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Active Now</h3>
        <div className="space-y-2">
          {activeCollaborators.length === 0 ? (
            <p className="text-sm text-gray-500">No one else is online</p>
          ) : (
            activeCollaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="flex items-center space-x-2 text-sm"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="truncate">{collaborator.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {collaborator.role}
                </Badge>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Conflict Alerts */}
      {conflictAlerts.length > 0 && (
        <div className="p-4 border-b">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-1 text-red-500" />
            Conflicts ({conflictAlerts.length})
          </h3>
          <ScrollArea className="max-h-32">
            <div className="space-y-2">
              {conflictAlerts.map((conflict) => (
                <Alert key={conflict.id} variant="destructive" className="p-2">
                  <AlertDescription className="text-xs">
                    {conflict.description}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Recent Activity */}
      <div className="flex-1 p-4 border-b">
        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <Activity className="w-4 h-4 mr-1" />
          Recent Activity
        </h3>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500">No recent activity</p>
            ) : (
              recentActivity.slice(0, 20).map((activity) => (
                <div
                  key={activity.id}
                  className="text-xs text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => onActivityClick?.(activity)}
                >
                  <div className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">
                        <span className="font-medium">{activity.userName}</span>{' '}
                        {activity.description}
                      </p>
                      <p className="text-gray-400 mt-0.5">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Upcoming Deadlines */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <Clock className="w-4 h-4 mr-1" />
          Upcoming Deadlines
        </h3>
        <div className="space-y-2">
          {upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-gray-500">No upcoming deadlines</p>
          ) : (
            upcomingDeadlines.slice(0, 3).map((deadline, index) => (
              <div key={index} className="text-xs text-gray-600">
                <p className="font-medium truncate">{deadline.title}</p>
                <p className="text-gray-400">{deadline.dueDate}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default RealTimeCollaborationHub;
