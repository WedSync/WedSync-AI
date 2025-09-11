'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  MapPin,
  Phone,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  Navigation,
  Camera,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScheduleEvent } from '@/types/supplier';
import { useSupplierSchedule } from '@/hooks/useSupplierSchedule';

interface TodayEventsProps {
  events: ScheduleEvent[];
  loading: boolean;
}

export function TodayEvents({ events, loading }: TodayEventsProps) {
  const router = useRouter();
  const { updateEventStatus, confirmAvailability } = useSupplierSchedule();
  const [updating, setUpdating] = useState<string | null>(null);

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'conflict':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusUpdate = async (eventId: string, status: string) => {
    try {
      setUpdating(eventId);
      await updateEventStatus(eventId, status);
    } catch (error) {
      console.error('Failed to update event status:', error);
    } finally {
      setUpdating(null);
    }
  };

  const handleConfirmAvailability = async (eventId: string) => {
    try {
      setUpdating(eventId);
      await confirmAvailability(eventId);
    } catch (error) {
      console.error('Failed to confirm availability:', error);
    } finally {
      setUpdating(null);
    }
  };

  const openDirections = (location?: string) => {
    if (!location) return;

    // Try to open in native maps app
    const encodedLocation = encodeURIComponent(location);
    const mapsUrl = `https://maps.apple.com/maps?q=${encodedLocation}`;
    const googleMapsUrl = `https://www.google.com/maps/search/${encodedLocation}`;

    // Detect iOS/Android and open appropriate maps app
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);

    if (isIOS) {
      window.open(mapsUrl, '_blank');
    } else if (isAndroid) {
      window.open(googleMapsUrl, '_blank');
    } else {
      window.open(googleMapsUrl, '_blank');
    }
  };

  const callClient = (phone?: string) => {
    if (phone) {
      window.open(`tel:${phone}`, '_self');
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Today's Events
          </h2>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-600" />
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-gray-200 rounded-lg" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Today's Events
        </h2>
        <div className="text-gray-500 mb-4">
          <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No events scheduled for today</p>
          <p className="text-sm">Enjoy your free day!</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/supplier-portal/schedule')}
          className="text-pink-600 border-pink-200 hover:bg-pink-50"
        >
          View Full Schedule
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Today's Events ({events.length})
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/supplier-portal/schedule')}
          className="text-pink-600"
        >
          View All
        </Button>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className={cn(
              'border rounded-lg p-4 space-y-3 transition-all duration-200',
              'touch-manipulation active:scale-[0.98]',
              event.status === 'conflict' && 'border-red-200 bg-red-50',
              event.status === 'confirmed' && 'border-green-200 bg-green-50',
              event.status === 'pending' && 'border-yellow-200 bg-yellow-50',
              event.status === 'in_progress' && 'border-blue-200 bg-blue-50',
            )}
          >
            {/* Event header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 truncate">
                  {event.title}
                </h3>
                <p className="text-sm text-gray-600 truncate">
                  {event.client_name}
                </p>
              </div>
              <Badge className={getStatusColor(event.status)}>
                {event.status}
              </Badge>
            </div>

            {/* Time and location */}
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>
                  {formatTime(event.start_time)} - {formatTime(event.end_time)}
                </span>
              </div>
              {event.location && (
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              {event.status === 'pending' && (
                <Button
                  size="sm"
                  onClick={() => handleConfirmAvailability(event.id)}
                  disabled={updating === event.id}
                  className="bg-green-600 hover:bg-green-700 text-white h-8"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Confirm
                </Button>
              )}

              {event.status === 'confirmed' && (
                <Button
                  size="sm"
                  onClick={() => handleStatusUpdate(event.id, 'in_progress')}
                  disabled={updating === event.id}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-8"
                >
                  Start Event
                </Button>
              )}

              {event.status === 'in_progress' && (
                <Button
                  size="sm"
                  onClick={() => handleStatusUpdate(event.id, 'completed')}
                  disabled={updating === event.id}
                  className="bg-gray-600 hover:bg-gray-700 text-white h-8"
                >
                  Complete
                </Button>
              )}

              {event.location && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openDirections(event.location)}
                  className="h-8"
                >
                  <Navigation className="w-3 h-3 mr-1" />
                  Directions
                </Button>
              )}

              {event.client_contact && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => callClient(event.client_contact)}
                  className="h-8"
                >
                  <Phone className="w-3 h-3 mr-1" />
                  Call
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  router.push(`/supplier-portal/photo-capture/${event.id}`)
                }
                className="h-8"
              >
                <Camera className="w-3 h-3 mr-1" />
                Photo
              </Button>

              {event.status === 'conflict' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    router.push(
                      `/supplier-portal/schedule/conflicts/${event.id}`,
                    )
                  }
                  className="h-8 text-red-600 border-red-300 hover:bg-red-50"
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Resolve
                </Button>
              )}
            </div>

            {/* Special requirements */}
            {event.special_requirements &&
              event.special_requirements.length > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">
                    Special Requirements:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {event.special_requirements.map((req, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs"
                      >
                        {req}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
          </div>
        ))}
      </div>
    </Card>
  );
}
