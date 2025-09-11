# WS-309: Journey Module Types Overview - Team C Integration Prompt

## COMPREHENSIVE TEAM C PROMPT
### Integration Development for WedSync Journey Module Types System

---

## 🎯 DEVELOPMENT MANAGER DIRECTIVE

**Project**: WedSync Enterprise Wedding Platform  
**Feature**: WS-309 - Journey Module Types Overview  
**Team**: C (Integration & External Services)  
**Sprint**: Journey Module Types Integration Layer  
**Priority**: P0 (Critical integration layer for module execution)

**Context**: You are Team C, responsible for building the integration layer that connects WedSync's journey module types to external services. You must create robust integrations for email services, SMS providers, form systems, calendar platforms, and CRM systems that wedding vendors use daily.

---

## 📋 EVIDENCE OF REALITY REQUIREMENTS

### MANDATORY FILE VERIFICATION (Non-Negotiable)
Before proceeding, you MUST verify these files exist and read their contents:

```typescript
// CRITICAL: These files must exist before you begin development
const requiredFiles = [
  '/WORKFLOW-V2-DRAFT/INBOX/dev-manager/WS-309-journey-module-types-overview-technical.md',
  '/wedsync/src/lib/services/journey-module-service.ts',     // From Team B
  '/wedsync/src/components/journeys/modules/EmailModule.tsx', // From Team A
  '/wedsync/src/lib/integrations/journey-integration-orchestrator.ts', // From WS-308
  '/wedsync/src/lib/integrations/email-service-integration.ts',     // Your foundation
  '/wedsync/src/lib/integrations/sms-service-integration.ts'        // Your service
];

// VERIFY: Each file must be read and understood before coding
requiredFiles.forEach(file => {
  if (!fileExists(file)) {
    throw new Error(`EVIDENCE FAILURE: Required file ${file} does not exist. Cannot create integrations without understanding module requirements.`);
  }
});
```

### ARCHITECTURAL CONTEXT VERIFICATION
You must understand the complete journey module integration architecture:

1. **Module UI** (Team A): Configuration interfaces requiring integration validation
2. **Module Services** (Team B): Core execution requiring external service calls
3. **Module Integrations** (Team C): External service connections and data sync
4. **Module Infrastructure** (Team D): Platform monitoring and scaling
5. **Module Quality** (Team E): Integration testing and validation

---

## 🧠 SEQUENTIAL THINKING INTEGRATION

### MANDATORY: Use Sequential Thinking MCP for Integration Architecture

For every major integration decision, you MUST use the Sequential Thinking MCP to analyze service requirements:

```typescript
// REQUIRED: Before implementing any integration service
await mcp__sequential_thinking__sequential_thinking({
  thought: "I need to design the integration layer for WedSync's journey module types. This must connect 7 different module types to external services wedding vendors use. Let me analyze the integration requirements: 1) Email Service Integration - Connect to Resend, SendGrid, Mailgun for reliable email delivery, 2) SMS Service Integration - WhatsApp Business API, Twilio SMS for text messaging, 3) Form Service Integration - Connect to internal form builder and external form platforms, 4) Calendar Integration - Google Calendar, Calendly, Acuity for meeting scheduling, 5) CRM Integration - Tave, HoneyBook, StudioNinja for wedding vendor CRMs, 6) Review Platform Integration - Google Reviews, Facebook, WeddingWire for reputation management.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 8
});

// Continue analysis through all integration considerations
```

### WEDDING INDUSTRY INTEGRATION ANALYSIS
```typescript
await mcp__sequential_thinking__sequential_thinking({
  thought: "Wedding industry integrations have unique challenges: 1) Vendor Tool Diversity - Photographers use Tave/ShootQ, venues use different booking systems, 2) Peak Season Load - Wedding season creates 5x API call volume, need rate limiting, 3) Critical Path Dependencies - Some integrations are business-critical (payment processing, contract signing), 4) Data Sensitivity - Wedding data is highly personal, need secure API handling, 5) Weekend Operations - Weddings happen on weekends when support is limited, 6) Multi-Platform Presence - Vendors manage multiple platforms simultaneously (Google, Facebook, Instagram, WeddingWire).",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 8
});
```

