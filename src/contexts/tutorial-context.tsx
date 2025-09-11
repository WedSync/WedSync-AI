'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from 'react';
import {
  tutorialAPI,
  TutorialSession,
  TutorialProgress,
  TutorialStep,
  TutorialAPIError,
} from '@/lib/tutorial-api';

// Types
export interface TutorialState {
  // Session data
  session: TutorialSession | null;
  isActive: boolean;
  currentStep: TutorialStep | null;

  // Progress data
  progress: TutorialProgress | null;

  // UI state
  isLoading: boolean;
  error: string | null;

  // User preferences
  showHints: boolean;
  autoAdvance: boolean;
  speed: 'slow' | 'normal' | 'fast';

  // Step timing
  stepStartTime: Date | null;
  totalTime: number;
}

export interface TutorialActions {
  // Session control
  startTutorial: (
    type: 'onboarding' | 'feature-discovery' | 'advanced',
    options?: {
      userType?: 'couple' | 'planner' | 'vendor';
      deviceType?: 'mobile' | 'tablet' | 'desktop';
    },
  ) => Promise<void>;
  exitTutorial: () => void;
  pauseTutorial: () => Promise<void>;
  resumeTutorial: () => Promise<void>;

  // Step navigation
  nextStep: () => Promise<void>;
  previousStep: () => void;
  goToStep: (stepNumber: number) => void;
  skipStep: () => Promise<void>;
  completeStep: (data?: Record<string, any>) => Promise<void>;

  // Settings
  updatePreferences: (
    preferences: Partial<{
      showHints: boolean;
      autoAdvance: boolean;
      speed: 'slow' | 'normal' | 'fast';
    }>,
  ) => void;

  // Error handling
  clearError: () => void;
}

// Action types
type TutorialActionType =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SESSION'; payload: TutorialSession | null }
  | { type: 'SET_PROGRESS'; payload: TutorialProgress | null }
  | { type: 'SET_CURRENT_STEP'; payload: TutorialStep | null }
  | { type: 'SET_ACTIVE'; payload: boolean }
  | {
      type: 'UPDATE_PREFERENCES';
      payload: Partial<{
        showHints: boolean;
        autoAdvance: boolean;
        speed: 'slow' | 'normal' | 'fast';
      }>;
    }
  | { type: 'SET_STEP_START_TIME'; payload: Date | null }
  | { type: 'UPDATE_TOTAL_TIME'; payload: number }
  | { type: 'RESET' };

// Initial state
const initialState: TutorialState = {
  session: null,
  isActive: false,
  currentStep: null,
  progress: null,
  isLoading: false,
  error: null,
  showHints: true,
  autoAdvance: false,
  speed: 'normal',
  stepStartTime: null,
  totalTime: 0,
};

// Reducer
function tutorialReducer(
  state: TutorialState,
  action: TutorialActionType,
): TutorialState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'SET_SESSION':
      return {
        ...state,
        session: action.payload,
        isActive: Boolean(action.payload),
        currentStep: action.payload?.steps[0] || null,
      };

    case 'SET_PROGRESS':
      return { ...state, progress: action.payload };

    case 'SET_CURRENT_STEP':
      return { ...state, currentStep: action.payload };

    case 'SET_ACTIVE':
      return { ...state, isActive: action.payload };

    case 'UPDATE_PREFERENCES':
      return { ...state, ...action.payload };

    case 'SET_STEP_START_TIME':
      return { ...state, stepStartTime: action.payload };

    case 'UPDATE_TOTAL_TIME':
      return { ...state, totalTime: state.totalTime + action.payload };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// Context
const TutorialContext = createContext<{
  state: TutorialState;
  actions: TutorialActions;
} | null>(null);

