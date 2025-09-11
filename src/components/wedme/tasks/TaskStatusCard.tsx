'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  UserIcon,
  MapPinIcon,
  CalendarIcon,
  MoreHorizontalIcon,
  EditIcon,
  ShareIcon,
  UserPlusIcon,
  CameraIcon,
} from 'lucide-react';
import { SwipeableCard } from '@/components/mobile/MobileEnhancedFeatures';
import {
  useLongPress,
  useHapticFeedback,
} from '@/components/mobile/MobileEnhancedFeatures';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  assignedToName?: string;
  assignedToAvatar?: string;
  dueDate?: Date;
  category: string;
  estimatedTime?: string;
  notes?: string;
  photos?: string[];
  createdAt: Date;
  updatedAt: Date;
  helperCount: number;
  isHighPriority: boolean;
  venue?: string;
  conflicts?: string[];
}

interface TaskStatusCardProps {
  task: Task;
  onTap?: (task: Task) => void;
  onComplete?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
  onAssignHelper?: (helperId: string) => void;
  onShare?: (task: Task) => void;
  disabled?: boolean;
  showOfflineIndicator?: boolean;
  className?: string;
}

export function TaskStatusCard({
  task,
  onTap,
  onComplete,
  onEdit,
  onAssignHelper,
  onShare,
  disabled = false,
  showOfflineIndicator = false,
  className,
}: TaskStatusCardProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const haptic = useHapticFeedback();

  // Long press for context menu
  const longPressProps = useLongPress(() => {
    if (disabled) return;
    setShowActions(true);
    haptic.medium();
  }, 500);

  // Handle tap/click
  const handleTap = useCallback(() => {
    if (disabled) return;
    haptic.light();
    onTap?.(task);
  }, [task, onTap, disabled, haptic]);

  // Handle swipe actions
  const handleComplete = useCallback(() => {
    if (disabled || task.status === 'completed') return;
    haptic.success();
    onComplete?.(task.id);
  }, [task.id, task.status, onComplete, disabled, haptic]);

  const handleEdit = useCallback(() => {
    if (disabled) return;
    haptic.light();
    onEdit?.(task);
  }, [task, onEdit, disabled, haptic]);

  // Status styling helpers
  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'in_progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'blocked':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
      case 'in_progress':
        return <ClockIcon className="w-4 h-4 text-blue-600" />;
      case 'blocked':
        return <AlertCircleIcon className="w-4 h-4 text-red-600" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  // Format due date
  const formatDueDate = (date?: Date) => {
    if (!date) return null;

    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days`;

    return date.toLocaleDateString();
  };

  const isOverdue =
    task.dueDate && task.dueDate < new Date() && task.status !== 'completed';
  const isDueToday =
    task.dueDate &&
    task.dueDate.toDateString() === new Date().toDateString() &&
    task.status !== 'completed';

  return (
    <div className={cn('relative', className)}>
      <SwipeableCard
        leftAction={{
          icon: <CheckCircleIcon className="w-5 h-5" />,
          color: task.status === 'completed' ? 'bg-gray-500' : 'bg-green-500',
          onAction: handleComplete,
          label: task.status === 'completed' ? 'Done' : 'Complete',
        }}
        rightAction={{
          icon: <EditIcon className="w-5 h-5" />,
          color: 'bg-blue-500',
          onAction: handleEdit,
          label: 'Edit',
        }}
        className={cn(
          'bg-white rounded-xl border border-gray-200 shadow-xs',
          'transition-all duration-200',
          disabled && 'opacity-60',
          isPressed && 'scale-[0.98]',
          isOverdue && 'border-red-300 bg-red-50/30',
          isDueToday && 'border-orange-300 bg-orange-50/30',
        )}
      >
        <div
          ref={cardRef}
          className={cn(
            'p-4 cursor-pointer touch-manipulation select-none',
            'active:bg-gray-50 transition-colors duration-150',
          )}
          onClick={handleTap}
          onTouchStart={() => setIsPressed(true)}
          onTouchEnd={() => setIsPressed(false)}
          onTouchCancel={() => setIsPressed(false)}
          {...longPressProps}
        >
          {/* Header Row */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {getStatusIcon(task.status)}
              <h3
                className={cn(
                  'font-medium text-gray-900 truncate flex-1',
                  task.status === 'completed' && 'line-through text-gray-500',
                )}
              >
                {task.title}
              </h3>
              {showOfflineIndicator && (
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
                haptic.light();
              }}
              className={cn(
                'p-1.5 rounded-lg hover:bg-gray-100 transition-colors',
                'touch-manipulation flex-shrink-0',
                'focus:outline-none focus:ring-2 focus:ring-pink-200',
              )}
              aria-label="More options"
            >
              <MoreHorizontalIcon className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Status and Priority Badges */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className={cn(
                'px-2 py-1 text-xs font-medium rounded-full border',
                getStatusColor(task.status),
              )}
            >
              {task.status.replace('_', ' ')}
            </span>

            {(task.priority === 'high' || task.priority === 'urgent') && (
              <span
                className={cn(
                  'px-2 py-1 text-xs font-medium rounded-full border',
                  getPriorityColor(task.priority),
                )}
              >
                {task.priority}
              </span>
            )}

            {task.category && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                {task.category}
              </span>
            )}
          </div>

          {/* Task Details */}
          <div className="space-y-2">
            {/* Assignee */}
            {task.assignedToName && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {task.assignedToAvatar ? (
                  <Avatar className="w-5 h-5">
                    <AvatarImage
                      src={task.assignedToAvatar}
                      alt={task.assignedToName}
                    />
                    <AvatarFallback className="text-xs">
                      {task.assignedToName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
                <span className="truncate">{task.assignedToName}</span>
                {task.helperCount > 0 && (
                  <span className="text-xs text-gray-500">
                    +{task.helperCount} helper{task.helperCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}

            {/* Due Date */}
            {task.dueDate && (
              <div
                className={cn(
                  'flex items-center gap-2 text-sm',
                  isOverdue
                    ? 'text-red-600'
                    : isDueToday
                      ? 'text-orange-600'
                      : 'text-gray-600',
                )}
              >
                <CalendarIcon className="w-4 h-4" />
                <span className="font-medium">
                  {formatDueDate(task.dueDate)}
                </span>
                {task.estimatedTime && (
                  <span className="text-gray-500">• {task.estimatedTime}</span>
                )}
              </div>
            )}

            {/* Venue */}
            {task.venue && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPinIcon className="w-4 h-4" />
                <span className="truncate">{task.venue}</span>
              </div>
            )}

            {/* Photos */}
            {task.photos && task.photos.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CameraIcon className="w-4 h-4" />
                <span>
                  {task.photos.length} photo{task.photos.length > 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Conflicts Warning */}
            {task.conflicts && task.conflicts.length > 0 && (
              <div className="px-2 py-1 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-1 text-xs text-red-700">
                  <AlertCircleIcon className="w-3 h-3" />
                  <span className="font-medium">
                    {task.conflicts.length} conflict
                    {task.conflicts.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Menu (Slide Down) */}
          {showActions && (
            <div className="mt-4 pt-3 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(task);
                    setShowActions(false);
                  }}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-lg',
                    'bg-blue-50 text-blue-700 hover:bg-blue-100',
                    'transition-colors duration-200 touch-manipulation',
                  )}
                  disabled={disabled}
                >
                  <EditIcon className="w-4 h-4" />
                  <span className="text-xs font-medium">Edit</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssignHelper?.('helper-id');
                    setShowActions(false);
                  }}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-lg',
                    'bg-green-50 text-green-700 hover:bg-green-100',
                    'transition-colors duration-200 touch-manipulation',
                  )}
                  disabled={disabled}
                >
                  <UserPlusIcon className="w-4 h-4" />
                  <span className="text-xs font-medium">Assign</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare?.(task);
                    setShowActions(false);
                  }}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-lg',
                    'bg-purple-50 text-purple-700 hover:bg-purple-100',
                    'transition-colors duration-200 touch-manipulation',
                  )}
                  disabled={disabled}
                >
                  <ShareIcon className="w-4 h-4" />
                  <span className="text-xs font-medium">Share</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </SwipeableCard>
    </div>
  );
}
