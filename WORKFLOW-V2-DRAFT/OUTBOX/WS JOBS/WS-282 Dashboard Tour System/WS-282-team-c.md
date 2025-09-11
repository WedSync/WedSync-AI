# WS-282 Dashboard Tour System - Team C Integration Development

## Mission Statement
Design and implement comprehensive integration architecture for the dashboard tour system, ensuring seamless connectivity between the tour experience and all platform services, external APIs, CRM systems, and third-party wedding tools while maintaining real-time synchronization and optimal performance.

## Wedding Context: The Connected Wedding Ecosystem
"Sarah is a wedding planner using WedSync integrated with her existing CRM (HoneyBook), calendar system (Google Calendar), and payment processor (Stripe). When new couples onboard through the dashboard tour, their progress needs to automatically sync with her CRM, trigger calendar invites for consultation calls, update payment tracking, and send personalized welcome emails through her existing workflows. The tour system must work harmoniously with her established business processes."

## Core Responsibilities (Integration Focus)
- CRM system integrations (HoneyBook, Tave, Light Blue, PocketSuite)
- Calendar system synchronization (Google Calendar, Outlook, Apple Calendar)
- Payment platform connections (Stripe, Square, PayPal)
- Email marketing platform integrations (Mailchimp, ConvertKit, ActiveCampaign)
- SMS service integrations (Twilio, Vonage, MessageBird)
- Third-party wedding tools (The Knot, WeddingWire, AllSeated)
- Real-time webhook management and event processing
- Data synchronization and conflict resolution

## Sequential Thinking Integration
Before starting implementation, use the Sequential Thinking MCP to analyze:
1. Integration architecture patterns for tour system connectivity
2. Data flow mapping between tour events and external systems
3. Webhook reliability and error handling strategies
4. Real-time synchronization challenges and solutions
5. Third-party API rate limiting and optimization approaches

Example Sequential Thinking prompt:
```
"I need to design integration architecture for dashboard tours that connects with multiple CRM, calendar, and payment systems. Key considerations: 1) Real-time tour progress sync with CRMs, 2) Calendar event creation for completed onboarding tours, 3) Payment system updates for subscription changes, 4) Email automation triggers, 5) Webhook reliability and retry mechanisms. Let me analyze the optimal integration patterns..."
```

## Evidence of Reality Requirements
**CRITICAL**: Your implementation must include these NON-NEGOTIABLE file outputs:

### 1. Integration Service Layer (Required)
- `src/lib/integrations/tour-integrations.ts` - Core tour integration orchestrator
- `src/lib/integrations/crm-sync.ts` - CRM synchronization service
- `src/lib/integrations/calendar-sync.ts` - Calendar integration service
- `src/lib/integrations/payment-sync.ts` - Payment platform sync

### 2. Webhook Management System (Required)
- `src/app/api/webhooks/tour-events/route.ts` - Incoming tour event webhooks
- `src/lib/webhooks/tour-webhook-processor.ts` - Webhook processing engine
- `src/lib/webhooks/webhook-retry-system.ts` - Retry and error handling

### 3. External API Connectors (Required)
- `src/lib/external-apis/honeBook-connector.ts` - HoneyBook integration
- `src/lib/external-apis/tave-connector.ts` - Tave photography software
- `src/lib/external-apis/google-calendar-connector.ts` - Google Calendar API
- `src/lib/external-apis/stripe-tour-connector.ts` - Stripe integration for tours

### 4. Data Synchronization Engine (Required)
- `src/lib/sync/tour-sync-engine.ts` - Central sync orchestrator
- `src/lib/sync/conflict-resolution.ts` - Data conflict handling
- `src/lib/sync/sync-queue-manager.ts` - Queue management for async sync

### 5. Integration Testing Suite (Required)
- `src/__tests__/integrations/tour-crm-sync.test.ts` - CRM sync testing
- `src/__tests__/integrations/webhook-processing.test.ts` - Webhook testing
- `src/__tests__/integrations/external-api-mocks.test.ts` - API integration testing
- Minimum 90% code coverage for all integration endpoints

**Verification Command**: After implementation, run this exact command to verify your work:
```bash
find . -name "*integrat*" -o -name "*webhook*" -o -name "*sync*" -o -name "*connector*" | grep -E "(lib|api|__tests__)" | sort
```

## Technical Requirements

### Integration Architecture Overview

