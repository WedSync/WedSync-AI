import { createClient } from '@/lib/supabase/server';
import { sendEmail } from './email-connector';
import { sendSMS } from './sms-service';
import { RSVPReminderService } from './rsvpReminderService';

export interface WaitlistEntry {
  id: string;
  event_id: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  party_size: number;
  priority: number;
  added_at: string;
  invited_at?: string;
  status: 'waiting' | 'invited' | 'declined' | 'expired';
}

export interface WaitlistProcessingResult {
  processed_count: number;
  invited_count: number;
  available_space: number;
  waitlist_remaining: number;
  errors: string[];
}

export interface WaitlistAnalytics {
  total_waiting: number;
  total_invited: number;
  total_declined: number;
  total_expired: number;
  average_wait_time_days: number;
  invitation_acceptance_rate: number;
  priority_distribution: Record<number, number>;
  estimated_invite_date: string | null;
}

export class WaitlistService {
  /**
   * Enhanced waitlist processing with intelligent priority management
   */
  static async processWaitlistIntelligently(
    eventId: string,
  ): Promise<WaitlistProcessingResult> {
    const supabase = await createClient();
    const result: WaitlistProcessingResult = {
      processed_count: 0,
      invited_count: 0,
      available_space: 0,
      waitlist_remaining: 0,
      errors: [],
    };

    try {
      // Get event details with current capacity
      const { data: eventData, error: eventError } = await supabase
        .from('rsvp_events')
        .select(
          `
          id,
          event_name,
          event_date,
          max_guests,
          vendor_id
        `,
        )
        .eq('id', eventId)
        .single();

      if (eventError || !eventData) {
        result.errors.push('Event not found');
        return result;
      }

      // Calculate current confirmed guests
      const { data: confirmedGuests, error: guestsError } = await supabase
        .from('rsvp_responses')
        .select('party_size')
        .eq('event_id', eventId)
        .eq('response_status', 'attending');

      if (guestsError) {
        result.errors.push(`Error calculating guests: ${guestsError.message}`);
        return result;
      }

      const currentGuests =
        confirmedGuests?.reduce((sum, guest) => sum + guest.party_size, 0) || 0;
      const availableSpace = (eventData.max_guests || 0) - currentGuests;
      result.available_space = availableSpace;

      if (availableSpace <= 0) {
        result.errors.push('No available space for new invitations');
        return result;
      }

      // Get waitlist entries with priority scoring
      const waitlistEntries = await this.getPrioritizedWaitlist(
        eventId,
        availableSpace,
      );
      result.waitlist_remaining = waitlistEntries.length;

      // Process each suitable entry
      for (const entry of waitlistEntries) {
        try {
          if (entry.party_size <= availableSpace) {
            // Create invitation
            const invitation = await this.createInvitationFromWaitlist(entry);

            if (invitation) {
              // Update waitlist status
              await supabase
                .from('rsvp_waitlist')
                .update({
                  status: 'invited',
                  invited_at: new Date().toISOString(),
                })
                .eq('id', entry.id);

              // Send invitation notification
              await this.sendWaitlistInvitationNotification(
                entry,
                invitation,
                eventData,
              );

              // Initialize reminder escalation for new invitation
              await RSVPReminderService.initializeEscalationTracking(
                eventId,
                invitation.id,
                eventData.event_date,
              );

              result.invited_count++;
              result.processed_count++;

              // Update available space
              result.available_space -= entry.party_size;
            }
          }
        } catch (entryError) {
          result.errors.push(
            `Failed to process ${entry.guest_name}: ${entryError}`,
          );
        }
      }

      return result;
    } catch (error) {
      console.error('Error in intelligent waitlist processing:', error);
      result.errors.push(`General error: ${error}`);
      return result;
    }
  }

