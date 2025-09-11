'use client';

import React from 'react';
import {
  OnboardingTour,
  KeyboardShortcuts,
  ProgressTracker,
  useOnboarding,
} from '@/components/onboarding';
import { Button } from '@/components/ui/button';
import { PlayIcon } from '@heroicons/react/24/outline';

/**
 * OnboardingDemo - Demo component showing the onboarding system in action
 */
export function OnboardingDemo() {
  const {
    state,
    progress,
    startTour,
    completeTour,
    skipTour,
    updateStep,
    updateProgress,
    shouldShowTour,
  } = useOnboarding();

  // Example progress updates
  const handleProfileComplete = () => {
    updateProgress({ profileCompleted: true });
  };

  const handleFirstFormCreated = () => {
    updateProgress({ firstFormCreated: true });
  };

  const handlePaymentConfigured = () => {
    updateProgress({ paymentConfigured: true });
  };

  const handleFirstClientAdded = () => {
    updateProgress({ firstClientAdded: true });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Demo Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-zinc-900">
          WedSync Onboarding Demo
        </h1>
        <p className="text-lg text-zinc-600">
          Experience our comprehensive onboarding system designed for wedding
          vendors
        </p>
      </div>

      {/* Main Onboarding Tour */}
      <OnboardingTour
        isActive={state.isActive}
        onComplete={completeTour}
        onSkip={skipTour}
        onStepChange={updateStep}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcuts />

      {/* Tour Demo Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Dashboard Tour Target */}
        <div
          data-tour="dashboard"
          className="bg-white p-6 rounded-lg border border-zinc-200 hover:border-zinc-300 transition-colors"
        >
          <h3 className="text-lg font-semibold text-zinc-900 mb-2">
            Dashboard
          </h3>
          <p className="text-sm text-zinc-600">
            Your main command center for managing wedding clients and projects.
          </p>
        </div>

        {/* Form Builder Tour Target */}
        <div
          data-tour="form-builder"
          className="bg-white p-6 rounded-lg border border-zinc-200 hover:border-zinc-300 transition-colors"
        >
          <h3 className="text-lg font-semibold text-zinc-900 mb-2">
            Form Builder
          </h3>
          <p className="text-sm text-zinc-600">
            Create beautiful, custom forms for your wedding clients.
          </p>
        </div>

        {/* Payments Tour Target */}
        <div
          data-tour="payments"
          className="bg-white p-6 rounded-lg border border-zinc-200 hover:border-zinc-300 transition-colors"
        >
          <h3 className="text-lg font-semibold text-zinc-900 mb-2">Payments</h3>
          <p className="text-sm text-zinc-600">
            Streamlined payment processing with Stripe integration.
          </p>
        </div>

        {/* Help System Demo */}
        <div className="bg-white p-6 rounded-lg border border-zinc-200 hover:border-zinc-300 transition-colors">
          <h3 className="text-lg font-semibold text-zinc-900 mb-2">
            Help System
          </h3>
          <p className="text-sm text-zinc-600">
            Contextual help available throughout the platform.
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            Press <kbd className="bg-zinc-100 px-1 rounded">?</kbd> for
            shortcuts
          </p>
        </div>
      </div>

      {/* Progress Tracker */}
      <ProgressTracker progress={progress} />

      {/* Control Panel */}
      <div className="bg-zinc-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-zinc-900 mb-4">
          Demo Controls
        </h3>

        {/* Tour Controls */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-zinc-700 mb-2">
              Tour Management:
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button onClick={startTour} size="sm">
                <PlayIcon className="h-4 w-4 mr-1" />
                {state.hasSeenTour ? 'Restart Tour' : 'Start Tour'}
              </Button>
              <Button
                onClick={skipTour}
                color="zinc"
                size="sm"
                disabled={!state.isActive}
              >
                Skip Tour
              </Button>
            </div>
          </div>

          {/* Progress Controls */}
          <div>
            <h4 className="text-sm font-medium text-zinc-700 mb-2">
              Progress Simulation:
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleProfileComplete}
                size="sm"
                color={progress.profileCompleted ? 'green' : 'zinc'}
              >
                Complete Profile
              </Button>
              <Button
                onClick={handleFirstFormCreated}
                size="sm"
                color={progress.firstFormCreated ? 'green' : 'zinc'}
              >
                First Form
              </Button>
              <Button
                onClick={handlePaymentConfigured}
                size="sm"
                color={progress.paymentConfigured ? 'green' : 'zinc'}
              >
                Setup Payment
              </Button>
              <Button
                onClick={handleFirstClientAdded}
                size="sm"
                color={progress.firstClientAdded ? 'green' : 'zinc'}
              >
                Add Client
              </Button>
            </div>
          </div>
        </div>

        {/* Current State Display */}
        <div className="mt-4 p-3 bg-white rounded border text-xs">
          <h5 className="font-medium text-zinc-700 mb-1">Current State:</h5>
          <pre className="text-zinc-600 overflow-x-auto">
            {JSON.stringify(
              {
                tourActive: state.isActive,
                currentStep: state.currentStep,
                hasSeenTour: state.hasSeenTour,
                completionPercentage: Math.round(
                  (Object.values(progress).filter(Boolean).length /
                    Object.values(progress).length) *
                    100,
                ),
              },
              null,
              2,
            )}
          </pre>
        </div>
      </div>

      {/* Feature Showcase */}
      <div className="bg-white p-6 rounded-lg border border-zinc-200">
        <h3 className="text-lg font-semibold text-zinc-900 mb-4">
          Onboarding Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-zinc-700">✅ Implemented:</h4>
            <ul className="mt-2 space-y-1 text-zinc-600">
              <li>• 4-step guided tour with Shepherd.js</li>
              <li>• Progress tracking with visual indicators</li>
              <li>• Keyboard shortcuts (? or Ctrl+/)</li>
              <li>• Mobile-responsive design</li>
              <li>• LocalStorage state persistence</li>
              <li>• TypeScript type safety</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-zinc-700">
              🚀 Ready for Extension:
            </h4>
            <ul className="mt-2 space-y-1 text-zinc-600">
              <li>• Contextual help system</li>
              <li>• Sample data generator</li>
              <li>• User role-specific tours</li>
              <li>• Analytics tracking</li>
              <li>• Multi-language support</li>
              <li>• Advanced tour customization</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
