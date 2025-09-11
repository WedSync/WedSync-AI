'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Users,
  MapPin,
  Phone,
  MessageSquare,
  Wifi,
  WifiOff,
  Sync,
  ChevronRight,
  Bell,
  Heart,
  Camera,
  Utensils,
  Music,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface UpcomingEvent {
  id: string;
  title: string;
  time: string;
  vendor: string;
  location?: string;
  status: 'confirmed' | 'pending' | 'changed' | 'urgent';
  type: 'preparation' | 'ceremony' | 'photography' | 'reception' | 'other';
  estimatedDuration: number; // minutes
  isNext: boolean;
}

interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingChanges: number;
  syncing: boolean;
  nextSync: Date | null;
}

interface ConflictItem {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoResolvable: boolean;
  weddingId: string;
  eventId: string;
}

interface WeddingProgress {
  totalTasks: number;
  completedTasks: number;
  daysRemaining: number;
  upcomingMilestones: string[];
  criticalPath: boolean;
}

interface MobileCalendarWidgetsProps {
  weddingId: string;
  userType: 'couple' | 'vendor';
  className?: string;
}

// Quick Timeline Widget for home screen
export const QuickTimelineWidget: React.FC<{
  weddingId: string;
  userType: 'couple' | 'vendor';
  className?: string;
}> = ({ weddingId, userType, className }) => {
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    loadUpcomingEvents();
  }, [weddingId]);

  const loadUpcomingEvents = useCallback(async () => {
    try {
      // Mock data - replace with real API call
      const mockEvents: UpcomingEvent[] = [
        {
          id: '1',
          title: 'Hair & Makeup',
          time: '8:00 AM',
          vendor: 'Beauty Studio',
          location: 'Bridal Suite',
          status: 'confirmed',
          type: 'preparation',
          estimatedDuration: 120,
          isNext: true,
        },
        {
          id: '2',
          title: 'Photography Session',
          time: '10:30 AM',
          vendor: 'Sky Photography',
          location: 'Garden Area',
          status: 'confirmed',
          type: 'photography',
          estimatedDuration: 90,
          isNext: false,
        },
        {
          id: '3',
          title: 'Ceremony',
          time: '2:00 PM',
          vendor: 'Wedding Coordinator',
          location: 'Main Hall',
          status: 'confirmed',
          type: 'ceremony',
          estimatedDuration: 45,
          isNext: false,
        },
      ];

      setUpcomingEvents(mockEvents.slice(0, 3));
    } catch (error) {
      console.error('Failed to load upcoming events:', error);
      toast({
        title: 'Loading Error',
        description: 'Could not load upcoming events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [weddingId, toast]);

  const getEventIcon = (type: UpcomingEvent['type']) => {
    const icons = {
      preparation: '💄',
      ceremony: '💒',
      photography: '📸',
      reception: '🎉',
      other: '📅',
    };
    return icons[type] || '📅';
  };

  const getStatusColor = (status: UpcomingEvent['status']) => {
    const colors = {
      confirmed: 'text-green-600',
      pending: 'text-yellow-600',
      changed: 'text-orange-600',
      urgent: 'text-red-600',
    };
    return colors[status] || 'text-gray-600';
  };

  if (loading) {
    return (
      <Card className={cn('border-0 shadow-sm', className)}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-0 shadow-sm touch-target-enhanced', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Today's Schedule
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/weddings/${weddingId}/timeline`)}
            className="text-blue-600 hover:text-blue-800"
          >
            View All <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        <AnimatePresence>
          {upcomingEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border transition-all duration-200',
                event.isNext
                  ? 'bg-blue-50 border-blue-200 shadow-sm'
                  : 'bg-gray-50 border-gray-200',
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-sm">
                  <span className="text-lg">{getEventIcon(event.type)}</span>
                </div>
                <div>
                  <p className="font-medium text-sm leading-tight">
                    {event.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {event.time}
                    </p>
                    {event.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <Badge
                  variant={
                    event.status === 'confirmed' ? 'success' : 'secondary'
                  }
                  className="text-xs mb-1"
                >
                  {event.status}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {event.estimatedDuration}min
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {upcomingEvents.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No events scheduled today</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Calendar Sync Status Widget
export const SyncStatusWidget: React.FC<{
  weddingId: string;
  className?: string;
}> = ({ weddingId, className }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    lastSync: new Date(),
    pendingChanges: 0,
    syncing: false,
    nextSync: new Date(Date.now() + 30000),
  });

  const { toast } = useToast();

  useEffect(() => {
    // Monitor sync status
    const interval = setInterval(() => {
      updateSyncStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const updateSyncStatus = useCallback(() => {
    // Mock sync status update
    setSyncStatus((prev) => ({
      ...prev,
      lastSync: new Date(Date.now() - Math.random() * 120000), // Last 2 minutes
      pendingChanges: Math.floor(Math.random() * 5),
      isOnline: navigator.onLine,
    }));
  }, []);

  const handleManualSync = useCallback(async () => {
    if (syncStatus.syncing) return;

    setSyncStatus((prev) => ({ ...prev, syncing: true }));

    try {
      // Simulate sync
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setSyncStatus((prev) => ({
        ...prev,
        syncing: false,
        lastSync: new Date(),
        pendingChanges: 0,
      }));

      toast({
        title: 'Sync Complete',
        description: 'Timeline synchronized successfully',
      });

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
    } catch (error) {
      setSyncStatus((prev) => ({ ...prev, syncing: false }));

      toast({
        title: 'Sync Failed',
        description: 'Please check connection and try again',
        variant: 'destructive',
      });
    }
  }, [syncStatus.syncing, toast]);

  const getSyncIcon = () => {
    if (syncStatus.syncing) return <Sync className="w-4 h-4 animate-spin" />;
    if (syncStatus.isOnline) return <Wifi className="w-4 h-4" />;
    return <WifiOff className="w-4 h-4" />;
  };

  const getSyncStatus = () => {
    if (syncStatus.syncing) return 'Syncing...';
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.pendingChanges > 0)
      return `${syncStatus.pendingChanges} pending`;
    return 'Up to date';
  };

  const getStatusColor = () => {
    if (syncStatus.syncing) return 'text-blue-600';
    if (!syncStatus.isOnline) return 'text-red-600';
    if (syncStatus.pendingChanges > 0) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <Card className={cn('border-0 shadow-sm', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn('transition-colors', getStatusColor())}>
              {getSyncIcon()}
            </div>
            <div>
              <p className="font-medium text-sm">Timeline Sync</p>
              <p className={cn('text-xs', getStatusColor())}>
                {getSyncStatus()}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSync}
            disabled={syncStatus.syncing || !syncStatus.isOnline}
            className="touch-target-48 text-xs px-2"
          >
            {syncStatus.syncing ? (
              <Sync className="w-3 h-3 animate-spin" />
            ) : (
              'Sync'
            )}
          </Button>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Last sync:</span>
            <span>
              {syncStatus.lastSync
                ? syncStatus.lastSync.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Never'}
            </span>
          </div>
          {syncStatus.isOnline && syncStatus.nextSync && (
            <div className="flex justify-between">
              <span>Next sync:</span>
              <span>
                {syncStatus.nextSync.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Conflict Resolution Widget
export const ConflictResolutionWidget: React.FC<{
  weddingId: string;
  conflicts: ConflictItem[];
  className?: string;
}> = ({ weddingId, conflicts, className }) => {
  const router = useRouter();
  const { toast } = useToast();

  const handleQuickResolve = useCallback(
    async (conflictId: string) => {
      try {
        // Simulate conflict resolution
        await new Promise((resolve) => setTimeout(resolve, 1000));

        toast({
          title: 'Conflict Resolved',
          description: 'Timeline conflict resolved automatically',
        });

        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
      } catch (error) {
        toast({
          title: 'Resolution Failed',
          description: 'Could not resolve conflict automatically',
          variant: 'destructive',
        });
      }
    },
    [toast],
  );

  const getSeverityColor = (severity: ConflictItem['severity']) => {
    const colors = {
      low: 'bg-yellow-100 border-yellow-300 text-yellow-800',
      medium: 'bg-orange-100 border-orange-300 text-orange-800',
      high: 'bg-red-100 border-red-300 text-red-800',
      critical: 'bg-red-200 border-red-400 text-red-900',
    };
    return colors[severity] || colors.medium;
  };

  if (conflicts.length === 0) {
    return (
      <Card className={cn('border-0 shadow-sm', className)}>
        <CardContent className="p-4 text-center">
          <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-green-700">No Conflicts</p>
          <p className="text-xs text-green-600">Timeline is synchronized</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-0 shadow-sm', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Timeline Conflicts
          </CardTitle>
          <Badge variant="destructive" className="text-xs">
            {conflicts.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        <AnimatePresence>
          {conflicts.slice(0, 2).map((conflict, index) => (
            <motion.div
              key={conflict.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'p-3 rounded-lg border-2 transition-all duration-200',
                getSeverityColor(conflict.severity),
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-sm">{conflict.title}</h4>
                <Badge
                  variant="outline"
                  className="text-xs border-current text-current"
                >
                  {conflict.severity}
                </Badge>
              </div>

              <p className="text-xs mb-3 opacity-90">{conflict.description}</p>

              <div className="flex gap-2">
                {conflict.autoResolvable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickResolve(conflict.id)}
                    className="text-xs px-2 py-1 h-7 bg-white/50 hover:bg-white/75"
                  >
                    Auto Resolve
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    router.push(
                      `/weddings/${weddingId}/timeline/conflicts/${conflict.id}`,
                    )
                  }
                  className="text-xs px-2 py-1 h-7 bg-white/50 hover:bg-white/75"
                >
                  Review
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {conflicts.length > 2 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(`/weddings/${weddingId}/timeline/conflicts`)
            }
            className="w-full text-xs"
          >
            View All {conflicts.length} Conflicts
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

// Wedding Progress Widget
export const WeddingProgressWidget: React.FC<{
  weddingId: string;
  className?: string;
}> = ({ weddingId, className }) => {
  const [progress, setProgress] = useState<WeddingProgress>({
    totalTasks: 45,
    completedTasks: 32,
    daysRemaining: 12,
    upcomingMilestones: ['Final headcount', 'Seating chart', 'Music playlist'],
    criticalPath: true,
  });

  const progressPercentage =
    (progress.completedTasks / progress.totalTasks) * 100;
  const router = useRouter();

  const getProgressColor = () => {
    if (progressPercentage >= 90) return 'bg-green-500';
    if (progressPercentage >= 70) return 'bg-blue-500';
    if (progressPercentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getUrgencyMessage = () => {
    if (progress.daysRemaining <= 7) return '🚨 Final week - stay focused!';
    if (progress.daysRemaining <= 30)
      return '⚠️ Getting close - time to finalize!';
    return '✅ On track - keep up the great work!';
  };

  return (
    <Card className={cn('border-0 shadow-sm', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Wedding Progress
          </CardTitle>
          <div className="text-right">
            <p className="text-2xl font-bold">{progress.daysRemaining}</p>
            <p className="text-xs text-muted-foreground">days left</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-bold">
              {progress.completedTasks}/{progress.totalTasks}
            </span>
          </div>

          <Progress value={progressPercentage} className="h-2" />

          <p className="text-xs text-center mt-2 font-medium">
            {Math.round(progressPercentage)}% Complete
          </p>
        </div>

        <div
          className={cn(
            'p-3 rounded-lg text-center text-sm font-medium',
            progress.criticalPath
              ? 'bg-red-50 text-red-700'
              : 'bg-green-50 text-green-700',
          )}
        >
          {getUrgencyMessage()}
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Upcoming Milestones</p>
          <div className="space-y-1">
            {progress.upcomingMilestones.slice(0, 3).map((milestone, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                {milestone}
              </div>
            ))}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/weddings/${weddingId}/progress`)}
          className="w-full text-xs"
        >
          View Detailed Progress
        </Button>
      </CardContent>
    </Card>
  );
};

// Main Widgets Container Component
const MobileCalendarWidgets: React.FC<MobileCalendarWidgetsProps> = ({
  weddingId,
  userType,
  className,
}) => {
  const [conflicts] = useState<ConflictItem[]>([
    {
      id: '1',
      title: 'Photography Time Conflict',
      description: 'Photographer and hair/makeup have overlapping times',
      severity: 'medium',
      autoResolvable: true,
      weddingId,
      eventId: 'event_1',
    },
  ]);

  return (
    <div className={cn('mobile-calendar-widgets space-y-4', className)}>
      <QuickTimelineWidget weddingId={weddingId} userType={userType} />

      <div className="grid grid-cols-1 gap-4">
        <SyncStatusWidget weddingId={weddingId} />

        <ConflictResolutionWidget weddingId={weddingId} conflicts={conflicts} />

        {userType === 'couple' && (
          <WeddingProgressWidget weddingId={weddingId} />
        )}
      </div>
    </div>
  );
};

export default MobileCalendarWidgets;
