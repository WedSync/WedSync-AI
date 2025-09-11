import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { createHash, randomBytes } from 'crypto';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * WS-155: Unsubscribe Management Service
 * Handle guest communication preferences and unsubscribe management
 */

export interface GuestCommunicationPreferences {
  id: string;
  guest_id: string;
  couple_id: string;
  email_subscribed: boolean;
  sms_subscribed: boolean;
  email_unsubscribed_at?: Date;
  sms_unsubscribed_at?: Date;
  email_resubscribed_at?: Date;
  sms_resubscribed_at?: Date;
  preferred_method?: 'email' | 'sms' | 'both' | 'none';
  unsubscribe_reason?: string;
  unsubscribe_feedback?: string;
  frequency_preference?: 'all' | 'important_only' | 'weekly' | 'minimal';
  categories_subscribed?: string[]; // e.g., ['updates', 'reminders', 'marketing']
  created_at: Date;
  updated_at: Date;
  unsubscribe_token?: string;
  do_not_contact: boolean; // Master unsubscribe flag
}

export interface UnsubscribeLink {
  token: string;
  guest_id: string;
  communication_type: 'email' | 'sms' | 'both';
  expires_at: Date;
  one_time_use: boolean;
  used_at?: Date;
}

export interface UnsubscribeStats {
  total_guests: number;
  email_subscribed: number;
  sms_subscribed: number;
  email_unsubscribed: number;
  sms_unsubscribed: number;
  do_not_contact: number;
  unsubscribe_rate: {
    email: number;
    sms: number;
    overall: number;
  };
  recent_unsubscribes: Array<{
    guest_name: string;
    communication_type: string;
    unsubscribed_at: Date;
    reason?: string;
  }>;
  unsubscribe_reasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
}

export class UnsubscribeManagementService {
  private static instance: UnsubscribeManagementService;

  static getInstance(): UnsubscribeManagementService {
    if (!UnsubscribeManagementService.instance) {
      UnsubscribeManagementService.instance =
        new UnsubscribeManagementService();
    }
    return UnsubscribeManagementService.instance;
  }

  /**
   * Create or update guest communication preferences
   */
  async setGuestPreferences(
    guestId: string,
    coupleId: string,
    preferences: Partial<
      Omit<
        GuestCommunicationPreferences,
        'id' | 'guest_id' | 'couple_id' | 'created_at' | 'updated_at'
      >
    >,
  ): Promise<GuestCommunicationPreferences> {
    try {
      const { data, error } = await supabase
        .from('guest_communication_preferences')
        .upsert(
          {
            guest_id: guestId,
            couple_id: coupleId,
            email_subscribed: preferences.email_subscribed ?? true,
            sms_subscribed: preferences.sms_subscribed ?? true,
            email_unsubscribed_at:
              preferences.email_unsubscribed_at?.toISOString(),
            sms_unsubscribed_at: preferences.sms_unsubscribed_at?.toISOString(),
            email_resubscribed_at:
              preferences.email_resubscribed_at?.toISOString(),
            sms_resubscribed_at: preferences.sms_resubscribed_at?.toISOString(),
            preferred_method: preferences.preferred_method,
            unsubscribe_reason: preferences.unsubscribe_reason,
            unsubscribe_feedback: preferences.unsubscribe_feedback,
            frequency_preference: preferences.frequency_preference || 'all',
            categories_subscribed: preferences.categories_subscribed || [
              'updates',
              'reminders',
            ],
            do_not_contact: preferences.do_not_contact || false,
            unsubscribe_token:
              preferences.unsubscribe_token ||
              this.generateUnsubscribeToken(guestId),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'guest_id',
          },
        )
        .select()
        .single();

      if (error) throw error;

      return this.convertToPreferences(data);
    } catch (error) {
      console.error('Error setting guest preferences:', error);
      throw error;
    }
  }

