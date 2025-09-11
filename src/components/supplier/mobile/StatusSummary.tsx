'use client';

import { Calendar, Users, Bell, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatusSummaryProps {
  todayEvents: number;
  upcomingBookings: number;
  unreadNotifications: number;
  activeConflicts?: number;
}

export function StatusSummary({
  todayEvents,
  upcomingBookings,
  unreadNotifications,
  activeConflicts = 0,
}: StatusSummaryProps) {
  const summaryItems = [
    {
      id: 'today-events',
      label: "Today's Events",
      value: todayEvents,
      icon: Calendar,
      color:
        todayEvents > 0
          ? 'text-blue-600 bg-blue-50'
          : 'text-gray-500 bg-gray-50',
      priority: todayEvents > 0 ? 'high' : 'normal',
    },
    {
      id: 'upcoming-bookings',
      label: 'Upcoming Bookings',
      value: upcomingBookings,
      icon: Users,
      color:
        upcomingBookings > 0
          ? 'text-green-600 bg-green-50'
          : 'text-gray-500 bg-gray-50',
      priority: 'normal',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      value: unreadNotifications,
      icon: Bell,
      color:
        unreadNotifications > 0
          ? 'text-yellow-600 bg-yellow-50'
          : 'text-gray-500 bg-gray-50',
      priority: unreadNotifications > 0 ? 'medium' : 'normal',
    },
    {
      id: 'conflicts',
      label: 'Conflicts',
      value: activeConflicts,
      icon: AlertCircle,
      color:
        activeConflicts > 0
          ? 'text-red-600 bg-red-50'
          : 'text-gray-500 bg-gray-50',
      priority: activeConflicts > 0 ? 'urgent' : 'normal',
    },
  ];

  return (
    <Card className="p-4">
      <div className="grid grid-cols-2 gap-4">
        {summaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={cn(
                'flex items-center space-x-3 p-3 rounded-lg border',
                'transition-all duration-200 touch-manipulation',
                item.priority === 'urgent' && 'border-red-200 shadow-sm',
                item.priority === 'high' && 'border-blue-200 shadow-sm',
                item.priority === 'medium' && 'border-yellow-200 shadow-sm',
                item.priority === 'normal' && 'border-gray-200',
              )}
            >
              <div
                className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                  item.color,
                )}
              >
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline space-x-1">
                  <span className="text-xl font-bold text-gray-900">
                    {item.value}
                  </span>
                  {item.priority === 'urgent' && (
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>
                <p className="text-xs text-gray-600 truncate">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick insights */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Today's Status</span>
          <div className="flex items-center space-x-2">
            {todayEvents === 0 && activeConflicts === 0 && (
              <span className="flex items-center space-x-1 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>All Clear</span>
              </span>
            )}
            {todayEvents > 0 && activeConflicts === 0 && (
              <span className="flex items-center space-x-1 text-blue-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span>Scheduled</span>
              </span>
            )}
            {activeConflicts > 0 && (
              <span className="flex items-center space-x-1 text-red-600">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span>Attention Needed</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
