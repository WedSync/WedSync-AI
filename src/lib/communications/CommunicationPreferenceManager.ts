import { createClient } from '@/lib/supabase/client';
import { Logger } from '@/lib/logging/Logger';

export interface CommunicationPreferences {
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
  slack_enabled: boolean;

  // Feature-specific preferences
  feature_requests: {
    new_requests: boolean;
    status_updates: boolean;
    comments: boolean;
    votes: boolean;
  };

  // Wedding-specific preferences
  wedding_updates: {
    timeline_changes: boolean;
    vendor_updates: boolean;
    urgent_notifications: boolean;
  };

  // Timing preferences
  quiet_hours: {
    enabled: boolean;
    start_time: string; // HH:MM format
    end_time: string;
    timezone: string;
  };

  // Wedding day preferences
  wedding_day_only_critical: boolean;

  // Frequency limits
  max_emails_per_day: number;
  max_sms_per_day: number;

  updated_at: Date;
}

export interface PreferenceUpdate {
  preference_type: keyof CommunicationPreferences;
  value: any;
  reason?: string;
}

/**
 * CommunicationPreferenceManager - Manages user communication preferences
 * Handles GDPR-compliant preference management with wedding industry context
 */
export class CommunicationPreferenceManager {
  private supabase = createClient();
  private logger = new Logger('CommunicationPreferences');
  private cache: Map<string, CommunicationPreferences> = new Map();

  /**
   * Get user communication preferences
   */
  async getUserPreferences(userId: string): Promise<CommunicationPreferences> {
    try {
      // Check cache first
      if (this.cache.has(userId)) {
        const cached = this.cache.get(userId)!;
        // Return if cached within last 10 minutes
        if (Date.now() - cached.updated_at.getTime() < 10 * 60 * 1000) {
          return cached;
        }
      }

      // Fetch from database
      const { data, error } = await this.supabase
        .from('communication_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Not found error
        throw error;
      }

      let preferences: CommunicationPreferences;

      if (data) {
        preferences = {
          user_id: userId,
          email_enabled: data.email_enabled,
          sms_enabled: data.sms_enabled,
          in_app_enabled: data.in_app_enabled,
          slack_enabled: data.slack_enabled,
          feature_requests:
            data.feature_requests || this.getDefaultFeaturePreferences(),
          wedding_updates:
            data.wedding_updates || this.getDefaultWeddingPreferences(),
          quiet_hours: data.quiet_hours || this.getDefaultQuietHours(),
          wedding_day_only_critical: data.wedding_day_only_critical || true,
          max_emails_per_day: data.max_emails_per_day || 5,
          max_sms_per_day: data.max_sms_per_day || 2,
          updated_at: new Date(data.updated_at),
        };
      } else {
        // Create default preferences
        preferences = await this.createDefaultPreferences(userId);
      }

      // Cache the preferences
      this.cache.set(userId, preferences);

      return preferences;
    } catch (error) {
      this.logger.error('Failed to get user preferences', {
        user_id: userId,
        error: error.message,
      });

      // Return safe defaults on error
      return this.createSafeDefaultPreferences(userId);
    }
  }

