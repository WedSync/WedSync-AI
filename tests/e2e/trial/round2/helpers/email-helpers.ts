/**
 * Email Test Helpers - WS-167 Round 2  
 * Utilities for testing email notifications and integrations
 */

import { Page } from '@playwright/test';

interface EmailMessage {
  id: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  html?: string;
  sent_at: string;
  template_id?: string;
  metadata?: any;
}

export class EmailTestHelpers {
  private emailQueue: EmailMessage[] = [];
  private emailService: 'resend' | 'sendgrid' | 'mock' = 'mock';

  constructor(emailService: 'resend' | 'sendgrid' | 'mock' = 'mock') {
    this.emailService = emailService;
  }

  async setupEmailInterception(page: Page) {
    // Intercept email sending API calls
    await page.route('/api/emails/send', async (route) => {
      const request = route.request();
      const body = await request.postDataJSON();
      
      // Simulate email being sent and store in queue
      const email: EmailMessage = {
        id: 'email_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        to: body.to,
        from: body.from || 'noreply@wedsync.com',
        subject: body.subject,
        body: body.text || body.html || '',
        html: body.html,
        sent_at: new Date().toISOString(),
        template_id: body.template_id,
        metadata: body.metadata || {}
      };
      
      this.emailQueue.push(email);
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          messageId: email.id,
          status: 'sent'
        })
      });
    });
    
    // Intercept template-based emails
    await page.route('/api/emails/send-template', async (route) => {
      const request = route.request();
      const body = await request.postDataJSON();
      
      const email: EmailMessage = {
        id: 'template_email_' + Date.now(),
        to: body.to,
        from: body.from || 'noreply@wedsync.com',
        subject: this.generateSubjectFromTemplate(body.template_id, body.data),
        body: this.generateBodyFromTemplate(body.template_id, body.data),
        sent_at: new Date().toISOString(),
        template_id: body.template_id,
        metadata: body.data
      };
      
      this.emailQueue.push(email);
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          messageId: email.id,
          templateUsed: body.template_id
        })
      });
    });
  }

  async getLastEmail(recipientEmail: string): Promise<EmailMessage> {
    const emails = this.emailQueue
      .filter(email => email.to === recipientEmail)
      .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
    
    if (emails.length === 0) {
      throw new Error(`No emails found for ${recipientEmail}`);
    }
    
    return emails[0];
  }

  async waitForEmail(recipientEmail: string, subjectContains: string, timeoutMs = 10000): Promise<EmailMessage> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const email = this.emailQueue.find(e => 
        e.to === recipientEmail && 
        e.subject.includes(subjectContains)
      );
      
      if (email) {
        return email;
      }
      
      // Wait 500ms before checking again
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error(
      `Email with subject containing "${subjectContains}" not found for ${recipientEmail} within ${timeoutMs}ms`
    );
  }

  async getEmailsByTemplate(templateId: string): Promise<EmailMessage[]> {
    return this.emailQueue.filter(email => email.template_id === templateId);
  }

  async getEmailsInDateRange(startDate: Date, endDate: Date): Promise<EmailMessage[]> {
    return this.emailQueue.filter(email => {
      const sentDate = new Date(email.sent_at);
      return sentDate >= startDate && sentDate <= endDate;
    });
  }

  async verifyEmailContent(email: EmailMessage, expectedContent: {
    subject?: string;
    bodyContains?: string[];
    hasLinks?: string[];
    hasImages?: boolean;
    templateData?: any;
  }) {
    const results = {
      subjectMatch: true,
      bodyContentMatch: true,
      linksFound: [] as string[],
      imagesFound: false,
      templateDataMatch: true
    };
    
    // Check subject
    if (expectedContent.subject && !email.subject.includes(expectedContent.subject)) {
      results.subjectMatch = false;
    }
    
    // Check body content
    if (expectedContent.bodyContains) {
      for (const content of expectedContent.bodyContains) {
        if (!email.body.includes(content)) {
          results.bodyContentMatch = false;
          break;
        }
      }
    }
    
    // Check for links
    if (expectedContent.hasLinks) {
      const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/g;
      let match;
      while ((match = linkRegex.exec(email.html || email.body)) !== null) {
        results.linksFound.push(match[1]);
      }
      
      for (const expectedLink of expectedContent.hasLinks) {
        if (!results.linksFound.some(link => link.includes(expectedLink))) {
          // Link not found
        }
      }
    }
    
    // Check for images
    if (expectedContent.hasImages) {
      const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/g;
      results.imagesFound = imgRegex.test(email.html || email.body);
    }
    
    // Check template data
    if (expectedContent.templateData && email.metadata) {
      results.templateDataMatch = this.compareObjects(email.metadata, expectedContent.templateData);
    }
    
    return results;
  }

  async generateEmailPreview(templateId: string, data: any): Promise<string> {
    const subject = this.generateSubjectFromTemplate(templateId, data);
    const body = this.generateBodyFromTemplate(templateId, data);
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3>Email Preview</h3>
          <p><strong>Template:</strong> ${templateId}</p>
          <p><strong>Subject:</strong> ${subject}</p>
        </div>
        <div style="background: white; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          ${body}
        </div>
      </div>
    `;
  }

  private generateSubjectFromTemplate(templateId: string, data: any): string {
    const templates: Record<string, string> = {
      'trial-welcome': `Welcome to your WedSync trial, ${data.user_name || 'there'}!`,
      'trial-expiring': `Your WedSync trial expires in ${data.days_remaining || 'X'} days`,
      'trial-extended': `Good news! Your trial has been extended`,
      'conversion-success': `Welcome to WedSync Professional!`,
      'payment-failed': `Payment issue with your WedSync subscription`,
      'subscription-cancelled': `Your WedSync subscription has been cancelled`,
      'invitation-sent': `You're invited to join ${data.organization_name || 'a team'} on WedSync`
    };
    
    return templates[templateId] || `WedSync Notification`;
  }

  private generateBodyFromTemplate(templateId: string, data: any): string {
    const templates: Record<string, Function> = {
      'trial-welcome': (d: any) => `
        <h2>Welcome to WedSync!</h2>
        <p>Hi ${d.user_name || 'there'},</p>
        <p>Your 14-day trial is now active. Here's what you can do:</p>
        <ul>
          <li>Add up to 3 clients</li>
          <li>Create automated workflows</li>
          <li>Build custom dashboards</li>
          <li>Access all Professional features</li>
        </ul>
        <a href="${d.dashboard_url || '#'}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Get Started</a>
      `,
      
      'trial-expiring': (d: any) => `
        <h2>Your trial expires soon</h2>
        <p>Hi ${d.user_name || 'there'},</p>
        <p>Your WedSync trial expires in ${d.days_remaining || 'X'} days. Don't lose access to:</p>
        <ul>
          <li>Your ${d.clients_count || '0'} clients</li>
          <li>Your custom workflows</li>
          <li>All your progress</li>
        </ul>
        <a href="${d.upgrade_url || '#'}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Upgrade Now</a>
        <p><a href="${d.extension_url || '#'}">Request Extension</a></p>
      `,
      
      'trial-extended': (d: any) => `
        <h2>Great news! Your trial has been extended</h2>
        <p>Hi ${d.user_name || 'there'},</p>
        <p>We've added ${d.extension_days || 'X'} more days to your trial. Your new expiration date is ${d.new_end_date || 'TBD'}.</p>
        <p>Continue exploring WedSync and let us know if you have any questions!</p>
        <a href="${d.dashboard_url || '#'}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Continue Trial</a>
      `,
      
      'conversion-success': (d: any) => `
        <h2>Welcome to WedSync Professional! 🎉</h2>
        <p>Hi ${d.user_name || 'there'},</p>
        <p>Thank you for subscribing to WedSync Professional. You now have access to:</p>
        <ul>
          <li>Unlimited clients</li>
          <li>Advanced automation</li>
          <li>Priority support</li>
          <li>Custom integrations</li>
        </ul>
        <a href="${d.dashboard_url || '#'}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Explore Professional Features</a>
      `
    };
    
    const templateFunc = templates[templateId];
    return templateFunc ? templateFunc(data) : `<p>Email content for ${templateId}</p>`;
  }

  private compareObjects(obj1: any, obj2: any): boolean {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) {
      return false;
    }
    
    for (const key of keys1) {
      if (obj1[key] !== obj2[key]) {
        return false;
      }
    }
    
    return true;
  }

  clearEmailQueue() {
    this.emailQueue = [];
  }

  getEmailQueue(): EmailMessage[] {
    return [...this.emailQueue];
  }

  getEmailCount(): number {
    return this.emailQueue.length;
  }

  async mockEmailDeliveryStatus(emailId: string, status: 'delivered' | 'bounced' | 'rejected' | 'deferred') {
    const email = this.emailQueue.find(e => e.id === emailId);
    if (email) {
      email.metadata = {
        ...email.metadata,
        delivery_status: status,
        delivery_time: new Date().toISOString()
      };
    }
  }
}