---

## 🎨 WEDSYNC INTEGRATION STACK REQUIREMENTS

### REQUIRED INTEGRATION ARCHITECTURE
All integrations must follow WedSync patterns:

```typescript
// MANDATORY: Use these exact integration patterns
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';
import { encrypt, decrypt } from '@/lib/utils/encryption';
import { rateLimitHandler } from '@/lib/utils/rate-limit';

// External service clients
import { Resend } from 'resend';
import { Twilio } from 'twilio';
import axios from 'axios';

// Wedding industry specific integrations
import { TaveClient } from '@/lib/integrations/crm/tave-client';
import { HoneyBookClient } from '@/lib/integrations/crm/honeybook-client';
import { GoogleCalendarClient } from '@/lib/integrations/calendar/google-calendar';
```

### INTEGRATION SECURITY REQUIREMENTS
- **API Key Encryption**: All API keys encrypted at rest
- **Rate Limiting**: Respect external service rate limits
- **Error Handling**: Graceful degradation when services unavailable
- **Audit Logging**: Track all external API calls

---

## 🔧 SERENA MCP INTEGRATION REQUIREMENTS

### MANDATORY SETUP PROTOCOL
```bash
# REQUIRED: Before any integration development work
serena activate_project WedSync2
serena get_symbols_overview src/lib/integrations/
serena find_symbol "EmailServiceIntegration"
serena write_memory "WS-309-team-c-module-integrations" "Journey module types integration layer with wedding industry service connections"
```

### SEMANTIC CODE REQUIREMENTS
All integration code must use Serena MCP for consistency:

```typescript
// Use Serena for intelligent integration generation
serena replace_symbol_body "EmailServiceIntegration" "
class EmailServiceIntegration {
  async sendModuleEmail(moduleConfig: EmailModuleConfig, context: ExecutionContext): Promise<IntegrationResult> {
    // Wedding-optimized email delivery
  }
}
";
```

---

## 🔐 SECURITY REQUIREMENTS CHECKLIST

### INTEGRATION SECURITY COMPLIANCE
```typescript
interface IntegrationSecurityChecklist {
  apiSecurity: {
    // ✅ All external API calls must implement these
    encrypted_credentials: boolean;          // Required: Encrypt API keys
    rate_limiting: boolean;                  // Required: Respect service limits
    timeout_handling: boolean;               // Required: Prevent hanging requests
    ssl_verification: boolean;               // Required: Verify SSL certificates
    request_signing: boolean;                // Required: Sign sensitive requests
  };
  
  dataProtection: {
    pii_encryption: boolean;                 // Required: Encrypt client data
    webhook_verification: boolean;           // Required: Verify webhook signatures
    audit_logging: boolean;                  // Required: Log all API calls
    data_minimization: boolean;              // Required: Send only necessary data
  };
  
  errorHandling: {
    no_credential_leakage: boolean;          // Required: Never expose API keys
    graceful_degradation: boolean;           // Required: Handle service outages
    retry_with_backoff: boolean;             // Required: Exponential backoff
  };
}
```

---

## 🎯 TEAM C SPECIALIZATION: INTEGRATION EXCELLENCE

### PRIMARY RESPONSIBILITIES
You are the **Integration team** responsible for:

1. **Email Service Integration**
   - Resend/SendGrid/Mailgun integration
   - Template management and personalization
   - Delivery tracking and webhooks
   - Wedding-specific email optimization

2. **SMS & Messaging Integration**
   - WhatsApp Business API integration
   - Twilio SMS service integration
   - Message template management
   - International wedding support

3. **Calendar & Meeting Integration**
   - Google Calendar integration
   - Calendly/Acuity scheduling links
   - Meeting reminder automation
   - Wedding timeline synchronization