#### Core Integration Hub
```typescript
// src/lib/integrations/tour-integrations.ts
export class TourIntegrationHub {
  private crmSync: CRMSyncService;
  private calendarSync: CalendarSyncService;
  private paymentSync: PaymentSyncService;
  private emailSync: EmailSyncService;
  private smsSync: SMSSyncService;
  private webhookProcessor: WebhookProcessor;
  private syncEngine: TourSyncEngine;

  constructor() {
    this.crmSync = new CRMSyncService();
    this.calendarSync = new CalendarSyncService();
    this.paymentSync = new PaymentSyncService();
    this.emailSync = new EmailSyncService();
    this.smsSync = new SMSSyncService();
    this.webhookProcessor = new WebhookProcessor();
    this.syncEngine = new TourSyncEngine();
  }

  /**
   * Process tour event and trigger all relevant integrations
   */
  async processTourEvent(event: TourIntegrationEvent): Promise<IntegrationResult[]> {
    const results: IntegrationResult[] = [];
    
    try {
      // Get organization's enabled integrations
      const integrations = await this.getEnabledIntegrations(event.organizationId);
      
      // Process each integration type based on event
      const integrationPromises = integrations.map(async (integration) => {
        try {
          switch (integration.type) {
            case 'crm':
              return await this.processCRMIntegration(event, integration);
            case 'calendar':
              return await this.processCalendarIntegration(event, integration);
            case 'payment':
              return await this.processPaymentIntegration(event, integration);
            case 'email':
              return await this.processEmailIntegration(event, integration);
            case 'sms':
              return await this.processSMSIntegration(event, integration);
            default:
              return { success: false, error: `Unknown integration type: ${integration.type}` };
          }
        } catch (error) {
          return { 
            success: false, 
            error: error.message, 
            integration: integration.type 
          };
        }
      });

      const integrationResults = await Promise.allSettled(integrationPromises);
      
      // Process results and handle failures
      integrationResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason?.message || 'Unknown error',
            integration: integrations[index].type
          });
        }
      });

      // Store integration results for monitoring
      await this.storeIntegrationResults(event.id, results);
      
      // Trigger any dependent workflows
      await this.triggerDependentWorkflows(event, results);

    } catch (error) {
      console.error('Tour integration processing error:', error);
      results.push({ success: false, error: error.message });
    }

    return results;
  }

  /**
   * Handle CRM integration for tour events
   */
  private async processCRMIntegration(
    event: TourIntegrationEvent,
    integration: IntegrationConfig
  ): Promise<IntegrationResult> {
    switch (event.eventType) {
      case 'tour_started':
        return await this.crmSync.createTourStartedActivity(event, integration);
      case 'tour_completed':
        return await this.crmSync.createTourCompletedActivity(event, integration);
      case 'tour_abandoned':
        return await this.crmSync.createTourAbandonedTask(event, integration);
      case 'user_feedback':
        return await this.crmSync.createFeedbackNote(event, integration);
      default:
        return { success: true, message: 'No CRM action required' };
    }
  }

  /**
   * Handle calendar integration for tour events
   */
  private async processCalendarIntegration(
    event: TourIntegrationEvent,
    integration: IntegrationConfig
  ): Promise<IntegrationResult> {
    if (event.eventType === 'tour_completed') {
      // Create follow-up consultation calendar event
      return await this.calendarSync.createFollowUpEvent(event, integration);
    }
    
    return { success: true, message: 'No calendar action required' };
  }

  /**
   * Handle payment integration for tour events
   */
  private async processPaymentIntegration(
    event: TourIntegrationEvent,
    integration: IntegrationConfig
  ): Promise<IntegrationResult> {
    if (event.eventType === 'tour_completed' && event.data?.subscription_interest) {
      // Update payment profile with subscription interest
      return await this.paymentSync.updateSubscriptionInterest(event, integration);
    }
    
    return { success: true, message: 'No payment action required' };
  }

  /**
   * Handle email integration for tour events
   */
  private async processEmailIntegration(
    event: TourIntegrationEvent,
    integration: IntegrationConfig
  ): Promise<IntegrationResult> {
    switch (event.eventType) {
      case 'tour_completed':
        return await this.emailSync.sendWelcomeSequence(event, integration);
      case 'tour_abandoned':
        return await this.emailSync.sendReengagementEmail(event, integration);
      default:
        return { success: true, message: 'No email action required' };
    }
  }

  /**
   * Handle SMS integration for tour events
   */
  private async processSMSIntegration(
    event: TourIntegrationEvent,
    integration: IntegrationConfig
  ): Promise<IntegrationResult> {
    if (event.eventType === 'tour_completed' && integration.settings?.sms_welcome_enabled) {
      return await this.smsSync.sendWelcomeSMS(event, integration);
    }
    
    return { success: true, message: 'No SMS action required' };
  }

  /**
   * Get enabled integrations for organization
   */
  private async getEnabledIntegrations(organizationId: string): Promise<IntegrationConfig[]> {
    const supabase = createClientComponentClient();
    
    const { data: integrations, error } = await supabase
      .from('organization_integrations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (error) throw new TourIntegrationError('Failed to fetch integrations', error);
    
    return integrations || [];
  }

  /**
   * Store integration results for monitoring and debugging
   */
  private async storeIntegrationResults(
    eventId: string,
    results: IntegrationResult[]
  ): Promise<void> {
    const supabase = createClientComponentClient();
    
    const integrationLogs = results.map(result => ({
      event_id: eventId,
      integration_type: result.integration,
      success: result.success,
      error_message: result.error,
      response_data: result.data,
      processed_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('integration_logs')
      .insert(integrationLogs);

    if (error) {
      console.error('Failed to store integration results:', error);
    }
  }

  /**
   * Trigger dependent workflows based on integration results
   */
  private async triggerDependentWorkflows(
    event: TourIntegrationEvent,
    results: IntegrationResult[]
  ): Promise<void> {
    // Check if any critical integrations failed
    const criticalFailures = results.filter(r => 
      !r.success && ['crm', 'payment'].includes(r.integration)
    );

    if (criticalFailures.length > 0) {
      // Trigger admin notification workflow
      await this.notifyAdminsOfIntegrationFailures(event.organizationId, criticalFailures);
    }

    // Trigger success workflows if all integrations succeeded
    const allSucceeded = results.every(r => r.success);
    if (allSucceeded && event.eventType === 'tour_completed') {
      await this.triggerOnboardingCompletionWorkflow(event);
    }
  }

  private async notifyAdminsOfIntegrationFailures(
    organizationId: string,
    failures: IntegrationResult[]
  ): Promise<void> {
    // Implementation for admin notifications
    console.log('Integration failures detected:', failures);
  }

  private async triggerOnboardingCompletionWorkflow(
    event: TourIntegrationEvent
  ): Promise<void> {
    // Trigger post-onboarding automation workflows
    console.log('Triggering onboarding completion workflow for:', event.userId);
  }
}

export class TourIntegrationError extends Error {
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = 'TourIntegrationError';
  }
}

// Integration event types
export interface TourIntegrationEvent {
  id: string;
  eventType: 'tour_started' | 'tour_completed' | 'tour_abandoned' | 'step_completed' | 'user_feedback';
  userId: string;
  organizationId: string;
  tourId: string;
  progressId: string;
  stepIndex?: number;
  data?: Record<string, any>;
  timestamp: string;
  source: 'dashboard' | 'mobile' | 'api';
}

export interface IntegrationConfig {
  id: string;
  type: 'crm' | 'calendar' | 'payment' | 'email' | 'sms';
  provider: string; // 'honeBook', 'tave', 'google', 'stripe', etc.
  settings: Record<string, any>;
  credentials: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntegrationResult {
  success: boolean;
  integration?: string;
  error?: string;
  message?: string;
  data?: Record<string, any>;
}
```

### CRM Integration Service

