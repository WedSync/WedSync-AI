import { createClient } from '@/lib/supabase/server';
import { sendEmail } from './email-connector';
import { sendSMS } from './sms-service';

export interface RSVPReminderEscalation {
  id: string;
  event_id: string;
  invitation_id: string;
  escalation_level: number;
  last_escalation_at?: string;
  total_reminders_sent: number;
  response_deadline?: string;
  is_escalation_active: boolean;
  escalation_settings: {
    max_escalations: number;
    escalation_delay_hours: number;
  };
}

export interface RSVPAnalyticsPrediction {
  event_id: string;
  predicted_final_attendance: number;
  prediction_confidence: number;
  factors_json: {
    total_invited: number;
    total_responded: number;
    total_attending: number;
    response_rate: number;
    days_to_event: number;
    response_velocity: number;
    prediction_method: string;
  };
}

export class RSVPReminderService {
  /**
   * Process escalated reminders with intelligent timing
   */
  static async processEscalatedReminders(): Promise<{
    escalated: number;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    const supabase = await createClient();
    const results = {
      escalated: 0,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      // Get events that need escalation processing
      const { data: events, error: eventsError } = await supabase
        .from('rsvp_events')
        .select('id, event_name, event_date')
        .gte('event_date', new Date().toISOString().split('T')[0]) // Future events only
        .order('event_date');

      if (eventsError) {
        results.errors.push(`Failed to fetch events: ${eventsError.message}`);
        return results;
      }

      // Process each event for escalation
      for (const event of events || []) {
        try {
          // Call the database function to process escalation
          const { data: escalationResult, error: escalationError } =
            await supabase.rpc('process_reminder_escalation', {
              p_event_id: event.id,
            });

          if (escalationError) {
            results.errors.push(
              `Event ${event.event_name}: ${escalationError.message}`,
            );
            continue;
          }

          if (escalationResult && escalationResult.length > 0) {
            const { escalated_count, notifications_sent } = escalationResult[0];
            results.escalated += escalated_count || 0;
            results.sent += notifications_sent || 0;
          }
        } catch (eventError) {
          results.errors.push(`Event ${event.event_name}: ${eventError}`);
        }
      }

      return results;
    } catch (error) {
      console.error('Error processing escalated reminders:', error);
      results.errors.push(`General error: ${error}`);
      return results;
    }
  }

