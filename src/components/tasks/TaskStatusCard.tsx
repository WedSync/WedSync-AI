'use client';

import React from 'react';
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  XCircle,
  Camera,
} from 'lucide-react';
import { TaskProgressIndicator } from './TaskProgressIndicator';

export interface TaskStatusCardData {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
    role?: 'bride' | 'groom' | 'bridesmaid' | 'groomsman' | 'family' | 'friend';
  };
  dueDate?: string;
  completedAt?: string;
  progress: number;
  category: string;
  photoEvidence?: string[];
  lastUpdated: string;
  weddingDate: string;
  daysUntilWedding: number;
}

interface TaskStatusCardProps {
  task: TaskStatusCardData;
  onStatusUpdate?: (
    taskId: string,
    newStatus: TaskStatusCardData['status'],
  ) => void;
  onViewDetails?: (taskId: string) => void;
  variant?: 'default' | 'compact' | 'detailed';
  showProgress?: boolean;
  className?: string;
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: 'Pending',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-600',
    badgeColor: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  in_progress: {
    icon: AlertCircle,
    label: 'In Progress',
    bgColor: 'bg-primary-25',
    borderColor: 'border-primary-300',
    textColor: 'text-primary-700',
    badgeColor: 'bg-primary-50 text-primary-700 border-primary-200',
  },
  completed: {
    icon: CheckCircle,
    label: 'Completed',
    bgColor: 'bg-success-25',
    borderColor: 'border-success-300',
    textColor: 'text-success-700',
    badgeColor: 'bg-success-50 text-success-700 border-success-200',
  },
  overdue: {
    icon: XCircle,
    label: 'Overdue',
    bgColor: 'bg-error-25',
    borderColor: 'border-error-300',
    textColor: 'text-error-700',
    badgeColor: 'bg-error-50 text-error-700 border-error-200',
  },
  blocked: {
    icon: XCircle,
    label: 'Blocked',
    bgColor: 'bg-warning-25',
    borderColor: 'border-warning-300',
    textColor: 'text-warning-700',
    badgeColor: 'bg-warning-50 text-warning-700 border-warning-200',
  },
};

const priorityConfig = {
  low: 'bg-gray-50 text-gray-700 border-gray-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-warning-50 text-warning-700 border-warning-200',
  critical: 'bg-error-50 text-error-700 border-error-200',
};

