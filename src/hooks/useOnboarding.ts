'use client';

import { useState, useEffect, useCallback } from 'react';
import { OnboardingState, OnboardingProgress } from '@/types/onboarding';

const ONBOARDING_STORAGE_KEY = 'wedsync-onboarding';
const PROGRESS_STORAGE_KEY = 'wedsync-progress';

const defaultState: OnboardingState = {
  isActive: false,
  currentStep: 0,
  isCompleted: false,
  isSkipped: false,
  hasSeenTour: false,
};

const defaultProgress: OnboardingProgress = {
  profileCompleted: false,
  firstFormCreated: false,
  paymentConfigured: false,
  firstClientAdded: false,
};

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(defaultState);
  const [progress, setProgress] = useState<OnboardingProgress>(defaultProgress);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      const savedProgress = localStorage.getItem(PROGRESS_STORAGE_KEY);

      if (savedState) {
        setState(JSON.parse(savedState));
      }

      if (savedProgress) {
        setProgress(JSON.parse(savedProgress));
      } else {
        // If no progress saved, start the tour for new users
        setState((prev) => ({ ...prev, isActive: true }));
      }
    } catch (error) {
      console.error('Failed to load onboarding state:', error);
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save onboarding state:', error);
    }
  }, [state]);

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error('Failed to save progress state:', error);
    }
  }, [progress]);

  const startTour = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: true,
      currentStep: 0,
      isCompleted: false,
      isSkipped: false,
    }));
  }, []);

  const completeTour = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: false,
      isCompleted: true,
      hasSeenTour: true,
    }));
  }, []);

  const skipTour = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: false,
      isSkipped: true,
      hasSeenTour: true,
    }));
  }, []);

  const restartTour = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: true,
      currentStep: 0,
      isCompleted: false,
      isSkipped: false,
    }));
  }, []);

  const updateStep = useCallback((step: number) => {
    setState((prev) => ({
      ...prev,
      currentStep: step,
    }));
  }, []);

  const updateProgress = useCallback((updates: Partial<OnboardingProgress>) => {
    setProgress((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(defaultProgress);
  }, []);

  const shouldShowTour =
    !state.hasSeenTour && !state.isCompleted && !state.isSkipped;
  const completionPercentage =
    (Object.values(progress).filter(Boolean).length /
      Object.values(progress).length) *
    100;

  return {
    state,
    progress,
    startTour,
    completeTour,
    skipTour,
    restartTour,
    updateStep,
    updateProgress,
    resetProgress,
    shouldShowTour,
    completionPercentage,
  };
}
