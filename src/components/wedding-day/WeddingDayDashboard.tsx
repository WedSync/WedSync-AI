'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRealtimePresence } from '@/lib/supabase/realtime';
import {
  CalendarDays,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Wifi,
  WifiOff,
  Bell,
  Settings,
  RefreshCw,
  Maximize2,
  Phone,
  MessageCircle,
  Cloud,
  Sun,
  CloudRain,
  Wind,
  Thermometer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type {
  WeddingDayCoordination,
  VendorCheckIn,
  TimelineEvent,
  WeddingDayIssue,
  CoordinatorPresence,
  RealtimeUpdate,
} from '@/types/wedding-day';
import { WeddingDayTimeline } from './WeddingDayTimeline';
import { VendorCheckInHub } from './VendorCheckInHub';
import { IssueTrackingPanel } from './IssueTrackingPanel';
import { WeatherWidget } from './WeatherWidget';
import { CoordinatorPresencePanel } from './CoordinatorPresencePanel';
import { OfflineSyncStatus } from './OfflineSyncStatus';
import { useWeddingDayOffline } from '@/hooks/useWeddingDayOffline';
import { useWeddingDaySyncManager } from '@/lib/offline/wedding-day-sync-manager';

interface WeddingDayDashboardProps {
  weddingId: string;
  coordinatorId: string;
  className?: string;
}

export function WeddingDayDashboard({
  weddingId,
  coordinatorId,
  className,
}: WeddingDayDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<RealtimeUpdate[]>([]);
  const channelRef = useRef<any>(null);
  const supabase = await createClient();

  // Use offline hook for data management
  const {
    isOnline,
    syncStatus,
    vendors,
    timeline,
    issues,
    weather,
    coordinatorPresence,
    onVendorCheckIn,
    onVendorStatusUpdate,
    onTimelineEventUpdate,
    onIssueCreate,
    onIssueUpdate,
    refreshData,
  } = useWeddingDayOffline({ weddingId, coordinatorId });

  // Use sync manager for offline/online synchronization
  const syncManager = useWeddingDaySyncManager(weddingId, coordinatorId);

  // Real-time presence tracking
  const { onlineUsers } = useRealtimePresence(
    `wedding-day:${weddingId}`,
    coordinatorId,
    {
      role: 'coordinator',
      weddingId,
      view: 'dashboard',
    },
  );

  // Initialize dashboard data
  useEffect(() => {
    setIsLoading(false); // Data is managed by useWeddingDayOffline hook
  }, [weddingId]);

  // Set up real-time connection
  useEffect(() => {
    if (!weddingId) return;

    const channel = supabase.channel(`wedding-day:${weddingId}`, {
      config: {
        broadcast: { ack: true },
        presence: { key: coordinatorId },
      },
    });

    // Subscribe to vendor check-ins
    channel.on('broadcast', { event: 'vendor_checkin' }, (payload) => {
      handleRealtimeUpdate('vendor_checkin', payload.payload);
    });

    // Subscribe to timeline updates
    channel.on('broadcast', { event: 'timeline_update' }, (payload) => {
      handleRealtimeUpdate('timeline_update', payload.payload);
    });

    // Subscribe to issue reports
    channel.on('broadcast', { event: 'issue_created' }, (payload) => {
      handleRealtimeUpdate('issue_created', payload.payload);
    });

    channel.on('broadcast', { event: 'issue_resolved' }, (payload) => {
      handleRealtimeUpdate('issue_resolved', payload.payload);
    });

    // Subscribe to weather alerts
    channel.on('broadcast', { event: 'weather_alert' }, (payload) => {
      handleRealtimeUpdate('weather_alert', payload.payload);
    });

    // Subscribe to emergency alerts
    channel.on('broadcast', { event: 'emergency_alert' }, (payload) => {
      handleRealtimeUpdate('emergency_alert', payload.payload);
    });

    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED');
      if (status === 'SUBSCRIBED') {
        setLastSync(new Date());
        // Track coordinator presence
        channel.track({
          coordinatorId,
          role: 'lead',
          status: 'active',
          view: 'dashboard',
          timestamp: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [weddingId, coordinatorId, supabase]);

  const handleRealtimeUpdate = (type: RealtimeUpdate['type'], data: any) => {
    const update: RealtimeUpdate = {
      type,
      data,
      timestamp: new Date().toISOString(),
      userId: data.userId || 'system',
      weddingId,
      priority: data.priority || 'medium',
    };

    // Add to notifications
    setNotifications((prev) => [update, ...prev.slice(0, 9)]); // Keep last 10

    // The offline hook will handle updating the local state
    // Real-time updates are automatically integrated with the offline store
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-primary-600" />
          <span className="text-gray-600">
            Loading wedding day dashboard...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900">
            Unable to load wedding day data
          </p>
          <p className="text-gray-600 mt-1">{error}</p>
        </div>
        <button onClick={refreshData} className="btn btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  const getStatusColor = (status: WeddingDayCoordination['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'planning':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate metrics from offline data
  const checkedInVendors = vendors.filter(
    (v) => v.status === 'checked-in' || v.status === 'on-site',
  ).length;
  const completedEvents = timeline.filter(
    (e) => e.status === 'completed',
  ).length;
  const openIssues = issues.filter(
    (i) => i.status === 'open' || i.status === 'in-progress',
  ).length;
  const criticalIssues = issues.filter(
    (i) => i.severity === 'critical' && i.status !== 'resolved',
  ).length;

  // Mock coordination status (in a real app this would come from your API)
  const coordinationStatus = 'active';

  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-6 h-6 text-primary-600" />
                <h1 className="text-xl font-semibold text-gray-900">
                  Wedding Day Coordination
                </h1>
              </div>
              <div
                className={cn(
                  'px-2 py-1 text-xs font-medium rounded-full',
                  getStatusColor(coordinationStatus),
                )}
              >
                {coordinationStatus.replace('_', ' ').toUpperCase()}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Offline Sync Status */}
              <OfflineSyncStatus
                syncManager={syncManager}
                compact={true}
                className="flex-shrink-0"
              />

              {/* Settings */}
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Issues Alert */}
      {criticalIssues > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <p className="ml-3 text-sm text-red-700">
                <strong>Critical Alert:</strong> {criticalIssues} critical issue
                {criticalIssues > 1 ? 's' : ''} require immediate attention
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Vendors Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Vendors</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {checkedInVendors}/{vendors.length}
                </p>
                <p className="text-xs text-gray-500">checked in</p>
              </div>
            </div>
          </div>

          {/* Timeline Progress */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Timeline</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {completedEvents}/{timeline.length}
                </p>
                <p className="text-xs text-gray-500">completed</p>
              </div>
            </div>
          </div>

          {/* Issues Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle
                  className={cn(
                    'w-8 h-8',
                    openIssues > 0 ? 'text-yellow-600' : 'text-gray-400',
                  )}
                />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Issues</p>
                <p
                  className={cn(
                    'text-2xl font-semibold',
                    openIssues > 0 ? 'text-yellow-600' : 'text-gray-900',
                  )}
                >
                  {openIssues}
                </p>
                <p className="text-xs text-gray-500">open</p>
              </div>
            </div>
          </div>

          {/* Overall Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle2
                  className={cn(
                    'w-8 h-8',
                    coordinationStatus === 'active'
                      ? 'text-green-600'
                      : 'text-gray-400',
                  )}
                />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">
                  {coordinationStatus === 'active'
                    ? 'On Track'
                    : coordinationStatus}
                </p>
                <p className="text-xs text-gray-500">
                  {format(new Date(), 'MMM d')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Timeline */}
          <div className="lg:col-span-2 space-y-6">
            <WeddingDayTimeline
              timeline={timeline}
              vendors={vendors}
              onTimelineUpdate={onTimelineEventUpdate}
            />
          </div>

          {/* Right Column - Panels */}
          <div className="space-y-6">
            {/* Weather Widget */}
            <WeatherWidget
              weather={weather}
              venue={{
                name: 'Wedding Venue',
                address: 'Main Street, City',
                coordinates: { lat: 40.7128, lng: -74.006 },
              }}
            />

            {/* Vendor Check-in Hub */}
            <VendorCheckInHub
              vendors={vendors}
              onVendorUpdate={(vendorId, update) => {
                // Use offline-capable handler
                if (update.status) {
                  onVendorStatusUpdate(vendorId, update.status, update.eta);
                }
              }}
            />

            {/* Issue Tracking */}
            <IssueTrackingPanel
              issues={issues}
              onIssueCreate={onIssueCreate}
              onIssueUpdate={onIssueUpdate}
            />

            {/* Detailed Offline Sync Status */}
            <OfflineSyncStatus syncManager={syncManager} compact={false} />

            {/* Coordinator Presence */}
            <CoordinatorPresencePanel
              onlineUsers={onlineUsers}
              currentUser={coordinatorId}
            />
          </div>
        </div>
      </div>

      {/* Notifications Overlay */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.slice(0, 3).map((notification, index) => (
            <div
              key={`${notification.timestamp}-${index}`}
              className={cn(
                'max-w-sm bg-white rounded-lg shadow-lg border-l-4 p-4 animate-slideIn',
                notification.priority === 'urgent' && 'border-red-500',
                notification.priority === 'high' && 'border-yellow-500',
                notification.priority === 'medium' && 'border-blue-500',
                notification.priority === 'low' && 'border-gray-500',
              )}
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <Bell
                    className={cn(
                      'w-5 h-5',
                      notification.priority === 'urgent' && 'text-red-600',
                      notification.priority === 'high' && 'text-yellow-600',
                      notification.priority === 'medium' && 'text-blue-600',
                      notification.priority === 'low' && 'text-gray-600',
                    )}
                  />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {notification.type.replace('_', ' ')}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {format(new Date(notification.timestamp), 'HH:mm:ss')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
