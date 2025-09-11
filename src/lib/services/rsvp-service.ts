import { createClient } from '@/lib/supabase/server';
import { sendEmail } from './email-connector';
import { sendSMS } from './sms-service';

export interface RSVPReminder {
  id: string;
  event_id: string;
  invitation_id: string;
  reminder_type: 'initial' | 'followup' | 'final' | 'custom';
  scheduled_for: string;
  delivery_method: 'email' | 'sms' | 'both';
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
}

export interface RSVPEvent {
  id: string;
  event_name: string;
  event_date: string;
  event_time?: string;
  venue_name?: string;
  venue_address?: string;
  rsvp_deadline?: string;
  custom_message?: string;
  thank_you_message?: string;
}

export interface RSVPInvitation {
  id: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  invitation_code: string;
  max_party_size: number;
  is_vip: boolean;
}

export class RSVPService {
  /**
   * Process and send all pending reminders
   */
  static async processPendingReminders(): Promise<{
    sent: number;
    failed: number;
    errors: string[];
  }> {
    const supabase = await createClient();
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      // Get all pending reminders that should be sent now
      const now = new Date().toISOString();
      const { data: reminders, error } = await supabase
        .from('rsvp_reminders')
        .select(
          `
          *,
          rsvp_invitations (
            id,
            guest_name,
            guest_email,
            guest_phone,
            invitation_code
          ),
          rsvp_events (
            id,
            event_name,
            event_date,
            event_time,
            venue_name,
            venue_address,
            custom_message,
            rsvp_deadline
          )
        `,
        )
        .eq('status', 'pending')
        .lte('scheduled_for', now)
        .limit(50); // Process in batches

      if (error) {
        console.error('Error fetching pending reminders:', error);
        results.errors.push(`Failed to fetch reminders: ${error.message}`);
        return results;
      }

      // Process each reminder
      for (const reminder of reminders || []) {
        try {
          await this.sendReminder(reminder);

          // Mark as sent
          await supabase
            .from('rsvp_reminders')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', reminder.id);

          results.sent++;
        } catch (sendError) {
          console.error(`Failed to send reminder ${reminder.id}:`, sendError);

          // Mark as failed
          await supabase
            .from('rsvp_reminders')
            .update({
              status: 'failed',
              error_message:
                sendError instanceof Error
                  ? sendError.message
                  : 'Unknown error',
            })
            .eq('id', reminder.id);

          results.failed++;
          results.errors.push(`Reminder ${reminder.id}: ${sendError}`);
        }
      }

      return results;
    } catch (error) {
      console.error('Error processing reminders:', error);
      results.errors.push(`General error: ${error}`);
      return results;
    }
  }

  /**
   * Send a single reminder
   */
  private static async sendReminder(reminder: any): Promise<void> {
    const { guest_name, guest_email, guest_phone, invitation_code } =
      reminder.rsvp_invitations;
    const {
      event_name,
      event_date,
      venue_name,
      venue_address,
      custom_message,
      rsvp_deadline,
    } = reminder.rsvp_events;

    const rsvpUrl = `${process.env.NEXT_PUBLIC_APP_URL}/rsvp/${invitation_code}`;

    // Build message based on reminder type
    let subject = '';
    let message = '';

    switch (reminder.reminder_type) {
      case 'initial':
        subject = `You're Invited: ${event_name}`;
        message = this.buildInitialReminderMessage(
          guest_name,
          event_name,
          event_date,
          venue_name,
          venue_address,
          rsvp_deadline,
          rsvpUrl,
          custom_message,
        );
        break;

      case 'followup':
        subject = `Reminder: RSVP for ${event_name}`;
        message = this.buildFollowupReminderMessage(
          guest_name,
          event_name,
          event_date,
          rsvp_deadline,
          rsvpUrl,
        );
        break;

      case 'final':
        subject = `Final Reminder: RSVP for ${event_name}`;
        message = this.buildFinalReminderMessage(
          guest_name,
          event_name,
          event_date,
          rsvp_deadline,
          rsvpUrl,
        );
        break;

      case 'custom':
        subject = `Update: ${event_name}`;
        message =
          custom_message ||
          this.buildCustomReminderMessage(
            guest_name,
            event_name,
            event_date,
            rsvpUrl,
          );
        break;
    }

    // Send based on delivery method
    if (
      reminder.delivery_method === 'email' ||
      reminder.delivery_method === 'both'
    ) {
      if (guest_email) {
        await sendEmail({
          to: guest_email,
          subject,
          html: this.formatEmailHTML(message, rsvpUrl),
          text: message,
        });
      }
    }

    if (
      reminder.delivery_method === 'sms' ||
      reminder.delivery_method === 'both'
    ) {
      if (guest_phone) {
        const smsMessage = this.formatSMSMessage(message, rsvpUrl);
        await sendSMS({
          to: guest_phone,
          message: smsMessage,
        });
      }
    }
  }

  /**
   * Send thank you message after RSVP
   */
  static async sendThankYouMessage(
    invitation: RSVPInvitation,
    responseStatus: 'attending' | 'not_attending' | 'maybe',
    thankYouMessage?: string,
  ): Promise<void> {
    try {
      const { guest_name, guest_email, guest_phone } = invitation;

      let message = '';
      let subject = '';

      if (responseStatus === 'attending') {
        subject = 'Thank You for Your RSVP!';
        message =
          thankYouMessage ||
          `Dear ${guest_name},\n\nThank you for confirming your attendance! We're looking forward to celebrating with you.\n\nBest regards`;
      } else if (responseStatus === 'not_attending') {
        subject = 'Thank You for Letting Us Know';
        message = `Dear ${guest_name},\n\nThank you for letting us know. We'll miss having you there, but we appreciate your response.\n\nBest regards`;
      } else {
        subject = 'RSVP Received';
        message = `Dear ${guest_name},\n\nWe've received your response. Please let us know if your plans change.\n\nBest regards`;
      }

      // Send email if available
      if (guest_email) {
        await sendEmail({
          to: guest_email,
          subject,
          html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
          text: message,
        });
      }

      // Send SMS if available and attending
      if (guest_phone && responseStatus === 'attending') {
        await sendSMS({
          to: guest_phone,
          message: `Thank you for your RSVP, ${guest_name}! We look forward to seeing you.`,
        });
      }
    } catch (error) {
      console.error('Error sending thank you message:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Send change notification
   */
  static async sendChangeNotification(
    invitationId: string,
    changeType: string,
    changeDetails: string,
  ): Promise<void> {
    const supabase = await createClient();

    try {
      // Get invitation and event details
      const { data: invitation, error } = await supabase
        .from('rsvp_invitations')
        .select(
          `
          *,
          rsvp_events (
            event_name,
            event_date
          )
        `,
        )
        .eq('id', invitationId)
        .single();

      if (error || !invitation) {
        console.error('Failed to get invitation for change notification');
        return;
      }

      const { guest_name, guest_email, guest_phone } = invitation;
      const { event_name } = invitation.rsvp_events;

      const subject = `Important Update: ${event_name}`;
      const message = `Dear ${guest_name},\n\nThere has been an update regarding ${event_name}:\n\n${changeDetails}\n\nPlease check your RSVP for any necessary updates.\n\nBest regards`;

      // Send notifications
      if (guest_email) {
        await sendEmail({
          to: guest_email,
          subject,
          html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
          text: message,
        });
      }

      if (guest_phone) {
        await sendSMS({
          to: guest_phone,
          message: `Update for ${event_name}: ${changeDetails}`,
        });
      }
    } catch (error) {
      console.error('Error sending change notification:', error);
    }
  }

  // Message builders
  private static buildInitialReminderMessage(
    guestName: string,
    eventName: string,
    eventDate: string,
    venueName?: string,
    venueAddress?: string,
    rsvpDeadline?: string,
    rsvpUrl?: string,
    customMessage?: string,
  ): string {
    const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let message = `Dear ${guestName},\n\n`;
    message += `You're invited to ${eventName} on ${formattedDate}.\n\n`;

    if (venueName) {
      message += `Location: ${venueName}\n`;
    }
    if (venueAddress) {
      message += `Address: ${venueAddress}\n`;
    }

    message += '\n';

    if (customMessage) {
      message += `${customMessage}\n\n`;
    }

    if (rsvpDeadline) {
      const deadlineDate = new Date(rsvpDeadline).toLocaleDateString();
      message += `Please RSVP by ${deadlineDate}.\n`;
    }

    if (rsvpUrl) {
      message += `\nRSVP here: ${rsvpUrl}\n`;
    }

    message += '\nWe hope you can join us!';

    return message;
  }

  private static buildFollowupReminderMessage(
    guestName: string,
    eventName: string,
    eventDate: string,
    rsvpDeadline?: string,
    rsvpUrl?: string,
  ): string {
    const formattedDate = new Date(eventDate).toLocaleDateString();

    let message = `Hi ${guestName},\n\n`;
    message += `Just a friendly reminder to RSVP for ${eventName} on ${formattedDate}.\n\n`;

    if (rsvpDeadline) {
      const deadlineDate = new Date(rsvpDeadline).toLocaleDateString();
      const daysUntilDeadline = Math.ceil(
        (new Date(rsvpDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );

      if (daysUntilDeadline > 0) {
        message += `The RSVP deadline is ${deadlineDate} (${daysUntilDeadline} days away).\n`;
      } else {
        message += `The RSVP deadline is today!\n`;
      }
    }

    if (rsvpUrl) {
      message += `\nPlease respond here: ${rsvpUrl}\n`;
    }

    message += '\nLooking forward to hearing from you!';

    return message;
  }

  private static buildFinalReminderMessage(
    guestName: string,
    eventName: string,
    eventDate: string,
    rsvpDeadline?: string,
    rsvpUrl?: string,
  ): string {
    let message = `Hi ${guestName},\n\n`;
    message += `This is a final reminder to RSVP for ${eventName}.\n\n`;

    if (rsvpDeadline) {
      const deadlineDate = new Date(rsvpDeadline);
      const now = new Date();

      if (deadlineDate > now) {
        message += `The deadline is ${deadlineDate.toLocaleDateString()} - please respond soon!\n`;
      } else {
        message += `The RSVP deadline has passed, but we'd still love to know if you can make it.\n`;
      }
    }

    if (rsvpUrl) {
      message += `\nRSVP now: ${rsvpUrl}\n`;
    }

    message += '\nThank you!';

    return message;
  }

  private static buildCustomReminderMessage(
    guestName: string,
    eventName: string,
    eventDate: string,
    rsvpUrl?: string,
  ): string {
    const formattedDate = new Date(eventDate).toLocaleDateString();

    let message = `Hi ${guestName},\n\n`;
    message += `We have an update regarding ${eventName} on ${formattedDate}.\n\n`;

    if (rsvpUrl) {
      message += `Please check your RSVP: ${rsvpUrl}\n`;
    }

    return message;
  }

  private static formatEmailHTML(message: string, rsvpUrl?: string): string {
    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 20px;">
          ${message
            .split('\n')
            .map((line) => `<p>${line}</p>`)
            .join('')}
        </div>
    `;

    if (rsvpUrl) {
      html += `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${rsvpUrl}" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            RSVP Now
          </a>
        </div>
      `;
    }

    html += '</div>';
    return html;
  }

  private static formatSMSMessage(message: string, rsvpUrl?: string): string {
    // Shorten message for SMS
    const lines = message.split('\n').filter((line) => line.trim());
    let smsMessage = lines.slice(0, 3).join(' ');

    if (rsvpUrl) {
      smsMessage += ` RSVP: ${rsvpUrl}`;
    }

    // Ensure it fits in SMS limits (160 characters)
    if (smsMessage.length > 160) {
      smsMessage = smsMessage.substring(0, 157) + '...';
    }

    return smsMessage;
  }
}
