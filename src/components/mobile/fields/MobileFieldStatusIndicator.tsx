'use client';

import React from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

interface MobileFieldStatusIndicatorProps {
  progress: number; // 0-100
  completed: number;
  total: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  variant?: 'circular' | 'linear' | 'badge';
  className?: string;
}

export function MobileFieldStatusIndicator({
  progress,
  completed,
  total,
  size = 'md',
  showLabel = false,
  variant = 'circular',
  className = '',
}: MobileFieldStatusIndicatorProps) {
  const getStatusColor = () => {
    if (progress === 100) return 'text-green-500';
    if (progress >= 50) return 'text-blue-500';
    if (progress > 0) return 'text-orange-500';
    return 'text-gray-400';
  };

  const getBackgroundColor = () => {
    if (progress === 100) return 'bg-green-100';
    if (progress >= 50) return 'bg-blue-100';
    if (progress > 0) return 'bg-orange-100';
    return 'bg-gray-100';
  };

  const sizeClasses = {
    sm: {
      container: 'w-8 h-8',
      text: 'text-xs',
      icon: 'h-3 w-3',
      strokeWidth: '4',
    },
    md: {
      container: 'w-12 h-12',
      text: 'text-sm',
      icon: 'h-4 w-4',
      strokeWidth: '3',
    },
    lg: {
      container: 'w-16 h-16',
      text: 'text-base',
      icon: 'h-6 w-6',
      strokeWidth: '2',
    },
  };

  const currentSize = sizeClasses[size];

  if (variant === 'circular') {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className={`relative ${currentSize.container} ${className}`}>
        {/* Background Circle */}
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth={currentSize.strokeWidth}
            fill="transparent"
            className="text-gray-200"
          />
          {/* Progress Circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth={currentSize.strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`${getStatusColor()} transition-all duration-500`}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          {progress === 100 ? (
            <CheckCircleIconSolid
              className={`${currentSize.icon} text-green-500`}
            />
          ) : (
            <div
              className={`${currentSize.text} font-semibold ${getStatusColor()}`}
            >
              {Math.round(progress)}%
            </div>
          )}
        </div>

        {/* Label */}
        {showLabel && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
            <span className="text-xs text-gray-600">
              {completed}/{total}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'linear') {
    return (
      <div className={`w-full ${className}`}>
        <div className="flex items-center justify-between mb-2">
          {showLabel && (
            <span className={`${currentSize.text} font-medium text-gray-700`}>
              Progress
            </span>
          )}
          <span
            className={`${currentSize.text} font-semibold ${getStatusColor()}`}
          >
            {progress}%
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              progress === 100
                ? 'bg-green-500'
                : progress >= 50
                  ? 'bg-blue-500'
                  : progress > 0
                    ? 'bg-orange-500'
                    : 'bg-gray-400'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {showLabel && (
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>{completed} completed</span>
            <span>{total} total</span>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div
        className={`inline-flex items-center space-x-2 px-3 py-2 rounded-full ${getBackgroundColor()} ${className}`}
      >
        {progress === 100 ? (
          <CheckCircleIconSolid
            className={`${currentSize.icon} text-green-600`}
          />
        ) : progress > 0 ? (
          <ClockIcon className={`${currentSize.icon} ${getStatusColor()}`} />
        ) : (
          <div
            className={`${currentSize.icon} border-2 border-current rounded-full ${getStatusColor()}`}
          />
        )}

        <span
          className={`${currentSize.text} font-medium ${
            progress === 100
              ? 'text-green-700'
              : progress >= 50
                ? 'text-blue-700'
                : progress > 0
                  ? 'text-orange-700'
                  : 'text-gray-600'
          }`}
        >
          {showLabel ? `${completed}/${total}` : `${progress}%`}
        </span>
      </div>
    );
  }

  // Default fallback
  return null;
}

// Specific status indicators for different field states
export function MobileFieldCompletionBadge({
  isCompleted,
  isRequired = false,
  size = 'md',
  className = '',
}: {
  isCompleted: boolean;
  isRequired?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const iconSize = sizeClasses[size];

  if (isCompleted) {
    return (
      <CheckCircleIconSolid
        className={`${iconSize} text-green-500 ${className}`}
        title="Completed"
      />
    );
  }

  return (
    <div
      className={`${iconSize} border-2 rounded-full ${
        isRequired
          ? 'border-red-400 text-red-400'
          : 'border-gray-300 text-gray-300'
      } ${className}`}
      title={isRequired ? 'Required field' : 'Optional field'}
    />
  );
}

export function MobileFieldSyncStatus({
  isSyncing,
  lastSynced,
  hasErrors = false,
  size = 'md',
  className = '',
}: {
  isSyncing: boolean;
  lastSynced?: string;
  hasErrors?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const iconSize = sizeClasses[size];

  if (hasErrors) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <ExclamationCircleIcon className={`${iconSize} text-red-500`} />
        <span className="text-xs text-red-600">Sync failed</span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <div
          className={`${iconSize} border-2 border-orange-500 border-t-transparent rounded-full animate-spin`}
        />
        <span className="text-xs text-orange-600">Syncing...</span>
      </div>
    );
  }

  if (lastSynced) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <CheckCircleIconSolid className={`${iconSize} text-green-500`} />
        <span className="text-xs text-green-600">
          Synced{' '}
          {new Date(lastSynced).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div className={`${iconSize} border-2 border-gray-300 rounded-full`} />
      <span className="text-xs text-gray-500">Not synced</span>
    </div>
  );
}