// Provider component
export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(tutorialReducer, initialState);

  // Helper to handle API errors
  const handleError = useCallback((error: any) => {
    console.error('Tutorial error:', error);
    const message =
      error instanceof TutorialAPIError
        ? error.message
        : 'An unexpected error occurred';
    dispatch({ type: 'SET_ERROR', payload: message });
  }, []);

  // Calculate step timing
  const calculateStepTime = useCallback(() => {
    if (state.stepStartTime) {
      const timeSpent = Date.now() - state.stepStartTime.getTime();
      dispatch({ type: 'UPDATE_TOTAL_TIME', payload: timeSpent });
      return timeSpent;
    }
    return 0;
  }, [state.stepStartTime]);

  // Actions implementation
  const actions: TutorialActions = {
    // Start tutorial
    startTutorial: async (type, options = {}) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });

        const session = await tutorialAPI.startTutorial({
          tutorialType: type,
          userType: options.userType || 'couple',
          deviceType: options.deviceType || 'desktop',
        });

        dispatch({ type: 'SET_SESSION', payload: session });
        dispatch({ type: 'SET_STEP_START_TIME', payload: new Date() });

        // Track step start
        await tutorialAPI.updateProgress({
          tutorialType: type,
          stepId: session.steps[0].id,
          action: 'start',
          currentStep: 1,
        });
      } catch (error) {
        handleError(error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Exit tutorial
    exitTutorial: () => {
      if (state.session) {
        // Calculate final time
        calculateStepTime();

        // Save progress as paused
        if (state.currentStep) {
          tutorialAPI
            .pauseTutorial(
              state.session.type,
              state.currentStep.id,
              state.session.currentStep,
            )
            .catch(handleError);
        }
      }

      dispatch({ type: 'RESET' });
    },

    // Pause tutorial
    pauseTutorial: async () => {
      if (!state.session || !state.currentStep) return;

      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const timeSpent = calculateStepTime();
        const progress = await tutorialAPI.pauseTutorial(
          state.session.type,
          state.currentStep.id,
          state.session.currentStep,
        );

        dispatch({ type: 'SET_PROGRESS', payload: progress });
        dispatch({ type: 'SET_ACTIVE', payload: false });
      } catch (error) {
        handleError(error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Resume tutorial
    resumeTutorial: async () => {
      if (!state.session || !state.currentStep) return;

      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const progress = await tutorialAPI.resumeTutorial(
          state.session.type,
          state.currentStep.id,
          state.session.currentStep,
        );

        dispatch({ type: 'SET_PROGRESS', payload: progress });
        dispatch({ type: 'SET_ACTIVE', payload: true });
        dispatch({ type: 'SET_STEP_START_TIME', payload: new Date() });
      } catch (error) {
        handleError(error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Complete current step
    completeStep: async (data) => {
      if (!state.session || !state.currentStep) return;

      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const timeSpent = calculateStepTime();
        const progress = await tutorialAPI.completeStep(
          state.session.type,
          state.currentStep.id,
          state.session.currentStep,
          timeSpent,
          data,
        );

        dispatch({ type: 'SET_PROGRESS', payload: progress });

        // Move to next step if not completed
        if (
          !progress.isCompleted &&
          state.session.currentStep < state.session.totalSteps
        ) {
          const nextStepIndex = state.session.currentStep;
          const nextStep = state.session.steps[nextStepIndex];

          dispatch({ type: 'SET_CURRENT_STEP', payload: nextStep });
          dispatch({ type: 'SET_STEP_START_TIME', payload: new Date() });

          // Update session current step
          const updatedSession = {
            ...state.session,
            currentStep: state.session.currentStep + 1,
          };
          dispatch({ type: 'SET_SESSION', payload: updatedSession });
        } else if (progress.isCompleted) {
          // Tutorial completed
          dispatch({ type: 'SET_ACTIVE', payload: false });
        }
      } catch (error) {
        handleError(error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Skip current step
    skipStep: async () => {
      if (!state.session || !state.currentStep) return;

      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        const progress = await tutorialAPI.skipStep(
          state.session.type,
          state.currentStep.id,
          state.session.currentStep,
        );

        dispatch({ type: 'SET_PROGRESS', payload: progress });

        // Move to next step
        if (state.session.currentStep < state.session.totalSteps) {
          const nextStepIndex = state.session.currentStep;
          const nextStep = state.session.steps[nextStepIndex];

          dispatch({ type: 'SET_CURRENT_STEP', payload: nextStep });
          dispatch({ type: 'SET_STEP_START_TIME', payload: new Date() });

          const updatedSession = {
            ...state.session,
            currentStep: state.session.currentStep + 1,
          };
          dispatch({ type: 'SET_SESSION', payload: updatedSession });
        }
      } catch (error) {
        handleError(error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Next step
    nextStep: async () => {
      await actions.completeStep();
    },

    // Previous step (client-side only)
    previousStep: () => {
      if (!state.session || state.session.currentStep <= 1) return;

      const prevStepIndex = state.session.currentStep - 2;
      const prevStep = state.session.steps[prevStepIndex];

      dispatch({ type: 'SET_CURRENT_STEP', payload: prevStep });
      dispatch({ type: 'SET_STEP_START_TIME', payload: new Date() });

      const updatedSession = {
        ...state.session,
        currentStep: state.session.currentStep - 1,
      };
      dispatch({ type: 'SET_SESSION', payload: updatedSession });
    },

    // Go to specific step
    goToStep: (stepNumber) => {
      if (
        !state.session ||
        stepNumber < 1 ||
        stepNumber > state.session.totalSteps
      )
        return;

      const stepIndex = stepNumber - 1;
      const targetStep = state.session.steps[stepIndex];

      dispatch({ type: 'SET_CURRENT_STEP', payload: targetStep });
      dispatch({ type: 'SET_STEP_START_TIME', payload: new Date() });

      const updatedSession = {
        ...state.session,
        currentStep: stepNumber,
      };
      dispatch({ type: 'SET_SESSION', payload: updatedSession });
    },

    // Update preferences
    updatePreferences: (preferences) => {
      dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
    },

    // Clear error
    clearError: () => {
      dispatch({ type: 'SET_ERROR', payload: null });
    },
  };

  // Load existing progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const tutorials = await tutorialAPI.getProgress();
        const activeTutorial = tutorials.find(
          (t) => t.status === 'active' || t.status === 'paused',
        );

        if (activeTutorial && activeTutorial.canResume) {
          // Show resume option (would be implemented in UI)
          console.log('Tutorial can be resumed:', activeTutorial);
        }
      } catch (error) {
        // Silently handle - user might not have any tutorials
        console.log('No existing tutorials found');
      }
    };

    loadProgress();
  }, []);

  const value = { state, actions };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

// Hook to use tutorial context
export function useTutorial() {
  const context = useContext(TutorialContext);

  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }

  return context;
}

// Convenience hooks for specific tutorial operations
export function useTutorialNavigation() {
  const { state, actions } = useTutorial();

  return {
    currentStep: state.currentStep,
    canGoNext: state.session
      ? state.session.currentStep < state.session.totalSteps
      : false,
    canGoPrevious: state.session ? state.session.currentStep > 1 : false,
    nextStep: actions.nextStep,
    previousStep: actions.previousStep,
    skipStep: actions.skipStep,
    goToStep: actions.goToStep,
  };
}

export function useTutorialProgress() {
  const { state } = useTutorial();

  return {
    progress: state.progress,
    currentStep: state.session?.currentStep || 0,
    totalSteps: state.session?.totalSteps || 0,
    isCompleted: state.progress?.isCompleted || false,
    progressPercentage: state.progress?.progressPercentage || 0,
  };
}

export function useTutorialSession() {
  const { state, actions } = useTutorial();

  return {
    session: state.session,
    isActive: state.isActive,
    isLoading: state.isLoading,
    error: state.error,
    startTutorial: actions.startTutorial,
    exitTutorial: actions.exitTutorial,
    pauseTutorial: actions.pauseTutorial,
    resumeTutorial: actions.resumeTutorial,
    clearError: actions.clearError,
  };
}