#### HoneyBook Integration
```typescript
// src/lib/integrations/crm-sync.ts
export class CRMSyncService {
  private honeyBookConnector: HoneyBookConnector;
  private taveConnector: TaveConnector;
  private lightBlueConnector: LightBlueConnector;

  constructor() {
    this.honeyBookConnector = new HoneyBookConnector();
    this.taveConnector = new TaveConnector();
    this.lightBlueConnector = new LightBlueConnector();
  }

  /**
   * Create activity in CRM when tour starts
   */
  async createTourStartedActivity(
    event: TourIntegrationEvent,
    integration: IntegrationConfig
  ): Promise<IntegrationResult> {
    try {
      const connector = this.getConnector(integration.provider);
      
      const activityData = {
        contact_id: event.data?.crm_contact_id,
        type: 'tour_started',
        title: 'Started Dashboard Tour',
        description: `User began onboarding tour: ${event.data?.tour_name}`,
        date: new Date(event.timestamp),
        metadata: {
          tour_id: event.tourId,
          progress_id: event.progressId,
          source: 'wedsync_tour_system'
        }
      };

      const result = await connector.createActivity(activityData, integration.credentials);
      
      return {
        success: true,
        integration: 'crm',
        message: 'Tour started activity created in CRM',
        data: { activity_id: result.id }
      };

    } catch (error) {
      return {
        success: false,
        integration: 'crm',
        error: `Failed to create tour started activity: ${error.message}`
      };
    }
  }

  /**
   * Create completion activity and trigger follow-up workflows
   */
  async createTourCompletedActivity(
    event: TourIntegrationEvent,
    integration: IntegrationConfig
  ): Promise<IntegrationResult> {
    try {
      const connector = this.getConnector(integration.provider);
      
      // Create completion activity
      const activityData = {
        contact_id: event.data?.crm_contact_id,
        type: 'tour_completed',
        title: 'Completed Dashboard Tour',
        description: `User successfully completed onboarding tour with ${event.data?.completion_rate}% completion rate`,
        date: new Date(event.timestamp),
        metadata: {
          tour_id: event.tourId,
          progress_id: event.progressId,
          completion_time: event.data?.total_time_seconds,
          user_rating: event.data?.user_rating,
          source: 'wedsync_tour_system'
        }
      };

      const activityResult = await connector.createActivity(activityData, integration.credentials);

      // Create follow-up task if configured
      let taskResult = null;
      if (integration.settings?.create_followup_task) {
        const taskData = {
          contact_id: event.data?.crm_contact_id,
          title: 'Follow up on WedSync onboarding',
          description: 'Client completed WedSync tour - schedule consultation call',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          priority: 'medium',
          metadata: {
            tour_completion_id: activityResult.id,
            source: 'wedsync_tour_system'
          }
        };

        taskResult = await connector.createTask(taskData, integration.credentials);
      }

      // Update contact with onboarding completion status
      const contactUpdate = {
        custom_fields: {
          wedsync_onboarding_completed: true,
          wedsync_onboarding_date: event.timestamp,
          wedsync_tour_rating: event.data?.user_rating
        }
      };

      await connector.updateContact(
        event.data?.crm_contact_id,
        contactUpdate,
        integration.credentials
      );

      return {
        success: true,
        integration: 'crm',
        message: 'Tour completion activity and follow-up created',
        data: {
          activity_id: activityResult.id,
          task_id: taskResult?.id,
          contact_updated: true
        }
      };

    } catch (error) {
      return {
        success: false,
        integration: 'crm',
        error: `Failed to create tour completion activity: ${error.message}`
      };
    }
  }

  /**
   * Create task for abandoned tours
   */
  async createTourAbandonedTask(
    event: TourIntegrationEvent,
    integration: IntegrationConfig
  ): Promise<IntegrationResult> {
    try {
      const connector = this.getConnector(integration.provider);
      
      const taskData = {
        contact_id: event.data?.crm_contact_id,
        title: 'Follow up on abandoned WedSync tour',
        description: `Client abandoned onboarding tour at step ${event.stepIndex}. Consider reaching out to provide assistance.`,
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        priority: 'high',
        metadata: {
          tour_id: event.tourId,
          abandoned_at_step: event.stepIndex,
          abandonment_time: event.data?.time_spent_seconds,
          source: 'wedsync_tour_system'
        }
      };

      const result = await connector.createTask(taskData, integration.credentials);

      return {
        success: true,
        integration: 'crm',
        message: 'Tour abandonment follow-up task created',
        data: { task_id: result.id }
      };

    } catch (error) {
      return {
        success: false,
        integration: 'crm',
        error: `Failed to create tour abandonment task: ${error.message}`
      };
    }
  }

  /**
   * Add user feedback as note to CRM contact
   */
  async createFeedbackNote(
    event: TourIntegrationEvent,
    integration: IntegrationConfig
  ): Promise<IntegrationResult> {
    try {
      const connector = this.getConnector(integration.provider);
      
      const noteData = {
        contact_id: event.data?.crm_contact_id,
        title: 'WedSync Tour Feedback',
        content: `User provided feedback on onboarding tour:\n\nRating: ${event.data?.rating}/5 stars\nFeedback: "${event.data?.feedback}"\nWas Helpful: ${event.data?.was_helpful ? 'Yes' : 'No'}`,
        date: new Date(event.timestamp),
        metadata: {
          tour_id: event.tourId,
          rating: event.data?.rating,
          source: 'wedsync_tour_system'
        }
      };

      const result = await connector.createNote(noteData, integration.credentials);

      return {
        success: true,
        integration: 'crm',
        message: 'User feedback note added to CRM',
        data: { note_id: result.id }
      };

    } catch (error) {
      return {
        success: false,
        integration: 'crm',
        error: `Failed to create feedback note: ${error.message}`
      };
    }
  }

  /**
   * Get appropriate connector based on CRM provider
   */
  private getConnector(provider: string): CRMConnector {
    switch (provider.toLowerCase()) {
      case 'honeybook':
        return this.honeyBookConnector;
      case 'tave':
        return this.taveConnector;
      case 'lightblue':
        return this.lightBlueConnector;
      default:
        throw new Error(`Unsupported CRM provider: ${provider}`);
    }
  }
}

// Base CRM connector interface
export interface CRMConnector {
  createActivity(data: any, credentials: Record<string, string>): Promise<{ id: string }>;
  createTask(data: any, credentials: Record<string, string>): Promise<{ id: string }>;
  createNote(data: any, credentials: Record<string, string>): Promise<{ id: string }>;
  updateContact(contactId: string, data: any, credentials: Record<string, string>): Promise<void>;
}
```