4. **CRM & External Platform Integration**
   - Tave CRM integration
   - HoneyBook data synchronization
   - Wedding vendor platform APIs
   - Data import/export automation

---

## 📊 CORE DELIVERABLES

### 1. EMAIL SERVICE INTEGRATION
```typescript
// FILE: /src/lib/integrations/email-service-integration.ts
import { Resend } from 'resend';
import { logger } from '@/lib/utils/logger';
import { encrypt, decrypt } from '@/lib/utils/encryption';
import { supabase } from '@/lib/supabase';

interface EmailModuleConfig {
  template_id: string;
  send_delay?: number;
  personalization?: Record<string, string>;
  subject_override?: string;
  send_time?: 'immediate' | 'business_hours' | 'custom';
}

interface EmailExecutionContext {
  client_id: string;
  supplier_id: string;
  client_data: {
    email: string;
    couple_name: string;
    wedding_date?: string;
  };
  supplier_data: {
    name: string;
    email: string;
    brand_colors?: Record<string, string>;
  };
}

interface EmailIntegrationResult {
  success: boolean;
  message_id?: string;
  delivery_status: 'sent' | 'queued' | 'failed';
  error_message?: string;
  webhook_id?: string;
}

export class EmailServiceIntegration {
  private resendClient: Resend;
  private webhookSecret: string;

  constructor() {
    this.resendClient = new Resend(process.env.RESEND_API_KEY);
    this.webhookSecret = process.env.RESEND_WEBHOOK_SECRET!;
  }

  async sendModuleEmail(
    config: EmailModuleConfig,
    context: EmailExecutionContext
  ): Promise<EmailIntegrationResult> {
    try {
      logger.info('Sending module email', {
        templateId: config.template_id,
        clientId: context.client_id,
        supplierId: context.supplier_id
      });

      // Get email template
      const template = await this.getEmailTemplate(config.template_id, context.supplier_id);
      if (!template) {
        throw new Error(`Email template ${config.template_id} not found`);
      }

      // Prepare email content with personalization
      const emailContent = await this.prepareEmailContent(template, config, context);

      // Handle wedding-specific timing
      const sendDelay = this.calculateWeddingOptimizedDelay(config, context);

      // Send email based on timing
      if (sendDelay > 0) {
        return await this.scheduleEmail(emailContent, sendDelay);
      } else {
        return await this.sendImmediateEmail(emailContent);
      }

    } catch (error) {
      logger.error('Email module integration failed:', {
        error: error.message,
        templateId: config.template_id,
        clientId: context.client_id
      });

      return {
        success: false,
        delivery_status: 'failed',
        error_message: error.message
      };
    }
  }

  private async getEmailTemplate(templateId: string, supplierId: string): Promise<EmailTemplate | null> {
    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .eq('supplier_id', supplierId)
      .single();

    return template;
  }

  private async prepareEmailContent(
    template: EmailTemplate,
    config: EmailModuleConfig,
    context: EmailExecutionContext
  ): Promise<EmailContent> {
    let subject = config.subject_override || template.subject;
    let htmlContent = template.html_content;
    let textContent = template.text_content;

    // Apply personalization tokens
    const personalizationData = {
      couple_name: context.client_data.couple_name,
      wedding_date: context.client_data.wedding_date ? 
        new Date(context.client_data.wedding_date).toLocaleDateString() : 'TBD',
      supplier_name: context.supplier_data.name,
      supplier_email: context.supplier_data.email,
      ...config.personalization
    };

    // Replace personalization tokens
    Object.entries(personalizationData).forEach(([token, value]) => {
      const tokenPattern = new RegExp(`{{${token}}}`, 'g');
      subject = subject.replace(tokenPattern, value || '');
      htmlContent = htmlContent.replace(tokenPattern, value || '');
      textContent = textContent.replace(tokenPattern, value || '');
    });

    // Apply wedding-specific branding
    if (context.supplier_data.brand_colors) {
      htmlContent = this.applyBrandColors(htmlContent, context.supplier_data.brand_colors);
    }

    return {
      to: context.client_data.email,
      from: `${context.supplier_data.name} <${process.env.EMAIL_FROM}>`,
      reply_to: context.supplier_data.email,
      subject,
      html: htmlContent,
      text: textContent,
      tags: [
        { name: 'module', value: 'journey_email' },
        { name: 'supplier_id', value: context.supplier_id },
        { name: 'template_id', value: template.id }
      ]
    };
  }

  private calculateWeddingOptimizedDelay(
    config: EmailModuleConfig,
    context: EmailExecutionContext
  ): number {
    let delay = config.send_delay || 0;

    // Wedding-specific timing optimizations
    if (config.send_time === 'business_hours') {
      const now = new Date();
      const currentHour = now.getHours();
      
      // If outside business hours, delay until 9 AM next business day
      if (currentHour < 9 || currentHour >= 17 || now.getDay() === 0 || now.getDay() === 6) {
        delay = this.getMinutesUntilNextBusinessHours();
      }
    }

    // Prioritize wedding week communications
    if (context.client_data.wedding_date) {
      const daysUntilWedding = this.getDaysUntilWedding(context.client_data.wedding_date);
      if (daysUntilWedding <= 7) {
        delay = Math.min(delay, 30); // Max 30 minute delay for wedding week
      }
    }

    return delay;
  }

  private async sendImmediateEmail(emailContent: EmailContent): Promise<EmailIntegrationResult> {
    try {
      const response = await this.resendClient.emails.send(emailContent);

      // Log successful send
      await this.logEmailSent(emailContent, response.data.id);

      return {
        success: true,
        message_id: response.data.id,
        delivery_status: 'sent'
      };

    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  private async scheduleEmail(
    emailContent: EmailContent,
    delayMinutes: number
  ): Promise<EmailIntegrationResult> {
    try {
      // For delayed emails, we'll queue them in our database and process with a worker
      const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000);

      const { data: queuedEmail } = await supabase
        .from('email_queue')
        .insert({
          email_content: emailContent,
          scheduled_for: scheduledFor.toISOString(),
          status: 'queued',
          attempts: 0
        })
        .select()
        .single();

      logger.info('Email queued for delayed sending', {
        queueId: queuedEmail.id,
        scheduledFor: scheduledFor.toISOString(),
        delayMinutes
      });

      return {
        success: true,
        message_id: queuedEmail.id,
        delivery_status: 'queued'
      };

    } catch (error) {
      throw new Error(`Failed to queue email: ${error.message}`);
    }
  }

  async handleEmailWebhook(payload: any, signature: string): Promise<void> {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(payload, signature)) {
        throw new Error('Invalid webhook signature');
      }

      const { type, data } = payload;

      // Update email status based on webhook event
      switch (type) {
        case 'email.sent':
          await this.updateEmailStatus(data.email_id, 'delivered');
          break;
        case 'email.delivered':
          await this.updateEmailStatus(data.email_id, 'delivered');
          break;
        case 'email.bounced':
          await this.updateEmailStatus(data.email_id, 'bounced');
          await this.handleEmailBounce(data);
          break;
        case 'email.complained':
          await this.updateEmailStatus(data.email_id, 'complained');
          await this.handleEmailComplaint(data);
          break;
      }

    } catch (error) {
      logger.error('Email webhook handling failed:', error);
    }
  }

  private verifyWebhookSignature(payload: any, signature: string): boolean {
    // Implement webhook signature verification
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return signature === expectedSignature;
  }

  private getDaysUntilWedding(weddingDate: string): number {
    const today = new Date();
    const wedding = new Date(weddingDate);
    const diffTime = wedding.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private getMinutesUntilNextBusinessHours(): number {
    const now = new Date();
    let nextBusinessDay = new Date(now);

    // If weekend, move to Monday
    if (now.getDay() === 0) nextBusinessDay.setDate(now.getDate() + 1); // Sunday -> Monday
    if (now.getDay() === 6) nextBusinessDay.setDate(now.getDate() + 2); // Saturday -> Monday

    // Set to 9 AM
    nextBusinessDay.setHours(9, 0, 0, 0);

    // If we're already past 5 PM on a weekday, move to next day
    if (now.getHours() >= 17 && now.getDay() >= 1 && now.getDay() <= 5) {
      nextBusinessDay.setDate(nextBusinessDay.getDate() + 1);
    }

    return Math.max(0, Math.floor((nextBusinessDay.getTime() - now.getTime()) / 60000));
  }

  private async logEmailSent(emailContent: EmailContent, messageId: string): Promise<void> {
    await supabase
      .from('email_logs')
      .insert({
        message_id: messageId,
        recipient: emailContent.to,
        subject: emailContent.subject,
        status: 'sent',
        sent_at: new Date().toISOString()
      });
  }

  private async updateEmailStatus(messageId: string, status: string): Promise<void> {
    await supabase
      .from('email_logs')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('message_id', messageId);
  }
}
```

