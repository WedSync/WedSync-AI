'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { User, Edit3, MousePointer2 } from 'lucide-react';
import type { RealtimePresence } from '@/types/timeline';

interface TimelineRealtimeIndicatorProps {
  presenceData: RealtimePresence[];
  timeToPixel: (time: Date | string) => number;
  className?: string;
}

const avatarColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-indigo-500',
  'bg-pink-500',
  'bg-teal-500',
];

export function TimelineRealtimeIndicator({
  presenceData,
  timeToPixel,
  className,
}: TimelineRealtimeIndicatorProps) {
  const activeUsers = useMemo(() => {
    return presenceData.filter(
      (user) =>
        new Date().getTime() - new Date(user.last_activity).getTime() < 30000, // 30 seconds
    );
  }, [presenceData]);

  if (activeUsers.length === 0) {
    return null;
  }

  return (
    <div className={cn('absolute inset-0 pointer-events-none', className)}>
      {/* User Cursors */}
      {activeUsers.map((user, index) => {
        if (!user.cursor_position) return null;

        const colorClass = avatarColors[index % avatarColors.length];

        return (
          <div
            key={user.user_id}
            className="absolute pointer-events-none z-20"
            style={{
              left: `${user.cursor_position.x}px`,
              top: `${user.cursor_position.y}px`,
            }}
          >
            {/* Cursor */}
            <div className="relative">
              <MousePointer2
                className={cn(
                  'w-5 h-5 transform -rotate-12',
                  colorClass.replace('bg-', 'text-'),
                )}
                fill="currentColor"
              />

              {/* User label */}
              <div
                className={cn(
                  'absolute top-6 left-2 px-2 py-1 rounded-md text-white text-xs whitespace-nowrap shadow-lg',
                  colorClass,
                )}
              >
                {user.user_name}
                {user.is_editing && <Edit3 className="inline w-3 h-3 ml-1" />}
              </div>
            </div>
          </div>
        );
      })}

      {/* Selected Event Indicators */}
      {activeUsers.map((user, index) => {
        if (!user.selected_event_id) return null;

        // Note: In a real implementation, you'd need to find the event position
        // This would require access to the events data
        return null;
      })}

      {/* Active Users Indicator - Top Right */}
      <div className="absolute top-2 right-2 flex items-center gap-2 bg-white rounded-lg shadow-sm border px-3 py-2 pointer-events-auto">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-gray-600">Live</span>
        </div>

        <div className="flex -space-x-2">
          {activeUsers.slice(0, 5).map((user, index) => {
            const colorClass = avatarColors[index % avatarColors.length];

            return (
              <div
                key={user.user_id}
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white',
                  colorClass,
                )}
                title={`${user.user_name} - ${user.is_editing ? 'Editing' : 'Viewing'}`}
              >
                {user.user_name.charAt(0).toUpperCase()}
              </div>
            );
          })}

          {activeUsers.length > 5 && (
            <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium border-2 border-white">
              +{activeUsers.length - 5}
            </div>
          )}
        </div>

        <span className="text-xs text-gray-500">
          {activeUsers.length} online
        </span>
      </div>

      {/* Activity Feed - Bottom Right */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg border p-3 max-w-xs pointer-events-auto">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          Recent Activity
        </h4>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {activeUsers
            .filter((user) => user.is_editing)
            .slice(0, 3)
            .map((user, index) => (
              <div
                key={user.user_id}
                className="flex items-center gap-2 text-sm"
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded-full flex items-center justify-center text-white text-xs',
                    avatarColors[index % avatarColors.length],
                  )}
                >
                  {user.user_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-gray-600 flex-1">
                  {user.user_name} is editing
                </span>
                <span className="text-xs text-gray-400">
                  {format(new Date(user.last_activity), 'HH:mm')}
                </span>
              </div>
            ))}

          {activeUsers.filter((user) => user.is_editing).length === 0 && (
            <p className="text-xs text-gray-500 text-center">
              No active editing
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
