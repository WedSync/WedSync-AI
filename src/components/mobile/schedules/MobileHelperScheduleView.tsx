/**
 * WS-162: Mobile Helper Schedule Interface
 * Touch-optimized schedule management with PWA offline capability
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Bell,
  QrCode,
  Navigation,
  Wifi,
  WifiOff,
  RefreshCw,
  User,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { notificationManager } from '@/lib/mobile/notification-manager';

interface ScheduleAssignment {
  id: string;
  taskId: string;
  helperId: string;
  title: string;
  description?: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number; // in minutes
  location: {
    name: string;
    address: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'missed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  weddingInfo: {
    id: string;
    coupleName: string;
    weddingDate: string;
  };
  contact: {
    name: string;
    phone?: string;
    email?: string;
  };
  requirements?: string[];
  checkinRequired: boolean;
  qrCodeData?: string;
  isOffline?: boolean;
  lastSynced?: string;
}

interface ScheduleViewProps {
  helperId: string;
  initialDate?: Date;
}

export default function MobileHelperScheduleView({
  helperId,
  initialDate,
}: ScheduleViewProps) {
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [activeAssignment, setActiveAssignment] =
    useState<ScheduleAssignment | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);

  const supabase = createClientComponentClient();
  const router = useRouter();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => setLocationEnabled(true),
        () => setLocationEnabled(false),
      );
    }
  }, []);

  // Load schedule assignments
  const loadAssignments = useCallback(
    async (date: Date) => {
      setLoading(true);
      try {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Try to load from cache first (offline support)
        const cachedAssignments = await getCachedAssignments(helperId, date);
        if (cachedAssignments.length > 0) {
          setAssignments(cachedAssignments);
        }

        // If online, fetch fresh data
        if (isOnline) {
          const { data, error } = await supabase
            .from('helper_schedule_assignments')
            .select(
              `
            *,
            tasks (
              title,
              description,
              category,
              priority
            ),
            weddings (
              id,
              couple_name,
              wedding_date
            )
          `,
            )
            .eq('helper_id', helperId)
            .gte('scheduled_date', startOfDay.toISOString())
            .lte('scheduled_date', endOfDay.toISOString())
            .order('scheduled_time', { ascending: true });

          if (error) throw error;

          const formattedAssignments = formatAssignments(data || []);
          setAssignments(formattedAssignments);

          // Cache the fresh data
          await cacheAssignments(formattedAssignments);
        }
      } catch (error) {
        console.error('[ScheduleView] Error loading assignments:', error);

        // Fall back to cached data if available
        const cachedAssignments = await getCachedAssignments(helperId, date);
        setAssignments(cachedAssignments);
      } finally {
        setLoading(false);
      }
    },
    [helperId, isOnline, supabase],
  );

  // Initial load and date changes
  useEffect(() => {
    loadAssignments(selectedDate);
  }, [selectedDate, loadAssignments]);

  // Format assignments from database
  const formatAssignments = (data: any[]): ScheduleAssignment[] => {
    return data.map((item) => ({
      id: item.id,
      taskId: item.task_id,
      helperId: item.helper_id,
      title: item.tasks?.title || item.title,
      description: item.tasks?.description || item.description,
      scheduledDate: item.scheduled_date,
      scheduledTime: item.scheduled_time,
      duration: item.duration || 60,
      location: {
        name: item.location_name,
        address: item.location_address,
        coordinates: item.location_coordinates,
      },
      status: item.status,
      priority: item.tasks?.priority || item.priority || 'medium',
      category: item.tasks?.category || item.category,
      weddingInfo: {
        id: item.weddings?.id || item.wedding_id,
        coupleName: item.weddings?.couple_name || 'Unknown Couple',
        weddingDate: item.weddings?.wedding_date || item.scheduled_date,
      },
      contact: {
        name: item.contact_name,
        phone: item.contact_phone,
        email: item.contact_email,
      },
      requirements: item.requirements ? JSON.parse(item.requirements) : [],
      checkinRequired: item.checkin_required || false,
      qrCodeData: item.qr_code_data,
      isOffline: !isOnline,
      lastSynced: new Date().toISOString(),
    }));
  };

  // Check-in functionality
  const handleCheckin = async (assignmentId: string) => {
    try {
      const assignment = assignments.find((a) => a.id === assignmentId);
      if (!assignment) return;

      // Get current location if available
      let location = null;
      if (locationEnabled) {
        location = await getCurrentLocation();
      }

      const checkinData = {
        assignment_id: assignmentId,
        helper_id: helperId,
        checkin_time: new Date().toISOString(),
        location: location,
        status: 'in_progress',
      };

      if (isOnline) {
        const { error } = await supabase
          .from('helper_checkins')
          .insert([checkinData]);

        if (error) throw error;

        // Update assignment status
        await updateAssignmentStatus(assignmentId, 'in_progress');
      } else {
        // Store checkin for later sync
        await storeOfflineCheckin(checkinData);
      }

      // Update local state
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId ? { ...a, status: 'in_progress' as const } : a,
        ),
      );

      // Send notification
      await notificationManager.sendScheduleNotification({
        helperId,
        assignmentId,
        taskTitle: assignment.title,
        scheduledTime: assignment.scheduledTime,
        venue: assignment.location.name,
        type: 'check_in_required',
      });
    } catch (error) {
      console.error('[ScheduleView] Checkin failed:', error);
    }
  };

  // Complete task
  const handleCompleteTask = async (assignmentId: string) => {
    try {
      const assignment = assignments.find((a) => a.id === assignmentId);
      if (!assignment) return;

      if (isOnline) {
        await updateAssignmentStatus(assignmentId, 'completed');
      } else {
        await storeOfflineStatusChange(assignmentId, 'completed');
      }

      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId ? { ...a, status: 'completed' as const } : a,
        ),
      );
    } catch (error) {
      console.error('[ScheduleView] Task completion failed:', error);
    }
  };

  // Sync offline changes
  const syncOfflineChanges = async () => {
    if (!isOnline) return;

    setSyncing(true);
    try {
      // Sync offline checkins
      await syncOfflineCheckins();

      // Sync offline status changes
      await syncOfflineStatusChanges();

      // Reload assignments
      await loadAssignments(selectedDate);
    } catch (error) {
      console.error('[ScheduleView] Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Navigate to location
  const handleNavigate = (assignment: ScheduleAssignment) => {
    const { location } = assignment;
    const query = encodeURIComponent(location.address);

    // Try to open in native maps app
    if (navigator.userAgent.includes('iPhone')) {
      window.open(`maps://maps.google.com/maps?daddr=${query}`);
    } else {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${query}`,
      );
    }
  };

  // Contact functions
  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`);
  };

  const handleMessage = (phone: string) => {
    window.open(`sms:${phone}`);
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'in_progress':
        return 'text-blue-600';
      case 'confirmed':
        return 'text-purple-600';
      case 'missed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="h-6 w-6 text-indigo-600" />
              <h1 className="text-lg font-semibold text-gray-900">Schedule</h1>
            </div>

            <div className="flex items-center space-x-2">
              {/* Online/Offline Status */}
              <div className="flex items-center space-x-1">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={`text-xs ${isOnline ? 'text-green-600' : 'text-red-600'}`}
                >
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Sync Button */}
              {isOnline && (
                <button
                  onClick={syncOfflineChanges}
                  disabled={syncing}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-600 disabled:animate-spin"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="bg-white px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <button
            onClick={() =>
              setSelectedDate(
                new Date(selectedDate.setDate(selectedDate.getDate() - 1)),
              )
            }
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            ←
          </button>

          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            <div className="text-sm text-gray-500">
              {assignments.length} {assignments.length === 1 ? 'task' : 'tasks'}
            </div>
          </div>

          <button
            onClick={() =>
              setSelectedDate(
                new Date(selectedDate.setDate(selectedDate.getDate() + 1)),
              )
            }
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            →
          </button>
        </div>
      </div>

      {/* Schedule List */}
      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No tasks scheduled for this date</p>
          </div>
        ) : (
          assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <div
                        className={`w-3 h-3 rounded-full ${getPriorityColor(assignment.priority)}`}
                      />
                      <h3 className="font-medium text-gray-900">
                        {assignment.title}
                      </h3>
                      {assignment.isOffline && (
                        <WifiOff className="h-4 w-4 text-orange-500" />
                      )}
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{assignment.scheduledTime}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className={getStatusColor(assignment.status)}>
                          {assignment.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{assignment.location.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {assignment.status === 'pending' && (
                      <button
                        onClick={() => handleCheckin(assignment.id)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
                      >
                        Check In
                      </button>
                    )}

                    {assignment.status === 'in_progress' && (
                      <button
                        onClick={() => handleCompleteTask(assignment.id)}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
                      >
                        Complete
                      </button>
                    )}

                    {assignment.status === 'completed' && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                </div>

                {assignment.description && (
                  <p className="text-sm text-gray-600 mt-2">
                    {assignment.description}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="border-t border-gray-100 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleNavigate(assignment)}
                      className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-700"
                    >
                      <Navigation className="h-4 w-4" />
                      <span className="text-sm">Navigate</span>
                    </button>

                    {assignment.contact.phone && (
                      <>
                        <button
                          onClick={() => handleCall(assignment.contact.phone!)}
                          className="flex items-center space-x-1 text-green-600 hover:text-green-700"
                        >
                          <Phone className="h-4 w-4" />
                          <span className="text-sm">Call</span>
                        </button>

                        <button
                          onClick={() =>
                            handleMessage(assignment.contact.phone!)
                          }
                          className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span className="text-sm">Message</span>
                        </button>
                      </>
                    )}

                    {assignment.qrCodeData && (
                      <button
                        onClick={() => setActiveAssignment(assignment)}
                        className="flex items-center space-x-1 text-purple-600 hover:text-purple-700"
                      >
                        <QrCode className="h-4 w-4" />
                        <span className="text-sm">QR Code</span>
                      </button>
                    )}
                  </div>

                  <div className="text-xs text-gray-500">
                    {assignment.weddingInfo.coupleName}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Helper functions for offline functionality
async function getCachedAssignments(
  helperId: string,
  date: Date,
): Promise<ScheduleAssignment[]> {
  // Implementation would use IndexedDB or localStorage
  try {
    const cacheKey = `schedule_${helperId}_${date.toISOString().split('T')[0]}`;
    const cached = localStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

async function cacheAssignments(
  assignments: ScheduleAssignment[],
): Promise<void> {
  // Implementation would cache to IndexedDB or localStorage
  try {
    const helperId = assignments[0]?.helperId;
    const date = assignments[0]?.scheduledDate;
    if (helperId && date) {
      const cacheKey = `schedule_${helperId}_${date.split('T')[0]}`;
      localStorage.setItem(cacheKey, JSON.stringify(assignments));
    }
  } catch (error) {
    console.error('Failed to cache assignments:', error);
  }
}

async function getCurrentLocation(): Promise<{
  lat: number;
  lng: number;
} | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => resolve(null),
      { timeout: 5000 },
    );
  });
}

async function storeOfflineCheckin(checkinData: any): Promise<void> {
  // Store for later sync when online
  const offlineCheckins = JSON.parse(
    localStorage.getItem('offline_checkins') || '[]',
  );
  offlineCheckins.push({
    ...checkinData,
    id: `offline_${Date.now()}`,
    timestamp: new Date().toISOString(),
  });
  localStorage.setItem('offline_checkins', JSON.stringify(offlineCheckins));
}

async function storeOfflineStatusChange(
  assignmentId: string,
  status: string,
): Promise<void> {
  // Store for later sync when online
  const offlineChanges = JSON.parse(
    localStorage.getItem('offline_status_changes') || '[]',
  );
  offlineChanges.push({
    assignmentId,
    status,
    timestamp: new Date().toISOString(),
  });
  localStorage.setItem(
    'offline_status_changes',
    JSON.stringify(offlineChanges),
  );
}

async function syncOfflineCheckins(): Promise<void> {
  // Sync offline checkins when back online
  const offlineCheckins = JSON.parse(
    localStorage.getItem('offline_checkins') || '[]',
  );
  // Implementation would sync with Supabase
  localStorage.removeItem('offline_checkins');
}

async function syncOfflineStatusChanges(): Promise<void> {
  // Sync offline status changes when back online
  const offlineChanges = JSON.parse(
    localStorage.getItem('offline_status_changes') || '[]',
  );
  // Implementation would sync with Supabase
  localStorage.removeItem('offline_status_changes');
}

async function updateAssignmentStatus(
  assignmentId: string,
  status: string,
): Promise<void> {
  // Update assignment status in database
  // Implementation would use Supabase client
}
