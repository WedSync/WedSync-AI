'use client';

/**
 * WS-202: Supabase Realtime Integration - Status Panel Component
 * Wedding industry realtime dashboard with comprehensive monitoring
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRealtime } from '@/components/providers/RealtimeProvider';
import { RealtimeIndicator } from '@/components/ui/RealtimeIndicator';
import {
  RealtimeToast,
  RealtimeToastContainer,
} from '@/components/realtime/RealtimeToast';
import {
  UIRealtimeStatusPanelProps,
  UIRealtimeToastProps,
  WeddingUIEventType,
  UIConnectionStatus,
  UIRealtimeActivity,
} from '@/types/realtime';
import {
  Activity,
  Wifi,
  WifiOff,
  Zap,
  Users,
  Calendar,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Settings,
  Maximize2,
  Minimize2,
  Heart,
  Clock,
  Info,
  BarChart3,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

// Wedding activity types with icons and colors
const ACTIVITY_TYPES = {
  form_response: { icon: FileText, color: 'blue', label: 'Form Response' },
  journey_update: { icon: TrendingUp, color: 'green', label: 'Journey Update' },
  wedding_change: { icon: Calendar, color: 'amber', label: 'Wedding Change' },
  client_update: { icon: Users, color: 'indigo', label: 'Client Update' },
  vendor_checkin: {
    icon: CheckCircle,
    color: 'green',
    label: 'Vendor Check-in',
  },
  timeline_change: { icon: Clock, color: 'orange', label: 'Timeline Change' },
  emergency_alert: {
    icon: AlertTriangle,
    color: 'red',
    label: 'Emergency Alert',
  },
  payment_processed: { icon: Zap, color: 'green', label: 'Payment Processed' },
  document_signed: { icon: FileText, color: 'blue', label: 'Document Signed' },
} as const;

// Performance metrics labels
const PERFORMANCE_METRICS = {
  latency: { label: 'Latency', unit: 'ms', threshold: 100, icon: Zap },
  throughput: {
    label: 'Messages/min',
    unit: '',
    threshold: 50,
    icon: Activity,
  },
  errorRate: {
    label: 'Error Rate',
    unit: '%',
    threshold: 5,
    icon: AlertTriangle,
  },
  uptime: { label: 'Uptime', unit: '%', threshold: 99, icon: CheckCircle },
} as const;

interface RealtimeStatusPanelState {
  activities: UIRealtimeActivity[];
  toasts: UIRealtimeToastProps[];
  metrics: {
    latency: number;
    throughput: number;
    errorRate: number;
    uptime: number;
    messagesSent: number;
    messagesReceived: number;
    reconnectCount: number;
  };
  settings: {
    autoHideToasts: boolean;
    soundNotifications: boolean;
    weddingDayMode: boolean;
    compactView: boolean;
    showDebugInfo: boolean;
  };
  isExpanded: boolean;
}

const DEFAULT_STATE: RealtimeStatusPanelState = {
  activities: [],
  toasts: [],
  metrics: {
    latency: 0,
    throughput: 0,
    errorRate: 0,
    uptime: 100,
    messagesSent: 0,
    messagesReceived: 0,
    reconnectCount: 0,
  },
  settings: {
    autoHideToasts: true,
    soundNotifications: false,
    weddingDayMode: false,
    compactView: false,
    showDebugInfo: false,
  },
  isExpanded: false,
};

export function RealtimeStatusPanel({
  weddingId,
  position = 'top-right',
  maxActivities = 50,
  maxToasts = 5,
  refreshInterval = 5000,
  className,
  onActivityClick,
  weddingDayMode = false,
}: UIRealtimeStatusPanelProps) {
  const realtime = useRealtime();
  const [state, setState] = useState<RealtimeStatusPanelState>({
    ...DEFAULT_STATE,
    settings: {
      ...DEFAULT_STATE.settings,
      weddingDayMode,
    },
  });

  // Auto-detect wedding day mode
  const isWeddingDay = useMemo(() => {
    if (state.settings.weddingDayMode) return true;
    // Saturday detection for wedding days
    const today = new Date();
    return today.getDay() === 6;
  }, [state.settings.weddingDayMode]);

  // Real-time metrics calculation
  const metrics = useMemo(() => {
    const now = Date.now();
    const recentActivities = state.activities.filter(
      (activity) => now - new Date(activity.timestamp).getTime() < 60000, // Last minute
    );

    return {
      ...state.metrics,
      throughput: recentActivities.length,
      latency: realtime.lastHeartbeat
        ? now - new Date(realtime.lastHeartbeat).getTime()
        : 0,
    };
  }, [state.activities, state.metrics, realtime.lastHeartbeat]);

  // Connection quality assessment
  const connectionQuality = useMemo(() => {
    if (!realtime.isConnected) return 'offline';
    if (metrics.latency > 1000) return 'poor';
    if (metrics.latency > 500) return 'fair';
    if (metrics.latency > 100) return 'good';
    return 'excellent';
  }, [realtime.isConnected, metrics.latency]);

  // Add new activity to the feed
  const addActivity = useCallback(
    (activity: Omit<UIRealtimeActivity, 'id'>) => {
      const newActivity: UIRealtimeActivity = {
        ...activity,
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      setState((prev) => ({
        ...prev,
        activities: [newActivity, ...prev.activities].slice(0, maxActivities),
        metrics: {
          ...prev.metrics,
          messagesReceived: prev.metrics.messagesReceived + 1,
        },
      }));

      // Play sound notification if enabled
      if (state.settings.soundNotifications) {
        playNotificationSound(activity.type);
      }
    },
    [maxActivities, state.settings.soundNotifications],
  );

  // Add toast notification
  const addToast = useCallback(
    (toast: Omit<UIRealtimeToastProps, 'id'>) => {
      const newToast: UIRealtimeToastProps = {
        ...toast,
        id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        visible: true,
        autoHide: state.settings.autoHideToasts,
        priority:
          isWeddingDay && toast.type === 'emergency_alert'
            ? 'critical'
            : toast.priority,
      };

      setState((prev) => ({
        ...prev,
        toasts: [newToast, ...prev.toasts].slice(0, maxToasts),
      }));
    },
    [maxToasts, state.settings.autoHideToasts, isWeddingDay],
  );

  // Remove toast
  const removeToast = useCallback((toastId: string) => {
    setState((prev) => ({
      ...prev,
      toasts: prev.toasts.filter((toast) => toast.id !== toastId),
    }));
  }, []);

  // Handle realtime updates
  useEffect(() => {
    if (!realtime.isConnected || !weddingId) return;

    const channelName = `wedding_${weddingId}_status`;

    return realtime.subscribeToChannel(channelName, {
      event: '*',
      schema: 'public',
      table: 'wedding_realtime_activities',
      filter: `wedding_id=eq.${weddingId}`,
      callback: (payload) => {
        const { eventType, new: data } = payload;

        // Add to activity feed
        addActivity({
          type: eventType as WeddingUIEventType,
          data,
          timestamp: new Date().toISOString(),
          weddingId,
          priority: isWeddingDay ? 'high' : 'medium',
          source: 'realtime',
        });

        // Create toast notification for high priority events
        if (
          eventType === 'emergency_alert' ||
          (isWeddingDay && eventType === 'wedding_change')
        ) {
          addToast({
            type: eventType as WeddingUIEventType,
            data,
            timestamp: new Date(),
            onDismiss: () => removeToast(''),
            priority: eventType === 'emergency_alert' ? 'critical' : 'high',
          });
        }
      },
      priority: 'high',
    });
  }, [
    realtime.isConnected,
    weddingId,
    addActivity,
    addToast,
    removeToast,
    isWeddingDay,
  ]);

  // Mock metrics updates (in real app, this would come from actual monitoring)
  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          uptime: realtime.isConnected
            ? Math.min(100, prev.metrics.uptime + 0.01)
            : Math.max(0, prev.metrics.uptime - 0.5),
          errorRate: Math.max(
            0,
            prev.metrics.errorRate + (Math.random() - 0.7) * 0.1,
          ),
        },
      }));
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, realtime.isConnected]);

  // Update settings
  const updateSettings = useCallback(
    (key: keyof RealtimeStatusPanelState['settings'], value: boolean) => {
      setState((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          [key]: value,
        },
      }));
    },
    [],
  );

  // Play notification sound
  const playNotificationSound = useCallback((eventType: WeddingUIEventType) => {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      try {
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Different tones for different event types
        const frequency =
          eventType === 'emergency_alert'
            ? 880
            : eventType === 'wedding_change'
              ? 660
              : 440;

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.5,
        );

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (error) {
        console.warn('Could not play notification sound:', error);
      }
    }
  }, []);

  // Handle manual retry
  const handleRetry = useCallback(() => {
    setState((prev) => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        reconnectCount: prev.metrics.reconnectCount + 1,
      },
    }));

    if (realtime.retry) {
      realtime.retry();
    }
  }, [realtime.retry]);

  // Render activity item
  const renderActivity = useCallback(
    (activity: UIRealtimeActivity) => {
      const activityType =
        ACTIVITY_TYPES[activity.type as keyof typeof ACTIVITY_TYPES] ||
        ACTIVITY_TYPES.form_response;
      const Icon = activityType.icon;

      return (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer',
            'hover:bg-gray-50 border border-transparent hover:border-gray-200',
            activity.priority === 'critical' && 'bg-red-50 border-red-200',
            activity.priority === 'high' && 'bg-amber-50 border-amber-200',
          )}
          onClick={() => onActivityClick?.(activity)}
        >
          <div
            className={cn(
              'flex-shrink-0 p-2 rounded-full',
              `bg-${activityType.color}-100`,
            )}
          >
            <Icon className={cn('h-4 w-4', `text-${activityType.color}-600`)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900">
                {activityType.label}
              </p>
              {activity.priority === 'critical' && (
                <Badge variant="destructive" className="text-xs">
                  URGENT
                </Badge>
              )}
            </div>

            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {JSON.stringify(activity.data).slice(0, 100)}...
            </p>

            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>
                {formatDistanceToNow(new Date(activity.timestamp))} ago
              </span>
              <span>·</span>
              <span className="capitalize">{activity.source}</span>
              {isWeddingDay && (
                <>
                  <span>·</span>
                  <Heart className="h-3 w-3 text-pink-500" />
                  <span className="text-pink-600 font-medium">Wedding Day</span>
                </>
              )}
            </div>
          </div>
        </motion.div>
      );
    },
    [onActivityClick, isWeddingDay],
  );

  // Render metrics card
  const renderMetricsCard = useCallback(
    (metric: keyof typeof PERFORMANCE_METRICS) => {
      const config = PERFORMANCE_METRICS[metric];
      const value = metrics[metric];
      const isGood = value <= config.threshold || metric === 'uptime';
      const Icon = config.icon;

      return (
        <Card key={metric} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon
                className={cn(
                  'h-4 w-4',
                  isGood ? 'text-green-600' : 'text-red-600',
                )}
              />
              <span className="text-sm font-medium">{config.label}</span>
            </div>
            <Badge variant={isGood ? 'default' : 'destructive'}>
              {value.toFixed(metric === 'uptime' ? 2 : 0)}
              {config.unit}
            </Badge>
          </div>
          {metric === 'uptime' && (
            <Progress value={value} className="mt-2 h-2" />
          )}
        </Card>
      );
    },
    [metrics],
  );

  // Compact view for mobile
  if (state.settings.compactView) {
    return (
      <div className={cn('fixed bottom-4 right-4 z-50', className)}>
        <RealtimeIndicator
          connected={realtime.isConnected}
          lastUpdate={realtime.lastHeartbeat}
          messageCount={state.activities.length}
          compact={true}
          weddingDayMode={isWeddingDay}
          connectionQuality={connectionQuality}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  return (
    <>
      {/* Main Status Panel */}
      <Card
        className={cn(
          'w-full max-w-4xl mx-auto',
          isWeddingDay && 'ring-2 ring-purple-200 shadow-lg',
          className,
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RealtimeIndicator
                connected={realtime.isConnected}
                lastUpdate={realtime.lastHeartbeat}
                messageCount={state.activities.length}
                size="sm"
                weddingDayMode={isWeddingDay}
                connectionQuality={connectionQuality}
                onRetry={handleRetry}
              />
              <div>
                <CardTitle className="text-lg">Realtime Status</CardTitle>
                <CardDescription>
                  {isWeddingDay
                    ? 'Wedding Day Mode Active'
                    : 'Live wedding updates and notifications'}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    isExpanded: !prev.isExpanded,
                  }))
                }
              >
                {state.isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRetry}
                disabled={realtime.isConnected}
              >
                <RefreshCw
                  className={cn(
                    'h-4 w-4',
                    !realtime.isConnected && 'animate-spin',
                  )}
                />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="activity" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Recent Activity</h3>
                <Badge variant="secondary">
                  {state.activities.length} events
                </Badge>
              </div>

              <ScrollArea className="h-96">
                <AnimatePresence>
                  {state.activities.length > 0 ? (
                    state.activities.map(renderActivity)
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No recent activity</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Wedding updates will appear here
                      </p>
                    </div>
                  )}
                </AnimatePresence>
              </ScrollArea>
            </TabsContent>

            {/* Metrics Tab */}
            <TabsContent value="metrics" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.keys(PERFORMANCE_METRICS).map((metric) =>
                  renderMetricsCard(metric as keyof typeof PERFORMANCE_METRICS),
                )}
              </div>

              {state.settings.showDebugInfo && (
                <Card className="mt-4 p-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Debug Information
                  </h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Active Channels: {realtime.activeChannels.length}</div>
                    <div>Messages Sent: {metrics.messagesSent}</div>
                    <div>Messages Received: {metrics.messagesReceived}</div>
                    <div>Reconnect Attempts: {metrics.reconnectCount}</div>
                    <div>Connection Quality: {connectionQuality}</div>
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">
                      Auto-hide Toasts
                    </label>
                    <p className="text-xs text-gray-500">
                      Automatically dismiss notifications
                    </p>
                  </div>
                  <Switch
                    checked={state.settings.autoHideToasts}
                    onCheckedChange={(checked) =>
                      updateSettings('autoHideToasts', checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">
                      Sound Notifications
                    </label>
                    <p className="text-xs text-gray-500">
                      Play sound for important events
                    </p>
                  </div>
                  <Switch
                    checked={state.settings.soundNotifications}
                    onCheckedChange={(checked) =>
                      updateSettings('soundNotifications', checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">
                      Wedding Day Mode
                    </label>
                    <p className="text-xs text-gray-500">
                      Enhanced monitoring for wedding days
                    </p>
                  </div>
                  <Switch
                    checked={state.settings.weddingDayMode}
                    onCheckedChange={(checked) =>
                      updateSettings('weddingDayMode', checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Compact View</label>
                    <p className="text-xs text-gray-500">
                      Minimize panel for mobile
                    </p>
                  </div>
                  <Switch
                    checked={state.settings.compactView}
                    onCheckedChange={(checked) =>
                      updateSettings('compactView', checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">
                      Debug Information
                    </label>
                    <p className="text-xs text-gray-500">
                      Show technical details
                    </p>
                  </div>
                  <Switch
                    checked={state.settings.showDebugInfo}
                    onCheckedChange={(checked) =>
                      updateSettings('showDebugInfo', checked)
                    }
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Toast Container */}
      <RealtimeToastContainer toasts={state.toasts} position={position} />
    </>
  );
}

// Wedding-specific status panel with preset configuration
export function WeddingRealtimeStatusPanel({
  weddingId,
  isWeddingDay = false,
  ...props
}: {
  weddingId: string;
  isWeddingDay?: boolean;
} & Partial<UIRealtimeStatusPanelProps>) {
  // Check if it's actually wedding day (Saturday)
  const actualWeddingDay = new Date().getDay() === 6;

  return (
    <RealtimeStatusPanel
      weddingId={weddingId}
      weddingDayMode={isWeddingDay || actualWeddingDay}
      maxActivities={actualWeddingDay ? 100 : 50} // More activities on wedding day
      maxToasts={actualWeddingDay ? 10 : 5} // More toasts on wedding day
      refreshInterval={actualWeddingDay ? 2000 : 5000} // Faster refresh on wedding day
      {...props}
    />
  );
}
