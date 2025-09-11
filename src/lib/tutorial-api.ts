// Tutorial API Client
import { z } from 'zod';

// Type definitions
export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  content: {
    primary: string;
    secondary: string;
    cta: string;
    secondaryCta?: string;
  };
  position:
    | 'center-modal'
    | 'top-center'
    | 'bottom-right'
    | 'left'
    | 'right'
    | 'bottom-left';
  highlightTarget?: string | null;
  interactionRequired?: boolean;
  validationTarget?: string;
  interactionHints?: string[];
  demoMode?: boolean;
  smartSuggestions?: boolean;
  celebration?: boolean;
  nextSteps?: string[];
  estimatedTime?: string;
  required?: boolean;
}

export interface TutorialProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  skippedSteps: string[];
  status: 'active' | 'paused' | 'completed';
  progressPercentage: number;
  isCompleted: boolean;
  lastActivity: string;
  canResume?: boolean;
}

export interface TutorialSession {
  id: string;
  type: 'onboarding' | 'feature-discovery' | 'advanced';
  currentStep: number;
  totalSteps: number;
  steps: TutorialStep[];
  canResume: boolean;
}

export interface StartTutorialRequest {
  tutorialType: 'onboarding' | 'feature-discovery' | 'advanced';
  userType?: 'couple' | 'planner' | 'vendor';
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  previousExperience?: boolean;
}

export interface UpdateProgressRequest {
  tutorialType: 'onboarding' | 'feature-discovery' | 'advanced';
  stepId: string;
  action: 'complete' | 'skip' | 'start' | 'pause' | 'resume';
  currentStep: number;
  data?: Record<string, any>;
  timeSpent?: number;
}

// API Response schemas
const tutorialStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  content: z.object({
    primary: z.string(),
    secondary: z.string(),
    cta: z.string(),
    secondaryCta: z.string().optional(),
  }),
  position: z.enum([
    'center-modal',
    'top-center',
    'bottom-right',
    'left',
    'right',
    'bottom-left',
  ]),
  highlightTarget: z.string().nullable().optional(),
  interactionRequired: z.boolean().optional(),
  validationTarget: z.string().optional(),
  interactionHints: z.array(z.string()).optional(),
  demoMode: z.boolean().optional(),
  smartSuggestions: z.boolean().optional(),
  celebration: z.boolean().optional(),
  nextSteps: z.array(z.string()).optional(),
  estimatedTime: z.string().optional(),
  required: z.boolean().optional(),
});

const tutorialSessionSchema = z.object({
  id: z.string(),
  type: z.enum(['onboarding', 'feature-discovery', 'advanced']),
  currentStep: z.number(),
  totalSteps: z.number(),
  steps: z.array(tutorialStepSchema),
  canResume: z.boolean(),
});

const tutorialProgressSchema = z.object({
  currentStep: z.number(),
  totalSteps: z.number(),
  completedSteps: z.array(z.string()),
  skippedSteps: z.array(z.string()),
  status: z.enum(['active', 'paused', 'completed']),
  progressPercentage: z.number(),
  isCompleted: z.boolean(),
  lastActivity: z.string(),
  canResume: z.boolean().optional(),
});

// API Error class
export class TutorialAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any,
  ) {
    super(message);
    this.name = 'TutorialAPIError';
  }
}

// API Client class
export class TutorialAPI {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/tutorials') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TutorialAPIError(
        errorData.error || 'API request failed',
        response.status,
        errorData.details,
      );
    }

    return response.json();
  }

  // Start a new tutorial session
  async startTutorial(request: StartTutorialRequest): Promise<TutorialSession> {
    const response = await this.request<{
      success: boolean;
      tutorial: TutorialSession;
    }>('/start', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    return tutorialSessionSchema.parse(response.tutorial);
  }

  // Update tutorial progress
  async updateProgress(
    request: UpdateProgressRequest,
  ): Promise<TutorialProgress> {
    const response = await this.request<{
      success: boolean;
      progress: TutorialProgress;
    }>('/progress', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    return tutorialProgressSchema.parse(response.progress);
  }

  // Get current tutorial progress
  async getProgress(tutorialType?: string): Promise<TutorialProgress[]> {
    const params = tutorialType ? `?tutorialType=${tutorialType}` : '';
    const response = await this.request<{
      success: boolean;
      tutorials: TutorialProgress[];
    }>(`/progress${params}`);

    return z.array(tutorialProgressSchema).parse(response.tutorials);
  }

  // Complete a tutorial step
  async completeStep(
    tutorialType: StartTutorialRequest['tutorialType'],
    stepId: string,
    currentStep: number,
    timeSpent?: number,
    data?: Record<string, any>,
  ): Promise<TutorialProgress> {
    return this.updateProgress({
      tutorialType,
      stepId,
      action: 'complete',
      currentStep,
      timeSpent,
      data,
    });
  }

  // Skip a tutorial step
  async skipStep(
    tutorialType: StartTutorialRequest['tutorialType'],
    stepId: string,
    currentStep: number,
  ): Promise<TutorialProgress> {
    return this.updateProgress({
      tutorialType,
      stepId,
      action: 'skip',
      currentStep,
    });
  }

  // Pause tutorial
  async pauseTutorial(
    tutorialType: StartTutorialRequest['tutorialType'],
    stepId: string,
    currentStep: number,
  ): Promise<TutorialProgress> {
    return this.updateProgress({
      tutorialType,
      stepId,
      action: 'pause',
      currentStep,
    });
  }

  // Resume tutorial
  async resumeTutorial(
    tutorialType: StartTutorialRequest['tutorialType'],
    stepId: string,
    currentStep: number,
  ): Promise<TutorialProgress> {
    return this.updateProgress({
      tutorialType,
      stepId,
      action: 'resume',
      currentStep,
    });
  }
}

// Default API client instance
export const tutorialAPI = new TutorialAPI();

// Helper functions for common operations
export const tutorialHelpers = {
  // Check if tutorial is available for user
  canStartTutorial: (
    userType: 'couple' | 'planner' | 'vendor' = 'couple',
  ): boolean => {
    return true; // All users can start tutorials
  },

  // Get recommended tutorial based on user state
  getRecommendedTutorial: (userProfile: {
    isNewUser?: boolean;
    completedFeatures?: string[];
  }): 'onboarding' | 'feature-discovery' | 'advanced' => {
    if (userProfile.isNewUser) {
      return 'onboarding';
    }

    if (!userProfile.completedFeatures?.length) {
      return 'feature-discovery';
    }

    return 'advanced';
  },

  // Calculate estimated completion time
  getEstimatedTime: (steps: TutorialStep[]): string => {
    const baseTimes = {
      'welcome-orientation': 45,
      'profile-setup': 60,
      'dashboard-overview': 75,
      'vendor-management': 90,
      'timeline-creation': 80,
      'communication-hub': 70,
      'celebration-completion': 45,
    };

    const totalSeconds = steps.reduce((total, step) => {
      return total + (baseTimes[step.id as keyof typeof baseTimes] || 60);
    }, 0);

    const minutes = Math.ceil(totalSeconds / 60);
    return `${minutes} min`;
  },

  // Format progress for display
  formatProgress: (progress: TutorialProgress): string => {
    return `${progress.progressPercentage}% complete (${progress.completedSteps.length}/${progress.totalSteps} steps)`;
  },
};

export default tutorialAPI;
