import { Resend } from 'resend';

interface EmailData {
  to: string;
  subject: string;
  template_id?: string;
  template_data?: Record<string, any>;
  html_content?: string;
  text_content?: string;
  from?: string;
  reply_to?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
}

export class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error(
        'RESEND_API_KEY is not configured - email sending will fail',
      );
    }

    this.resend = new Resend(apiKey || 'dummy_key_for_development');
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@wedsync.com';
  }

  async sendEmail(data: EmailData): Promise<string> {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn('Email service not configured - simulating email send');
        console.log('Would send email:', {
          to: data.to,
          subject: data.subject,
          preview:
            data.html_content?.substring(0, 100) ||
            data.text_content?.substring(0, 100),
        });
        return `simulated-${Date.now()}`;
      }

      const emailContent =
        data.html_content ||
        this.renderTemplate(data.template_id, data.template_data);

      const response = await this.resend.emails.send({
        from: data.from || this.fromEmail,
        to: data.to,
        subject: data.subject,
        html: emailContent,
        text: data.text_content,
        reply_to: data.reply_to,
        attachments: data.attachments,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data?.id || 'unknown';
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendBulkEmails(emails: EmailData[]): Promise<string[]> {
    const results: string[] = [];

    for (const email of emails) {
      try {
        const messageId = await this.sendEmail(email);
        results.push(messageId);
      } catch (error) {
        console.error('Failed to send email to:', email.to, error);
        results.push('failed');
      }
    }

    return results;
  }

  private renderTemplate(
    templateId?: string,
    data?: Record<string, any>,
  ): string {
    if (!templateId) {
      return this.getDefaultTemplate(data);
    }

    // In a real implementation, you would fetch templates from database
    // For now, return a basic template
    return this.getDefaultTemplate(data);
  }

  private getDefaultTemplate(data?: Record<string, any>): string {
    const { client_name, vendor_name, wedding_date, message } = data || {};

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .content { padding: 20px; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Wedding Update</h2>
            </div>
            <div class="content">
              ${client_name ? `<p>Dear ${client_name},</p>` : ''}
              ${message || '<p>You have a new update regarding your wedding planning.</p>'}
              ${wedding_date ? `<p><strong>Wedding Date:</strong> ${wedding_date}</p>` : ''}
              ${vendor_name ? `<p><strong>From:</strong> ${vendor_name}</p>` : ''}
            </div>
            <div class="footer">
              <p>© 2025 WedSync. All rights reserved.</p>
              <p>This is an automated message from your wedding planning platform.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
