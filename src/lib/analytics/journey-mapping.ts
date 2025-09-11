import { analytics, AnalyticsEvents } from './providers';
import { eventTracker } from './events';
import { createClient } from '@/lib/supabase/server';

// =============================================
// TYPES AND INTERFACES
// =============================================

export interface JourneyStep {
  id: string;
  name: string;
  category:
    | 'onboarding'
    | 'feature_discovery'
    | 'engagement'
    | 'conversion'
    | 'retention';
  order: number;
  isRequired: boolean;
  expectedDuration?: number; // in minutes
  description?: string;
  triggerEvents: string[];
  completionEvents: string[];
  exitEvents?: string[];
}

export interface UserJourney {
  id: string;
  name: string;
  description: string;
  userType: 'supplier' | 'couple' | 'all';
  platform: 'wedsync' | 'wedme' | 'all';
  steps: JourneyStep[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JourneyProgress {
  userId: string;
  journeyId: string;
  currentStep: number;
  completedSteps: string[];
  startedAt: string;
  lastActivityAt: string;
  completedAt?: string;
  abandonedAt?: string;
  totalTimeSpent: number; // in minutes
  conversionRate: number;
}

export interface JourneyAnalytics {
  journeyId: string;
  journeyName: string;
  totalUsers: number;
  completedUsers: number;
  abandonedUsers: number;
  averageCompletionTime: number;
  conversionRate: number;
  bottlenecks: JourneyBottleneck[];
  stepAnalytics: StepAnalytics[];
}

export interface JourneyBottleneck {
  stepId: string;
  stepName: string;
  dropoffRate: number;
  averageTimeSpent: number;
  commonExitReasons: string[];
}

export interface StepAnalytics {
  stepId: string;
  stepName: string;
  entryCount: number;
  completionCount: number;
  conversionRate: number;
  averageTimeToComplete: number;
  commonPaths: string[];
}

export interface JourneySegment {
  id: string;
  name: string;
  criteria: Record<string, any>;
  userCount: number;
  conversionRate: number;
  averageJourneyTime: number;
}

// =============================================
// PREDEFINED USER JOURNEYS
// =============================================

const SUPPLIER_ONBOARDING_JOURNEY: UserJourney = {
  id: 'supplier-onboarding',
  name: 'Supplier Onboarding',
  description: 'Complete onboarding process for wedding suppliers',
  userType: 'supplier',
  platform: 'wedsync',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  steps: [
    {
      id: 'account-creation',
      name: 'Account Creation',
      category: 'onboarding',
      order: 1,
      isRequired: true,
      expectedDuration: 3,
      triggerEvents: ['signup_started'],
      completionEvents: ['account_created'],
      exitEvents: ['signup_abandoned'],
    },
    {
      id: 'vendor-type-selection',
      name: 'Vendor Type Selection',
      category: 'onboarding',
      order: 2,
      isRequired: true,
      expectedDuration: 1,
      triggerEvents: ['account_created'],
      completionEvents: ['vendor_type_selected'],
      exitEvents: ['onboarding_abandoned'],
    },
    {
      id: 'business-profile',
      name: 'Business Profile Setup',
      category: 'onboarding',
      order: 3,
      isRequired: true,
      expectedDuration: 10,
      triggerEvents: ['vendor_type_selected'],
      completionEvents: ['profile_completed'],
      exitEvents: ['onboarding_abandoned'],
    },
    {
      id: 'first-form-creation',
      name: 'First Form Creation',
      category: 'feature_discovery',
      order: 4,
      isRequired: false,
      expectedDuration: 15,
      triggerEvents: ['profile_completed'],
      completionEvents: ['form_created', 'form_published'],
      exitEvents: ['form_abandoned'],
    },
    {
      id: 'client-invitation',
      name: 'First Client Invitation',
      category: 'engagement',
      order: 5,
      isRequired: false,
      expectedDuration: 5,
      triggerEvents: ['form_published'],
      completionEvents: ['client_invited', 'form_shared'],
      exitEvents: ['engagement_abandoned'],
    },
  ],
};

const COUPLE_RESPONSE_JOURNEY: UserJourney = {
  id: 'couple-response',
  name: 'Couple Response Journey',
  description: 'Couple responds to supplier form and engages',
  userType: 'couple',
  platform: 'wedme',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  steps: [
    {
      id: 'form-discovery',
      name: 'Form Discovery',
      category: 'onboarding',
      order: 1,
      isRequired: true,
      expectedDuration: 1,
      triggerEvents: ['form_link_clicked', 'form_page_viewed'],
      completionEvents: ['form_opened'],
      exitEvents: ['form_abandoned_immediately'],
    },
    {
      id: 'form-engagement',
      name: 'Form Engagement',
      category: 'engagement',
      order: 2,
      isRequired: true,
      expectedDuration: 5,
      triggerEvents: ['form_opened'],
      completionEvents: ['form_field_filled', 'form_progress_made'],
      exitEvents: ['form_abandoned_partial'],
    },
    {
      id: 'form-completion',
      name: 'Form Completion',
      category: 'conversion',
      order: 3,
      isRequired: true,
      expectedDuration: 15,
      triggerEvents: ['form_progress_made'],
      completionEvents: ['form_submitted'],
      exitEvents: ['form_abandoned_near_completion'],
    },
    {
      id: 'wedme-account',
      name: 'WedMe Account Creation',
      category: 'conversion',
      order: 4,
      isRequired: false,
      expectedDuration: 3,
      triggerEvents: ['form_submitted'],
      completionEvents: ['wedme_account_created'],
      exitEvents: ['account_creation_skipped'],
    },
    {
      id: 'ongoing-engagement',
      name: 'Ongoing Engagement',
      category: 'retention',
      order: 5,
      isRequired: false,
      expectedDuration: 30,
      triggerEvents: ['wedme_account_created'],
      completionEvents: ['return_visit', 'additional_form_completed'],
      exitEvents: ['engagement_dropped'],
    },
  ],
};

// =============================================
// JOURNEY MAPPING SERVICE
// =============================================

export class JourneyMappingService {
  private journeys: Map<string, UserJourney> = new Map();
  private userProgress: Map<string, Map<string, JourneyProgress>> = new Map();
  private supabase = createClient();

  constructor() {
    this.initializeDefaultJourneys();
  }

  private initializeDefaultJourneys(): void {
    this.journeys.set(
      SUPPLIER_ONBOARDING_JOURNEY.id,
      SUPPLIER_ONBOARDING_JOURNEY,
    );
    this.journeys.set(COUPLE_RESPONSE_JOURNEY.id, COUPLE_RESPONSE_JOURNEY);
  }

  // =============================================
  // JOURNEY MANAGEMENT
  // =============================================

  createJourney(
    journey: Omit<UserJourney, 'id' | 'createdAt' | 'updatedAt'>,
  ): UserJourney {
    const newJourney: UserJourney = {
      ...journey,
      id: `custom-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.journeys.set(newJourney.id, newJourney);
    return newJourney;
  }

  updateJourney(
    journeyId: string,
    updates: Partial<UserJourney>,
  ): UserJourney | null {
    const journey = this.journeys.get(journeyId);
    if (!journey) return null;

    const updatedJourney = {
      ...journey,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.journeys.set(journeyId, updatedJourney);
    return updatedJourney;
  }

  getJourney(journeyId: string): UserJourney | null {
    return this.journeys.get(journeyId) || null;
  }

  getAllJourneys(): UserJourney[] {
    return Array.from(this.journeys.values());
  }

  getJourneysForUser(
    userType: 'supplier' | 'couple',
    platform: 'wedsync' | 'wedme',
  ): UserJourney[] {
    return Array.from(this.journeys.values()).filter(
      (journey) =>
        journey.isActive &&
        (journey.userType === userType || journey.userType === 'all') &&
        (journey.platform === platform || journey.platform === 'all'),
    );
  }

  // =============================================
  // JOURNEY TRACKING
  // =============================================

  async startJourney(
    userId: string,
    journeyId: string,
  ): Promise<JourneyProgress | null> {
    const journey = this.journeys.get(journeyId);
    if (!journey) return null;

    const progress: JourneyProgress = {
      userId,
      journeyId,
      currentStep: 0,
      completedSteps: [],
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      totalTimeSpent: 0,
      conversionRate: 0,
    };

    if (!this.userProgress.has(userId)) {
      this.userProgress.set(userId, new Map());
    }

    this.userProgress.get(userId)!.set(journeyId, progress);

    // Track journey start event
    analytics.trackEvent(AnalyticsEvents.JOURNEY_CREATED, {
      journey_id: journeyId,
      journey_name: journey.name,
      user_type: journey.userType,
      platform: journey.platform,
    });

    await this.saveProgressToDatabase(progress);
    return progress;
  }

  async trackEvent(
    userId: string,
    eventName: string,
    properties?: Record<string, any>,
  ): Promise<void> {
    const userJourneys = this.userProgress.get(userId);
    if (!userJourneys) return;

    for (const [journeyId, progress] of userJourneys.entries()) {
      if (progress.completedAt || progress.abandonedAt) continue;

      const journey = this.journeys.get(journeyId);
      if (!journey) continue;

      await this.processEventForJourney(
        userId,
        journeyId,
        eventName,
        properties,
        progress,
        journey,
      );
    }
  }

  private async processEventForJourney(
    userId: string,
    journeyId: string,
    eventName: string,
    properties: Record<string, any> = {},
    progress: JourneyProgress,
    journey: UserJourney,
  ): Promise<void> {
    const currentStepIndex = progress.currentStep;
    const currentStep = journey.steps[currentStepIndex];

    if (!currentStep) return;

    // Check if this event completes the current step
    if (currentStep.completionEvents.includes(eventName)) {
      await this.completeStep(
        userId,
        journeyId,
        currentStep.id,
        progress,
        journey,
      );
    }
    // Check if this event exits the journey
    else if (currentStep.exitEvents?.includes(eventName)) {
      await this.abandonJourney(userId, journeyId, eventName, progress);
    }
    // Check if this event triggers the next step
    else if (currentStepIndex < journey.steps.length - 1) {
      const nextStep = journey.steps[currentStepIndex + 1];
      if (nextStep.triggerEvents.includes(eventName)) {
        await this.advanceToNextStep(userId, journeyId, progress, journey);
      }
    }

    progress.lastActivityAt = new Date().toISOString();
    await this.saveProgressToDatabase(progress);
  }

  private async completeStep(
    userId: string,
    journeyId: string,
    stepId: string,
    progress: JourneyProgress,
    journey: UserJourney,
  ): Promise<void> {
    if (!progress.completedSteps.includes(stepId)) {
      progress.completedSteps.push(stepId);

      // Track step completion
      analytics.trackEvent('journey_step_completed', {
        journey_id: journeyId,
        journey_name: journey.name,
        step_id: stepId,
        step_name: journey.steps.find((s) => s.id === stepId)?.name,
        completion_time: Date.now() - new Date(progress.startedAt).getTime(),
        step_number: progress.currentStep + 1,
      });
    }

    // Check if this was the last step
    if (progress.currentStep >= journey.steps.length - 1) {
      await this.completeJourney(userId, journeyId, progress, journey);
    } else {
      await this.advanceToNextStep(userId, journeyId, progress, journey);
    }
  }

  private async advanceToNextStep(
    userId: string,
    journeyId: string,
    progress: JourneyProgress,
    journey: UserJourney,
  ): Promise<void> {
    progress.currentStep++;
    progress.lastActivityAt = new Date().toISOString();

    const newStep = journey.steps[progress.currentStep];
    if (newStep) {
      analytics.trackEvent('journey_step_entered', {
        journey_id: journeyId,
        journey_name: journey.name,
        step_id: newStep.id,
        step_name: newStep.name,
        step_number: progress.currentStep + 1,
      });
    }
  }

  private async completeJourney(
    userId: string,
    journeyId: string,
    progress: JourneyProgress,
    journey: UserJourney,
  ): Promise<void> {
    progress.completedAt = new Date().toISOString();
    progress.totalTimeSpent = Math.round(
      (new Date(progress.completedAt).getTime() -
        new Date(progress.startedAt).getTime()) /
        (1000 * 60),
    );
    progress.conversionRate = 100;

    analytics.trackEvent('journey_completed', {
      journey_id: journeyId,
      journey_name: journey.name,
      total_time: progress.totalTimeSpent,
      steps_completed: progress.completedSteps.length,
      completion_rate: 100,
    });
  }

  private async abandonJourney(
    userId: string,
    journeyId: string,
    exitEvent: string,
    progress: JourneyProgress,
  ): Promise<void> {
    progress.abandonedAt = new Date().toISOString();
    progress.totalTimeSpent = Math.round(
      (new Date(progress.abandonedAt).getTime() -
        new Date(progress.startedAt).getTime()) /
        (1000 * 60),
    );
    progress.conversionRate =
      (progress.completedSteps.length /
        this.journeys.get(progress.journeyId)!.steps.length) *
      100;

    analytics.trackEvent('journey_abandoned', {
      journey_id: journeyId,
      exit_event: exitEvent,
      steps_completed: progress.completedSteps.length,
      total_time: progress.totalTimeSpent,
      abandon_point: progress.currentStep + 1,
    });
  }

  // =============================================
  // ANALYTICS AND INSIGHTS
  // =============================================

  async getJourneyAnalytics(
    journeyId: string,
    timeRange?: string,
  ): Promise<JourneyAnalytics | null> {
    const journey = this.journeys.get(journeyId);
    if (!journey) return null;

    try {
      const { data, error } = await this.supabase.rpc('get_journey_analytics', {
        p_journey_id: journeyId,
        p_time_range: timeRange || '30d',
      });

      if (error) throw error;

      return this.processJourneyAnalytics(data, journey);
    } catch (error) {
      console.error('Failed to get journey analytics:', error);
      return null;
    }
  }

  private processJourneyAnalytics(
    data: any,
    journey: UserJourney,
  ): JourneyAnalytics {
    const stepAnalytics: StepAnalytics[] = journey.steps.map((step) => ({
      stepId: step.id,
      stepName: step.name,
      entryCount: data.step_entries?.[step.id] || 0,
      completionCount: data.step_completions?.[step.id] || 0,
      conversionRate: data.step_conversions?.[step.id] || 0,
      averageTimeToComplete: data.step_avg_time?.[step.id] || 0,
      commonPaths: data.step_paths?.[step.id] || [],
    }));

    const bottlenecks: JourneyBottleneck[] = stepAnalytics
      .filter((step) => step.conversionRate < 50)
      .map((step) => ({
        stepId: step.stepId,
        stepName: step.stepName,
        dropoffRate: 100 - step.conversionRate,
        averageTimeSpent: step.averageTimeToComplete,
        commonExitReasons: data.exit_reasons?.[step.stepId] || [],
      }))
      .sort((a, b) => b.dropoffRate - a.dropoffRate);

    return {
      journeyId: journey.id,
      journeyName: journey.name,
      totalUsers: data.total_users || 0,
      completedUsers: data.completed_users || 0,
      abandonedUsers: data.abandoned_users || 0,
      averageCompletionTime: data.avg_completion_time || 0,
      conversionRate: data.conversion_rate || 0,
      bottlenecks,
      stepAnalytics,
    };
  }

  async getJourneySegments(journeyId: string): Promise<JourneySegment[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_journey_segments', {
        p_journey_id: journeyId,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get journey segments:', error);
      return [];
    }
  }

  async getUserJourneyProgress(
    userId: string,
    journeyId?: string,
  ): Promise<JourneyProgress[]> {
    if (journeyId) {
      const progress = this.userProgress.get(userId)?.get(journeyId);
      return progress ? [progress] : [];
    }

    const userJourneys = this.userProgress.get(userId);
    return userJourneys ? Array.from(userJourneys.values()) : [];
  }

  // =============================================
  // JOURNEY OPTIMIZATION
  // =============================================

  async identifyOptimizationOpportunities(journeyId: string): Promise<{
    bottlenecks: JourneyBottleneck[];
    recommendations: string[];
    potentialImpact: number;
  }> {
    const analytics = await this.getJourneyAnalytics(journeyId);
    if (!analytics) {
      return { bottlenecks: [], recommendations: [], potentialImpact: 0 };
    }

    const recommendations: string[] = [];
    let potentialImpact = 0;

    // Identify major bottlenecks
    const majorBottlenecks = analytics.bottlenecks.filter(
      (b) => b.dropoffRate > 30,
    );

    majorBottlenecks.forEach((bottleneck) => {
      if (bottleneck.averageTimeSpent > 10) {
        recommendations.push(
          `Simplify "${bottleneck.stepName}" - users spend too long on this step`,
        );
        potentialImpact += bottleneck.dropoffRate * 0.3;
      }

      if (bottleneck.dropoffRate > 50) {
        recommendations.push(
          `Critical issue in "${bottleneck.stepName}" - over 50% drop-off rate`,
        );
        potentialImpact += bottleneck.dropoffRate * 0.5;
      }

      if (bottleneck.commonExitReasons.length > 0) {
        recommendations.push(
          `Address common exit reasons in "${bottleneck.stepName}": ${bottleneck.commonExitReasons.join(', ')}`,
        );
        potentialImpact += bottleneck.dropoffRate * 0.2;
      }
    });

    // Overall journey performance recommendations
    if (analytics.conversionRate < 30) {
      recommendations.push(
        'Overall journey conversion is low - consider A/B testing different approaches',
      );
      potentialImpact += 15;
    }

    if (analytics.averageCompletionTime > 60) {
      recommendations.push(
        'Journey takes too long to complete - consider breaking into shorter segments',
      );
      potentialImpact += 10;
    }

    return {
      bottlenecks: majorBottlenecks,
      recommendations,
      potentialImpact: Math.min(potentialImpact, 100),
    };
  }

  // =============================================
  // DATABASE OPERATIONS
  // =============================================

  private async saveProgressToDatabase(
    progress: JourneyProgress,
  ): Promise<void> {
    try {
      const { error } = await this.supabase.from('journey_progress').upsert({
        user_id: progress.userId,
        journey_id: progress.journeyId,
        current_step: progress.currentStep,
        completed_steps: progress.completedSteps,
        started_at: progress.startedAt,
        last_activity_at: progress.lastActivityAt,
        completed_at: progress.completedAt,
        abandoned_at: progress.abandonedAt,
        total_time_spent: progress.totalTimeSpent,
        conversion_rate: progress.conversionRate,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to save journey progress:', error);
    }
  }

  async loadProgressFromDatabase(userId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('journey_progress')
        .select('*')
        .eq('user_id', userId)
        .is('completed_at', null)
        .is('abandoned_at', null);

      if (error) throw error;

      if (data && data.length > 0) {
        if (!this.userProgress.has(userId)) {
          this.userProgress.set(userId, new Map());
        }

        const userJourneys = this.userProgress.get(userId)!;

        data.forEach((record) => {
          const progress: JourneyProgress = {
            userId: record.user_id,
            journeyId: record.journey_id,
            currentStep: record.current_step,
            completedSteps: record.completed_steps || [],
            startedAt: record.started_at,
            lastActivityAt: record.last_activity_at,
            completedAt: record.completed_at,
            abandonedAt: record.abandoned_at,
            totalTimeSpent: record.total_time_spent || 0,
            conversionRate: record.conversion_rate || 0,
          };

          userJourneys.set(record.journey_id, progress);
        });
      }
    } catch (error) {
      console.error('Failed to load journey progress:', error);
    }
  }
}

// =============================================
// SINGLETON INSTANCE
// =============================================

export const journeyMapping = new JourneyMappingService();

// =============================================
// CONVENIENCE FUNCTIONS
// =============================================

export async function startUserJourney(
  userId: string,
  userType: 'supplier' | 'couple',
  platform: 'wedsync' | 'wedme',
): Promise<void> {
  const availableJourneys = journeyMapping.getJourneysForUser(
    userType,
    platform,
  );

  for (const journey of availableJourneys) {
    await journeyMapping.startJourney(userId, journey.id);
  }
}

export async function trackJourneyEvent(
  userId: string,
  eventName: string,
  properties?: Record<string, any>,
): Promise<void> {
  await journeyMapping.trackEvent(userId, eventName, properties);
}

export function getDefaultJourneys(): UserJourney[] {
  return [SUPPLIER_ONBOARDING_JOURNEY, COUPLE_RESPONSE_JOURNEY];
}

// =============================================
// REACT HOOKS
// =============================================

export function useJourneyTracking(userId?: string) {
  const startJourney = async (journeyId: string) => {
    if (!userId) return null;
    return await journeyMapping.startJourney(userId, journeyId);
  };

  const trackEvent = async (
    eventName: string,
    properties?: Record<string, any>,
  ) => {
    if (!userId) return;
    await journeyMapping.trackEvent(userId, eventName, properties);
  };

  const getProgress = async (journeyId?: string) => {
    if (!userId) return [];
    return await journeyMapping.getUserJourneyProgress(userId, journeyId);
  };

  const getAnalytics = async (journeyId: string) => {
    return await journeyMapping.getJourneyAnalytics(journeyId);
  };

  return {
    startJourney,
    trackEvent,
    getProgress,
    getAnalytics,
  };
}