  /**
   * Initialize escalation tracking for new invitations
   */
  static async initializeEscalationTracking(
    eventId: string,
    invitationId: string,
    responseDeadline?: string,
  ): Promise<void> {
    const supabase = await createClient();

    try {
      const { error } = await supabase.from('rsvp_reminder_escalation').insert({
        event_id: eventId,
        invitation_id: invitationId,
        response_deadline: responseDeadline,
        escalation_level: 1,
        total_reminders_sent: 0,
        is_escalation_active: true,
        escalation_settings: {
          max_escalations: 4,
          escalation_delay_hours: 48,
        },
      });

      if (error) {
        console.error('Error initializing escalation tracking:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to initialize escalation tracking:', error);
      throw error;
    }
  }

  /**
   * Stop escalation for responded invitations
   */
  static async stopEscalation(invitationId: string): Promise<void> {
    const supabase = await createClient();

    try {
      const { error } = await supabase
        .from('rsvp_reminder_escalation')
        .update({
          is_escalation_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('invitation_id', invitationId);

      if (error) {
        console.error('Error stopping escalation:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to stop escalation:', error);
    }
  }

  /**
   * Send personalized reminder based on escalation level
   */
  static async sendEscalatedReminder(
    reminderData: any,
    escalationLevel: number,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { guest_name, guest_email, guest_phone, invitation_code } =
        reminderData.rsvp_invitations;
      const {
        event_name,
        event_date,
        venue_name,
        venue_address,
        rsvp_deadline,
      } = reminderData.rsvp_events;

      const rsvpUrl = `${process.env.NEXT_PUBLIC_APP_URL}/rsvp/${invitation_code}`;

      let subject = '';
      let message = '';
      let urgencyLevel = '';

      // Customize message based on escalation level
      switch (escalationLevel) {
        case 1:
          urgencyLevel = 'Friendly Reminder';
          subject = `${urgencyLevel}: RSVP for ${event_name}`;
          message = this.buildEscalationMessage(
            guest_name,
            event_name,
            event_date,
            rsvpUrl,
            'friendly',
            rsvp_deadline,
          );
          break;

        case 2:
          urgencyLevel = 'Important Reminder';
          subject = `${urgencyLevel}: Please RSVP for ${event_name}`;
          message = this.buildEscalationMessage(
            guest_name,
            event_name,
            event_date,
            rsvpUrl,
            'important',
            rsvp_deadline,
          );
          break;

        case 3:
          urgencyLevel = 'Final Notice';
          subject = `${urgencyLevel}: RSVP Required for ${event_name}`;
          message = this.buildEscalationMessage(
            guest_name,
            event_name,
            event_date,
            rsvpUrl,
            'urgent',
            rsvp_deadline,
          );
          break;

        case 4:
          urgencyLevel = 'Personal Follow-up';
          subject = `${urgencyLevel}: We Need Your Response for ${event_name}`;
          message = this.buildEscalationMessage(
            guest_name,
            event_name,
            event_date,
            rsvpUrl,
            'personal',
            rsvp_deadline,
          );
          break;
      }

      // Send based on escalation level preference
      if (escalationLevel <= 2 && guest_email) {
        // Email first for levels 1-2
        await sendEmail({
          to: guest_email,
          subject,
          html: this.formatEscalationEmailHTML(message, rsvpUrl, urgencyLevel),
          text: message,
        });
      }

      if (escalationLevel >= 2 && guest_phone) {
        // SMS for levels 2+
        const smsMessage = this.formatEscalationSMS(
          guest_name,
          event_name,
          event_date,
          rsvpUrl,
          escalationLevel,
        );
        await sendSMS({
          to: guest_phone,
          message: smsMessage,
        });
      }

      if (escalationLevel >= 3 && guest_email) {
        // Both email and escalated email for levels 3+
        await sendEmail({
          to: guest_email,
          subject,
          html: this.formatEscalationEmailHTML(message, rsvpUrl, urgencyLevel),
          text: message,
          priority: 'high',
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending escalated reminder:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get escalation status for an event
   */
  static async getEscalationStatus(eventId: string): Promise<{
    total_active_escalations: number;
    by_level: Record<number, number>;
    total_reminders_sent: number;
  }> {
    const supabase = await createClient();

    try {
      const { data: escalations, error } = await supabase
        .from('rsvp_reminder_escalation')
        .select('escalation_level, total_reminders_sent')
        .eq('event_id', eventId)
        .eq('is_escalation_active', true);

      if (error) {
        throw error;
      }

      const status = {
        total_active_escalations: escalations?.length || 0,
        by_level: { 1: 0, 2: 0, 3: 0, 4: 0 },
        total_reminders_sent: 0,
      };

      escalations?.forEach((escalation) => {
        status.by_level[escalation.escalation_level] =
          (status.by_level[escalation.escalation_level] || 0) + 1;
        status.total_reminders_sent += escalation.total_reminders_sent || 0;
      });

      return status;
    } catch (error) {
      console.error('Error getting escalation status:', error);
      return {
        total_active_escalations: 0,
        by_level: { 1: 0, 2: 0, 3: 0, 4: 0 },
        total_reminders_sent: 0,
      };
    }
  }

  // Message builders for escalation
  private static buildEscalationMessage(
    guestName: string,
    eventName: string,
    eventDate: string,
    rsvpUrl: string,
    tone: 'friendly' | 'important' | 'urgent' | 'personal',
    rsvpDeadline?: string,
  ): string {
    const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let message = '';

    switch (tone) {
      case 'friendly':
        message = `Hi ${guestName},\n\nWe hope this message finds you well! We wanted to send a friendly reminder about your invitation to ${eventName} on ${formattedDate}.\n\nWe're excited to celebrate and would love to know if you'll be joining us.`;
        break;

      case 'important':
        message = `Dear ${guestName},\n\nWe haven't heard back from you yet regarding ${eventName} on ${formattedDate}.\n\nTo help us with planning and catering, we really need your response.`;
        break;

      case 'urgent':
        message = `${guestName},\n\nThis is our final reminder about ${eventName} on ${formattedDate}.\n\nWe need your response urgently to finalize our arrangements. Please let us know as soon as possible whether you can attend.`;
        break;

      case 'personal':
        message = `Dear ${guestName},\n\nWe've tried reaching you several times about ${eventName} on ${formattedDate}.\n\nYour presence would mean so much to us, but we understand if you can't make it. Please just let us know either way so we can finalize our plans.`;
        break;
    }

    if (rsvpDeadline) {
      const deadlineDate = new Date(rsvpDeadline);
      const daysLeft = Math.ceil(
        (deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );

      if (daysLeft > 0) {
        message += `\n\nPlease respond by ${deadlineDate.toLocaleDateString()} (${daysLeft} days remaining).`;
      } else {
        message += `\n\nThe RSVP deadline has passed, but we'd still appreciate your response.`;
      }
    }

    message += `\n\nRSVP here: ${rsvpUrl}\n\nThank you for your time!`;

    return message;
  }

  private static formatEscalationEmailHTML(
    message: string,
    rsvpUrl: string,
    urgencyLevel: string,
  ): string {
    const urgencyColor =
      urgencyLevel.includes('Final') || urgencyLevel.includes('Personal')
        ? '#F04438'
        : urgencyLevel.includes('Important')
          ? '#F79009'
          : '#7F56D9';

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FFFFFF;">
        <div style="background: linear-gradient(135deg, #7F56D9, #6941C6); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">${urgencyLevel}</h1>
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
              background-color: ${urgencyColor}; 
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
              RSVP Now
            </a>
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

  private static formatEscalationSMS(
    guestName: string,
    eventName: string,
    eventDate: string,
    rsvpUrl: string,
    escalationLevel: number,
  ): string {
    const formattedDate = new Date(eventDate).toLocaleDateString();

    let smsMessage = '';

    switch (escalationLevel) {
      case 2:
        smsMessage = `Hi ${guestName}! Please RSVP for ${eventName} on ${formattedDate}. We need your response for planning. ${rsvpUrl}`;
        break;
      case 3:
        smsMessage = `URGENT: ${guestName}, we need your RSVP for ${eventName} (${formattedDate}) ASAP for final arrangements. ${rsvpUrl}`;
        break;
      case 4:
        smsMessage = `${guestName}, final attempt - please respond about ${eventName} (${formattedDate}). We really need to hear from you. ${rsvpUrl}`;
        break;
      default:
        smsMessage = `${guestName}, please RSVP for ${eventName} on ${formattedDate}. ${rsvpUrl}`;
    }

    // Ensure SMS length compliance
    if (smsMessage.length > 160) {
      const maxContentLength = 160 - rsvpUrl.length - 3; // 3 for " - "
      smsMessage = smsMessage.substring(0, maxContentLength) + '... ' + rsvpUrl;
    }

    return smsMessage;
  }
}

// Export the enhanced reminder processor for cron jobs
export async function processAllReminderTypes(): Promise<{
  regular_sent: number;
  escalated_sent: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    regular_sent: 0,
    escalated_sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // Process regular reminders (from Round 1)
    const { RSVPService } = await import('./rsvp-service');
    const regularResults = await RSVPService.processPendingReminders();
    results.regular_sent = regularResults.sent;
    results.failed += regularResults.failed;
    results.errors.push(...regularResults.errors);

    // Process escalated reminders (Round 2)
    const escalatedResults =
      await RSVPReminderService.processEscalatedReminders();
    results.escalated_sent = escalatedResults.sent;
    results.failed += escalatedResults.failed;
    results.errors.push(...escalatedResults.errors);

    return results;
  } catch (error) {
    console.error('Error processing all reminder types:', error);
    results.errors.push(`General processing error: ${error}`);
    return results;
  }
}