### 2. SMS SERVICE INTEGRATION
```typescript
// FILE: /src/lib/integrations/sms-service-integration.ts
import { Twilio } from 'twilio';
import axios from 'axios';
import { logger } from '@/lib/utils/logger';
import { supabase } from '@/lib/supabase';

interface SMSModuleConfig {
  message_text: string;
  channel: 'sms' | 'whatsapp';
  send_time?: string;
  personalization?: Record<string, string>;
}

interface SMSExecutionContext {
  client_id: string;
  supplier_id: string;
  client_data: {
    phone: string;
    couple_name: string;
    wedding_date?: string;
  };
  supplier_data: {
    name: string;
    phone: string;
  };
}

export class SMSServiceIntegration {
  private twilioClient: Twilio;
  private whatsappBusinessToken: string;

  constructor() {
    this.twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.whatsappBusinessToken = process.env.WHATSAPP_BUSINESS_TOKEN!;
  }

  async sendModuleSMS(
    config: SMSModuleConfig,
    context: SMSExecutionContext
  ): Promise<IntegrationResult> {
    try {
      logger.info('Sending module SMS', {
        channel: config.channel,
        clientId: context.client_id,
        supplierId: context.supplier_id
      });

      // Prepare message content
      const messageContent = this.prepareMessageContent(config, context);

      // Send based on channel
      if (config.channel === 'whatsapp') {
        return await this.sendWhatsAppMessage(messageContent, context);
      } else {
        return await this.sendSMSMessage(messageContent, context);
      }

    } catch (error) {
      logger.error('SMS module integration failed:', error);
      return {
        success: false,
        error_message: error.message
      };
    }
  }

  private prepareMessageContent(
    config: SMSModuleConfig,
    context: SMSExecutionContext
  ): string {
    let messageText = config.message_text;

    // Apply personalization
    const personalizationData = {
      couple_name: context.client_data.couple_name,
      wedding_date: context.client_data.wedding_date ?
        new Date(context.client_data.wedding_date).toLocaleDateString() : 'TBD',
      supplier_name: context.supplier_data.name,
      ...config.personalization
    };

    Object.entries(personalizationData).forEach(([token, value]) => {
      const tokenPattern = new RegExp(`{{${token}}}`, 'g');
      messageText = messageText.replace(tokenPattern, value || '');
    });

    return messageText;
  }

  private async sendSMSMessage(
    messageContent: string,
    context: SMSExecutionContext
  ): Promise<IntegrationResult> {
    try {
      const message = await this.twilioClient.messages.create({
        body: messageContent,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: context.client_data.phone
      });

      await this.logSMSSent(message.sid, context, 'sms');

      return {
        success: true,
        message_id: message.sid,
        delivery_status: 'sent'
      };

    } catch (error) {
      throw new Error(`SMS sending failed: ${error.message}`);
    }
  }

  private async sendWhatsAppMessage(
    messageContent: string,
    context: SMSExecutionContext
  ): Promise<IntegrationResult> {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: context.client_data.phone,
          type: 'text',
          text: { body: messageContent }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.whatsappBusinessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      await this.logSMSSent(response.data.messages[0].id, context, 'whatsapp');

      return {
        success: true,
        message_id: response.data.messages[0].id,
        delivery_status: 'sent'
      };

    } catch (error) {
      throw new Error(`WhatsApp message failed: ${error.message}`);
    }
  }

  private async logSMSSent(
    messageId: string,
    context: SMSExecutionContext,
    channel: string
  ): Promise<void> {
    await supabase
      .from('sms_logs')
      .insert({
        message_id: messageId,
        recipient: context.client_data.phone,
        channel,
        client_id: context.client_id,
        supplier_id: context.supplier_id,
        status: 'sent',
        sent_at: new Date().toISOString()
      });
  }
}
```