#### HoneyBook Specific Connector
```typescript
// src/lib/external-apis/honeybook-connector.ts
export class HoneyBookConnector implements CRMConnector {
  private baseURL = 'https://api.honeybook.com/v1';
  private rateLimiter: RateLimiter;

  constructor() {
    this.rateLimiter = new RateLimiter({
      tokensPerInterval: 100,
      interval: 'minute'
    });
  }

  async createActivity(
    data: any,
    credentials: Record<string, string>
  ): Promise<{ id: string }> {
    await this.rateLimiter.removeTokens(1);

    const response = await fetch(`${this.baseURL}/activities`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'WedSync-Integration/1.0'
      },
      body: JSON.stringify({
        contact_id: data.contact_id,
        activity_type: 'note',
        title: data.title,
        description: data.description,
        created_at: data.date.toISOString(),
        custom_data: data.metadata
      })
    });

    if (!response.ok) {
      throw new HoneyBookError(`HoneyBook API error: ${response.status}`, response.statusText);
    }

    const result = await response.json();
    return { id: result.data.id };
  }

  async createTask(
    data: any,
    credentials: Record<string, string>
  ): Promise<{ id: string }> {
    await this.rateLimiter.removeTokens(1);

    const response = await fetch(`${this.baseURL}/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contact_id: data.contact_id,
        title: data.title,
        description: data.description,
        due_date: data.due_date.toISOString(),
        priority: data.priority,
        status: 'open',
        custom_data: data.metadata
      })
    });

    if (!response.ok) {
      throw new HoneyBookError(`HoneyBook API error: ${response.status}`, response.statusText);
    }

    const result = await response.json();
    return { id: result.data.id };
  }

  async createNote(
    data: any,
    credentials: Record<string, string>
  ): Promise<{ id: string }> {
    await this.rateLimiter.removeTokens(1);

    const response = await fetch(`${this.baseURL}/notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contact_id: data.contact_id,
        title: data.title,
        content: data.content,
        created_at: data.date.toISOString(),
        tags: ['wedsync', 'tour-feedback'],
        custom_data: data.metadata
      })
    });

    if (!response.ok) {
      throw new HoneyBookError(`HoneyBook API error: ${response.status}`, response.statusText);
    }

    const result = await response.json();
    return { id: result.data.id };
  }

  async updateContact(
    contactId: string,
    data: any,
    credentials: Record<string, string>
  ): Promise<void> {
    await this.rateLimiter.removeTokens(1);

    const response = await fetch(`${this.baseURL}/contacts/${contactId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        custom_fields: data.custom_fields
      })
    });

    if (!response.ok) {
      throw new HoneyBookError(`HoneyBook API error: ${response.status}`, response.statusText);
    }
  }

  /**
   * Refresh access token when expired
   */
  async refreshToken(credentials: Record<string, string>): Promise<Record<string, string>> {
    const response = await fetch(`${this.baseURL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: credentials.refresh_token,
        client_id: process.env.HONEYBOOK_CLIENT_ID,
        client_secret: process.env.HONEYBOOK_CLIENT_SECRET
      })
    });

    if (!response.ok) {
      throw new HoneyBookError('Failed to refresh HoneyBook token', response.statusText);
    }

    const tokens = await response.json();
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    };
  }
}

export class HoneyBookError extends Error {
  constructor(message: string, public statusText?: string) {
    super(message);
    this.name = 'HoneyBookError';
  }
}

// Rate limiter utility
class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number;
  private lastRefill: number;

  constructor(options: { tokensPerInterval: number; interval: 'minute' | 'hour' }) {
    this.maxTokens = options.tokensPerInterval;
    this.tokens = this.maxTokens;
    this.refillRate = options.interval === 'minute' ? 60000 : 3600000; // ms
    this.lastRefill = Date.now();
  }

  async removeTokens(count: number): Promise<void> {
    this.refillTokens();
    
    if (this.tokens < count) {
      const waitTime = (count - this.tokens) * (this.refillRate / this.maxTokens);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.refillTokens();
    }
    
    this.tokens -= count;
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor(timePassed / this.refillRate * this.maxTokens);
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
}
```

### Calendar Integration Service

```typescript
// src/lib/integrations/calendar-sync.ts
export class CalendarSyncService {
  private googleCalendarConnector: GoogleCalendarConnector;
  private outlookConnector: OutlookConnector;

  constructor() {
    this.googleCalendarConnector = new GoogleCalendarConnector();
    this.outlookConnector = new OutlookConnector();
  }

  /**
   * Create follow-up consultation event after tour completion
   */
  async createFollowUpEvent(
    event: TourIntegrationEvent,
    integration: IntegrationConfig
  ): Promise<IntegrationResult> {
    try {
      const connector = this.getConnector(integration.provider);
      
      // Calculate follow-up date based on integration settings
      const followUpDays = integration.settings?.followup_days || 3;
      const followUpDate = new Date(Date.now() + followUpDays * 24 * 60 * 60 * 1000);
      
      // Set consultation time (default to 2 PM)
      followUpDate.setHours(14, 0, 0, 0);

      const eventData = {
        summary: 'WedSync Consultation Call',
        description: `Follow-up consultation call with ${event.data?.user_name} after completing WedSync onboarding tour.
        
Tour Completion Details:
- Completed: ${new Date(event.timestamp).toLocaleDateString()}
- Rating: ${event.data?.user_rating}/5 stars
- Time Spent: ${Math.round(event.data?.total_time_seconds / 60)} minutes

Consultation Topics:
- Review WedSync features and benefits
- Discuss workflow integration
- Answer questions about platform usage
- Plan subscription upgrade if needed`,
        start: followUpDate,
        end: new Date(followUpDate.getTime() + 60 * 60 * 1000), // 1 hour duration
        attendees: [
          {
            email: event.data?.user_email,
            name: event.data?.user_name,
            response: 'needsAction'
          }
        ],
        reminders: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours
          { method: 'popup', minutes: 15 } // 15 minutes
        ],
        metadata: {
          tour_id: event.tourId,
          progress_id: event.progressId,
          source: 'wedsync_tour_system',
          event_type: 'consultation_followup'
        }
      };

      const result = await connector.createEvent(eventData, integration.credentials);

      return {
        success: true,
        integration: 'calendar',
        message: 'Follow-up consultation event created',
        data: {
          event_id: result.id,
          event_url: result.url,
          scheduled_for: followUpDate.toISOString()
        }
      };

    } catch (error) {
      return {
        success: false,
        integration: 'calendar',
        error: `Failed to create follow-up calendar event: ${error.message}`
      };
    }
  }

  /**
   * Create recurring check-in events for new users
   */
  async createOnboardingCheckInSeries(
    event: TourIntegrationEvent,
    integration: IntegrationConfig
  ): Promise<IntegrationResult> {
    try {
      const connector = this.getConnector(integration.provider);
      const checkInDates = [1, 7, 14, 30]; // Days after tour completion
      const events = [];

      for (const days of checkInDates) {
        const checkInDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        checkInDate.setHours(10, 0, 0, 0); // 10 AM

        const eventData = {
          summary: `WedSync Check-in: ${days} Day${days > 1 ? 's' : ''}`,
          description: `${days}-day check-in with ${event.data?.user_name} to ensure successful WedSync adoption and address any questions.`,
          start: checkInDate,
          end: new Date(checkInDate.getTime() + 30 * 60 * 1000), // 30 minutes
          attendees: [{
            email: event.data?.user_email,
            name: event.data?.user_name
          }],
          metadata: {
            tour_id: event.tourId,
            check_in_day: days,
            source: 'wedsync_tour_system'
          }
        };

        const result = await connector.createEvent(eventData, integration.credentials);
        events.push({ day: days, event_id: result.id });
      }

      return {
        success: true,
        integration: 'calendar',
        message: 'Onboarding check-in series created',
        data: { events }
      };

    } catch (error) {
      return {
        success: false,
        integration: 'calendar',
        error: `Failed to create check-in series: ${error.message}`
      };
    }
  }

  private getConnector(provider: string): CalendarConnector {
    switch (provider.toLowerCase()) {
      case 'google':
        return this.googleCalendarConnector;
      case 'outlook':
        return this.outlookConnector;
      default:
        throw new Error(`Unsupported calendar provider: ${provider}`);
    }
  }
}

export interface CalendarConnector {
  createEvent(data: any, credentials: Record<string, string>): Promise<{ id: string; url: string }>;
  updateEvent(eventId: string, data: any, credentials: Record<string, string>): Promise<void>;
  deleteEvent(eventId: string, credentials: Record<string, string>): Promise<void>;
}
```

### Webhook Processing System

```typescript
// src/app/api/webhooks/tour-events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { WebhookProcessor } from '@/lib/webhooks/tour-webhook-processor';
import { verifyWebhookSignature } from '@/lib/webhooks/signature-verification';
import { z } from 'zod';

const TourWebhookSchema = z.object({
  event_type: z.string(),
  event_id: z.string(),
  timestamp: z.string(),
  user_id: z.string(),
  organization_id: z.string(),
  tour_id: z.string(),
  progress_id: z.string(),
  data: z.record(z.any()).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-wedsync-signature');
    
    // Verify webhook signature
    if (!signature || !verifyWebhookSignature(body, signature)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const webhookData = JSON.parse(body);
    const validatedData = TourWebhookSchema.parse(webhookData);

    // Process the webhook
    const processor = new WebhookProcessor();
    const result = await processor.processWebhook(validatedData);

    return NextResponse.json({
      message: 'Webhook processed successfully',
      result
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid webhook data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Health check endpoint for webhook monitoring
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'tour-webhook-processor',
    timestamp: new Date().toISOString()
  });
}
```

#### Webhook Processing Engine
```typescript
// src/lib/webhooks/tour-webhook-processor.ts
export class WebhookProcessor {
  private integrationHub: TourIntegrationHub;
  private retrySystem: WebhookRetrySystem;
  private eventQueue: Array<TourIntegrationEvent>;
  private processing: boolean = false;

  constructor() {
    this.integrationHub = new TourIntegrationHub();
    this.retrySystem = new WebhookRetrySystem();
    this.eventQueue = [];
    this.startQueueProcessor();
  }

  /**
   * Process incoming webhook and queue for integration processing
   */
  async processWebhook(webhookData: any): Promise<ProcessingResult> {
    try {
      // Transform webhook data to integration event
      const integrationEvent = this.transformWebhookToEvent(webhookData);
      
      // Add to processing queue
      this.eventQueue.push(integrationEvent);
      
      // Store webhook for audit trail
      await this.storeWebhookEvent(webhookData, integrationEvent);

      return {
        success: true,
        message: 'Webhook queued for processing',
        event_id: integrationEvent.id
      };

    } catch (error) {
      console.error('Webhook processing error:', error);
      
      // Store failed webhook for investigation
      await this.storeFailedWebhook(webhookData, error.message);

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Transform webhook data to standardized integration event
   */
  private transformWebhookToEvent(webhookData: any): TourIntegrationEvent {
    return {
      id: crypto.randomUUID(),
      eventType: webhookData.event_type,
      userId: webhookData.user_id,
      organizationId: webhookData.organization_id,
      tourId: webhookData.tour_id,
      progressId: webhookData.progress_id,
      stepIndex: webhookData.data?.step_index,
      data: webhookData.data || {},
      timestamp: webhookData.timestamp,
      source: 'webhook'
    };
  }

  /**
   * Start background queue processor
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.eventQueue.length > 0 && !this.processing) {
        await this.processQueue();
      }
    }, 1000); // Process every second
  }

  /**
   * Process events in queue with batch processing
   */
  private async processQueue(): Promise<void> {
    this.processing = true;

    try {
      const batchSize = 10;
      const batch = this.eventQueue.splice(0, batchSize);

      const processingPromises = batch.map(async (event) => {
        try {
          const results = await this.integrationHub.processTourEvent(event);
          
          // Handle failed integrations with retry logic
          const failedResults = results.filter(r => !r.success);
          if (failedResults.length > 0) {
            await this.retrySystem.scheduleRetries(event, failedResults);
          }

          return { event_id: event.id, success: true, results };
        } catch (error) {
          console.error(`Failed to process event ${event.id}:`, error);
          await this.retrySystem.scheduleRetries(event, [{ 
            success: false, 
            error: error.message 
          }]);
          return { event_id: event.id, success: false, error: error.message };
        }
      });

      await Promise.allSettled(processingPromises);

    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Store webhook event for audit trail
   */
  private async storeWebhookEvent(
    webhookData: any,
    integrationEvent: TourIntegrationEvent
  ): Promise<void> {
    const supabase = createClientComponentClient();
    
    const { error } = await supabase
      .from('webhook_events')
      .insert({
        webhook_id: webhookData.event_id || crypto.randomUUID(),
        event_type: webhookData.event_type,
        source: 'tour_system',
        payload: webhookData,
        processed_at: new Date().toISOString(),
        integration_event_id: integrationEvent.id,
        status: 'processed'
      });

    if (error) {
      console.error('Failed to store webhook event:', error);
    }
  }

  /**
   * Store failed webhook for investigation
   */
  private async storeFailedWebhook(webhookData: any, errorMessage: string): Promise<void> {
    const supabase = createClientComponentClient();
    
    const { error } = await supabase
      .from('webhook_events')
      .insert({
        webhook_id: webhookData.event_id || crypto.randomUUID(),
        event_type: webhookData.event_type || 'unknown',
        source: 'tour_system',
        payload: webhookData,
        processed_at: new Date().toISOString(),
        status: 'failed',
        error_message: errorMessage
      });

    if (error) {
      console.error('Failed to store failed webhook:', error);
    }
  }
}

export interface ProcessingResult {
  success: boolean;
  message?: string;
  error?: string;
  event_id?: string;
}
```

### Data Synchronization Engine

```typescript
// src/lib/sync/tour-sync-engine.ts
export class TourSyncEngine {
  private supabase: SupabaseClient;
  private conflictResolver: ConflictResolver;
  private syncQueue: SyncQueueManager;
  
  constructor() {
    this.supabase = createClientComponentClient();
    this.conflictResolver = new ConflictResolver();
    this.syncQueue = new SyncQueueManager();
  }

  /**
   * Sync tour progress across all integrated platforms
   */
  async syncTourProgress(
    progressId: string,
    organizations: string[]
  ): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    
    try {
      // Get current tour progress
      const progress = await this.getTourProgress(progressId);
      if (!progress) {
        throw new Error('Tour progress not found');
      }

      // Get enabled integrations for organizations
      const integrations = await this.getEnabledIntegrations(organizations);
      
      // Sync with each integration
      for (const integration of integrations) {
        try {
          const syncResult = await this.syncWithIntegration(progress, integration);
          results.push(syncResult);
        } catch (error) {
          results.push({
            integration_id: integration.id,
            success: false,
            error: error.message
          });
        }
      }

      // Handle conflicts if any
      const conflicts = results.filter(r => r.conflict_detected);
      if (conflicts.length > 0) {
        await this.resolveConflicts(progress, conflicts);
      }

    } catch (error) {
      console.error('Tour sync error:', error);
      results.push({
        integration_id: 'sync_engine',
        success: false,
        error: error.message
      });
    }

    return results;
  }

  /**
   * Real-time sync when tour events occur
   */
  async realtimeSync(event: TourIntegrationEvent): Promise<void> {
    // Add to sync queue for async processing
    await this.syncQueue.add({
      event_id: event.id,
      type: 'real_time_sync',
      data: event,
      priority: this.getSyncPriority(event.eventType),
      retry_count: 0,
      max_retries: 3
    });
  }

  /**
   * Periodic full synchronization
   */
  async fullSync(organizationId: string): Promise<SyncSummary> {
    const startTime = Date.now();
    let totalSynced = 0;
    let totalErrors = 0;
    
    try {
      // Get all active tour progress records
      const { data: progressRecords } = await this.supabase
        .from('user_tour_progress')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['in_progress', 'completed']);

      // Sync each progress record
      for (const progress of progressRecords || []) {
        try {
          const syncResults = await this.syncTourProgress(progress.id, [organizationId]);
          const successful = syncResults.filter(r => r.success).length;
          const failed = syncResults.filter(r => !r.success).length;
          
          totalSynced += successful;
          totalErrors += failed;
        } catch (error) {
          totalErrors++;
          console.error(`Failed to sync progress ${progress.id}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      
      return {
        organization_id: organizationId,
        total_records: progressRecords?.length || 0,
        successful_syncs: totalSynced,
        failed_syncs: totalErrors,
        duration_ms: duration,
        completed_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('Full sync error:', error);
      throw new TourSyncError('Full synchronization failed', error);
    }
  }

  /**
   * Sync tour progress with specific integration
   */
  private async syncWithIntegration(
    progress: UserTourProgress,
    integration: IntegrationConfig
  ): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      // Get last sync timestamp for this integration
      const lastSync = await this.getLastSyncTimestamp(progress.id, integration.id);
      
      // Check if progress has been updated since last sync
      const progressUpdatedAt = new Date(progress.updated_at);
      if (lastSync && progressUpdatedAt <= lastSync) {
        return {
          integration_id: integration.id,
          success: true,
          message: 'No sync required - up to date',
          sync_duration_ms: Date.now() - startTime
        };
      }

      // Perform the sync based on integration type
      let syncData: any;
      
      switch (integration.type) {
        case 'crm':
          syncData = await this.syncCRMProgress(progress, integration);
          break;
        case 'calendar':
          syncData = await this.syncCalendarProgress(progress, integration);
          break;
        case 'email':
          syncData = await this.syncEmailProgress(progress, integration);
          break;
        default:
          throw new Error(`Unsupported integration type: ${integration.type}`);
      }

      // Update last sync timestamp
      await this.updateLastSyncTimestamp(progress.id, integration.id);

      return {
        integration_id: integration.id,
        success: true,
        message: 'Sync completed successfully',
        data: syncData,
        sync_duration_ms: Date.now() - startTime
      };

    } catch (error) {
      return {
        integration_id: integration.id,
        success: false,
        error: error.message,
        sync_duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Get sync priority based on event type
   */
  private getSyncPriority(eventType: string): number {
    const priorityMap: Record<string, number> = {
      'tour_completed': 1, // Highest priority
      'tour_started': 2,
      'step_completed': 3,
      'user_feedback': 4,
      'tour_abandoned': 5 // Lowest priority
    };
    
    return priorityMap[eventType] || 5;
  }

  private async getTourProgress(progressId: string): Promise<UserTourProgress | null> {
    const { data, error } = await this.supabase
      .from('user_tour_progress')
      .select('*')
      .eq('id', progressId)
      .single();

    if (error) return null;
    return data;
  }

  private async getEnabledIntegrations(
    organizationIds: string[]
  ): Promise<IntegrationConfig[]> {
    const { data, error } = await this.supabase
      .from('organization_integrations')
      .select('*')
      .in('organization_id', organizationIds)
      .eq('is_active', true);

    if (error) throw new Error('Failed to fetch integrations');
    return data || [];
  }

  private async getLastSyncTimestamp(
    progressId: string,
    integrationId: string
  ): Promise<Date | null> {
    const { data } = await this.supabase
      .from('sync_timestamps')
      .select('last_synced_at')
      .eq('progress_id', progressId)
      .eq('integration_id', integrationId)
      .single();

    return data ? new Date(data.last_synced_at) : null;
  }

  private async updateLastSyncTimestamp(
    progressId: string,
    integrationId: string
  ): Promise<void> {
    await this.supabase
      .from('sync_timestamps')
      .upsert({
        progress_id: progressId,
        integration_id: integrationId,
        last_synced_at: new Date().toISOString()
      });
  }

  private async syncCRMProgress(
    progress: UserTourProgress,
    integration: IntegrationConfig
  ): Promise<any> {
    // Implementation for CRM sync
    return { synced: true, records: 1 };
  }

  private async syncCalendarProgress(
    progress: UserTourProgress,
    integration: IntegrationConfig
  ): Promise<any> {
    // Implementation for calendar sync
    return { synced: true, events: 1 };
  }

  private async syncEmailProgress(
    progress: UserTourProgress,
    integration: IntegrationConfig
  ): Promise<any> {
    // Implementation for email sync
    return { synced: true, emails: 1 };
  }

  private async resolveConflicts(
    progress: UserTourProgress,
    conflicts: SyncResult[]
  ): Promise<void> {
    // Use conflict resolver to handle data conflicts
    await this.conflictResolver.resolveConflicts(progress, conflicts);
  }
}

export class TourSyncError extends Error {
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = 'TourSyncError';
  }
}