  /**
   * Update user communication preferences
   */
  async updateUserPreferences(
    userId: string,
    updates: Partial<CommunicationPreferences>,
  ): Promise<CommunicationPreferences> {
    try {
      const currentPreferences = await this.getUserPreferences(userId);

      const updatedPreferences = {
        ...currentPreferences,
        ...updates,
        user_id: userId,
        updated_at: new Date(),
      };

      // Validate preferences
      this.validatePreferences(updatedPreferences);

      // Update in database
      const { error } = await this.supabase
        .from('communication_preferences')
        .upsert({
          user_id: userId,
          email_enabled: updatedPreferences.email_enabled,
          sms_enabled: updatedPreferences.sms_enabled,
          in_app_enabled: updatedPreferences.in_app_enabled,
          slack_enabled: updatedPreferences.slack_enabled,
          feature_requests: updatedPreferences.feature_requests,
          wedding_updates: updatedPreferences.wedding_updates,
          quiet_hours: updatedPreferences.quiet_hours,
          wedding_day_only_critical:
            updatedPreferences.wedding_day_only_critical,
          max_emails_per_day: updatedPreferences.max_emails_per_day,
          max_sms_per_day: updatedPreferences.max_sms_per_day,
          updated_at: updatedPreferences.updated_at,
        });

      if (error) {
        throw error;
      }

      // Update cache
      this.cache.set(userId, updatedPreferences);

      // Log preference change
      await this.logPreferenceChange(userId, updates);

      this.logger.info('User preferences updated', {
        user_id: userId,
        updated_fields: Object.keys(updates),
      });

      return updatedPreferences;
    } catch (error) {
      this.logger.error('Failed to update user preferences', {
        user_id: userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check if user can receive communication at current time
   */
  async canSendCommunication(
    userId: string,
    channel: 'email' | 'sms' | 'in_app' | 'slack',
    urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const preferences = await this.getUserPreferences(userId);
      const now = new Date();

      // Check if channel is enabled
      switch (channel) {
        case 'email':
          if (!preferences.email_enabled) {
            return { allowed: false, reason: 'Email notifications disabled' };
          }
          break;
        case 'sms':
          if (!preferences.sms_enabled) {
            return { allowed: false, reason: 'SMS notifications disabled' };
          }
          break;
        case 'in_app':
          if (!preferences.in_app_enabled) {
            return { allowed: false, reason: 'In-app notifications disabled' };
          }
          break;
        case 'slack':
          if (!preferences.slack_enabled) {
            return { allowed: false, reason: 'Slack notifications disabled' };
          }
          break;
      }

      // Check wedding day restrictions
      if (
        (await this.isWeddingDay(userId)) &&
        preferences.wedding_day_only_critical &&
        urgency !== 'critical'
      ) {
        return {
          allowed: false,
          reason: 'Wedding day - critical notifications only',
        };
      }

      // Check quiet hours
      if (
        urgency !== 'critical' &&
        this.isInQuietHours(preferences.quiet_hours, now)
      ) {
        return { allowed: false, reason: 'User quiet hours' };
      }

      // Check daily limits
      const todayCount = await this.getTodayCount(userId, channel);
      const maxPerDay =
        channel === 'email'
          ? preferences.max_emails_per_day
          : preferences.max_sms_per_day;

      if (
        (channel === 'email' || channel === 'sms') &&
        todayCount >= maxPerDay &&
        urgency !== 'critical'
      ) {
        return { allowed: false, reason: `Daily ${channel} limit reached` };
      }

      return { allowed: true };
    } catch (error) {
      this.logger.error('Failed to check communication permission', {
        user_id: userId,
        channel,
        error: error.message,
      });

      // Default to allowing critical communications
      return { allowed: urgency === 'critical' };
    }
  }

  /**
   * Record communication sent for rate limiting
   */
  async recordCommunicationSent(
    userId: string,
    channel: 'email' | 'sms' | 'in_app' | 'slack',
    type: string,
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('communication_history')
        .insert({
          user_id: userId,
          channel,
          type,
          sent_at: new Date(),
        });

      if (error) {
        this.logger.error('Failed to record communication', {
          error: error.message,
        });
      }
    } catch (error) {
      this.logger.error('Failed to record communication sent', {
        user_id: userId,
        channel,
        error: error.message,
      });
    }
  }

  /**
   * Get communication history for user
   */
  async getCommunicationHistory(
    userId: string,
    days: number = 30,
  ): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('communication_history')
        .select('*')
        .eq('user_id', userId)
        .gte('sent_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000))
        .order('sent_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      this.logger.error('Failed to get communication history', {
        user_id: userId,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Create default preferences for new user
   */
  private async createDefaultPreferences(
    userId: string,
  ): Promise<CommunicationPreferences> {
    const defaults = this.createSafeDefaultPreferences(userId);

    try {
      const { error } = await this.supabase
        .from('communication_preferences')
        .insert({
          user_id: userId,
          email_enabled: defaults.email_enabled,
          sms_enabled: defaults.sms_enabled,
          in_app_enabled: defaults.in_app_enabled,
          slack_enabled: defaults.slack_enabled,
          feature_requests: defaults.feature_requests,
          wedding_updates: defaults.wedding_updates,
          quiet_hours: defaults.quiet_hours,
          wedding_day_only_critical: defaults.wedding_day_only_critical,
          max_emails_per_day: defaults.max_emails_per_day,
          max_sms_per_day: defaults.max_sms_per_day,
          updated_at: defaults.updated_at,
        });

      if (error) {
        throw error;
      }

      this.logger.info('Created default preferences for user', {
        user_id: userId,
      });
    } catch (error) {
      this.logger.error('Failed to create default preferences', {
        user_id: userId,
        error: error.message,
      });
    }

    return defaults;
  }

  /**
   * Create safe default preferences
   */
  private createSafeDefaultPreferences(
    userId: string,
  ): CommunicationPreferences {
    return {
      user_id: userId,
      email_enabled: true,
      sms_enabled: false, // Opt-in for SMS
      in_app_enabled: true,
      slack_enabled: false,
      feature_requests: this.getDefaultFeaturePreferences(),
      wedding_updates: this.getDefaultWeddingPreferences(),
      quiet_hours: this.getDefaultQuietHours(),
      wedding_day_only_critical: true,
      max_emails_per_day: 5,
      max_sms_per_day: 2,
      updated_at: new Date(),
    };
  }

  /**
   * Get default feature request preferences
   */
  private getDefaultFeaturePreferences() {
    return {
      new_requests: false, // Only for admins by default
      status_updates: true,
      comments: true,
      votes: false,
    };
  }

  /**
   * Get default wedding update preferences
   */
  private getDefaultWeddingPreferences() {
    return {
      timeline_changes: true,
      vendor_updates: true,
      urgent_notifications: true,
    };
  }

  /**
   * Get default quiet hours
   */
  private getDefaultQuietHours() {
    return {
      enabled: true,
      start_time: '22:00',
      end_time: '08:00',
      timezone: 'Europe/London',
    };
  }

  /**
   * Validate preferences
   */
  private validatePreferences(preferences: CommunicationPreferences): void {
    // Validate email daily limit
    if (
      preferences.max_emails_per_day < 0 ||
      preferences.max_emails_per_day > 20
    ) {
      throw new Error('Invalid email daily limit (0-20)');
    }

    // Validate SMS daily limit
    if (preferences.max_sms_per_day < 0 || preferences.max_sms_per_day > 10) {
      throw new Error('Invalid SMS daily limit (0-10)');
    }

    // Validate quiet hours
    if (preferences.quiet_hours.enabled) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (
        !timeRegex.test(preferences.quiet_hours.start_time) ||
        !timeRegex.test(preferences.quiet_hours.end_time)
      ) {
        throw new Error('Invalid quiet hours time format (HH:MM)');
      }
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  private isInQuietHours(quietHours: any, now: Date): boolean {
    if (!quietHours.enabled) return false;

    // Simple time check (would need more sophisticated timezone handling in production)
    const nowTime = now.getHours() * 100 + now.getMinutes();
    const startTime = this.parseTimeString(quietHours.start_time);
    const endTime = this.parseTimeString(quietHours.end_time);

    if (startTime <= endTime) {
      // Same day quiet hours
      return nowTime >= startTime && nowTime <= endTime;
    } else {
      // Overnight quiet hours
      return nowTime >= startTime || nowTime <= endTime;
    }
  }

  /**
   * Parse time string to number (HHMM)
   */
  private parseTimeString(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 100 + minutes;
  }

  /**
   * Check if today is user's wedding day
   */
  private async isWeddingDay(userId: string): boolean {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data } = await this.supabase
        .from('couples')
        .select('wedding_date')
        .eq('user_profile_id', userId)
        .single();

      return data?.wedding_date === today;
    } catch {
      return false;
    }
  }

  /**
   * Get today's communication count for user and channel
   */
  private async getTodayCount(
    userId: string,
    channel: string,
  ): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await this.supabase
        .from('communication_history')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('channel', channel)
        .gte('sent_at', `${today}T00:00:00Z`)
        .lt('sent_at', `${today}T23:59:59Z`);

      if (error) {
        throw error;
      }

      return data?.length || 0;
    } catch (error) {
      this.logger.error('Failed to get today count', {
        user_id: userId,
        channel,
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * Log preference changes for audit
   */
  private async logPreferenceChange(
    userId: string,
    changes: Partial<CommunicationPreferences>,
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('preference_change_log')
        .insert({
          user_id: userId,
          changes: changes,
          changed_at: new Date(),
          ip_address: 'system', // Would get actual IP in real implementation
          user_agent: 'system',
        });

      if (error) {
        this.logger.error('Failed to log preference change', {
          error: error.message,
        });
      }
    } catch (error) {
      this.logger.error('Failed to log preference change', {
        user_id: userId,
        error: error.message,
      });
    }
  }

  /**
   * Clear cache for user
   */
  clearUserCache(userId: string): void {
    this.cache.delete(userId);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const preferenceManager = new CommunicationPreferenceManager();