### 3. CALENDAR INTEGRATION SERVICE
```typescript
// FILE: /src/lib/integrations/calendar-integration.ts
import { google } from 'googleapis';
import axios from 'axios';
import { logger } from '@/lib/utils/logger';
import { supabase } from '@/lib/supabase';

interface MeetingModuleConfig {
  meeting_type: string;
  duration: number;
  buffer_time?: number;
  available_times?: string[];
}

interface CalendarExecutionContext {
  client_id: string;
  supplier_id: string;
  client_data: {
    email: string;
    couple_name: string;
    wedding_date?: string;
  };
  supplier_data: {
    name: string;
    email: string;
    calendar_id?: string;
    timezone: string;
  };
}

export class CalendarIntegration {
  private googleCalendar: any;

  constructor() {
    this.googleCalendar = google.calendar({ version: 'v3' });
  }

  async createSchedulingLink(
    config: MeetingModuleConfig,
    context: CalendarExecutionContext
  ): Promise<IntegrationResult> {
    try {
      logger.info('Creating scheduling link', {
        meetingType: config.meeting_type,
        clientId: context.client_id,
        supplierId: context.supplier_id
      });

      // Get supplier's calendar credentials
      const credentials = await this.getSupplierCalendarCredentials(context.supplier_id);
      
      if (credentials.provider === 'google') {
        return await this.createGoogleCalendarLink(config, context, credentials);
      } else if (credentials.provider === 'calendly') {
        return await this.createCalendlyLink(config, context, credentials);
      } else {
        throw new Error(`Unsupported calendar provider: ${credentials.provider}`);
      }

    } catch (error) {
      logger.error('Calendar integration failed:', error);
      return {
        success: false,
        error_message: error.message
      };
    }
  }

  private async createGoogleCalendarLink(
    config: MeetingModuleConfig,
    context: CalendarExecutionContext,
    credentials: any
  ): Promise<IntegrationResult> {
    try {
      // Set up Google Calendar OAuth
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token
      });

      this.googleCalendar.auth = oauth2Client;

      // Create calendar event template
      const eventTemplate = {
        summary: `${config.meeting_type} - ${context.client_data.couple_name}`,
        description: `Wedding consultation with ${context.supplier_data.name}`,
        duration: config.duration,
        attendees: [
          { email: context.client_data.email },
          { email: context.supplier_data.email }
        ]
      };

      // Create scheduling link (simplified - in reality you'd integrate with Google Calendar scheduling)
      const schedulingLink = await this.createSchedulingLinkRecord(config, context, eventTemplate);

      return {
        success: true,
        scheduling_link_id: schedulingLink.id,
        scheduling_url: schedulingLink.url,
        provider: 'google'
      };

    } catch (error) {
      throw new Error(`Google Calendar integration failed: ${error.message}`);
    }
  }

  private async createCalendlyLink(
    config: MeetingModuleConfig,
    context: CalendarExecutionContext,
    credentials: any
  ): Promise<IntegrationResult> {
    try {
      // Create Calendly event type for this specific meeting
      const response = await axios.post(
        'https://api.calendly.com/event_types',
        {
          name: `${config.meeting_type} - ${context.client_data.couple_name}`,
          duration: config.duration,
          kind: 'solo',
          scheduling_url: `${credentials.calendly_username}/${config.meeting_type.toLowerCase().replace(' ', '-')}`,
          description_plain: `Wedding ${config.meeting_type.toLowerCase()} with ${context.supplier_data.name}`
        },
        {
          headers: {
            'Authorization': `Bearer ${credentials.api_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const schedulingLink = await this.createSchedulingLinkRecord(
        config,
        context,
        response.data.resource
      );

      return {
        success: true,
        scheduling_link_id: schedulingLink.id,
        scheduling_url: response.data.resource.scheduling_url,
        provider: 'calendly'
      };

    } catch (error) {
      throw new Error(`Calendly integration failed: ${error.message}`);
    }
  }

  private async getSupplierCalendarCredentials(supplierId: string): Promise<any> {
    const { data: integration } = await supabase
      .from('supplier_integrations')
      .select('*')
      .eq('supplier_id', supplierId)
      .eq('integration_type', 'calendar')
      .eq('is_active', true)
      .single();

    if (!integration) {
      throw new Error('No calendar integration found for supplier');
    }

    return {
      provider: integration.provider,
      credentials: integration.encrypted_credentials
    };
  }

  private async createSchedulingLinkRecord(
    config: MeetingModuleConfig,
    context: CalendarExecutionContext,
    providerData: any
  ): Promise<any> {
    const { data: schedulingLink } = await supabase
      .from('scheduling_links')
      .insert({
        supplier_id: context.supplier_id,
        client_id: context.client_id,
        meeting_type: config.meeting_type,
        duration: config.duration,
        provider_data: providerData,
        url: providerData.scheduling_url || `${process.env.NEXT_PUBLIC_APP_URL}/schedule/${context.supplier_id}/${config.meeting_type}`,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        is_active: true
      })
      .select()
      .single();

    return schedulingLink;
  }
}
```

---

## 📊 WEDDING INDUSTRY INTEGRATION OPTIMIZATIONS

### WEDDING-SPECIFIC INTEGRATION PATTERNS
```typescript
// Wedding vendor CRM integrations
export const weddingVendorIntegrations = {
  photographers: {
    popularCRMs: ['tave', 'shootq', 'pixieset', 'pic_time'],
    emailProviders: ['gmail', 'outlook', 'custom_smtp'],
    calendarSystems: ['google_calendar', 'outlook_calendar', 'calendly'],
    criticalIntegrations: ['tave_workflow', 'gallery_delivery', 'contract_signing']
  },
  
  venues: {
    popularCRMs: ['honeybook', 'aisle_planner', 'allseated'],
    bookingSystems: ['tripleseat', 'caterease', 'event_temple'],
    paymentSystems: ['stripe', 'square', 'authorize_net'],
    criticalIntegrations: ['booking_calendar', 'catering_management', 'floor_planning']
  },
  
  weddingPlanners: {
    popularCRMs: ['honeybook', 'dubsado', '17hats'],
    projectManagement: ['asana', 'trello', 'monday'],
    budgetingTools: ['wedding_budget', 'mint', 'quickbooks'],
    criticalIntegrations: ['vendor_coordination', 'timeline_management', 'budget_tracking']
  }
};
```

---

## 🧪 INTEGRATION TESTING REQUIREMENTS

### INTEGRATION TESTING FRAMEWORK
```typescript
// FILE: /src/__tests__/integrations/email-service-integration.test.ts
import { EmailServiceIntegration } from '@/lib/integrations/email-service-integration';
import { mockEmailConfig, mockEmailContext } from '@/test-utils/integration-mocks';

