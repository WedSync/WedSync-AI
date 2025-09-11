'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  PlayIcon,
  ClockIcon,
  BookmarkIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  StarIcon,
  TrophyIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleIconSolid,
  BookmarkIcon as BookmarkIconSolid,
} from '@heroicons/react/24/solid';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  estimatedTime: number;
  isCompleted: boolean;
  isOptional?: boolean;
  videoUrl?: string;
  resources?: Resource[];
}

interface Resource {
  id: string;
  title: string;
  type: 'pdf' | 'link' | 'template' | 'checklist';
  url: string;
  size?: string;
}

interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  totalSteps: number;
  completedSteps: number;
  estimatedTime: number;
  timeSpent: number;
  lastAccessed?: string;
  steps: TutorialStep[];
  certificate?: {
    available: boolean;
    earned: boolean;
    earnedDate?: string;
  };
}

interface UserProgress {
  totalTutorials: number;
  completedTutorials: number;
  totalSteps: number;
  completedSteps: number;
  timeSpent: number;
  streak: number;
  badges: Badge[];
  level: {
    current: number;
    name: string;
    progress: number;
    nextLevelXP: number;
  };
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedDate: string;
  category: 'completion' | 'streak' | 'time' | 'specialty';
}

export interface TutorialProgressProps {
  tutorial: Tutorial;
  userProgress: UserProgress;
  onStepComplete: (tutorialId: string, stepId: string) => void;
  onStepStart: (tutorialId: string, stepId: string) => void;
  onBookmarkToggle: (
    tutorialId: string,
    stepId: string,
    isBookmarked: boolean,
  ) => void;
  onCertificateRequest?: (tutorialId: string) => void;
  isBookmarked?: (stepId: string) => boolean;
  className?: string;
}

