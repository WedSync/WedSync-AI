'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  Clock,
  MapPin,
  User,
  AlertCircle,
  Calendar,
  Phone,
  Navigation,
  Camera,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useSupplierSchedule } from '@/hooks/useSupplierSchedule';
import { ScheduleEvent } from '@/types/supplier';

export default function ScheduleConfirmationPage() {
  const router = useRouter();
  const {
    todayEvents,
    upcomingBookings,
    confirmAvailability,
    updateEventStatus,
    loading,
  } = useSupplierSchedule();
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [confirmingAll, setConfirmingAll] = useState(false);

  // Combine today's events and upcoming events that need confirmation
  const eventsNeedingConfirmation = [
    ...todayEvents.filter((e) => e.status === 'pending'),
    // Add upcoming events from bookings that need confirmation
  ];

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleEventSelection = (eventId: string, selected: boolean) => {
    if (selected) {
      setSelectedEvents((prev) => [...prev, eventId]);
    } else {
      setSelectedEvents((prev) => prev.filter((id) => id !== eventId));
    }
  };

  const handleSelectAll = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedEvents(eventsNeedingConfirmation.map((e) => e.id));
    } else {
      setSelectedEvents([]);
    }
  };

  const handleConfirmSelected = async () => {
    setConfirmingAll(true);
    try {
      for (const eventId of selectedEvents) {
        await confirmAvailability(eventId);
        // Add notes if provided
        if (notes[eventId]) {
          // You would typically update event notes via API here
        }
      }

      // Show success feedback
      alert('Events confirmed successfully!');
      router.push('/supplier-portal');
    } catch (error) {
      console.error('Failed to confirm events:', error);
      alert('Failed to confirm some events. Please try again.');
    } finally {
      setConfirmingAll(false);
    }
  };

  const handleReportIssue = (event: ScheduleEvent) => {
    router.push(`/supplier-portal/schedule/conflicts/new?eventId=${event.id}`);
  };

  const openDirections = (location?: string) => {
    if (!location) return;

    const encodedLocation = encodeURIComponent(location);
    const mapsUrl = `https://maps.apple.com/maps?q=${encodedLocation}`;
    const googleMapsUrl = `https://www.google.com/maps/search/${encodedLocation}`;

    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);

    if (isIOS) {
      window.open(mapsUrl, '_blank');
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
      <div className="space-y-4 py-4">
        <Card className="p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto" />
          <p className="text-center text-gray-600 mt-2">Loading events...</p>
        </Card>
      </div>
    );
  }

  if (eventsNeedingConfirmation.length === 0) {
    return (
      <div className="space-y-4 py-4">
        <Card className="p-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            All Caught Up!
          </h2>
          <p className="text-gray-600 mb-4">
            No events requiring confirmation at this time.
          </p>
          <Button onClick={() => router.push('/supplier-portal')}>
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Confirm Availability
            </h1>
            <p className="text-sm text-gray-600">
              {eventsNeedingConfirmation.length} event
              {eventsNeedingConfirmation.length > 1 ? 's' : ''} need
              {eventsNeedingConfirmation.length === 1 ? 's' : ''} confirmation
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleSelectAll(
                  selectedEvents.length !== eventsNeedingConfirmation.length,
                )
              }
              className="text-xs"
            >
              {selectedEvents.length === eventsNeedingConfirmation.length
                ? 'Deselect All'
                : 'Select All'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Events List */}
      <div className="space-y-3">
        {eventsNeedingConfirmation.map((event) => {
          const isSelected = selectedEvents.includes(event.id);

          return (
            <Card
              key={event.id}
              className={cn(
                'p-4 transition-all duration-200',
                isSelected && 'ring-2 ring-pink-500 border-pink-300',
              )}
            >
              {/* Selection toggle */}
              <div className="flex items-start space-x-3 mb-4">
                <div className="pt-1">
                  <Switch
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      handleEventSelection(event.id, checked)
                    }
                    className="data-[state=checked]:bg-pink-600"
                  />
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {event.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {event.client_name}
                      </p>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      Pending Confirmation
                    </Badge>
                  </div>

                  {/* Event details */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(event.start_time)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {formatTime(event.start_time)} -{' '}
                          {formatTime(event.end_time)}
                        </span>
                      </div>
                    </div>

                    {event.location && (
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{event.location}</span>
                      </div>
                    )}

                    {event.description && (
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {event.description}
                      </p>
                    )}
                  </div>

                  {/* Special requirements */}
                  {event.special_requirements &&
                    event.special_requirements.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-1">
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

                  {/* Notes input for selected events */}
                  {isSelected && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Add notes (optional):
                      </label>
                      <Textarea
                        placeholder="Any special preparations or notes for this event..."
                        value={notes[event.id] || ''}
                        onChange={(e) =>
                          setNotes((prev) => ({
                            ...prev,
                            [event.id]: e.target.value,
                          }))
                        }
                        className="h-16 text-sm"
                      />
                    </div>
                  )}

                  {/* Quick actions */}
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
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
                        Call Client
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReportIssue(event)}
                      className="h-8 text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Report Issue
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Confirmation Actions */}
      {selectedEvents.length > 0 && (
        <Card className="p-4 sticky bottom-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedEvents.length} event
              {selectedEvents.length > 1 ? 's' : ''} selected
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setSelectedEvents([])}
                disabled={confirmingAll}
              >
                Clear Selection
              </Button>

              <Button
                onClick={handleConfirmSelected}
                disabled={confirmingAll}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {confirmingAll ? 'Confirming...' : 'Confirm Selected'}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
