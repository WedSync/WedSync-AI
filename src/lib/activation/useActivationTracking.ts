'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  activationService,
  ActivationStatus,
  ActivationEventType,
} from './activation-service';

export interface UseActivationTrackingReturn {
  status: ActivationStatus | null;
  loading: boolean;
  error: string | null;
  trackEvent: (
    eventType: ActivationEventType | string,
    eventData?: any,
  ) => Promise<void>;
  refreshStatus: () => Promise<void>;
  shouldShowGuidance: boolean;
  nextStep: { step: string; description: string; action_url?: string } | null;
}

export function useActivationTracking(
  userId?: string,
): UseActivationTrackingReturn {
  const [status, setStatus] = useState<ActivationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shouldShowGuidance, setShouldShowGuidance] = useState(false);
  const [nextStep, setNextStep] = useState<{
    step: string;
    description: string;
    action_url?: string;
  } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setError(null);
      const data = await activationService.getActivationStatus(userId);
      setStatus(data);

      // Check if should show guidance
      const showGuidance =
        await activationService.shouldShowActivationGuidance();
      setShouldShowGuidance(showGuidance);

      // Get next step
      const next = await activationService.getNextActivationStep();
      setNextStep(next);
    } catch (err) {
      console.error('Error fetching activation status:', err);
      setError('Failed to load activation status');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const trackEvent = useCallback(
    async (eventType: ActivationEventType | string, eventData?: any) => {
      try {
        await activationService.trackEvent({
          event_type: eventType,
          event_data: eventData,
          properties: {
            timestamp: new Date().toISOString(),
            source: 'web_app',
          },
        });

        // Refresh status after tracking event
        await fetchStatus();
      } catch (err) {
        console.error('Error tracking activation event:', err);
      }
    },
    [fetchStatus],
  );

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    await fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    status,
    loading,
    error,
    trackEvent,
    refreshStatus,
    shouldShowGuidance,
    nextStep,
  };
}

// Specialized hooks for common tracking scenarios

export function useSignupTracking() {
  const { trackEvent } = useActivationTracking();

  const trackSignupCompleted = useCallback(
    async (userData?: any) => {
      await trackEvent(ActivationEventType.SIGNUP_COMPLETED, userData);
    },
    [trackEvent],
  );

  return { trackSignupCompleted };
}

export function useOnboardingTracking() {
  const { trackEvent } = useActivationTracking();

  const trackOnboardingCompleted = useCallback(
    async (onboardingData?: any) => {
      await trackEvent(
        ActivationEventType.ONBOARDING_COMPLETED,
        onboardingData,
      );
    },
    [trackEvent],
  );

  const trackOnboardingStep = useCallback(
    async (stepName: string, stepData?: any) => {
      await trackEvent('onboarding_step_completed', {
        step_name: stepName,
        ...stepData,
      });
    },
    [trackEvent],
  );

  return {
    trackOnboardingCompleted,
    trackOnboardingStep,
  };
}

export function useClientTracking() {
  const { trackEvent } = useActivationTracking();

  const trackClientImported = useCallback(
    async (importData: { count: number; source?: string; method?: string }) => {
      await trackEvent(ActivationEventType.CLIENT_IMPORTED, importData);
    },
    [trackEvent],
  );

  const trackClientCreated = useCallback(
    async (clientData?: any) => {
      await trackEvent('client_created', clientData);
    },
    [trackEvent],
  );

  return {
    trackClientImported,
    trackClientCreated,
  };
}

export function useFormTracking() {
  const { trackEvent } = useActivationTracking();

  const trackFormSent = useCallback(
    async (formData: {
      form_id: string;
      client_id: string;
      form_type?: string;
    }) => {
      await trackEvent(ActivationEventType.FORM_SENT, formData);
    },
    [trackEvent],
  );

  const trackFormCreated = useCallback(
    async (formData?: any) => {
      await trackEvent('form_created', formData);
    },
    [trackEvent],
  );

  const trackResponseReceived = useCallback(
    async (responseData: {
      form_id: string;
      client_id: string;
      response_type?: string;
    }) => {
      await trackEvent(ActivationEventType.RESPONSE_RECEIVED, responseData);
    },
    [trackEvent],
  );

  return {
    trackFormSent,
    trackFormCreated,
    trackResponseReceived,
  };
}

export function useAutomationTracking() {
  const { trackEvent } = useActivationTracking();

  const trackAutomationCreated = useCallback(
    async (automationData: {
      automation_type: string;
      trigger_type?: string;
    }) => {
      await trackEvent(ActivationEventType.AUTOMATION_CREATED, automationData);
    },
    [trackEvent],
  );

  const trackJourneyCreated = useCallback(
    async (journeyData?: any) => {
      await trackEvent('journey_created', journeyData);
    },
    [trackEvent],
  );

  return {
    trackAutomationCreated,
    trackJourneyCreated,
  };
}

export function useIntegrationTracking() {
  const { trackEvent } = useActivationTracking();

  const trackIntegrationConnected = useCallback(
    async (integrationData: {
      integration_name: string;
      integration_type?: string;
    }) => {
      await trackEvent(
        ActivationEventType.INTEGRATION_CONNECTED,
        integrationData,
      );
    },
    [trackEvent],
  );

  const trackIntegrationUsed = useCallback(
    async (integrationData?: any) => {
      await trackEvent('integration_used', integrationData);
    },
    [trackEvent],
  );

  return {
    trackIntegrationConnected,
    trackIntegrationUsed,
  };
}

// Context wrapper hook for activation guidance
export function useActivationGuidance() {
  const { status, shouldShowGuidance, nextStep, loading } =
    useActivationTracking();

  const getGuidanceLevel = useCallback(() => {
    if (!status) return 'none';

    if (status.activation_score < 20) return 'critical';
    if (status.activation_score < 50) return 'needs_help';
    if (status.activation_score < 80) return 'progressing';
    return 'nearly_complete';
  }, [status]);

  const getGuidanceMessage = useCallback(() => {
    const level = getGuidanceLevel();

    switch (level) {
      case 'critical':
        return "Let's get you started! Our team is here to help you succeed with WedSync.";
      case 'needs_help':
        return "You're making progress! Need help with the next steps?";
      case 'progressing':
        return "Great progress! You're almost fully activated.";
      case 'nearly_complete':
        return 'Excellent! Just a few more steps to full activation.';
      default:
        return null;
    }
  }, [getGuidanceLevel]);

  return {
    status,
    shouldShowGuidance: shouldShowGuidance && !loading,
    nextStep,
    guidanceLevel: getGuidanceLevel(),
    guidanceMessage: getGuidanceMessage(),
    loading,
  };
}