export interface SyncResult {
  integration_id: string;
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
  conflict_detected?: boolean;
  sync_duration_ms?: number;
}

export interface SyncSummary {
  organization_id: string;
  total_records: number;
  successful_syncs: number;
  failed_syncs: number;
  duration_ms: number;
  completed_at: string;
}
```

### Email Marketing Integration

```typescript
// src/lib/integrations/email-sync.ts
export class EmailSyncService {
  private mailchimpConnector: MailchimpConnector;
  private convertKitConnector: ConvertKitConnector;
  private activeCampaignConnector: ActiveCampaignConnector;

  constructor() {
    this.mailchimpConnector = new MailchimpConnector();
    this.convertKitConnector = new ConvertKitConnector();
    this.activeCampaignConnector = new ActiveCampaignConnector();
  }

  /**
   * Send welcome email sequence when tour is completed
   */
  async sendWelcomeSequence(
    event: TourIntegrationEvent,
    integration: IntegrationConfig
  ): Promise<IntegrationResult> {
    try {
      const connector = this.getConnector(integration.provider);
      
      // Add user to welcome sequence
      const sequenceData = {
        email: event.data?.user_email,
        first_name: event.data?.user_first_name,
        last_name: event.data?.user_last_name,
        tags: ['wedsync-onboarded', 'tour-completed'],
        custom_fields: {
          tour_completion_date: event.timestamp,
          tour_rating: event.data?.user_rating,
          tour_duration: event.data?.total_time_seconds,
          organization_id: event.organizationId,
          subscription_tier: event.data?.subscription_tier || 'free'
        },
        sequence_id: integration.settings?.welcome_sequence_id
      };

      const result = await connector.addToSequence(sequenceData, integration.credentials);

      // Send immediate welcome email if configured
      if (integration.settings?.send_immediate_welcome) {
        await connector.sendEmail({
          to: event.data?.user_email,
          template_id: integration.settings.welcome_template_id,
          personalization: {
            first_name: event.data?.user_first_name,
            tour_rating: event.data?.user_rating,
            completion_date: new Date(event.timestamp).toLocaleDateString()
          }
        }, integration.credentials);
      }

      return {
        success: true,
        integration: 'email',
        message: 'User added to welcome sequence',
        data: { subscriber_id: result.id }
      };

    } catch (error) {
      return {
        success: false,
        integration: 'email',
        error: `Failed to send welcome sequence: ${error.message}`
      };
    }
  }

