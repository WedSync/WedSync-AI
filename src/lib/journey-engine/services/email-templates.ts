import { Resend } from 'resend';
import { render } from '@react-email/render';

const resend = new Resend(process.env.RESEND_API_KEY);

// Journey-specific email templates
export const JOURNEY_EMAIL_TEMPLATES = {
  welcome_vendor_onboarding: {
    subject: 'Welcome to {{vendor_name}}!',
    body: `
      <h2>Welcome {{client_first_name}}!</h2>
      <p>We're so excited to be part of your wedding journey.</p>
      <p>{{vendor_name}} is here to make your special day perfect.</p>
      <p>Your next steps:</p>
      <ul>
        <li>Complete your initial questionnaire</li>
        <li>Schedule a consultation</li>
        <li>Review our service packages</li>
      </ul>
      <p>We'll be in touch soon!</p>
    `,
  },
  form_shared_with_couple: {
    subject: 'Please complete your {{vendor_name}} form',
    body: `
      <h2>Hi {{client_first_name}},</h2>
      <p>{{vendor_name}} has shared a form for you to complete.</p>
      <p>This will help us better understand your needs and preferences.</p>
      <a href="{{form_url}}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">Complete Form</a>
      <p>If you have any questions, feel free to reach out!</p>
    `,
  },
  form_reminder: {
    subject: 'Reminder: Complete your form for {{vendor_name}}',
    body: `
      <h2>Hi {{client_first_name}},</h2>
      <p>Just a friendly reminder to complete your form for {{vendor_name}}.</p>
      <p>Due date: {{due_date}}</p>
      <a href="{{form_url}}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">Complete Form Now</a>
    `,
  },
  timeline_planning: {
    subject: "Let's plan your timeline - {{vendor_name}}",
    body: `
      <h2>Timeline Planning with {{vendor_name}}</h2>
      <p>Hi {{client_first_name}},</p>
      <p>It's time to plan out your wedding timeline!</p>
      <p>We'll work together to ensure everything runs smoothly on your big day.</p>
      <a href="{{timeline_url}}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">View Timeline</a>
    `,
  },
  thank_you: {
    subject: 'Thank you from {{vendor_name}}!',
    body: `
      <h2>Thank You {{client_first_name}}!</h2>
      <p>It was an absolute pleasure being part of your special day.</p>
      <p>We hope everything was perfect and wish you all the best in your new journey together.</p>
      <p>If you have a moment, we'd love to hear about your experience:</p>
      <a href="{{review_url}}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">Leave a Review</a>
    `,
  },
  contract_reminder: {
    subject: 'Contract reminder from {{vendor_name}}',
    body: `
      <h2>Contract Reminder</h2>
      <p>Hi {{client_first_name}},</p>
      <p>This is a reminder to review and sign your contract with {{vendor_name}}.</p>
      <a href="{{contract_url}}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">Review Contract</a>
    `,
  },
  payment_due: {
    subject: 'Payment due - {{vendor_name}}',
    body: `
      <h2>Payment Reminder</h2>
      <p>Hi {{client_first_name}},</p>
      <p>This is a reminder that your payment of {{amount}} is due on {{due_date}}.</p>
      <a href="{{payment_url}}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">Make Payment</a>
      <p>Thank you for your prompt attention to this matter.</p>
    `,
  },
  event_confirmation: {
    subject: 'Event confirmation - {{vendor_name}}',
    body: `
      <h2>Event Confirmed!</h2>
      <p>Hi {{client_first_name}},</p>
      <p>This confirms your event with {{vendor_name}} on {{event_date}}.</p>
      <p>Details:</p>
      <ul>
        <li>Date: {{event_date}}</li>
        <li>Time: {{event_time}}</li>
        <li>Location: {{event_location}}</li>
      </ul>
      <p>We're looking forward to it!</p>
    `,
  },
  custom: {
    subject: '{{subject}}',
    body: '{{content}}',
  },
};

export interface JourneyEmailConfig {
  to: string;
  template: keyof typeof JOURNEY_EMAIL_TEMPLATES;
  variables: Record<string, any>;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    type: string;
  }>;
}

export class JourneyEmailService {
  /**
   * Send email using journey template
   */
  static async sendEmail(config: JourneyEmailConfig): Promise<{
    messageId: string;
    status: 'sent' | 'failed';
    error?: string;
  }> {
    try {
      const template = JOURNEY_EMAIL_TEMPLATES[config.template];
      if (!template) {
        throw new Error(`Template ${config.template} not found`);
      }

      // Interpolate variables in subject and body
      let subject = template.subject;
      let body = template.body;

      Object.entries(config.variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, String(value));
        body = body.replace(regex, String(value));
      });

      // Remove any unmatched placeholders
      subject = subject.replace(/{{[^}]+}}/g, '');
      body = body.replace(/{{[^}]+}}/g, '');

      // Wrap body in basic HTML template
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              h2 { color: #6366f1; }
              a { color: #6366f1; }
              ul { padding-left: 20px; }
            </style>
          </head>
          <body>
            ${body}
          </body>
        </html>
      `;

      // Send via Resend
      const emailData: any = {
        from: process.env.EMAIL_FROM || 'WedSync Journey <journey@wedsync.com>',
        to: [config.to],
        subject,
        html,
        text: body.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      };

      if (config.cc?.length) {
        emailData.cc = config.cc;
      }
      if (config.bcc?.length) {
        emailData.bcc = config.bcc;
      }
      if (config.replyTo) {
        emailData.reply_to = config.replyTo;
      }

      // Handle attachments if provided
      if (config.attachments?.length) {
        emailData.attachments = config.attachments.map((att) => ({
          filename: att.filename,
          content: Buffer.from(att.content, 'base64'),
          type: att.type,
        }));
      }

      const { data, error } = await resend.emails.send(emailData);

      if (error) {
        console.error('Failed to send journey email:', error);
        return {
          messageId: '',
          status: 'failed',
          error: error.message,
        };
      }

      return {
        messageId: data?.id || '',
        status: 'sent',
      };
    } catch (error) {
      console.error('Journey email service error:', error);
      return {
        messageId: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send template email (wrapper for compatibility)
   */
  static async sendTemplateEmail(data: {
    to: string;
    templateType: string;
    templateProps: Record<string, any>;
    subject?: string;
    priority?: string;
    replyTo?: string;
  }): Promise<{ messageId: string }> {
    const result = await this.sendEmail({
      to: data.to,
      template: data.templateType as keyof typeof JOURNEY_EMAIL_TEMPLATES,
      variables: data.templateProps,
      replyTo: data.replyTo,
    });

    if (result.status === 'failed') {
      throw new Error(result.error || 'Failed to send email');
    }

    return { messageId: result.messageId };
  }
}

// Export singleton for compatibility
export const emailService = JourneyEmailService;