const getDifficultyColor = (difficulty: Tutorial['difficulty']) => {
  switch (difficulty) {
    case 'beginner':
      return 'bg-green-100 text-green-800';
    case 'intermediate':
      return 'bg-yellow-100 text-yellow-800';
    case 'advanced':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatTime = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const getProgressColor = (percentage: number) => {
  if (percentage >= 80) return 'bg-green-500';
  if (percentage >= 50) return 'bg-yellow-500';
  return 'bg-blue-500';
};

export function TutorialProgress({
  tutorial,
  userProgress,
  onStepComplete,
  onStepStart,
  onBookmarkToggle,
  onCertificateRequest,
  isBookmarked,
  className = '',
}: TutorialProgressProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [activeStep, setActiveStep] = useState<string | null>(null);

  const progressPercentage = useMemo(() => {
    return tutorial.totalSteps > 0
      ? Math.round((tutorial.completedSteps / tutorial.totalSteps) * 100)
      : 0;
  }, [tutorial.completedSteps, tutorial.totalSteps]);

  const canEarnCertificate = useMemo(() => {
    return (
      tutorial.certificate?.available &&
      progressPercentage === 100 &&
      !tutorial.certificate.earned
    );
  }, [tutorial.certificate, progressPercentage]);

  const handleStepToggle = useCallback((stepId: string) => {
    setExpandedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  }, []);

  const handleStepStart = useCallback(
    (stepId: string) => {
      setActiveStep(stepId);
      onStepStart(tutorial.id, stepId);
    },
    [tutorial.id, onStepStart],
  );

  const handleStepComplete = useCallback(
    (stepId: string) => {
      onStepComplete(tutorial.id, stepId);
      setActiveStep(null);
    },
    [tutorial.id, onStepComplete],
  );

  const handleBookmark = useCallback(
    (stepId: string) => {
      const bookmarked = isBookmarked?.(stepId) || false;
      onBookmarkToggle(tutorial.id, stepId, !bookmarked);
    },
    [tutorial.id, onBookmarkToggle, isBookmarked],
  );

  const renderResource = (resource: Resource) => (
    <a
      key={resource.id}
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center p-2 text-sm text-gray-600 hover:text-primary-600 hover:bg-gray-50 rounded-md transition-colors duration-200"
    >
      <div className="flex items-center flex-1">
        <span className="text-xs px-2 py-1 bg-gray-100 rounded mr-2">
          {resource.type.toUpperCase()}
        </span>
        <span>{resource.title}</span>
      </div>
      {resource.size && (
        <span className="text-xs text-gray-400">{resource.size}</span>
      )}
    </a>
  );

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}
    >
      {/* Tutorial Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xs text-gray-500">{tutorial.category}</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(tutorial.difficulty)}`}
              >
                {tutorial.difficulty}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {tutorial.title}
            </h2>
            <p className="text-sm text-gray-600 mb-3">{tutorial.description}</p>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {tutorial.completedSteps}/{tutorial.totalSteps}
            </div>
            <div className="text-xs text-gray-500">Steps Completed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {progressPercentage}%
            </div>
            <div className="text-xs text-gray-500">Progress</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {formatTime(tutorial.timeSpent)}
            </div>
            <div className="text-xs text-gray-500">Time Spent</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {formatTime(tutorial.estimatedTime)}
            </div>
            <div className="text-xs text-gray-500">Est. Total</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(progressPercentage)}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Certificate Section */}
        {tutorial.certificate?.available && (
          <div
            className={`p-3 rounded-lg border ${
              tutorial.certificate.earned
                ? 'bg-green-50 border-green-200'
                : canEarnCertificate
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {tutorial.certificate.earned ? (
                  <TrophyIcon className="w-5 h-5 text-green-600 mr-2" />
                ) : (
                  <AcademicCapIcon className="w-5 h-5 text-gray-500 mr-2" />
                )}
                <div>
                  <div className="text-sm font-medium">
                    {tutorial.certificate.earned
                      ? 'Certificate Earned!'
                      : 'Certificate Available'}
                  </div>
                  <div className="text-xs text-gray-600">
                    {tutorial.certificate.earned
                      ? `Earned on ${tutorial.certificate.earnedDate}`
                      : 'Complete all steps to earn your certificate'}
                  </div>
                </div>
              </div>

              {canEarnCertificate && (
                <button
                  onClick={() => onCertificateRequest?.(tutorial.id)}
                  className="px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded hover:bg-primary-700 transition-colors duration-200"
                >
                  Claim Certificate
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Steps List */}
      <div className="divide-y divide-gray-100">
        {tutorial.steps.map((step, index) => {
          const isExpanded = expandedSteps.has(step.id);
          const stepIsBookmarked = isBookmarked?.(step.id) || false;
          const isActive = activeStep === step.id;

          return (
            <div key={step.id} className="p-4">
              <div className="flex items-start space-x-3">
                {/* Step Status Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {step.isCompleted ? (
                    <CheckCircleIconSolid className="w-5 h-5 text-green-500" />
                  ) : isActive ? (
                    <div className="w-5 h-5 rounded-full bg-primary-500 animate-pulse" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => handleStepToggle(step.id)}
                    className="w-full text-left focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg p-2 -m-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h3
                          className={`text-sm font-medium ${
                            step.isCompleted ? 'text-gray-900' : 'text-gray-700'
                          }`}
                        >
                          Step {index + 1}: {step.title}
                          {step.isOptional && (
                            <span className="ml-2 text-xs text-gray-500">
                              (Optional)
                            </span>
                          )}
                        </h3>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="flex items-center text-xs text-gray-500">
                          <ClockIcon className="w-3 h-3 mr-1" />
                          {step.estimatedTime}m
                        </div>

                        {isExpanded ? (
                          <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-2 pl-2"
                      >
                        <p className="text-sm text-gray-600 mb-3">
                          {step.description}
                        </p>

                        {/* Step Actions */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            {!step.isCompleted && (
                              <button
                                onClick={() => handleStepStart(step.id)}
                                className="inline-flex items-center px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded hover:bg-primary-700 transition-colors duration-200"
                              >
                                <PlayIcon className="w-3 h-3 mr-1" />
                                {isActive ? 'Continue' : 'Start Step'}
                              </button>
                            )}

                            {isActive && !step.isCompleted && (
                              <button
                                onClick={() => handleStepComplete(step.id)}
                                className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors duration-200"
                              >
                                <CheckCircleIcon className="w-3 h-3 mr-1" />
                                Mark Complete
                              </button>
                            )}
                          </div>

                          <button
                            onClick={() => handleBookmark(step.id)}
                            className="p-1 text-gray-400 hover:text-yellow-500 transition-colors duration-200"
                            aria-label={
                              stepIsBookmarked
                                ? 'Remove bookmark'
                                : 'Add bookmark'
                            }
                          >
                            {stepIsBookmarked ? (
                              <BookmarkIconSolid className="w-4 h-4 text-yellow-500" />
                            ) : (
                              <BookmarkIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* Resources */}
                        {step.resources && step.resources.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-700 mb-2">
                              Resources:
                            </h4>
                            <div className="space-y-1">
                              {step.resources.map(renderResource)}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tutorial Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Last accessed:{' '}
            {tutorial.lastAccessed
              ? new Date(tutorial.lastAccessed).toLocaleDateString()
              : 'Never'}
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <StarIcon className="w-4 h-4 mr-1 text-yellow-400" />
              <span>{userProgress.level.current}</span>
            </div>

            {userProgress.streak > 0 && (
              <div className="flex items-center">
                <span className="text-orange-500">🔥</span>
                <span className="ml-1">{userProgress.streak} day streak</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
