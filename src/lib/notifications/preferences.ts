/**
 * WS-008: Notification Preferences Management
 * Manages user notification preferences and channel settings for wedding coordination
 */

import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';
import { NotificationChannel, NotificationRecipient } from './engine';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  user_type: 'couple' | 'vendor' | 'planner' | 'guest';
  wedding_id?: string;
  vendor_id?: string;

  // Channel preferences
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;

  // Channel priority (1 = highest priority)
  email_priority: number;
  sms_priority: number;
  push_priority: number;
  in_app_priority: number;

  // Quiet hours settings
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // HH:MM format
  quiet_hours_end: string; // HH:MM format
  timezone: string;

  // Category preferences
  wedding_timeline_notifications: boolean;
  vendor_communication_notifications: boolean;
  payment_notifications: boolean;
  emergency_notifications: boolean;
  reminder_notifications: boolean;
  confirmation_notifications: boolean;

  // Priority filtering
  wedding_priority_only: boolean; // Only receive high+ priority notifications
  emergency_override_quiet_hours: boolean;

  // Contact information
  email_address?: string;
  phone_number?: string;
  push_token?: string;

  // Consent and compliance
  email_consent: boolean;
  sms_consent: boolean;
  push_consent: boolean;
  consent_timestamp: string;
  opt_in_method: 'double_opt_in' | 'single_opt_in' | 'imported' | 'admin_added';

  // Wedding-specific settings
  wedding_role?:
    | 'bride'
    | 'groom'
    | 'photographer'
    | 'caterer'
    | 'venue'
    | 'planner'
    | 'guest';
  vendor_categories?: string[]; // Only receive notifications from specific vendor types
  timeline_milestone_alerts: boolean;
  day_of_coordination_mode: boolean; // High-frequency notifications on wedding day

  created_at: string;
  updated_at: string;
}

export interface PreferencesUpdateRequest {
  channel_settings?: {
    email_enabled?: boolean;
    sms_enabled?: boolean;
    push_enabled?: boolean;
    in_app_enabled?: boolean;
    priorities?: {
      email?: number;
      sms?: number;
      push?: number;
      in_app?: number;
    };
  };
  quiet_hours?: {
    enabled?: boolean;
    start?: string;
    end?: string;
    timezone?: string;
    emergency_override?: boolean;
  };
  categories?: {
    wedding_timeline?: boolean;
    vendor_communication?: boolean;
    payment?: boolean;
    emergency?: boolean;
    reminder?: boolean;
    confirmation?: boolean;
  };
  contact_info?: {
    email?: string;
    phone?: string;
    push_token?: string;
  };
  wedding_settings?: {
    priority_only?: boolean;
    role?: string;
    vendor_categories?: string[];
    timeline_alerts?: boolean;
    day_of_coordination?: boolean;
  };
}

export interface BulkPreferencesUpdate {
  user_ids: string[];
  updates: PreferencesUpdateRequest;
  wedding_id?: string;
  vendor_id?: string;
}

/**
 * Notification Preferences Manager
 * Handles user notification preferences and channel management
 */
