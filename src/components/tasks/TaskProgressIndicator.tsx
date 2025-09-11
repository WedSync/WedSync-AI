'use client';

import React from 'react';
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';

interface TaskProgressIndicatorProps {
  progress: number;
  status?: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'blocked';
  variant?: 'linear' | 'circular' | 'minimal';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  showIcon?: boolean;
  animated?: boolean;
  className?: string;
}

const statusConfig = {
  pending: {
    color: 'text-gray-500',
    bgColor: 'bg-gray-200',
    fillColor: 'bg-gray-400',
    strokeColor: 'stroke-gray-400',
    icon: Clock,
  },
  in_progress: {
    color: 'text-primary-600',
    bgColor: 'bg-primary-100',
    fillColor: 'bg-primary-500',
    strokeColor: 'stroke-primary-500',
    icon: AlertCircle,
  },
  completed: {
    color: 'text-success-600',
    bgColor: 'bg-success-100',
    fillColor: 'bg-success-500',
    strokeColor: 'stroke-success-500',
    icon: CheckCircle,
  },
  overdue: {
    color: 'text-error-600',
    bgColor: 'bg-error-100',
    fillColor: 'bg-error-500',
    strokeColor: 'stroke-error-500',
    icon: XCircle,
  },
  blocked: {
    color: 'text-warning-600',
    bgColor: 'bg-warning-100',
    fillColor: 'bg-warning-500',
    strokeColor: 'stroke-warning-500',
    icon: XCircle,
  },
};

const sizeConfig = {
  xs: {
    linear: 'h-1',
    circular: 'w-6 h-6',
    text: 'text-xs',
    icon: 'w-3 h-3',
  },
  sm: {
    linear: 'h-2',
    circular: 'w-8 h-8',
    text: 'text-sm',
    icon: 'w-4 h-4',
  },
  md: {
    linear: 'h-3',
    circular: 'w-12 h-12',
    text: 'text-sm',
    icon: 'w-5 h-5',
  },
  lg: {
    linear: 'h-4',
    circular: 'w-16 h-16',
    text: 'text-base',
    icon: 'w-6 h-6',
  },
};

