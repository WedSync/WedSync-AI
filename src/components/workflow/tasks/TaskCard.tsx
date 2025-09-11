'use client';

import React from 'react';
import { WorkflowTask, TaskPriority, TaskStatus } from '@/types/workflow';
import {
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';

interface TaskCardProps {
  task: WorkflowTask & {
    assigned_to_member?: {
      id: string;
      name: string;
      email: string;
      role: string;
      avatar_url?: string;
    };
    created_by_member: {
      id: string;
      name: string;
      email: string;
      role: string;
      avatar_url?: string;
    };
  };
  onClick?: () => void;
  onStatusChange?: (status: TaskStatus) => void;
  onAssigneeChange?: (assigneeId: string) => void;
  className?: string;
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800 border-gray-200',
  medium: 'bg-blue-100 text-blue-800 border-blue-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

const statusColors = {
  todo: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  review: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  blocked: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

const statusIcons = {
  todo: Clock,
  in_progress: Clock,
  review: AlertTriangle,
  completed: CheckCircle,
  blocked: AlertTriangle,
  cancelled: CheckCircle,
};

export function TaskCard({
  task,
  onClick,
  onStatusChange,
  onAssigneeChange,
  className = '',
}: TaskCardProps) {
  const isOverdue =
    isPast(new Date(task.deadline)) &&
    !['completed', 'cancelled'].includes(task.status);
  const StatusIcon = statusIcons[task.status];

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Cycle through statuses
    const statusOrder: TaskStatus[] = [
      'todo',
      'in_progress',
      'review',
      'completed',
    ];
    const currentIndex = statusOrder.indexOf(task.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    onStatusChange?.(nextStatus);
  };

  return (
    <div
      className={`
        bg-white rounded-xl border border-gray-200 p-4 
        hover:shadow-md transition-all duration-200
        ${onClick ? 'cursor-pointer' : ''}
        ${isOverdue ? 'border-red-300 bg-red-50' : ''}
        ${task.is_critical_path ? 'ring-2 ring-primary-200' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
            {task.title}
          </h3>
          {task.description && (
            <p className="text-xs text-gray-600 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Priority Badge */}
        <span
          className={`
          inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border
          ${priorityColors[task.priority]}
        `}
        >
          {task.priority}
        </span>
      </div>

      {/* Progress Bar */}
      {task.progress_percentage > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{task.progress_percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${task.progress_percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="space-y-2 mb-3">
        {/* Deadline */}
        <div className="flex items-center text-xs text-gray-600">
          <Calendar className="w-3 h-3 mr-1" />
          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
            Due{' '}
            {formatDistanceToNow(new Date(task.deadline), { addSuffix: true })}
          </span>
          {isOverdue && <AlertTriangle className="w-3 h-3 ml-1 text-red-600" />}
        </div>

        {/* Assignee */}
        {task.assigned_to_member && (
          <div className="flex items-center text-xs text-gray-600">
            <User className="w-3 h-3 mr-1" />
            <span>{task.assigned_to_member.name}</span>
          </div>
        )}

        {/* Category */}
        <div className="text-xs text-gray-500">
          {task.category.replace('_', ' ').toUpperCase()}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Status */}
        <button
          onClick={handleStatusClick}
          className={`
            inline-flex items-center px-2 py-1 text-xs font-medium rounded-full
            transition-colors duration-200 hover:opacity-80
            ${statusColors[task.status]}
          `}
        >
          <StatusIcon className="w-3 h-3 mr-1" />
          {task.status.replace('_', ' ')}
        </button>

        {/* Critical Path Indicator */}
        {task.is_critical_path && (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-primary-700 bg-primary-100 rounded-full">
            Critical
          </span>
        )}

        {/* Duration */}
        <div className="text-xs text-gray-500">{task.estimated_duration}h</div>
      </div>
    </div>
  );
}