export class NotificationPreferencesManager {
  private static instance: NotificationPreferencesManager;
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    this.supabase = createClient();
  }

  static getInstance(): NotificationPreferencesManager {
    if (!NotificationPreferencesManager.instance) {
      NotificationPreferencesManager.instance =
        new NotificationPreferencesManager();
    }
    return NotificationPreferencesManager.instance;
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(
    userId: string,
    weddingId?: string,
  ): Promise<NotificationPreferences | null> {
    try {
      let query = this.supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId);

      if (weddingId) {
        query = query.eq('wedding_id', weddingId);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No preferences found, create defaults
          return await this.createDefaultPreferences(userId, weddingId);
        }
        throw error;
      }

      return data as NotificationPreferences;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      throw error;
    }
  }

  /**
   * Create default notification preferences for new user
   */
  async createDefaultPreferences(
    userId: string,
    weddingId?: string,
    userType: 'couple' | 'vendor' | 'planner' | 'guest' = 'couple',
    vendorId?: string,
  ): Promise<NotificationPreferences> {
    const defaultPreferences: Omit<
      NotificationPreferences,
      'id' | 'created_at' | 'updated_at'
    > = {
      user_id: userId,
      user_type: userType,
      wedding_id: weddingId,
      vendor_id: vendorId,

      // Enable all channels by default
      email_enabled: true,
      sms_enabled: true,
      push_enabled: true,
      in_app_enabled: true,

      // Default priority order: Push > SMS > Email > In-App
      email_priority: 3,
      sms_priority: 2,
      push_priority: 1,
      in_app_priority: 4,

      // Quiet hours disabled by default
      quiet_hours_enabled: false,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
      timezone: 'America/New_York',

      // All notification categories enabled by default
      wedding_timeline_notifications: true,
      vendor_communication_notifications: true,
      payment_notifications: true,
      emergency_notifications: true,
      reminder_notifications: true,
      confirmation_notifications: true,

      // Priority filtering disabled by default
      wedding_priority_only: false,
      emergency_override_quiet_hours: true,

      // Consent defaults (should be explicitly set)
      email_consent: false,
      sms_consent: false,
      push_consent: false,
      consent_timestamp: new Date().toISOString(),
      opt_in_method: 'single_opt_in',

      // Wedding-specific defaults
      timeline_milestone_alerts: true,
      day_of_coordination_mode: false,
    };

    const { data, error } = await this.supabase
      .from('notification_preferences')
      .insert({
        ...defaultPreferences,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create default preferences: ${error.message}`);
    }

    return data as NotificationPreferences;
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: string,
    updates: PreferencesUpdateRequest,
    weddingId?: string,
  ): Promise<NotificationPreferences> {
    try {
      // Get current preferences
      const currentPrefs = await this.getUserPreferences(userId, weddingId);
      if (!currentPrefs) {
        throw new Error('User preferences not found');
      }

      // Build update object
      const updateData: Partial<NotificationPreferences> = {
        updated_at: new Date().toISOString(),
      };

      // Channel settings
      if (updates.channel_settings) {
        const cs = updates.channel_settings;
        if (cs.email_enabled !== undefined)
          updateData.email_enabled = cs.email_enabled;
        if (cs.sms_enabled !== undefined)
          updateData.sms_enabled = cs.sms_enabled;
        if (cs.push_enabled !== undefined)
          updateData.push_enabled = cs.push_enabled;
        if (cs.in_app_enabled !== undefined)
          updateData.in_app_enabled = cs.in_app_enabled;

        if (cs.priorities) {
          if (cs.priorities.email !== undefined)
            updateData.email_priority = cs.priorities.email;
          if (cs.priorities.sms !== undefined)
            updateData.sms_priority = cs.priorities.sms;
          if (cs.priorities.push !== undefined)
            updateData.push_priority = cs.priorities.push;
          if (cs.priorities.in_app !== undefined)
            updateData.in_app_priority = cs.priorities.in_app;
        }
      }

      // Quiet hours
      if (updates.quiet_hours) {
        const qh = updates.quiet_hours;
        if (qh.enabled !== undefined)
          updateData.quiet_hours_enabled = qh.enabled;
        if (qh.start !== undefined) updateData.quiet_hours_start = qh.start;
        if (qh.end !== undefined) updateData.quiet_hours_end = qh.end;
        if (qh.timezone !== undefined) updateData.timezone = qh.timezone;
        if (qh.emergency_override !== undefined)
          updateData.emergency_override_quiet_hours = qh.emergency_override;
      }

      // Categories
      if (updates.categories) {
        const cat = updates.categories;
        if (cat.wedding_timeline !== undefined)
          updateData.wedding_timeline_notifications = cat.wedding_timeline;
        if (cat.vendor_communication !== undefined)
          updateData.vendor_communication_notifications =
            cat.vendor_communication;
        if (cat.payment !== undefined)
          updateData.payment_notifications = cat.payment;
        if (cat.emergency !== undefined)
          updateData.emergency_notifications = cat.emergency;
        if (cat.reminder !== undefined)
          updateData.reminder_notifications = cat.reminder;
        if (cat.confirmation !== undefined)
          updateData.confirmation_notifications = cat.confirmation;
      }

      // Contact info
      if (updates.contact_info) {
        const ci = updates.contact_info;
        if (ci.email !== undefined) updateData.email_address = ci.email;
        if (ci.phone !== undefined) updateData.phone_number = ci.phone;
        if (ci.push_token !== undefined) updateData.push_token = ci.push_token;
      }

      // Wedding settings
      if (updates.wedding_settings) {
        const ws = updates.wedding_settings;
        if (ws.priority_only !== undefined)
          updateData.wedding_priority_only = ws.priority_only;
        if (ws.role !== undefined) updateData.wedding_role = ws.role as any;
        if (ws.vendor_categories !== undefined)
          updateData.vendor_categories = ws.vendor_categories;
        if (ws.timeline_alerts !== undefined)
          updateData.timeline_milestone_alerts = ws.timeline_alerts;
        if (ws.day_of_coordination !== undefined)
          updateData.day_of_coordination_mode = ws.day_of_coordination;
      }

      // Update in database
      const { data, error } = await this.supabase
        .from('notification_preferences')
        .update(updateData)
        .eq('id', currentPrefs.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update preferences: ${error.message}`);
      }

      return data as NotificationPreferences;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Update consent status for notification channels
   */
  async updateConsent(
    userId: string,
    consentUpdates: {
      email_consent?: boolean;
      sms_consent?: boolean;
      push_consent?: boolean;
    },
    optInMethod:
      | 'double_opt_in'
      | 'single_opt_in'
      | 'imported'
      | 'admin_added' = 'single_opt_in',
    weddingId?: string,
  ): Promise<NotificationPreferences> {
    const currentPrefs = await this.getUserPreferences(userId, weddingId);
    if (!currentPrefs) {
      throw new Error('User preferences not found');
    }

    const updateData: Partial<NotificationPreferences> = {
      consent_timestamp: new Date().toISOString(),
      opt_in_method: optInMethod,
      updated_at: new Date().toISOString(),
    };

    if (consentUpdates.email_consent !== undefined) {
      updateData.email_consent = consentUpdates.email_consent;
      // Disable email channel if consent is revoked
      if (!consentUpdates.email_consent) {
        updateData.email_enabled = false;
      }
    }

    if (consentUpdates.sms_consent !== undefined) {
      updateData.sms_consent = consentUpdates.sms_consent;
      // Disable SMS channel if consent is revoked
      if (!consentUpdates.sms_consent) {
        updateData.sms_enabled = false;
      }
    }

    if (consentUpdates.push_consent !== undefined) {
      updateData.push_consent = consentUpdates.push_consent;
      // Disable push channel if consent is revoked
      if (!consentUpdates.push_consent) {
        updateData.push_enabled = false;
      }
    }

    const { data, error } = await this.supabase
      .from('notification_preferences')
      .update(updateData)
      .eq('id', currentPrefs.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update consent: ${error.message}`);
    }

    // Log consent change for compliance
    await this.logConsentChange(userId, consentUpdates, optInMethod);

    return data as NotificationPreferences;
  }

  /**
   * Bulk update preferences for multiple users
   */
  async bulkUpdatePreferences(request: BulkPreferencesUpdate): Promise<{
    success_count: number;
    failed_count: number;
    errors: string[];
  }> {
    const results = {
      success_count: 0,
      failed_count: 0,
      errors: [] as string[],
    };

    for (const userId of request.user_ids) {
      try {
        await this.updateUserPreferences(
          userId,
          request.updates,
          request.wedding_id,
        );
        results.success_count++;
      } catch (error) {
        results.failed_count++;
        results.errors.push(
          `User ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return results;
  }

  /**
   * Convert preferences to NotificationRecipient format for notification engine
   */
  async getNotificationRecipient(
    userId: string,
    weddingId?: string,
  ): Promise<NotificationRecipient | null> {
    try {
      const preferences = await this.getUserPreferences(userId, weddingId);
      if (!preferences) return null;

      // Get user info
      const { data: user } = await this.supabase
        .from('users')
        .select('id, name, email')
        .eq('id', userId)
        .single();

      if (!user) return null;

      const channels: NotificationChannel[] = [];

      // Build channel array based on preferences
      if (preferences.email_enabled && preferences.email_consent) {
        channels.push({
          type: 'email',
          enabled: true,
          priority: preferences.email_priority,
        });
      }

      if (preferences.sms_enabled && preferences.sms_consent) {
        channels.push({
          type: 'sms',
          enabled: true,
          priority: preferences.sms_priority,
        });
      }

      if (preferences.push_enabled && preferences.push_consent) {
        channels.push({
          type: 'push',
          enabled: true,
          priority: preferences.push_priority,
        });
      }

      if (preferences.in_app_enabled) {
        channels.push({
          type: 'in_app',
          enabled: true,
          priority: preferences.in_app_priority,
        });
      }

      const recipient: NotificationRecipient = {
        id: userId,
        name: user.name,
        email: preferences.email_address || user.email,
        phone: preferences.phone_number,
        push_token: preferences.push_token,
        type: preferences.user_type,
        preferences: {
          channels: channels.sort((a, b) => a.priority - b.priority),
          quiet_hours: preferences.quiet_hours_enabled
            ? {
                start: preferences.quiet_hours_start,
                end: preferences.quiet_hours_end,
                timezone: preferences.timezone,
              }
            : undefined,
          wedding_priority_only: preferences.wedding_priority_only,
        },
        wedding_role: preferences.wedding_role,
      };

      return recipient;
    } catch (error) {
      console.error('Error getting notification recipient:', error);
      return null;
    }
  }

  /**
   * Get notification recipients for a wedding
   */
  async getWeddingRecipients(
    weddingId: string,
    includeVendors: boolean = true,
  ): Promise<NotificationRecipient[]> {
    try {
      const recipients: NotificationRecipient[] = [];

      // Get couple preferences
      const { data: couplePrefs } = await this.supabase
        .from('notification_preferences')
        .select('user_id')
        .eq('wedding_id', weddingId)
        .eq('user_type', 'couple');

      if (couplePrefs) {
        for (const pref of couplePrefs) {
          const recipient = await this.getNotificationRecipient(
            pref.user_id,
            weddingId,
          );
          if (recipient) recipients.push(recipient);
        }
      }

      // Get vendor preferences if requested
      if (includeVendors) {
        const { data: vendorPrefs } = await this.supabase
          .from('notification_preferences')
          .select('user_id')
          .eq('wedding_id', weddingId)
          .eq('user_type', 'vendor');

        if (vendorPrefs) {
          for (const pref of vendorPrefs) {
            const recipient = await this.getNotificationRecipient(
              pref.user_id,
              weddingId,
            );
            if (recipient) recipients.push(recipient);
          }
        }
      }

      return recipients;
    } catch (error) {
      console.error('Error getting wedding recipients:', error);
      return [];
    }
  }

  /**
   * Enable day-of coordination mode for wedding participants
   */
  async enableDayOfCoordinationMode(weddingId: string): Promise<void> {
    try {
      await this.supabase
        .from('notification_preferences')
        .update({
          day_of_coordination_mode: true,
          emergency_override_quiet_hours: true,
          updated_at: new Date().toISOString(),
        })
        .eq('wedding_id', weddingId);

      console.log(`Day-of coordination mode enabled for wedding ${weddingId}`);
    } catch (error) {
      console.error('Error enabling day-of coordination mode:', error);
      throw error;
    }
  }

  /**
   * Disable day-of coordination mode for wedding participants
   */
  async disableDayOfCoordinationMode(weddingId: string): Promise<void> {
    try {
      await this.supabase
        .from('notification_preferences')
        .update({
          day_of_coordination_mode: false,
          updated_at: new Date().toISOString(),
        })
        .eq('wedding_id', weddingId);

      console.log(`Day-of coordination mode disabled for wedding ${weddingId}`);
    } catch (error) {
      console.error('Error disabling day-of coordination mode:', error);
      throw error;
    }
  }

  /**
   * Get preferences analytics for a wedding or vendor
   */
  async getPreferencesAnalytics(params: {
    wedding_id?: string;
    vendor_id?: string;
  }): Promise<{
    total_users: number;
    channel_adoption: Record<string, number>;
    consent_rates: Record<string, number>;
    quiet_hours_usage: number;
    priority_filtering_usage: number;
    day_of_coordination_enabled: number;
  }> {
    try {
      let query = this.supabase.from('notification_preferences').select('*');

      if (params.wedding_id) query = query.eq('wedding_id', params.wedding_id);
      if (params.vendor_id) query = query.eq('vendor_id', params.vendor_id);

      const { data: preferences } = await query;

      if (!preferences || preferences.length === 0) {
        return {
          total_users: 0,
          channel_adoption: {},
          consent_rates: {},
          quiet_hours_usage: 0,
          priority_filtering_usage: 0,
          day_of_coordination_enabled: 0,
        };
      }

      const total = preferences.length;

      const analytics = {
        total_users: total,
        channel_adoption: {
          email:
            (preferences.filter((p) => p.email_enabled).length / total) * 100,
          sms: (preferences.filter((p) => p.sms_enabled).length / total) * 100,
          push:
            (preferences.filter((p) => p.push_enabled).length / total) * 100,
          in_app:
            (preferences.filter((p) => p.in_app_enabled).length / total) * 100,
        },
        consent_rates: {
          email:
            (preferences.filter((p) => p.email_consent).length / total) * 100,
          sms: (preferences.filter((p) => p.sms_consent).length / total) * 100,
          push:
            (preferences.filter((p) => p.push_consent).length / total) * 100,
        },
        quiet_hours_usage:
          (preferences.filter((p) => p.quiet_hours_enabled).length / total) *
          100,
        priority_filtering_usage:
          (preferences.filter((p) => p.wedding_priority_only).length / total) *
          100,
        day_of_coordination_enabled:
          (preferences.filter((p) => p.day_of_coordination_mode).length /
            total) *
          100,
      };

      return analytics;
    } catch (error) {
      console.error('Error getting preferences analytics:', error);
      throw error;
    }
  }

  /**
   * Log consent change for compliance
   */
  private async logConsentChange(
    userId: string,
    consentUpdates: Record<string, boolean>,
    optInMethod: string,
  ): Promise<void> {
    try {
      await this.supabase.from('consent_audit_log').insert({
        user_id: userId,
        consent_changes: consentUpdates,
        opt_in_method: optInMethod,
        timestamp: new Date().toISOString(),
        ip_address: 'system', // Would be captured from request in real implementation
        user_agent: 'system',
      });
    } catch (error) {
      console.error('Failed to log consent change:', error);
    }
  }
}

// Export singleton instance
export const notificationPreferencesManager =
  NotificationPreferencesManager.getInstance();