  /**
   * Get prioritized waitlist with intelligent scoring
   */
  static async getPrioritizedWaitlist(
    eventId: string,
    maxEntries?: number,
  ): Promise<WaitlistEntry[]> {
    const supabase = await createClient();

    try {
      let query = supabase
        .from('rsvp_waitlist')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'waiting');

      // Add intelligent sorting: priority first, then wait time, then party size
      query = query
        .order('priority', { ascending: true })
        .order('added_at', { ascending: true })
        .order('party_size', { ascending: true }); // Smaller parties get priority when space is limited

      if (maxEntries) {
        query = query.limit(maxEntries);
      }

      const { data: waitlist, error } = await query;

      if (error) {
        console.error('Error fetching prioritized waitlist:', error);
        return [];
      }

      return waitlist || [];
    } catch (error) {
      console.error('Error in getPrioritizedWaitlist:', error);
      return [];
    }
  }

  /**
   * Create invitation from waitlist entry
   */
  static async createInvitationFromWaitlist(
    waitlistEntry: WaitlistEntry,
  ): Promise<any | null> {
    const supabase = await createClient();

    try {
      const { data: invitation, error } = await supabase
        .from('rsvp_invitations')
        .insert({
          event_id: waitlistEntry.event_id,
          guest_name: waitlistEntry.guest_name,
          guest_email: waitlistEntry.guest_email,
          guest_phone: waitlistEntry.guest_phone,
          max_party_size: waitlistEntry.party_size,
          is_vip: waitlistEntry.priority <= 3, // High priority becomes VIP
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating invitation from waitlist:', error);
        return null;
      }

      return invitation;
    } catch (error) {
      console.error('Error in createInvitationFromWaitlist:', error);
      return null;
    }
  }

  /**
   * Send waitlist invitation notification with personalized messaging
   */
  static async sendWaitlistInvitationNotification(
    waitlistEntry: WaitlistEntry,
    invitation: any,
    eventData: any,
  ): Promise<void> {
    try {
      const rsvpUrl = `${process.env.NEXT_PUBLIC_APP_URL}/rsvp/${invitation.invitation_code}`;
      const eventDate = new Date(eventData.event_date).toLocaleDateString(
        'en-US',
        {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        },
      );

      const subject = `Great News! Space Available for ${eventData.event_name}`;

      const message = `Dear ${waitlistEntry.guest_name},

Wonderful news! A space has become available for ${eventData.event_name} on ${eventDate}.

You were on our waitlist and we're delighted to offer you this invitation. We know you've been waiting, and we appreciate your patience.

Please respond as soon as possible to secure your spot, as we may have others waiting if you're unable to attend.

Party size reserved: ${waitlistEntry.party_size} guest${waitlistEntry.party_size > 1 ? 's' : ''}

RSVP here: ${rsvpUrl}

We hope you can join us for this special celebration!

Best regards`;

      // Send email if available
      if (waitlistEntry.guest_email) {
        await sendEmail({
          to: waitlistEntry.guest_email,
          subject,
          html: this.formatWaitlistInvitationHTML(
            message,
            rsvpUrl,
            eventData.event_name,
          ),
          text: message,
          priority: 'high', // Waitlist invitations are time-sensitive
        });
      }

      // Send SMS if available
      if (waitlistEntry.guest_phone) {
        const smsMessage = `Great news ${waitlistEntry.guest_name}! Space available for ${eventData.event_name} on ${eventDate}. RSVP quickly: ${rsvpUrl}`;
        await sendSMS({
          to: waitlistEntry.guest_phone,
          message: smsMessage,
        });
      }
    } catch (error) {
      console.error('Error sending waitlist invitation notification:', error);
      // Don't throw - this is not critical to the core waitlist processing
    }
  }

  /**
   * Get waitlist analytics for event planning
   */
  static async getWaitlistAnalytics(
    eventId: string,
  ): Promise<WaitlistAnalytics> {
    const supabase = await createClient();

    try {
      // Get all waitlist entries
      const { data: waitlist, error } = await supabase
        .from('rsvp_waitlist')
        .select('*')
        .eq('event_id', eventId);

      if (error || !waitlist) {
        throw error;
      }

      // Calculate analytics
      const analytics: WaitlistAnalytics = {
        total_waiting: waitlist.filter((w) => w.status === 'waiting').length,
        total_invited: waitlist.filter((w) => w.status === 'invited').length,
        total_declined: waitlist.filter((w) => w.status === 'declined').length,
        total_expired: waitlist.filter((w) => w.status === 'expired').length,
        average_wait_time_days: 0,
        invitation_acceptance_rate: 0,
        priority_distribution: {},
        estimated_invite_date: null,
      };

      // Calculate average wait time for invited guests
      const invited = waitlist.filter(
        (w) => w.status === 'invited' && w.invited_at,
      );
      if (invited.length > 0) {
        const totalWaitDays = invited.reduce((sum, entry) => {
          const addedDate = new Date(entry.added_at);
          const invitedDate = new Date(entry.invited_at!);
          const waitDays = Math.ceil(
            (invitedDate.getTime() - addedDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );
          return sum + waitDays;
        }, 0);
        analytics.average_wait_time_days = Math.round(
          totalWaitDays / invited.length,
        );
      }

      // Calculate invitation acceptance rate
      if (analytics.total_invited > 0) {
        // Get responses from invited waitlist guests
        const { data: responses } = await supabase
          .from('rsvp_responses')
          .select('response_status')
          .eq('event_id', eventId)
          .in(
            'invitation_id',
            invited.map((i) => i.id),
          );

        const acceptedCount =
          responses?.filter((r) => r.response_status === 'attending').length ||
          0;
        analytics.invitation_acceptance_rate = Math.round(
          (acceptedCount / analytics.total_invited) * 100,
        );
      }

      // Calculate priority distribution
      waitlist.forEach((entry) => {
        analytics.priority_distribution[entry.priority] =
          (analytics.priority_distribution[entry.priority] || 0) + 1;
      });

      // Estimate next invite date based on historical patterns
      if (analytics.total_waiting > 0 && analytics.average_wait_time_days > 0) {
        const oldestWaiting = waitlist
          .filter((w) => w.status === 'waiting')
          .sort(
            (a, b) =>
              new Date(a.added_at).getTime() - new Date(b.added_at).getTime(),
          )[0];

        if (oldestWaiting) {
          const addedDate = new Date(oldestWaiting.added_at);
          const estimatedInviteDate = new Date(
            addedDate.getTime() +
              analytics.average_wait_time_days * 24 * 60 * 60 * 1000,
          );
          analytics.estimated_invite_date = estimatedInviteDate.toISOString();
        }
      }

      return analytics;
    } catch (error) {
      console.error('Error calculating waitlist analytics:', error);
      // Return empty analytics on error
      return {
        total_waiting: 0,
        total_invited: 0,
        total_declined: 0,
        total_expired: 0,
        average_wait_time_days: 0,
        invitation_acceptance_rate: 0,
        priority_distribution: {},
        estimated_invite_date: null,
      };
    }
  }

  /**
   * Update waitlist priorities intelligently
   */
  static async updateWaitlistPriorities(
    eventId: string,
    priorityUpdates: Array<{ id: string; priority: number }>,
  ): Promise<void> {
    const supabase = await createClient();

    try {
      // Update priorities in batch
      for (const update of priorityUpdates) {
        await supabase
          .from('rsvp_waitlist')
          .update({ priority: update.priority })
          .eq('id', update.id)
          .eq('event_id', eventId)
          .eq('status', 'waiting'); // Only update waiting entries
      }
    } catch (error) {
      console.error('Error updating waitlist priorities:', error);
      throw error;
    }
  }

  /**
   * Auto-expire old waitlist invitations
   */
  static async expireOldInvitations(daysOld: number = 7): Promise<number> {
    const supabase = await createClient();

    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() - daysOld);

      const { data: expiredEntries, error } = await supabase
        .from('rsvp_waitlist')
        .update({ status: 'expired' })
        .eq('status', 'invited')
        .lt('invited_at', expiryDate.toISOString())
        .select('id');

      if (error) {
        console.error('Error expiring old invitations:', error);
        return 0;
      }

      return expiredEntries?.length || 0;
    } catch (error) {
      console.error('Error in expireOldInvitations:', error);
      return 0;
    }
  }

  // Helper method to format HTML email
  private static formatWaitlistInvitationHTML(
    message: string,
    rsvpUrl: string,
    eventName: string,
  ): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FFFFFF;">
        <div style="background: linear-gradient(135deg, #12B76A, #039855); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">🎉 Space Available!</h1>
        </div>
        
        <div style="padding: 32px 24px; background-color: #FFFFFF; border: 1px solid #EAECF0; border-top: none;">
          ${message
            .split('\n')
            .map(
              (line) =>
                `<p style="margin: 16px 0; line-height: 1.6; color: #344054;">${line}</p>`,
            )
            .join('')}
          
          <div style="text-align: center; margin: 40px 0 24px;">
            <a href="${rsvpUrl}" style="
              background-color: #12B76A; 
              color: white; 
              padding: 16px 32px; 
              text-decoration: none; 
              border-radius: 8px; 
              display: inline-block;
              font-weight: 600;
              font-size: 16px;
              box-shadow: 0px 1px 2px rgba(16, 24, 40, 0.05);
              transition: all 200ms;
            ">
              RSVP Now - Don't Miss Out!
            </a>
          </div>
          
          <div style="background-color: #F9F5FF; border: 1px solid #E9D7FE; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0; color: #6941C6; font-size: 14px; font-weight: 500;">
              ⏰ Quick Response Needed: This invitation may be offered to others if not confirmed promptly.
            </p>
          </div>
          
          <div style="border-top: 1px solid #EAECF0; padding-top: 24px; text-align: center;">
            <p style="color: #667085; font-size: 14px; margin: 0;">
              Having trouble? Copy and paste this link: <br>
              <a href="${rsvpUrl}" style="color: #7F56D9; word-break: break-all;">${rsvpUrl}</a>
            </p>
          </div>
        </div>
      </div>
    `;
  }
}
