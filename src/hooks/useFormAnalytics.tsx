import { useCallback } from 'react';

export function useFormAnalytics() {
  const trackEvent = useCallback(
    (eventName: string, properties?: Record<string, any>) => {
      // Placeholder for analytics tracking
      console.log('Analytics Event:', eventName, properties);
    },
    [],
  );

  const trackFormSubmission = useCallback(
    (formId: string, formData: any) => {
      trackEvent('form_submitted', {
        formId,
        timestamp: new Date().toISOString(),
      });
    },
    [trackEvent],
  );

  const trackFieldInteraction = useCallback(
    (fieldName: string, action: string) => {
      trackEvent('field_interaction', { fieldName, action });
    },
    [trackEvent],
  );

  return {
    trackEvent,
    trackFormSubmission,
    trackFieldInteraction,
  };
}
