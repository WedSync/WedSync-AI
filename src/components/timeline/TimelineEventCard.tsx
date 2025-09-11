'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import {
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  MoreVertical,
  Edit2,
  Trash2,
  Lock,
  Cloud,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { TimelineEvent, TimelineConflict } from '@/types/timeline';

interface TimelineEventCardProps {
  event: TimelineEvent;
  position: {
    x: number;
    width: number;
    y: number;
  };
  isSelected: boolean;
  isDragging: boolean;
  conflicts: TimelineConflict[];
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const priorityColors = {
  low: 'border-gray-300 bg-gray-50',
  medium: 'border-blue-300 bg-blue-50',
  high: 'border-yellow-300 bg-yellow-50',
  critical: 'border-red-300 bg-red-50',
};

const statusIcons = {
  pending: null,
  confirmed: <CheckCircle className="w-3 h-3 text-green-600" />,
  'in-progress': (
    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
  ),
  completed: <CheckCircle className="w-3 h-3 text-green-600" />,
  cancelled: <XCircle className="w-3 h-3 text-red-600" />,
  delayed: <Clock className="w-3 h-3 text-yellow-600" />,
};

export function TimelineEventCard({
  event,
  position,
  isSelected,
  isDragging,
  conflicts,
  onSelect,
  onEdit,
  onDelete,
}: TimelineEventCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: event.id,
    disabled: event.is_locked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    left: `${position.x}px`,
    width: `${position.width}px`,
    top: `${position.y}px`,
    opacity: isDragging || isSortableDragging ? 0.5 : 1,
    zIndex: isSelected ? 10 : 1,
  };

  const hasConflicts = conflicts.length > 0;
  const criticalConflict = conflicts.some((c) => c.severity === 'error');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'absolute h-16 rounded-lg border-2 p-2 cursor-move transition-all group',
        priorityColors[event.priority],
        isSelected && 'ring-2 ring-primary-500 ring-offset-1',
        hasConflicts && 'border-dashed',
        criticalConflict && 'border-red-500',
        event.is_locked && 'cursor-not-allowed opacity-75',
      )}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between h-full">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {/* Lock indicator */}
            {event.is_locked && <Lock className="w-3 h-3 text-gray-500" />}

            {/* Priority dot */}
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                event.priority === 'critical' && 'bg-red-500',
                event.priority === 'high' && 'bg-yellow-500',
                event.priority === 'medium' && 'bg-blue-500',
                event.priority === 'low' && 'bg-gray-400',
              )}
            />

            {/* Title */}
            <h4 className="font-medium text-sm text-gray-900 truncate">
              {event.title}
            </h4>

            {/* Status icon */}
            {statusIcons[event.status]}

            {/* Conflict indicator */}
            {hasConflicts && (
              <AlertTriangle
                className={cn(
                  'w-3 h-3',
                  criticalConflict ? 'text-red-600' : 'text-yellow-600',
                )}
              />
            )}

            {/* Weather dependent */}
            {event.weather_dependent && (
              <Cloud className="w-3 h-3 text-gray-500" />
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-600">
            <span>{format(parseISO(event.start_time), 'HH:mm')}</span>
            {event.location && (
              <>
                <span>•</span>
                <div className="flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{event.location}</span>
                </div>
              </>
            )}
            {event.vendors && event.vendors.length > 0 && (
              <>
                <span>•</span>
                <div className="flex items-center gap-0.5">
                  <Users className="w-3 h-3" />
                  <span>{event.vendors.length}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions menu */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Show dropdown menu
              }}
              className="p-1 hover:bg-white/50 rounded"
            >
              <MoreVertical className="w-3 h-3 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Visual event color bar */}
      {event.color && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1 rounded-b-md"
          style={{ backgroundColor: event.color }}
        />
      )}
    </div>
  );
}
