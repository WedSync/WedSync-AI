'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Wifi,
  WifiOff,
  Sync,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MobileCalendarSyncProps {
  weddingId: string;
  userType: 'couple' | 'vendor';
  onlineStatus: boolean;
  className?: string;
}

interface SyncStatus {
  isConnected: boolean;
  lastSync: Date | null;
  pendingChanges: number;
  isSyncing: boolean;
  conflicts: number;
  nextSyncAt: Date | null;
}

interface CalendarProvider {
  id: string;
  name: string;
  isConnected: boolean;
  lastSync: Date | null;
  icon: string;
}

const MobileCalendarSync: React.FC<MobileCalendarSyncProps> = ({
  weddingId,
  userType,
  onlineStatus,
  className,
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConnected: onlineStatus,
    lastSync: null,
    pendingChanges: 0,
    isSyncing: false,
    conflicts: 0,
    nextSyncAt: null,
  });

  const [providers, setProviders] = useState<CalendarProvider[]>([
    {
      id: 'google',
      name: 'Google Calendar',
      isConnected: false,
      lastSync: null,
      icon: '📅',
    },
    {
      id: 'apple',
      name: 'Apple Calendar',
      isConnected: false,
      lastSync: null,
      icon: '🗓️',
    },
    {
      id: 'outlook',
      name: 'Outlook Calendar',
      isConnected: false,
      lastSync: null,
      icon: '📋',
    },
  ]);

  const [timelinePreview, setTimelinePreview] = useState<any[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  // Connection status monitoring
  useEffect(() => {
    setSyncStatus((prev) => ({
      ...prev,
      isConnected: onlineStatus,
    }));

    if (onlineStatus && syncStatus.pendingChanges > 0) {
      performSync();
    }
  }, [onlineStatus]);

  // Auto-sync timer
  useEffect(() => {
    if (!onlineStatus) return;

    const interval = setInterval(() => {
      performSync();
    }, 30000); // Sync every 30 seconds when online

    return () => clearInterval(interval);
  }, [onlineStatus]);

  // Load wedding timeline preview
  useEffect(() => {
    loadTimelinePreview();
  }, [weddingId]);

  const loadTimelinePreview = useCallback(async () => {
    try {
      // Simulate loading timeline events
      const mockEvents = [
        {
          id: 1,
          title: 'Hair & Makeup',
          time: '8:00 AM',
          vendor: 'Beauty Studio',
          status: 'confirmed',
          type: userType === 'vendor' ? 'editable' : 'view-only',
        },
        {
          id: 2,
          title: 'Photography',
          time: '10:00 AM',
          vendor: 'Sky Photography',
          status: 'confirmed',
          type: userType === 'vendor' ? 'editable' : 'view-only',
        },
        {
          id: 3,
          title: 'Ceremony',
          time: '2:00 PM',
          vendor: 'Venue',
          status: 'confirmed',
          type: 'fixed',
        },
      ];

      setTimelinePreview(mockEvents);
    } catch (error) {
      console.error('Failed to load timeline preview:', error);
      toast({
        title: 'Timeline Loading Error',
        description: 'Could not load wedding timeline. Please try again.',
        variant: 'destructive',
      });
    }
  }, [weddingId, userType, toast]);

  const performSync = useCallback(async () => {
    if (syncStatus.isSyncing) return;

    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));

    try {
      // Simulate sync operation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Update sync status
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date(),
        pendingChanges: 0,
        nextSyncAt: new Date(Date.now() + 30000),
      }));

      // Haptic feedback on mobile devices
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }

      toast({
        title: 'Timeline Synced',
        description: 'Wedding timeline updated successfully',
      });
    } catch (error) {
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        pendingChanges: prev.pendingChanges + 1,
      }));

      toast({
        title: 'Sync Failed',
        description:
          'Timeline changes saved locally. Will sync when connection restored.',
        variant: 'destructive',
      });
    }
  }, [syncStatus.isSyncing, toast]);

  const handleManualSync = useCallback(() => {
    if (onlineStatus) {
      performSync();
    } else {
      toast({
        title: 'No Connection',
        description: 'Please check your internet connection and try again',
        variant: 'destructive',
      });
    }
  }, [onlineStatus, performSync, toast]);

  const connectProvider = useCallback(
    async (providerId: string) => {
      try {
        // Simulate provider connection
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setProviders((prev) =>
          prev.map((provider) =>
            provider.id === providerId
              ? { ...provider, isConnected: true, lastSync: new Date() }
              : provider,
          ),
        );

        toast({
          title: 'Calendar Connected',
          description: `Successfully connected to ${providers.find((p) => p.id === providerId)?.name}`,
        });
      } catch (error) {
        toast({
          title: 'Connection Failed',
          description: 'Could not connect to calendar provider',
          variant: 'destructive',
        });
      }
    },
    [providers, toast],
  );

  const getConnectionIcon = () => {
    if (syncStatus.isSyncing) return <Sync className="w-4 h-4 animate-spin" />;
    if (syncStatus.isConnected) return <Wifi className="w-4 h-4" />;
    return <WifiOff className="w-4 h-4" />;
  };

  const getConnectionStatus = () => {
    if (syncStatus.isSyncing) return 'Syncing...';
    if (syncStatus.isConnected) return 'Connected';
    if (syncStatus.pendingChanges > 0)
      return `${syncStatus.pendingChanges} changes pending`;
    return 'Offline';
  };

  const getConnectionColor = () => {
    if (syncStatus.isSyncing) return 'bg-blue-500';
    if (syncStatus.isConnected) return 'bg-green-500';
    if (syncStatus.pendingChanges > 0) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className={cn('mobile-calendar-sync space-y-4', className)}>
      {/* Connection Status Header */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn('w-3 h-3 rounded-full', getConnectionColor())}
              />
              <div>
                <CardTitle className="text-lg">Wedding Timeline</CardTitle>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  {getConnectionIcon()}
                  {getConnectionStatus()}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              disabled={syncStatus.isSyncing || !onlineStatus}
              className="touch-target-48"
            >
              <Sync
                className={cn(
                  'w-4 h-4 mr-2',
                  syncStatus.isSyncing && 'animate-spin',
                )}
              />
              Sync
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Sync Status Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Last Sync</p>
              <p className="font-medium">
                {syncStatus.lastSync
                  ? syncStatus.lastSync.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Next Sync</p>
              <p className="font-medium">
                {syncStatus.nextSyncAt && onlineStatus
                  ? syncStatus.nextSyncAt.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Manual only'}
              </p>
            </div>
          </div>

          {/* Conflict Indicator */}
          {syncStatus.conflicts > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-800">
                  {syncStatus.conflicts} timeline conflict
                  {syncStatus.conflicts > 1 ? 's' : ''} detected
                </span>
              </div>
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-orange-600 hover:text-orange-800"
                onClick={() =>
                  router.push(`/weddings/${weddingId}/timeline/conflicts`)
                }
              >
                Resolve conflicts →
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Calendar Providers */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Calendar Providers</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{provider.icon}</span>
                <div>
                  <p className="font-medium">{provider.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {provider.isConnected
                      ? `Last sync: ${provider.lastSync?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Never'}`
                      : 'Not connected'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {provider.isConnected && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                <Button
                  variant={provider.isConnected ? 'secondary' : 'default'}
                  size="sm"
                  onClick={() => connectProvider(provider.id)}
                  disabled={provider.isConnected}
                  className="touch-target-48"
                >
                  {provider.isConnected ? 'Connected' : 'Connect'}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Timeline Preview */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Timeline Preview</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/weddings/${weddingId}/timeline`)}
              className="touch-target-48"
            >
              View Full
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <AnimatePresence>
            {timelinePreview.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-12 bg-blue-500 rounded-full" />
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.vendor}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-medium">{event.time}</p>
                  <Badge
                    variant={
                      event.status === 'confirmed' ? 'success' : 'secondary'
                    }
                    className="text-xs"
                  >
                    {event.status}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {timelinePreview.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No timeline events found</p>
              <p className="text-sm">Add events to see them here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileCalendarSync;
