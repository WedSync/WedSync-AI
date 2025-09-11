'use client';

import { memo } from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'current' | 'completed';
}

interface ProgressIndicatorProps {
  steps: Step[];
  variant?: 'linear' | 'circular' | 'dots';
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

export const ProgressIndicator = memo(function ProgressIndicator({
  steps,
  variant = 'linear',
  size = 'md',
  showLabels = true,
  className = '',
}: ProgressIndicatorProps) {
  const currentIndex = steps.findIndex((step) => step.status === 'current');
  const completedCount = steps.filter(
    (step) => step.status === 'completed',
  ).length;
  const progressPercentage = (completedCount / steps.length) * 100;

  if (variant === 'dots') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              'transition-all duration-300',
              step.status === 'completed' && 'bg-purple-600',
              step.status === 'current' &&
                'bg-purple-600 ring-2 ring-purple-200',
              step.status === 'pending' && 'bg-gray-300',
              size === 'sm' && 'h-2 w-2 rounded-full',
              size === 'md' && 'h-3 w-3 rounded-full',
              size === 'lg' && 'h-4 w-4 rounded-full',
            )}
            title={step.label}
          />
        ))}
      </div>
    );
  }

  if (variant === 'circular') {
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset =
      circumference - (progressPercentage / 100) * circumference;

    return (
      <div
        className={cn(
          'relative inline-flex items-center justify-center',
          className,
        )}
      >
        <svg
          className={cn(
            'transform -rotate-90',
            size === 'sm' && 'h-24 w-24',
            size === 'md' && 'h-32 w-32',
            size === 'lg' && 'h-40 w-40',
          )}
        >
          <circle
            cx="50%"
            cy="50%"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-200"
          />
          <circle
            cx="50%"
            cy="50%"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-purple-600 transition-all duration-500"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span
            className={cn(
              'font-bold text-gray-900',
              size === 'sm' && 'text-lg',
              size === 'md' && 'text-2xl',
              size === 'lg' && 'text-3xl',
            )}
          >
            {Math.round(progressPercentage)}%
          </span>
          {showLabels && currentIndex >= 0 && (
            <span className="text-xs text-gray-600 text-center mt-1">
              {steps[currentIndex].label}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Linear variant (default)
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              'flex items-center',
              index !== steps.length - 1 && 'flex-1',
            )}
          >
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'rounded-full flex items-center justify-center transition-all duration-300',
                  step.status === 'completed' && 'bg-purple-600 text-white',
                  step.status === 'current' &&
                    'bg-purple-600 text-white ring-4 ring-purple-100',
                  step.status === 'pending' && 'bg-gray-200 text-gray-600',
                  size === 'sm' && 'h-6 w-6 text-xs',
                  size === 'md' && 'h-8 w-8 text-sm',
                  size === 'lg' && 'h-10 w-10 text-base',
                )}
              >
                {step.status === 'completed' ? (
                  <Check
                    className={cn(
                      size === 'sm' && 'h-3 w-3',
                      size === 'md' && 'h-4 w-4',
                      size === 'lg' && 'h-5 w-5',
                    )}
                  />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              {showLabels && (
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      'font-medium',
                      step.status === 'current' && 'text-purple-600',
                      step.status === 'pending' && 'text-gray-500',
                      step.status === 'completed' && 'text-gray-900',
                      size === 'sm' && 'text-xs',
                      size === 'md' && 'text-sm',
                      size === 'lg' && 'text-base',
                    )}
                  >
                    {step.label}
                  </p>
                  {step.description && size !== 'sm' && (
                    <p
                      className={cn(
                        'text-gray-500 mt-0.5',
                        size === 'md' && 'text-xs',
                        size === 'lg' && 'text-sm',
                      )}
                    >
                      {step.description}
                    </p>
                  )}
                </div>
              )}
            </div>
            {index !== steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 mx-2 transition-all duration-300',
                  size === 'sm' && 'h-0.5',
                  size === 'md' && 'h-1',
                  size === 'lg' && 'h-1.5',
                  step.status === 'completed' ? 'bg-purple-600' : 'bg-gray-200',
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

// Progress bar component
export const ProgressBar = memo(function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  size = 'md',
  color = 'purple',
  animated = true,
  className = '',
}: {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'purple' | 'green' | 'blue' | 'yellow' | 'red';
  animated?: boolean;
  className?: string;
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const colors = {
    purple: 'bg-purple-600',
    green: 'bg-green-600',
    blue: 'bg-blue-600',
    yellow: 'bg-yellow-500',
    red: 'bg-red-600',
  };

  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1">
          {label && (
            <span
              className={cn(
                'text-gray-700 font-medium',
                size === 'sm' && 'text-xs',
                size === 'md' && 'text-sm',
                size === 'lg' && 'text-base',
              )}
            >
              {label}
            </span>
          )}
          {showPercentage && (
            <span
              className={cn(
                'text-gray-600',
                size === 'sm' && 'text-xs',
                size === 'md' && 'text-sm',
                size === 'lg' && 'text-base',
              )}
            >
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn('bg-gray-200 rounded-full overflow-hidden', sizes[size])}
      >
        <div
          className={cn(
            'h-full transition-all duration-500 rounded-full',
            colors[color],
            animated && 'animate-pulse',
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
});

// Multi-step form progress
export function FormProgress({
  currentStep,
  totalSteps,
  stepLabels = [],
}: {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
}) {
  const steps: Step[] = Array.from({ length: totalSteps }, (_, i) => ({
    id: `step-${i}`,
    label: stepLabels[i] || `Step ${i + 1}`,
    status:
      i < currentStep - 1
        ? 'completed'
        : i === currentStep - 1
          ? 'current'
          : 'pending',
  }));

  return <ProgressIndicator steps={steps} />;
}