  /**
   * Send re-engagement email for abandoned tours
   */
  async sendReengagementEmail(
    event: TourIntegrationEvent,
    integration: IntegrationConfig
  ): Promise<IntegrationResult> {
    try {
      const connector = this.getConnector(integration.provider);
      
      const emailData = {
        to: event.data?.user_email,
        template_id: integration.settings?.reengagement_template_id,
        subject: 'Complete Your WedSync Setup - We\'re Here to Help!',
        personalization: {
          first_name: event.data?.user_first_name,
          abandoned_step: event.data?.abandoned_step_name,
          progress_percentage: Math.round((event.stepIndex || 0) / (event.data?.total_steps || 1) * 100),
          completion_link: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tour/${event.tourId}/resume?progress=${event.progressId}`
        }
      };

      const result = await connector.sendEmail(emailData, integration.credentials);

      // Add re-engagement tag
      await connector.addTags([event.data?.user_email], ['tour-abandoned'], integration.credentials);

      return {
        success: true,
        integration: 'email',
        message: 'Re-engagement email sent',
        data: { message_id: result.id }
      };

    } catch (error) {
      return {
        success: false,
        integration: 'email',
        error: `Failed to send re-engagement email: ${error.message}`
      };
    }
  }

  private getConnector(provider: string): EmailConnector {
    switch (provider.toLowerCase()) {
      case 'mailchimp':
        return this.mailchimpConnector;
      case 'convertkit':
        return this.convertKitConnector;
      case 'activecampaign':
        return this.activeCampaignConnector;
      default:
        throw new Error(`Unsupported email provider: ${provider}`);
    }
  }
}

export interface EmailConnector {
  addToSequence(data: any, credentials: Record<string, string>): Promise<{ id: string }>;
  sendEmail(data: any, credentials: Record<string, string>): Promise<{ id: string }>;
  addTags(emails: string[], tags: string[], credentials: Record<string, string>): Promise<void>;
}
```

### Integration Testing Suite

```typescript
// src/__tests__/integrations/tour-crm-sync.test.ts
import { CRMSyncService } from '@/lib/integrations/crm-sync';
import { HoneyBookConnector } from '@/lib/external-apis/honeybook-connector';
import { TourIntegrationEvent, IntegrationConfig } from '@/lib/integrations/tour-integrations';

// Mock the connectors
jest.mock('@/lib/external-apis/honeybook-connector');

describe('CRMSyncService', () => {
  let crmSync: CRMSyncService;
  let mockHoneyBookConnector: jest.Mocked<HoneyBookConnector>;

  beforeEach(() => {
    crmSync = new CRMSyncService();
    mockHoneyBookConnector = new HoneyBookConnector() as jest.Mocked<HoneyBookConnector>;
    (crmSync as any).honeyBookConnector = mockHoneyBookConnector;
  });

  describe('createTourStartedActivity', () => {
    it('should create activity in CRM when tour starts', async () => {
      const event: TourIntegrationEvent = {
        id: 'event-123',
        eventType: 'tour_started',
        userId: 'user-123',
        organizationId: 'org-123',
        tourId: 'tour-123',
        progressId: 'progress-123',
        timestamp: new Date().toISOString(),
        source: 'dashboard',
        data: {
          crm_contact_id: 'contact-123',
          tour_name: 'Onboarding Tour'
        }
      };

      const integration: IntegrationConfig = {
        id: 'integration-123',
        type: 'crm',
        provider: 'honeybook',
        settings: {},
        credentials: { access_token: 'token-123' },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockHoneyBookConnector.createActivity.mockResolvedValue({ id: 'activity-123' });

      const result = await crmSync.createTourStartedActivity(event, integration);

      expect(result.success).toBe(true);
      expect(result.integration).toBe('crm');
      expect(result.data?.activity_id).toBe('activity-123');
      expect(mockHoneyBookConnector.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          contact_id: 'contact-123',
          type: 'tour_started',
          title: 'Started Dashboard Tour'
        }),
        { access_token: 'token-123' }
      );
    });

    it('should handle CRM API errors gracefully', async () => {
      const event: TourIntegrationEvent = {
        id: 'event-123',
        eventType: 'tour_started',
        userId: 'user-123',
        organizationId: 'org-123',
        tourId: 'tour-123',
        progressId: 'progress-123',
        timestamp: new Date().toISOString(),
        source: 'dashboard',
        data: { crm_contact_id: 'contact-123' }
      };

      const integration: IntegrationConfig = {
        id: 'integration-123',
        type: 'crm',
        provider: 'honeybook',
        settings: {},
        credentials: { access_token: 'invalid-token' },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockHoneyBookConnector.createActivity.mockRejectedValue(
        new Error('HoneyBook API error: 401')
      );

      const result = await crmSync.createTourStartedActivity(event, integration);

      expect(result.success).toBe(false);
      expect(result.integration).toBe('crm');
      expect(result.error).toContain('HoneyBook API error: 401');
    });
  });

  describe('createTourCompletedActivity', () => {
    it('should create completion activity and follow-up task', async () => {
      const event: TourIntegrationEvent = {
        id: 'event-123',
        eventType: 'tour_completed',
        userId: 'user-123',
        organizationId: 'org-123',
        tourId: 'tour-123',
        progressId: 'progress-123',
        timestamp: new Date().toISOString(),
        source: 'dashboard',
        data: {
          crm_contact_id: 'contact-123',
          completion_rate: 100,
          user_rating: 5,
          total_time_seconds: 600
        }
      };

      const integration: IntegrationConfig = {
        id: 'integration-123',
        type: 'crm',
        provider: 'honeybook',
        settings: { create_followup_task: true },
        credentials: { access_token: 'token-123' },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockHoneyBookConnector.createActivity.mockResolvedValue({ id: 'activity-123' });
      mockHoneyBookConnector.createTask.mockResolvedValue({ id: 'task-123' });
      mockHoneyBookConnector.updateContact.mockResolvedValue();

      const result = await crmSync.createTourCompletedActivity(event, integration);

      expect(result.success).toBe(true);
      expect(result.data?.activity_id).toBe('activity-123');
      expect(result.data?.task_id).toBe('task-123');
      expect(result.data?.contact_updated).toBe(true);

      expect(mockHoneyBookConnector.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tour_completed',
          title: 'Completed Dashboard Tour'
        }),
        { access_token: 'token-123' }
      );

      expect(mockHoneyBookConnector.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Follow up on WedSync onboarding'
        }),
        { access_token: 'token-123' }
      );

      expect(mockHoneyBookConnector.updateContact).toHaveBeenCalledWith(
        'contact-123',
        expect.objectContaining({
          custom_fields: expect.objectContaining({
            wedsync_onboarding_completed: true,
            wedsync_tour_rating: 5
          })
        }),
        { access_token: 'token-123' }
      );
    });
  });
});

// Webhook processing tests
// src/__tests__/integrations/webhook-processing.test.ts
import { WebhookProcessor } from '@/lib/webhooks/tour-webhook-processor';
import { TourIntegrationHub } from '@/lib/integrations/tour-integrations';

jest.mock('@/lib/integrations/tour-integrations');

describe('WebhookProcessor', () => {
  let processor: WebhookProcessor;
  let mockIntegrationHub: jest.Mocked<TourIntegrationHub>;

  beforeEach(() => {
    processor = new WebhookProcessor();
    mockIntegrationHub = new TourIntegrationHub() as jest.Mocked<TourIntegrationHub>;
    (processor as any).integrationHub = mockIntegrationHub;
  });

  describe('processWebhook', () => {
    it('should process valid webhook data successfully', async () => {
      const webhookData = {
        event_type: 'tour_completed',
        event_id: 'event-123',
        timestamp: new Date().toISOString(),
        user_id: 'user-123',
        organization_id: 'org-123',
        tour_id: 'tour-123',
        progress_id: 'progress-123',
        data: {
          completion_rate: 100,
          user_rating: 5
        }
      };

      mockIntegrationHub.processTourEvent.mockResolvedValue([
        { success: true, integration: 'crm' }
      ]);

      const result = await processor.processWebhook(webhookData);

      expect(result.success).toBe(true);
      expect(result.event_id).toBeDefined();
      expect(result.message).toBe('Webhook queued for processing');
    });

    it('should handle malformed webhook data', async () => {
      const invalidWebhookData = {
        // Missing required fields
        event_type: 'tour_completed'
      };

      const result = await processor.processWebhook(invalidWebhookData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should queue events for batch processing', async () => {
      const webhookData = {
        event_type: 'tour_started',
        event_id: 'event-123',
        timestamp: new Date().toISOString(),
        user_id: 'user-123',
        organization_id: 'org-123',
        tour_id: 'tour-123',
        progress_id: 'progress-123'
      };

      const result = await processor.processWebhook(webhookData);

      expect(result.success).toBe(true);
      
      // Check that event was added to queue
      const queue = (processor as any).eventQueue;
      expect(queue.length).toBeGreaterThan(0);
      expect(queue[0].eventType).toBe('tour_started');
    });
  });

  describe('queue processing', () => {
    it('should process events in batches', async () => {
      // Add multiple events to queue
      const events = Array.from({ length: 15 }, (_, i) => ({
        event_type: 'step_completed',
        event_id: `event-${i}`,
        timestamp: new Date().toISOString(),
        user_id: 'user-123',
        organization_id: 'org-123',
        tour_id: 'tour-123',
        progress_id: 'progress-123',
        data: { step_index: i }
      }));

      for (const event of events) {
        await processor.processWebhook(event);
      }

      mockIntegrationHub.processTourEvent.mockResolvedValue([
        { success: true, integration: 'crm' }
      ]);

      // Trigger queue processing
      await (processor as any).processQueue();

      // Should process in batches of 10
      expect(mockIntegrationHub.processTourEvent).toHaveBeenCalledTimes(10);
    });
  });
});
```

### Database Schema for Integration Tracking

```sql
-- Integration configuration table
CREATE TABLE organization_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type integration_type_enum NOT NULL,
  provider VARCHAR(50) NOT NULL,
  settings JSONB DEFAULT '{}',
  credentials JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id, type, provider)
);

-- Integration event logs
CREATE TABLE integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(100),
  integration_type integration_type_enum,
  integration_provider VARCHAR(50),
  success BOOLEAN NOT NULL,
  error_message TEXT,
  response_data JSONB,
  processing_duration_ms INTEGER,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Reference to original tour event
  tour_id UUID REFERENCES tour_definitions(id),
  progress_id UUID REFERENCES user_tour_progress(id),
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id)
);

-- Webhook events tracking
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id VARCHAR(100) UNIQUE,
  event_type VARCHAR(50) NOT NULL,
  source VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status webhook_status_enum DEFAULT 'pending',
  integration_event_id UUID,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync tracking for data consistency
CREATE TABLE sync_timestamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_id UUID REFERENCES user_tour_progress(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES organization_integrations(id) ON DELETE CASCADE,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_status sync_status_enum DEFAULT 'completed',
  
  UNIQUE(progress_id, integration_id)
);

-- Enums
CREATE TYPE integration_type_enum AS ENUM (
  'crm', 'calendar', 'payment', 'email', 'sms', 'storage', 'analytics'
);

CREATE TYPE webhook_status_enum AS ENUM (
  'pending', 'processed', 'failed', 'retrying'
);

CREATE TYPE sync_status_enum AS ENUM (
  'pending', 'in_progress', 'completed', 'failed', 'conflict'
);

-- Indexes for performance
CREATE INDEX idx_org_integrations_active ON organization_integrations(organization_id, is_active);
CREATE INDEX idx_integration_logs_event ON integration_logs(event_id, processed_at);
CREATE INDEX idx_webhook_events_status ON webhook_events(status, created_at);
CREATE INDEX idx_sync_timestamps_progress ON sync_timestamps(progress_id, last_synced_at);

-- RLS policies
ALTER TABLE organization_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_timestamps ENABLE ROW LEVEL SECURITY;

-- Organization members can manage their integrations
CREATE POLICY "Organization members can manage integrations" ON organization_integrations
  FOR ALL USING (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid
  );

-- Organization members can view their integration logs
CREATE POLICY "Organization members can view integration logs" ON integration_logs
  FOR SELECT USING (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid
  );

-- System can insert webhook events
CREATE POLICY "System can manage webhooks" ON webhook_events
  FOR ALL USING (true);

-- Users can view their sync timestamps
CREATE POLICY "Users can view sync status" ON sync_timestamps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_tour_progress 
      WHERE id = progress_id 
      AND user_id = auth.uid()
    )
  );
```

## Performance Optimization

### Connection Pooling
- Use connection pools for external API connections
- Implement circuit breakers for unreliable services
- Cache integration configurations in Redis

### Batch Processing
- Process webhooks in batches to reduce overhead
- Implement smart batching based on integration type
- Use background jobs for non-critical integrations

### Error Handling & Retry Logic
- Exponential backoff for failed integrations
- Dead letter queues for permanently failed events
- Comprehensive error logging and monitoring

## Monitoring & Alerting

### Integration Health Monitoring
- Real-time dashboard for integration status
- Alert on high failure rates
- Performance metrics tracking

### Wedding Context Awareness
- Priority handling during wedding season
- Automatic scaling during peak periods
- Wedding day monitoring and alerts

This comprehensive integration system ensures that the dashboard tour experience seamlessly connects with all aspects of a wedding professional's existing workflow, creating a truly unified and powerful platform experience.

---

**Estimated Implementation Time**: 20-25 development days
**Team Dependencies**: Requires coordination with Team B for API integration and Team A for UI feedback
**Critical Success Metrics**:
- Integration success rate >95%
- Average webhook processing time <2 seconds
- Zero data loss during sync operations
- CRM sync completion rate >90%
- Real-time event processing <1 second delay