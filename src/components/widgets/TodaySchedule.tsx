'use client';

import React from 'react';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ScheduleItem {
  id: string;
  title: string;
  time: string;
  location?: string;
  attendees?: number;
  status: 'upcoming' | 'in-progress' | 'completed' | 'delayed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface TodayScheduleProps {
  items: ScheduleItem[];
  className?: string;
  compact?: boolean;
}

export function TodaySchedule({
  items,
  className,
  compact = false,
}: TodayScheduleProps) {
  const getStatusColor = (status: ScheduleItem['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delayed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'upcoming':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: ScheduleItem['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
      default:
        return 'text-gray-600';
    }
  };

  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  const isCurrentTime = (timeStr: string) => {
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;

    if (period?.toLowerCase() === 'pm' && hours !== 12) {
      hour24 += 12;
    } else if (period?.toLowerCase() === 'am' && hours === 12) {
      hour24 = 0;
    }

    return (
      Math.abs(hour24 - currentHour) < 1 &&
      Math.abs(minutes - currentMinute) < 30
    );
  };

  if (compact) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-sm font-medium">
            <Calendar className="w-4 h-4 mr-2" />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-center justify-between p-2 rounded-lg border',
                getStatusColor(item.status),
                isCurrentTime(item.time) && 'ring-2 ring-blue-500',
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.title}</p>
                <div className="flex items-center text-xs mt-1">
                  <Clock className="w-3 h-3 mr-1" />
                  {item.time}
                </div>
              </div>
              <div
                className={cn(
                  'w-2 h-2 rounded-full ml-2',
                  getPriorityColor(item.priority),
                )}
              />
            </div>
          ))}
          {items.length > 3 && (
            <p className="text-xs text-gray-500 text-center py-1">
              +{items.length - 3} more items
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Today's Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">No scheduled items today</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'p-3 rounded-lg border transition-all duration-200 hover:shadow-sm',
                getStatusColor(item.status),
                isCurrentTime(item.time) && 'ring-2 ring-blue-500 shadow-md',
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <h4 className="font-medium truncate">{item.title}</h4>
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full ml-2',
                        getPriorityColor(item.priority),
                      )}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {item.time}
                    </div>

                    {item.location && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span className="truncate max-w-[150px]">
                          {item.location}
                        </span>
                      </div>
                    )}

                    {item.attendees && (
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {item.attendees} people
                      </div>
                    )}
                  </div>
                </div>

                <Badge
                  variant="secondary"
                  className={getStatusColor(item.status)}
                >
                  {item.status.replace('-', ' ')}
                </Badge>
              </div>

              {isCurrentTime(item.time) && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800 font-medium">
                  🔔 Happening now
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
