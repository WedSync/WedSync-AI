'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Clock,
  Camera,
  Users,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Phone,
  MessageSquare,
  Battery,
  Wifi,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmergencyPhotoGroups } from './EmergencyPhotoGroups';
import { PhotographerIntegrationHub } from '@/lib/integrations/photographerIntegration';
import { AdvancedPhotoGroupSync } from '@/lib/offline/advancedPhotoGroupSync';

interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  type: 'photo' | 'ceremony' | 'reception' | 'vendor' | 'break';
  status: 'upcoming' | 'in-progress' | 'completed' | 'delayed';
  location?: string;
  participants?: string[];
  notes?: string;
}

interface VendorStatus {
  id: string;
  name: string;
  role: string;
  status: 'on-site' | 'en-route' | 'delayed' | 'complete';
  arrivalTime?: string;
  contactNumber?: string;
}

interface SystemStatus {
  battery: number;
  network: 'excellent' | 'good' | 'poor' | 'offline';
  storage: number;
  syncStatus: 'synced' | 'syncing' | 'pending';
  lastSync?: Date;
}

export function WeddingDayMode() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [vendors, setVendors] = useState<VendorStatus[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    battery: 100,
    network: 'excellent',
    storage: 80,
    syncStatus: 'synced',
  });
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [activeEvent, setActiveEvent] = useState<TimelineEvent | null>(null);

  const photographerHub = new PhotographerIntegrationHub();
  const syncManager = new AdvancedPhotoGroupSync();

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      updateSystemStatus();
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Load wedding day timeline
  useEffect(() => {
    loadTimeline();
    loadVendorStatus();
    setupRealtimeUpdates();
  }, []);

  const loadTimeline = async () => {
    // Load from cache first for instant display
    const cached = localStorage.getItem('wedding_timeline');
    if (cached) {
      setTimeline(JSON.parse(cached));
    }

    // Then fetch latest from server
    try {
      const response = await fetch('/api/wedding/timeline');
      const data = await response.json();
      setTimeline(data);
      localStorage.setItem('wedding_timeline', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to load timeline:', error);
    }
  };

  const loadVendorStatus = async () => {
    try {
      const response = await fetch('/api/wedding/vendors');
      const data = await response.json();
      setVendors(data);
    } catch (error) {
      console.error('Failed to load vendor status:', error);
    }
  };

  const setupRealtimeUpdates = () => {
    // Setup WebSocket for real-time updates
    if ('WebSocket' in window) {
      const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!);

      ws.onmessage = (event) => {
        const update = JSON.parse(event.data);
        handleRealtimeUpdate(update);
      };
    }
  };

  const handleRealtimeUpdate = (update: any) => {
    switch (update.type) {
      case 'timeline_update':
        updateTimelineEvent(update.data);
        break;
      case 'vendor_status':
        updateVendorStatus(update.data);
        break;
      case 'emergency_alert':
        handleEmergencyAlert(update.data);
        break;
    }
  };

  const updateTimelineEvent = (event: TimelineEvent) => {
    setTimeline((prev) => prev.map((e) => (e.id === event.id ? event : e)));
  };

  const updateVendorStatus = (vendor: VendorStatus) => {
    setVendors((prev) => prev.map((v) => (v.id === vendor.id ? vendor : v)));
  };

  const handleEmergencyAlert = (alert: any) => {
    setEmergencyMode(true);
    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Wedding Emergency Alert', {
        body: alert.message,
        icon: '/icons/emergency-192x192.png',
        vibrate: [200, 100, 200],
      });
    }
  };

  const updateSystemStatus = () => {
    // Battery status
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setSystemStatus((prev) => ({
          ...prev,
          battery: Math.round(battery.level * 100),
        }));
      });
    }

    // Network status
    const connection = (navigator as any).connection;
    if (connection) {
      const effectiveType = connection.effectiveType;
      setSystemStatus((prev) => ({
        ...prev,
        network:
          effectiveType === '4g'
            ? 'excellent'
            : effectiveType === '3g'
              ? 'good'
              : effectiveType === '2g'
                ? 'poor'
                : 'offline',
      }));
    }

    // Sync status
    const syncStatus = syncManager.getSyncStatus();
    setSystemStatus((prev) => ({
      ...prev,
      syncStatus: syncStatus.isSyncing
        ? 'syncing'
        : syncStatus.pendingOperations > 0
          ? 'pending'
          : 'synced',
      lastSync: syncStatus.lastSync || undefined,
    }));
  };

  const startEventNow = (event: TimelineEvent) => {
    setActiveEvent(event);
    updateTimelineEvent({ ...event, status: 'in-progress' });

    // Notify relevant parties
    if (event.type === 'photo') {
      notifyPhotographer(event);
    }
  };

  const completeEvent = (event: TimelineEvent) => {
    updateTimelineEvent({ ...event, status: 'completed' });
    setActiveEvent(null);

    // Move to next event
    const nextEvent = timeline.find((e) => e.status === 'upcoming');
    if (nextEvent) {
      setActiveEvent(nextEvent);
    }
  };

  const notifyPhotographer = async (event: TimelineEvent) => {
    await fetch('/api/notifications/photographer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        message: `Time for: ${event.title} at ${event.location}`,
      }),
    });
  };

  const getNetworkIcon = () => {
    switch (systemStatus.network) {
      case 'excellent':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'good':
        return <Wifi className="h-4 w-4 text-yellow-600" />;
      case 'poor':
        return <Wifi className="h-4 w-4 text-orange-600" />;
      default:
        return <Wifi className="h-4 w-4 text-red-600" />;
    }
  };

  if (emergencyMode) {
    return <EmergencyPhotoGroups />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* Header with Status Bar */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900">
                Wedding Day Control
              </h1>
              <div className="text-2xl font-mono text-gray-700">
                {format(currentTime, 'HH:mm')}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* System Status */}
              <div className="flex items-center gap-2 text-sm">
                <Battery className="h-4 w-4" />
                <span>{systemStatus.battery}%</span>
              </div>
              {getNetworkIcon()}
              <Badge
                variant={
                  systemStatus.syncStatus === 'synced' ? 'success' : 'warning'
                }
              >
                {systemStatus.syncStatus}
              </Badge>

              {/* Emergency Button */}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setEmergencyMode(true)}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Emergency
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current/Next Event */}
          <div className="lg:col-span-2">
            {activeEvent && (
              <Card className="mb-6 border-2 border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Currently Active</span>
                    <Badge variant="default" className="animate-pulse">
                      IN PROGRESS
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">
                        {activeEvent.title}
                      </h3>
                      <span className="text-lg font-mono">
                        {activeEvent.time}
                      </span>
                    </div>
                    {activeEvent.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        {activeEvent.location}
                      </div>
                    )}
                    {activeEvent.participants && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4" />
                        {activeEvent.participants.join(', ')}
                      </div>
                    )}
                    <div className="flex gap-2 mt-4">
                      <Button
                        className="flex-1"
                        onClick={() => completeEvent(activeEvent)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Complete
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Send Update
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Today\'s Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {timeline.map((event) => (
                    <div
                      key={event.id}
                      className={`p-3 rounded-lg border ${
                        event.status === 'completed'
                          ? 'bg-gray-50 opacity-60'
                          : event.status === 'in-progress'
                            ? 'bg-blue-50 border-blue-300'
                            : event.status === 'delayed'
                              ? 'bg-red-50 border-red-300'
                              : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-medium">
                            {event.time}
                          </span>
                          <div>
                            <div className="font-medium">{event.title}</div>
                            {event.location && (
                              <div className="text-xs text-gray-500">
                                {event.location}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              event.status === 'completed'
                                ? 'success'
                                : event.status === 'in-progress'
                                  ? 'default'
                                  : event.status === 'delayed'
                                    ? 'destructive'
                                    : 'secondary'
                            }
                          >
                            {event.status}
                          </Badge>
                          {event.status === 'upcoming' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEventNow(event)}
                            >
                              Start Now
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vendor Status Panel */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Vendor Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {vendors.map((vendor) => (
                    <div key={vendor.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium">{vendor.name}</div>
                          <div className="text-xs text-gray-500">
                            {vendor.role}
                          </div>
                        </div>
                        <Badge
                          variant={
                            vendor.status === 'on-site'
                              ? 'success'
                              : vendor.status === 'en-route'
                                ? 'default'
                                : vendor.status === 'delayed'
                                  ? 'destructive'
                                  : 'secondary'
                          }
                        >
                          {vendor.status}
                        </Badge>
                      </div>
                      {vendor.contactNumber && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() =>
                            (window.location.href = `tel:${vendor.contactNumber}`)
                          }
                        >
                          <Phone className="h-3 w-3 mr-1" />
                          Call
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm">
                    <Camera className="h-4 w-4 mr-1" />
                    Photo Groups
                  </Button>
                  <Button variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-1" />
                    Guest List
                  </Button>
                  <Button variant="outline" size="sm">
                    <MapPin className="h-4 w-4 mr-1" />
                    Venues
                  </Button>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Messages
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
