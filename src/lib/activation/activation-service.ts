import { createClient } from '@/lib/supabase/client';

// Activation event types for wedding vendors
export enum ActivationEventType {
  SIGNUP_COMPLETED = 'signup_completed',
  ONBOARDING_COMPLETED = 'onboarding_completed',
  CLIENT_IMPORTED = 'client_imported',
  FORM_SENT = 'form_sent',
  RESPONSE_RECEIVED = 'response_received',
  AUTOMATION_CREATED = 'automation_created',
  PAYMENT_SETUP = 'payment_setup',
  TEAM_MEMBER_INVITED = 'team_member_invited',
  INTEGRATION_CONNECTED = 'integration_connected',
  TEMPLATE_CUSTOMIZED = 'template_customized',
  FIRST_BOOKING = 'first_booking',
  MOBILE_APP_DOWNLOADED = 'mobile_app_downloaded',
}

export interface ActivationEventData {
  event_type: ActivationEventType | string;
  event_data?: Record<string, any>;
  properties?: Record<string, any>;
  session_id?: string;
}

export interface ActivationStatus {
  user_id: string;
  current_step: number;
  completed_steps: number[];
  activation_score: number;
  status:
    | 'not_started'
    | 'in_progress'
    | 'at_risk'
    | 'nearly_complete'
    | 'completed';
  progress_percentage: number;
  last_activity_at: string;
  completed_at?: string;
}

class ActivationService {
  private supabase;
  private sessionId: string;