  /**
   * Get guest communication preferences
   */
  async getGuestPreferences(
    guestId: string,
  ): Promise<GuestCommunicationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('guest_communication_preferences')
        .select('*')
        .eq('guest_id', guestId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      return this.convertToPreferences(data);
    } catch (error) {
      console.error('Error getting guest preferences:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe guest from email communications
   */
  async unsubscribeEmail(
    guestId: string,
    reason?: string,
    feedback?: string,
  ): Promise<void> {
    try {
      const existingPrefs = await this.getGuestPreferences(guestId);

      // Get couple_id if not in existing preferences
      let coupleId = existingPrefs?.couple_id;
      if (!coupleId) {
        const { data: guest } = await supabase
          .from('guests')
          .select('couple_id')
          .eq('id', guestId)
          .single();
        coupleId = guest?.couple_id;
      }

      if (!coupleId) {
        throw new Error('Could not find couple for guest');
      }

      await this.setGuestPreferences(guestId, coupleId, {
        ...existingPrefs,
        email_subscribed: false,
        email_unsubscribed_at: new Date(),
        unsubscribe_reason: reason,
        unsubscribe_feedback: feedback,
      });

      // Log unsubscribe event
      await this.logUnsubscribeEvent(guestId, 'email', reason, feedback);
    } catch (error) {
      console.error('Error unsubscribing from email:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe guest from SMS communications
   */
  async unsubscribeSMS(
    guestId: string,
    reason?: string,
    feedback?: string,
  ): Promise<void> {
    try {
      const existingPrefs = await this.getGuestPreferences(guestId);

      // Get couple_id if not in existing preferences
      let coupleId = existingPrefs?.couple_id;
      if (!coupleId) {
        const { data: guest } = await supabase
          .from('guests')
          .select('couple_id')
          .eq('id', guestId)
          .single();
        coupleId = guest?.couple_id;
      }

      if (!coupleId) {
        throw new Error('Could not find couple for guest');
      }

      await this.setGuestPreferences(guestId, coupleId, {
        ...existingPrefs,
        sms_subscribed: false,
        sms_unsubscribed_at: new Date(),
        unsubscribe_reason: reason,
        unsubscribe_feedback: feedback,
      });

      // Log unsubscribe event
      await this.logUnsubscribeEvent(guestId, 'sms', reason, feedback);
    } catch (error) {
      console.error('Error unsubscribing from SMS:', error);
      throw error;
    }
  }

  /**
   * Set do not contact flag (master unsubscribe)
   */
  async setDoNotContact(
    guestId: string,
    reason?: string,
    feedback?: string,
  ): Promise<void> {
    try {
      const existingPrefs = await this.getGuestPreferences(guestId);

      // Get couple_id if not in existing preferences
      let coupleId = existingPrefs?.couple_id;
      if (!coupleId) {
        const { data: guest } = await supabase
          .from('guests')
          .select('couple_id')
          .eq('id', guestId)
          .single();
        coupleId = guest?.couple_id;
      }

      if (!coupleId) {
        throw new Error('Could not find couple for guest');
      }

      await this.setGuestPreferences(guestId, coupleId, {
        ...existingPrefs,
        do_not_contact: true,
        email_subscribed: false,
        sms_subscribed: false,
        email_unsubscribed_at: new Date(),
        sms_unsubscribed_at: new Date(),
        unsubscribe_reason: reason,
        unsubscribe_feedback: feedback,
      });

      // Log unsubscribe event
      await this.logUnsubscribeEvent(guestId, 'all', reason, feedback);
    } catch (error) {
      console.error('Error setting do not contact:', error);
      throw error;
    }
  }

  /**
   * Resubscribe guest to email communications
   */
  async resubscribeEmail(guestId: string): Promise<void> {
    try {
      const existingPrefs = await this.getGuestPreferences(guestId);
      if (!existingPrefs) {
        throw new Error('Guest preferences not found');
      }

      await this.setGuestPreferences(guestId, existingPrefs.couple_id, {
        ...existingPrefs,
        email_subscribed: true,
        email_resubscribed_at: new Date(),
        do_not_contact: false,
      });

      // Log resubscribe event
      await this.logResubscribeEvent(guestId, 'email');
    } catch (error) {
      console.error('Error resubscribing to email:', error);
      throw error;
    }
  }

  /**
   * Resubscribe guest to SMS communications
   */
  async resubscribeSMS(guestId: string): Promise<void> {
    try {
      const existingPrefs = await this.getGuestPreferences(guestId);
      if (!existingPrefs) {
        throw new Error('Guest preferences not found');
      }

      await this.setGuestPreferences(guestId, existingPrefs.couple_id, {
        ...existingPrefs,
        sms_subscribed: true,
        sms_resubscribed_at: new Date(),
        do_not_contact: false,
      });

      // Log resubscribe event
      await this.logResubscribeEvent(guestId, 'sms');
    } catch (error) {
      console.error('Error resubscribing to SMS:', error);
      throw error;
    }
  }

  /**
   * Generate secure unsubscribe link
   */
  async generateUnsubscribeLink(
    guestId: string,
    communicationType: 'email' | 'sms' | 'both',
    options?: {
      expires_in_hours?: number;
      one_time_use?: boolean;
    },
  ): Promise<string> {
    try {
      const token = this.generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setHours(
        expiresAt.getHours() + (options?.expires_in_hours || 72),
      ); // 72 hours default

      // Store unsubscribe link
      const { error } = await supabase.from('unsubscribe_links').insert({
        token,
        guest_id: guestId,
        communication_type: communicationType,
        expires_at: expiresAt.toISOString(),
        one_time_use: options?.one_time_use ?? true,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Generate URL
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || 'https://app.wedsync.com';
      return `${baseUrl}/unsubscribe/${token}`;
    } catch (error) {
      console.error('Error generating unsubscribe link:', error);
      throw error;
    }
  }

  /**
   * Process unsubscribe via link
   */
  async processUnsubscribeLink(
    token: string,
    reason?: string,
    feedback?: string,
  ): Promise<{
    success: boolean;
    guest_name?: string;
    communication_type?: string;
    error?: string;
  }> {
    try {
      // Get unsubscribe link
      const { data: link, error: linkError } = await supabase
        .from('unsubscribe_links')
        .select('*')
        .eq('token', token)
        .single();

      if (linkError || !link) {
        return { success: false, error: 'Invalid unsubscribe link' };
      }

      // Check if expired
      if (new Date() > new Date(link.expires_at)) {
        return { success: false, error: 'Unsubscribe link has expired' };
      }

      // Check if already used (for one-time use links)
      if (link.one_time_use && link.used_at) {
        return {
          success: false,
          error: 'Unsubscribe link has already been used',
        };
      }

      // Get guest information
      const { data: guest, error: guestError } = await supabase
        .from('guests')
        .select('first_name, last_name')
        .eq('id', link.guest_id)
        .single();

      if (guestError || !guest) {
        return { success: false, error: 'Guest not found' };
      }

      // Process unsubscribe
      switch (link.communication_type) {
        case 'email':
          await this.unsubscribeEmail(link.guest_id, reason, feedback);
          break;
        case 'sms':
          await this.unsubscribeSMS(link.guest_id, reason, feedback);
          break;
        case 'both':
          await this.setDoNotContact(link.guest_id, reason, feedback);
          break;
      }

      // Mark link as used
      if (link.one_time_use) {
        await supabase
          .from('unsubscribe_links')
          .update({ used_at: new Date().toISOString() })
          .eq('token', token);
      }

      return {
        success: true,
        guest_name: `${guest.first_name} ${guest.last_name}`,
        communication_type: link.communication_type,
      };
    } catch (error) {
      console.error('Error processing unsubscribe link:', error);
      return { success: false, error: 'Failed to process unsubscribe request' };
    }
  }

  /**
   * Get unsubscribe statistics for a couple
   */
  async getUnsubscribeStats(coupleId: string): Promise<UnsubscribeStats> {
    try {
      // Get all guests for couple
      const { data: guests, error: guestsError } = await supabase
        .from('guests')
        .select('id, first_name, last_name')
        .eq('couple_id', coupleId);

      if (guestsError) throw guestsError;

      const totalGuests = guests?.length || 0;

      // Get preferences
      const { data: preferences, error: prefsError } = await supabase
        .from('guest_communication_preferences')
        .select('*')
        .eq('couple_id', coupleId);

      if (prefsError) throw prefsError;

      const emailSubscribed =
        preferences?.filter((p) => p.email_subscribed).length || totalGuests;
      const smsSubscribed =
        preferences?.filter((p) => p.sms_subscribed).length || totalGuests;
      const emailUnsubscribed =
        preferences?.filter((p) => !p.email_subscribed).length || 0;
      const smsUnsubscribed =
        preferences?.filter((p) => !p.sms_subscribed).length || 0;
      const doNotContact =
        preferences?.filter((p) => p.do_not_contact).length || 0;

      // Get recent unsubscribes (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentUnsubscribes =
        preferences
          ?.filter((p) => {
            const emailUnsubDate = p.email_unsubscribed_at
              ? new Date(p.email_unsubscribed_at)
              : null;
            const smsUnsubDate = p.sms_unsubscribed_at
              ? new Date(p.sms_unsubscribed_at)
              : null;
            return (
              (emailUnsubDate && emailUnsubDate > thirtyDaysAgo) ||
              (smsUnsubDate && smsUnsubDate > thirtyDaysAgo)
            );
          })
          .map((p) => {
            const guest = guests?.find((g) => g.id === p.guest_id);
            const emailUnsubDate = p.email_unsubscribed_at
              ? new Date(p.email_unsubscribed_at)
              : null;
            const smsUnsubDate = p.sms_unsubscribed_at
              ? new Date(p.sms_unsubscribed_at)
              : null;

            let unsubscribedAt = emailUnsubDate;
            let communicationType = 'email';

            if (
              smsUnsubDate &&
              (!emailUnsubDate || smsUnsubDate > emailUnsubDate)
            ) {
              unsubscribedAt = smsUnsubDate;
              communicationType = 'sms';
            }

            if (
              emailUnsubDate &&
              smsUnsubDate &&
              Math.abs(emailUnsubDate.getTime() - smsUnsubDate.getTime()) < 1000
            ) {
              communicationType = 'both';
            }

            return {
              guest_name: guest
                ? `${guest.first_name} ${guest.last_name}`
                : 'Unknown Guest',
              communication_type: communicationType,
              unsubscribed_at: unsubscribedAt!,
              reason: p.unsubscribe_reason,
            };
          })
          .filter(Boolean) || [];

      // Count unsubscribe reasons
      const reasonCounts = new Map<string, number>();
      preferences?.forEach((p) => {
        if (
          p.unsubscribe_reason &&
          (!p.email_subscribed || !p.sms_subscribed)
        ) {
          reasonCounts.set(
            p.unsubscribe_reason,
            (reasonCounts.get(p.unsubscribe_reason) || 0) + 1,
          );
        }
      });

      const totalUnsubscribes =
        emailUnsubscribed + smsUnsubscribed - doNotContact; // Avoid double counting
      const unsubscribeReasons = Array.from(reasonCounts.entries())
        .map(([reason, count]) => ({
          reason,
          count,
          percentage:
            totalUnsubscribes > 0 ? (count / totalUnsubscribes) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      return {
        total_guests: totalGuests,
        email_subscribed: emailSubscribed,
        sms_subscribed: smsSubscribed,
        email_unsubscribed: emailUnsubscribed,
        sms_unsubscribed: smsUnsubscribed,
        do_not_contact: doNotContact,
        unsubscribe_rate: {
          email: totalGuests > 0 ? (emailUnsubscribed / totalGuests) * 100 : 0,
          sms: totalGuests > 0 ? (smsUnsubscribed / totalGuests) * 100 : 0,
          overall: totalGuests > 0 ? (doNotContact / totalGuests) * 100 : 0,
        },
        recent_unsubscribes: recentUnsubscribes.sort(
          (a, b) => b.unsubscribed_at.getTime() - a.unsubscribed_at.getTime(),
        ),
        unsubscribe_reasons: unsubscribeReasons,
      };
    } catch (error) {
      console.error('Error getting unsubscribe stats:', error);
      throw error;
    }
  }

  /**
   * Check if guest can receive communication
   */
  async canReceiveCommunication(
    guestId: string,
    communicationType: 'email' | 'sms',
  ): Promise<{
    can_receive: boolean;
    reason?: string;
  }> {
    try {
      const preferences = await this.getGuestPreferences(guestId);

      if (!preferences) {
        // No preferences set - assume subscribed
        return { can_receive: true };
      }

      if (preferences.do_not_contact) {
        return {
          can_receive: false,
          reason: 'Guest has requested no contact',
        };
      }

      if (communicationType === 'email' && !preferences.email_subscribed) {
        return {
          can_receive: false,
          reason: 'Guest has unsubscribed from email communications',
        };
      }

      if (communicationType === 'sms' && !preferences.sms_subscribed) {
        return {
          can_receive: false,
          reason: 'Guest has unsubscribed from SMS communications',
        };
      }

      return { can_receive: true };
    } catch (error) {
      console.error('Error checking communication permissions:', error);
      return { can_receive: false, reason: 'Error checking preferences' };
    }
  }

  /**
   * Get subscribed guests for communication type
   */
  async getSubscribedGuests(
    coupleId: string,
    communicationType: 'email' | 'sms',
  ): Promise<string[]> {
    try {
      const { data: preferences, error } = await supabase
        .from('guest_communication_preferences')
        .select('guest_id')
        .eq('couple_id', coupleId)
        .eq('do_not_contact', false);

      if (error) throw error;

      if (communicationType === 'email') {
        return (
          preferences
            ?.filter((p) => p.email_subscribed !== false)
            .map((p) => p.guest_id) || []
        );
      } else {
        return (
          preferences
            ?.filter((p) => p.sms_subscribed !== false)
            .map((p) => p.guest_id) || []
        );
      }
    } catch (error) {
      console.error('Error getting subscribed guests:', error);
      throw error;
    }
  }

  /**
   * Log unsubscribe event
   */
  private async logUnsubscribeEvent(
    guestId: string,
    communicationType: string,
    reason?: string,
    feedback?: string,
  ): Promise<void> {
    try {
      const { error } = await supabase.from('unsubscribe_events').insert({
        guest_id: guestId,
        communication_type: communicationType,
        event_type: 'unsubscribe',
        reason,
        feedback,
        timestamp: new Date().toISOString(),
      });

      if (error) {
        console.error('Error logging unsubscribe event:', error);
      }
    } catch (error) {
      console.error('Error logging unsubscribe event:', error);
    }
  }

  /**
   * Log resubscribe event
   */
  private async logResubscribeEvent(
    guestId: string,
    communicationType: string,
  ): Promise<void> {
    try {
      const { error } = await supabase.from('unsubscribe_events').insert({
        guest_id: guestId,
        communication_type: communicationType,
        event_type: 'resubscribe',
        timestamp: new Date().toISOString(),
      });

      if (error) {
        console.error('Error logging resubscribe event:', error);
      }
    } catch (error) {
      console.error('Error logging resubscribe event:', error);
    }
  }

  /**
   * Generate unsubscribe token for guest
   */
  private generateUnsubscribeToken(guestId: string): string {
    const data = `${guestId}-${Date.now()}-${randomBytes(16).toString('hex')}`;
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate secure token for unsubscribe links
   */
  private generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Convert database record to preferences object
   */
  private convertToPreferences(record: any): GuestCommunicationPreferences {
    return {
      id: record.id,
      guest_id: record.guest_id,
      couple_id: record.couple_id,
      email_subscribed: record.email_subscribed ?? true,
      sms_subscribed: record.sms_subscribed ?? true,
      email_unsubscribed_at: record.email_unsubscribed_at
        ? new Date(record.email_unsubscribed_at)
        : undefined,
      sms_unsubscribed_at: record.sms_unsubscribed_at
        ? new Date(record.sms_unsubscribed_at)
        : undefined,
      email_resubscribed_at: record.email_resubscribed_at
        ? new Date(record.email_resubscribed_at)
        : undefined,
      sms_resubscribed_at: record.sms_resubscribed_at
        ? new Date(record.sms_resubscribed_at)
        : undefined,
      preferred_method: record.preferred_method,
      unsubscribe_reason: record.unsubscribe_reason,
      unsubscribe_feedback: record.unsubscribe_feedback,
      frequency_preference: record.frequency_preference || 'all',
      categories_subscribed: record.categories_subscribed || [
        'updates',
        'reminders',
      ],
      do_not_contact: record.do_not_contact || false,
      unsubscribe_token: record.unsubscribe_token,
      created_at: new Date(record.created_at),
      updated_at: new Date(record.updated_at),
    };
  }

  /**
   * Export unsubscribe data for compliance
   */
  async exportUnsubscribeData(coupleId: string): Promise<{
    preferences: GuestCommunicationPreferences[];
    events: Array<{
      guest_name: string;
      event_type: string;
      communication_type: string;
      timestamp: Date;
      reason?: string;
    }>;
  }> {
    try {
      // Get all preferences
      const { data: preferencesData, error: prefError } = await supabase
        .from('guest_communication_preferences')
        .select('*')
        .eq('couple_id', coupleId);

      if (prefError) throw prefError;

      const preferences =
        preferencesData?.map((p) => this.convertToPreferences(p)) || [];

      // Get unsubscribe events
      const guestIds = preferences.map((p) => p.guest_id);

      const { data: events, error: eventsError } = await supabase
        .from('unsubscribe_events')
        .select('*')
        .in('guest_id', guestIds);

      if (eventsError) throw eventsError;

      // Get guest names
      const { data: guests, error: guestsError } = await supabase
        .from('guests')
        .select('id, first_name, last_name')
        .in('id', guestIds);

      if (guestsError) throw guestsError;

      const guestMap = new Map(
        guests?.map((g) => [g.id, `${g.first_name} ${g.last_name}`]) || [],
      );

      const eventsWithNames =
        events?.map((event) => ({
          guest_name: guestMap.get(event.guest_id) || 'Unknown Guest',
          event_type: event.event_type,
          communication_type: event.communication_type,
          timestamp: new Date(event.timestamp),
          reason: event.reason,
        })) || [];

      return {
        preferences,
        events: eventsWithNames,
      };
    } catch (error) {
      console.error('Error exporting unsubscribe data:', error);
      throw error;
    }
  }
}

export const unsubscribeManagementService =
  UnsubscribeManagementService.getInstance();