export function TaskProgressIndicator({
  progress,
  status = 'pending',
  variant = 'linear',
  size = 'md',
  showPercentage = true,
  showIcon = true,
  animated = true,
  className = '',
}: TaskProgressIndicatorProps) {
  const statusInfo = statusConfig[status];
  const sizeInfo = sizeConfig[size];
  const StatusIcon = statusInfo.icon;

  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showIcon && (
          <StatusIcon className={`${sizeInfo.icon} ${statusInfo.color}`} />
        )}
        {showPercentage && (
          <span className={`${sizeInfo.text} font-medium ${statusInfo.color}`}>
            {clampedProgress}%
          </span>
        )}
      </div>
    );
  }

  if (variant === 'circular') {
    const radius =
      size === 'xs' ? 8 : size === 'sm' ? 12 : size === 'md' ? 20 : 28;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset =
      circumference - (clampedProgress / 100) * circumference;

    return (
      <div
        className={`relative inline-flex items-center justify-center ${className}`}
      >
        <svg
          className={`${sizeInfo.circular} transform -rotate-90`}
          viewBox={`0 0 ${(radius + 4) * 2} ${(radius + 4) * 2}`}
        >
          {/* Background circle */}
          <circle
            cx={radius + 4}
            cy={radius + 4}
            r={radius}
            className={`fill-none stroke-2 ${statusInfo.bgColor.replace('bg-', 'stroke-')}`}
            strokeWidth="2"
          />
          {/* Progress circle */}
          <circle
            cx={radius + 4}
            cy={radius + 4}
            r={radius}
            className={`fill-none ${statusInfo.strokeColor} ${animated ? 'transition-all duration-500 ease-out' : ''}`}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          {status === 'completed' && showIcon ? (
            <CheckCircle className={`${sizeInfo.icon} ${statusInfo.color}`} />
          ) : showPercentage ? (
            <span
              className={`${sizeInfo.text} font-semibold ${statusInfo.color}`}
            >
              {size === 'xs' || size === 'sm'
                ? clampedProgress
                : `${clampedProgress}%`}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  // Linear variant (default)
  return (
    <div className={`w-full ${className}`}>
      {(showPercentage || showIcon) && (
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-1">
            {showIcon && (
              <StatusIcon className={`${sizeInfo.icon} ${statusInfo.color}`} />
            )}
            {status === 'completed' && (
              <span className={`${sizeInfo.text} font-medium text-success-600`}>
                Complete
              </span>
            )}
          </div>
          {showPercentage && (
            <span
              className={`${sizeInfo.text} font-medium ${statusInfo.color}`}
            >
              {clampedProgress}%
            </span>
          )}
        </div>
      )}

      <div
        className={`w-full ${statusInfo.bgColor} rounded-full ${sizeInfo.linear} overflow-hidden`}
      >
        <div
          className={`
            ${statusInfo.fillColor} ${sizeInfo.linear} rounded-full
            ${animated ? 'transition-all duration-700 ease-out' : ''}
            ${status === 'completed' ? 'animate-pulse' : ''}
          `}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>

      {/* Progress milestones for larger sizes */}
      {(size === 'md' || size === 'lg') && variant === 'linear' && (
        <div className="flex justify-between mt-1">
          {[25, 50, 75].map((milestone) => (
            <div
              key={milestone}
              className={`
                w-1 h-2 rounded-full transition-colors duration-300
                ${clampedProgress >= milestone ? statusInfo.fillColor : 'bg-gray-200'}
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Preset configurations for common use cases
export const TaskProgressPresets = {
  CompactCard: (
    props: Omit<TaskProgressIndicatorProps, 'variant' | 'size' | 'showIcon'>,
  ) => (
    <TaskProgressIndicator
      {...props}
      variant="circular"
      size="sm"
      showIcon={false}
    />
  ),

  DetailedCard: (
    props: Omit<TaskProgressIndicatorProps, 'variant' | 'size'>,
  ) => <TaskProgressIndicator {...props} variant="linear" size="md" />,

  StatusBadge: (
    props: Omit<TaskProgressIndicatorProps, 'variant' | 'showPercentage'>,
  ) => (
    <TaskProgressIndicator
      {...props}
      variant="minimal"
      showPercentage={false}
    />
  ),

  MiniIndicator: (
    props: Omit<TaskProgressIndicatorProps, 'variant' | 'size'>,
  ) => <TaskProgressIndicator {...props} variant="circular" size="xs" />,

  DashboardOverview: (
    props: Omit<TaskProgressIndicatorProps, 'variant' | 'size' | 'animated'>,
  ) => (
    <TaskProgressIndicator
      {...props}
      variant="linear"
      size="lg"
      animated={true}
    />
  ),
};

// Hook for calculating progress based on task data
export const useTaskProgress = (task: {
  status: string;
  completedSteps?: number;
  totalSteps?: number;
  customProgress?: number;
}) => {
  return React.useMemo(() => {
    // Use custom progress if provided
    if (task.customProgress !== undefined) {
      return task.customProgress;
    }

    // Calculate from steps if available
    if (
      task.completedSteps !== undefined &&
      task.totalSteps !== undefined &&
      task.totalSteps > 0
    ) {
      return Math.round((task.completedSteps / task.totalSteps) * 100);
    }

    // Default progress based on status
    switch (task.status) {
      case 'completed':
        return 100;
      case 'in_progress':
        return 50;
      case 'pending':
        return 0;
      case 'blocked':
        return 25;
      case 'overdue':
        return 10;
      default:
        return 0;
    }
  }, [task]);
};

// Animation variants for different contexts
export const ProgressAnimations = {
  slideIn: {
    initial: { width: '0%', opacity: 0 },
    animate: { width: '100%', opacity: 1 },
    transition: { duration: 0.8, ease: 'easeOut' },
  },

  pulse: {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: 'loop' as const,
    },
  },

  completion: {
    animate: {
      scale: [1, 1.2, 1],
      rotate: [0, 10, -10, 0],
    },
    transition: { duration: 0.6 },
  },
};

export default TaskProgressIndicator;
