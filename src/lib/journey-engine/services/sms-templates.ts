import twilio from 'twilio';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

// Journey SMS Templates - Wedding Industry Specific
export const JOURNEY_SMS_TEMPLATES = {
  // Welcome & Onboarding
  welcome:
    "Hi {{client_first_name}}! Welcome to {{vendor_name}}. We're excited to work with you!",
  inquiry_received:
    "Hi {{client_first_name}}, we received your inquiry! We'll respond within {{response_time}}. - {{vendor_name}}",
  booking_confirmed:
    'Congrats {{client_first_name}}! Your booking with {{vendor_name}} is confirmed for {{event_date}}.',

  // Reminders
  form_reminder:
    'Hi {{client_first_name}}, friendly reminder to complete your form for {{vendor_name}}: {{form_url}}',
  appointment_reminder:
    'Hi {{client_first_name}}, reminder of your appointment with {{vendor_name}} tomorrow at {{appointment_time}}',
  payment_reminder:
    'Hi {{client_first_name}}, your payment of £{{amount}} is due for {{vendor_name}}. Pay here: {{payment_url}}',
  contract_reminder:
    'Hi {{client_first_name}}, please review and sign your contract with {{vendor_name}}: {{contract_url}}',
  final_payment_due:
    'Hi {{client_first_name}}, final payment of £{{amount}} due in {{days}} days. {{payment_url}}',

  // Wedding Countdown
  one_month_countdown:
    "Hi {{client_first_name}}! 1 month until your big day! Let's finalize details with {{vendor_name}}.",
  one_week_countdown:
    'Hi {{client_first_name}}, 1 week to go! {{vendor_name}} is ready. Any last questions?',
  day_before_reminder:
    'Hi {{client_first_name}}, tomorrow is the big day! {{vendor_name}} is ready to make it perfect.',
  wedding_day_message:
    "Today's the day {{client_first_name}}! {{vendor_name}} wishes you a perfect wedding!",

  // Vendor Specific
  venue_tour_scheduled:
    'Tour confirmed at {{venue_name}} on {{date}} at {{time}}. See you soon!',
  menu_tasting_reminder:
    "Don't forget your tasting appointment tomorrow at {{time}}! - {{caterer_name}}",
  photo_timeline_ready:
    'Hi {{client_first_name}}, your photography timeline is ready: {{timeline_url}}',
  music_playlist_update:
    'Your playlist has been updated! Review it here: {{playlist_url}} - {{dj_name}}',
  floral_design_ready:
    'Your floral designs are ready for review: {{design_url}} - {{florist_name}}',

  // Updates & Confirmations
  timeline_update:
    'Hi {{client_first_name}}, your timeline with {{vendor_name}} has been updated. View it here: {{timeline_url}}',
  event_confirmation:
    "Hi {{client_first_name}}, confirming your event with {{vendor_name}} on {{event_date}}. We're ready!",
  delivery_confirmation:
    '{{vendor_name}} delivery confirmed for {{date}} at {{time}} to {{location}}.',
  setup_complete:
    'Setup complete at {{venue_name}}! Everything looks beautiful. - {{vendor_name}}',

  // Post-Wedding
  thank_you:
    'Thank you {{client_first_name}}! It was a pleasure working with you. - {{vendor_name}}',
  follow_up:
    "Hi {{client_first_name}}, how was your experience with {{vendor_name}}? We'd love your feedback: {{review_url}}",
  gallery_ready:
    'Your photos are ready! View your gallery: {{gallery_url}} - {{photographer_name}}',
  video_preview:
    'Your wedding video preview is ready! Watch here: {{video_url}} - {{videographer_name}}',

  // Urgent & Weather
  urgent_update:
    'URGENT: {{message}} Please contact {{vendor_name}} at {{phone}}.',
  weather_alert:
    'Weather update for {{event_date}}: {{weather_status}}. {{vendor_name}} has backup plans ready.',
  schedule_change:
    'Schedule change: {{change_details}}. Reply YES to confirm. - {{vendor_name}}',

  // Custom
  custom: '{{message}}',
};

