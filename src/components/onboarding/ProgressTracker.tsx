'use client';

import React from 'react';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/solid';
import { OnboardingProgress } from '@/types/onboarding';

interface ProgressTrackerProps {
  progress: OnboardingProgress;
  className?: string;
}

const progressSteps = [
  {
    key: 'profileCompleted' as keyof OnboardingProgress,
    title: 'Complete Profile',
    description: 'Add your business information',
  },
  {
    key: 'firstFormCreated' as keyof OnboardingProgress,
    title: 'Create First Form',
    description: 'Build your first client form',
  },
  {
    key: 'paymentConfigured' as keyof OnboardingProgress,
    title: 'Setup Payments',
    description: 'Configure Stripe integration',
  },
  {
    key: 'firstClientAdded' as keyof OnboardingProgress,
    title: 'Add First Client',
    description: 'Invite your first client',
  },
];

export function ProgressTracker({
  progress,
  className = '',
}: ProgressTrackerProps) {
  const completedSteps = Object.values(progress).filter(Boolean).length;
  const totalSteps = progressSteps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <div
      className={`bg-white rounded-lg border border-zinc-200 p-6 ${className}`}
    >
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-zinc-900">
            Setup Progress
          </h3>
          <span className="text-sm text-zinc-600">
            {completedSteps} of {totalSteps} completed
          </span>
        </div>

        <div className="w-full bg-zinc-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {progressSteps.map((step, index) => {
          const isCompleted = progress[step.key];
          const isCurrent =
            !isCompleted &&
            Object.values(progress).slice(0, index).every(Boolean);

          return (
            <div
              key={step.key}
              className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${
                isCompleted
                  ? 'bg-green-50 border border-green-200'
                  : isCurrent
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-zinc-50 border border-zinc-200'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {isCompleted ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                ) : (
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      isCurrent
                        ? 'border-blue-600 bg-white'
                        : 'border-zinc-300 bg-zinc-100'
                    }`}
                  >
                    {isCurrent && (
                      <ClockIcon className="h-3 w-3 text-blue-600" />
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    isCompleted
                      ? 'text-green-900'
                      : isCurrent
                        ? 'text-blue-900'
                        : 'text-zinc-900'
                  }`}
                >
                  {step.title}
                </p>
                <p
                  className={`text-sm ${
                    isCompleted
                      ? 'text-green-600'
                      : isCurrent
                        ? 'text-blue-600'
                        : 'text-zinc-500'
                  }`}
                >
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {completedSteps === totalSteps && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-green-900">
                Setup Complete!
              </h4>
              <p className="text-sm text-green-700 mt-1">
                You've completed all the initial setup steps. You're ready to
                start using WedSync!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