export function TaskStatusCard({
  task,
  onStatusUpdate,
  onViewDetails,
  variant = 'default',
  showProgress = true,
  className = '',
}: TaskStatusCardProps) {
  const statusInfo = statusConfig[task.status];
  const StatusIcon = statusInfo.icon;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const updated = new Date(dateString);
    const diffInHours = Math.floor(
      (now.getTime() - updated.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return formatDate(dateString);
  };

  const getDaysUntilDue = () => {
    if (!task.dueDate) return null;
    const today = new Date();
    const due = new Date(task.dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilDue = getDaysUntilDue();
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
  const isDueSoon =
    daysUntilDue !== null && daysUntilDue <= 3 && daysUntilDue >= 0;

  if (variant === 'compact') {
    return (
      <div
        className={`
        bg-white border rounded-lg p-4
        ${statusInfo.borderColor}
        ${className}
        hover:shadow-md transition-all duration-200
        cursor-pointer
      `}
        onClick={() => onViewDetails?.(task.id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className={`p-1.5 rounded-md ${statusInfo.bgColor}`}>
              <StatusIcon className={`w-4 h-4 ${statusInfo.textColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {task.title}
              </p>
              <p className="text-xs text-gray-500">
                {task.category} • {formatTimeAgo(task.lastUpdated)}
              </p>
            </div>
          </div>
          {showProgress && (
            <TaskProgressIndicator
              progress={task.progress}
              status={task.status}
              size="sm"
              variant="circular"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
      bg-white border rounded-xl p-6
      ${statusInfo.borderColor}
      ${className}
      hover:shadow-lg transition-all duration-200
      ${onViewDetails ? 'cursor-pointer' : ''}
    `}
      onClick={() => onViewDetails?.(task.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${statusInfo.bgColor}`}>
            <StatusIcon className={`w-5 h-5 ${statusInfo.textColor}`} />
          </div>
          <div>
            <span
              className={`
              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
              ${statusInfo.badgeColor}
            `}
            >
              {statusInfo.label}
            </span>
            {task.priority !== 'low' && (
              <span
                className={`
                ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
                ${priorityConfig[task.priority]}
              `}
              >
                {task.priority} priority
              </span>
            )}
          </div>
        </div>

        {task.photoEvidence && task.photoEvidence.length > 0 && (
          <div className="flex items-center space-x-1 text-primary-600">
            <Camera className="w-4 h-4" />
            <span className="text-xs font-medium">
              {task.photoEvidence.length}
            </span>
          </div>
        )}
      </div>

      {/* Title and Description */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {task.title}
        </h3>
        {task.description && variant === 'detailed' && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {task.description}
          </p>
        )}
        <p className="text-sm text-gray-500 mt-1">Category: {task.category}</p>
      </div>

      {/* Progress */}
      {showProgress && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-600">{task.progress}%</span>
          </div>
          <TaskProgressIndicator
            progress={task.progress}
            status={task.status}
            variant="linear"
            className="w-full"
          />
        </div>
      )}

      {/* Assignee */}
      {task.assignee && (
        <div className="flex items-center space-x-3 mb-4">
          <User className="w-4 h-4 text-gray-400" />
          <div className="flex items-center space-x-2">
            {task.assignee.avatar ? (
              <img
                src={task.assignee.avatar}
                alt={task.assignee.name}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-xs font-medium text-primary-700">
                  {task.assignee.name.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {task.assignee.name}
              </p>
              {task.assignee.role && (
                <p className="text-xs text-gray-500 capitalize">
                  {task.assignee.role}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dates */}
      <div className="space-y-2">
        {task.dueDate && (
          <div className="flex items-center space-x-3">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Due:</span>
              <span
                className={`text-sm font-medium ${
                  isOverdue
                    ? 'text-error-600'
                    : isDueSoon
                      ? 'text-warning-600'
                      : 'text-gray-900'
                }`}
              >
                {formatDate(task.dueDate)}
              </span>
              {daysUntilDue !== null && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isOverdue
                      ? 'bg-error-50 text-error-700'
                      : isDueSoon
                        ? 'bg-warning-50 text-warning-700'
                        : 'bg-gray-50 text-gray-600'
                  }`}
                >
                  {isOverdue
                    ? `${Math.abs(daysUntilDue)} days overdue`
                    : daysUntilDue === 0
                      ? 'Due today'
                      : `${daysUntilDue} days left`}
                </span>
              )}
            </div>
          </div>
        )}

        {task.completedAt && task.status === 'completed' && (
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-4 h-4 text-success-500" />
            <div>
              <span className="text-sm text-gray-600">Completed:</span>
              <span className="text-sm font-medium text-gray-900 ml-2">
                {formatDate(task.completedAt)}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-3">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500">
            Last updated {formatTimeAgo(task.lastUpdated)}
          </span>
        </div>
      </div>

      {/* Wedding Context */}
      {variant === 'detailed' && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Wedding countdown:</span>
            <span className="font-medium text-primary-600">
              {task.daysUntilWedding} days until your special day
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {(onStatusUpdate || onViewDetails) && (
        <div className="mt-4 flex space-x-2">
          {onStatusUpdate && task.status !== 'completed' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const nextStatus =
                  task.status === 'pending' ? 'in_progress' : 'completed';
                onStatusUpdate(task.id, nextStatus);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {task.status === 'pending' ? 'Start Task' : 'Complete Task'}
            </button>
          )}

          {onViewDetails && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(task.id);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              View Details
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TaskStatusCard;
