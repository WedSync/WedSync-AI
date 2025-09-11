'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Clock,
  Phone,
  Mail,
  Calendar,
  Users,
  Camera,
  Navigation,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ScheduleEvent {
  id: string;
  title: string;
  type: 'wedding' | 'engagement' | 'consultation';
  startTime: string;
  endTime: string;
  location?: string;
  address?: string;
  client: {
    name: string;
    phone?: string;
    email?: string;
  };
  status: 'confirmed' | 'pending' | 'completed';
  notes?: string;
}

interface MobileScheduleViewProps {
  schedule: ScheduleEvent[];
  selectedDate: string;
  loading: boolean;
  onDateSelect: (date: string) => void;
}

export function MobileScheduleView({
  schedule,
  selectedDate,
  loading,
  onDateSelect,
}: MobileScheduleViewProps) {
  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'wedding':
        return Calendar;
      case 'engagement':
        return Users;
      case 'consultation':
        return Camera;
      default:
        return Calendar;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'completed':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const formatTime = (timeString: string) => {
    try {
      return format(parseISO(timeString), 'h:mm a');
    } catch {
      return timeString;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!schedule || schedule.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No events scheduled
        </h3>
        <p className="text-gray-600">
          You don't have any events scheduled for{' '}
          {format(parseISO(selectedDate), 'MMMM d, yyyy')}.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {schedule.map((event) => {
        const EventIcon = getEventTypeIcon(event.type);

        return (
          <Card
            key={event.id}
            className="p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start space-x-3">
              {/* Event Type Icon */}
              <div className="flex-shrink-0 w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                <EventIcon className="w-6 h-6 text-pink-600" />
              </div>

              {/* Event Details */}
              <div className="flex-1 min-w-0">
                {/* Title and Status */}
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {event.title}
                  </h3>
                  <Badge
                    className={`ml-2 ${getStatusColor(event.status)} border`}
                  >
                    {event.status}
                  </Badge>
                </div>

                {/* Time */}
                <div className="flex items-center text-gray-600 mb-2">
                  <Clock className="w-4 h-4 mr-2" />
                  <span className="text-sm">
                    {formatTime(event.startTime)} - {formatTime(event.endTime)}
                  </span>
                </div>

                {/* Client */}
                <div className="flex items-center text-gray-600 mb-2">
                  <Users className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">
                    {event.client.name}
                  </span>
                </div>

                {/* Location */}
                {event.location && (
                  <div className="flex items-start text-gray-600 mb-3">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <div className="font-medium">{event.location}</div>
                      {event.address && (
                        <div className="text-gray-500">{event.address}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {event.notes && (
                  <div className="text-sm text-gray-600 mb-3 bg-gray-50 p-2 rounded">
                    {event.notes}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  {event.client.phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      asChild
                    >
                      <a href={`tel:${event.client.phone}`}>
                        <Phone className="w-3 h-3 mr-1" />
                        Call
                      </a>
                    </Button>
                  )}

                  {event.client.email && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      asChild
                    >
                      <a href={`mailto:${event.client.email}`}>
                        <Mail className="w-3 h-3 mr-1" />
                        Email
                      </a>
                    </Button>
                  )}

                  {event.address && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      asChild
                    >
                      <a
                        href={`https://maps.apple.com/?q=${encodeURIComponent(event.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Navigation className="w-3 h-3 mr-1" />
                        Navigate
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
