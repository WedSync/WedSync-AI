'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { format, addMinutes, addHours } from 'date-fns';

interface TimelineRulerProps {
  startTime: Date;
  endTime: Date;
  pixelsPerHour: number;
  snapToGrid?: boolean;
  gridSize?: number; // in minutes
  className?: string;
}

export function TimelineRuler({
  startTime,
  endTime,
  pixelsPerHour,
  snapToGrid = false,
  gridSize = 15,
  className,
}: TimelineRulerProps) {
  const totalHours =
    (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  const totalWidth = totalHours * pixelsPerHour;
  const pixelsPerMinute = pixelsPerHour / 60;

  // Generate hour markers
  const hourMarkers = useMemo(() => {
    const markers = [];
    let currentTime = new Date(startTime);

    while (currentTime < endTime) {
      const position =
        ((currentTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)) *
        pixelsPerHour;

      markers.push({
        time: new Date(currentTime),
        position,
        label: format(currentTime, 'HH:mm'),
        isMainHour: currentTime.getMinutes() === 0,
      });

      currentTime = addHours(currentTime, 1);
    }

    return markers;
  }, [startTime, endTime, pixelsPerHour]);

  // Generate minute markers for grid
  const minuteMarkers = useMemo(() => {
    if (!snapToGrid) return [];

    const markers = [];
    const totalMinutes =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    const intervals = Math.floor(totalMinutes / gridSize);

    for (let i = 0; i <= intervals; i++) {
      const position = i * gridSize * pixelsPerMinute;
      const time = addMinutes(startTime, i * gridSize);

      markers.push({
        time,
        position,
        isHourMark: time.getMinutes() === 0,
        isQuarterHour: time.getMinutes() % 15 === 0,
        isHalfHour: time.getMinutes() === 30,
      });
    }

    return markers;
  }, [startTime, endTime, pixelsPerMinute, snapToGrid, gridSize]);

  return (
    <div
      className={cn('relative bg-gray-50 border-b', className)}
      style={{ width: totalWidth }}
    >
      {/* Main ruler background */}
      <div className="h-12 relative">
        {/* Hour markers */}
        {hourMarkers.map((marker, index) => (
          <div
            key={index}
            className="absolute flex flex-col items-center"
            style={{ left: `${marker.position}px` }}
          >
            {/* Hour line */}
            <div
              className={cn(
                'w-px bg-gray-300',
                marker.isMainHour ? 'h-8' : 'h-6',
              )}
            />

            {/* Hour label */}
            <span
              className={cn(
                'text-xs mt-1 font-medium',
                marker.isMainHour ? 'text-gray-700' : 'text-gray-500',
              )}
            >
              {marker.label}
            </span>

            {/* Current time indicator */}
            {Math.abs(marker.time.getTime() - new Date().getTime()) <
              30 * 60 * 1000 && (
              <div className="absolute -top-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </div>
        ))}

        {/* Grid lines */}
        {snapToGrid &&
          minuteMarkers.map((marker, index) => (
            <div
              key={index}
              className={cn(
                'absolute top-8 w-px',
                marker.isHourMark && 'hidden', // Hide hour marks as they're already shown above
                marker.isHalfHour && 'h-3 bg-gray-200',
                marker.isQuarterHour && 'h-2 bg-gray-150',
                !marker.isHalfHour &&
                  !marker.isQuarterHour &&
                  'h-1 bg-gray-100',
              )}
              style={{ left: `${marker.position}px` }}
            />
          ))}

        {/* Time period labels */}
        <div className="absolute top-0 right-4 flex items-center gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded" />
            <span>Preparation</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-100 border border-purple-200 rounded" />
            <span>Ceremony</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-100 border border-green-200 rounded" />
            <span>Reception</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded" />
            <span>Party</span>
          </div>
        </div>

        {/* Scale indicator */}
        <div className="absolute bottom-1 left-4 text-xs text-gray-400">
          Scale: {pixelsPerHour}px/hour
        </div>
      </div>

      {/* Current time line overlay */}
      <div className="absolute top-0 h-full pointer-events-none">
        {(() => {
          const now = new Date();
          const position =
            ((now.getTime() - startTime.getTime()) / (1000 * 60 * 60)) *
            pixelsPerHour;

          if (position >= 0 && position <= totalWidth) {
            return (
              <div
                className="absolute w-0.5 h-full bg-red-500 z-10"
                style={{ left: `${position}px` }}
              >
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
                <div className="absolute top-2 left-2 px-1 py-0.5 bg-red-500 text-white text-xs rounded whitespace-nowrap">
                  {format(now, 'HH:mm')}
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>
    </div>
  );
}