  constructor() {
    this.supabase = createClient();
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track an activation event for the current user
   */
  async trackEvent(
    eventData: ActivationEventData,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/activation/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...eventData,
          session_id: eventData.session_id || this.sessionId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Failed to track activation event:', result);
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      console.error('Error tracking activation event:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Track signup completion event
   */
  async trackSignupCompleted(
    userData?: Record<string, any>,
  ): Promise<{ success: boolean; error?: string }> {
    return this.trackEvent({
      event_type: ActivationEventType.SIGNUP_COMPLETED,
      event_data: userData,
      properties: {
        source: 'web',
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track onboarding completion event
   */
  async trackOnboardingCompleted(
    onboardingData?: Record<string, any>,
  ): Promise<{ success: boolean; error?: string }> {
    return this.trackEvent({
      event_type: ActivationEventType.ONBOARDING_COMPLETED,
      event_data: onboardingData,
      properties: {
        completion_time: new Date().toISOString(),
        steps_completed: onboardingData?.steps_completed || [],
      },
    });
  }

  /**
   * Track client import event
   */
  async trackClientImported(importData: {
    count: number;
    source?: string;
    method?: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.trackEvent({
      event_type: ActivationEventType.CLIENT_IMPORTED,
      event_data: importData,
      properties: {
        import_timestamp: new Date().toISOString(),
        client_count: importData.count,
      },
    });
  }

  /**
   * Track form sent event
   */
  async trackFormSent(formData: {
    form_id: string;
    client_id: string;
    form_type?: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.trackEvent({
      event_type: ActivationEventType.FORM_SENT,
      event_data: formData,
      properties: {
        sent_timestamp: new Date().toISOString(),
        form_type: formData.form_type || 'custom',
      },
    });
  }

  /**
   * Track response received event
   */
  async trackResponseReceived(responseData: {
    form_id: string;
    client_id: string;
    response_type?: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.trackEvent({
      event_type: ActivationEventType.RESPONSE_RECEIVED,
      event_data: responseData,
      properties: {
        received_timestamp: new Date().toISOString(),
        response_type: responseData.response_type || 'form_response',
      },
    });
  }

  /**
   * Track automation creation event
   */
  async trackAutomationCreated(automationData: {
    automation_type: string;
    trigger_type?: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.trackEvent({
      event_type: ActivationEventType.AUTOMATION_CREATED,
      event_data: automationData,
      properties: {
        created_timestamp: new Date().toISOString(),
        automation_type: automationData.automation_type,
      },
    });
  }

  /**
   * Track integration connection event
   */
  async trackIntegrationConnected(integrationData: {
    integration_name: string;
    integration_type?: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.trackEvent({
      event_type: ActivationEventType.INTEGRATION_CONNECTED,
      event_data: integrationData,
      properties: {
        connected_timestamp: new Date().toISOString(),
        integration_name: integrationData.integration_name,
      },
    });
  }

  /**
   * Get activation status for a user
   */
  async getActivationStatus(userId?: string): Promise<ActivationStatus | null> {
    try {
      let url = '/api/activation/status/';

      if (userId) {
        url += userId;
      } else {
        // Get current user's status
        const {
          data: { user },
        } = await this.supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }
        url += user.id;
      }

      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        console.error('Failed to fetch activation status:', result);
        return null;
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching activation status:', error);
      return null;
    }
  }

  /**
   * Get funnel analytics (admin only)
   */
  async getFunnelAnalytics(options?: {
    days?: number;
    funnel_id?: string;
  }): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (options?.days) params.append('days', options.days.toString());
      if (options?.funnel_id) params.append('funnel_id', options.funnel_id);

      const response = await fetch(`/api/activation/analytics?${params}`);
      const result = await response.json();

      if (!response.ok) {
        console.error('Failed to fetch funnel analytics:', result);
        return null;
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching funnel analytics:', error);
      return null;
    }
  }

  /**
   * Generate analytics for a specific date (admin only)
   */
  async generateAnalytics(
    date?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/activation/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Failed to generate analytics:', result);
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      console.error('Error generating analytics:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Batch track multiple events (useful for onboarding flows)
   */
  async trackBatchEvents(
    events: ActivationEventData[],
  ): Promise<{ success: boolean; error?: string }> {
    const results = await Promise.allSettled(
      events.map((event) => this.trackEvent(event)),
    );

    const failed = results.filter(
      (r) => r.status === 'rejected' || !r.value.success,
    );

    if (failed.length > 0) {
      console.warn(
        `${failed.length}/${events.length} activation events failed to track`,
      );
      return {
        success: false,
        error: `${failed.length} events failed to track`,
      };
    }

    return { success: true };
  }

  /**
   * Check if user should see activation guidance
   */
  async shouldShowActivationGuidance(): Promise<boolean> {
    const status = await this.getActivationStatus();
    if (!status) return true;

    // Show guidance if user hasn't completed key steps or score is low
    return status.activation_score < 60 && !status.completed_at;
  }

  /**
   * Get next recommended activation step
   */
  async getNextActivationStep(): Promise<{
    step: string;
    description: string;
    action_url?: string;
  } | null> {
    const status = await this.getActivationStatus();
    if (!status) return null;

    // Define step recommendations based on current progress
    const stepRecommendations = {
      0: {
        step: 'Complete Onboarding',
        description: 'Finish setting up your account to start using WedSync',
        action_url: '/onboarding',
      },
      1: {
        step: 'Import Your Clients',
        description: 'Add your existing clients to see the power of WedSync',
        action_url: '/clients/import',
      },
      2: {
        step: 'Send Your First Form',
        description: 'Create and send a form to experience automated workflows',
        action_url: '/forms/create',
      },
      3: {
        step: 'Set Up Automation',
        description: 'Automate your workflow to save hours every week',
        action_url: '/journeys',
      },
    };

    return (
      stepRecommendations[
        status.current_step as keyof typeof stepRecommendations
      ] || null
    );
  }
}

// Export singleton instance
export const activationService = new ActivationService();

// Export helper functions for common tracking scenarios
export const trackActivationEvent = (eventData: ActivationEventData) =>
  activationService.trackEvent(eventData);

export const trackSignupCompleted = (userData?: Record<string, any>) =>
  activationService.trackSignupCompleted(userData);

export const trackOnboardingCompleted = (
  onboardingData?: Record<string, any>,
) => activationService.trackOnboardingCompleted(onboardingData);

export const trackClientImported = (importData: {
  count: number;
  source?: string;
  method?: string;
}) => activationService.trackClientImported(importData);

export const trackFormSent = (formData: {
  form_id: string;
  client_id: string;
  form_type?: string;
}) => activationService.trackFormSent(formData);

export const trackResponseReceived = (responseData: {
  form_id: string;
  client_id: string;
  response_type?: string;
}) => activationService.trackResponseReceived(responseData);

export const trackAutomationCreated = (automationData: {
  automation_type: string;
  trigger_type?: string;
}) => activationService.trackAutomationCreated(automationData);

export const trackIntegrationConnected = (integrationData: {
  integration_name: string;
  integration_type?: string;
}) => activationService.trackIntegrationConnected(integrationData);

export default ActivationService;