describe('EmailServiceIntegration', () => {
  let emailIntegration: EmailServiceIntegration;

  beforeEach(() => {
    emailIntegration = new EmailServiceIntegration();
    jest.clearAllMocks();
  });

  describe('sendModuleEmail', () => {
    it('should send email successfully with personalization', async () => {
      const config = {
        ...mockEmailConfig,
        personalization: {
          couple_name: '{{client.couple_name}}',
          wedding_date: '{{client.wedding_date}}'
        }
      };

      const result = await emailIntegration.sendModuleEmail(config, mockEmailContext);

      expect(result.success).toBe(true);
      expect(result.message_id).toBeDefined();
      expect(result.delivery_status).toBe('sent');
    });

    it('should handle wedding week priority timing', async () => {
      const weddingWeekContext = {
        ...mockEmailContext,
        client_data: {
          ...mockEmailContext.client_data,
          wedding_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      };

      const config = { ...mockEmailConfig, send_delay: 120 }; // 2 hours

      const result = await emailIntegration.sendModuleEmail(config, weddingWeekContext);

      expect(result.success).toBe(true);
      // Should reduce delay for wedding week
      expect(result.actual_delay).toBeLessThanOrEqual(30);
    });

    it('should handle business hours timing correctly', async () => {
      const config = {
        ...mockEmailConfig,
        send_time: 'business_hours'
      };

      // Mock current time to be outside business hours
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-15T22:00:00Z').getTime());

      const result = await emailIntegration.sendModuleEmail(config, mockEmailContext);

      expect(result.success).toBe(true);
      expect(result.delivery_status).toBe('queued');
    });
  });

  describe('webhook handling', () => {
    it('should process email delivery webhooks correctly', async () => {
      const webhookPayload = {
        type: 'email.delivered',
        data: {
          email_id: 'test-email-id',
          recipient: 'couple@example.com',
          delivered_at: new Date().toISOString()
        }
      };

      const signature = 'valid-signature';

      await emailIntegration.handleEmailWebhook(webhookPayload, signature);

      // Verify email status was updated
      const emailLog = await supabase
        .from('email_logs')
        .select('status')
        .eq('message_id', 'test-email-id')
        .single();

      expect(emailLog.data.status).toBe('delivered');
    });
  });
});
```

---

## ✅ DEFINITION OF DONE

### INTEGRATION ACCEPTANCE CRITERIA
- [ ] **Email Integration**: Resend/SendGrid integration with webhook handling
- [ ] **SMS Integration**: Twilio and WhatsApp Business API integration
- [ ] **Calendar Integration**: Google Calendar and Calendly scheduling links
- [ ] **CRM Integration**: Tave and HoneyBook data synchronization
- [ ] **Wedding Optimization**: Date-based timing and vendor-specific workflows
- [ ] **Error Handling**: Graceful degradation when external services fail
- [ ] **Security**: Encrypted credentials and webhook signature verification
- [ ] **Performance**: Rate limiting and timeout handling for all external calls

### QUALITY GATES
- [ ] **API Documentation**: Complete integration documentation
- [ ] **Error Monitoring**: Comprehensive logging and alerting
- [ ] **Testing**: Integration tests with mock external services
- [ ] **Security**: All credentials encrypted and secure
- [ ] **Reliability**: Retry logic and fallback mechanisms
- [ ] **Performance**: Sub-2000ms response times for integration calls

---

## 🚀 EXECUTION TIMELINE

### INTEGRATION DEVELOPMENT SPRINT
**Week 1**: Email and SMS service integrations
**Week 2**: Calendar and meeting scheduling integrations
**Week 3**: CRM and external platform integrations
**Week 4**: Testing, optimization, and monitoring

---

## 📞 TEAM COORDINATION

**Daily Integration Updates**: Share progress and API challenges
**External Service Monitoring**: Track service uptime and rate limits
**Security Reviews**: Regular credential and webhook security audits
**Testing Coordination**: Work with Team E for comprehensive integration testing

---

**Integration Excellence: Seamless connections to wedding vendor ecosystems! 🔗💍**