export interface JourneySMSConfig {
  to: string;
  template: keyof typeof JOURNEY_SMS_TEMPLATES;
  variables: Record<string, any>;
  organizationId: string;
  organizationTier: 'FREE' | 'PROFESSIONAL' | 'SCALE' | 'ENTERPRISE';
  customMessage?: string;
}

export class JourneySMSService {
  /**
   * Format and validate phone number
   */
  private static formatPhoneNumber(phoneNumber: string): string | null {
    try {
      // Add country code if not present (assume US)
      let formattedPhone = phoneNumber;
      if (!phoneNumber.startsWith('+')) {
        formattedPhone = '+1' + phoneNumber.replace(/\D/g, '');
      }

      if (!isValidPhoneNumber(formattedPhone)) {
        return null;
      }

      const parsed = parsePhoneNumber(formattedPhone);
      return parsed ? parsed.format('E.164') : null;
    } catch {
      return null;
    }
  }

  /**
   * Calculate SMS segments
   */
  private static calculateSegments(message: string): number {
    const hasSpecialChars = /[^\x00-\x7F]/.test(message);
    const maxLength = hasSpecialChars ? 67 : 153;
    return Math.ceil(message.length / maxLength);
  }

  /**
   * Calculate SMS cost
   */
  private static calculateCost(segments: number): number {
    // Simplified pricing - $0.0075 per segment for US
    return segments * 0.0075;
  }

  /**
   * Render SMS template with variables
   */
  private static renderTemplate(
    template: keyof typeof JOURNEY_SMS_TEMPLATES,
    variables: Record<string, any>,
  ): string {
    let message = JOURNEY_SMS_TEMPLATES[template];

    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    });

    // Remove any unreplaced variables
    message = message.replace(/{{[^}]+}}/g, '');

    // Trim to 160 characters if needed
    if (message.length > 160) {
      message = message.substring(0, 157) + '...';
    }

    return message;
  }

  /**
   * Check SMS credits
   */
  private static checkCredits(
    tier: string,
    segments: number,
  ): { allowed: boolean; reason?: string } {
    const credits = {
      FREE: 0,
      PROFESSIONAL: 100,
      SCALE: 500,
      ENTERPRISE: -1, // Unlimited
    };

    const allowance = credits[tier as keyof typeof credits] || 0;

    if (allowance === 0) {
      return {
        allowed: false,
        reason:
          'SMS not available on free tier. Upgrade to Professional or higher.',
      };
    }

    if (allowance === -1) {
      return { allowed: true };
    }

    // For simplicity, we're not tracking actual usage here
    // In production, you'd check against actual monthly usage
    return { allowed: true };
  }

  /**
   * Send SMS using journey template
   */
  static async sendSMS(config: JourneySMSConfig): Promise<{
    messageId: string;
    status: 'sent' | 'failed';
    cost?: number;
    segments?: number;
    error?: string;
  }> {
    try {
      // Format phone number
      const formattedPhone = this.formatPhoneNumber(config.to);
      if (!formattedPhone) {
        throw new Error('Invalid phone number format');
      }

      // Generate message from template
      const message =
        config.customMessage ||
        this.renderTemplate(config.template, config.variables);

      // Calculate segments and cost
      const segments = this.calculateSegments(message);
      const cost = this.calculateCost(segments);

      // Check credit limits
      const creditCheck = this.checkCredits(config.organizationTier, segments);
      if (!creditCheck.allowed) {
        throw new Error(creditCheck.reason || 'Credit limit exceeded');
      }

      // Send SMS via Twilio
      if (!client) {
        console.log(
          'Twilio not configured, SMS would be sent to:',
          formattedPhone,
        );
        console.log('Message:', message);
        return {
          messageId: `mock_${Date.now()}`,
          status: 'sent',
          cost,
          segments,
        };
      }

      const twilioMessage = await client.messages.create({
        body: message,
        from: fromNumber!,
        to: formattedPhone,
      });

      return {
        messageId: twilioMessage.sid,
        status: 'sent',
        cost,
        segments,
      };
    } catch (error) {
      console.error('Journey SMS service error:', error);
      return {
        messageId: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton for compatibility
export const smsService = JourneySMSService;
