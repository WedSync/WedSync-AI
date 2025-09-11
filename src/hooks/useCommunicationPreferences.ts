import { useState, useEffect, useCallback } from 'react';
import { CommunicationPreferences } from '@/lib/communications/CommunicationPreferenceManager';
import { Logger } from '@/lib/logging/Logger';

interface UseCommunicationPreferencesReturn {
  preferences: CommunicationPreferences | null;
  isLoading: boolean;
  error: string | null;
  updatePreferences: (
    updates: Partial<CommunicationPreferences>,
  ) => Promise<void>;
  refreshPreferences: () => Promise<void>;
  canSendCommunication: (
    channel: string,
    urgency?: string,
  ) => Promise<{ allowed: boolean; reason?: string }>;
}

const logger = new Logger('useCommunicationPreferences');

/**
 * React hook for managing communication preferences
 * Provides preference management with wedding industry context
 */
export function useCommunicationPreferences(): UseCommunicationPreferencesReturn {
  const [preferences, setPreferences] =
    useState<CommunicationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch user preferences from API
   */
  const fetchPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/communications/preferences', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch preferences');
      }

      const data = await response.json();
      setPreferences(data.preferences);

      logger.debug('Communication preferences loaded', {
        email_enabled: data.preferences.email_enabled,
        sms_enabled: data.preferences.sms_enabled,
        in_app_enabled: data.preferences.in_app_enabled,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load preferences';
      setError(errorMessage);
      logger.error('Failed to fetch communication preferences', {
        error: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update user preferences
   */
  const updatePreferences = useCallback(
    async (updates: Partial<CommunicationPreferences>) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/communications/preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update preferences');
        }

        const data = await response.json();
        setPreferences(data.preferences);

        logger.info('Communication preferences updated', {
          updated_fields: Object.keys(updates),
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update preferences';
        setError(errorMessage);
        logger.error('Failed to update communication preferences', {
          error: errorMessage,
        });
        throw err; // Re-throw to allow UI to handle
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  /**
   * Refresh preferences
   */
  const refreshPreferences = useCallback(async () => {
    await fetchPreferences();
  }, [fetchPreferences]);

  /**
   * Check if communication can be sent on specific channel
   */
  const canSendCommunication = useCallback(
    async (
      channel: string,
      urgency: string = 'medium',
    ): Promise<{ allowed: boolean; reason?: string }> => {
      try {
        const response = await fetch('/api/communications/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ channel, urgency }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || 'Failed to check communication permission',
          );
        }

        const data = await response.json();
        return {
          allowed: data.allowed,
          reason: data.reason,
        };
      } catch (err) {
        logger.error('Failed to check communication permission', {
          channel,
          urgency,
          error: err instanceof Error ? err.message : 'Unknown error',
        });

        // Default to allowing critical communications
        return {
          allowed: urgency === 'critical',
          reason:
            urgency === 'critical' ? undefined : 'Permission check failed',
        };
      }
    },
    [],
  );

  // Load preferences on mount
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
    refreshPreferences,
    canSendCommunication,
  };
}

/**
 * Hook for specific preference sections
 */
export function useFeatureRequestPreferences() {
  const { preferences, updatePreferences, isLoading, error } =
    useCommunicationPreferences();

  const updateFeaturePreferences = useCallback(
    async (
      featurePrefs: Partial<CommunicationPreferences['feature_requests']>,
    ) => {
      if (!preferences) return;

      await updatePreferences({
        feature_requests: {
          ...preferences.feature_requests,
          ...featurePrefs,
        },
      });
    },
    [preferences, updatePreferences],
  );

  return {
    featurePreferences: preferences?.feature_requests,
    updateFeaturePreferences,
    isLoading,
    error,
  };
}

/**
 * Hook for wedding-specific preferences
 */
export function useWeddingCommunicationPreferences() {
  const { preferences, updatePreferences, isLoading, error } =
    useCommunicationPreferences();

  const updateWeddingPreferences = useCallback(
    async (
      weddingPrefs: Partial<CommunicationPreferences['wedding_updates']>,
    ) => {
      if (!preferences) return;

      await updatePreferences({
        wedding_updates: {
          ...preferences.wedding_updates,
          ...weddingPrefs,
        },
      });
    },
    [preferences, updatePreferences],
  );

  const toggleWeddingDayMode = useCallback(
    async (enabled: boolean) => {
      await updatePreferences({
        wedding_day_only_critical: enabled,
      });
    },
    [updatePreferences],
  );

  return {
    weddingPreferences: preferences?.wedding_updates,
    weddingDayOnlyCritical: preferences?.wedding_day_only_critical,
    updateWeddingPreferences,
    toggleWeddingDayMode,
    isLoading,
    error,
  };
}

/**
 * Hook for quiet hours management
 */
export function useQuietHours() {
  const { preferences, updatePreferences, isLoading, error } =
    useCommunicationPreferences();

  const updateQuietHours = useCallback(
    async (quietHours: CommunicationPreferences['quiet_hours']) => {
      await updatePreferences({ quiet_hours: quietHours });
    },
    [updatePreferences],
  );

  const toggleQuietHours = useCallback(
    async (enabled: boolean) => {
      if (!preferences?.quiet_hours) return;

      await updatePreferences({
        quiet_hours: {
          ...preferences.quiet_hours,
          enabled,
        },
      });
    },
    [preferences, updatePreferences],
  );

  return {
    quietHours: preferences?.quiet_hours,
    updateQuietHours,
    toggleQuietHours,
    isLoading,
    error,
  };
}

/**
 * Hook for channel-specific preferences
 */
export function useChannelPreferences() {
  const {
    preferences,
    updatePreferences,
    canSendCommunication,
    isLoading,
    error,
  } = useCommunicationPreferences();

  const toggleChannel = useCallback(
    async (channel: 'email' | 'sms' | 'in_app' | 'slack', enabled: boolean) => {
      const update: Partial<CommunicationPreferences> = {};

      switch (channel) {
        case 'email':
          update.email_enabled = enabled;
          break;
        case 'sms':
          update.sms_enabled = enabled;
          break;
        case 'in_app':
          update.in_app_enabled = enabled;
          break;
        case 'slack':
          update.slack_enabled = enabled;
          break;
      }

      await updatePreferences(update);
    },
    [updatePreferences],
  );

  const updateDailyLimits = useCallback(
    async (emailLimit?: number, smsLimit?: number) => {
      const update: Partial<CommunicationPreferences> = {};

      if (emailLimit !== undefined) {
        update.max_emails_per_day = emailLimit;
      }

      if (smsLimit !== undefined) {
        update.max_sms_per_day = smsLimit;
      }

      await updatePreferences(update);
    },
    [updatePreferences],
  );

  return {
    emailEnabled: preferences?.email_enabled,
    smsEnabled: preferences?.sms_enabled,
    inAppEnabled: preferences?.in_app_enabled,
    slackEnabled: preferences?.slack_enabled,
    maxEmailsPerDay: preferences?.max_emails_per_day,
    maxSmsPerDay: preferences?.max_sms_per_day,
    toggleChannel,
    updateDailyLimits,
    canSendCommunication,
    isLoading,
    error,
  };
}

// Default export
export default useCommunicationPreferences;
